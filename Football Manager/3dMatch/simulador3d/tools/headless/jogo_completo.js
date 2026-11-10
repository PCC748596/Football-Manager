/*
UM JOGO COMPLETO (90 min de relogio) com os valores dos Sliders (VALORES=ficheiro.json, o JSON do "Copy values") ou com os padroes do codigo (sem VALORES). Imprime uma linha JSON com as estatisticas do jogo.
Uso: [VALORES=ficheiro.json] node tools/headless/jogo_completo.js [semente]
*/
const fs = require('fs'), vm = require('vm'), path = require('path');
const semente = Number(process.argv[2] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
const { RAIZ } = require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;

let aplicados = 0;
if (process.env.VALORES) {
    const v = JSON.parse(fs.readFileSync(process.env.VALORES, 'utf8'));
    vm.runInThisContext(fs.readFileSync(path.join(RAIZ, 'js/sliders_jogo.js'), 'utf8'), { filename: 'sliders_jogo.js' });
    if (SlidersJogo._ligarFatores) SlidersJogo._ligarFatores();
    for (const p of SlidersJogo.parametros) {
        if (v[p.id] === undefined) continue;
        p.escrever(v[p.id]);
        aplicados++;
    }
}
Match.init(new THREE.Scene());

const meio = MatchDuration.halfGameMinutes * 2 * 60;
let i = 0, ult = null, trocas = 0, dur = 0; const durs = [];
while (Match.tempoDeJogo < meio && Match.state !== 'FIM_DE_JOGO' && i < 60 * 1500) {
    Match.update(1 / 60); i++;
    if (Match.state !== 'PLAY') continue;
    const e = Match.possessionTeam;
    if (e !== ult) { if (ult !== null) { trocas++; durs.push(dur); } ult = e; dur = 0; }
    dur += 1 / 60;
}
const A = MatchStats.TeamA, B = MatchStats.TeamB;
const n = (x) => (x && typeof x === 'object' ? (x.tentados ?? x.certos ?? 0) : (x || 0));
const certos = (x) => (x && typeof x === 'object' ? (x.certos ?? x.sucesso ?? 0) : 0);
const cart = (s) => { const c = s.cartoes || {}; return { a: c.amarelos || 0, v: c.vermelhos || 0 }; };
const r = {
    semente, aplicados, segundos: +(i / 60).toFixed(0), min: +(Match.tempoDeJogo / 60).toFixed(0),
    golos: Match.placarA + Match.placarB,
    remates: n(A.remates) + n(B.remates), noAlvo: (A.remates.noAlvo || 0) + (B.remates.noAlvo || 0),
    passes: n(A.passes) + n(B.passes), passesCertos: certos(A.passes) + certos(B.passes),
    faltas: (A.faltas.cometidas || 0) + (B.faltas.cometidas || 0),
    amarelos: cart(A).a + cart(B).a, vermelhos: cart(A).v + cart(B).v,
    desarmes: n(A.desarmes) + n(B.desarmes), desarmesOk: certos(A.desarmes) + certos(B.desarmes),
    dribles: n(A.dribles) + n(B.dribles), driblesOk: certos(A.dribles) + certos(B.dribles),
    cantos: n(A.cantos) + n(B.cantos), impedimentos: n(A.impedimentos) + n(B.impedimentos),
    cruzamentos: n(A.cruzamentos) + n(B.cruzamentos), defesas: n(A.defesas) + n(B.defesas),
    trocasDePosse: trocas, posseMedia: durs.length ? +(durs.reduce((a, b) => a + b, 0) / durs.length).toFixed(1) : 0,
    distanciaKm: +(((A.distanciaPercorrida || 0) + (B.distanciaPercorrida || 0)) / 1000).toFixed(1)
};
console.log('JOGO ' + JSON.stringify(r));
process.exit(0);
