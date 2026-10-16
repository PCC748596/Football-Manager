import React, { useMemo } from 'react';
import { Fixture, Player, Team } from '../types';
import { calculateMatchRatings } from '../textSim/matchEngine';

interface MatchStatsModalProps {
  fixture: Fixture;
  homeTeam: Team;
  awayTeam: Team;
  players: Player[];
  matchMinute: number;
  onClose: () => void;
}

export const MatchStatsModal: React.FC<MatchStatsModalProps> = ({ fixture, homeTeam, awayTeam, players, matchMinute, onClose }) => {
  const events = fixture.events || [];
  
  // Possession
  const posTime = fixture.possessionTimeline || [];
  const hPos = posTime.length > 0 ? Math.round((posTime.filter(p => p === 'home').length / posTime.length) * 100) : 50;
  const aPos = 100 - hPos;

  // Shots
  const hShots = events.filter(e => e.teamId === fixture.homeTeamId && ['GOAL', 'MISS', 'MISS_PENALTY'].includes(e.type)).length + events.filter(e => e.teamId === fixture.awayTeamId && e.type === 'SAVE').length;
  const aShots = events.filter(e => e.teamId === fixture.awayTeamId && ['GOAL', 'MISS', 'MISS_PENALTY'].includes(e.type)).length + events.filter(e => e.teamId === fixture.homeTeamId && e.type === 'SAVE').length;

  // Fouls
  const hFouls = events.filter(e => e.teamId === fixture.homeTeamId && e.type === 'FOUL').length;
  const aFouls = events.filter(e => e.teamId === fixture.awayTeamId && e.type === 'FOUL').length;

  // Corners
  const hCorners = events.filter(e => e.teamId === fixture.homeTeamId && e.type === 'CORNER').length;
  const aCorners = events.filter(e => e.teamId === fixture.awayTeamId && e.type === 'CORNER').length;

  // Cards
  const hYellows = events.filter(e => e.teamId === fixture.homeTeamId && e.type === 'CARD' && e.description.includes('🟨')).length;
  const aYellows = events.filter(e => e.teamId === fixture.awayTeamId && e.type === 'CARD' && e.description.includes('🟨')).length;
  
  const hReds = events.filter(e => e.teamId === fixture.homeTeamId && e.type === 'CARD' && e.description.includes('🟥')).length;
  const aReds = events.filter(e => e.teamId === fixture.awayTeamId && e.type === 'CARD' && e.description.includes('🟥')).length;

  // Passes
  const timeFactor = (matchMinute > 0 ? matchMinute : 90) / 90;
  const hPasses = Math.floor((300 + hPos * 3) * timeFactor) + hShots * 2;
  const aPasses = Math.floor((300 + aPos * 3) * timeFactor) + aShots * 2;

  const playerRatings = useMemo(() => {
     if (fixture.playerRatings) return fixture.playerRatings;
     return calculateMatchRatings(events, homeTeam, awayTeam, fixture.homeScore || 0, fixture.awayScore || 0, fixture.homeLineup, fixture.awayLineup, players);
  }, [fixture.playerRatings, events, homeTeam, awayTeam, fixture.homeScore, fixture.awayScore]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-6xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl relative max-h-[95vh] flex flex-col">
        <button onClick={onClose} className="absolute top-6 right-6 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 font-black text-xs uppercase tracking-widest text-slate-500">
          Fechar
        </button>
        <h2 className="text-2xl font-black uppercase mb-6 text-center tracking-widest text-slate-800 dark:text-slate-200">Estatísticas da Partida</h2>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr_1fr] gap-8">
            
            {/* HOME TEAM */}
            <div className="flex flex-col gap-4">
              <h3 className="font-black text-2xl text-center uppercase tracking-wider mb-2" style={{ color: homeTeam?.colorPrimary }}>{homeTeam?.name}</h3>
              <div className="space-y-1.5">
                {Object.entries(playerRatings).map(([id, rating]) => {
                    const p = players.find(x => x.id === id);
                    if (!p || p.teamId !== fixture.homeTeamId) return null;
                    return (
                      <div key={id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border-l-4" style={{ borderColor: homeTeam?.colorPrimary }}>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{p.name.split(' ').pop()}</span>
                          <span className={`font-black text-sm ${(rating as number) >= 7.5 ? 'text-emerald-500' : (rating as number) <= 5 ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>{(rating as number).toFixed(1)}</span>
                      </div>
                    )
                })}
              </div>
            </div>

            {/* STATS */}
            <div className="flex flex-col gap-1 px-4 lg:px-8 lg:border-x border-slate-200 dark:border-slate-800 pt-4">
               {[
                 { label: 'Gols', h: fixture.homeScore || 0, a: fixture.awayScore || 0 },
                 { label: 'Posse de Bola', h: `${hPos}%`, a: `${aPos}%` },
                 { label: 'Chutes', h: hShots, a: aShots },
                 { label: 'Passes', h: hPasses, a: aPasses },
                 { label: 'Escanteios', h: hCorners, a: aCorners },
                 { label: 'Faltas', h: hFouls, a: aFouls },
                 { label: 'Cartões Amarelos (CA)', h: hYellows, a: aYellows },
                 { label: 'Cartões Vermelhos (CV)', h: hReds, a: aReds },
               ].map((stat, i) => (
                 <div key={i} className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                   <span className="w-1/3 text-right font-black text-xl text-slate-800 dark:text-slate-200">{stat.h}</span>
                   <span className="w-1/3 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</span>
                   <span className="w-1/3 text-left font-black text-xl text-slate-800 dark:text-slate-200">{stat.a}</span>
                 </div>
               ))}
            </div>

            {/* AWAY TEAM */}
            <div className="flex flex-col gap-4">
              <h3 className="font-black text-2xl text-center uppercase tracking-wider mb-2" style={{ color: awayTeam?.colorPrimary }}>{awayTeam?.name}</h3>
              <div className="space-y-1.5">
                {Object.entries(playerRatings).map(([id, rating]) => {
                    const p = players.find(x => x.id === id);
                    if (!p || p.teamId !== fixture.awayTeamId) return null;
                    return (
                      <div key={id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border-r-4" style={{ borderColor: awayTeam?.colorPrimary }}>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{p.name.split(' ').pop()}</span>
                          <span className={`font-black text-sm ${(rating as number) >= 7.5 ? 'text-emerald-500' : (rating as number) <= 5 ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>{(rating as number).toFixed(1)}</span>
                      </div>
                    )
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
