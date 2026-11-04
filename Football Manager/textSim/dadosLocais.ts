/*
DADOS LOCAIS (CountryData<N>.json): jogadores reais lidos de um ficheiro que NAO faz parte do jogo.
Ao abrir o jogo procura-se `/api/country-data/<N>` (o servidor de desenvolvimento serve a pasta `local-data/` do projeto, ou a pasta de COUNTRY_DATA_DIR; ver `countryDataPlugin` em vite.config.ts).
Se o ficheiro existir, uma PARTIDA NOVA usa os jogadores dele nos clubes que ele traz (`gameTeamId`) em vez dos gerados; sem ficheiro (build publicado, 404) nada muda. Nada e escrito na base
(realDatabase.ts) nem no Editor: o overlay vive so em memoria e os nomes reais nunca entram no codigo-fonte.

O ficheiro vem de tools/parse_countrydata.py (+ tools/match_clubs_countrydata.py, que grava `gameTeamId`). Os 37 atributos originais entram em `attrs3d` (chaves do 3D, 50 a 99): TEC/TAC/MEN/FIS sao as
medias de sempre (`calcularGrupos`). O DEF/PAS/DRB/SHT do manager sao derivados dessas mesmas notas (calibrados contra a base atual, erro medio ~4) e o overall sai de `calcularSkill`.
*/
import { Position } from '../types';
import { calcularSkill } from './overall';
import { limitarAtributo } from './geradorAtributos';
import { REAL_TEAMS_JSON } from './realDatabase';

/** Paises dos ficheiros CountryData<N>.json, pelo numero do jogo de origem (54 = Brasil, 14 = Inglaterra, 27 = Italia, 21 = Alemanha, 45 = Espanha, 18 = Franca, 38 = Portugal). */
export const PAISES_DOS_DADOS_LOCAIS = [54, 14, 27, 21, 45, 18, 38];
/** Codigo de nacionalidade do jogo de origem -> id do pais do manager (o nome do ficheiro em /Assets/Bandeiras). Sem entrada: sem bandeira certa (null). */
const BANDEIRA_DO_CODIGO: Record<string, string> = { '54': '45', '14': '65', '27': '68', '21': '67', '45': '66', '18': '69', '38': '81', '52': '52', '53': '53', '55': '55', '56': '56', '57': '57', '58': '58', '59': '59', '60': '60', '61': '61' };
export const bandeiraDoCodigo = (cod: string): string | null => BANDEIRA_DO_CODIGO[cod] ?? null;
/** A data de arranque do jogo (GameContext.startGame): as idades saem dela. */
const DATA_DE_ARRANQUE = '2024-04-01';
/** Tamanho minimo do plantel (o gerador completa com tapa-buracos abaixo de 28). */
const PLANTEL_MINIMO = 28;

/** Chave do ficheiro -> chave do 3D (NOME_DO_CAMPO em atributos3d.ts). */
const CHAVE_3D: Record<string, string> = {
  ball_control: 'ballControl', dribbling: 'dribbling', finishing: 'finishing', shot_power: 'shotPower', long_shots: 'longShots', volleys: 'volleys', crossing: 'crossing', passing: 'passing',
  long_passing: 'longPassing', heading: 'headAccurancy', tackle_standing: 'tackleStanding', tackle_sliding: 'tackleSliding', man_marking: 'manMarking',
  acceleration: 'acceleration', speed: 'speed', agility: 'agility', jumping: 'jumping', strength: 'strength', stamina: 'stamina', balance: 'balance',
  positioning_off: 'posOffense', positioning_def: 'posDefense', vision: 'vision', aggression: 'aggression', reactions: 'reactions', composure: 'composure', consistency: 'consistency', tactical_awareness: 'tacticalAwa',
  free_kicks: 'freekicks', corner_kicks: 'cornerKicks', penalties: 'penalties',
  gk_diving: 'diving', gk_handling: 'handling', gk_positioning: 'posGK', gk_one_on_ones: 'onos', gk_reflexes: 'reflexes', gk_kicking: 'kicking'
};

