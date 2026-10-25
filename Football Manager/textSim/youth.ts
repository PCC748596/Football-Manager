/*
CATEGORIAS DE BASE (SUB-20) — 20 jovens de 15 a 20 anos por clube, com a MESMA estrutura (`Player`) dos profissionais, guardados a parte em `BaseState` (e nao no array
`players` do jogo, que alimenta elenco, folha salarial, treino e motor de partidas: o Sub-20 nao joga, nao treina com o time e nao entra nesses calculos).

O que este modulo faz (funcoes puras; o contexto do jogo so chama `processarBase` quando a data muda e guarda o resultado):
  . gerarJovem / completarBase: gera os jovens (atributos, overall, potencial real e estimado, contrato inicial) e MANTEM sempre 20 por clube;
  . evolucaoMensal: o desenvolvimento de cada jovem, uma vez por mes (sorteio com semente por jogador e mes: repetir a chamada da o mesmo resultado);
  . atualizarIdades: a idade acompanha a data de nascimento; quem faz 21 anos sai da base (nunca e promovido sozinho) e a vaga e reposta;
  . promover: tira o jovem da base (a promocao e sempre manual) e repoe a vaga.

Escala: atributos, overall e potencial dos jovens ficam entre 50 e 99. O potencial real (50-99) e interno; o treinador ve estrelas de uma ESTIMATIVA dele.
*/
import { Player, Position, PlayStyle, PLAYSTYLE_POSITIONS } from '../types';
import { calcularSkill, pesosDoOverall } from './overall';
import { valorDeMercado } from './valuation';
import { nomeDoClube } from './nomes';
import { Rnd, criarRng, idadeEm, mesDe, novoContrato, somarAnos, somarMeses } from './contracts';

export const TAMANHO_BASE = 20;
export const IDADE_MIN = 15;
export const IDADE_MAX = 20;
export const IDADE_SAIDA = 21;
export const IDADE_ESTILO = 18;   // a partir daqui o jovem tem PlayStyle (antes disso ainda nao tem um perfil definido)
const ATTRS = ['def', 'pas', 'drb', 'sht'] as const;
type Attr = typeof ATTRS[number];

export interface MudancaAtributo { attr: Attr; de: number; para: number; }
export interface RelatorioMes {
  mes: string;                // yyyy-mm do processamento
  nome: string; idade: number; posicao: Position;
  ovrAntes: number; ovrDepois: number; delta: number;
  estrelas: number;           // da estimativa do potencial NESSE mes
  mudancas: MudancaAtributo[];   // so os atributos que de fato mudaram
  estilo?: { de?: PlayStyle; para: PlayStyle };   // quando o PlayStyle foi definido ou mudou neste mes
}
export interface BaseState {
  jogadores: Player[];                          // todos os clubes; `teamId` diz de quem e
  mesProcessado: string;                        // yyyy-mm do ultimo mes ja processado (garante uma vez por mes mesmo apos recarregar)
  proximoId: number;                            // contador dos ids `p-<n>` da base
  relatorios: Record<string, RelatorioMes[]>;   // por id de jogador, os ultimos meses (mais novo por ultimo)
}
export const MESES_DE_RELATORIO = 12;

// -- potencial e estrelas --
/** Faixas pedidas: 50-54 = 1, 55-64 = 2, 65-74 = 3, 75-84 = 4, 85-99 = 5. */
export const estrelasDePotencial = (v: number): number => (v >= 85 ? 5 : v >= 75 ? 4 : v >= 65 ? 3 : v >= 55 ? 2 : 1);
export const estrelasDoJogador = (p: Player): number => estrelasDePotencial(p.potentialEstimate ?? p.potential ?? 50);

