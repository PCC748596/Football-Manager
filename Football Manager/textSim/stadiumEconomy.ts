import type { Team, Fixture } from '../types';

/*
=====================================================================
ECONOMIA DO ESTADIO — ocupacao, renda do jogo e custo por partida
=====================================================================
Tudo o que se balanceia vive em ECONOMIA_ESTADIO; as contas sao tres funcoes pequenas.

OCUPACAO-BASE. No inicio do campeonato e 70% da capacidade, e acumula ao longo da temporada (minimo 20%, maximo 100%). Depois de cada jogo do time (em casa ou fora),
em PONTOS PERCENTUAIS da ocupacao-base:
    vitoria              +5
    derrota              -5
    1.o empate seguido    0
    2.o empate seguido   -2
    3.o e seguintes      -5 por jogo
    (vitoria ou derrota zera a contagem de empates seguidos)
BONUS DA PARTIDA (so naquele jogo; nao mexem na base): classico +10, jogo decisivo +10, final +20 (a final nao soma o decisivo).
PUBLICO = capacidade x ocupacao final, nunca acima dos lugares.

RENDA. Publico (capacidade x ocupacao) x preco medio do ingresso. A renda e do MANDANTE.
    Preco medio (na moeda do jogo): 20 USD, 20 EUR, 100 BRL.

CUSTO por partida (o mandante paga). Depende da capacidade e do tipo de jogo, nao do publico:
    base por faixa de capacidade (em reais), estadio proprio -30%, classico x1,2, final x1,4.
O dinheiro do jogo e guardado em dolares (o `formatCurrency` converte para a moeda de exibicao a 5 BRL por USD), por isso o custo em reais entra dividido por 5.
=====================================================================
*/
export type CurrencyCode = 'USD' | 'EUR' | 'BRL';
export type MatchKind = 'NORMAL' | 'CLASSICO' | 'FINAL';

export const ECONOMIA_ESTADIO = {
  ocupacaoInicial: 0.70,
  ocupacaoMinima: 0.20,
  ocupacaoMaxima: 1.00,
  vitoria: 0.05,
  derrota: -0.05,
  /** Variacao da base por empate seguido: o 1.o nao muda, o 2.o -2, o 3.o e seguintes -5. */
  empatesSeguidos: [0, -0.02, -0.05],
  /** Bonus temporarios da partida (somam-se a base so nesse jogo). */
  bonus: { CLASSICO: 0.10, DECISIVO: 0.10, FINAL: 0.20 },
  /** O jogo decisivo: marcado em `Fixture.isDecisive`, ou qualquer jogo de liga das ultimas `ultimasJornadasDecisivas` jornadas. */
  ultimasJornadasDecisivas: 3,
  /** Preco medio do ingresso, na moeda de exibicao. */
  precoIngresso: { USD: 20, EUR: 20, BRL: 100 } as Record<CurrencyCode, number>,
  /** Quantos reais valem um dolar do jogo (o mesmo do formatCurrency). */
  reaisPorDolar: 5,
  /** Custo base por jogo, em reais, pela capacidade (lugares): ate `ate` inclusive. */
  custoBaseBRL: [
    { ate: 10000, custo: 50000 },
    { ate: 20000, custo: 80000 },
    { ate: 30000, custo: 120000 },
    { ate: 45000, custo: 170000 },
    { ate: 60000, custo: 230000 },
    { ate: 80000, custo: 300000 },
    { ate: Infinity, custo: 400000 },
  ],
  descontoEstadioProprio: 0.30,
  multiplicadorTipo: { NORMAL: 1.0, CLASSICO: 1.2, FINAL: 1.4 } as Record<MatchKind, number>,
  /** Estadios alugados (o resto e proprio, salvo `Team.stadiumOwned`). */
  estadiosAlugados: ['Maracanã', 'Estádio do Maracanã', 'Mineirão', 'Mané Garrincha', 'Arena Castelão', 'Castelão', 'Fonte Nova', 'Arena Fonte Nova', 'Arena Pantanal', 'Serra Dourada', 'Couto Pereira'],
};

