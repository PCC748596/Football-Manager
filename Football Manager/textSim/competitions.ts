/*
AS COPAS DO MUNDO: Libertadores, Sul-Americana e Copa do Brasil (aba WORLD COMPETITIONS).

QUEM JOGA vem da CLASSIFICACAO DO ANO ANTERIOR de cada liga (`classificacaoAnoAnterior`): as primeiras vagas de cada pais vao para a Libertadores e as seguintes para a Sul-Americana
(`VAGAS`). A Copa do Brasil leva os 40 clubes brasileiros do jogo (Serie A e B). No primeiro ano, sem uma temporada anterior jogada, a classificacao vem de `CLASSIFICACAO_INICIAL`
(Brasil: a de 2023; os outros paises: a ordem de forca dos clubes, EDITAVEL) e nas temporadas seguintes passa a ser a tabela final da liga.

FORMATOS
- Libertadores e Sul-Americana: 32 clubes, 8 grupos de 4 (ida e volta, 6 jornadas), os 2 primeiros de cada grupo vao as oitavas; oitavas, quartas e meias em ida e volta; final em jogo unico.
- Copa do Brasil (formato de 2026): 126 clubes, 9 fases. 1.a fase: 28 clubes (os mais fracos, pela forca), 14 jogos unicos; 2.a: 14 vencedores + 74 = 88, 44 jogos unicos; 3.a: 44 + os 4 campeoes
  de 2025 = 48, 24 jogos unicos; 4.a: 24, 12 jogos unicos; 5.a: 12 + os 20 da Serie A = 32, 16 confrontos de ida e volta; oitavas, quartas e meias em ida e volta; final em jogo unico.
  Nos jogos unicos o clube pior cabeca de serie joga em casa; em ida e volta o melhor decide em casa; os melhores jogam contra os piores em cada fase.
- Empate no agregado (ou num jogo unico): penaltis, com ligeira vantagem para o mais forte.
Os jogos sao simulados pelo modelo rapido (textSim/world.ts) e as fases seguintes sao sorteadas quando a anterior acaba.
*/
import { Team, naLigaDoUtilizador } from '../types';
import { simulateFast, buildTable } from './world';

export interface CompMatch {
  id: string; stage: string; group?: string; tie?: string; leg?: number; date: string;
  homeKey: string; awayKey: string; homeScore: number | null; awayScore: number | null; played: boolean;
  pens?: [number, number];     // penaltis (casa, fora) — so no jogo que decide o confronto
}

export interface Competition {
  id: 'LIB' | 'SUL' | 'COPA_BR' | 'SERIE_C' | 'SERIE_D';
  name: string;
  teamKeys: string[];
  groups?: Record<string, string[]>;
  matches: CompMatch[];
  /** Serie C com o utilizador: a 1.a fase e a liga do jogo (nao tem jogos aqui); a ordem vem das fixtures. */
  ligaExterna?: boolean;
  /** Serie D com o utilizador: o grupo (A-H) dele e a liga do jogo (sem jogos aqui). */
  grupoExterno?: string;
  /** Copa do Brasil: clubes que entram numa fase alem dos vencedores da anterior (fase -> chaves). */
  entradas?: Record<string, string[]>;
  champion?: string;
}

/** Os clubes identificam-se por `liga|id` (os ids repetem-se entre ligas: os ingleses sao renumerados). */
export const teamKey = (leagueId: string, teamId: string) => leagueId + '|' + teamId;

// Vagas por pais (id do pais). 32 clubes em cada torneio.
export const VAGAS: Record<'LIB' | 'SUL', Record<string, number>> = {
  LIB: { '45': 6, '52': 5, '56': 3, '55': 3, '60': 3, '57': 3, '58': 3, '59': 2, '53': 2, '61': 2 },
  SUL: { '45': 6, '52': 5, '56': 3, '55': 3, '60': 3, '57': 3, '58': 2, '59': 3, '53': 2, '61': 2 }
};

// Datas (temporada 2024). Libertadores nas terças, Sul-Americana nas quartas e Copa do Brasil em outras semanas, para ninguém jogar duas vezes no mesmo dia.
const GRUPOS_LIB = ['2024-04-09', '2024-04-23', '2024-05-07', '2024-05-21', '2024-06-04', '2024-06-18'];
const GRUPOS_SUL = ['2024-04-10', '2024-04-24', '2024-05-08', '2024-05-22', '2024-06-05', '2024-06-19'];
const FASES_LIB = [{ nome: 'R16', datas: ['2024-08-13', '2024-08-20'] }, { nome: 'QF', datas: ['2024-09-17', '2024-09-24'] }, { nome: 'SF', datas: ['2024-10-22', '2024-10-29'] }, { nome: 'F', datas: ['2024-11-30'] }];
const FASES_SUL = [{ nome: 'R16', datas: ['2024-08-14', '2024-08-21'] }, { nome: 'QF', datas: ['2024-09-18', '2024-09-25'] }, { nome: 'SF', datas: ['2024-10-23', '2024-10-30'] }, { nome: 'F', datas: ['2024-11-23'] }];
const FASES_COPA = [
  { nome: 'P1', datas: ['2024-04-10'] }, { nome: 'P2', datas: ['2024-04-24'] }, { nome: 'P3', datas: ['2024-05-08'] }, { nome: 'P4', datas: ['2024-05-22'] },
  { nome: 'P5', datas: ['2024-06-12', '2024-07-10'] }, { nome: 'R16', datas: ['2024-08-07', '2024-08-21'] }, { nome: 'QF', datas: ['2024-09-11', '2024-09-25'] },
  { nome: 'SF', datas: ['2024-10-09', '2024-10-23'] }, { nome: 'F', datas: ['2024-12-06'] }   // final em jogo unico a 6 de dezembro, como em 2026
];

