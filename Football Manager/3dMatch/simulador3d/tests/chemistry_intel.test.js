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
const M = ChemistryIntelModel;
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

console.log(falhas ? 'FALHOU: ' + falhas : 'OK: Chemistry Intelligence, etapa 1.');
process.exit(falhas ? 1 : 0);
