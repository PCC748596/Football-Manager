/*
2.as DIVISOES (e Portugal inteiro) a partir dos CountryData<N>.json em local-data/ (tools/parse_countrydata.py ... --max-tier 2): Italia (27), Alemanha (21), Espanha (45), Franca (18), Portugal (38).

    node tools/gerar_ligas_paises.cjs --dry     mostra os nomes e o que faria
    node tools/gerar_ligas_paises.cjs           acrescenta clubes e ligas a textSim/realDatabase.ts e escreve `gameTeamId` nos local-data/CountryData<N>.json
    node tools/gerar_ligas_paises.cjs --force   refaz (APAGA os clubes e ligas que este script criou — incluindo o que editou no Editor neles)

Os 1.os escalões de Italia, Alemanha, Espanha e Franca ja estao no jogo (os 20/18 clubes de 2025/26): so se LIGAM aos clubes do ficheiro (por `gameTeamId`). A 2.a divisao de cada pais e
nova (clubes sem jogadores na base: o jogo gera os tapa-buracos e os reais entram por textSim/dadosLocais.ts). Portugal tinha so 5 clubes numa liga oculta (por_clubes): passa a Primeira Liga
completa (18) + Liga 2 (18); os 5 clubes antigos ficam com os mesmos ids. Nenhum jogador real entra na base.
Cores: sem fonte no ficheiro, cada clube leva uma cor escolhida pelo nome (determinista): REVER no Editor. Ids novos: id do pais x 10000 + n (n em seguida ao maior ja usado).
*/
const fs = require('fs');
const path = require('path');
const { COR } = require('./europa/clubes.cjs');

const raiz = path.resolve(__dirname, '..');
const dbPath = path.join(raiz, 'textSim', 'realDatabase.ts');
const dry = process.argv.includes('--dry'), force = process.argv.includes('--force');

// Clubes que o jogo ja tinha: id do ficheiro -> nome na base.
const IT = { 1: 'Napoli', 2: 'Inter', 3: 'Atalanta', 4: 'Juventus', 5: 'Roma', 6: 'Fiorentina', 7: 'Lazio', 8: 'Milan', 9: 'Bologna', 10: 'Como', 11: 'Torino', 12: 'Udinese', 13: 'Genoa', 14: 'Hellas Verona', 15: 'Cagliari', 16: 'Parma', 17: 'Lecce', 18: 'Sassuolo', 19: 'Pisa', 20: 'Cremonese' };
const DE = { 1: 'Bayern München', 2: 'Bayer Leverkusen', 3: 'Eintracht Frankfurt', 4: 'Borussia Dortmund', 5: 'Freiburg', 6: 'Mainz 05', 7: 'RB Leipzig', 8: 'Werder Bremen', 9: 'Stuttgart', 10: 'Borussia Mönchengladbach', 11: 'Wolfsburg', 12: 'Augsburg', 13: 'Union Berlin', 14: 'St. Pauli', 15: 'Hoffenheim', 16: 'Heidenheim', 17: 'Köln', 18: 'Hamburger SV' };
const ES = { 1: 'Barcelona', 2: 'Real Madrid', 3: 'Atlético de Madrid', 4: 'Athletic Club', 5: 'Villarreal', 6: 'Real Betis', 7: 'Celta Vigo', 8: 'Rayo Vallecano', 9: 'Osasuna', 10: 'Mallorca', 11: 'Real Sociedad', 12: 'Valencia', 13: 'Getafe', 14: 'Espanyol', 15: 'Alavés', 16: 'Girona', 17: 'Sevilla', 18: 'Levante', 19: 'Elche', 20: 'Real Oviedo' };
const FR = { 1: 'Paris Saint-Germain', 2: 'Marseille', 3: 'Monaco', 4: 'Nice', 5: 'Lille', 6: 'Lyon', 7: 'Strasbourg', 8: 'Lens', 9: 'Brest', 10: 'Toulouse', 11: 'Auxerre', 12: 'Rennes', 13: 'Nantes', 14: 'Angers', 15: 'Le Havre', 16: 'Lorient', 17: 'Paris FC', 18: 'Metz' };
const PT = { 1: 'Sporting CP', 2: 'Benfica', 3: 'Porto', 4: 'Braga', 6: 'Vitória SC' };

