import test from 'node:test';
import assert from 'node:assert/strict';
import { faixaDeContrato, sortearDuracao, novoContrato, contratoInicial, estadoDoContrato, mesesRestantes, somarMeses, somarAnos, idadeEm, criarRng } from '../textSim/contracts';
import { garantirBase, processarBase, promoverJovem, estrelasDePotencial, TAMANHO_BASE } from '../textSim/youth';
import { calcularSkill } from '../textSim/overall';
import { Position } from '../types';

const CLUBES = Array.from({ length: 40 }, (_, i) => 'T' + i);
const ATTRS = ['def', 'pas', 'drb', 'sht'] as const;

// ------------------------------------------------------------------ contratos
test('faixas de duracao por idade na assinatura', () => {
  for (const [idade, min, max] of [[15, 4, 6], [25, 4, 6], [26, 3, 5], [29, 3, 5], [30, 2, 3], [35, 2, 3], [36, 1, 2], [41, 1, 2]] as const) {
    assert.deepEqual(faixaDeContrato(idade), [min, max], 'idade ' + idade);
    const vistos = new Set<number>();
    const rnd = criarRng('faixa' + idade);
    for (let i = 0; i < 3000; i++) { const d = sortearDuracao(idade, rnd); assert.ok(d >= min && d <= max && Number.isInteger(d)); vistos.add(d); }
    assert.equal(vistos.size, max - min + 1, 'todos os inteiros da faixa saem (idade ' + idade + ')');
  }
});

test('o contrato fica fixo: a idade e a da assinatura e nada o altera depois', () => {
  const c = novoContrato(24, '2024-04-01', criarRng('x'));
  assert.equal(c.start, '2024-04-01');
  assert.equal(c.end, somarAnos('2024-04-01', c.years));
  const copia = JSON.stringify(c);
  estadoDoContrato(c, '2030-01-01'); mesesRestantes(c.end, '2025-01-01');
  assert.equal(JSON.stringify(c), copia);
});

test('estados: regular > 12 meses, atencao <= 12, critico <= 6, vencido no dia do fim', () => {
  const c = { start: '2020-01-15', end: '2026-01-15', years: 6 };
  assert.equal(estadoDoContrato(c, '2024-12-15'), 'REGULAR');     // 13 meses
  assert.equal(estadoDoContrato(c, '2025-01-15'), 'ATENCAO');     // exatamente 12 meses
  assert.equal(estadoDoContrato(c, '2025-07-14'), 'ATENCAO');     // 6 meses e 1 dia
  assert.equal(estadoDoContrato(c, '2025-07-15'), 'CRITICO');     // exatamente 6 meses
  assert.equal(estadoDoContrato(c, '2026-01-14'), 'CRITICO');
  assert.equal(estadoDoContrato(c, '2026-01-15'), 'VENCIDO');
  assert.equal(estadoDoContrato(c, '2027-01-01'), 'VENCIDO');
  assert.equal(mesesRestantes(c.end, '2025-07-15'), 6);
  assert.equal(mesesRestantes(c.end, '2025-07-16'), 5);
});

test('datas: fim de mes e ano bissexto', () => {
  assert.equal(somarMeses('2024-01-31', 1), '2024-02-29');
  assert.equal(somarAnos('2024-02-29', 1), '2025-02-28');
  assert.equal(idadeEm('2005-03-10', '2024-03-09'), 18);
  assert.equal(idadeEm('2005-03-10', '2024-03-10'), 19);
});

test('contratos iniciais: coerentes com as faixas e ainda em vigor', () => {
  const rnd = criarRng('ini');
  for (let i = 0; i < 2000; i++) {
    const idade = 17 + (i % 22), c = contratoInicial(idade, '2024-04-01', rnd);
    assert.ok(c.start <= '2024-04-01' && c.end > '2024-04-01', 'em vigor');
    assert.ok(c.years >= 1 && c.years <= 6);
    assert.equal(c.end, somarAnos(c.start, c.years));
  }
});

