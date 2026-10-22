
import React, { useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { Fixture, Team, MatchEvent } from '../types';
import { TeamShield } from './TeamShield';
import { rotuloDaFase } from '../textSim/competitions';

// 1ST, 2ND, 3RD, 4TH ... 11TH, 12TH, 13TH ... 21ST
const ordinal = (n: number) => {
  const r100 = n % 100, r10 = n % 10;
  return n + (r100 >= 11 && r100 <= 13 ? 'TH' : r10 === 1 ? 'ST' : r10 === 2 ? 'ND' : r10 === 3 ? 'RD' : 'TH');
};

const FixturesView: React.FC = () => {
  const { fixtures, teams, gameState, players, comps } = useGame();

  // Os jogos de copa do utilizador (`fix-cup-<id do jogo da copa>`) -> o rotulo da fase (LIBERT-16, SULA-G ...).
  const rotulosDeCopa = useMemo(() => {
    const m = new Map<string, string>();
    (comps || []).forEach(c => c.matches.forEach(j => m.set('fix-cup-' + j.id, rotuloDaFase(c.id, j.stage))));
    return m;
  }, [comps]);
  const rotuloDoJogo = (f: Fixture) => f.isFriendly ? 'FRND' : (f.type === 'CUP' && rotulosDeCopa.get(f.id)) || `${ordinal(f.week)} RND`;

  const userFixtures = fixtures
    .filter(f => f.homeTeamId === gameState.userTeamId || f.awayTeamId === gameState.userTeamId)
    .sort((a, b) => a.date.localeCompare(b.date));

  const getTeamObj = (id: string) => teams.find(t => t.id === id);

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return `${days[d.getDay()]}, ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  const getPlayerName = (id?: string) => {
    if (!id) return '';
    const p = players.find(pl => pl.id === id);
    if (!p) return 'Unknown';
    const parts = p.name.split(' ');
    // Return last name mostly for space, or full name if short
    return parts.length > 1 ? parts[parts.length - 1] : p.name;
  };

  const getGoalEvents = (f: Fixture, teamId: string) => {
      return f.events
        .filter(e => e.type === 'GOAL' && e.teamId === teamId)
        .map(e => ({
            minute: e.minute,
            scorer: getPlayerName(e.playerId),
            assist: e.assistPlayerId ? getPlayerName(e.assistPlayerId) : null
        }));
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in overflow-hidden">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter leading-none italic transition-colors">
            <span className="text-slate-900 dark:text-white transition-colors">SEASON</span> <span className="text-blue-500">SCHEDULE</span>
          </h2>
          <p className="text-slate-400 dark:text-slate-500 font-bold text-[15px] uppercase tracking-widest mt-2 opacity-60 italic transition-colors">
            Fixture List for {getTeamObj(gameState.userTeamId || '')?.name}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
        <div className="bg-slate-200/50 dark:bg-slate-950/20 rounded-lg border border-slate-300 dark:border-slate-800/40 shadow-xl transition-colors">
          <table className="w-full text-left border-collapse bg-white dark:bg-transparent">
            <thead className="bg-slate-100/80 dark:bg-slate-900/40 sticky top-0 z-20 transition-colors">
              <tr className="text-[13px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] italic transition-colors">
                <th className="px-6 py-5">Type</th>
                <th className="px-6 py-5">Date</th>
                <th className="px-6 py-5 text-right">Home</th>
                <th className="px-6 py-5 text-center w-32">Result</th>
                <th className="px-6 py-5">Away</th>
                <th className="px-6 py-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/20 transition-colors">
              {userFixtures.map(fixture => {
                const home = getTeamObj(fixture.homeTeamId);
                const away = getTeamObj(fixture.awayTeamId);
                const isUserHome = home?.id === gameState.userTeamId;
                const isPast = fixture.date < gameState.currentDate;
                const isCurrent = fixture.date === gameState.currentDate;

                const homeGoals = getGoalEvents(fixture, fixture.homeTeamId);
                const awayGoals = getGoalEvents(fixture, fixture.awayTeamId);
                const hasGoals = homeGoals.length > 0 || awayGoals.length > 0;

                // Tooltip direction logic: Open DOWN for <= 30, UP for > 30
                const isOpeningDown = fixture.week <= 30;

                return (
                  <tr key={fixture.id} className={`group relative transition-all duration-300 ${isCurrent ? 'bg-blue-600/5 dark:bg-blue-600/[0.08] z-10' : 'hover:bg-blue-50/30 dark:hover:bg-white/[0.01] hover:z-30 z-0'}`}>
                    {/* TYPE BADGE */}
                    <td className="px-6 py-4">
                      <div className={`min-w-[8rem] px-3 h-8 flex items-center justify-center whitespace-nowrap rounded-[3px] text-[13px] font-black transition-all ${fixture.isFriendly ? 'bg-emerald-500 text-white' : (isCurrent ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-900/80 text-slate-400 dark:text-slate-600 border border-slate-300 dark:border-slate-800')}`}>
                        {rotuloDoJogo(fixture)}
                      </div>
                    </td>

                    {/* DATE */}
                    <td className="px-6 py-4 whitespace-nowrap">
                       <div className="text-[15px] font-black text-slate-400 dark:text-slate-500 uppercase italic tracking-tighter transition-colors">
                          {formatDateLabel(fixture.date)}
                       </div>
                    </td>
                    
                    {/* HOME TEAM */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span className={`text-lg font-black transition-colors uppercase italic tracking-tight ${isUserHome ? 'text-slate-800 dark:text-white transition-colors' : 'text-slate-400 dark:text-slate-500 opacity-80 group-hover:opacity-100'}`}>
                          {home?.name}
                        </span>
                        <TeamShield team={home} className="w-10 h-12" />
                      </div>
                    </td>

                    {/* RESULT / VS PILL */}
                    <td className="px-6 py-4 relative">
                      <div className="flex justify-center relative group/result">
                        {fixture.played ? (
                          <>
                            <div className={`px-4 py-1.5 rounded-[4px] font-mono font-black text-lg shadow-inner transition-colors cursor-help ${
                              (isUserHome && fixture.homeScore! > fixture.awayScore!) || (!isUserHome && fixture.awayScore! > fixture.homeScore!)
                                ? 'bg-emerald-5 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                                : (fixture.homeScore === fixture.awayScore ? 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700' : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30')
                            }`}>
                              {fixture.homeScore} - {fixture.awayScore}
                            </div>
                            
                            {/* Goals Tooltip */}
                            {hasGoals && (
                                <div className={`absolute left-1/2 -translate-x-1/2 hidden group-hover/result:flex flex-col items-center z-50 w-max max-w-[280px] pointer-events-none ${isOpeningDown ? 'top-full mt-2' : 'bottom-full mb-2'}`}>
                                    {/* Arrow for Down Opening */}
                                    {isOpeningDown && (
                                      <div className="w-2 h-2 bg-slate-900 rotate-45 -mb-1 border-l border-t border-slate-700 z-10"></div>
                                    )}

                                    <div className="bg-slate-900 text-slate-200 text-[15px] rounded p-3 shadow-2xl border border-slate-700 flex gap-4 relative z-20">
                                        {/* Home Team Scorers */}
                                        <div className="flex flex-col gap-1 text-right min-w-[60px]">
                                            <span className="font-black text-[13px] uppercase text-slate-500 border-b border-slate-700 pb-1 mb-0.5 truncate">{home?.name}</span>
                                            {homeGoals.length > 0 ? homeGoals.map((g, i) => (
                                                <div key={i} className="whitespace-nowrap">
                                                    <span className="font-bold text-white">{g.scorer}</span>
                                                    {g.assist && <span className="text-slate-500 text-[13px] italic"> (a. {g.assist})</span>}
                                                    <span className="text-blue-500 ml-1 text-[13px] font-mono">{g.minute}'</span>
                                                </div>
                                            )) : <span className="text-slate-600">-</span>}
                                        </div>
                                        
                                        <div className="w-[1px] bg-slate-800"></div>
                                        
                                        {/* Away Team Scorers */}
                                        <div className="flex flex-col gap-1 text-left min-w-[60px]">
                                            <span className="font-black text-[13px] uppercase text-slate-500 border-b border-slate-700 pb-1 mb-0.5 truncate">{away?.name}</span>
                                            {awayGoals.length > 0 ? awayGoals.map((g, i) => (
                                                <div key={i} className="whitespace-nowrap">
                                                    <span className="text-blue-500 mr-1 text-[13px] font-mono">{g.minute}'</span>
                                                    <span className="font-bold text-white">{g.scorer}</span>
                                                    {g.assist && <span className="text-slate-500 text-[13px] italic"> (a. {g.assist})</span>}
                                                </div>
                                            )) : <span className="text-slate-600">-</span>}
                                        </div>
                                    </div>
                                    
                                    {/* Arrow for Up Opening */}
                                    {!isOpeningDown && (
                                      <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1 border-r border-b border-slate-700 z-10"></div>
                                    )}
                                </div>
                            )}
                          </>
                        ) : (
                          <div className="text-[13px] font-black text-slate-300 dark:text-slate-700 bg-slate-100 dark:bg-slate-900/50 px-3.5 py-1.5 rounded-full uppercase tracking-widest border border-slate-200 dark:border-slate-800/50 italic transition-colors">
                            vs
                          </div>
                        )}
                      </div>
                    </td>

                    {/* AWAY TEAM */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-start gap-3">
                        <TeamShield team={away} className="w-10 h-12" />
                        <span className={`text-lg font-black transition-colors uppercase italic tracking-tight ${!isUserHome ? 'text-slate-800 dark:text-white transition-colors' : 'text-slate-400 dark:text-slate-500 opacity-80 group-hover:opacity-100'}`}>
                          {away?.name}
                        </span>
                      </div>
                    </td>

                    {/* STATUS COLUMN */}
                    <td className="px-6 py-4 text-right">
                      {isCurrent ? (
                        <span className="text-[13px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-[0.2em] flex items-center justify-end gap-1.5 italic transition-colors">
                          <span className="w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-500 animate-pulse"></span>
                          NEXT MATCH
                        </span>
                      ) : isPast ? (
                        <span className="text-[13px] font-black text-slate-300 dark:text-slate-800 uppercase tracking-widest italic opacity-40 transition-colors">PLAYED</span>
                      ) : (
                        <span className="text-[13px] font-black text-slate-300 dark:text-slate-800 uppercase tracking-widest italic opacity-40 transition-colors">UPCOMING</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FixturesView;
