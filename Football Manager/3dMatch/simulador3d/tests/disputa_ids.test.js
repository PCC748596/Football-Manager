/*
O CONTRATO DOS IDS DA DISPUTA DE PENALTIS com o manager. O `FootballPlayer.id` do motor e o LUGAR (0..10 TeamA, 20..30 TeamB; quem entra herda o do que sai); o id que a app
conhece e o real (`skills.id` = AdaptadorManager.idReal('p-269429')). Com equipas REAIS do manager (Ponte.aoMensagem('iniciar')), incluindo um jogador que entrou do banco:
  . `disputa_reuniao` leva, para cada jogador em campo, o id real dele (o da escalacao do manager);
  . `disputa_iniciar` com esses ids encontra o batedor (jogadorPorId) e a cobranca e encenada;
  . `disputa_cobranca` devolve o mesmo id real.
Os testes antigos ecoavam os ids do proprio 3D e nao viam a falha (relato: "disputa sem proximo batedor").
Corre com: node tests/disputa_ids.test.js
*/
require('../tools/headless/harness.js');
const { FORM, equipaMgr, paraManager } = require('../tools/headless/fixtures_manager.js');

let falhas = 0;
const ok = m => console.log('  . ' + m);
const erro = m => { console.log('  X ' + m); falhas++; };
const verifica = (cond, bom, mau) => { if (cond) ok(bom); else erro(mau); };

if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = false;
Match.init(new THREE.Scene());
Officials.arbitro = null; Officials.init(new THREE.Scene());
const c = equipaMgr('Flamengo-RJ', FORM['4-3-3']);
const f = equipaMgr('Palmeiras-SP', FORM['3-5-2']);
Ponte.saida = () => {};
Ponte.aoMensagem({ para: 'simulador3d', tipo: 'iniciar', ritmo: 'real', taticaDe: 'casa', modo: 'visivel', decisao: { agregadoCasa: 0, agregadoFora: 0 },
    casa: { equipa: c.equipa, jogadoresPorId: c.porId, formacao: { nome: '4-3-3', slots: FORM['4-3-3'] } },
    fora: { equipa: f.equipa, jogadoresPorId: f.porId, formacao: { nome: '3-5-2', slots: FORM['3-5-2'] } } });
const enviadas = [];
Ponte.enviar = (tipo, dados) => enviadas.push({ tipo, dados: JSON.parse(JSON.stringify(dados)) });

// A escalacao do manager (ids 'p-...') de cada lado, que vai mudar com a substituicao.
const lineupCasa = c.equipa.lineup.slice(), lineupFora = f.equipa.lineup.slice();

console.log('1 — um jogador entra do banco (herda o id de LUGAR de quem sai)');
const real = SquadsData.equipas.find(e => e.nome === 'Flamengo-RJ');
const banco = real.plantel.find(j => !lineupCasa.includes('p-' + j.id) && j.pos !== 'GK');
const mp = paraManager(banco);
const iSai = 9;   // o ST
const P = Match.players.find(p => p.skills && p.skills.id === AdaptadorManager.idReal(lineupCasa[iSai]));
const N = Match.executarSubstituicao({ lado: 'casa', sai: lineupCasa[iSai], entra: mp.id, jogador: mp }, P, Match.players, null);
lineupCasa[iSai] = mp.id;
verifica(N && N.id === P.id && N.skills.id === AdaptadorManager.idReal(mp.id), `entrou ${mp.id} com o lugar ${N && N.id} (o id de motor do que saiu)`, 'a substituicao nao correu como esperado');

console.log('2 — disputa_reuniao: os ids sao os reais (os da escalacao do manager)');
DisputaPenaltis.iniciar(); DisputaPenaltis._pedirOrdem();
const r = enviadas.find(m => m.tipo === 'disputa_reuniao');
const idsCasa = r.dados.casa.map(j => j.id).sort((a, b) => a - b), idsFora = r.dados.fora.map(j => j.id).sort((a, b) => a - b);
const esperadoCasa = lineupCasa.map(id => AdaptadorManager.idReal(id)).sort((a, b) => a - b);
const esperadoFora = lineupFora.map(id => AdaptadorManager.idReal(id)).sort((a, b) => a - b);
verifica(JSON.stringify(idsCasa) === JSON.stringify(esperadoCasa), 'casa: os 11 ids reais (com o que entrou)', 'casa: ' + JSON.stringify(idsCasa) + ' esperado ' + JSON.stringify(esperadoCasa));
verifica(JSON.stringify(idsFora) === JSON.stringify(esperadoFora), 'fora: os 11 ids reais', 'fora: ' + JSON.stringify(idsFora) + ' esperado ' + JSON.stringify(esperadoFora));
verifica(r.dados.casa.some(j => j.id === AdaptadorManager.idReal(mp.id)), 'o que entrou do banco esta na lista com o id dele', 'o que entrou nao esta na lista');
verifica(r.dados.casa.filter(j => j.gk).length === 1 && r.dados.fora.filter(j => j.gk).length === 1, 'um goleiro em cada lista', 'goleiros: ' + r.dados.casa.filter(j => j.gk).length + '/' + r.dados.fora.filter(j => j.gk).length);

console.log('3 — disputa_iniciar com os ids reais: o batedor e encontrado (o que entrou do banco bate primeiro)');
const idEntrou = AdaptadorManager.idReal(mp.id);
DisputaPenaltis.fase = 'ORDEM';
Ponte.aoMensagem({ para: 'simulador3d', tipo: 'disputa_iniciar', ordemCasa: [idEntrou].concat(esperadoCasa.filter(x => x !== idEntrou)), ordemFora: esperadoFora, proxima: { lado: 'casa', jogadorId: idEntrou } });
verifica(DisputaPenaltis.activa && DisputaPenaltis.fase === 'PREPARO' && DisputaPenaltis.atual && DisputaPenaltis.atual.batedor === N, 'PREPARO com o batedor certo (jogadorPorId)', `activa=${DisputaPenaltis.activa} fase=${DisputaPenaltis.fase} batedor=${DisputaPenaltis.atual && DisputaPenaltis.atual.batedor && DisputaPenaltis.atual.batedor.skills.id}`);
verifica(DisputaPenaltis.jogadorPorId('fora', esperadoFora[0]) !== null, 'fora: jogadorPorId encontra pelo id real', 'fora: jogadorPorId nao encontra');

console.log('4 — disputa_cobranca devolve o id real do batedor');
DisputaPenaltis._aoFimDaCobranca('gol');
const cob = enviadas.find(m => m.tipo === 'disputa_cobranca');
verifica(cob && cob.dados.jogadorId === idEntrou && cob.dados.lado === 'casa', 'jogadorId = ' + idEntrou, 'disputa_cobranca: ' + JSON.stringify(cob && cob.dados));
Ponte.aoMensagem({ para: 'simulador3d', tipo: 'disputa_proxima', lado: 'fora', jogadorId: esperadoFora[3] });
verifica(DisputaPenaltis.fase === 'PREPARO' && DisputaPenaltis.atual.batedor.skills.id === esperadoFora[3], 'disputa_proxima com id real: o batedor seguinte e encontrado', 'fase ' + DisputaPenaltis.fase);
DisputaPenaltis._libertar();

if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\ntudo certo');
process.exit(0);
