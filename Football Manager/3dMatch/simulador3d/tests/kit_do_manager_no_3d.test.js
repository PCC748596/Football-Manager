/*
O uniforme do 3D copia o desenho do kit do manager (pose.js: pintarKitComoIcone, igual ao ShirtIcon): cada bandeira do kit pinta
as suas formas, nas cores do kit, e um kit liso nao pinta nada alem do fundo.
Corre com: node --test --test-force-exit tests/kit_do_manager_no_3d.test.js
*/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const THREE = require('three');

const ler = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').split('\r\n').join('\n');
const src = ler('js/pose.js');
const fn = src.slice(src.indexOf('function pintarKitComoIcone'), src.indexOf("if (typeof window !== 'undefined') window.pintarKitComoIcone"));
const pintarKitComoIcone = new Function(fn + '; return pintarKitComoIcone;')();

const gravar = (kit) => {
    const cores = [];
    const ctx = new Proxy({ cores }, {
        get: (t, k) => (k === 'cores' ? cores : (...a) => { if (k === 'fillRect' || k === 'fill') cores.push(t.fillStyle); }),
        set: (t, k, v) => { t[k] = v; return true; }
    });
    pintarKitComoIcone(ctx, 512, 512, kit);
    return cores;
};

test('kit liso: so o fundo, na cor principal', () => {
    assert.deepStrictEqual(gravar({ c1: '#112233' }), ['#112233']);
});
test('listras: a cor secundaria entra em varias barras', () => {
    const c = gravar({ c1: '#111111', c2: '#eeeeee' });
    assert.ok(c.filter(x => x === '#eeeeee').length >= 4);
});
test('diagonal: uma faixa na cor secundaria; sem c2 nao pinta nada', () => {
    assert.strictEqual(gravar({ c1: '#111111', c2: '#eeeeee', diagonal: true }).filter(x => x === '#eeeeee').length, 1);
    assert.strictEqual(gravar({ c1: '#111111', diagonal: true }).length, 1);
});
test('tricolor (c3): as tres cores aparecem', () => {
    const c = gravar({ c1: '#009000', c2: '#ffffff', c3: '#800000' });
    assert.ok(c.includes('#009000') && c.includes('#ffffff') && c.includes('#800000'));
});
test('faixas do Criciuma e degrade nao rebentam', () => {
    assert.ok(gravar({ c1: '#111111', c2: '#eeeeee', c3: '#ff0000', criciumaStripes: true }).length >= 4);
    assert.ok(gravar({ c1: '#111111', c2: '#eeeeee', gradient: true }).length >= 1);
});
