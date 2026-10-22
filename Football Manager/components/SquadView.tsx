
import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Position, Player } from '../types';
import PlayerDetailModal from './PlayerDetailModal';
import FitnessBar from './FitnessBar';
import { ShirtIcon } from './ShirtIcon';
import { getKitDetails, getGKKitDetails } from '../types';
import YouthView from './YouthView';
import { ContractChip } from './ContractPanel';
import { estadoDoContrato } from '../textSim/contracts';

const MoraleArrow = ({ morale }: { morale: number }) => {
  if (morale >= 90) return <span className="text-amber-400 transform -rotate-90 inline-block font-bold drop-shadow-[0_0_2px_rgba(251,191,36,0.5)]">➤</span>; // Excelência
  if (morale >= 75) return <span className="text-emerald-500 transform -rotate-45 inline-block font-bold">➤</span>; // Ótima
  if (morale >= 60) return <span className="text-emerald-400 transform -rotate-[22deg] inline-block font-bold opacity-80">➤</span>; // Boa
  if (morale >= 45) return <span className="text-slate-400 inline-block font-bold opacity-60">➤</span>; // Neutra
  if (morale >= 30) return <span className="text-orange-400 transform rotate-[22deg] inline-block font-bold opacity-80">➤</span>; // Baixa
  if (morale >= 15) return <span className="text-orange-600 transform rotate-45 inline-block font-bold">➤</span>; // Muito Baixa
  return <span className="text-rose-500 transform rotate-90 inline-block font-bold">➤</span>; // Crítica
};

const getInjuryColorClass = (injury: any) => {
  if (!injury) return 'text-emerald-500';
  const severity = typeof injury === 'object' ? injury.severity : 'LIGHT';
  if (severity === 'SEVERE' || severity === 'GRAVE') return 'text-rose-500';
  if (severity === 'MEDIUM' || severity === 'MÉDIA') return 'text-amber-500';
  return 'text-emerald-500';
};

const getPosColor = (pos: Position) => {
    if (pos === Position.GK) return '#ea580c';
    if ([Position.LB, Position.CB, Position.RB].includes(pos)) return '#eab308';
    if ([Position.DM, Position.LM, Position.CM, Position.RM, Position.AM].includes(pos)) return '#16a34a';
    return '#2563eb';
};

// Helper to calculate star count based on OVR
// Logic: <50=0, 50-59=1, 60-69=2, 70-79=3, 80-89=4, 90+=5
const getStarCount = (skill: number) => {
  if (skill < 50) return 0;
  return Math.min(5, Math.floor((skill - 40) / 10));
};

export const AttributeGrowthArrow = ({ val }: { val: number }) => {
  if (!val) return null;
  const count = Math.min(3, Math.abs(val));
  const arrow = val > 0 ? '▲' : '▼';
  const color = val > 0 ? 'text-emerald-500' : 'text-rose-500';
  
  return (
    <div className={`flex flex-col -space-y-[3px] items-center justify-center ${color}`}>
      {Array(count).fill(0).map((_, i) => (
        <span key={i} className="text-[8px] leading-none">{arrow}</span>
      ))}
    </div>
  );
};

interface SquadViewProps {
  onGoToRoundSimulation?: () => void;
  onGoToMatchDay?: () => void;
}

