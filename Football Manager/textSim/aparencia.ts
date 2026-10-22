/*
A APARENCIA DE UM JOGADOR — cor da pele, do cabelo e da chuteira — SAI DO ID DELE (`p-<idPlayer>`), e por isso e a mesma sempre: no 3D, no
Overview (a cara da foto) e entre jogos. Nao depende do lugar onde joga nem do onze.

E A MESMA CONTA do `aparenciaDoJogador` do 3D (3dMatch/simulador3d/js/utils.js) e as mesmas tabelas do `AppearanceModel`
(js/config/player_behavior.js): se mexer aqui, mexer la — `3dMatch/simulador3d/tests/aparencia_do_jogador.test.js` confere as duas.
*/
import { FACES } from './facesDatabase';
/*
A FACE PERSONALIZADA (Editor de Faces): quem tem uma entrada em `FACES` (textSim/facesDatabase.ts, no 3D `FacesPersonalizadas` em data/faces.js — o mesmo ficheiro de origem, data/faces.json)
usa a pele, o cabelo, o estilo do cabelo, a barba, os oculos e a largura do rosto dela, em vez do sorteio pelo id. Quem nao tem entrada continua exatamente como antes.
*/
export type EstiloCabelo = 'curto' | 'degrade' | 'raspado' | 'longo' | 'topete' | 'careca';
export type EstiloBarba = 'nenhuma' | 'rala' | 'cheia' | 'bigode' | 'cavanhaque';
/** Desligado: a cara em pixels (foto) nao e usada; fica so a face desenhada (cor, estilo, barba, oculos). Os dados `rosto` continuam gravados: ligar de volta = `true` aqui e em utils.js. */
export const ROSTO_PIXELADO = false;
/** `rosto` (opcional): a cara de frente em pixels (PNG pequeno, data URL), gerada da foto no Editor de Faces: quando existe, ela substitui os olhos, nariz, boca, barba e oculos desenhados. */
export interface FaceCustom { pele: string; cabelo: string; estilo: EstiloCabelo; barba: EstiloBarba; oculos: boolean; largura: number; rosto?: string; cabeloTextura?: string; }
export interface Aparencia {
  tipo: string; cabelo: number; pele: number; chuteira: string; corChuteira: number;
  estilo?: EstiloCabelo; barba?: EstiloBarba; oculos?: boolean; largura?: number; rosto?: string; cabeloTextura?: string;   // so nas faces personalizadas
}

const TIPOS = [
  { nome: 'castanhoClaro', peso: 42, cabelo: 0x8b6b45, pele: 0xe8c9a8 },
  { nome: 'loiro', peso: 28, cabelo: 0xd9c37a, pele: 0xf2d7bd },
  { nome: 'negro', peso: 22, cabelo: 0x1a1410, pele: 0x6b4630 },
  { nome: 'ruivo', peso: 8, cabelo: 0xb5502a, pele: 0xf6ddc8 }
];
const CHUTEIRAS = [
  { nome: 'vermelha', peso: 25, cor: 0xd62828 },
  { nome: 'branca', peso: 23, cor: 0xf5f5f5 },
  { nome: 'preta', peso: 20, cor: 0x1c1c1c },
  { nome: 'amarela', peso: 18, cor: 0xe8ff00 },
  { nome: 'rosa', peso: 14, cor: 0xff5fa2 }
];

const hashAparencia = (seed: number, sal: number): number => {
  let h = (seed * 2654435761 + sal * 40503) >>> 0;
  h ^= h >>> 15;
  h = (h * 2246822519) >>> 0;
  h ^= h >>> 13;
  return h >>> 0;
};

// O numero do id: `p-269249` -> 269249; um id sem numero cai num hash do texto.
export const numeroDoId = (id: string | number): number => {
  if (typeof id === 'number') return id >>> 0;
  const m = /(\d+)\s*$/.exec(String(id));
  if (m) return Number(m[1]) >>> 0;
  let h = 7;
  for (let i = 0; i < String(id).length; i++) h = (h * 31 + String(id).charCodeAt(i)) >>> 0;
  return h;
};

const porPeso = <T extends { peso: number }>(lista: T[], r: number): T => {
  const total = lista.reduce((a, x) => a + x.peso, 0);
  let acc = r % total;
  for (const x of lista) { if (acc < x.peso) return x; acc -= x.peso; }
  return lista[lista.length - 1];
};

const hexParaNumero = (c: string): number => parseInt(String(c).replace('#', ''), 16);

export const aparenciaDoJogador = (id: string | number): Aparencia => {
  const n = numeroDoId(id);
  const tipo = porPeso(TIPOS, hashAparencia(n, 1));
  const bota = porPeso(CHUTEIRAS, hashAparencia(n, 2));
  const f = FACES[String(n)];
  if (f) return { tipo: 'custom', cabelo: hexParaNumero(f.cabelo), pele: hexParaNumero(f.pele), chuteira: bota.nome, corChuteira: bota.cor, estilo: f.estilo, barba: f.barba, oculos: !!f.oculos, largura: f.largura, rosto: ROSTO_PIXELADO ? f.rosto : undefined, cabeloTextura: ROSTO_PIXELADO ? f.cabeloTextura : undefined };
  return { tipo: tipo.nome, cabelo: tipo.cabelo, pele: tipo.pele, chuteira: bota.nome, corChuteira: bota.cor };
};
