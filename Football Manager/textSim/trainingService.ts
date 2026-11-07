
/** Minutos de "jogar junto" que cada ponto de impacto CHE (ex.: Analysis) soma a cada par de jogadores do grupo: o Chemistry (textSim/quimica.ts) sobe com eles. */
export const MINUTOS_POR_PONTO_CHE = 60;

/** Pontos de treino que valem +1 num atributo do 3D (Player.treino3d). Calibrado com tools/auditoriaTreino.ts: uma sessao 2x por semana numa temporada de 38 semanas da ~+3. */
export const PONTOS_POR_ATRIBUTO = 25;
/** Teto de pontos de treino por atributo (+15 no atributo). */
export const TETO_PONTOS_TREINO = 15 * PONTOS_POR_ATRIBUTO;

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

/** XP penalty for low energy. Energia > 75%: 1.0x, 50-74%: 0.8x, 25-49%: 0.5x, < 25%: 0.1x. */
export const exaustaoMultiplier = (energia: number): number => {
  if (energia > 75) return 1.0;
  if (energia > 49) return 0.8;
  if (energia > 24) return 0.5;
  return 0.1;
};

/** Drain multiplier based on player stamina. Higher stamina = lower drain. Formula: 100 / stamina. */
export const drainMultiplier = (stamina: number): number => {
  return 100 / Math.max(50, Math.min(100, stamina));
};

/** TAC XP multiplier based on match rating. Rating 8.0 = 1.2x, rating 4.0 = 0.5x, neutral 6.0 = 1.0x. */
export const ratingToTacMultiplier = (rating: number): number => {
  if (rating <= 4) return 0.3 + (rating / 4) * 0.2;
  if (rating <= 6) return 0.5 + ((rating - 4) / 2) * 0.5;
  if (rating <= 8) return 1.0 + ((rating - 6) / 2) * 0.2;
  return 1.2 + ((rating - 8) / 2) * 0.1;
};

export interface Impact {
  label: string;
  value: number;
  /** Nome do atributo do 3D (ou Morale/Chemistry) que o treino mexe; e o que o cartao mostra no lugar do grupo. */
  skill?: string;
  /** Atributo do 3D (id do campo, ex.: 'headAccurancy') que ganha `value` pontos (label 'SKL'); PONTOS_POR_ATRIBUTO pontos = +1 no atributo. */
  campo?: string;
}

export interface TrainingActivity {
  id: string;
  name: string;
  category: 'TECHNIQUE' | 'TACTICS' | 'PHYSICAL' | 'MENTAL';
  icon: string;
  impacts: Impact[];
}

