/*
GERADOR DAS LIGAS DA AMERICA LATINA (Libertadores / Sul-Americana).

    node tools/gerar_ligas_latam.cjs --dry      so calcula e escreve o relatorio (tools/latam/relatorio.txt); nao toca em nada
    node tools/gerar_ligas_latam.cjs            acrescenta paises, clubes e jogadores a textSim/realDatabase.ts
    node tools/gerar_ligas_latam.cjs --force    refaz (APAGA os paises/clubes/jogadores latam que ja la estiverem — incluindo o que editou no Editor!)

O QUE FAZ
- 9 paises (Argentina, Bolivia, Chile, Colombia, Equador, Paraguai, Peru, Uruguai, Venezuela; o Brasil ja existe e nao e tocado).
- Cada pais: a Serie A com os clubes reais (clubes.cjs) e 6 clubes de reserva (`reserveTeamIds`, sem liga nem jogos) de onde se sorteiam os que entram no lugar dos rebaixados.
- 28 jogadores por clube, nomes tipicos do pais (nomes.cjs), ate 8 estrangeiros por clube (de outros paises da America Latina).
- OVR equilibrado: pais -> clube -> posicao (ver CONFIG e a funcao `ovrDoClube`). O relatorio mostra o resultado.
A semente e fixa (CONFIG.semente): a mesma corrida da sempre os mesmos jogadores.
*/
const fs = require('fs');
const path = require('path');
const { PAISES, COR } = require('./latam/clubes.cjs');
const { NOMES } = require('./latam/nomes.cjs');

const CONFIG = {
    semente: 2026,
    jogadoresPorClube: 30,
    maxEstrangeiros: 8,
    /*
    O TETO DE OVR de cada pais = o OVR do melhor jogador dos 4 melhores clubes (Brasil: o melhor de cada grande tem 76-78). Os paises com mais vagas na Libertadores
    tem teto maior; o das outras vagas desce na ordem abaixo. Do 5.o clube para baixo o pico desce ate `quedaSerieA` pontos no ultimo da Serie A; os clubes do acesso
    ficam `quedaAcesso` pontos abaixo do teto. O onze inicial fica `onzeAbaixoDoPico` abaixo do pico (no Brasil: pico 78 -> onze 72.7).
    */
    teto: { arg: 78, chi: 77, col: 76, uru: 75, equ: 75, par: 74, per: 73, bol: 72, ven: 71 },
    melhoresClubes: 4,
    quedaSerieA: 9, quedaAcesso: 13,
    onzeAbaixoDoPico: 5.5,
    // Dinheiro e torcida do clube de topo de cada pais (desce com a posicao).
    capitalTopo: { arg: 14e6, chi: 7e6, col: 8e6, uru: 5e6, equ: 6e6, par: 5e6, per: 5e6, bol: 3e6, ven: 2.2e6 },
    torcidaTopo: { arg: 160000, chi: 90000, col: 110000, uru: 80000, equ: 70000, par: 60000, per: 90000, bol: 50000, ven: 30000 },
    // De onde vem os estrangeiros (peso).
    origemEstrangeiros: { ARG: 20, URU: 14, COL: 14, BRA: 14, PAR: 10, CHI: 8, ECU: 8, VEN: 5, PER: 4, BOL: 3 }
};

