/*
OS DADOS DO 3D, GENERICOS NO CODIGO E REAIS NO MOD (uma vez; depois de tools/gerar_dados_genericos.ts).

O motor 3D (3dMatch/simulador3d) traz os planteis em `data/squads.js` / `data/squads.json` (usado por ele proprio e pelo manager, que le dai as notas por id). Aqui os NOMES desses ficheiros passam a ser os genericos
da base do jogo (o mesmo nome por id); os nomes reais vao para `public/dados_reais/3d/squads_nomes.json`, que o 3D aplica ao arrancar se existir (index.html). Tambem saem do pacote, para a pasta do mod:

    assets/players.json, assets/teams.json     as fontes offline dos planteis (so as ferramentas tools/gen_*.js as leem)
    assets/placas_competicoes.js               a arte das placas de publicidade da Premier League e da Champions League (marcas reais); o 3D carrega-a se ela existir

Uso: npx tsx tools/gerar_dados_genericos_3d.ts     (idempotente: se `squads_nomes.json` ja existe, nao refaz)
*/
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { REAL_TEAMS_JSON, REAL_PLAYERS_JSON } from '../textSim/realDatabase';   // a base GENERICA
import { nomeDoClube } from '../textSim/nomes';
import { criarRng } from '../textSim/contracts';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const S3D = path.join(RAIZ, '3dMatch', 'simulador3d');
const MODRAIZ = process.env.FM_MOD_DIR ? path.resolve(process.env.FM_MOD_DIR) : path.join(RAIZ, 'public', 'dados_reais');
const MOD3D = path.join(MODRAIZ, '3d');
if (!fs.existsSync(path.join(MODRAIZ, 'mod.json'))) { console.error('Corra primeiro tools/gerar_dados_genericos.ts'); process.exit(1); }
if (fs.existsSync(path.join(MOD3D, 'squads_nomes.json'))) { console.error('Ja gerado (public/dados_reais/3d/squads_nomes.json existe).'); process.exit(1); }
fs.mkdirSync(MOD3D, { recursive: true });

const genTime = new Map<number, any>((REAL_TEAMS_JSON as any[]).map(t => [Number(t.teamID), t]));
const genJog = new Map<number, string>((REAL_PLAYERS_JSON as any[]).map(p => [Number(p.idPlayer), String(p.namePlayer)]));

// O `squads.json` vem de uma base com ids ANTIGOS em alguns clubes (ex.: ABC-RN 450116, hoje 451065): esses ligam-se pelo NOME real (do mod) ao clube de hoje.
const modClubes: any[] = JSON.parse(fs.readFileSync(path.join(MODRAIZ, 'clubes.json'), 'utf8'));
const idHojePeloNomeReal = new Map<string, number>(modClubes.map(c => [String(c.nome), Number(c.id)]));
for (const [antigo, hoje] of [['Náutico-RE', 'Náutico-PE'], ['SãoJosé-RS', 'São José-RS']]) { const id = idHojePeloNomeReal.get(hoje); if (id !== undefined) idHojePeloNomeReal.set(antigo, id); }   // nomes escritos de outra forma no squads.json
const squads = JSON.parse(fs.readFileSync(path.join(S3D, 'data', 'squads.json'), 'utf8'));
const nomes: { equipas: Record<string, { nome: string; estadio?: string }>; jogadores: Record<string, string> } = { equipas: {}, jogadores: {} };
let semGenerico = 0;
for (const e of squads.equipas) {
  const g = genTime.get(Number(e.id)) || genTime.get(idHojePeloNomeReal.get(String(e.nome)) ?? -1);
  const idHoje = g ? Number(g.teamID) : Number(e.id);
  if (g) { nomes.equipas[e.id] = { nome: e.nome, estadio: e.estadio }; e.nome = g.teamName; e.estadio = g.teamStadiumName; } else semGenerico++;
  for (const j of e.plantel || []) {
    // O jogador pelo id; sem ele (ids antigos), um nome gerado do id e do pais do clube.
    const gn = genJog.get(Number(j.id)) || nomeDoClube(criarRng('nome-generico|3d|' + j.id), String(idHoje));
    nomes.jogadores[j.id] = j.nome; j.nome = gn;
  }
}
fs.writeFileSync(path.join(MOD3D, 'squads_nomes.json'), JSON.stringify(nomes), 'utf8');
fs.writeFileSync(path.join(S3D, 'data', 'squads.json'), JSON.stringify(squads, null, 2), 'utf8');
fs.writeFileSync(path.join(S3D, 'data', 'squads.js'), 'const SquadsData = ' + JSON.stringify(squads) + ';\n', 'utf8');

const mover = (de: string, para: string) => { if (fs.existsSync(de)) { fs.renameSync(de, para); return true; } return false; };
const movidos = [
  mover(path.join(S3D, 'assets', 'players.json'), path.join(MOD3D, 'players.json')),
  mover(path.join(S3D, 'assets', 'teams.json'), path.join(MOD3D, 'teams.json')),
  mover(path.join(S3D, 'assets', 'placas_competicoes.js'), path.join(MOD3D, 'placas_competicoes.js'))
];
console.log(`equipas ${squads.equipas.length}, jogadores ${Object.keys(nomes.jogadores).length}, sem nome generico ${semGenerico}; ficheiros movidos: ${movidos.filter(Boolean).length}/3`);
console.log('exemplo:', squads.equipas[0].nome, '|', squads.equipas[0].plantel[0].nome);
