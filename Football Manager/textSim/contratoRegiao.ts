/*
FIM DOS CONTRATOS POR REGIAO: America Latina (America do Sul) = 31/12; Europa = 30/06. Resolve o dia a partir da liga do clube (`COUNTRIES`, campo `continent`).
*/
import { COUNTRIES } from './dataGenerator';
import type { FimContrato } from './contracts';

const cache = new Map<string, FimContrato>();
/** O dia de fim dos contratos de uma liga: Europa '06-30', o resto '12-31'. */
export const fimDaLiga = (leagueId?: string): FimContrato | undefined => {
  if (!leagueId) return undefined;
  const guardado = cache.get(leagueId);
  if (guardado) return guardado;
  const pais: any = (COUNTRIES as any[]).find(c => c.leagues?.some((l: any) => l.id === leagueId));
  if (!pais) return undefined;
  const fim: FimContrato = pais.continent === 'Europe' ? '06-30' : '12-31';
  cache.set(leagueId, fim);
  return fim;
};
/** O resolvedor por clube para `processarContratos`. */
export const fimDoClube = (teams: { id: string; leagueId: string }[]) => {
  const porId = new Map(teams.map(t => [t.id, t.leagueId]));
  return (teamId: string): FimContrato | undefined => fimDaLiga(porId.get(teamId));
};
