import { doisNomes } from '../textSim/nomes';
import { calcularQuimica, checkPosMatch } from '../textSim/quimica';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { Tactics, Position, Player, Team, SetPieceRole, getEffectiveSkill, resolveSetPieceTakers, FORMATIONS, POSITION_ORDER, getKitDetails, getGKKitDetails, KitDetails, PLAYSTYLE_POSITIONS, PlayStyle } from '../types';
import { TeamKit } from './TeamKit';
import EnergyBar, { energiaDe } from './EnergyBar';
import { getMatchEndMinute } from '../textSim/matchEngine';
import { chaveCompeticao, estaSuspenso, AMARELOS_PARA_SUSPENSAO } from '../textSim/suspensoes';

interface FieldPosition {
  id: number;
  x: number; 
  y: number; 
  label: string;
}


import { ShirtIcon } from './ShirtIcon';
import { PlayerFace3D } from './PlayerFace3D';
import { setoresPadraoDaFormacao } from '../3dMatch/simulador3dCliente';
import ZonePositionsModal from './ZonePositionsModal';
import { campo3d } from '../textSim/atributos3d';
import TacticPresetsModal from './TacticPresetsModal';
import MatchPreviewModal from './MatchPreviewModal';
import { slotsVazios } from '../textSim/escalacao';
import { ICONE_DO_ESTILO } from '../textSim/playStyleIcons';
import { IconePlayStyleSvg } from '../textSim/PlayStyleSvg';
import { PLAYSTYLE_DA_BASE } from '../textSim/playStylesDatabase';
import { estiloPorPosicao, estiloValidoDoJogador } from '../textSim/playStyleFallback';
import { PLAYSTYLE_AJUSTES } from '../textSim/playStylesAjustes';
import { FaseZona, ZONAS, postosEfetivos, espelharFase, espelharZona, zonaEspelhada, repor, moverPosto, formacaoTemTabela, temAjustes } from '../textSim/formacoesZonas';

const MoraleArrow = ({ morale }: { morale: number }) => {
  if (morale >= 90) return <span className="text-amber-400 transform -rotate-90 inline-block font-bold drop-shadow-sm text-[15px]">➤</span>; 
  if (morale >= 70) return <span className="text-emerald-500 transform -rotate-45 inline-block font-bold text-[15px]">➤</span>; 
  if (morale >= 40) return <span className="text-slate-400 inline-block font-bold text-[15px]">➤</span>; 
  if (morale >= 20) return <span className="text-orange-500 transform rotate-45 inline-block font-bold text-[15px]">➤</span>; 
  return <span className="text-rose-500 transform rotate-90 inline-block font-bold text-[15px]">➤</span>; 
};

// Todos os icones de Playing Style no mesmo padrao: desenho de linha sem caixa, so o tamanho muda.
const IconeEstilo = ({ estilo, tam, className = '' }: { estilo: string; tam: number; className?: string }) => (
  <span title={'Playing Style: ' + estilo} className={`inline-flex items-center justify-center shrink-0 leading-none drop-shadow-[0_0_2px_rgba(0,0,0,0.8)] ${className}`} style={{ width: tam, height: tam }}><IconePlayStyleSvg estilo={estilo} tam={tam} /></span>
);

const getPosColor = (posLabel: string | Position) => {
  if (posLabel === 'GK' || posLabel === Position.GK) return '#ea580c'; 
  if (['LB', 'CB', 'RB', Position.LB, Position.CB, Position.RB].includes(posLabel)) return '#eab308'; 
  if (['DM', 'LM', 'CM', 'RM', 'AM', Position.DM, Position.LM, Position.CM, Position.RM, Position.AM].includes(posLabel)) return '#16a34a'; 
  return '#2563eb'; 
};

const getInjuryColorClass = (injury: any) => {
  if (!injury) return 'text-emerald-500';
  const severity = typeof injury === 'object' ? (injury.severity || injury.injurySeverity) : 'LIGHT';
  if (severity === 'SEVERE' || severity === 'GRAVE') return 'text-rose-500';
  if (severity === 'MEDIUM' || severity === 'MÉDIA') return 'text-amber-500';
  return 'text-emerald-500';
};

// As funcoes da bola parada: o texto no topo do espaco e o atributo que se mostra por baixo da camisa (o manager so tem chute `sht` e passe `pas`: o cruzamento sai do passe).
const SET_PIECE_ROLES: { role: SetPieceRole; label: string; attr: { rotulo: string; valor: (p: Player) => number } }[] = [
  { role: 'captain', label: 'Captain', attr: { rotulo: 'OVR', valor: p => p.skill } },
  { role: 'cornerL', label: 'Corner taker (left)', attr: { rotulo: 'COR', valor: p => campo3d(p, ['cornerKicks', 'crossing']) } },
  { role: 'cornerR', label: 'Corner taker (right)', attr: { rotulo: 'COR', valor: p => campo3d(p, ['cornerKicks', 'crossing']) } },
  { role: 'freeKickLong', label: 'Long free-kick taker', attr: { rotulo: 'LP', valor: p => campo3d(p, ['longPassing', 'freekicks']) } },
  { role: 'freeKickDirectL', label: 'Direct free-kick taker (left)', attr: { rotulo: 'FK', valor: p => campo3d(p, ['freekicks', 'shotPower']) } },
  { role: 'freeKickDirectR', label: 'Direct free-kick taker (right)', attr: { rotulo: 'FK', valor: p => campo3d(p, ['freekicks', 'shotPower']) } },
  { role: 'penalty', label: 'Penalty taker', attr: { rotulo: 'PEN', valor: p => campo3d(p, ['penalties', 'composure']) } }
];

const NOME_DA_ZONA = ['Def. right', 'Def. centre', 'Def. left', 'Mid right', 'Mid centre', 'Mid left', 'Att. right', 'Att. centre', 'Att. left'];

interface TacticsViewProps {
  setView?: (view: any) => void;
}

