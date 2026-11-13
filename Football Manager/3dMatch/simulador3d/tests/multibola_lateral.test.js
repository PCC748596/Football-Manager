/*
MULTIBOLA — LATERAL. Spec: docs/superpowers/specs/2026-11-12-multibola-design.md.

Pedido: *"uns cones com as bolas serao colocados ao redor do campo... Quando a bola sair o jogador cobrador do lateral vai ate o cone com a bola mais proxima, se abaixa,
pega a bola, vai ate o local da cobranca e prossegue com a cobranca normalmente"*. E: *"a bola sai, mas pode bater na placa ou na arquibancada, pra depois sumir. Se a
bola bater e voltar pro campo, ela mesma pode ser usada para o lateral"*.

Corre com: node tests/multibola_lateral.test.js
*/
require('../tools/headless/harness.js');
let falhas = 0;
const verifica = (c, b, m) => { if (c) console.log('  . ' + b); else { console.log('  X ' + m); falhas++; } };
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = false;

console.log('1 — os cones');
{
    const cs = MultiBola.posicoesDosCones();
    verifica(cs.length === 15, '15 cones', 'cones: ' + cs.length);
    const fora = cs.every(c => Math.abs(c.x) > CAMPO_LARG / 2 || Math.abs(c.z) > CAMPO_COMP / 2);
    verifica(fora, 'todos fora do campo', 'ha cone dentro do campo');
    const dentroBarreira = cs.every(c => Math.abs(c.x) < BarreiraCampo.x && Math.abs(c.z) < BarreiraCampo.z);
    verifica(dentroBarreira, 'todos antes da barreira/placa', 'ha cone para la da barreira');
    const lado = (typeof TunelJogadores !== 'undefined' && TunelJogadores.lado) || -1;
    verifica(cs.filter(c => Math.sign(c.x) === Math.sign(lado) && Math.abs(c.z) < CAMPO_COMP / 2).length === 6, '6 cones na lateral dos bancos', 'cones do lado dos bancos errados');
    verifica(cs.filter(c => Math.sign(c.x) === -Math.sign(lado) && Math.abs(c.z) < CAMPO_COMP / 2).length === 5, '5 cones na lateral oposta', 'cones da lateral oposta errados');
    verifica(cs.filter(c => Math.abs(c.z) > CAMPO_COMP / 2).length === 4, '2 atras de cada baliza', 'cones atras das balizas errados');
    const i = MultiBola.coneMaisProximo(-lado * CAMPO_LARG / 2, 20);
    verifica(Math.abs(cs[i].z - 22) < 1 && Math.sign(cs[i].x) === -Math.sign(lado), 'o cone mais proximo de um ponto da lateral e o de z=22 desse lado', 'cone escolhido: ' + JSON.stringify(cs[i]));
}

/*
Um lateral a serio: a bola sai pela lateral oposta aos bancos (x = -lado), tocada por ultimo pela equipa B, e corre-se o jogo ate a cobranca sair.
`vx`: a velocidade com que ela sai; `voltar`: poe a bola a bater na barreira e a voltar (ressalto forte).
*/
function lateral(opcoes) {
    const o = opcoes || {};
    Match.init(new THREE.Scene()); if (typeof Officials !== 'undefined' && Officials.init) Officials.init(new THREE.Scene());
    Match.resetPlay('TeamA');
    Match.state = 'PLAY'; Match.kickoffActive = false; Match.kickoffPendingPassToDef = false;
    if (o.placar) { Match.placarA = o.placar[0]; Match.placarB = o.placar[1]; }
    const lado = (typeof TunelJogadores !== 'undefined' && TunelJogadores.lado) || -1;
    const sx = -Math.sign(lado);
    Match.lastTouchedTeam = 'TeamB'; Match.lastTouchedPlayer = Match.opponents[5]; Match.ballCarrier = null;
    Match.players.concat(Match.opponents).forEach(p => { p.hasBall = false; });
    Match.ball.position.set(sx * (CAMPO_LARG / 2 - 2), BallPhysics.raio, 18);
    Match.ballVel.set(sx * (o.vx || 9), 0, 0);
    if (o.restituicao !== undefined) BarreiraCampo._restOrig = BarreiraCampo.restituicao, BarreiraCampo.restituicao = o.restituicao;
    const r = { fases: [], cone: -1, pegou: false, entregue: false, cobrou: false, coneRepos: false, taker: null, tEntrega: null, tCobranca: null, maxBolaFora: 0, teleporte: false, velIr: null, fonte: null, prazoNoFim: null };
    let t = 0, ultimaFase = null, bolaAntes = Match.ball.position.clone();
    for (let f = 0; f < 60 * 30; f++) {
        Match.delta = 1 / 60; Match.update(1 / 60); t += 1 / 60;
        const b = MultiBola.busca;
        if (b) {
            if (b.fase !== ultimaFase) { r.fases.push(b.fase); ultimaFase = b.fase; }
            r.taker = b.taker; if (b.cone >= 0) r.cone = b.cone; if (b.fonte) r.fonte = b.fonte.tipo;
            if (b.fase === 'ir' && b.taker.lugarBolaParada && r.velIr === null) r.velIr = b.taker.lugarBolaParada.vel;
            if (b.fase === 'levar') r.pegou = true;
            if (b.fase === 'saida') r.maxBolaFora = Math.max(r.maxBolaFora, Math.abs(Match.ball.position.x) - CAMPO_LARG / 2);
            // Na fase 'saida' a bola nao pode saltar (teletransporte): anda o que a velocidade da.
            if (b.fase === 'saida' && bolaAntes.distanceTo(Match.ball.position) > 0.5) r.teleporte = true;
        } else if (ultimaFase && !r.entregue) { r.entregue = true; r.tEntrega = t; r.prazoNoFim = Match.setPieceTimer; }
        if (r.entregue && !r.cobrou && Match.state === 'PLAY') { r.cobrou = true; r.tCobranca = t; }
        if (r.cobrou && r.cone >= 0 && MultiBola.cones[r.cone].temBola) { r.coneRepos = true; break; }
        if (r.cobrou && r.cone < 0) break;
        bolaAntes.copy(Match.ball.position);
    }
    if (BarreiraCampo._restOrig !== undefined) { BarreiraCampo.restituicao = BarreiraCampo._restOrig; delete BarreiraCampo._restOrig; }
    return r;
}

