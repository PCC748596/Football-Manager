/*
A FALTA QUE ENTREGA A BOLA. Monta N faltas para a TeamA em pontos sorteados do campo inteiro e, depois da cobranca, regista: a direccao da bola
(para a frente / para o lado / para TRAS), a decisao e a rotina montadas, para quem era o passe, e QUEM a toca primeiro. Uma "entrega" e o
adversario a tocar primeiro com nenhum companheiro do batedor a menos de `PERTO` m da bola nesse instante.

Uso: node tools/headless/faltas_entrega.js [n 80] [semente 1]
*/
const N = Number(process.argv[2] || 80), SEM = Number(process.argv[3] || 1);
const PERTO = 6;
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(777 + SEM * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
const r = Math.random, dt = 1 / 60;
const res = { faltas: 0, direccao: { frente: 0, lado: 0, tras: 0 }, primeiro: { atacante: 0, adversario: 0, ninguem: 0 }, entregas: 0, entregasTras: 0, casos: [] };
for (let k = 0; k < N; k++) {
    const dir = Lados.dirDe('TeamA');
    const x = (r() * 2 - 1) * 30, zAv = (r() * 2 - 1) * 45;   // avanco no sentido do ataque, -45 (defesa) a +45 (ataque)
    Match.mudarEstado('PLAY', 'lote');
    Match.ball.position.set(x, BallPhysics.raio, zAv * dir);
    Match.ballVel.set(0, 0, 0);
    Match.ballCarrier = null;
    Match.players.concat(Match.opponents).forEach(p => { p.hasBall = false; });
    Match.setupSetPiece('FREE_KICK', 'TeamA');
    const taker = Match.setPieceTaker;
    if (!taker) continue;
    const dec = Match.decisaoFaltaMontada || '?', rot = Match.rotinaPlano ? Match.rotinaPlano.rotina.nome : '-';
    let batida = -1, vel = null, primeiro = null, livre = null, alvo = null;
    for (let f = 0; f < 60 * 25; f++) {
        Match.update(dt);
        if (batida < 0 && Match.state === 'PLAY' && Match.lastTouchedPlayer === taker && !taker.hasBall && Match.ballVel.lengthSq() > 4) {
            batida = f; vel = { x: Match.ballVel.x, z: Match.ballVel.z };
            alvo = taker.passTarget ? taker.passTarget.pos + ' ' + Math.round((taker.passTarget.model.position.z - taker.model.position.z) * dir) + ' m' : (Match.ultimoCruzamentoDeFalta || 'sem alvo');
        }
        if (batida >= 0) {
            const lt = Match.lastTouchedPlayer;
            if (!primeiro && lt && lt !== taker) {
                primeiro = lt;
                const b = Match.ball.position;
                livre = !Match.players.some(p => p !== taker && p.role !== 'gk' && Math.hypot(p.model.position.x - b.x, p.model.position.z - b.z) < PERTO);
                break;
            }
            if (f - batida > 60 * 6) break;
        }
    }
    if (batida < 0) continue;
    res.faltas++;
    const avanco = vel.z * dir, lado = Math.abs(vel.x);
    const d = avanco > lado * 0.5 ? 'frente' : avanco < -lado * 0.3 ? 'tras' : 'lado';
    res.direccao[d]++;
    if (!primeiro) res.primeiro.ninguem++;
    else if (primeiro.team === 'TeamA') res.primeiro.atacante++;
    else {
        res.primeiro.adversario++;
        if (livre) {
            res.entregas++; if (d === 'tras') res.entregasTras++;
            if (res.casos.length < 15) res.casos.push(`falta em x ${x.toFixed(0)} avanco ${zAv.toFixed(0)} | ${dec} / ${rot} | bola ${d} | alvo ${alvo} | bate ${taker.pos} | pega ${primeiro.pos}`);
        }
    }
}
console.log(JSON.stringify(res, null, 1));
process.exit(0);
