/*
LOTE DE NOTAS — a calibracao do sistema de notas (js/ratings) em jogos completos com equipas reais.

Corre N jogos (um processo por jogo, em paralelo) e imprime a distribuicao das notas: media e desvio gerais e por grupo de
posicao, % de notas >= 9 e <= 4, de onde sai o Man of the Match e o custo da amostragem tatica.
Alvos: media 6.2-6.6; desvio 0.6-1.0; >= 9.0 abaixo de 2%; <= 4.0 abaixo de 3%; cada grupo a +-0.4 da media; MoM nao so avancados.

Uso: node tools/scratch/notas_lote.js [jogos 8] [minutos 90] [trabalhadores 4]
*/
const { fork } = require('child_process');
const os = require('os');

if (process.argv[2] === '--jogo') {
    const idx = Number(process.argv[3]), minutos = Number(process.argv[4]);
    const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    Math.random = mulberry32(1234 + idx * 977);
    require('../headless/harness.js');
    const NOMES = ['Palmeiras-SP', 'Grêmio-RS', 'Atlético-MG', 'Flamengo-RJ', 'Botafogo-RJ', 'Bragantino-SP', 'Fluminense-RJ', 'Atlético-PR', 'Internacional-RS', 'Fortaleza-CE', 'São Paulo-SP', 'Cuiabá-MT', 'Corinthians-SP', 'Cruzeiro-MG', 'Vasco-RJ', 'Bahia-BA'];
    const cena = new THREE.Scene(); Match.init(cena);
    if (typeof Officials !== 'undefined' && Officials.init) Officials.init(cena);
    if (typeof Sim === 'undefined') global.Sim = {}; Sim.running = true;
    const ea = SquadsData.equipas.find(e => e.nome === NOMES[idx % NOMES.length]), eb = SquadsData.equipas.find(e => e.nome === NOMES[(idx * 5 + 3) % NOMES.length]);
    Match.trocarEquipas({ A: ea.id, B: eb.id });
    MatchStats.reset(); Match.tempoDeJogo = 0; Match.placarA = 0; Match.placarB = 0; Notas.iniciar();
    Match.mudarEstado('PLAY', 'lote');
    let tTick = 0, nTick = 0; const orig = Notas.tick.bind(Notas);
    Notas.tick = function () { const t0 = Number(process.hrtime.bigint()) / 1e6; const u = this._ultT; orig(); if (this._ultT !== u) { tTick += Number(process.hrtime.bigint()) / 1e6 - t0; nTick++; } };
    const dt = 1 / 60, alvoSeg = minutos * 60;
    let frames = 0;
    while (Match.tempoDeJogo < alvoSeg && frames < 60 * 60 * 40) { Match.update(dt); frames++; }
    const r = Notas.resultado();
    process.send({ idx, jogo: ea.nome + ' ' + Match.placarA + 'x' + Match.placarB + ' ' + eb.nome, notas: Object.values(r), msPorAmostra: nTick ? tTick / nTick : 0, amostras: nTick });
    process.exit(0);
}

