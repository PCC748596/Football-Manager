const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const sem = Number(process.argv[2] || 0);
Math.random = mulberry32(1000 + sem * 977);
require('../headless/harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
const dt = 1 / 60; const c = {}; let n = 0, mau = 0; const ex = [];
for (let i = 0; i < 300 * 60; i++) {
    Match.update(dt);
    if (i % 3 || Match.state !== 'PLAY') continue;
    for (const p of Match.players.concat(Match.opponents)) {
        if (!p.model || !(p.pedindoBola > 0)) continue;
        const v = p.velocity; const sp = Math.hypot(v.x, v.z); if (sp < 3) continue;
        const q = p.model.quaternion;
        const fx = 2 * (q.x * q.z + q.w * q.y), fz = 1 - 2 * (q.x * q.x + q.y * q.y);
        const ang = Math.acos(Math.max(-1, Math.min(1, (fx * v.x + fz * v.z) / (Math.hypot(fx, fz) * sp)))) * 180 / Math.PI;
        n++;
        if (ang > 60) { mau++; const k = p.fsm.currentState + (Match.intendedReceiver === p ? '*rec' : ''); c[k] = (c[k] || 0) + 1; if (ex.length < 3) ex.push({ t: (i / 60).toFixed(1), est: p.fsm.currentState, ang: ang.toFixed(0), sp: sp.toFixed(1), pos: p.pos, cb: p._correDeCostas, cheg: p.chegouAoPosto }); }
    }
}
console.log('pedindoBola a correr:', n, 'viradas>60:', mau, c, ex);
