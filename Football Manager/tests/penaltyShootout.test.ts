import test from 'node:test';
import assert from 'node:assert/strict';
import { estadoDaDisputa, proximaCobranca, ordemAutomatica, normalizarOrdem, batedorDaVez, notaDePenalti, simularDisputa, Cobranca, Lado } from '../textSim/penaltyShootout';
import { generateLeagueData } from '../textSim/dataGenerator';
import { criarRng } from '../textSim/contracts';

const kick = (lado: Lado, gol: boolean, jogadorId = 'x'): Cobranca => ({ lado, jogadorId, gol });
// Uma sequencia alternada casa/fora a partir de uma lista de resultados [casa, fora, casa, fora...].
const alternada = (res: boolean[]): Cobranca[] => res.map((g, i) => kick(i % 2 === 0 ? 'casa' : 'fora', g));

test('alterna casa/fora e o primeiro bate primeiro', () => {
  assert.equal(estadoDaDisputa([]).proximoLado, 'casa');
  assert.equal(estadoDaDisputa([], 'fora').proximoLado, 'fora');
  assert.equal(estadoDaDisputa([kick('casa', true)]).proximoLado, 'fora');
  assert.equal(estadoDaDisputa(alternada([true, true])).proximoLado, 'casa');
});

test('nas 5 primeiras acaba quando o outro ja nao alcanca', () => {
  // 3 golos da casa e 0 do fora ao fim de 3 de cada: o fora ainda tem 2 cobrancas e so chega a 2 -> casa ganha.
  const e = estadoDaDisputa(alternada([true, false, true, false, true, false]));
  assert.equal(e.terminou, true);
  assert.equal(e.vencedor, 'casa');
  // 2-0 a meio nao acaba: o fora ainda pode chegar a 3.
  assert.equal(estadoDaDisputa(alternada([true, false, true, false])).terminou, false);
  // O fora a ganhar cedo (a casa falha tudo): 0-3 depois de 3 cada, a casa tem 2 e chega a 2 -> fora ganha.
  assert.equal(estadoDaDisputa(alternada([false, true, false, true, false, true])).vencedor, 'fora');
});

test('5 cada empatados: morte subita, uma para cada lado', () => {
  const cinco = alternada([true, true, false, false, true, true, false, false, true, true]);   // 3-3
  const e = estadoDaDisputa(cinco);
  assert.equal(e.terminou, false);
  assert.equal(e.fase, 'MORTE_SUBITA');
  assert.equal(e.proximoLado, 'casa');
  // Casa marca, fora marca: continua. Casa marca, fora falha: acaba.
  assert.equal(estadoDaDisputa([...cinco, kick('casa', true), kick('fora', true)]).terminou, false);
  const fim = estadoDaDisputa([...cinco, kick('casa', true), kick('fora', false)]);
  assert.equal(fim.terminou, true); assert.equal(fim.vencedor, 'casa');
  // Casa falha, fora marca: o fora ganha (a casa ja bateu).
  assert.equal(estadoDaDisputa([...cinco, kick('casa', false), kick('fora', true)]).vencedor, 'fora');
});

test('na morte subita nao acaba a meio da ronda', () => {
  const cinco = alternada([true, true, false, false, true, true, false, false, true, true]);
  // A casa marca e o fora ainda nao bateu: nao acaba.
  const e = estadoDaDisputa([...cinco, kick('casa', true)]);
  assert.equal(e.terminou, false); assert.equal(e.proximoLado, 'fora');
});

test('quem bate: a ordem do tecnico e, acabados os batedores, volta ao primeiro', () => {
  const ordem = ['a', 'b', 'c'];
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(n => batedorDaVez(ordem, n)), ['a', 'b', 'c', 'a', 'b', 'c', 'a']);
  const cob: Cobranca[] = [];
  const ordemC = ['c1', 'c2', 'c3'], ordemF = ['f1', 'f2', 'f3'];
  const vistos: string[] = [];
  // Tudo falhado: 12 cobrancas seguidas (6 cada) sem vencedor -> repete os batedores.
  for (let i = 0; i < 12; i++) {
    const p = proximaCobranca(cob, ordemC, ordemF)!;
    assert.ok(p, 'ainda ha cobranca ' + i);
    vistos.push(p.jogadorId);
    cob.push({ lado: p.lado, jogadorId: p.jogadorId, gol: false });
  }
  assert.deepEqual(vistos, ['c1', 'f1', 'c2', 'f2', 'c3', 'f3', 'c1', 'f1', 'c2', 'f2', 'c3', 'f3']);
});