const N = Number(process.argv[2] || 8), MIN = Number(process.argv[3] || 90), W = Number(process.argv[4] || Math.max(1, Math.min(4, os.cpus().length - 1)));
const res = []; let proximo = 0, vivos = 0;
function lancar() {
    while (vivos < W && proximo < N) {
        const i = proximo++; vivos++;
        const f = fork(__filename, ['--jogo', String(i), String(MIN)], { silent: true });
        f.on('message', m => res.push(m));
        f.on('exit', () => { vivos--; if (proximo < N) lancar(); else if (!vivos) relatorio(); });
    }
}
function est(a) { const m = a.reduce((s, x) => s + x, 0) / (a.length || 1); return { n: a.length, media: m, dp: Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length || 1)) }; }
function relatorio() {
    const todos = res.flatMap(r => r.notas);
    const g = est(todos.map(x => x.nota));
    console.log('jogos', res.length, '| jogadores', todos.length);
    res.forEach(r => console.log('  ', r.jogo));
    console.log('geral: media', g.media.toFixed(2), 'dp', g.dp.toFixed(2), '| >=9:', (100 * todos.filter(x => x.nota >= 9).length / todos.length).toFixed(1) + '%', '| <=4:', (100 * todos.filter(x => x.nota <= 4).length / todos.length).toFixed(1) + '%');
    const GR = { GK: ['GK'], DEF: ['CB', 'LB', 'RB'], MED: ['DM', 'CM', 'AM', 'LM', 'RM'], ATA: ['LW', 'RW', 'CF', 'SS', 'ST'] };
    for (const k in GR) { const e = est(todos.filter(x => GR[k].includes(x.pos)).map(x => x.nota)); console.log('  ' + k.padEnd(4), 'n', String(e.n).padStart(3), 'media', e.media.toFixed(2), 'dp', e.dp.toFixed(2)); }
    for (const k in GR) { const q = todos.filter(x => GR[k].includes(x.pos) && x.qMedia).map(x => x.qMedia); console.log('  qMedia ' + k.padEnd(4), (q.reduce((s, x) => s + x, 0) / q.length).toFixed(3), 'dp', est(q).dp.toFixed(3)); }
    const POS = [...new Set(todos.map(x => x.pos))].sort(); console.log('qMedia e nota por posicao:', POS.map(k => { const g = todos.filter(x => x.pos === k && x.qMedia); return k + ' q ' + (g.reduce((s, x) => s + x.qMedia, 0) / g.length).toFixed(3) + ' nota ' + (g.reduce((s, x) => s + x.nota, 0) / g.length).toFixed(2) + ' (n' + g.length + ')'; }).join(' | '));
    const qa = todos.filter(x => x.qMedia).map(x => x.qMedia); console.log('qMedia geral', est(qa).media.toFixed(3), 'dp', est(qa).dp.toFixed(3));
    const moc = todos.filter(x => x.moc), porGrupo = {};
    moc.forEach(x => { const k = Object.keys(GR).find(k => GR[k].includes(x.pos)) || '?'; porGrupo[k] = (porGrupo[k] || 0) + 1; });
    console.log('MoM por grupo', JSON.stringify(porGrupo));
    // COERENCIA: a nota deve acompanhar o que o jogador fez e o resultado da equipa.
    const m = (a) => a.length ? (a.reduce((s, x) => s + x, 0) / a.length).toFixed(2) + ' (n ' + a.length + ')' : '-';
    const nota = (f) => m(todos.filter(f).map(x => x.nota));
    console.log('coerencia: sem golo', nota(x => !x.golos), '| 1 golo', nota(x => x.golos === 1), '| 2+ golos', nota(x => x.golos >= 2), '| com assist.', nota(x => x.assistencias > 0), '| destaque def.', nota(x => x.def >= 6), '| MoM', nota(x => x.moc));
    const porRes = { V: [], E: [], D: [] };
    res.forEach(r => { const p = /(\d+)x(\d+)/.exec(r.jogo); if (!p) return; const a = +p[1], b = +p[2]; r.notas.forEach(x => { const meu = x.equipa === 'TeamA' ? a : b, deles = x.equipa === 'TeamA' ? b : a; porRes[meu > deles ? 'V' : meu < deles ? 'D' : 'E'].push(x.nota); }); });
    console.log('por resultado da equipa: vitoria', m(porRes.V), '| empate', m(porRes.E), '| derrota', m(porRes.D));
    const linha = (x) => x.nota.toFixed(1) + ' ' + String(x.pos || '?').padEnd(3) + ' ' + x.minutos + 'min golos ' + (x.golos || 0) + ' ass ' + (x.assistencias || 0) + ' def ' + (x.def || 0) + ' | tat ' + Math.round(x.tatico) + ' tec ' + Math.round(x.tecnico) + ' par ' + Math.round(x.participacao) + ' dis ' + Math.round(x.disciplina) + (x.moc ? ' MoM' : '');
    const ord = todos.filter(x => x.minutos >= 45).sort((a, b) => b.nota - a.nota);
    console.log('10 melhores:'); ord.slice(0, 10).forEach(x => console.log('  ' + linha(x)));
    console.log('10 piores:'); ord.slice(-10).forEach(x => console.log('  ' + linha(x)));
    const ms = res.map(r => r.msPorAmostra), am = res.map(r => r.amostras);
    console.log('amostragem tatica: ms por passagem (22 jogadores) media', (ms.reduce((s, x) => s + x, 0) / ms.length).toFixed(3), 'max', Math.max(...ms).toFixed(3), '| passagens/jogo', Math.round(am.reduce((s, x) => s + x, 0) / am.length));
}
lancar();
