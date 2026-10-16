/**
 * HARNESS DE REGRESSÃO DO SIMULADOR TEXTUAL
 * =========================================
 * Uso:  npx tsx tools/simCheck.ts [--matches=760] [--seed=20260804] [--json=arquivo.json]
 *
 * Roda N partidas com RNG determinístico (mesma seed => mesmo resultado) e afere:
 *   1. INVARIANTES  — coisas que nunca podem acontecer (falha = bug).
 *   2. CALIBRAÇÃO   — métricas comparadas a faixas do futebol real.
 *   3. SENSIBILIDADE— força de elenco e táticas precisam alterar o resultado.
 *
 * O objetivo é permitir ajustar uma parte do motor e confirmar na hora
 * que nenhuma outra regrediu.
 *
 * ---------------------------------------------------------------------------
 * RESÍDUOS CONHECIDOS (esperados vermelhos, não são regressões novas)
 * ---------------------------------------------------------------------------
 * 1. "Pior(casa) x Melhor — vitórias %" ~37% (faixa 15–36%).
 *    O azarão em casa ainda se dá bem demais. O mando pesa um pouco mais que a
 *    qualidade do elenco. Só é totalmente corrigível separando a vantagem de
 *    mando por contexto (torcida, viagem) em vez de um multiplicador único.
 *
 * 2. "Nenhum arranjo de setor domina" ~13 p.p. (faixa 0–12).
 *    Focar o centro rende um pouco mais que focar os lados, porque no 4-4-2
 *    padrão as posições centrais (CB/CM/ST) são mais populosas que as de ponta.
 *    É uma propriedade legítima da formação, não um exploit — some quando a
 *    formação muda. Vira problema de verdade se passar de ~20 p.p.
 *
 * ATENÇÃO A RUÍDO: as métricas de SENSIBILIDADE têm erro-padrão de ~2,8 p.p.
 * com --sens=300. Use --sens=900 antes de concluir que algo mudou de verdade.
 */
import { generateLeagueData, generateFixtures } from '../textSim/dataGenerator';
import { simulateMatch, getTeamRatings, Lane } from '../textSim/matchEngine';
import { Team, Player, Fixture } from '../types';
import { writeFileSync } from 'fs';

// ---------------------------------------------------------------------------
// RNG DETERMINÍSTICO (mulberry32) — substitui Math.random para reprodutibilidade
// ---------------------------------------------------------------------------
const arg = (name: string, def: number) => {
  const m = process.argv.find(a => a.startsWith(`--${name}=`));
  return m ? Number(m.split('=')[1]) : def;
};
const SEED = arg('seed', 20260804);
const MATCHES = arg('matches', 760);
const SENS_MATCHES = arg('sens', 400);

