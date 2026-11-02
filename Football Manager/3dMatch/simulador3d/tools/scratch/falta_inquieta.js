require('../headless/harness.js');
const dt = 1/60;
const scene = new THREE.Scene();
Match.init(scene);
if (typeof Officials !== 'undefined' && Officials.init) Officials.init(scene);
if (typeof Tatics !== 'undefined' && Tatics.updateSkills) Tatics.updateSkills();
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
const erros = {}; let emLat = 0, maxLat = 0, n = 0;
for (let i = 0; i < 60*60*30; i++) {
  try { Match.update(dt); } catch (e) { const k = String(e.stack).split('\n').slice(0,3).join(' | '); erros[k] = (erros[k]||0)+1; }
  if (Match.state === 'FREE_KICK') { emLat += dt; maxLat = Math.max(maxLat, emLat); } else { if (emLat>0) n++; emLat = 0; }
}
console.log('laterais', n, 'maxLat', maxLat.toFixed(1)); console.log(erros);
