import React, { useMemo, useState } from 'react';
import { mapPosString } from '../textSim/dataGenerator';
import { NOME_DO_CAMPO } from '../textSim/atributos3d';
import { GRUPOS, ATTR_MIN, ATTR_MAX, gerarAtributos, calcularGrupos, validarAtributos, getCompatiblePlayingStyles, estiloCompativel, calcularOverallPosicional } from '../textSim/geradorAtributos';

/*
OS 31 ATRIBUTOS NO EDITOR DE JOGADORES. Posicao e Playing Style (so os compativeis; se a posicao mudar e o estilo deixar de servir, e pedido outro), gerar / regenerar a partir do OVR e da idade,
edicao manual de cada atributo (inteiros de 50 a 99) e as medias TEC/TAC/MEN/FIS recalculadas na hora. Nada e sobrescrito sem carregar em Generate. O botao Apply do editor fica bloqueado enquanto
houver valores invalidos (`atributoEditorBloqueado`), e o valor invalido nunca chega ao jogador editado: so entram na lista os inteiros de 50 a 99.
*/
export const atributosValidos = (p: any): { ok: boolean; erros: string[] } => {
  const erros: string[] = [];
  const pos = mapPosString(p.posPlayer);
  if (p.estiloPlayer && !estiloCompativel(pos, p.estiloPlayer)) erros.push(`Playing Style "${p.estiloPlayer}" incompativel com a posicao ${pos}`);
  if (p.attrs3d) erros.push(...validarAtributos(p.attrs3d).erros);
  return { ok: erros.length === 0, erros };
};
export const atributoEditorBloqueado = (p: any) => !atributosValidos(p).ok;

const AtributosEditor: React.FC<{ player: any; onChange: (p: any) => void }> = ({ player, onChange }) => {
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  const pos = mapPosString(player.posPlayer);
  const estilos = useMemo(() => getCompatiblePlayingStyles(pos), [pos]);
  const attrs: Record<string, number> | undefined = player.attrs3d;
  const estiloOk = !player.estiloPlayer || estiloCompativel(pos, player.estiloPlayer);
  const grupos = attrs && validarAtributos(attrs).ok ? calcularGrupos(attrs) : null;
  const val = atributosValidos(player);

  const gerar = () => {
    const g = gerarAtributos(pos, estiloOk ? player.estiloPlayer : undefined, Math.max(50, Math.min(99, player.ovrPlayer || 60)), `${player.idPlayer}|${Date.now()}`, { idade: player.agePlayer || 26 });
    setRascunho({});
    onChange({ ...player, attrs3d: g.atributos, estiloPlayer: g.estilo });
  };
  const erroDe = (k: string): string | null => {
    const txt = rascunho[k];
    if (txt === undefined) return null;
    if (txt.trim() === '') return 'empty';
    if (!/^\d+$/.test(txt.trim())) return 'integer only';
    const n = Number(txt);
    return n < ATTR_MIN ? `min ${ATTR_MIN}` : n > ATTR_MAX ? `max ${ATTR_MAX}` : null;
  };
  const editar = (k: string, txt: string) => {
    setRascunho(r => ({ ...r, [k]: txt }));
    const n = Number(txt);
    if (/^\d+$/.test(txt.trim()) && n >= ATTR_MIN && n <= ATTR_MAX) onChange({ ...player, attrs3d: { ...(attrs || {}), [k]: n } });
  };
  // Um campo com texto invalido por corrigir bloqueia o Apply: o valor antigo continua no jogador, por isso a marca e local a este componente.
  const invalidoLocal = Object.keys(rascunho).some(k => erroDe(k));
  React.useEffect(() => { (window as any).__atributosInvalidos = invalidoLocal; return () => { (window as any).__atributosInvalidos = false; }; }, [invalidoLocal]);

  return (
    <div className="col-span-2 mt-2 border-t border-slate-800 pt-3">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className="text-xs font-bold text-slate-400 uppercase">3D Attributes ({ATTR_MIN}-{ATTR_MAX})</span>
        <select value={player.estiloPlayer || ''} onChange={e => onChange({ ...player, estiloPlayer: e.target.value || undefined })} className="bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white">
          <option value="">Playing Style: auto</option>
          {estilos.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={gerar} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-1 px-3 rounded">{attrs ? 'Regenerate' : 'Generate'}</button>
        {grupos && attrs && <span className="text-xs text-slate-400">TEC <b className="text-white">{grupos.TEC}</b> · TAC <b className="text-white">{grupos.TAC}</b> · MEN <b className="text-white">{grupos.MEN}</b> · FIS <b className="text-white">{grupos.FIS}</b> · POS OVR <b className="text-white">{Math.round(calcularOverallPosicional(pos, attrs))}</b></span>}
      </div>
      {!estiloOk && <div className="text-xs text-rose-400 mb-1">Playing Style "{player.estiloPlayer}" does not fit position {pos}: choose another one.</div>}
      {!attrs && <div className="text-[11px] text-slate-500">No stored 3D attributes: the game derives them (original data or generated). Press Generate to define and store them.</div>}
      {attrs && (['TEC', 'TAC', 'MEN', 'FIS'] as const).map(g => (
        <div key={g} className="mb-2">
          <div className="text-[10px] font-black text-slate-500 uppercase">{g} {grupos ? `· ${grupos[g]}` : ''}</div>
          <div className="grid grid-cols-4 gap-1">
            {GRUPOS[g].map(k => {
              const e = erroDe(k);
              return (
                <label key={k} className="text-[10px] text-slate-400">
                  {NOME_DO_CAMPO[k] || k}
                  <input type="text" inputMode="numeric" value={rascunho[k] ?? String(attrs[k] ?? '')} onChange={ev => editar(k, ev.target.value)} title={e || ''}
                    className={`w-full bg-slate-950 border rounded p-1 text-xs text-white ${e ? 'border-rose-500' : 'border-slate-800'}`} />
                  {e && <span className="text-rose-400">{e}</span>}
                </label>
              );
            })}
          </div>
        </div>
      ))}
      {(!val.ok || invalidoLocal) && <div className="text-xs text-rose-400">Fix the values before applying: {val.erros.slice(0, 3).join('; ') || 'invalid field'}</div>}
    </div>
  );
};
export default AtributosEditor;
