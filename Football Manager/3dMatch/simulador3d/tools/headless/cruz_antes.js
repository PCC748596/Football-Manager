/*
O QUE FAZ QUEM CRUZA ANTES DE CRUZAR: corre N jogos e, a cada cruzamento (initiatePass com isCross), mostra a velocidade do cruzador e a distancia da bola nos 1.5 s antes e o estado da FSM.
Uso: node tools/headless/cruz_antes.js [jogos 4] [semente 0]
*/
const N = Number(process.argv[2] || 4), semente = Number(process.argv[3] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
require('./harness.js');
const NOMES = ['Atlético-PR', 'Atlético-MG', 'Bahia-BA', 'Botafogo-RJ', 'Chapecoense-SC', 'Corinthians-SP', 'Coritiba-PR', 'Cruzeiro-MG', 'Flamengo-RJ', 'Fluminense-RJ', 'Grêmio-RS', 'Internacional-RS', 'Mirassol-SP', 'Palmeiras-SP', 'Bragantino-SP', 'Remo-PA', 'Santos-SP', 'São Paulo-SP', 'Vasco-RJ', 'Vitória-BA'];
const cena = new THREE.Scene(); Match.init(cena);
if (typeof Officials !== 'undefined' && Officials.init) Officials.init(cena);
if (typeof Sim === 'undefined') global.Sim = {}; Sim.running = true;
const dt = 1 / 60;
const hist = new Map();   // jogador -> ultimos frames
const registos = [];
const PlayerCls = Match.players[0].constructor;
const orig = PlayerCls.prototype.initiatePass;
PlayerCls.prototype.initiatePass = function (alvo) {
    if (this.isCross) {
        const h = hist.get(this) || [];
        registos.push({ min: Math.floor(Match.tempoDeJogo / 60 + 1), pos: this.pos, x: +this.model.position.x.toFixed(1), z: +this.model.position.z.toFixed(1), seq: h.filter((_, i) => i % 15 === 0).map(f => f.v.toFixed(1) + '/' + f.d.toFixed(1) + '/' + f.s).join(' ') });
    }
    return orig.apply(this, arguments);
};
let jogos = 0;
for (let j = 0; j < N; j++) {
    Math.random = mulberry32(7000 + semente * 131 + j * 977);
    const a = NOMES[(j * 7 + semente) % 20], b = NOMES[(j * 7 + semente + 5) % 20];
    const ea = SquadsData.equipas.find(e => e.nome === a), eb = SquadsData.equipas.find(e => e.nome === b);
    Match.primeiroTempoAcabou = false; Match.acrescimo1 = 0; Match.acrescimo2 = 0; Match.acr1Calculado = false; Match.acr2Calculado = false;
    Match.trocarEquipas({ A: ea.id, B: eb.id });
    MatchStats.reset(); Match.tempoDeJogo = 0; Match.placarA = 0; Match.placarB = 0;
    Match.mudarEstado('PLAY', 'diag');
    for (let f = 0; f < 20 * 60 / dt; f++) {
        Match.update(dt);
        const c = Match.ballCarrier;
        if (c) {
            const h = hist.get(c) || []; h.push({ v: Math.hypot(c.velocity.x, c.velocity.z), d: Math.hypot(Match.ball.position.x - c.model.position.x, Match.ball.position.z - c.model.position.z), s: c.fsm ? c.fsm.currentState : '?' });
            if (h.length > 90) h.shift(); hist.set(c, h);
        }
    }
    jogos++;
}
console.log('jogos', jogos, 'cruzamentos', registos.length, '(veloc m/s / dist bola m / estado, a cada 0.25 s, do mais antigo ao cruzamento)');
registos.slice(0, 40).forEach(r => console.log(r.min + "' " + r.pos + ' x=' + r.x + ' z=' + r.z + ' | ' + r.seq));
process.exit(0);
