import test from 'node:test';
import assert from 'node:assert/strict';
import { getKitDetails, kitShorts } from '../types';

const team: any = { name: 'Portuguesa-SP', primaryColor: '#ff0315', secondaryColor: '#fdfdfc', tertiaryColor: '' };

test('Portuguesa-SP: 1.o faixas horizontais verde/vermelho com calcao verde; 2.o branco; 3.o vermelho com calcao verde', () => {
  const k0 = getKitDetails(team, 0), k1 = getKitDetails(team, 1), k2 = getKitDetails(team, 2);
  assert.equal(k0.horizontal, true); assert.equal(k0.c1, '#0f7a3a'); assert.equal(k0.c2, '#d71920');
  assert.equal(kitShorts(k0).cor, '#0f7a3a'); assert.deepEqual(k0.meiao?.cores, ['#d71920', '#0f7a3a']);
  assert.equal(k1.c1, 'white'); assert.equal(kitShorts(k1).cor, 'white');
  assert.equal(k2.c1, '#d71920'); assert.equal(kitShorts(k2).cor, '#0f7a3a');
});
