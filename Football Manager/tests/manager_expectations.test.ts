import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIG_MGR, nivelDoOvr, nivelDoClube, posicaoAlvo, alvoDeConfianca, atualizarConfianca, faixaDeConfianca, probDemissao, Manager
} from '../textSim/managerExpectations';

const mgr = (extra: Partial<Manager> = {}): Manager => ({ id: 'm', nome: 'Tec', tatico: 70, reputation: 50, confidence: 62, clubKey: 'L|a', lowConfRounds: 0, grace: 0, ultimoJogos: 0, baseJogos: 0, basePontos: 0, jaMovido: false, ...extra });

test('nivelDoOvr: faixas do pedido', () => {
  const casos: [number, number][] = [[49, 0], [50, 1], [59, 1], [60, 2], [69, 2], [70, 3], [79, 3], [80, 4], [89, 4], [90, 5], [100, 5]];
  for (const [ovr, nivel] of casos) assert.equal(nivelDoOvr(ovr), nivel, 'ovr ' + ovr);
});

test('nivelDoClube: a tradicao move um nivel e nunca sai de 0-5', () => {
  assert.equal(nivelDoClube(95, 1), 5);
  assert.equal(nivelDoClube(40, -1), 0);
  assert.equal(nivelDoClube(75, 1), 4);
  assert.equal(nivelDoClube(75, -1), 2);
});

test('posicaoAlvo: liga de 20 com 4 rebaixados', () => {
  const alvos = [0, 1, 2, 3, 4, 5].map(n => posicaoAlvo(n, 20, 4));
  assert.deepEqual(alvos, [16, 15, 10, 5, 3, 1]);
});

test('alvoDeConfianca: cumprir a expectativa da neutro (60); superar sobe; fracassar desce', () => {
  const neutro = alvoDeConfianca({ jogos: 25, pontos: 54, posicao: 1, n: 20, alvo: 1 });
  assert.ok(Math.abs(neutro - CONFIG_MGR.neutro) < 0.5, 'neutro ' + neutro);
  const otimo = alvoDeConfianca({ jogos: 25, pontos: 70, posicao: 1, n: 20, alvo: 10 });
  const pessimo = alvoDeConfianca({ jogos: 25, pontos: 8, posicao: 19, n: 20, alvo: 5 });
  assert.ok(otimo > 85, 'otimo ' + otimo);
  assert.ok(pessimo < 20, 'pessimo ' + pessimo);
});

test('atualizarConfianca: gradual (10% do caminho por rodada)', () => {
  assert.ok(Math.abs(atualizarConfianca(60, 0) - 54) < 1e-9);
  assert.ok(Math.abs(atualizarConfianca(60, 0, 2) - 48.6) < 1e-9);
  assert.equal(atualizarConfianca(100, 100), 100);
});

test('faixaDeConfianca: limites', () => {
  const casos: [number, string][] = [[100, 'EXCELENTE'], [80, 'EXCELENTE'], [79, 'BOA'], [60, 'BOA'], [59, 'PRESSAO'], [40, 'PRESSAO'], [39, 'RISCO'], [20, 'RISCO'], [19, 'IMINENTE'], [0, 'IMINENTE']];
  for (const [c, f] of casos) assert.equal(faixaDeConfianca(c), f, 'conf ' + c);
});

test('probDemissao: protegido por carencia e por poucos jogos; so cai com confianca < 20 (ou pressao longa)', () => {
  assert.equal(probDemissao(mgr({ confidence: 5, grace: 3 }), false, 20), 0);
  assert.equal(probDemissao(mgr({ confidence: 5 }), false, 9), 0);
  assert.equal(probDemissao(mgr({ confidence: 50, lowConfRounds: 9 }), false, 20), 0);
  assert.ok(Math.abs(probDemissao(mgr({ confidence: 10 }), false, 20) - 0.25) < 1e-9);
  assert.ok(Math.abs(probDemissao(mgr({ confidence: 10 }), true, 20) - 0.375) < 1e-9);
  assert.equal(probDemissao(mgr({ confidence: 10, lowConfRounds: 9 }), false, 20), CONFIG_MGR.probTeto);
  assert.ok(Math.abs(probDemissao(mgr({ confidence: 30, lowConfRounds: 6 }), false, 20) - 0.1) < 1e-9);
});

