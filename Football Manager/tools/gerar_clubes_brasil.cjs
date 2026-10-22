/*
O SISTEMA DE LIGAS DO BRASIL: Series A, B, C e D (composicao de 2026, tools/latam/series_brasil.cjs) e os clubes da Copa do Brasil (tools/latam/copa_brasil.cjs).

    node tools/gerar_clubes_brasil.cjs --dry     so conta e mostra (nada e gravado)
    node tools/gerar_clubes_brasil.cjs           grava em textSim/realDatabase.ts
    node tools/gerar_clubes_brasil.cjs --force   refaz o que este script criou antes (clubes novos, jogadores gerados, ligas C/D/clubes) — APAGA o que editou nisso no Editor

O QUE FAZ
- Serie A e B: troca os clubes pelos de 2026 (os que ja existem mantem o id e os jogadores reais; os que faltam sao criados).
- Serie C (20) e D (96): ligas novas, `worldOnly` (aparecem na aba WORLD, nao na escolha de liga), com o formato real de cada uma (ver textSim/competitions.ts).
- `bra_clubes` (escondida): clubes da Copa do Brasil que nao estao em nenhuma serie. O pais Brasil ganha `copaTeamIds` (os 126 da Copa).
- Todos os nomes no padrao NOME-ESTADO (Fluminense-RJ, Fluminense-PI...).
- Clubes novos: ids 451001...; cidade/estadio/cores/ano sao melhor-esforco (a cidade quando a conheco, senao a capital): REVER NO EDITOR.
- Jogadores gerados (30 por clube novo sem jogadores reais): nomes brasileiros, 1 a 4 por posicao, idades 17-39. OVR: o pico (melhor jogador) da Serie C vai de 69 (1.o) a 66 (ultimo),
  o da Serie D de 66 a 64, os clubes so de Copa 62, o Athletic-MG (Serie B) 68; o onze fica 5,5 abaixo do pico. `NIVEIS` abaixo.
Semente fixa: a mesma corrida da sempre o mesmo resultado.
*/
const fs = require('fs');
const path = require('path');
const { NOMES } = require('./latam/nomes.cjs');
const CB = require('./latam/copa_brasil.cjs');
const SB = require('./latam/series_brasil.cjs');

