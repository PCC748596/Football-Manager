/*
LIGAS INGLESAS (Championship, League One, League Two) para o jogo + a Premier League 2025/26.

    node tools/gerar_ligas_inglaterra.cjs --dry     so mostra o que faria
    node tools/gerar_ligas_inglaterra.cjs           acrescenta clubes e ligas a textSim/realDatabase.ts e escreve `gameTeamId` em local-data/CountryData14.json
    node tools/gerar_ligas_inglaterra.cjs --force   refaz (APAGA os clubes ingleses acima de 650020 e as 3 ligas novas; os clubes de 650001-650020 ficam)

PRECISA de local-data/CountryData14.json (tools/parse_countrydata.py ... --country 14 --max-tier 4): so le dele os CLUBES (nome, estadio, fundacao, torcida, divisao) — nenhum jogador entra
na base. Os jogadores reais carregam-se em jogo por textSim/dadosLocais.ts (nunca gravados); os clubes novos ficam sem jogadores na base e o jogo gera os tapa-buracos (nomes ingleses).

O QUE FAZ
- Premier League passa a ser a de 2025/26: sai Ipswich, Leicester e Southampton (vao para a Championship) e entram Leeds, Burnley e Sunderland (clubes novos).
- Championship (24), League One (24) e League Two (24): clubes novos com id 650021 em diante (os 3 rebaixados mantem o id antigo), liga com calendario (46 jornadas) e tier 2, 3 e 4.
- Cores e padroes: melhor-esforco (revisar no Editor). Cidade: o nome do clube sem o sufixo (United, City...). Capital e torcida: capital por divisao, torcida do ficheiro.
Ids: clubes = 65 x 10000 + n.
*/
const fs = require('fs');
const path = require('path');
const { COR } = require('./europa/clubes.cjs');

const raiz = path.resolve(__dirname, '..');
const dbPath = path.join(raiz, 'textSim', 'realDatabase.ts');
const dadosPath = path.join(raiz, 'local-data', 'CountryData14.json');
const dry = process.argv.includes('--dry'), force = process.argv.includes('--force');
if (!fs.existsSync(dadosPath)) { console.error('Falta local-data/CountryData14.json (tools/parse_countrydata.py docs/CountryData14.sav local-data/CountryData14.json --game --country 14 --max-tier 4)'); process.exit(1); }
const dados = JSON.parse(fs.readFileSync(dadosPath, 'utf8'));

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

const PAIS = '65', ID_PRIMEIRO_NOVO = 650021;
const inglaterra = countries.find(c => String(c.id) === PAIS);
const novos = (t) => String(t.country) === PAIS && t.teamID >= ID_PRIMEIRO_NOVO;
const LIGAS_NOVAS = ['eng_champ', 'eng_l1', 'eng_l2'];
const jaTem = teams.some(novos) || inglaterra.leagues.some(l => LIGAS_NOVAS.includes(l.id));
if (jaTem && !dry && !force) { console.error('Ja ha ligas inglesas novas na base (talvez editadas). Use --force para refazer (apaga o que editou nelas), ou --dry.'); process.exit(1); }
if (jaTem) {
    teams = teams.filter(t => !novos(t));
    inglaterra.leagues = inglaterra.leagues.filter(l => !LIGAS_NOVAS.includes(l.id));
}

// Os 20 clubes que o jogo ja tinha (Premier 2024/25): id do ficheiro -> nome na base.
const EXISTENTES = { 1: 'Liverpool', 2: 'Arsenal', 3: 'Man City', 4: 'Chelsea', 5: 'Newcastle', 6: 'Aston Villa', 7: 'Nottingham Forest', 8: 'Brighton', 9: 'Bournemouth', 10: 'Brentford',
    11: 'Fulham', 12: 'Crystal Palace', 13: 'Everton', 14: 'West Ham', 15: 'Man Utd', 16: 'Wolves', 17: 'Tottenham', 21: 'Leicester', 22: 'Ipswich', 23: 'Southampton' };

