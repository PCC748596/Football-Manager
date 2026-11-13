/*
CHEMISTRY INTELLIGENCE — etapa 1: o Chemistry da dupla e o quadro de intencoes. Spec: docs/superpowers/specs/2026-11-12-chemistry-intelligence-design.md.

Corre com: node tests/chemistry_intel.test.js
*/
require('../tools/headless/harness.js');
let falhas = 0;
const verifica = (c, b, m) => { if (c) console.log('  . ' + b); else { console.log('  X ' + m); falhas++; } };
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = false;
Match.init(new THREE.Scene()); if (typeof Officials !== 'undefined' && Officials.init) Officials.init(new THREE.Scene());
Match.resetPlay('TeamA');
Match.state = 'PLAY'; Match.kickoffActive = false; Match.kickoffPendingPassToDef = false; Match.possessionTeam = 'TeamA';
Match.ballCarrier = null; Match.players.concat(Match.opponents).forEach(p => { p.hasBall = false; });
const M = ChemistryIntelModel;
M.activo = true;   // no jogo vem desligado ate a validacao (config); aqui testa-se o sistema ligado
const [a, b, c, d] = Match.players.filter(p => p.role !== 'gk');
const id = (p) => 'p-' + p.skills.id;

console.log('1 — o Chemistry da dupla (10 jogos juntos = 99)');
ChemistryIntel.reset();
ChemistryIntel.carregar('TeamA', null);
verifica(ChemistryIntel.chemistry(a, b) === M.semDados, `sem dados do manager: ${M.semDados}`, 'sem dados: ' + ChemistryIntel.chemistry(a, b));
ChemistryIntel.carregar('TeamA', [[id(a), id(b), 10 * 90], [id(b), id(a), 10 * 90], [id(a), id(c), 5 * 90], [id(c), id(d), 1 * 90]]);
verifica(ChemistryIntel.chemistry(a, b) === 99 && ChemistryIntel.chemistry(b, a) === 99, '10 jogos juntos: 99 (nos dois sentidos)', 'chem a-b ' + ChemistryIntel.chemistry(a, b));
verifica(Math.abs(ChemistryIntel.chemistry(a, c) - 50) <= 1, '5 jogos: ~50', 'chem a-c ' + ChemistryIntel.chemistry(a, c));
verifica(ChemistryIntel.chemistry(c, d) === 10, '1 jogo: 10', 'chem c-d ' + ChemistryIntel.chemistry(c, d));
verifica(ChemistryIntel.chemistry(b, d) === 0, 'dupla que nunca jogou junta: 0', 'chem b-d ' + ChemistryIntel.chemistry(b, d));
verifica(ChemistryIntel.chemistry(a, Match.opponents[3]) === 0, 'adversario: 0', 'adversario com chemistry');
verifica(ChemistryIntel.faixa(10) === 0 && ChemistryIntel.faixa(35) === 1 && ChemistryIntel.faixa(55) === 2 && ChemistryIntel.faixa(70) === 3 && ChemistryIntel.faixa(95) === 4, 'as 5 faixas de comunicacao', 'faixas erradas');

console.log('2 — o quadro de intencoes');
ChemistryIntel.reset();
const m1 = ChemistryIntel.postar(c, a, 'FORWARD_RUN', 10, 30, 'lancar', 0.8);
verifica(m1 && m1.estado === 'enviada' && m1.chem === 50 && m1.validade === M.validade.FORWARD_RUN, 'postada: enviada, com o Chemistry da dupla e a validade do tipo', 'mensagem: ' + JSON.stringify(m1 && { e: m1.estado, c: m1.chem, v: m1.validade }));
verifica(ChemistryIntel.postar(c, b, 'SUPPORT_RUN', -15, 10) === null && ChemistryIntel.ultimoMotivo === 'limite', 'uma intencao ativa por remetente', 'motivo: ' + ChemistryIntel.ultimoMotivo);
verifica(ChemistryIntel.postar(d, b, 'BOX_RUN', 12, 31) === null && ChemistryIntel.ultimoMotivo === 'conflito', 'dois colegas nao vao para o mesmo espaco', 'motivo: ' + ChemistryIntel.ultimoMotivo);
verifica(!!ChemistryIntel.postar(d, b, 'BOX_RUN', -12, 31), 'outro espaco: aceite', 'motivo: ' + ChemistryIntel.ultimoMotivo);
verifica(ChemistryIntel.intencaoPara(a) === m1 && ChemistryIntel.intencaoDe(c) === m1, 'consulta por destinatario e por remetente', 'consulta errada');
ChemistryIntel.marcar(m1, 'cancelada', 'mudou_de_ideia');
verifica(ChemistryIntel.intencaoDe(c) === null, 'cancelada sai das ativas', 'continua ativa');
verifica(ChemistryIntel.postar(c, a, 'FORWARD_RUN', 10, 30) === null && ChemistryIntel.ultimoMotivo === 'repetida', 'a mesma mensagem nao se repete logo', 'motivo: ' + ChemistryIntel.ultimoMotivo);