const NIVEIS = { picoC: [69, 66], picoD: [66, 64], picoCopa: 62, picoB: 68, onzeAbaixoDoPico: 5.5 };
const SEMENTE = 1996, ID_CLUBE_BASE = 451000, ID_JOGADOR_BASE = 9000000;
let _s = SEMENTE >>> 0;
function rnd() { _s = (_s + 0x6D2B79F5) | 0; let t = Math.imul(_s ^ (_s >>> 15), 1 | _s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (a) => a[Math.floor(rnd() * a.length)];
function gauss() { let u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

const raiz = path.resolve(__dirname, '..');
const dbPath = path.join(raiz, 'textSim', 'realDatabase.ts');
const dbTxt = fs.readFileSync(dbPath, 'utf8');
const RE = (nome) => new RegExp('export const ' + nome + '(?:: any\\[\\])? = (\\[[\\s\\S]*?\\n\\]);');
const ler = (n) => { const m = dbTxt.match(RE(n)); if (!m) throw new Error('nao achei ' + n); return eval(m[1]); };
const countries = ler('REAL_COUNTRIES_JSON');
let teams = ler('REAL_TEAMS_JSON');
let players = ler('REAL_PLAYERS_JSON');
const dry = process.argv.includes('--dry'), force = process.argv.includes('--force');

const brasil = countries.find(c => c.id === '45');
const jaTem = brasil.leagues.some(l => l.id === 'bra_serie_c' || l.id === 'bra_clubes');
if (jaTem && !dry && !force) { console.error('Ja ha series C/D (talvez editadas). Use --force para refazer do zero ou --dry.'); process.exit(1); }
// Tira o que este script criou (da corrida anterior).
brasil.leagues = brasil.leagues.filter(l => !['bra_clubes', 'bra_serie_c', 'bra_serie_d'].includes(l.id));
teams = teams.filter(t => !(t.teamID > ID_CLUBE_BASE && t.teamID < ID_CLUBE_BASE + 999));
players = players.filter(p => p.idPlayer < ID_JOGADOR_BASE);
players.forEach(p => { if (SB.RENOMEAR_JOGADORES[p.team]) p.team = SB.RENOMEAR_JOGADORES[p.team]; });

// ---------------------------------------------------------------- nomes
const dbNome = (nome, uf, override) => {
    let n = override || nome;
    n = SB.NOME_ESPECIAL[n] || n;
    if (!override && !/-[A-Z]{2}$/.test(n)) n = n + '-' + uf;
    return SB.NOME_ESPECIAL[n] || n;
};
const resolver = (lista) => lista.map(([nome, uf, ov]) => ({ nome, uf, db: dbNome(nome, uf, ov) }));
const A = resolver(SB.SERIE_A), B = resolver(SB.SERIE_B), C = resolver(SB.SERIE_C), D = resolver(SB.SERIE_D);

// A lista da Copa do Brasil (126): nomes na base.
const copaLista = [];
CB.SERIE_A_2026.forEach(n => copaLista.push({ nome: n, uf: '', chave: n + '|' }));
Object.entries(CB.CAMPEOES).forEach(([n, uf]) => copaLista.push({ nome: n, uf, chave: n + '|' + uf }));
Object.entries(CB.ESTADUAIS).forEach(([uf, ns]) => ns.forEach(n => copaLista.push({ nome: n, uf, chave: n + '|' + uf })));
const copaVistos = new Set();
const copa = copaLista.filter(c => !copaVistos.has(c.chave) && copaVistos.add(c.chave)).map(c => {
    const base = CB.JA_NA_BASE[c.chave];
    const uf = c.uf || (c.nome === 'Remo' ? 'PA' : '');
    return { ...c, uf, db: base ? base : dbNome(c.nome, uf) };
});
if (copa.length !== 126) { console.error('A lista da Copa tem ' + copa.length + ' clubes, esperava 126'); process.exit(1); }
const copaDb = copa.map(c => c.db);

// ---------------------------------------------------------------- existentes e a criar
const porNome = new Map(teams.map(t => [t.teamName, t]));
const todosNomes = [...new Set([...A, ...B, ...C, ...D].map(c => c.db).concat(copaDb))];
const criar = todosNomes.filter(n => !porNome.has(n));

const infoDe = new Map();
[...A, ...B, ...C, ...D].forEach(c => infoDe.set(c.db, c));
copa.forEach(c => { if (!infoDe.has(c.db)) infoDe.set(c.db, { nome: c.nome, uf: c.uf, db: c.db }); });
const ORDEM_C = ['Confiança-SE', 'Paysandu-PA', 'Santa Cruz-PE', 'Figueirense-SC', 'Volta Redonda-RJ', 'Ituano-SP', 'Guarani-SP', 'Botafogo-PB', 'Brusque-SC', 'Amazonas-AM', 'Ferroviária-SP', 'Inter de Limeira-SP',
    'Maringá-PR', 'Caxias-RS', 'Ypiranga-RS', 'Anápolis-GO', 'Itabaiana-SE', 'Floresta-CE', 'Maranhão-MA', 'Barra-SC'];
const ALTOS_D = new Set(CB.ALTOS);
const ordemD = D.slice().sort((x, y) => (ALTOS_D.has(y.nome + '|' + y.uf) - ALTOS_D.has(x.nome + '|' + x.uf)) || (hash(x.db) - hash(y.db))).map(c => c.db);
const picoDe = (n) => {
    if (C.some(c => c.db === n)) { const r = ORDEM_C.indexOf(n); return NIVEIS.picoC[0] - (NIVEIS.picoC[0] - NIVEIS.picoC[1]) * ((r >= 0 ? r : 10) / 19); }
    const iD = ordemD.indexOf(n); if (iD >= 0) return NIVEIS.picoD[0] - (NIVEIS.picoD[0] - NIVEIS.picoD[1]) * (iD / (ordemD.length - 1));
    if (B.some(c => c.db === n) || A.some(c => c.db === n)) return NIVEIS.picoB;
    return NIVEIS.picoCopa;
};

// ---------------------------------------------------------------- registos de clubes novos
const PALETA = [['#c8102e', '#ffffff'], ['#15803d', '#ffffff'], ['#1d4ed8', '#ffffff'], ['#111111', '#ffffff'], ['#facc15', '#111111'], ['#7f1d1d', '#ffffff'], ['#ea580c', '#ffffff'], ['#6cb4ee', '#ffffff'],
    ['#ffffff', '#c8102e'], ['#15803d', '#facc15'], ['#1e3a8a', '#c8102e'], ['#111111', '#c8102e'], ['#6d28d9', '#ffffff'], ['#0ea5e9', '#111111']];
const claro = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) > 150; };
const kit = (pat, c1, c2, nCor) => ({ pattern: pat, color1: c1, color2: c2 || '', color3: '', numberColor: nCor, numberOutlineColor: '', collarColor: c2 || '', sleeveColor: '' });
const novosClubes = [];
criar.forEach((nome, i) => {
    const info = infoDe.get(nome) || { nome: nome.replace(/-[A-Z]{2}$/, ''), uf: nome.slice(-2) };
    const id = ID_CLUBE_BASE + 1 + i, [c1, c2] = PALETA[hash(nome) % PALETA.length], pico = picoDe(nome);
    const cidade = CB.CIDADES[info.nome + '|' + info.uf] || CB.CAPITAIS[info.uf] || '';
    const nivel = pico >= 68 ? 3 : pico >= 65 ? 2 : 1;
    const cap = [0.5e6, 0.9e6, 1.4e6][nivel - 1], fan = [ri(1500, 5000), ri(4000, 11000), ri(9000, 22000)][nivel - 1];
    novosClubes.push({
        teamID: id, teamName: nome, teamAbb: info.nome.normalize('NFD').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase(), color: c1, color2: c2, color3: '', teamCityName: cidade,
        teamStadiumName: 'Estádio Municipal de ' + (cidade || info.nome), yearOfFoundation: 0, initialCapital: cap, initialTransfer: Math.round(cap * 0.5), sponsorAmount: 0, fanBase: fan,
        avrAttendance: Math.round(fan * 0.25), country: '45',
        homeKit: kit('stripes', c1, c2, claro(c1) ? 'black' : 'white'), awayKit: kit('solid', claro(c1) ? c2 : '#ffffff', '', claro(claro(c1) ? c2 : '#ffffff') ? 'black' : 'white'),
        thirdKit: kit('solid', '#111111', c1, 'white'), gkKit: kit('solid', pick(['#16a34a', '#ea580c', '#7c3aed', '#0ea5e9']), '', 'white')
    });
});
const idDe = (n) => (porNome.get(n) || novosClubes.find(t => t.teamName === n)).teamID;

// ---------------------------------------------------------------- jogadores dos clubes novos (30 cada, a menos que ja haja jogadores reais)
const comReais = new Set(players.map(p => p.team));
const PLANTEL = [1, 1, 1, 2, 2, 3, 3, 4, 4, 4, 4, 5, 5, 5, 8, 8, 8, 8, 6, 7, 10, 10, 11, 11, 12, 12, 9, 9, 9, 9];
const ONZE = [1, 2, 3, 4, 4, 5, 8, 10, 11, 12, 9];
const OFF_POS = { 1: 0, 2: -0.5, 3: -0.5, 4: -0.5, 5: 0, 6: 0, 7: 0, 8: 0.5, 9: 1, 10: 1, 11: 1, 12: 1 };
const ARQ = { 1: [0, -8, -1, -45], 2: [0, -6, -4, -24], 3: [0, -6, -4, -24], 4: [2, -8, -14, -24], 5: [0, -2, -9, -18], 6: [-14, -2, 2, -12], 7: [-14, -2, 2, -12],
    8: [-8, 0, -4, -12], 9: [-26, -12, 0, 2], 10: [-18, 1, 3, -6], 11: [-20, -4, 4, -6], 12: [-20, -4, 4, -6] };
function ajustarValor() {
    const X = [], Y = []; for (const p of players) if (p.valPlayer > 0 && p.ovrPlayer && p.agePlayer) { X.push([1, p.ovrPlayer, (p.agePlayer - 27) ** 2]); Y.push(Math.log(p.valPlayer)); }
    const n = 3, M = Array.from({ length: n }, () => new Array(n).fill(0)), b = new Array(n).fill(0);
    X.forEach((x, i) => { for (let r = 0; r < n; r++) { b[r] += x[r] * Y[i]; for (let c = 0; c < n; c++) M[r][c] += x[r] * x[c]; } });
    for (let i = 0; i < n; i++) { let m = i; for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[m][i])) m = r; [M[i], M[m]] = [M[m], M[i]]; [b[i], b[m]] = [b[m], b[i]];
        for (let r = i + 1; r < n; r++) { const f = M[r][i] / M[i][i]; for (let c = i; c < n; c++) M[r][c] -= f * M[i][c]; b[r] -= f * b[i]; } }
    const w = new Array(n).fill(0); for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < n; c++) s -= M[i][c] * w[c]; w[i] = s / M[i][i]; } return w;
}
const W = ajustarValor();
const valorDe = (ovr, idade) => Math.max(15000, Math.round(Math.exp(W[0] + W[1] * ovr + W[2] * (idade - 27) ** 2) * (0.85 + rnd() * 0.3) / 1000) * 1000);
const usados = new Set(players.map(p => p.namePlayer));
function nomeJog() {
    const N = NOMES.BRA;
    for (let t = 0; t < 40; t++) {
        let n = pick(N.nomes); if (rnd() < 0.2) n += ' ' + pick(N.nomes);
        let s = pick(N.sobrenomes); if (rnd() < 0.45) s += ' ' + pick(N.sobrenomes);
        const c = n + ' ' + s; if (!usados.has(c)) { usados.add(c); return c; }
    }
    const c = pick(N.nomes) + ' ' + pick(N.nomes) + ' ' + pick(N.sobrenomes) + ' ' + pick(N.sobrenomes); usados.add(c); return c;
}
let idJ = ID_JOGADOR_BASE; const novosJogadores = [];
for (const t of novosClubes) {
    if (comReais.has(t.teamName)) continue;
    const pico = Math.round(picoDe(t.teamName) * 10) / 10, media = pico - NIVEIS.onzeAbaixoDoPico;
    const slots = PLANTEL.map((pos, i) => ({ pos, i, onze: false })), falta = ONZE.slice();
    for (const s of slots) { const k = falta.indexOf(s.pos); if (k >= 0) { falta.splice(k, 1); s.onze = true; } }
    const tit = slots.filter(s => s.onze);
    tit.forEach(s => { s.ovr = media + OFF_POS[s.pos] + clamp(gauss() * 1.8, -3.5, 3.5); });
    const star = pick(tit.filter(s => s.pos !== 1)); star.ovr = pico; star.estrela = true;
    const outros = tit.filter(s => !s.estrela), alvo = media * tit.length - pico, d = (alvo - outros.reduce((a, s) => a + s.ovr, 0)) / outros.length;
    outros.forEach(s => { s.ovr = Math.min(pico - 1, s.ovr + d); });
    const ref = {}; tit.forEach(s => { (ref[s.pos] = ref[s.pos] || []).push(s.ovr); });
    slots.filter(s => !s.onze).forEach(s => { s.ovr = Math.min((ref[s.pos] ? Math.min(...ref[s.pos]) : media) - 1, media - 4.5 + gauss() * 2.2); });
    const jov = new Set(); while (jov.size < 5) { const k = slots.filter(s => !s.onze)[ri(0, slots.length - ONZE.length - 1)]; if (k) jov.add(k.i); }
    slots.forEach(s => {
        if (jov.has(s.i)) { s.idade = ri(17, 20); s.ovr -= 3; } else if (s.pos === 1) s.idade = ri(21, 39); else s.idade = clamp(Math.round(27 + gauss() * 4.6), 19, 38);
        s.ovr = Math.round(clamp(s.ovr, 30, pico));
    });
    for (const s of slots) {
        const a = ARQ[s.pos], st = (k) => Math.round(clamp(s.ovr + a[k] + gauss() * 2.5, 15, 95));
        novosJogadores.push({ idPlayer: ++idJ, team: t.teamName, namePlayer: nomeJog(), posPlayer: s.pos, agePlayer: s.idade, ovrPlayer: s.ovr, fitPlayer: ri(70, 90), morplayer: ri(4, 6),
            defPlayer: st(0), pasPlayer: st(1), drbplayer: st(2), shtPlayer: st(3), valPlayer: valorDe(s.ovr, s.idade), nationality: '54' });
    }
}

