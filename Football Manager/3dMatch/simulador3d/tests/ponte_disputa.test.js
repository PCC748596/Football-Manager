/*
A PONTE e a DISPUTA DE PENALTIS (js/narracao/ponte.js + js/disputa_penaltis.js): o `iniciar` do manager leva a `decisao` (so no 3D visivel); as mensagens `disputa_iniciar` e
`disputa_proxima` da app chegam ao `DisputaPenaltis`; o ESC durante a disputa chama `cancelar`; e um `iniciar` novo desfaz uma disputa que ficou a meio.
Corre com: node tests/ponte_disputa.test.js
*/
require('../tools/headless/harness.js');
const { FORM, equipaMgr } = require('../tools/headless/fixtures_manager.js');

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
const enviadas = [];
Ponte.saida = (m) => enviadas.push(JSON.parse(JSON.stringify(m)));
const msgIniciar = (extra) => Object.assign({
    para: 'simulador3d', tipo: 'iniciar', ritmo: 'real', taticaDe: 'casa',
    casa: { equipa: c.equipa, jogadoresPorId: c.porId, formacao: { nome: '4-3-3', slots: FORM['4-3-3'] } },
    fora: { equipa: f.equipa, jogadoresPorId: f.porId, formacao: { nome: '3-5-2', slots: FORM['3-5-2'] } }
}, extra);

console.log('1 — iniciar com decisao: so o 3D visivel a guarda no Match');
const dec = { agregadoCasa: 1, agregadoFora: 0 };
Ponte.aoMensagem(msgIniciar({ modo: 'visivel', decisao: dec }));
verifica(Match.decisao && Match.decisao.agregadoCasa === 1 && Match.decisao.agregadoFora === 0, 'visivel: Match.decisao = a decisao do manager', 'Match.decisao: ' + JSON.stringify(Match.decisao));
verifica(Match.disputa === null, 'Match.disputa limpa', 'Match.disputa ficou ' + Match.disputa);
Ponte.parar();
Ponte.aoMensagem(msgIniciar({ modo: 'visivel' }));
verifica(Match.decisao === null, 'visivel sem decisao: Match.decisao = null', 'Match.decisao: ' + JSON.stringify(Match.decisao));
Ponte.parar();
Ponte.aoMensagem(msgIniciar({ modo: 'oculto', ritmo: 'real', decisao: dec }));
verifica(Match.decisao === null, 'oculto: ignora a decisao (nunca encena penaltis)', 'Match.decisao no oculto: ' + JSON.stringify(Match.decisao));
Ponte.parar();

console.log('2 — disputa_iniciar / disputa_proxima chegam ao DisputaPenaltis');
const chamadas = [];
const orig = { r: DisputaPenaltis.receberOrdens, p: DisputaPenaltis.receberProxima };
DisputaPenaltis.receberOrdens = (a, b, p) => chamadas.push({ f: 'ordens', a, b, p });
DisputaPenaltis.receberProxima = (m) => chamadas.push({ f: 'proxima', m });
Ponte.aoMensagem({ para: 'simulador3d', tipo: 'disputa_iniciar', ordemCasa: [1, 2], ordemFora: [3, 4], proxima: { lado: 'casa', jogadorId: 1 } });
Ponte.aoMensagem({ para: 'simulador3d', tipo: 'disputa_proxima', lado: 'fora', jogadorId: 3 });
Ponte.aoMensagem({ para: 'simulador3d', tipo: 'disputa_proxima', fim: true, vencedor: 'casa', pens: [3, 2] });
verifica(chamadas.length === 3 && chamadas[0].f === 'ordens' && chamadas[0].a.join() === '1,2' && chamadas[0].b.join() === '3,4' && chamadas[0].p.jogadorId === 1, 'disputa_iniciar -> receberOrdens(ordemCasa, ordemFora, proxima)', 'receberOrdens: ' + JSON.stringify(chamadas[0]));
verifica(chamadas[1] && chamadas[1].f === 'proxima' && chamadas[1].m.lado === 'fora' && chamadas[2].m.fim === true && chamadas[2].m.pens[0] === 3, 'disputa_proxima -> receberProxima(mensagem inteira)', 'receberProxima: ' + JSON.stringify(chamadas.slice(1)));
DisputaPenaltis.receberOrdens = orig.r; DisputaPenaltis.receberProxima = orig.p;
verifica(!enviadas.some(m => m.tipo === 'erro'), 'nenhum erro enviado ao manager', 'erro: ' + JSON.stringify(enviadas.find(m => m.tipo === 'erro')));

console.log('3 — ESC durante a disputa chama cancelar');
let cancelou = 0;
const cancelarOrig = DisputaPenaltis.cancelar;
DisputaPenaltis.cancelar = () => { cancelou++; };
DisputaPenaltis.activa = true;
Ponte.aoMensagem({ para: 'simulador3d', tipo: 'esc' });
DisputaPenaltis.activa = false;
Ponte.aoMensagem({ para: 'simulador3d', tipo: 'esc' });
DisputaPenaltis.cancelar = cancelarOrig;
verifica(cancelou === 1, 'esc com a disputa activa -> cancelar (uma vez; sem disputa nao chama)', 'cancelar chamado ' + cancelou + ' vez(es)');

console.log('4 — um iniciar novo desfaz uma disputa que ficou a meio');
DisputaPenaltis.activa = true; DisputaPenaltis.fase = 'ORDEM'; Match.disputa = DisputaPenaltis;
Ponte.aoMensagem(msgIniciar({ modo: 'visivel' }));
verifica(!DisputaPenaltis.activa && DisputaPenaltis.fase === null && Match.disputa === null, 'activa/fase/Match.disputa limpos', `activa=${DisputaPenaltis.activa} fase=${DisputaPenaltis.fase} disputa=${Match.disputa}`);
Ponte.parar();

console.log('5 — a app manda um batedor que o 3D nao conhece: a disputa aborta (o contrato) e o jogo acaba');
DisputaPenaltis.activa = true; DisputaPenaltis.fase = 'ORDEM'; Match.disputa = DisputaPenaltis;
DisputaPenaltis.receberOrdens(Match.players.map(p => p.id), Match.opponents.map(p => p.id), { lado: 'casa', jogadorId: 987654321 });
verifica(!DisputaPenaltis.activa && Match.disputa === null && Match.state === 'FIM_DE_JOGO', 'batedor desconhecido: aborta e encerra o jogo', `activa=${DisputaPenaltis.activa} estado=${Match.state}`);
Ponte.parar();

if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\ntudo certo');
process.exit(0);   // o harness deixa handles abertos: sai-se explicitamente (como os outros testes)
