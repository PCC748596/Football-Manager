import test from 'node:test';
import assert from 'node:assert';
import { decisaoDoConfronto, Competition, CompMatch } from '../textSim/competitions';
import { idDoMotor, emCampo, ordemParaOsEmCampo, proximaMensagem } from '../3dMatch/disputa3d';
import { Cobranca } from '../textSim/penaltyShootout';
import { Player } from '../types';

const jogo = (id: string, o: Partial<CompMatch>): CompMatch => ({ id, stage: 'QF', tie: 'T1', date: '2027-03-01', homeKey: 'L|a', awayKey: 'L|b', homeScore: null, awayScore: null, played: false, ...o });
const comp = (matches: CompMatch[]): Competition => ({ id: 'COPA_BR', name: 'Copa', teamKeys: ['L|a', 'L|b'], matches });

test('jogo unico: decisao sem agregado anterior', () => {
  const d = decisaoDoConfronto([comp([jogo('m1', {})])], 'fix-cup-m1');
  assert.deepStrictEqual(d, { compId: 'COPA_BR', matchId: 'm1', agregadoCasa: 0, agregadoFora: 0 });
});

test('ida e volta: so a volta decide, e leva o agregado da ida (por equipa, nao por lado)', () => {
  const ida = jogo('m1', { leg: 1, homeKey: 'L|b', awayKey: 'L|a', homeScore: 2, awayScore: 1, played: true });
  const volta = jogo('m2', { leg: 2, homeKey: 'L|a', awayKey: 'L|b' });
  const c = [comp([ida, volta])];
  assert.strictEqual(decisaoDoConfronto(c, 'fix-cup-m1'), null);
  assert.deepStrictEqual(decisaoDoConfronto(c, 'fix-cup-m2'), { compId: 'COPA_BR', matchId: 'm2', agregadoCasa: 1, agregadoFora: 2 });
});

test('fase de grupos (sem tie) e jogo desconhecido: sem decisao', () => {
  assert.strictEqual(decisaoDoConfronto([comp([jogo('g1', { tie: undefined })])], 'fix-cup-g1'), null);
  assert.strictEqual(decisaoDoConfronto([comp([jogo('m1', {})])], 'fix-cup-zzz'), null);
  assert.strictEqual(decisaoDoConfronto(null, 'fix-cup-m1'), null);
});

test('idDoMotor le os digitos finais', () => {
  assert.strictEqual(idDoMotor('p-269063'), 269063);
  assert.strictEqual(idDoMotor('sem-numero'), null);
});

const jog = (id: string, name: string, teamId = 't1', position = 'CM'): Player => ({ id, name, teamId, position, skill: 70, attributes: {} } as any as Player);

test('emCampo: so os do motor, na ordem pedida', () => {
  const todos = [jog('p-1', 'A'), jog('p-2', 'B'), jog('p-3', 'C')];
  assert.deepStrictEqual(emCampo([3, 1, 99], todos).map(p => p.id), ['p-3', 'p-1']);
});

test('ordemParaOsEmCampo: tira quem nao esta em campo e poe no fim quem falta', () => {
  const campo = [jog('p-1', 'A'), jog('p-2', 'B'), jog('p-3', 'C')];
  const o = ordemParaOsEmCampo(['p-3', 'p-9', 'p-1'], campo);
  assert.deepStrictEqual(o.slice(0, 2), ['p-3', 'p-1']);
  assert.strictEqual(o.length, 3);
  assert.ok(o.includes('p-2'));
});

test('proximaMensagem: continua enquanto nao ha vencedor, e fecha com o placar', () => {
  const ordemC = ['p-1', 'p-2'], ordemF = ['p-11', 'p-12'];
  const m0 = proximaMensagem([], ordemC, ordemF, 'casa');
  assert.deepStrictEqual(m0, { lado: 'casa', jogadorId: 1 });
  const cobr: Cobranca[] = [
    { lado: 'casa', jogadorId: 'p-1', gol: true }, { lado: 'fora', jogadorId: 'p-11', gol: false },
    { lado: 'casa', jogadorId: 'p-2', gol: true }, { lado: 'fora', jogadorId: 'p-12', gol: false },
    { lado: 'casa', jogadorId: 'p-1', gol: true }, { lado: 'fora', jogadorId: 'p-11', gol: false }
  ];
  const fim = proximaMensagem(cobr, ordemC, ordemF, 'casa');
  assert.deepStrictEqual(fim, { fim: true, vencedor: 'casa', pens: [3, 0] });
});
