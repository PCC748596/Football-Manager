/*
DURACAO DO TEMPO (Settings 10/15/20 min reais): joga o PRIMEIRO TEMPO (ate o relogio chegar a 45:00) com `MatchDuration.halfRealMinutes` = DUR e conta os eventos, para ver se os totais por tempo se mantem
com a duracao. Os segundos sao de SIMULACAO (a 15 min sao 1.5x mais que a 10).
Uso: DUR=15 node tools/headless/duracao.js [semente] ; RITMO=0 desliga a compensacao (MatchDuration.compensar = false)
*/
const semente = Number(process.argv[2] || 0), dur = Number(process.env.DUR || 10);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
MatchDuration.halfRealMinutes = dur;
if (process.env.RITMO === '0' && 'compensar' in MatchDuration) MatchDuration.compensar = false;
Match.init(new THREE.Scene());
let i = 0, ult = null, trocas = 0;
const meio = MatchDuration.halfGameMinutes * 60;
while (Match.tempoDeJogo < meio && i < 60 * 3000) { Match.update(1 / 60); i++; const e = Match.possessionTeam; if (e !== ult) { if (ult !== null) trocas++; ult = e; } }
const A = MatchStats.TeamA, B = MatchStats.TeamB, n = (x) => (typeof x === 'object' ? (x.tentados ?? x.certos ?? 0) : (x || 0));
console.log(`DUR ${dur} semente ${semente}: ${(i / 60).toFixed(0)} s de simulacao | passes ${n(A.passes) + n(B.passes)} | remates ${n(A.remates) + n(B.remates)} | faltas ${(A.faltas.cometidas || 0) + (B.faltas.cometidas || 0)} | desarmes ${n(A.desarmes) + n(B.desarmes)} | dribles ${n(A.dribles) + n(B.dribles)} | trocas de posse ${trocas} | golos ${Match.placarA + Match.placarB} | cantos ${n(A.cantos) + n(B.cantos)}`);
process.exit(0);
