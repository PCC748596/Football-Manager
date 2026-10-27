import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { espacarCalendario, ESPACO_MINIMO_DIAS } from '../textSim/calendario';

const dia = (d: string) => Math.round(new Date(d + 'T00:00:00Z').getTime() / 86400000);
const fx = (id: string, date: string, h: string, a: string, type = 'LEAGUE', played = false): any => ({ id, week: 1, date, homeTeamId: h, awayTeamId: a, homeScore: 0, awayScore: 0, played, isFriendly: type === 'FRIENDLY', type, events: [] });
const violacoes = (fs_: any[]) => {
  const por = new Map<string, any[]>(); fs_.forEach(f => [f.homeTeamId, f.awayTeamId].forEach(id => { if (!por.has(id)) por.set(id, []); por.get(id)!.push(f); }));
  let n = 0; por.forEach(l => { l.sort((a, b) => a.date.localeCompare(b.date)); for (let i = 1; i < l.length; i++) if (dia(l[i].date) - dia(l[i - 1].date) < ESPACO_MINIMO_DIAS) n++; });
  return n;
};

test('liga dia 24, copa dia 26, liga dia 28: a copa mexe e o espaco fica de 3 dias ou mais', () => {
  const c = [fx('a', '2024-04-24', 'X', 'Y'), fx('c', '2024-04-26', 'X', 'Z', 'CUP'), fx('b', '2024-04-28', 'X', 'W')];
  assert.equal(violacoes(c), 2);
  const r = espacarCalendario(c, '2024-04-10');
  assert.equal(violacoes(r.fixtures), 0);
  assert.equal(r.fixtures.find(f => f.id === 'a')!.date, '2024-04-24');   // a liga nao mexe
  assert.equal(r.fixtures.find(f => f.id === 'b')!.date, '2024-04-28');
  assert.ok(r.mudancas.length === 1 && r.mudancas[0].id === 'c');
});

test('sem violacoes devolve o MESMO calendario (a referencia nao muda)', () => {
  const c = [fx('a', '2024-04-10', 'X', 'Y'), fx('b', '2024-04-14', 'X', 'Z')];
  assert.equal(espacarCalendario(c, '2024-04-01').fixtures, c);
});

test('o passado e o jogo de hoje nao se mexem', () => {
  const c = [fx('a', '2024-04-10', 'X', 'Y', 'LEAGUE', true), fx('b', '2024-04-11', 'X', 'Z', 'CUP', false)];
  const r = espacarCalendario(c, '2024-04-11');
  assert.equal(r.fixtures.find(f => f.id === 'b')!.date, '2024-04-11');
});

test('o save America-RN_Week2: depois de espacar nao ha clube com menos de 2 dias livres', () => {
  const f = path.resolve(process.cwd(), '../saves/America-RN_Week2.json');
  if (!fs.existsSync(f)) return;
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const antes = violacoes(j.fixtures);
  const r = espacarCalendario(j.fixtures, j.gameState.currentDate);
  assert.ok(antes > 0, 'o save tinha de ter o problema');
  assert.equal(violacoes(r.fixtures), 0);
});
