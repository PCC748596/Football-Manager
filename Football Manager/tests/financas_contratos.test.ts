/*
FINANCAS E CONTRATOS: emprestimo bancario (juros, parcelas, limite, quitacao), clausulas de rescisao (geracao, renovacao, a regra de que o vendedor nao pode recusar),
emprestimo de jogadores com opcao de compra e venda com bonus por jogos (10/15/20). Ver textSim/emprestimoBancario.ts, textSim/contracts.ts, textSim/negociacao.ts e
textSim/transferencias.ts.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLeagueData } from '../textSim/dataGenerator';
import { garantirBase } from '../textSim/youth';
import { processarContratos, clausulaSugerida, garantirClausulas, clausulaDe, clausulaAposTransferencia, CHANCE_SEM_CLAUSULA } from '../textSim/contracts';
import { recalcularValores, valorDeMercado } from '../textSim/valuation';
import { chanceDeAceitar, propostaDoJogador, contratoDaOferta, assinar, efeitoDaClausula } from '../textSim/negociacao';
import {
  Universo, mercadoVazio, prepararOrcamentos, proporCompra, proporEmprestimo, pagarClausula, exercerOpcao, processarEmprestimos, registrarJogosDosBonus, processarBonus,
  tickDoDia, avaliarOferta, precoDesejado, elencoValidoSem, grupoDe, taxaDeEmprestimoDesejada, taxaDeEmprestimoComOpcao, iaExerceOpcao, normalizarBonus, valorDosBonus, CONFIG_MERCADO, NegociacaoTransf
} from '../textSim/transferencias';
import {
  BANCO, parcelaPrice, taxaDeJuros, limiteDeCredito, simularEmprestimo, contratarEmprestimo, processarParcelas, quitarEmprestimo, dividaTotal, receitaAnualEstimada, valorDeQuitacao, PerfilDeCredito
} from '../textSim/emprestimoBancario';
import type { Player, Team } from '../types';

const HOJE = '2024-04-02';
const mover = (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const criarUniverso = (hoje = HOJE): Universo => {
  const { teams, players } = generateLeagueData('45', 'bra_serie_a') as any;
  const ts = prepararOrcamentos(teams);
  const ps = recalcularValores(processarContratos(players, hoje, 'NINGUEM').jogadores, hoje);
  return { players: ps, base: garantirBase(null, ts.map((t: any) => t.id), hoje), teams: ts, mercado: mercadoVazio(hoje) };
};
const ricos = (u: Universo): Universo => ({ ...u, teams: u.teams.map(t => ({ ...t, cash: 90_000_000, transferBudget: 90_000_000 })) });
const comJogador = (u: Universo, id: string, f: (p: Player) => Player): Universo => ({ ...u, players: u.players.map(p => (p.id === id ? f(p) : p)) });
const caixa = (u: Universo, id: string) => u.teams.find(t => t.id === id)!.cash;
const somaCaixa = (u: Universo) => u.teams.reduce((s, t) => s + t.cash, 0);
const elenco = (u: Universo, id: string) => u.players.filter(p => p.teamId === id);
/** Um jogador do clube que pode sair sem quebrar o elenco minimo, com contrato longo. */
const vendavel = (u: Universo, clubeId: string) => elenco(u, clubeId).filter(p => p.contract && p.contract.end > '2026-06-01' && elencoValidoSem(elenco(u, clubeId), p, CONFIG_MERCADO)).sort((a, b) => b.skill - a.skill)[0];
/** Um reserva (nem o 1o nem o 2o do grupo) de outro clube, com mais de 18 meses de contrato. */
const reserva = (u: Universo, clubeId: string) => {
  const ps = elenco(u, clubeId);
  return ps.filter(p => {
    const grupo = ps.filter(x => grupoDe(x.position) === grupoDe(p.position)).sort((a, b) => b.skill - a.skill);
    return grupo.findIndex(x => x.id === p.id) >= 2 && p.contract && p.contract.end > '2025-12-01' && elencoValidoSem(ps, p, CONFIG_MERCADO, u.teams.find(t => t.id === clubeId)?.tactics?.formation);
  })[0];
};

// ============================================================== EMPRESTIMO BANCARIO
const PERFIL: PerfilDeCredito = { reputacao: 50, escalaLiga: 1, receitaAnual: 10_000_000, dividaAtual: 0, caixa: 1_000_000 };
const clubeTeste = (extra: Partial<Team> = {}): Team => ({ id: 'T', name: 'Teste', cash: 1_000_000, ...extra } as Team);

test('banco: parcela da tabela Price (12% ao ano, 12 meses) e sem juros', () => {
  assert.ok(Math.abs(parcelaPrice(1_200_000, 0.12, 12) - 106_618.55) < 0.5, String(parcelaPrice(1_200_000, 0.12, 12)));
  assert.equal(parcelaPrice(1_200_000, 0, 12), 100_000);
});

