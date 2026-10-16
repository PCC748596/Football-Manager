/*
A volta dos assistentes ao posto depois da entrada dos times (estado GOAL sem festa de golo):
  . vao de frente para onde andam (a guarda "nao ficar de costas para a bola" nao os vira de lado: movimento para um lado,
    animacao para o outro);
  . cada um chega a linha de impedimento da metade que cobre — tambem com os lados trocados (o manager poe a casa a esquerda),
    em que um deles ficava parado no meio-campo.
Corre com: node --test --test-force-exit tests/assistentes_na_saida_de_bola.test.js
*/
const test = require('node:test');
const assert = require('node:assert');
require('../tools/headless/harness.js');

const scene = new THREE.Scene();
Match.init(scene);
Lados.trocados = true;
if (Match.assignFormations) Match.assignFormations();
if (Officials.init) Officials.init(scene);
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = false;
assert.ok(Abertura.iniciar());

const dt = 1 / 60, a = Officials.assistentes;
let t = 0, fim = null, maxDesvio = 0, arrancou = false;
const prev = a.map(o => ({ x: o.model.position.x, z: o.model.position.z }));
const final = [];
for (let i = 0; i < 60 * 60 && final.length === 0; i++) {
    Match.update(dt); t += dt;
    if (fim === null && !Abertura.activa) fim = t;
    if (fim !== null && Match.state === 'GOAL' && Match.semFestaDeGolo && i % 6 === 0) {
        if (!arrancou) { arrancou = true; a.forEach((o, k) => { prev[k] = { x: o.model.position.x, z: o.model.position.z }; }); continue; }
        a.forEach((o, k) => {
            const p = o.model.position, mx = p.x - prev[k].x, mz = p.z - prev[k].z;
            if (Math.hypot(mx, mz) > 0.3) {
                const q = o.model.quaternion, yaw = Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.z * q.z));
                const d = Math.abs(Math.atan2(Math.sin(yaw - Math.atan2(mx, mz)), Math.cos(yaw - Math.atan2(mx, mz))));
                if (d > maxDesvio) maxDesvio = d;
                if (process.env.DBG && d > 0.6) console.log('t', (t - fim).toFixed(1), 'A' + k, 'desvio', (d * 180 / Math.PI).toFixed(0), 'pos', p.x.toFixed(1), p.z.toFixed(1), 'mov', mx.toFixed(2), mz.toFixed(2));
            }
            prev[k] = { x: p.x, z: p.z };
        });
    }
    if (fim !== null && t - fim > 14) a.forEach(o => final.push({ x: o.model.position.x, z: o.model.position.z }));
}

test('a caminho do posto vao de frente para onde andam (< 35 graus de desvio)', () => {
    assert.ok(maxDesvio < 35 * Math.PI / 180, 'desvio maximo ' + (maxDesvio * 180 / Math.PI).toFixed(0) + ' graus');
});

test('os dois chegam a linha lateral e a sua linha de impedimento (nenhum fica no meio-campo)', () => {
    assert.ok(final[0].x > 30 && final[1].x < -30, JSON.stringify(final));
    assert.ok(Math.abs(final[0].z) > 5, 'assistente 0 parado no meio-campo: z=' + final[0].z.toFixed(1));
    assert.ok(Math.abs(final[1].z) > 5, 'assistente 1 parado no meio-campo: z=' + final[1].z.toFixed(1));
});