const { players, teams } = generateLeagueData('45', 'bra_serie_a') as any;
const elenco = (players as any[]).filter(p => p.teamId === teams[0].id);

test('a ordem automatica tem todos (goleiro incluido), pelos melhores batedores (Penalties + Consistency)', () => {
  const ordem = ordemAutomatica(elenco);
  assert.equal(ordem.length, elenco.length);
  assert.equal(new Set(ordem).size, elenco.length);
  assert.ok(elenco.some(p => p.position === 'GK') && ordem.includes(elenco.find(p => p.position === 'GK').id), 'o goleiro esta na lista');
  const porId = new Map(elenco.map(p => [p.id, p]));
  for (let i = 1; i < ordem.length; i++) assert.ok(notaDePenalti(porId.get(ordem[i - 1]) as any) >= notaDePenalti(porId.get(ordem[i]) as any), 'ordenado por nota');
});

test('uma ordem guardada desatualizada e corrigida', () => {
  const auto = ordemAutomatica(elenco);
  const guardada = ['nao-existe', auto[3], auto[3], auto[0]];
  const n = normalizarOrdem(guardada, elenco);
  assert.equal(n.length, elenco.length);
  assert.equal(new Set(n).size, elenco.length);
  assert.deepEqual(n.slice(0, 2), [auto[3], auto[0]], 'o que o tecnico pos mantem-se, sem repetidos nem desconhecidos');
  assert.deepEqual(normalizarOrdem(undefined, elenco), auto);
});

test('a disputa simulada acaba sempre com vencedor e respeita as regras', () => {
  const porId: Record<string, any> = {}; elenco.forEach(p => { porId[p.id] = p; });
  const ordem = ordemAutomatica(elenco);
  const gk = elenco.find(p => p.position === 'GK');
  for (let s = 0; s < 200; s++) {
    const rnd = criarRng('penaltis|' + s);
    const cob = simularDisputa(ordem, ordem, porId, gk, gk, rnd);
    const e = estadoDaDisputa(cob);
    assert.equal(e.terminou, true, 'semente ' + s);
    assert.notEqual(e.golsCasa === e.golsFora && e.cobrancasCasa === e.cobrancasFora, true, 'nao acaba empatada');
    assert.ok(cob.length >= 6 && cob.length <= 200);
    cob.forEach((c, i) => assert.equal(c.lado, i % 2 === 0 ? 'casa' : 'fora', 'alternadas'));
  }
});

// ------------------------------------------------------------------ o confronto do utilizador espera pela disputa (competitions.ts)
import { disputaPendente, vencedorDoConfronto, CompMatch, Competition } from '../textSim/competitions';

const jogo = (id: string, h: string, a: string, hs: number, as: number, extra: Partial<CompMatch> = {}): CompMatch =>
  ({ id, stage: 'Quarter-finals', tie: 'T1', leg: 1, date: '2025-05-01', homeKey: h, awayKey: a, homeScore: hs, awayScore: as, played: true, ...extra });
const comp = (matches: CompMatch[]): Competition => ({ id: 'COPA_BR', name: 'Copa', teamKeys: [], matches } as any);

test('empate no jogo unico do utilizador: fica pendente, sem sortear', () => {
  const j = jogo('m1', 'L|ME', 'L|OUTRO', 1, 1);
  const pend = disputaPendente([comp([j])], 'ME');
  assert.ok(pend); assert.equal(pend!.matchId, 'm1'); assert.equal(pend!.casaKey, 'L|ME');
  assert.equal(vencedorDoConfronto([j], new Map(), true, 'L|ME'), null);
  assert.equal(j.pens, undefined, 'nao foi sorteado');
  // Os outros clubes continuam a ser decididos (o sorteio de sempre).
  const k = jogo('m2', 'L|A', 'L|B', 0, 0);
  assert.ok(vencedorDoConfronto([k], new Map(), true, 'L|ME'));
  assert.ok(k.pens);
});

