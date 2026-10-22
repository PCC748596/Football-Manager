import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '../context/GameContext';
import { CategoriaInbox, MensagemInbox } from '../textSim/inbox';

const CATEGORIAS: Record<CategoriaInbox, { icone: string; en: string; pt: string; cor: string }> = {
  WELCOME: { icone: '👋', en: 'Welcome', pt: 'Boas-vindas', cor: 'text-sky-400' },
  BOARD: { icone: '🏛️', en: 'Board', pt: 'Diretoria', cor: 'text-sky-400' },
  TRAINING: { icone: '🏋️', en: 'Training', pt: 'Treino', cor: 'text-emerald-400' },
  MATCH: { icone: '⚽', en: 'Matches', pt: 'Jogos', cor: 'text-blue-400' },
  SCOUTING: { icone: '🔭', en: 'Scouting', pt: 'Olheiros', cor: 'text-violet-400' },
  FINANCE: { icone: '💰', en: 'Finance', pt: 'Finanças', cor: 'text-amber-400' },
  TRANSFER: { icone: '🔄', en: 'Transfers', pt: 'Negociações', cor: 'text-pink-400' },
  CONTRACT: { icone: '📝', en: 'Contracts', pt: 'Contratos', cor: 'text-rose-400' },
  SQUAD: { icone: '👥', en: 'Squad', pt: 'Elenco', cor: 'text-teal-400' }
};
const ABA_ROTULO: Record<string, { en: string; pt: string }> = {
  DASHBOARD: { en: 'Home', pt: 'Início' }, SQUAD: { en: 'Squad', pt: 'Elenco' }, LEAGUE: { en: 'Standings', pt: 'Tabela' }, FINANCES: { en: 'Finance', pt: 'Finanças' },
  STATISTICS: { en: 'Statistics', pt: 'Estatísticas' }, TACTICS: { en: 'Tactics', pt: 'Tática' }, FIXTURES: { en: 'Fixtures', pt: 'Jogos' }, TRAINING_VIEW: { en: 'Training', pt: 'Treino' }, WORLD: { en: 'World', pt: 'Mundo' }
};

const dataCurta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

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

  const rotuloCat = (c: CategoriaInbox) => (pt ? CATEGORIAS[c].pt : CATEGORIAS[c].en);
  const contagem = (c: CategoriaInbox) => inbox.filter(m => m.categoria === c && !m.lida).length;

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in min-h-0">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tight italic leading-none">
            <span className="text-slate-900 dark:text-white">IN</span><span className="text-blue-500">BOX</span>
          </h2>
          <p className="text-slate-400 dark:text-slate-500 font-bold text-[11px] uppercase tracking-widest mt-2 opacity-70">
            {pt ? `${naoLidas} não lida(s) • ${inbox.length} mensagem(ns)` : `${naoLidas} unread • ${inbox.length} message(s)`}
          </p>
        </div>
        <button onClick={markAllInboxRead} disabled={!naoLidas}
          className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-600 dark:text-slate-300 font-black px-5 py-2.5 rounded text-xs uppercase tracking-widest border border-slate-200 dark:border-slate-700 transition-colors">
          {pt ? 'Marcar todas como lidas' : 'Mark all as read'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {([['ALL', pt ? 'Todas' : 'All', 0], ['UNREAD', pt ? 'Não lidas' : 'Unread', naoLidas]] as const).map(([id, rotulo, n]) => (
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
          {lista.length === 0 && <div className="p-8 text-center text-slate-400 text-sm font-bold uppercase tracking-widest">{pt ? 'Nenhuma mensagem' : 'No messages'}</div>}
          {lista.map(m => (
            <button key={m.id} onClick={() => setSelId(m.id)}
              className={`w-full text-left px-4 py-3 border-b border-slate-200 dark:border-slate-800/60 flex gap-3 items-start transition-colors ${selId === m.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}>
              <div className="text-xl leading-none mt-0.5">{CATEGORIAS[m.categoria].icone}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {!m.lida && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                  <span className={`text-sm truncate ${m.lida ? 'font-semibold text-slate-500 dark:text-slate-400' : 'font-black text-slate-900 dark:text-white'}`}>{m.assunto}</span>
                  {m.alta && <span className="text-[10px] font-black uppercase bg-rose-500/15 text-rose-500 border border-rose-500/30 px-1.5 rounded shrink-0">!</span>}
                </div>
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-0.5"><span className="truncate">{m.de}</span><span className="shrink-0 ml-2">{dataCurta(m.date)}</span></div>
              </div>
            </button>
          ))}
        </div>

        <div className="bg-slate-100/50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 overflow-y-auto custom-scrollbar flex flex-col">
          {!sel ? <div className="m-auto text-slate-400 text-sm font-bold uppercase tracking-widest">{pt ? 'Selecione uma mensagem' : 'Select a message'}</div> : (
            <>
              <div className={`text-xs font-black uppercase tracking-widest ${CATEGORIAS[sel.categoria].cor}`}>{CATEGORIAS[sel.categoria].icone} {rotuloCat(sel.categoria)}</div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mt-1">{sel.assunto}</h3>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-2 pb-4 border-b border-slate-200 dark:border-slate-800">
                {pt ? 'De' : 'From'}: {sel.de} • {dataCurta(sel.date)}
              </div>
              <div className="mt-4 text-base leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-line">{sel.corpo}</div>
              <div className="mt-auto pt-6 flex gap-3">
                {sel.ir && (
                  <button onClick={() => setView(sel.ir)} className="bg-blue-600 hover:bg-blue-500 text-white font-black px-5 py-2.5 rounded text-xs uppercase tracking-widest transition-colors">
                    {pt ? 'Abrir' : 'Open'} {ABA_ROTULO[sel.ir] ? (pt ? ABA_ROTULO[sel.ir].pt : ABA_ROTULO[sel.ir].en) : ''}
                  </button>
                )}
                <button onClick={() => { const i = lista.findIndex(m => m.id === sel.id); deleteInbox([sel.id]); setSelId(lista[i + 1]?.id || lista[i - 1]?.id || null); }}
                  className="bg-slate-200 dark:bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-600 dark:text-slate-300 font-black px-5 py-2.5 rounded text-xs uppercase tracking-widest transition-colors">{pt ? 'Excluir' : 'Delete'}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InboxView;
