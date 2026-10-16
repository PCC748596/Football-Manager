import { TeamIntent } from './teamAI';
import { PlayParticipants } from './roleAI';

// =====================================================================
// PLAYING STYLE — Define COMO a jogada será executada
// =====================================================================

export type PlayType = 
  | 'SHORT_PASS'      // Passe curto progressivo
  | 'TRIANGULATION'   // Toque rápido entre 3 jogadores
  | 'LONG_BALL'       // Lançamento longo / bola direta
  | 'SWITCH'          // Inversão de jogo (troca de setor)
  | 'CROSS'           // Cruzamento da lateral
  | 'DRIBBLE';        // Jogada individual

/**
 * Seleciona o tipo de jogada baseado em:
 * - Intent coletivo do time (Team AI)
 * - Tempo tático
 * - Setor de ataque
 * - Atributos dos participantes
 * 
 * Uso futuro: Cada PlayType modificará a chance de gol e gerará
 * narrações diferentes, além de animações específicas no 2D/3D.
 */
export const selectPlayType = (
  intent: TeamIntent,
  tempo: number,
  lane: 'Left' | 'Center' | 'Right',
  participants: PlayParticipants
): PlayType => {
  const roll = Math.random() * 100;
  
  // Tempo baixo favorece posse curta
  if (tempo < 30) {
    if (roll < 40) return 'SHORT_PASS';
    if (roll < 70) return 'TRIANGULATION';
    if (roll < 85) return 'SWITCH';
    return 'DRIBBLE';
  }
  
  // Tempo alto favorece jogo direto
  if (tempo > 70) {
    if (roll < 30) return 'LONG_BALL';
    if (roll < 50) return 'CROSS';
    if (roll < 70) return 'SHORT_PASS';
    if (roll < 85) return 'DRIBBLE';
    return 'TRIANGULATION';
  }
  
  // Lateral favorece cruzamentos
  if (lane !== 'Center') {
    if (roll < 30) return 'CROSS';
    if (roll < 50) return 'DRIBBLE';
    if (roll < 70) return 'SHORT_PASS';
    if (roll < 85) return 'SWITCH';
    return 'TRIANGULATION';
  }
  
  // Centro favorece passes curtos e triangulações
  if (roll < 30) return 'SHORT_PASS';
  if (roll < 55) return 'TRIANGULATION';
  if (roll < 70) return 'DRIBBLE';
  if (roll < 85) return 'LONG_BALL';
  return 'SWITCH';
};

/**
 * Modificadores de chance de gol por tipo de jogada.
 * Uso futuro: multiplicar na resolução do Tick 3.
 */
export const getPlayTypeModifiers = (playType: PlayType) => {
  switch (playType) {
    case 'SHORT_PASS':
      return { goalMod: 1.0, narrativeKey: 'short_pass' };
    case 'TRIANGULATION':
      return { goalMod: 1.15, narrativeKey: 'triangulation' };
    case 'LONG_BALL':
      return { goalMod: 0.85, narrativeKey: 'long_ball' };
    case 'SWITCH':
      return { goalMod: 1.05, narrativeKey: 'switch_play' };
    case 'CROSS':
      return { goalMod: 0.95, narrativeKey: 'cross' };
    case 'DRIBBLE':
      return { goalMod: 1.1, narrativeKey: 'dribble' };
  }
};
