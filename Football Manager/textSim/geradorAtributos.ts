/*
GERADOR DE ATRIBUTOS DOS JOGADORES — posicao, Playing Style e nivel.

Os 31 atributos individuais (os do 3D) vivem SEMPRE entre 50 e 99 (`ATTR_MIN`, `ATTR_MAX`): a geracao, os modificadores de estilo, a edicao, a importacao e o salvamento passam por `limitarAtributo` /
`validarAtributos`. TEC, TAC, MEN e FIS sao MEDIAS calculadas (`calcularGrupos`), nunca sorteadas.

Ordem da geracao (`gerarAtributos`): posicao -> estilo (validado contra PLAYSTYLE_POSITIONS, a tabela unica) -> perfil da posicao (P1..P4) -> modificadores do estilo -> nivel-alvo (ajuste do overall
POSICIONAL, que so olha os atributos P1/P2 da funcao) -> variacao individual (pontos fortes e limitacoes relativas) -> limites 50..99. Determinista pela semente.

O FISICO e a excepcao ao nivel: um craque e um jogador fraco tem fisicos parecidos e o que o muda e a IDADE (`curvaFisica`), por isso os atributos fisicos centram-se na idade (com so um
toque do nivel). O goleiro usa os 31 atributos existentes como aproximacao (nao ha campos de baliza).
*/
import { Position, PlayStyle, PLAYSTYLE_POSITIONS } from '../types';

export const ATTR_MIN = 50;
export const ATTR_MAX = 99;

export type GrupoAtributo = 'TEC' | 'TAC' | 'MEN' | 'FIS';

// Os 31 atributos, agrupados (as chaves sao as do jogo de origem: ver NOME_DO_CAMPO em atributos3d.ts).
export const GRUPOS: Record<GrupoAtributo, string[]> = {
  TEC: ['ballControl', 'dribbling', 'finishing', 'shotPower', 'longShots', 'volleys', 'crossing', 'passing', 'longPassing', 'headAccurancy', 'freekicks', 'cornerKicks', 'penalties'],
  TAC: ['tackleStanding', 'tackleSliding', 'manMarking', 'posOffense', 'posDefense', 'vision', 'tacticalAwa'],
  MEN: ['aggression', 'reactions', 'composure', 'consistency'],
  FIS: ['acceleration', 'speed', 'agility', 'jumping', 'strength', 'stamina', 'balance']
};
export const TODOS_OS_ATRIBUTOS: string[] = [...GRUPOS.TEC, ...GRUPOS.TAC, ...GRUPOS.MEN, ...GRUPOS.FIS];
/** Os atributos de BALIZA (so o goleiro os mostra, tambem de 50 a 99): fora dos 31 de campo. */
export const ATRIBUTOS_GK: string[] = ['diving', 'handling', 'reflexes', 'posGK', 'onos', 'kicking'];
export type Atributos = Record<string, number>;

// Nome legivel -> chave (para escrever os perfis como no enunciado).
const K: Record<string, string> = {
  'Ball Control': 'ballControl', 'Dribbling': 'dribbling', 'Finishing': 'finishing', 'Shot Power': 'shotPower', 'Long Shots': 'longShots', 'Volleys': 'volleys', 'Crossing': 'crossing', 'Passing': 'passing',
  'Long Passing': 'longPassing', 'Heading': 'headAccurancy', 'Free Kicks': 'freekicks', 'Corners': 'cornerKicks', 'Penalties': 'penalties',
  'Standing Tackle': 'tackleStanding', 'Sliding Tackle': 'tackleSliding', 'Marking': 'manMarking', 'Attacking Positioning': 'posOffense', 'Defensive Positioning': 'posDefense', 'Vision': 'vision', 'Tactical Awareness': 'tacticalAwa',
  'Aggression': 'aggression', 'Reactions': 'reactions', 'Composure': 'composure', 'Consistency': 'consistency',
  'Diving': 'diving', 'Handling': 'handling', 'Reflexes': 'reflexes', 'GK Positioning': 'posGK', 'One on Ones': 'onos', 'Kicking': 'kicking',
  'Acceleration': 'acceleration', 'Speed': 'speed', 'Agility': 'agility', 'Jumping': 'jumping', 'Strength': 'strength', 'Stamina': 'stamina', 'Balance': 'balance'
};
const ks = (...nomes: string[]) => nomes.map(n => { if (!K[n]) throw new Error('atributo desconhecido: ' + n); return K[n]; });

