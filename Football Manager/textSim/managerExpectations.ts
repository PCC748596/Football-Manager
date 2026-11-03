/*
MANAGER EXPECTATIONS — expectativas dos clubes, confianca da diretoria, demissoes, reputacao e mercado de treinadores, para TODOS os clubes da base (nao so o do utilizador).

Funcoes puras: o contexto do jogo (context/GameContext.tsx) chama `atualizarTreinadores` quando o mundo ou os jogos mudam. Nao mexe no motor das partidas.
- Expectativa: o OVR do clube (`Team.strength`) da o nivel 0-5 (90+ titulo, 80+ disputar, 70+ primeiros, 60+ metade de cima, 50+ permanencia, abaixo evitar queda); a tradicao
  (textSim/tradicao.ts) soma +-1. O nivel vira uma posicao-alvo relativa ao tamanho da liga.
- Board Confidence 0-100: 50% aproveitamento (contra o esperado para a posicao-alvo), 30% posicao, 20% conquistas. Muda aos poucos (10% do caminho por rodada).
- Demissao: so com confianca < 20 (ou pressao longa abaixo de 40), nunca na carencia pos-contratacao nem antes de 10 jogos; a zona de rebaixamento acelera. Sorteio com semente.
- Reputacao 0-100, independente da confianca: muda no fim da liga (aproveitamento, posicao final, titulo, promocao, classificacao).
- Ofertas: no fim da liga, clubes precisando de treinador convidam o melhor compativel de um clube menor. Substituto: o livre com reputacao mais proxima da exigencia do clube.
O jogo ainda nao tem virada de temporada: cada liga fecha uma vez (`fechadas`) e cada treinador muda de clube no maximo uma vez (`jaMovido`).
*/
import type { Team } from '../types';
import type { TableRow } from './world';
import { criarRng } from './contracts';
import { nomeAleatorio } from './nomes';
import { ajustesDeTradicao } from './tradicao';
import { teamKey } from './competitions';

export const USUARIO_ID = 'user';

export const CONFIG_MGR = {
  niveisOvr: [50, 60, 70, 80, 90],
  /** Reputacao que cada nivel (0-5) exige de um treinador. */
  exigencia: [20, 35, 50, 65, 80, 92],
  confInicial: 62, suavizacao: 0.1, minJogosAvaliar: 3, minJogosDemissao: 10, carencia: 8,
  pesos: { aproveitamento: 0.5, posicao: 0.3, conquistas: 0.2 },
  neutro: 60, ganhoAproveitamento: 120, ganhoPosicao: 80,
  limiteDemissao: 20, limitePressao: 40,
  probDemissaoBase: 0.25, probDemissaoPorRodada: 0.15, probPressao: 0.05, probTeto: 0.6, multZonaDeQueda: 1.5,
  repGanhoAproveitamento: 60, repGanhoPosicao: 20, repTitulo: 15, repPromocao: 8, repClassificacao: 4, repRebaixamento: -12, repDemitido: -6, repPreterido: -4,
  penalidadeRebaixamento: 25, confUsuarioAposDemissao: 35, carenciaUsuario: 10,
  lacunaReputacao: 25, tolerInf: 10, tolerSup: 25, maxOfertasUsuario: 3,
  /** Peso do ranking de OVR dentro da liga na posicao-alvo (0 = so o nivel absoluto). Evita metas impossiveis em ligas onde todos tem OVR alto. */
  pesoRankOvr: 0.5,
  tamanhoMinimoPool: 30, jogosTemporadaFechada: 9999
};
const C = CONFIG_MGR;

export interface Manager {
  id: string; nome: string; tatico: number;
  reputation: number; confidence: number;
  /** `teamKey(leagueId, teamId)` do clube, ou null se esta livre. */
  clubKey: string | null;
  lowConfRounds: number; grace: number;
  /** Jogos do clube na ultima atualizacao (a atualizacao so corre quando ha jogos novos). */
  ultimoJogos: number;
  /** Jogos e pontos do clube quando o treinador chegou: ele so e julgado pelo que veio depois. */
  baseJogos: number; basePontos: number;
  jaMovido: boolean;
  usuario?: boolean;
}
export interface OfertaUsuario { id: string; clubKey: string; clube: string; exigencia: number; data: string; }
/** Uma linha do diario da carreira do utilizador (aba Manager). */
export interface RegistroCarreira {
  data: string; tipo: 'CONTRATADO' | 'DEMITIDO' | 'OFERTA' | 'FIM_LIGA'; clube: string;
  pos?: number; n?: number; pontos?: number; jogos?: number; titulo?: boolean; promovido?: boolean; rebaixado?: boolean;
}
export interface ManagerState { managers: Record<string, Manager>; fechadas: string[]; ofertas: OfertaUsuario[]; historico: RegistroCarreira[]; }

