/*
Procura os angulos do punho (maoRx, maoRy, maoRz) de cada frame do GoalkeeperUnderarmThrowClip para a palma da mao lancadora ficar virada para CIMA (a bola apoiada nela) ate ao contacto.
Corre com: node tools/scratch/gk_palma_busca.js
*/
require('../headless/harness.js');
const corpo = construirCorpo(0xff8800, 0x222222, escolherAparencia(0));
const model = corpo.corpo, rig = corpo.rig;
model.position.set(0, ALTURA_BASE_Y, 0);
const clip = process.argv[2] ? GoalkeeperThrowClip : GoalkeeperUnderarmThrowClip;
const n = clip.frames.length;
const hand = rig.rHand, q = new THREE.Quaternion(), v = new THREE.Vector3();
const desejado = process.argv[2] ? [[0, 1, 0.1], [0, 1, 0.1], [0, 1, 0.1], [0, 0.7, 0.7], [0, 0.4, 0.9], [0, 0.2, 0.98], [0, 0.3, 0.95], [0, 0.5, 0.85]].map(d => new THREE.Vector3(...d).normalize()) : [[0, 1, 0.15], [0, 1, 0.15], [0, 0.8, 0.6], [0, 0.4, 0.9], [0, 0.4, 0.9], [0, 0.8, 0.6], [0, 0.85, 0.5], [0, 0.7, 0.7]].map(d => new THREE.Vector3(...d).normalize());
const passo = 0.1, lim = 3.1;
let ryAnt = 0;
const normalDa = () => {
    hand.updateWorldMatrix(true, true);
    const maoG = hand.children[hand.children.length - 1], palmaG = maoG.children[maoG.children.length - 1];
    palmaG.getWorldQuaternion(q);
    return v.set(0, 0, 1).applyQuaternion(q).clone();
};
const saida = [];
for (let i = 0; i < n; i++) {
    const K = amostrarClipLancamentoGR(i / (n - 1), clip);
    aplicarPoseLancamentoGR(rig, K);
    model.position.y = ALTURA_BASE_Y + K.altura;
    model.updateMatrixWorld(true);
    if (i >= desejado.length) { saida.push([0, 0, 0]); continue; }
    let melhor = null;
    for (let rx = -0.5; rx <= 0.5 + 1e-9; rx += passo) for (let ry = -lim; ry <= lim + 1e-9; ry += passo) for (let rz = -0.4; rz <= 0.4 + 1e-9; rz += passo) {
        hand.rotation.set(rx, ry, rz);
        const nrm = normalDa();
        const s = nrm.dot(desejado[i]) - 0.04 * (Math.abs(rx) + Math.abs(rz)) - 0.08 * Math.abs(ry) - 0.18 * Math.abs(ry - ryAnt);
        if (!melhor || s > melhor.s) melhor = { s, rx, ry, rz, dot: nrm.dot(desejado[i]) };
    }
    ryAnt = melhor.ry;
    saida.push([melhor.rx, melhor.ry, melhor.rz]);
    console.log(`frame ${i + 1}: maoRx ${melhor.rx.toFixed(2)} maoRy ${melhor.ry.toFixed(2)} maoRz ${melhor.rz.toFixed(2)}  (alinhamento ${melhor.dot.toFixed(2)})`);
}
console.log(JSON.stringify(saida.map(a => a.map(x => Math.round(x * 100) / 100))));
process.exit(0);
