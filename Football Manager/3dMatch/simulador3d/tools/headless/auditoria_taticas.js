/*
AUDITORIA DAS INSTRUCOES TATICAS (3D): cada instrucao do painel TACTICAL INSTRUCTIONS muda o jogo de forma que mude RESULTADOS?

Metodo: a equipa A joga com UMA instrucao mudada de cada vez (as outras ficam no padrao) contra a B no padrao; os mesmos jogos (equipas e sementes) para todos os valores,
com o mando de equipa alternado (jogo par: A = x, jogo impar: A = y) para tirar a forca das equipas da conta. Mede resultado (pontos, saldo de gols) e o que a instrucao promete
(altura do bloco, largura, profundidade, distancia ao portador, faltas e cartoes, posse, remates, passes...).

Uso: node tools/headless/auditoria_taticas.js [jogosPorValor=40] [minutos=90] [trabalhadores] [filtro]
     (filtro: nome da instrucao, ex. "linha"; sem filtro corre todas)
Escreve tools/headless/auditoria_taticas.json (bruto) e imprime o relatorio.
*/
const { fork } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

const JOGOS = Number(process.argv[2] || 40);
const MINUTOS = Number(process.argv[3] || 90);
const WORKERS = Number(process.argv[4] || Math.min(14, Math.max(1, os.cpus().length - 2)));
const FILTRO = (process.argv[5] || '').toLowerCase();

// O padrao do painel (o que a B joga sempre e o que a A joga nas instrucoes que nao estao a ser testadas).
const PADRAO = { estilo: 'balanceado', teamPlayStyle: 'positional', agressividade: 'balanceada', setores: [], compactness: 'median', lengthCompactness: 'median',
    pressaoDefensiva: 'balanced', pressaoValor: 50, linhaDefensiva: 'medium', linhaValor: 60 };
const niv = { pressao: (v) => (v < 34 ? 'low' : v < 67 ? 'balanced' : 'high'), linha: (v) => (v < 53 ? 'low' : v < 77 ? 'medium' : 'high') };

// As instrucoes e os valores do painel (como o manager os manda: ver taticaParaMotor).
const INSTRUCOES = {
    'Offensive Style': [['positional', { teamPlayStyle: 'positional' }], ['possession', { teamPlayStyle: 'possession' }], ['direct', { teamPlayStyle: 'direct' }], ['counter', { teamPlayStyle: 'counter_attack' }], ['wing play', { teamPlayStyle: 'wing_play' }]],
    'Mentality': [['U-DEF', { estilo: 'muito_defensiva' }], ['DEF', { estilo: 'defesa' }], ['BAL', { estilo: 'balanceado' }], ['OFF', { estilo: 'ataque' }], ['U-OFF', { estilo: 'muito_ofensiva' }]],
    'Aggression': [['U-PAS', { agressividade: 'muito_passiva' }], ['PAS', { agressividade: 'passiva' }], ['BAL', { agressividade: 'balanceada' }], ['AGG', { agressividade: 'agressiva' }], ['U-AGG', { agressividade: 'muito_agressiva' }]],
    'Match Sector': [['(nenhum)', { setores: [] }], ['left', { setores: ['esq'] }], ['center', { setores: ['cen'] }], ['right', { setores: ['dir'] }]],
    'Width Compactness': [['large', { compactness: 'large' }], ['medium', { compactness: 'median' }], ['small', { compactness: 'small' }]],
    'Length Compactness': [['large', { lengthCompactness: 'large' }], ['med-large', { lengthCompactness: 'med-large' }], ['medium', { lengthCompactness: 'median' }], ['med-small', { lengthCompactness: 'med-small' }], ['small', { lengthCompactness: 'small' }]],
    'Pressure': [10, 30, 50, 70, 90].map(v => [v + '%', { pressaoValor: v, pressaoDefensiva: niv.pressao(v) }]),
    'Defensive Line': [30, 45, 60, 75, 90].map(v => [v + '%', { linhaValor: v, linhaDefensiva: niv.linha(v) }])
};
const ENTRADAS = [];
for (const [nome, valores] of Object.entries(INSTRUCOES)) {
    if (FILTRO && !nome.toLowerCase().includes(FILTRO)) continue;
    for (const [rotulo, o] of valores) ENTRADAS.push({ instrucao: nome, valor: rotulo, tatica: Object.assign({}, PADRAO, o) });
}
// A referencia: tudo no padrao (alem de cada instrucao ter o seu valor padrao, serve de controlo do ruido).
ENTRADAS.unshift({ instrucao: 'Padrao', valor: 'padrao', tatica: Object.assign({}, PADRAO) });