export const ACTIVITIES: TrainingActivity[] = [
  { id: 'passing', name: 'Passing', category: 'TECHNIQUE', icon: '🔄', impacts: [{ label: 'PAS', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'passing' }, { label: 'STM', value: -1 }] },
  { id: 'longpass', name: 'Long Passing', category: 'TECHNIQUE', icon: '📡', impacts: [{ label: 'PAS', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'longPassing' }, { label: 'STM', value: -1 }] },
  { id: 'control', name: 'Ball Control', category: 'TECHNIQUE', icon: '⚽', impacts: [{ label: 'DRB', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'ballControl' }, { label: 'STM', value: -1 }] },
  { id: 'wingplay', name: 'Dribbling', category: 'TECHNIQUE', icon: '🏃', impacts: [{ label: 'DRB', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'dribbling' }, { label: 'STM', value: -2 }] },
  { id: 'crossing', name: 'Crossing', category: 'TECHNIQUE', icon: '⤴️', impacts: [{ label: 'PAS', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'crossing' }, { label: 'STM', value: -1 }] },
  { id: 'shooting', name: 'Shot Power', category: 'TECHNIQUE', icon: '🎯', impacts: [{ label: 'SHT', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'shotPower' }, { label: 'STM', value: -1 }] },
  { id: 'longshots', name: 'Long Shots', category: 'TECHNIQUE', icon: '🌠', impacts: [{ label: 'SHT', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'longShots' }, { label: 'STM', value: -2 }] },
  { id: 'finishing', name: '1v1 Finish', category: 'TECHNIQUE', icon: '🥅', impacts: [{ label: 'SHT', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'finishing' }, { label: 'STM', value: -2 }] },
  { id: 'volleys', name: 'Volleys', category: 'TECHNIQUE', icon: '🦵', impacts: [{ label: 'SHT', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'volleys' }, { label: 'STM', value: -2 }] },
  { id: 'aerial', name: 'Aerial Duels', category: 'TECHNIQUE', icon: '✈️', impacts: [{ label: 'SHT', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'headAccurancy' }, { label: 'STM', value: -2 }] },
  { id: 'setpieces', name: 'Set Pieces', category: 'TECHNIQUE', icon: '🚩', impacts: [{ label: 'SHT', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'freekicks' }, { label: 'SKL', value: 1.0, campo: 'cornerKicks' }, { label: 'STM', value: -1 }] },
  { id: 'penalties', name: 'Penalties', category: 'TECHNIQUE', icon: '⚪', impacts: [{ label: 'SHT', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'penalties' }, { label: 'STM', value: -1 }] },
  { id: 'tackling', name: 'Tackling', category: 'TACTICS', icon: '👟', impacts: [{ label: 'DEF', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'tackleStanding' }, { label: 'STM', value: -1 }] },
  { id: 'sliding', name: 'Sliding Tackle', category: 'TACTICS', icon: '🛷', impacts: [{ label: 'DEF', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'tackleSliding' }, { label: 'STM', value: -2 }] },
  { id: 'marking', name: 'Man Marking', category: 'TACTICS', icon: '🛡️', impacts: [{ label: 'DEF', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'manMarking' }, { label: 'STM', value: -2 }] },
  { id: 'def_pos', name: 'Def. Shape', category: 'TACTICS', icon: '🧱', impacts: [{ label: 'DEF', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'posDefense' }, { label: 'MOR', value: 5, skill: 'Morale' }, { label: 'STM', value: -1 }] },
  { id: 'positioning', name: 'Att. Positioning', category: 'TACTICS', icon: '📍', impacts: [{ label: 'DEF', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'posOffense' }, { label: 'STM', value: -1 }] },
  { id: 'vision', name: 'Vision', category: 'TACTICS', icon: '👁️', impacts: [{ label: 'DEF', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'vision' }, { label: 'STM', value: -2 }] },
  { id: 'pressing', name: 'Pressing', category: 'TACTICS', icon: '😤', impacts: [{ label: 'DEF', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'tacticalAwa' }, { label: 'STM', value: -3 }] },
  { id: 'playmaking', name: 'Playmaking', category: 'TACTICS', icon: '🧠', impacts: [{ label: 'DEF', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'tacticalAwa' }, { label: 'STM', value: -2 }] },
  { id: 'transition', name: 'Transitions', category: 'TACTICS', icon: '🔀', impacts: [{ label: 'DEF', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'tacticalAwa' }, { label: 'STM', value: -2 }] },
  { id: 'cardio', name: 'Cardio', category: 'PHYSICAL', icon: '🫁', impacts: [{ label: 'FIS', value: 2.0 }, { label: 'SKL', value: 1.0, campo: 'stamina' }, { label: 'STM', value: -2 }] },
  { id: 'sprints', name: 'Sprints', category: 'PHYSICAL', icon: '⚡', impacts: [{ label: 'FIS', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'speed' }, { label: 'STM', value: -3 }] },
  { id: 'acceleration', name: 'Acceleration', category: 'PHYSICAL', icon: '🚀', impacts: [{ label: 'FIS', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'acceleration' }, { label: 'STM', value: -2 }] },
  { id: 'agility', name: 'Agility', category: 'PHYSICAL', icon: '🤸', impacts: [{ label: 'FIS', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'agility' }, { label: 'STM', value: -1 }] },
  { id: 'jumping', name: 'Jumping', category: 'PHYSICAL', icon: '🦘', impacts: [{ label: 'FIS', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'jumping' }, { label: 'STM', value: -2 }] },
  { id: 'strength', name: 'Gym Work', category: 'PHYSICAL', icon: '🏋️', impacts: [{ label: 'FIS', value: 1.5 }, { label: 'SKL', value: 1.0, campo: 'strength' }, { label: 'STM', value: -2 }] },
  { id: 'balance', name: 'Balance', category: 'PHYSICAL', icon: '⚖️', impacts: [{ label: 'FIS', value: 1.5 }, { label: 'SKL', value: 1.0, campo: 'balance' }, { label: 'STM', value: -1 }] },
  { id: 'recovery', name: 'Recovery', category: 'PHYSICAL', icon: '🩹', impacts: [{ label: 'FIS', value: 3.0, skill: 'Fitness' }, { label: 'MOR', value: 1.0, skill: 'Morale' }] },
  { id: 'aggression', name: 'Aggression', category: 'MENTAL', icon: '💢', impacts: [{ label: 'SKL', value: 1.0, campo: 'aggression' }, { label: 'STM', value: -2 }] },
  { id: 'reactions', name: 'Reactions', category: 'MENTAL', icon: '⏱️', impacts: [{ label: 'SKL', value: 1.0, campo: 'reactions' }, { label: 'STM', value: -1 }] },
  { id: 'composure', name: 'Composure', category: 'MENTAL', icon: '😌', impacts: [{ label: 'SKL', value: 1.0, campo: 'composure' }, { label: 'STM', value: -1 }] },
  { id: 'consistency', name: 'Consistency', category: 'MENTAL', icon: '📈', impacts: [{ label: 'SKL', value: 1.0, campo: 'consistency' }, { label: 'STM', value: -1 }] },
  { id: 'video', name: 'Analysis', category: 'MENTAL', icon: '📺', impacts: [{ label: 'CHE', value: 0.5, skill: 'Chemistry' }] },
  { id: 'teambuilding', name: 'Team Dinner', category: 'MENTAL', icon: '🍽️', impacts: [{ label: 'CHE', value: 0.5, skill: 'Chemistry' }, { label: 'MOR', value: 2.0, skill: 'Morale' }] },
  { id: 'shadow', name: 'Shadow Play', category: 'MENTAL', icon: '👥', impacts: [{ label: 'MOR', value: 1.0, skill: 'Morale' }, { label: 'STM', value: -1 }] },
  { id: 'focus', name: 'Mental Focus', category: 'MENTAL', icon: '🧘', impacts: [{ label: 'MOR', value: 2.0, skill: 'Morale' }, { label: 'STM', value: -1 }] },
];

