/*
DE ONDE SE REMATA E O QUE ACONTECE: distribui os remates por distancia a baliza (dentro da area / ate 22 m / 22-28 / mais) e conta golos e defesas do guarda-redes.
Uso: node tools/headless/remates_distancia.js [segundos] [semente]
*/
const segundos = Number(process.argv[2] || 900), semente = Number(process.argv[3] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
const PlayerCls = Match.players[0].constructor;
const orig = PlayerCls.prototype.initiateShoot;
const bins = { area: 0, ate22: 0, de22a28: 0, mais28: 0 };
PlayerCls.prototype.initiateShoot = function () {
    const d = Math.hypot(this.model.position.x, this.model.position.z - this.targetGoalZ);
    const dentro = Math.abs(this.targetGoalZ - this.model.position.z) <= 16.5 && Math.abs(this.model.position.x) <= 20.16;
    if (dentro) bins.area++; else if (d <= 22) bins.ate22++; else if (d <= 28) bins.de22a28++; else bins.mais28++;
    return orig.apply(this, arguments);
};
const dt = 1 / 60;
for (let i = 0; i < Math.round(segundos / dt); i++) Match.update(dt);
const tot = bins.area + bins.ate22 + bins.de22a28 + bins.mais28;
const defesas = (MatchStats.TeamA.defesas || 0) + (MatchStats.TeamB.defesas || 0);
console.log(`s${semente} ${segundos}s: remates ${tot} (na area ${bins.area}, fora ate 22m ${bins.ate22}, 22-28m ${bins.de22a28}, >28m ${bins.mais28}); fora da area ${(100 * (tot - bins.area) / Math.max(1, tot)).toFixed(0)}% | golos ${Match.placarA + Match.placarB}, defesas ${defesas}`);
process.exit(0);
