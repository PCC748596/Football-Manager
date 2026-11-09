/*
A TROCA NO INTERVALO (js/match/match_substituicoes.js `converterTrocasDoIntervalo`, js/abertura.js): sem aquecimento. O entrante sai do tunel com os outros, vai ao 4.o arbitro, PARA ate a placa
subir e so depois segue ao posto; o substituido vai direto ao banco.

Corre com: node tests/troca_no_intervalo.test.js
*/
require('../tools/headless/harness.js');

const dt = 1 / 60;
let falhas = 0;
const ok = m => console.log('  . ' + m);
const erro = m => { console.log('  X ' + m); falhas++; };
const verifica = (cond, bom, mau) => { if (cond) ok(bom); else erro(mau); };

if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = false;
const cena = new THREE.Scene();
Match.init(cena);
Officials.init(cena);

// Entra pelo tunel e joga ate ao PLAY.
Abertura.iniciar();
for (let i = 0; i < Math.round(120 / dt) && Match.state !== 'PLAY'; i++) Match.update(dt);
verifica(Match.state === 'PLAY', 'o jogo comecou', 'o jogo nao comecou: ' + Match.state);

// Intervalo: espera o campo vazio.
Match.iniciarIntervalo();
Match.intervaloSegura = true;
for (let i = 0; i < Math.round(120 / dt) && !Match.intervaloSaiu; i++) Match.update(dt);
verifica(Match.intervaloSaiu === true, 'o campo ficou vazio (intervalo)', 'o campo nunca ficou vazio');

// Um pedido de troca no intervalo.
const P = Match.players.find(p => p.role !== 'gk');
const idSai = String(P.skills.id);
const sk = Object.assign({}, P.skills, { id: 999001, numero: 77, nome: 'Reserva Teste' });
const pediu = Match.pedirSubstituicao({ lado: 'casa', sai: idSai, entra: '999001', jogador: { id: 'p-999001', position: P.pos }, _sk: sk });
verifica(pediu && Match.subsPendentes[0] && Match.subsPendentes[0].intervalo === true, 'o pedido do intervalo fica marcado e espera a volta', 'o pedido nao foi marcado como do intervalo');
for (let i = 0; i < 120; i++) Match.update(dt);
verifica(Match.subsPendentes[0].estado === 'novo', 'sem aquecimento durante o intervalo (o reserva nao se levanta)', 'o pedido arrancou o aquecimento no intervalo: ' + Match.subsPendentes[0].estado);

// A volta do 2.o tempo.
Match.intervaloSegura = false; Match.intervaloTimer = 0.1;
let viuEspera = false, placaNoAr = false, tEspera = 0;
for (let i = 0; i < Math.round(90 / dt) && Match.state !== 'PLAY'; i++) {
    Match.update(dt);
    const req = Match.subsPendentes[0];
    if (req && req.convertido && req.estado === 'placa') { viuEspera = true; placaNoAr = Match.subsEmCurso === req; }
    if (req && req.parte && req.parte.aEspera) tEspera += dt;
}
const req = Match.subsPendentes[0] || { feita: true };
const N = Match.players.find(p => p.skills && p.skills.id === 999001);
verifica(!!N, 'o entrante esta na lista da equipa', 'o entrante nao entrou na lista');
verifica(!Match.players.includes(P), 'o substituido saiu da lista', 'o substituido continua na lista');
verifica(viuEspera && placaNoAr, 'o entrante parou no 4.o arbitro e a troca em curso sinalizou', 'nao houve a espera do sinal (viuEspera=' + viuEspera + ')');
verifica(tEspera > 0.3, 'ficou parado a espera (' + tEspera.toFixed(1) + ' s)', 'nao ficou parado');
verifica(Match.state === 'PLAY', 'o 2.o tempo comecou depois da entrada', 'o jogo nao recomecou: ' + Match.state);
verifica(N && Math.hypot(N.model.position.x - N.baseTarget.x, N.model.position.z - N.baseTarget.z) < 25, 'o entrante esta no campo, perto do posto', 'o entrante nao chegou ao campo');

// O substituido anda ate ao banco (se o estadio tem banco) e acaba.
for (let i = 0; i < Math.round(60 / dt) && !req.feita; i++) Match.update(dt);
const banco = Match._bancoDoLado('casa');
if (banco) verifica(Match.subsPendentes.length === 0 || req.feita || req.pFim, 'o substituido voltou ao banco e sentou-se', 'o substituido nao chegou ao banco');
else ok('(sem banco neste harness: so o entrante e testado)');

if (falhas) { console.log('\nFALHOU: ' + falhas); process.exit(1); }
console.log('\nOK: a troca do intervalo (sem aquecimento, com o sinal do auxiliar) funciona.');