/* ------------------------------------------------------------------ perfis por posicao (P1..P4); o que nao esta listado conta como P4 */
export type PosicaoPerfil = 'GK' | 'CB' | 'FB' | 'DM' | 'CM' | 'AM' | 'WM' | 'W' | 'SS' | 'CF';
interface Perfil { P1: string[]; P2: string[]; P3: string[]; P4: string[]; }
export const PERFIS: Record<PosicaoPerfil, Perfil> = {
  // Goleiro: com os atributos de baliza autorizados (ATRIBUTOS_GK) o perfil usa-os como P1/P2.
  GK: { P1: ks('Reflexes', 'Handling', 'GK Positioning', 'Diving', 'Reactions'), P2: ks('One on Ones', 'Kicking', 'Jumping', 'Composure', 'Tactical Awareness'), P3: ks('Passing', 'Long Passing', 'Strength', 'Consistency', 'Agility'), P4: ks('Speed', 'Acceleration', 'Balance', 'Finishing', 'Dribbling', 'Crossing', 'Corners', 'Penalties') },
  CB: { P1: ks('Marking', 'Defensive Positioning', 'Tactical Awareness', 'Standing Tackle', 'Heading'), P2: ks('Sliding Tackle', 'Strength', 'Jumping', 'Reactions', 'Composure'), P3: ks('Passing', 'Long Passing', 'Consistency', 'Aggression', 'Balance'), P4: ks('Corners', 'Crossing', 'Dribbling', 'Acceleration', 'Finishing') },
  FB: { P1: ks('Stamina', 'Speed', 'Acceleration', 'Defensive Positioning'), P2: ks('Standing Tackle', 'Marking', 'Crossing', 'Tactical Awareness'), P3: ks('Dribbling', 'Passing', 'Agility', 'Balance', 'Sliding Tackle'), P4: ks('Heading', 'Finishing', 'Penalties') },
  DM: { P1: ks('Defensive Positioning', 'Tactical Awareness', 'Standing Tackle', 'Marking'), P2: ks('Passing', 'Long Passing', 'Vision', 'Stamina', 'Composure'), P3: ks('Aggression', 'Sliding Tackle', 'Ball Control', 'Strength', 'Consistency'), P4: ks('Corners', 'Crossing', 'Volleys') },
  CM: { P1: ks('Passing', 'Vision', 'Tactical Awareness', 'Ball Control'), P2: ks('Stamina', 'Long Passing', 'Composure', 'Balance'), P3: ks('Dribbling', 'Defensive Positioning', 'Standing Tackle', 'Long Shots', 'Reactions'), P4: ks('Corners', 'Heading', 'Sliding Tackle') },
  AM: { P1: ks('Vision', 'Passing', 'Ball Control', 'Attacking Positioning'), P2: ks('Dribbling', 'Composure', 'Reactions', 'Finishing'), P3: ks('Long Shots', 'Acceleration', 'Agility', 'Consistency', 'Long Passing'), P4: ks('Sliding Tackle', 'Marking', 'Defensive Positioning') },
  WM: { P1: ks('Stamina', 'Crossing', 'Passing', 'Speed'), P2: ks('Acceleration', 'Dribbling', 'Ball Control', 'Vision'), P3: ks('Agility', 'Balance', 'Tactical Awareness', 'Attacking Positioning'), P4: ks('Heading', 'Sliding Tackle', 'Penalties') },
  W: { P1: ks('Acceleration', 'Speed', 'Dribbling', 'Ball Control'), P2: ks('Attacking Positioning', 'Finishing', 'Agility', 'Crossing'), P3: ks('Passing', 'Vision', 'Balance', 'Shot Power'), P4: ks('Marking', 'Sliding Tackle', 'Defensive Positioning') },
  SS: { P1: ks('Attacking Positioning', 'Ball Control', 'Finishing', 'Reactions'), P2: ks('Dribbling', 'Passing', 'Vision', 'Composure'), P3: ks('Acceleration', 'Agility', 'Long Shots', 'Balance'), P4: ks('Marking', 'Sliding Tackle', 'Defensive Positioning') },
  CF: { P1: ks('Finishing', 'Attacking Positioning', 'Reactions', 'Composure'), P2: ks('Shot Power', 'Ball Control', 'Heading', 'Strength'), P3: ks('Acceleration', 'Speed', 'Jumping', 'Volleys', 'Balance'), P4: ks('Corners', 'Defensive Positioning', 'Sliding Tackle') }
};
// Pesos iniciais (ajustaveis): quanto cada prioridade sobe/desce a tendencia do atributo em relacao ao nivel (`pontosPorPeso` pontos por 1.0 de peso acima de 1).
export const PESOS = { P1: 1.30, P2: 1.15, P3: 1.00, P4: 0.80 };
export const PARAMETROS = { pontosPorPeso: 30, ruido: 4.5, destaques: 2, limitacoes: 2, destaqueMin: 5, destaqueMax: 11, limitacaoMin: 5, limitacaoMax: 10, estiloMin: 2, estiloMax: 6, tolerancia: 1.0, fisNivel: 0.2 };

