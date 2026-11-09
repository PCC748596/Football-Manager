/*
VERMELHO + FALTA: forca um vermelho de verdade (Officials.marcarFalta com decidirCartao = vermelho; a saida pelo tunel liga-se com Sim.running = false so durante a expulsao) e
mede o BATEDOR (a vitima) nos 25 s seguintes: inversoes de sentido, transicoes parado/andar e a velocidade do expulso. Uso: node tools/headless/vermelho_batedor.js [semente] [n]
*/
const semente = Number(process.argv[2] || 1), N = Number(process.argv[3] || 4);
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
let feitos = 0, esperaAte = 600, janela = null;
for (let i = 0; i < 60 * 3600 && feitos < N; i++) {
    Match.update(dt);
    if (!janela && i > esperaAte && Match.state === 'PLAY' && Match.ballCarrier && Match.ballCarrier.role !== 'gk') {
        const v = Match.ballCarrier; const lista = v.team === 'TeamA' ? Match.opponents : Match.players;
        const inf = lista.filter(q => q.role !== 'gk' && !q.expulso).sort((a, b) => Math.hypot(a.model.position.x - v.model.position.x, a.model.position.z - v.model.position.z) - Math.hypot(b.model.position.x - v.model.position.x, b.model.position.z - v.model.position.z))[0];
        Officials.marcarFalta(inf, v, { travouAtaque: true });
        janela = { i0: i, v, inf, rev: 0, trans: 0, mv: undefined, ant: null, am: null, ex: [], saiuT: null, estados: {}, visivelAte: null };
        continue;
    }
    if (janela) {
        const t = Match.setPieceTaker, tt = (i - janela.i0) * dt;
        if (janela.saiuT === null && janela.inf.expulso && !(Match.expulsosSaindo || []).includes(janela.inf)) janela.saiuT = tt;
        if (t && Match.state === 'FREE_KICK') {
            const x = t.model.position.x, z = t.model.position.z, k = t.fsm.currentState + (t.lugarBolaParada ? '+lugar' : '') + (t.queda ? '+queda' : ''); janela.estados[k] = (janela.estados[k] || 0) + 1;
            if (janela.ant) { const mx = x - janela.ant.x, mz = z - janela.ant.z, mm = Math.hypot(mx, mz);
                if (janela.am && mm > 0.002 && janela.am.m > 0.002 && (mx * janela.am.x + mz * janela.am.z) / (mm * janela.am.m) < -0.3) { janela.rev++; if (janela.ex.length < 4) janela.ex.push({ t: +tt.toFixed(2), mm: +mm.toFixed(3), est: k, vel: +t.velocity.length().toFixed(2), dBola: +Math.hypot(x - Match.ball.position.x, z - Match.ball.position.z).toFixed(2) }); }
                if (mm > 0.002) janela.am = { x: mx, z: mz, m: mm }; }
            if (process.env.TRACO && Math.round(tt*60) % 15 === 0) console.log('  t', tt.toFixed(2), 'dBola', Math.hypot(x - Match.ball.position.x, z - Match.ball.position.z).toFixed(2), 'vel', t.velocity.length().toFixed(2), 'est', k, 'aprox', !!Match.faltaAproximando, 'seg', !!Match._seguraCobranca, 'atraso', (Match.faltaAtraso||0).toFixed(2), 'carti', !!(Officials.cartaoAMostrar && Officials.cartaoAMostrar()));
            const mv = t.velocity.length() > 0.05; if (janela.mv !== undefined && janela.mv !== mv) janela.trans++; janela.mv = mv; janela.ant = { x, z };
        }
        if (tt > 30 || Match.state === 'PLAY') { console.log(`#${feitos + 1} taker==vitima ${Match.setPieceTaker === janela.v} expulso saiu em ${janela.saiuT === null ? 'nunca' : janela.saiuT.toFixed(1) + ' s'}; inversoes ${janela.rev}, transicoes parado/andar ${janela.trans}; estados ${JSON.stringify(janela.estados)} ${JSON.stringify(janela.ex)}`); janela = null; feitos++; esperaAte = i + 1200; }
    }
}
process.exit(0);
