
import { tx } from '../textSim/idiomas';
import React, { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { generatePlayer, faixaDoClube } from '../textSim/dataGenerator';
import { Position, Player } from '../types';
import { ordemDaPosicao } from '../3dMatch/simulador3dCliente';
import { settleMatch, type CurrencyCode } from '../textSim/stadiumEconomy';
import { ContractChip } from './ContractPanel';
import { getStarCount } from './SquadView';
import { estrelasDoJogador } from '../textSim/youth';
import { estadoDoContrato } from '../textSim/contracts';
import { pedidoDeAba } from './TransferMarketView';
import PlayerDetailModal from './PlayerDetailModal';
import SponsorsTab from './SponsorsTab';
import FinanceMonthlyChart from './FinanceMonthlyChart';
import { orcamentoDaTemporada, maxCompras, folhaAnual, PADRAO_COMPRAS, PASSO_COMPRAS } from '../textSim/orcamento';

const FinancesView: React.FC<{ setView?: (v: any) => void }> = ({ setView }) => {
  const { mercado, definirDivisaoOrcamento, userTeam, players, hirePlayer, listarParaVenda, gameState, isTransferWindowOpen, formatCurrency, formatWage, t } = useGame();
  const [marketPhase, setMarketPhase] = useState<'OVERVIEW' | 'MARKET' | 'SPONSORS'>('OVERVIEW');
  const [jogadorAberto, setJogadorAberto] = useState<Player | null>(null);   // o Overview do jogador (o mesmo modal do Squad), aberto pelo nome na folha salarial
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  
  // Market Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('ALL');

  const marketPlayers = useMemo(() => {
    // Determine a seed or limit generation to avoid infinite re-renders if dependencies change
    // Using currentWeek ensures the market refreshes weekly, not on every click
    const list: Player[] = [];
    // Only generate 25 players per week to simulate market availability
    const seedBase = 9000 + (gameState.currentWeek * 50); 
    
    const groups = [
      [Position.GK],
      [Position.LB, Position.CB, Position.RB],
      [Position.DM, Position.LM, Position.CM, Position.RM, Position.AM],
      [Position.LW, Position.RW, Position.SS, Position.ST]
    ];

    for (let i = 0; i < 25; i++) {
      const group = groups[Math.floor((i % 4))]; // Ensure distribution
      const pos = group[Math.floor(Math.random() * group.length)];
      list.push(generatePlayer('MARKET', pos, seedBase + i, 99, userTeam ? faixaDoClube(userTeam) : null)); // 99 as dummy shirt number
    }
    return list;
  }, [gameState.currentWeek, userTeam?.id]);

  // Filter Market Players
  const filteredMarketPlayers = useMemo(() => {
    return marketPlayers.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPos = positionFilter === 'ALL' || 
        (positionFilter === 'GK' && p.position === Position.GK) ||
        (positionFilter === 'DEF' && [Position.LB, Position.CB, Position.RB].includes(p.position)) ||
        (positionFilter === 'MID' && [Position.DM, Position.LM, Position.CM, Position.RM, Position.AM].includes(p.position)) ||
        (positionFilter === 'ATT' && [Position.LW, Position.RW, Position.SS, Position.ST].includes(p.position));
      return matchesSearch && matchesPos;
    });
  }, [marketPlayers, searchTerm, positionFilter]);

  // A divisao guardada pode estar fora do limite atual (folha subiu, patrocinio mudou): reaplica-a ao abrir, para o valor mostrado e o orcamento real acompanharem a barra.
  const pctEfetivo = userTeam ? Math.min(userTeam.transferPct ?? PADRAO_COMPRAS, maxCompras(userTeam, folhaAnual(players.filter(p => p.teamId === userTeam.id).map(p => p.salary)))) : 0;
  const compraEsperada = userTeam ? Math.round(orcamentoDaTemporada(userTeam) * Math.round(pctEfetivo * 20) / 20) : 0;
  React.useEffect(() => { if (userTeam && (userTeam.initialTransfer ?? 0) !== compraEsperada) definirDivisaoOrcamento(pctEfetivo); }, [userTeam?.initialTransfer, compraEsperada]);

  // A LISTA DA FOLHA nunca corta uma linha na base: a altura visivel e cabecalho + um numero inteiro de linhas (o resto fica vazio dentro do cartao).
  const listaRef = React.useRef<HTMLDivElement>(null);
  const ajustarLista = React.useRef<() => void>(() => {});
  ajustarLista.current = () => {
    const el = listaRef.current, caixa = el?.parentElement;
    if (!el || !caixa) return;
    el.style.flex = '1 1 0%'; el.style.height = '';
    const cab = el.querySelector('thead')?.getBoundingClientRect().height || 0, linha = el.querySelector('tbody tr')?.getBoundingClientRect().height || 0;
    if (!linha) return;
    const n = Math.max(1, Math.floor((el.clientHeight - cab) / linha));
    el.style.flex = 'none'; el.style.height = `${Math.ceil(cab + n * linha)}px`;
  };
  React.useEffect(() => {
    const caixa = listaRef.current?.parentElement;
    if (!caixa || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => ajustarLista.current());
    ro.observe(caixa);
    return () => ro.disconnect();
  }, [marketPhase]);
  React.useEffect(() => { ajustarLista.current(); });

  if (!userTeam) return null;

  const teamPlayers = players.filter(p => p.teamId === userTeam.id);
  const totalSalaries = teamPlayers.reduce((sum, p) => sum + p.salary, 0);
  
  // Use real attendance data for revenue estimation
  // Proximo jogo em casa: publico = capacidade x ocupacao actual; renda = publico x preco medio; custo do estadio pela capacidade (textSim/stadiumEconomy.ts).
  const eco = settleMatch(userTeam, userTeam, { id: '', week: 0, date: '', homeTeamId: userTeam.id, awayTeamId: '', homeScore: 0, awayScore: 0 } as any, gameState.currency as CurrencyCode);
  const attendance = eco.attendance;
  const estMatchRevenue = Math.round(eco.revenueUSD);
  const estStadiumCost = Math.round(eco.costUSD);

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('en-US').format(val);
  }

  const windowOpen = isTransferWindowOpen();

  // A oferta recebida (RECEBIDA, o vendedor e o utilizador) que cada jogador tem a espera de resposta: id do jogador -> valor.
  const ofertaPorJogador = useMemo(() => {
    const m = new Map<string, number>();
    mercado.negociacoes.forEach(n => { if (n.vendedorId === userTeam?.id && n.estado === 'RECEBIDA') m.set(n.playerId, Math.max(m.get(n.playerId) || 0, n.valor)); });
    return m;
  }, [mercado.negociacoes, userTeam?.id]);

  const sortedTeamPlayers = useMemo(() => {
    let sortablePlayers = [...teamPlayers];
    if (sortConfig !== null) {
      sortablePlayers.sort((a, b) => {
        // @ts-ignore
        let aValue = sortConfig.key === 'pos' ? ordemDaPosicao(a) : sortConfig.key === 'offer' ? (ofertaPorJogador.get(a.id) || 0) : sortConfig.key === 'contract' ? ((a as any).contract ? (a as any).contract.end : '9999-99-99') : a[sortConfig.key];   // o que vence primeiro vem primeiro
        // @ts-ignore
        let bValue = sortConfig.key === 'pos' ? ordemDaPosicao(b) : sortConfig.key === 'offer' ? (ofertaPorJogador.get(b.id) || 0) : sortConfig.key === 'contract' ? ((b as any).contract ? (b as any).contract.end : '9999-99-99') : b[sortConfig.key];
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    } else {
      return sortablePlayers.sort((a,b) => b.salary - a.salary);
    }
    return sortablePlayers;
  }, [teamPlayers, sortConfig, ofertaPorJogador]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <span className="opacity-30 ml-1">↕</span>;
    return <span className="ml-1 text-blue-500">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tight leading-none italic transition-colors">
            <span className="text-slate-900 dark:text-white transition-colors">{tx('FINANCIAL')}</span> <span className="text-blue-500">{tx('CENTER')}</span>
          </h2>
          <p className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-2 opacity-60 transition-colors">
            {t('fin_subtitle')}
          </p>
        </div>
      {(() => {
        const comEstado = teamPlayers.map(p => ({ p, estado: estadoDoContrato(p.contract, gameState.currentDate) }));
        const criticos = comEstado.filter(x => x.estado === 'CRITICO').map(x => x.p);
        const atencao = comEstado.filter(x => x.estado === 'ATENCAO').map(x => x.p);
        if (!criticos.length && !atencao.length) return null;
        const lista = [...criticos, ...atencao].map(p => p.name).join(', ');
        // Uma linha so, na mesma faixa do titulo (antes era uma faixa propria que empurrava a pagina para baixo); a lista completa fica no tooltip.
        return (
          <div title={`Critical (6 months or less): ${criticos.map(p => p.name).join(', ') || '-'}
Attention (12 months or less): ${atencao.map(p => p.name).join(', ') || '-'}`}
            className={`flex-1 min-w-0 mx-6 rounded-lg border px-3 py-1.5 text-xs font-bold flex items-center gap-2 ${criticos.length ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400' : 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40 text-amber-600 dark:text-amber-400'}`}>
            <span className="font-black uppercase tracking-widest shrink-0">⚠ Contracts {criticos.length}/{atencao.length}</span>
            <span className="truncate">{lista}</span>
          </div>
        );
      })()}
        <div className="flex gap-2">
           <button 
             onClick={() => setMarketPhase('OVERVIEW')}
             className={`px-6 py-2 rounded font-black text-xs uppercase tracking-widest transition-all ${marketPhase === 'OVERVIEW' ? 'bg-emerald-600/10 text-emerald-600 dark:bg-emerald-600 dark:text-white border border-emerald-600/30 shadow-lg' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
           >
             {t('fin_treasury')}
           </button>
           <button
             onClick={() => setMarketPhase('SPONSORS')}
             className={`px-6 py-2 rounded font-black text-xs uppercase tracking-widest transition-all ${marketPhase === 'SPONSORS' ? 'bg-emerald-600/10 text-emerald-600 dark:bg-emerald-600 dark:text-white border border-emerald-600/30 shadow-lg' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
           >
             {tx('SPONSORS')}
           </button>
           <button 
             onClick={() => (setView ? setView('TRANSFERS') : setMarketPhase('MARKET'))}   // o mercado de verdade e a aba Transfers
             className={`px-6 py-2 rounded font-black text-xs uppercase tracking-widest transition-all ${marketPhase === 'MARKET' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
           >
             {t('fin_market')}
           </button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {marketPhase === 'SPONSORS' ? <SponsorsTab /> : marketPhase === 'OVERVIEW' ? (
          <div className="grid grid-cols-12 grid-rows-[auto_minmax(0,1fr)] gap-6 h-full">   {/* content-start: as linhas nao esticam para a altura toda */}
            <div className="col-span-12 grid grid-cols-5 gap-4">
               <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-2.5 shadow-xl transition-colors">
                  <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{t('dash_avail_balance')}</div>
                  <div className="text-xl font-black text-slate-800 dark:text-white transition-colors">{formatCurrency(userTeam.cash)}</div>
               </div>
               <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-2.5 shadow-xl transition-colors">
                  <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{t('fin_weekly_sal')}</div>
                  <div className="text-xl font-black text-rose-500 transition-colors">{formatCurrency(totalSalaries)}</div>
               </div>
               <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-2.5 shadow-xl transition-colors">
                  <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{t('fin_match_rev')}</div>
                  <div className="text-xl font-black text-blue-500 dark:text-blue-400 transition-colors">{formatCurrency(estMatchRevenue)}</div>
                  <div className="text-[9px] text-slate-400 mt-1">{formatNumber(attendance)} fans · {Math.round(eco.occupancy * 100)}% full · stadium cost {formatCurrency(estStadiumCost)}/match</div>
               </div>
               <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-2.5 shadow-xl transition-colors">
                  <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{t('fin_sponsor')}</div>
                  <div className="text-xl font-black text-emerald-500 transition-colors">{formatCurrency(userTeam.sponsorContract?.valorAnualUSD || 0)}</div>
               </div>
               <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-2.5 shadow-xl transition-colors">
                  <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{t('fin_fanbase')}</div>
                  <div className="text-xl font-black text-slate-600 dark:text-slate-300 transition-colors">{formatNumber(userTeam.fanBase || 0)}</div>
               </div>
            </div>

            <div className="col-span-8 bg-white/80 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col transition-colors shadow-lg min-h-0">
              <div className="bg-slate-50 dark:bg-slate-950/60 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center transition-colors">
                 <h3 className="text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">{t('fin_squad_payroll')}</h3>
              </div>
              <div ref={listaRef} className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead className="sticky top-0 z-10 shadow-sm">
                    <tr className="bg-slate-50 dark:bg-slate-900 text-[13px] tracking-wide text-slate-400 dark:text-slate-300 uppercase font-black">
                      <th className="px-6 py-3">
                        <span className="cursor-pointer hover:text-blue-500 transition-colors" onClick={() => requestSort('pos')} title={tx('Sort by position (GK, defenders, midfielders, forwards)')}>{tx('Pos')} {getSortIcon('pos')}</span>
                        <span className="mx-2 opacity-30">|</span>
                        <span className="cursor-pointer hover:text-blue-500 transition-colors" onClick={() => requestSort('name')}>{tx('Player')} {getSortIcon('name')}</span>
                      </th>
                      <th className="px-4 py-3 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('age')}>
                        {tx('Age')} {getSortIcon('age')}
                      </th>
                      <th className="px-4 py-3 text-center">{tx('Stars')}</th>
                      <th className="px-4 py-3 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('skill')}>
                        OVR {getSortIcon('skill')}
                      </th>
                      <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('salary')}>
                        {tx('Wage')} {getSortIcon('salary')}
                      </th>
                      <th className="px-4 py-3 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('contract')}>
                        {tx('Contract')} {getSortIcon('contract')}
                      </th>
                      <th className="px-4 py-3 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('offer')}>
                        {tx('Offer')} {getSortIcon('offer')}
                      </th>
                      <th className="w-[1%] whitespace-nowrap px-4 py-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => requestSort('value')}>
                        {tx('Market Value')} {getSortIcon('value')}
                      </th>
                      <th className="px-4 py-3 text-center">{tx('Action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {sortedTeamPlayers.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-1 font-bold text-sm whitespace-nowrap text-slate-700 dark:text-slate-200"><span className="inline-block w-9 mr-2 text-center text-[10px] font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded px-1 py-0.5 align-middle">{p.position}</span><button type="button" onClick={() => setJogadorAberto(p)} title={tx('Open player overview')} className="text-left hover:text-blue-500 dark:hover:text-blue-400 hover:underline transition-colors">{p.name}</button></td>
                        <td className="px-4 py-1 text-center text-xs font-bold text-slate-500 dark:text-slate-400">{p.age}</td>
                        {/* As mesmas estrelas do Squad: douradas = o nivel atual (OVR); cinzentas = ate ao potencial; apagadas = acima do potencial. */}
                        <td className="px-4 py-1 text-center whitespace-nowrap text-sm leading-none">
                          {Array.from({ length: 5 }, (_, i) => <span key={i} className={i < getStarCount(p.skill) ? 'text-yellow-400' : i < estrelasDoJogador(p) ? 'text-slate-400' : 'text-slate-200 dark:text-slate-700'}>★</span>)}
                        </td>
                        <td className="px-4 py-1 text-center text-xs font-black text-blue-600 dark:text-blue-400">{Math.round(p.skill)}</td>
                        <td className="px-4 py-1 text-right text-rose-500 text-sm font-mono">{formatWage(p.salary)}</td>
                        <td className="px-4 py-1 text-center"><button type="button" onClick={() => setJogadorAberto(p)} title={tx('Open player overview (contract)')} className="cursor-pointer hover:brightness-125 transition"><ContractChip player={p} hoje={gameState.currentDate} /></button></td>
                        <td className="px-4 py-1 text-center">
                          {ofertaPorJogador.has(p.id) && (
                            <button type="button" onClick={() => { pedidoDeAba.aba = 'NEGOTIATIONS'; if (setView) setView('TRANSFERS'); else setMarketPhase('MARKET'); }} title={`Offer: ${formatCurrency(ofertaPorJogador.get(p.id) || 0)} — open Negotiations`}
                              className="text-[10px] font-black uppercase tracking-wider border border-amber-500/50 bg-amber-500/15 text-amber-500 hover:brightness-125 px-2 py-1 rounded-md whitespace-nowrap transition">
                              {tx('Offer received')}
                            </button>
                          )}
                        </td>
                        <td className="w-[1%] whitespace-nowrap px-4 py-1 text-right font-black text-sm text-slate-900 dark:text-white">
                           {formatCurrency(p.value)}
                        </td>
                        <td className="px-4 py-1 text-center">
                          {/* Nao vende direto: poe o jogador na LISTA DE VENDA (as ofertas chegam em Negotiations); clicar de novo tira da lista. */}
                          {(windowOpen || p.listedForSale) && (
                            <button onClick={() => listarParaVenda(p.id, !p.listedForSale)} title={p.listedForSale ? tx('Listed for sale — click to remove from the list') : tx('Put on the transfer list: offers arrive in Negotiations')}
                              className={p.listedForSale
                                ? 'text-[10px] uppercase font-black tracking-wider border border-emerald-500/50 bg-emerald-500/15 text-emerald-500 hover:brightness-125 px-2 py-1 rounded-md whitespace-nowrap transition'
                                : 'text-[10px] text-rose-600 uppercase opacity-0 group-hover:opacity-100 font-black tracking-wider border border-rose-500/40 hover:bg-rose-500/10 px-2 py-1 rounded-md whitespace-nowrap transition'}>
                              {p.listedForSale ? tx('Listed ✓') : t('fin_sell')}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="col-span-4 bg-white/80 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4 shadow-lg min-h-0 overflow-y-auto custom-scrollbar">
                 <h3 className="text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">{t('fin_summary')}</h3>
                 <div className="space-y-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded border border-slate-100 dark:border-slate-800">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">{t('fin_season_budget')}</div>
                        <div className="text-xl font-black text-slate-800 dark:text-white mt-1">{formatCurrency(orcamentoDaTemporada(userTeam))}</div>
                        {!!userTeam.sponsorContract && <div className="text-[9px] text-slate-400 mt-1">{formatCurrency(userTeam.initialCapital || 0)} + {t('fin_sponsor')} {formatCurrency(userTeam.sponsorContract.valorAnualUSD)}</div>}
                    </div>
                     <div className="px-4 py-[6px] bg-slate-50 dark:bg-slate-950/50 rounded border border-slate-100 dark:border-slate-800">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">{t('fin_transfer_budget')}</div>
                        {(() => {
                          const pool = orcamentoDaTemporada(userTeam), folha = folhaAnual(teamPlayers.map(p => p.salary));
                          const maxPct = Math.round(maxCompras(userTeam, folha) * 100), folhaPct = pool > 0 ? Math.min(100, (folha / pool) * 100) : 100;
                          const pct = Math.min(Math.round((userTeam.transferPct ?? PADRAO_COMPRAS) * 100), maxPct), pt = gameState.language === 'PT';
                          // planeado (a fatia da temporada) x o que resta (`transferBudget`, o do Transfer Market): a diferenca e o que ja foi usado em compras (menos a parte das vendas que volta)
                          const planeado = userTeam.initialTransfer || 0, restante = Math.max(0, userTeam.transferBudget ?? 0), gasto = Math.max(0, planeado - restante);
                          const gastoPct = pool > 0 ? Math.min(pct, (gasto / pool) * 100) : 0;
                          return (
                            <div className="mt-[7px]">
                              <div className="flex justify-between text-base font-black uppercase tracking-wide">
                                <span className="text-emerald-600">{tx('Transfers')} {pct}% · {formatCurrency(planeado)}</span>
                                <span className="text-rose-500">{tx('Wages')} {100 - pct}% · {formatCurrency(orcamentoDaTemporada(userTeam) - (userTeam.initialTransfer || 0))}</span>
                              </div>
                              <div className="relative mt-2">
                                <input type="range" min={0} max={100} step={PASSO_COMPRAS * 100} value={pct} onChange={e => definirDivisaoOrcamento(Math.min(Number(e.target.value), maxPct) / 100)}
                                  aria-label={tx('Budget split between transfers and wages')}
                                  className="orcamento-range w-full"
                                  style={{ background: `linear-gradient(to right, #059669 ${pct}%, #f43f5e ${pct}%)` }} />
                                <div className="orcamento-folha" style={{ width: `${folhaPct}%` }} title={tx('Annual payroll (wage minimum): {v0}', { v0: formatCurrency(folha) })} />
                                {/* o GASTO da parte de compras (escurecido sobre o verde, a partir da esquerda) */}
                                {gastoPct > 0 && <div className="absolute left-0 top-0 h-full rounded-l bg-emerald-950/70 pointer-events-none" style={{ width: `${gastoPct}%` }} title={tx('Used: {v0}', { v0: formatCurrency(gasto) })} />}
                              </div>
                              {/* A barra e o PLANEADO para a temporada; o que ainda se pode gastar agora (`transferBudget`, o do Transfer Market) desce a cada compra e sobe com parte das vendas. */}
                              <div className="mt-1.5 flex justify-between text-[11px] font-bold text-slate-400">
                                <span>{tx('Used:')} <b className="text-slate-600 dark:text-slate-200">{formatCurrency(gasto)}</b> · {tx('Left:')} <b className="text-emerald-500">{formatCurrency(restante)}</b></span>
                                <span>{tx('Cash:')} <b className="text-slate-600 dark:text-slate-200">{formatCurrency(userTeam.cash)}</b></span>
                              </div>
                            </div>
                          );
                        })()}
                    </div>
                    <div className="px-4 py-[6px] bg-slate-50 dark:bg-slate-950/50 rounded border border-slate-100 dark:border-slate-800">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">{t('fin_avg_att')}</div>
                        <div className="text-xl font-black text-blue-600 mt-1">{formatNumber(userTeam.avrAttendance || 0)}</div>
                        <div className="text-[9px] text-slate-400 mt-1">{tx('Stadium capacity:')} {formatNumber(userTeam.stadiumCapacity || 0)}</div>
                    </div>
                    <div className="px-4 py-[6px] bg-slate-50 dark:bg-slate-950/50 rounded border border-slate-100 dark:border-slate-800">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">{tx('Ticket sales revenue')}</div>
                        <div className="text-xl font-black text-emerald-500 mt-1">{formatCurrency(userTeam.gateRevenue || 0)}</div>
                        <div className="text-[9px] text-slate-400 mt-1">{tx('Stadium cost')} {formatCurrency(userTeam.stadiumCosts || 0)} · {tx('Net')} {formatCurrency((userTeam.gateRevenue || 0) - (userTeam.stadiumCosts || 0))}</div>
                    </div>
                    <FinanceMonthlyChart salarioSemanalTotal={totalSalaries} />
                 </div>
            </div>
          </div>
        ) : (
          <div className="h-full">
            {!windowOpen ? (
              <div className="h-full flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg text-center p-12">
                 <span className="text-6xl mb-6">🔒</span>
                 <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic">{t('fin_market_closed')}</h3>
                 <p className="text-slate-500 max-w-md mt-2">{t('fin_market_closed_msg')}</p>
              </div>
            ) : (
              <div className="bg-white/80 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 h-full flex flex-col overflow-hidden shadow-lg">
                <div className="bg-slate-50 dark:bg-slate-950/60 px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex gap-4 items-center">
                   <div className="flex-1">
                      <input 
                        type="text" 
                        placeholder={t('fin_search')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors text-slate-800 dark:text-white"
                      />
                   </div>
                   <div className="flex gap-2">
                      {['ALL', 'GK', 'DEF', 'MID', 'ATT'].map(pos => (
                        <button
                          key={pos}
                          onClick={() => setPositionFilter(pos)}
                          className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all ${positionFilter === pos ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700'}`}
                        >
                          {pos}
                        </button>
                      ))}
                   </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-4 custom-scrollbar">
                   {filteredMarketPlayers.map(p => (
                     <div key={p.id} className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex justify-between items-center group hover:border-blue-300 dark:hover:border-slate-600 transition-all">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-black text-slate-400 text-sm">
                              {p.position}
                           </div>
                           <div>
                              <div className="text-sm font-black text-slate-800 dark:text-white">{p.name}</div>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] font-bold text-slate-400">
                                 <span className="text-blue-500">OVR {p.skill}</span>
                                 <span>•</span>
                                 <span>AGE {p.age}</span>
                              </div>
                           </div>
                        </div>
                        <div className="text-right">
                           <div className="text-base font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(p.value)}</div>
                           <div className="text-[9px] text-slate-400 font-mono mb-1">{tx('Wage:')} {formatWage(p.salary)}</div>
                           <button 
                             onClick={() => hirePlayer(p)} 
                             disabled={userTeam.cash < p.value}
                             className="px-4 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-[9px] uppercase rounded-sm transition-colors"
                           >
                             {t('fin_sign')}
                           </button>
                        </div>
                     </div>
                   ))}
                   {filteredMarketPlayers.length === 0 && (
                     <div className="col-span-2 text-center py-10 text-slate-400 text-sm font-bold uppercase tracking-widest">
                       {t('fin_no_players')}
                     </div>
                   )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {jogadorAberto && <PlayerDetailModal player={jogadorAberto} onClose={() => setJogadorAberto(null)} />}
    </div>
  );
};

export default FinancesView;
