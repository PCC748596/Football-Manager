/*
MULTIBOLA — o tiro de meta e o canto (js/multibola.js). Pedido: quem cobra vai ao cone, abaixa-se para pegar na bola (a pose do goleiro a apanhar), leva-a ao
local da cobranca, abaixa-se e pousa-a na marca, toma distancia (como no penalti) e cobra. A bola que saiu, se nao voltar ao campo em 5 s, some.

Corre com: node tests/multibola_meta_canto.test.js
*/
require('../tools/headless/harness.js');
let falhas = 0;
const verifica = (c, b, m) => { if (c) console.log('  . ' + b); else { console.log('  X ' + m); falhas++; } };
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = false;

/*
A bola sai pela linha de fundo da baliza do TeamA (z < 0), longe do poste. `ultimo`: a equipa do ultimo toque — TeamB da tiro de meta ao TeamA, TeamA da
canto ao TeamB. Corre-se ate a bola voltar a jogo.
*/
function lance(ultimo) {
    Match.init(new THREE.Scene()); if (typeof Officials !== 'undefined' && Officials.init) Officials.init(new THREE.Scene());
    Match.resetPlay('TeamA');
    Match.state = 'PLAY'; Match.kickoffActive = false; Match.kickoffPendingPassToDef = false;
    const zFundo = -CAMPO_COMP / 2;
    Match.lastTouchedTeam = ultimo; Match.lastTouchedPlayer = (ultimo === 'TeamA' ? Match.players : Match.opponents)[5]; Match.ballCarrier = null;
    Match.players.concat(Match.opponents).forEach(p => { p.hasBall = false; });
    Match.ball.position.set(14, BallPhysics.raio, zFundo + 2);
    Match.ballVel.set(0, 0, -9);
    const r = { estado: null, fases: [], taker: null, fonte: null, cone: -1, sumiu: false, yMin: Infinity, distPegar: null, bolaNaMarca: false, marca: null,
        recuou: 0, voltouAJogo: false, t: 0, estadosGR: new Set(), coneRepos: false };
    let ultimaFase = null;
    for (let f = 0; f < 60 * 45; f++) {
        Match.delta = 1 / 60; Match.update(1 / 60); r.t += 1 / 60;
        if (!r.estado && Match.state !== 'PLAY') r.estado = Match.state;
        const b = MultiBola.busca;
        if (b) {
            if (b.fase !== ultimaFase) { r.fases.push(b.fase); ultimaFase = b.fase; }
            r.taker = b.taker; r.cone = b.cone; r.fonte = b.fonte && b.fonte.tipo; r.marca = b.marca;
            if (!b.bolaLivre && Match.ball.visible === false) r.sumiu = true;
            if (b.fase === 'pegar' || b.fase === 'pousar') r.yMin = Math.min(r.yMin, b.taker.model.position.y);
            if (b.fase === 'pegar' && b.tGesto > MultiBolaModel.pegar.descer) r.distPegar = Math.hypot(b.taker.model.position.x - b.fonte.x, b.taker.model.position.z - b.fonte.z);
            if (b.fase === 'recuar' || b.fase === 'firmar') r.recuou = Math.max(r.recuou, Math.hypot(b.taker.model.position.x - b.marca.x, b.taker.model.position.z - b.marca.z));
            if (b.taker.role === 'gk') r.estadosGR.add(b.taker.gkEstado);
        } else if (ultimaFase && r.marca && !r.bolaNaMarca && Match.state !== 'PLAY') {
            r.bolaNaMarca = Math.hypot(Match.ball.position.x - r.marca.x, Match.ball.position.z - r.marca.z) < 0.05;
            if (r.taker && r.taker.role === 'gk') r.estadosGR.add(r.taker.gkEstado);
        }
        if (ultimaFase && !b && Match.state === 'PLAY') { r.voltouAJogo = true; break; }
    }
    // O cone usado volta a ter bola depois da cobranca.
    for (let f = 0; f < 10; f++) { Match.delta = 1 / 60; Match.update(1 / 60); }
    if (r.cone >= 0) r.coneRepos = MultiBola.cones[r.cone].temBola;
    return r;
}

