import test from 'node:test';
import assert from 'node:assert/strict';
import { sinergiaDoElenco } from '../3dMatch/simulador3dCliente';
import { CONFIG_QUIMICA } from '../textSim/quimica';

// O entrosamento que vai ao 3D (Chemistry Intelligence): as duplas do elenco do jogo, com minutos, a partir do `synergyMap` (chave 'idA-idB' com idA < idB).
test('sinergiaDoElenco manda so as duplas do elenco com minutos', () => {
  const mapa = { 'p-1-p-2': 900, 'p-1-p-3': 0, 'p-2-p-9': 450, 'p-2-p-3': 180.4 };
  const out = sinergiaDoElenco(mapa, ['p-1', 'p-2', 'p-3']);
  assert.deepEqual(out, [['p-1', 'p-2', 900], ['p-2', 'p-3', 180]]);
  assert.deepEqual(sinergiaDoElenco(undefined, ['p-1', 'p-2']), []);
});

test('a regua do Chemistry: 10 jogos juntos (por dupla) para o maximo', () => {
  assert.equal(CONFIG_QUIMICA.jogosParaTeto, 10);
});
