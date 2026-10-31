/*
A DISPUTA DE PENALTIS, a geometria (js/config/disputa.js): a meia-lua em volta do tecnico, a fila do meio-campo e os postos junto da baliza.
Medidas pedidas: tecnico 4 m para dentro da linha lateral; goleiro que espera a 5 m da linha de fundo entre a pequena e a grande area; bandeirinha sobre a
linha de fundo em cima da linha da grande area. Corre com: node --test tests/disputa_posicoes.test.js
*/
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const test = require('node:test');

const CR = String.fromCharCode(13), LF = String.fromCharCode(10);
const semCR = s => s.split(CR + LF).join(LF);
const src = semCR(fs.readFileSync(path.join(__dirname, '..', 'js', 'config', 'disputa.js'), 'utf8'));
const ini = src.indexOf('const DisputaModel = {');
const fim = src.indexOf(LF + '};', ini);
const DM = new Function(`${src.slice(ini, fim + 3)}; return DisputaModel;`)();

// Gerador pseudo-aleatorio determinista (mulberry32).
const semente = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

test('o tecnico fica 4 m para dentro da linha lateral, do lado do banco', () => {
    const t = DM.posTecnico(1, -8);
    assert.strictEqual(t.x, 30);
    assert.strictEqual(t.z, -8);
    assert.strictEqual(DM.posTecnico(-1, 8).x, -30);
});

test('a meia-lua: n pontos, dentro do campo, de frente para o campo, sem colisao', () => {
    for (const n of [1, 5, 10, 11]) {
        for (let s = 1; s <= 30; s++) {
            const tec = DM.posTecnico(1, s % 2 ? -8 : 8);
            const pts = DM.meiaLua(tec, n, 1, semente(s));
            assert.strictEqual(pts.length, n);
            for (const p of pts) {
                assert.ok(Math.abs(p.x) <= 34 && Math.abs(p.z) <= 53, `fora do campo: ${JSON.stringify(p)}`);
                assert.ok(p.x <= tec.x + 1e-9, 'um jogador ficou atras do tecnico, entre ele e a linha lateral');
                const d = dist(p, tec);
                assert.ok(d >= 4.5 && d <= 7.5, `raio ${d.toFixed(2)} fora das duas fileiras`);
            }
            for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
                assert.ok(dist(pts[i], pts[j]) >= DM.meiaLuaCfg.distMin - 1e-9, `colisao (semente ${s}, n ${n})`);
            }
        }
    }
});

test('as meias-luas dos dois times nao se tocam', () => {
    const a = DM.meiaLua(DM.posTecnico(1, -8), 11, 1, semente(3));
    const b = DM.meiaLua(DM.posTecnico(1, 8), 11, 1, semente(4));
    for (const p of a) for (const q of b) assert.ok(dist(p, q) >= 1.2);
});

test('a fila do meio-campo: sobre a linha do meio, um time de cada lado da marca', () => {
    const f = DM.filaCentral(11, 10);
    assert.strictEqual(f.casa.length, 11);
    assert.strictEqual(f.fora.length, 10);
    assert.ok(f.casa.every(p => p.z === 0) && f.fora.every(p => p.z === 0));
    assert.ok(f.casa.every(p => p.x < 0) && f.fora.every(p => p.x > 0));
    const xs = f.casa.map(p => p.x).sort((a, b) => b - a);
    xs.forEach((x, i) => { if (i) assert.ok(Math.abs((xs[i - 1] - x) - DM.fila.passo) < 1e-9, 'espacamento irregular'); });
    assert.ok(Math.abs(f.casa[0].x) >= DM.fila.folgaDaMarca && Math.abs(f.fora[0].x) >= DM.fila.folgaDaMarca, 'colado a marca do meio');
});

test('a marca do penalti e o batedor a espera, para cada baliza', () => {
    for (const s of [1, -1]) {
        const m = DM.posMarca(s);
        assert.strictEqual(m.x, 0);
        assert.ok(Math.abs(m.z - s * (53 - 11)) < 1e-9);
        const e = DM.posEsperaBatedor(s);
        assert.ok(Math.abs(e.z - (m.z - s * 5.7)) < 1e-9, 'a espera e recuoBatedor atras da marca');
        const g = DM.posGol(s);
        assert.deepStrictEqual(g, { x: 0, z: s * 53 });
    }
});

test('o goleiro que espera: 5 m da linha de fundo, entre a pequena e a grande area', () => {
    for (const s of [1, -1]) for (const lx of [1, -1]) {
        const p = DM.posGoleiroEspera(s, lx);
        assert.ok(Math.abs(Math.abs(p.z) - (53 - 5)) < 1e-9, 'a 5 m da linha de fundo');
        assert.strictEqual(Math.sign(p.z), s);
        assert.strictEqual(Math.sign(p.x), lx);
        assert.ok(Math.abs(p.x) > 9.16 && Math.abs(p.x) < 20.16, 'entre a linha da pequena area e a da grande');
    }
});

test('o bandeirinha: sobre a linha de fundo, em cima da linha da grande area', () => {
    for (const s of [1, -1]) for (const lx of [1, -1]) {
        const p = DM.posBandeirinha(s, lx);
        assert.strictEqual(Math.abs(p.z), 53);
        assert.strictEqual(Math.sign(p.z), s);
        assert.ok(Math.abs(Math.abs(p.x) - 20.16) < 1e-9);
        assert.strictEqual(Math.sign(p.x), lx);
    }
});
