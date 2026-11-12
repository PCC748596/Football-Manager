/*
O EXPULSO NAO VOLTA AO JOGO — nem depois de um golo, nem no 2.o tempo. Relato: *"um jogador ficou doido e toda vez que pega a bola vai contra o proprio gol. Nota 3.8. Foi
expulso mas nao saiu. Parece que esta no time adversario"*.

Era o `resetPlay` (corre a cada golo, bola fora e prazo de bola parada): devolvia os expulsos ao campo e apagava os amarelos de todos. E o `iniciarSegundoTempo` devolvia-os
DEPOIS de refazer os sentidos — o expulso voltava com o sentido do 1.o tempo e atacava a propria baliza. Ver `reiniciarDisciplina` (match_setup.js).

Corre com: node tests/expulso_nao_volta.test.js
*/
require('../tools/headless/harness.js');
let falhas = 0;
const verifica = (c, b, m) => { if (c) console.log('  . ' + b); else { console.log('  X ' + m); falhas++; } };
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = false;
const cena = new THREE.Scene();
Match.init(cena); Officials.init(cena); Match.resetPlay('TeamA');

const exp = Match.players.find(p => p.role === 'mid');
const amarelo = Match.opponents.find(p => p.role === 'def');
amarelo.temAmarelo = true;
const postos = new Map(Match.players.map(p => [p, p.idxFormacao]));
Officials.expulsar(exp);
verifica(Match.players.indexOf(exp) < 0 && Match.players.length === 10, 'expulso: a equipa fica com dez', 'a expulsao nao tirou o jogador da lista');

console.log('depois de um golo (resetPlay)');
Match.resetPlay('TeamB');
verifica(Match.players.indexOf(exp) < 0 && Match.players.length === 10, 'o expulso continua fora', 'o expulso voltou ao campo depois do golo');
verifica(exp.expulso === true, 'continua marcado como expulso', 'a marca de expulso foi apagada');
verifica(amarelo.temAmarelo === true, 'o amarelo de quem o tinha continua', 'o resetPlay apagou os amarelos');

console.log('no 2.o tempo');
const dirAntes = Lados.dirDe('TeamA');
Match.iniciarSegundoTempo();
verifica(Match.players.indexOf(exp) < 0 && Match.players.length === 10, 'o expulso nao volta no 2.o tempo', 'o expulso voltou no 2.o tempo');
verifica(Lados.dirDe('TeamA') === -dirAntes, 'os lados trocaram', 'os lados nao trocaram');
verifica(Match.players.every(p => p.dirZ === Lados.dirDe('TeamA') && p.ownGoalZ === -(CAMPO_COMP / 2) * p.dirZ), 'todos da equipa atacam para o lado certo', 'ha jogador com o sentido errado');
verifica(Match.players.every(p => p.idxFormacao === postos.get(p)), 'cada um mantem o seu posto com dez', 'os postos andaram com a equipa a dez');
verifica(Match.players.filter(p => p.role === 'gk').length === 1, 'continua com um so goleiro', 'goleiros: ' + Match.players.filter(p => p.role === 'gk').length);

console.log('uma partida nova (reiniciarDisciplina)');
Match.reiniciarDisciplina();
verifica(Match.players.length === 11 && exp.expulso === false && amarelo.temAmarelo === false, 'entre jogos o expulso volta e os amarelos apagam-se', 'a partida nova nao repos a disciplina');

console.log(falhas ? 'FALHOU: ' + falhas : 'OK: o expulso fica fora ate ao fim do jogo.');
process.exit(falhas ? 1 : 0);
