/*
LIGAS DO MEXICO, DOS EUA E DO JAPAO, a partir dos CountryData<N>.json do mod (local-data/, feitos por tools/parse_countrydata.py ... --game --country N --max-tier T):
Mexico = 83 (1.a e 2.a divisao), EUA = 95 (1.a e 2.a), Japao = 163 (1.a, 2.a e 3.a).

    node tools/gerar_ligas_mex_usa_jpn.cjs --dry      mostra o que faria; nao grava nada
    node tools/gerar_ligas_mex_usa_jpn.cjs            cria os 3 paises, as ligas e os clubes (GENERICOS) em textSim/realDatabase.ts e os nomes reais no mod
    node tools/gerar_ligas_mex_usa_jpn.cjs --force    refaz (APAGA os paises e clubes que este script criou — incluindo o que editou no Editor neles)

A pasta do mod: FM_MOD_DIR ou, por omissao, Z:\FootManager3D\mod. O que vai para onde:
- JOGO (textSim/realDatabase.ts, vai para a Steam): paises, ligas e clubes com nomes, siglas e estadios GERADOS (nomes inventados na lingua do pais; nunca o nome real). Os numeros (torcida,
  fundacao) e as cores do equipamento saem do ficheiro. Nenhum jogador entra na base: o jogo gera o plantel; com o mod, os reais entram por textSim/dadosLocais.ts.
  Tambem textSim/nomesPaises.ts (nomes comuns para os jogadores gerados: tools/americas_asia/nomes.cjs).
- MOD (so na pasta do mod): clubes.json (nome, sigla e estadio reais pelo id do clube), competicoes.json (o nome real das ligas) e `gameTeamId` nos CountryData<N>.json.
O nome real das ligas vem do proprio ficheiro .sav (as primeiras linhas), sem o patrocinador. Nenhum nome real fica neste script.

Formato: pontos corridos, turno e returno. Mexico e EUA sao ligas fechadas (ninguem sobe nem desce); no Japao descem 3 da J1 e da J2 e sobem 3 da J2 e da J3.
Ids: pais 90 (Mexico), 91 (EUA), 92 (Japao); clubes = id do pais x 10000 + n.
*/
const fs = require('fs');
const path = require('path');
const { NOMES } = require('./americas_asia/nomes.cjs');

const raiz = path.resolve(__dirname, '..');
const MOD = process.env.FM_MOD_DIR ? path.resolve(process.env.FM_MOD_DIR) : 'Z:\\FootManager3D\\mod';
const SAV = process.env.FM_SAV_DIR ? path.resolve(process.env.FM_SAV_DIR) : 'Z:\\Games\\Fifa Manager 26\\database\\data';
const dbPath = path.join(raiz, 'textSim', 'realDatabase.ts');
const nomesPath = path.join(raiz, 'textSim', 'nomesPaises.ts');
const dry = process.argv.includes('--dry'), force = process.argv.includes('--force');
const CRIADO_POR = 'gerar_ligas_mex_usa_jpn';

// ligas: [id, tier, promoted, relegated]; o nome generico e "<ordinal> Division (<pais>)" como nas outras ligas da base.
const PAISES = [
  { file: 83, id: '90', nome: 'Mexico', continente: 'North America', lingua: 'es', sigla: 'MEX', ligas: [['mex_liga_mx', 1, 0, 0], ['mex_expansion', 2, 0, 0]], capital: { 1: 9e6, 2: 2.5e6 } },
  { file: 95, id: '91', nome: 'USA', continente: 'North America', lingua: 'en', sigla: 'USA', ligas: [['usa_mls', 1, 0, 0], ['usa_usl', 2, 0, 0]], capital: { 1: 10e6, 2: 2.5e6 } },
  { file: 163, id: '92', nome: 'Japan', continente: 'Asia', lingua: 'ja', sigla: 'JPN', ligas: [['jpn_j1', 1, 0, 3], ['jpn_j2', 2, 3, 3], ['jpn_j3', 3, 3, 0]], capital: { 1: 7e6, 2: 3e6, 3: 1.5e6 } }
];
const ORDINAL = { 1: 'First', 2: 'Second', 3: 'Third' };
// Palavras de patrocinador tiradas do nome real das ligas.
const PATROCINIO = /\b(BBVA|Meiji Yasuda)\s+/g;