const limitar = (v: number, min = 50, max = 99) => Math.max(min, Math.min(max, v));
const normal = (rnd: Rnd) => { const u = Math.max(1e-9, rnd()), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
// O olheiro erra mais nos mais novos: 8 pontos aos 15 anos, ~1,5 aos 20.
const incerteza = (idade: number) => Math.max(1.5, 8 - (idade - IDADE_MIN) * 1.3);
const estimar = (potencial: number, idade: number, rnd: Rnd, anterior?: number): number => {
  const nova = limitar(Math.round(potencial + normal(rnd) * incerteza(idade)));
  return anterior === undefined ? nova : limitar(Math.round(0.6 * anterior + 0.4 * nova));
};

// -- posicoes: 20 vagas (2 GK, 3 CB, 2 LB, 2 RB, 2 DM, 3 CM, 1 AM, 1 LW, 1 RW, 2 ST, 1 SS) --
const MODELO: Partial<Record<Position, number>> = {
  [Position.GK]: 2, [Position.CB]: 3, [Position.LB]: 2, [Position.RB]: 2, [Position.DM]: 2, [Position.CM]: 3,
  [Position.AM]: 1, [Position.LW]: 1, [Position.RW]: 1, [Position.ST]: 2, [Position.SS]: 1
};
const POSICOES = Object.keys(MODELO) as Position[];
// Idades-alvo (20): 3 de 15, 3 de 16, 4 de 17, 4 de 18, 3 de 19, 3 de 20.
const MODELO_IDADES: Record<number, number> = { 15: 3, 16: 3, 17: 4, 18: 4, 19: 3, 20: 3 };

const posicaoQueFalta = (doClube: Player[], rnd: Rnd, preferida?: Position): Position => {
  const n: Partial<Record<Position, number>> = {};
  doClube.forEach(p => { n[p.position] = (n[p.position] || 0) + 1; });
  let melhor = -99, cand: Position[] = [];
  POSICOES.forEach(pos => { const falta = (MODELO[pos] || 0) - (n[pos] || 0); if (falta > melhor) { melhor = falta; cand = [pos]; } else if (falta === melhor) cand.push(pos); });
  if (preferida && cand.includes(preferida)) return preferida;
  return cand[Math.floor(rnd() * cand.length)];
};
const idadeQueFalta = (doClube: Player[], rnd: Rnd): number => {
  const n: Record<number, number> = {};
  doClube.forEach(p => { n[p.age] = (n[p.age] || 0) + 1; });
  let melhor = -99, cand: number[] = [];
  for (let a = IDADE_MIN; a <= IDADE_MAX; a++) { const falta = (MODELO_IDADES[a] || 0) - (n[a] || 0); if (falta > melhor) { melhor = falta; cand = [a]; } else if (falta === melhor) cand.push(a); }
  return cand[Math.floor(rnd() * cand.length)];
};

// -- atributos: o teto de cada um segue o potencial e o peso da posicao (a media ponderada dos tetos e o proprio potencial) --
const S_PERFIL = 10;
const perfil = (pos: Position): Record<Attr, number> => {
  const w = pesosDoOverall(pos);
  const soma2 = w.def ** 2 + w.pas ** 2 + w.drb ** 2 + w.sht ** 2;
  const f = (x: number) => S_PERFIL * (x / soma2 - 1);
  return { def: f(w.def), pas: f(w.pas), drb: f(w.drb), sht: f(w.sht) };
};
const tetoDoAtributo = (pos: Position, potencial: number): Record<Attr, number> => {
  const o = perfil(pos);
  return { def: limitar(Math.round(potencial + o.def)), pas: limitar(Math.round(potencial + o.pas)), drb: limitar(Math.round(potencial + o.drb)), sht: limitar(Math.round(potencial + o.sht)) };
};
// A fracao do caminho ate ao potencial que o jovem ja fez, por idade.
const FRACAO_FEITA: Record<number, number> = { 15: 0.22, 16: 0.32, 17: 0.42, 18: 0.52, 19: 0.62, 20: 0.72 };
// A parte do hiato que se fecha por ano (mais novo = mais margem).
const K_ANO: Record<number, number> = { 15: 0.54, 16: 0.50, 17: 0.46, 18: 0.41, 19: 0.36, 20: 0.31 };
const kDaIdade = (idade: number) => K_ANO[Math.max(IDADE_MIN, Math.min(IDADE_MAX, idade))];


// -- PLAYSTYLE (a partir dos 18 anos): entre os estilos que servem a posicao (PLAYSTYLE_POSITIONS), o que mais combina com os atributos do jovem --
const PESOS_ESTILO: Partial<Record<PlayStyle, Partial<Record<Attr, number>>>> = {
  'Defensive Goalkeeper': { def: 1, pas: 0.2 }, 'Offensive Goalkeeper': { pas: 1, drb: 0.3 },
  'Offensive Full-back': { drb: 1, pas: 0.6, sht: 0.3 }, 'Full-back Finisher': { sht: 1, drb: 0.5 }, 'Defensive Full-back': { def: 1, pas: 0.2 },
  'The Destroyer': { def: 1 }, 'Anchor Man': { def: 1, pas: 0.3 }, 'Build Up': { pas: 1, def: 0.5 }, 'Extra Frontman': { sht: 1, def: 0.4 },
  'Box-to-Box': { def: 0.6, pas: 0.6, drb: 0.5, sht: 0.4 }, 'Hole Player': { sht: 0.8, drb: 0.7, pas: 0.3 }, 'Prolific Winger': { drb: 1, sht: 0.6 },
  'Roaming Flank': { drb: 0.8, sht: 0.8 }, 'Cross Specialist': { pas: 1, drb: 0.6 }, 'Creative Playmaker': { pas: 1, drb: 0.8, sht: 0.3 },
  'Classic No. 10': { pas: 1, sht: 0.6, drb: 0.4 }, 'Orchestrator': { pas: 1, def: 0.5 }, 'Goal Poacher': { sht: 1 }, 'Fox in the Box': { sht: 1, drb: 0.2 },
  'Target Man': { sht: 0.8, def: 0.6 }, 'Dummy Runner': { drb: 0.7, pas: 0.6, sht: 0.4 }
};
const encaixe = (estilo: PlayStyle, a: Record<Attr, number>): number => {
  const w = PESOS_ESTILO[estilo] || {};
  let soma = 0, pesos = 0;
  ATTRS.forEach(k => { const x = w[k] || 0; soma += a[k] * x; pesos += x; });
  return pesos ? soma / pesos : 0;
};
/** O PlayStyle da posicao que melhor combina com os atributos. Com `atual`, so troca quando outro ganha por uma margem (3 pontos): o estilo nao fica oscilando. */
export const escolherPlayStyle = (pos: Position, a: Record<Attr, number>, atual?: PlayStyle): PlayStyle => {
  const candidatos = (Object.keys(PLAYSTYLE_POSITIONS) as PlayStyle[]).filter(s => s !== 'None' && PLAYSTYLE_POSITIONS[s].includes(pos) && PESOS_ESTILO[s]);
  if (!candidatos.length) return 'None';
  let melhor = candidatos[0], nota = -1;
  candidatos.forEach(s => { const n = encaixe(s, a); if (n > nota) { nota = n; melhor = s; } });
  if (atual && atual !== 'None' && candidatos.includes(atual) && encaixe(atual, a) + 3 >= nota) return atual;
  return melhor;
};

const sortearPotencial = (rnd: Rnd) => limitar(Math.round(50 + 49 * limitar(0.36 + normal(rnd) * 0.21, 0, 1)));

const subirAteOPotencial = (pos: Position, a: Record<Attr, number>, potencial: number) => {
  // O overall nunca passa do potencial: baixa o maior atributo ate caber.
  let guarda = 60;
  while (calcularSkill(pos, a.def, a.pas, a.drb, a.sht) > potencial && guarda-- > 0) {
    const k = ATTRS.reduce((m, x) => (a[x] > a[m] ? x : m), 'def' as Attr);
    if (a[k] <= 50) break;
    a[k] -= 1;
  }
};

/** Gera um jovem do clube: `idade` de 15 a 20, na `posicao`, com o contrato assinado `hoje`. */
export const gerarJovem = (teamId: string, posicao: Position, idade: number, hoje: string, rnd: Rnd, id: string, nome: string, camisa: number): Player => {
  const potencial = sortearPotencial(rnd);
  const alvo = 50 + (potencial - 50) * limitar((FRACAO_FEITA[idade] ?? 0.6) + (rnd() - 0.5) * 0.12, 0.2, 0.95) + (rnd() - 0.5) * 3;
  const o = perfil(posicao);
  const a: Record<Attr, number> = { def: 0, pas: 0, drb: 0, sht: 0 };
  ATTRS.forEach(k => { a[k] = limitar(Math.round(alvo + o[k] + (rnd() - 0.5) * 6)); });
  subirAteOPotencial(posicao, a, potencial);
  const skill = calcularSkill(posicao, a.def, a.pas, a.drb, a.sht);
  // O salario segue a conta do `generatePlayer` (jovem: fator de idade 1.2); o VALOR e o de mercado (textSim/valuation.ts), calculado abaixo.
  const valorParaSalario = Math.round(150000 * Math.pow(1.1, Math.max(0, skill - 50)) * 1.2);
  const nascimento = somarAnos(hoje, -idade);
  const dias = Math.floor(rnd() * 358);
  const d = new Date(nascimento + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - dias);
  const jovem: Player = {
    id, name: nome, age: idade, position: posicao, skill,
    fitness: 80, morale: 60, goalsScored: 0, assists: 0, appearances: 0, weeklyGrowth: 0,
    value: 0, salary: Math.max(500, Math.round(valorParaSalario * 0.002)), contractExpiry: '',
    contract: novoContrato(idade, hoje, rnd),
    birthDate: d.toISOString().slice(0, 10),
    potential: potencial, potentialEstimate: estimar(potencial, idade, rnd),
    ...(idade >= IDADE_ESTILO ? { playStyle: escolherPlayStyle(posicao, a) } : {}),
    devAcc: { def: 0, pas: 0, drb: 0, sht: 0 },
    teamId, shirtNumber: camisa, def: a.def, pas: a.pas, drb: a.drb, sht: a.sht,
    trainingAccumulated: { def: 0, pas: 0, drb: 0, sht: 0, mor: 0 }, lastGrowth: { def: 0, pas: 0, drb: 0, sht: 0 }
  };
  return { ...jovem, value: valorDeMercado(jovem, hoje) };
};

const camisaLivre = (doClube: Player[]): number => { const usados = new Set(doClube.map(p => p.shirtNumber)); for (let n = 1; n <= 99; n++) if (!usados.has(n)) return n; return 99; };

/** Estado vazio (nenhum clube ainda). */
export const baseVazia = (hoje: string): BaseState => ({ jogadores: [], mesProcessado: mesDe(hoje), proximoId: 9000001, relatorios: {} });

/** Poe jovens num clube ate ter exatamente 20 (nunca passa). Devolve a base com a vaga preenchida; cada vaga recebe UM jovem. */
export const completarBase = (base: BaseState, teamId: string, hoje: string, preferida?: Position): BaseState => {
  let doClube = base.jogadores.filter(p => p.teamId === teamId);
  if (doClube.length >= TAMANHO_BASE) return base;
  const novos: Player[] = [];
  let proximoId = base.proximoId;
  while (doClube.length < TAMANHO_BASE) {
    const id = `p-${proximoId}`;
    const rnd = criarRng(`jovem|${teamId}|${proximoId}`);
    const pos = posicaoQueFalta(doClube, rnd, doClube.length === TAMANHO_BASE - 1 ? preferida : undefined);
    const idade = idadeQueFalta(doClube, rnd);
    let nome = nomeDoClube(rnd, teamId), t = 0;
    while (doClube.some(p => p.name === nome) && t++ < 20) nome = nomeDoClube(rnd, teamId);
    const j = gerarJovem(teamId, pos, idade, hoje, rnd, id, nome, camisaLivre(doClube));
    novos.push(j); doClube = [...doClube, j]; proximoId++;
  }
  return { ...base, jogadores: [...base.jogadores, ...novos], proximoId };
};

/** Garante 20 jovens em todos os clubes dados (clubes novos entram; os que ja tem 20 nao mudam: devolve a MESMA base). */
export const garantirBase = (base: BaseState | null, teamIds: string[], hoje: string): BaseState => {
  let b = base || baseVazia(hoje);
  const contagem = new Map<string, number>();
  b.jogadores.forEach(p => contagem.set(p.teamId, (contagem.get(p.teamId) || 0) + 1));
  teamIds.forEach(id => { if ((contagem.get(id) || 0) < TAMANHO_BASE) b = completarBase(b, id, hoje); });
  return b;
};

/** A evolucao de UM mes de UM jovem (sorteio com semente: o mesmo jogador no mesmo mes da sempre o mesmo resultado). */
export const evolucaoMensal = (p: Player, mes: string): { jogador: Player; relatorio: RelatorioMes } => {
  const rnd = criarRng(`${mes}|${p.id}`);
  const talento = 0.75 + criarRng(p.id)() * 0.5;                    // um jeito de evoluir fixo do jogador (0,75 a 1,25)
  const potencial = p.potential ?? 60;
  const teto = tetoDoAtributo(p.position, potencial);
  const idade = p.birthDate ? idadeEm(p.birthDate, mes + '-01') : p.age;   // a idade no dia 1 do mes: o resultado nao depende do dia em que o motor processou
  const k = kDaIdade(idade) / 12;
  const acc = { ...(p.devAcc || { def: 0, pas: 0, drb: 0, sht: 0 }) };
  const novo: Record<Attr, number> = { def: p.def, pas: p.pas, drb: p.drb, sht: p.sht };
  ATTRS.forEach(a => {
    const folga = Math.max(0, teto[a] - novo[a]);
    acc[a] += folga * k * talento * (rnd() * 2.2);                   // 0 a 2,2 vezes o ritmo esperado: ha meses parados e meses bons
    if (rnd() < 0.03 && novo[a] > 52) acc[a] -= 1;                   // um recuo raro
    if (acc[a] >= 1) { const g = Math.floor(acc[a]); novo[a] = Math.min(teto[a] + 2, novo[a] + g); acc[a] -= g; }
    else if (acc[a] <= -1) { const g = Math.ceil(-acc[a]); novo[a] = Math.max(50, novo[a] - g); acc[a] += g; }
  });
  novo.def = limitar(novo.def); novo.pas = limitar(novo.pas); novo.drb = limitar(novo.drb); novo.sht = limitar(novo.sht);
  subirAteOPotencial(p.position, novo, potencial);                   // nunca passa do potencial
  const skill = calcularSkill(p.position, novo.def, novo.pas, novo.drb, novo.sht);
  const mudancas: MudancaAtributo[] = ATTRS.filter(a => novo[a] !== p[a]).map(a => ({ attr: a, de: p[a], para: novo[a] }));
  const estimativa = estimar(potencial, idade, rnd, p.potentialEstimate);
  // PlayStyle: definido aos 18 anos e reajustado conforme os atributos evoluem (so com idade >= 18 no dia 1 do mes)
  const estiloNovo = idade >= IDADE_ESTILO ? escolherPlayStyle(p.position, novo, p.playStyle) : undefined;
  const jogador: Player = {
    ...p, ...(estiloNovo ? { playStyle: estiloNovo } : {}), def: novo.def, pas: novo.pas, drb: novo.drb, sht: novo.sht, skill, devAcc: acc, potentialEstimate: estimativa,
    lastGrowth: { def: novo.def - p.def, pas: novo.pas - p.pas, drb: novo.drb - p.drb, sht: novo.sht - p.sht }
  };
  return { jogador, relatorio: { mes, nome: p.name, idade: p.age, posicao: p.position, ovrAntes: p.skill, ovrDepois: skill, delta: skill - p.skill, estrelas: estrelasDePotencial(estimativa), mudancas,
    ...(estiloNovo && estiloNovo !== p.playStyle ? { estilo: { de: p.playStyle, para: estiloNovo } } : {}) } };
};

const proximoMes = (mes: string): string => somarMeses(mes + '-01', 1).slice(0, 7);

export interface ResultadoBase { base: BaseState; saidas: Player[]; }

/**
 * Chamado a cada mudanca de data. (1) A idade acompanha o nascimento; quem chega aos 21 sai da base e a vaga e reposta (os jovens que saem voltam em `saidas`,
 * para o jogo decidir o destino). (2) Cada mes ainda nao processado e processado UMA vez (o marcador `mesProcessado` vai no save). Se nada mudou, devolve a mesma base.
 */
export const processarBase = (base: BaseState, hoje: string): ResultadoBase => {
  let b = base;
  const saidas: Player[] = [];
  // 1. idades e saidas
  let mudouIdade = false;
  const comIdade = b.jogadores.map(p => {
    if (!p.birthDate) return p;
    const idade = idadeEm(p.birthDate, hoje);
    if (idade === p.age) return p;
    mudouIdade = true;
    const q: Player = { ...p, age: idade };
    if (idade >= IDADE_ESTILO && (!q.playStyle || q.playStyle === 'None')) q.playStyle = escolherPlayStyle(q.position, { def: q.def, pas: q.pas, drb: q.drb, sht: q.sht });
    return q;
  });
  if (mudouIdade) {
    const ficam = comIdade.filter(p => p.age < IDADE_SAIDA);
    const vao = comIdade.filter(p => p.age >= IDADE_SAIDA);
    saidas.push(...vao);
    const relatorios = { ...b.relatorios }; vao.forEach(p => { delete relatorios[p.id]; });
    b = { ...b, jogadores: ficam, relatorios };
    new Set(vao.map(p => p.teamId)).forEach(tid => { b = completarBase(b, tid, hoje); });
  }
  // 2. meses ainda por processar (um a um, pelo calendario)
  let guarda = 240;
  while (b.mesProcessado < mesDe(hoje) && guarda-- > 0) {
    const mes = proximoMes(b.mesProcessado);
    const relatorios = { ...b.relatorios };
    const jogadores = b.jogadores.map(p => {
      const { jogador, relatorio } = evolucaoMensal(p, mes);
      relatorios[p.id] = [...(relatorios[p.id] || []), relatorio].slice(-MESES_DE_RELATORIO);
      return jogador;
    });
    b = { ...b, jogadores, relatorios, mesProcessado: mes };
  }
  return { base: b, saidas };
};

/** Promove: tira o jovem da base e repoe a vaga. O jogador volta com TODOS os dados (id, atributos, potencial, contrato). A reposicao tenta manter a posicao. */
export const promoverJovem = (base: BaseState, playerId: string, hoje: string): { base: BaseState; jogador: Player } | null => {
  const jogador = base.jogadores.find(p => p.id === playerId);
  if (!jogador) return null;
  const relatorios = { ...base.relatorios }; delete relatorios[playerId];
  let b: BaseState = { ...base, jogadores: base.jogadores.filter(p => p.id !== playerId), relatorios };
  b = completarBase(b, jogador.teamId, hoje, jogador.position);
  return { base: b, jogador };
};