import { semearTreinadores, processarRodada, LigaSnap, USUARIO_ID } from '../textSim/managerExpectations';

// Todos os clubes de teste tem a mesma torcida e fundacao: a tradicao nao muda nenhum nivel (ajuste 0).
const time = (id: string, strength: number, leagueId = 'L1') => ({ id, name: 'Clube ' + id, leagueId, strength, managerName: 'Tec ' + id, managerTactics: 70, fanBase: 10, foundedYear: 1950 }) as any;
const key = (id: string, leagueId = 'L1') => leagueId + '|' + id;
const snap = (times: any[], pontos: Record<string, number>, jogos: number, extra: Partial<LigaSnap> = {}): LigaSnap => ({
  leagueId: 'L1', tier: 1, promovidos: 1, rebaixados: 2, times, encerrada: false, ...extra,
  tabela: times.map(t => ({ team: t, played: jogos, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: pontos[t.id] ?? 0 })).sort((a, b) => b.points - a.points)
});
const seis = () => [time('A', 90), time('B', 90), time('C', 70), time('D', 60), time('E', 50), time('F', 50)];
const todosTemTreinador = (estado: any, times: any[]) => times.every(t => Object.values<any>(estado.managers).filter(m => m.clubKey === key(t.id)).length === 1);

test('semear: um treinador por clube (o do utilizador no clube dele), reputacao segue o nivel e ha pool de livres', () => {
  const times = [time('A', 85), time('Z', 45)];
  const estado = semearTreinadores([snap(times, {}, 0)], { clubKey: key('A'), nome: 'Eu' });
  assert.equal(estado.managers[USUARIO_ID].clubKey, key('A'));
  assert.equal(estado.managers[USUARIO_ID].nome, 'Eu');
  assert.equal(estado.managers['m|' + key('Z')].nome, 'Tec Z');
  assert.ok(estado.managers[USUARIO_ID].reputation > estado.managers['m|' + key('Z')].reputation);
  assert.ok(Object.values(estado.managers).filter(m => !m.clubKey).length >= 30);
  assert.ok(todosTemTreinador(estado, times));
});

test('processarRodada: treinador fracassado cai (com carencia e reposicao), sem sobrar clube vazio', () => {
  const times = seis();
  let estado = semearTreinadores([snap(times, {}, 0)]);
  const velho = estado.managers['m|' + key('A')];
  let demitido = false, contratou = false;
  for (let k = 3; k <= 40; k++) {
    const pontos: Record<string, number> = { A: 0, B: 3 * k, C: 2 * k, D: 2 * k, E: k, F: k };   // A, o favorito, em ultimo
    const r = processarRodada(estado, [snap(times, pontos, k)]);
    estado = r.estado;
    if (r.eventos.some(e => e.tipo === 'DEMISSAO' && e.clubKey === key('A'))) demitido = true;
    if (r.eventos.some(e => e.tipo === 'CONTRATACAO' && e.clubKey === key('A'))) contratou = true;
    assert.ok(todosTemTreinador(estado, times), 'rodada ' + k);
    if (demitido) break;
  }
  assert.ok(demitido && contratou, 'o clube A deveria demitir e contratar');
  const novo = Object.values(estado.managers).find(m => m.clubKey === key('A'))!;
  assert.notEqual(novo.id, velho.id);
  assert.equal(estado.managers[velho.id].clubKey, null);
  assert.equal(novo.grace, CONFIG_MGR.carencia);
});

test('processarRodada: quem cumpre a expectativa nunca e demitido e a confianca sobe', () => {
  const times = seis();
  let estado = semearTreinadores([snap(times, {}, 0)]);
  for (let k = 3; k <= 38; k++) {
    const r = processarRodada(estado, [snap(times, { A: 3 * k, B: 2 * k, C: 2 * k, D: k, E: k, F: 0 }, k)]);
    estado = r.estado;
    assert.ok(!r.eventos.some(e => e.tipo === 'DEMISSAO' && e.clubKey === key('A')), 'rodada ' + k);
  }
  assert.ok(estado.managers['m|' + key('A')].confidence > 75, 'converge para ~80 (posicao-alvo cumprida, aproveitamento acima do esperado)');
});