let rngState = SEED >>> 0;
const mulberry32 = () => {
  rngState |= 0; rngState = (rngState + 0x6D2B79F5) | 0;
  let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const reseed = (s: number) => { rngState = s >>> 0; };
Math.random = mulberry32;

// ---------------------------------------------------------------------------
// RELATÓRIO
// ---------------------------------------------------------------------------
type Check = { name: string; ok: boolean; got: string; want: string; group: string };
const checks: Check[] = [];
const record = (group: string, name: string, got: number | string, lo?: number, hi?: number, unit = '') => {
  const num = typeof got === 'number';
  const ok = !num || ((lo === undefined || got >= lo) && (hi === undefined || got <= hi));
  const fmt = num ? (got as number).toFixed(2) + unit : String(got);
  const want = lo !== undefined && hi !== undefined ? `${lo}–${hi}${unit}` : (lo !== undefined ? `>= ${lo}${unit}` : 'informativo');
  checks.push({ group, name, ok: lo === undefined && hi === undefined ? true : ok, got: fmt, want });
  return ok;
};
const invariant = (name: string, ok: boolean, detail = '') => {
  checks.push({ group: 'INVARIANTES', name, ok, got: ok ? 'ok' : `FALHOU ${detail}`, want: 'ok' });
};

// ---------------------------------------------------------------------------
// SETUP
// ---------------------------------------------------------------------------
console.log(`\n⚙️  simCheck — seed=${SEED} partidas=${MATCHES}\n`);
const { teams, players } = generateLeagueData('45', 'bra_serie_a');
const fixtures = generateFixtures(teams, 'bra_serie_a');
if (teams.length === 0 || fixtures.length === 0) {
  console.error('❌ generateLeagueData/generateFixtures retornou vazio — abortado.');
  process.exit(1);
}


// ---------------------------------------------------------------------------
// PONTO DE OPERAÇÃO REALISTA
// generateLeagueData entrega o elenco em pré-temporada (preparo 45–55). No
// ciclo real da temporada o time recupera ~52 entre jogos e perde ~45 no jogo,
// então ele ENTRA EM CAMPO perto de 100. Medir com 50 calibrava o motor num
// ponto que o jogo nunca usa — e a diferença é grande (2,5 x 3,1 gols/jogo).
// ---------------------------------------------------------------------------
const KICKOFF_FITNESS = 100;
players.forEach(p => { p.fitness = KICKOFF_FITNESS; });

const byId = new Map(players.map(p => [p.id, p]));
const ovr = (t: Team) => {
  const ps = t.lineup.map(id => byId.get(id)).filter(Boolean) as Player[];
  return ps.reduce((a, p) => a + p.skill, 0) / (ps.length || 1);
};
// Snapshot das escalações para detectar mutação indevida pelo motor
const lineupSnapshot = new Map(teams.map(t => [t.id, [...t.lineup]]));
const tacticsSnapshot = new Map(teams.map(t => [t.id, JSON.stringify(t.tactics)]));

const freshFixture = (f: Fixture): Fixture => ({
  ...f, events: [], matchDeck: undefined, homeScore: null as any, awayScore: null as any,
  possessionTimeline: [], ballZoneTimeline: [], momentumHistory: [], momentum: 0,
  redCardedHome: [], redCardedAway: [], yellowCardedHome: [], yellowCardedAway: [],
  played: false, playerRatings: undefined,
});

// ---------------------------------------------------------------------------
// BATERIA PRINCIPAL
// ---------------------------------------------------------------------------
const M = {
  g: 0, hg: 0, ag: 0, hw: 0, aw: 0, dr: 0,
  shots: 0, sot: 0, corners: 0, fouls: 0, yel: 0, red: 0, offs: 0, pens: 0, inj: 0,
  xg: 0, poss: 0, subs: 0, cleanSheets: 0, ratedPlayers: 0, ratingSum: 0,
};
const dist: Record<string, number> = { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5+': 0 };
const goalMinutes: number[] = [];
let firstWon = 0, firstDrew = 0, firstLost = 0, withFirst = 0;

// coletores de invariantes
let nullScores = 0, nanStat = 0, emptyRedId = 0, ratingOutOfRange = 0;
let injuredStayedOn = 0, injuredChecked = 0, subsOverLimit = 0;
let ghostPlayerEvents = 0, eventsBeforeStart = 0, eventsAfterEnd = 0;
let laneUndefinedNarration = 0;

reseed(SEED);
for (let i = 0; i < MATCHES; i++) {
  const base = fixtures[i % fixtures.length];
  const r = simulateMatch(freshFixture(base), teams, players, 0, null, 'PT') as any;

  // ---- invariantes ----
  if (r.homeScore === null || r.awayScore === null || r.homeScore === undefined || r.awayScore === undefined) nullScores++;
  for (const k of ['homeShots', 'awayShots', 'homeXG', 'awayXG', 'homePossession', 'homeCorners', 'homeFouls']) {
    if (typeof r[k] !== 'number' || Number.isNaN(r[k])) nanStat++;
  }
  if ((r.redCardedHome || []).includes('') || (r.redCardedAway || []).includes('')) emptyRedId++;
  for (const v of Object.values(r.playerRatings || {}) as number[]) {
    if (typeof v !== 'number' || Number.isNaN(v) || v < 0 || v > 10) ratingOutOfRange++;
    M.ratedPlayers++; M.ratingSum += v;
  }
  const endMin = Math.max(...r.events.map((e: any) => e.minute), 0);
  for (const e of r.events) {
    if (e.minute < 0) eventsBeforeStart++;
    if (e.minute > 120) eventsAfterEnd++;
    if (e.playerId && !byId.has(e.playerId)) ghostPlayerEvents++;
    if (e.description && e.description.includes('undefined')) laneUndefinedNarration++;
  }
  if ((r.subsUsedHome || 0) > 5 || (r.subsUsedAway || 0) > 5) subsOverLimit++;

  // lesionado grave deve deixar o campo (via substituição) quando há banco
  for (const e of r.events) {
    if (e.type === 'INJURY' && e.injurySeverity === 'SEVERE' && e.playerId) {
      injuredChecked++;
      const leftField = r.events.some((s: any) => s.type === 'SUB' && s.minute >= e.minute &&
        (s.description || '').includes(byId.get(e.playerId!)?.name || ' '));
      if (!leftField) injuredStayedOn++;
    }
  }

  // ---- métricas ----
  const hs = Number(r.homeScore) || 0, as = Number(r.awayScore) || 0;
  M.g += hs + as; M.hg += hs; M.ag += as;
  if (hs > as) M.hw++; else if (as > hs) M.aw++; else M.dr++;
  if (hs === 0 || as === 0) M.cleanSheets++;
  M.shots += r.homeShots + r.awayShots; M.sot += r.homeShotsOnTarget + r.awayShotsOnTarget;
  M.corners += r.homeCorners + r.awayCorners; M.fouls += r.homeFouls + r.awayFouls;
  M.xg += r.homeXG + r.awayXG; M.poss += r.homePossession;
  M.subs += (r.subsUsedHome || 0) + (r.subsUsedAway || 0);
  const tot = hs + as;
  dist[tot >= 5 ? '5+' : String(tot)]++;

  let first: string | null = null;
  for (const e of r.events) {
    if (e.type === 'GOAL') { goalMinutes.push(e.minute); if (!first) first = e.teamId; }
    else if (e.type === 'CARD') { if (e.description.includes('🟥')) M.red++; else M.yel++; }
    else if (e.type === 'OFFSIDE') M.offs++;
    else if (e.type === 'INJURY') M.inj++;
    if (e.description && (e.description.includes('PÊNALTI') || e.description.includes('PENALTY!'))) M.pens++;
  }
  if (first) {
    withFirst++;
    const diff = first === base.homeTeamId ? hs - as : as - hs;
    if (diff > 0) firstWon++; else if (diff < 0) firstLost++; else firstDrew++;
  }
}

// mutação de estado global
let mutatedLineups = 0, mutatedTactics = 0;
teams.forEach(t => {
  if (JSON.stringify(lineupSnapshot.get(t.id)) !== JSON.stringify(t.lineup)) mutatedLineups++;
  if (tacticsSnapshot.get(t.id) !== JSON.stringify(t.tactics)) mutatedTactics++;
});

invariant('Placar nunca é null/undefined', nullScores === 0, `${nullScores} jogos`);
invariant('Estatísticas nunca são NaN', nanStat === 0, `${nanStat} ocorrências`);
invariant('Nenhum cartão vermelho com id vazio', emptyRedId === 0, `${emptyRedId} jogos`);
invariant('Notas dentro de 0–10', ratingOutOfRange === 0, `${ratingOutOfRange} notas`);
invariant('Nenhuma narração com "undefined"', laneUndefinedNarration === 0, `${laneUndefinedNarration} eventos`);
invariant('Nenhum evento com jogador inexistente', ghostPlayerEvents === 0, `${ghostPlayerEvents} eventos`);
invariant('Eventos dentro da janela 0–120min', eventsBeforeStart === 0 && eventsAfterEnd === 0, `${eventsBeforeStart}/${eventsAfterEnd}`);
invariant('Motor não altera team.lineup global', mutatedLineups === 0, `${mutatedLineups} times`);
invariant('Motor não altera team.tactics global', mutatedTactics === 0, `${mutatedTactics} times`);
invariant('Máximo de 5 substituições por time', subsOverLimit === 0, `${subsOverLimit} jogos`);
invariant('Lesão grave tira o jogador de campo', injuredChecked === 0 || injuredStayedOn / injuredChecked < 0.25,
  `${injuredStayedOn}/${injuredChecked} ficaram`);

// ---------------------------------------------------------------------------
// CALIBRAÇÃO — faixas de referência (Brasileirão Série A)
// ---------------------------------------------------------------------------
const per = (x: number) => x / MATCHES;
const pct = (x: number) => (x / MATCHES) * 100;

record('CALIBRAÇÃO', 'Gols por jogo', per(M.g), 2.30, 2.90);
record('CALIBRAÇÃO', 'Gols do mandante', per(M.hg), 1.20, 1.70);
record('CALIBRAÇÃO', 'Gols do visitante', per(M.ag), 0.95, 1.40);
record('CALIBRAÇÃO', 'Vitórias do mandante %', pct(M.hw), 40, 52, '%');
record('CALIBRAÇÃO', 'Empates %', pct(M.dr), 22, 32, '%');
record('CALIBRAÇÃO', 'Vitórias do visitante %', pct(M.aw), 22, 33, '%');
record('CALIBRAÇÃO', 'Posse do mandante %', M.poss / MATCHES, 50, 55, '%');
record('CALIBRAÇÃO', 'Chutes por jogo', per(M.shots), 18, 27);
record('CALIBRAÇÃO', 'Chutes no gol por jogo', per(M.sot), 6, 10);
record('CALIBRAÇÃO', 'xG por jogo', per(M.xg), 2.00, 3.00);
record('CALIBRAÇÃO', 'Desvio xG vs gols reais', Math.abs(per(M.xg) - per(M.g)), 0, 0.45);
record('CALIBRAÇÃO', 'Escanteios por jogo', per(M.corners), 8, 12);
record('CALIBRAÇÃO', 'Faltas por jogo', per(M.fouls), 22, 32);
record('CALIBRAÇÃO', 'Cartões amarelos por jogo', per(M.yel), 3.50, 6.00);
record('CALIBRAÇÃO', 'Cartões vermelhos por jogo', per(M.red), 0.12, 0.45);
record('CALIBRAÇÃO', 'Impedimentos por jogo', per(M.offs), 1.80, 3.60);
record('CALIBRAÇÃO', 'Pênaltis por jogo', per(M.pens), 0.15, 0.45);
record('CALIBRAÇÃO', 'Lesões por jogo', per(M.inj), 0.40, 1.60);
record('CALIBRAÇÃO', 'Substituições por jogo', per(M.subs), 4.00, 10.00);
record('CALIBRAÇÃO', 'Nota média dos jogadores', M.ratingSum / (M.ratedPlayers || 1), 5.80, 7.00);
record('CALIBRAÇÃO', 'Quem abre o placar vence %', (firstWon / (withFirst || 1)) * 100, 62, 78, '%');
record('CALIBRAÇÃO', 'Jogos 0 gols %', pct(dist['0']), 4, 12, '%');
record('CALIBRAÇÃO', 'Jogos 5+ gols %', pct(dist['5+']), 3, 12, '%');
const last30 = goalMinutes.filter(m => m > 60).length / (goalMinutes.length || 1) * 100;
record('CALIBRAÇÃO', 'Gols após os 60min %', last30, 36, 50, '%');

// ---------------------------------------------------------------------------
// SENSIBILIDADE
// ---------------------------------------------------------------------------
const sorted = [...teams].sort((a, b) => ovr(b) - ovr(a));
const runPair = (h: Team, a: Team, n: number, seed: number) => {
  reseed(seed);
  const fx = { ...fixtures[0], homeTeamId: h.id, awayTeamId: a.id, homeLineup: [...h.lineup], awayLineup: [...a.lineup] };
  let hw = 0, d = 0, aw = 0, hg = 0, ag = 0;
  for (let i = 0; i < n; i++) {
    const r = simulateMatch(freshFixture(fx as Fixture), teams, players, 0, null, 'PT') as any;
    const hs = Number(r.homeScore) || 0, as = Number(r.awayScore) || 0;
    hg += hs; ag += as;
    if (hs > as) hw++; else if (as > hs) aw++; else d++;
  }
  return { winPct: (hw / n) * 100, drawPct: (d / n) * 100, lossPct: (aw / n) * 100, gf: hg / n, ga: ag / n };
};

const strong = runPair(sorted[0], sorted[sorted.length - 1], SENS_MATCHES, SEED + 1);
const mid = runPair(sorted[Math.floor(teams.length / 2) - 1], sorted[Math.floor(teams.length / 2)], SENS_MATCHES, SEED + 2);
const weak = runPair(sorted[sorted.length - 1], sorted[0], SENS_MATCHES, SEED + 3);

record('SENSIBILIDADE', 'Melhor(casa) x Pior — vitórias %', strong.winPct, 62, 88, '%');
record('SENSIBILIDADE', 'Medianos — vitórias %', mid.winPct, 38, 55, '%');
// Faixa calibrada para ESTA base: o melhor e o pior elenco do Brasileirão diferem
// só ~8 pontos de OVR. Com uma diferença modesta assim, o azarão jogando em casa
// vencer ~1 em 3 é plausível. Em uma liga com elencos mais desiguais este teto
// deveria ser mais baixo.
record('SENSIBILIDADE', 'Pior(casa) x Melhor — vitórias %', weak.winPct, 15, 36, '%');
record('SENSIBILIDADE', 'Vantagem do elenco forte (p.p.)', strong.winPct - mid.winPct, 15, 100);
// A base real do Brasileirão é legitimamente achatada (~8 pontos de OVR entre
// o melhor e o pior). Informativo: quem precisa amplificar isso é o motor.
record('SENSIBILIDADE', 'Amplitude de OVR da liga', ovr(sorted[0]) - ovr(sorted[sorted.length - 1]));

// Táticas: variar apenas o mandante mediano
const A = sorted[Math.floor(teams.length / 2) - 1], B = sorted[Math.floor(teams.length / 2)];
const baseTac = JSON.parse(JSON.stringify(A.tactics));
const withTactics = (patch: any, seed: number) => {
  A.tactics = { ...baseTac, ...patch };
  const res = runPair(A, B, SENS_MATCHES, seed);
  A.tactics = JSON.parse(JSON.stringify(baseTac));
  return res;
};
const vDef = withTactics({ style: 'Very Defensive' }, SEED + 10);
const vOff = withTactics({ style: 'Very Offensive' }, SEED + 11);
const tSlow = withTactics({ tempo: 10 }, SEED + 12);
const tFast = withTactics({ tempo: 90 }, SEED + 13);
// Setores: torneio de todos-contra-todos. O teste anterior media cada escolha
// contra um adversário fixo no centro — e vencer atacando onde o adversário não
// está é contra-jogo correto, não desequilíbrio. O que não pode existir é uma
// configuração que vença TODAS as outras.
// A aba Tactics permite 1 ou 2 setores — os três nunca é alcançável.
const SECTOR_SETUPS: [string, Lane[]][] = [
  ['Center', ['Center']],
  ['Left', ['Left']],
  ['Left/Right', ['Left', 'Right']],
  ['Left/Center', ['Left', 'Center']],
];
const baseTacB = JSON.parse(JSON.stringify(B.tactics));
const sectorScore: Record<string, number> = {};
SECTOR_SETUPS.forEach(([nameA, secA], i) => {
  let pts = 0, games = 0;
  SECTOR_SETUPS.forEach(([, secB], j) => {
    if (i === j) return;
    A.tactics = { ...baseTac, focusSectors: secA };
    B.tactics = { ...baseTacB, focusSectors: secB };
    const r = runPair(A, B, Math.round(SENS_MATCHES / 2), SEED + 20 + i * 3 + j);
    pts += r.winPct + r.drawPct / 2; games++;
    // e o mesmo confronto com os mandos invertidos
    A.tactics = { ...baseTac, focusSectors: secB };
    B.tactics = { ...baseTacB, focusSectors: secA };
    const r2 = runPair(A, B, Math.round(SENS_MATCHES / 2), SEED + 40 + i * 3 + j);
    pts += (100 - r2.winPct - r2.drawPct / 2); games++;
  });
  sectorScore[nameA] = pts / games;
});
A.tactics = JSON.parse(JSON.stringify(baseTac));
B.tactics = JSON.parse(JSON.stringify(baseTacB));

const sectorVals = Object.values(sectorScore);
record('SENSIBILIDADE', 'Nenhum arranjo de setor domina (amplitude p.p.)',
  Math.max(...sectorVals) - Math.min(...sectorVals), 0, 12);

const secOne = withTactics({ focusSectors: ['Center'] }, SEED + 14);
const secTwo = withTactics({ focusSectors: ['Left', 'Right'] }, SEED + 15);
const secAll = withTactics({ focusSectors: ['Left', 'Center'] }, SEED + 16);

// O motor não pode mexer na escalação do time do treinador humano.
reseed(SEED + 77);
let userSubs = 0, cpuSubs = 0, userLineupChanged = 0;
for (let i = 0; i < 120; i++) {
  const base = fixtures[i % fixtures.length];
  const USER = base.homeTeamId;
  const antes = [...(teams.find(t => t.id === USER)?.lineup || [])];
  const r = simulateMatch(freshFixture(base), teams, players, 0, USER, 'PT') as any;
  userSubs += r.events.filter((e: any) => e.type === 'SUB' && e.teamId === USER).length;
  cpuSubs += r.events.filter((e: any) => e.type === 'SUB' && e.teamId === base.awayTeamId).length;
  if (JSON.stringify(r.homeLineup) !== JSON.stringify(antes)) userLineupChanged++;
}
invariant('Motor não substitui sozinho no time do usuário', userSubs === 0, `${userSubs} trocas`);
invariant('Escalação do usuário chega intacta ao fim do jogo', userLineupChanged === 0, `${userLineupChanged} jogos`);
invariant('CPU continua fazendo suas substituições', cpuSubs > 0, `${cpuSubs} trocas`);

// Determinismo: mesma seed => mesmo resultado
const det1 = runPair(sorted[0], sorted[1], 30, 999);
const det2 = runPair(sorted[0], sorted[1], 30, 999);
invariant('Determinismo (mesma seed => mesmo resultado)',
  JSON.stringify(det1) === JSON.stringify(det2), `${JSON.stringify(det1)} vs ${JSON.stringify(det2)}`);

// Ratings de setor coerentes
reseed(SEED);
const rt = getTeamRatings(A, players, true, new Set());
invariant('Ratings de setor finitos e positivos',
  [rt.defense.left, rt.defense.center, rt.defense.right, rt.midfield.center, rt.attack.center, rt.goalkeeping]
    .every(v => Number.isFinite(v) && v > 0));

// ---------------------------------------------------------------------------
// SAÍDA
// ---------------------------------------------------------------------------
const groups = ['INVARIANTES', 'CALIBRAÇÃO', 'SENSIBILIDADE'];
let failed = 0;
for (const gName of groups) {
  const rows = checks.filter(c => c.group === gName);
  if (!rows.length) continue;
  console.log(`\n── ${gName} ${'─'.repeat(Math.max(0, 60 - gName.length))}`);
  for (const c of rows) {
    if (!c.ok) failed++;
    const icon = c.ok ? '✅' : '❌';
    console.log(`${icon} ${c.name.padEnd(46)} ${c.got.padStart(9)}   (alvo ${c.want})`);
  }
}

console.log(`\n── DISTRIBUIÇÃO DE GOLS ${'─'.repeat(38)}`);
console.log(Object.entries(dist).map(([k, v]) => `${k}: ${pct(v).toFixed(1)}%`).join('   '));
console.log(`\n── CONFRONTOS ${'─'.repeat(48)}`);
const fmtPair = (l: string, r: any) => `${l.padEnd(26)} V ${r.winPct.toFixed(1)}%  E ${r.drawPct.toFixed(1)}%  D ${r.lossPct.toFixed(1)}%  |  ${r.gf.toFixed(2)}-${r.ga.toFixed(2)}`;
console.log(fmtPair('Melhor(casa) x Pior', strong));
console.log(fmtPair('Medianos', mid));
console.log(fmtPair('Pior(casa) x Melhor', weak));
console.log(fmtPair('Very Defensive', vDef));
console.log(fmtPair('Very Offensive', vOff));
console.log(fmtPair('tempo=10', tSlow));
console.log(fmtPair('tempo=90', tFast));
console.log('\nTorneio de setores (pontos %):', Object.entries(sectorScore).map(([k, v]) => `${k} ${v.toFixed(1)}`).join('  |  '));
console.log(fmtPair('setores: Center', secOne));
console.log(fmtPair('setores: Left/Right', secTwo));
console.log(fmtPair('setores: Esq/Centro', secAll));

const total = checks.filter(c => c.want !== 'informativo').length;
console.log(`\n${failed === 0 ? '✅ TUDO PASSOU' : `❌ ${failed} de ${total} verificações falharam`}\n`);

const jsonArg = process.argv.find(a => a.startsWith('--json='));
if (jsonArg) {
  writeFileSync(jsonArg.split('=')[1], JSON.stringify({ seed: SEED, matches: MATCHES, checks }, null, 2));
}
process.exit(failed === 0 ? 0 : 1);
