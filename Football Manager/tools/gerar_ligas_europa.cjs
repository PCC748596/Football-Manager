/*
GERADOR DAS LIGAS EUROPEIAS (para a Champions League). Segue o gerador das ligas latam (tools/gerar_ligas_latam.cjs): mesma ideia, mesma semente fixa, mesmo equilibrio de OVR.

    node tools/gerar_ligas_europa.cjs --dry      so calcula e escreve o relatorio (tools/europa/relatorio.txt); nao toca em nada
    node tools/gerar_ligas_europa.cjs            acrescenta paises, clubes e jogadores a textSim/realDatabase.ts (e escreve textSim/nomesPaises.ts)
    node tools/gerar_ligas_europa.cjs --force    refaz (APAGA os clubes/jogadores europeus que ja la estiverem — incluindo o que editou no Editor!)

O QUE FAZ
- Espanha, Alemanha, Italia e Franca: a 1.a divisao INTEIRA (calendario, tabela e jogos na aba WORLD).
- A Inglaterra ja tinha a Premier League, mas os clubes nao tinham jogadores (o jogo inventava-os, com nomes brasileiros): ganham plantel aqui. Os clubes e a liga nao mudam.
- Os outros 11 paises (Noruega, Paises Baixos, Portugal, Turquia, Austria, Azerbaijao, Belgica, Eslovaquia, Grecia, Tchequia, Ucrania): 5 clubes cada, numa liga OCULTA sem jogos
  (so servem as competicoes europeias; um deles e sorteado para a Champions).
- 30 jogadores por clube, nomes tipicos do pais (europa/nomes.cjs), 5 estrangeiros por clube (de outros paises), OVR equilibrado: pais -> clube -> posicao.
- Escreve textSim/nomesPaises.ts: as mesmas listas de nomes, para os jogadores GERADOS e a base Sub-20 de cada clube terem os nomes do pais do clube (youth.ts, dataGenerator.ts).
Ids: clubes = codigo do pais x 10000 + n; jogadores 7000001 em diante (o gerador latam, 8000000+, apaga os seus sem tocar nestes).
*/
const fs = require('fs');
const path = require('path');
const { PAISES, COR } = require('./europa/clubes.cjs');
const NOMES_EU = require('./europa/nomes.cjs').NOMES;
const NOMES_LATAM = require('./latam/nomes.cjs').NOMES;
const NOMES = Object.assign({}, NOMES_LATAM, NOMES_EU);

