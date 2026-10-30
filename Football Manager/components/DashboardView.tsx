import React, { useMemo, useState, useEffect, useRef } from 'react';
import NextGameButton from './NextGameButton';
import { useGame } from '../context/GameContext';
import { Position, ActivityType, Team, Player, Tactics, getKitDetails, getGKKitDetails, kitShorts, naLigaDoUtilizador } from '../types';
import ActivityModal from './ActivityModal';
import { TeamShield } from './TeamShield';
import { PlayerFace } from './PlayerFace';
import { ShirtIcon } from './ShirtIcon';
import FitnessBar from './FitnessBar';
import { settleMatch, ECONOMIA_ESTADIO, competicaoDoJogo, type CurrencyCode } from '../textSim/stadiumEconomy';

interface Props {
  onGoToRoundSimulation?: () => void;
  onGoToMatchDay?: () => void;
}

// --- Constants & Helpers for Tactics Display ---

const FORMATIONS: Record<string, { id: number, x: number, y: number, label: string }[]> = {
  '4-4-2': [
    { id: 0, x: 50, y: 88, label: 'GK' },
    { id: 1, x: 15, y: 72, label: 'LB' }, { id: 2, x: 38, y: 75, label: 'CB' }, { id: 3, x: 62, y: 75, label: 'CB' }, { id: 4, x: 85, y: 72, label: 'RB' },
    { id: 5, x: 15, y: 45, label: 'LM' }, { id: 6, x: 38, y: 50, label: 'CM' }, { id: 7, x: 62, y: 50, label: 'CM' }, { id: 8, x: 85, y: 45, label: 'RM' },
    { id: 9, x: 35, y: 18, label: 'ST' }, { id: 10, x: 65, y: 18, label: 'ST' },
  ],
  '4-3-3': [
    { id: 0, x: 50, y: 88, label: 'GK' },
    { id: 1, x: 15, y: 72, label: 'LB' }, { id: 2, x: 38, y: 75, label: 'CB' }, { id: 3, x: 62, y: 75, label: 'CB' }, { id: 4, x: 85, y: 72, label: 'RB' },
    { id: 5, x: 50, y: 58, label: 'DM' }, { id: 6, x: 32, y: 48, label: 'CM' }, { id: 7, x: 68, y: 48, label: 'CM' },
    { id: 8, x: 20, y: 22, label: 'LW' }, { id: 9, x: 50, y: 15, label: 'ST' }, { id: 10, x: 80, y: 22, label: 'RW' },
  ],
  '4-3-3 ATA': [
    { id: 0, x: 50, y: 88, label: 'GK' },
    { id: 1, x: 15, y: 72, label: 'LB' }, { id: 2, x: 38, y: 75, label: 'CB' }, { id: 3, x: 62, y: 75, label: 'CB' }, { id: 4, x: 85, y: 72, label: 'RB' },
    { id: 5, x: 35, y: 55, label: 'CM' }, { id: 6, x: 65, y: 55, label: 'CM' }, { id: 7, x: 50, y: 38, label: 'AM' },
    { id: 8, x: 20, y: 22, label: 'LW' }, { id: 9, x: 50, y: 15, label: 'ST' }, { id: 10, x: 80, y: 22, label: 'RW' },
  ],
  '3-5-2': [
    { id: 0, x: 50, y: 88, label: 'GK' },
    { id: 1, x: 25, y: 75, label: 'CB' }, { id: 2, x: 50, y: 78, label: 'CB' }, { id: 3, x: 75, y: 75, label: 'CB' },
    { id: 4, x: 10, y: 45, label: 'LM' }, { id: 5, x: 30, y: 52, label: 'DM' }, { id: 6, x: 50, y: 55, label: 'CM' }, { id: 7, x: 70, y: 52, label: 'DM' }, { id: 8, x: 90, y: 45, label: 'RM' },
    { id: 9, x: 40, y: 18, label: 'SS' }, { id: 10, x: 60, y: 18, label: 'ST' },
  ],
  '5-4-1': [
    { id: 0, x: 50, y: 88, label: 'GK' },
    { id: 1, x: 15, y: 72, label: 'LB' }, { id: 2, x: 32, y: 75, label: 'CB' }, { id: 3, x: 50, y: 78, label: 'CB' }, { id: 4, x: 68, y: 75, label: 'CB' }, { id: 5, x: 85, y: 72, label: 'RB' },
    { id: 6, x: 20, y: 48, label: 'LM' }, { id: 7, x: 40, y: 52, label: 'CM' }, { id: 8, x: 60, y: 52, label: 'CM' }, { id: 9, x: 80, y: 48, label: 'RM' },
    { id: 10, x: 50, y: 18, label: 'ST' },
  ],
  '4-2-3-1': [
    { id: 0, x: 50, y: 88, label: 'GK' },
    { id: 1, x: 15, y: 72, label: 'LB' }, { id: 2, x: 38, y: 75, label: 'CB' }, { id: 3, x: 62, y: 75, label: 'CB' }, { id: 4, x: 85, y: 72, label: 'RB' },
    { id: 5, x: 35, y: 60, label: 'DM' }, { id: 6, x: 65, y: 60, label: 'DM' },
    { id: 7, x: 20, y: 35, label: 'LW' }, { id: 8, x: 50, y: 38, label: 'AM' }, { id: 9, x: 80, y: 35, label: 'RW' },
    { id: 10, x: 50, y: 15, label: 'ST' },
  ],
  '5-3-2': [
    { id: 0, x: 50, y: 88, label: 'GK' },
    { id: 1, x: 15, y: 72, label: 'LB' }, { id: 2, x: 32, y: 75, label: 'CB' }, { id: 3, x: 50, y: 78, label: 'CB' }, { id: 4, x: 68, y: 75, label: 'CB' }, { id: 5, x: 85, y: 72, label: 'RB' },
    { id: 6, x: 30, y: 52, label: 'CM' }, { id: 7, x: 50, y: 55, label: 'DM' }, { id: 8, x: 70, y: 52, label: 'CM' },
    { id: 9, x: 40, y: 18, label: 'SS' }, { id: 10, x: 60, y: 18, label: 'ST' },
  ],
};


