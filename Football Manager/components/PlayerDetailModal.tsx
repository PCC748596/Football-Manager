
import { assetUrl } from '../textSim/assetUrl';
import React, { useMemo } from 'react';
import { Player, Position, Team } from '../types';
import { useGame } from '../context/GameContext';
import { TeamShield } from './TeamShield';
import { AttributeGrowthArrow, getStarCount } from './SquadView';
import { createPortal } from 'react-dom';
import { RenovarModal } from './ContractPanel';
import { PlayerFace } from './PlayerFace';
import EnergyBar, { energiaDe, matchFormDe, MatchFormBar } from './EnergyBar';
import { ICONE_DO_ESTILO } from '../textSim/playStyleIcons';
import { IconePlayStyleSvg } from '../textSim/PlayStyleSvg';
import { estiloPorPosicao, estiloValidoDoJogador } from '../textSim/playStyleFallback';
import { atributos3d, campo3d, paisDoJogador } from '../textSim/atributos3d';
import { peBomDe } from '../textSim/peBom';
import { estrelasDoJogador } from '../textSim/youth';
import { PLAYSTYLE_DA_BASE } from '../textSim/playStylesDatabase';
import { PLAYSTYLE_AJUSTES } from '../textSim/playStylesAjustes';
import { PLAYSTYLE_POSITIONS, PLAYSTYLE_DESCRICAO, PlayStyle } from '../types';

interface Props {
  player: Player;
  onClose: () => void;
}

// Helper to generate coordinates for the radar chart
const getCoordinatesForAngle = (angle: number, value: number, center: number, radius: number) => {
  const x = center + (value / 100) * radius * Math.cos(angle);
  const y = center + (value / 100) * radius * Math.sin(angle);
  return { x, y };
};

// A posicao no campo (x = 0 baliza propria ... 100 baliza adversaria; y = 0 lado direito ... 100 lado esquerdo), em %.
const POS_CAMPO: Record<string, [number, number]> = {
  GK: [5, 50], LB: [22, 86], CB: [20, 50], RB: [22, 14], DM: [35, 50], LM: [50, 86], CM: [50, 50], RM: [50, 14], AM: [64, 50], LW: [78, 86], RW: [78, 14], SS: [78, 50], ST: [88, 50]
};

