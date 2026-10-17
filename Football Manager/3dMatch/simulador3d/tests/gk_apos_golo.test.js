/*
O goleiro depois do golo (GkAposGolo, config/goalkeeper.js; tickGolGoleiro em match_physics.js): ~3 s depois do golo vai à bola dentro da
baliza, agarra-a, chuta-a para o meio-campo, e a sequência segue para a saída de bola.
Corre com: node --test --test-force-exit tests/gk_apos_golo.test.js
*/
const test = require('node:test');
const assert = require('node:assert');
require('../tools/headless/harness.js');

const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(31);
const dt = 1 / 60;
const cena = new THREE.Scene();
Match.init(cena);
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;

test('depois do golo o goleiro que sofreu agarra a bola na baliza e chuta-a para o meio-campo', () => {
    let golo = null;
    for (let i = 0; i < 60 * 60 * 40 && !golo; i++) {
        const antes = Match.state;
        Match.update(dt);
        if (Match.state === 'GOAL' && antes !== 'GOAL' && Math.abs(Match.ball.position.z) > 50) golo = { zBola: Match.ball.position.z, f: 0, fases: new Set(), agarrou: false, zMin: 99, vMax: 0 };
    }
    assert.ok(golo, 'houve um golo em 40 min simulados');
    const gk = [Match.players[0], Match.opponents[0]].find(g => Math.sign(g.ownGoalZ) === Math.sign(golo.zBola));
    let acabou = null;
    for (let i = 0; i < 60 * 40; i++) {
        Match.update(dt);
        golo.f++;
        if (Match.golGK) golo.fases.add(Match.golGK.fase);
        if (Match.ballCarrier === gk && gk.hasBall) { golo.agarrou = true; golo.tAgarrou = golo.f / 60; }
        if (golo.agarrou) { golo.vMax = Math.max(golo.vMax, Match.ballVel.length()); golo.zMin = Math.min(golo.zMin, Math.abs(Match.ball.position.z)); }
        if (Match.state !== 'GOAL') { acabou = golo.f / 60; break; }
    }
    assert.ok(golo.fases.has('ir') && golo.fases.has('apanhar') && golo.fases.has('segurar'), 'passou por ir, apanhar e segurar: ' + [...golo.fases]);
    assert.ok(golo.agarrou, 'o goleiro chegou a ter a bola');
    assert.ok(golo.tAgarrou >= 3.0, 'só depois dos ~3 s: ' + golo.tAgarrou);
    assert.ok(golo.vMax > 12, 'chutou a bola a sério: ' + golo.vMax.toFixed(1) + ' m/s');
    assert.ok(golo.zMin < Math.abs(golo.zBola) - 25, 'a bola vai para o meio-campo: chegou a ' + golo.zMin.toFixed(1) + ' m do meio');
    assert.ok(acabou !== null && acabou < 35, 'a sequência do golo acaba: ' + acabou);
    assert.ok(!gk.hasBall && Match.ballCarrier !== gk, 'o goleiro larga a bola no fim');
});
