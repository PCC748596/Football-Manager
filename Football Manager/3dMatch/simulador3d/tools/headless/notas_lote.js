/*
NOTAS EM LOTE — corre N jogos inteiros do 3D (sem ecra) e mede as NOTAS DOS JOGADORES (js/ratings): media, desvio e faixas por grupo de posicao,
quem ganha o Man of the Match, a nota de quem marca / de quem esta no time que perdeu, os extremos.

Uso:  FM_MOD_DIR=<pasta do mod> node tools/headless/notas_lote.js [jogos 40] [trabalhadores] [minutos 20]
      (sem o mod os times tem os nomes genericos; a lista de times vem do proprio SquadsData)
Saida: tools/headless/saida/notas_lote.json e o resumo no ecra.
*/
const fs = require('fs');
const path = require('path');
const os = require('os');
const { fork } = require('child_process');
const RAIZ = path.join(__dirname, '..', '..');

if (process.env.NOTAS_WORKER) {
    const indices = JSON.parse(process.env.NOTAS_WORKER);
    const minutos = Number(process.env.NOTAS_MIN || 20);
    require(path.join(RAIZ, 'tools', 'headless', 'harness.js'));
    const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const cena = new THREE.Scene();
    Match.init(cena);
    if (typeof Officials !== 'undefined' && Officials.init) Officials.init(cena);
    if (typeof Sim === 'undefined') global.Sim = {};
    Sim.running = true;
    const equipas = SquadsData.equipas.slice(0, 20);
    const dt = 1 / 60, res = [];
    for (const i of indices) {
        Math.random = mulberry32(7000 + i * 131);
        const a = equipas[i % equipas.length], b = equipas[(i * 7 + 3) % equipas.length === i % equipas.length ? (i + 1) % equipas.length : (i * 7 + 3) % equipas.length];
        Match.primeiroTempoAcabou = false; Match.acrescimo1 = 0; Match.acrescimo2 = 0; Match.acr1Calculado = false; Match.acr2Calculado = false;
        Match.trocarEquipas({ A: a.id, B: b.id });
        MatchStats.reset(); Match.tempoDeJogo = 0; Match.placarA = 0; Match.placarB = 0;
        Match.mudarEstado('PLAY', 'notas');
        const total = Math.round(minutos * 60 / dt);
        let erro = null;
        try { for (let f = 0; f < total; f++) Match.update(dt); } catch (e) { erro = String(e && e.message || e); }
        const agora = typeof Match.minutoDeJogo === 'function' ? Match.minutoDeJogo() : 90;
        const jog = [];
        for (const id in NotasMotor.jogadores) {
            const j = NotasMotor.jogadores[id], d = NotasMotor.detalhes(id, agora);
            if (!d) continue;
            jog.push({ id, equipa: j.equipa, grupo: j.grupo, pos: j.pos, nota: d.nota, min: d.minutos, golos: j.cont.GOLO || 0, ass: j.cont.ASSISTENCIA || 0, def: j.nDef, ev: j.nEventos, tat: d.tatico, tec: d.tecnico, par: d.participacao, dis: d.disciplina, q: j.qN ? +(j.qSoma / j.qN).toFixed(3) : null, qN: j.qN });
        }
        res.push({ i, placar: [Match.placarA, Match.placarB], erro, motm: NotasMotor.melhor(null, agora), jog });
        process.send && process.send({ tipo: 'jogo' });
    }
    process.send({ tipo: 'fim', res });
    process.exit(0);
}

const JOGOS = Number(process.argv[2] || 40);
const WORKERS = Number(process.argv[3] || Math.min(12, Math.max(1, os.cpus().length - 2)));
const MIN = process.argv[4] || '20';
const grupos = Array.from({ length: WORKERS }, () => []);
for (let i = 0; i < JOGOS; i++) grupos[i % WORKERS].push(i);
const todos = []; let acabados = 0, feitos = 0; const t0 = Date.now();
grupos.forEach(g => {
    if (!g.length) { acabados++; return; }
    const w = fork(__filename, [], { env: Object.assign({}, process.env, { NOTAS_WORKER: JSON.stringify(g), NOTAS_MIN: MIN }), silent: true });
    w.stderr.on('data', d => process.stderr.write(d));
    w.on('message', m => {
        if (m.tipo === 'jogo') { feitos++; if (feitos % 10 === 0) console.log('jogos:', feitos, '/', JOGOS, ((Date.now() - t0) / 60000).toFixed(1), 'min'); }
        if (m.tipo === 'fim') { todos.push(...m.res); if (++acabados === grupos.length) resumo(); }
    });
});

