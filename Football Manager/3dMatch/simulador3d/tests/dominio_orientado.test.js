/*
DOMINIO ORIENTADO (js/dominio_orientado.js): o primeiro toque para o espaco. Pedido: *"O dominio orientado nao e um passe, e um toque pra ele proprio"*.

Corre com: node tests/dominio_orientado.test.js
*/
require('../tools/headless/harness.js');
let falhas = 0;
const verifica = (c, b, m) => { if (c) console.log('  . ' + b); else { console.log('  X ' + m); falhas++; } };
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = false;
Match.init(new THREE.Scene()); if (typeof Officials !== 'undefined' && Officials.init) Officials.init(new THREE.Scene());
Match.resetPlay('TeamA');
Match.state = 'PLAY';
const M = DominioOrientadoModel;
const rec = Match.players.find(p => p.role === 'mid');
const dz = rec.dirZ;
const sempre = () => 0.0;   // le sempre (sorteio 0) e erro de execucao a meio
// Tira toda a gente de perto do centro e poe o receptor la; o marcador colado a um lado.
const longe = (p, i) => p.model.position.set(30 - i * 2, 0, -40 * dz);
Match.players.forEach((p, i) => { if (p !== rec) longe(p, i); });
Match.opponents.forEach((p, i) => longe(p, i));
rec.model.position.set(0, 0, 0);
rec.fsm.currentState = 'IDLE';
const marc = Match.opponents.find(p => p.role === 'def');

console.log('1 — le o lance e toca para o lado contrario ao do marcador');
{
    marc.model.position.set(1.2, 0, 0.8 * dz);   // a direita e a frente
    const d = DominioOrientado.decidir(rec, () => 0.5);
    verifica(d !== null, 'leu o lance (sorteio dentro da chance)', 'nao leu');
    if (d) {
        const mx = marc.model.position.x, mz = marc.model.position.z, mn = Math.hypot(mx, mz);
        const cos = (d.dir.x * mx + d.dir.z * mz) / mn;
        verifica(cos < 0, `o toque foge do marcador (cos ${cos.toFixed(2)})`, 'tocou para o lado do marcador: cos ' + cos.toFixed(2));
        verifica(!!d.enganou && d.enganou.t > 0, `o marcador fica ${d.enganou && d.enganou.t.toFixed(2)} s em contrape`, 'nao enganou o marcador');
    }
}

console.log('2 — com espaco, toque longo; apertado, curto');
{
    marc.model.position.set(30, 0, 30 * dz);   // longe: campo livre
    const livre = DominioOrientado.decidir(rec, () => 0.5);
    // apertado: adversarios em volta, a 2.5 m
    Match.opponents.slice(1, 7).forEach((o, i) => { const a = i / 6 * Math.PI * 2; o.model.position.set(Math.sin(a) * 2.5, 0, Math.cos(a) * 2.5); });
    const aperto = DominioOrientado.decidir(rec, () => 0.5);
    verifica(livre && livre.dist >= M.toque.longoMin * 0.8, `livre: toque longo (${livre && livre.dist.toFixed(1)} m)`, 'livre: ' + (livre && livre.dist));
    verifica(aperto && aperto.dist <= M.toque.curto * 1.5, `apertado: toque curto (${aperto && aperto.dist.toFixed(1)} m)`, 'apertado: ' + (aperto && aperto.dist));
    Match.opponents.forEach((p, i) => longe(p, i));
}

console.log('3 — quem le mal quase nunca orienta');
{
    let s = 3; const rng = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const orig = rec.atributoDe.bind(rec);
    rec.atributoDe = (campos, base) => (Array.isArray(campos) && campos.includes('tacticalAwa')) ? 50 : orig(campos, base);
    let n = 0; for (let k = 0; k < 200; k++) if (DominioOrientado.decidir(rec, rng)) n++;
    rec.atributoDe = (campos, base) => (Array.isArray(campos) && campos.includes('tacticalAwa')) ? 99 : orig(campos, base);
    let m = 0; for (let k = 0; k < 200; k++) if (DominioOrientado.decidir(rec, rng)) m++;
    rec.atributoDe = orig;
    verifica(n < m && n <= 200 * (M.leitura.base + 0.05), `leitura 50: ${n}/200 orientados; leitura 99: ${m}/200`, `leitura 50: ${n}, 99: ${m}`);
}

console.log('4 — quem recebe a correr para um espaco toca para la');
{
    rec.fsm.currentState = 'RUN_INTO_SPACE';
    rec.runAlvo = { x: -8, z: 10 * dz };
    const d = DominioOrientado.decidir(rec, () => 0.5);
    const ux = -8 / Math.hypot(8, 10), uz = 10 * dz / Math.hypot(8, 10);
    verifica(d && (d.dir.x * ux + d.dir.z * uz) > 0.9, 'segue a corrida', 'direccao ' + JSON.stringify(d && d.dir));
    rec.fsm.currentState = 'IDLE'; rec.runAlvo = null;
}

console.log('5 — o marcador em contrape nao toca na bola durante o engano');
{
    marc.touchLock = 0; marc.velocity.set(3, 0, 0);
    DominioOrientado.aplicarEngano({ marcador: marc, t: 0.4 });
    verifica(marc.touchLock >= 0.4 && marc.velocity.length() < 3, 'touchLock e travado', 'touchLock ' + marc.touchLock);
}

console.log(falhas ? 'FALHOU: ' + falhas : 'OK: dominio orientado.');
process.exit(falhas ? 1 : 0);
