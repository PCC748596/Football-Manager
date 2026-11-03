/*
SALARIOS DA SERIE A, C E D DO BRASIL: faixas em reais POR MES, pelo nivel do jogador na liga (percentil do overall entre os jogadores da propria liga).
A tabela do jogo e o salario semanal em dolares (`Player.salary`); aqui o valor mensal em BRL converte-se pelas taxas de Settings (cambio.ts) e por 4,33 semanas por mes.
Os pesos dos niveis e o `calibre` fazem a media da liga ficar perto da referencia (Serie A: R$ 140 000; Serie B: R$ 30 000; Serie C: R$ 8 000; Serie D: R$ 3 500 por mes). As faixas das series A, C e D sao as do utilizador; as da B sao estimadas para dar a media pedida. As outras ligas continuam com 0,2% do valor por semana.
*/
import type { Player, Team } from '../types';
import { paraDolares } from './cambio';

export const SEMANAS_NO_MES = 4.33;

interface Nivel { nome: string; peso: number; min: number; max: number; }
interface TabelaSerie { calibre: number; niveis: Nivel[]; }   // niveis do pior para o melhor; os pesos somam 1; min/max em reais por mes

export const SERIES_SALARIOS: Record<string, TabelaSerie> = {
  bra_serie_a: { calibre: 1, niveis: [
    { nome: 'Jovem / reserva', peso: 0.18, min: 10000, max: 25000 }, { nome: 'Reserva', peso: 0.20, min: 25000, max: 50000 }, { nome: 'Titular comum', peso: 0.22, min: 50000, max: 100000 },
    { nome: 'Bom titular', peso: 0.17, min: 100000, max: 180000 }, { nome: 'Destaque', peso: 0.12, min: 180000, max: 300000 }, { nome: 'Estrela', peso: 0.09, min: 300000, max: 600000 },
    { nome: 'Craque nacional', peso: 0.02, min: 600000, max: 1500000 }] },
  bra_serie_b: { calibre: 1.16, niveis: [
    { nome: 'Jovem / reserva', peso: 0.20, min: 4000, max: 8000 }, { nome: 'Reserva', peso: 0.22, min: 8000, max: 14000 }, { nome: 'Titular comum', peso: 0.24, min: 14000, max: 25000 },
    { nome: 'Bom titular', peso: 0.16, min: 25000, max: 40000 }, { nome: 'Destaque', peso: 0.12, min: 40000, max: 70000 }, { nome: 'Estrela', peso: 0.06, min: 70000, max: 120000 }] },
  bra_serie_c: { calibre: 1.085, niveis: [
    { nome: 'Jovem / reserva', peso: 0.30, min: 2000, max: 4000 }, { nome: 'Reserva', peso: 0.28, min: 4000, max: 6000 }, { nome: 'Titular comum', peso: 0.24, min: 6000, max: 10000 },
    { nome: 'Bom titular', peso: 0.10, min: 10000, max: 15000 }, { nome: 'Destaque', peso: 0.06, min: 15000, max: 25000 }, { nome: 'Estrela', peso: 0.02, min: 25000, max: 45000 }] },
  bra_serie_d: { calibre: 0.9, niveis: [
    { nome: 'Jovem / reserva', peso: 0.30, min: 1000, max: 2000 }, { nome: 'Reserva', peso: 0.28, min: 2000, max: 3000 }, { nome: 'Titular comum', peso: 0.24, min: 3000, max: 5000 },
    { nome: 'Bom titular', peso: 0.10, min: 5000, max: 8000 }, { nome: 'Destaque', peso: 0.06, min: 8000, max: 15000 }, { nome: 'Estrela', peso: 0.02, min: 15000, max: 30000 }] },
};

/** O salario mensal em reais de um jogador no percentil `p` (0 = pior da liga, 1 = melhor). */
export const salarioMensalBRL = (leagueId: string, p: number): number | null => {
  const tab = SERIES_SALARIOS[leagueId];
  if (!tab) return null;
  let acima = 1 - p, acc = 0;                     // fatia a partir do topo
  const niveis = [...tab.niveis].reverse();       // melhor primeiro
  for (const n of niveis) {
    if (acima <= acc + n.peso + 1e-9) { const t = 1 - (acima - acc) / n.peso; return Math.round(((n.min + (n.max - n.min) * Math.min(1, Math.max(0, t))) * tab.calibre) / 50) * 50; }
    acc += n.peso;
  }
  return Math.round(tab.niveis[0].min * tab.calibre);
};

/** O salario semanal em dolares do jogo (o `Player.salary`) para o mensal em reais. */
export const salarioSemanalUSD = (mensalBRL: number): number => Math.max(100, Math.round(paraDolares(mensalBRL, 'BRL') / SEMANAS_NO_MES));

/** Percentil (0..1) do overall de cada jogador entre os da lista (empates dividem a posicao). */
export const percentisDeNivel = (skills: number[]): number[] => {
  if (skills.length < 2) return skills.map(() => 0.5);
  return skills.map(v => { const abaixo = skills.filter(x => x < v).length, iguais = skills.filter(x => x === v).length; return (abaixo + (iguais - 1) / 2) / (skills.length - 1); });
};

/** Os salarios semanais (USD) dos jogadores de uma liga das series C/D, ou null se a liga nao tem tabela. */
export const salariosDaLiga = (leagueId: string, skills: number[]): number[] | null => {
  if (!SERIES_SALARIOS[leagueId]) return null;
  return percentisDeNivel(skills).map(p => salarioSemanalUSD(salarioMensalBRL(leagueId, p) as number));
};

/**
 * O salario de mercado (semanal, USD) de um jogador que joga numa liga com tabela (A, B, C ou D do Brasil): o da faixa do nivel dele entre os jogadores da liga.
 * `undefined` nas outras ligas (la vale 0,2% do valor por semana). Usado no pedido de renovacao (`propostaDoJogador`).
 */
export const salarioDeMercadoDaLiga = (p: Player, teams: Team[], players: Player[]): number | undefined => {
  const liga = teams.find(t => t.id === p.teamId)?.leagueId;
  if (!liga || !SERIES_SALARIOS[liga]) return undefined;
  const ids = new Set(teams.filter(t => t.leagueId === liga).map(t => t.id));
  const skills = players.filter(x => ids.has(x.teamId)).map(x => x.skill);
  const abaixo = skills.filter(v => v < p.skill).length, iguais = Math.max(1, skills.filter(v => v === p.skill).length);
  const pct = skills.length > 1 ? (abaixo + (iguais - 1) / 2) / (skills.length - 1) : 0.5;
  return salarioSemanalUSD(salarioMensalBRL(liga, pct) as number);
};
