/*
O CARTAO NUM JOGO CORRIDO (e nao forcado): em cada cartao dado durante o jogo, mede o desvio (graus) entre a frente do corpo do arbitro e o jogador, e entre o braco esquerdo (que aponta) e o jogador, por fase.
Uso: node tools/headless/cartao_jogo.js [segundos] [semente]
*/
const segundos = Number(process.argv[2] || 1500), semente = Number(process.argv[3] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js'); if (typeof Sim === 'undefined') global.Sim = {}; Sim.running = true;
Match.init(new THREE.Scene()); if (Officials.init) Officials.init(new THREE.Scene());
const res = { ir: [], mostrar: [], guardar: [] }; let cartoes = 0, costas = 0;
const orig = Officials.mostrarCartao.bind(Officials); Officials.mostrarCartao = function (j, c) { cartoes++; return orig(j, c); };
const v = new THREE.Vector3();
for (let i = 0; i < segundos * 60; i++) {
    Match.update(1 / 60);
    const c = Officials.cartaoEmCurso; if (!c) continue;
    const a = Officials.arbitro.model, jp = c.jogador.model.position;
    const alvo = Math.atan2(jp.x - a.position.x, jp.z - a.position.z);
    const d = Math.abs(Math.atan2(Math.sin(a.rotation.y - alvo), Math.cos(a.rotation.y - alvo))) * 180 / Math.PI;
    if (res[c.fase]) res[c.fase].push(d);
    const b = Match.ball.position; const aB = Math.atan2(b.x - a.position.x, b.z - a.position.z); const dB = Math.abs(Math.atan2(Math.sin(a.rotation.y - aB), Math.cos(a.rotation.y - aB))) * 180 / Math.PI; (res.bola = res.bola || []).push(dB); if (dB > 100) costas++;
}
const q = (x, f) => x.length ? x.sort((p, r) => p - r)[Math.floor(x.length * f)].toFixed(0) : '-';
console.log(`s${semente}: ${cartoes} cartoes`);
for (const f of ['ir', 'mostrar', 'guardar']) console.log(`  ${f}: ${res[f].length} frames | desvio do corpo ao jogador: med ${q(res[f], .5)} p90 ${q(res[f], .9)} max ${q(res[f], .999)} graus`);
console.log(`  corpo virado para a bola: desvio med ${q(res.bola || [], .5)} p90 ${q(res.bola || [], .9)} graus; DE COSTAS (>100): ${costas} de ${(res.bola || []).length} frames`);
process.exit(0);