// Nome de exibicao dos clubes NOVOS: o nome do ficheiro sem siglas juridicas, anos e exonimos alemaes; `ALIAS` corrige o que sobrar (chave: nome do ficheiro).
const EXONIMOS = { Neapel: 'Napoli', Mailand: 'Milan', Rom: 'Roma', Turin: 'Torino', Florenz: 'Fiorentina', Genua: 'Genoa', Lissabon: 'Lisbon', Nizza: 'Nice', Straßburg: 'Strasbourg', Teneriffa: 'Tenerife', Saragossa: 'Zaragoza' };
const SIGLAS = new Set(['FC', 'AC', 'US', 'SS', 'SSC', 'AS', 'SV', 'SC', 'CD', 'UD', 'SD', 'AD', 'CF', 'RC', 'RCD', 'UC', 'LR', 'SG', 'DSC', 'SpVgg', 'VfL', 'TSV', 'EA', 'SAD', 'Calcio', 'Futebol', 'GD', 'CS', 'CF', 'FK', 'AVS', 'ESTAC', 'USL', 'SM']);
const ALIAS = {
    'SV 07 Elversberg': 'Elversberg', 'Sampdoria Genua': 'Sampdoria', 'Delfino Pescara 1936': 'Pescara', 'Karlsruher SC': 'Karlsruher SC', 'Racing Club Ferrol': 'Racing Ferrol', 'AVS Futebol SAD': 'AVS',
    'Stade Reims': 'Reims', 'Stade Laval': 'Laval', 'ES Troyes AC': 'Troyes', 'Rodez AF': 'Rodez', 'Montpellier HSC': 'Montpellier', 'AS Nancy-Lorraine': 'Nancy', 'Grenoble Foot 38': 'Grenoble', 'Clermont Foot 63': 'Clermont'
};
const limpo = (nome) => {
    if (ALIAS[nome]) return ALIAS[nome];
    let p = nome.replace(/\b(1[89]\d\d|20\d\d)\b/g, '').replace(/\s+/g, ' ').trim().split(' ');
    while (p.length > 1 && (SIGLAS.has(p[0]) || /^\d\.$/.test(p[0]))) p.shift();
    while (p.length > 1 && SIGLAS.has(p[p.length - 1])) p.pop();
    return p.map(w => EXONIMOS[w] || w).join(' ').trim();
};

const PAISES = [
    { file: 27, id: '68', nome: 'Italia', top: IT, liga1: 'ita_seriea', liga2: { id: 'ita_serieb', name: 'Serie B', promoted: 3, relegated: 0 }, rebaixadosTop: 3 },
    { file: 21, id: '67', nome: 'Alemanha', top: DE, liga1: 'ger_bundesliga', liga2: { id: 'ger_2bundesliga', name: '2. Bundesliga', promoted: 2, relegated: 0 }, rebaixadosTop: 2 },
    { file: 45, id: '66', nome: 'Espanha', top: ES, liga1: 'esp_laliga', liga2: { id: 'esp_segunda', name: 'LaLiga Hypermotion', promoted: 3, relegated: 0 }, rebaixadosTop: 3 },
    { file: 18, id: '69', nome: 'Franca', top: FR, liga1: 'fra_ligue1', liga2: { id: 'fra_ligue2', name: 'Ligue 2', promoted: 2, relegated: 0 }, rebaixadosTop: 2 },
    { file: 38, id: '81', nome: 'Portugal', top: PT, liga1: 'por_liga', liga1Nome: 'Primeira Liga', liga1Antiga: 'por_clubes', liga2: { id: 'por_liga2', name: 'Liga Portugal 2', promoted: 2, relegated: 0 }, rebaixadosTop: 2 }
];

