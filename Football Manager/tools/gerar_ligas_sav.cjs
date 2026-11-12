/*
LIGAS NOVAS A PARTIR DOS .sav DO FIFA MANAGER, por GRUPO de paises (configuracao em tools/ligas_sav/<grupo>/config.cjs).

    node tools/gerar_ligas_sav.cjs --grupo <grupo> --dry      mostra o que faria; nao grava nada
    node tools/gerar_ligas_sav.cjs --grupo <grupo>            cria os paises, as ligas e os clubes (GENERICOS) em textSim/realDatabase.ts e os nomes reais no mod
    node tools/gerar_ligas_sav.cjs --grupo <grupo> --force    refaz (APAGA os paises e clubes deste grupo — incluindo o que editou no Editor neles)

Grupos: mex_usa_jpn (Mexico, EUA, Japao), africa_asia (11 paises de Africa e 5 da Asia). Passo a passo para um grupo novo:
  1. python tools/parse_countrydata.py <sav> <mod>/local-data/CountryData<N>.json --game --country N --max-tier T   (as divisoes: TIER_ENDS / TIER_IDS no parser)
  2. node tools/gerar_ligas_sav.cjs --grupo <g>
  3. python tools/extrair_escudos_fm.py <N...>                     (escudos para <mod>/escudos)
  4. python tools/ligas_sav/cores_escudos.py <g> <ids dos paises>  e  node tools/gerar_ligas_sav.cjs --grupo <g> --force   (cores revistas pelos escudos)

A pasta do mod: FM_MOD_DIR ou, por omissao, Z:\FootManager3D\mod. O que vai para onde:
- JOGO (textSim/realDatabase.ts, vai para a Steam): paises, ligas e clubes com nomes, siglas e estadios GERADOS (tools/ligas_sav/listas.cjs, na lingua do pais; nunca o nome real). Os numeros
  (torcida, fundacao) e as cores do equipamento saem do ficheiro e dos escudos. Nenhum jogador entra na base: o jogo gera o plantel; com o mod, os reais entram por textSim/dadosLocais.ts.
  Tambem textSim/nomesPaises.ts (nomes comuns para os jogadores gerados: tools/ligas_sav/<grupo>/nomes.cjs).
- MOD (so na pasta do mod): clubes.json (nome, sigla, estadio e escudo reais pelo id do clube), competicoes.json (o nome real das ligas), `gameTeamId` nos CountryData<N>.json e o
  relatorio nome real -> nome generico em local-data/.
O nome real das ligas vem do proprio ficheiro .sav (as primeiras linhas), sem o patrocinador (`patrocinio` do grupo). Nenhum nome real fica nos scripts.
Ids: clubes = id do pais x 10000 + n.
*/
const fs = require('fs');
const path = require('path');
const { LISTAS } = require('./ligas_sav/listas.cjs');

const arg = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : null; };
const GRUPO = arg('--grupo');
if (!GRUPO || !fs.existsSync(path.join(__dirname, 'ligas_sav', GRUPO, 'config.cjs'))) { console.error('Use --grupo <nome> (uma pasta em tools/ligas_sav/ com config.cjs).'); process.exit(1); }
const CFG = require(`./ligas_sav/${GRUPO}/config.cjs`);
const PAISES = CFG.PAISES, NOMES = CFG.NOMES, CRIADO_POR = CFG.criadoPor || ('gerar_ligas_sav:' + GRUPO);

