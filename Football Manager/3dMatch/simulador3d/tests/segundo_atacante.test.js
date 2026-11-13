/*
O SEGUNDO ATACANTE (SS) nas formacoes 4-4-2 LKU, 4-3-3 F9 e 3-5-2 LKU (SSModel, config/tactics.js; podeSSApoiar/actSSApoiar, bt/player_bt.js).
Pedido: *"SS e um segundo atacante. Fica entre a posicao de AM e ST. Normalmente saindo da area (por isso falso 9) para tabelar e receber na frente pra
finalizar"*.

Corre com: node tests/segundo_atacante.test.js [segundos por formacao, omissao 300]
*/
const fs = require('fs');
const path = require('path');
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(20261113);
require('../tools/headless/harness.js');
let falhas = 0;
const verifica = (c, b, m) => { if (c) console.log('  . ' + b); else { console.log('  X ' + m); falhas++; } };
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;

// As formacoes do manager (types.ts), como o gerador das tabelas de zona as le.
const s = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'types.ts'), 'utf8');
const i = s.indexOf('export const FORMATIONS'), j = s.indexOf('\n};', i);
const MGR = new Function(s.slice(i, j + 3).replace(/export const FORMATIONS[^=]*=/, 'const F =') + ';return F;')();
const SEG = Number(process.argv[2] || 300);

console.log('0 — o SS e posicao propria do motor');
verifica(AdaptadorManager.POS_DO_ROTULO.SS === 'SS' && AdaptadorManager.ROLE_DA_POS.SS === 'atk', 'rotulo SS -> posicao SS, papel atk', 'SS mapeado para ' + AdaptadorManager.POS_DO_ROTULO.SS);
verifica(escolherOnzeDaFormacao([{ pb: { CF: 80, AM: 60 } }, { pb: { CF: 50, AM: 90 } }], ['SS'])[0] !== undefined, 'o onze escolhe um SS mesmo sem nota propria', 'nao escolheu SS');

function jogo(nome) {
    const chave = AdaptadorManager.formacaoDeSlots(nome, MGR[nome]);
    Tatics.formacaoA = Tatics.formacaoFixaA = chave;
    Tatics.formacaoB = Tatics.formacaoFixaB = chave;
    Match.init(new THREE.Scene()); if (typeof Officials !== 'undefined' && Officials.init) Officials.init(new THREE.Scene());
    const ss = Match.players.find(p => p.pos === 'SS');
    const st = Match.players.find(p => p.pos === 'CF');
    const r = { ss: !!ss, st: !!st, nAtaque: 0, avSS: 0, avST: 0, avMeio: 0, entre: 0, foraDaArea: 0, tabelas: 0, correuDepois: 0, remates: 0, toques: 0 };
    if (!ss) return r;
    const meios = Match.players.filter(p => p.role === 'mid');
    let ultimoPasse = null;
    const origPasse = ss.initiatePass.bind(ss);
    ss.initiatePass = function (alvo) { r.tabelas++; ultimoPasse = 0; return origPasse(alvo); };
    const remAntes = () => (MatchStats.TeamA.remates && MatchStats.TeamA.remates.porJogador) ? 0 : 0;
    const dt = 1 / 60;
    for (let f = 0; f < Math.round(SEG / dt); f++) {
        const tinha = ss.hasBall;
        Match.update(dt);
        if (!tinha && ss.hasBall) r.toques++;
        if (ultimoPasse !== null) {
            ultimoPasse += dt;
            if (ss.fsm.currentState === 'RUN_INTO_SPACE') { r.correuDepois++; ultimoPasse = null; }
            else if (ultimoPasse > 1.5) ultimoPasse = null;
        }
        if (f % 30 || Match.state !== 'PLAY' || Match.possessionTeam !== 'TeamA') continue;
        const d = ss.dirZ;
        r.nAtaque++;
        r.avSS += ss.model.position.z * d;
        if (st) r.avST += st.model.position.z * d;
        r.avMeio += meios.reduce((a, m) => a + m.model.position.z * d, 0) / Math.max(1, meios.length);
        if (ss.fsm.currentState === 'AMONG_SPACE') r.entre++;
        // Fora da area adversaria (a area: 16.5 m da linha de fundo).
        if (ss.model.position.z * d < CAMPO_COMP / 2 - 16.5) r.foraDaArea++;
    }
    for (const k of ['avSS', 'avST', 'avMeio']) r[k] /= Math.max(1, r.nAtaque);
    r.remates = (MatchStats.TeamA.remates && MatchStats.TeamA.remates.tentados) || 0;
    return r;
}

for (const nome of ['4-4-2 LKU', '4-3-3 F9', '3-5-2 LKU']) {
    console.log(`${nome} (${SEG} s)`);
    const r = jogo(nome);
    verifica(r.ss, 'tem SS em campo', 'sem SS');
    if (!r.ss) continue;
    verifica(nome === '4-3-3 F9' ? !r.st : r.st, nome === '4-3-3 F9' ? 'sem ponta de lanca (falso 9)' : 'com ponta de lanca ao lado', 'ST errado');
    verifica(r.avSS > r.avMeio, `o SS joga a frente do meio-campo (${r.avSS.toFixed(1)} contra ${r.avMeio.toFixed(1)} m)`, `SS atras do meio: ${r.avSS.toFixed(1)} / ${r.avMeio.toFixed(1)}`);
    if (r.st) verifica(r.avSS < r.avST, `e atras do ponta de lanca (${r.avSS.toFixed(1)} contra ${r.avST.toFixed(1)} m)`, `SS a frente do ST: ${r.avSS.toFixed(1)} / ${r.avST.toFixed(1)}`);
    verifica(r.entre > 0, `sai para o vao entre os adversarios (${(100 * r.entre / Math.max(1, r.nAtaque)).toFixed(0)}% do tempo a atacar)`, 'nunca foi ao vao');
    // Com poucos passes do SS (uma semente, 300 s) a fraccao e ruido: medido em 8 sementes, arranca depois de ~50% dos passes. So se julga com 4 ou mais.
    if (r.tabelas >= 4) verifica(r.correuDepois / r.tabelas > 0.3, `tabela e vai: ${r.correuDepois} arranques em ${r.tabelas} passes`, `arranques ${r.correuDepois} de ${r.tabelas} passes`);
    else console.log(`  - tabela e vai: ${r.correuDepois} arranques em ${r.tabelas} passes (amostra curta, nao julgado)`);
    console.log(`     toques ${r.toques}, remates da equipa ${r.remates}, fora da area ${(100 * r.foraDaArea / Math.max(1, r.nAtaque)).toFixed(0)}%`);
}

console.log(falhas ? 'FALHOU: ' + falhas : 'OK: o segundo atacante.');
process.exit(falhas ? 1 : 0);
