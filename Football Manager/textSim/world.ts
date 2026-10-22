/*
O MUNDO: todas as outras ligas do jogo (Brasil A e B, Inglaterra e as da America Latina), com calendario, resultados e tabela, para a aba WORLD.

Só a liga do utilizador usa o motor completo (`simulateMatch`, com escalacao, cartoes, lesoes...). As outras correm com um MODELO RAPIDO: golos de Poisson a partir da diferenca de
forca dos dois clubes (e vantagem de casa). E instantaneo, nao precisa de jogadores nem de eventos, e da ~2,6 golos por jogo como o motor completo (ver tools/validar_ligas.ts).
O mundo cria-se SO quando a aba WORLD se abre pela primeira vez (gerar as 12 ligas leva um segundo ou dois) e logo recupera ate a data do jogo; depois acompanha o calendario.
*/
import { Team, Fixture, Player } from '../types';
import { COUNTRIES, generateLeagueData, generateFixtures } from './dataGenerator';

export interface WorldLeague {
  countryId: string;
  countryName: string;
  leagueId: string;
  leagueName: string;
  tier: number;
  relegated: number;
  teams: Team[];
  fixtures: Fixture[];
  /** Reserva de clubes sem jogos (liga `hidden`): so serve para as copas; nao aparece na aba WORLD. */
  oculta?: boolean;
  /** Os jogadores (so em memoria, nao vao no save): servem para pôr em campo os adversarios de copa do utilizador. */
  players?: Player[];
}

/** Resultados guardados no save: id do jogo -> [golos casa, golos fora]. */
export type WorldResults = Record<string, [number, number]>;

export interface TableRow { team: Team; played: number; won: number; drawn: number; lost: number; gf: number; ga: number; gd: number; points: number; }

const poisson = (lambda: number): number => {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
};

/** Modelo rapido: ~2,6 golos por jogo, casa com ~45% de vitorias entre iguais, e cada ponto de forca vale ~5% nos golos esperados. */
export const simulateFast = (home: Team, away: Team): [number, number] => {
  const d = (home.strength - away.strength) * 0.05;
  return [poisson(1.5 * Math.exp(d / 2)), poisson(1.15 * Math.exp(-d / 2))];
};

/** A tabela de uma liga a partir dos jogos jogados (so jogos de liga). */
export const buildTable = (teams: Team[], fixtures: Fixture[]): TableRow[] => {
  const rows = new Map<string, TableRow>(teams.map(t => [t.id, { team: t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 }]));
  for (const f of fixtures) {
    if (!f.played || f.isFriendly || (f.type !== undefined && f.type !== 'LEAGUE')) continue;
    const h = rows.get(f.homeTeamId), a = rows.get(f.awayTeamId);
    if (!h || !a) continue;
    const hs = f.homeScore || 0, as = f.awayScore || 0;
    h.played++; a.played++; h.gf += hs; h.ga += as; a.gf += as; a.ga += hs;
    if (hs > as) { h.won++; h.points += 3; a.lost++; } else if (as > hs) { a.won++; a.points += 3; h.lost++; } else { h.drawn++; a.drawn++; h.points++; a.points++; }
  }
  const out = Array.from(rows.values());
  out.forEach(r => { r.gd = r.gf - r.ga; });
  return out.sort((x, y) => y.points - x.points || y.won - x.won || y.gd - x.gd || y.gf - x.gf || x.team.name.localeCompare(y.team.name));
};

/** Cria todas as ligas menos a do utilizador (essa vive no estado do jogo). Os resultados do save, se houver, repoem-se; o resto joga-se ate `ate`. */
export const createWorld = (excludeLeagueId: string | undefined, ate: string, results?: WorldResults | null): WorldLeague[] => {
  const leagues: WorldLeague[] = [];
  for (const c of COUNTRIES as any[]) {
    for (const lg of c.leagues) {
      if (lg.id === excludeLeagueId && !lg.worldOnly) continue;   // (C e D entram sempre: sao a lista de clubes das competicoes)
      const { teams, players } = generateLeagueData(c.id, lg.id);
      if (lg.hidden || lg.worldOnly) { leagues.push({ countryId: c.id, countryName: c.name, leagueId: lg.id, leagueName: lg.name, tier: lg.tier, relegated: 0, teams, fixtures: [], players, oculta: true }); continue; }
      const fixtures = generateFixtures(teams, lg.id).map(f => {
        const r = results && results[f.id];
        return r ? { ...f, homeScore: r[0], awayScore: r[1], played: true } : f;
      });
      leagues.push({ countryId: c.id, countryName: c.name, leagueId: lg.id, leagueName: lg.name, tier: lg.tier, relegated: lg.relegated || 0, teams, fixtures, players });
    }
  }
  return simulateWorldTo(leagues, ate);
};

/** Joga os jogos com data ate `data` que ainda nao foram jogados. Devolve a MESMA lista se nao houve nada para jogar (evita renders em ciclo). */
export const simulateWorldTo = (leagues: WorldLeague[], data: string): WorldLeague[] => {
  let mudou = false;
  const out = leagues.map(l => {
    if (!l.fixtures.some(f => !f.played && f.date <= data)) return l;
    mudou = true;
    const byId = new Map(l.teams.map(t => [t.id, t]));
    const fixtures = l.fixtures.map(f => {
      if (f.played || f.date > data) return f;
      const h = byId.get(f.homeTeamId), a = byId.get(f.awayTeamId);
      if (!h || !a) return f;
      const [hs, as] = simulateFast(h, a);
      return { ...f, homeScore: hs, awayScore: as, played: true };
    });
    return { ...l, fixtures };
  });
  return mudou ? out : leagues;
};

export const worldResults = (leagues: WorldLeague[] | null): WorldResults => {
  const r: WorldResults = {};
  (leagues || []).forEach(l => l.fixtures.forEach(f => { if (f.played) r[f.id] = [f.homeScore, f.awayScore]; }));
  return r;
};
