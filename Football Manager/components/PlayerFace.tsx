import React from 'react';
import { aparenciaDoJogador } from '../textSim/aparencia';

interface Props {
  playerId: string;
  /** Cor da camisa do clube (os ombros). */
  camisa?: string;
  className?: string;
}

const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

/*
A CARA DO JOGADOR — o mesmo modelo que joga no 3D, visto de frente: a cabeca em caixa (0.8 x 1.0), o cabelo em blocos (topo, franja e laterais) e os
olhos, nariz e boca do `construirCorpo` (3dMatch/simulador3d/js/pose.js), com a pele e o cabelo que o jogador TEM no 3D (a aparencia sai do id dele:
textSim/aparencia.ts). As medidas estao em unidades do corpo; o y do 3D sobe e o do SVG desce.
*/
export const PlayerFace: React.FC<Props> = ({ playerId, camisa = '#475569', className = '' }) => {
  const ap = aparenciaDoJogador(playerId);
  const pele = hex(ap.pele), cabelo = hex(ap.cabelo);
  // A tinta da cara, como no 3D: cinza escuro em pele clara, clara em pele escura (luminosidade < 0.42).
  const r = ((ap.pele >> 16) & 255) / 255, g = ((ap.pele >> 8) & 255) / 255, b = (ap.pele & 255) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const tinta = lum < 0.42 ? '#d9c4b8' : '#2f3640';
  const sombra = 'rgba(0,0,0,0.18)';
  return (
    <svg viewBox="-0.85 -0.78 1.7 1.7" className={className} role="img" aria-label="Rosto do jogador">
      {/* Ombros (a camisa) e pescoco */}
      <rect x="-0.72" y="0.62" width="1.44" height="0.5" rx="0.12" fill={camisa} />
      <rect x="-0.175" y="0.48" width="0.35" height="0.2" fill={pele} />
      <rect x="-0.175" y="0.48" width="0.35" height="0.07" fill={sombra} />
      {/* Cabeca */}
      <rect x="-0.4" y="-0.5" width="0.8" height="1.0" fill={pele} />
      {/* Cabelo: laterais, topo e franja */}
      <rect x="-0.475" y="-0.5" width="0.15" height="0.6" fill={cabelo} />
      <rect x="0.325" y="-0.5" width="0.15" height="0.6" fill={cabelo} />
      <rect x="-0.44" y="-0.625" width="0.88" height="0.25" fill={cabelo} />
      <rect x="-0.44" y="-0.525" width="0.88" height="0.15" fill={cabelo} />
      {/* Olhos, nariz e boca */}
      <rect x="-0.2" y="-0.22" width="0.08" height="0.14" fill={tinta} />
      <rect x="0.12" y="-0.22" width="0.08" height="0.14" fill={tinta} />
      <polyline points="0,-0.05 0,0.08 0.06,0.08" fill="none" stroke={tinta} strokeWidth="0.025" />
      <line x1="-0.12" y1="0.22" x2="0.12" y2="0.22" stroke={tinta} strokeWidth="0.03" />
    </svg>
  );
};

export default PlayerFace;
