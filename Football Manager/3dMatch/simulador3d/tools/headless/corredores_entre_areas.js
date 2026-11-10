/* TEMPO DE BOLA POR CORREDOR so entre as duas grandes areas (|z| < 52.5 - 16.5). Uso: node tools/headless/corredores_entre_areas.js [segundos] [semente] ; SETORES=esq,dir|nenhum */
const segundos = Number(process.argv[2] || 1500), semente = Number(process.argv[3] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
if (process.env.FORM) { Tatics.formacaoA = process.env.FORM; Tatics.formacaoB = process.env.FORM; }
Match.init(new THREE.Scene());
if (process.env.CFP === '0') BalancoCorredores.cfPeso.activo = false;
if (process.env.ALA === '0') AlaConduz.activo = false;
if (process.env.SETORES) Tatics.setores = process.env.SETORES === 'nenhum' ? [] : process.env.SETORES.split(',');
TempoPorCorredor.reset();
const lim = CAMPO_COMP / 2 - 16.5, c = CAMPO_LARG / 6;
const t = { esq: 0, cen: 0, dir: 0 }, todo = { esq: 0, cen: 0, dir: 0 };
for (let i = 0; i < segundos * 60; i++) {
    Match.update(1 / 60);
    if (Match.state !== 'PLAY' || !Match.ball) continue;
    const eq = Match.possessionTeam; if (eq !== 'TeamA' && eq !== 'TeamB') continue;
    const port = Match.ballCarrier; if (port && port.role === 'gk') continue;
    const dirZ = (eq === 'TeamA' ? Match.players : Match.opponents)[0].dirZ || 1;
    const x = Match.ball.position.x * dirZ, z = Math.abs(Match.ball.position.z);
    const k = x < -c ? 'esq' : (x > c ? 'dir' : 'cen');
    todo[k]++; if (z < lim) t[k]++;
}
const f = (o) => { const s = o.esq + o.cen + o.dir || 1; return `esq ${(100 * o.esq / s).toFixed(0)}% cen ${(100 * o.cen / s).toFixed(0)}% dir ${(100 * o.dir / s).toFixed(0)}% (${(s / 60).toFixed(0)} s)`; };
console.log(`form ${Tatics.formacaoA} semente ${semente} setores ${Tatics.setores.join(',') || 'nenhum'} | largura de cada corredor ${(c * 2).toFixed(1)} m (campo ${CAMPO_LARG}) | entre areas: ${f(t)} | campo todo: ${f(todo)}`);
process.exit(0);
