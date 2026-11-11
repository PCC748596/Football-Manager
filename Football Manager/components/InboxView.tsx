import { tx } from '../textSim/idiomas';
import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '../context/GameContext';
import { CategoriaInbox, MensagemInbox } from '../textSim/inbox';

// Icones de linha (SVG, herdam a cor do texto; o mesmo padrao dos icones de treino): um por categoria.
const ic = (forma: React.ReactNode) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="inline-block w-[1em] h-[1em] align-[-0.125em]" aria-hidden="true">{forma}</svg>;
const ICONES: Record<CategoriaInbox, React.ReactNode> = {
  WELCOME: ic(<><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2.5 4 2.5S16 14 16 14" /><path d="M9 9.5h.01M15 9.5h.01" /></>),
  BOARD: ic(<><path d="M3 10l9-6 9 6" /><path d="M5 10v9M9.7 10v9M14.3 10v9M19 10v9" /><path d="M3 21h18" /></>),
  TRAINING: ic(<><path d="M6.5 6.5v11M17.5 6.5v11" /><path d="M3 9v6M21 9v6" /><path d="M6.5 12h11" /></>),
  MATCH: ic(<><circle cx="12" cy="12" r="9" /><path d="M12 8l3.5 2.5-1.3 4h-4.4l-1.3-4z" /><path d="M12 8V3M15.5 10.5l4.7-1.5M14.2 14.5l3 4M9.8 14.5l-3 4M8.5 10.5L3.8 9" /></>),
  SCOUTING: ic(<><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></>),
  FINANCE: ic(<><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.8" /><path d="M6.5 12h.01M17.5 12h.01" /></>),
  TRANSFER: ic(<><path d="M4 8h14" /><path d="M14 4l4 4-4 4" /><path d="M20 16H6" /><path d="M10 12l-4 4 4 4" /></>),
  CONTRACT: ic(<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" /></>),
  SQUAD: ic(<><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" /><circle cx="17" cy="9" r="2.4" /><path d="M16 15.2c3 0 5 1.8 5 4.8" /></>)
};

const CATEGORIAS: Record<CategoriaInbox, { icone: React.ReactNode; en: string; pt: string; cor: string }> = {
  WELCOME: { icone: ICONES.WELCOME, en: 'Welcome', pt: 'Boas-vindas', cor: 'text-sky-400' },
  BOARD: { icone: ICONES.BOARD, en: 'Board', pt: 'Diretoria', cor: 'text-sky-400' },
  TRAINING: { icone: ICONES.TRAINING, en: 'Training', pt: 'Treino', cor: 'text-emerald-400' },
  MATCH: { icone: ICONES.MATCH, en: 'Matches', pt: 'Jogos', cor: 'text-blue-400' },
  SCOUTING: { icone: ICONES.SCOUTING, en: 'Scouting', pt: 'Olheiros', cor: 'text-violet-400' },
  FINANCE: { icone: ICONES.FINANCE, en: 'Finance', pt: 'Finanças', cor: 'text-amber-400' },
  TRANSFER: { icone: ICONES.TRANSFER, en: 'Transfers', pt: 'Negociações', cor: 'text-pink-400' },
  CONTRACT: { icone: ICONES.CONTRACT, en: 'Contracts', pt: 'Contratos', cor: 'text-rose-400' },
  SQUAD: { icone: ICONES.SQUAD, en: 'Squad', pt: 'Elenco', cor: 'text-teal-400' }
};
const ABA_ROTULO: Record<string, { en: string; pt: string }> = {
  DASHBOARD: { en: 'Home', pt: 'Início' }, SQUAD: { en: 'Squad', pt: 'Elenco' }, LEAGUE: { en: 'Standings', pt: 'Tabela' }, FINANCES: { en: 'Finance', pt: 'Finanças' },
  STATISTICS: { en: 'Statistics', pt: 'Estatísticas' }, TACTICS: { en: 'Tactics', pt: 'Tática' }, FIXTURES: { en: 'Fixtures', pt: 'Jogos' }, TRAINING_VIEW: { en: 'Training', pt: 'Treino' }, WORLD: { en: 'World', pt: 'Mundo' }
};

// Mensagens de lesao (chave `injury|...`) levam a cruz medica no lugar do icone da categoria.
const ICONE_LESAO = ic(<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" />);
const ehLesao = (m: MensagemInbox) => m.keys.some(k => k.startsWith('injury|'));
const iconeDe = (m: MensagemInbox) => (ehLesao(m) ? ICONE_LESAO : CATEGORIAS[m.categoria].icone);
const corDe = (m: MensagemInbox) => (ehLesao(m) ? 'text-rose-500' : CATEGORIAS[m.categoria].cor);

const dataCurta =(iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

// A renovacao de contratos fica nas Financas: as mensagens de contrato ja gravadas num save (com destino Squad) tambem levam para la.
const destinoDe = (m: MensagemInbox) => (m.categoria === 'CONTRACT' && m.ir === 'SQUAD') ? 'FINANCES' : m.ir;

interface Props { setView: (v: any) => void; }

const InboxView: React.FC<Props> = ({ setView }) => {
  const { inbox, markInboxRead, markAllInboxRead, deleteInbox, gameState } = useGame();
  const pt = gameState.language === 'PT';
  const [filtro, setFiltro] = useState<'ALL' | 'UNREAD' | CategoriaInbox>('ALL');
  const [selId, setSelId] = useState<string | null>(null);

  const naoLidas = inbox.filter(m => !m.lida).length;
  const lista = useMemo(() => inbox.filter(m => (filtro === 'ALL' ? true : filtro === 'UNREAD' ? !m.lida : m.categoria === filtro)), [inbox, filtro]);
  const sel: MensagemInbox | undefined = inbox.find(m => m.id === selId) || undefined;

  // Ao abrir uma mensagem ela passa a lida.
  useEffect(() => { if (sel && !sel.lida) markInboxRead([sel.id]); }, [sel?.id]);
  // Sem selecao, abre a primeira da lista.
  useEffect(() => { if (!selId && lista.length) setSelId(lista[0].id); }, [lista.length]);

  // Apaga uma mensagem (a lixeira ao lado da data): se era a aberta, abre a vizinha.
  const apagar = (id: string) => { const i = lista.findIndex(m => m.id === id); deleteInbox([id]); if (selId === id) setSelId(lista[i + 1]?.id || lista[i - 1]?.id || null); };

  const rotuloCat = (c: CategoriaInbox) => (tx(CATEGORIAS[c].en));
  const contagem = (c: CategoriaInbox) => inbox.filter(m => m.categoria === c && !m.lida).length;

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in min-h-0">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tight italic leading-none">
            <span className="text-slate-900 dark:text-white">IN</span><span className="text-blue-500">BOX</span>
          </h2>
          <p className="text-slate-400 dark:text-slate-500 font-bold text-[11px] uppercase tracking-widest mt-2 opacity-70">
            {tx('{v0} unread • {v1} message(s)', { v0: naoLidas, v1: inbox.length })}
          </p>
        </div>
        <button onClick={markAllInboxRead} disabled={!naoLidas}
          className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-600 dark:text-slate-300 font-black px-5 py-2.5 rounded text-xs uppercase tracking-widest border border-slate-200 dark:border-slate-700 transition-colors">
          {tx('Mark all as read')}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {([['ALL', tx('All'), 0], ['UNREAD', tx('Unread'), naoLidas]] as const).map(([id, rotulo, n]) => (
          <button key={id} onClick={() => setFiltro(id)} className={`px-3 py-1.5 rounded text-xs font-black uppercase tracking-widest transition-colors ${filtro === id ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}>{rotulo}{n ? ` (${n})` : ''}</button>
        ))}
        {(Object.keys(CATEGORIAS) as CategoriaInbox[]).filter(c => c !== 'WELCOME').map(c => (
          <button key={c} onClick={() => setFiltro(c)} className={`px-3 py-1.5 rounded text-xs font-black uppercase tracking-widest transition-colors ${filtro === c ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}>
            {CATEGORIAS[c].icone} {rotuloCat(c)}{contagem(c) ? ` (${contagem(c)})` : ''}
          </button>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(320px,2fr)_3fr] gap-6 min-h-0">
        <div className="bg-slate-100/50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 overflow-y-auto custom-scrollbar shadow-xl">
          {lista.length === 0 && <div className="p-8 text-center text-slate-400 text-sm font-bold uppercase tracking-widest">{tx('No messages')}</div>}
          {lista.map(m => (
            <div key={m.id} role="button" tabIndex={0} onClick={() => setSelId(m.id)} onKeyDown={e => { if (e.key === 'Enter') setSelId(m.id); }}
              className={`group w-full text-left px-4 py-3 border-b border-slate-200 dark:border-slate-800/60 border-l-4 flex gap-3 items-start transition-colors cursor-pointer ${m.lida ? 'border-l-transparent opacity-60 hover:opacity-100' : 'border-l-blue-500 bg-blue-500/10'} ${selId === m.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}>
              <div className={`text-2xl leading-none mt-0.5 ${m.lida ? 'text-slate-500' : corDe(m)}`}>{iconeDe(m)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {!m.lida && <span className="text-[9px] font-black uppercase tracking-wider bg-blue-500 text-white px-1.5 py-0.5 rounded shrink-0">{tx('New')}</span>}
                  <span className={`text-sm truncate ${m.lida ? 'font-semibold text-slate-500 dark:text-slate-400' : 'font-black text-slate-900 dark:text-white'}`}>{m.assunto}</span>
                  {m.alta && <span className="text-[10px] font-black uppercase bg-rose-500/15 text-rose-500 border border-rose-500/30 px-1.5 rounded shrink-0">!</span>}
                </div>
                <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                  <span className="truncate">{m.de}</span>
                  <span className="shrink-0 ml-2 flex items-center gap-2">
                    {dataCurta(m.date)}
                    <button type="button" title={tx('Delete')} aria-label={tx('Delete message')}
                      onClick={e => { e.stopPropagation(); apagar(m.id); }}
                      className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-rose-600 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                    </button>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-100/50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 overflow-y-auto custom-scrollbar flex flex-col">
          {!sel ? <div className="m-auto text-slate-400 text-sm font-bold uppercase tracking-widest">{tx('Select a message')}</div> : (
            <>
              <div className={`text-xs font-black uppercase tracking-widest ${corDe(sel)}`}>{iconeDe(sel)} {rotuloCat(sel.categoria)}</div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mt-1">{sel.assunto}</h3>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-2 pb-4 border-b border-slate-200 dark:border-slate-800">
                {tx('From')}: {sel.de} • {dataCurta(sel.date)}
              </div>
              <div className="mt-4 text-base leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-line">{sel.corpo}</div>
              <div className="mt-auto pt-6 flex gap-3">
                {sel.ir && (
                  <button onClick={() => setView(destinoDe(sel))} className="bg-blue-600 hover:bg-blue-500 text-white font-black px-5 py-2.5 rounded text-xs uppercase tracking-widest transition-colors">
                    {tx('Open')} {ABA_ROTULO[destinoDe(sel)] ? (tx(ABA_ROTULO[destinoDe(sel)].en)) : ''}
                  </button>
                )}
                <button onClick={() => { const i = lista.findIndex(m => m.id === sel.id); deleteInbox([sel.id]); setSelId(lista[i + 1]?.id || lista[i - 1]?.id || null); }}
                  className="bg-slate-200 dark:bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-600 dark:text-slate-300 font-black px-5 py-2.5 rounded text-xs uppercase tracking-widest transition-colors">{tx('Delete')}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InboxView;
