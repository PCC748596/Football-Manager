/*
A VIRADA DE TEMPORADA: no 1.o de janeiro do ano seguinte as ligas fecham, aplicam-se os acessos e descensos (textSim/promocoes.ts) e comeca a temporada nova.

Aqui vive so a parte dos DADOS DAS DIVISOES: a classificacao final de cada liga, o plano e a escrita dos novos `teamIds` (e da reserva de cada pais) em `COUNTRIES`, que e o que
`generateLeagueData` le para montar cada liga. As divisoes de hoje guardam-se no save (`Divisoes`) e repoem-se ao carregar. Idade, contratos e a base (Sub-20) nao precisam de nada
aqui: ja avancam com a data (textSim/contracts.ts e textSim/youth.ts).
*/
import type { Fixture, Team } from '../types';
import { COUNTRIES } from './dataGenerator';
import { buildTable, WorldLeague } from './world';
import { planearAcessosEDescensos, PlanoAcessos, PaisPlano } from './promocoes';
import { Competition, classificacaoDeCeD } from './competitions';

/** As divisoes em vigor: ligaId -> clubes e paisId -> reserva (clubes sem liga). So existe quando ja houve pelo menos uma virada. */
export interface Divisoes { ligas: Record<string, number[]>; reservas: Record<string, number[]>; }

const paises = (): any[] => COUNTRIES as any[];

/** A fotografia das divisoes de agora (a que se guarda no save). */
export const divisoesAtuais = (): Divisoes => {
  const d: Divisoes = { ligas: {}, reservas: {} };
  for (const c of paises()) {
    for (const l of c.leagues) d.ligas[l.id] = (l.teamIds || []).slice();
    d.reservas[c.id] = (c.reserveTeamIds || []).slice();
  }
  return d;
};

/** Escreve as divisoes em `COUNTRIES` (no sitio). Ligas ou paises que a fotografia nao tem ficam como estao. */
export const aplicarDivisoes = (d: Divisoes) => {
  for (const c of paises()) {
    for (const l of c.leagues) if (d.ligas[l.id]) l.teamIds = d.ligas[l.id].slice();
    if (d.reservas[c.id]) c.reserveTeamIds = d.reservas[c.id].slice();
  }
};

export const paisDaLiga = (ligaId: string): string | undefined => paises().find(c => c.leagues.some((l: any) => l.id === ligaId))?.id;

export interface EntradaDaVirada {
  /** Os clubes da liga do utilizador (so os dela) e os jogos dessa liga. */
  teams: Team[]; fixtures: Fixture[]; userLeagueId: string; userTeamId: string;
  world: WorldLeague[]; comps: Competition[] | null;
}
export interface ResultadoDaVirada { plano: PlanoAcessos; divisoes: Divisoes; ligaDoUtilizador: string; }

const ordemDaTabela = (teams: Team[], fixtures: Fixture[]): string[] =>
  buildTable(teams, fixtures.filter(f => f.played && !f.isFriendly && (f.type === undefined || f.type === 'LEAGUE'))).map(r => r.team.id);

/** A classificacao final de cada liga que tem tabela: a do utilizador, as do mundo e a Serie C/D (pelas competicoes). Uma liga so entra se tiver todos os clubes da divisao. */
export const classificacaoFinal = (e: EntradaDaVirada): Record<string, string[]> => {
  const out: Record<string, string[]> = {};
  const ligaTeamIds = new Map<string, string[]>();
  paises().forEach(c => c.leagues.forEach((l: any) => ligaTeamIds.set(l.id, (l.teamIds || []).map(String))));
  const aceitar = (ligaId: string, ids: string[]) => {
    const esperados = ligaTeamIds.get(ligaId);
    if (!esperados || ids.length !== esperados.length || !ids.every(i => esperados.includes(i))) return;   // (os ingleses sao renumerados, por exemplo: ficam fora ate haver mapa)
    out[ligaId] = ids;
  };
  aceitar(e.userLeagueId, ordemDaTabela(e.teams.filter(t => t.leagueId === e.userLeagueId), e.fixtures));
  for (const l of e.world) if (!l.oculta && l.leagueId !== e.userLeagueId) aceitar(l.leagueId, ordemDaTabela(l.teams, l.fixtures));
  // Serie C e D: so quando a competicao ja tem os promovidos (a da liga do proprio utilizador sai da tabela dela)
  const cd = classificacaoDeCeD(e.comps || []);
  for (const id of Object.keys(cd)) if (!out[id]) out[id] = cd[id];
  return out;
};

export const calcularVirada = (e: EntradaDaVirada, rnd: () => number = Math.random): ResultadoDaVirada => {
  const plano = planearAcessosEDescensos(paises() as PaisPlano[], classificacaoFinal(e), rnd);
  const atual = divisoesAtuais();
  const divisoes: Divisoes = { ligas: { ...atual.ligas }, reservas: { ...atual.reservas } };
  for (const id of Object.keys(plano.novosTeamIds)) divisoes.ligas[id] = plano.novosTeamIds[id].map(Number);
  for (const id of Object.keys(plano.standby)) divisoes.reservas[id] = plano.standby[id].map(Number);
  const meuId = e.userTeamId;
  const nova = Object.keys(plano.novosTeamIds).find(l => meuId && plano.novosTeamIds[l].includes(meuId));
  return { plano, divisoes, ligaDoUtilizador: nova || e.userLeagueId };
};
