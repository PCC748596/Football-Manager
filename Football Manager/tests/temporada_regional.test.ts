/*
CADA REGIAO NA SUA TEMPORADA (pedido: *"as copas acabam de acordo com as temporadas: a temporada Brasil/America do Sul e no mesmo ano; a temporada Europa e demais e de um
ano para o outro"*). As copas europeias vao de 1/6 a 31/5 do ano seguinte e viram na data delas; as sul-americanas de janeiro a dezembro. A virada de uma regiao nao mexe nas
copas nem nas ligas da outra (prepararCopas `renovar`, calcularVirada `familia`).

Corre com: npx tsx --test tests/temporada_regional.test.ts
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../textSim/world';
import { prepararCopas, familiaDaCopa, temporadaDaFamilia, fimDasCopas, Competition } from '../textSim/competitions';
import { generateLeagueData, generateFixtures } from '../textSim/dataGenerator';
import { classificacaoFinal, familiaDaLiga } from '../textSim/virada';

test('temporadaDaFamilia: SUL no ano da data; EUR vira a 1/6', () => {
  assert.equal(temporadaDaFamilia('SUL', '2027-01-01'), 2027);
  assert.equal(temporadaDaFamilia('EUR', '2027-05-31'), 2026);
  assert.equal(temporadaDaFamilia('EUR', '2027-06-01'), 2027);
  assert.equal(fimDasCopas('EUR', 2026), '2027-05-31');
  assert.equal(fimDasCopas('SUL', 2026), '2026-12-28');
  assert.equal(familiaDaCopa('UCL'), 'EUR'); assert.equal(familiaDaCopa('CARABAO'), 'EUR'); assert.equal(familiaDaCopa('LIB'), 'SUL'); assert.equal(familiaDaCopa('COPA_BR'), 'SUL');
});

test('clube brasileiro a 1/1: as europeias sao as de 2025/26; a virada europeia a 1/6 recria SO as europeias, de 2026/27 e atravessando o ano', () => {
  const { teams, players } = generateLeagueData('45', 'bra_serie_a');
  const userTeamId = teams[0].id;
  const fixtures = generateFixtures(teams, 'bra_serie_a', 2026);
  const w = createWorld('bra_serie_a', '2026-01-01', null, 2026, 2025);
  const r0 = prepararCopas({ world: w, userTeamId, teams, players, fixtures, date: '2026-01-01', comps: null })!;
  assert.ok(r0, 'copas criadas');
  const eur0 = r0.comps.filter(c => familiaDaCopa(c.id) === 'EUR'), sul0 = r0.comps.filter(c => familiaDaCopa(c.id) === 'SUL');
  assert.ok(eur0.length >= 4 && sul0.length >= 3);
  for (const c of eur0) {
    assert.equal(c.ano, 2025, c.id);
    assert.ok(c.matches.every(m => m.date <= '2026-05-31'), `${c.id} 2025/26 acaba ate 31/5/2026`);
  }
  for (const c of sul0) assert.equal(c.ano, 2026, c.id);

  const w1 = createWorld('bra_serie_a', '2026-06-01', null, 2026, 2026);
  const r1 = prepararCopas({ world: w1, userTeamId, teams, players, fixtures, date: '2026-06-01', comps: r0.comps, renovar: ['EUR'] })!;
  for (const c of r1.comps.filter(x => familiaDaCopa(x.id) === 'SUL')) assert.equal(c.ano, 2026, `${c.id} (sul-americana) continua a meio`);
  const eur1 = r1.comps.filter(c => familiaDaCopa(c.id) === 'EUR');
  assert.deepEqual(eur1.map(c => c.id).sort(), eur0.map(c => c.id).sort());
  for (const c of eur1) {
    assert.equal(c.ano, 2026, c.id);
    assert.ok(c.matches.every(m => m.date >= '2026-06-01' && m.date <= '2027-05-31'), `${c.id}: na temporada 2026/27`);
  }
  const ucl = eur1.find(c => c.id === 'UCL') as Competition;
  assert.ok(ucl.matches.some(m => m.date >= '2027-01-01'), 'a fase de liga da Champions atravessa o ano (janeiro)');
});

test('virada de uma regiao: a classificacao final so leva as ligas dela', () => {
  const w = createWorld('bra_serie_a', '2026-06-01', null, 2026, 2025);
  const fimEur = classificacaoFinal({ teams: [], fixtures: [], userLeagueId: 'bra_serie_a', userTeamId: 'x', world: w, comps: null, familia: 'EUR' });
  const ids = Object.keys(fimEur);
  assert.ok(ids.length > 0, 'ha ligas europeias acabadas');
  assert.ok(ids.every(id => familiaDaLiga(id) === 'EUR'), 'so ligas europeias: ' + ids.filter(id => familiaDaLiga(id) !== 'EUR').join(','));
});