test('agregado igual em ida e volta: a disputa e no jogo da volta', () => {
  const ida = jogo('i', 'L|OUTRO', 'L|ME', 2, 1, { leg: 1 });
  const volta = jogo('v', 'L|ME', 'L|OUTRO', 1, 0, { leg: 2 });
  const pend = disputaPendente([comp([ida, volta])], 'ME');
  assert.ok(pend); assert.equal(pend!.matchId, 'v');
  assert.equal(pend!.golsCasa, 2); assert.equal(pend!.golsFora, 2);   // agregado 2-2 (o utilizador fez 1+1)
});

test('com vencedor no agregado ou com penaltis ja gravados nao ha disputa pendente', () => {
  assert.equal(disputaPendente([comp([jogo('m', 'L|ME', 'L|OUTRO', 2, 1)])], 'ME'), null);
  assert.equal(disputaPendente([comp([jogo('m', 'L|ME', 'L|OUTRO', 1, 1, { pens: [4, 3] })])], 'ME'), null);
  assert.equal(disputaPendente([comp([jogo('m', 'L|ME', 'L|OUTRO', 1, 1, { played: false, homeScore: null, awayScore: null })])], 'ME'), null);
  assert.equal(disputaPendente([comp([jogo('m', 'L|A', 'L|B', 1, 1)])], 'ME'), null, 'confronto de outros clubes nao e do utilizador');
});

import { emCampoNoFim } from '../textSim/penaltyShootout';
test('emCampoNoFim: so os 11 do fim (escalacao final do jogo, sem expulsos), nunca o plantel de 33', () => {
  const plantel = Array.from({ length: 33 }, (_, i) => ({ id: 'p-' + i, name: 'J' + i, teamId: 'T1', position: i === 0 ? 'GK' : 'CM', skill: 60, attributes: {} } as any));
  const fx: any = { id: 'f', homeTeamId: 'T1', awayTeamId: 'T2', homeLineup: plantel.slice(0, 10).map((p: any) => p.id).concat(['p-20']), redCardedHome: ['p-3'],
    events: [{ minute: 70, type: 'CARD', description: '🟥 J5', teamId: 'T1', playerId: 'p-5' }] };
  const campo = emCampoNoFim(fx, 'T1', plantel.slice(0, 11).map((p: any) => p.id), plantel).map(p => p.id);
  assert.equal(campo.length, 9);
  assert.ok(campo.includes('p-20') && campo.includes('p-0'));
  assert.ok(!campo.includes('p-3') && !campo.includes('p-5') && !campo.includes('p-10'));
  // Sem escalacao no jogo: a do time; sem nenhuma: o plantel (jogo sem dados).
  assert.equal(emCampoNoFim(undefined, 'T1', ['p-1', 'p-2'], plantel).length, 2);
  assert.equal(emCampoNoFim(undefined, 'T1', undefined, plantel).length, 33);
});

