/*
O BOTAO "Champion" (ComemoracaoCampeao.simularFimDeJogo, js/comemoracao_campeao.js): o relogio salta para 87:00, o juiz acaba o jogo aos 90:00 (sem acrescimo
nem espera pela bola no meio-campo) e o campeao festeja (quem vencer; empatado, quem ia a frente ao carregar no botao, ou a casa). Caminho visual.

Corre com: node tests/comemoracao_botao_champion.test.js
*/
require('../tools/headless/harness.js');
if (typeof Sim === 'undefined') global.Sim = {};

let falhas = 0;
const erro = m => { falhas++; console.error('  X ' + m); };
const ok = (c, m) => { if (!c) erro(m); else console.log('  . ' + m); };
const dt = 1 / 60;

Sim.running = false;
const cena = new THREE.Scene();
Match.setCameraMode = function () {};
if (typeof Ponte !== 'undefined') Ponte.enviar = function () {};
Match.init(cena); Officials.init(cena);
if (Abertura.activa) Abertura.cancelar();
Match.resetPlay('TeamA');
for (let i = 0; i < Math.round(20 / dt); i++) Match.update(dt);   // ainda no 1.o tempo
Match.placarA = 0; Match.placarB = 1;   // a visitante a frente

console.log('1 — o botao no 1.o tempo');
ok(!Match.primeiroTempoAcabou, 'estava no 1.o tempo');
ok(ComemoracaoCampeao.simularFimDeJogo() === true, 'simularFimDeJogo() aceitou');
ok(Math.abs(Match.tempoDeJogo - 87 * 60) < 1, 'relogio em 87:00 (' + (Match.tempoDeJogo / 60).toFixed(2) + ')');
ok(Match.primeiroTempoAcabou && Match.acrescimo2 === 0, '2.o tempo, sem acrescimo');
ok(Match.campeao && Match.campeao.seEmpatar === 'fora', 'o jogo da o titulo (empate: a visitante, que ia a frente)');

let apito = null, festa = false, max = 0;
for (let i = 0; i < Math.round(240 / dt); i++) {
    const antes = Match.state;
    Match.update(dt);
    if (Match.state !== 'FIM_DE_JOGO') max = Math.max(max, Match.tempoDeJogo);
    if (antes !== 'FIM_DE_JOGO' && Match.state === 'FIM_DE_JOGO') apito = Match.tempoDeJogo;
    if (ComemoracaoCampeao.activa) { festa = true; break; }
}
console.log('2 — o apito e a festa');
ok(apito !== null, 'o juiz acabou o jogo');
ok(apito !== null && Math.abs(apito - 90 * 60) < 3, 'aos 90:00 (' + (apito !== null ? (apito / 60).toFixed(2) : '-') + ')');
const camp = Match.campeaoDoJogo();
ok(camp === (Match.placarA > Match.placarB ? 'TeamA' : 'TeamB'), 'o campeao e quem venceu (' + Match.placarA + 'x' + Match.placarB + ' -> ' + camp + ')');
ok(festa, 'a comemoracao de campeao arrancou');
ok(!Match._fimNoRelogio, 'o apito no minuto exacto desliga-se depois de usado');

console.log(falhas ? '\nFALHOU: ' + falhas : '\nOK: o botao Champion leva o jogo aos 87:00, o juiz acaba aos 90:00 e o campeao festeja.');
process.exit(falhas ? 1 : 0);