// =====================================================================
// TREINO DA CPU — antes os times da CPU nao treinavam: recuperavam +15 de fitness por dia, sempre, e o elenco nunca evoluia.
// Agora o treinador da CPU gere a semana: descansa na vespera do jogo e quando o grupo esta cansado (media < 82), e nos outros dias treina (recupera menos e
// acumula pontos nos atributos da posicao, mais depressa nos jovens e nada nos veteranos), como o treino do utilizador.
// =====================================================================
import type { Player } from '../types';

export const cpuPlanoDoDia = (elenco: Player[], diasParaOJogo: number): { recuperacao: number; treina: boolean } => {
  const aptos = elenco.filter(p => !p.injury);
  const media = aptos.length ? aptos.reduce((s, p) => s + (p.energia ?? 100), 0) / aptos.length : 100;
  const descansa = diasParaOJogo <= 1 || media < 82 || aptos.some(p => (p.energia ?? 100) < 30);
  return { recuperacao: descansa ? 15 : 10, treina: !descansa };
};

/** Um dia de treino de um jogador da CPU: pontos no atributo da posicao (100 pontos = +1). Muda o proprio objecto. */
export const cpuAplicarTreino = (p: Player): void => {
  if (p.injury) return;
  const fator = p.age < 22 ? 1.5 : p.age > 32 ? 0 : p.age > 29 ? 0.5 : 1.0;
  if (fator === 0) return;
  const pos = String(p.position);
  const attr: 'def' | 'pas' | 'drb' | 'sht' =
    ['CB', 'LB', 'RB', 'DM', 'GK'].includes(pos) ? 'def' : ['CM', 'LM', 'RM', 'AM'].includes(pos) ? 'pas' : ['LW', 'RW'].includes(pos) ? 'drb' : 'sht';
  const acc = p.trainingAccumulated || (p.trainingAccumulated = { def: 0, pas: 0, drb: 0, sht: 0 } as any);
  (acc as any)[attr] += 3 * fator;
  while ((acc as any)[attr] >= 100) { (acc as any)[attr] -= 100; (p as any)[attr] = Math.min(99, (p as any)[attr] + 1); }
};
