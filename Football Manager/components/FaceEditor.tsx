import React, { useMemo, useRef, useState } from 'react';
import { REAL_PLAYERS_JSON } from '../textSim/realDatabase';
import { FACES } from '../textSim/facesDatabase';
import { PlayerFace } from './PlayerFace';
import { lerFaceDaFoto } from '../textSim/faceFromPhoto';
import type { FaceCustom, EstiloBarba, EstiloCabelo } from '../textSim/aparencia';

const FACE_PADRAO: FaceCustom = { pele: '#c68a5e', cabelo: '#2a2420', estilo: 'curto', barba: 'nenhuma', oculos: false, largura: 1 };
const ESTILOS: [EstiloCabelo, string][] = [['curto', 'Short'], ['raspado', 'Buzz'], ['longo', 'Long'], ['topete', 'Quiff'], ['careca', 'Bald']];
const BARBAS: [EstiloBarba, string][] = [['nenhuma', 'None'], ['rala', 'Stubble'], ['cheia', 'Full beard'], ['bigode', 'Moustache']];
const MARTINELLI = 269253;

/*
O EDITOR DE FACES — transforma uma foto (no padrao do site de faces: rosto de frente, luz uniforme, fundo claro e liso) na face em blocos do jogo, com PREVIA AO VIVO.
A foto e lida no navegador (textSim/faceFromPhoto.ts; nada sai do computador) e a leitura e so uma SUGESTAO: cada campo (pele, cabelo, estilo, barba, oculos, largura) ajusta-se a mao.
Grava so os parametros — nunca a foto — em data/faces.json (via /api/save-face, servidor de desenvolvimento); o 2D e o 3D usam os mesmos.
*/
export const FaceEditor: React.FC = () => {
  const [busca, setBusca] = useState('Martinelli');
  const [id, setId] = useState<number | null>(MARTINELLI);
  const [face, setFace] = useState<FaceCustom>(FACES[String(MARTINELLI)] || FACE_PADRAO);
  const [foto, setFoto] = useState<string | null>(null);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const jogadores = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (REAL_PLAYERS_JSON as any[]).filter(p => q && (String(p.namePlayer).toLowerCase().includes(q) || String(p.team).toLowerCase().includes(q))).slice(0, 40);
  }, [busca]);
  const atual = (REAL_PLAYERS_JSON as any[]).find(p => p.idPlayer === id);

  const escolher = (p: any) => {
    setId(p.idPlayer); setFace(FACES[String(p.idPlayer)] || FACE_PADRAO); setFoto(null); setAvisos([]); setMsg(null);
  };
  const mudar = (p: Partial<FaceCustom>) => setFace(f => ({ ...f, ...p }));

  // A foto -> pixels (reduzida a 400 px de largura no maximo) -> leitura.
  const ler = () => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) { setMsg({ tipo: 'erro', texto: 'Load a photo first.' }); return; }
    const esc = Math.min(1, 400 / img.naturalWidth);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * esc)); c.height = Math.max(1, Math.round(img.naturalHeight * esc));
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const dados = ctx.getImageData(0, 0, c.width, c.height);
    const r = lerFaceDaFoto({ data: dados.data, width: c.width, height: c.height });
    setFace(f => ({ ...r.face, oculos: f.oculos }));
    setAvisos(r.avisos);
    setMsg({ tipo: 'ok', texto: 'Photo read: adjust anything that looks off.' });
  };
  const carregarArquivo = (f: File | undefined) => {
    if (!f) return;
    const leitor = new FileReader();
    leitor.onload = () => setFoto(String(leitor.result));
    leitor.readAsDataURL(f);
  };
  const salvar = async (apagar = false) => {
    if (id === null) return;
    try {
      const r = await fetch('/api/save-face', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, face: apagar ? null : face }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'error');
      setMsg({ tipo: 'ok', texto: apagar ? 'Custom face removed.' : 'Saved. The 2D face updates now; reload the 3D match to see it there.' });
    } catch (e: any) { setMsg({ tipo: 'erro', texto: 'Could not save: ' + (e.message || e) + ' (the editor saves only in the dev server).' }); }
  };

  const campo = 'bg-slate-900 border border-slate-700 rounded px-2 py-2 text-sm text-white outline-none focus:border-blue-500';
  const rotulo = 'text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1 block';
  const fotoSrc = foto || (id !== null ? `/Assets/Faces/${id}.png` : null);

  return (
    <div className="w-full h-full flex gap-4 min-h-0">
      {/* escolher o jogador */}
      <div className="w-72 shrink-0 flex flex-col gap-2 min-h-0">
        <input className={campo} value={busca} onChange={e => setBusca(e.target.value)} placeholder="Search player or club" />
        <button onClick={() => { setBusca('Martinelli'); const p = (REAL_PLAYERS_JSON as any[]).find(x => x.idPlayer === MARTINELLI); if (p) escolher(p); }}
          className="bg-blue-600 hover:bg-blue-500 text-white font-black py-2 rounded text-xs uppercase tracking-widest">Test with Martinelli (Fluminense-RJ)</button>
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1">
          {jogadores.map(p => (
            <button key={p.idPlayer} onClick={() => escolher(p)} className={`text-left px-3 py-2 rounded border ${p.idPlayer === id ? 'bg-blue-900/30 border-blue-500' : 'bg-slate-900/60 border-slate-800 hover:border-slate-600'}`}>
              <div className="text-sm font-bold text-white">{p.namePlayer} {FACES[String(p.idPlayer)] && <span className="text-[10px] font-black bg-emerald-600 px-1.5 rounded ml-1">CUSTOM</span>}</div>
              <div className="text-[11px] text-slate-500">{p.team} • OVR {p.ovrPlayer}</div>
            </button>
          ))}
          {!jogadores.length && <div className="text-xs text-slate-500 p-2">Type a name to search.</div>}
        </div>
      </div>

      {/* foto + controles */}
      <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar flex flex-col gap-4">
        <div className="text-xl font-black uppercase italic text-white">{atual ? atual.namePlayer : 'Select a player'} <span className="text-sm not-italic font-bold text-slate-500">{atual?.team}</span></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 flex flex-col gap-3">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">1. Photo (front, even light, plain light background)</div>
            <div className="bg-slate-950 rounded flex items-center justify-center min-h-[220px]"
              onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); carregarArquivo(e.dataTransfer.files?.[0]); }}>
              {fotoSrc ? <img ref={imgRef} src={fotoSrc} alt="photo" className="max-h-[300px] object-contain" onError={() => setMsg({ tipo: 'erro', texto: foto ? 'Could not open the image.' : `No photo found at Assets/Faces/${id}.png — upload one.` })} />
                : <div className="text-slate-600 text-sm">Drop a photo here</div>}
            </div>
            <div className="flex gap-2">
              <input ref={arquivo} type="file" accept="image/*" className="hidden" onChange={e => carregarArquivo(e.target.files?.[0])} />
              <button onClick={() => arquivo.current?.click()} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-black py-2 rounded text-xs uppercase tracking-widest">Upload photo</button>
              <button onClick={ler} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2 rounded text-xs uppercase tracking-widest">Read face from photo</button>
            </div>
            {avisos.map((a, i) => <div key={i} className="text-xs font-bold text-amber-400">⚠ {a}</div>)}
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 flex flex-col gap-3">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">2. Live preview (the game face)</div>
            <div className="flex items-end justify-center gap-6 bg-gradient-to-b from-slate-800 to-slate-950 rounded p-3">
              {id !== null && <div className="w-48 h-52"><PlayerFace playerId={'p-' + id} face={face} className="w-full h-full" /></div>}
              {id !== null && <div className="flex flex-col items-center gap-2"><div className="w-[50px] h-[50px] rounded-full overflow-hidden bg-slate-800 border border-slate-700"><PlayerFace playerId={'p-' + id} face={face} className="w-full h-full" /></div><span className="text-[10px] text-slate-500 uppercase font-bold">list size</span></div>}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
          <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-3">3. Adjust</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div><label className={rotulo}>Skin</label><div className="flex gap-2 items-center"><input type="color" value={face.pele} onChange={e => mudar({ pele: e.target.value })} className="w-12 h-9 bg-transparent" /><span className="text-xs text-slate-400 font-mono">{face.pele}</span></div></div>
            <div><label className={rotulo}>Hair colour</label><div className="flex gap-2 items-center"><input type="color" value={face.cabelo} onChange={e => mudar({ cabelo: e.target.value })} className="w-12 h-9 bg-transparent" /><span className="text-xs text-slate-400 font-mono">{face.cabelo}</span></div></div>
            <div><label className={rotulo}>Hair style</label><select className={campo + ' w-full'} value={face.estilo} onChange={e => mudar({ estilo: e.target.value as EstiloCabelo })}>{ESTILOS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}</select></div>
            <div><label className={rotulo}>Beard</label><select className={campo + ' w-full'} value={face.barba} onChange={e => mudar({ barba: e.target.value as EstiloBarba })}>{BARBAS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}</select></div>
            <div><label className={rotulo}>Glasses</label><button onClick={() => mudar({ oculos: !face.oculos })} className={`w-full py-2 rounded text-xs font-black uppercase tracking-widest ${face.oculos ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{face.oculos ? 'On' : 'Off'}</button></div>
            <div><label className={rotulo}>Face width ({face.largura.toFixed(2)})</label><input type="range" min={0.9} max={1.1} step={0.01} value={face.largura} onChange={e => mudar({ largura: Number(e.target.value) })} className="w-full" /></div>
          </div>
          <div className="flex gap-3 mt-4 items-center flex-wrap">
            <button onClick={() => salvar(false)} disabled={id === null} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-black px-6 py-2.5 rounded text-xs uppercase tracking-widest">Save face</button>
            {id !== null && FACES[String(id)] && <button onClick={() => salvar(true)} className="bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white font-black px-6 py-2.5 rounded text-xs uppercase tracking-widest">Remove custom face</button>}
            {msg && <span className={`text-xs font-bold ${msg.tipo === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}>{msg.texto}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceEditor;
