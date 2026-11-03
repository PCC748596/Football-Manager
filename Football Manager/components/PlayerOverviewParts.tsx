import React from 'react';
import { Player, Position, PlayStyle, PLAYSTYLE_DESCRICAO } from '../types';
import { atributos3d, campo3d } from '../textSim/atributos3d';
import { PLAYSTYLE_DA_BASE } from '../textSim/playStylesDatabase';
import { PLAYSTYLE_AJUSTES } from '../textSim/playStylesAjustes';
import { estiloPorPosicao } from '../textSim/playStyleFallback';
import { IconePlayStyleSvg } from '../textSim/PlayStyleSvg';

/*
As duas pecas do Overview do jogador (o Summary com o PlayStyle e o grafico radar), para outras telas: o Sub-20 mostra-as no painel da direita.
Mesmos dados do PlayerDetailModal: tudo tirado dos atributos do 3D (textSim/atributos3d.ts).
*/

const coordenada = (angulo: number, valor: number, centro: number, raio: number) => ({
  x: centro + (valor / 100) * raio * Math.cos(angulo),
  y: centro + (valor / 100) * raio * Math.sin(angulo)
});

const dadosDoRadar = (player: Player): Record<string, number> => {
  const a3 = atributos3d(player);
  const mediaDe = (campos: string[]) => {
    const todos = [...a3.detalhe!.TEC, ...a3.detalhe!.TAC, ...a3.detalhe!.MEN, ...a3.detalhe!.FIS, ...(a3.detalhe!.GK || [])];
    const v = campos.map(c => todos.find(x => x.campo === c)?.valor).filter((x): x is number => typeof x === 'number');
    return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : 0;
  };
  return player.position === Position.GK ? {
    Technique: a3.tec, Tactical: a3.tac, Mental: a3.men, Physical: a3.fis,
    Diving: mediaDe(['diving']), Handling: mediaDe(['handling']), Reflexes: mediaDe(['reflexes']), Positioning: mediaDe(['posGK'])
  } : {
    Technique: a3.tec, Tactical: a3.tac, Mental: a3.men, Physical: a3.fis,
    Attacking: mediaDe(['finishing', 'shotPower', 'longShots', 'volleys']), Defending: mediaDe(['tackleStanding', 'tackleSliding', 'manMarking', 'posDefense']),
    Passing: mediaDe(['passing', 'longPassing', 'vision']), Pace: mediaDe(['speed', 'acceleration'])
  };
};

export const PlayerRadar: React.FC<{ player: Player; tam?: number }> = ({ player, tam = 230 }) => {
  const stats = dadosDoRadar(player);
  const centro = tam / 2, raio = tam * 0.34;
  const chaves = Object.keys(stats), passo = (Math.PI * 2) / chaves.length;
  const ang = (i: number) => i * passo - Math.PI / 2;
  const pontos = chaves.map((k, i) => coordenada(ang(i), stats[k], centro, raio));
  const caminho = pontos.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ') + ' Z';
  return (
    <div className="flex items-center justify-center">
      <svg width={tam} height={tam} className="overflow-visible">
        {[0.25, 0.5, 0.75, 1].map((nivel, n) => (
          <polygon key={nivel} points={chaves.map((_, i) => { const c = coordenada(ang(i), 100 * nivel, centro, raio); return `${c.x},${c.y}`; }).join(' ')} fill="none" stroke={n === 3 ? '#94a3b8' : '#334155'} strokeWidth="1" className="opacity-30" />
        ))}
        {chaves.map((_, i) => { const c = coordenada(ang(i), 100, centro, raio); return <line key={i} x1={centro} y1={centro} x2={c.x} y2={c.y} stroke="#334155" strokeWidth="1" className="opacity-50" />; })}
        <path d={caminho} fill="rgba(34, 197, 94, 0.4)" stroke="#22c55e" strokeWidth="2" />
        {pontos.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#22c55e" stroke="#fff" strokeWidth="1" />)}
        {chaves.map((rotulo, i) => { const c = coordenada(ang(i), 128, centro, raio); return <text key={rotulo} x={c.x} y={c.y} textAnchor="middle" dominantBaseline="middle" className="text-[9px] fill-slate-300 font-bold uppercase tracking-wider">{rotulo}</text>; })}
      </svg>
    </div>
  );
};

const corDaBarra = (v: number) => (v >= 80 ? '#10b981' : v >= 70 ? '#60a5fa' : v >= 60 ? '#eab308' : '#f43f5e');
const corDoNumero = (v: number) => (v >= 80 ? 'text-emerald-500' : v >= 70 ? 'text-blue-400' : v >= 60 ? 'text-yellow-500' : 'text-rose-500');

const resumoDe = (player: Player) => player.position === Position.GK ? [
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

/** O Summary (as seis medidas) e, por baixo, o PlayStyle do jogador com o icone e a descricao. */
export const PlayerSummary: React.FC<{ player: Player; nomeDoClube?: string }> = ({ player, nomeDoClube }) => {
  const estilo = (nomeDoClube ? PLAYSTYLE_AJUSTES[`${nomeDoClube}|${player.name}`] : undefined)
    || (player.playStyle && player.playStyle !== 'None' ? player.playStyle : undefined)
    || PLAYSTYLE_DA_BASE[player.id]
    || estiloPorPosicao(player)
    || 'Creative Playmaker';
  const descricao = PLAYSTYLE_DESCRICAO[estilo as PlayStyle] || '';
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-white">
      <div className="text-sm font-bold text-white mb-2">Summary</div>
      <div className="flex flex-col gap-0.5">
        {resumoDe(player).map(r => (
          <div key={r.rotulo} className="flex items-center gap-3 px-2 py-0.5 rounded bg-slate-950/40">
            <span className="text-xs font-bold text-slate-300 w-20 shrink-0">{r.rotulo}</span>
            <div className="flex-1 h-1.5 bg-slate-800 rounded overflow-hidden"><div className="h-full rounded" style={{ width: `${Math.max(0, (r.valor - 50) / 49 * 100)}%`, background: corDaBarra(r.valor) }} /></div>
            <span className={`text-base font-black w-8 text-right ${corDoNumero(r.valor)}`}>{r.valor}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 text-sm font-bold text-white mb-2">PlayStyle</div>
      <div className="flex items-center gap-3">
        <div title={descricao || estilo} className="w-11 h-11 bg-slate-800 rounded rotate-45 border border-slate-600 flex items-center justify-center shadow-lg shrink-0">
          <span className="-rotate-45 flex items-center justify-center"><IconePlayStyleSvg estilo={estilo} tam={26} /></span>
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-black text-slate-200 uppercase tracking-widest">{estilo}</div>
          {descricao && <div className="text-[10px] leading-snug text-slate-500">{descricao}</div>}
        </div>
      </div>
    </div>
  );
};