if (process.env.AUD_WORKER) {
    const tarefas = JSON.parse(process.env.AUD_WORKER);   // [{ e: indice da entrada, i: indice do jogo }]
    const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    require('./harness.js');
    const dt = 1 / 60;
    const scene = new THREE.Scene();
    Math.random = mulberry32(1000);
    Match.init(scene);
    if (typeof Officials !== 'undefined' && Officials.init) Officials.init(scene);
    if (typeof Sim === 'undefined') global.Sim = {};
    Sim.running = true;
    const fatorForca = require('../../js/config/skill_map.js').SkillCalib.fatorForca || 1;
    const nivel = 80 * fatorForca;
    let banda = 2, equipas = SquadsData.equipas.filter(e => Math.abs(e.forca - nivel) <= banda);
    while (equipas.length < 8 && banda < 20) { banda++; equipas = SquadsData.equipas.filter(e => Math.abs(e.forca - nivel) <= banda); }
    const folhas = (o, pre, out) => { for (const k in o) { const v = o[k]; if (typeof v === 'number' && isFinite(v)) out[pre + k] = v; else if (v && typeof v === 'object' && !Array.isArray(v)) folhas(v, pre + k + '.', out); } return out; };

    for (const tf of tarefas) {
        const ent = ENTRADAS[tf.e], i = tf.i;
        Math.random = mulberry32(5000 + i * 977);
        const x = equipas[(i * 2) % equipas.length], y = equipas[(i * 2 + 1) % equipas.length];
        const a = (i % 2 === 0) ? x : y, b = (i % 2 === 0) ? y : x;   // A = quem testa a instrucao
        Match.trocarEquipas({ A: a.id, B: b.id });
        MatchStats.reset();
        Match.tempoDeJogo = 0; Match.placarA = 0; Match.placarB = 0;
        Tatics.porEquipa.TeamA = JSON.parse(JSON.stringify(ent.tatica));
        Tatics.porEquipa.TeamB = JSON.parse(JSON.stringify(PADRAO));
        Tatics.teamPlayStyleB = null;
        const jogo = { e: tf.e, i: i, forcaA: a.forca, forcaB: b.forca, erro: null };
        const acc = { A: { altura: 0, largura: 0, profund: 0, linhaDef: 0, nLinha: 0, n: 0 }, B: { altura: 0, largura: 0, profund: 0, linhaDef: 0, nLinha: 0, n: 0 }, distA: 0, nDistA: 0, distB: 0, nDistB: 0 };
        const passos = Math.round(MINUTOS * 60 / dt);
        try {
            for (let f = 0; f < passos; f++) {
                Match.update(dt);
                if (f % 30 || Match.state !== 'PLAY') continue;
                for (const [eq, lista] of [['A', Match.players], ['B', Match.opponents]]) {
                    const campo = lista.filter(p => p && p.role !== 'gk' && p.model && !p.expulso);
                    if (campo.length < 4) continue;
                    const dir = campo[0].dirZ;
                    const zs = campo.map(p => p.model.position.z * dir), xs = campo.map(p => p.model.position.x);
                    const m = zs.reduce((s, v) => s + v, 0) / zs.length;
                    acc[eq].altura += m; acc[eq].n++;
                    acc[eq].profund += Math.max(...zs) - Math.min(...zs);
                    const mx = xs.reduce((s, v) => s + v, 0) / xs.length;
                    acc[eq].largura += Math.sqrt(xs.reduce((s, v) => s + (v - mx) * (v - mx), 0) / xs.length);
                    // A linha defensiva: os 4 mais recuados, quando a equipa NAO tem a bola.
                    const sem = (Match.possessionTeam && Match.possessionTeam !== (eq === 'A' ? 'TeamA' : 'TeamB'));
                    if (sem) { const baixos = zs.slice().sort((p, q) => p - q).slice(0, 4); acc[eq].linhaDef += baixos.reduce((s, v) => s + v, 0) / baixos.length; acc[eq].nLinha++; }
                }
                // Distancia do defensor mais proximo ao portador adversario (pressao).
                const c = Match.ballCarrier;
                if (c && c.model) {
                    const lista = c.team === 'TeamB' ? Match.players : Match.opponents;
                    let md = Infinity;
                    for (const p of lista) if (p && p.role !== 'gk' && p.model && !p.expulso) md = Math.min(md, p.model.position.distanceTo(c.model.position));
                    if (isFinite(md)) { if (c.team === 'TeamB') { acc.distA += md; acc.nDistA++; } else { acc.distB += md; acc.nDistB++; } }
                }
            }
        } catch (err) { jogo.erro = String(err && err.message || err); }
        jogo.min = Match.tempoDeJogo / 60;
        jogo.placar = { A: Match.placarA, B: Match.placarB };
        jogo.folhas = { A: folhas(MatchStats.TeamA, '', {}), B: folhas(MatchStats.TeamB, '', {}) };
        const med = (s, n) => (n ? s / n : null);
        jogo.geo = {
            alturaA: med(acc.A.altura, acc.A.n), alturaB: med(acc.B.altura, acc.B.n), largA: med(acc.A.largura, acc.A.n), largB: med(acc.B.largura, acc.B.n),
            profA: med(acc.A.profund, acc.A.n), profB: med(acc.B.profund, acc.B.n), linhaDefA: med(acc.A.linhaDef, acc.A.nLinha), linhaDefB: med(acc.B.linhaDef, acc.B.nLinha),
            distPortadorA: med(acc.distA, acc.nDistA), distPortadorB: med(acc.distB, acc.nDistB)
        };
        process.send({ tipo: 'jogo', jogo: jogo });
    }
    process.send({ tipo: 'fim' });
    return;
}