test('banco: a taxa cai com a reputacao e o porte da liga, sobe com a divida, o caixa negativo e o prazo; fica entre 4% e 25%', () => {
  const t = (p: Partial<PerfilDeCredito>, valor = 1_000_000, meses = 12) => taxaDeJuros({ ...PERFIL, ...p }, valor, meses);
  assert.ok(t({ reputacao: 90 }) < t({ reputacao: 20 }), 'reputacao alta paga menos');
  assert.ok(t({ escalaLiga: 4 }) < t({ escalaLiga: 1 }), 'liga rica paga menos');
  assert.ok(t({ dividaAtual: 4_000_000 }) > t({ dividaAtual: 0 }), 'mais divida, mais juros');
  assert.ok(Math.abs(t({ caixa: -1 }) - t({}) - BANCO.caixaNegativo) < 1e-9, 'caixa negativo: +2%');
  assert.ok(t({}, 1_000_000, 60) > t({}, 1_000_000, 12), 'prazo longo paga mais');
  for (const rep of [0, 50, 100]) for (const esc of [1, 4]) for (const div of [0, 5_000_000]) {
    const x = t({ reputacao: rep, escalaLiga: esc, dividaAtual: div, caixa: -5 }, 5_000_000, 60);
    assert.ok(x >= BANCO.taxaMin && x <= BANCO.taxaMax, String(x));
  }
  // exemplo documentado: reputacao 50, liga base, 1 M de 5 M de limite, 12 meses -> 6% + 4% + 0% + 1% = 11%
  assert.equal(t({}), 0.11);
});

test('banco: limite de 50% da receita anual estimada (piso de metade da folha), menos a divida', () => {
  assert.deepEqual(limiteDeCredito(10_000_000, 0), { teto: 5_000_000, disponivel: 5_000_000 });
  assert.deepEqual(limiteDeCredito(10_000_000, 6_000_000), { teto: 5_000_000, disponivel: 0 });
  assert.equal(receitaAnualEstimada({ patrocinioAnual: 2_000_000, rendaPorJogo: 100_000, jogosEmCasa: 19, folhaAnual: 1_000_000 }), 3_900_000);
  assert.equal(receitaAnualEstimada({ patrocinioAnual: 0, rendaPorJogo: 0, jogosEmCasa: 19, folhaAnual: 8_000_000 }), 4_000_000, 'piso: metade da folha');
});

test('banco: contratar credita o caixa na hora; valor minimo, prazo, limite e no maximo 3 ativos', () => {
  const t0 = clubeTeste();
  const r = contratarEmprestimo(t0, PERFIL, 2_000_000, 24, '2024-04-10');
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.team.cash, 3_000_000, 'o dinheiro entra hoje');
  assert.equal(dividaTotal(r.team), 2_000_000);
  assert.equal(r.team.movimentosBanco!.length, 1);
  assert.equal(r.emprestimo.parcela, Math.round(parcelaPrice(2_000_000, r.emprestimo.taxaAnual, 24)));
  assert.deepEqual(contratarEmprestimo(t0, PERFIL, 10_000, 24, '2024-04-10'), { ok: false, motivo: 'VALOR_MINIMO' });
  assert.deepEqual(contratarEmprestimo(t0, PERFIL, 1_000_000, 7, '2024-04-10'), { ok: false, motivo: 'PRAZO' });
  assert.deepEqual(contratarEmprestimo(r.team, PERFIL, 3_100_000, 24, '2024-04-10'), { ok: false, motivo: 'LIMITE' }, 'ja deve 2 M de 5 M');
  let t = r.team;
  for (let i = 0; i < 2; i++) { const x = contratarEmprestimo(t, PERFIL, 100_000, 12, '2024-04-10'); assert.ok(x.ok); if (x.ok) t = x.team; }
  assert.deepEqual(contratarEmprestimo(t, PERFIL, 100_000, 12, '2024-04-10'), { ok: false, motivo: 'MAX_ATIVOS' });
  // simulacao = o que o contrato da
  const s = simularEmprestimo(PERFIL, 2_000_000, 24);
  assert.equal(s.taxaAnual, r.emprestimo.taxaAnual); assert.equal(s.parcela, r.emprestimo.parcela); assert.equal(s.total, s.parcela * 24);
});