export const perfilDaPosicao = (pos: Position | string): PosicaoPerfil => {
  switch (String(pos)) {
    case 'GK': return 'GK';
    case 'CB': return 'CB';
    case 'LB': case 'RB': return 'FB';
    case 'DM': return 'DM';
    case 'CM': return 'CM';
    case 'AM': return 'AM';
    case 'LM': case 'RM': return 'WM';
    case 'LW': case 'RW': return 'W';
    case 'SS': return 'SS';
    default: return 'CF';   // ST (centroavante)
  }
};
export const getPositionAttributeProfile = (pos: Position | string) => PERFIS[perfilDaPosicao(pos)];

const prioridade = (perfil: Perfil, chave: string): 'P1' | 'P2' | 'P3' | 'P4' =>
  perfil.P1.includes(chave) ? 'P1' : perfil.P2.includes(chave) ? 'P2' : perfil.P3.includes(chave) ? 'P3' : 'P4';

/* ------------------------------------------------------------------ Playing Styles: o que cada um prioriza (modificadores +2..+6, so nos atributos listados) */
export const MODIFICADORES_DO_ESTILO: Record<Exclude<PlayStyle, 'None'>, string[]> = {
  'Goal Poacher': ks('Attacking Positioning', 'Reactions', 'Finishing', 'Acceleration', 'Composure'),
  'Dummy Runner': ks('Attacking Positioning', 'Acceleration', 'Stamina', 'Reactions', 'Tactical Awareness'),
  'Fox in the Box': ks('Attacking Positioning', 'Finishing', 'Reactions', 'Composure', 'Ball Control'),
  'Target Man': ks('Strength', 'Heading', 'Jumping', 'Ball Control', 'Passing', 'Composure'),
  'Creative Playmaker': ks('Vision', 'Passing', 'Ball Control', 'Long Passing', 'Composure'),
  'Prolific Winger': ks('Speed', 'Acceleration', 'Dribbling', 'Crossing', 'Attacking Positioning'),
  'Roaming Flank': ks('Dribbling', 'Ball Control', 'Acceleration', 'Agility', 'Passing', 'Vision'),
  'Cross Specialist': ks('Crossing', 'Passing', 'Vision', 'Ball Control', 'Long Passing'),
  'Classic No. 10': ks('Ball Control', 'Passing', 'Vision', 'Composure', 'Long Passing'),
  'Hole Player': ks('Attacking Positioning', 'Acceleration', 'Reactions', 'Stamina', 'Finishing'),
  'Box-to-Box': ks('Stamina', 'Tactical Awareness', 'Passing', 'Acceleration', 'Defensive Positioning', 'Standing Tackle'),
  'The Destroyer': ks('Aggression', 'Standing Tackle', 'Sliding Tackle', 'Marking', 'Defensive Positioning', 'Strength'),
  'Orchestrator': ks('Passing', 'Long Passing', 'Vision', 'Ball Control', 'Composure', 'Tactical Awareness'),
  'Anchor Man': ks('Defensive Positioning', 'Marking', 'Tactical Awareness', 'Standing Tackle', 'Strength'),
  'Build Up': ks('Passing', 'Long Passing', 'Ball Control', 'Composure', 'Tactical Awareness'),
  'Offensive Full-back': ks('Stamina', 'Speed', 'Acceleration', 'Crossing', 'Passing'),
  'Full-back Finisher': ks('Attacking Positioning', 'Finishing', 'Ball Control', 'Acceleration', 'Dribbling'),
  'Defensive Full-back': ks('Defensive Positioning', 'Marking', 'Standing Tackle', 'Tactical Awareness', 'Strength'),
  'Extra Frontman': ks('Attacking Positioning', 'Heading', 'Jumping', 'Strength', 'Stamina', 'Finishing'),
  'Offensive Goalkeeper': ks('Speed', 'Acceleration', 'Reactions', 'Passing', 'Long Passing', 'Tactical Awareness'),
  'Defensive Goalkeeper': ks('Reactions', 'Composure', 'Consistency', 'Tactical Awareness', 'Strength', 'Jumping')
};
export const getPlayingStyleModifiers = (estilo: PlayStyle | string): string[] => (MODIFICADORES_DO_ESTILO as any)[estilo] || [];

