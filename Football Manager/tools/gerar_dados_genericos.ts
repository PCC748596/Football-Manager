/*
GERA O PACOTE DE DADOS GENERICOS + O MOD DOS DADOS REAIS (uma vez).

O jogo passa a trazer, no codigo (textSim/realDatabase.ts), clubes, estadios e jogadores com NOMES GENERICOS (os numeros — notas, idades, posicoes, cores — sao os mesmos). Os nomes e os escudos reais saem para
a pasta `public/dados_reais/` (o "mod"): se ela existir, o jogo le-a ao arrancar e passa a usar os nomes e os escudos reais (textSim/modDados.ts); sem ela (o pacote da Steam) o jogo corre com os genericos.

    public/dados_reais/mod.json         nome e versao do mod
    public/dados_reais/clubes.json      [{ id, nome, abreviatura, estadio, escudo }]   (id = teamID da base; `escudo` = ficheiro em escudos/)
    public/dados_reais/jogadores.json   [{ id, nome }]                                 (id = idPlayer da base)
    public/dados_reais/competicoes.json [{ id, nome, nomeCurto, prefixo, logo }]           (copas e ligas; id = o da copa ou o da liga)
    public/dados_reais/competicoes/     os logos das copas
    public/dados_reais/escudos/<id>.png os escudos, pelo id do clube

Uso (so uma vez, com a base REAL ainda em textSim/realDatabase.ts):  npx tsx tools/gerar_dados_genericos.ts
Para refazer: `git checkout textSim/realDatabase.ts` e apagar public/dados_reais antes de correr outra vez.
*/
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { REAL_COUNTRIES_JSON, REAL_TEAMS_JSON, REAL_PLAYERS_JSON } from '../textSim/realDatabase';
import { nomeDoClube } from '../textSim/nomes';
import { criarRng } from '../textSim/contracts';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MOD = process.env.FM_MOD_DIR ? path.resolve(process.env.FM_MOD_DIR) : path.join(RAIZ, 'public', 'dados_reais');   // a pasta do mod (a mesma de Settings > Mod)
if (fs.existsSync(path.join(MOD, 'clubes.json'))) { console.error('public/dados_reais ja existe: a base ja foi gerada. Veja o cabecalho deste ficheiro para refazer.'); process.exit(1); }

