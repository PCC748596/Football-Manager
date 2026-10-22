/*
BANCO DE CORES DO TREINADOR — ternos, gravatas, camisas, calcas e combinacoes (components/ManagerCreation.tsx -> 3dMatch/simulador3d/managerPreview.html).
Fica fora do `realDatabase.ts` de proposito: o plugin `database-saver` (vite.config.ts) reescreve esse ficheiro por inteiro com so paises, equipas e
jogadores, e apagaria qualquer export novo.
*/
export interface CorNomeada { id: string; nome: string; hex: string; }

const c = (nome: string, hex: string): CorNomeada => ({ id: nome.toLowerCase().replace(/\s+/g, '_'), nome, hex });

// -- Terno e gravata ("How to match a tie to every suit colour") --
const GRAVATAS = {
  burgundy: c('Burgundy', '#6d1426'), red: c('Solid Red', '#d4202a'), dustyPink: c('Dusty Pink', '#e8a9b4'), silver: c('Silver', '#b8bcc0'),
  navy: c('Navy', '#1c2a5a'), green: c('Green', '#1f5b3a'), gold: c('Gold', '#e0a020'), dustyBlue: c('Dusty Blue', '#8fb0d6'), plum: c('Plum', '#5a2d6e'),
  blue: c('Blue', '#7fa6d8'), purple: c('Purple', '#6a3d9a'), black: c('Black', '#111111'), darkBlue: c('Dark Blue', '#14234a'), beige: c('Beige', '#e8c9a0'),
  burntOrange: c('Burnt Orange', '#c8581f'), cream: c('Cream', '#f1e6c8')
};
const G = GRAVATAS;

export interface Terno extends CorNomeada { gravatas: CorNomeada[]; }
export const TERNOS: Terno[] = [
  { ...c('Navy', '#1c2845'), gravatas: [G.burgundy, G.red, G.dustyPink, G.silver, G.navy, G.green, G.gold] },
  { ...c('Charcoal', '#3b3d40'), gravatas: [G.burgundy, G.navy, G.dustyBlue, G.silver, G.plum, G.green, G.gold] },
  { ...c('Light Gray', '#a9abb0'), gravatas: [G.navy, G.burgundy, G.dustyPink, G.blue, G.purple, G.green, G.silver] },
  { ...c('Black', '#111418'), gravatas: [G.black, G.burgundy, G.silver, G.darkBlue, G.plum, G.red, G.gold] },
  { ...c('Brown', '#5a3a28'), gravatas: [G.beige, G.navy, G.green, G.burntOrange, G.gold, G.plum, G.cream] }
];
export const ternoPorHex = (hex: string): Terno => TERNOS.find(t => t.hex === hex) || TERNOS[0];

