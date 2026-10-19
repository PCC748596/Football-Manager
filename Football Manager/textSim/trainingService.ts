
export interface Impact {
  label: string;
  value: number;
}

export interface TrainingActivity {
  id: string;
  name: string;
  category: 'DEFENSE' | 'MIDFIELD' | 'ATTACK' | 'TACTICS' | 'FITNESS';
  icon: string;
  impacts: Impact[];
}

export const ACTIVITIES: TrainingActivity[] = [
  // DEFENSE
  { id: 'tackling', name: 'Tackling', category: 'DEFENSE', icon: '👟', impacts: [{ label: 'DEF', value: 1.0 }, { label: 'STM', value: -1 }] },
  { id: 'marking', name: 'Man Marking', category: 'DEFENSE', icon: '🛡️', impacts: [{ label: 'DEF', value: 1.5 }, { label: 'STM', value: -2 }] },
  { id: 'def_pos', name: 'Def. Shape', category: 'DEFENSE', icon: '🧱', impacts: [{ label: 'DEF', value: 0.5 }, { label: 'MOR', value: 5 }, { label: 'STM', value: -1 }] },
  { id: 'aerial', name: 'Aerial Duels', category: 'DEFENSE', icon: '✈️', impacts: [{ label: 'DEF', value: 1.0 }, { label: 'STM', value: -2 }] },

  // MIDFIELD
  { id: 'passing', name: 'Passing', category: 'MIDFIELD', icon: '🔄', impacts: [{ label: 'PAS', value: 1.0 }, { label: 'STM', value: -1 }] },
  { id: 'control', name: 'Ball Control', category: 'MIDFIELD', icon: '⚽', impacts: [{ label: 'DRB', value: 1.0 }, { label: 'STM', value: -1 }] },
  { id: 'vision', name: 'Vision', category: 'MIDFIELD', icon: '👁️', impacts: [{ label: 'PAS', value: 1.5 }, { label: 'STM', value: -2 }] },
  { id: 'playmaking', name: 'Playmaking', category: 'MIDFIELD', icon: '🧠', impacts: [{ label: 'PAS', value: 1.0 }, { label: 'DRB', value: 0.5 }, { label: 'STM', value: -2 }] },

  // ATTACK
  { id: 'shooting', name: 'Shooting', category: 'ATTACK', icon: '🎯', impacts: [{ label: 'SHT', value: 1.0 }, { label: 'STM', value: -1 }] },
  { id: 'finishing', name: '1v1 Finish', category: 'ATTACK', icon: '🥅', impacts: [{ label: 'SHT', value: 1.5 }, { label: 'STM', value: -2 }] },
  { id: 'crossing', name: 'Crossing', category: 'ATTACK', icon: '⤴️', impacts: [{ label: 'PAS', value: 1.0 }, { label: 'STM', value: -1 }] },
  { id: 'wingplay', name: 'Wing Play', category: 'ATTACK', icon: '🏃', impacts: [{ label: 'DRB', value: 1.5 }, { label: 'STM', value: -2 }] },

  // TACTICS
  { id: 'video', name: 'Analysis', category: 'TACTICS', icon: '📺', impacts: [{ label: 'ENT', value: 0.5 }] },
  { id: 'setpieces', name: 'Set Pieces', category: 'TACTICS', icon: '🚩', impacts: [{ label: 'SHT', value: 0.5 }, { label: 'PAS', value: 0.5 }, { label: 'STM', value: -1 }] },
  { id: 'pressing', name: 'Pressing', category: 'TACTICS', icon: '😤', impacts: [{ label: 'DEF', value: 1.0 }, { label: 'STM', value: -3 }] },
  { id: 'shadow', name: 'Shadow Play', category: 'TACTICS', icon: '👥', impacts: [{ label: 'MOR', value: 1.0 }, { label: 'STM', value: -1 }] },

  // FITNESS
  { id: 'cardio', name: 'Cardio', category: 'FITNESS', icon: '🫁', impacts: [{ label: 'FIT', value: 2.0 }, { label: 'STM', value: -2 }] },
  { id: 'strength', name: 'Gym Work', category: 'FITNESS', icon: '🏋️', impacts: [{ label: 'FIT', value: 1.5 }, { label: 'STM', value: -2 }] },
  { id: 'sprints', name: 'Sprints', category: 'FITNESS', icon: '⚡', impacts: [{ label: 'FIT', value: 1.0 }, { label: 'STM', value: -3 }] },
  { id: 'recovery', name: 'Recovery', category: 'FITNESS', icon: '🩹', impacts: [{ label: 'FIT', value: 3.0 }, { label: 'MOR', value: 1.0 }] },
];

// =====================================================================
// TREINO DA CPU — antes os times da CPU nao treinavam: recuperavam +15 de fitness por dia, sempre, e o elenco nunca evoluia.
// Agora o treinador da CPU gere a semana: descansa na vespera do jogo e quando o grupo esta cansado (media < 82), e nos outros dias treina (recupera menos e
// acumula pontos nos atributos da posicao, mais depressa nos jovens e nada nos veteranos), como o treino do utilizador.
// =====================================================================
import type { Player } from '../types';

export const cpuPlanoDoDia = (elenco: Player[], diasParaOJogo: number): { recuperacao: number; treina: boolean } => {
  const aptos = elenco.filter(p => !p.injury);
  const media = aptos.length ? aptos.reduce((s, p) => s + p.fitness, 0) / aptos.length : 100;
  const descansa = diasParaOJogo <= 1 || media < 82;
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