// ---------------------------------------------------------------- nomes genericos dos clubes (os mesmos padroes de tools/gerar_dados_genericos.ts; ja = novo)
const LISTAS = {
  es: {
    pref: ['Atlético', 'Deportivo', 'Real', 'Club Deportivo', 'Sporting', 'Unión', 'Racing', 'Club Atlético', 'Independiente', 'Nacional', 'Juventud'],
    pal: ['Aurora', 'Horizonte', 'Cometa', 'Mirador', 'Cascada', 'Jacaranda', 'Quetzal', 'Cóndor', 'Valle Verde', 'Sierra Azul', 'Laguna Dorada', 'Altiplano', 'Cerrito', 'Ceibo', 'Algarrobo',
      'Puma', 'Jaguar', 'Colibrí', 'Cordillera', 'Frontera', 'Bahía Clara', 'Monte Alto', 'Río Manso', 'Campo Bello', 'Costa Blanca', 'Amanecer', 'Tormenta', 'Relámpago', 'Estrella Polar', 'Halcón', 'Pioneros',
      'Guerreros', 'Esperanza', 'Tradición', 'Imperial', 'Montañés', 'Costeño', 'Norteño', 'Sureño', 'Pacífico', 'Nopal', 'Maguey', 'Ahuehuete', 'Xólotl', 'Coyote', 'Tecolote', 'Cenote', 'Volcán',
      'Obsidiana', 'Jade', 'Mezquite', 'Sol de Oro', 'Cañada', 'Altamira', 'Ocelote', 'Huracán', 'Peñasco', 'Malinche Verde'],
    est: p => 'Estadio ' + p
  },
  en: {
    pref: ['United', 'City', 'Athletic', 'Rovers', 'Town', 'Wanderers', 'Rangers', 'County', 'Olympic', 'Royal', 'Union', 'SC', 'FC'],
    pal: ['Ashford', 'Brookfield', 'Cresthill', 'Dunmore', 'Eastvale', 'Fairhaven', 'Glenwood', 'Highmoor', 'Ironbridge', 'Kingsmere', 'Lakeside', 'Millbrook', 'Northgate', 'Oakridge', 'Pinecroft',
      'Riverbend', 'Stonebridge', 'Thornbury', 'Westfield', 'Yarrow', 'Beacon Hill', 'Copperfield', 'Dalewood', 'Elmstead', 'Foxbury', 'Greystone', 'Ivybridge', 'Juniper', 'Kestrel', 'Larkspur',
      'Meadowbank', 'Orchard Park', 'Pennington', 'Ravenscar', 'Silverdale', 'Valemoor', 'Redwood', 'Prairie', 'Bayou', 'Mesa Verde', 'Granite Peak', 'Lone Pine', 'Cedar Falls', 'Blue Ridge',
      'Thunder Bay', 'Sierra Vista', 'Coral Coast', 'Iron Valley', 'Maple Grove', 'Bison', 'Golden Plains', 'Harbor Point', 'Cypress', 'Timberline', 'Desert Sky', 'Riverside Park'],
    est: p => p + ' Park'
  },
  ja: {
    pref: ['FC', 'SC', 'United', 'Athletic', 'Sports Club', 'City'],
    pal: ['Hayate', 'Akatsuki', 'Aozora', 'Harukaze', 'Yukikaze', 'Shiokaze', 'Inazuma', 'Homura', 'Tsurugi', 'Hibari', 'Uguisu', 'Tsubame', 'Kamome', 'Shirasagi', 'Kujaku', 'Hotaru', 'Kohaku',
      'Ruri', 'Seiran', 'Tomoe', 'Momiji', 'Minato', 'Shinonome', 'Sazanami', 'Tsukikage', 'Yamabiko', 'Kitsune', 'Tanuki', 'Hanabi', 'Midori', 'Akane', 'Kagami', 'Asagiri', 'Yuzuki', 'Kazahana',
      'Hoshizora', 'Murasaki', 'Shiranami', 'Kurenai', 'Kumotori', 'Hanazono', 'Mizuho', 'Takane', 'Fuyuzora', 'Natsukaze', 'Senbazuru', 'Matsukaze', 'Wakaba', 'Ginga', 'Amagumo', 'Iwanami',
      'Kawasemi', 'Mejiro', 'Hayabusa', 'Torii', 'Shigure', 'Kogane', 'Sakimori', 'Yatagarasu', 'Tenryu'],
    est: p => p + ' Stadium'
  }
};
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
const semZW = (s) => String(s || '').replace(/[\u200b-\u200d\ufeff]/g, '').trim();
const sigla = (n) => { const p = n.split(/\s+/).filter(x => !['FC', 'SC', 'CF', 'CD', 'Club', 'de', 'del'].includes(x)); const q = p.length ? p : n.split(/\s+/);
  return (q.length > 1 ? q.map(x => x[0]).join('') + q[0].slice(1) : q[0]).normalize('NFD').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase(); };

