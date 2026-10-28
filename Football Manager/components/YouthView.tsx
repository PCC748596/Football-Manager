import React, { useMemo, useState } from 'react';
import { atributos3d } from '../textSim/atributos3d';
import { useGame } from '../context/GameContext';
import { Player, Position } from '../types';
import { estrelasDoJogador, MudancaAtributo, RelatorioMes, TAMANHO_BASE, IDADE_ESTILO } from '../textSim/youth';
import { ICONE_DO_ESTILO } from '../textSim/playStyleIcons';
import { ContractChip, ContractPanel } from './ContractPanel';

const ORDEM: Position[] = [Position.GK, Position.LB, Position.CB, Position.RB, Position.DM, Position.LM, Position.CM, Position.RM, Position.AM, Position.LW, Position.RW, Position.SS, Position.ST];
const NOME_ATTR: Record<MudancaAtributo['attr'], string> = { def: 'TAC', pas: 'TEC', drb: 'TEC', sht: 'TEC' };
const MESES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const mesEmTexto = (mes: string) => `${MESES[Number(mes.slice(5, 7)) - 1]} ${mes.slice(0, 4)}`;

const Estrelas: React.FC<{ n: number }> = ({ n }) => (
  <span title="Estimated potential (scout estimate, not a guarantee)" className="whitespace-nowrap text-sm tracking-tighter">
    {Array.from({ length: 5 }, (_, i) => <span key={i} className={i < n ? 'text-slate-400 dark:text-slate-300' : 'text-slate-200 dark:text-slate-700'}>★</span>)}
  </span>
);

const Delta: React.FC<{ v: number }> = ({ v }) => (
  <span className={`font-black ${v > 0 ? 'text-emerald-500' : v < 0 ? 'text-rose-500' : 'text-slate-400'}`}>{v > 0 ? '+' : ''}{v}</span>
);

const EstiloDoJovem: React.FC<{ p: Player; completo?: boolean }> = ({ p, completo }) => {
  const e = p.playStyle && p.playStyle !== 'None' ? p.playStyle : null;
  if (!e) return <span className="text-slate-400 text-xs italic">{completo ? `Defined from age ${IDADE_ESTILO}` : `from ${IDADE_ESTILO}`}</span>;
  return <span className="whitespace-nowrap text-xs font-bold text-slate-600 dark:text-slate-300" title={e}><span className="mr-1">{ICONE_DO_ESTILO[e] || '🪄'}</span>{e}</span>;
};

const Mudancas: React.FC<{ r?: RelatorioMes }> = ({ r }) => {
  if (!r) return <span className="text-slate-400">-</span>;
  if (!r.mudancas.length && !r.estilo) return <span className="text-slate-400 italic">Maintained level</span>;
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-0.5">
      {r.mudancas.map(m => (
        <span key={m.attr} className={`font-bold ${m.para > m.de ? 'text-emerald-500' : 'text-rose-500'}`}>{NOME_ATTR[m.attr]} {m.de}→{m.para} {m.para > m.de ? '▲' : '▼'}</span>
      ))}
      {r.estilo && <span className="font-bold text-blue-400">PlayStyle: {r.estilo.de && r.estilo.de !== 'None' ? `${r.estilo.de} → ` : ''}{r.estilo.para}</span>}
    </span>
  );
};

