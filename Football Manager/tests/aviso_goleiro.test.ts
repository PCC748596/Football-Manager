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

import { aplicarTrocaDo3d } from '../3dMatch/avisoGoleiro';
test('troca do 3D (goleiro reserva depois da espera): escalacao e banco acompanham e conta', () => {
  const r = aplicarTrocaDo3d(['p-1', 'p-2', 'p-3'], ['p-12', 'p-13'], { sai: 3, entra: 12 })!;
  assert.deepStrictEqual(r.lineup, ['p-1', 'p-2', 'p-12']);
  assert.deepStrictEqual(r.bench, ['p-3', 'p-13']);
  assert.strictEqual(r.conta, true);
  assert.strictEqual(r.sai, 'p-3'); assert.strictEqual(r.entra, 'p-12');
});
test('troca do 3D corrigida (o manager arrastou o reserva para o lugar do goleiro expulso): o expulso troca com quem saiu e nao conta outra vez', () => {
  // O manager ja tinha feito: p-1 (goleiro expulso) -> p-12 (reserva). O 3D tirou o p-3.
  const r = aplicarTrocaDo3d(['p-12', 'p-2', 'p-3'], ['p-1', 'p-13'], { sai: 3, entra: 12, corrige: 1 })!;
  assert.deepStrictEqual(r.lineup, ['p-12', 'p-2', 'p-1']);
  assert.deepStrictEqual(r.bench, ['p-3', 'p-13']);
  assert.strictEqual(r.conta, false);
});
test('troca do 3D com ids que o manager nao tem: nada muda', () => {
  assert.strictEqual(aplicarTrocaDo3d(['p-1'], ['p-12'], { sai: 9, entra: 12 }), null);
  assert.strictEqual(aplicarTrocaDo3d(['p-1'], ['p-12'], { sai: 1, entra: 99 }), null);
});
