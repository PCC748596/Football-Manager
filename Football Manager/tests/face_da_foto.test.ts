import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { lerFaceDaFoto, rostoPixelado, cabeloPixelado, RESOLUCAO_ROSTO, RESOLUCAO_CABELO } from '../textSim/faceFromPhoto';
import { FACES } from '../textSim/facesDatabase';
import { aparenciaDoJogador, ROSTO_PIXELADO } from '../textSim/aparencia';

const luma = (h: string) => { const n = parseInt(h.slice(1), 16); return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); };
const rgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

test('foto de referencia (Martinelli, Fluminense-RJ): pele, cabelo escuro curto e barba', () => {
  const meta = JSON.parse(fs.readFileSync('tests/fixtures/martinelli.json', 'utf8'));
  const r = lerFaceDaFoto({ data: fs.readFileSync('tests/fixtures/martinelli.rgba'), width: meta.width, height: meta.height });
  console.log('Martinelli ->', JSON.stringify(r.face), 'avisos:', r.avisos.length);
  const [pr, pg, pb] = rgb(r.face.pele);
  assert.ok(pr > pg && pg > pb, 'pele quente (R > G > B)');
  assert.ok(luma(r.face.pele) > 110 && luma(r.face.pele) < 210, 'pele nem escura nem estourada: ' + luma(r.face.pele));
  assert.ok(luma(r.face.cabelo) < 70, 'cabelo escuro: ' + r.face.cabelo);
  assert.ok(['curto', 'degrade', 'topete'].includes(r.face.estilo), 'cabelo curto com volume em cima: ' + r.face.estilo);
  assert.equal(r.face.barba, 'cheia', 'barba cheia (queixo e mandibulas escuros)');
  assert.equal(r.face.oculos, false);
  assert.equal(r.avisos.length, 0);
  assert.equal(r.detalhe.fundo.length, 7);
  assert.ok(luma(r.detalhe.fundo) > 220, 'fundo claro');
});

test('foto do Fabio (Fluminense-RJ): degrade nas laterais e cavanhaque ralo, nao barba cheia', () => {
  const meta = JSON.parse(fs.readFileSync('tests/fixtures/fabio.json', 'utf8'));
  const r = lerFaceDaFoto({ data: fs.readFileSync('tests/fixtures/fabio.rgba'), width: meta.width, height: meta.height });
  console.log('Fabio ->', JSON.stringify(r.face));
  assert.equal(r.face.estilo, 'degrade', 'os lados sao baixos: ' + r.face.estilo);
  assert.equal(r.face.barba, 'cavanhaque', 'so o queixo, ralo: ' + r.face.barba);
  assert.ok(luma(r.face.cabelo) < 90, 'cabelo escuro: ' + r.face.cabelo);
});

// Uma foto sintetica: fundo claro, cabeca elipsoidal cor de pele, e (opcionalmente) cabelo escuro em cima e barba escura em baixo.
const sintetica = (opc: { cabelo?: boolean; barba?: boolean }) => {
  const W = 160, H = 180, data = new Uint8ClampedArray(W * H * 4);
  const pele = [208, 148, 114], fundo = [244, 244, 244], escuro = [38, 34, 33];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let c = fundo;
    const dx = (x - 80) / 38, dy = (y - 80) / 50;
    const dentro = dx * dx + dy * dy < 1;
    if (dentro) c = pele;
    if (opc.cabelo && dx * dx + ((y - 70) / 52) * ((y - 70) / 52) < 1 && y < 42) c = escuro;     // calota de cabelo (so o topo da cabeca)
    if (opc.barba && dentro && y > 104) c = escuro;                                                // barba no queixo
    const i = (y * W + x) * 4; data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255;
  }
  return { data, width: W, height: H };
};

test('cabeca sem cabelo e sem barba: careca e sem barba', () => {
  const r = lerFaceDaFoto(sintetica({}));
  assert.equal(r.face.estilo, 'careca'); assert.equal(r.face.barba, 'nenhuma');
  assert.ok(luma(r.face.pele) > 120);
});

test('com cabelo escuro em cima e barba escura em baixo: cabelo e barba cheia', () => {
  const r = lerFaceDaFoto(sintetica({ cabelo: true, barba: true }));
  assert.ok(r.face.estilo !== 'careca', 'achou cabelo: ' + r.face.estilo);
  assert.ok(luma(r.face.cabelo) < 80);
  assert.ok(['cheia', 'rala'].includes(r.face.barba), 'achou barba: ' + r.face.barba);
});

test('foto sem rosto no centro: avisa', () => {
  const W = 100, H = 100, data = new Uint8ClampedArray(W * H * 4).fill(245);
  const r = lerFaceDaFoto({ data, width: W, height: H });
  assert.ok(r.avisos.length >= 1);
});
