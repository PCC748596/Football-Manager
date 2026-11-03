# Manager Expectations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dynamic coach market for every club in the database: per-club expectations, Board Confidence, justified dismissals, Manager Reputation, job offers and automatic replacement, without touching match logic.

**Architecture:** Pure modules in `textSim/` (`tradicao.ts`, `managerExpectations.ts`, `managerLigas.ts`) following the project convention (pure functions, Portuguese header comment, exported `CONFIG_*`). `GameContext` owns one `managerState` and calls a single entry point `atualizarTreinadores` from a `useEffect` keyed on `[world, fixtures]`. The entry point is idempotent, so reloads and re-renders are safe.

**Tech Stack:** TypeScript 5.8, React 19, `node:test` through `tsx`. App root is `Football Manager/Football Manager` (all paths below are relative to it).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-11-03-manager-expectations-design.md`. Plan follows it.
- Do not change `textSim/matchEngine.ts`, `textSim/world.ts` (`simulateFast`) or any match logic.
- Code comments and identifiers follow the surrounding code (Portuguese comments, `L(lang, en, pt)` for user text).
- Clubs are identified by `teamKey(leagueId, teamId)` from `textSim/competitions.ts` (ids repeat across leagues).
- Determinism: all randomness through `criarRng(seed)` from `textSim/contracts.ts`; never `Math.random`.
- Expectation levels by OVR: 90-100 titles, 80-89 contend, 70-79 top places, 60-69 upper half, 50-59 survive, <50 avoid relegation. Tradition moves the level by at most +-1.
- Confidence weights: 50% results, 30% position, 20% achievements. Bands: 80-100 excelente, 60-79 boa, 40-59 pressao, 20-39 risco, 0-19 iminente.
- Dismissal only with confidence < 20 (plus pressure rule for < 40 over many rounds). Every club must always have a manager.
- User is also evaluated. Dismissal/offers reach the user by inbox (`BOARD`), no game over. Switching the controlled club is NOT part of Tasks 1-7 (see Task 8).
- Run tests from the app root: `npx tsx --test tests/<file>.test.ts`.

## File Structure

- Create `textSim/tradicao.ts`: name matching against `tradicaoClubes.json` and the +-1 tradition adjustment per league.
- Create `textSim/managerExpectations.ts`: types, CONFIG, expectation, confidence, dismissal, seeding, per-round processing, season close (reputation + offers), `atualizarTreinadores`, `aplicarTreinadores`.
- Create `textSim/managerLigas.ts`: builds `LigaSnap[]` from game state (the only file that imports `world.ts`/`dataGenerator.ts`).
- Create `tools/validar_tradicao.ts`: reports club names in the database that do not match `tradicaoClubes.json`.
- Create `components/BoardConfidenceCard.tsx`: small dashboard card.
- Modify `textSim/inbox.ts`: three BOARD messages.
- Modify `context/GameContext.tsx`: state, effect, save/load, context value.
- Modify `components/DashboardView.tsx`: mount the card.
- Modify `package.json`: add new test files to `teste:base`.
- Tests: `tests/tradicao.test.ts`, `tests/manager_expectations.test.ts`, `tests/manager_inbox.test.ts`.

---

### Task 1: Tradition matching and adjustment

**Files:**
- Create: `textSim/tradicao.ts`
- Create: `tools/validar_tradicao.ts`
- Test: `tests/tradicao.test.ts`

**Interfaces:**
- Produces: `normalizar(s: string): string`, `acharEntrada(nome: string): { clube: string; fanBase: number; fundacao: number; heritage: number } | undefined`, `ajustesDeTradicao(times: Team[], anoBase?: number): Record<string, -1 | 0 | 1>` (key = `team.id`), `CONFIG_TRADICAO`.

- [ ] **Step 1: Write the failing test**

Create `tests/tradicao.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { acharEntrada, ajustesDeTradicao, normalizar } from '../textSim/tradicao';

const time = (id: string, name: string, fanBase: number, foundedYear: number) => ({ id, name, fanBase, foundedYear }) as any;

test('normalizar: sem acento, minusculas, so letras e numeros', () => {
  assert.equal(normalizar('Atlético-MG'), 'atleticomg');
  assert.equal(normalizar('São Paulo'), 'saopaulo');
});

test('acharEntrada: nome exato, sufixo de UF da base e alias', () => {
  assert.equal(acharEntrada('Flamengo-RJ')?.heritage, 100);   // base: Flamengo-RJ, json: Flamengo
  assert.equal(acharEntrada('Atlético-MG')?.heritage, 39);    // exato
  assert.equal(acharEntrada('Botafogo-RJ')?.heritage, 40);    // cai no Botafogo da Serie A
  assert.equal(acharEntrada('Botafogo-SP')?.heritage, 29);    // exato vence o sufixo
  assert.equal(acharEntrada('Atlético-PR')?.heritage, 32);    // alias para Athletico-PR
  assert.equal(acharEntrada('Manchester United')?.heritage, 100);
  assert.equal(acharEntrada('Clube Inexistente'), undefined);
});

test('ajustesDeTradicao: 20 clubes distintos -> 3 sobem, 5 descem, resto 0', () => {
  const times = Array.from({ length: 20 }, (_, i) => time('t' + i, 'Clube ' + i, 10 + i * 5, 1900 + i));
  const aj = ajustesDeTradicao(times);
  const valores = Object.values(aj);
  assert.equal(valores.filter(v => v === 1).length, 3);
  assert.equal(valores.filter(v => v === -1).length, 5);
});

test('ajustesDeTradicao: clubes iguais nao sao empurrados para baixo', () => {
  const times = Array.from({ length: 6 }, (_, i) => time('t' + i, 'Clube ' + i, 10, 1950));
  assert.ok(Object.values(ajustesDeTradicao(times)).every(v => v === 0));
});

