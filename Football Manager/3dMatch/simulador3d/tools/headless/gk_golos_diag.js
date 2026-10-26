/*
O QUE O GUARDA-REDES FAZIA QUANDO SOFREU GOLO: estado, reaccao, velocidade e altura da bola, distancia do remate, tipo. Corre `N` jogos da Serie A (20 min de relogio = 90 de jogo) e escreve uma linha por golo.
Uso: node tools/headless/gk_golos_diag.js [jogos 6] [semente 0] [LIGA_SET como no liga_serie_a.js]
*/
const N = Number(process.argv[2] || 6), semente = Number(process.argv[3] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
require('./harness.js');
const NOMES = ['Atlético-PR', 'Atlético-MG', 'Bahia-BA', 'Botafogo-RJ', 'Chapecoense-SC', 'Corinthians-SP', 'Coritiba-PR', 'Cruzeiro-MG', 'Flamengo-RJ', 'Fluminense-RJ', 'Grêmio-RS', 'Internacional-RS', 'Mirassol-SP', 'Palmeiras-SP', 'Bragantino-SP', 'Remo-PA', 'Santos-SP', 'São Paulo-SP', 'Vasco-RJ', 'Vitória-BA'];
const cena = new THREE.Scene(); Match.init(cena);
if (typeof Officials !== 'undefined' && Officials.init) Officials.init(cena);
if (typeof Sim === 'undefined') global.Sim = {}; Sim.running = true;
if (process.env.LIGA_SET) for (const par of process.env.LIGA_SET.split(';')) { const [lhs, rhs] = par.split('='); const parts = lhs.trim().split('.'); let o = (0, eval)(parts[0]); for (let q = 1; q < parts.length - 1; q++) o = o[parts[q]]; o[parts[parts.length - 1]] = JSON.parse(rhs); }
const dt = 1 / 60;
const linhas = [];
let jogos = 0, golos = 0;
for (let j = 0; j < N; j++) {
    Math.random = mulberry32(9000 + semente * 131 + j * 977);
    const a = NOMES[(j * 7 + semente) % 20], b = NOMES[(j * 7 + semente + 5) % 20];
    const ea = SquadsData.equipas.find(e => e.nome === a), eb = SquadsData.equipas.find(e => e.nome === b);
    Match.primeiroTempoAcabou = false; Match.acrescimo1 = 0; Match.acrescimo2 = 0; Match.acr1Calculado = false; Match.acr2Calculado = false;
    Match.trocarEquipas({ A: ea.id, B: eb.id });
    MatchStats.reset(); Match.tempoDeJogo = 0; Match.placarA = 0; Match.placarB = 0;
    Match.mudarEstado('PLAY', 'diag');
    let ant = Match.placarA + Match.placarB, hist = [];
    for (let f = 0; f < 20 * 60 / dt; f++) {
        Match.update(dt);
        const gkA = Match.players[0], gkB = Match.opponents[0];
        const b2 = Match.ball.position, v = Match.ballVel;
        hist.push({ t: Match.tempoDeJogo, gkA: gkA && gkA.gkEstado, gkB: gkB && gkB.gkEstado, bx: b2.x, by: b2.y, bz: b2.z, v: v.length(), vz: v.z, ult: Match.lastTouchedPlayer ? Match.lastTouchedPlayer.pos : '?', reA: gkA && gkA.gkReagiu, reB: gkB && gkB.gkReagiu });
        if (hist.length > 90) hist.shift();
        const agora = Match.placarA + Match.placarB;
        if (agora !== ant) {
            golos++;
            const marcouA = Match.placarA > (agora - 1 - Match.placarB + 0) ? true : false;
            // o guarda-redes que sofreu: o do lado onde a bola entrou (z)
            const h = hist[hist.length - 1], antes = hist[Math.max(0, hist.length - 30)], mid = hist[Math.max(0, hist.length - 15)];
            const sofreuB = h.bz > 0 ? (Match.players[0] && Match.players[0].ownGoalZ > 0 ? 'A' : 'B') : (Match.players[0] && Match.players[0].ownGoalZ < 0 ? 'A' : 'B');
            const gk = sofreuB === 'A' ? 'gkA' : 'gkB', re = sofreuB === 'A' ? 'reA' : 'reB';
            linhas.push({ min: Math.floor(h.t / 60 + 1), gk: h[gk] + '<-' + mid[gk] + '<-' + antes[gk], reagiu: h[re], vBola: +h.v.toFixed(1), y: +h.by.toFixed(2), x: +Math.abs(h.bx).toFixed(1), ult: h.ult, vAntes: +antes.v.toFixed(1), zAntes: +Math.abs(antes.bz).toFixed(1) });
            ant = agora;
        }
    }
    jogos++;
}
const cont = {};
linhas.forEach(l => { const k = l.gk.split('<-')[0]; cont[k] = (cont[k] || 0) + 1; });
console.log('jogos', jogos, 'golos', golos, '(' + (golos / jogos).toFixed(2) + ' por jogo) | estado do GK no golo:', JSON.stringify(cont));
linhas.slice(0, 40).forEach(l => console.log(JSON.stringify(l)));
process.exit(0);
