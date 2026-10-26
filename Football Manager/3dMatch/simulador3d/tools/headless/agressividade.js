/*
A AGRESSIVIDADE muda as faltas? A equipa A joga com a agressividade dada (a B fica balanceada); conta as faltas de cada uma (Eventos FALTA).
Uso: node tools/headless/agressividade.js <muito_passiva|passiva|balanceada|agressiva|muito_agressiva> [segundos] [semente]
*/
const nivel = process.argv[2] || 'balanceada', segundos = Number(process.argv[3] || 900), semente = Number(process.argv[4] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
Tatics.porEquipa.TeamA = { agressividade: nivel };
const dt = 1 / 60;
for (let i = 0; i < Math.round(segundos / dt); i++) Match.update(dt);
const f = (t) => Eventos.lista.filter(e => e.tipo === 'FALTA' && e.equipa === t).length;
console.log(`${nivel} s${semente}: faltas A ${f('TeamA')}  B ${f('TeamB')}`);
process.exit(0);
