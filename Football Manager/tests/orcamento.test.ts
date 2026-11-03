import test from 'node:test';
import assert from 'node:assert/strict';
import { aplicarDivisao, orcamentoDaTemporada, fracaoValida, PADRAO_COMPRAS } from '../textSim/orcamento';

const time = (over: any = {}) => ({ id: 'a', initialCapital: 10_000_000, initialTransfer: 8_000_000, transferBudget: 8_000_000, ...over }) as any;

test('orcamento da temporada soma o patrocinio anual do contrato', () => {
  assert.equal(orcamentoDaTemporada(time()), 10_000_000);
  assert.equal(orcamentoDaTemporada(time({ sponsorContract: { valorAnualUSD: 2_000_000 } })), 12_000_000);
});

test('fracao em passos de 10%, entre 0 e 100%', () => {
  assert.equal(PADRAO_COMPRAS, 0.8);
  assert.equal(fracaoValida(0.83), 0.8);
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
