/*
PATROCINADORES — o banco de 50 empresas (25 Brasil, 25 exterior) e as regras do patrocinio principal do clube do utilizador (ver docs/superpowers/specs/2026-11-03-patrocinadores-design.md).

Um contrato por clube, de 1 a 4 anos, valor anual fixo pago em 12 parcelas mensais (no 1o dia de cada mes seguinte ao inicio). Entre os 60 dias finais pode-se renovar/trocar (o novo comeca no fim do atual).
A reputacao do clube (0-100) vem de fanBase, tradicao e forca, em percentil entre todos os clubes; cada patrocinador exige uma reputacao minima (0 a 90) pelo ranking de valor na sua regiao.
*/
import type { Team } from '../types';
import { paraDolares } from './cambio';
import { acharEntrada, percentis } from './tradicao';

export type RegiaoPatrocinio = 'BRASIL' | 'INTERNATIONAL';
export interface Patrocinador { id: string; nome: string; pais: string; cod: string; moeda: 'BRL' | 'EUR'; valorAnual: number; regiao: RegiaoPatrocinio; }
export interface ContratoPatrocinio { sponsorId: string; anos: number; valorAnualUSD: number; inicio: string; fim: string; parcelasPagas: number; ultimoMes: string; }

export const JANELA_RENOVACAO_DIAS = 60;
export const ANOS_MIN = 1, ANOS_MAX = 4;

const slug = (nome: string) => nome.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const BR = (nome: string, valorAnual: number): Patrocinador => ({ id: 'br-' + slug(nome), nome, pais: 'Brasil', cod: 'br', moeda: 'BRL', valorAnual, regiao: 'BRASIL' });
const EX = (nome: string, pais: string, cod: string, milhoes: number): Patrocinador => ({ id: 'ex-' + slug(nome), nome, pais, cod, moeda: 'EUR', valorAnual: milhoes * 1_000_000, regiao: 'INTERNATIONAL' });

export const PATROCINADORES: Patrocinador[] = [
  BR('Banco Aurora', 15_000_000), BR('BetArena', 12_000_000), BR('PrimeBank', 10_000_000), BR('EnergyUp', 8_000_000), BR('TechVision', 7_000_000),
  BR('AutoMax', 6_000_000), BR('SportsX', 5_500_000), BR('SuperMarket', 5_000_000), BR('FastNet', 4_500_000), BR('PowerDrink', 4_000_000),
  BR('Credix', 3_500_000), BR('SportLine', 3_000_000), BR('Connecta', 2_800_000), BR('FreshFood', 2_500_000), BR('MegaStore', 2_200_000),
  BR('GreenPower', 2_000_000), BR('DigitalOne', 1_800_000), BR('NutriMax', 1_500_000), BR('FiberOne', 1_300_000), BR('SafeLife', 1_200_000),
  BR('ShopNow', 1_000_000), BR('AthleticPro', 900_000), BR('TravelWorld', 800_000), BR('BuildMax', 600_000), BR('EcoFuture', 500_000),
  EX('Global Finance', 'EUA', 'us', 30), EX('Velocity Motors', 'Alemanha', 'de', 25), EX('Infinity Systems', 'EUA', 'us', 22), EX('GoldenBet', 'Reino Unido', 'gb', 20),
  EX('Global Motors', 'Japão', 'jp', 18), EX('NexTech', 'Coreia do Sul', 'kr', 16), EX('Prime Capital', 'Suíça', 'ch', 15), EX('E-Motion', 'Alemanha', 'de', 14),
  EX('PlayWin', 'Reino Unido', 'gb', 12), EX('SmartCore', 'EUA', 'us', 11), EX('UltraFit', 'Itália', 'it', 10), EX('DigitalOne Global', 'EUA', 'us', 9),
  EX('FiberOne Global', 'França', 'fr', 8), EX('HealthPlus', 'Suíça', 'ch', 7), EX('DriveX', 'Japão', 'jp', 6), EX('MaxSport', 'Espanha', 'es', 5.5),
  EX('EnergyCorp', 'Noruega', 'no', 5), EX('TotalSeg', 'Portugal', 'pt', 4.5), EX('LinkPlus', 'Canadá', 'ca', 4), EX('ProGear', 'Itália', 'it', 3.5),
  EX('FoodHouse', 'França', 'fr', 3), EX('SkyTravel', 'Emirados Árabes', 'ae', 2.5), EX('MetalOne', 'Alemanha', 'de', 2), EX('MedGlobal', 'Suíça', 'ch', 1.5),
  EX('EcoFuture Global', 'Suécia', 'se', 1),
];

