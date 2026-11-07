# Energy & Match Form System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the three-pillar physical system (Match Form tank, daily Energy draining, Stamina as efficiency) with Stars multiplier, exaustão penalty, and post-match tactical rewards.

**Architecture:** Separate `fitness` into `matchForm` (0-100 tank, +0.5/min > 15 in match) and `energia` (0-100% daily, drains per training/match via `100/stamina` multiplier). Stars multiply XP gains. Exaustão (energia < 75%) reduces XP to 0.8x / 0.5x / 0.1x. TAC post-match varies by performance rating (8.0 = 1.2x, 4.0 = 0.5x). UI: replace "fitness bar" with "energy bar", display Match Form separately in overview.

**Tech Stack:** React/TypeScript, GameContext for daily loop, trainingService for XP formulas, simulador3dCliente for post-match integration.

## Global Constraints

- Base XP per point: `PONTOS_POR_ATRIBUTO = 25` (25 pts = +1 attribute)
- Ceiling: `TETO_PONTOS_TREINO = 375` per attribute
- Age factor applies to all XP (young 1.5x, old 0.5x, rest 1.0x)
- Energy cost formula: `costReal = costBase * (100 / stamina)`
- Match Form cap: 100; floor: 0
- Daily energy recovery: rest +30%, training sessions drain per activity
- Weekly limits per category: [TEC: 12, TAC: 10, FIS: 8, MEN: 8] periods/week

---

## Task 1: Add Player Type Fields (matchForm, energia)

**Files:**
- Modify: `types.ts:146-222` (Player interface)

**Interfaces:**
- Consumes: None (base type)
- Produces: `Player.matchForm: number` (0-100), `Player.energia?: number` (0-100, default 100)

- [ ] **Step 1: Read Player interface**

```bash
grep -A 50 "^export interface Player" types.ts
```

- [ ] **Step 2: Add fields to Player interface**

At line 152 (after `skill: number`), add:

```typescript
  /** Match Form / Tank (0-100): size of the tank, grows with match minutes (>15min: +0.5/min). */
  matchForm: number;
  /** Daily Energy (0-100%): consumed by training/matches, recovered with rest. Default 100. */
  energia?: number;
```

- [ ] **Step 3: Update Player initialization**

Search for places that initialize Player (dataGenerator, generateLeagueData, etc.) and ensure new players have:

```typescript
matchForm: 50,  // midrange starting tank
energia: 100,   // full energy at start
```

- [ ] **Step 4: Commit**

```bash
git add types.ts
git commit -m "feat: add matchForm and energia fields to Player type"
```

---

## Task 2: Add Stars Multiplier Constant & Update XP Calculation

**Files:**
- Modify: `trainingService.ts:1-20` (constants section)
- Modify: `context/GameContext.tsx` (XP final calculation, around line 1339)

**Interfaces:**
- Consumes: `Player.potential` or `Player.potentialEstimate` (50-99 range)
- Produces: `STAR_MULTIPLIERS: Record<number, number>` (1 to 5 stars → 0.6x to 1.4x)

- [ ] **Step 1: Add stars multiplier table to trainingService.ts**

After `TETO_PONTOS_TREINO`, add:

```typescript
/** Stars (1-5) → XP multiplier. Derived from Player.potential or .potentialEstimate. */
export const STAR_MULTIPLIERS = {
  1: 0.6,   // ⭐
  2: 0.8,   // ⭐⭐
  3: 1.0,   // ⭐⭐⭐
  4: 1.2,   // ⭐⭐⭐⭐
  5: 1.4    // ⭐⭐⭐⭐⭐
};

/** Stars from potential (50-99): convert potential to 1-5 stars. */
export const starsFromPotential = (potential?: number): number => {
  if (!potential) return 3;
  if (potential <= 55) return 1;
  if (potential <= 65) return 2;
  if (potential <= 80) return 3;
  if (potential <= 90) return 4;
  return 5;
};
```

- [ ] **Step 2: Update GameContext.tsx XP calculation**

Around line 1339 in `reportMatchEvent` where `XP Final = XP Bruto * Modificador(Idade)...`:

Replace the line that calculates `points`:

```typescript
// OLD:
// const points = (gains[key] || 0) * ageFactor;

// NEW:
const starsMultiplier = STAR_MULTIPLIERS[starsFromPotential(p.potential)];
const points = (gains[key] || 0) * ageFactor * starsMultiplier;
```

Add import at top:
```typescript
import { STAR_MULTIPLIERS, starsFromPotential } from '../textSim/trainingService';
```

- [ ] **Step 3: Test: Verify stars multiplier applies**

Create a test player with potential 95 (5 stars = 1.4x). Simulate training and verify XP gains are 1.4x the base.

- [ ] **Step 4: Commit**

```bash
git add trainingService.ts context/GameContext.tsx
git commit -m "feat: add stars multiplier to training XP gains"
```

---

## Task 3: Implement Energy System (Rename fitness → energia)

**Files:**
- Modify: `context/GameContext.tsx` (all references to `fitness` in training/match loops)
- Modify: `components/TrainingView.tsx` (if displays fitness)
- Modify: `components/MatchDay.tsx` or player card components (UI)

**Interfaces:**
- Consumes: `Player.energia` (0-100%), `Player.stamina` (skill attribute, affects drain)
- Produces: Daily energy drain/recovery logic, match energy drain per minute

- [ ] **Step 1: Identify all `fitness` references in GameContext**

```bash
grep -n "\.fitness" context/GameContext.tsx | head -20
```

**Key locations to replace:**
- Line 1030: `fitness: Math.min(100, ...)` → `energia: Math.min(100, ...)`
- Line 1225, 1227: injury fitness drop → energia drop
- Line 1599: update from 3D engine → energia update
- Line 1831, 1833, 1990, 1996: match minute drain/recovery

- [ ] **Step 2: Replace fitness → energia in daily training loop (advanceDay)**

Around line 1030, change:

```typescript
// OLD:
fitness: Math.min(100, Math.max(0, p.fitness + dailyRecovery)),

// NEW:
energia: Math.min(100, Math.max(0, (p.energia ?? 100) + dailyRecovery)),
```

Also initialize energy on new players (line 1296):

```typescript
if (!p.trainingAccumulated) {
  p.trainingAccumulated = { def: 0, pas: 0, drb: 0, sht: 0, mor: 0 };
  p.energia = 100;  // NEW
}
```

- [ ] **Step 3: Replace fitness → energia in injury handling**

Around lines 1225, 1227, 1463:

```typescript
// OLD:
p.fitness = Math.max(0, (p.fitness || 100) - 15);

// NEW:
p.energia = Math.max(0, (p.energia ?? 100) - 15);
```

- [ ] **Step 4: Replace fitness → energia in match energy updates (all references)**

Search for `fitness: Math.max(0` and replace with `energia: Math.max(0`. Key lines: ~1599, ~1831, ~1990.

- [ ] **Step 5: Update 3D bridge message handler (tipo: 'energia')**

Around line 1590-1600, the message handler already maps motor stamina to `fitness`. Change variable name:

```typescript
} else if (m.tipo === 'energia') {
  const mapa: Record<string, number> = m.mapa || {};
  setPlayers(prev => prev.map(p => {
    const d = (/(\d+)$/.exec(String(p.id)) || [])[1];
    const e = d !== undefined ? mapa[d] : undefined;
    return (typeof e === 'number' && e !== p.energia) ? { ...p, energia: Math.max(0, Math.min(100, e)) } : p;
  }));
}
```

- [ ] **Step 6: Update UI components (TrainingView, player cards)**

Search for components that display "Fitness" bar:

```bash
grep -r "fitness" components/ --include="*.tsx" | grep -i bar
```

Replace labels with "Energy" and bind to `p.energia` instead of `p.fitness`.

- [ ] **Step 7: Test: Verify energy drains and recovers**

- Run advanceDay() multiple times.
- Verify: resting day → +15 energia; training day → -X energia (variable per activity).
- Verify: 3D engine sends energy updates and UI reflects them.

- [ ] **Step 8: Commit**

```bash
git add context/GameContext.tsx components/
git commit -m "refactor: rename fitness to energia (daily energy system)"
```

---

