# Sistema de Patrocinadores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O clube do usuário contrata um patrocinador entre 50 empresas e recebe o valor em 12 parcelas mensais, com contratos de 1 a 4 anos, numa aba SPONSORS dentro de Finance.

**Architecture:** Módulo puro `textSim/patrocinadores.ts` (dados, reputação, regras, parcelas) coberto por testes `node:test`. `Team` ganha `sponsorContract` e `sponsorNext`. `GameContext` aplica a proposta, paga as parcelas e expira contratos por data. A UI é um componente `SponsorsTab` dentro de `FinancesView`.

**Tech Stack:** TypeScript, React 19, Tailwind, `tsx --test` (`node:test`), Vite.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-11-03-patrocinadores-design.md`.
- 50 patrocinadores: 25 BRASIL (BRL), 25 INTERNATIONAL (EUR), valores exatamente como no spec.
- Dinheiro do jogo guardado em USD; converter com `paraDolares` de `textSim/cambio.ts`.
- Um contrato ativo por clube; duração 1–4 anos; valor anual fixo; 12 parcelas mensais (`valorAnualUSD / 12`) por ano.
- Troca/renovação só nos 60 dias finais do contrato; o novo começa na data de fim do atual.
- Reputação do clube 0–100 derivada (fanBase 0,4 + tradição 0,3 + strength 0,3, percentis); mínimo do patrocinador de 0 a 90, linear pelo ranking de valor dentro da região.
- Só o clube do usuário tem contrato; clubes da CPU mantêm `sponsorAmount`.
- Sem negociação, metas, bônus ou IA. Textos em EN e PT. Alvos de toque ≥ 44 px (PC e iPad paisagem).
- Comentários e nomes em português, como o resto de `textSim/`.

## Estrutura de arquivos

- Create `textSim/patrocinadores.ts`: dados e regras puras.
- Create `tests/patrocinadores.test.ts`.
- Modify `textSim/tradicao.ts`: exportar `percentis`.
- Modify `types.ts`: campos em `Team`.
- Modify `textSim/inbox.ts`: dois avisos.
- Modify `context/GameContext.tsx`: ação `proporPatrocinio`, efeito mensal.
- Create `components/SponsorsTab.tsx`.
- Create `public/flags/*.svg` (14).
- Modify `components/FinancesView.tsx` e `components/DashboardView.tsx`: aba e leitura do contrato.
- Modify `package.json`: incluir o teste em `teste:base`.

---

### Task 1: Módulo de domínio (dados, reputação, regras, parcelas)

**Files:**
- Create: `textSim/patrocinadores.ts`
- Modify: `textSim/tradicao.ts` (a função `percentis`, trocar `const` por `export const`)
- Test: `tests/patrocinadores.test.ts`

**Interfaces:**
- Produces:
  - `PATROCINADORES: Patrocinador[]`
  - `Patrocinador = { id: string; nome: string; pais: string; cod: string; moeda: 'BRL' | 'EUR'; valorAnual: number; regiao: 'BRASIL' | 'INTERNATIONAL' }`
  - `ContratoPatrocinio = { sponsorId: string; anos: number; valorAnualUSD: number; inicio: string; fim: string; parcelasPagas: number; ultimoMes: string }`
  - `reputacaoMinima(p: Patrocinador): number`
  - `reputacaoDoClube(time: Team, todos: Team[]): number`
  - `JANELA_RENOVACAO_DIAS = 60`
  - `diasParaFim(c: ContratoPatrocinio, hoje: string): number`
  - `avaliarProposta(rep: number, p: Patrocinador, atual: ContratoPatrocinio | undefined, proximo: ContratoPatrocinio | undefined, anos: number, hoje: string): { ok: true; renovacao: boolean } | { ok: false; motivo: 'ANOS' | 'REPUTACAO' | 'ATIVO' | 'JA_RENOVADO' }`
  - `criarContrato(p: Patrocinador, anos: number, inicio: string): ContratoPatrocinio`
  - `pagarParcelas(c: ContratoPatrocinio, hoje: string): { contrato: ContratoPatrocinio; usd: number; parcelas: number }`
  - `statusDoPatrocinador(rep, p, atual, proximo, hoje): 'ATIVO' | 'DISPONIVEL' | 'BLOQUEADO' | 'INDISPONIVEL'`

- [ ] **Step 1: Exportar `percentis` em `textSim/tradicao.ts`**

Troque a linha `const percentis = (valores: number[]): number[] => {` por `export const percentis = (valores: number[]): number[] => {`.

- [ ] **Step 2: Escrever o teste que falha**

`tests/patrocinadores.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { PATROCINADORES, reputacaoMinima, reputacaoDoClube, avaliarProposta, criarContrato, pagarParcelas, diasParaFim, statusDoPatrocinador } from '../textSim/patrocinadores';
import { paraDolares } from '../textSim/cambio';

const time = (id: string, fanBase: number, strength: number) => ({ id, name: 'Clube ' + id, fanBase, strength }) as any;
const porNome = (n: string) => PATROCINADORES.find(p => p.nome === n)!;

test('banco: 50 patrocinadores, 25 por regiao, ids unicos, valores do spec', () => {
  assert.equal(PATROCINADORES.length, 50);
  assert.equal(PATROCINADORES.filter(p => p.regiao === 'BRASIL').length, 25);
  assert.equal(PATROCINADORES.filter(p => p.regiao === 'INTERNATIONAL').length, 25);
  assert.equal(new Set(PATROCINADORES.map(p => p.id)).size, 50);
  assert.equal(porNome('Banco Aurora').valorAnual, 15_000_000);
  assert.equal(porNome('Banco Aurora').moeda, 'BRL');
  assert.equal(porNome('EcoFuture').valorAnual, 500_000);
  assert.equal(porNome('Global Finance').valorAnual, 30_000_000);
  assert.equal(porNome('Global Finance').moeda, 'EUR');
  assert.equal(porNome('SkyTravel').pais, 'Emirados Árabes');
  assert.equal(porNome('EcoFuture Global').valorAnual, 1_000_000);
});

test('reputacao minima: 90 no topo de cada regiao, 0 no menor', () => {
  assert.equal(reputacaoMinima(porNome('Banco Aurora')), 90);
  assert.equal(reputacaoMinima(porNome('EcoFuture')), 0);
  assert.equal(reputacaoMinima(porNome('Global Finance')), 90);
  assert.equal(reputacaoMinima(porNome('EcoFuture Global')), 0);
  assert.ok(reputacaoMinima(porNome('PrimeBank')) > reputacaoMinima(porNome('SportLine')));
});

test('reputacao do clube: grande > pequeno, dentro de 0..100', () => {
  const todos = [time('a', 1_000_000, 90), time('b', 100_000, 60), time('c', 5_000, 30)];
  const [ra, rb, rc] = todos.map(t => reputacaoDoClube(t, todos));
  assert.ok(ra > rb && rb > rc);
  assert.ok(ra <= 100 && rc >= 0);
});

test('proposta: reputacao baixa bloqueia, alta aceita, anos fora de 1..4 recusa', () => {
  const topo = porNome('Banco Aurora'), baixo = porNome('EcoFuture');
  assert.deepEqual(avaliarProposta(50, topo, undefined, undefined, 2, '2024-04-01'), { ok: false, motivo: 'REPUTACAO' });
  assert.deepEqual(avaliarProposta(95, topo, undefined, undefined, 2, '2024-04-01'), { ok: true, renovacao: false });
  assert.deepEqual(avaliarProposta(0, baixo, undefined, undefined, 1, '2024-04-01'), { ok: true, renovacao: false });
  assert.deepEqual(avaliarProposta(95, topo, undefined, undefined, 5, '2024-04-01'), { ok: false, motivo: 'ANOS' });
  assert.deepEqual(avaliarProposta(95, topo, undefined, undefined, 0, '2024-04-01'), { ok: false, motivo: 'ANOS' });
});

test('um contrato ativo: bloqueia fora da janela de 60 dias, libera dentro, e so uma renovacao', () => {
  const p = porNome('EcoFuture');
  const atual = criarContrato(p, 1, '2024-04-01');           // fim 2025-04-01
  assert.equal(atual.fim, '2025-04-01');
  assert.deepEqual(avaliarProposta(50, p, atual, undefined, 1, '2024-06-01'), { ok: false, motivo: 'ATIVO' });
  assert.equal(diasParaFim(atual, '2025-02-01'), 59);
  assert.deepEqual(avaliarProposta(50, p, atual, undefined, 1, '2025-02-01'), { ok: true, renovacao: true });
  const proximo = criarContrato(p, 2, atual.fim);
  assert.deepEqual(avaliarProposta(50, p, atual, proximo, 1, '2025-02-01'), { ok: false, motivo: 'JA_RENOVADO' });
});

test('contrato: valor em USD do jogo, fim = inicio + anos', () => {
  const c = criarContrato(porNome('Banco Aurora'), 3, '2024-04-15');
  assert.equal(c.fim, '2027-04-15');
  assert.equal(c.anos, 3);
  assert.equal(c.parcelasPagas, 0);
  assert.equal(c.ultimoMes, '2024-04');
  assert.ok(Math.abs(c.valorAnualUSD - paraDolares(15_000_000, 'BRL')) < 1e-6);
});

test('parcelas: 1a no mes seguinte, idempotente no mesmo mes, 12 por ano, depois para', () => {
  const c0 = criarContrato(porNome('Banco Aurora'), 1, '2024-04-15');
  const mensal = c0.valorAnualUSD / 12;
  assert.equal(pagarParcelas(c0, '2024-04-30').parcelas, 0);
  const r1 = pagarParcelas(c0, '2024-05-01');
  assert.equal(r1.parcelas, 1);
  assert.ok(Math.abs(r1.usd - mensal) < 1e-6);
  assert.equal(r1.contrato.parcelasPagas, 1);
  assert.equal(pagarParcelas(r1.contrato, '2024-05-20').parcelas, 0);
  const atraso = pagarParcelas(r1.contrato, '2024-08-01');   // pulou jun, jul e ago
  assert.equal(atraso.parcelas, 3);
  const fim = pagarParcelas(c0, '2026-01-01');                // muito depois: so as 12 do ano
  assert.equal(fim.parcelas, 12);
  assert.ok(Math.abs(fim.usd - c0.valorAnualUSD) < 1e-6);
  assert.equal(pagarParcelas(fim.contrato, '2027-01-01').parcelas, 0);
});

test('status na UI', () => {
  const topo = porNome('Banco Aurora'), baixo = porNome('EcoFuture');
  assert.equal(statusDoPatrocinador(50, topo, undefined, undefined, '2024-04-01'), 'BLOQUEADO');
  assert.equal(statusDoPatrocinador(50, baixo, undefined, undefined, '2024-04-01'), 'DISPONIVEL');
  const atual = criarContrato(baixo, 1, '2024-04-01');
  assert.equal(statusDoPatrocinador(50, baixo, atual, undefined, '2024-06-01'), 'ATIVO');
  assert.equal(statusDoPatrocinador(50, porNome('SportLine'), atual, undefined, '2024-06-01'), 'INDISPONIVEL');
  assert.equal(statusDoPatrocinador(50, porNome('SportLine'), atual, undefined, '2025-02-01'), 'DISPONIVEL');
});
```

- [ ] **Step 3: Rodar e confirmar a falha**

Run: `npx tsx --test tests/patrocinadores.test.ts`
Expected: FAIL ("Cannot find module '../textSim/patrocinadores'").

- [ ] **Step 4: Implementar `textSim/patrocinadores.ts`**

```ts
/*
PATROCINADORES — o banco de 50 empresas (25 Brasil, 25 exterior) e as regras do patrocinio principal do clube do utilizador (ver docs/superpowers/specs/2026-11-03-patrocinadores-design.md).

Um contrato por clube, de 1 a 4 anos, valor anual fixo pago em 12 parcelas mensais (no 1o dia de cada mes seguinte ao inicio). Entre os 60 dias finais pode-se renovar/trocar (o novo comeca no fim do atual).
A reputacao do clube (0-100) vem de fanBase, tradicao e forca, em percentil entre todos os clubes; cada patrocinador exige uma reputacao minima (0 a 90) pelo ranking de valor na sua regiao.
*/
import type { Team } from '../types';
import { paraDolares } from './cambio';
import { acharEntrada, percentis } from './tradicao';

