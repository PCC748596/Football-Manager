/*
Reescala o OVR (media do plantel = Team.strength) dos clubes das series B, C e D do Brasil para as faixas pedidas, mantendo a ordem relativa:
    B: 67-72 | C: 64-69 | D: 64-69
    node tools/ajustar_ovr_brasil.cjs --dry    so mostra
    node tools/ajustar_ovr_brasil.cjs          grava em textSim/realDatabase.ts
Soma o mesmo delta a ovr/def/pas/drb/sht de todos os jogadores do clube.
*/
const fs = require('fs'), path = require('path');
const dry = process.argv.includes('--dry');
const dbPath = path.resolve(__dirname, '..', 'textSim', 'realDatabase.ts');
let txt = fs.readFileSync(dbPath, 'utf8');
const RE = (n) => new RegExp('export const ' + n + '(?:: any\\[\\])? = (\\[[\\s\\S]*?\\r?\\n\\]);');
const ler = (n) => eval(txt.match(RE(n))[1]);
const countries = ler('REAL_COUNTRIES_JSON'), teams = ler('REAL_TEAMS_JSON'), players = ler('REAL_PLAYERS_JSON');
const br = countries.find(c => c.leagues && c.leagues.some(l => l.id === 'bra_serie_c'));
const FAIXAS = { bra_serie_b: [67, 72], bra_serie_c: [64, 69], bra_serie_d: [64, 69] };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
for (const [lid, [lo, hi]] of Object.entries(FAIXAS)) {
    const liga = br.leagues.find(l => l.id === lid);
    const info = liga.teamIds.map(id => {
        const t = teams.find(x => x.teamID === id), ps = players.filter(p => p.team === t.teamName);
        const forca = ps.reduce((s, p) => s + p.ovrPlayer, 0) / ps.length;
        return { t, ps, forca };
    });
    const vazios = info.filter(i => !i.ps.length); if (vazios.length) console.log("  sem jogadores (ignorados):", vazios.map(i => i.t.teamName).join(", "));
    const cheios = info.filter(i => i.ps.length); const mn = Math.min(...cheios.map(i => i.forca)), mx = Math.max(...cheios.map(i => i.forca));
    for (const i of cheios) {
        const alvo = mx === mn ? (lo + hi) / 2 : lo + (hi - lo) * (i.forca - mn) / (mx - mn);
        const delta = Math.round(alvo - i.forca);
        i.alvo = alvo;
        if (!dry) for (const p of i.ps) for (const k of ['ovrPlayer', 'defPlayer', 'pasPlayer', 'drbplayer', 'shtPlayer']) p[k] = clamp(p[k] + delta, 1, 99);
    }
    console.log(lid, 'antes', mn.toFixed(1) + '-' + mx.toFixed(1), '-> alvo', lo + '-' + hi, '(' + info.length + ' clubes)');
}
if (dry) process.exit(0);
txt = txt.replace(RE('REAL_PLAYERS_JSON'), () => 'export const REAL_PLAYERS_JSON: any[] = ' + JSON.stringify(players, null, 2) + ';');
fs.writeFileSync(dbPath, txt, 'utf8');
console.log('Gravado.');
