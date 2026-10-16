/*
A APARENCIA DE UM JOGADOR — cor da pele, do cabelo e da chuteira — SAI DO ID DELE (`p-<idPlayer>`), e por isso e a mesma sempre: no 3D, no
Overview (a cara da foto) e entre jogos. Nao depende do lugar onde joga nem do onze.

E A MESMA CONTA do `aparenciaDoJogador` do 3D (3dMatch/simulador3d/js/utils.js) e as mesmas tabelas do `AppearanceModel`
(js/config/player_behavior.js): se mexer aqui, mexer la — `3dMatch/simulador3d/tests/aparencia_do_jogador.test.js` confere as duas.
*/
export interface Aparencia { tipo: string; cabelo: number; pele: number; chuteira: string; corChuteira: number; }

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

export const aparenciaDoJogador = (id: string | number): Aparencia => {
  const n = numeroDoId(id);
  const tipo = porPeso(TIPOS, hashAparencia(n, 1));
  const bota = porPeso(CHUTEIRAS, hashAparencia(n, 2));
  return { tipo: tipo.nome, cabelo: tipo.cabelo, pele: tipo.pele, chuteira: bota.nome, corChuteira: bota.cor };
};