// ---------------------------------------------------------------- cores: o indice da paleta do ficheiro (%INDEX%KIT) -> cor (calibrada contra os clubes que ja tinham cor na base)
const PALETA = {
  0: '#111111', 1: '#15803d', 2: '#6cb4ee', 3: '#facc15', 5: '#87ceeb', 6: '#f9a8d4', 7: '#ffffff', 8: '#c8102e', 10: '#1d4ed8', 11: '#facc15', 13: '#6cb4ee', 14: '#c8102e', 15: '#111111',
  16: '#c8102e', 17: '#15803d', 18: '#1d4ed8', 19: '#facc15', 22: '#1d4ed8', 23: '#6cb4ee', 24: '#c8102e', 25: '#15803d', 26: '#1d4ed8', 27: '#e9af2b', 29: '#16a34a', 30: '#1d4ed8', 31: '#ea580c',
  32: '#c8102e', 33: '#15803d', 34: '#1d4ed8', 35: '#ea580c', 36: '#c8102e', 37: '#15803d', 40: '#c8102e', 42: '#1d4ed8', 43: '#ea580c', 45: '#15803d', 46: '#6d28d9', 47: '#111111', 48: '#7f1d1d',
  49: '#1d4ed8', 50: '#9ca3af', 51: '#ea580c', 53: '#facc15', 54: '#c8102e', 55: '#1e3a8a', 56: '#7f1d1d', 57: '#c8102e', 58: '#1e40af', 60: '#8791d4', 61: '#d4a017', 62: '#6d28d9', 63: '#111111'
};
const RESERVA = ['#c8102e', '#1d4ed8', '#15803d', '#facc15', '#111111', '#ea580c', '#6d28d9', '#6cb4ee'];
const cor = (i, h) => PALETA[i] || RESERVA[h % RESERVA.length];
const claro = (hex) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 150; };
const kit = (pat, c1, c2, nCor) => ({ pattern: pat, color1: c1, color2: c2 || '', color3: '', numberColor: nCor, numberOutlineColor: '', collarColor: c2 || (claro(c1) ? '#111111' : '#ffffff'), sleeveColor: '' });