/** Uma liga num instante: tabela atual e se acabou. (`managerLigas.ts` monta isto a partir do estado do jogo.) */
export interface LigaSnap { leagueId: string; tier: number; promovidos: number; rebaixados: number; times: Team[]; tabela: TableRow[]; encerrada: boolean; }

export type Faixa = 'EXCELENTE' | 'BOA' | 'PRESSAO' | 'RISCO' | 'IMINENTE';
export interface EventoMgr {
  tipo: 'DEMISSAO' | 'CONTRATACAO' | 'TRANSFERENCIA' | 'OFERTA' | 'FAIXA' | 'FIM_LIGA'; managerId: string; clubKey: string | null; clube: string; usuario: boolean; de?: string | null; faixa?: Faixa;
  /** So em FIM_LIGA (do utilizador): o resultado final da liga. */
  pos?: number; n?: number; pontos?: number; jogos?: number; titulo?: boolean; promovido?: boolean; rebaixado?: boolean;
}
export interface Rodada { jogos: number; pontos: number; posicao: number; n: number; alvo: number; conquistas?: number; }

const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const fracao = (n: number, f: number) => Math.max(1, Math.ceil(n * f - 1e-9));

export const nivelDoOvr = (ovr: number) => C.niveisOvr.filter(n => ovr >= n).length;
export const nivelDoClube = (strength: number, ajuste: number) => clamp(nivelDoOvr(strength) + ajuste, 0, 5);
export const exigenciaDoNivel = (nivel: number) => C.exigencia[nivel];

/** Posicao (1 = campeao) que a diretoria espera, para uma liga de `n` clubes com `rebaixados` descendo. */
export const posicaoAlvo = (nivel: number, n: number, rebaixados: number): number => {
  const seguro = Math.max(1, n - rebaixados);
  const alvo = [seguro, Math.max(1, seguro - 1), fracao(n, 0.5), fracao(n, 0.25), fracao(n, 0.15), 1][nivel];
  return clamp(alvo, 1, n);
};

/** Posicao de cada clube da liga pelo OVR (1 = mais forte; empate pelo id). */
export const rankDeForca = (times: Team[]): Record<string, number> => {
  const out: Record<string, number> = {};
  [...times].sort((a, b) => b.strength - a.strength || a.id.localeCompare(b.id)).forEach((t, i) => { out[t.id] = i + 1; });
  return out;
};

/** A meta realista: o nivel (absoluto, pelo OVR e tradicao) misturado com o lugar do clube pelo OVR na propria liga. */
export const metaDoClube = (nivel: number, n: number, rebaixados: number, rankOvr: number): number =>
  clamp(Math.round((1 - C.pesoRankOvr) * posicaoAlvo(nivel, n, rebaixados) + C.pesoRankOvr * rankOvr), 1, n);

/** Aproveitamento (0-1) normal de quem termina na posicao-alvo. */
export const aproveitamentoEsperado = (alvo: number, n: number) => 0.72 - 0.42 * ((alvo - 1) / Math.max(1, n - 1));

/** O valor (0-100) para o qual a confianca tende, dado o momento da liga. Cumprir a expectativa = `neutro`. */
export const alvoDeConfianca = (r: Rodada): number => {
  const aprov = r.jogos ? r.pontos / (3 * r.jogos) : aproveitamentoEsperado(r.alvo, r.n);
  const a = clamp(C.neutro + (aprov - aproveitamentoEsperado(r.alvo, r.n)) * C.ganhoAproveitamento);
  const p = clamp(C.neutro + ((r.alvo - r.posicao) / Math.max(1, r.n - 1)) * C.ganhoPosicao);
  const c = clamp(r.conquistas ?? C.neutro);
  return a * C.pesos.aproveitamento + p * C.pesos.posicao + c * C.pesos.conquistas;
};

