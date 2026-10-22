/*
O OVERLAP DO LATERAL OFENSIVO. Pedido: "o lateral do lado em que a jogada esta acontecendo, se for ofensivo, tem que dar mais opcao de overlapping para receber os lancamentos."

Conta, em cada partida simulada:
  - arranques de overlap (`actOverlap` leva o jogador a RUN_INTO_SPACE) por quem arranca: lateral OFENSIVO (estilo offensive_fullback) ou outro;
  - passes que saem para quem esta em overlap (`overlapTimer > 0`), idem;
  - lancamentos (passes de 20 m ou mais) para quem esta em overlap.

Uso: node tools/headless/overlap_lateral.js [segundos] [semente]
*/
const segundos = Number(process.argv[2] || 600);
const semente = Number(process.argv[3] || 0);

const mulberry32 = (a) => () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
Math.random = mulberry32(1000 + semente * 977);

require('./harness.js');

const dt = 1 / 60;
const scene = new THREE.Scene();
Match.init(scene);
if (typeof Officials !== 'undefined' && Officials.init) Officials.init(scene);
if (typeof Tatics !== 'undefined' && Tatics.updateSkills) Tatics.updateSkills();
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;

const tipo = (p) => (p.playingStyle === 'offensive_fullback' ? 'lateral ofensivo' : (p.pos === 'LB' || p.pos === 'RB') ? 'outro lateral' : 'extremo/outro');
const arranques = {}, passes = {}, lancamentos = {};
const soma = (o, k) => { o[k] = (o[k] || 0) + 1; };

for (const p of [...Match.players, ...Match.opponents]) {
    const fsm = p.fsm;
    const orig = fsm.changeState.bind(fsm);
    fsm.changeState = function (novo, ...resto) {
        if (fsm.currentState !== 'RUN_INTO_SPACE' && novo === 'RUN_INTO_SPACE' && p.overlapTimer > 0) soma(arranques, tipo(p));
        return orig(novo, ...resto);
    };
}

// Cada passe INICIADO (`initiatePass`): o alvo esta em overlap (overlapTimer > 0)? O `executePassGameplay` so apanha parte dos passes.
const proto = Object.getPrototypeOf(Match.players[0]);
const origInit = proto.initiatePass;
let totalPasses = 0;
proto.initiatePass = function (alvo) {
    totalPasses++;
    if (alvo && (alvo.overlapTimer > 0 || ((alvo.pos === 'LB' || alvo.pos === 'RB') && alvo.fsm && alvo.fsm.currentState === 'RUN_INTO_SPACE'))) {
        soma(passes, tipo(alvo));
        if (this.model.position.distanceTo(alvo.model.position) >= 20) soma(lancamentos, tipo(alvo));
    }
    return origInit.apply(this, arguments);
};

// Diagnostico: por que o lancamento ao lateral em overlap nao sai? (amostra a cada 6 frames, com portador e overlap em curso)
const motivos = {};
for (let i = 0; i < Math.round(segundos / dt); i++) {
    Match.update(dt);
    if (i % 6 !== 0) continue;
    const bc = Match.ballCarrier;
    if (!bc || !bc.model) continue;
    const mates = (bc.team === 'TeamA') ? Match.players : Match.opponents;
    const advs = (bc.team === 'TeamA') ? Match.opponents : Match.players;
    for (const m of mates) {
        if (m === bc || !(m.overlapTimer > 0) || m.playingStyle !== 'offensive_fullback') continue;
        const it = intencaoDeCorrida(m, bc);
        if (!it) { soma(motivos, 'sem intencao (irregular/reacao)'); continue; }
        if (it.dist < Intencoes.distMin) { soma(motivos, 'dist < min'); continue; }
        if (it.dist > Intencoes.distMax) { soma(motivos, 'dist > max'); continue; }
        if ((it.ponto.z - bc.model.position.z) * bc.dirZ < Intencoes.ganhoMin) { soma(motivos, 'ganho < 8 m'); continue; }
        const dMate = Math.hypot(it.ponto.x - m.model.position.x, it.ponto.z - m.model.position.z), tMate = dMate / Intencoes.velCorrida;
        let livre = true;
        for (const a of advs) { if (a.role === 'gk') continue; const da = Math.hypot(a.model.position.x - it.ponto.x, a.model.position.z - it.ponto.z); if (da < Intencoes.livreDestino || da / 7.0 < tMate + Intencoes.margemTempo) { livre = false; break; } }
        if (!livre) { soma(motivos, 'destino nao livre'); continue; }
        soma(motivos, 'passa os filtros basicos');
    }
}
console.log('  diagnostico (portador com overlap do lateral ofensivo em curso):', JSON.stringify(motivos));


const fmt = (o) => Object.keys(o).length ? Object.keys(o).sort().map(k => `${k}: ${o[k]}`).join(' | ') : '-';
console.log(`semente ${semente} (${segundos}s)`);
console.log('  passes iniciados no total:', totalPasses);
console.log('  arranques de overlap  ', fmt(arranques));
console.log('  passes para overlap   ', fmt(passes));
console.log('  lancamentos (>= 20 m) ', fmt(lancamentos));