const dbTxt = fs.readFileSync(dbPath, 'utf8');
const lerLista = (nome) => {
    const i = dbTxt.indexOf('export const ' + nome);
    if (i < 0) throw new Error('nao achei ' + nome);
    const a = dbTxt.indexOf('= [', i) + 2, b = dbTxt.indexOf('\n];', a) + 2;
    return eval(dbTxt.slice(a, b));
};
let countries = lerLista('REAL_COUNTRIES_JSON');
let teams = lerLista('REAL_TEAMS_JSON');
const players = lerLista('REAL_PLAYERS_JSON');

const LIGAS_NOVAS = PAISES.map(p => p.liga2.id).concat(['por_liga']);
const criadoPeloScript = new Set();   // ids de clubes criados numa corrida anterior (marcados por `criadoPor`)
const jaTem = teams.some(t => t.criadoPor === 'gerar_ligas_paises') || countries.some(c => c.leagues.some(l => LIGAS_NOVAS.includes(l.id)));
if (jaTem && !dry && !force) { console.error('Ja ha ligas criadas por este script na base (talvez editadas). Use --force para refazer, ou --dry.'); process.exit(1); }
if (jaTem) {
    teams = teams.filter(t => t.criadoPor !== 'gerar_ligas_paises');
    for (const c of countries) c.leagues = c.leagues.filter(l => !LIGAS_NOVAS.includes(l.id));
}

const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const PALETA = ['R', 'B', 'N', 'G', 'Y', 'O', 'M', 'V', 'LB', 'K', 'W', 'SK'];
const claro = (hex) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 150; };
const kit = (pat, c1, c2, nCor) => ({ pattern: pat, color1: c1, color2: c2 || '', color3: '', numberColor: nCor, numberOutlineColor: '', collarColor: c2 || (claro(c1) ? '#111111' : '#ffffff'), sleeveColor: '' });
const sigla = (n) => { const p = n.split(/\s+/); return (p.length > 1 ? p.map(x => x[0]).join('') + p[0].slice(1) : p[0]).replace(/[^A-Za-zÀ-ÿ]/g, '').slice(0, 3).toUpperCase(); };
const capital = { 1: 10000000, 2: 4500000 };
const datas = (n) => { const rounds = 2 * (n - 1), passos = rounds * 4.67 + 105 < 360 ? [4, 6, 4, 4, 6] : [3, 4, 4]; const out = []; let d = 105; for (let r = 0; r < rounds; r++) { out.push(d); d += passos[r % passos.length]; } return out; };

