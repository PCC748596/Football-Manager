/*
O ARBITRO E OS ASSISTENTES ANDAM DE COSTAS NA ABERTURA / INTERVALO? Corre a entrada pelo tunel e depois o jogo, e por ESTADO (ABERTURA/entrada, /espera, GOAL, PLAY...) mede, em movimento (> 1 m/s),
a fatia dos frames em que a frente esta a mais de 100 graus do rumo do movimento (andar de costas) e a mais de 100 graus da bola.
Uso: node tools/headless/arbitro_abertura_costas.js [intervalo]
*/
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + Number(process.argv[3] || 0) * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = false;
const cena = new THREE.Scene();
Match.init(cena);
Officials.init(cena);
const modo = process.argv[2] || 'inicio';
if (modo === 'inicio') Abertura.iniciar(); else if (Abertura.iniciarIntervalo) Abertura.iniciarIntervalo(); else Abertura.iniciar();
const dt = 1 / 60;
const graus = (r) => Math.abs(Math.atan2(Math.sin(r), Math.cos(r))) * 180 / Math.PI;
const get = () => ({ arbitro: Officials.arbitro, a1: (Officials.assistentes || [])[0], a2: (Officials.assistentes || [])[1] });
const ant = {}, st = {};
for (let i = 0; i < Math.round(150 / dt); i++) {
    Match.update(dt);
    const chave = Match.state + '/' + (Abertura.fase || '-');
    const quem = get();
    for (const k in quem) {
        const o = quem[k]; if (!o || !o.model || !o.model.visible) continue;
        const p = o.model.position, a = ant[k]; ant[k] = { x: p.x, z: p.z };
        if (!a) continue;
        const vx = (p.x - a.x) / dt, vz = (p.z - a.z) / dt, v = Math.hypot(vx, vz);
        if (v < 1) continue;
        const e = (st[chave + ' ' + k] = st[chave + ' ' + k] || { n: 0, costasMov: 0, costasBola: 0, pior: 0 });
        e.n++;
        const dm = graus(o.model.rotation.y - Math.atan2(vx, vz));
        if (dm > 100) { e.costasMov++; if (k === 'arbitro') { const c = (e.causas = e.causas || {}); const ch = (o.sinal ? 'sinal' : '') + (Officials.cartaoEmCurso ? ' cartao' : '') + ' v' + v.toFixed(0); c[ch.trim() || 'nenhuma'] = (c[ch.trim() || 'nenhuma'] || 0) + 1; } }
        e.pior = Math.max(e.pior, dm);
        const bx = Match.ball.position.x - p.x, bz = Match.ball.position.z - p.z;
        if (Math.hypot(bx, bz) > 3 && graus(o.model.rotation.y - Math.atan2(bx, bz)) > 100) e.costasBola++;
    }
    if (Match.state === 'PLAY' && i > 60 * 60) break;
}
for (const k of Object.keys(st).sort()) { const e = st[k]; console.log(k.padEnd(28), String(e.n).padStart(6), 'frames | de costas p/ o rumo', (100 * e.costasMov / e.n).toFixed(1).padStart(5) + '% (pior ' + e.pior.toFixed(0) + ') | de costas p/ a bola', (100 * e.costasBola / e.n).toFixed(1) + '%'); }
for (const k of Object.keys(st)) if (st[k].causas) console.log(k, 'causas:', JSON.stringify(st[k].causas));
process.exit(0);
