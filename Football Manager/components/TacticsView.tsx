import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { Tactics, Position, Player, Team, SetPieceRole, getEffectiveSkill, resolveSetPieceTakers, FORMATIONS, POSITION_ORDER, getKitDetails, getGKKitDetails, KitDetails } from '../types';
import { TeamKit } from './TeamKit';
import FitnessBar from './FitnessBar';
import { getMatchEndMinute } from '../textSim/matchEngine';
import { chaveCompeticao, estaSuspenso, AMARELOS_PARA_SUSPENSAO } from '../textSim/suspensoes';

interface FieldPosition {
  id: number;
  x: number; 
  y: number; 
  label: string;
}


import { ShirtIcon } from './ShirtIcon';
import { setoresPadraoDaFormacao } from '../3dMatch/simulador3dCliente';
import ZonePositionsModal from './ZonePositionsModal';
import { campo3d } from '../textSim/atributos3d';
import TacticPresetsModal from './TacticPresetsModal';
import { FaseZona, ZONAS, postosEfetivos, espelharFase, espelharZona, zonaEspelhada, repor, moverPosto, formacaoTemTabela, temAjustes } from '../textSim/formacoesZonas';

const MoraleArrow = ({ morale }: { morale: number }) => {
  if (morale >= 90) return <span className="text-amber-400 transform -rotate-90 inline-block font-bold drop-shadow-sm text-[12px]">➤</span>; 
  if (morale >= 70) return <span className="text-emerald-500 transform -rotate-45 inline-block font-bold text-[12px]">➤</span>; 
  if (morale >= 40) return <span className="text-slate-400 inline-block font-bold text-[12px]">➤</span>; 
  if (morale >= 20) return <span className="text-orange-500 transform rotate-45 inline-block font-bold text-[12px]">➤</span>; 
  return <span className="text-rose-500 transform rotate-90 inline-block font-bold text-[12px]">➤</span>; 
};

const getPosColor = (posLabel: string | Position) => {
  if (posLabel === 'GK' || posLabel === Position.GK) return '#ea580c'; 
  if (['LB', 'CB', 'RB', Position.LB, Position.CB, Position.RB].includes(posLabel)) return '#eab308'; 
  if (['DM', 'LM', 'CM', 'RM', 'AM', Position.DM, Position.LM, Position.CM, Position.RM, Position.AM].includes(posLabel)) return '#16a34a'; 
  return '#2563eb'; 
};

