/*
FALTAS CRUZADAS PARA A AREA — quem chega a bola. Monta N faltas num ponto sorteado de um CENARIO (a TeamA cobra), deixa correr ate 7 s depois
da cobranca e conta: a rotina/decisao montada, o alvo do cruzamento, QUEM TOCA PRIMEIRO depois do batedor (atacante / defensor / guarda-redes /
ninguem), remates e golos da TeamA nesses 7 s, e a distancia do atacante mais perto do alvo quando a bola la chega.

Uso:  [SEM_NOVAS=1] node tools/headless/faltas_area.js [cenario longe|lateral] [n 60] [semente 1]
*/
const cenario = process.argv[2] || 'longe';
const N = Number(process.argv[3] || 60);
const semente = Number(process.argv[4] || 1);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(4242 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
// SEM_NOVAS=1: sem as rotinas cruz_longe/cruz_lateral (para comparar com o comportamento de antes)
if (process.env.SEM_NOVAS === '1') FaltaRotinas.rotinas = FaltaRotinas.rotinas.filter(r => !/^cruz_/.test(r.nome));
const dt = 1 / 60;
const r = Math.random;
const cont = { jogadas: 0, rotina: {}, decisao: {}, alvo: {}, primeiro: { atacante: 0, defensor: 0, gk: 0, ninguem: 0 }, remates: 0, golos: 0, distAlvo: [] };

for (let k = 0; k < N; k++) {
    // a falta: no cenario, para a TeamA atacar
    const dir = Lados.dirDe('TeamA'), fundo = dir * (CAMPO_COMP / 2);
    let x, d;
    if (cenario === 'lateral') { x = (r() < 0.5 ? -1 : 1) * (20 + r() * 9); d = 8 + r() * 16; }
    else { x = (r() * 2 - 1) * 20; d = 32 + r() * 20; }
    Match.mudarEstado('PLAY', 'lote');
    Match.ball.position.set(x, BallPhysics.raio, fundo - dir * d);
    Match.ballVel.set(0, 0, 0);
    Match.ballCarrier = null;
    Match.players.concat(Match.opponents).forEach(p => { p.hasBall = false; });
    Match.setupSetPiece('FREE_KICK', 'TeamA');
    const plano = Match.rotinaPlano;
    const nome = plano ? plano.rotina.nome : '(sem rotina)';
    cont.rotina[nome] = (cont.rotina[nome] || 0) + 1;
    const dec = Match.decisaoFaltaMontada || '?';
    cont.decisao[dec] = (cont.decisao[dec] || 0) + 1;
    const taker = Match.setPieceTaker;
    const rem0 = (MatchStats.TeamA && MatchStats.TeamA.remates && MatchStats.TeamA.remates.tentados) || 0, gol0 = Match.placarA;
    // ate a cobranca (no maximo 20 s) e depois 7 s
    let batida = -1, primeiro = null, alvoReg = false;
    for (let f = 0; f < 60 * 27; f++) {
        Match.update(dt);
        if (batida < 0 && Match.state === 'PLAY' && Match.lastTouchedPlayer === taker && !taker.hasBall) batida = f;
        if (batida >= 0) {
            const lt = Match.lastTouchedPlayer;
            if (!primeiro && lt && lt !== taker) primeiro = lt;
            if (!alvoReg && Match.ultimoCruzamentoDeFalta && Match.passTargetPos && Match.ball.position.y < 3 && f - batida > 20) {
                const pt = Match.passTargetPos, db = Math.hypot(Match.ball.position.x - pt.x, Match.ball.position.z - pt.z);
                if (db < 2.5) {
                    alvoReg = true;
                    const ds = Match.players.filter(p => p !== taker && p.role !== 'gk').map(p => Math.hypot(p.model.position.x - pt.x, p.model.position.z - pt.z));
                    cont.distAlvo.push(Math.min(...ds));
                }
            }
            if (f - batida > 60 * 7) break;
        }
    }
    if (batida < 0) continue;
    cont.jogadas++;
    const a = Match.ultimoCruzamentoDeFalta || '(passe)';
    cont.alvo[a] = (cont.alvo[a] || 0) + 1;
    Match.ultimoCruzamentoDeFalta = null;
    if (!primeiro) cont.primeiro.ninguem++;
    else if (primeiro.team === 'TeamA') cont.primeiro.atacante++;
    else if (primeiro.role === 'gk') cont.primeiro.gk++;
    else cont.primeiro.defensor++;
    cont.remates += (((MatchStats.TeamA && MatchStats.TeamA.remates && MatchStats.TeamA.remates.tentados) || 0) - rem0) > 0 ? 1 : 0;
    cont.golos += Match.placarA - gol0;
}
const ds = cont.distAlvo.sort((a, b) => a - b);
cont.distAlvo = ds.length ? { n: ds.length, p25: +ds[Math.floor(ds.length * .25)].toFixed(1), p50: +ds[Math.floor(ds.length * .5)].toFixed(1), p75: +ds[Math.floor(ds.length * .75)].toFixed(1) } : null;
console.log(cenario, JSON.stringify(cont, null, 1));
process.exit(0);
