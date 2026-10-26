/*
O Full-back Finisher e a ultrapassagem pela ponta. Força `fullback_finisher` nos laterais da casa e mede, nos frames
em que a equipa tem a bola do lado dele (ala), quanto ele está à frente (+) ou atrás (-) da linha da bola.
Uso: node tools/headless/lateral_finisher.js [segundos] [semente]
*/
const segundos = Number(process.argv[2] || 400);
const semente = Number(process.argv[3] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
for (const p of Match.players) if (p.pos === 'LB' || p.pos === 'RB') p.playingStyle = 'fullback_finisher';
const dt = 1 / 60; const d = []; let wide = 0;
for (let i = 0; i < Math.round(segundos / dt); i++) {
    Match.update(dt);
    if (i % 6 || Match.state !== 'PLAY' || Match.possessionTeam !== Match.players[0].team) continue;
    for (const p of Match.players) {
        if (p.pos !== 'LB' && p.pos !== 'RB' || !p.model || Match.ballCarrier === p) continue;
        const lado = Math.sign(p.baseTarget.x) || 1;
        if (Math.sign(Match.ball.position.x) !== lado || Math.abs(Match.ball.position.x) < 15) continue;
        (global.M = global.M || {})[String(p._apoioModo) + '/' + p._apoioLarg + '/' + p.styleAtivo] = ((global.M || {})[String(p._apoioModo) + '/' + p._apoioLarg + '/' + p.styleAtivo] || 0) + 1;
        d.push(p.model.position.z * p.dirZ - Match.ball.position.z * p.dirZ);
        if (Math.abs(p.model.position.x) > 22) wide++;
    }
}
d.sort((a, b) => a - b);
const q = (f) => d.length ? d[Math.floor(d.length * f)].toFixed(1) : 'n/d';
console.log(`semente ${semente}: ${d.length} amostras (bola na ala dele). Z do lateral menos Z da bola: p10 ${q(0.1)} med ${q(0.5)} p90 ${q(0.9)}; na ponta (|x|>22): ${(100 * wide / Math.max(1, d.length)).toFixed(0)}%`);

console.log(global.M);
