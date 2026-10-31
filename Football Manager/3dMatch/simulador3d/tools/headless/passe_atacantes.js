/*
O passe dos atacantes: por posicao de quem passa (ST/SS/AM/LW/RW), quantas vezes o portador tem a bola, quantos passes dao, o que fazem a seguir
(remate, conducao) e quantos passes chegam a um companheiro (o proximo a ter a bola, em 3 s, e da mesma equipa).
Uso: node tools/headless/passe_atacantes.js [segundos] [semente]
*/
const segundos = Number(process.argv[2] || 600);
const semente = Number(process.argv[3] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
const dt = 1 / 60;
const ATK = (process.argv[4] ? process.argv[4].split(',') : ['CF', 'SS', 'AM', 'LW', 'RW']);
const S = {}; const get = (k) => S[k] || (S[k] = { frames: 0, passes: 0, certos: 0, comAdvPerto: 0, certosComAdv: 0, dist: 0, paraTras: 0, remates: 0 });
let pend = [];
let antCarrier = null;
const orig = FootballPlayer.prototype.initiatePass;
FootballPlayer.prototype.initiatePass = function (alvo) {
    if (ATK.includes(this.pos) && alvo && alvo.model) {
        const advs = this.team === 'TeamA' ? Match.opponents : Match.players;
        let dAdv = Infinity;
        for (const o of advs) { const d = Math.hypot(o.model.position.x - this.model.position.x, o.model.position.z - this.model.position.z); if (d < dAdv) dAdv = d; }
        const e = get(this.pos);
        e.passes++; if (dAdv < 4) e.comAdvPerto++;
        const d = Math.hypot(alvo.model.position.x - this.model.position.x, alvo.model.position.z - this.model.position.z);
        e.dist += d;
        if ((alvo.model.position.z - this.model.position.z) * this.dirZ < -1) e.paraTras++;
        pend.push({ t: 0, k: this.pos, equipa: this.team, perto: dAdv < 4 });
    }
    return orig.apply(this, arguments);
};
for (let i = 0; i < Math.round(segundos / dt); i++) {
    Match.update(dt);
    const c = Match.ballCarrier;
    if (c && ATK.includes(c.pos) && Match.state === 'PLAY') get(c.pos).frames++;
    for (const q of pend) q.t += dt;
    if (c) {
        pend = pend.filter(q => {
            if (q.t < 0.3) return true;
            const e = get(q.k);
            if (c.team === q.equipa) { e.certos++; if (q.perto) e.certosComAdv++; }
            return false;
        });
    }
    pend = pend.filter(q => q.t < 3);
}
for (const k of Object.keys(S)) {
    const e = S[k];
    console.log(k.padEnd(3), 'posse', (e.frames / 60).toFixed(0).padStart(4) + 's', 'passes', String(e.passes).padStart(4),
        'chegam', (100 * e.certos / Math.max(1, e.passes)).toFixed(0) + '%', '| com adv a <4m:', e.comAdvPerto, '(' + (100 * e.certosComAdv / Math.max(1, e.comAdvPerto)).toFixed(0) + '% certos)',
        '| dist media', (e.dist / Math.max(1, e.passes)).toFixed(1) + 'm', '| para tras', (100 * e.paraTras / Math.max(1, e.passes)).toFixed(0) + '%');
}
