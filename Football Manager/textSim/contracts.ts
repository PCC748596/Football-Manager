/*
CONTRATOS DOS JOGADORES — datas reais (ISO yyyy-mm-dd), duracao sorteada pela idade NA ASSINATURA, e o estado do contrato (regular / atencao / critico / vencido).

Funcoes puras: nao leem o relogio nem o estado do jogo, recebem a data de hoje. Um contrato existente nunca muda sozinho (nem quando o jogador envelhece): so uma
renovacao ou uma nova assinatura cria outro, com a idade da data em que se assina.
*/
import type { Contract, Player } from '../types';
import { nomeAleatorio } from './nomes';

export type EstadoContrato = 'REGULAR' | 'ATENCAO' | 'CRITICO' | 'VENCIDO';
export type Rnd = () => number;

/** Faixa de duracao (anos, inclusive) por idade na assinatura. */
export const faixaDeContrato = (idade: number): [number, number] => {
  if (idade <= 25) return [4, 6];      // 15 a 25 (e abaixo de 15, por seguranca)
  if (idade <= 29) return [3, 5];      // 26 a 29
  if (idade <= 35) return [2, 3];      // 30 a 35
  return [1, 2];                       // 36 ou mais
};

/** Sorteia a duracao: todos os inteiros da faixa, com a mesma probabilidade. */
export const sortearDuracao = (idade: number, rnd: Rnd = Math.random): number => {
  const [min, max] = faixaDeContrato(idade);
  return min + Math.floor(rnd() * (max - min + 1));
};

