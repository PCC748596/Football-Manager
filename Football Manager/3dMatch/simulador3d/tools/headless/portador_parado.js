/*
O PORTADOR PARADO. Procura os momentos em que quem tem a bola nos pes fica quase parado (< 0.6 m/s) por mais de `LIMITE` s, sem passar, rematar nem conduzir, e mostra o contexto: estado da FSM,
tempo de decisao, pressao, adversarios e companheiros perto, e quantos companheiros estao na mesma zona.
Uso: node tools/headless/portador_parado.js [segundos] [semente] [limite]
*/
const segundos = Number(process.argv[2] || 600), semente = Number(process.argv[3] || 0), LIMITE = Number(process.argv[4] || 1.5);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
const dt = 1 / 60;
let alvo = null, t0 = 0, parado = 0, eventos = [], reportado = false;
for (let i = 0; i < Math.round(segundos / dt); i++) {
    Match.update(dt);
    const c = Match.ballCarrier;
    if (Match.state !== 'PLAY' || !c || !c.model || c.role === 'gk') { alvo = null; parado = 0; reportado = false; continue; }
    if (c !== alvo) { alvo = c; parado = 0; reportado = false; }
    const v = c.velocity ? Math.hypot(c.velocity.x, c.velocity.z) : 0;
    if (v < 0.6 || c.decisionTimer > 2.5) parado += dt; else { parado = 0; reportado = false; }
    if (parado >= LIMITE && !reportado) {
        reportado = true;
        const lista = c.team === 'TeamA' ? Match.players : Match.opponents, adv = c.team === 'TeamA' ? Match.opponents : Match.players;
        const perto = (l, r) => l.filter(p => p !== c && p.model && p.model.position.distanceTo(c.model.position) < r).length;
        eventos.push({ t: (i * dt).toFixed(0), pos: c.pos, est: c.fsm.currentState, dec: c.decisionTimer.toFixed(1), pressao: !!c.underPressure,
            adv4: perto(adv, 4), mates8: perto(lista, 8), mates15: perto(lista, 15), avanco: (c.model.position.z * c.dirZ).toFixed(0) });
    }
}
console.log(`semente ${semente}: ${eventos.length} portadores parados > ${LIMITE}s`);
for (const e of eventos.slice(0, 15)) console.log(JSON.stringify(e));
process.exit(0);