export type RegiaoPatrocinio = 'BRASIL' | 'INTERNATIONAL';
export interface Patrocinador { id: string; nome: string; pais: string; cod: string; moeda: 'BRL' | 'EUR'; valorAnual: number; regiao: RegiaoPatrocinio; }
export interface ContratoPatrocinio { sponsorId: string; anos: number; valorAnualUSD: number; inicio: string; fim: string; parcelasPagas: number; ultimoMes: string; }

export const JANELA_RENOVACAO_DIAS = 60;
export const ANOS_MIN = 1, ANOS_MAX = 4;

const BR = (nome: string, valorAnual: number): Patrocinador => ({ id: 'br-' + nome.toLowerCase().replace(/[^a-z0-9]+/g, '-'), nome, pais: 'Brasil', cod: 'br', moeda: 'BRL', valorAnual, regiao: 'BRASIL' });
const EX = (nome: string, pais: string, cod: string, milhoes: number): Patrocinador => ({ id: 'ex-' + nome.toLowerCase().replace(/[^a-z0-9]+/g, '-'), nome, pais, cod, moeda: 'EUR', valorAnual: milhoes * 1_000_000, regiao: 'INTERNATIONAL' });

export const PATROCINADORES: Patrocinador[] = [
  BR('Banco Aurora', 15_000_000), BR('BetArena', 12_000_000), BR('PrimeBank', 10_000_000), BR('EnergyUp', 8_000_000), BR('TechVision', 7_000_000),
  BR('AutoMax', 6_000_000), BR('SportsX', 5_500_000), BR('SuperMarket', 5_000_000), BR('FastNet', 4_500_000), BR('PowerDrink', 4_000_000),
  BR('Credix', 3_500_000), BR('SportLine', 3_000_000), BR('Connecta', 2_800_000), BR('FreshFood', 2_500_000), BR('MegaStore', 2_200_000),
  BR('GreenPower', 2_000_000), BR('DigitalOne', 1_800_000), BR('NutriMax', 1_500_000), BR('FiberOne', 1_300_000), BR('SafeLife', 1_200_000),
  BR('ShopNow', 1_000_000), BR('AthleticPro', 900_000), BR('TravelWorld', 800_000), BR('BuildMax', 600_000), BR('EcoFuture', 500_000),
  EX('Global Finance', 'EUA', 'us', 30), EX('Velocity Motors', 'Alemanha', 'de', 25), EX('Infinity Systems', 'EUA', 'us', 22), EX('GoldenBet', 'Reino Unido', 'gb', 20),
  EX('Global Motors', 'Japão', 'jp', 18), EX('NexTech', 'Coreia do Sul', 'kr', 16), EX('Prime Capital', 'Suíça', 'ch', 15), EX('E-Motion', 'Alemanha', 'de', 14),
  EX('PlayWin', 'Reino Unido', 'gb', 12), EX('SmartCore', 'EUA', 'us', 11), EX('UltraFit', 'Itália', 'it', 10), EX('DigitalOne Global', 'EUA', 'us', 9),
  EX('FiberOne Global', 'França', 'fr', 8), EX('HealthPlus', 'Suíça', 'ch', 7), EX('DriveX', 'Japão', 'jp', 6), EX('MaxSport', 'Espanha', 'es', 5.5),
  EX('EnergyCorp', 'Noruega', 'no', 5), EX('TotalSeg', 'Portugal', 'pt', 4.5), EX('LinkPlus', 'Canadá', 'ca', 4), EX('ProGear', 'Itália', 'it', 3.5),
  EX('FoodHouse', 'França', 'fr', 3), EX('SkyTravel', 'Emirados Árabes', 'ae', 2.5), EX('MetalOne', 'Alemanha', 'de', 2), EX('MedGlobal', 'Suíça', 'ch', 1.5),
  EX('EcoFuture Global', 'Suécia', 'se', 1),
];