// SERIE C (20 clubes): 1.a fase todos contra todos (19 rodadas, sabados), os 8 primeiros vao a 2 grupos de 4 (ida e volta, 6 rodadas), os 2 primeiros de cada grupo as meias (ida e volta) e final (ida e volta).
// Os 4 semifinalistas sobem; os 4 ultimos da 1.a fase descem. Datas nominais (o agendador desloca o que coincidir com outro jogo do clube).
const C_L_INICIO = '2024-04-13', C_G_INICIO = '2024-08-24';
const FASES_C = [{ nome: 'SF', datas: ['2024-10-19', '2024-10-26'] }, { nome: 'F', datas: ['2024-11-02', '2024-11-09'] }];
// SERIE D (96 clubes): 8 grupos de 12 (ida e volta, 22 rodadas, domingos), os 4 primeiros de cada grupo (32) vao ao mata-mata em ida e volta: 32 avos, oitavas, quartas, meias e final.
// Os 4 semifinalistas sobem. Os grupos seguem a ordem da liga (que e por regiao: Norte, Nordeste, Centro-Oeste, Sudeste, Sul).
const D_INICIO = '2024-04-07';
const FASES_D = [{ nome: 'R32', datas: ['2024-09-14', '2024-09-21'] }, { nome: 'R16', datas: ['2024-09-28', '2024-10-05'] }, { nome: 'QF', datas: ['2024-10-19', '2024-10-26'] },
  { nome: 'SF', datas: ['2024-11-02', '2024-11-09'] }, { nome: 'F', datas: ['2024-11-23', '2024-11-30'] }];

// Quem entra em cada fase da Copa do Brasil alem dos vencedores da anterior (por nome do clube na base).
const COPA_CAMPEOES = new Set(['Paysandu-PA', 'Ponte Preta-SP', 'Confiança-SE', 'Barra-SC']);   // campeoes de competicoes de 2025: entram na 3.a fase

/*
A CLASSIFICACAO INICIAL (ano anterior) por liga: nomes dos clubes, do 1.o ao ultimo. EDITAVEL. Brasil: classificacao final de 2023 (os promovidos pela ordem da Serie B 2023);
as outras ligas: sem esta lista usa-se a ordem em que os clubes estao na liga (que e a ordem aproximada de forca).
*/
// (A do Brasil vem do pais: `classificacaoAnterior` em realDatabase, editavel no Editor; aqui so o que faltar la.)
export const CLASSIFICACAO_INICIAL: Record<string, string[]> = {};

const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };

/** Ordem do ano anterior de uma liga: a classificacao dada (nomes) ou, sem ela, a ordem em que a liga lista os clubes. */
export const classificacaoAnoAnterior = (leagueId: string, teams: Team[], teamIdsEmOrdem: string[], anterior?: string[] | null): Team[] => {
  const doPais = (COUNTRIES as any[]).find(c => c.leagues.some((l: any) => l.id === leagueId))?.classificacaoAnterior?.[leagueId];
  const nomes = anterior || doPais || CLASSIFICACAO_INICIAL[leagueId];
  const porNome = new Map(teams.map(t => [t.name, t]));
  const porId = new Map(teams.map(t => [t.id, t]));
  const ordem: Team[] = [];
  if (nomes) nomes.forEach(n => { const t = porNome.get(n); if (t && !ordem.includes(t)) ordem.push(t); });
  teamIdsEmOrdem.forEach(id => { const t = porId.get(id); if (t && !ordem.includes(t)) ordem.push(t); });
  teams.forEach(t => { if (!ordem.includes(t)) ordem.push(t); });
  return ordem;
};

export interface LigaParaCopas { leagueId: string; countryId: string; tier: number; teams: Team[]; teamIds: string[]; anterior?: string[] | null; }

/** Os clubes de cada torneio, pela classificacao do ano anterior. Devolve tambem a ordem de cabecas de serie da Copa do Brasil. */
export const qualificados = (ligas: LigaParaCopas[]) => {
  const lib: { key: string; team: Team; countryId: string }[] = [], sul: typeof lib = [];
  for (const l of ligas) {
    if (l.tier !== 1 && !(l.countryId === '45')) continue;
    const ordem = classificacaoAnoAnterior(l.leagueId, l.teams, l.teamIds, l.anterior);
    if (l.tier === 1) {
      const nL = VAGAS.LIB[l.countryId] || 0, nS = VAGAS.SUL[l.countryId] || 0;
      ordem.slice(0, nL).forEach(t => lib.push({ key: teamKey(l.leagueId, t.id), team: t, countryId: l.countryId }));
      ordem.slice(nL, nL + nS).forEach(t => sul.push({ key: teamKey(l.leagueId, t.id), team: t, countryId: l.countryId }));
    }
  }
  // Copa do Brasil: a Serie A do jogo entra na 5.a fase; os campeoes de 2025 na 3.a; os outros (Serie B da lista + os clubes da liga escondida `bra_clubes`) pelas fases baixas.
  const serieA: { key: string; team: Team }[] = [], campeoes: typeof serieA = [], outros: typeof serieA = [];
  const brasil = ligas.filter(x => x.countryId === '45');
  const porId = new Map<string, { key: string; team: Team; tier: number }>();
  brasil.forEach(l => l.teams.forEach(t => porId.set(t.id, { key: teamKey(l.leagueId, t.id), team: t, tier: l.tier })));
  const paisBR: any = (COUNTRIES as any[]).find(c => c.id === '45');
  ((paisBR && paisBR.copaTeamIds) || []).forEach((id: number) => {
    const c = porId.get(String(id));
    if (!c) return;
    const item = { key: c.key, team: c.team };
    if (c.tier === 1) serieA.push(item); else if (COPA_CAMPEOES.has(c.team.name)) campeoes.push(item); else outros.push(item);
  });
  // Series C e D: os clubes das ligas `bra_serie_c` e `bra_serie_d`, pela ordem da liga.
  const daLiga = (id: string) => {
    const ordem: string[] = (((paisBR && paisBR.leagues.find((l: any) => l.id === id)) || {}).teamIds || []).map(String);   // a ordem da liga (por regiao na Serie D), nao a da base
    return (brasil.find(l => l.leagueId === id)?.teams || []).slice().sort((x, y) => ordem.indexOf(x.id) - ordem.indexOf(y.id)).map(t => ({ key: teamKey(id, t.id), team: t }));
  };
  return { lib, sul, copa: { serieA, campeoes, outros }, serieC: daLiga('bra_serie_c'), serieD: daLiga('bra_serie_d') };
};

const embaralhar = <T,>(a: T[]): T[] => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

