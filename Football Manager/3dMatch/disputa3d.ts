import { Player } from '../types';
import { Cobranca, Lado, estadoDaDisputa, normalizarOrdem, proximaCobranca } from '../textSim/penaltyShootout';

/*
A DISPUTA DE PENALTIS EM 3D, o lado da app (funcoes puras). O 3D fala com ids NUMERICOS do motor ('p-269063' -> 269063); o manager com os ids dele. A app e a arbitra:
`proximaMensagem` diz o que responder ao 3D depois de cada cobranca. Ver js/disputa_penaltis.js no simulador.
*/

/** O id do motor de um jogador do manager: os digitos finais de 'p-269063'. */
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

/** A resposta ao 3D depois de uma cobranca: o proximo batedor (id do motor) ou o fim, com os penaltis marcados por cada lado. */
export const proximaMensagem = (
  cobrancas: Cobranca[], ordemCasa: string[], ordemFora: string[], primeiro: Lado
): { lado: Lado; jogadorId: number } | { fim: true; vencedor: Lado; pens: [number, number] } => {
  const e = estadoDaDisputa(cobrancas, primeiro);
  if (e.terminou && e.vencedor) return { fim: true, vencedor: e.vencedor, pens: [e.golsCasa, e.golsFora] };
  const p = proximaCobranca(cobrancas, ordemCasa, ordemFora, primeiro);
  const id = p ? idDoMotor(p.jogadorId) : null;
  if (!p || id === null) throw new Error('disputa sem proximo batedor');
  return { lado: p.lado, jogadorId: id };
};
