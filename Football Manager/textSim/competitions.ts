/*
AS COPAS DO MUNDO: Libertadores, Sul-Americana e Copa do Brasil (aba WORLD COMPETITIONS).

QUEM JOGA vem da CLASSIFICACAO DO ANO ANTERIOR de cada liga (`classificacaoAnoAnterior`): as primeiras vagas de cada pais vao para a Libertadores e as seguintes para a Sul-Americana
(`VAGAS`). A Copa do Brasil leva os 40 clubes brasileiros do jogo (Serie A e B). No primeiro ano, sem uma temporada anterior jogada, a classificacao vem de `CLASSIFICACAO_INICIAL`
(Brasil: a de 2023; os outros paises: a ordem de forca dos clubes, EDITAVEL) e nas temporadas seguintes passa a ser a tabela final da liga.

FORMATOS
- Libertadores e Sul-Americana: 32 clubes, 8 grupos de 4 (ida e volta, 6 jornadas), os 2 primeiros de cada grupo vao as oitavas; oitavas, quartas e meias em ida e volta; final em jogo unico.
- Copa do Brasil: 40 clubes. Fase 1: os 16 piores cabecas de serie jogam 8 confrontos em jogo unico (o pior colocado joga em casa); os 8 vencedores juntam-se aos 24 melhores: 32 clubes,
  16 avos, oitavas, quartas e meias em ida e volta (o melhor cabeca de serie decide em casa), final em ida e volta. Os melhores jogam contra os piores em cada fase.
- Empate no agregado (ou num jogo unico): penaltis, com ligeira vantagem para o mais forte.
Os jogos sao simulados pelo modelo rapido (textSim/world.ts) e as fases seguintes sao sorteadas quando a anterior acaba.
*/
import { Team } from '../types';
import { simulateFast } from './world';

export interface CompMatch {
  id: string; stage: string; group?: string; tie?: string; leg?: number; date: string;
  homeKey: string; awayKey: string; homeScore: number | null; awayScore: number | null; played: boolean;
  pens?: [number, number];     // penaltis (casa, fora) — so no jogo que decide o confronto
}

export interface Competition {
  id: 'LIB' | 'SUL' | 'COPA_BR';
  name: string;
  teamKeys: string[];
  groups?: Record<string, string[]>;
  matches: CompMatch[];
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
  { nome: 'R1', datas: ['2024-04-17'] }, { nome: 'R32', datas: ['2024-05-15', '2024-06-12'] }, { nome: 'R16', datas: ['2024-07-17', '2024-07-24'] },
  { nome: 'QF', datas: ['2024-08-28', '2024-09-04'] }, { nome: 'SF', datas: ['2024-10-02', '2024-10-09'] }, { nome: 'F', datas: ['2024-11-06', '2024-11-13'] }
];

/*
A CLASSIFICACAO INICIAL (ano anterior) por liga: nomes dos clubes, do 1.o ao ultimo. EDITAVEL. Brasil: classificacao final de 2023 (os promovidos pela ordem da Serie B 2023);
as outras ligas: sem esta lista usa-se a ordem em que os clubes estao na liga (que e a ordem aproximada de forca).
*/
export const CLASSIFICACAO_INICIAL: Record<string, string[]> = {
  bra_serie_a: ['Palmeiras-SP', 'Grêmio-RS', 'Atlético-MG', 'Flamengo-RJ', 'Botafogo-RJ', 'Bragantino-SP', 'Fluminense-RJ', 'Atlético-PR', 'Internacional-RS', 'Fortaleza-CE',
    'São Paulo-SP', 'Cuiabá-MT', 'Corinthians-SP', 'Cruzeiro-MG', 'Vasco-RJ', 'Bahia-BA', 'Vitória-BA', 'Juventude-RS', 'Criciúma-SC', 'Atlético-GO']
};

const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };

/** Ordem do ano anterior de uma liga: a classificacao dada (nomes) ou, sem ela, a ordem em que a liga lista os clubes. */
export const classificacaoAnoAnterior = (leagueId: string, teams: Team[], teamIdsEmOrdem: string[], anterior?: string[] | null): Team[] => {
  const nomes = anterior || CLASSIFICACAO_INICIAL[leagueId];
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
  const copa: { key: string; team: Team }[] = [];
  for (const l of ligas) {
    if (l.tier !== 1 && !(l.countryId === '45')) continue;
    const ordem = classificacaoAnoAnterior(l.leagueId, l.teams, l.teamIds, l.anterior);
    if (l.tier === 1) {
      const nL = VAGAS.LIB[l.countryId] || 0, nS = VAGAS.SUL[l.countryId] || 0;
      ordem.slice(0, nL).forEach(t => lib.push({ key: teamKey(l.leagueId, t.id), team: t, countryId: l.countryId }));
      ordem.slice(nL, nL + nS).forEach(t => sul.push({ key: teamKey(l.leagueId, t.id), team: t, countryId: l.countryId }));
    }
  }
  // Copa do Brasil: Serie A (ordem do ano anterior) e depois a Serie B.
  const brA = ligas.find(l => l.countryId === '45' && l.tier === 1), brB = ligas.find(l => l.countryId === '45' && l.tier === 2);
  if (brA) classificacaoAnoAnterior(brA.leagueId, brA.teams, brA.teamIds, brA.anterior).forEach(t => copa.push({ key: teamKey(brA.leagueId, t.id), team: t }));
  if (brB) classificacaoAnoAnterior(brB.leagueId, brB.teams, brB.teamIds, brB.anterior).forEach(t => copa.push({ key: teamKey(brB.leagueId, t.id), team: t }));
  return { lib, sul, copa };
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

/** Copa do Brasil: fase 1 (jogo unico) entre os cabecas de serie 25-40; o pior cabeca joga em casa. */
export const criarCopaDoBrasil = (copa: { key: string; team: Team }[], oc: Ocupacao = new Map()): Competition => {
  const keys = copa.map(c => c.key);
  const n = keys.length;
  const matches: CompMatch[] = [];
  const baixos = keys.slice(Math.max(0, n - 16));   // os 16 ultimos
  for (let i = 0; i < baixos.length / 2; i++) {
    const melhor = baixos[i], pior = baixos[baixos.length - 1 - i];
    matches.push(jogo(`COPA_BR-R1-${i}`, 'R1', agendarJogo(oc, FASES_COPA[0].datas[0], [pior, melhor], INICIO_DA_EPOCA), pior, melhor, { tie: 'R1-' + i }));
  }
  return { id: 'COPA_BR', name: 'Copa do Brasil', teamKeys: keys, matches };
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

const faseDoComp = (c: Competition) => (c.id === 'LIB' ? FASES_LIB : c.id === 'SUL' ? FASES_SUL : FASES_COPA);

/** Cria os jogos de uma fase a partir de pares [melhor, pior] (ida em casa do pior, volta em casa do melhor; jogo unico: em casa o 1.o). */
const jogosDaFase = (c: Competition, fase: { nome: string; datas: string[] }, pares: [string, string][], oc: Ocupacao): CompMatch[] => {
  const out: CompMatch[] = [];
  // Nunca antes do ultimo jogo da fase anterior.
  const minimo = c.matches.length ? somarDias(c.matches.reduce((m, x) => (x.date > m ? x.date : m), '0000-00-00'), 1) : INICIO_DA_EPOCA;
  pares.forEach(([melhor, pior], i) => {
    const tie = `${fase.nome}-${i}`;
    if (fase.datas.length === 1) out.push(jogo(`${c.id}-${tie}`, fase.nome, agendarJogo(oc, fase.datas[0], [melhor, pior], minimo), melhor, pior, { tie }));
    else {
      const d1 = agendarJogo(oc, fase.datas[0], [melhor, pior], minimo);
      out.push(jogo(`${c.id}-${tie}-1`, fase.nome, d1, pior, melhor, { tie, leg: 1 }));
      out.push(jogo(`${c.id}-${tie}-2`, fase.nome, agendarJogo(oc, fase.datas[1], [melhor, pior], somarDias(d1, 2)), melhor, pior, { tie, leg: 2 }));
    }
  });
  return out;
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
export interface OpcoesAvanco { usuario?: string | null; ocupado?: Ocupacao }
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
    const sequencia = c.id === 'COPA_BR' ? ['R1', 'R32', 'R16', 'QF', 'SF', 'F'] : ['R16', 'QF', 'SF', 'F'];
    const fase = (nome: string) => fases.find(f => f.nome === nome)!;
    const seed = (k: string) => c.teamKeys.indexOf(k);

    if (c.id !== 'COPA_BR' && !temFase('R16')) {
      const todosGrupos = c.matches.filter(m => m.group).every(m => m.played);
      if (todosGrupos) {
        copia();
        const { primeiros, segundos } = classificadosDosGrupos(c);
        // cada primeiro joga contra um segundo de OUTRO grupo
        let seg = embaralhar(segundos), ok = false;
        for (let t = 0; t < 200 && !ok; t++) { seg = embaralhar(segundos); ok = primeiros.every((p, i) => (c.groups![Object.keys(c.groups!).find(g => c.groups![g].includes(p))!]).indexOf(seg[i]) < 0); }
        c.matches.push(...jogosDaFase(c, fase('R16'), primeiros.map((p, i) => [p, seg[i]] as [string, string]), oc));
        progressou = true;
      }
    } else if (c.id === 'COPA_BR' && feitaFase('R1') && !temFase('R32')) {
      copia();
      const venc = vencedoresDe('R1')!;
      const todos = c.teamKeys.slice(0, Math.max(0, c.teamKeys.length - 16)).concat(venc);
      c.matches.push(...jogosDaFase(c, fase('R32'), parear(todos, seed), oc));
      progressou = true;
    } else {
      for (let i = (c.id === 'COPA_BR' ? 1 : 0); i < sequencia.length - 1; i++) {
        const a = sequencia[i], b = sequencia[i + 1];
        if (temFase(b) || !feitaFase(a)) continue;
        copia();
        const venc = vencedoresDe(a)!;
        const par = c.id === 'COPA_BR' ? parear(venc, seed) : (() => { const p: [string, string][] = []; for (let k = 0; k < venc.length; k += 2) p.push([venc[k], venc[k + 1]]); return p; })();
        c.matches.push(...jogosDaFase(c, fase(b), par, oc));
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

export const NOMES_FASES: Record<string, string> = { R1: 'First round', R32: 'Round of 32', R16: 'Round of 16', QF: 'Quarter-finals', SF: 'Semi-finals', F: 'Final', G1: 'Group MD1', G2: 'Group MD2', G3: 'Group MD3', G4: 'Group MD4', G5: 'Group MD5', G6: 'Group MD6' };

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
export const criarCopas = (ligas: WorldLeague[], anterior?: Record<string, string[]>, ocupado?: Ocupacao): Competition[] => {
  const oc = ocupado || ocupacaoDe(ligas, []);
  const paraCopas: LigaParaCopas[] = ligas.map(l => {
    const lg: any = (COUNTRIES as any[]).find(c => c.id === l.countryId)?.leagues.find((x: any) => x.id === l.leagueId);
    return { leagueId: l.leagueId, countryId: l.countryId, tier: l.tier, teams: l.teams, teamIds: ((lg && lg.teamIds) || []).map(String), anterior: anterior ? anterior[l.leagueId] : null };
  });
  const q = qualificados(paraCopas);
  // Uma de cada vez, para a seguinte ja ver os dias que a anterior ocupou.
  const lib = criarLibertadores(q.lib, oc), sul = criarSulAmericana(q.sul, oc), copa = criarCopaDoBrasil(q.copa, oc);
  return [lib, sul, copa];
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
  const minha = ligaDoUtilizador(user, a.teams.filter(t => t.leagueId === user.leagueId), a.fixtures);
  if (!minha) return null;
  const todas = [minha, ...a.world];
  const base = a.comps ? a.comps.map(c => sincronizarResultados(c, a.fixtures)) : null;
  const oc = ocupacaoDe(todas, base || []);
  let cs = base || criarCopas(todas, undefined, oc);
  const mapa = mapaDeClubes(todas);
  const uk = teamKey(user.leagueId, user.id);
  cs = cs.map(c => avancarCompeticao(c, mapa, a.date, { usuario: uk, ocupado: oc }));
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
