/*
O MERCADO DE TRANSFERENCIAS — negociacao entre clubes, conclusao, financas e IA, tudo em funcoes PURAS sobre um `Universo` (jogadores, base Sub-20, clubes e o estado do mercado).
O contexto do jogo (context/GameContext.tsx) so chama estas funcoes e guarda o `Universo` que elas devolvem; a interface (components/TransferMarketView.tsx) so mostra o resultado.

FLUXO (o mesmo para o treinador humano e para a IA — nao ha aceitacao automatica nem transferencia sem negociacao valida):

  comprador propoe  ->  ENVIADA (o vendedor IA responde em 1-3 dias) | RECEBIDA (o vendedor e o humano: ele responde)
  vendedor responde ->  ACEITA | RECUSADA | CONTRAPROPOSTA (valor definido pelo motor; o comprador aceita, recusa ou faz nova oferta, ate `maxRodadas`)
  ACEITA            ->  CONCLUIDA quando TODAS as validacoes passam na hora (propriedade, janela, saldo e orcamento do comprador, elencos); senao fica ACEITA ate valer ou expirar
  ainda: RETIRADA (o comprador desiste) e EXPIRADA (prazo, ou o jogador ja nao esta no vendedor)

A CONCLUSAO e atomica: valida tudo ANTES de mexer em qualquer coisa; se falha, nada muda. O pagamento e integral, uma unica vez: debita o comprador, credita o vendedor, e cada lado leva um
registro na `transacoes` (id unico `tx-<negociacao>-C|V`: a mesma negociacao nunca contabiliza duas vezes). As outras propostas pelo mesmo jogador sao canceladas (EXPIRADA).

JOGADORES DO SUB-20 com `idadeMinimaBase` anos ou mais tambem podem ser negociados: saem da base do vendedor (que repoe a vaga, ficando sempre com 20) e entram no ELENCO PROFISSIONAL do comprador,
com o mesmo id, atributos, potencial e contrato.

AGENTES LIVRES (`teamId === 'MARKET'`) contratam-se sem taxa, com contrato novo pela idade; a janela nao se aplica se `agentesLivresForaDaJanela`.
*/
import type { Player, Team } from '../types';
import { Position } from '../types';
import { BaseState, completarBase, TAMANHO_BASE } from './youth';
import { criarRng, novoContrato, Rnd, somarMeses } from './contracts';
import { valorDeMercado } from './valuation';

// ------------------------------------------------------------------ configuracao
export interface Janela { de: string; ate: string; }   // 'MM-DD'
export const CONFIG_MERCADO = {
  // Janelas de transferencia (por id de pais; `padrao` vale para os outros). O jogo comeca em 1 de abril: a janela de inicio de ano ainda esta aberta.
  janelas: { padrao: [{ de: '01-01', ate: '04-10' }, { de: '07-01', ate: '08-31' }] as Janela[], porPais: {} as Record<string, Janela[]> },
  agentesLivresForaDaJanela: true,
  idadeMinimaBase: 18,                 // jovens do Sub-20 com esta idade ou mais podem ser negociados
  diasResposta: [1, 3] as [number, number],
  diasValidade: 7,                     // a negociacao expira
  maxRodadas: 3,                       // propostas do comprador por negociacao (a primeira + 2 revisoes)
  minimoElenco: { total: 20, GK: 2, DEF: 6, MID: 6, ATT: 3 },
  maximoElenco: 40,
  parteDaReceitaNoOrcamento: 0.5,      // quanto de uma venda volta ao orcamento de transferencias do vendedor
  orcamentoFator: 1.0,                 // orcamento inicial de transferencias = `initialTransfer` do clube x isto
  // Reposicao do orcamento de transferencias: nos dias da lista, o orcamento sobe (nunca desce) ate esta fracao do saldo em caixa do clube.
  reposicao: { dias: ['01-01', '07-01'], fracaoDoCaixa: 0.5 },
  decisao: { aceitaA: 1.0, contraDe: 0.85, recusaAbaixo: 0.6, ultimaRodadaAceitaDe: 0.93 },   // oferta / preco desejado
  precoDesejado: {
    titular: 0.12, segundo: 0.06, goleiroTitular: 0.10,       // importancia no elenco
    listado: -0.08, caixaApertado: -0.05, caixaNegativo: -0.10,
    porInteressado: 0.06, maxInteresse: 0.18,
    rigidez: [0.95, 1.10] as [number, number]                 // personalidade do clube (fixa por clube)
  },
  ia: {
    clubesPorDia: 14, maxNegociacoesAtivasPorClube: 2, maxConclusoesPorDia: 10, maxPropostasNovasPorDia: 12,
    desejado: { GK: 3, DEF: 9, MID: 9, ATT: 6 } as Record<Grupo, number>,
    margemUpgrade: 4, maxElenco: 32, probOfertaAoHumano: 0.12, bonusListado: 0.35,
    orcamentoMaxPorOferta: 0.75, apetite: [0.85, 1.05] as [number, number], toleranciaContra: 1.08,
    diasParaDispensar: 21, diasAgenteLivre: 240
  },
  maxTransacoes: 4000
};
export type ConfigMercado = typeof CONFIG_MERCADO;

// ------------------------------------------------------------------ tipos
export type Grupo = 'GK' | 'DEF' | 'MID' | 'ATT';
export type EstadoNegociacao = 'ENVIADA' | 'RECEBIDA' | 'CONTRAPROPOSTA' | 'ACEITA' | 'RECUSADA' | 'RETIRADA' | 'EXPIRADA' | 'CONCLUIDA';
export const ESTADOS_ATIVOS: EstadoNegociacao[] = ['ENVIADA', 'RECEBIDA', 'CONTRAPROPOSTA', 'ACEITA'];