console.log('2 — a bola sai e para la fora: o cobrador vai ao cone, pega, leva, cobra');
{
    const r = lateral({ vx: 9 });
    verifica(r.fases.join('>') === 'saida>ir>pegar>levar', 'fases: ' + r.fases.join(' > '), 'fases: ' + r.fases.join(' > '));
    verifica(!r.teleporte, 'a bola que sai nao teletransporta (segue a fisica)', 'a bola saltou na fase de saida');
    verifica(r.maxBolaFora > 3, `a bola seguiu la para fora (${r.maxBolaFora.toFixed(1)} m alem da linha)`, `a bola parou a ${r.maxBolaFora.toFixed(1)} m da linha`);
    verifica(r.fonte === 'cone', 'a fonte e um cone', 'fonte: ' + r.fonte);
    const cs = MultiBola.cones;
    if (r.cone >= 0) verifica(Math.abs(cs[r.cone].z - 22) < 1, 'o cone mais proximo do ponto de saida (z=18 -> o de z=22)', 'cone z=' + cs[r.cone].z);
    verifica(r.pegou && r.entregue, 'pegou na bola e chegou ao ponto', 'nao completou a busca');
    verifica(r.cobrou, `cobrou o lateral (${r.tCobranca && r.tCobranca.toFixed(1)} s)`, 'o lateral nao saiu');
    verifica(r.coneRepos, 'o cone voltou a ter bola depois da cobranca', 'o cone ficou vazio');
    verifica(r.prazoNoFim !== null && r.prazoNoFim < 0.5, 'o prazo do lateral nao contou durante a busca', 'prazo ja ia em ' + r.prazoNoFim);
}

console.log('3 — a bola bate na barreira e volta ao campo: usa essa bola');
{
    const r = lateral({ vx: 14, restituicao: 0.9 });
    verifica(r.fonte === 'bola', 'a fonte e a propria bola', 'fonte: ' + r.fonte);
    verifica(r.cone < 0, 'nao foi a nenhum cone', 'foi ao cone ' + r.cone);
    verifica(r.cobrou, 'cobrou o lateral', 'o lateral nao saiu');
}

console.log('4 — o ritmo pelo placar');
{
    const M = MultiBolaModel;
    verifica(lateral({ placar: [0, 0] }).velIr === M.velTrote, 'empatado: trote', 'empatado nao trotou');
    verifica(lateral({ placar: [0, 1] }).velIr === M.velCorrida, 'a perder: corre', 'a perder nao correu');
    verifica(lateral({ placar: [2, 0] }).velIr === M.velAndar, 'a ganhar: anda', 'a ganhar nao andou');
}

console.log('5 — o cobrador e expulso a meio do caminho: outro assume');
{
    Match.init(new THREE.Scene()); if (typeof Officials !== 'undefined' && Officials.init) Officials.init(new THREE.Scene());
    Match.resetPlay('TeamA');
    Match.state = 'PLAY'; Match.kickoffActive = false; Match.kickoffPendingPassToDef = false;
    const lado = (typeof TunelJogadores !== 'undefined' && TunelJogadores.lado) || -1;
    const sx = -Math.sign(lado);
    Match.lastTouchedTeam = 'TeamB'; Match.ballCarrier = null;
    Match.players.concat(Match.opponents).forEach(p => { p.hasBall = false; });
    Match.ball.position.set(sx * (CAMPO_LARG / 2 - 2), BallPhysics.raio, 18);
    Match.ballVel.set(sx * 9, 0, 0);
    let primeiro = null, segundo = null, cobrou = false, expulsou = false;
    for (let f = 0; f < 60 * 30; f++) {
        Match.delta = 1 / 60; Match.update(1 / 60);
        const b = MultiBola.busca;
        if (b && b.fase === 'ir' && !expulsou) { primeiro = b.taker; Officials.expulsar(primeiro); expulsou = true; }
        if (b && expulsou && b.taker !== primeiro) segundo = b.taker;
        if (expulsou && !b && Match.state === 'PLAY') { cobrou = true; break; }
    }
    verifica(expulsou && segundo && segundo !== primeiro, 'outro jogador assumiu a busca', 'ninguem assumiu');
    verifica(segundo && segundo.team === 'TeamA', 'da mesma equipa', 'assumiu alguem da outra equipa');
    verifica(cobrou, 'e o lateral saiu', 'o lateral nao saiu');
}

console.log(falhas ? 'FALHOU: ' + falhas : 'OK: multibola do lateral.');
process.exit(falhas ? 1 : 0);
