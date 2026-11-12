import { tx, localeDoIdioma, idiomaAtual } from '../textSim/idiomas';
import React, { useMemo, useState } from 'react';
import { useGame } from '../context/GameContext';
import { ligaIdDoClube } from '../textSim/competitions';
import { ehLigaEuropeia } from '../textSim/dataGenerator';

/*
GRAFICO MES A MES do Financial Center: ganhos e gastos do clube do jogador, cada serie liga/desliga por botao.
Fontes reais: renda de bilheteria e custo do estadio (jogos em casa ja liquidados, `fixture.gateRevenue/stadiumCost`), vendas e compras (`mercado.transacoes`).
Estimados (o jogo nao debita folha nem patrocinio por mes): salarios = folha semanal actual x 52 / 12; patrocinio = valor anual / 12.
O banco (textSim/emprestimoBancario.ts, `Team.movimentosBanco`): o credito de um emprestimo entra em "Loans" e as parcelas/quitacoes em "Repayments". Os bonus por jogos, taxas de
emprestimo e opcoes de compra ja estao nas vendas/compras (sao lancamentos da `mercado.transacoes`).
*/
type Chave = 'gate' | 'sales' | 'sponsor' | 'loans' | 'stadium' | 'purchases' | 'wages' | 'repay';
const SERIES: { k: Chave; pt: string; en: string; cor: string; ganho: boolean }[] = [
  { k: 'gate', pt: 'Ingressos', en: 'Tickets', cor: '#22c55e', ganho: true },
  { k: 'sales', pt: 'Vendas', en: 'Sales', cor: '#4ade80', ganho: true },
  { k: 'sponsor', pt: 'Patrocínio (est.)', en: 'Sponsor (est.)', cor: '#15803d', ganho: true },
  { k: 'loans', pt: 'Empréstimos', en: 'Loans', cor: '#a3e635', ganho: true },
  { k: 'stadium', pt: 'Estádio', en: 'Stadium', cor: '#fb7185', ganho: false },
  { k: 'purchases', pt: 'Compras', en: 'Purchases', cor: '#ef4444', ganho: false },
  { k: 'wages', pt: 'Salários (est.)', en: 'Wages (est.)', cor: '#b91c1c', ganho: false },
  { k: 'repay', pt: 'Parcelas', en: 'Repayments', cor: '#f97316', ganho: false },
];

