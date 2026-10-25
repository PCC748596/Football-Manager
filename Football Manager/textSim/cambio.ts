/*
AS TAXAS DE CAMBIO do jogo: quantas unidades de cada moeda valem 1 dolar (o dinheiro do jogo e guardado em dolares). Alimentam o `formatCurrency` (a moeda de exibicao), a premiacao
das copas e ligas (reais e libras para dolares) e a economia do estadio. O jogador pode actualiza-las em Settings; ficam guardadas no navegador (`fm_cambio`).

Valores de partida (referencia actual): 1 USD = 5,21 BRL; 1 EUR = 5,63 BRL e 1,08 USD (1 USD = 0,89 EUR); 1 GBP = 6,71 BRL e 1,29 USD (1 USD = 0,775 GBP).
*/
export type MoedaCambio = 'BRL' | 'EUR' | 'GBP';
export const TAXAS_PADRAO: Record<MoedaCambio, number> = { BRL: 5.21, EUR: 0.89, GBP: 0.775 };
export const TAXAS: Record<MoedaCambio, number> = { ...TAXAS_PADRAO };
const CHAVE = 'fm_cambio';

try {
  const guardado = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(CHAVE) || 'null') : null;
  if (guardado) (Object.keys(TAXAS) as MoedaCambio[]).forEach(m => { const v = Number(guardado[m]); if (v > 0 && isFinite(v)) TAXAS[m] = v; });
} catch { /* sem armazenamento: ficam as de partida */ }

/** Muda uma ou mais taxas (valores invalidos ou <= 0 sao ignorados) e guarda-as. */
export const definirTaxas = (novas: Partial<Record<MoedaCambio, number>>) => {
  (Object.keys(novas) as MoedaCambio[]).forEach(m => { const v = Number(novas[m]); if (v > 0 && isFinite(v)) TAXAS[m] = v; });
  try { localStorage.setItem(CHAVE, JSON.stringify(TAXAS)); } catch { /* sem armazenamento */ }
};
export const restaurarTaxas = () => { (Object.keys(TAXAS) as MoedaCambio[]).forEach(m => { TAXAS[m] = TAXAS_PADRAO[m]; }); try { localStorage.removeItem(CHAVE); } catch { /* */ } };

/** `valor` na moeda dada, em dolares do jogo. */
export const paraDolares = (valor: number, moeda: MoedaCambio | 'USD'): number => (moeda === 'USD' ? valor : valor / TAXAS[moeda]);