const CONFIG = {
    semente: 2027,
    jogadoresPorClube: 30,
    estrangeirosPorClube: 5,
    // Teto de OVR (o melhor jogador dos melhores clubes do pais). O Brasil tem 76-81.
    teto: { ENG: 87, ESP: 88, GER: 86, ITA: 85, FRA: 85, POR: 81, NED: 81, BEL: 78, TUR: 78, AUT: 76, NOR: 75, GRE: 76, CZE: 76, UKR: 76, SVK: 71, AZE: 71 },
    // Quanto o pico desce do 1.o ao ultimo clube da liga (OVR), e quantos clubes ficam no teto.
    quedaLiga: { ENG: 15, ESP: 15, GER: 14, ITA: 14, FRA: 14, POR: 6, NED: 6, BEL: 5, TUR: 6, AUT: 5, NOR: 5, GRE: 5, CZE: 5, UKR: 5, SVK: 4, AZE: 4 },
    melhoresClubes: { ENG: 3, ESP: 3, GER: 3, ITA: 3, FRA: 2, POR: 2, NED: 2, BEL: 1, TUR: 2, AUT: 1, NOR: 1, GRE: 2, CZE: 1, UKR: 1, SVK: 1, AZE: 1 },
    onzeAbaixoDoPico: 5.5,
    // Dinheiro e torcida do clube de topo de cada pais (desce com a posicao).
    capitalTopo: { ENG: 40e6, ESP: 40e6, GER: 32e6, ITA: 26e6, FRA: 26e6, POR: 14e6, NED: 14e6, BEL: 8e6, TUR: 12e6, AUT: 7e6, NOR: 7e6, GRE: 8e6, CZE: 6e6, UKR: 7e6, SVK: 3e6, AZE: 3e6 },
    torcidaTopo: { ENG: 160000, ESP: 170000, GER: 150000, ITA: 120000, FRA: 100000, POR: 90000, NED: 70000, BEL: 45000, TUR: 110000, AUT: 40000, NOR: 35000, GRE: 70000, CZE: 40000, UKR: 60000, SVK: 25000, AZE: 25000 },
    // De onde vem os estrangeiros de cada pais (peso).
    origem: {
        ENG: { FRA: 14, ESP: 8, BRA: 10, NED: 6, POR: 8, GER: 6, ARG: 6, BEL: 6, ITA: 4 },
        ESP: { ARG: 14, BRA: 12, FRA: 10, POR: 8, ITA: 5, ENG: 4, URU: 6, COL: 6, GER: 4 },
        GER: { FRA: 10, NED: 8, AUT: 8, BEL: 6, BRA: 8, ESP: 6, TUR: 6, ENG: 4, CZE: 4, NOR: 4 },
        ITA: { FRA: 10, ARG: 10, BRA: 10, ESP: 6, POR: 6, GER: 4, URU: 6, COL: 4, NED: 4, ENG: 4 },
        FRA: { BEL: 8, ESP: 8, POR: 8, BRA: 10, ITA: 6, ARG: 6, ENG: 4, GER: 4, NED: 4 },
        NOR: { ENG: 6, GER: 6, NED: 6, BRA: 6, POR: 4 }, NED: { BEL: 10, GER: 6, BRA: 8, ENG: 4, POR: 4, TUR: 6, NOR: 3 },
        POR: { BRA: 24, ARG: 8, ESP: 6, FRA: 6, URU: 4, COL: 4 }, TUR: { BRA: 8, GER: 8, FRA: 6, NED: 5, ESP: 4, UKR: 4, GRE: 3 },
        AUT: { GER: 10, CZE: 6, SVK: 4, BRA: 4, TUR: 4 }, AZE: { BRA: 14, UKR: 6, TUR: 6, GRE: 3 }, BEL: { FRA: 10, NED: 8, BRA: 8, GER: 4, ESP: 4, ENG: 3 },
        SVK: { CZE: 10, AUT: 4, BRA: 4, GER: 3 }, GRE: { BRA: 8, ESP: 5, ARG: 6, GER: 3, FRA: 4 }, CZE: { SVK: 10, UKR: 5, BRA: 4, GER: 3, AUT: 3 },
        UKR: { BRA: 14, ARG: 4, CZE: 3, POR: 3, SVK: 3 }
    },
    ARQ_EXTRA: {}
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
const lerLista = (nome) => {
    const i = dbTxt.indexOf('export const ' + nome);
    if (i < 0) throw new Error('nao achei ' + nome);
    const a = dbTxt.indexOf('= [', i) + 2, b = dbTxt.indexOf('\n];', a) + 2;
    return eval(dbTxt.slice(a, b));
};
let countries = lerLista('REAL_COUNTRIES_JSON');
let teams = lerLista('REAL_TEAMS_JSON');
let players = lerLista('REAL_PLAYERS_JSON');

const ID_JOGADOR_BASE = 7000000, ID_JOGADOR_MAX = 7999999;
const dry = process.argv.includes('--dry'), force = process.argv.includes('--force');
// Nacionalidade (codigo numerico, o do players.json) de cada pais: os latam e o Brasil como no gerador latam; os europeus, o codigo do pais.
const NAC_ID = { ARG: '52', BOL: '53', BRA: '54', CHI: '55', COL: '56', ECU: '57', PAR: '58', PER: '59', URU: '60', VEN: '61' };
for (const p of PAISES) NAC_ID[p.sigla] = p.id;
const IDS_NOVOS = PAISES.filter(p => !p.existente).map(p => p.id);
const eNovoClube = (t) => IDS_NOVOS.includes(String(t.country));
const jaTem = teams.some(eNovoClube) || players.some(p => p.idPlayer >= ID_JOGADOR_BASE && p.idPlayer <= ID_JOGADOR_MAX);
if (jaTem && !dry && !force) {
    console.error('Ja ha ligas europeias na base (talvez editadas). Use --force para as refazer do zero (apaga o que editou), ou --dry para so ver o relatorio.');
    process.exit(1);
}
if (jaTem) {
    countries = countries.filter(c => !IDS_NOVOS.includes(String(c.id)));
    teams = teams.filter(t => !eNovoClube(t));
    players = players.filter(p => !(p.idPlayer >= ID_JOGADOR_BASE && p.idPlayer <= ID_JOGADOR_MAX));
}

// ---------------------------------------------------------------- valor de mercado (a mesma regressao do gerador latam, sobre os jogadores ja existentes)
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

// ---------------------------------------------------------------- plantel (igual ao gerador latam). posPlayer: 1 GK 2 RB 3 LB 4 CB 5 DM 6 LM 7 RM 8 CM 9 ST 10 AM 11 RW 12 LW
const PLANTEL = [1, 1, 1, 2, 2, 3, 3, 4, 4, 4, 4, 5, 5, 5, 8, 8, 8, 8, 6, 7, 10, 10, 11, 11, 12, 12, 9, 9, 9, 9];
const ONZE = [1, 2, 3, 4, 4, 5, 8, 10, 11, 12, 9];
const OFF_POS = { 1: 0, 2: -0.5, 3: -0.5, 4: -0.5, 5: 0, 6: 0, 7: 0, 8: 0.5, 9: 1, 10: 1, 11: 1, 12: 1 };
const PESO_ESTRELA = { 1: 0.7, 4: 1, 5: 0.6, 8: 1, 10: 1, 11: 1, 12: 1, 9: 1, 2: 0.4, 3: 0.4 };
const estrelasDoPais = {};
const ARQ = { 1: [0, -8, -1, -45], 2: [0, -6, -4, -24], 3: [0, -6, -4, -24], 4: [2, -8, -14, -24], 5: [0, -2, -9, -18], 6: [-14, -2, 2, -12], 7: [-14, -2, 2, -12],
    8: [-8, 0, -4, -12], 9: [-26, -12, 0, 2], 10: [-18, 1, 3, -6], 11: [-20, -4, 4, -6], 12: [-20, -4, 4, -6] };

// ---------------------------------------------------------------- nomes
const usados = new Set(players.map(p => p.namePlayer));
function nomeDe(nac) {
    const N = NOMES[nac];
    for (let t = 0; t < 40; t++) {
        let nome = pick(N.nomes);
        if (rnd() < 0.18) nome += ' ' + pick(N.nomes.filter(x => !x.includes(' ')));
        let sob = pick(N.sobrenomes);
        if (rnd() < 0.20) sob += ' ' + pick(N.sobrenomes.filter(x => !x.includes(' ')));
        const completo = nome + ' ' + sob;
        if (!usados.has(completo)) { usados.add(completo); return completo; }
    }
    const completo = pick(N.nomes) + ' ' + pick(N.nomes) + ' ' + pick(N.sobrenomes) + ' ' + pick(N.sobrenomes);
    usados.add(completo); return completo;
}

// ---------------------------------------------------------------- um clube
function picoDe(pais, rank, nClubes) {
    const teto = CONFIG.teto[pais.sigla], queda = CONFIG.quedaLiga[pais.sigla], top = CONFIG.melhoresClubes[pais.sigla];
    if (rank < top) return teto - rank * 0.4;
    return teto - 1 - (rank - top) * ((queda - 1) / Math.max(1, nClubes - top - 1));
}

function gerarElenco(pais, rank, nClubes) {
    const picoClube = picoDe(pais, rank, nClubes);
    const mediaOnze = picoClube - CONFIG.onzeAbaixoDoPico;
    const slots = PLANTEL.map((pos, i) => ({ pos, i, onze: false }));
    const falta = ONZE.slice();
    for (const s of slots) { const k = falta.indexOf(s.pos); if (k >= 0) { falta.splice(k, 1); s.onze = true; } }
    const tit = slots.filter(s => s.onze);
    tit.forEach(s => { s.ovr = mediaOnze + OFF_POS[s.pos] + clamp(gauss() * 1.8, -3.5, 3.5); });
    const nEstrelas = rank < CONFIG.melhoresClubes[pais.sigla] ? 2 : 1;
    const candidatos = tit.filter(s => PESO_ESTRELA[s.pos]);
    for (let e = 0; e < nEstrelas; e++) {
        const cont = estrelasDoPais[pais.sigla] = estrelasDoPais[pais.sigla] || {};
        const peso = (s) => PESO_ESTRELA[s.pos] / Math.pow(1 + (cont[s.pos] || 0), 1.5);
        const pool = candidatos.filter(s => !s.estrela); const tot = pool.reduce((a, s) => a + peso(s), 0); let r = rnd() * tot, esc = pool[0];
        for (const s of pool) { r -= peso(s); if (r <= 0) { esc = s; break; } }
        cont[esc.pos] = (cont[esc.pos] || 0) + 1;
        esc.estrela = true; esc.ovr = picoClube - e;
    }
    const outros = tit.filter(s => !s.estrela), alvoSoma = mediaOnze * tit.length - tit.filter(s => s.estrela).reduce((a, s) => a + s.ovr, 0);
    const desl = (alvoSoma - outros.reduce((a, s) => a + s.ovr, 0)) / outros.length;
    outros.forEach(s => { s.ovr = Math.min(picoClube - 1, s.ovr + desl); });
    const refPos = {}; tit.forEach(s => { (refPos[s.pos] = refPos[s.pos] || []).push(s.ovr); });
    slots.filter(s => !s.onze).forEach(s => {
        const ref = (refPos[s.pos] ? Math.min(...refPos[s.pos]) : mediaOnze);
        s.ovr = Math.min(ref - 1, mediaOnze - 4.5 + gauss() * 2.2);
    });
    const jovens = new Set(); while (jovens.size < 5) { const c = slots.filter(s => !s.onze)[ri(0, slots.length - ONZE.length - 1)]; if (c) jovens.add(c.i); }
    slots.forEach(s => {
        if (jovens.has(s.i)) { s.idade = ri(17, 20); s.ovr -= 3; }
        else if (s.pos === 1) s.idade = ri(21, 39);
        else s.idade = clamp(Math.round(27 + gauss() * 4.6), 19, 38);
        s.ovr = Math.round(clamp(s.ovr, 38, picoClube));
    });
    return { slots, picoClube, mediaOnze };
}

// ---------------------------------------------------------------- clubes e jogadores
const novoPaises = [], novoClubes = [], novosJogadores = [], relatorio = [];
let idJog = ID_JOGADOR_BASE;
const kit = (pat, c1, c2, nCor) => ({ pattern: pat, color1: c1, color2: c2 || '', color3: '', numberColor: nCor, numberOutlineColor: '', collarColor: c2 || (claro(c1) ? '#111111' : '#ffffff'), sleeveColor: '' });
const PADRAO = { s: 'solid', v: 'stripes', h: 'horizontal' };
const claro = (hex) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 150; };

