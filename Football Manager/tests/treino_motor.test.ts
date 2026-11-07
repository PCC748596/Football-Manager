import test from 'node:test';
import assert from 'node:assert/strict';
import { regressaoPorIdade, chanceLesao, rolouLesao, sessaoRolaLesao, exaustaoMultiplier, recoveryMultiplier, PONTOS_POR_ATRIBUTO } from '../textSim/trainingService';
import { atributos3d, regredirPorIdade } from '../textSim/atributos3d';

test('exaustao: faixas com >= (sem buracos)', () => {
  assert.equal(exaustaoMultiplier(75), 1.0);
  assert.equal(exaustaoMultiplier(74.5), 0.8);
  assert.equal(exaustaoMultiplier(50), 0.8);
  assert.equal(exaustaoMultiplier(49.5), 0.5);
  assert.equal(exaustaoMultiplier(25), 0.5);
  assert.equal(exaustaoMultiplier(24.9), 0.1);
});

test('recuperacao: Stamina 50 recupera metade da de 100', () => {
  assert.equal(recoveryMultiplier(100), 1);
  assert.equal(recoveryMultiplier(50), 0.5);
});

test('regressao por idade: tabela por faixa', () => {
  assert.deepEqual(regressaoPorIdade(29), { FIS: 0, STAMINA: 0, TEC: 0, TAC: 0, MEN: 0 });
  assert.deepEqual(regressaoPorIdade(31), { FIS: 1, STAMINA: 1, TEC: 0, TAC: 0, MEN: 0 });
  assert.deepEqual(regressaoPorIdade(33), { FIS: 3, STAMINA: 2, TEC: 1, TAC: 0, MEN: 0 });
  assert.deepEqual(regressaoPorIdade(36), { FIS: 5, STAMINA: 4, TEC: 2, TAC: 1, MEN: 1 });
});

test('lesao: 1% normal, 3% com energia < 25; rolo <= chance lesiona', () => {
  assert.equal(chanceLesao(25), 1);
  assert.equal(chanceLesao(24), 3);
  assert.equal(rolouLesao(80, 1), true);
  assert.equal(rolouLesao(80, 2), false);
  assert.equal(rolouLesao(10, 3), true);
  assert.equal(rolouLesao(10, 4), false);
});

test('lesao: Recovery, Analysis e Team Dinner nao rolam; treino pesado rola', () => {
  assert.equal(sessaoRolaLesao('recovery'), false);
  assert.equal(sessaoRolaLesao('video'), false);
  assert.equal(sessaoRolaLesao('teambuilding'), false);
  assert.equal(sessaoRolaLesao('strength'), true);
});

test('regredirPorIdade: veterano perde niveis; jovem nao muda; nunca abaixo de 50', () => {
  const base: any = { id: 'p-teste-regressao', position: 'CM', skill: 70, def: 60, pas: 60, drb: 60, sht: 60, treino3d: {} };
  assert.equal(regredirPorIdade({ ...base, age: 25 }), undefined);
  const velho = { ...base, age: 36 };
  const antes = atributos3d(velho);
  const t3 = regredirPorIdade(velho);
  assert.ok(t3, 'veterano regride');
  const depois = atributos3d({ ...velho, treino3d: t3 });
  const campos = (a: ReturnType<typeof atributos3d>) => [...a.detalhe!.TEC, ...a.detalhe!.TAC, ...a.detalhe!.MEN, ...a.detalhe!.FIS];
  for (const x of campos(depois)) {
    const ant = campos(antes).find(y => y.campo === x.campo)!;
    assert.ok(x.valor <= ant.valor, `${x.campo} nao sobe`);
    assert.ok(x.valor >= 50, `${x.campo} >= 50`);
  }
  assert.ok(campos(depois).some(x => x.valor < campos(antes).find(y => y.campo === x.campo)!.valor), 'algum atributo caiu');
  for (const v of Object.values(t3!)) assert.ok(v % PONTOS_POR_ATRIBUTO === 0, 'pontos parciais zerados');
});