export interface Proposta { n: number; de: 'COMPRADOR' | 'VENDEDOR'; valor: number; data: string; }
export interface NegociacaoTransf {
  id: string;
  playerId: string;
  compradorId: string;
  vendedorId: string;
  origem: 'ELENCO' | 'BASE';          // onde o jogador estava
  estado: EstadoNegociacao;
  aguarda: 'VENDEDOR' | 'COMPRADOR' | null;
  valor: number;                      // a proposta vigente
  rodadas: number;                    // propostas do comprador
  criada: string; atualizada: string; expira: string;
  respondeEm: string | null;          // dia em que a IA do outro lado responde
  historico: Proposta[];
  motivo?: string;
}
export interface Transacao {
  id: string; data: string; clubeId: string; jogadorId: string; jogadorNome: string; contraparteId: string;
  natureza: 'COMPRA' | 'VENDA' | 'AGENTE_LIVRE'; valor: number;
  saldoAntes: number; saldoDepois: number; orcamentoAntes: number; orcamentoDepois: number; negId: string | null;
}
export interface Movimento { id: string; data: string; jogadorId: string; jogadorNome: string; de: string; para: string; valor: number; tipo: 'TRANSFERENCIA' | 'AGENTE_LIVRE' | 'DISPENSA'; }
export interface MercadoState {
  negociacoes: NegociacaoTransf[];
  transacoes: Transacao[];
  historico: Movimento[];
  proximoNum: number;
  ultimoDia: string;                  // ultimo dia processado pelo `tickDoDia` (uma vez por dia)
  mesDosValores: string;              // yyyy-mm do ultimo recalculo mensal dos valores
}
export interface Universo { players: Player[]; base: BaseState | null; teams: Team[]; mercado: MercadoState; }
export interface Evento {
  tipo: 'OFERTA_RECEBIDA' | 'CONTRAPROPOSTA' | 'ACEITA' | 'RECUSADA' | 'EXPIRADA' | 'CONCLUIDA_COMPRA' | 'CONCLUIDA_VENDA' | 'AGENTE_LIVRE' | 'BLOQUEADA';
  negId: string | null; jogadorId: string; jogadorNome: string; clubeId: string; clubeNome: string; valor: number; motivo?: string;
}
export interface Resultado { u: Universo; ok: boolean; motivo?: string; eventos: Evento[]; negId?: string; }

export const mercadoVazio = (hoje: string): MercadoState => ({ negociacoes: [], transacoes: [], historico: [], proximoNum: 1, ultimoDia: '', mesDosValores: '' });

// ------------------------------------------------------------------ utilidades
export const grupoDe = (pos: Position): Grupo =>
  pos === Position.GK ? 'GK' : [Position.LB, Position.CB, Position.RB].includes(pos) ? 'DEF'
    : [Position.DM, Position.LM, Position.CM, Position.RM, Position.AM].includes(pos) ? 'MID' : 'ATT';

const somarDias = (iso: string, n: number): string => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const diasEntre = (a: string, b: string) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
const arred = (v: number) => Math.round(v / 1000) * 1000;
const clube = (u: Universo, id: string): Team | undefined => u.teams.find(t => t.id === id);

/** A janela de transferencias esta aberta em `hoje` para o pais? */
export const janelaAberta = (hoje: string, paisId?: string, cfg: ConfigMercado = CONFIG_MERCADO): boolean => {
  const lista = (paisId && cfg.janelas.porPais[paisId]) || cfg.janelas.padrao;
  const md = hoje.slice(5);
  return lista.some(j => md >= j.de && md <= j.ate);
};
/** Os dias que faltam para a janela fechar (null se fechada). */
export const diasParaFecharJanela = (hoje: string, paisId?: string, cfg: ConfigMercado = CONFIG_MERCADO): number | null => {
  const lista = (paisId && cfg.janelas.porPais[paisId]) || cfg.janelas.padrao;
  const ano = hoje.slice(0, 4), md = hoje.slice(5);
  for (const j of lista) if (md >= j.de && md <= j.ate) return diasEntre(hoje, `${ano}-${j.ate}`);
  return null;
};

/** Personalidade de cada clube: fixa (semente = id). `rigidez` multiplica o preco que pede; `apetite` o quanto paga de bom grado. */
export const perfilDoClube = (teamId: string, cfg: ConfigMercado = CONFIG_MERCADO) => {
  const r = criarRng('perfil|' + teamId);
  const [r0, r1] = cfg.precoDesejado.rigidez, [a0, a1] = cfg.ia.apetite;
  return { rigidez: r0 + r() * (r1 - r0), apetite: a0 + r() * (a1 - a0), ativo: 0.6 + r() * 0.8 };
};

export const orcamentoInicial = (t: Team, cfg: ConfigMercado = CONFIG_MERCADO): number => Math.round((t.initialTransfer ?? t.cash * 0.7) * cfg.orcamentoFator);
/** Garante o orcamento de transferencias em todos os clubes (so preenche o que falta; devolve a MESMA lista se nada mudou). */
export const prepararOrcamentos = (teams: Team[], cfg: ConfigMercado = CONFIG_MERCADO): Team[] => {
  if (teams.every(t => typeof t.transferBudget === 'number')) return teams;
  return teams.map(t => (typeof t.transferBudget === 'number' ? t : { ...t, transferBudget: orcamentoInicial(t, cfg) }));
};

// ------------------------------------------------------------------ localizar jogadores e elencos
export interface Local { jogador: Player; origem: 'ELENCO' | 'BASE' | 'LIVRE'; }
export const localizar = (u: Universo, id: string): Local | null => {
  const p = u.players.find(x => x.id === id);
  if (p) return { jogador: p, origem: p.teamId === 'MARKET' ? 'LIVRE' : 'ELENCO' };
  const b = u.base?.jogadores.find(x => x.id === id);
  return b ? { jogador: b, origem: 'BASE' } : null;
};
const elencoDe = (u: Universo, teamId: string): Player[] => u.players.filter(p => p.teamId === teamId);

/** O elenco do vendedor continua funcional depois de perder `p`? (minimos configuraveis por posicao). */
export const elencoValidoSem = (elenco: Player[], p: Player, cfg: ConfigMercado = CONFIG_MERCADO): boolean => {
  const resto = elenco.filter(x => x.id !== p.id);
  if (resto.length < cfg.minimoElenco.total) return false;
  const n: Record<Grupo, number> = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
  resto.forEach(x => { n[grupoDe(x.position)]++; });
  return n.GK >= cfg.minimoElenco.GK && n.DEF >= cfg.minimoElenco.DEF && n.MID >= cfg.minimoElenco.MID && n.ATT >= cfg.minimoElenco.ATT;
};