/** O sorteio dos grupos: 4 potes por forca; sem dois clubes do mesmo pais no mesmo grupo (tenta muitas vezes; se nao der, aceita). */
const sortearGrupos = (itens: { key: string; team: Team; countryId: string }[]): Record<string, string[]> => {
  const ordenados = itens.slice().sort((a, b) => b.team.strength - a.team.strength);
  const potes = [0, 1, 2, 3].map(p => ordenados.slice(p * 8, p * 8 + 8));
  const nomes = 'ABCDEFGH'.split('');
  for (let tentativa = 0; tentativa < 400; tentativa++) {
    const grupos: { key: string; countryId: string }[][] = nomes.map(() => []);
    let ok = true;
    for (const pote of potes) {
      const emb = embaralhar(pote);
      const livres = nomes.map((_, i) => i);
      for (const t of emb) {
        const opcoes = livres.filter(g => !grupos[g].some(x => x.countryId === t.countryId));
        if (!opcoes.length) { ok = false; break; }
        const g = opcoes[Math.floor(Math.random() * opcoes.length)];
        grupos[g].push({ key: t.key, countryId: t.countryId });
        livres.splice(livres.indexOf(g), 1);
      }
      if (!ok) break;
    }
    if (ok) { const out: Record<string, string[]> = {}; nomes.forEach((n, i) => { out[n] = grupos[i].map(x => x.key); }); return out; }
  }
  const emb = embaralhar(ordenados); const out: Record<string, string[]> = {};
  nomes.forEach((n, i) => { out[n] = emb.slice(i * 4, i * 4 + 4).map(x => x.key); }); return out;
};

const jogo = (id: string, stage: string, date: string, home: string, away: string, extra: Partial<CompMatch> = {}): CompMatch =>
  ({ id, stage, date, homeKey: home, awayKey: away, homeScore: null, awayScore: null, played: false, ...extra });

// ------------------------------------------------------------------ agenda: nunca dois jogos do mesmo clube no mesmo dia

/** Dias ocupados por clube (chave `liga|id`): jogos de liga e de copa. */
export type Ocupacao = Map<string, Set<string>>;

export const somarDias = (d: string, n: number): string => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().split('T')[0]; };
const marcar = (oc: Ocupacao, keys: string[], d: string) => keys.forEach(k => { let s = oc.get(k); if (!s) { s = new Set(); oc.set(k, s); } s.add(d); });

/**
 * A data de um jogo: a nominal se os DOIS clubes estiverem livres nesse dia e nos vizinhos (um dia de descanso); senao a mais proxima (+1, -1, +2, -2...) que esteja. Se nao houver,
 * aceita um dia sem jogo (sem folga). Nunca antes de `minimo`. Marca o dia nos dois clubes.
 */
export const agendarJogo = (oc: Ocupacao, nominal: string, keys: string[], minimo: string): string => {
  const livre = (d: string, folga: number) => d >= minimo && keys.every(k => { const s = oc.get(k); if (!s) return true; for (let i = -folga; i <= folga; i++) if (s.has(somarDias(d, i))) return false; return true; });
  const deslocamentos: number[] = [0]; for (let i = 1; i <= 12; i++) deslocamentos.push(i, -i);
  let escolhida: string | null = null;
  for (const folga of [1, 0]) {
    for (const off of deslocamentos) { const d = somarDias(nominal, off); if (livre(d, folga)) { escolhida = d; break; } }
    if (escolhida) break;
  }
  const d = escolhida || (nominal >= minimo ? nominal : minimo);
  marcar(oc, keys, d);
  return d;
};

/** A ocupacao actual: jogos de liga de todas as ligas e os jogos das copas dadas. */
export const ocupacaoDe = (ligas: { leagueId: string; fixtures: import('../types').Fixture[] }[], comps: Competition[]): Ocupacao => {
  const oc: Ocupacao = new Map();
  ligas.forEach(l => l.fixtures.forEach(f => { if (f.isFriendly) return; marcar(oc, [teamKey(l.leagueId, f.homeTeamId), teamKey(l.leagueId, f.awayTeamId)], f.date); }));
  comps.forEach(c => c.matches.forEach(m => marcar(oc, [m.homeKey, m.awayKey], m.date)));
  return oc;
};

const INICIO_DA_EPOCA = '2024-04-02';

const jogosDeGrupo = (prefixo: string, grupos: Record<string, string[]>, datas: string[], oc: Ocupacao): CompMatch[] => {
  const out: CompMatch[] = [];
  const rondas = [[[0, 1], [2, 3]], [[2, 0], [1, 3]], [[0, 3], [1, 2]]];
  for (const g of Object.keys(grupos)) {
    const t = grupos[g];
    for (let md = 0; md < 6; md++) {
      const volta = md >= 3;
      rondas[md % 3].forEach(([a, b], k) => {
        const [h, v] = volta ? [t[b], t[a]] : [t[a], t[b]];
        out.push(jogo(`${prefixo}-G${g}-${md + 1}-${k}`, 'G' + (md + 1), agendarJogo(oc, datas[md], [h, v], INICIO_DA_EPOCA), h, v, { group: g }));
      });
    }
  }
  return out;
};

export const criarLibertadores = (lib: { key: string; team: Team; countryId: string }[], oc: Ocupacao = new Map()): Competition => {
  const grupos = sortearGrupos(lib);
  return { id: 'LIB', name: 'Copa Libertadores', teamKeys: lib.map(x => x.key), groups: grupos, matches: jogosDeGrupo('LIB', grupos, GRUPOS_LIB, oc) };
};
export const criarSulAmericana = (sul: { key: string; team: Team; countryId: string }[], oc: Ocupacao = new Map()): Competition => {
  const grupos = sortearGrupos(sul);
  return { id: 'SUL', name: 'Copa Sul-Americana', teamKeys: sul.map(x => x.key), groups: grupos, matches: jogosDeGrupo('SUL', grupos, GRUPOS_SUL, oc) };
};

/** Rondas todos-contra-todos (metodo do circulo). `duplo`: ida e volta (a 2.a metade inverte os mandos). */
const rondasTodosContraTodos = (keys: string[], duplo: boolean): [string, string][][] => {
  const a = keys.slice(); if (a.length % 2) a.push('__folga__');
  const m = a.length, rondas: [string, string][][] = [];
  for (let r = 0; r < m - 1; r++) {
    const par: [string, string][] = [];
    for (let i = 0; i < m / 2; i++) {
      let h = a[i], v = a[m - 1 - i];
      if (h === '__folga__' || v === '__folga__') continue;
      if (r % 2 === 1) [h, v] = [v, h];
      par.push([h, v]);
    }
    rondas.push(par);
    a.splice(1, 0, a.pop() as string);
  }
  return duplo ? rondas.concat(rondas.map(rd => rd.map(([h, v]) => [v, h] as [string, string]))) : rondas;
};

