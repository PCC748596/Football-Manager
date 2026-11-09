/*
VIRADAS DE JOGO. Conta os passes com deslocamento lateral >= 20 m e que trocam de lado (sinal de x), e quantos foram
completados (a bola passa a um companheiro) ou cortados. Compara `PassModel.bonusVirada` ligado e desligado.
Uso: node tools/headless/viradas.js [segundos] [semente] [bonusVirada]
*/
const segundos = Number(process.argv[2] || 600);
const semente = Number(process.argv[3] || 0);
const bonus = process.argv[4] !== undefined ? Number(process.argv[4]) : null;
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
if (bonus !== null) PassModel.bonusVirada = bonus;
const dt = 1 / 60;
let passes = 0, viradas = 0, viradasOk = 0, viradasPerdidas = 0, pendente = null, ant = null, antX = 0;
for (let i = 0; i < Math.round(segundos / dt); i++) {
    Match.update(dt);
    const c = Match.ballCarrier;
    if (pendente && c) {
        if (pendente.virada) { if (c.team === pendente.team) viradasOk++; else viradasPerdidas++; }
        pendente = null;
    } else if (pendente && i - pendente.i > 60 * 5) pendente = null;
    if (ant && c !== ant && Match.intendedReceiver && Match.intendedReceiver !== ant) {
        const r = Match.intendedReceiver;
        const dx = Math.abs(r.model.position.x - antX);
        const virada = dx >= 20 && Math.sign(r.model.position.x) !== Math.sign(antX);
        passes++; if (virada) viradas++;
        pendente = { team: ant.team, i, virada };
    }
    ant = c || null;
    if (c) antX = c.model.position.x;
}
console.log(`semente ${semente} bonus ${PassModel.bonusVirada}: passes ${passes}, viradas ${viradas} (${(100 * viradas / Math.max(1, passes)).toFixed(1)}%), completas ${viradasOk}, perdidas ${viradasPerdidas}`);