/** A confianca anda `suavizacao` do caminho ate o alvo por rodada (`passos` rodadas de uma vez). */
export const atualizarConfianca = (atual: number, alvo: number, passos = 1) => clamp(atual + (alvo - atual) * (1 - Math.pow(1 - C.suavizacao, passos)));

export const faixaDeConfianca = (c: number): Faixa => c >= 80 ? 'EXCELENTE' : c >= 60 ? 'BOA' : c >= 40 ? 'PRESSAO' : c >= 20 ? 'RISCO' : 'IMINENTE';

/** Chance de demissao nesta rodada. Zero na carencia, antes de `minJogosDemissao` jogos ou com confianca >= 40 sem pressao longa. */
export const probDemissao = (m: Manager, emZonaDeQueda: boolean, jogos: number): number => {
  if (m.grace > 0 || jogos < C.minJogosDemissao) return 0;
  let p = 0;
  if (m.confidence < C.limiteDemissao) p = C.probDemissaoBase + C.probDemissaoPorRodada * Math.min(m.lowConfRounds, 3);
  else if (m.confidence < C.limitePressao && m.lowConfRounds > 4) p = C.probPressao * (m.lowConfRounds - 4);
  if (emZonaDeQueda) p *= C.multZonaDeQueda;
  return Math.min(C.probTeto, p);
};

const livres = (managers: Record<string, Manager>) => Object.values(managers).filter(m => !m.clubKey && !m.usuario);

const novoLivre = (id: string, reputation?: number): Manager => {
  const rnd = criarRng(id);
  return { id, nome: nomeAleatorio(rnd), tatico: Math.round(60 + rnd() * 30), reputation: Math.round(reputation ?? 20 + rnd() * 65), confidence: C.confInicial, clubKey: null, lowConfRounds: 0, grace: 0, ultimoJogos: 0, baseJogos: 0, basePontos: 0, jaMovido: false };
};

/** Mantem pelo menos `tamanhoMinimoPool` treinadores livres (sinteticos, com semente). */
export const garantirPool = (estado: ManagerState): ManagerState => {
  const managers = { ...estado.managers };
  let n = Object.keys(managers).length;
  for (let faltam = C.tamanhoMinimoPool - livres(managers).length; faltam > 0; faltam--) { const id = 'livre|' + n++; managers[id] = novoLivre(id); }
  return { ...estado, managers };
};

/** Um treinador por clube de cada liga (os de `Team.managerName`, que vem de textSim/treinadores.ts) e o do utilizador no clube dele. */
export const semearTreinadores = (ligas: LigaSnap[], usuario?: { clubKey: string; nome: string }): ManagerState => {
  const managers: Record<string, Manager> = {};
  for (const liga of ligas) {
    const ajustes = ajustesDeTradicao(liga.times);
    for (const t of liga.times) {
      const k = teamKey(liga.leagueId, t.id);
      const exig = exigenciaDoNivel(nivelDoClube(t.strength, ajustes[t.id] ?? 0));
      const ehUsuario = usuario?.clubKey === k;
      const id = ehUsuario ? USUARIO_ID : 'm|' + k;
      managers[id] = { id, nome: ehUsuario ? usuario!.nome : t.managerName, tatico: t.managerTactics ?? 60, reputation: clamp(Math.round(exig + criarRng('mgr|' + k)() * 16 - 8)),
        confidence: C.confInicial, clubKey: k, lowConfRounds: 0, grace: 0, ultimoJogos: 0, baseJogos: 0, basePontos: 0, jaMovido: false, ...(ehUsuario ? { usuario: true } : {}) };
    }
  }
  return garantirPool({ managers, fechadas: [], ofertas: [], historico: [] });
};

const indicePorClube = (managers: Record<string, Manager>) => {
  const out: Record<string, string> = {};
  for (const m of Object.values(managers)) if (m.clubKey) out[m.clubKey] = m.id;
  return out;
};

