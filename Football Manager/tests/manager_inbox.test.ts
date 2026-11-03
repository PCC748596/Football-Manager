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
