import { Player, Position } from '../types';
import { TeamIntent } from './teamAI';

// =====================================================================
// ROLE AI — Decide quais jogadores participam de cada jogada
// =====================================================================

export interface PlayParticipants {
  initiator: Player;     // Quem começa a jogada (ex: volante, lateral)
  creator: Player;       // Quem faz o passe decisivo (ex: meia, ponta)
  finisher: Player;      // Quem finaliza (ex: centroavante, meia atacante)
}

/**
 * Seleciona os participantes da jogada com base no intent coletivo,
 * setor de ataque, e jogadores disponíveis.
 * 
 * Uso futuro: Na Fase 6, os atributos individuais dos participantes
 * influenciarão diretamente a chance de gol no Tick 3:
 * - finisher.sht → chance de gol
 * - creator.pas → chance do passe chegar
 * - initiator.drb → chance de superar a marcação
 */
export const selectParticipants = (
  intent: TeamIntent,
  attackLane: 'Left' | 'Center' | 'Right',
  lineupIds: string[],
  allPlayers: Player[],
  redCarded: Set<string>
): PlayParticipants | null => {
  const available = lineupIds
    .map(id => allPlayers.find(p => p.id === id))
    .filter((p): p is Player => !!p && !redCarded.has(p.id));
  
  if (available.length < 3) return null;

  // Definir posições por role baseado no setor
  const initiatorPositions = getInitiatorPositions(attackLane, intent);
  const creatorPositions = getCreatorPositions(attackLane);
  const finisherPositions = getFinisherPositions(attackLane);

  const findBest = (positions: Position[], exclude: Set<string>): Player | null => {
    const candidates = available.filter(p => 
      positions.includes(p.position) && !exclude.has(p.id)
    );
    if (candidates.length === 0) {
      // Fallback: qualquer jogador não excluído
      const fallback = available.filter(p => !exclude.has(p.id));
      return fallback[Math.floor(Math.random() * fallback.length)] || null;
    }
    // Retorna o melhor por atributo relevante
    return candidates.sort((a, b) => b.skill - a.skill)[0];
  };

  const used = new Set<string>();
  
  const initiator = findBest(initiatorPositions, used);
  if (initiator) used.add(initiator.id);
  
  const creator = findBest(creatorPositions, used);
  if (creator) used.add(creator.id);
  
  const finisher = findBest(finisherPositions, used);

  if (!initiator || !creator || !finisher) return null;

  return { initiator, creator, finisher };
};

// --- Helpers para posições por role ---

const getInitiatorPositions = (lane: 'Left' | 'Center' | 'Right', intent: TeamIntent): Position[] => {
  if (intent === 'COUNTER') {
    return [Position.DM, Position.CB, Position.GK]; // Saída rápida
  }
  if (lane === 'Left') return [Position.LB, Position.LM, Position.DM];
  if (lane === 'Right') return [Position.RB, Position.RM, Position.DM];
  return [Position.CM, Position.DM, Position.AM];
};

const getCreatorPositions = (lane: 'Left' | 'Center' | 'Right'): Position[] => {
  if (lane === 'Left') return [Position.LM, Position.LW, Position.AM, Position.CM];
  if (lane === 'Right') return [Position.RM, Position.RW, Position.AM, Position.CM];
  return [Position.AM, Position.CM, Position.SS];
};

const getFinisherPositions = (lane: 'Left' | 'Center' | 'Right'): Position[] => {
  if (lane === 'Left') return [Position.LW, Position.ST, Position.SS];
  if (lane === 'Right') return [Position.RW, Position.ST, Position.SS];
  return [Position.ST, Position.SS, Position.AM];
};
