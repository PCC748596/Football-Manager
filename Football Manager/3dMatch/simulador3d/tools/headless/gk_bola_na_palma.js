/*
A BOLA ASSENTA NA PALMA DA MAO DO GOLEIRO ANTES DO LANCAMENTO? (GoalkeeperUnderarmThrowClip / GoalkeeperThrowClip). Para cada frame do clip: a normal da palma da mao lancadora (world), quanto
aponta para CIMA (1 = palma virada para o ceu) e a distancia do centro da bola (como em `colarBolaAMao`: na face da palma, a `raio` + meia espessura) ao antebraco (segmento cotovelo-punho):
se for menor que o raio da bola + a espessura do braco, a bola esta ENFIADA NO BRACO.
Uso: node tools/headless/gk_bola_na_palma.js [por_cima]
*/
require('./harness.js');
const corpo = construirCorpo(0xff8800, 0x222222, escolherAparencia(0));
const model = corpo.corpo, rig = corpo.rig;
model.position.set(0, ALTURA_BASE_Y, 0);
const clip = process.argv[2] ? GoalkeeperThrowClip : GoalkeeperUnderarmThrowClip;
const lado = clip.bracoLancamento;
const n = clip.frames.length;
const f = (x) => (x >= 0 ? '+' : '') + x.toFixed(2);
const hand = lado === 'r' ? rig.rHand : rig.lHand, elbow = lado === 'r' ? rig.rElbow : rig.lElbow;
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), q = new THREE.Quaternion();
for (let i = 0; i < n; i++) {
    const K = amostrarClipLancamentoGR(i / (n - 1), clip);
    aplicarPoseLancamentoGR(rig, K);
    model.position.y = ALTURA_BASE_Y + K.altura;
    model.updateMatrixWorld(true);
    const maoG = hand.children[hand.children.length - 1];
    const palmaG = maoG && maoG.children[maoG.children.length - 1];
    const palma = palmaG && palmaG.children[0];
    if (!palma) { console.log('sem palma no rig'); break; }
    palma.updateWorldMatrix(true, false);
    v1.setFromMatrixPosition(palma.matrixWorld);
    palmaG.getWorldQuaternion(q);
    v2.set(0, 0, lado === 'r' ? 1 : -1).applyQuaternion(q);
    const esc = new THREE.Vector3().setFromMatrixScale(palma.matrixWorld);
    const meia = 0.5 * palma.geometry.parameters.depth * esc.z;
    const bola = v1.clone().addScaledVector(v2, BallPhysics.raio + meia);
    // distancia da bola ao antebraco (cotovelo -> punho)
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    elbow.getWorldPosition(a); hand.getWorldPosition(b);
    const ab = b.clone().sub(a), t = Math.max(0, Math.min(1, bola.clone().sub(a).dot(ab) / ab.lengthSq()));
    const d = bola.distanceTo(a.clone().addScaledVector(ab, t));
    console.log(`frame ${String(i + 1).padStart(2)}: palma para cima ${f(v2.y)}  normal (${f(v2.x)}, ${f(v2.y)}, ${f(v2.z)})  bola a ${d.toFixed(2)} m do antebraco  (raio da bola ${BallPhysics.raio.toFixed(2)})  y da bola ${bola.y.toFixed(2)}`);
}
process.exit(0);