// ------------------------------------------------------------------ preco desejado e decisao do vendedor
/** O que o vendedor quer pelo jogador: o valor de mercado ajustado pela importancia dele, pelo interesse de outros clubes, pela situacao financeira, pelo estar a venda e pela personalidade do clube. */
export const precoDesejado = (u: Universo, p: Player, vendedorId: string, hoje: string, ignorarNeg?: string, cfg: ConfigMercado = CONFIG_MERCADO): number => {
  const P = cfg.precoDesejado;
  const valor = valorDeMercado(p, hoje);
  let f = 1;
  const doGrupo = u.players.filter(x => x.teamId === vendedorId && grupoDe(x.position) === grupoDe(p.position)).sort((a, b) => b.skill - a.skill);
  const posto = doGrupo.findIndex(x => x.id === p.id);
  if (posto === 0) f += grupoDe(p.position) === 'GK' ? P.goleiroTitular : P.titular;
  else if (posto > 0 && posto <= 2) f += P.segundo;
  if (p.listedForSale) f += P.listado;
  const t = clube(u, vendedorId);
  if (t) { if (t.cash < 0) f += P.caixaNegativo; else if (t.cash < valor) f += P.caixaApertado; }
  const interessados = u.mercado.negociacoes.filter(n => n.playerId === p.id && n.id !== ignorarNeg && ESTADOS_ATIVOS.includes(n.estado)).length;
  f += Math.min(P.maxInteresse, interessados * P.porInteressado);
  f *= perfilDoClube(vendedorId, cfg).rigidez;
  return Math.max(20_000, arred(valor * f));
};

export interface Decisao { decisao: 'ACEITA' | 'RECUSA' | 'CONTRA'; contra?: number; motivo?: string; desejado: number; }
/** O vendedor (IA ou a regra para o humano) avalia uma oferta: aceita, recusa ou faz contraproposta (valor entre a oferta e o preco desejado). */
export const avaliarOferta = (u: Universo, neg: NegociacaoTransf, oferta: number, hoje: string, cfg: ConfigMercado = CONFIG_MERCADO): Decisao => {
  const loc = localizar(u, neg.playerId);
  const desejado = loc ? precoDesejado(u, loc.jogador, neg.vendedorId, hoje, neg.id, cfg) : oferta;
  if (!loc) return { decisao: 'RECUSA', motivo: 'jogador indisponivel', desejado };
  if (loc.origem === 'ELENCO' && !elencoValidoSem(elencoDe(u, neg.vendedorId), loc.jogador, cfg)) return { decisao: 'RECUSA', motivo: 'o elenco ficaria sem o minimo', desejado };
  const D = cfg.decisao, r = oferta / Math.max(1, desejado);
  const ultima = neg.rodadas >= cfg.maxRodadas;
  if (r >= D.aceitaA) return { decisao: 'ACEITA', desejado };
  if (ultima) return r >= D.ultimaRodadaAceitaDe ? { decisao: 'ACEITA', desejado } : { decisao: 'RECUSA', motivo: 'proposta final insuficiente', desejado };
  if (r >= D.contraDe) return { decisao: 'CONTRA', contra: Math.min(desejado, Math.max(arred(oferta * 1.05), arred(desejado * 0.97))), desejado };
  if (r >= D.recusaAbaixo) return { decisao: 'CONTRA', contra: desejado, desejado };
  return { decisao: 'RECUSA', motivo: 'oferta muito baixa', desejado };
};

// ------------------------------------------------------------------ operacoes sobre o estado
const comNeg = (u: Universo, neg: NegociacaoTransf): Universo => ({ ...u, mercado: { ...u.mercado, negociacoes: u.mercado.negociacoes.map(n => (n.id === neg.id ? neg : n)) } });
const adicionarNeg = (u: Universo, neg: NegociacaoTransf): Universo => ({ ...u, mercado: { ...u.mercado, negociacoes: [...u.mercado.negociacoes, neg], proximoNum: u.mercado.proximoNum + 1 } });
const ev = (u: Universo, tipo: Evento['tipo'], neg: NegociacaoTransf | null, p: Player, clubeId: string, valor: number, motivo?: string): Evento =>
  ({ tipo, negId: neg ? neg.id : null, jogadorId: p.id, jogadorNome: p.name, clubeId, clubeNome: clube(u, clubeId)?.name || clubeId, valor, motivo });
const diasDeResposta = (semente: string, cfg: ConfigMercado): number => { const [a, b] = cfg.diasResposta; return a + Math.floor(criarRng(semente)() * (b - a + 1)); };

/** Abre uma negociacao de COMPRA: `compradorId` propoe `valor` pelo jogador. O vendedor humano recebe (RECEBIDA); o vendedor IA responde em 1-3 dias (ENVIADA). */
export const proporCompra = (u: Universo, compradorId: string, playerId: string, valor: number, hoje: string, donoId: string, cfg: ConfigMercado = CONFIG_MERCADO): Resultado => {
  const falha = (motivo: string): Resultado => ({ u, ok: false, motivo, eventos: [] });
  const loc = localizar(u, playerId);
  if (!loc) return falha('jogador nao encontrado');
  if (loc.origem === 'LIVRE') return falha('agente livre: contrate-o sem taxa');
  const p = loc.jogador, vendedorId = p.teamId;
  if (vendedorId === compradorId) return falha('o jogador ja e do clube');
  if (!clube(u, compradorId) || !clube(u, vendedorId)) return falha('clube desconhecido');
  if (loc.origem === 'BASE' && p.age < cfg.idadeMinimaBase) return falha(`so jogadores do Sub-20 com ${cfg.idadeMinimaBase} anos ou mais`);
  if (!(valor > 0) || !isFinite(valor)) return falha('valor invalido');
  if (u.mercado.negociacoes.some(n => n.playerId === playerId && n.compradorId === compradorId && ESTADOS_ATIVOS.includes(n.estado))) return falha('ja existe uma negociacao ativa por este jogador');
  const num = u.mercado.proximoNum;
  const humanoVende = vendedorId === donoId;
  const neg: NegociacaoTransf = {
    id: `neg-${num}`, playerId, compradorId, vendedorId, origem: loc.origem, estado: humanoVende ? 'RECEBIDA' : 'ENVIADA', aguarda: 'VENDEDOR',
    valor: arred(valor), rodadas: 1, criada: hoje, atualizada: hoje, expira: somarDias(hoje, cfg.diasValidade),
    respondeEm: humanoVende ? null : somarDias(hoje, diasDeResposta(`resp|neg-${num}|1`, cfg)),
    historico: [{ n: 1, de: 'COMPRADOR', valor: arred(valor), data: hoje }]
  };
  const eventos = humanoVende ? [ev(u, 'OFERTA_RECEBIDA', neg, p, compradorId, neg.valor)] : [];
  return { u: adicionarNeg(u, neg), ok: true, eventos, negId: neg.id };
};

