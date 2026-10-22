/*
A FACE PERSONALIZADA no 3D (js/pose.js, `aplicarFaceCustom`): o estilo do cabelo, a barba e os oculos sobre a cabeca de blocos.

O que se guarda aqui:
  . careca esconde todo o cabelo; raspado encolhe as pecas mantendo o TOPO; longo e topete esticam-nas;
  . a barba comeca LOGO ABAIXO DO NARIZ — o nariz acaba em y = -0.08 e nenhuma peca da barba pode ter o topo acima disso na frente do rosto (o bug do "bigode acima do nariz");
  . os labios aparecem por cima da barba cheia/bigode e a linha da boca fica escondida;
  . os oculos sao 9 pecas finas em volta dos olhos.
Corre com: node --test --test-force-exit tests/face_personalizada.test.js
*/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const THREE = require('three');

const raiz = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(raiz, 'js', 'pose.js'), 'utf8').split('\r\n').join('\n');
const ini = src.indexOf('function aplicarFaceCustom(');
assert.ok(ini >= 0, 'aplicarFaceCustom desapareceu do pose.js');
const fim = src.indexOf('\n}\n', ini);
const aplicarFaceCustom = new Function('THREE', src.slice(ini, fim + 3) + '\nreturn aplicarFaceCustom;')(THREE);

const NARIZ_FIM = -0.08;   // o y onde o nariz acaba (pose.js: `nariz` vai de 0.05 a -0.08)

function cabeca() {
    const head = new THREE.Group();
    const mk = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d)); m.position.set(x, y, z); head.add(m); return m; };
    const partes = {
        hT: mk(0.88, 0.25, 0.9, 0, 0.5, 0), hB: mk(0.88, 0.7, 0.25, 0, 0.15, -0.35), hL: mk(0.15, 0.6, 0.65, -0.4, 0.2, -0.1), hR: mk(0.15, 0.6, 0.65, 0.4, 0.2, -0.1), hF: mk(0.88, 0.15, 0.2, 0, 0.45, 0.38)
    };
    const boca = new THREE.Line(new THREE.BufferGeometry());
    const base = head.children.length;
    return { head, partes, boca, base };
}
const ap = (extra) => Object.assign({ tipo: 'custom', pele: 0xd09472, cabelo: 0x262221, estilo: 'curto', barba: 'nenhuma', oculos: false, largura: 1 }, extra);
const topo = (m) => m.position.y + (m.geometry.parameters.height * m.scale.y) / 2;

test('curto deixa o cabelo como estava', () => {
    const c = cabeca(); const antes = Object.values(c.partes).map(m => [m.position.y, m.scale.y]);
    aplicarFaceCustom(ap({}), c.head, c.boca, c.partes, 1);
    assert.deepStrictEqual(Object.values(c.partes).map(m => [m.position.y, m.scale.y]), antes);
    assert.strictEqual(c.head.children.length, c.base, 'sem barba nem oculos nao entra nada');
});

test('careca esconde o cabelo; raspado encolhe mantendo o topo; longo e topete esticam', () => {
    let c = cabeca(); aplicarFaceCustom(ap({ estilo: 'careca' }), c.head, c.boca, c.partes, 1);
    assert.ok(Object.values(c.partes).every(m => m.visible === false));
    c = cabeca(); const topoT = topo(c.partes.hT);
    aplicarFaceCustom(ap({ estilo: 'raspado' }), c.head, c.boca, c.partes, 1);
    assert.ok(c.partes.hT.scale.y < 0.6 && Math.abs(topo(c.partes.hT) - topoT) < 1e-6, 'o topo fica onde estava');
    assert.strictEqual(c.partes.hF.visible, false);
    c = cabeca(); aplicarFaceCustom(ap({ estilo: 'longo' }), c.head, c.boca, c.partes, 1);
    assert.ok(c.partes.hB.scale.y > 1.5 && Math.abs(topo(c.partes.hB) - 0.5) < 1e-6);
    c = cabeca(); aplicarFaceCustom(ap({ estilo: 'topete' }), c.head, c.boca, c.partes, 1);
    assert.ok(topo(c.partes.hT) > 0.7, 'o topete sobe acima da cabeca: ' + topo(c.partes.hT));
});

test('a barba comeca abaixo do nariz, em todos os tipos (nunca o bigode acima do nariz)', () => {
    for (const barba of ['rala', 'cheia', 'bigode']) {
        const c = cabeca();
        aplicarFaceCustom(ap({ barba }), c.head, c.boca, c.partes, 1);
        const novas = c.head.children.slice(c.base);
        assert.ok(novas.length >= 1, barba + ': entrou barba');
        // as pecas da FRENTE do rosto (z > 0.4) nao podem ter o topo acima do fim do nariz
        for (const m of novas.filter(m => m.position.z > 0.4)) {
            assert.ok(topo(m) <= NARIZ_FIM + 1e-6, `${barba}: peca em y=${m.position.y.toFixed(3)} tem o topo em ${topo(m).toFixed(3)}, acima do nariz (${NARIZ_FIM})`);
        }
    }
});

test('labios por cima da barba cheia e do bigode (a linha da boca fica escondida); rala e nenhuma mantem a linha', () => {
    for (const [barba, escondida] of [['nenhuma', false], ['rala', false], ['cheia', true], ['bigode', true]]) {
        const c = cabeca();
        aplicarFaceCustom(ap({ barba }), c.head, c.boca, c.partes, 1);
        assert.strictEqual(c.boca.visible === false, escondida, barba);
    }
});

test('oculos: nove pecas finas em volta dos olhos', () => {
    const c = cabeca();
    aplicarFaceCustom(ap({ oculos: true }), c.head, c.boca, c.partes, 1);
    const novas = c.head.children.slice(c.base);
    assert.strictEqual(novas.length, 9);
    assert.ok(novas.every(m => m.position.z > 0.4 && Math.abs(m.position.y - 0.15) < 0.15));
});
