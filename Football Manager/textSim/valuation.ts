/*
VALOR DE MERCADO DOS JOGADORES — uma formula centralizada e configuravel (`CONFIG_VALOR`), determinista: o mesmo jogador, na mesma data, vale sempre o mesmo.

O valor e uma REFERENCIA, nao um preco obrigatorio: a negociacao (textSim/transferencias.ts) parte dele e sobe ou desce conforme o contrato, o interesse de outros clubes, a necessidade
de venda e a importancia do jogador no elenco.

A base e a tabela por overall de textSim/economia.ts (EUR, liga neutra: 50 -> 25 mil; 60 -> 250 mil; 70 -> 3 M; 75 -> 10 M; 80 -> 35 M; 90 -> 130 M), multiplicada pelo peso da liga do clube e convertida
para dolares (cambio).

  valor = base(overall) x liga x idade x potencial x contrato x forma x posicao
  liga        peso economico da divisao do clube (economia.ts); sem clube registado = 1,0

  idade       curva linear por pontos (pico dos 22 aos 26)
  potencial   so para jovens: premia a margem de crescimento (potencial - overall), no maximo +60%, e e cortado por `potencialTeto` para um overall baixo nunca valer mais que um consolidado
  contrato    quanto menos tempo resta, menos vale (risco de saida gratuita); contrato vencido = 0,30 (o jogador e agente livre: nao ha taxa)
  forma       evolucao recente (soma das variacoes dos atributos): +-5% no maximo
  posicao     atacantes e pontas valem mais; defesas e goleiros menos
  individual  um fator fixo do PROPRIO jogador (+-7%, pelo id): dois jogadores com o mesmo perfil nao valem exatamente o mesmo (o mercado nao e uma tabela)

O ARREDONDAMENTO e pela grandeza: ate 100 mil de 500 em 500, ate 1 M de mil em mil, ate 10 M de 10 em 10 mil, acima de 100 em 100 mil. Quem fica abaixo do piso (`minimo`)
vale de 1x a 2x o piso (pelo id), para nao ficarem todos no mesmo numero.
(Nov/2026: antes era sempre de 10 em 10 mil, com piso de 20 mil: medido no mundo inteiro, 1005 jogadores valiam exatamente 20K e centenas 30K, 40K, 50K...)
*/
import type { Player } from '../types';
import { Position } from '../types';
import { valorBaseEUR, economiaDoClube, fatorIndividual } from './economia';
export { fatorIndividual };
import { paraDolares } from './cambio';

export const CONFIG_VALOR = {
  minimo: 5_000,
  maximo: 250_000_000,
  // passo do arredondamento por grandeza: [ate este valor, passo]
  arredondar: [[100_000, 500], [1_000_000, 1_000], [10_000_000, 10_000], [Infinity, 100_000]] as [number, number][],
  individual: 0.07,
  // idade -> fator (interpolado linearmente entre os pontos)
  idade: [[16, 1.35], [21, 1.15], [22, 1.0], [27, 1.0], [28, 0.85], [31, 0.85], [32, 0.60], [36, 0.15], [42, 0.08]] as [number, number][],
  // premio de potencial: peso por idade (o jovem tem mais futuro), e o teto do multiplicador
  potencialPeso: [[15, 0.60], [18, 0.55], [20, 0.45], [22, 0.30], [24, 0.15], [26, 0.0]] as [number, number][],
  potencialMargemMax: 30,
  potencialTeto: 1.6,
  // contrato: anos restantes -> fator
  contrato: [[0, 0.30], [0.5, 0.40], [1, 0.70], [1.5, 1.0], [3, 1.0], [4, 1.15]] as [number, number][],
  contratoVencido: 0.30,
  forma: { porPonto: 0.01, limite: 0.05 },
  goleiro: 0.85,
  // atacantes e pontas valorizam mais que defesas e laterais no mesmo patamar
  posicao: { ST: 1.10, SS: 1.08, LW: 1.08, RW: 1.08, AM: 1.04, CM: 1.0, LM: 1.0, RM: 1.0, DM: 0.97, CB: 0.92, LB: 0.92, RB: 0.92 } as Record<string, number>
};
export type ConfigValor = typeof CONFIG_VALOR;

const interpolar = (pontos: [number, number][], x: number): number => {
  if (x <= pontos[0][0]) return pontos[0][1];
  for (let i = 1; i < pontos.length; i++) {
    if (x <= pontos[i][0]) {
      const [x0, y0] = pontos[i - 1], [x1, y1] = pontos[i];
      return y0 + (y1 - y0) * ((x - x0) / (x1 - x0));
    }
  }
  return pontos[pontos.length - 1][1];
};

/** Anos de contrato que ainda restam em `hoje` (fracao de ano; 0 se vencido ou sem contrato). */
export const anosRestantes = (p: Player, hoje: string): number => {
  if (!p.contract || hoje >= p.contract.end) return 0;
  const a = Date.parse(hoje + 'T12:00:00Z'), b = Date.parse(p.contract.end + 'T12:00:00Z');
  return Math.max(0, (b - a) / (365.25 * 86400000));
};

/** O potencial a usar: o real (jovens da base e quem o tem) ou uma estimativa pela idade (profissionais: ate os 25 anos ainda ha margem). */
export const potencialParaValor = (p: Player): number => p.potential ?? Math.min(99, p.skill + Math.round(Math.max(0, 25 - p.age) * 1.2));

export const valorDeMercado = (p: Player, hoje: string, cfg: ConfigValor = CONFIG_VALOR): number => {
  const overall = Math.max(30, Math.min(99, p.skill));
  let v = paraDolares(valorBaseEUR(overall), 'EUR') * (economiaDoClube(p.teamId)?.valor ?? 1);
  v *= interpolar(cfg.idade, p.age);
  const margem = Math.max(0, Math.min(cfg.potencialMargemMax, potencialParaValor(p) - overall));
  v *= Math.min(cfg.potencialTeto, 1 + (margem / cfg.potencialMargemMax) * cfg.potencialMargemMax / 30 * interpolar(cfg.potencialPeso, p.age));
  const anos = anosRestantes(p, hoje);
  v *= (p.contract && hoje >= p.contract.end) ? cfg.contratoVencido : interpolar(cfg.contrato, anos);
  const g = p.lastGrowth;
  if (g) v *= 1 + Math.max(-cfg.forma.limite, Math.min(cfg.forma.limite, (g.def + g.pas + g.drb + g.sht) * cfg.forma.porPonto));
  if (p.position === Position.GK) v *= cfg.goleiro; else v *= cfg.posicao[p.position] ?? 1;
  v *= fatorIndividual(p.id, cfg.individual);
  if (v < cfg.minimo) v = cfg.minimo * (1 + (fatorIndividual(p.id + '|piso', 0.5) - 0.5));
  v = Math.min(cfg.maximo, v);
  const passo = (cfg.arredondar.find(([ate]) => v < ate) || cfg.arredondar[cfg.arredondar.length - 1])[1];
  return Math.max(cfg.minimo, Math.round(v / passo) * passo);
};

/** Recalcula o valor (`value`) de uma lista; devolve a MESMA lista se nada mudou (nao dispara re-render) e so cria objetos novos para quem mudou. */
export const recalcularValores = (jogadores: Player[], hoje: string, cfg: ConfigValor = CONFIG_VALOR): Player[] => {
  let mudou = false;
  const out = jogadores.map(p => {
    const v = valorDeMercado(p, hoje, cfg);
    if (v === p.value) return p;
    mudou = true;
    return { ...p, value: v };
  });
  return mudou ? out : jogadores;
};
