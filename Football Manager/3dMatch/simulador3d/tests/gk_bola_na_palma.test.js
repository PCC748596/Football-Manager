/*
A BOLA ASSENTA NA PALMA DA MAO DO GOLEIRO ATE AO LANCAMENTO (relato com as capturas 55325 e 956B: a bola estava no meio do braco).
Mede a normal da palma da mao lancadora em cada frame dos dois gestos (por baixo e por cima): ate ao contacto a palma tem de apontar para CIMA (ou para a frente, a meio do balanco), nunca
para o lado — com a normal de lado a bola, que fica na face da palma, ficava ao lado do antebraco.
*/
const assert = require('assert');
require('../tools/headless/harness.js');
const corpo = construirCorpo(0xff8800, 0x222222, escolherAparencia(0));
const model = corpo.corpo, rig = corpo.rig;
model.position.set(0, ALTURA_BASE_Y, 0);
let falhas = 0;
const erro = m => { falhas++; console.error('  X ' + m); };
const q = new THREE.Quaternion();
function normais(clip) {
    const hand = clip.bracoLancamento === 'r' ? rig.rHand : rig.lHand;
    const out = [];
    for (let i = 0; i < clip.frames.length; i++) {
        const K = amostrarClipLancamentoGR(i / (clip.frames.length - 1), clip);
        aplicarPoseLancamentoGR(rig, K);
        model.position.y = ALTURA_BASE_Y + K.altura;
        model.updateMatrixWorld(true);
        const maoG = hand.children[hand.children.length - 1], palmaG = maoG.children[maoG.children.length - 1];
        palmaG.getWorldQuaternion(q);
        out.push(new THREE.Vector3(0, 0, clip.bracoLancamento === 'r' ? 1 : -1).applyQuaternion(q));
    }
    return out;
}
// [clip, frames (1-based) e o minimo de `cima` (normal.y) exigido, e o de `frente` (normal.z)]
const casos = [
    ['por baixo', GoalkeeperUnderarmThrowClip, [[1, 0.85, null], [2, 0.85, null], [3, 0.6, null], [6, 0.35, null], [7, 0.6, null], [8, 0.6, null]]],
    ['por cima', GoalkeeperThrowClip, [[1, 0.85, null], [2, 0.85, null], [3, 0.85, null], [4, 0.7, null]]]
];
for (const [nome, clip, regras] of casos) {
    const ns = normais(clip);
    for (const [f, minCima] of regras) {
        const n = ns[f - 1];
        if (!(n.y >= minCima)) erro(`${nome}, frame ${f}: a palma aponta ${n.y.toFixed(2)} para cima (minimo ${minCima}); normal (${n.x.toFixed(2)}, ${n.y.toFixed(2)}, ${n.z.toFixed(2)})`);
    }
    // Nunca de lado (|x| > 0.9) ate ao contacto (frames 1..7 por baixo, 1..8 por cima).
    const ate = nome === 'por baixo' ? 7 : 8;
    ns.slice(0, ate).forEach((n, i) => { if (Math.abs(n.x) > 0.9) erro(`${nome}, frame ${i + 1}: palma virada de lado (x ${n.x.toFixed(2)})`); });
}
if (falhas) { console.error(falhas + ' falha(s)'); process.exit(1); }
console.log('OK gk_bola_na_palma');
process.exit(0);
