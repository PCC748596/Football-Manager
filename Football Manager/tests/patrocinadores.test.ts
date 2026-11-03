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
  const atual = criarContrato(p, 1, '2024-04-01');
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
  const atraso = pagarParcelas(r1.contrato, '2024-08-01');
  assert.equal(atraso.parcelas, 3);
  const fim = pagarParcelas(c0, '2026-01-01');
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
