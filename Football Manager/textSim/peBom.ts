/*
O PE BOM DO JOGADOR. Esquerdo ('e') ou direito ('d'), decidido pela MESMA conta do motor 3D (`pePreferido`, js/utils.js, com o FootModel de config/player_behavior.js): determinista pelo id do
jogador e com mais canhotos nos postos da esquerda (LB, LM, LW). O manager calcula-o aqui para o mostrar no Overview e manda-o ao motor (`peBom`), que passa a usa-lo no jogo — o que se ve no
cartao e o que o jogador faz em campo (frame do toque de conducao, perna do remate e do passe, lado do penalti).
*/
import type { Player } from '../types';

// Tem de ficar igual a FootModel (3dMatch/simulador3d/js/config/player_behavior.js).
export const FOOT_MODEL = { fraccaoCanhotos: 0.135, fraccaoCanhotosNaEsquerda: 0.55, postosDaEsquerda: ['LB', 'LM', 'LW'] };

// hashAparencia do motor (js/utils.js), com a mesma aritmetica de numeros do JavaScript.
const hashAparencia = (seed: number, sal: number): number => {
  let h = (seed * 2654435761 + sal * 40503) >>> 0;
  h ^= h >>> 15;
  h = (h * 2246822519) >>> 0;
  h ^= h >>> 13;
  return h >>> 0;
};

/** O id numerico que o motor usa para o jogador: a parte numerica de `p-269063`. */
export const idNumerico = (id: string): number => { const m = /(\d+)$/.exec(String(id)); return m ? Number(m[1]) : 0; };

export const peBomDe = (p: Pick<Player, 'id' | 'position'>): 'e' | 'd' => {
  const r = (hashAparencia(idNumerico(p.id) | 0, 7717) % 100000) / 100000;
  const naEsquerda = FOOT_MODEL.postosDaEsquerda.includes(String(p.position));
  return r < (naEsquerda ? FOOT_MODEL.fraccaoCanhotosNaEsquerda : FOOT_MODEL.fraccaoCanhotos) ? 'e' : 'd';
};
