import React, { useRef, useState } from 'react';
import { Tactics } from '../types';

interface Preset { id: string; name: string; date: string; tactics: Tactics; }

const CHAVE = 'fm_tactic_presets_v1';

const ler = (): Preset[] => {
  try { const r = JSON.parse(localStorage.getItem(CHAVE) || '[]'); return Array.isArray(r) ? r : []; } catch { return []; }
};
const gravarLista = (l: Preset[]) => { try { localStorage.setItem(CHAVE, JSON.stringify(l)); } catch { /* sem armazenamento */ } };

interface Props {
  atual: Tactics;
  onLoad: (t: Tactics) => void;
  onClose: () => void;
  /** 'save' poe o cursor no nome da tatica. */
  foco?: 'save' | 'load';
}

/*
GRAVAR E CARREGAR TATICAS. Cada gravacao guarda a tatica TODA do time (formacao, estilo, pressao, linha, compactacao, setores e os ajustes de posicao com e sem bola), com um nome. Ficam neste
navegador (localStorage), por isso valem para qualquer carreira; para não as perder, exporte para um ficheiro .json e importe quando precisar. Carregar substitui a tatica atual.
*/
const TacticPresetsModal: React.FC<Props> = ({ atual, onLoad, onClose, foco }) => {
  const [lista, setLista] = useState<Preset[]>(ler);
  const [nome, setNome] = useState('');
  // A tatica que se vai substituir, a espera da confirmacao (modal proprio, nao o confirm do navegador).
  const [pendente, setPendente] = useState<Preset | null>(null);

  const guardar = () => {
    const n = nome.trim();
    if (!n) return;
    const copia: Tactics = JSON.parse(JSON.stringify(atual));
    const existente = lista.find(p => p.name.toLowerCase() === n.toLowerCase());
    if (existente) { setPendente(existente); return; }
    const nova: Preset = { id: existente?.id || String(Date.now()), name: n, date: new Date().toLocaleString(), tactics: copia };
    const l = existente ? lista.map(p => p.id === existente.id ? nova : p) : [nova, ...lista];
    setLista(l); gravarLista(l); setNome('');
  };
  const entrada = useRef<HTMLInputElement>(null);
  const [aviso, setAviso] = useState('');
  const baixar = (nomeFicheiro: string, taticas: Preset[]) => {
    const blob = new Blob([JSON.stringify({ formato: 'fm-taticas', versao: 1, taticas }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nomeFicheiro; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const seguro = (n: string) => n.replace(/[^\w\-]+/g, '_').slice(0, 40) || 'tatica';
  // Importa um .json (varias taticas ou uma so): junta as que nao existem e substitui as do mesmo nome.
  const importar = async (f: File) => {
    try {
      const j = JSON.parse(await f.text());
      const brutas: any[] = Array.isArray(j) ? j : Array.isArray(j?.taticas) ? j.taticas : (j?.tactics ? [j] : []);
      const validas = brutas.filter(x => x && typeof x.name === 'string' && x.tactics && typeof x.tactics.formation === 'string');
      if (!validas.length) { setAviso('Ficheiro sem táticas válidas.'); return; }
      let l = [...lista];
      for (const v of validas) {
        const ex = l.find(p => p.name.toLowerCase() === v.name.toLowerCase());
        const nova: Preset = { id: ex?.id || String(Date.now()) + Math.random().toString(36).slice(2, 6), name: v.name, date: v.date || new Date().toLocaleString(), tactics: v.tactics };
        l = ex ? l.map(p => p.id === ex.id ? nova : p) : [nova, ...l];
      }
      setLista(l); gravarLista(l); setAviso(`${validas.length} tática(s) importada(s).`);
    } catch { setAviso('Não consegui ler o ficheiro.'); }
  };
  // Grava a tatica atual POR CIMA de uma ja gravada (mesmo nome e id), sem precisar de escrever o nome outra vez.
  const substituir = (p: Preset) => {
    const l = lista.map(x => x.id === p.id ? { ...x, date: new Date().toLocaleString(), tactics: JSON.parse(JSON.stringify(atual)) as Tactics } : x);
    setLista(l); gravarLista(l); setAviso(`"${p.name}" substituída.`); setNome(''); setPendente(null);
  };
  const apagar = (id: string) => { const l = lista.filter(p => p.id !== id); setLista(l); gravarLista(l); };

  return (
    <div className="fixed inset-0 z-[300] bg-black/70 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-6 w-[610px] max-w-[95vw] max-h-[86vh] flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-700 dark:text-white">Gravar / Carregar tática</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl font-black leading-none">✕</button>
        </div>

        <div className="flex gap-2">
          <input autoFocus={foco === 'save'} value={nome} onChange={e => setNome(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') guardar(); }} maxLength={40} placeholder="Nome da tática (ex.: 4-3-3 pressão alta)"
            className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-[12px] font-bold text-slate-700 dark:text-white outline-none focus:border-blue-400" />
          <button onClick={guardar} disabled={!nome.trim()} className="px-4 py-2 rounded bg-blue-600 disabled:opacity-30 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-500">Gravar</button>
        </div>
        <span className="text-[9px] text-slate-400 leading-tight -mt-2">Grava a tática atual: {atual.formation}, estilo {atual.style}{atual.zoneOverrides?.[atual.formation] ? ', com posições ajustadas' : ''}. Um nome já existente é substituído.</span>

        <div className="flex gap-2 items-center">
          <button onClick={() => baixar('taticas.json', lista)} disabled={!lista.length} className="px-3 py-2 rounded bg-slate-200 dark:bg-slate-700 disabled:opacity-30 text-slate-700 dark:text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-slate-600" title="Guarda todas as táticas num ficheiro .json no computador">Exportar tudo (.json)</button>
          <button onClick={() => entrada.current?.click()} className="px-3 py-2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-slate-600" title="Carrega táticas de um ficheiro .json">Importar (.json)</button>
          <input ref={entrada} type="file" accept=".json,application/json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) importar(f); e.target.value = ''; }} />
          {aviso && <span className="text-[10px] font-bold text-emerald-500">{aviso}</span>}
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar">
          {lista.length === 0 && <span className="text-[11px] text-slate-400 italic text-center py-6">Nenhuma tática gravada.</span>}
          {lista.map(p => (
            <div key={p.id} className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-black text-slate-700 dark:text-white truncate">{p.name}</div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">{p.tactics.formation} · {p.tactics.style}{p.tactics.zoneOverrides?.[p.tactics.formation] ? ' · posições' : ''} · {p.date}</div>
              </div>
              <button onClick={() => setPendente(p)} title="Grava a tática atual por cima desta" className="px-3 py-1.5 rounded bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-500">Gravar aqui</button>
              <button onClick={() => { onLoad(JSON.parse(JSON.stringify(p.tactics))); onClose(); }} className="px-3 py-1.5 rounded bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500">Carregar</button>
              <button onClick={() => baixar(seguro(p.name) + '.json', [p])} title="Exportar esta tática (.json)" className="px-2 py-1.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[11px] font-black hover:bg-blue-600 hover:text-white">⬇</button>
              <button onClick={() => apagar(p.id)} title="Apagar" className="px-2 py-1.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[11px] font-black hover:bg-rose-600 hover:text-white">🗑</button>
            </div>
          ))}
        </div>
      </div>
      {pendente && (
        <div className="fixed inset-0 z-[310] bg-black/60 flex items-center justify-center p-6" onClick={e => { e.stopPropagation(); setPendente(null); }}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-6 w-[420px] max-w-[95vw] flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-700 dark:text-white">Substituir tática?</h3>
            <p className="text-[12px] text-slate-500 dark:text-slate-300 leading-snug">A tática <b className="text-slate-700 dark:text-white">{pendente.name}</b> será gravada por cima com a tática atual ({atual.formation}, estilo {atual.style}). O que estava gravado nela será perdido.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPendente(null)} className="px-4 py-2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-slate-600">Cancelar</button>
              <button autoFocus onClick={() => substituir(pendente)} className="px-4 py-2 rounded bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-500">Substituir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TacticPresetsModal;
