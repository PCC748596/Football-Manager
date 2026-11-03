import React from 'react';
import { Team, League } from '../types';
import { expectativaDoClube, expectativaPorFases } from '../textSim/managerExpectations';

export interface Expectativa {
  /** 0-5: o nivel da expectativa (ou, na Serie D, a fase-meta: 0 segunda fase ... 5 titulo). */
  nivel: number;
  /** -1, 0 ou +1: a tradicao do clube sobe ou desce a cobranca. */
  ajuste: -1 | 0 | 1;
  /** Meta de posicao na tabela (so fora da Serie D). */
  alvo: number;
  porFases: boolean;
  campeao: boolean;
  /** O texto da etiqueta (ex.: "Target: top 5", "To be Champion", "Oitavas de final"). */
  meta: string;
  /** A frase do objetivo (ex.: "Finish near the top"). */
  rotulo: string;
  notaTradicao: string;
}

/**
 * A expectativa da diretoria para um clube, pronta para mostrar (escolha de clube, Manager career e aba Manager).
 * Serie D (grupos + mata-mata): a meta e a FASE a alcancar; nas outras ligas, a posicao na tabela.
 */
export const calcularExpectativa = (pt: boolean, team: Team, leagueTeams: Team[], league?: League): Expectativa => {
  const porFases = league?.format === 'SERIE_D';
  const fases = expectativaPorFases(leagueTeams, team);
  const tab = expectativaDoClube(leagueTeams, team, league?.relegated ?? Math.round(leagueTeams.length * 0.2));
  const nivel = porFases ? fases.fase : tab.nivel, ajuste = porFases ? fases.ajuste : tab.ajuste;
  const notaTradicao = ajuste === 0 ? '' : ajuste > 0 ? (pt ? 'A tradição do clube eleva a cobrança.' : "The club's history raises the demand.") : (pt ? 'A pouca tradição reduz a cobrança.' : 'Little history lowers the demand.');
  const rotulos = porFases
    ? (pt ? ['Passar da primeira fase', 'Chegar à terceira fase', 'Chegar às oitavas de final', 'Chegar às quartas de final', 'Chegar à semifinal e subir', 'Conquistar o título']
      : ['Get past the group stage', 'Reach the third phase', 'Reach the round of 16', 'Reach the quarter-finals', 'Reach the semi-finals and go up', 'Win the title'])
    : pt ? ['Evitar o rebaixamento', 'Garantir a permanência', 'Terminar na metade de cima', 'Terminar entre os primeiros', 'Disputar o título', 'Conquistar o título']
      : ['Avoid relegation', 'Secure survival', 'Finish in the upper half', 'Finish near the top', 'Compete for the title', 'Win the title'];
  const campeao = porFases ? nivel === 5 : tab.alvo <= 3;
  const nomesFase = pt ? ['Segunda fase', 'Terceira fase', 'Oitavas de final', 'Quartas de final', 'Semifinal'] : ['Second phase', 'Third phase', 'Round of 16', 'Quarter-finals', 'Semi-finals'];
  const meta = campeao ? (pt ? 'Ser campeão' : 'To be Champion') : porFases ? nomesFase[nivel] : (pt ? `Meta: top ${tab.alvo}` : `Target: top ${tab.alvo}`);
  return { nivel, ajuste, alvo: tab.alvo, porFases, campeao, meta, rotulo: rotulos[nivel], notaTradicao };
};

const CORES = ['bg-red-500', 'bg-orange-500', 'bg-amber-400', 'bg-lime-400', 'bg-emerald-400', 'bg-yellow-300'];

/** O box visual da expectativa: titulo, etiqueta da meta, objetivo e a barra de 6 niveis. O fundo (e o padding) vem de `className`. */
export const BoardExpectationBox: React.FC<{ exp: Expectativa; pt: boolean; className?: string }> = ({ exp, pt, className = '' }) => (
  <div className={className}>
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{pt ? 'Expectativa da diretoria' : 'Board expectations'}</span>
      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 ${exp.campeao ? 'bg-yellow-400/20 text-yellow-300' : 'bg-blue-500/20 text-blue-300'}`}>{exp.campeao ? '🏆 ' : ''}{exp.meta}</span>
    </div>
    <div className="font-black text-white text-base leading-tight mt-1">{exp.rotulo}</div>
    <div className="flex gap-1 mt-2">
      {CORES.map((cor, i) => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= exp.nivel ? cor : 'bg-white/10'}`} />)}
    </div>
    <div className="flex justify-between text-[8px] font-bold text-white/40 uppercase tracking-widest mt-1"><span>{exp.porFases ? (pt ? 'Grupos' : 'Groups') : (pt ? 'Permanência' : 'Survival')}</span><span>{pt ? 'Título' : 'Title'}</span></div>
  </div>
);
