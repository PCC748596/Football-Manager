/*
A MACA (js/maca.js, config/maca.js): numa parada, o lesionado que tem de sair (MatchInjuries Forced) e levado na maca pelos 4 maqueiros, com o medico
ao lado, ate ao tunel. Verifica: maqueiros e medico chegam ao jogador, ele deita-se na maca (preso a ela), a maca leva-o ao tunel, ele some e sai da lista,
o substituto entra, o jogo fica parado ate a maca sair do campo e recomeca, e os maqueiros voltam ao posto. Corre pelo caminho visual (Sim.running = false).

Corre com: node tests/maca_lesionado.test.js
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
if (typeof Ponte !== 'undefined') Ponte.enviar = function () {};

Match.init(cena); Officials.init(cena); Match.resetPlay('TeamA');
for (let i = 0; i < 120; i++) Match.update(dt);
Match.ladoDoUtilizador = null; Match.subsPendentes = []; Match.subsFeitas = [];
MatchInjuries.reiniciar();
const base = Match.opponents.find(p => p.role === 'mid').skills;
const reservas = [{ id: 888001, sk: Object.assign({}, base, { id: 888001, nome: 'Reserva', numero: 14, role: 'mid', pos: 'CM' }) }];
Match.equipaInfoB = Object.assign(Match.equipaInfoB || { nome: 'B' }, { reservas, plantel: [], medico: { nome: 'Dr. Teste', precisao: 80, tempo: 80, eficacia: 80 } });
if (typeof TreinadorCPU !== 'undefined') { TreinadorCPU._usados = new Set(); if (TreinadorCPU.tick) TreinadorCPU.tick = function () {}; }

console.log('1 — a maca existe e espera no posto');
Match.update(dt);
verifica(Maca.grupo && Maca.grupo.parent === cena && Maca.maqueiros.length === 4, 'maca e 4 maqueiros na cena', 'sem maca/maqueiros na cena');
verifica(Maca.fase === 'parado', 'parados no posto', 'fase inicial ' + Maca.fase);

const dist = (o, x, z) => Math.hypot(o.model.position.x - x, o.model.position.z - z);
const T = TunelJogadores;
const longeDaBola = (lista) => { const b = Match.ball.position; return lista.sort((x, y) => Math.hypot(y.model.position.x - b.x, y.model.position.z - b.z) - Math.hypot(x.model.position.x - b.x, x.model.position.z - b.z)); };

// Corre a sequencia inteira para o lesionado P (ja com a troca pedida e a parada marcada) e verifica cada passo.
function sequencia(P, idReserva) {
    let perto = [Infinity, Infinity, Infinity, Infinity], medPerto = Infinity, viuDeitado = false, preso = true, levandoFrames = 0;
    let paradoAteSair = true, saiuDoCampo = false, estadoNaSaida = null, tunelX = null, sumiu = false, entrouN = null, recomecou = false, tSaida = null, tInicio = null;
    let i = 0;
    for (; i < Math.round(240 / dt); i++) {
        Match.update(dt);
        if (process.env.MACA_DEBUG && i % 120 === 0) console.log('    [t ' + (i * dt).toFixed(0) + '] ' + Match.state + ' maca=' + Maca.fase + ' pose=' + Maca.pose.x.toFixed(1) + ',' + Maca.pose.z.toFixed(1) + ' subs=' + Match.subsPendentes.map(r => r.estado).join(','));
        if (Maca.doente === P && Maca._ancoraChao) {
            if (tInicio === null) tInicio = i * dt;
            Maca.maqueiros.forEach((o, k) => { perto[k] = Math.min(perto[k], dist(o, Maca._ancoraChao.x, Maca._ancoraChao.z)); });
            if (Maca.medico) medPerto = Math.min(medPerto, Maca.medico.perto);
        }
        if (Maca.fase === 'levando' && Maca.doente === P) {
            levandoFrames++;
            // Preso a maca: a bacia em cima da lona, o corpo deitado (o "cima" do corpo na horizontal).
            const v = new THREE.Vector3(); P.rig.pelvis.getWorldPosition(v);
            const cama = Maca._mundo(0, MacaModel.zBacia);
            const cimaDoCorpo = new THREE.Vector3(0, 1, 0).applyQuaternion(P.model.quaternion);
            if (Math.hypot(v.x - cama.x, v.z - cama.z) > 0.15 || Math.abs(cimaDoCorpo.y) > 0.25 || v.y < Maca.pose.y - 0.05 || v.y > Maca.pose.y + 0.45) preso = false;
            else viuDeitado = true;
        }
        if (Maca.doente === P && !saiuDoCampo && Match.state === 'PLAY') paradoAteSair = false;
        if (!saiuDoCampo && P._macaFora) { saiuDoCampo = true; estadoNaSaida = Match.state; tSaida = i * dt; }
        if (Maca.doente === P && Maca.fases.indexOf('no_tunel') >= 0 && tunelX === null) { tunelX = Maca.pose.x; sumiu = !P.model.visible; }
        if (!entrouN) entrouN = Match.opponents.find(q => q.skills && q.skills.id === idReserva) || null;
        if (saiuDoCampo && Match.state === 'PLAY') recomecou = true;
        if (recomecou && Maca.fase === 'parado' && !Maca.medico) break;
    }
    console.log('    fases: ' + Maca.fases.join(' > ') + ' (' + (i * dt).toFixed(1) + ' s; jogo parado com ele em campo: ' + (tSaida === null || tInicio === null ? '-' : (tSaida - tInicio).toFixed(1)) + ' s)');
    verifica(perto.every(d => d < 2.2), 'os 4 maqueiros chegaram ao jogador (' + perto.map(d => d.toFixed(2)).join(', ') + ' m)', 'maqueiros longe: ' + perto.map(d => d.toFixed(2)).join(', '));
    verifica(medPerto < 1.6, 'o medico chegou ao jogador (' + medPerto.toFixed(2) + ' m)', 'o medico nao chegou: ' + medPerto.toFixed(2));
    verifica(Maca.fases.indexOf('deitar') >= 0 && viuDeitado && preso && levandoFrames > 60, 'deitado e preso a maca durante o transporte (' + levandoFrames + ' frames)', 'nao ficou deitado/preso na maca (viu=' + viuDeitado + ' preso=' + preso + ')');
    verifica(saiuDoCampo && paradoAteSair && ['FREE_KICK', 'THROW_IN', 'GOAL_KICK', 'CORNER_KICK'].includes(estadoNaSaida), 'o jogo esperou ate a maca sair do campo', 'o jogo recomecou com ele em campo (estado na saida ' + estadoNaSaida + ')');
    verifica(tunelX !== null && Math.sign(tunelX) === T.lado && Math.abs(tunelX) > Math.abs(T.xBoca), 'a maca entrou no tunel (x = ' + (tunelX === null ? '-' : tunelX.toFixed(1)) + ')', 'a maca nao chegou ao tunel');
    verifica(sumiu && !Match.opponents.includes(P), 'ele sumiu no tunel e saiu da lista', 'continua visivel ou na lista');
    verifica(!!entrouN && Match.opponents.includes(entrouN) && Match.subsFeitas.some(s => s.sai === P && s.entra === entrouN), 'o substituto entrou (troca registada)', 'o substituto nao entrou');
    verifica(recomecou, 'o jogo recomecou', 'o jogo nao recomecou: ' + Match.state);
    const posto = Maca._posto();
    verifica(Maca.fase === 'parado' && Maca.maqueiros.every((o, k) => { const q = MacaModel.parados[k], w = Maca._mundo(q.l, q.a); return dist(o, w.x, w.z) < 0.3; }) && Math.hypot(Maca.pose.x - posto.x, Maca.pose.z - posto.z) < 0.1,
        'os maqueiros voltaram ao posto com a maca', 'nao voltaram ao posto: fase ' + Maca.fase);
    return entrouN;
}

console.log('2 — lesao forcada (MatchInjuries) numa parada, jogador na metade oposta ao tunel (sai pela outra lateral e da a volta)');
const P = longeDaBola(Match.opponents.filter(q => q.role !== 'gk' && T.lado * q.model.position.x < -3))[0];
MatchInjuries.aplicar(P, INJURY_DATABASE.find(l => l.id === 'COM01'), 'Forced', 'contato');
MatchInjuries.ligada = false;   // nenhuma outra lesao no meio do teste
verifica(Match.subsPendentes.length === 1, 'troca pedida', 'troca nao pedida');
Match.setupSetPiece('FREE_KICK', 'TeamA');
const N1 = sequencia(P, 888001);

console.log('3 — o jogo continua');
const t0 = Match.tempoDeJogo || 0;
let jogou = 0;
for (let k = 0; k < Math.round(20 / dt); k++) { Match.update(dt); if (Match.state === 'PLAY') jogou++; }
verifica(jogou > 60 && (Match.tempoDeJogo || 0) > t0 && Match.opponents.length === 11, 'o jogo seguiu com 11 (' + (jogou * dt).toFixed(1) + ' s em PLAY)', 'o jogo nao seguiu (PLAY ' + (jogou * dt).toFixed(1) + ' s, ' + Match.opponents.length + ' em campo)');

console.log('3b — teste manual (Maca.levar) com o jogo a correr, jogador do lado do tunel');
Match.equipaInfoB.reservas.push({ id: 888003, sk: Object.assign({}, base, { id: 888003, nome: 'Reserva 3', numero: 16, role: 'mid', pos: 'CM' }) });
for (let k = 0; k < Math.round(60 / dt) && Match.state !== 'PLAY'; k++) Match.update(dt);
const cand = longeDaBola(Match.opponents.filter(q => q.role !== 'gk' && q !== N1 && T.lado * q.model.position.x > 3));
const P3 = cand[0] || longeDaBola(Match.opponents.filter(q => q.role !== 'gk' && q !== N1))[0];
const levou = Maca.levar(P3);
verifica(levou && Match.state !== 'PLAY', 'Maca.levar aceitou e parou o jogo (' + Match.state + ')', 'Maca.levar falhou (' + levou + ', ' + Match.state + ')');
sequencia(P3, 888003);

console.log('4 — lotes rapidos (Sim.running): sem maca, a troca e instantanea');
Sim.running = true;
Match.subsPendentes = [];
const P2 = Match.opponents.find(q => q.role === 'mid' && q.skills && q.skills.id < 888000);
Match.equipaInfoB.reservas = [{ id: 888002, sk: Object.assign({}, base, { id: 888002, nome: 'Reserva 2', numero: 15, role: 'mid', pos: 'CM' }) }];
MatchInjuries.aplicar(P2, INJURY_DATABASE.find(l => l.id === 'COM01'), 'Forced', 'contato');
Match.setupSetPiece('FREE_KICK', 'TeamA');
for (let k = 0; k < Math.round(30 / dt) && Match.opponents.includes(P2); k++) Match.update(dt);
verifica(!Match.opponents.includes(P2) && !P2._naMaca && Maca.fase === 'parado', 'trocado sem a maca', 'em lote a maca entrou ou a troca nao se fez');
Sim.running = false;

if (falhas) { console.log('\nFALHOU: ' + falhas); process.exit(1); }
console.log('\nOK: a maca leva o lesionado ao tunel e o jogo segue.');
process.exit(0);   // o jsdom deixa o processo vivo
