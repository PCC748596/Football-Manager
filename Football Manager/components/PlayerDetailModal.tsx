
import React, { useMemo } from 'react';
import { Player, Position, Team } from '../types';
import { useGame } from '../context/GameContext';
import { TeamShield } from './TeamShield';
import { AttributeGrowthArrow } from './SquadView';
import { PlayerFace } from './PlayerFace';
import { ContractPanel } from './ContractPanel';
import { ICONE_DO_ESTILO } from '../textSim/playStyleIcons';
import { atributos3d, campo3d, paisDoJogador } from '../textSim/atributos3d';
import { peBomDe } from '../textSim/peBom';
import { potencialVisivel, estrelasDoJogador } from '../textSim/youth';
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
  const { teams, players, userTeam, listarParaVenda, listarParaEmprestimo, dispensarJogador } = useGame();
  const [aviso, setAviso] = React.useState<string | null>(null);
  const [dispensando, setDispensando] = React.useState(false);   // modal de confirmacao da dispensa

  // ESC fecha o Overview (se o modal de renovacao estiver aberto, o ESC fecha primeiro esse: ele escuta na fase de captura e para o evento).
  React.useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (dispensando) setDispensando(false); else onClose(); } };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [onClose, dispensando]);

  React.useEffect(() => {
    setActivePlayerId(initialPlayer.id);
  }, [initialPlayer.id]);

  const player = useMemo(() => players.find(p => p.id === activePlayerId) || initialPlayer, [activePlayerId, players, initialPlayer]);
  const team = teams.find(t => t.id === player.teamId);
  const teamPlayers = useMemo(() => players.filter(p => p.teamId === player.teamId).sort((a, b) => b.skill - a.skill), [players, player.teamId]);

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
    const phy = Math.round((player.fitness + (isDef ? def : 60)) / 2); // Approximation for Physical
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
    const daBase = (team ? PLAYSTYLE_AJUSTES[`${team.name}|${player.name}`] : undefined)
      || (player.playStyle && player.playStyle !== 'None' ? player.playStyle : undefined)   // o estilo definido pela base Sub-20 (a partir dos 18 anos)
      || PLAYSTYLE_DA_BASE[player.id]
      || (Object.keys(PLAYSTYLE_POSITIONS) as PlayStyle[]).find(s => s !== 'None' && PLAYSTYLE_POSITIONS[s].includes(player.position))
      || 'Creative Playmaker';
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
    { rotulo: 'Physical', valor: campo3d(player, ['strength', 'stamina', 'jumping', 'aggression']) }
  ];
  const corDaBarra = (v: number) => (v >= 80 ? '#10b981' : v >= 70 ? '#60a5fa' : v >= 60 ? '#eab308' : '#f43f5e');

  const stars = (count: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <span key={i} className={`text-xs ${i <= count ? 'text-yellow-400' : 'text-slate-700'}`}>★</span>
        ))}
      </div>
    )
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-6xl h-[92vh] max-h-[900px] bg-slate-950 rounded-xl overflow-hidden flex border border-slate-800 shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Background Art */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4"></div>
        </div>

        {/* LEFT PANEL: o plantel em tabela (Pos, Name, Age, OVR, Form) */}
        <div className="w-[380px] bg-slate-900/60 border-r border-slate-800 hidden md:flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-3">
            <span className="text-xs font-black text-white uppercase tracking-widest">Squad</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{team?.name}</span>
          </div>
          <div className="grid grid-cols-[34px_38px_1fr_34px_40px_40px] gap-1 px-3 py-1.5 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
            <span>Pos</span><span></span><span>Name</span><span className="text-center">Age</span><span className="text-center">OVR</span><span className="text-center">Form</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
            {teamPlayers.map(p => (
              <button
                key={p.id}
                onClick={() => setActivePlayerId(p.id)}
                className={`grid grid-cols-[34px_38px_1fr_34px_40px_40px] gap-1 items-center px-3 py-1.5 text-left border-b border-slate-800/60 transition-colors ${p.id === player.id ? 'bg-slate-700/60 ring-1 ring-inset ring-blue-500/60' : 'hover:bg-slate-800/60'}`}
              >
                <span className="text-[10px] font-black text-slate-400">{p.position}</span>
                <span className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 overflow-hidden block"><PlayerFace playerId={p.id} camisa={team?.primaryColor} className="w-full h-full" /></span>
                <span className={`text-xs font-bold truncate ${p.id === player.id ? 'text-white' : 'text-slate-300'}`}>{p.name}</span>
                <span className="text-[11px] text-slate-400 text-center">{p.age}</span>
                <span className={`text-xs font-black text-center ${getColorClass(p.skill)}`}>{Math.round(p.skill)}</span>
                <span className={`text-[11px] font-black text-center ${p.fitness >= 80 ? 'text-emerald-400' : p.fitness >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>{p.fitness >= 80 ? '▲' : p.fitness >= 60 ? '▶' : '▼'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL: o cartao do jogador */}
        <div className="flex-1 flex flex-col relative z-10 min-h-0 min-w-0 overflow-y-auto custom-scrollbar">
          {/* HERO: OVR e posicao, nome, dados, rosto */}
          <div className="p-6 pb-3 flex items-stretch gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-3">
                <span className={`text-6xl font-black italic leading-none ${getColorClass(player.skill)}`}>{Math.round(player.skill)}</span>
                <span className="text-sm font-black text-slate-300 uppercase tracking-widest">{player.position}{playStyles[0] ? ` · ${playStyles[0].name}` : ''}</span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <img src={`/Assets/Bandeiras/${paisDoJogador(player, (team as any)?.country) || 'x'}.png`} alt="" title="Nationality" className="w-10 h-7 object-cover rounded-sm border border-slate-700" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none">{player.name.split(' ').slice(0, -1).join(' ') || team?.name}</div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tight leading-tight truncate">{player.name.split(' ').slice(-1)[0]}</h2>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 max-w-xl">
                <div className="bg-slate-900/60 border border-slate-800 rounded px-3 py-1.5"><div className="text-[9px] font-bold text-slate-500 uppercase">Age</div><div className="text-sm font-black text-white">{player.age}</div></div>
                <div className="bg-slate-900/60 border border-slate-800 rounded px-3 py-1.5"><div className="text-[9px] font-bold text-slate-500 uppercase">Height / Weight</div><div className="text-sm font-black text-white">{attr3d.altura ? `${attr3d.altura} cm / ${attr3d.peso || '-'} kg` : '-'}</div></div>
                <div className="bg-slate-900/60 border border-slate-800 rounded px-3 py-1.5"><div className="text-[9px] font-bold text-slate-500 uppercase">Potential</div><div>{stars(estrelasDoJogador(player))}</div></div>
                <div className="bg-slate-900/60 border border-slate-800 rounded px-3 py-1.5"><div className="text-[9px] font-bold text-slate-500 uppercase">Preferred foot</div><div className="text-sm font-black text-white">{peBomDe(player) === 'e' ? 'Left' : 'Right'}</div></div>
              </div>
            </div>
            <div className="w-40 h-40 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 overflow-hidden shrink-0 mr-10">
              <PlayerFace playerId={player.id} camisa={team?.primaryColor} className="w-full h-full" />
            </div>
          </div>

          <div className="px-6 pb-6 grid grid-cols-2 gap-5 items-start">
            {/* SUMMARY: as seis medidas de resumo, tiradas dos atributos do 3D */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <div className="text-sm font-bold text-white mb-2">Summary</div>
              <div className="flex flex-col gap-1">
                {resumo.map(r => (
                  <div key={r.rotulo} className="flex items-center gap-3 px-2 py-1 rounded bg-slate-950/40">
                    <span className="text-xs font-bold text-slate-300 w-24">{r.rotulo}</span>
                    <div className="flex-1 h-1.5 bg-slate-800 rounded overflow-hidden"><div className="h-full rounded" style={{ width: `${Math.max(0, (r.valor - 50) / 49 * 100)}%`, background: corDaBarra(r.valor) }} /></div>
                    <span className={`text-base font-black w-8 text-right ${getColorClass(r.valor)}`}>{r.valor}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-sm font-bold text-white mb-2">PlayStyle</div>
              <div className="flex gap-4 items-start">
                {playStyles.map((style, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div title={(style as any).descricao || style.name} className="w-11 h-11 bg-slate-800 rounded rotate-45 border border-slate-600 flex items-center justify-center shadow-lg shrink-0">
                      <span className="-rotate-45 text-xl">{style.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-black text-slate-200 uppercase tracking-widest">{style.name}</div>
                      {(style as any).descricao && <div className="text-[10px] leading-snug text-slate-500">{(style as any).descricao}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DEVELOPMENT: OVR actual contra o potencial estimado */}
            <div className="flex flex-col gap-5">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <div className="text-sm font-bold text-white mb-2">Player Development</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                  <span className="text-slate-500">Weekly growth</span><span className={`font-black text-right ${player.weeklyGrowth > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>{player.weeklyGrowth > 0 ? '+' : ''}{player.weeklyGrowth}</span>
                  <span className="text-slate-500">Fitness</span><span className="font-black text-right text-slate-200">{Math.round(player.fitness)}%</span>
                  <span className="text-slate-500">Morale</span><span className="font-black text-right text-slate-200">{Math.round(player.morale)}</span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Progress</span>
                  <span className="text-sm font-black text-white">{Math.round(player.skill)}</span>
                  <div className="flex-1 h-2 bg-slate-800 rounded overflow-hidden relative">
                    <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, Math.max(0, (player.skill / Math.max(player.skill, potencialVisivel(player))) * 100))}%` }} />
                  </div>
                  <span className="text-sm font-black text-slate-300">{Math.max(Math.round(player.skill), potencialVisivel(player))}</span>
                </div>
                <div className="text-[9px] text-slate-500 mt-1">The right-hand number is the scout's potential estimate.</div>
              </div>
              <ContractPanel player={player} />
              {userTeam && player.teamId === userTeam.id && (
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button onClick={() => { const r = listarParaVenda(player.id, !player.listedForSale); setAviso(r.ok ? (player.listedForSale ? 'Removido da lista de venda' : 'Listado para venda (moral -8)') : (r.motivo || 'Nao foi possivel')); }}
                      className={`flex-1 text-[10px] font-black uppercase py-2 rounded border ${player.listedForSale ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'}`}>
                      {player.listedForSale ? 'Na lista de venda (retirar)' : 'Colocar a venda'}
                    </button>
                    <button onClick={() => { const r = listarParaEmprestimo(player.id, !player.listedForLoan); setAviso(r.ok ? (player.listedForLoan ? 'Removido da lista de emprestimo' : 'Listado para emprestimo (moral -5)') : (r.motivo || 'Nao foi possivel')); }}
                      className={`flex-1 text-[10px] font-black uppercase py-2 rounded border ${player.listedForLoan ? 'bg-sky-600 text-white border-sky-500' : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'}`}>
                      {player.listedForLoan ? 'Na lista de emprestimo (retirar)' : 'Colocar para emprestimo'}
                    </button>
                  </div>
                  <button onClick={() => setDispensando(true)} className="text-[10px] font-black uppercase py-2 rounded border border-rose-700 text-rose-400 hover:bg-rose-900/40">Dispensar</button>
                  <div className="text-[9px] text-slate-500">Listar para venda reduz a moral em 8; para emprestimo, em 5.</div>
                  {aviso && <div className="text-[10px] text-amber-400 font-bold">{aviso}</div>}
                </div>
              )}
            </div>

            {/* 3D MATCH ATTRIBUTES: todos os atributos, por grupo (o goleiro leva tambem os de baliza) */}
            <div className="col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <div className="text-sm font-bold text-white mb-3">3D Match Attributes</div>
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                {(['TEC', 'TAC', 'MEN', 'FIS', ...(attr3d.detalhe && attr3d.detalhe.GK ? ['GK'] : [])] as const).map((g: any) => {
                  const lista = (attr3d.detalhe as any)[g] as { campo: string; nome: string; valor: number }[];
                  const media = g === 'TEC' ? attr3d.tec : g === 'TAC' ? attr3d.tac : g === 'MEN' ? attr3d.men : g === 'FIS' ? attr3d.fis : (attr3d.gk || 0);
                  const nomeG = g === 'TEC' ? 'Technique' : g === 'TAC' ? 'Tactical' : g === 'MEN' ? 'Mental' : g === 'FIS' ? 'Physical' : 'Goalkeeping';
                  return (
                    <div key={g} className="bg-slate-950/40 px-3 py-2 rounded border border-slate-800/60">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-1 mb-1">
                        <span className="text-xs font-black text-white uppercase tracking-widest">{g} <span className="text-slate-500 font-bold normal-case tracking-normal">{nomeG}</span></span>
                        <span className={`text-lg font-black ${getColorClass(media)}`}>{media}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {lista.map(x => (
                          <div key={x.campo} className="flex justify-between text-[11px]">
                            <span className="text-slate-400">{x.nome}</span>
                            <span className={`font-black ${getColorClass(x.valor)}`}>{x.valor}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="col-span-2 flex items-center justify-center">
              <RadarChart stats={detailedStats.radarData} />
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
      {dispensando && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={e => { e.stopPropagation(); setDispensando(false); }}>
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <div className="text-[10px] font-black uppercase tracking-widest text-rose-400">Release player</div>
            <div className="flex items-center gap-4">
              <div className="text-5xl font-black italic text-blue-400">{player.skill}</div>
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
              <button onClick={() => { const r = dispensarJogador(player.id); setDispensando(false); if (r.ok) onClose(); else setAviso(r.motivo || 'Nao foi possivel'); }} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-black py-2.5 rounded text-xs uppercase tracking-widest">Release</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerDetailModal;
