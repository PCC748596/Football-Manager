import React, { useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { calculateFixturesStats } from '../textSim/simulationValidator';

const StatisticsView: React.FC = () => {
  const { gameState, fixtures, t } = useGame();
  const pt = gameState.language === 'PT';

  const statsReport = useMemo(() => {
    const playedLeagueFixtures = fixtures.filter(f => f.played && f.type === 'LEAGUE');
    if (playedLeagueFixtures.length === 0) return null;
    
    const { report } = calculateFixturesStats(playedLeagueFixtures);
    return report;
  }, [fixtures]);

  if (!statsReport) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 opacity-50">📊</div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-200 uppercase tracking-tighter">{pt ? 'Nenhum dado disponível' : 'No data available'}</h2>
          <p className="text-slate-500 mt-2">{pt ? 'Avance no calendário para gerar estatísticas da liga.' : 'Advance the calendar to generate league statistics.'}</p>
        </div>
      </div>
    );
  }

  const StatBox = ({ title, value, subtitle }: { title: string, value: React.ReactNode, subtitle?: string }) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded border border-slate-200 dark:border-slate-700 flex flex-col justify-center items-center text-center shadow-sm">
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</div>
      <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{value}</div>
      {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
    </div>
  );

  return (
    <div className="w-full space-y-6">
      <div className="flex items-end justify-between border-b-2 border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">{pt ? 'Estatísticas da Liga' : 'League Statistics'}</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">
            {pt ? `Análise de ${statsReport.matches} jogos realizados` : `Analysis of ${statsReport.matches} games played`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox title={pt ? 'Gols por Jogo' : 'Goals per Game'} value={statsReport.goals.avgPerGame} subtitle={`Total: ${statsReport.goals.total}`} />
        <StatBox title={pt ? 'Faltas / Jogo' : 'Fouls / Game'} value={statsReport.events.foulsAvg} />
        <StatBox title={pt ? 'Cartões / Jogo' : 'Cards / Game'} value={<span className="text-lg"><span className="text-yellow-500">{statsReport.events.yellowCardsAvg}</span> / <span className="text-red-500">{statsReport.events.redCardsAvg}</span></span>} />
        <StatBox title={pt ? 'Vitórias Casa' : 'Home Wins'} value={statsReport.results.homeWinPct} subtitle={`${pt ? 'Fora' : 'Away'}: ${statsReport.results.awayWinPct} | ${pt ? 'Empate' : 'Draw'}: ${statsReport.results.drawPct}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">{pt ? 'Distribuição de Gols' : 'Goal Distribution'}</h3>
          <div className="space-y-3">
            {Object.entries(statsReport.goalDistribution).map(([goals, pct]) => (
              <div key={goals} className="flex items-center text-sm">
                <span className="w-16 font-bold text-slate-500">{goals} gols:</span>
                <div className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-full h-3 overflow-hidden ml-2">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: pct }}></div>
                </div>
                <span className="w-16 text-right font-black text-slate-700 dark:text-slate-300">{pct}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
            <div>&lt; 3 gols: {statsReport.lessThan3Goals}</div>
            <div>= 3 gols: {statsReport.exactly3Goals}</div>
            <div>&gt; 3 gols: {statsReport.moreThan3Goals}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">{pt ? 'Momentum (Fazer 1º Gol)' : 'Momentum (Scoring First)'}</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">{pt ? 'Chance de Vitória' : 'Win Chance'}</span>
              <span className="text-xl font-black text-emerald-600">{statsReport.momentum.winRateWhenScoringFirst}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">{pt ? 'Chance de Empate' : 'Draw Chance'}</span>
              <span className="text-xl font-black text-slate-600">{statsReport.momentum.drawRateWhenScoringFirst}</span>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
               <span className="text-xs text-slate-400 italic">{pt ? 'Resultado mais comum' : 'Most common result'}: <strong className="text-slate-600 dark:text-slate-300">{statsReport.mostCommonResult}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">{pt ? 'Detalhes FM2D (Médias Casa / Fora)' : 'FM2D Details (Home / Away Averages)'}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8 text-sm">
          <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1">
            <span className="font-bold text-slate-500">{pt ? 'Posse de bola' : 'Possession'}</span>
            <span className="font-black">{statsReport.fm2d.possession.homeAvg} / {statsReport.fm2d.possession.awayAvg}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1">
            <span className="font-bold text-slate-500">{pt ? 'Finalizações' : 'Shots'}</span>
            <span className="font-black">{statsReport.fm2d.shots.homeAvg} / {statsReport.fm2d.shots.awayAvg}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1">
            <span className="font-bold text-slate-500">{pt ? 'Fin. no Alvo' : 'Shots on Target'}</span>
            <span className="font-black">{statsReport.fm2d.shotsOnTarget.homeAvg} / {statsReport.fm2d.shotsOnTarget.awayAvg}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1">
            <span className="font-bold text-slate-500">xG</span>
            <span className="font-black">{statsReport.fm2d.xg.homeAvg} / {statsReport.fm2d.xg.awayAvg}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1">
            <span className="font-bold text-slate-500">{pt ? 'Ataques Perigosos' : 'Dangerous Attacks'}</span>
            <span className="font-black">{statsReport.fm2d.dangerousAttacks.homeAvg} / {statsReport.fm2d.dangerousAttacks.awayAvg}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1">
            <span className="font-bold text-slate-500">{pt ? 'Entradas na Área' : 'Box Entries'}</span>
            <span className="font-black">{statsReport.fm2d.boxEntries.homeAvg} / {statsReport.fm2d.boxEntries.awayAvg}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1">
            <span className="font-bold text-slate-500">{pt ? 'Passes Certos' : 'Completed Passes'}</span>
            <span className="font-black">{statsReport.fm2d.passAccuracy.homeAvg} / {statsReport.fm2d.passAccuracy.awayAvg}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1">
            <span className="font-bold text-slate-500">{pt ? 'Recuperações' : 'Recoveries'}</span>
            <span className="font-black">{statsReport.fm2d.recoveries.homeAvg} / {statsReport.fm2d.recoveries.awayAvg}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-1">
            <span className="font-bold text-slate-500">{pt ? 'Fadiga Média' : 'Average Fatigue'}</span>
            <span className="font-black">{statsReport.fm2d.fatigue.homeAvg} / {statsReport.fm2d.fatigue.awayAvg}</span>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-8">
           <div>
             <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Heatmap Casa (Def/Mid/Att)</div>
             <div className="flex h-4 rounded overflow-hidden">
                <div className="bg-blue-400 flex items-center justify-center text-[10px] font-bold text-white" style={{width: statsReport.fm2d.heatmap.home.defense}}>{statsReport.fm2d.heatmap.home.defense}</div>
                <div className="bg-emerald-400 flex items-center justify-center text-[10px] font-bold text-white" style={{width: statsReport.fm2d.heatmap.home.midfield}}>{statsReport.fm2d.heatmap.home.midfield}</div>
                <div className="bg-rose-400 flex items-center justify-center text-[10px] font-bold text-white" style={{width: statsReport.fm2d.heatmap.home.attack}}>{statsReport.fm2d.heatmap.home.attack}</div>
             </div>
           </div>
           <div>
             <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Heatmap Fora (Def/Mid/Att)</div>
             <div className="flex h-4 rounded overflow-hidden">
                <div className="bg-blue-400 flex items-center justify-center text-[10px] font-bold text-white" style={{width: statsReport.fm2d.heatmap.away.defense}}>{statsReport.fm2d.heatmap.away.defense}</div>
                <div className="bg-emerald-400 flex items-center justify-center text-[10px] font-bold text-white" style={{width: statsReport.fm2d.heatmap.away.midfield}}>{statsReport.fm2d.heatmap.away.midfield}</div>
                <div className="bg-rose-400 flex items-center justify-center text-[10px] font-bold text-white" style={{width: statsReport.fm2d.heatmap.away.attack}}>{statsReport.fm2d.heatmap.away.attack}</div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsView;