// [cor1, cor2, padrao] por id do ficheiro (clubes novos). R vermelho, W branco, K preto, B azul, LB azul-claro, N marinho, Y amarelo, G verde, O laranja, M grena, SK azul-ceu; s liso, v listras, h horizontais.
const CORES = {
    18: ['W', 'B', 's'], 19: ['M', 'SK', 's'], 20: ['R', 'W', 'v'], 24: ['R', 'W', 'v'], 25: ['SK', 'W', 's'], 26: ['R', 'W', 's'], 27: ['B', 'W', 'v'], 28: ['N', 'W', 's'], 29: ['N', 'W', 'v'], 30: ['R', 'W', 's'],
    31: ['W', 'K', 's'], 32: ['B', 'W', 'v'], 33: ['Y', 'G', 's'], 34: ['Y', 'K', 's'], 35: ['B', 'W', 'h'], 36: ['B', 'W', 's'], 37: ['Y', 'N', 's'], 38: ['R', 'W', 'v'], 39: ['W', 'K', 's'], 40: ['W', 'N', 's'],
    41: ['O', 'K', 'v'], 42: ['B', 'W', 's'], 43: ['R', 'W', 's'], 44: ['R', 'W', 's'], 45: ['O', 'N', 's'], 46: ['B', 'W', 's'], 47: ['G', 'W', 's'], 48: ['B', 'W', 's'], 49: ['LB', 'N', 's'], 50: ['R', 'W', 's'],
    51: ['B', 'W', 'h'], 52: ['W', 'N', 's'], 53: ['O', 'W', 's'], 54: ['B', 'W', 'v'], 55: ['R', 'W', 'v'], 56: ['R', 'W', 's'], 57: ['R', 'W', 's'], 58: ['R', 'W', 's'], 59: ['B', 'W', 's'], 60: ['R', 'W', 'v'],
    61: ['Y', 'B', 's'], 62: ['B', 'W', 's'], 63: ['M', 'W', 's'], 64: ['Y', 'K', 's'], 65: ['R', 'W', 'h'], 66: ['W', 'K', 's'], 67: ['M', 'Y', 'v'], 68: ['B', 'Y', 's'], 69: ['R', 'W', 's'], 70: ['B', 'W', 'h'],
    71: ['Y', 'K', 's'], 72: ['B', 'Y', 's'], 73: ['R', 'W', 's'], 74: ['K', 'W', 'v'], 75: ['B', 'W', 's'], 76: ['R', 'W', 's'], 77: ['K', 'W', 'v'], 78: ['B', 'W', 'v'], 79: ['W', 'K', 's'], 80: ['R', 'W', 's'],
    81: ['R', 'W', 's'], 82: ['R', 'W', 's'], 83: ['R', 'W', 's'], 84: ['B', 'W', 's'], 85: ['B', 'W', 's'], 86: ['Y', 'K', 's'], 87: ['W', 'R', 's'], 88: ['W', 'B', 's'], 89: ['R', 'W', 's'], 90: ['Y', 'K', 's'],
    91: ['O', 'K', 's'], 92: ['B', 'W', 's']
};
const PADRAO = { s: 'solid', v: 'stripes', h: 'horizontal' };
const claro = (hex) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 150; };
const kit = (pat, c1, c2, nCor) => ({ pattern: pat, color1: c1, color2: c2 || '', color3: '', numberColor: nCor, numberOutlineColor: '', collarColor: c2 || (claro(c1) ? '#111111' : '#ffffff'), sleeveColor: '' });

const nomeLimpo = (n) => n.replace(/\s+(AFC|FC)$/, '').trim();
const cidadeDe = (n) => nomeLimpo(n).replace(/\s+(United|City|Town|Rovers|Wanderers|Athletic|Albion|County|Argyle|Orient|Alexandra|Stanley|Dons|Wednesday|Hotspur|Park Rangers)$/, '').replace(/^AFC\s+/, '');
const sigla = (n) => { const p = nomeLimpo(n).replace(/^AFC\s+/, '').split(/\s+/); return (p.length > 1 ? p.map(x => x[0]).join('') + p[0].slice(1) : p[0]).slice(0, 3).toUpperCase(); };
const capitalDaDivisao = { 1: 10000000, 2: 6000000, 3: 3500000, 4: 2000000 };