## Task 4: Implement Drain Multiplier (Energy Cost = costBase × 100/stamina)

**Files:**
- Modify: `context/GameContext.tsx` (advanceDay, match minute loop)
- Modify: `textSim/trainingService.ts` (add drain cost constants per activity)

**Interfaces:**
- Consumes: `Player.stamina` (skill attribute, 50-100), `ACTIVITIES[].impacts` (STM value)
- Produces: Real energy cost per activity = `costBase * (100 / stamina)`

- [ ] **Step 1: Define energy cost base for each training category**

In `trainingService.ts`, after ACTIVITIES, add:

```typescript
/** Energy cost base for each activity (0-100% energy drain, before stamina multiplier). */
export const ENERGY_COST_BASE: Record<string, number> = {
  'passing': 15,
  'longpass': 15,
  'control': 15,
  'wingplay': 20,        // harder
  'crossing': 15,
  'shooting': 15,
  'longshots': 20,       // harder
  'finishing': 20,       // harder
  'volleys': 20,         // harder
  'aerial': 20,          // harder
  'setpieces': 15,
  'penalties': 15,
  'tackling': 18,
  'sliding': 25,         // much harder
  'marking': 22,         // harder
  'def_pos': 15,
  'positioning': 15,
  'vision': 18,
  'pressing': 30,        // very hard
  'playmaking': 20,
  'transition': 20,
  'cardio': 25,
  'sprints': 30,         // very hard
  'acceleration': 25,
  'agility': 20,
  'jumping': 22,
  'strength': 28,
  'balance': 20,
  'recovery': -30,       // recovery adds energy
  'aggression': 15,
  'reactions': 12,
  'composure': 12,
  'consistency': 12,
  'video': 5,            // mental, low cost
  'teambuilding': 10,
  'shadow': 15,
  'focus': 12
};
```

- [ ] **Step 2: Calculate drain multiplier function**

In `trainingService.ts`, add:

```typescript
/** Drain multiplier based on player stamina. Higher stamina = lower drain. */
export const drainMultiplier = (stamina: number): number => {
  return 100 / Math.max(50, Math.min(100, stamina));
};
```

- [ ] **Step 3: Apply drain multiplier in daily training loop**

In `GameContext.tsx`, around line 970-1030 (advanceDay), change daily recovery calculation:

Before: `fitness: Math.min(100, ...p.fitness + dailyRecovery)`

After daily training is applied, calculate real energy cost:

```typescript
const drainMultiplierVal = drainMultiplier(p.stamina);
const realEnergyCost = dailyRecovery < 0 
  ? dailyRecovery * drainMultiplierVal  // training drains more if stamina is low
  : dailyRecovery;  // recovery sessions restore flat, not affected by drain

return {
  ...p,
  energia: Math.min(100, Math.max(0, (p.energia ?? 100) + realEnergyCost))
};
```

Import in GameContext:
```typescript
import { drainMultiplier, ENERGY_COST_BASE } from '../textSim/trainingService';
```

- [ ] **Step 4: Apply drain multiplier in match minute loop**

Around line 1831 (perMinute drain in match):

```typescript
// OLD:
// let newFit = p.fitness - (perMinute * injuryMultiplier);

// NEW:
const drain = drainMultiplier(p.stamina);
let newEnergia = p.energia - (perMinute * drain * injuryMultiplier);
```

- [ ] **Step 5: Test: Verify drain multiplier**

- Create player with stamina 50 (low): energy drain should be 100/50 = 2.0x.
- Create player with stamina 100 (high): energy drain should be 100/100 = 1.0x.
- Verify: low stamina player drains faster in same training session.

- [ ] **Step 6: Commit**

```bash
git add textSim/trainingService.ts context/GameContext.tsx
git commit -m "feat: implement energy drain multiplier (cost = costBase × 100/stamina)"
```

---

## Task 5: Implement Exaustão Penalty (Energy < 75% → XP Multiplier)

**Files:**
- Modify: `textSim/trainingService.ts` (add exaustão multiplier function)
- Modify: `context/GameContext.tsx` (apply to XP gains)

