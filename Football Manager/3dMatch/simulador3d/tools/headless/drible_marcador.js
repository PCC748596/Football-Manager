/*
O DRIBLE E O MARCADOR: para cada drible bem sucedido mede a distancia carregador-marcador no toque e 1.5 s depois (o marcador tem de ficar para tras), e o angulo do toque em relacao a frente.
Uso: node tools/headless/drible_marcador.js [segundos] [semente]
*/
const segundos = Number(process.argv[2] || 1500), semente = Number(process.argv[3] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js'); if (typeof Sim === 'undefined') global.Sim = {}; Sim.running = true;
Match.init(new THREE.Scene()); if (process.env.SEM) DribbleModel.marcadorDur = 0;
const FSM = PlayerFSM.prototype, orig = FSM.changeState; const pend = []; const angs = [];
FSM.changeState = function (n, ...r) {
    const p = this.p;
    if (this.currentState === 'DRIBBLE' && n === 'CARRY' && p.driblePlano === null && !p.hasBall && p.dribbleOpponent) {
        const v = Match.ballVel; const opp = p.dribbleOpponent;
        const fr = p._frenteDrible;
        pend.push({ p, opp, t: 0, d0: p.model.position.distanceTo(opp.model.position) });
    }
    if (n === 'DRIBBLE') { p._frenteDrible = p.velocity.lengthSq() > 0.1 ? p.velocity.clone().normalize() : null; }
    return orig.call(this, n, ...r);
};
const dt = 1 / 60; const res = [];
for (let i = 0; i < segundos * 60; i++) {
    Match.update(dt);
    for (const e of pend) { e.t += dt; if (e.t >= 1.5 && !e.feito) { e.feito = true; res.push({ d0: e.d0, d1: e.p.model.position.distanceTo(e.opp.model.position) }); } }
}
const med = (a) => a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '-';
console.log(`s${semente}: ${res.length} dribles com toque | distancia ao marcador no toque ${med(res.map(r => r.d0))} m, 1.5 s depois ${med(res.map(r => r.d1))} m; ficou para tras (>3 m): ${res.filter(r => r.d1 > 3).length}`);
process.exit(0);
