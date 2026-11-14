/*
CLUBES DOS ESTADUAIS QUE A BASE NAO TINHA (Carioca, Mineiro e Gaucho de 2026): entram na liga oculta do Brasil (`bra_clubes`) com nomes GENERICOS no padrao NOME-UF; o nome,
a sigla e o estadio reais vao so para o mod. Pedido: *"pode criar os 3. Ve quais disputam este ano e coloca no mod"*.

    node tools/gerar_clubes_estaduais.cjs --dry      mostra o que faria
    node tools/gerar_clubes_estaduais.cjs            grava (textSim/realDatabase.ts e, no mod, clubes.json e o gameTeamId no CountryData54.json)
    node tools/gerar_clubes_estaduais.cjs --force    refaz (tira os clubes que este script criou e volta a cria-los)

Os dados REAIS (nome, sigla, estadio e o id do clube no CountryData54.sav, quando o FIFA Manager o tem) vem do mod: <mod>/local-data/clubes_estaduais_2026.json,
[{ chave, nome, abreviatura, estadio, sav }] — nenhum nome real neste script (as chaves sao neutras: RJ1, MG1...). Com `sav`, o clube ganha os jogadores reais (dadosLocais.ts);
sem ele, o jogo gera o plantel. Escudos: python tools/extrair_escudos_fm.py 54 (so os que tem `sav`).
Ids: 452001 em diante (fora da faixa 451xxx do tools/gerar_clubes_brasil.cjs, que a apaga com --force). Cores e torcida: melhor-esforco, rever no Editor.
*/
const fs = require('fs');
const path = require('path');

const CRIADO_POR = 'gerar_clubes_estaduais';
const ID_BASE = 452000;
// chave neutra, UF, cidade, [cor1, cor2, padrao (s liso, v listras)], torcida
const CLUBES = [
  ['RJ1', 'RJ', 'Rio de Janeiro', ['#c8102e', '#ffffff', 'v'], 20000],
  ['MG1', 'MG', 'Patos de Minas', ['#facc15', '#111111', 's'], 12000],
  ['MG2', 'MG', 'Itabirito', ['#1d4ed8', '#ffffff', 's'], 3000],
  ['MG3', 'MG', 'Montes Claros', ['#111111', '#facc15', 's'], 3000],
  ['RS1', 'RS', 'Santa Cruz do Sul', ['#15803d', '#ffffff', 's'], 9000],
  ['RS2', 'RS', 'Capão da Canoa', ['#1e3a8a', '#facc15', 's'], 2000],
  ['RS3', 'RS', 'Santa Maria', ['#c8102e', '#ffffff', 's'], 15000],
  ['RS4', 'RS', 'Novo Hamburgo', ['#1d4ed8', '#ffffff', 's'], 10000]
];
// Os nomes genericos (no estilo dos da base: "Jaguar Real-RJ", "Serra Azul Racing-RJ"): um prefixo e uma palavra da natureza do Brasil.
const PREF = ['Atlético', 'Esporte Clube', 'Real', 'Racing', 'Unidos', 'Nacional', 'Olímpico', 'Associação', 'Recreativo', 'Sociedade Esportiva'];
const PAL = ['Ipê Amarelo', 'Sabiá', 'Carcará', 'Araucária', 'Jequitibá', 'Seriema', 'Buriti', 'Pequizeiro', 'Juriti', 'Aroeira', 'Piracema', 'Bem-te-vi', 'Jatobá', 'Coqueiral', 'Canarinho'];

const raiz = path.resolve(__dirname, '..');
const MOD = process.env.FM_MOD_DIR ? path.resolve(process.env.FM_MOD_DIR) : 'Z:\\FootManager3D\\mod';
const dbPath = path.join(raiz, 'textSim', 'realDatabase.ts');
const dry = process.argv.includes('--dry'), force = process.argv.includes('--force');

const dbTxt = fs.readFileSync(dbPath, 'utf8');
const iC = dbTxt.indexOf('export const REAL_COUNTRIES_JSON'), iT = dbTxt.indexOf('export const REAL_TEAMS_JSON'), iP = dbTxt.indexOf('export const REAL_PLAYERS_JSON');
const lista = (a, b) => eval(dbTxt.slice(dbTxt.indexOf('= [', a) + 2, dbTxt.lastIndexOf('];', b) + 1));
let countries = lista(iC, iT), teams = lista(iT, iP);
const NL = dbTxt.includes('\r\n') ? '\r\n' : '\n';
const bloco = (nome, x) => (`export const ${nome}: any[] = ` + JSON.stringify(x, null, 1) + ';\n\n').replace(/\n/g, NL);
if (bloco('REAL_COUNTRIES_JSON', countries) !== dbTxt.slice(iC, iT) || bloco('REAL_TEAMS_JSON', teams) !== dbTxt.slice(iT, iP)) { console.error('O formato de realDatabase.ts mudou: reveja a escrita deste script.'); process.exit(1); }

const brasil = countries.find(c => String(c.id) === '45');
const oculta = brasil && brasil.leagues.find(l => l.id === 'bra_clubes');
if (!oculta) { console.error('Falta a liga oculta bra_clubes'); process.exit(1); }
const jaTem = teams.some(t => t.criadoPor === CRIADO_POR);
if (jaTem && !dry && !force) { console.error('Os clubes deste script ja estao na base. Use --force para refazer, ou --dry.'); process.exit(1); }
const antigos = new Set(teams.filter(t => t.criadoPor === CRIADO_POR).map(t => Number(t.teamID)));
teams = teams.filter(t => t.criadoPor !== CRIADO_POR);
oculta.teamIds = oculta.teamIds.filter(id => !antigos.has(Number(id)));