**Interfaces:**
- Consumes: `Player.energia` (0-100%)
- Produces: `exaustaoMultiplier(energia): number` (1.0 / 0.8 / 0.5 / 0.1)

- [ ] **Step 1: Add exaustão multiplier function**

In `trainingService.ts`, add:

```typescript
/** XP penalty for low energy. Energia > 75%: 1.0x, 50-74%: 0.8x, 25-49%: 0.5x, < 25%: 0.1x. */
export const exaustaoMultiplier = (energia: number): number => {
  if (energia > 75) return 1.0;
  if (energia > 49) return 0.8;
  if (energia > 24) return 0.5;
  return 0.1;
};
```

- [ ] **Step 2: Apply exaustão multiplier to daily training XP**

In `GameContext.tsx`, around line 1339 where XP is calculated:

```typescript
// OLD:
// const points = (gains[key] || 0) * ageFactor * starsMultiplier;

// NEW:
const exaustaoMult = exaustaoMultiplier(p.energia ?? 100);
const points = (gains[key] || 0) * ageFactor * starsMultiplier * exaustaoMult;
```

Import in GameContext:
```typescript
import { exaustaoMultiplier } from '../textSim/trainingService';
```

- [ ] **Step 3: Apply exaustão multiplier to match post-game TAC rewards**

In simulador3dCliente (aplicarResultado), around where TAC gains are added post-match:

```typescript
// (Will implement fully in Task 6; here just add placeholder)
// const exaustaoMult = exaustaoMultiplier(player.energia);
// tacGains *= exaustaoMult;
```

- [ ] **Step 4: Test: Verify exaustão reduces XP**

- Train player at 80% energy: XP normal.
- Train same player at 20% energy: XP should be 0.1x (nearly no growth).
- Verify: auditoriaTreino shows lower gains at low energy.

- [ ] **Step 5: Commit**

```bash
git add textSim/trainingService.ts context/GameContext.tsx
git commit -m "feat: add exaustão penalty (low energy reduces XP by 0.8x/0.5x/0.1x)"
```

---

## Task 6: Implement Match Form Tank (+0.5/min for > 15 min)

**Files:**
- Modify: `context/GameContext.tsx` (match minute loop, finalizar match)
- Modify: `3dMatch/simulador3dCliente.ts` (aplicarResultado)

**Interfaces:**
- Consumes: `Player.matchForm` (0-100), player minutes in match
- Produces: `matchForm` increments by 0.5 per minute played (if > 15 min) at end of match

- [ ] **Step 1: Add Match Form increment logic in match minute loop**

In `GameContext.tsx`, around the match processing loop (line 1800+), track minutes per player:

```typescript
const playerMinutes: Record<string, number> = {};

// (in the match loop where you process each minute)
for (const evt of events) {
  if (evt.type === 'SUBSTITUTION') {
    playerMinutes[evt.playerIdOn] = (playerMinutes[evt.playerIdOn] || 0) + (evt.minute || 0);
  }
}
```

- [ ] **Step 2: Apply Match Form at match end**

In finishMatchDayInstant or after match simulation, add:

```typescript
// Increase matchForm: +0.5 per minute played (if > 15 min)
setPlayers(prev => prev.map(p => {
  const mins = playerMinutes[p.id] || 0;
  if (mins > 15) {
    const matchFormGain = mins * 0.5;
    return {
      ...p,
      matchForm: Math.min(100, Math.max(0, (p.matchForm || 50) + matchFormGain))
    };
  }
  return p;
}));
```

- [ ] **Step 3: Initialize matchForm for all players**

In player initialization (around line 1296-1298):

```typescript
if (!p.matchForm) p.matchForm = 50;  // midrange starting tank
```

- [ ] **Step 4: Test: Verify Match Form grows**

- Play a match, player plays 45 min: matchForm should +22.5 (45 × 0.5).
- Verify cap at 100.
- Verify floor at 0.

- [ ] **Step 5: Commit**

```bash
git add context/GameContext.tsx
git commit -m "feat: add match form tank (grows +0.5 per minute played, cap 100)"
```

---

## Task 7: Implement Post-Match TAC Rewards by Performance Rating

