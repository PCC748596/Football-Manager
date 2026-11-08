
import { atributos3d, NOME_DO_CAMPO } from '../textSim/atributos3d';
import { calcularQuimica } from '../textSim/quimica';
import { doisNomes } from '../textSim/nomes';
import NextGameButton, { SetasAGirar } from './NextGameButton';
import React, { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { Position, Player } from '../types';
import { PlayerFace3D } from './PlayerFace3D';

import { ACTIVITIES, TrainingActivity, Impact } from '../textSim/trainingService';
import EnergyBar, { energiaDe } from './EnergyBar';
import { MedicalDepartmentPanel } from './MedicalDepartmentPanel';
import TrainingIcon, { COR_DO_TREINO } from './TrainingIcon';
import PlayerDetailModal from './PlayerDetailModal';

const PLANE_ICON = (
  <div className="flex flex-col items-center justify-center opacity-30 select-none pointer-events-none">
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-20 h-20 transform -rotate-45">
      <path d="M21 16V14L13 9V3.5A1.5 1.5 0 0 0 11.5 2A1.5 1.5 0 0 0 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z" />
    </svg>
    <span className="text-[12px] font-black tracking-[0.2em] mt-1">TRAVEL</span>
  </div>
);

const getTeamState = (name: string) => name.split('-').pop() || '';

/** Icones do painel de atributos do time: SVG de linha, todos do mesmo estilo e da mesma cor. */
const Ico: React.FC<{ children: React.ReactNode }> = ({ children }) => <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
/** Cor da nota de um grupo de atributos: abaixo de 60 vermelho, 60-69 laranja, 70 ou mais verde. */
const corDaNota = (v: number) => (v < 60 ? 'text-red-500' : v < 70 ? 'text-orange-500' : 'text-emerald-500');
const ICONE_TEC = <Ico><circle cx="12" cy="12" r="9" /><path d="m12 8 3.5 2.5-1.3 4h-4.4l-1.3-4z" /><path d="M12 3v5M15.5 10.5 20 9M14.2 14.5 17 18.5M9.8 14.5 7 18.5M8.5 10.5 4 9" /></Ico>;
const ICONE_TAC = <Ico><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 8 4 4M11 8l-4 4" /><circle cx="16" cy="15" r="1.6" /></Ico>;
const ICONE_MEN = <Ico><path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3 2.5 2.5 0 0 0 3-2.5V6.5A2.5 2.5 0 0 0 9 4z" /><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3 2.5 2.5 0 0 1-3-2.5" /></Ico>;
// FIS: halter.
const ICONE_FIS = <Ico><path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12" /></Ico>;
const ICONE_STA = <Ico><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" /></Ico>;
const ICONE_CHE = <Ico><path d="M4 8h14" /><path d="m14 4 4 4-4 4" /><path d="M20 16H6" /><path d="m10 12-4 4 4 4" /></Ico>;
const ICONE_MOR = <Ico><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01M15 9h.01" /></Ico>;

/*
A CARGA DE TREINO DE UMA AREA (TEC, TAC, MEN, PHY) na ultima sessao: tres barras que crescem (como o sinal de um telefone), cheias ate o nivel (1 = leve, 2 = medio, 3 = forte), em verde quando o jogador evoluiu na
area e em vermelho quando regrediu; sem treino nessa area, as tres ficam apagadas. Substitui as setas empilhadas, que nao diziam o que significavam. O `title` explica.
*/
const BarrasDeNivel: React.FC<{ nivel: number; cor: string }> = ({ nivel, cor }) => (
  <div className="flex items-end gap-[2px] h-[14px]">
    {[1, 2, 3].map(i => (
      <span key={i} className={`w-[5px] rounded-[1px] ${i <= nivel ? cor : 'bg-slate-300 dark:bg-slate-700'}`} style={{ height: 4 + i * 3 }} />
    ))}
  </div>
);
const NOME_DA_AREA: Record<string, string> = { TEC: 'Technical', TAC: 'Tactical', MEN: 'Mental', PHY: 'Physical' };
const CargaDeTreino: React.FC<{ label: string; val: number }> = ({ label, val }) => {
  const nivel = Math.min(3, Math.abs(Math.round(val)));
  const cor = val < 0 ? 'bg-rose-500' : 'bg-emerald-500';
  const texto = nivel === 0 ? 'no training' : `${['', 'light', 'medium', 'strong'][nivel]} ${val < 0 ? 'decline' : 'training'}`;
  return (
    <div className="flex flex-col items-center justify-start min-w-[34px] gap-1" title={`${NOME_DA_AREA[label] || label}: ${texto} (last session)`}>
      <div className="text-[10px] font-black text-slate-400 uppercase leading-none">{label}</div>
      <BarrasDeNivel nivel={nivel} cor={cor} />
    </div>
  );
};

const TrainingView: React.FC = () => {
  const { gameState, userTeam, teams, fixtures, players, setTrainingSchedules, unlockTrainingGroup, updatePlayerTrainingGroup, setTrainingAutoGrupos, advanceDay, formatCurrency, formatCurrencyShort, t } = useGame();
  const [activeCategory, setActiveCategory] = useState<TrainingActivity['category']>('TECHNIQUE');
  // 0..2 = G1..G3; 3 = Medical Department (os lesionados, que nao treinam).
  const GRUPO_MED = 3;
  const [selectedGroup, setSelectedGroup] = useState<number>(0);
  // Clicar num jogador de Squad Assignments abre o overview dele (o mesmo modal do Squad).
  const [jogadorAberto, setJogadorAberto] = useState<Player | null>(null);
  // Toque (iPad): escolhe-se o treino e depois o slot, como na substituicao de jogadores; arrastar continua a funcionar.
  const [selActivity, setSelActivity] = useState<string | null>(null);
  const [squadSortBy, setSquadSortBy] = useState<'growth' | 'energy'>('growth');
  
  // Use gameState schedule directly
  const program = gameState.trainingSchedules?.[selectedGroup] || gameState.trainingSchedule;
  const lesionadosDoClube = players.filter(p => p.teamId === userTeam?.id && p.injury).length;

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
    
    const jogos = userMatches.map(userMatch => {
      const dIndex = weekDates.indexOf(userMatch.date);
      const opponentId = userMatch.homeTeamId === userTeam.id ? userMatch.awayTeamId : userMatch.homeTeamId;
      const opponent = teams.find(t => t.id === opponentId);
      return { index: dIndex, opponent: (opponent?.name || 'Opponent').toUpperCase() };
    });
    // Amistoso marcado no calendario: o dia fica bloqueado com o jogo mesmo que o fixture nao esteja na lista (o label da atividade e o adversario).
    weekInfo.days.forEach((d, i) => {
      if (d.activity?.type === 'FRIENDLY' && !jogos.some(j => j.index === i)) jogos.push({ index: i, opponent: (d.activity.label || 'Friendly').toUpperCase() });
    });
    return jogos;
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

  // Toque num slot com um treino escolhido: poe o treino la (respeitando os limites) e, se esgotou, desmarca.
  const colocarSelecionado = (dIdx: number, slotIdx: number) => {
    if (!selActivity) return;
    const act = ACTIVITIES.find(a => a.id === selActivity);
    if (!act) return;
    const naSlot = program[dIdx][slotIdx];
    const actUsage = usageCounts.activities[act.id] || 0, catUsage = usageCounts.categories[act.category as keyof typeof LIMITS.categories];
    const limitCat = LIMITS.categories[act.category as keyof typeof LIMITS.categories];
    const mesmaAct = naSlot === act.id;
    if (!mesmaAct && (actUsage >= LIMITS.activities || catUsage >= limitCat)) { setSelActivity(null); return; }
    handleSlotUpdate(dIdx, slotIdx, act.id);
    const ocupava = !mesmaAct && !!naSlot;
    const novoAct = actUsage + (mesmaAct ? 0 : 1), novoCat = catUsage + (mesmaAct ? 0 : 1) - (ocupava && getActivity(naSlot)?.category === act.category ? 1 : 0);
    if (novoAct >= LIMITS.activities || novoCat >= limitCat) setSelActivity(null);
  };

  const getTeamAvg = (attr: keyof Player) => {
    const teamPlayers = players.filter(p => p.teamId === userTeam?.id);
    if (!teamPlayers.length) return 0;
    // @ts-ignore
    return Math.round(teamPlayers.reduce((acc, p) => acc + (p[attr] || 0), 0) / teamPlayers.length);
  };

  // TEC, TAC e MEN: a media do plantel dos grupos de atributos do 3D Match (textSim/atributos3d.ts); STA: a condicao fisica; MOR: a moral.
  const media3d = useMemo(() => {
    const ps = players.filter(p => p.teamId === userTeam?.id);
    const media = (k: 'tec' | 'tac' | 'men' | 'fis') => (ps.length ? Math.round(ps.reduce((acc, p) => acc + atributos3d(p)[k], 0) / ps.length) : 0);
    return { tec: media('tec'), tac: media('tac'), men: media('men'), fis: media('fis') };
  }, [players, userTeam]);
  const avgFit = useMemo(() => { const ps = players.filter(p => p.teamId === userTeam?.id); return ps.length ? Math.round(ps.reduce((acc, p) => acc + energiaDe(p), 0) / ps.length) : 0; }, [players, userTeam]);
  const avgMor = useMemo(() => getTeamAvg('morale'), [players, userTeam]);
  // CHE: o mesmo Chemistry da aba Tactics (textSim/quimica.ts), com a escalacao salva do time.
  const teamChe = useMemo(() => {
    if (!userTeam) return 0;
    const titulares = (userTeam.lineup || []).filter(Boolean).map(id => players.find(p => p.id === id)).filter((p): p is Player => !!p);
    return calcularQuimica(titulares, userTeam.tactics.formation, userTeam.synergyMap);
  }, [players, userTeam]);

  const squadPlayers = useMemo(() => {
    const list = players.filter(p => p.teamId === userTeam?.id);
    if (squadSortBy === 'energy') {
        return [...list].sort((a, b) => energiaDe(a) - energiaDe(b)); // Tired first
    }
    return [...list].sort((a, b) => b.weeklyGrowth - a.weeklyGrowth); // Growing first
  }, [players, userTeam, squadSortBy]);

  // Training Limits
  const LIMITS = {
    categories: {
      TECHNIQUE: 12,
      TACTICS: 10,
      PHYSICAL: 8,
      MENTAL: 8
    },
    activities: 2
  };

  const usageCounts = useMemo(() => {
    const counts = {
      categories: { TECHNIQUE: 0, TACTICS: 0, PHYSICAL: 0, MENTAL: 0 },
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

  // A CARGA DA SEMANA de cada area (as barras sob TECHNIQUE, TACTICS, MENTAL e PHYSICAL): as sessoes dela no programa do grupo, em relacao a area que mais treina (3 barras = a mais treinada).
  const sessoesPorArea = usageCounts.categories as Record<string, number>;
  const maxSessoes = Math.max(1, ...Object.values(sessoesPorArea) as number[]);
  const cargaDe = (area: string) => { const n = sessoesPorArea[area] || 0; return { nivel: n > 0 ? Math.max(1, Math.round(3 * n / maxSessoes)) : 0, sessoes: n }; };
  const StatBox = ({ icon, label, value, color, area }: { icon: React.ReactNode, label: string, value: number, color: string, area?: string }) => {
    const carga = area ? cargaDe(area) : null;
    return (
    <div className="flex-1 flex flex-col items-center justify-center p-2 border-r last:border-r-0 border-slate-200 dark:border-slate-800/50 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors">
        <span className="mb-1 text-slate-500 dark:text-slate-300">{icon}</span>
        <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</div>
        <div className={`text-2xl font-black italic tracking-tighter ${color}`}>{value}</div>
        {carga && <div className="mt-1" title={`${carga.sessoes} training session(s) this week` + (carga.nivel === 3 ? ' — the most trained area' : carga.nivel === 0 ? ' — not trained' : '')}><BarrasDeNivel nivel={carga.nivel} cor="bg-emerald-500" /></div>}
    </div>
    );
  };

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

      {/* No tablet (< 1280 px) uma coluna so: os 2 paineis da direita ficam ABAIXO dos 2 da esquerda, e a tela rola na vertical. No computador, as duas colunas de sempre. */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-0 overflow-y-auto xl:overflow-visible custom-scrollbar">
        
        {/* LEFT COLUMN: CALENDAR GRID + TEAM STATS */}
        <div className="xl:col-span-7 flex flex-col gap-4 min-h-[640px] xl:min-h-0">
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
                    <button
                      onClick={() => setSelectedGroup(GRUPO_MED)}
                      title="Medical Department"
                      className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 ${selectedGroup === GRUPO_MED ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-700'}`}
                    >
                      ✚ MED{lesionadosDoClube > 0 ? ` (${lesionadosDoClube})` : ''}
                    </button>
                 </div>
                 {(gameState.unlockedTrainingGroups || 1) > 1 && (() => {
                   const nG = gameState.unlockedTrainingGroups || 1;
                   const auto = gameState.trainingAutoGrupos || { ativo: false, limiares: [80, 50] };
                   const lim = Array.from({ length: nG - 1 }, (_, i) => auto.limiares[i] ?? (i === 0 ? 80 : 50));
                   const grava = (ativo: boolean, novos: number[]) => setTrainingAutoGrupos({ ativo, limiares: novos });
                   return (
                     <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500" title="Players move between groups automatically by ENR (at the start of each day).">
                       <button
                         onClick={() => grava(!auto.ativo, lim)}
                         className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest transition-colors ${auto.ativo ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-700'}`}
                       >
                         AUTO ENR {lim[0]} - {auto.ativo ? 'ON' : 'OFF'}
                       </button>
                       {lim.map((v, i) => (
                         <span key={i} title={`G${i + 1}: ENR minima`} className={`flex items-center gap-1 ${auto.ativo ? '' : 'opacity-40'}`}>
                           <input
                             type="number" min={0} max={100} value={v} disabled={!auto.ativo}
                             onChange={e => {
                               const n = Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0)));
                               const novos = lim.slice(); novos[i] = n;
                               for (let k = i + 1; k < novos.length; k++) if (novos[k] > n) novos[k] = n;   // decrescentes
                               for (let k = i - 1; k >= 0; k--) if (novos[k] < n) novos[k] = n;
                               grava(true, novos);
                             }}
                             className="w-12 px-1 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-white text-[10px] font-black"
                           />
                         </span>
                       ))}
                     </div>
                   );
                 })()}
                 <button 
                   disabled={selectedGroup === GRUPO_MED || selectedGroup >= (gameState.unlockedTrainingGroups || 1)}
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
              
              {selectedGroup === GRUPO_MED ? (
                 <MedicalDepartmentPanel />
              ) : selectedGroup >= (gameState.unlockedTrainingGroups || 1) ? (
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
                          <div className="text-xs font-black mt-0.5 flex items-center justify-center gap-1">{day.dayNum}{day.isToday && <SetasAGirar className="w-3.5 h-3.5" />}</div>
                        </div>
                       
                       {isMatchDay && matchForDay ? (
                         <div className="flex-1 bg-blue-50 dark:bg-blue-900/10 rounded-b-lg border border-blue-200 dark:border-blue-500/20 flex flex-col items-center relative overflow-hidden transition-colors">
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-1" style={{ containerType: 'size' }}>
                               <div className="font-black italic tracking-tighter text-blue-500/20 dark:text-blue-500/15 whitespace-nowrap transition-all uppercase leading-none" style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)', fontSize: `min(50px, 80cqw, ${(90 / Math.max(1, matchForDay.opponent.length * 0.65)).toFixed(2)}cqh)` }}>
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
                            {/* 5 linhas de altura igual: 2 slots da manha, ALMOCO (sem treino) e 2 slots da tarde. */}
                            {([0, 1, 'lunch', 2, 3] as const).map((slotIdx) => {
                              if (slotIdx === 'lunch') {
                                return (
                                  <div key="lunch" className="flex-1 basis-0 min-h-0 rounded border border-slate-200 dark:border-slate-800/60 bg-slate-100/60 dark:bg-slate-900/40 relative overflow-hidden flex flex-col items-center justify-center gap-1 pointer-events-none select-none">
                                    <span className="text-3xl leading-none opacity-30 grayscale">🍽️</span>
                                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest leading-none">Lunch time</span>
                                  </div>
                                );
                              }
                              const act = getActivity(program[dIdx][slotIdx]);
                              const isLastSlot = slotIdx === 3;
                              const isBlocked = isLastSlot && travel;

                              return (
                                <div 
                                  key={slotIdx}
                                  onClick={() => { if (!isBlocked) colocarSelecionado(dIdx, slotIdx); }}
                                  onDragOver={(e) => !isBlocked && e.preventDefault()}
                                  onDrop={(e) => {
                                    if (isBlocked) return;
                                    const id = e.dataTransfer.getData("activityId");
                                    if (id) handleSlotUpdate(dIdx, slotIdx, id);
                                  }}
                                  className={`flex-1 basis-0 min-h-0 rounded border transition-all relative group overflow-hidden ${
                                    isBlocked ? 'border-amber-200/50 dark:border-amber-500/20 bg-amber-500/5 cursor-not-allowed' :
                                    day.isTrainingCamp ? 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-500/5' :
                                    act ? 'border-blue-300 dark:border-blue-500/50 bg-blue-50 dark:bg-blue-600/10 shadow-[inset_0_0_10px_rgba(59,130,246,0.1)]' : 'border-dashed border-slate-300 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-900/20 cursor-pointer'
                                  }`}
                                >
                                   {(act || day.isTrainingCamp) && !isBlocked ? (
                                     <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                                        <span className={`text-6xl drop-shadow-sm leading-none flex-1 flex items-center justify-center ${day.isTrainingCamp && !act ? 'opacity-20 grayscale scale-110' : ''}`}>
                                            <TrainingIcon id={act ? act.id : 'camp'} categoria={act?.category} semCor={!act} className="w-16 h-16" />
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
                                       title="Remove" className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center text-[10px] font-black leading-none hover:bg-rose-600 z-10 transition-all"
                                     >✕</div>
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

           {/* TEAM STATS PANEL - 7 COLUMNS: TEC, TAC, MEN, FIS, STA, CHE, MOR */}
           <div className="h-32 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex overflow-hidden shadow-lg transition-colors">
              <StatBox icon={ICONE_TEC} label="TECHNIQUE" value={media3d.tec} color={corDaNota(media3d.tec)} area="TECHNIQUE" />
              <StatBox icon={ICONE_TAC} label="TACTICS" value={media3d.tac} color={corDaNota(media3d.tac)} area="TACTICS" />
              <StatBox icon={ICONE_MEN} label="MENTAL" value={media3d.men} color={corDaNota(media3d.men)} area="MENTAL" />
              <StatBox icon={ICONE_FIS} label="PHYSICAL" value={media3d.fis} color={corDaNota(media3d.fis)} area="PHYSICAL" />
              <StatBox icon={ICONE_STA} label="ENERGY" value={avgFit} color="text-emerald-500" />
              <StatBox icon={ICONE_CHE} label="CHEMISTRY" value={teamChe} color="text-blue-500" />
              <StatBox icon={ICONE_MOR} label="MORALE" value={avgMor} color="text-amber-500" />
           </div>
        </div>

        {/* RIGHT: TRAINING SESSIONS */}
        <div className="xl:col-span-5 flex flex-col min-h-[560px] xl:min-h-0">
           {/* TABS */}
           <div className="flex gap-1 mb-0.5 shrink-0">
             {[
               { id: 'TECHNIQUE', label: 'TEC' },
               { id: 'TACTICS', label: 'TAC' },
               { id: 'PHYSICAL', label: 'FIS' },
               { id: 'MENTAL', label: 'MEN · CHEM · MOR' }
             ].map(tab => {
               const catUsage = usageCounts.categories[tab.id as keyof typeof LIMITS.categories];
               const limitCat = LIMITS.categories[tab.id as keyof typeof LIMITS.categories];
               const isExhausted = catUsage >= limitCat;
               // A CARGA DA SEMANA nesta area, em relacao a que mais treina (3 barras = a area com mais treino; sem treino, apagadas).
               const maxUsage = Math.max(1, ...Object.values(usageCounts.categories) as number[]);
               const nivelSemana = catUsage > 0 ? Math.max(1, Math.round(3 * catUsage / maxUsage)) : 0;
               
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
                 <span className="flex items-center gap-1">
                   <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COR_DO_TREINO[tab.id as TrainingActivity['category']] }} />
                   {tab.label}
                 </span>
                 <span className="mt-1" title={`${catUsage} session(s) this week` + (nivelSemana === 3 && catUsage > 0 ? ' — the most trained area' : '')}><BarrasDeNivel nivel={nivelSemana} cor="bg-emerald-500" /></span>
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
                     Tap a session, then tap a calendar slot (or drag it there)
                   </p>

                   <div className="grid grid-cols-2 gap-2 flex-1 content-start bg-white/40 dark:bg-transparent rounded p-2 overflow-y-auto custom-scrollbar">
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
                          onClick={() => { if (!isDisabled) setSelActivity(s => (s === act.id ? null : act.id)); }}
                          className={`flex items-center gap-3 group p-2 rounded-xl transition-all border border-transparent relative min-w-0 ${isDisabled ? 'opacity-50 grayscale cursor-not-allowed border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-900/10' : `cursor-grab active:cursor-grabbing hover:bg-blue-50 dark:hover:bg-white/5 hover:border-blue-200 dark:hover:border-slate-800 hover:shadow-lg ${selActivity === act.id ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-600/20' : ''}`}`}
                        >
                           {isDisabled && (
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-rose-500 text-white text-[8px] font-black px-2 py-0.5 rounded rotate-12 z-20 whitespace-nowrap shadow-lg">
                               {isCatExhausted ? 'CAT. LIMIT' : 'EXHAUSTED'}
                             </div>
                           )}
                           <div className={`w-14 h-14 shrink-0 bg-white dark:bg-slate-800/80 border ${isDisabled ? 'border-rose-200 dark:border-rose-800' : 'border-slate-200 dark:border-slate-700 group-hover:border-blue-500/50 group-hover:scale-105 active:scale-95 group-hover:-translate-y-1'} rounded-2xl flex items-center justify-center text-4xl shadow-md transition-all`}>
                             <TrainingIcon id={act.id} categoria={act.category} semCor={isDisabled} className="w-9 h-9" />
                           </div>
                           <div className="flex flex-col gap-1 min-w-0 flex-1">
                             <div className="flex items-center gap-2 min-w-0">
                               <span className={`text-sm truncate font-black uppercase tracking-tight transition-colors ${isDisabled ? 'text-rose-500/70 dark:text-rose-400/70' : 'text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-white'}`}>
                                 {act.name}
                               </span>
                               <span className={`shrink-0 text-[10px] font-black tracking-widest px-1.5 py-0.5 rounded ${isActExhausted ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                 [{actUsage}/{limitAct}]
                               </span>
                             </div>
                             <div className="flex flex-wrap gap-1">
                               {act.impacts.filter(impact => !['DEF', 'PAS', 'DRB', 'SHT'].includes(impact.label)).map((impact, idx) => (
                                 <span 
                                   key={idx} 
                                   className={`text-[11px] font-black uppercase px-2 py-1 rounded leading-none transition-colors ${isDisabled ? 'bg-rose-100/50 dark:bg-rose-900/20 text-rose-500/50' : impact.value > 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}
                                 >
                                   {impact.value > 0 ? '+' : ''}{impact.value} {impact.campo ? NOME_DO_CAMPO[impact.campo] : impact.skill || impact.label}
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
                            onClick={() => setSquadSortBy('energy')}
                            className={`text-[11px] px-2 py-1 font-black uppercase tracking-widest transition-colors ${squadSortBy === 'energy' ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            Energy
                          </button>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                      {squadPlayers.map((p, idx) => {
                          return (
                          <div key={p.id} onClick={() => setJogadorAberto(p)} className="flex flex-col px-[2px] py-[10px] rounded bg-white dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/50 hover:border-blue-500/30 transition-all group cursor-pointer">
                              <div className="grid grid-cols-12 items-center gap-3">
                                  {/* COL 1: PLAYER INFO */}
                                  <div className="col-span-3 flex items-center gap-2 min-w-0">
                                      <div className="w-[56px] h-[56px] shrink-0 overflow-hidden pointer-events-none"><PlayerFace3D playerId={p.id} team={userTeam} gk={p.position === Position.GK} camisa={userTeam?.primaryColor} className="w-full h-full" /></div>
                                      <div className="flex flex-col min-w-0">
                                      <div className="flex flex-col min-w-0">
                                          {doisNomes(p.name).map((nome, i) => (
                                              <span key={i} className="text-[13px] font-black text-slate-700 dark:text-slate-200 uppercase truncate leading-tight">{nome}</span>
                                          ))}
                                      </div>
                                      <span className="text-[12px] text-slate-400 font-bold uppercase truncate">{p.position} • Age {p.age}</span>
                                      </div>
                                  </div>

                                  {/* COL 2: TRAINING CATEGORIES */}
                                  <div className="col-span-3 flex justify-center items-center gap-2">
                                      {[
                                          { label: 'TEC', val: (p.lastGrowth?.drb || 0) + (p.lastGrowth?.sht || 0) + (p.lastGrowth?.pas || 0) },
                                          { label: 'TAC', val: p.lastGrowth?.def || 0 },
                                          { label: 'MEN', val: p.lastGrowth?.men || 0 },
                                          { label: 'PHY', val: p.lastGrowth?.fis || 0 }
                                      ].map(stat => <CargaDeTreino key={stat.label} label={stat.label} val={stat.val || 0} />)}
                                  </div>

                                  {/* COL 3: ENERGY */}
                                  <div className="col-span-2 flex justify-center">
                                    <div className="flex flex-col items-start gap-1 w-[80px]">
                                      <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] font-black text-slate-400 uppercase leading-none">ENR:</span>
                                          <span className={`text-[14px] font-black leading-none ${energiaDe(p) < 70 ? 'text-rose-500' : (energiaDe(p) < 90 ? 'text-amber-500' : 'text-emerald-500')}`}>
                                              {Math.round(energiaDe(p))}%
                                          </span>
                                      </div>
                                      <EnergyBar energy={energiaDe(p)} className="w-full h-2" />
                                    </div>
                                  </div>

                                  {/* COL 4: WEEKLY GROWTH */}
                                  <div className="col-span-1 flex flex-col items-center">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">GROWTH</span>
                                      <div className={`text-[20px] font-black leading-none ${p.weeklyGrowth > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                                          {p.weeklyGrowth > 0 ? `+${p.weeklyGrowth}` : p.weeklyGrowth}
                                      </div>
                                  </div>

                                  {/* COL 5: GROUPS */}
                                  <div className="col-span-3 flex justify-end" onClick={e => e.stopPropagation()}>
                                      {p.injury ? (
                                          <button onClick={() => setSelectedGroup(GRUPO_MED)} title={`${p.injury.type} — Medical Department`} className="px-3 py-3 text-[12px] font-black rounded bg-emerald-600 text-white shadow-sm">✚ MED</button>
                                      ) : (
                                      <div className="flex gap-0.5 shadow-sm border border-slate-200 dark:border-slate-700/50 rounded overflow-hidden">
                                          {[0, 1, 2].map(grp => {
                                              const isLocked = grp >= (gameState.unlockedTrainingGroups || 1);
                                              const isSelected = (p.trainingGroupId || 0) === grp;
                                              return (
                                                  <button
                                                      key={grp}
                                                      disabled={isLocked}
                                                      onClick={() => updatePlayerTrainingGroup(p.id, grp)}
                                                      className={`px-3 py-3 text-[12px] font-black transition-colors ${isSelected ? 'bg-blue-500 text-white' : isLocked ? 'bg-slate-100 dark:bg-slate-900/50 text-slate-300 dark:text-slate-700 cursor-not-allowed' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                                  >
                                                      G{grp + 1}
                                                  </button>
                                              );
                                          })}
                                      </div>
                                      )}
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
      {jogadorAberto && <PlayerDetailModal player={players.find(x => x.id === jogadorAberto.id) || jogadorAberto} onClose={() => setJogadorAberto(null)} />}
    </div>
  );
};

export default TrainingView;
