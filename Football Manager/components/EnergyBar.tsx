
import React from 'react';

/** Energia diaria (0-100) do jogador. Saves antigos podem nao ter `energia`: cai para o espelho legado `fitness`. */
export const energiaDe = (p: { energia?: number; fitness?: number }): number => p.energia ?? p.fitness ?? 100;

/** Match Form / Tank (0-100). Saves antigos sem o campo: 50 (o valor inicial do gerador). */
export const matchFormDe = (p: { matchForm?: number }): number => p.matchForm ?? 50;

const clamp = (v: number) => Math.min(100, Math.max(0, Number.isFinite(v) ? v : 0));

/** 5 segmentos de 20 pontos cada. */
const SegmentedBar: React.FC<{ value: number; className: string; colorFor: (v: number) => string; title?: string }> = ({ value, className, colorFor, title }) => {
  const v = clamp(value);
  const colorClass = colorFor(v);
  return (
    <div className={`flex gap-[2px] ${className}`} title={title}>
      {[0, 20, 40, 60, 80].map((threshold, i) => {
        const fillPercent = (Math.min(20, Math.max(0, v - threshold)) / 20) * 100;
        return (
          <div key={i} className="flex-1 h-full bg-slate-200 dark:bg-slate-800 rounded-[1px] overflow-hidden relative">
            <div className={`absolute inset-0 ${colorClass} transition-all duration-300`} style={{ width: `${fillPercent}%` }} />
          </div>
        );
      })}
    </div>
  );
};

const energyColor = (val: number) => {
  if (val <= 20) return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.2)]';
  if (val <= 40) return 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.2)]';
  if (val <= 80) return 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.2)]';
  return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.2)]';
};

const matchFormColor = (val: number) => {
  if (val <= 30) return 'bg-slate-400';
  if (val <= 60) return 'bg-sky-400';
  return 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.2)]';
};

interface EnergyBarProps {
  energy: number;
  className?: string;
}

const EnergyBar: React.FC<EnergyBarProps> = ({ energy, className = "" }) => (
  <SegmentedBar value={energy} className={className} colorFor={energyColor} title={`Energy ${Math.round(clamp(energy))}%`} />
);

/** Indicador separado do Match Form (ritmo de jogo, 0-100), em tons de azul para nao se confundir com a energia. */
export const MatchFormBar: React.FC<{ matchForm: number; className?: string }> = ({ matchForm, className = "" }) => (
  <SegmentedBar value={matchForm} className={className} colorFor={matchFormColor} title={`Match Form ${Math.round(clamp(matchForm))}`} />
);

export default EnergyBar;