/** O comprador desiste: a negociacao ativa passa a RETIRADA. */
export const retirar = (u: Universo, negId: string, hoje: string): Resultado => {
  const neg = u.mercado.negociacoes.find(n => n.id === negId);
  if (!neg || !ESTADOS_ATIVOS.includes(neg.estado)) return { u, ok: false, motivo: 'negociacao nao esta ativa', eventos: [] };
  return { u: comNeg(u, { ...neg, estado: 'RETIRADA', aguarda: null, atualizada: hoje, respondeEm: null }), ok: true, eventos: [] };
};

/** O vendedor HUMANO responde a uma oferta recebida: aceita (tenta concluir), recusa ou faz contraproposta (o comprador IA responde em 1-3 dias). */
export const responderComoVendedor = (u: Universo, negId: string, acao: 'ACEITAR' | 'RECUSAR' | 'CONTRA', valor: number | undefined, hoje: string, donoId: string, cfg: ConfigMercado = CONFIG_MERCADO): Resultado => {
  const neg = u.mercado.negociacoes.find(n => n.id === negId);
  if (!neg || neg.vendedorId !== donoId || neg.aguarda !== 'VENDEDOR' || !ESTADOS_ATIVOS.includes(neg.estado)) return { u, ok: false, motivo: 'nao ha oferta para responder', eventos: [] };
  if (acao === 'RECUSAR') return { u: comNeg(u, { ...neg, estado: 'RECUSADA', aguarda: null, atualizada: hoje, motivo: 'recusada pelo vendedor' }), ok: true, eventos: [] };
  if (acao === 'ACEITAR') return concluirAceita(u, { ...neg, estado: 'ACEITA', aguarda: null, atualizada: hoje, respondeEm: null }, hoje, donoId, cfg);
  if (!(valor && valor > neg.valor)) return { u, ok: false, motivo: 'a contraproposta tem de ser maior que a oferta', eventos: [] };
  const n2: NegociacaoTransf = {
    ...neg, estado: 'CONTRAPROPOSTA', aguarda: 'COMPRADOR', valor: arred(valor), atualizada: hoje, expira: somarDias(hoje, cfg.diasValidade),
    respondeEm: somarDias(hoje, diasDeResposta(`contra|${neg.id}|${neg.historico.length}`, cfg)), historico: [...neg.historico, { n: neg.historico.length + 1, de: 'VENDEDOR', valor: arred(valor), data: hoje }]
  };
  return { u: comNeg(u, n2), ok: true, eventos: [] };
};

/** O comprador HUMANO responde a uma contraproposta: aceita, recusa ou faz nova oferta (ate `maxRodadas`). */
export const responderComoComprador = (u: Universo, negId: string, acao: 'ACEITAR' | 'RECUSAR' | 'NOVA_OFERTA', valor: number | undefined, hoje: string, donoId: string, cfg: ConfigMercado = CONFIG_MERCADO): Resultado => {
  const neg = u.mercado.negociacoes.find(n => n.id === negId);
  if (!neg || neg.compradorId !== donoId || neg.estado !== 'CONTRAPROPOSTA' || neg.aguarda !== 'COMPRADOR') return { u, ok: false, motivo: 'nao ha contraproposta para responder', eventos: [] };
  if (acao === 'RECUSAR') return { u: comNeg(u, { ...neg, estado: 'RECUSADA', aguarda: null, atualizada: hoje, motivo: 'contraproposta recusada' }), ok: true, eventos: [] };
  if (acao === 'ACEITAR') return concluirAceita(u, { ...neg, estado: 'ACEITA', aguarda: null, atualizada: hoje, respondeEm: null }, hoje, donoId, cfg);
  if (neg.rodadas >= cfg.maxRodadas) return { u, ok: false, motivo: 'limite de propostas atingido', eventos: [] };
  if (!(valor && valor > 0)) return { u, ok: false, motivo: 'valor invalido', eventos: [] };
  const humanoVende = neg.vendedorId === donoId;
  const n2: NegociacaoTransf = {
    ...neg, estado: humanoVende ? 'RECEBIDA' : 'ENVIADA', aguarda: 'VENDEDOR', valor: arred(valor), rodadas: neg.rodadas + 1, atualizada: hoje, expira: somarDias(hoje, cfg.diasValidade),
    respondeEm: humanoVende ? null : somarDias(hoje, diasDeResposta(`resp|${neg.id}|${neg.rodadas + 1}`, cfg)), historico: [...neg.historico, { n: neg.historico.length + 1, de: 'COMPRADOR', valor: arred(valor), data: hoje }]
  };
  return { u: comNeg(u, n2), ok: true, eventos: [] };
};

/** Poe ou tira o jogador da lista de venda (so sinaliza ao mercado: nao transfere nada). Vale para o elenco e para o Sub-20 (com a idade minima). */
export const listarParaVenda = (u: Universo, playerId: string, listar: boolean, cfg: ConfigMercado = CONFIG_MERCADO): Resultado => {
  const loc = localizar(u, playerId);
  if (!loc || loc.origem === 'LIVRE') return { u, ok: false, motivo: 'jogador nao pertence a um clube', eventos: [] };
  if (loc.origem === 'BASE' && loc.jogador.age < cfg.idadeMinimaBase) return { u, ok: false, motivo: `Sub-20 so a partir dos ${cfg.idadeMinimaBase} anos`, eventos: [] };
  if (!!loc.jogador.listedForSale === listar) return { u, ok: true, eventos: [] };
  const marca = (p: Player): Player => (p.id === playerId ? { ...p, listedForSale: listar } : p);
  return loc.origem === 'ELENCO'
    ? { u: { ...u, players: u.players.map(marca) }, ok: true, eventos: [] }
    : { u: { ...u, base: u.base ? { ...u.base, jogadores: u.base.jogadores.map(marca) } : u.base }, ok: true, eventos: [] };
};

// ------------------------------------------------------------------ conclusao (atomica)
const numeroLivre = (elenco: Player[]): number => { const usados = new Set(elenco.map(p => p.shirtNumber)); for (let n = 1; n <= 99; n++) if (!usados.has(n)) return n; return 99; };
const limparEscalacao = (t: Team, id: string): Team => (
  (t.lineup || []).includes(id) || (t.bench || []).includes(id)
    ? { ...t, lineup: (t.lineup || []).map(x => (x === id ? '' : x)), bench: (t.bench || []).map(x => (x === id ? '' : x)) } : t);