for (const pais of PAISES) {
    const nClubes = pais.clubes.length;
    const ids = [];
    let seq = 0;
    pais.clubes.forEach((c, rank) => {
        seq++;
        const nome = c[0];
        let clube;
        if (pais.existente) {
            clube = teams.find(t => t.teamName === nome && String(t.country) === pais.id);
            if (!clube) { console.error('clube existente nao encontrado:', nome); process.exit(1); }
        } else {
            const [, sigla, cidade, estadio, k1, k2, pat, ano] = c;
            const id = Number(pais.id) * 10000 + seq;
            const cap = Math.round(CONFIG.capitalTopo[pais.sigla] * Math.pow(0.2, rank / Math.max(1, nClubes - 1)) / 1000) * 1000;
            const torcida = Math.round(CONFIG.torcidaTopo[pais.sigla] * Math.pow(0.12, rank / Math.max(1, nClubes - 1)));
            const c1 = COR[k1], c2 = COR[k2];
            clube = {
                teamID: id, teamName: nome, teamAbb: sigla, color: c1, color2: c2, color3: '', teamCityName: cidade, teamStadiumName: estadio, yearOfFoundation: ano || 0,
                initialCapital: cap, initialTransfer: Math.round(cap * 0.5), sponsorAmount: 0, fanBase: torcida, avrAttendance: Math.round(torcida * 0.32),
                country: pais.id,
                homeKit: kit(PADRAO[pat], c1, pat === 's' ? '' : c2, claro(c1) ? 'black' : 'white'),
                awayKit: kit(pat === 's' ? 'solid' : PADRAO[pat], claro(c1) ? c2 : '#ffffff', claro(c1) ? c1 : c1, claro(claro(c1) ? c2 : '#ffffff') ? 'black' : 'white'),
                thirdKit: kit('solid', '#111111', c1, 'white'),
                gkKit: kit('solid', pick(['#16a34a', '#ea580c', '#7c3aed', '#0ea5e9']), '', 'white')
            };
            novoClubes.push(clube);
        }
        ids.push(clube.teamID);

        const { slots, picoClube, mediaOnze } = gerarElenco(pais, rank, nClubes);
        // estrangeiros: ~5 por clube, nunca a estrela do clube, raros guarda-redes
        const nEstr = clamp(Math.round(CONFIG.estrangeirosPorClube + gauss() * 1.0), 3, 7);
        const origens = Object.assign({}, CONFIG.origem[pais.sigla]); delete origens[pais.sigla];
        const elegiveis = slots.filter(s => !s.estrela && (s.pos !== 1 || rnd() < 0.25));
        const estrangeiros = new Map();
        while (estrangeiros.size < nEstr && elegiveis.length) { const s = elegiveis.splice(ri(0, elegiveis.length - 1), 1)[0]; estrangeiros.set(s.i, pickPeso(origens)); }
        const elenco = [];
        for (const s of slots) {
            const nac = estrangeiros.get(s.i) || pais.sigla;
            const a = ARQ[s.pos];
            const st = (k) => Math.round(clamp(s.ovr + a[k] + gauss() * 2.5, 15, 95));
            elenco.push({
                idPlayer: ++idJog, team: nome, namePlayer: nomeDe(nac), posPlayer: s.pos, agePlayer: s.idade, ovrPlayer: s.ovr,
                fitPlayer: ri(70, 90), morplayer: ri(4, 6), defPlayer: st(0), pasPlayer: st(1), drbplayer: st(2), shtPlayer: st(3),
                valPlayer: valorDe(s.ovr, s.idade, 0.5 + 0.5 * (CONFIG.teto[pais.sigla] - 66) / 12), nationality: NAC_ID[nac]
            });
        }
        novosJogadores.push(...elenco);
        const ov = elenco.map(j => j.ovrPlayer), tit = elenco.filter((j, i) => slots[i].onze);
        relatorio.push({ pais: pais.sigla, clube: nome, rank, pico: Math.max(...ov), onze: +(tit.reduce((a, j) => a + j.ovrPlayer, 0) / tit.length).toFixed(1),
            plantel: +(ov.reduce((a, b) => a + b, 0) / ov.length).toFixed(1), estr: estrangeiros.size, elenco, slots });
    });
    if (pais.existente) continue;   // a liga inglesa ja existe
    const entrada = { id: pais.id, name: pais.nome, continent: 'Europe', leagues: [] };
    if (pais.completa) {
        const rounds = 2 * (nClubes - 1), passos = rounds * 4.67 + 105 < 360 ? [4, 6, 4, 4, 6] : [3, 4, 4];
        const datas = []; let d = 105; for (let r = 0; r < rounds; r++) { datas.push(d); d += passos[r % passos.length]; }
        entrada.leagues.push({ id: pais.ligaId, name: pais.ligaNome, tier: 1, teamIds: ids, promoted: 0, relegated: pais.rebaixados, matchDates: datas });
    } else {
        entrada.leagues.push({ id: pais.ligaId, name: pais.ligaNome, tier: 9, hidden: true, teamIds: ids, matchDates: [] });
    }
    novoPaises.push(entrada);
}

