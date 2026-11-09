/*
BATEDOR DA FALTA ENQUANTO UM EXPULSO SAI (a cobranca fica segura por `Match.expulsosSaindo`). Quando comeca uma falta, mete-se um expulso fingido (anda a 0.0001 m/s,
fica ~12 s) e mede-se o batedor: posicao por frame, inversoes de sentido, estado da FSM. Uso: node tools/headless/falta_expulsao.js [segundos] [semente]
*/
const segundos = Number(process.argv[2] || 900);
const semente = Number(process.argv[3] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
const cena = new THREE.Scene(); Match.init(cena); if (!Officials.arbitro) Officials.init(cena);
const dt = 1 / 60;
let faltas = 0, ativo = null, ant = null, am = null; const res = [];
for (let i = 0; i < Math.round(segundos / dt); i++) {
    Match.update(dt);
    if (!ativo && Match.state === 'FREE_KICK' && Match.faltaPendente && Match.setPieceTaker) {
        faltas++;
        const falso = { model: { position: new THREE.Vector3(60, 0, 0), visible: true, rotation: { y: 0 } }, expulso: true, velocity: new THREE.Vector3(), animateBones() {}, saidaExpulso: { i: 0, t: 0, vel: 0.0001, wps: [{ x: 100, z: 0 }] } };
        Match.expulsosSaindo = Match.expulsosSaindo || []; Match.expulsosSaindo.push(falso);
        if (process.env.CARTAO) { const def = (Match.setPieceTaker.team === 'TeamA' ? Match.opponents : Match.players).filter(q => q.role !== 'gk' && !q.expulso); def.sort((a, b) => Math.hypot(a.model.position.x - Match.ball.position.x, a.model.position.z - Match.ball.position.z) - Math.hypot(b.model.position.x - Match.ball.position.x, b.model.position.z - Match.ball.position.z)); try { Officials.mostrarCartao(def[0], 'vermelho'); } catch (e) { console.log('cartao erro', e.message); } }
        ativo = { falso, i0: i, rev: 0, frames: 0, ex: [], dMax: 0 }; ant = null; am = null;
    }
    if (ativo) {
        const t = Match.setPieceTaker;
        if (t && Match.state === 'FREE_KICK' && (i - ativo.i0) * dt < 12) {
            const x = t.model.position.x, z = t.model.position.z;
            if (ant) { const mx = x - ant.x, mz = z - ant.z, mm = Math.hypot(mx, mz);
                if (am && mm > 0.002 && am.m > 0.002 && (mx * am.x + mz * am.z) / (mm * am.m) < -0.3) { ativo.rev++; if (ativo.ex.length < 4) ativo.ex.push({ t: +((i - ativo.i0) * dt).toFixed(2), mm: +mm.toFixed(3), est: t.fsm.currentState, aprox: !!Match.faltaAproximando, lugar: !!t.lugarBolaParada, vel: +t.velocity.length().toFixed(2), dBola: +Math.hypot(x - Match.ball.position.x, z - Match.ball.position.z).toFixed(2) }); }
                if (mm > 0.002) am = { x: mx, z: mz, m: mm }; }
            const mv = t.velocity.length() > 0.05; if (ativo.mv !== undefined && ativo.mv !== mv) { ativo.trans = (ativo.trans || 0) + 1; if ((ativo.exT = ativo.exT || []).length < 4) ativo.exT.push({ t: +((i - ativo.i0) * dt).toFixed(2), v: +t.velocity.length().toFixed(2), est: t.fsm.currentState, aprox: !!Match.faltaAproximando, lugar: !!t.lugarBolaParada, seg: !!Match._seguraCobranca }); } ativo.mv = mv;
            ant = { x, z }; ativo.frames++;
        } else if ((i - ativo.i0) * dt >= 12 || Match.state !== 'FREE_KICK') {
            ativo.falso.expulso = false; res.push({ frames: ativo.frames, rev: ativo.rev, ex: ativo.ex, trans: ativo.trans || 0, exT: ativo.exT || [] }); ativo = null;
        }
    }
}
console.log(`semente ${semente}: ${faltas} faltas, janelas ${res.length}`);
console.log(res.map(r => `frames ${r.frames} inversoes ${r.rev} transicoes parado/andar ${r.trans} ${JSON.stringify(r.exT)}`).join('\n'));
process.exit(0);
