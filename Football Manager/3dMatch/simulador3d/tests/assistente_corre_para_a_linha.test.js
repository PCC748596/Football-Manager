/*
O assistente do lado das cameras (em +X) corre primeiro ate a linha lateral e so depois segue ao longo dela para a linha de
impedimento; o do lado oposto vai em diagonal, como sempre.
Corre com: node --test --test-force-exit tests/assistente_corre_para_a_linha.test.js
*/
const test = require('node:test');
const assert = require('node:assert');
require('../tools/headless/harness.js');

const scene = new THREE.Scene();
Match.init(scene);
if (typeof Officials !== 'undefined' && Officials.init) Officials.init(scene);
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;

const percurso = (i, x0, z0, alvoX, alvoZ) => {
    const o = Officials.assistentes[i];
    o.bandeira = null; o.aNaLinha = undefined;
    o.model.position.set(x0, 0, z0);
    const pts = [];
    for (let f = 0; f < 60 * 14; f++) { Officials.moverAssistente(o, alvoX, alvoZ, 1 / 60); pts.push({ x: o.model.position.x, z: o.model.position.z }); }
    return pts;
};
const meia = CAMPO_LARG / 2 + RefereeModel.margemLinha;

test('lado das cameras: o z quase nao muda ate o x chegar a linha lateral', () => {
    const pts = percurso(0, 3, -4, meia, -30);
    const iLinha = pts.findIndex(p => Math.abs(p.x - meia) < 0.7);
    assert.ok(iLinha > 0, 'nunca chegou a linha');
    for (const p of pts.slice(0, iLinha)) assert.ok(Math.abs(p.z - (-4)) < 1.0, 'desviou em z antes da linha: ' + p.z.toFixed(1));
    const fim = pts[pts.length - 1];
    assert.ok(Math.abs(fim.z - (-30)) < 3, 'nao chegou a linha de impedimento: z=' + fim.z.toFixed(1));
});

test('lado oposto: vai em diagonal (o z ja muda antes de chegar a linha)', () => {
    const pts = percurso(1, -3, 4, -meia, 30);
    const iMeio = pts.findIndex(p => Math.abs(p.x - (-meia)) < 17);
    assert.ok(Math.abs(pts[iMeio].z - 4) > 3, 'devia ir em diagonal: z=' + pts[iMeio].z.toFixed(1));
});
