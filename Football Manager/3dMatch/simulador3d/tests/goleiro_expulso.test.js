/*
GOLEIRO EXPULSO: o time fica com goleiro. Com reserva (e menos de 5 trocas) o tecnico tira um jogador de linha e mete o goleiro reserva; sem reserva um jogador de linha vai ao gol
com o uniforme de goleiro. No time do utilizador o jogo espera pelo manager (ate 20 s de jogo parado); depois decide sozinho. Corre com: node tests/goleiro_expulso.test.js
*/
const assert = require('assert');
require('../tools/headless/harness.js');

const dt = 1 / 60;
let falhas = 0;
const ok = m => console.log('  . ' + m);
const erro = m => { console.log('  X ' + m); falhas++; };
const verifica = (cond, bom, mau) => { if (cond) ok(bom); else erro(mau); };

if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = false;
const cena = new THREE.Scene();
// A camera da substituicao nao e o que se testa (e o harness nao tem `cameraCore`): `setCameraMode` fica sem efeito.
Match.setCameraMode = function () {};

function novoJogo(comReservaGk) {
    Match.init(cena); Officials.init(cena); Match.resetPlay('TeamA');
    for (let i = 0; i < 120; i++) Match.update(dt);
    Match.ladoDoUtilizador = null;
    Match.subsPendentes = []; Match.subsFeitas = []; Match.goleiroPendente = null;
    const gkB = Match.opponents.find(p => p.role === 'gk');
    const reservas = [];
    if (comReservaGk) reservas.push({ id: 777001, sk: Object.assign({}, gkB.skills, { id: 777001, nome: 'Reserva GK', numero: 12, role: 'gk', pos: 'GK' }) });
    Match.equipaInfoB = Object.assign(Match.equipaInfoB || { nome: 'B', plantel: [] }, { reservas, plantel: [] });   // `plantel: []`: com `reservas` vazio o `TreinadorCPU.reservasDe` cai para o plantel inteiro (que no harness tem goleiros)
    if (typeof TreinadorCPU !== 'undefined') TreinadorCPU._usados = new Set();
    return gkB;
}
const expulsarEParar = (gk) => {
    Officials.expulsar(gk);
    Match.setupSetPiece('FREE_KICK', 'TeamA');   // a falta do vermelho: jogo parado, onde se pode trocar
};
const correrAte = (cond, seg) => { let i = 0; while (!cond() && i < 60 * seg) { Match.update(dt); i++; } return i * dt; };

console.log('1 — com goleiro reserva: sai um jogador de linha e entra o goleiro (CPU)');
let gk = novoJogo(true);
expulsarEParar(gk);
const antes = Match.opponents.length;   // 10, ja sem o expulso (medido depois de expulsar)
verifica(Match.goleiroPendente && Match.goleiroPendente.lado === 'fora', 'goleiroPendente armado', 'goleiroPendente nao armado');
const t1 = correrAte(() => !Match.goleiroPendente && Match.opponents[0] && Match.opponents[0].role === 'gk' && Match.opponents[0].skills.id === 777001, 150);
verifica(Match.opponents[0].role === 'gk' && Match.opponents[0].skills.id === 777001, `o reserva e o goleiro (indice 0) aos ${t1.toFixed(0)} s`, 'o reserva nao entrou no gol');
verifica(Match.opponents.length === antes, 'o time continua com ' + antes + ' (um de linha saiu)', 'numero de jogadores: ' + Match.opponents.length);
verifica(Match.opponents.filter(p => p.role === 'gk').length === 1, 'so um goleiro', 'mais de um goleiro em campo');
verifica(!(Match.expulsos || []).includes(gk), 'o expulso nao volta (fora de Match.expulsos)', 'o expulso ficou em Match.expulsos');
verifica(Match.opponents[0].uniforme === gk.uniforme, 'com o uniforme de goleiro', 'uniforme errado');

console.log('2 — sem goleiro reserva: um jogador de linha vai ao gol, sem gastar troca');
gk = novoJogo(false);
const trocasAntes = (Match.substituicoes || 0);
expulsarEParar(gk);
correrAte(() => !Match.goleiroPendente, 30);
const novo = Match.opponents[0];
verifica(novo && novo.role === 'gk', 'o jogador de linha assumiu o gol (indice 0)', 'ninguem assumiu o gol');
verifica(novo.uniforme === gk.uniforme, 'com o uniforme de goleiro', 'uniforme errado');
verifica(Match.opponents.filter(p => p.role === 'gk').length === 1 && Match.opponents.length === 10, 'um goleiro, dez em campo', 'composicao errada');
verifica((Match.substituicoes || 0) === trocasAntes, 'nao contou como substituicao', 'contou como substituicao');