const FinanceMonthlyChart: React.FC<{ salarioSemanalTotal: number }> = ({ salarioSemanalTotal }) => {
  const { userTeam, fixtures, mercado, gameState, formatCurrency } = useGame();
  const pt = gameState.language === 'PT';
  const [ligadas, setLigadas] = useState<Record<Chave, boolean>>({ gate: true, sales: true, sponsor: true, loans: true, stadium: true, purchases: true, wages: true, repay: true });
  const [sobre, setSobre] = useState<number | null>(null);

  const { meses, dados } = useMemo(() => {
    const vazio = { meses: [] as string[], dados: {} as Record<Chave, (number | null)[]> };
    if (!userTeam) return vazio;
    const hoje = gameState.currentDate.slice(0, 7);
    const acum: Record<string, Record<Chave, number>> = {};
    const mes = (m: string) => acum[m] || (acum[m] = { gate: 0, sales: 0, sponsor: 0, loans: 0, stadium: 0, purchases: 0, wages: 0, repay: 0 });
    (userTeam.movimentosBanco || []).forEach(b => { const a = mes(b.data.slice(0, 7)); if (b.tipo === 'CREDITO') a.loans += b.valor; else a.repay += b.valor; });
    fixtures.forEach(f => {
      if (f.homeTeamId !== userTeam.id || f.gateRevenue === undefined || !f.date) return;
      const a = mes(f.date.slice(0, 7)); a.gate += f.gateRevenue || 0; a.stadium += (f as any).stadiumCost || 0;
    });
    (mercado?.transacoes || []).forEach(t => {
      if (t.clubeId !== userTeam.id) return;
      const a = mes(t.data.slice(0, 7));
      if (t.natureza === 'VENDA') a.sales += t.valor; else a.purchases += t.valor;
    });
    // o semestre do ano actual; os meses que ainda nao chegaram ficam vazios (null)
    const ano = hoje.slice(0, 4);
    // Clube europeu: a temporada inteira, de JUN a MAI (vira a 1/6). Os demais: o semestre do mes actual (JAN-JUN ou JUL-DEZ).
    const mesAtual = Number(hoje.slice(5, 7));
    let ultimos: string[];
    if (ehLigaEuropeia(ligaIdDoClube(userTeam))) {
      const anoIni = mesAtual >= 6 ? Number(ano) : Number(ano) - 1;
      ultimos = Array.from({ length: 12 }, (_, i) => { const m = 6 + i; return `${m > 12 ? anoIni + 1 : anoIni}-${String(m > 12 ? m - 12 : m).padStart(2, '0')}`; });
    } else {
      const inicioMes = mesAtual <= 6 ? 1 : 7;
      ultimos = Array.from({ length: 6 }, (_, i) => `${ano}-${String(inicioMes + i).padStart(2, '0')}`);
    }
    const folhaMensal = (salarioSemanalTotal * 52) / 12, patroMensal = (userTeam.sponsorContract?.valorAnualUSD || 0) / 12;
    const out = { gate: [], sales: [], sponsor: [], loans: [], stadium: [], purchases: [], wages: [], repay: [] } as Record<Chave, (number | null)[]>;
    ultimos.forEach(k => {
      const a = acum[k], ja = k <= hoje;
      out.gate.push(ja ? a?.gate || 0 : null); out.sales.push(ja ? a?.sales || 0 : null); out.stadium.push(ja ? a?.stadium || 0 : null); out.purchases.push(ja ? a?.purchases || 0 : null);
      out.loans.push(ja ? a?.loans || 0 : null); out.repay.push(ja ? a?.repay || 0 : null);
      out.sponsor.push(ja ? patroMensal : null); out.wages.push(ja ? folhaMensal : null);
    });
    return { meses: ultimos, dados: out };
  }, [userTeam, fixtures, mercado, gameState.currentDate, salarioSemanalTotal]);

  if (!userTeam) return null;
  const ativas = SERIES.filter(s => ligadas[s.k]);
  // DUAS BARRAS POR MES: a verde empilha as entradas ligadas e a vermelha as saidas ligadas (cada fatia na cor da sua serie).
  const soma = (i: number, ganho: boolean) => ativas.filter(c => c.ganho === ganho).reduce((t, c) => t + (dados[c.k]?.[i] ?? 0), 0);
  const maximo = Math.max(1, ...meses.flatMap((_, i) => [soma(i, true), soma(i, false)]));
  const W = 560, H = 220, PAD_L = 8, PAD_B = 22, PAD_T = 10;
  const passo = (W - PAD_L * 2) / Math.max(1, meses.length);
  const x = (i: number) => PAD_L + passo * (i + 0.5);
  const larg = Math.min(14, passo * 0.36);
  const y = (v: number) => PAD_T + (H - PAD_T - PAD_B) * (1 - v / maximo);
  // O mes abreviado no idioma do jogo (Intl): 'Jan', 'janv.', '1月'...
  const rotulo = (m: string) => new Date(m.slice(0, 7) + '-15T12:00:00').toLocaleDateString(localeDoIdioma(idiomaAtual()), { month: 'short' });
  const liquido = (i: number) => SERIES.reduce((s, c) => ligadas[c.k] ? s + (c.ganho ? 1 : -1) * (dados[c.k]?.[i] ?? 0) : s, 0);

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded border border-slate-100 dark:border-slate-800 flex flex-col gap-3">
      <div className="text-[10px] font-bold text-slate-400 uppercase">{tx('Monthly income and spending')}</div>
      <div className="flex flex-wrap gap-1.5">
        {SERIES.map(s => (
          <button key={s.k} type="button" onClick={() => setLigadas(p => ({ ...p, [s.k]: !p[s.k] }))}
            className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wide border transition ${ligadas[s.k] ? 'text-white' : 'text-slate-500 border-slate-300 dark:border-slate-700 opacity-60'}`}
            style={ligadas[s.k] ? { background: s.cor + '33', borderColor: s.cor } : undefined}>
            <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ background: s.cor, opacity: ligadas[s.k] ? 1 : 0.4 }} />{tx(s.en)}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" onMouseLeave={() => setSobre(null)}>
        {[0, 0.25, 0.5, 0.75, 1].map(f => <line key={f} x1={PAD_L} x2={W - PAD_L} y1={y(maximo * f)} y2={y(maximo * f)} stroke="currentColor" className="text-slate-300 dark:text-slate-800" strokeWidth={1} />)}
        {meses.map((m, i) => (meses[i] <= gameState.currentDate.slice(0, 7)) && [true, false].map(ganho => {
          let base = 0;
          return ativas.filter(c => c.ganho === ganho).map(c => {
            const v = dados[c.k]?.[i] ?? 0; if (v <= 0) return null;
            const topo = y(base + v), alt = y(base) - topo; base += v;
            return <rect key={m + c.k} x={ganho ? x(i) - larg - 1 : x(i) + 1} y={topo} width={larg} height={Math.max(0, alt)} fill={c.cor} opacity={sobre === null || sobre === i ? 1 : 0.55} />;
          });
        }))}
        {meses.map((m, i) => (
          <g key={m}>
            <text x={x(i)} y={H - 6} textAnchor="middle" className="fill-slate-400" style={{ fontSize: 11, fontWeight: 700 }}>{rotulo(m)}</text>
            <rect x={x(i) - Math.max(passo / 2, 12)} y={0} width={Math.max(passo, 24)} height={H} fill="transparent" onMouseEnter={() => setSobre(i)} />
          </g>
        ))}
      </svg>
      {/* Altura FIXA (3 linhas): passar o mouse nao muda o tamanho do cartao. Sem mouse mostra o mes actual. */}
      {(() => {
        const idx = sobre ?? Math.max(0, meses.indexOf(gameState.currentDate.slice(0, 7)));
        if (!meses[idx]) return <div className="h-[54px]" />;
        return (
          <div className="h-[54px] overflow-hidden text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap content-start gap-x-3 gap-y-0.5">
            <span className="font-black">{rotulo(meses[idx])} {meses[idx].slice(0, 4)}</span>
            <span className="font-black text-slate-700 dark:text-slate-200">{tx('Net')}: {formatCurrency(liquido(idx))}</span>
            {ativas.map(s => <span key={s.k} style={{ color: s.cor }}>{tx(s.en)}: {formatCurrency(dados[s.k][idx] || 0)}</span>)}
          </div>
        );
      })()}
    </div>
  );
};

export default FinanceMonthlyChart;
