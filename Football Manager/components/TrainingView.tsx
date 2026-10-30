
import NextGameButton, { SetasAGirar } from './NextGameButton';
import React, { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { Position, Player } from '../types';

import { ACTIVITIES, TrainingActivity, Impact } from '../textSim/trainingService';
import { AttributeGrowthArrow } from './SquadView';
import FitnessBar from './FitnessBar';

const PLANE_ICON = (
  <div className="flex flex-col items-center justify-center opacity-30 select-none pointer-events-none">
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-20 h-20 transform -rotate-45">
      <path d="M21 16V14L13 9V3.5A1.5 1.5 0 0 0 11.5 2A1.5 1.5 0 0 0 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z" />
    </svg>
    <span className="text-[12px] font-black tracking-[0.2em] mt-1">TRAVEL</span>
  </div>
);

const getTeamState = (name: string) => name.split('-').pop() || '';

const TrainingView: React.FC = () => {
  const { gameState, userTeam, teams, fixtures, players, setTrainingSchedules, unlockTrainingGroup, updatePlayerTrainingGroup, advanceDay, formatCurrency, formatCurrencyShort, t } = useGame();
  const [activeCategory, setActiveCategory] = useState<TrainingActivity['category']>('DEFENSE');
  const [selectedGroup, setSelectedGroup] = useState<number>(0);
  const [squadSortBy, setSquadSortBy] = useState<'growth' | 'fitness'>('growth');
  
  // Use gameState schedule directly
  const program = gameState.trainingSchedules?.[selectedGroup] || gameState.trainingSchedule;

  const weekInfo = useMemo(() => {
    const days = [];
    const curr = new Date(gameState.currentDate + 'T12:00:00');
    const dayOfWeek = curr.getDay();
    const diff = curr.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(curr.setDate(diff));

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      const dayActivity = gameState.activities.find(a => a.date === dStr);
      
      days.push({
        date: dStr,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        dayNum: d.getDate(),
        isToday: dStr === gameState.currentDate,
        isPast: dStr < gameState.currentDate,
        isTrainingCamp: dayActivity?.type === 'TRAINING_CAMP',
        activity: dayActivity
      });
    }
    return { days };
  }, [gameState.currentDate, gameState.activities]);

  const matchesInWeek = useMemo(() => {
    if (!userTeam) return [];
    const weekDates = weekInfo.days.map(d => d.date);
    const userMatches = fixtures.filter(f => 
      weekDates.includes(f.date) && 
      (f.homeTeamId === userTeam.id || f.awayTeamId === userTeam.id)
    );
    
    return userMatches.map(userMatch => {
      const dIndex = weekDates.indexOf(userMatch.date);
      const opponentId = userMatch.homeTeamId === userTeam.id ? userMatch.awayTeamId : userMatch.homeTeamId;
      const opponent = teams.find(t => t.id === opponentId);
      return { index: dIndex, opponent: (opponent?.name || 'Opponent').toUpperCase() };
    });
  }, [weekInfo, userTeam, fixtures, teams]);

  const isTravelDay = (dIdx: number) => {
    const nextDay = weekInfo.days[dIdx + 1];
    if (!nextDay || !userTeam) return false;
    const nextMatch = fixtures.find(f => f.date === nextDay.date && (f.homeTeamId === userTeam.id || f.awayTeamId === userTeam.id));
    if (nextMatch && nextMatch.awayTeamId === userTeam.id) {
       const homeTeam = teams.find(t => t.id === nextMatch.homeTeamId);
       if (homeTeam) {
          const homeState = getTeamState(homeTeam.name);
          const userState = getTeamState(userTeam.name);
          return homeState !== userState;
       }
    }
    return false;
  };

  const handleSlotUpdate = (dayIdx: number, slotIdx: number, activityId: string) => {
    if (matchesInWeek.some(m => m.index === dayIdx)) return;
    if (slotIdx === 3 && isTravelDay(dayIdx)) return;
    
    // Deep copy the schedule to ensure reactivity update
    const newSchedules = (gameState.trainingSchedules || [gameState.trainingSchedule, Array(7).fill(null).map(() => Array(4).fill(null)), Array(7).fill(null).map(() => Array(4).fill(null))]).map(g => g.map(d => [...d]));
    newSchedules[selectedGroup][dayIdx][slotIdx] = activityId || null;
    
    setTrainingSchedules(newSchedules);
  };

  const getActivity = (id: string | null) => ACTIVITIES.find(a => a.id === id);

  const getTeamAvg = (attr: keyof Player) => {
    const teamPlayers = players.filter(p => p.teamId === userTeam?.id);
    if (!teamPlayers.length) return 0;
    // @ts-ignore
    return Math.round(teamPlayers.reduce((acc, p) => acc + (p[attr] || 0), 0) / teamPlayers.length);
  };

  const avgDef = useMemo(() => getTeamAvg('def'), [players, userTeam]);
  const avgPas = useMemo(() => getTeamAvg('pas'), [players, userTeam]);
  const avgDrb = useMemo(() => getTeamAvg('drb'), [players, userTeam]);
  const avgSht = useMemo(() => getTeamAvg('sht'), [players, userTeam]);
  const avgFit = useMemo(() => getTeamAvg('fitness'), [players, userTeam]);
  const teamChe = useMemo(() => userTeam?.chemistry || 50, [userTeam]);

  const squadPlayers = useMemo(() => {
    const list = players.filter(p => p.teamId === userTeam?.id);
    if (squadSortBy === 'fitness') {
        return [...list].sort((a, b) => a.fitness - b.fitness); // Tired first
    }
    return [...list].sort((a, b) => b.weeklyGrowth - a.weeklyGrowth); // Growing first
  }, [players, userTeam, squadSortBy]);

  // Training Limits
  const LIMITS = {
    categories: {
      DEFENSE: 7,
      MIDFIELD: 7,
      ATTACK: 7,
      TACTICS: 4,
      FITNESS: 4
    },
    activities: 2
  };

  const usageCounts = useMemo(() => {
    const counts = {
      categories: { DEFENSE: 0, MIDFIELD: 0, ATTACK: 0, TACTICS: 0, FITNESS: 0 },
      activities: {} as Record<string, number>
    };

    program.forEach(day => {
      day.forEach(actId => {
        if (actId) {
          const act = ACTIVITIES.find(a => a.id === actId);
          if (act) {
            counts.activities[actId] = (counts.activities[actId] || 0) + 1;
            // @ts-ignore
            counts.categories[act.category]++;
          }
        }
      });
    });
    return counts;
  }, [program]);

  const StatBox = ({ icon, label, value, color }: { icon: string, label: string, value: number, color: string }) => (
    <div className="flex-1 flex flex-col items-center justify-center p-2 border-r last:border-r-0 border-slate-200 dark:border-slate-800/50 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
        <span className="text-2xl mb-1 filter drop-shadow-sm">{icon}</span>
        <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</div>
        <div className={`text-2xl font-black italic tracking-tighter ${color}`}>{value}</div>
    </div>
  );

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tight italic leading-none transition-colors">
            <span className="text-slate-200 dark:text-white">TRAINING</span> <span className="text-blue-500">CENTER</span>
          </h2>
          <p className="text-slate-400 dark:text-slate-500 font-black text-[9px] uppercase tracking-[0.2em] mt-2 opacity-60 italic transition-colors">
            Schedule your team's weekly development
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
<button 
           onClick={advanceDay}
           className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-2.5 rounded text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center gap-2"
        >
           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m13 17 5-5-5-5M6 17l5-5-5-5"/></svg>
           {t('dash_advance')}
        </button>
<NextGameButton />
</div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        
        {/* LEFT COLUMN: CALENDAR GRID + TEAM STATS */}
        <div className="col-span-7 flex flex-col gap-4 min-h-0">
           {/* CALENDAR */}
           <div className="flex-1 bg-slate-200/50 dark:bg-slate-950/40 rounded-xl border border-slate-300 dark:border-slate-800/60 flex flex-col overflow-hidden shadow-xl transition-colors min-h-0">
              <div className="bg-slate-300/50 dark:bg-slate-900/60 px-6 py-3 border-b border-slate-300 dark:border-slate-800 flex justify-between items-center transition-colors">
                 <div className="flex gap-2">
                    {[0, 1, 2].map(grp => (
                       <button 
                         key={grp}
                         onClick={() => setSelectedGroup(grp)}
                         className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest transition-colors ${selectedGroup === grp ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-700'}`}
                       >
                          G{grp + 1}
                       </button>
                    ))}
                 </div>
                 <button 
                   disabled={selectedGroup >= (gameState.unlockedTrainingGroups || 1)}
                   onClick={() => {
                     const newSchedules = (gameState.trainingSchedules || [gameState.trainingSchedule, Array(7).fill(null).map(() => Array(4).fill(null)), Array(7).fill(null).map(() => Array(4).fill(null))]).map(g => g.map(d => [...d]));
                     newSchedules[selectedGroup] = Array(7).fill(null).map(() => Array(4).fill(null));
                     setTrainingSchedules(newSchedules);
                   }}
                   className="text-[9px] font-black text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white uppercase tracking-widest transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                 >
                   Clear Calendar
                 </button>
              </div>
              
              {selectedGroup >= (gameState.unlockedTrainingGroups || 1) ? (
                 <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-50 dark:bg-slate-900/30">
                    <span className="text-5xl mb-4 drop-shadow-sm filter grayscale opacity-80">🔒</span>
                    <h3 className="text-lg font-black text-slate-700 dark:text-white uppercase tracking-tight mb-2">Group Locked</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-6 max-w-xs">{t('Unlock this group to assign customized schedules for specific players.')}</p>
                    <button 
                      onClick={() => unlockTrainingGroup()}
                      disabled={(userTeam?.cash || 0) < 100000}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-black px-6 py-3 rounded text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center gap-2"
                    >
                      {formatCurrencyShort(100000)} - UNLOCK
                    </button>
                 </div>
              ) : (
                <div className="flex-1 p-3 grid grid-cols-7 gap-2 bg-white dark:bg-transparent overflow-y-auto">
                 {weekInfo.days.map((day, dIdx) => {
                   const matchForDay = matchesInWeek.find(m => m.index === dIdx);
                   const isMatchDay = !!matchForDay;
                   const travel = isTravelDay(dIdx);

                   return (
                     <div key={dIdx} className="flex flex-col gap-1.5 h-full relative">
                        <div className={`text-center py-1.5 rounded-t transition-colors relative z-10 ${day.isToday ? 'bg-blue-600/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500' : (isMatchDay ? 'text-blue-500' : 'text-slate-400 dark:text-slate-600')}`}>
                          <div className="text-[8px] font-black leading-none uppercase">{day.dayName}</div>
                          <div className="text-xs font-black mt-0.5">{day.dayNum}</div>
                          {day.isToday && <SetasAGirar className="w-3.5 h-3.5 mx-auto mt-0.5" />}
                        </div>
                       
                       {isMatchDay && matchForDay ? (
                         <div className="flex-1 bg-blue-50 dark:bg-blue-900/10 rounded-b-lg border border-blue-200 dark:border-blue-500/20 flex flex-col items-center relative overflow-hidden transition-colors">
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-1">
                               <div className="text-[50px] font-black italic tracking-tighter text-blue-500/20 dark:text-blue-500/15 whitespace-nowrap transition-all uppercase leading-none" style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}>
                                  {matchForDay.opponent}
                                </div>
                            </div>
                         </div>
                       ) : (
                        <div className={`flex-1 flex flex-col gap-1 relative ${day.isPast ? 'opacity-20 pointer-events-none grayscale' : ''}`}>
                             {day.isTrainingCamp && (
                                 <div className="absolute inset-x-0 -bottom-1 h-2 flex items-center justify-center">
                                     <div className="w-full h-full bg-emerald-500/20 rounded-full blur-[2px]"></div>
                                 </div>
                             )}
                            {[0,1,2,3].map((slotIdx) => {
                              const act = getActivity(program[dIdx][slotIdx]);
                              const isLastSlot = slotIdx === 3;
                              const isBlocked = isLastSlot && travel;

                              return (
                                <div 
                                  key={slotIdx}
                                  onDragOver={(e) => !isBlocked && e.preventDefault()}
                                  onDrop={(e) => {
                                    if (isBlocked) return;
                                    const id = e.dataTransfer.getData("activityId");
                                    if (id) handleSlotUpdate(dIdx, slotIdx, id);
                                  }}
                                  className={`flex-1 rounded border transition-all relative group overflow-hidden ${
                                    isBlocked ? 'border-amber-200/50 dark:border-amber-500/20 bg-amber-500/5 cursor-not-allowed' :
                                    day.isTrainingCamp ? 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-500/5' :
                                    act ? 'border-blue-300 dark:border-blue-500/50 bg-blue-50 dark:bg-blue-600/10 shadow-[inset_0_0_10px_rgba(59,130,246,0.1)]' : 'border-dashed border-slate-300 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-900/20 cursor-pointer'
                                  }`}
                                >
                                   {(act || day.isTrainingCamp) && !isBlocked ? (
                                     <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                                        <span className={`text-6xl drop-shadow-sm leading-none flex-1 flex items-center justify-center ${day.isTrainingCamp && !act ? 'opacity-20 grayscale scale-110' : ''}`}>
                                            {act ? act.icon : '🏔️'}
                                        </span>
                                        <span className="absolute bottom-0 w-full text-center text-[10px] font-black text-slate-800 dark:text-white uppercase leading-none tracking-tighter truncate bg-white/60 dark:bg-black/60 backdrop-blur-[2px] py-1">
                                            {act ? act.name : 'CAMP'}
                                        </span>
                                     </div>
                                   ) : !isBlocked ? (
                                     <div className="absolute inset-0 flex items-center justify-center opacity-5 dark:opacity-5 transition-opacity">
                                       <div className="w-3 h-3 bg-slate-400 dark:bg-white rounded-full"></div>
                                     </div>
                                   ) : null}
                                   
                                   {isBlocked && (
                                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                                       {PLANE_ICON}
                                     </div>
                                   )}

                                   {act && !isBlocked && (
                                     <div 
                                       onClick={(e) => { e.stopPropagation(); handleSlotUpdate(dIdx, slotIdx, ''); }}
                                       className="absolute top-0 right-0 w-3 h-3 bg-black/80 text-white flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 hover:bg-red-600 z-10 transition-all"
                                     >×</div>
                                   )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                 })}
              </div>
              )}
           </div>

           {/* TEAM STATS PANEL - 6 COLUMNS: DEF, PAS, DRB, SHT, FIT, TAC */}
           <div className="h-32 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex overflow-hidden shadow-lg transition-colors">
              <StatBox icon="🛡️" label="DEF" value={avgDef} color="text-slate-800 dark:text-white" />
              <StatBox icon="🔄" label="PAS" value={avgPas} color="text-slate-800 dark:text-white" />
              <StatBox icon="⚽" label="DRB" value={avgDrb} color="text-slate-800 dark:text-white" />
              <StatBox icon="🎯" label="SHT" value={avgSht} color="text-slate-800 dark:text-white" />
              <StatBox icon="⚡" label="FIT" value={avgFit} color="text-emerald-500" />
              <StatBox icon="🧠" label="ENT" value={teamChe} color="text-blue-500" />
           </div>
        </div>

        {/* RIGHT: TRAINING SESSIONS */}
        <div className="col-span-5 flex flex-col min-h-0">
           {/* TABS */}
           <div className="flex gap-1 mb-0.5 shrink-0">
             {[
               { id: 'DEFENSE', label: 'Defense' },
               { id: 'MIDFIELD', label: 'Midfield' },
               { id: 'ATTACK', label: 'Attack' },
               { id: 'TACTICS', label: 'Tactics' },
               { id: 'FITNESS', label: 'Fitness' }
             ].map(tab => {
               const catUsage = usageCounts.categories[tab.id as keyof typeof LIMITS.categories];
               const limitCat = LIMITS.categories[tab.id as keyof typeof LIMITS.categories];
               const isExhausted = catUsage >= limitCat;
               
               return (
               <button 
                 key={tab.id}
                 onClick={() => setActiveCategory(tab.id as any)}
                 className={`flex-1 flex flex-col items-center justify-center py-2 text-[9px] font-black uppercase tracking-widest rounded-t-lg transition-all ${
                   activeCategory === tab.id 
                   ? 'bg-slate-200 dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-t border-x border-slate-300 dark:border-slate-800 z-10 shadow-sm' 
                   : 'bg-slate-300/40 dark:bg-slate-950/60 text-slate-500 dark:text-slate-600 border-t border-x border-transparent hover:text-slate-700 dark:hover:text-slate-400'
                 }`}
               >
                 <span>{tab.label}</span>
                 <span className={`text-[7px] mt-0.5 px-1.5 py-0.5 rounded leading-none ${isExhausted ? 'bg-rose-500 text-white' : activeCategory === tab.id ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-500' : 'bg-slate-200/50 dark:bg-black/20 text-slate-400'}`}>{catUsage}/{limitCat}</span>
               </button>
             )})}
           </div>

           <div className="flex-1 flex flex-col gap-4 min-h-0">
               {/* SESSION CONTAINER */}
               <div className="flex-none h-[35%] bg-slate-200/50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-b-xl rounded-tr-xl p-6 relative overflow-hidden shadow-xl transition-colors">
                 {/* Subtle Watermark */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.05] dark:opacity-[0.02] pointer-events-none select-none transition-opacity">
                   <span className="text-[140px] font-black italic tracking-tighter text-slate-500 dark:text-white">COACH</span>
                 </div>

                 <div className="relative z-10 h-full flex flex-col">
                   <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-4 font-black uppercase tracking-widest italic flex items-center gap-2 transition-colors">
                     <span className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></span>
                     Drag sessions into the calendar slots
                   </p>

                   <div className="grid grid-cols-4 gap-2 flex-1 bg-white/40 dark:bg-transparent rounded p-2 overflow-hidden">
                      {ACTIVITIES.filter(a => a.category === activeCategory).map(act => {
                        const actUsage = usageCounts.activities[act.id] || 0;
                        const catUsage = usageCounts.categories[act.category as keyof typeof LIMITS.categories];
                        const limitCat = LIMITS.categories[act.category as keyof typeof LIMITS.categories];
                        const limitAct = LIMITS.activities;
                        
                        const isActExhausted = actUsage >= limitAct;
                        const isCatExhausted = catUsage >= limitCat;
                        // Prevent dragging if exhausted
                        const isDisabled = isActExhausted || isCatExhausted;

                        return (
                        <div 
                          key={act.id}
                          draggable={!isDisabled}
                          onDragStart={(e) => { if (!isDisabled) e.dataTransfer.setData("activityId", act.id); }}
                          className={`flex flex-col items-center justify-center text-center gap-1 group p-2 rounded-xl transition-all border border-transparent h-full relative ${isDisabled ? 'opacity-50 grayscale cursor-not-allowed border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-900/10' : 'cursor-grab active:cursor-grabbing hover:bg-blue-50 dark:hover:bg-white/5 hover:border-blue-200 dark:hover:border-slate-800 hover:shadow-lg'}`}
                        >
                           {isDisabled && (
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-rose-500 text-white text-[8px] font-black px-2 py-0.5 rounded rotate-12 z-20 whitespace-nowrap shadow-lg">
                               {isCatExhausted ? 'CAT. LIMIT' : 'EXHAUSTED'}
                             </div>
                           )}
                           <div className={`w-16 h-16 bg-white dark:bg-slate-800/80 border ${isDisabled ? 'border-rose-200 dark:border-rose-800' : 'border-slate-200 dark:border-slate-700 group-hover:border-blue-500/50 group-hover:scale-105 active:scale-95 group-hover:-translate-y-1'} rounded-2xl flex items-center justify-center text-4xl shadow-md transition-all`}>
                             {act.icon}
                           </div>
                           <div className="flex flex-col gap-1 w-full">
                             <span className={`text-base font-black uppercase tracking-tight transition-colors ${isDisabled ? 'text-rose-500/70 dark:text-rose-400/70' : 'text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-white'}`}>
                               {act.name}
                             </span>
                             <div className="flex justify-center gap-2 mb-1">
                                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${isActExhausted ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                  {actUsage}/{limitAct} Uses
                                </span>
                             </div>
                             <div className="flex flex-wrap gap-1.5 mt-0.5 justify-center">
                               {act.impacts.map((impact, idx) => (
                                 <span 
                                   key={idx} 
                                   className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded leading-none transition-colors ${isDisabled ? 'bg-rose-100/50 dark:bg-rose-900/20 text-rose-500/50' : impact.value > 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}
                                 >
                                   {impact.value > 0 ? '+' : ''}{impact.value} {({ DEF: 'TAC', PAS: 'TEC', DRB: 'TEC', SHT: 'TEC' } as Record<string, string>)[impact.label] || impact.label}
                                 </span>
                               ))}
                             </div>
                           </div>
                        </div>
                      )})}
                   </div>
                 </div>
               </div>

               {/* SQUAD GROWTH & ASSIGNMENT */}
               <div className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col transition-colors">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 flex justify-between items-center">
                      <h3 className="text-[12px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic">Squad Assignments</h3>
                      <div className="flex gap-2">
                          <button 
                            onClick={() => setSquadSortBy('growth')}
                            className={`text-[11px] px-2 py-1 font-black uppercase tracking-widest transition-colors ${squadSortBy === 'growth' ? 'text-blue-500' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            Growth
                          </button>
                          <span className="text-slate-200 dark:text-slate-800">|</span>
                          <button 
                            onClick={() => setSquadSortBy('fitness')}
                            className={`text-[11px] px-2 py-1 font-black uppercase tracking-widest transition-colors ${squadSortBy === 'fitness' ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            Fit
                          </button>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                      {squadPlayers.map((p, idx) => {
                          return (
                          <div key={p.id} className="flex flex-col px-3 py-4 rounded bg-white dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/50 hover:border-blue-500/30 transition-all group">
                              <div className="grid grid-cols-12 items-center gap-3">
                                  {/* COL 1: PLAYER INFO */}
                                  <div className="col-span-3 flex flex-col min-w-0">
                                      <span className="text-[15px] font-black text-slate-700 dark:text-slate-200 uppercase truncate leading-tight">{p.name}</span>
                                      <span className="text-[12px] text-slate-400 font-bold uppercase truncate">{p.position} • Age {p.age}</span>
                                  </div>

                                  {/* COL 2: TRAINING CATEGORIES */}
                                  <div className="col-span-2 flex justify-center gap-2.5">
                                      {[
                                          { label: 'TEC', val: (p.lastGrowth?.drb || 0) + (p.lastGrowth?.sht || 0) + (p.lastGrowth?.pas || 0) },
                                          { label: 'TAC', val: p.lastGrowth?.def || 0 }
                                      ].map(stat => (
                                          <div key={stat.label} className="flex flex-col items-center min-w-[28px]">
                                              <div className="text-[10px] font-black text-slate-400 uppercase mb-1 leading-none">{stat.label}</div>
                                              <AttributeGrowthArrow val={stat.val || 0} />
                                          </div>
                                      ))}
                                  </div>

                                  {/* COL 3: CANSAÇO */}
                                  <div className="col-span-2 flex flex-col items-center gap-1">
                                      <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] font-black text-slate-400 uppercase leading-none">CAN:</span>
                                          <span className={`text-[14px] font-black leading-none ${p.fitness < 70 ? 'text-rose-500' : (p.fitness < 90 ? 'text-amber-500' : 'text-emerald-500')}`}>
                                              {Math.round(100 - p.fitness)}%
                                          </span>
                                      </div>
                                      <FitnessBar fitness={p.fitness} className="w-full h-2 max-w-[80px]" />
                                  </div>

                                  {/* COL 4: WEEKLY GROWTH */}
                                  <div className="col-span-3 flex flex-col items-center">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">GROWTH</span>
                                      <div className={`text-[20px] font-black leading-none ${p.weeklyGrowth > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                                          {p.weeklyGrowth > 0 ? `+${p.weeklyGrowth}` : p.weeklyGrowth}
                                      </div>
                                  </div>

                                  {/* COL 5: GROUPS */}
                                  <div className="col-span-2 flex justify-end">
                                      <div className="flex gap-0.5 shadow-sm border border-slate-200 dark:border-slate-700/50 rounded overflow-hidden">
                                          {[0, 1, 2].map(grp => {
                                              const isLocked = grp >= (gameState.unlockedTrainingGroups || 1);
                                              const isSelected = (p.trainingGroupId || 0) === grp;
                                              return (
                                                  <button
                                                      key={grp}
                                                      disabled={isLocked}
                                                      onClick={() => updatePlayerTrainingGroup(p.id, grp)}
                                                      className={`px-3.5 py-3 text-[12px] font-black transition-colors ${isSelected ? 'bg-blue-500 text-white' : isLocked ? 'bg-slate-100 dark:bg-slate-900/50 text-slate-300 dark:text-slate-700 cursor-not-allowed' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                                  >
                                                      G{grp + 1}
                                                  </button>
                                              );
                                          })}
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )})}
                  </div>
               </div>

               {/* COACH INFO BAR */}
               <div className="shrink-0 bg-slate-200/50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 rounded-xl p-3 flex justify-between items-center shadow-lg transition-colors">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs shadow-inner overflow-hidden transition-colors">
                        <span className="opacity-40">👤</span>
                     </div>
                     <div>
                        <div className="text-[10px] font-black text-slate-700 dark:text-white uppercase italic tracking-tight transition-colors">{userTeam?.name} Manager</div>
                        <div className="text-[7px] text-blue-600 dark:text-blue-500 font-black uppercase tracking-widest mt-0.5 transition-colors">Tactical Knowledge: 8.4/10</div>
                     </div>
                  </div>
                  <div className="text-right">
                     <div className="text-emerald-600 dark:text-emerald-500 font-black italic text-sm tracking-tighter leading-none transition-colors">PREMIUM</div>
                     <div className="text-[6px] text-slate-400 dark:text-slate-600 uppercase font-black tracking-widest mt-0.5 transition-colors">Coaching Staff</div>
                  </div>
               </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingView;
