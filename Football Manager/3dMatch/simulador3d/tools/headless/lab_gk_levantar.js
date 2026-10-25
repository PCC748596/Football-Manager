/* Segue o levantar do guarda-redes depois do mergulho do peixinho: altura dos ossos (0 = relvado). Uso: node tools/headless/lab_gk_levantar.js [semente] */
const semente = Number(process.argv[2] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
const dt = 1 / 60;
const scene = new THREE.Scene(); Match.init(scene);
if (typeof Officials !== 'undefined' && Officials.init) Officials.init(scene);
if (typeof Sim === 'undefined') global.Sim = {}; Sim.running = true;
for (let i = 0; i < 120; i++) Match.update(dt);
Match.triggerCruzamento('peixinho', 'TeamA');
const gk = Match.opponents.find(p => p.role === 'gk');
const v = new THREE.Vector3();
const y = (n) => { gk.rig[n].getWorldPosition(v); return v.y; };
let n = 0;
for (let i = 0; i < 6 * 60; i++) {
    Match.update(dt);
    if (gk.dive && gk.dive.fase === 'levantar' && n++ % 3 === 0) {
        gk.model.updateMatrixWorld(true);
        const e = new THREE.Euler().setFromQuaternion(gk.model.quaternion, 'YXZ');
        console.log('t=' + gk.dive.t.toFixed(2), 'ang=' + gk.dive.ang.toFixed(2), 'y0=' + gk.model.position.y.toFixed(2), 'neck=' + y('neck').toFixed(2), 'hip=' + y('lLeg').toFixed(2), 'knee=' + y('lKnee').toFixed(2) + '/' + y('rKnee').toFixed(2), 'foot=' + y('lFoot').toFixed(2) + '/' + y('rFoot').toFixed(2), 'hand=' + y('lHand').toFixed(2) + '/' + y('rHand').toFixed(2), 'rot=(' + e.x.toFixed(2) + ',' + e.z.toFixed(2) + ')');
    }
}
if (!n) console.log('sem levantar nesta semente');