/** Reputacao minima do clube: 90 no patrocinador de maior valor da regiao, 0 no de menor, linear pelo ranking. */
export const reputacaoMinima = (p: Patrocinador): number => {
  const regiao = PATROCINADORES.filter(x => x.regiao === p.regiao).sort((a, b) => paraDolares(b.valorAnual, b.moeda) - paraDolares(a.valorAnual, a.moeda));
  const i = regiao.findIndex(x => x.id === p.id);
  return Math.round(90 * (1 - i / (regiao.length - 1)));
};

/** Reputacao 0-100 do clube: fanBase (0,4) + tradicao (0,3) + forca (0,3), percentis entre `todos`. Clube sem entrada de tradicao usa o percentil da torcida. */
export const reputacaoDoClube = (time: Team, todos: Team[]): number => {
  const lista = todos.some(t => t.id === time.id) ? todos : [...todos, time];
  const i = lista.findIndex(t => t.id === time.id);
  const pTorcida = percentis(lista.map(t => t.fanBase || 0))[i];
  const pForca = percentis(lista.map(t => t.strength || 0))[i];
  const tradicao = acharEntrada(time.name)?.heritage ?? pTorcida;
  return Math.max(0, Math.min(100, Math.round(0.4 * pTorcida + 0.3 * tradicao + 0.3 * pForca)));
};

const diasEntre = (a: string, b: string) => Math.round((new Date(b + 'T12:00:00Z').getTime() - new Date(a + 'T12:00:00Z').getTime()) / 86400000);
export const diasParaFim = (c: ContratoPatrocinio, hoje: string): number => diasEntre(hoje, c.fim);