// ---------------------------------------------------------------- aleatorio com semente
let _s = CONFIG.semente >>> 0;
function rnd() { _s = (_s + 0x6D2B79F5) | 0; let t = Math.imul(_s ^ (_s >>> 15), 1 | _s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
function gauss() { let u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function pickPeso(obj) { const t = Object.values(obj).reduce((a, b) => a + b, 0); let r = rnd() * t; for (const k in obj) { r -= obj[k]; if (r <= 0) return k; } return Object.keys(obj)[0]; }

// ---------------------------------------------------------------- a base actual
const raiz = path.resolve(__dirname, '..');
const dbPath = path.join(raiz, 'textSim', 'realDatabase.ts');
const dbTxt = fs.readFileSync(dbPath, 'utf8');
const RE = (nome) => new RegExp('export const ' + nome + '(?:: any\\[\\])? = (\\[[\\s\\S]*?\\n\\]);');
const lerLista = (nome) => { const m = dbTxt.match(RE(nome)); if (!m) throw new Error('nao achei ' + nome); return eval(m[1]); };
const countries = lerLista('REAL_COUNTRIES_JSON');
let teams = lerLista('REAL_TEAMS_JSON');
let players = lerLista('REAL_PLAYERS_JSON');

const ID_CLUBE_MIN = 710001, ID_CLUBE_MAX = 799999, ID_JOGADOR_BASE = 8000000;
const IDS_PAIS = PAISES.map(p => p.id);
const jaTemLatam = countries.some(c => IDS_PAIS.includes(c.id)) || teams.some(t => t.teamID >= ID_CLUBE_MIN && t.teamID <= ID_CLUBE_MAX);
const dry = process.argv.includes('--dry'), force = process.argv.includes('--force');
if (jaTemLatam && !dry && !force) {
    console.error('Ja ha ligas latam na base (talvez editadas). Use --force para as refazer do zero (apaga o que editou), ou --dry para so ver o relatorio.');
    process.exit(1);
}
if (jaTemLatam) {
    // Tira o que o gerador pôs antes.
    for (let i = countries.length - 1; i >= 0; i--) if (IDS_PAIS.includes(countries[i].id)) countries.splice(i, 1);
    teams = teams.filter(t => !(t.teamID >= ID_CLUBE_MIN && t.teamID <= ID_CLUBE_MAX));
    players = players.filter(p => p.idPlayer < ID_JOGADOR_BASE);
}

// ---------------------------------------------------------------- valor de mercado: regressao ln(valor) ~ ovr + (idade-27)^2 sobre os jogadores brasileiros ja existentes
function ajustarValor() {
    const X = [], Y = [];
    for (const p of players) { if (p.valPlayer > 0 && p.ovrPlayer && p.agePlayer) { X.push([1, p.ovrPlayer, (p.agePlayer - 27) ** 2]); Y.push(Math.log(p.valPlayer)); } }
    const n = 3, A = Array.from({ length: n }, () => new Array(n).fill(0)), b = new Array(n).fill(0);
    X.forEach((x, i) => { for (let r = 0; r < n; r++) { b[r] += x[r] * Y[i]; for (let c = 0; c < n; c++) A[r][c] += x[r] * x[c]; } });
    for (let i = 0; i < n; i++) { let m = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r; [A[i], A[m]] = [A[m], A[i]]; [b[i], b[m]] = [b[m], b[i]];
        for (let r = i + 1; r < n; r++) { const f = A[r][i] / A[i][i]; for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; } }
    const w = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * w[c]; w[i] = s / A[i][i]; }
    return w;
}
const W_VALOR = ajustarValor();
const valorDe = (ovr, idade, fatorPais) => Math.max(20000, Math.round(Math.exp(W_VALOR[0] + W_VALOR[1] * ovr + W_VALOR[2] * (idade - 27) ** 2) * fatorPais * (0.85 + rnd() * 0.3) / 1000) * 1000);

// ---------------------------------------------------------------- plantel: 28 jogadores. posPlayer: 1 GK 2 RB 3 LB 4 CB 5 DM 6 LM 7 RM 8 CM 9 ST 10 AM 11 RW 12 LW
// 30 jogadores, no maximo 4 por posicao (3 GK, 2 RB, 2 LB, 4 CB, 3 DM, 4 CM, 1 LM, 1 RM, 2 AM, 2 RW, 2 LW, 4 ST).
const PLANTEL = [1, 1, 1, 2, 2, 3, 3, 4, 4, 4, 4, 5, 5, 5, 8, 8, 8, 8, 6, 7, 10, 10, 11, 11, 12, 12, 9, 9, 9, 9];
// O onze: um por posicao (menos 2 centrais) — o melhor de cada posicao do plantel.
const ONZE = [1, 2, 3, 4, 4, 5, 8, 10, 11, 12, 9];
// Pequena diferenca de OVR por posicao (os de ataque costumam ser os mais altos, os laterais os mais baixos); renormalizada para a media do onze nao mexer.
const OFF_POS = { 1: 0, 2: -0.5, 3: -0.5, 4: -0.5, 5: 0, 6: 0, 7: 0, 8: 0.5, 9: 1, 10: 1, 11: 1, 12: 1 };
// Quem pode ser a estrela do clube (o jogador com o OVR do pico).
// Peso base de cada posicao; o peso efectivo desce com as estrelas que o pais ja deu a essa posicao (equilibrio por posicao entre os clubes).
const PESO_ESTRELA = { 1: 0.7, 4: 1, 5: 0.6, 8: 1, 10: 1, 11: 1, 12: 1, 9: 1, 2: 0.4, 3: 0.4 };
const estrelasDoPais = {};
// [def, pas, drb, sht] relativo ao OVR, por posicao.
const ARQ = { 1: [0, -8, -1, -45], 2: [0, -6, -4, -24], 3: [0, -6, -4, -24], 4: [2, -8, -14, -24], 5: [0, -2, -9, -18], 6: [-14, -2, 2, -12], 7: [-14, -2, 2, -12],
    8: [-8, 0, -4, -12], 9: [-26, -12, 0, 2], 10: [-18, 1, 3, -6], 11: [-20, -4, 4, -6], 12: [-20, -4, 4, -6] };

// ---------------------------------------------------------------- nomes
const usados = new Set(players.map(p => p.namePlayer));
function nomeDe(nac) {
    const N = NOMES[nac];
    for (let t = 0; t < 40; t++) {
        let nome = pick(N.nomes);
        if (rnd() < 0.22) nome += ' ' + pick(N.nomes.filter(x => !x.includes(' ')));
        let sob = pick(N.sobrenomes);
        if (rnd() < 0.30) sob += ' ' + pick(N.sobrenomes.filter(x => !x.includes(' ')));
        const completo = nome + ' ' + sob;
        if (!usados.has(completo)) { usados.add(completo); return completo; }
    }
    const completo = pick(N.nomes) + ' ' + pick(N.nomes) + ' ' + pick(N.sobrenomes) + ' ' + pick(N.sobrenomes);
    usados.add(completo); return completo;
}

// ---------------------------------------------------------------- um clube
function pico(pais, rank, nA, noAcesso) {
    const teto = CONFIG.teto[pais.id];
    if (noAcesso) return teto - CONFIG.quedaAcesso - rank * 0.3;
    if (rank < CONFIG.melhoresClubes) return teto;
    return teto - 1 - (rank - CONFIG.melhoresClubes) * ((CONFIG.quedaSerieA - 1) / Math.max(1, nA - CONFIG.melhoresClubes - 1));
}

function gerarElenco(pais, nomeClube, rankA, nA, noAcesso, rankNoAcesso) {
    const picoClube = noAcesso ? pico(pais, rankNoAcesso, nA, true) : pico(pais, rankA, nA, false);
    const mediaOnze = picoClube - CONFIG.onzeAbaixoDoPico;
    const slots = PLANTEL.map((pos, i) => ({ pos, i, onze: false }));
    // marca o onze
    const falta = ONZE.slice();
    for (const s of slots) { const k = falta.indexOf(s.pos); if (k >= 0) { falta.splice(k, 1); s.onze = true; } }
    // OVR dos titulares: media do onze + diferenca da posicao + ruido, e depois a estrela
    const tit = slots.filter(s => s.onze);
    tit.forEach(s => { s.ovr = mediaOnze + OFF_POS[s.pos] + clamp(gauss() * 1.8, -3.5, 3.5); });
    const nEstrelas = (!noAcesso && rankA < CONFIG.melhoresClubes) ? 2 : 1;
    const candidatos = tit.filter(s => PESO_ESTRELA[s.pos]);
    for (let e = 0; e < nEstrelas; e++) {
        const cont = estrelasDoPais[pais.id] = estrelasDoPais[pais.id] || {};
        const peso = (s) => PESO_ESTRELA[s.pos] / Math.pow(1 + (cont[s.pos] || 0), 1.5);
        const pool = candidatos.filter(s => !s.estrela); const tot = pool.reduce((a, s) => a + peso(s), 0); let r = rnd() * tot, esc = pool[0];
        for (const s of pool) { r -= peso(s); if (r <= 0) { esc = s; break; } }
        cont[esc.pos] = (cont[esc.pos] || 0) + 1;
        esc.estrela = true; esc.ovr = picoClube - e;     // o 1.o no pico, o 2.o (so nos 4 melhores) um abaixo
    }
    // A media do onze tem de bater certo (sem contar as estrelas): desloca os outros
    const outros = tit.filter(s => !s.estrela), alvoSoma = mediaOnze * tit.length - tit.filter(s => s.estrela).reduce((a, s) => a + s.ovr, 0);
    const desl = (alvoSoma - outros.reduce((a, s) => a + s.ovr, 0)) / outros.length;
    outros.forEach(s => { s.ovr = Math.min(picoClube - 1, s.ovr + desl); });
    // suplentes: abaixo do titular da mesma posicao
    const refPos = {}; tit.forEach(s => { (refPos[s.pos] = refPos[s.pos] || []).push(s.ovr); });
    slots.filter(s => !s.onze).forEach(s => {
        const ref = (refPos[s.pos] ? Math.min(...refPos[s.pos]) : mediaOnze);
        s.ovr = Math.min(ref - 1, mediaOnze - 4.5 + gauss() * 2.2);
    });
    // idades: titulares 22-34, suplentes com 4 a 5 jovens (17-20)
    const jovens = new Set(); while (jovens.size < 5) { const c = slots.filter(s => !s.onze)[ri(0, slots.length - ONZE.length - 1)]; if (c) jovens.add(c.i); }
    slots.forEach(s => {
        if (jovens.has(s.i)) { s.idade = ri(17, 20); s.ovr -= 3; }
        else if (s.pos === 1) s.idade = ri(21, 39);
        else s.idade = clamp(Math.round(27 + gauss() * 4.6), 19, 38);   // idades variadas: de 19 a 38, a maioria entre 22 e 32
        s.ovr = Math.round(clamp(s.ovr, 38, picoClube));
    });
    return { slots, picoClube, mediaOnze };
}

// ---------------------------------------------------------------- clubes e jogadores
const novoPaises = [], novoClubes = [], novosJogadores = [], relatorio = [];
const resumoPais = [];
let idJog = ID_JOGADOR_BASE;
const kit = (pat, c1, c2, nCor) => ({ pattern: pat, color1: c1, color2: c2 || '', color3: '', numberColor: nCor, numberOutlineColor: '', collarColor: c2 || '', sleeveColor: '' });
const PADRAO = { s: 'solid', v: 'stripes', h: 'horizontal' };
const claro = (hex) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 150; };

for (const pais of PAISES) {
    const nA = pais.serieA.length;
    const idsA = [], idsB = [];
    const todos = pais.serieA.map((c, i) => ({ c, rankA: i, acesso: false })).concat(pais.acesso.map((c, i) => ({ c, rankA: -1, acesso: true, rankNoAcesso: i })));
    let seq = 0;
    for (const item of todos) {
        const [nome, sigla, cidade, estadio, k1, k2, pat, ano] = item.c;
        seq++;
        const id = pais.idBase + seq;
        (item.acesso ? idsB : idsA).push(id);
        const rank = item.acesso ? nA + item.rankNoAcesso : item.rankA, nTot = nA + 6;
        const cap = Math.round(CONFIG.capitalTopo[pais.id] * Math.pow(0.2, rank / (nTot - 1)) / 1000) * 1000;
        const torcida = Math.round(CONFIG.torcidaTopo[pais.id] * Math.pow(0.1, rank / (nTot - 1)));
        const c1 = COR[k1], c2 = COR[k2];
        const club = {
            teamID: id, teamName: nome, teamAbb: sigla, color: c1, color2: c2, color3: '', teamCityName: cidade, teamStadiumName: estadio, yearOfFoundation: ano || 0,
            initialCapital: cap, initialTransfer: Math.round(cap * 0.5), sponsorAmount: 0, fanBase: torcida, avrAttendance: Math.round(torcida * 0.32),
            country: pais.id,
            homeKit: kit(PADRAO[pat], c1, pat === 's' ? '' : c2, claro(c1) ? 'black' : 'white'),
            awayKit: kit(pat === 's' ? 'solid' : PADRAO[pat], claro(c1) ? c2 : '#ffffff', claro(c1) ? c1 : c1, claro(claro(c1) ? c2 : '#ffffff') ? 'black' : 'white'),
            thirdKit: kit('solid', '#111111', c1, 'white'),
            gkKit: kit('solid', pick(['#16a34a', '#ea580c', '#7c3aed', '#0ea5e9']), '', 'white')
        };
        novoClubes.push(club);

        const { slots, picoClube, mediaOnze } = gerarElenco(pais, nome, item.rankA, nA, item.acesso, item.rankNoAcesso || 0);
        // estrangeiros: ate 8 (media ~3), nunca a estrela do clube, raros guarda-redes
        let nEstr = clamp(Math.round(2.8 + gauss() * 2.0), 0, CONFIG.maxEstrangeiros);
        const origens = Object.assign({}, CONFIG.origemEstrangeiros); delete origens[pais.nacionalidade];
        const elegiveis = slots.filter(s => !s.estrela && (s.pos !== 1 || rnd() < 0.25));
        const estrangeiros = new Map();
        while (estrangeiros.size < nEstr && elegiveis.length) { const s = elegiveis.splice(ri(0, elegiveis.length - 1), 1)[0]; estrangeiros.set(s.i, pickPeso(origens)); }
        const ordem = slots.slice().sort((a, b) => (b.onze - a.onze) || (b.ovr - a.ovr));
        // numeros de camisola: GK 1/12/(22), o resto 2..30 sem repetir
        const usadosNum = new Set(); const numDe = (s, k) => { const pref = { 1: [1, 12, 22], 2: [2, 13], 3: [3, 6], 4: [4, 5, 14, 15], 5: [5, 8, 15], 6: [11, 17], 7: [7, 16], 8: [8, 20, 21], 9: [9, 19, 29], 10: [10, 18], 11: [7, 17], 12: [11, 23] }[s.pos]; for (const n of pref) if (!usadosNum.has(n)) { usadosNum.add(n); return n; } let n = 24; while (usadosNum.has(n)) n++; usadosNum.add(n); return n; };
        const elenco = [];
        for (const s of slots) {
            const nac = estrangeiros.get(s.i) || pais.nacionalidade;
            const a = ARQ[s.pos];
            const st = (k) => Math.round(clamp(s.ovr + a[k] + gauss() * 2.5, 15, 95));
            const j = {
                idPlayer: ++idJog, team: nome, namePlayer: nomeDe(nac), posPlayer: s.pos, agePlayer: s.idade, ovrPlayer: s.ovr,
                fitPlayer: ri(70, 90), morplayer: ri(4, 6), defPlayer: st(0), pasPlayer: st(1), drbplayer: st(2), shtPlayer: st(3),
                valPlayer: valorDe(s.ovr, s.idade, 0.5 + 0.5 * (CONFIG.teto[pais.id] - 66) / 12), nationality: nac
            };
            elenco.push(j);
        }
        novosJogadores.push(...elenco);
        const ov = elenco.map(j => j.ovrPlayer), tit = elenco.filter((j, i) => slots[i].onze);
        relatorio.push({ pais: pais.id, clube: nome, acesso: item.acesso, rank, pico: Math.max(...ov), onze: +(tit.reduce((a, j) => a + j.ovrPlayer, 0) / tit.length).toFixed(1), plantel: +(ov.reduce((a, b) => a + b, 0) / ov.length).toFixed(1), estr: estrangeiros.size, alvoPico: +picoClube.toFixed(1), alvoOnze: +mediaOnze.toFixed(1), elenco, slots });
    }
    // So a Serie A tem jogos. Os 6 clubes extra ficam em `reserveTeamIds`: no fim da temporada sorteiam-se deles os que entram no lugar dos rebaixados.
    const rounds = 2 * (nA - 1), passos = rounds * 4.67 + 105 < 360 ? [4, 6, 4, 4, 6] : [3, 4, 4];
    const datas = []; let d = 105; for (let r = 0; r < rounds; r++) { datas.push(d); d += passos[r % passos.length]; }
    novoPaises.push({
        id: pais.id, name: pais.nome, continent: 'South America',
        leagues: [
            { id: pais.id + '_serie_a', name: pais.ligaA, tier: 1, teamIds: idsA, promoted: 0, relegated: pais.rebaixados, matchDates: datas }
        ],
        reserveTeamIds: idsB
    });
}

// ---------------------------------------------------------------- validacoes
const nomesClubes = new Set(teams.map(t => t.teamName)), repetidos = [];
for (const c of novoClubes) { if (nomesClubes.has(c.teamName)) repetidos.push(c.teamName); nomesClubes.add(c.teamName); }
if (repetidos.length) { console.error('NOMES DE CLUBE REPETIDOS (o jogo liga jogadores a clubes pelo nome):', repetidos.join(', ')); process.exit(1); }
for (const r of relatorio) {
    const gk = r.elenco.filter(j => j.posPlayer === 1).length;
    if (r.elenco.length !== CONFIG.jogadoresPorClube || gk < 3 || r.estr > CONFIG.maxEstrangeiros) { console.error('plantel invalido', r.clube); process.exit(1); }
}

// ---------------------------------------------------------------- relatorio
const L = [];
L.push('RELATORIO DAS LIGAS LATAM (semente ' + CONFIG.semente + ')', '');
L.push('Clubes: ' + novoClubes.length + '   Jogadores: ' + novosJogadores.length, '');
for (const pais of PAISES) {
    const rs = relatorio.filter(r => r.pais === pais.id);
    L.push(pais.nome.toUpperCase() + '  teto ' + CONFIG.teto[pais.id] + '  Serie A: ' + pais.serieA.length + ' clubes (+6 de reserva)');
    L.push('  #  clube'.padEnd(36) + 'pico  onze  plantel  estrangeiros');
    rs.forEach((r, i) => L.push(('  ' + (i + 1)).padEnd(5) + (r.clube + (r.acesso ? ' (reserva)' : '')).padEnd(31) + String(r.pico).padEnd(6) + String(r.onze).padEnd(6) + String(r.plantel).padEnd(9) + r.estr));
    // equilibrio por posicao nos 4 melhores e no resto da serie A
    const porPos = (lista) => { const o = {}; for (const r of lista) r.elenco.forEach((j, i) => { if (r.slots[i].onze) (o[j.posPlayer] = o[j.posPlayer] || []).push(j.ovrPlayer); }); return Object.entries(o).map(([p, v]) => p + ':' + (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)).join(' '); };
    L.push('  media dos titulares por posicao (codigo:OVR) — 4 melhores: ' + porPos(rs.slice(0, 4)));
    L.push('  media dos titulares por posicao (codigo:OVR) — resto da Serie A: ' + porPos(rs.slice(4, pais.serieA.length)), '');
}
const faixas = { '17-20': 0, '21-24': 0, '25-28': 0, '29-32': 0, '33+': 0 }; novosJogadores.forEach(j => { const a = j.agePlayer; faixas[a <= 20 ? '17-20' : a <= 24 ? '21-24' : a <= 28 ? '25-28' : a <= 32 ? '29-32' : '33+']++; });
L.push('Idades: ' + Object.entries(faixas).map(([k, v]) => k + ' ' + v).join(', '));
const maxPos = Math.max(...relatorio.map(r => { const c = {}; r.elenco.forEach(j => c[j.posPlayer] = (c[j.posPlayer] || 0) + 1); return Math.max(...Object.values(c)); }));
L.push('Maximo de jogadores na mesma posicao em qualquer clube: ' + maxPos);
const nacs = {}; novosJogadores.forEach(j => nacs[j.nationality] = (nacs[j.nationality] || 0) + 1);
L.push('Jogadores por nacionalidade: ' + Object.entries(nacs).map(([k, v]) => k + ' ' + v).join(', '));
L.push('Regressao do valor de mercado (ln valor = a + b*ovr + c*(idade-27)^2): ' + W_VALOR.map(x => x.toFixed(4)).join(', '));
fs.writeFileSync(path.join(__dirname, 'latam', 'relatorio.txt'), L.join('\n'), 'utf8');
console.log(L.slice(0, 3).join('\n'));
if (dry) { console.log('(--dry) relatorio em tools/latam/relatorio.txt; nada foi gravado na base.'); process.exit(0); }

// ---------------------------------------------------------------- grava
let out = dbTxt;
const sub = (nome, lista) => { out = out.replace(RE(nome), () => 'export const ' + nome + ': any[] = ' + JSON.stringify(lista, null, 2) + ';'); };   // `: any[]`: com milhares de objectos de formas diferentes o TypeScript rebenta (TS2590)
sub('REAL_COUNTRIES_JSON', countries.concat(novoPaises));
sub('REAL_TEAMS_JSON', teams.concat(novoClubes));
// TODOS os jogadores com as mesmas chaves (os brasileiros ficam com nationality ''): se as formas diferem o TypeScript rebenta com TS2590 (uniao demasiado complexa).
players.forEach(p => { if (p.nationality === undefined) p.nationality = ''; });
sub('REAL_PLAYERS_JSON', players.concat(novosJogadores));
fs.writeFileSync(dbPath, out, 'utf8');
console.log('Gravado em textSim/realDatabase.ts: ' + novoPaises.length + ' paises, ' + novoClubes.length + ' clubes, ' + novosJogadores.length + ' jogadores.');
