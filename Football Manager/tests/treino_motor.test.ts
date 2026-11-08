import test from 'node:test';
import assert from 'node:assert/strict';
import { regressaoPorIdade, chanceLesao, rolouLesao, sessaoRolaLesao, exaustaoMultiplier, recoveryMultiplier, custoDoNivel, niveisDeXp, xpDeNiveis, tetoDoAtributo, folgaDeTreino, definirNivelDoCt, tetoDoCt, FOCO_CPU_POR_POSICAO, cpuAplicarTreino, atividadesDaPosicao, SLOTS_CPU_POR_DIA, cpuPlanoDoJogador, SLOTS_CPU_LEVE, ENERGY_COST_BASE, atividadesLevesDaPosicao, ACTIVITIES } from '../textSim/trainingService';
import { atributos3d, regredirPorIdade, alternarIndividual, atributosIndividuais, areaDoCampo, INDIVIDUAL_MAX, CHAVES_POR_POSICAO } from '../textSim/atributos3d';

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
  assert.equal(folgaDeTreino(profissional), 5, 'sem potencial: a folga da idade (24 anos)');
  assert.equal(folgaDeTreino({ skill: 68, age: 20 }), 9, 'aos 20 anos a folga e maior');
  const teto = tetoDoAtributo(profissional, 68);
  assert.equal(teto, 75, 'base + folga + margem');
  assert.equal(68 + niveisDeXp(68, 1e9, teto), 75, 'mesmo com XP infinito nao passa do teto');
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

test('CPU: cada posicao treina 10 atributos distintos e validos do 3D', () => {
  const validos = new Set(['ballControl','dribbling','finishing','shotPower','longShots','volleys','crossing','passing','longPassing','headAccurancy','freekicks','cornerKicks','penalties','tackleStanding','tackleSliding','manMarking','posOffense','posDefense','vision','tacticalAwa','aggression','reactions','composure','consistency','acceleration','speed','agility','jumping','strength','stamina','balance']);
  for (const [pos, lista] of Object.entries(FOCO_CPU_POR_POSICAO)) {
    assert.equal(lista.length, 10, pos + ' tem 10');
    assert.equal(new Set(lista).size, 10, pos + ' sem repetidos');
    lista.forEach(c => assert.ok(validos.has(c), pos + ': ' + c + ' e um atributo do 3D'));
  }
});

test('CPU treina pelas atividades do utilizador: XP, Energia gasta e riscos por sessao', () => {
  const p: any = { id: 'p-cpu', position: 'ST', age: 20, skill: 70, def: 60, pas: 60, drb: 60, sht: 60, energia: 100, treino3d: {}, trainingAccumulated: { def: 0, pas: 0, drb: 0, sht: 0 } };
  assert.ok(atividadesDaPosicao('ST').length > 0, 'o ST tem atividades');
  const r = cpuAplicarTreino(p, { stamina: 70, rnd: () => 0 });
  assert.equal(r.riscos.length, SLOTS_CPU_POR_DIA, 'um risco de lesao por sessao pesada');
  assert.ok(r.custoEnergia > 0, 'gastou Energia');
  assert.ok(Object.values<number>(p.treino3d).some(v => v > 0), 'ganhou XP nos atributos');
  assert.equal(p.treinoEmXp, true);
  const exausto: any = { ...p, treino3d: {}, trainingAccumulated: { def: 0, pas: 0, drb: 0, sht: 0 }, energia: 10 };
  cpuAplicarTreino(exausto, { stamina: 70, rnd: () => 0 });
  const soma = (o: any) => (Object.values(o.treino3d) as number[]).reduce((s, v) => s + v, 0);
  assert.ok(soma(exausto) < soma(p) * 0.2, 'exausta (Energia 10) rende bem menos');
  const velho: any = { ...p, age: 36, treino3d: {}, trainingAccumulated: { def: 0, pas: 0, drb: 0, sht: 0 } };
  cpuAplicarTreino(velho, { stamina: 70, rnd: () => 0 });
  assert.ok(Math.abs(soma(velho) - soma(p) / 3) < 1e-6, 'acima de 32 anos rende 0.5 (jovem 1.5): o mesmo fator do utilizador');
});

test('CPU decide por jogador pela Energia: treino, treino leve ou descanso', () => {
  assert.equal(cpuPlanoDoJogador(90, 5, false), 'treino');
  assert.equal(cpuPlanoDoJogador(70, 5, false), 'treino');
  assert.equal(cpuPlanoDoJogador(69, 5, false), 'leve');
  assert.equal(cpuPlanoDoJogador(45, 5, false), 'leve');
  assert.equal(cpuPlanoDoJogador(44, 5, false), 'descanso');
  assert.equal(cpuPlanoDoJogador(100, 1, false), 'descanso', 'vespera do jogo');
  assert.equal(cpuPlanoDoJogador(100, 0, false), 'descanso', 'dia do jogo');
  assert.equal(cpuPlanoDoJogador(100, 5, true), 'descanso', 'quem jogou ontem folga');
  const p: any = { id: 'p-leve', position: 'CM', age: 25, skill: 70, def: 60, pas: 60, drb: 60, sht: 60, energia: 60, treino3d: {}, trainingAccumulated: { def: 0, pas: 0, drb: 0, sht: 0 } };
  const r = cpuAplicarTreino(p, { stamina: 70, leve: true, rnd: () => 0 });
  assert.equal(r.riscos.length, SLOTS_CPU_LEVE, 'o treino leve e uma sessao');
  assert.ok(atividadesLevesDaPosicao('CM').every(a => (ENERGY_COST_BASE[a.id] ?? 0) <= 2), 'so atividades baratas');
});

