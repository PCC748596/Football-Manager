/*
DISPUTA DE PENALTIS (copas: jogo unico ou agregado empatado). So as regras, em codigo puro (sem React nem 3D), para a tela da ordem, o 3D e a simulacao usarem o mesmo.

REGRAS
  . 5 cobrancas para cada lado, alternadas (o `primeiro` bate primeiro).
  . A disputa acaba logo que um lado ja nao pode ser alcancado pelo outro com as cobrancas que lhe faltam das 5.
  . Empatadas as 5: uma cobranca para cada lado, alternadas (morte subita); acaba quando, com o mesmo numero de cobrancas, um lado esta a frente.
  . A ordem dos batedores e a do tecnico, com TODOS os jogadores (o guarda-redes tambem). Acabados os batedores, volta ao primeiro e segue a mesma sequencia.
  . A ordem automatica (CPU, ou o botao "Auto" da tela) e pelos melhores batedores: Penalties + Consistency.
*/
import { Player } from '../types';
import { campo3d } from './atributos3d';

export type Lado = 'casa' | 'fora';
export interface Cobranca { lado: Lado; jogadorId: string; gol: boolean; }
export type FaseDisputa = 'REGULAR' | 'MORTE_SUBITA';
export interface EstadoDisputa {
  golsCasa: number;
  golsFora: number;
  cobrancasCasa: number;
  cobrancasFora: number;
  fase: FaseDisputa;
  terminou: boolean;
  vencedor: Lado | null;
  /** Quem bate a seguir (null quando acabou). */
  proximoLado: Lado | null;
}

export const COBRANCAS_REGULARES = 5;

/** O valor de um batedor: Penalties + Consistency (0 a 200). */
export const notaDePenalti = (p: Player): number => campo3d(p, ['penalties']) + campo3d(p, ['consistency']);

/** A ordem automatica: todos os jogadores, dos melhores batedores para os piores (empate: o de maior OVR, e por fim o id, para ser sempre a mesma). */
export const ordemAutomatica = (jogadores: Player[]): string[] =>
  jogadores.slice().sort((a, b) => (notaDePenalti(b) - notaDePenalti(a)) || ((b.skill || 0) - (a.skill || 0)) || String(a.id).localeCompare(String(b.id))).map(p => p.id);

/**
 * Uma ordem guardada pode estar desatualizada (alguem vendido, dispensado ou contratado): tira quem ja nao esta no plantel, tira repetidos e poe no fim, pela ordem
 * automatica, quem falta. Sem ordem, devolve a automatica.
 */
export const normalizarOrdem = (ordem: string[] | undefined, jogadores: Player[]): string[] => {
  const ids = new Set(jogadores.map(p => p.id));
  const vistos = new Set<string>();
  const base = (ordem || []).filter(id => ids.has(id) && !vistos.has(id) && (vistos.add(id), true));
  const faltam = ordemAutomatica(jogadores.filter(p => !vistos.has(p.id)));
  return [...base, ...faltam];
};

/** O batedor da cobranca numero `n` (0, 1, 2...) de um lado: a ordem, e depois outra vez desde o primeiro. */
export const batedorDaVez = (ordem: string[], n: number): string | null => (ordem.length ? ordem[n % ordem.length] : null);