**Files:**
- Modify: `3dMatch/simulador3dCliente.ts` (aplicarResultado)
- Modify: `textSim/trainingService.ts` (add ratingToTacMultiplier function)

**Interfaces:**
- Consumes: `RatingDetalhe.nota` (0-100), `Player.treino3d['tacticalAwa']` (or equivalent TAC skill)
- Produces: TAC XP bonus multiplied by performance (8.0 nota = 1.2x, 4.0 = 0.5x)

- [ ] **Step 1: Add performance → TAC multiplier in trainingService**

```typescript
/** TAC XP multiplier based on match rating. Rating 8.0 = 1.2x, rating 4.0 = 0.5x, neutral 6.0 = 1.0x. */
export const ratingToTacMultiplier = (rating: number): number => {
  // Linear interpolation: 0→0.3x, 4.0→0.5x, 6.0→1.0x, 8.0→1.2x, 10.0→1.3x
  if (rating <= 4) return 0.3 + (rating / 4) * 0.2;  // 0-4 range
  if (rating <= 6) return 0.5 + ((rating - 4) / 2) * 0.5;  // 4-6 range
  if (rating <= 8) return 1.0 + ((rating - 6) / 2) * 0.2;  // 6-8 range
  return 1.2 + ((rating - 8) / 2) * 0.1;  // 8-10 range, capped at ~1.3x
};
```

- [ ] **Step 2: Read aplicarResultado in simulador3dCliente**

```bash
grep -A 100 "export const aplicarResultado" 3dMatch/simulador3dCliente.ts | head -50
```

Look for where player performance/rating is processed post-match.

- [ ] **Step 3: Add TAC XP bonus in aplicarResultado**

After post-match rating processing, add:

```typescript
// Post-match TAC bonus based on performance
const tacMultiplier = ratingToTacMultiplier(playerRating.nota || 56);  // neutral = 56
const tacBonus = 5 * tacMultiplier;  // base 5 TAC XP per match played
player.trainingAccumulated = player.trainingAccumulated || { def: 0, pas: 0, drb: 0, sht: 0, mor: 0 };
// Apply to a 3D TAC skill (e.g., tacticalAwa) if not using trainingAccumulated['tac']
if (player.treino3d) {
  player.treino3d['tacticalAwa'] = (player.treino3d['tacticalAwa'] || 0) + tacBonus;
}
```

Import at top:
```typescript
import { ratingToTacMultiplier, PONTOS_POR_ATRIBUTO } from '../textSim/trainingService';
```

- [ ] **Step 4: Test: Verify TAC bonus scales with rating**

- Player rating 8.0 (good): TAC bonus = 5 × 1.2 = 6 points.
- Player rating 4.0 (poor): TAC bonus = 5 × 0.5 = 2.5 points.
- Verify: post-match training audit shows different TAC gains.

- [ ] **Step 5: Commit**

```bash
git add textSim/trainingService.ts 3dMatch/simulador3dCliente.ts
git commit -m "feat: add post-match TAC rewards scaled by player performance rating"
```

---

## Task 8: Update UI to Show Energy Bar Instead of Fitness

**Files:**
- Modify: `components/PlayerCard.tsx` or equivalent (main player display)
- Modify: `components/MatchDay.tsx` (pre-match energy display)
- Modify: `components/TrainingView.tsx` (energy depletion preview)

**Interfaces:**
- Consumes: `Player.energia` (0-100%), `Player.matchForm` (0-100)
- Produces: UI components display energia bar + separate matchForm indicator

- [ ] **Step 1: Find all player card / display components**

```bash
grep -r "fitness" components/ --include="*.tsx" | grep -i "bar\|display\|card" | cut -d: -f1 | sort -u
```

Expected files: PlayerCard, PlayerRatingsList, MatchDay, TrainingView, Lineup components.

- [ ] **Step 2: Replace "Fitness" label with "Energy" and bind to energia**

In each component, replace:

```typescript
// OLD:
<ProgressBar value={player.fitness} max={100} label="Fitness" />

// NEW:
<ProgressBar value={player.energia ?? 100} max={100} label="Energy" />
```

- [ ] **Step 3: Add Match Form indicator (separate from energy)**

In player overview/card, add Match Form display:

