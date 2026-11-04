import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../textSim/world';
import { criarCopas, avancarCompeticao, mapaDeClubes, ocupacaoDe, somarDias, Competition } from '../textSim/competitions';

const mundo = () => createWorld('bra_serie_a', '2026-01-01', null);

test('Europa League e Conference: 36 clubes, sem clube repetido entre UCL/UEL/UECL', () => {
  const w = mundo(); const cs = criarCopas(w, undefined, ocupacaoDe(w, []), null, 'bra_serie_a');
  const [ucl, uel, uecl] = ['UCL', 'UEL', 'UECL'].map(id => cs.find(c => c.id === id) as Competition);
  for (const c of [ucl, uel, uecl]) { assert.ok(c, 'existe'); assert.equal(c.teamKeys.length, 36); assert.equal(c.matches.length, 36 * 8 / 2); }
  const todos = [...ucl.teamKeys, ...uel.teamKeys, ...uecl.teamKeys];
  assert.equal(new Set(todos).size, 108);
});

test('Carabao: 92 clubes, 36 jogos na 1.a rodada, nenhum clube joga duas vezes na rodada', () => {
  const w = mundo(); const cs = criarCopas(w, undefined, ocupacaoDe(w, []), null, 'bra_serie_a');
  const c = cs.find(x => x.id === 'CARABAO') as Competition;
  assert.ok(c); assert.equal(c.teamKeys.length, 92);
  const r1 = c.matches.filter(m => m.stage === 'R1');
  assert.equal(r1.length, 36);
  const ks = r1.flatMap(m => [m.homeKey, m.awayKey]); assert.equal(new Set(ks).size, 72);
  assert.ok(ks.every(k => !k.startsWith('eng_prem|')), 'a Premier nao joga a 1.a rodada');
});

test('Carabao completa: 36-> R2 -> 32 na R3 -> 16 -> QF 8 -> SF ida/volta -> final em Wembley; campeao e vice', () => {
  const w = mundo(); const cs = criarCopas(w, undefined, ocupacaoDe(w, []), null, 'bra_serie_a');
  let c = cs.find(x => x.id === 'CARABAO') as Competition;
  const mapa = mapaDeClubes(w); const oc = ocupacaoDe(w, cs);
  let dia = '2026-04-01';
  for (let i = 0; i < 400 && !c.champion; i++) { c = avancarCompeticao(c, mapa, dia, { ocupado: oc }); dia = somarDias(dia, 1); }
  assert.ok(c.champion, 'tem campeao'); assert.ok(c.vice && c.vice !== c.champion, 'tem vice');
  const n = (s: string) => c.matches.filter(m => m.stage === s).length;
  assert.equal(n('R3'), 16); assert.equal(n('R4'), 8); assert.equal(n('QF'), 4); assert.equal(n('SF'), 4); assert.equal(n('F'), 1);
  assert.equal(c.matches.filter(m => m.stage === 'R3').flatMap(m => [m.homeKey, m.awayKey]).length, 32);
  for (const s of ['R1', 'R2', 'R3', 'R4', 'QF', 'SF', 'F']) {
    const ks = c.matches.filter(m => m.stage === s).flatMap(m => [m.homeKey, m.awayKey]);
    const por = new Map<string, number>(); ks.forEach(k => por.set(k, (por.get(k) || 0) + 1));
    assert.ok([...por.values()].every(v => v === (s === 'SF' ? 2 : 1)), 'clube repetido em ' + s);
  }
  const f = c.matches.find(m => m.stage === 'F')!; assert.equal(f.venue, 'Wembley Stadium');
  assert.ok(c.matches.filter(m => m.stage !== 'SF' && m.stage !== 'F').every(m => !m.et), 'sem prorrogacao antes das meias/final');
  for (const m of c.matches) if (m.stage !== 'F') assert.ok(m.date < f.date, 'final e a ultima');
});

test('Carabao: 2.a rodada com 24 jogos; campeao da Carabao ganha vaga na Europa League (vaga desce se ja na Champions)', () => {
  const w = mundo();
  const base = criarCopas(w, undefined, ocupacaoDe(w, []), null, 'bra_serie_a');
  let c = base.find(x => x.id === 'CARABAO') as Competition;
  const mapa = mapaDeClubes(w), oc = ocupacaoDe(w, base);
  let dia = '2026-04-01';
  for (let i = 0; i < 60; i++) { c = avancarCompeticao(c, mapa, dia, { ocupado: oc }); dia = somarDias(dia, 1); }
  assert.equal(c.matches.filter(m => m.stage === 'R2').length, 24);
  const uelBase = (base.find(x => x.id === 'UEL') as Competition).teamKeys;
  const eng = w.find(l => l.leagueId === 'eng_prem')!;
  const fora = eng.teams.map(t => 'eng_prem|' + t.id).find(k => !base.some(b => ['UCL', 'UEL', 'UECL'].includes(b.id) && b.teamKeys.includes(k)))!;
  const nome = eng.teams.find(t => 'eng_prem|' + t.id === fora)!.name;
  const com = criarCopas(w, undefined, ocupacaoDe(w, []), null, 'bra_serie_a', 2026, { carabao: nome });
  assert.ok((com.find(x => x.id === 'UEL') as Competition).teamKeys.includes(fora), 'campeao da Carabao entra na UEL');
  assert.equal((com.find(x => x.id === 'UEL') as Competition).teamKeys.length, 36);
  assert.equal(uelBase.length, 36);
});