/** Reputacao minima do clube: 90 no patrocinador de maior valor da regiao, 0 no de menor, linear pelo ranking. */
export const reputacaoMinima = (p: Patrocinador): number => {
  const regiao = PATROCINADORES.filter(x => x.regiao === p.regiao).sort((a, b) => paraDolares(b.valorAnual, b.moeda) - paraDolares(a.valorAnual, a.moeda));
  const i = regiao.findIndex(x => x.id === p.id);
  return Math.round(90 * (1 - i / (regiao.length - 1)));
};

/** Reputacao 0-100 do clube: fanBase (0,4) + tradicao (0,3) + forca (0,3), percentis entre `todos`. Clube sem entrada de tradicao usa o percentil da torcida. */
export const reputacaoDoClube = (time: Team, todos: Team[]): number => {
  const lista = todos.some(t => t.id === time.id) ? todos : [...todos, time];
  const i = lista.findIndex(t => t.id === time.id);
  const pTorcida = percentis(lista.map(t => t.fanBase || 0))[i];
  const pForca = percentis(lista.map(t => t.strength || 0))[i];
  const tradicao = acharEntrada(time.name)?.heritage ?? pTorcida;
  return Math.max(0, Math.min(100, Math.round(0.4 * pTorcida + 0.3 * tradicao + 0.3 * pForca)));
};

const diasEntre = (a: string, b: string) => Math.round((new Date(b + 'T12:00:00Z').getTime() - new Date(a + 'T12:00:00Z').getTime()) / 86400000);
export const diasParaFim = (c: ContratoPatrocinio, hoje: string): number => diasEntre(hoje, c.fim);

export type MotivoRecusa = 'ANOS' | 'REPUTACAO' | 'ATIVO' | 'JA_RENOVADO';
export const avaliarProposta = (rep: number, p: Patrocinador, atual: ContratoPatrocinio | undefined, proximo: ContratoPatrocinio | undefined, anos: number, hoje: string):
  { ok: true; renovacao: boolean } | { ok: false; motivo: MotivoRecusa } => {
  if (!Number.isInteger(anos) || anos < ANOS_MIN || anos > ANOS_MAX) return { ok: false, motivo: 'ANOS' };
  if (atual) {
    if (diasParaFim(atual, hoje) > JANELA_RENOVACAO_DIAS) return { ok: false, motivo: 'ATIVO' };
    if (proximo) return { ok: false, motivo: 'JA_RENOVADO' };
  }
  if (rep < reputacaoMinima(p)) return { ok: false, motivo: 'REPUTACAO' };
  return { ok: true, renovacao: !!atual };
};

export const statusDoPatrocinador = (rep: number, p: Patrocinador, atual: ContratoPatrocinio | undefined, proximo: ContratoPatrocinio | undefined, hoje: string): 'ATIVO' | 'DISPONIVEL' | 'BLOQUEADO' | 'INDISPONIVEL' => {
  if (atual?.sponsorId === p.id) return 'ATIVO';
  if (atual && (diasParaFim(atual, hoje) > JANELA_RENOVACAO_DIAS || proximo)) return 'INDISPONIVEL';
  return rep >= reputacaoMinima(p) ? 'DISPONIVEL' : 'BLOQUEADO';
};

const somaAnos = (iso: string, anos: number) => { const [y, m, d] = iso.split('-').map(Number); return `${y + anos}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; };
export const criarContrato = (p: Patrocinador, anos: number, inicio: string): ContratoPatrocinio =>
  ({ sponsorId: p.id, anos, valorAnualUSD: paraDolares(p.valorAnual, p.moeda), inicio, fim: somaAnos(inicio, anos), parcelasPagas: 0, ultimoMes: inicio.slice(0, 7) });

const mesesEntre = (a: string, b: string) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + (Number(b.slice(5, 7)) - Number(a.slice(5, 7)));

/** Parcelas vencidas ate `hoje` (uma por mes novo, no maximo 12 por ano de contrato). Devolve o contrato atualizado e o total em USD. */
export const pagarParcelas = (c: ContratoPatrocinio, hoje: string): { contrato: ContratoPatrocinio; usd: number; parcelas: number } => {
  const vencidas = Math.max(0, mesesEntre(c.ultimoMes, hoje.slice(0, 7)));
  const parcelas = Math.min(vencidas, c.anos * 12 - c.parcelasPagas);
  if (parcelas <= 0) return { contrato: vencidas > 0 ? { ...c, ultimoMes: hoje.slice(0, 7) } : c, usd: 0, parcelas: 0 };
  return { contrato: { ...c, parcelasPagas: c.parcelasPagas + parcelas, ultimoMes: hoje.slice(0, 7) }, usd: (c.valorAnualUSD / 12) * parcelas, parcelas };
};