```typescript
<div className="match-form">
  <label>Match Form</label>
  <ProgressBar value={player.matchForm} max={100} />
</div>
```

- [ ] **Step 4: Update energy drain preview in TrainingView**

When player hovers over a training session, show predicted energy cost:

```typescript
const drainMultiplierVal = drainMultiplier(player.stamina);
const realCost = ENERGY_COST_BASE[activity.id] * drainMultiplierVal;
const predictedEnergy = player.energia - realCost;

<span className="energy-preview">{predictedEnergy.toFixed(0)}%</span>
```

- [ ] **Step 5: Test in browser**

- Open player card: energia bar visible, displays 0-100%.
- Play match: energia decreases per minute.
- Rest day: energia recovers +30%.
- Train hard day: energia drops 15-30%.

- [ ] **Step 6: Commit**

```bash
git add components/
git commit -m "ui: replace fitness bar with energy bar, add match form display"
```

---

## Task 9: Integrate Exaustão into Post-Match TAC (Prevent High Gains at Low Energy)

**Files:**
- Modify: `3dMatch/simulador3dCliente.ts` (aplicarResultado, TAC bonus calculation)

**Interfaces:**
- Consumes: `Player.energia` (0-100%), performance rating multiplier
- Produces: TAC bonus = base × ratingMultiplier × exaustaoMultiplier

- [ ] **Step 1: Apply exaustão to post-match TAC in aplicarResultado**

Modify the TAC bonus line from Task 7:

```typescript
// OLD:
// const tacBonus = 5 * tacMultiplier;

// NEW:
const exaustaoMult = exaustaoMultiplier(player.energia ?? 100);
const tacBonus = 5 * tacMultiplier * exaustaoMult;
```

Import:
```typescript
import { exaustaoMultiplier } from '../textSim/trainingService';
```

- [ ] **Step 2: Test: Verify low-energy players don't gain TAC**

- Player at 80% energy, rating 8.0: TAC bonus = 5 × 1.2 × 1.0 = 6.
- Player at 20% energy, rating 8.0: TAC bonus = 5 × 1.2 × 0.1 = 0.6.

- [ ] **Step 3: Commit**

```bash
git add 3dMatch/simulador3dCliente.ts
git commit -m "feat: apply exaustão penalty to post-match TAC rewards"
```

---

## Task 10: Update auditoriaTreino to Include Energy & Stars

**Files:**
- Modify: `tools/auditoriaTreino.ts` (audit script)

**Interfaces:**
- Consumes: Energy drain logic, Stars multiplier
- Produces: Console output showing energy state, XP gains with stars applied

- [ ] **Step 1: Add energy tracking to simulation loop**

In auditoriaTreino.ts, around line 94, initialize:

```typescript
// OLD:
// let fit = 100, minFit = 100, ...

// NEW:
let fit = 100, minFit = 100, energia = 100, minEnergia = 100, ...
```

- [ ] **Step 2: Apply energy drain per training session**

In simulation loop (line 100-110), calculate real energy cost:

```typescript
const drainMult = 100 / (atributos3d(p).stamina || 100);
const realCost = energyCost * drainMult;
energia = Math.max(0, energia - realCost);
```

- [ ] **Step 3: Apply stars multiplier to training output**

Around line 107, update XP calculation:

```typescript
// OLD:
// p.treino3d[i.campo] = Math.min(...(p.treino3d[i.campo] || 0) + i.value * FATOR_IDADE(p.age))

// NEW:
const starsMult = STAR_MULTIPLIERS[starsFromPotential(p.potential)];
const xpFinal = i.value * FATOR_IDADE(p.age) * starsMult;
p.treino3d[i.campo] = Math.min(...(p.treino3d[i.campo] || 0) + xpFinal);
```

- [ ] **Step 4: Output energy summary**

At end of sim output, show:

```typescript
L(`  energia no jogo ${energia.toFixed(0)} (min ${minEnergia.toFixed(0)}, ${abaixo70}/${jogos} jogos abaixo de 70)`);
```

- [ ] **Step 5: Test: Run audit**

```bash
npx tsx tools/auditoriaTreino.ts
```

