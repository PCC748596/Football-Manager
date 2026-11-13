/*
O CHEMISTRY (entrosamento) DO TIME — uma conta so, usada pela aba Tactics (ao vivo, com a escalacao em edicao) e pelo Training Center (com a escalacao salva).

Parte de `base` e soma/subtrai:
1. POSICAO de cada titular (pelo indice do slot da formacao): na posicao certa +2; de outra posicao do mesmo grupo (goleiro / defesa LB-CB-RB / ataque LW-RW-SS-ST / meio) 0;
   defesa<->meio ou meio<->ataque -3; defesa<->ataque -6; goleiro trocado com jogador de linha -10.
2. ENTROSAMENTO: a media dos minutos que cada par de titulares jogou junto (`Team.synergyMap`, +90 por jogo — amistosos incluidos —, +15 por dia de pre-temporada e as sessoes de
   treino com impacto CHE). Chega a +25 (`tetoSinergia`) com `jogosParaTeto` (10) jogos juntos.
3. MORAL media dos titulares: ate +15. 4. CONDICAO FISICA media: ate +12. O resultado fica entre 0 e 100 (o maximo real e 84).
*/
import { Player, Position, FORMATIONS, Tactics } from '../types';

// jogosParaTeto 8 -> 10 (12/11/2026, pedido): uma DUPLA precisa de 10 jogos juntos para o entrosamento maximo (o do time e a media das duplas dos titulares) — a mesma regua do Chemistry Intelligence do 3D (js/config/chemistry_intel.js).
export const CONFIG_QUIMICA = { base: 10, porPosicao: 2, jogosParaTeto: 10, minutosPorJogo: 90, tetoSinergia: 25, pesoMoral: 15, pesoFisico: 12 };

/** O jogador serve ao slot? (o mesmo, ou os pares ST/SS, LW-RW com atacantes e LM-RM-AM com meia.) */
export const checkPosMatch = (assignedPos: string, playerPos: Position): boolean => {
  if (assignedPos === playerPos) return true;
  if (assignedPos === 'SS' && playerPos === Position.ST) return true;
  if (assignedPos === 'ST' && playerPos === Position.SS) return true;
  if (['LW', 'RW'].includes(assignedPos) && [Position.ST, Position.SS].includes(playerPos)) return true;
  if (['LM', 'RM', 'AM'].includes(assignedPos) && playerPos === Position.CM) return true;
  return false;
};

const grupoDoSlot = (pos: string) => pos === 'GK' ? 'GK' : ['LB', 'CB', 'RB'].includes(pos) ? 'DEF' : ['LW', 'RW', 'SS', 'ST'].includes(pos) ? 'ATK' : 'MID';

/** `titulares` na ordem dos slots da `formacao` (quem esta suspenso ja deve ter sido tirado). */
export const calcularQuimica = (titulares: Player[], formacao: Tactics['formation'], sinergia: Record<string, number> | undefined): number => {
  if (titulares.length === 0) return 0;
  const C = CONFIG_QUIMICA;
  const slots = FORMATIONS[formacao] || FORMATIONS['4-4-2'];
  let score = C.base;
  titulares.forEach((p, idx) => {
    const slot = slots[idx]?.label;
    if (!slot) return;
    if (checkPosMatch(slot, p.position)) { score += C.porPosicao; return; }
    const s1 = grupoDoSlot(slot), s2 = grupoDoSlot(p.position);
    if (s1 === s2) return;
    if (s1 === 'GK' || s2 === 'GK') score -= 10;
    else if ((s1 === 'DEF' && s2 === 'MID') || (s1 === 'MID' && s2 === 'DEF')) score -= 3;
    else if ((s1 === 'MID' && s2 === 'ATK') || (s1 === 'ATK' && s2 === 'MID')) score -= 3;
    else score -= 6;
  });

  if (sinergia && titulares.length > 1) {
    let total = 0, pares = 0;
    for (let i = 0; i < titulares.length; i++) for (let j = i + 1; j < titulares.length; j++) {
      const a = titulares[i].id, b = titulares[j].id;
      total += sinergia[a < b ? `${a}-${b}` : `${b}-${a}`] || 0;
      pares++;
    }
    const minutosPorPonto = (C.jogosParaTeto * C.minutosPorJogo) / C.tetoSinergia;
    score += Math.min(C.tetoSinergia, Math.floor((pares ? total / pares : 0) / minutosPorPonto));
  }

  score += (titulares.reduce((s, p) => s + p.morale, 0) / titulares.length / 100) * C.pesoMoral;
  score += (titulares.reduce((s, p) => s + p.fitness, 0) / titulares.length / 100) * C.pesoFisico;
  return Math.max(0, Math.min(100, Math.round(score)));
};
