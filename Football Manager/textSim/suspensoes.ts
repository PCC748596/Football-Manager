/*
SUSPENSOES POR CARTAO. Por competicao (a liga do clube, ou cada copa): 3 cartoes amarelos suspendem o jogador do PROXIMO jogo dessa competicao (e a contagem zera);
o cartao vermelho (inclusive o do segundo amarelo) tambem suspende do proximo jogo. Amistosos nao contam. O jogador cumpre a suspensao ao jogar-se um jogo do clube
na competicao — seja ele titular, reserva ou nem convocado.

No Player: `amarelos[chave]` (contagem acumulada) e `suspenso[chave]` (jogos que faltam cumprir).
*/
import { Fixture, Player } from '../types';

export const AMARELOS_PARA_SUSPENSAO = 3;

/** A chave da competicao do jogo: 'LEAGUE', o id da copa (LIB, SUL, COPA_BR...) ou null (amistoso: sem suspensoes). */
export const chaveCompeticao = (f: Fixture | undefined | null, comps: { id: string; matches: { id: string }[] }[] | null | undefined): string | null => {
  if (!f || f.isFriendly || f.type === 'FRIENDLY') return null;
  if (f.type === 'CUP') return (comps || []).find(c => c.matches.some(m => 'fix-cup-' + m.id === f.id))?.id || 'CUP';
  return 'LEAGUE';
};

export const estaSuspenso = (p: Player | undefined, chave: string | null): boolean =>
  !!p && !!chave && ((p.suspenso?.[chave] || 0) > 0);

/**
 * Depois de um jogo jogado: quem estava suspenso (dos dois clubes) cumpre um jogo; depois contam-se os cartoes do jogo.
 * `jogadores` sao copias que se podem alterar (os registos aninhados sao substituidos, nao mutados). Devolve true se mudou algo.
 */
export const aplicarSuspensoes = (f: Fixture, chave: string | null, jogadores: Player[]): boolean => {
  if (!chave) return false;
  let mudou = false;
  // 1. Cumprem o jogo os que ja estavam suspensos antes deste jogo.
  for (const p of jogadores) {
    if ((p.teamId !== f.homeTeamId && p.teamId !== f.awayTeamId) || !((p.suspenso?.[chave] || 0) > 0)) continue;
    p.suspenso = { ...p.suspenso, [chave]: p.suspenso![chave] - 1 };
    mudou = true;
  }
  // 2. Os cartoes deste jogo.
  for (const e of f.events || []) {
    if (e.type !== 'CARD' || !e.playerId) continue;
    const p = jogadores.find(x => x.id === e.playerId);
    if (!p) continue;
    const vermelho = e.description.includes('🟥') || e.description.includes('RED');
    if (vermelho) {
      p.suspenso = { ...p.suspenso, [chave]: (p.suspenso?.[chave] || 0) + 1 };
    } else {
      const n = (p.amarelos?.[chave] || 0) + 1;
      if (n >= AMARELOS_PARA_SUSPENSAO) {
        p.amarelos = { ...p.amarelos, [chave]: 0 };
        p.suspenso = { ...p.suspenso, [chave]: (p.suspenso?.[chave] || 0) + 1 };
      } else p.amarelos = { ...p.amarelos, [chave]: n };
    }
    mudou = true;
  }
  return mudou;
};

/**
 * Tira da escalacao e do banco os suspensos: o titular dá o lugar ao melhor do banco da mesma funcao (senao ao de maior nota) e o banco completa-se
 * com os melhores do plantel. Devolve { lineup, bench, mudou }.
 */
export const corrigirEscalacao = (lineup: string[], bench: string[], plantel: Player[], chave: string | null): { lineup: string[]; bench: string[]; mudou: boolean } => {
  const por = new Map(plantel.map(p => [p.id, p]));
  const ruim = (id: string) => { const p = por.get(id); return !!p && estaSuspenso(p, chave); };
  if (![...lineup, ...bench].some(id => id && ruim(id))) return { lineup, bench, mudou: false };
  const nl = [...lineup];
  let nb = bench.filter(id => !ruim(id));
  const usados = () => new Set([...nl, ...nb]);
  const livre = plantel.filter(p => !ruim(p.id)).sort((a, b) => b.skill - a.skill);
  nl.forEach((id, i) => {
    if (!id || !ruim(id)) return;
    const orig = por.get(id)!;
    const cand = nb.find(b => por.get(b)?.position === orig.position) || nb[0]
      || livre.find(p => !usados().has(p.id) && p.position === orig.position)?.id || livre.find(p => !usados().has(p.id))?.id;
    if (!cand) { nl[i] = ''; return; }
    nl[i] = cand; nb = nb.filter(b => b !== cand);
  });
  for (const p of livre) { if (nb.length >= bench.length) break; if (!usados().has(p.id)) nb.push(p.id); }
  return { lineup: nl, bench: nb, mudou: true };
};
