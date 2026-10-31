import test from 'node:test';
import assert from 'node:assert';
import { avisoDoGoleiro } from '../3dMatch/avisoGoleiro';

test('goleiro do utilizador expulso (utilizador em casa, lado A): liga o aviso', () => {
  assert.strictEqual(avisoDoGoleiro({ tipo: 'expulsao', lado: 'A', goleiro: true }, 'T1', 'T1'), true);
});
test('goleiro do utilizador expulso (utilizador fora, lado B): liga o aviso', () => {
  assert.strictEqual(avisoDoGoleiro({ tipo: 'expulsao', lado: 'B', goleiro: true }, 'T2', 'T1'), true);
});
test('goleiro do ADVERSARIO expulso: nao liga', () => {
  assert.strictEqual(avisoDoGoleiro({ tipo: 'expulsao', lado: 'B', goleiro: true }, 'T1', 'T1'), null);
  assert.strictEqual(avisoDoGoleiro({ tipo: 'expulsao', lado: 'A', goleiro: true }, 'T2', 'T1'), null);
});
test('expulsao de um jogador de linha do utilizador: nao liga', () => {
  assert.strictEqual(avisoDoGoleiro({ tipo: 'expulsao', lado: 'A', goleiro: false }, 'T1', 'T1'), null);
  assert.strictEqual(avisoDoGoleiro({ tipo: 'expulsao', lado: 'A' }, 'T1', 'T1'), null);
});
test('sem ids (sem jogo do utilizador hoje): nao liga', () => {
  assert.strictEqual(avisoDoGoleiro({ tipo: 'expulsao', lado: 'A', goleiro: true }, undefined, 'T1'), null);
  assert.strictEqual(avisoDoGoleiro({ tipo: 'expulsao', lado: 'A', goleiro: true }, 'T1', null), null);
});
test('goleiro_trocado e fim desligam; o resto nao mexe', () => {
  assert.strictEqual(avisoDoGoleiro({ tipo: 'goleiro_trocado', lado: 'casa' }, 'T1', 'T1'), false);
  assert.strictEqual(avisoDoGoleiro({ tipo: 'fim' }, 'T1', 'T1'), false);
  assert.strictEqual(avisoDoGoleiro({ tipo: 'estado' }, 'T1', 'T1'), null);
  assert.strictEqual(avisoDoGoleiro(null, 'T1', 'T1'), null);
});

test('goleiro_trocado so desliga com a troca do lado do utilizador (a do adversario nao apaga o aviso)', () => {
  assert.strictEqual(avisoDoGoleiro({ tipo: 'goleiro_trocado', lado: 'fora' }, 'T1', 'T1'), null);   // utilizador em casa
  assert.strictEqual(avisoDoGoleiro({ tipo: 'goleiro_trocado', lado: 'fora' }, 'T2', 'T1'), false);  // utilizador fora
  assert.strictEqual(avisoDoGoleiro({ tipo: 'goleiro_trocado', lado: 'casa' }, 'T2', 'T1'), null);
  assert.strictEqual(avisoDoGoleiro({ tipo: 'goleiro_trocado' }, 'T1', 'T1'), false);                // sem lado: desliga, como antes
});

import { aplicarTrocaDo3d } from '../3dMatch/avisoGoleiro';
// Escalacao de exemplo: p-1 goleiro (expulso), p-2..p-11 de linha; banco p-12 (goleiro reserva), p-13.
const L0 = ['p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6', 'p-7', 'p-8', 'p-9', 'p-10', 'p-11'];
const plantel = [...L0, 'p-12', 'p-13'];
test('troca automatica do 3D (o manager nao fez nada): o reserva no posto do goleiro, o expulso no de quem saiu, quem saiu no banco; conta', () => {
  const r = aplicarTrocaDo3d(L0, ['p-12', 'p-13'], { sai: 11, entra: 12, expulso: 1 }, plantel)!;
  assert.deepStrictEqual(r.lineup, ['p-12', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6', 'p-7', 'p-8', 'p-9', 'p-10', 'p-1']);
  assert.deepStrictEqual(r.bench, ['p-11', 'p-13']);
  assert.strictEqual(r.conta, true);
  assert.strictEqual(r.sai, 'p-11'); assert.strictEqual(r.entra, 'p-12');
  assert.ok(r.lineup.every(Boolean) && new Set(r.lineup).size === 11, 'sem buracos nem repetidos');
});
test('troca corrigida, com o estado REAL do TacticsView (reserva largado no posto vermelho: o expulso sai da escalacao e do banco, o banco encolhe); nao conta', () => {
  // O que o handleDrop deixa: newLineup[0] = 'p-12'; newBench = bench.filter(id => id !== 'p-12'). O p-1 (expulso) ja nao esta em lado nenhum.
  const depoisDoDrop = ['p-12', ...L0.slice(1)];
  const r = aplicarTrocaDo3d(depoisDoDrop, ['p-13'], { sai: 11, entra: 12, expulso: 1, corrige: 1 }, plantel)!;
  assert.deepStrictEqual(r.lineup, ['p-12', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6', 'p-7', 'p-8', 'p-9', 'p-10', 'p-1']);
  assert.deepStrictEqual(r.bench, ['p-13', 'p-11']);
  assert.strictEqual(r.conta, false);
  assert.ok(r.lineup.every(Boolean) && new Set(r.lineup).size === 11, 'sem buracos nem repetidos');
});
test('troca corrigida com o expulso ainda no banco (forma antiga): tambem fica certa', () => {
  const r = aplicarTrocaDo3d(['p-12', ...L0.slice(1)], ['p-1', 'p-13'], { sai: 3, entra: 12, corrige: 1 }, plantel)!;
  assert.strictEqual(r.lineup[2], 'p-1');
  assert.deepStrictEqual(r.bench, ['p-13', 'p-3']);
  assert.strictEqual(r.conta, false);
});
test('promocao (o mesmo jogador vai ao gol) e banco vazio (o reserva veio do plantel): nada muda', () => {
  assert.strictEqual(aplicarTrocaDo3d(L0, ['p-12'], { sai: 5, entra: 5, expulso: 1 }, plantel), null);
  assert.strictEqual(aplicarTrocaDo3d(L0, [], { sai: 11, entra: 12, expulso: 1 }, plantel), null);
});
test('troca do 3D com ids que o manager nao tem: nada muda', () => {
  assert.strictEqual(aplicarTrocaDo3d(['p-1'], ['p-12'], { sai: 9, entra: 12 }), null);
  assert.strictEqual(aplicarTrocaDo3d(['p-1'], ['p-12'], { sai: 1, entra: 99 }), null);
});
