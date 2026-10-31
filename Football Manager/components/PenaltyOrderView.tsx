import React, { useMemo, useState } from 'react';
import { Player, Team } from '../types';
import { normalizarOrdem, ordemAutomatica, notaDePenalti } from '../textSim/penaltyShootout';
import { campo3d } from '../textSim/atributos3d';

/*
A ORDEM DOS BATEDORES na disputa de penaltis (copas, jogo unico ou agregado empatado). Mostra TODOS os jogadores do time, goleiro incluido, ja pelos melhores batedores
(Penalties + Consistency); o tecnico reordena arrastando ou com as setas e confirma. Acabados os batedores a disputa volta ao primeiro (ver textSim/penaltyShootout.ts).
A tela so devolve a ordem (`aoConfirmar`): quem a chama guarda-a (`definirOrdemPenaltis`) e abre a disputa.
*/
interface Props {
  time: Team;
  jogadores: Player[];                       // o plantel inteiro do time
  ordemInicial?: string[];                   // a guardada (time.penaltyOrder); sem ela, a automatica
  aoConfirmar: (ordem: string[]) => void;
  aoCancelar?: () => void;
}

const PenaltyOrderView: React.FC<Props> = ({ time, jogadores, ordemInicial, aoConfirmar, aoCancelar }) => {
  const [ordem, setOrdem] = useState<string[]>(() => normalizarOrdem(ordemInicial, jogadores));
  const [arrastando, setArrastando] = useState<number | null>(null);
  const porId = useMemo(() => new Map(jogadores.map(p => [p.id, p])), [jogadores]);

  const mover = (de: number, para: number) => {
    if (de === para || para < 0 || para >= ordem.length) return;
    const n = ordem.slice();
    const [x] = n.splice(de, 1);
    n.splice(para, 0, x);
    setOrdem(n);
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-xl bg-slate-900/95 backdrop-blur-md p-6 rounded-3xl border border-slate-800 shadow-2xl">
      <div className="text-center">
        <h2 className="text-xl font-black text-white uppercase italic tracking-widest">Penalty Shootout</h2>
        <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">{time.name} • Kick order</p>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">
          Drag the rows or use the arrows • When the list ends, it starts again from the first kicker
        </p>
      </div>

      <div className="flex justify-between items-center">
        <button onClick={() => setOrdem(ordemAutomatica(jogadores))} className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-black px-3 py-1.5 rounded text-[10px] uppercase tracking-widest">
          Auto (best takers)
        </button>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Penalties + Consistency</span>
      </div>

      <div className="max-h-[52vh] overflow-y-auto custom-scrollbar flex flex-col gap-1">
        {ordem.map((id, i) => {
          const p = porId.get(id);
          if (!p) return null;
          const regular = i < 5;
          return (
            <div
              key={id}
              draggable
              onDragStart={() => setArrastando(i)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => { if (arrastando !== null) mover(arrastando, i); setArrastando(null); }}
              className={`flex items-center gap-3 px-3 py-1.5 rounded-lg border cursor-grab active:cursor-grabbing ${regular ? 'bg-slate-800 border-slate-700' : 'bg-slate-900 border-slate-800'} ${arrastando === i ? 'opacity-40' : ''}`}
            >
              <span className={`w-6 text-center text-xs font-black ${regular ? 'text-emerald-400' : 'text-slate-500'}`}>{i + 1}</span>
              <span className="w-9 text-[10px] font-black text-slate-400 uppercase">{p.position}</span>
              <span className="flex-1 text-sm font-black text-white truncate">{p.name}</span>
              <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap" title="Penalties / Consistency">
                {campo3d(p, ['penalties'])} / {campo3d(p, ['consistency'])}
              </span>
              <span className="w-10 text-right text-xs font-black text-blue-400" title="Penalties + Consistency">{notaDePenalti(p)}</span>
              <span className="flex flex-col">
                <button onClick={() => mover(i, i - 1)} disabled={i === 0} className="text-slate-400 hover:text-white disabled:opacity-20 text-[10px] leading-none">▲</button>
                <button onClick={() => mover(i, i + 1)} disabled={i === ordem.length - 1} className="text-slate-400 hover:text-white disabled:opacity-20 text-[10px] leading-none">▼</button>
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        {aoCancelar && (
          <button onClick={aoCancelar} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black py-3 rounded-xl text-xs uppercase tracking-widest">Cancel</button>
        )}
        <button onClick={() => aoConfirmar(ordem)} className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-xs uppercase tracking-[0.2em] border-b-4 border-emerald-800">
          Confirm order
        </button>
      </div>
    </div>
  );
};

export default PenaltyOrderView;
