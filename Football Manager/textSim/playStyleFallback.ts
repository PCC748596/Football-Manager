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

/**
 * O PlayStyle a MOSTRAR de um jogador: o primeiro dos candidatos (ajuste manual, o do jogador, o da base, por esta ordem) que SERVE a posicao dele
 * (PLAYSTYLE_POSITIONS); senao o que serve pelo id. Antes mostrava-se o primeiro que existisse, e saia Target Man num RW.
 */
export const estiloValidoDoJogador = (p: Pick<Player, 'id' | 'position'>, ...candidatos: (string | undefined)[]): PlayStyle | string => {
  for (const c of candidatos) {
    if (!c || c === 'None') continue;
    const lista = PLAYSTYLE_POSITIONS[c as PlayStyle];
    if (lista && lista.includes(p.position)) return c;
  }
  return estiloPorPosicao(p) || 'Creative Playmaker';
};
