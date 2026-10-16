import { PlayStyle } from '../types';

/*
PLAYSTYLES FIXADOS A MAO — mandam sobre o da base (playStylesDatabase.ts, gerado) e sobre o escolhido pela posicao. Sobrevivem a
`node tools/gerarPlayStyles.cjs`. Chave: "<nome da equipa>|<nome do jogador>", como esta no database do manager.
*/
export const PLAYSTYLE_AJUSTES: Record<string, PlayStyle> = {
  'Fluminense-RJ|Ganso': 'Classic No. 10'
};