/** Valida TUDO e so entao efetiva: devolve ok=false e o universo intacto se qualquer validacao falhar. */
export const concluir = (u: Universo, negId: string, hoje: string, cfg: ConfigMercado = CONFIG_MERCADO): Resultado => {
  const neg = u.mercado.negociacoes.find(n => n.id === negId);
  const falha = (motivo: string): Resultado => ({ u, ok: false, motivo, eventos: [], negId });
  if (!neg) return falha('negociacao inexistente');
  if (neg.estado === 'CONCLUIDA') return falha('ja concluida');                                   // idempotente: nunca processa duas vezes
  if (neg.estado !== 'ACEITA') return falha('a negociacao nao foi aceita');
  if (u.mercado.transacoes.some(t => t.id === `tx-${neg.id}-C`)) return falha('ja contabilizada');
  const loc = localizar(u, neg.playerId);
  if (!loc || loc.origem === 'LIVRE' || loc.jogador.teamId !== neg.vendedorId) return falha('o jogador ja nao pertence ao vendedor');
  const p = loc.jogador;
  if (p.contract && hoje >= p.contract.end) return falha('contrato vencido');
  const pais = clube(u, neg.compradorId)?.country;
  if (!janelaAberta(hoje, pais, cfg)) return falha('fora da janela de transferencias');
  const comprador = clube(u, neg.compradorId), vendedor = clube(u, neg.vendedorId);
  if (!comprador || !vendedor) return falha('clube desconhecido');
  const valor = neg.valor;
  if (comprador.cash < valor) return falha('saldo insuficiente');
  if ((comprador.transferBudget ?? 0) < valor) return falha('orcamento de transferencias insuficiente');
  const elencoComprador = elencoDe(u, neg.compradorId);
  if (elencoComprador.length >= cfg.maximoElenco) return falha('elenco do comprador cheio');
  if (loc.origem === 'ELENCO' && !elencoValidoSem(elencoDe(u, neg.vendedorId), p, cfg)) return falha('o elenco do vendedor ficaria sem o minimo');

  // --- tudo valido: efetiva ---
  const novo: Player = { ...p, teamId: neg.compradorId, shirtNumber: numeroLivre(elencoComprador), listedForSale: false, trainingGroupId: 0 };
  let players = u.players, base = u.base;
  if (loc.origem === 'ELENCO') players = players.map(x => (x.id === p.id ? novo : x));
  else {
    // do Sub-20: sai da base (que repoe a vaga: sempre 20) e entra no elenco profissional do comprador
    const relatorios = { ...base!.relatorios }; delete relatorios[p.id];
    base = completarBase({ ...base!, jogadores: base!.jogadores.filter(x => x.id !== p.id), relatorios }, neg.vendedorId, hoje, p.position);
    players = [...players, novo];
  }
  const partePassaParaOrcamento = Math.round(valor * cfg.parteDaReceitaNoOrcamento);
  const txC: Transacao = { id: `tx-${neg.id}-C`, data: hoje, clubeId: comprador.id, jogadorId: p.id, jogadorNome: p.name, contraparteId: vendedor.id, natureza: 'COMPRA', valor,
    saldoAntes: comprador.cash, saldoDepois: comprador.cash - valor, orcamentoAntes: comprador.transferBudget ?? 0, orcamentoDepois: (comprador.transferBudget ?? 0) - valor, negId: neg.id };
  const txV: Transacao = { id: `tx-${neg.id}-V`, data: hoje, clubeId: vendedor.id, jogadorId: p.id, jogadorNome: p.name, contraparteId: comprador.id, natureza: 'VENDA', valor,
    saldoAntes: vendedor.cash, saldoDepois: vendedor.cash + valor, orcamentoAntes: vendedor.transferBudget ?? 0, orcamentoDepois: (vendedor.transferBudget ?? 0) + partePassaParaOrcamento, negId: neg.id };
  const teams = u.teams.map(t => {
    if (t.id === comprador.id) return { ...t, cash: txC.saldoDepois, transferBudget: txC.orcamentoDepois };
    if (t.id === vendedor.id) return limparEscalacao({ ...t, cash: txV.saldoDepois, transferBudget: txV.orcamentoDepois }, p.id);
    return t;
  });
  const fim: NegociacaoTransf = { ...neg, estado: 'CONCLUIDA', aguarda: null, atualizada: hoje, respondeEm: null };
  // as outras propostas pelo mesmo jogador deixam de valer
  const negociacoes = u.mercado.negociacoes.map(n => {
    if (n.id === neg.id) return fim;
    if (n.playerId === p.id && ESTADOS_ATIVOS.includes(n.estado)) return { ...n, estado: 'EXPIRADA' as const, aguarda: null, atualizada: hoje, respondeEm: null, motivo: 'jogador transferido' };
    return n;
  });
  const mov: Movimento = { id: `mov-${neg.id}`, data: hoje, jogadorId: p.id, jogadorNome: p.name, de: vendedor.id, para: comprador.id, valor, tipo: 'TRANSFERENCIA' };
  const mercado: MercadoState = {
    ...u.mercado, negociacoes, transacoes: [...u.mercado.transacoes, txC, txV].slice(-cfg.maxTransacoes), historico: [...u.mercado.historico, mov].slice(-cfg.maxTransacoes)
  };
  const eventos = [ev(u, 'CONCLUIDA_COMPRA', neg, p, comprador.id, valor), ev(u, 'CONCLUIDA_VENDA', neg, p, vendedor.id, valor)];
  return { u: { players, base, teams, mercado }, ok: true, eventos, negId: neg.id };
};

/** Aceita e tenta concluir na hora; se a conclusao falhar (janela fechada, saldo...) a negociacao fica ACEITA, pendente. */
const concluirAceita = (u: Universo, aceita: NegociacaoTransf, hoje: string, donoId: string, cfg: ConfigMercado): Resultado => {
  const u1 = comNeg(u, aceita);
  const r = concluir(u1, aceita.id, hoje, cfg);
  if (r.ok) return r;
  const loc = localizar(u1, aceita.playerId);
  const eventos = (loc && (aceita.compradorId === donoId || aceita.vendedorId === donoId)) ? [ev(u1, 'BLOQUEADA', aceita, loc.jogador, aceita.compradorId, aceita.valor, r.motivo)] : [];
  return { u: u1, ok: true, motivo: r.motivo, eventos, negId: aceita.id };
};

