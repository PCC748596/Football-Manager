/*
LIGA SERIE A DO BRASIL (os 20 clubes de 2026, os do manager) — variante de liga_3d.js com os clubes atuais da Serie A — 380 jogos (20 times, todos contra todos, ida e volta), cada time com UMA das 7 formacoes do manager (cicla pelo indice do time), e as
movimentacoes medidas por formacao e fase (com/sem bola). Serve para conferir as tabelas por zona (data/formacoes_zonas.js, ZonasModel) ao vivo: se as linhas
ficam onde a tabela as poe, se alguem nao chega ao posto, se as linhas se cruzam, se a equipa desliza com a bola...

Corre em paralelo (processos filhos); cada jogo e um jogo inteiro (2 x 10 min de simulacao = 90' de jogo) sem acrescimos (lote).

Uso:  node tools/headless/liga_formacoes.js [jogos 380] [trabalhadores] [minutos 20]
Saida: tools/headless/saida/liga_formacoes.json (agregado) e o resumo no ecra.
*/
const fs = require('fs');
const path = require('path');
const os = require('os');
const { fork } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const TYPES = path.join(RAIZ, '..', '..', 'types.ts');
const NOMES = ['Atlético-PR', 'Atlético-MG', 'Bahia-BA', 'Botafogo-RJ', 'Chapecoense-SC', 'Corinthians-SP', 'Coritiba-PR', 'Cruzeiro-MG', 'Flamengo-RJ', 'Fluminense-RJ',
    'Grêmio-RS', 'Internacional-RS', 'Mirassol-SP', 'Palmeiras-SP', 'Bragantino-SP', 'Remo-PA', 'Santos-SP', 'São Paulo-SP', 'Vasco-RJ', 'Vitória-BA'];

function calendario(n, turnos) {
    const pares = [], t = []; for (let k = 0; k < n; k++) t.push(k);
    for (let r = 0; r < n - 1; r++) {
        for (let k = 0; k < n / 2; k++) { const x = t[k], y = t[n - 1 - k], cx = ((r + k) % 2 === 0); pares.push({ casa: cx ? x : y, fora: cx ? y : x }); }
        t.splice(1, 0, t.pop());
    }
    if (turnos >= 2) { const n1 = pares.length; for (let i = 0; i < n1; i++) pares.push({ casa: pares[i].fora, fora: pares[i].casa }); }
    return pares;
}
function formacoesDoManager() {
    const s = fs.readFileSync(TYPES, 'utf8');
    const i = s.indexOf('export const FORMATIONS'), j = s.indexOf('\n};', i);
    return new Function(s.slice(i, j + 3).replace(/export const FORMATIONS[^=]*=/, 'const F =') + ';return F;')();
}

