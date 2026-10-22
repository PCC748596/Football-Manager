/*
Reve as cores dos uniformes dos clubes brasileiros GERADOS (ids 451001+) a partir das cores dos escudos (Assets/Escudos/<clube>.png).
As cores sairam de um passe de python/PIL (cor cromatica dominante + a cor mais presente distinta); este script aplica-as: color/color2, homeKit (listras c1/c2), awayKit, thirdKit. O gkKit nao mexe.
    node tools/cores_uniformes_escudos.cjs <cores.json> [--dry]
*/
const fs = require('fs'), path = require('path');
const cores = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), dry = process.argv.includes('--dry');
const dbPath = path.resolve(__dirname, '..', 'textSim', 'realDatabase.ts');
let txt = fs.readFileSync(dbPath, 'utf8');
const RE = /export const REAL_TEAMS_JSON(?:: any\[\])? = (\[[\s\S]*?\r?\n\]);/;
const teams = eval(txt.match(RE)[1]);
const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const hex = (v) => '#' + v.map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
const rl = (h) => { const [r, g, b] = rgb(h).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contraste = (a, b) => { const x = rl(a), y = rl(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const dist = (a, b) => Math.max(...rgb(a).map((v, i) => Math.abs(v - rgb(b)[i])));
const escurece = (h, f) => hex(rgb(h).map(v => v * f));
const claro = (h) => rl(h) > 0.3;
const kit = (pat, c1, c2, nCor, nCont, gola) => ({ pattern: pat, color1: c1, color2: c2 || '', color3: '', numberColor: nCor, numberOutlineColor: nCont || '', collarColor: gola, sleeveColor: '' });
// O numero: preto ou branco, o que mais contrasta com TODAS as cores da camisa; se uma das cores tira o contraste (listras clara+escura), o numero branco leva contorno numa cor
// escura do clube (a mais escura, ou preto), senao o preto (nas camisas claras).
function numero(cs, escuraDoClube) {
    const minB = Math.min(...cs.map(c => contraste(c, '#ffffff'))), minP = Math.min(...cs.map(c => contraste(c, '#000000')));
    if (minB >= 3) return { cor: '#ffffff', contorno: '' };
    if (minP >= 4) return { cor: '#000000', contorno: '' };
    // clara + escura: o numero branco com a linha escura (a cor escura do clube); se so existir o preto, o numero preto
    const linha = rl(escuraDoClube) < 0.12 ? escuraDoClube : '#000000';
    return { cor: '#ffffff', contorno: linha };
}
// A gola: a cor do clube (ou branco/preto) que mais contrasta com a camisa (as duas cores, nas listras).
function gola(cs, candidatas) {
    let melhor = candidatas[0], mc = -1;
    for (const c of candidatas) { const m = Math.min(...cs.map(x => contraste(x, c))); if (m > mc) { mc = m; melhor = c; } }
    return melhor;
}
let n = 0;
for (const t of teams) {
    const c = cores[t.teamName]; if (!c || !(t.teamID > 451000 && t.teamID < 452000)) continue;
    const c1 = c.c1, c2 = c.c2 || (claro(c1) ? '#111111' : '#ffffff');
    const mais = rl(c1) >= rl(c2) ? c1 : c2, menos = mais === c1 ? c2 : c1;   // a cor mais clara e a mais escura do clube
    const escuraClube = rl(menos) < 0.12 ? menos : escurece(menos, 0.45);
    const todas = [c1, c2, '#ffffff', '#111111'];
    // 1: listras c1/c2
    const n1 = numero([c1, c2], escuraClube);
    t.color = c1; t.color2 = c2;
    t.homeKit = kit('stripes', c1, c2, n1.cor, n1.contorno, gola([c1, c2], todas));
    // 2: o oposto. Casa clara (a cor principal e clara) -> fora com a cor MAIS ESCURA do clube (escurecida se for mediana); casa escura -> fora clara (a mais clara do clube, ou branco).
    let fora;
    if (claro(c1)) { fora = rl(menos) < 0.1 ? menos : escurece(menos, 0.5); if (!(rl(fora) < 0.1)) fora = escurece(fora, 0.6); }
    else { fora = claro(mais) && contraste(mais, c1) > 3 ? mais : '#ffffff'; }
    if (dist(fora, c1) < 80) fora = claro(c1) ? '#111111' : '#ffffff';
    const n2 = numero([fora], escuraClube);
    t.awayKit = kit('solid', fora, '', n2.cor, n2.contorno, gola([fora], [c1, c2, '#ffffff', '#111111'].filter(x => dist(x, fora) >= 60)));
    // 3: uma terceira que se distingue da casa e da fora
    let terceira = [escurece(menos, 0.35), '#111111', c2, c1, '#ffffff'].find(x => dist(x, c1) >= 80 && dist(x, fora) >= 80) || '#444444';
    const n3 = numero([terceira], escuraClube);
    t.thirdKit = kit('solid', terceira, '', n3.cor, n3.contorno, gola([terceira], [c1, c2, '#ffffff', '#111111'].filter(x => dist(x, terceira) >= 60)));
    n++;
}
console.log(n, 'clubes atualizados');
if (dry) process.exit(0);
txt = txt.replace(RE, () => 'export const REAL_TEAMS_JSON: any[] = ' + JSON.stringify(teams, null, 2) + ';');
fs.writeFileSync(dbPath, txt, 'utf8');
console.log('Gravado.');