/** As linhas %INDEX%KIT de cada clube do .sav: { idDoClube: [linhas] }. */
const kitsDoSav = (file) => {
  const f = path.join(SAV, `CountryData${file}.sav`);
  if (!fs.existsSync(f)) { console.warn(`(sem ${f}: cores sorteadas pelo nome)`); return { kits: {}, ligas: [] }; }
  const L = fs.readFileSync(f, 'utf8').replace(/^\ufeff/, '').split('\n').map(l => l.replace(/\r$/, ''));
  const kits = {};
  for (let i = 0; i < L.length; i++) {
    const m = L[i].match(/^%INDEX%CLUB(\d+)$/);
    if (!m || m[1] === '65535') continue;
    let k = i; while (k < L.length && L[k] !== '%INDEX%KIT') k++;
    kits[m[1]] = L.slice(k + 1, k + 13); i = k;
  }
  // Nomes das divisoes: as linhas entre aspas logo apos o cabecalho do pais (uma por divisao, na ordem).
  const ligas = [];
  for (let i = 0; i < 40 && ligas.length < 6; i++) if (L[i].startsWith('"')) ligas.push(L[i].match(/^"([^"]*)"/)[1]);
  return { kits, ligas };
};
/** Cores e equipamentos de um clube a partir das linhas do KIT (casa: linha 2; fora: linha 8). */
const coresDoClube = (linhas, h) => {
  const casa = (linhas && linhas[2] || '').split(',').map(Number), fora = (linhas && linhas[8] || '').split(',').map(Number);
  const c1 = cor(casa[0], h), c2i = casa.find(x => x !== casa[0]);
  const c2 = c2i !== undefined ? cor(c2i, h >>> 3) : (claro(c1) ? '#111111' : '#ffffff');
  const f1 = fora.length && !isNaN(fora[0]) ? cor(fora[0], h >>> 5) : (claro(c1) ? c2 : '#ffffff');
  const f1b = f1 === c1 ? (claro(c1) ? '#111111' : '#ffffff') : f1;
  return {
    color: c1, color2: c2,
    homeKit: kit('solid', c1, c2, claro(c1) ? 'black' : 'white'),
    awayKit: kit('solid', f1b, c1, claro(f1b) ? 'black' : 'white'),
    thirdKit: kit('solid', '#111111', c1, 'white'),
    gkKit: kit('solid', ['#16a34a', '#ea580c', '#7c3aed', '#0ea5e9'][h % 4], '', 'white')
  };
};

// ---------------------------------------------------------------- a base
const dbTxt = fs.readFileSync(dbPath, 'utf8');
const iC = dbTxt.indexOf('export const REAL_COUNTRIES_JSON'), iT = dbTxt.indexOf('export const REAL_TEAMS_JSON'), iP = dbTxt.indexOf('export const REAL_PLAYERS_JSON');
if (iC < 0 || iT < 0 || iP < 0) { console.error('realDatabase.ts sem as 3 listas'); process.exit(1); }
const lista = (a, b) => eval(dbTxt.slice(dbTxt.indexOf('= [', a) + 2, dbTxt.lastIndexOf('];', b) + 1));
let countries = lista(iC, iT), teams = lista(iT, iP);
const NL = dbTxt.includes('\r\n') ? '\r\n' : '\n';
const bloco = (nome, x) => (`export const ${nome}: any[] = ` + JSON.stringify(x, null, 1) + ';\n\n').replace(/\n/g, NL);
if (bloco('REAL_COUNTRIES_JSON', countries) !== dbTxt.slice(iC, iT) || bloco('REAL_TEAMS_JSON', teams) !== dbTxt.slice(iT, iP)) { console.error('O formato de realDatabase.ts mudou: reveja a escrita deste script.'); process.exit(1); }

const IDS = PAISES.map(p => p.id);
const jaTem = countries.some(c => IDS.includes(String(c.id))) || teams.some(t => t.criadoPor === CRIADO_POR);
if (jaTem && !dry && !force) { console.error('Mexico/EUA/Japao ja estao na base (talvez editados). Use --force para refazer, ou --dry.'); process.exit(1); }
if (jaTem) { countries = countries.filter(c => !IDS.includes(String(c.id))); teams = teams.filter(t => t.criadoPor !== CRIADO_POR && !IDS.includes(String(t.country))); }

// O mod
const lerMod = (n, def) => { const f = path.join(MOD, n); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : def; };
let modClubes = lerMod('clubes.json', []), modComp = lerMod('competicoes.json', []);
const idsDosPaises = (id) => Number(id) >= 900000 && Number(id) < 930000;
modClubes = modClubes.filter(c => !idsDosPaises(c.id));
const LIGAS_IDS = PAISES.flatMap(p => p.ligas.map(l => l[0]));
modComp = modComp.filter(c => !LIGAS_IDS.includes(c.id));

