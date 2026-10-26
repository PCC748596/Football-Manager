/*
O ARBITRO NO CARTAO: durante a fase 'ir' (a correr ate ao jogador) e 'mostrar' (cartao no ar) mede o desvio (graus) entre a frente do corpo dele e a direccao do jogador, a cada frame.
Uso: node tools/headless/cartao_orientacao.js [semente] [n]
*/
const semente = Number(process.argv[2] || 0), N = Number(process.argv[3] || 6);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {}; Sim.running = true;
Match.init(new THREE.Scene());
if (Officials.init) Officials.init(new THREE.Scene());
const dt = 1 / 60;
for (let i = 0; i < 60 * 20; i++) Match.update(dt);
const res = { ir: [], mostrar: [] };
for (let k = 0; k < N; k++) {
    for (let i = 0; i < 60 * 25; i++) Match.update(dt);
    const lista = Match.players.concat(Match.opponents).filter(p => p.role !== 'gk' && p.model);
    const j = lista[Math.floor(Math.random() * lista.length)];
    Officials.mostrarCartao(j, 'amarelo');
    for (let i = 0; i < 60 * 12 && Officials.cartaoEmCurso; i++) {
        Match.update(dt);
        const c = Officials.cartaoEmCurso; if (!c) break;
        const a = Officials.arbitro.model, jp = j.model.position;
        const alvo = Math.atan2(jp.x - a.position.x, jp.z - a.position.z);
        let d = Math.abs(Math.atan2(Math.sin(a.rotation.y - alvo), Math.cos(a.rotation.y - alvo))) * 180 / Math.PI;
        if (res[c.fase]) res[c.fase].push(d);
    }
}
const q = (a, f) => a.length ? a.sort((x, y) => x - y)[Math.floor(a.length * f)].toFixed(0) : '-';
for (const f of ['ir', 'mostrar']) console.log(`${f}: ${res[f].length} frames | desvio da frente do corpo ao jogador: med ${q(res[f], .5)}  p90 ${q(res[f], .9)}  max ${q(res[f], .999)} graus; >45 graus: ${(100 * res[f].filter(d => d > 45).length / Math.max(1, res[f].length)).toFixed(0)}%`);
process.exit(0);