// ------------------------------------------------------------------ trabalhador
if (process.env.LIGA_WORKER) {
    const indices = JSON.parse(process.env.LIGA_WORKER);
    const minutos = Number(process.env.LIGA_MIN || 20);
    require(path.join(RAIZ, 'tools', 'headless', 'harness.js'));
    const mgr = formacoesDoManager();
    const nomesF = Object.keys(mgr);
    const chaves = nomesF.map(n => AdaptadorManager.formacaoDeSlots(n, mgr[n]));
    const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const cena = new THREE.Scene();
    Match.init(cena);
    if (typeof Officials !== 'undefined' && Officials.init) Officials.init(cena);
    if (typeof Sim === 'undefined') global.Sim = {};
    Sim.running = true;
    if (process.env.LIGA_SEM_ZONAS === '1') ZonasModel.activo = false;
    if (process.env.LIGA_SEM_TRANSICAO === '1') ZonasModel.transicao = null;
    if (process.env.LIGA_SEM_ACAO === '1') ZonasModel.transicaoAcao.activo = false;
    if (process.env.LIGA_ACAO) { const [a, b, c] = process.env.LIGA_ACAO.split(',').map(Number); Object.assign(ZonasModel.transicaoAcao, { pressores: a, corredores: b, profundidade: c }); }
    // LIGA_TABELA=ajustada: usa data/formacoes_zonas.ajustada.js; LIGA_TRANSICAO="avanco,recuo": transicao mais forte.
    if (process.env.LIGA_TABELA) {
        const o = require('vm').runInNewContext(fs.readFileSync(path.join(RAIZ, 'data', 'formacoes_zonas.' + process.env.LIGA_TABELA + '.js'), 'utf8').replace(/^const FormacoesZonas =/m, 'FZ =') + ';FZ;', { window: undefined });
        FormacoesZonas.formacoes = o.formacoes;
    }
    if (process.env.LIGA_TRANSICAO) { const [av, re] = process.env.LIGA_TRANSICAO.split(',').map(Number); ZonasModel.transicao = { duracao: 3.0, avancoOfensivo: av, recuoDefensivo: re }; }   // o controlo: o bloco de antes das tabelas
    // LIGA_SET="Objecto.campo=valor;Outro.campo=valor": ajustes de configuracao para isolar causas (ex.: "FaltaRotinas.activo=false;ShootingModel.esperaBarreira=0").
    if (process.env.LIGA_SET) for (const par of process.env.LIGA_SET.split(';')) { const [lhs, rhs] = par.split('='); const parts = lhs.trim().split('.'); let o = global[parts[0]] || (global.window && global.window[parts[0]]); for (let q = 1; q < parts.length - 1; q++) o = o[parts[q]]; if (o) o[parts[parts.length - 1]] = JSON.parse(rhs); else console.error('LIGA_SET: nao encontrei', lhs); }
    const FORCA_ORDEM = NOMES.slice().sort((x, y) => SquadsData.equipas.find(e => e.nome === y).forca - SquadsData.equipas.find(e => e.nome === x).forca);
    const KNOW = {};
    { const src = fs.readFileSync(path.join(RAIZ, '..', '..', 'textSim', 'treinadores.ts'), 'utf8'); const re = /'([^']+)': \{ nome: '[^']*', tatico: (\d+) \}/g; let m; while ((m = re.exec(src))) KNOW[m[1]] = Number(m[2]); }
    const pares = calendario(NOMES.length, 2);
    const ladosIniciais = Lados.trocados;
    const dt = 1 / 60;
    const res = [];
    // As folhas numericas de um objecto (TeamA/TeamB do MatchStats), com o caminho como chave.
    const folhas = (o, pre, out) => { for (const k of Object.keys(o)) { const v = o[k], c = pre ? pre + '.' + k : k; if (typeof v === 'number' && isFinite(v)) out[c] = v; else if (v && typeof v === 'object' && !Array.isArray(v)) folhas(v, c, out); } return out; };
    for (const i of indices) {
        Math.random = mulberry32(5000 + i * 977);
        const par = pares[i];
        const ea = SquadsData.equipas.find(e => e.nome === NOMES[par.casa]);
        const eb = SquadsData.equipas.find(e => e.nome === NOMES[par.fora]);
        const fa = par.casa % nomesF.length, fb = par.fora % nomesF.length;
        Tatics.formacaoA = Tatics.formacaoFixaA = chaves[fa];
        Tatics.formacaoB = Tatics.formacaoFixaB = chaves[fb];
        Lados.trocados = ladosIniciais;
        Match.primeiroTempoAcabou = false; Match.acrescimo1 = 0; Match.acrescimo2 = 0; Match.acr1Calculado = false; Match.acr2Calculado = false;
        Match.trocarEquipas({ A: ea.id, B: eb.id });
        MatchStats.reset(); Match.tempoDeJogo = 0; Match.placarA = 0; Match.placarB = 0;
        Match.mudarEstado('PLAY', 'liga');
        // O TREINADOR DA CPU (LIGA_TREINADORES=1): as duas equipas com o conhecimento tatico real dos treinadores (textSim/treinadores.ts).
        if (process.env.LIGA_TREINADORES === '1') {
            TreinadorCPU.limpar(); Match.subsFeitas = [];
            TreinadorCPU._usados = new Set();
            // A posicao na tabela: sem a tabela viva (os jogos correm em paralelo), a posicao ESPERADA = a ordem de forca dos plantéis (SquadsData.forca).
            const posTab = (nome) => 1 + FORCA_ORDEM.indexOf(nome);
            const tab = (a, b) => process.env.LIGA_SEM_TABELA === '1' ? null : { posicao: posTab(a), total: NOMES.length, posicaoAdv: posTab(b) };
            TreinadorCPU.registar('TeamA', { conhecimento: KNOW[NOMES[par.casa]] || 70, tabela: tab(NOMES[par.casa], NOMES[par.fora]) });
            TreinadorCPU.registar('TeamB', { conhecimento: KNOW[NOMES[par.fora]] || 70, tabela: tab(NOMES[par.fora], NOMES[par.casa]) });
        }
        const total = Math.round(minutos * 60 / dt);
        let erro = null;
        try { for (let f = 0; f < total; f++) Match.update(dt); } catch (e) { erro = String(e && e.message || e); }
        res.push({ treinador: { decisoes: TreinadorCPU._log.filter(l => l.intencao).length, subs: (Match.subsFeitas || []).length, subsCartao: (Match.subsFeitas || []).length }, i, casa: NOMES[par.casa], fora: NOMES[par.fora], golos: [Match.placarA, Match.placarB], tempo: Match.tempoDeJogo, A: folhas(MatchStats.TeamA, '', {}), B: folhas(MatchStats.TeamB, '', {}), erro });
        process.send && process.send({ tipo: 'jogo', i });
    }
    process.send({ tipo: 'fim', res, camadas: {} });
    process.exit(0);
}