/** Poe no clube o livre com reputacao mais proxima da exigencia (ou cria um sintetico). Altera `managers` e `porClube`. */
const preencherVaga = (managers: Record<string, Manager>, porClube: Record<string, string>, clubKey: string, clube: string, exigencia: number, jogos: number, eventos: EventoMgr[], excluirId?: string, pontos = 0) => {
  const m = livres(managers).filter(x => x.id !== excluirId).sort((a, b) => Math.abs(a.reputation - exigencia) - Math.abs(b.reputation - exigencia) || a.id.localeCompare(b.id))[0] || novoLivre('livre|' + Object.keys(managers).length, exigencia);
  managers[m.id] = { ...m, clubKey, grace: C.carencia, confidence: C.confInicial, lowConfRounds: 0, ultimoJogos: jogos, baseJogos: jogos, basePontos: pontos, jaMovido: true };
  porClube[clubKey] = m.id;
  eventos.push({ tipo: 'CONTRATACAO', managerId: m.id, clubKey, clube, usuario: false });
};

/**
 * Demissao. A IA vai para o pool e o clube contrata um substituto. O utilizador NUNCA fica sem clube (sem game over): recebe o aviso e recomeca com confianca baixa e carencia.
 */
const demitir = (managers: Record<string, Manager>, porClube: Record<string, string>, m: Manager, clube: string, exigencia: number, jogos: number, eventos: EventoMgr[], pontos = 0) => {
  eventos.push({ tipo: 'DEMISSAO', managerId: m.id, clubKey: m.clubKey, clube, usuario: !!m.usuario });
  if (m.usuario) { managers[m.id] = { ...m, reputation: clamp(m.reputation + C.repDemitido), confidence: C.confUsuarioAposDemissao, lowConfRounds: 0, grace: C.carenciaUsuario, baseJogos: jogos, basePontos: pontos }; return; }
  const k = m.clubKey!;
  managers[m.id] = { ...m, clubKey: null, reputation: clamp(m.reputation + C.repDemitido), confidence: C.confInicial, lowConfRounds: 0, grace: 0 };
  delete porClube[k];
  preencherVaga(managers, porClube, k, clube, exigencia, jogos, eventos, m.id, pontos);   // o demitido nao volta para o proprio clube
};

/** Atualiza a confianca de cada treinador com os jogos novos de cada liga e demite quem merece. Idempotente: sem jogos novos nada muda. */
export const processarRodada = (estado: ManagerState, ligas: LigaSnap[]): { estado: ManagerState; eventos: EventoMgr[] } => {
  const managers = { ...estado.managers };
  const porClube = indicePorClube(managers);
  const eventos: EventoMgr[] = [];
  for (const liga of ligas) {
    const n = liga.tabela.length;
    if (n < 2) continue;
    const ajustes = ajustesDeTradicao(liga.times), ranks = rankDeForca(liga.times);
    liga.tabela.forEach((row, i) => {
      const k = teamKey(liga.leagueId, row.team.id);
      const m = managers[porClube[k]];
      if (!m || row.played < C.minJogosAvaliar || row.played <= m.ultimoJogos) return;
      const nivel = nivelDoClube(row.team.strength, ajustes[row.team.id] ?? 0);
      const alvoPos = metaDoClube(nivel, n, liga.rebaixados, ranks[row.team.id]);
      const passos = row.played - m.ultimoJogos;
      const conf = atualizarConfianca(m.confidence, alvoDeConfianca({ jogos: row.played - m.baseJogos, pontos: row.points - m.basePontos, posicao: i + 1, n, alvo: alvoPos }), passos);
      const baixa = conf < C.limitePressao ? m.lowConfRounds + passos : conf >= C.neutro ? 0 : Math.max(0, m.lowConfRounds - passos);
      const novo: Manager = { ...m, confidence: conf, lowConfRounds: baixa, grace: Math.max(0, m.grace - passos), ultimoJogos: row.played };
      managers[m.id] = novo;
      if (m.usuario && faixaDeConfianca(conf) !== faixaDeConfianca(m.confidence) && conf < m.confidence && conf < C.limitePressao)
        eventos.push({ tipo: 'FAIXA', managerId: m.id, clubKey: k, clube: row.team.name, usuario: true, faixa: faixaDeConfianca(conf) });
      const zona = i + 1 > n - liga.rebaixados;
      if (criarRng(`demissao|${m.id}|${row.played}`)() < probDemissao(novo, zona, row.played)) demitir(managers, porClube, novo, row.team.name, exigenciaDoNivel(nivel), row.played, eventos, row.points);
    });
  }
  return { estado: garantirPool({ ...estado, managers }), eventos };
};

