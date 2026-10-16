/**
 * AFINADOR DE PARÂMETROS
 * ======================
 * Uso: npx tsx tools/simTune.ts [--matches=300]
 *
 * Faz uma busca coordenada (um parâmetro por vez) sobre SIM_CONFIG, medindo as
 * métricas que importam e escolhendo o valor com menor erro contra os alvos.
 * Serve para achar a calibração; o veredito final é sempre o tools/simCheck.ts.
 */
import { generateLeagueData, generateFixtures } from '../textSim/dataGenerator';
import { simulateMatch, SIM_CONFIG } from '../textSim/matchEngine';
import { Team, Fixture } from '../types';
import { writeFileSync } from 'fs';

const arg = (n: string, d: number) => {
  const m = process.argv.find(a => a.startsWith(`--${n}=`));
  return m ? Number(m.split('=')[1]) : d;
};
const N = arg('matches', 300);
const SENS = arg('sens', 150);

let rngState = 20260804;
Math.random = () => {
  rngState |= 0; rngState = (rngState + 0x6D2B79F5) | 0;
  let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const reseed = (s: number) => { rngState = s >>> 0; };

const { teams, players } = generateLeagueData('45', 'bra_serie_a');
const fixtures = generateFixtures(teams, 'bra_serie_a');
const fresh = (f: Fixture): Fixture => ({
  ...f, events: [], matchDeck: undefined, homeScore: null as any, awayScore: null as any,
  possessionTimeline: [], ballZoneTimeline: [], momentumHistory: [], momentum: 0,
  redCardedHome: [], redCardedAway: [], yellowCardedHome: [], yellowCardedAway: [], played: false,
});


// ---------------------------------------------------------------------------
// PONTO DE OPERAÇÃO REALISTA
// generateLeagueData entrega o elenco em pré-temporada (preparo 45–55). No
// ciclo real da temporada o time recupera ~52 entre jogos e perde ~45 no jogo,
// então ele ENTRA EM CAMPO perto de 100. Medir com 50 calibrava o motor num
// ponto que o jogo nunca usa — e a diferença é grande (2,5 x 3,1 gols/jogo).
// ---------------------------------------------------------------------------
const KICKOFF_FITNESS = 100;
players.forEach(p => { p.fitness = KICKOFF_FITNESS; });

const ovrOf = (t: Team) => {
  const ps = t.lineup.map(id => players.find(p => p.id === id)).filter(Boolean) as any[];
  return ps.reduce((a, p) => a + p.skill, 0) / (ps.length || 1);
};
const ranked = [...teams].sort((a, b) => ovrOf(b) - ovrOf(a));

const pairWins = (h: Team, a: Team, n: number, seed: number) => {
  reseed(seed);
  const fx = { ...fixtures[0], homeTeamId: h.id, awayTeamId: a.id, homeLineup: [...h.lineup], awayLineup: [...a.lineup] };
  let w = 0;
  for (let i = 0; i < n; i++) {
    const r: any = simulateMatch(fresh(fx as Fixture), teams, players, 0, null, 'PT');
    if ((Number(r.homeScore) || 0) > (Number(r.awayScore) || 0)) w++;
  }
  return (w / n) * 100;
};

const measure = () => {
  reseed(20260804);
  let g = 0, hg = 0, hw = 0, aw = 0, dr = 0, yel = 0, red = 0, poss = 0, subs = 0, zero = 0, big = 0;
  for (let i = 0; i < N; i++) {
    const r: any = simulateMatch(fresh(fixtures[i % fixtures.length]), teams, players, 0, null, 'PT');
    const hs = Number(r.homeScore) || 0, as = Number(r.awayScore) || 0;
    g += hs + as; hg += hs; poss += r.homePossession;
    subs += (r.subsUsedHome || 0) + (r.subsUsedAway || 0);
    if (hs > as) hw++; else if (as > hs) aw++; else dr++;
    if (hs + as === 0) zero++;
    if (hs + as >= 5) big++;
    for (const e of r.events) if (e.type === 'CARD') { if (e.description.includes('🟥')) red++; else yel++; }
  }
  const strong = pairWins(ranked[0], ranked[ranked.length - 1], SENS, 111);
  const mid = pairWins(ranked[9], ranked[10], SENS, 222);
  return {
    goals: g / N, homeGoals: hg / N, homeWin: (hw / N) * 100, draw: (dr / N) * 100, awayWin: (aw / N) * 100,
    yellow: yel / N, red: red / N, poss: poss / N, subs: subs / N,
    zeroPct: (zero / N) * 100, bigPct: (big / N) * 100, strong, mid, edge: strong - mid,
  };
};

// Alvos e pesos do erro
const TARGETS: [keyof ReturnType<typeof measure>, number, number][] = [
  ['goals', 2.55, 3.0], ['homeWin', 46, 1.0], ['draw', 27, 0.8], ['awayWin', 27, 1.0],
  ['yellow', 4.7, 0.6], ['red', 0.25, 3.0], ['poss', 52.5, 0.8], ['subs', 6.0, 0.3],
  ['zeroPct', 8, 0.4], ['edge', 26, 1.2], ['strong', 68, 0.8],
];
const cost = (m: ReturnType<typeof measure>) =>
  TARGETS.reduce((acc, [k, target, w]) => acc + w * Math.abs((m[k] as number) - target) / Math.max(1, Math.abs(target)), 0);

type Knob = { path: string; values: number[] };
const get = (path: string): number => path.split('.').reduce((o: any, k) => o[k], SIM_CONFIG as any);
const set = (path: string, v: number) => {
  const parts = path.split('.');
  const last = parts.pop()!;
  const obj = parts.reduce((o: any, k) => o[k], SIM_CONFIG as any);
  obj[last] = v;
};

const KNOBS: Knob[] = [
  { path: 'goalChanceScale', values: [14, 20, 26, 32, 38, 44, 52, 60] },
  { path: 'strengthExponent', values: [1.6, 2.2, 2.8, 3.4, 4.0, 4.6, 5.4] },
  { path: 'defenseFloor', values: [6, 10, 14, 18, 24, 30] },
  { path: 'attackFloor', values: [2, 5, 8, 12, 18] },
  { path: 'homeAttackBonus', values: [1.0, 1.06, 1.12, 1.18, 1.25] },
  { path: 'homePossessionBonus', values: [0, 8, 14, 20, 28] },
  { path: 'yellowByAggression.Balanced', values: [10, 13, 15, 18, 22] },
  { path: 'redByAggression.Balanced', values: [0.02, 0.035, 0.05, 0.08] },
];

console.log(`Afinando com ${N} partidas por avaliação...\n`);
let best = measure();
let bestCost = cost(best);
console.log(`inicial: custo=${bestCost.toFixed(4)}  gols=${best.goals.toFixed(2)} casa=${best.homeWin.toFixed(1)}% vantagem=${best.edge.toFixed(1)}pp`);

for (let pass = 1; pass <= 2; pass++) {
  for (const knob of KNOBS) {
    const original = get(knob.path);
    let bestVal = original;
    for (const v of knob.values) {
      set(knob.path, v);
      // amarelo/vermelho: manter a escala relativa entre os níveis
      if (knob.path.endsWith('.Balanced')) {
        const grp = knob.path.startsWith('yellow') ? SIM_CONFIG.yellowByAggression : SIM_CONFIG.redByAggression;
        const r = knob.path.startsWith('yellow') ? [1.73, 1.33, 1, 0.67, 0.4] : [2.6, 1.6, 1, 0.6, 0.4];
        ['Very Aggressive', 'Aggressive', 'Balanced', 'Passive', 'Very Passive'].forEach((k, i) => { grp[k] = +(v * r[i]).toFixed(3); });
      }
      const m = measure();
      const c = cost(m);
      if (c < bestCost) { bestCost = c; bestVal = v; best = m; }
    }
    set(knob.path, bestVal);
    if (knob.path.endsWith('.Balanced')) {
      const grp = knob.path.startsWith('yellow') ? SIM_CONFIG.yellowByAggression : SIM_CONFIG.redByAggression;
      const r = knob.path.startsWith('yellow') ? [1.73, 1.33, 1, 0.67, 0.4] : [2.6, 1.6, 1, 0.6, 0.4];
      ['Very Aggressive', 'Aggressive', 'Balanced', 'Passive', 'Very Passive'].forEach((k, i) => { grp[k] = +(bestVal * r[i]).toFixed(3); });
    }
    console.log(`passe ${pass} · ${knob.path.padEnd(28)} = ${String(bestVal).padStart(6)}   custo=${bestCost.toFixed(4)}`);
  }
}

best = measure(); // re-mede com a configuração final escolhida
const tuned = {
  goalChanceScale: SIM_CONFIG.goalChanceScale,
  strengthExponent: SIM_CONFIG.strengthExponent,
  attackFloor: SIM_CONFIG.attackFloor,
  defenseFloor: SIM_CONFIG.defenseFloor,
  gkWeight: SIM_CONFIG.gkWeight,
  homeAttackBonus: SIM_CONFIG.homeAttackBonus,
  homePossessionBonus: SIM_CONFIG.homePossessionBonus,
  yellowByAggression: SIM_CONFIG.yellowByAggression,
  redByAggression: SIM_CONFIG.redByAggression,
};
console.log('\n=== MELHOR CONFIGURAÇÃO ===');
console.log(JSON.stringify(tuned, null, 2));
writeFileSync('tools/simConfig.tuned.json', JSON.stringify(tuned, null, 2));
console.log('\n=== MÉTRICAS ===');
console.log(`gols/jogo      ${best.goals.toFixed(2)}   (alvo 2.55)`);
console.log(`V/E/D casa     ${best.homeWin.toFixed(1)}% / ${best.draw.toFixed(1)}% / ${best.awayWin.toFixed(1)}%`);
console.log(`posse casa     ${best.poss.toFixed(1)}%`);
console.log(`amarelos       ${best.yellow.toFixed(2)}   vermelhos ${best.red.toFixed(2)}`);
console.log(`substituições  ${best.subs.toFixed(2)}`);
console.log(`0x0            ${best.zeroPct.toFixed(1)}%   5+ gols ${best.bigPct.toFixed(1)}%`);
console.log(`forte x fraco  ${best.strong.toFixed(1)}%   medianos ${best.mid.toFixed(1)}%   vantagem ${best.edge.toFixed(1)}pp`);