/** Os estilos que a posicao admite — a tabela unica PLAYSTYLE_POSITIONS (types.ts), partilhada com o editor e o motor. */
export const getCompatiblePlayingStyles = (pos: Position | string): PlayStyle[] =>
  (Object.keys(PLAYSTYLE_POSITIONS) as PlayStyle[]).filter(s => s !== 'None' && PLAYSTYLE_POSITIONS[s].includes(pos as Position));
export const estiloCompativel = (pos: Position | string, estilo: PlayStyle | string | undefined | null): boolean =>
  !!estilo && estilo !== 'None' && !!(PLAYSTYLE_POSITIONS as any)[estilo] && (PLAYSTYLE_POSITIONS as any)[estilo].includes(pos);

/* ------------------------------------------------------------------ limites, validacao, medias */
export const limitarAtributo = (v: number): number => {
  const n = Math.round(Number.isFinite(v) ? v : ATTR_MIN);
  return Math.max(ATTR_MIN, Math.min(ATTR_MAX, n));
};
/** Valida os 31 atributos: inteiros entre 50 e 99 e nenhum em falta. Nao altera nada. */
export const validarAtributos = (a: Record<string, any> | null | undefined, goleiro = false): { ok: boolean; erros: string[] } => {
  const erros: string[] = [];
  if (!a) return { ok: false, erros: ['sem atributos'] };
  for (const k of (goleiro ? [...TODOS_OS_ATRIBUTOS, ...ATRIBUTOS_GK] : TODOS_OS_ATRIBUTOS)) {
    const v = a[k];
    if (v === undefined || v === null || v === '') erros.push(`${k}: vazio`);
    else if (typeof v !== 'number' || !Number.isFinite(v)) erros.push(`${k}: nao numerico`);
    else if (!Number.isInteger(v)) erros.push(`${k}: nao inteiro (${v})`);
    else if (v < ATTR_MIN) erros.push(`${k}: ${v} abaixo do minimo ${ATTR_MIN}`);
    else if (v > ATTR_MAX) erros.push(`${k}: ${v} acima do maximo ${ATTR_MAX}`);
  }
  return { ok: erros.length === 0, erros };
};
/** O salvamento: devolve uma copia com todos os atributos limitados a 50..99 (e os em falta no minimo). */
export const normalizarAtributos = (a: Record<string, any>, goleiro = false): Atributos => {
  const r: Atributos = {};
  for (const k of (goleiro ? [...TODOS_OS_ATRIBUTOS, ...ATRIBUTOS_GK] : TODOS_OS_ATRIBUTOS)) r[k] = limitarAtributo(Number(a?.[k]));
  return r;
};
/** TEC, TAC, MEN e FIS: medias aritmeticas dos seus atributos, arredondadas so no fim. */
export const calcularGrupos = (a: Atributos): Record<GrupoAtributo, number> => {
  const m = (g: GrupoAtributo) => Math.round(GRUPOS[g].reduce((s, k) => s + a[k], 0) / GRUPOS[g].length);
  return { TEC: m('TEC'), TAC: m('TAC'), MEN: m('MEN'), FIS: m('FIS') };
};
/** O overall POSICIONAL: so os atributos P1 e P2 da funcao (P1 pesa o dobro do P2), separado das medias TEC/TAC/MEN/FIS. */
export const calcularOverallPosicional = (pos: Position | string, a: Atributos): number => {
  const p = getPositionAttributeProfile(pos);
  let soma = 0, peso = 0;
  for (const k of p.P1) { soma += a[k] * 2; peso += 2; }
  for (const k of p.P2) { soma += a[k]; peso += 1; }
  return soma / peso;
};

