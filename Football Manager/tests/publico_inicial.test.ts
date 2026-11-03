import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLeagueData } from '../textSim/dataGenerator';

test('publico medio inicial: 60% da lotacao, com teto entre 30 000 e 32 000 (Maracana: 22 000)', () => {
  const { teams } = generateLeagueData('45', 'bra_serie_a') as any;
  for (const t of teams) {
    if (t.stadium === 'Maracanã' || t.stadium === 'Estádio do Maracanã') { assert.equal(t.avrAttendance, 22000); continue; }
    const esperado = Math.round(t.stadiumCapacity * 0.6);
    assert.ok(t.avrAttendance === esperado || (t.avrAttendance >= 30000 && t.avrAttendance <= 32000 && esperado > t.avrAttendance), `${t.name}: ${t.avrAttendance} (60% = ${esperado})`);
    assert.ok(t.avrAttendance <= 32000);
  }
});
