/*
FA CUP (criarFaCup, textSim/competitions.ts): a copa das quatro divisoes inglesas, na temporada europeia (de outubro a maio). Pedido: *"verifica se conseguimos colocar a FA Cup"*.

Corre com: npx tsx --test tests/fa_cup.test.ts
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../textSim/world';
import { criarCopas, avancarCompeticao, mapaDeClubes, ocupacaoDe, somarDias, decisaoDoConfronto, campeaoAnterior, Competition } from '../textSim/competitions';
import { generateLeagueData, generateFixtures, sabadosDaFaCup } from '../textSim/dataGenerator';

const mundo = () => createWorld('bra_serie_a', '2026-06-01', null, 2026, 2026);

test('FA Cup: 164 clubes (as quatro divisoes e os escaloes 5 e 6); a Q3 so com o 6.o escalao (24 jogos); o 5.o entra na Q4, a 3.a e 4.a na R1, a 1.a e 2.a na R3', () => {
  const w = mundo(); const cs = criarCopas(w, undefined, ocupacaoDe(w, []), null, 'bra_serie_a', 2026);
  const c = cs.find(x => x.id === 'FA_CUP') as Competition;
  assert.ok(c, 'existe'); assert.equal(c.teamKeys.length, 164); assert.equal(c.ano, 2026);
  const q3 = c.matches.filter(m => m.stage === 'Q3');
  assert.equal(q3.length, 24);
  assert.ok(q3.flatMap(m => [m.homeKey, m.awayKey]).every(k => k.startsWith('eng_national_north|') || k.startsWith('eng_national_south|')), 'so o 6.o escalao na Q3');
  assert.equal((c.entradas!.Q4 || []).length, 24); assert.equal((c.entradas!.R1 || []).length, 48); assert.equal((c.entradas!.R3 || []).length, 44);
});

test('FA Cup completa: Q4 deixa 32, 80 na R1 (40 jogos), 20 jogos na R2, 64 na R3, jogo unico ate a final, meias e final em campo neutro, sem empates', () => {
  const w = mundo(); const cs = criarCopas(w, undefined, ocupacaoDe(w, []), null, 'bra_serie_a', 2026);
  let c = cs.find(x => x.id === 'FA_CUP') as Competition;
  const mapa = mapaDeClubes(w); const oc = ocupacaoDe(w, cs);
  let dia = '2026-07-01';
  for (let i = 0; i < 400 && !c.champion; i++) { c = avancarCompeticao(c, mapa, dia, { ocupado: oc }); dia = somarDias(dia, 1); }
  assert.ok(c.champion, 'tem campeao'); assert.ok(c.vice && c.vice !== c.champion, 'tem vice');
  const n = (s: string) => c.matches.filter(m => m.stage === s).length;
  assert.equal(n('Q4'), 16, 'na Q4 so os 16 jogos que deixam 32 para a R1');
  assert.equal(n('R1'), 40, '80 clubes na R1'); assert.equal(n('R2'), 20);
  assert.equal(n('R3'), 32); assert.equal(n('R4'), 16); assert.equal(n('R5'), 8); assert.equal(n('QF'), 4); assert.equal(n('SF'), 2); assert.equal(n('F'), 1);
  for (const s of ['Q3', 'Q4', 'R1', 'R2', 'R3', 'R4', 'R5', 'QF', 'SF', 'F']) {
    const ks = c.matches.filter(m => m.stage === s).flatMap(m => [m.homeKey, m.awayKey]);
    assert.equal(new Set(ks).size, ks.length, 'clube repetido em ' + s);
  }
  for (const m of c.matches.filter(x => x.stage === 'SF' || x.stage === 'F')) assert.ok(m.venue, 'campo neutro em ' + m.stage);
  // Sem replay: todo jogo empatado no tempo normal vai a prorrogacao e, se ainda empatado, a penaltis.
  for (const m of c.matches) assert.ok(m.homeScore !== m.awayScore || !!m.pens, `jogo ${m.id} sem vencedor`);
  // A temporada europeia: de outubro de 2026 (a qualificacao) a maio de 2027.
  assert.ok(c.matches.every(m => m.date >= '2026-07-01' && m.date <= '2027-05-31'), 'na temporada 2026/27');
  const f = c.matches.find(m => m.stage === 'F')!;
  assert.ok(f.date >= '2027-04-15', 'final na primavera: ' + f.date);
  for (const m of c.matches) if (m.stage !== 'F') assert.ok(m.date < f.date, 'a final e a ultima');
});

test('FA Cup: prorrogacao em qualquer fase (decisaoDoConfronto)', () => {
  const mk = (stage: string) => ({ id: `FA_CUP-${stage}-0`, stage, tie: stage + '-0', date: '2027-01-09', homeKey: 'a|1', awayKey: 'b|2', homeScore: null, awayScore: null, played: false });
  const comp = { id: 'FA_CUP', name: 'x', teamKeys: [], matches: [mk('R3'), mk('F')] } as any;
  assert.equal(decisaoDoConfronto([comp], 'fix-cup-FA_CUP-R3-0')?.prorrogacao, true);
  assert.equal(decisaoDoConfronto([comp], 'fix-cup-FA_CUP-F-0')?.prorrogacao, true);
});

test('vagas europeias das copas inglesas: o campeao da FA Cup vai a Europa League', () => {
  const w = mundo();
  const eng = w.find(l => l.leagueId === 'eng_prem')!;
  const base = criarCopas(w, undefined, ocupacaoDe(w, []), null, 'bra_serie_a', 2026);
  const fora = eng.teams.find(t => !base.some(b => ['UCL', 'UEL', 'UECL'].includes(b.id) && b.teamKeys.includes('eng_prem|' + t.id)))!;
  const com = criarCopas(w, undefined, ocupacaoDe(w, []), null, 'bra_serie_a', 2027, { faCup: campeaoAnterior({ FA_CUP: [{ ano: 2026, campeao: fora.name }] }, 'FA_CUP', 2027) });
  assert.ok((com.find(x => x.id === 'UEL') as Competition).teamKeys.includes('eng_prem|' + fora.id), 'campeao da FA Cup na UEL');
  for (const id of ['UCL', 'UEL', 'UECL']) assert.equal((com.find(x => x.id === id) as Competition).teamKeys.length, 36, id);
});

test('a liga inglesa nao joga nos sabados de FA Cup e continua com todas as rodadas', () => {
  for (const [pais, liga, tier] of [['65', 'eng_prem', 1], ['65', 'eng_l2', 4]] as [string, string, number][]) {
    const { teams } = generateLeagueData(pais, liga);
    const fx = generateFixtures(teams, liga, 2026, 2026);
    const sabados = new Set(sabadosDaFaCup(tier, 2026));
    assert.ok(sabados.size >= 4);
    assert.ok(fx.every(f => !sabados.has(f.date)), `${liga}: jogo num sabado de FA Cup`);
    assert.equal(new Set(fx.map(f => f.week)).size, 2 * (teams.length - 1), `${liga}: todas as rodadas`);
  }
});