// ---------------------------------------------------------------- ligas
const idsA = A.map(c => idDe(c.db)), idsB = B.map(c => idDe(c.db)), idsC = C.map(c => idDe(c.db)), idsD = D.map(c => idDe(c.db));
const dupl = [...idsA, ...idsB, ...idsC, ...idsD].filter((x, i, a) => a.indexOf(x) !== i);
if (dupl.length) { console.error('Clubes em duas series:', dupl.map(i => (teams.concat(novosClubes).find(t => t.teamID === i) || {}).teamName).join(', ')); process.exit(1); }
if (idsA.length !== 20 || idsB.length !== 20 || idsC.length !== 20 || idsD.length !== 96) { console.error('Tamanhos errados:', idsA.length, idsB.length, idsC.length, idsD.length); process.exit(1); }
const naSerie = new Set([...idsA, ...idsB, ...idsC, ...idsD]);
const copaIds = copaDb.map(idDe);
const soCopa = copaIds.filter(i => !naSerie.has(i));
const serieA = brasil.leagues.find(l => l.id === 'bra_serie_a'), serieB = brasil.leagues.find(l => l.id === 'bra_serie_b');

console.log('Series: A ' + idsA.length + ', B ' + idsB.length + ', C ' + idsC.length + ', D ' + idsD.length + ' | Copa: ' + copaIds.length + ' clubes (' + soCopa.length + ' so da Copa)');
console.log('Clubes a criar: ' + novosClubes.length + ' | jogadores gerados: ' + novosJogadores.length + ' | com jogadores reais (so registo): ' + novosClubes.filter(t => comReais.has(t.teamName)).map(t => t.teamName).join(', '));
if (dry) { console.log('(--dry) nada gravado.'); process.exit(0); }

