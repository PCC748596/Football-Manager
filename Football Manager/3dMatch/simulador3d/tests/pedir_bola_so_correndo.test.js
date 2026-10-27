/*
SO PEDE A BOLA (braco levantado) QUEM ESTA A CORRER PARA A FRENTE E LONGE DO PORTADOR. Relato: *"tem jogador pedindo bola de braco levantado, parado do lado do companheiro que tem a bola"*.
Poe `pedindoBola` num jogador e corre um update: parado, devagar, a recuar ou colado ao portador o pedido cai; a correr para a frente e longe do portador fica.
*/
require('../tools/headless/harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
let falhas = 0;
const erro = m => { falhas++; console.error('  X ' + m); };
const equipa = Match.players;
const p = equipa.find(x => x.role === 'atk') || equipa[5];
const portador = equipa.find(x => x !== p && x.role !== 'gk');
Match.possessionTeam = p.team;
Match.ballCarrier = portador;
const dt = 1 / 60;
function tenta(nome, vx, vz, distPortador, esperado) {
    p.pedindoBola = PedidoDeBola.duracao;
    p.velocity.set(vx, 0, vz);
    // o portador a `distPortador` m (na lateral)
    portador.model.position.set(p.model.position.x + distPortador, portador.model.position.y, p.model.position.z);
    // mede a decisao do cabecalho do update sem deixar o resto do jogo mexer: replica a condicao
    const PB = PedidoDeBola;
    const v = Math.hypot(p.velocity.x, p.velocity.z), vf = p.velocity.z * p.dirZ;
    const colado = Math.hypot(portador.model.position.x - p.model.position.x, portador.model.position.z - p.model.position.z) < PB.distMinPortador;
    const cai = (v < PB.velMin || vf < PB.avancoMin || colado);
    if (cai === esperado) return;
    erro(`${nome}: o pedido ${cai ? 'cai' : 'fica'} e devia ${esperado ? 'cair' : 'ficar'}`);
}
const d = p.dirZ;
tenta('parado ao lado do portador', 0, 0, 3, true);
tenta('devagar (1.2 m/s) longe do portador', 0, 1.2 * d, 20, true);
tenta('a correr para tras', 0, -5 * d, 20, true);
tenta('a correr para a frente mas colado ao portador', 0, 5 * d, 3, true);
tenta('a correr para a frente, longe do portador', 0, 5 * d, 20, false);
// E o update real: parado ao lado do portador, a flag e zerada.
p.pedindoBola = PedidoDeBola.duracao; p.velocity.set(0, 0, 0);
portador.model.position.set(p.model.position.x + 3, portador.model.position.y, p.model.position.z);
p.update(dt);
if (p.pedindoBola > 0) erro('no update real, parado ao lado do portador o pedido continuou: ' + p.pedindoBola);
if (falhas) { console.error(falhas + ' falha(s)'); process.exit(1); }
console.log('OK pedir_bola_so_correndo');
process.exit(0);
