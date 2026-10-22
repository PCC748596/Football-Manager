
import React, { useState, useRef, useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import Layout from './components/Layout';
import SquadView from './components/SquadView';
import LeagueTable from './components/LeagueTable';
import TacticsView from './components/TacticsView';
import FixturesView from './components/FixturesView';
import FinancesView from './components/FinancesView';
import TrainingView from './components/TrainingView';
import DashboardView from './components/DashboardView';
import MatchDay from './components/MatchDay';
import MatchRoundView from './components/MatchRoundView';
import SettingsView from './components/SettingsView';
import WorldView from './components/WorldView';
import StatisticsView from './components/StatisticsView';
import { COUNTRIES, generateLeagueData } from './textSim/dataGenerator';
import { gruposDaSerieD } from './textSim/competitions';
import { Team, Player, GameState } from './types';
import { TeamShield } from './components/TeamShield';
import EditorApp from './components/EditorApp';

// -- Sub-components --

const StartMenu: React.FC<{ onNewGame: () => void, onContinue: () => void, onSettings: () => void, onEditor: () => void }> = ({ onNewGame, onContinue, onSettings, onEditor }) => {
  const { t } = useGame();
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 bg-black transition-colors duration-300 overflow-hidden relative">
       {/* Background: Just solid black or very dark slate as requested (removed football field image) */}
       <div className="absolute inset-0 bg-slate-950 z-0"></div>
       
       <div className="w-full max-w-sm space-y-12 flex flex-col items-center relative z-10">
          <div className="animate-fade-in flex flex-col items-start w-fit">
            <h1 className="text-7xl font-black text-white mb-0 tracking-tighter italic leading-none drop-shadow-2xl">
              FOOTMANAGER
            </h1>
            <p className="text-blue-500 text-[10px] tracking-[0.5em] font-black uppercase mt-1 drop-shadow-md">Ultimate Manager 2025</p>
          </div>

          <div className="grid grid-cols-1 gap-3 w-full max-w-[320px]">
            <button 
              onClick={onNewGame}
              className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xl py-4 px-8 rounded shadow-xl transition-all hover:scale-[1.02] active:scale-95 border-b-4 border-blue-800"
            >
              {t('start_new')}
            </button>
            <button 
              onClick={onContinue}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xl py-4 px-8 rounded transition-all border-b-4 border-emerald-800 hover:scale-[1.02] active:scale-95 shadow-lg"
            >
              {t('start_continue')}
            </button>
            <button onClick={onEditor} className="bg-slate-900/80 backdrop-blur-sm text-slate-600 hover:text-white font-bold text-lg py-3 px-8 rounded border border-slate-800 hover:bg-slate-800 transition-all">{t('start_editor')}</button>
            <button 
              onClick={onSettings}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-lg py-3 px-8 rounded transition-all border-b-4 border-slate-900 shadow-sm"
            >
              {t('start_settings')}
            </button>
          </div>

          <div className="text-center text-slate-500 text-[8px] font-mono tracking-widest uppercase mt-8 opacity-70 bg-black/40 px-2 py-1 rounded backdrop-blur-sm border border-white/5">
            BUILD 2025.01.BETA • FILE SYSTEM ENABLED
          </div>
       </div>
    </div>
  );
};

