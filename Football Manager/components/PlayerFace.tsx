import React from 'react';
import { aparenciaDoJogador } from '../textSim/aparencia';
import type { Aparencia, FaceCustom } from '../textSim/aparencia';

interface Props {
  playerId: string;
  /** Cor da camisa do clube (os ombros). */
  camisa?: string;
  /** Uma face em edicao (Editor de Faces): sobrepoe a do jogador, para a previa ao vivo. */
  face?: FaceCustom;
  className?: string;
}

const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');
const paraRgb = (h: string): [number, number, number] => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
/** Mistura duas cores: t = 0 -> a, t = 1 -> b. */
export const misturar = (a: string, b: string, t: number): string => {
  const x = paraRgb(a), y = paraRgb(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
};

/*
A CARA DO JOGADOR — o mesmo modelo que joga no 3D, visto de frente: a cabeca em caixa (0.8 x 1.0), o cabelo em blocos (topo, franja e laterais) e os
olhos, nariz e boca do `construirCorpo` (3dMatch/simulador3d/js/pose.js), com a pele e o cabelo que o jogador TEM no 3D (a aparencia sai do id dele:
textSim/aparencia.ts). As medidas estao em unidades do corpo; o y do 3D sobe e o do SVG desce.

AS FACES PERSONALIZADAS (Editor de Faces) acrescentam o ESTILO do cabelo (curto, raspado, longo, topete, careca), a BARBA (rala, cheia, so bigode), os OCULOS e a LARGURA
do rosto: as mesmas pecas que o 3D desenha (pose.js, `aplicarFaceCustom`).
*/
export const PlayerFace: React.FC<Props> = ({ playerId, camisa = '#475569', face, className = '' }) => {
  const base: Aparencia = aparenciaDoJogador(playerId);
  const ap: Aparencia = face
    ? { ...base, tipo: 'custom', pele: parseInt(face.pele.replace('#', ''), 16), cabelo: parseInt(face.cabelo.replace('#', ''), 16), estilo: face.estilo, barba: face.barba, oculos: face.oculos, largura: face.largura }
    : base;
  const pele = hex(ap.pele), cabelo = hex(ap.cabelo);
  // A tinta da cara, como no 3D: cinza escuro em pele clara, clara em pele escura (luminosidade < 0.42).
  const r = ((ap.pele >> 16) & 255) / 255, g = ((ap.pele >> 8) & 255) / 255, b = (ap.pele & 255) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const tinta = lum < 0.42 ? '#d9c4b8' : '#2f3640';
  const sombra = 'rgba(0,0,0,0.18)';
  const estilo = ap.estilo || 'curto', barba = ap.barba || 'nenhuma', largura = ap.largura || 1;
  const labios = misturar(pele, '#b0524f', 0.45);
  return (
    <svg viewBox="-0.85 -0.95 1.7 1.87" className={className} role="img" aria-label="Rosto do jogador">
      {/* Ombros (a camisa) e pescoco */}
      <rect x="-0.72" y="0.62" width="1.44" height="0.5" rx="0.12" fill={camisa} />
      <rect x="-0.175" y="0.48" width="0.35" height="0.2" fill={pele} />
      <rect x="-0.175" y="0.48" width="0.35" height="0.07" fill={sombra} />
      <g transform={`scale(${largura} 1)`}>
        {/* Cabeca */}
        <rect x="-0.4" y="-0.5" width="0.8" height="1.0" fill={pele} />
        {/* Cabelo: laterais, topo e franja, por estilo */}
        {estilo === 'curto' && (<>
          <rect x="-0.475" y="-0.5" width="0.15" height="0.6" fill={cabelo} />
          <rect x="0.325" y="-0.5" width="0.15" height="0.6" fill={cabelo} />
          <rect x="-0.44" y="-0.625" width="0.88" height="0.25" fill={cabelo} />
          <rect x="-0.44" y="-0.525" width="0.88" height="0.15" fill={cabelo} />
        </>)}
        {estilo === 'raspado' && (<>
          <rect x="-0.43" y="-0.5" width="0.07" height="0.3" fill={cabelo} />
          <rect x="0.36" y="-0.5" width="0.07" height="0.3" fill={cabelo} />
          <rect x="-0.42" y="-0.57" width="0.84" height="0.14" fill={cabelo} />
        </>)}
        {estilo === 'longo' && (<>
          <rect x="-0.52" y="-0.5" width="0.18" height="1.05" fill={cabelo} />
          <rect x="0.34" y="-0.5" width="0.18" height="1.05" fill={cabelo} />
          <rect x="-0.46" y="-0.65" width="0.92" height="0.28" fill={cabelo} />
          <rect x="-0.44" y="-0.525" width="0.88" height="0.15" fill={cabelo} />
        </>)}
        {estilo === 'topete' && (<>
          <rect x="-0.44" y="-0.5" width="0.1" height="0.45" fill={cabelo} />
          <rect x="0.34" y="-0.5" width="0.1" height="0.45" fill={cabelo} />
          <rect x="-0.42" y="-0.8" width="0.84" height="0.43" fill={cabelo} />
          <rect x="-0.4" y="-0.45" width="0.8" height="0.1" fill={cabelo} />
        </>)}
        {/* Barba */}
        {/* A barba comeca LOGO ABAIXO DO NARIZ (o nariz acaba em y = 0.08): nunca por cima dele. */}
        {barba === 'rala' && <rect x="-0.4" y="0.1" width="0.8" height="0.4" fill={misturar(pele, cabelo, 0.3)} />}
        {barba === 'cheia' && (<>
          <rect x="-0.4" y="0.1" width="0.8" height="0.4" fill={misturar(pele, cabelo, 0.9)} />
          <rect x="-0.4" y="-0.05" width="0.1" height="0.25" fill={misturar(pele, cabelo, 0.9)} />
          <rect x="0.3" y="-0.05" width="0.1" height="0.25" fill={misturar(pele, cabelo, 0.9)} />
        </>)}
        {barba === 'bigode' && <rect x="-0.18" y="0.11" width="0.36" height="0.07" fill={cabelo} />}
        {/* Olhos, nariz e boca */}
        <rect x="-0.2" y="-0.22" width="0.08" height="0.14" fill={tinta} />
        <rect x="0.12" y="-0.22" width="0.08" height="0.14" fill={tinta} />
        <polyline points="0,-0.05 0,0.08 0.06,0.08" fill="none" stroke={tinta} strokeWidth="0.025" />
        {barba === 'cheia' || barba === 'bigode'
          ? <rect x="-0.12" y="0.2" width="0.24" height="0.05" fill={labios} />
          : <line x1="-0.12" y1="0.22" x2="0.12" y2="0.22" stroke={tinta} strokeWidth="0.03" />}
        {/* Oculos */}
        {ap.oculos && (<>
          <rect x="-0.29" y="-0.3" width="0.26" height="0.22" fill="none" stroke="#1f2937" strokeWidth="0.035" />
          <rect x="0.03" y="-0.3" width="0.26" height="0.22" fill="none" stroke="#1f2937" strokeWidth="0.035" />
          <line x1="-0.03" y1="-0.22" x2="0.03" y2="-0.22" stroke="#1f2937" strokeWidth="0.035" />
        </>)}
      </g>
    </svg>
  );
};

export default PlayerFace;