test('processarRodada: idempotente (mesmos jogos, nada muda)', () => {
  const times = seis();
  const estado0 = semearTreinadores([snap(times, {}, 0)]);
  const s = snap(times, { A: 20, B: 18, C: 15, D: 10, E: 5, F: 2 }, 10);
  const a = processarRodada(estado0, [s]);
  const b = processarRodada(a.estado, [s]);
  assert.deepEqual(b.estado, a.estado);
  assert.equal(b.eventos.length, 0);
});

test('processarRodada: o utilizador em crise e avisado (faixa) e, se cair, recomeca com carencia sem perder o clube', () => {
  const times = seis();
  let estado = semearTreinadores([snap(times, {}, 0)], { clubKey: key('A'), nome: 'Eu' });
  let faixas = 0, demissoes = 0;
  for (let k = 3; k <= 40 && !demissoes; k++) {
    const r = processarRodada(estado, [snap(times, { A: 0, B: 3 * k, C: 2 * k, D: 2 * k, E: k, F: k }, k)]);
    estado = r.estado;
    faixas += r.eventos.filter(e => e.tipo === 'FAIXA' && e.usuario).length;
    demissoes += r.eventos.filter(e => e.tipo === 'DEMISSAO' && e.usuario).length;
  }
  assert.ok(faixas >= 1, 'avisos de faixa');
  assert.equal(demissoes, 1);
  const eu = estado.managers[USUARIO_ID];
  assert.equal(eu.clubKey, key('A'));
  assert.equal(eu.grace, CONFIG_MGR.carenciaUsuario);
  assert.equal(eu.confidence, CONFIG_MGR.confUsuarioAposDemissao);
});

import { fecharTemporadas, atualizarTreinadores, aplicarTreinadores } from '../textSim/managerExpectations';

const fechada = (times: any[], pontos: Record<string, number>) => snap(times, pontos, 10, { encerrada: true });

test('fecharTemporadas: campeao ganha reputacao, ultimo (rebaixado) perde; fecha a liga uma vez so', () => {
  const times = seis();
  const estado0 = semearTreinadores([snap(times, {}, 0)]);
  const s = fechada(times, { A: 28, B: 20, C: 18, D: 12, E: 6, F: 2 });
  const r = fecharTemporadas(estado0, [s], '2024-12-08');
  assert.ok(r.estado.managers['m|' + key('A')].reputation > estado0.managers['m|' + key('A')].reputation);
  assert.ok(r.estado.managers['m|' + key('F')].reputation < estado0.managers['m|' + key('F')].reputation);
  assert.deepEqual(r.estado.fechadas, ['L1']);
  assert.ok(todosTemTreinador(r.estado, times));
  const de_novo = fecharTemporadas(r.estado, [s], '2024-12-09');
  assert.deepEqual(de_novo.estado, r.estado);
  assert.equal(de_novo.eventos.length, 0);
});

test('fecharTemporadas: clube grande com treinador fraco convida o treinador forte de um clube menor', () => {
  const times = [time('K', 85), time('W', 60), time('X', 60), time('Y', 55), time('Z', 50), time('V', 50)];
  const estado0 = semearTreinadores([snap(times, {}, 0)]);
  const ajustar = (id: string, extra: any) => { estado0.managers[id] = { ...estado0.managers[id], ...extra }; };
  ajustar('m|' + key('K'), { reputation: 30, confidence: 30, grace: 99 });   // grace: nao e demitido, mas o clube quer outro
  ajustar('m|' + key('W'), { reputation: 90 });
  const r = fecharTemporadas(estado0, [fechada(times, { K: 2, W: 16, X: 20, Y: 14, Z: 8, V: 6 })], '2024-12-08');
  const novo = r.estado.managers['m|' + key('W')];
  assert.equal(novo.clubKey, key('K'));
  assert.ok(novo.jaMovido);
  const ev = r.eventos.find(e => e.tipo === 'TRANSFERENCIA')!;
  assert.equal(ev.clubKey, key('K'));
  assert.equal(ev.de, key('W'));
  assert.ok(todosTemTreinador(r.estado, times));
});

