/*
NEGOCIACAO DE RENOVACAO — o jogador pede um salario e uma duracao (a proposta dele); o treinador pode aceitar como esta (assina na hora e a moral sobe) ou mudar o salario
e/ou os anos. Mudou? O jogador leva 2 ou 3 dias analisando e depois decide: se aceita, o contrato e assinado com os termos do treinador e a moral sobe; se recusa, nada
muda no contrato e a moral cai. Tudo aqui e puro: o contexto do jogo guarda as negociacoes em andamento e chama `resolverNegociacoes` a cada dia.

O sorteio da decisao tem semente (jogador + dia da decisao): recarregar o jogo nao muda a resposta.
*/
import type { Contract, Player } from '../types';
import { Rnd, criarRng, sortearDuracao, somarAnos } from './contracts';

export const MORAL_AO_ACEITAR = 8;
export const MORAL_AO_RECUSAR = -15;
export const ANOS_MIN = 1;
export const ANOS_MAX = 6;

export interface Oferta { salario: number; anos: number; }
export interface Negociacao {
  id: string;
  playerId: string;
  nome: string;
  oferta: Oferta;            // o que o treinador propos
  pedido: Oferta;            // o que o jogador pedia
  inicio: string;            // ISO
  decide: string;            // ISO: o dia em que o jogador responde
}

const moral = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

/** A proposta do jogador: o salario pedido (o de mercado, 0,2% do valor por semana, com um aumento de 8% a 25% por jogador, nunca abaixo do atual) e a duracao da faixa da idade. */
export const propostaDoJogador = (p: Player, hoje: string): Oferta => {
  const rnd = criarRng(`pedido|${p.id}|${hoje.slice(0, 7)}`);
  const mercado = Math.round(p.value * 0.002);
  const salario = Math.max(p.salary, mercado) * (1.08 + rnd() * 0.17);
  const anos = sortearDuracao(p.age, criarRng(`anos|${p.id}|${hoje.slice(0, 7)}`));
  return { salario: Math.max(500, Math.round(salario / 10) * 10), anos };
};

/**
 * A chance de o jogador aceitar uma oferta, de 0 a 1. O salario pesa mais: 105% do pedido ou mais ja basta; 80% ou menos e recusa certa. A duracao longe da que ele quer tira
 * 8 pontos por ano de diferenca (12 quando e na direcao que ele nao gosta: o veterano de 33+ quer menos anos, o jovem quer mais). A moral mexe um pouco (+-10).
 * Uma oferta igual a proposta dele e aceita sempre.
 */
export const chanceDeAceitar = (p: Player, oferta: Oferta, pedido: Oferta): number => {
  if (oferta.salario >= pedido.salario && oferta.anos === pedido.anos) return 1;
  const r = oferta.salario / Math.max(1, pedido.salario);
  const base = Math.max(0, Math.min(1, (r - 0.8) / 0.25));
  const dif = oferta.anos - pedido.anos;
  const veterano = p.age >= 33;
  const contra = (veterano && dif > 0) || (!veterano && dif < 0);
  const penalidade = Math.abs(dif) * (contra ? 0.12 : 0.08);
  const humor = ((p.morale ?? 50) - 50) / 500;
  return Math.max(0.02, Math.min(0.98, base - penalidade + humor));
};

/** Um texto para o treinador, sem revelar a conta. */
export const humorDaOferta = (chance: number): 'MUITO_PROVAVEL' | 'PROVAVEL' | 'INCERTO' | 'IMPROVAVEL' =>
  chance >= 0.85 ? 'MUITO_PROVAVEL' : chance >= 0.55 ? 'PROVAVEL' : chance >= 0.25 ? 'INCERTO' : 'IMPROVAVEL';

/** Quantos dias o jogador demora: 2 ou 3. */
export const diasDeAnalise = (rnd: Rnd): number => 2 + Math.floor(rnd() * 2);

const somarDias = (iso: string, n: number): string => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

/** Abre uma negociacao: a resposta chega daqui a 2 ou 3 dias (fixo para o jogador e o dia). */
export const abrirNegociacao = (p: Player, oferta: Oferta, pedido: Oferta, hoje: string): Negociacao => ({
  id: `neg-${p.id}-${hoje}`, playerId: p.id, nome: p.name, oferta, pedido, inicio: hoje,
  decide: somarDias(hoje, diasDeAnalise(criarRng(`dias|${p.id}|${hoje}`)))
});

/** O contrato assinado com a oferta (comeca hoje). */
export const contratoDaOferta = (oferta: Oferta, hoje: string): Contract => ({ start: hoje, end: somarAnos(hoje, oferta.anos), years: oferta.anos });

/** Assina na hora (o treinador aceitou a proposta do jogador): contrato novo, salario novo, moral em alta. */
export const assinar = (p: Player, oferta: Oferta, hoje: string): Player => ({ ...p, contract: contratoDaOferta(oferta, hoje), salary: oferta.salario, morale: moral((p.morale ?? 50) + MORAL_AO_ACEITAR) });

export interface Resposta { negociacao: Negociacao; aceitou: boolean; jogador: Player; chance: number; }

/**
 * Resolve as negociacoes cujo dia chegou. Quem ja nao esta no clube do utilizador (vendido, contrato acabado) cancela sem resposta. Devolve as negociacoes que continuam,
 * os jogadores atualizados (contrato e salario novos e moral mais alta; ou so a moral mais baixa) e as respostas (para a Inbox).
 */
export const resolverNegociacoes = (negociacoes: Negociacao[], jogadores: Player[], hoje: string, donoId: string):
  { negociacoes: Negociacao[]; jogadores: Player[]; respostas: Resposta[] } => {
  if (!negociacoes.some(n => hoje >= n.decide)) return { negociacoes, jogadores, respostas: [] };
  const respostas: Resposta[] = [];
  const restantes: Negociacao[] = [];
  let lista = jogadores;
  for (const n of negociacoes) {
    if (hoje < n.decide) { restantes.push(n); continue; }
    const p = lista.find(x => x.id === n.playerId);
    if (!p || p.teamId !== donoId) continue;                               // saiu do clube: cancela
    const chance = chanceDeAceitar(p, n.oferta, n.pedido);
    const aceitou = criarRng(`decide|${n.id}|${n.decide}`)() < chance;
    const novo: Player = aceitou
      ? { ...p, contract: contratoDaOferta(n.oferta, hoje), salary: n.oferta.salario, morale: moral((p.morale ?? 50) + MORAL_AO_ACEITAR) }
      : { ...p, morale: moral((p.morale ?? 50) + MORAL_AO_RECUSAR) };
    lista = lista.map(x => (x.id === p.id ? novo : x));
    respostas.push({ negociacao: n, aceitou, jogador: novo, chance });
  }
  return { negociacoes: restantes, jogadores: lista, respostas };
};
