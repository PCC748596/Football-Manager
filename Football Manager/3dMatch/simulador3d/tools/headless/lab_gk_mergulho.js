/*
Um remate rasteiro ao canto, com o guarda-redes ao meio: segue o estado dele (mergulho, chao, levantar, segurando).
Uso: node tools/headless/lab_gk_mergulho.js [semente] [x do canto] [velocidade]
*/
const semente = Number(process.argv[2] || 0), alvoX = Number(process.argv[3] || 2.4), vel = Number(process.argv[4] || 18);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
const dt = 1 / 60;
const scene = new THREE.Scene();
Match.init(scene);
if (typeof Officials !== 'undefined' && Officials.init) Officials.init(scene);
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
for (let i = 0; i < 120; i++) Match.update(dt);
const gk = Match.opponents.find(p => p.role === 'gk');
const atk = Match.players.find(p => p.role === 'atk');
const fundoZ = atk.dirZ * (CAMPO_COMP / 2);
const z0 = fundoZ - atk.dirZ * 12;
Match.mudarEstado('PLAY', 'lab'); Match.setPieceTimer = 0; Match.setPieceTaker = null; Match.kickoffActive = false; Match.kickoffTimer = 0; Match.kickoffPendingPassToDef = false; Match.possessionTeam = 'TeamA';
Match.ballCarrier = null; atk.hasBall = false;
Match.lastTouchedTeam = 'TeamA'; Match.lastTouchedPlayer = atk;
Match.ball.position.set(0, 0.2, z0);
const dx = alvoX - 0, dz = fundoZ - z0, d = Math.hypot(dx, dz);
Match.ballVel.set(dx / d * vel, 0.3, dz / d * vel);
let ult = '';
for (let i = 0; i < 12 * 60; i++) {
    Match.update(dt);
    const t = (i + 1) * dt;
    const l = ['t=' + t.toFixed(2), 'gk=' + gk.gkEstado + (gk.dive ? '/' + gk.dive.fase + (gk.dive.agarrou ? '+agarrou' : '') : ''), 'x=' + gk.model.position.x.toFixed(1), 'y=' + gk.model.position.y.toFixed(2),
        'bola=(' + Match.ball.position.x.toFixed(1) + ',' + Match.ball.position.y.toFixed(2) + ',' + Match.ball.position.z.toFixed(1) + ')', 'carrier=' + (Match.ballCarrier ? Match.ballCarrier.role : '-'), 'estado=' + Match.state].join(' | ');
    const k = l.replace(/t=[\d.]+/, '').replace(/x=[-\d.]+ \| y=[-\d.]+/, '').replace(/bola=\(.*?\)/, '');
    if (k !== ult || i % 30 === 0) { console.log(l); ult = k; }
}