// -- datas (UTC, sem fuso: o jogo guarda so o dia) --
const partes = (iso: string): [number, number, number] => { const [y, m, d] = iso.split('-').map(Number); return [y, m, d]; };
const iso = (y: number, m: number, d: number) => `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const diasDoMes = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Soma meses a uma data; o dia que nao existe no mes de chegada (31 de abril, 29 de fevereiro) cai no ultimo dia do mes. */
export const somarMeses = (data: string, meses: number): string => {
  const [y, m, d] = partes(data);
  const total = y * 12 + (m - 1) + meses;
  const ny = Math.floor(total / 12), nm = (total % 12 + 12) % 12 + 1;
  return iso(ny, nm, Math.min(d, diasDoMes(ny, nm)));
};
export const somarAnos = (data: string, anos: number): string => somarMeses(data, anos * 12);

/** Anos completos entre `nascimento` e `hoje` (a idade). */
export const idadeEm = (nascimento: string, hoje: string): number => {
  const [by, bm, bd] = partes(nascimento), [y, m, d] = partes(hoje);
  return y - by - ((m < bm || (m === bm && d < bd)) ? 1 : 0);
};

/** O mes (yyyy-mm) de uma data. */
export const mesDe = (data: string): string => data.slice(0, 7);

/** Meses INTEIROS que faltam de `hoje` ate `fim` (0 se ja passou); o calendario do jogo e que manda, nao uma conta de 30 dias. */
export const mesesRestantes = (fim: string, hoje: string): number => {
  if (hoje >= fim) return 0;
  const [hy, hm, hd] = partes(hoje), [fy, fm, fd] = partes(fim);
  let meses = (fy - hy) * 12 + (fm - hm);
  if (fd < hd) meses -= 1;
  return Math.max(0, meses);
};

/** Dias que faltam (0 se ja passou). */
export const diasRestantes = (fim: string, hoje: string): number => {
  const a = Date.UTC(...(partes(hoje).map((v, i) => (i === 1 ? v - 1 : v)) as [number, number, number]));
  const b = Date.UTC(...(partes(fim).map((v, i) => (i === 1 ? v - 1 : v)) as [number, number, number]));
  return Math.max(0, Math.round((b - a) / 86400000));
};

/**
 * Estado informativo: VENCIDO quando o fim foi atingido; CRITICO com 6 meses ou menos; ATENCAO com 12 meses ou menos; senao REGULAR (mais de 12 meses).
 * "12 meses ou menos" = o fim cai ate `hoje + 12 meses` (inclusive).
 */
export const estadoDoContrato = (c: Contract | undefined, hoje: string): EstadoContrato => {
  if (!c) return 'REGULAR';
  if (hoje >= c.end) return 'VENCIDO';
  if (c.end <= somarMeses(hoje, 6)) return 'CRITICO';
  if (c.end <= somarMeses(hoje, 12)) return 'ATENCAO';
  return 'REGULAR';
};

/** Um contrato assinado em `hoje` por um jogador com `idade` nessa data. */
export const novoContrato = (idade: number, hoje: string, rnd: Rnd = Math.random): Contract => {
  const years = sortearDuracao(idade, rnd);
  return { start: hoje, end: somarAnos(hoje, years), years };
};

/**
 * O contrato de um jogador que ja existia quando o jogo comecou: assinou no passado (ate 5 anos antes) com a duracao da idade que tinha entao, e ainda tem pelo
 * menos 1 mes pela frente. Nao e um sorteio de "tempo restante": e uma assinatura passada coerente com as faixas.
 */
export const contratoInicial = (idadeHoje: number, hoje: string, rnd: Rnd = Math.random): Contract => {
  for (let t = 0; t < 20; t++) {
    const passados = Math.floor(rnd() * 60);                       // meses desde a assinatura
    const idadeAssinatura = Math.max(15, idadeHoje - Math.floor(passados / 12));
    const years = sortearDuracao(idadeAssinatura, rnd);
    if (years * 12 - passados >= 1) {
      const start = somarMeses(hoje, -passados);
      return { start, end: somarAnos(start, years), years };
    }
  }
  return novoContrato(idadeHoje, hoje, rnd);   // improvavel: assina hoje
};

/** Renovacao: um contrato novo a partir de `hoje`, com a duracao da idade de hoje (o antigo nao e alterado, e substituido). */
export const renovarContrato = (idadeHoje: number, hoje: string, rnd: Rnd = Math.random): Contract => novoContrato(idadeHoje, hoje, rnd);

/** Gerador pseudo-aleatorio com semente (mulberry32): calendarios e bases reproduziveis entre aberturas do jogo. */
export const criarRng = (semente: string): Rnd => {
  let h = 1779033703;
  for (let i = 0; i < semente.length; i++) h = Math.imul(h ^ semente.charCodeAt(i), 3432918353) >>> 0;
  let a = h >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * O processamento diario dos contratos dos profissionais (puro). Quem ainda nao tem contrato recebe um coerente com as faixas; a idade acompanha o nascimento (quem veio da base);
 * no dia do vencimento o jogador do utilizador fica livre (`MARKET`) e os da CPU renovam (contrato novo a partir de hoje: o passado nao muda). Devolve a MESMA lista se nada mudou.
 */
export const processarContratos = (jogadores: Player[], hoje: string, donoId: string): { jogadores: Player[]; liberados: string[] } => {
  let mudou = false;
  const liberados: string[] = [];
  const out = jogadores.map(p => {
    let q = p;
    if (/^Player \d+$/.test(q.name)) q = { ...q, name: nomeAleatorio(criarRng('nome|' + q.id)) };   // os jogadores tapa-buraco antigos ganham um nome de verdade
    if (!q.contract) q = { ...q, contract: contratoInicial(q.age, hoje, criarRng('contrato|' + q.id)) };
    if (q.birthDate) { const idade = idadeEm(q.birthDate, hoje); if (idade !== q.age) q = { ...q, age: idade }; }
    if (q.teamId !== 'MARKET' && q.contract && hoje >= q.contract.end) {
      if (q.teamId === donoId) { liberados.push(q.id); q = { ...q, teamId: 'MARKET' }; }
      else q = { ...q, contract: renovarContrato(q.age, hoje, criarRng('renova|' + q.id + '|' + hoje)) };
    }
    if (q !== p) mudou = true;
    return q;
  });
  return { jogadores: mudou ? out : jogadores, liberados };
};