/** Os jogos de um grupo todos-contra-todos: uma rodada por data nominal (a cada 7 dias a partir de `inicio`), agendados sem coincidir com outros jogos dos clubes. */
const jogosDeLiga = (prefixo: string, stage: string, grupo: string, keys: string[], duplo: boolean, inicio: string, oc: Ocupacao): CompMatch[] => {
  const out: CompMatch[] = [];
  rondasTodosContraTodos(keys, duplo).forEach((rd, r) => rd.forEach(([h, v], i) => {
    out.push(jogo(`${prefixo}-${grupo}-${r + 1}-${i}`, stage, agendarJogo(oc, somarDias(inicio, 7 * r), [h, v], INICIO_DA_EPOCA), h, v, { group: grupo }));
  }));
  return out;
};

export const criarSerieC = (clubes: { key: string; team: Team }[], oc: Ocupacao = new Map(), externa = false): Competition => {
  const keys = clubes.map(c => c.key);
  // Com o utilizador na Serie C a 1.a fase e a liga do jogo: aqui nao se criam esses jogos.
  return { id: 'SERIE_C', name: 'Série C', teamKeys: keys, groups: { L: keys }, matches: externa ? [] : jogosDeLiga('SERIE_C', 'L', 'L', keys, false, C_L_INICIO, oc), ligaExterna: externa || undefined };
};

/** Os 8 grupos da Serie D: fatias de 12 da lista de clubes (que vai por regiao). */
export const gruposDaSerieD = (ordem: string[]): Record<string, string[]> => {
  const g: Record<string, string[]> = {}, tam = Math.ceil(ordem.length / 8);
  'ABCDEFGH'.split('').forEach((n, i) => { g[n] = ordem.slice(i * tam, (i + 1) * tam); });
  return g;
};

export const criarSerieD = (clubes: { key: string; team: Team }[], oc: Ocupacao = new Map(), grupoExterno?: string): Competition => {
  const keys = clubes.map(c => c.key), grupos = gruposDaSerieD(keys), matches: CompMatch[] = [];
  // O grupo do utilizador e a liga do jogo: os outros 7 jogam-se aqui.
  Object.keys(grupos).filter(g => g !== grupoExterno).forEach(g => matches.push(...jogosDeLiga('SERIE_D', 'D', g, grupos[g], true, D_INICIO, oc)));
  return { id: 'SERIE_D', name: 'Série D', teamKeys: keys, groups: grupos, matches, grupoExterno };
};

type Clube = { key: string; team: Team };
/** Os pares [melhor, pior] por cabeca de serie (1.o contra o ultimo, 2.o contra o penultimo...). `seed`: posicao do clube na ordem de cabecas de serie (menor = melhor). */
const parearPorSerie = (ks: string[], seed: (k: string) => number): [string, string][] => {
  const o = ks.slice().sort((x, y) => seed(x) - seed(y));
  const p: [string, string][] = [];
  for (let i = 0; i < o.length / 2; i++) p.push([o[i], o[o.length - 1 - i]]);
  return p;
};

/**
 * Copa do Brasil: a 1.a fase leva os clubes mais fracos (pela forca) que sobram depois de 74 entrarem direto na 2.a; os campeoes entram na 3.a e a Serie A na 5.a (`entradas`).
 * A ordem de cabecas de serie (`teamKeys`) e a forca do clube.
 */
export const criarCopaDoBrasil = (a: { serieA: Clube[]; campeoes: Clube[]; outros: Clube[] }, oc: Ocupacao = new Map()): Competition => {
  const porForca = (x: Clube, y: Clube) => y.team.strength - x.team.strength || hash(x.key) - hash(y.key);
  const todos = [...a.serieA, ...a.campeoes, ...a.outros].sort(porForca);
  const outros = a.outros.slice().sort(porForca);
  let n1 = outros.length - 74; if (n1 < 0) n1 = 0; if (n1 % 2) n1--;   // a 1.a fase tem de ter numero par de clubes
  const p1 = outros.slice(outros.length - n1).map(c => c.key), direto = outros.slice(0, outros.length - n1).map(c => c.key);
  const c: Competition = {
    id: 'COPA_BR', name: 'Copa do Brasil', teamKeys: todos.map(x => x.key), matches: [],
    entradas: { P2: direto, P3: a.campeoes.map(x => x.key), P5: a.serieA.map(x => x.key) }
  };
  const seed = (k: string) => c.teamKeys.indexOf(k);
  c.matches.push(...jogosDaFase(c, FASES_COPA[0], parearPorSerie(p1, seed), oc, INICIO_DA_EPOCA));
  return c;
};

// ------------------------------------------------------------------ simulacao e avanco

const forca = (m: Map<string, Team>, k: string) => (m.get(k)?.strength ?? 60);

const penaltis = (hK: string, aK: string, teams: Map<string, Team>): [number, number] => {
  const d = (forca(teams, hK) - forca(teams, aK)) * 0.01;
  const pH = Math.max(0.3, Math.min(0.7, 0.5 + d));
  let h = 0, a = 0;
  for (let i = 0; i < 5; i++) { if (Math.random() < 0.76 * (0.9 + 0.2 * pH)) h++; if (Math.random() < 0.76 * (0.9 + 0.2 * (1 - pH))) a++; }
  while (h === a) { if (Math.random() < pH) h++; else a++; }   // morte subita (ao fim das 5 cobrancas cada)
  return [h, a];
};

