/*
As tabelas de formação por zona (data/formacoes_zonas.js) e a leitura com interpolação (js/formacoes_zonas.js).
Corre com: node --test --test-force-exit tests/formacoes_zonas.test.js
*/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.join(__dirname, '..');
const Lib = require(path.join(raiz, 'js', 'formacoes_zonas.js'));
const T = new Function(fs.readFileSync(path.join(raiz, 'data', 'formacoes_zonas.js'), 'utf8') + ';return FormacoesZonas;')();

test('há tabelas para as formações do motor e as 7 do manager, com 11 jogadores em 9 zonas e 2 fases', () => {
    for (const k of ['433', '442', '4231', '4-4-2', '4-3-3', '4-3-3 ATA', '3-5-2', '5-4-1', '4-2-3-1', '5-3-2']) {
        const f = T.formacoes[k];
        assert.ok(f, 'falta ' + k);
        assert.strictEqual(f.slots.length, 11, k);
        for (const fase of ['com', 'sem']) {
            assert.strictEqual(f[fase].length, 9, k + ' ' + fase);
            for (const z of f[fase]) {
                assert.strictEqual(z.length, 11);
                for (const p of z) assert.ok(Math.abs(p.x) <= 1.0001 && Math.abs(p.z) <= 1.0001, k + ' fora do campo');
            }
        }
    }
});

test('os pesos da interpolação somam 1 e a zona do centro da zona pesa tudo', () => {
    for (const [x, z] of [[0, 0], [5, 30], [-20, -40], [33, 52], [-33, -52], [11.33, 17.7], [12, -10]]) {
        const ps = Lib.pesos(T, x, z);
        assert.ok(Math.abs(ps.reduce((a, p) => a + p.w, 0) - 1) < 1e-9, 'soma 1 em ' + x + ',' + z);
    }
    const C = Lib.centros(T);
    for (let li = 0; li < 3; li++) for (let ci = 0; ci < 3; ci++) {
        const ps = Lib.pesos(T, C.x[ci], C.z[li]);
        assert.strictEqual(ps.length, 1);
        assert.strictEqual(ps[0].zona, li * 3 + ci);
    }
});

test('a posição interpolada é contínua: sem salto ao cruzar a fronteira de uma zona', () => {
    const k = '4-4-2';
    let maxSalto = 0;
    for (let x = -30; x < 30; x += 0.25) {
        const a = Lib.posicoes(T, k, x, 5, true), b = Lib.posicoes(T, k, x + 0.25, 5, true);
        for (let i = 0; i < 11; i++) maxSalto = Math.max(maxSalto, Math.hypot((a[i].x - b[i].x) * T.meiaLargura, (a[i].z - b[i].z) * T.meiaAltura));
    }
    assert.ok(maxSalto < 1.0, 'maior salto por 0.25 m de bola: ' + maxSalto.toFixed(2) + ' m');
});

test('a chave do motor (mgr:..., #fora) acha a mesma tabela', () => {
    assert.strictEqual(Lib.chaveDaFormacao('mgr:4-4-2#fora'), '4-4-2');
    assert.ok(Lib.posicoes(T, 'mgr:4-4-2#fora', 0, 0, false));
    assert.strictEqual(Lib.posicoes(T, 'nao-existe', 0, 0, false), null);
});

test('a zona da bola e as fronteiras', () => {
    assert.strictEqual(Lib.zonaDaBola(T, 0, 0), 4);
    assert.strictEqual(Lib.zonaDaBola(T, -20, -30), 0);
    assert.strictEqual(Lib.zonaDaBola(T, 20, 30), 8);
});
