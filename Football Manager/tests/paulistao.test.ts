import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, WorldLeague } from '../textSim/world';
import { criarCopas, avancarCompeticao, mapaDeClubes, ocupacaoDe, ehDoPaulista, Competition } from '../textSim/competitions';
import { generateLeagueData } from '../textSim/dataGenerator';

const clubes = (world: WorldLeague[]) => world.flatMap(l => l.teams.map(t => ({ liga: l.leagueId, nome: t.name, id: t.id })));

const mundo = () => {
  const w = createWorld('bra_serie_a', '2026-01-01', null);
  // a liga do utilizador (Serie A) entra tambem, como em `prepararCopas`
  const { teams } = generateLeagueData('45', 'bra_serie_a');
  const serieA: WorldLeague = { countryId: '45', countryName: 'Brazil', leagueId: 'bra_serie_a', leagueName: 'Serie A', tier: 1, relegated: 4, teams, fixtures: [] } as any;
  return [serieA, ...w];
};

test('os 16 clubes do Paulistao existem no mundo (sem duplicados)', () => {
  const cs = clubes(mundo()).filter(c => ehDoPaulista(c.id));
  assert.equal(cs.length, 16, cs.map(c => c.nome).join(', '));
  assert.equal(new Set(cs.map(c => c.nome)).size, 16);
});

test('fase classificatoria: 64 jogos, 8 por clube (4 casa, 4 fora), sem repetir adversario, uma vez por rodada', () => {
  const w = mundo();
  const comps = criarCopas(w, undefined, ocupacaoDe(w, []), null, 'bra_serie_a');
  const p = comps.find(c => c.id === 'PAULISTA') as Competition;
  assert.ok(p, 'criou o Paulistao');
  assert.equal(p.matches.length, 64);
  const jogos: Record<string, number> = {}, casa: Record<string, number> = {}, fora: Record<string, number> = {}, pares = new Set<string>();
  for (const m of p.matches) {
    jogos[m.homeKey] = (jogos[m.homeKey] || 0) + 1; jogos[m.awayKey] = (jogos[m.awayKey] || 0) + 1;
    casa[m.homeKey] = (casa[m.homeKey] || 0) + 1; fora[m.awayKey] = (fora[m.awayKey] || 0) + 1;
    pares.add([m.homeKey, m.awayKey].sort().join('~'));
  }
  assert.equal(p.teamKeys.length, 16);
  for (const k of p.teamKeys) { assert.equal(jogos[k], 8, k); assert.equal(casa[k], 4, k + ' casa'); assert.equal(fora[k], 4, k + ' fora'); }
  assert.equal(pares.size, 64, 'nenhum confronto repete');
  // 2 contra cada pote
  const pote = (k: string) => ['450138,450171,450182,450184', '451005,450165,450131,450169', '450194,450173,451103,451102', '451129,451131,451101,450130'].findIndex(p => p.split(',').includes(k.split('|')[1]));   // os potes pelos ids (como POTES_PAULISTA)
  for (const k of p.teamKeys) {
    const cont = [0, 0, 0, 0];
    p.matches.forEach(m => { if (m.homeKey === k) cont[pote(m.awayKey)]++; else if (m.awayKey === k) cont[pote(m.homeKey)]++; });
    assert.deepEqual(cont, [2, 2, 2, 2], k);
  }
  // datas: 15/01 a 21/03/2026 e um jogo por clube por dia
  const datas = p.matches.map(m => m.date).sort();
  assert.ok(datas[0] >= '2026-01-15', datas[0]);
  assert.ok(datas[datas.length - 1] <= '2026-03-21', datas[datas.length - 1]);
  const visto = new Set<string>();
  for (const m of p.matches) for (const k of [m.homeKey, m.awayKey]) { const x = k + m.date; assert.ok(!visto.has(x), 'dois jogos no mesmo dia ' + x); visto.add(x); }
});

test('mata-mata: quartas 1x8..4x5, meias, final em ida e volta, campeao; tudo ate 21/03/2026', () => {
  const w = mundo();
  const comps = criarCopas(w, undefined, ocupacaoDe(w, []), null, 'bra_serie_a');
  let p = comps.find(c => c.id === 'PAULISTA') as Competition;
  const mapa = mapaDeClubes(w);
  // dia a dia, como o jogo (as fases novas nascem no dia seguinte ao fim da anterior)
  const oc = ocupacaoDe(w, comps);
  for (let d = new Date('2026-01-01T12:00:00'); d <= new Date('2026-03-31T12:00:00'); d.setDate(d.getDate() + 1)) p = avancarCompeticao(p, mapa, d.toISOString().split('T')[0], { ocupado: oc });
  assert.ok(p.champion, 'tem campeao');
  const stages = (s: string) => p.matches.filter(m => m.stage === s);
  assert.equal(stages('QF').length, 4);
  assert.equal(stages('SF').length, 2);
  assert.equal(stages('F').length, 2);
  const ord = p.teamKeys.slice(0, 8);
  const qf = stages('QF');
  [[0, 7], [1, 6], [2, 5], [3, 4]].forEach(([a, b], i) => {
    const jogo = qf.find(m => m.tie === `QF-${i}`)!;
    assert.equal(jogo.homeKey, ord[a], 'mando do melhor na quarta ' + i);
    assert.equal(jogo.awayKey, ord[b]);
  });
  const f = stages('F').sort((x, y) => (x.leg || 0) - (y.leg || 0));
  assert.equal(f[0].homeKey, f[1].awayKey); assert.equal(f[0].awayKey, f[1].homeKey);
  assert.ok(p.matches.every(m => m.date <= '2026-03-21' && m.played), 'dentro do periodo');
});