test('banco: uma parcela por mes novo (saltar meses paga varias), nada duas vezes no mesmo mes; no fim o saldo zera', () => {
  const r = contratarEmprestimo(clubeTeste(), PERFIL, 1_200_000, 12, '2024-04-10');
  assert.ok(r.ok); if (!r.ok) return;
  let t = r.team;
  assert.equal(processarParcelas(t, '2024-04-30').team, t, 'o mes do credito nao paga');
  const p1 = processarParcelas(t, '2024-05-01');
  assert.equal(p1.pagamentos.length, 1); assert.equal(p1.pagamentos[0].parcelas, 1);
  assert.equal(p1.team.cash, t.cash - p1.pagamentos[0].valor);
  assert.equal(p1.pagamentos[0].juros, Math.round(1_200_000 * r.emprestimo.taxaAnual / 12), 'juros do mes sobre o saldo');
  assert.equal(processarParcelas(p1.team, '2024-05-20').team, p1.team, 'o mesmo mes nao paga de novo');
  t = p1.team;
  const p3 = processarParcelas(t, '2024-07-03');   // junho e julho
  assert.equal(p3.pagamentos[0].parcelas, 2);
  t = p3.team;
  let total = p1.pagamentos[0].valor + p3.pagamentos[0].valor;
  for (let m = 8; m <= 16; m++) { const d = m <= 12 ? `2024-${String(m).padStart(2, '0')}-01` : `2025-${String(m - 12).padStart(2, '0')}-01`; const x = processarParcelas(t, d); x.pagamentos.forEach(pg => (total += pg.valor)); t = x.team; }
  const e = t.emprestimos![0];
  assert.equal(e.saldo, 0); assert.ok(e.quitado); assert.equal(e.parcelasPagas, 12);
  assert.ok(Math.abs(total - r.emprestimo.parcela * 12) <= 12, `total pago ${total} ~ 12 x parcela`);
  assert.equal(dividaTotal(t), 0);
  assert.equal(processarParcelas(t, '2025-08-01').team, t, 'quitado: nada mais a pagar');
});

test('banco: quitacao antecipada = saldo + 1%, exige caixa', () => {
  const r = contratarEmprestimo(clubeTeste({ cash: 0 }), PERFIL, 1_000_000, 24, '2024-04-10');
  assert.ok(r.ok); if (!r.ok) return;
  const e = r.emprestimo;
  assert.equal(valorDeQuitacao(e), 1_010_000);
  assert.deepEqual(quitarEmprestimo({ ...r.team, cash: 500_000 }, e.id, '2024-04-11'), { ok: false, motivo: 'SEM_CAIXA' });
  const q = quitarEmprestimo(r.team, e.id, '2024-04-11');
  assert.equal(q.ok, false, 'so tem 1 M de caixa');
  const q2 = quitarEmprestimo({ ...r.team, cash: 2_000_000 }, e.id, '2024-04-11');
  assert.ok(q2.ok); if (!q2.ok) return;
  assert.equal(q2.team.cash, 2_000_000 - 1_010_000); assert.equal(dividaTotal(q2.team), 0);
  assert.equal(processarParcelas(q2.team, '2024-06-01').pagamentos.length, 0);
});

// ============================================================== CLAUSULAS
test('clausula: sugerida pela idade (jovem protegido), fixa por jogador; 1 em 4 contratos sem clausula; idempotente', () => {
  const jov = { id: 'a', age: 19, value: 1_000_000 }, vet = { id: 'a', age: 33, value: 1_000_000 };
  assert.ok(clausulaSugerida(jov) >= 3_000_000 && clausulaSugerida(jov) <= 5_000_000);
  assert.ok(clausulaSugerida(vet) >= 1_400_000 && clausulaSugerida(vet) <= 2_000_000);
  assert.equal(clausulaSugerida(jov), clausulaSugerida({ ...jov }));
  assert.equal(clausulaSugerida({ id: 'z', age: 25, value: 0 }), 250_000, 'minimo');
  const u = criarUniverso();
  const com = garantirClausulas(u.players);
  const comContrato = com.filter(p => p.contract && p.teamId !== 'MARKET');
  assert.ok(comContrato.every(p => typeof p.contract!.releaseClause === 'number'));
  const sem = comContrato.filter(p => p.contract!.releaseClause === 0).length / comContrato.length;
  assert.ok(Math.abs(sem - CHANCE_SEM_CLAUSULA) < 0.08, `fracao sem clausula ${sem}`);
  assert.equal(garantirClausulas(com), com, 'a segunda passagem nao muda nada');
  assert.deepEqual(garantirClausulas(u.players).map(p => p.contract?.releaseClause), com.map(p => p.contract?.releaseClause), 'deterministico');
  assert.equal(clausulaAposTransferencia(3_000_000, 2_000_000), 6_000_000);
  assert.equal(clausulaDe({ contract: undefined } as any), 0);
});

test('clausula na renovacao: o jogador quer clausula baixa; acima do pedido tira chance, nenhuma ajuda; o contrato guarda a clausula', () => {
  const p = { id: 'r1', name: 'R', position: 'CM', skill: 70, age: 24, value: 4_000_000, salary: 8_000, morale: 50, teamId: 'U', contract: { start: '2021-07-01', end: '2024-07-01', years: 3, releaseClause: 9_000_000 } } as any;
  const pedido = propostaDoJogador(p, '2024-04-01');
  assert.ok(pedido.clausula! > 0 && pedido.clausula! < clausulaSugerida(p), 'pede menos que a sugerida');
  assert.equal(chanceDeAceitar(p, pedido, pedido), 1, 'igual ao pedido');
  assert.equal(chanceDeAceitar(p, { ...pedido, clausula: 0 }, pedido), 1, 'sem clausula tambem assina na hora');
  const alta = chanceDeAceitar(p, { ...pedido, salario: pedido.salario * 0.95, clausula: pedido.clausula! + 8_000_000 }, pedido);
  const igual = chanceDeAceitar(p, { ...pedido, salario: pedido.salario * 0.95 }, pedido);
  const nenhuma = chanceDeAceitar(p, { ...pedido, salario: pedido.salario * 0.95, clausula: 0 }, pedido);
  assert.ok(alta < igual && igual < nenhuma, `${alta} < ${igual} < ${nenhuma}`);
  assert.ok(efeitoDaClausula(p, { ...pedido, clausula: 1e12 }, pedido) >= -0.3, 'penalidade limitada');
  assert.equal(chanceDeAceitar(p, { salario: pedido.salario, anos: pedido.anos }, pedido), 1, 'oferta sem clausula: regra antiga');
  assert.equal(contratoDaOferta({ salario: 1, anos: 2, clausula: 5_000_000 }, '2024-04-01').releaseClause, 5_000_000);
  assert.equal(assinar(p, { salario: 9_000, anos: 3 }, '2024-04-01').contract!.releaseClause, 9_000_000, 'sem clausula na oferta: mantem a atual');
  assert.equal(assinar(p, { salario: 9_000, anos: 3, clausula: 0 }, '2024-04-01').contract!.releaseClause, 0, 'clausula 0: contrato sem clausula');
});