/** O estado da disputa depois das cobrancas dadas. `primeiro`: quem bate a primeira (por omissao a casa). */
export const estadoDaDisputa = (cobrancas: Cobranca[], primeiro: Lado = 'casa'): EstadoDisputa => {
  let gC = 0, gF = 0, nC = 0, nF = 0;
  for (const c of cobrancas) {
    if (c.lado === 'casa') { nC++; if (c.gol) gC++; } else { nF++; if (c.gol) gF++; }
  }
  const R = COBRANCAS_REGULARES;
  const faltaC = Math.max(0, R - nC), faltaF = Math.max(0, R - nF);
  let vencedor: Lado | null = null;
  const regular = nC < R || nF < R;
  if (regular) {
    // Nas 5 primeiras: acaba quando o outro ja nao chega, mesmo batendo todas as que lhe faltam.
    if (gC > gF + faltaF) vencedor = 'casa';
    else if (gF > gC + faltaC) vencedor = 'fora';
  } else if (nC === nF && gC !== gF) {
    // Morte subita (ou fim das 5): com o mesmo numero de cobrancas, quem esta a frente ganha.
    vencedor = gC > gF ? 'casa' : 'fora';
  }
  const fase: FaseDisputa = (nC >= R && nF >= R) ? 'MORTE_SUBITA' : 'REGULAR';
  // Bate quem tem menos cobrancas; com o mesmo numero, bate o `primeiro`.
  const prox: Lado | null = vencedor ? null : (nC === nF ? primeiro : (nC < nF ? 'casa' : 'fora'));
  return { golsCasa: gC, golsFora: gF, cobrancasCasa: nC, cobrancasFora: nF, fase, terminou: !!vencedor, vencedor, proximoLado: prox };
};

/** O proximo batedor da disputa (lado + jogador), ou null se acabou. */
export const proximaCobranca = (cobrancas: Cobranca[], ordemCasa: string[], ordemFora: string[], primeiro: Lado = 'casa'): { lado: Lado; jogadorId: string } | null => {
  const e = estadoDaDisputa(cobrancas, primeiro);
  if (!e.proximoLado) return null;
  const n = e.proximoLado === 'casa' ? e.cobrancasCasa : e.cobrancasFora;
  const id = batedorDaVez(e.proximoLado === 'casa' ? ordemCasa : ordemFora, n);
  return id ? { lado: e.proximoLado, jogadorId: id } : null;
};

/** A chance de converter: o batedor (Penalties + Consistency) contra o goleiro (One on ones + Reflexes). Entre 0,55 e 0,92. */
export const chanceDeGol = (batedor: Player, goleiro: Player | null): number => {
  const b = notaDePenalti(batedor) / 200;
  const g = goleiro ? (campo3d(goleiro, ['onos']) + campo3d(goleiro, ['reflexes'])) / 200 : 0.5;
  return Math.max(0.55, Math.min(0.92, 0.74 + (b - 0.5) * 0.3 - (g - 0.5) * 0.15));
};

/**
 * A disputa inteira simulada (para os jogos que nao se vem no 3D): as ordens de cada lado, o plantel por id e o sorteio injectavel (`rnd`, 0..1).
 * Devolve as cobrancas, ate haver vencedor (nunca fica em aberto: a morte subita continua ate decidir).
 */
export const simularDisputa = (
  ordemCasa: string[], ordemFora: string[], porId: Record<string, Player>, goleiroCasa: Player | null, goleiroFora: Player | null,
  rnd: () => number, primeiro: Lado = 'casa'
): Cobranca[] => simularDisputaCom(ordemCasa, ordemFora, (lado, id) => {
  const batedor = porId[id];
  const goleiro = lado === 'casa' ? goleiroFora : goleiroCasa;   // o goleiro e o do OUTRO lado
  return batedor ? chanceDeGol(batedor, goleiro) : 0.7;
}, rnd, primeiro);

/** Como `simularDisputa`, mas a chance de cada cobranca vem de fora (`chanceDe(lado, jogadorId)`): serve quando um dos lados nao tem jogadores reais. */
export const simularDisputaCom = (
  ordemCasa: string[], ordemFora: string[], chanceDe: (lado: Lado, jogadorId: string) => number, rnd: () => number, primeiro: Lado = 'casa'
): Cobranca[] => {
  const cobrancas: Cobranca[] = [];
  for (let guarda = 0; guarda < 200; guarda++) {
    const prox = proximaCobranca(cobrancas, ordemCasa, ordemFora, primeiro);
    if (!prox) break;
    cobrancas.push({ lado: prox.lado, jogadorId: prox.jogadorId, gol: rnd() < chanceDe(prox.lado, prox.jogadorId) });
  }
  return cobrancas;
};