test('fecharTemporadas: se o convidado e o utilizador, vira oferta pendente e ele nao sai do clube', () => {
  const times = [time('K', 85), time('W', 60), time('X', 60), time('Y', 55), time('Z', 50), time('V', 50)];
  const estado0 = semearTreinadores([snap(times, {}, 0)], { clubKey: key('W'), nome: 'Eu' });
  estado0.managers['m|' + key('K')] = { ...estado0.managers['m|' + key('K')], reputation: 30, confidence: 30, grace: 99 };
  estado0.managers[USUARIO_ID] = { ...estado0.managers[USUARIO_ID], reputation: 90 };
  const r = fecharTemporadas(estado0, [fechada(times, { K: 2, W: 16, X: 20, Y: 14, Z: 8, V: 6 })], '2024-12-08');
  assert.equal(r.estado.ofertas.length, 1);
  assert.equal(r.estado.ofertas[0].clubKey, key('K'));
  assert.equal(r.estado.managers[USUARIO_ID].clubKey, key('W'));
  assert.ok(r.eventos.some(e => e.tipo === 'OFERTA' && e.usuario));
  assert.ok(!r.eventos.some(e => e.tipo === 'TRANSFERENCIA'));
});

test('atualizarTreinadores: sem novidade devolve o mesmo estado (o efeito do jogo nao entra em loop)', () => {
  const times = seis();
  const s = snap(times, { A: 20, B: 18, C: 15, D: 10, E: 5, F: 2 }, 10);
  const a = atualizarTreinadores(semearTreinadores([snap(times, {}, 0)]), [s], '2024-06-01');
  assert.ok(a.mudou);
  const b = atualizarTreinadores(a.estado, [s], '2024-06-02');
  assert.equal(b.mudou, false);
  assert.equal(b.estado, a.estado);
});

test('aplicarTreinadores: copia nome e conhecimento tatico para os clubes; sem mudanca devolve o mesmo array', () => {
  const times = seis();
  const estado = semearTreinadores([snap(times, {}, 0)]);
  assert.equal(aplicarTreinadores(times, estado), times);
  estado.managers['m|' + key('A')] = { ...estado.managers['m|' + key('A')], nome: 'Novo Tec', tatico: 99 };
  const out = aplicarTreinadores(times, estado);
  assert.notEqual(out, times);
  assert.equal(out[0].managerName, 'Novo Tec');
  assert.equal(out[0].managerTactics, 99);
  assert.equal(out[1], times[1]);
});

test('aplicarTreinadores: nao troca o treinador do clube do utilizador (o nome dele vive em gameState.managerName)', () => {
  const times = seis();
  const estado = semearTreinadores([snap(times, {}, 0)], { clubKey: key('A'), nome: 'Eu' });
  assert.equal(aplicarTreinadores(times, estado), times);
});

import { expectativaPorFases } from '../textSim/managerExpectations';

test('expectativaPorFases (Serie D): a posicao do OVR entre os 96 da a fase, a tradicao move uma', () => {
  const times = Array.from({ length: 96 }, (_, i) => ({ id: 't' + i, name: 'Clube ' + i, strength: 70 - i * 0.1, fanBase: 10, foundedYear: 1950 }) as any);
  const fase = (i: number) => expectativaPorFases(times, times[i]).fase;
  assert.equal(fase(0), 5);    // 1o: titulo
  assert.equal(fase(2), 5);
  assert.equal(fase(3), 4);    // 4o a 8o: semifinal
  assert.equal(fase(7), 4);
  assert.equal(fase(8), 3);    // 9o a 16o: quartas
  assert.equal(fase(16), 2);   // 17o a 32o: oitavas
  assert.equal(fase(40), 1);   // 33o a 64o: terceira fase
  assert.equal(fase(90), 0);   // resto: passar dos grupos
});