/** Contrata um AGENTE LIVRE: sem taxa, contrato novo pela idade (a duracao e sorteada pela idade de hoje), salario mantido. */
export const contratarAgenteLivre = (u: Universo, compradorId: string, playerId: string, hoje: string, cfg: ConfigMercado = CONFIG_MERCADO): Resultado => {
  const falha = (motivo: string): Resultado => ({ u, ok: false, motivo, eventos: [] });
  const p = u.players.find(x => x.id === playerId);
  if (!p || p.teamId !== 'MARKET') return falha('o jogador nao e agente livre');
  const comprador = clube(u, compradorId);
  if (!comprador) return falha('clube desconhecido');
  if (!cfg.agentesLivresForaDaJanela && !janelaAberta(hoje, comprador.country, cfg)) return falha('fora da janela de transferencias');
  const elenco = elencoDe(u, compradorId);
  if (elenco.length >= cfg.maximoElenco) return falha('elenco cheio');
  const novo: Player = { ...p, teamId: compradorId, shirtNumber: numeroLivre(elenco), listedForSale: false, livreDesde: undefined, contract: novoContrato(p.age, hoje, criarRng(`livre|${p.id}|${hoje}`)), trainingGroupId: 0 };
  const num = u.mercado.proximoNum;
  const tx: Transacao = { id: `tx-fa-${num}-${p.id}`, data: hoje, clubeId: compradorId, jogadorId: p.id, jogadorNome: p.name, contraparteId: 'MARKET', natureza: 'AGENTE_LIVRE', valor: 0,
    saldoAntes: comprador.cash, saldoDepois: comprador.cash, orcamentoAntes: comprador.transferBudget ?? 0, orcamentoDepois: comprador.transferBudget ?? 0, negId: null };
  const mov: Movimento = { id: `mov-fa-${num}`, data: hoje, jogadorId: p.id, jogadorNome: p.name, de: 'MARKET', para: compradorId, valor: 0, tipo: 'AGENTE_LIVRE' };
  const negociacoes = u.mercado.negociacoes.map(n => (n.playerId === p.id && ESTADOS_ATIVOS.includes(n.estado) ? { ...n, estado: 'EXPIRADA' as const, aguarda: null, motivo: 'jogador contratado' } : n));
  return {
    u: { ...u, players: u.players.map(x => (x.id === p.id ? novo : x)), mercado: { ...u.mercado, negociacoes, proximoNum: num + 1, transacoes: [...u.mercado.transacoes, tx].slice(-cfg.maxTransacoes), historico: [...u.mercado.historico, mov].slice(-cfg.maxTransacoes) } },
    ok: true, eventos: [ev(u, 'AGENTE_LIVRE', null, p, compradorId, 0)]
  };
};

// ------------------------------------------------------------------ o dia do mercado (respostas, prazos e IA)
const aprovarContra = (u: Universo, neg: NegociacaoTransf, hoje: string, cfg: ConfigMercado): boolean => {
  // o comprador IA aceita a contraproposta se ela cabe no que paga de bom grado (valor de mercado x apetite do clube x tolerancia) e no orcamento
  const loc = localizar(u, neg.playerId);
  const t = clube(u, neg.compradorId);
  if (!loc || !t) return false;
  const teto = valorDeMercado(loc.jogador, hoje) * perfilDoClube(neg.compradorId, cfg).apetite * cfg.ia.toleranciaContra;
  return neg.valor <= teto && neg.valor <= t.cash && neg.valor <= (t.transferBudget ?? 0);
};

export interface OpcoesTick { donoId: string; hoje: string; cfg?: ConfigMercado; }

