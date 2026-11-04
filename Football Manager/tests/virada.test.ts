import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, simulateWorldTo, buildTable, WorldLeague } from '../textSim/world';
import { generateLeagueData, generateFixtures } from '../textSim/dataGenerator';
import { calcularVirada, divisoesAtuais, aplicarDivisoes, paisDaLiga } from '../textSim/virada';

// A liga do utilizador (Serie A) como uma liga simulada; o resto e o mundo.
const preparar = () => {
  const mundo = createWorld('bra_serie_a', '2026-12-31');
  const { teams } = generateLeagueData('45', 'bra_serie_a');
  const A = simulateWorldTo([{ countryId: '45', countryName: 'Brazil', leagueId: 'bra_serie_a', leagueName: 'A', tier: 1, relegated: 4, teams, fixtures: generateFixtures(teams, 'bra_serie_a') } as WorldLeague], '2026-12-31')[0];
  return { mundo, A };
};

test('virada: a Serie A rebaixa os 4 ultimos e recebe os 4 primeiros da B; o tamanho das ligas nao muda', () => {
  const antes = divisoesAtuais();
  try {
    const { mundo, A } = preparar();
    const tabA = buildTable(A.teams, A.fixtures).map(r => r.team.id);
    const B = mundo.find(l => l.leagueId === 'bra_serie_b') as WorldLeague;
    const tabB = buildTable(B.teams, B.fixtures).map(r => r.team.id);
    const r = calcularVirada({ teams: A.teams, fixtures: A.fixtures, userLeagueId: 'bra_serie_a', userTeamId: tabA[0], world: mundo, comps: null }, () => 0.5);
    aplicarDivisoes(r.divisoes);
    const novaA = divisoesAtuais().ligas['bra_serie_a'].map(String), novaB = divisoesAtuais().ligas['bra_serie_b'].map(String);
    assert.equal(novaA.length, antes.ligas['bra_serie_a'].length);
    assert.equal(novaB.length, antes.ligas['bra_serie_b'].length);
    for (const id of tabA.slice(-4)) { assert.ok(!novaA.includes(id), 'rebaixado fora da A'); assert.ok(novaB.includes(id), 'rebaixado na B'); }
    for (const id of tabB.slice(0, 4)) { assert.ok(novaA.includes(id), 'promovido na A'); assert.ok(!novaB.includes(id), 'promovido fora da B'); }
    assert.equal(r.ligaDoUtilizador, 'bra_serie_a', 'o campeao fica na A');
    assert.equal(new Set(novaA.concat(novaB)).size, novaA.length + novaB.length, 'nenhum clube duplicado');
  } finally { aplicarDivisoes(antes); }
});

test('virada: o utilizador rebaixado muda de liga', () => {
  const antes = divisoesAtuais();
  try {
    const { mundo, A } = preparar();
    const ultimo = buildTable(A.teams, A.fixtures).map(r => r.team.id).pop() as string;
    const r = calcularVirada({ teams: A.teams, fixtures: A.fixtures, userLeagueId: 'bra_serie_a', userTeamId: ultimo, world: mundo, comps: null }, () => 0.5);
    assert.equal(r.ligaDoUtilizador, 'bra_serie_b');
  } finally { aplicarDivisoes(antes); }
});

test('divisoes: salvar e repor devolve as mesmas ligas', () => {
  const d = divisoesAtuais();
  aplicarDivisoes(JSON.parse(JSON.stringify(d)));
  assert.deepEqual(divisoesAtuais(), d);
  assert.equal(paisDaLiga('bra_serie_b'), '45');
});
