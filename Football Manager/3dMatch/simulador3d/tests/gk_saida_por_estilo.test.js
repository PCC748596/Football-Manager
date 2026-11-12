/*
A SAIDA DO GOLEIRO AO PORTADOR, por estilo. Pedido: *"o goleiro defensivo pode sair do gol uns 2 ou 3 passos quando o atacante estiver vindo com a bola e a bola entrar
na area. O goleiro ofensivo vai sair uns 5 passos a frente quando nao tiver nenhum zagueiro entre ele e o adversario"*. Ver GoalkeeperStyle e gkSaidaAoPortador.

Corre com: node tests/gk_saida_por_estilo.test.js
*/
require('../tools/headless/harness.js');
let falhas = 0;
const verifica = (c, b, m) => { if (c) console.log('  . ' + b); else { console.log('  X ' + m); falhas++; } };
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = false;

console.log('a funcao');
const S = GoalkeeperStyle;
{
    const a = { x: 0, z: -51 };
    const p = gkSaidaAoPortador(a, 0, -40, 5);
    verifica(Math.abs(Math.hypot(p.x - a.x, p.z - a.z) - 5 * S.passo) < 1e-9, `5 passos = ${5 * S.passo} m em direccao a bola`, 'andou ' + Math.hypot(p.x - a.x, p.z - a.z));
    const q = gkSaidaAoPortador(a, 0, -49, 5);
    verifica(Math.abs(Math.hypot(0 - q.x, -49 - q.z) - S.folgaDaBola) < 1e-9, 'nunca passa da bola (fica a folgaDaBola dela)', 'ficou a ' + Math.hypot(0 - q.x, -49 - q.z));
}

/*
Num jogo montado: o atacante de B conduz em direccao a baliza de A, ninguem de A entre ele e a baliza (os outros ficam longe). Mede-se quanto o goleiro de A fica a
frente da ancora depois de uns segundos.
*/
function medir(estilo, zAtacante) {
    Match.init(new THREE.Scene()); if (typeof Officials !== 'undefined' && Officials.init) Officials.init(new THREE.Scene());
    Match.resetPlay('TeamB');
    Match.state = 'PLAY'; Match.kickoffActive = false; Match.kickoffPendingPassToDef = false;
    const gk = Match.players.find(p => p.role === 'gk');
    gk.gkStyleBase = estilo; gk.gkStyle = estilo;
    const at = Match.opponents.find(p => p.role === 'fwd' || p.role === 'att') || Match.opponents[9];
    const zA = gk.ownGoalZ + gk.dirZ * zAtacante;
    // os defensores de A longe, do outro lado do campo
    Match.players.forEach(p => { if (p !== gk) { p.model.position.set(25, 0, gk.ownGoalZ + gk.dirZ * 60); p.velocity.set(0, 0, 0); } });
    let maxAvanco = 0, ancoraD = null;
    for (let f = 0; f < 60 * 3; f++) {
        at.model.position.set(0, 0, zA); at.velocity.set(0, 0, 0);
        Match.ball.position.set(0, 0.11, zA + gk.dirZ * 0.6); Match.ballVel.set(0, 0, 0);
        Match.ballCarrier = at; at.hasBall = true; Match.possessionTeam = 'TeamB';
        Match.players.forEach(p => { if (p !== gk) { p.model.position.set(25, 0, gk.ownGoalZ + gk.dirZ * 60); } });
        Match.delta = 1 / 60; Match.update(1 / 60);
        const anc = gkAnchor(Match.ball.position.x, Match.ball.position.z, gk.ownGoalZ, gk.dirZ, GoalkeeperStyle[gk.gkStyle] || GoalkeeperStyle.defensive);
        ancoraD = Math.abs(anc.z - gk.ownGoalZ);
        maxAvanco = Math.abs(gk.model.position.z - gk.ownGoalZ);
    }
    return { avanco: maxAvanco, ancora: ancoraD, estilo: gk.gkStyle };
}

console.log('defensivo, atacante com a bola dentro da area (12 m)');
const d = medir('defensive', 12);
const saiuD = d.avanco - d.ancora;
verifica(saiuD >= 1.3 && saiuD <= 2.4, `sai ${saiuD.toFixed(2)} m da ancora (2 a 3 passos)`, `saiu ${saiuD.toFixed(2)} m (ancora ${d.ancora.toFixed(2)}, ele a ${d.avanco.toFixed(2)})`);

console.log('ofensivo, sem defensor entre ele e o atacante (atacante a 14 m)');
const o = medir('offensive', 14);
const saiuO = o.avanco - o.ancora;
verifica(o.estilo === 'offensive', 'o estilo esta offensive (sem defensor pela frente)', 'estilo: ' + o.estilo);
verifica(saiuO >= 3.0 && saiuO <= 4.5, `sai ${saiuO.toFixed(2)} m da ancora (~5 passos)`, `saiu ${saiuO.toFixed(2)} m (ancora ${o.ancora.toFixed(2)}, ele a ${o.avanco.toFixed(2)})`);

console.log(falhas ? 'FALHOU: ' + falhas : 'OK: cada estilo sai o que lhe cabe.');
process.exit(falhas ? 1 : 0);
