import { tx } from '../textSim/idiomas';
import React, { useMemo, useState } from 'react';
import { useGame } from '../context/GameContext';
import { BANCO, emprestimosAtivos, dividaTotal, parcelasMensais, simularEmprestimo, valorDeQuitacao } from '../textSim/emprestimoBancario';

/*
A ABA BANK do Financial Center (pedido: "implementar o emprestimo bancario, coloca la no financial"): o utilizador escolhe o valor e o prazo, ve a taxa que o banco da ao clube
(reputacao, porte da liga, divida e caixa: textSim/emprestimoBancario.ts), a parcela e o custo total, e assina. Em baixo: os emprestimos ativos (saldo, parcela, fim) com a
quitacao antecipada, e o extrato do banco.
*/
const dataCurta = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '-');
const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

const BankLoansTab: React.FC = () => {
  const { userTeam, perfilDeCredito, contratarEmprestimoBancario, quitarEmprestimoBancario, formatCurrency } = useGame();
  const [valor, setValor] = useState(0);
  const [meses, setMeses] = useState(24);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const disponivel = perfilDeCredito ? simularEmprestimo(perfilDeCredito, 0, meses).disponivel : 0;
  const v = Math.min(valor || 0, disponivel);
  const sim = useMemo(() => (perfilDeCredito ? simularEmprestimo(perfilDeCredito, Math.max(v, BANCO.valorMin), meses) : null), [perfilDeCredito, v, meses]);
  if (!userTeam || !perfilDeCredito || !sim) return null;
  const ativos = emprestimosAtivos(userTeam);
  const extrato = (userTeam.movimentosBanco || []).slice().reverse().slice(0, 40);
  const MOTIVO: Record<string, string> = {
    VALOR_MINIMO: tx('The minimum loan is {v0}.', { v0: formatCurrency(BANCO.valorMin) }),
    PRAZO: tx('Invalid duration.'),
    LIMITE: tx('Above the club\'s credit limit.'),
    MAX_ATIVOS: tx('The bank allows at most {v0} active loans.', { v0: BANCO.maxAtivos }),
    INEXISTENTE: tx('Loan not found.'),
    SEM_CAIXA: tx('Not enough cash to pay it off.'),
    SEM_CLUBE: tx('Not possible')
  };
  const pedir = () => {
    const r = contratarEmprestimoBancario(v, meses);
    if (r.ok) { setMsg({ ok: true, texto: tx('Loan approved: {v0} credited to the club\'s cash.', { v0: formatCurrency(v) }) }); setValor(0); }
    else if ('motivo' in r) setMsg({ ok: false, texto: MOTIVO[r.motivo] || tx('Not possible') });
  };
  const quitar = (id: string) => {
    const r = quitarEmprestimoBancario(id);
    if ('valor' in r) setMsg({ ok: true, texto: tx('Loan paid off: {v0} debited.', { v0: formatCurrency(r.valor) }) }); else setMsg({ ok: false, texto: MOTIVO[r.motivo] || tx('Not possible') });
  };
  const caixa = 'bg-white/80 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg';
  const rotulo = 'text-[10px] font-black uppercase tracking-widest text-slate-400';
  const podePedir = v >= BANCO.valorMin && ativos.length < BANCO.maxAtivos;
  const passo = disponivel > 5_000_000 ? 100_000 : 10_000;

  return (
    <div className="h-full grid grid-cols-12 gap-6 min-h-0">
      {/* PEDIR: valor, prazo e a proposta do banco */}
      <div className={`col-span-12 lg:col-span-5 ${caixa} p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar`}>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{tx('Request a bank loan')}</h3>
        <div className="grid grid-cols-3 gap-3">
          <div><div className={rotulo}>{tx('Credit limit')}</div><div className="text-lg font-black text-slate-800 dark:text-white">{formatCurrency(sim.teto)}</div></div>
          <div><div className={rotulo}>{tx('Current debt')}</div><div className="text-lg font-black text-rose-500">{formatCurrency(dividaTotal(userTeam))}</div></div>
          <div><div className={rotulo}>{tx('Available')}</div><div className="text-lg font-black text-emerald-500">{formatCurrency(disponivel)}</div></div>
        </div>
        <div className="text-[11px] text-slate-400 leading-relaxed">
          {tx('The total debt can reach {v0} of the estimated yearly revenue ({v1}: sponsorship plus a season of home ticket sales). The rate depends on the club\'s reputation ({v2}/100), the size of the league, the debt and the cash balance.',
            { v0: `${Math.round(BANCO.fracaoDaReceita * 100)}%`, v1: formatCurrency(perfilDeCredito.receitaAnual), v2: perfilDeCredito.reputacao })}
        </div>
        <div>
          <label className={rotulo}>{tx('Amount')}</label>
          <input type="range" min={0} max={Math.max(0, disponivel)} step={passo} value={v} onChange={e => setValor(Number(e.target.value))} className="w-full mt-2" aria-label={tx('Amount')} disabled={disponivel < BANCO.valorMin} />
          <input type="number" min={0} step={passo} value={v} onChange={e => setValor(Math.max(0, Math.round(Number(e.target.value) || 0)))}
            className="mt-2 w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-2 text-lg font-black text-slate-800 dark:text-white outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className={rotulo}>{tx('Term')}</label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {BANCO.prazos.map(m => (
              <button key={m} onClick={() => setMeses(m)} className={`px-3 py-1.5 rounded text-[11px] font-black uppercase tracking-wider ${meses === m ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}>
                {tx('{v0} months', { v0: m })}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
          <div><div className={rotulo}>{tx('Interest rate (year)')}</div><div className="text-xl font-black text-amber-500">{pct(sim.taxaAnual)}</div></div>
          <div><div className={rotulo}>{tx('Monthly instalment')}</div><div className="text-xl font-black text-slate-800 dark:text-white">{v >= BANCO.valorMin ? formatCurrency(sim.parcela) : '-'}</div></div>
          <div><div className={rotulo}>{tx('Total interest')}</div><div className="text-base font-black text-rose-500">{v >= BANCO.valorMin ? formatCurrency(sim.totalJuros) : '-'}</div></div>
          <div><div className={rotulo}>{tx('Total to repay')}</div><div className="text-base font-black text-slate-700 dark:text-slate-200">{v >= BANCO.valorMin ? formatCurrency(sim.total) : '-'}</div></div>
        </div>
        <button onClick={pedir} disabled={!podePedir} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black py-3 rounded text-xs uppercase tracking-widest transition-colors">{tx('Take the loan')}</button>
        <div className="text-[11px] text-slate-400">{tx('The money enters the cash today. Instalments are debited at the start of each month, even if the cash goes negative. Early repayment: balance plus a {v0} fee.', { v0: `${Math.round(BANCO.tarifaQuitacao * 100)}%` })}</div>
        {msg && <div onClick={() => setMsg(null)} className={`cursor-pointer px-3 py-2 rounded text-xs font-black ${msg.ok ? 'bg-emerald-600/15 text-emerald-500 border border-emerald-600/40' : 'bg-rose-600/15 text-rose-500 border border-rose-600/40'}`}>{msg.texto} ✕</div>}
      </div>

      {/* ATIVOS e EXTRATO */}
      <div className="col-span-12 lg:col-span-7 flex flex-col gap-6 min-h-0">
        <div className={`${caixa} overflow-hidden`}>
          <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{tx('Active loans')}</h3>
            <span className="text-xs font-black text-slate-500">{tx('Monthly instalments:')} <b className="text-rose-500">{formatCurrency(Math.round(parcelasMensais(userTeam)))}</b></span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr>{[tx('Taken'), tx('Amount'), tx('Rate'), tx('Instalment'), tx('Paid'), tx('Balance'), tx('Ends'), ''].map((h, i) => <th key={i} className="px-4 py-2 text-[11px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {ativos.map(e => (
                  <tr key={e.id}>
                    <td className="px-4 py-2 text-xs text-slate-500">{dataCurta(e.inicio)}</td>
                    <td className="px-4 py-2 text-sm font-black text-slate-700 dark:text-slate-200">{formatCurrency(e.principal)}</td>
                    <td className="px-4 py-2 text-sm font-bold text-amber-500">{pct(e.taxaAnual)}</td>
                    <td className="px-4 py-2 text-sm font-mono text-rose-500">{formatCurrency(e.parcela)}</td>
                    <td className="px-4 py-2 text-xs text-slate-500">{e.parcelasPagas}/{e.meses}</td>
                    <td className="px-4 py-2 text-sm font-black text-slate-800 dark:text-white">{formatCurrency(e.saldo)}</td>
                    <td className="px-4 py-2 text-xs text-slate-500">{dataCurta(e.fim)}</td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => quitar(e.id)} disabled={userTeam.cash < valorDeQuitacao(e)} title={tx('Pay off now: {v0}', { v0: formatCurrency(valorDeQuitacao(e)) })}
                        className="px-3 py-1.5 rounded text-[11px] font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-600 hover:text-white disabled:opacity-40 whitespace-nowrap">{tx('Pay off')}</button>
                    </td>
                  </tr>
                ))}
                {!ativos.length && <tr><td colSpan={8} className="p-6 text-center text-slate-400 text-sm font-bold uppercase tracking-widest">{tx('No active loans')}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className={`${caixa} overflow-hidden flex-1 min-h-0 flex flex-col`}>
          <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800"><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{tx('Bank statement')}</h3></div>
          <div className="overflow-y-auto custom-scrollbar flex-1">
            <table className="w-full text-left">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {extrato.map(m => (
                  <tr key={m.id}>
                    <td className="px-4 py-1.5 text-xs text-slate-500">{dataCurta(m.data)}</td>
                    <td className="px-4 py-1.5 text-xs font-black uppercase">{m.tipo === 'CREDITO' ? <span className="text-emerald-500">{tx('Loan credited')}</span> : m.tipo === 'PARCELA' ? <span className="text-rose-500">{tx('Instalment')}</span> : <span className="text-sky-500">{tx('Early repayment')}</span>}</td>
                    <td className="px-4 py-1.5 text-sm font-mono font-black text-right">{m.tipo === 'CREDITO' ? '+' : '−'}{formatCurrency(m.valor)}</td>
                    <td className="px-4 py-1.5 text-xs text-slate-400 text-right">{m.juros ? tx('interest {v0}', { v0: formatCurrency(m.juros) }) : ''}</td>
                  </tr>
                ))}
                {!extrato.length && <tr><td className="p-6 text-center text-slate-400 text-sm font-bold uppercase tracking-widest">{tx('No movements yet')}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankLoansTab;
