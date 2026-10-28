import React, { useMemo, useRef, useState } from 'react';
import { Team, Player, FORMATIONS, ZoneOverrides, Tactics } from '../types';
import TacticPresetsModal from './TacticPresetsModal';
import { FaseZona, ZONAS, centroDaZona, espelharFase, espelharZona, zonaEspelhada, formacaoTemTabela, moverPosto, postosEfetivos, postosDeBase, repor, temAjustes } from '../textSim/formacoesZonas';

interface Props {
  team: Team;
  players: Player[];
  onChange: (over: ZoneOverrides | undefined) => void;
  onClose: () => void;
  onLoadTactics: (t: Tactics) => void;
}

const NOME_DA_ZONA = ['Def. direita', 'Def. centro', 'Def. esquerda', 'Meio direita', 'Meio centro', 'Meio esquerda', 'Atq. direita', 'Atq. centro', 'Atq. esquerda'];

/*
O EDITOR DAS POSICOES COM E SEM A BOLA (aba Match Tactics). O campo mostra os onze postos para a ZONA em que a bola esta (grelha 3x3) e a fase escolhida; arrasta-se cada um para onde se quer.
Por baixo, o motor 3D interpola entre as quatro zonas mais proximas, por isso so as zonas ajustadas mudam, e as vizinhas acompanham. Ver textSim/formacoesZonas.ts.
*/
const ZonePositionsModal: React.FC<Props> = ({ team, players, onChange, onClose, onLoadTactics }) => {
  const [presets, setPresets] = useState<null | 'save' | 'load'>(null);
  const formacao = team.tactics.formation;
  const over = team.tactics.zoneOverrides?.[formacao];
  const [fase, setFase] = useState<FaseZona>('com');
  const [zona, setZona] = useState(4);
  // PLAYING AGAINST: o sistema do adversario (circulos vermelhos a 30%) para comparar. Ele ataca para o lado oposto, por isso a zona da bola e a fase espelham-se.
  const [contra, setContra] = useState(false);
  const [formContra, setFormContra] = useState<string>(() => Object.keys(FORMATIONS).find(f => f !== team.tactics.formation && formacaoTemTabela(f)) || team.tactics.formation);
  const [arrasto, setArrasto] = useState<{ slot: number; x: number; z: number } | null>(null);
  const campo = useRef<HTMLDivElement>(null);

  const postos = useMemo(() => postosEfetivos(formacao, over, fase, zona), [formacao, over, fase, zona]);
  const base = useMemo(() => postosDeBase(formacao, fase, zona), [formacao, fase, zona]);
  const slots = FORMATIONS[formacao];
  const faseContra: FaseZona = fase === 'com' ? 'sem' : 'com';
  const postosContra = useMemo(() => (contra && formacaoTemTabela(formContra)) ? postosDeBase(formContra, faseContra, 8 - zona) : [], [contra, formContra, faseContra, zona]);
  const rotulos = useMemo(() => slots.map(s => s.label), [slots]);
  const bola = centroDaZona(zona);
  const ajustadoNa = (f: FaseZona, z: number) => !!over?.[f]?.[String(z)] && Object.keys(over![f]![String(z)]).length > 0;

  if (!formacaoTemTabela(formacao)) return null;

  const pct = (x: number, z: number) => ({ left: `${50 - x * 50}%`, top: `${(1 - z) * 50}%` });
  const paraCampo = (clientX: number, clientY: number) => {
    const r = campo.current!.getBoundingClientRect();
    const left = (clientX - r.left) / r.width, top = (clientY - r.top) / r.height;
    const c = (v: number) => Math.max(-0.95, Math.min(0.95, v));
    return { x: c((0.5 - left) * 2), z: c(1 - top * 2) };
  };

  const jogadorDoSlot = (i: number) => players.find(p => p.id === team.lineup[i]);
  const commit = (slot: number, x: number, z: number) => {
    onChange(moverPosto(formacao, over, fase, zona, slot, x, z));
  };

  const Aba = ({ valor, rotulo }: { valor: FaseZona; rotulo: string }) => (
    <button onClick={() => setFase(valor)} className={`flex-1 px-4 py-2 rounded text-[11px] font-black uppercase tracking-widest transition-all ${fase === valor ? 'bg-blue-600 text-white shadow' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'}`}>{rotulo}</button>
  );

  return (
    <div className="fixed inset-0 z-[300] bg-black/70 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-6 flex gap-6 max-h-[94vh]" onClick={e => e.stopPropagation()}>
        <div ref={campo} className="relative bg-emerald-700/90 border-2 border-white/50 rounded select-none touch-none shrink-0" style={{ height: 'min(78vh, 760px)', aspectRatio: '68 / 106' }}>
          <div className="absolute inset-0 pointer-events-none">
            {/* O campo em metros (68 x 106, as medidas do motor): linhas, circulo central, areas, marcas de penalti e as meias-luas */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 68 106" preserveAspectRatio="none" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.2">
              <g vectorEffect="non-scaling-stroke">
                <line x1="0" y1="53" x2="68" y2="53" vectorEffect="non-scaling-stroke" />
                <circle cx="34" cy="53" r="9.15" vectorEffect="non-scaling-stroke" />
                <circle cx="34" cy="53" r="0.4" fill="rgba(255,255,255,0.7)" vectorEffect="non-scaling-stroke" />
                {/* grande e pequena areas, marca de penalti e meia-lua: no topo (baliza adversaria) e em baixo (a nossa) */}
                <rect x="13.84" y="0" width="40.32" height="16.5" vectorEffect="non-scaling-stroke" />
                <rect x="24.84" y="0" width="18.32" height="5.5" vectorEffect="non-scaling-stroke" />
                <circle cx="34" cy="11" r="0.4" fill="rgba(255,255,255,0.7)" vectorEffect="non-scaling-stroke" />
                <path d="M 26.69 16.5 A 9.15 9.15 0 0 0 41.31 16.5" vectorEffect="non-scaling-stroke" />
                <rect x="13.84" y="89.5" width="40.32" height="16.5" vectorEffect="non-scaling-stroke" />
                <rect x="24.84" y="100.5" width="18.32" height="5.5" vectorEffect="non-scaling-stroke" />
                <circle cx="34" cy="95" r="0.4" fill="rgba(255,255,255,0.7)" vectorEffect="non-scaling-stroke" />
                <path d="M 26.69 89.5 A 9.15 9.15 0 0 1 41.31 89.5" vectorEffect="non-scaling-stroke" />
                {/* os arcos dos cantos (raio 1 m) */}
                <path d="M 1 0 A 1 1 0 0 1 0 1" vectorEffect="non-scaling-stroke" />
                <path d="M 67 0 A 1 1 0 0 0 68 1" vectorEffect="non-scaling-stroke" />
                <path d="M 0 105 A 1 1 0 0 1 1 106" vectorEffect="non-scaling-stroke" />
                <path d="M 68 105 A 1 1 0 0 0 67 106" vectorEffect="non-scaling-stroke" />
              </g>
            </svg>
            {/* as linhas das zonas da bola */}
            {[-1, 1].map(sg => <div key={'h' + sg} className="absolute left-0 right-0 border-t border-dashed border-white/25" style={{ top: `${(1 - sg * ZONAS.terco / ZONAS.meiaAltura) * 50}%` }} />)}
            {[-1, 1].map(sg => <div key={'v' + sg} className="absolute top-0 bottom-0 border-l border-dashed border-white/25" style={{ left: `${50 - sg * ZONAS.corredorX / ZONAS.meiaLargura * 50}%` }} />)}
          </div>
          <div className="absolute -translate-x-1/2 -translate-y-1/2 text-xl pointer-events-none opacity-90" style={pct(bola.x, bola.z)} title="A bola">⚽</div>
          {postosContra.map((p, i) => (
            <div key={'c' + i} className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-30" style={pct(-p.x, -p.z)}>
              <div className="w-9 h-9 rounded-full bg-red-600 border-2 border-red-300 flex items-center justify-center text-[9px] font-black text-white">{FORMATIONS[formContra][i]?.label}</div>
            </div>
          ))}
          {postos.map((p, i) => {
            const pos = arrasto && arrasto.slot === i ? { x: arrasto.x, z: arrasto.z } : p;
            const mudou = Math.abs(base[i].x - p.x) > 0.0006 || Math.abs(base[i].z - p.z) > 0.0006;
            const jog = jogadorDoSlot(i);
            return (
              <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing"
                style={pct(pos.x, pos.z)}
                onPointerDown={e => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setArrasto({ slot: i, ...paraCampo(e.clientX, e.clientY) }); }}
                onPointerMove={e => { if (arrasto && arrasto.slot === i) setArrasto({ slot: i, ...paraCampo(e.clientX, e.clientY) }); }}
                onPointerUp={e => { if (arrasto && arrasto.slot === i) { commit(i, arrasto.x, arrasto.z); setArrasto(null); } }}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black text-white shadow-lg border-2 ${mudou ? 'bg-amber-500 border-amber-200' : 'bg-blue-600 border-white'}`}>{jog?.shirtNumber ?? slots[i].label}</div>
                <span className="mt-0.5 px-1.5 rounded bg-black/60 text-[9px] font-bold text-white whitespace-nowrap">{slots[i].label}{jog ? ' ' + jog.name.split(' ').pop() : ''}</span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-4 w-[300px] overflow-y-auto">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-700 dark:text-white">Posições</h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formacao} · arraste os jogadores</span>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl font-black leading-none">✕</button>
          </div>

          <div className="flex flex-col gap-2">
            <button onClick={() => setContra(c => !c)} className={`px-3 py-2 rounded text-[10px] font-black uppercase tracking-widest ${contra ? 'bg-red-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'}`} title="Mostra, em circulos vermelhos, onde o sistema adversario fica com a bola nesta zona">Playing Against</button>
            {contra && (
              <select value={formContra} onChange={e => setFormContra(e.target.value)} className="px-2 py-2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-white">
                {Object.keys(FORMATIONS).filter(formacaoTemTabela).map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            )}
          </div>

          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fase</span>
            <div className="flex gap-2 mt-1"><Aba valor="com" rotulo="Com a bola" /><Aba valor="sem" rotulo="Sem a bola" /></div>
          </div>

          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Onde está a bola</span>
            <div className="grid grid-cols-3 gap-1 mt-1">
              {[2, 1, 0].map(lin => [2, 1, 0].map(col => {
                const z = lin * 3 + col;
                return (
                  <button key={z} onClick={() => setZona(z)} title={NOME_DA_ZONA[z]}
                    className={`h-14 rounded text-[9px] font-black uppercase leading-tight p-1 border transition-all ${zona === z ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-400'}`}>
                    {NOME_DA_ZONA[z]}
                    {(ajustadoNa('com', z) || ajustadoNa('sem', z)) && <span className="block text-amber-400">{ajustadoNa('com', z) ? '●' : '○'}{ajustadoNa('sem', z) ? '●' : '○'}</span>}
                  </button>
                );
              }))}
            </div>
            <span className="text-[9px] text-slate-400 leading-tight block mt-1">Topo = ataque. ●● = ajustes com / sem bola. O 3D interpola entre zonas vizinhas.</span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Espelhar</span>
            <button onClick={() => onChange(espelharZona(formacao, rotulos, over, fase, zona, zona))} className="px-3 py-2 rounded bg-indigo-600/90 text-[10px] font-black uppercase tracking-widest text-white hover:bg-indigo-500" title="Troca esquerda e direita nesta zona: o lateral esquerdo vai para onde estava o direito, e assim por diante">Virar esta zona (esq ⇄ dir)</button>
            {zonaEspelhada(zona) !== zona && <button onClick={() => onChange(espelharZona(formacao, rotulos, over, fase, zona, zonaEspelhada(zona)))} className="px-3 py-2 rounded bg-indigo-600/90 text-[10px] font-black uppercase tracking-widest text-white hover:bg-indigo-500" title="Copia estas posições, espelhadas, para a zona do outro lado do campo">Copiar espelhado → {NOME_DA_ZONA[zonaEspelhada(zona)]}</button>}
            <button onClick={() => onChange(espelharFase(formacao, rotulos, over, fase, zona))} className="px-3 py-2 rounded bg-indigo-600/90 text-[10px] font-black uppercase tracking-widest text-white hover:bg-indigo-500" title="Para cada linha, copia esta coluna, espelhada, para a coluna oposta">Espelhar {fase === 'com' ? 'com a bola' : 'sem a bola'} (todas as linhas)</button>
          </div>

          <div className="flex flex-col gap-2">
            <button onClick={() => onChange(repor(over, fase, zona))} className="px-3 py-2 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700">Repor esta zona</button>
            <button onClick={() => onChange(repor(over, fase))} className="px-3 py-2 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700">Repor {fase === 'com' ? 'com a bola' : 'sem a bola'} (todas as zonas)</button>
            <button disabled={!temAjustes(over)} onClick={() => onChange(undefined)} className="px-3 py-2 rounded bg-rose-600/80 disabled:opacity-30 text-[10px] font-black uppercase tracking-widest text-white hover:bg-rose-600">Repor a formação toda</button>
          </div>
          <span className="text-[9px] text-slate-400 leading-tight">Amarelo = posto ajustado. Vermelho = sistema adversario (Playing Against), na fase oposta e na zona espelhada. Os ajustes valem para esta formação e entram no jogo (também com a partida em curso).</span>

          <div className="flex gap-2">
            <button onClick={() => setPresets('save')} className="flex-1 px-3 py-2 rounded bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-500" title="Grava a tática atual (formação, estilo e posições)">Save</button>
            <button onClick={() => setPresets('load')} className="flex-1 px-3 py-2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white text-[11px] font-black uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-slate-600" title="Carrega uma tática gravada ou de um ficheiro .json">Load</button>
          </div>
        </div>
      </div>
      {presets && <div onClick={e => e.stopPropagation()}><TacticPresetsModal atual={team.tactics} foco={presets} onLoad={onLoadTactics} onClose={() => setPresets(null)} /></div>}
    </div>
  );
};

export default ZonePositionsModal;
