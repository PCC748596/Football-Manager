/*
ECONOMIA POR LIGA: valor de mercado e salario de referencia (em EUR, convertidos para dolares do jogo pelo cambio).
  valor   = tabela por overall (jogador de 24-27 anos, liga neutra, contrato de 3 anos) x `valor` da liga (textSim/valuation.ts aplica idade, potencial, contrato, posicao e forma)
  salario = `salario` da liga (mensal de um overall 75) x curva por overall x idade; semanal = mensal / 4,33
O multiplicador de valor da liga e o EFETIVO (o que da o valor do estudo de caso: overall 75 vale ~14,5 M na Premier, ~9 M no Brasil A, ~5 M na Ligue 2); o `salario` e o mensal de um overall 75 da tabela de salarios.
As Series A-D do Brasil usam a mesma formula, com uma curva de salario por overall mais achatada (`CURVA_SALARIO_BRASIL`).
*/
import { paraDolares } from './cambio';

/** Um fator fixo do jogador, de 1 - amp a 1 + amp, tirado do id (o mesmo jogador da sempre o mesmo). */
export const fatorIndividual = (id: string, amp: number): number => {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return 1 - amp + 2 * amp * ((h >>> 0) / 4294967296);
};


/** Valor de mercado (EUR) por overall, na liga neutra (multiplicador 1,0). Interpolacao geometrica entre pontos. */
export const VALOR_POR_OVERALL: [number, number][] = [[50, 25_000], [55, 75_000], [60, 250_000], [65, 850_000], [70, 3_000_000], [75, 10_000_000], [80, 35_000_000], [85, 75_000_000], [90, 130_000_000], [95, 200_000_000]];
/** Salario relativo ao do overall 75 (Premier: 60 = 15 mil, 70 = 120 mil, 75 = 450 mil, 85 = 2,2 M por mes). */
export const CURVA_SALARIO: [number, number][] = [[50, 0.004], [55, 0.012], [60, 0.033], [65, 0.1], [70, 0.267], [75, 1], [80, 2.2], [85, 4.89], [90, 8], [95, 12]];

/** Brasil: 60 = 8 mil, 70 = 45 mil, 75 = 110 mil, 82 = 400 mil por mes na Serie A. */
export const CURVA_SALARIO_BRASIL: [number, number][] = [[50, 0.01], [55, 0.03], [60, 0.073], [65, 0.2], [70, 0.41], [75, 1], [82, 3.64], [90, 7], [95, 10]];

export interface EconomiaLiga { valor: number; salario: number }
/** Por id de liga: multiplicador de valor e salario mensal (EUR) de um overall 75. */
export const ECONOMIA_LIGAS: Record<string, EconomiaLiga> = {
  eng_prem: { valor: 1.45, salario: 450_000 }, eng_champ: { valor: 0.55, salario: 120_000 }, eng_l1: { valor: 0.2, salario: 25_000 }, eng_l2: { valor: 0.1, salario: 12_000 },
  esp_laliga: { valor: 1.15, salario: 320_000 }, esp_segunda: { valor: 0.4, salario: 65_000 },
  ger_bundesliga: { valor: 1.1, salario: 300_000 }, ger_2bundesliga: { valor: 0.38, salario: 55_000 },
  ita_seriea: { valor: 1.1, salario: 280_000 }, ita_serieb: { valor: 0.4, salario: 60_000 },
  fra_ligue1: { valor: 1.0, salario: 250_000 }, fra_ligue2: { valor: 0.5, salario: 40_000 },
  por_liga: { valor: 0.6, salario: 90_000 }, por_liga2: { valor: 0.2, salario: 20_000 },
  arg_serie_a: { valor: 0.45, salario: 35_000 },
  bra_serie_a: { valor: 0.9, salario: 110_000 }, bra_serie_b: { valor: 0.3, salario: 35_000 }, bra_serie_c: { valor: 0.12, salario: 12_000 }, bra_serie_d: { valor: 0.05, salario: 5_000 },
  bra_clubes: { valor: 0.05, salario: 5_000 },
  // (Nov/2026) as outras ligas sul-americanas tinham todas a economia padrao (um 60 valia ~110 mil igual na Venezuela e no Chile): a ordem segue o porte do futebol de cada pais
  chi_serie_a: { valor: 0.35, salario: 25_000 }, col_serie_a: { valor: 0.35, salario: 22_000 }, uru_serie_a: { valor: 0.3, salario: 18_000 }, equ_serie_a: { valor: 0.3, salario: 18_000 },
  par_serie_a: { valor: 0.25, salario: 15_000 }, per_serie_a: { valor: 0.2, salario: 12_000 }, bol_serie_a: { valor: 0.15, salario: 8_000 }, ven_serie_a: { valor: 0.15, salario: 8_000 },
  // os clubes avulsos da Europa (os 5 maiores de cada pais, sem liga no jogo): o porte da liga deles
  ned_clubes: { valor: 0.6, salario: 80_000 }, tur_clubes: { valor: 0.55, salario: 90_000 }, bel_clubes: { valor: 0.5, salario: 60_000 }, aut_clubes: { valor: 0.4, salario: 40_000 },
  gre_clubes: { valor: 0.4, salario: 45_000 }, nor_clubes: { valor: 0.35, salario: 35_000 }, ukr_clubes: { valor: 0.35, salario: 35_000 }, cze_clubes: { valor: 0.3, salario: 30_000 },
  svk_clubes: { valor: 0.2, salario: 15_000 }, aze_clubes: { valor: 0.2, salario: 20_000 },
};
/** Ligas sem entrada: uma liga mediana de um pais menor. */
export const ECONOMIA_PADRAO: EconomiaLiga = { valor: 0.4, salario: 40_000 };

