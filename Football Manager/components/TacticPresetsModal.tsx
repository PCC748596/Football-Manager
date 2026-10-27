import React, { useState } from 'react';
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
}

/*
GRAVAR E CARREGAR TATICAS. Cada gravacao guarda a tatica TODA do time (formacao, estilo, pressao, linha, compactacao, setores e os ajustes de posicao com e sem bola), com um nome. Ficam neste
navegador (localStorage), por isso valem para qualquer carreira. Carregar substitui a tatica atual.
*/
const TacticPresetsModal: React.FC<Props> = ({ atual, onLoad, onClose }) => {
  const [lista, setLista] = useState<Preset[]>(ler);
  const [nome, setNome] = useState('');

  const guardar = () => {
    const n = nome.trim();
    if (!n) return;
    const copia: Tactics = JSON.parse(JSON.stringify(atual));
    const existente = lista.find(p => p.name.toLowerCase() === n.toLowerCase());
    const nova: Preset = { id: existente?.id || String(Date.now()), name: n, date: new Date().toLocaleString(), tactics: copia };
    const l = existente ? lista.map(p => p.id === existente.id ? nova : p) : [nova, ...lista];
    setLista(l); gravarLista(l); setNome('');
  };
  const apagar = (id: string) => { const l = lista.filter(p => p.id !== id); setLista(l); gravarLista(l); };

  return (
    <div className="fixed inset-0 z-[300] bg-black/70 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-6 w-[460px] max-h-[86vh] flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-700 dark:text-white">Gravar / Carregar tática</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl font-black leading-none">✕</button>
        </div>

        <div className="flex gap-2">
          <input value={nome} onChange={e => setNome(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') guardar(); }} maxLength={40} placeholder="Nome da tática (ex.: 4-3-3 pressão alta)"
            className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-[12px] font-bold text-slate-700 dark:text-white outline-none focus:border-blue-400" />
          <button onClick={guardar} disabled={!nome.trim()} className="px-4 py-2 rounded bg-blue-600 disabled:opacity-30 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-500">Gravar</button>
        </div>
        <span className="text-[9px] text-slate-400 leading-tight -mt-2">Grava a tática atual: {atual.formation}, estilo {atual.style}{atual.zoneOverrides?.[atual.formation] ? ', com posições ajustadas' : ''}. Um nome já existente é substituído.</span>

        <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar">
          {lista.length === 0 && <span className="text-[11px] text-slate-400 italic text-center py-6">Nenhuma tática gravada.</span>}
          {lista.map(p => (
            <div key={p.id} className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-black text-slate-700 dark:text-white truncate">{p.name}</div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">{p.tactics.formation} · {p.tactics.style}{p.tactics.zoneOverrides?.[p.tactics.formation] ? ' · posições' : ''} · {p.date}</div>
              </div>
              <button onClick={() => { onLoad(JSON.parse(JSON.stringify(p.tactics))); onClose(); }} className="px-3 py-1.5 rounded bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500">Carregar</button>
              <button onClick={() => apagar(p.id)} title="Apagar" className="px-2 py-1.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[11px] font-black hover:bg-rose-600 hover:text-white">🗑</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TacticPresetsModal;
