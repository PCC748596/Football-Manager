/*
O ARBITRO CORRE DE COSTAS? Mede, a correr (> 2 m/s), o angulo entre a frente do arbitro (e dos assistentes) e a direccao do movimento, e entre a frente e a bola.
Uso: node tools/headless/arbitro_de_costas.js [segundos] [semente]
*/
const segundos = Number(process.argv[2] || 300);
const semente = Number(process.argv[3] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
const cena = new THREE.Scene();
Match.init(cena);
Officials.arbitro = null; Officials.init(cena);
const dt = 1 / 60;
const graus = (r) => Math.abs(Math.atan2(Math.sin(r), Math.cos(r))) * 180 / Math.PI;
let quem = { arbitro: Officials.arbitro, a1: (Officials.assistentes || [])[0], a2: (Officials.assistentes || [])[1], quarto: Officials.quarto };
const reler = () => { quem = { arbitro: Officials.arbitro, a1: (Officials.assistentes || [])[0], a2: (Officials.assistentes || [])[1], quarto: Officials.quarto }; };
const ant = {}, mov = {}, bola = {};
for (const k in quem) { mov[k] = []; bola[k] = []; }
for (let i = 0; i < Math.round(segundos / dt); i++) {
    Match.update(dt);
    reler();
    for (const k in quem) {
        const o = quem[k]; if (!o || !o.model) continue;
        const p = o.model.position, a = ant[k];
        ant[k] = { x: p.x, z: p.z };
        if (!a) continue;
        const vx = (p.x - a.x) / dt, vz = (p.z - a.z) / dt, v = Math.hypot(vx, vz);
        const frente = o.model.rotation.y;
        if (v > 2) mov[k].push(graus(frente - Math.atan2(vx, vz)));
        const bx = Match.ball.position.x - p.x, bz = Match.ball.position.z - p.z;
        if (Math.hypot(bx, bz) > 3) bola[k].push(graus(frente - Math.atan2(bx, bz)));
    }
}
const q = (arr, f) => arr.length ? arr.slice().sort((x, y) => x - y)[Math.floor(arr.length * f)].toFixed(0) : '-';
for (const k in quem) console.log(k.padEnd(8), 'correndo:', String(mov[k].length).padStart(6), 'frames, frente x movimento mediana', q(mov[k], 0.5), 'p90', q(mov[k], 0.9), '| frente x bola mediana', q(bola[k], 0.5), 'p90', q(bola[k], 0.9), ' >90 graus da bola:', (100 * bola[k].filter(x => x > 90).length / Math.max(1, bola[k].length)).toFixed(1) + '%', ' movimento de costas (>120):', (100 * mov[k].filter(x => x > 120).length / Math.max(1, mov[k].length)).toFixed(1) + '%');
process.exit(0);
