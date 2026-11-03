/*
SALARIOS DA SERIE A, B, C E D DO BRASIL (reais POR MES): uma curva so, a da Serie A, e as outras divisoes sao percentuais dela.
  Serie A: minimo R$ 50 000, media R$ 150 000, maximo R$ 2 500 000. Serie B: 50% da A; Serie C: 25%; Serie D: 15%. Sub-20: 20% da media da serie do clube.
O nivel do jogador e o percentil do overall entre os jogadores da propria liga (0 = pior, 1 = melhor). A curva e `min + (max - min) * p^k`, com k escolhido para a media da liga dar a media pedida
(poucos jogadores ganham perto do maximo, a maioria perto do minimo). A tabela do jogo e o salario semanal em dolares (`Player.salary`): o mensal em BRL converte-se pelas taxas de Settings (cambio.ts) e por 4,33 semanas.
As outras ligas continuam com 0,2% do valor por semana.
*/
import type { Player, Team } from '../types';
import type { BaseState } from './youth';
import { paraDolares } from './cambio';

export const SEMANAS_NO_MES = 4.33;

/** A curva da Serie A (R$ por mes). */
export const CURVA_A = { min: 50_000, media: 150_000, max: 2_500_000 };
/** A fracao da curva da Serie A que cada divisao paga. */
export const SERIES_SALARIOS: Record<string, { fracao: number }> = {
  bra_serie_a: { fracao: 1 }, bra_serie_b: { fracao: 0.5 }, bra_serie_c: { fracao: 0.25 }, bra_serie_d: { fracao: 0.15 },
};
/** O Sub-20 ganha esta fracao da media da serie (de 10% a 30% da media, subindo com o overall: ver `salarioDoJovem`). */
export const FRACAO_SUB20 = 0.2;

const EXPOENTE = (CURVA_A.max - CURVA_A.min) / (CURVA_A.media - CURVA_A.min) - 1;
const arredondar = (v: number) => Math.round(v / 50) * 50;

/** O salario mensal em reais de um jogador no percentil `p` (0 = pior da liga, 1 = melhor); null se a liga nao tem tabela. */
export const salarioMensalBRL = (leagueId: string, p: number): number | null => {
  const tab = SERIES_SALARIOS[leagueId];
  if (!tab) return null;
  const q = Math.min(1, Math.max(0, p));
  return arredondar(tab.fracao * (CURVA_A.min + (CURVA_A.max - CURVA_A.min) * Math.pow(q, EXPOENTE)));
};

/** O salario semanal em dolares do jogo (o `Player.salary`) para o mensal em reais. */
export const salarioSemanalUSD = (mensalBRL: number): number => Math.max(10, Math.round(paraDolares(mensalBRL, 'BRL') / SEMANAS_NO_MES));

/** Percentil (0..1) do overall de cada jogador entre os da lista (empates dividem a posicao). */
export const percentisDeNivel = (skills: number[]): number[] => {
  if (skills.length < 2) return skills.map(() => 0.5);
  return skills.map(v => { const abaixo = skills.filter(x => x < v).length, iguais = skills.filter(x => x === v).length; return (abaixo + (iguais - 1) / 2) / (skills.length - 1); });
};

/** Os salarios semanais (USD) dos jogadores de uma liga com tabela, ou null se a liga nao tem. */
export const salariosDaLiga = (leagueId: string, skills: number[]): number[] | null => {
  if (!SERIES_SALARIOS[leagueId]) return null;
  return percentisDeNivel(skills).map(p => salarioSemanalUSD(salarioMensalBRL(leagueId, p) as number));
};

/**
 * O salario de mercado (semanal, USD) de um jogador que joga numa liga com tabela: o do nivel dele entre os jogadores da liga.
 * `undefined` nas outras ligas (la vale 0,2% do valor por semana). Usado no pedido de renovacao (`propostaDoJogador`).
 */
export const salarioDeMercadoDaLiga = (p: Player, teams: Team[], players: Player[]): number | undefined => {
  const liga = teams.find(t => t.id === p.teamId)?.leagueId;
  if (!liga || !SERIES_SALARIOS[liga]) return undefined;
  const ids = new Set(teams.filter(t => t.leagueId === liga).map(t => t.id));
  const skills = players.filter(x => ids.has(x.teamId)).map(x => x.skill);
  const abaixo = skills.filter(v => v < p.skill).length, iguais = Math.max(1, skills.filter(v => v === p.skill).length);
  const pct = skills.length > 1 ? (abaixo + (iguais - 1) / 2) / (skills.length - 1) : 0.5;
  return salarioSemanalUSD(salarioMensalBRL(liga, pct) as number);
};

/** O salario semanal (USD) de um jovem da base: 20% da media da serie, de 0,5x (overall 55 ou menos) a 1,5x (overall 85 ou mais). `undefined` nas ligas sem tabela. */
export const salarioDoJovem = (leagueId: string | undefined, skill: number): number | undefined => {
  const tab = leagueId ? SERIES_SALARIOS[leagueId] : undefined;
  if (!tab) return undefined;
  const t = Math.min(1, Math.max(0, (skill - 55) / 30));
  return salarioSemanalUSD(arredondar(FRACAO_SUB20 * tab.fracao * CURVA_A.media * (0.5 + t)));
};

/** Poe nos jovens das ligas com tabela o salario da faixa Sub-20 da liga (idempotente: devolve a MESMA base se nada mudou). */
export const ajustarSalariosDaBase = (base: BaseState, teams: Team[]): BaseState => {
  const ligaDe = new Map(teams.map(t => [t.id, t.leagueId] as const));
  let mudou = false;
  const jogadores = base.jogadores.map(j => {
    const alvo = salarioDoJovem(ligaDe.get(j.teamId), j.skill);
    if (alvo === undefined || alvo === j.salary) return j;
    mudou = true;
    return { ...j, salary: alvo };
  });
  return mudou ? { ...base, jogadores } : base;
};