export const isStadiumOwned = (team: Pick<Team, 'stadium'> & { stadiumOwned?: boolean }): boolean =>
  team.stadiumOwned !== undefined ? !!team.stadiumOwned : !ECONOMIA_ESTADIO.estadiosAlugados.includes(team.stadium);

/** Custo de uma partida no estadio, em REAIS. */
export const stadiumMatchCostBRL = (capacity: number, owned: boolean, kind: MatchKind = 'NORMAL'): number => {
  const faixa = ECONOMIA_ESTADIO.custoBaseBRL.find(f => capacity <= f.ate)!;
  return Math.round(faixa.custo * (owned ? 1 - ECONOMIA_ESTADIO.descontoEstadioProprio : 1) * ECONOMIA_ESTADIO.multiplicadorTipo[kind]);
};

/** O mesmo custo na moeda interna do jogo (dolares). */
export const stadiumMatchCostUSD = (capacity: number, owned: boolean, kind: MatchKind = 'NORMAL'): number =>
  stadiumMatchCostBRL(capacity, owned, kind) / ECONOMIA_ESTADIO.reaisPorDolar;

/** Preco do ingresso em dolares do jogo, a partir do preco na moeda de exibicao. */
export const ticketPriceUSD = (currency: CurrencyCode): number => {
  const p = ECONOMIA_ESTADIO.precoIngresso[currency] ?? ECONOMIA_ESTADIO.precoIngresso.USD;
  return currency === 'EUR' ? p / 0.92 : currency === 'BRL' ? p / ECONOMIA_ESTADIO.reaisPorDolar : p;
};

/** A ocupacao-base e a contagem de empates seguidos depois de um resultado (do ponto de vista do time). */
export const applyResult = (base: number, drawStreak: number, result: 'W' | 'D' | 'L'): { base: number; drawStreak: number } => {
  const E = ECONOMIA_ESTADIO;
  let d = 0, streak = 0;
  if (result === 'W') d = E.vitoria;
  else if (result === 'L') d = E.derrota;
  else { streak = drawStreak + 1; d = E.empatesSeguidos[Math.min(streak, E.empatesSeguidos.length) - 1]; }
  return { base: Math.min(E.ocupacaoMaxima, Math.max(E.ocupacaoMinima, base + d)), drawStreak: streak };
};

/** O bonus de importancia do jogo (so naquele jogo): final +20; senao classico +10 e/ou decisivo +10. */
export const matchBonus = (kind: MatchKind, decisive: boolean): number => {
  const B = ECONOMIA_ESTADIO.bonus;
  if (kind === 'FINAL') return B.FINAL;
  return (kind === 'CLASSICO' ? B.CLASSICO : 0) + (decisive ? B.DECISIVO : 0);
};

/** Classico: os dois times do mesmo estado (o mesmo criterio do motor de jogo). Final: o jogo marcado como `isFinal`. */
export const matchKind = (fixture: Fixture & { isFinal?: boolean }, home: Team, away: Team): MatchKind => {
  if ((fixture as any).isFinal) return 'FINAL';
  const estado = (n: string) => n.split('-').pop()?.trim() || '';
  const a = estado(home.name), b = estado(away.name);
  return a.length > 0 && a === b ? 'CLASSICO' : 'NORMAL';
};

export interface MatchSettlement {
  attendance: number; occupancy: number; revenueUSD: number; costUSD: number; kind: MatchKind;
}

/** A renda e o custo de um jogo (antes de actualizar a ocupacao). */
export const settleMatch = (home: Team, away: Team, fixture: Fixture, currency: CurrencyCode, decisive = false): MatchSettlement => {
  const capacity = home.stadiumCapacity || 20000;
  const kind = matchKind(fixture, home, away);
  const base = (home as any).stadiumOccupancy ?? ECONOMIA_ESTADIO.ocupacaoInicial;
  const occupancy = Math.min(ECONOMIA_ESTADIO.ocupacaoMaxima, base + matchBonus(kind, decisive));   // o bonus e so deste jogo: a base nao muda
  const attendance = Math.min(capacity, Math.round(capacity * occupancy));
  return {
    attendance, occupancy, kind,
    revenueUSD: attendance * ticketPriceUSD(currency),
    costUSD: stadiumMatchCostUSD(capacity, isStadiumOwned(home as any), kind),
  };
};
