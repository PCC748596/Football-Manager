import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, WorldLeague } from '../textSim/world';
import { criarCopas, ocupacaoDe, noAno, Competition, familiaDaCopa } from '../textSim/competitions';
import { generateLeagueData, generateFixtures } from '../textSim/dataGenerator';

const mundo = (ano: number) => {
  const w = createWorld('bra_serie_a', `${ano}-01-01`, null, ano);
  const { teams } = generateLeagueData('45', 'bra_serie_a');
  const serieA: WorldLeague = { countryId: '45', countryName: 'Brazil', leagueId: 'bra_serie_a', leagueName: 'Serie A', tier: 1, relegated: 4, teams, fixtures: [] } as any;
  return [serieA, ...w];
};
const dia = (iso: string) => new Date(iso + 'T12:00:00Z').getUTCDay();

test('noAno: 2026 fica igual; outros anos deslocam 52 semanas por ano (mesmo dia da semana)', () => {
  assert.equal(noAno('2026-04-12'), '2026-04-12');
  assert.equal(noAno('2026-04-12', 2027), '2027-04-11');
  assert.equal(dia(noAno('2026-04-12', 2027)), dia('2026-04-12'));
  assert.equal(dia(noAno('2026-04-12', 2030)), dia('2026-04-12'));
});

test('as copas de 2027 nascem em 2027, com o mesmo numero de jogos e o mesmo dia da semana de 2026', () => {
  const w26 = mundo(2026), w27 = mundo(2027);
  const c26 = criarCopas(w26, undefined, ocupacaoDe(w26, []), null, 'bra_serie_a', 2026);
  const c27 = criarCopas(w27, undefined, ocupacaoDe(w27, []), null, 'bra_serie_a', 2027);
  assert.deepEqual(c27.map(c => c.id).sort(), c26.map(c => c.id).sort());
  for (const c of c27) {
    const ref = c26.find(x => x.id === c.id) as Competition;
    assert.equal(c.ano, 2027, c.id);
    assert.equal(c.matches.length, ref.matches.length, c.id);
    // As sul-americanas no ano (2027); as europeias na temporada 2027/28, de 1/6/2027 a 31/5/2028 (pedido: cada copa na temporada da sua regiao).
    if (familiaDaCopa(c.id) === 'EUR') assert.ok(c.matches.every(m => m.date >= '2027-06-01' && m.date <= '2028-05-31'), `${c.id}: todas as datas na temporada 2027/28`);
    else assert.ok(c.matches.every(m => m.date >= '2027-01-01' && m.date <= '2027-12-31'), `${c.id}: todas as datas em 2027`);
  }
  const p27 = c27.find(c => c.id === 'PAULISTA') as Competition;
  assert.ok(p27.matches.every(m => m.date >= '2027-01-02' && m.date <= '2027-03-10'), 'o Paulistao de 2027 joga-se no inicio de 2027');
});

test('as ligas de 2027 jogam-se em 2027, nos mesmos dias da semana', () => {
  const { teams } = generateLeagueData('45', 'bra_serie_a');
  const f26 = generateFixtures(teams, 'bra_serie_a'), f27 = generateFixtures(teams, 'bra_serie_a', 2027);
  assert.equal(f27.length, f26.length);
  assert.equal(f26[0].date, '2026-04-12');
  assert.equal(f27[0].date, '2027-04-11');
  assert.equal(dia(f27[0].date), dia(f26[0].date));
  assert.ok(f27.every(f => f.date.startsWith('2027') || f.date.startsWith('2028')));
});
