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
