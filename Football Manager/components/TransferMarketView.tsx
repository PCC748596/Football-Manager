import React, { useEffect, useMemo, useState } from 'react';
import { useGame } from '../context/GameContext';
import { Player, Team } from '../types';
import { TeamShield } from './TeamShield';
import { PlayerFace } from './PlayerFace';
import { estrelasDePotencial } from '../textSim/youth';
import { potencialParaValor, anosRestantes } from '../textSim/valuation';
import { CONFIG_MERCADO, ESTADOS_ATIVOS, NegociacaoTransf, grupoDe, janelaAberta, diasParaFecharJanela } from '../textSim/transferencias';
import { estadoDoContrato } from '../textSim/contracts';

type Aba = 'MARKET' | 'NEGOTIATIONS' | 'MY_PLAYERS' | 'FINANCES';
interface Linha { p: Player; origem: 'ELENCO' | 'BASE' | 'LIVRE'; clube?: Team; estrelas: number; meses: number; }
const POR_PAGINA = 40;
const GRUPOS = ['ANY', 'GK', 'DEF', 'MID', 'ATT'] as const;
const GRUPO_ROTULO: Record<string, string> = { ANY: 'Any', GK: 'Goalkeeper', DEF: 'Defender', MID: 'Midfielder', ATT: 'Forward' };
const VALORES = [['1M', 1e6], ['3M', 3e6], ['5M', 5e6], ['10M', 1e7], ['Any', Infinity]] as const;
const ESTADO_COR: Record<string, string> = {
  ENVIADA: 'bg-sky-500/15 text-sky-400 border-sky-500/40', RECEBIDA: 'bg-amber-500/15 text-amber-400 border-amber-500/40', CONTRAPROPOSTA: 'bg-violet-500/15 text-violet-400 border-violet-500/40',
  ACEITA: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40', CONCLUIDA: 'bg-emerald-600 text-white border-emerald-700', RECUSADA: 'bg-rose-500/15 text-rose-400 border-rose-500/40',
  RETIRADA: 'bg-slate-500/15 text-slate-400 border-slate-500/40', EXPIRADA: 'bg-slate-500/15 text-slate-400 border-slate-500/40'
};
const ESTADO_ROTULO: Record<string, string> = {
  ENVIADA: 'Offer sent', RECEBIDA: 'Offer received', CONTRAPROPOSTA: 'Counter-offer', ACEITA: 'Accepted', CONCLUIDA: 'Completed', RECUSADA: 'Refused', RETIRADA: 'Withdrawn', EXPIRADA: 'Expired'
};
const dataCurta = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '-');