// ------------------------------------------------------------------ PAI
if (process.argv[2] === '--relatorio') { const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'auditoria_taticas.json'), 'utf8')); imprimir(d.ENTRADAS, d.resultados); process.exit(0); }
const tarefas = [];
for (let i = 0; i < JOGOS; i++) for (let e = 0; e < ENTRADAS.length; e++) tarefas.push({ e: e, i: i });
const partes = Array.from({ length: WORKERS }, () => []);
tarefas.forEach((t, k) => partes[k % WORKERS].push(t));
const resultados = [];
const inicio = Date.now();
let vivos = 0;
console.log(`${ENTRADAS.length} configuracoes x ${JOGOS} jogos x ${MINUTOS} min = ${tarefas.length} jogos, ${WORKERS} trabalhadores`);
for (const lista of partes) {
    if (!lista.length) continue;
    vivos++;
    const filho = fork(__filename, [String(JOGOS), String(MINUTOS), String(WORKERS), FILTRO], { env: Object.assign({}, process.env, { AUD_WORKER: JSON.stringify(lista) }), silent: true });
    filho.stderr.on('data', (d) => { const s = String(d); if (!/Warning|deprecat/i.test(s)) process.stderr.write(s); });
    filho.on('message', (m) => {
        if (m.tipo === 'jogo') {
            resultados.push(m.jogo);
            if (resultados.length % 20 === 0) { const dec = (Date.now() - inicio) / 60000; console.log(`  ${resultados.length}/${tarefas.length} jogos, ${dec.toFixed(1)} min, faltam ~${(dec / resultados.length * (tarefas.length - resultados.length)).toFixed(0)} min`); }
        } else if (m.tipo === 'fim') { if (--vivos === 0) relatorio(); }
    });
    filho.on('exit', (c) => { if (c && vivos > 0 && c !== 0) { console.error('trabalhador terminou com codigo', c); } });
}

