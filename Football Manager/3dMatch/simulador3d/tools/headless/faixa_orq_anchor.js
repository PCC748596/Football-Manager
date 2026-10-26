/*
Mede a faixa do Orquestrador e do Anchor Man: posição z (referencial de ataque, 0 = meio-campo) e distância à linha
média dos defesas, em posse e sem posse. Se nenhum jogador tem o estilo, atribui-o a um CM (orchestrator) e a um DM
ou CM (anchor_man) da equipa da casa.
Uso: node tools/headless/faixa_orq_anchor.js [segundos] [semente]
*/
const segundos = Number(process.argv[2] || 400);
const semente = Number(process.argv[3] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
const meios = Match.players.filter(p => p.role === 'mid');
if (!Match.players.some(p => p.playingStyle === 'orchestrator') && meios[0]) meios[0].playingStyle = 'orchestrator';
if (!Match.players.some(p => p.playingStyle === 'anchor_man') && meios[1]) meios[1].playingStyle = 'anchor_man';
const dt = 1 / 60;
const dados = { orchestrator: { posse: [], sem: [], z: [] }, anchor_man: { posse: [], sem: [], z: [] } };
for (let i = 0; i < Math.round(segundos / dt); i++) {
    Match.update(dt);
    if (i % 6 || Match.state !== 'PLAY') continue;
    for (const lista of [Match.players, Match.opponents]) {
        if (!lista.length) continue;
        const defs = lista.filter(p => p.role === 'def' && p.model);
        if (!defs.length) continue;
        const linha = defs.reduce((s, p) => s + p.model.position.z * p.dirZ, 0) / defs.length;
        const emPosse = Match.possessionTeam === lista[0].team;
        for (const p of lista) {
            const d = dados[p.playingStyle];
            if (!d || !p.model || Match.ballCarrier === p) continue;
            const z = p.model.position.z * p.dirZ;
            (emPosse ? d.posse : d.sem).push(z - linha);
            if (emPosse) { d.z.push(z); if (z > 20 && p.tacticalTarget) { (global.T = global.T || []).push(((p.tacticalTarget.z * p.dirZ) - z).toFixed(0) + '/' + (p.tacticalTarget.z * p.dirZ).toFixed(0)); }
            if (z > 20) { const k = p.team + ':' + p.pos + ':' + p.playingStyle + ':' + (p.currentState || (p.fsm && p.fsm.current) || p.state) + ':b' + Math.round(Match.ball.position.z * p.dirZ / 20); (global.X = global.X || {})[k] = (global.X[k] || 0) + 1; } }
        }
    }
}
const q = (a, f) => a.length ? a.sort((x, y) => x - y)[Math.floor(a.length * f)].toFixed(1) : 'n/d';
for (const k of Object.keys(dados)) {
    const d = dados[k];
    console.log(`${k}: ${d.posse.length} amostras em posse`);
    console.log(`  z em posse: p10 ${q(d.z, 0.1)} mediana ${q(d.z, 0.5)} p90 ${q(d.z, 0.9)} max ${q(d.z, 0.999)}`);
    console.log(`  à frente da linha dos defesas, em posse: p10 ${q(d.posse, 0.1)} med ${q(d.posse, 0.5)} p90 ${q(d.posse, 0.9)}; sem posse: p10 ${q(d.sem, 0.1)} med ${q(d.sem, 0.5)} p90 ${q(d.sem, 0.9)}`);
}

console.log('z>20 por equipa:pos:desligado', global.X);

console.log('alvo-z / alvo (z>20):', (global.T||[]).slice(0,40).join(' '));