/** O vencedor de um confronto (1 ou 2 jogos) ou null se ainda nao acabou. Em ida e volta o desempate (penaltis) fica gravado no ultimo jogo. */
export const vencedorDoConfronto = (jogos: CompMatch[], teams: Map<string, Team>, escrever: boolean): string | null => {
  if (!jogos.length || !jogos.every(j => j.played)) return null;
  const gols: Record<string, number> = {};
  jogos.forEach(j => { gols[j.homeKey] = (gols[j.homeKey] || 0) + (j.homeScore || 0); gols[j.awayKey] = (gols[j.awayKey] || 0) + (j.awayScore || 0); });
  const ks = Object.keys(gols);
  if (gols[ks[0]] !== gols[ks[1]]) return gols[ks[0]] > gols[ks[1]] ? ks[0] : ks[1];
  const ultimo = jogos[jogos.length - 1];
  if (!ultimo.pens && escrever) ultimo.pens = penaltis(ultimo.homeKey, ultimo.awayKey, teams);
  if (!ultimo.pens) return null;
  return ultimo.pens[0] > ultimo.pens[1] ? ultimo.homeKey : ultimo.awayKey;
};

const faseDoComp = (c: Competition) => (c.id === 'LIB' ? FASES_LIB : c.id === 'SUL' ? FASES_SUL : c.id === 'SERIE_C' ? FASES_C : c.id === 'SERIE_D' ? FASES_D : FASES_COPA);

/** Cria os jogos de uma fase a partir de pares [melhor, pior] (ida em casa do pior, volta em casa do melhor; jogo unico: em casa o 1.o). */
const jogosDaFase = (c: Competition, fase: { nome: string; datas: string[] }, pares: [string, string][], oc: Ocupacao, minimoExtra: string = INICIO_DA_EPOCA): CompMatch[] => {
  const out: CompMatch[] = [];
  // Nunca antes do ultimo jogo da fase anterior, nem antes de `minimoExtra` (o dia seguinte a hoje: um jogo novo nao pode nascer no passado).
  const ultimo = c.matches.length ? somarDias(c.matches.reduce((m, x) => (x.date > m ? x.date : m), '0000-00-00'), 1) : INICIO_DA_EPOCA;
  const minimo = ultimo > minimoExtra ? ultimo : minimoExtra;
  pares.forEach(([melhor, pior], i) => {
    const tie = `${fase.nome}-${i}`;
    if (fase.datas.length === 1) {
      // Jogo unico da Copa do Brasil: o pior cabeca de serie joga em casa (a final, em campo neutro, fica com o melhor como "casa").
      const [casa, fora] = (c.id === 'COPA_BR' && fase.nome !== 'F') ? [pior, melhor] : [melhor, pior];
      out.push(jogo(`${c.id}-${tie}`, fase.nome, agendarJogo(oc, fase.datas[0], [melhor, pior], minimo), casa, fora, { tie }));
    }
    else {
      const d1 = agendarJogo(oc, fase.datas[0], [melhor, pior], minimo);
      out.push(jogo(`${c.id}-${tie}-1`, fase.nome, d1, pior, melhor, { tie, leg: 1 }));
      out.push(jogo(`${c.id}-${tie}-2`, fase.nome, agendarJogo(oc, fase.datas[1], [melhor, pior], somarDias(d1, 2)), melhor, pior, { tie, leg: 2 }));
    }
  });
  return out;
};

/** A classificacao de um grupo (chaves por ordem: pontos, saldo, golos marcados, e por fim um desempate fixo). */
const ordemDoGrupo = (c: Competition, g: string): string[] => {
  const pts: Record<string, { p: number; sg: number; gf: number }> = {};
  (c.groups![g] || []).forEach(k => { pts[k] = { p: 0, sg: 0, gf: 0 }; });
  c.matches.filter(m => m.group === g && m.played).forEach(m => {
    const h = pts[m.homeKey], a = pts[m.awayKey], hs = m.homeScore || 0, as = m.awayScore || 0;
    h.gf += hs; a.gf += as; h.sg += hs - as; a.sg += as - hs;
    if (hs > as) h.p += 3; else if (as > hs) a.p += 3; else { h.p++; a.p++; }
  });
  return (c.groups![g] || []).slice().sort((x, y) => pts[y].p - pts[x].p || pts[y].sg - pts[x].sg || pts[y].gf - pts[x].gf || hash(x) - hash(y));
};
const estatDoGrupo = (c: Competition, g: string) => {
  const ord = ordemDoGrupo(c, g), pts: Record<string, { p: number; sg: number; gf: number }> = {};
  ord.forEach(k => { pts[k] = { p: 0, sg: 0, gf: 0 }; });
  c.matches.filter(m => m.group === g && m.played).forEach(m => {
    const h = pts[m.homeKey], a = pts[m.awayKey], hs = m.homeScore || 0, as = m.awayScore || 0;
    h.gf += hs; a.gf += as; h.sg += hs - as; a.sg += as - hs;
    if (hs > as) h.p += 3; else if (as > hs) a.p += 3; else { h.p++; a.p++; }
  });
  return { ord, pts };
};

/** Os dois primeiros de cada grupo. */
const classificadosDosGrupos = (c: Competition): { primeiros: string[]; segundos: string[] } => {
  const primeiros: string[] = [], segundos: string[] = [];
  for (const g of Object.keys(c.groups || {})) {
    const pts: Record<string, { p: number; sg: number; gf: number }> = {};
    c.groups![g].forEach(k => { pts[k] = { p: 0, sg: 0, gf: 0 }; });
    c.matches.filter(m => m.group === g && m.played).forEach(m => {
      const h = pts[m.homeKey], a = pts[m.awayKey], hs = m.homeScore || 0, as = m.awayScore || 0;
      h.gf += hs; a.gf += as; h.sg += hs - as; a.sg += as - hs;
      if (hs > as) h.p += 3; else if (as > hs) a.p += 3; else { h.p++; a.p++; }
    });
    const ord = c.groups![g].slice().sort((x, y) => pts[y].p - pts[x].p || pts[y].sg - pts[x].sg || pts[y].gf - pts[x].gf || hash(x) - hash(y));
    primeiros.push(ord[0]); segundos.push(ord[1]);
  }
  return { primeiros, segundos };
};

/**
 * Joga os jogos com data ate `hoje` e cria as fases seguintes quando a anterior acaba. Devolve a MESMA competicao se nada mudou (evita renders em ciclo).
 * `teams`: clubes por chave (para a forca nos jogos e nos penaltis).
 */
