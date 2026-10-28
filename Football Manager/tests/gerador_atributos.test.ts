import test from 'node:test';
import assert from 'node:assert/strict';
import { Position, PLAYSTYLE_POSITIONS, PlayStyle } from '../types';
import {
  ATTR_MIN, ATTR_MAX, TODOS_OS_ATRIBUTOS, GRUPOS, gerarAtributos, calcularGrupos, calcularOverallPosicional, validarAtributos, normalizarAtributos, limitarAtributo,
  getCompatiblePlayingStyles, estiloCompativel, getPositionAttributeProfile, getPlayingStyleModifiers, MODIFICADORES_DO_ESTILO
} from '../textSim/geradorAtributos';

const POSICOES = Object.values(Position) as Position[];
const ESTILOS = (Object.keys(PLAYSTYLE_POSITIONS) as PlayStyle[]).filter(s => s !== 'None');
const media = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
const desvio = (v: number[]) => { const m = media(v); return Math.sqrt(media(v.map(x => (x - m) ** 2))); };

test('os 31 atributos: 13 + 7 + 4 + 7', () => {
  assert.equal(GRUPOS.TEC.length, 13); assert.equal(GRUPOS.TAC.length, 7); assert.equal(GRUPOS.MEN.length, 4); assert.equal(GRUPOS.FIS.length, 7);
  assert.equal(new Set(TODOS_OS_ATRIBUTOS).size, 31);
});

test('os 21 estilos existem, cada um com atributos prioritarios, e so servem a posicoes compativeis', () => {
  assert.equal(ESTILOS.length, 21);
  for (const s of ESTILOS) {
    assert.ok(getPlayingStyleModifiers(s).length >= 5, s);
    assert.ok(PLAYSTYLE_POSITIONS[s].length > 0, s);
    for (const pos of POSICOES) assert.equal(estiloCompativel(pos, s), PLAYSTYLE_POSITIONS[s].includes(pos));
  }
  assert.equal(Object.keys(MODIFICADORES_DO_ESTILO).length, 21);
  assert.deepEqual(getCompatiblePlayingStyles(Position.GK).sort(), ['Defensive Goalkeeper', 'Offensive Goalkeeper']);
});

test('TODAS as posicoes x TODOS os estilos compativeis x varios niveis: nada fora de 50..99, inteiros, medias coerentes', () => {
  let n = 0;
  for (const pos of POSICOES) for (const est of getCompatiblePlayingStyles(pos)) for (const nivel of [50, 58, 66, 74, 82, 90, 99]) for (let i = 0; i < 12; i++) {
    const g = gerarAtributos(pos, est, nivel, `${pos}|${est}|${nivel}|${i}`, { idade: 18 + (i * 2) });
    const v = validarAtributos(g.atributos);
    assert.ok(v.ok, `${pos} ${est} ${nivel}: ${v.erros.join(', ')}`);
    const gr = calcularGrupos(g.atributos);
    for (const k of ['TEC', 'TAC', 'MEN', 'FIS'] as const) assert.ok(gr[k] >= ATTR_MIN && gr[k] <= ATTR_MAX, k);
    assert.equal(g.estilo, est);
    n++;
  }
  assert.ok(n > 3000);
});

test('estilo incompativel com a posicao e trocado por um compativel (nunca fica silenciosamente invalido)', () => {
  const g = gerarAtributos(Position.GK, 'Goal Poacher', 70, 'x');
  assert.ok(estiloCompativel(Position.GK, g.estilo));
  const h = gerarAtributos(Position.CB, undefined, 70, 'y');
  assert.ok(estiloCompativel(Position.CB, h.estilo));
});