/** Processa o DIA: respostas dos clubes IA, prazos, negociacoes aceitas pendentes, dispensas e agentes livres, e as iniciativas da IA. Uma vez por dia (`mercado.ultimoDia`). */
export const tickDoDia = (u0: Universo, o: OpcoesTick): Resultado => {
  const cfg = o.cfg || CONFIG_MERCADO, hoje = o.hoje, donoId = o.donoId;
  if (u0.mercado.ultimoDia >= hoje) return { u: u0, ok: true, eventos: [] };   // o dia ja foi processado
  let u: Universo = { ...u0, mercado: { ...u0.mercado, ultimoDia: hoje } };
  const eventos: Evento[] = [];
  // O orcamento de transferencias e reposto duas vezes por ano a partir do caixa (so sobe; o dinheiro em si nao se cria).
  if (cfg.reposicao.dias.includes(hoje.slice(5))) {
    u = { ...u, teams: u.teams.map(t => { const alvo = Math.round(Math.max(0, t.cash) * cfg.reposicao.fracaoDoCaixa); return alvo > (t.transferBudget ?? 0) ? { ...t, transferBudget: alvo } : t; }) };
  }
  let conclusoes = 0;
  const tentar = (id: string): void => {
    if (conclusoes >= cfg.ia.maxConclusoesPorDia) return;
    const r = concluir(u, id, hoje, cfg);
    if (r.ok) { u = r.u; eventos.push(...r.eventos); conclusoes++; }
  };

  for (const neg0 of u.mercado.negociacoes.filter(n => ESTADOS_ATIVOS.includes(n.estado))) {
    let neg = u.mercado.negociacoes.find(n => n.id === neg0.id)!;
    if (!ESTADOS_ATIVOS.includes(neg.estado)) continue;   // uma conclusao anterior do dia pode te-la invalidado
    const loc = localizar(u, neg.playerId);
    const pessoal = (n: NegociacaoTransf) => n.compradorId === donoId || n.vendedorId === donoId;
    if (!loc || loc.origem === 'LIVRE' || loc.jogador.teamId !== neg.vendedorId) {
      u = comNeg(u, { ...neg, estado: 'EXPIRADA', aguarda: null, atualizada: hoje, motivo: 'o jogador ja nao esta no vendedor' });
      if (loc && pessoal(neg)) eventos.push(ev(u, 'EXPIRADA', neg, loc.jogador, neg.vendedorId, neg.valor, 'o jogador ja nao esta no vendedor'));
      continue;
    }
    if (hoje > neg.expira) {
      u = comNeg(u, { ...neg, estado: 'EXPIRADA', aguarda: null, atualizada: hoje, respondeEm: null, motivo: 'prazo' });
      if (pessoal(neg)) eventos.push(ev(u, 'EXPIRADA', neg, loc.jogador, neg.vendedorId, neg.valor, 'prazo'));
      continue;
    }
    if (neg.estado === 'ACEITA') { tentar(neg.id); continue; }
    if (!neg.respondeEm || hoje < neg.respondeEm) continue;
    if (neg.estado === 'ENVIADA' && neg.vendedorId !== donoId) {
      // o vendedor IA avalia a proposta
      const d = avaliarOferta(u, neg, neg.valor, hoje, cfg);
      if (d.decisao === 'ACEITA') {
        u = comNeg(u, neg = { ...neg, estado: 'ACEITA', aguarda: null, atualizada: hoje, respondeEm: null });
        if (neg.compradorId === donoId) eventos.push(ev(u, 'ACEITA', neg, loc.jogador, neg.vendedorId, neg.valor));
        tentar(neg.id);
        const apos = u.mercado.negociacoes.find(n => n.id === neg.id)!;
        if (apos.estado === 'ACEITA' && neg.compradorId === donoId) eventos.push(ev(u, 'BLOQUEADA', apos, loc.jogador, neg.compradorId, neg.valor, 'a transferencia nao pode ser concluida ainda'));
      } else if (d.decisao === 'CONTRA' && d.contra) {
        const n2: NegociacaoTransf = { ...neg, estado: 'CONTRAPROPOSTA', aguarda: 'COMPRADOR', valor: d.contra, atualizada: hoje, expira: somarDias(hoje, cfg.diasValidade),
          respondeEm: neg.compradorId === donoId ? null : somarDias(hoje, diasDeResposta(`contra|${neg.id}|${neg.historico.length}`, cfg)), historico: [...neg.historico, { n: neg.historico.length + 1, de: 'VENDEDOR', valor: d.contra, data: hoje }] };
        u = comNeg(u, n2);
        if (neg.compradorId === donoId) eventos.push(ev(u, 'CONTRAPROPOSTA', n2, loc.jogador, neg.vendedorId, d.contra));
      } else {
        u = comNeg(u, { ...neg, estado: 'RECUSADA', aguarda: null, atualizada: hoje, respondeEm: null, motivo: d.motivo });
        if (neg.compradorId === donoId) eventos.push(ev(u, 'RECUSADA', neg, loc.jogador, neg.vendedorId, neg.valor, d.motivo));
      }
    } else if (neg.estado === 'CONTRAPROPOSTA' && neg.compradorId !== donoId) {
      // o comprador IA responde a contraproposta
      if (aprovarContra(u, neg, hoje, cfg)) {
        u = comNeg(u, neg = { ...neg, estado: 'ACEITA', aguarda: null, atualizada: hoje, respondeEm: null });
        tentar(neg.id);
      } else {
        u = comNeg(u, { ...neg, estado: 'RECUSADA', aguarda: null, atualizada: hoje, respondeEm: null, motivo: 'contraproposta acima do que o comprador paga' });
        if (neg.vendedorId === donoId) eventos.push(ev(u, 'RECUSADA', neg, loc.jogador, neg.compradorId, neg.valor, 'o comprador recusou a sua contraproposta'));
      }
    }
  }

  // agentes livres: marca desde quando; os que ninguem contrata se aposentam
  const aposentados = new Set<string>();
  let players = u.players.map(p => {
    if (p.teamId !== 'MARKET') return p;
    if (!p.livreDesde) return { ...p, livreDesde: hoje };
    if (diasEntre(p.livreDesde, hoje) > cfg.ia.diasAgenteLivre) { aposentados.add(p.id); }
    return p;
  });
  if (aposentados.size) players = players.filter(p => !aposentados.has(p.id));
  if (players.some((p, i) => p !== u.players[i]) || aposentados.size) u = { ...u, players };

  // iniciativas da IA
  const ia = iaDoDia(u, hoje, donoId, cfg, conclusoes);
  u = ia.u; eventos.push(...ia.eventos);
  return { u, ok: true, eventos };
};

// ------------------------------------------------------------------ a IA
interface Alvo { jogador: Player; origem: 'ELENCO' | 'BASE'; }
const necessidades = (elenco: Player[], cfg: ConfigMercado): { grupo: Grupo; falta: number; piorTitular: number }[] => {
  const out: { grupo: Grupo; falta: number; piorTitular: number }[] = [];
  (['GK', 'DEF', 'MID', 'ATT'] as Grupo[]).forEach(g => {
    const lista = elenco.filter(p => grupoDe(p.position) === g).sort((a, b) => b.skill - a.skill);
    const titulares = g === 'GK' ? 1 : g === 'DEF' ? 4 : g === 'MID' ? 4 : 2;
    out.push({ grupo: g, falta: Math.max(0, cfg.ia.desejado[g] - lista.length), piorTitular: lista.length >= titulares ? lista[titulares - 1].skill : 0 });
  });
  return out;
};

