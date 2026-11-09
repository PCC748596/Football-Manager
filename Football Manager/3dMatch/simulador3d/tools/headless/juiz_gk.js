/*
JUIZ TREPIDANDO COM O GOLEIRO SEGURANDO A BOLA. Mede, por frame, a rotacao e a posicao do arbitro enquanto um GR tem a bola (gkEstado segurando):
inversoes de sentido do giro por segundo e deslocamento total. Uso: node tools/headless/juiz_gk.js [segundos] [semente]
*/
const segundos = Number(process.argv[2] || 900);
const semente = Number(process.argv[3] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
const cena = new THREE.Scene();
Match.init(cena);
if (!Officials.arbitro) Officials.init(cena);
const dt = 1 / 60;
const gks = () => [].concat(Match.players, Match.opponents).filter(p => p.role === 'gk');
let cruz = 0, antVA = null, difSeg = 0; const sv = [];
let revPos = 0, antMov = null; const exPos = [];
let frames = 0, inv = 0, desloc = 0, ant = null, antDif = 0, janelas = 0, emJanela = false;
const exemplos = [];
for (let i = 0; i < Math.round(segundos / dt); i++) {
    Match.update(dt);
    const arb = Officials.arbitro; if (!arb || !arb.model) continue;
    const seg = gks().some(g => g.hasBall && g.gkEstado === 'segurando');
    if (seg && !emJanela) { janelas++; emJanela = true; ant = null; } else if (!seg) emJanela = false;
    if (!seg) continue;
    const y = arb.model.rotation.y, x = arb.model.position.x, z = arb.model.position.z;
    if (ant) {
        let d = Math.atan2(Math.sin(y - ant.y), Math.cos(y - ant.y));
        if (Math.abs(d) > 0.004 && Math.abs(antDif) > 0.004 && Math.sign(d) !== Math.sign(antDif)) { inv++; if (exemplos.length < 12) exemplos.push({ t: +(i * dt).toFixed(2), d: +d.toFixed(4), antDif: +antDif.toFixed(4), parado: !!arb._parado, estado: Match.state, dBola: +Math.hypot(x - Match.ball.position.x, z - Match.ball.position.z).toFixed(1) }); }
        if (Math.abs(d) > 0.004) antDif = d;
        const mx = x - ant.x, mz = z - ant.z, mm = Math.hypot(mx, mz);
        if (antMov && mm > 0.004 && antMov.m > 0.004 && (mx * antMov.x + mz * antMov.z) / (mm * antMov.m) < -0.5) { revPos++; if (exPos.length < 5) exPos.push({ t: +(i * dt).toFixed(2), passo: +mm.toFixed(3), estado: Match.state, dBola: +Math.hypot(x - Match.ball.position.x, z - Match.ball.position.z).toFixed(1) }); }
        if (mm > 0.004) antMov = { x: mx, z: mz, m: mm };
        desloc += mm;
    }
    const va = arb.velAnim; sv.push(va);
    if (typeof va === 'number') { if (antVA !== null && ((antVA < 0.1) !== (va < 0.1))) cruz++; antVA = va; }
    ant = { y, x, z }; frames++;
}
console.log(`semente ${semente}: ${janelas} posses de GR, ${frames} frames (${(frames * dt).toFixed(0)} s), inversoes de giro ${inv} (${(inv / Math.max(1, frames * dt)).toFixed(2)}/s), deslocamento ${desloc.toFixed(1)} m`);
console.log('velAnim: cruzamentos de 0.1 m/s', cruz, 'velAnim media', (sv.filter(v=>typeof v==='number').reduce((a,b)=>a+b,0)/Math.max(1,sv.length)).toFixed(2), 'campo velAnim existe:', typeof Officials.arbitro.velAnim);
console.log('inversoes de movimento (passo>4mm, cos<-0.5):', revPos, JSON.stringify(exPos));
console.log(JSON.stringify(exemplos.slice(0,12)));
process.exit(0);
