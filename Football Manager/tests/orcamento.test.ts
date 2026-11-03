import test from 'node:test';
import assert from 'node:assert/strict';
import { aplicarDivisao, orcamentoDaTemporada, fracaoValida, maxCompras, folhaAnual, PADRAO_COMPRAS } from '../textSim/orcamento';

const time = (over: any = {}) => ({ id: 'a', initialCapital: 10_000_000, initialTransfer: 8_000_000, transferBudget: 8_000_000, ...over }) as any;

test('orcamento da temporada soma o patrocinio anual do contrato', () => {
  assert.equal(orcamentoDaTemporada(time()), 10_000_000);
  assert.equal(orcamentoDaTemporada(time({ sponsorContract: { valorAnualUSD: 2_000_000 } })), 12_000_000);
});

test('fracao em passos de 5%, entre 0 e 100%', () => {
  assert.equal(PADRAO_COMPRAS, 0.8);
  assert.equal(fracaoValida(0.83), 0.85);
  assert.equal(fracaoValida(0.82), 0.8);
  assert.equal(fracaoValida(0.6), 0.6);
  assert.equal(fracaoValida(-1), 0);
  assert.equal(fracaoValida(2), 1);
});

test('dividir: 80% -> 60% tira 2M do orcamento disponivel, mantendo o que ja foi gasto', () => {
  const gasto = time({ transferBudget: 5_000_000 });            // ja gastou 3M dos 8M
  const r = aplicarDivisao(gasto, 0.6);
  assert.equal(r.initialTransfer, 6_000_000);
  assert.equal(r.transferBudget, 3_000_000);                    // 5M - 2M
  assert.equal(r.transferPct, 0.6);
  const sobe = aplicarDivisao(gasto, 1);
  assert.equal(sobe.transferBudget, 7_000_000);                 // 5M + 2M
});

test('dividir: o disponivel nunca fica negativo e o patrocinio entra na base', () => {
  const r = aplicarDivisao(time({ transferBudget: 500_000, sponsorContract: { valorAnualUSD: 2_000_000 } }), 0.2);
  assert.equal(r.initialTransfer, 2_400_000);
  assert.equal(r.transferBudget, 500_000 + 2_400_000 - 8_000_000 > 0 ? 500_000 + 2_400_000 - 8_000_000 : 0);
  assert.ok(r.transferBudget >= 0);
});

test('folha anual = salarios semanais x 52', () => {
  assert.equal(folhaAnual([10_000, 20_000]), 30_000 * 52);
  assert.equal(folhaAnual([]), 0);
});

test('os salarios nao ficam abaixo da folha: limita o maximo das compras (passo de 5% para baixo)', () => {
  const t = time();                                   // orcamento 10M
  assert.equal(maxCompras(t, 0), 1);
  assert.equal(maxCompras(t, 2_000_000), 0.8);        // sobram 80%
  assert.equal(maxCompras(t, 2_300_000), 0.75);       // sobram 77% -> 75%
  assert.equal(maxCompras(t, 10_000_000), 0);
  assert.equal(maxCompras(t, 15_000_000), 0);         // folha maior que o orcamento
  const r = aplicarDivisao(t, 0.9, 2_300_000);        // pediu 90%, so pode 75%
  assert.equal(r.transferPct, 0.75);
  assert.equal(r.initialTransfer, 7_500_000);
  assert.ok(10_000_000 - r.initialTransfer! >= 2_300_000);
});

test('dificuldade: orcamento = fator x folha anual, caixa igual, compras em 80%', async () => {
  const { aplicarDificuldade, DIFICULDADES } = await import('../textSim/orcamento');
  assert.deepEqual(DIFICULDADES.map(d => d.fator), [4, 3.5, 3, 2.5, 2]);
  const t = aplicarDificuldade(time({ cash: 1, initialCapital: 1 }), 2_000_000, 'EASY');
  assert.equal(t.initialCapital, 7_000_000);
  assert.equal(t.cash, 7_000_000);
  assert.equal(t.initialTransfer, 5_600_000);
  assert.equal(t.transferBudget, 5_600_000);
  assert.equal(t.transferPct, 0.8);
  assert.equal(aplicarDificuldade(time(), 1_000_000, 'VERY_HARD').initialCapital, 2_000_000);
  assert.equal(aplicarDificuldade(time(), 1_000_000, 'VERY_EASY').initialCapital, 4_000_000);
});
