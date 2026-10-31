const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000);
require('../headless/harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
const dt = 1 / 60; const c = {}; let n = 0; const seq = new Map(); const longos = [];
const add = (k) => { c[k] = (c[k] || 0) + 1; };
for (let i = 0; i < 240 * 60; i++) {
    Match.update(dt);
    if (i % 3 || Match.state !== 'PLAY') continue;
    for (const p of Match.players.concat(Match.opponents)) {
        if (!p.model || p.role === 'gk') continue;
        if (p.fsm.currentState !== 'RUN_INTO_SPACE') { seq.set(p, 0); continue; }
        const v = p.velocity; const sp = Math.hypot(v.x, v.z); if (sp < 4) continue;
        const q = p.model.quaternion;
        const fx = 2 * (q.x * q.z + q.w * q.y), fz = 1 - 2 * (q.x * q.x + q.y * q.y);
        const ang = Math.acos(Math.max(-1, Math.min(1, (fx * v.x + fz * v.z) / (Math.hypot(fx, fz) * sp)))) * 180 / Math.PI;
        if (!(ang > 60 && ang < 150)) { const k = seq.get(p) || 0; if (k >= 8) longos.push(k); seq.set(p, 0); continue; }
        seq.set(p, (seq.get(p) || 0) + 1);
        n++;
        const d = p.dynamicTarget ? Math.hypot(p.dynamicTarget.x - p.model.position.x, p.dynamicTarget.z - p.model.position.z) : -1;
        const bx = Match.ball.position.x - p.model.position.x, bz = Match.ball.position.z - p.model.position.z;
        const dBola = Math.hypot(bx, bz);
        const cosB = (bx * v.x + bz * v.z) / (dBola * sp || 1);
        add('chegouAoPosto=' + !!p.chegouAoPosto);
        add('dAlvo<2.5=' + (d < 2.5));
        add('receptor=' + (Match.intendedReceiver === p));
        add('pedindoBola=' + (p.pedindoBola > 0));
        add('bolaLonge>5=' + (dBola > 5));
        add('bola a ' + (cosB < 0 ? 'atras' : 'frente') + ' do movimento');
        add('sprint>7=' + (sp > 7));
    }
}
longos.sort((a,b)=>b-a); console.log('sequencias >=8 amostras (0.4s):', longos.length, 'maiores:', longos.slice(0,8));
console.log('frames ruins em RUN_INTO_SPACE:', n); console.log(c);