const ligaDoClube = new Map<string, string>();
/** Regista a liga de cada clube (o valor depende dela). Chamar ao gerar uma liga e quando os clubes mudam de divisao. */
export const registrarLigas = (teams: { id: string; leagueId?: string }[]) => { for (const t of teams) if (t.leagueId) ligaDoClube.set(t.id, t.leagueId); };
export const economiaDaLiga = (leagueId?: string): EconomiaLiga => (leagueId && ECONOMIA_LIGAS[leagueId]) || ECONOMIA_PADRAO;
/** A economia do clube; sem liga registada (ex.: testes) o multiplicador e neutro (1,0). */
export const economiaDoClube = (teamId: string): EconomiaLiga | undefined => { const l = ligaDoClube.get(teamId); return l ? economiaDaLiga(l) : undefined; };

/** Interpolacao geometrica (linear no log) pela tabela; fora dela, extrapola com a razao do ultimo/primeiro troco. */
const geometrica = (tab: [number, number][], x: number): number => {
  let i = 1;
  if (x >= tab[tab.length - 1][0]) i = tab.length - 1; else while (i < tab.length - 1 && x > tab[i][0]) i++;
  const [x0, y0] = tab[i - 1], [x1, y1] = tab[i];
  return y0 * Math.pow(y1 / y0, (x - x0) / (x1 - x0));
};

/** O valor base (EUR) de um overall, na liga neutra. */
export const valorBaseEUR = (overall: number): number => geometrica(VALOR_POR_OVERALL, Math.max(40, Math.min(99, overall)));

const FATOR_IDADE_SALARIO: [number, number][] = [[16, 0.4], [19, 0.55], [21, 0.8], [23, 1], [30, 1], [33, 0.85], [36, 0.65], [40, 0.5]];
const porPontos = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
  return pts[pts.length - 1][1];
};

/** Salario mensal (EUR) de mercado de um jogador numa liga. */
/*
O PISO DO SALARIO e da liga: 1,2% do salario de um 75 da liga, nunca abaixo de 300 EUR/mes (Premier ~5400, Serie A ~1300, Serie D e ligas pequenas 300).
(Nov/2026: era 1500 EUR/mes para todas: nas ligas pequenas quase todo o elenco caia no piso e ganhava o mesmo, qualquer que fosse o overall.)
*/
/** A curva achatada (a do Brasil) vale tambem para as ligas pequenas (salario de um 75 abaixo de 100 mil/mes): com a curva da Premier, nelas quase todo o elenco caia no piso. */
const curvaAchatada = (leagueId?: string): boolean => !!leagueId && (leagueId.startsWith('bra_') || economiaDaLiga(leagueId).salario < 100_000);

export const pisoSalarialEUR = (leagueId?: string): number => Math.max(300, Math.round(economiaDaLiga(leagueId).salario * 0.012));

export const salarioMensalEUR = (overall: number, idade: number, leagueId?: string): number =>
  Math.max(pisoSalarialEUR(leagueId), Math.round(economiaDaLiga(leagueId).salario * geometrica(curvaAchatada(leagueId) ? CURVA_SALARIO_BRASIL : CURVA_SALARIO, Math.max(45, Math.min(99, overall))) * porPontos(FATOR_IDADE_SALARIO, idade) / 50) * 50);

/*
O salario semanal em dolares do jogo (`Player.salary`). Com a `semente` (o id do jogador) entra um fator individual (+-8%), e quem fica no PISO da liga (`pisoSalarialEUR`)
ganha de 0 a 30% acima dele: medido no mundo inteiro (Nov/2026), 4271 jogadores (1 em cada 3) tinham exatamente o mesmo salario, 389/semana.
Arredonda-se pela grandeza: de 5 em 5 ate mil, de 50 em 50 ate 10 mil, de 500 em 500 acima.
*/
export const salarioSemanalDoMercado = (overall: number, idade: number, leagueId?: string, semente?: string): number => {
  let s = paraDolares(salarioMensalEUR(overall, idade, leagueId), 'EUR') / 4.33;
  if (semente) {
    const piso = paraDolares(pisoSalarialEUR(leagueId), 'EUR') / 4.33;
    s *= s <= piso * 1.001 ? 1 + 0.3 * (fatorIndividual(semente + '|piso', 0.5) - 0.5) : fatorIndividual(semente, 0.08);
  }
  const passo = s < 1_000 ? 5 : s < 10_000 ? 50 : 500;
  return Math.max(60, Math.round(s / passo) * passo);   // o piso real e o da liga (pisoSalarialEUR); este so impede o zero
};

/** Escala do patrocinio e dos premios em dinheiro pelo porte da liga (salario de um overall 75 / 110 mil, a Serie A do Brasil = 1): de 1 a 4. As divisoes menores ficam com os valores base. */
export const escalaDaLiga = (leagueId?: string): number => Math.max(1, Math.min(4, economiaDaLiga(leagueId).salario / 110_000));
