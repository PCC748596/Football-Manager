
import React, { useMemo } from 'react';
import { Player, Position, Team } from '../types';
import { useGame } from '../context/GameContext';
import { TeamShield } from './TeamShield';
import { AttributeGrowthArrow } from './SquadView';
import { PlayerFace } from './PlayerFace';
import { ContractPanel } from './ContractPanel';
import { ICONE_DO_ESTILO } from '../textSim/playStyleIcons';
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
  const { teams, players } = useGame();

  // ESC fecha o Overview (se o modal de renovacao estiver aberto, o ESC fecha primeiro esse: ele escuta na fase de captura e para o evento).
  React.useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [onClose]);

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

    // 8-Point Radar Chart Data
    const radarData = {
      Defending: def,
      Physical: phy,
      Speed: spd,
      Vision: pas,
      Attacking: sht,
      Technical: drb,
      Aerial: isDef ? def - 5 : (isGk ? 80 : 50 + Math.random() * 20),
      Mental: player.morale,
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
    return [{ icon: ICONE_DO_ESTILO[daBase] || '🪄', name: daBase, descricao: PLAYSTYLE_DESCRICAO[daBase as PlayStyle] || '' }];
  }, [player, team]);

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

        {/* LEFT PANEL: Player List Context */}
        <div className="w-64 bg-slate-900/50 border-r border-slate-800 hidden md:flex flex-col">
          <div className="p-4 border-b border-slate-800">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Team Squad</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
            {teamPlayers.map(p => (
              <button
                key={p.id}
                onClick={() => setActivePlayerId(p.id)}
                className={`text-left p-2 rounded flex justify-between items-center transition-colors ${p.id === player.id ? 'bg-slate-800 border border-slate-700' : 'hover:bg-slate-800/50 border border-transparent'}`}
              >
                <div className="flex flex-col">
                  <span className={`text-xs font-bold ${p.id === player.id ? 'text-white' : 'text-slate-400'}`}>{p.name}</span>
                  <span className="text-[10px] text-slate-500">{p.position}</span>
                </div>
                <span className={`text-xs font-black ${getColorClass(p.skill)}`}>{p.skill}</span>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL: Main Content */}
        <div className="flex-1 flex flex-col relative z-10 min-h-0 min-w-0 overflow-y-auto custom-scrollbar">
          {/* Header */}
          <div className="p-8 pb-4 flex justify-between items-start">
            <div className="flex gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border-2 border-slate-600 flex items-center justify-center shadow-lg overflow-hidden">
                  <PlayerFace playerId={player.id} camisa={team?.primaryColor} className="w-full h-full" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-slate-900 rounded-full border-2 border-slate-700 flex items-center justify-center">
                  <TeamShield team={team} className="w-6 h-8" />
                </div>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Overview</div>
                <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">{player.name}</h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className="bg-slate-800 text-white px-2 py-0.5 rounded text-xs font-black uppercase border border-slate-700">{player.position}</span>
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{team?.name}</span>
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider border-l border-slate-700 pl-3">Age: {player.age}</span>
                </div>
              </div>
            </div>
            <div className="text-right pr-14">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Overall</div>
              <div className={`text-6xl font-black italic ${getColorClass(player.skill)} drop-shadow-lg`}>{player.skill}</div>
            </div>
          </div>

          <div className="p-8 pt-2 grid grid-cols-2 gap-8 items-start">
            {/* Column 1: Info & Summary */}
            <div className="flex flex-col gap-3">
              <ContractPanel player={player} />
              {/* Bio Data */}
              <div className="grid grid-cols-2 gap-5 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Skill Moves</div>
                  {stars(3)}
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Weak Foot</div>
                  {stars(3)}
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Work Rate (Att)</div>
                  <span className="text-xs font-bold text-white">High</span>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Work Rate (Def)</div>
                  <span className="text-xs font-bold text-white">Medium</span>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Preferred Foot</div>
                  <span className="text-xs font-bold text-white">Right</span>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Weight/Height</div>
                  <span className="text-xs font-bold text-white">75kg / 180cm</span>
                </div>
              </div>

              {/* Summary Bars */}
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between items-center bg-slate-900/30 px-2 py-1 rounded border border-slate-800/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Pace (DRB/PAS)</span>
                    <AttributeGrowthArrow val={player.lastGrowth?.def || 0} />
                  </div>
                  <span className={`text-base font-black ${getColorClass(detailedStats.pace)}`}>{detailedStats.pace}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/30 px-2 py-1 rounded border border-slate-800/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Shooting</span>
                    <AttributeGrowthArrow val={player.lastGrowth?.sht || 0} />
                  </div>
                  <span className={`text-base font-black ${getColorClass(detailedStats.shooting)}`}>{detailedStats.shooting}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/30 px-2 py-1 rounded border border-slate-800/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Passing</span>
                    <AttributeGrowthArrow val={player.lastGrowth?.pas || 0} />
                  </div>
                  <span className={`text-base font-black ${getColorClass(detailedStats.passing)}`}>{detailedStats.passing}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/30 px-2 py-1 rounded border border-slate-800/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Dribbling</span>
                    <AttributeGrowthArrow val={player.lastGrowth?.drb || 0} />
                  </div>
                  <span className={`text-base font-black ${getColorClass(detailedStats.dribbling)}`}>{detailedStats.dribbling}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/30 px-2 py-1 rounded border border-slate-800/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Defending</span>
                    <AttributeGrowthArrow val={player.lastGrowth?.def || 0} />
                  </div>
                  <span className={`text-base font-black ${getColorClass(detailedStats.defending)}`}>{detailedStats.defending}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/30 px-2 py-1 rounded border border-slate-800/50">
                  <span className="text-sm font-bold text-white">Physical</span>
                  <span className={`text-base font-black ${getColorClass(detailedStats.physical)}`}>{detailedStats.physical}</span>
                </div>
              </div>
            </div>

            {/* Column 2: Radial Chart & Playstyles */}
            <div className="flex flex-col gap-6">
              {/* PlayStyles */}
              <div>
                <div className="text-sm font-bold text-white mb-2">PlayStyles</div>
                <div className="flex gap-4">
                  {playStyles.map((style, i) => (
                    <div key={i} className="flex flex-col items-center gap-3">
                      <div title={(style as any).descricao || style.name} className="w-12 h-12 bg-slate-800 rounded rotate-45 border border-slate-600 flex items-center justify-center shadow-lg group relative cursor-help">
                        <span className="-rotate-45 text-2xl">{style.icon}</span>
                      </div>
                      <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest text-center mt-1">
                        {style.name}
                      </div>
                      {(style as any).descricao && (
                        <div className="text-[9px] leading-snug text-slate-500 text-center max-w-[200px]">{(style as any).descricao}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Radial Graph */}
              <div className="flex-1 flex items-center justify-center relative">
                <RadarChart stats={detailedStats.radarData} />
              </div>
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
    </div>
  );
};

export default PlayerDetailModal;