test('ajustesDeTradicao: o heritage do json manda sobre a torcida', () => {
  const times = [time('a', 'Flamengo-RJ', 1, 2020), ...Array.from({ length: 9 }, (_, i) => time('t' + i, 'Clube ' + i, 50, 1900))];
  assert.equal(ajustesDeTradicao(times)['a'], 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test tests/tradicao.test.ts`
Expected: FAIL (cannot find module `../textSim/tradicao`).

- [ ] **Step 3: Write the implementation**

Create `textSim/tradicao.ts`:

```ts
/*
TRADICAO DOS CLUBES — decide se a historia do clube sobe (+1), desce (-1) ou mantem (0) o nivel de exigencia da diretoria (ver textSim/managerExpectations.ts).

A lista do utilizador esta em textSim/tradicaoClubes.json (campo `heritage` 0-100). Os clubes que nao estao la usam a torcida (`fanBase`) e a idade (`foundedYear`), comparadas com as
dos colegas da mesma liga. O ajuste e sempre RELATIVO a liga: os ~15% de cima sobem um nivel e os ~25% de baixo descem um (empates ficam no meio).
*/
import type { Team } from '../types';
import tradicao from './tradicaoClubes.json';

export interface EntradaTradicao { clube: string; fanBase: number; fundacao: number; heritage: number; }

export const CONFIG_TRADICAO = { topo: 85, base: 25, pesoTorcida: 0.6, pesoIdade: 0.4, idadeMaxima: 130 };

/** Nomes da base que diferem do json (chave e valor ja normalizados). */
const ALIAS: Record<string, string> = { atleticopr: 'athleticopr' };

export const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const semUf = (s: string) => s.replace(/-[A-Za-z]{2}$/, '');

const INDICE = new Map<string, EntradaTradicao>();
for (const lista of Object.values(tradicao as unknown as Record<string, EntradaTradicao[]>)) for (const e of lista) INDICE.set(normalizar(e.clube), e);

/** Procura o clube: nome exato, alias, e por fim o nome sem o sufixo de UF da base ("Flamengo-RJ" -> "Flamengo"). */
export const acharEntrada = (nome: string): EntradaTradicao | undefined => {
  const n = normalizar(nome);
  return INDICE.get(n) || INDICE.get(ALIAS[n] || '') || INDICE.get(normalizar(semUf(nome)));
};

/** Percentil 0-100 de cada valor (empates dividem a posicao: todos iguais -> 50). */
const percentis = (valores: number[]): number[] => {
  if (valores.length < 2) return valores.map(() => 50);
  return valores.map(v => {
    const abaixo = valores.filter(x => x < v).length, iguais = valores.filter(x => x === v).length;
    return ((abaixo + (iguais - 1) / 2) / (valores.length - 1)) * 100;
  });
};

/** Ajuste de tradicao (+1, 0, -1) de cada clube de UMA liga, por `team.id`. */
export const ajustesDeTradicao = (times: Team[], anoBase = 2024): Record<string, -1 | 0 | 1> => {
  const C = CONFIG_TRADICAO;
  const idade = (t: Team) => Math.max(0, Math.min(100, ((anoBase - (t.foundedYear || anoBase)) / C.idadeMaxima) * 100));
  const pTorcida = percentis(times.map(t => t.fanBase || 0));
  const pontos = times.map((t, i) => acharEntrada(t.name)?.heritage ?? C.pesoTorcida * pTorcida[i] + C.pesoIdade * idade(t));
  const p = percentis(pontos);
  const out: Record<string, -1 | 0 | 1> = {};
  times.forEach((t, i) => { out[t.id] = p[i] >= C.topo ? 1 : p[i] <= C.base ? -1 : 0; });
  return out;
};
```

Create `tools/validar_tradicao.ts`:

```ts
/*
CONFERE A LISTA DE TRADICAO (textSim/tradicaoClubes.json) com a base: imprime os clubes da base SEM entrada na lista e as entradas da lista que nenhum clube da base usa.
Corre com:   npx tsx tools/validar_tradicao.ts      (os "sem entrada" usam a torcida e a idade; ajuste os nomes no json ou o ALIAS em textSim/tradicao.ts)
*/
import { REAL_TEAMS_JSON } from '../textSim/realDatabase';
import tradicao from '../textSim/tradicaoClubes.json';
import { acharEntrada } from '../textSim/tradicao';

const usadas = new Set<string>();
const semEntrada: string[] = [];
for (const t of REAL_TEAMS_JSON) {
  const e = acharEntrada(t.teamName);
  if (e) usadas.add(e.clube); else semEntrada.push(t.teamName);
}
const naoUsadas = Object.values(tradicao as unknown as Record<string, { clube: string }[]>).flat().map(e => e.clube).filter(c => !usadas.has(c));
console.log(`Clubes da base sem entrada (${semEntrada.length}):\n  ` + semEntrada.join('\n  '));
console.log(`\nEntradas da lista que nenhum clube da base usa (${naoUsadas.length}):\n  ` + naoUsadas.join('\n  '));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test tests/tradicao.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Run the validator and report**

Run: `npx tsx tools/validar_tradicao.ts`
Expected: prints both lists. Do not edit the json to force a match. If a Brazilian or English/French/Spanish/German club is clearly the same club under a different spelling, add one line to `ALIAS` in `textSim/tradicao.ts` (key and value already normalized). Keep the printed lists for the final report to the user.

- [ ] **Step 6: Commit**

```bash
git add textSim/tradicao.ts tools/validar_tradicao.ts tests/tradicao.test.ts
git commit -m "feat: tradition adjustment per league from heritage list

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Expectations, confidence and dismissal rules

**Files:**
- Create: `textSim/managerExpectations.ts` (first part: types, CONFIG, pure rules)
- Test: `tests/manager_expectations.test.ts`

**Interfaces:**
- Produces (all exported from `textSim/managerExpectations.ts`): `CONFIG_MGR`, `USUARIO_ID = 'user'`, types `Manager`, `OfertaUsuario`, `ManagerState`, `LigaSnap`, `EventoMgr`, `Faixa`, `Rodada`; functions `nivelDoOvr(ovr: number): number`, `nivelDoClube(strength: number, ajuste: number): number`, `exigenciaDoNivel(nivel: number): number`, `posicaoAlvo(nivel: number, n: number, rebaixados: number): number`, `aproveitamentoEsperado(alvo: number, n: number): number`, `alvoDeConfianca(r: Rodada): number`, `atualizarConfianca(atual: number, alvo: number, passos?: number): number`, `faixaDeConfianca(c: number): Faixa`, `probDemissao(m: Manager, emZonaDeQueda: boolean, jogos: number): number`.

- [ ] **Step 1: Write the failing tests**

Create `tests/manager_expectations.test.ts` (later tasks append to this file):

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIG_MGR, nivelDoOvr, nivelDoClube, posicaoAlvo, alvoDeConfianca, atualizarConfianca, faixaDeConfianca, probDemissao, Manager
} from '../textSim/managerExpectations';

const mgr = (extra: Partial<Manager> = {}): Manager => ({ id: 'm', nome: 'Tec', tatico: 70, reputation: 50, confidence: 62, clubKey: 'L|a', lowConfRounds: 0, grace: 0, ultimoJogos: 0, jaMovido: false, ...extra });

test('nivelDoOvr: faixas do pedido', () => {
  const casos: [number, number][] = [[49, 0], [50, 1], [59, 1], [60, 2], [69, 2], [70, 3], [79, 3], [80, 4], [89, 4], [90, 5], [100, 5]];
  for (const [ovr, nivel] of casos) assert.equal(nivelDoOvr(ovr), nivel, 'ovr ' + ovr);
});

test('nivelDoClube: a tradicao move um nivel e nunca sai de 0-5', () => {
  assert.equal(nivelDoClube(95, 1), 5);
  assert.equal(nivelDoClube(40, -1), 0);
  assert.equal(nivelDoClube(75, 1), 4);
  assert.equal(nivelDoClube(75, -1), 2);
});

test('posicaoAlvo: liga de 20 com 4 rebaixados', () => {
  const alvos = [0, 1, 2, 3, 4, 5].map(n => posicaoAlvo(n, 20, 4));
  assert.deepEqual(alvos, [16, 15, 10, 5, 3, 1]);
});

test('alvoDeConfianca: cumprir a expectativa da neutro (60); superar sobe; fracassar desce', () => {
  const neutro = alvoDeConfianca({ jogos: 25, pontos: 54, posicao: 1, n: 20, alvo: 1 });
  assert.ok(Math.abs(neutro - CONFIG_MGR.neutro) < 0.5, 'neutro ' + neutro);
  const otimo = alvoDeConfianca({ jogos: 25, pontos: 70, posicao: 1, n: 20, alvo: 10 });
  const pessimo = alvoDeConfianca({ jogos: 25, pontos: 8, posicao: 19, n: 20, alvo: 5 });
  assert.ok(otimo > 85, 'otimo ' + otimo);
  assert.ok(pessimo < 20, 'pessimo ' + pessimo);
});

test('atualizarConfianca: gradual (15% do caminho por rodada)', () => {
  assert.ok(Math.abs(atualizarConfianca(60, 0) - 51) < 1e-9);
  assert.ok(Math.abs(atualizarConfianca(60, 0, 2) - 43.35) < 1e-9);
  assert.equal(atualizarConfianca(100, 100), 100);
});

test('faixaDeConfianca: limites', () => {
  const casos: [number, string][] = [[100, 'EXCELENTE'], [80, 'EXCELENTE'], [79, 'BOA'], [60, 'BOA'], [59, 'PRESSAO'], [40, 'PRESSAO'], [39, 'RISCO'], [20, 'RISCO'], [19, 'IMINENTE'], [0, 'IMINENTE']];
  for (const [c, f] of casos) assert.equal(faixaDeConfianca(c), f, 'conf ' + c);
});

test('probDemissao: protegido por carencia e por poucos jogos; so cai com confianca < 20 (ou pressao longa)', () => {
  assert.equal(probDemissao(mgr({ confidence: 5, grace: 3 }), false, 20), 0);
  assert.equal(probDemissao(mgr({ confidence: 5 }), false, 7), 0);
  assert.equal(probDemissao(mgr({ confidence: 50, lowConfRounds: 9 }), false, 20), 0);
  assert.ok(Math.abs(probDemissao(mgr({ confidence: 10 }), false, 20) - 0.25) < 1e-9);
  assert.ok(Math.abs(probDemissao(mgr({ confidence: 10 }), true, 20) - 0.375) < 1e-9);
  assert.equal(probDemissao(mgr({ confidence: 10, lowConfRounds: 9 }), false, 20), CONFIG_MGR.probTeto);
  assert.ok(Math.abs(probDemissao(mgr({ confidence: 30, lowConfRounds: 6 }), false, 20) - 0.1) < 1e-9);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx tsx --test tests/manager_expectations.test.ts`
Expected: FAIL (cannot find module).

- [ ] **Step 3: Write the first part of the module**

Create `textSim/managerExpectations.ts`:

```ts
/*
MANAGER EXPECTATIONS — expectativas dos clubes, confianca da diretoria, demissoes, reputacao e mercado de treinadores, para TODOS os clubes da base (nao so o do utilizador).

Funcoes puras: o contexto do jogo (context/GameContext.tsx) chama `atualizarTreinadores` quando o mundo ou os jogos mudam. Nao mexe no motor das partidas.
- Expectativa: o OVR do clube (`Team.strength`) da o nivel 0-5 (90+ titulo, 80+ disputar, 70+ primeiros, 60+ metade de cima, 50+ permanencia, abaixo evitar queda); a tradicao
  (textSim/tradicao.ts) soma +-1. O nivel vira uma posicao-alvo relativa ao tamanho da liga.
- Board Confidence 0-100: 50% aproveitamento (contra o esperado para a posicao-alvo), 30% posicao, 20% conquistas. Muda aos poucos (15% do caminho por rodada).
- Demissao: so com confianca < 20 (ou pressao longa abaixo de 40), nunca na carencia pos-contratacao nem antes de 8 jogos; a zona de rebaixamento acelera. Sorteio com semente.
- Reputacao 0-100, independente da confianca: muda no fim da liga (aproveitamento, posicao final, titulo, promocao, classificacao).
- Ofertas: no fim da liga, clubes precisando de treinador convidam o melhor compativel de um clube menor. Substituto: o livre com reputacao mais proxima da exigencia do clube.
O jogo ainda nao tem virada de temporada: cada liga fecha uma vez (`fechadas`) e cada treinador muda de clube no maximo uma vez (`jaMovido`).
*/
import type { Team } from '../types';
import type { TableRow } from './world';
import { criarRng } from './contracts';
import { nomeAleatorio } from './nomes';
import { ajustesDeTradicao } from './tradicao';
import { teamKey } from './competitions';

export const USUARIO_ID = 'user';

export const CONFIG_MGR = {
  niveisOvr: [50, 60, 70, 80, 90],
  /** Reputacao que cada nivel (0-5) exige de um treinador. */
  exigencia: [20, 35, 50, 65, 80, 92],
  confInicial: 62, suavizacao: 0.15, minJogosAvaliar: 3, minJogosDemissao: 8, carencia: 6,
  pesos: { aproveitamento: 0.5, posicao: 0.3, conquistas: 0.2 },
  neutro: 60, ganhoAproveitamento: 250, ganhoPosicao: 160,
  limiteDemissao: 20, limitePressao: 40,
  probDemissaoBase: 0.25, probDemissaoPorRodada: 0.15, probPressao: 0.05, probTeto: 0.6, multZonaDeQueda: 1.5,
  repGanhoAproveitamento: 60, repGanhoPosicao: 20, repTitulo: 15, repPromocao: 8, repClassificacao: 4, repRebaixamento: -12, repDemitido: -6, repPreterido: -4,
  penalidadeRebaixamento: 25, confUsuarioAposDemissao: 35, carenciaUsuario: 10,
  lacunaReputacao: 25, tolerInf: 10, tolerSup: 25, maxOfertasUsuario: 3,
  tamanhoMinimoPool: 30, jogosTemporadaFechada: 9999
};
const C = CONFIG_MGR;

export interface Manager {
  id: string; nome: string; tatico: number;
  reputation: number; confidence: number;
  /** `teamKey(leagueId, teamId)` do clube, ou null se esta livre. */
  clubKey: string | null;
  lowConfRounds: number; grace: number;
  /** Jogos do clube na ultima atualizacao (a atualizacao so corre quando ha jogos novos). */
  ultimoJogos: number;
  jaMovido: boolean;
  usuario?: boolean;
}
export interface OfertaUsuario { id: string; clubKey: string; clube: string; exigencia: number; data: string; }
export interface ManagerState { managers: Record<string, Manager>; fechadas: string[]; ofertas: OfertaUsuario[]; }

/** Uma liga num instante: tabela atual e se acabou. (`managerLigas.ts` monta isto a partir do estado do jogo.) */
export interface LigaSnap { leagueId: string; tier: number; promovidos: number; rebaixados: number; times: Team[]; tabela: TableRow[]; encerrada: boolean; }

export type Faixa = 'EXCELENTE' | 'BOA' | 'PRESSAO' | 'RISCO' | 'IMINENTE';
export interface EventoMgr { tipo: 'DEMISSAO' | 'CONTRATACAO' | 'TRANSFERENCIA' | 'OFERTA' | 'FAIXA'; managerId: string; clubKey: string | null; clube: string; usuario: boolean; de?: string | null; faixa?: Faixa; }
export interface Rodada { jogos: number; pontos: number; posicao: number; n: number; alvo: number; conquistas?: number; }

const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const fracao = (n: number, f: number) => Math.max(1, Math.ceil(n * f - 1e-9));

export const nivelDoOvr = (ovr: number) => C.niveisOvr.filter(n => ovr >= n).length;
export const nivelDoClube = (strength: number, ajuste: number) => clamp(nivelDoOvr(strength) + ajuste, 0, 5);
export const exigenciaDoNivel = (nivel: number) => C.exigencia[nivel];

/** Posicao (1 = campeao) que a diretoria espera, para uma liga de `n` clubes com `rebaixados` descendo. */
export const posicaoAlvo = (nivel: number, n: number, rebaixados: number): number => {
  const seguro = Math.max(1, n - rebaixados);
  const alvo = [seguro, Math.max(1, seguro - 1), fracao(n, 0.5), fracao(n, 0.25), fracao(n, 0.15), 1][nivel];
  return clamp(alvo, 1, n);
};

/** Aproveitamento (0-1) normal de quem termina na posicao-alvo. */
export const aproveitamentoEsperado = (alvo: number, n: number) => 0.72 - 0.42 * ((alvo - 1) / Math.max(1, n - 1));

/** O valor (0-100) para o qual a confianca tende, dado o momento da liga. Cumprir a expectativa = `neutro`. */
export const alvoDeConfianca = (r: Rodada): number => {
  const aprov = r.jogos ? r.pontos / (3 * r.jogos) : 0;
  const a = clamp(C.neutro + (aprov - aproveitamentoEsperado(r.alvo, r.n)) * C.ganhoAproveitamento);
  const p = clamp(C.neutro + ((r.alvo - r.posicao) / Math.max(1, r.n - 1)) * C.ganhoPosicao);
  const c = clamp(r.conquistas ?? C.neutro);
  return a * C.pesos.aproveitamento + p * C.pesos.posicao + c * C.pesos.conquistas;
};

/** A confianca anda `suavizacao` do caminho ate o alvo por rodada (`passos` rodadas de uma vez). */
export const atualizarConfianca = (atual: number, alvo: number, passos = 1) => clamp(atual + (alvo - atual) * (1 - Math.pow(1 - C.suavizacao, passos)));

export const faixaDeConfianca = (c: number): Faixa => c >= 80 ? 'EXCELENTE' : c >= 60 ? 'BOA' : c >= 40 ? 'PRESSAO' : c >= 20 ? 'RISCO' : 'IMINENTE';

/** Chance de demissao nesta rodada. Zero na carencia, antes de `minJogosDemissao` jogos ou com confianca >= 40 sem pressao longa. */
export const probDemissao = (m: Manager, emZonaDeQueda: boolean, jogos: number): number => {
  if (m.grace > 0 || jogos < C.minJogosDemissao) return 0;
  let p = 0;
  if (m.confidence < C.limiteDemissao) p = C.probDemissaoBase + C.probDemissaoPorRodada * Math.min(m.lowConfRounds, 3);
  else if (m.confidence < C.limitePressao && m.lowConfRounds > 4) p = C.probPressao * (m.lowConfRounds - 4);
  if (emZonaDeQueda) p *= C.multZonaDeQueda;
  return Math.min(C.probTeto, p);
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx tsx --test tests/manager_expectations.test.ts`
Expected: PASS (7 tests). If `probDemissao` case `conf 10, lowConfRounds 9` fails, the cap (`probTeto`) is applied after the multiplier: keep it that way.

- [ ] **Step 5: Commit**

```bash
git add textSim/managerExpectations.ts tests/manager_expectations.test.ts
git commit -m "feat: manager expectation levels, board confidence and dismissal rules

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Seeding, pool, per-round processing and replacement

**Files:**
- Modify: `textSim/managerExpectations.ts` (append)
- Test: `tests/manager_expectations.test.ts` (append)

**Interfaces:**
- Consumes: everything from Task 2; `ajustesDeTradicao` from Task 1.
- Produces: `semearTreinadores(ligas: LigaSnap[], usuario?: { clubKey: string; nome: string }): ManagerState`, `garantirPool(estado: ManagerState): ManagerState`, `processarRodada(estado: ManagerState, ligas: LigaSnap[]): { estado: ManagerState; eventos: EventoMgr[] }`. Internal helpers reused by Task 4 (same file): `livres`, `novoLivre`, `preencherVaga`, `indicePorClube`, `demitir`.

- [ ] **Step 1: Append failing tests**

Append to `tests/manager_expectations.test.ts` (add these names to the existing import: `semearTreinadores, processarRodada, LigaSnap, USUARIO_ID`):

```ts
import { semearTreinadores, processarRodada, LigaSnap, USUARIO_ID } from '../textSim/managerExpectations';

// Todos os clubes de teste tem a mesma torcida e fundacao: a tradicao nao muda nenhum nivel (ajuste 0).
const time = (id: string, strength: number, leagueId = 'L1') => ({ id, name: 'Clube ' + id, leagueId, strength, managerName: 'Tec ' + id, managerTactics: 70, fanBase: 10, foundedYear: 1950 }) as any;
const key = (id: string, leagueId = 'L1') => leagueId + '|' + id;
const snap = (times: any[], pontos: Record<string, number>, jogos: number, extra: Partial<LigaSnap> = {}): LigaSnap => ({
  leagueId: 'L1', tier: 1, promovidos: 1, rebaixados: 2, times, encerrada: false, ...extra,
  tabela: times.map(t => ({ team: t, played: jogos, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: pontos[t.id] ?? 0 })).sort((a, b) => b.points - a.points)
});
const seis = () => [time('A', 90), time('B', 90), time('C', 70), time('D', 60), time('E', 50), time('F', 50)];
const todosTemTreinador = (estado: any, times: any[]) => times.every(t => Object.values<any>(estado.managers).filter(m => m.clubKey === key(t.id)).length === 1);

test('semear: um treinador por clube (o do utilizador no clube dele), reputacao segue o nivel e ha pool de livres', () => {
  const times = [time('A', 85), time('Z', 45)];
  const estado = semearTreinadores([snap(times, {}, 0)], { clubKey: key('A'), nome: 'Eu' });
  assert.equal(estado.managers[USUARIO_ID].clubKey, key('A'));
  assert.equal(estado.managers[USUARIO_ID].nome, 'Eu');
  assert.equal(estado.managers['m|' + key('Z')].nome, 'Tec Z');
  assert.ok(estado.managers[USUARIO_ID].reputation > estado.managers['m|' + key('Z')].reputation);
  assert.ok(Object.values(estado.managers).filter(m => !m.clubKey).length >= 30);
  assert.ok(todosTemTreinador(estado, times));
});

test('processarRodada: treinador fracassado cai (com carencia e reposicao), sem sobrar clube vazio', () => {
  const times = seis();
  let estado = semearTreinadores([snap(times, {}, 0)]);
  const velho = estado.managers['m|' + key('A')];
  let demitido = false, contratou = false;
  for (let k = 3; k <= 40; k++) {
    const pontos: Record<string, number> = { A: 0, B: 3 * k, C: 2 * k, D: 2 * k, E: k, F: k };   // A, o favorito, em ultimo
    const r = processarRodada(estado, [snap(times, pontos, k)]);
    estado = r.estado;
    if (r.eventos.some(e => e.tipo === 'DEMISSAO' && e.clubKey === key('A'))) demitido = true;
    if (r.eventos.some(e => e.tipo === 'CONTRATACAO' && e.clubKey === key('A'))) contratou = true;
    assert.ok(todosTemTreinador(estado, times), 'rodada ' + k);
    if (demitido) break;
  }
  assert.ok(demitido && contratou, 'o clube A deveria demitir e contratar');
  const novo = Object.values(estado.managers).find(m => m.clubKey === key('A'))!;
  assert.notEqual(novo.id, velho.id);
  assert.equal(estado.managers[velho.id].clubKey, null);
  assert.equal(novo.grace, CONFIG_MGR.carencia);
});

test('processarRodada: quem cumpre a expectativa nunca e demitido e a confianca sobe', () => {
  const times = seis();
  let estado = semearTreinadores([snap(times, {}, 0)]);
  for (let k = 3; k <= 38; k++) {
    const r = processarRodada(estado, [snap(times, { A: 3 * k, B: 2 * k, C: 2 * k, D: k, E: k, F: 0 }, k)]);
    estado = r.estado;
    assert.ok(!r.eventos.some(e => e.tipo === 'DEMISSAO' && e.clubKey === key('A')), 'rodada ' + k);
  }
  assert.ok(estado.managers['m|' + key('A')].confidence > 75, 'converge para ~80 (posicao-alvo cumprida, aproveitamento acima do esperado)');
});

test('processarRodada: idempotente (mesmos jogos, nada muda)', () => {
  const times = seis();
  const estado0 = semearTreinadores([snap(times, {}, 0)]);
  const s = snap(times, { A: 20, B: 18, C: 15, D: 10, E: 5, F: 2 }, 10);
  const a = processarRodada(estado0, [s]);
  const b = processarRodada(a.estado, [s]);
  assert.deepEqual(b.estado, a.estado);
  assert.equal(b.eventos.length, 0);
});

test('processarRodada: o utilizador em crise e avisado (faixa) e, se cair, recomeca com carencia sem perder o clube', () => {
  const times = seis();
  let estado = semearTreinadores([snap(times, {}, 0)], { clubKey: key('A'), nome: 'Eu' });
  let faixas = 0, demissoes = 0;
  for (let k = 3; k <= 40 && !demissoes; k++) {
    const r = processarRodada(estado, [snap(times, { A: 0, B: 3 * k, C: 2 * k, D: 2 * k, E: k, F: k }, k)]);
    estado = r.estado;
    faixas += r.eventos.filter(e => e.tipo === 'FAIXA' && e.usuario).length;
    demissoes += r.eventos.filter(e => e.tipo === 'DEMISSAO' && e.usuario).length;
  }
  assert.ok(faixas >= 1, 'avisos de faixa');
  assert.equal(demissoes, 1);
  const eu = estado.managers[USUARIO_ID];
  assert.equal(eu.clubKey, key('A'));
  assert.equal(eu.grace, CONFIG_MGR.carenciaUsuario);
  assert.equal(eu.confidence, CONFIG_MGR.confUsuarioAposDemissao);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx tsx --test tests/manager_expectations.test.ts`
Expected: FAIL (`semearTreinadores` is not exported).

- [ ] **Step 3: Append the implementation**

Append to `textSim/managerExpectations.ts`:

```ts
const livres = (managers: Record<string, Manager>) => Object.values(managers).filter(m => !m.clubKey && !m.usuario);

const novoLivre = (id: string, reputation?: number): Manager => {
  const rnd = criarRng(id);
  return { id, nome: nomeAleatorio(rnd), tatico: Math.round(60 + rnd() * 30), reputation: Math.round(reputation ?? 20 + rnd() * 65), confidence: C.confInicial, clubKey: null, lowConfRounds: 0, grace: 0, ultimoJogos: 0, jaMovido: false };
};

/** Mantem pelo menos `tamanhoMinimoPool` treinadores livres (sinteticos, com semente). */
export const garantirPool = (estado: ManagerState): ManagerState => {
  const managers = { ...estado.managers };
  let n = Object.keys(managers).length;
  for (let faltam = C.tamanhoMinimoPool - livres(managers).length; faltam > 0; faltam--) { const id = 'livre|' + n++; managers[id] = novoLivre(id); }
  return { ...estado, managers };
};

/** Um treinador por clube de cada liga (os de `Team.managerName`, que vem de textSim/treinadores.ts) e o do utilizador no clube dele. */
export const semearTreinadores = (ligas: LigaSnap[], usuario?: { clubKey: string; nome: string }): ManagerState => {
  const managers: Record<string, Manager> = {};
  for (const liga of ligas) {
    const ajustes = ajustesDeTradicao(liga.times);
    for (const t of liga.times) {
      const k = teamKey(liga.leagueId, t.id);
      const exig = exigenciaDoNivel(nivelDoClube(t.strength, ajustes[t.id] ?? 0));
      const ehUsuario = usuario?.clubKey === k;
      const id = ehUsuario ? USUARIO_ID : 'm|' + k;
      managers[id] = { id, nome: ehUsuario ? usuario!.nome : t.managerName, tatico: t.managerTactics ?? 60, reputation: clamp(Math.round(exig + criarRng('mgr|' + k)() * 16 - 8)),
        confidence: C.confInicial, clubKey: k, lowConfRounds: 0, grace: 0, ultimoJogos: 0, jaMovido: false, ...(ehUsuario ? { usuario: true } : {}) };
    }
  }
  return garantirPool({ managers, fechadas: [], ofertas: [] });
};

const indicePorClube = (managers: Record<string, Manager>) => {
  const out: Record<string, string> = {};
  for (const m of Object.values(managers)) if (m.clubKey) out[m.clubKey] = m.id;
  return out;
};

/** Poe no clube o livre com reputacao mais proxima da exigencia (ou cria um sintetico). Altera `managers` e `porClube`. */
const preencherVaga = (managers: Record<string, Manager>, porClube: Record<string, string>, clubKey: string, clube: string, exigencia: number, jogos: number, eventos: EventoMgr[], excluirId?: string) => {
  const m = livres(managers).filter(x => x.id !== excluirId).sort((a, b) => Math.abs(a.reputation - exigencia) - Math.abs(b.reputation - exigencia) || a.id.localeCompare(b.id))[0] || novoLivre('livre|' + Object.keys(managers).length, exigencia);
  managers[m.id] = { ...m, clubKey, grace: C.carencia, confidence: C.confInicial, lowConfRounds: 0, ultimoJogos: jogos, jaMovido: true };
  porClube[clubKey] = m.id;
  eventos.push({ tipo: 'CONTRATACAO', managerId: m.id, clubKey, clube, usuario: false });
};

/**
 * Demissao. A IA vai para o pool e o clube contrata um substituto. O utilizador NUNCA fica sem clube (sem game over): recebe o aviso e recomeca com confianca baixa e carencia.
 */
const demitir = (managers: Record<string, Manager>, porClube: Record<string, string>, m: Manager, clube: string, exigencia: number, jogos: number, eventos: EventoMgr[]) => {
  eventos.push({ tipo: 'DEMISSAO', managerId: m.id, clubKey: m.clubKey, clube, usuario: !!m.usuario });
  if (m.usuario) { managers[m.id] = { ...m, reputation: clamp(m.reputation + C.repDemitido), confidence: C.confUsuarioAposDemissao, lowConfRounds: 0, grace: C.carenciaUsuario }; return; }
  const k = m.clubKey!;
  managers[m.id] = { ...m, clubKey: null, reputation: clamp(m.reputation + C.repDemitido), confidence: C.confInicial, lowConfRounds: 0, grace: 0 };
  delete porClube[k];
  preencherVaga(managers, porClube, k, clube, exigencia, jogos, eventos, m.id);   // o demitido nao volta para o proprio clube
};

/** Atualiza a confianca de cada treinador com os jogos novos de cada liga e demite quem merece. Idempotente: sem jogos novos nada muda. */
export const processarRodada = (estado: ManagerState, ligas: LigaSnap[]): { estado: ManagerState; eventos: EventoMgr[] } => {
  const managers = { ...estado.managers };
  const porClube = indicePorClube(managers);
  const eventos: EventoMgr[] = [];
  for (const liga of ligas) {
    const n = liga.tabela.length;
    if (n < 2) continue;
    const ajustes = ajustesDeTradicao(liga.times);
    liga.tabela.forEach((row, i) => {
      const k = teamKey(liga.leagueId, row.team.id);
      const m = managers[porClube[k]];
      if (!m || row.played < C.minJogosAvaliar || row.played <= m.ultimoJogos) return;
      const nivel = nivelDoClube(row.team.strength, ajustes[row.team.id] ?? 0);
      const alvoPos = posicaoAlvo(nivel, n, liga.rebaixados);
      const passos = row.played - m.ultimoJogos;
      const conf = atualizarConfianca(m.confidence, alvoDeConfianca({ jogos: row.played, pontos: row.points, posicao: i + 1, n, alvo: alvoPos }), passos);
      const baixa = conf < C.limitePressao ? m.lowConfRounds + passos : conf >= C.neutro ? 0 : Math.max(0, m.lowConfRounds - passos);
      const novo: Manager = { ...m, confidence: conf, lowConfRounds: baixa, grace: Math.max(0, m.grace - passos), ultimoJogos: row.played };
      managers[m.id] = novo;
      if (m.usuario && faixaDeConfianca(conf) !== faixaDeConfianca(m.confidence) && conf < m.confidence && conf < C.limitePressao)
        eventos.push({ tipo: 'FAIXA', managerId: m.id, clubKey: k, clube: row.team.name, usuario: true, faixa: faixaDeConfianca(conf) });
      const zona = i + 1 > n - liga.rebaixados;
      if (criarRng(`demissao|${m.id}|${row.played}`)() < probDemissao(novo, zona, row.played)) demitir(managers, porClube, novo, row.team.name, exigenciaDoNivel(nivel), row.played, eventos);
    });
  }
  return { estado: garantirPool({ ...estado, managers }), eventos };
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx tsx --test tests/manager_expectations.test.ts`
Expected: PASS (12 tests). If the "fracassado cai" test never dismisses, print `estado.managers['m|L1|A'].confidence` per round: it must fall below 20 by round ~12 (target value is about 12 for a last-place favorite). Do not loosen `limiteDemissao`; fix the formula instead.

- [ ] **Step 5: Commit**

```bash
git add textSim/managerExpectations.ts tests/manager_expectations.test.ts
git commit -m "feat: seed managers, weekly confidence, dismissal and replacement

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Season close (reputation, relegation) and job offers

**Files:**
- Modify: `textSim/managerExpectations.ts` (append)
- Test: `tests/manager_expectations.test.ts` (append)

**Interfaces:**
- Consumes: Task 3 helpers (`livres`, `preencherVaga`, `indicePorClube`, `demitir`, `processarRodada`).
- Produces: `fecharTemporadas(estado: ManagerState, ligas: LigaSnap[], hoje: string): { estado: ManagerState; eventos: EventoMgr[] }`, `atualizarTreinadores(estado: ManagerState, ligas: LigaSnap[], hoje: string): { estado: ManagerState; eventos: EventoMgr[]; mudou: boolean }` (returns the SAME `estado` reference when `mudou` is false), `aplicarTreinadores(times: Team[], estado: ManagerState, leagueId?: string): Team[]` (same array reference when nothing changes).

- [ ] **Step 1: Append failing tests**

Append to `tests/manager_expectations.test.ts` (add `fecharTemporadas, atualizarTreinadores, aplicarTreinadores` to the import from `../textSim/managerExpectations`):

```ts
import { fecharTemporadas, atualizarTreinadores, aplicarTreinadores } from '../textSim/managerExpectations';

const fechada = (times: any[], pontos: Record<string, number>) => snap(times, pontos, 10, { encerrada: true });

test('fecharTemporadas: campeao ganha reputacao, ultimo (rebaixado) perde; fecha a liga uma vez so', () => {
  const times = seis();
  const estado0 = semearTreinadores([snap(times, {}, 0)]);
  const s = fechada(times, { A: 28, B: 20, C: 18, D: 12, E: 6, F: 2 });
  const r = fecharTemporadas(estado0, [s], '2024-12-08');
  assert.ok(r.estado.managers['m|' + key('A')].reputation > estado0.managers['m|' + key('A')].reputation);
  assert.ok(r.estado.managers['m|' + key('F')].reputation < estado0.managers['m|' + key('F')].reputation);
  assert.deepEqual(r.estado.fechadas, ['L1']);
  assert.ok(todosTemTreinador(r.estado, times));
  const de_novo = fecharTemporadas(r.estado, [s], '2024-12-09');
  assert.deepEqual(de_novo.estado, r.estado);
  assert.equal(de_novo.eventos.length, 0);
});

test('fecharTemporadas: clube grande com treinador fraco convida o treinador forte de um clube menor', () => {
  const times = [time('K', 85), time('W', 60), time('X', 60), time('Y', 55), time('Z', 50), time('V', 50)];
  const estado0 = semearTreinadores([snap(times, {}, 0)]);
  const ajustar = (id: string, extra: any) => { estado0.managers[id] = { ...estado0.managers[id], ...extra }; };
  ajustar('m|' + key('K'), { reputation: 30, confidence: 30, grace: 99 });   // grace: nao e demitido, mas o clube quer outro
  ajustar('m|' + key('W'), { reputation: 90 });
  const r = fecharTemporadas(estado0, [fechada(times, { K: 2, W: 16, X: 20, Y: 14, Z: 8, V: 6 })], '2024-12-08');
  const novo = r.estado.managers['m|' + key('W')];
  assert.equal(novo.clubKey, key('K'));
  assert.ok(novo.jaMovido);
  const ev = r.eventos.find(e => e.tipo === 'TRANSFERENCIA')!;
  assert.equal(ev.clubKey, key('K'));
  assert.equal(ev.de, key('W'));
  assert.ok(todosTemTreinador(r.estado, times));
});

test('fecharTemporadas: se o convidado e o utilizador, vira oferta pendente e ele nao sai do clube', () => {
  const times = [time('K', 85), time('W', 60), time('X', 60), time('Y', 55), time('Z', 50), time('V', 50)];
  const estado0 = semearTreinadores([snap(times, {}, 0)], { clubKey: key('W'), nome: 'Eu' });
  estado0.managers['m|' + key('K')] = { ...estado0.managers['m|' + key('K')], reputation: 30, confidence: 30, grace: 99 };
  estado0.managers[USUARIO_ID] = { ...estado0.managers[USUARIO_ID], reputation: 90 };
  const r = fecharTemporadas(estado0, [fechada(times, { K: 2, W: 16, X: 20, Y: 14, Z: 8, V: 6 })], '2024-12-08');
  assert.equal(r.estado.ofertas.length, 1);
  assert.equal(r.estado.ofertas[0].clubKey, key('K'));
  assert.equal(r.estado.managers[USUARIO_ID].clubKey, key('W'));
  assert.ok(r.eventos.some(e => e.tipo === 'OFERTA' && e.usuario));
  assert.ok(!r.eventos.some(e => e.tipo === 'TRANSFERENCIA'));
});

test('atualizarTreinadores: sem novidade devolve o mesmo estado (o efeito do jogo nao entra em loop)', () => {
  const times = seis();
  const s = snap(times, { A: 20, B: 18, C: 15, D: 10, E: 5, F: 2 }, 10);
  const a = atualizarTreinadores(semearTreinadores([snap(times, {}, 0)]), [s], '2024-06-01');
  assert.ok(a.mudou);
  const b = atualizarTreinadores(a.estado, [s], '2024-06-02');
  assert.equal(b.mudou, false);
  assert.equal(b.estado, a.estado);
});

test('aplicarTreinadores: copia nome e conhecimento tatico para os clubes; sem mudanca devolve o mesmo array', () => {
  const times = seis();
  const estado = semearTreinadores([snap(times, {}, 0)]);
  assert.equal(aplicarTreinadores(times, estado), times);
  estado.managers['m|' + key('A')] = { ...estado.managers['m|' + key('A')], nome: 'Novo Tec', tatico: 99 };
  const out = aplicarTreinadores(times, estado);
  assert.notEqual(out, times);
  assert.equal(out[0].managerName, 'Novo Tec');
  assert.equal(out[0].managerTactics, 99);
  assert.equal(out[1], times[1]);
});

test('aplicarTreinadores: nao troca o treinador do clube do utilizador (o nome dele vive em gameState.managerName)', () => {
  const times = seis();
  const estado = semearTreinadores([snap(times, {}, 0)], { clubKey: key('A'), nome: 'Eu' });
  assert.equal(aplicarTreinadores(times, estado), times);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx tsx --test tests/manager_expectations.test.ts`
Expected: FAIL (`fecharTemporadas` is not exported).

- [ ] **Step 3: Append the implementation**

Append to `textSim/managerExpectations.ts`:

```ts
/** Contexto de todos os clubes das ligas (para as ofertas): liga, nome, forca e exigencia de cada clube. */
const contextoDeClubes = (ligas: LigaSnap[]) => {
  const liga: Record<string, string> = {}, nome: Record<string, string> = {}, forca: Record<string, number> = {}, exig: Record<string, number> = {};
  for (const l of ligas) {
    const ajustes = ajustesDeTradicao(l.times);
    for (const t of l.times) {
      const k = teamKey(l.leagueId, t.id);
      liga[k] = l.leagueId; nome[k] = t.name; forca[k] = t.strength; exig[k] = exigenciaDoNivel(nivelDoClube(t.strength, ajustes[t.id] ?? 0));
    }
  }
  return { liga, nome, forca, exig };
};

/**
 * Fim da liga (uma vez por liga): reputacao, confianca final, demissao dos que merecem e, com todas as ligas fechadas ate agora, as ofertas de emprego:
 * um clube precisa de treinador se a confianca do dele esta abaixo de 40 ou se a reputacao esta `lacunaReputacao` abaixo da exigencia; convida o melhor compativel
 * (reputacao perto da exigencia, confianca alta) de um clube MENOR. A IA aceita conforme a melhora; o utilizador recebe uma oferta pendente.
 */
export const fecharTemporadas = (estado: ManagerState, ligas: LigaSnap[], hoje: string): { estado: ManagerState; eventos: EventoMgr[] } => {
  const fechadasAgora = ligas.filter(l => l.encerrada && l.tabela.length > 1 && !estado.fechadas.includes(l.leagueId));
  if (!fechadasAgora.length) return { estado, eventos: [] };
  const managers = { ...estado.managers };
  const porClube = indicePorClube(managers);
  const eventos: EventoMgr[] = [];
  const ctx = contextoDeClubes(ligas);
  for (const liga of fechadasAgora) {
    const n = liga.tabela.length;
    const ajustes = ajustesDeTradicao(liga.times);
    liga.tabela.forEach((row, i) => {
      const k = teamKey(liga.leagueId, row.team.id);
      const m = managers[porClube[k]];
      if (!m || !row.played) return;
      const pos = i + 1, nivel = nivelDoClube(row.team.strength, ajustes[row.team.id] ?? 0), alvoPos = posicaoAlvo(nivel, n, liga.rebaixados);
      const campeao = pos === 1, promovido = liga.tier > 1 && pos <= liga.promovidos, rebaixado = pos > n - liga.rebaixados, classificado = pos <= fracao(n, 0.2);
      const aprov = row.points / (3 * row.played);
      let delta = (aprov - aproveitamentoEsperado(alvoPos, n)) * C.repGanhoAproveitamento + ((alvoPos - pos) / Math.max(1, n - 1)) * C.repGanhoPosicao
        + (campeao ? C.repTitulo : 0) + (promovido ? C.repPromocao : 0) + (classificado ? C.repClassificacao : 0) + (rebaixado ? C.repRebaixamento : 0);
      if (delta > 0) delta *= 1 - m.reputation / 150;   // quanto mais alta a reputacao, mais dificil subir
      const conquistas = campeao ? 100 : promovido ? 85 : classificado ? 70 : C.neutro;
      let conf = atualizarConfianca(m.confidence, alvoDeConfianca({ jogos: row.played, pontos: row.points, posicao: pos, n, alvo: alvoPos, conquistas }), 3);
      if (rebaixado) conf = clamp(conf - C.penalidadeRebaixamento);
      const novo: Manager = { ...m, reputation: clamp(Math.round(m.reputation + delta)), confidence: conf, lowConfRounds: conf < C.limitePressao ? m.lowConfRounds + 1 : 0, ultimoJogos: C.jogosTemporadaFechada };
      managers[m.id] = novo;
      if (criarRng(`demissao|${m.id}|fim`)() < probDemissao(novo, rebaixado, row.played)) demitir(managers, porClube, novo, row.team.name, exigenciaDoNivel(nivel), C.jogosTemporadaFechada, eventos);
    });
  }
  const fechadas = [...estado.fechadas, ...fechadasAgora.map(l => l.leagueId)];
  const ofertas = [...estado.ofertas];
  const clubes = Object.keys(porClube).filter(k => fechadas.includes(ctx.liga[k])).sort((a, b) => ctx.forca[b] - ctx.forca[a] || a.localeCompare(b));
  for (const k of clubes) {
    const atual = managers[porClube[k]];
    if (!atual || atual.usuario || atual.jaMovido) continue;
    const exig = ctx.exig[k];
    if (!(atual.confidence < C.limitePressao || exig - atual.reputation >= C.lacunaReputacao)) continue;
    const nota = (c: Manager) => (100 - Math.abs(c.reputation - exig)) * 0.5 + c.confidence * 0.3 + c.reputation * 0.2;
    const cands = Object.values(managers).filter(c => c.clubKey && c.clubKey !== k && !c.jaMovido && fechadas.includes(ctx.liga[c.clubKey]) && ctx.forca[c.clubKey] < ctx.forca[k]
      && c.reputation >= exig - C.tolerInf && c.reputation <= exig + C.tolerSup).sort((a, b) => nota(b) - nota(a) || a.id.localeCompare(b.id));
    const c = cands[0];
    if (!c) continue;
    if (c.usuario) {
      if (ofertas.length < C.maxOfertasUsuario && !ofertas.some(o => o.clubKey === k)) {
        ofertas.push({ id: `oferta|${k}|${hoje}`, clubKey: k, clube: ctx.nome[k], exigencia: exig, data: hoje });
        eventos.push({ tipo: 'OFERTA', managerId: c.id, clubKey: k, clube: ctx.nome[k], usuario: true });
      }
      continue;
    }
    const melhora = ctx.forca[k] - ctx.forca[c.clubKey!];
    const pAceita = clamp(0.5 + melhora / 40 + (c.confidence < C.limitePressao ? 0.2 : 0), 0.3, 1);
    if (criarRng(`oferta|${c.id}|${k}`)() >= pAceita) continue;
    const origem = c.clubKey!;
    managers[atual.id] = { ...atual, clubKey: null, reputation: clamp(atual.reputation + C.repPreterido), grace: 0 };
    managers[c.id] = { ...c, clubKey: k, grace: C.carencia, confidence: C.confInicial, lowConfRounds: 0, ultimoJogos: C.jogosTemporadaFechada, jaMovido: true };
    porClube[k] = c.id; delete porClube[origem];
    eventos.push({ tipo: 'TRANSFERENCIA', managerId: c.id, clubKey: k, clube: ctx.nome[k], usuario: false, de: origem });
    preencherVaga(managers, porClube, origem, ctx.nome[origem], ctx.exig[origem], C.jogosTemporadaFechada, eventos);
  }
  return { estado: garantirPool({ managers, fechadas, ofertas }), eventos };
};

/** Ponto de entrada do jogo: jogos novos + fim de liga. Sem novidade devolve o MESMO `estado` (`mudou` falso). */
export const atualizarTreinadores = (estado: ManagerState, ligas: LigaSnap[], hoje: string): { estado: ManagerState; eventos: EventoMgr[]; mudou: boolean } => {
  const a = processarRodada(estado, ligas);
  const b = fecharTemporadas(a.estado, ligas, hoje);
  const novo = b.estado, antes = estado.managers, depois = novo.managers;
  const mudou = Object.keys(depois).length !== Object.keys(antes).length || Object.keys(depois).some(id => depois[id] !== antes[id])
    || novo.fechadas.length !== estado.fechadas.length || novo.ofertas.length !== estado.ofertas.length;
  return { estado: mudou ? novo : estado, eventos: [...a.eventos, ...b.eventos], mudou };
};

/** Copia o treinador do estado para `Team.managerName`/`managerTactics`. Pula o clube do utilizador. Sem mudanca devolve o mesmo array. */
export const aplicarTreinadores = (times: Team[], estado: ManagerState, leagueId?: string): Team[] => {
  const porClube: Record<string, Manager> = {};
  for (const m of Object.values(estado.managers)) if (m.clubKey && !m.usuario) porClube[m.clubKey] = m;
  let mudou = false;
  const out = times.map(t => {
    const m = porClube[teamKey(leagueId ?? t.leagueId, t.id)];
    if (!m || (t.managerName === m.nome && t.managerTactics === m.tatico)) return t;
    mudou = true;
    return { ...t, managerName: m.nome, managerTactics: m.tatico };
  });
  return mudou ? out : times;
};
```

Note: `atualizarTreinadores` can return `mudou` true on its very first call if the pool refill adds managers; that is expected. In the `mudou` check, `processarRodada` and `fecharTemporadas` leave untouched entries as the same object references, so a no-op pass is detected correctly.

- [ ] **Step 4: Run to verify it passes**

Run: `npx tsx --test tests/manager_expectations.test.ts`
Expected: PASS (18 tests). If the "convida" test fails because no transfer happens, print `ctx.exig` for K (must be 80: strength 85 and all-equal tradition) and the candidate's reputation after the season (must stay within 70..105); adjust the candidate test setup, not the rules.

- [ ] **Step 5: Commit**

```bash
git add textSim/managerExpectations.ts tests/manager_expectations.test.ts
git commit -m "feat: season close reputation, job offers, coach sync helpers

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Inbox messages and league snapshots

**Files:**
- Modify: `textSim/inbox.ts` (append three exported functions)
- Create: `textSim/managerLigas.ts`
- Test: `tests/manager_inbox.test.ts`

**Interfaces:**
- Consumes: `criar`, `L`, `Idioma`, `MensagemInbox` already in `textSim/inbox.ts`; `Faixa` from `managerExpectations.ts`.
- Produces: `avisoDeDemissao(hoje: string, lang: Idioma, key: string, clube: string): MensagemInbox`, `avisoDeOferta(hoje: string, lang: Idioma, key: string, clube: string): MensagemInbox`, `avisoDeFaixa(hoje: string, lang: Idioma, key: string, clube: string, faixa: Faixa): MensagemInbox` (all category `BOARD`). `montarLigas(p: { userTeam: Team; teams: Team[]; fixtures: Fixture[]; world: WorldLeague[] }): LigaSnap[]` where `teams` are the teams of the user's league and `fixtures` the user's fixtures.

- [ ] **Step 1: Write the failing test**

Create `tests/manager_inbox.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { avisoDeDemissao, avisoDeOferta, avisoDeFaixa } from '../textSim/inbox';

test('avisos do board: categoria BOARD, chave de dedupe e idioma', () => {
  const d = avisoDeDemissao('2024-06-01', 'PT', 'board|demissao|X', 'Santos-SP');
  assert.equal(d.categoria, 'BOARD');
  assert.deepEqual(d.keys, ['board|demissao|X']);
  assert.ok(d.alta);
  assert.match(d.assunto + d.corpo, /Santos-SP/);
  const o = avisoDeOferta('2024-12-08', 'EN', 'board|oferta|Y', 'Palmeiras-SP');
  assert.equal(o.categoria, 'BOARD');
  assert.match(o.assunto + o.corpo, /Palmeiras-SP/);
  assert.notEqual(avisoDeFaixa('2024-06-01', 'PT', 'k', 'C', 'RISCO').corpo, avisoDeFaixa('2024-06-01', 'EN', 'k', 'C', 'RISCO').corpo);
  assert.ok(avisoDeFaixa('2024-06-01', 'EN', 'k', 'C', 'IMINENTE').alta);
  assert.ok(!avisoDeFaixa('2024-06-01', 'EN', 'k', 'C', 'PRESSAO').alta);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx tsx --test tests/manager_inbox.test.ts`
Expected: FAIL (`avisoDeDemissao` is not exported).

- [ ] **Step 3: Implement**

Append to `textSim/inbox.ts` (add `import type { Faixa } from './managerExpectations';` to the imports at the top):

```ts
/** O utilizador foi "demitido": sem game over, ele fica no clube com a confianca em baixo (ver textSim/managerExpectations.ts, `demitir`). */
export const avisoDeDemissao = (hoje: string, lang: Idioma, key: string, clube: string): MensagemInbox =>
  criar({ keys: [key], date: hoje, categoria: 'BOARD', de: L(lang, 'Chairman', 'Presidente'), alta: true,
    assunto: L(lang, `${clube}: the board has lost patience`, `${clube}: a diretoria perdeu a paciência`),
    corpo: L(lang, `After the recent results the board decided to end your contract at ${clube}. It is giving you one last chance: confidence is very low and the next results will decide.`,
      `Depois dos resultados recentes a diretoria decidiu encerrar o seu contrato no ${clube}. Dá-lhe uma última chance: a confiança está muito baixa e os próximos resultados decidem.`) });

/** Um clube maior quer contratar o utilizador (a oferta fica pendente; ver `ManagerState.ofertas`). */
export const avisoDeOferta = (hoje: string, lang: Idioma, key: string, clube: string): MensagemInbox =>
  criar({ keys: [key], date: hoje, categoria: 'BOARD', de: L(lang, 'Sporting Director', 'Diretor Desportivo'),
    assunto: L(lang, `${clube} wants you as manager`, `${clube} quer você como treinador`),
    corpo: L(lang, `${clube} was impressed by your work and wants to hire you.`, `O ${clube} ficou impressionado com o seu trabalho e quer contratá-lo.`) });

/** A confianca da diretoria entrou numa faixa pior. */
export const avisoDeFaixa = (hoje: string, lang: Idioma, key: string, clube: string, faixa: Faixa): MensagemInbox => {
  const texto: Record<string, [string, string]> = {
    PRESSAO: ['The board is putting pressure on you.', 'A diretoria está a pressioná-lo.'],
    RISCO: ['Your job is at risk: the board expects an improvement soon.', 'O seu cargo está em risco: a diretoria espera melhora em breve.'],
    IMINENTE: ['Dismissal is imminent unless results change immediately.', 'A demissão é iminente se os resultados não mudarem já.']
  };
  const [en, pt] = texto[faixa] || texto.PRESSAO;
  return criar({ keys: [key], date: hoje, categoria: 'BOARD', de: L(lang, 'Chairman', 'Presidente'), alta: faixa === 'RISCO' || faixa === 'IMINENTE',
    assunto: L(lang, `${clube}: board confidence dropping`, `${clube}: a confiança da diretoria caiu`), corpo: L(lang, en, pt) });
};
```

Create `textSim/managerLigas.ts`:

```ts
/*
MONTA AS LIGAS PARA O MERCADO DE TREINADORES (textSim/managerExpectations.ts): a liga do utilizador (que vive no estado do jogo) e todas as ligas do mundo (`WorldLeague`),
cada uma com a tabela de agora, os rebaixados/promovidos (de `COUNTRIES`) e se ja acabou. E o unico arquivo do mercado que le o mundo e a base.
*/
import type { Team, Fixture } from '../types';
import { buildTable, type WorldLeague } from './world';
import { COUNTRIES } from './dataGenerator';
import type { LigaSnap } from './managerExpectations';

const liga = (leagueId: string) => { for (const c of COUNTRIES) { const l = c.leagues.find(x => x.id === leagueId); if (l) return l; } return undefined; };

export const snapDeLiga = (leagueId: string, times: Team[], fixtures: Fixture[]): LigaSnap => {
  const jogos = fixtures.filter(f => !f.isFriendly && (f.type === undefined || f.type === 'LEAGUE'));
  const l = liga(leagueId);
  return { leagueId, tier: l?.tier ?? 1, promovidos: l?.promoted ?? 0, rebaixados: l?.relegated ?? Math.round(times.length * 0.2), times,
    tabela: buildTable(times, jogos), encerrada: jogos.length > 0 && jogos.every(f => f.played) };
};

export const montarLigas = (p: { userTeam: Team; teams: Team[]; fixtures: Fixture[]; world: WorldLeague[] }): LigaSnap[] => [
  snapDeLiga(p.userTeam.leagueId, p.teams, p.fixtures),
  ...p.world.map(w => snapDeLiga(w.leagueId, w.teams, w.fixtures))
];
```

`Fixture.isFriendly` and `f.type` are the same fields `buildTable` reads (`textSim/world.ts:45-48`). Hidden reserve leagues (`oculta`) have no fixtures, so they get a tabela with zero games and `encerrada: false`: their clubs are seeded with managers but never evaluated.

- [ ] **Step 4: Run to verify it passes, then type-check**

Run: `npx tsx --test tests/manager_inbox.test.ts` — Expected: PASS.
Run: `npx tsc --noEmit` — Expected: no errors from the new files. (If `tsc` reports unrelated pre-existing errors, compare against `git stash` baseline and only fix errors in files this plan touches.)

- [ ] **Step 5: Commit**

```bash
git add textSim/inbox.ts textSim/managerLigas.ts tests/manager_inbox.test.ts
git commit -m "feat: board inbox messages and league snapshot builder

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: GameContext integration and persistence

**Files:**
- Modify: `context/GameContext.tsx`

**Interfaces:**
- Consumes: `semearTreinadores`, `atualizarTreinadores`, `aplicarTreinadores`, `ManagerState` (managerExpectations); `montarLigas` (managerLigas); `avisoDeDemissao`, `avisoDeOferta`, `avisoDeFaixa` (inbox); `teamKey` (competitions).
- Produces: `managerState: ManagerState | null` on the context value (read by Task 7).

- [ ] **Step 1: Imports and state**

In `context/GameContext.tsx` add imports next to the other `textSim` imports (search for `from '../textSim/inbox'` and `from '../textSim/world'` and add beside them; `teamKey` may already be imported from `../textSim/competitions`, in that case extend that import instead of duplicating):

```ts
import { ManagerState, semearTreinadores, atualizarTreinadores, aplicarTreinadores } from '../textSim/managerExpectations';
import { montarLigas } from '../textSim/managerLigas';
import { teamKey } from '../textSim/competitions';
```

and extend the existing `../textSim/inbox` import with `avisoDeDemissao, avisoDeOferta, avisoDeFaixa`.

After `const [world, setWorld] = useState<WorldLeague[] | null>(null);` (line ~279) add:

```ts
  // MERCADO DE TREINADORES (textSim/managerExpectations.ts): null ate o mundo existir (um save antigo, sem `managers`, e semeado no primeiro efeito).
  const [managerState, setManagerState] = useState<ManagerState | null>(null);
```

- [ ] **Step 2: The effect**

Right after the league-prize `useEffect` (the one ending `}, [fixtures]);` just before `// INBOX — o motor escreve`, around line 471) add:

```tsx
  // MERCADO DE TREINADORES: a cada jogo novo (do utilizador ou do mundo) atualiza confianca, demissoes e, no fim das ligas, reputacao e ofertas. Idempotente (ver `atualizarTreinadores`).
  useEffect(() => {
    if (!userTeam || !world) return;
    const ligas = montarLigas({ userTeam, teams: teams.filter(t => naLigaDoUtilizador(t, userTeam)), fixtures, world });
    const atual = managerState ?? semearTreinadores(ligas, { clubKey: teamKey(userTeam.leagueId, userTeam.id), nome: gameState.managerName });
    const { estado, eventos, mudou } = atualizarTreinadores(atual, ligas, gameState.currentDate);
    if (mudou || !managerState) setManagerState(estado);
    const lang = gameState.language, hoje = gameState.currentDate;
    const avisos = eventos.filter(e => e.usuario).flatMap(e => {
      const chave = (t: string) => `board|${t}|${e.clubKey}|${e.faixa ?? ''}|${hoje}`;
      if (e.tipo === 'DEMISSAO') return [avisoDeDemissao(hoje, lang, chave('demissao'), e.clube)];
      if (e.tipo === 'OFERTA') return [avisoDeOferta(hoje, lang, chave('oferta'), e.clube)];
      if (e.tipo === 'FAIXA') return [avisoDeFaixa(hoje, lang, chave('faixa'), e.clube, e.faixa!)];
      return [];
    });
    if (avisos.length) empurrarInbox(avisos);
    // Os clubes mostram o treinador atual (o motor das partidas le `managerTactics`).
    const novosTeams = aplicarTreinadores(teams, estado);
    if (novosTeams !== teams) setTeams(novosTeams);
    const novoMundo = world.map(l => { const ts = aplicarTreinadores(l.teams, estado, l.leagueId); return ts === l.teams ? l : { ...l, teams: ts }; });
    if (novoMundo.some((l, i) => l !== world[i])) setWorld(novoMundo);
  }, [world, fixtures]);
```

If `naLigaDoUtilizador` is already used in this file with a different signature, copy the exact call used at the league-prize effect (`teams.filter(t => naLigaDoUtilizador(t, userTeam))`). If `empurrarInbox` is declared with `const` after this effect that is fine: it only runs after render.

- [ ] **Step 3: Save and load**

In `saveGame` add `managers: managerState,` to the `saveData` object (after `mercado,` at line ~2064).

In `importGameData`, next to `setBase(data.base || null);` add:

```ts
        setManagerState(data.managers || null);   // save antigo, sem treinadores: o efeito semeia a partir da base
```

- [ ] **Step 4: Expose on the context**

Add `managerState: ManagerState | null;` to `interface GameContextType` (line ~173) and `managerState,` to the object passed in `<GameContext.Provider value={{` (line ~2174).

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit` — Expected: no new errors.
Run: `npm run build` — Expected: build succeeds.
Run: `npm run dev`, start a career, play several rounds (use CONTINUE/finish match day), then in the browser devtools console confirm no infinite re-render warnings and check the Inbox only receives BOARD messages when the user's confidence crosses into pressure. Save, reload the save, and verify the app loads (old saves without `managers` must also load).
Report anything unexpected instead of claiming it works.

- [ ] **Step 6: Run the whole suite and commit**

Run: `npm run teste:base` — Expected: PASS (existing tests unaffected).

```bash
git add context/GameContext.tsx
git commit -m "feat: wire manager expectations into game state, saves and inbox

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Board card in the dashboard and test wiring

**Files:**
- Create: `components/BoardConfidenceCard.tsx`
- Modify: `components/DashboardView.tsx`
- Modify: `package.json` (`teste:base`)

**Interfaces:**
- Consumes: `managerState` from `useGame()`, `faixaDeConfianca`, `USUARIO_ID`, `nivelDoClube`, `exigenciaDoNivel` (not needed) from `textSim/managerExpectations.ts`.

- [ ] **Step 1: Create the card**

Create `components/BoardConfidenceCard.tsx`:

```tsx
import React from 'react';
import { useGame } from '../context/GameContext';
import { faixaDeConfianca, USUARIO_ID, Faixa } from '../textSim/managerExpectations';

const FAIXAS: Record<Faixa, { en: string; pt: string; cor: string }> = {
  EXCELENTE: { en: 'Excellent', pt: 'Excelente', cor: 'bg-emerald-500' },
  BOA: { en: 'Good', pt: 'Boa', cor: 'bg-lime-500' },
  PRESSAO: { en: 'Under pressure', pt: 'Pressão', cor: 'bg-amber-500' },
  RISCO: { en: 'Job at risk', pt: 'Risco de demissão', cor: 'bg-orange-500' },
  IMINENTE: { en: 'Dismissal imminent', pt: 'Demissão iminente', cor: 'bg-red-600' }
};

/** Confianca da diretoria e reputacao do utilizador (mercado de treinadores, textSim/managerExpectations.ts). */
const BoardConfidenceCard: React.FC = () => {
  const { managerState, gameState } = useGame();
  const eu = managerState?.managers[USUARIO_ID];
  if (!eu) return null;
  const pt = gameState.language === 'PT';
  const faixa = FAIXAS[faixaDeConfianca(eu.confidence)];
  return (
    <div className="rounded-xl bg-slate-800/70 border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-slate-400">{pt ? 'Confiança da diretoria' : 'Board confidence'}</span>
        <span className="text-sm font-semibold text-white">{Math.round(eu.confidence)} · {pt ? faixa.pt : faixa.en}</span>
      </div>
      <div className="h-2 w-full rounded bg-slate-700 overflow-hidden"><div className={`h-full ${faixa.cor}`} style={{ width: `${eu.confidence}%` }} /></div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span>{pt ? 'Reputação do treinador' : 'Manager reputation'}</span>
        <span className="text-white font-semibold">{eu.reputation}</span>
      </div>
    </div>
  );
};

export default BoardConfidenceCard;
```

If other components in `components/` use named exports instead of default, match that style.

- [ ] **Step 2: Mount it**

In `components/DashboardView.tsx`, add `import BoardConfidenceCard from './BoardConfidenceCard';` and render `<BoardConfidenceCard />` in the first column of the dashboard, directly above the first existing card (read the component's JSX and place it in the same container and spacing as its sibling cards).

- [ ] **Step 3: Add the tests to `teste:base`**

In `package.json`, in the `teste:base` script append ` tests/tradicao.test.ts tests/manager_expectations.test.ts tests/manager_inbox.test.ts` before the closing quote.

- [ ] **Step 4: Verify**

Run: `npm run teste:base` — Expected: PASS including the three new files.
Run: `npm run build` — Expected: succeeds.
Run: `npm run dev` and open the dashboard: the card shows confidence 62 / "Good" at the start and moves after matches. Report the observed values.

- [ ] **Step 5: Commit**

```bash
git add components/BoardConfidenceCard.tsx components/DashboardView.tsx package.json
git commit -m "feat: board confidence card and test wiring

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8 (OPTIONAL, needs user confirmation first): accept a job offer

Tasks 1-7 generate offers for the user and show them in the inbox, but the user cannot accept them: moving the user to another club means changing the controlled club (`gameState.userTeamId`, lineup, fixtures, league-bound state), which is far larger than the coach market and was not in the approved design.

- [ ] **Step 1: Stop and ask the user.** Report this limitation and ask whether to (a) leave offers informational, (b) allow accepting only for clubs in the same league, or (c) support any club. Do not implement anything until they answer. If they choose (b) or (c), write a new design note first (what `userTeamId` change affects: grep `userTeamId` and `naLigaDoUtilizador` usages), then a short follow-up plan.

---

## Execution notes (calibration changes made while implementing)

The first version of Tasks 2-4 dismissed 125% of all clubs in a simulated year on the real database. Three changes brought it to ~25% (`tests/manager_mercado.test.ts` guards 5-45%):

1. **Realistic target position** (`metaDoClube`, `rankDeForca`): the level's position target is blended 50/50 (`pesoRankOvr`) with the club's OVR rank inside its own league, so a league where every club has high OVR does not "expect" everyone to finish in the top half.
2. **Judged only since hire** (`Manager.baseJogos`/`basePontos`): a new coach is evaluated on points earned after he arrived, and the season-end reputation uses only his period. Without this he inherited the previous coach's record and was sacked again.
3. **Softer constants**: `ganhoAproveitamento` 250 to 120, `ganhoPosicao` 160 to 80, `suavizacao` 0.15 to 0.1, `minJogosDemissao` 8 to 10, `carencia` 6 to 8.

Also fixed: a dismissed coach is excluded from his own club's replacement (`preencherVaga` `excluirId`). Code blocks in Tasks 2-4 above show the first version; the committed code in `textSim/managerExpectations.ts` is authoritative.
