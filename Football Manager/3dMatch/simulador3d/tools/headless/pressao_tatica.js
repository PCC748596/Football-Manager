/*
O AJUSTE DE PRESSAO (pressaoDefensiva: low / balanced / high) FAZ ALGUMA COISA? A equipa A joga com a pressao dada (a B fica balanced) e mede-se,
so com a A SEM bola: a distancia do defensor da A mais perto do portador, a altura do bloco da A (z medio dos 10, no referencial de ataque dela),
quantas vezes a A recupera a bola e a que altura (z da bola, referencial de ataque da A: 0 = meio-campo, >0 = no campo adversario).
Uso: node tools/headless/pressao_tatica.js <low|balanced|high> [segundos] [semente]
*/
const nivel = process.argv[2] || 'balanced';
const segundos = Number(process.argv[3] || 600);
const semente = Number(process.argv[4] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
Tatics.porEquipa.TeamA = { pressaoDefensiva: nivel };
Tatics.porEquipa.TeamB = { pressaoDefensiva: 'balanced' };
const dt = 1 / 60;
const dists = [], blocos = [], recup = [];
let ant = null, semBola = 0, total = 0;
for (let i = 0; i < Math.round(segundos / dt); i++) {
    Match.update(dt);
    if (Match.state !== 'PLAY') continue;
    total++;
    const pos = Match.possessionTeam;
    if (ant === 'TeamB' && pos === 'TeamA') recup.push(Match.ball.position.z * Match.players[0].dirZ);
    if (pos) ant = pos;
    if (pos !== 'TeamB' || i % 6) continue;
    const c = Match.ballCarrier; if (!c || c.team !== 'TeamB') continue;
    semBola++;
    let m = Infinity;
    for (const p of Match.players) if (p.role !== 'gk' && p.model) m = Math.min(m, p.model.position.distanceTo(c.model.position));
    dists.push(m);
    const campo = Match.players.filter(p => p.role !== 'gk' && p.model);
    blocos.push(campo.reduce((s, p) => s + p.model.position.z * p.dirZ, 0) / campo.length);
}
const med = (a) => a.length ? (a.reduce((s, x) => s + x, 0) / a.length).toFixed(1) : 'n/d';
console.log(`${nivel} s${semente}: sem bola ${semBola}x | dist. do defensor mais perto ${med(dists)} m | bloco z medio ${med(blocos)} | recuperacoes ${recup.length}, altura media ${med(recup)} m, no campo adversario ${recup.filter(z => z > 0).length}`);