test('clausula: a CPU paga a clausula de um jogador do utilizador -> o utilizador nao pode recusar, conclui na hora', () => {
  let u = ricos(criarUniverso());
  const dono = u.teams[0].id, cpu = u.teams[1].id;
  const alvo = vendavel(u, dono);
  u = comJogador(u, alvo.id, p => ({ ...p, contract: { ...p.contract!, releaseClause: 2_000_000 } }));
  const soma = somaCaixa(u), cxDono = caixa(u, dono);
  // abaixo da clausula: fluxo normal (o utilizador decide)
  const baixa = proporCompra(u, cpu, alvo.id, 1_900_000, HOJE, dono);
  assert.equal(baixa.u.mercado.negociacoes.find(n => n.id === baixa.negId)!.estado, 'RECEBIDA');
  // a clausula
  const r = proporCompra(u, cpu, alvo.id, 2_000_000, HOJE, dono);
  assert.ok(r.ok, r.motivo);
  const neg = r.u.mercado.negociacoes.find(n => n.id === r.negId)!;
  assert.equal(neg.estado, 'CONCLUIDA', 'aceita e concluida sem resposta do vendedor');
  assert.equal(r.u.players.find(p => p.id === alvo.id)!.teamId, cpu);
  assert.equal(caixa(r.u, dono), cxDono + 2_000_000);
  assert.equal(somaCaixa(r.u), soma);
  const ev = r.eventos.find(e => e.tipo === 'CLAUSULA_PAGA' && e.clubeId === dono);
  assert.ok(ev && ev.lado === 'VENDEDOR', 'o utilizador e avisado da clausula');
  assert.ok(r.u.mercado.transacoes.some(t => t.negId === neg.id && t.tipo === 'CLAUSULA'));
  assert.equal(clausulaDe(r.u.players.find(p => p.id === alvo.id)), clausulaAposTransferencia(2_000_000, valorDeMercado(alvo, HOJE)), 'o comprador fixa a clausula nova');
});

test('clausula: o utilizador paga a de um jogador da CPU (salta a negociacao); fora da janela fica aceita e conclui quando abre; sem clausula nao da', () => {
  let u = ricos(criarUniverso());
  const dono = u.teams[0].id, cpu = u.teams[2].id;
  const alvo = vendavel(u, cpu);
  u = comJogador(u, alvo.id, p => ({ ...p, contract: { ...p.contract!, releaseClause: 3_000_000 } }));
  const r = pagarClausula(u, dono, alvo.id, HOJE, dono);
  assert.ok(r.ok, r.motivo);
  assert.equal(r.u.mercado.negociacoes.find(n => n.id === r.negId)!.estado, 'CONCLUIDA');
  assert.equal(r.u.players.find(p => p.id === alvo.id)!.teamId, dono);
  // fora da janela (maio): aceita, pendente; em julho conclui no dia do mercado
  const fora = pagarClausula(u, dono, alvo.id, '2024-05-10', dono);
  const negF = fora.u.mercado.negociacoes.find(n => n.id === fora.negId)!;
  assert.equal(negF.estado, 'ACEITA', 'o vendedor ja nao pode recusar; espera a janela');
  let x = { ...fora.u, mercado: { ...fora.u.mercado, negociacoes: fora.u.mercado.negociacoes.map(n => (n.id === negF.id ? { ...n, expira: '2024-08-01' } : n)) } };
  x = tickDoDia(x, { donoId: dono, hoje: '2024-07-01' }).u;
  assert.equal(x.mercado.negociacoes.find(n => n.id === negF.id)!.estado, 'CONCLUIDA');
  // sem clausula
  const semC = comJogador(u, alvo.id, p => ({ ...p, contract: { ...p.contract!, releaseClause: 0 } }));
  assert.equal(pagarClausula(semC, dono, alvo.id, HOJE, dono).ok, false);
});

