/*
VERMELHO: mede a VITIMA da falta (quem cai) depois da expulsao: posicao, velocidade, estado da FSM e flags, a cada 0.25 s, mais inversoes de sentido e transicoes parado/andar.
Uso: node tools/headless/vermelho_vitima.js [semente] [n] (TRACO=1 imprime a linha do tempo)
*/
const semente = Number(process.argv[2] || 1), N = Number(process.argv[3] || 3);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
const cena = new THREE.Scene(); Match.init(cena); if (!Officials.arbitro) Officials.init(cena);
const dt = 1 / 60;
const origExp = Officials.expulsar.bind(Officials);
Officials.expulsar = function (p) { const r = Sim.running; Sim.running = false; try { return origExp(p); } finally { Sim.running = r; } };
Officials.decidirCartao = () => 'vermelho';
let feitos = 0, esperaAte = 600, j = null;
for (let i = 0; i < 60 * 3600 && feitos < N; i++) {
    Match.update(dt);
    if (!j && i > esperaAte && Match.state === 'PLAY' && Match.ballCarrier && Match.ballCarrier.role !== 'gk') {
        const v = Match.ballCarrier; const lista = v.team === 'TeamA' ? Match.opponents : Match.players;
        const inf = lista.filter(q => q.role !== 'gk' && !q.expulso).sort((a, b) => Math.hypot(a.model.position.x - v.model.position.x, a.model.position.z - v.model.position.z) - Math.hypot(b.model.position.x - v.model.position.x, b.model.position.z - v.model.position.z))[0];
        Officials.marcarFalta(inf, v, { travouAtaque: true });
        j = { i0: i, v, inf, rev: 0, trans: 0, mv: undefined, ant: null, am: null, ex: [], estados: {}, saiu: null };
        continue;
    }
    if (j) {
        const t = (i - j.i0) * dt, p = j.v;
        if (j.saiu === null && j.inf.expulso && !(Match.expulsosSaindo || []).includes(j.inf)) j.saiu = t;
        const x = p.model.position.x, z = p.model.position.z;
        const k = p.fsm.currentState + (p.lugarBolaParada ? '+lugar' : '') + (p.queda ? '+queda' : '') + (p.voltaDaQueda ? '+volta' : '') + (Match.setPieceTaker === p ? '+TAKER' : '') + (p.actionState ? '+action' : '');
        j.estados[k] = (j.estados[k] || 0) + 1;
        if (process.env.TRACO && Math.round(t * 60) % 15 === 0) console.log('  t', t.toFixed(2), 'dBola', Math.hypot(x - Match.ball.position.x, z - Match.ball.position.z).toFixed(2), 'vel', p.velocity.length().toFixed(2), k, 'estado', Match.state, 'seg', !!Match._seguraCobranca);
        if (j.ant) { const mx = x - j.ant.x, mz = z - j.ant.z, mm = Math.hypot(mx, mz);
            if (j.am && mm > 0.002 && j.am.m > 0.002 && (mx * j.am.x + mz * j.am.z) / (mm * j.am.m) < -0.3) { j.rev++; if (j.ex.length < 4) j.ex.push({ t: +t.toFixed(2), mm: +mm.toFixed(3), k, vel: +p.velocity.length().toFixed(2) }); }
            if (mm > 0.002) j.am = { x: mx, z: mz, m: mm }; }
        const mv = p.velocity.length() > 0.05; if (j.mv !== undefined && j.mv !== mv) j.trans++; j.mv = mv; j.ant = { x, z };
        if (t > 35 || Match.state === 'PLAY' && t > 3) { console.log(`#${feitos + 1} expulso saiu em ${j.saiu === null ? 'nunca' : j.saiu.toFixed(1)} s; vitima: inversoes ${j.rev}, transicoes ${j.trans}; estados ${JSON.stringify(j.estados)} ${JSON.stringify(j.ex)}`); j = null; feitos++; esperaAte = i + 1200; }
    }
}
process.exit(0);
