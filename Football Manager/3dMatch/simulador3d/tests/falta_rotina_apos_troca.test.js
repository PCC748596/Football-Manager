/*
A ROTINA DA FALTA DEPOIS DE UMA SUBSTITUICAO. Relato: *"quando tem uma falta seguida de alteracao, as vezes o batedor da falta cobra pra ele mesmo. Depois de uma alteracao
o set pieces takers tem que ser atualizado e o batedor alterado se for preciso"*.

O caso: o batedor da rotina SAI e o cobrador designado passa a ser o recetor do 1.o passe. Antes, o plano (`rotinaPlano`) continuava a apontar para quem saiu e o novo
batedor ficava como recetor do proprio passe. Ver `actualizarRotinaAposTroca` (match_substituicoes.js).

Corre com: node tests/falta_rotina_apos_troca.test.js
*/
require('../tools/headless/harness.js');
let falhas = 0;
const verifica = (c, b, m) => { if (c) console.log('  . ' + b); else { console.log('  X ' + m); falhas++; } };
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = false;
const COMP = 106;

let pl = null;
for (const semente of [2, 3, 5, 8, 13, 21, 34]) {
    let s = semente; Math.random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    Match.init(new THREE.Scene());
    Match.state = 'PLAY'; Match.kickoffActive = false; Match.kickoffPendingPassToDef = false;
    Match.ball.position.set(-4, 0.11, COMP / 2 - 33); Match.ballVel.set(0, 0, 0);
    Match.lastTouchedTeam = 'TeamB';
    Match.setupSetPiece('FREE_KICK', 'TeamA');
    pl = Match.rotinaPlano;
    if (pl && pl.passos[0] && pl.passos[0].para && pl.jogadores[pl.passos[0].para]) break;
    pl = null;
}
verifica(!!pl, 'ha uma falta com rotina de passe', 'nenhuma semente montou uma rotina de passe');
if (pl) {
    const T = Match.setPieceTaker;
    const kDe = pl.passos[0].de, kPara = pl.passos[0].para;
    const R = pl.jogadores[kPara];
    verifica(pl.jogadores[kDe] === T && R && R !== T, 'antes: o batedor da o 1.o passe a outro', 'plano inicial inesperado');

    // O batedor sai (entra um do banco no lugar dele) e o designado para a falta passa a ser o recetor.
    const N = Match.executarSubstituicao({ lado: 'casa', _sk: Object.assign({}, T.skills, { id: 999001 }) }, T, Match.players, null);
    verifica(!!N && Match.players.indexOf(T) < 0, 'o batedor saiu e entrou outro', 'a substituicao nao correu');
    Match.cobradores = Match.cobradores || {};
    Match.cobradores.A = Object.assign({}, Match.cobradores.A || {}, { freeKickLong: R.skills.id, freeKickDirectL: R.skills.id, freeKickDirectR: R.skills.id });
    Match.reatribuirBatedorAposTroca();

    const pl2 = Match.rotinaPlano;
    verifica(Match.setPieceTaker === R, 'o batedor passa a ser o designado', 'batedor: ' + (Match.setPieceTaker && Match.setPieceTaker.id));
    verifica(pl2.taker === R && pl2.jogadores[kDe] === R, 'na rotina o 1.o passe sai do novo batedor', 'o 1.o passe sai de ' + (pl2.jogadores[kDe] && pl2.jogadores[kDe].id));
    verifica(pl2.jogadores[kPara] !== R, 'o novo batedor NAO e o recetor do proprio passe', 'o batedor passa para si mesmo');
    verifica(pl2.jogadores[kPara] === N, 'o recetor e o que entrou no lugar do batedor antigo', 'recetor: ' + (pl2.jogadores[kPara] && pl2.jogadores[kPara].id));
    const fora = Object.values(pl2.jogadores).concat((pl2.lugares || []).map(l => l.p), (pl2.corridas || []).map(c => c.p)).filter(p => p && Match.players.indexOf(p) < 0);
    verifica(fora.length === 0, 'ninguem da rotina esta fora de campo', fora.length + ' jogador(es) da rotina ja sairam');
    verifica(!(pl2.lugares || []).some(l => l.p === R), 'o batedor nao tem lugar da rotina (fica na bola)', 'o batedor ficou com um lugar');
}

console.log(falhas ? 'FALHOU: ' + falhas : 'OK: depois da troca a rotina da falta segue o batedor novo.');
process.exit(falhas ? 1 : 0);