// ============================================================== BONUS POR JOGOS
test('bonus: normalizados (so 10/15/20, positivos) e contados a 60% pelo vendedor: a mesma oferta com bonus passa de contraproposta a aceita', () => {
  assert.deepEqual(normalizarBonus([{ jogos: 15, valor: 1234 }, { jogos: 12, valor: 9 }, { jogos: 10, valor: 0 }, { jogos: 20, valor: 5000 }]), [{ jogos: 15, valor: 1000 }, { jogos: 20, valor: 5000 }]);
  assert.equal(valorDosBonus([{ jogos: 10, valor: 1_000_000 }]), 600_000);
  const u = ricos(criarUniverso());
  const c = u.teams[0].id, alvo = vendavel(u, u.teams[3].id);
  const desejado = precoDesejado(u, alvo, alvo.teamId, HOJE);
  const base: NegociacaoTransf = { id: 'neg-x', playerId: alvo.id, compradorId: c, vendedorId: alvo.teamId, origem: 'ELENCO', estado: 'ENVIADA', aguarda: 'VENDEDOR', valor: 0, rodadas: 1, criada: HOJE, atualizada: HOJE, expira: HOJE, respondeEm: HOJE, historico: [] };
  const oferta = Math.round(desejado * 0.9);
  assert.equal(avaliarOferta(u, base, oferta, HOJE).decisao, 'CONTRA');
  const comBonus = { ...base, bonus: [{ jogos: 10, valor: Math.round(desejado * 0.1) }, { jogos: 20, valor: Math.round(desejado * 0.1) }] };
  assert.equal(avaliarOferta(u, comBonus, oferta, HOJE).decisao, 'ACEITA', '0,9 + 0,6 x 0,2 = 1,02 do preco');
  const d = avaliarOferta(u, { ...base, bonus: [{ jogos: 10, valor: Math.round(desejado * 0.05) }] }, Math.round(desejado * 0.8), HOJE);
  assert.equal(d.decisao, 'CONTRA');
  assert.ok(d.contra! < desejado && d.contra! > Math.round(desejado * 0.8), 'a contraproposta desconta os bonus');
});

test('bonus: a venda guarda os bonus; os jogos contam so pelo comprador; cada marco (10/15/20) paga uma vez; sair do clube caduca o resto', () => {
  let u = ricos(criarUniverso());
  const comprador = u.teams[0].id, vendedor = u.teams[4].id;
  const alvo = vendavel(u, vendedor);
  const bonus = [{ jogos: 10, valor: 100_000 }, { jogos: 15, valor: 200_000 }, { jogos: 20, valor: 300_000 }];
  const r = proporCompra(u, comprador, alvo.id, 60_000_000, HOJE, 'HUMANO', undefined, bonus);
  assert.ok(r.ok, r.motivo);
  u = r.u;
  for (let d = 1; d <= 4; d++) u = tickDoDia(u, { donoId: 'HUMANO', hoje: mover(HOJE, d) }).u;
  assert.equal(u.mercado.negociacoes.find(n => n.id === r.negId)!.estado, 'CONCLUIDA');
  const rec = u.mercado.bonus!.find(b => b.negId === r.negId)!;
  assert.ok(rec && rec.estado === 'ATIVO' && rec.jogos === 0);
  assert.deepEqual(rec.marcos.map(m => [m.jogos, m.valor]), [[10, 100_000], [15, 200_000], [20, 300_000]]);
  // jogos: so os do jogador e enquanto esta no comprador
  const outro = u.players.find(p => p.teamId === vendedor)!;
  assert.equal(registrarJogosDosBonus(u.mercado, u.players, [outro.id]), u.mercado, 'outro jogador nao conta');
  const jogar = (n: number) => { for (let i = 0; i < n; i++) u = { ...u, mercado: registrarJogosDosBonus(u.mercado, u.players, [alvo.id]) }; };
  jogar(9);
  let p = processarBonus(u, '2024-05-01', 'HUMANO');
  assert.equal(p.eventos.length, 0, '9 jogos: nada ainda');
  jogar(1);
  const cxC = caixa(u, comprador), cxV = caixa(u, vendedor), soma = somaCaixa(u);
  p = processarBonus(u, '2024-05-08', 'HUMANO'); u = p.u;
  assert.equal(caixa(u, comprador), cxC - 100_000); assert.equal(caixa(u, vendedor), cxV + 100_000); assert.equal(somaCaixa(u), soma);
  assert.deepEqual(p.eventos.map(e => [e.tipo, e.lado, e.jogos]), [['BONUS_PAGO', 'COMPRADOR', 10], ['BONUS_PAGO', 'VENDEDOR', 10]]);
  assert.equal(u.mercado.transacoes.filter(t => t.tipo === 'BONUS').length, 2);
  assert.equal(processarBonus(u, '2024-05-09', 'HUMANO').eventos.length, 0, 'o marco pago nao paga de novo');
  jogar(10);
  p = processarBonus(u, '2024-06-20', 'HUMANO'); u = p.u;
  assert.equal(p.eventos.length, 4, '15 e 20 de uma vez');
  assert.equal(u.mercado.bonus!.find(b => b.negId === r.negId)!.estado, 'CONCLUIDO');
  // caducar: outra venda com bonus, e o jogador sai do comprador antes dos 10 jogos
  let w = ricos(criarUniverso());
  const alvo2 = vendavel(w, vendedor);
  const r2 = proporCompra(w, comprador, alvo2.id, 60_000_000, HOJE, 'HUMANO', undefined, [{ jogos: 10, valor: 50_000 }]);
  w = r2.u; for (let d = 1; d <= 4; d++) w = tickDoDia(w, { donoId: 'HUMANO', hoje: mover(HOJE, d) }).u;
  w = comJogador(w, alvo2.id, x => ({ ...x, teamId: u.teams[6].id }));
  w = processarBonus(w, '2024-05-01', 'HUMANO').u;
  assert.equal(w.mercado.bonus!.find(b => b.negId === r2.negId)!.estado, 'CADUCADO');
});