console.log('3 — com 5 trocas ja feitas, mesmo havendo reserva: jogador de linha ao gol');
gk = novoJogo(true);
Match.subsFeitas = [1, 2, 3, 4, 5].map(() => ({ lado: 'fora', sai: null, entra: null, t: 0 }));
expulsarEParar(gk);
correrAte(() => !Match.goleiroPendente, 30);
verifica(Match.opponents[0].role === 'gk' && Match.opponents[0].skills.id !== 777001, 'jogador de linha no gol, o reserva ficou no banco', 'usou o reserva com 5 trocas feitas');

console.log('4 — time do utilizador: o jogo espera; passados 20 s decide sozinho');
gk = novoJogo(true);
Match.ladoDoUtilizador = 'fora';
expulsarEParar(gk);
const estadoParado = Match.state;
const t4 = correrAte(() => Match.subsPendentes.some(r => r.goleiro) || !Match.goleiroPendente, 8);
verifica(Match.goleiroPendente && Match.state === estadoParado && !Match.subsPendentes.some(r => r.goleiro), 'aos 8 s ainda espera pelo manager', 'decidiu antes de tempo');
const tAuto = correrAte(() => Match.subsPendentes.some(r => r.goleiro) || !Match.goleiroPendente, 20);
verifica(Match.subsPendentes.some(r => r.goleiro) || !Match.goleiroPendente, `decidiu sozinho aos ${(t4 + tAuto).toFixed(0)} s`, 'nunca decidiu');

console.log('5 — time do utilizador: um pedido de goleiro do manager e aceite e marcado urgente');
gk = novoJogo(true);
Match.ladoDoUtilizador = 'fora';
expulsarEParar(gk);
const reserva = TreinadorCPU.reservasDe('TeamB').find(r => r.sk.role === 'gk');
const saiu = TreinadorCPU.saidaParaGoleiro('TeamB');
Match.pedirSubstituicao({ lado: 'fora', sai: String(saiu.skills.id), entra: String(reserva.id), jogador: { position: 'GK' }, _sk: reserva.sk });
const req = Match.subsPendentes[0];
verifica(req && req.goleiro === true && req.urgente === true, 'o pedido ficou goleiro + urgente', 'o pedido nao foi marcado');
correrAte(() => !Match.goleiroPendente && Match.opponents[0].role === 'gk', 150);
verifica(Match.opponents[0].skills.id === reserva.id, 'o goleiro pedido entrou', 'o goleiro pedido nao entrou');

console.log('6 — o pedido do manager com um jogador ineligivel a sair (muro da falta / batedor) nao trava o jogo');
for (const motivo of ['naBarreiraFalta', 'setPieceTaker']) {
    gk = novoJogo(true);
    Match.ladoDoUtilizador = 'fora';
    expulsarEParar(gk);
    const res6 = TreinadorCPU.reservasDe('TeamB').find(r => r.sk.role === 'gk');
    const preso = Match.opponents.find(p => p.role !== 'gk' && p !== Match.setPieceTaker && !p.naBarreiraFalta);
    if (motivo === 'naBarreiraFalta') preso.naBarreiraFalta = true; else Match.setPieceTaker = preso;
    TreinadorCPU._usados.add(res6.id);   // como se um pedido anterior ja tivesse gasto a reserva
    Match.pedirSubstituicao({ lado: 'fora', sai: String(preso.skills.id), entra: String(res6.id), jogador: { position: 'GK' }, _sk: res6.sk });
    verifica(Match.subsPendentes.some(r => r.goleiro && !r.feita), `(${motivo}) o pedido do manager foi aceite (goleiro)`, `(${motivo}) o pedido nao foi aceite`);
    // 20 s de espera + o tempo da troca (sem aquecimento: so a placa e a saida): 60 s chegam com folga
    const t6 = correrAte(() => !Match.goleiroPendente && Match.opponents[0] && Match.opponents[0].role === 'gk', 60);
    verifica(!Match.goleiroPendente && Match.opponents[0].role === 'gk', `(${motivo}) o time ficou com goleiro aos ${t6.toFixed(0)} s`, `(${motivo}) o jogo ficou preso sem goleiro (goleiroPendente ${!!Match.goleiroPendente})`);
    verifica(Match.opponents[0].skills.id === res6.id, `(${motivo}) entrou o goleiro reserva verdadeiro (a reserva nao ficou gasta)`, `(${motivo}) nao entrou o reserva (foi promovido um de linha)`);
    Match.setPieceTaker = null; preso.naBarreiraFalta = false;
}