export type MotivoRecusa = 'ANOS' | 'REPUTACAO' | 'ATIVO' | 'JA_RENOVADO';
export const avaliarProposta = (rep: number, p: Patrocinador, atual: ContratoPatrocinio | undefined, proximo: ContratoPatrocinio | undefined, anos: number, hoje: string):
  { ok: true; renovacao: boolean } | { ok: false; motivo: MotivoRecusa } => {
  if (!Number.isInteger(anos) || anos < ANOS_MIN || anos > ANOS_MAX) return { ok: false, motivo: 'ANOS' };
  if (atual) {
    if (diasParaFim(atual, hoje) > JANELA_RENOVACAO_DIAS) return { ok: false, motivo: 'ATIVO' };
    if (proximo) return { ok: false, motivo: 'JA_RENOVADO' };
  }
  if (rep < reputacaoMinima(p)) return { ok: false, motivo: 'REPUTACAO' };
  return { ok: true, renovacao: !!atual };
};

export const statusDoPatrocinador = (rep: number, p: Patrocinador, atual: ContratoPatrocinio | undefined, proximo: ContratoPatrocinio | undefined, hoje: string): 'ATIVO' | 'DISPONIVEL' | 'BLOQUEADO' | 'INDISPONIVEL' => {
  if (atual?.sponsorId === p.id) return 'ATIVO';
  if (atual && (diasParaFim(atual, hoje) > JANELA_RENOVACAO_DIAS || proximo)) return 'INDISPONIVEL';
  return rep >= reputacaoMinima(p) ? 'DISPONIVEL' : 'BLOQUEADO';
};

