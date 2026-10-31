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
