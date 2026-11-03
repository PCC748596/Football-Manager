/*
DIVISAO DO ORCAMENTO DA TEMPORADA: o orcamento (capital inicial + patrocinio anual do contrato) e dividido entre compras (transfer budget) e salarios.
A fracao das compras vai de 0% a 100% em passos de 10% (padrao 80%, `PADRAO_COMPRAS`). `initialTransfer` guarda o valor das compras; o `transferBudget` (o que ainda se pode gastar)
acompanha a diferenca, sem nunca ficar negativo, para que o que ja foi gasto continue gasto.
*/
import type { Team } from '../types';

export const PADRAO_COMPRAS = 0.8;
export const PASSO_COMPRAS = 0.1;

/** O orcamento da temporada: capital inicial mais o patrocinio anual do contrato ativo. */
export const orcamentoDaTemporada = (t: Team): number => (t.initialCapital || 0) + (t.sponsorContract?.valorAnualUSD || 0);

/** Arredonda a fracao para o passo de 10% e limita a 0..1. */
export const fracaoValida = (f: number): number => Math.min(1, Math.max(0, Math.round(f / PASSO_COMPRAS) / Math.round(1 / PASSO_COMPRAS)));

/** Aplica a divisao `compras` (0..1) ao clube: novo `initialTransfer` e `transferBudget` ajustado pela diferenca. */
export const aplicarDivisao = (t: Team, compras: number): Team => {
  const pct = fracaoValida(compras);
  const novo = Math.round(orcamentoDaTemporada(t) * pct);
  const antigo = t.initialTransfer ?? 0;
  return { ...t, transferPct: pct, initialTransfer: novo, transferBudget: Math.max(0, (t.transferBudget ?? antigo) + novo - antigo) };
};