function resumo() {
    const est = xs => { const n = xs.length; if (!n) return null; const m = xs.reduce((s, x) => s + x, 0) / n; const sd = Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / n); const o = [...xs].sort((a, b) => a - b); return { n, media: +m.toFixed(2), desvio: +sd.toFixed(2), min: o[0], p10: o[Math.floor(n * 0.1)], p50: o[Math.floor(n * 0.5)], p90: o[Math.floor(n * 0.9)], max: o[n - 1] }; };
    const jogos = todos.filter(j => !j.erro);
    const titulares = jogos.flatMap(j => j.jog.map(x => ({ ...x, resultado: Math.sign((x.equipa === 'TeamA' ? 1 : -1) * (j.placar[0] - j.placar[1])), motm: x.id === j.motm }))).filter(x => x.min >= 30);
    const porGrupo = {};
    for (const x of titulares) (porGrupo[x.grupo] = porGrupo[x.grupo] || []).push(x.nota);
    const motmGrupo = {};
    for (const x of titulares) if (x.motm) motmGrupo[x.grupo] = (motmGrupo[x.grupo] || 0) + 1;
    const faixas = { '<5': 0, '5-5.9': 0, '6-6.9': 0, '7-7.9': 0, '8-8.9': 0, '9+': 0 };
    for (const x of titulares) { const n = x.nota; faixas[n < 5 ? '<5' : n < 6 ? '5-5.9' : n < 7 ? '6-6.9' : n < 8 ? '7-7.9' : n < 9 ? '8-8.9' : '9+']++; }
    const out = {
        jogos: jogos.length, erros: todos.length - jogos.length, golosPorJogo: +(jogos.reduce((s, j) => s + j.placar[0] + j.placar[1], 0) / Math.max(1, jogos.length)).toFixed(2),
        geral: est(titulares.map(x => x.nota)), faixas,
        porGrupo: Object.fromEntries(Object.entries(porGrupo).map(([g, xs]) => [g, est(xs)])),
        motmPorGrupo: motmGrupo,
        venceu: est(titulares.filter(x => x.resultado > 0).map(x => x.nota)), empatou: est(titulares.filter(x => x.resultado === 0).map(x => x.nota)), perdeu: est(titulares.filter(x => x.resultado < 0).map(x => x.nota)),
        comGolo: est(titulares.filter(x => x.golos > 0).map(x => x.nota)), doisGolos: est(titulares.filter(x => x.golos >= 2).map(x => x.nota)), semEventos: est(titulares.filter(x => x.ev === 0).map(x => x.nota)),
        qMediaPorGrupo: Object.fromEntries(Object.keys(porGrupo).map(g => [g, est(titulares.filter(x => x.grupo === g && x.q !== null).map(x => x.q))])),
        componentes: { tatico: est(titulares.map(x => x.tat)), tecnico: est(titulares.map(x => x.tec)), participacao: est(titulares.map(x => x.par)), disciplina: est(titulares.map(x => x.dis)) },
        piores: [...titulares].sort((a, b) => a.nota - b.nota).slice(0, 5).map(x => `${x.pos} ${x.nota} (g${x.golos} a${x.ass} def${x.def} ev${x.ev})`),
        melhores: [...titulares].sort((a, b) => b.nota - a.nota).slice(0, 5).map(x => `${x.pos} ${x.nota} (g${x.golos} a${x.ass} def${x.def} ev${x.ev})`)
    };
    fs.mkdirSync(path.join(__dirname, 'saida'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, 'saida', 'notas_lote.json'), JSON.stringify({ resumo: out, jogos: todos }, null, 1));
    console.log(JSON.stringify(out, null, 1));
    console.log('tempo', ((Date.now() - t0) / 60000).toFixed(1), 'min');
}