// ---------------------------------------------------------------- validacoes
const nomesClubes = new Set(teams.map(t => t.teamName)), repetidos = [];
for (const c of novoClubes) { if (nomesClubes.has(c.teamName)) repetidos.push(c.teamName); nomesClubes.add(c.teamName); }
if (repetidos.length) { console.error('NOMES DE CLUBE REPETIDOS (o jogo liga jogadores a clubes pelo nome):', repetidos.join(', ')); process.exit(1); }
for (const r of relatorio) {
    const gk = r.elenco.filter(j => j.posPlayer === 1).length;
    if (r.elenco.length !== CONFIG.jogadoresPorClube || gk < 3) { console.error('plantel invalido', r.clube); process.exit(1); }
}
if (idJog > ID_JOGADOR_MAX) { console.error('ids de jogador a mais'); process.exit(1); }

// ---------------------------------------------------------------- relatorio
const R = [];
R.push('RELATORIO DAS LIGAS EUROPEIAS (semente ' + CONFIG.semente + ')', '');
R.push('Clubes novos: ' + novoClubes.length + '   Jogadores: ' + novosJogadores.length, '');
for (const pais of PAISES) {
    const rs = relatorio.filter(r => r.pais === pais.sigla);
    R.push(pais.nome.toUpperCase() + '  teto ' + CONFIG.teto[pais.sigla] + '  ' + (pais.completa ? 'liga completa' : 'so 5 clubes (oculta)') + ': ' + pais.clubes.length + ' clubes');
    R.push('  #  clube'.padEnd(36) + 'pico  onze  plantel  estrangeiros');
    rs.forEach((r, i) => R.push(('  ' + (i + 1)).padEnd(5) + r.clube.padEnd(31) + String(r.pico).padEnd(6) + String(r.onze).padEnd(6) + String(r.plantel).padEnd(9) + r.estr));
    R.push('');
}
const faixas = { '17-20': 0, '21-24': 0, '25-28': 0, '29-32': 0, '33+': 0 }; novosJogadores.forEach(j => { const a = j.agePlayer; faixas[a <= 20 ? '17-20' : a <= 24 ? '21-24' : a <= 28 ? '25-28' : a <= 32 ? '29-32' : '33+']++; });
R.push('Idades: ' + Object.entries(faixas).map(([k, v]) => k + ' ' + v).join(', '));
const nacs = {}; novosJogadores.forEach(j => nacs[j.nationality] = (nacs[j.nationality] || 0) + 1);
R.push('Jogadores por nacionalidade: ' + Object.entries(nacs).map(([k, v]) => k + ' ' + v).join(', '));
fs.mkdirSync(path.join(__dirname, 'europa'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'europa', 'relatorio.txt'), R.join('\n'), 'utf8');
console.log(R.slice(0, 3).join('\n'));