// ------------------------------------------------------------------ base Sub-20
const validaBase = (b: ReturnType<typeof garantirBase>, hoje: string, ids: string[] = CLUBES) => {
  const todosIds = new Set<string>();
  for (const id of ids) {
    const j = b.jogadores.filter(p => p.teamId === id);
    // A relacao so muda em 1/1 e 1/6: entre as janelas, os jogadores + as vagas abertas = 20, e quem fez 21 anos espera a proxima janela.
    assert.equal(j.length + ((b as any).vagas?.[id] || 0), TAMANHO_BASE, `${id} tem ${j.length}`);
    j.forEach(p => {
      assert.ok(p.age >= 15 && p.age <= 21, `idade ${p.age}`);
      assert.equal(idadeEm(p.birthDate!, hoje), p.age, 'idade = nascimento');
      assert.ok(!todosIds.has(p.id), 'id unico ' + p.id); todosIds.add(p.id);
      ATTRS.forEach(a => assert.ok(p[a] >= 50 && p[a] <= 99, `${a}=${p[a]}`));
      assert.ok(p.skill >= 50 && p.skill <= 99);
      assert.equal(p.skill, calcularSkill(p.position, p.def, p.pas, p.drb, p.sht), 'overall = formula');
      assert.ok(p.potential! >= 50 && p.potential! <= 99 && p.potential! >= p.skill, `pot ${p.potential} ovr ${p.skill}`);
      assert.ok(p.potentialEstimate! >= 50 && p.potentialEstimate! <= 99);
      assert.ok(p.contract && p.contract.end > hoje);
    });
    const pos = new Set(j.map(p => p.position));
    assert.ok(pos.has(Position.GK) && pos.has(Position.CB) && pos.has(Position.LB) && pos.has(Position.RB) && pos.has(Position.CM) && pos.has(Position.ST), 'todas as linhas');
    assert.equal(new Set(j.map(p => p.shirtNumber)).size, j.length, 'camisas distintas');
  }
  const vagasTotal = ids.reduce((s, id) => s + (((b as any).vagas || {})[id] || 0), 0);
  assert.equal(b.jogadores.length + vagasTotal, ids.length * TAMANHO_BASE, 'ninguem sobrando nem repetido');
};

test('cada clube nasce com 20 jovens de 15 a 20 anos, atributos 50-99, potencial >= overall', () => {
  const b = garantirBase(null, CLUBES, '2024-04-01');
  validaBase(b, '2024-04-01');
  b.jogadores.forEach(p => assert.ok(p.contract!.years >= 4 && p.contract!.years <= 6));
  assert.equal(garantirBase(b, CLUBES, '2024-04-01'), b, 'garantir de novo nao muda nada (mesma referencia)');
});

test('estrelas: 50-54=1, 55-64=2, 65-74=3, 75-84=4, 85-99=5', () => {
  for (const [v, s] of [[50, 1], [54, 1], [55, 2], [64, 2], [65, 3], [74, 3], [75, 4], [84, 4], [85, 5], [99, 5]] as const) assert.equal(estrelasDePotencial(v), s, 'potencial ' + v);
});

test('distribuicao de potencial e de posicoes razoavel', () => {
  const b = garantirBase(null, CLUBES, '2024-04-01');
  const por = [0, 0, 0, 0, 0, 0];
  b.jogadores.forEach(p => por[estrelasDePotencial(p.potential!)]++);
  const n = b.jogadores.length;
  console.log('estrelas (1..5):', por.slice(1).map(x => (100 * x / n).toFixed(1) + '%').join(' '));
  assert.ok(por[5] / n > 0.02 && por[5] / n < 0.15, '5 estrelas: ' + (por[5] / n));
  assert.ok(por[1] / n < 0.25 && por[3] / n > 0.2, 'piramide');
  const gk = b.jogadores.filter(p => p.position === Position.GK).length / n;
  assert.ok(Math.abs(gk - 0.1) < 0.02, 'goleiros ~10%: ' + gk);
});

