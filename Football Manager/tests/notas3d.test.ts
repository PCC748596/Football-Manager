import test from 'node:test';
import assert from 'node:assert';
import { notasDoMotor, aplicarResultado, ResultadoMotor } from '../3dMatch/simulador3dCliente';
import { Team, Player, Fixture } from '../types';

const eq = (id: string): Team => ({ id, name: id, lineup: ['p-1', 'p-2'] } as any);
const jog = (id: string, teamId: string, name: string): Player => ({ id, teamId, name } as any);
const casa = eq('c'), fora = eq('f');
const players = [jog('p-1', 'c', 'Ana Silva'), jog('p-2', 'c', 'Bia Costa'), jog('p-3', 'f', 'Caio Souza')];
const det = (nota: number, extra: any = {}) => ({ nota, tatico: 56, tecnico: 56, participacao: 56, disciplina: 56, minutos: 90, pos: 'CM', moc: false, def: 0, ...extra });

test('notasDoMotor liga o id numerico do motor ao id do manager, pelo lado da equipa', () => {
  const r = notasDoMotor({ '1': det(7.4, { equipa: 'TeamA', moc: true }), '3': det(5.2, { equipa: 'TeamB' }), '99': det(6, { equipa: 'TeamA' }) }, casa, fora, players);
  assert.strictEqual(r.playerRatings['p-1'], 7.4);
  assert.strictEqual(r.playerRatings['p-3'], 5.2);
  assert.strictEqual(r.playerRatings['99'], undefined, 'sem correspondencia: ignorado');
  assert.strictEqual(r.ratingDetalhes['p-1'].tecnico, 56);
  assert.strictEqual(r.motm, 'p-1');
});

test('o id de outro clube com o mesmo numero nao e confundido (so o lado da equipa conta)', () => {
  const r = notasDoMotor({ '1': det(8, { equipa: 'TeamB' }) }, casa, fora, [jog('p-1', 'c', 'Ana'), jog('p-1b-1', 'f', 'Zé')]);
  assert.strictEqual(r.playerRatings['p-1'], undefined);
  assert.strictEqual(r.playerRatings['p-1b-1'], 8);
});

test('aplicarResultado grava notas, detalhes e motm no fixture; sem notas continua igual', () => {
  const base: ResultadoMotor = { placar: { casa: 1, fora: 0 }, posse: { casa: 50, fora: 50 }, estatisticas: {}, golos: [], cartoes: [], eventos: [], relato: [] };
  const f = { id: 'x' } as Fixture;
  const sem = aplicarResultado(f, base, casa, fora, players);
  assert.strictEqual(sem.playerRatings, undefined);
  const com = aplicarResultado(f, { ...base, notas: { '2': det(8.1, { equipa: 'TeamA', moc: true }) } }, casa, fora, players);
  assert.strictEqual(com.playerRatings!['p-2'], 8.1);
  assert.strictEqual(com.motm, 'p-2');
  assert.ok(com.ratingDetalhes!['p-2']);
});