export interface OpcoesAvanco {
  usuario?: string | null; ocupado?: Ocupacao;
  /** Serie C com o utilizador: as chaves por ordem da 1.a fase (so quando a liga do jogo acabou). */
  ordemL?: string[] | null;
  /** Serie D com o utilizador: a classificacao do grupo dele (so quando acabou). */
  grupoExterno?: { ord: string[]; pts: Record<string, { p: number; sg: number; gf: number }> } | null;
}
export const avancarCompeticao = (comp: Competition, teams: Map<string, Team>, hoje: string, opcoes: OpcoesAvanco = {}): Competition => {
  const oc: Ocupacao = opcoes.ocupado || new Map();
  const uk = opcoes.usuario || null;
  let c = comp, mudou = false;
  const copia = () => { if (c === comp) c = { ...comp, matches: comp.matches.map(m => ({ ...m })) }; mudou = true; };
  for (let volta = 0; volta < 12; volta++) {
    let progressou = false;
    // 1. joga o que ja devia ter sido jogado
    if (c.matches.some(m => !m.played && m.date <= hoje && !(uk && (m.homeKey === uk || m.awayKey === uk)))) {
      copia();
      c.matches.forEach(m => {
        if (m.played || m.date > hoje) return;
        if (uk && (m.homeKey === uk || m.awayKey === uk)) return;   // os jogos do utilizador jogam-se no jogo (motor completo) e voltam por `sincronizarResultados`
        const h = teams.get(m.homeKey), a = teams.get(m.awayKey);
        const [hs, as] = (h && a) ? simulateFast(h, a) : [1, 1];
        m.homeScore = hs; m.awayScore = as; m.played = true;
      });
      progressou = true;
    }
    // 2. as fases seguintes
    const fases = faseDoComp(c);
    const temFase = (nome: string) => c.matches.some(m => m.stage === nome);
    const feitaFase = (nome: string) => temFase(nome) && c.matches.filter(m => m.stage === nome).every(m => m.played);
    const vencedoresDe = (nome: string): string[] | null => {
      if (!feitaFase(nome)) return null;
      const ties = Array.from(new Set(c.matches.filter(m => m.stage === nome).map(m => m.tie)));
      const out: string[] = [];
      for (const t of ties) {
        const js = c.matches.filter(m => m.tie === t && m.stage === nome).sort((x, y) => (x.leg || 0) - (y.leg || 0));
        const v = vencedorDoConfronto(js, teams, true);
        if (!v) return null;
        out.push(v);
      }
      return out;
    };
    const ordemPorForca = (ks: string[]) => ks.slice().sort((x, y) => forca(teams, y) - forca(teams, x) || hash(x) - hash(y));
    const parear = (ks: string[], porSerie: (k: string) => number): [string, string][] => {
      const o = ks.slice().sort((x, y) => porSerie(x) - porSerie(y));
      const p: [string, string][] = [];
      for (let i = 0; i < o.length / 2; i++) p.push([o[i], o[o.length - 1 - i]]);
      return p;
    };
    const sequencia = c.id === 'COPA_BR' ? ['P1', 'P2', 'P3', 'P4', 'P5', 'R16', 'QF', 'SF', 'F'] : c.id === 'SERIE_D' ? ['R32', 'R16', 'QF', 'SF', 'F'] : c.id === 'SERIE_C' ? ['SF', 'F'] : ['R16', 'QF', 'SF', 'F'];
    const fase = (nome: string) => fases.find(f => f.nome === nome)!;
    const seed = (k: string) => c.teamKeys.indexOf(k);

    if ((c.id === 'LIB' || c.id === 'SUL') && !temFase('R16')) {
      const todosGrupos = c.matches.filter(m => m.group).every(m => m.played);
      if (todosGrupos) {
        copia();
        const { primeiros, segundos } = classificadosDosGrupos(c);
        // cada primeiro joga contra um segundo de OUTRO grupo
        let seg = embaralhar(segundos), ok = false;
        for (let t = 0; t < 200 && !ok; t++) { seg = embaralhar(segundos); ok = primeiros.every((p, i) => (c.groups![Object.keys(c.groups!).find(g => c.groups![g].includes(p))!]).indexOf(seg[i]) < 0); }
        c.matches.push(...jogosDaFase(c, fase('R16'), primeiros.map((p, i) => [p, seg[i]] as [string, string]), oc, somarDias(hoje, 1)));
        progressou = true;
      }
    } else if (c.id === 'SERIE_C' && !temFase('G')) {
      // Fim da 1.a fase: os 8 primeiros vao a 2 grupos de 4 (1.o, 4.o, 5.o e 8.o num; 2.o, 3.o, 6.o e 7.o no outro).
      const ordL = c.ligaExterna ? (opcoes.ordemL || null) : (feitaFase('L') ? ordemDoGrupo(c, 'L') : null);
      if (ordL) {
        copia();
        const top8 = ordL.slice(0, 8);
        const g1 = [top8[0], top8[3], top8[4], top8[7]], g2 = [top8[1], top8[2], top8[5], top8[6]];
        c.groups = { ...c.groups, G1: g1, G2: g2 };
        c.matches.push(...jogosDeLiga('SERIE_C', 'G', 'G1', g1, true, C_G_INICIO, oc), ...jogosDeLiga('SERIE_C', 'G', 'G2', g2, true, C_G_INICIO, oc));
        progressou = true;
      }
    } else if (c.id === 'SERIE_C' && !temFase('SF')) {
      // Fim dos grupos: o 1.o de cada grupo joga com o 2.o do outro (ida e volta; o primeiro do grupo decide em casa).
      if (feitaFase('G')) {
        copia();
        const o1 = ordemDoGrupo(c, 'G1'), o2 = ordemDoGrupo(c, 'G2');
        c.matches.push(...jogosDaFase(c, fase('SF'), [[o1[0], o2[1]], [o2[0], o1[1]]], oc, somarDias(hoje, 1)));
        progressou = true;
      }
    } else if (c.id === 'SERIE_D' && !temFase('R32')) {
      // Fim da 1.a fase: os 4 primeiros de cada grupo (32) entram no mata-mata, cabecas de serie por posicao no grupo e depois pontos e saldo.
      if (c.matches.filter(m => m.group).every(m => m.played) && (!c.grupoExterno || opcoes.grupoExterno)) {
        copia();
        const q: { k: string; pos: number; p: number; sg: number; gf: number }[] = [];
        Object.keys(c.groups!).forEach(g => { const { ord, pts } = (g === c.grupoExterno && opcoes.grupoExterno) ? opcoes.grupoExterno : estatDoGrupo(c, g); ord.slice(0, 4).forEach((k, i) => q.push({ k, pos: i, p: pts[k].p, sg: pts[k].sg, gf: pts[k].gf })); });
        q.sort((x, y) => x.pos - y.pos || y.p - x.p || y.sg - x.sg || y.gf - x.gf || hash(x.k) - hash(y.k));
        const top = q.map(x => x.k);
        c.teamKeys = top.concat(c.teamKeys.filter(k => top.indexOf(k) < 0));
        const seedD = (k: string) => c.teamKeys.indexOf(k);
        c.matches.push(...jogosDaFase(c, fase('R32'), parear(top, seedD), oc, somarDias(hoje, 1)));
        progressou = true;
      }
    } else {
      for (let i = 0; i < sequencia.length - 1; i++) {
        const a = sequencia[i], b = sequencia[i + 1];
        if (temFase(b) || !feitaFase(a)) continue;
        copia();
        const venc = vencedoresDe(a)!;
        // Copa do Brasil: os vencedores mais quem entra nesta fase, pareados por cabeca de serie; nas copas de grupos: o quadro fixo (1.o com 2.o...).
        const par = (c.id === 'COPA_BR' || c.id === 'SERIE_D') ? parear(venc.concat((c.entradas && c.entradas[b]) || []), seed) : (() => { const p: [string, string][] = []; for (let k = 0; k < venc.length; k += 2) p.push([venc[k], venc[k + 1]]); return p; })();
        c.matches.push(...jogosDaFase(c, fase(b), par, oc, somarDias(hoje, 1)));
        progressou = true;
        break;
      }
    }
    // 3. campeao
    if (!c.champion && feitaFase('F')) {
      copia();
      const v = vencedoresDe('F');
      if (v) { c.champion = v[0]; progressou = true; }
    }
    if (!progressou) break;
  }
  return mudou ? c : comp;
};

