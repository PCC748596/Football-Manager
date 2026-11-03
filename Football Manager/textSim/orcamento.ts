/*
DIVISAO DO ORCAMENTO DA TEMPORADA: o orcamento (capital inicial + patrocinio anual do contrato) e dividido entre compras (transfer budget) e salarios.
A fracao das compras vai de 0% a 100% em passos de 5% (padrao 80%, `PADRAO_COMPRAS`), mas a parte dos salarios nunca fica abaixo da folha anual do elenco (`folhaAnual`): isso limita o maximo das compras.
`initialTransfer` guarda o valor das compras; o `transferBudget` (o que ainda se pode gastar) acompanha a diferenca, sem nunca ficar negativo, para que o que ja foi gasto continue gasto.
*/
import type { Team } from '../types';

export const PADRAO_COMPRAS = 0.8;
export const PASSO_COMPRAS = 0.05;
const PASSOS = Math.round(1 / PASSO_COMPRAS);
export const SEMANAS_NO_ANO = 52;

/** O orcamento da temporada: capital inicial mais o patrocinio anual do contrato ativo. */
export const orcamentoDaTemporada = (t: Team): number => (t.initialCapital || 0) + (t.sponsorContract?.valorAnualUSD || 0);

/** A folha anual: a soma dos salarios semanais do elenco x 52 semanas. */
export const folhaAnual = (salariosSemanais: number[]): number => salariosSemanais.reduce((s, v) => s + v, 0) * SEMANAS_NO_ANO;

/** Arredonda a fracao para o passo de 5% e limita a 0..1. */
export const fracaoValida = (f: number): number => Math.min(1, Math.max(0, Math.round(f * PASSOS) / PASSOS));

/** A maior fracao de compras possivel: o que sobra depois da folha anual, no passo de 5% para baixo (0 se a folha ja passa do orcamento). */
export const maxCompras = (t: Team, folha: number): number => {
  const pool = orcamentoDaTemporada(t);
  if (pool <= 0) return 0;
  return Math.min(1, Math.max(0, Math.floor((1 - folha / pool) * PASSOS + 1e-9) / PASSOS));
};

/** Aplica a divisao `compras` (0..1) ao clube, limitada por `maxCompras`: novo `initialTransfer` e `transferBudget` ajustado pela diferenca. */
export const aplicarDivisao = (t: Team, compras: number, folha = 0): Team => {
  const pct = Math.min(fracaoValida(compras), maxCompras(t, folha));
  const novo = Math.round(orcamentoDaTemporada(t) * pct);
  const antigo = t.initialTransfer ?? 0;
  return { ...t, transferPct: pct, initialTransfer: novo, transferBudget: Math.max(0, (t.transferBudget ?? antigo) + novo - antigo) };
};