// o mod: os dados reais por chave
const fReais = path.join(MOD, 'local-data', 'clubes_estaduais_2026.json');
if (!fs.existsSync(fReais)) { console.error('Falta ' + fReais); process.exit(1); }
const reais = new Map(JSON.parse(fs.readFileSync(fReais, 'utf8')).map(r => [r.chave, r]));
const nomesReais = new Set([...reais.values()].map(r => String(r.nome).toLowerCase().replace(/-[a-z]{2}$/, '')));

const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
const usados = new Set(teams.map(t => String(t.teamName).toLowerCase()));
const claro = (hex) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 150; };
const kit = (pat, c1, c2, nCor) => ({ pattern: pat, color1: c1, color2: c2 || '', color3: '', numberColor: nCor, numberOutlineColor: '', collarColor: c2 || (claro(c1) ? '#111111' : '#ffffff'), sleeveColor: '' });
const sigla = (n) => { const p = n.replace(/-[A-Z]{2}$/, '').split(/\s+/); return (p.length > 1 ? p.map(x => x[0]).join('') + p[1].slice(1) : p[0]).normalize('NFD').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase(); };

let modClubes = JSON.parse(fs.readFileSync(path.join(MOD, 'clubes.json'), 'utf8')).filter(c => !antigos.has(Number(c.id)));
const fDados = path.join(MOD, 'local-data', 'CountryData54.json');
const dados = JSON.parse(fs.readFileSync(fDados, 'utf8'));
for (const c of dados.clubs) if (antigos.has(Number(c.gameTeamId))) delete c.gameTeamId;

const novos = [], relatorio = [];
CLUBES.forEach(([chave, uf, cidade, [c1, c2, pat], fan], i) => {
  const r = reais.get(chave);
  if (!r) { console.error('Sem dados reais para ' + chave + ' em ' + fReais); process.exit(1); }
  let nome = null;
  for (let k = 0; k < 500 && !nome; k++) {
    const h = hash(chave + '|' + k), gen = `${PAL[(h >>> 4) % PAL.length]} ${PREF[(h >>> 12) % PREF.length]}-${uf}`;
    const low = gen.toLowerCase();
    if (usados.has(low) || nomesReais.has(low.replace(/-[a-z]{2}$/, ''))) continue;
    usados.add(low); nome = gen;
  }
  const id = ID_BASE + i + 1;
  const pal = nome.split(' ')[0];
  novos.push({
    teamID: id, teamName: nome, teamAbb: sigla(nome), color: c1, color2: c2, color3: '', teamCityName: cidade, teamStadiumName: 'Estádio ' + pal, yearOfFoundation: 0,
    initialCapital: 500000, initialTransfer: 250000, sponsorAmount: 0, fanBase: fan, avrAttendance: Math.round(fan * 0.25), country: '45', criadoPor: CRIADO_POR,
    homeKit: kit(pat === 'v' ? 'stripes' : 'solid', c1, pat === 'v' ? c2 : '', claro(c1) ? 'black' : 'white'),
    awayKit: kit('solid', claro(c1) ? c2 : '#ffffff', c1, claro(claro(c1) ? c2 : '#ffffff') ? 'black' : 'white'),
    thirdKit: kit('solid', '#111111', c1, 'white'),
    gkKit: kit('solid', ['#16a34a', '#ea580c', '#7c3aed', '#0ea5e9'][i % 4], '', 'white')
  });
  oculta.teamIds.push(id);
  modClubes.push({ id, nome: r.nome, abreviatura: r.abreviatura || sigla(r.nome), estadio: r.estadio || '', escudo: fs.existsSync(path.join(MOD, 'escudos', id + '.png')) ? id + '.png' : '' });
  if (r.sav) {
    const c = dados.clubs.find(x => Number(x.id) === Number(r.sav));
    if (!c) { console.error(`${chave}: o clube ${r.sav} nao esta no CountryData54.json do mod`); process.exit(1); }
    c.gameTeamId = id;
  }
  relatorio.push(`${chave}: ${r.nome} -> ${nome} (${id})${r.sav ? ' [jogadores reais: CountryData54 #' + r.sav + ']' : ''}`);
});
console.log(`${novos.length} clubes novos na liga oculta bra_clubes (${oculta.teamIds.length} clubes nela).`);
if (dry) { console.log(relatorio.join('\n')); console.log('(--dry) nada foi gravado.'); process.exit(0); }
fs.writeFileSync(dbPath, dbTxt.slice(0, iC) + bloco('REAL_COUNTRIES_JSON', countries) + bloco('REAL_TEAMS_JSON', teams.concat(novos)) + dbTxt.slice(iP), 'utf8');
fs.writeFileSync(path.join(MOD, 'clubes.json'), JSON.stringify(modClubes, null, 1), 'utf8');
fs.writeFileSync(fDados, JSON.stringify(dados), 'utf8');
fs.writeFileSync(path.join(MOD, 'local-data', 'relatorio_clubes_estaduais.txt'), relatorio.join('\n'), 'utf8');   // tem os nomes reais: fica no mod
console.log('Gravado: textSim/realDatabase.ts; no mod: clubes.json, gameTeamId no CountryData54.json e local-data/relatorio_clubes_estaduais.txt.');