// ------------------------------------------------------------------ pai
const JOGOS = Number(process.argv[2] || 380);
const WORKERS = Number(process.argv[3] || Math.min(14, Math.max(1, os.cpus().length - 2)));
const MIN = process.argv[4] || '20';
// Os jogos escolhem-se espalhados pelo calendario de 380 (e nao os primeiros), para a amostra pequena nao ser so das duas primeiras jornadas.
const todos = []; for (let i = 0; i < JOGOS; i++) todos.push(Math.floor(i * 380 / JOGOS));
const grupos = Array.from({ length: WORKERS }, () => []);
todos.forEach((i, k) => grupos[k % WORKERS].push(i));
const resultados = [];
const CAMADAS = {};
let feitos = 0, acabados = 0;
const t0 = Date.now();
grupos.forEach(g => {
    if (!g.length) { acabados++; return; }
    const w = fork(__filename, [], { env: Object.assign({}, process.env, { LIGA_WORKER: JSON.stringify(g), LIGA_MIN: MIN }), silent: true });
    w.on('message', (m) => {
        if (m.tipo === 'jogo') { feitos++; if (feitos % 20 === 0) console.log('jogos feitos:', feitos, '/', JOGOS, ((Date.now() - t0) / 60000).toFixed(1), 'min'); }
        if (m.tipo === 'fim') { resultados.push(...m.res); for (const [k, v] of Object.entries(m.camadas || {})) { const c = CAMADAS[k] = CAMADAS[k] || { s: 0, n: 0 }; c.s += v.s; c.n += v.n; } acabados++; if (acabados === WORKERS) fim(); }
    });
    w.on('exit', () => { /* tratado em 'fim' */ });
});
function fim() {
    const n = resultados.length;
    const somaA = {}, somaB = {};
    let erros = 0;
    const tab = {};
    NOMES.forEach(k => { tab[k] = { j: 0, v: 0, e: 0, d: 0, gf: 0, ga: 0, pts: 0 }; });
    for (const r of resultados) {
        if (r.erro) { erros++; console.log('ERRO jogo', r.i, r.erro); }
        for (const [k, v] of Object.entries(r.A)) somaA[k] = (somaA[k] || 0) + v;
        for (const [k, v] of Object.entries(r.B)) somaB[k] = (somaB[k] || 0) + v;
        const H = tab[r.casa], F = tab[r.fora];
        H.j++; F.j++; H.gf += r.golos[0]; H.ga += r.golos[1]; F.gf += r.golos[1]; F.ga += r.golos[0];
        if (r.golos[0] > r.golos[1]) { H.v++; H.pts += 3; F.d++; } else if (r.golos[0] < r.golos[1]) { F.v++; F.pts += 3; H.d++; } else { H.e++; F.e++; H.pts++; F.pts++; }
    }
    const chaves = Array.from(new Set(Object.keys(somaA).concat(Object.keys(somaB)))).sort();
    const por = {};
    chaves.forEach(k => { por[k] = { jogo: ((somaA[k] || 0) + (somaB[k] || 0)) / n, casa: (somaA[k] || 0) / n, fora: (somaB[k] || 0) / n }; });
    const out = { jogos: n, erros, golosPorJogo: resultados.reduce((a, r) => a + r.golos[0] + r.golos[1], 0) / n, vitCasa: resultados.filter(r => r.golos[0] > r.golos[1]).length / n, empates: resultados.filter(r => r.golos[0] === r.golos[1]).length / n, tempoMedioDeJogo: resultados.reduce((a, r) => a + r.tempo, 0) / n, estatisticas: por, tabela: tab };
    fs.mkdirSync(path.join(__dirname, 'saida'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, 'saida', 'liga3d_' + (process.env.LIGA_ROTULO || 'x') + '.json'), JSON.stringify(out, null, 1));
    console.log('FIM: jogos', n, 'erros', erros, 'golos/jogo', out.golosPorJogo.toFixed(2), 'tempo', ((Date.now() - t0) / 60000).toFixed(1), 'min');
}
