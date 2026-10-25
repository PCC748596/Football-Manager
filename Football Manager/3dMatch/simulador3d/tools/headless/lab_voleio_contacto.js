/* Mede o contacto do voleio / peixinho: distancia pe-bola no instante do toque. Uso: node tools/headless/lab_voleio_contacto.js [voleio|peixinho] [semente] */
const tipo = process.argv[2] || 'voleio', semente = Number(process.argv[3] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
const dt = 1 / 60;
const scene = new THREE.Scene(); Match.init(scene);
if (typeof Officials !== 'undefined' && Officials.init) Officials.init(scene);
if (typeof Sim === 'undefined') global.Sim = {}; Sim.running = true;
for (let i = 0; i < 120; i++) Match.update(dt);
const lab = Match.triggerCruzamento(tipo, 'TeamA');
const fin = lab.finalizador, v = new THREE.Vector3();
let visto = false;
for (let i = 0; i < 240; i++) {
    Match.update(dt);
    const S = fin[tipo];
    if (S && fin.fsm.currentState.toLowerCase() === tipo) {
        const f = fin.fsm.timer;
        if (!visto && S.tocou) { visto = true; { const rig = fin.rig; const pe = (S.lado > 0) ? rig.lFoot : rig.rFoot; fin.model.updateMatrixWorld(true); pe.getWorldPosition(v); const dx = Match.ball.position.x - v.x, dy = Match.ball.position.y - v.y, dz = Match.ball.position.z - v.z; const fx = S.dirx, fz = S.dirz, lx = fz, lz = -fx; console.log('bola relativa ao pe: frente=' + (dx*fx+dz*fz).toFixed(2) + ' esquerda=' + (dx*lx+dz*lz).toFixed(2) + ' cima=' + dy.toFixed(2), 'origem=(' + fin.model.position.x.toFixed(1) + ',' + fin.model.position.y.toFixed(2) + ',' + fin.model.position.z.toFixed(1) + ')'); } console.log('tocou em t=' + f.toFixed(2), 'distContacto=' + (S.distContacto !== undefined ? S.distContacto.toFixed(2) : '-'), 'alvoBola=(' + S.bx.toFixed(1) + ',' + S.by.toFixed(2) + ',' + S.bz.toFixed(1) + ')', 'bolaAgora=(' + Match.ball.position.x.toFixed(1) + ',' + Match.ball.position.y.toFixed(2) + ',' + Match.ball.position.z.toFixed(1) + ')', 'lado=' + S.lado); }
    }
}
if (!visto) console.log('nao tocou');
