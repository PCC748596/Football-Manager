/*
LIGA COM FORMACOES — 380 jogos (20 times, todos contra todos, ida e volta), cada time com UMA das 7 formacoes do manager (cicla pelo indice do time), e as
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
const NOMES = ['Palmeiras-SP', 'Grêmio-RS', 'Atlético-MG', 'Flamengo-RJ', 'Botafogo-RJ', 'Bragantino-SP', 'Fluminense-RJ',
    'Atlético-PR', 'Internacional-RS', 'Fortaleza-CE', 'São Paulo-SP', 'Cuiabá-MT', 'Corinthians-SP', 'Cruzeiro-MG',
    'Vasco-RJ', 'Bahia-BA', 'Santos-SP', 'Goiás-GO', 'Coritiba-PR', 'América-MG'];

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
    if (process.env.LIGA_SEM_TRANSICAO === '1') ZonasModel.transicao = null;   // o controlo: o bloco de antes das tabelas
    const pares = calendario(NOMES.length, 2);
    const ladosIniciais = Lados.trocados;
    const dt = 1 / 60;
    const res = [];
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

        // acumuladores por (formacao, fase)
        const acc = {};
        const get = (nome, fase) => (acc[nome + '|' + fase] = acc[nome + '|' + fase] || {
            n: 0, K: 0, linhaZ: [], linhaN: [], distAlvo: 0, distAlvoN: 0, longe5: 0, longeN: 0, cruzam: 0, cruzamN: 0, comp: 0, defLinha: 0,
            largLinha: [], largN: [], centroZ_menos_bola: 0, centroX_menos_bola: 0, corrX: 0, corrY: 0, corrXY: 0, corrXX: 0, corrYY: 0, parados: 0, jogN: 0, velSoma: 0
        });
        const total = Math.round(minutos * 60 / dt);
        let erro = null;
        const din = { trocas: 0, ultima: null, dist: 0, jogoCorrido: 0 };
        try {
            for (let f = 0; f < total; f++) {
                Match.update(dt);
                if (Match.state === 'PLAY') {
                    din.jogoCorrido++;
                    const eq = Match.possessionTeam;
                    if (eq && din.ultima && eq !== din.ultima) din.trocas++;
                    if (eq) din.ultima = eq;
                }
                if (f % 30 || Match.state !== 'PLAY') continue;
                for (const p of Match.players.concat(Match.opponents)) if (p.role !== 'gk' && p.velocity) din.dist += p.velocity.length() * 0.5;
                for (const [lista, nome] of [[Match.players, nomesF[fa]], [Match.opponents, nomesF[fb]]]) {
                    if (lista.length < 11 || !lista[1].slot) continue;
                    const dz = lista[0].dirZ;
                    const fase = (Match.possessionTeam === lista[0].team) ? 'com' : 'sem';
                    const a = get(nome, fase);
                    a.n++;
                    const porLinha = {}, lat = {};
                    let zMin = Infinity, zMax = -Infinity, sx = 0, sz = 0, nj = 0;
                    for (const p of lista) {
                        if (p.role === 'gk' || !p.slot) continue;
                        const z = p.model.position.z * dz, x = p.model.position.x;
                        (porLinha[p.slot.linha] = porLinha[p.slot.linha] || []).push(z);
                        (lat[p.slot.linha] = lat[p.slot.linha] || []).push(x);
                        zMin = Math.min(zMin, z); zMax = Math.max(zMax, z); sx += x * dz; sz += z; nj++;
                        if (p.slotTarget) {
                            const d = Math.hypot(p.model.position.x - p.slotTarget.x, p.model.position.z - p.slotTarget.z);
                            a.distAlvo += d; a.distAlvoN++; a.longeN++; if (d > 5) a.longe5++;
                        }
                        a.velSoma += p.velocity ? p.velocity.length() : 0; a.jogN++;
                        if (p.velocity && p.velocity.length() < 0.3) a.parados++;
                    }
                    const ks = Object.keys(porLinha).map(Number).sort((u, v) => u - v);
                    a.K = ks.length;
                    ks.forEach(k => {
                        const med = porLinha[k].reduce((u, v) => u + v, 0) / porLinha[k].length;
                        a.linhaZ[k] = (a.linhaZ[k] || 0) + med; a.linhaN[k] = (a.linhaN[k] || 0) + 1;
                        const L = Math.max(...lat[k]) - Math.min(...lat[k]);
                        a.largLinha[k] = (a.largLinha[k] || 0) + L; a.largN[k] = (a.largN[k] || 0) + 1;
                    });
                    // as linhas cruzam-se? (a media de uma linha atras da media da anterior)
                    for (let q = 1; q < ks.length; q++) {
                        const m0 = porLinha[ks[q - 1]].reduce((u, v) => u + v, 0) / porLinha[ks[q - 1]].length;
                        const m1 = porLinha[ks[q]].reduce((u, v) => u + v, 0) / porLinha[ks[q]].length;
                        a.cruzamN++; if (m1 < m0 + 2.0) a.cruzam++;   // menos de 2 m entre linhas = praticamente a mesma linha
                    }
                    a.comp += (zMax - zMin);
                    a.defLinha += (porLinha[ks[0]] ? Math.min(...porLinha[ks[0]]) : 0);
                    a.centroZ_menos_bola += (sz / nj) - Match.ball.position.z * dz;
                    a.centroX_menos_bola += (sx / nj) - Match.ball.position.x * dz;
                    // correlacao x do centro da equipa com x da bola (a equipa desliza com a bola?)
                    const cx = sx / nj, bx = Match.ball.position.x * dz;
                    a.corrX += cx; a.corrY += bx; a.corrXY += cx * bx; a.corrXX += cx * cx; a.corrYY += bx * bx;
                }
            }
        } catch (e) { erro = String(e && e.message || e); }
        res.push({ i, casa: NOMES[par.casa], fora: NOMES[par.fora], fa: nomesF[fa], fb: nomesF[fb], golos: [Match.placarA, Match.placarB], remates: MatchStats.TeamA.remates.tentados + MatchStats.TeamB.remates.tentados, passes: MatchStats.TeamA.passes.tentados + MatchStats.TeamB.passes.tentados, din, acc, erro });
        process.send && process.send({ tipo: 'jogo', i });
    }
    process.send({ tipo: 'fim', res });
    process.exit(0);
}

// ------------------------------------------------------------------ pai
const JOGOS = Number(process.argv[2] || 380);
const WORKERS = Number(process.argv[3] || Math.min(14, Math.max(1, os.cpus().length - 2)));
const MIN = process.argv[4] || '20';
const todos = []; for (let i = 0; i < JOGOS; i++) todos.push(i);
const grupos = Array.from({ length: WORKERS }, () => []);
todos.forEach((i, k) => grupos[k % WORKERS].push(i));
const resultados = [];
let feitos = 0, acabados = 0;
const t0 = Date.now();
grupos.forEach(g => {
    if (!g.length) { acabados++; return; }
    const w = fork(__filename, [], { env: Object.assign({}, process.env, { LIGA_WORKER: JSON.stringify(g), LIGA_MIN: MIN }), silent: true });
    w.on('message', (m) => {
        if (m.tipo === 'jogo') { feitos++; if (feitos % 20 === 0) console.log('jogos feitos:', feitos, '/', JOGOS, ((Date.now() - t0) / 60000).toFixed(1), 'min'); }
        if (m.tipo === 'fim') { resultados.push(...m.res); acabados++; if (acabados === WORKERS) fim(); }
    });
    w.on('exit', () => { /* tratado em 'fim' */ });
});
function fim() {
    const agg = {};
    let erros = 0, golos = 0;
    for (const r of resultados) {
        if (r.erro) { erros++; console.log('ERRO jogo', r.i, r.erro); }
        golos += r.golos[0] + r.golos[1];
        for (const [k, a] of Object.entries(r.acc)) {
            const g = agg[k] = agg[k] || { n: 0, K: a.K, linhaZ: [], linhaN: [], distAlvo: 0, distAlvoN: 0, longe5: 0, cruzam: 0, cruzamN: 0, comp: 0, defLinha: 0, largLinha: [], largN: [], cz: 0, cx: 0, corrX: 0, corrY: 0, corrXY: 0, corrXX: 0, corrYY: 0, parados: 0, jogN: 0, velSoma: 0 };
            g.n += a.n; g.distAlvo += a.distAlvo; g.distAlvoN += a.distAlvoN; g.longe5 += a.longe5; g.cruzam += a.cruzam; g.cruzamN += a.cruzamN; g.comp += a.comp; g.defLinha += a.defLinha;
            g.cz += a.centroZ_menos_bola; g.cx += a.centroX_menos_bola; g.corrX += a.corrX; g.corrY += a.corrY; g.corrXY += a.corrXY; g.corrXX += a.corrXX; g.corrYY += a.corrYY;
            g.parados += a.parados; g.jogN += a.jogN; g.velSoma += a.velSoma; g.K = Math.max(g.K, a.K);
            for (let q = 0; q < a.linhaZ.length; q++) { g.linhaZ[q] = (g.linhaZ[q] || 0) + (a.linhaZ[q] || 0); g.linhaN[q] = (g.linhaN[q] || 0) + (a.linhaN[q] || 0); g.largLinha[q] = (g.largLinha[q] || 0) + (a.largLinha[q] || 0); g.largN[q] = (g.largN[q] || 0) + (a.largN[q] || 0); }
        }
    }
    const out = {};
    const f1 = (x) => (Math.round(x * 10) / 10);
    const linhas = [];
    for (const [k, g] of Object.entries(agg)) {
        const lz = g.linhaZ.map((s, q) => s / g.linhaN[q]);
        const gaps = lz.slice(1).map((z, q) => z - lz[q]);
        const n = g.n;
        const r = (g.corrXY / n - (g.corrX / n) * (g.corrY / n)) / (Math.sqrt(g.corrXX / n - (g.corrX / n) ** 2) * Math.sqrt(g.corrYY / n - (g.corrY / n) ** 2) || 1);
        out[k] = { amostras: n, K: g.K, linhasZ: lz.map(f1), intervalos: gaps.map(f1), largLinhas: g.largLinha.map((s, q) => f1(s / g.largN[q])), profundidadeTotal: f1(g.comp / n), zDaDefesaMaisRecuada: f1(g.defLinha / n),
            distMediaAoAlvo: f1(g.distAlvo / g.distAlvoN), pctLonge5m: f1(100 * g.longe5 / g.distAlvoN), pctLinhasCruzadas: f1(100 * g.cruzam / Math.max(1, g.cruzamN)),
            centroMenosBolaZ: f1(g.cz / n), centroMenosBolaX: f1(g.cx / n), corrLateral: Math.round(r * 100) / 100, pctParados: f1(100 * g.parados / g.jogN), velMedia: f1(g.velSoma / g.jogN) };
    }
    fs.mkdirSync(path.join(__dirname, 'saida'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, 'saida', process.env.LIGA_SEM_ZONAS === '1' ? 'liga_formacoes_sem_zonas.json' : 'liga_formacoes.json'), JSON.stringify({ jogos: resultados.length, golosPorJogo: golos / Math.max(1, resultados.length), erros, out }, null, 1));
    const med = (f) => resultados.reduce((a, r) => a + f(r), 0) / Math.max(1, resultados.length);
    const dinamismo = { rematesPorJogo: med(r => r.remates), passesPorJogo: med(r => r.passes), trocasDePossePorJogo: med(r => r.din.trocas), trocasPorMinutoDeJogoCorrido: med(r => r.din.trocas / Math.max(1, r.din.jogoCorrido / 3600)), kmPorJogador: med(r => r.din.dist / 10 / 1000) };
    console.log('DINAMISMO', JSON.stringify(dinamismo));
    try { const f2 = path.join(__dirname, 'saida', 'liga_dinamismo_' + (process.env.LIGA_ROTULO || 'x') + '.json'); fs.writeFileSync(f2, JSON.stringify(dinamismo)); } catch (e) {}
    console.log('FIM: jogos', resultados.length, 'golos/jogo', (golos / Math.max(1, resultados.length)).toFixed(2), 'erros', erros, 'tempo', ((Date.now() - t0) / 60000).toFixed(1), 'min');
    console.log(JSON.stringify(out));
}