serieA.teamIds = idsA; serieB.teamIds = idsB;
brasil.leagues.push(
    { id: 'bra_serie_c', name: 'Série C', tier: 3, worldOnly: true, format: 'SERIE_C', teamIds: idsC, promoted: 4, relegated: 4, matchDates: [] },
    { id: 'bra_serie_d', name: 'Série D', tier: 4, worldOnly: true, format: 'SERIE_D', teamIds: idsD, promoted: 4, relegated: 0, matchDates: [] },
    { id: 'bra_clubes', name: 'Outros clubes (Copa do Brasil)', tier: 9, hidden: true, teamIds: soCopa, promoted: 0, relegated: 0, matchDates: [] }
);
brasil.copaTeamIds = copaIds;
brasil.classificacaoAnterior = { bra_serie_a: SB.CLASSIFICACAO_A_ANTERIOR };
players.forEach(p => { if (p.nationality === undefined) p.nationality = ''; });
let out = dbTxt;
const sub = (n, l) => { out = out.replace(RE(n), () => 'export const ' + n + ': any[] = ' + JSON.stringify(l, null, 2) + ';'); };
sub('REAL_COUNTRIES_JSON', countries);
sub('REAL_TEAMS_JSON', teams.concat(novosClubes));
sub('REAL_PLAYERS_JSON', players.concat(novosJogadores));
fs.writeFileSync(dbPath, out, 'utf8');
console.log('Gravado em textSim/realDatabase.ts.');
