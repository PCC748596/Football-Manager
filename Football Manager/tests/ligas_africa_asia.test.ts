import test from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRIES, generateLeagueData, faixaDeOvr } from '../textSim/dataGenerator';
import { REAL_TEAMS_JSON } from '../textSim/realDatabase';
import { NOMES_POR_PAIS } from '../textSim/nomesPaises';
import { economiaDaLiga, ECONOMIA_PADRAO } from '../textSim/economia';
import { PAISES_DOS_DADOS_LOCAIS, bandeiraDoCodigo } from '../textSim/dadosLocais';

// Africa e Asia (tools/gerar_ligas_sav.cjs --grupo africa_asia): so a 1.a divisao, liga fechada. A base e GENERICA; os nomes reais so existem no mod.
// [id do pais, continente, liga, clubes, codigo do .sav]
const ESPERADO: [string, string, string, number, number][] = [
  ['93', 'Africa', 'egy_premier', 22, 111], ['94', 'Africa', 'mar_botola', 16, 129], ['95', 'Africa', 'rsa_premiership', 16, 140], ['96', 'Africa', 'alg_ligue1', 16, 97],
  ['97', 'Africa', 'tun_ligue1', 16, 145], ['98', 'Africa', 'tan_premier', 16, 143], ['99', 'Africa', 'cod_linafoot', 16, 110], ['100', 'Africa', 'ang_girabola', 16, 98],
  ['101', 'Africa', 'gha_premier', 18, 117], ['102', 'Africa', 'civ_ligue1', 16, 108], ['103', 'Africa', 'mli_ligue1', 16, 126],
  ['104', 'Asia', 'ksa_pro_league', 18, 183], ['105', 'Asia', 'kor_k1', 12, 167], ['106', 'Asia', 'uae_pro_league', 14, 190], ['107', 'Asia', 'irn_pro_league', 16, 161], ['108', 'Asia', 'qat_stars', 12, 182]
];

test('os 16 paises tem a liga, o numero de clubes, faixa, economia, nomes e bandeira', () => {
  for (const [id, cont, liga, n, cod] of ESPERADO) {
    const c = COUNTRIES.find(x => x.id === id)!;
    assert.ok(c, 'pais ' + id);
    assert.equal(c.continent, cont);
    assert.deepEqual(c.leagues.map((l: any) => [l.id, l.teamIds.length, l.promoted, l.relegated]), [[liga, n, 0, 0]]);
    const l: any = c.leagues[0];
    assert.equal(l.matchDates.length, 2 * (n - 1));
    assert.ok(l.matchDates[l.matchDates.length - 1] < 365);
    assert.ok(faixaDeOvr(id, l), liga + ' faixa');
    assert.notEqual(economiaDaLiga(liga), ECONOMIA_PADRAO, liga + ' economia');
    assert.ok(NOMES_POR_PAIS[id]?.nomes.length > 25, 'nomes ' + id);
    assert.ok(PAISES_DOS_DADOS_LOCAIS.includes(cod), 'dados locais ' + cod);
    assert.equal(bandeiraDoCodigo(String(cod)), id);
  }
});

test('clubes novos: ids do pais, sem escudo na base, nomes unicos', () => {
  const novos = (REAL_TEAMS_JSON as any[]).filter(t => Number(t.country) >= 93 && Number(t.country) <= 108);
  assert.equal(novos.length, ESPERADO.reduce((a, e) => a + e[3], 0));
  for (const t of novos) { assert.equal(Math.floor(t.teamID / 10000), Number(t.country)); assert.equal(t.teamBadgeLocation, '-'); }
  assert.equal(new Set((REAL_TEAMS_JSON as any[]).map(t => t.teamName)).size, (REAL_TEAMS_JSON as any[]).length);
});

test('cada liga gera plantel completo e na faixa de OVR', () => {
  for (const [id, , liga] of ESPERADO) {
    const { teams, players } = generateLeagueData(id, liga);
    const [alto, baixo] = faixaDeOvr(id, COUNTRIES.find(c => c.id === id)!.leagues[0])!;
    for (const t of teams) {
      assert.ok(players.filter(p => p.teamId === t.id).length >= 28, t.name);
      assert.ok(t.strength >= baixo - 1 && t.strength <= alto + 1, `${liga} ${t.name} ${t.strength}`);
    }
  }
});
