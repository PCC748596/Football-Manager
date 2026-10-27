/*
QUEM PEDE A BOLA (braco levantado) ESTA A CORRER? Mede, nos frames em que alguem tem `pedindoBola > 0`, a velocidade, a velocidade para a frente e a distancia ao portador.
Uso: node tools/headless/pedir_bola_parado.js [segundos] [semente]
*/
const segundos = Number(process.argv[2] || 300), semente = Number(process.argv[3] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
const dt = 1 / 60;
let n = 0, lentos = 0, colados = 0, tras = 0;
const vs = [];
for (let i = 0; i < Math.round(segundos / dt); i++) {
    Match.update(dt);
    for (const p of [...Match.players, ...Match.opponents]) {
        const rg = p.rig;
        // o braco REALMENTE no ar (o que se ve): rotacao z do ombro > 2 rad; a flag `pedindoBola` pode ficar marcada pelo BT depois do update do jogador.
        if (!rg || !p.velocity || !(Math.max(Math.abs(rg.lArm.rotation.z), Math.abs(rg.rArm.rotation.z)) > 2.0) || p.role === 'gk' || p.fsm.currentState === 'COMEMORAR') continue;
        const v = Math.hypot(p.velocity.x, p.velocity.z), vf = p.velocity.z * p.dirZ;
        n++; vs.push(v);
        if (v < 2.5) lentos++;
        if (vf < 1.5) tras++;
        const c = Match.ballCarrier;
        if (c && c !== p && c.team === p.team && Math.hypot(c.model.position.x - p.model.position.x, c.model.position.z - p.model.position.z) < 7) colados++;
    }
}
vs.sort((a, b) => a - b);
console.log(`pedidos de bola: ${n} frames (${(n / 60).toFixed(0)} s de braco no ar) | a menos de 2.5 m/s: ${lentos} | sem avanco >= 1.5 m/s: ${tras} | a menos de 7 m do portador: ${colados} | velocidade mediana ${vs.length ? vs[Math.floor(vs.length / 2)].toFixed(1) : '-'} m/s`);
process.exit(0);
