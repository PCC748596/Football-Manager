/*
Gera 30 jogadores (nomes brasileiros) para clubes da Serie B sem plantel (CRB-AL, Sport-PE), com a media do plantel (Team.strength) = ALVO (meio da faixa 67-72).
    node tools/gerar_plantel_serieb.cjs --dry | (sem flag grava em textSim/realDatabase.ts). Nao faz nada para clubes que ja tem jogadores. Copia a logica de gerar_clubes_brasil.cjs.
*/
const fs = require('fs'), path = require('path');
const { NOMES } = require('./latam/nomes.cjs');
const dry = process.argv.includes('--dry');
const CLUBES = ['CRB-AL', 'Sport-PE'], ALVO = 69.5, ID_JOGADOR_BASE = 9000000;
let _s = 2026 >>> 0;
function rnd() { _s = (_s + 0x6D2B79F5) | 0; let t = Math.imul(_s ^ (_s >>> 15), 1 | _s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (a) => a[Math.floor(rnd() * a.length)];
function gauss() { let u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const dbPath = path.resolve(__dirname, '..', 'textSim', 'realDatabase.ts');
let dbTxt = fs.readFileSync(dbPath, 'utf8');
const RE = (nome) => new RegExp('export const ' + nome + '(?:: any\\[\\])? = (\\[[\\s\\S]*?\\r?\\n\\]);');
const players = eval(dbTxt.match(RE('REAL_PLAYERS_JSON'))[1]);
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

let idJ = Math.max(ID_JOGADOR_BASE, ...players.map(p => p.idPlayer)); const novosJogadores = [];
const alvos = CLUBES.filter(n => !players.some(p => p.team === n));
for (const nome of alvos) {
    const t = { teamName: nome };
    const pico = 75, media = pico - 5.5;
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
    const meus = novosJogadores.filter(p => p.team === nome), mediaReal = meus.reduce((a, p) => a + p.ovrPlayer, 0) / meus.length, delta = Math.round(ALVO - mediaReal);
    for (const p of meus) for (const k of ['ovrPlayer', 'defPlayer', 'pasPlayer', 'drbplayer', 'shtPlayer']) p[k] = clamp(p[k] + delta, 1, 99);
    console.log(nome, 'media', (meus.reduce((a, p) => a + p.ovrPlayer, 0) / meus.length).toFixed(1));
}
if (dry || !alvos.length) process.exit(0);
const todos = players.concat(novosJogadores);
dbTxt = dbTxt.replace(RE('REAL_PLAYERS_JSON'), () => 'export const REAL_PLAYERS_JSON: any[] = ' + JSON.stringify(todos, null, 2) + ';');
fs.writeFileSync(dbPath, dbTxt, 'utf8');
console.log('Gravado.');
