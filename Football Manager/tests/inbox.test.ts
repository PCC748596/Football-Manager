import test from 'node:test';
import assert from 'node:assert/strict';
import { adicionar, chavesDe, avisosDoDia, boasVindas, avisoDeLiberados, LIMITE_INBOX, EntradaAvisos, MensagemInbox } from '../textSim/inbox';
import { processarContratos } from '../textSim/contracts';
import { generateLeagueData } from '../textSim/dataGenerator';

const base = (over: Partial<EntradaAvisos> = {}): EntradaAvisos => ({
  hoje: '2024-04-01', lang: 'EN', elenco: [], jogos: [], jovens: [], mesDoRelatorio: '', caixa: 5_000_000, folhaSemanal: 100_000, formatar: n => '$' + n, janelaAberta: false, ...over
});
const jogador = (id: string, fim: string, extra: any = {}) => ({ id, name: 'Player ' + id, position: 'ST', skill: 70, age: 25, fitness: 90, contract: { start: '2022-01-01', end: fim, years: 3 }, ...extra }) as any;
const jogoPadrao = { casa: true, jogado: false, golsPro: 0, golsContra: 0, derbi: false };

test('boas-vindas: 5 e-mails, um por setor, nos dois idiomas', () => {
  for (const lang of ['EN', 'PT'] as const) {
    const m = boasVindas({ hoje: '2024-04-01', lang, treinador: 'Miguel Silva', clube: 'Guaporé-RO', estadio: 'Ninho', cidade: 'Rolim', liga: 'Série D', forca: 60, posicaoNaForca: 3, clubesNaLiga: 20, caixa: '$1M', tamanhoDoElenco: 28, contratosEmAtencao: 4 });
    assert.equal(m.length, 5);
    assert.deepEqual(new Set(m.map(x => x.categoria)), new Set(['BOARD', 'SQUAD', 'TRAINING', 'FINANCE', 'SCOUTING']));
    assert.ok(m.every(x => x.corpo.length > 40 && x.assunto && !x.lida));
    assert.ok(m[0].corpo.includes('Guaporé-RO'));
  }
});

test('dedupe: a mesma razao gera uma mensagem so, mesmo reprocessando o dia', () => {
  const e = base({ elenco: [jogador('a', '2024-09-01'), jogador('b', '2025-01-15')] });   // critico (5 meses) e atencao (9 meses e meio)
  let inbox: MensagemInbox[] = [];
  inbox = adicionar(inbox, avisosDoDia(e));
  const n = inbox.length;
  assert.ok(n >= 2);
  inbox = adicionar(inbox, avisosDoDia(e));
  inbox = adicionar(inbox, avisosDoDia(e));
  assert.equal(inbox.length, n, 'nada novo ao reprocessar');
  const crit = inbox.find(m => m.keys.includes('contract|CRITICO|a'))!;
  assert.ok(crit.alta && crit.categoria === 'CONTRACT');
  inbox = adicionar(inbox, avisosDoDia({ ...e, hoje: '2024-04-03' }));
  assert.equal(inbox.length, n, 'mesmos estados dois dias depois: nada novo');
});

test('contratos: quem entra no estado critico depois gera um aviso novo', () => {
  const e = base({ elenco: [jogador('a', '2025-02-01')] });
  let inbox = adicionar([], avisosDoDia(e));
  assert.ok(inbox.some(m => m.keys.includes('contract|ATENCAO|a')) && !inbox.some(m => m.keys.includes('contract|CRITICO|a')));
  inbox = adicionar(inbox, avisosDoDia({ ...e, hoje: '2024-08-02' }));
  assert.ok(inbox.some(m => m.keys.includes('contract|CRITICO|a')));
});

test('jogos importantes: aviso 2 dias antes de classico ou copa; resultado depois do jogo', () => {
  const jogos = [
    { ...jogoPadrao, id: 'f1', date: '2024-04-03', adversario: 'Rival', derbi: true },
    { ...jogoPadrao, id: 'f2', date: '2024-04-03', adversario: 'Outro', casa: false },
    { ...jogoPadrao, id: 'f3', date: '2024-04-03', adversario: 'Copeiro', copa: 'LIBERT-16' }
  ];
  const previews = avisosDoDia(base({ jogos })).filter(m => m.keys[0].startsWith('preview|'));
  assert.deepEqual(previews.map(m => m.keys[0]).sort(), ['preview|f1', 'preview|f3'], 'so classico e copa');
  assert.ok(previews.every(m => m.alta && m.categoria === 'MATCH'));
  const depois = avisosDoDia(base({ hoje: '2024-04-03', jogos: jogos.map(j => ({ ...j, jogado: true, golsPro: 2, golsContra: 1 })) }));
  const res = depois.filter(m => m.keys[0].startsWith('result|'));
  assert.equal(res.length, 3);
  assert.ok(res[0].assunto.includes('Win'));
  const antigos = avisosDoDia(base({ hoje: '2024-06-30', jogos: jogos.map(j => ({ ...j, jogado: true })) }));
  assert.equal(antigos.filter(m => m.keys[0].startsWith('result|')).length, 0, 'jogos antigos nao inundam a caixa');
});

