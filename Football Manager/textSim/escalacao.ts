/*
ESCALACAO COMPLETA. O onze do utilizador so pode ir a jogo (3D, jogo rapido, simular a rodada) com os 11 slots da formacao preenchidos por jogadores do proprio time. Um slot vazio — um titular
arrastado para o banco sem ninguem no lugar, uma venda, o fim de um contrato — deixava o motor 3D falhar ("escalacao: jogador nao encontrado no slot N") e o jogo preso no campo.
*/
import { Team, Player, FORMATIONS } from '../types';

/** Os indices dos slots da formacao sem jogador valido do proprio time (lista vazia = escalacao completa). */
export const slotsVazios = (team: Team | undefined, players: Player[]): number[] => {
  if (!team) return [];
  const slots = FORMATIONS[team.tactics?.formation as keyof typeof FORMATIONS] || FORMATIONS['4-4-2'];
  const ids = new Set(players.filter(p => p.teamId === team.id).map(p => p.id));
  const vazios: number[] = [];
  for (let i = 0; i < slots.length; i++) {
    const id = team.lineup?.[i];
    if (!id || !ids.has(id)) vazios.push(i);
  }
  return vazios;
};
