import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIG_MGR, nivelDoOvr, nivelDoClube, posicaoAlvo, alvoDeConfianca, atualizarConfianca, faixaDeConfianca, probDemissao, Manager
} from '../textSim/managerExpectations';

const mgr = (extra: Partial<Manager> = {}): Manager => ({ id: 'm', nome: 'Tec', tatico: 70, reputation: 50, confidence: 62, clubKey: 'L|a', lowConfRounds: 0, grace: 0, ultimoJogos: 0, jaMovido: false, ...extra });

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

test('atualizarConfianca: gradual (15% do caminho por rodada)', () => {
  assert.ok(Math.abs(atualizarConfianca(60, 0) - 51) < 1e-9);
  assert.ok(Math.abs(atualizarConfianca(60, 0, 2) - 43.35) < 1e-9);
  assert.equal(atualizarConfianca(100, 100), 100);
});

test('faixaDeConfianca: limites', () => {
  const casos: [number, string][] = [[100, 'EXCELENTE'], [80, 'EXCELENTE'], [79, 'BOA'], [60, 'BOA'], [59, 'PRESSAO'], [40, 'PRESSAO'], [39, 'RISCO'], [20, 'RISCO'], [19, 'IMINENTE'], [0, 'IMINENTE']];
  for (const [c, f] of casos) assert.equal(faixaDeConfianca(c), f, 'conf ' + c);
});

test('probDemissao: protegido por carencia e por poucos jogos; so cai com confianca < 20 (ou pressao longa)', () => {
  assert.equal(probDemissao(mgr({ confidence: 5, grace: 3 }), false, 20), 0);
  assert.equal(probDemissao(mgr({ confidence: 5 }), false, 7), 0);
  assert.equal(probDemissao(mgr({ confidence: 50, lowConfRounds: 9 }), false, 20), 0);
  assert.ok(Math.abs(probDemissao(mgr({ confidence: 10 }), false, 20) - 0.25) < 1e-9);
  assert.ok(Math.abs(probDemissao(mgr({ confidence: 10 }), true, 20) - 0.375) < 1e-9);
  assert.equal(probDemissao(mgr({ confidence: 10, lowConfRounds: 9 }), false, 20), CONFIG_MGR.probTeto);
  assert.ok(Math.abs(probDemissao(mgr({ confidence: 30, lowConfRounds: 6 }), false, 20) - 0.1) < 1e-9);
});