const ManagerCreation: React.FC<{ onNext: (name: string) => void, onBack: () => void }> = ({ onNext, onBack }) => {
  const { t } = useGame();
  const [name, setName] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onNext(name.trim());
  };
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-white dark:bg-manager-bg transition-colors duration-300">
      <div className="w-full max-w-2xl bg-slate-50 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-lg p-12 shadow-2xl transition-colors duration-300">
        <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-8 text-center uppercase tracking-tight">{t('prof_title')}</h2>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-xs font-bold text-blue-600 dark:text-blue-400 mb-3 uppercase tracking-widest">{t('prof_name_label')}</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('prof_placeholder')}
              className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-sm px-6 py-5 text-2xl text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-bold"
              required
              autoFocus
            />
          </div>
          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={onBack}
              className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 font-black py-5 rounded-sm transition-all text-xl uppercase"
            >
              {t('prof_cancel')}
            </button>
            <button 
              type="submit" 
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-sm transition-all shadow-lg text-xl uppercase disabled:opacity-50"
              disabled={!name.trim()}
            >
              {t('prof_continue')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface SelectionProps {
  managerName: string;
  onSelectTeam: (teamId: string, countryId: string, leagueId: string) => void;
  onBack: () => void;
}

// As confederacoes da FIFA e o continente (campo `continent` do pais) que cada uma cobre.
const CONFEDERACOES: { id: string; nome: string; continentes: string[] }[] = [
  { id: 'UEFA', nome: 'UEFA', continentes: ['Europe'] },
  { id: 'CONMEBOL', nome: 'CONMEBOL', continentes: ['South America'] },
  { id: 'CONCACAF', nome: 'CONCACAF', continentes: ['North America', 'Central America', 'Caribbean'] },
  { id: 'AFC', nome: 'AFC', continentes: ['Asia'] },
  { id: 'CAF', nome: 'CAF', continentes: ['Africa'] },
  { id: 'OFC', nome: 'OFC', continentes: ['Oceania'] }
];
const confederacaoDe = (c: any) => (CONFEDERACOES.find(f => f.continentes.includes(c.continent)) || { id: '' }).id;

const TeamSelection: React.FC<SelectionProps> = ({ managerName, onSelectTeam, onBack }) => {
  const { t } = useGame();
  const [selectedConf, setSelectedConf] = useState<string>('CONMEBOL');
  const [selectedCountryId, setSelectedCountryId] = useState<string>('45');
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('bra_serie_a');
  const [previewTeams, setPreviewTeams] = useState<Team[]>([]);
  const [previewPlayers, setPreviewPlayers] = useState<Player[]>([]);
  const [clubeSelId, setClubeSelId] = useState<string>('');
  
  useEffect(() => {
    setClubeSelId('');
    if (selectedCountryId && selectedLeagueId) {
      const { teams, players } = generateLeagueData(selectedCountryId, selectedLeagueId);
      setPreviewTeams(teams);
      setPreviewPlayers(players);
    }
  }, [selectedCountryId, selectedLeagueId]);

  const activeCountry = COUNTRIES.find(c => c.id === selectedCountryId);

  const paisesDaConf = COUNTRIES.filter(c => confederacaoDe(c) === selectedConf);
  const handleConfSelect = (id: string) => {
    setSelectedConf(id);
    const primeiro = COUNTRIES.find(c => confederacaoDe(c) === id);
    if (primeiro) handleCountrySelect(primeiro.id); else { setSelectedCountryId(''); setSelectedLeagueId(''); setPreviewTeams([]); }
  };

  const handleCountrySelect = (id: string) => {
    setSelectedCountryId(id);
    const country = COUNTRIES.find(c => c.id === id);
    if (country && country.leagues.length > 0) {
      setSelectedLeagueId(country.leagues[0].id);
    }
  };

  const clubeSel = previewTeams.find(t => t.id === clubeSelId);
  const elencoSel = previewPlayers.filter(p => p.teamId === clubeSelId).sort((a, b) => b.skill - a.skill);
  const sortedTeams = [...previewTeams].sort((a, b) => a.name.localeCompare(b.name));
  const botaoTime = (team: Team) => (
                <button key={team.id} onClick={() => setClubeSelId(team.id)} className={`${clubeSelId === team.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'} border-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 ${selectedCountryId === '52' ? 'py-1 px-3' : 'py-3 px-4'} rounded transition-all group text-left flex items-center justify-between shadow-sm`}>
                   <div className="flex items-center gap-4">
                      <TeamShield team={team} className={selectedCountryId === '52' ? 'w-[22px] h-[28px]' : 'w-[46px] h-[58px]'} />
                      <div>
                        <div className="text-xl font-black text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase truncate max-w-[300px] leading-tight">{team.name}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-widest uppercase">Rep: {team.strength} OVR</div>
                      </div>
                   </div>
                </button>
  );

  return (
    <div className="w-full h-full flex flex-col p-8 bg-white dark:bg-manager-bg transition-colors duration-300">
      <div className="flex justify-between items-center mb-8 bg-slate-50 dark:bg-slate-800/50 p-6 rounded border border-slate-200 dark:border-slate-700 transition-colors duration-300 shadow-sm">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white flex items-center gap-2 font-bold uppercase text-sm transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            {t('sel_back')}
          </button>
          <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700"></div>
          <div>
             <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase transition-colors">{t('sel_title')}</h1>
             <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest">Manager: {managerName}</p>
          </div>
        </div>
      </div>
      <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
        <div className="w-[12%] flex flex-col gap-4">
          <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Confederations</div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
            {CONFEDERACOES.map(f => {
              const n = COUNTRIES.filter(c => confederacaoDe(c) === f.id).length;
              return (
                <button key={f.id} onClick={() => handleConfSelect(f.id)} className={`w-full text-left p-3 rounded border-2 transition-all ${selectedConf === f.id ? 'bg-blue-600 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-400'} ${n === 0 ? 'opacity-60' : ''}`}>
                  <div className={`text-lg font-black uppercase ${selectedConf === f.id ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{f.nome}</div>
                  <div className={`text-[10px] font-bold uppercase tracking-widest ${selectedConf === f.id ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'}`}>{n} {n === 1 ? 'association' : 'associations'}</div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="w-[calc(18%-50px)] flex flex-col gap-4">
          <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">{t('sel_step1')}</div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
            {paisesDaConf.length === 0 && <div className="text-xs text-slate-400 font-bold px-2 pt-2">No national associations in this confederation yet.</div>}
            {paisesDaConf.map(country => (
              <button key={country.id} onClick={() => handleCountrySelect(country.id)} className={`w-full text-left p-3 rounded border-2 transition-all flex items-center justify-between group ${selectedCountryId === country.id ? 'bg-blue-600 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-400'}`}>
                <span className={`text-lg font-black uppercase ${selectedCountryId === country.id ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{country.name}</span>
                <div className={`w-2 h-2 rounded-full ${selectedCountryId === country.id ? 'bg-white' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
              </button>
            ))}
          </div>
        </div>
        <div className="w-[17%] flex flex-col gap-4">
          <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">{t('sel_step2')}</div>
          <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
              {activeCountry?.leagues.filter(l => !l.hidden).map(league => (
                <button key={league.id} onClick={() => setSelectedLeagueId(league.id)} className={`w-full text-left p-3 rounded border-2 transition-all group ${selectedLeagueId === league.id ? 'bg-emerald-600 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-400'}`}>
                  <span className={`text-lg font-black uppercase ${selectedLeagueId === league.id ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{league.name}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${selectedLeagueId === league.id ? 'bg-emerald-400 text-emerald-900' : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500'}`}>DIV {league.tier}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-2 pb-2">
              <div className="text-blue-600 dark:text-blue-400 font-black text-xs uppercase italic tracking-widest border-t border-slate-100 dark:border-slate-800 pt-3 transition-colors">
                {selectedLeagueId === 'bra_serie_a' ? 'BRASILEIRÃO SÉRIE A.' : selectedLeagueId === 'bra_serie_b' ? 'BRASILEIRÃO SÉRIE B.' : selectedLeagueId === 'eng_prem' ? 'PREMIER LEAGUE' : (activeCountry?.leagues.find(l => l.id === selectedLeagueId)?.name || '').toUpperCase() + '.'}
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">{t('sel_step3')}</div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {/* Serie D do Brasil: os clubes divididos pelos 16 grupos de 6 (a 1.a fase da competicao). */}
            {(activeCountry?.leagues.find(l => l.id === selectedLeagueId) as any)?.format === 'SERIE_D' ? (
              <div className="space-y-4">
                {Object.entries(gruposDaSerieD(((activeCountry?.leagues.find(l => l.id === selectedLeagueId) as any).teamIds as number[]).map(String))).map(([g, ids]) => {
                  const doGrupo = sortedTeams.filter(t => ids.includes(t.id));
                  if (!doGrupo.length) return null;
                  return (
                    <div key={g}>
                      <div className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest px-1 pb-1 mb-2 border-b border-slate-200 dark:border-slate-800">Grupo {g}</div>
                      <div className="grid grid-cols-2 gap-2 content-start">{doGrupo.map(botaoTime)}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 content-start">
                {sortedTeams.map(botaoTime)}
              </div>
            )}
          </div>
        </div>
        <div className="w-[24%] flex flex-col gap-4 min-h-0">
          <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Club Overview</div>
          {clubeSel ? (() => {
            const c1 = clubeSel.homeKit?.color1 || '#1e293b', c2 = clubeSel.homeKit?.color2 || c1;
            const painel = 'bg-black/45 backdrop-blur-sm border border-white/15 rounded';
            return (
            <div className="flex-1 relative overflow-hidden rounded border-2 border-slate-200 dark:border-slate-800 min-h-0" style={{ background: `linear-gradient(165deg, ${c1} 0%, ${c1} 18%, ${c2} 62%, #020617 100%)` }}>
              <div className="absolute inset-0 flex flex-col gap-3 p-3 min-h-0">
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3 min-h-0">
                  <div className={`relative overflow-hidden h-[84px] flex flex-col justify-center pl-[88px] pr-3 ${painel}`}>
                    <div className="absolute top-1/2 -translate-y-1/2 -left-[26px] w-[120px] h-[144px]"><TeamShield team={clubeSel} className="w-full h-full" /></div>
                    <div className="text-2xl font-black text-white uppercase leading-tight truncate">{clubeSel.name}</div>
                    <div className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">{activeCountry?.leagues.find(l => l.id === selectedLeagueId)?.name}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    {[['OVR', clubeSel.strength], ['Founded', clubeSel.foundedYear || '-'], ['Fan base', (clubeSel.fanBase || 0).toLocaleString()], ['Budget', '$' + Math.round((clubeSel.cash || 0) / 1000).toLocaleString() + 'k']].map(([k, v]) => (
                      <div key={String(k)} className={`${painel} p-2`}>
                        <div className="text-[9px] font-black text-white/60 uppercase tracking-widest">{k}</div>
                        <div className="text-lg font-black text-white">{v}</div>
                      </div>
                    ))}
                  </div>
                  <div className={`${painel} p-3 text-sm space-y-1`}>
                    <div className="flex justify-between"><span className="text-white/60 font-bold uppercase text-[10px] tracking-widest">City</span><span className="font-bold text-white">{clubeSel.city || '-'}</span></div>
                    <div className="flex justify-between gap-2"><span className="text-white/60 font-bold uppercase text-[10px] tracking-widest">Stadium</span><span className="font-bold text-white text-right">{clubeSel.stadium || '-'}</span></div>
                    {clubeSel.stadiumCapacity ? <div className="flex justify-between"><span className="text-white/60 font-bold uppercase text-[10px] tracking-widest">Capacity</span><span className="font-bold text-white">{clubeSel.stadiumCapacity.toLocaleString()}</span></div> : null}
                    <div className="flex justify-between items-center"><span className="text-white/60 font-bold uppercase text-[10px] tracking-widest">Kit</span>
                      <span className="flex gap-1">{[clubeSel.homeKit?.color1, clubeSel.homeKit?.color2, clubeSel.awayKit?.color1].filter(Boolean).map((c, i) => <span key={i} className="w-5 h-5 rounded-full border border-white/40" style={{ background: c }}></span>)}</span>
                    </div>
                  </div>
                  <div className={`${painel} p-3`}>
                    <div className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-2">Key players ({elencoSel.length})</div>
                    {elencoSel.slice(0, 6).map(p => (
                      <div key={p.id} className="flex items-center justify-between text-sm py-0.5">
                        <span className="font-bold text-white truncate">{p.name}</span>
                        <span className="text-white/60 font-bold text-xs shrink-0 ml-2">{p.position} · {p.age}y · <span className="text-blue-300">{p.skill}</span></span>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => onSelectTeam(clubeSel.id, selectedCountryId, selectedLeagueId)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-sm transition-all shadow-lg text-xl uppercase tracking-widest">{t('sel_join')}</button>
              </div>
            </div>
            );
          })() : (
            <div className="flex-1 flex items-center justify-center text-center text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest px-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded">Select a club to see its overview</div>
          )}
        </div>
      </div>
    </div>
  );
};

const GameContainer: React.FC = () => {
  const { gameState, startGame, importGameData, t } = useGame();
  const [appPhase, setAppPhase] = useState<'MENU' | 'CREATE_MANAGER' | 'SELECT_TEAM' | 'GAME' | 'SETTINGS' | 'EDITOR'>('MENU');
  const [tempManagerName, setTempManagerName] = useState('');
  const [view, setView] = useState<GameState['view']>('DASHBOARD');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNewGame = () => setAppPhase('CREATE_MANAGER');
  
  const handleContinue = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (importGameData(content)) {
        setAppPhase('GAME');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleManagerCreated = (name: string) => {
    setTempManagerName(name);
    setAppPhase('SELECT_TEAM');
  };
  const handleTeamSelected = (teamId: string, countryId: string, leagueId: string) => {
    startGame(teamId, tempManagerName, countryId, leagueId);
    setAppPhase('GAME');
  };

  return (
    <div className="game-container shadow-2xl overflow-hidden relative transition-colors duration-300">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".json" 
        className="hidden" 
      />
      
      {appPhase === 'MENU' && <StartMenu onNewGame={handleNewGame} onContinue={handleContinue} onSettings={() => setAppPhase('SETTINGS')} onEditor={() => setAppPhase('EDITOR')} />}
      {appPhase === 'EDITOR' && <EditorApp onClose={() => setAppPhase('MENU')} />}
      {appPhase === 'SETTINGS' && (
        <div className="w-full h-full flex flex-col p-8 bg-slate-50 dark:bg-manager-bg transition-colors duration-300 overflow-y-auto custom-scrollbar">
           <SettingsView onBack={() => setAppPhase('MENU')} />
        </div>
      )}
      {appPhase === 'CREATE_MANAGER' && <ManagerCreation onNext={handleManagerCreated} onBack={() => setAppPhase('MENU')} />}
      {appPhase === 'SELECT_TEAM' && <TeamSelection managerName={tempManagerName} onSelectTeam={handleTeamSelected} onBack={() => setAppPhase('CREATE_MANAGER')} />}
      
      {appPhase === 'GAME' && gameState.userTeamId && (
        <Layout setView={setView} currentView={view}>
            {view === 'TRAINING' && <MatchRoundView setView={setView} />}
            {view === 'MATCH' && <MatchDay setView={setView} />}
            {view === 'DASHBOARD' && (
              <DashboardView 
                onGoToRoundSimulation={() => setView('TRAINING')} 
                onGoToMatchDay={() => setView('MATCH')} 
              />
            )}
            {view === 'SQUAD' && (
              <SquadView 
                onGoToRoundSimulation={() => setView('TRAINING')} 
                onGoToMatchDay={() => setView('MATCH')} 
              />
            )}
            {view === 'LEAGUE' && <LeagueTable />}
            {view === 'TACTICS' && <TacticsView setView={setView} />}
            {view === 'TRAINING_VIEW' && <TrainingView />}
            {view === 'FIXTURES' && <FixturesView />}
            {view === 'FINANCES' && <FinancesView />}
            {view === 'STATISTICS' && <StatisticsView />}
            {view === 'SETTINGS' && <SettingsView />}
            {view === 'WORLD' && <WorldView />}
        </Layout>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <GameProvider>
      <GameContainer />
    </GameProvider>
  );
};

export default App;