/** Posicao do ficheiro -> codigo numerico de `mapPosString` (dataGenerator.ts): CD e CB (4), CF e ST (13). */
const CODIGO_POSICAO: Record<string, number> = { GK: 1, RB: 2, LB: 3, CD: 4, DM: 5, LM: 6, RM: 7, CM: 8, AM: 10, RW: 11, LW: 12, CF: 13, ST: 13 };
const POSICAO_DO_JOGO: Record<string, Position> = { GK: Position.GK, RB: Position.RB, LB: Position.LB, CD: Position.CB, DM: Position.DM, LM: Position.LM, RM: Position.RM, CM: Position.CM, AM: Position.AM, RW: Position.RW, LW: Position.LW, CF: Position.ST, ST: Position.ST };

/** O mesmo formato de um jogador de REAL_PLAYERS_JSON, mais o que so os dados locais trazem. */
export interface JogadorLocal {
  idPlayer: number; team: string; namePlayer: string; posPlayer: number; agePlayer: number; ovrPlayer: number;
  defPlayer: number; pasPlayer: number; drbplayer: number; shtPlayer: number; valPlayer: number; nationality: string;
  birthDate: string; attrs3d: Record<string, number>; shirtNumber: number; squad: 'first_team' | 'reserves' | 'youth';
}

const POR_CLUBE = new Map<number, JogadorLocal[]>();
const POR_ID = new Map<string, JogadorLocal>();
let ativo = false;

const media = (a: Record<string, number>, chaves: string[]) => chaves.reduce((s, k) => s + a[k], 0) / chaves.length;
const idadeEm = (nasc: string, hoje: string) => {
  const n = new Date(nasc + 'T12:00:00'), h = new Date(hoje + 'T12:00:00');
  let i = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) i--;
  return i;
};
/** Valor de mercado inicial (a formula do gerador: ~10% por ponto acima de 50, curva de idade); a partir dai o jogo usa textSim/valuation.ts. */
const valorInicial = (skill: number, idade: number) => {
  const f = Math.pow(1.10, Math.max(0, skill - 50));
  const fi = idade < 22 ? 1.2 : idade > 30 ? Math.max(0.2, 1 - (idade - 30) * 0.1) : 1;
  return Math.round(150000 * f * fi);
};

/** DEF/PAS/DRB/SHT do manager a partir das notas (a media dos campos de cada grupo, calibrada: a + b x media). */
const derivar = (a: Record<string, number>, goleiro: boolean) => {
  if (goleiro) {
    const gk = media(a, ['diving', 'handling', 'posGK', 'onos', 'reflexes']);
    return { def: gk, pas: 0.5 * a.passing + 0.5 * a.kicking, drb: 50, sht: 60 };
  }
  return {
    def: 0.64 + 1.054 * media(a, ['tackleStanding', 'tackleSliding', 'manMarking', 'posDefense']),
    pas: 16.31 + 0.836 * media(a, ['passing', 'longPassing', 'vision', 'crossing']),
    drb: 14.78 + 0.84 * media(a, ['dribbling', 'ballControl', 'agility', 'acceleration']),
    sht: 5.85 + 0.967 * media(a, ['finishing', 'shotPower', 'longShots', 'volleys'])
  };
};
const lim = (v: number) => Math.max(50, Math.min(99, Math.round(v)));

