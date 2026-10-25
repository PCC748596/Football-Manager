/* Depois do laboratorio do voleio, o "Reset KickOff" volta a pôr os jogadores nos postos da formacao? Uso: node tools/headless/lab_reset.js */
require('./harness.js');
const dt = 1 / 60;
const scene = new THREE.Scene(); Match.init(scene);
if (typeof Officials !== 'undefined' && Officials.init) Officials.init(scene);
if (typeof Sim === 'undefined') global.Sim = {}; Sim.running = true;
for (let i = 0; i < 120; i++) Match.update(dt);
const base0 = Match.players.map(p => p.baseTarget.clone());
Match.triggerCruzamento('voleio', 'TeamA');
for (let i = 0; i < 60; i++) Match.update(dt);
Match.resetPlay();
for (let i = 0; i < 20; i++) Match.update(dt);
let pior = 0;
Match.players.forEach((p, i) => { pior = Math.max(pior, p.baseTarget.distanceTo(base0[i])); });
const fora = Match.players.filter(p => p.role !== 'gk').map(p => Math.hypot(p.model.position.x - p.baseTarget.x, p.model.position.z - p.baseTarget.z));
console.log('maior desvio do baseTarget ao original:', pior.toFixed(2), 'm | maior distancia posicao-posto:', Math.max(...fora).toFixed(1), 'm');
const dirA = Lados.dirDe('TeamA');
const d2 = Match.players.filter(p => p.role !== 'gk').map(p => { const a = Match.posicaoDeSaida(p, dirA); return Math.hypot(p.model.position.x - a.x, p.model.position.z - a.z); });
console.log('TeamA: maior distancia ao posto de saida de bola:', Math.max(...d2).toFixed(1), 'm (estado ' + Match.state + ')');
