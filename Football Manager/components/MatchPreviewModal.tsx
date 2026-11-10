import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import { createPortal } from 'react-dom';
import { Player, Position, Team, FORMATIONS, POSITION_ORDER, getEffectiveSkill, getKitDetails, getGKKitDetails } from '../types';
import { PlayerFace3D } from './PlayerFace3D';
import { ShirtIcon } from './ShirtIcon';
import CartaoJogador, { CARTAO_LARGURA, CARTAO_ALTURA, deslocamentoDoCartao, cartoesLigados, rostosLigados, rostosNasListas } from './CartaoJogador';
import EnergyBar, { energiaDe } from './EnergyBar';
import { IconePlayStyleSvg } from '../textSim/PlayStyleSvg';
import { PLAYSTYLE_DA_BASE } from '../textSim/playStylesDatabase';
import { PLAYSTYLE_AJUSTES } from '../textSim/playStylesAjustes';
import { estiloValidoDoJogador } from '../textSim/playStyleFallback';
import { calcularQuimica } from '../textSim/quimica';
import { doisNomes } from '../textSim/nomes';

/*
O MATCH PREVIEW (botao do Match Tactics): um modal de 100% da tela com DOIS campos iguais ao do Tactics — o do time do utilizador e o do proximo adversario —, cada um com os reservas do lado direito.
So mostra (nada se arrasta): as escalacoes que cada time tem agora, com o mesmo desenho dos cartoes do campo (posicao, cara, OVR e moral, nome, energia e Playing Style).
*/

const MoraleArrow = ({ morale }: { morale: number }) => {
  if (morale >= 90) return <span className="text-amber-400 transform -rotate-90 inline-block font-bold drop-shadow-sm text-[15px]">➤</span>;
  if (morale >= 70) return <span className="text-emerald-500 transform -rotate-45 inline-block font-bold text-[15px]">➤</span>;
  if (morale >= 40) return <span className="text-slate-400 inline-block font-bold text-[15px]">➤</span>;
  if (morale >= 20) return <span className="text-orange-500 transform rotate-45 inline-block font-bold text-[15px]">➤</span>;
  return <span className="text-rose-500 transform rotate-90 inline-block font-bold text-[15px]">➤</span>;
};

const IconeEstilo = ({ estilo, tam, className = '' }: { estilo: string; tam: number; className?: string }) => (
  <span title={'Playing Style: ' + estilo} className={`inline-flex items-center justify-center shrink-0 leading-none drop-shadow-[0_0_2px_rgba(0,0,0,0.8)] ${className}`} style={{ width: tam, height: tam }}><IconePlayStyleSvg estilo={estilo} tam={tam} /></span>
);

const corDaPosicao = (pos: string) => (pos === 'GK' ? '#ea580c' : ['LB', 'CB', 'RB'].includes(pos) ? '#eab308' : ['DM', 'LM', 'CM', 'RM', 'AM'].includes(pos) ? '#16a34a' : '#2563eb');

interface Props {
  userTeam: Team;
  adversario?: Team;
  players: Player[];
  /** Que uniforme (0-2) o time do utilizador veste no Tactics: o preview usa o mesmo. */
  kitDoUtilizador?: 0 | 1 | 2;
  onClose: () => void;
}

