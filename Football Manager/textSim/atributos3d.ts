/*
OS ATRIBUTOS DO 3D NO MANAGER (Squad Management e Overview). O motor 3D joga com os atributos do jogo de origem (assets/players.json: ~40 campos por jogador, de 1 a 100); o manager so tinha
DEF/PAS/DRB/SHT, que vem de outra tabela (realDatabase.ts). Aqui os atributos do 3D sao lidos pelo id (`p-<id>`) e agrupados em quatro medias:
  TEC  tecnica (controlo, drible, finalizacao, passe, cruzamento...)      TAC  tatica (desarme, marcacao, posicionamento, visao, leitura de jogo)
  MEN  mental (agressividade, reacao, calma, regularidade)                FIS  fisico (aceleracao, velocidade, agilidade, salto, forca, resistencia, equilibrio)
Para o guarda-redes os grupos usam os campos de baliza. Quem nao existe na base do 3D (jogadores gerados) leva as medias derivadas de DEF/PAS/DRB/SHT, OVR, forma e moral
(`real: false`, sem lista detalhada).
*/
import dados from './atributos3d.json';
import type { Player } from '../types';
import { REAL_PLAYERS_JSON } from './realDatabase';
import { NIVEL_MINIMO } from './dataGenerator';

/*
O TREINO MEXE NOS ATRIBUTOS DO 3D: o treino sobe/desce DEF/PAS/DRB/SHT e esse ganho (o valor de hoje menos o do inicio, da realDatabase com o piso NIVEL_MINIMO) soma-se aos campos do grupo:
TEC recebe 0.4 DRB + 0.3 SHT + 0.3 PAS e TAC recebe DEF. MEN e FIS ficam como estao.
*/
const BASE: Map<string, { def: number; pas: number; drb: number; sht: number }> = new Map();
let baseFeita = false;
const baseDe = (id: string) => {
  if (!baseFeita) {
    baseFeita = true;
    for (const r of REAL_PLAYERS_JSON as any[]) {
      if (!r.idPlayer) continue;
      BASE.set(String(r.idPlayer), { def: Math.max(NIVEL_MINIMO, r.defPlayer), pas: Math.max(NIVEL_MINIMO, r.pasPlayer), drb: Math.max(NIVEL_MINIMO, r.drbplayer), sht: Math.max(NIVEL_MINIMO, r.shtPlayer) });
    }
  }
  return BASE.get(id);
};

export type GrupoAtributo = 'TEC' | 'TAC' | 'MEN' | 'FIS';

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

const GRUPOS_CAMPO: Record<GrupoAtributo, string[]> = {
  TEC: ['ballControl', 'dribbling', 'finishing', 'shotPower', 'longShots', 'volleys', 'crossing', 'passing', 'longPassing', 'headAccurancy', 'freekicks', 'cornerKicks', 'penalties'],
  TAC: ['tackleStanding', 'tackleSliding', 'manMarking', 'posOffense', 'posDefense', 'vision', 'tacticalAwa'],
  MEN: ['aggression', 'reactions', 'composure', 'consistency'],
  FIS: ['acceleration', 'speed', 'agility', 'jumping', 'strength', 'stamina', 'balance']
};
const GRUPOS_GK: Record<GrupoAtributo, string[]> = {
  TEC: ['handling', 'kicking', 'passing', 'ballControl'],
  TAC: ['posGK', 'onos', 'posDefense', 'tacticalAwa', 'vision'],
  MEN: ['aggression', 'reactions', 'composure', 'consistency'],
  FIS: ['diving', 'reflexes', 'agility', 'jumping', 'strength', 'balance']
};

export interface Atributos3D {
  tec: number; tac: number; men: number; fis: number;
  /** Os campos do 3D (so quando o jogador existe na base do 3D). */
  detalhe?: Record<GrupoAtributo, { campo: string; nome: string; valor: number }[]>;
  real: boolean;
}

const media = (v: number[]) => Math.round(v.reduce((a, b) => a + b, 0) / Math.max(1, v.length));
const cache = new Map<string, Atributos3D>();

export const atributos3d = (p: Player): Atributos3D => {
  const id = String(p.id).replace(/^p-/, '');
  const linha = D.jogadores[id];
  const gk = String(p.position) === 'GK';
  // Os derivados dependem dos atributos que o treino mexe: chave inclui-os.
  const chave = `${p.id}|${p.def}|${p.pas}|${p.drb}|${p.sht}|${Math.round(p.skill)}|${Math.round(p.fitness)}|${Math.round(p.morale)}`;
  const c = cache.get(chave);
  if (c) return c;
  let r: Atributos3D;
  if (linha) {
    const g = gk ? GRUPOS_GK : GRUPOS_CAMPO;
    const detalhe = {} as Atributos3D['detalhe'] & object;
    const m: Record<string, number> = {};
    const b = baseDe(id);
    const dTec = b ? 0.4 * (p.drb - b.drb) + 0.3 * (p.sht - b.sht) + 0.3 * (p.pas - b.pas) : 0;
    const dTac = b ? p.def - b.def : 0;
    const delta: Record<GrupoAtributo, number> = { TEC: Math.round(dTec), TAC: Math.round(dTac), MEN: 0, FIS: 0 };
    (['TEC', 'TAC', 'MEN', 'FIS'] as GrupoAtributo[]).forEach(k => {
      const lista = g[k].map(campo => ({ campo, nome: NOME_DO_CAMPO[campo] || campo, valor: Math.max(1, Math.min(99, linha[IDX[campo]] + delta[k])) }));
      (detalhe as any)[k] = lista;
      m[k] = media(lista.map(x => x.valor));
    });
    r = { tec: m.TEC, tac: m.TAC, men: m.MEN, fis: m.FIS, detalhe, real: true };
  } else {
    const alaOuLateral = ['LW', 'RW', 'LM', 'RM', 'LB', 'RB'].includes(String(p.position));
    r = {
      tec: media([p.drb, p.drb, p.sht, p.pas]),
      tac: media([p.def, p.def, p.pas]),
      men: media([p.skill, p.morale * 0.5 + 50]),
      fis: media([p.skill + (alaOuLateral ? 3 : 0), 40 + p.fitness * 0.6]),
      real: false
    };
  }
  if (cache.size > 5000) cache.clear();
  cache.set(chave, r);
  return r;
};
