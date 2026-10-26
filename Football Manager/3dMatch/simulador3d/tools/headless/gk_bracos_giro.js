/*
O GIRO DOS BRACOS DO GUARDA-REDES NA DEFESA ALTA. Mede, nos frames do estado `salto_alto`, a velocidade angular maxima (graus por frame) de cada ombro (angulo entre o quaternion do frame anterior e o actual) e a
profundidade minima da mao no referencial do peito (z < 0 = atras do peito). Um braco que da a volta por tras tem picos grandes. SEM=1 desliga a correccao do ik.js para comparar.
Uso: [SEM=1] node tools/headless/gk_bracos_giro.js [segundos] [semente]
*/
const segundos = Number(process.argv[2] || 1500), semente = Number(process.argv[3] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
if (process.env.SEM) IK._semCorreccaoBracoAtras = true;
const gks = [Match.players[0], Match.opponents[0]];
const ant = new Map(); const picos = []; let frames = 0, saltos = 0, estavaNoSalto = new Map();
const v = new THREE.Vector3(), inv = new THREE.Matrix4();
let minZ = 9;
for (let i = 0; i < Math.round(segundos / (1 / 60)); i++) {
    Match.update(1 / 60);
    for (const g of gks) {
        if (!g.rig) continue;
        const no = g.gkEstado === 'salto_alto';
        if (no && !estavaNoSalto.get(g)) saltos++;
        estavaNoSalto.set(g, no);
        for (const [nome, ombro, mao] of [['L', g.rig.lArm, g.rig.lHand], ['R', g.rig.rArm, g.rig.rHand]]) {
            const key = g.team + nome; const q = ombro.quaternion.clone();
            if (no && ant.has(key)) { const ang = 2 * Math.acos(Math.min(1, Math.abs(ant.get(key).dot(q)))) * 180 / Math.PI; picos.push(ang); frames++; 
                g.rig.chest.updateWorldMatrix(true, false); inv.copy(g.rig.chest.matrixWorld).invert(); mao.getWorldPosition(v); v.applyMatrix4(inv); if (v.z < minZ) minZ = v.z; }
            ant.set(key, q);
        }
    }
}
picos.sort((a, b) => a - b);
const q = (f) => picos.length ? picos[Math.floor(picos.length * f)].toFixed(1) : '-';
console.log(`${process.env.SEM ? 'SEM correccao' : 'COM correccao'} s${semente}: ${saltos} saltos altos, ${frames} frames de ombro | giro por frame: p50 ${q(.5)} p99 ${q(.99)} max ${q(.9999)} graus | mao mais atras do peito: z ${minZ.toFixed(2)} m`);
process.exit(0);
