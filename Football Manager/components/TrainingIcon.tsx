import React from 'react';
import { TrainingActivity } from '../textSim/trainingService';

type Categoria = TrainingActivity['category'];

// Uma cor por tipo de treino (usada nos icones, nas abas e nos cartoes).
export const COR_DO_TREINO: Record<Categoria, string> = {
  DEFENSE: '#3b82f6',   // azul
  MIDFIELD: '#22c55e',  // verde
  ATTACK: '#ef4444',    // vermelho
  TACTICS: '#a855f7',   // roxo
  FITNESS: '#f59e0b',   // ambar
};

// Icones de linha (viewBox 24x24, traco 2): um por sessao de treino, pelo id de ACTIVITIES.
const FORMAS: Record<string, React.ReactNode> = {
  // DEFENSE
  tackling: <><path d="M3 17h14a4 4 0 0 0 4-4v-1l-5-2-2-4H9v6l-6 2z" /><path d="M3 21h18" /></>,
  marking: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  def_pos: <><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M3 9.3h18M3 14.7h18M9 4v5.3M15 9.3v5.4M9 14.7V20" /></>,
  aerial: <><path d="M12 20V6" /><path d="M6 11l6-6 6 6" /><path d="M6 19h12" /></>,
  // MIDFIELD
  passing: <><path d="M4 8h14" /><path d="M14 4l4 4-4 4" /><path d="M20 16H6" /><path d="M10 12l-4 4 4 4" /></>,
  control: <><circle cx="12" cy="12" r="9" /><path d="M12 8l3.5 2.5-1.3 4h-4.4l-1.3-4z" /></>,
  vision: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  playmaking: <><circle cx="6" cy="6" r="2.2" /><circle cx="18" cy="8" r="2.2" /><circle cx="9" cy="18" r="2.2" /><path d="M7.7 7.5l8.5 0.4M7 8l1.5 8M16.8 9.9L10.6 16.6" /></>,
  // ATTACK
  shooting: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  finishing: <><path d="M3 20V8h18v12" /><path d="M3 12h18M3 16h18M8 8v12M13 8v12M18 8v12" /></>,
  crossing: <><path d="M4 20c0-8 6-13 15-13" /><path d="M14 3l5 4-4 5" /></>,
  wingplay: <><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /><path d="M4 7h6M4 17h6" /></>,
  // TACTICS
  video: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M10 8.5v4l4-2z" /><path d="M8 21h8M12 17v4" /></>,
  setpieces: <><path d="M6 21V3" /><path d="M6 4h12l-3 4 3 4H6" /></>,
  pressing: <><path d="M3 12h6" /><path d="M6 8l4 4-4 4" /><path d="M21 12h-6" /><path d="M18 8l-4 4 4 4" /></>,
  shadow: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6" /><circle cx="17" cy="9" r="2.4" opacity="0.55" /><path d="M16 14.2c3 0 5 2.2 5 5.3" opacity="0.55" /></>,
  // FITNESS
  cardio: <><path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z" /><path d="M3.5 12H8l1.5-3 3 6 1.5-3h5" /></>,
  strength: <><path d="M6.5 6.5v11M17.5 6.5v11" /><path d="M3 9v6M21 9v6" /><path d="M6.5 12h11" /></>,
  sprints: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  recovery: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>,
};

const MONTANHA = <><path d="M3 20l6-11 4 6 2-3 6 8z" /><circle cx="17" cy="6" r="1.5" /></>;

interface Props {
  /** O id de ACTIVITIES (ex.: 'tackling'); 'camp' desenha a montanha do estagio. */
  id: string;
  categoria?: Categoria;
  className?: string;
  /** Sem cor propria (herda do pai), por exemplo quando o cartao esta desativado. */
  semCor?: boolean;
}

const TrainingIcon: React.FC<Props> = ({ id, categoria, className = 'w-8 h-8', semCor }) => {
  const forma = id === 'camp' ? MONTANHA : FORMAS[id];
  const cor = semCor || !categoria ? 'currentColor' : COR_DO_TREINO[categoria];
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {forma || <circle cx="12" cy="12" r="8" />}
    </svg>
  );
};

export default TrainingIcon;
