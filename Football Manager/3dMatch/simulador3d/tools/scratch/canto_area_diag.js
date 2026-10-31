// Quantos jogadores do time que ataca estao DENTRO DA AREA: antes da batida, no instante da batida e 1, 2 e 3 s depois.
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(7);
require('../headless/harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
if (typeof Officials !== 'undefined' && Officials.init) Officials.init(Match.scene);
const dt = 1 / 60, N = Number(process.argv[2] || 10);
const dentro = (p, alvoZ) => Math.abs(p.model.position.x) < 20.2 && (p.model.position.z * Math.sign(alvoZ)) > (53 - 16.5) && p.role !== 'gk';
const soma = {}; const linhas = [];
for (let n = 0; n < N; n++) {
    const equipa = n % 2 ? 'TeamB' : 'TeamA';
    Match.setupSetPiece('CORNER_KICK', equipa);
    const ataca = Match.players.concat(Match.opponents).filter(p => p.team === equipa);
    const alvoZ = ataca[0].targetGoalZ;
    let tBatida = null; const reg = {};
    for (let i = 0; i < Math.round(25 / dt); i++) {
        Match.update(dt);
        if (tBatida === null && Match.state === 'PLAY') tBatida = i;
        const conta = () => ataca.filter(p => dentro(p, alvoZ)).length;
        if (tBatida === null && i === Math.round(8 / dt)) reg.antes = conta();
        if (tBatida !== null) for (const s of [0, 0.5, 1, 2, 3]) if (i === tBatida + Math.round(s / dt)) reg['+' + s + 's'] = conta();
        if (tBatida !== null && i > tBatida + Math.round(3.5 / dt)) break;
    }
    linhas.push(`canto ${n} (${equipa}): ` + Object.keys(reg).map(k => k + '=' + reg[k]).join(' '));
    for (const k of Object.keys(reg)) soma[k] = (soma[k] || 0) + reg[k];
}
console.log(linhas.join('\n'));
console.log('media:', Object.keys(soma).map(k => k + '=' + (soma[k] / N).toFixed(1)).join(' '));
// detalhe de UM canto: o que cada atacante que estava na area faz 1 s e 2 s depois da batida
{
    Match.setupSetPiece('CORNER_KICK', 'TeamA');
    const ataca = Match.players.filter(p => p.team === 'TeamA');
    const alvoZ = ataca[0].targetGoalZ;
    let tB = null; const antes = [];
    for (let i = 0; i < 25 * 60; i++) {
        Match.update(dt);
        if (tB === null && Match.state === 'PLAY') { tB = i; ataca.filter(p => dentro(p, alvoZ)).forEach(p => antes.push(p)); }
        if (tB !== null && (i === tB + 60 || i === tB + 120)) {
            console.log('--- ' + ((i - tB) / 60) + ' s depois da batida (bola z=' + Match.ball.position.z.toFixed(1) + ' y=' + Match.ball.position.y.toFixed(1) + ' carrier=' + (Match.ballCarrier ? Match.ballCarrier.pos : '-') + ')');
            antes.forEach(p => console.log(p.pos.padEnd(3), (p.playingStyle || '-').padEnd(18), p.fsm.currentState.padEnd(14), 'dentro', dentro(p, alvoZ), 'dist ao alvo', p.dynamicTarget ? Math.hypot(p.dynamicTarget.x - p.model.position.x, p.dynamicTarget.z - p.model.position.z).toFixed(1) : '-', 'alvo z', p.dynamicTarget ? p.dynamicTarget.z.toFixed(1) : '-', 'pos z', p.model.position.z.toFixed(1), 'vel', p.velocity.length().toFixed(1)));
        }
        if (tB !== null && i > tB + 130) break;
    }
}
