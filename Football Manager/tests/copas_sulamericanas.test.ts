import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../textSim/world';
import { criarCopas, ocupacaoDe, mapaDeClubes, GRUPOS_REAIS_LIB, GRUPOS_REAIS_SUL, Competition } from '../textSim/competitions';

const nomesPorGrupo = (c: Competition, m: Map<string, any>) => Object.fromEntries(Object.entries(c.groups!).map(([g, ks]) => [g, ks.map(k => m.get(k).name)]));

test('Libertadores e Sul-Americana 2026: 32 clubes em 8 grupos de 4 (com ou sem o mod)', () => {
  const w = createWorld('eng_prem', '2026-01-01', null); const cs = criarCopas(w, undefined, ocupacaoDe(w, []), null, 'eng_prem');
  for (const id of ['LIB', 'SUL']) {
    const c = cs.find(x => x.id === id) as Competition;
    assert.equal(c.teamKeys.length, 32, id + ': 32 clubes');
    assert.equal(Object.keys(c.groups!).length, 8, id + ': 8 grupos');
    for (const g of Object.values(c.groups!)) assert.equal(g.length, 4, id + ': 4 por grupo');
  }
});

test('Libertadores e Sul-Americana 2026: os grupos reais do mod (so com o mod)', { skip: Object.keys(GRUPOS_REAIS_LIB).length === 0 && 'sem o mod (regras.json)' }, () => {
  const w = createWorld('eng_prem', '2026-01-01', null); const cs = criarCopas(w, undefined, ocupacaoDe(w, []), null, 'eng_prem'); const m = mapaDeClubes(w);
  assert.deepEqual(nomesPorGrupo(cs.find(c => c.id === 'LIB') as Competition, m), GRUPOS_REAIS_LIB);
  assert.deepEqual(nomesPorGrupo(cs.find(c => c.id === 'SUL') as Competition, m), GRUPOS_REAIS_SUL);
});

test('com a tabela do ano anterior jogada, volta o criterio normal (sorteio de grupos)', () => {
  const w = createWorld('eng_prem', '2026-01-01', null);
  const anterior: Record<string, string[]> = { arg_serie_a: w.find(l => l.leagueId === 'arg_serie_a')!.teams.map(t => t.name) };
  const cs = criarCopas(w, anterior, ocupacaoDe(w, []), null, 'eng_prem');
  assert.equal((cs.find(c => c.id === 'LIB') as Competition).teamKeys.length, 32);
});
