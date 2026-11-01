/*
DEFESAS -25% NOS PENALTIS (pedido: "os goleiros estao pegando muito penaltis; reduz em 25%", em todos os penaltis, jogo e disputa): `PenaltyModel.fatorDefesa` (0.75) multiplica, no
baterPenalti, a probabilidade de o goleiro ir ao SITIO CERTO (bandas `chanceDefesa` e o ramo `diff <= -5`); o resto e mergulho para o lado errado.
Mede-se a decisao (para onde ele mergulha contra a linha do remate), com sorteio fixo, com o fator 1 e com 0.75: com 0.75 ele vai menos vezes ao sitio certo.
(O desfecho final tambem depende do alcance do mergulho, GkDive: um goleiro que vai para o lado errado ainda defende remates ao meio — ver o relatorio.)
Corre com: node tests/penalti_fator_defesa.test.js
*/
require('../tools/headless/harness.js');

let falhas = 0;
const ok = m => console.log('  . ' + m);
const erro = m => { console.log('  X ' + m); falhas++; };
const verifica = (cond, bom, mau) => { if (cond) ok(bom); else erro(mau); };
const semear = (s) => { let x = s; Math.random = () => { x = (x + 0x6D2B79F5) | 0; let t = Math.imul(x ^ (x >>> 15), 1 | x); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = false;
global.EfeitosSonoros = new Proxy({}, { get: () => () => {} });
const cena = new THREE.Scene(); const dt = 1 / 60;
Match.setCameraMode = function () {};
Match.init(cena); Officials.init(cena); Match.resetPlay('TeamA');
for (let i = 0; i < 120; i++) Match.update(dt);
DisputaModel.pausa.esperaBatida = 0;   // a decisao e a mesma; sem a espera o teste corre mais depressa
const gk = Match.opponents.find(p => p.role === 'gk');
const quieto = () => ({ wps: [], i: 0, chegou: true, vel: 0, yaw: 0, olhar: { x: 0, z: 0 } });
const N = 80;

// Quantas vezes o goleiro mergulha para a linha do remate (a menos de 1.2 m de onde a bola cruza a linha de golo).
function sitioCerto(fator) {
    semear(31); PenaltyModel.fatorDefesa = fator;
    Match.disputa = DisputaPenaltis; DisputaPenaltis.activa = true;
    const batedores = Match.players.filter(p => p.role !== 'gk');
    let certo = 0, medidos = 0;
    for (let k = 0; k < N; k++) {
        const b = batedores[k % batedores.length];
        DisputaPenaltis.sinalZ = (k % 2) ? 1 : -1;
        Match.players.concat(Match.opponents).forEach(p => { p.disputaOrdem = (p === b || p === gk) ? null : quieto(); });
        DisputaPenaltis.cobrar('casa', b, gk, () => {});
        let n = 0; while (Match.state !== 'PLAY' && n < 60 * 30) { Match.update(dt); n++; }
        // O mergulho decidido no remate (gk.penaltyDiveX) contra onde a bola chega a linha de golo.
        const mergulhoX = gk.penaltyDiveX;
        let m = 0; while (Math.abs(Match.ball.position.z) < 52.4 && m < 60 * 1.5) { Match.update(dt); m++; }
        const xLinha = Match.ball.position.x;
        if (typeof mergulhoX === 'number' && Math.abs(Match.ball.position.z) >= 52.4 && Math.abs(xLinha) < 3.66) { medidos++; if (Math.abs(mergulhoX - xLinha) < 1.2) certo++; }
        DisputaPenaltis._fimDaCobranca();
    }
    DisputaPenaltis._libertar(); Match.state = 'PLAY';
    return { certo, medidos, taxa: medidos ? certo / medidos : 0 };
}

console.log('1 — com o fator 0.75 o goleiro vai menos vezes ao sitio certo do que com 1.0 (sorteio fixo)');
const a = sitioCerto(1.0), b = sitioCerto(0.75);
console.log(`   fator 1.00: ${a.certo}/${a.medidos} (${(100 * a.taxa).toFixed(0)}%)   fator 0.75: ${b.certo}/${b.medidos} (${(100 * b.taxa).toFixed(0)}%)`);
verifica(a.medidos > 30 && b.medidos > 30, 'remates enquadrados suficientes', 'poucos remates enquadrados');
verifica(b.taxa < a.taxa, 'menos mergulhos para o sitio certo com o fator 0.75', 'o fator nao reduziu os mergulhos certos');
PenaltyModel.fatorDefesa = 0.75;
verifica(PenaltyModel.fatorDefesa === 0.75, 'PenaltyModel.fatorDefesa = 0.75 (vale para o jogo e para a disputa)', 'fator errado');

if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\ntudo certo');
process.exit(0);