// --- os nomes genericos dos clubes: <prefixo> <palavra>, na lingua do pais, com o sufixo de estado (-SP, -RJ...) dos clubes brasileiros ---
const LISTAS: Record<string, { pref: string[]; pal: string[]; est: (p: string) => string }> = {
  pt: {
    pref: ['Atlético', 'Esporte Clube', 'Sport', 'Real', 'Nacional', 'Independente', 'Associação', 'Futebol Clube', 'União', 'Unidos', 'Clube Atlético', 'Grêmio', 'Racing', 'Olímpico'],
    pal: ['Aurora', 'Caravela', 'Horizonte', 'Cometa', 'Mirante', 'Cascata', 'Jacarandá', 'Sabiá', 'Tucano', 'Pantanal', 'Vale Verde', 'Serra Azul', 'Lagoa Dourada', 'Planalto', 'Cerrado', 'Ipê', 'Araucária', 'Bromélia',
      'Cajueiro', 'Pitanga', 'Guaraná', 'Mandacaru', 'Carnaúba', 'Jabuticaba', 'Sertão Alto', 'Costa Branca', 'Monte Claro', 'Rio Manso', 'Campos Belos', 'Praia Funda', 'Porto Seguro Velho', 'Alvorada', 'Tempestade', 'Trovão',
      'Relâmpago', 'Cruzeiro do Vale', 'Estrela Polar', 'Falcão', 'Gavião', 'Onça', 'Jaguar', 'Lobo Guará', 'Tamanduá', 'Arara', 'Quero-Quero', 'Beija-Flor', 'Marajó', 'Tapajós', 'Araguaia', 'Paranapanema', 'Iguaçu Novo',
      'Serrano', 'Litoral', 'Fronteira', 'Cordilheira', 'Imperial', 'Bandeirantes', 'Pioneiros', 'Desbravadores', 'Guerreiros', 'Tradição', 'Esperança'],
    est: p => 'Estádio ' + p
  },
  es: {
    pref: ['Atlético', 'Deportivo', 'Real', 'Club Deportivo', 'Sporting', 'Unión', 'Racing', 'Club Atlético', 'Independiente', 'Nacional', 'Juventud'],
    pal: ['Aurora', 'Horizonte', 'Cometa', 'Mirador', 'Cascada', 'Jacaranda', 'Quetzal', 'Cóndor', 'Pampa', 'Valle Verde', 'Sierra Azul', 'Laguna Dorada', 'Altiplano', 'Cerrito', 'Araucaria', 'Ceibo', 'Algarrobo', 'Guanaco',
      'Puma', 'Jaguar', 'Zorro', 'Colibrí', 'Cordillera', 'Frontera', 'Bahía Clara', 'Monte Alto', 'Río Manso', 'Campo Bello', 'Costa Blanca', 'Amanecer', 'Tormenta', 'Relámpago', 'Estrella Polar', 'Halcón', 'Pioneros',
      'Guerreros', 'Esperanza', 'Tradición', 'Imperial', 'Libertad Nueva', 'Patria Chica', 'Montañés', 'Costeño', 'Norteño', 'Sureño', 'Atlántico', 'Pacífico', 'Andino'],
    est: p => 'Estadio ' + p
  },
  en: {
    pref: ['United', 'City', 'Athletic', 'Rovers', 'Town', 'Albion', 'Wanderers', 'Rangers', 'County', 'Borough', 'Harriers', 'Olympic', 'Royal', 'Union'],
    pal: ['Ashford', 'Brookfield', 'Cresthill', 'Dunmore', 'Eastvale', 'Fairhaven', 'Glenwood', 'Highmoor', 'Ironbridge', 'Kingsmere', 'Lakeside', 'Millbrook', 'Northgate', 'Oakridge', 'Pinecroft', 'Queensway',
      'Riverbend', 'Stonebridge', 'Thornbury', 'Upton Vale', 'Westfield', 'Yarrow', 'Aldermoor', 'Beacon Hill', 'Copperfield', 'Dalewood', 'Elmstead', 'Foxbury', 'Greystone', 'Hollowell', 'Ivybridge', 'Juniper',
      'Kestrel', 'Larkspur', 'Meadowbank', 'Netherby', 'Orchard Park', 'Pennington', 'Quarry Hill', 'Ravenscar', 'Silverdale', 'Tamworth Heath', 'Underhill', 'Valemoor', 'Wexcombe', 'Yewdale', 'Zennor'],
    est: p => p + ' Park'
  }
};
const LINGUA_DO_PAIS: Record<string, string> = { '45': 'pt' };   // Brasil; Portugal pelo nome; os de lingua espanhola abaixo; o resto: ingles
const ES = new Set(['Argentina', 'Chile', 'Colombia', 'Uruguay', 'Paraguay', 'Peru', 'Ecuador', 'Bolivia', 'Venezuela', 'Mexico', 'Spain']);
const paises = new Map<string, any>((REAL_COUNTRIES_JSON as any[]).map(c => [String(c.id), c]));
// O pais de cada clube: o campo `country` do clube ou, se faltar (parte dos clubes das series do Brasil), o pais da liga que o lista.
const paisDoTime = new Map<number, string>();
for (const c of REAL_COUNTRIES_JSON as any[]) for (const l of (c.leagues || [])) for (const id of (l.teamIds || [])) paisDoTime.set(Number(id), String(c.id));
const paisDe = (t: any): string => (t.country !== undefined && t.country !== null && String(t.country) !== '' ? String(t.country) : (paisDoTime.get(Number(t.teamID)) || (/-[A-Z]{2}$/.test(String(t.teamName)) ? '45' : '')));
const linguaDe = (pais: string): string => LINGUA_DO_PAIS[pais] || (ES.has(String(paises.get(pais)?.name)) ? 'es' : (paises.get(pais)?.name === 'Brazil' || paises.get(pais)?.name === 'Portugal' ? 'pt' : 'en'));
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };

