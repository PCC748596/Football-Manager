import React from 'react';
import { useGame } from '../context/GameContext';
import { Fixture, Team, Player, Position, Language } from '../types';
import { calculateMatchRatings, getStoppageTime } from '../textSim/matchEngine';

interface TeamShieldProps {
  team: Team | undefined;
  className?: string;
}

const UI_TRANSLATIONS = {
  EN: {
    round: "Round",
    liveCenter: "Live Center",
    kickOff: "Kick Off",
    resume: "Resume",
    pause: "Pause",
    instantResult: "Instant Result",
    tactics: "Tactics",
    allFixtures: "All Fixtures",
    gamesToday: "Games Today",
    globalCenter: "Global Center",
    matchMonitor: "Live Match Monitor",
    simulation: "Simulation",
    confirmResults: "Confirm Round Results",
    played: "Played",
    noGoals: "No goals yet",
    realTime: "Real-time simulation...",
    possession: "Possession",
    balance: "Match Balance",
    goalLabel: "GOAL!",
    yellowLabel: "YELLOW",
    redLabel: "RED CARD",
    subLabel: "SUB"
  },
  PT: {
    round: "Rodada",
    liveCenter: "Central ao Vivo",
    kickOff: "Início",
    resume: "Continuar",
    pause: "Pausar",
    instantResult: "Resultado Instantâneo",
    tactics: "Táticas",
    allFixtures: "Todos os Jogos",
    gamesToday: "Jogos de Hoje",
    globalCenter: "Central Global",
    matchMonitor: "Monitor de Partida",
    simulation: "Simulação",
    confirmResults: "Confirmar Resultados",
    played: "Jogados",
    noGoals: "Sem gols ainda",
    realTime: "Simulação em tempo real...",
    possession: "Posse de bola",
    balance: "Balanço do Jogo",
    goalLabel: "GOL!",
    yellowLabel: "AMARELO",
    redLabel: "VERMELHO",
    subLabel: "SUB"
  }
};

const TeamShield: React.FC<TeamShieldProps> = ({ team, className = "w-12 h-12" }) => {
  if (!team) return <div className={`${className} bg-slate-200 animate-pulse rounded-full`}></div>;
  const lowerName = team.name.toLowerCase();
  const isVasco = lowerName.includes("vaso") || lowerName.includes("vasco");
  const isGremio = lowerName.includes("grêmio") || lowerName.includes("gremio");
  const isBotCor = lowerName.includes("botafogo") || lowerName.includes("corinthians");
  const isFor = lowerName.includes("fortaleza");

  let shieldBg = team.primaryColor;
  let shieldText = team.secondaryColor || 'white';
  
  if (isGremio) { shieldBg = '#87CEEB'; shieldText = 'black'; }
  else if (isBotCor || isVasco) { shieldBg = 'black'; shieldText = 'white'; }
  else if (isFor) { shieldBg = '#1e40af'; shieldText = 'white'; }
  
  return (
    <div className={`${className} relative flex items-center justify-center rounded-full overflow-hidden transition-transform hover:scale-105`}>
      {team.logoUrl ? (
        <img src={team.logoUrl} alt={team.name} className="w-full h-full object-contain" />
      ) : isVasco ? (
         <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'black' }}>
            <div className="absolute bg-white transition-all" style={{ width: `${team.kit?.diagonalWidth || 20}%`, height: '150%', transform: 'rotate(-45deg)', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }} />
            <span className="relative z-10 text-[10px] font-black" style={{ color: team.secondaryColor || 'red' }}>V</span>
         </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center rounded-full" style={{ backgroundColor: shieldBg }}>
           <span className="font-black text-xs uppercase" style={{ color: shieldText }}>{team.teamAbb}</span>
        </div>
      )}
    </div>
  );
};

export const getFixtureHTDuration = (fixture: Fixture | null) => {
  if (!fixture) return 45;
  const htAdded = getStoppageTime(fixture.events, 45);
  return 45 + htAdded;
};

export const getDisplayMinuteStr = (internalMinute: number, htDuration: number): string => {
  if (internalMinute <= 45) return `${internalMinute}`;
  if (internalMinute > 45 && internalMinute <= htDuration) return `45+${internalMinute - 45}`;
  
  const secondHalfMinute = internalMinute - htDuration;
  const regularSecondHalfMinute = 45 + secondHalfMinute;
  
  if (regularSecondHalfMinute <= 90) {
    return `${regularSecondHalfMinute}`;
  } else {
    return `90+${regularSecondHalfMinute - 90}`;
  }
};

