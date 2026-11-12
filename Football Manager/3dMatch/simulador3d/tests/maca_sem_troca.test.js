/*
A LESAO NO MANAGER E A MACA SEM TROCA.
  1. O aviso `lesao` chega ao manager com `tipo: 'lesao'` (o envelope verdadeiro do Ponte.enviar): o `tipo` da lesao ('Simples' | 'Complexa') vai em `tipoLesao`.
     Antes sobrescrevia o tipo da mensagem e o manager nunca marcava o jogador como INJ.
  2. Time do utilizador: o botao Injury nao faz a troca sozinho — o jogador fica com a lesao (troca 'manual') e a maca espera a troca do treinador.
  3. Sem troca possivel (sem reserva do papel): a maca leva-o na mesma e o time fica com 10.
Caminho visual (Sim.running = false). Corre com: node tests/maca_sem_troca.test.js
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
const saidas = [];
Ponte.saida = function (msg) { saidas.push(msg); };   // o envelope verdadeiro (Ponte.enviar monta-o)

Match.init(cena); Officials.init(cena); Match.resetPlay('TeamA');
Match.subsPendentes = []; Match.subsFeitas = [];
MatchInjuries.reiniciar();
if (typeof TreinadorCPU !== 'undefined') { TreinadorCPU._usados = new Set(); if (TreinadorCPU.tick) TreinadorCPU.tick = function () {}; }
for (const chave of ['equipaInfoA', 'equipaInfoB']) Match[chave] = Object.assign(Match[chave] || { nome: chave }, { reservas: [], plantel: [], medico: { nome: 'Dr. ' + chave, precisao: 80, tempo: 80, eficacia: 80 } });

const portador = (team) => {
    for (let i = 0; i < Math.round(120 / dt); i++) {
        Match.update(dt);
        const c = Match.ballCarrier;
        if (Match.state === 'PLAY' && !Match.kickoffActive && c && c.role !== 'gk' && c.model && (!team || c.team === team)) return c;
    }
    return null;
};

console.log('1 e 2 — time do utilizador: lesao no manager, sem troca automatica');
Match.ladoDoUtilizador = 'casa';
const P = portador('TeamA');
verifica(!!P, 'um portador do time do utilizador (' + (P && P.pos) + ')', 'ninguem do TeamA com a bola');
if (P) {
    Maca.lesaoGrave();
    const msg = saidas.find(m => m.tipo === 'lesao');
    verifica(!!msg, 'o manager recebe a mensagem com tipo "lesao"', 'nenhuma mensagem tipo lesao (tipos: ' + [...new Set(saidas.map(m => m.tipo))].join(',') + ')');
    verifica(msg && (msg.tipoLesao === 'Complexa' || msg.tipoLesao === 'Simples'), 'o tipo da lesao vai em tipoLesao (' + (msg && msg.tipoLesao) + ')', 'sem tipoLesao');
    verifica(P.lesao && P.lesao.troca === 'manual', 'o 3D nao troca sozinho (troca manual)', 'troca ' + (P.lesao && P.lesao.troca));
    verifica(!(Match.subsPendentes || []).some(r => !r.feita && r.lado === 'casa'), 'nenhuma troca pendente criada', 'ha troca pendente');
    for (let i = 0; i < Math.round(8 / dt); i++) Match.update(dt);
    verifica(Maca.doente !== P, 'a maca espera a troca do treinador', 'a maca entrou sem a troca');
}

console.log('3 — sem reserva: a maca leva-o e o time fica com 10');
Match.ladoDoUtilizador = null;
MatchInjuries.reiniciar();
const Q = portador('TeamB');
verifica(!!Q, 'um portador do TeamB (' + (Q && Q.pos) + ')', 'ninguem do TeamB com a bola');
if (Q) {
    const antes = Match.opponents.length;
    Maca.lesaoGrave();
    verifica(Q.lesao && Q.lesao.troca === 'sem_reserva', 'sem reserva do papel', 'troca ' + (Q.lesao && Q.lesao.troca));
    let levou = false, saiu = false, recomecou = false;
    for (let i = 0; i < Math.round(180 / dt); i++) {
        Match.update(dt);
        if (Maca.doente === Q && Maca.fase === 'levando' && !levou) {
            levou = true;
            // Com a maca em uso nao ha outra lesao seria (pedido): Forced/complexa recusada, leve aceita.
            const outro = Match.players.find(p => p.role !== 'gk' && !p.lesao);
            const grave = INJURY_DATABASE.find(l => l.tipo === 'Complexa'), leve = INJURY_DATABASE.find(l => l.tipo === 'Simples');
            verifica(MatchInjuries.aplicar(outro, grave, 'Forced', 'contato') === false && !outro.lesao, 'com a maca em uso, a lesao seria e recusada', 'houve outra lesao seria');
            verifica(Maca.lesaoGrave() === false, 'o botao Injury espera a maca voltar', 'o botao aceitou com a maca em uso');
            MatchInjuries.aplicar(outro, leve, 'Hurt', 'contato');
            verifica(!!outro.lesao, 'uma lesao leve (Hurt) continua possivel', 'a leve foi recusada');
        }
        if (Match.opponents.indexOf(Q) < 0) saiu = true;
        if (saiu && Match.state === 'PLAY') { recomecou = true; break; }
    }
    verifica(levou, 'levaram-no na maca sem troca', 'a maca nao o levou');
    verifica(saiu && Match.opponents.length === antes - 1, 'saiu da lista: ficam ' + Match.opponents.length, 'ficam ' + Match.opponents.length);
    verifica(recomecou, 'o jogo recomecou com 10', 'o jogo nao recomecou');
}

console.log(falhas ? '\nFALHOU: ' + falhas : '\nOK: a lesao chega ao manager; o time do utilizador espera a troca; sem troca possivel a maca leva-o e o time fica com 10.');
process.exit(falhas ? 1 : 0);
