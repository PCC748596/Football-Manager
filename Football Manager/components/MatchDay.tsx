import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { Team, Player, Fixture, resolveSetPieceTakers } from '../types';
import { TeamShield } from './TeamShield';
import { KitSelection } from './KitSelection';
import { MatchStatsModal } from './MatchStatsModal';
import { calculateMatchRatings } from '../textSim/matchEngine';
import Simulador3DView, { simulador3dArrancou, simulador3dReinicios, simulador3dPronto, simulador3dEnviar, simulador3dTelaCheia, simulador3dSairDaTelaCheia, simulador3dLembrarTelaCheia, simulador3dVelocidade } from '../3dMatch/Simulador3DView';
import { taticaParaMotor, taticaDoMotor } from '../3dMatch/simulador3dCliente';
import { COUNTRIES } from '../textSim/dataGenerator';
import { ligaDoClube } from '../textSim/competitions';

type VisualState = 'PRE_MATCH' | 'KICKOFF_SET' | 'PLAYING' | 'OFFSIDE' | 'GOAL';

interface MatchDayProps {
  setView?: (view: any) => void;
}

const MatchDay: React.FC<MatchDayProps> = ({ setView }) => {
  const { gameState, fixtures, teams, players, playMatchDay, pauseMatch, resetMatchDay, advanceWeek, updateMatchVisualState, motor3dMensagem, updateTactics, comps } = useGame();
  
  const match = fixtures.find(f => f.date === gameState.currentDate && (f.homeTeamId === gameState.userTeamId || f.awayTeamId === gameState.userTeamId));
  const homeTeam = teams.find(t => t.id === match?.homeTeamId);
  const awayTeam = teams.find(t => t.id === match?.awayTeamId);
  
  const [visualState, setVisualState] = useState<VisualState>(gameState.matchVisual?.visualStatus || 'PRE_MATCH');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showKitSelection, setShowKitSelection] = useState(!gameState.matchVisual || gameState.matchVisual.kitHomeIdx === undefined);
  const [activeTab, setActiveTab] = useState<'pitch3d' | 'stats'>('pitch3d');
  const chave3d = match ? match.date + "|" + match.homeTeamId + "|" + match.awayTeamId : "";
  const [camara, setCamara] = useState('lateraltv');
  const [reinicios, setReinicios] = useState(() => simulador3dReinicios(chave3d));
  // Lembra que o jogo de hoje esta a ser visto no 3D: o Resume da aba Tactics (e o botao JOGAR PARTIDA) voltam para ca, e nao para a simulacao 2D.
  useEffect(() => { try { localStorage.setItem('activeMatchView', 'MATCH'); } catch (e) { /* sem armazenamento: fica o padrao */ } }, []);
  const [velocidade, setVelocidade] = useState(1);
  const [replayAtivo, setReplayAtivo] = useState(false);
  // O indicador de evento do 3D (SHOTS, CORNERS...): sai na barra de cima, ao lado dos botoes, durante `duracao` s.
  const [eventoHud, setEventoHud] = useState<{ nome: string; esq: number; dir: number } | null>(null);
  // O relogio do 3D em segundos (mensagem `relogio`): o TEMPO mostra-se em MM:SS.
  const [relogio3d, setRelogio3d] = useState<number | null>(null);
  const eventoTimer = useRef<any>(null);
  const [pronto3d, setPronto3d] = useState(() => simulador3dPronto());
  // Os times estao a entrar em campo: o botao principal diz PULAR (ver Ponte.pularDisponivel).
  const [podePular, setPodePular] = useState(false);
  const userTeam = teams.find(t => t.id === gameState.userTeamId);
  const taticaJson = userTeam ? JSON.stringify(taticaParaMotor(userTeam.tactics)) : '';
  // Tatica do manager -> painel do 3D: ao carregar e sempre que o utilizador a muda na aba Tactics.
  useEffect(() => { if (pronto3d && taticaJson) simulador3dEnviar({ tipo: 'tatica', ...JSON.parse(taticaJson) }); }, [pronto3d, taticaJson]);
  // Os cobradores/capitao do utilizador mudados na aba Tactics com o jogo em curso vao ao motor (o lado A e a casa).
  const cobradoresJson = userTeam ? JSON.stringify(resolveSetPieceTakers(userTeam, players)) : '';
  useEffect(() => {
    if (pronto3d && cobradoresJson && match) simulador3dEnviar({ tipo: 'cobradores', lado: match.homeTeamId === gameState.userTeamId ? 'A' : 'B', cobradores: JSON.parse(cobradoresJson) });
  }, [pronto3d, cobradoresJson]);
  const [iniciou, setIniciou] = useState(() => simulador3dArrancou(chave3d + '#' + simulador3dReinicios(chave3d)));
  /*
  RETOMAR UM JOGO GRAVADO A MEIO: o save tem o minuto, o placar e os eventos, mas o 3D desta sessao ainda nao correu. Lido uma vez, ao abrir a tela: o 3D comeca no minuto do save (sem a
  entrada dos times), com o placar e os expulsos (os vermelhos dos eventos). Ver Ponte._retomar no simulador.
  */
  const retomarRef = useRef<{ minuto: number; placar: { casa: number; fora: number }; expulsos: string[]; saida: 'casa' | 'fora'; instantaneo?: any } | null>(
    (!iniciou && match && !match.played && gameState.matchMinute > 0 && gameState.matchMinute < 90) ? {
      minuto: gameState.matchMinute,
      placar: { casa: match.homeScore || 0, fora: match.awayScore || 0 },
      expulsos: (match.events || []).filter((e: any) => e.type === 'CARD' && (String(e.description || '').includes('🟥') || /RED|VERMELH/i.test(String(e.description || ''))) && e.playerId).map((e: any) => String(e.playerId)),
      saida: (gameState.matchMinute % 2 === 0) ? 'casa' : 'fora',
      // O instantaneo do 3D gravado com o save (posicoes, bola, posse, estatisticas): continua exactamente dali, sem saida de bola.
      instantaneo: (window as any).__instantaneo3d || undefined
    } : null);
  // Sair desta tela (taticas, etc.) pausa o relogio; o 3D pausa-se sozinho e retoma ao voltar (o iframe nao e recriado).
  useEffect(() => () => { pauseMatch(); }, []);

  // O fim do jogo conclui-se UMA vez: sem este guarda o `advanceWeek` podia correr duas vezes (dois dias a passar).
  const concluidoRef = useRef(false);
  useEffect(() => {
    // Fim do jogo: conclui a partida (o mesmo do botao CONCLUIR: passa o dia) e vai para a HOME, sem a tela de estatisticas e notas (ela continua na aba Stats durante o jogo).
    // Antes ia so para a HOME e o minuto ficava em 90: o RESUME MATCH ficava ativo e os dias nao passavam.
    /*
    COM O 3D AO VIVO NAO SE CONCLUI SOZINHO (pedido: *"ao terminar o jogo continuar na tela do 3D com as estatisticas e so sair para a home depois de selecionar continuar"*). O relogio do
    manager chega aos 90 com o 3D ainda no acrescimo, e concluir aqui tirava o jogo do 3D antes do apito final — sem o resultado dele o manager ficava preso. Agora o 3D acaba o jogo, mostra as
    estatisticas, as notas e a tabela, e o treinador sai com CONTINUAR (o botao do manager ou o do 3D: handleAction / `saida_pedida`, que so concluem depois do `fim` do 3D).
    */
    if (gameState.matchMinute >= 90) {
      if (iniciou) return;
      if (setView) {
        if (!concluidoRef.current) { concluidoRef.current = true; advanceWeek(); setView('DASHBOARD'); }
      } else setActiveTab('stats');
    } else if (gameState.matchMinute === 0) concluidoRef.current = false;
  }, [gameState.matchMinute, iniciou]);

  if (!match || !homeTeam || !awayTeam) {
    return <div className="text-white p-10 text-center font-black uppercase italic">Sem partida hoje.</div>;
  }

  // Com o 3D o fim do jogo fica no 3D (as estatisticas dele): a aba de estatisticas do manager so abre se o treinador a escolher.
  const showStats = (gameState.matchMinute >= 90 && !iniciou) || activeTab === 'stats';
  // A posicao dos dois clubes na tabela da liga (pontos, saldo, golos): o treinador da CPU no 3D leva-a em conta (objetivo do clube). Sem jogos feitos, vale a ordem de OVR.
  const tabelaDosDois = (() => {
    const liga = teams.filter(t => t.leagueId === homeTeam.leagueId && (t.groupId || '') === (homeTeam.groupId || ''));
    if (liga.length < 2) return undefined;
    const semJogos = liga.every(t => !t.played);
    const ord = [...liga].sort((a, b) => semJogos ? b.strength - a.strength : (b.points - a.points) || ((b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)) || (b.goalsFor - a.goalsFor));
    const pos = (id: string) => ord.findIndex(t => t.id === id) + 1;
    return { casa: { posicao: pos(homeTeam.id), total: ord.length }, fora: { posicao: pos(awayTeam.id), total: ord.length } };
  })();
  // O nome da competicao desta partida: vai para a placa fixa do centro da lateral oposta ao tunel (3D).
  const nomeCompeticao = (() => {
    if (match.isFriendly || match.type === 'FRIENDLY') return 'Friendly';
    if (match.type === 'CUP') return (comps || []).find(c => c.matches.some(m => 'fix-cup-' + m.id === match.id))?.name || '';
    try { const l = ligaDoClube(homeTeam); return (COUNTRIES as any[]).find(c => c.id === l.countryId)?.leagues.find((x: any) => x.id === l.leagueId)?.name || ''; } catch { return ''; }
  })();

  // O motor 3D decide a partida; o relogio do manager segue o dele (ver GameContext.motor3dMensagem).
  const handleAction = (daSaidaPedida = false) => {
    // Os times entram em campo: o botao e PULAR (o mesmo que o ESC do 3D). O pedido de saida que o ESC gera volta aqui e ai arranca a partida (daSaidaPedida).
    if (podePular && !daSaidaPedida && gameState.matchMinute < 90) { simulador3dEnviar({ tipo: 'esc' }); return; }
    if (gameState.matchMinute >= 90) {
        /*
        SO SE CONCLUI DEPOIS DO 3D ACABAR. Com o 3D ao vivo o relogio do manager chega aos 90 enquanto o jogo do 3D ainda esta no ACRESCIMO; concluir ai (advanceWeek) tirava o
        jogo do 3D aos 90, sem as telas de estatisticas/notas/tabela e sem o resultado dele — e o manager ficava preso. O 3D avisa o fim com a mensagem `fim` (motor3dMinuto = 999).
        */
        const m3d = (window as any).motor3dMinuto;
        // No acrescimo o 3D ainda joga: o botao alterna a PAUSA (nao conclui o jogo).
        if (typeof m3d === 'number' && m3d !== 999) { if (gameState.isProcessing) pauseMatch(); else playMatchDay('VISUAL'); return; }
        if (concluidoRef.current) return;
        concluidoRef.current = true;
        advanceWeek();
        setView?.('DASHBOARD');
    } else if (gameState.isProcessing) {
        pauseMatch();
    } else {
        if (!iniciou) { (window as any).motor3dMinuto = retomarRef.current ? retomarRef.current.minuto : 0; setIniciou(true); }
        playMatchDay('VISUAL');
    }
  };

  // RESET: volta ao minuto 0 e o 3D e recriado (chave nova), por isso os times entram em campo outra vez e esperam a saida.
  const handleReset = () => {
    pauseMatch();
    if (gameState.matchMinute >= 90) return;
    resetMatchDay();
    setIniciou(false);
    setReinicios(n => n + 1);
    setReplayAtivo(false);
    // Volta a tela dos uniformes, antes do jogo: o 3D so e preparado depois de novos kits escolhidos.
    updateMatchVisualState({ kitHomeIdx: undefined, kitAwayIdx: undefined, visualStatus: 'PRE_MATCH' });
    setVisualState('PRE_MATCH');
    setShowKitSelection(true);
  };

  const handleKitSelection = (h: number, a: number) => {
    updateMatchVisualState({ kitHomeIdx: h, kitAwayIdx: a, visualStatus: 'KICKOFF_SET' });
    setVisualState('KICKOFF_SET');
    setShowKitSelection(false);
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 rounded-xl overflow-hidden border border-slate-900 shadow-2xl">
        <div className="h-20 bg-slate-900 border-b border-slate-800 flex flex-col items-center justify-center relative z-20 overflow-hidden">
            <div className="w-full flex items-center justify-between px-8">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <TeamShield team={homeTeam} className="w-12 h-14" />
                        <span className="text-white font-black italic">{homeTeam.name}</span>
                    </div>
                    <div className="bg-black/80 px-5 py-1.5 rounded-lg font-mono text-xl text-blue-400 font-black border border-slate-800 shadow-inner">
                        {match.homeScore || 0} - {match.awayScore || 0}
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-white font-black italic">{awayTeam.name}</span>
                        <TeamShield team={awayTeam} className="w-12 h-14" />
                    </div>
                </div>
                
                <div className="flex items-center gap-8">
                    <div className="text-right">
                        <div className="text-2xl font-black text-blue-500 italic leading-none tabular-nums">{(() => { const s = (iniciou && relogio3d !== null) ? relogio3d : gameState.matchMinute * 60; return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); })()}</div>
                        <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-1">TEMPO</div>
                    </div>
                    <div className="flex items-center gap-2">
                        {gameState.matchMinute < 90 && (
                            <>
                                <button 
                                  onClick={() => { setActiveTab('pitch3d'); if (camara === 'topdown') { setCamara('lateraltv'); simulador3dEnviar({ tipo: 'camera', modo: 'lateraltv' }); } }} 
                                  className={`${activeTab === 'pitch3d' && camara !== 'topdown' ? 'bg-sky-650 hover:bg-sky-600 border-sky-850' : 'bg-slate-700 hover:bg-slate-600 border-slate-900'} text-white font-black px-4 py-2.5 rounded text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 border-b-4`}
                                >
                                  3D
                                </button>
                                {/* 2D = a camara tatica (vista de cima), que era um botao da fila de cameras */}
                                <button 
                                  onClick={() => { setActiveTab('pitch3d'); setCamara('topdown'); simulador3dEnviar({ tipo: 'camera', modo: 'topdown' }); }} 
                                  className={`${activeTab === 'pitch3d' && camara === 'topdown' ? 'bg-sky-650 hover:bg-sky-600 border-sky-850' : 'bg-slate-700 hover:bg-slate-600 border-slate-900'} text-white font-black px-4 py-2.5 rounded text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 border-b-4`}
                                >
                                  2D
                                </button>
                                <button 
                                  onClick={() => setActiveTab('stats')} 
                                  className={`${activeTab === 'stats' ? 'bg-blue-650 hover:bg-blue-600 border-blue-850' : 'bg-slate-700 hover:bg-slate-600 border-slate-900'} text-white font-black px-4 py-2.5 rounded text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 border-b-4`}
                                >
                                  ESTATÍSTICAS
                                </button>
                            </>
                        )}
                        <button onClick={handleReset} className="bg-slate-700 hover:bg-slate-600 text-white font-black px-4 py-2.5 rounded text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 border-b-4 border-slate-900">RESET</button>
                        <button onClick={() => handleAction()} className="bg-blue-600 hover:bg-blue-500 text-white font-black px-8 py-2.5 rounded text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 border-b-4 border-blue-800">
                          {gameState.matchMinute >= 90 ? 'CONCLUIR' : podePular ? 'PULAR' : gameState.isProcessing ? 'PAUSAR' : (gameState.matchMinute === 0 || gameState.matchMinute === 45) && !iniciou ? 'SAÍDA' : 'CONTINUAR'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        {!showStats && (
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-2 flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mr-1">Câmera</span>
            {[['orbit', 'Órbita'], ['center', 'TV Centro'], ['sideline', 'Lateral Móvel'], ['lateraltv', 'Lateral TV'], ['grua', 'Grua'], ['cinema', 'Cinema']].map(([modo, nome]) => (
              <button key={modo} onClick={() => { setCamara(modo); simulador3dEnviar({ tipo: 'camera', modo }); }}
                className={`${camara === modo ? 'bg-sky-600 border-sky-800' : 'bg-slate-700 hover:bg-slate-600 border-slate-900'} text-white font-black px-3 py-1.5 rounded text-[10px] uppercase tracking-wider border-b-2 active:scale-95`}>{nome}</button>
            ))}
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-3 mr-1">Velocidade</span>
            {[0.5, 1, 1.5].map(v => (
              <button key={v} onClick={() => { setVelocidade(v); simulador3dVelocidade(v); }}
                className={`${velocidade === v ? 'bg-sky-600 border-sky-800' : 'bg-slate-700 hover:bg-slate-600 border-slate-900'} text-white font-black px-3 py-1.5 rounded text-[10px] tracking-wider border-b-2 active:scale-95`}>{v}x</button>
            ))}
            <button onClick={() => simulador3dEnviar({ tipo: 'replay', segundos: 10 })}
              title="Repete os ultimos 10 segundos (clique de novo para parar)"
              className={`${replayAtivo ? 'animate-pulse bg-yellow-400 hover:bg-yellow-300 border-yellow-600 text-black' : 'bg-slate-700 hover:bg-slate-600 border-slate-900 text-white'} font-black px-3 py-1.5 rounded text-[10px] uppercase tracking-wider border-b-2 active:scale-95`}>Replay 10s</button>
            {eventoHud && (
              <span className="ml-3 flex items-center gap-2 bg-slate-950 border border-slate-600 rounded px-3 py-1 text-white font-black text-[10px] uppercase tracking-widest">
                <span className="text-sm">{eventoHud.esq}</span>{eventoHud.nome}<span className="text-sm">{eventoHud.dir}</span>
              </span>
            )}
            <button onClick={() => simulador3dTelaCheia()} className="ml-auto bg-emerald-700 hover:bg-emerald-600 text-white font-black px-4 py-1.5 rounded text-[10px] uppercase tracking-widest border-b-2 border-emerald-900 active:scale-95">Tela cheia</button>
        </div>
        )}
        <div className="flex-1 bg-slate-900 flex items-center justify-center overflow-hidden relative">
            {showStats ? (() => {
                const events = match.events || [];
                const posTime = match.possessionTimeline || [];
                const hPos = posTime.length > 0 ? Math.round((posTime.filter(p => p === 'home').length / posTime.length) * 100) : 50;
                const aPos = 100 - hPos;

                const hShots = events.filter(e => e.teamId === match.homeTeamId && ['GOAL', 'MISS', 'MISS_PENALTY'].includes(e.type)).length + events.filter(e => e.teamId === match.awayTeamId && e.type === 'SAVE').length;
                const aShots = events.filter(e => e.teamId === match.awayTeamId && ['GOAL', 'MISS', 'MISS_PENALTY'].includes(e.type)).length + events.filter(e => e.teamId === match.homeTeamId && e.type === 'SAVE').length;

                const hFouls = events.filter(e => e.teamId === match.homeTeamId && e.type === 'FOUL').length;
                const aFouls = events.filter(e => e.teamId === match.awayTeamId && e.type === 'FOUL').length;

                const hCorners = events.filter(e => e.teamId === match.homeTeamId && e.type === 'CORNER').length;
                const aCorners = events.filter(e => e.teamId === match.awayTeamId && e.type === 'CORNER').length;

                const hYellows = events.filter(e => e.teamId === match.homeTeamId && e.type === 'CARD' && e.description.includes('🟨')).length;
                const aYellows = events.filter(e => e.teamId === match.awayTeamId && e.type === 'CARD' && e.description.includes('🟨')).length;
                
                const hReds = events.filter(e => e.teamId === match.homeTeamId && e.type === 'CARD' && e.description.includes('🟥')).length;
                const aReds = events.filter(e => e.teamId === match.awayTeamId && e.type === 'CARD' && e.description.includes('🟥')).length;

                const timeFactor = (gameState.matchMinute > 0 ? gameState.matchMinute : 90) / 90;
                const hPasses = Math.floor((300 + hPos * 3) * timeFactor) + hShots * 2;
                const aPasses = Math.floor((300 + aPos * 3) * timeFactor) + aShots * 2;

                const playerRatings = match.playerRatings || calculateMatchRatings(events, homeTeam, awayTeam, match.homeScore || 0, match.awayScore || 0, match.homeLineup, match.awayLineup, players);

                return (
                    <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-800 p-6 w-full max-w-5xl h-full flex flex-col overflow-hidden shadow-2xl animate-fade-in text-white">
                         <h2 className="text-sm font-black uppercase mb-4 text-center tracking-widest text-slate-400">
                              {gameState.matchMinute >= 90 ? "ESTATÍSTICAS FINAIS" : "ESTATÍSTICAS DA PARTIDA"}
                         </h2>
                         <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_1.2fr_1fr] gap-6 overflow-hidden min-h-0">
                             {/* HOME TEAM RATINGS */}
                             <div className="flex flex-col gap-3 overflow-hidden h-full">
                                 <h3 className="font-black text-sm text-center uppercase truncate text-blue-400">{homeTeam.name}</h3>
                                 <div className="flex-1 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                                     {Object.entries(playerRatings).filter(([id]) => {
                                         const p = players.find(x => x.id === id);
                                         return p && p.teamId === match.homeTeamId;
                                     }).map(([id, rating]) => {
                                         const p = players.find(x => x.id === id);
                                         return (
                                             <div key={id} className="flex justify-between items-center bg-slate-800/40 hover:bg-slate-800/80 px-3 py-1.5 rounded-lg border-l-4 transition-colors border-blue-500">
                                                 <span className="text-[11px] font-bold text-slate-300 truncate">{p?.name.split(' ').pop()}</span>
                                                 <span className={`font-black text-[11px] ${(rating as number) >= 7.5 ? 'text-emerald-500' : (rating as number) <= 5.5 ? 'text-rose-500' : 'text-slate-400'}`}>{(rating as number).toFixed(1)}</span>
                                             </div>
                                         );
                                     })}
                                 </div>
                             </div>

                             {/* STATS COMPARISON */}
                             <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-center gap-1.5 overflow-y-auto custom-scrollbar">
                                 <h4 className="text-[10px] font-black text-center uppercase tracking-widest text-slate-500 mb-2">
                                     {gameState.matchMinute >= 90 ? "FULL TIME STATS" : "MATCH STATS"}
                                 </h4>
                                 {[
                                   { label: 'GOLS', h: match.homeScore || 0, a: match.awayScore || 0 },
                                   { label: 'POSSE DE BOLA', h: `${hPos}%`, a: `${aPos}%` },
                                   { label: 'CHUTES', h: hShots, a: aShots },
                                   { label: 'PASSES', h: hPasses, a: aPasses },
                                   { label: 'ESCANTEIOS', h: hCorners, a: aCorners },
                                   { label: 'FALTAS', h: hFouls, a: aFouls },
                                   { label: 'CA', h: hYellows, a: aYellows },
                                   { label: 'CV', h: hReds, a: aReds },
                                 ].map((stat, i) => (
                                   <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-900/60 last:border-0">
                                     <span className="w-1/3 text-right font-black text-sm text-slate-100">{stat.h}</span>
                                     <span className="w-1/3 text-center text-[9px] font-black uppercase tracking-wider text-slate-500">{stat.label}</span>
                                     <span className="w-1/3 text-left font-black text-sm text-slate-100">{stat.a}</span>
                                   </div>
                                 ))}
                             </div>

                             {/* AWAY TEAM RATINGS */}
                             <div className="flex flex-col gap-3 overflow-hidden h-full">
                                 <h3 className="font-black text-sm text-center uppercase truncate text-red-400">{awayTeam.name}</h3>
                                 <div className="flex-1 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                                     {Object.entries(playerRatings).filter(([id]) => {
                                         const p = players.find(x => x.id === id);
                                         return p && p.teamId === match.awayTeamId;
                                     }).map(([id, rating]) => {
                                         const p = players.find(x => x.id === id);
                                         return (
                                             <div key={id} className="flex justify-between items-center bg-slate-800/40 hover:bg-slate-800/80 px-3 py-1.5 rounded-lg border-r-4 transition-colors border-red-500">
                                                 <span className="text-[11px] font-bold text-slate-300 truncate">{p?.name.split(' ').pop()}</span>
                                                 <span className={`font-black text-[11px] ${(rating as number) >= 7.5 ? 'text-emerald-500' : (rating as number) <= 5.5 ? 'text-rose-500' : 'text-slate-400'}`}>{(rating as number).toFixed(1)}</span>
                                             </div>
                                         );
                                     })}
                                 </div>
                             </div>
                         </div>
                    </div>
                );
             })() : null}
             <div className={`absolute inset-0 w-full h-full ${showStats ? 'hidden' : ''}`}>
                <Simulador3DView retomar={retomarRef.current} competicao={nomeCompeticao} tabela={tabelaDosDois} amistoso={!!(match.isFriendly || match.type === 'FRIENDLY')} qualidade={gameState.graphicsQuality || 'HIGH'} casa={homeTeam} fora={awayTeam} players={players} userTeamId={gameState.userTeamId} chave={chave3d + '#' + reinicios} kitCasa={gameState.matchVisual?.kitHomeIdx} kitFora={gameState.matchVisual?.kitAwayIdx}
                    iniciar={iniciou} pausado={iniciou && !gameState.isProcessing} aoPronto={() => setPronto3d(true)}
                    aoMensagem={(m) => {
                      // Tatica do painel do 3D -> manager (aba Tactics): so o que mudou de nivel.
                      if (m.tipo === 'tatica_alterada' && userTeam) {
                        const mudou = taticaDoMotor(m, userTeam.tactics);
                        if (Object.keys(mudou).length) updateTactics(userTeam.id, mudou);
                      } else if (m.tipo === 'abrir_tactics' || (m.tipo === 'expulsao' && m.lado === (match.homeTeamId === gameState.userTeamId ? 'A' : 'B'))) {
                        // Botao Tactics da tela cheia do 3D, ou expulsao de um jogador do utilizador: sai da tela cheia, pausa o relogio e abre o MATCH TACTICS.
                        simulador3dLembrarTelaCheia();
                        simulador3dSairDaTelaCheia();
                        if (gameState.isProcessing) pauseMatch();
                        setView?.('TACTICS');
                      } else if (m.tipo === 'sair_tela_cheia') {
                        // O botao Sair da barra da tela cheia do 3D (tablet: sem ESC).
                        simulador3dSairDaTelaCheia();
                      } else if (m.tipo === 'abertura_estado') {
                        setPodePular(!!m.pular);
                      } else if (m.tipo === 'relogio') {
                        setRelogio3d(typeof m.segundos === 'number' ? m.segundos : null);
                      } else if (m.tipo === 'hud_evento') {
                        setEventoHud({ nome: m.nome, esq: m.esq, dir: m.dir });
                        clearTimeout(eventoTimer.current);
                        eventoTimer.current = setTimeout(() => setEventoHud(null), (m.duracao || 7) * 1000);
                      } else if (m.tipo === 'replay_estado') {
                        setReplayAtivo(!!m.ativo);
                      } else if (m.tipo === 'saida_pedida' || m.tipo === 'alternar_pausa') {
                        // ESC / Pause do painel do 3D: quem manda no relogio e no botao e o manager.
                        // Com o jogo acabado, o CONTINUAR / saida do 3D conclui a partida e vai para a HOME (antes ficava preso).
                        if (gameState.matchMinute < 90) handleAction(true);
                        else if (!concluidoRef.current) {
                          // So depois do `fim` do 3D (ver handleAction): no acrescimo o pedido e ignorado.
                          const m3d = (window as any).motor3dMinuto;
                          if (typeof m3d === 'number' && m3d !== 999) {
                            // No acrescimo: o Pause do 3D alterna a pausa; o ESC continua ignorado (so se sai depois do `fim`).
                            if (m.tipo === 'alternar_pausa') { if (gameState.isProcessing) pauseMatch(); else playMatchDay('VISUAL'); }
                            return;
                          }
                          concluidoRef.current = true; advanceWeek(); setView?.('DASHBOARD');
                        }
                      } else motor3dMensagem(m);
                    }} />
             </div>

             {/* Live match overlays inside the viewport */}
             {!showStats && visualState === 'OFFSIDE' && (
                 <div className="absolute inset-0 bg-yellow-500/10 backdrop-blur-[1px] z-[100] flex items-center justify-center pointer-events-none">
                     <div className="bg-black/80 text-yellow-400 px-10 py-4 rounded-xl border-4 border-yellow-500 shadow-2xl transform scale-125">
                         <span className="text-3xl font-black italic tracking-widest uppercase animate-pulse">IMPEDIMENTO!</span>
                     </div>
                 </div>
             )}
             {!showStats && visualState === 'GOAL' && (
                 <div className="absolute inset-0 bg-emerald-950/20 backdrop-blur-[1px] z-[100] flex items-center justify-center pointer-events-none">
                     <div className="bg-black/90 text-emerald-400 px-12 py-5 rounded-2xl border-4 border-emerald-500 shadow-2xl transform scale-125 animate-bounce">
                         <span className="text-4xl font-black italic tracking-widest uppercase">GOL!</span>
                     </div>
                 </div>
             )}

            {/* Kit Selection Overlay */}
            {showKitSelection && (
                <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-8">
                    <KitSelection 
                        homeTeam={homeTeam} 
                        awayTeam={awayTeam} 
                        userTeamId={gameState.userTeamId} 
                        onSelectionComplete={handleKitSelection} 
                    />
                </div>
            )}

            {/* Match Stats Overlay */}
            {showStatsModal && (
                <MatchStatsModal 
                  fixture={match} 
                  homeTeam={homeTeam} 
                  awayTeam={awayTeam} 
                  players={players} 
                  matchMinute={gameState.matchMinute} 
                  onClose={() => setShowStatsModal(false)} 
                />
            )}
        </div>
    </div>
  );
};

export default MatchDay;
