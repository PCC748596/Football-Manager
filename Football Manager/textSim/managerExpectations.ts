/*
MANAGER EXPECTATIONS — expectativas dos clubes, confianca da diretoria, demissoes, reputacao e mercado de treinadores, para TODOS os clubes da base (nao so o do utilizador).

Funcoes puras: o contexto do jogo (context/GameContext.tsx) chama `atualizarTreinadores` quando o mundo ou os jogos mudam. Nao mexe no motor das partidas.
- Expectativa: o OVR do clube (`Team.strength`) da o nivel 0-5 (90+ titulo, 80+ disputar, 70+ primeiros, 60+ metade de cima, 50+ permanencia, abaixo evitar queda); a tradicao
  (textSim/tradicao.ts) soma +-1. O nivel vira uma posicao-alvo relativa ao tamanho da liga.
- Board Confidence 0-100: 50% aproveitamento (contra o esperado para a posicao-alvo), 30% posicao, 20% conquistas. Muda aos poucos (15% do caminho por rodada).
- Demissao: so com confianca < 20 (ou pressao longa abaixo de 40), nunca na carencia pos-contratacao nem antes de 8 jogos; a zona de rebaixamento acelera. Sorteio com semente.
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
  confInicial: 62, suavizacao: 0.15, minJogosAvaliar: 3, minJogosDemissao: 8, carencia: 6,
  pesos: { aproveitamento: 0.5, posicao: 0.3, conquistas: 0.2 },
  neutro: 60, ganhoAproveitamento: 250, ganhoPosicao: 160,
  limiteDemissao: 20, limitePressao: 40,
  probDemissaoBase: 0.25, probDemissaoPorRodada: 0.15, probPressao: 0.05, probTeto: 0.6, multZonaDeQueda: 1.5,
  repGanhoAproveitamento: 60, repGanhoPosicao: 20, repTitulo: 15, repPromocao: 8, repClassificacao: 4, repRebaixamento: -12, repDemitido: -6, repPreterido: -4,
  penalidadeRebaixamento: 25, confUsuarioAposDemissao: 35, carenciaUsuario: 10,
  lacunaReputacao: 25, tolerInf: 10, tolerSup: 25, maxOfertasUsuario: 3,
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
  jaMovido: boolean;
  usuario?: boolean;
}
export interface OfertaUsuario { id: string; clubKey: string; clube: string; exigencia: number; data: string; }
export interface ManagerState { managers: Record<string, Manager>; fechadas: string[]; ofertas: OfertaUsuario[]; }

/** Uma liga num instante: tabela atual e se acabou. (`managerLigas.ts` monta isto a partir do estado do jogo.) */
export interface LigaSnap { leagueId: string; tier: number; promovidos: number; rebaixados: number; times: Team[]; tabela: TableRow[]; encerrada: boolean; }

export type Faixa = 'EXCELENTE' | 'BOA' | 'PRESSAO' | 'RISCO' | 'IMINENTE';
export interface EventoMgr { tipo: 'DEMISSAO' | 'CONTRATACAO' | 'TRANSFERENCIA' | 'OFERTA' | 'FAIXA'; managerId: string; clubKey: string | null; clube: string; usuario: boolean; de?: string | null; faixa?: Faixa; }
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

/** Aproveitamento (0-1) normal de quem termina na posicao-alvo. */
export const aproveitamentoEsperado = (alvo: number, n: number) => 0.72 - 0.42 * ((alvo - 1) / Math.max(1, n - 1));

/** O valor (0-100) para o qual a confianca tende, dado o momento da liga. Cumprir a expectativa = `neutro`. */
export const alvoDeConfianca = (r: Rodada): number => {
  const aprov = r.jogos ? r.pontos / (3 * r.jogos) : 0;
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
  return { id, nome: nomeAleatorio(rnd), tatico: Math.round(60 + rnd() * 30), reputation: Math.round(reputation ?? 20 + rnd() * 65), confidence: C.confInicial, clubKey: null, lowConfRounds: 0, grace: 0, ultimoJogos: 0, jaMovido: false };
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
        confidence: C.confInicial, clubKey: k, lowConfRounds: 0, grace: 0, ultimoJogos: 0, jaMovido: false, ...(ehUsuario ? { usuario: true } : {}) };
    }
  }
  return garantirPool({ managers, fechadas: [], ofertas: [] });
};

const indicePorClube = (managers: Record<string, Manager>) => {
  const out: Record<string, string> = {};
  for (const m of Object.values(managers)) if (m.clubKey) out[m.clubKey] = m.id;
  return out;
};

