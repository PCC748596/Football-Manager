/*
NO TIRO DE META A BOLA SEGUE ATE A PLACA. Relato: *"quando a bola e chutada e vai para fora esta se teletransportando para o tiro de meta assim que passa a linha de
fundo. Nao bate nem na placa"*. O `golKickBolaAtraso` passou de 3 s a 0 e a bola rasteira, que ja esta no chao ao passar a linha, ia logo para a pequena area. Agora
ela vai depois de bater na placa/bancada (`bolaBateuNoFundo`) ou de parar, e no maximo `SetPiecePrazos.bolaAteAPlaca` s.

Corre com: node tests/tiro_de_meta_bola_ate_placa.test.js
*/
require('../tools/headless/harness.js');
let falhas = 0;
const verifica = (c, b, m) => { if (c) console.log('  . ' + b); else { console.log('  X ' + m); falhas++; } };
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = false;

function chutarParaFora(vz, vy) {
    Match.init(new THREE.Scene()); if (typeof Officials !== 'undefined' && Officials.init) Officials.init(new THREE.Scene());
    Match.resetPlay('TeamA');
    Match.state = 'PLAY'; Match.kickoffActive = false; Match.kickoffPendingPassToDef = false;
    // O atacante de A remata para fora pela linha de fundo de B (z > 0 ou < 0, conforme o lado de B).
    const golB = -(CAMPO_COMP / 2) * Lados.dirDe('TeamB');
    const s = Math.sign(golB);
    const at = Match.players.find(p => p.role !== 'gk');
    Match.lastTouchedTeam = 'TeamA'; Match.lastTouchedPlayer = at; Match.ballCarrier = null;
    Match.players.concat(Match.opponents).forEach(p => { p.hasBall = false; });
    Match.ball.position.set(12, BallPhysics.raio, golB - s * 4);
    Match.ballVel.set(0, vy, s * vz);
    let maxFora = 0, estado = null, foiPara = null, t = 0, vAntes = 99, vNoSalto = null;
    for (let f = 0; f < 60 * 6; f++) {
        Match.delta = 1 / 60; Match.update(1 / 60); t += 1 / 60;
        const fora = Math.abs(Match.ball.position.z) - CAMPO_COMP / 2;
        if (Match.state === 'GOAL_KICK') estado = 'GOAL_KICK';
        if (estado && Math.abs(Match.ball.position.z) < CAMPO_COMP / 2 && foiPara === null) { foiPara = +(t.toFixed(2)); vNoSalto = vAntes; }
        if (foiPara === null) { maxFora = Math.max(maxFora, fora); vAntes = Match.ballVel.length(); }
    }
    return { maxFora, estado, foiPara, vNoSalto };
}

const placa = (typeof BarreiraCampo !== 'undefined') ? BarreiraCampo.z - CAMPO_COMP / 2 : 5.5;
for (const [nome, vz, vy] of [['rasteira forte', 18, 0], ['rasteira fraca', 8, 0], ['por cima', 16, 6]]) {
    console.log(nome);
    const r = chutarParaFora(vz, vy);
    verifica(r.estado === 'GOAL_KICK', 'deu tiro de meta', 'estado: ' + r.estado);
    const naPlaca = r.maxFora >= placa - 0.4, parou = r.vNoSalto !== null && r.vNoSalto < 0.6;
    verifica(naPlaca || parou, naPlaca ? `a bola chegou a placa (${r.maxFora.toFixed(2)} m alem da linha) antes de ir a pequena area` : `parou sozinha a ${r.maxFora.toFixed(2)} m da linha antes de ir a pequena area`,
        `teletransportou a ${r.maxFora.toFixed(2)} m da linha ainda a ${r.vNoSalto && r.vNoSalto.toFixed(2)} m/s (placa a ${placa.toFixed(2)})`);
    verifica(r.foiPara !== null && r.foiPara < 4, `e foi para a pequena area (${r.foiPara} s)`, 'a bola nao voltou a pequena area');
}

console.log(falhas ? 'FALHOU: ' + falhas : 'OK: a bola bate na placa antes do tiro de meta.');
process.exit(falhas ? 1 : 0);
