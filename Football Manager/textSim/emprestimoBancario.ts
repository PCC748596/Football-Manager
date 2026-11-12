/*
EMPRESTIMO BANCARIO (pedido: "implementar o emprestimo bancario, coloca la no financial") — o clube do utilizador pede dinheiro ao banco na aba Finance > Bank:
escolhe o VALOR e o PRAZO, o dinheiro entra no caixa NA HORA e as parcelas (amortizacao + juros, tabela Price) saem do caixa uma vez por MES, na mesma cadencia das
parcelas do patrocinio (textSim/patrocinadores.ts `pagarParcelas`): cada mes novo do calendario paga as parcelas vencidas. Tudo aqui e puro; o GameContext guarda o
resultado no `Team` (`emprestimos`, `movimentosBanco`), que vai no save (saves antigos: sem os campos = nenhum emprestimo).

A TAXA DE JUROS (ao ano) depende do clube:
  taxa = BASE (6%)
       + risco da reputacao: ate +8% (reputacao 0) .. 0% (reputacao 100)          — reputacaoDoClube: torcida, tradicao e forca
       - porte da liga: ate -1,5% (as ligas mais ricas, escalaDaLiga 4) .. 0%      — bancos emprestam mais barato a quem fatura em ligas grandes
       + alavancagem: ate +5%, proporcional a (divida depois do emprestimo / limite de credito)
       + caixa negativo: +2%
       + prazo: +0,25% por ano acima do primeiro
  limitada a 4%..25% ao ano.

O LIMITE (para nao virar dinheiro infinito): a divida total (saldo de todos os emprestimos) nunca passa de 50% da RECEITA ANUAL ESTIMADA do clube
(patrocinio anual + renda de bilheteria de uma temporada de jogos em casa; com um piso de metade da folha anual, para o clube sem patrocinio ainda conseguir credito).
No maximo 3 emprestimos ativos ao mesmo tempo; valor minimo de 50 mil; prazos de 6 a 60 meses.

QUITACAO ANTECIPADA: paga o saldo devedor mais 1% de tarifa, se houver caixa. Parcela vencida com o caixa sem fundos e debitada na mesma (o caixa fica negativo):
o banco nao perdoa — e o caixa negativo encarece o proximo emprestimo.
*/
import type { Team } from '../types';

export interface EmprestimoBancario {
  id: string;
  principal: number;        // o valor emprestado
  taxaAnual: number;        // ex.: 0.12 = 12% ao ano
  meses: number;            // prazo
  parcela: number;          // parcela fixa (Price)
  saldo: number;            // saldo devedor
  inicio: string;           // ISO: dia em que o dinheiro entrou
  fim: string;              // ISO: dia previsto da ultima parcela
  parcelasPagas: number;
  ultimoMes: string;        // yyyy-mm do ultimo processamento (o mes do inicio nao paga parcela)
  jurosPagos: number;
  quitado?: string;         // ISO: dia em que o saldo zerou (fica no historico)
}
export interface MovimentoBancario { id: string; data: string; tipo: 'CREDITO' | 'PARCELA' | 'QUITACAO'; valor: number; juros?: number; emprestimoId: string; }

export const BANCO = {
  taxaBase: 0.06, riscoReputacao: 0.08, descontoLiga: 0.015, alavancagem: 0.05, caixaNegativo: 0.02, porAno: 0.0025,
  taxaMin: 0.04, taxaMax: 0.25,
  fracaoDaReceita: 0.5,     // divida total maxima = 50% da receita anual estimada
  pisoFolha: 0.5,           // receita estimada nunca abaixo de metade da folha anual
  maxAtivos: 3, valorMin: 50_000, prazos: [6, 12, 24, 36, 48, 60], tarifaQuitacao: 0.01, maxMovimentos: 240,
};