const somaAnos = (iso: string, anos: number) => { const [y, m, d] = iso.split('-').map(Number); return `${y + anos}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; };
export const criarContrato = (p: Patrocinador, anos: number, inicio: string): ContratoPatrocinio =>
  ({ sponsorId: p.id, anos, valorAnualUSD: paraDolares(p.valorAnual, p.moeda), inicio, fim: somaAnos(inicio, anos), parcelasPagas: 0, ultimoMes: inicio.slice(0, 7) });

const mesesEntre = (a: string, b: string) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + (Number(b.slice(5, 7)) - Number(a.slice(5, 7)));

/** Parcelas vencidas ate `hoje` (uma por mes novo, no maximo 12 por ano de contrato). Devolve o contrato atualizado e o total em USD. */
export const pagarParcelas = (c: ContratoPatrocinio, hoje: string): { contrato: ContratoPatrocinio; usd: number; parcelas: number } => {
  const vencidas = Math.max(0, mesesEntre(c.ultimoMes, hoje.slice(0, 7)));
  const parcelas = Math.min(vencidas, c.anos * 12 - c.parcelasPagas);
  if (parcelas <= 0) return { contrato: vencidas > 0 ? { ...c, ultimoMes: hoje.slice(0, 7) } : c, usd: 0, parcelas: 0 };
  return { contrato: { ...c, parcelasPagas: c.parcelasPagas + parcelas, ultimoMes: hoje.slice(0, 7) }, usd: (c.valorAnualUSD / 12) * parcelas, parcelas };
};
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `npx tsx --test tests/patrocinadores.test.ts`
Expected: PASS (8 testes). Se algum falhar, corrija a implementação (não o teste), exceto a ordem de `acharEntrada` com nomes de teste: ela devolve `undefined` para "Clube a", o que é esperado.

- [ ] **Step 6: Commit**

```bash
git add "textSim/patrocinadores.ts" "textSim/tradicao.ts" "tests/patrocinadores.test.ts"
git commit -m "feat: sponsors domain module with 50 sponsors, reputation and installment rules"
```

---

### Task 2: Estado, avisos da Inbox e GameContext

**Files:**
- Modify: `types.ts` (interface `Team`, depois de `sponsorAmount?: number;`, linha ~259)
- Modify: `textSim/inbox.ts` (acrescentar no fim do arquivo)
- Modify: `context/GameContext.tsx` (imports, interface do contexto ~linha 215, efeito perto da premiação ~linha 441, valor do provider ~linha 2207)
- Test: `tests/inbox.test.ts` (acrescentar)

**Interfaces:**
- Consumes: Task 1 (`criarContrato`, `avaliarProposta`, `pagarParcelas`, `reputacaoDoClube`, `PATROCINADORES`, `ContratoPatrocinio`, `JANELA_RENOVACAO_DIAS`, `diasParaFim`).
- Produces:
  - `Team.sponsorContract?: ContratoPatrocinio`, `Team.sponsorNext?: ContratoPatrocinio`
  - `avisoDeParcelaPatrocinio(hoje: string, lang: Idioma, nome: string, parcelas: number, valor: string, key: string): MensagemInbox`
  - `avisoDeFimPatrocinio(hoje: string, lang: Idioma, nome: string, fim: string, key: string): MensagemInbox`
  - Contexto: `proporPatrocinio: (sponsorId: string, anos: number) => { ok: true; renovacao: boolean } | { ok: false; motivo: MotivoRecusa }` e `reputacaoClube: number`.

- [ ] **Step 1: Campos em `types.ts`**

Depois de `sponsorAmount?: number;` acrescente:

```ts
  sponsorContract?: import('./textSim/patrocinadores').ContratoPatrocinio;   // patrocinio principal ativo do clube do utilizador (ver textSim/patrocinadores.ts)
  sponsorNext?: import('./textSim/patrocinadores').ContratoPatrocinio;       // renovacao/troca ja acordada: comeca quando o contrato atual termina
```

- [ ] **Step 2: Escrever o teste dos avisos (falha)**

Acrescente em `tests/inbox.test.ts` (e ao import: `avisoDeParcelaPatrocinio, avisoDeFimPatrocinio`):

```ts
test('avisos do patrocinio: categoria FINANCE, chave propria, nos dois idiomas', () => {
  for (const lang of ['EN', 'PT'] as const) {
    const a = avisoDeParcelaPatrocinio('2024-05-01', lang, 'Banco Aurora', 1, '$240K', 'spons-pay|2024-05');
    assert.equal(a.categoria, 'FINANCE');
    assert.deepEqual(a.keys, ['spons-pay|2024-05']);
    assert.ok(a.corpo.includes('Banco Aurora') && a.corpo.includes('$240K'));
    const f = avisoDeFimPatrocinio('2025-02-01', lang, 'Banco Aurora', '2025-04-01', 'spons-end|2025-04-01');
    assert.equal(f.categoria, 'FINANCE');
    assert.equal(f.alta, true);
    assert.deepEqual(f.keys, ['spons-end|2025-04-01']);
  }
});
```

Run: `npx tsx --test tests/inbox.test.ts` — Expected: FAIL (exports não existem).

- [ ] **Step 3: Implementar os avisos em `textSim/inbox.ts`** (no fim do arquivo)

```ts
// ------------------------------------------------------------------ patrocinio (textSim/patrocinadores.ts)
export const avisoDeParcelaPatrocinio = (hoje: string, lang: Idioma, nome: string, parcelas: number, valor: string, key: string): MensagemInbox => criar({ keys: [key], date: hoje, categoria: 'FINANCE', ir: 'FINANCES', de: L(lang, 'Finance Director', 'Diretor Financeiro'),
  assunto: L(lang, `Sponsorship payment received — ${nome}`, `Parcela de patrocínio recebida — ${nome}`),
  corpo: L(lang, `${nome} paid ${parcelas > 1 ? `${parcelas} instalments` : 'the monthly instalment'}: ${valor} added to the club's cash.`, `${nome} pagou ${parcelas > 1 ? `${parcelas} parcelas` : 'a parcela mensal'}: ${valor} entraram no caixa do clube.`) });

export const avisoDeFimPatrocinio = (hoje: string, lang: Idioma, nome: string, fim: string, key: string): MensagemInbox => criar({ keys: [key], date: hoje, categoria: 'FINANCE', alta: true, ir: 'FINANCES', de: L(lang, 'Finance Director', 'Diretor Financeiro'),
  assunto: L(lang, `Sponsorship ending soon — ${nome}`, `Patrocínio perto do fim — ${nome}`),
  corpo: L(lang, `The ${nome} contract ends on ${dataLonga(fim, lang)}. Open Finance → Sponsors to renew or choose another sponsor.`, `O contrato com ${nome} termina em ${dataLonga(fim, lang)}. Abra Finanças → Patrocinadores para renovar ou escolher outro patrocinador.`) });
```

Run: `npx tsx --test tests/inbox.test.ts` — Expected: PASS.

- [ ] **Step 4: Imports e interface em `GameContext.tsx`**

Acrescente aos imports (junto aos demais de `../textSim/`, e acrescente `avisoDeParcelaPatrocinio, avisoDeFimPatrocinio` à lista importada de `'../textSim/inbox'`):

```ts
import { PATROCINADORES, criarContrato, avaliarProposta, pagarParcelas, reputacaoDoClube, diasParaFim, JANELA_RENOVACAO_DIAS, type MotivoRecusa } from '../textSim/patrocinadores';
```

Na interface do contexto (perto de `proporRenovacao`, ~linha 215):

```ts
  /** Proposta de patrocinio principal (Finance > Sponsors): aceita pela reputacao do clube; na janela dos 60 dias finais vira renovacao (comeca no fim do contrato atual). */
  proporPatrocinio: (sponsorId: string, anos: number) => { ok: true; renovacao: boolean } | { ok: false; motivo: MotivoRecusa };
  /** Reputacao 0-100 do clube do utilizador (fanBase, tradicao e forca). */
  reputacaoClube: number;
```

- [ ] **Step 5: Ação, reputação e efeito mensal (depois do efeito da premiação, ~linha 452)**

```ts
  // PATROCINIO PRINCIPAL (textSim/patrocinadores.ts): reputacao do clube, proposta, parcelas mensais no caixa e fim do contrato (tudo por data).
  const reputacaoClube = useMemo(() => (userTeam ? reputacaoDoClube(userTeam, teams) : 0), [userTeam?.id, userTeam?.fanBase, userTeam?.strength, teams.length]);
  const proporPatrocinio = (sponsorId: string, anos: number) => {
    const p = PATROCINADORES.find(x => x.id === sponsorId);
    if (!userTeam || !p) return { ok: false as const, motivo: 'REPUTACAO' as MotivoRecusa };
    const hoje = gameState.currentDate;
    const r = avaliarProposta(reputacaoClube, p, userTeam.sponsorContract, userTeam.sponsorNext, anos, hoje);
    if (!r.ok) return r;
    const novo = criarContrato(p, anos, r.renovacao ? userTeam.sponsorContract!.fim : hoje);
    setTeams(prev => prev.map(t => t.id === userTeam.id ? (r.renovacao ? { ...t, sponsorNext: novo } : { ...t, sponsorContract: novo }) : t));
    return r;
  };
  useEffect(() => {
    if (!userTeam) return;
    const hoje = gameState.currentDate;
    let c = userTeam.sponsorContract, n = userTeam.sponsorNext;
    if (!c && !n) return;
    const avisos: MensagemInbox[] = [];
    let usd = 0;
    // 1) fim do contrato: entra o proximo (se houver) ou o clube fica sem patrocinador
    if (c && c.fim <= hoje) { c = n; n = undefined; }
    // 2) parcelas vencidas
    if (c && c.inicio <= hoje) {
      const r = pagarParcelas(c, hoje);
      if (r.parcelas > 0) {
        c = r.contrato; usd = r.usd;
        const nome = PATROCINADORES.find(x => x.id === c!.sponsorId)?.nome || '';
        avisos.push(avisoDeParcelaPatrocinio(hoje, gameState.language, nome, r.parcelas, formatCurrency(usd), `spons-pay|${c.sponsorId}|${hoje.slice(0, 7)}`));
      }
    }
    // 3) aviso dos 60 dias finais (so sem renovacao acordada)
    if (c && !n && diasParaFim(c, hoje) <= JANELA_RENOVACAO_DIAS) {
      const nome = PATROCINADORES.find(x => x.id === c!.sponsorId)?.nome || '';
      avisos.push(avisoDeFimPatrocinio(hoje, gameState.language, nome, c.fim, `spons-end|${c.sponsorId}|${c.fim}`));
    }
    if (c === userTeam.sponsorContract && n === userTeam.sponsorNext && !avisos.length) return;
    if (c !== userTeam.sponsorContract || n !== userTeam.sponsorNext || usd) {
      setTeams(prev => prev.map(t => t.id === userTeam.id ? { ...t, sponsorContract: c, sponsorNext: n, cash: t.cash + usd } : t));
    }
    if (avisos.length) setInbox(prev => adicionar(prev, avisos));
  }, [gameState.currentDate, userTeam?.id, userTeam?.sponsorContract, userTeam?.sponsorNext]);
```

Se `useMemo` não estiver importado de `react` no topo do arquivo, acrescente-o.

- [ ] **Step 6: Expor no provider (~linha 2207)**

Na lista do `value`, acrescente `proporPatrocinio, reputacaoClube,` (junto a `formatCurrency`).

- [ ] **Step 7: Verificar tipos e build**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "GameContext|patrocinadores|inbox|types.ts"`
Expected: sem erros novos nesses arquivos. (Erros antigos em outros arquivos podem existir; compare com `git stash` se houver dúvida.)

- [ ] **Step 8: Commit**

```bash
git add types.ts textSim/inbox.ts context/GameContext.tsx tests/inbox.test.ts
git commit -m "feat: sponsor contract state, monthly payments and expiry in GameContext"
```

---

### Task 3: Bandeiras SVG

**Files:**
- Create: `public/flags/us.svg`, `de.svg`, `gb.svg`, `jp.svg`, `kr.svg`, `ch.svg`, `it.svg`, `fr.svg`, `es.svg`, `no.svg`, `pt.svg`, `ca.svg`, `ae.svg`, `se.svg`

**Interfaces:**
- Produces: arquivos servidos em `/flags/<cod>.svg` (3:2, `viewBox="0 0 30 20"`). Brasil usa o PNG existente `/Assets/Bandeiras/45.png`.

- [ ] **Step 1: Criar os 14 arquivos** (conteúdo exato; versões simplificadas das bandeiras)

`de.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="7" fill="#000"/><rect y="7" width="30" height="6.7" fill="#d00"/><rect y="13.4" width="30" height="6.6" fill="#fc0"/></svg>
```
`fr.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="10" height="20" fill="#0055a4"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ef4135"/></svg>
```
`it.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="10" height="20" fill="#009246"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ce2b37"/></svg>
```
`es.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#aa151b"/><rect y="5" width="30" height="10" fill="#f1bf00"/></svg>
```
`pt.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#ff0000"/><rect width="12" height="20" fill="#006600"/><circle cx="12" cy="10" r="3.5" fill="#ffcc00"/></svg>
```
`jp.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#bc002d"/></svg>
```
`kr.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="5" fill="#cd2e3a"/><path d="M10 10a5 5 0 0 0 10 0a2.5 2.5 0 0 0-5 0a2.5 2.5 0 0 1-5 0z" fill="#0047a0"/></svg>
```
`ch.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#d52b1e"/><rect x="13" y="4" width="4" height="12" fill="#fff"/><rect x="9" y="8" width="12" height="4" fill="#fff"/></svg>
```
`no.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#ba0c2f"/><rect x="8" width="6" height="20" fill="#fff"/><rect y="7" width="30" height="6" fill="#fff"/><rect x="9.5" width="3" height="20" fill="#00205b"/><rect y="8.5" width="30" height="3" fill="#00205b"/></svg>
```
`se.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#006aa7"/><rect x="9" width="4" height="20" fill="#fecc00"/><rect y="8" width="30" height="4" fill="#fecc00"/></svg>
```
`ca.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/><rect width="7.5" height="20" fill="#d52b1e"/><rect x="22.5" width="7.5" height="20" fill="#d52b1e"/><path d="M15 4l1.6 3.4 2.6-.8-1 3.6 2.4 1.4-3.6.8.2 2.6h-2.4l.2-2.6-3.6-.8 2.4-1.4-1-3.6 2.6.8z" fill="#d52b1e"/></svg>
```
`ae.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="6.7" fill="#00732f"/><rect y="6.7" width="30" height="6.6" fill="#fff"/><rect y="13.3" width="30" height="6.7" fill="#000"/><rect width="7.5" height="20" fill="#ff0000"/></svg>
```
`us.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/><g fill="#b22234"><rect width="30" height="1.54"/><rect y="3.08" width="30" height="1.54"/><rect y="6.15" width="30" height="1.54"/><rect y="9.23" width="30" height="1.54"/><rect y="12.3" width="30" height="1.54"/><rect y="15.4" width="30" height="1.54"/><rect y="18.46" width="30" height="1.54"/></g><rect width="12" height="10.8" fill="#3c3b6e"/></svg>
```
`gb.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#012169"/><path d="M0 0L30 20M30 0L0 20" stroke="#fff" stroke-width="3.5"/><path d="M0 0L30 20M30 0L0 20" stroke="#c8102e" stroke-width="1.5"/><path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="6"/><path d="M15 0v20M0 10h30" stroke="#c8102e" stroke-width="3.5"/></svg>
```

- [ ] **Step 2: Conferir que são 14 arquivos válidos**

Run: `ls public/flags | wc -l` — Expected: `14`.

- [ ] **Step 3: Commit**

```bash
git add public/flags
git commit -m "feat: add flag SVGs for foreign sponsors"
```

---

### Task 4: Aba SPONSORS em Finance e leitura do contrato

**Files:**
- Create: `components/SponsorsTab.tsx`
- Modify: `components/FinancesView.tsx` (botões ~linha 111-126, corpo, bloco do patrocínio ~linha 170)
- Modify: `components/DashboardView.tsx` (linhas 452-453 e 790)
- Modify: `package.json` (script `teste:base`)

**Interfaces:**
- Consumes: Task 1 e 2 (`PATROCINADORES`, `statusDoPatrocinador`, `reputacaoMinima`, `diasParaFim`, `JANELA_RENOVACAO_DIAS`, `ANOS_MIN`, `ANOS_MAX`, `useGame().proporPatrocinio`, `reputacaoClube`, `userTeam.sponsorContract`, `sponsorNext`).
- Produces: componente `SponsorsTab` (sem props).

- [ ] **Step 1: Criar `components/SponsorsTab.tsx`**

```tsx
import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { assetUrl } from '../textSim/assetUrl';
import { PATROCINADORES, statusDoPatrocinador, reputacaoMinima, diasParaFim, ANOS_MIN, ANOS_MAX, JANELA_RENOVACAO_DIAS, type Patrocinador, type RegiaoPatrocinio } from '../textSim/patrocinadores';
import { paraDolares } from '../textSim/cambio';

const bandeira = (p: Patrocinador) => assetUrl(p.cod === 'br' ? '/Assets/Bandeiras/45.png' : `/flags/${p.cod}.svg`);

const SponsorsTab: React.FC = () => {
  const { userTeam, gameState, formatCurrency, proporPatrocinio, reputacaoClube } = useGame();
  const [regiao, setRegiao] = useState<RegiaoPatrocinio>('BRASIL');
  const [aberto, setAberto] = useState<Patrocinador | null>(null);
  const [anos, setAnos] = useState(1);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  if (!userTeam) return null;
  const pt = gameState.language === 'PT';
  const hoje = gameState.currentDate;
  const atual = userTeam.sponsorContract, proximo = userTeam.sponsorNext;
  const nomeDe = (id: string) => PATROCINADORES.find(p => p.id === id)?.nome || '';

  const ROTULO = {
    ATIVO: pt ? 'Ativo' : 'Active', DISPONIVEL: pt ? 'Disponível' : 'Available', BLOQUEADO: pt ? 'Reputação insuficiente' : 'Reputation too low', INDISPONIVEL: pt ? 'Contrato em vigor' : 'Contract in force'
  };
  const COR = { ATIVO: 'text-emerald-500', DISPONIVEL: 'text-blue-500', BLOQUEADO: 'text-rose-500', INDISPONIVEL: 'text-slate-400' };
  const MOTIVO: Record<string, string> = {
    REPUTACAO: pt ? 'A reputação do clube é insuficiente para este patrocinador.' : "The club's reputation is too low for this sponsor.",
    ATIVO: pt ? `O contrato atual só pode ser trocado nos últimos ${JANELA_RENOVACAO_DIAS} dias.` : `The current contract can only be replaced in its last ${JANELA_RENOVACAO_DIAS} days.`,
    JA_RENOVADO: pt ? 'A renovação já foi acordada.' : 'A renewal is already agreed.',
    ANOS: pt ? 'Duração inválida.' : 'Invalid duration.'
  };

  const propor = () => {
    if (!aberto) return;
    const r = proporPatrocinio(aberto.id, anos);
    if (r.ok) { setMsg({ ok: true, texto: r.renovacao ? (pt ? 'Renovação acordada: começa no fim do contrato atual.' : 'Renewal agreed: it starts when the current contract ends.') : (pt ? 'Proposta aceita! Contrato assinado.' : 'Proposal accepted! Contract signed.') }); setAberto(null); }
    else setMsg({ ok: false, texto: MOTIVO[r.motivo] });
  };

  const lista = PATROCINADORES.filter(p => p.regiao === regiao);
  const aba = (r: RegiaoPatrocinio, rotulo: string) => (
    <button onClick={() => { setRegiao(r); setAberto(null); setMsg(null); }} className={`min-h-[44px] px-6 rounded font-black text-xs uppercase tracking-widest transition-all ${regiao === r ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>{rotulo}</button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex gap-2">{aba('BRASIL', 'BRASIL')}{aba('INTERNATIONAL', 'INTERNATIONAL')}</div>
        <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">{pt ? 'Reputação do clube' : 'Club reputation'}: <span className="text-blue-500">{reputacaoClube}</span> / 100</div>
      </div>

      <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3 text-sm">
        {atual
          ? <>
              <span className="font-black text-emerald-500">{nomeDe(atual.sponsorId)}</span> — {formatCurrency(atual.valorAnualUSD)} / {pt ? 'ano' : 'year'} · {pt ? 'até' : 'until'} {atual.fim} · {atual.parcelasPagas}/{atual.anos * 12} {pt ? 'parcelas' : 'instalments'}
              {proximo && <span className="ml-3 text-blue-500 font-bold">{pt ? 'Renovação' : 'Renewal'}: {nomeDe(proximo.sponsorId)} ({proximo.anos} {pt ? 'anos' : 'yrs'})</span>}
              {!proximo && diasParaFim(atual, hoje) <= JANELA_RENOVACAO_DIAS && <span className="ml-3 text-amber-500 font-bold">{pt ? 'Pode renovar ou trocar agora' : 'You can renew or switch now'}</span>}
            </>
          : <span className="text-slate-500">{pt ? 'Sem patrocinador principal. Escolha um abaixo.' : 'No main sponsor. Pick one below.'}</span>}
      </div>

      {msg && <div className={`text-sm font-bold ${msg.ok ? 'text-emerald-500' : 'text-rose-500'}`}>{msg.texto}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {lista.map(p => {
          const st = statusDoPatrocinador(reputacaoClube, p, atual, proximo, hoje);
          const clicavel = st === 'DISPONIVEL';
          return (
            <button key={p.id} disabled={!clicavel} onClick={() => { setAberto(p); setAnos(1); setMsg(null); }}
              className={`min-h-[64px] text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${aberto?.id === p.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60'} ${clicavel ? 'hover:border-blue-400 cursor-pointer' : 'opacity-70 cursor-default'}`}>
              <img src={bandeira(p)} alt="" className="w-10 h-7 object-cover rounded-sm border border-slate-300 dark:border-slate-700 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-black text-slate-900 dark:text-white truncate">{p.nome}</div>
                <div className="text-[11px] text-slate-500 truncate">{p.pais} · {pt ? 'rep. mín.' : 'min. rep.'} {reputacaoMinima(p)}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-black text-slate-900 dark:text-white">{formatCurrency(paraDolares(p.valorAnual, p.moeda))}</div>
                <div className={`text-[10px] font-black uppercase tracking-wider ${COR[st]}`}>{ROTULO[st]}</div>
              </div>
            </button>
          );
        })}
      </div>

      {aberto && (
        <div className="bg-white dark:bg-slate-900 border border-blue-500/40 rounded-xl p-5 flex flex-wrap items-center gap-4 shadow-xl">
          <img src={bandeira(aberto)} alt="" className="w-12 h-8 object-cover rounded-sm border border-slate-300 dark:border-slate-700" />
          <div className="flex-1 min-w-[180px]">
            <div className="font-black text-lg text-slate-900 dark:text-white">{aberto.nome}</div>
            <div className="text-sm text-slate-500">{formatCurrency(paraDolares(aberto.valorAnual, aberto.moeda))} / {pt ? 'ano' : 'year'} · 12 {pt ? 'parcelas mensais' : 'monthly instalments'}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">{pt ? 'Duração' : 'Duration'}</span>
            {Array.from({ length: ANOS_MAX - ANOS_MIN + 1 }, (_, i) => ANOS_MIN + i).map(n => (
              <button key={n} onClick={() => setAnos(n)} className={`min-w-[44px] min-h-[44px] rounded font-black ${anos === n ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>{n}</button>
            ))}
            <span className="text-xs text-slate-500">{pt ? 'ano(s)' : 'year(s)'}</span>
          </div>
          <button onClick={propor} className="min-h-[44px] px-6 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest">{atual ? (pt ? 'Renovar / trocar' : 'Renew / switch') : (pt ? 'Propor' : 'Propose')}</button>
          <button onClick={() => setAberto(null)} className="min-h-[44px] px-4 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 font-black text-xs uppercase tracking-widest">{pt ? 'Cancelar' : 'Cancel'}</button>
        </div>
      )}
    </div>
  );
};

export default SponsorsTab;
```

- [ ] **Step 2: Aba em `FinancesView.tsx`**

Importe `import SponsorsTab from './SponsorsTab';`. Troque o tipo do estado `marketPhase` para `'OVERVIEW' | 'MARKET' | 'SPONSORS'`. Entre o botão `fin_treasury` e o botão `fin_market` acrescente:

```tsx
           <button
             onClick={() => setMarketPhase('SPONSORS')}
             className={`px-6 py-2 rounded font-black text-xs uppercase tracking-widest transition-all ${marketPhase === 'SPONSORS' ? 'bg-emerald-600/10 text-emerald-600 dark:bg-emerald-600 dark:text-white border border-emerald-600/30 shadow-lg' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
           >
             {gameState.language === 'PT' ? 'PATROCINADORES' : 'SPONSORS'}
           </button>
```

Abaixo do cabeçalho, onde o corpo da Tesouraria é renderizado quando `marketPhase === 'OVERVIEW'`, acrescente antes dele `{marketPhase === 'SPONSORS' && <SponsorsTab />}` (leia o JSX depois de ~linha 135 para achar a condição existente do `OVERVIEW` e mantenha-a).

No bloco `fin_sponsor` (~linha 171) troque `userTeam.sponsorAmount || 0` por `userTeam.sponsorContract?.valorAnualUSD || 0`.

- [ ] **Step 3: Dashboard**

Em `DashboardView.tsx`, linhas 452-453, troque `userTeam.sponsorAmount || 0` por `userTeam.sponsorContract?.valorAnualUSD || 0` e nas dependências `userTeam?.sponsorAmount` por `userTeam?.sponsorContract?.valorAnualUSD`. Na linha 790 troque o valor exibido do mesmo modo.

Nota: o campo `spo` do gráfico mensal passa a ser o valor anual do contrato (como já era com `sponsorAmount`).

- [ ] **Step 4: Registrar o teste em `package.json`**

No script `teste:base`, acrescente ` tests/patrocinadores.test.ts` ao final da lista de arquivos.

- [ ] **Step 5: Verificação completa**

Run: `npm run teste:base` — Expected: todos passam, incluindo `patrocinadores` e `inbox`.
Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "SponsorsTab|FinancesView|DashboardView|GameContext|patrocinadores"` — Expected: sem erros novos.
Run: `npm run build` — Expected: build conclui.

- [ ] **Step 6: Verificação manual (PC e iPad paisagem)**

Run: `npm run dev`, abra o jogo, vá em Finance → SPONSORS.
Confira: duas abas (BRASIL e INTERNATIONAL), 25 cartões cada, bandeiras visíveis, clube pequeno com os grandes bloqueados, contratar um patrocinador de baixo valor, avançar dias até o dia 1 do mês seguinte e ver o caixa subir `valor/12` e o e-mail na Inbox; no DevTools use largura 1180×820 para checar o iPad paisagem.

- [ ] **Step 7: Commit**

```bash
git add components/SponsorsTab.tsx components/FinancesView.tsx components/DashboardView.tsx package.json
git commit -m "feat: sponsors tab in Finance with contract proposal and tests registered"
```

---

## Self-Review (feita)

- **Cobertura do spec:** dados e 50 valores (Task 1), reputação derivada e mínima 0–90 (Task 1), um contrato por clube e janela de 60 dias (Task 1 e 2), 12 parcelas mensais e idempotência (Task 1 e 2), expiração por data e próximo contrato (Task 2), avisos Inbox (Task 2), aba dentro de Finance com BRASIL e INTERNATIONAL, status, bandeiras e alvos de 44 px (Task 3 e 4), leitura em Finance e Dashboard (Task 4), testes (Task 1 e 2).
- **Placeholders:** nenhum; o único ponto de leitura é o do JSX existente do `OVERVIEW` no Step 2 da Task 4, com instrução objetiva.
- **Consistência de tipos:** `ContratoPatrocinio`, `MotivoRecusa`, `avaliarProposta` (6 argumentos), `pagarParcelas`, `statusDoPatrocinador` (5 argumentos) iguais nas Tasks 1, 2 e 4.
- **Risco conhecido:** o efeito mensal depende de `gameState.currentDate`, que avança 1 dia por vez; se o salto for maior, `pagarParcelas` recupera as parcelas atrasadas.
