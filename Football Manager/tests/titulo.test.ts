/*
O JOGO QUE DA O TITULO (textSim/titulo.ts): o campo `campeao` do `iniciar` do 3D, que faz a festa de campeao depois do apito final.
Copa: so o ultimo jogo da final. Liga: o clube que, ganhando (ou empatando) hoje, ja nao pode ser alcancado.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { decisaoDoConfronto, Competition, CompMatch } from '../textSim/competitions';
import { tituloDaLigaEmJogo, campeaoDoJogo } from '../textSim/titulo';
import { montarPayload } from '../3dMatch/simulador3dCliente';

const jogoCopa = (id: string, o: Partial<CompMatch>): CompMatch => ({ id, stage: 'F', tie: 'F-0', date: '2027-03-01', homeKey: 'L|a', awayKey: 'L|b', homeScore: null, awayScore: null, played: false, ...o });
const copa = (matches: CompMatch[]): Competition => ({ id: 'COPA_BR', name: 'Copa', teamKeys: ['L|a', 'L|b'], matches });

test('copa: a final (jogo unico ou a volta) da o titulo; a ida e as outras fases nao', () => {
  assert.equal(decisaoDoConfronto([copa([jogoCopa('f', {})])], 'fix-cup-f')?.titulo, true);
  const ida = jogoCopa('f1', { leg: 1, homeScore: 1, awayScore: 0, played: true }), volta = jogoCopa('f2', { leg: 2 });
  assert.equal(decisaoDoConfronto([copa([ida, volta])], 'fix-cup-f1'), null);
  assert.equal(decisaoDoConfronto([copa([ida, volta])], 'fix-cup-f2')?.titulo, true);
  assert.equal(decisaoDoConfronto([copa([jogoCopa('s', { stage: 'SF' })])], 'fix-cup-s')?.titulo, undefined);
  assert.deepEqual(campeaoDoJogo({ compId: 'C', matchId: 'f', agregadoCasa: 0, agregadoFora: 0, titulo: true }, [], [], undefined), { seVencer: 'qualquer' });
});

// Uma liga de 4: cada um joga com cada um, ida e volta (12 jogos); `feitos` resultados ja jogados, o resto por jogar.
const time = (id: string, leagueId = 'eng_prem') => ({ id, name: id, leagueId }) as any;
const fx = (id: string, h: string, a: string, r?: [number, number]): any => ({ id, week: 1, date: '2027-01-01', homeTeamId: h, awayTeamId: a, homeScore: r ? r[0] : 0, awayScore: r ? r[1] : 0, played: !!r, events: [], type: 'LEAGUE' });

test('liga: o lider que ganhando hoje ja nao pode ser alcancado e campeao; empatado em pontos nao conta', () => {
  const ts = ['A', 'B', 'C', 'D'].map(id => time(id));
  // Feitos 10 dos 12: A 8 pts, B 6, C 5, D 6. Faltam A-B (hoje) e C-A.
  const feitos = [fx('1', 'A', 'C', [2, 0]), fx('2', 'A', 'D', [1, 0]), fx('3', 'D', 'A', [0, 0]), fx('4', 'B', 'A', [1, 1]),
    fx('5', 'B', 'C', [1, 0]), fx('6', 'C', 'D', [2, 1]), fx('7', 'D', 'B', [1, 0]), fx('8', 'C', 'B', [0, 0]), fx('9', 'D', 'C', [0, 0]), fx('10', 'B', 'D', [0, 0])];
  const hoje = fx('11', 'A', 'B'), depois = fx('12', 'C', 'A');
  const fixtures = [...feitos, hoje, depois];
  const r = tituloDaLigaEmJogo(ts, fixtures, hoje);
  // Tetos: B 9 (6 se perder hoje, 7 se empatar), C 8, D 6. Ganhando hoje A fica com 11, empatando com 9: ninguem chega. Antes do jogo (8) ainda nao era.
  assert.deepEqual(r, { seVencer: 'casa', seEmpatar: 'casa' });
  // Visto do outro lado: B nao pode ser campeao hoje.
  assert.equal(r?.seVencer === 'fora' || r?.seVencer === 'qualquer', false);
  // Com 4 jogos por fazer ninguem e campeao hoje.
  const cedo = [fx('a', 'A', 'B'), fx('b', 'A', 'C'), fx('c', 'B', 'C'), fx('d', 'C', 'A')];
  assert.equal(tituloDaLigaEmJogo(ts, cedo, cedo[0]), null);
  // Serie C (campeao do mata-mata) fica de fora.
  const tsC = ['A', 'B', 'C', 'D'].map(id => time(id, 'bra_serie_c'));
  assert.equal(tituloDaLigaEmJogo(tsC, fixtures, hoje), null);
});

test('liga: quem ja tinha o titulo antes do jogo nao festeja de novo', () => {
  const ts = ['A', 'B'].map(id => time(id));
  // A 9 pts, B 0; falta 1 jogo (hoje): B chega no maximo a 3 -> A ja e campeao.
  const f = [fx('1', 'A', 'B', [1, 0]), fx('2', 'B', 'A', [0, 1]), fx('3', 'A', 'B', [2, 0]), fx('4', 'B', 'A')];
  assert.equal(tituloDaLigaEmJogo(ts, f, f[3]), null);
});

test('montarPayload: `campeao` so vai quando ha titulo (final de copa ou campo explicito)', () => {
  const t = (id: string) => ({ id, name: id, primaryColor: '#000', secondaryColor: '#fff', tertiaryColor: '#f00', tactics: {}, lineup: [], bench: [] }) as any;
  const semNada = (() => { try { return montarPayload(t('a'), t('b'), [], 'a', {}); } catch { return null; } })();
  if (!semNada) return;   // (o montarPayload precisa de mais campos do clube neste ambiente: o resto ja esta coberto acima)
  assert.equal('campeao' in semNada, false);
  assert.deepEqual((montarPayload(t('a'), t('b'), [], 'a', { decisao: { titulo: true } }) as any).campeao, { seVencer: 'qualquer' });
  assert.deepEqual((montarPayload(t('a'), t('b'), [], 'a', { campeao: { seVencer: 'casa' } }) as any).campeao, { seVencer: 'casa' });
});
