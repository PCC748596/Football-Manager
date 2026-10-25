/* Segue a comemoracao de teste. Uso: node tools/headless/lab_comemoracao.js [soco|joelhos|punho] [semente] */
const tipo = process.argv[2] || 'soco', semente = Number(process.argv[3] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
const dt = 1 / 60;
const scene = new THREE.Scene(); Match.init(scene);
if (typeof Officials !== 'undefined' && Officials.init) Officials.init(scene);
if (typeof Sim === 'undefined') global.Sim = {}; Sim.running = true; window.comemoracaoNaSimulacao = true;
for (let i = 0; i < 240; i++) Match.update(dt);
if (process.env.RAIO) ComemoracaoGol.apoio.raioMax = Number(process.env.RAIO);
const ok = Match.celebracaoTeste(tipo);
console.log('iniciou:', ok, 'participantes:', Comemoracao.participantes.map(x => x.papel).join(','));
const aut = Comemoracao.autor;
for (let i = 0; i < 12 * 60 && Comemoracao.ativa; i++) {
    Match.update(dt);
    if (i % 30 === 0) {
        const pos = aut.model.position, e = new THREE.Euler().setFromQuaternion(aut.model.quaternion, 'YXZ');
        console.log('t=' + ((i + 1) * dt).toFixed(1), 'autor=' + aut.fsm.currentState + (aut.comemoracao ? '/' + aut.fsm.timer.toFixed(1) : ''), 'pos=(' + pos.x.toFixed(1) + ',' + pos.y.toFixed(2) + ',' + pos.z.toFixed(1) + ')', 'yaw=' + e.y.toFixed(2), 'apoio=' + Comemoracao.participantes.filter(x => x.papel === 'apoio').map(x => x.fase + ':' + x.p.model.position.distanceTo(pos).toFixed(1)).join(' '));
    }
}
console.log('acabou em', Comemoracao.t.toFixed(1), 's');