// ---------------------------------------------------------------- nomes por pais para o jogo (jogadores gerados e base Sub-20)
// Chave: o id do PAIS DO CLUBE (o `country` de cada clube). O Brasil ('45') fica de fora: usa a lista de sempre (textSim/nomes.ts).
const CHAVE_NOMES = { ARG: '52', BOL: '53', CHI: '55', COL: '56', ECU: '57', PAR: '58', PER: '59', URU: '60', VEN: '61' };
for (const p of PAISES) CHAVE_NOMES[p.sigla] = p.id;
const tsNomes = [
    '/*',
    'NOMES POR PAIS, para os jogadores GERADOS e a base Sub-20 de cada clube terem nomes tipicos do pais do clube. GERADO por tools/gerar_ligas_europa.cjs (nao editar a mao: edite',
    'tools/europa/nomes.cjs ou tools/latam/nomes.cjs e corra o gerador). A chave e o id do pais do clube; sem entrada (Brasil, clubes antigos) usa-se textSim/nomes.ts.',
    '*/',
    'export const NOMES_POR_PAIS: Record<string, { nomes: string[]; sobrenomes: string[] }> = ' + JSON.stringify(Object.fromEntries(Object.entries(CHAVE_NOMES).map(([sig, id]) => [id, { nomes: NOMES[sig].nomes, sobrenomes: NOMES[sig].sobrenomes }])), null, 1) + ';',
    ''
].join('\n');
if (dry) { console.log('(--dry) relatorio em tools/europa/relatorio.txt; nada foi gravado na base.'); process.exit(0); }
fs.writeFileSync(path.join(raiz, 'textSim', 'nomesPaises.ts'), tsNomes, 'utf8');

// ---------------------------------------------------------------- grava
// A Inglaterra: a liga e os clubes ja la estao; so se acrescentam jogadores.
players.forEach(p => { if (p.nationality === undefined) p.nationality = ''; });
const out = '\n// Paste your full JSON content here in the respective arrays.\n\n' +
    'export const REAL_COUNTRIES_JSON: any[] = ' + JSON.stringify(countries.concat(novoPaises), null, 2) + ';\n\n' +
    'export const REAL_TEAMS_JSON: any[] = ' + JSON.stringify(teams.concat(novoClubes), null, 2) + ';\n\n' +
    'export const REAL_PLAYERS_JSON: any[] = ' + JSON.stringify(players.concat(novosJogadores), null, 2) + ';\n';
fs.writeFileSync(dbPath, out, 'utf8');
console.log('Gravado em textSim/realDatabase.ts: ' + novoPaises.length + ' paises, ' + novoClubes.length + ' clubes, ' + novosJogadores.length + ' jogadores; e textSim/nomesPaises.ts.');