const SquadView: React.FC<SquadViewProps> = ({ onGoToRoundSimulation, onGoToMatchDay }) => {
  const { players, userTeam, fixtures, gameState, swapShirtNumbers, formatCurrencyShort, advanceDay, t } = useGame();
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [aba, setAba] = useState<'MAIN' | 'U20'>('MAIN');
  // Ordenacao das colunas (vale para os quatro grupos de posicao): clicar no titulo ordena; clicar de novo inverte.
  const [ordem, setOrdem] = useState<{ chave: string; dir: 1 | -1 }>({ chave: 'ovr', dir: -1 });

  if (!userTeam) return null;

  const matchToday = fixtures.find(f => f.date === gameState.currentDate && (f.homeTeamId === userTeam.id || f.awayTeamId === userTeam.id));

  const myPlayers = players.filter(p => p.teamId === userTeam.id);

  const VALOR_DA_COLUNA: Record<string, (p: Player) => number | string> = {
    num: p => p.shirtNumber, pos: p => p.position, name: p => p.name, age: p => p.age, ovr: p => p.skill, fit: p => p.fitness, mor: p => p.morale,
    def: p => p.def, pas: p => p.pas, drb: p => p.drb, sht: p => p.sht, prog: p => p.weeklyGrowth, val: p => p.value,
    contract: p => (p.contract ? p.contract.end : '9999-99-99')   // o que vence primeiro vem primeiro
  };
  const comparar = (a: Player, b: Player) => {
    const f = VALOR_DA_COLUNA[ordem.chave] || VALOR_DA_COLUNA.ovr;
    const x = f(a), y = f(b);
    const c = typeof x === 'string' ? (x as string).localeCompare(y as string) : (x as number) - (y as number);
    return c * ordem.dir || b.skill - a.skill;
  };
  const alternarOrdem = (chave: string) => setOrdem(o => (o.chave === chave ? { chave, dir: (o.dir * -1) as 1 | -1 } : { chave, dir: ['name', 'pos', 'contract', 'num'].includes(chave) ? 1 : -1 }));
  const seta = (chave: string) => (ordem.chave === chave ? <span className="ml-1 text-blue-500">{ordem.dir === 1 ? '▲' : '▼'}</span> : null);

  // Contratos que pedem uma decisao (renovar ou vender): critico (6 meses ou menos) e atencao (12 meses ou menos).
  const hoje = gameState.currentDate;
  const comEstado = myPlayers.map(p => ({ p, estado: estadoDoContrato(p.contract, hoje) }));
  const criticos = comEstado.filter(x => x.estado === 'CRITICO').map(x => x.p);
  const atencao = comEstado.filter(x => x.estado === 'ATENCAO').map(x => x.p);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('playerId', id);
    e.dataTransfer.effectAllowed = 'move';
    
    // Invisible drag image
    const dragImg = new Image();
    dragImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; 
    e.dataTransfer.setDragImage(dragImg, 0, 0);

    // Defer state update to allow drag to start without immediate re-render interference
    setTimeout(() => setDraggingPlayerId(id), 0);
  };

  const handleDragEnd = () => {
    setDraggingPlayerId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('playerId');
    if (sourceId && sourceId !== targetId) {
      swapShirtNumbers(sourceId, targetId);
    }
    setDraggingPlayerId(null);
  };

  const PositionGroup = ({ title, positions, heightClass }: { title: string, positions: Position[], heightClass: string }) => {
    const groupPlayers = myPlayers.filter(p => positions.includes(p.position)).sort(comparar);
    
    return (
      <div className={`flex flex-col ${heightClass} min-h-0`}>
        <div className="flex justify-between items-center mb-2 px-1">
          <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic transition-colors">
            {title}
          </h3>
          <span className="text-[10px] font-black bg-slate-200/50 dark:bg-slate-900/60 px-2 py-0.5 rounded text-slate-500 dark:text-slate-600 border border-slate-200 dark:border-slate-800 transition-colors">
            {groupPlayers.length}
          </span>
        </div>
        <div className="bg-slate-100/50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex-1 flex flex-col shadow-xl transition-colors">
          <div className="overflow-y-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-separate border-spacing-0">
               <thead className="bg-slate-200/40 dark:bg-slate-950/60 text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase sticky top-0 z-10 transition-colors">
                 <tr>
                   <th className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 w-12 text-center cursor-pointer select-none hover:text-blue-500 whitespace-nowrap" onClick={() => alternarOrdem('num')}>#{seta('num')}</th>
                   <th className="px-2 py-2 border-b border-slate-200 dark:border-slate-800 text-center w-12 cursor-pointer select-none hover:text-blue-500 whitespace-nowrap" onClick={() => alternarOrdem('pos')}>Pos{seta('pos')}</th>
                   <th className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 cursor-pointer select-none hover:text-blue-500 whitespace-nowrap" onClick={() => alternarOrdem('name')}>Name{seta('name')}</th>
                   <th className="px-2 py-2 border-b border-slate-200 dark:border-slate-800 w-16"></th> {/* Star Column */}
                   <th className="px-2 py-2 text-center border-b border-slate-200 dark:border-slate-800 cursor-pointer select-none hover:text-blue-500 whitespace-nowrap" onClick={() => alternarOrdem('age')}>Age{seta('age')}</th>
                   <th className="px-2 py-2 text-center border-b border-slate-200 dark:border-slate-800 cursor-pointer select-none hover:text-blue-500 whitespace-nowrap" onClick={() => alternarOrdem('ovr')}>OVR{seta('ovr')}</th>
                   <th className="px-2 py-2 text-center border-b border-slate-200 dark:border-slate-800 cursor-pointer select-none hover:text-blue-500 whitespace-nowrap" onClick={() => alternarOrdem('fit')}>Fit{seta('fit')}</th>
                   <th className="px-2 py-2 text-center border-b border-slate-200 dark:border-slate-800 cursor-pointer select-none hover:text-blue-500 whitespace-nowrap" onClick={() => alternarOrdem('mor')}>Mor{seta('mor')}</th>
                   <th className="px-2 py-2 text-center border-b border-slate-200 dark:border-slate-800 cursor-pointer select-none hover:text-blue-500 whitespace-nowrap" onClick={() => alternarOrdem('def')}>Def{seta('def')}</th>
                   <th className="px-2 py-2 text-center border-b border-slate-200 dark:border-slate-800 cursor-pointer select-none hover:text-blue-500 whitespace-nowrap" onClick={() => alternarOrdem('pas')}>Pas{seta('pas')}</th>
                   <th className="px-2 py-2 text-center border-b border-slate-200 dark:border-slate-800 cursor-pointer select-none hover:text-blue-500 whitespace-nowrap" onClick={() => alternarOrdem('drb')}>Drb{seta('drb')}</th>
                   <th className="px-2 py-2 text-center border-b border-slate-200 dark:border-slate-800 cursor-pointer select-none hover:text-blue-500 whitespace-nowrap" onClick={() => alternarOrdem('sht')}>Sht{seta('sht')}</th>
                   <th className="px-2 py-2 text-center border-b border-slate-200 dark:border-slate-800 cursor-pointer select-none hover:text-blue-500 whitespace-nowrap" onClick={() => alternarOrdem('prog')}>Prog{seta('prog')}</th>
                   <th className="px-3 py-2 text-center border-b border-slate-200 dark:border-slate-800 cursor-pointer select-none hover:text-blue-500 whitespace-nowrap" onClick={() => alternarOrdem('contract')}>Contract{seta('contract')}</th>
                   <th className="px-4 py-2 text-right border-b border-slate-200 dark:border-slate-800 cursor-pointer select-none hover:text-blue-500 whitespace-nowrap" onClick={() => alternarOrdem('val')}>Val{seta('val')}</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30 transition-colors">
                 {groupPlayers.map(p => {
                   const starCount = getStarCount(p.skill);
                   return (
                   <tr 
                     key={p.id} 
                     onClick={() => setSelectedPlayer(p)}
                     className={`hover:bg-blue-50/50 dark:hover:bg-white/5 transition-colors group cursor-pointer ${draggingPlayerId === p.id ? 'opacity-40' : ''}`}
                   >
                     <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <div 
                          draggable
                          onDragStart={(e) => handleDragStart(e, p.id)}
                          onDragEnd={handleDragEnd}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, p.id)}
                          className="flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
                        >
                            <div 
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-md border-b-2 border-black/20"
                                style={{ backgroundColor: getPosColor(p.position) }}
                            >
                                {p.shirtNumber}
                            </div>
                        </div>
                     </td>
                     <td className="px-2 py-2 text-center">
                       <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded uppercase bg-slate-50 dark:bg-slate-900/40">
                         {p.position}
                       </span>
                     </td>
                     <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-200 text-sm truncate max-w-[140px] transition-colors group-hover:text-blue-500">
                        <div className="flex items-center gap-1.5">
                           {p.name}
                           {p.injury && <span className={`text-[11px] ${getInjuryColorClass(p.injury)} font-black cursor-help drop-shadow-sm leading-none`} title={typeof p.injury === 'object' ? `${p.injury.type} (${p.injury.daysOut} dias)` : 'Contundido'}>✚</span>}
                        </div>
                     </td>
                     
                     {/* Star Rating Cell */}
                     <td className="px-2 py-2 text-left">
                        <div className="flex space-x-[1px]">
                          {Array.from({ length: starCount }).map((_, i) => (
                             <span key={i} className="text-[10px] text-yellow-400 drop-shadow-sm">⭐</span>
                          ))}
                        </div>
                     </td>

                     <td className="px-2 py-2 text-center text-xs text-slate-400 dark:text-slate-500 font-medium transition-colors">{p.age}</td>
                     <td className="px-2 py-2 text-center">
                       <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20 px-1.5 py-0.5 rounded shadow-sm transition-colors">
                         {Math.round(p.skill)}
                       </span>
                     </td>
                     <td className="px-2 py-2 text-center text-xs text-slate-500 dark:text-slate-400 font-medium transition-colors">
                        <div className="flex flex-col items-center gap-1">
                           <FitnessBar fitness={p.fitness} className="w-12 h-1.5" />
                           <span>{Math.round(p.fitness)}%</span>
                        </div>
                     </td>
                     <td className="px-2 py-2 text-center text-xs font-medium transition-colors">
                        <MoraleArrow morale={Math.round(p.morale)} />
                     </td>
                      <td className="px-2 py-2 text-center text-xs text-slate-500 dark:text-slate-300 font-bold transition-colors">
                        <div className="flex items-center justify-center gap-1">
                          <span>{p.def}</span>
                          <AttributeGrowthArrow val={p.lastGrowth?.def || 0} />
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center text-xs text-slate-500 dark:text-slate-300 font-bold transition-colors">
                        <div className="flex items-center justify-center gap-1">
                          <span>{p.pas}</span>
                          <AttributeGrowthArrow val={p.lastGrowth?.pas || 0} />
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center text-xs text-slate-500 dark:text-slate-300 font-bold transition-colors">
                        <div className="flex items-center justify-center gap-1">
                          <span>{p.drb}</span>
                          <AttributeGrowthArrow val={p.lastGrowth?.drb || 0} />
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center text-xs text-slate-500 dark:text-slate-300 font-bold transition-colors">
                        <div className="flex items-center justify-center gap-1">
                          <span>{p.sht}</span>
                          <AttributeGrowthArrow val={p.lastGrowth?.sht || 0} />
                        </div>
                      </td>
                     <td className="px-2 py-2 text-center text-xs font-bold transition-colors">
                        <span className={`${p.weeklyGrowth > 0 ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`}>
                           {p.weeklyGrowth > 0 ? '+' : ''}{p.weeklyGrowth}
                        </span>
                     </td>
                     <td className="px-3 py-2 text-center"><ContractChip player={p} hoje={hoje} /></td>
                     <td className="px-4 py-2 text-right text-emerald-600 dark:text-emerald-400 text-[11px] font-black tracking-tight font-mono transition-colors">
                       {formatCurrencyShort(p.value)}
                     </td>
                   </tr>
                 )})}
               </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in">
      <div className="flex justify-between items-start">
         <div>
            <h2 className="text-4xl font-black uppercase tracking-tight italic leading-none transition-colors">
              <span className="text-slate-900 dark:text-white">SQUAD</span> <span className="text-blue-500">MANAGEMENT</span>
            </h2>
            <p className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-2 opacity-60 transition-colors">
              Drag n drop shirt numbers to swap between players • Click on rows for details
            </p>
         </div>
         <div className="flex gap-4 items-center">
             <div className="bg-slate-100 dark:bg-slate-900/60 px-5 py-2.5 rounded-lg text-slate-400 dark:text-slate-400 border border-slate-200 dark:border-slate-800 shadow-lg flex items-center gap-3 transition-colors h-full">
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-600 transition-colors">Formation:</span>
               <span className="font-black text-slate-800 dark:text-white text-lg tracking-tighter italic transition-colors">{userTeam.tactics.formation}</span>
             </div>
             {matchToday ? (
               <div className="flex gap-2">
                 {(() => {
                   const activeMatchView = typeof window !== 'undefined' ? localStorage.getItem('activeMatchView') : null;
                   const showSimulate = gameState.matchMinute === 0 || activeMatchView === 'TRAINING';
                   const showMatchDay = gameState.matchMinute === 0 || activeMatchView === 'MATCH';
                   
                   return (
                     <>
                        {showSimulate && (
                           <button 
                             onClick={() => { localStorage.setItem('activeMatchView', 'TRAINING'); onGoToRoundSimulation?.(); }}
                             className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-2.5 rounded text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center gap-2 border-b-4 border-emerald-800 h-full"
                           >
                             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="10"/></svg>
                             {gameState.matchMinute > 0 ? 'RESUME SIM' : t('dash_simulate')}
                           </button>
                        )}
                        {showMatchDay && (
                           <button 
                             onClick={() => { localStorage.setItem('activeMatchView', 'MATCH'); onGoToMatchDay?.(); }}
                             className="bg-blue-600 hover:bg-blue-500 text-white font-black px-6 py-2.5 rounded text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center gap-2 border-b-4 border-blue-800 h-full"
                           >
                             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M6.7 6.7l10.6 10.6"/><path d="M6.7 17.3l10.6-10.6"/></svg>
                             {gameState.matchMinute > 0 ? 'RESUME MATCH' : t('dash_match_day')}
                           </button>
                        )}
                     </>
                   );
                 })()}
               </div>
             ) : (
               <button 
                 onClick={advanceDay}
                 className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-2.5 rounded text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center gap-2 h-full"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m13 17 5-5-5-5M6 17l5-5-5-5"/></svg>
                 {t('dash_advance')}
               </button>
             )}
         </div>
      </div>
      
      <div className="flex gap-2">
        {([['MAIN', 'Main team'], ['U20', 'Sub-20']] as const).map(([id, rotulo]) => (
          <button key={id} onClick={() => setAba(id)} className={`px-6 py-2 rounded text-sm font-black uppercase tracking-widest transition-colors ${aba === id ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-800 dark:hover:text-white'}`}>{rotulo}</button>
        ))}
      </div>

      {aba === 'U20' ? <YouthView /> : (<>
      {(criticos.length > 0 || atencao.length > 0) && (
        <div className={`rounded-lg border px-4 py-2.5 text-sm font-bold flex flex-wrap items-center gap-x-4 gap-y-1 ${criticos.length ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400' : 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40 text-amber-600 dark:text-amber-400'}`}>
          <span className="font-black uppercase tracking-widest">⚠ Contracts</span>
          {criticos.length > 0 && <span>Critical (6 months or less): {criticos.map(p => p.name).join(', ')}</span>}
          {atencao.length > 0 && <span>Attention (12 months or less): {atencao.map(p => p.name).join(', ')}</span>}
          <span className="opacity-80">Negotiate a renewal or sell — click a player to open the contract.</span>
        </div>
      )}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">
        <div className="flex flex-col gap-8 min-h-0">
          <PositionGroup title="Goalkeepers" positions={[Position.GK]} heightClass="h-[25%]" />
          <PositionGroup title="Defenders" positions={[Position.LB, Position.CB, Position.RB]} heightClass="h-[75%]" />
        </div>
        <div className="flex flex-col gap-8 min-h-0">
          <PositionGroup title="Midfielders" positions={[Position.DM, Position.LM, Position.CM, Position.RM, Position.AM]} heightClass="h-1/2" />
          <PositionGroup title="Forwards" positions={[Position.LW, Position.RW, Position.SS, Position.ST]} heightClass="h-1/2" />
        </div>
      </div>
      </>)}

      {selectedPlayer && (
        <PlayerDetailModal 
          player={selectedPlayer} 
          onClose={() => setSelectedPlayer(null)} 
        />
      )}
    </div>
  );
};

export default SquadView;
