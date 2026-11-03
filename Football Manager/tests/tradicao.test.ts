import test from 'node:test';
import assert from 'node:assert/strict';
import { acharEntrada, ajustesDeTradicao, normalizar } from '../textSim/tradicao';

const time = (id: string, name: string, fanBase: number, foundedYear: number) => ({ id, name, fanBase, foundedYear }) as any;

test('normalizar: sem acento, minusculas, so letras e numeros', () => {
  assert.equal(normalizar('Atlético-MG'), 'atleticomg');
  assert.equal(normalizar('São Paulo'), 'saopaulo');
});

test('acharEntrada: nome exato, sufixo de UF da base e alias', () => {
  assert.equal(acharEntrada('Flamengo-RJ')?.heritage, 100);
  assert.equal(acharEntrada('Atlético-MG')?.heritage, 39);
  assert.equal(acharEntrada('Botafogo-RJ')?.heritage, 40);
  assert.equal(acharEntrada('Botafogo-SP')?.heritage, 29);
  assert.equal(acharEntrada('Atlético-PR')?.heritage, 32);
  assert.equal(acharEntrada('Manchester United')?.heritage, 100);
  assert.equal(acharEntrada('Clube Inexistente'), undefined);
});

test('ajustesDeTradicao: 20 clubes distintos -> 3 sobem, 5 descem, resto 0', () => {
  const times = Array.from({ length: 20 }, (_, i) => time('t' + i, 'Clube ' + i, 10 + i * 5, 1900 + i));
  const valores = Object.values(ajustesDeTradicao(times));
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