test('bonus: comprador fora da liga do utilizador (sem escalacao): 1 jogo estimado a cada 7 dias para quem esta entre os 14 melhores', () => {
  let u = ricos(criarUniverso());
  const dono = u.teams[0].id, comprador = u.teams[1].id, vendedor = u.teams[5].id;
  const alvo = vendavel(u, vendedor);
  const r = proporCompra(u, comprador, alvo.id, 60_000_000, HOJE, dono, undefined, [{ jogos: 10, valor: 70_000 }]);
  u = r.u; for (let d = 1; d <= 4; d++) u = tickDoDia(u, { donoId: dono, hoje: mover(HOJE, d) }).u;
  assert.equal(u.mercado.negociacoes.find(n => n.id === r.negId)!.estado, 'CONCLUIDA');
  u = { ...u, teams: u.teams.map(t => (t.id === comprador ? { ...t, leagueId: 'outra_liga' } : t)) };   // o comprador passa a jogar fora da liga do utilizador
  const p = u.players.find(x => x.id === alvo.id)!;
  const top14 = elenco(u, comprador).sort((a, b) => b.skill - a.skill).slice(0, 14).some(x => x.id === p.id);
  const dataVenda = u.mercado.bonus![0].data;
  const res = processarBonus(u, mover(dataVenda, 70), dono);
  const b = res.u.mercado.bonus!.find(x => x.negId === r.negId)!;
  assert.equal(b.jogos, top14 ? 10 : 0);
  assert.equal(b.marcos[0].pago !== undefined, top14);
});

// ============================================================== EMPRESTIMO COM OPCAO DE COMPRA
test('emprestimo: pedido a CPU por um reserva -> aceito e concluido; volta ao dono no fim; taxa paga uma vez', () => {
  let u = ricos(criarUniverso());
  const c = u.teams[0].id, dono = u.teams[7].id;
  const alvo = reserva(u, dono);
  assert.ok(alvo, 'ha um reserva para emprestar');
  const taxa = taxaDeEmprestimoDesejada(alvo, 12, HOJE);
  assert.equal(proporEmprestimo(u, c, alvo.id, taxa, 2, undefined, HOJE, 'HUMANO').ok, false, 'minimo de 3 meses');
  assert.equal(proporEmprestimo(u, c, alvo.id, taxa, 30, undefined, HOJE, 'HUMANO').ok, false, 'maximo de 24 meses');
  const soma = somaCaixa(u), cxC = caixa(u, c);
  const r = proporEmprestimo(u, c, alvo.id, taxa, 12, undefined, HOJE, 'HUMANO');
  assert.ok(r.ok, r.motivo);
  u = r.u;
  for (let d = 1; d <= 4; d++) u = tickDoDia(u, { donoId: 'HUMANO', hoje: mover(HOJE, d) }).u;
  const neg = u.mercado.negociacoes.find(n => n.id === r.negId)!;
  assert.equal(neg.estado, 'CONCLUIDA', neg.motivo);
  const p = u.players.find(x => x.id === alvo.id)!;
  assert.equal(p.teamId, c);
  assert.equal(p.emprestimo!.de, dono);
  assert.equal(caixa(u, c), cxC - taxa);
  assert.ok(Math.abs(somaCaixa(u) - soma) < 1);
  assert.equal(u.mercado.transacoes.filter(t => t.negId === neg.id && t.tipo === 'EMPRESTIMO').length, 2);
  // durante o emprestimo ninguem o compra
  assert.equal(proporCompra(u, u.teams[8].id, alvo.id, 50_000_000, mover(HOJE, 5), 'HUMANO').motivo, 'jogador emprestado');
  // no fim volta
  const fim = processarEmprestimos(u, p.emprestimo!.ate, 'HUMANO');
  const volta = fim.u.players.find(x => x.id === alvo.id)!;
  assert.equal(volta.teamId, dono); assert.equal(volta.emprestimo, undefined);
  assert.ok(fim.eventos.some(e => e.tipo === 'EMPRESTIMO_FIM' && e.clubeId === c));
  assert.ok(fim.u.mercado.historico.some(m => m.tipo === 'DEVOLUCAO' && m.jogadorId === alvo.id));
});

