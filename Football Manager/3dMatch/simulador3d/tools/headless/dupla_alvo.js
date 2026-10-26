// Companheiro perto do portador em MOVE_TO_POS: onde esta o ALVO dele em relacao ao portador? (dist do alvo vs dist do corpo)
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
require('./harness.js');
const NOMES = ['Atlético-PR', 'Atlético-MG', 'Bahia-BA', 'Botafogo-RJ', 'Chapecoense-SC', 'Corinthians-SP', 'Coritiba-PR', 'Cruzeiro-MG', 'Flamengo-RJ', 'Fluminense-RJ', 'Grêmio-RS', 'Internacional-RS', 'Mirassol-SP', 'Palmeiras-SP', 'Bragantino-SP', 'Remo-PA', 'Santos-SP', 'São Paulo-SP', 'Vasco-RJ', 'Vitória-BA'];
const cena = new THREE.Scene(); Match.init(cena);
if (typeof Officials !== 'undefined' && Officials.init) Officials.init(cena);
if (typeof Sim === 'undefined') global.Sim = {}; Sim.running = true;
const _t = Action.prototype.tick; Action.prototype.tick = function (bb) { if (bb && bb.p) bb.p._ultAct = this.name; return _t.call(this, bb); };
if (process.env.CEDE === '0') CedeAoPortador.activo = false;
const dt = 1 / 60; let n = 0, somaAlvo = 0, somaCorpo = 0, alvoPerto = 0;
const amostras = [];
for (let j = 0; j < 3; j++) {
    Math.random = mulberry32(7000 + j * 977);
    const ea = SquadsData.equipas.find(e => e.nome === NOMES[(j * 7) % 20]), eb = SquadsData.equipas.find(e => e.nome === NOMES[(j * 7 + 5) % 20]);
    Match.primeiroTempoAcabou = false; Match.acrescimo1 = 0; Match.acrescimo2 = 0; Match.acr1Calculado = false; Match.acr2Calculado = false;
    Match.trocarEquipas({ A: ea.id, B: eb.id }); MatchStats.reset(); Match.tempoDeJogo = 0; Match.placarA = 0; Match.placarB = 0; Match.mudarEstado('PLAY', 'diag');
    for (let f = 0; f < 20 * 60 / dt; f++) {
        Match.update(dt);
        const c = Match.ballCarrier; if (!c || c.role === 'gk' || Match.tempoDeJogo < 60) continue;
        for (const m of (c.team === 'TeamA' ? Match.players : Match.opponents)) {
            if (m === c || m.role === 'gk' || !m.model || m.fsm.currentState !== 'MOVE_TO_POS' || !m.dynamicTarget) continue;
            const dc = Math.hypot(m.model.position.x - c.model.position.x, m.model.position.z - c.model.position.z);
            if (dc > 2.5) continue;
            const dt2 = Math.hypot(m.dynamicTarget.x - c.model.position.x, m.dynamicTarget.z - c.model.position.z);
            n++; somaAlvo += dt2; somaCorpo += dc; if (dt2 < 4) alvoPerto++;
            if (dt2 < 4 && amostras.length < 400) amostras.push(`act=${m._ultAct} chaser=${Match.chaserA === m || Match.chaserB === m} recv=${Match.intendedReceiver === m} recvC=${Match.intendedReceiver === c} apoio=${!!m.apoioPonto} t=${Match.tempoDeJogo.toFixed(1)} ${c.pos}+${m.pos} corpo=${dc.toFixed(1)} alvo=${dt2.toFixed(1)} posto=${m.postoBase ? Math.hypot(m.postoBase.x - c.model.position.x, m.postoBase.z - c.model.position.z).toFixed(1) : '?'}`);
        }
    }
}
console.log('frames', n, 'dist media corpo', (somaCorpo / n).toFixed(2), 'alvo', (somaAlvo / n).toFixed(2), 'alvo<4m:', alvoPerto);
const cont = {}; amostras.forEach(a => { const k = a.split(' chaser')[0]; cont[k] = (cont[k] || 0) + 1; }); console.log(JSON.stringify(cont)); amostras.filter((_, i) => i % 25 === 0).forEach(a => console.log(a));
process.exit(0);