test('grupos automaticos pela ENR: G1 >= limiar, o ultimo grupo fica com o resto', async () => {
  const { grupoPorEnergia } = await import('../textSim/trainingService');
  assert.equal(grupoPorEnergia(80, [80], 2), 0);
  assert.equal(grupoPorEnergia(79, [80], 2), 1);
  assert.equal(grupoPorEnergia(60, [80, 50], 3), 1);
  assert.equal(grupoPorEnergia(49, [80, 50], 3), 2);
  assert.equal(grupoPorEnergia(10, [80], 1), 0);   // um so grupo
});

test('treino individual: atividade da aba Tactics, -3 ENR, selecao por area (3 ou 2 no mental)', () => {
  const ind = ACTIVITIES.find(a => a.id === 'individual')!;
  assert.equal(ind.category, 'TACTICS');
  assert.equal(ENERGY_COST_BASE.individual, 3);
  assert.equal(ind.impacts.find(i => i.label === 'ENR')!.value, -3);
  assert.equal(ind.impacts.find(i => i.label === 'IND')!.value, 1);
  assert.equal(INDIVIDUAL_MAX.TEC, 3); assert.equal(INDIVIDUAL_MAX.TAC, 3); assert.equal(INDIVIDUAL_MAX.FIS, 3); assert.equal(INDIVIDUAL_MAX.MEN, 2);
  assert.equal(areaDoCampo('finishing'), 'TEC'); assert.equal(areaDoCampo('vision'), 'TAC'); assert.equal(areaDoCampo('composure'), 'MEN'); assert.equal(areaDoCampo('speed'), 'FIS');
  let sel: string[] = [];
  for (const c of ['finishing', 'passing', 'dribbling']) sel = alternarIndividual(sel, c);
  assert.deepEqual(sel, ['finishing', 'passing', 'dribbling']);
  sel = alternarIndividual(sel, 'crossing');
  assert.deepEqual(sel, ['passing', 'dribbling', 'crossing'], 'passou de 3: sai o mais antigo');
  assert.deepEqual(alternarIndividual(sel, 'passing'), ['dribbling', 'crossing'], 'clicar de novo desmarca');
  assert.deepEqual(alternarIndividual(sel, 'composure'), ['composure'], 'outra area limpa a lista');
  assert.deepEqual(alternarIndividual(alternarIndividual(['composure'], 'reactions'), 'aggression'), ['reactions', 'aggression'], 'mental: no maximo 2');
});

test('treino individual: sem marcados escolhe os atributos mais importantes da posicao (area onde estao mais fracos); com marcados usa os marcados', () => {
  const p: any = { id: 'p-ind', position: 'CM', age: 24, skill: 70, def: 60, pas: 60, drb: 60, sht: 60, treino3d: {} };
  const a = atributos3d(p);
  const auto = atributosIndividuais(p);
  assert.equal(auto.auto, true);
  const area = areaDoCampo(auto.campos[0])!;
  assert.ok(auto.campos.every(c => areaDoCampo(c) === area), 'todos da mesma area');
  assert.equal(auto.campos.length, INDIVIDUAL_MAX[area]);
  const chavesDaArea = CHAVES_POR_POSICAO.CM[area]!;
  assert.deepEqual(auto.campos, chavesDaArea.slice(0, INDIVIDUAL_MAX[area]), 'sao os atributos-chave do CM nessa area');
  const valores = Object.fromEntries([...a.detalhe!.TEC, ...a.detalhe!.TAC, ...a.detalhe!.MEN, ...a.detalhe!.FIS].map(x => [x.campo, x.valor]));
  const mediaChaves = (g: 'TEC' | 'TAC' | 'MEN' | 'FIS') => { const l = (CHAVES_POR_POSICAO.CM[g] || []).slice(0, INDIVIDUAL_MAX[g]); return l.reduce((s, c) => s + valores[c], 0) / l.length; };
  const medias = (['TEC', 'TAC', 'MEN', 'FIS'] as const).map(g => mediaChaves(g));
  assert.equal(mediaChaves(area), Math.min(...medias), 'a area escolhida e a de menor media dos atributos-chave');
  const marcado = atributosIndividuais({ ...p, treinoIndividual: ['finishing', 'passing'] });
  assert.deepEqual(marcado, { campos: ['finishing', 'passing'], auto: false });
});