test('as medias TEC/TAC/MEN/FIS sao medias aritmeticas dos atributos, arredondadas so no fim', () => {
  const a: Record<string, number> = {};
  for (const k of TODOS_OS_ATRIBUTOS) a[k] = 50;
  a.ballControl = 99; a.dribbling = 51;   // 13 tecnicos: (99 + 51 + 11*50) / 13 = 54.6
  const g = calcularGrupos(a);
  assert.equal(g.TEC, Math.round((99 + 51 + 11 * 50) / 13));
  assert.equal(g.TAC, 50); assert.equal(g.MEN, 50); assert.equal(g.FIS, 50);
});

test('limites: 50 e 99 aceitos; 49 e 100 rejeitados na validacao e ajustados na geracao; vazio / texto / decimal rejeitados', () => {
  const base: Record<string, any> = {}; for (const k of TODOS_OS_ATRIBUTOS) base[k] = 70;
  assert.ok(validarAtributos({ ...base, finishing: 50 }).ok);
  assert.ok(validarAtributos({ ...base, finishing: 99 }).ok);
  assert.ok(!validarAtributos({ ...base, finishing: 49 }).ok);
  assert.ok(!validarAtributos({ ...base, finishing: 100 }).ok);
  assert.ok(!validarAtributos({ ...base, finishing: '' }).ok);
  assert.ok(!validarAtributos({ ...base, finishing: 'abc' }).ok);
  assert.ok(!validarAtributos({ ...base, finishing: 70.5 }).ok);
  assert.ok(!validarAtributos({ ...base, finishing: undefined }).ok);
  assert.equal(limitarAtributo(49), 50); assert.equal(limitarAtributo(100), 99); assert.equal(limitarAtributo(NaN), 50);
  const n = normalizarAtributos({ ...base, finishing: 10, dribbling: 130, speed: 'x' });
  assert.equal(n.finishing, 50); assert.equal(n.dribbling, 99); assert.equal(n.speed, 50);
  assert.ok(validarAtributos(n).ok);
});

test('geracao reproduzivel com a mesma semente e diferente com outra', () => {
  const a = gerarAtributos(Position.ST, 'Fox in the Box', 80, 'abc', { idade: 27 });
  const b = gerarAtributos(Position.ST, 'Fox in the Box', 80, 'abc', { idade: 27 });
  const c = gerarAtributos(Position.ST, 'Fox in the Box', 80, 'abd', { idade: 27 });
  assert.deepEqual(a.atributos, b.atributos);
  assert.notDeepEqual(a.atributos, c.atributos);
});

test('o perfil da posicao manda: centroavante finaliza mais do que marca; zagueiro marca mais do que finaliza (centenas de jogadores)', () => {
  const amostra = (pos: Position, est: PlayStyle) => Array.from({ length: 300 }, (_, i) => gerarAtributos(pos, est, 75, `${pos}${i}`, { idade: 26 }).atributos);
  const cf = amostra(Position.ST, 'Goal Poacher'), cb = amostra(Position.CB, 'Build Up');
  assert.ok(media(cf.map(a => a.finishing)) > media(cf.map(a => a.manMarking)) + 8);
  assert.ok(media(cb.map(a => a.manMarking)) > media(cb.map(a => a.finishing)) + 8);
  assert.ok(media(cb.map(a => a.headAccurancy)) > media(cb.map(a => a.dribbling)));
});

test('o estilo empurra os atributos que prioriza (Target Man: forca e cabeceio; Prolific Winger: velocidade)', () => {
  const amostra = (pos: Position, est: PlayStyle) => Array.from({ length: 400 }, (_, i) => gerarAtributos(pos, est, 75, `${est}${i}`, { idade: 26 }).atributos);
  const tm = amostra(Position.ST, 'Target Man'), fox = amostra(Position.ST, 'Fox in the Box');
  assert.ok(media(tm.map(a => a.strength)) > media(fox.map(a => a.strength)) + 2);
  assert.ok(media(tm.map(a => a.headAccurancy)) > media(fox.map(a => a.headAccurancy)) + 2);
  const pw = amostra(Position.RW, 'Prolific Winger'), cs = amostra(Position.RW, 'Cross Specialist');
  assert.ok(media(pw.map(a => a.speed)) > media(cs.map(a => a.speed)));
  assert.ok(media(cs.map(a => a.crossing)) > media(pw.map(a => a.crossing)) - 1);
});