/** Contexto de todos os clubes das ligas (para as ofertas): liga, nome, forca e exigencia de cada clube. */
const contextoDeClubes = (ligas: LigaSnap[]) => {
  const liga: Record<string, string> = {}, nome: Record<string, string> = {}, forca: Record<string, number> = {}, exig: Record<string, number> = {};
  for (const l of ligas) {
    const ajustes = ajustesDeTradicao(l.times);
    for (const t of l.times) {
      const k = teamKey(l.leagueId, t.id);
      liga[k] = l.leagueId; nome[k] = t.name; forca[k] = t.strength; exig[k] = exigenciaDoNivel(nivelDoClube(t.strength, ajustes[t.id] ?? 0));
    }
  }
  return { liga, nome, forca, exig };
};

/**
 * Fim da liga (uma vez por liga): reputacao, confianca final, demissao dos que merecem e, com todas as ligas fechadas ate agora, as ofertas de emprego:
 * um clube precisa de treinador se a confianca do dele esta abaixo de 40 ou se a reputacao esta `lacunaReputacao` abaixo da exigencia; convida o melhor compativel
 * (reputacao perto da exigencia, confianca alta) de um clube MENOR. A IA aceita conforme a melhora; o utilizador recebe uma oferta pendente.
 */
export const fecharTemporadas = (estado: ManagerState, ligas: LigaSnap[], hoje: string): { estado: ManagerState; eventos: EventoMgr[] } => {
  const fechadasAgora = ligas.filter(l => l.encerrada && l.tabela.length > 1 && !estado.fechadas.includes(l.leagueId));
  if (!fechadasAgora.length) return { estado, eventos: [] };
  const managers = { ...estado.managers };
  const porClube = indicePorClube(managers);
  const eventos: EventoMgr[] = [];
  const ctx = contextoDeClubes(ligas);
  for (const liga of fechadasAgora) {
    const n = liga.tabela.length;
    const ajustes = ajustesDeTradicao(liga.times), ranks = rankDeForca(liga.times);
    liga.tabela.forEach((row, i) => {
      const k = teamKey(liga.leagueId, row.team.id);
      const m = managers[porClube[k]];
      const jogosM = m ? row.played - m.baseJogos : 0, pontosM = m ? row.points - m.basePontos : 0;   // so o periodo dele no clube
      if (!m || jogosM <= 0) return;
      const pos = i + 1, nivel = nivelDoClube(row.team.strength, ajustes[row.team.id] ?? 0), alvoPos = metaDoClube(nivel, n, liga.rebaixados, ranks[row.team.id]);
      const campeao = pos === 1, promovido = liga.tier > 1 && pos <= liga.promovidos, rebaixado = pos > n - liga.rebaixados, classificado = pos <= fracao(n, 0.2);
      const aprov = pontosM / (3 * jogosM);
      let delta = (aprov - aproveitamentoEsperado(alvoPos, n)) * C.repGanhoAproveitamento + ((alvoPos - pos) / Math.max(1, n - 1)) * C.repGanhoPosicao
        + (campeao ? C.repTitulo : 0) + (promovido ? C.repPromocao : 0) + (classificado ? C.repClassificacao : 0) + (rebaixado ? C.repRebaixamento : 0);
      if (delta > 0) delta *= 1 - m.reputation / 150;   // quanto mais alta a reputacao, mais dificil subir
      const conquistas = campeao ? 100 : promovido ? 85 : classificado ? 70 : C.neutro;
      let conf = atualizarConfianca(m.confidence, alvoDeConfianca({ jogos: jogosM, pontos: pontosM, posicao: pos, n, alvo: alvoPos, conquistas }), 3);
      if (rebaixado) conf = clamp(conf - C.penalidadeRebaixamento);
      const novo: Manager = { ...m, reputation: clamp(Math.round(m.reputation + delta)), confidence: conf, lowConfRounds: conf < C.limitePressao ? m.lowConfRounds + 1 : 0, ultimoJogos: C.jogosTemporadaFechada };
      managers[m.id] = novo;
      if (m.usuario) eventos.push({ tipo: 'FIM_LIGA', managerId: m.id, clubKey: k, clube: row.team.name, usuario: true, pos, n, pontos: pontosM, jogos: jogosM, titulo: campeao, promovido, rebaixado });
      if (criarRng(`demissao|${m.id}|fim`)() < probDemissao(novo, rebaixado, row.played)) demitir(managers, porClube, novo, row.team.name, exigenciaDoNivel(nivel), C.jogosTemporadaFechada, eventos);
    });
  }
  const fechadas = [...estado.fechadas, ...fechadasAgora.map(l => l.leagueId)];
  const ofertas = [...estado.ofertas];
  const clubes = Object.keys(porClube).filter(k => fechadas.includes(ctx.liga[k])).sort((a, b) => ctx.forca[b] - ctx.forca[a] || a.localeCompare(b));
  for (const k of clubes) {
    const atual = managers[porClube[k]];
    if (!atual || atual.usuario || atual.jaMovido) continue;
    const exig = ctx.exig[k];
    if (!(atual.confidence < C.limitePressao || exig - atual.reputation >= C.lacunaReputacao)) continue;
    const nota = (c: Manager) => (100 - Math.abs(c.reputation - exig)) * 0.5 + c.confidence * 0.3 + c.reputation * 0.2;
    const cands = Object.values(managers).filter(c => c.clubKey && c.clubKey !== k && !c.jaMovido && fechadas.includes(ctx.liga[c.clubKey]) && ctx.forca[c.clubKey] < ctx.forca[k]
      && c.reputation >= exig - C.tolerInf && c.reputation <= exig + C.tolerSup).sort((a, b) => nota(b) - nota(a) || a.id.localeCompare(b.id));
    const c = cands[0];
    if (!c) continue;
    if (c.usuario) {
      if (ofertas.length < C.maxOfertasUsuario && !ofertas.some(o => o.clubKey === k)) {
        ofertas.push({ id: `oferta|${k}|${hoje}`, clubKey: k, clube: ctx.nome[k], exigencia: exig, data: hoje });
        eventos.push({ tipo: 'OFERTA', managerId: c.id, clubKey: k, clube: ctx.nome[k], usuario: true });
      }
      continue;
    }
    const melhora = ctx.forca[k] - ctx.forca[c.clubKey!];
    const pAceita = clamp(0.5 + melhora / 40 + (c.confidence < C.limitePressao ? 0.2 : 0), 0.3, 1);
    if (criarRng(`oferta|${c.id}|${k}`)() >= pAceita) continue;
    const origem = c.clubKey!;
    managers[atual.id] = { ...atual, clubKey: null, reputation: clamp(atual.reputation + C.repPreterido), grace: 0 };
    managers[c.id] = { ...c, clubKey: k, grace: C.carencia, confidence: C.confInicial, lowConfRounds: 0, ultimoJogos: C.jogosTemporadaFechada, jaMovido: true };
    porClube[k] = c.id; delete porClube[origem];
    eventos.push({ tipo: 'TRANSFERENCIA', managerId: c.id, clubKey: k, clube: ctx.nome[k], usuario: false, de: origem });
    preencherVaga(managers, porClube, origem, ctx.nome[origem], ctx.exig[origem], C.jogosTemporadaFechada, eventos);
  }
  return { estado: garantirPool({ ...estado, managers, fechadas, ofertas }), eventos };
};