const converter = (pais: number, c: any, nomeDoJogo: string, p: any, idx: number): JogadorLocal => {
  const attrs3d: Record<string, number> = {};
  for (const [k, v] of Object.entries(p.skills as Record<string, number>)) if (CHAVE_3D[k]) attrs3d[CHAVE_3D[k]] = limitarAtributo(v);
  const pos = POSICAO_DO_JOGO[p.position] || Position.ST;
  const d = derivar(attrs3d, pos === Position.GK);
  const def = lim(d.def), pas = lim(d.pas), drb = lim(d.drb), sht = lim(d.sht);
  const skill = Math.min(99, Math.max(50, calcularSkill(pos, def, pas, drb, sht)));
  const idade = idadeEm(p.birthDate, DATA_DE_ARRANQUE);
  const nome = (p.shortName || `${p.firstName} ${p.lastName}`).trim();
  return {
    idPlayer: pais * 1_000_000 + c.id * 1000 + idx, team: nomeDoJogo, namePlayer: nome, posPlayer: CODIGO_POSICAO[p.position] || 13,
    agePlayer: idade, ovrPlayer: skill, defPlayer: def, pasPlayer: pas, drbplayer: drb, shtPlayer: sht, valPlayer: valorInicial(skill, idade),
    nationality: p.nationality ? String(p.nationality) : '', birthDate: p.birthDate, attrs3d, shirtNumber: p.shirtFirstTeam || p.shirtReserve || 0, squad: p.squad
  };
};

/** Le o ficheiro de um pais e junta-o ao overlay. false se nao existir. */
const carregarPais = async (pais: number, nomesDosClubes: Record<number, string>): Promise<boolean> => {
  const r = await fetch(`/api/country-data/${pais}`);
  if (!r.ok) return false;
  const dados = await r.json();
  let clubes = 0;
  for (const c of dados.clubs || []) {
    const teamId = Number(c.gameTeamId);
    if (!teamId || !nomesDosClubes[teamId] || !c.players?.length) continue;
    // O plantel principal; a reserva e a base so entram para completar ate PLANTEL_MINIMO (os jovens vivem na base Sub-20, textSim/youth.ts).
    const todos: JogadorLocal[] = c.players.map((p: any, i: number) => converter(pais, c, nomesDosClubes[teamId], p, i));
    const lista = todos.filter(j => j.squad === 'first_team');
    for (const j of todos.filter(j => j.squad === 'reserves').sort((a, b) => b.ovrPlayer - a.ovrPlayer)) if (lista.length < PLANTEL_MINIMO) lista.push(j);
    POR_CLUBE.set(teamId, lista);
    for (const j of lista) POR_ID.set(String(j.idPlayer), j);
    clubes++;
  }
  console.info(`[dadosLocais] CountryData${pais}.json: ${clubes} clubes`);
  return clubes > 0;
};

/** Le os ficheiros (os que existirem) e monta o overlay. Chamar uma vez ao abrir o jogo; nunca lanca: sem nenhum ficheiro devolve false. */
export const carregarDadosLocais = async (): Promise<boolean> => {
  POR_CLUBE.clear(); POR_ID.clear();
  const nomesDosClubes: Record<number, string> = {};
  for (const t of REAL_TEAMS_JSON as any[]) nomesDosClubes[t.teamID] = t.teamName;
  // Em paralelo (sao varios ficheiros de alguns MB); sem ficheiro (ou fora do servidor de desenvolvimento) o pais fica de fora.
  await Promise.all(PAISES_DOS_DADOS_LOCAIS.map(pais => carregarPais(pais, nomesDosClubes).catch(() => false)));
  ativo = POR_CLUBE.size > 0;
  if (ativo) console.info(`[dadosLocais] ${POR_CLUBE.size} clubes, ${POR_ID.size} jogadores reais`);
  return ativo;
};

export const dadosLocaisAtivos = () => ativo;
/** Os jogadores locais do clube (id do clube no jogo), ou undefined para usar os da base/gerados. */
export const jogadoresLocaisDoClube = (teamId: number): JogadorLocal[] | undefined => POR_CLUBE.get(teamId);
export const jogadorLocalPorId = (id: string): JogadorLocal | undefined => POR_ID.get(String(id).replace(/^p-/, ''));
