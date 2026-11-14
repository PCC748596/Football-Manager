/*
O CLUBE SABE EM QUANTAS COMPETICOES JOGA (competicoesPorClube, textSim/competitions.ts), para o mercado montar o elenco para elas (CONFIG_MERCADO.ia.rotacao).
Pedido: "O clube tem que saber quantas competicoes joga pra montar um elenco forte, o melhor elenco possivel para elas".

Corre com: npx tsx --test tests/competicoes_por_clube.test.ts
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { competicoesPorClube, type Competition, type CompMatch } from '../textSim/competitions';

const jogo = (id: string, stage: string, a: string, b: string, played: boolean): CompMatch =>
  ({ id, stage, date: '2026-05-01', homeKey: a, awayKey: b, homeScore: played ? 1 : null, awayScore: played ? 0 : null, played });

test('conta as copas e continentais em que o clube esta vivo; as Series C e D nao contam', () => {
  const copa: Competition = { id: 'COPA_BR', name: 'Copa', teamKeys: ['L|1', 'L|2', 'L|3', 'L|4'], matches: [
    jogo('a', 'R1', 'L|1', 'L|2', true), jogo('b', 'R1', 'L|3', 'L|4', true),
    jogo('c', 'R2', 'L|1', 'L|3', false)   // 1 e 3 passaram; 2 e 4 cairam
  ] };
  const lib: Competition = { id: 'LIB', name: 'Libertadores', teamKeys: ['L|1', 'X|9'], matches: [] };   // ainda nao comecou: conta
  const serieC: Competition = { id: 'SERIE_C', name: 'Serie C', teamKeys: ['L|1'], matches: [] };
  const n = competicoesPorClube([copa, lib, serieC]);
  assert.equal(n['1'], 2, 'vivo na copa e na Libertadores');
  assert.equal(n['3'], 1, 'vivo na copa');
  assert.equal(n['2'] || 0, 0, 'eliminado na 1a fase: nao conta');
  assert.equal(n['9'], 1);
});

test('uma competicao acabada (com campeao) nao conta; sem copas, nada', () => {
  const acabada: Competition = { id: 'PAULISTA', name: 'Paulista', teamKeys: ['L|1'], matches: [jogo('f', 'F', 'L|1', 'L|2', true)], champion: 'L|1' };
  assert.deepEqual(competicoesPorClube([acabada]), {});
  assert.deepEqual(competicoesPorClube(null), {});
});

test('quem jogou a ultima fase e ainda nao ha fase seguinte continua vivo (o sorteio ainda nao saiu)', () => {
  const copa: Competition = { id: 'COPA_BR', name: 'Copa', teamKeys: ['L|1', 'L|2'], matches: [jogo('a', 'R1', 'L|1', 'L|2', true)] };
  const n = competicoesPorClube([copa]);
  assert.equal(n['1'], 1); assert.equal(n['2'], 1);
});