test('emprestimo: o dono nao empresta titulares (salvo listados), recusa opcao abaixo do preco e contrapropoe a taxa baixa', () => {
  let u = ricos(criarUniverso());
  const c = u.teams[0].id, dono = u.teams[9].id;
  const ps = elenco(u, dono);
  const titular = ps.filter(p => grupoDe(p.position) === 'MID').sort((a, b) => b.skill - a.skill)[0];
  const neg = (playerId: string, valor: number, opcao?: number): NegociacaoTransf => ({ id: 'n', playerId, compradorId: c, vendedorId: dono, origem: 'ELENCO', estado: 'ENVIADA', aguarda: 'VENDEDOR', valor, rodadas: 1, criada: HOJE, atualizada: HOJE, expira: HOJE, respondeEm: HOJE, historico: [], tipo: 'EMPRESTIMO', emprestimo: { meses: 12, ...(opcao !== undefined ? { opcaoCompra: opcao } : {}) } });
  assert.equal(avaliarOferta(u, neg(titular.id, 10_000_000), 10_000_000, HOJE).motivo, 'o clube nao empresta titulares');
  const r = reserva(u, dono);
  const preco = precoDesejado(u, r, dono, HOJE);
  assert.equal(avaliarOferta(u, neg(r.id, 10_000_000, Math.round(preco * 0.5)), 10_000_000, HOJE).motivo, 'opcao de compra abaixo do preco do jogador');
  assert.equal(avaliarOferta(u, neg(r.id, 10_000_000, preco), 10_000_000, HOJE).decisao, 'ACEITA');
  const d = avaliarOferta(u, neg(r.id, 0), 0, HOJE);
  assert.equal(d.decisao, 'CONTRA'); assert.equal(d.contra, taxaDeEmprestimoDesejada(r, 12, HOJE));
  // listado para emprestimo: sai mesmo sendo titular, com a taxa reduzida (quem pede emprestado paga sempre: de graca, contrapropoe a taxa)
  u = comJogador(u, titular.id, p => ({ ...p, listedForLoan: true }));
  const tl = u.players.find(p => p.id === titular.id)!;
  const taxaListado = taxaDeEmprestimoDesejada(tl, 12, HOJE);
  assert.ok(taxaListado > 0 && taxaListado < taxaDeEmprestimoDesejada({ ...tl, listedForLoan: false }, 12, HOJE), 'listado: taxa menor, mas nunca zero');
  if (tl.contract && tl.contract.end > '2025-06-01' && elencoValidoSem(elenco(u, dono), tl, CONFIG_MERCADO, u.teams.find(t => t.id === dono)?.tactics?.formation)) {
    assert.equal(avaliarOferta(u, neg(titular.id, taxaListado), taxaListado, HOJE).decisao, 'ACEITA');
    assert.equal(avaliarOferta(u, neg(titular.id, 0), 0, HOJE).decisao, 'CONTRA');
  }
});

test('emprestimo com opcao: o utilizador exerce a opcao (paga o preco menos a taxa ja paga, fica de vez) e recebe o aviso 30 dias antes do fim', () => {
  let u = ricos(criarUniverso());
  const meu = u.teams[0].id, dono = u.teams[10].id;
  const alvo = reserva(u, dono);
  const opcao = precoDesejado(u, alvo, dono, HOJE) + 100_000;
  // Com opcao, a taxa e 1/3 do valor (mais a necessidade do dono) e conta como parte da compra.
  const taxa = taxaDeEmprestimoComOpcao(u, alvo, HOJE);
  assert.ok(Math.abs(taxa - valorDeMercado(alvo, HOJE) / 3) <= valorDeMercado(alvo, HOJE) / 3 * 0.31, 'a taxa com opcao e 1/3 do valor (+ ate 30% de necessidade)');
  const r = proporEmprestimo(u, meu, alvo.id, taxa, 6, opcao, HOJE, meu);
  assert.ok(r.ok, r.motivo);
  u = r.u; for (let d = 1; d <= 4; d++) u = tickDoDia(u, { donoId: meu, hoje: mover(HOJE, d) }).u;
  const p = u.players.find(x => x.id === alvo.id)!;
  assert.equal(p.emprestimo?.opcaoCompra, opcao);
  assert.equal(p.emprestimo?.taxaPaga, taxa);
  // aviso: 30 dias antes do fim, uma vez
  const aviso = processarEmprestimos(u, mover(p.emprestimo!.ate, -30), meu);
  assert.ok(aviso.eventos.some(e => e.tipo === 'OPCAO_AVISO' && e.clubeId === meu));
  assert.equal(processarEmprestimos(aviso.u, mover(p.emprestimo!.ate, -29), meu).eventos.length, 0, 'aviso uma vez so');
  // exerce
  const cxM = caixa(u, meu), cxD = caixa(u, dono);
  const ex = exercerOpcao(u, alvo.id, mover(HOJE, 30));
  assert.ok(ex.ok, ex.motivo);
  const q = ex.u.players.find(x => x.id === alvo.id)!;
  assert.equal(q.teamId, meu); assert.equal(q.emprestimo, undefined);
  assert.equal(caixa(ex.u, meu), cxM - (opcao - taxa)); assert.equal(caixa(ex.u, dono), cxD + (opcao - taxa));
  assert.equal(ex.u.mercado.transacoes.filter(t => t.tipo === 'OPCAO').length, 2);
  assert.equal(exercerOpcao(ex.u, alvo.id, mover(HOJE, 31)).ok, false, 'nao exerce duas vezes');
  // sem opcao: nao da
  const semOpcao = comJogador(u, alvo.id, x => ({ ...x, emprestimo: { ...x.emprestimo!, opcaoCompra: undefined } }));
  assert.equal(exercerOpcao(semOpcao, alvo.id, mover(HOJE, 30)).motivo, 'o emprestimo nao tem opcao de compra');
  // o utilizador que nao exerce perde o jogador no fim (a CPU nao decide por ele)
  const fim = processarEmprestimos(u, p.emprestimo!.ate, meu);
  assert.equal(fim.u.players.find(x => x.id === alvo.id)!.teamId, dono);
});

