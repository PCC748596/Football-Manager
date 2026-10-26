/*
OS BRACOS DO GUARDA-REDES DEPOIS DA DEFESA. Relato: *"defendeu com os bracos acima da cabeca; depois os bracos rodaram para tras do corpo ate girarem para a frente"*.
Amostra, a cada frame, o `rotation.x` dos dois ombros (convencao do rig: negativo = para a frente/cima, positivo = para TRAS) e conta os frames em que algum passa de `LIMITE` (para tras),
por estado do guarda-redes. Mostra tambem o maior valor e o estado.
Uso: node tools/headless/gk_bracos.js [segundos] [semente] [limite]
*/
const segundos = Number(process.argv[2] || 900), semente = Number(process.argv[3] || 0), LIM = Number(process.argv[4] || 0.6);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
const gks = [Match.players[0], Match.opponents[0]];
const porEstado = {}; let max = -9, estMax = '', total = 0, episodios = 0, antes = false;
const dt = 1 / 60;
for (let i = 0; i < Math.round(segundos / dt); i++) {
    Match.update(dt);
    for (const g of gks) {
        if (!g || !g.rig || !g.rig.lArm) continue;
        total++;
        const x = Math.max(g.rig.lArm.rotation.x, g.rig.rArm.rotation.x);
        if (x > max) { max = x; estMax = String(g.gkEstado) + '/' + g.fsm.currentState; }
        if (x > LIM) { const k = String(g.gkEstado) + '/' + g.fsm.currentState; porEstado[k] = (porEstado[k] || 0) + 1; if (!antes) episodios++; antes = true; } else if (g === gks[0]) antes = false;
    }
}
console.log(`semente ${semente}: bracos para tras (> ${LIM} rad) em ${Object.values(porEstado).reduce((a, b) => a + b, 0)} de ${total} frames, ${episodios} episodios; maximo ${max.toFixed(2)} rad no estado ${estMax}`);
console.log(JSON.stringify(porEstado));
process.exit(0);