// As mensagens do 3D para o manager (a partir daqui).
const enviadas = [];
Ponte.enviar = (tipo, dados) => enviadas.push({ tipo, dados });

console.log('7 — a troca automatica (time do utilizador, passada a espera) e reportada ao manager com ids reais');
gk = novoJogo(true);
Match.ladoDoUtilizador = 'fora';
enviadas.length = 0;
expulsarEParar(gk);
const saiAuto = TreinadorCPU.saidaParaGoleiro('TeamB');
correrAte(() => !Match.goleiroPendente && Match.opponents[0].role === 'gk', 150);
const sf7 = enviadas.find(m => m.tipo === 'substituicao_feita');
verifica(sf7 && sf7.dados.lado === 'fora' && sf7.dados.entra === 777001 && sf7.dados.sai === saiAuto.skills.id, `substituicao_feita { sai ${sf7 && sf7.dados.sai}, entra ${sf7 && sf7.dados.entra} }`, 'substituicao_feita em falta ou errada: ' + JSON.stringify(sf7 && sf7.dados));

console.log('8 — o manager arrasta o reserva para o lugar do goleiro EXPULSO: o 3D tira um de linha (em vez de cancelar) e reporta-o com `corrige`');
gk = novoJogo(true);
Match.ladoDoUtilizador = 'fora';
enviadas.length = 0;
expulsarEParar(gk);
const res8 = TreinadorCPU.reservasDe('TeamB').find(r => r.sk.role === 'gk');
const esperado8 = TreinadorCPU.saidaParaGoleiro('TeamB');
Match.pedirSubstituicao({ lado: 'fora', sai: 'p-' + gk.skills.id, entra: 'p-' + res8.id, jogador: { position: 'GK' }, _sk: res8.sk });
correrAte(() => !Match.goleiroPendente && Match.opponents[0].role === 'gk', 150);
const sf8 = enviadas.find(m => m.tipo === 'substituicao_feita');
verifica(Match.opponents[0].skills.id === res8.id, 'entrou o goleiro pedido', 'o goleiro pedido nao entrou');
verifica(sf8 && sf8.dados.sai === esperado8.skills.id && sf8.dados.entra === res8.id && sf8.dados.corrige === gk.skills.id, 'substituicao_feita com o de linha que saiu e corrige = o expulso', 'substituicao_feita: ' + JSON.stringify(sf8 && sf8.dados));
console.log('8b — arrastar outra vez o mesmo reserva (ja em campo) nao cria uma segunda copia');
verifica(Match.pedirSubstituicao({ lado: 'fora', sai: 'p-' + Match.opponents[3].skills.id, entra: 'p-' + res8.id, jogador: { position: 'GK' }, _sk: res8.sk }) === false, 'pedido recusado', 'o pedido foi aceite (dois goleiros iguais)');

console.log('9 — o goleiro expulso nunca e oferecido como reserva (banco vazio: cai para o plantel)');
gk = novoJogo(false);
Match.equipaInfoB.reservas = []; Match.equipaInfoB.plantel = [gk.skills];
Officials.expulsar(gk);
verifica(!TreinadorCPU.reservasDe('TeamB').some(r => r.id === gk.skills.id), 'o expulso nao esta nos reservas', 'o expulso foi oferecido como o proprio reserva');
verifica((Match.goleirosExpulsos || []).includes(gk), 'Match.goleirosExpulsos lembra-o', 'Match.goleirosExpulsos sem ele');

console.log('10 — os dois goleiros expulsos antes de o primeiro estar resolvido: os dois times ficam com goleiro');
gk = novoJogo(false);
const gkA = Match.players.find(p => p.role === 'gk');
Officials.expulsar(gk); Officials.expulsar(gkA);
Match.setupSetPiece('FREE_KICK', 'TeamA');
correrAte(() => !Match.goleiroPendente && Match.players[0].role === 'gk' && Match.opponents[0].role === 'gk', 60);
verifica(Match.players.some(p => p.role === 'gk') && Match.opponents.some(p => p.role === 'gk'), 'casa e fora com goleiro', `casa ${Match.players.some(p => p.role === 'gk')} fora ${Match.opponents.some(p => p.role === 'gk')}`);

if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\ntudo certo');
process.exit(0);   // o harness deixa temporizadores abertos: sem isto o node nao termina
