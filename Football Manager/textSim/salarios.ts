/*
SALARIOS: todas as ligas usam a economia de textSim/economia.ts (salario mensal por overall, idade e liga; semanal = mensal / 4,33, em dolares do jogo pelo cambio). O Sub-20 ganha 25% do salario
de mercado de um profissional de 25 anos com o mesmo overall.
*/
import type { Player, Team } from '../types';
import type { BaseState } from './youth';
import { salarioSemanalDoMercado } from './economia';

export const SEMANAS_NO_MES = 4.33;
/** O Sub-20 ganha esta fracao do salario de mercado adulto. */
export const FRACAO_SUB20 = 0.25;

/** O salario de mercado (semanal, USD) de um jogador na liga do clube dele; `undefined` se o clube nao e encontrado. Usado no pedido de renovacao (`propostaDoJogador`). */
export const salarioDeMercadoDaLiga = (p: Player, teams: Team[], _players?: Player[]): number | undefined => {
  const liga = teams.find(t => t.id === p.teamId)?.leagueId;
  return liga ? salarioSemanalDoMercado(p.skill, p.age, liga) : undefined;
};

/** O salario semanal (USD) de um jovem da base. `undefined` sem liga. */
export const salarioDoJovem = (leagueId: string | undefined, skill: number): number | undefined =>
  leagueId ? Math.max(300, Math.round(FRACAO_SUB20 * salarioSemanalDoMercado(skill, 25, leagueId))) : undefined;

/** Poe nos jovens o salario da faixa Sub-20 da liga do clube (idempotente: devolve a MESMA base se nada mudou). */
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