console.log('3 — validade e cancelamentos');
ChemistryIntel.reset();
const m2 = ChemistryIntel.postar(c, a, 'SUPPORT_RUN', 0, 0);
for (let t = 0; t < M.validade.SUPPORT_RUN + 0.5; t += 1 / 60) ChemistryIntel.update(1 / 60);
verifica(ChemistryIntel.activas.length === 0 && ChemistryIntel.historico.some(h => h.estado === 'expirada'), 'expira depois da validade', 'nao expirou');
ChemistryIntel.postar(c, a, 'DIAGONAL_RUN', 5, 5);
Match.possessionTeam = 'TeamB';
for (let t = 0; t < 0.3; t += 1 / 60) ChemistryIntel.update(1 / 60);
verifica(ChemistryIntel.activas.length === 0 && ChemistryIntel.historico.some(h => h.motivo === 'posse_mudou'), 'cancelada quando a posse muda', 'nao cancelou na troca de posse');
Match.possessionTeam = 'TeamA';
for (let t = 0; t < 0.3; t += 1 / 60) ChemistryIntel.update(1 / 60);
ChemistryIntel.postar(a, c, 'THROUGH_PASS', 0, 40);
Match.state = 'THROW_IN';
for (let t = 0; t < 0.3; t += 1 / 60) ChemistryIntel.update(1 / 60);
verifica(ChemistryIntel.activas.length === 0 && ChemistryIntel.historico.some(h => h.motivo === 'lance_parado'), 'cancelada num lance parado', 'nao cancelou no lance parado');
Match.state = 'PLAY';

console.log('4 — desligado nao faz nada');
ChemistryIntel.reset();
M.activo = false;
verifica(ChemistryIntel.postar(c, a, 'FORWARD_RUN', 1, 1) === null, 'com activo=false nao posta', 'postou desligado');
M.activo = true;

/*
ETAPA 2 — fluxo A: quem corre avisa o portador; se ele compreende, o passe para a corrida ganha bonus. `cenario` poe `a` com a bola e `q` a infiltrar
(RUN_INTO_SPACE com alvo a frente), com o Chemistry da dupla dado.
*/
function cenario(chemJogos, semente) {
    let s = semente || 7; Math.random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let k = 0; k < 20; k++) Math.random();   // sementes pequenas dao numeros minusculos nas primeiras chamadas
    ChemistryIntel.reset();
    Match.state = 'PLAY'; Match.possessionTeam = 'TeamA';
    ChemistryIntel.carregar('TeamA', [[id(a), id(c), chemJogos * 90]]);
    Match.ballCarrier = a; a.hasBall = true;
    c.fsm.currentState = 'RUN_INTO_SPACE'; c.runTimer = 3; c.overlapAlvo = null;
    c.runAlvo = new THREE.Vector3(c.model.position.x + 1, 0, c.model.position.z + c.dirZ * 12);
    // Ate 4 s: uma recusa (nao compreendeu) volta a ser tentada depois do intervalo anti-repeticao, com novo sorteio.
    for (let t = 0; t < 4; t += 1 / 60) {
        c.runTimer = 3; ChemistryIntel.update(1 / 60);
        const v = ChemistryIntel.intencaoDe(c);
        if (v && v.estado === 'compreendida') break;
    }
    return ChemistryIntel.intencaoDe(c);
}

console.log('5 — etapa 2: o aviso da corrida (fluxo A)');
{
    const m = cenario(10);
    verifica(m && m.para === a && ['FORWARD_RUN', 'BOX_RUN', 'DIAGONAL_RUN'].includes(m.tipo), 'quem infiltra avisa o portador: ' + (m && m.tipo), 'nao avisou');
    verifica(m && m.estado === 'compreendida', 'Chemistry 99: o portador compreende', 'estado: ' + (m && m.estado));
    const bonus = ChemistryIntel.bonusPasse(a, c);
    verifica(bonus > 100, `o passe para a corrida ganha bonus (+${Math.round(bonus)})`, 'bonus: ' + bonus);
    verifica(ChemistryIntel.bonusPasse(a, d) === 0, 'quem nao avisou nada: bonus 0 (nota de sempre)', 'bonus a quem nao avisou');
    c.runAlvo.z += c.dirZ * 5;
    for (let t = 0; t < 0.3; t += 1 / 60) { c.runTimer = 3; ChemistryIntel.update(1 / 60); }
    verifica(Math.abs(ChemistryIntel.intencaoDe(c).z - c.runAlvo.z) < 0.01, 'o destino acompanha a corrida', 'destino parado');
    a.initiatePass(c);
    verifica(!ChemistryIntel.intencaoDe(c) && ChemistryIntel.historico.some(h => h.estado === 'executada'), 'o passe para quem avisou executa a intencao', 'nao marcou executada');
    a.hasBall = false;
}
{
    // Chemistry 0: quase nunca compreende — em 20 corridas, poucas ou nenhuma.
    let compreendidas = 0, comBonus = 0;
    for (let k = 0; k < 20; k++) { const m = cenario(0, 11 + k); if (m && m.estado === 'compreendida') compreendidas++; if (ChemistryIntel.bonusPasse(a, c) > 0) comBonus++; }
    verifica(compreendidas <= 4, `Chemistry 0: ${compreendidas} de 20 compreendidas (em 4 s, varias tentativas)`, 'compreendeu demais com Chemistry 0: ' + compreendidas);
    let altas = 0;
    for (let k = 0; k < 20; k++) { const m = cenario(10, 41 + k); if (m && m.estado === 'compreendida') altas++; }
    verifica(altas >= 18, `Chemistry 99: ${altas} de 20 compreendidas`, 'compreendeu pouco com Chemistry 99: ' + altas);
    a.hasBall = false;
}
{
    const m = cenario(10);
    c.fsm.currentState = 'MOVE_TO_POS';
    for (let t = 0; t < 0.3; t += 1 / 60) ChemistryIntel.update(1 / 60);
    verifica(!ChemistryIntel.intencaoDe(c) && ChemistryIntel.historico.some(h => h.motivo === 'parou_de_correr'), 'quem para de correr retira o aviso', 'aviso ficou');
    a.hasBall = false;
}

console.log(falhas ? 'FALHOU: ' + falhas : 'OK: Chemistry Intelligence, etapas 1 e 2.');
process.exit(falhas ? 1 : 0);
