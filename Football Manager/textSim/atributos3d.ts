/*
OS ATRIBUTOS DO 3D NO MANAGER (Squad Management e Overview). O motor 3D joga com os atributos do jogo de origem (assets/players.json: ~40 campos por jogador, de 1 a 100); o manager so tinha
DEF/PAS/DRB/SHT, que vem de outra tabela (realDatabase.ts). Aqui os atributos do 3D sao lidos pelo id (`p-<id>`) e agrupados em quatro medias:
  TEC  tecnica (controlo, drible, finalizacao, passe, cruzamento...)      TAC  tatica (desarme, marcacao, posicionamento, visao, leitura de jogo)
  MEN  mental (agressividade, reacao, calma, regularidade)                FIS  fisico (aceleracao, velocidade, agilidade, salto, forca, resistencia, equilibrio)
Os 31 atributos valem SEMPRE de 50 a 99 (textSim/geradorAtributos.ts): os do 3D abaixo de 50 sao mostrados no minimo 50 (leitura: os dados originais nao sao alterados). O goleiro usa os mesmos 31
atributos. Quem nao existe na base do 3D (jogadores gerados) leva atributos GERADOS por `gerarAtributos` (posicao, Playing Style, nivel = OVR e idade), com semente fixa pelo id (nada fica no save):
TEC, TAC e MEN seguem a QUALIDADE do jogador; o FIS e parecido num craque e num jogador fraco e muda com a IDADE. SO estes atributos aparecem ao treinador: o DEF/PAS/DRB/SHT antigos ficam por baixo
(treino, valor de mercado) e nao sao mostrados.
*/
import dados from './atributos3d.json';
import type { Player } from '../types';
import { REAL_PLAYERS_JSON } from './realDatabase';
import { PLAYSTYLE_DA_BASE } from './playStylesDatabase';
import { NIVEL_MINIMO } from './dataGenerator';
import { GRUPOS, gerarAtributos, limitarAtributo, curvaFisica, calcularGrupos } from './geradorAtributos';

/*
O TREINO MEXE NOS ATRIBUTOS DO 3D: o treino sobe/desce DEF/PAS/DRB/SHT e esse ganho (o valor de hoje menos o do inicio, da realDatabase com o piso NIVEL_MINIMO) soma-se aos campos do grupo:
TEC recebe 0.4 DRB + 0.3 SHT + 0.3 PAS e TAC recebe DEF. MEN e FIS ficam como estao.
*/
const BASE: Map<string, { def: number; pas: number; drb: number; sht: number; idade: number; attrs3d?: Record<string, number> }> = new Map();
let baseFeita = false;
const baseDe = (id: string) => {
  if (!baseFeita) {
    baseFeita = true;
    for (const r of REAL_PLAYERS_JSON as any[]) {
      if (!r.idPlayer) continue;
      BASE.set(String(r.idPlayer), { def: Math.max(NIVEL_MINIMO, r.defPlayer), pas: Math.max(NIVEL_MINIMO, r.pasPlayer), drb: Math.max(NIVEL_MINIMO, r.drbplayer), sht: Math.max(NIVEL_MINIMO, r.shtPlayer), idade: r.agePlayer || 0, attrs3d: r.attrs3d });
    }
  }
  return BASE.get(id);
};

export type GrupoAtributo = 'TEC' | 'TAC' | 'MEN' | 'FIS';
const ORDEM_GRUPOS: GrupoAtributo[] = ['TEC', 'TAC', 'MEN', 'FIS'];

const D: { campos: string[]; jogadores: Record<string, number[]> } = dados as any;
const IDX: Record<string, number> = {};
D.campos.forEach((c, i) => { IDX[c] = i; });

export const NOME_DO_CAMPO: Record<string, string> = {
  ballControl: 'Ball control', dribbling: 'Dribbling', finishing: 'Finishing', shotPower: 'Shot power', longShots: 'Long shots', volleys: 'Volleys', crossing: 'Crossing', passing: 'Passing',
  longPassing: 'Long passing', headAccurancy: 'Heading', freekicks: 'Free kicks', cornerKicks: 'Corners', penalties: 'Penalties',
  tackleStanding: 'Standing tackle', tackleSliding: 'Sliding tackle', manMarking: 'Marking', posOffense: 'Attacking positioning', posDefense: 'Defensive positioning', vision: 'Vision', tacticalAwa: 'Tactical awareness',
  posGK: 'GK positioning', onos: 'One on ones', aggression: 'Aggression', reactions: 'Reactions', composure: 'Composure', consistency: 'Consistency',
  acceleration: 'Acceleration', speed: 'Speed', agility: 'Agility', jumping: 'Jumping', strength: 'Strength', stamina: 'Stamina', balance: 'Balance', diving: 'Diving', handling: 'Handling', reflexes: 'Reflexes', kicking: 'Kicking'
};

