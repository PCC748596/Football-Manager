/*
LESOES NA PARTIDA (js/injuries): contato sorteia pela vitima da falta, Forced pede troca (feita na parada) e avisa o manager (`lesao`), Hurt fica em campo com -20% de
velocidade, o agravamento vira Forced. Corre com: node tests/lesoes_na_partida.test.js
*/
require('../tools/headless/harness.js');
const dt = 1 / 60;
let falhas = 0;
const ok = m => console.log('  . ' + m);
const erro = m => { console.log('  X ' + m); falhas++; };
const verifica = (c, b, m) => { if (c) ok(b); else erro(m); };

if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = false;
const cena = new THREE.Scene();
Match.setCameraMode = function () {};

const enviadas = [];
if (typeof Ponte !== 'undefined') Ponte.enviar = (tipo, dados) => enviadas.push({ tipo, dados });

function novoJogo() {
    Match.init(cena); Officials.init(cena); Match.resetPlay('TeamA');
    for (let i = 0; i < 120; i++) Match.update(dt);
    Match.ladoDoUtilizador = null; Match.subsPendentes = []; Match.subsFeitas = [];
    MatchInjuries.reiniciar(); enviadas.length = 0;
    const base = Match.opponents.find(p => p.role === 'mid').skills;
    const reservas = [{ id: 888001, sk: Object.assign({}, base, { id: 888001, nome: 'Reserva', numero: 14, role: 'mid', pos: 'CM' }) }];
    Match.equipaInfoB = Object.assign(Match.equipaInfoB || { nome: 'B' }, { reservas, plantel: [] });
    if (typeof TreinadorCPU !== 'undefined') TreinadorCPU._usados = new Set();
}
const lesao = id => INJURY_DATABASE.find(l => l.id === id);

console.log('1 — Hurt: fica em campo, -20% de velocidade, aviso ao manager');
novoJogo();
let p = Match.opponents.find(q => q.role === 'mid');
MatchInjuries.aplicar(p, lesao('SIM01'), 'Hurt', 'contato');
verifica(p.lesaoFator === 0.8 && Math.abs(p.factorCansaco() - (1 - StaminaModel.quedaVelocidade * (1 - p.energia)) * 0.8) < 1e-9, 'factorCansaco x0.8', 'factorCansaco sem o fator da lesao');
verifica(!Match.subsPendentes.length, 'sem troca pedida', 'Hurt nao pede troca');
const msg = enviadas.find(m => m.tipo === 'lesao');
verifica(msg && msg.dados.lado === 'fora' && msg.dados.idLesao === 'SIM01' && msg.dados.dias >= 1 && /Entre/.test(msg.dados.estimativa), 'mensagem lesao ' + JSON.stringify(msg && msg.dados), 'mensagem lesao em falta/errada');

console.log('2 — Forced: pede troca com o reserva e a troca e reportada');
novoJogo();
p = Match.opponents.find(q => q.role === 'mid');
MatchInjuries.aplicar(p, lesao('COM01'), 'Forced', 'semContato');
verifica(Match.subsPendentes.length === 1 && Match.subsPendentes[0].entra === '888001' && Match.subsPendentes[0]._reportar, 'troca pedida (reserva 888001, _reportar)', 'troca forcada nao pedida: ' + JSON.stringify(Match.subsPendentes.map(r => r.entra)));
verifica(p.lesaoFator === MatchInjuries.fatorForcado, 'debuff forte enquanto nao sai', 'sem debuff forte');
Match.setupSetPiece('FREE_KICK', 'TeamA');
let i = 0; while (!Match.subsPendentes.every(r => r.feita) && i < 60 * 120) { Match.update(dt); i++; }
verifica(Match.subsFeitas.length === 1 && !Match.opponents.includes(p), 'troca feita na parada', 'troca nao feita');
verifica(enviadas.some(m => m.tipo === 'substituicao_feita'), 'substituicao_feita enviada', 'substituicao_feita em falta');

console.log('3 — sem reserva do papel: fica em campo baleado');
novoJogo();
Match.equipaInfoB.reservas = [];
p = Match.opponents.find(q => q.role === 'mid');
MatchInjuries.aplicar(p, lesao('COM01'), 'Forced', 'contato');
verifica(!Match.subsPendentes.length && p.lesao.troca === 'sem_reserva' && Match.opponents.includes(p), 'sem reserva: nada pedido', 'pediu troca sem reserva');

console.log('4 — agravamento: Hurt vira Complexa + Forced');
novoJogo();
p = Match.opponents.find(q => q.role === 'mid');
MatchInjuries.aplicar(p, lesao('SIM01'), 'Hurt', 'contato');
p.minutosBaleado = 1000;
const rnd = Math.random; Math.random = () => 0;
MatchInjuries._acMin = 60; MatchInjuries.tick(0.0001);
Math.random = rnd;
verifica(p.lesao.estado === 'Forced' && p.lesao.reg.tipo === 'Complexa' && Match.subsPendentes.length === 1, 'agravou para ' + p.lesao.reg.nomeLesao, 'nao agravou');

console.log('5 — contato: sorteio pela vitima, goleiro imune');
novoJogo();
p = Match.opponents.find(q => q.role === 'def');
Math.random = () => 0;
MatchInjuries.aoContato(p, 2);
Math.random = rnd;
verifica(!!p.lesao, 'vitima lesionada com sorteio 0', 'contato nao lesionou');
novoJogo();
const gk = Match.opponents.find(q => q.role === 'gk');
Math.random = () => 0; MatchInjuries.aoContato(gk, 2); Math.random = rnd;
verifica(!gk.lesao, 'goleiro nao se machuca por falta', 'goleiro lesionado');

if (falhas) { console.log('FALHOU: ' + falhas); process.exit(1); } else console.log('OK');
