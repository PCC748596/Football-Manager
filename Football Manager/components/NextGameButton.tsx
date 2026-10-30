import React, { useState } from 'react';
import { useGame } from '../context/GameContext';

/*
NEXT GAME: o botao ao lado do Advance Day. Passa os dias ate ao proximo jogo do utilizador, 5 segundos por dia (o motor vive no GameContext: `iniciarProximoJogo`). Para no dia do jogo,
quando chega um e-mail de resposta de negociacao, ou no STOP. Se nao ha NENHUM treino marcado nos dias ate ao jogo, pede confirmacao antes.
*/
/** Setas a girar: mostra-se dentro do DIA que esta a passar enquanto o NEXT GAME avanca. */
export const SetasAGirar: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { autoAvancoAtivo } = useGame();
  if (!autoAvancoAtivo) return null;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`animate-spin ${className}`} aria-label="Advancing days">
      <path d="M21 12a9 9 0 0 0-15-6.7L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7" /><path d="M16 16h5v5" />
    </svg>
  );
};

const NextGameButton: React.FC = () => {
  const { gameState, proximoJogo, autoAvancoAtivo, autoAvancoMotivo, iniciarProximoJogo, pararProximoJogo } = useGame();
  const [confirmar, setConfirmar] = useState(false);

  // Os dias que vao passar: de hoje ate a VESPERA do jogo. Ha treino marcado se algum grupo tem uma atividade num turno de algum desses dias.
  const semTreino = (): boolean => {
    if (!proximoJogo) return false;
    const horarios = (gameState.trainingSchedules && gameState.trainingSchedules.length ? gameState.trainingSchedules : [gameState.trainingSchedule]) as (string | null)[][][];
    const d = new Date(gameState.currentDate + 'T12:00:00');
    const fim = new Date(proximoJogo.date + 'T12:00:00');
    while (d < fim) {
      const dayIdx = (d.getDay() + 6) % 7;   // segunda = 0
      for (const h of horarios) {
        const dia = h?.[dayIdx];
        if (dia && dia.some(slot => !!slot)) return false;
      }
      d.setDate(d.getDate() + 1);
    }
    return true;
  };

  const aoClicar = () => {
    if (autoAvancoAtivo) { pararProximoJogo('Stopped'); return; }
    if (!proximoJogo) return;
    if (semTreino()) setConfirmar(true); else iniciarProximoJogo();
  };

  return (
    <>
      <button
        onClick={aoClicar}
        disabled={!proximoJogo && !autoAvancoAtivo}
        title={proximoJogo ? `Next game: ${proximoJogo.adversario} on ${proximoJogo.date} (${proximoJogo.dias} day${proximoJogo.dias === 1 ? '' : 's'}) — 5 s per day` : 'No upcoming game'}
        className={`${autoAvancoAtivo ? 'bg-rose-600 hover:bg-rose-500' : 'bg-blue-600 hover:bg-blue-500 disabled:opacity-40'} text-white font-black px-6 py-2.5 rounded text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center gap-2`}
      >
        {autoAvancoAtivo ? <>■ STOP · {gameState.currentDate}</> : <>NEXT GAME{proximoJogo ? ` (${proximoJogo.dias}d)` : ''}</>}
      </button>
      {!autoAvancoAtivo && autoAvancoMotivo && <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 max-w-[220px] truncate" title={autoAvancoMotivo}>{autoAvancoMotivo}</span>}

      {confirmar && proximoJogo && (
        <div className="fixed inset-0 z-[320] bg-black/60 flex items-center justify-center p-6" onClick={() => setConfirmar(false)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-6 w-[460px] max-w-[95vw] flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-700 dark:text-white">No training scheduled</h3>
            <p className="text-[12px] text-slate-500 dark:text-slate-300 leading-snug">
              There is no training set for the {proximoJogo.dias} day{proximoJogo.dias === 1 ? '' : 's'} before your next game{proximoJogo.adversario ? ` against ${proximoJogo.adversario}` : ''} ({proximoJogo.date}).
              Do you really want to skip ahead without any training?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmar(false)} className="px-4 py-2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-slate-600">Cancel</button>
              <button autoFocus onClick={() => { setConfirmar(false); iniciarProximoJogo(); }} className="px-4 py-2 rounded bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-500">Skip anyway</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NextGameButton;
