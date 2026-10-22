import React from 'react';
import { Player } from '../types';
import { useGame } from '../context/GameContext';
import { EstadoContrato, diasRestantes, estadoDoContrato, mesesRestantes } from '../textSim/contracts';

const ESTILO: Record<EstadoContrato, { rotulo: string; classe: string }> = {
  REGULAR: { rotulo: 'Regular', classe: 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700' },
  ATENCAO: { rotulo: 'Attention', classe: 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-500/40' },
  CRITICO: { rotulo: 'Critical', classe: 'bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-500/40' },
  VENCIDO: { rotulo: 'Expired', classe: 'bg-red-600 text-white border-red-700' }
};

/** O que falta, em texto curto: "2y 3m", "5m" ou "12d". */
export const restanteEmTexto = (fim: string, hoje: string): string => {
  const m = mesesRestantes(fim, hoje);
  if (m >= 12) return `${Math.floor(m / 12)}y ${m % 12}m`;
  if (m >= 1) return `${m}m`;
  const d = diasRestantes(fim, hoje);
  return d > 0 ? `${d}d` : 'expired';
};

export const dataCurta = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '-');

/** A etiqueta do estado do contrato (regular / atencao / critico / vencido) com o tempo que falta. */
export const ContractChip: React.FC<{ player: Player; hoje: string }> = ({ player, hoje }) => {
  const c = player.contract;
  if (!c) return <span className="text-slate-400">-</span>;
  const estado = estadoDoContrato(c, hoje), e = ESTILO[estado];
  return (
    <span title={`${dataCurta(c.start)} → ${dataCurta(c.end)} (${c.years} years)`} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-black uppercase tracking-wide whitespace-nowrap ${e.classe}`}>
      {estado !== 'REGULAR' && <span>{estado === 'VENCIDO' ? '⛔' : '⚠'}</span>}
      {estado === 'VENCIDO' ? e.rotulo : restanteEmTexto(c.end, hoje)}
    </span>
  );
};

/** O bloco de contrato do jogador: datas, duracao, estado, alerta e (no clube do utilizador) o botao de renovar. */
export const ContractPanel: React.FC<{ player: Player }> = ({ player: recebido }) => {
  const { gameState, userTeam, renewPlayer, players } = useGame();
  const player = players.find(p => p.id === recebido.id) || recebido;   // o jogador de agora (o modal guarda uma copia antiga)
  const hoje = gameState.currentDate, c = player.contract;
  const meu = !!userTeam && player.teamId === userTeam.id;
  const estado = estadoDoContrato(c, hoje);
  const alerta = estado === 'CRITICO' ? 'Critical: renew or sell this player now.' : estado === 'ATENCAO' ? 'Less than 12 months left: negotiate a renewal or consider selling.' : estado === 'VENCIDO' ? 'The contract has expired.' : '';
  return (
    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Contract</div>
        {c && <ContractChip player={player} hoje={hoje} />}
      </div>
      {c ? (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div><div className="text-[10px] text-slate-500 font-bold uppercase">Signed</div><div className="text-sm font-black text-slate-200">{dataCurta(c.start)}</div></div>
          <div><div className="text-[10px] text-slate-500 font-bold uppercase">Expires</div><div className="text-sm font-black text-slate-200">{dataCurta(c.end)}</div></div>
          <div><div className="text-[10px] text-slate-500 font-bold uppercase">Length</div><div className="text-sm font-black text-slate-200">{c.years} yr</div></div>
        </div>
      ) : <div className="text-xs text-slate-500">No contract.</div>}
      {alerta && <div className={`mt-2 text-xs font-bold ${estado === 'ATENCAO' ? 'text-amber-400' : 'text-rose-400'}`}>{alerta}</div>}
      {meu && c && (
        <button onClick={() => { if (window.confirm(`Renew ${player.name}? A new contract starts today, with a length drawn for age ${player.age} (the current one is replaced).`)) renewPlayer(player.id); }}
          className="mt-3 w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-2 rounded text-xs uppercase tracking-widest transition-colors">Renew contract</button>
      )}
    </div>
  );
};