/** Poe no clube o livre com reputacao mais proxima da exigencia (ou cria um sintetico). Altera `managers` e `porClube`. */
const preencherVaga = (managers: Record<string, Manager>, porClube: Record<string, string>, clubKey: string, clube: string, exigencia: number, jogos: number, eventos: EventoMgr[], excluirId?: string) => {
  const m = livres(managers).filter(x => x.id !== excluirId).sort((a, b) => Math.abs(a.reputation - exigencia) - Math.abs(b.reputation - exigencia) || a.id.localeCompare(b.id))[0] || novoLivre('livre|' + Object.keys(managers).length, exigencia);
  managers[m.id] = { ...m, clubKey, grace: C.carencia, confidence: C.confInicial, lowConfRounds: 0, ultimoJogos: jogos, jaMovido: true };
  porClube[clubKey] = m.id;
  eventos.push({ tipo: 'CONTRATACAO', managerId: m.id, clubKey, clube, usuario: false });
};

/**
 * Demissao. A IA vai para o pool e o clube contrata um substituto. O utilizador NUNCA fica sem clube (sem game over): recebe o aviso e recomeca com confianca baixa e carencia.
 */
const demitir = (managers: Record<string, Manager>, porClube: Record<string, string>, m: Manager, clube: string, exigencia: number, jogos: number, eventos: EventoMgr[]) => {
  eventos.push({ tipo: 'DEMISSAO', managerId: m.id, clubKey: m.clubKey, clube, usuario: !!m.usuario });
  if (m.usuario) { managers[m.id] = { ...m, reputation: clamp(m.reputation + C.repDemitido), confidence: C.confUsuarioAposDemissao, lowConfRounds: 0, grace: C.carenciaUsuario }; return; }
  const k = m.clubKey!;
  managers[m.id] = { ...m, clubKey: null, reputation: clamp(m.reputation + C.repDemitido), confidence: C.confInicial, lowConfRounds: 0, grace: 0 };
  delete porClube[k];
  preencherVaga(managers, porClube, k, clube, exigencia, jogos, eventos, m.id);   // o demitido nao volta para o proprio clube
};

/** Atualiza a confianca de cada treinador com os jogos novos de cada liga e demite quem merece. Idempotente: sem jogos novos nada muda. */
export const processarRodada = (estado: ManagerState, ligas: LigaSnap[]): { estado: ManagerState; eventos: EventoMgr[] } => {
  const managers = { ...estado.managers };
  const porClube = indicePorClube(managers);
  const eventos: EventoMgr[] = [];
  for (const liga of ligas) {
    const n = liga.tabela.length;
    if (n < 2) continue;
    const ajustes = ajustesDeTradicao(liga.times);
    liga.tabela.forEach((row, i) => {
      const k = teamKey(liga.leagueId, row.team.id);
      const m = managers[porClube[k]];
      if (!m || row.played < C.minJogosAvaliar || row.played <= m.ultimoJogos) return;
      const nivel = nivelDoClube(row.team.strength, ajustes[row.team.id] ?? 0);
      const alvoPos = posicaoAlvo(nivel, n, liga.rebaixados);
      const passos = row.played - m.ultimoJogos;
      const conf = atualizarConfianca(m.confidence, alvoDeConfianca({ jogos: row.played, pontos: row.points, posicao: i + 1, n, alvo: alvoPos }), passos);
      const baixa = conf < C.limitePressao ? m.lowConfRounds + passos : conf >= C.neutro ? 0 : Math.max(0, m.lowConfRounds - passos);
      const novo: Manager = { ...m, confidence: conf, lowConfRounds: baixa, grace: Math.max(0, m.grace - passos), ultimoJogos: row.played };
      managers[m.id] = novo;
      if (m.usuario && faixaDeConfianca(conf) !== faixaDeConfianca(m.confidence) && conf < m.confidence && conf < C.limitePressao)
        eventos.push({ tipo: 'FAIXA', managerId: m.id, clubKey: k, clube: row.team.name, usuario: true, faixa: faixaDeConfianca(conf) });
      const zona = i + 1 > n - liga.rebaixados;
      if (criarRng(`demissao|${m.id}|${row.played}`)() < probDemissao(novo, zona, row.played)) demitir(managers, porClube, novo, row.team.name, exigenciaDoNivel(nivel), row.played, eventos);
    });
  }
  return { estado: garantirPool({ ...estado, managers }), eventos };
};
