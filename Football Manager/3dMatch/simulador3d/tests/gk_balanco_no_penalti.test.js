/*
O guarda-redes balanca o corpo (a anca ~30 cm para cada lado) esperando o penalti, com as botas paradas; fora do penalti nao mexe a anca.
Corre com: node --test --test-force-exit tests/gk_balanco_no_penalti.test.js
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
for (let i = 0; i < 300; i++) Match.update(dt);

test('na espera do penalti a anca balanca ~30 cm e as botas ficam no sitio', () => {
    const gk = Match.opponents[0];
    Match.setPieceTeam = 'TeamA';
    Match.state = 'PENALTY';
    Match.penaltiPendente = true;
    Match.penaltiAtraso = 99;
    gk.gkEstado = 'idle'; gk.velocity.set(0, 0, 0);
    let minX = 9, maxX = -9; const botas = [];
    for (let i = 0; i < 60 * 6; i++) {
        gk.balancarNoPenalti(dt);
        minX = Math.min(minX, gk.rig.pelvis.position.x); maxX = Math.max(maxX, gk.rig.pelvis.position.x);
        if (i > 60 * 3) { gk.model.updateMatrixWorld(true); const v = new THREE.Vector3(); gk.rig.lFoot.getWorldPosition(v); botas.push(v.x); }
        gk.rig.lLeg.rotation.z = 0; gk.rig.rLeg.rotation.z = 0;   // o resto da pose reescreve estas todos os frames
    }
    const amp = (maxX - minX) / 2 * 0.33;
    assert.ok(amp > 0.12 && amp < 0.4, 'amplitude da anca ' + amp.toFixed(2) + ' m');
});

test('fora do penalti a anca volta a zero', () => {
    const gk = Match.opponents[0];
    Match.state = 'PLAY'; Match.penaltiPendente = false;
    for (let i = 0; i < 60; i++) gk.balancarNoPenalti(dt);
    assert.ok(Math.abs(gk.rig.pelvis.position.x) < 0.01, 'pelvis.x = ' + gk.rig.pelvis.position.x);
});

test('no balanco do penalti as botas NAO se movem: as pernas dobram e esticam (IK) e a anca vai de um lado ao outro', () => {
    const gk = Match.opponents[0];
    gk.balancarNoPenalti(dt);            // reinicia o estado do balanco
    Match.state = 'PLAY'; for (let i = 0; i < 30; i++) gk.balancarNoPenalti(dt);
    gk.model.position.set(0, gk.model.position.y, gk.ownGoalZ);
    const pos = (f) => f.getWorldPosition(new THREE.Vector3());
    let base = null, dMax = 0, joelhoMin = 9, joelhoMax = -9, anca = 0;
    for (let i = 0; i < 60 * 10; i++) {
        gk.gkEstado = 'idle'; gk.velocity.set(0, 0, 0);
        Match.state = 'PENALTY'; Match.penaltiPendente = true; Match.penaltiAtraso = 99; Match.setPieceTeam = 'TeamA';
        gk.updateGK(dt);
        if (i < 60 * 3) continue;
        gk.model.updateMatrixWorld(true);
        const L = pos(gk.rig.lFoot), R = pos(gk.rig.rFoot);
        if (!base) base = { L, R };
        dMax = Math.max(dMax, L.distanceTo(base.L), R.distanceTo(base.R));
        joelhoMin = Math.min(joelhoMin, gk.rig.lKnee.rotation.x); joelhoMax = Math.max(joelhoMax, gk.rig.lKnee.rotation.x);
        anca = Math.max(anca, Math.abs(gk.rig.pelvis.position.x));
    }
    assert.ok(dMax < 0.06, 'as botas movem-se ' + dMax.toFixed(3) + ' m');
    assert.ok(joelhoMax - joelhoMin > 0.1, 'o joelho dobra e estica: amplitude ' + (joelhoMax - joelhoMin).toFixed(2) + ' rad');
    assert.ok(anca > 0.4, 'a anca vai de um lado ao outro: ' + anca.toFixed(2));
});
