/*
POR QUE O LANCAMENTO NAO SAI? Conta os motivos de recusa do findThroughBall (bt/player_bt.js) e o que acontece depois (aceite pelo LancamentoDecisao, executado).
Uso: node tools/headless/lancamentos_porque.js [segundos] [semente]
*/
const segundos = Number(process.argv[2] || 600), semente = Number(process.argv[3] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
globalThis.__tbDiag = {};
require('./harness.js');
const dt = 1 / 60;
const scene = new THREE.Scene();
Match.init(scene);
if (typeof Officials !== 'undefined' && Officials.init) Officials.init(scene);
if (typeof Tatics !== 'undefined' && Tatics.updateSkills) Tatics.updateSkills();
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
let aceites = 0, recusadosDecisao = 0;
if (typeof LancamentoDecisao !== 'undefined') { const o = LancamentoDecisao.aceita.bind(LancamentoDecisao); LancamentoDecisao.aceita = (e) => { const r = o(e); r ? aceites++ : recusadosDecisao++; return r; }; }
for (let i = 0; i < Math.round(segundos / dt); i++) Match.update(dt);
console.log(`semente ${semente} (${segundos}s)`);
Object.entries(globalThis.__tbDiag).sort().forEach(([k, v]) => console.log('  ' + k.padEnd(32) + v));
console.log(`  LancamentoDecisao: aceites ${aceites}, recusados ${recusadosDecisao}`);