/** Ponto de entrada do jogo: jogos novos + fim de liga. Sem novidade devolve o MESMO `estado` (`mudou` falso). */
export const atualizarTreinadores = (estado: ManagerState, ligas: LigaSnap[], hoje: string): { estado: ManagerState; eventos: EventoMgr[]; mudou: boolean } => {
  const a = processarRodada(estado, ligas);
  const b = fecharTemporadas(a.estado, ligas, hoje);
  const novo = b.estado, antes = estado.managers, depois = novo.managers;
  const mudou = Object.keys(depois).length !== Object.keys(antes).length || Object.keys(depois).some(id => depois[id] !== antes[id])
    || novo.fechadas.length !== estado.fechadas.length || novo.ofertas.length !== estado.ofertas.length;
  return { estado: mudou ? novo : estado, eventos: [...a.eventos, ...b.eventos], mudou };
};

/** Copia o treinador do estado para `Team.managerName`/`managerTactics`. Pula o clube do utilizador. Sem mudanca devolve o mesmo array. */
export const aplicarTreinadores = (times: Team[], estado: ManagerState, leagueId?: string): Team[] => {
  const porClube: Record<string, Manager> = {};
  for (const m of Object.values(estado.managers)) if (m.clubKey && !m.usuario) porClube[m.clubKey] = m;
  let mudou = false;
  const out = times.map(t => {
    const m = porClube[teamKey(leagueId ?? t.leagueId, t.id)];
    if (!m || (t.managerName === m.nome && t.managerTactics === m.tatico)) return t;
    mudou = true;
    return { ...t, managerName: m.nome, managerTactics: m.tatico };
  });
  return mudou ? out : times;
};

