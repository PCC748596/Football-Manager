/*
O BOTAO "Injury" (Maca.lesaoGrave, js/maca.js): quem tem a bola cai com uma lesao complexa (Forced), o jogo para com falta para o time dele, ele nao bate a
falta, e a maca leva-o ao tunel; o substituto entra e o jogo recomeca. Caminho visual (Sim.running = false).

Corre com: node tests/maca_botao_injury.test.js
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
const enviados = [];
if (typeof Ponte !== 'undefined') Ponte.enviar = function (tipo, dados) { enviados.push({ tipo, dados }); };

Match.init(cena); Officials.init(cena); Match.resetPlay('TeamA');
Match.ladoDoUtilizador = null; Match.subsPendentes = []; Match.subsFeitas = [];
MatchInjuries.reiniciar();
// Reservas para as duas equipas (o portador pode ser de qualquer uma).
for (const [lista, chave, id] of [[Match.players, 'equipaInfoA', 777001], [Match.opponents, 'equipaInfoB', 888001]]) {
    const base = lista.find(p => p.role === 'mid').skills;
    const reservas = ['def', 'mid', 'atk'].map((r, k) => ({ id: id + k, sk: Object.assign({}, base, { id: id + k, nome: 'Reserva ' + r, numero: 14 + k, role: r, pos: r === 'def' ? 'CB' : r === 'mid' ? 'CM' : 'CF' }) }));
    Match[chave] = Object.assign(Match[chave] || { nome: chave }, { reservas, plantel: [], medico: { nome: 'Dr. ' + chave, precisao: 80, tempo: 80, eficacia: 80 } });
}
if (typeof TreinadorCPU !== 'undefined') { TreinadorCPU._usados = new Set(); if (TreinadorCPU.tick) TreinadorCPU.tick = function () {}; }

// Joga ate alguem de linha ter a bola em jogo corrido.
let P = null;
for (let i = 0; i < Math.round(90 / dt) && !P; i++) {
    Match.update(dt);
    const c = Match.ballCarrier;
    if (Match.state === 'PLAY' && !Match.kickoffActive && c && c.role !== 'gk' && c.model) P = c;
}
console.log('1 — o botao Injury com a bola nos pes de ' + (P ? P.team + ' ' + P.pos : 'ninguem'));
verifica(!!P, 'ha um portador de linha', 'ninguem com a bola em 90 s');
if (!P) process.exit(1);
const time = P.team, lista = time === 'TeamA' ? Match.players : Match.opponents;

const r = Maca.lesaoGrave();
verifica(r === true, 'Maca.lesaoGrave() combinou a maca', 'lesaoGrave devolveu ' + r);
verifica(!!(P.lesao && P.lesao.estado === 'Forced'), 'lesao Forced registada (' + (P.lesao && P.lesao.reg && P.lesao.reg.nomeLesao) + ')', 'sem lesao Forced');
verifica(!!(P.lesao && P.lesao.reg && P.lesao.reg.tipo === 'Complexa'), 'lesao complexa', 'tipo ' + (P.lesao && P.lesao.reg && P.lesao.reg.tipo));
verifica(enviados.some(e => e.tipo === 'lesao'), 'o manager recebe o aviso da lesao', 'sem mensagem lesao');
verifica(!!P.queda, 'ele caiu', 'nao caiu');
verifica(Match.ballCarrier !== P && !P.hasBall, 'largou a bola', 'continua com a bola');
verifica(Match.state === 'FREE_KICK', 'o jogo parou com falta', 'estado ' + Match.state);
verifica(Match.setPieceTaker !== P, 'ele nao bate a falta', 'o lesionado e o batedor');

let comecou = false, levando = false, sumiu = false, entrou = false, recomecou = false, tFim = null;
for (let i = 0; i < Math.round(180 / dt); i++) {
    Match.update(dt);
    if (Maca.doente === P) comecou = true;
    if (Maca.doente === P && Maca.fase === 'levando') levando = true;
    if (comecou && lista.indexOf(P) < 0) sumiu = true;
    if (lista.some(p => p.skills && p.skills.id >= 777001 && p.skills.id <= 888003)) entrou = true;
    if (sumiu && entrou && Match.state === 'PLAY') { recomecou = true; tFim = i * dt; break; }
}
console.log('2 — a maca');
verifica(comecou, 'a maca foi buscar o lesionado', 'a maca nao comecou');
verifica(levando, 'levaram-no na maca', 'nunca foi levado');
verifica(sumiu, 'saiu da lista (tunel)', 'continua na lista');
verifica(entrou, 'o substituto entrou', 'sem substituto');
verifica(recomecou, 'o jogo recomecou (' + (tFim || 0).toFixed(1) + ' s depois do botao)', 'o jogo nao recomecou');
verifica(lista.filter(p => p && !p.expulso).length === 11, 'continua com 11', 'ficou com ' + lista.length);

console.log(falhas ? '\nFALHOU: ' + falhas : '\nOK: o botao Injury derruba quem tem a bola, para o jogo e leva-o na maca.');
process.exit(falhas ? 1 : 0);