const LiveMatchRow: React.FC<{ fixture: Fixture, home: Team | undefined, away: Team | undefined, isUserGame: boolean, players: Player[], compact?: boolean, hidePossession?: boolean, lang: Language }> = ({ fixture, home, away, isUserGame, players, compact, hidePossession, lang }) => {
  const latestEvent = fixture.events.length > 0 ? fixture.events[fixture.events.length - 1] : null;
  const isShowingFlash = latestEvent && (latestEvent.type === 'GOAL' || latestEvent.type === 'CARD') && (fixture.played || (fixture.events.length > 0 && latestEvent.minute === fixture.events[fixture.events.length-1].minute));
  const t = UI_TRANSLATIONS[lang];

  let flashData = null;
  if (isShowingFlash && latestEvent) {
    if (latestEvent.type === 'GOAL') flashData = { text: 'GOAL!', style: 'text-emerald-500' };
    if (latestEvent.type === 'CARD' && latestEvent.description.includes('🟥')) flashData = { text: 'RED CARD', style: 'text-rose-500' };
    else if (latestEvent.type === 'CARD' && latestEvent.description.includes('🟨')) flashData = { text: 'YELLOW', style: 'text-amber-500' };
  }

  let eventText: React.ReactNode = "";
  let eventColor = "text-emerald-500";
  
  const significantEvents = fixture.events.filter(e => ['GOAL', 'CARD', 'SUB', 'HALF_TIME', 'FULL_TIME'].includes(e.type));
  const latestSignificant = significantEvents.length > 0 ? significantEvents[significantEvents.length - 1] : null;

  if (latestSignificant) {
      const htDur = getFixtureHTDuration(fixture);
      const displayEventMinute = getDisplayMinuteStr(latestSignificant.minute, htDur);
      let icon = "⚽";
      const player = players.find(p => p.id === latestSignificant.playerId);
      const nameToShow = player ? player.name.split(' ').pop() : (latestSignificant.description.split(' ').shift() || "");

      if (latestSignificant.type === 'CARD') {
         const isRed = latestSignificant.description.includes('🟥');
         icon = isRed ? "🟥" : "🟨";
         eventColor = isRed ? "text-rose-500" : "text-amber-500";
      }
      if (latestSignificant.type === 'SUB') {
         icon = "🔄";
         eventColor = "text-blue-500";
      }

      if (latestSignificant.type === 'HALF_TIME') { eventText = "HT"; eventColor = "text-slate-800 dark:text-white"; }
      else if (latestSignificant.type === 'FULL_TIME') { eventText = "FT"; eventColor = "text-slate-800 dark:text-white"; }
      else {
        eventText = (
          <span className="flex items-center gap-2">
            <span className="text-[12px] font-black opacity-90 uppercase tracking-tighter truncate max-w-[130px]">{nameToShow}</span>
            <span className="text-xl leading-none">{icon}</span>
            <span>{displayEventMinute}'</span>
          </span>
        );
      }
  } else if (!fixture.played && fixture.events.length === 0) {
      eventText = t.noGoals.toUpperCase();
      eventColor = "text-slate-400 dark:text-slate-500";
  } else {
      eventText = ""; 
  }

  return (
    <div className={`flex flex-col relative border-b border-dashed border-slate-200 dark:border-slate-800 ${compact ? 'py-2' : 'py-4'} last:border-0 ${isUserGame ? 'bg-blue-50/50 dark:bg-blue-900/10 -mx-2 px-2 rounded' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 shrink-0 mr-4">
          <div className="flex items-center gap-2 w-20 justify-end">
             <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase truncate text-right">{home?.teamAbb}</span>
             <TeamShield team={home} className={compact ? 'w-8 h-10' : 'w-10 h-12'} />
          </div>
          <div className="flex flex-col gap-1 items-center shrink-0">
            <div className={`bg-slate-100 dark:bg-slate-800 ${compact ? 'px-2 py-1 text-sm' : 'px-3 py-1.5 rounded text-sm'} font-mono font-black text-slate-800 dark:text-white shadow-inner min-w-[65px] text-center`}>
              {fixture.homeScore ?? 0} : {fixture.awayScore ?? 0}
            </div>
          </div>
          <div className="flex items-center gap-2 w-20 justify-start">
             <TeamShield team={away} className={compact ? 'w-8 h-10' : 'w-10 h-12'} />
             <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase truncate text-left">{away?.teamAbb}</span>
          </div>
        </div>
        <div className={`flex-1 text-right pl-2 flex justify-end items-center gap-2 min-w-0 ${compact ? 'scale-95 origin-right' : ''}`}>
           {flashData && (
              <span className={`${compact ? 'text-[10px]' : 'text-lg'} font-black uppercase tracking-widest transform -rotate-12 whitespace-nowrap ${flashData.style}`} style={{ animation: 'pulse 0.4s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>{flashData.text}</span>
           )}
           <div className={`${compact ? 'text-[11px]' : 'text-sm'} font-black uppercase tracking-tight truncate flex items-center justify-end gap-1.5 ${eventColor}`}>
              {eventText}
           </div>
        </div>
      </div>
    </div>
  );
};

const MatchRoundView: React.FC<{ setView: (v: string) => void }> = ({ setView }) => {
  // Lembra que o jogo de hoje esta a ser visto na simulacao 2D: o Resume da aba Tactics volta para ca.
  React.useEffect(() => { try { localStorage.setItem('activeMatchView', 'TRAINING'); } catch (e) { /* sem armazenamento */ } }, []);
  const { gameState, teams, playMatchDay, pauseMatch, fixtures, advanceWeek, players, finishMatchDayInstant, updateSettings, motor3dProgresso } = useGame();
  const lang = gameState.language || 'EN';
  const t = UI_TRANSLATIONS[lang];
  
  const todaysFixtures = fixtures.filter(f => f.date === gameState.currentDate);
  const userMatch = todaysFixtures.find(f => f.homeTeamId === gameState.userTeamId || f.awayTeamId === gameState.userTeamId);
  const maxHTDuration = React.useMemo(() => {
    if (userMatch) return getFixtureHTDuration(userMatch);
    return todaysFixtures.reduce((max, f) => Math.max(max, getFixtureHTDuration(f)), 45);
  }, [todaysFixtures, userMatch]);
  
  const isFT = todaysFixtures.length > 0 && todaysFixtures.every(f => f.played || f.events.some(e => e.type === 'FULL_TIME'));
  const isHT = !isFT && todaysFixtures.length > 0 && todaysFixtures.every(f => f.played || f.events.some(e => e.type === 'HALF_TIME')) && !gameState.isProcessing && gameState.matchMinute === maxHTDuration;

  let displayMinute = gameState.matchMinute;
  let clockStatus = '';

  if (userMatch) {
      const ftEvent = userMatch.events.find(e => e.type === 'FULL_TIME');
      const htEvent = userMatch.events.find(e => e.type === 'HALF_TIME');
      
      if (ftEvent && displayMinute > ftEvent.minute) {
          displayMinute = ftEvent.minute;
      } else if (htEvent && displayMinute > htEvent.minute && gameState.matchMinute <= 45) {
          displayMinute = htEvent.minute;
      }
      
      if (ftEvent) clockStatus = 'FT';
      else if (htEvent && gameState.matchMinute <= 45) clockStatus = 'HT';
  } else {
      clockStatus = isFT ? 'FT' : (isHT ? 'HT' : '');
  }

  const displayGlobalMinute = getDisplayMinuteStr(displayMinute, maxHTDuration);
  const isUserMatchFinished = userMatch ? clockStatus === 'FT' : isFT;

  const [isNarrationOn, setIsNarrationOn] = React.useState(() => localStorage.getItem('fm_narration') !== 'off');

  // --- RED CARD AUTO-PAUSE TRIGGER ---
  React.useEffect(() => {
    const userMatch = todaysFixtures.find(f => f.homeTeamId === gameState.userTeamId || f.awayTeamId === gameState.userTeamId);
    if (userMatch && userMatch.events.length > 0) {
      const lastEvent = userMatch.events[userMatch.events.length - 1];
      if (lastEvent.type === 'CARD' && lastEvent.description.includes('🟥') && lastEvent.teamId === gameState.userTeamId) {
        if (gameState.isProcessing) {
            pauseMatch();
            setView('TACTICS');
        }
      }
    }
  }, [fixtures, gameState.matchMinute, gameState.userTeamId, gameState.isProcessing, setView, pauseMatch, todaysFixtures]);

  const getTeam = (id: string) => teams.find(t => t.id === id);

  const isColorLight = (hex: string) => {
    if (!hex || hex === 'transparent' || hex === 'white') return true;
    const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
    const r = parseInt(cleanHex.length === 3 ? cleanHex[0] + cleanHex[0] : cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.length === 3 ? cleanHex[1] + cleanHex[1] : cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.length === 3 ? cleanHex[2] + cleanHex[2] : cleanHex.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
  };

  // --- TEXT-TO-SPEECH FOR 1X SPEED ---
  const lastSpokenEventId = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!gameState.isProcessing || (gameState.simulationSpeed && gameState.simulationSpeed !== 1) || !isNarrationOn) {
      if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          (window as any).isNarrationPlaying = false;
      }
      return;
    }

    const userMatch = todaysFixtures.find(f => f.homeTeamId === gameState.userTeamId || f.awayTeamId === gameState.userTeamId);
    if (!userMatch || userMatch.events.length === 0) return;

    const lastEvent = userMatch.events[userMatch.events.length - 1];
    const eventId = `${lastEvent.minute}-${lastEvent.type}-${lastEvent.description}`;

    if (eventId !== lastSpokenEventId.current) {
      lastSpokenEventId.current = eventId;

      if ('speechSynthesis' in window) {
        if (['COMMENT', 'GOAL', 'CARD', 'MISS', 'MISS_PENALTY', 'SAVE', 'INJURY'].includes(lastEvent.type)) {
            window.speechSynthesis.cancel(); 
            
            let textToSpeak = lastEvent.description;
            // Clean up emojis from text
            textToSpeak = textToSpeak.replace(/[\u{1F300}-\u{1F9FF}]/gu, '');
            textToSpeak = textToSpeak.replace(/🔻/g, '').replace(/🔼/g, '');

            if (lastEvent.type === 'GOAL') {
                textToSpeak = lang === 'PT' ? 'Gooooooooooool! ' + textToSpeak : 'Gooooooal! ' + textToSpeak;
            }

            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            const voices = window.speechSynthesis.getVoices();
            const preferredLang = lang === 'PT' ? 'pt' : 'en';
            
            // Tenta achar uma voz masculina usando nomes e identificadores comuns no Windows/macOS/Chrome
            let maleVoice = voices.find(v => 
                v.lang.toLowerCase().includes(preferredLang) && 
                /(male|daniel|antonio|thiago|felipe|david|james|guy|homem)/i.test(v.name)
            );
            
            // Fallback para a primeira voz do idioma caso não encontre uma especificamente masculina
            const voice = maleVoice || voices.find(v => v.lang.toLowerCase().includes(preferredLang));
            if (voice) utterance.voice = voice;
            
            utterance.rate = 1.05; 
            utterance.pitch = 1.0;

            utterance.onstart = () => {
                (window as any).isNarrationPlaying = true;
            };
            utterance.onend = () => {
                (window as any).isNarrationPlaying = false;
            };
            utterance.onerror = () => {
                (window as any).isNarrationPlaying = false;
            };

            window.speechSynthesis.speak(utterance);
        }
      }
    }
  }, [gameState.isProcessing, gameState.simulationSpeed, todaysFixtures, gameState.userTeamId, lang, isNarrationOn]);

  React.useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          (window as any).isNarrationPlaying = false;
      }
    };
  }, []);

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in overflow-hidden">
      <div className="bg-white dark:bg-slate-900 rounded-3xl py-5 px-8 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center relative overflow-hidden flex-shrink-0">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <span className="text-[86px] font-black italic uppercase">{t.simulation}</span>
        </div>
        <div className="text-blue-500 font-black text-[10px] uppercase tracking-[0.4em] mb-2 italic">{t.round} {gameState.currentWeek} • {t.liveCenter}</div>
        <div className="flex items-center gap-8">
          <div className={`text-6xl font-black italic tracking-tighter px-8 py-3 rounded-3xl border-4 transition-all ${gameState.isProcessing ? 'bg-blue-600 text-white animate-pulse border-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
            {displayGlobalMinute}' {clockStatus}
          </div>
          <div className="flex flex-col gap-2">
             <div className="flex gap-2">
                {motor3dProgresso !== null && (
                  <div className="flex flex-col gap-1 min-w-[260px]">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Simulador 3D decidindo a partida… {Math.min(100, Math.round(motor3dProgresso / 90 * 100))}%</div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: Math.min(100, motor3dProgresso / 90 * 100) + "%" }} /></div>
                  </div>
                )}
                {motor3dProgresso === null && !gameState.isProcessing && !isUserMatchFinished && (
                  <button onClick={playMatchDay} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-3 rounded-xl text-lg uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center gap-2 border-b-4 border-emerald-800">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    {gameState.matchMinute === 0 ? t.kickOff : t.resume}
                  </button>
                )}
                {gameState.isProcessing && !isUserMatchFinished && (
                  <button onClick={pauseMatch} className="bg-amber-600 hover:bg-amber-500 text-white font-black px-8 py-3 rounded-xl text-lg uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center gap-2 border-b-4 border-amber-800">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                    {t.pause}
                  </button>
                )}
                {isUserMatchFinished && (
                  <button 
                    disabled={!isFT || gameState.isProcessing}
                    onClick={() => { advanceWeek(); setView('DASHBOARD'); }} 
                    className={`font-black px-8 py-3 rounded-xl text-lg uppercase tracking-widest transition-all shadow-xl border-b-4 flex items-center justify-center ${isFT && !gameState.isProcessing ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-950 active:scale-95' : 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-600 border-slate-400 dark:border-slate-900 cursor-not-allowed'}`}>
                    {(!isFT || gameState.isProcessing) && (
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-slate-500 dark:text-slate-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {t.confirmResults}
                  </button>
                )}
             </div>
             {!isFT && (
                <div className="flex gap-2">
                  <button onClick={() => updateSettings({ simulationSpeed: 1 })} className={`flex-1 py-1 rounded-lg text-xs font-black transition-all ${gameState.simulationSpeed === 1 || !gameState.simulationSpeed ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-700'}`}>1x</button>
                  <button onClick={() => updateSettings({ simulationSpeed: 2 })} className={`flex-1 py-1 rounded-lg text-xs font-black transition-all ${gameState.simulationSpeed === 2 ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-700'}`}>2x</button>
                  <button onClick={() => updateSettings({ simulationSpeed: 3 })} className={`flex-1 py-1 rounded-lg text-xs font-black transition-all ${gameState.simulationSpeed === 3 ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-700'}`}>3x</button>
                  <button 
                     onClick={() => {
                         const val = !isNarrationOn;
                         setIsNarrationOn(val);
                         localStorage.setItem('fm_narration', val ? 'on' : 'off');
                         if (!val) {
                             if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                             (window as any).isNarrationPlaying = false;
                         }
                     }} 
                     className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${isNarrationOn ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-700'}`} 
                     title={isNarrationOn ? "Desativar Narração" : "Ativar Narração"}
                  >
                      {isNarrationOn ? '🔊' : '🔈'}
                  </button>
                </div>
             )}
             {!isFT && (
                <button onClick={finishMatchDayInstant} className="bg-purple-600 hover:bg-purple-500 text-white font-black py-1.5 rounded-lg text-xs uppercase tracking-widest transition-all hover:shadow-lg border-b-4 border-purple-800 active:border-b-0 active:translate-y-[2px]">
                  {t.instantResult}
                </button>
             )}
             <button onClick={() => { if (gameState.isProcessing) pauseMatch(); setView('TACTICS'); }} className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black py-1.5 rounded-lg text-xs uppercase tracking-widest transition-all hover:bg-slate-300 dark:hover:bg-slate-700">
               {t.tactics}
             </button>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col min-h-0">
        <div className="bg-slate-50 dark:bg-slate-950/60 px-8 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center transition-colors">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest italic">{t.allFixtures}</h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{todaysFixtures.length} {t.gamesToday}</span>
        </div>
        
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
          <div className="lg:col-span-6 bg-slate-50 dark:bg-slate-900/40 border-r border-slate-200 dark:border-slate-800 pt-2 px-8 pb-4 flex flex-col min-h-0 relative">
             <div className="bg-white dark:bg-slate-800/80 rounded-2xl shadow-lg border border-blue-500/10 mb-1 overflow-hidden transition-all duration-500 relative z-10">
                <div className="bg-blue-600/5 px-4 py-2 border-b border-blue-500/10 flex items-center justify-between">
                   <span className="flex items-center gap-2">
                     <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                     <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest italic">{t.matchMonitor}</span>
                   </span>
                </div>
                <div className="p-2">
                   {todaysFixtures.filter(f => f.homeTeamId === gameState.userTeamId || f.awayTeamId === gameState.userTeamId).map(fixture => (
                     <LiveMatchRow key={fixture.id} fixture={fixture} home={getTeam(fixture.homeTeamId)} away={getTeam(fixture.awayTeamId)} isUserGame={true} players={players} compact={true} hidePossession={true} lang={lang} />
                   ))}
                </div>
             </div>

             {todaysFixtures.filter(f => f.homeTeamId === gameState.userTeamId || f.awayTeamId === gameState.userTeamId).map(fixture => {
                const userMatch = fixture;
                const currentEvents = fixture.events;
                const lastComment = currentEvents.filter(e => e.type === 'COMMENT').pop();
                const displayEvents = [...currentEvents]
                   .filter(e => ['GOAL', 'CARD', 'SUB', 'MISS_PENALTY', 'INJURY', 'TACTICS', 'HALF_TIME', 'FULL_TIME', 'MISS', 'SAVE'].includes(e.type))
                   .reverse();

                return (
                   <React.Fragment key={`match-col-${fixture.id}`}>
                      {/* BARRA DE NARRAÇÃO */}
                      <div className="bg-slate-900 text-emerald-400 mx-2 mb-2 p-3 rounded-xl border-l-4 border-emerald-500 shadow-md text-sm font-black flex items-center gap-3 italic tracking-wide">
                          <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-xs animate-pulse">🔴 AO VIVO</span>
                          <span className="truncate">{lastComment ? `${getDisplayMinuteStr(lastComment.minute, getFixtureHTDuration(userMatch))}' - ${lastComment.description}` : 'Aguardando o apito inicial...'}</span>
                      </div>

                      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-2 relative z-10 w-full h-full">
                          {isFT && (() => {
                               const hGoals = currentEvents.filter(ev => ev.teamId === fixture.homeTeamId && ev.type === 'GOAL').length;
                               const aGoals = currentEvents.filter(ev => ev.teamId === fixture.awayTeamId && ev.type === 'GOAL').length;
                               const hShots = currentEvents.filter(ev => ev.teamId === fixture.homeTeamId && ['GOAL', 'MISS', 'MISS_PENALTY'].includes(ev.type)).length;
                               const aShots = currentEvents.filter(ev => ev.teamId === fixture.awayTeamId && ['GOAL', 'MISS', 'MISS_PENALTY'].includes(ev.type)).length;
                               const hFouls = currentEvents.filter(ev => ev.teamId === fixture.homeTeamId && ev.type === 'FOUL').length;
                               const aFouls = currentEvents.filter(ev => ev.teamId === fixture.awayTeamId && ev.type === 'FOUL').length;
                               const hCorners = currentEvents.filter(ev => ev.teamId === fixture.homeTeamId && ev.type === 'CORNER').length;
                               const aCorners = currentEvents.filter(ev => ev.teamId === fixture.awayTeamId && ev.type === 'CORNER').length;
                               const hYellows = currentEvents.filter(ev => ev.teamId === fixture.homeTeamId && ev.type === 'CARD' && ev.description.includes('🟨')).length;
                               const aYellows = currentEvents.filter(ev => ev.teamId === fixture.awayTeamId && ev.type === 'CARD' && ev.description.includes('🟨')).length;
                               const hReds = currentEvents.filter(ev => ev.teamId === fixture.homeTeamId && ev.type === 'CARD' && ev.description.includes('🟥')).length;
                               const aReds = currentEvents.filter(ev => ev.teamId === fixture.awayTeamId && ev.type === 'CARD' && ev.description.includes('🟥')).length;
                               
                               const posTime = fixture.possessionTimeline || [];
                               const hPosVal = posTime.length > 0 ? Math.round((posTime.filter(p => p === 'home').length / posTime.length) * 100) : 50;
                               const aPosVal = 100 - hPosVal;
                               
                               const basePasses = 850;
                               const hPasses = Math.floor(basePasses * (hPosVal / 100)) + hShots * 2;
                               const aPasses = Math.floor(basePasses * (aPosVal / 100)) + aShots * 2;
                               
                               let playerRatings: Record<string, number> = {};
                               const hTeam = getTeam(fixture.homeTeamId);
                               const aTeam = getTeam(fixture.awayTeamId);
                               if (hTeam && aTeam) {
                                   playerRatings = fixture.playerRatings || calculateMatchRatings(currentEvents, hTeam, aTeam, hGoals, aGoals, fixture.homeLineup, fixture.awayLineup, players);
                               }

                               return (
                                   <div className="bg-slate-100 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 my-3 shadow-sm text-center">
                                      <h4 className="font-black text-[10px] uppercase mb-4 text-slate-500 tracking-widest">Full Time Stats</h4>
                                      <div className="flex justify-between text-xs font-black text-slate-700 dark:text-slate-300 px-6">
                                         <div className="text-right w-1/3 space-y-2">
                                            <div>{hGoals}</div>
                                            <div>{hPosVal}%</div>
                                            <div>{hShots}</div>
                                            <div>{hPasses}</div>
                                            <div>{hCorners}</div>
                                            <div>{hFouls}</div>
                                            <div>{hYellows}</div>
                                            <div>{hReds}</div>
                                         </div>
                                         <div className="text-center w-1/3 text-slate-400 space-y-2 text-[10px] uppercase tracking-widest opacity-80">
                                            <div>Gols</div>
                                            <div>Posse de Bola</div>
                                            <div>Chutes</div>
                                            <div>Passes</div>
                                            <div>Escanteios</div>
                                            <div>Faltas</div>
                                            <div>CA</div>
                                            <div>CV</div>
                                         </div>
                                         <div className="text-left w-1/3 space-y-2">
                                            <div>{aGoals}</div>
                                            <div>{aPosVal}%</div>
                                            <div>{aShots}</div>
                                            <div>{aPasses}</div>
                                            <div>{aCorners}</div>
                                            <div>{aFouls}</div>
                                            <div>{aYellows}</div>
                                            <div>{aReds}</div>
                                         </div>
                                      </div>
                                      {Object.keys(playerRatings).length > 0 && (
                                          <div className="mt-6 border-t border-slate-200 dark:border-slate-700/50 pt-5">
                                              <h4 className="font-black text-[10px] uppercase mb-4 text-slate-500 tracking-widest">Notas dos Jogadores</h4>
                                              <div className="flex justify-between gap-2 sm:gap-6">
                                                  <div className="w-1/2 space-y-1">
                                                      {Object.entries(playerRatings).filter(([id]) => {
                                                          const p = players.find(x => x.id === id);
                                                          return p && p.teamId === fixture.homeTeamId;
                                                      }).map(([id, rating]) => {
                                                          const p = players.find(x => x.id === id);
                                                          return (
                                                              <div key={id} className="flex justify-between items-center text-[10px] bg-slate-200/50 dark:bg-slate-900/50 px-2 py-1.5 rounded-lg">
                                                                  <span className="font-bold text-slate-600 dark:text-slate-400 truncate text-left w-3/4">{p?.name.split(' ').pop()}</span>
                                                                  <span className={`font-black ${(rating as number) >= 7.5 ? 'text-emerald-500' : (rating as number) <= 5.5 ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'}`}>{(rating as number).toFixed(1)}</span>
                                                              </div>
                                                          )
                                                      }).slice(0, 11)}
                                                  </div>
                                                  <div className="w-1/2 space-y-1">
                                                      {Object.entries(playerRatings).filter(([id]) => {
                                                          const p = players.find(x => x.id === id);
                                                          return p && p.teamId === fixture.awayTeamId;
                                                      }).map(([id, rating]) => {
                                                          const p = players.find(x => x.id === id);
                                                          return (
                                                              <div key={id} className="flex justify-between items-center text-[10px] bg-slate-200/50 dark:bg-slate-900/50 px-2 py-1.5 rounded-lg flex-row-reverse">
                                                                  <span className="font-bold text-slate-600 dark:text-slate-400 truncate text-right w-3/4">{p?.name.split(' ').pop()}</span>
                                                                  <span className={`font-black ${(rating as number) >= 7.5 ? 'text-emerald-500' : (rating as number) <= 5.5 ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'}`}>{(rating as number).toFixed(1)}</span>
                                                              </div>
                                                          )
                                                      }).slice(0, 11)}
                                                  </div>
                                              </div>
                                          </div>
                                      )}
                                   </div>
                               );
                          })()}
                         {displayEvents.length === 0 && (
                            <div className="text-center text-slate-400 font-bold italic mt-10 opacity-50 uppercase text-xs">Waiting for events...</div>
                         )}
                      {displayEvents.map((e, idx) => {
                          if (e.type === 'HALF_TIME') {
                              const eventsSoFar = currentEvents.filter(ev => ev.minute <= e.minute);
                              const hGoals = eventsSoFar.filter(ev => ev.teamId === fixture.homeTeamId && ev.type === 'GOAL').length;
                              const aGoals = eventsSoFar.filter(ev => ev.teamId === fixture.awayTeamId && ev.type === 'GOAL').length;
                              const hShots = eventsSoFar.filter(ev => ev.teamId === fixture.homeTeamId && ev.type === 'GOAL').length + eventsSoFar.filter(ev => ev.teamId === fixture.homeTeamId && (ev.type === 'MISS' || ev.type === 'MISS_PENALTY')).length;
                              const aShots = eventsSoFar.filter(ev => ev.teamId === fixture.awayTeamId && ev.type === 'GOAL').length + eventsSoFar.filter(ev => ev.teamId === fixture.awayTeamId && (ev.type === 'MISS' || ev.type === 'MISS_PENALTY')).length;
                              const hFouls = eventsSoFar.filter(ev => ev.teamId === fixture.homeTeamId && ev.type === 'FOUL').length;
                              const aFouls = eventsSoFar.filter(ev => ev.teamId === fixture.awayTeamId && ev.type === 'FOUL').length;
                              const hCorners = eventsSoFar.filter(ev => ev.teamId === fixture.homeTeamId && ev.type === 'CORNER').length;
                              const aCorners = eventsSoFar.filter(ev => ev.teamId === fixture.awayTeamId && ev.type === 'CORNER').length;
                              const hYellows = eventsSoFar.filter(ev => ev.teamId === fixture.homeTeamId && ev.type === 'CARD' && ev.description.includes('🟨')).length;
                              const aYellows = eventsSoFar.filter(ev => ev.teamId === fixture.awayTeamId && ev.type === 'CARD' && ev.description.includes('🟨')).length;
                              const hReds = eventsSoFar.filter(ev => ev.teamId === fixture.homeTeamId && ev.type === 'CARD' && ev.description.includes('🟥')).length;
                              const aReds = eventsSoFar.filter(ev => ev.teamId === fixture.awayTeamId && ev.type === 'CARD' && ev.description.includes('🟥')).length;
                              const posTime = fixture.possessionTimeline?.slice(0, e.minute) || [];
                              const hPosVal = posTime.length > 0 ? Math.round((posTime.filter(p => p === 'home').length / posTime.length) * 100) : 50;
                              const aPosVal = 100 - hPosVal;
                              
                              const basePasses = 425;
                              const hPasses = Math.floor(basePasses * (hPosVal / 100)) + hShots * 2;
                              const aPasses = Math.floor(basePasses * (aPosVal / 100)) + aShots * 2;
                              
                              return (
                                 <div key={`stat-${e.minute}-${idx}`} className="bg-slate-100 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 my-3 shadow-sm text-center">
                                    <h4 className="font-black text-[10px] uppercase mb-4 text-slate-500 tracking-widest">Half Time Stats</h4>
                                    <div className="flex justify-between text-xs font-black text-slate-700 dark:text-slate-300 px-6">
                                       <div className="text-right w-1/3 space-y-2">
                                          <div>{hGoals}</div>
                                          <div>{hPosVal}%</div>
                                          <div>{hShots}</div>
                                          <div>{hPasses}</div>
                                          <div>{hCorners}</div>
                                          <div>{hFouls}</div>
                                          <div>{hYellows}</div>
                                          <div>{hReds}</div>
                                       </div>
                                       <div className="text-center w-1/3 text-slate-400 space-y-2 text-[10px] uppercase tracking-widest opacity-80">
                                          <div>Gols</div>
                                          <div>Posse de Bola</div>
                                          <div>Chutes</div>
                                          <div>Passes</div>
                                          <div>Escanteios</div>
                                          <div>Faltas</div>
                                          <div>CA</div>
                                          <div>CV</div>
                                       </div>
                                       <div className="text-left w-1/3 space-y-2">
                                          <div>{aGoals}</div>
                                          <div>{aPosVal}%</div>
                                          <div>{aShots}</div>
                                          <div>{aPasses}</div>
                                          <div>{aCorners}</div>
                                          <div>{aFouls}</div>
                                          <div>{aYellows}</div>
                                          <div>{aReds}</div>
                                       </div>
                                    </div>

                                 </div>
                              );
                          }

                          const team = getTeam(e.teamId || '');
                          const p = players.find(pl => pl.id === e.playerId);
                          const pName = p ? p.name.split(' ').pop() : '';
                          let icon: React.ReactNode = '💬';
                          let color = 'text-slate-600 dark:text-slate-400';
                          if (e.type === 'GOAL') { icon = '⚽'; color = 'text-emerald-600 dark:text-emerald-400 font-bold'; }
                          if (e.type === 'CARD' && e.description.includes('🟥')) { icon = '🟥'; color = 'text-rose-600 dark:text-rose-400 font-bold'; }
                          if (e.type === 'CARD' && e.description.includes('🟨')) { icon = '🟨'; color = 'text-amber-600 dark:text-amber-400 font-bold'; }
                          if (e.type === 'SUB') { 
                              icon = <svg className="animate-spin text-blue-500 w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>; 
                              color = 'text-blue-500'; 
                          }
                          if (e.type === 'TACTICS') { icon = '🧠'; color = 'text-indigo-600 dark:text-indigo-400 font-bold italic'; }
                          if (e.type === 'MISS_PENALTY') { icon = '❌'; color = 'text-rose-500'; }
                          if (e.type === 'INJURY') { 
                              icon = '✚'; 
                              const severity = e.injurySeverity || 'LIGHT';
                              if (severity === 'SEVERE' || severity === 'GRAVE') {
                                  color = 'text-rose-600 font-bold';
                              } else if (severity === 'MEDIUM' || severity === 'MÉDIA') {
                                  color = 'text-amber-500 font-bold';
                              } else {
                                  color = 'text-emerald-500 font-bold';
                              }
                          }
                          if (e.type === 'MISS') { icon = '💨'; color = 'text-slate-400'; }
                          if (e.type === 'SAVE') { icon = '🧤'; color = 'text-blue-600 dark:text-blue-400 font-bold'; }

                          const isAway = e.teamId === fixture.awayTeamId;
                          const htDur = getFixtureHTDuration(fixture);

                          const lowerName = team?.name.toLowerCase() || '';
                          const isGremioEvent = lowerName.includes("grêmio") || lowerName.includes("gremio");
                          const isVascoEvent = lowerName.includes("vasco") || lowerName.includes("vaso");
                          const isBotCorEvent = lowerName.includes("botafogo") || lowerName.includes("corinthians");
                          const isForEvent = lowerName.includes("fortaleza");
                          
                          let tagBgColor = team?.primaryColor;
                          let tagTextColorClass = 'text-white';
                          
                          if (isGremioEvent) { tagBgColor = '#87CEEB'; tagTextColorClass = 'text-black'; }
                          else if (isVascoEvent || isBotCorEvent) { tagBgColor = 'black'; tagTextColorClass = 'text-white'; }
                          else if (isForEvent) { tagBgColor = '#1e40af'; tagTextColorClass = 'text-white'; }

                          return (
                              <div key={`ev-${e.minute}-${idx}`} className={`w-full flex ${isAway ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex items-start gap-3 p-2.5 rounded-lg bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:-translate-y-0.5 w-[85%] sm:w-[75%] ${color} ${isAway ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}>
                                   <div className={`w-8 shrink-0 font-black text-xs opacity-60 mt-0.5 ${isAway ? 'text-left' : 'text-right'}`}>{getDisplayMinuteStr(e.minute, htDur)}'</div>
                                   <div className="text-sm mt-0.5 leading-none">{icon}</div>
                                   <div className="flex-1 text-xs tracking-tight leading-snug">
                                       {!isAway && team && <span className={`font-black uppercase mr-2 text-[9px] tracking-wider px-1.5 py-0.5 rounded-sm shadow-sm ${tagTextColorClass}`} style={{backgroundColor: tagBgColor}}>{team.teamAbb}</span>}
                                       {e.type !== 'SUB' && pName && <span className={`font-bold ${isAway ? 'ml-1' : 'mr-1'}`}>{pName}</span>}
                                       <span className="opacity-90">
                                           {e.description.replace(e.type !== 'SUB' && pName ? pName : '', '').split(/(🔻|🔼)/g).map((part, i) => {
                                               if (part === '🔻') return <span key={i} className="text-red-500 text-[1.8em] leading-[0] align-middle px-0.5">▼</span>;
                                               if (part === '🔼') return <span key={i} className="text-emerald-500 text-[1.8em] leading-[0] align-middle px-0.5">▲</span>;
                                               return <span key={i}>{part}</span>;
                                           })}
                                       </span>
                                       {isAway && team && <span className={`font-black uppercase ml-2 text-[9px] tracking-wider px-1.5 py-0.5 rounded-sm shadow-sm ${tagTextColorClass}`} style={{backgroundColor: tagBgColor}}>{team.teamAbb}</span>}
                                    </div>
                                 </div>
                               </div>
                           );
                      })}
                    </div>
                   </React.Fragment>
                );
             })}
          </div>

          <div className="lg:col-span-6 flex flex-col h-full overflow-hidden">
            <div className="bg-slate-50/50 dark:bg-black/20 px-8 py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center transition-colors shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{t.globalCenter}</h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-0.5">
              <div className="grid grid-cols-1 gap-0.5">
                {todaysFixtures.filter(f => f.homeTeamId !== gameState.userTeamId && f.awayTeamId !== gameState.userTeamId).map(fixture => (
                  <LiveMatchRow key={fixture.id} fixture={fixture} home={getTeam(fixture.homeTeamId)} away={getTeam(fixture.awayTeamId)} isUserGame={false} players={players} compact={true} hidePossession={true} lang={lang} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default MatchRoundView;