import { Player, PlayStyle, PLAYSTYLE_POSITIONS } from '../types';

/**
 * O PlayStyle de um jogador SEM estilo gravado nem na base do 3D (jogador gerado de um save antigo): um dos estilos que servem a posicao dele, escolhido pelo id.
 * Antes era sempre o 1.o da lista (todo goleiro defensivo, todo lateral ofensivo...). Pelo id: o mesmo jogador mostra sempre o mesmo estilo.
 */
export const estiloPorPosicao = (p: Pick<Player, 'id' | 'position'>): PlayStyle | undefined => {
  const candidatos = (Object.keys(PLAYSTYLE_POSITIONS) as PlayStyle[]).filter(s => s !== 'None' && PLAYSTYLE_POSITIONS[s].includes(p.position));
  if (!candidatos.length) return undefined;
  let h = 0;
  for (const c of String(p.id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return candidatos[h % candidatos.length];
};