const datas = (n) => { const rounds = 2 * (n - 1), passos = rounds * 4.67 + 105 < 360 ? [4, 6, 4, 4, 6] : [3, 4, 4]; const out = []; let d = 105; for (let r = 0; r < rounds; r++) { out.push(d); d += passos[r % passos.length]; } return out; };
// Nomes reais (de todos os ficheiros) e os ja usados na base: um nome generico nunca coincide com eles.
const reais = new Set();
const usados = new Set(teams.map(t => String(t.teamName).toLowerCase()));
const estadiosReais = new Set();
const dadosDe = {};
for (const p of PAISES) {
  const f = path.join(MOD, 'local-data', `CountryData${p.file}.json`);
  if (!fs.existsSync(f)) { console.error('Falta', f, '(corra tools/parse_countrydata.py --game primeiro)'); process.exit(1); }
  dadosDe[p.file] = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const c of dadosDe[p.file].clubs) { reais.add(semZW(c.name).toLowerCase()); reais.add(semZW(c.shortName).toLowerCase()); estadiosReais.add(semZW(c.stadium).toLowerCase()); }
}
const palavrasReais = new Set([...reais].flatMap(n => n.split(/\s+/)).filter(w => w.length > 3));
// Ordem do nome: `antes` = os prefixos que vao a frente da palavra ("FC Hayate", "Atlético Cóndor"); os outros vao depois ("Hayate United", "Dalewood Rovers").
const ANTES = { es: null, en: new Set(['FC', 'SC', 'Royal', 'Olympic', 'Athletic']), ja: new Set(['FC', 'SC']) };   // null = todos a frente
const palUsada = new Set();   // pais|palavra: a mesma palavra nao se repete dentro de um pais enquanto houver outras livres
const nomeGenerico = (lingua, chave, paisId) => {
  const L = LISTAS[lingua];
  for (let k = 0; k < 2000; k++) {
    const h = hash(chave + '|' + k), pal = L.pal[(h >>> 4) % L.pal.length], pref = L.pref[(h >>> 12) % L.pref.length];
    if (k < 1500 && palUsada.has(paisId + '|' + pal)) continue;
    const frente = ANTES[lingua] === null || (ANTES[lingua].has(pref) && (h % 2 === 0 || !['City', 'United', 'Rovers', 'Town', 'Wanderers', 'Rangers', 'County', 'Union', 'Sports Club'].includes(pref)));
    const gen = frente ? `${pref} ${pal}` : `${pal} ${pref}`;
    const low = gen.toLowerCase();
    if (usados.has(low) || reais.has(low) || estadiosReais.has(L.est(pal).toLowerCase()) || pal.toLowerCase().split(/\s+/).some(w => palavrasReais.has(w))) continue;
    usados.add(low); palUsada.add(paisId + '|' + pal);
    return { nome: gen, estadio: L.est(pal) };
  }
  throw new Error('sem nome generico livre para ' + chave);
};

