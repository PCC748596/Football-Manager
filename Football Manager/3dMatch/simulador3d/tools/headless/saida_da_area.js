/*
SAIDA DA PROPRIA AREA (SaidaDaArea, config/passing.js). Conta quantas vezes a decisao corre e qual das tres saidas sai
(1 passe a lateral, 2 lancamento ao atacante, 3 chutao), e se o passe/lancamento chegou a um companheiro.
Uso: node tools/headless/saida_da_area.js [segundos] [semente]
*/
const segundos = Number(process.argv[2] || 600);
const semente = Number(process.argv[3] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
const c = { situacoes: 0, passeLateral: 0, passeAtacante: 0, chutao: 0, outro: 0 };
const PlayerCls = Match.players[0].constructor;
const pass0 = PlayerCls.prototype.initiatePass;
let ultimoAplica = new Map();   // jogador -> frame em que a situacao valeu
let frame = 0;
PlayerCls.prototype.initiatePass = function (alvo) {
    if (ultimoAplica.get(this) >= frame - 3) {
        if (alvo && alvo.role === 'atk') c.passeAtacante++; else if (alvo && Math.abs(alvo.model.position.x) >= SaidaDaArea.lateralXMin) c.passeLateral++; else c.outro++;
        ultimoAplica.delete(this);
    }
    return pass0.apply(this, arguments);
};
const dt = 1 / 60;
for (frame = 0; frame < Math.round(segundos / dt); frame++) {
    Match.update(dt);
    if (Match.state !== 'PLAY') continue;
    const p = Match.ballCarrier;
    if (!p || p.role === 'gk' || !p.model) continue;
    const lista = p.team === 'TeamA' ? Match.players : Match.opponents;
    const adv = p.team === 'TeamA' ? Match.opponents : Match.players;
    if (saidaDaAreaAplica({ p, opponents: adv, teammates: lista })) {
        if (!(ultimoAplica.get(p) >= frame - 30)) c.situacoes++;
        ultimoAplica.set(p, frame);
    }
    if (window.bolaChutada && ultimoAplica.get(p) >= frame - 3) { c.chutao++; ultimoAplica.delete(p); }
}
console.log(`semente ${semente}: ${JSON.stringify(c)} em ${segundos}s`);