/** Tabela de um grupo. */
export const tabelaDoGrupo = (c: Competition, grupo: string, teams: Map<string, Team>) => {
  const rows = (c.groups?.[grupo] || []).map(k => ({ key: k, team: teams.get(k), played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 }));
  const by = new Map(rows.map(r => [r.key, r]));
  c.matches.filter(m => m.group === grupo && m.played).forEach(m => {
    const h = by.get(m.homeKey)!, a = by.get(m.awayKey)!, hs = m.homeScore || 0, as = m.awayScore || 0;
    h.played++; a.played++; h.gf += hs; h.ga += as; a.gf += as; a.ga += hs;
    if (hs > as) { h.won++; h.points += 3; a.lost++; } else if (as > hs) { a.won++; a.points += 3; h.lost++; } else { h.drawn++; a.drawn++; h.points++; a.points++; }
  });
  return rows.sort((x, y) => y.points - x.points || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf);
};

export const NOMES_FASES: Record<string, string> = { L: 'First phase', G: 'Group stage', D: 'Group stage', P1: 'Phase 1', P2: 'Phase 2', P3: 'Phase 3', P4: 'Phase 4', P5: 'Phase 5', R1: 'First round', R32: 'Round of 32', R16: 'Round of 16', QF: 'Quarter-finals', SF: 'Semi-finals', F: 'Final', G1: 'Group MD1', G2: 'Group MD2', G3: 'Group MD3', G4: 'Group MD4', G5: 'Group MD5', G6: 'Group MD6' };

// ------------------------------------------------------------------ ligas -> copas

import type { WorldLeague } from './world';
import { COUNTRIES } from './dataGenerator';

/** A liga do utilizador como WorldLeague (clubes e jogos vivos do jogo), para entrar no mapa de clubes e nos qualificados das copas. */
export const ligaDoUtilizador = (userTeam: Team | undefined, teams: Team[], fixtures: import('../types').Fixture[]): WorldLeague | null => {
  if (!userTeam) return null;
  const c: any = (COUNTRIES as any[]).find(x => x.id === userTeam.country);
  const lg = c && c.leagues.find((l: any) => l.id === userTeam.leagueId);
  return {
    countryId: userTeam.country, countryName: c ? c.name : userTeam.country, leagueId: userTeam.leagueId, leagueName: lg ? lg.name : userTeam.leagueId,
    tier: lg ? lg.tier : 1, relegated: lg ? (lg.relegated || 0) : 0, teams, fixtures: fixtures.filter(f => !f.isFriendly && (f.type === undefined || f.type === 'LEAGUE'))
  };
};

/** Todos os clubes por chave `liga|id`. */
export const mapaDeClubes = (ligas: WorldLeague[]): Map<string, Team> => {
  const m = new Map<string, Team>();
  ligas.forEach(l => l.teams.forEach(t => m.set(teamKey(l.leagueId, t.id), t)));
  return m;
};

/** Cria as tres copas a partir das ligas (a classificacao do ano anterior define quem joga). `anterior`: tabelas finais da temporada passada por liga (nomes), se houver. */
export const criarCopas = (ligas: WorldLeague[], anterior?: Record<string, string[]>, ocupado?: Ocupacao, userKey?: string | null, userLeagueId?: string): Competition[] => {
  const oc = ocupado || ocupacaoDe(ligas, []);
  const paraCopas: LigaParaCopas[] = ligas.map(l => {
    const lg: any = (COUNTRIES as any[]).find(c => c.id === l.countryId)?.leagues.find((x: any) => x.id === l.leagueId);
    return { leagueId: l.leagueId, countryId: l.countryId, tier: l.tier, teams: l.teams, teamIds: ((lg && lg.teamIds) || []).map(String), anterior: anterior ? anterior[l.leagueId] : null };
  });
  const q = qualificados(paraCopas);
  // Uma de cada vez, para a seguinte ja ver os dias que a anterior ocupou.
  const lib = criarLibertadores(q.lib, oc), sul = criarSulAmericana(q.sul, oc), copa = criarCopaDoBrasil(q.copa, oc);
  const out: Competition[] = [lib, sul, copa];
  if (q.serieC.length === 20) out.push(criarSerieC(q.serieC, oc, userLeagueId === 'bra_serie_c'));
  if (q.serieD.length >= 16) {
    // Com o utilizador na Serie D, o grupo dele e a liga do jogo.
    const gD = userLeagueId === 'bra_serie_d' && userKey ? Object.entries(gruposDaSerieD(q.serieD.map(x => x.key))).find(([, ks]) => ks.includes(userKey))?.[0] : undefined;
    out.push(criarSerieD(q.serieD, oc, gD));
  }
  return out;
};

