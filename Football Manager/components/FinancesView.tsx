
import React, { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { generatePlayer } from '../textSim/dataGenerator';
import { Position, Player } from '../types';
import { settleMatch, type CurrencyCode } from '../textSim/stadiumEconomy';

const FinancesView: React.FC = () => {
  const { userTeam, players, hirePlayer, sellPlayer, gameState, isTransferWindowOpen, formatCurrency, formatWage, t } = useGame();
  const [marketPhase, setMarketPhase] = useState<'OVERVIEW' | 'MARKET'>('OVERVIEW');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  
  // Market Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('ALL');

  const marketPlayers = useMemo(() => {
    // Determine a seed or limit generation to avoid infinite re-renders if dependencies change
    // Using currentWeek ensures the market refreshes weekly, not on every click
    const list: Player[] = [];
    // Only generate 25 players per week to simulate market availability
    const seedBase = 9000 + (gameState.currentWeek * 50); 
    
    const groups = [
      [Position.GK],
      [Position.LB, Position.CB, Position.RB],
      [Position.DM, Position.LM, Position.CM, Position.RM, Position.AM],
      [Position.LW, Position.RW, Position.SS, Position.ST]
    ];

    for (let i = 0; i < 25; i++) {
      const group = groups[Math.floor((i % 4))]; // Ensure distribution
      const pos = group[Math.floor(Math.random() * group.length)];
      list.push(generatePlayer('MARKET', pos, seedBase + i, 99)); // 99 as dummy shirt number
    }
    return list;
  }, [gameState.currentWeek]);

  // Filter Market Players
  const filteredMarketPlayers = useMemo(() => {
    return marketPlayers.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPos = positionFilter === 'ALL' || 
        (positionFilter === 'GK' && p.position === Position.GK) ||
        (positionFilter === 'DEF' && [Position.LB, Position.CB, Position.RB].includes(p.position)) ||
        (positionFilter === 'MID' && [Position.DM, Position.LM, Position.CM, Position.RM, Position.AM].includes(p.position)) ||
        (positionFilter === 'ATT' && [Position.LW, Position.RW, Position.SS, Position.ST].includes(p.position));
      return matchesSearch && matchesPos;
    });
  }, [marketPlayers, searchTerm, positionFilter]);

  if (!userTeam) return null;

  const teamPlayers = players.filter(p => p.teamId === userTeam.id);
  const totalSalaries = teamPlayers.reduce((sum, p) => sum + p.salary, 0);
  
  // Use real attendance data for revenue estimation
  // Proximo jogo em casa: publico = capacidade x ocupacao actual; renda = publico x preco medio; custo do estadio pela capacidade (textSim/stadiumEconomy.ts).
  const eco = settleMatch(userTeam, userTeam, { id: '', week: 0, date: '', homeTeamId: userTeam.id, awayTeamId: '', homeScore: 0, awayScore: 0 } as any, gameState.currency as CurrencyCode);
  const attendance = eco.attendance;
  const estMatchRevenue = Math.round(eco.revenueUSD);
  const estStadiumCost = Math.round(eco.costUSD);

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('en-US').format(val);
  }

  const windowOpen = isTransferWindowOpen();

  const sortedTeamPlayers = useMemo(() => {
    let sortablePlayers = [...teamPlayers];
    if (sortConfig !== null) {
      sortablePlayers.sort((a, b) => {
        // @ts-ignore
        let aValue = a[sortConfig.key];
        // @ts-ignore
        let bValue = b[sortConfig.key];
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    } else {
      return sortablePlayers.sort((a,b) => b.salary - a.salary);
    }
    return sortablePlayers;
  }, [teamPlayers, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <span className="opacity-30 ml-1">↕</span>;
    return <span className="ml-1 text-blue-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tight leading-none italic transition-colors">
            <span className="text-slate-900 dark:text-white transition-colors">FINANCIAL</span> <span className="text-blue-500">CENTER</span>
          </h2>
          <p className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-2 opacity-60 transition-colors">
            {t('fin_subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => setMarketPhase('OVERVIEW')}
             className={`px-6 py-2 rounded font-black text-xs uppercase tracking-widest transition-all ${marketPhase === 'OVERVIEW' ? 'bg-emerald-600/10 text-emerald-600 dark:bg-emerald-600 dark:text-white border border-emerald-600/30 shadow-lg' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
           >
             {t('fin_treasury')}
           </button>
           <button 
             onClick={() => setMarketPhase('MARKET')}
             className={`px-6 py-2 rounded font-black text-xs uppercase tracking-widest transition-all ${marketPhase === 'MARKET' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
           >
             {t('fin_market')}
           </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {marketPhase === 'OVERVIEW' ? (
          <div className="grid grid-cols-12 gap-6 h-full">
            <div className="col-span-12 grid grid-cols-5 gap-4">
               <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xl transition-colors">
                  <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{t('dash_avail_balance')}</div>
                  <div className="text-2xl font-black text-slate-800 dark:text-white transition-colors">{formatCurrency(userTeam.cash)}</div>
               </div>
               <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xl transition-colors">
                  <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{t('fin_weekly_sal')}</div>
                  <div className="text-2xl font-black text-rose-500 transition-colors">{formatCurrency(totalSalaries)}</div>
               </div>
               <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xl transition-colors">
                  <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{t('fin_match_rev')}</div>
                  <div className="text-2xl font-black text-blue-500 dark:text-blue-400 transition-colors">{formatCurrency(estMatchRevenue)}</div>
                  <div className="text-[9px] text-slate-400 mt-1">{formatNumber(attendance)} fans · {Math.round(eco.occupancy * 100)}% full · stadium cost {formatCurrency(estStadiumCost)}/match</div>
               </div>
               <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xl transition-colors">
                  <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{t('fin_sponsor')}</div>
                  <div className="text-2xl font-black text-emerald-500 transition-colors">{formatCurrency(userTeam.sponsorAmount || 0)}</div>
               </div>
               <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xl transition-colors">
                  <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{t('fin_fanbase')}</div>
                  <div className="text-2xl font-black text-slate-600 dark:text-slate-300 transition-colors">{formatNumber(userTeam.fanBase || 0)}</div>
               </div>
            </div>

            <div className="col-span-8 bg-white/80 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col transition-colors shadow-lg h-full">
              <div className="bg-slate-50 dark:bg-slate-950/60 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center transition-colors">
                 <h3 className="text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">{t('fin_squad_payroll')}</h3>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead className="sticky top-0 z-10 shadow-sm">
                    <tr className="bg-slate-50 dark:bg-slate-900 text-[9px] text-slate-400 uppercase font-black">
                      <th className="px-6 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('name')}>
                        Player {getSortIcon('name')}
                      </th>
                      <th className="px-4 py-3 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('skill')}>
                        Skill {getSortIcon('skill')}
                      </th>
                      <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('salary')}>
                        Wage {getSortIcon('salary')}
                      </th>
                      <th className="px-6 py-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('value')}>
                        Market Value {getSortIcon('value')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {sortedTeamPlayers.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-2 font-bold text-sm text-slate-700 dark:text-slate-200">{p.name}</td>
                        <td className="px-4 py-2 text-center text-xs font-black text-blue-600 dark:text-blue-400">{p.skill}</td>
                        <td className="px-4 py-2 text-right text-rose-500 text-sm font-mono">{formatWage(p.salary)}</td>
                        <td className="px-6 py-2 text-right font-black text-sm text-slate-900 dark:text-white">
                           <div className="flex flex-col items-end">
                              {formatCurrency(p.value)}
                              {windowOpen && (
                                <button onClick={() => sellPlayer(p.id)} className="text-[8px] text-rose-600 uppercase mt-0.5 opacity-0 group-hover:opacity-100 font-bold hover:underline">{t('fin_sell')}</button>
                              )}
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="col-span-4 bg-white/80 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4 shadow-lg h-full">
                 <h3 className="text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">{t('fin_summary')}</h3>
                 <div className="space-y-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded border border-slate-100 dark:border-slate-800">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">{t('fin_season_budget')}</div>
                        <div className="text-xl font-black text-slate-800 dark:text-white mt-1">{formatCurrency(userTeam.initialCapital || 0)}</div>
                    </div>
                     <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded border border-slate-100 dark:border-slate-800">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">{t('fin_transfer_budget')}</div>
                        <div className="text-xl font-black text-emerald-600 mt-1">{formatCurrency(userTeam.initialTransfer || 0)}</div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded border border-slate-100 dark:border-slate-800">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">{t('fin_avg_att')}</div>
                        <div className="text-xl font-black text-blue-600 mt-1">{formatNumber(userTeam.avrAttendance || 0)}</div>
                        <div className="text-[9px] text-slate-400 mt-1">Stadium capacity: {formatNumber(userTeam.stadiumCapacity || 0)}</div>
                    </div>
                 </div>
            </div>
          </div>
        ) : (
          <div className="h-full">
            {!windowOpen ? (
              <div className="h-full flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg text-center p-12">
                 <span className="text-6xl mb-6">🔒</span>
                 <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic">{t('fin_market_closed')}</h3>
                 <p className="text-slate-500 max-w-md mt-2">{t('fin_market_closed_msg')}</p>
              </div>
            ) : (
              <div className="bg-white/80 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 h-full flex flex-col overflow-hidden shadow-lg">
                <div className="bg-slate-50 dark:bg-slate-950/60 px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex gap-4 items-center">
                   <div className="flex-1">
                      <input 
                        type="text" 
                        placeholder={t('fin_search')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors text-slate-800 dark:text-white"
                      />
                   </div>
                   <div className="flex gap-2">
                      {['ALL', 'GK', 'DEF', 'MID', 'ATT'].map(pos => (
                        <button
                          key={pos}
                          onClick={() => setPositionFilter(pos)}
                          className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all ${positionFilter === pos ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700'}`}
                        >
                          {pos}
                        </button>
                      ))}
                   </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-4 custom-scrollbar">
                   {filteredMarketPlayers.map(p => (
                     <div key={p.id} className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex justify-between items-center group hover:border-blue-300 dark:hover:border-slate-600 transition-all">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-black text-slate-400 text-sm">
                              {p.position}
                           </div>
                           <div>
                              <div className="text-sm font-black text-slate-800 dark:text-white">{p.name}</div>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] font-bold text-slate-400">
                                 <span className="text-blue-500">OVR {p.skill}</span>
                                 <span>•</span>
                                 <span>AGE {p.age}</span>
                              </div>
                           </div>
                        </div>
                        <div className="text-right">
                           <div className="text-base font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(p.value)}</div>
                           <div className="text-[9px] text-slate-400 font-mono mb-1">Wage: {formatWage(p.salary)}</div>
                           <button 
                             onClick={() => hirePlayer(p)} 
                             disabled={userTeam.cash < p.value}
                             className="px-4 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-[9px] uppercase rounded-sm transition-colors"
                           >
                             {t('fin_sign')}
                           </button>
                        </div>
                     </div>
                   ))}
                   {filteredMarketPlayers.length === 0 && (
                     <div className="col-span-2 text-center py-10 text-slate-400 text-sm font-bold uppercase tracking-widest">
                       {t('fin_no_players')}
                     </div>
                   )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancesView;
