// Com um companheiro LIVRE à frente (nenhum adversário a menos de 7 m dele nem a menos de 2.5 m da linha do passe, e ganha >= 8 m de avanço): quantas vezes o portador passa em 2 s,
// e quando não passa, o que faz. E o mesmo para "campo livre à frente" (ninguém a 20 m em 45 graus): conduz ou adianta?
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + Number(process.argv[3] || 0) * 977);
require('../headless/harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
if (process.env.SEM) PassModel.lancarLivre = false;
const dt = 1 / 60, seg = Number(process.argv[2] || 300);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const segDist = (p, a, b) => { const sx = b.x - a.x, sz = b.z - a.z, l2 = sx * sx + sz * sz || 1; const t = Math.max(0, Math.min(1, ((p.x - a.x) * sx + (p.z - a.z) * sz) / l2)); return Math.hypot(p.x - (a.x + sx * t), p.z - (a.z + sz * t)); };
let episodiosLivre = 0, passou = 0; const outros = {};
let epCampo = 0, epCarry = 0; const estCampo = {};
let pend = null, pendC = null; let tPass = 0;
const orig = FootballPlayer.prototype.initiatePass;
FootballPlayer.prototype.initiatePass = function () { this._passou = Match.tempoDeJogo; return orig.apply(this, arguments); };
for (let i = 0; i < seg / dt; i++) {
    Match.update(dt);
    const c = Match.ballCarrier;
    if (pend && i - pend.i > 120) { if (pend.p._passou !== undefined && Match.tempoDeJogo - pend.p._passou < 3 * 4.5 + 5) passou++; else { const k = pend.estado + ':' + pend.p.pos; outros[pend.estado] = (outros[pend.estado] || 0) + 1; } pend = null; }
    if (pendC && i - pendC.i > 120) { epCampo++; const e = pendC.p.fsm.currentState; estCampo[e] = (estCampo[e] || 0) + 1; pendC = null; }
    if (!c || Match.state !== 'PLAY' || i % 20) continue;
    const meu = c.team === 'TeamA' ? Match.players : Match.opponents, adv = c.team === 'TeamA' ? Match.opponents : Match.players;
    const cp = { x: c.model.position.x, z: c.model.position.z };
    if (!pend) {
        const livres = meu.filter(m => m !== c && m.role !== 'gk' && m.model).filter(m => {
            const mp = { x: m.model.position.x, z: m.model.position.z };
            if ((mp.z - cp.z) * c.dirZ < (process.env.LONGO ? 15 : 8) || dist(cp, mp) > 40) return false;
            if (process.env.LONGO && !adv.every(o => { const dz = (o.model.position.z - mp.z) * c.dirZ; if (dz <= 0) return true; const d = Math.hypot(o.model.position.x - mp.x, dz); return d > 20 || Math.atan2(Math.abs(o.model.position.x - mp.x), dz) > 45 * Math.PI / 180; })) return false;
            return adv.every(o => dist(mp, o.model.position) > 7 && segDist({ x: o.model.position.x, z: o.model.position.z }, cp, mp) > 2.5);
        });
        if (livres.length) { episodiosLivre++; pend = { i, p: c, estado: c.fsm.currentState }; c._passou = undefined; }
    }
    if (!pendC) {
        const livre = adv.every(o => { const dz = (o.model.position.z - cp.z) * c.dirZ; if (dz <= 0) return true; const d = Math.hypot(o.model.position.x - cp.x, dz); return d > 20 || Math.atan2(Math.abs(o.model.position.x - cp.x), dz) > 45 * Math.PI / 180; });
        if (livre && (cp.z * c.dirZ) < 17 && c.role !== 'gk' && c.hasBall) { epCarry++; pendC = { i, p: c }; }
    }
}
console.log(`companheiro LIVRE a frente: ${episodiosLivre} situacoes, passou em 2 s: ${passou} (${(100 * passou / Math.max(1, episodiosLivre)).toFixed(0)}%), nao passou: estados do portador`, outros);
console.log(`campo livre a frente (ninguem a 20 m/45graus) fora do ultimo terco: ${epCampo} situacoes; estado do portador 2 s depois:`, estCampo);