function relatorio() {
    fs.writeFileSync(path.join(__dirname, 'auditoria_taticas.json'), JSON.stringify({ JOGOS, MINUTOS, ENTRADAS: ENTRADAS.map(e => ({ instrucao: e.instrucao, valor: e.valor })), resultados }, null, 0));
    imprimir(ENTRADAS, resultados);
}
function imprimir(ENTRADAS, resultados) {
    const por = ENTRADAS.map(() => []);
    for (const r of resultados) if (!r.erro || true) por[r.e].push(r);
    const sum = (a) => a.reduce((s, x) => s + x, 0);
    const mean = (a) => (a.length ? sum(a) / a.length : NaN);
    const sd = (a) => { const m = mean(a); return Math.sqrt(sum(a.map(x => (x - m) * (x - m))) / Math.max(1, a.length - 1)); };
    const f = (x, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : '-');
    const linhas = [];
    const L = (s = '') => { linhas.push(s); console.log(s); };
    const M = (js, k, lado) => mean(js.map(j => (j.folhas[lado] || {})[k]).filter(v => v !== undefined));
    const stat = (js) => {
        const gd = js.map(j => j.placar.A - j.placar.B);
        const pts = js.map(j => (j.placar.A > j.placar.B ? 3 : j.placar.A === j.placar.B ? 1 : 0));
        const posse = js.map(j => { const a = j.folhas.A.posseSegundos || 0, b = j.folhas.B.posseSegundos || 0; return a + b > 0 ? 100 * a / (a + b) : 50; });
        return {
            n: js.length, pts: mean(pts), gp: mean(js.map(j => j.placar.A)), gc: mean(js.map(j => j.placar.B)), gd: mean(gd), gdEp: sd(gd) / Math.sqrt(js.length),
            posse: mean(posse), remA: M(js, 'remates.tentados', 'A'), remB: M(js, 'remates.tentados', 'B'),
            passA: mean(js.map(j => { const s = j.folhas.A; const t = (s['passes.tentados'] || 0) + (s['lancamentos.tentados'] || 0) + (s['cruzamentos.tentados'] || 0); const c = (s['passes.certos'] || 0) + (s['lancamentos.certos'] || 0) + (s['cruzamentos.certos'] || 0); return t ? 100 * c / t : NaN; }).filter(Number.isFinite)),
            faltasA: M(js, 'faltas.cometidas', 'A'), amarA: M(js, 'cartoes.amarelos', 'A'), vermA: M(js, 'cartoes.vermelhos', 'A'),
            altA: mean(js.map(j => j.geo.alturaA).filter(Number.isFinite)), largA: mean(js.map(j => j.geo.largA).filter(Number.isFinite)), profA: mean(js.map(j => j.geo.profA).filter(Number.isFinite)),
            linhaA: mean(js.map(j => j.geo.linhaDefA).filter(Number.isFinite)), distA: mean(js.map(j => j.geo.distPortadorA).filter(Number.isFinite)),
            erros: js.filter(j => j.erro).length
        };
    };
    const ref = stat(por[0]);
    L(`REFERENCIA (tudo no padrao, ${ref.n} jogos): pts ${f(ref.pts)}  GP ${f(ref.gp)}  GC ${f(ref.gc)}  saldo ${f(ref.gd)} +-${f(ref.gdEp)}  posse ${f(ref.posse, 1)}%  remates ${f(ref.remA, 1)}x${f(ref.remB, 1)}`);
    L(`Ruido: o saldo de gols de UMA configuracao tem erro-padrao ~${f(ref.gdEp)}; diferencas menores que ~${f(2 * ref.gdEp * 1.41)} gols/jogo entre duas configuracoes nao se distinguem de acaso.`);
    let ult = '';
    for (let e = 1; e < ENTRADAS.length; e++) {
        const en = ENTRADAS[e];
        if (en.instrucao !== ult) {
            ult = en.instrucao; L(); L(`=== ${en.instrucao} ===`);
            L('valor       jogos   pts    GP    GC  saldo(ep)    posse%  remA  remB  pass%  falt  CA   CV  | altura bloco  largura  profund  linhaDef  distPortador');
        }
        const s = stat(por[e]);
        L(`${String(en.valor).padEnd(10)} ${String(s.n).padStart(5)}  ${f(s.pts)}  ${f(s.gp)}  ${f(s.gc)}  ${f(s.gd).padStart(5)}(${f(s.gdEp)})  ${f(s.posse, 1).padStart(6)}  ${f(s.remA, 1).padStart(4)}  ${f(s.remB, 1).padStart(4)}  ${f(s.passA, 0).padStart(4)}  ${f(s.faltasA, 1).padStart(4)}  ${f(s.amarA, 1)}  ${f(s.vermA, 2)} | ${f(s.altA, 1).padStart(10)}  ${f(s.largA, 1).padStart(7)}  ${f(s.profA, 1).padStart(7)}  ${f(s.linhaA, 1).padStart(8)}  ${f(s.distA, 1).padStart(11)}${s.erros ? '  ERROS ' + s.erros : ''}`);
    }
    fs.writeFileSync(path.join(__dirname, 'auditoria_taticas.txt'), linhas.join('\n') + '\n');
    console.log('\nescrito em tools/headless/auditoria_taticas.txt e .json');
}
