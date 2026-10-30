
import { SetasAGirar } from './NextGameButton';
import React from 'react';
import { useGame } from '../context/GameContext';
import { ThemeMode, Team } from '../types';
import { TeamShield } from './TeamShield';

const IconDashboard = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>;
const IconMail = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>;
const IconTransfer = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3l4 4-4 4"/><path d="M21 7H7"/><path d="M7 21l-4-4 4-4"/><path d="M3 17h14"/></svg>;
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
  /** Volta ao menu inicial (botao MAIN MENU da barra da esquerda). */
  onMainMenu?: () => void;
}

const Layout: React.FC<Props> = ({ children, setView, currentView, onMainMenu }) => {
  const { gameState, userTeam, saveGame, importGameData, fixtures, pauseMatch, advanceDay, t, inbox, mercado } = useGame();
  const naoLidas = inbox.filter(m => !m.lida).length;
  // Negociacoes de transferencia que esperam resposta do treinador (oferta recebida ou contraproposta).
  const respostasPendentes = mercado.negociacoes.filter(n => (n.vendedorId === userTeam?.id && n.estado === 'RECEBIDA') || (n.compradorId === userTeam?.id && n.estado === 'CONTRAPROPOSTA')).length;
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
  const [confirmarMenu, setConfirmarMenu] = React.useState(false);   // modal proprio do MAIN MENU (no lugar do window.confirm)

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
    return `flex items-center justify-center xl:justify-start gap-3 px-2 xl:px-4 py-[9.5px] min-h-[44px] xl:min-h-0 rounded transition-all cursor-pointer font-black uppercase text-[10px] tracking-[0.15em] border border-transparent shadow-sm ${
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
      <aside className="w-[72px] xl:w-64 shrink-0 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-900 flex flex-col shadow-2xl z-50 transition-colors duration-300">
        <div className="p-2 xl:p-6 border-b border-slate-200 dark:border-slate-900">
          <div className="text-2xl font-black text-slate-900 dark:text-white italic tracking-tighter flex items-center justify-center xl:justify-start gap-2">
            <span className="text-blue-500">FOOT</span><span className="hidden xl:inline">MANAGER</span>
          </div>
          {userTeam && (
            // O mesmo padrao do cartao do clube da escolha de carreira (CareerStart): texto a esquerda e o escudo GRANDE a direita, cortado pela borda do cartao.
            <div className="mt-4 relative overflow-hidden h-[72px] hidden xl:flex flex-col justify-center pl-3 pr-[70px] bg-slate-50 dark:bg-slate-900/40 rounded border border-slate-200 dark:border-slate-800 transition-colors">
              <div className="absolute top-1/2 -translate-y-1/2 -right-[22px] w-[96px] h-[116px]"><TeamShield team={userTeam} className="w-full h-full" /></div>
              <div className="text-[13px] font-black text-slate-800 dark:text-white uppercase truncate">{userTeam.name}</div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest">{userTeam.strength} OVR</div>
            </div>
          )}
          {userTeam && <div className="xl:hidden mt-2 mx-auto w-9 h-11"><TeamShield team={userTeam} className="w-full h-full" /></div>}
        </div>

        <nav className="flex-1 p-2 xl:p-4 space-y-[3px] overflow-y-auto custom-scrollbar">
          <div onClick={() => handleNavClick('DASHBOARD')} className={navItemClass('DASHBOARD')}>
            <IconDashboard /> <span className="hidden xl:inline">{t('nav_home')}</span>
          </div>
          
          {isMatchDay && (
            <>
              {(gameState.matchMinute === 0 || activeMatchView === 'TRAINING') && (
                <div onClick={() => { localStorage.setItem('activeMatchView', 'TRAINING'); handleNavClick('TRAINING'); }} className={navItemClass('TRAINING')}>
                  <IconBall /> <span className="hidden xl:inline">{gameState.matchMinute > 0 ? 'RESUME SIM' : t('nav_sim_round')}</span>
                </div>
              )}
              {(gameState.matchMinute === 0 || activeMatchView === 'MATCH') && (
                <div onClick={() => { localStorage.setItem('activeMatchView', 'MATCH'); handleNavClick('MATCH'); }} className={navItemClass('MATCH')}>
                  <IconField /> <span className="hidden xl:inline">{gameState.matchMinute > 0 ? 'RESUME MATCH' : t('nav_match_day')}</span>
                </div>
              )}
            </>
          )}

          <div onClick={() => handleNavClick('INBOX')} className={navItemClass('INBOX')}>
            <IconMail /> <span className="hidden xl:inline flex-1">{t('nav_inbox')}</span>
            {naoLidas > 0 && <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-black flex items-center justify-center">{naoLidas > 99 ? '99+' : naoLidas}</span>}
          </div>

          <div onClick={() => handleNavClick('SQUAD')} className={navItemClass('SQUAD')}>
            <IconUsers /> <span className="hidden xl:inline">{t('nav_squad')}</span>
          </div>
          <div onClick={() => handleNavClick('TRANSFERS')} className={navItemClass('TRANSFERS')}>
            <IconTransfer /> <span className="hidden xl:inline flex-1">{t('nav_transfers')}</span>
            {respostasPendentes > 0 && <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-amber-500 text-white text-[11px] font-black flex items-center justify-center">{respostasPendentes}</span>}
          </div>
          <div onClick={() => handleNavClick('TACTICS')} className={navItemClass('TACTICS')}>
            <IconTactics /> <span className="hidden xl:inline">{t('nav_tactics')}</span>
          </div>
          <div onClick={() => handleNavClick('TRAINING_VIEW')} className={navItemClass('TRAINING_VIEW')}>
            <IconTraining /> <span className="hidden xl:inline">{t('nav_training')}</span>
          </div>
          <div onClick={() => handleNavClick('FIXTURES')} className={navItemClass('FIXTURES')}>
            <IconCalendar /> <span className="hidden xl:inline">{t('nav_fixtures')}</span>
          </div>
          <div onClick={() => handleNavClick('LEAGUE')} className={navItemClass('LEAGUE')}>
            <IconTrophy /> <span className="hidden xl:inline">{t('nav_standings')}</span>
          </div>
          <div onClick={() => handleNavClick('FINANCES')} className={navItemClass('FINANCES')}>
            <IconFinance /> <span className="hidden xl:inline">{t('nav_finance')}</span>
          </div>
          <div onClick={() => handleNavClick('STATISTICS')} className={navItemClass('STATISTICS')}>
            <IconStatistics /> <span className="hidden xl:inline">{t('nav_statistics')}</span>
          </div>
          <div onClick={() => handleNavClick('SETTINGS')} className={navItemClass('SETTINGS')}>
            <IconSettings /> <span className="hidden xl:inline">{t('nav_settings')}</span>
          </div>
          <div onClick={() => handleNavClick('WORLD')} className={navItemClass('WORLD')}>
            <IconWorld /> <span className="hidden xl:inline">{t('nav_world')}</span>
          </div>
        </nav>

        <div className="p-2 xl:p-6 border-t border-slate-200 dark:border-slate-900 flex flex-col gap-2 xl:gap-4 transition-colors">
            {/* No Dashboard em dia de jogo o botao JOGAR PARTIDA sai do painel da esquerda: o Dashboard tem o seu proprio botao do jogo do dia. */}
            {!(isMatchDay && currentView === 'DASHBOARD') && (
            <button 
              onClick={handleContinue}
              className={`w-full min-h-[44px] font-black py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 text-sm tracking-widest uppercase active:scale-95 border-b-4 ${isMatchDay ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20 border-emerald-800' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 border-blue-800'}`}
            >
              <span className="xl:hidden">▶</span><span className="hidden xl:inline">{isSimulating ? 'SIMULATING...' : (isMatchDay ? 'PLAY MATCH' : 'CONTINUE')}</span>
            </button>
            )}

           <div className="hidden xl:block bg-slate-100 dark:bg-slate-900/40 rounded-lg px-4 py-0 text-center border border-slate-200 dark:border-slate-800 shadow-inner">
             <div className="text-[11px] text-slate-800 dark:text-white uppercase font-black tracking-tight italic mb-[5px]">Match Week</div>
             <div className="text-4xl font-black text-blue-600 dark:text-blue-500 leading-none italic tracking-tighter">
               {gameState.currentWeek} 
               <span className="text-slate-400 dark:text-slate-800 text-sm ml-1 not-italic">/ {gameState.totalWeeks}</span>
             </div>
             <div className="mt-3 text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-widest border-t border-slate-200 dark:border-slate-800 pt-2 transition-colors">
               <span className="inline-flex items-center justify-center gap-1.5">{new Date(gameState.currentDate + 'T12:00:00').toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}<SetasAGirar className="w-3 h-3 text-blue-500" /></span>
             </div>
           </div>
           
           <button 
             onClick={saveGame}
             className="w-full bg-slate-800 dark:bg-slate-800 hover:bg-slate-700 text-white font-black min-h-[44px] xl:min-h-0 py-2.5 rounded border border-slate-700 dark:border-slate-700 hover:border-blue-400 transition-all flex items-center justify-center gap-2 text-[10px] tracking-widest uppercase group"
           >
             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:animate-pulse"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
             <span className="hidden xl:inline">{t('nav_save_game')}</span>
           </button>

           <input ref={loadInputRef} type="file" accept=".json,application/json" className="hidden" onChange={carregarJogo} />
           <button
             onClick={() => loadInputRef.current?.click()}
             className="w-full bg-slate-800 dark:bg-slate-800 hover:bg-slate-700 text-white font-black min-h-[44px] xl:min-h-0 py-2.5 rounded border border-slate-700 dark:border-slate-700 hover:border-blue-400 transition-all flex items-center justify-center gap-2 text-[10px] tracking-widest uppercase group"
           >
             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 5 17 10"></polyline><line x1="12" y1="5" x2="12" y2="15"></line></svg>
             <span className="hidden xl:inline">LOAD GAME</span>
           </button>

           <button
             onClick={() => setConfirmarMenu(true)}
             className="w-full bg-slate-800 dark:bg-slate-800 hover:bg-slate-700 text-white font-black min-h-[44px] xl:min-h-0 py-2.5 rounded border border-slate-700 dark:border-slate-700 hover:border-blue-400 transition-all flex items-center justify-center gap-2 text-[10px] tracking-widest uppercase group"
           >
             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
             <span className="hidden xl:inline">MAIN MENU</span>
           </button>
        </div>
      </aside>

      {confirmarMenu && (
        <div className="fixed inset-0 z-[330] bg-black/60 flex items-center justify-center p-6" onClick={() => setConfirmarMenu(false)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-6 w-[440px] max-w-[95vw] flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-700 dark:text-white">Return to main menu?</h3>
            <p className="text-[12px] text-slate-500 dark:text-slate-300 leading-snug">Progress since your last save will be lost.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmarMenu(false)} className="px-4 py-2 min-h-[44px] rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-slate-600">Cancel</button>
              <button autoFocus onClick={() => { setConfirmarMenu(false); onMainMenu?.(); }} className="px-4 py-2 min-h-[44px] rounded bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-500">Main menu</button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900/30 transition-colors duration-300">
        <div className={`flex-1 overflow-y-auto custom-scrollbar p-5 xl:p-10 ${currentView === 'MATCH' ? 'pt-0' : ''}`}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
