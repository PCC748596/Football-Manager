/*
A CAPTURA DOS ULTIMOS 30 s (js/captura.js): o anel enche, nunca passa de 30 s, sai por ordem de tempo e tem os 22 jogadores e a bola.
Corre com: node --test tests/captura.test.js
*/
const test = require('node:test');
const assert = require('assert');
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(7);
require('../tools/headless/harness.js');
const fs = require('fs'), path = require('path');
(0, eval)(fs.readFileSync(path.join(__dirname, '..', 'js', 'captura.js'), 'utf8') + '\nglobal.CapturaDeJogo = CapturaDeJogo;');

test('grava 30 s a 30 Hz, por ordem de tempo, com os 22 jogadores', () => {
    const scene = new THREE.Scene(); Match.init(scene);
    if (typeof Sim === 'undefined') global.Sim = {}; Sim.running = true;
    CapturaDeJogo.iniciar();
    for (let i = 0; i < 60 * 40; i++) { Match.update(1 / 60); CapturaDeJogo.registar(1 / 60); }
    const c = CapturaDeJogo.exportar();
    assert.strictEqual(c.quadros.length, 900, 'o anel tem 900 quadros (30 s x 30 Hz)');
    assert.strictEqual(c.jogadores.length, 22);
    assert.strictEqual(c.quadros[0].length, c.cab + 22 * c.porJogador);
    const t0 = c.quadros[0][0], t1 = c.quadros[899][0];
    assert.ok(t1 > t0, 'por ordem de tempo');
    assert.ok(JSON.stringify(c).length < 3.5e6, 'o ficheiro fica abaixo de ~3.5 MB (' + JSON.stringify(c).length + ' bytes)');
});
