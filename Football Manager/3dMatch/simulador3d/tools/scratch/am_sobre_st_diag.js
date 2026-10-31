const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + Number(process.argv[2] || 0) * 977);
require('../headless/harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
const dt = 1 / 60; const ant = new Map(); const c = {}; const ex = [];
for (let i = 0; i < 400 * 60; i++) {
    Match.update(dt);
    const car = Match.ballCarrier;
    for (const p of Match.players.concat(Match.opponents)) {
        const est = p.fsm.currentState; const antes = ant.get(p);
        ant.set(p, est);
        if (!car || car === p || car.team !== p.team || antes !== 'RUN_INTO_SPACE' || est === 'RUN_INTO_SPACE') continue;
        const d = Math.hypot(p.model.position.x - car.model.position.x, p.model.position.z - car.model.position.z);
        if (d > 12) continue;
        const k = est + (p.apoioPonto ? '(apoioPonto)' : '') + (p.pullAway ? '(pullAway)' : '');
        c[k] = (c[k] || 0) + 1;
        if (ex.length < 4) ex.push({ t: (i / 60).toFixed(1), pos: p.pos, de: antes, para: est, d: d.toFixed(1), runT: (p.runTimer || 0).toFixed(2), alvoZ: p.dynamicTarget && (p.dynamicTarget.z * p.dirZ).toFixed(1), meuZ: (p.model.position.z * p.dirZ).toFixed(1), style: p.playingStyle });
    }
}
console.log('RUN_INTO_SPACE -> outro, a menos de 12 m do portador:', c, ex);