/** A expectativa de UM clube numa liga (para mostrar na tela de escolha): nivel 0-5, posicao-alvo e o ajuste de tradicao. `times` sao os clubes da liga. */
export const expectativaDoClube = (times: Team[], clube: Team, rebaixados: number): { nivel: number; alvo: number; ajuste: -1 | 0 | 1 } => {
  const ajuste = ajustesDeTradicao(times)[clube.id] ?? 0;
  const nivel = nivelDoClube(clube.strength, ajuste);
  const n = Math.max(2, times.length);
  return { nivel, ajuste, alvo: metaDoClube(nivel, n, rebaixados, rankDeForca(times)[clube.id] ?? Math.ceil(n / 2)) };
};

/**
 * Serie D (96 clubes, mata-mata depois dos grupos): a expectativa e a FASE que o clube deve alcancar, nao uma posicao. Pela posicao do OVR entre todos os clubes da liga:
 * 1-3 titulo, 4-8 semifinal (os 4 semifinalistas sobem), 9-16 quartas, 17-32 oitavas, 33-64 terceira fase, resto segunda fase (passar dos grupos). A tradicao move uma fase.
 * Devolve 0-5: 0 segunda fase, 1 terceira fase, 2 oitavas, 3 quartas, 4 semifinal, 5 titulo.
 */
export const expectativaPorFases = (times: Team[], clube: Team): { fase: number; ajuste: -1 | 0 | 1 } => {
  const ajuste = ajustesDeTradicao(times)[clube.id] ?? 0;
  const rank = rankDeForca(times)[clube.id] ?? times.length;
  const base = rank <= 3 ? 5 : rank <= 8 ? 4 : rank <= 16 ? 3 : rank <= 32 ? 2 : rank <= 64 ? 1 : 0;
  return { fase: clamp(base + ajuste, 0, 5), ajuste };
};

/** Converte os eventos do UTILIZADOR em linhas do diario da carreira (os da IA e os avisos de faixa ficam de fora). */
export const registrosDosEventos = (eventos: EventoMgr[], hoje: string): RegistroCarreira[] => eventos.filter(e => e.usuario).flatMap((e): RegistroCarreira[] => {
  if (e.tipo === 'DEMISSAO') return [{ data: hoje, tipo: 'DEMITIDO', clube: e.clube }];
  if (e.tipo === 'OFERTA') return [{ data: hoje, tipo: 'OFERTA', clube: e.clube }];
  if (e.tipo === 'FIM_LIGA') return [{ data: hoje, tipo: 'FIM_LIGA', clube: e.clube, pos: e.pos, n: e.n, pontos: e.pontos, jogos: e.jogos, titulo: e.titulo, promovido: e.promovido, rebaixado: e.rebaixado }];
  return [];
});

/** Anexa linhas ao diario. Sem linhas devolve o MESMO estado. */
export const registrarNoDiario = (estado: ManagerState, registros: RegistroCarreira[]): ManagerState =>
  registros.length ? { ...estado, historico: [...(estado.historico || []), ...registros] } : estado;

/** O utilizador recusa uma oferta pendente (so a tira da lista). Id desconhecido devolve o MESMO estado. */
export const declinarOferta = (estado: ManagerState, id: string): ManagerState =>
  estado.ofertas.some(o => o.id === id) ? { ...estado, ofertas: estado.ofertas.filter(o => o.id !== id) } : estado;
