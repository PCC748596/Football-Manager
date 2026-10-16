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