const nomesUsados = new Set(teams.map(t => t.teamName));
const relatorio = [], novosClubes = [], escrever = [];
for (const pais of PAISES) {
    const f = path.join(raiz, 'local-data', `CountryData${pais.file}.json`);
    if (!fs.existsSync(f)) { console.error('Falta', f); process.exit(1); }
    const dados = JSON.parse(fs.readFileSync(f, 'utf8'));
    const doPais = teams.filter(t => String(t.country) === pais.id);
    const porNome = new Map(doPais.map(t => [t.teamName, t]));
    let seq = Math.max(Number(pais.id) * 10000, ...doPais.map(t => t.teamID));
    const ids = { 1: [], 2: [] };
    for (const c of dados.clubs) {
        let clube;
        if (pais.top[c.id]) {
            clube = porNome.get(pais.top[c.id]);
            if (!clube) { console.error(`[${pais.nome}] clube existente nao encontrado na base: ${pais.top[c.id]}`); process.exit(1); }
        } else {
            const nome = limpo(c.name);
            if (nomesUsados.has(nome)) { console.error(`[${pais.nome}] NOME DE CLUBE REPETIDO (o jogo liga jogadores a clubes pelo nome): "${nome}" (ficheiro: ${c.name}). Ponha em ALIAS.`); process.exit(1); }
            nomesUsados.add(nome);
            const h = hashStr(nome), c1k = PALETA[h % PALETA.length], c2k = PALETA[(h >>> 5) % PALETA.length] === c1k ? 'W' : PALETA[(h >>> 5) % PALETA.length];
            const c1 = COR[c1k], c2 = COR[c2k], pat = ['s', 'v', 'h', 's'][(h >>> 9) % 4];
            const PADRAO = { s: 'solid', v: 'stripes', h: 'horizontal' };
            const cap = capital[c.tier] || 3000000;
            clube = {
                teamID: ++seq, teamName: nome, teamAbb: sigla(nome), color: c1, color2: c2, color3: '', teamCityName: nome, teamStadiumName: c.stadium, yearOfFoundation: c.founded || 0,
                initialCapital: cap, initialTransfer: Math.round(cap * 0.5), sponsorAmount: 0, fanBase: c.fanBase || 10000, avrAttendance: Math.round((c.fanBase || 10000) * 0.32),
                country: pais.id, criadoPor: 'gerar_ligas_paises',
                homeKit: kit(PADRAO[pat], c1, pat === 's' ? '' : c2, claro(c1) ? 'black' : 'white'),
                awayKit: kit('solid', claro(c1) ? c2 : '#ffffff', c1, claro(claro(c1) ? c2 : '#ffffff') ? 'black' : 'white'),
                thirdKit: kit('solid', '#111111', c1, 'white'),
                gkKit: kit('solid', ['#16a34a', '#ea580c', '#7c3aed', '#0ea5e9'][h % 4], '', 'white')
            };
            novosClubes.push(clube);
            teams.push(clube);
            relatorio.push(`${pais.nome} ${c.tier}: ${c.name} -> ${nome}`);
        }
        ids[c.tier].push(clube.teamID);
        c.gameTeamId = clube.teamID;
    }
    const pc = countries.find(x => String(x.id) === pais.id);
    if (!pc) { console.error('pais nao existe na base:', pais.id); process.exit(1); }
    if (pais.liga1Antiga) {
        // Portugal: a liga oculta de 5 clubes vira a Primeira Liga completa (id novo; o resto do jogo le a lista de ligas)
        pc.leagues = pc.leagues.filter(l => l.id !== pais.liga1Antiga);
        pc.leagues.unshift({ id: pais.liga1, name: pais.liga1Nome, tier: 1, teamIds: ids[1], promoted: 0, relegated: pais.rebaixadosTop, matchDates: datas(ids[1].length) });
    } else {
        const l1 = pc.leagues.find(l => l.id === pais.liga1);
        l1.teamIds = ids[1]; l1.matchDates = datas(ids[1].length); l1.relegated = pais.rebaixadosTop;
    }
    pc.leagues.push({ id: pais.liga2.id, name: pais.liga2.name, tier: 2, teamIds: ids[2], promoted: pais.liga2.promoted, relegated: pais.liga2.relegated, matchDates: datas(ids[2].length) });
    escrever.push([f, dados]);
    console.log(`${pais.nome}: 1.a ${ids[1].length} clubes, 2.a ${ids[2].length} clubes (${novosClubes.filter(c => String(c.country) === pais.id).length} novos)`);
    if (ids[1].length % 2 || ids[2].length % 2) { console.error('numero impar de clubes numa liga'); process.exit(1); }
}
if (dry) { console.log(relatorio.join('\n')); console.log('(--dry) nada foi gravado.'); process.exit(0); }

const out = '\n// Paste your full JSON content here in the respective arrays.\n\n' +
    'export const REAL_COUNTRIES_JSON: any[] = ' + JSON.stringify(countries, null, 2) + ';\n\n' +
    'export const REAL_TEAMS_JSON: any[] = ' + JSON.stringify(teams, null, 2) + ';\n\n' +
    'export const REAL_PLAYERS_JSON: any[] = ' + JSON.stringify(players, null, 2) + ';\n';
fs.writeFileSync(dbPath, out, 'utf8');
for (const [f, d] of escrever) fs.writeFileSync(f, JSON.stringify(d), 'utf8');
console.log('Gravado em textSim/realDatabase.ts (' + novosClubes.length + ' clubes novos) e gameTeamId nos CountryData<N>.json.');