test('evolucao mensal: uma vez por mes, mesmo com chamadas repetidas', () => {
  const b = garantirBase(null, CLUBES, '2024-04-01');
  const r1 = processarBase(b, '2024-05-01').base;
  assert.equal(r1.mesProcessado, '2024-05');
  const mesmoMes = processarBase(r1, '2024-05-20').base;   // so as idades podem mudar (aniversarios); o mes nao e processado de novo
  assert.equal(mesmoMes.mesProcessado, '2024-05');
  const porId = new Map(r1.jogadores.map(p => [p.id, p]));
  mesmoMes.jogadores.filter(p => porId.has(p.id)).forEach(p => { const q = porId.get(p.id)!; assert.deepEqual([p.def, p.pas, p.drb, p.sht, p.skill], [q.def, q.pas, q.drb, q.sht, q.skill], 'atributos iguais (' + p.id + ')'); });
  mesmoMes.jogadores.filter(p => porId.has(p.id)).forEach(p => assert.equal(mesmoMes.relatorios[p.id].length, r1.relatorios[p.id].length, 'nenhum relatorio novo'));
  assert.equal(processarBase(r1, '2024-05-01').base, r1, 'mesma data: a mesma base');
  const outra = processarBase(b, '2024-05-31').base;     // recarregar e processar de novo da o mesmo
  const mapaR1 = new Map(r1.jogadores.map(p => [p.id, p]));
  outra.jogadores.filter(p => mapaR1.has(p.id) && Number(p.id.slice(2)) <= 9000800).forEach(p => { const q = mapaR1.get(p.id)!; assert.deepEqual([p.def, p.pas, p.drb, p.sht], [q.def, q.pas, q.drb, q.sht], 'deterministico ' + p.id); });
  const salto = processarBase(b, '2024-09-10').base;    // saltar varios meses processa cada um uma vez
  assert.equal(salto.mesProcessado, '2024-09');
  assert.equal(salto.relatorios[salto.jogadores[0].id].length, 5);
});

test('relatorios refletem as mudancas reais', () => {
  let b = garantirBase(null, ['A'], '2024-04-01');
  let comMudanca = 0, parados = 0, total = 0;
  for (const mes of ['2024-05-01', '2024-06-01', '2024-07-01', '2024-08-01', '2024-09-01', '2024-10-01']) {
    const antes = new Map(b.jogadores.map(p => [p.id, p]));
    b = processarBase(b, mes).base;
    for (const p of b.jogadores) {
      const rel = b.relatorios[p.id].slice(-1)[0], velho = antes.get(p.id)!;
      assert.equal(rel.ovrAntes, velho.skill); assert.equal(rel.ovrDepois, p.skill); assert.equal(rel.delta, p.skill - velho.skill);
      for (const m of rel.mudancas) { assert.equal(m.de, velho[m.attr]); assert.equal(m.para, p[m.attr]); assert.notEqual(m.de, m.para); }
      assert.equal(rel.mudancas.length > 0, ATTRS.some(a => p[a] !== velho[a]), 'o relatorio lista so o que mudou');
      assert.ok(p.skill <= p.potential!, 'overall nunca passa do potencial');
      total++; if (rel.delta === 0) parados++; if (rel.mudancas.length) comMudanca++;
    }
  }
  console.log('meses sem mudanca de overall:', (100 * parados / total).toFixed(0) + '%', '| com algum atributo mudado:', (100 * comMudanca / total).toFixed(0) + '%');
  assert.ok(parados > 0 && parados < total, 'ha meses sem mudanca de overall, mas nem todos');
  assert.ok(comMudanca > 0);
});

test('calibracao: varias temporadas, sem saltos irreais', () => {
  let b = garantirBase(null, CLUBES.slice(0, 10), '2024-04-01');
  const inicio = new Map(b.jogadores.map(p => [p.id, p]));
  let maxSalto = 0;
  for (let m = 1; m <= 48; m++) {
    const antes = new Map(b.jogadores.map(p => [p.id, p.skill]));
    b = processarBase(b, somarMeses('2024-04-01', m)).base;
    b.jogadores.forEach(p => { if (antes.has(p.id)) maxSalto = Math.max(maxSalto, Math.abs(p.skill - antes.get(p.id)!)); });
  }
  assert.ok(maxSalto <= 4, 'salto mensal maximo de overall: ' + maxSalto);
  const ficaram = b.jogadores.filter(p => inicio.has(p.id));
  let soma = 0;
  ficaram.forEach(p => { soma += p.skill - inicio.get(p.id)!.skill; assert.ok(p.skill <= p.potential!); });
  const medio = soma / Math.max(1, ficaram.length);
  assert.ok(ficaram.length > 0 && medio > 1 && medio < 14, 'ganho medio: ' + medio);
  // mais novos fecham mais do hiato ate o potencial no primeiro ano
  const b2 = garantirBase(null, CLUBES, '2024-04-01');
  const ini2 = new Map(b2.jogadores.map(p => [p.id, p]));
  const fim2 = processarBase(b2, '2025-03-01').base;
  const g: Record<number, number[]> = {};
  fim2.jogadores.filter(p => ini2.has(p.id)).forEach(p => { const a = ini2.get(p.id)!; (g[a.age] ||= []).push((p.skill - a.skill) / Math.max(1, a.potential! - a.skill)); });
  const med = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  console.log('ganho medio de overall (jovens que ficaram 4 anos):', medio.toFixed(2), '| salto max/mes:', maxSalto, '| hiato fechado em 11 meses: 15a', med(g[15]).toFixed(3), '20a', med(g[20]).toFixed(3));
  assert.ok(med(g[15]) > med(g[20]), 'quem tem 15 anos fecha mais do hiato que quem tem 20');
});

