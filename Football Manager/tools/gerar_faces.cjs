/*
Gera, a partir da fonte unica `3dMatch/simulador3d/data/faces.json` (o que o Editor de Faces do manager grava), os dois ficheiros que o jogo le:
  . 3dMatch/simulador3d/data/faces.js   `FacesPersonalizadas` (o 3D)
  . textSim/facesDatabase.ts            `FACES` (o manager: a cara do Overview, a lista do mercado...)
    node tools/gerar_faces.cjs
Usado tambem pelo endpoint /api/save-face do servidor de desenvolvimento (vite.config.ts).
*/
const fs = require('fs');
const path = require('path');

const gerar = (raiz) => {
  const origem = path.join(raiz, '3dMatch', 'simulador3d', 'data', 'faces.json');
  const faces = fs.existsSync(origem) ? JSON.parse(fs.readFileSync(origem, 'utf8') || '{}') : {};
  const chaves = Object.keys(faces).sort((a, b) => Number(a) - Number(b));
  const corpo = chaves.map(k => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(faces[k]) + ',').join('\n');
  fs.writeFileSync(path.join(raiz, '3dMatch', 'simulador3d', 'data', 'faces.js'),
`// GERADO por tools/gerar_faces.cjs (ou pelo Editor de Faces do manager) a partir de data/faces.json — nao editar a mao.
// Chave: o numero do id do jogador (o \`idPlayer\` da base; no manager o id e "p-<numero>").
const FacesPersonalizadas = {
${corpo}
};
if (typeof window !== 'undefined') window.FacesPersonalizadas = FacesPersonalizadas;
`, 'utf8');
  fs.writeFileSync(path.join(raiz, 'textSim', 'facesDatabase.ts'),
`// GERADO por tools/gerar_faces.cjs (ou pelo Editor de Faces do manager) a partir de 3dMatch/simulador3d/data/faces.json — nao editar a mao.
import type { FaceCustom } from './aparencia';

// Chave: o numero do id do jogador (no manager o id e "p-<numero>").
export const FACES: Record<string, FaceCustom> = {
${corpo}
};
`, 'utf8');
  return chaves.length;
};

/** Grava (ou apaga, com `face` nula) a face de um jogador em faces.json e regenera os dois ficheiros. */
const gravar = (raiz, id, face) => {
  const origem = path.join(raiz, '3dMatch', 'simulador3d', 'data', 'faces.json');
  const faces = fs.existsSync(origem) ? JSON.parse(fs.readFileSync(origem, 'utf8') || '{}') : {};
  if (face) faces[String(id)] = face; else delete faces[String(id)];
  fs.writeFileSync(origem, JSON.stringify(faces, null, 2) + '\n', 'utf8');
  return gerar(raiz);
};

module.exports = { gerar, gravar };
if (require.main === module) console.log('faces:', gerar(path.resolve(__dirname, '..')));