const porNome = new Map(teams.filter(t => String(t.country) === PAIS).map(t => [t.teamName, t]));
const nomesUsados = new Set(teams.map(t => t.teamName));
let seq = ID_PRIMEIRO_NOVO - 1;
const ids = { 1: [], 2: [], 3: [], 4: [] }, novosClubes = [];
for (const c of dados.clubs) {
    let clube;
    if (EXISTENTES[c.id]) {
        clube = porNome.get(EXISTENTES[c.id]);
        if (!clube) { console.error('clube existente nao encontrado na base:', EXISTENTES[c.id]); process.exit(1); }
    } else {
        const cor = CORES[c.id] || ['GR', 'W', 's'];
        const nome = nomeLimpo(c.name);
        if (nomesUsados.has(nome)) { console.error('NOME DE CLUBE REPETIDO (o jogo liga jogadores a clubes pelo nome):', nome); process.exit(1); }
        nomesUsados.add(nome);
        const c1 = COR[cor[0]], c2 = COR[cor[1]], pat = cor[2];
        clube = {
            teamID: ++seq, teamName: nome, teamAbb: sigla(c.name), color: c1, color2: c2, color3: '', teamCityName: cidadeDe(c.name), teamStadiumName: c.stadium, yearOfFoundation: c.founded || 0,
            initialCapital: capitalDaDivisao[c.tier], initialTransfer: Math.round(capitalDaDivisao[c.tier] * 0.5), sponsorAmount: 0, fanBase: c.fanBase || 10000, avrAttendance: Math.round((c.fanBase || 10000) * 0.32),
            country: PAIS,
            homeKit: kit(PADRAO[pat], c1, pat === 's' ? '' : c2, claro(c1) ? 'black' : 'white'),
            awayKit: kit(pat === 's' ? 'solid' : PADRAO[pat], claro(c1) ? c2 : '#ffffff', c1, claro(claro(c1) ? c2 : '#ffffff') ? 'black' : 'white'),
            thirdKit: kit('solid', '#111111', c1, 'white'),
            gkKit: kit('solid', ['#16a34a', '#ea580c', '#7c3aed', '#0ea5e9'][c.id % 4], '', 'white')
        };
        novosClubes.push(clube);
    }
    ids[c.tier].push(clube.teamID);
    c.gameTeamId = clube.teamID;
}

const datas = (n) => { const rounds = 2 * (n - 1), passos = rounds * 4.67 + 105 < 360 ? [4, 6, 4, 4, 6] : [3, 4, 4]; const out = []; let d = 105; for (let r = 0; r < rounds; r++) { out.push(d); d += passos[r % passos.length]; } return out; };
const prem = inglaterra.leagues.find(l => l.id === 'eng_prem');
prem.teamIds = ids[1]; prem.matchDates = datas(ids[1].length); prem.relegated = 3; prem.promoted = 0;
const novasLigas = [
    { id: 'eng_champ', name: 'Championship', tier: 2, teamIds: ids[2], promoted: 3, relegated: 3, matchDates: datas(ids[2].length) },
    { id: 'eng_l1', name: 'League One', tier: 3, teamIds: ids[3], promoted: 3, relegated: 4, matchDates: datas(ids[3].length) },
    { id: 'eng_l2', name: 'League Two', tier: 4, teamIds: ids[4], promoted: 3, relegated: 0, matchDates: datas(ids[4].length) }
];
inglaterra.leagues.push(...novasLigas);

for (const [t, l] of Object.entries(ids)) console.log('divisao', t, ':', l.length, 'clubes');
console.log('clubes novos:', novosClubes.length, '| ids', novosClubes[0]?.teamID, '-', novosClubes[novosClubes.length - 1]?.teamID);
if (Object.values(ids).some((l, i) => l.length !== (i === 0 ? 20 : 24))) { console.error('numero de clubes por divisao invalido'); process.exit(1); }
if (dry) { console.log('(--dry) nada foi gravado.'); process.exit(0); }

const out = '\n// Paste your full JSON content here in the respective arrays.\n\n' +
    'export const REAL_COUNTRIES_JSON: any[] = ' + JSON.stringify(countries, null, 2) + ';\n\n' +
    'export const REAL_TEAMS_JSON: any[] = ' + JSON.stringify(teams.concat(novosClubes), null, 2) + ';\n\n' +
    'export const REAL_PLAYERS_JSON: any[] = ' + JSON.stringify(players, null, 2) + ';\n';
fs.writeFileSync(dbPath, out, 'utf8');
fs.writeFileSync(dadosPath, JSON.stringify(dados), 'utf8');
console.log('Gravado em textSim/realDatabase.ts e gameTeamId em local-data/CountryData14.json.');
