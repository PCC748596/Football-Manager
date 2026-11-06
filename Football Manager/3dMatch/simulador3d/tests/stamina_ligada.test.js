/*
A STAMINA DO MANAGER E A DO 3D: o jogador entra com o deposito = `fitness` do manager (skills.energiaInicial) e a ponte devolve o deposito de cada um ao manager (`energia`). Corre com: node tests/stamina_ligada.test.js
*/
require('../tools/headless/harness.js');
let falhas = 0;
const verifica = (c, b, m) => { if (c) console.log('  . ' + b); else { console.log('  X ' + m); falhas++; } };
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = false;
Match.init(new THREE.Scene()); Officials.init(new THREE.Scene()); Match.resetPlay('TeamA');

const p = Match.players.find(q => q.role === 'mid');
p.skills = Object.assign({}, p.skills, { energiaInicial: 0.72 });
p.aplicarEnergiaInicial();
verifica(Math.abs(p.energia - 0.72) < 1e-9, 'entra com 72% (a fitness do manager)', 'energia inicial errada: ' + p.energia);
p.skills.energiaInicial = 0.2; p.aplicarEnergiaInicial();
verifica(p.energia === StaminaModel.minimo, 'nunca abaixo do minimo do deposito (' + StaminaModel.minimo + ')', 'passou do minimo: ' + p.energia);
p.skills.energiaInicial = undefined; p.energia = 0.9; p.aplicarEnergiaInicial();
verifica(p.energia === 0.9, 'sem o dado nao mexe (3D solto)', 'mexeu sem dado');

const gk = Match.opponents.find(q => q.role === 'gk'); gk.energia = 0.63;
const mapa = Ponte._energias();
verifica(mapa[gk.skills.id] === 63, 'a ponte devolve o deposito em % por id real', 'mapa sem o goleiro B: ' + mapa[gk.skills.id]);
const sai = Match.players.find(q => q.role === 'def'); sai.energia = 0.55;
Match.subsFeitas = [{ lado: 'casa', sai: sai, entra: null }];
Match.players = Match.players.filter(q => q !== sai);
verifica(Ponte._energias()[sai.skills.id] === 55, 'quem ja saiu fica com a stamina que tinha', 'substituido ficou fora do mapa');
if (falhas) { console.log('FALHOU: ' + falhas); process.exit(1); } else console.log('OK');
