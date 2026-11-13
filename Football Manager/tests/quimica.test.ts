import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularQuimica, CONFIG_QUIMICA } from '../textSim/quimica';
import { FORMATIONS, Position } from '../types';

const formacao = '4-4-2' as const;
const certos = (extra: any = {}) => FORMATIONS[formacao].map((s, i) => ({ id: 'p' + String(i).padStart(2, '0'), position: s.label as Position, morale: 100, fitness: 100, ...extra })) as any[];
const sinergiaDe = (jogadores: any[], minutos: number) => {
  const m: Record<string, number> = {};
  for (let i = 0; i < jogadores.length; i++) for (let j = i + 1; j < jogadores.length; j++) { const a = jogadores[i].id, b = jogadores[j].id; m[a < b ? `${a}-${b}` : `${b}-${a}`] = minutos; }
  return m;
};

test('quimica: onze nas posicoes certas, moral e fisico no maximo, sem jogos juntos = 10 + 22 + 15 + 12', () => {
  assert.equal(calcularQuimica(certos(), formacao, undefined), 59);
});

test('quimica: 10 jogos juntos (10 x 90 min) enchem o bonus de entrosamento (+25); amistosos contam como qualquer jogo', () => {
  const t = certos();
  const jogos = (n: number) => calcularQuimica(t, formacao, sinergiaDe(t, n * CONFIG_QUIMICA.minutosPorJogo));
  assert.equal(jogos(10), 59 + 25);
  assert.equal(jogos(20), 59 + 25);                 // o teto nao passa de +25
  assert.equal(jogos(5), 59 + Math.floor(5 * 90 / (10 * 90 / 25)));   // metade do caminho: +12
  assert.ok(jogos(8) < 59 + 25);                    // 8 jogos (a regua antiga) ja nao enchem
  assert.equal(jogos(0), 59);
});

test('quimica: jogador fora do grupo da posicao desconta, goleiro trocado desconta muito', () => {
  const t = certos();
  const base = calcularQuimica(t, formacao, undefined);
  const comMeioNaDefesa = certos(); comMeioNaDefesa[1].position = Position.CM;   // slot 1 = defensor
  assert.equal(calcularQuimica(comMeioNaDefesa, formacao, undefined), base - 2 - 3);   // perde os +2 e leva -3 (meio no lugar de defesa)
  const goleiroTrocado = certos(); goleiroTrocado[0].position = Position.CB;
  assert.equal(calcularQuimica(goleiroTrocado, formacao, undefined), base - 2 - 10);
});

test('quimica: sem titulares = 0; o resultado fica entre 0 e 100', () => {
  assert.equal(calcularQuimica([], formacao, undefined), 0);
  const ruim = certos({ morale: 0, fitness: 0, position: Position.GK });
  const v = calcularQuimica(ruim, formacao, undefined);
  assert.ok(v >= 0 && v <= 100);
});