const RadarChart = ({ stats }: { stats: Record<string, number> }) => {
  const size = 260;
  const center = size / 2;
  const radius = 90;
  const keys = Object.keys(stats);
  const total = keys.length;
  const angleStep = (Math.PI * 2) / total;

  // Background polygons (25%, 50%, 75%, 100%)
  const levels = [0.25, 0.5, 0.75, 1];

  const dataPoints = keys.map((key, i) => {
    // -PI/2 to start at top (12 o'clock)
    const angle = i * angleStep - Math.PI / 2;
    return getCoordinatesForAngle(angle, stats[key], center, radius);
  });

  const pathData = dataPoints.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ') + ' Z';

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Background Levels */}
        {levels.map((level, lvlIdx) => (
          <polygon
            key={level}
            points={keys.map((_, i) => {
              const angle = i * angleStep - Math.PI / 2;
              const { x, y } = getCoordinatesForAngle(angle, 100 * level, center, radius);
              return `${x},${y}`;
            }).join(' ')}
            fill="none"
            stroke={lvlIdx === 3 ? "#94a3b8" : "#334155"}
            strokeWidth="1"
            className="opacity-30"
          />
        ))}

        {/* Axes */}
        {keys.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const { x, y } = getCoordinatesForAngle(angle, 100, center, radius);
          return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#334155" strokeWidth="1" className="opacity-50" />;
        })}

        {/* Data Shape */}
        <path d={pathData} fill="rgba(34, 197, 94, 0.4)" stroke="#22c55e" strokeWidth="2" />

        {/* Data Points */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#22c55e" stroke="#fff" strokeWidth="1" />
        ))}

        {/* Labels */}
        {keys.map((label, i) => {
          const angle = i * angleStep - Math.PI / 2;
          // Push labels out a bit further than radius
          const { x, y } = getCoordinatesForAngle(angle, 125, center, radius);
          return (
            <text
              key={label}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[10px] fill-slate-300 font-bold uppercase tracking-wider"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

const PlayerDetailModal: React.FC<Props> = ({ player: initialPlayer, onClose }) => {
  const [activePlayerId, setActivePlayerId] = React.useState(initialPlayer.id);
  const { teams, players, formatCurrency, userTeam, gameState, negociacoes, listarParaEmprestimo, dispensarJogador } = useGame();
  const [aviso, setAviso] = React.useState<string | null>(null);
  const [renovando, setRenovando] = React.useState(false);     // modal da renovacao (ContractPanel.RenovarModal)
  const [dispensando, setDispensando] = React.useState(false); // modal de confirmacao da dispensa

  // ESC fecha o Overview (se o modal de renovacao estiver aberto, o ESC fecha primeiro esse: ele escuta na fase de captura e para o evento).
  React.useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (dispensando) setDispensando(false); else if (!renovando) onClose(); } };   // o modal da renovacao trata o proprio ESC (fase de captura)
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [onClose, dispensando, renovando]);

  React.useEffect(() => {
    setActivePlayerId(initialPlayer.id);
  }, [initialPlayer.id]);

  const player = useMemo(() => players.find(p => p.id === activePlayerId) || initialPlayer, [activePlayerId, players, initialPlayer]);
  const team = teams.find(t => t.id === player.teamId);
  const teamPlayers = useMemo(() => players.filter(p => p.teamId === player.teamId).sort((a, b) => b.skill - a.skill), [players, player.teamId]);

  // Navegacao pelo plantel por OVR: ▲ o jogador logo acima (OVR maior), ▼ o logo abaixo.
  const idxNoElenco = teamPlayers.findIndex(p => p.id === player.id);
  const anterior = idxNoElenco > 0 ? teamPlayers[idxNoElenco - 1] : undefined;
  const proximo = idxNoElenco >= 0 && idxNoElenco < teamPlayers.length - 1 ? teamPlayers[idxNoElenco + 1] : undefined;

  // As setas do teclado fazem o mesmo que os botoes: ↑ o jogador logo acima, ↓ o logo abaixo.
  React.useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      const alvo = e.target as HTMLElement | null;
      if (alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.tagName === 'SELECT' || alvo.isContentEditable)) return;
      const novo = e.key === 'ArrowUp' ? anterior : proximo;
      e.preventDefault();
      if (novo) setActivePlayerId(novo.id);
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [anterior?.id, proximo?.id]);

  // Derive detailed stats from the basic 4 attributes to populate the UI realistically
  const detailedStats = useMemo(() => {
    // Base modifiers based on position
    const isGk = player.position === Position.GK;
    const isDef = [Position.LB, Position.CB, Position.RB].includes(player.position);
    const isMid = [Position.DM, Position.CM, Position.LM, Position.RM, Position.AM].includes(player.position);

    // Core attributes mapped
    const def = player.def;
    const pas = player.pas;
    const drb = player.drb;
    const sht = player.sht;
    const phy = Math.round((energiaDe(player) +(isDef ? def : 60)) / 2); // Approximation for Physical
    const spd = Math.round((drb + (isMid ? pas : sht)) / 2); // Approximation for Pace/Speed

    // O radar usa SO os atributos do 3D (textSim/atributos3d.ts): as quatro medias e quatro habilidades tiradas dos campos.
    const a3 = atributos3d(player);
    const mediaDe = (campos: string[]) => {
      const todos = [...a3.detalhe!.TEC, ...a3.detalhe!.TAC, ...a3.detalhe!.MEN, ...a3.detalhe!.FIS, ...(a3.detalhe!.GK || [])];
      const v = campos.map(c => todos.find(x => x.campo === c)?.valor).filter((x): x is number => typeof x === 'number');
      return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : 0;
    };
    const radarData = isGk ? {
      Technique: a3.tec, Tactical: a3.tac, Mental: a3.men, Physical: a3.fis,
      Diving: mediaDe(['diving']), Handling: mediaDe(['handling']), Reflexes: mediaDe(['reflexes']), Positioning: mediaDe(['posGK'])
    } : {
      Technique: a3.tec, Tactical: a3.tac, Mental: a3.men, Physical: a3.fis,
      Attacking: mediaDe(['finishing', 'shotPower', 'longShots', 'volleys']), Defending: mediaDe(['tackleStanding', 'tackleSliding', 'manMarking', 'posDefense']),
      Passing: mediaDe(['passing', 'longPassing', 'vision']), Pace: mediaDe(['speed', 'acceleration'])
    };

    return {
      pace: spd,
      shooting: sht,
      passing: pas,
      dribbling: drb,
      defending: def,
      physical: phy,
      radarData
    };
  }, [player, team]);

  const attr3d = atributos3d(player);

  const getColorClass = (val: number) => {
    if (val >= 80) return 'text-emerald-500';
    if (val >= 70) return 'text-blue-400';
    if (val >= 60) return 'text-yellow-500';
    return 'text-rose-500';
  };

  /*
  O PLAYSTYLE E O DA BASE (o `estilo` do jogador no squads.js do 3D, pelo id `p-<idPlayer>`; a mesma coisa que o jogo usa em campo). Nao ha
  estilos inventados ("Worker", "Speedster"...): quem nao esta na base (jogador gerado) leva o primeiro estilo da base que serve a sua posicao,
  e o "Creative Playmaker" quando nenhum serve.
  */
  const playStyles = useMemo(() => {
    const daBase = estiloValidoDoJogador(player,
      team ? PLAYSTYLE_AJUSTES[`${team.name}|${player.name}`] : undefined,
      player.playStyle,   // o estilo definido pela base Sub-20 (a partir dos 18 anos)
      PLAYSTYLE_DA_BASE[player.id]);
    return [{ icon: ICONE_DO_ESTILO[daBase] || '💡', name: daBase, descricao: PLAYSTYLE_DESCRICAO[daBase as PlayStyle] || '' }];
  }, [player, team]);

  // O resumo (as seis medidas do cartao): tiradas SO dos atributos do 3D. O goleiro mostra os seus (Diving, Handling, Kicking, Reflexes, Speed, Positioning).
  const resumo = player.position === Position.GK ? [
    { rotulo: 'Diving', valor: campo3d(player, ['diving']) }, { rotulo: 'Handling', valor: campo3d(player, ['handling']) }, { rotulo: 'Kicking', valor: campo3d(player, ['kicking']) },
    { rotulo: 'Reflexes', valor: campo3d(player, ['reflexes']) }, { rotulo: 'Speed', valor: campo3d(player, ['speed', 'acceleration']) }, { rotulo: 'Positioning', valor: campo3d(player, ['posGK']) }
  ] : [
    { rotulo: 'Pace', valor: campo3d(player, ['speed', 'acceleration']) },
    { rotulo: 'Shooting', valor: campo3d(player, ['finishing', 'shotPower', 'longShots', 'volleys', 'penalties']) },
    { rotulo: 'Passing', valor: campo3d(player, ['passing', 'longPassing', 'vision', 'crossing']) },
    { rotulo: 'Dribbling', valor: campo3d(player, ['dribbling', 'ballControl', 'agility', 'balance']) },
    { rotulo: 'Defending', valor: campo3d(player, ['tackleStanding', 'tackleSliding', 'manMarking', 'posDefense']) },
    { rotulo: 'Physical', valor: attr3d.fis }
  ];
  const corDaBarra = (v: number) => (v >= 80 ? '#10b981' : v >= 70 ? '#60a5fa' : v >= 60 ? '#eab308' : '#f43f5e');

  // Os atributos mais importantes da posicao (3 em Technical/Tactical/Physical/Goalkeeping, 2 em Mental), marcados com hachura. Goalkeeping so o goleiro.
  const CHAVES_POR_POSICAO: Record<string, Partial<Record<'TEC' | 'TAC' | 'MEN' | 'FIS' | 'GK', string[]>>> = {
    GK: { TEC: ['passing', 'longPassing', 'ballControl'], TAC: ['posDefense', 'tacticalAwa', 'vision'], MEN: ['reactions', 'composure'], FIS: ['jumping', 'agility', 'balance'], GK: ['reflexes', 'diving', 'handling'] },
    CB: { TEC: ['headAccurancy', 'passing', 'ballControl'], TAC: ['tackleStanding', 'manMarking', 'posDefense'], MEN: ['aggression', 'composure'], FIS: ['strength', 'jumping', 'speed'] },
    LB: { TEC: ['crossing', 'passing', 'dribbling'], TAC: ['tackleStanding', 'posDefense', 'manMarking'], MEN: ['consistency', 'reactions'], FIS: ['speed', 'stamina', 'acceleration'] },
    RB: { TEC: ['crossing', 'passing', 'dribbling'], TAC: ['tackleStanding', 'posDefense', 'manMarking'], MEN: ['consistency', 'reactions'], FIS: ['speed', 'stamina', 'acceleration'] },
    DM: { TEC: ['passing', 'ballControl', 'longPassing'], TAC: ['tackleStanding', 'posDefense', 'tacticalAwa'], MEN: ['aggression', 'composure'], FIS: ['stamina', 'strength', 'balance'] },
    CM: { TEC: ['passing', 'ballControl', 'longPassing'], TAC: ['vision', 'tacticalAwa', 'posDefense'], MEN: ['consistency', 'composure'], FIS: ['stamina', 'balance', 'agility'] },
    LM: { TEC: ['crossing', 'dribbling', 'ballControl'], TAC: ['posOffense', 'vision', 'tacticalAwa'], MEN: ['consistency', 'composure'], FIS: ['speed', 'stamina', 'acceleration'] },
    RM: { TEC: ['crossing', 'dribbling', 'ballControl'], TAC: ['posOffense', 'vision', 'tacticalAwa'], MEN: ['consistency', 'composure'], FIS: ['speed', 'stamina', 'acceleration'] },
    AM: { TEC: ['passing', 'dribbling', 'ballControl'], TAC: ['vision', 'posOffense', 'tacticalAwa'], MEN: ['composure', 'reactions'], FIS: ['agility', 'balance', 'acceleration'] },
    LW: { TEC: ['dribbling', 'crossing', 'ballControl'], TAC: ['posOffense', 'vision', 'tacticalAwa'], MEN: ['composure', 'reactions'], FIS: ['speed', 'acceleration', 'agility'] },
    RW: { TEC: ['dribbling', 'crossing', 'ballControl'], TAC: ['posOffense', 'vision', 'tacticalAwa'], MEN: ['composure', 'reactions'], FIS: ['speed', 'acceleration', 'agility'] },
    SS: { TEC: ['finishing', 'dribbling', 'ballControl'], TAC: ['posOffense', 'vision', 'tacticalAwa'], MEN: ['composure', 'reactions'], FIS: ['acceleration', 'agility', 'speed'] },
    ST: { TEC: ['finishing', 'shotPower', 'headAccurancy'], TAC: ['posOffense', 'tacticalAwa', 'vision'], MEN: ['composure', 'reactions'], FIS: ['strength', 'acceleration', 'speed'] }
  };
  const HACHURA: React.CSSProperties = { backgroundImage: 'repeating-linear-gradient(135deg, rgba(0,0,0,0.65) 0, rgba(0,0,0,0.65) 1.5px, rgba(100,116,139,0.45) 1.5px, rgba(100,116,139,0.45) 3px)', borderRadius: 4 };

  // Um bloco de atributos (Technical, Tactical, Mental, Physical, Goalkeeping): titulo com a media e o ganho do treino da temporada, e a lista de campos.
  const blocoAtributos = (g: 'TEC' | 'TAC' | 'MEN' | 'FIS' | 'GK') => {
    const lista = ((attr3d.detalhe as any)[g] || []) as { campo: string; nome: string; valor: number }[];
    const media = g === 'TEC' ? attr3d.tec : g === 'TAC' ? attr3d.tac : g === 'MEN' ? attr3d.men : g === 'FIS' ? attr3d.fis : (attr3d.gk || 0);
    const nomeG = g === 'TEC' ? 'Technical' : g === 'TAC' ? 'Tactical' : g === 'MEN' ? 'Mental' : g === 'FIS' ? 'Physical' : 'Goalkeeping';
    const inicio = g === 'GK' ? undefined : player.treino3dSeasonStart?.[g.toLowerCase()];
    const delta = inicio === undefined ? 0 : media - inicio;
    return (
      // Cada linha (titulo ou campo) e uma celula da grelha da coluna: todas as colunas tem o mesmo passo entre linhas.
      <React.Fragment key={g}>
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-black text-slate-300 uppercase tracking-wide">{nomeG}</span>
          <span className="flex items-baseline gap-1">
            <span className={`text-lg font-black ${getColorClass(media)}`}>{media}</span>
            {delta !== 0 && <span className={`text-xs font-black ${delta > 0 ? 'text-emerald-500' : 'text-red-500'}`}>{delta > 0 ? '+' : ''}{delta}</span>}
          </span>
        </div>
        {lista.map(x => (
          <div key={x.campo} className="flex items-center justify-between text-sm px-1 -mx-1"
            style={((CHAVES_POR_POSICAO[player.position] as any)?.[g] || []).includes(x.campo) ? HACHURA : undefined}>
            <span className="text-slate-300">{x.nome}</span>
            <span className={`font-black ${getColorClass(x.valor)}`}>{x.valor}</span>
          </div>
        ))}
      </React.Fragment>
    );
  };
  const nLinhas = (g: 'TEC' | 'TAC' | 'MEN' | 'FIS' | 'GK') => 1 + (((attr3d.detalhe as any)[g] || []) as unknown[]).length;
  const temGK = !!(attr3d.detalhe && attr3d.detalhe.GK);
  // O PADRAO DO GOLEIRO: o goleiro tem mais linhas (Physical + Goalkeeping = 1 + 7 + 1 + 6). Todos os jogadores usam essa grelha (linha minima fixa), assim o modal tem sempre a mesma altura ao trocar de jogador.
  const LINHAS_DO_GOLEIRO = 15, ALTURA_MIN_LINHA = 22;
  const totalLinhas = Math.max(LINHAS_DO_GOLEIRO, nLinhas('TEC'), nLinhas('TAC') + nLinhas('MEN'), nLinhas('FIS') + (temGK ? nLinhas('GK') : 0));
  const grelhaColuna: React.CSSProperties = { gridTemplateRows: `repeat(${totalLinhas}, minmax(${ALTURA_MIN_LINHA}px, 1fr))` };

  // As mesmas estrelas do Squad: douradas = o nivel atual (pelo OVR); cinzentas = o que falta ate ao potencial; apagadas (pretas) = acima do potencial.
  const stars = (atual: number, potencial: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <span key={i} className={`text-2xl leading-none ${i <= atual ? 'text-yellow-400' : i <= potencial ? 'text-slate-400' : 'text-slate-700'}`}>★</span>
        ))}
      </div>
    )
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="w-[80vw] max-w-[1100px] max-h-[80vh] bg-slate-950 rounded-xl overflow-hidden flex border border-slate-800 shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Background Art */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4"></div>
        </div>

        {/* RIGHT PANEL: o cartao do jogador (cabecalho, atributos em tres colunas, radar, campo e contrato) */}
        <div className="flex-1 flex flex-col relative z-10 min-h-0 min-w-0 overflow-y-auto custom-scrollbar p-4 gap-3">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-x-10 gap-y-6 items-stretch">
            <div className="min-w-0 flex flex-col gap-4">
              {/* CABECALHO: rosto, nome, escudo + posicao + OVR, dados */}
              <div className="flex items-center gap-5 pr-10">
                <div className="w-28 h-28 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 overflow-hidden shrink-0">
                  <PlayerFace playerId={player.id} camisa={team?.primaryColor} className="w-full h-full" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <h2 className="text-4xl xl:text-5xl font-black text-white uppercase tracking-tight leading-none truncate">{player.name}</h2>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => anterior && setActivePlayerId(anterior.id)} disabled={!anterior} title={anterior ? `${anterior.name} (${Math.round(anterior.skill)})` : ''} className="w-8 h-6 flex items-center justify-center rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">▲</button>
                      <button onClick={() => proximo && setActivePlayerId(proximo.id)} disabled={!proximo} title={proximo ? `${proximo.name} (${Math.round(proximo.skill)})` : ''} className="w-8 h-6 flex items-center justify-center rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">▼</button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    {team && <TeamShield team={team} className="w-8 h-10" />}
                    <span className="text-2xl font-bold text-slate-400 uppercase">{player.position}</span>
                    <span className="w-px h-9 bg-slate-700" />
                    <span className={`text-4xl font-black ${getColorClass(player.skill)}`}>{Math.round(player.skill)}</span>
                    <span className="ml-2">{stars(getStarCount(player.skill), estrelasDoJogador(player))}</span>
                  </div>
                  <div className="mt-2 flex items-center flex-wrap gap-x-2 text-sm text-slate-400 font-medium">
                    <span>{player.age} years</span><span>•</span>
                    <img src={assetUrl(`/Assets/Bandeiras/${paisDoJogador(player, (team as any)?.country) || 'x'}.png`)} alt="" title="Nationality" className="w-6 h-4 object-cover rounded-sm border border-slate-700" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    <span>•</span><span>{peBomDe(player) === 'e' ? 'Left foot' : 'Right foot'}</span>
                    {attr3d.altura ? <><span>•</span><span>{attr3d.altura} cm / {attr3d.peso || '-'} kg</span></> : null}
                    {playStyles[0] ? <><span>•</span><span className="inline-flex items-center gap-1.5" title={(playStyles[0] as any).descricao || ''}><IconePlayStyleSvg estilo={playStyles[0].name} tam={18} />{playStyles[0].name}</span></> : null}
                  </div>
                </div>
              </div>

              {/* ATRIBUTOS: Technical | Tactical + Mental | Physical (+ Goalkeeping) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-3 flex-1">
                <div className="grid" style={grelhaColuna}>{blocoAtributos('TEC')}</div>
                <div className="grid" style={grelhaColuna}>{blocoAtributos('TAC')}{blocoAtributos('MEN')}</div>
                <div className="grid" style={grelhaColuna}>{blocoAtributos('FIS')}{temGK ? blocoAtributos('GK') : null}</div>
              </div>
            </div>

            {/* COLUNA DIREITA: radar, posicao no campo, contrato / valor / condicao */}
            <div className="flex flex-col gap-3 items-stretch">
              <div className="flex items-center justify-center py-0 -my-6 scale-90"><RadarChart stats={detailedStats.radarData} /></div>
              <div className="relative w-full aspect-[105/68] border border-slate-600 rounded-sm bg-slate-900/40" title={`Position: ${player.position}`}>
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-600" />
                <div className="absolute left-1/2 top-1/2 w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-600" />
                <div className="absolute left-0 top-1/4 bottom-1/4 w-[14%] border border-l-0 border-slate-600" />
                <div className="absolute right-0 top-1/4 bottom-1/4 w-[14%] border border-r-0 border-slate-600" />
                <div className="absolute left-0 top-[38%] bottom-[38%] w-[5%] border border-l-0 border-slate-600" />
                <div className="absolute right-0 top-[38%] bottom-[38%] w-[5%] border border-r-0 border-slate-600" />
                <div className="absolute left-[14%] top-[36%] bottom-[36%] w-[6%] border border-l-0 border-slate-600" style={{ borderRadius: '0 999px 999px 0' }} />
                <div className="absolute right-[14%] top-[36%] bottom-[36%] w-[6%] border border-r-0 border-slate-600" style={{ borderRadius: '999px 0 0 999px' }} />
                {(() => {
                  // As posicoes centrais (CB, DM, CM, AM) ganham uma vaga de cada lado (y maior = esquerda). O destro acende a central e a da direita; o canhoto, a central e a da esquerda.
                  const lado = peBomDe(player) === 'e' ? 'e' : 'd';
                  const itens: { id: string; pos: string; x: number; y: number; ativa: boolean }[] = [];
                  Object.entries(POS_CAMPO).forEach(([pos, [x, y]]) => {
                    itens.push({ id: pos, pos, x, y, ativa: pos === player.position });
                    if (['CB', 'DM', 'CM', 'AM', 'SS', 'ST'].includes(pos)) {
                      itens.push({ id: pos + 'e', pos, x, y: y - 16, ativa: pos === player.position && lado === 'e' });
                      itens.push({ id: pos + 'd', pos, x, y: y + 16, ativa: pos === player.position && lado === 'd' });
                    }
                  });
                  return itens;
                })().map(({ id: key, pos, x, y, ativa }) => {
                  return (
                    <span key={key} title={pos} className={`absolute w-6 h-5 flex items-center justify-center rounded-md border text-[9px] font-black leading-none -translate-x-1/2 -translate-y-1/2 ${ativa ? 'z-10 bg-emerald-400 border-emerald-300 text-slate-900 shadow-[0_0_10px_rgba(52,211,153,0.9)]' : 'bg-slate-800/60 border-slate-600/70 text-slate-500'}`} style={{ left: `${x}%`, top: `${y}%` }}>
                      {pos}
                    </span>
                  );
                })}
              </div>
              <div className="flex flex-col gap-0.5 text-sm leading-tight">
                <div className="flex justify-between"><span className="text-slate-400">Contract</span><span className="font-black text-white">{player.contract?.end ? player.contract.end.split('-').reverse().join('/') : '-'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Value</span><span className="font-black text-white">{formatCurrency(player.value)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Condition</span><span className="font-black text-white">{Math.round(energiaDe(player))}%</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Match Form</span><span className="font-black text-white">{Math.round(matchFormDe(player))}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Morale</span><span className="font-black text-white">{Math.round(player.morale)}</span></div>
              </div>
              {userTeam && player.teamId === userTeam.id && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button onClick={() => setRenovando(true)} title={negociacoes.some(n => n.playerId === player.id) ? 'Negotiation in progress' : 'Renew contract'} className="min-w-0 text-[10px] font-black uppercase tracking-wider leading-tight py-2 px-1 rounded border bg-blue-600 hover:bg-blue-500 text-white border-blue-500">
                    {negociacoes.some(n => n.playerId === player.id) ? 'Negotiating' : 'Renew'}
                  </button>
                  <button onClick={() => { const r = listarParaEmprestimo(player.id, !player.listedForLoan); setAviso(r.ok ? (player.listedForLoan ? 'Removed from the loan list' : 'Listed for loan (morale -5)') : (r.motivo || 'Not possible')); }}
                    title={player.listedForLoan ? 'Listed for loan (click to remove)' : 'Put on the loan list'}
                    className={`min-w-0 text-[10px] font-black uppercase tracking-wider leading-tight py-2 px-1 rounded border ${player.listedForLoan ? 'bg-sky-600 text-white border-sky-500' : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'}`}>
                    {player.listedForLoan ? 'On loan list' : 'Loan'}
                  </button>
                  <button onClick={() => setDispensando(true)} title="Release player" className="min-w-0 text-[10px] font-black uppercase tracking-wider leading-tight py-2 px-1 rounded border border-rose-700 text-rose-400 hover:bg-rose-900/40">Release</button>
                  {aviso && <div className="col-span-3 text-[11px] text-amber-400 font-bold">{aviso}</div>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Close Button (fixo no modal: o painel da direita rola) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded-full transition-colors"
        >
          ✕
        </button>
      </div>
      {renovando && <RenovarModal player={player} hoje={gameState.currentDate} onClose={() => setRenovando(false)} />}
      {dispensando && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={e => { e.stopPropagation(); setDispensando(false); }}>
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <div className="text-[10px] font-black uppercase tracking-widest text-rose-400">Release player</div>
            <div className="flex items-center gap-4">
              <div className="text-5xl font-black italic text-blue-400">{Math.round(player.skill)}</div>
              <div className="min-w-0">
                <div className="text-lg font-black text-white truncate">{player.name}</div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{player.position} • {player.age} years</div>
              </div>
            </div>
            <div className="text-xs text-slate-300 leading-relaxed">
              The contract is terminated and {player.name} becomes a free agent. You receive no transfer fee. This cannot be undone.
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDispensando(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-black py-2.5 rounded text-xs uppercase tracking-widest">Cancel</button>
              <button onClick={() => { const r = dispensarJogador(player.id); setDispensando(false); if (r.ok) onClose(); else setAviso(r.motivo || 'Not possible'); }} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-black py-2.5 rounded text-xs uppercase tracking-widest">Release</button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
};

export default PlayerDetailModal;
