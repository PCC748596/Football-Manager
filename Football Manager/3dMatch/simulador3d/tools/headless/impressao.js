/* IMPRESSAO DETERMINISTICA do jogo (para provar que um refactor nao mudou o comportamento). Uso: node tools/headless/impressao.js [segundos] [semente] */
const segundos = Number(process.argv[2] || 600), semente = Number(process.argv[3] || 5);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
let h = 0;
for (let i = 0; i < segundos * 60; i++) {
    Match.update(1 / 60);
    if (i % 30 === 0 && Match.ball) h = (h * 31 + Math.round(Match.ball.position.x * 10) * 7 + Math.round(Match.ball.position.z * 10)) | 0;
}
const A = MatchStats.TeamA, B = MatchStats.TeamB;
console.log('IMPRESSAO', h, A.passes, B.passes, A.remates, B.remates, JSON.stringify(A.desarmes), JSON.stringify(B.desarmes), A.dribles, B.dribles, Match.placarA, Match.placarB);
process.exit(0);
