const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000);
require('./harness.js');
const dt = 1 / 60;
const scene = new THREE.Scene(); Match.init(scene);
if (typeof Officials !== 'undefined' && Officials.init) Officials.init(scene);
if (typeof Sim === 'undefined') global.Sim = {}; Sim.running = true;
for (let i = 0; i < 120; i++) Match.update(dt);
const lab = Match.triggerCruzamento(process.argv[2] || 'voleio', 'TeamA');
const fin = lab.finalizador;
console.log('ALTURA_BASE_Y', ALTURA_BASE_Y);
for (let i = 0; i < 90; i++) {
    Match.update(dt);
    if (fin.fsm.currentState === 'VOLEIO' || fin.fsm.currentState === 'PEIXINHO') {
        const e = new THREE.Euler().setFromQuaternion(fin.model.quaternion, 'YXZ');
        if (Math.abs(fin.fsm.timer-0.43)<0.01) { fin.model.updateMatrixWorld(true); const w=new THREE.Vector3(); const o=fin.model.position; for (const n of ['neck','lFoot','rFoot','lKnee','rKnee','lLeg','rLeg']) { fin.rig[n].getWorldPosition(w); console.log(n, 'dx='+(w.x-o.x).toFixed(2), 'dy='+(w.y-o.y).toFixed(2), 'dz='+(w.z-o.z).toFixed(2)); } console.log('lado', fin.voleio&&fin.voleio.lado); }
        if (i % 3 === 0) console.log('t=' + fin.fsm.timer.toFixed(2), 'y=' + fin.model.position.y.toFixed(2), 'rotX=' + e.x.toFixed(2), 'rotZ=' + e.z.toFixed(2), 'jumpTimer=' + fin.jumpTimer);
    }
}
