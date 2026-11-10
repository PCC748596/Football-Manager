/*
AS TRANSICOES (ZonasModel.transicao): mede o jogo com o salto antigo (TR=velho) e com a bola lida em z fixo (padrao).
Escreve: duracao media da posse, trocas de posse por minuto, passes, remates, golos, recuperacoes, tempo por corredor (entre areas) e, no inicio de cada transicao, quantos jogadores
mudam de alvo mais de 3 m em 1 s (um indicador do "salto" das linhas).
Uso: node tools/headless/transicoes.js [segundos] [semente] ; TR=velho
*/
const segundos = Number(process.argv[2] || 1200), semente = Number(process.argv[3] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
if (process.env.TR === 'velho') ZonasModel.transicao = { duracao: 3.0, avancoOfensivo: 14.0, recuoDefensivo: 8.0 };
if (process.env.PCH === 'velho') { PressaoDoChaser.velFator = 1; PressaoDoChaser.histerese = 4; }
if (process.env.SETORES) Tatics.setores = process.env.SETORES.split(',');
const lim = CAMPO_COMP / 2 - 16.5, c = CAMPO_LARG / 6;
let jogo = 0, ult = null, dur = 0; const durs = []; let trocas = 0;
const t = { esq: 0, cen: 0, dir: 0 };
for (let i = 0; i < segundos * 60; i++) {
    Match.update(1 / 60);
    if (Match.state !== 'PLAY') continue;
    jogo += 1 / 60;
    const eq = Match.possessionTeam;
    if (eq !== ult) { if (ult !== null) { trocas++; durs.push(dur); } ult = eq; dur = 0; }
    dur += 1 / 60;
    if (!Match.ball || (eq !== 'TeamA' && eq !== 'TeamB')) continue;
    const port = Match.ballCarrier; if (port && port.role === 'gk') continue;
    const dirZ = (eq === 'TeamA' ? Match.players : Match.opponents)[0].dirZ || 1;
    const x = Match.ball.position.x * dirZ;
    if (Math.abs(Match.ball.position.z) < lim) t[x < -c ? 'esq' : (x > c ? 'dir' : 'cen')]++;
}
const A = MatchStats.TeamA, B = MatchStats.TeamB;
const media = durs.length ? durs.reduce((a, b) => a + b, 0) / durs.length : 0;
const s = t.esq + t.cen + t.dir || 1;
console.log(`${process.env.TR === 'velho' ? 'VELHO' : 'NOVO '} semente ${semente}: jogo ${jogo.toFixed(0)}s | posse media ${media.toFixed(1)}s, ${(trocas / (jogo / 60)).toFixed(1)} trocas/min | passes ${A.passes.certos + B.passes.certos}/${A.passes.tentados + B.passes.tentados} | remates ${A.remates.tentados + B.remates.tentados} golos ${Match.placarA + Match.placarB} | recuperacoes ${A.recuperacoes + B.recuperacoes} | trocas de chaser ${((A.trocasChaser + B.trocasChaser) / (jogo / 60)).toFixed(1)}/min | corredores esq ${(100 * t.esq / s).toFixed(0)}% cen ${(100 * t.cen / s).toFixed(0)}% dir ${(100 * t.dir / s).toFixed(0)}%`);
process.exit(0);
