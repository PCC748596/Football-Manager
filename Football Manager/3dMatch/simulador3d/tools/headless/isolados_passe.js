/*
O PORTADOR QUE JA GANHOU A DEFESA E TOCA PARA TRAS? Corre jogos inteiros e, a cada frame em que um avancado/meia com a bola esta A FRENTE de todos os
defensores adversarios (nenhum jogador de campo adversario mais perto da linha de fundo, num corredor de +-`LARG` m), regista o que ele faz a seguir:
passe para tras / para o lado / para a frente, remate, ou conduz. Para os passes, o ramo da arvore (bt) que o decidiu.

Uso: node tools/headless/isolados_passe.js [jogos 2] [minutos 20] [semente 1]
*/
const JOGOS = Number(process.argv[2] || 2), MIN = Number(process.argv[3] || 20), SEM = Number(process.argv[4] || 1);
const LARG = 14;
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
if (typeof Officials !== 'undefined' && Officials.init) Officials.init(new THREE.Scene());

// avanco do jogador no sentido do ataque dele (z * dirZ): maior = mais perto da baliza atacada
const av = (p, z) => (z === undefined ? p.model.position.z : z) * p.dirZ;
const isolado = (p) => {
    if (!p || !p.hasBall || p.role === 'gk' || p.role === 'def') return false;
    if (av(p) < 0) return false;                                   // so no meio-campo adversario
    const advs = (p.team === 'TeamA') ? Match.opponents : Match.players;
    return !advs.some(o => o && o.model && o.role !== 'gk' && !o.expulso && av(p, o.model.position.z) > av(p) - 0.5 && Math.abs(o.model.position.x - p.model.position.x) < LARG);
};
const res = { golosNoJogo: 0, golosApos: 0, situacoes: 0, passeTras: 0, passeLado: 0, passeFrente: 0, remate: 0, ramosTras: {}, distGolTras: [], exemplos: [] };
const proto = Object.getPrototypeOf(Match.players[0]);
const passOrig = proto.initiatePass, shootOrig = proto.initiateShoot;
proto.initiatePass = function (alvo, ...r) {
    if (this._isoladoAgora && alvo && alvo.model) {
        const d = av(this, alvo.model.position.z) - av(this);
        const k = d < -3 ? 'passeTras' : d > 3 ? 'passeFrente' : 'passeLado';
        res[k]++;
        if (k === 'passeTras') {
            const ramos = (this.btCtx && this.btCtx.trace || []).filter(s => /:SUCCESS$/.test(s)).map(s => s.replace(/:SUCCESS$/, ''));
            const ramo = ramos.slice(-3).join(' > ') || '?';
            res.ramosTras[ramo] = (res.ramosTras[ramo] || 0) + 1;
            const dg = Math.hypot(this.model.position.x, this.dirZ * CAMPO_COMP / 2 - this.model.position.z);
            res.distGolTras.push(Math.round(dg));
            if (res.exemplos.length < 8) res.exemplos.push(`${this.pos} a ${Math.round(dg)} m da baliza, passa ${Math.round(-d)} m para tras ao ${alvo.pos} | ${ramo}`);
        }
        this._isoladoAgora = false;
    }
    return passOrig.call(this, alvo, ...r);
};
proto.initiateShoot = function (...r) { if (this._isoladoAgora) { res.remate++; this._isoladoAgora = false; } return shootOrig.apply(this, r); };

const dt = 1 / 60;
const eqs = SquadsData.equipas;
for (let j = 0; j < JOGOS; j++) {
    Math.random = mulberry32(3000 + SEM * 131 + j * 17);
    const a = eqs[(j * 2) % eqs.length], b = eqs[(j * 2 + 1) % eqs.length];
    Match.primeiroTempoAcabou = false; Match.acrescimo1 = 0; Match.acrescimo2 = 0; Match.acr1Calculado = false; Match.acr2Calculado = false;
    Match.trocarEquipas({ A: a.id, B: b.id });
    MatchStats.reset(); Match.tempoDeJogo = 0; Match.placarA = 0; Match.placarB = 0;
    Match.mudarEstado('PLAY', 'isolados');
    let ultimo = null, janela = null;
    for (let f = 0; f < Math.round(MIN * 60 / dt); f++) {
        const c = Match.ballCarrier;
        if (c && isolado(c)) { if (ultimo !== c) { res.situacoes++; ultimo = c; janela = { equipa: c.team, ate: f + 60 * 8, placar: c.team === 'TeamA' ? Match.placarA : Match.placarB }; } c._isoladoAgora = true; }
        else { if (ultimo && ultimo !== c) ultimo._isoladoAgora = false; if (!c) ultimo = null; }
        // golo da equipa do isolado ate 8 s depois do lance
        if (janela && f <= janela.ate && (janela.equipa === 'TeamA' ? Match.placarA : Match.placarB) > janela.placar) { res.golosApos++; janela = null; }
        Match.update(dt);
    }
    res.golosNoJogo += Match.placarA + Match.placarB;
    res.cancelados = (res.cancelados || 0) + (Match.passesCanceladosPorIsolado || 0); Match.passesCanceladosPorIsolado = 0;
}
res.distGolTras.sort((x, y) => x - y);
console.log(JSON.stringify(res, null, 1));
process.exit(0);
