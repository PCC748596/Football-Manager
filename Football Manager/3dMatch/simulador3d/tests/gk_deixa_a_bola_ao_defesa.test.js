/*
Bola solta na area (um rebate, por exemplo) com um defesa dele MAIS PERTO da bola do que o guarda-redes: o guarda-redes nao sai a correr atras dela, fica
na ancora e deixa-a ao defesa. Sem defesa mais perto, vai a ela, como sempre.
Corre com: node --test --test-force-exit tests/gk_deixa_a_bola_ao_defesa.test.js
*/
const test = require('node:test');
const assert = require('node:assert');
require('../tools/headless/harness.js');

const dt = 1 / 60;
const scene = new THREE.Scene();
Match.init(scene);
if (typeof Officials !== 'undefined' && Officials.init) Officials.init(scene);
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
for (let i = 0; i < 600; i++) Match.update(dt);

const cenario = (defesaPerto) => {
    const gk = Match.players[0];
    const dir = gk.dirZ;
    const gz = gk.ownGoalZ + dir * 3;                 // o guarda-redes um pouco a frente da linha
    for (const p of Match.players.concat(Match.opponents)) { if (p !== gk) { p.model.position.set(30, ALTURA_BASE_Y, 25); p.velocity.set(0, 0, 0); p.hasBall = false; } }
    gk.model.position.set(0, ALTURA_BASE_Y, gz);
    gk.gkEstado = 'idle'; gk.gkRecuperacao = 0; gk.velocity.set(0, 0, 0);
    const bz = gz + dir * 8, bx = 6;
    Match.state = 'PLAY'; Match.possessionTeam = gk.team === 'TeamA' ? 'TeamB' : 'TeamA'; window.bolaChutada = false; Match.ballCarrier = null; Match.intendedReceiver = null; Match.lastTouchedPlayer = Match.opponents[1];
    Match.ball.position.set(bx, 0.11, bz); Match.ballVel.set(0, 0, 0);
    const def = Match.players.find(p => p.role === 'def');
    def.model.position.set(defesaPerto ? bx - 1.5 : 30, ALTURA_BASE_Y, defesaPerto ? bz : 25);
    let max = 0;
    for (let i = 0; i < 90; i++) {
        Match.ball.position.set(bx, 0.11, bz); Match.ballVel.set(0, 0, 0);   // a bola fica solta e parada
        gk.updateGK(dt);
        max = Math.max(max, Math.hypot(gk.model.position.x, gk.model.position.z - gz));
    }
    return max;
};

test('com um defesa mais perto da bola, o guarda-redes fica na ancora', () => {
    const andou = cenario(true);
    assert.ok(andou < 2.5, 'o guarda-redes andou ' + andou.toFixed(1) + ' m atras da bola');
});
test('sem defesa por perto, vai a bola solta na area', () => {
    const andou = cenario(false);
    assert.ok(andou > 2.5, 'o guarda-redes so andou ' + andou.toFixed(1) + ' m');
});
