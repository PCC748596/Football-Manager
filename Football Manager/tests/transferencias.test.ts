import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLeagueData } from '../textSim/dataGenerator';
import { garantirBase, processarBase, TAMANHO_BASE, IDADE_SAIDA } from '../textSim/youth';
import { processarContratos } from '../textSim/contracts';
import { recalcularValores, valorDeMercado } from '../textSim/valuation';
import {
  Universo, mercadoVazio, prepararOrcamentos, proporCompra, responderComoVendedor, responderComoComprador, retirar, concluir, contratarAgenteLivre, listarParaVenda,
  tickDoDia, janelaAberta, precoDesejado, avaliarOferta, grupoDe, ESTADOS_ATIVOS, CONFIG_MERCADO, localizar
} from '../textSim/transferencias';

const mover = (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

const criarUniverso = (hoje = '2024-04-02'): Universo => {
  const { teams, players } = generateLeagueData('45', 'bra_serie_a') as any;
  const ts = prepararOrcamentos(teams);
  const ps = recalcularValores(processarContratos(players, hoje, 'NINGUEM').jogadores, hoje);
  const base = garantirBase(null, ts.map((t: any) => t.id), hoje);
  return { players: ps, base, teams: ts, mercado: mercadoVazio(hoje) };
};
const DONO = 'HUMANO';   // quase todos os testes tem um clube "humano" explicito: o primeiro time
const patch = (u: Universo, id: string, f: (t: any) => any): Universo => ({ ...u, teams: u.teams.map(t => (t.id === id ? f(t) : t)) });
const ricos = (u: Universo): Universo => ({ ...u, teams: u.teams.map(t => ({ ...t, cash: 90_000_000, transferBudget: 90_000_000 })) });

/** Os invariantes que nenhuma operacao pode quebrar. */
const invariantes = (u: Universo, rotulo = '') => {
  const ids = [...u.players.map(p => p.id), ...(u.base?.jogadores.map(p => p.id) || [])];
  assert.equal(new Set(ids).size, ids.length, `${rotulo}: jogador duplicado (em dois clubes ou duas categorias)`);
  u.teams.forEach(t => { assert.ok(Number.isFinite(t.cash), 'saldo finito'); assert.ok((t.transferBudget ?? 0) >= 0, `${rotulo}: orcamento negativo em ${t.id}`); });
  if (u.base) u.teams.forEach(t => assert.equal(u.base!.jogadores.filter(p => p.teamId === t.id).length, TAMANHO_BASE, `${rotulo}: base de ${t.id} fora de 20`));
  const tx = u.mercado.transacoes.map(t => t.id);
  assert.equal(new Set(tx).size, tx.length, `${rotulo}: transacao repetida`);
  const concluidas = u.mercado.negociacoes.filter(n => n.estado === 'CONCLUIDA');
  concluidas.forEach(n => assert.equal(tx.filter(i => i === `tx-${n.id}-C` || i === `tx-${n.id}-V`).length, 2, `${rotulo}: ${n.id} deve ter exatamente 2 lancamentos`));
};
const somaCaixa = (u: Universo) => u.teams.reduce((s, t) => s + t.cash, 0);

/** Um alvo comum: um titular de outro clube, com bom contrato. */
const escolherAlvo = (u: Universo, compradorId: string) => u.players.filter(p => p.teamId !== compradorId && p.teamId !== 'MARKET' && p.skill >= 60 && p.contract && p.contract.end > '2026-01-01')[0];
const aceitarTudo = (u: Universo, compradorId: string, alvoId: string, hoje: string): Universo => {
  let x = u;
  const r = proporCompra(x, compradorId, alvoId, 50_000_000, hoje, DONO);
  assert.ok(r.ok, r.motivo);
  x = r.u;
  for (let d = 1; d <= 6; d++) { const t = tickDoDia(x, { donoId: DONO, hoje: mover(hoje, d) }); x = t.u; }
  return x;
};

test('janelas: aberta de jan a 10/abr e de jul a ago; fechada no resto', () => {
  assert.ok(janelaAberta('2024-04-02')); assert.ok(janelaAberta('2024-07-15')); assert.ok(janelaAberta('2024-01-05'));
  assert.ok(!janelaAberta('2024-05-20')); assert.ok(!janelaAberta('2024-10-01')); assert.ok(!janelaAberta('2024-04-11'));
});

test('proposta -> resposta do vendedor IA em 1-3 dias -> aceita, concluida: dinheiro, orcamento, elencos e registros', () => {
  let u = ricos(criarUniverso());
  const comprador = u.teams[0].id, alvo = escolherAlvo(u, comprador), vendedor = alvo.teamId;
  const caixaC = u.teams[0].cash, caixaV = u.teams.find(t => t.id === vendedor)!.cash, somaAntes = somaCaixa(u);
  const nAntes = u.players.length;
  const r = proporCompra(u, comprador, alvo.id, 50_000_000, '2024-04-02', DONO);
  assert.ok(r.ok); u = r.u;
  const neg = u.mercado.negociacoes[0];
  assert.equal(neg.estado, 'ENVIADA'); assert.equal(neg.aguarda, 'VENDEDOR'); assert.equal(neg.historico.length, 1);
  assert.ok(neg.respondeEm! >= '2024-04-03' && neg.respondeEm! <= '2024-04-05', 'responde em 1 a 3 dias: ' + neg.respondeEm);
  // uma proposta enviada nao debita nada
  assert.equal(u.teams.find(t => t.id === comprador)!.cash, caixaC);
  for (let d = 1; d <= 3; d++) u = tickDoDia(u, { donoId: DONO, hoje: mover('2024-04-02', d) }).u;
  const fim = u.mercado.negociacoes.find(n => n.id === neg.id)!;
  assert.equal(fim.estado, 'CONCLUIDA', 'oferta altissima: aceita e concluida');
  const pago = fim.valor;
  assert.equal(u.teams.find(t => t.id === comprador)!.cash, caixaC - pago, 'debitado uma vez');
  assert.equal(u.teams.find(t => t.id === vendedor)!.cash, caixaV + pago, 'creditado uma vez');
  assert.ok(Math.abs(somaCaixa(u) - somaAntes) < 1, 'dinheiro conservado entre os dois clubes');
  assert.equal(u.players.find(p => p.id === alvo.id)!.teamId, comprador);
  assert.equal(u.players.length, nAntes, 'ninguem criado nem perdido');
  const txs = u.mercado.transacoes.filter(t => t.negId === neg.id);
  assert.equal(txs.length, 2);
  const c = txs.find(t => t.natureza === 'COMPRA')!, v = txs.find(t => t.natureza === 'VENDA')!;
  assert.equal(c.saldoAntes - c.saldoDepois, pago); assert.equal(v.saldoDepois - v.saldoAntes, pago);
  assert.equal(u.teams.find(t => t.id === vendedor)!.transferBudget, 90_000_000 + Math.round(pago * CONFIG_MERCADO.parteDaReceitaNoOrcamento), 'orcamento do vendedor sobe pela regra configuravel');
  assert.equal(u.teams.find(t => t.id === comprador)!.transferBudget, 90_000_000 - pago);
  invariantes(u);
  // concluir de novo (clique repetido / chamada duplicada) nao faz nada
  const dup = concluir(u, neg.id, '2024-04-06');
  assert.equal(dup.ok, false); assert.equal(somaCaixa(dup.u), somaCaixa(u));
});

test('oferta baixa: contraproposta -> o comprador aceita e conclui; limite de rodadas', () => {
  let u = ricos(criarUniverso());
  const comprador = u.teams[0].id, alvo = escolherAlvo(u, comprador);
  const desejado = precoDesejado(u, alvo, alvo.teamId, '2024-04-02');
  let r = proporCompra(u, comprador, alvo.id, Math.round(desejado * 0.7), '2024-04-02', DONO); u = r.u;
  const id = r.negId!;
  for (let d = 1; d <= 3; d++) u = tickDoDia(u, { donoId: comprador, hoje: mover('2024-04-02', d) }).u;
  let neg = u.mercado.negociacoes.find(n => n.id === id)!;
  assert.equal(neg.estado, 'CONTRAPROPOSTA'); assert.equal(neg.aguarda, 'COMPRADOR');
  assert.ok(neg.valor > Math.round(desejado * 0.7) && neg.valor <= desejado * 1.2 + 1000, 'a contra fica entre a oferta e o preco desejado (mais o interesse de outros clubes, ate +18%)');
  assert.equal(neg.historico.length, 2); assert.equal(neg.historico[1].de, 'VENDEDOR');
  // o comprador (aqui o "humano") recusa a primeira contra com nova oferta mais baixa que o minimo: nova oferta, depois aceita
  let r2 = responderComoComprador(u, id, 'NOVA_OFERTA', Math.round(desejado * 0.9), '2024-04-06', comprador); assert.ok(r2.ok); u = r2.u;
  neg = u.mercado.negociacoes.find(n => n.id === id)!;
  assert.equal(neg.estado, 'ENVIADA'); assert.equal(neg.rodadas, 2);
  for (let d = 7; d <= 10; d++) u = tickDoDia(u, { donoId: comprador, hoje: mover('2024-04-02', d) }).u;
  neg = u.mercado.negociacoes.find(n => n.id === id)!;
  assert.ok(['CONTRAPROPOSTA', 'CONCLUIDA'].includes(neg.estado), neg.estado);
  if (neg.estado === 'CONTRAPROPOSTA') {
    const a = responderComoComprador(u, id, 'ACEITAR', undefined, '2024-04-10', comprador); assert.ok(a.ok); u = a.u;
    assert.equal(u.mercado.negociacoes.find(n => n.id === id)!.estado, 'CONCLUIDA');
  }
  invariantes(u);
  // limite de rodadas: depois de maxRodadas o comprador nao pode mais oferecer
  let v = ricos(criarUniverso());
  const al2 = escolherAlvo(v, v.teams[0].id); const comp2 = v.teams[0].id;
  const rr = proporCompra(v, comp2, al2.id, 1000, '2024-04-02', DONO); v = rr.u;
  v = { ...v, mercado: { ...v.mercado, negociacoes: v.mercado.negociacoes.map(n => ({ ...n, estado: 'CONTRAPROPOSTA' as const, aguarda: 'COMPRADOR' as const, rodadas: CONFIG_MERCADO.maxRodadas })) } };
  assert.equal(responderComoComprador(v, rr.negId!, 'NOVA_OFERTA', 5_000_000, '2024-04-03', comp2).ok, false, 'sem negociacao infinita');
});

test('oferta ridicula e recusada; recusada nao gera transferencia; retirada e expirada saem de cena', () => {
  let u = ricos(criarUniverso());
  const comprador = u.teams[0].id, alvo = escolherAlvo(u, comprador), nome = alvo.id;
  let r = proporCompra(u, comprador, alvo.id, 20_000, '2024-04-02', DONO); u = r.u; const id = r.negId!;
  for (let d = 1; d <= 3; d++) u = tickDoDia(u, { donoId: DONO, hoje: mover('2024-04-02', d) }).u;
  assert.equal(u.mercado.negociacoes.find(n => n.id === id)!.estado, 'RECUSADA');
  assert.equal(u.players.find(p => p.id === nome)!.teamId, alvo.teamId, 'o jogador nao se mexeu');
  assert.equal(u.mercado.transacoes.length, 0);
  // retirada
  r = proporCompra(u, comprador, alvo.id, 20_000, '2024-04-06', DONO); u = r.u;
  const ret = retirar(u, r.negId!, '2024-04-06'); u = ret.u;
  assert.equal(u.mercado.negociacoes.find(n => n.id === r.negId)!.estado, 'RETIRADA');
  assert.equal(concluir(u, r.negId!, '2024-04-07').ok, false, 'retirada nao pode ser concluida');
  // expirada: contraproposta que o humano deixa passar
  r = proporCompra(u, comprador, alvo.id, Math.round(precoDesejado(u, alvo, alvo.teamId, '2024-04-06') * 0.8), '2024-04-06', DONO); u = r.u;
  for (let d = 1; d <= 3; d++) u = tickDoDia(u, { donoId: comprador, hoje: mover('2024-04-06', d) }).u;
  assert.equal(u.mercado.negociacoes.find(n => n.id === r.negId)!.estado, 'CONTRAPROPOSTA');
  u = tickDoDia(u, { donoId: comprador, hoje: mover('2024-04-06', 20) }).u;
  assert.equal(u.mercado.negociacoes.find(n => n.id === r.negId)!.estado, 'EXPIRADA');
  invariantes(u);
});

test('compra sem saldo ou sem orcamento nao conclui; fica ACEITA ate haver recursos', () => {
  let u = criarUniverso();
  const comprador = u.teams[0].id, alvo = escolherAlvo(u, comprador);
  u = patch(u, comprador, t => ({ ...t, cash: 1_000, transferBudget: 90_000_000 }));
  let r = proporCompra(u, comprador, alvo.id, 3_000_000, '2024-04-02', DONO); u = r.u;
  const somaAntes = somaCaixa(u);
  for (let d = 1; d <= 4; d++) u = tickDoDia(u, { donoId: DONO, hoje: mover('2024-04-02', d) }).u;
  let neg = u.mercado.negociacoes.find(n => n.id === r.negId)!;
  assert.ok(['ACEITA', 'RECUSADA', 'CONTRAPROPOSTA'].includes(neg.estado));
  assert.notEqual(neg.estado, 'CONCLUIDA'); assert.equal(somaCaixa(u), somaAntes, 'nenhum movimento financeiro parcial');
  assert.equal(u.players.find(p => p.id === alvo.id)!.teamId, alvo.teamId);
  // sem orcamento de transferencias (saldo sobrando)
  let v = criarUniverso(); const al = escolherAlvo(v, v.teams[0].id);
  v = patch(v, v.teams[0].id, t => ({ ...t, cash: 90_000_000, transferBudget: 10_000 }));
  const rv = proporCompra(v, v.teams[0].id, al.id, 20_000_000, '2024-04-02', DONO); v = rv.u;
  for (let d = 1; d <= 4; d++) v = tickDoDia(v, { donoId: DONO, hoje: mover('2024-04-02', d) }).u;
  const n2 = v.mercado.negociacoes.find(n => n.id === rv.negId)!;
  assert.equal(n2.estado, 'ACEITA', 'aceita pelo vendedor mas o orcamento nao deixa concluir');
  // quando o clube passa a ter recursos, a negociacao pendente conclui sozinha
  v = patch(v, v.teams[0].id, t => ({ ...t, transferBudget: 190_000_000, cash: 190_000_000 }));
  v = tickDoDia(v, { donoId: DONO, hoje: '2024-04-08' }).u;
  assert.equal(v.mercado.negociacoes.find(n => n.id === rv.negId)!.estado, 'CONCLUIDA');
  invariantes(v);
});

test('o saldo ocupado em outra operacao durante a negociacao: a segunda conclusao falha (revalida)', () => {
  let u = ricos(criarUniverso());
  const comprador = u.teams[0].id;
  const [a, b] = u.players.filter(p => p.teamId !== comprador && p.teamId !== 'MARKET' && p.skill >= 60 && p.contract!.end > '2026-01-01').slice(0, 2);
  u = patch(u, comprador, t => ({ ...t, cash: 3_000_000, transferBudget: 3_000_000 }));
  const ra = proporCompra(u, comprador, a.id, 2_500_000, '2024-04-02', DONO); u = ra.u;
  const rb = proporCompra(u, comprador, b.id, 2_500_000, '2024-04-02', DONO); u = rb.u;
  const forcar = (id: string) => { u = { ...u, mercado: { ...u.mercado, negociacoes: u.mercado.negociacoes.map(n => (n.id === id ? { ...n, estado: 'ACEITA' as const, aguarda: null, valor: 2_500_000 } : n)) } }; };
  forcar(ra.negId!); forcar(rb.negId!);
  const c1 = concluir(u, ra.negId!, '2024-04-03'); assert.ok(c1.ok); u = c1.u;
  const c2 = concluir(u, rb.negId!, '2024-04-03'); assert.equal(c2.ok, false, c2.motivo);
  assert.equal(c2.motivo, 'saldo insuficiente');
  invariantes(u);
});

test('propostas concorrentes pelo mesmo jogador: ao concluir uma, as outras caem', () => {
  let u = ricos(criarUniverso());
  const alvo = escolherAlvo(u, 'x');
  const compradores = u.teams.filter(t => t.id !== alvo.teamId).slice(0, 3).map(t => t.id);
  const ids: string[] = [];
  for (const c of compradores) { const r = proporCompra(u, c, alvo.id, 50_000_000, '2024-04-02', DONO); assert.ok(r.ok); u = r.u; ids.push(r.negId!); }
  for (let d = 1; d <= 4; d++) u = tickDoDia(u, { donoId: DONO, hoje: mover('2024-04-02', d) }).u;
  const estados = ids.map(id => u.mercado.negociacoes.find(n => n.id === id)!.estado);
  assert.equal(estados.filter(e => e === 'CONCLUIDA').length, 1, 'so uma conclui: ' + estados.join(','));
  assert.ok(estados.filter(e => e !== 'CONCLUIDA').every(e => ['EXPIRADA', 'RECUSADA'].includes(e)));
  assert.equal(u.mercado.transacoes.filter(t => t.jogadorId === alvo.id && t.natureza === 'COMPRA').length, 1, 'um unico dono');
  invariantes(u);
});

test('fora da janela a transferencia nao conclui (fica ACEITA); abrindo a janela, conclui; agente livre nao depende da janela', () => {
  let u = ricos(criarUniverso('2024-05-01'));
  const comprador = u.teams[0].id, alvo = escolherAlvo(u, comprador);
  const r = proporCompra(u, comprador, alvo.id, 50_000_000, '2024-05-01', DONO); u = r.u;
  u = { ...u, mercado: { ...u.mercado, negociacoes: u.mercado.negociacoes.map(n => ({ ...n, expira: '2024-12-31' })) } };
  for (let d = 1; d <= 5; d++) u = tickDoDia(u, { donoId: DONO, hoje: mover('2024-05-01', d) }).u;
  assert.equal(u.mercado.negociacoes.find(n => n.id === r.negId)!.estado, 'ACEITA', 'janela fechada: pendente');
  assert.equal(concluir(u, r.negId!, '2024-05-10').motivo, 'fora da janela de transferencias');
  u = tickDoDia(u, { donoId: DONO, hoje: '2024-07-02' }).u;
  assert.equal(u.mercado.negociacoes.find(n => n.id === r.negId)!.estado, 'CONCLUIDA', 'na janela aberta conclui');
  // agente livre
  let w = ricos(criarUniverso('2024-05-01'));
  const livre = { ...w.players.find(p => p.teamId !== 'MARKET')!, teamId: 'MARKET' };
  w = { ...w, players: w.players.map(p => (p.id === livre.id ? livre : p)) };
  const clubeLivre = w.teams.find(t => t.id !== w.players.find(p => p.id === livre.id)!.teamId)!.id;
  const caixa = w.teams.find(t => t.id === clubeLivre)!.cash;
  const f = contratarAgenteLivre(w, clubeLivre, livre.id, '2024-05-01'); assert.ok(f.ok, f.motivo); w = f.u;
  const novo = w.players.find(p => p.id === livre.id)!;
  assert.equal(novo.teamId, clubeLivre); assert.equal(w.teams.find(t => t.id === clubeLivre)!.cash, caixa, 'sem taxa');
  assert.equal(novo.contract!.start, '2024-05-01'); assert.ok(novo.contract!.years >= 1);
  assert.equal(contratarAgenteLivre(w, clubeLivre, livre.id, '2024-05-02').ok, false, 'ja nao e livre');
  assert.equal(w.mercado.transacoes.filter(t => t.natureza === 'AGENTE_LIVRE').length, 1);
  invariantes(w);
});

test('contrato vencendo durante a negociacao: expira, e o jogador livre nao e vendido', () => {
  let u = ricos(criarUniverso());
  const comprador = u.teams[0].id;
  const alvo = u.players.find(p => p.teamId !== comprador && p.teamId !== 'MARKET' && p.skill >= 55)!;
  const fim = '2024-04-04';
  u = { ...u, players: u.players.map(p => (p.id === alvo.id ? { ...p, contract: { start: '2020-01-01', end: fim, years: 4 } } : p)) };
  const r = proporCompra(u, comprador, alvo.id, 50_000_000, '2024-04-02', DONO); u = r.u;
  // no dia do vencimento o contrato acaba (clube IA: renova) — simulamos o jogador livre
  u = { ...u, players: u.players.map(p => (p.id === alvo.id ? { ...p, teamId: 'MARKET' } : p)) };
  assert.equal(proporCompra(u, comprador, alvo.id, 1_000_000, '2024-04-04', DONO).ok, false, 'agente livre nao se compra: contrata-se sem taxa');
  u = tickDoDia(u, { donoId: DONO, hoje: '2024-04-05' }).u;
  assert.equal(u.mercado.negociacoes.find(n => n.id === r.negId)!.estado, 'EXPIRADA');
  assert.equal(concluir(u, r.negId!, '2024-04-05').ok, false);
  invariantes(u);
});

test('venda pelo humano: lista, recebe oferta da IA, aceita ou contraproposta; o elenco nunca fica abaixo do minimo', () => {
  let u = ricos(criarUniverso());
  const dono = u.teams[0].id, comprador = u.teams[1].id;
  const meu = u.players.filter(p => p.teamId === dono).sort((a, b) => b.skill - a.skill)[5];
  let l = listarParaVenda(u, meu.id, true); assert.ok(l.ok); u = l.u;
  assert.equal(u.players.find(p => p.id === meu.id)!.listedForSale, true);
  assert.equal(u.players.find(p => p.id === meu.id)!.teamId, dono, 'listar nao transfere');
  const r = proporCompra(u, comprador, meu.id, 50_000_000, '2024-04-02', dono); assert.ok(r.ok); u = r.u;
  const neg = u.mercado.negociacoes.find(n => n.id === r.negId)!;
  assert.equal(neg.estado, 'RECEBIDA'); assert.equal(r.eventos[0].tipo, 'OFERTA_RECEBIDA');
  const caixa = u.teams.find(t => t.id === dono)!.cash;
  const a = responderComoVendedor(u, neg.id, 'ACEITAR', undefined, '2024-04-03', dono); assert.ok(a.ok); u = a.u;
  assert.equal(u.mercado.negociacoes.find(n => n.id === neg.id)!.estado, 'CONCLUIDA');
  assert.equal(u.teams.find(t => t.id === dono)!.cash, caixa + neg.valor);
  assert.equal(u.players.find(p => p.id === meu.id)!.teamId, comprador);
  assert.equal(u.teams.find(t => t.id === dono)!.lineup.includes(meu.id), false, 'sai da escalacao do vendedor');
  invariantes(u);
  // contraproposta do humano: o comprador IA decide
  let v = ricos(criarUniverso());
  const d2 = v.teams[0].id, c2 = v.teams[1].id;
  const jog = v.players.filter(p => p.teamId === d2)[8];
  const r2 = proporCompra(v, c2, jog.id, Math.round(valorDeMercado(jog, '2024-04-02') * 0.6), '2024-04-02', d2); v = r2.u;
  const ct = responderComoVendedor(v, r2.negId!, 'CONTRA', Math.round(valorDeMercado(jog, '2024-04-02') * 1.0), '2024-04-02', d2); assert.ok(ct.ok); v = ct.u;
  assert.equal(v.mercado.negociacoes.find(n => n.id === r2.negId)!.estado, 'CONTRAPROPOSTA');
  for (let d = 1; d <= 3; d++) v = tickDoDia(v, { donoId: d2, hoje: mover('2024-04-02', d) }).u;
  assert.ok(['CONCLUIDA', 'RECUSADA'].includes(v.mercado.negociacoes.find(n => n.id === r2.negId)!.estado));
  invariantes(v);
  // o vendedor nao fica sem goleiros: a venda do segundo goleiro e recusada
  let g = ricos(criarUniverso());
  const t0 = g.teams[0].id;
  const gks = g.players.filter(p => p.teamId === t0 && grupoDe(p.position) === 'GK');
  g = { ...g, players: g.players.filter(p => !(p.teamId === t0 && grupoDe(p.position) === 'GK' && !gks.slice(0, 2).some(x => x.id === p.id))) };
  const rg = proporCompra(g, g.teams[1].id, gks[0].id, 50_000_000, '2024-04-02', 'x'); g = rg.u;
  for (let d = 1; d <= 4; d++) g = tickDoDia(g, { donoId: 'x', hoje: mover('2024-04-02', d) }).u;
  assert.equal(g.mercado.negociacoes.find(n => n.id === rg.negId)!.estado, 'RECUSADA');
});

test('jogadores do Sub-20 com 18+ entram no mercado: o vendedor repoe a vaga e o comprador recebe o jogador com os mesmos dados', () => {
  let u = ricos(criarUniverso());
  const comprador = u.teams[0].id;
  const jovem = u.base!.jogadores.find(p => p.teamId !== comprador && p.age >= 18)!;
  const copia = JSON.stringify({ ...jovem, teamId: '', shirtNumber: 0, listedForSale: false });
  const menor = u.base!.jogadores.find(p => p.teamId !== comprador && p.age < 18)!;
  assert.equal(proporCompra(u, comprador, menor.id, 50_000_000, '2024-04-02', DONO).ok, false, 'menores de 18 nao entram');
  const vendedor = jovem.teamId;
  const r = proporCompra(u, comprador, jovem.id, 50_000_000, '2024-04-02', DONO); u = r.u;
  for (let d = 1; d <= 4; d++) u = tickDoDia(u, { donoId: DONO, hoje: mover('2024-04-02', d) }).u;
  assert.equal(u.mercado.negociacoes.find(n => n.id === r.negId)!.estado, 'CONCLUIDA');
  assert.ok(!u.base!.jogadores.some(p => p.id === jovem.id), 'saiu da base');
  const pro = u.players.find(p => p.id === jovem.id)!;
  assert.equal(pro.teamId, comprador);
  assert.equal(JSON.stringify({ ...pro, teamId: '', shirtNumber: 0, listedForSale: false, trainingGroupId: undefined }), copia, 'mesmo id, atributos, potencial, contrato e historico');
  assert.equal(u.base!.jogadores.filter(p => p.teamId === vendedor).length, TAMANHO_BASE, 'a base do vendedor continua com 20');
  assert.ok(u.base!.jogadores.filter(p => p.teamId === vendedor).every(p => p.age >= 15 && p.age <= 20));
  invariantes(u);
});

test('persistencia: o estado do mercado sobrevive a salvar e carregar (JSON) e continua funcionando', () => {
  let u = ricos(criarUniverso());
  const comprador = u.teams[0].id, alvo = escolherAlvo(u, comprador);
  const r = proporCompra(u, comprador, alvo.id, Math.round(precoDesejado(u, alvo, alvo.teamId, '2024-04-02') * 0.75), '2024-04-02', DONO); u = r.u;
  u = tickDoDia(u, { donoId: DONO, hoje: '2024-04-03' }).u;
  const salvo = JSON.parse(JSON.stringify(u)) as Universo;
  assert.deepEqual(salvo.mercado, u.mercado);
  const a = tickDoDia(u, { donoId: DONO, hoje: '2024-04-05' }).u, b = tickDoDia(salvo, { donoId: DONO, hoje: '2024-04-05' }).u;
  assert.deepEqual(a.mercado.negociacoes, b.mercado.negociacoes, 'mesmo resultado depois de carregar');
  assert.equal(tickDoDia(a, { donoId: DONO, hoje: '2024-04-05' }).u, a, 'o mesmo dia nao e processado duas vezes');
});

test('IA: tres temporadas, todos os clubes, mercado ativo e sem violar nenhum invariante', () => {
  let u = criarUniverso('2024-04-02');
  const ids = u.teams.map(t => t.id);
  const caixaInicial = somaCaixa(u);
  let hoje = '2024-04-02';
  let concluidasPorAno: Record<string, number> = {};
  for (let d = 0; d <= 365 * 3; d++) {
    hoje = mover('2024-04-02', d);
    // o resto do motor do jogo: contratos, base Sub-20 (quem faz 21 anos vira agente livre)
    const c = processarContratos(u.players, hoje, 'NINGUEM');
    const b = processarBase(garantirBase(u.base, ids, hoje), hoje);
    const saidas = b.saidas.map(j => ({ ...j, teamId: 'MARKET', livreDesde: hoje }));
    u = { ...u, players: saidas.length ? [...c.jogadores, ...saidas] : c.jogadores, base: b.base };
    if (hoje.slice(5) === '01-01' || hoje.slice(5) === '07-01') u = { ...u, players: recalcularValores(u.players, hoje) };
    const antes = u.mercado.negociacoes.filter(n => n.estado === 'CONCLUIDA').length;
    u = tickDoDia(u, { donoId: 'NINGUEM', hoje }).u;
    const depois = u.mercado.negociacoes.filter(n => n.estado === 'CONCLUIDA').length;
    concluidasPorAno[hoje.slice(0, 4)] = (concluidasPorAno[hoje.slice(0, 4)] || 0) + (depois - antes);
    if (d % 45 === 0) {
      invariantes(u, hoje);
      assert.ok(Math.abs(somaCaixa(u) - caixaInicial) < 1, 'o dinheiro das transferencias so muda de mao: ' + (somaCaixa(u) - caixaInicial));
      u.teams.forEach(t => assert.ok(t.cash >= 0, `${t.id} ficou com saldo negativo`));
      u.teams.forEach(t => assert.ok(u.players.filter(p => p.teamId === t.id).length >= 18, `${t.id} com elenco de ${u.players.filter(p => p.teamId === t.id).length}`));
      u.teams.forEach(t => assert.ok(u.players.filter(p => p.teamId === t.id).length <= CONFIG_MERCADO.maximoElenco + 4));
      const n = u.mercado.negociacoes.length; assert.ok(n < 20000);
    }
  }
  invariantes(u, 'fim');
  const conclu = u.mercado.negociacoes.filter(n => n.estado === 'CONCLUIDA');
  const contagem: Record<string, number> = {}; u.mercado.negociacoes.forEach(n => { contagem[n.estado] = (contagem[n.estado] || 0) + 1; });
  const livres = u.mercado.transacoes.filter(t => t.natureza === 'AGENTE_LIVRE').length;
  console.log('IA 3 temporadas (20 clubes): negociacoes', u.mercado.negociacoes.length, JSON.stringify(contagem), '| transferencias concluidas por ano', JSON.stringify(concluidasPorAno), '| agentes livres contratados', livres);
  assert.ok(conclu.length >= 6, 'mercado ativo: ' + conclu.length);
  // so negociacoes validas concluem: cada uma tem os dois lancamentos e nenhuma recusada virou transferencia
  u.mercado.negociacoes.filter(n => n.estado === 'RECUSADA').forEach(n => assert.ok(!u.mercado.transacoes.some(t => t.negId === n.id)));
  // ninguem teve o dinheiro contado duas vezes
  const porNeg: Record<string, number> = {}; u.mercado.transacoes.forEach(t => { if (t.negId) porNeg[t.negId] = (porNeg[t.negId] || 0) + 1; });
  Object.values(porNeg).forEach(n => assert.equal(n, 2));
});
