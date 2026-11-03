/*
MONTA AS LIGAS PARA O MERCADO DE TREINADORES (textSim/managerExpectations.ts): a liga do utilizador (que vive no estado do jogo) e todas as ligas do mundo (`WorldLeague`),
cada uma com a tabela de agora, os rebaixados/promovidos (de `COUNTRIES`) e se ja acabou. E o unico arquivo do mercado que le o mundo e a base.
*/
import type { Team, Fixture } from '../types';
import { buildTable, type WorldLeague } from './world';
import { COUNTRIES } from './dataGenerator';
import type { LigaSnap } from './managerExpectations';

export const ligaPorId = (leagueId: string) => { for (const c of COUNTRIES) { const l = c.leagues.find(x => x.id === leagueId); if (l) return l; } return undefined; };

export const snapDeLiga = (leagueId: string, times: Team[], fixtures: Fixture[]): LigaSnap => {
  const jogos = fixtures.filter(f => !f.isFriendly && (f.type === undefined || f.type === 'LEAGUE'));
  const l = ligaPorId(leagueId);
  return { leagueId, tier: l?.tier ?? 1, promovidos: l?.promoted ?? 0, rebaixados: l?.relegated ?? Math.round(times.length * 0.2), times,
    tabela: buildTable(times, jogos), encerrada: jogos.length > 0 && jogos.every(f => f.played) };
};

export const montarLigas = (p: { userTeam: Team; teams: Team[]; fixtures: Fixture[]; world: WorldLeague[] }): LigaSnap[] => [
  snapDeLiga(p.userTeam.leagueId, p.teams, p.fixtures),
  ...p.world.map(w => snapDeLiga(w.leagueId, w.teams, w.fixtures))
];