import { circulosDaDisputa } from '../textSim/penaltyShootout';
const cob = (seq: [Lado, boolean][]): Cobranca[] => seq.map(([lado, gol]) => ({ lado, jogadorId: 'x', gol }));
const alt = (res: boolean[], primeiro: Lado = 'casa'): Cobranca[] => res.map((g, i) => ({ lado: (i % 2 === 0) === (primeiro === 'casa') ? 'casa' : 'fora', jogadorId: 'x', gol: g }));
test('card: sem cobrancas, 5 cinza para cada um, rodada 1', () => {
  const c = circulosDaDisputa([], 'casa');
  assert.deepEqual(c.casa, ['cinza', 'cinza', 'cinza', 'cinza', 'cinza']);
  assert.deepEqual(c.fora, ['cinza', 'cinza', 'cinza', 'cinza', 'cinza']);
  assert.equal(c.rodada, 1); assert.equal(c.morteSubita, false);
});
test('card: preenche pela ordem de cada time, verde golo e vermelho falha', () => {
  const c = circulosDaDisputa(alt([true, false, true, true, false]), 'casa');   // casa: G G F ; fora: F G
  assert.deepEqual(c.casa, ['verde', 'verde', 'vermelho', 'cinza', 'cinza']);
  assert.deepEqual(c.fora, ['vermelho', 'verde', 'cinza', 'cinza', 'cinza']);
  assert.equal(c.golsCasa, 2); assert.equal(c.golsFora, 1);
});
test('card: primeiro = fora', () => {
  const c = circulosDaDisputa(alt([true, false, true], 'fora'), 'fora');   // fora: G G ; casa: F
  assert.deepEqual(c.fora.slice(0, 2), ['verde', 'verde']);
  assert.deepEqual(c.casa.slice(0, 1), ['vermelho']);
});
test('card: empate no fim das 5 -> reseta a cinza (rodada 2, morte subita) e recomeca', () => {
  const cinco = alt([true, true, false, false, true, true, false, false, true, true]);   // 3-3
  const c = circulosDaDisputa(cinco, 'casa');
  assert.equal(c.terminou, false);
  assert.equal(c.rodada, 2); assert.equal(c.morteSubita, true);
  assert.deepEqual(c.casa, ['cinza', 'cinza', 'cinza', 'cinza', 'cinza']);
  assert.deepEqual(c.fora, ['cinza', 'cinza', 'cinza', 'cinza', 'cinza']);
  assert.equal(c.golsCasa, 3); assert.equal(c.golsFora, 3);
  const c2 = circulosDaDisputa([...cinco, ...cob([['casa', true]])], 'casa');
  assert.deepEqual(c2.casa, ['verde', 'cinza', 'cinza', 'cinza', 'cinza']);
  assert.deepEqual(c2.fora, ['cinza', 'cinza', 'cinza', 'cinza', 'cinza']);
});
test('card: varias rodadas (rodada 3 depois de 10 empatadas de cada lado) e o fim numa rodada de morte subita', () => {
  const dez = alt(Array.from({ length: 20 }, () => true));   // 10-10
  const c = circulosDaDisputa(dez, 'casa');
  assert.equal(c.rodada, 3);
  assert.deepEqual(c.casa, ['cinza', 'cinza', 'cinza', 'cinza', 'cinza']);
  const fimMs = circulosDaDisputa([...dez, ...cob([['casa', true], ['fora', false]])], 'casa');
  assert.equal(fimMs.terminou, true); assert.equal(fimMs.vencedor, 'casa'); assert.equal(fimMs.rodada, 3);
  assert.deepEqual(fimMs.casa, ['verde', 'cinza', 'cinza', 'cinza', 'cinza']);
  assert.deepEqual(fimMs.fora, ['vermelho', 'cinza', 'cinza', 'cinza', 'cinza']);
});
test('card: decidida no fim das 5 fica a rodada cheia; decidida antes das 5 fica como esta', () => {
  const c = circulosDaDisputa(alt([true, true, true, true, true, false, true, true, true, false]), 'casa');   // casa 5, fora 3
  assert.equal(c.terminou, true); assert.equal(c.rodada, 1);
  assert.deepEqual(c.casa, ['verde', 'verde', 'verde', 'verde', 'verde']);
  assert.deepEqual(c.fora, ['verde', 'verde', 'vermelho', 'verde', 'vermelho']);
  const cedo = circulosDaDisputa(alt([true, false, true, false, true, false]), 'casa');   // 3-0 depois de 3 cada
  assert.equal(cedo.terminou, true); assert.equal(cedo.rodada, 1);
  assert.deepEqual(cedo.casa, ['verde', 'verde', 'verde', 'cinza', 'cinza']);
  assert.deepEqual(cedo.fora, ['vermelho', 'vermelho', 'vermelho', 'cinza', 'cinza']);
});
