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
import { definirMedidaDeCobrador } from '../types';
import { niveisDeXp, xpDeNiveis, custoDoNivel, NIVEIS_MAX_TREINO, XP_POR_PONTO,regressaoPorIdade, tetoDoAtributo, tetoDoCt } from './trainingService';
import { REAL_PLAYERS_JSON, REAL_COUNTRIES_JSON } from './realDatabase';
import { PLAYSTYLE_DA_BASE } from './playStylesDatabase';
import { NIVEL_MINIMO } from './dataGenerator';
import { evolucaoMensal, proximoMes } from './youth';
import { mesDe, criarRng } from './contracts';
import { jogadorLocalPorId, bandeiraDoCodigo } from './dadosLocais';
import { GRUPOS, ATRIBUTOS_GK, gerarAtributos, limitarAtributo, curvaFisica, calcularGrupos, fisMaisBaixo, FIS_A_MENOS_POR_POSICAO } from './geradorAtributos';

/*
O TREINO MEXE NOS ATRIBUTOS DO 3D, um a um: cada sessao (textSim/trainingService.ts) da pontos aos atributos que treina (`Player.treino3d`, campo -> pontos) e PONTOS_POR_ATRIBUTO (trainingService.ts) pontos = +1 no atributo.
O DEF/PAS/DRB/SHT antigos continuam a subir por baixo (OVR e valor de mercado), mas ja nao entram nos atributos do 3D (senao o mesmo treino contaria duas vezes).
*/
const BASE: Map<string, { def: number; pas: number; drb: number; sht: number; idade: number; attrs3d?: Record<string, number>; editado?: boolean }> = new Map();
let baseFeita = false;
const baseDe = (id: string) => {
  // Jogador dos dados locais (CountryData<N>.json): vem com os atributos e fica fora da base (nunca e gravado).
  const l = jogadorLocalPorId(id);
  if (l) return { def: Math.max(NIVEL_MINIMO, l.defPlayer), pas: Math.max(NIVEL_MINIMO, l.pasPlayer), drb: Math.max(NIVEL_MINIMO, l.drbplayer), sht: Math.max(NIVEL_MINIMO, l.shtPlayer), idade: l.agePlayer || 0, attrs3d: l.attrs3d };
  if (!baseFeita) {
    baseFeita = true;
    for (const r of REAL_PLAYERS_JSON as any[]) {
      if (!r.idPlayer) continue;
      BASE.set(String(r.idPlayer), { def: Math.max(NIVEL_MINIMO, r.defPlayer), pas: Math.max(NIVEL_MINIMO, r.pasPlayer), drb: Math.max(NIVEL_MINIMO, r.drbplayer), sht: Math.max(NIVEL_MINIMO, r.shtPlayer), idade: r.agePlayer || 0, attrs3d: r.attrs3d, editado: !!r.attrs3d });
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
  /** A media dos atributos de baliza (so o goleiro). */
  gk?: number;
  /** Altura (cm) e peso (kg) do jogador, quando os dados do 3D os trazem. */
  altura?: number; peso?: number;
  /** Os campos do 3D (todos os jogadores) + `GK` (os atributos de baliza, so no goleiro). */
  detalhe?: Record<GrupoAtributo, { campo: string; nome: string; valor: number; base?: number }[]> & { GK?: { campo: string; nome: string; valor: number }[] };
  real: boolean;
}

/** A media de alguns campos do 3D de um jogador (ex.: ['cornerKicks', 'crossing']). */
export const campo3d = (p: Player, campos: string[]): number => {
  const a = atributos3d(p);
  const todos = [...a.detalhe!.TEC, ...a.detalhe!.TAC, ...a.detalhe!.MEN, ...a.detalhe!.FIS, ...(a.detalhe!.GK || [])];
  const v = campos.map(c => todos.find(x => x.campo === c)?.valor).filter((x): x is number => typeof x === 'number');
  return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : 0;
};

const cache = new Map<string, Atributos3D>();

/** Os niveis inteiros que o XP de treino de um atributo ja comprou, a partir do valor base dele (a parte que ja conta). */
const bonusTreino = (p: Player, campo: string, base: number): number => niveisDeXp(base, (p.treino3d && p.treino3d[campo]) || 0, tetoDoAtributo(p, base));
/**
 * PROGRESSO DO XP ATE AO PROXIMO PONTO de um atributo (para a barra do modal do jogador): `xp` e o que ja se juntou para o proximo nivel, `custo` o que ele custa (`custoDoNivel`).
 * `valor` e o atributo ja com o treino; a base acha-se por tentativa (a que da os mesmos niveis ganhos). `null` sem XP positivo ou se o atributo esta no teto (nao sobe mais).
 */
export const progressoDeXp = (p: Player, campo: string, valor: number): { xp: number; custo: number } | null => {
  const total = (p.treino3d && p.treino3d[campo]) || 0;
  if (!(total > 0)) return null;
  for (let n = 0; n <= NIVEIS_MAX_TREINO; n++) {
    const base = valor - n;
    const teto = tetoDoAtributo(p, base);
    if (niveisDeXp(base, total, teto) !== n) continue;
    if (valor >= teto || n >= NIVEIS_MAX_TREINO) return null;
    return { xp: Math.max(0, total - xpDeNiveis(base, n)), custo: custoDoNivel(valor) };
  }
  return null;
};
/** Entra na chave do cache: o treino muda os atributos. */
const assinaturaTreino = (p: Player): string => (p.treino3d ? Object.keys(p.treino3d).map(c => c + Math.round(p.treino3d![c] || 0)).join(',') : '');

/*
O FISICO NO INICIO DA TEMPORADA: os dados de origem (3D e CountryData) trazem FIS medio ~62-66, baixo demais para atletas profissionais. A leitura sobe os sete campos fisicos (+FIS_SUBIDA, com
compressao acima de FIS_TETO_SOFT) para uma media de ~80-85; os dados originais nao sao alterados. Atributos gravados no editor (REAL_PLAYERS_JSON.attrs3d) e os GERADOS ja nascem no nivel certo e ficam de fora.
A RESISTENCIA (stamina) fica limitada ao FIS: nunca passa a media dos outros seis campos fisicos + FIS_FOLGA_STAMINA.
*/
const FIS_SUBIDA = 18, FIS_TETO_SOFT = 85, FIS_FOLGA_STAMINA = 3;
const subirFis = (v: number): number => { const x = v + FIS_SUBIDA; return x > FIS_TETO_SOFT ? FIS_TETO_SOFT + (x - FIS_TETO_SOFT) * 0.6 : x; };

export const atributos3d = (p: Player): Atributos3D => {
  const id = String(p.id).replace(/^p-/, '');
  const linha = D.jogadores[id];
  // Os derivados dependem dos atributos que o treino mexe, da idade e do OVR: a chave inclui-os.
  const chave = `${p.id}|${p.age}|${p.position}|${(p as any).playStyle || ''}|${p.def}|${p.pas}|${p.drb}|${p.sht}|${Math.round(p.skill)}|${tetoDoCt(p.teamId)}|${assinaturaTreino(p)}`;
  const c = cache.get(chave);
  if (c) return c;
  const b0 = baseDe(id);
  // Atributos gravados no editor (REAL_PLAYERS_JSON.attrs3d) mandam sobre o 3D original e sobre a geracao.
  const guardados = b0 && b0.attrs3d ? b0.attrs3d : null;
  const b = (linha || guardados) ? b0 : undefined;
  // O jogador do 3D: os campos do 3D + o ganho do treino (TEC/TAC) + o desvio de idade no fisico; o gerado: os atributos gerados (posicao, estilo, nivel e idade).
  const gerado = (guardados || linha) ? null : gerarAtributos(p.position, (p as any).playStyle || (PLAYSTYLE_DA_BASE as any)[String(p.id)], p.skill, String(p.id), { idade: p.age }).atributos;
  const dFis = b && b.idade ? curvaFisica(p.age) - curvaFisica(b.idade) : 0;
  const delta: Record<GrupoAtributo, number> = { TEC: 0, TAC: 0, MEN: 0, FIS: Math.round(dFis) };
  const detalhe = {} as Record<GrupoAtributo, { campo: string; nome: string; valor: number; base?: number }[]>;
  const valores: Record<string, number> = {};
  for (const k of ORDEM_GRUPOS) {
    detalhe[k] = GRUPOS[k].map(campo => {
      const baseBruta = gerado ? gerado[campo] : (guardados ? guardados[campo] : linha![IDX[campo]]) + delta[k];   // o atributo sem treino
      const valor = limitarAtributo(baseBruta + bonusTreino(p, campo, baseBruta));
      valores[campo] = valor;
      return { campo, nome: NOME_DO_CAMPO[campo] || campo, valor, base: baseBruta };
    });
  }
  // Fisico: sobe os dados de origem e limita a stamina ao FIS (ver FIS_SUBIDA).
  if (!gerado && !(b && b.editado)) for (const x of detalhe.FIS) { x.valor = limitarAtributo(subirFis(x.valor) - (fisMaisBaixo(p.position) ? FIS_A_MENOS_POR_POSICAO : 0)); valores[x.campo] = x.valor; }
  const stam = detalhe.FIS.find(x => x.campo === 'stamina');
  const outros = detalhe.FIS.filter(x => x.campo !== 'stamina');
  if (stam && outros.length) {
    const teto = Math.round(outros.reduce((s, x) => s + x.valor, 0) / outros.length) + FIS_FOLGA_STAMINA;
    if (stam.valor > teto) { stam.valor = limitarAtributo(teto); valores.stamina = stam.valor; }
  }
  // O goleiro leva tambem os atributos de baliza (50 a 99).
  let gkMedia: number | undefined;
  if (String(p.position) === 'GK') {
    const lista = ATRIBUTOS_GK.map(campo => {
      const baseGk = gerado ? (gerado[campo] ?? 50) : limitarAtributo(guardados && typeof guardados[campo] === 'number' ? guardados[campo] : (linha ? linha[IDX[campo]] : 50));
      // O treino individual tambem mexe nos atributos de baliza (mesmo XP, custo e tetos dos outros).
      const valor = limitarAtributo(baseGk + bonusTreino(p, campo, baseGk));
      valores[campo] = valor;
      return { campo, nome: NOME_DO_CAMPO[campo] || campo, valor, base: baseGk };
    });
    (detalhe as any).GK = lista;
    gkMedia = Math.round(lista.reduce((s, x) => s + x.valor, 0) / lista.length);
  }
  const g = calcularGrupos(valores);
  const r: Atributos3D = { tec: g.TEC, tac: g.TAC, men: g.MEN, fis: g.FIS, gk: gkMedia, altura: linha ? linha[IDX['height']] || undefined : undefined, peso: linha ? linha[IDX['weight']] || undefined : undefined, detalhe, real: !!(linha || guardados) };
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
  // Goleiro: os atributos de baliza (50 a 99) vao para o motor como `extrasGK`.
  let extrasGK: Record<string, number> | null = null;
  if (a.detalhe!.GK) { extrasGK = {}; for (const x of a.detalhe!.GK) extrasGK[x.campo] = x.valor; }
  return { atributos, extrasGK };
};

/*
A NACIONALIDADE (a bandeira do Overview): o codigo dos dados do 3D (`nationality`), onde o Brasil e 54 — o manager usa o id 45 para o Brasil e o mesmo id do 3D para os outros paises sul-americanos —;
sem dados do 3D (jogador gerado ou europeu), o pais do clube. Devolve o id do pais (o nome do ficheiro em /Assets/Bandeiras) ou null.
*/
const PAIS_DO_3D: Record<string, string> = { '54': '45' };
export const paisDoJogador = (p: Player, paisDoClube?: string | number): string | null => {
  const id = String(p.id).replace(/^p-/, '');
  const linha = D.jogadores[id];
  const local = jogadorLocalPorId(id);
  // Jogador dos dados locais: o codigo do jogo de origem so vale com bandeira conhecida; sem ela fica sem bandeira (nunca a do clube, que seria enganadora).
  if (local && local.nationality) return bandeiraDoCodigo(local.nationality);
  const cod = linha ? String(linha[IDX['nationality']] || '') : '';
  if (cod && cod !== '0') return PAIS_DO_3D[cod] || cod;
  if (paisDoClube === undefined || paisDoClube === null || paisDoClube === '') return null;
  const c = String(paisDoClube);
  const porId = (REAL_COUNTRIES_JSON as any[]).find(x => String(x.id) === c);
  const porNome = (REAL_COUNTRIES_JSON as any[]).find(x => String(x.name).toLowerCase() === c.toLowerCase());
  return String((porId || porNome)?.id ?? '') || null;
};

/**
 * REGRESSAO POR IDADE (OnSeasonEnd): devolve o `treino3d` novo do jogador depois de perder niveis inteiros, segundo `regressaoPorIdade` (idade inteira).
 * A perda vale para cada atributo do grupo (TEC/TAC/MEN/FIS; a stamina tem a sua propria queda) e nunca leva um atributo abaixo de 50.
 * Cada atributo que cai perde tambem os pontos de treino parciais (o "banco de GROWTH" zera). Devolve `undefined` se nada mudou.
 * Nota: o FIS dos dados de origem passa por `subirFis` (compressao acima de 85) e a stamina e limitada ao FIS, por isso a queda mostrada pode ser menor que a pedida.
 */
export const regredirPorIdade = (p: Player): Record<string, number> | undefined => {
  const q = regressaoPorIdade(Math.floor(p.age));
  if (!q.FIS && !q.STAMINA && !q.TEC && !q.TAC && !q.MEN) return undefined;
  const a = atributos3d(p);
  const t3: Record<string, number> = { ...(p.treino3d || {}) };
  let mudou = false;
  for (const k of ORDEM_GRUPOS) {
    for (const x of a.detalhe![k]) {
      const queda = x.campo === 'stamina' ? q.STAMINA : q[k];
      const perda = Math.min(queda, Math.max(0, x.valor - 50));
      if (perda <= 0) continue;
      const base = typeof x.base === 'number' ? x.base : x.valor;
      t3[x.campo] = xpDeNiveis(base, niveisDeXp(base, t3[x.campo] || 0, tetoDoAtributo(p, base)) - perda);   // niveis inteiros, cofre zerado
      mudou = true;
    }
  }
  return mudou ? t3 : undefined;
};

/**
 * MIGRACAO de um save antigo: o `treino3d` era em pontos (25 pontos = +1 nivel); passa a XP sem perder os niveis ganhos (cada nivel vale o custo dele a partir da base) e
 * converte o parcial a XP_POR_PONTO por ponto. Devolve `undefined` se o jogador nao tinha treino.
 */
export const migrarTreinoParaXp = (p: Player): Record<string, number> | undefined => {
  const t3 = p.treino3d;
  if (!t3 || !Object.keys(t3).length) return undefined;
  const sem = atributos3d({ ...p, treino3d: {} });
  const bases: Record<string, number> = {};
  for (const k of ORDEM_GRUPOS) for (const x of sem.detalhe![k]) bases[x.campo] = typeof x.base === 'number' ? x.base : x.valor;
  const novo: Record<string, number> = {};
  for (const [campo, pontos] of Object.entries(t3)) {
    const base = bases[campo] ?? 60;
    const n = Math.floor(pontos / 25);
    novo[campo] = xpDeNiveis(base, n) + (pontos - n * 25) * XP_POR_PONTO;
  }
  return novo;
};

/*
TREINO INDIVIDUAL (atividade `individual`, aba Tactics): cada jogador treina os atributos que o utilizador marcou no overview dele — ate `INDIVIDUAL_MAX` de UMA area (3 em TEC/TAC/FIS, 2 no mental).
Sem nenhum marcado, o sistema escolhe os atributos MAIS IMPORTANTES PARA A POSICAO (`CHAVES_POR_POSICAO`), da area em que eles estao mais fracos.
*/
export type AreaIndividual = GrupoAtributo | 'GK';
export const INDIVIDUAL_MAX: Record<AreaIndividual, number> = { TEC: 3, TAC: 3, FIS: 3, MEN: 2, GK: 3 };
/** A area (TEC/TAC/MEN/FIS, ou GK nos atributos de baliza) de um campo, ou null (desconhecido). */
export const areaDoCampo = (campo: string): AreaIndividual | null => ORDEM_GRUPOS.find(g => GRUPOS[g].indexOf(campo) >= 0) || (ATRIBUTOS_GK.indexOf(campo) >= 0 ? 'GK' : null);

/** A nova lista depois de clicar em `campo`: tira-o se estava; senao poe-o. Outra area limpa a lista; passar do maximo da area tira o mais antigo. */
export const alternarIndividual = (atual: string[] | undefined, campo: string): string[] => {
  const area = areaDoCampo(campo);
  if (!area) return atual || [];
  const sel = (atual || []).filter(c => areaDoCampo(c) !== null);
  if (sel.indexOf(campo) >= 0) return sel.filter(c => c !== campo);
  const mesmaArea = sel.length > 0 && areaDoCampo(sel[0]) === area;
  const nova = mesmaArea ? [...sel, campo] : [campo];
  while (nova.length > INDIVIDUAL_MAX[area]) nova.shift();
  return nova;
};

/** Os atributos que o jogador treina no `individual` agora: os marcados (validos, de uma area, dentro do maximo) ou, sem nenhum, os mais fracos de uma area (`auto: true`). */
export const atributosIndividuais = (p: Player): { campos: string[]; auto: boolean } => {
  const marcados = (p.treinoIndividual || []).filter(c => areaDoCampo(c) !== null);
  if (marcados.length) {
    const area = areaDoCampo(marcados[0])!;
    const doArea = marcados.filter(c => areaDoCampo(c) === area).slice(0, INDIVIDUAL_MAX[area]);
    if (doArea.length) return { campos: doArea, auto: false };
  }
  const a = atributos3d(p);
  // GOLEIRO sem marcados: os atributos de baliza mais importantes (area GK), sempre. Antes o automatico escolhia a area de media mais baixa, e o goleiro (fraco no passe, controle...) caia quase sempre na area TEC.
  if (String(p.position) === 'GK' && a.detalhe && a.detalhe.GK) {
    const presentes = new Set(a.detalhe.GK.map(x => x.campo));
    const chavesGk = ((CHAVES_POR_POSICAO.GK && CHAVES_POR_POSICAO.GK.GK) || []).filter(c => presentes.has(c)).slice(0, INDIVIDUAL_MAX.GK);
    if (chavesGk.length) return { campos: chavesGk, auto: true };
  }
  // Sem marcados: os atributos MAIS IMPORTANTES PARA A POSICAO (CHAVES_POR_POSICAO), da area em que eles estao mais fracos (menor media dos atributos-chave da area). O goleiro tem tambem a area GK.
  const chaves = CHAVES_POR_POSICAO[String(p.position)];
  let melhor: AreaIndividual | null = null, menor = Infinity, escolhidos: string[] = [];
  if (chaves) {
    for (const g of [...ORDEM_GRUPOS, 'GK'] as AreaIndividual[]) {
      const linhas = (a.detalhe as any)[g] as { campo: string; valor: number }[] | undefined;
      if (!linhas) continue;
      const valores = Object.fromEntries(linhas.map(x => [x.campo, x.valor]));
      const lista = (chaves[g] || []).filter(c => typeof valores[c] === 'number').slice(0, INDIVIDUAL_MAX[g]);
      if (!lista.length) continue;
      const media = lista.reduce((s, c) => s + valores[c], 0) / lista.length;
      if (media < menor) { menor = media; melhor = g; escolhidos = lista; }
    }
  }
  if (melhor) return { campos: escolhidos, auto: true };
  // Posicao sem tabela: os mais fracos da area de media mais baixa.
  let pior: GrupoAtributo = 'TEC', menorArea = Infinity;
  for (const g of ORDEM_GRUPOS) {
    const m = g === 'TEC' ? a.tec : g === 'TAC' ? a.tac : g === 'MEN' ? a.men : a.fis;
    if (m < menorArea) { menorArea = m; pior = g; }
  }
  const campos = [...a.detalhe![pior]].sort((x, y) => x.valor - y.valor).slice(0, INDIVIDUAL_MAX[pior]).map(x => x.campo);
  return { campos, auto: true };
};

/** Os atributos-chave de cada posicao por area (os que o overview realca): 3 de TEC, 3 de TAC, 2 do mental e 3 de FIS. */
export const CHAVES_POR_POSICAO: Record<string, Partial<Record<'TEC' | 'TAC' | 'MEN' | 'FIS' | 'GK', string[]>>> = {
  GK: { TEC: ['passing', 'longPassing', 'ballControl'], TAC: ['posDefense', 'tacticalAwa', 'vision'], MEN: ['reactions', 'composure'], FIS: ['jumping', 'agility', 'balance'], GK: ['reflexes', 'diving', 'handling'] },
  CB: { TEC: ['headAccurancy', 'passing', 'ballControl'], TAC: ['tackleStanding', 'manMarking', 'posDefense'], MEN: ['aggression', 'composure'], FIS: ['strength', 'jumping', 'speed'] },
  LB: { TEC: ['crossing', 'passing', 'dribbling'], TAC: ['tackleStanding', 'posDefense', 'manMarking'], MEN: ['consistency', 'reactions'], FIS: ['speed', 'stamina', 'acceleration'] },
  RB: { TEC: ['crossing', 'passing', 'dribbling'], TAC: ['tackleStanding', 'posDefense', 'manMarking'], MEN: ['consistency', 'reactions'], FIS: ['speed', 'stamina', 'acceleration'] },
  DM: { TEC: ['passing', 'ballControl', 'longPassing'], TAC: ['tackleStanding', 'posDefense', 'tacticalAwa'], MEN: ['aggression', 'composure'], FIS: ['stamina', 'strength', 'balance'] },
  CM: { TEC: ['passing', 'ballControl', 'longPassing'], TAC: ['vision', 'tacticalAwa', 'posDefense'], MEN: ['consistency', 'composure'], FIS: ['stamina', 'balance', 'agility'] },
  LM: { TEC: ['crossing', 'dribbling', 'ballControl'], TAC: ['posOffense', 'vision', 'tacticalAwa'], MEN: ['consistency', 'composure'], FIS: ['speed', 'stamina', 'acceleration'] },
  RM: { TEC: ['crossing', 'dribbling', 'ballControl'], TAC: ['posOffense', 'vision', 'tacticalAwa'], MEN: ['consistency', 'composure'], FIS: ['speed', 'stamina', 'acceleration'] },
  AM: { TEC: ['passing', 'dribbling', 'ballControl'], TAC: ['vision', 'posOffense', 'tacticalAwa'], MEN: ['composure', 'reactions'], FIS: ['agility', 'balance', 'acceleration'] },
  LW: { TEC: ['dribbling', 'crossing', 'ballControl'], TAC: ['posOffense', 'vision', 'tacticalAwa'], MEN: ['composure', 'reactions'], FIS: ['speed', 'acceleration', 'agility'] },
  RW: { TEC: ['dribbling', 'crossing', 'ballControl'], TAC: ['posOffense', 'vision', 'tacticalAwa'], MEN: ['composure', 'reactions'], FIS: ['speed', 'acceleration', 'agility'] },
  SS: { TEC: ['finishing', 'dribbling', 'ballControl'], TAC: ['posOffense', 'vision', 'tacticalAwa'], MEN: ['composure', 'reactions'], FIS: ['acceleration', 'agility', 'speed'] },
  ST: { TEC: ['finishing', 'shotPower', 'headAccurancy'], TAC: ['posOffense', 'tacticalAwa', 'vision'], MEN: ['composure', 'reactions'], FIS: ['strength', 'acceleration', 'speed'] }
};

/*
O SUB-20 SOBE NOS ATRIBUTOS, DIA A DIA: a evolucao do proximo mes ja esta sorteada (`evolucaoMensal`: semente por jogador e mes) e aplica-se no dia 1. Se ela da ganho de OVR, sorteia-se (mesma semente) UM GRUPO de
atributos — TEC, TAC, FIS ou MEN (e GK, nos goleiros) — e TODOS os atributos desse grupo ganham o XP de +N niveis (N = o ganho de OVR, no minimo 1) aos poucos durante o mes (dia / dias do mes). Assim os
atributos do grupo (e a barra de XP do Summary) crescem durante o mes e, no dia 1, o OVR novo assenta. E SEM ESTADO: o XP de hoje sai so da data e do sorteio (recarregar nao muda nada), por isso substitui o `treino3d`.
*/
export const treinoDoMes = (p: Player, hoje: string): Record<string, number> | undefined => {
  const ano = Number(hoje.slice(0, 4)), mes = Number(hoje.slice(5, 7)), dia = Number(hoje.slice(8, 10));
  if (!ano || !mes || !dia) return undefined;
  const fracao = Math.min(1, dia / new Date(ano, mes, 0).getDate());
  const prox = proximoMes(mesDe(hoje));
  const { jogador } = evolucaoMensal(p, prox);
  const dSkill = jogador.skill - p.skill;
  if (dSkill <= 0) return undefined;
  const grupos: (GrupoAtributo | 'GK')[] = String(p.position) === 'GK' ? ['GK', 'TEC', 'TAC', 'FIS', 'MEN'] : ['TEC', 'TAC', 'FIS', 'MEN'];
  const grupo = grupos[Math.floor(criarRng(`${prox}|grupo|${p.id}`)() * grupos.length)];
  const a = atributos3d({ ...p, treino3d: undefined });
  const lista = grupo === 'GK' ? (a.detalhe!.GK || []) : a.detalhe![grupo];
  const out: Record<string, number> = {};
  for (const x of lista) out[x.campo] = xpDeNiveis(x.valor, dSkill) * fracao;
  return Object.keys(out).length ? out : undefined;
};

/*
OS COBRADORES ESCOLHIDOS PELOS ATRIBUTOS DO 3D (os que a aba Tactics mostra por baixo de cada funcao): escanteio = cornerKicks + crossing; falta longa = longPassing + freekicks; falta direta = freekicks + shotPower;
penalti = penalties + composure. Antes o sistema escolhia pelo passe (`pas`) e chute (`sht`) antigos, que nao sao estes numeros. Regista-se em types.ts (`resolveSetPieceTakers`).
*/
const CAMPOS_DO_COBRADOR: Record<string, string[]> = {
  cornerL: ['cornerKicks', 'crossing'], cornerR: ['cornerKicks', 'crossing'], freeKickLong: ['longPassing', 'freekicks'],
  freeKickDirectL: ['freekicks', 'shotPower'], freeKickDirectR: ['freekicks', 'shotPower'], penalty: ['penalties', 'composure']
};
definirMedidaDeCobrador((p, role) => (CAMPOS_DO_COBRADOR[role] ? campo3d(p, CAMPOS_DO_COBRADOR[role]) : undefined));
