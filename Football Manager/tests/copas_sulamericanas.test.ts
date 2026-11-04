import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../textSim/world';
import { criarCopas, ocupacaoDe, mapaDeClubes, GRUPOS_REAIS_LIB, GRUPOS_REAIS_SUL, Competition } from '../textSim/competitions';

const nomesPorGrupo = (c: Competition, m: Map<string, any>) => Object.fromEntries(Object.entries(c.groups!).map(([g, ks]) => [g, ks.map(k => m.get(k).name)]));

test('Libertadores e Sul-Americana 2026: os 32 clubes e os 8 grupos reais (todos os nomes existem na base)', () => {
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
