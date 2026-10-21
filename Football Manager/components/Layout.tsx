
import React from 'react';
import { useGame } from '../context/GameContext';
import { ThemeMode, Team } from '../types';
import { TeamShield } from './TeamShield';

const IconDashboard = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>;
const IconUsers = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const IconCalendar = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const IconTrophy = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>;
const IconTactics = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h20"></path><path d="M5 20v-5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5"></path><path d="M12 10V4"></path><path d="M12 4L8 8"></path><path d="M12 4l4 4"></path></svg>;
const IconFinance = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const IconStatistics = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>;
const IconTraining = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v4"></path><path d="M12 16h.01"></path><path d="M8.5 8.5l7 7"></path></svg>;
const IconBall = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M6.7 6.7l10.6 10.6"></path><path d="M6.7 17.3l10.6-10.6"></path></svg>;
const IconField = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v18H3z"/><path d="M3 12h18"/><circle cx="12" cy="12" r="3"/></svg>;
const IconWorld = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>;
const IconSettings = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;

interface Props {
  children: React.ReactNode;
  setView: (view: any) => void;
  currentView: string;
}

const Layout: React.FC<Props> = ({ children, setView, currentView }) => {
  const { gameState, userTeam, saveGame, importGameData, fixtures, pauseMatch, advanceDay, t } = useGame();
  const loadInputRef = React.useRef<HTMLInputElement>(null);
  // LOAD GAME: escolhe o ficheiro .json do Save Game e carrega-o (o mesmo importGameData do ecra inicial).
  const carregarJogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ficheiro = e.target.files && e.target.files[0];
    if (!ficheiro) return;
    const leitor = new FileReader();
    leitor.onload = () => { if (!importGameData(String(leitor.result))) alert('Save file invalid.'); };
    leitor.readAsText(ficheiro);
    e.target.value = '';
  };
  const [isSimulating, setIsSimulating] = React.useState(false);

  const isMatchDay = fixtures.some(f => f.date === gameState.currentDate && (f.homeTeamId === userTeam?.id || f.awayTeamId === userTeam?.id));
  const activeMatchView = typeof window !== 'undefined' ? localStorage.getItem('activeMatchView') : null;

  // Auto-simulation dia-a-dia
  React.useEffect(() => {
    let timer: any;
    if (isSimulating && !isMatchDay) {
      timer = setTimeout(() => {
        advanceDay();
      }, 600); // 600ms por dia para o usuário conseguir ver a data mudando
    } else if (isMatchDay) {
      setIsSimulating(false);
    }
    return () => clearTimeout(timer);
  }, [isSimulating, isMatchDay, advanceDay]);

  const handleContinue = () => {
    if (isMatchDay) {
      // Se já é dia de jogo, vai para a tela de simulação
      const view = localStorage.getItem('activeMatchView') || 'TRAINING';
      handleNavClick(view);
    } else {
      setIsSimulating(true);
    }
  };

  const navItemClass = (viewName: string) => {
    const isActive = currentView === viewName;
    return `flex items-center gap-3 px-4 py-3 rounded transition-all cursor-pointer font-black uppercase text-[10px] tracking-[0.15em] border border-transparent shadow-sm ${
      isActive 
        ? 'bg-blue-600 text-white shadow-blue-500/30 ring-1 ring-blue-400' 
        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-900'
    }`;
  };

  const handleNavClick = (view: string) => {
    if (view === 'TACTICS' && gameState.isProcessing) {
      pauseMatch();
    }
    setView(view);
  };

  return (
    <div className="flex h-full w-full bg-slate-50 dark:bg-manager-bg text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-300">
      <aside className="w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-900 flex flex-col shadow-2xl z-50 transition-colors duration-300">
        <div className="p-6 border-b border-slate-200 dark:border-slate-900">
          <div className="text-2xl font-black text-slate-900 dark:text-white italic tracking-tighter flex items-center gap-2">
            <span className="text-blue-500">FOOT</span>MANAGER
          </div>
          {userTeam && (
            <div className="mt-4 flex items-center gap-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded border border-slate-200 dark:border-slate-800 transition-colors">
              <TeamShield team={userTeam} className="w-12 h-14" />
              <div className="min-w-0">
                <div className="text-[13px] font-black text-slate-800 dark:text-white uppercase truncate">{userTeam.name}</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest">{userTeam.strength} OVR</div>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          <div onClick={() => handleNavClick('DASHBOARD')} className={navItemClass('DASHBOARD')}>
            <IconDashboard /> <span>{t('nav_home')}</span>
          </div>
          
          {isMatchDay && (
            <>
              {(gameState.matchMinute === 0 || activeMatchView === 'TRAINING') && (
                <div onClick={() => { localStorage.setItem('activeMatchView', 'TRAINING'); handleNavClick('TRAINING'); }} className={navItemClass('TRAINING')}>
                  <IconBall /> <span>{gameState.matchMinute > 0 ? 'RESUME SIM' : t('nav_sim_round')}</span>
                </div>
              )}
              {(gameState.matchMinute === 0 || activeMatchView === 'MATCH') && (
                <div onClick={() => { localStorage.setItem('activeMatchView', 'MATCH'); handleNavClick('MATCH'); }} className={navItemClass('MATCH')}>
                  <IconField /> <span>{gameState.matchMinute > 0 ? 'RESUME MATCH' : t('nav_match_day')}</span>
                </div>
              )}
            </>
          )}

          <div onClick={() => handleNavClick('SQUAD')} className={navItemClass('SQUAD')}>
            <IconUsers /> <span>{t('nav_squad')}</span>
          </div>
          <div onClick={() => handleNavClick('TACTICS')} className={navItemClass('TACTICS')}>
            <IconTactics /> <span>{t('nav_tactics')}</span>
          </div>
          <div onClick={() => handleNavClick('TRAINING_VIEW')} className={navItemClass('TRAINING_VIEW')}>
            <IconTraining /> <span>{t('nav_training')}</span>
          </div>
          <div onClick={() => handleNavClick('FIXTURES')} className={navItemClass('FIXTURES')}>
            <IconCalendar /> <span>{t('nav_fixtures')}</span>
          </div>
          <div onClick={() => handleNavClick('LEAGUE')} className={navItemClass('LEAGUE')}>
            <IconTrophy /> <span>{t('nav_standings')}</span>
          </div>
          <div onClick={() => handleNavClick('FINANCES')} className={navItemClass('FINANCES')}>
            <IconFinance /> <span>{t('nav_finance')}</span>
          </div>
          <div onClick={() => handleNavClick('STATISTICS')} className={navItemClass('STATISTICS')}>
            <IconStatistics /> <span>{t('nav_statistics')}</span>
          </div>
          <div onClick={() => handleNavClick('SETTINGS')} className={navItemClass('SETTINGS')}>
            <IconSettings /> <span>{t('nav_settings')}</span>
          </div>
          <div onClick={() => handleNavClick('WORLD')} className={navItemClass('WORLD')}>
            <IconWorld /> <span>{t('nav_world')}</span>
          </div>
        </nav>

        <div className="p-6 border-t border-slate-200 dark:border-slate-900 flex flex-col gap-4 transition-colors">
            {/* No Dashboard em dia de jogo o botao JOGAR PARTIDA sai do painel da esquerda: o Dashboard tem o seu proprio botao do jogo do dia. */}
            {!(isMatchDay && currentView === 'DASHBOARD') && (
            <button 
              onClick={handleContinue}
              className={`w-full font-black py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 text-sm tracking-widest uppercase active:scale-95 border-b-4 ${isMatchDay ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20 border-emerald-800' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 border-blue-800'}`}
            >
              {isSimulating ? 'SIMULANDO...' : (isMatchDay ? 'JOGAR PARTIDA' : 'CONTINUAR')}
            </button>
            )}

           <div className="bg-slate-100 dark:bg-slate-900/40 rounded-lg p-4 text-center border border-slate-200 dark:border-slate-800 shadow-inner">
             <div className="text-[11px] text-slate-800 dark:text-white uppercase font-black tracking-tight italic mb-2">Match Week</div>
             <div className="text-4xl font-black text-blue-600 dark:text-blue-500 leading-none italic tracking-tighter">
               {gameState.currentWeek} 
               <span className="text-slate-400 dark:text-slate-800 text-sm ml-1 not-italic">/ {gameState.totalWeeks}</span>
             </div>
             <div className="mt-3 text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-widest border-t border-slate-200 dark:border-slate-800 pt-2 transition-colors">
               {new Date(gameState.currentDate + 'T12:00:00').toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
             </div>
           </div>
           
           <button 
             onClick={saveGame}
             className="w-full bg-slate-800 dark:bg-slate-800 hover:bg-slate-700 text-white font-black py-2.5 rounded border border-slate-700 dark:border-slate-700 hover:border-blue-400 transition-all flex items-center justify-center gap-2 text-[10px] tracking-widest uppercase group"
           >
             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:animate-pulse"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
             {t('nav_save_game')}
           </button>

           <input ref={loadInputRef} type="file" accept=".json,application/json" className="hidden" onChange={carregarJogo} />
           <button
             onClick={() => loadInputRef.current?.click()}
             className="w-full bg-slate-800 dark:bg-slate-800 hover:bg-slate-700 text-white font-black py-2.5 rounded border border-slate-700 dark:border-slate-700 hover:border-blue-400 transition-all flex items-center justify-center gap-2 text-[10px] tracking-widest uppercase group"
           >
             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 5 17 10"></polyline><line x1="12" y1="5" x2="12" y2="15"></line></svg>
             LOAD GAME
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900/30 transition-colors duration-300">
        <div className={`flex-1 overflow-y-auto custom-scrollbar p-10 ${currentView === 'MATCH' ? 'pt-0' : ''}`}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
