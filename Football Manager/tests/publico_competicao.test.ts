import test from 'node:test';
import assert from 'node:assert/strict';
import { settleMatch, competicaoDoJogo, ECONOMIA_ESTADIO } from '../textSim/stadiumEconomy';

const time = (id: string, name: string, cap: number, occ?: number): any => ({ id, name, stadium: 'Estadio ' + name, stadiumCapacity: cap, stadiumOccupancy: occ });
const jogo = (id: string, extra: any = {}): any => ({ id, date: '2024-04-10', homeTeamId: 'h', awayTeamId: 'a', played: false, ...extra });

test('a ocupacao inicial do estadio e 60%', () => {
  assert.equal(ECONOMIA_ESTADIO.ocupacaoInicial, 0.6);
  assert.equal(settleMatch(time('h', 'Casa-RN', 10000), time('a', 'Fora-PI', 10000), jogo('liga-1'), 'USD').attendance, 6000);
});

test('a competicao do jogo: liga, copa, continental, amistoso', () => {
  assert.equal(competicaoDoJogo(jogo('fix-bra_serie_a-w1-0-1-2')), 'LIGA');
  assert.equal(competicaoDoJogo(jogo('fix-cup-COPA_BR-P1-12', { type: 'CUP' })), 'COPA');
  assert.equal(competicaoDoJogo(jogo('fix-cup-LIB-GA-1-0', { type: 'CUP' })), 'CONTINENTAL');
  assert.equal(competicaoDoJogo(jogo('fix-cup-SUL-GB-2-1', { type: 'CUP' })), 'CONTINENTAL');
  assert.equal(competicaoDoJogo(jogo('fix-cup-SERIE_D-G1-3', { type: 'CUP' })), 'LIGA');
  assert.equal(competicaoDoJogo(jogo('friendly-1', { isFriendly: true })), 'AMISTOSO');
});

test('o multiplicador da competicao: copa x1.2, continental x1.4, nunca acima da capacidade', () => {
  const h = time('h', 'Casa-RN', 10000, 0.5), a = time('a', 'Fora-PI', 10000);
  assert.equal(settleMatch(h, a, jogo('liga'), 'USD').attendance, 5000);
  assert.equal(settleMatch(h, a, jogo('fix-cup-COPA_BR-P1-1', { type: 'CUP' }), 'USD').attendance, 6000);
  assert.equal(settleMatch(h, a, jogo('fix-cup-LIB-GA-1-0', { type: 'CUP' }), 'USD').attendance, 7000);
  const cheio = time('h', 'Casa-RN', 10000, 0.95);
  assert.equal(settleMatch(cheio, a, jogo('fix-cup-LIB-GA-1-0', { type: 'CUP' }), 'USD').attendance, 10000);
});
