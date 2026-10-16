/*
O SOCO DO GUARDA-REDES E UM SALTO, como o da cabecada. Relato: "o goleiro nao esta pulando para dar o soco". O soco planeado
(gkSoco) acontecia dentro do 'salto_alto' mas, com a bola ja baixa, o corpo subia so `GkSaltoAlto.saltoMin` (10 cm). Agora, com soco
planeado, sobe pelo menos `socoAnim.saltoMin`.
Corre com: node --test --test-force-exit tests/gk_soco_salta.test.js
*/
const test = require('node:test');
const assert = require('node:assert');
require('../tools/headless/harness.js');

const dt = 1 / 60;
const salto = (comSoco) => {
    const scene = new THREE.Scene();
    Match.init(scene);
    if (typeof Officials !== 'undefined' && Officials.init) Officials.init(scene);
    if (typeof Sim === 'undefined') global.Sim = {};
    Sim.running = true;
    for (let i = 0; i < 600; i++) Match.update(dt);
    const gk = Match.players[0];
    gk.model.position.set(0, ALTURA_BASE_Y, -50);
    Match.ball.position.set(1.2, 1.0, -49.5);
    Match.ballVel.set(0, -1, 0.5);
    gk.gkEstado = 'salto_alto'; gk.gkTempoMergulho = 0; gk.gkSaltoAlvoY = 0.8; gk.gkSaltoAlvoXZ = null; gk.gkSaltoDesloc = 0;
    gk.gkSaiuAoCruzamento = true;
    gk.gkSoco = comSoco ? { marcado: true, lado: 'r', tc: GkSaidaCruzamento.socoAnim.contacto, golpeado: false, tGolpe: null, preArmado: false } : null;
    let maxY = -9;
    for (let i = 0; i < 25; i++) { Match.update(dt); maxY = Math.max(maxY, gk.model.position.y - ALTURA_BASE_Y); }
    return maxY;
};

test('com soco planeado o corpo sobe a altura minima do soco, mesmo com a bola ja baixa', () => {
    assert.ok(salto(true) >= GkSaidaCruzamento.socoAnim.saltoMin - 0.03, 'salto do soco: ' + salto(true).toFixed(2));
});
test('sem soco o salto continua a ser o de sempre (curto, para a bola baixa)', () => {
    assert.ok(salto(false) < 0.25, 'salto sem soco: ' + salto(false).toFixed(2));
});

test('o braco do soco e o do lado da bola (o outro faz a mira), nos dois lados e nas duas equipas', () => {
    const scene = new THREE.Scene();
    Match.init(scene);
    if (typeof Officials !== 'undefined' && Officials.init) Officials.init(scene);
    for (const gk of [Match.players[0], Match.opponents[0]]) {
        gk.model.position.set(0, ALTURA_BASE_Y, -50);
        gk.model.updateMatrixWorld(true);
        const lx = new THREE.Vector3(), rx = new THREE.Vector3();
        gk.rig.lArm.getWorldPosition(lx); gk.rig.rArm.getWorldPosition(rx);
        gk.gkSaiuAoCruzamento = true;
        Match.ball.position.set(0, 1, -50);
        // Marcado: um adversario encostado.
        const adv = (gk.team === 'TeamA') ? Match.opponents[3] : Match.players[3];
        adv.model.position.set(1, ALTURA_BASE_Y, -50);
        for (const lado of [-1, 1]) {
            gk.planearSocoNoSalto({ x: lado * 3, z: -50 });
            assert.ok(gk.gkSoco, 'sem soco planeado');
            // O braco do soco tem de ser o que fica do MESMO lado do mundo que a bola.
            const braco = gk.gkSoco.lado === 'l' ? lx : rx;
            assert.ok(Math.sign(braco.x - 0) === lado || Math.abs(braco.x) < 1e-6 === false && Math.sign(braco.x) === lado,
                `${gk.team}: bola em x=${lado * 3}, soco com o braco ${gk.gkSoco.lado} (x=${braco.x.toFixed(2)})`);
        }
    }
});
