/*
ESCALACAO COMPLETA. O onze do utilizador so pode ir a jogo (3D, jogo rapido, simular a rodada) com os 11 slots da formacao preenchidos por jogadores do proprio time. Um slot vazio — um titular
arrastado para o banco sem ninguem no lugar, uma venda, o fim de um contrato — deixava o motor 3D falhar ("escalacao: jogador nao encontrado no slot N") e o jogo preso no campo.
*/
import { Team, Player, FORMATIONS } from '../types';

/** O jogo do utilizador ja comecou (relogio do manager ou motor 3D em andamento): a partir dai a escalacao nao e mais conferida. */
export const jogoEmAndamento = (matchMinute: number): boolean => matchMinute > 0 || typeof (globalThis as any).motor3dMinuto === 'number';

/**
 * Os indices dos slots da formacao sem jogador valido do proprio time (lista vazia = escalacao completa).
 * `emJogo`: com o jogo em andamento nao ha "escalacao incompleta" — um expulso sai do onze e o time joga com menos um; so antes do apito inicial o onze tem de estar completo.
 */
export const slotsVazios = (team: Team | undefined, players: Player[], emJogo = false): number[] => {
  if (!team || emJogo) return [];
  const slots = FORMATIONS[team.tactics?.formation as keyof typeof FORMATIONS] || FORMATIONS['4-4-2'];
  const ids = new Set(players.filter(p => p.teamId === team.id).map(p => p.id));
  const vazios: number[] = [];
  for (let i = 0; i < slots.length; i++) {
    const id = team.lineup?.[i];
    if (!id || !ids.has(id)) vazios.push(i);
  }
  return vazios;
};
