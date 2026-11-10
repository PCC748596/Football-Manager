import React from 'react';

// Os icones dos PlayStyles como desenho de LINHA (SVG), todos no mesmo padrao: grelha 24x24, traco 2, pontas arredondadas, cor = currentColor.
// A cor vem da funcao do estilo (criacao, marcacao, apoio e corrida).
const D = (...partes: string[]) => partes.map((d, i) => <path key={i} d={d} />);

const DESENHO: Record<string, React.ReactNode> = {
  'Fox in the Box': D('M4 3l5 5h6l5-5v9c0 5-3.5 9-8 9s-8-4-8-9z', 'M9 13h.01M15 13h.01', 'M10.5 17h3'),
  'Goal Poacher': D('M13 2L4 14h7l-1 8 9-12h-7z'),
  'Target Man': <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  'Dummy Runner': D('M3 12h3M9 12h3', 'M15 7l5 5-5 5'),
  'Extra Frontman': D('M7 20V5', 'M3 9l4-4 4 4', 'M17 20V5', 'M13 9l4-4 4 4'),   // duas setas para a frente, lado a lado
  'Cross Specialist': D('M4 20C4 11 10 5 20 5', 'M16 1.5l4 3.5-3.5 4'),
  'Prolific Winger': <><path d="M4 3v18" /><circle cx="13" cy="17" r="3.2" /><path d="M13 13V4M9.5 7.5L13 4l3.5 3.5" /></>,   // a linha lateral + a bola subindo pela ala
  'Roaming Flank': <><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></>,
  'Creative Playmaker': D('M9 18h6', 'M10 21h4', 'M12 3a6 6 0 0 0-4 10.5c1 1 1 2 1 3.5h6c0-1.5 0-2.5 1-3.5A6 6 0 0 0 12 3z'),
  'Classic No. 10': <text x="12" y="17" textAnchor="middle" fontSize="14" fontWeight="900" fontFamily="Arial, sans-serif" fill="currentColor" stroke="none">10</text>,
  'Hole Player': <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /></>,
  'Box-to-Box': D('M4 8h16', 'M16 4l4 4-4 4', 'M20 16H4', 'M8 12l-4 4 4 4'),
  'Orchestrator': <><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></>,
  'Anchor Man': <><circle cx="12" cy="5" r="2.5" /><path d="M12 7.5V21M8 11h8M5 14a7 7 0 0 0 14 0" /></>,
  'The Destroyer': D('M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'),
  'Build Up': <><circle cx="12" cy="12" r="9" /><path d="M12 8l3.5 2.5-1.3 4h-4.4l-1.3-4z" /></>,
  'Offensive Full-back': D('M12 20V5', 'M6 11l6-6 6 6'),
  'Full-back Finisher': D('M6 12l6-6 6 6', 'M6 19l6-6 6 6'),
  'Defensive Full-back': <><rect x="3" y="5" width="18" height="14" rx="1" /><path d="M3 12h18M9 5v7M15 12v7" /></>,
  'Defensive Goalkeeper': D('M8 13V6.5a1.5 1.5 0 0 1 3 0V12', 'M11 11V4.5a1.5 1.5 0 0 1 3 0V11', 'M14 11V6a1.5 1.5 0 0 1 3 0v7', 'M17 10a1.5 1.5 0 0 1 3 0v5a7 7 0 0 1-7 7h-1.5a6 6 0 0 1-5-3L4 14.5a1.5 1.5 0 0 1 2.5-1.5L8 15'),
  'Offensive Goalkeeper': <><rect x="3" y="6" width="18" height="14" rx="1" /><path d="M9 6v14M15 6v14M3 13h18" /></>,
};

// Criacao = amarelo, marcacao = vermelho, apoio e corrida (o resto) = verde.
const AMARELO = '#facc15', VERMELHO = '#f87171', VERDE = '#4ade80';
const CATEGORIA: Record<string, string> = {
  'Creative Playmaker': AMARELO, 'Classic No. 10': AMARELO, 'Orchestrator': AMARELO, 'Hole Player': VERDE, 'Cross Specialist': AMARELO, 'Build Up': AMARELO,
  'The Destroyer': VERMELHO, 'Anchor Man': VERMELHO, 'Defensive Full-back': VERMELHO, 'Defensive Goalkeeper': VERMELHO,
  'Fox in the Box': VERDE, 'Goal Poacher': VERDE, 'Target Man': VERDE, 'Dummy Runner': VERDE, 'Extra Frontman': VERDE, 'Prolific Winger': VERDE, 'Roaming Flank': VERDE,
  'Box-to-Box': VERDE, 'Offensive Full-back': VERDE, 'Full-back Finisher': VERDE, 'Offensive Goalkeeper': VERDE,
};

export const IconePlayStyleSvg = ({ estilo, tam }: { estilo: string; tam: number }) => (
  <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ color: CATEGORIA[estilo] || '#cbd5e1' }} aria-hidden="true">
    {DESENHO[estilo] || <><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></>}
  </svg>
);
