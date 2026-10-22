/*
VALOR DE MERCADO DOS JOGADORES — uma formula centralizada e configuravel (`CONFIG_VALOR`), determinista: o mesmo jogador, na mesma data, vale sempre o mesmo.

O valor e uma REFERENCIA, nao um preco obrigatorio: a negociacao (textSim/transferencias.ts) parte dele e sobe ou desce conforme o contrato, o interesse de outros clubes, a necessidade
de venda e a importancia do jogador no elenco.

A curva sai do ajuste dos valores reais da base de dados (11 406 jogadores, mediana por overall: 50 -> 3,65 M; 60 -> 6,2 M; 70 -> 7,5 M; 80 -> 16 M, ou seja ~5% por ponto de overall) e a
`escala` leva-os para a economia dos clubes do jogo (caixa mediano ~1,8 M; o maior ~15 M), para que o mercado nao seja uma coisa que so tres clubes podem pagar.

  valor = escala x base x crescimento^(overall-50) x idade x potencial x contrato x forma x posicao

  idade       curva linear por pontos (pico dos 22 aos 26)
  potencial   so para jovens: premia a margem de crescimento (potencial - overall), no maximo +60%, e e cortado por `potencialTeto` para um overall baixo nunca valer mais que um consolidado
  contrato    quanto menos tempo resta, menos vale (risco de saida gratuita); contrato vencido = 0,30 (o jogador e agente livre: nao ha taxa)
  forma       evolucao recente (soma das variacoes dos atributos): +-5% no maximo
  posicao     goleiro vale um pouco menos
*/
import type { Player } from '../types';
import { Position } from '../types';

export const CONFIG_VALOR = {
  escala: 0.30,
  base: 3_650_000,
  crescimento: 1.051,
  minimo: 20_000,
  maximo: 80_000_000,
  arredondar: 10_000,
  // idade -> fator (interpolado linearmente entre os pontos)
  idade: [[15, 0.70], [17, 0.85], [19, 0.95], [22, 1.05], [26, 1.05], [28, 0.97], [30, 0.85], [32, 0.70], [34, 0.52], [36, 0.35], [38, 0.22], [42, 0.12]] as [number, number][],
  // premio de potencial: peso por idade (o jovem tem mais futuro), e o teto do multiplicador
  potencialPeso: [[15, 0.60], [18, 0.55], [20, 0.45], [22, 0.30], [24, 0.15], [26, 0.0]] as [number, number][],
  potencialMargemMax: 30,
  potencialTeto: 1.6,
  // contrato: anos restantes -> fator
  contrato: [[0, 0.30], [0.25, 0.45], [0.5, 0.65], [1, 0.82], [2, 0.95], [3, 1.0]] as [number, number][],
  contratoVencido: 0.30,
  forma: { porPonto: 0.01, limite: 0.05 },
  goleiro: 0.85
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
  let v = cfg.escala * cfg.base * Math.pow(cfg.crescimento, overall - 50);
  v *= interpolar(cfg.idade, p.age);
  const margem = Math.max(0, Math.min(cfg.potencialMargemMax, potencialParaValor(p) - overall));
  v *= Math.min(cfg.potencialTeto, 1 + (margem / cfg.potencialMargemMax) * cfg.potencialMargemMax / 30 * interpolar(cfg.potencialPeso, p.age));
  const anos = anosRestantes(p, hoje);
  v *= (p.contract && hoje >= p.contract.end) ? cfg.contratoVencido : interpolar(cfg.contrato, anos);
  const g = p.lastGrowth;
  if (g) v *= 1 + Math.max(-cfg.forma.limite, Math.min(cfg.forma.limite, (g.def + g.pas + g.drb + g.sht) * cfg.forma.porPonto));
  if (p.position === Position.GK) v *= cfg.goleiro;
  v = Math.max(cfg.minimo, Math.min(cfg.maximo, v));
  return Math.round(v / cfg.arredondar) * cfg.arredondar;
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
