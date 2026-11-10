/*
FOLGA ENTRE A LINHA DEFENSIVA E O MEIO-CAMPO, sem a bola: por formacao, a distancia em profundidade entre o defensor MAIS AVANCADO e o meia mais recuado (e, a parte, entre o zagueiro mais avancado e o DM/CM mais recuado), medida
a cada 0.25 s com o time a defender. Uso: FORM="4-2-3-1" [LINHA=60] node tools/headless/folga_linhas.js [segundos] [semente]
*/
const segundos = Number(process.argv[2] || 600), semente = Number(process.argv[3] || 0), form = process.env.FORM || '4-4-2';
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Tatics.formacaoA = form; Tatics.formacaoB = form;
if (process.env.FOLGA === '0') FolgaMeioDefesa.activo = false;
Match.init(new THREE.Scene());
const g = [], gc = [];
for (let i = 0; i < segundos * 60; i++) {
  Match.update(1 / 60);
  if (Match.state !== 'PLAY' || i % 15) continue;
  for (const [lista, team] of [[Match.players, 'TeamA'], [Match.opponents, 'TeamB']]) {
    const bb = TeamAI.get(team); if (!bb || bb.isAttacking) continue;
    const campo = lista.filter(p => p.role !== 'gk' && p.model && !p.expulso);
    const z = (p) => p.model.position.z * p.dirZ;
    const def = campo.filter(p => p.role === 'def'), mid = campo.filter(p => p.role === 'mid');
    if (!def.length || !mid.length) continue;
    g.push(Math.min(...mid.map(z)) - Math.max(...def.map(z)));
    const cb = def.filter(p => p.pos === 'CB'), cm = mid.filter(p => p.pos === 'DM' || p.pos === 'CM');
    if (cb.length && cm.length) gc.push(Math.min(...cm.map(z)) - Math.max(...cb.map(z)));
  }
}
const q = (a, p) => { a = a.slice().sort((x, y) => x - y); return a[Math.floor(a.length * p)]; };
const pct = (a, lim) => (100 * a.filter(x => x < lim).length / Math.max(1, a.length)).toFixed(0);
console.log(`${form.padEnd(10)} s${semente}: n=${g.length} | linha def x meia mais recuado: mediana ${q(g, 0.5).toFixed(1)} m, p10 ${q(g, 0.1).toFixed(1)}, <3 m ${pct(g, 3)}%, <0 m ${pct(g, 0)}% | CB x DM/CM: mediana ${gc.length ? q(gc, 0.5).toFixed(1) : '-'} m, p10 ${gc.length ? q(gc, 0.1).toFixed(1) : '-'}, <3 m ${pct(gc, 3)}%, <0 m ${pct(gc, 0)}%`);
process.exit(0);
