/*
PORTADOR PARADO NA AREA: procura o jogador com a bola, dentro da grande area adversaria, que fica parado (velocidade < 0.6 m/s) por mais de `limite` s. Imprime o estado da FSM, quem esta perto e o que o BT escolheu.
Uso: node tools/headless/parado_na_area.js [segundos] [semente] [limite]
*/
const segundos = Number(process.argv[2] || 1500), semente = Number(process.argv[3] || 0), limite = Number(process.argv[4] || 1.2);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
let cur = null, t0 = 0, parado = 0, casos = [], estados = {};
for (let i = 0; i < segundos * 60; i++) {
    Match.update(1 / 60);
    const p = Match.ballCarrier;
    if (!p || Match.state !== 'PLAY' || p.role === 'gk') { cur = null; parado = 0; continue; }
    const z = p.model.position.z * p.dirZ, x = Math.abs(p.model.position.x);
    const naArea = z > (CAMPO_COMP / 2 - 16.5) && x < 20.2;
    if (!naArea) { cur = null; parado = 0; continue; }
    if (cur !== p) { cur = p; parado = 0; estados = {}; }
    const v = p.velocity.length();
    const est = p.fsm.currentState;
    if (v < Number(process.env.VMAX || 0.6)) { parado += 1 / 60; estados[est] = (estados[est] || 0) + 1; } else { parado = 0; estados = {}; }
    if (parado > limite && !casos.find(c => c.p === p && Math.abs(c.i - i) < 600)) {
        const adv = (p.team === 'TeamA' ? Match.opponents : Match.players).filter(o => o.role !== 'gk').map(o => o.model.position.distanceTo(p.model.position)).sort((a, b) => a - b);
        casos.push({ p, i, t: (i / 60).toFixed(0), pos: p.pos, est, estados: JSON.stringify(estados), dAdvPerto: adv[0].toFixed(1), z: z.toFixed(1), x: p.model.position.x.toFixed(1),
            hold: p.carryHold, drib: p.dribbleCooldown, act: p.actionState, tg: p.dynamicTarget ? p.dynamicTarget.x.toFixed(1) + ',' + p.dynamicTarget.z.toFixed(1) : null, sp: p.speedMult && p.speedMult.toFixed(1) });
    }
}
console.log('semente', semente, 'casos parado >', limite, 's:', casos.length);
for (const c of casos.slice(0, 12)) console.log(JSON.stringify({ t: c.t, pos: c.pos, est: c.est, estados: c.estados, dAdv: c.dAdvPerto, z: c.z, x: c.x, carryHold: c.hold, actionState: c.act, alvo: c.tg, speedMult: c.sp }));
process.exit(0);