const arred = (v: number) => Math.round(v);
const mesesEntre = (a: string, b: string): number => { const [ya, ma] = a.split('-').map(Number), [yb, mb] = b.split('-').map(Number); return (yb - ya) * 12 + (mb - ma); };
const somarMeses = (iso: string, n: number): string => {
  const [y, m, d] = iso.split('-').map(Number); const t = y * 12 + (m - 1) + n; const ny = Math.floor(t / 12), nm = (t % 12) + 1;
  const ult = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(d, ult)).padStart(2, '0')}`;
};

/** Os emprestimos ainda por pagar. */
export const emprestimosAtivos = (t: Pick<Team, 'emprestimos'>): EmprestimoBancario[] => (t.emprestimos || []).filter(e => !e.quitado && e.saldo > 0);
/** A divida bancaria total (soma dos saldos devedores). */
export const dividaTotal = (t: Pick<Team, 'emprestimos'>): number => emprestimosAtivos(t).reduce((s, e) => s + e.saldo, 0);
/** Quanto sai do caixa por mes com as parcelas de todos os emprestimos ativos. */
export const parcelasMensais = (t: Pick<Team, 'emprestimos'>): number => emprestimosAtivos(t).reduce((s, e) => s + Math.min(e.parcela, e.saldo * (1 + e.taxaAnual / 12)), 0);

/** A receita anual estimada do clube: patrocinio anual + bilheteria de uma temporada em casa; piso de metade da folha anual. */
export const receitaAnualEstimada = (e: { patrocinioAnual: number; rendaPorJogo: number; jogosEmCasa: number; folhaAnual: number }): number =>
  Math.max(e.patrocinioAnual + e.rendaPorJogo * Math.max(0, e.jogosEmCasa), e.folhaAnual * BANCO.pisoFolha, 0);

/** O teto da divida total e quanto ainda se pode pedir (teto - divida atual, nunca negativo). */
export const limiteDeCredito = (receitaAnual: number, dividaAtual: number): { teto: number; disponivel: number } => {
  const teto = Math.max(0, Math.round(receitaAnual * BANCO.fracaoDaReceita));
  return { teto, disponivel: Math.max(0, teto - dividaAtual) };
};

export interface PerfilDeCredito {
  reputacao: number;        // 0..100 (reputacaoDoClube)
  escalaLiga: number;       // 1..4 (escalaDaLiga)
  receitaAnual: number;
  dividaAtual: number;
  caixa: number;
}

/** A taxa de juros ao ano para pedir `valor` por `meses` (ver o bloco do topo). */
export const taxaDeJuros = (perfil: PerfilDeCredito, valor: number, meses: number): number => {
  const rep = Math.max(0, Math.min(100, perfil.reputacao));
  const escala = Math.max(1, Math.min(4, perfil.escalaLiga || 1));
  const { teto } = limiteDeCredito(perfil.receitaAnual, 0);
  const alav = teto > 0 ? Math.min(1, (perfil.dividaAtual + Math.max(0, valor)) / teto) : 1;
  const taxa = BANCO.taxaBase
    + BANCO.riscoReputacao * (1 - rep / 100)
    - BANCO.descontoLiga * (escala - 1) / 3
    + BANCO.alavancagem * alav
    + (perfil.caixa < 0 ? BANCO.caixaNegativo : 0)
    + BANCO.porAno * Math.max(0, meses / 12 - 1);
  return Math.round(Math.max(BANCO.taxaMin, Math.min(BANCO.taxaMax, taxa)) * 10000) / 10000;
};

/** A parcela fixa da tabela Price: P * i / (1 - (1 + i)^-n), com i = taxa mensal. */
export const parcelaPrice = (principal: number, taxaAnual: number, meses: number): number => {
  const i = taxaAnual / 12;
  if (meses <= 0) return principal;
  if (i <= 0) return principal / meses;
  return principal * i / (1 - Math.pow(1 + i, -meses));
};

export interface Simulacao { taxaAnual: number; parcela: number; totalJuros: number; total: number; disponivel: number; teto: number; }
/** O que o banco ofereceria: taxa, parcela e o custo total (para a tela mostrar antes de assinar). */
export const simularEmprestimo = (perfil: PerfilDeCredito, valor: number, meses: number): Simulacao => {
  const taxaAnual = taxaDeJuros(perfil, valor, meses);
  const parcela = arred(parcelaPrice(valor, taxaAnual, meses));
  const { teto, disponivel } = limiteDeCredito(perfil.receitaAnual, perfil.dividaAtual);
  return { taxaAnual, parcela, totalJuros: Math.max(0, parcela * meses - valor), total: parcela * meses, disponivel, teto };
};

export type MotivoCredito = 'VALOR_MINIMO' | 'PRAZO' | 'LIMITE' | 'MAX_ATIVOS';

/** Contrata o emprestimo: o dinheiro entra no caixa hoje; a primeira parcela vence no mes seguinte. */
export const contratarEmprestimo = (t: Team, perfil: PerfilDeCredito, valor: number, meses: number, hoje: string):
  { ok: true; team: Team; emprestimo: EmprestimoBancario } | { ok: false; motivo: MotivoCredito } => {
  const v = Math.round(valor);
  if (!(v >= BANCO.valorMin)) return { ok: false, motivo: 'VALOR_MINIMO' };
  if (!BANCO.prazos.includes(meses)) return { ok: false, motivo: 'PRAZO' };
  if (emprestimosAtivos(t).length >= BANCO.maxAtivos) return { ok: false, motivo: 'MAX_ATIVOS' };
  const p = { ...perfil, dividaAtual: dividaTotal(t) };
  if (v > limiteDeCredito(p.receitaAnual, p.dividaAtual).disponivel) return { ok: false, motivo: 'LIMITE' };
  const taxaAnual = taxaDeJuros(p, v, meses);
  const n = (t.emprestimos || []).length + 1;
  const emp: EmprestimoBancario = {
    id: `bank-${hoje}-${n}`, principal: v, taxaAnual, meses, parcela: arred(parcelaPrice(v, taxaAnual, meses)), saldo: v,
    inicio: hoje, fim: somarMeses(hoje, meses), parcelasPagas: 0, ultimoMes: hoje.slice(0, 7), jurosPagos: 0
  };
  const mov: MovimentoBancario = { id: `${emp.id}-cred`, data: hoje, tipo: 'CREDITO', valor: v, emprestimoId: emp.id };
  return { ok: true, emprestimo: emp, team: { ...t, cash: t.cash + v, emprestimos: [...(t.emprestimos || []), emp], movimentosBanco: [...(t.movimentosBanco || []), mov].slice(-BANCO.maxMovimentos) } };
};

export interface PagamentoParcela { emprestimoId: string; parcelas: number; valor: number; juros: number; quitou: boolean; }

/**
 * As parcelas vencidas ate `hoje`: uma por mes novo desde `ultimoMes` (saltar varios meses paga varias). Cada parcela paga os juros do mes sobre o saldo e amortiza o resto;
 * a ultima zera o saldo. Debita o caixa (pode ficar negativo). Devolve o MESMO clube se nada venceu.
 */
export const processarParcelas = (t: Team, hoje: string): { team: Team; pagamentos: PagamentoParcela[] } => {
  const mes = hoje.slice(0, 7);
  const lista = t.emprestimos || [];
  if (!lista.some(e => !e.quitado && e.saldo > 0 && mesesEntre(e.ultimoMes, mes) > 0)) return { team: t, pagamentos: [] };
  let caixa = t.cash;
  const movs: MovimentoBancario[] = [];
  const pagamentos: PagamentoParcela[] = [];
  const emprestimos = lista.map(e0 => {
    if (e0.quitado || e0.saldo <= 0) return e0;
    const vencidas = mesesEntre(e0.ultimoMes, mes);
    if (vencidas <= 0) return e0;
    let e = { ...e0 };
    let pago = 0, juros = 0, n = 0;
    for (let k = 0; k < vencidas && e.saldo > 0; k++) {
      const j = arred(e.saldo * e.taxaAnual / 12);
      const ultima = e.parcelasPagas + 1 >= e.meses;
      const valor = ultima ? e.saldo + j : Math.min(e.parcela, e.saldo + j);
      e = { ...e, saldo: Math.max(0, e.saldo - (valor - j)), parcelasPagas: e.parcelasPagas + 1, jurosPagos: e.jurosPagos + j };
      pago += valor; juros += j; n++;
    }
    e = { ...e, ultimoMes: mes, ...(e.saldo <= 0 ? { saldo: 0, quitado: hoje } : {}) };
    caixa -= pago;
    movs.push({ id: `${e.id}-p${e.parcelasPagas}`, data: hoje, tipo: 'PARCELA', valor: pago, juros, emprestimoId: e.id });
    pagamentos.push({ emprestimoId: e.id, parcelas: n, valor: pago, juros, quitou: !!e.quitado });
    return e;
  });
  return { team: { ...t, cash: caixa, emprestimos, movimentosBanco: [...(t.movimentosBanco || []), ...movs].slice(-BANCO.maxMovimentos) }, pagamentos };
};

/** O valor para quitar hoje: o saldo devedor mais a tarifa de 1%. */
export const valorDeQuitacao = (e: EmprestimoBancario): number => arred(e.saldo * (1 + BANCO.tarifaQuitacao));

/** Quitacao antecipada: paga saldo + tarifa (exige caixa suficiente). */
export const quitarEmprestimo = (t: Team, id: string, hoje: string): { ok: true; team: Team; valor: number } | { ok: false; motivo: 'INEXISTENTE' | 'SEM_CAIXA' } => {
  const e = emprestimosAtivos(t).find(x => x.id === id);
  if (!e) return { ok: false, motivo: 'INEXISTENTE' };
  const valor = valorDeQuitacao(e);
  if (t.cash < valor) return { ok: false, motivo: 'SEM_CAIXA' };
  const mov: MovimentoBancario = { id: `${e.id}-quit`, data: hoje, tipo: 'QUITACAO', valor, emprestimoId: e.id };
  return {
    ok: true, valor,
    team: { ...t, cash: t.cash - valor, emprestimos: (t.emprestimos || []).map(x => (x.id === id ? { ...x, saldo: 0, quitado: hoje, ultimoMes: hoje.slice(0, 7) } : x)), movimentosBanco: [...(t.movimentosBanco || []), mov].slice(-BANCO.maxMovimentos) }
  };
};