// -- Casual: camisas por familia, calcas e combinacoes prontas --
export const CAMISAS_POR_FAMILIA: { familia: string; cores: CorNomeada[] }[] = [
  { familia: 'Neutral', cores: [c('Ivory', '#f3ead0'), c('Sand', '#d9c29a'), c('Mustard', '#d9a21b'), c('Lemon', '#f2e27a'), c('Pista', '#b8c99a'), c('Mist Blue', '#b9d3ea'), c('Ocean Blue', '#5aa0cf')] },
  { familia: 'Green-Blue', cores: [c('Mint Green', '#8fdcc0'), c('Jade Green', '#5fc5a8'), c('Sea Green', '#3fb59a'), c('Teal', '#0f8a7e'), c('Aqua Blue', '#4fb0c8'), c('Turquoise', '#1aa5c8'), c('Peacock Blue', '#0e7fa0')] },
  { familia: 'Blue', cores: [c('Sky Blue', '#8fb7e6'), c('Oxford Blue', '#6d9fd4'), c('Royal Blue', '#1f4fb0'), c('Denim Blue', '#5a82b8'), c('Steel Blue', '#4f6f95'), c('Navy Blue', '#14234a'), c('Midnight Blue', '#0b1535')] },
  { familia: 'Purple', cores: [c('Lilac', '#cdbde8'), c('Lavender', '#b8a6de'), c('Orchid', '#c79fd8'), c('Violet', '#7c4fc0'), c('Purple', '#5a2d96'), c('Plum', '#4a1f4a'), c('Eggplant', '#34163a')] },
  { familia: 'Pink-Red', cores: [c('Blush Pink', '#f3c7cc'), c('Powder Pink', '#f0b0bd'), c('Rose Pink', '#e8869c'), c('Coral', '#ec6b6b'), c('Watermelon', '#e0384e'), c('Crimson', '#b01c2e'), c('Wine', '#6d1426')] },
  { familia: 'Orange', cores: [c('Peach', '#f7bf94'), c('Apricot', '#f2a35e'), c('Rust', '#c8581f'), c('Burnt Orange', '#d8641a'), c('Terracotta', '#b5532f'), c('Brick', '#8f2f1f'), c('Maroon', '#5e1318')] },
  { familia: 'Gray-Brown', cores: [c('White', '#f6f6f2'), c('Light Gray', '#c9cacc'), c('Ash Gray', '#a9a39d'), c('Warm Gray', '#8d857e'), c('Chocolate', '#4a2a1a'), c('Coffee', '#3a2218'), c('Dark Brown', '#2b1a12')] },
  { familia: 'Green', cores: [c('Sage Green', '#8fa88a'), c('Olive Green', '#6b7a35'), c('Army Green', '#4f5a2e'), c('Hunter Green', '#1f5b3a'), c('Emerald Green', '#0b6b45'), c('Pine Green', '#0f4f3a'), c('Forest Green', '#14402a')] }
];
export const CAMISAS: CorNomeada[] = CAMISAS_POR_FAMILIA.flatMap(f => f.cores);

export const CALCAS: CorNomeada[] = [
  c('Light Khaki', '#d8c3a0'), c('Olive Brown', '#4a4527'), c('Navy Blue', '#1c2845'), c('Dark Charcoal', '#2e3033'),
  c('Cognac Brown', '#9a5a2a'), c('Stone Gray', '#a9a9a4'), c('Black', '#151515')
];

// Combinacoes camisa + calca prontas ("best formal colour combinations").
const COMBOS: [string, string, string][] = [
  ['Emerald Green + Beige', '#0b5d3b', '#d8c3a0'], ['Sage Green + White', '#8fa88a', '#f1efe8'], ['Dusty Blue + Light Gray', '#6f8fb5', '#c4c4c4'],
  ['Burgundy + Navy Blue', '#6d1020', '#1c2845'], ['Mustard + Navy Blue', '#c8921c', '#1c2845'], ['Cream + Olive Green', '#efe3cd', '#5c6236'],
  ['Black + Light Beige', '#151515', '#d9c9ab'], ['Chocolate Brown + Beige', '#4a2a1a', '#d8c3a0'], ['Teal + Light Beige', '#0f6b6b', '#d9c9ab'],
  ['Taupe + Dark Brown', '#8a7d72', '#4a3023'], ['Lavender + Anthracite', '#a98fd0', '#3a3d42'], ['Terracotta + Cream', '#b5532f', '#eadfc6'],
  ['Sky Blue + Navy Blue', '#8fb5e0', '#1c2845'], ['Sand + White', '#c9a97a', '#f1efe8'], ['Charcoal + Khaki', '#2c2e30', '#8a8456'],
  ['Navy Blue + Camel', '#1d2a4d', '#b08a55'], ['Dusty Rose + Gray', '#c98a8f', '#6e6e72'], ['Pistachio Green + Brown', '#a8c28a', '#5a3a28'],
  ['Steel Blue + White', '#5a6e85', '#f1efe8'], ['Beige + Navy Blue', '#e0cfae', '#1c2845'], ['Olive Green + Cream', '#5a6b2a', '#eadfc6'],
  ['Wine + Gray', '#5a1425', '#6e6e72'], ['Light Gray + Navy Blue', '#b0b4ba', '#1c2845'], ['White + Black', '#f4f4f4', '#151515']
];
export const COMBINACOES = COMBOS.map(([nome, camisa, calca]) => ({ nome, camisa, calca }));
