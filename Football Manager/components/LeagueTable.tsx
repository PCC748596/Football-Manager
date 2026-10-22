import React from 'react';
import { useGame } from '../context/GameContext';
import { Team, naLigaDoUtilizador } from '../types';
import { TeamShield } from './TeamShield';

const LeagueTable: React.FC = () => {
  const { teams, userTeam } = useGame();

  // Sort teams: Points DESC, GoalDiff DESC, GoalsFor DESC
  // So a liga do utilizador (os adversarios de copa tambem estao em `teams`).
  const sortedTeams = teams.filter(t => naLigaDoUtilizador(t, userTeam)).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    return b.goalsFor - a.goalsFor;
  });

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="mb-4">
        <h2 className="text-4xl font-black uppercase tracking-tighter leading-none italic transition-colors">
          <span className="text-slate-900 dark:text-white transition-colors">LEAGUE</span> <span className="text-blue-500">STANDINGS</span>
        </h2>
      </div>
      
      <div className="flex-1 bg-white/80 dark:bg-slate-900/40 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800/50 overflow-hidden flex flex-col transition-colors">
        <div className="overflow-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 shadow-xl">
              <tr className="bg-slate-100 dark:bg-slate-950/90 backdrop-blur-md transition-colors">
                <th className="px-6 py-2 text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">Pos</th>
                <th className="px-6 py-2 text-[9px] font-black text-slate-900 dark:text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">Team</th>
                <th className="px-6 py-2 text-[9px] font-black text-blue-600 dark:text-white uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 text-center bg-blue-600/5 dark:bg-blue-600/10 transition-colors">Pts</th>
                <th className="px-4 py-2 text-[9px] font-black text-slate-900 dark:text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 text-center">P</th>
                <th className="px-4 py-2 text-[9px] font-black text-slate-900 dark:text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 text-center">W</th>
                <th className="px-4 py-2 text-[9px] font-black text-slate-900 dark:text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 text-center">D</th>
                <th className="px-4 py-2 text-[9px] font-black text-slate-900 dark:text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 text-center">L</th>
                <th className="px-4 py-2 text-[9px] font-black text-slate-900 dark:text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 text-center">GF</th>
                <th className="px-4 py-2 text-[9px] font-black text-slate-900 dark:text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 text-center">GA</th>
                <th className="px-4 py-2 text-[9px] font-black text-slate-900 dark:text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 text-center">GD</th>
                <th className="px-4 py-2 text-[9px] font-black text-slate-900 dark:text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 text-center">Aprov%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30 transition-colors">
              {sortedTeams.map((team, index) => {
                const gd = team.goalsFor - team.goalsAgainst;
                const isUser = userTeam?.id === team.id;
                
                const isTop4 = index < 4; // 1, 2, 3, 4 (0-3)
                const isQualify = index >= 4 && index < 6; // 5, 6 (4-5)
                const isRelegation = index >= 16; // 17, 18, 19, 20 (16-19)

                let posColorClass = 'text-slate-300 dark:text-slate-200';
                if (isTop4) posColorClass = 'text-emerald-500';
                else if (isQualify) posColorClass = 'text-orange-500';
                else if (isRelegation) posColorClass = 'text-rose-500';
                else if (isUser) posColorClass = 'text-blue-600 dark:text-blue-400';

                return (
                  <tr key={team.id} className={`group transition-all duration-300 ${isUser ? 'bg-blue-600/5 dark:bg-blue-600/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                    <td className="px-6 py-[5.5px]">
                      <span className={`text-base font-black transition-colors ${posColorClass}`}>
                        {index + 1}
                      </span>
                    </td>

                    <td className="px-6 py-[5.5px]">
                      <div className="flex items-center gap-3">
                        <TeamShield team={team} className="w-8 h-10" />
                        <span className={`${isUser ? 'text-sm' : 'text-xs'} font-black uppercase tracking-tight ${isUser ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-white'} transition-colors`}>
                           {team.name}
                        </span>
                      </div>
                    </td>

                    <td className={`px-6  py-[5.5px] text-center font-black ${isUser ? 'text-base' : 'text-sm'} transition-colors bg-blue-600/5 dark:bg-blue-600/10 ${isUser ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>
                      {team.points}
                    </td>
                    <td className={`px-4  py-[5.5px] text-center ${isUser ? 'text-sm' : 'text-xs'} font-bold text-slate-900 dark:text-slate-200 transition-colors`}>{team.played}</td>
                    <td className={`px-4  py-[5.5px] text-center ${isUser ? 'text-sm' : 'text-xs'} font-bold text-slate-900 dark:text-slate-300 transition-colors`}>{team.won}</td>
                    <td className={`px-4  py-[5.5px] text-center ${isUser ? 'text-sm' : 'text-xs'} font-bold text-slate-900 dark:text-slate-300 transition-colors`}>{team.drawn}</td>
                    <td className={`px-4  py-[5.5px] text-center ${isUser ? 'text-sm' : 'text-xs'} font-bold text-slate-900 dark:text-slate-300 transition-colors`}>{team.lost}</td>
                    <td className={`px-4  py-[5.5px] text-center ${isUser ? 'text-sm' : 'text-xs'} font-bold text-slate-900 dark:text-slate-300 transition-colors`}>{team.goalsFor}</td>
                    <td className={`px-4  py-[5.5px] text-center ${isUser ? 'text-sm' : 'text-xs'} font-bold text-slate-900 dark:text-slate-300 transition-colors`}>{team.goalsAgainst}</td>
                    
                    <td className={`px-4  py-[5.5px] text-center ${isUser ? 'text-sm' : 'text-xs'} font-black transition-colors ${gd > 0 ? 'text-emerald-500' : gd < 0 ? 'text-rose-500' : 'text-slate-300 dark:text-slate-600'}`}>
                      {gd > 0 ? '+' : ''}{gd}
                    </td>

                    <td className={`px-4  py-[5.5px] text-center ${isUser ? 'text-sm' : 'text-xs'} font-black transition-colors text-slate-500 dark:text-slate-400`}>
                      {team.played > 0 ? Math.round((team.points / (team.played * 3)) * 100) : 0}%
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

export default LeagueTable;
