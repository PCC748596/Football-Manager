/*
O LABORATORIO DO PEIXINHO / VOLEIO (botoes do painel): monta o cruzamento e segue o lance — o finalizador, a bola e o guarda-redes.
Uso: node tools/headless/lab_cruzamento.js [peixinho|voleio] [segundos] [semente]
*/
const tipo = process.argv[2] || 'peixinho';
const segundos = Number(process.argv[3] || 14);
const semente = Number(process.argv[4] || 0);

const mulberry32 = (a) => () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
Math.random = mulberry32(1000 + semente * 977);

require('./harness.js');

const dt = 1 / 60;
const scene = new THREE.Scene();
Match.init(scene);
if (typeof Officials !== 'undefined' && Officials.init) Officials.init(scene);
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;

for (let i = 0; i < 120; i++) Match.update(dt);   // um instante de jogo antes

const gk0 = Match.opponents.find(p => p.role === 'gk'); const og = gk0.grabBall.bind(gk0);
gk0.grabBall = function (...a) { if (process.env.TRACE) console.log('grabBall; voleioEmVoo=' + Match.voleioEmVoo, new Error().stack.split(String.fromCharCode(10)).slice(2, 5).join(' | ')); return og(...a); };
const lab = Match.triggerCruzamento(tipo, 'TeamA');
if (!lab) { console.log('triggerCruzamento nao correu'); process.exit(1); }
const fin = lab.finalizador, cruz = lab.cruzador;
const gk = Match.opponents.find(p => p.role === 'gk');
console.log('alvo', JSON.stringify(lab.alvo), 'v', JSON.stringify(lab.velocidade));

let ult = '';
for (let i = 0; i < Math.round(segundos / dt); i++) {
    Match.update(dt);
    const t = (i + 1) * dt;
    const linha = [
        't=' + t.toFixed(2),
        'estado=' + Match.state,
        'fin=' + (fin.fsm ? fin.fsm.currentState : '?'),
        'cruz=' + (cruz.fsm ? cruz.fsm.currentState : '?'),
        'bola=(' + Match.ball.position.x.toFixed(1) + ',' + Match.ball.position.y.toFixed(2) + ',' + Match.ball.position.z.toFixed(1) + ')',
        'carrier=' + (Match.ballCarrier ? Match.ballCarrier.team + ':' + Match.ballCarrier.role : '-'),
        'gk=' + gk.gkEstado + (gk.dive ? '/' + gk.dive.fase : '') + ' x=' + gk.model.position.x.toFixed(1) + ' y=' + gk.model.position.y.toFixed(2) + ' hasBall=' + gk.hasBall
    ].join(' | ');
    const chave = linha.replace(/t=[\d.]+/, '').replace(/\(.*?\)/g, '').replace(/x=[-\d.]+ y=[-\d.]+/, '');
    if (chave !== ult || i % 30 === 0) { console.log(linha); ult = chave; }
}