const TacticsView: React.FC<TacticsViewProps> = ({ setView }) => {
  const { userTeam, players, updateTactics, updateSetPieceTakers, gameState, fixtures, teams, comps, avisoGoleiro, limparAvisoLesao } = useGame();
  // Abrir o Tactics e a unica coisa que apaga o aviso de lesao do card do MatchDay.
  useEffect(() => { limparAvisoLesao(); }, []);
  const [localLineup, setLocalLineup] = useState<string[]>([]);
  const [localBench, setLocalBench] = useState<string[]>([]);
  const [isOverBench, setIsOverBench] = useState(false);
  // Os jogadores aparecem sempre com o uniforme escolhido (o botao Posicao/Uniforme saiu).
  const showMatchKit = true;
  const [poolSortBy, setPoolSortBy] = useState<'skill' | 'position'>('skill');
  const [selectedKitIdx, setSelectedKitIdx] = useState<0 | 1 | 2 | 3>(0);
  // O 4.o botao (3) e o goleiro: as camisas de campo e a base do goleiro usam so 0-2.
  const kitDeCampo = (selectedKitIdx === 3 ? 0 : selectedKitIdx) as 0 | 1 | 2;
  const [showZonas, setShowZonas] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [presetFoco, setPresetFoco] = useState<null | 'save' | 'load'>(null);
  // TOQUE (iPad, onde o arrastar nativo falha): toca-se num jogador (banco, pool ou campo) para o SELECIONAR e depois no destino (um titular, um suplente ou o banco).
  const [selecionado, setSelecionado] = useState<string | null>(null);
  // Editor das posicoes no proprio campo: fase (com/sem a bola) e zona da bola (0-8; null = a formacao base).
  const [aba, setAba] = useState<'geral' | FaseZona>('geral');
  const fase: FaseZona = aba === 'sem' ? 'sem' : 'com';
  const [zona, setZona] = useState<number | null>(null);
  const [contra, setContra] = useState(false);
  const [arrasto, setArrasto] = useState<{ slot: number; x: number; z: number } | null>(null);
  const campoRef = useRef<HTMLDivElement>(null);
  // Quando acabou o ultimo arrasto de um posto: o toque que o termina nao pode escolher a zona onde o dedo pousou (tablet).
  const fimDoArrasto = useRef(0);
  // So no IPAD (pedido): o layout de uma coluna vale para o tablet — ecra de TOQUE (ponteiro grosso) com menos de 1280 px, ou o quadro do modo Tablet das Configuracoes (o PC a imitar o iPad).
  // No computador o layout e sempre o de 3 colunas, seja qual for o tamanho da janela.
  const ehTablet = () => {
    if (typeof window === 'undefined') return false;
    if (window.innerWidth >= 1280) return false;
    const toque = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    let quadroTablet = false;
    try { quadroTablet = window.self !== window.top && localStorage.getItem('fm_tablet') === '1'; } catch { /* iframe de outra origem */ }
    return toque || quadroTablet;
  };
  const [largo, setLargo] = useState(() => !ehTablet());
  useEffect(() => {
    const f = () => setLargo(!ehTablet());
    f();
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  const [formContra, setFormContra] = useState<string>('ADV');

  useEffect(() => {
    if (userTeam) {
      setLocalLineup([...userTeam.lineup]);
      setLocalBench([...userTeam.bench]);
    }
  }, [userTeam?.id, userTeam?.lineup, userTeam?.bench]);

  /*
  AO CARREGAR (e quando a escalacao muda) os MELHORES de cada funcao entre os que vao a campo: quem ainda nao tem designado, ou cujo designado saiu do onze (banco, lesionado,
  expulso), recebe o melhor da escalacao para a funcao — capitao o de maior nota; corners (esquerda a melhor, direita a segunda) e falta longa o de melhor passe; falta direta e
  penalti o de melhor chute. Quem foi escolhido a mao e continua no onze nao e tocado. O goleiro nao cobra.
  */
  useEffect(() => {
    if (!userTeam) return;
    const r = resolveSetPieceTakers(userTeam, players);
    const atual: any = userTeam.setPieceTakers || {};
    if (Object.keys(r).some(k => atual[k] !== (r as any)[k])) updateSetPieceTakers(userTeam.id, r);
  }, [userTeam?.id, userTeam?.lineup]);

  if (!userTeam) return null;

  const getKitDetailsWrapper = (team: Team, kitIdx: 0 | 1 | 2 | 3) => {
    if (kitIdx === 3) return getGKKitDetails(team);
    return getKitDetails(team, kitIdx as any);
  };

  const myPlayers = players.filter(p => p.teamId === userTeam.id);
  const selectedIds = new Set([...localLineup, ...localBench]);
  const availablePlayers = myPlayers.filter(p => !selectedIds.has(p.id)).sort((a,b) => b.skill - a.skill);

  // O proximo adversario (para o Playing Against do editor de posicoes).
  const proximoAdversario = useMemo(() => {
    const f = fixtures.filter(x => !x.played && x.date >= gameState.currentDate && (x.homeTeamId === userTeam.id || x.awayTeamId === userTeam.id)).sort((a, b) => a.date.localeCompare(b.date))[0];
    if (!f) return undefined;
    return teams.find(t => t.id === (f.homeTeamId === userTeam.id ? f.awayTeamId : f.homeTeamId));
  }, [fixtures, teams, gameState.currentDate, userTeam.id]);

  const currentMatch = useMemo(() => fixtures.find(f => f.date === gameState.currentDate && (f.homeTeamId === userTeam.id || f.awayTeamId === userTeam.id)), [fixtures, gameState.currentDate, userTeam.id]);

  // A partida termina em 90 + acréscimos, não aos 90 cravados. Fixar em 90 aqui
  // bloqueava substituições justamente nos minutos finais, quando elas mais
  // acontecem. Enquanto o jogo não for dado por encerrado, dá para trocar.
  const matchEndMinute = currentMatch ? getMatchEndMinute(currentMatch.events) : 90;
  const isMatchOngoing = gameState.matchMinute > 0
    && gameState.matchMinute < matchEndMinute
    && !currentMatch?.played;
  // O jogo ja COMECOU (relogio andou, ou o 3D arrancou): o plantel (squad pool) fecha — ninguem do pool entra no banco nem no campo. As SUBSTITUICOES (banco <-> campo) continuam
  // abertas ate ao fim, enquanto houver trocas (`subsRemaining`).
  const jogoIniciado = !!currentMatch && !currentMatch.played && (gameState.matchMinute > 0 || gameState.isProcessing || typeof (window as any).motor3dMinuto === 'number');
  const isHome = currentMatch?.homeTeamId === userTeam.id;
  const subsUsed = isHome ? (currentMatch?.subsUsedHome || 0) : (currentMatch?.subsUsedAway || 0);
  const maxSubs = currentMatch?.id.startsWith('fix-friendly-') ? 7 : 5;
  const subsRemaining = Math.max(0, maxSubs - subsUsed);

  const getPlayerMatchStatus = (playerId: string) => {
    if (!currentMatch) return { yellow: false, injury: false, red: false };
    
    const pEvents = currentMatch.events.filter(e => e.playerId === playerId);
    const redIds = isHome ? (currentMatch.redCardedHome || []) : (currentMatch.redCardedAway || []);
    
    return {
      yellow: pEvents.some(e => e.type === 'CARD' && !e.description.includes('🟥') && !e.description.includes('RED')),
      red: redIds.includes(playerId) || pEvents.some(e => e.description.includes('🟥')),
      injury: players.find(p => p.id === playerId)?.injury || (pEvents.some(e => e.type === 'INJURY') ? true : undefined)
    };
  };

  // Indisponivel para a reserva: expulso (suspenso) ou lesionado — o motor tambem nao escala lesionados. O amarelo so avisa.
  // A competicao do proximo jogo (o de hoje, ou o primeiro por jogar): e nela que contam os amarelos e as suspensoes.
  const jogoDaVez = currentMatch || fixtures.filter(x => !x.played && x.date >= gameState.currentDate && (x.homeTeamId === userTeam.id || x.awayTeamId === userTeam.id)).sort((a, b) => a.date.localeCompare(b.date))[0];
  const chaveJogo = chaveCompeticao(jogoDaVez, comps);
  const suspensoNoJogo = (playerId: string) => estaSuspenso(players.find(p => p.id === playerId), chaveJogo);
  // Quem ja foi substituido neste jogo nao volta a entrar.
  const foiSubstituido = (playerId: string) =>
    !!currentMatch && !currentMatch.played && (currentMatch.events || []).some(e => e.type === 'SUB' && e.subbedOutId === playerId);
  const indisponivelParaReserva = (playerId: string) => {
    const st = getPlayerMatchStatus(playerId);
    return !!st.red || !!st.injury || suspensoNoJogo(playerId) || foiSubstituido(playerId);
  };
  // O PLAYING STYLE do jogador, pela mesma ordem do PlayerDetailModal: ajuste manual, o definido no jogador, o da base e, por fim, o primeiro que serve a posicao dele.
  const estiloDoJogador = (p: Player): string => estiloValidoDoJogador(p,
    PLAYSTYLE_AJUSTES[`${userTeam.name}|${p.name}`], p.playStyle, PLAYSTYLE_DA_BASE[p.id]);
  // O icone do Playing Style nos cards do banco e do squad pool (so com o botao Playing Styles ligado).
  const iconeDoEstilo = (p: Player, tam = 24) => userTeam.tactics.playingStylesOn === false ? null : (
    <IconeEstilo estilo={estiloDoJogador(p)} tam={tam} />
  );
  const nomeDaCompeticao = (chave: string | null) => !chave ? '' : chave === 'LEAGUE' ? 'LEAGUE' : String((comps || []).find(c => c.id === chave)?.name || chave).toUpperCase();
  const AvisosDoCard = ({ playerId }: { playerId: string }) => {
    const st = getPlayerMatchStatus(playerId);
    const susp = suspensoNoJogo(playerId);
    const acum = (chaveJogo && players.find(p => p.id === playerId)?.amarelos?.[chaveJogo]) || 0;
    if (!st.yellow && !st.red && !st.injury && !susp && !acum) return null;
    const jog = players.find(p => p.id === playerId);
    const jogosSusp = (chaveJogo && jog?.suspenso?.[chaveJogo]) || (st.red ? 1 : 0);
    const motivoSusp = (chaveJogo && jog?.suspMotivo?.[chaveJogo]) || 'RED CARD';
    const inj: any = st.injury;
    const tipoLesao = inj && typeof inj === 'object' ? String(inj.type || 'Injury') : 'Injury';
    const diasLesao = inj && typeof inj === 'object' ? inj.daysOut : null;
    // Compacto, ao lado do nome: CARD (amarelo ou vermelho) e INJ (verde). O detalhe (cartao, competicao, jogos, lesao e dias) fica no title (passar o mouse).
    const comp = nomeDaCompeticao(chaveJogo);
    return (
      <span className="inline-flex items-center gap-1 shrink-0 leading-none">
        <span className="text-slate-500 text-[9px] font-black">|</span>
        {(st.yellow || acum > 0) && !st.red && !susp && <span className="text-[10px] font-black text-yellow-400 cursor-help" title={`Yellow card${acum > 0 ? ` ${acum}/${AMARELOS_PARA_SUSPENSAO}` : ''}${comp ? ' - ' + comp : ''}`}>CARD</span>}
        {(st.red || susp) && <span className="text-[10px] font-black text-red-500 cursor-help" title={`${motivoSusp} [${jogosSusp}]${comp ? ' - ' + comp : ''}`}>CARD</span>}
        {st.injury && <span className="text-[10px] font-black text-emerald-500 cursor-help" title={`${tipoLesao}${diasLesao !== null ? ` [${diasLesao}]` : ''}`}>INJ</span>}
      </span>
    );
  };

  // O Chemistry e o mesmo do Training Center (textSim/quimica.ts); aqui com a escalacao em edicao.
  const teamChemistry = useMemo(() => {
    const starters = localLineup
      .map(id => players.find(p => p.id === id))
      .filter((p): p is Player => !!p && !getPlayerMatchStatus(p.id).red);
    return calcularQuimica(starters, userTeam.tactics.formation, userTeam.synergyMap);
  }, [localLineup, players, userTeam.tactics.formation, userTeam.synergyMap]);

  // O banco tem sempre 10 (antes do jogo): vagas vazias (jogador vendido ou contrato expirado) e bancos curtos enchem-se com os melhores do plantel que nao estao no onze nem no banco.
  // Le SEMPRE do time (userTeam), nunca do estado local — que nasce vazio e apagava a escalacao ao correr no primeiro render.
  React.useEffect(() => {
    if (isMatchOngoing || !userTeam || !userTeam.lineup || userTeam.lineup.filter(Boolean).length < 11) return;
    const banco = userTeam.bench || [];
    const validos = banco.filter(id => id && players.some(p => p.id === id && p.teamId === userTeam.id));
    if (validos.length >= 10 && validos.length === banco.length) return;
    const usados = new Set([...userTeam.lineup.filter(Boolean), ...validos]);
    const livres = players.filter(p => p.teamId === userTeam.id && !usados.has(p.id) && !p.injury).sort((a, b) => b.skill - a.skill);
    // A composicao do banco: 1 GK, 3 defesas, 3 meias, 3 atacantes — os melhores de cada grupo (as vagas vazias enchem-se por grupo; o que sobrar, com os melhores do plantel).
    const grupo = (pos: Position) => pos === Position.GK ? 'GK' : [Position.LB, Position.CB, Position.RB].includes(pos) ? 'DEF' : [Position.LW, Position.RW, Position.SS, Position.ST].includes(pos) ? 'ATA' : 'MEIO';
    const quota: Record<string, number> = { GK: 1, DEF: 3, MEIO: 3, ATA: 3 };
    const novo = [...validos];
    const contagem: Record<string, number> = { GK: 0, DEF: 0, MEIO: 0, ATA: 0 };
    for (const id of validos) { const pl = players.find(p => p.id === id); if (pl) contagem[grupo(pl.position)]++; }
    for (const g of ['GK', 'DEF', 'MEIO', 'ATA']) {
      while (contagem[g] < quota[g] && novo.length < 10) {
        const melhor = livres.find(p => grupo(p.position) === g);
        if (!melhor) break;
        novo.push(melhor.id); livres.splice(livres.indexOf(melhor), 1); contagem[g]++;
      }
    }
    while (novo.length < 10 && livres.length) novo.push(livres.shift()!.id);
    if (novo.length === banco.length && novo.every((id, i) => id === banco[i])) return;
    updateTactics(userTeam.id, {}, userTeam.lineup, novo);
  }, [userTeam?.bench, userTeam?.lineup, players, isMatchOngoing, userTeam?.id]);

  const handleDropToLineup = (playerId: string, index: number) => {
    let newLineup = [...localLineup];
    let newBench = [...localBench];
    const existingLineupIndex = newLineup.indexOf(playerId);
    const existingBenchIndex = newBench.indexOf(playerId);
    
    const targetIsRed = newLineup[index] ? getPlayerMatchStatus(newLineup[index]).red : false;
    const playerToMoveIsRed = getPlayerMatchStatus(playerId).red;

    // RULE: Red carded players cannot be moved
    if (playerToMoveIsRed) return;
    // Suspenso no proximo jogo (cartoes): nao entra na escalacao.
    if (suspensoNoJogo(playerId)) return;

    if (existingLineupIndex !== -1) {
      if (targetIsRed) {
        // RECOMPOSITION: Dragging to replace a red player
        // Expelled player is effectively "superseded" at that slot
        // BUT user said "A posição que o jogador foi arrastado ficará sem ninguém"
        newLineup[index] = playerId;
        newLineup[existingLineupIndex] = ''; // LEAVE HOLE
      } else {
        const playerAlreadyAtSlot = newLineup[index];
        newLineup[index] = playerId;
        newLineup[existingLineupIndex] = playerAlreadyAtSlot;
      }
    } else if (existingBenchIndex !== -1) {
      // Substitution from bench
      if (isMatchOngoing && subsRemaining <= 0) return;
      if (foiSubstituido(playerId)) return;
      
      const playerAlreadyAtSlot = newLineup[index];
      newLineup[index] = playerId;
      
      if (playerAlreadyAtSlot && !targetIsRed) {
        newBench[existingBenchIndex] = playerAlreadyAtSlot;
      } else {
        newBench = newBench.filter(id => id !== playerId);
      }
    } else {
      // Com o jogo iniciado o plantel (squad pool) ja nao troca com o campo: so o banco entra (substituicao).
      if (jogoIniciado) return;
      newLineup[index] = playerId;
    }
    
    setLocalLineup(newLineup);
    setLocalBench(newBench);
    updateTactics(userTeam.id, {}, newLineup, newBench);
  };

  const handleDropToBench = (playerId: string) => {
    setIsOverBench(false);
    let newLineup = [...localLineup];
    let newBench = [...localBench];
    const existingLineupIndex = newLineup.indexOf(playerId);
    const existingBenchIndex = newBench.indexOf(playerId);
    if (existingBenchIndex !== -1) return; 
    if (indisponivelParaReserva(playerId)) return;
    // Com o jogo iniciado o banco fecha: nem o plantel entra nele, nem quem esta em campo volta para ele (uma substituicao feita e feita).
    if (jogoIniciado) return;
    if (existingLineupIndex !== -1) {
       if (newBench.length < 10) {
          newLineup[existingLineupIndex] = '';
          newBench.push(playerId);
       }
    } else if (newBench.length < 10) {
          newBench.push(playerId);
    }
    setLocalLineup(newLineup);
    setLocalBench(newBench);
    updateTactics(userTeam.id, {}, newLineup, newBench);
  };

  const handleBenchSwap = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    let newLineup = [...localLineup];
    let newBench = [...localBench];
    const sL = newLineup.indexOf(sourceId);
    const sB = newBench.indexOf(sourceId);
    const tB = newBench.indexOf(targetId);
    if (tB === -1) return;
    if (foiSubstituido(sourceId) || foiSubstituido(targetId)) return;
    if (sB === -1 && indisponivelParaReserva(sourceId)) return;
    // Com o jogo iniciado o plantel nao troca com o banco: so se reordena o banco ou se faz a SUBSTITUICAO (titular <-> banco, arrastando o titular para o card do suplente).
    if (jogoIniciado && sB === -1 && sL === -1) return;
    if (isMatchOngoing && sL !== -1 && subsRemaining <= 0) return;
    if (sL !== -1) {
      newLineup[sL] = targetId;
      newBench[tB] = sourceId;
    } else if (sB !== -1) {
      newBench[tB] = sourceId;
      newBench[sB] = targetId;
    } else {
      newBench[tB] = sourceId;
    }
    setLocalLineup(newLineup);
    setLocalBench(newBench);
    updateTactics(userTeam.id, {}, newLineup, newBench);
  };

  const removeFromSquad = (playerId: string) => {
    if (isMatchOngoing) return;
    const newLineup = localLineup.map(id => id === playerId ? '' : id);
    const newBench = localBench.filter(id => id !== playerId);
    setLocalLineup(newLineup);
    setLocalBench(newBench);
    updateTactics(userTeam.id, {}, newLineup, newBench);
  };

  const currentPositions = FORMATIONS[userTeam.tactics.formation] || FORMATIONS['4-4-2'];
  const sorted_bench = [...localBench].sort((aId, bId) => {
    const pa = players.find(p => p.id === aId);
    const pb = players.find(p => p.id === bId);
    if (!pa || !pb) return 0;
    return POSITION_ORDER[pa.position] - POSITION_ORDER[pb.position];
  });

  // Designa (ou remove, com `undefined`) o jogador de uma funcao: capitao e cobradores. Um jogador pode ter varias funcoes; so e do plantel do time.
  const assignSetPiece = (role: SetPieceRole, playerId?: string) => {
    if (playerId && !players.some(x => x.id === playerId && x.teamId === userTeam.id)) return;
    const atual = { ...(userTeam.setPieceTakers || {}) };
    if (playerId) atual[role] = playerId; else delete atual[role];
    updateSetPieceTakers(userTeam.id, atual);
  };

  // A MEDIA DAS NOTAS de cada jogador nos jogos disputados (os `playerRatings` das partidas jogadas): { playerId -> media }. Mostrada nos cards quando `mediaNotasOn` nao e false.
  const mediasDeNotas = useMemo(() => {
    const soma: Record<string, { s: number; n: number }> = {};
    for (const f of fixtures) {
      if (!f.played || !f.playerRatings) continue;
      for (const [id, nota] of Object.entries(f.playerRatings)) { if (typeof nota !== 'number') continue; const e = soma[id] || (soma[id] = { s: 0, n: 0 }); e.s += nota; e.n++; }
    }
    const r: Record<string, number> = {};
    for (const id of Object.keys(soma)) r[id] = soma[id].s / soma[id].n;
    return r;
  }, [fixtures]);
  const mediaNotas = (p: Player | null | undefined): string | null => (userTeam.tactics.mediaNotasOn === false || !p || mediasDeNotas[p.id] === undefined) ? null : mediasDeNotas[p.id].toFixed(1);
  // A nota num retangulo arredondado ao lado do nome: >= 7.0 verde, <= 6.0 vermelho, entre os dois cinza; letra branca.
  const etiquetaNota = (p: Player | null | undefined) => {
    const txt = mediaNotas(p);
    if (!txt || !p) return null;
    const v = mediasDeNotas[p.id];
    const fundo = v >= 7 ? 'bg-emerald-600' : v <= 6 ? 'bg-red-600' : 'bg-slate-500';
    return <span className={`ml-1 px-2 py-1 rounded-md text-white text-[13px] font-black leading-none ${fundo}`}>{txt}</span>;
  };

  const handleTacticChange = (field: keyof Tactics, value: any) => {
    let finalValue = value;
    if (field === 'defensiveLine') {
        finalValue = Math.max(30, value);
    }
    // Objetividade e Estilo Ofensivo sao a mesma coisa: o estilo escolhido manda, e o `tempo` (0-100, que a simulacao rapida usa) acompanha-o.
    const TEMPO_DO_ESTILO: Record<string, number> = { possession: 20, positional: 50, direct: 80, counter_attack: 70, wing_play: 55 };
    // Nas formacoes 4-3-3, 4-3-3 ATA e 4-2-3-1 os setores por omissao sao Left e Right.
    if (field === 'formation' && setoresPadraoDaFormacao(finalValue)) { updateTactics(userTeam.id, { formation: finalValue, focusSectors: setoresPadraoDaFormacao(finalValue) }); return; }
    updateTactics(userTeam.id, field === 'playStyle' ? { playStyle: finalValue, tempo: TEMPO_DO_ESTILO[finalValue] ?? 50 } : { [field]: finalValue });
  };

  // O editor das posicoes (antes o modal): ajustes por formacao, fase e zona da bola. O campo desenha a area de jogo dentro de `inset-10` (2.5rem de cada lado).
  const formacaoAtual = userTeam.tactics.formation;
  const vaziosDoOnze = slotsVazios(userTeam, players, jogoIniciado);   // slots sem jogador: o jogo fica fechado ate completar o onze
  const overAtual = userTeam.tactics.zoneOverrides?.[formacaoAtual];
  const temTabela = formacaoTemTabela(formacaoAtual);
  const postos = (temTabela && aba !== 'geral' && zona !== null) ? postosEfetivos(formacaoAtual, overAtual, fase, zona) : null;
  // A cor do adversario: a da paleta que mais se afasta da camisa do time (distancia RGB), para contrastar sempre.
  const corContra = (() => {
    const rgb = (h: string) => { const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(h || ''); return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [226, 232, 240]; };
    const meu = rgb((showMatchKit ? (getKitDetails(userTeam, selectedKitIdx === 3 ? 0 : selectedKitIdx) as any).c1 : '') || '');
    const paleta = ['#dc2626', '#facc15', '#2563eb', '#16a34a', '#111827', '#f8fafc', '#a855f7', '#f97316'];
    let melhor = paleta[0], dMax = -1;
    for (const c of paleta) { const q = rgb(c); const d = (q[0] - meu[0]) ** 2 + (q[1] - meu[1]) ** 2 + (q[2] - meu[2]) ** 2; if (d > dMax) { dMax = d; melhor = c; } }
    return melhor;
  })();
  const corTextoContra = (() => { const m = /^#(..)(..)(..)/.exec(corContra)!; return (parseInt(m[1], 16) * 299 + parseInt(m[2], 16) * 587 + parseInt(m[3], 16) * 114) / 1000 > 140 ? '#111827' : '#ffffff'; })();
  const faseContra: FaseZona = fase === 'com' ? 'sem' : 'com';
  const contraForm = formContra === 'ADV' ? (proximoAdversario ? proximoAdversario.tactics.formation : formacaoAtual) : formContra;
  const contraOver = formContra === 'ADV' && proximoAdversario ? proximoAdversario.tactics.zoneOverrides?.[contraForm] : undefined;
  const postosContra = (contra && aba !== 'geral' && zona !== null && formacaoTemTabela(contraForm)) ? postosEfetivos(contraForm, contraOver, faseContra, 8 - zona) : [];
  const emCampo = (x: number, z: number, invertido = false) => {
    const fx = (50 - (invertido ? -x : x) * 50) / 100, fz = (1 - (invertido ? -z : z)) * 0.5;
    return { left: `${fx * 100}%`, top: `${fz * 100}%` };
  };
  const rotulosFormacao = FORMATIONS[formacaoAtual].map(s => s.label);
  const aplicarOver = (o: any) => {
    const todos = { ...(userTeam.tactics.zoneOverrides || {}) };
    if (o) todos[formacaoAtual] = o; else delete todos[formacaoAtual];
    updateTactics(userTeam.id, { zoneOverrides: Object.keys(todos).length ? todos : undefined });
  };
  // Toque num cartao: seleciona/deseleciona; com um selecionado, toque noutro faz a troca (as MESMAS regras do arrastar: ver handleDropToLineup / handleBenchSwap).
  const tocarNoCampo = (idx: number) => {
    const noSlot = localLineup[idx];
    if (selecionado && selecionado !== noSlot) { handleDropToLineup(selecionado, idx); setSelecionado(null); }
    else if (noSlot) setSelecionado(selecionado === noSlot ? null : noSlot);
  };
  const tocarNoBanco = (id: string) => {
    if (selecionado && selecionado !== id) { handleBenchSwap(selecionado, id); setSelecionado(null); }
    else setSelecionado(selecionado === id ? null : id);
  };
  const tocarNoPool = (id: string) => setSelecionado(selecionado === id ? null : id);
  const tocarNoPainelDoBanco = () => { if (selecionado) { handleDropToBench(selecionado); setSelecionado(null); } };
  const zonaEfetiva = zona ?? 4;
  // Arrastar um posto no campo (abas COM/SEM BOLA): da posicao do ponteiro para x,z normalizados (a area de jogo fica dentro de `inset-10`, 40 px de cada lado).
  const paraCampo = (clientX: number, clientY: number) => {
    const r = campoRef.current!.getBoundingClientRect();
    const left = (clientX - r.left) / r.width, top = (clientY - r.top) / r.height;
    const c = (v: number) => Math.max(-0.95, Math.min(0.95, v));
    return { x: c((0.5 - left) * 2), z: c(1 - top * 2) };
  };
  const btnAcao = 'text-white bg-indigo-600/90 hover:bg-indigo-500';
  const btnQuadrado = 'h-[46px] shrink-0 p-1 rounded-lg text-[10px] font-black uppercase tracking-wider leading-tight text-center flex items-center justify-center transition-colors';
  const btnRepor = 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700';

  return (
    <div className="flex flex-col gap-4 animate-fade-in" style={{ height: 'calc(100vh - 80px)' }}>
        {avisoGoleiro && (
          <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[250] bg-rose-700 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg shadow-xl">
            Goalkeeper sent off — take off an outfield player and bring on a goalkeeper
          </div>
        )}
        {showZonas && <ZonePositionsModal team={userTeam} adversario={proximoAdversario} players={players} onClose={() => setShowZonas(false)} onLoadTactics={(t) => updateTactics(userTeam.id, { ...t, zoneOverrides: t.zoneOverrides })}
            onChange={(over) => { const todos = { ...(userTeam.tactics.zoneOverrides || {}) }; if (over) todos[userTeam.tactics.formation] = over; else delete todos[userTeam.tactics.formation]; updateTactics(userTeam.id, { zoneOverrides: Object.keys(todos).length ? todos : undefined }); }} />}
        {presetFoco && <TacticPresetsModal atual={userTeam.tactics} foco={presetFoco} onClose={() => setPresetFoco(null)} onLoad={(t) => updateTactics(userTeam.id, { ...t, zoneOverrides: t.zoneOverrides })} />}
        {showPreview && <MatchPreviewModal userTeam={userTeam} adversario={proximoAdversario} players={players} kitDoUtilizador={kitDeCampo} onClose={() => setShowPreview(false)} />}
        {showPresets && <TacticPresetsModal atual={userTeam.tactics} onClose={() => setShowPresets(false)} onLoad={(t) => updateTactics(userTeam.id, { ...t, zoneOverrides: t.zoneOverrides })} />}
        {vaziosDoOnze.length > 0 && (
            <div className="shrink-0 bg-rose-600/20 border border-rose-500 text-rose-300 rounded-lg px-4 py-2 text-[12px] font-black uppercase tracking-wider">
                Incomplete line-up: {vaziosDoOnze.length} player(s) missing ({vaziosDoOnze.map(i => currentPositions[i]?.label).filter(Boolean).join(', ')}). Match Day and round simulation stay locked until the starting XI is complete.
            </div>
        )}
        <div className="flex justify-between items-center shrink-0">
            <h2 className="text-4xl font-black italic tracking-tighter uppercase">
                <span className="text-slate-300 dark:text-slate-600">MATCH</span> <span className="text-blue-400">TACTICS</span>
            </h2>
            <div className="flex items-center gap-3">
                 {isMatchOngoing && setView && (
                    <button onClick={() => setView(localStorage.getItem('activeMatchView') === 'MATCH' ? 'MATCH' : 'TRAINING')} className="bg-emerald-600 text-white text-[10px] font-black uppercase px-4 py-2 rounded">Resume</button>
                 )}
                 <button onClick={() => setShowPreview(true)} title="Opens the line-ups of both teams side by side" className="bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded shadow">Match Preview</button>
            </div>
        </div>

        <div className={`flex-1 grid gap-[5px] min-h-0 ${largo ? 'grid-cols-[5.6fr_3.7fr_3fr]' : 'grid-cols-3 overflow-y-auto custom-scrollbar content-start'}`}>   {/* tablet: o campo com os reservas em cima (linha inteira) e, em baixo, em UMA linha de 3 colunas IGUAIS: Squad Pool | Set Pieces | Kit + Tactical Instructions */}
            <div className="flex flex-col gap-[3px] min-h-0 min-w-0" style={largo ? { width: 'calc(100% + 129px)' } : { minHeight: 700, gridColumn: '1 / -1' }}>
                <div className="flex-1 relative bg-slate-50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-900/30 overflow-hidden select-none shadow-inner" style={{ minHeight: '350px', containerType: 'size' }}>
                    {aba === 'geral' && (
                        <button onClick={() => handleTacticChange('playingStylesOn' as keyof Tactics, userTeam.tactics.playingStylesOn === false)} title="Turns the players' individual Playing Styles on or off in the 3D match"
                            className={`absolute top-[7.25rem] right-1 z-20 flex items-center gap-1.5 px-2.5 py-1.5 min-h-[32px] rounded-full border text-[9px] font-black uppercase tracking-widest transition-colors ${userTeam.tactics.playingStylesOn === false ? 'bg-slate-800 border-slate-600 text-slate-400' : 'bg-emerald-600 border-emerald-400 text-white'}`}>
                            Playing Styles <span className={`px-2 py-0.5 rounded-full text-[9px] ${userTeam.tactics.playingStylesOn === false ? 'bg-slate-600 text-slate-200' : 'bg-emerald-900/60 text-emerald-100'}`}>{userTeam.tactics.playingStylesOn === false ? 'OFF' : 'ON'}</span>
                        </button>
                    )}
                    {aba === 'geral' && (
                        <button onClick={() => handleTacticChange('mediaNotasOn' as keyof Tactics, userTeam.tactics.mediaNotasOn === false)} title="Shows the average of each player's match ratings on the cards"
                            className={`absolute top-[9.75rem] right-1 z-20 flex items-center gap-1.5 px-2.5 py-1.5 min-h-[32px] rounded-full border text-[9px] font-black uppercase tracking-widest transition-colors ${userTeam.tactics.mediaNotasOn === false ? 'bg-slate-800 border-slate-600 text-slate-400' : 'bg-emerald-600 border-emerald-400 text-white'}`}>
                            Avg Ratings <span className={`px-2 py-0.5 rounded-full text-[9px] ${userTeam.tactics.mediaNotasOn === false ? 'bg-slate-600 text-slate-200' : 'bg-emerald-900/60 text-emerald-100'}`}>{userTeam.tactics.mediaNotasOn === false ? 'OFF' : 'ON'}</span>
                        </button>
                    )}
                    {aba === 'geral' && (
                        <button onClick={() => handleTacticChange('playerFacesOn' as keyof Tactics, userTeam.tactics.playerFacesOn === false)} title="Shows each player's face above the shirt on the pitch"
                            className={`absolute top-[12.25rem] right-1 z-20 flex items-center gap-1.5 px-2.5 py-1.5 min-h-[32px] rounded-full border text-[9px] font-black uppercase tracking-widest transition-colors ${userTeam.tactics.playerFacesOn === false ? 'bg-slate-800 border-slate-600 text-slate-400' : 'bg-emerald-600 border-emerald-400 text-white'}`}>
                            Player Faces <span className={`px-2 py-0.5 rounded-full text-[9px] ${userTeam.tactics.playerFacesOn === false ? 'bg-slate-600 text-slate-200' : 'bg-emerald-900/60 text-emerald-100'}`}>{userTeam.tactics.playerFacesOn === false ? 'OFF' : 'ON'}</span>
                        </button>
                    )}
                    <div className="absolute top-6 left-6 z-20 flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700">
                        {([['geral', 'GENERAL'], ['com', 'WITH BALL'], ['sem', 'WITHOUT BALL']] as const).map(([v, r]) => (
                            <button key={v} onClick={() => { setAba(v); if (v !== 'geral' && zona === null) setZona(4); }} className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${aba === v ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>{r}</button>
                        ))}
                    </div>

                    {/* OS BOTOES DAS POSICOES: dentro do campo, so nas abas COM BOLA / SEM BOLA. */}
                    {aba !== 'geral' && temTabela && (
                        <div className="absolute top-24 right-3 z-20 flex flex-col gap-1.5 w-[132px]">
                            {contra && (
                                <select value={formContra} onChange={e => setFormContra(e.target.value)} className="px-1 py-1.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[9px] font-bold text-slate-700 dark:text-white">
                                    {proximoAdversario && formacaoTemTabela(proximoAdversario.tactics.formation) && <option value="ADV">{proximoAdversario.name} ({proximoAdversario.tactics.formation})</option>}
                                    {Object.keys(FORMATIONS).filter(formacaoTemTabela).map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            )}
                            <button onClick={() => setContra(c => !c)} className={`${btnQuadrado} ${contra ? 'bg-red-600 text-white' : btnRepor}`} title="Shows, in another colour, where the opposing system sits with the ball in the chosen zone">Playing Against</button>
                            <button onClick={() => aplicarOver(espelharZona(formacaoAtual, rotulosFormacao, overAtual, fase, zonaEfetiva, zonaEfetiva))} className={`${btnQuadrado} ${btnAcao}`} title="Swaps left and right in this zone">Flip zone (L ⇄ R)</button>
                            {zonaEspelhada(zonaEfetiva) !== zonaEfetiva && <button onClick={() => aplicarOver(espelharZona(formacaoAtual, rotulosFormacao, overAtual, fase, zonaEfetiva, zonaEspelhada(zonaEfetiva)))} className={`${btnQuadrado} ${btnAcao}`} title="Copies these positions, mirrored, to the zone on the other side">Copy mirrored → {NOME_DA_ZONA[zonaEspelhada(zonaEfetiva)]}</button>}
                            <button onClick={() => aplicarOver(espelharFase(formacaoAtual, rotulosFormacao, overAtual, fase, zonaEfetiva))} className={`${btnQuadrado} ${btnAcao}`}>Mirror {fase === 'com' ? 'with ball' : 'without ball'} (rows)</button>
                            <button onClick={() => aplicarOver(repor(overAtual, fase, zonaEfetiva))} className={`${btnQuadrado} ${btnRepor}`}>Reset this zone</button>
                            <button onClick={() => aplicarOver(repor(overAtual, fase))} className={`${btnQuadrado} ${btnRepor}`}>Reset {fase === 'com' ? 'with ball' : 'without ball'} (zones)</button>
                            <button disabled={!temAjustes(overAtual)} onClick={() => aplicarOver(undefined)} className={`${btnQuadrado} bg-rose-600/80 disabled:opacity-30 text-white hover:bg-rose-600`}>Reset whole formation</button>
                            <>
                                <button onClick={() => setPresetFoco('save')} className={`${btnQuadrado} bg-emerald-600 text-white hover:bg-emerald-500`} title="Saves the current tactic (formation, style and positions)">Save</button>
                                <button onClick={() => setPresetFoco('load')} className={`${btnQuadrado} bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600`} title="Loads a saved tactic or one from a .json file">Load</button>
                            </>
                        </div>
                    )}

                    <div className="absolute top-6 right-6 z-10 flex flex-col items-end">
                        <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest leading-none mb-1">CHEMISTRY</span>
                        <div className="flex items-baseline">
                            <span className="text-5xl font-black text-slate-300 dark:text-white/20 italic leading-none tracking-tighter">{teamChemistry}</span>
                            <span className="text-2xl font-black text-blue-300/50 italic">%</span>
                        </div>
                    </div>

                    {/* O CAMPO PROPORCIONAL: uma caixa 68:106 centrada na area (a margem de 2.5rem em cima e em baixo); linhas, zonas e jogadores vivem dentro dela, em percentagem. */}
                    <div ref={campoRef} className="absolute" style={{ top: '2.5rem', bottom: '2.5rem', left: '50%', transform: 'translateX(calc(-50% - 50px))', width: 'calc((100cqh - 5rem) * 68 / 106 + 140px)' }}>
                    {/* O campo em metros (68 x 106, as medidas do motor), esticado na area de jogo: linhas, circulo central, areas, marcas de penalti, meias-luas e cantos. */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none text-slate-500 dark:text-slate-300" viewBox="0 0 68 106" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="1.6" strokeOpacity="0.85">
                        <rect x="0" y="0" width="68" height="106" vectorEffect="non-scaling-stroke" />
                        <line x1="0" y1="53" x2="68" y2="53" vectorEffect="non-scaling-stroke" />
                        <ellipse cx="34" cy="53" rx="9.15" ry="9.15" vectorEffect="non-scaling-stroke" />
                        <circle cx="34" cy="53" r="0.5" fill="currentColor" vectorEffect="non-scaling-stroke" />
                        <rect x="13.84" y="0" width="40.32" height="16.5" vectorEffect="non-scaling-stroke" />
                        <rect x="24.84" y="0" width="18.32" height="5.5" vectorEffect="non-scaling-stroke" />
                        <circle cx="34" cy="11" r="0.5" fill="currentColor" vectorEffect="non-scaling-stroke" />
                        <path d="M 26.69 16.5 A 9.15 9.15 0 0 0 41.31 16.5" vectorEffect="non-scaling-stroke" />
                        <rect x="13.84" y="89.5" width="40.32" height="16.5" vectorEffect="non-scaling-stroke" />
                        <rect x="24.84" y="100.5" width="18.32" height="5.5" vectorEffect="non-scaling-stroke" />
                        <circle cx="34" cy="95" r="0.5" fill="currentColor" vectorEffect="non-scaling-stroke" />
                        <path d="M 26.69 89.5 A 9.15 9.15 0 0 1 41.31 89.5" vectorEffect="non-scaling-stroke" />
                        <path d="M 1 0 A 1 1 0 0 1 0 1" vectorEffect="non-scaling-stroke" />
                        <path d="M 67 0 A 1 1 0 0 0 68 1" vectorEffect="non-scaling-stroke" />
                        <path d="M 0 105 A 1 1 0 0 1 1 106" vectorEffect="non-scaling-stroke" />
                        <path d="M 68 105 A 1 1 0 0 0 67 106" vectorEffect="non-scaling-stroke" />
                    </svg>

                    {/* As nove zonas da bola: clicar escolhe a zona (hachurada) e as camisas vao para os postos dela; clicar outra vez desmarca. */}
                    {aba !== 'geral' && formacaoTemTabela(userTeam.tactics.formation) && (() => {
                        const c = ZONAS.corredorX / ZONAS.meiaLargura, t = ZONAS.terco / ZONAS.meiaAltura;
                        const xs = [0, (1 - c) / 2, (1 + c) / 2, 1], ys = [0, (1 - t) / 2, (1 + t) / 2, 1];
                        return (
                            <div className="absolute inset-0 z-[5]">
                                {[1, 2].map(k => <div key={'v' + k} className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `${xs[k] * 100}%`, borderLeft: '1px dashed rgba(226,232,240,0.35)' }} />)}
                                {[1, 2].map(k => <div key={'h' + k} className="absolute left-0 right-0 pointer-events-none" style={{ top: `${ys[k] * 100}%`, borderTop: '1px dashed rgba(226,232,240,0.35)' }} />)}
                                {[0, 1, 2].map(r => [0, 1, 2].map(v => {
                                    const z = (2 - r) * 3 + (2 - v);
                                    const sel = zona === z;
                                    return (
                                        <div key={z} onClick={() => { if (Date.now() - fimDoArrasto.current < 500) return; setZona(sel ? null : z); }} title={NOME_DA_ZONA[z]}
                                            className={`absolute cursor-pointer transition-colors ${sel ? 'border border-blue-400/70' : 'hover:bg-blue-400/10'}`}
                                            style={{ left: `${xs[v] * 100}%`, width: `${(xs[v + 1] - xs[v]) * 100}%`, top: `${ys[r] * 100}%`, height: `${(ys[r + 1] - ys[r]) * 100}%`,
                                                backgroundImage: sel ? 'repeating-linear-gradient(45deg, rgba(96,165,250,0.35) 0, rgba(96,165,250,0.35) 2px, transparent 2px, transparent 9px)' : undefined }} />
                                    );
                                }))}
                            </div>
                        );
                    })()}

                    {postosContra.map((p, i) => (
                        <div key={'c' + i} className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-60 z-[6] flex items-center justify-center rounded-md border font-black leading-none shadow-sm" style={{ ...emCampo(p.x, p.z, true), width: 54, height: 34, fontSize: 12, background: corContra, borderColor: 'rgba(255,255,255,0.5)', color: corTextoContra }}>{FORMATIONS[contraForm][i]?.label}</div>
                    ))}

                    {currentPositions.map((pos, idx) => {
                        const pId = localLineup[idx];
                        const player = players.find(p => p.id === pId);
                        let color = '#e2e8f0';
                        let color2: string | undefined = undefined;
                        let color3: string | undefined = undefined;
                        let kitNumberColor: string | undefined = undefined;
                        let kitCollarColor: string | undefined = undefined;
                        let kitNoc: string | undefined = undefined;
                        let kitDiag = false;
                        let kitHoriz = false;
                        let kitMultiDiag = false;
                        let kitDualDiag = false;
                        let kitCenterVert = false;
                        let kitCriciuma = false;
                        let kitDiagW: number | undefined = undefined;
                        let kitSleeveWidth: number | undefined = undefined; 
                        let kitSleeve: string | undefined = undefined;
                        
                        if (showMatchKit) {
                            const details = (player?.position === Position.GK || pos.label === 'GK') 
                                ? getGKKitDetails(userTeam, kitDeCampo) 
                                : getKitDetails(userTeam, kitDeCampo);
                            color = details.c1; color2 = details.c2; color3 = details.c3; 
                            kitNumberColor = details.nc; kitCollarColor = details.clc; kitNoc = details.noc;
                            kitDiag = !!details.diagonal;
                            kitHoriz = !!details.horizontal;
                            kitMultiDiag = !!details.multipleDiagonals;
                            kitDualDiag = !!(details as any).dualDiagonal;
                            kitCenterVert = !!(details as any).centerVerticalStripes;
                            kitCriciuma = !!(details as any).criciumaStripes;
                            kitDiagW = details.diagonalWidth;
                            kitSleeve = details.sc;
                        } else color = player ? getPosColor(player.position) : '#e2e8f0';
                        const isOutOfPos = player ? !checkPosMatch(pos.label, player.position) : false;
                        const status = player ? getPlayerMatchStatus(player.id) : null;
                        const isRed = !!status?.red;

                        // COM BOLA / SEM BOLA: so o posto — um retangulo 30x20 com o numero e a posicao, no uniforme, e o nome por baixo.
                        if (aba !== 'geral') {
                            return (
                                <div key={idx} onDragOver={(e) => e.preventDefault()} onClick={() => { if (!postos) tocarNoCampo(idx); }} onDrop={(e) => handleDropToLineup(e.dataTransfer.getData("playerId"), idx)} className={`absolute flex flex-col items-center z-10 ${arrasto?.slot === idx ? '' : 'transition-all duration-500'}`} style={{ ...(arrasto?.slot === idx ? emCampo(arrasto.x, arrasto.z) : postos && postos[idx] ? emCampo(postos[idx].x, postos[idx].z) : { left: `${pos.x}%`, top: `${pos.y}%` }), transform: `translate(-50%, ${pos.label === 'GK' ? 5 : -15}px)`, opacity: isRed ? 0.2 : 1 }}>
                                    <div
                                        onPointerDown={e => { if (!postos) return; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setArrasto({ slot: idx, ...paraCampo(e.clientX, e.clientY) }); }}
                                        onPointerMove={e => { if (arrasto && arrasto.slot === idx) setArrasto({ slot: idx, ...paraCampo(e.clientX, e.clientY) }); }}
                                        onPointerUp={e => { if (arrasto && arrasto.slot === idx) { fimDoArrasto.current = Date.now(); e.stopPropagation(); aplicarOver(moverPosto(formacaoAtual, overAtual, fase, zonaEfetiva, idx, arrasto.x, arrasto.z)); setArrasto(null); } }}
                                        onPointerCancel={() => { if (arrasto && arrasto.slot === idx) { fimDoArrasto.current = Date.now(); setArrasto(null); } }}
                                        className="flex items-center justify-center rounded-md border whitespace-nowrap font-black leading-none shadow-sm cursor-grab active:cursor-grabbing touch-none select-none"
                                        style={{ filter: player ? undefined : 'brightness(0.3)', width: 54, height: 34, fontSize: 12, background: color, borderColor: kitNoc || kitCollarColor || 'rgba(255,255,255,0.4)', color: kitNumberColor || '#fff', textShadow: kitNoc ? `0 0 1px ${kitNoc}` : undefined }}>
                                        {player?.shirtNumber ?? '-'}{' | '}{pos.label}
                                    </div>
                                    <span className="mt-0.5 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap">{player && userTeam.tactics.playingStylesOn !== false && <IconeEstilo estilo={estiloDoJogador(player)} tam={18} className="mr-1 align-middle" />}{player ? player.name.split(' ').pop() : '---'}{etiquetaNota(player)}</span>
                                </div>
                            );
                        }

                        return (
                            <div key={idx} onDragOver={(e) => e.preventDefault()} onClick={() => tocarNoCampo(idx)} onDrop={(e) => handleDropToLineup(e.dataTransfer.getData("playerId"), idx)} className={`absolute flex flex-col items-center justify-center w-24 h-24 transition-all duration-500 z-10 ${player && selecionado === player.id ? 'ring-4 ring-blue-400 rounded-xl bg-blue-400/20' : ''}`} style={{ ...(postos && postos[idx] ? emCampo(postos[idx].x, postos[idx].z) : { left: `${pos.x}%`, top: `${pos.y}%` }), transform: `translate(-50%, calc(-50% + ${pos.label === 'GK' ? 20 : 0}px)) scale(0.8)`, opacity: isRed ? 0.2 : 1 }}>
                                <div className="relative">
                                    <div className={`absolute top-1/2 ${player && userTeam.tactics.playerFacesOn !== false ? '-translate-y-[calc(50%+7px)]' : '-translate-y-1/2'} -left-[35px] bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded-md shadow-sm z-10`}>
                                        <span className="text-[17px] font-black text-slate-500 dark:text-slate-400 uppercase leading-none block">{pos.label}</span>
                                    </div>
                                    <div draggable={!!player} onDragStart={(e) => e.dataTransfer.setData("playerId", player?.id || "")} style={player ? undefined : { filter: 'brightness(0.28) saturate(0.5)' }} className={`relative flex flex-col items-center group mt-[13px] ${player ? 'cursor-grab active:cursor-grabbing' : 'animate-pulse'}`}>
                                        {player && userTeam.tactics.playerFacesOn !== false ? (
                                            <div className="w-[72px] h-[72px] pointer-events-none -translate-y-[20px] scale-[1.25]"><PlayerFace3D playerId={player.id} team={userTeam} kitIdx={kitDeCampo} gk={player.position === Position.GK || pos.label === 'GK'} camisa={userTeam.primaryColor} className="w-full h-full" /></div>
                                        ) : <ShirtIcon 
                                            color={color} 
                                            color2={color2} 
                                            color3={color3} 
                                            diagonal={kitDiag}
                                            dualDiagonal={kitDualDiag}
                                            centerVerticalStripes={kitCenterVert}
                                            horizontal={kitHoriz}
                                            multipleDiagonals={kitMultiDiag}
                                            criciumaStripes={kitCriciuma}
                                            diagonalWidth={kitDiagW}
                                            number={player?.shirtNumber || ''} 
                                            numberColor={kitNumberColor} 
                                            collarColor={kitCollarColor}
                                            numberOutlineColor={kitNoc}
                                            sleeveColor={kitSleeve}
                                            scale={1.2} 
                                            outOfPosition={false} 
                                            longSleeves={player?.position === Position.GK || pos.label === 'GK'} 
                                        />}
                                        {player && status && (
                                            <div className="absolute top-0 -right-4 flex flex-col gap-1 items-center">
                                                {status.yellow && <div className="w-3 h-4 bg-yellow-400 border border-yellow-600 rounded-[1px] shadow-sm" />}
                                                {status.red && <div className="w-5 h-7 bg-red-600 border border-gray-950 rounded-sm shadow-xl flex items-center justify-center transform rotate-12 -mr-2"><span className="text-[10px] text-white">🟥</span></div>}
                                                {status.injury && <div className={`text-[22.5px] ${getInjuryColorClass(status.injury)} font-black drop-shadow-md leading-none -mt-3 cursor-help`} title={typeof status.injury === 'object' ? `${status.injury.type} (${status.injury.daysOut} dias)` : 'Contundido na partida'}>✚</div>}
                                            </div>
                                        )}
                                    </div>
                                    {player && (
                                        <div className={`absolute top-1/2 ${player && userTeam.tactics.playerFacesOn !== false ? '-translate-y-[calc(50%+7px)]' : '-translate-y-1/2'} -right-[47px] flex items-center bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded shadow-md gap-0.5 border border-slate-100 dark:border-slate-700`}>
                                            <span className={`text-[16px] font-black leading-none ${isRed ? 'text-slate-400' : (player.position !== pos.label ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300')}`}>
                                                {isRed ? 0 : getEffectiveSkill(player, pos.label)}
                                            </span>
                                            <MoraleArrow morale={player.morale} />
                                        </div>
                                    )}
                                </div>
                                <div className="mt-[13px] flex items-center gap-1">
                                <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-0.5 rounded-md shadow-sm max-w-[120px] relative">
                                    {player && userTeam.tactics.playingStylesOn !== false && <IconeEstilo estilo={estiloDoJogador(player)} tam={34} className={`absolute -left-[40px] top-1/2 -translate-y-1/2 ${['AM', 'LW', 'RW', 'CB'].includes(pos.label) ? '-mt-[10px]' : ''}`} />}
                                    {player && (
                                        <div className="absolute -top-[12px] left-1/2 -translate-x-1/2 w-14">
                                            <EnergyBar energy={energiaDe(player)} className="h-2" />
                                        </div>
                                    )}
                                    <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase truncate block text-center mt-[2px]">{player ? player.name.split(' ').pop() : '---'}</span>
                                </div>
                                {etiquetaNota(player)}
                                </div>

                            </div>
                        );
                    })}
                    </div>
                </div>

                <div onDragOver={(e) => { e.preventDefault(); setIsOverBench(true); }} onDragLeave={() => setIsOverBench(false)} onClick={tocarNoPainelDoBanco} onDrop={(e) => handleDropToBench(e.dataTransfer.getData("playerId"))} className={`bg-white dark:bg-slate-900/50 rounded-xl p-[2px] flex flex-col gap-0 shrink-0 shadow-sm border transition-all ${isOverBench ? 'border-blue-400 bg-blue-50/50' : 'border-slate-200 dark:border-slate-800'}`}>
                    <div className="flex justify-between items-center mb-0">
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">SUBSTITUTES</span>
                            {isMatchOngoing && currentMatch && (
                                <div className="bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-2 shadow-sm">
                                    <span className="text-[9px] font-black text-amber-500/70 uppercase">SUBS LEFT</span>
                                    <span className="text-[11px] font-black text-amber-400">{subsRemaining} / {maxSubs}</span>
                                </div>
                            )}
                        </div>
                        <span className="text-xl font-black text-slate-200 italic leading-none">{localBench.length} <span className="text-xs">/ 10</span></span>
                    </div>
                    {/* Os reservas em 2 fileiras de 5 cards (pedido), sem rolagem. */}
                    <div className="grid grid-cols-5 gap-[4px] pb-1 mt-1" style={{ zoom: 0.9 }}>   {/* cards menores: 2 fileiras sem espremer o campo */}
                        {sorted_bench.map(id => {
                            const p = players.find(x => x.id === id); if (!p) return null;
                             let benchColor: string; let benchColor2: string | undefined; let benchColor3: string | undefined; let bnc: string | undefined; let bclc: string | undefined; let bnoc: string | undefined; let bsc: string | undefined;
                             let bDiag = false; let bHoriz = false; let bMultiDiag = false; let bDualDiag = false; let bCenterVert = false; let bDiagW: number | undefined = undefined;
                             if (showMatchKit) {
                                 if (p.position === Position.GK) {
                                    const details = getGKKitDetails(userTeam, kitDeCampo);
                                    benchColor = details.c1;
                                    bnc = details.nc;
                                    bclc = details.clc;
                                    bnoc = details.noc;
                                    bsc = details.sc;
                                 } else { 
                                     const details = getKitDetails(userTeam, kitDeCampo);
                                     benchColor = details.c1; benchColor2 = details.c2; benchColor3 = details.c3;
                                     bnc = details.nc;
                                     bclc = details.clc;
                                     bnoc = details.noc;
                                     bsc = details.sc;
                                     bDiag = !!details.diagonal;
                                     bHoriz = !!details.horizontal;
                                     bMultiDiag = !!details.multipleDiagonals;
                                     bDualDiag = !!(details as any).dualDiagonal;
                                     bCenterVert = !!(details as any).centerVerticalStripes;
                                     bDiagW = details.diagonalWidth;
                                 }
                             } else benchColor = getPosColor(p.position);
                            const status = getPlayerMatchStatus(p.id);
                            return (
                                <div key={p.id} draggable={!indisponivelParaReserva(p.id)} onDragStart={(e) => e.dataTransfer.setData("playerId", p.id)} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} onDrop={(e) => { e.stopPropagation(); handleBenchSwap(e.dataTransfer.getData("playerId"), p.id); }} onClick={(e) => { e.stopPropagation(); tocarNoBanco(p.id); }} title={foiSubstituido(p.id) ? "Already substituted: cannot re-enter" : indisponivelParaReserva(p.id) ? "Unavailable: injured or suspended" : undefined} className={`${selecionado === p.id ? "ring-4 ring-blue-400 " : ""}relative flex-shrink-0 w-full min-w-0 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg px-1.5 py-[8.5px] flex flex-row items-center justify-start gap-2 hover:border-blue-300 cursor-grab active:cursor-grabbing shadow-sm transition-all group`}>
                                    {!jogoIniciado && <button onClick={(e) => { e.stopPropagation(); removeFromSquad(p.id); }} title="Remove from bench" className="absolute bottom-1 right-1 z-10 w-5 h-5 rounded-full bg-slate-700 text-slate-200 text-[10px] font-black leading-none flex items-center justify-center hover:bg-rose-600">✕</button>}
                                    <div className={`relative mt-[2px] ${indisponivelParaReserva(p.id) ? 'opacity-40 grayscale' : ''}`}>
                                        {userTeam.tactics.playerFacesOn !== false ? (
                                            <div className="w-[52px] h-[52px] pointer-events-none -translate-y-[10px]"><PlayerFace3D playerId={p.id} team={userTeam} kitIdx={kitDeCampo} gk={p.position === Position.GK} camisa={userTeam.primaryColor} className="w-full h-full" /></div>
                                        ) : <ShirtIcon 
                                            color={benchColor} 
                                            color2={benchColor2} 
                                            color3={benchColor3} 
                                            diagonal={bDiag}
                                            dualDiagonal={bDualDiag}
                                            centerVerticalStripes={bCenterVert}
                                            horizontal={bHoriz}
                                            multipleDiagonals={bMultiDiag}
                                            diagonalWidth={bDiagW}
                                            number={p.shirtNumber} 
                                            numberColor={bnc} 
                                            collarColor={bclc} 
                                            numberOutlineColor={bnoc} 
                                            sleeveColor={bsc}
                                            scale={0.7} 
                                            longSleeves={p.position === Position.GK} 
                                        />}
                                        {status && (status.yellow || status.injury || status.red) && (
                                            <div className="absolute -top-1 -right-2 flex flex-col gap-0.5 items-center">
                                                {status.yellow && <div className="w-2 h-2.5 bg-yellow-400 border border-yellow-600 rounded-[1px]" />}
                                                {status.red && <div className="w-2 h-2.5 bg-red-600 border border-red-800 rounded-[1px]" />}
                                                {status.injury && <div className={`text-[14px] ${getInjuryColorClass(status.injury)} font-black drop-shadow-sm leading-none cursor-help`} title={typeof status.injury === 'object' ? `${status.injury.type} (${status.injury.daysOut} dias)` : 'Contundido na partida'}>✚</div>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col gap-1 -ml-[8px]">
                                    <div className={`flex justify-between w-full items-start mb-0 gap-1 min-w-0`}>
                                        {/* O topo tem de caber no cartao: o texto encolhe (min-w-0, separadores curtos) e os icones (estilo + moral) nunca saem para fora (shrink-0). */}
                                        <span className="text-[11px] font-black leading-none whitespace-nowrap min-w-0 truncate"><span className="text-slate-400 text-[13px]">{p.position}</span><span className="text-slate-500 mx-[3px]">|</span><span className="text-blue-400">{p.skill}</span>{mediaNotas(p) && <><span className="text-slate-500 mx-[3px]">|</span><span className="text-amber-400">{mediaNotas(p)}</span></>}</span>
                                        <span className="flex items-center gap-0.5 shrink-0">{iconeDoEstilo(p, 20)}<MoraleArrow morale={p.morale} /></span>
                                    </div>
                                        <div>
                                            <EnergyBar energy={energiaDe(p)} className="h-1.5" />
                                        </div>
                                        <div className={`flex flex-col items-start justify-start leading-[1.1] min-w-0`}>
                                            {doisNomes(p.name).map((part, index) => (
                                                <span key={index} className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase max-w-full">
                                                    <span className="truncate">{part}</span>{index === 0 && <AvisosDoCard playerId={p.id} />}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {localBench.length === 0 && <div className="col-span-5 flex-1 flex items-center justify-center text-[10px] text-slate-300 font-black uppercase italic tracking-widest border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-lg">Bench Empty</div>}
                    </div>
                </div>
            </div>

            {/* SQUAD POOL e COBRADORES: duas colunas do mesmo tamanho, no espaco que o campo deixa (o campo avanca 109 px sobre ele). */}
            {/* Set Pieces 20 px mais estreito e Squad Pool outra vez como era (pedido): antes 1fr 1fr com folga de 16 px; as duas encostadas a direita (margem 109 -> 129, mesmas larguras): os 20 px livres vao para a area dos reservas. */}
            <div className="grid gap-[5px] min-h-0 min-w-0" style={largo ? { marginLeft: 129, gridTemplateColumns: 'calc(50% + 7.5px) calc(50% - 12.5px)' } : { display: 'contents' }}>   {/* paineis a 5 px uns dos outros (pedido) */}
            {/* O SQUAD POOL: o que sobrou do plantel, ao lado do campo (antes ficava sob as instrucoes). */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col shadow-sm overflow-hidden min-h-0 min-w-0">
                    <div className="px-3 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">SQUAD POOL</h3>
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded gap-0.5">
                                <button onClick={() => setPoolSortBy('skill')} className={`text-[8px] font-black px-1.5 py-0.5 rounded transition-all ${poolSortBy === 'skill' ? 'bg-blue-400 text-white' : 'text-slate-400 hover:text-slate-200'}`}>OVRL</button>
                                <button onClick={() => setPoolSortBy('position')} className={`text-[8px] font-black px-1.5 py-0.5 rounded transition-all ${poolSortBy === 'position' ? 'bg-amber-400 text-white' : 'text-slate-400 hover:text-slate-200'}`}>POS</button>
                            </div>
                        </div>
                        <span className="text-[9px] font-bold text-slate-300 uppercase">{availablePlayers.length} TOTAL</span>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-slate-950/30 p-[6.2px]">
                        <div className="flex flex-wrap content-start gap-[3px] min-w-0">
                            {[...availablePlayers].sort((a, b) => {
                                // Suspensos, expulsos e lesionados vao para o FIM dos jogadores disponiveis para a escalacao.
                                const ua = indisponivelParaReserva(a.id) ? 1 : 0, ub = indisponivelParaReserva(b.id) ? 1 : 0;
                                if (ua !== ub) return ua - ub;
                                if (poolSortBy === 'skill') return b.skill - a.skill;
                                const posA = POSITION_ORDER[a.position] || 99;
                                const posB = POSITION_ORDER[b.position] || 99;
                                if (posA !== posB) return posA - posB;
                                return b.skill - a.skill;
                            }).map(p => {
                                let d: KitDetails;
                                if (showMatchKit) {
                                    if (p.position === Position.GK) {
                                        d = getGKKitDetails(userTeam, kitDeCampo);
                                    } else { 
                                        d = getKitDetailsWrapper(userTeam, selectedKitIdx);
                                    }
                                } else {
                                    d = { c1: getPosColor(p.position) };
                                }
                                const status = getPlayerMatchStatus(p.id);

                                return (
                                    <div key={p.id} draggable={!indisponivelParaReserva(p.id)} onDragStart={(e) => e.dataTransfer.setData("playerId", p.id)} onClick={(e) => { e.stopPropagation(); tocarNoPool(p.id); }} title={foiSubstituido(p.id) ? "Already substituted: cannot re-enter" : indisponivelParaReserva(p.id) ? "Unavailable: injured or suspended" : undefined} className={`${selecionado === p.id ? "ring-4 ring-blue-400 " : ""}relative flex-shrink-0 w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg p-1.5 py-[5px] flex flex-row items-center justify-start gap-2 hover:border-blue-300 cursor-grab active:cursor-grabbing shadow-sm transition-all group`}>
                                        <div className={`relative mt-[2px] ${indisponivelParaReserva(p.id) ? 'opacity-40 grayscale' : ''}`}>
                                            {userTeam.tactics.playerFacesOn !== false ? (
                                            <div className="w-[52px] h-[52px] pointer-events-none -translate-y-[13px]"><PlayerFace3D playerId={p.id} team={userTeam} kitIdx={kitDeCampo} gk={p.position === Position.GK} camisa={userTeam.primaryColor} className="w-full h-full" /></div>
                                        ) : <ShirtIcon 
                                                color={d.c1} 
                                                color2={d.c2} 
                                                color3={d.c3} 
                                                diagonal={d.diagonal}
                                                dualDiagonal={(d as any).dualDiagonal}
                                                centerVerticalStripes={(d as any).centerVerticalStripes}
                                                gradient={d.gradient}
                                                spfcStripes={(d as any).spfcStripes}
                                                criciumaStripes={(d as any).criciumaStripes}
                                                horizontal={(d as any).horizontal}
                                                multipleDiagonals={(d as any).multipleDiagonals}
                                                diagonalWidth={d.diagonalWidth}
                                                number={p.shirtNumber} 
                                                numberColor={d.nc}
                                                collarColor={d.clc}
                                                numberOutlineColor={d.noc}
                                                sleeveColor={d.sc}
                                                scale={0.7} 
                                                longSleeves={p.position === Position.GK} 
                                            />}
                                            {status && (status.yellow || status.injury || status.red) && (
                                                <div className="absolute -top-1 -right-2 flex flex-col gap-0.5 items-center">
                                                    {status.yellow && <div className="w-2 h-2.5 bg-yellow-400 border border-yellow-600 rounded-[1px]" />}
                                                    {status.red && <div className="w-2 h-2.5 bg-red-600 border border-red-800 rounded-[1px]" />}
                                                    {status.injury && <div className={`text-[14px] ${getInjuryColorClass(status.injury)} font-black drop-shadow-sm leading-none cursor-help`} title={typeof status.injury === 'object' ? `${status.injury.type} (${status.injury.daysOut} dias)` : 'Contundido na partida'}>✚</div>}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                                        <div className={`flex justify-between w-full items-start mb-0`}>
                                            <span className="text-[12px] font-black leading-none whitespace-nowrap"><span className="text-slate-400 text-[14px]">{p.position}</span> <span className="text-slate-500">|</span> <span className="text-blue-400">{p.skill}</span>{mediaNotas(p) && <> <span className="text-slate-500">|</span> <span className="text-amber-400">{mediaNotas(p)}</span></>}</span>
                                            <span className="flex items-center gap-1"><MoraleArrow morale={p.morale} /></span>
                                        </div>
                                            <div className={`-mt-1 mb-1`}><EnergyBar energy={energiaDe(p)} className="h-1.5" /></div>
                                            <div className={`flex flex-col items-start justify-start leading-[1.1] min-h-[20px] min-w-0`}>
                                                {doisNomes(p.name).map((part, index) => (
                                                    <span key={index} className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase max-w-full">
                                                        <span className="truncate">{part}</span>{index === 0 && <AvisosDoCard playerId={p.id} />}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <span className={`absolute bottom-1 right-1 flex items-center`}>{iconeDoEstilo(p)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

            {/* OS COBRADORES E O CAPITAO: arrastar a camisa do jogador (campo, banco ou squad pool) para a funcao. Fica entre o campo e as instrucoes. */}
            <div className="flex flex-col gap-2 min-h-0 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-[5px] shadow-sm overflow-y-auto custom-scrollbar">
                <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">CAPTAIN & SET-PIECE TAKERS</h3>
                {SET_PIECE_ROLES.map(r => {
                    const pid = userTeam.setPieceTakers?.[r.role];
                    const pl = pid ? players.find(x => x.id === pid && x.teamId === userTeam.id) : undefined;
                    // Acompanha o campo: com o botao em 'Uniforme' leva o kit escolhido; em 'Posicao', a cor da posicao do jogador.
                    const d: KitDetails = !pl ? { c1: '#e2e8f0' } : (showMatchKit ? (pl.position === Position.GK ? getGKKitDetails(userTeam, kitDeCampo) : getKitDetailsWrapper(userTeam, selectedKitIdx)) : { c1: getPosColor(pl.position) });
                    return (
                        <div key={r.role}
                             onDragOver={(e) => { e.preventDefault(); }}
                             onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("playerId"); if (id) assignSetPiece(r.role, id); }}
                             className="flex-1 flex flex-col items-center justify-center gap-1 rounded-lg border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm py-1.5 px-1 hover:border-blue-300 transition-colors">
                            <span className="text-[9px] font-black uppercase tracking-wider text-blue-400 text-center leading-tight">{r.label}</span>
                            {pl ? (
                                <div draggable onDragStart={(e) => e.dataTransfer.setData("playerId", pl.id)} className="relative flex flex-col items-center cursor-grab active:cursor-grabbing">
                                    {userTeam.tactics.playerFacesOn !== false ? (
                                        <div className="w-[60px] h-[60px] pointer-events-none -translate-y-[9px]"><PlayerFace3D playerId={pl.id} team={userTeam} kitIdx={kitDeCampo} gk={pl.position === Position.GK} camisa={userTeam.primaryColor} className="w-full h-full" /></div>
                                    ) : <ShirtIcon color={d.c1} color2={d.c2} color3={d.c3} diagonal={d.diagonal} dualDiagonal={(d as any).dualDiagonal} centerVerticalStripes={(d as any).centerVerticalStripes}
                                        gradient={d.gradient} spfcStripes={(d as any).spfcStripes} criciumaStripes={(d as any).criciumaStripes} horizontal={(d as any).horizontal}
                                        multipleDiagonals={(d as any).multipleDiagonals} diagonalWidth={d.diagonalWidth} number={pl.shirtNumber} numberColor={d.nc} collarColor={d.clc}
                                        numberOutlineColor={d.noc} sleeveColor={d.sc} scale={0.8} longSleeves={pl.position === Position.GK} />}
                                    <span className="relative z-10 mt-[10px] flex items-baseline justify-center gap-1 max-w-full leading-tight whitespace-nowrap"><span className="text-[9px] font-black text-slate-500 dark:text-slate-300 uppercase truncate">{pl.name.split(' ').pop()}</span><span className="text-[9px] font-black text-slate-400">|</span><span className="text-[10px] font-black text-amber-500 shrink-0">{r.attr.rotulo} {r.attr.valor(pl)}</span></span>
                                    <button onClick={() => assignSetPiece(r.role, undefined)} title="Remove" className="absolute top-1/2 -translate-y-1/2 -right-5 z-10 w-5 h-5 rounded-full bg-slate-700 text-slate-200 text-[10px] font-black leading-none flex items-center justify-center hover:bg-rose-600">✕</button>
                                </div>
                            ) : (
                                <div className="h-[62px] flex items-center justify-center text-[9px] font-bold text-slate-400 uppercase italic text-center px-2">drag a player here</div>
                            )}
                        </div>
                    );
                })}
            </div>

            </div>

            <div className="flex flex-col gap-4 min-h-0 min-w-0" style={largo ? undefined : { minHeight: 560 }}>   {/* tablet: Kit e Tactical Instructions empilhados na 3.a coluna, do mesmo tamanho das outras duas */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm pb-6 min-w-0">
                    <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic mb-4">KIT</h3>
                    <div className={`flex justify-around items-center ${largo ? '' : 'gap-1'}`}>
                        {[0, 1, 2, 3].map((idx) => (
                            <div 
                                key={idx} 
                            onClick={() => idx < 3 && setSelectedKitIdx(idx as any)}
                                className={`transition-all rounded-lg border-2 ${largo ? 'p-1' : 'p-0.5 flex-1 min-w-0 flex justify-center'} ${idx < 3 ? 'cursor-pointer hover:border-slate-200' : 'cursor-default'} ${selectedKitIdx === idx ? 'border-blue-400 bg-blue-50/10' : 'border-transparent'}`}
                            >
                                {(() => {
                                    const d = idx === 3 ? getGKKitDetails(userTeam, kitDeCampo) : getKitDetailsWrapper(userTeam, idx as any);
                                    return <ShirtIcon color={d.c1} color2={d.c2} color3={d.c3} diagonal={d.diagonal} horizontal={(d as any).horizontal} multipleDiagonals={(d as any).multipleDiagonals} dualDiagonal={(d as any).dualDiagonal} centerVerticalStripes={(d as any).centerVerticalStripes} gradient={d.gradient} spfcStripes={(d as any).spfcStripes} criciumaStripes={(d as any).criciumaStripes} diagonalWidth={d.diagonalWidth} number={idx === 3 ? "1" : "9"} numberColor={d.nc} collarColor={d.clc} numberOutlineColor={d.noc} sleeveColor={d.sc} scale={largo ? 1.2 : 0.8} longSleeves={idx === 3} className="w-[77px] h-[77px]" />;   {/* iPad: uniformes menores (51 px em vez de 77) para os 4 caberem no box */}
                                })() }
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-[13px] px-4 shadow-sm min-h-0 min-w-0 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">TACTICAL INSTRUCTIONS</h3>
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded p-1 border border-slate-200 dark:border-slate-700">
                            <span className="text-[9px] font-black text-slate-400 px-2 uppercase tracking-widest">FORMATION</span>
                            <select
                                value={userTeam.tactics.formation}
                                onChange={(e) => handleTacticChange('formation', e.target.value as any)}
                                className="appearance-none bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white font-bold text-[10px] py-1 pl-3 pr-2 rounded outline-none cursor-pointer uppercase tracking-wider"
                            >
                                {Object.keys(FORMATIONS).map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-between pt-2">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">MENTALITY</span><span className="text-[9px] font-black text-blue-400 uppercase">{userTeam.tactics.style}</span></div>
                            <div className="flex bg-slate-50 dark:bg-slate-800 rounded p-1 gap-1">
                                {['Very Defensive', 'Defensive', 'Balanced', 'Offensive', 'Very Offensive'].map((s, i) => {
                                    const labels = ['U-DEF', 'DEF', 'BAL', 'OFF', 'U-OFF']; const isSelected = userTeam.tactics.style === s;
                                    return <button key={s} onClick={() => handleTacticChange('style', s)} className={`flex-1 text-[10px] font-black py-3 rounded transition-all shadow-sm ${isSelected ? 'bg-blue-300 text-blue-900' : 'bg-white dark:bg-slate-700 text-slate-300 hover:text-slate-500'}`}>{labels[i]}</button>
                                })}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">AGGRESSION</span><span className="text-[9px] font-black text-rose-400 uppercase">{userTeam.tactics.aggression}</span></div>
                            <div className="flex bg-slate-50 dark:bg-slate-800 rounded p-1 gap-1">
                                {['Very Passive', 'Passive', 'Balanced', 'Aggressive', 'Very Aggressive'].map((a, i) => {
                                    const labels = ['U-PAS', 'PAS', 'BAL', 'AGG', 'U-AGG']; const isSelected = userTeam.tactics.aggression === a;
                                    return <button key={a} onClick={() => handleTacticChange('aggression', a)} className={`flex-1 text-[10px] font-black py-3 rounded transition-all shadow-sm ${isSelected ? 'bg-rose-300 text-rose-900' : 'bg-white dark:bg-slate-700 text-slate-300 hover:text-slate-500'}`}>{labels[i]}</button>
                                })}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">MATCH SECTOR</span><span className="text-[9px] font-black text-emerald-400 uppercase">{(userTeam.tactics.focusSectors || ['Center']).join(', ')}</span></div>
                            <div className="flex bg-slate-50 dark:bg-slate-800 rounded p-1 gap-1">
                                {['Left', 'Center', 'Right'].map((s, i) => {
                                    const labels = ['LEFT', 'CENTER', 'RIGHT']; const isSelected = (userTeam.tactics.focusSectors || ['Center']).includes(s as any);
                                    return <button key={s} onClick={() => { 
                                        const current = userTeam.tactics.focusSectors || ['Center']; 
                                        let next; 
                                        if (current.includes(s as any)) { 
                                            if (current.length > 1) next = current.filter(item => item !== s); 
                                            else next = current; 
                                        } else {
                                            if (current.length < 2) next = [...current, s];
                                            else next = current;
                                        }
                                        handleTacticChange('focusSectors', next as any); 
                                    }} className={`flex-1 text-[11px] font-black py-3 rounded transition-all shadow-sm ${isSelected ? 'bg-emerald-400 text-emerald-900' : 'bg-white dark:bg-slate-700 text-slate-300 hover:text-slate-500'}`}>{labels[i]}</button>
                                })}
                            </div>
                        </div>
                        {([
                            { field: 'playStyle', label: 'OFFENSIVE STYLE', cor: 'bg-violet-300 text-violet-900', padrao: (t: Tactics) => (t.tempo >= 67 ? 'direct' : t.tempo <= 33 ? 'possession' : 'positional'),
                              opcoes: [['positional', 'POSITIONAL'], ['possession', 'POSSESSION'], ['direct', 'DIRECT'], ['counter_attack', 'COUNTER'], ['wing_play', 'WING PLAY']] },
                            { field: 'widthCompactness', label: 'WIDTH COMPACTNESS', cor: 'bg-cyan-300 text-cyan-900', padrao: () => 'median',
                              opcoes: [['large', 'LARGE'], ['median', 'MEDIUM'], ['short', 'SMALL']] },
                            { field: 'lengthCompactness', label: 'LENGTH COMPACTNESS', cor: 'bg-amber-300 text-amber-900', padrao: () => 'median',
                              opcoes: [['large', 'LARGE'], ['mediumLarge', 'MED-LARGE'], ['median', 'MEDIUM'], ['mediumSmall', 'MED-SMALL'], ['short', 'SMALL']] }
                        ] as const).map(g => {
                            const atual = ((userTeam.tactics as any)[g.field] as string) || g.padrao(userTeam.tactics);
                            return (
                                <div key={g.field} className={`space-y-1 ${g.field === 'playStyle' ? 'order-first' : ''}`}>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{g.label}</span>
                                    <div className="flex bg-slate-50 dark:bg-slate-800 rounded p-1 gap-1">
                                        {g.opcoes.map(([valor, rotulo]) => (
                                            <button key={valor} onClick={() => handleTacticChange(g.field as keyof Tactics, valor as any)} className={`flex-1 text-[10px] font-black py-3 rounded transition-all shadow-sm ${atual === valor ? g.cor : 'bg-white dark:bg-slate-700 text-slate-300 hover:text-slate-500'}`}>{rotulo}</button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                        {([
                            { field: 'pressure', label: 'PRESSURE', cor: 'bg-rose-300 text-rose-900', valores: [10, 30, 50, 70, 90] },
                            { field: 'defensiveLine', label: 'DEFENSIVE LINE', cor: 'bg-emerald-300 text-emerald-900', valores: [30, 45, 60, 75, 90] }
                        ] as const).map(g => {
                            const atual = userTeam.tactics[g.field] as number;
                            const meio = (g.valores[1] - g.valores[0]) / 2;
                            return (
                                <div key={g.field} className="space-y-1">
                                    <div className="flex justify-between items-center"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{g.label}</span><span className="text-[9px] font-black text-slate-400">{atual}%</span></div>
                                    <div className="flex bg-slate-50 dark:bg-slate-800 rounded p-1 gap-1">
                                        {g.valores.map(v => (
                                            <button key={v} onClick={() => handleTacticChange(g.field as keyof Tactics, v)} className={`flex-1 text-[10px] font-black py-3 rounded transition-all shadow-sm ${atual >= v - meio && atual < v + meio ? g.cor : 'bg-white dark:bg-slate-700 text-slate-300 hover:text-slate-500'}`}>{v}%</button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default TacticsView;
