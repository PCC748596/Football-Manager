/*
OS ESTADUAIS DE GRUPOS CRUZADOS (Carioca, Mineiro e Gaucho de 2026; textSim/competitions.ts, ESTADUAIS_CRUZADOS). Pedido: *"tem como colocar os campeonatos Carioca, Mineiro e
Gaucho?"*. Na 1.a fase cada clube joga uma vez contra cada clube dos outros grupos; a tabela e por grupo.

Corre com: npx tsx --test tests/estaduais.test.ts
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../textSim/world';
import { criarCopas, avancarCompeticao, mapaDeClubes, ocupacaoDe, somarDias, tabelaDoGrupo, estadualDoClube, ehDeEstadual, Competition } from '../textSim/competitions';

// Sem excluir liga nenhuma: a Serie A tambem esta no mundo (os grandes de cada estado).
const mundo = () => createWorld('__nenhuma__', '2026-01-01', null, 2026, 2025);

const ESPERADO: Record<string, { clubes: number; grupos: number; porClube: number; fases: Record<string, number> }> = {
  CARIOCA: { clubes: 12, grupos: 2, porClube: 6, fases: { QF: 4, SF: 4, F: 1 } },
  MINEIRO: { clubes: 12, grupos: 3, porClube: 8, fases: { SF: 4, F: 1 } },
  GAUCHO: { clubes: 12, grupos: 2, porClube: 6, fases: { QF: 4, SF: 4, F: 2 } },
  CATARINENSE: { clubes: 12, grupos: 2, porClube: 6, fases: { QF: 8, SF: 4, F: 2 } },
  PARANAENSE: { clubes: 12, grupos: 2, porClube: 6, fases: { QF: 8, SF: 4, F: 2 } }
};

test('os tres estaduais nascem com todos os clubes, so jogos contra os outros grupos e o mesmo numero de jogos por clube', () => {
  const w = mundo(); const cs = criarCopas(w, undefined, ocupacaoDe(w, []), null, 'bra_serie_a', 2026);
  for (const [id, e] of Object.entries(ESPERADO)) {
    const c = cs.find(x => x.id === id) as Competition;
    assert.ok(c, id + ' existe');
    assert.equal(c.teamKeys.length, e.clubes, id);
    assert.equal(Object.keys(c.groups!).length, e.grupos, id);
    const grupoDe = new Map<string, string>(); Object.entries(c.groups!).forEach(([g, ks]) => ks.forEach(k => grupoDe.set(k, g)));
    assert.ok(c.matches.every(m => grupoDe.get(m.homeKey) !== grupoDe.get(m.awayKey)), id + ': nenhum jogo dentro do proprio grupo');
    for (const k of c.teamKeys) assert.equal(c.matches.filter(m => m.homeKey === k || m.awayKey === k).length, e.porClube, `${id}: ${k} joga ${e.porClube}`);
    assert.ok(c.matches.every(m => m.date >= '2026-01-02' && m.date <= '2026-03-15'), id + ': a 1.a fase em janeiro e fevereiro');
  }
});

test('os tres estaduais completos: os classificados de cada grupo, o mata-mata do regulamento e um campeao ate meados de marco', () => {
  const w = mundo(); const cs = criarCopas(w, undefined, ocupacaoDe(w, []), null, 'bra_serie_a', 2026);
  const mapa = mapaDeClubes(w); const oc = ocupacaoDe(w, cs);
  for (const [id, e] of Object.entries(ESPERADO)) {
    let c = cs.find(x => x.id === id) as Competition;
    let dia = '2026-01-02';
    for (let i = 0; i < 120 && !c.champion; i++) { c = avancarCompeticao(c, mapa, dia, { ocupado: oc }); dia = somarDias(dia, 1); }
    assert.ok(c.champion, id + ': tem campeao');
    for (const [fase, n] of Object.entries(e.fases)) assert.equal(c.matches.filter(m => m.stage === fase).length, n, `${id}: ${n} jogos em ${fase}`);
    const f = c.matches.filter(m => m.stage === 'F');
    assert.ok(f.every(m => m.date <= '2026-03-20'), `${id}: final em marco (${f.map(m => m.date).join(', ')})`);
    // A tabela de cada grupo conta os jogos cruzados: cada clube com todos os jogos da 1.a fase.
    for (const g of Object.keys(c.groups!)) assert.ok(tabelaDoGrupo(c, g, mapa).every(r => r.played === e.porClube), `${id} grupo ${g}: tabela com ${e.porClube} jogos`);
    if (id !== 'MINEIRO') {
      const qf = c.matches.filter(m => m.stage === 'QF').flatMap(m => [m.homeKey, m.awayKey]);
      for (const g of ['A', 'B']) { const ord = tabelaDoGrupo(c, g, mapa).map(r => r.key); assert.deepEqual(new Set(qf.filter(k => c.groups![g].includes(k))), new Set(ord.slice(0, 4)), `${id}: os 4 primeiros do grupo ${g} nas quartas`); }
    }
    if (id === 'MINEIRO') {
      const sf = new Set(c.matches.filter(m => m.stage === 'SF').flatMap(m => [m.homeKey, m.awayKey]));
      for (const g of Object.keys(c.groups!)) assert.ok(sf.has(tabelaDoGrupo(c, g, mapa)[0].key), `MINEIRO: o lider do grupo ${g} nas meias`);
    }
  }
});

test('os clubes dos estaduais comecam a temporada em janeiro (ehDeEstadual)', () => {
  assert.equal(estadualDoClube('450148'), 'CARIOCA');
  assert.equal(estadualDoClube('450143'), 'MINEIRO');
  assert.equal(estadualDoClube('450156'), 'GAUCHO');
  assert.equal(estadualDoClube('450141'), 'CATARINENSE');
  assert.equal(estadualDoClube('450124'), 'PARANAENSE');
  assert.equal(estadualDoClube('450138'), null);
  assert.ok(ehDeEstadual('450138'), 'o Paulista tambem');
});