const reaisDosTimes = new Set((REAL_TEAMS_JSON as any[]).map(t => String(t.teamName).toLowerCase()));
const usados = new Set<string>();
const nomeGenericoDoClube = new Map<string, string>();   // teamName real -> generico
const clubes: any[] = [];
for (const t of REAL_TEAMS_JSON as any[]) {
  const sufixo = (String(t.teamName).match(/-[A-Z]{2}$/) || [''])[0];
  const L = LISTAS[linguaDe(paisDe(t))];
  let gen = '', k = 0;
  do {
    const h = hash(String(t.teamID) + '|' + k++);
    const base = L.pref.length && (h % 3 === 0) ? `${L.pal[(h >>> 4) % L.pal.length]} ${L.pref[(h >>> 12) % L.pref.length]}` : `${L.pref[(h >>> 12) % L.pref.length]} ${L.pal[(h >>> 4) % L.pal.length]}`;
    gen = base + sufixo;
  } while (usados.has(gen.toLowerCase()) || reaisDosTimes.has(gen.toLowerCase()));
  usados.add(gen.toLowerCase());
  nomeGenericoDoClube.set(String(t.teamName), gen);
}

// --- o mod: nomes reais + escudos pelo id do clube ---
fs.mkdirSync(path.join(MOD, 'escudos'), { recursive: true });
const ESC = path.join(RAIZ, 'Assets', 'Escudos');
let escudosCopiados = 0;
for (const t of REAL_TEAMS_JSON as any[]) {
  const nomeFicheiro = String(t.teamName).replace('Man United', 'Man Utd').replace('Nottm Forest', 'Nottingham Forest') + '.png';
  const origem = path.join(ESC, nomeFicheiro);
  let escudo = '';
  if (fs.existsSync(origem)) { fs.copyFileSync(origem, path.join(MOD, 'escudos', `${t.teamID}.png`)); escudo = `${t.teamID}.png`; escudosCopiados++; }
  clubes.push({ id: t.teamID, nome: t.teamName, abreviatura: t.teamAbb, estadio: t.teamStadiumName, escudo });
}
const jogadores = (REAL_PLAYERS_JSON as any[]).map(p => ({ id: p.idPlayer, nome: p.namePlayer }));
const idDoTime = new Map<string, number>((REAL_TEAMS_JSON as any[]).map(t => [String(t.teamName), t.teamID]));
fs.writeFileSync(path.join(MOD, 'clubes.json'), JSON.stringify(clubes, null, 1), 'utf8');
fs.writeFileSync(path.join(MOD, 'jogadores.json'), JSON.stringify(jogadores), 'utf8');
fs.writeFileSync(path.join(MOD, 'mod.json'), JSON.stringify({ nome: 'Dados reais', versao: 1, descricao: 'Nomes reais de clubes, estadios e jogadores, e os escudos. Apague esta pasta para o jogo usar so os nomes genericos.' }, null, 2), 'utf8');

// --- as competicoes: nomes reais e logos para o mod; nomes genericos para a base ---
const COPAS = [
  { id: 'LIB', nome: 'Copa Libertadores', nomeCurto: 'Copa Libertadores', prefixo: 'LIBERT', logo: 'LIB.png' },
  { id: 'SUL', nome: 'Copa Sul-Americana', nomeCurto: 'Copa Sul-Americana', prefixo: 'SULA', logo: 'SUL.png' },
  { id: 'COPA_BR', nome: 'Copa do Brasil', nomeCurto: 'Copa do Brasil', prefixo: 'CUP', logo: 'COPA_BR.png' },
  { id: 'CARABAO', nome: 'Carabao Cup', nomeCurto: 'Carabao Cup', prefixo: 'EFL', logo: 'CARABAO.png' },
  { id: 'FA_CUP', nome: 'FA Cup', nomeCurto: 'FA Cup', prefixo: 'FAC', logo: '' },
  { id: 'PAULISTA', nome: 'Campeonato Paulista', nomeCurto: 'Campeonato Paulista', prefixo: 'PAULISTA', logo: '' },
  { id: 'CARIOCA', nome: 'Campeonato Carioca', nomeCurto: 'Campeonato Carioca', prefixo: 'CARIOCA', logo: '' },
  { id: 'MINEIRO', nome: 'Campeonato Mineiro', nomeCurto: 'Campeonato Mineiro', prefixo: 'MINEIRO', logo: '' },
  { id: 'GAUCHO', nome: 'Campeonato Gaúcho', nomeCurto: 'Campeonato Gaúcho', prefixo: 'GAUCHO', logo: '' },
  { id: 'UCL', nome: 'UEFA Champions League', nomeCurto: 'Champions League', prefixo: 'UCL', logo: 'UCL.png' },
  { id: 'UEL', nome: 'UEFA Europa League', nomeCurto: 'Europa League', prefixo: 'UEL', logo: 'UEL.png' },
  { id: 'UECL', nome: 'UEFA Conference League', nomeCurto: 'Conference League', prefixo: 'UECL', logo: 'UECL.png' },
  { id: 'SERIE_C', nome: 'Série C', nomeCurto: 'Série C', prefixo: 'C', logo: '' },
  { id: 'SERIE_D', nome: 'Série D', nomeCurto: 'Série D', prefixo: 'D', logo: '' }
];
const ligasReais: any[] = [];
for (const c of REAL_COUNTRIES_JSON as any[]) for (const l of (c.leagues || [])) ligasReais.push({ id: l.id, nome: l.name });
fs.mkdirSync(path.join(MOD, 'competicoes'), { recursive: true });
const LOGOS = path.join(RAIZ, 'Assets', 'Competicoes');
let logosCopiados = 0;
for (const c of COPAS) {
  if (c.logo && fs.existsSync(path.join(LOGOS, c.logo))) { fs.copyFileSync(path.join(LOGOS, c.logo), path.join(MOD, 'competicoes', c.logo)); logosCopiados++; } else c.logo = '';
}
fs.writeFileSync(path.join(MOD, 'competicoes.json'), JSON.stringify([...COPAS, ...ligasReais], null, 1), 'utf8');
const NOME_DA_DIVISAO = ['First Division', 'Second Division', 'Third Division', 'Fourth Division', 'Fifth Division'];
const paisesGen = (REAL_COUNTRIES_JSON as any[]).map(c => ({
  ...c,
  leagues: (c.leagues || []).map((l: any) => ({ ...l, name: /_clubes$/.test(String(l.id)) ? `Other clubs (${c.name})` : `${NOME_DA_DIVISAO[Math.max(0, Math.min(4, (Number(l.tier) || 1) - 1))]} (${c.name})` }))
}));

