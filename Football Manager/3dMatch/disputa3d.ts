import { Player } from '../types';
import { Cobranca, Lado, estadoDaDisputa, normalizarOrdem, ordemAutomatica, proximaCobranca } from '../textSim/penaltyShootout';

/*
A DISPUTA DE PENALTIS EM 3D, o lado da app (funcoes puras + o estado da disputa da sessao 3D). O 3D fala com os ids REAIS em numero ('p-269063' -> 269063, o `skills.id` do
motor; o `FootballPlayer.id` do motor e o LUGAR e nunca chega aqui); o manager com os ids dele. A app e a arbitra: `proximaMensagem` diz o que responder ao 3D depois de cada
cobranca. Ver js/disputa_penaltis.js no simulador.
*/

/** O id do motor de um jogador do manager: os digitos finais de 'p-269063' (o `skills.id`, ver AdaptadorManager.idReal). */
export const idDoMotor = (idManager: string): number | null => {
  const m = /(\d+)$/.exec(String(idManager || ''));
  return m ? Number(m[1]) : null;
};

/** Os jogadores do manager cujo id do motor esta em `ids`, na ordem de `ids` (quem o motor nao conhece fica de fora). */
export const emCampo = (ids: number[], jogadores: Player[]): Player[] => {
  const porMotor = new Map<number, Player>();
  jogadores.forEach(p => { const n = idDoMotor(p.id); if (n !== null) porMotor.set(n, p); });
  return ids.map(n => porMotor.get(n)).filter((p): p is Player => !!p);
};

/** A ordem guardada do time, so para os que estao em campo: tira quem saiu e poe no fim, pela ordem automatica, quem falta. */
export const ordemParaOsEmCampo = (ordem: string[] | undefined, jogadoresEmCampo: Player[]): string[] => normalizarOrdem(ordem, jogadoresEmCampo);

/**
 * Guardar a ordem escolhida no 3D (so os que estao em campo) sem estragar a ordem do plantel inteiro (`team.penaltyOrder`, a do modal de texto): os de campo ficam,
 * pela nova ordem, nos LUGARES que ja ocupavam na ordem guardada; os do banco nao mexem.
 */
export const mesclarOrdem = (guardada: string[] | undefined, novaEmCampo: string[], plantel: Player[]): string[] => {
  const base = normalizarOrdem(guardada, plantel);
  const deCampo = new Set(novaEmCampo);
  const fila = novaEmCampo.filter(id => base.includes(id));
  return base.map(id => (deCampo.has(id) ? (fila.shift() as string) : id));
};

export type MensagemProxima =
  | { lado: Lado; jogadorId: number }
  | { fim: true; vencedor: Lado; pens: [number, number] }
  | { abortar: true; motivo: string };

/**
 * A resposta ao 3D depois de uma cobranca: o proximo batedor (id do motor) ou o fim, com os penaltis marcados por cada lado. Nunca lanca: sem proximo batedor (ordem vazia,
 * id sem digitos) devolve `abortar` — o 3D desfaz a disputa e o jogo acaba sem ela (o confronto cai no modal de texto).
 */
export const proximaMensagem = (cobrancas: Cobranca[], ordemCasa: string[], ordemFora: string[], primeiro: Lado): MensagemProxima => {
  const e = estadoDaDisputa(cobrancas, primeiro);
  if (e.terminou && e.vencedor) return { fim: true, vencedor: e.vencedor, pens: [e.golsCasa, e.golsFora] };
  const p = proximaCobranca(cobrancas, ordemCasa, ordemFora, primeiro);
  const id = p ? idDoMotor(p.jogadorId) : null;
  if (!p || id === null) return { abortar: true, motivo: 'sem proximo batedor' };
  return { lado: p.lado, jogadorId: id };
};

