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

import { mesclarOrdem, disputa3dDaSessao, aoReuniao, aoConfirmarOrdem, aoCobranca, ordemDaCpu } from '../3dMatch/disputa3d';
import { ordemAutomatica } from '../textSim/penaltyShootout';

test('proximaMensagem sem batedores nunca lanca: devolve abortar (relato "disputa sem proximo batedor")', () => {
  assert.deepStrictEqual(proximaMensagem([], [], [], 'casa'), { abortar: true, motivo: 'sem proximo batedor' });
  assert.deepStrictEqual(proximaMensagem([], ['sem-digitos'], ['p-2'], 'casa'), { abortar: true, motivo: 'sem proximo batedor' });
});

test('mesclarOrdem: os de campo trocam entre si nos lugares que ja tinham; os do banco ficam onde estavam', () => {
  const plantel = ['p-1', 'p-2', 'p-3', 'p-4', 'p-5'].map(id => jog(id, id));
  const r = mesclarOrdem(['p-1', 'p-4', 'p-2', 'p-5', 'p-3'], ['p-3', 'p-1', 'p-2'], plantel);
  assert.deepStrictEqual(r, ['p-3', 'p-4', 'p-1', 'p-5', 'p-2']);
});

test('ordemDaCpu: a automatica so com os em campo', () => {
  const campo = [jog('p-1', 'A'), jog('p-2', 'B')];
  assert.deepStrictEqual(ordemDaCpu(campo), ordemAutomatica(campo));
});

test('estado da disputa da sessao: sobrevive a desmontar o MatchDay; reenvios nao duplicam', () => {
  const e = disputa3dDaSessao('jogo-x#0');
  aoReuniao(e, { casa: [{ id: 1 }, { id: 2 }], fora: [{ id: 11 }, { id: 12 }], primeiro: 'casa' });
  // "Remontar": o mesmo objeto volta pela chave, com o pedido aberto (o modal reabre).
  assert.strictEqual(disputa3dDaSessao('jogo-x#0'), e);
  assert.deepStrictEqual(e.pedido, { casa: [1, 2], fora: [11, 12], primeiro: 'casa' });
  const ini = aoConfirmarOrdem(e, ['p-1', 'p-2'], ['p-11', 'p-12']);
  assert.deepStrictEqual(ini, { tipo: 'disputa_iniciar', ordemCasa: [1, 2], ordemFora: [11, 12], proxima: { lado: 'casa', jogadorId: 1 } });
  assert.strictEqual(e.pedido, null);
  // Um reenvio da reuniao depois de respondida nao reabre o modal.
  aoReuniao(e, { casa: [{ id: 1 }], fora: [{ id: 11 }], primeiro: 'casa', reenvio: true });
  assert.strictEqual(e.pedido, null);
  const idm = (_l: any, id: number) => 'p-' + id;
  const r0 = aoCobranca(e, { lado: 'casa', jogadorId: 1, resultado: 'gol', n: 0 }, idm);
  assert.deepStrictEqual(r0, { tipo: 'disputa_proxima', lado: 'fora', jogadorId: 11 });
  // O 3D reenviou a mesma cobranca (n = 0): nao soma, responde o mesmo.
  const r0b = aoCobranca(e, { lado: 'casa', jogadorId: 1, resultado: 'gol', n: 0 }, idm);
  assert.deepStrictEqual(r0b, r0);
  assert.strictEqual(e.cobrancas.length, 1);
  // Outra sessao (outro jogo / RESET): comeca do zero.
  assert.strictEqual(disputa3dDaSessao('jogo-x#1').cobrancas.length, 0);
});

test('aoConfirmarOrdem sem batedores: manda o aborto ao 3D em vez de lancar', () => {
  const e = disputa3dDaSessao('jogo-y#0');
  aoReuniao(e, { casa: [], fora: [], primeiro: 'fora' });
  assert.deepStrictEqual(aoConfirmarOrdem(e, [], []), { tipo: 'disputa_proxima', abortar: true, motivo: 'sem proximo batedor' });
});

import { mensagemDoCard } from '../3dMatch/disputa3d';
test('mensagemDoCard: disputa_card com os circulos da sessao (o primeiro das ordens)', () => {
  const e = disputa3dDaSessao('jogo-card#0');
  aoReuniao(e, { casa: [{ id: 1 }], fora: [{ id: 11 }], primeiro: 'fora' });
  aoConfirmarOrdem(e, ['p-1'], ['p-11']);
  const m0 = mensagemDoCard(e);
  assert.strictEqual(m0.tipo, 'disputa_card');
  assert.deepStrictEqual(m0.casa, ['cinza', 'cinza', 'cinza', 'cinza', 'cinza']);
  aoCobranca(e, { lado: 'fora', jogadorId: 11, resultado: 'defesa', n: 0 }, (_l, id) => 'p-' + id);
  aoCobranca(e, { lado: 'casa', jogadorId: 1, resultado: 'gol', n: 1 }, (_l, id) => 'p-' + id);
  const m = mensagemDoCard(e);
  assert.deepStrictEqual(m.fora.slice(0, 2), ['vermelho', 'cinza']);
  assert.deepStrictEqual(m.casa.slice(0, 2), ['verde', 'cinza']);
  assert.strictEqual(m.golsCasa, 1); assert.strictEqual(m.golsFora, 0);
});
