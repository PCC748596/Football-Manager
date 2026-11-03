import React, { useState } from 'react';
import { Player, RatingDetalhe } from '../types';

// As mesmas faixas do 3D (Notas.corDaNota em simulador3d/js/ratings/notas_ligacao.js).
export const corDaNota = (n: number) =>
  n >= 9 ? '#1b8a3a' : n >= 8 ? '#37b24d' : n >= 7 ? '#82c91e' : n >= 6 ? '#fcc419' : n >= 5 ? '#fd9a14' : n >= 4 ? '#e8590c' : '#e03131';

const CATEGORIAS: { chave: 'tatico' | 'tecnico' | 'participacao' | 'disciplina'; rotulo: string }[] = [
  { chave: 'tatico', rotulo: 'TAT' },
  { chave: 'tecnico', rotulo: 'TEC' },
  { chave: 'participacao', rotulo: 'PAR' },
  { chave: 'disciplina', rotulo: 'DIS' },
];

interface Props {
  jogadores: Player[];
  notas: Record<string, number>;
  detalhes?: Record<string, RatingDetalhe>;
  motm?: string;
}

/**
 * Tabela individual das notas (a do ecra de estatisticas do 3D): posicao, nome, golos/assistencias, nota na cor da faixa.
 * Destaques: Man of the Match (estrela), as duas piores notas da equipa e o destaque defensivo (6+ acoes defensivas).
 * Clicar numa linha com detalhe abre as 4 categorias (tatico, tecnico, participacao, disciplina).
 */
const PlayerRatingsList: React.FC<Props> = ({ jogadores, notas, detalhes, motm }) => {
  const [aberto, setAberto] = useState<string | null>(null);
  const linhas = jogadores
    .filter(p => notas[p.id] !== undefined)
    .map(p => ({ p, nota: notas[p.id], d: detalhes?.[p.id] }))
    .sort((a, b) => b.nota - a.nota);
  const piores = new Set(
    linhas.filter(l => l.d).slice(-2).filter(l => l.nota < 6).map(l => l.p.id)
  );

  return (
    <div className="flex-1 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
      {linhas.map(({ p, nota, d }) => {
        const moc = motm === p.id || !!d?.moc;
        const defDest = (d?.def || 0) >= 6;
        const aberta = aberto === p.id && !!d;
        return (
          <div key={p.id}>
            <div
              onClick={() => d && setAberto(aberta ? null : p.id)}
              className={`flex items-center gap-2 px-3 py-1.5 transition-colors ${d ? 'cursor-pointer' : ''} ${moc ? 'bg-amber-500/25 hover:bg-amber-500/35' : piores.has(p.id) ? 'bg-rose-500/20 hover:bg-rose-500/30' : 'bg-black/50 hover:bg-black/65'}`}
            >
              {d?.pos && <span className="w-7 text-[9px] font-black text-slate-500 uppercase not-italic">{d.pos}</span>}
              <span className="flex-1 min-w-0 text-[13px] font-bold text-white truncate">
                {moc && <span className="text-amber-400">★ </span>}
                {p.name.split(' ').pop()}
                <small className="ml-1 text-[10px] font-normal">
                  {d?.golos ? ` ⚽${d.golos > 1 ? d.golos : ''}` : ''}
                  {d?.assistencias ? ` 🅰${d.assistencias > 1 ? d.assistencias : ''}` : ''}
                  {defDest ? ' 🛡' : ''}
                </small>
              </span>
              <span className="min-w-[2.2rem] text-center font-black text-[11px] text-slate-950 px-1.5 py-0.5" style={{ background: corDaNota(nota) }}>
                {nota.toFixed(1)}
              </span>
            </div>
            {aberta && d && (
              <div className="mt-0.5 mb-1 px-3 py-2 bg-black/50 space-y-1">
                <div className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{d.minutos} min</div>
                {CATEGORIAS.map(c => (
                  <div key={c.chave} className="flex items-center gap-2 text-[9px] font-black text-slate-400">
                    <span className="w-7">{c.rotulo}</span>
                    <span className="flex-1 h-1.5 rounded bg-slate-800 overflow-hidden">
                      <b className="block h-full" style={{ width: `${Math.max(0, Math.min(100, d[c.chave]))}%`, background: corDaNota(1 + 9 * d[c.chave] / 100) }} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PlayerRatingsList;