/* ------------------------------------------------------------------ a geracao */
export const criarRng = (semente: number | string) => {
  let a = typeof semente === 'number' ? semente >>> 0 : (() => { let h = 2166136261; for (let i = 0; i < semente.length; i++) { h ^= semente.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; })();
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
};
const gauss = (r: () => number) => { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

/** O fisico segundo a idade: pico dos 24 aos 29; antes -1.5/ano, depois -1.8/ano. */
export const curvaFisica = (idade: number): number => idade < 24 ? -(24 - idade) * 1.5 : idade > 29 ? -(idade - 29) * 1.8 : 0;

export interface OpcoesGeracao { idade?: number; }
export interface ResultadoGeracao { atributos: Atributos; grupos: Record<GrupoAtributo, number>; overallPosicional: number; nivelPedido: number; diferenca: number; estilo: PlayStyle; }

/**
 * Gera os 31 atributos de um jogador. `estilo` incompativel com a posicao e ignorado (escolhe-se um compativel pela semente).
 * `nivelAlvo` e o overall posicional pretendido (50..99).
 */
export const gerarAtributos = (posicao: Position | string, estilo: PlayStyle | string | undefined, nivelAlvo: number, semente: number | string, opcoes: OpcoesGeracao = {}): ResultadoGeracao => {
  const r = criarRng(semente);
  const perfil = getPositionAttributeProfile(posicao);
  const compat = getCompatiblePlayingStyles(posicao);
  const est: PlayStyle = (estilo && estiloCompativel(posicao, estilo)) ? estilo as PlayStyle : (compat.length ? compat[Math.floor(r() * compat.length)] : 'None');
  const mods = getPlayingStyleModifiers(est);
  const nivel = Math.max(ATTR_MIN, Math.min(ATTR_MAX, nivelAlvo));
  const P = PARAMETROS;
  const idade = opcoes.idade ?? 26;
  const fisIdade = 74 + curvaFisica(idade);   // o fisico acompanha a idade, nao a qualidade
  const a: Record<string, number> = {};

  // pontos fortes e limitacoes individuais (fora do perfil rigido): poucos atributos sobem ou descem, para nao haver jogadores "completos" nem planos
  const gk = perfilDaPosicao(posicao) === 'GK';
  const lista = gk ? [...TODOS_OS_ATRIBUTOS, ...ATRIBUTOS_GK] : TODOS_OS_ATRIBUTOS;
  const candidatos = lista.slice();
  const sorteia = (n: number) => { const o: string[] = []; for (let i = 0; i < n; i++) { const j = Math.floor(r() * candidatos.length); o.push(candidatos[j]); } return o; };
  const fortes = new Set(sorteia(P.destaques)), fracos = new Set(sorteia(P.limitacoes));

  for (const k of lista) {
    const pr = prioridade(perfil, k);
    const peso = PESOS[pr];
    const fisico = GRUPOS.FIS.includes(k);
    // centro: o nivel (ou, no fisico, a idade com um toque do nivel) mais o desvio da prioridade da posicao
    const centro = fisico ? (P.fisNivel * nivel + (1 - P.fisNivel) * fisIdade) : nivel;
    let v = centro + (peso - 1) * P.pontosPorPeso * (fisico ? 0.35 : 1);
    if (mods.includes(k)) v += P.estiloMin + r() * (P.estiloMax - P.estiloMin);
    v += gauss(r) * P.ruido;
    if (fortes.has(k)) v += P.destaqueMin + r() * (P.destaqueMax - P.destaqueMin);
    if (fracos.has(k)) v -= P.limitacaoMin + r() * (P.limitacaoMax - P.limitacaoMin);
    a[k] = v;   // sem arredondar nem limitar ainda
  }
  // aproxima o overall posicional do nivel-alvo (desloca os atributos NAO fisicos juntos), sem eliminar a especializacao
  const naoFis = lista.filter(k => !GRUPOS.FIS.includes(k));
  const lim = (v: number) => Math.max(ATTR_MIN, Math.min(ATTR_MAX, v));
  let ajustado: Record<string, number> = {};
  for (let it = 0; it < 8; it++) {
    for (const k of lista) ajustado[k] = lim(a[k]);
    const ov = calcularOverallPosicional(posicao, ajustado);
    const dif = nivel - ov;
    if (Math.abs(dif) <= P.tolerancia) break;
    for (const k of naoFis) a[k] += dif;
  }
  const finais: Atributos = {};
  for (const k of lista) finais[k] = limitarAtributo(ajustado[k]);
  const ovr = calcularOverallPosicional(posicao, finais);
  return { atributos: finais, grupos: calcularGrupos(finais), overallPosicional: Math.round(ovr * 10) / 10, nivelPedido: nivel, diferenca: Math.round((ovr - nivel) * 10) / 10, estilo: est };
};

export const generatePlayerAttributes = gerarAtributos;
export const calculateAttributeGroups = calcularGrupos;
export const calculatePositionalOverall = calcularOverallPosicional;
export const validatePlayerAttributes = validarAtributos;
