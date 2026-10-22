import test from 'node:test';
import assert from 'node:assert/strict';
import { valorDeMercado, recalcularValores, anosRestantes, CONFIG_VALOR } from '../textSim/valuation';
import { Position } from '../types';

const jog = (extra: any = {}) => ({ id: 'a', name: 'A', age: 25, position: Position.CM, skill: 70, value: 0, salary: 1000, teamId: 'T', contract: { start: '2023-01-01', end: '2027-01-01', years: 4 }, ...extra }) as any;
const HOJE = '2024-04-01';

test('valor: determinista e dentro dos limites', () => {
  for (let i = 0; i < 500; i++) {
    const p = jog({ skill: 40 + (i % 55), age: 16 + (i % 25) });
    const v = valorDeMercado(p, HOJE);
    assert.equal(v, valorDeMercado({ ...p }, HOJE));
    assert.ok(v >= CONFIG_VALOR.minimo && v <= CONFIG_VALOR.maximo);
  }
});

test('valor sobe com o overall e e coerente com a economia (mediana dos dados reais x escala)', () => {
  const v50 = valorDeMercado(jog({ skill: 50 }), HOJE), v60 = valorDeMercado(jog({ skill: 60 }), HOJE), v70 = valorDeMercado(jog({ skill: 70 }), HOJE), v80 = valorDeMercado(jog({ skill: 80 }), HOJE);
  assert.ok(v50 < v60 && v60 < v70 && v70 < v80);
  console.log('valores (25 anos, contrato longo): ovr50', v50, 'ovr60', v60, 'ovr70', v70, 'ovr80', v80);
  assert.ok(v50 > 800_000 && v50 < 1_400_000, 'ovr 50 ~1,1 M: ' + v50);
  assert.ok(v80 > 3_000_000 && v80 < 8_000_000, 'ovr 80 ~5 M: ' + v80);
});

test('idade: o veterano vale menos que o jogador no auge', () => {
  const auge = valorDeMercado(jog({ age: 25 }), HOJE), vet = valorDeMercado(jog({ age: 36 }), HOJE), velho = valorDeMercado(jog({ age: 40 }), HOJE);
  assert.ok(auge > vet && vet > velho);
});

test('potencial: premia o jovem promissor, mas um overall baixo nunca vale mais que um consolidado', () => {
  const semPot = valorDeMercado(jog({ age: 17, skill: 55, potential: 55 }), HOJE);
  const comPot = valorDeMercado(jog({ age: 17, skill: 55, potential: 85 }), HOJE);
  assert.ok(comPot > semPot * 1.2, 'o potencial pesa no jovem');
  assert.ok(comPot <= semPot * CONFIG_VALOR.potencialTeto + 20_000, 'limitado pelo teto');
  const consolidado = valorDeMercado(jog({ age: 27, skill: 72 }), HOJE);
  assert.ok(comPot < consolidado, 'um 55 de 17 anos com 85 de potencial nao vale mais que um 72 de 27');
  // o potencial nao pesa em quem ja esta no fim da carreira
  assert.equal(valorDeMercado(jog({ age: 30, skill: 70, potential: 90 }), HOJE), valorDeMercado(jog({ age: 30, skill: 70, potential: 70 }), HOJE));
});

test('contrato: quanto menos resta, menos vale; vencido vale pouco', () => {
  const longo = valorDeMercado(jog(), HOJE);
  const umAno = valorDeMercado(jog({ contract: { start: '2022-01-01', end: '2025-04-01', years: 3 } }), HOJE);
  const meioAno = valorDeMercado(jog({ contract: { start: '2022-01-01', end: '2024-10-01', years: 3 } }), HOJE);
  const vencido = valorDeMercado(jog({ contract: { start: '2020-01-01', end: '2024-03-01', years: 4 } }), HOJE);
  assert.ok(longo > umAno && umAno > meioAno && meioAno > vencido);
  assert.ok(Math.abs(anosRestantes(jog({ contract: { start: '2022-01-01', end: '2025-04-01', years: 3 } }), HOJE) - 1) < 0.01);
});

test('recalcular: a mesma lista se nada mudou; so muda quem mudou', () => {
  const lista = [jog({ id: '1' }), jog({ id: '2', skill: 60 })].map(p => ({ ...p, value: valorDeMercado(p, HOJE) }));
  assert.equal(recalcularValores(lista, HOJE), lista, 'nenhum recalculo desnecessario');
  const mudou = recalcularValores([lista[0], { ...lista[1], skill: 61 }], HOJE);
  assert.notEqual(mudou[1].value, lista[1].value);
  assert.equal(mudou[0], lista[0], 'o jogador igual mantem o mesmo objeto');
});