/*
O ESTADO DA DISPUTA DA SESSAO 3D. Vive aqui (fora do React) e nao no MatchDay: sair para o Tactics a meio da disputa desmonta o MatchDay, e o pedido da ordem, as ordens e as
cobrancas ja feitas perdiam-se (o 3D abortava e a disputa jogada ia fora). Chaveado pela sessao do iframe (a `chave` do Simulador3DView): outro jogo ou um RESET comecam do zero.
Enquanto o manager esta fora o 3D esta em pausa (nao corre prazos); ao continuar, o 3D reenvia o que estava a espera de resposta (ver DisputaPenaltis.reenviarPendente).
*/
export interface EstadoDisputa3d {
  chave: string;
  /** A reuniao a espera da ordem do utilizador (o modal aberto): os ids do motor em campo e quem comeca. */
  pedido: { casa: number[]; fora: number[]; primeiro: Lado } | null;
  ordens: { casa: string[]; fora: string[]; primeiro: Lado } | null;
  cobrancas: Cobranca[];
  /** O 3D mandou `disputa_fim`: o `fim` do jogo que se segue nao limpa o placar dos penaltis. */
  terminou: boolean;
}
const novoEstado = (chave: string): EstadoDisputa3d => ({ chave, pedido: null, ordens: null, cobrancas: [], terminou: false });
let estadoAtual: EstadoDisputa3d = novoEstado('');
export const disputa3dDaSessao = (chave: string): EstadoDisputa3d => {
  if (estadoAtual.chave !== chave) estadoAtual = novoEstado(chave);
  return estadoAtual;
};
export const limparDisputa3d = (e: EstadoDisputa3d) => { e.pedido = null; e.ordens = null; e.cobrancas = []; e.terminou = false; };

/** `disputa_reuniao`: abre o pedido da ordem. Um REENVIO (o 3D continua a espera da ordem depois de uma pausa) so reabre se a app ainda nao respondeu. */
export const aoReuniao = (e: EstadoDisputa3d, m: { casa: { id: number }[]; fora: { id: number }[]; primeiro: Lado; reenvio?: boolean }): void => {
  if (m.reenvio && e.ordens) return;
  if (!m.reenvio) { e.cobrancas = []; e.ordens = null; e.terminou = false; }
  e.pedido = { casa: m.casa.map(j => j.id), fora: m.fora.map(j => j.id), primeiro: m.primeiro };
};

/** O utilizador confirmou a ordem (`ordemCasa`/`ordemFora` em ids do manager): fecha o pedido e devolve a mensagem para o 3D. */
export const aoConfirmarOrdem = (e: EstadoDisputa3d, ordemCasa: string[], ordemFora: string[]): any => {
  const primeiro = e.pedido ? e.pedido.primeiro : 'casa';
  e.pedido = null;
  e.ordens = { casa: ordemCasa, fora: ordemFora, primeiro };
  const proxima = proximaMensagem([], ordemCasa, ordemFora, primeiro);
  if ('abortar' in proxima) {
    console.warn('[disputa 3D] ordem sem batedores: a disputa 3D e abortada', { ordemCasa, ordemFora });
    return { tipo: 'disputa_proxima', ...proxima };
  }
  if ('fim' in proxima) return { tipo: 'disputa_proxima', ...proxima };
  return { tipo: 'disputa_iniciar', ordemCasa: ordemCasa.map(idDoMotor), ordemFora: ordemFora.map(idDoMotor), proxima };
};

/**
 * `disputa_cobranca { lado, jogadorId, resultado, n }`: soma a cobranca e devolve a resposta (ou null se nao ha ordens). `n` e o indice da cobranca no 3D: um reenvio de uma
 * cobranca ja somada (a resposta perdeu-se numa pausa) nao soma outra vez, so responde de novo. `idManager` traduz o id do motor no id do manager.
 */
export const aoCobranca = (e: EstadoDisputa3d, m: { lado: Lado; jogadorId: number; resultado: string; n?: number }, idManager: (lado: Lado, id: number) => string): any => {
  const o = e.ordens;
  if (!o) { console.warn('[disputa 3D] cobranca recebida sem as ordens dos batedores (disputa_cobranca ignorada)', m); return null; }
  const n = typeof m.n === 'number' ? m.n : e.cobrancas.length;
  if (n < e.cobrancas.length) return { tipo: 'disputa_proxima', ...proximaMensagem(e.cobrancas.slice(0, n + 1), o.casa, o.fora, o.primeiro) };
  e.cobrancas = [...e.cobrancas, { lado: m.lado, jogadorId: idManager(m.lado, m.jogadorId), gol: m.resultado === 'gol' }];
  return { tipo: 'disputa_proxima', ...proximaMensagem(e.cobrancas, o.casa, o.fora, o.primeiro) };
};

/** A ordem do adversario (CPU) na disputa 3D: a automatica (Penalties + Consistency), so com os que estao em campo. */
export const ordemDaCpu = (jogadoresEmCampo: Player[]): string[] => ordemAutomatica(jogadoresEmCampo);