// --- a base generica (textSim/realDatabase.ts) ---
const abrev = (nome: string) => nome.replace(/-[A-Z]{2}$/, '').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 3).toUpperCase().padEnd(3, 'X');
const estadioGenerico = (t: any, gen: string) => LISTAS[linguaDe(paisDe(t))].est(gen.replace(/-[A-Z]{2}$/, '').split(' ').slice(-1)[0]);
const timesGen = (REAL_TEAMS_JSON as any[]).map(t => {
  const gen = nomeGenericoDoClube.get(String(t.teamName))!;
  return { ...t, teamName: gen, teamAbb: abrev(gen), teamStadiumName: estadioGenerico(t, gen), teamBadgeLocation: '-' };
});
const jogGen = (REAL_PLAYERS_JSON as any[]).map(p => {
  const tid = idDoTime.get(String(p.team));
  return { ...p, team: nomeGenericoDoClube.get(String(p.team)) || p.team, namePlayer: tid !== undefined ? nomeDoClube(criarRng('nome-generico|p-' + p.idPlayer), String(tid)) : 'Jogador ' + p.idPlayer };
});
const conteudo = `\n// BASE GENERICA (gerada por tools/gerar_dados_genericos.ts): clubes, estadios e jogadores com nomes gerados. Os nomes e os escudos reais ficam em public/dados_reais (o mod, lido por textSim/modDados.ts).\n\nexport const REAL_COUNTRIES_JSON: any[] = ${JSON.stringify(paisesGen, null, 1)};\n\nexport const REAL_TEAMS_JSON: any[] = ${JSON.stringify(timesGen, null, 1)};\n\nexport const REAL_PLAYERS_JSON: any[] = ${JSON.stringify(jogGen)};\n`;
fs.writeFileSync(path.join(RAIZ, 'textSim', 'realDatabase.ts'), conteudo, 'utf8');
console.log(`clubes ${clubes.length} (escudos copiados ${escudosCopiados}), jogadores ${jogadores.length}, competicoes ${COPAS.length + ligasReais.length} (logos ${logosCopiados})`);
console.log('exemplos de clubes:', timesGen.slice(0, 5).map((t: any, i: number) => `${(REAL_TEAMS_JSON as any[])[i].teamName} -> ${t.teamName}`).join(' | '));
console.log('exemplos de jogadores:', jogGen.slice(0, 4).map((p: any, i: number) => `${(REAL_PLAYERS_JSON as any[])[i].namePlayer} -> ${p.namePlayer}`).join(' | '));