test('emprestimo com opcao: no fim a CPU exerce se o preco cabe, tem caixa e o jogador e titular dela', () => {
  let u = ricos(criarUniverso());
  const cpu = u.teams[11].id;
  // o melhor meio-campista (ate 32 anos) de outro clube, listado para emprestimo: titular em qualquer clube
  const alvo = u.players.filter(p => p.teamId !== cpu && p.teamId !== 'MARKET' && grupoDe(p.position) === 'MID' && p.age <= 32 && p.contract && p.contract.end > '2025-06-01'
    && elencoValidoSem(elenco(u, p.teamId), p, CONFIG_MERCADO, u.teams.find(t => t.id === p.teamId)?.tactics?.formation)).sort((a, b) => b.skill - a.skill)[0];
  u = comJogador(u, alvo.id, p => ({ ...p, listedForLoan: true }));
  const dono = alvo.teamId;
  const listado = u.players.find(p => p.id === alvo.id)!;
  const r = proporEmprestimo(u, cpu, alvo.id, taxaDeEmprestimoComOpcao(u, listado, HOJE), 6, precoDesejado(u, listado, dono, HOJE), HOJE, 'HUMANO');
  assert.ok(r.ok, r.motivo);
  u = r.u; for (let d = 1; d <= 3; d++) u = tickDoDia(u, { donoId: 'HUMANO', hoje: mover(HOJE, d) }).u;
  assert.equal(u.mercado.negociacoes.find(n => n.id === r.negId)!.estado, 'CONCLUIDA');
  const p = u.players.find(x => x.id === alvo.id)!;
  // preco caro demais: devolve
  const caro = comJogador(u, alvo.id, x => ({ ...x, emprestimo: { ...x.emprestimo!, opcaoCompra: 999_000_000 } }));
  assert.equal(iaExerceOpcao(caro, caro.players.find(x => x.id === alvo.id)!, p.emprestimo!.ate), false);
  assert.equal(processarEmprestimos(caro, p.emprestimo!.ate, 'HUMANO').u.players.find(x => x.id === alvo.id)!.teamId, dono);
  // preco barato: compra
  const barato = comJogador(u, alvo.id, x => ({ ...x, emprestimo: { ...x.emprestimo!, opcaoCompra: 1_000 } }));
  assert.ok(iaExerceOpcao(barato, barato.players.find(x => x.id === alvo.id)!, p.emprestimo!.ate));
  const fim = processarEmprestimos(barato, p.emprestimo!.ate, 'HUMANO');
  const q = fim.u.players.find(x => x.id === alvo.id)!;
  assert.equal(q.teamId, cpu); assert.equal(q.emprestimo, undefined);
  assert.ok(fim.eventos.some(e => e.tipo === 'OPCAO_EXERCIDA'));
});

test('persistencia: emprestimos, bonus e clausulas sobrevivem a salvar e carregar (JSON); saves antigos sem os campos continuam a funcionar', () => {
  let u = ricos(criarUniverso());
  u = { ...u, players: garantirClausulas(u.players) };
  const salvo = JSON.parse(JSON.stringify(u)) as Universo;
  assert.deepEqual(salvo.players.map(p => p.contract?.releaseClause), u.players.map(p => p.contract?.releaseClause));
  // um mercado antigo, sem `bonus`, e jogadores sem `emprestimo`: o dia corre igual
  const antigo: Universo = { ...u, mercado: { negociacoes: [], transacoes: [], historico: [], proximoNum: 1, ultimoDia: '', mesDosValores: '' } };
  const r = tickDoDia(antigo, { donoId: 'HUMANO', hoje: '2024-04-03' });
  assert.ok(r.ok);
  assert.equal(processarBonus(antigo, '2024-04-03', 'HUMANO').u, antigo);
  assert.equal(processarEmprestimos(antigo, '2024-04-03', 'HUMANO').u, antigo);
  assert.equal(processarParcelas(clubeTeste(), '2024-04-03').pagamentos.length, 0, 'clube sem emprestimos');
});