/** Copia para a copa os resultados dos jogos do utilizador ja jogados no jogo (fixtures `fix-cup-<id>`). Devolve a MESMA copa se nada mudou. */
export const sincronizarResultados = (comp: Competition, fixtures: import('../types').Fixture[]): Competition => {
  const jogados = new Map(fixtures.filter(f => f.type === 'CUP' && f.played).map(f => [f.id, f]));
  if (!comp.matches.some(m => !m.played && jogados.has('fix-cup-' + m.id))) return comp;
  return { ...comp, matches: comp.matches.map(m => {
    const f = jogados.get('fix-cup-' + m.id);
    return (!m.played && f) ? { ...m, homeScore: f.homeScore || 0, awayScore: f.awayScore || 0, played: true } : m;
  }) };
};

/** Os jogos de copa do utilizador como fixtures do jogo (tipo CUP, semana 0 como os amistosos). */
export const fixturesDoUtilizador = (comps: Competition[], userKey: string): import('../types').Fixture[] => {
  const out: import('../types').Fixture[] = [];
  comps.forEach(c => c.matches.forEach(m => {
    if (m.homeKey !== userKey && m.awayKey !== userKey) return;
    out.push({
      id: 'fix-cup-' + m.id, week: 0, date: m.date, homeTeamId: m.homeKey.split('|')[1], awayTeamId: m.awayKey.split('|')[1],
      homeScore: m.homeScore as any, awayScore: m.awayScore as any, played: m.played, isFriendly: false, type: 'CUP', events: []
    } as any);
  }));
  return out;
};

export interface EntradaCopas { world: WorldLeague[]; userTeamId: string; teams: Team[]; players: import('../types').Player[]; fixtures: import('../types').Fixture[]; date: string; comps?: Competition[] | null; }
export interface SaidaCopas { comps: Competition[]; mudouComps: boolean; fixtures: import('../types').Fixture[]; teams: Team[]; players: import('../types').Player[]; }

/**
 * O QUE O JOGO PRECISA DAS COPAS, numa chamada (no arranque, ao carregar um save e a cada dia):
 *  - cria as copas (se ainda nao existem) pela classificacao do ano anterior, com os jogos agendados SEM coincidir com nenhum outro jogo dos mesmos clubes;
 *  - copia para elas os resultados dos jogos do utilizador ja jogados e joga os dos outros clubes (modelo rapido) ate `date`;
 *  - devolve as fixtures dos jogos do utilizador que ainda nao estao no jogo (as de fases novas aparecem quando a fase anterior acaba) e os clubes e jogadores adversarios
 *    que ainda nao estao no jogo (para o motor completo os poder pôr em campo).
 */
export const prepararCopas = (a: EntradaCopas): SaidaCopas | null => {
  const user = a.teams.find(t => t.id === a.userTeamId);
  if (!user) return null;
  const minha = ligaDoUtilizador(user, a.teams.filter(t => naLigaDoUtilizador(t, user)), a.fixtures);
  if (!minha) return null;
  // As ligas de formato proprio (C, D) estao sempre no mundo com TODOS os clubes: a do utilizador so entra por si se o mundo nao a tiver.
  const todas = a.world.some(l => l.leagueId === minha.leagueId) ? a.world.slice() : [minha, ...a.world];
  const uk = teamKey(user.leagueId, user.id);
  let base = a.comps ? a.comps.map(c => sincronizarResultados(c, a.fixtures)) : null;
  let oc = ocupacaoDe([...todas, minha], base || []);
  // Um save de antes das Series C e D: cria so as que faltam.
  if (base && !base.some(c => c.id === 'SERIE_C') && todas.some(l => l.leagueId === 'bra_serie_c')) {
    const novas = criarCopas(todas, undefined, oc, uk, user.leagueId).filter(c => !base!.some(b => b.id === c.id));
    if (novas.length) base = [...base, ...novas];
  }
  let cs = base || criarCopas(todas, undefined, oc, uk, user.leagueId);
  const mapa = mapaDeClubes(todas);
  // Serie C / D com o utilizador: a 1.a fase (C) ou o grupo (D) e a liga do jogo; quando acaba, a classificacao dela alimenta a competicao.
  const ligaAcabou = minha.fixtures.length > 0 && minha.fixtures.every(f => f.played);
  const tab = ligaAcabou ? buildTable(minha.teams, minha.fixtures) : null;
  const ordemL = tab ? tab.map(r => teamKey(user.leagueId, r.team.id)) : null;
  const grupoExterno = tab ? { ord: tab.map(r => teamKey(user.leagueId, r.team.id)), pts: Object.fromEntries(tab.map(r => [teamKey(user.leagueId, r.team.id), { p: r.points, sg: r.gd, gf: r.gf }])) } : null;
  cs = cs.map(c => avancarCompeticao(c, mapa, a.date, { usuario: uk, ocupado: oc, ordemL: c.id === 'SERIE_C' ? ordemL : null, grupoExterno: c.id === 'SERIE_D' ? grupoExterno : null }));
  const mudouComps = !a.comps || cs.some((c, i) => c !== a.comps![i]);

  const fixtures = fixturesDoUtilizador(cs, uk).filter(f => !a.fixtures.some(x => x.id === f.id));
  const presentes = new Set(a.teams.map(t => t.id));
  const teams: Team[] = [], players: import('../types').Player[] = [];
  cs.forEach(c => c.matches.forEach(m => {
    if (m.homeKey !== uk && m.awayKey !== uk) return;
    const k = m.homeKey === uk ? m.awayKey : m.homeKey;
    const [ligaId, tid] = k.split('|');
    if (presentes.has(tid)) return;
    const liga = a.world.find(l => l.leagueId === ligaId);
    const t = liga && liga.teams.find(x => x.id === tid);
    if (!liga || !t) return;
    presentes.add(tid);
    teams.push({ ...t });
    (liga.players || []).filter(p => p.teamId === tid).forEach(p => players.push({ ...p, fitness: 90 }));
  }));
  return { comps: cs, mudouComps, fixtures, teams, players };
};