const getPosColor = (posLabel: string) => {
  if (['GK'].includes(posLabel)) return '#ea580c';
  if (['LB', 'CB', 'RB'].includes(posLabel)) return '#eab308';
  if (['DM', 'LM', 'CM', 'RM', 'AM'].includes(posLabel)) return '#16a34a';
  return '#2563eb';
};

const getWeatherForMatch = (dateStr: string, matchId: string, country: string) => {
  // Deterministic random based on match ID string sum
  const seed = matchId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const pseudoRandom = (offset: number) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };

  const month = new Date(dateStr + 'T12:00:00').getMonth(); // 0-11
  
  // Brazil (South Hemisphere) seasons
  // Summer: Dec, Jan, Feb (11, 0, 1)
  // Autumn: Mar, Apr, May (2, 3, 4)
  // Winter: Jun, Jul, Aug (5, 6, 7)
  // Spring: Sep, Oct, Nov (8, 9, 10)
  
  const isSouth = country === 'brazil' || country === '45';   // 45 = o id do Brasil na base atual
  let season = 'summer';
  
  if (isSouth) {
    if (month >= 2 && month <= 4) season = 'autumn';
    else if (month >= 5 && month <= 7) season = 'winter';
    else if (month >= 8 && month <= 10) season = 'spring';
  } else {
    // North Hemisphere (England)
    if (month >= 2 && month <= 4) season = 'spring';
    else if (month >= 5 && month <= 7) season = 'summer';
    else if (month >= 8 && month <= 10) season = 'autumn';
    else season = 'winter';
  }

  // Icons: ☁️ ⛅ ⛈️ 🌤️ 🌥️ 🌦️ 🌧️ 🌨️ 🌩️ ☀️ 🍃
  let icon = '☀️';
  let temp = 25;

  const rand = pseudoRandom(1);

  if (season === 'summer') {
    // Hot, Sun, Storms
    temp = Math.floor(25 + pseudoRandom(2) * 12); // 25-37
    if (rand < 0.5) icon = '☀️';
    else if (rand < 0.8) icon = '🌤️';
    else icon = '⛈️';
  } else if (season === 'autumn') {
    // Mild, Windy, Clouds
    temp = Math.floor(18 + pseudoRandom(2) * 10); // 18-28
    if (rand < 0.4) icon = '⛅';
    else if (rand < 0.7) icon = '🍃';
    else icon = '🌥️';
  } else if (season === 'winter') {
    // Cold, Rain, Overcast
    temp = Math.floor(10 + pseudoRandom(2) * 12); // 10-22 (Brazil logic mostly)
    if (!isSouth) temp -= 10; // Colder in England
    
    if (rand < 0.4) icon = '☁️';
    else if (rand < 0.7) icon = '🌧️';
    else if (rand < 0.9) icon = '🌦️';
    else icon = '🌨️'; // Rare snow
  } else { // Spring
    // Warm, Pleasant
    temp = Math.floor(20 + pseudoRandom(2) * 8); // 20-28
    if (rand < 0.5) icon = '🌤️';
    else if (rand < 0.8) icon = '🍃';
    else icon = '☀️';
  }

  const desc: Record<string, string> = { '☀️': 'Sunny', '🌤️': 'Mostly sunny', '⛈️': 'Storms', '⛅': 'Partly cloudy', '🍃': 'Windy', '🌥️': 'Cloudy', '☁️': 'Overcast', '🌧️': 'Rain', '🌦️': 'Showers', '🌨️': 'Snow' };
  return { icon, temp, desc: desc[icon] || '' };
};