test('21 anos: saem sem promocao automatica e a vaga e reposta uma vez (3 temporadas)', () => {
  const ids = CLUBES.slice(0, 5);
  let b = garantirBase(null, ids, '2024-04-01');
  let saiu = 0, data = '2024-04-01';
  const saidas: string[] = [];
  for (let d = 1; d <= 365 * 3; d++) {
    data = new Date(Date.UTC(2024, 3, 1 + d, 12)).toISOString().slice(0, 10);
    const r = processarBase(b, data);
    b = r.base; saiu += r.saidas.length; r.saidas.forEach(p => { assert.ok(p.age >= 21); saidas.push(p.id); });
    if (d % 97 === 0) validaBase(b, data, ids);
  }
  validaBase(b, data, ids);
  assert.ok(saiu > 0);
  assert.equal(new Set(saidas).size, saidas.length, 'ninguem sai duas vezes');
  saidas.forEach(id => assert.ok(!b.jogadores.some(p => p.id === id), 'quem saiu nao esta na base'));
  assert.equal(b.proximoId - 9000001, ids.length * TAMANHO_BASE + saiu, 'uma reposicao por vaga');
  console.log('saidas por idade em 3 anos (5 clubes):', saiu);
});

test('promocao: preserva o jogador e a vaga so e reposta na janela (1/1 ou 1/6)', () => {
  let b = garantirBase(null, ['A', 'B'], '2024-04-01');
  b = processarBase(b, '2024-08-15').base;
  const alvo = b.jogadores.find(p => p.teamId === 'A' && p.position === Position.ST)!;
  const copia = JSON.stringify(alvo);
  const r = promoverJovem(b, alvo.id, '2024-08-15')!;
  assert.equal(JSON.stringify(r.jogador), copia, 'o jogador sai igual (id, atributos, potencial, contrato)');
  assert.equal(r.base.jogadores.filter(p => p.teamId === 'A').length, 19, 'a vaga fica aberta ate a proxima janela');
  assert.equal(r.base.vagas!['A'], 1);
  assert.equal(r.base.jogadores.filter(p => p.teamId === 'B').length, 20);
  assert.ok(!r.base.jogadores.some(p => p.id === alvo.id), 'nao ficou na base');
  assert.equal(new Set(r.base.jogadores.map(p => p.id)).size, 39);
  const naJanela = processarBase(r.base, '2025-01-02').base;   // 1/1: a vaga e reposta
  assert.equal(naJanela.jogadores.filter(p => p.teamId === 'A').length, 20);
  assert.ok(naJanela.jogadores.filter(p => p.teamId === 'A').some(p => p.position === Position.ST), 'a reposicao ocupa a posicao que falta');
  assert.equal(promoverJovem(r.base, alvo.id, '2024-08-15'), null, 'nao promove duas vezes');
  const b2 = processarBase(b, '2025-02-01').base;   // nada e promovido sozinho
  assert.equal(b2.jogadores.filter(p => p.teamId === 'A').length, 20);
});

test('clube novo no meio do jogo ganha a sua base', () => {
  let b = garantirBase(null, ['A'], '2024-04-01');
  b = processarBase(b, '2024-09-01').base;
  b = garantirBase(b, ['A', 'NOVO'], '2024-09-01');
  assert.equal(b.jogadores.filter(p => p.teamId === 'NOVO').length, 20);
  assert.equal(b.jogadores.filter(p => p.teamId === 'A').length, 20);
});

// ------------------------------------------------------------------ integracao com os dados reais do jogo (varias temporadas)
import { processarContratos, estadoDoContrato as estado } from '../textSim/contracts';
import { generateLeagueData } from '../textSim/dataGenerator';

