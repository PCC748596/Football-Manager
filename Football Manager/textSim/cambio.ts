/*
AS TAXAS DE CAMBIO do jogo: quantas unidades de cada moeda valem 1 dolar (o dinheiro do jogo e guardado em dolares). Alimentam o `formatCurrency` (a moeda de exibicao), a premiacao
das copas e ligas (reais e libras para dolares) e a economia do estadio. O jogador pode actualiza-las em Settings; ficam guardadas no navegador (`fm_cambio`).

Valores de partida (referencia actual): 1 USD = 5,21 BRL; 1 EUR = 5,63 BRL e 1,08 USD (1 USD = 0,89 EUR); 1 GBP = 6,71 BRL e 1,29 USD (1 USD = 0,775 GBP).
*/
export type MoedaCambio = 'BRL' | 'EUR' | 'GBP';
/** O evento que a interface ouve (GameContext) para redesenhar os valores quando as taxas mudam. */
export const EVENTO_CAMBIO = 'fm-cambio';
const avisarMudanca = () => { try { if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_CAMBIO)); } catch { /* */ } };
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
  avisarMudanca();
};
export const restaurarTaxas = () => { (Object.keys(TAXAS) as MoedaCambio[]).forEach(m => { TAXAS[m] = TAXAS_PADRAO[m]; }); try { localStorage.removeItem(CHAVE); } catch { /* */ } avisarMudanca(); };

/** `valor` na moeda dada, em dolares do jogo. */
export const paraDolares = (valor: number, moeda: MoedaCambio | 'USD'): number => (moeda === 'USD' ? valor : valor / TAXAS[moeda]);

// ATUALIZACAO AUTOMATICA: busca as taxas do dia numa API publica (sem chave) e grava-as. Sem rede ou com resposta invalida nada muda (ficam as guardadas). Ligada por omissao; Settings desliga-a e
// tambem tem o botao de actualizar ja. Corre ao abrir o jogo, no maximo uma vez a cada 12 horas.
const CHAVE_AUTO = 'fm_cambio_auto', CHAVE_QUANDO = 'fm_cambio_quando', CHAVE_TENTATIVA = 'fm_cambio_tentativa';
const HORA = 3600 * 1000;
const FONTES = ['https://open.er-api.com/v6/latest/USD', 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json'];
export const cambioAutomatico = (): boolean => { try { return localStorage.getItem(CHAVE_AUTO) !== '0'; } catch { return true; } };
export const definirCambioAutomatico = (ligado: boolean) => { try { localStorage.setItem(CHAVE_AUTO, ligado ? '1' : '0'); } catch { /* */ } };
export const ultimaAtualizacaoDoCambio = (): number => { try { return Number(localStorage.getItem(CHAVE_QUANDO)) || 0; } catch { return 0; } };

/** Busca as taxas online. Devolve as novas (e guarda-as), ou null se nao foi possivel. */
export const buscarTaxasOnline = async (): Promise<Record<MoedaCambio, number> | null> => {
  try { localStorage.setItem(CHAVE_TENTATIVA, String(Date.now())); } catch { /* */ }
  for (const url of FONTES) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) continue;
      const j = await r.json();
      const t = j.rates || j.usd || {};
      const novas: Partial<Record<MoedaCambio, number>> = {};
      (['BRL', 'EUR', 'GBP'] as MoedaCambio[]).forEach(m => { const v = Number(t[m] ?? t[m.toLowerCase()]); if (v > 0 && isFinite(v)) novas[m] = Math.round(v * 1000) / 1000; });
      if (Object.keys(novas).length < 3) continue;
      definirTaxas(novas);
      try { localStorage.setItem(CHAVE_QUANDO, String(Date.now())); } catch { /* */ }
      return { ...TAXAS };
    } catch { /* tenta a proxima fonte */ }
  }
  return null;
};

/** Ao abrir o jogo (sem o atrasar): actualiza se estiver ligado, a ultima atualizacao tiver mais de 12 h e a ultima tentativa mais de 1 h. A interface redesenha pelo EVENTO_CAMBIO. */
export const atualizarCambioAoAbrir = async (): Promise<void> => {
  let tentativa = 0;
  try { tentativa = Number(localStorage.getItem(CHAVE_TENTATIVA)) || 0; } catch { /* */ }
  if (!cambioAutomatico() || Date.now() - ultimaAtualizacaoDoCambio() < 12 * HORA || Date.now() - tentativa < HORA) return;
  await buscarTaxasOnline();
};
