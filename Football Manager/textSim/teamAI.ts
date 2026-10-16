import { Tactics } from '../types';

// =====================================================================
// TEAM AI — Decide a intenção coletiva do time para cada minuto
// =====================================================================

export type TeamIntent = 'ATTACK' | 'COUNTER' | 'POSSESS' | 'RETREAT' | 'PRESS';

/**
 * Decide o que o time quer fazer coletivamente baseado em:
 * - Instruções táticas do treinador
 * - Momentum atual da partida
 * - Minuto do jogo e placar
 * - Fitness média do time
 * 
 * Uso futuro: O `simulateMatch` consultará esta função no início de cada minuto
 * para ajustar probabilidades do deck em tempo real.
 */
export const decideTeamIntent = (
  tactics: Tactics,
  momentum: number,       // -100 a +100
  matchMinute: number,
  scoreDiff: number,       // positivo = time está ganhando
  avgFitness: number       // média do time (0-100)
): TeamIntent => {
  // Perdendo no final do jogo → atacar desesperadamente
  if (scoreDiff < 0 && matchMinute > 75) return 'ATTACK';
  if (scoreDiff < -1 && matchMinute > 60) return 'ATTACK';
  
  // Ganhando com estilo defensivo → recuar
  if (scoreDiff > 0 && (tactics.style === 'Very Defensive' || tactics.style === 'Defensive')) return 'RETREAT';
  
  // Momentum muito negativo e cansado → recuar
  if (momentum < -30 && avgFitness < 40) return 'RETREAT';
  
  // Pressão alta → pressionar
  if (tactics.pressure > 70 && avgFitness > 50) return 'PRESS';
  
  // Estilo ofensivo → atacar
  if (tactics.style === 'Very Offensive' || tactics.style === 'Offensive') return 'ATTACK';
  
  // Tempo baixo → manter posse
  if (tactics.tempo < 30) return 'POSSESS';
  
  // Ganhando confortavelmente → manter posse
  if (scoreDiff >= 2 && matchMinute > 60) return 'POSSESS';
  
  // Default
  return 'ATTACK';
};

/**
 * Aplica modificações táticas diretamente numa cópia do objeto Tactics.
 */
export const applyIntentToTactics = (tactics: Tactics, intent: TeamIntent): Tactics => {
  const newTactics = { ...tactics };
  switch (intent) {
    case 'ATTACK':
      newTactics.style = 'Offensive';
      newTactics.pressure = Math.max(newTactics.pressure, 70);
      newTactics.aggression = 'Aggressive';
      newTactics.tempo = Math.max(newTactics.tempo, 70);
      newTactics.defensiveLine = Math.max(newTactics.defensiveLine, 80);
      break;
    case 'COUNTER':
      newTactics.style = 'Defensive';
      newTactics.defensiveLine = Math.min(newTactics.defensiveLine, 40);
      newTactics.tempo = Math.max(newTactics.tempo, 80);
      newTactics.focusSectors = ['Left', 'Right'];
      break;
    case 'POSSESS':
      newTactics.style = 'Balanced';
      newTactics.pressure = Math.min(newTactics.pressure, 50);
      newTactics.tempo = Math.min(newTactics.tempo, 30);
      newTactics.aggression = 'Passive';
      break;
    case 'RETREAT':
      newTactics.style = 'Very Defensive';
      newTactics.defensiveLine = Math.min(newTactics.defensiveLine, 30);
      newTactics.tempo = Math.min(newTactics.tempo, 20);
      newTactics.aggression = 'Passive';
      break;
    case 'PRESS':
      newTactics.style = 'Offensive';
      newTactics.pressure = 100;
      newTactics.defensiveLine = 90;
      newTactics.aggression = 'Very Aggressive';
      break;
  }
  return newTactics;
};
