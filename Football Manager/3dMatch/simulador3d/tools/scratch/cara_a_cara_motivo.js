/*
PESQUISA (so mede): num cara a cara, por que o atacante nao chuta, ou chuta a 1 m do guarda-redes?
Por lance (Match.triggerCaraACara) mostra: quando entrou na area, quando o `frenteAFrente` ligou, quando o SHOOT comecou, e a distancia ao guarda-redes e a baliza nesse momento.
Uso: node tools/scratch/cara_a_cara_motivo.js [lances 10]
*/
const N = Number(process.argv[2] || 10);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(777);
require('../headless/harness.js');
const dt = 1 / 60;
const scene = new THREE.Scene(); Match.init(scene);
if (typeof Officials !== 'undefined' && Officials.init) Officials.init(scene);
if (typeof Sim === 'undefined') global.Sim = {}; Sim.running = true;
const PROF = (typeof Area !== 'undefined' && Area.profundidade) || 16.5;
const f1 = (x) => (x === null || x === undefined) ? '  - ' : x.toFixed(1).padStart(4);

const resumo = [];
for (let n = 0; n < N; n++) {
    Match.init(scene);
    if (typeof Officials !== 'undefined' && Officials.init) Officials.init(scene);
    for (let i = 0; i < 30; i++) Match.update(dt);
    Match.triggerCaraACara('TeamA', (Math.random() * 2 - 1) * 30);
    const atk = Match.players.filter(p => p.role !== 'gk').find(p => p.hasBall) || Match.ballCarrier;
    const gk = Match.opponents.find(p => p.role === 'gk');
    if (!atk || !gk) { console.log('lance', n, 'sem atacante/goleiro'); continue; }
    const ev = { entrouArea: null, ffLigou: null, shoot: null, fim: null };
    const linhas = [];
    let ultimoEstado = '';
    for (let i = 0; i < 60 * 8; i++) {
        Match.update(dt);
        const t = i * dt;
        const P = atk.model.position, G = gk.model.position;
        const distFundo = Math.abs(atk.targetGoalZ - P.z), distGk = Math.hypot(G.x - P.x, G.z - P.z);
        const estado = atk.fsm.currentState;
        if (ev.entrouArea === null && distFundo <= PROF) ev.entrouArea = { t, distFundo, distGk };
        if (ev.ffLigou === null && atk.frenteAFrente) ev.ffLigou = { t, distFundo, distGk };
        if (ev.shoot === null && estado === 'SHOOT') ev.shoot = { t, distFundo, distGk, ff: !!atk.frenteAFrente, tipo: atk.ultimoRemateTipo };
        if (i % 12 === 0 && ev.shoot === null) linhas.push(`  t ${t.toFixed(1).padStart(4)}  ${String(estado).padEnd(10)} fundo ${f1(distFundo)} gk ${f1(distGk)} ff ${atk.frenteAFrente ? 'S' : 'n'} espera ${f1(atk.chuteEspera || 0)} bola ${atk.hasBall ? 'S' : 'n'}`);
        if (['GOAL', 'GOAL_KICK', 'CORNER_KICK'].includes(Match.state) || (gk.gkEstado === 'segurando')) { ev.fim = { t, estado: Match.state, gk: gk.gkEstado }; break; }
    }
    resumo.push(ev);
    const d = (o) => o ? `t ${o.t.toFixed(1)} s | ${f1(o.distFundo)} m da linha | ${f1(o.distGk)} m do GK` : 'nunca';
    console.log(`lance ${n}: entrou na area ${d(ev.entrouArea)} | ff ligou ${d(ev.ffLigou)} | SHOOT ${d(ev.shoot)}${ev.shoot ? ' tipo ' + ev.shoot.tipo : ''} | fim ${ev.fim ? ev.fim.estado + '/' + ev.fim.gk + ' t ' + ev.fim.t.toFixed(1) : 'sem fim em 8 s'}`);
    if (!ev.shoot || ev.shoot.distGk < 3) linhas.slice(0, 14).forEach(l => console.log(l));
}
const com = resumo.filter(r => r.shoot), sem = resumo.filter(r => !r.shoot);
const med = (a) => a.length ? (a.reduce((s, x) => s + x, 0) / a.length).toFixed(1) : '-';
console.log(`\n${N} lances: chutaram ${com.length}, nao chutaram ${sem.length}`);
console.log('distancia ao goleiro no chute: media ' + med(com.map(r => r.shoot.distGk)) + ' m | min ' + (com.length ? Math.min(...com.map(r => r.shoot.distGk)).toFixed(1) : '-') + ' | a menos de 3 m: ' + com.filter(r => r.shoot.distGk < 3).length);
console.log('distancia a linha no chute: media ' + med(com.map(r => r.shoot.distFundo)) + ' m');
process.exit(0);
