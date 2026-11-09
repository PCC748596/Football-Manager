import React from 'react';
import { useGame } from '../context/GameContext';
import { faixaDeConfianca, USUARIO_ID, Faixa } from '../textSim/managerExpectations';

export const FAIXAS: Record<Faixa, { en: string; pt: string; cor: string }> = {
  EXCELENTE: { en: 'Excellent', pt: 'Excelente', cor: 'bg-emerald-500' },
  BOA: { en: 'Good', pt: 'Boa', cor: 'bg-lime-500' },
  PRESSAO: { en: 'Under pressure', pt: 'Pressão', cor: 'bg-amber-500' },
  RISCO: { en: 'Job at risk', pt: 'Risco de demissão', cor: 'bg-orange-500' },
  IMINENTE: { en: 'Dismissal imminent', pt: 'Demissão iminente', cor: 'bg-red-600' }
};

/** Linha compacta: confianca da diretoria e reputacao do utilizador (mercado de treinadores, textSim/managerExpectations.ts). */
const BoardConfidenceCard: React.FC = () => {
  const { managerState, gameState } = useGame();
  const eu = managerState?.managers[USUARIO_ID];
  if (!eu) return null;
  const pt = gameState.language === 'PT';
  const faixa = FAIXAS[faixaDeConfianca(eu.confidence)];
  return (
    <div className="flex items-center gap-2 mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400" title={pt ? 'Confiança da diretoria e reputação do treinador' : 'Board confidence and manager reputation'}>
      <span>{pt ? 'Diretoria' : 'Board'}</span>
      {/* 100 retangulos em pe, um por ponto (o mesmo padrao do Manager Career). */}
      <div className="flex gap-px h-3 w-[200px]">{Array.from({ length: 100 }, (_, i) => <div key={i} className={`flex-1 min-w-0 ${i < Math.round(Math.max(0, Math.min(100, eu.confidence))) ? faixa.cor : 'bg-slate-300 dark:bg-white/10'}`} />)}</div>
      <span className="text-slate-800 dark:text-white">{Math.round(eu.confidence)} · {pt ? faixa.pt : faixa.en}</span>
      <span className="opacity-50">|</span>
      <span>{pt ? 'Reputação' : 'Reputation'} <span className="text-slate-800 dark:text-white">{eu.reputation}</span></span>
    </div>
  );
};

export default BoardConfidenceCard;