/** Um lado do preview: o campo (linhas, posicoes e jogadores) e, a direita, os reservas. */
const Lado: React.FC<{ team?: Team; titulo: string; players: Player[]; kitIdx: 0 | 1 | 2; adversario?: boolean }> = ({ team, titulo, players, kitIdx, adversario }) => {
  const slot = useRef<HTMLDivElement>(null);
  const [alt, setAlt] = useState(600);
  // A MEDIA DAS NOTAS de cada jogador nos jogos disputados (como no Match Tactics), dos dois times, e so com o botao Avg Ratings do utilizador ligado.
  const { fixtures, userTeam } = useGame();
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
  useLayoutEffect(() => {
    const el = slot.current;
    if (!el) return;
    const f = () => setAlt(el.clientHeight);
    f();
    const ro = new ResizeObserver(f);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!team) {
    return <div className="flex-1 min-w-0 flex items-center justify-center rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-900/30 text-slate-400 text-sm font-black uppercase tracking-widest">No upcoming opponent</div>;
  }
  const formacao = FORMATIONS[team.tactics.formation] || FORMATIONS['4-4-2'];
  const noCampo = formacao.map((_, i) => players.find(p => p.id === team.lineup[i]));
  const reservasTodos = (team.bench || []).map(id => players.find(p => p.id === id)).filter((p): p is Player => !!p);
  // Os reservas do utilizador por posicao (goleiro, defesa, meio, ataque; dentro da posicao, o de maior OVR primeiro).
  const reservas = adversario ? reservasTodos : [...reservasTodos].sort((a, b) => ((POSITION_ORDER as any)[a.position] ?? 99) - ((POSITION_ORDER as any)[b.position] ?? 99) || b.skill - a.skill);
  const quimica = calcularQuimica(noCampo.filter((p): p is Player => !!p), team.tactics.formation, team.synergyMap);
  const estiloDe = (p: Player) => estiloValidoDoJogador(p, PLAYSTYLE_AJUSTES[`${team.name}|${p.name}`], p.playStyle, PLAYSTYLE_DA_BASE[p.id]);
  // OS BOTOES DO MATCH TACTICS (Playing Styles, Avg Ratings, Player Faces) valem para os DOIS times: o preview mostra o que o utilizador escolheu la.
  const estilosOn = userTeam?.tactics.playingStylesOn !== false;
  const rostosOn = rostosLigados(userTeam?.tactics);          // o rosto sobre a camisa, no campo sem cartoes
  const cartoesOn = cartoesLigados(userTeam?.tactics);       // os cartoes (exclusivo com os rostos)
  const rostosListas = rostosNasListas(userTeam?.tactics);   // os reservas
  const k = Math.max(0.45, Math.min(1.1, alt / 760));   // os cartoes acompanham a altura do campo (no Tactics o campo tem ~760 px)
  const largura = alt * 68 / 106 + 140 * k;

  const kit = (gk: boolean) => (gk ? getGKKitDetails(team, kitIdx) : getKitDetails(team, kitIdx));

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-1 min-h-0">
      <div className="flex-1 min-h-0 flex gap-[5px]">
        <div ref={slot} className="flex-1 min-w-0 min-h-0 flex items-stretch justify-center">
          {/* O cabecalho (modo e formacao a esquerda, o NOME DO TIME a direita) tem a largura do campo: o nome fica no limite direito dele. */}
          <div className="flex flex-col gap-1 min-h-0" style={{ width: Math.min(largura, 9999), maxWidth: '100%', height: '100%' }}>
      <div className="flex items-center justify-between px-1 shrink-0 w-full">
        <span className="text-[31px] leading-none font-black italic uppercase tracking-tight text-blue-400 shrink-0">{titulo} • {team.tactics.formation}</span>
        <span className="text-[44px] leading-none font-black italic uppercase tracking-tight text-slate-800 dark:text-white truncate text-right ml-3 mr-[10px]">{team.name}</span>
      </div>
          <div className="relative flex-1 min-h-0 bg-slate-50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-900/30 overflow-hidden select-none shadow-inner" style={{ width: '100%' }}>
            {!adversario && <div className="absolute top-2 right-3 z-10 flex flex-col items-end">
              <span className="text-[9px] font-black text-blue-300 uppercase tracking-widest leading-none mb-0.5">CHEMISTRY</span>
              <div className="flex items-baseline"><span className="text-3xl font-black text-slate-300 dark:text-white/20 italic leading-none tracking-tighter">{quimica}</span><span className="text-lg font-black text-blue-300/50 italic">%</span></div>
            </div>}
            <div className="absolute" style={{ top: '1rem', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', width: `calc(100% - ${40 * k}px)` }}>
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
              {formacao.map((pos, idx) => {
                const player = noCampo[idx];
                const gk = pos.label === 'GK' || player?.position === Position.GK;
                const d = kit(gk);
                // O CARTAO do jogador (so com os rostos ligados; sem eles, as camisas de sempre): o mesmo do Match Tactics. Do adversario nao se mostram estilo nem moral.
                if (player && cartoesOn) {
                  return (
                    <div key={idx} className="absolute flex items-center justify-center z-10" style={{ width: CARTAO_LARGURA, height: CARTAO_ALTURA, left: `${adversario ? 100 - pos.x : pos.x}%`, top: `${adversario ? 100 - pos.y : pos.y}%`, transform: `translate(-50%, calc(-50% + ${deslocamentoDoCartao(team.tactics.formation, pos.label, pos.x) * k * (adversario ? -1 : 1)}px)) scale(${0.8 * k})` }}>
                      <CartaoJogador player={player} slotPos={pos.label} overall={getEffectiveSkill(player, pos.label)}
                        rosto={<PlayerFace3D playerId={player.id} team={team} kitIdx={kitIdx} gk={gk} camisa={team.primaryColor} className="w-full h-full" />}
                        estilo={estilosOn ? estiloDe(player) : null} nota={(userTeam?.tactics.mediaNotasOn !== false && mediasDeNotas[player.id] !== undefined) ? mediasDeNotas[player.id].toFixed(1) : null} notaValor={mediasDeNotas[player.id]} foraDePosicao={player.position !== pos.label} />
                    </div>
                  );
                }
                return (
                  <div key={idx} className="absolute flex flex-col items-center justify-center w-24 h-24 z-10" style={{ left: `${adversario ? 100 - pos.x : pos.x}%`, top: `${adversario ? 100 - pos.y : pos.y}%`, transform: `translate(-50%, calc(-50% + ${(pos.label === 'GK' ? 20 : 0) * k * (adversario ? -1 : 1)}px)) scale(${0.8 * k})` }}>   {/* o adversario vem do outro lado: o campo rodado 180 graus, com o goleiro em cima */}
                    <div className="relative">
                      {!adversario && <div className={`absolute top-1/2 ${player && rostosOn ? '-translate-y-[calc(50%+7px)]' : '-translate-y-1/2'} -left-[35px] bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded-md shadow-sm z-10`}>
                        <span className="text-[17px] font-black text-slate-500 dark:text-slate-400 uppercase leading-none block">{pos.label}</span>
                      </div>}
                      <div style={player ? undefined : { filter: 'brightness(0.28) saturate(0.5)' }} className="relative flex flex-col items-center mt-[13px]">
                        {player && rostosOn ? (
                          <div className="w-[72px] h-[72px] pointer-events-none -translate-y-[20px] scale-[1.25]"><PlayerFace3D playerId={player.id} team={team} kitIdx={kitIdx} gk={gk} camisa={team.primaryColor} className="w-full h-full" /></div>
                        ) : <ShirtIcon color={d.c1} color2={d.c2} color3={d.c3} diagonal={!!d.diagonal} dualDiagonal={!!(d as any).dualDiagonal} centerVerticalStripes={!!(d as any).centerVerticalStripes}
                          horizontal={!!(d as any).horizontal} multipleDiagonals={!!d.multipleDiagonals} criciumaStripes={!!(d as any).criciumaStripes} diagonalWidth={d.diagonalWidth}
                          number={player?.shirtNumber || ''} numberColor={d.nc} collarColor={d.clc} numberOutlineColor={d.noc} sleeveColor={d.sc} scale={1.2} outOfPosition={false} longSleeves={gk} />}
                      </div>
                      {player && !adversario && (
                        <div className={`absolute top-1/2 ${rostosOn ? '-translate-y-[calc(50%+7px)]' : '-translate-y-1/2'} -right-[47px] flex items-center bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded shadow-md gap-0.5 border border-slate-100 dark:border-slate-700`}>
                          <span className={`text-[16px] font-black leading-none ${player.position !== pos.label ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>{getEffectiveSkill(player, pos.label)}</span>
                          {!adversario && <MoraleArrow morale={player.morale} />}
                        </div>
                      )}
                    </div>
                    <div className="mt-[13px] flex items-center gap-1">
                      <div className={`bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-0.5 rounded-md shadow-sm ${adversario ? 'max-w-[240px]' : 'max-w-[120px]'} relative`}>
                        {player && estilosOn && <IconeEstilo estilo={estiloDe(player)} tam={34} className={`absolute -left-[40px] top-1/2 -translate-y-1/2 ${['AM', 'LW', 'RW', 'CB'].includes(pos.label) ? '-mt-[10px]' : ''}`} />}
                        {player && <div className="absolute -top-[12px] left-1/2 -translate-x-1/2 w-14"><EnergyBar energy={energiaDe(player)} className="h-2" /></div>}
                        <span className={`${adversario ? 'text-[13px]' : 'text-[11px]'} font-black text-slate-500 dark:text-slate-400 uppercase block text-center mt-[2px] ${adversario ? 'whitespace-nowrap' : 'truncate'}`}>{player ? player.name.split(' ').pop() : '---'}{adversario && player && <><span className="mx-1 text-slate-400">|</span>{pos.label}<span className="mx-1 text-slate-400">|</span><span className={player.position !== pos.label ? 'text-rose-500' : 'text-blue-400'}>{getEffectiveSkill(player, pos.label)}</span></>}{adversario && !player && <><span className="mx-1">|</span>{pos.label}</>}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </div>
        </div>
        {/* OS RESERVAS, do lado direito do campo */}
        <div className="w-[190px] shrink-0 min-h-0 flex flex-col gap-[4px] bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-[5px] overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-center px-1 shrink-0"><span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">SUBSTITUTES</span><span className="text-[11px] font-black text-slate-400">{reservas.length}</span></div>
          {reservas.map(p => {
            const nomes = doisNomes(p.name);
            return (
              <div key={p.id} className="relative flex-shrink-0 flex flex-row items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg px-1.5 py-[4px] shadow-sm min-w-0">
                <div className="relative w-[40px] h-[40px] shrink-0 pointer-events-none">
                  {rostosListas
                    ? <div className="w-[40px] h-[40px] -translate-y-[6px]"><PlayerFace3D playerId={p.id} team={team} kitIdx={kitIdx} gk={p.position === Position.GK} camisa={team.primaryColor} className="w-full h-full" /></div>
                    : <ShirtIcon color={kit(p.position === Position.GK).c1} number={p.shirtNumber} scale={0.5} longSleeves={p.position === Position.GK} />}
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-1 min-w-0">
                    <span className="text-[11px] font-black leading-none whitespace-nowrap truncate"><span className="text-[12px]" style={{ color: corDaPosicao(p.position) }}>{p.position}</span><span className="text-slate-500 mx-[3px]">|</span><span className="text-blue-400">{p.skill}</span></span>
                    <span className="flex items-center gap-0.5 shrink-0">{estilosOn && <IconeEstilo estilo={estiloDe(p)} tam={16} />}{!adversario && <MoraleArrow morale={p.morale} />}</span>
                  </div>
                  <EnergyBar energy={energiaDe(p)} className="h-1.5" />
                  <span className="text-[9px] font-black text-slate-400 uppercase truncate leading-[1.1]">{nomes.join(' ')}</span>
                </div>
              </div>
            );
          })}
          {!reservas.length && <div className="text-[10px] font-bold text-slate-400 uppercase italic text-center py-3">No substitutes</div>}
        </div>
      </div>
    </div>
  );
};

const MatchPreviewModal: React.FC<Props> = ({ userTeam, adversario, players, kitDoUtilizador = 0, onClose }) => {
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [onClose]);
  // O adversario veste o uniforme 1; se for da mesma cor que o nosso, o 2.
  const kitAdv: 0 | 1 | 2 = (() => {
    if (!adversario) return 0;
    const a = String(getKitDetails(adversario, 0).c1 || '').toLowerCase(), b = String(getKitDetails(userTeam, kitDoUtilizador).c1 || '').toLowerCase();
    return a === b ? 1 : 0;
  })();
  // No <body> (portal) e por cima de tudo: dentro do Tactics ele ficava ATRAS da barra lateral (contexto de empilhamento da pagina). Ocupa 100% da tela.
  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-100 dark:bg-slate-950 flex items-stretch justify-stretch" style={{ width: '100vw', height: '100vh' }}>
      <div className="w-full h-full p-3 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between shrink-0">
          <h2 className="text-2xl font-black italic tracking-tighter uppercase"><span className="text-slate-300 dark:text-slate-600">MATCH</span> <span className="text-blue-400">PREVIEW</span></h2>
          <button onClick={onClose} className="px-4 py-1.5 rounded bg-slate-700 hover:bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest" title="Close (Esc)">Close ✕</button>
        </div>
        <div className="flex-1 min-h-0 flex gap-3">
          <Lado team={userTeam} titulo="Your team" players={players} kitIdx={kitDoUtilizador} />
          <div className="w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
          <Lado team={adversario} titulo="Opponent" players={players} kitIdx={kitAdv} adversario />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MatchPreviewModal;
