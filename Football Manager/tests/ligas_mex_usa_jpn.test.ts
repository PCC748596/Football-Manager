import test from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRIES, generateLeagueData, faixaDeOvr } from '../textSim/dataGenerator';
import { REAL_TEAMS_JSON } from '../textSim/realDatabase';
import { NOMES_POR_PAIS } from '../textSim/nomesPaises';
import { economiaDaLiga, ECONOMIA_PADRAO } from '../textSim/economia';
import { PAISES_DOS_DADOS_LOCAIS } from '../textSim/dadosLocais';
import { planearAcessosEDescensos } from '../textSim/promocoes';

// Mexico (90), EUA (91) e Japao (92): tools/gerar_ligas_mex_usa_jpn.cjs. A base e GENERICA; os nomes reais so existem no mod.
const ESPERADO: Record<string, { continente: string; ligas: [string, number, number, number][] }> = {
  '90': { continente: 'North America', ligas: [['mex_liga_mx', 18, 0, 0], ['mex_expansion', 14, 0, 0]] },
  '91': { continente: 'North America', ligas: [['usa_mls', 30, 0, 0], ['usa_usl', 24, 0, 0]] },
  '92': { continente: 'Asia', ligas: [['jpn_j1', 20, 0, 3], ['jpn_j2', 20, 3, 3], ['jpn_j3', 20, 3, 0]] }
};

test('os 3 paises tem as ligas, o numero de clubes e o acesso/rebaixamento pedidos', () => {
  for (const [id, e] of Object.entries(ESPERADO)) {
    const c = COUNTRIES.find(x => x.id === id)!;
    assert.ok(c, 'pais ' + id);
    assert.equal(c.continent, e.continente);
    assert.deepEqual(c.leagues.map((l: any) => [l.id, l.teamIds.length, l.promoted, l.relegated]), e.ligas);
    for (const l of c.leagues as any[]) {
      assert.equal(l.matchDates.length, 2 * (l.teamIds.length - 1), l.id);
      assert.ok(l.matchDates[l.matchDates.length - 1] < 365, l.id + ' cabe no ano');
      assert.ok(faixaDeOvr(id, l), l.id + ' tem faixa de OVR');
      assert.notEqual(economiaDaLiga(l.id), ECONOMIA_PADRAO, l.id + ' tem economia');
    }
    assert.ok(NOMES_POR_PAIS[id]?.nomes.length > 30, 'nomes do pais ' + id);
  }
  assert.ok([83, 95, 163].every(n => PAISES_DOS_DADOS_LOCAIS.includes(n)));
});

test('clubes novos: ids do pais, nomes unicos na base inteira e sem escudo real', () => {
  const todos = REAL_TEAMS_JSON as any[];
  const nomes = new Set<string>();
  for (const t of todos) { assert.ok(!nomes.has(t.teamName), 'nome repetido: ' + t.teamName); nomes.add(t.teamName); }
  const novos = todos.filter(t => ['90', '91', '92'].includes(String(t.country)));
  assert.equal(novos.length, 32 + 54 + 60);
  for (const t of novos) {
    assert.equal(Math.floor(t.teamID / 10000), Number(t.country));
    assert.equal(t.teamBadgeLocation, '-');
    assert.match(t.color, /^#[0-9a-f]{6}$/);
  }
});

test('a liga gera plantel completo e na faixa de OVR', () => {
  for (const [pais, liga] of [['90', 'mex_liga_mx'], ['91', 'usa_mls'], ['92', 'jpn_j3']]) {
    const { teams, players } = generateLeagueData(pais, liga);
    const l = COUNTRIES.find(c => c.id === pais)!.leagues.find((x: any) => x.id === liga)!;
    assert.equal(teams.length, l.teamIds.length);
    const [alto, baixo] = faixaDeOvr(pais, l)!;
    for (const t of teams) {
      assert.ok(players.filter(p => p.teamId === t.id).length >= 28, t.name);
      assert.ok(t.strength >= baixo - 1 && t.strength <= alto + 1, `${t.name} ${t.strength} fora de ${baixo}-${alto}`);
    }
  }
});

test('Japao: 3 descem da J1 e da J2, 3 sobem da J2 e da J3; Mexico e EUA nao mexem', () => {
  const tabela = (ids: number[]) => ids.map(String);
  for (const id of ['90', '91', '92']) {
    const c: any = COUNTRIES.find(x => x.id === id);
    const finais: Record<string, string[]> = {};
    for (const l of c.leagues) finais[l.id] = tabela(l.teamIds);
    const mov = planearAcessosEDescensos([c], finais).movimentos.filter(m => m.paisId === id);
    const desce = (lid: string) => mov.find((m: any) => m.ligaId === lid)?.rebaixados.length || 0;
    const sobe = (lid: string) => mov.find((m: any) => m.ligaId === lid)?.promovidos.length || 0;
    if (id === '92') { assert.equal(desce('jpn_j1'), 3); assert.equal(sobe('jpn_j2'), 3); assert.equal(desce('jpn_j2'), 3); assert.equal(sobe('jpn_j3'), 3); }
    else for (const l of c.leagues) { assert.equal(desce(l.id), 0); assert.equal(sobe(l.id), 0); }
  }
});