/** As iniciativas da IA no dia: um subconjunto de clubes (rotativo) avalia o elenco, lista excedentes, contrata agentes livres e propoe compras — tudo pelo mesmo fluxo de negociacao. */
export const iaDoDia = (u0: Universo, hoje: string, donoId: string, cfg: ConfigMercado, conclusoesDoDia = 0): Resultado => {
  let u = u0;
  const eventos: Evento[] = [];
  const clubes = u.teams.filter(t => t.id !== donoId);
  if (!clubes.length) return { u, ok: true, eventos };
  // quem avalia hoje: uma fatia rotativa (o dia do ano decide), para nem todos fazerem a avaliacao completa a cada ciclo
  const dia = Math.floor(Date.parse(hoje + 'T12:00:00Z') / 86400000);
  const n = Math.min(cfg.ia.clubesPorDia, clubes.length);
  const hoje_ = Array.from({ length: n }, (_, k) => clubes[(dia * n + k) % clubes.length]);
  // indices de candidatos (uma vez por tick): por grupo, do melhor para o pior
  const porGrupo: Record<Grupo, Alvo[]> = { GK: [], DEF: [], MID: [], ATT: [] };
  u.players.forEach(p => { if (p.teamId !== 'MARKET' && (!p.contract || p.contract.end > hoje)) porGrupo[grupoDe(p.position)].push({ jogador: p, origem: 'ELENCO' }); });
  u.base?.jogadores.forEach(p => { if (p.age >= cfg.idadeMinimaBase) porGrupo[grupoDe(p.position)].push({ jogador: p, origem: 'BASE' }); });
  (Object.keys(porGrupo) as Grupo[]).forEach(g => porGrupo[g].sort((a, b) => b.jogador.skill - a.jogador.skill));
  const livres = u.players.filter(p => p.teamId === 'MARKET').sort((a, b) => b.skill - a.skill);
  let novas = 0;
  const janela = (t: Team) => janelaAberta(hoje, t.country, cfg);

  for (const t of hoje_) {
    const perfil = perfilDoClube(t.id, cfg);
    const elenco = elencoDe(u, t.id);
    const rnd = criarRng(`ia|${t.id}|${hoje}`);

    // 1. excedentes: elenco acima do maximo da IA lista os de menor valor nos grupos com sobra; quem esta listado ha muito tempo e dispensado (vira agente livre)
    if (elenco.length > cfg.ia.maxElenco) {
      const sobra = elenco.length - cfg.ia.maxElenco;
      const candidatos = [...elenco].filter(p => !p.listedForSale).sort((a, b) => a.skill - b.skill);
      let marcados = 0;
      for (const p of candidatos) {
        if (marcados >= sobra) break;
        if (elencoValidoSem(elenco, p, cfg)) { u = { ...u, players: u.players.map(x => (x.id === p.id ? { ...x, listedForSale: true, listadoEm: hoje } : x)) }; marcados++; }
      }
    }
    for (const p of elencoDe(u, t.id)) {
      if (p.listedForSale && p.listadoEm && diasEntre(p.listadoEm, hoje) > cfg.ia.diasParaDispensar && elencoDe(u, t.id).length > cfg.ia.maxElenco
        && !u.mercado.negociacoes.some(g => g.playerId === p.id && ESTADOS_ATIVOS.includes(g.estado)) && elencoValidoSem(elencoDe(u, t.id), p, cfg)) {
        u = { ...u, players: u.players.map(x => (x.id === p.id ? { ...x, teamId: 'MARKET', listedForSale: false, listadoEm: undefined, livreDesde: hoje } : x)),
          teams: u.teams.map(x => (x.id === t.id ? limparEscalacao(x, p.id) : x)),
          mercado: { ...u.mercado, historico: [...u.mercado.historico, { id: `mov-disp-${u.mercado.proximoNum}-${p.id}`, data: hoje, jogadorId: p.id, jogadorNome: p.name, de: t.id, para: 'MARKET', valor: 0, tipo: 'DISPENSA' as const }].slice(-cfg.maxTransacoes), proximoNum: u.mercado.proximoNum + 1 } };
      }
    }

    // 2. necessidades
    const elencoAtual = elencoDe(u, t.id);
    const nec = necessidades(elencoAtual, cfg);
    // 2a. agente livre: sem taxa, quando ha falta ou ele melhora um titular
    for (const g of nec) {
      const fa = livres.find(p => grupoDe(p.position) === g.grupo && u.players.find(x => x.id === p.id)?.teamId === 'MARKET' && (g.falta > 0 || p.skill >= g.piorTitular + cfg.ia.margemUpgrade));
      if (fa && (g.falta > 0 || rnd() < 0.3) && elencoDe(u, t.id).length < cfg.ia.maxElenco) {
        const r = contratarAgenteLivre(u, t.id, fa.id, hoje, cfg);
        if (r.ok) { u = r.u; }
      }
    }
    if (!janela(t)) continue;
    // 2b. propostas de compra (limitadas por clube e no dia)
    const ativas = u.mercado.negociacoes.filter(g => g.compradorId === t.id && ESTADOS_ATIVOS.includes(g.estado)).length;
    if (ativas >= cfg.ia.maxNegociacoesAtivasPorClube || novas >= cfg.ia.maxPropostasNovasPorDia) continue;
    if (rnd() > 0.5 * perfil.ativo + 0.35) continue;      // nem todo clube age todo dia que e escalado
    const teto = Math.min(t.cash, t.transferBudget ?? 0) * cfg.ia.orcamentoMaxPorOferta;
    const prioridade = [...nec].sort((a, b) => (b.falta - a.falta) || (a.piorTitular - b.piorTitular));
    let feito = false;
    for (const g of prioridade) {
      if (feito) break;
      if (g.falta === 0 && g.piorTitular === 0) continue;
      const minOvr = g.falta > 0 ? Math.max(50, g.piorTitular - 3) : g.piorTitular + cfg.ia.margemUpgrade;
      for (const alvo of porGrupo[g.grupo]) {
        if (alvo.jogador.skill < minOvr) break;                      // a lista esta ordenada: daqui para baixo ninguem serve
        const p = alvo.jogador;
        const atual = localizar(u, p.id);
        if (!atual || atual.origem === 'LIVRE' || atual.jogador.teamId === t.id) continue;
        if (atual.jogador.teamId === donoId && rnd() > cfg.ia.probOfertaAoHumano * (atual.jogador.listedForSale ? 4 : 1)) continue;
        if (p.age > 34 && g.falta === 0) continue;
        if (u.mercado.negociacoes.some(x => x.playerId === p.id && x.compradorId === t.id && (ESTADOS_ATIVOS.includes(x.estado) || (x.estado === 'RECUSADA' && diasEntre(x.atualizada, hoje) < 30)))) continue;
        const valor = valorDeMercado(atual.jogador, hoje);
        if (valor > teto) continue;
        const desejoListado = atual.jogador.listedForSale ? 1 + cfg.ia.bonusListado : 1;
        if (rnd() > Math.min(1, 0.55 * desejoListado)) continue;
        const oferta = arred(valor * perfil.apetite * (0.92 + rnd() * 0.1));
        const r = proporCompra(u, t.id, p.id, oferta, hoje, donoId, cfg);
        if (r.ok) { u = r.u; eventos.push(...r.eventos); novas++; feito = true; break; }
      }
    }
  }
  void conclusoesDoDia;
  return { u, ok: true, eventos };
};

/** Recalcula, uma vez por mes, o valor de todos os jogadores (elenco e Sub-20). Devolve o MESMO universo se o mes ja foi feito ou nada mudou. */
export const recalcularValoresDoMes = (u: Universo, hoje: string, recalc: (j: Player[], hoje: string) => Player[]): Universo => {
  const mes = hoje.slice(0, 7);
  if (u.mercado.mesDosValores === mes && u.players.every(p => p.value > 0)) return u;
  const players = recalc(u.players, hoje);
  const jogadoresBase = u.base ? recalc(u.base.jogadores, hoje) : null;
  const base = u.base && jogadoresBase && jogadoresBase !== u.base.jogadores ? { ...u.base, jogadores: jogadoresBase } : u.base;
  return { ...u, players, base, mercado: { ...u.mercado, mesDosValores: mes } };
};
