/*
Mede quanto o corpo esta virado para onde o jogador corre. Por estado da FSM, conta os frames (jogo corrido, velocidade > 4 m/s, longe da bola)
em que o angulo entre a frente do corpo e a velocidade passa de 60 graus.
Uso: node tools/headless/corpo_vs_movimento.js [segundos] [semente]
*/
const segundos = Number(process.argv[2] || 300);
const semente = Number(process.argv[3] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
const dt = 1 / 60; const por = {};
for (let i = 0; i < Math.round(segundos / dt); i++) {
    Match.update(dt);
    if (i % 3 || Match.state !== 'PLAY') continue;
    for (const p of Match.players.concat(Match.opponents)) {
        if (!p.model || p.role === 'gk' || p === Match.ballCarrier) continue;
        const v = p.velocity; const sp = Math.hypot(v.x, v.z);
        if (sp < 4) continue;
        const q = p.model.quaternion;
        const fx = 2 * (q.x * q.z + q.w * q.y), fz = 1 - 2 * (q.x * q.x + q.y * q.y);
        const ang = Math.acos(Math.max(-1, Math.min(1, (fx * v.x + fz * v.z) / (Math.hypot(fx, fz) * sp)))) * 180 / Math.PI;
        const dBola = Math.hypot(p.model.position.x - Match.ball.position.x, p.model.position.z - Match.ball.position.z);
        const k = p.fsm.currentState + (Match.intendedReceiver === p ? '*receptor' : '') + (dBola > 5 ? '' : ' (perto)');
        const e = por[k] = por[k] || { n: 0, mau: 0 };
        e.n++; if (ang > 60 && ang < 150) e.mau++;
    }
}
const linhas = Object.keys(por).map(k => ({ k, n: por[k].n, mau: por[k].mau, pc: 100 * por[k].mau / por[k].n })).sort((a, b) => b.mau - a.mau);
for (const l of linhas.slice(0, 12)) console.log(l.k.padEnd(34), String(l.n).padStart(6), 'frames  virados 60-150 graus:', String(l.mau).padStart(5), l.pc.toFixed(1) + '%');