console.log('1 — tiro de meta: o guarda-redes vai ao cone, pega, leva, pousa na marca, toma distancia e bate');
{
    const r = lance('TeamB');
    verifica(r.estado === 'GOAL_KICK', 'tiro de meta marcado', 'estado: ' + r.estado);
    verifica(r.taker && r.taker.role === 'gk', 'quem vai buscar e o guarda-redes', 'cobrador: ' + (r.taker && r.taker.pos));
    verifica(r.fases.join('>') === 'ir>pegar>levar>pousar', 'fases: ' + r.fases.join(' > '), 'fases: ' + r.fases.join(' > '));
    verifica(r.fonte === 'cone' && r.cone >= 0 && Math.abs(MultiBola.cones[r.cone].z) > CAMPO_COMP / 2, 'a bola vem do cone atras da baliza', 'fonte: ' + r.fonte + ' cone ' + r.cone);
    verifica(r.sumiu, 'a bola que saiu sumiu', 'a bola que saiu nao sumiu');
    // O corpo para a `recuoDoCorpo` (+ meio raio do cone) da bola: sao os bracos esticados que a alcancam.
    const esperadoM = GoalkeeperPose.apanhar.recuoDoCorpo + MultiBolaModel.cone.raio * 0.5;
    verifica(r.distPegar !== null && Math.abs(r.distPegar - esperadoM) < 0.12, `agacha-se a frente do cone (${r.distPegar && r.distPegar.toFixed(2)} m)`, 'distancia ao cone: ' + r.distPegar);
    verifica(r.yMin < ALTURA_BASE_Y - 0.15, `agacha-se de verdade (desce ${(ALTURA_BASE_Y - r.yMin).toFixed(2)} m)`, 'nao se agachou');
    verifica(r.bolaNaMarca, 'pousou a bola na quina da pequena area', 'a bola nao ficou na marca');
    verifica(r.estadosGR.has('multibola') && r.estadosGR.has('tiro_meta_espera'), 'depois de pousar toma distancia (tiro_meta_espera)', 'estados do GR: ' + [...r.estadosGR].join(','));
    verifica(r.voltouAJogo, `bateu o tiro de meta (${r.t.toFixed(1)} s)`, 'o tiro de meta nao saiu');
    verifica(r.coneRepos, 'o cone voltou a ter bola', 'o cone ficou vazio');
}

console.log('2 — canto: o batedor vai ao cone, pega, leva, pousa na marca, recua e vem bater');
{
    const r = lance('TeamA');
    verifica(r.estado === 'CORNER_KICK', 'canto marcado', 'estado: ' + r.estado);
    verifica(r.taker && r.taker.role !== 'gk' && r.taker.team === 'TeamB', 'o batedor e de campo, da equipa que ataca', 'cobrador: ' + (r.taker && r.taker.team + ' ' + r.taker.role));
    verifica(r.fases.join('>') === 'ir>pegar>levar>pousar>recuar>firmar>vir', 'fases: ' + r.fases.join(' > '), 'fases: ' + r.fases.join(' > '));
    verifica(r.fonte === 'cone', 'a bola vem de um cone', 'fonte: ' + r.fonte);
    verifica(r.yMin < ALTURA_BASE_Y - 0.15, `agacha-se de verdade (desce ${(ALTURA_BASE_Y - r.yMin).toFixed(2)} m)`, 'nao se agachou');
    verifica(r.recuou > 2.5, `toma distancia (recua ${r.recuou.toFixed(1)} m da bola)`, 'recuou so ' + r.recuou.toFixed(1) + ' m');
    verifica(r.voltouAJogo, `bateu o canto (${r.t.toFixed(1)} s)`, 'o canto nao saiu');
    verifica(r.coneRepos, 'o cone voltou a ter bola', 'o cone ficou vazio');
}

console.log(falhas ? 'FALHOU: ' + falhas : 'OK: multibola do tiro de meta e do canto.');
process.exit(falhas ? 1 : 0);
