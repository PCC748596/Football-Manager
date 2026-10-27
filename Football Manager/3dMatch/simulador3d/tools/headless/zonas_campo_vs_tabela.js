/*
O CAMPO BATE COM A TABELA DO EDITOR? Joga alguns minutos e, nos instantes SEM bola com a bola no terco defensivo (a imagem do relato), compara por posto o posto da tabela (`slotTarget`),
o alvo final (`dynamicTarget`) e a posicao real do jogador. Com window.__camadas, diz quanto cada camada do `tickFinal` desloca o alvo.
Uso: node tools/headless/zonas_campo_vs_tabela.js [minutos 6]
*/
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
Match.mudarEstado('PLAY', 'teste');
window.__camadas = {};
const minutos = Number(process.argv[2] || 6), dt = 1 / 60;
const acc = {}, est = {};
let amostras = 0;
for (let f = 0; f < minutos * 3600; f++) {
    Match.update(dt);
    if (f % 30 || Match.state !== 'PLAY') continue;
    const lista = Match.players, dz = lista[0].dirZ;
    if (Match.possessionTeam === lista[0].team) continue;               // so SEM bola
    const bz = Match.ball.position.z * dz;
    if (bz > -15 || bz < -40) continue;                                   // bola no terco defensivo (fora da area)
    amostras++;
    for (const p of lista) {
        if (p.role === 'gk' || !p.slotTarget || !p.dynamicTarget) continue;
        const k = p.idxFormacao + ' ' + p.pos;
        const a = acc[k] = acc[k] || { n: 0, slotZ: 0, finalZ: 0, realZ: 0, dEst: 0, dFin: 0, dReal: 0 };
        a.n++;
        const st = p.fsm ? p.fsm.currentState : '?'; const e = est[st] = est[st] || { n: 0, d: 0 }; e.n++; e.d += Math.hypot(p.dynamicTarget.x - p.slotTarget.x, p.dynamicTarget.z - p.slotTarget.z);
        a.slotZ += p.slotTarget.z * dz; a.finalZ += p.dynamicTarget.z * dz; a.realZ += p.model.position.z * dz;
        a.dEst += Math.hypot(p.postoBase.x - p.slotTarget.x, p.postoBase.z - p.slotTarget.z);
        a.dFin += Math.hypot(p.dynamicTarget.x - p.slotTarget.x, p.dynamicTarget.z - p.slotTarget.z);
        a.dReal += Math.hypot(p.model.position.x - p.slotTarget.x, p.model.position.z - p.slotTarget.z);
    }
}
console.log('amostras sem bola, bola no terco defensivo:', amostras);
console.log('posto     slotZ  alvoZ  realZ | desvio estilo, alvo, real (m, ao slot)');
for (const k of Object.keys(acc).sort((x, y) => parseInt(x) - parseInt(y))) {
    const a = acc[k], f = (v) => (v / a.n).toFixed(1).padStart(6);
    console.log(k.padEnd(8), f(a.slotZ), f(a.finalZ), f(a.realZ), '|', f(a.dEst), f(a.dFin), f(a.dReal));
}
console.log('por estado da FSM (n, desvio alvo-slot):');
for (const k of Object.keys(est).sort((x, y) => est[y].n - est[x].n)) console.log(' ', String(k).padEnd(24), est[k].n, (est[k].d / est[k].n).toFixed(1));
console.log('camadas (desvio medio por chamada):');
for (const k of Object.keys(window.__camadas).filter(k => k.startsWith('sem:'))) { const o = window.__camadas[k]; console.log(' ', k.padEnd(28), (o.s / o.n).toFixed(2)); }
process.exit(0);