test('treino e fisio: lesao (uma vez) e elenco cansado na vespera do jogo', () => {
  const lesionado = jogador('l', '2026-01-01', { injury: { type: 'Hamstring', daysOut: 20, severity: 'SEVERE' } });
  const e = base({ elenco: [lesionado] });
  let inbox = adicionar([], avisosDoDia(e));
  assert.ok(inbox.some(m => m.categoria === 'TRAINING' && m.alta));
  const n = inbox.length;
  inbox = adicionar(inbox, avisosDoDia({ ...e, hoje: '2024-04-02', elenco: [{ ...lesionado, injury: { type: 'Hamstring', daysOut: 19, severity: 'SEVERE' } }] }));
  assert.equal(inbox.length, n, 'a mesma lesao nao avisa de novo no dia seguinte');
  const cansados = avisosDoDia(base({ elenco: [jogador('x', '2026-01-01', { fitness: 50 })], jogos: [{ ...jogoPadrao, id: 'g', date: '2024-04-02', adversario: 'Z' }] }));
  assert.ok(cansados.some(m => m.keys[0] === 'fitness|g'));
});

test('olheiros (base), financas e janela de transferencias', () => {
  const jovens = [{ nome: 'A', posicao: 'ST', delta: 2, estrelas: 4, ovr: 61, mudou: true }, { nome: 'B', posicao: 'GK', delta: 0, estrelas: 2, ovr: 55, mudou: false }];
  const a = avisosDoDia(base({ jovens, mesDoRelatorio: '2024-05' }));
  assert.ok(a.some(m => m.keys[0] === 'scout|2024-05' && m.categoria === 'SCOUTING' && m.corpo.includes('A')));
  assert.ok(avisosDoDia(base({ hoje: '2024-05-01' })).some(m => m.keys[0] === 'finance|2024-05'));
  assert.ok(!avisosDoDia(base({ hoje: '2024-05-02' })).some(m => m.keys[0] === 'finance|2024-05'));
  const apertado = avisosDoDia(base({ caixa: 300_000, folhaSemanal: 100_000 }));
  assert.ok(apertado.some(m => m.keys[0] === 'finance-low|2024-04' && m.alta));
  assert.ok(avisosDoDia(base({ hoje: '2024-07-01' })).some(m => m.categoria === 'TRANSFER'));
  assert.ok(avisosDoDia(base({ hoje: '2025-02-22' })).some(m => m.keys[0] === 'window-close|2025-02-22'));
});

test('limite: a caixa nunca passa do maximo (descarta as lidas mais antigas)', () => {
  let inbox: MensagemInbox[] = [];
  for (let i = 0; i < LIMITE_INBOX + 50; i++) {
    const [m] = avisoDeLiberados('2024-01-' + String((i % 28) + 1).padStart(2, '0'), 'EN', [jogador('p' + i, '2024-01-01')]);
    inbox = adicionar(inbox, [{ ...m, lida: i < 100 }]);
  }
  assert.equal(inbox.length, LIMITE_INBOX);
});

test('simulacao de 2 anos com dados reais: sem enxurrada nem duplicacao', () => {
  const { teams, players } = generateLeagueData('45', 'bra_serie_a') as any;
  const dono = teams[0].id;
  let jog = processarContratos(players, '2024-04-01', dono).jogadores as any[];
  let inbox: MensagemInbox[] = [];
  for (let d = 0; d <= 730; d++) {
    const hoje = new Date(Date.UTC(2024, 3, 1 + d, 12)).toISOString().slice(0, 10);
    const r = processarContratos(jog, hoje, dono);
    if (r.liberados.length) inbox = adicionar(inbox, avisoDeLiberados(hoje, 'PT', r.jogadores.filter(p => r.liberados.includes(p.id))));
    jog = r.jogadores;
    inbox = adicionar(inbox, avisosDoDia(base({ hoje, lang: 'PT', elenco: jog.filter(p => p.teamId === dono) }), chavesDe(inbox)));
  }
  const chaves = inbox.flatMap(m => m.keys);
  assert.equal(new Set(chaves).size, chaves.length, 'nenhuma razao repetida');
  const porCat: Record<string, number> = {};
  inbox.forEach(m => { porCat[m.categoria] = (porCat[m.categoria] || 0) + 1; });
  console.log('mensagens em 2 anos:', inbox.length, JSON.stringify(porCat));
  assert.ok(inbox.length <= LIMITE_INBOX);
  assert.ok(inbox.every(m => m.corpo && m.assunto));
});