const raiz = path.resolve(__dirname, '..');
const MOD = process.env.FM_MOD_DIR ? path.resolve(process.env.FM_MOD_DIR) : 'Z:\\FootManager3D\\mod';
const SAV = process.env.FM_SAV_DIR ? path.resolve(process.env.FM_SAV_DIR) : 'Z:\\Games\\Fifa Manager 26\\database\\data';
const dbPath = path.join(raiz, 'textSim', 'realDatabase.ts');
const nomesPath = path.join(raiz, 'textSim', 'nomesPaises.ts');
const dry = process.argv.includes('--dry'), force = process.argv.includes('--force');
const ORDINAL = { 1: 'First', 2: 'Second', 3: 'Third' };
// O nome real das ligas: tira o patrocinio e completa as abreviaturas com que o .sav corta os nomes compridos.
const nomeDaLiga = (s) => {
  let n = String(s || '').replace(CFG.patrocinio || /$^/, '');
  for (const [de, para] of (CFG.abreviaturas || [])) n = n.replace(de, para);
  return n.replace(/\s+/g, ' ').trim();
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
  // Nomes das divisoes: as linhas entre aspas logo apos o cabecalho do pais (uma por divisao, na ordem). "1" = o ficheiro nao tem nome para a liga.
  // Ficam a partir da 8.a linha, seguidas; a primeira que nao esta entre aspas acaba a lista (sem ela, o que viesse a seguir era o nome de um clube).
  const ligas = [];
  for (let i = 7; i < 20 && ligas.length < 6 && L[i] && L[i].startsWith('"'); i++) ligas.push(L[i].match(/^"([^"]*)"/)[1]);
  return { kits, ligas: ligas.map(n => /^\d*$/.test(n) ? '' : n) };
};
/*
AS CORES DO ESCUDO (tools/ligas_sav/<grupo>/cores_escudos.json, de tools/ligas_sav/cores_escudos.py; so ids e cores): a tabela PALETA nao acerta todos os indices do ficheiro
(ex.: o mesmo indice e azul num clube e grena noutro). Regra: a cor do ficheiro fica se aparecer no escudo (>= 6% dos pixels); senao entra a cor do escudo.
E as cores escolhidas a mao (tools/ligas_sav/<grupo>/cores_manuais.json), para os clubes em que nem o ficheiro nem o escudo acertam: mandam sobre as duas.
*/
const lerJsonDoGrupo = (n) => { try { return require(`./ligas_sav/${GRUPO}/${n}`); } catch { return {}; } };
const CORES_ESCUDO = lerJsonDoGrupo('cores_escudos.json');
const CORES_MANUAIS = lerJsonDoGrupo('cores_manuais.json');
const rgbDe = (hx) => { const n = parseInt(hx.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const distCor = (a, b) => { const [r1, g1, b1] = rgbDe(a), [r2, g2, b2] = rgbDe(b), rm = (r1 + r2) / 2; return Math.sqrt((2 + rm / 256) * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + (2 + (255 - rm) / 256) * (b1 - b2) ** 2); };
const saturacao = (hx) => { const v = rgbDe(hx), mx = Math.max(...v), mn = Math.min(...v); return mx < 40 ? 0 : (mx - mn) / mx; };
const noEscudo = (c, cores) => cores.filter(([x]) => distCor(c, x) < 150).reduce((a, [, f]) => a + f, 0) >= 0.06;
const revistas = new Set();
const reverComEscudo = (id, c1, c2) => {
  if (CORES_MANUAIS[String(id)]) { const [m1, m2] = CORES_MANUAIS[String(id)]; if (m1 !== c1 || m2 !== c2) revistas.add(id); return [m1, m2]; }
  const cores = CORES_ESCUDO[String(id)];
  if (!cores || !cores.length) return [c1, c2];
  let n1 = c1, n2 = c2;
  if (!noEscudo(c1, cores)) {
    const crom = cores.filter(([x]) => saturacao(x) > 0.35 && Math.max(...rgbDe(x)) > 60);
    n1 = (crom[0] || cores[0])[0];
  }
  if (!noEscudo(n2, cores) || distCor(n1, n2) < 150) {
    const outra = cores.find(([x]) => distCor(x, n1) >= 150);
    n2 = outra ? outra[0] : (claro(n1) ? '#111111' : '#ffffff');
  }
  if (n1 !== c1 || n2 !== c2) revistas.add(id);
  return [n1, n2];
};
/** Cores e equipamentos de um clube a partir das linhas do KIT (casa: linha 2; fora: linha 8), revistas pelo escudo. */
const coresDoClube = (linhas, h, id) => {
  const casa = (linhas && linhas[2] || '').split(',').map(Number), fora = (linhas && linhas[8] || '').split(',').map(Number);
  const c1p = cor(casa[0], h), c2i = casa.find(x => x !== casa[0]);
  const c2p = c2i !== undefined ? cor(c2i, h >>> 3) : (claro(c1p) ? '#111111' : '#ffffff');
  const [c1, c2] = reverComEscudo(id, c1p, c2p);
  const f1 = fora.length && !isNaN(fora[0]) ? cor(fora[0], h >>> 5) : (claro(c1) ? c2 : '#ffffff');
  const f1b = distCor(f1, c1) < 150 ? (claro(c1) ? '#111111' : '#ffffff') : f1;
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
const doGrupo = (teamId) => IDS.includes(String(Math.floor(Number(teamId) / 10000)));
// Um id de pais que ja exista e NAO seja deste grupo e um erro (ex.: o 83 do jogo e a Austria, o 83 do .sav e o Mexico).
const outro = countries.find(c => IDS.includes(String(c.id)) && !teams.some(t => String(t.country) === String(c.id) && t.criadoPor === CRIADO_POR));
if (outro && !teams.some(t => t.criadoPor === CRIADO_POR)) { console.error(`O id de pais ${outro.id} ja e ${outro.name} na base: escolha outro no config do grupo.`); process.exit(1); }
const jaTem = countries.some(c => IDS.includes(String(c.id))) || teams.some(t => t.criadoPor === CRIADO_POR);
if (jaTem && !dry && !force) { console.error(`O grupo ${GRUPO} ja esta na base (talvez editado). Use --force para refazer, ou --dry.`); process.exit(1); }
if (jaTem) { countries = countries.filter(c => !IDS.includes(String(c.id))); teams = teams.filter(t => t.criadoPor !== CRIADO_POR && !IDS.includes(String(t.country))); }

// O mod
const lerMod = (n, def) => { const f = path.join(MOD, n); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : def; };
let modClubes = lerMod('clubes.json', []), modComp = lerMod('competicoes.json', []);
modClubes = modClubes.filter(c => !doGrupo(c.id));
const LIGAS_IDS = PAISES.flatMap(p => p.ligas.map(l => l[0]));
modComp = modComp.filter(c => !LIGAS_IDS.includes(c.id));

const datas = (n) => { const rounds = 2 * (n - 1), passos = rounds * 4.67 + 105 < 360 ? [4, 6, 4, 4, 6] : [3, 4, 4]; const out = []; let d = 105; for (let r = 0; r < rounds; r++) { out.push(d); d += passos[r % passos.length]; } return out; };
// Nomes reais (de todos os ficheiros do grupo) e os ja usados na base: um nome generico nunca coincide com eles.
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
const palUsada = new Set();   // pais|palavra: a mesma palavra nao se repete dentro de um pais enquanto houver outras livres
const SO_DEPOIS = ['City', 'United', 'Rovers', 'Town', 'Wanderers', 'Rangers', 'County', 'Union', 'Sports Club', 'Stars', 'Warriors', 'Citizen', 'Club', 'Sport Club'];
const nomeGenerico = (lingua, chave, paisId) => {
  const L = LISTAS[lingua];
  if (!L) throw new Error('lingua sem lista em tools/ligas_sav/listas.cjs: ' + lingua);
  for (let k = 0; k < 2000; k++) {
    const h = hash(chave + '|' + k), pal = L.pal[(h >>> 4) % L.pal.length], pref = L.pref[(h >>> 12) % L.pref.length];
    if (k < 1500 && palUsada.has(paisId + '|' + pal)) continue;
    const frente = L.antes === null || (L.antes.has(pref) && (h % 2 === 0 || !SO_DEPOIS.includes(pref)));
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
    const k = coresDoClube(kits[c.id], h, id);
    const clube = {
      teamID: id, teamName: nome, teamAbb: sigla(nome), color: k.color, color2: k.color2, color3: '',
      teamCityName: '', teamStadiumName: estadio, yearOfFoundation: c.founded || 0,
      initialCapital: cap, initialTransfer: Math.round(cap * 0.5), sponsorAmount: 0, fanBase: fan, avrAttendance: Math.round(fan * 0.32),
      country: p.id, criadoPor: CRIADO_POR,
      homeKit: k.homeKit, awayKit: k.awayKit, thirdKit: k.thirdKit, gkKit: k.gkKit,
      teamBadgeLocation: '-'
    };
    novosClubes.push(clube);
    (ids[c.tier] = ids[c.tier] || []).push(id);
    c.gameTeamId = id;
    // limpa caracteres invisiveis do ficheiro (ex.: espaco de largura zero no inicio do nome)
    c.name = semZW(c.name); c.shortName = semZW(c.shortName); c.stadium = semZW(c.stadium);
    const abrev = /^[A-Z]{2,4}$/.test(semZW(c.abbr)) ? semZW(c.abbr) : sigla(c.name);
    modClubes.push({ id, nome: c.name, abreviatura: abrev, estadio: c.stadium || '', escudo: fs.existsSync(path.join(MOD, 'escudos', id + '.png')) ? id + '.png' : '' });   // escudos: tools/extrair_escudos_fm.py
    relatorio.push(`${p.nome} ${c.tier}: ${c.name}  ->  ${nome} (${id})`);
  }
  const leagues = p.ligas.map(([lid, tier, promoted, relegated]) => {
    const t = ids[tier] || [];
    if (t.length % 2) { console.error(`${lid}: numero impar de clubes (${t.length})`); process.exit(1); }
    const real = nomeDaLiga(nomesSav[tier - 1]);
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
for (const p of PAISES) {
  if (!NOMES[p.sigla]) { console.error('sem nomes para ' + p.sigla + ' em tools/ligas_sav/' + GRUPO + '/nomes.cjs'); process.exit(1); }
  objN[p.id] = { nomes: NOMES[p.sigla].nomes, sobrenomes: NOMES[p.sigla].sobrenomes };
}
const novoNomes = nomesTxt.slice(0, iN) + 'export const NOMES_POR_PAIS: Record<string, { nomes: string[]; sobrenomes: string[] }> = ' + JSON.stringify(objN, null, 1) + ';\n';

console.log(`cores revistas pelo escudo / a mao: ${revistas.size}`);
console.log(`${novosClubes.length} clubes novos; ligas no mod: ${modComp.filter(c => LIGAS_IDS.includes(c.id)).map(c => c.id + '=' + c.nome).join(', ')}`);
if (dry) { console.log(relatorio.join('\n')); console.log('(--dry) nada foi gravado.'); process.exit(0); }

const out = dbTxt.slice(0, iC) + bloco('REAL_COUNTRIES_JSON', countries.concat(novosPaises)) + bloco('REAL_TEAMS_JSON', teams.concat(novosClubes)) + dbTxt.slice(iP);
fs.writeFileSync(dbPath, out, 'utf8');
fs.writeFileSync(nomesPath, novoNomes, 'utf8');
fs.writeFileSync(path.join(MOD, 'clubes.json'), JSON.stringify(modClubes, null, 1), 'utf8');
fs.writeFileSync(path.join(MOD, 'competicoes.json'), JSON.stringify(modComp, null, 1), 'utf8');
for (const p of PAISES) fs.writeFileSync(path.join(MOD, 'local-data', `CountryData${p.file}.json`), JSON.stringify(dadosDe[p.file]), 'utf8');
// o relatorio tem os nomes reais: fica no mod, nunca no repositorio
const nomeRel = CFG.relatorio || `relatorio_${GRUPO}.txt`;
fs.writeFileSync(path.join(MOD, 'local-data', nomeRel), relatorio.join('\n'), 'utf8');
console.log(`Gravado: textSim/realDatabase.ts, textSim/nomesPaises.ts; no mod: clubes.json, competicoes.json, gameTeamId nos CountryData<N>.json e local-data/${nomeRel}.`);