const Estrelas: React.FC<{ n: number }> = ({ n }) => (
  <span className="whitespace-nowrap text-sm tracking-tighter" title="Estimated potential">{Array.from({ length: 5 }, (_, i) => <span key={i} className={i < n ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-700'}>★</span>)}</span>
);

const TransferMarketView: React.FC<{ setView: (v: any) => void }> = ({ setView }) => {
  const { players, base, teams, userTeam, gameState, mercado, proporCompraMercado, responderNegociacao, retirarProposta, tentarConcluir, contratarLivre, listarParaVenda, formatCurrency, formatCurrencyShort } = useGame();
  const hoje = gameState.currentDate;
  const [aba, setAba] = useState<Aba>('MARKET');
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  // filtros
  const [nome, setNome] = useState('');
  const [grupo, setGrupo] = useState<typeof GRUPOS[number]>('ANY');
  const [idadeMin, setIdadeMin] = useState(15), [idadeMax, setIdadeMax] = useState(42);
  const [ovrMin, setOvrMin] = useState(0), [ovrMax, setOvrMax] = useState(99);
  const [valorMax, setValorMax] = useState<number>(Infinity);
  const [clubeId, setClubeId] = useState('');
  const [soLivres, setSoLivres] = useState(false), [soListados, setSoListados] = useState(false), [soContrato, setSoContrato] = useState(false), [soBase, setSoBase] = useState(false), [soShortlist, setSoShortlist] = useState(false);
  // Os filtros so valem ao carregar em APPLY FILTERS (ou Enter): os campos acima sao o rascunho.
  const rascunho = { nome, grupo, idadeMin, idadeMax, ovrMin, ovrMax, valorMax, clubeId, soLivres, soListados, soContrato, soBase, soShortlist };
  const [filtros, setFiltros] = useState(rascunho);
  const aplicar = () => setFiltros(rascunho);
  const limpar = () => { setNome(''); setGrupo('ANY'); setIdadeMin(15); setIdadeMax(42); setOvrMin(0); setOvrMax(99); setValorMax(Infinity); setClubeId(''); setSoLivres(false); setSoListados(false); setSoContrato(false); setSoBase(false); setSoShortlist(false);
    setFiltros({ nome: '', grupo: 'ANY', idadeMin: 15, idadeMax: 42, ovrMin: 0, ovrMax: 99, valorMax: Infinity, clubeId: '', soLivres: false, soListados: false, soContrato: false, soBase: false, soShortlist: false }); };
  // A lista de interesse (shortlist): guardada no navegador (so uma conveniencia de quem joga).
  const [shortlist, setShortlist] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('fm_shortlist') || '[]'); } catch { return []; } });
  const alternarShortlist = (id: string) => setShortlist(l => { const n = l.includes(id) ? l.filter(x => x !== id) : [...l, id]; try { localStorage.setItem('fm_shortlist', JSON.stringify(n)); } catch { /* sem armazenamento */ } return n; });
  const [ordem, setOrdem] = useState<{ k: 'name' | 'age' | 'ovr' | 'pot' | 'value' | 'wage'; dir: 1 | -1 }>({ k: 'ovr', dir: -1 });
  const [pagina, setPagina] = useState(0);
  const [selId, setSelId] = useState<string | null>(null);
  const [ofertando, setOfertando] = useState<Linha | null>(null);
  const [valorOferta, setValorOferta] = useState(0);
  const abrirOferta = (l: Linha) => { setValorOferta(Math.round(l.p.value / 1000) * 1000); setOfertando(l); };

  const porId = useMemo(() => new Map(teams.map(t => [t.id, t])), [teams]);
  const meuId = userTeam?.id || '';

  // As linhas do mercado: todos os jogadores de OUTROS clubes, os do Sub-20 com a idade minima e os agentes livres. Sem copias: aponta para os mesmos objetos.
  const linhas = useMemo<Linha[]>(() => {
    const out: Linha[] = [];
    const idadeBase = CONFIG_MERCADO.idadeMinimaBase;
    for (const p of players) {
      if (p.teamId === meuId) continue;
      const origem = p.teamId === 'MARKET' ? 'LIVRE' : 'ELENCO';
      out.push({ p, origem, clube: origem === 'LIVRE' ? undefined : porId.get(p.teamId), estrelas: estrelasDePotencial(p.potentialEstimate ?? potencialParaValor(p)), meses: p.contract ? Math.round(anosRestantes(p, hoje) * 12) : 0 });
    }
    if (base) for (const p of base.jogadores) {
      if (p.teamId === meuId || p.age < idadeBase) continue;
      out.push({ p, origem: 'BASE', clube: porId.get(p.teamId), estrelas: estrelasDePotencial(p.potentialEstimate ?? potencialParaValor(p)), meses: p.contract ? Math.round(anosRestantes(p, hoje) * 12) : 0 });
    }
    return out;
  }, [players, base, porId, meuId, hoje.slice(0, 7)]);

  const filtradas = useMemo(() => {
    const F = filtros, q = F.nome.trim().toLowerCase();
    const f = linhas.filter(l => {
      const p = l.p;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (F.grupo !== 'ANY' && grupoDe(p.position) !== F.grupo) return false;
      if (p.age < F.idadeMin || p.age > F.idadeMax) return false;
      if (p.skill < F.ovrMin || p.skill > F.ovrMax) return false;
      if (l.origem !== 'LIVRE' && p.value > F.valorMax) return false;
      if (F.clubeId && p.teamId !== F.clubeId) return false;
      if (F.soLivres && l.origem !== 'LIVRE') return false;
      if (F.soListados && !p.listedForSale) return false;
      if (F.soBase && l.origem !== 'BASE') return false;
      if (F.soContrato && !(l.origem !== 'LIVRE' && l.meses <= 12)) return false;
      if (F.soShortlist && !shortlist.includes(p.id)) return false;
      return true;
    });
    const val = (l: Linha): number | string => ordem.k === 'name' ? l.p.name : ordem.k === 'age' ? l.p.age : ordem.k === 'ovr' ? l.p.skill : ordem.k === 'pot' ? (l.p.potentialEstimate ?? potencialParaValor(l.p)) : ordem.k === 'wage' ? l.p.salary : l.p.value;
    return f.sort((a, b) => {
      const x = val(a), y = val(b);
      const c = typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number);
      return (c * ordem.dir) || (b.p.skill - a.p.skill);
    });
  }, [linhas, filtros, ordem, shortlist]);
  useEffect(() => { setPagina(0); }, [filtros, ordem]);

  if (!userTeam) return null;
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const visiveis = filtradas.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);
  const sel = linhas.find(l => l.p.id === selId) || null;
  const janela = janelaAberta(hoje, userTeam.country);
  const fecha = diasParaFecharJanela(hoje, userTeam.country);
  const negociacoesMinhas = mercado.negociacoes.filter(n => n.compradorId === meuId || n.vendedorId === meuId);
  const precisaResposta = (n: NegociacaoTransf) => (n.vendedorId === meuId && n.estado === 'RECEBIDA') || (n.compradorId === meuId && n.estado === 'CONTRAPROPOSTA');
  const pendentes = negociacoesMinhas.filter(precisaResposta).length;
  const negDe = (id: string) => mercado.negociacoes.find(n => n.compradorId === meuId && n.playerId === id && ESTADOS_ATIVOS.includes(n.estado));
  const nomeClube = (id: string) => (id === 'MARKET' ? 'Free agent' : porId.get(id)?.name || id);
  const nomeJogador = (id: string) => linhas.find(l => l.p.id === id)?.p.name || players.find(p => p.id === id)?.name || base?.jogadores.find(p => p.id === id)?.name || id;
  const mostrar = (r: { ok: boolean; motivo?: string }, sucesso: string) => setAviso(r.ok ? { tipo: 'ok', texto: sucesso + (r.motivo ? ` (${r.motivo})` : '') } : { tipo: 'erro', texto: r.motivo || 'Operation not allowed' });

  const cab = (k: typeof ordem.k, rotulo: string, cls = '') => (
    <th className={`px-3 py-2 text-[11px] font-black uppercase tracking-widest text-slate-400 cursor-pointer select-none hover:text-blue-500 whitespace-nowrap ${cls}`} onClick={() => setOrdem(o => (o.k === k ? { k, dir: (o.dir * -1) as 1 | -1 } : { k, dir: k === 'name' ? 1 : -1 }))}>
      {rotulo}{ordem.k === k && <span className="ml-1 text-blue-500">{ordem.dir === 1 ? '▲' : '▼'}</span>}
    </th>
  );
  const campo = 'w-full bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500';
  const rotulo = 'text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1 block';
  const chip = (ativo: boolean) => `px-2.5 py-1.5 rounded text-[11px] font-black uppercase tracking-wider transition-colors ${ativo ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`;
  const botaoStatus = (ativo: boolean) => `w-full px-3 py-2 rounded text-xs font-black uppercase tracking-wider text-left transition-colors ${ativo ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`;

  // ------------------------------------------------------------------ lista + filtros + overview
  const COLS = 'grid-cols-[minmax(190px,2.2fr)_46px_52px_56px_92px_minmax(120px,1.6fr)_84px_84px]';
  const cabGrid = (k: typeof ordem.k | null, r: string, cls = '') => (
    <div className={`text-[11px] font-black uppercase tracking-widest text-slate-400 ${k ? 'cursor-pointer select-none hover:text-blue-500' : ''} ${cls}`}
      onClick={() => k && setOrdem(o => (o.k === k ? { k, dir: (o.dir * -1) as 1 | -1 } : { k, dir: k === 'name' ? 1 : -1 }))}>
      {r}{k && ordem.k === k && <span className="ml-1 text-blue-500">{ordem.dir === 1 ? '▲' : '▼'}</span>}
    </div>
  );
  const Donut: React.FC<{ p: Player }> = ({ p }) => {
    const cores = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b'], vals = [p.def, p.pas, p.drb, p.sht], soma = vals.reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    const fatias = vals.map((v, i) => { const ini = acc; acc += (v / soma) * 100; return `${cores[i]} ${ini}% ${acc}%`; }).join(', ');
    return <div className="w-24 h-24 rounded-full shrink-0 relative" style={{ background: `conic-gradient(${fatias})` }}><div className="absolute inset-[26%] rounded-full bg-[#0c1426]" /></div>;
  };
  const NOME_ATTR: Record<string, string> = { def: 'Defending', pas: 'Passing', drb: 'Dribbling', sht: 'Shooting' };

  const mercadoAba = (
    <div className="flex-1 grid grid-cols-1 xl:grid-cols-[250px_1fr_300px] gap-5 min-h-0">
      {/* FILTROS */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-[#0b1324] p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4" onKeyDown={e => { if (e.key === 'Enter') aplicar(); }}>
        <div className="text-[12px] font-black uppercase tracking-widest text-slate-500">Search filters</div>
        <div><label className={rotulo}>Player name</label><input className={campo} value={nome} onChange={e => setNome(e.target.value)} placeholder="Search by name" /></div>
        <div><label className={rotulo}>Position</label>
          <div className="rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/70 overflow-hidden">
            {GRUPOS.map(g => <button key={g} onClick={() => setGrupo(g)} className={`w-full text-left px-3 py-1.5 text-xs font-black uppercase tracking-wider ${grupo === g ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'}`}>{GRUPO_ROTULO[g]}</button>)}
          </div>
        </div>
        <div><label className={rotulo}>Age</label><div className="flex gap-2 items-center"><input type="number" className={campo} value={idadeMin} min={15} max={45} onChange={e => setIdadeMin(Number(e.target.value) || 15)} /><span className="text-slate-400">–</span><input type="number" className={campo} value={idadeMax} min={15} max={45} onChange={e => setIdadeMax(Number(e.target.value) || 45)} /></div></div>
        <div><label className={rotulo}>Overall</label><div className="flex gap-2 items-center"><input type="number" className={campo} value={ovrMin} min={0} max={99} onChange={e => setOvrMin(Number(e.target.value) || 0)} /><span className="text-slate-400">–</span><input type="number" className={campo} value={ovrMax} min={0} max={99} onChange={e => setOvrMax(Number(e.target.value) || 99)} /></div></div>
        <div><label className={rotulo}>Value (max)</label><div className="flex flex-wrap gap-1.5">{VALORES.map(([r, v]) => <button key={r} onClick={() => setValorMax(v)} className={chip(valorMax === v)}>{r}</button>)}</div></div>
        <div><label className={rotulo}>Club</label>
          <select className={campo} value={clubeId} onChange={e => setClubeId(e.target.value)}>
            <option value="">All clubs</option>
            {[...teams].filter(t => t.id !== meuId).sort((a, b) => a.name.localeCompare(b.name)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5"><label className={rotulo}>Status</label>
          <button onClick={() => setSoListados(v => !v)} className={botaoStatus(soListados)}>Transfer listed</button>
          <button onClick={() => setSoLivres(v => !v)} className={botaoStatus(soLivres)}>Free agents</button>
          <button onClick={() => setSoContrato(v => !v)} className={botaoStatus(soContrato)}>Contract ≤ 12 months</button>
          <button onClick={() => setSoBase(v => !v)} className={botaoStatus(soBase)}>Sub-20 (18+)</button>
          <button onClick={() => setSoShortlist(v => !v)} className={botaoStatus(soShortlist)}>Shortlist ({shortlist.length})</button>
        </div>
        <div className="mt-auto flex flex-col gap-2">
          <button onClick={aplicar} className="bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded text-xs uppercase tracking-widest shadow-lg">Apply filters</button>
          <button onClick={limpar} className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black py-3 rounded text-xs uppercase tracking-widest">Reset</button>
        </div>
      </div>

      {/* LISTA */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-[#0b1324] flex flex-col min-h-0 p-5">
        <div className="flex justify-between items-center mb-3">
          <div className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Players available <span className="text-sm font-bold text-slate-400 tracking-normal">({filtradas.length})</span></div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
            <button disabled={pagina === 0} onClick={() => setPagina(p => p - 1)} className="px-3 py-1.5 rounded bg-slate-200 dark:bg-slate-800 disabled:opacity-30">‹</button>
            <span>{pagina + 1} / {totalPaginas}</span>
            <button disabled={pagina >= totalPaginas - 1} onClick={() => setPagina(p => p + 1)} className="px-3 py-1.5 rounded bg-slate-200 dark:bg-slate-800 disabled:opacity-30">›</button>
          </div>
        </div>
        <div className={`grid ${COLS} gap-3 px-4 pb-2 items-center`}>
          {cabGrid('name', 'Name')}{cabGrid('age', 'Age', 'text-center')}{cabGrid(null, 'Pos', 'text-center')}{cabGrid('ovr', 'OVR', 'text-center')}{cabGrid('pot', 'Potential')}{cabGrid(null, 'Club')}{cabGrid('value', 'Value', 'text-right')}{cabGrid('wage', 'Wage', 'text-right')}
        </div>
        <div className="overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-2 pr-1">
          {visiveis.map(l => {
            const p = l.p, neg = negDe(p.id), ativo = selId === p.id;
            return (
              <div key={p.id} onClick={() => setSelId(p.id)}
                className={`grid ${COLS} gap-3 items-center px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${ativo ? 'border-blue-500 bg-blue-500/10' : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-[#0e182c] hover:border-slate-400 dark:hover:border-slate-600'}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-[50px] h-[50px] rounded-full overflow-hidden bg-slate-800 shrink-0 border border-slate-700"><PlayerFace playerId={p.id} camisa={l.clube?.primaryColor} className="w-full h-full" /></div>
                  <div className="min-w-0"><div className="font-black text-base text-slate-800 dark:text-slate-100 truncate">{p.name}</div>
                    <div className="flex gap-1 flex-wrap">
                      {shortlist.includes(p.id) && <span className="text-[9px] font-black bg-yellow-500 text-slate-900 px-1.5 rounded">★ LIST</span>}
                      {p.listedForSale && <span className="text-[9px] font-black bg-emerald-600 text-white px-1.5 rounded">FOR SALE</span>}
                      {l.origem === 'BASE' && <span className="text-[9px] font-black bg-violet-600 text-white px-1.5 rounded">U20</span>}
                      {l.origem === 'LIVRE' && <span className="text-[9px] font-black bg-sky-600 text-white px-1.5 rounded">FREE</span>}
                      {neg && <span className={`text-[9px] font-black border px-1.5 rounded ${ESTADO_COR[neg.estado]}`}>{ESTADO_ROTULO[neg.estado]}</span>}
                    </div></div>
                </div>
                <div className="text-center text-base text-slate-500 dark:text-slate-300">{p.age}y</div>
                <div className="text-center text-base font-black text-slate-600 dark:text-slate-300">{p.position}</div>
                <div className="text-center"><span className="text-base font-black text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">{p.skill}</span></div>
                <div><Estrelas n={l.estrelas} /></div>
                <div className="flex items-center gap-2 min-w-0 text-base font-bold text-slate-700 dark:text-slate-100">{l.clube ? <><TeamShield team={l.clube} className="w-6 h-8 shrink-0" /><span className="truncate">{l.clube.name}</span></> : <span className="text-slate-400">Free agent</span>}</div>
                <div className="text-right font-mono text-base font-black text-slate-800 dark:text-white">{l.origem === 'LIVRE' ? 'FREE' : formatCurrencyShort(p.value)}</div>
                <div className="text-right font-mono text-base text-slate-500 dark:text-slate-300">{formatCurrencyShort(p.salary)}</div>
              </div>
            );
          })}
          {!visiveis.length && <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-sm">No players match the filters</div>}
        </div>
      </div>

      {/* OVERVIEW */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-[#0b1324] p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3">
        <div className="text-[12px] font-black uppercase tracking-widest text-slate-500">Player overview</div>
        {!sel ? <div className="m-auto text-slate-400 text-sm font-bold uppercase tracking-widest text-center">Select a player</div> : (() => {
          const p = sel.p, neg = negDe(p.id);
          const top = (['def', 'pas', 'drb', 'sht'] as const).slice().sort((a, b) => p[b] - p[a]).slice(0, 3);
          return (
            <>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-[#0e182c] p-3">
                <div className="flex justify-between items-start">
                  <div className="text-2xl font-black uppercase text-slate-900 dark:text-white leading-tight">{p.name}</div>
                  <div className="text-right shrink-0 ml-2"><div className="text-[10px] font-bold uppercase text-slate-400">OVR</div><div className="text-4xl font-black italic text-slate-700 dark:text-slate-200 leading-none">{p.skill}</div></div>
                </div>
                <div className="flex items-center gap-2 mt-2">{sel.clube ? <TeamShield team={sel.clube} className="w-9 h-11" /> : null}<div><div className="text-sm font-black uppercase text-slate-700 dark:text-slate-100">{sel.clube?.name || 'Free agent'}</div><div className="text-xs font-bold uppercase text-slate-500">{p.position} • {p.age} years</div></div></div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                {[['Value', sel.origem === 'LIVRE' ? 'FREE' : formatCurrencyShort(p.value)], ['Wage', formatCurrencyShort(p.salary) + '/w'], ['Contract', p.contract ? p.contract.end.slice(0, 4) : '-'], ['Potential', '★'.repeat(sel.estrelas) + '☆'.repeat(5 - sel.estrelas)]].map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-[#0e182c] p-2"><div className="text-[10px] font-bold uppercase text-slate-400">{k}</div><div className="text-base font-black text-slate-800 dark:text-white">{v}</div></div>
                ))}
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-[#0e182c] p-3 flex items-center gap-3">
                <Donut p={p} />
                <div className="flex-1 rounded border border-slate-700/60 p-2"><div className="text-[10px] font-black uppercase text-slate-400 mb-1">Key attributes</div>
                  {top.map(k => <div key={k} className="flex justify-between text-sm font-bold text-slate-200"><span>{NOME_ATTR[k]}</span><span className="text-blue-400">{p[k]}</span></div>)}
                </div>
              </div>
              {p.playStyle && p.playStyle !== 'None' && <div className="text-xs font-bold text-slate-500">PlayStyle: <span className="text-slate-300">{p.playStyle}</span></div>}
              <div className="mt-auto flex flex-col gap-2">
                {sel.origem === 'LIVRE' ? (
                  <button onClick={() => mostrar(contratarLivre(p.id), `${p.name} signed as a free agent`)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded text-sm uppercase tracking-widest">Sign free agent</button>
                ) : neg ? (
                  <button onClick={() => setAba('NEGOTIATIONS')} className="bg-slate-700 hover:bg-slate-600 text-white font-black py-3.5 rounded text-sm uppercase tracking-widest">{ESTADO_ROTULO[neg.estado]} — open</button>
                ) : (
                  <button onClick={() => abrirOferta(sel)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded text-sm uppercase tracking-widest">Make offer</button>
                )}
                <button onClick={() => alternarShortlist(p.id)} className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black py-3.5 rounded text-sm uppercase tracking-widest">{shortlist.includes(p.id) ? 'Remove from shortlist' : 'Add to shortlist'}</button>
                {!janela && sel.origem !== 'LIVRE' && <div className="text-[11px] text-amber-500 font-bold text-center">Window closed: an accepted offer completes when it opens</div>}
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );

  // ------------------------------------------------------------------ negociacoes
  const [contraValor, setContraValor] = useState<Record<string, string>>({});
  const negCard = (n: NegociacaoTransf) => {
    const compro = n.compradorId === meuId;
    const resp = precisaResposta(n);
    const valorInput = contraValor[n.id] ?? String(n.valor);
    return (
      <div className={`rounded-lg border p-4 ${resp ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40'}`}>
        <div className="flex flex-wrap justify-between gap-2 items-start">
          <div>
            <div className="text-lg font-black text-slate-900 dark:text-white">{nomeJogador(n.playerId)} {n.origem === 'BASE' && <span className="text-[10px] font-black bg-violet-600 text-white px-1.5 rounded align-middle">U20</span>}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{compro ? `Buying from ${nomeClube(n.vendedorId)}` : `${nomeClube(n.compradorId)} wants to buy`} • {formatCurrency(n.valor)} • round {n.rodadas}/{CONFIG_MERCADO.maxRodadas}</div>
          </div>
          <span className={`text-[11px] font-black uppercase border px-2 py-0.5 rounded ${ESTADO_COR[n.estado]}`}>{ESTADO_ROTULO[n.estado]}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          {n.historico.map(h => <span key={h.n}>{h.de === 'COMPRADOR' ? 'Bid' : 'Ask'} <b className="text-slate-700 dark:text-slate-200">{formatCurrencyShort(h.valor)}</b> <span className="opacity-60">({dataCurta(h.data)})</span></span>)}
        </div>
        {n.motivo && !ESTADOS_ATIVOS.includes(n.estado) && <div className="mt-1 text-xs text-slate-400">Reason: {n.motivo}</div>}
        {ESTADOS_ATIVOS.includes(n.estado) && <div className="mt-1 text-[11px] text-slate-400">Expires {dataCurta(n.expira)}{n.respondeEm && n.estado === 'ENVIADA' ? ` • answer expected ${dataCurta(n.respondeEm)}` : ''}</div>}
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          {n.vendedorId === meuId && n.estado === 'RECEBIDA' && <>
            <button onClick={() => mostrar(responderNegociacao(n.id, 'ACEITAR'), 'Offer accepted')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 rounded text-xs uppercase tracking-wider">Accept</button>
            <input type="number" value={valorInput} onChange={e => setContraValor(c => ({ ...c, [n.id]: e.target.value }))} className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-2 text-sm font-bold text-white" />
            <button onClick={() => mostrar(responderNegociacao(n.id, 'CONTRA', Number(valorInput)), 'Counter-offer sent')} className="bg-violet-600 hover:bg-violet-500 text-white font-black px-4 py-2 rounded text-xs uppercase tracking-wider">Counter</button>
            <button onClick={() => mostrar(responderNegociacao(n.id, 'RECUSAR'), 'Offer refused')} className="bg-slate-700 hover:bg-rose-600 text-white font-black px-4 py-2 rounded text-xs uppercase tracking-wider">Refuse</button>
          </>}
          {compro && n.estado === 'CONTRAPROPOSTA' && <>
            <button onClick={() => mostrar(responderNegociacao(n.id, 'ACEITAR'), 'Counter-offer accepted')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 rounded text-xs uppercase tracking-wider">Accept {formatCurrencyShort(n.valor)}</button>
            {n.rodadas < CONFIG_MERCADO.maxRodadas && <>
              <input type="number" value={contraValor[n.id] ?? String(Math.round(n.valor * 0.95))} onChange={e => setContraValor(c => ({ ...c, [n.id]: e.target.value }))} className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-2 text-sm font-bold text-white" />
              <button onClick={() => mostrar(responderNegociacao(n.id, 'NOVA_OFERTA', Number(contraValor[n.id] ?? Math.round(n.valor * 0.95))), 'New offer sent')} className="bg-blue-600 hover:bg-blue-500 text-white font-black px-4 py-2 rounded text-xs uppercase tracking-wider">New offer</button>
            </>}
            <button onClick={() => mostrar(responderNegociacao(n.id, 'RECUSAR'), 'Negotiation closed')} className="bg-slate-700 hover:bg-rose-600 text-white font-black px-4 py-2 rounded text-xs uppercase tracking-wider">Refuse</button>
          </>}
          {compro && n.estado === 'ENVIADA' && <button onClick={() => mostrar(retirarProposta(n.id), 'Offer withdrawn')} className="bg-slate-700 hover:bg-rose-600 text-white font-black px-4 py-2 rounded text-xs uppercase tracking-wider">Withdraw</button>}
          {n.estado === 'ACEITA' && <button onClick={() => mostrar(tentarConcluir(n.id), 'Transfer completed')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 rounded text-xs uppercase tracking-wider">Try to complete</button>}
        </div>
      </div>
    );
  };
  const grupoNeg = (titulo: string, lista: NegociacaoTransf[]) => lista.length ? (
    <div className="flex flex-col gap-3"><div className="text-[11px] font-black uppercase tracking-widest text-slate-500">{titulo} ({lista.length})</div>{lista.map(n => <React.Fragment key={n.id}>{negCard(n)}</React.Fragment>)}</div>
  ) : null;
  const negociacoesAba = (
    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6 pr-2">
      {!negociacoesMinhas.length && <div className="m-auto text-slate-400 text-sm font-bold uppercase tracking-widest">No negotiations yet</div>}
      {grupoNeg('Needs your answer', negociacoesMinhas.filter(precisaResposta))}
      {grupoNeg('Accepted — pending completion', negociacoesMinhas.filter(n => n.estado === 'ACEITA'))}
      {grupoNeg('Waiting for the other club', negociacoesMinhas.filter(n => ESTADOS_ATIVOS.includes(n.estado) && n.estado !== 'ACEITA' && !precisaResposta(n)))}
      {grupoNeg('Closed', negociacoesMinhas.filter(n => !ESTADOS_ATIVOS.includes(n.estado)).slice().reverse().slice(0, 30))}
    </div>
  );

  // ------------------------------------------------------------------ meu elenco a venda
  const meus = useMemo(() => {
    const pros = players.filter(p => p.teamId === meuId).map(p => ({ p, origem: 'ELENCO' as const }));
    const jovens = (base?.jogadores || []).filter(p => p.teamId === meuId && p.age >= CONFIG_MERCADO.idadeMinimaBase).map(p => ({ p, origem: 'BASE' as const }));
    return [...pros, ...jovens].sort((a, b) => b.p.skill - a.p.skill);
  }, [players, base, meuId]);
  const meusAba = (
    <div className="flex-1 bg-slate-100/50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-xl min-h-0">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-widest text-slate-500">List a player for sale to invite offers. Listing does not transfer anyone: you accept, refuse or counter each offer. Sub-20 players aged {CONFIG_MERCADO.idadeMinimaBase}+ can be listed too.</div>
      <div className="overflow-y-auto custom-scrollbar flex-1">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead className="bg-slate-200/40 dark:bg-slate-950/60 sticky top-0"><tr>{['Name', 'Age', 'Pos', 'OVR', 'Value', 'Contract', 'Offers', ''].map(h => <th key={h} className="px-3 py-2 text-[11px] font-black uppercase tracking-widest text-slate-400">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30">
            {meus.map(({ p, origem }) => {
              const ofertas = mercado.negociacoes.filter(n => n.playerId === p.id && n.vendedorId === meuId && ESTADOS_ATIVOS.includes(n.estado)).length;
              return (
                <tr key={p.id}>
                  <td className="px-3 py-2 font-bold text-sm text-slate-800 dark:text-slate-100 whitespace-nowrap">{p.name} {origem === 'BASE' && <span className="text-[10px] font-black bg-violet-600 text-white px-1.5 rounded">U20</span>}</td>
                  <td className="px-3 py-2 text-sm text-slate-500">{p.age}</td>
                  <td className="px-3 py-2 text-xs font-black text-slate-500">{p.position}</td>
                  <td className="px-3 py-2 text-sm font-black text-blue-500">{p.skill}</td>
                  <td className="px-3 py-2 font-mono text-sm text-emerald-500 font-black">{formatCurrencyShort(p.value)}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{dataCurta(p.contract?.end)}</td>
                  <td className="px-3 py-2 text-sm font-black text-amber-500">{ofertas || ''}</td>
                  <td className="px-3 py-2 text-right"><button onClick={() => mostrar(listarParaVenda(p.id, !p.listedForSale), p.listedForSale ? `${p.name} removed from the list` : `${p.name} listed for sale`)}
                    className={`px-3 py-1.5 rounded text-[11px] font-black uppercase tracking-wider transition-colors ${p.listedForSale ? 'bg-emerald-600 text-white hover:bg-rose-600' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-600 hover:text-white'}`}>{p.listedForSale ? 'Listed ✓ (remove)' : 'List for sale'}</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ------------------------------------------------------------------ financas
  const minhasTx = mercado.transacoes.filter(t => t.clubeId === meuId).slice().reverse();
  const financasAba = (
    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-2">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[['Cash balance', formatCurrency(userTeam.cash)], ['Transfer budget', formatCurrency(userTeam.transferBudget ?? 0)], ['Window', janela ? `Open${fecha !== null ? ` (${fecha}d left)` : ''}` : 'Closed'], ['Moves this club', String(minhasTx.length)]].map(([k, v]) => (
          <div key={k} className="bg-slate-100/50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-800 p-4"><div className="text-[11px] font-black uppercase tracking-widest text-slate-400">{k}</div><div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{v}</div></div>
        ))}
      </div>
      <div className="bg-slate-100/50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 dark:border-slate-800">Transaction ledger</div>
        <table className="w-full text-left"><thead><tr>{['Date', 'Type', 'Player', 'Counterparty', 'Amount', 'Balance before', 'Balance after'].map(h => <th key={h} className="px-3 py-2 text-[11px] font-black uppercase tracking-widest text-slate-400">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30">
            {minhasTx.map(t => (
              <tr key={t.id}><td className="px-3 py-2 text-xs text-slate-500">{dataCurta(t.data)}</td>
                <td className="px-3 py-2 text-xs font-black uppercase">{t.natureza === 'COMPRA' ? <span className="text-rose-400">Purchase</span> : t.natureza === 'VENDA' ? <span className="text-emerald-400">Sale</span> : <span className="text-sky-400">Free agent</span>}</td>
                <td className="px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200">{t.jogadorNome}</td><td className="px-3 py-2 text-sm text-slate-500">{nomeClube(t.contraparteId)}</td>
                <td className="px-3 py-2 font-mono text-sm font-black">{t.natureza === 'COMPRA' ? '−' : t.natureza === 'VENDA' ? '+' : ''}{formatCurrency(t.valor)}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-500">{formatCurrency(t.saldoAntes)}</td><td className="px-3 py-2 font-mono text-xs text-slate-500">{formatCurrency(t.saldoDepois)}</td></tr>
            ))}
            {!minhasTx.length && <tr><td colSpan={7} className="p-8 text-center text-slate-400 text-sm font-bold uppercase tracking-widest">No transactions yet</td></tr>}
          </tbody></table>
      </div>
      <div className="bg-slate-100/50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 dark:border-slate-800">Latest moves in the market</div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800/30">
          {mercado.historico.slice(-25).reverse().map(m => (
            <div key={m.id} className="px-4 py-2 text-sm flex justify-between gap-3"><span className="text-slate-700 dark:text-slate-200"><b>{m.jogadorNome}</b> • {nomeClube(m.de)} → {nomeClube(m.para)}{m.tipo === 'DISPENSA' ? ' (released)' : ''}</span><span className="font-mono text-slate-500 whitespace-nowrap">{dataCurta(m.data)} • {m.valor ? formatCurrencyShort(m.valor) : 'free'}</span></div>
          ))}
          {!mercado.historico.length && <div className="p-6 text-center text-slate-400 text-sm font-bold uppercase tracking-widest">No moves yet</div>}
        </div>
      </div>
    </div>
  );

  // ------------------------------------------------------------------ modal da oferta
  useEffect(() => {
    if (!ofertando) return;
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') setOfertando(null); };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [ofertando]);
  const modalOferta = (l: Linha) => {
    const p = l.p, valor = valorOferta, setValor = setValorOferta;
    const semSaldo = valor > userTeam.cash, semOrc = valor > (userTeam.transferBudget ?? 0);
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setOfertando(null)}>
        <div className="w-full max-w-md bg-slate-950 border border-slate-700 rounded-xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
          <div className="text-[11px] font-black uppercase tracking-widest text-blue-400">Make an offer</div>
          <div className="text-2xl font-black italic uppercase text-white">{p.name}</div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">{l.clube?.name} • {p.position} • OVR {p.skill} • {p.age}y</div>
          <div className="grid grid-cols-3 gap-2 text-center mb-4">
            {[['Market value', formatCurrencyShort(p.value)], ['Cash', formatCurrencyShort(userTeam.cash)], ['Budget', formatCurrencyShort(userTeam.transferBudget ?? 0)]].map(([k, v]) => <div key={k} className="bg-slate-900 rounded-lg p-2 border border-slate-800"><div className="text-[10px] font-bold uppercase text-slate-500">{k}</div><div className="text-sm font-black text-white">{v}</div></div>)}
          </div>
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Your offer</label>
          <input type="number" step={1000} value={valor} onChange={e => setValor(Math.max(0, Math.round(Number(e.target.value) || 0)))} className="w-full mt-1 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded px-3 py-3 text-xl font-black text-white outline-none" />
          <div className="text-xs text-slate-500 mt-1">{valor ? `${Math.round((valor / Math.max(1, p.value)) * 100)}% of the market value` : ''}</div>
          {(semSaldo || semOrc) && <div className="text-xs font-bold text-amber-400 mt-2">{semSaldo ? 'Above your cash balance: the deal could not be completed.' : 'Above your transfer budget: the deal could not be completed.'} The club can still accept; it will wait until you can pay.</div>}
          <div className="text-xs text-slate-500 mt-2 leading-relaxed">The club answers in 1–3 days: it may accept, refuse or counter (up to {CONFIG_MERCADO.maxRodadas} rounds). Nothing is charged until the transfer completes{janela ? '.' : ', and the window is closed now.'}</div>
          <div className="flex gap-3 mt-5">
            <button disabled={!valor} onClick={() => { const r = proporCompraMercado(p.id, valor); mostrar(r, `Offer sent for ${p.name}`); if (r.ok) { setOfertando(null); setAba('NEGOTIATIONS'); } }} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black py-3 rounded text-xs uppercase tracking-widest">Send offer</button>
            <button onClick={() => setOfertando(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black py-3 rounded text-xs uppercase tracking-widest">Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in min-h-0">
      <div>
        <button onClick={() => setView('DASHBOARD')} className="text-slate-500 hover:text-white text-xs font-black uppercase tracking-widest mb-1">‹ Back to menu</button>
        <h2 className="text-5xl font-black uppercase tracking-tight italic leading-none"><span className="text-slate-900 dark:text-white">TRANSFER</span> <span className="text-blue-500">MARKET</span></h2>
        <p className="text-slate-400 dark:text-slate-500 font-bold text-[11px] uppercase tracking-widest mt-2 opacity-70">Player search and transactions • window {janela ? <span className="text-emerald-500">open{fecha !== null ? ` (${fecha} days left)` : ''}</span> : <span className="text-rose-400">closed</span>}</p>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {([['MARKET', 'Market'], ['NEGOTIATIONS', `Negotiations${pendentes ? ` (${pendentes})` : ''}`], ['MY_PLAYERS', 'My players / for sale'], ['FINANCES', 'Transfer finances']] as const).map(([id, r]) => (
          <button key={id} onClick={() => setAba(id)} className={`px-5 py-2 rounded text-xs font-black uppercase tracking-widest transition-colors ${aba === id ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-800 dark:hover:text-white'}`}>{r}</button>
        ))}
        {aviso && <div className={`ml-auto px-4 py-2 rounded text-xs font-black uppercase tracking-wider cursor-pointer ${aviso.tipo === 'ok' ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-600/40' : 'bg-rose-600/15 text-rose-400 border border-rose-600/40'}`} onClick={() => setAviso(null)}>{aviso.texto} ✕</div>}
      </div>
      {aba === 'MARKET' && mercadoAba}
      {aba === 'NEGOTIATIONS' && negociacoesAba}
      {aba === 'MY_PLAYERS' && meusAba}
      {aba === 'FINANCES' && financasAba}
      {ofertando && modalOferta(ofertando)}
      <div className="flex justify-end gap-8 pt-1 text-xs font-black uppercase tracking-widest text-slate-500">
        <span>Transfer budget: <b className="text-slate-900 dark:text-white text-sm">{formatCurrencyShort(userTeam.transferBudget ?? 0)}</b></span>
        <span>Cash: <b className="text-slate-900 dark:text-white text-sm">{formatCurrencyShort(userTeam.cash)}</b></span>
        <span>Wage bill: <b className="text-slate-900 dark:text-white text-sm">{formatCurrencyShort(players.filter(p => p.teamId === meuId).reduce((a, p) => a + p.salary, 0))}/w</b></span>
      </div>
    </div>
  );
};

export default TransferMarketView;