const checkPosMatch = (assignedPos: string, playerPos: Position): boolean => {
  if (assignedPos === playerPos) return true;
  if (assignedPos === 'SS' && playerPos === Position.ST) return true;
  if (assignedPos === 'ST' && playerPos === Position.SS) return true;
  if (['LW', 'RW'].includes(assignedPos) && [Position.ST, Position.SS].includes(playerPos)) return true;
  if (['LM', 'RM', 'AM'].includes(assignedPos) && playerPos === Position.CM) return true;
  return false;
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

const NOME_DA_ZONA = ['Def. direita', 'Def. centro', 'Def. esquerda', 'Meio direita', 'Meio centro', 'Meio esquerda', 'Atq. direita', 'Atq. centro', 'Atq. esquerda'];

interface TacticsViewProps {
  setView?: (view: any) => void;
}

const TacticsView: React.FC<TacticsViewProps> = ({ setView }) => {
  const { userTeam, players, updateTactics, updateSetPieceTakers, gameState, fixtures, teams, comps } = useGame();
  const [localLineup, setLocalLineup] = useState<string[]>([]);
  const [localBench, setLocalBench] = useState<string[]>([]);
  const [isOverBench, setIsOverBench] = useState(false);
  // Os jogadores aparecem sempre com o uniforme escolhido (o botao Posicao/Uniforme saiu).
  const showMatchKit = true;
  const [poolSortBy, setPoolSortBy] = useState<'skill' | 'position'>('skill');
  const [selectedKitIdx, setSelectedKitIdx] = useState<0 | 1 | 2 | 3>(0);
  const [showZonas, setShowZonas] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [presetFoco, setPresetFoco] = useState<null | 'save' | 'load'>(null);
  // Editor das posicoes no proprio campo: fase (com/sem a bola) e zona da bola (0-8; null = a formacao base).
  const [aba, setAba] = useState<'geral' | FaseZona>('geral');
  const fase: FaseZona = aba === 'sem' ? 'sem' : 'com';
  const [zona, setZona] = useState<number | null>(null);
  const [contra, setContra] = useState(false);
  const [arrasto, setArrasto] = useState<{ slot: number; x: number; z: number } | null>(null);
  const campoRef = useRef<HTMLDivElement>(null);
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
      injury: players.find(p => p.id === playerId)?.injury || pEvents.find(e => e.type === 'INJURY')
    };
  };

  // Indisponivel para a reserva: expulso (suspenso) ou lesionado — o motor tambem nao escala lesionados. O amarelo so avisa.
  // A competicao do proximo jogo (o de hoje, ou o primeiro por jogar): e nela que contam os amarelos e as suspensoes.
  const jogoDaVez = currentMatch || fixtures.filter(x => !x.played && x.date >= gameState.currentDate && (x.homeTeamId === userTeam.id || x.awayTeamId === userTeam.id)).sort((a, b) => a.date.localeCompare(b.date))[0];
  const chaveJogo = chaveCompeticao(jogoDaVez, comps);
  const suspensoNoJogo = (playerId: string) => estaSuspenso(players.find(p => p.id === playerId), chaveJogo);
  const indisponivelParaReserva = (playerId: string) => {
    const st = getPlayerMatchStatus(playerId);
    return !!st.red || !!st.injury || suspensoNoJogo(playerId);
  };
  const AvisosDoCard = ({ playerId }: { playerId: string }) => {
    const st = getPlayerMatchStatus(playerId);
    const susp = suspensoNoJogo(playerId);
    const acum = (chaveJogo && players.find(p => p.id === playerId)?.amarelos?.[chaveJogo]) || 0;
    if (!st.yellow && !st.red && !st.injury && !susp && !acum) return null;
    return (
      <div className="flex flex-col items-center gap-[1px] mt-[2px]">
        {(st.yellow || acum > 0) && !st.red && !susp && <span className="flex items-center gap-1 text-[8px] font-black text-yellow-400 uppercase leading-none"><span className="inline-block w-[6px] h-[9px] bg-yellow-400 border border-yellow-600 rounded-[1px]" />Amarelo{acum > 0 ? ` ${acum}/${AMARELOS_PARA_SUSPENSAO}` : ''}</span>}
        {(st.red || susp) && <span className="flex items-center gap-1 text-[8px] font-black text-red-500 uppercase leading-none"><span className="inline-block w-[6px] h-[9px] bg-red-600 border border-red-800 rounded-[1px]" />Suspenso</span>}
        {st.injury && <span className={`text-[8px] font-black uppercase leading-none ${getInjuryColorClass(st.injury)}`}>✚ Lesão</span>}
      </div>
    );
  };

  const teamChemistry = useMemo(() => {
    if (localLineup.length === 0) return 0;
    const starters = localLineup
      .map(id => players.find(p => p.id === id))
      .filter((p): p is Player => !!p && !getPlayerMatchStatus(p.id).red);
    
    if (starters.length === 0) return 0;
  const currentPositions = FORMATIONS[userTeam.tactics.formation] || FORMATIONS['4-4-2'];
    let score = 10;
    starters.forEach((p, idx) => {
      const assignedPosLabel = currentPositions[idx]?.label;
      if (assignedPosLabel) {
        if (checkPosMatch(assignedPosLabel, p.position)) {
          score += 2;
        } else {
            const s1 = assignedPosLabel === 'GK' ? 'GK' : (['LB', 'CB', 'RB'].includes(assignedPosLabel) ? 'DEF' : (['LW', 'RW', 'SS', 'ST'].includes(assignedPosLabel) ? 'ATK' : 'MID'));
            const s2 = p.position === Position.GK ? 'GK' : ([Position.LB, Position.CB, Position.RB].includes(p.position) ? 'DEF' : ([Position.LW, Position.RW, Position.SS, Position.ST].includes(p.position) ? 'ATK' : 'MID'));
            if (s1 === s2) score -= 0;
            else if (s1 === 'GK' || s2 === 'GK') score -= 10;
            else if ((s1 === 'DEF' && s2 === 'MID') || (s1 === 'MID' && s2 === 'DEF')) score -= 3;
            else if ((s1 === 'MID' && s2 === 'ATK') || (s1 === 'ATK' && s2 === 'MID')) score -= 3;
            else score -= 6;
        }
      }
    });
    
    // --- SYNERGY BONUS ---
    let synergyScore = 0;
    if (userTeam.synergyMap && starters.length > 1) {
        let totalSyn = 0;
        let pCount = 0;
        for (let i = 0; i < starters.length; i++) {
            for (let j = i + 1; j < starters.length; j++) {
                const p1 = starters[i].id;
                const p2 = starters[j].id;
                const key = p1 < p2 ? `${p1}-${p2}` : `${p2}-${p1}`;
                totalSyn += userTeam.synergyMap[key] || 0;
                pCount++;
            }
        }
        const avgSyn = pCount > 0 ? totalSyn / pCount : 0;
        // Every 100 minutes of average shared time gives +1 to chemistry, up to +25
        synergyScore = Math.min(25, Math.floor(avgSyn / 100));
    }
    score += synergyScore;

    const avgMorale = starters.reduce((sum, p) => sum + p.morale, 0) / starters.length;
    score += (avgMorale / 100) * 15;
    const avgFitness = starters.reduce((sum, p) => sum + p.fitness, 0) / starters.length;
    score += (avgFitness / 100) * 12;
    return Math.max(0, Math.min(100, Math.round(score)));
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
      
      const playerAlreadyAtSlot = newLineup[index];
      newLineup[index] = playerId;
      
      if (playerAlreadyAtSlot && !targetIsRed) {
        newBench[existingBenchIndex] = playerAlreadyAtSlot;
      } else {
        newBench = newBench.filter(id => id !== playerId);
      }
    } else {
      // Com o jogo em curso o plantel (squad pool) ja nao troca com o campo: so o banco entra (substituicao).
      if (isMatchOngoing) return;
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
    // Com o jogo em curso o banco fecha: nem o plantel entra nele, nem quem esta em campo volta para ele.
    if (isMatchOngoing) return;
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
    if (sB === -1 && indisponivelParaReserva(sourceId)) return;
    // Em jogo o plantel nao troca com o banco: so se reordena o banco ou se faz a substituicao (titular <-> banco).
    if (isMatchOngoing && sB === -1) return;
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
        {showZonas && <ZonePositionsModal team={userTeam} adversario={proximoAdversario} players={players} onClose={() => setShowZonas(false)} onLoadTactics={(t) => updateTactics(userTeam.id, { ...t, zoneOverrides: t.zoneOverrides })}
            onChange={(over) => { const todos = { ...(userTeam.tactics.zoneOverrides || {}) }; if (over) todos[userTeam.tactics.formation] = over; else delete todos[userTeam.tactics.formation]; updateTactics(userTeam.id, { zoneOverrides: Object.keys(todos).length ? todos : undefined }); }} />}
        {presetFoco && <TacticPresetsModal atual={userTeam.tactics} foco={presetFoco} onClose={() => setPresetFoco(null)} onLoad={(t) => updateTactics(userTeam.id, { ...t, zoneOverrides: t.zoneOverrides })} />}
        {showPresets && <TacticPresetsModal atual={userTeam.tactics} onClose={() => setShowPresets(false)} onLoad={(t) => updateTactics(userTeam.id, { ...t, zoneOverrides: t.zoneOverrides })} />}
        <div className="flex justify-between items-center shrink-0">
            <h2 className="text-4xl font-black italic tracking-tighter uppercase">
                <span className="text-slate-300 dark:text-slate-600">MATCH</span> <span className="text-blue-400">TACTICS</span>
            </h2>
            <div className="flex items-center gap-3">
                 {isMatchOngoing && setView && (
                    <button onClick={() => setView(localStorage.getItem('activeMatchView') === 'MATCH' ? 'MATCH' : 'TRAINING')} className="bg-emerald-600 text-white text-[10px] font-black uppercase px-4 py-2 rounded">Resume</button>
                 )}
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
        </div>

        <div className="flex-1 grid grid-cols-[5.6fr_3.7fr_3fr] gap-4 min-h-0">
            <div className="flex flex-col gap-4 min-h-0 min-w-0" style={{ width: 'calc(100% + 109px)' }}>
                <div className="flex-1 relative bg-slate-50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-900/30 overflow-hidden select-none shadow-inner" style={{ minHeight: '350px', containerType: 'size' }}>
                    <div className="absolute top-6 left-6 z-20 flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700">
                        {([['geral', 'GERAL'], ['com', 'COM BOLA'], ['sem', 'SEM BOLA']] as const).map(([v, r]) => (
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
                            <button onClick={() => setContra(c => !c)} className={`${btnQuadrado} ${contra ? 'bg-red-600 text-white' : btnRepor}`} title="Mostra, em retangulos de outra cor, onde o sistema adversario fica com a bola na zona escolhida">Playing Against</button>
                            <button onClick={() => aplicarOver(espelharZona(formacaoAtual, rotulosFormacao, overAtual, fase, zonaEfetiva, zonaEfetiva))} className={`${btnQuadrado} ${btnAcao}`} title="Troca esquerda e direita nesta zona">Virar zona (esq ⇄ dir)</button>
                            {zonaEspelhada(zonaEfetiva) !== zonaEfetiva && <button onClick={() => aplicarOver(espelharZona(formacaoAtual, rotulosFormacao, overAtual, fase, zonaEfetiva, zonaEspelhada(zonaEfetiva)))} className={`${btnQuadrado} ${btnAcao}`} title="Copia estas posicoes, espelhadas, para a zona do outro lado">Copiar espelhado → {NOME_DA_ZONA[zonaEspelhada(zonaEfetiva)]}</button>}
                            <button onClick={() => aplicarOver(espelharFase(formacaoAtual, rotulosFormacao, overAtual, fase, zonaEfetiva))} className={`${btnQuadrado} ${btnAcao}`}>Espelhar {fase === 'com' ? 'com bola' : 'sem bola'} (linhas)</button>
                            <button onClick={() => aplicarOver(repor(overAtual, fase, zonaEfetiva))} className={`${btnQuadrado} ${btnRepor}`}>Repor esta zona</button>
                            <button onClick={() => aplicarOver(repor(overAtual, fase))} className={`${btnQuadrado} ${btnRepor}`}>Repor {fase === 'com' ? 'com bola' : 'sem bola'} (zonas)</button>
                            <button disabled={!temAjustes(overAtual)} onClick={() => aplicarOver(undefined)} className={`${btnQuadrado} bg-rose-600/80 disabled:opacity-30 text-white hover:bg-rose-600`}>Repor a formação toda</button>
                            <>
                                <button onClick={() => setPresetFoco('save')} className={`${btnQuadrado} bg-emerald-600 text-white hover:bg-emerald-500`} title="Grava a tatica atual (formacao, estilo e posicoes)">Save</button>
                                <button onClick={() => setPresetFoco('load')} className={`${btnQuadrado} bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600`} title="Carrega uma tatica gravada ou de um ficheiro .json">Load</button>
                            </>
                        </div>
                    )}

                    <div className="absolute top-6 right-6 z-10 flex flex-col items-end">
                        <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest leading-none mb-1">ENTROSAMENTO</span>
                        <div className="flex items-baseline">
                            <span className="text-5xl font-black text-slate-300 dark:text-white/20 italic leading-none tracking-tighter">{teamChemistry}</span>
                            <span className="text-2xl font-black text-blue-300/50 italic">%</span>
                        </div>
                    </div>

                    {/* O CAMPO PROPORCIONAL: uma caixa 68:106 centrada na area (a margem de 2.5rem em cima e em baixo); linhas, zonas e jogadores vivem dentro dela, em percentagem. */}
                    <div ref={campoRef} className="absolute" style={{ top: '2.5rem', bottom: '2.5rem', left: '50%', transform: 'translateX(-50%)', width: 'calc((100cqh - 5rem) * 68 / 106 + 140px)' }}>
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
                                        <div key={z} onClick={() => setZona(sel ? null : z)} title={NOME_DA_ZONA[z]}
                                            className={`absolute cursor-pointer transition-colors ${sel ? 'border border-blue-400/70' : 'hover:bg-blue-400/10'}`}
                                            style={{ left: `${xs[v] * 100}%`, width: `${(xs[v + 1] - xs[v]) * 100}%`, top: `${ys[r] * 100}%`, height: `${(ys[r + 1] - ys[r]) * 100}%`,
                                                backgroundImage: sel ? 'repeating-linear-gradient(45deg, rgba(96,165,250,0.35) 0, rgba(96,165,250,0.35) 2px, transparent 2px, transparent 9px)' : undefined }} />
                                    );
                                }))}
                            </div>
                        );
                    })()}

                    {postosContra.map((p, i) => (
                        <div key={'c' + i} className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-60 z-[6] flex items-center justify-center rounded-md border font-black leading-none shadow-sm" style={{ ...emCampo(p.x, p.z, true), width: 45, height: 30, fontSize: 10, background: corContra, borderColor: 'rgba(255,255,255,0.5)', color: corTextoContra }}>{FORMATIONS[contraForm][i]?.label}</div>
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
                                ? getGKKitDetails(userTeam, selectedKitIdx) 
                                : getKitDetails(userTeam, selectedKitIdx);
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
                                <div key={idx} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropToLineup(e.dataTransfer.getData("playerId"), idx)} className={`absolute flex flex-col items-center z-10 ${arrasto?.slot === idx ? '' : 'transition-all duration-500'}`} style={{ ...(arrasto?.slot === idx ? emCampo(arrasto.x, arrasto.z) : postos && postos[idx] ? emCampo(postos[idx].x, postos[idx].z) : { left: `${pos.x}%`, top: `${pos.y}%` }), transform: `translate(-50%, ${pos.label === 'GK' ? 5 : -15}px)`, opacity: isRed ? 0.2 : 1 }}>
                                    <div
                                        onPointerDown={e => { if (!postos) return; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setArrasto({ slot: idx, ...paraCampo(e.clientX, e.clientY) }); }}
                                        onPointerMove={e => { if (arrasto && arrasto.slot === idx) setArrasto({ slot: idx, ...paraCampo(e.clientX, e.clientY) }); }}
                                        onPointerUp={() => { if (arrasto && arrasto.slot === idx) { aplicarOver(moverPosto(formacaoAtual, overAtual, fase, zonaEfetiva, idx, arrasto.x, arrasto.z)); setArrasto(null); } }}
                                        className="flex items-center justify-center rounded-md border whitespace-nowrap font-black leading-none shadow-sm cursor-grab active:cursor-grabbing touch-none select-none"
                                        style={{ width: 45, height: 30, fontSize: 10, background: color, borderColor: kitNoc || kitCollarColor || 'rgba(255,255,255,0.4)', color: kitNumberColor || '#fff', textShadow: kitNoc ? `0 0 1px ${kitNoc}` : undefined }}>
                                        {player?.shirtNumber ?? '-'}{' | '}{pos.label}
                                    </div>
                                    <span className="mt-0.5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap">{player ? player.name.split(' ').pop() : '---'}</span>
                                </div>
                            );
                        }

                        return (
                            <div key={idx} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropToLineup(e.dataTransfer.getData("playerId"), idx)} className="absolute flex flex-col items-center justify-center w-24 h-24 transition-all duration-500 z-10" style={{ ...(postos && postos[idx] ? emCampo(postos[idx].x, postos[idx].z) : { left: `${pos.x}%`, top: `${pos.y}%` }), transform: `translate(-50%, calc(-50% + ${pos.label === 'GK' ? 20 : 0}px)) scale(0.8)`, opacity: isRed ? 0.2 : 1 }}>
                                <div className="relative">
                                    <div className="absolute top-1/2 -translate-y-1/2 -left-8 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded-sm shadow-sm z-10">
                                        <span className="text-[14px] font-black text-slate-500 dark:text-slate-400 uppercase leading-none block">{pos.label}</span>
                                    </div>
                                    <div draggable={!!player} onDragStart={(e) => e.dataTransfer.setData("playerId", player?.id || "")} className={`relative flex flex-col items-center group mt-[13px] ${player ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                                        <ShirtIcon 
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
                                        />
                                        {player && status && (
                                            <div className="absolute top-0 -right-4 flex flex-col gap-1 items-center">
                                                {status.yellow && <div className="w-3 h-4 bg-yellow-400 border border-yellow-600 rounded-[1px] shadow-sm" />}
                                                {status.red && <div className="w-5 h-7 bg-red-600 border border-gray-950 rounded-sm shadow-xl flex items-center justify-center transform rotate-12 -mr-2"><span className="text-[10px] text-white">🟥</span></div>}
                                                {status.injury && <div className={`text-[18px] ${getInjuryColorClass(status.injury)} font-black drop-shadow-md leading-none mt-1 cursor-help`} title={typeof status.injury === 'object' ? `${status.injury.type} (${status.injury.daysOut} dias)` : 'Contundido na partida'}>✚</div>}
                                            </div>
                                        )}
                                    </div>
                                    {player && (
                                        <div className="absolute top-1/2 -translate-y-1/2 -right-10 flex items-center bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded shadow-md gap-0.5 border border-slate-100 dark:border-slate-700">
                                            <span className={`text-[13px] font-black leading-none ${isRed ? 'text-slate-400' : (player.position !== pos.label ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300')}`}>
                                                {isRed ? 0 : getEffectiveSkill(player, pos.label)}
                                            </span>
                                            <MoraleArrow morale={player.morale} />
                                        </div>
                                    )}
                                </div>
                                <div className="mt-[13px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-0.5 rounded-md shadow-sm max-w-[120px] relative">
                                    {player && (
                                        <div className="absolute -top-[12px] left-1/2 -translate-x-1/2 w-14">
                                            <FitnessBar fitness={player.fitness} className="h-2" />
                                        </div>
                                    )}
                                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase truncate block text-center mt-[2px]">{player ? player.name.split(' ').pop() : '---'}</span>
                                </div>
                            </div>
                        );
                    })}
                    </div>
                </div>

                <div onDragOver={(e) => { e.preventDefault(); setIsOverBench(true); }} onDragLeave={() => setIsOverBench(false)} onDrop={(e) => handleDropToBench(e.dataTransfer.getData("playerId"))} className={`bg-white dark:bg-slate-900/50 rounded-xl p-5 flex flex-col gap-0 h-[201px] shadow-sm border transition-all ${isOverBench ? 'border-blue-400 bg-blue-50/50' : 'border-slate-200 dark:border-slate-800'}`}>
                    <div className="flex justify-between items-center mb-0">
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">SUBSTITUTOS</span>
                            {isMatchOngoing && currentMatch && (
                                <div className="bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-2 shadow-sm">
                                    <span className="text-[9px] font-black text-amber-500/70 uppercase">SUBS RESTANTES</span>
                                    <span className="text-[11px] font-black text-amber-400">{subsRemaining} / {maxSubs}</span>
                                </div>
                            )}
                        </div>
                        <span className="text-xl font-black text-slate-200 italic leading-none">{localBench.length} <span className="text-xs">/ 10</span></span>
                    </div>
                    <div className="flex gap-[2px] overflow-x-auto custom-scrollbar pb-2" onWheel={(e) => { e.currentTarget.scrollLeft += e.deltaY; }}>
                        {sorted_bench.map(id => {
                            const p = players.find(x => x.id === id); if (!p) return null;
                             let benchColor: string; let benchColor2: string | undefined; let benchColor3: string | undefined; let bnc: string | undefined; let bclc: string | undefined; let bnoc: string | undefined; let bsc: string | undefined;
                             let bDiag = false; let bHoriz = false; let bMultiDiag = false; let bDualDiag = false; let bCenterVert = false; let bDiagW: number | undefined = undefined;
                             if (showMatchKit) {
                                 if (p.position === Position.GK) {
                                    const details = getGKKitDetails(userTeam, selectedKitIdx);
                                    benchColor = details.c1;
                                    bnc = details.nc;
                                    bclc = details.clc;
                                    bnoc = details.noc;
                                    bsc = details.sc;
                                 } else { 
                                     const details = getKitDetails(userTeam, selectedKitIdx);
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
                                <div key={p.id} draggable={!indisponivelParaReserva(p.id)} onDragStart={(e) => e.dataTransfer.setData("playerId", p.id)} onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }} onDrop={(e) => { e.stopPropagation(); handleBenchSwap(e.dataTransfer.getData("playerId"), p.id); }} onClick={() => removeFromSquad(p.id)} title={indisponivelParaReserva(p.id) ? "Indisponível: lesionado ou suspenso" : undefined} className={`${indisponivelParaReserva(p.id) ? "opacity-40 grayscale " : ""}flex-shrink-0 w-[85px] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-lg p-1 flex flex-col items-center justify-start hover:border-blue-300 cursor-pointer group shadow-sm transition-all`}>
                                    <div className="flex justify-between w-full items-start mb-1">
                                        <span className="text-[12px] font-black leading-none whitespace-nowrap"><span className="text-slate-400">{p.position}</span> <span className="text-slate-500">|</span> <span className="text-blue-400">{p.skill}</span></span>
                                        <MoraleArrow morale={p.morale} />
                                    </div>
                                    <div className="relative mt-[2px]">
                                        <ShirtIcon 
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
                                        />
                                        {status && (status.yellow || status.injury || status.red) && (
                                            <div className="absolute -top-1 -right-2 flex flex-col gap-0.5 items-center">
                                                {status.yellow && <div className="w-2 h-2.5 bg-yellow-400 border border-yellow-600 rounded-[1px]" />}
                                                {status.red && <div className="w-2 h-2.5 bg-red-600 border border-red-800 rounded-[1px]" />}
                                                {status.injury && <div className={`text-[14px] ${getInjuryColorClass(status.injury)} font-black drop-shadow-sm leading-none cursor-help`} title={typeof status.injury === 'object' ? `${status.injury.type} (${status.injury.daysOut} dias)` : 'Contundido na partida'}>✚</div>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-center w-full mt-[2px] border-t border-slate-100 dark:border-slate-700 pt-[2px]">
                                        <div className="w-14 mx-auto mb-1">
                                            <FitnessBar fitness={p.fitness} className="h-1.5" />
                                        </div>
                                        <div className="flex flex-col items-center justify-start leading-[1.1] mt-0 min-h-[26px]">
                                            {p.name.split(' ').map((part, index) => (
                                                <span key={index} className="text-[9px] font-black text-slate-400 uppercase truncate max-w-full">
                                                    {part}
                                                </span>
                                            ))}
                                        </div>
<AvisosDoCard playerId={p.id} />
                                    </div>
                                </div>
                            );
                        })}
                        {localBench.length === 0 && <div className="flex-1 flex items-center justify-center text-[10px] text-slate-300 font-black uppercase italic tracking-widest border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-lg">Bench Empty</div>}
                    </div>
                </div>
            </div>

            {/* SQUAD POOL e COBRADORES: duas colunas do mesmo tamanho, no espaco que o campo deixa (o campo avanca 109 px sobre ele). */}
            <div className="grid grid-cols-2 gap-4 min-h-0 min-w-0" style={{ marginLeft: 109 }}>
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
                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-slate-950/30 p-2">
                        <div className="flex flex-wrap content-start gap-[2px] min-w-0">
                            {[...availablePlayers].sort((a, b) => {
                                if (poolSortBy === 'skill') return b.skill - a.skill;
                                const posA = POSITION_ORDER[a.position] || 99;
                                const posB = POSITION_ORDER[b.position] || 99;
                                if (posA !== posB) return posA - posB;
                                return b.skill - a.skill;
                            }).map(p => {
                                let d: KitDetails;
                                if (showMatchKit) {
                                    if (p.position === Position.GK) {
                                        d = getGKKitDetails(userTeam, selectedKitIdx);
                                    } else { 
                                        d = getKitDetailsWrapper(userTeam, selectedKitIdx);
                                    }
                                } else {
                                    d = { c1: getPosColor(p.position) };
                                }
                                const status = getPlayerMatchStatus(p.id);

                                return (
                                    <div key={p.id} draggable onDragStart={(e) => e.dataTransfer.setData("playerId", p.id)} className="flex-shrink-0 w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg p-1.5 flex flex-row items-center justify-start gap-2 hover:border-blue-300 cursor-grab active:cursor-grabbing shadow-sm transition-all group">
                                        <div className="relative mt-[2px]">
                                            <ShirtIcon 
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
                                            />
                                            {status && (status.yellow || status.injury || status.red) && (
                                                <div className="absolute -top-1 -right-2 flex flex-col gap-0.5 items-center">
                                                    {status.yellow && <div className="w-2 h-2.5 bg-yellow-400 border border-yellow-600 rounded-[1px]" />}
                                                    {status.red && <div className="w-2 h-2.5 bg-red-600 border border-red-800 rounded-[1px]" />}
                                                    {status.injury && <div className={`text-[14px] ${getInjuryColorClass(status.injury)} font-black drop-shadow-sm leading-none cursor-help`} title={typeof status.injury === 'object' ? `${status.injury.type} (${status.injury.daysOut} dias)` : 'Contundido na partida'}>✚</div>}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                                        <div className="flex justify-between w-full items-start mb-0">
                                            <span className="text-[12px] font-black leading-none whitespace-nowrap"><span className="text-slate-400">{p.position}</span> <span className="text-slate-500">|</span> <span className="text-blue-400">{p.skill}</span></span>
                                            <MoraleArrow morale={p.morale} />
                                        </div>
                                            <FitnessBar fitness={p.fitness} className="h-1.5" />
                                            <div className="flex flex-col items-start justify-start leading-[1.1]">
                                                {p.name.split(' ').map((part, index) => (
                                                    <span key={index} className="text-[9px] font-black text-slate-400 uppercase truncate max-w-full">
                                                        {part}
                                                    </span>
                                                ))}
                                            </div>
                                            <AvisosDoCard playerId={p.id} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

            {/* OS COBRADORES E O CAPITAO: arrastar a camisa do jogador (campo, banco ou squad pool) para a funcao. Fica entre o campo e as instrucoes. */}
            <div className="flex flex-col gap-2 min-h-0 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm overflow-y-auto custom-scrollbar">
                <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">CAPTAIN & SET-PIECE TAKERS</h3>
                {SET_PIECE_ROLES.map(r => {
                    const pid = userTeam.setPieceTakers?.[r.role];
                    const pl = pid ? players.find(x => x.id === pid && x.teamId === userTeam.id) : undefined;
                    // Acompanha o campo: com o botao em 'Uniforme' leva o kit escolhido; em 'Posicao', a cor da posicao do jogador.
                    const d: KitDetails = !pl ? { c1: '#e2e8f0' } : (showMatchKit ? (pl.position === Position.GK ? getGKKitDetails(userTeam, selectedKitIdx) : getKitDetailsWrapper(userTeam, selectedKitIdx)) : { c1: getPosColor(pl.position) });
                    return (
                        <div key={r.role}
                             onDragOver={(e) => { e.preventDefault(); }}
                             onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("playerId"); if (id) assignSetPiece(r.role, id); }}
                             className="flex-1 flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 py-1.5 px-1 hover:border-blue-400 transition-colors">
                            <span className="text-[9px] font-black uppercase tracking-wider text-blue-400 text-center leading-tight">{r.label}</span>
                            {pl ? (
                                <div draggable onDragStart={(e) => e.dataTransfer.setData("playerId", pl.id)} className="relative flex flex-col items-center cursor-grab active:cursor-grabbing">
                                    <ShirtIcon color={d.c1} color2={d.c2} color3={d.c3} diagonal={d.diagonal} dualDiagonal={(d as any).dualDiagonal} centerVerticalStripes={(d as any).centerVerticalStripes}
                                        gradient={d.gradient} spfcStripes={(d as any).spfcStripes} criciumaStripes={(d as any).criciumaStripes} horizontal={(d as any).horizontal}
                                        multipleDiagonals={(d as any).multipleDiagonals} diagonalWidth={d.diagonalWidth} number={pl.shirtNumber} numberColor={d.nc} collarColor={d.clc}
                                        numberOutlineColor={d.noc} sleeveColor={d.sc} scale={0.8} longSleeves={pl.position === Position.GK} />
                                    <span className="text-[9px] font-black text-slate-500 dark:text-slate-300 uppercase truncate max-w-full leading-tight">{pl.name.split(' ').pop()}</span>
                                    <span className="text-[10px] font-black text-amber-500 leading-none">{r.attr.rotulo} {r.attr.valor(pl)}</span>
                                    <button onClick={() => assignSetPiece(r.role, undefined)} title="Remove" className="absolute -top-1 -right-3 text-[10px] font-black text-slate-400 hover:text-rose-500">✕</button>
                                </div>
                            ) : (
                                <div className="h-[62px] flex items-center justify-center text-[9px] font-bold text-slate-400 uppercase italic text-center px-2">drag a player here</div>
                            )}
                        </div>
                    );
                })}
            </div>

            </div>

            <div className="flex flex-col gap-4 min-h-0 min-w-0">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm pb-6">
                    <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic mb-4">UNIFORME</h3>
                    <div className="flex justify-around items-center">
                        {[0, 1, 2, 3].map((idx) => (
                            <div 
                                key={idx} 
                            onClick={() => idx < 3 && setSelectedKitIdx(idx as any)}
                                className={`transition-all p-1 rounded-lg border-2 ${idx < 3 ? 'cursor-pointer hover:border-slate-200' : 'cursor-default'} ${selectedKitIdx === idx ? 'border-blue-400 bg-blue-50/10' : 'border-transparent'}`}
                            >
                                {(() => {
                                    const d = idx === 3 ? getGKKitDetails(userTeam, selectedKitIdx) : getKitDetailsWrapper(userTeam, idx as any);
                                    return <ShirtIcon color={d.c1} color2={d.c2} color3={d.c3} diagonal={d.diagonal} horizontal={(d as any).horizontal} multipleDiagonals={(d as any).multipleDiagonals} dualDiagonal={(d as any).dualDiagonal} centerVerticalStripes={(d as any).centerVerticalStripes} gradient={d.gradient} spfcStripes={(d as any).spfcStripes} criciumaStripes={(d as any).criciumaStripes} diagonalWidth={d.diagonalWidth} number={idx === 3 ? "1" : "9"} numberColor={d.nc} collarColor={d.clc} numberOutlineColor={d.noc} sleeveColor={d.sc} scale={1.2} longSleeves={idx === 3} className="w-[77px] h-[77px]" />;
                                })() }
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-[13px] px-4 shadow-sm min-h-0 flex flex-col">
                    <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic mb-2">TACTICAL INSTRUCTIONS</h3>
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