Verify: energy drains and recovers, stars multiplier appears in gains.

- [ ] **Step 6: Commit**

```bash
git add tools/auditoriaTreino.ts
git commit -m "test: update training audit to include energy and stars tracking"
```

---

## Task 11: Update CPU Training to Use Energy & Stars

**Files:**
- Modify: `textSim/trainingService.ts` (cpuAplicarTreino, cpuPlanoDoDia)

**Interfaces:**
- Consumes: `Player.energy`, `Player.stars` (via potential)
- Produces: CPU training applies energy drain + stars multiplier

- [ ] **Step 1: Update cpuPlanoDoDia to check energy**

Around line 74:

```typescript
// OLD:
// const descansa = diasParaOJogo <= 1 || media < 82;

// NEW:
const mediaEnergia = aptos.length ? aptos.reduce((s, p) => s + (p.energia ?? 100), 0) / aptos.length : 100;
const descansa = diasParaOJogo <= 1 || media < 82 || mediaEnergia < 30;  // Also rest if energy is very low
```

- [ ] **Step 2: Update cpuAplicarTreino to apply stars multiplier**

Around line 82-90:

```typescript
// OLD:
// (acc as any)[attr] += 3 * fator;

// NEW:
const starsMult = STAR_MULTIPLIERS[starsFromPotential(p.potential)];
(acc as any)[attr] += 3 * fator * starsMult;
```

- [ ] **Step 3: Test: Verify CPU players grow with stars**

- Simulate season, CPU team.
- Verify: high-potential CPU players grow faster (stars multiplier applied).

- [ ] **Step 4: Commit**

```bash
git add textSim/trainingService.ts
git commit -m "feat: update CPU training to apply stars multiplier and check energy"
```

---

## Task 12: Run Comprehensive Test & Manual Verification

**Files:**
- Test: Browser, match simulation, full season

**Interfaces:**
- Consumes: All changes from Tasks 1-11
- Produces: Verified system behavior

- [ ] **Step 1: Test energy drains and recovers**

- Play a match: player energia should drop per minute.
- Rest day: energia +30%.
- Training day: energia -15 to -30%.

- [ ] **Step 2: Test match form grows**

- Play 45-min match: matchForm should +22.5.
- Play 10-min match: matchForm should +5.

- [ ] **Step 3: Test stars multiplier**

- High-potential player (5⭐): train 2x/week, verify +3 per week (vs normal ~2.1).
- Low-potential player (1⭐): train 2x/week, verify +1.26 per week.

- [ ] **Step 4: Test exaustão penalty**

- Train at 80% energia: normal XP.
- Train at 20% energia: XP = 0.1x (nearly nothing).

- [ ] **Step 5: Test post-match TAC bonus**

- Player rating 8.0, energy 80%: TAC bonus visible.
- Player rating 4.0, energy 80%: TAC bonus reduced.
- Player rating 8.0, energy 20%: TAC bonus very low.

- [ ] **Step 6: Run full season simulation**

- Start new save.
- Advance 38 weeks.
- Verify: energy cycling, match form growth, stars multiplier, exaustão penalty all working.
- Check auditoriaTreino output matches observed behavior.

- [ ] **Step 7: Verify UI displays correctly**

- Energy bar shows 0-100%.
- Match form visible in player overview.
- Energy drain preview in training view.

- [ ] **Step 8: Commit final verification**

```bash
git add .
git commit -m "test: comprehensive system verification (energy, matchform, stars, exaustão, TAC bonus)"
```

---

## Spec Coverage Checklist

- [x] Match Form (0-100 tank, +0.5/min > 15)
- [x] Energia (0-100% daily, drains per training/match)
- [x] Stamina as drain multiplier (100/stamina)
- [x] Stars multiplier on training XP (0.6x-1.4x)
- [x] Exaustão penalty (1.0x / 0.8x / 0.5x / 0.1x)
- [x] Post-match TAC rewards by performance (0.3x-1.3x)
- [x] Energy bar UI (replaces fitness bar)
- [x] Match Form display in overview
- [x] CPU training integration
- [x] Audit tool updates
- [x] Post-match exaustão integration

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-01-07-energy-matchform-system.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** - Fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