test('profissionais reais: contratos iniciais, vencimento do utilizador e renovacao da CPU', () => {
  const { teams, players } = generateLeagueData('45', 'bra_serie_a') as any;
  const dono = teams[0].id;
  let hoje = '2024-04-01';
  let jog = players as any[];
  const r0 = processarContratos(jog, hoje, dono);
  jog = r0.jogadores;
  assert.ok(jog.every(p => p.contract && p.contract.end > hoje && p.contract.years >= 1 && p.contract.years <= 6), 'todos com contrato em vigor');
  assert.equal(processarContratos(jog, hoje, dono).jogadores, jog, 'nada muda sem necessidade (mesma lista)');
  const meusAntes = jog.filter(p => p.teamId === dono).length;
  const contratosAntes = new Map(jog.map(p => [p.id, JSON.stringify(p.contract)]));
  let liberados = 0, renovados = 0;
  for (let d = 1; d <= 365 * 4; d++) {
    hoje = new Date(Date.UTC(2024, 3, 1 + d, 12)).toISOString().slice(0, 10);
    const antes = jog;
    const r = processarContratos(jog, hoje, dono);
    liberados += r.liberados.length;
    r.jogadores.forEach((p, i) => {
      const a = antes[i];
      if (p.contract !== a.contract) { // so muda quando vence: contrato novo a partir de hoje, nunca retroativo
        assert.ok(hoje >= a.contract.end, 'so renova no vencimento');
        assert.equal(p.contract.start, hoje, 'nao retroativo');
        const [min, max] = faixaDeContrato(p.age); assert.ok(p.contract.years >= min && p.contract.years <= max, 'faixa da idade de hoje');
        renovados++;
      }
    });
    jog = r.jogadores;
    // quem esta no clube do utilizador nunca fica com contrato vencido
    jog.filter(p => p.teamId === dono).forEach(p => assert.ok(estado(p.contract, hoje) !== 'VENCIDO'));
  }
  assert.ok(liberados > 0 && liberados <= meusAntes, 'jogadores do utilizador ficaram livres: ' + liberados);
  assert.ok(renovados > 0, 'a CPU renovou');
  console.log('4 anos: livres do utilizador', liberados, 'de', meusAntes, '| renovacoes da CPU', renovados);
});

test('motor completo: 4 temporadas, todos os clubes, promocoes e saidas, sem duplicacoes', () => {
  const { teams, players } = generateLeagueData('45', 'bra_serie_a') as any;
  const ids: string[] = teams.map((t: any) => t.id);
  const dono = ids[0];
  let b = garantirBase(null, ids, '2024-04-01');
  let pros = (players as any[]).slice();
  let promovidos = 0, saidasUser = 0;
  let hoje = '2024-04-01';
  for (let d = 1; d <= 365 * 4; d++) {
    hoje = new Date(Date.UTC(2024, 3, 1 + d, 12)).toISOString().slice(0, 10);
    const r = processarBase(garantirBase(b, ids, hoje), hoje);
    b = r.base;
    saidasUser += r.saidas.filter(p => p.teamId === dono).length;
    pros = processarContratos(pros, hoje, dono).jogadores;
    if (d % 120 === 0) {      // o treinador promove o melhor jovem de vez em quando
      const melhor = b.jogadores.filter(p => p.teamId === dono).sort((x, y) => y.skill - x.skill)[0];
      const rp = promoverJovem(b, melhor.id, hoje)!;
      b = rp.base; pros = [...pros, rp.jogador]; promovidos++;
      assert.equal(rp.jogador.id, melhor.id); assert.equal(rp.jogador.potential, melhor.potential);
    }
    if (d % 180 === 0) {
      validaBase(b, hoje, ids);
      const todos = [...pros.map(p => p.id), ...b.jogadores.map(p => p.id)];
      assert.equal(new Set(todos).size, todos.length, 'nenhum id em duas categorias');
    }
  }
  validaBase(b, hoje, ids);
  const promovidosNoElenco = pros.filter(p => p.birthDate);
  assert.equal(promovidosNoElenco.length, promovidos);
  promovidosNoElenco.forEach(p => { assert.equal(idadeEm(p.birthDate, hoje), p.age, 'a idade do promovido acompanha o nascimento'); assert.ok(p.contract); });
  console.log('4 temporadas,', ids.length, 'clubes: promovidos', promovidos, '| saidas aos 21 do utilizador', saidasUser, '| jogadores na base', b.jogadores.length);
});

// ------------------------------------------------------------------ PlayStyle da base (a partir dos 18 anos)
import { PLAYSTYLE_POSITIONS } from '../types';
import { IDADE_ESTILO, escolherPlayStyle } from '../textSim/youth';

