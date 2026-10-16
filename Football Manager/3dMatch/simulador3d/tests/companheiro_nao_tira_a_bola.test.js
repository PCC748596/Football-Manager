/*
Um companheiro NAO tira a bola ao portador — nem nos frames em que o `ballCarrier` esta apagado (a bola passou dos 2 m do pe na
conducao). Antes, o que corria a pedir a bola, com o corpo mais perto dela, levava-a. So o destinatario de um passe a leva, ou
qualquer um com a bola ja fugida do dono (> bolaSolta).
Corre com: node --test --test-force-exit tests/companheiro_nao_tira_a_bola.test.js
*/
const test = require('node:test');
const assert = require('node:assert');
require('../tools/headless/harness.js');

const scene = new THREE.Scene();
Match.init(scene);
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.state = 'PLAY';

const prep = (distBolaAoDono) => {
    const campo = Match.players.filter(p => p.role !== 'gk');
    const dono = campo[0], pede = campo[1];
    for (const p of Match.players.concat(Match.opponents)) { p.model.position.set(40, 0, 40); p.hasBall = false; p.touchLock = 0; p.jumpTimer = 0; }
    dono.model.position.set(0, ALTURA_BASE_Y, 0);
    pede.model.position.set(0, ALTURA_BASE_Y, distBolaAoDono + 0.1);     // o mais perto da bola, a frente do dono
    Match.ball.position.set(0, BallPhysics.raio, distBolaAoDono);
    Match.prevBallPos = null;
    Match.ballVel.set(0, 0, 0);
    Match.ballCarrier = null;
    Match.lastTouchedPlayer = dono;
    Match.lastTouchedTeam = dono.team;
    Match.intendedReceiver = null;
    return { dono, pede };
};

test('bola a 1 m do dono, sem ballCarrier: o companheiro mais perto nao a leva', () => {
    const { pede } = prep(1.0);
    Match.resolveBallContact();
    assert.notStrictEqual(Match.ballCarrier, pede);
    assert.ok(!pede.hasBall);
});

test('o destinatario do passe leva-a', () => {
    const { pede } = prep(1.0);
    Match.intendedReceiver = pede;
    Match.resolveBallContact();
    assert.strictEqual(Match.ballCarrier, pede);
});

test('bola ja fugida do dono (3 m): e de quem chegar', () => {
    const { pede } = prep(3.0);
    Match.resolveBallContact();
    assert.strictEqual(Match.ballCarrier, pede);
});