export interface Atributos3D {
  tec: number; tac: number; men: number; fis: number;
  /** Os campos do 3D (so quando o jogador existe na base do 3D). */
  detalhe?: Record<GrupoAtributo, { campo: string; nome: string; valor: number }[]>;
  real: boolean;
}

/** A media de alguns campos do 3D de um jogador (ex.: ['cornerKicks', 'crossing']). */
export const campo3d = (p: Player, campos: string[]): number => {
  const a = atributos3d(p);
  const todos = [...a.detalhe!.TEC, ...a.detalhe!.TAC, ...a.detalhe!.MEN, ...a.detalhe!.FIS];
  const v = campos.map(c => todos.find(x => x.campo === c)?.valor).filter((x): x is number => typeof x === 'number');
  return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : 0;
};

const cache = new Map<string, Atributos3D>();

export const atributos3d = (p: Player): Atributos3D => {
  const id = String(p.id).replace(/^p-/, '');
  const linha = D.jogadores[id];
  // Os derivados dependem dos atributos que o treino mexe, da idade e do OVR: a chave inclui-os.
  const chave = `${p.id}|${p.age}|${p.position}|${(p as any).playStyle || ''}|${p.def}|${p.pas}|${p.drb}|${p.sht}|${Math.round(p.skill)}`;
  const c = cache.get(chave);
  if (c) return c;
  const b0 = baseDe(id);
  // Atributos gravados no editor (REAL_PLAYERS_JSON.attrs3d) mandam sobre o 3D original e sobre a geracao.
  const guardados = b0 && b0.attrs3d ? b0.attrs3d : null;
  const b = (linha || guardados) ? b0 : undefined;
  // O jogador do 3D: os campos do 3D + o ganho do treino (TEC/TAC) + o desvio de idade no fisico; o gerado: os atributos gerados (posicao, estilo, nivel e idade).
  const gerado = (guardados || linha) ? null : gerarAtributos(p.position, (p as any).playStyle || (PLAYSTYLE_DA_BASE as any)[String(p.id)], p.skill, String(p.id), { idade: p.age }).atributos;
  const dTec = b ? 0.4 * (p.drb - b.drb) + 0.3 * (p.sht - b.sht) + 0.3 * (p.pas - b.pas) : 0;
  const dTac = b ? p.def - b.def : 0;
  const dFis = b && b.idade ? curvaFisica(p.age) - curvaFisica(b.idade) : 0;
  const delta: Record<GrupoAtributo, number> = { TEC: Math.round(dTec), TAC: Math.round(dTac), MEN: 0, FIS: Math.round(dFis) };
  const detalhe = {} as Record<GrupoAtributo, { campo: string; nome: string; valor: number }[]>;
  const valores: Record<string, number> = {};
  for (const k of ORDEM_GRUPOS) {
    detalhe[k] = GRUPOS[k].map(campo => {
      const valor = gerado ? gerado[campo] : limitarAtributo((guardados ? guardados[campo] : linha![IDX[campo]]) + delta[k]);
      valores[campo] = valor;
      return { campo, nome: NOME_DO_CAMPO[campo] || campo, valor };
    });
  }
  const g = calcularGrupos(valores);
  const r: Atributos3D = { tec: g.TEC, tac: g.TAC, men: g.MEN, fis: g.FIS, detalhe, real: !!(linha || guardados) };
  if (cache.size > 5000) cache.clear();
  cache.set(chave, r);
  return r;
};

/*
O QUE O MOTOR 3D RECEBE de cada jogador: os 31 atributos (os mesmos que o treinador ve, ja entre 50 e 99 e com o treino e a idade) e os cinco campos de baliza que o SkillMap do goleiro le
(diving, handling, reflexes, posGK, onos): os originais do 3D quando o jogador vem de la, senao `null` e o motor deriva-os dos 31 (skill_map.js, registoDe31).
*/
export const atributosParaMotor = (p: Player): { atributos: Record<string, number>; extrasGK: Record<string, number> | null } => {
  const a = atributos3d(p);
  const atributos: Record<string, number> = {};
  for (const g of ['TEC', 'TAC', 'MEN', 'FIS'] as GrupoAtributo[]) for (const x of a.detalhe![g]) atributos[x.campo] = x.valor;
  const id = String(p.id).replace(/^p-/, '');
  const linha = D.jogadores[id];
  let extrasGK: Record<string, number> | null = null;
  if (linha && String(p.position) === 'GK') {
    extrasGK = {};
    for (const k of ['diving', 'handling', 'reflexes', 'posGK', 'onos']) extrasGK[k] = linha[IDX[k]];
  }
  return { atributos, extrasGK };
};
