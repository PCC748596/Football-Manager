import test from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRIES, generateLeagueData, faixaDeOvr } from '../textSim/dataGenerator';
import { REAL_TEAMS_JSON } from '../textSim/realDatabase';
import { NOMES_POR_PAIS } from '../textSim/nomesPaises';
import { economiaDaLiga, ECONOMIA_PADRAO } from '../textSim/economia';
import { PAISES_DOS_DADOS_LOCAIS, bandeiraDoCodigo } from '../textSim/dadosLocais';

// Europa e Australia (tools/gerar_ligas_sav.cjs --grupo europa2): so a 1.a divisao, liga fechada. A base e GENERICA; os nomes reais so existem no mod.
// [id do pais, continente, liga, clubes, codigo do .sav, ja existia]
const ESPERADO: [string, string, string, number, number, boolean][] = [
  ['70', 'Europe', 'nor_eliteserien', 16, 36, true], ['80', 'Europe', 'ned_eredivisie', 18, 34, true], ['82', 'Europe', 'tur_super_lig', 18, 48, true],
  ['85', 'Europe', 'bel_pro_league', 16, 7, true], ['87', 'Europe', 'gre_super_league', 14, 22, true], ['89', 'Europe', 'ukr_premier', 16, 49, true],
  ['109', 'Europe', 'den_superliga', 12, 13, false], ['110', 'Europe', 'fin_veikkausliiga', 12, 17, false], ['111', 'Europe', 'hun_nb1', 12, 23, false],
  ['112', 'Europe', 'pol_ekstraklasa', 18, 37, false], ['113', 'Europe', 'sco_premiership', 12, 42, false], ['114', 'Europe', 'swe_allsvenskan', 16, 46, false],
  ['115', 'Europe', 'sui_super_league', 12, 47, false], ['116', 'Europe', 'wal_cymru_premier', 12, 50, false], ['117', 'Asia', 'aus_a_league', 12, 195, false]
];

test('os 15 paises tem a liga completa, faixa, economia, nomes e bandeira', () => {
  for (const [id, cont, liga, n, cod] of ESPERADO) {
    const c = COUNTRIES.find(x => x.id === id)!;
    assert.ok(c, 'pais ' + id);
    assert.equal(c.continent, cont, 'continente de ' + id);
    const visiveis = c.leagues.filter((l: any) => !l.hidden);
    assert.deepEqual(visiveis.map((l: any) => [l.id, l.teamIds.length, l.promoted, l.relegated]), [[liga, n, 0, 0]]);
    const l: any = visiveis[0];
    assert.equal(l.matchDates.length, 2 * (n - 1));
    assert.ok(faixaDeOvr(id, l), liga + ' faixa');
    assert.notEqual(economiaDaLiga(liga), ECONOMIA_PADRAO, liga + ' economia');
    assert.ok(NOMES_POR_PAIS[id]?.nomes.length > 20, 'nomes ' + id);
    assert.ok(PAISES_DOS_DADOS_LOCAIS.includes(cod), 'dados locais ' + cod);
    assert.equal(bandeiraDoCodigo(String(cod)), id);
  }
});

test('os paises que ja existiam: sem liga oculta (nada de vagas a dobrar nas copas) e os clubes antigos na liga completa', () => {
  for (const [id, , liga, , , existia] of ESPERADO) {
    if (!existia) continue;
    const c: any = COUNTRIES.find(x => x.id === id)!;
    assert.ok(!c.leagues.some((l: any) => /_clubes$/.test(l.id)), id + ' ainda tem liga *_clubes');
    const antigos: number[] = c._ocultaOriginal.teamIds;
    const naLiga = antigos.filter(t => c.leagues.find((l: any) => l.id === liga).teamIds.includes(t));
    assert.ok(naLiga.length >= 4, `${id}: so ${naLiga.length} dos 5 antigos na liga`);
    for (const t of antigos) assert.ok((REAL_TEAMS_JSON as any[]).some(x => x.teamID === t), 'clube antigo apagado: ' + t);
  }
});

test('cada liga gera plantel completo e na faixa de OVR (os clubes novos)', () => {
  for (const [id, , liga] of ESPERADO) {
    const { teams, players } = generateLeagueData(id, liga);
    const lg = COUNTRIES.find(c => c.id === id)!.leagues.find((l: any) => l.id === liga)!;
    const [alto, baixo] = faixaDeOvr(id, lg)!;
    const novos = new Set((REAL_TEAMS_JSON as any[]).filter(t => t.criadoPor === 'gerar_ligas_sav:europa2').map(t => String(t.teamID)));
    for (const t of teams) {
      assert.ok(players.filter(p => p.teamId === t.id).length >= 28, t.name);
      if (novos.has(t.id)) assert.ok(t.strength >= baixo - 1 && t.strength <= alto + 1, `${liga} ${t.name} ${t.strength}`);
    }
  }
});