test('PlayStyle: so a partir dos 18, sempre um estilo que serve a posicao, e acompanha o aniversario', () => {
  let b = garantirBase(null, CLUBES.slice(0, 10), '2024-04-01');
  const confere = (hoje: string) => b.jogadores.forEach(p => {
    if (p.age < IDADE_ESTILO) assert.ok(!p.playStyle || p.playStyle === 'None', `${p.age} anos nao tem estilo`);
    else {
      assert.ok(p.playStyle && p.playStyle !== 'None', `${p.age} anos (${p.position}) precisa de estilo`);
      assert.ok(PLAYSTYLE_POSITIONS[p.playStyle!].includes(p.position), `${p.playStyle} nao serve a ${p.position}`);
    }
  });
  confere('2024-04-01');
  let trocas = 0;
  for (let d = 1; d <= 365 * 3; d += 3) {
    const hoje = new Date(Date.UTC(2024, 3, 1 + d, 12)).toISOString().slice(0, 10);
    b = processarBase(garantirBase(b, CLUBES.slice(0, 10), hoje), hoje).base;
    confere(hoje);
  }
  Object.values(b.relatorios).flat().forEach(r => { if (r.estilo) trocas++; });
  const estilos = new Set(b.jogadores.filter(p => p.age >= 18).map(p => p.playStyle));
  assert.ok(estilos.size >= 6, 'variedade de estilos: ' + estilos.size);
  console.log('estilos distintos:', estilos.size, '| ajustes de estilo nos relatorios:', trocas);
});

test('PlayStyle: coerente com os atributos (goleiro, centroavante, lateral)', () => {
  assert.equal(escolherPlayStyle(Position.GK, { def: 80, pas: 55, drb: 50, sht: 50 }), 'Defensive Goalkeeper');
  assert.equal(escolherPlayStyle(Position.GK, { def: 60, pas: 85, drb: 70, sht: 50 }), 'Offensive Goalkeeper');
  assert.equal(escolherPlayStyle(Position.ST, { def: 50, pas: 55, drb: 60, sht: 85 }), 'Goal Poacher');
  assert.equal(escolherPlayStyle(Position.RB, { def: 85, pas: 55, drb: 55, sht: 50 }), 'Defensive Full-back');
  assert.equal(escolherPlayStyle(Position.RB, { def: 55, pas: 65, drb: 85, sht: 60 }), 'Offensive Full-back');
  // histerese: o estilo atual fica se o novo ganha por pouco
  assert.equal(escolherPlayStyle(Position.ST, { def: 50, pas: 55, drb: 85, sht: 85 }, 'Fox in the Box'), 'Fox in the Box');
});

// ------------------------------------------------------------------ relacao Sub-20: janelas de 1/1 e 1/6 e uma posicao nunca fica vazia
import { podeDispensar, dispensarJovem, janelaDe } from '../textSim/youth';

test('Sub-20: a janela de atualizacao e 1/1 ou 1/6', () => {
  assert.equal(janelaDe('2025-01-01'), '2025-01-01');
  assert.equal(janelaDe('2025-05-31'), '2025-01-01');
  assert.equal(janelaDe('2025-06-01'), '2025-06-01');
  assert.equal(janelaDe('2025-12-31'), '2025-06-01');
});

test('Sub-20: todo clube tem as 11 posicoes e o unico de uma posicao nao pode ser dispensado', () => {
  const b = garantirBase(null, ['A', 'B'], '2024-04-01');
  const posicoes = [Position.GK, Position.CB, Position.LB, Position.RB, Position.DM, Position.CM, Position.AM, Position.LW, Position.RW, Position.ST, Position.SS];
  ['A', 'B'].forEach(t => posicoes.forEach(pos => assert.ok(b.jogadores.some(p => p.teamId === t && p.position === pos), `${t} sem ${pos}`)));
  const unico = b.jogadores.find(p => p.teamId === 'A' && p.position === Position.AM)!;   // o modelo tem 1 AM por clube
  assert.equal(podeDispensar(b, unico.id).ok, false);
  assert.equal(dispensarJovem(b, unico.id, '2024-04-01'), null, 'dispensar o unico da posicao e recusado');
  const varios = b.jogadores.find(p => p.teamId === 'A' && p.position === Position.CB)!;   // 3 CB
  assert.equal(podeDispensar(b, varios.id).ok, true);
  assert.ok(dispensarJovem(b, varios.id, '2024-04-01'));
});
