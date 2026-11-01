/*
A COBRANCA DA DISPUTA (js/disputa_penaltis.js + Match.iniciarPenaltiDaDisputa): o motor do penalti em jogo serve a disputa. O batedor e o goleiro escolhem-se de fora;
o resultado vem da fisica (gol, defesa, trave, fora); o placar e o relogio nao mexem; os outros 20 ficam onde estao.
Corre com: node tests/disputa_cobranca.test.js
*/
const assert = require('assert');
require('../tools/headless/harness.js');

const dt = 1 / 60;
let falhas = 0;
const ok = m => console.log('  . ' + m);
const erro = m => { console.log('  X ' + m); falhas++; };
const verifica = (cond, bom, mau) => { if (cond) ok(bom); else erro(mau); };

if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = false;
const cena = new THREE.Scene();
Match.init(cena);
Officials.init(cena);
Match.resetPlay('TeamA');
for (let i = 0; i < 120; i++) Match.update(dt);

const gk = (lista) => lista.find(p => p.role === 'gk');
const batedoresA = Match.players.filter(p => p.role !== 'gk');
// Quem esta em coreografia fica quieto (o `passoDoJogador` da disputa): todos menos o batedor e o goleiro.
const quieto = () => ({ wps: [], i: 0, chegou: true, vel: 0, yaw: 0, olhar: { x: 0, z: 0 } });
const congelarOutros = (batedor, goleiro) => Match.players.concat(Match.opponents).forEach(p => { p.disputaOrdem = (p === batedor || p === goleiro) ? null : quieto(); });

console.log('1 — 30 cobrancas seguidas: sempre um resultado valido, sem travar');
// Sorteio deterministico (mulberry32): a distribuicao de golos/defesas deixa de depender da sorte de cada corrida, e o teste continua a poder falhar se o motor mudar.
let semente = 20261031;
Math.random = () => { semente = (semente + 0x6D2B79F5) | 0; let t = Math.imul(semente ^ (semente >>> 15), 1 | semente); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ver = { gol: 0, defesa: 0, trave: 0, fora: 0 };
Match.placarA = 0; Match.placarB = 0; Match.tempoDeJogo = 1000;
Match.disputa = DisputaPenaltis; DisputaPenaltis.activa = true;
for (let k = 0; k < 30; k++) {
    const batedor = batedoresA[k % batedoresA.length];
    const goleiro = gk(Match.opponents);
    let resultado = null;
    DisputaPenaltis.sinalZ = (k % 2) ? 1 : -1;
    congelarOutros(batedor, goleiro);
    DisputaPenaltis.cobrar('casa', batedor, goleiro, (r) => { resultado = r; });
    let n = 0;
    while (resultado === null && n < 60 * 25) { Match.update(dt); n++; }
    verifica(resultado !== null, `cobranca ${k + 1}: ${resultado} (${(n * dt).toFixed(1)} s)`, `cobranca ${k + 1} nao acabou em 25 s`);
    if (resultado !== null) ver[resultado] = (ver[resultado] || 0) + 1;
    assert.ok(['gol', 'defesa', 'trave', 'fora'].includes(resultado), 'resultado invalido: ' + resultado);
    Match.mudarEstado('DISPUTA', 'teste');
}
console.log('   distribuicao:', JSON.stringify(ver));
verifica(ver.gol >= 1 && ver.gol < 30, 'ha golos e nem tudo e golo', 'distribuicao estranha: ' + JSON.stringify(ver));

console.log('2 — o placar e o relogio nao mexem durante a disputa');
verifica(Match.placarA === 0 && Match.placarB === 0, 'placar 0-0', `placar mexeu: ${Match.placarA}-${Match.placarB}`);
verifica(Match.tempoDeJogo === 1000, 'relogio parado', `relogio mexeu: ${Match.tempoDeJogo}`);

console.log('3 — os outros jogadores ficam onde estao quando tem disputaOrdem');
const batedor = batedoresA[0];
const goleiro = gk(Match.opponents);
congelarOutros(batedor, goleiro);
const posOutros3 = Match.players.concat(Match.opponents).filter(p => p !== batedor && p !== goleiro).map(p => ({ p, x: p.model.position.x, z: p.model.position.z }));
let r2 = null;
DisputaPenaltis.sinalZ = 1;
DisputaPenaltis.cobrar('casa', batedor, goleiro, (r) => { r2 = r; });
for (let n = 0; r2 === null && n < 60 * 25; n++) Match.update(dt);
const mexeu = posOutros3.filter(o => Math.hypot(o.p.model.position.x - o.x, o.p.model.position.z - o.z) > 0.01);
verifica(mexeu.length === 0, 'os que estao em coreografia nao se mexeram', `${mexeu.length} jogadores mexeram-se`);

console.log('4 — o goleiro tambem pode bater (o papel volta ao fim)');
const gkA = gk(Match.players);
congelarOutros(gkA, gk(Match.opponents));
let r3 = null;
DisputaPenaltis.sinalZ = 1;
DisputaPenaltis.cobrar('casa', gkA, gk(Match.opponents), (r) => { r3 = r; });
for (let n = 0; r3 === null && n < 60 * 25; n++) Match.update(dt);
verifica(r3 !== null, `o goleiro bateu: ${r3}`, 'a cobranca do goleiro nao acabou');
// O resultado chega logo; o lance ainda corre o DESFECHO (DisputaModel.pausa.desfecho*) e so no fim dele o papel volta.
for (let n = 0; DisputaPenaltis._cobranca && n < 60 * 10; n++) Match.update(dt);
verifica(gkA.role === 'gk', 'o papel gk foi reposto', 'o goleiro ficou sem o papel gk');
verifica(gkA.dirZ === Lados.dirDe(gkA.team) && gkA.targetGoalZ === (CAMPO_COMP / 2) * Lados.dirDe(gkA.team), 'a baliza do time foi reposta ao goleiro-batedor', 'o goleiro-batedor ficou a apontar para a baliza da disputa');

DisputaPenaltis.activa = false; Match.disputa = null;
if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\ntudo certo');
process.exit(0);   // o harness deixa handles abertos: sai-se explicitamente (como os outros testes)
