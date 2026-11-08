import test from 'node:test';
import assert from 'node:assert/strict';
import { regressaoPorIdade, chanceLesao, rolouLesao, sessaoRolaLesao, exaustaoMultiplier, recoveryMultiplier, custoDoNivel, niveisDeXp, xpDeNiveis, tetoDoAtributo, folgaDeTreino, definirNivelDoCt, tetoDoCt } from '../textSim/trainingService';
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
  for (const [campo, v] of Object.entries(t3!)) {
    const base = campos(antes).find(y => y.campo === campo)!.base!;
    assert.equal(v, xpDeNiveis(base, niveisDeXp(base, v)), 'cofre parcial zerado: ' + campo);
  }
});

test('XP: custo do nivel (50->51 300, 70->71 500, 90->91 1100) e level up a partir da base', () => {
  assert.equal(custoDoNivel(50), 300);
  assert.equal(custoDoNivel(70), 500);
  assert.equal(custoDoNivel(90), 1100);
  assert.equal(niveisDeXp(70, 499), 0);
  assert.equal(niveisDeXp(70, 500), 1);
  assert.equal(niveisDeXp(70, 500 + custoDoNivel(71) - 1), 1);
  assert.equal(niveisDeXp(70, 500 + custoDoNivel(71)), 2);
  assert.equal(niveisDeXp(60, 1e9), 15, 'teto de +15 niveis');
  assert.equal(niveisDeXp(95, 1e9), 4, 'nunca passa de 99');
  for (const n of [-3, 0, 1, 5]) assert.equal(niveisDeXp(72, xpDeNiveis(72, n)), n, 'ida e volta ' + n);
  assert.equal(niveisDeXp(72, -1), -1, 'um pedaco de nivel perdido ja conta');
});

test('teto de crescimento pelo potencial: a Serie D nao treina o OVR 68 ate 80', () => {
  const profissional = { skill: 68, age: 24 };
  assert.equal(folgaDeTreino(profissional), 2, 'sem potencial: a folga da idade (24 anos)');
  assert.equal(folgaDeTreino({ skill: 68, age: 20 }), 5, 'aos 20 anos a folga e maior');
  const teto = tetoDoAtributo(profissional, 68);
  assert.equal(teto, 72, 'base + folga + margem');
  assert.equal(68 + niveisDeXp(68, 1e9, teto), 72, 'mesmo com XP infinito nao passa do teto');
  assert.equal(tetoDoAtributo({ skill: 80, age: 30 }, 97), 97, 'acima do teto do CT fica onde esta');
  assert.equal(tetoDoAtributo({ skill: 60, age: 17, potential: 75 }, 60), 77, 'a base usa o potencial real: base + (75 - 60) + 2');
});

test('CT limita o treino: nivel 2 ate 80, 3 ate 85, 4 ate 90, 5 ate 95', () => {
  const jovem = { skill: 60, age: 17, potential: 99, teamId: 'T' };
  for (const [nivel, teto] of [[2, 80], [3, 85], [4, 90], [5, 95]] as const) {
    definirNivelDoCt(() => nivel);
    assert.equal(tetoDoCt('T'), teto);
    assert.equal(tetoDoAtributo(jovem, 60), teto, 'o CT nivel ' + nivel + ' limita a ' + teto);
  }
  definirNivelDoCt(() => 3);
});
