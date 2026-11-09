import React from 'react';
import { Player, Position, PlayStyle, PLAYSTYLE_DESCRICAO } from '../types';
import { atributos3d, progressoDeXp, CHAVES_POR_POSICAO } from '../textSim/atributos3d';
import { PLAYSTYLE_DA_BASE } from '../textSim/playStylesDatabase';
import { PLAYSTYLE_AJUSTES } from '../textSim/playStylesAjustes';
import { estiloPorPosicao, estiloValidoDoJogador } from '../textSim/playStyleFallback';
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

/** O Summary do jogador: os atributos-chave da posicao dele (`CHAVES_POR_POSICAO`: tecnicos, taticos, mentais, fisicos e, no goleiro, os de baliza), cada um com o nome, a barra e o valor. Sem o PlayStyle (ja aparece no topo do painel). */
export const PlayerSummary: React.FC<{ player: Player; nomeDoClube?: string}> = ({ player }) => {
  const a = atributos3d(player);
  const chaves = CHAVES_POR_POSICAO[String(player.position)] || {};
  const todos = [...a.detalhe!.TEC, ...a.detalhe!.TAC, ...a.detalhe!.MEN, ...a.detalhe!.FIS, ...(a.detalhe!.GK || [])];
  const linhas = (['GK', 'TEC', 'TAC', 'MEN', 'FIS'] as const)
    .flatMap(g => (chaves[g] || []))
    .map(c => todos.find(x => x.campo === c))
    .filter((x): x is NonNullable<typeof x> => !!x);
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-white">
      <div className="text-sm font-bold text-white mb-2">Summary</div>
      <div className="flex flex-col gap-0.5">
        {linhas.map(r => {
          // XP de treino ate ao proximo ponto (como no Overview do elenco): o fundo da linha enche em ciano por baixo do texto.
          const prog = progressoDeXp(player, r.campo, r.valor);
          const pct = prog ? Math.min(100, Math.round(100 * prog.xp / prog.custo)) : 0;
          return (
          <div key={r.campo} title={prog ? `Training XP: ${Math.round(prog.xp)} / ${Math.round(prog.custo)} to +1` : undefined} className="relative flex items-center gap-3 px-2 py-0.5 rounded bg-slate-950/40 overflow-hidden">
            {prog && <div className="absolute inset-y-0 left-0 bg-cyan-500/35 pointer-events-none" style={{ width: `${pct}%` }} />}
            <span className="relative text-xs font-bold text-slate-300 w-28 shrink-0 truncate">{r.nome}</span>
            <span className="flex-1" />
            <span className={`relative text-base font-black w-8 text-right ${corDoNumero(r.valor)}`}>{r.valor}</span>
          </div>
          );
        })}
      </div>
    </div>
  );
};
