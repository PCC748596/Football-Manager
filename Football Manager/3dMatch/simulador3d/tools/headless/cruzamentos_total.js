/*
QUANTOS CRUZAMENTOS por jogo. CRUZ_VELHO=1 poe os bonus de cruzamento nos valores antigos (0.72 / 0.42 / 0.60 / chanceBase 0.54); sem ele ficam os da config.
Uso: [CRUZ_VELHO=1] node tools/headless/cruzamentos_total.js [segundos] [semente]
*/
const segundos = Number(process.argv[2] || 900), semente = Number(process.argv[3] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
if (process.env.CRUZ_VELHO) Object.assign(CrossModel, { bonusLargura: 0.72, bonusFundo: 0.42, pesoGrid: 0.60, chanceBase: 0.54 });
const PlayerCls = Match.players[0].constructor;
const orig = PlayerCls.prototype.initiatePass; let cruz = 0;
PlayerCls.prototype.initiatePass = function () { if (this.isCross) cruz++; return orig.apply(this, arguments); };
const dt = 1 / 60;
for (let i = 0; i < Math.round(segundos / dt); i++) Match.update(dt);
console.log(`${process.env.CRUZ_VELHO ? 'velho' : 'novo'} s${semente}: cruzamentos ${cruz} em ${segundos}s | golos ${Match.placarA + Match.placarB}`);
process.exit(0);