const novosClubes = [], novosPaises = [], relatorio = [];
for (const p of PAISES) {
  const dados = dadosDe[p.file];
  const { kits, ligas: nomesSav } = kitsDoSav(p.file);
  const ids = {};
  let seq = Number(p.id) * 10000;
  const porTier = [...dados.clubs].sort((a, b) => a.tier - b.tier || a.id - b.id);
  for (const c of porTier) {
    const id = ++seq;
    const { nome, estadio } = nomeGenerico(p.lingua, p.id + '|' + c.id, p.id);
    const h = hash(nome);
    const cap = p.capital[c.tier] || 1.5e6;
    const fan = Math.max(2000, c.fanBase || 5000);
    const clube = {
      teamID: id, teamName: nome, teamAbb: sigla(nome), ...(() => { const k = coresDoClube(kits[c.id], h); return { color: k.color, color2: k.color2, color3: '' }; })(),
      teamCityName: '', teamStadiumName: estadio, yearOfFoundation: c.founded || 0,
      initialCapital: cap, initialTransfer: Math.round(cap * 0.5), sponsorAmount: 0, fanBase: fan, avrAttendance: Math.round(fan * 0.32),
      country: p.id, criadoPor: CRIADO_POR,
      ...(() => { const k = coresDoClube(kits[c.id], h); return { homeKit: k.homeKit, awayKit: k.awayKit, thirdKit: k.thirdKit, gkKit: k.gkKit }; })(),
      teamBadgeLocation: '-'
    };
    novosClubes.push(clube);
    (ids[c.tier] = ids[c.tier] || []).push(id);
    c.gameTeamId = id;
    // limpa caracteres invisiveis do ficheiro (ex.: espaco de largura zero no inicio do nome)
    c.name = semZW(c.name); c.shortName = semZW(c.shortName); c.stadium = semZW(c.stadium);
    const abrev = /^[A-Z]{2,4}$/.test(semZW(c.abbr)) ? semZW(c.abbr) : sigla(c.name);
    modClubes.push({ id, nome: c.name, abreviatura: abrev, estadio: c.stadium || '', escudo: '' });
    relatorio.push(`${p.nome} ${c.tier}: ${c.name}  ->  ${nome} (${id})`);
  }
  const leagues = p.ligas.map(([lid, tier, promoted, relegated]) => {
    const t = ids[tier] || [];
    if (t.length % 2) { console.error(`${lid}: numero impar de clubes (${t.length})`); process.exit(1); }
    const real = (nomesSav[tier - 1] || '').replace(PATROCINIO, '').trim();
    if (real) modComp.push({ id: lid, nome: real });
    return { id: lid, name: `${ORDINAL[tier]} Division (${p.nome})`, tier, teamIds: t, promoted, relegated, matchDates: datas(t.length) };
  });
  novosPaises.push({ id: p.id, name: p.nome, continent: p.continente, leagues });
  console.log(`${p.nome}: ` + leagues.map(l => `${l.id} ${l.teamIds.length} clubes`).join(', '));
}

// nomes dos jogadores gerados (textSim/nomesPaises.ts)
const nomesTxt = fs.readFileSync(nomesPath, 'utf8');
const iN = nomesTxt.indexOf('export const NOMES_POR_PAIS');
const objN = eval('(' + nomesTxt.slice(nomesTxt.indexOf('= {', iN) + 2, nomesTxt.lastIndexOf('};') + 1) + ')');
for (const p of PAISES) objN[p.id] = { nomes: NOMES[p.sigla].nomes, sobrenomes: NOMES[p.sigla].sobrenomes };
const novoNomes = nomesTxt.slice(0, iN) + 'export const NOMES_POR_PAIS: Record<string, { nomes: string[]; sobrenomes: string[] }> = ' + JSON.stringify(objN, null, 1) + ';\n';

console.log(`${novosClubes.length} clubes novos; ligas no mod: ${modComp.filter(c => LIGAS_IDS.includes(c.id)).map(c => c.id + '=' + c.nome).join(', ')}`);
if (dry) { console.log(relatorio.join('\n')); console.log('(--dry) nada foi gravado.'); process.exit(0); }

const out = dbTxt.slice(0, iC) + bloco('REAL_COUNTRIES_JSON', countries.concat(novosPaises)) + bloco('REAL_TEAMS_JSON', teams.concat(novosClubes)) + dbTxt.slice(iP);
fs.writeFileSync(dbPath, out, 'utf8');
fs.writeFileSync(nomesPath, novoNomes, 'utf8');
fs.writeFileSync(path.join(MOD, 'clubes.json'), JSON.stringify(modClubes, null, 1), 'utf8');
fs.writeFileSync(path.join(MOD, 'competicoes.json'), JSON.stringify(modComp, null, 1), 'utf8');
for (const p of PAISES) fs.writeFileSync(path.join(MOD, 'local-data', `CountryData${p.file}.json`), JSON.stringify(dadosDe[p.file]), 'utf8');
// o relatorio tem os nomes reais: fica no mod, nunca no repositorio
fs.writeFileSync(path.join(MOD, 'local-data', 'relatorio_mex_usa_jpn.txt'), relatorio.join('\n'), 'utf8');
console.log('Gravado: textSim/realDatabase.ts, textSim/nomesPaises.ts; no mod: clubes.json, competicoes.json, gameTeamId nos CountryData<N>.json e local-data/relatorio_mex_usa_jpn.txt.');