const YouthView: React.FC = () => {
  const { base, userTeam, gameState, promoteYouth, dispensarJovem, formatCurrencyShort, players } = useGame();
  const [aba, setAba] = useState<'LISTA' | 'RELATORIO'>('LISTA');
  const [selId, setSelId] = useState<string | null>(null);
  const [promovendo, setPromovendo] = useState<Player | null>(null);   // jogador no modal de confirmacao da promocao
  const [erroPromo, setErroPromo] = useState<string | null>(null);
  const [modo, setModo] = useState<'PROMOVER' | 'DISPENSAR'>('PROMOVER');
  const hoje = gameState.currentDate;

  // Ordenacao pelos cabecalhos (clique alterna crescente/decrescente). Padrao: por posicao e depois OVR.
  type ColunaOrdem = 'POS' | 'NAME' | 'AGE' | 'OVR' | 'POT' | 'STYLE' | 'CONTRACT' | 'MONTH';
  const [ordem, setOrdem] = useState<{ col: ColunaOrdem; asc: boolean } | null>(null);
  const alternarOrdem = (col: ColunaOrdem) => setOrdem(o => (o && o.col === col ? { col, asc: !o.asc } : { col, asc: col === 'NAME' || col === 'POS' || col === 'STYLE' }));
  const jovens = useMemo(() => {
    const lista = (base && userTeam ? base.jogadores.filter(p => p.teamId === userTeam.id) : []).slice()
      .sort((a, b) => ORDEM.indexOf(a.position) - ORDEM.indexOf(b.position) || b.skill - a.skill);
    if (!ordem) return lista;
    const delta = (p: Player) => base?.relatorios[p.id]?.slice(-1)[0]?.delta ?? -999;
    const chave = (p: Player): number | string => {
      switch (ordem.col) {
        case 'POS': return ORDEM.indexOf(p.position);
        case 'NAME': return p.name.toLowerCase();
        case 'AGE': return p.age;
        case 'OVR': return p.skill;
        case 'POT': return estrelasDoJogador(p);
        case 'STYLE': return p.playStyle && p.playStyle !== 'None' ? p.playStyle : '￿';
        case 'CONTRACT': return p.contract?.end || '9999';
        default: return delta(p);
      }
    };
    const dir = ordem.asc ? 1 : -1;
    return lista.sort((a, b) => { const x = chave(a), y = chave(b); return (x < y ? -1 : x > y ? 1 : 0) * dir || b.skill - a.skill; });
  }, [base, userTeam?.id, ordem]);
  const sel = jovens.find(p => p.id === selId) || null;
  const ultimo = (p: Player): RelatorioMes | undefined => base?.relatorios[p.id]?.slice(-1)[0];
  const mesDoRelatorio = base?.mesProcessado || '';
  const temRelatorio = jovens.some(p => ultimo(p));
  const movimentos = (base?.movimentos || []).filter(m => m.teamId === userTeam?.id).slice().reverse();

  if (!userTeam) return null;
  if (!base) return <div className="text-slate-400 text-sm font-bold uppercase tracking-widest p-8">Generating youth academies...</div>;

  const promover = (p: Player) => { setErroPromo(null); setModo('PROMOVER'); setPromovendo(p); };
  const dispensar = (p: Player) => { setErroPromo(null); setModo('DISPENSAR'); setPromovendo(p); };
  const confirmarPromocao = () => {
    if (!promovendo) return;
    if (modo === 'DISPENSAR') { if (dispensarJovem(promovendo.id)) { setSelId(null); setPromovendo(null); } else setErroPromo('Could not release this player.'); return; }
    if (promoteYouth(promovendo.id)) { setSelId(null); setPromovendo(null); }
    else setErroPromo('The first team is full (max 33 players). Release or sell a player first.');
  };
  const tamanhoElenco = players.filter(p => p.teamId === userTeam.id).length;

  const seta = (col: ColunaOrdem) => (ordem && ordem.col === col ? (ordem.asc ? ' ▲' : ' ▼') : '');
  const cab = 'px-3 py-2 text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800';

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {([['LISTA', 'Academy'], ['RELATORIO', 'Monthly report']] as const).map(([id, rotulo]) => (
            <button key={id} onClick={() => setAba(id)} className={`px-4 py-1.5 rounded text-xs font-black uppercase tracking-widest transition-colors ${aba === id ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}>{rotulo}</button>
          ))}
        </div>
        <div className="text-xs font-black uppercase tracking-widest text-slate-400">{jovens.length}/{TAMANHO_BASE} players • ages 15-20 • no matches, development only</div>
      </div>

      {aba === 'LISTA' ? (
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1.7fr_1fr] gap-6 min-h-0">
          <div className="bg-slate-100/50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-xl">
            <div className="overflow-y-auto custom-scrollbar flex-1">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead className="bg-slate-200/40 dark:bg-slate-950/60 sticky top-0 z-10">
                  <tr><th className={`${cab} cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300`} onClick={() => alternarOrdem('POS')}>Pos{seta('POS')}</th><th className={`${cab} cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300`} onClick={() => alternarOrdem('NAME')}>Name{seta('NAME')}</th><th className={`${cab} cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300 text-center`} onClick={() => alternarOrdem('AGE')}>Age{seta('AGE')}</th><th className={`${cab} cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300 text-center`} onClick={() => alternarOrdem('OVR')}>OVR{seta('OVR')}</th><th className={`${cab} cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300`} onClick={() => alternarOrdem('POT')}>Potential{seta('POT')}</th><th className={`${cab} cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300`} onClick={() => alternarOrdem('STYLE')}>PlayStyle{seta('STYLE')}</th><th className={`${cab} cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300`} onClick={() => alternarOrdem('CONTRACT')}>Contract{seta('CONTRACT')}</th><th className={`${cab} cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300 text-center`} onClick={() => alternarOrdem('MONTH')}>Last month{seta('MONTH')}</th><th className={cab}></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30">
                  {jovens.map(p => {
                    const r = ultimo(p);
                    return (
                      <tr key={p.id} onClick={() => setSelId(p.id)} className={`cursor-pointer transition-colors ${selId === p.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-blue-50/50 dark:hover:bg-white/5'}`}>
                        <td className="px-3 py-2"><span className="text-xs font-black text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded bg-slate-50 dark:bg-slate-900/40">{p.position}</span></td>
                        <td className="px-3 py-2 font-bold text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap">{p.name}</td>
                        <td className="px-3 py-2 text-center text-sm text-slate-500 dark:text-slate-400">{p.age}</td>
                        <td className="px-3 py-2 text-center"><span className="text-sm font-black text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20 px-2 py-0.5 rounded">{p.skill}</span></td>
                        <td className="px-3 py-2"><Estrelas n={estrelasDoJogador(p)} /></td>
                        <td className="px-3 py-2"><EstiloDoJovem p={p} /></td>
                        <td className="px-3 py-2"><ContractChip player={p} hoje={hoje} /></td>
                        <td className="px-3 py-2 text-center text-sm">{r ? <Delta v={r.delta} /> : <span className="text-slate-400">-</span>}</td>
                        <td className="px-3 py-2 text-right"><button onClick={e => { e.stopPropagation(); promover(p); }} className="whitespace-nowrap bg-emerald-600 hover:bg-emerald-500 text-white font-black px-2.5 py-1 rounded text-[10px] uppercase tracking-widest transition-colors">Promote</button><button onClick={e => { e.stopPropagation(); dispensar(p); }} className="ml-1 whitespace-nowrap bg-transparent border border-rose-700 text-rose-400 hover:bg-rose-900/40 font-black px-2.5 py-1 rounded text-[10px] uppercase tracking-widest transition-colors">Release</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-100/50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-5 overflow-y-auto custom-scrollbar flex flex-col gap-4">
            {!sel ? (
              <div className="text-slate-400 text-sm font-bold uppercase tracking-widest m-auto text-center">Select a player to see attributes and development</div>
            ) : (
              <>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-2xl font-black italic uppercase text-slate-900 dark:text-white leading-tight">{sel.name}</div>
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">{sel.position} • {sel.age} years • value {formatCurrencyShort(sel.value)}</div>
                    <div className="mt-1"><Estrelas n={estrelasDoJogador(sel)} /> <span className="text-[11px] text-slate-400 font-bold uppercase">estimate</span></div>
                    <div className="mt-1 text-[11px] font-black uppercase tracking-widest text-slate-400">PlayStyle: <EstiloDoJovem p={sel} completo /></div>
                  </div>
                  <div className="text-right"><div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Overall</div><div className="text-5xl font-black italic text-blue-500">{sel.skill}</div></div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(['tec', 'tac', 'men', 'fis'] as const).map(k => {
                    const a3 = atributos3d(sel);
                    const cr = sel.lastGrowth ? (k === 'tec' ? (sel.lastGrowth.drb || 0) + (sel.lastGrowth.sht || 0) + (sel.lastGrowth.pas || 0) : k === 'tac' ? (sel.lastGrowth.def || 0) : 0) : 0;
                    return (
                    <div key={k} className="bg-slate-200/50 dark:bg-slate-950/50 rounded-lg p-2 text-center border border-slate-200 dark:border-slate-800">
                      <div className="text-[10px] font-black uppercase text-slate-400">{k.toUpperCase()}</div>
                      <div className="text-xl font-black text-slate-800 dark:text-white">{a3[k]}</div>
                      {cr !== 0 && <div className={`text-[11px] font-black ${cr > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{cr > 0 ? '▲' : '▼'} {Math.abs(cr)}</div>}
                    </div>
                    );
                  })}
                </div>
                <ContractPanel player={sel} />
                <div>
                  <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Monthly development</div>
                  {(base.relatorios[sel.id] || []).length === 0 ? <div className="text-xs text-slate-400">No monthly update yet.</div> : (
                    <div className="flex flex-col gap-1.5">
                      {[...(base.relatorios[sel.id] || [])].reverse().map(r => (
                        <div key={r.mes} className="bg-slate-200/50 dark:bg-slate-950/50 rounded px-3 py-2 border border-slate-200 dark:border-slate-800 text-xs">
                          <div className="flex justify-between font-black uppercase tracking-wider"><span className="text-slate-500">{mesEmTexto(r.mes)}</span><span className="text-slate-700 dark:text-slate-200">OVR {r.ovrAntes} → {r.ovrDepois} <Delta v={r.delta} /></span></div>
                          <div className="mt-1"><Mudancas r={r} /></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => promover(sel)} className="mt-auto bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded text-xs uppercase tracking-widest shadow-lg transition-colors">Promote to first team</button>
                <button onClick={() => dispensar(sel)} className="border border-rose-700 text-rose-400 hover:bg-rose-900/40 font-black py-2.5 rounded text-xs uppercase tracking-widest transition-colors">Release from academy</button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-slate-100/50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-xl min-h-0">
          <div className="px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 dark:border-slate-800">
            {temRelatorio ? `Development report — ${mesEmTexto(mesDoRelatorio)}` : 'No monthly report yet: the first one is generated when the month changes.'}
          </div>
          {movimentos.length > 0 && (
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-1">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Promotions and releases</div>
              {movimentos.map(m => (
                <div key={m.playerId + m.mes + m.tipo} className="flex items-center gap-3 text-xs">
                  <span className="w-16 text-slate-400 font-bold">{mesEmTexto(m.mes)}</span>
                  <span className={`w-20 font-black uppercase tracking-widest ${m.tipo === 'PROMOVIDO' ? 'text-emerald-500' : 'text-rose-500'}`}>{m.tipo === 'PROMOVIDO' ? 'Promoted' : 'Released'}</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{m.nome}</span>
                  <span className="text-slate-400">{m.posicao} • {m.idade} • OVR {m.ovr}</span>
                </div>
              ))}
            </div>
          )}
          {temRelatorio && (
            <div className="overflow-y-auto custom-scrollbar flex-1">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead className="bg-slate-200/40 dark:bg-slate-950/60 sticky top-0 z-10">
                  <tr><th className={cab}>Name</th><th className={`${cab} text-center`}>Age</th><th className={cab}>Pos</th><th className={`${cab} text-center`}>OVR</th><th className={`${cab} text-center`}>Change</th><th className={cab}>Potential</th><th className={cab}>Attributes</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30">
                  {jovens.map(p => {
                    const r = ultimo(p);
                    return (
                      <tr key={p.id} onClick={() => { setSelId(p.id); setAba('LISTA'); }} className="cursor-pointer hover:bg-blue-50/50 dark:hover:bg-white/5">
                        <td className="px-3 py-2 font-bold text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap">{p.name}</td>
                        <td className="px-3 py-2 text-center text-sm text-slate-500">{p.age}</td>
                        <td className="px-3 py-2 text-xs font-black text-slate-500">{p.position}</td>
                        <td className="px-3 py-2 text-center text-sm font-black text-slate-700 dark:text-slate-200">{r ? `${r.ovrAntes} → ${r.ovrDepois}` : p.skill}</td>
                        <td className="px-3 py-2 text-center text-sm">{r ? <Delta v={r.delta} /> : '-'}</td>
                        <td className="px-3 py-2"><Estrelas n={estrelasDoJogador(p)} /></td>
                        <td className="px-3 py-2 text-xs"><Mudancas r={r} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {promovendo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setPromovendo(null)}>
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <div className={`text-[10px] font-black uppercase tracking-widest ${modo === 'PROMOVER' ? 'text-emerald-400' : 'text-rose-400'}`}>{modo === 'PROMOVER' ? 'Promote to first team' : 'Release from academy'}</div>
            <div className="flex items-center gap-4">
              <div className="text-5xl font-black italic text-blue-400">{promovendo.skill}</div>
              <div className="min-w-0">
                <div className="text-lg font-black text-white truncate">{promovendo.name}</div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{promovendo.position} • {promovendo.age} years</div>
                <div className="mt-1"><Estrelas n={estrelasDoJogador(promovendo)} /></div>
              </div>
            </div>
            <div className="text-xs text-slate-300 leading-relaxed">
              {modo === 'PROMOVER'
                ? <>The player joins the first team squad ({tamanhoElenco}/33) and the academy spot is refilled by a new youth player.</>
                : <>{promovendo.name} leaves the club for good. The academy spot stays empty until the next monthly update, when a new youth player arrives. This cannot be undone.</>}
            </div>
            {erroPromo && <div className="text-xs font-bold text-rose-400 bg-rose-900/20 border border-rose-800 rounded px-3 py-2">{erroPromo}</div>}
            <div className="flex gap-3">
              <button onClick={() => setPromovendo(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-black py-2.5 rounded text-xs uppercase tracking-widest">Cancel</button>
              <button onClick={confirmarPromocao} disabled={modo === 'PROMOVER' && tamanhoElenco >= 33} className={`flex-1 ${modo === 'PROMOVER' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'} disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-2.5 rounded text-xs uppercase tracking-widest`}>{modo === 'PROMOVER' ? 'Promote' : 'Release'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YouthView;