test('o nivel-alvo e respeitado pelo overall posicional (dentro de ~3 pontos para 65..92; abaixo disso o fisico, que segue a idade, impede os posicoes fisicas de descer)', () => {
  for (const pos of POSICOES) for (const nivel of [65, 75, 85, 92]) {
    const d = Array.from({ length: 40 }, (_, i) => gerarAtributos(pos, undefined, nivel, `${pos}${nivel}${i}`, { idade: 26 }).diferenca);
    assert.ok(Math.abs(media(d)) < 3, `${pos} ${nivel}: dif media ${media(d).toFixed(2)}`);
  }
});

test('nao ha jogadores "completos": o desvio entre atributos do mesmo jogador e relevante e ha diversidade entre jogadores', () => {
  const js = Array.from({ length: 200 }, (_, i) => gerarAtributos(Position.CM, 'Orchestrator', 78, `cm${i}`, { idade: 26 }).atributos);
  const dpIntra = media(js.map(a => desvio(TODOS_OS_ATRIBUTOS.map(k => a[k]))));
  assert.ok(dpIntra > 5, `desvio dentro do jogador ${dpIntra.toFixed(1)}`);
  const dpEntre = media(['passing', 'vision', 'speed', 'finishing'].map(k => desvio(js.map(a => a[k]))));
  assert.ok(dpEntre > 3, `desvio entre jogadores ${dpEntre.toFixed(1)}`);
});

test('jogador de nivel baixo tem muitos atributos perto de 50; o de elite, concentrados entre 82 e 95', () => {
  const baixo = Array.from({ length: 200 }, (_, i) => gerarAtributos(Position.CB, 'Build Up', 52, `b${i}`, { idade: 26 }).atributos);
  const prop50 = media(baixo.map(a => TODOS_OS_ATRIBUTOS.filter(k => a[k] <= 58).length / 31));
  assert.ok(prop50 > 0.4, `proporcao <=58 em nivel baixo: ${prop50.toFixed(2)}`);
  const elite = Array.from({ length: 200 }, (_, i) => gerarAtributos(Position.ST, 'Goal Poacher', 92, `e${i}`, { idade: 26 }).atributos);
  const alto = media(elite.map(a => [...getPositionAttributeProfile(Position.ST).P1, ...getPositionAttributeProfile(Position.ST).P2].filter(k => a[k] >= 82).length / 9));
  assert.ok(alto > 0.7, `proporcao >=82 nos atributos-chave da elite: ${alto.toFixed(2)}`);
});

test('o fisico depende da idade e pouco da qualidade', () => {
  const fisDe = (nivel: number, idade: number) => media(Array.from({ length: 200 }, (_, i) => calcularGrupos(gerarAtributos(Position.CM, undefined, nivel, `f${nivel}${idade}${i}`, { idade }).atributos).FIS));
  assert.ok(Math.abs(fisDe(60, 25) - fisDe(90, 25)) < 8, 'fisico parecido num fraco e num craque');
  assert.ok(fisDe(75, 25) > fisDe(75, 35) + 8, 'o fisico cai com a idade');
  assert.ok(fisDe(75, 25) > fisDe(75, 18) + 4, 'o fisico e menor nos muito novos');
});

test('o overall posicional e separado das medias dos grupos', () => {
  const g = gerarAtributos(Position.ST, 'Fox in the Box', 80, 'sep', { idade: 26 });
  const gr = calcularGrupos(g.atributos);
  assert.notEqual(Math.round(calcularOverallPosicional(Position.ST, g.atributos)), gr.TEC + gr.TAC + gr.MEN + gr.FIS);
});