const OpponentTacticsModal: React.FC<{ team: Team, players: Player[], onClose: () => void }> = ({ team, players: teamPlayers, onClose }) => {
  const { userTeam } = useGame();
  const formation = FORMATIONS[team.tactics.formation] || FORMATIONS['4-4-2'];
  const lineupPlayers = team.lineup.map(id => teamPlayers.find(p => p.id === id)).filter(Boolean) as Player[];

  // O nome + stamina de cada jogador vai ABAIXO da camisa, ou ACIMA quando abaixo ia tapar a camisa de outro (ou ser confundido com ela).
  // A conta e em pixeis, com o tamanho real do campo.
  const campoRef = useRef<HTMLDivElement>(null);
  const [campo, setCampo] = useState({ w: 420, h: 560 });
  useEffect(() => {
    const medir = () => { const r = campoRef.current; if (r) setCampo({ w: r.clientWidth, h: r.clientHeight }); };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);
  const nomePos = useMemo(() => {
    // Medidas reais (px) do icone da camisa (64 px; a camisa vai de cy-22 a cy+27, a etiqueta de nota/posicao ate cy+38, 54 de largura) e da
    // caixa do nome (max 80 de largura, 24 de altura): abaixo = cy+42..cy+66, acima = cy-60..cy-36.
    const SHIRT_W = 27, NOME_W = 40, NOME_H = 24;
    const centro = formation.map(p => ({ x: p.x / 100 * campo.w, y: p.y / 100 * campo.h }));
    const batidas = (i: number, acima: boolean) => {
      const a = centro[i];
      const y0 = acima ? a.y - 60 : a.y + 42;
      const y1 = y0 + NOME_H;
      let n = 0, desloca = 0;
      centro.forEach((b, j) => {
        if (j === i) return;
        const dx = a.x - b.x;
        if (Math.abs(dx) < SHIRT_W + NOME_W && y0 < b.y + 38 && y1 > b.y - 22) {
          n++;
          // Quanto e preciso empurrar o nome para o lado, para longe dessa camisa.
          const falta = (SHIRT_W + NOME_W) - Math.abs(dx);
          if (Math.abs(falta) > Math.abs(desloca)) desloca = (dx >= 0 ? 1 : -1) * falta;
        }
      });
      // Nao pode sair do campo (uns 6 px de folga: o guarda-redes fica colado ao fundo).
      if (y0 < -6 || y1 > campo.h + 6) n += 5;
      return { n, desloca };
    };
    // Abaixo ou acima, o que tiver menos camisas no caminho; o que sobrar empurra-se de lado (no maximo 28 px).
    return formation.map((_, i) => {
      const baixo = batidas(i, false), cima = batidas(i, true);
      const acima = baixo.n > 0 && cima.n < baixo.n;
      const m = acima ? cima : baixo;
      return { acima, dx: m.n > 0 && m.n < 5 ? Math.max(-28, Math.min(28, m.desloca)) : 0 };
    });
  }, [formation, campo]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-lg bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
           <div className="flex items-center gap-3">
              <TeamShield team={team} className="w-7 h-9" />
              <div>
                 <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">{team.name}</h3>
                 <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">Tactics: {team.tactics.formation}</p>
              </div>
           </div>
           <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-red-500 hover:text-white transition-colors">×</button>
        </div>
        
        <div ref={campoRef} className="aspect-[3/4] relative bg-slate-50 dark:bg-slate-900/50 m-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700/50 overflow-hidden select-none">
            {/* Pitch Lines */}
            <div className="absolute inset-4 border border-slate-300 dark:border-slate-700/50 rounded opacity-60 pointer-events-none">
                <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-300 dark:bg-slate-700/50"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border border-slate-300 dark:border-slate-700/50 rounded-full"></div>
                <div className="absolute top-0 left-1/4 right-1/4 h-12 border-x border-b border-slate-300 dark:border-slate-700/50"></div>
                <div className="absolute bottom-0 left-1/4 right-1/4 h-12 border-x border-t border-slate-300 dark:border-slate-700/50"></div>
            </div>

            {formation.map((pos, idx) => {
              const player = lineupPlayers[idx];
              const isGK = pos.label === 'GK';
              let color = team.primaryColor;
              const details = isGK 
                ? getGKKitDetails(team, 0, 0, userTeam)
                : getKitDetails(team, 0);

              return (
                <div 
                  key={idx}
                  className="absolute flex flex-col items-center justify-center w-20 h-20"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
                >

                  {/* Shirt */}
                  <div className="relative flex flex-col items-center z-20">
                      <ShirtIcon 
                        color={details.c1} 
                        color2={details.c2}
                        color3={details.c3}
                        diagonal={details.diagonal}
                        diagonalWidth={details.diagonalWidth}
                        horizontal={details.horizontal}
                        multipleDiagonals={details.multipleDiagonals}
                        dualDiagonal={details.dualDiagonal}
                        centerVerticalStripes={(details as any).centerVerticalStripes}
                        number={player?.shirtNumber || '?'} 
                        numberColor={details.nc}
                        collarColor={details.clc}
                        numberOutlineColor={details.noc}
                        sleeveColor={details.sc}
                        scale={1.0} 
                        longSleeves={isGK}
                      />
                      
                      {/* Rating + Position Tag */}
                      {player && (
                          <div className="absolute -bottom-1.5 flex items-center bg-white dark:bg-slate-800 px-1 py-0.5 rounded shadow-sm gap-2 border border-slate-100 dark:border-slate-700">
                              <span className="text-[9px] font-black text-slate-700 dark:text-slate-300 leading-none">{player.skill}</span>
                              <span className="text-[10px] font-black text-blue-500/80 uppercase leading-none border-l border-slate-200 dark:border-slate-700 pl-1.5">{pos.label}</span>
                          </div>
                      )}

                      {/* Nome + stamina: abaixo da camisa, ou ACIMA quando abaixo tapava outra camisa (nomeEmCima) */}
                      {player && (
                         <div style={{ marginLeft: `${nomePos[idx].dx}px` }} className={`absolute left-1/2 -translate-x-1/2 z-30 ${nomePos[idx].acima ? 'bottom-full mb-1' : 'top-full mt-2.5'} bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-[2px] shadow-sm max-w-[80px] flex flex-col items-center gap-1`}>
                            <FitnessBar fitness={player.fitness} className="w-10 h-1" />
                            <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase truncate block text-center leading-tight">
                               {player.name.split(' ').pop()}
                            </span>
                         </div>
                      )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

const ClubDetailsCard: React.FC<{ team: Team, t: any, title: string, isOpponent?: boolean, userTeam?: Team }> = ({ team, t, title, isOpponent, userTeam }) => {
    return (
        <>
            <h3 className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-3">{title}</h3>
            
            <div className="flex justify-center gap-1 mb-[3px]">
               {[0, 1, 2].map(idx => {
                  const d = getKitDetails(team, idx as any);
                  return <ShirtIcon key={idx} color={d.c1} color2={d.c2} color3={d.c3} diagonal={d.diagonal} horizontal={d.horizontal} multipleDiagonals={d.multipleDiagonals} dualDiagonal={(d as any).dualDiagonal} centerVerticalStripes={(d as any).centerVerticalStripes} gradient={d.gradient} spfcStripes={(d as any).spfcStripes} criciumaStripes={(d as any).criciumaStripes} diagonalWidth={d.diagonalWidth} collarColor={d.clc} number="9" numberColor={d.nc} numberOutlineColor={d.noc} sleeveColor={d.sc} shortColor={kitShorts(d).cor} shortTrimColor={kitShorts(d).aba} scale={1.2} className="w-20" />;
               })}
               {(() => {
                    const d = getGKKitDetails(team, (team.selectedKitIdx || 0) as 0 | 1 | 2, 0, userTeam);
                    return <ShirtIcon color={d.c1} color2={d.c2} color3={d.c3} diagonal={d.diagonal} horizontal={d.horizontal} multipleDiagonals={d.multipleDiagonals} dualDiagonal={(d as any).dualDiagonal} centerVerticalStripes={(d as any).centerVerticalStripes} gradient={d.gradient} spfcStripes={(d as any).spfcStripes} criciumaStripes={(d as any).criciumaStripes} diagonalWidth={d.diagonalWidth} collarColor={d.clc} number="1" numberColor={d.nc} numberOutlineColor={d.noc} sleeveColor={d.sc} shortColor={kitShorts(d, false).cor} shortTrimColor={kitShorts(d, false).aba} scale={1.2} longSleeves={true} className="w-20" />;
               })()}
            </div>

            <div className="grid grid-cols-2 gap-y-3 gap-x-2 mt-2">
               <div>
                  <div className="text-[9px] text-slate-400 uppercase font-black opacity-70">Founded</div>
                  <div className="text-[14px] text-slate-800 dark:text-white font-black">{team.foundedYear}</div>
               </div>
               <div>
                  <div className="text-[9px] text-slate-400 uppercase font-black opacity-70">Avg OVR</div>
                  <div className="text-[14px] text-slate-800 dark:text-white font-black italic">{team.strength}</div>
               </div>
               <div className="col-span-2">
                  <div className="text-[9px] text-slate-400 uppercase font-black opacity-70">Stadium</div>
                  <div className="text-[12px] font-black text-slate-600 dark:text-slate-300 uppercase truncate">
                    {team.stadium}
                  </div>
               </div>
               {!isOpponent && (   // a capacidade so aparece no My Club (no Opponent saiu, pedido)
               <div className="col-span-2">
                  <div className="text-[9px] text-slate-400 uppercase font-black opacity-70">Capacity</div>
                  <div className="text-[14px] text-slate-800 dark:text-white font-black tabular-nums">{(team.stadiumCapacity || 0).toLocaleString()}</div>
               </div>
               )}
            </div>
            
        </>
    );
};

// --- Main Dashboard Component ---

const DashboardView: React.FC<Props> = ({ onGoToRoundSimulation, onGoToMatchDay }) => {
  const { userTeam, players, teams, fixtures, gameState, advanceDay, scheduleActivity, formatCurrency, t } = useGame();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewOpponent, setViewOpponent] = useState<Team | null>(null);
  
  // Expose setViewOpponent for the helper card
  useEffect(() => {
     (window as any)._setViewOpponent = setViewOpponent;
     return () => { delete (window as any)._setViewOpponent; };
  }, []);

  if (!userTeam) return null;

  const matchToday = useMemo(() => {
    return fixtures.find(f => f.date === gameState.currentDate && (f.homeTeamId === userTeam.id || f.awayTeamId === userTeam.id));
  }, [fixtures, gameState.currentDate, userTeam.id]);

  const nextMatch = useMemo(() => {
    const relevant = fixtures.filter(f => 
      !f.played && 
      f.date >= gameState.currentDate && 
      (f.homeTeamId === userTeam.id || f.awayTeamId === userTeam.id)
    );
    return relevant.sort((a, b) => a.date.localeCompare(b.date))[0];
  }, [fixtures, gameState.currentDate, userTeam.id]);
  
  // O PUBLICO ESTIMADO do proximo jogo: o mesmo calculo da renda (ocupacao do mandante + bonus do jogo, x o multiplicador da competicao). Ver textSim/stadiumEconomy.ts.
  const publicoEstimado = useMemo(() => {
    if (!nextMatch) return null;
    const h = teams.find(t => t.id === nextMatch.homeTeamId), a = teams.find(t => t.id === nextMatch.awayTeamId);
    if (!h || !a) return null;
    const jornadas = fixtures.filter(f => !f.isFriendly).reduce((m, f) => Math.max(m, f.week || 0), 0);
    const decisivo = !!nextMatch.isDecisive || (!nextMatch.isFriendly && jornadas > 0 && (nextMatch.week || 0) > jornadas - ECONOMIA_ESTADIO.ultimasJornadasDecisivas);
    const s = settleMatch(h, a, nextMatch, gameState.currency as CurrencyCode, decisivo);
    const cap = h.stadiumCapacity || 20000;
    return { publico: s.attendance, cap, pct: Math.round(100 * s.attendance / cap), comp: competicaoDoJogo(nextMatch as any) };
  }, [nextMatch, teams, fixtures, gameState.currency]);

  // Logic to determine display teams (Home vs Away)
  let displayHomeTeam = userTeam;
  let displayAwayTeam = teams.find(t => t.id === (nextMatch ? (nextMatch.homeTeamId === userTeam.id ? nextMatch.awayTeamId : nextMatch.homeTeamId) : ''));
  
  if (nextMatch) {
      const homeT = teams.find(t => t.id === nextMatch.homeTeamId);
      const awayT = teams.find(t => t.id === nextMatch.awayTeamId);
      if (homeT && awayT) {
          displayHomeTeam = homeT;
          displayAwayTeam = awayT;
      }
  }

  // Weather Logic Calculation
  const weather = useMemo(() => {
    if (!nextMatch) return null;
    const homeTeam = teams.find(t => t.id === nextMatch.homeTeamId);
    if (!homeTeam) return null;
    return getWeatherForMatch(nextMatch.date, nextMatch.id, homeTeam.country);
  }, [nextMatch, teams]);

  // Sort: Points DESC, but if all 0 played, then alphabetical
  const sortedTeams = teams.filter(t => naLigaDoUtilizador(t, userTeam)).sort((a, b) => {
    if (a.played === 0 && b.played === 0) {
        return a.name.localeCompare(b.name);
    }
    return b.points - a.points;
  });
  
  const userPos = sortedTeams.findIndex(t => t.id === userTeam.id) + 1;
  const top20 = sortedTeams.slice(0, 20);

  // Formula: OVR only as requested
  const top5Players = useMemo(() => {
    return players
      .filter(p => p.teamId === userTeam.id)
      .sort((a, b) => b.skill - a.skill)
      .slice(0, 5);
  }, [players, userTeam.id]);

  // Calculations for Financial Summary Cards
  const teamPlayers = players.filter(p => p.teamId === userTeam.id);
  const totalSalaries = teamPlayers.reduce((sum, p) => sum + p.salary, 0);
  const eco = settleMatch(userTeam, userTeam, { id: '', week: 0, date: '', homeTeamId: userTeam.id, awayTeamId: '', homeScore: 0, awayScore: 0 } as any, gameState.currency as CurrencyCode);
  const estMatchRevenue = Math.round(eco.revenueUSD);

  const calendarInfo = useMemo(() => {
    const days = [];
    const curr = new Date(gameState.currentDate + 'T12:00:00');
    const day = curr.getDay();
    // A barra mostra 9 dias, a começar no dia de hoje.
    const monday = new Date(curr);

    const locale = gameState.language === 'PT' ? 'pt-BR' : 'en-US';
    const monthYearLabel = monday.toLocaleDateString(locale, { month: 'long', year: 'numeric' }).toUpperCase();

    // Map days short names
    // @ts-ignore
    const dayNames = gameState.language === 'PT' ? ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'] : ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    for (let i = 0; i < 9; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      const match = fixtures.find(f => f.date === dStr && (f.homeTeamId === userTeam.id || f.awayTeamId === userTeam.id));
      const activity = gameState.activities.find(a => a.date === dStr);
      
      let opponentTeam = undefined;
      if (match) {
          const oppId = match.homeTeamId === userTeam.id ? match.awayTeamId : match.homeTeamId;
          opponentTeam = teams.find(t => t.id === oppId);
      }
      
      const monthIndex = d.getMonth();
      // Market open: Jan (0), Feb (1), Jul (6), Aug (7)
      const isTransferWindow = [0, 1, 6, 7].includes(monthIndex);

      days.push({
        date: dStr,
        dayName: dayNames[d.getDay()],
        dayNum: d.getDate(),
        isMatch: !!match,
        opponentTeam,
        activity: activity,
        isToday: dStr === gameState.currentDate,
        isPast: dStr < gameState.currentDate,
        isTransferWindow
      });
    }
    return { days, monthYearLabel };
  }, [gameState.currentDate, fixtures, userTeam.id, gameState.activities, teams, gameState.language]);

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in overflow-hidden relative">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tight italic leading-none transition-colors">
            <span className="text-slate-900 dark:text-white transition-colors">MANAGER</span> <span className="text-blue-500">DASHBOARD</span>
          </h2>
          <p className="text-blue-500 dark:text-blue-400 font-bold text-[10px] uppercase tracking-widest mt-1 italic transition-colors">
            {t('dash_manager_home')}
          </p>
        </div>
        <div className="flex gap-2">
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
                           className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-2.5 rounded text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center gap-2 border-b-4 border-emerald-800"
                         >
                           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="10"/></svg>
                           {gameState.matchMinute > 0 ? 'RESUME SIM' : t('dash_simulate')}
                         </button>
                      )}
                      {showMatchDay && (
                         <button 
                           onClick={() => { localStorage.setItem('activeMatchView', 'MATCH'); onGoToMatchDay?.(); }}
                           className="bg-blue-600 hover:bg-blue-500 text-white font-black px-8 py-2.5 rounded text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center gap-2 border-b-4 border-blue-800"
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
           )}
        </div>
      </div>

      <div className="flex flex-col gap-1 transition-all">
        <div className="text-[10px] font-black text-slate-900 dark:text-slate-400 uppercase tracking-[0.2em] italic transition-colors px-1">
          {calendarInfo.monthYearLabel}
        </div>
        <div className="grid grid-cols-9 gap-2">
          {calendarInfo.days.map((day, idx) => (
            <button 
              key={idx} 
              onClick={() => !day.isPast && setSelectedDate(day.date)}
              className={`relative rounded-lg border overflow-hidden flex transition-all min-h-[85px] justify-center text-left group ${
                day.isToday ? 'bg-blue-600 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)] scale-105 z-10' : 
                day.isPast ? 'bg-slate-100 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 opacity-40 cursor-default' : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 shadow-sm'
              }`}
            >
              {/* Left Column: 1/3 Width - Day & Week */}
              <div className={`w-[35%] flex flex-col justify-center items-center h-full border-r ${day.isToday ? 'border-blue-500' : 'border-slate-100 dark:border-slate-700/50'} bg-black/5 dark:bg-black/20`}>
                <span className={`text-lg font-black leading-none mb-0.5 ${day.isToday ? 'text-white' : 'text-slate-800 dark:text-slate-300'}`}>{day.dayNum}</span>
                <span className={`text-[9px] font-black uppercase leading-none ${day.isToday ? 'text-blue-200' : 'text-slate-400'}`}>{day.dayName}</span>
                {day.isTransferWindow && (
                    <div className="mt-1" title="Transfer Market Open">
                        <span className="text-[10px]">⇄</span>
                    </div>
                )}
              </div>

              {/* Right Column: 2/3 Width - Shield or Activity */}
              <div className="flex-1 flex flex-col items-center justify-center p-2 overflow-hidden">
                {day.isMatch && day.opponentTeam ? (
                   <div className="flex flex-col items-center justify-center w-full h-full gap-1.5">
                     <TeamShield team={day.opponentTeam} className="w-10 h-12 drop-shadow-md transform group-hover:scale-110 transition-transform" />
                     <span className={`text-[11px] font-black uppercase tracking-tight text-center leading-tight px-1 truncate w-full ${day.isToday ? 'text-blue-100' : 'text-slate-600 dark:text-slate-300'}`}>
                        {day.opponentTeam.name}
                     </span>
                   </div>
                ) : day.activity ? (
                   <div className="flex flex-col items-center justify-center">
                      <span className="text-3xl leading-none mb-1">{day.activity.type === 'TRAINING_CAMP' ? '🏔️' : day.activity.type === 'TEAM_PARTY' ? '🎉' : '⚽'}</span>
                      <span className={`text-[9px] font-black uppercase ${day.isToday ? 'text-blue-100' : 'text-slate-400'} tracking-tighter`}>{t('dash_event')}</span>
                   </div>
                ) : (
                   <span className={`text-[12px] font-black uppercase tracking-widest ${day.isToday ? 'text-blue-300' : 'text-slate-200 dark:text-slate-700'}`}>-</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 pt-6">
        <div className="col-span-8 flex flex-col gap-6">
          <div className="grid grid-cols-12 gap-6 h-[300px]">
            {/* User Club Details */}
            <div className="col-span-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xl relative overflow-hidden flex flex-col">
                <ClubDetailsCard team={userTeam} t={t} title="My Club" />
            </div>

            {/* Next Match Section */}
            <div className="col-span-4 flex justify-center">
              <div className="w-full bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl relative overflow-hidden transition-all duration-300">
                 <div className="absolute top-0 right-0 p-6 opacity-5 dark:opacity-10 pointer-events-none flex flex-col items-end">
                   <span className="text-4xl font-black italic text-slate-400 dark:text-white leading-none">VS</span>
                 </div>
                 <div className="relative z-10 flex flex-col h-full justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] font-sans">
                        {t('dash_next_match')}
                        {nextMatch && (
                          <span className="ml-2 text-blue-500 dark:text-blue-400 opacity-80 font-black">
                            - {nextMatch.id.includes('friendly') ? 'FRIENDLY' : `ROUND ${nextMatch.week}`}
                          </span>
                        )}
                      </span>
                    </div>
                   <div className="flex items-center justify-between gap-2 mt-2 flex-1">
                     {/* Left Side: Home Team */}
                     <div 
                       className={`text-center flex-1 group ${displayHomeTeam.id !== userTeam.id ? 'cursor-pointer' : ''}`}
                       onClick={() => displayHomeTeam.id !== userTeam.id && setViewOpponent(displayHomeTeam)}
                     >
                        <div className="flex items-center justify-center mx-auto mb-2 drop-shadow-2xl transition-transform group-hover:scale-110">
                           <TeamShield team={displayHomeTeam} className="w-14 h-16" />
                        </div>
                        <div className="text-[11px] font-black text-slate-800 dark:text-white uppercase italic transition-colors truncate w-full group-hover:text-blue-500">{displayHomeTeam.name}</div>
                     </div>

                     <div className="text-center flex flex-col items-center px-1">
                       <div className="text-2xl font-black text-slate-200 dark:text-white/20 italic">vs</div>
                     </div>

                     {/* Right Side: Away Team */}
                     <div 
                       className={`text-center flex-1 group ${displayAwayTeam?.id !== userTeam.id ? 'cursor-pointer' : ''}`}
                       onClick={() => displayAwayTeam && displayAwayTeam.id !== userTeam.id && setViewOpponent(displayAwayTeam)}
                     >
                        <div className="flex items-center justify-center mx-auto mb-2 drop-shadow-2xl transition-transform group-hover:scale-110 duration-300">
                           <TeamShield team={displayAwayTeam || displayHomeTeam} className="w-14 h-16" />
                        </div>
                        <div className="text-[11px] font-black text-slate-800 dark:text-white uppercase italic transition-colors group-hover:text-blue-500 truncate w-full">{displayAwayTeam?.name || 'Unknown'}</div>
                     </div>
                   </div>
                   {nextMatch && (publicoEstimado || weather) && (
                     <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                       {publicoEstimado && (
                         <div className="text-center">
                           <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Attendance (est.)</div>
                           <div className="text-[17px] font-black text-slate-700 dark:text-slate-200 tabular-nums">{publicoEstimado.publico.toLocaleString()}</div>
                           <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500">{publicoEstimado.pct}% of {publicoEstimado.cap.toLocaleString()}{publicoEstimado.comp !== 'LIGA' ? ` · ${({ COPA: 'Cup', CONTINENTAL: 'Continental', AMISTOSO: 'Friendly' } as any)[publicoEstimado.comp]} x${ECONOMIA_ESTADIO.multiplicadorCompeticao[publicoEstimado.comp]}` : ''}</div>
                         </div>
                       )}
                       {weather && (
                         <div className="text-center">
                           <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Weather</div>
                           <div className="text-[17px] font-black text-slate-700 dark:text-slate-200"><span className="text-2xl mr-1 align-middle">{weather.icon}</span>{weather.temp}°C</div>
                           <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500">{weather.desc}</div>
                         </div>
                       )}
                     </div>
                   )}
                 </div>
              </div>
            </div>

            {/* Opponent Club Details */}
            <div className="col-span-4 bg-slate-100/50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xl relative overflow-hidden flex flex-col">
                {displayAwayTeam && displayAwayTeam.id !== userTeam.id ? (
                  <ClubDetailsCard team={displayAwayTeam} t={t} title="Opponent" isOpponent userTeam={userTeam} />
                ) : (displayHomeTeam.id !== userTeam.id ? (
                  <ClubDetailsCard team={displayHomeTeam} t={t} title="Opponent" isOpponent userTeam={userTeam} />
                ) : (
                   <div className="flex-1 flex flex-col items-center justify-center opacity-30 italic text-xs">No Opponent Insight Available</div>
                ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col transition-all shadow-md">
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 transition-colors">{t('dash_squad_snap')}</h3>
              <div className="flex-1 flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors shadow-sm">
                    <div className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase transition-colors tracking-widest">{t('dash_avg_ovr')}</div>
                    <div className="text-lg font-black text-slate-800 dark:text-white italic transition-colors">{userTeam.strength}</div>
                  </div>
                  <div className="bg-white dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors shadow-sm">
                    <div className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase transition-colors tracking-widest">{t('dash_players')}</div>
                    <div className="text-lg font-black text-slate-800 dark:text-white italic transition-colors">{players.filter(p => p.teamId === userTeam.id).length}</div>
                  </div>
                </div>

                <div className="flex-1 min-h-0 bg-white dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800 p-3 flex flex-col overflow-hidden">
                    <div className="text-xs font-black text-slate-400 dark:text-slate-600 uppercase transition-colors tracking-widest mb-2">{t('dash_top_5')}</div>
                    {/* Header Row */}
                    <div className="flex justify-between items-center px-1 pb-1 mb-1 border-b border-slate-200 dark:border-slate-800/50 text-sm font-black uppercase text-slate-400 tracking-wider">
                        <span className="w-6 text-center">#</span>
                        <span className="flex-1 text-left">PLAYER</span>
                        <span className="w-12 text-center">APPS</span>
                        <span className="w-12 text-center">GLS</span>
                        <span className="w-12 text-center">AST</span>
                        <span className="w-10 text-right">OVR</span>
                    </div>
                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
                        {top5Players.map((p, idx) => (
                            <div key={p.id} className="flex justify-between items-center py-0.5 px-1 hover:bg-slate-50 dark:hover:bg-slate-800/30 rounded transition-colors group">
                                <span className="text-base font-bold text-slate-400 w-6 text-center">{idx + 1}</span>
                                <PlayerFace playerId={p.id} camisa={userTeam ? getKitDetails(userTeam, 0).c1 : undefined} className="w-[54px] h-[54px] shrink-0 mr-2 rounded-md overflow-hidden bg-black/30 border border-white/20" />
                                <div className="flex-1 flex flex-col min-w-0 pr-2">
                                    <span className="text-base font-bold text-slate-700 dark:text-slate-300 uppercase truncate">{p.name}</span>
                                </div>
                                <span className="text-base font-black text-slate-700 dark:text-slate-300 w-12 text-center">{p.appearances || 0}</span>
                                <span className="text-base font-black text-slate-700 dark:text-slate-300 w-12 text-center">{p.goalsScored}</span>
                                <span className="text-base font-black text-slate-700 dark:text-slate-300 w-12 text-center">{p.assists}</span>
                                <div className="w-10 text-right">
                                    <span className="text-base font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">{p.skill}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col transition-all shadow-md">
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 transition-colors">{t('dash_treasury')}</h3>
              
              <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
                 <div className="bg-white dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800 p-4 flex flex-col justify-center text-center shadow-sm">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('dash_avail_balance')}</div>
                    <div className="text-xl font-black text-slate-800 dark:text-white truncate">{formatCurrency(userTeam.cash)}</div>
                 </div>

                 <div className="bg-white dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800 p-4 flex flex-col justify-center text-center shadow-sm">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('fin_weekly_sal')}</div>
                    <div className="text-xl font-black text-rose-500 truncate">{formatCurrency(totalSalaries)}</div>
                 </div>

                 <div className="bg-white dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800 p-4 flex flex-col justify-center text-center shadow-sm">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('fin_match_rev')}</div>
                    <div className="text-xl font-black text-blue-500 truncate">{formatCurrency(estMatchRevenue)}</div>
                 </div>

                 <div className="bg-white dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800 p-4 flex flex-col justify-center text-center shadow-sm">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('fin_sponsor')}</div>
                    <div className="text-xl font-black text-emerald-500 truncate">{formatCurrency(userTeam.sponsorAmount || 0)}</div>
                 </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xl transition-colors">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-950 transition-colors shadow-sm">
            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">{t('dash_standings')}</h3>
            <span className="text-[10px] font-black bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded italic border border-blue-200 dark:border-blue-500/30 transition-colors">Pos: {userPos}º</span>
          </div>
          <div className="flex-1 bg-white dark:bg-transparent transition-colors overflow-y-auto custom-scrollbar">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900/50 transition-colors border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10">
                <tr className="text-[8px] font-black text-slate-900 dark:text-slate-600 uppercase transition-colors">
                  <th className="px-4 py-2 text-left w-12 tracking-widest bg-slate-50 dark:bg-slate-900/50">Pos</th>
                  <th className="px-2 py-2 text-left tracking-widest bg-slate-50 dark:bg-slate-900/50">Team</th>
                  <th className="px-4 py-2 text-right tracking-widest bg-slate-50 dark:bg-slate-900/50">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30 transition-colors">
                {top20.map((t, i) => (
                  <tr key={t.id} className={`group ${t.id === userTeam.id ? 'bg-blue-50 dark:bg-blue-600/10' : ''} transition-colors`}>
                    <td className="px-4 py-0.5 font-black text-slate-300 dark:text-slate-500 text-xs transition-colors">{i + 1}</td>
                    <td className="px-2 py-0.5">
                      <div className="flex items-center gap-2">
                        <TeamShield team={t} className="w-6 h-[29.5px]" />
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-400 uppercase truncate max-w-[120px] transition-colors">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-0.5 text-right font-black text-slate-800 dark:text-slate-200 text-xs transition-colors">{t.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedDate && (
        <ActivityModal 
          isOpen={true} 
          onClose={() => setSelectedDate(null)} 
          date={selectedDate} 
          onSchedule={(type, details) => scheduleActivity(selectedDate, type, details)} 
        />
      )}

      {viewOpponent && (
        <OpponentTacticsModal 
          team={viewOpponent} 
          players={players.filter(p => p.teamId === viewOpponent.id)}
          onClose={() => setViewOpponent(null)} 
        />
      )}
    </div>
  );
};

export default DashboardView;
