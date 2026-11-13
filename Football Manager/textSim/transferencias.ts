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

PRE-CONTRATO: o jogador com MENOS DE `mesesPreContrato` (6) meses de contrato pode assinar com outro clube SEM custo de saida (nem taxa de venda): o comprador contrata-o
como a um agente livre (`contratarAgenteLivre`), ele sai na hora do clube atual, que nao recebe nada. Vale para o utilizador e para a CPU, nos dois sentidos (a CPU tambem leva
jogadores do utilizador com o contrato a acabar). Para esses jogadores nao ha proposta de compra (`proporCompra` recusa): a saida e sempre livre. O clube que perde o jogador
tem de continuar com o elenco minimo.

CLAUSULA DE RESCISAO (pedido: "nos contratos clausulas de rescisao"; o valor vive no contrato, `Contract.releaseClause`, ver textSim/contracts.ts): uma oferta de COMPRA com o valor
a vista >= clausula nao pode ser recusada — e aceita na hora, sem os 1-3 dias de analise, e conclui assim que as validacoes passam (janela, saldo, orcamento). Vale para os dois lados:
a CPU paga a clausula de um jogador do utilizador (quando a clausula ficou barata perto do valor que ela pagaria de bom grado) e o utilizador paga a de um jogador da CPU para
saltar a negociacao. Os bonus por jogos nao contam para a clausula (ela e paga a vista). O unico limite que fica e o elenco minimo do vendedor (20 jogadores, 2 GK...): sem ele a
oferta segue o fluxo normal. Depois da transferencia o comprador fixa uma clausula nova (o dobro do maior entre o valor pago e o valor de mercado).

EMPRESTIMO COM OPCAO DE COMPRA (pedido: "emprestimo com opcao de compra"): a negociacao pode ser de EMPRESTIMO (`tipo`), com duracao (3 a 24 meses, nunca alem do contrato),
uma taxa de emprestimo (o `valor`, pode ser 0) e, se quiser, um preco de OPCAO DE COMPRA. O jogador vai para o clube que o pede (`Player.emprestimo` guarda o dono, o fim e a opcao)
e no fim volta, salvo se esse clube exercer a opcao: o utilizador decide na aba Transfers (e recebe um aviso 30 dias antes); a CPU compra se o preco cabe no que pagaria de bom grado,
tem caixa e o jogador e titular dela. Durante o emprestimo ninguem o compra, vende, lista ou dispensa. O vendedor IA nao empresta os dois melhores do grupo (salvo se os listou para
emprestimo), pede uma taxa de 8% do valor por ano (0 se o listou) e recusa opcao abaixo do preco que pediria numa venda. Os salarios do jogo nao saem do caixa (a folha e so uma
estimativa), entao nao ha divisao de salario: o jogador conta na folha de quem o tem.

VENDA COM BONUS POR JOGOS (pedido: "venda com pagamento posterior de bonus para quem esta vendendo, depois de 10/15/20 jogos"): a proposta de compra pode prometer bonus ao
vendedor quando o jogador fizer 10, 15 e 20 jogos oficiais pelo comprador. Na avaliacao o vendedor conta os bonus a 60% (podem nunca ser pagos). Concluida a venda, os bonus
ficam pendentes em `mercado.bonus` com a contagem de jogos (a partir de zero): os jogos da liga do utilizador contam pela escalacao real (GameContext, `registrarJogosDosBonus`);
fora dela (clubes que so jogam no mundo simulado) conta-se um jogo a cada 7 dias se o jogador esta entre os 14 melhores do elenco. Cada marco atingido paga na hora (caixa e
registro dos dois clubes, aviso na Inbox). Se o jogador deixar o comprador (vendido, dispensado) os bonus que faltam caducam.
*/
import type { Player, Team } from '../types';
import { Position, naLigaDoUtilizador } from '../types';
import { BaseState, completarBase, TAMANHO_BASE } from './youth';
import { criarRng, novoContrato, Rnd, somarMeses, clausulaDe, clausulaAposTransferencia } from './contracts';
import { valorDeMercado, potencialParaValor } from './valuation';
import { tx } from './idiomas';

// ------------------------------------------------------------------ configuracao
export interface Janela { de: string; ate: string; }   // 'MM-DD'
export const CONFIG_MERCADO = {
  // Janelas de transferencia (por id de pais; `padrao` vale para os outros). O jogo comeca em 1 de abril: a janela de inicio de ano ainda esta aberta.
  janelas: { padrao: [{ de: '01-01', ate: '04-10' }, { de: '07-01', ate: '08-31' }] as Janela[], porPais: {} as Record<string, Janela[]> },
  agentesLivresForaDaJanela: true,
  mesesPreContrato: 6,                 // com menos do que isto de contrato o jogador assina com outro clube sem custo (pre-contrato)
  idadeMinimaBase: 18,                 // jovens do Sub-20 com esta idade ou mais podem ser negociados
  diasResposta: [1, 3] as [number, number],
  diasRespostaNaoListado: [2, 3] as [number, number],   // 1a oferta por um jogador que o clube nao pos a venda
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
    margemUpgrade: 4, maxElenco: 34, probOfertaAoHumano: 0.12, bonusListado: 0.35,
    orcamentoMaxPorOferta: 0.75, apetite: [0.85, 1.05] as [number, number], toleranciaContra: 1.08,
    diasParaDispensar: 21, diasAgenteLivre: 240,
    maxPreContratosPorDia: 2, probPreContrato: 0.15,   // pre-contratos da CPU: no maximo 2 por dia no mundo; sem falta na posicao, so com esta chance (e so se melhora um titular)
    clausulaAteApetite: 1.25,          // a CPU paga a clausula quando ela custa ate 125% do que pagaria de bom grado (valor x apetite) e cabe no teto
    probBonus: 0.3,                    // chance de a proposta da CPU trocar parte do valor a vista por bonus por jogos
    probOpcaoCompra: 0.5,              // chance de o pedido de emprestimo da CPU trazer opcao de compra
    /*
    A AMBICAO DO CLUBE (ambicaoDoClube): o teto que paga, a 1a oferta e quanto concede por rodada, pela FORCA na liga (rank do OVR) — candidato ao titulo (top
    `titulo` da liga), vaga continental (top `continental`) ou meio de tabela — e EM CRISE (5+ jogos e a classificacao `crise.folga` da liga pior do que a forca,
    ou na zona de queda) o teto sobe `crise.teto` e a concessao `crise.concessao`. Tudo x a personalidade (apetite / media do apetite). Medido antes (telemetria,
    Serie A, 1 temporada): 744 de 893 negociacoes morriam na 1a contraproposta, com o teto fixo em valor x apetite x 1.08 (titulares custam 1.15-1.30x).
    */
    ambicao: {
      titulo: 0.15, continental: 0.30,
      perfis: {
        TITULO: { teto: 1.40, primeira: 1.00, concessao: 0.50 },
        CONTINENTAL: { teto: 1.22, primeira: 0.95, concessao: 0.35 },
        MEIO: { teto: 1.10, primeira: 0.92, concessao: 0.25 }
      } as Record<'TITULO' | 'CONTINENTAL' | 'MEIO', { teto: number; primeira: number; concessao: number }>,
      crise: { jogosMin: 5, folga: 0.25, rebaixados: 4, teto: 0.15, concessao: 0.10, compras: 1 },
      // COMPRAS POR JANELA (transferencias pagas que o clube conclui como comprador): sem isto, com as rodadas, a regra do reforco (4 pontos acima do pior titular)
      // disparava sem parar — 244 transferencias numa temporada de 20 clubes, 41% dos jogadores a trocar de clube (telemetria).
      comprasPorJanela: { TITULO: 4, CONTINENTAL: 3, MEIO: 3 } as Record<'TITULO' | 'CONTINENTAL' | 'MEIO', number>
    },
    /*
    A LISTA DE VENDA E DE EMPRESTIMO DA CPU (listaAtiva): antes so listava com o elenco acima de 34 — numa temporada inteira de Serie A, ZERO listados, zero
    emprestimos, zero dispensas (telemetria). Os motivos, para quem NAO e titular do grupo (os `titulares` da formacao, pelo OVR):
      sobra      o grupo tem mais do que o esquema + banco + `sobraFolga`: os de menor OVR
      veterano   `idadeVeterano` anos ou mais e `abaixoVeterano` pontos abaixo da media dos titulares do grupo
      salario    salario `salarioFator` vezes a mediana do clube
      caixa      caixa negativo: o mais valioso que nao e titular
      jovem      ate `idadeJovem` anos, nem titular nem o 1o reserva do grupo, e com margem (potencial >= OVR + `margemJovem`): para EMPRESTIMO (a rodar), nao para venda
    Quem passa a titular sai da lista. No maximo `novosPorDia` novos por clube e `maxListados` listados ao mesmo tempo. Quem esta listado ha `diasDispensa` dias
    sem negociacao, com 32+ anos e com o elenco acima de `elencoParaDispensar`, e dispensado.
    */
    listaAtiva: {
      sobraFolga: 1, idadeVeterano: 32, abaixoVeterano: 3, salarioFator: 2.0, idadeJovem: 23, margemJovem: 3, emprestimosPorJanela: 1,
      novosPorDia: 2, maxListados: 5, diasDispensa: 90, elencoParaDispensar: 24
    }
  },
  // A taxa de emprestimo (pedido: quem pede emprestado PAGA pelo jogador e fica com o salario dele — o salario ja vai para a folha de quem o tem, pelo teamId): por ano de
  // emprestimo, `taxaAnualDoValor` do valor de mercado, ou `taxaAnualListado` se o dono o pos na lista de emprestimo (quer empresta-lo). Era 0 para os listados.
  emprestimo: { mesesMin: 3, mesesMax: 24, taxaAnualDoValor: 0.08, taxaAnualListado: 0.05, opcaoMinima: 1.0, avisoOpcaoDias: 30, tetoTaxaIa: 0.12 },
  bonus: { marcos: [10, 15, 20], fatorAvaliacao: 0.6, diasPorJogoEstimado: 7, titularesEstimados: 14 },
  maxTransacoes: 4000
};
export type ConfigMercado = typeof CONFIG_MERCADO;

// ------------------------------------------------------------------ tipos
export type Grupo = 'GK' | 'DEF' | 'MID' | 'ATT';
export type EstadoNegociacao = 'ENVIADA' | 'RECEBIDA' | 'CONTRAPROPOSTA' | 'ACEITA' | 'RECUSADA' | 'RETIRADA' | 'EXPIRADA' | 'CONCLUIDA';
export const ESTADOS_ATIVOS: EstadoNegociacao[] = ['ENVIADA', 'RECEBIDA', 'CONTRAPROPOSTA', 'ACEITA'];

export interface Proposta { n: number; de: 'COMPRADOR' | 'VENDEDOR'; valor: number; data: string; }
/** Um bonus prometido ao vendedor quando o jogador fizer `jogos` jogos oficiais pelo comprador. */
export interface BonusJogos { jogos: number; valor: number; }
/** Os bonus pendentes de uma venda concluida (`mercado.bonus`). */
export interface BonusTransferencia {
  id: string; negId: string; jogadorId: string; jogadorNome: string; compradorId: string; vendedorId: string; data: string;
  jogos: number;                       // jogos oficiais pelo comprador desde a venda
  ultimaEstimativa?: string;           // clubes fora da liga do utilizador: o ultimo dia ate onde os jogos foram estimados
  marcos: { jogos: number; valor: number; pago?: string }[];
  estado: 'ATIVO' | 'CONCLUIDO' | 'CADUCADO';
}
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
  /** COMPRA (omitido: saves antigos) ou EMPRESTIMO (o `valor` e a taxa de emprestimo). */
  tipo?: 'COMPRA' | 'EMPRESTIMO';
  emprestimo?: { meses: number; opcaoCompra?: number };
  /** Bonus por jogos prometidos ao vendedor (so compras). */
  bonus?: BonusJogos[];
}
export interface Transacao {
  id: string; data: string; clubeId: string; jogadorId: string; jogadorNome: string; contraparteId: string;
  natureza: 'COMPRA' | 'VENDA' | 'AGENTE_LIVRE'; valor: number;
  saldoAntes: number; saldoDepois: number; orcamentoAntes: number; orcamentoDepois: number; negId: string | null;
  /** O que o lancamento paga, alem da transferencia normal: taxa de emprestimo, opcao de compra, bonus por jogos ou clausula de rescisao. */
  tipo?: 'EMPRESTIMO' | 'OPCAO' | 'BONUS' | 'CLAUSULA';
  ref?: string;                        // a negociacao de origem (bonus e opcao: o `negId` fica null para nao contar como lancamento da conclusao)
}
export interface Movimento { id: string; data: string; jogadorId: string; jogadorNome: string; de: string; para: string; valor: number; tipo: 'TRANSFERENCIA' | 'AGENTE_LIVRE' | 'DISPENSA' | 'EMPRESTIMO' | 'DEVOLUCAO'; }
export interface MercadoState {
  negociacoes: NegociacaoTransf[];
  transacoes: Transacao[];
  historico: Movimento[];
  proximoNum: number;
  ultimoDia: string;                  // ultimo dia processado pelo `tickDoDia` (uma vez por dia)
  mesDosValores: string;              // yyyy-mm do ultimo recalculo mensal dos valores
  /** Bonus por jogos das vendas concluidas (omitido nos saves antigos = nenhum). */
  bonus?: BonusTransferencia[];
}
export interface Universo { players: Player[]; base: BaseState | null; teams: Team[]; mercado: MercadoState; }
export interface Evento {
  tipo: 'OFERTA_RECEBIDA' | 'CONTRAPROPOSTA' | 'ACEITA' | 'RECUSADA' | 'EXPIRADA' | 'CONCLUIDA_COMPRA' | 'CONCLUIDA_VENDA' | 'AGENTE_LIVRE' | 'SAIDA_LIVRE' | 'BLOQUEADA'
    | 'CLAUSULA_PAGA' | 'EMPRESTIMO_CONCLUIDO' | 'EMPRESTIMO_FIM' | 'OPCAO_AVISO' | 'OPCAO_EXERCIDA' | 'BONUS_PAGO';
  negId: string | null; jogadorId: string; jogadorNome: string; clubeId: string; clubeNome: string; valor: number; motivo?: string;
  /** Os eventos novos (clausula, emprestimo, opcao, bonus) saem um por lado: `clubeId` e o clube daquele lado, `lado` diz qual e, `outroClube` o nome da contraparte. */
  lado?: 'COMPRADOR' | 'VENDEDOR';
  outroClube?: string;
  jogos?: number;
  data?: string;
  emprestimo?: boolean;                // o evento vem de um emprestimo (texto da Inbox)
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
/** O dia (ISO) em que abriu a janela que esta aberta em `hoje`; null se fechada. */
export const inicioDaJanela = (hoje: string, paisId?: string, cfg: ConfigMercado = CONFIG_MERCADO): string | null => {
  const lista = (paisId && cfg.janelas.porPais[paisId]) || cfg.janelas.padrao;
  const md = hoje.slice(5);
  const j = lista.find(x => md >= x.de && md <= x.ate);
  return j ? hoje.slice(0, 4) + '-' + j.de : null;
};
/** Os dias que faltam para a janela fechar (null se fechada). */
export const diasParaFecharJanela = (hoje: string, paisId?: string, cfg: ConfigMercado = CONFIG_MERCADO): number | null => {
  const lista = (paisId && cfg.janelas.porPais[paisId]) || cfg.janelas.padrao;
  const ano = hoje.slice(0, 4), md = hoje.slice(5);
  for (const j of lista) if (md >= j.de && md <= j.ate) return diasEntre(hoje, `${ano}-${j.ate}`);
  return null;
};

/** A proxima abertura da janela (data ISO e dias que faltam); null se ja esta aberta. */
export const proximaAberturaJanela = (hoje: string, paisId?: string, cfg: ConfigMercado = CONFIG_MERCADO): { data: string; dias: number } | null => {
  if (janelaAberta(hoje, paisId, cfg)) return null;
  const lista = (paisId && cfg.janelas.porPais[paisId]) || cfg.janelas.padrao;
  const ano = +hoje.slice(0, 4);
  const datas = [ano, ano + 1].flatMap(a => lista.map(j => `${a}-${j.de}`)).filter(d => d > hoje).sort();
  return datas.length ? { data: datas[0], dias: diasEntre(hoje, datas[0]) } : null;
};

/** Personalidade de cada clube: fixa (semente = id). `rigidez` multiplica o preco que pede; `apetite` o quanto paga de bom grado. */
export const perfilDoClube = (teamId: string, cfg: ConfigMercado = CONFIG_MERCADO) => {
  const r = criarRng('perfil|' + teamId);
  const [r0, r1] = cfg.precoDesejado.rigidez, [a0, a1] = cfg.ia.apetite;
  return { rigidez: r0 + r() * (r1 - r0), apetite: a0 + r() * (a1 - a0), ativo: 0.6 + r() * 0.8 };
};

export const orcamentoInicial = (t: Team, cfg: ConfigMercado = CONFIG_MERCADO): number => Math.round((t.initialTransfer ?? t.cash * 0.8) * cfg.orcamentoFator);
/** Garante o orcamento de transferencias em todos os clubes (so preenche o que falta; devolve a MESMA lista se nada mudou). */
export const prepararOrcamentos = (teams: Team[], cfg: ConfigMercado = CONFIG_MERCADO): Team[] => {
  if (teams.every(t => typeof t.transferBudget === 'number')) return teams;
  return teams.map(t => (typeof t.transferBudget === 'number' ? t : { ...t, transferBudget: orcamentoInicial(t, cfg) }));
};

/** O jogador de um clube com o contrato a acabar (menos de `mesesPreContrato` meses): pode assinar com outro clube sem custo. O emprestado nao (o contrato e do dono). */
export const emPreContrato = (p: Player, hoje: string, cfg: ConfigMercado = CONFIG_MERCADO): boolean =>
  p.teamId !== 'MARKET' && !p.emprestimo && !!p.contract && p.contract.end > hoje && p.contract.end < somarMeses(hoje, cfg.mesesPreContrato);

/** A oferta a vista paga a clausula de rescisao do jogador? (0 = sem clausula: nunca) */
export const atingeClausula = (p: Player, valor: number): boolean => { const c = clausulaDe(p); return c > 0 && valor >= c; };
/** Quanto os bonus valem para quem avalia a oferta (60% do total: podem nunca ser pagos). */
export const valorDosBonus = (bonus: BonusJogos[] | undefined, cfg: ConfigMercado = CONFIG_MERCADO): number => (bonus || []).reduce((s, b) => s + b.valor, 0) * cfg.bonus.fatorAvaliacao;
/** Os bonus validos: so os marcos 10/15/20, valores positivos (arredondados ao milhar), um por marco, em ordem. */
export const normalizarBonus = (bonus: BonusJogos[] | undefined, cfg: ConfigMercado = CONFIG_MERCADO): BonusJogos[] => {
  const m = new Map<number, number>();
  for (const b of bonus || []) if (cfg.bonus.marcos.includes(b.jogos) && b.valor > 0 && isFinite(b.valor)) m.set(b.jogos, arred(b.valor));
  return [...m.entries()].filter(([, v]) => v > 0).sort((a, b) => a[0] - b[0]).map(([jogos, valor]) => ({ jogos, valor }));
};
/** A taxa de emprestimo que o dono pede: 8% do valor de mercado por ano de emprestimo (5% se o pos na lista de emprestimo). Quem pede emprestado paga sempre. */
export const taxaDeEmprestimoDesejada = (p: Player, meses: number, hoje: string, cfg: ConfigMercado = CONFIG_MERCADO): number =>
  arred(valorDeMercado(p, hoje) * (p.listedForLoan ? cfg.emprestimo.taxaAnualListado : cfg.emprestimo.taxaAnualDoValor) * meses / 12);

// ------------------------------------------------------------------ localizar jogadores e elencos
export interface Local { jogador: Player; origem: 'ELENCO' | 'BASE' | 'LIVRE'; }
export const localizar = (u: Universo, id: string): Local | null => {
  const p = u.players.find(x => x.id === id);
  if (p) return { jogador: p, origem: p.teamId === 'MARKET' ? 'LIVRE' : 'ELENCO' };
  const b = u.base?.jogadores.find(x => x.id === id);
  return b ? { jogador: b, origem: 'BASE' } : null;
};
const elencoDe = (u: Universo, teamId: string): Player[] => u.players.filter(p => p.teamId === teamId);

/** Quantos titulares de cada grupo a formacao pede (o primeiro numero e a defesa, o ultimo o ataque, os do meio o meio-campo; "4-2-3-1" = 4 / 5 / 1). */
export const titularesDaFormacao = (formacao?: string): Record<Grupo, number> => {
  const n = String(formacao || '4-4-2').match(/\d/g)?.map(Number) || [4, 4, 2];
  return { GK: 1, DEF: n[0], MID: n.slice(1, -1).reduce((a, b) => a + b, 0), ATT: n[n.length - 1] };
};
/** O que o elenco precisa ter por grupo: os titulares do esquema + o banco de 10 (1 GK, 3 DEF, 3 MID, 3 ATT). */
export const BANCO_MINIMO: Record<Grupo, number> = { GK: 1, DEF: 3, MID: 3, ATT: 3 };
export const necessarioPorGrupo = (formacao?: string): Record<Grupo, number> => {
  const t = titularesDaFormacao(formacao);
  return { GK: t.GK + BANCO_MINIMO.GK, DEF: t.DEF + BANCO_MINIMO.DEF, MID: t.MID + BANCO_MINIMO.MID, ATT: t.ATT + BANCO_MINIMO.ATT };
};

/**
 * O elenco do vendedor continua funcional depois de perder `p`? (minimos configuraveis por posicao). Com a `formacao` do clube (clubes da CPU) vale tambem o minimo do esquema:
 * um jogador para cada posicao do esquema mais o banco de 10 (1 GK, 3 DEF, 3 MID, 3 ATT); sem ele ninguem sai se faltar reposicao.
 */
export const elencoValidoSem = (elenco: Player[], p: Player, cfg: ConfigMercado = CONFIG_MERCADO, formacao?: string): boolean => {
  const resto = elenco.filter(x => x.id !== p.id);
  if (resto.length < cfg.minimoElenco.total) return false;
  const n: Record<Grupo, number> = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
  resto.forEach(x => { n[grupoDe(x.position)]++; });
  if (!(n.GK >= cfg.minimoElenco.GK && n.DEF >= cfg.minimoElenco.DEF && n.MID >= cfg.minimoElenco.MID && n.ATT >= cfg.minimoElenco.ATT)) return false;
  if (!formacao) return true;
  const g = grupoDe(p.position), precisa = necessarioPorGrupo(formacao);
  return n[g] >= precisa[g];    // so o grupo do vendido muda; os outros ja estavam como estavam
};
const formacaoDe = (u: Universo, teamId: string): string | undefined => u.teams.find(t => t.id === teamId)?.tactics?.formation;

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
  if (neg.tipo === 'EMPRESTIMO') return avaliarEmprestimo(u, neg, loc.jogador, oferta, desejado, hoje, cfg);
  // CLAUSULA: o valor a vista paga a clausula -> nao pode recusar (so o elenco minimo basico continua a valer)
  if (loc.origem === 'ELENCO' && atingeClausula(loc.jogador, oferta) && elencoValidoSem(elencoDe(u, neg.vendedorId), loc.jogador, cfg)) return { decisao: 'ACEITA', desejado };
  if (loc.origem === 'ELENCO' && !elencoValidoSem(elencoDe(u, neg.vendedorId), loc.jogador, cfg, formacaoDe(u, neg.vendedorId))) return { decisao: 'RECUSA', motivo: 'o elenco ficaria sem o minimo', desejado };
  // BONUS por jogos: contam a 60% na comparacao; a contraproposta continua a ser so do valor a vista (desconta os bonus)
  const bd = valorDosBonus(neg.bonus, cfg);
  const D = cfg.decisao, r = (oferta + bd) / Math.max(1, desejado);
  const ultima = neg.rodadas >= cfg.maxRodadas;
  if (r >= D.aceitaA) return { decisao: 'ACEITA', desejado };
  if (ultima) return r >= D.ultimaRodadaAceitaDe ? { decisao: 'ACEITA', desejado } : { decisao: 'RECUSA', motivo: 'proposta final insuficiente', desejado };
  const avista = (c: number) => (bd > 0 ? Math.max(arred(c - bd), oferta + 1000) : c);
  if (r >= D.contraDe) return { decisao: 'CONTRA', contra: avista(Math.min(desejado, Math.max(arred((oferta + bd) * 1.05), arred(desejado * 0.97)))), desejado };
  if (r >= D.recusaAbaixo) return { decisao: 'CONTRA', contra: avista(desejado), desejado };
  return { decisao: 'RECUSA', motivo: 'oferta muito baixa', desejado };
};

/**
 * O dono (IA, ou a regra de referencia) avalia um pedido de EMPRESTIMO: nao empresta os dois melhores do grupo (salvo se os listou para emprestimo), nem deixa o elenco
 * abaixo do esquema; a opcao de compra tem de valer pelo menos o preco que pediria numa venda; a taxa tem de cobrir a que pede (8% do valor por ano; 0 se listado), senao
 * contrapropoe essa taxa (na ultima rodada recusa).
 */
const avaliarEmprestimo = (u: Universo, neg: NegociacaoTransf, p: Player, taxa: number, precoVenda: number, hoje: string, cfg: ConfigMercado): Decisao => {
  if (p.emprestimo) return { decisao: 'RECUSA', motivo: 'jogador emprestado', desejado: precoVenda };
  if (!elencoValidoSem(elencoDe(u, neg.vendedorId), p, cfg, formacaoDe(u, neg.vendedorId))) return { decisao: 'RECUSA', motivo: 'o elenco ficaria sem o minimo', desejado: precoVenda };
  const doGrupo = u.players.filter(x => x.teamId === neg.vendedorId && grupoDe(x.position) === grupoDe(p.position)).sort((a, b) => b.skill - a.skill);
  const posto = doGrupo.findIndex(x => x.id === p.id);
  if (!p.listedForLoan && posto >= 0 && posto <= 1) return { decisao: 'RECUSA', motivo: 'o clube nao empresta titulares', desejado: precoVenda };
  const op = neg.emprestimo?.opcaoCompra;
  if (op !== undefined && op < precoVenda * cfg.emprestimo.opcaoMinima) return { decisao: 'RECUSA', motivo: 'opcao de compra abaixo do preco do jogador', desejado: precoVenda };
  const desejada = taxaDeEmprestimoDesejada(p, neg.emprestimo?.meses ?? 12, hoje, cfg);
  if (taxa >= desejada) return { decisao: 'ACEITA', desejado: desejada };
  if (neg.rodadas >= cfg.maxRodadas) return { decisao: 'RECUSA', motivo: 'proposta final insuficiente', desejado: desejada };
  return { decisao: 'CONTRA', contra: desejada, desejado: desejada };
};

// ------------------------------------------------------------------ operacoes sobre o estado
const comNeg = (u: Universo, neg: NegociacaoTransf): Universo => ({ ...u, mercado: { ...u.mercado, negociacoes: u.mercado.negociacoes.map(n => (n.id === neg.id ? neg : n)) } });
const adicionarNeg = (u: Universo, neg: NegociacaoTransf): Universo => ({ ...u, mercado: { ...u.mercado, negociacoes: [...u.mercado.negociacoes, neg], proximoNum: u.mercado.proximoNum + 1 } });
const ev = (u: Universo, tipo: Evento['tipo'], neg: NegociacaoTransf | null, p: Player, clubeId: string, valor: number, motivo?: string): Evento =>
  ({ tipo, negId: neg ? neg.id : null, jogadorId: p.id, jogadorNome: p.name, clubeId, clubeNome: clube(u, clubeId)?.name || clubeId, valor, motivo });
const diasDeResposta = (semente: string, cfg: ConfigMercado, faixa: [number, number] = cfg.diasResposta): number => { const [a, b] = faixa; return a + Math.floor(criarRng(semente)() * (b - a + 1)); };
/** Um evento de um LADO do negocio (clausula, emprestimo, opcao, bonus): `clubeId` e o clube daquele lado e `outroClube` o nome da contraparte. */
const evLado = (u: Universo, tipo: Evento['tipo'], neg: NegociacaoTransf | null, p: Player, clubeId: string, lado: 'COMPRADOR' | 'VENDEDOR', outroId: string, valor: number, extra: Partial<Evento> = {}): Evento =>
  ({ ...ev(u, tipo, neg, p, clubeId, valor), lado, outroClube: clube(u, outroId)?.name || outroId, ...extra });

/**
 * Abre uma negociacao de COMPRA: `compradorId` propoe `valor` pelo jogador (e, se quiser, `bonus` ao vendedor aos 10/15/20 jogos). O vendedor humano recebe (RECEBIDA);
 * o vendedor IA responde em 1-3 dias (ENVIADA). Se o valor a vista paga a CLAUSULA de rescisao, a oferta e aceita na hora e conclui ja (se as validacoes deixarem).
 */
export const proporCompra = (u: Universo, compradorId: string, playerId: string, valor: number, hoje: string, donoId: string, cfg: ConfigMercado = CONFIG_MERCADO, bonus?: BonusJogos[]): Resultado =>
  abrirNegociacaoTransf(u, compradorId, playerId, valor, hoje, donoId, cfg, { tipo: 'COMPRA', bonus });

/**
 * Abre um pedido de EMPRESTIMO: `taxa` (pode ser 0) por `meses` (3 a 24, sem passar do contrato) e, se quiser, uma `opcaoCompra` (o preco para comprar no fim).
 * So jogadores do elenco profissional; o fluxo de resposta e o mesmo das compras (o dono humano aceita, recusa ou contrapropoe a taxa).
 */
export const proporEmprestimo = (u: Universo, compradorId: string, playerId: string, taxa: number, meses: number, opcaoCompra: number | undefined, hoje: string, donoId: string, cfg: ConfigMercado = CONFIG_MERCADO): Resultado =>
  abrirNegociacaoTransf(u, compradorId, playerId, taxa, hoje, donoId, cfg, { tipo: 'EMPRESTIMO', meses, opcaoCompra });

/** O utilizador (ou a CPU) paga a clausula de rescisao: uma proposta com o valor exato da clausula, aceita na hora. */
export const pagarClausula = (u: Universo, compradorId: string, playerId: string, hoje: string, donoId: string, cfg: ConfigMercado = CONFIG_MERCADO): Resultado => {
  const loc = localizar(u, playerId);
  const c = loc && loc.origem === 'ELENCO' ? clausulaDe(loc.jogador) : 0;
  if (!c) return { u, ok: false, motivo: 'o jogador nao tem clausula de rescisao', eventos: [] };
  return proporCompra(u, compradorId, playerId, c, hoje, donoId, cfg);
};

interface OpcoesNeg { tipo: 'COMPRA' | 'EMPRESTIMO'; bonus?: BonusJogos[]; meses?: number; opcaoCompra?: number; }
const abrirNegociacaoTransf = (u: Universo, compradorId: string, playerId: string, valor: number, hoje: string, donoId: string, cfg: ConfigMercado, o: OpcoesNeg): Resultado => {
  const falha = (motivo: string): Resultado => ({ u, ok: false, motivo, eventos: [] });
  const emprestimo = o.tipo === 'EMPRESTIMO';
  const loc = localizar(u, playerId);
  if (!loc) return falha('jogador nao encontrado');
  if (loc.origem === 'LIVRE') return falha('agente livre: contrate-o sem taxa');
  if (loc.origem === 'ELENCO' && emPreContrato(loc.jogador, hoje, cfg)) return falha('contrato a acabar (menos de 6 meses): assina sem custo');
  const p = loc.jogador, vendedorId = p.teamId;
  if (vendedorId === compradorId) return falha('o jogador ja e do clube');
  if (p.emprestimo) return falha('jogador emprestado');
  if (elencoDe(u, compradorId).length >= cfg.ia.maxElenco) return falha(`elenco cheio (maximo de ${cfg.ia.maxElenco} jogadores)`);
  if (!clube(u, compradorId) || !clube(u, vendedorId)) return falha('clube desconhecido');
  if (loc.origem === 'BASE' && p.age < cfg.idadeMinimaBase) return falha(`so jogadores do Sub-20 com ${cfg.idadeMinimaBase} anos ou mais`);
  if (emprestimo) {
    if (loc.origem !== 'ELENCO') return falha('so jogadores do elenco profissional podem ser emprestados');
    const meses = o.meses ?? 0;
    if (!Number.isInteger(meses) || meses < cfg.emprestimo.mesesMin || meses > cfg.emprestimo.mesesMax) return falha('duracao de emprestimo invalida');
    if (p.contract && somarMeses(hoje, meses) >= p.contract.end) return falha('o contrato acaba antes do fim do emprestimo');
    if (!(valor >= 0) || !isFinite(valor)) return falha('valor invalido');
    if (o.opcaoCompra !== undefined && !(o.opcaoCompra > 0 && isFinite(o.opcaoCompra))) return falha('valor invalido');
  } else if (!(valor > 0) || !isFinite(valor)) return falha('valor invalido');
  if (u.mercado.negociacoes.some(n => n.playerId === playerId && n.compradorId === compradorId && ESTADOS_ATIVOS.includes(n.estado))) return falha('ja existe uma negociacao ativa por este jogador');
  const num = u.mercado.proximoNum;
  const humanoVende = vendedorId === donoId;
  const bonus = emprestimo ? [] : normalizarBonus(o.bonus, cfg);
  const neg: NegociacaoTransf = {
    id: `neg-${num}`, playerId, compradorId, vendedorId, origem: loc.origem, estado: humanoVende ? 'RECEBIDA' : 'ENVIADA', aguarda: 'VENDEDOR',
    valor: arred(valor), rodadas: 1, criada: hoje, atualizada: hoje, expira: somarDias(hoje, cfg.diasValidade),
    respondeEm: humanoVende ? null : somarDias(hoje, p.listedForSale || (emprestimo && p.listedForLoan) ? 0 : diasDeResposta(`resp|neg-${num}|1`, cfg, cfg.diasRespostaNaoListado)),   // listado: a negociacao ja abre; senao o clube leva 2-3 dias
    historico: [{ n: 1, de: 'COMPRADOR', valor: arred(valor), data: hoje }],
    ...(emprestimo ? { tipo: 'EMPRESTIMO' as const, emprestimo: { meses: o.meses!, ...(o.opcaoCompra !== undefined ? { opcaoCompra: arred(o.opcaoCompra) } : {}) } } : {}),
    ...(bonus.length ? { bonus } : {})
  };
  const u1 = adicionarNeg(u, neg);
  // CLAUSULA DE RESCISAO paga: aceita na hora, sem o vendedor poder recusar (o elenco minimo basico ainda vale: sem ele, segue o fluxo normal)
  if (!emprestimo && loc.origem === 'ELENCO' && atingeClausula(p, neg.valor) && elencoValidoSem(elencoDe(u, vendedorId), p, cfg)) {
    const r = concluirAceita(u1, { ...neg, estado: 'ACEITA', aguarda: null, respondeEm: null, motivo: 'clausula de rescisao paga' }, hoje, donoId, cfg);
    const concluida = r.u.mercado.negociacoes.find(n => n.id === neg.id)?.estado === 'CONCLUIDA';
    const lados = [evLado(u, 'CLAUSULA_PAGA', neg, p, vendedorId, 'VENDEDOR', compradorId, neg.valor), evLado(u, 'CLAUSULA_PAGA', neg, p, compradorId, 'COMPRADOR', vendedorId, neg.valor)];
    return { ...r, eventos: concluida ? lados : r.eventos, negId: neg.id };
  }
  const eventos = humanoVende ? [{ ...ev(u, 'OFERTA_RECEBIDA', neg, p, compradorId, neg.valor), ...(emprestimo ? { emprestimo: true } : {}) }] : [];
  return { u: u1, ok: true, eventos, negId: neg.id };
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

/** Queda de moral de quem e posto na lista (venda pesa mais que emprestimo: o jogador sente que o clube nao conta com ele). */
export const QUEDA_MORAL_LISTA = { VENDA: 8, EMPRESTIMO: 5 };
const baixarMoral = (p: Player, queda: number): Player => ({ ...p, morale: Math.max(0, Math.min(100, (p.morale ?? 70) - queda)) });

/** Poe ou tira o jogador da lista de emprestimo. Listar reduz a moral. */
export const listarParaEmprestimo = (u: Universo, playerId: string, listar: boolean, cfg: ConfigMercado = CONFIG_MERCADO): Resultado => {
  const loc = localizar(u, playerId);
  if (!loc || loc.origem === 'LIVRE') return { u, ok: false, motivo: 'jogador nao pertence a um clube', eventos: [] };
  if (loc.origem === 'BASE' && loc.jogador.age < cfg.idadeMinimaBase) return { u, ok: false, motivo: `Sub-20 so a partir dos ${cfg.idadeMinimaBase} anos`, eventos: [] };
  if (listar && loc.jogador.emprestimo) return { u, ok: false, motivo: 'jogador emprestado', eventos: [] };
  if (!!loc.jogador.listedForLoan === listar) return { u, ok: true, eventos: [] };
  const marca = (p: Player): Player => (p.id !== playerId ? p : (listar ? baixarMoral({ ...p, listedForLoan: true }, QUEDA_MORAL_LISTA.EMPRESTIMO) : { ...p, listedForLoan: false }));
  return loc.origem === 'ELENCO'
    ? { u: { ...u, players: u.players.map(marca) }, ok: true, eventos: [] }
    : { u: { ...u, base: u.base ? { ...u.base, jogadores: u.base.jogadores.map(marca) } : u.base }, ok: true, eventos: [] };
};

/** Dispensa o jogador do elenco: vira agente livre (sem receita; o contrato e rescindido). */
export const dispensarJogador = (u: Universo, playerId: string, hoje: string): Resultado => {
  const p = u.players.find(x => x.id === playerId);
  if (!p || p.teamId === 'MARKET') return { u, ok: false, motivo: 'jogador nao pertence a um clube', eventos: [] };
  if (p.emprestimo) return { u, ok: false, motivo: 'jogador emprestado', eventos: [] };
  if (u.mercado.negociacoes.some(g => g.playerId === playerId && ESTADOS_ATIVOS.includes(g.estado))) return { u, ok: false, motivo: 'ha uma negociacao em curso por este jogador', eventos: [] };
  const clube = p.teamId;
  return { ok: true, eventos: [], u: { ...u,
    players: u.players.map(x => (x.id === playerId ? { ...x, teamId: 'MARKET', listedForSale: false, listedForLoan: false, listadoEm: undefined, livreDesde: hoje } : x)),
    teams: u.teams.map(x => (x.id === clube ? limparEscalacao(x, playerId) : x)),
    mercado: { ...u.mercado, historico: [...u.mercado.historico, { id: `mov-disp-${u.mercado.proximoNum}-${p.id}`, data: hoje, jogadorId: p.id, jogadorNome: p.name, de: clube, para: 'MARKET', valor: 0, tipo: 'DISPENSA' as const }].slice(-CONFIG_MERCADO.maxTransacoes), proximoNum: u.mercado.proximoNum + 1 } } };
};

/** Poe ou tira o jogador da lista de venda (so sinaliza ao mercado: nao transfere nada). Vale para o elenco e para o Sub-20 (com a idade minima). */
export const listarParaVenda = (u: Universo, playerId: string, listar: boolean, cfg: ConfigMercado = CONFIG_MERCADO): Resultado => {
  const loc = localizar(u, playerId);
  if (!loc || loc.origem === 'LIVRE') return { u, ok: false, motivo: 'jogador nao pertence a um clube', eventos: [] };
  if (loc.origem === 'BASE' && loc.jogador.age < cfg.idadeMinimaBase) return { u, ok: false, motivo: `Sub-20 so a partir dos ${cfg.idadeMinimaBase} anos`, eventos: [] };
  if (listar && loc.jogador.emprestimo) return { u, ok: false, motivo: 'jogador emprestado', eventos: [] };
  if (!!loc.jogador.listedForSale === listar) return { u, ok: true, eventos: [] };
  const marca = (p: Player): Player => (p.id !== playerId ? p : (listar ? baixarMoral({ ...p, listedForSale: true, listadoEm: p.listadoEm }, QUEDA_MORAL_LISTA.VENDA) : { ...p, listedForSale: false }));
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
  if (neg.tipo === 'EMPRESTIMO') return concluirEmprestimo(u, neg, hoje, cfg);
  const loc = localizar(u, neg.playerId);
  if (!loc || loc.origem === 'LIVRE' || loc.jogador.teamId !== neg.vendedorId) return falha('o jogador ja nao pertence ao vendedor');
  const p = loc.jogador;
  if (p.emprestimo) return falha('jogador emprestado');
  if (p.contract && hoje >= p.contract.end) return falha('contrato vencido');
  if (elencoDe(u, neg.compradorId).length >= cfg.ia.maxElenco) return falha(`elenco cheio (maximo de ${cfg.ia.maxElenco} jogadores)`);
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
  // O comprador fixa uma CLAUSULA nova (o dobro do maior entre o valor pago e o valor de mercado) — so nos contratos que ja estao no sistema de clausulas (os outros ganham-na no dia seguinte).
  const contrato = p.contract && p.contract.releaseClause !== undefined ? { ...p.contract, releaseClause: clausulaAposTransferencia(neg.valor, valorDeMercado(p, hoje)) } : p.contract;
  const novo: Player = { ...p, teamId: neg.compradorId, shirtNumber: numeroLivre(elencoComprador), listedForSale: false, ...(p.listedForLoan ? { listedForLoan: false } : {}), trainingGroupId: 0, contract: contrato };
  let players = u.players, base = u.base;
  if (loc.origem === 'ELENCO') players = players.map(x => (x.id === p.id ? novo : x));
  else {
    // do Sub-20: sai da base (a vaga so e reposta na proxima janela, 1/1 ou 1/6) e entra no elenco profissional do comprador
    const relatorios = { ...base!.relatorios }; delete relatorios[p.id];
    base = { ...base!, jogadores: base!.jogadores.filter(x => x.id !== p.id), relatorios, vagas: { ...(base!.vagas || {}), [neg.vendedorId]: ((base!.vagas || {})[neg.vendedorId] || 0) + 1 } };
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
  if (neg.motivo === 'clausula de rescisao paga') { txC.tipo = 'CLAUSULA'; txV.tipo = 'CLAUSULA'; }
  // os BONUS por jogos prometidos ficam pendentes, com a contagem a partir de zero
  const bonus = neg.bonus?.length
    ? [...(u.mercado.bonus || []).filter(b => b.estado === 'ATIVO' || b.data >= somarMeses(hoje, -24)), { id: `bon-${neg.id}`, negId: neg.id, jogadorId: p.id, jogadorNome: p.name, compradorId: comprador.id, vendedorId: vendedor.id, data: hoje, jogos: 0, marcos: neg.bonus.map(b => ({ jogos: b.jogos, valor: b.valor })), estado: 'ATIVO' as const }]
    : u.mercado.bonus;
  const mercado: MercadoState = {
    ...u.mercado, negociacoes, transacoes: [...u.mercado.transacoes, txC, txV].slice(-cfg.maxTransacoes), historico: [...u.mercado.historico, mov].slice(-cfg.maxTransacoes),
    ...(bonus ? { bonus } : {})
  };
  const eventos = [ev(u, 'CONCLUIDA_COMPRA', neg, p, comprador.id, valor), ev(u, 'CONCLUIDA_VENDA', neg, p, vendedor.id, valor)];
  return { u: { players, base, teams, mercado }, ok: true, eventos, negId: neg.id };
};

/**
 * Conclui um EMPRESTIMO aceito (atomico, como a compra): o jogador vai para o clube que o pediu ate `hoje + meses`, com o dono e a opcao de compra guardados em `Player.emprestimo`;
 * a taxa (pode ser 0) passa do comprador ao dono, com os dois lancamentos `tx-<neg>-C|V` (tipo EMPRESTIMO). O contrato nao muda (e do dono).
 */
const concluirEmprestimo = (u: Universo, neg: NegociacaoTransf, hoje: string, cfg: ConfigMercado): Resultado => {
  const falha = (motivo: string): Resultado => ({ u, ok: false, motivo, eventos: [], negId: neg.id });
  const p = u.players.find(x => x.id === neg.playerId);
  if (!p || p.teamId !== neg.vendedorId) return falha('o jogador ja nao pertence ao vendedor');
  if (p.emprestimo) return falha('jogador emprestado');
  const meses = neg.emprestimo?.meses ?? 12, ate = somarMeses(hoje, meses);
  if (p.contract && ate >= p.contract.end) return falha('o contrato acaba antes do fim do emprestimo');
  const comprador = clube(u, neg.compradorId), vendedor = clube(u, neg.vendedorId);
  if (!comprador || !vendedor) return falha('clube desconhecido');
  const elencoComprador = elencoDe(u, neg.compradorId);
  if (elencoComprador.length >= cfg.ia.maxElenco) return falha(`elenco cheio (maximo de ${cfg.ia.maxElenco} jogadores)`);
  if (!janelaAberta(hoje, comprador.country, cfg)) return falha('fora da janela de transferencias');
  const valor = neg.valor;
  if (comprador.cash < valor) return falha('saldo insuficiente');
  if ((comprador.transferBudget ?? 0) < valor) return falha('orcamento de transferencias insuficiente');
  if (!elencoValidoSem(elencoDe(u, neg.vendedorId), p, cfg)) return falha('o elenco do vendedor ficaria sem o minimo');

  const opcao = neg.emprestimo?.opcaoCompra;
  const novo: Player = { ...p, teamId: comprador.id, shirtNumber: numeroLivre(elencoComprador), listedForSale: false, listedForLoan: false, trainingGroupId: 0,
    emprestimo: { de: vendedor.id, inicio: hoje, ate, negId: neg.id, ...(opcao !== undefined ? { opcaoCompra: opcao } : {}) } };
  const parte = Math.round(valor * cfg.parteDaReceitaNoOrcamento);
  const txC: Transacao = { id: `tx-${neg.id}-C`, data: hoje, clubeId: comprador.id, jogadorId: p.id, jogadorNome: p.name, contraparteId: vendedor.id, natureza: 'COMPRA', valor, tipo: 'EMPRESTIMO',
    saldoAntes: comprador.cash, saldoDepois: comprador.cash - valor, orcamentoAntes: comprador.transferBudget ?? 0, orcamentoDepois: (comprador.transferBudget ?? 0) - valor, negId: neg.id };
  const txV: Transacao = { id: `tx-${neg.id}-V`, data: hoje, clubeId: vendedor.id, jogadorId: p.id, jogadorNome: p.name, contraparteId: comprador.id, natureza: 'VENDA', valor, tipo: 'EMPRESTIMO',
    saldoAntes: vendedor.cash, saldoDepois: vendedor.cash + valor, orcamentoAntes: vendedor.transferBudget ?? 0, orcamentoDepois: (vendedor.transferBudget ?? 0) + parte, negId: neg.id };
  const teams = u.teams.map(t => {
    if (t.id === comprador.id) return { ...t, cash: txC.saldoDepois, transferBudget: txC.orcamentoDepois };
    if (t.id === vendedor.id) return limparEscalacao({ ...t, cash: txV.saldoDepois, transferBudget: txV.orcamentoDepois }, p.id);
    return t;
  });
  const negociacoes = u.mercado.negociacoes.map(n => {
    if (n.id === neg.id) return { ...neg, estado: 'CONCLUIDA' as const, aguarda: null, atualizada: hoje, respondeEm: null };
    if (n.playerId === p.id && ESTADOS_ATIVOS.includes(n.estado)) return { ...n, estado: 'EXPIRADA' as const, aguarda: null, atualizada: hoje, respondeEm: null, motivo: 'jogador transferido' };
    return n;
  });
  const mov: Movimento = { id: `mov-${neg.id}`, data: hoje, jogadorId: p.id, jogadorNome: p.name, de: vendedor.id, para: comprador.id, valor, tipo: 'EMPRESTIMO' };
  const mercado: MercadoState = { ...u.mercado, negociacoes, transacoes: [...u.mercado.transacoes, txC, txV].slice(-cfg.maxTransacoes), historico: [...u.mercado.historico, mov].slice(-cfg.maxTransacoes) };
  const extra = { data: ate, emprestimo: true };
  const eventos = [evLado(u, 'EMPRESTIMO_CONCLUIDO', neg, p, comprador.id, 'COMPRADOR', vendedor.id, valor, extra), evLado(u, 'EMPRESTIMO_CONCLUIDO', neg, p, vendedor.id, 'VENDEDOR', comprador.id, valor, extra)];
  return { u: { ...u, players: u.players.map(x => (x.id === p.id ? novo : x)), teams, mercado }, ok: true, eventos, negId: neg.id };
};

/**
 * O clube que tem o jogador emprestado EXERCE A OPCAO DE COMPRA: paga o preco acordado ao dono e o jogador fica de vez (contrato do dono mantido, clausula nova).
 * Vale a qualquer momento do emprestimo, sem janela (o preco ja estava no acordo); exige caixa. Lancamentos `tx-opc-<neg>-C|V` (tipo OPCAO).
 */
export const exercerOpcao = (u: Universo, playerId: string, hoje: string, cfg: ConfigMercado = CONFIG_MERCADO): Resultado => {
  const falha = (motivo: string): Resultado => ({ u, ok: false, motivo, eventos: [] });
  const p = u.players.find(x => x.id === playerId);
  const e = p?.emprestimo;
  if (!p || !e) return falha('o jogador nao esta emprestado');
  if (e.opcaoCompra === undefined) return falha('o emprestimo nao tem opcao de compra');
  const comprador = clube(u, p.teamId), vendedor = clube(u, e.de);
  if (!comprador || !vendedor) return falha('clube desconhecido');
  const valor = e.opcaoCompra;
  if (comprador.cash < valor) return falha('saldo insuficiente');
  if (u.mercado.transacoes.some(t => t.id === `tx-opc-${e.negId}-C`)) return falha('ja contabilizada');
  const parte = Math.round(valor * cfg.parteDaReceitaNoOrcamento);
  const orcC = comprador.transferBudget ?? 0, orcV = vendedor.transferBudget ?? 0;
  const txC: Transacao = { id: `tx-opc-${e.negId}-C`, data: hoje, clubeId: comprador.id, jogadorId: p.id, jogadorNome: p.name, contraparteId: vendedor.id, natureza: 'COMPRA', valor, tipo: 'OPCAO', ref: e.negId,
    saldoAntes: comprador.cash, saldoDepois: comprador.cash - valor, orcamentoAntes: orcC, orcamentoDepois: Math.max(0, orcC - valor), negId: null };
  const txV: Transacao = { id: `tx-opc-${e.negId}-V`, data: hoje, clubeId: vendedor.id, jogadorId: p.id, jogadorNome: p.name, contraparteId: comprador.id, natureza: 'VENDA', valor, tipo: 'OPCAO', ref: e.negId,
    saldoAntes: vendedor.cash, saldoDepois: vendedor.cash + valor, orcamentoAntes: orcV, orcamentoDepois: orcV + parte, negId: null };
  const contrato = p.contract && p.contract.releaseClause !== undefined ? { ...p.contract, releaseClause: clausulaAposTransferencia(valor, valorDeMercado(p, hoje)) } : p.contract;
  const novo: Player = { ...p, emprestimo: undefined, contract: contrato };
  const teams = u.teams.map(t => (t.id === comprador.id ? { ...t, cash: txC.saldoDepois, transferBudget: txC.orcamentoDepois } : t.id === vendedor.id ? { ...t, cash: txV.saldoDepois, transferBudget: txV.orcamentoDepois } : t));
  const mov: Movimento = { id: `mov-opc-${e.negId}`, data: hoje, jogadorId: p.id, jogadorNome: p.name, de: vendedor.id, para: comprador.id, valor, tipo: 'TRANSFERENCIA' };
  const mercado: MercadoState = { ...u.mercado, transacoes: [...u.mercado.transacoes, txC, txV].slice(-cfg.maxTransacoes), historico: [...u.mercado.historico, mov].slice(-cfg.maxTransacoes) };
  const eventos = [evLado(u, 'OPCAO_EXERCIDA', null, p, comprador.id, 'COMPRADOR', vendedor.id, valor), evLado(u, 'OPCAO_EXERCIDA', null, p, vendedor.id, 'VENDEDOR', comprador.id, valor)];
  return { u: { ...u, players: u.players.map(x => (x.id === p.id ? novo : x)), teams, mercado }, ok: true, eventos };
};

/** A CPU exerce a opcao? Se o preco cabe no que pagaria de bom grado (valor x apetite x 1,1), tem caixa, o jogador tem ate 32 anos e esta entre os titulares do grupo dela. */
export const iaExerceOpcao = (u: Universo, p: Player, hoje: string, cfg: ConfigMercado = CONFIG_MERCADO): boolean => {
  const e = p.emprestimo, t = clube(u, p.teamId);
  if (!e || e.opcaoCompra === undefined || !t) return false;
  if (e.opcaoCompra > t.cash || p.age > 32) return false;
  if (e.opcaoCompra > valorDeMercado(p, hoje) * perfilDoClube(t.id, cfg).apetite * 1.1) return false;
  const titulares = titularesDaFormacao(t.tactics?.formation)[grupoDe(p.position)];
  const doGrupo = u.players.filter(x => x.teamId === t.id && grupoDe(x.position) === grupoDe(p.position)).sort((a, b) => b.skill - a.skill);
  const posto = doGrupo.findIndex(x => x.id === p.id);
  return posto >= 0 && posto < titulares;
};

/**
 * Os emprestimos do dia: aviso ao utilizador `avisoOpcaoDias` antes do fim (se tem opcao); no fim, a CPU decide a opcao (`iaExerceOpcao`) e quem nao e comprado volta ao dono
 * (numero livre, fora da escalacao de quem o tinha). O utilizador que nao exerceu ate ao fim perde a opcao.
 */
export const processarEmprestimos = (u0: Universo, hoje: string, donoId: string, cfg: ConfigMercado = CONFIG_MERCADO): Resultado => {
  if (!u0.players.some(p => p.emprestimo)) return { u: u0, ok: true, eventos: [] };
  let u = u0;
  const eventos: Evento[] = [];
  for (const p0 of u0.players.filter(p => p.emprestimo)) {
    const p = u.players.find(x => x.id === p0.id);
    const e = p?.emprestimo;
    if (!p || !e) continue;
    if (p.teamId === 'MARKET' || !clube(u, e.de)) {   // o dono saiu do jogo (ou o jogador ficou livre): o emprestimo deixa de existir
      u = { ...u, players: u.players.map(x => (x.id === p.id ? { ...x, emprestimo: undefined } : x)) };
      continue;
    }
    if (hoje < e.ate) {
      if (p.teamId === donoId && e.opcaoCompra !== undefined && !e.avisado && hoje >= somarDias(e.ate, -cfg.emprestimo.avisoOpcaoDias)) {
        u = { ...u, players: u.players.map(x => (x.id === p.id ? { ...x, emprestimo: { ...e, avisado: true } } : x)) };
        eventos.push(evLado(u, 'OPCAO_AVISO', null, p, p.teamId, 'COMPRADOR', e.de, e.opcaoCompra, { data: e.ate }));
      }
      continue;
    }
    // fim do emprestimo: a CPU decide a opcao; senao o jogador volta
    if (p.teamId !== donoId && iaExerceOpcao(u, p, hoje, cfg)) {
      const r = exercerOpcao(u, p.id, hoje, cfg);
      if (r.ok) { u = r.u; eventos.push(...r.eventos); continue; }
    }
    const tinha = p.teamId;
    const volta: Player = { ...p, teamId: e.de, emprestimo: undefined, shirtNumber: numeroLivre(elencoDe(u, e.de)), trainingGroupId: 0, listedForSale: false, listedForLoan: false };
    const mov: Movimento = { id: `mov-dev-${e.negId}`, data: hoje, jogadorId: p.id, jogadorNome: p.name, de: tinha, para: e.de, valor: 0, tipo: 'DEVOLUCAO' };
    u = { ...u, players: u.players.map(x => (x.id === p.id ? volta : x)), teams: u.teams.map(t => (t.id === tinha ? limparEscalacao(t, p.id) : t)),
      mercado: { ...u.mercado, historico: [...u.mercado.historico, mov].slice(-cfg.maxTransacoes) } };
    eventos.push(evLado(u, 'EMPRESTIMO_FIM', null, p, tinha, 'COMPRADOR', e.de, 0, { emprestimo: true }), evLado(u, 'EMPRESTIMO_FIM', null, p, e.de, 'VENDEDOR', tinha, 0, { emprestimo: true }));
  }
  return { u, ok: true, eventos };
};

/*
BONUS POR JOGOS: a contagem e o pagamento. `registrarJogosDosBonus` recebe os ids de quem jogou um jogo oficial (a escalacao real, chamado pelo GameContext a cada jogo do dia)
e soma 1 a cada bonus ativo do jogador que ainda esta no comprador. `processarBonus` (no dia do mercado) estima os jogos fora da liga do utilizador e paga os marcos atingidos.
*/
export const registrarJogosDosBonus = (mercado: MercadoState, players: Player[], jogaram: Iterable<string>): MercadoState => {
  if (!mercado.bonus?.some(b => b.estado === 'ATIVO')) return mercado;
  const ids = new Set(jogaram);
  let mudou = false;
  const bonus = mercado.bonus.map(b => {
    if (b.estado !== 'ATIVO' || !ids.has(b.jogadorId)) return b;
    const p = players.find(x => x.id === b.jogadorId);
    if (!p || p.teamId !== b.compradorId) return b;
    mudou = true;
    return { ...b, jogos: b.jogos + 1 };
  });
  return mudou ? { ...mercado, bonus } : mercado;
};

export const processarBonus = (u0: Universo, hoje: string, donoId: string, cfg: ConfigMercado = CONFIG_MERCADO): Resultado => {
  if (!u0.mercado.bonus?.some(b => b.estado === 'ATIVO')) return { u: u0, ok: true, eventos: [] };
  let u = u0;
  const eventos: Evento[] = [];
  const dono = clube(u0, donoId);
  const lista: BonusTransferencia[] = [];
  let transacoes = u.mercado.transacoes;
  for (const b0 of u0.mercado.bonus) {
    if (b0.estado !== 'ATIVO') { lista.push(b0); continue; }
    let b = b0;
    const p = u.players.find(x => x.id === b.jogadorId);
    const emprestadoPeloComprador = p?.emprestimo?.de === b.compradorId;
    if (!p || (p.teamId !== b.compradorId && !emprestadoPeloComprador)) { lista.push({ ...b, estado: 'CADUCADO' }); continue; }   // saiu do comprador: os bonus que faltam caducam
    // fora da liga do utilizador nao ha escalacao: 1 jogo a cada 7 dias se e um dos 14 melhores do elenco
    const comprador = clube(u, b.compradorId);
    if (comprador && dono && !naLigaDoUtilizador(comprador, dono) && p.teamId === b.compradorId) {
      const desde = b.ultimaEstimativa || b.data, passos = Math.floor(diasEntre(desde, hoje) / cfg.bonus.diasPorJogoEstimado);
      if (passos > 0) {
        const top = elencoDe(u, b.compradorId).sort((x, y) => y.skill - x.skill).slice(0, cfg.bonus.titularesEstimados);
        const joga = top.some(x => x.id === p.id) && !p.injury;
        b = { ...b, jogos: b.jogos + (joga ? passos : 0), ultimaEstimativa: somarDias(desde, passos * cfg.bonus.diasPorJogoEstimado) };
      }
    }
    // os marcos atingidos pagam agora (o caixa do comprador pode ficar negativo: e uma obrigacao do contrato)
    for (const m of b.marcos) {
      if (m.pago || b.jogos < m.jogos) continue;
      const c = clube(u, b.compradorId), v = clube(u, b.vendedorId);
      if (!c || !v) continue;
      const idC = `tx-bon-${b.id}-${m.jogos}-C`;
      if (transacoes.some(t => t.id === idC)) { b = { ...b, marcos: b.marcos.map(x => (x === m ? { ...x, pago: hoje } : x)) }; continue; }
      const orcC = c.transferBudget ?? 0, orcV = v.transferBudget ?? 0, parte = Math.round(m.valor * cfg.parteDaReceitaNoOrcamento);
      const txC: Transacao = { id: idC, data: hoje, clubeId: c.id, jogadorId: p.id, jogadorNome: p.name, contraparteId: v.id, natureza: 'COMPRA', valor: m.valor, tipo: 'BONUS', ref: b.negId,
        saldoAntes: c.cash, saldoDepois: c.cash - m.valor, orcamentoAntes: orcC, orcamentoDepois: Math.max(0, orcC - m.valor), negId: null };
      const txV: Transacao = { id: `tx-bon-${b.id}-${m.jogos}-V`, data: hoje, clubeId: v.id, jogadorId: p.id, jogadorNome: p.name, contraparteId: c.id, natureza: 'VENDA', valor: m.valor, tipo: 'BONUS', ref: b.negId,
        saldoAntes: v.cash, saldoDepois: v.cash + m.valor, orcamentoAntes: orcV, orcamentoDepois: orcV + parte, negId: null };
      u = { ...u, teams: u.teams.map(t => (t.id === c.id ? { ...t, cash: txC.saldoDepois, transferBudget: txC.orcamentoDepois } : t.id === v.id ? { ...t, cash: txV.saldoDepois, transferBudget: txV.orcamentoDepois } : t)) };
      transacoes = [...transacoes, txC, txV];
      b = { ...b, marcos: b.marcos.map(x => (x === m ? { ...x, pago: hoje } : x)) };
      eventos.push(evLado(u, 'BONUS_PAGO', null, p, c.id, 'COMPRADOR', v.id, m.valor, { jogos: m.jogos }), evLado(u, 'BONUS_PAGO', null, p, v.id, 'VENDEDOR', c.id, m.valor, { jogos: m.jogos }));
    }
    if (b.marcos.every(m => m.pago)) b = { ...b, estado: 'CONCLUIDO' };
    lista.push(b);
  }
  u = { ...u, mercado: { ...u.mercado, bonus: lista, transacoes: transacoes.slice(-cfg.maxTransacoes) } };
  return { u, ok: true, eventos };
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

/** Contrata um AGENTE LIVRE, ou um jogador em PRE-CONTRATO (menos de 6 meses de contrato noutro clube, que o perde sem receber nada): sem taxa, contrato novo pela idade, salario mantido. */
export const contratarAgenteLivre = (u: Universo, compradorId: string, playerId: string, hoje: string, cfg: ConfigMercado = CONFIG_MERCADO): Resultado => {
  const falha = (motivo: string): Resultado => ({ u, ok: false, motivo, eventos: [] });
  const p = u.players.find(x => x.id === playerId);
  if (!p) return falha('o jogador nao e agente livre');
  const preContrato = p.teamId !== 'MARKET';
  const vendedorId = preContrato ? p.teamId : null;
  if (preContrato) {
    if (!emPreContrato(p, hoje, cfg)) return falha('o jogador nao e agente livre');
    if (vendedorId === compradorId) return falha('o jogador ja e do clube');
    if (!elencoValidoSem(elencoDe(u, vendedorId!), p, cfg)) return falha('o elenco do clube atual ficaria sem o minimo');
  }
  const comprador = clube(u, compradorId);
  if (!comprador) return falha('clube desconhecido');
  if (elencoDe(u, compradorId).length >= cfg.ia.maxElenco) return falha(`elenco cheio (maximo de ${cfg.ia.maxElenco} jogadores)`);
  if (!cfg.agentesLivresForaDaJanela && !janelaAberta(hoje, comprador.country, cfg)) return falha('fora da janela de transferencias');
  const elenco = elencoDe(u, compradorId);
  if (elenco.length >= cfg.maximoElenco) return falha('elenco cheio');
  const novo: Player = { ...p, teamId: compradorId, shirtNumber: numeroLivre(elenco), listedForSale: false, livreDesde: undefined, contract: novoContrato(p.age, hoje, criarRng(`livre|${p.id}|${hoje}`)), trainingGroupId: 0 };
  const num = u.mercado.proximoNum;
  const tx: Transacao = { id: `tx-fa-${num}-${p.id}`, data: hoje, clubeId: compradorId, jogadorId: p.id, jogadorNome: p.name, contraparteId: vendedorId || 'MARKET', natureza: 'AGENTE_LIVRE', valor: 0,
    saldoAntes: comprador.cash, saldoDepois: comprador.cash, orcamentoAntes: comprador.transferBudget ?? 0, orcamentoDepois: comprador.transferBudget ?? 0, negId: null };
  const mov: Movimento = { id: `mov-fa-${num}`, data: hoje, jogadorId: p.id, jogadorNome: p.name, de: vendedorId || 'MARKET', para: compradorId, valor: 0, tipo: 'AGENTE_LIVRE' };
  const negociacoes = u.mercado.negociacoes.map(n => (n.playerId === p.id && ESTADOS_ATIVOS.includes(n.estado) ? { ...n, estado: 'EXPIRADA' as const, aguarda: null, motivo: 'jogador contratado' } : n));
  return {
    u: { ...u, players: u.players.map(x => (x.id === p.id ? novo : x)), teams: vendedorId ? u.teams.map(t => (t.id === vendedorId ? limparEscalacao(t, p.id) : t)) : u.teams,
      mercado: { ...u.mercado, negociacoes, proximoNum: num + 1, transacoes: [...u.mercado.transacoes, tx].slice(-cfg.maxTransacoes), historico: [...u.mercado.historico, mov].slice(-cfg.maxTransacoes) } },
    ok: true, eventos: [ev(u, 'AGENTE_LIVRE', null, p, compradorId, 0), ...(vendedorId ? [{ ...ev(u, 'SAIDA_LIVRE', null, p, vendedorId, 0), motivo: clube(u, compradorId)?.name || compradorId }] : [])]
  };
};

// ------------------------------------------------------------------ a ambicao do comprador CPU
export interface Ambicao { perfil: 'TITULO' | 'CONTINENTAL' | 'MEIO'; crise: boolean; teto: number; primeira: number; concessao: number; }
/** O perfil de compra do clube (ver `ia.ambicao`): pela forca na propria liga e pela crise na tabela, x a personalidade. `teto` e `primeira` em fracao do valor de mercado. */
export const ambicaoDoClube = (u: Universo, teamId: string, cfg: ConfigMercado = CONFIG_MERCADO): Ambicao => {
  const A = cfg.ia.ambicao, t = clube(u, teamId);
  const liga = t ? u.teams.filter(x => x.leagueId === t.leagueId) : [];
  const n = Math.max(1, liga.length);
  const rankForca = t ? [...liga].sort((a, b) => (b.strength - a.strength) || a.id.localeCompare(b.id)).findIndex(x => x.id === teamId) + 1 : n;
  const perfil = rankForca <= Math.max(1, Math.round(n * A.titulo)) ? 'TITULO' : rankForca <= Math.max(2, Math.round(n * A.continental)) ? 'CONTINENTAL' : 'MEIO';
  let crise = false;
  if (t && (t.played || 0) >= A.crise.jogosMin) {
    const tabela = [...liga].sort((a, b) => (b.points - a.points) || ((b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)) || a.id.localeCompare(b.id));
    const pos = tabela.findIndex(x => x.id === teamId) + 1;
    crise = pos - rankForca >= Math.max(2, Math.round(n * A.crise.folga)) || pos > n - A.crise.rebaixados;
  }
  const P = A.perfis[perfil], [a0, a1] = cfg.ia.apetite, pers = perfilDoClube(teamId, cfg).apetite / ((a0 + a1) / 2);
  return { perfil, crise, teto: (P.teto + (crise ? A.crise.teto : 0)) * pers, primeira: P.primeira * pers, concessao: Math.min(0.9, P.concessao + (crise ? A.crise.concessao : 0)) };
};

// ------------------------------------------------------------------ o dia do mercado (respostas, prazos e IA)
/** O teto do comprador CPU para este jogador (valor de mercado x a ambicao do clube), sem contar caixa e orcamento. */
const tetoDoComprador = (u: Universo, neg: NegociacaoTransf, p: Player, hoje: string, cfg: ConfigMercado): number =>
  valorDeMercado(p, hoje) * ambicaoDoClube(u, neg.compradorId, cfg).teto;

const aprovarContra = (u: Universo, neg: NegociacaoTransf, hoje: string, cfg: ConfigMercado): boolean => {
  // o comprador IA aceita a contraproposta se ela cabe no que paga de bom grado (valor de mercado x apetite do clube x tolerancia) e no orcamento
  const loc = localizar(u, neg.playerId);
  const t = clube(u, neg.compradorId);
  if (!loc || !t) return false;
  if (neg.tipo === 'EMPRESTIMO') {   // a taxa de emprestimo: ate 12% do valor por ano de emprestimo
    const tetoTaxa = valorDeMercado(loc.jogador, hoje) * cfg.emprestimo.tetoTaxaIa * (neg.emprestimo?.meses ?? 12) / 12;
    return neg.valor <= tetoTaxa && neg.valor <= t.cash && neg.valor <= (t.transferBudget ?? 0);
  }
  // os bonus prometidos tambem pesam no que o comprador aceita pagar (a 60%)
  // o teto vem da AMBICAO do clube (ambicaoDoClube): forca na liga, crise e personalidade
  const teto = tetoDoComprador(u, neg, loc.jogador, hoje, cfg);
  return neg.valor + valorDosBonus(neg.bonus, cfg) <= teto && neg.valor <= t.cash && neg.valor <= (t.transferBudget ?? 0);
};

/*
A NOVA OFERTA DO COMPRADOR CPU a uma contraproposta acima do teto dele: cobre uma FRACAO do que falta (oferta + (contra - oferta) x concessao), nunca acima do teto
nem do caixa/orcamento. null se ja nao ha rodadas ou se nao consegue subir (o teto ja esta na oferta): ai desiste.
*/
const novaOfertaDaCpu = (u: Universo, neg: NegociacaoTransf, hoje: string, cfg: ConfigMercado): number | null => {
  if (neg.tipo === 'EMPRESTIMO' || neg.rodadas >= cfg.maxRodadas) return null;
  const loc = localizar(u, neg.playerId), t = clube(u, neg.compradorId);
  if (!loc || !t) return null;
  const minhas = neg.historico.filter(h => h.de === 'COMPRADOR');
  const atual = minhas.length ? minhas[minhas.length - 1].valor : 0;
  const amb = ambicaoDoClube(u, neg.compradorId, cfg);
  const teto = Math.min(valorDeMercado(loc.jogador, hoje) * amb.teto - valorDosBonus(neg.bonus, cfg), t.cash, t.transferBudget ?? 0);
  const nova = arred(Math.min(teto, atual + (neg.valor - atual) * amb.concessao));
  return nova > atual + 1000 ? nova : null;
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
      const nova = aprovarContra(u, neg, hoje, cfg) ? null : novaOfertaDaCpu(u, neg, hoje, cfg);
      if (aprovarContra(u, neg, hoje, cfg)) {
        u = comNeg(u, neg = { ...neg, estado: 'ACEITA', aguarda: null, atualizada: hoje, respondeEm: null });
        tentar(neg.id);
      } else if (nova !== null) {
        // RODADA NOVA: a CPU sobe uma fracao do que falta, ate ao teto da ambicao dela (o vendedor responde em 1-3 dias; na ultima rodada aceita de 93% do preco)
        const humanoVende = neg.vendedorId === donoId;
        const n2: NegociacaoTransf = { ...neg, estado: humanoVende ? 'RECEBIDA' : 'ENVIADA', aguarda: 'VENDEDOR', valor: nova, rodadas: neg.rodadas + 1, atualizada: hoje,
          expira: somarDias(hoje, cfg.diasValidade), respondeEm: humanoVende ? null : somarDias(hoje, diasDeResposta(`resp|${neg.id}|${neg.rodadas + 1}`, cfg)),
          historico: [...neg.historico, { n: neg.historico.length + 1, de: 'COMPRADOR', valor: nova, data: hoje }] };
        u = comNeg(u, n2);
        if (humanoVende) eventos.push(ev(u, 'OFERTA_RECEBIDA', n2, loc.jogador, neg.compradorId, nova));
      } else {
        u = comNeg(u, { ...neg, estado: 'RECUSADA', aguarda: null, atualizada: hoje, respondeEm: null, motivo: 'contraproposta acima do que o comprador paga' });
        if (neg.vendedorId === donoId) eventos.push(ev(u, 'RECUSADA', neg, loc.jogador, neg.compradorId, neg.valor, 'o comprador recusou a sua contraproposta'));
      }
    }
  }

  // emprestimos (aviso da opcao, fim, opcao da CPU) e bonus por jogos (estimativa fora da liga do utilizador e pagamento dos marcos)
  { const r = processarEmprestimos(u, hoje, donoId, cfg); u = r.u; eventos.push(...r.eventos); }
  { const r = processarBonus(u, hoje, donoId, cfg); u = r.u; eventos.push(...r.eventos); }

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

/** A lista de venda e de emprestimo da CPU para o clube `t` (ver `ia.listaAtiva`). Devolve o universo com as marcas novas (e as dispensas). */
const listaAtiva = (u0: Universo, t: Team, hoje: string, cfg: ConfigMercado): Universo => {
  const L = cfg.ia.listaAtiva;
  let u = u0;
  const elenco = elencoDe(u, t.id).filter(p => !p.emprestimo);
  if (!elenco.length) return u;
  const tit = titularesDaFormacao(formacaoDe(u, t.id)), precisa = necessarioPorGrupo(formacaoDe(u, t.id));
  const porGrupo: Record<Grupo, Player[]> = { GK: [], DEF: [], MID: [], ATT: [] };
  elenco.forEach(p => porGrupo[grupoDe(p.position)].push(p));
  (Object.keys(porGrupo) as Grupo[]).forEach(g => porGrupo[g].sort((a, b) => b.skill - a.skill));
  const titular = new Set<string>(), mediaTit: Record<Grupo, number> = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
  (Object.keys(porGrupo) as Grupo[]).forEach(g => {
    const ts = porGrupo[g].slice(0, tit[g]);
    ts.forEach(p => titular.add(p.id));
    mediaTit[g] = ts.length ? ts.reduce((a, p) => a + p.skill, 0) / ts.length : 0;
  });
  const marcar = (id: string, campo: 'listedForSale' | 'listedForLoan', valor: boolean) => {
    u = { ...u, players: u.players.map(x => (x.id !== id ? x : (valor ? { ...x, [campo]: true, ...(campo === 'listedForSale' ? { listadoEm: hoje } : {}) } : { ...x, [campo]: false, ...(campo === 'listedForSale' ? { listadoEm: undefined } : {}) }))) };
  };
  // quem virou titular sai das listas
  for (const p of elenco) if (titular.has(p.id)) { if (p.listedForSale) marcar(p.id, 'listedForSale', false); if (p.listedForLoan) marcar(p.id, 'listedForLoan', false); }
  const emNeg = (id: string) => u.mercado.negociacoes.some(g => g.playerId === id && ESTADOS_ATIVOS.includes(g.estado));
  let listados = elencoDe(u, t.id).filter(p => p.listedForSale || p.listedForLoan).length, novos = 0;
  const pode = () => novos < L.novosPorDia && listados < L.maxListados;
  const candidato = (p: Player) => !titular.has(p.id) && !p.listedForSale && !p.listedForLoan && !emNeg(p.id);
  const lista = (p: Player, campo: 'listedForSale' | 'listedForLoan') => { marcar(p.id, campo, true); novos++; listados++; };
  // jovem a rodar: emprestimo
  for (const p of elenco) {
    if (!pode()) break;
    const g = grupoDe(p.position), rank = porGrupo[g].findIndex(x => x.id === p.id);
    if (candidato(p) && p.age <= L.idadeJovem && rank > tit[g] && potencialParaValor(p) >= p.skill + L.margemJovem) lista(p, 'listedForLoan');
  }
  // sobra no grupo (os de menor OVR), veterano fora do time
  for (const g of ['GK', 'DEF', 'MID', 'ATT'] as Grupo[]) {
    const lst = porGrupo[g], sobra = lst.length - precisa[g] - L.sobraFolga;
    for (let k = 0; k < sobra && pode(); k++) {
      const p = lst[lst.length - 1 - k];
      if (candidato(p) && !(p.age <= L.idadeJovem && potencialParaValor(p) >= p.skill + L.margemJovem)) lista(p, 'listedForSale');
    }
    for (const p of lst) {
      if (!pode()) break;
      if (candidato(p) && p.age >= L.idadeVeterano && p.skill <= mediaTit[g] - L.abaixoVeterano) lista(p, 'listedForSale');
    }
  }
  // salario alto para quem nao joga
  const sal = elenco.map(p => p.salary || 0).sort((a, b) => a - b), mediana = sal[Math.floor(sal.length / 2)] || 0;
  for (const p of elenco) { if (!pode()) break; if (candidato(p) && mediana > 0 && (p.salary || 0) >= mediana * L.salarioFator) lista(p, 'listedForSale'); }
  // caixa negativo: o mais valioso que nao e titular
  if (t.cash < 0 && pode()) {
    const p = [...elenco].filter(candidato).sort((a, b) => valorDeMercado(b, hoje) - valorDeMercado(a, hoje))[0];
    if (p) lista(p, 'listedForSale');
  }
  // dispensa: listado ha muito tempo, veterano, sem negociacao e com elenco folgado
  for (const p of elencoDe(u, t.id)) {
    if (!p.listedForSale || !p.listadoEm || p.age < L.idadeVeterano || diasEntre(p.listadoEm, hoje) <= L.diasDispensa || emNeg(p.id)) continue;
    if (elencoDe(u, t.id).length <= L.elencoParaDispensar || !elencoValidoSem(elencoDe(u, t.id), p, cfg, formacaoDe(u, t.id))) continue;
    u = { ...u, players: u.players.map(x => (x.id === p.id ? { ...x, teamId: 'MARKET', listedForSale: false, listedForLoan: false, listadoEm: undefined, livreDesde: hoje } : x)),
      teams: u.teams.map(x => (x.id === t.id ? limparEscalacao(x, p.id) : x)),
      mercado: { ...u.mercado, historico: [...u.mercado.historico, { id: `mov-disp-${u.mercado.proximoNum}-${p.id}`, data: hoje, jogadorId: p.id, jogadorNome: p.name, de: t.id, para: 'MARKET', valor: 0, tipo: 'DISPENSA' as const }].slice(-cfg.maxTransacoes), proximoNum: u.mercado.proximoNum + 1 } };
  }
  return u;
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
  u.players.forEach(p => { if (p.teamId !== 'MARKET' && !p.emprestimo && (!p.contract || p.contract.end > hoje)) porGrupo[grupoDe(p.position)].push({ jogador: p, origem: 'ELENCO' }); });
  u.base?.jogadores.forEach(p => { if (p.age >= cfg.idadeMinimaBase) porGrupo[grupoDe(p.position)].push({ jogador: p, origem: 'BASE' }); });
  (Object.keys(porGrupo) as Grupo[]).forEach(g => porGrupo[g].sort((a, b) => b.jogador.skill - a.jogador.skill));
  const livres = u.players.filter(p => p.teamId === 'MARKET').sort((a, b) => b.skill - a.skill);
  const preContratos = u.players.filter(p => emPreContrato(p, hoje, cfg)).sort((a, b) => b.skill - a.skill);
  let novas = 0, preContratosHoje = 0;
  const janela = (t: Team) => janelaAberta(hoje, t.country, cfg);

  for (const t of hoje_) {
    const perfil = perfilDoClube(t.id, cfg);
    const elenco = elencoDe(u, t.id);
    const rnd = criarRng(`ia|${t.id}|${hoje}`);

    // 0. o tecnico confere a lista de venda: se os que ficam (os nao listados) nao cobrem o esquema e o banco em algum grupo, os melhores listados desse grupo saem da lista
    {
      const precisa = necessarioPorGrupo(formacaoDe(u, t.id));
      const atuais = elencoDe(u, t.id);
      for (const g of ['GK', 'DEF', 'MID', 'ATT'] as Grupo[]) {
        const fica = atuais.filter(x => grupoDe(x.position) === g && !x.listedForSale).length;
        const falta = precisa[g] - fica;
        if (falta <= 0) continue;
        const retirar = atuais.filter(x => grupoDe(x.position) === g && x.listedForSale).sort((x, y) => y.skill - x.skill).slice(0, falta).map(x => x.id);
        if (retirar.length) u = { ...u, players: u.players.map(x => (retirar.includes(x.id) ? { ...x, listedForSale: false, listadoEm: undefined } : x)) };
      }
    }
    // 0b. A LISTA ATIVA (cfg.ia.listaAtiva): sobra no grupo, veterano fora do time, salario alto, caixa negativo, jovem a rodar (emprestimo); quem virou titular sai
    u = listaAtiva(u, t, hoje, cfg);
    // 1. excedentes: elenco acima do maximo da IA lista os de menor valor nos grupos com sobra; quem esta listado ha muito tempo e dispensado (vira agente livre)
    if (elenco.length > cfg.ia.maxElenco) {
      const sobra = elenco.length - cfg.ia.maxElenco;
      const candidatos = [...elenco].filter(p => !p.listedForSale && !p.emprestimo).sort((a, b) => a.skill - b.skill);
      let marcados = 0, ficam = elenco.filter(p => !p.listedForSale);   // quem ja esta listado conta como saida
      for (const p of candidatos) {
        if (marcados >= sobra) break;
        if (elencoValidoSem(ficam, p, cfg, formacaoDe(u, t.id))) { ficam = ficam.filter(x => x.id !== p.id); u = { ...u, players: u.players.map(x => (x.id === p.id ? { ...x, listedForSale: true, listadoEm: hoje } : x)) }; marcados++; }
      }
    }
    for (const p of elencoDe(u, t.id)) {
      if (p.listedForSale && !p.emprestimo && p.listadoEm && diasEntre(p.listadoEm, hoje) > cfg.ia.diasParaDispensar && elencoDe(u, t.id).length > cfg.ia.maxElenco
        && !u.mercado.negociacoes.some(g => g.playerId === p.id && ESTADOS_ATIVOS.includes(g.estado)) && elencoValidoSem(elencoDe(u, t.id), p, cfg, formacaoDe(u, t.id))) {
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
      // 2a'. pre-contrato: um jogador de outro clube com menos de 6 meses de contrato, sem custo (o do utilizador com a mesma probabilidade das ofertas a ele)
      const pc = preContratos.find(p => grupoDe(p.position) === g.grupo && p.teamId !== t.id && emPreContrato(u.players.find(x => x.id === p.id) || p, hoje, cfg)
        && (u.players.find(x => x.id === p.id)?.teamId === p.teamId) && (g.falta > 0 || p.skill >= g.piorTitular + cfg.ia.margemUpgrade));
      if (pc && preContratosHoje < cfg.ia.maxPreContratosPorDia && (g.falta > 0 || rnd() < cfg.ia.probPreContrato) && (pc.teamId !== donoId || rnd() < cfg.ia.probOfertaAoHumano) && elencoDe(u, t.id).length < cfg.ia.maxElenco) {
        const r = contratarAgenteLivre(u, t.id, pc.id, hoje, cfg);
        if (r.ok) { u = r.u; preContratosHoje++; eventos.push(...r.eventos.filter(e => e.tipo === 'SAIDA_LIVRE')); }
      }
    }
    if (!janela(t)) continue;
    // 2b. propostas de compra (limitadas por clube e no dia)
    const ativas = u.mercado.negociacoes.filter(g => g.compradorId === t.id && ESTADOS_ATIVOS.includes(g.estado)).length;
    if (ativas >= cfg.ia.maxNegociacoesAtivasPorClube || novas >= cfg.ia.maxPropostasNovasPorDia) continue;
    // O LIMITE DE COMPRAS DA JANELA (ia.ambicao.comprasPorJanela, +1 em crise): contam as transferencias ja concluidas e as aceitas a espera de concluir.
    {
      const abriu = inicioDaJanela(hoje, t.country, cfg);
      const amb = ambicaoDoClube(u, t.id, cfg);
      const limite = cfg.ia.ambicao.comprasPorJanela[amb.perfil] + (amb.crise ? cfg.ia.ambicao.crise.compras : 0);
      const feitas = abriu ? u.mercado.historico.filter(m => m.tipo === 'TRANSFERENCIA' && m.para === t.id && m.data >= abriu).length : 0;
      const aceitas = u.mercado.negociacoes.filter(g => g.compradorId === t.id && g.estado === 'ACEITA').length;
      if (feitas + aceitas + ativas >= limite) continue;
    }
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
        // A 1a OFERTA pela ambicao do clube (ambicaoDoClube: 1.00x para o candidato ao titulo, 0.95x continental, 0.92x meio de tabela, x a personalidade), +-3%
        let oferta = arred(valor * ambicaoDoClube(u, t.id, cfg).primeira * (0.97 + rnd() * 0.06));
        // CLAUSULA barata (perto do que pagaria de bom grado) e que cabe no teto: paga-a e leva o jogador sem negociar
        const clausula = atual.origem === 'ELENCO' ? clausulaDe(atual.jogador) : 0;
        const pagaClausula = clausula > 0 && clausula <= teto && clausula <= valor * perfil.apetite * cfg.ia.clausulaAteApetite;
        if (pagaClausula) oferta = clausula;
        // BONUS por jogos: as vezes troca parte do valor a vista por bonus aos 10/15/20 jogos (o vendedor os conta a 60%: o total para ele fica igual). Sorteio proprio, para nao mexer no `rnd`.
        let bonus: BonusJogos[] | undefined;
        if (!pagaClausula && criarRng(`iabonus|${t.id}|${p.id}|${hoje}`)() < cfg.ia.probBonus) {
          const cada = arred(oferta * 0.06);
          if (cada > 0) { bonus = cfg.bonus.marcos.map(j => ({ jogos: j, valor: cada })); oferta = Math.max(1000, oferta - arred(cada * cfg.bonus.marcos.length * cfg.bonus.fatorAvaliacao)); }
        }
        const r = proporCompra(u, t.id, p.id, oferta, hoje, donoId, cfg, bonus);
        if (r.ok) { u = r.u; eventos.push(...r.eventos); novas++; feito = true; break; }
      }
    }
    // 2c. EMPRESTIMO: sem compra feita e com falta na posicao, pede emprestado um jogador LISTADO PARA EMPRESTIMO (de qualquer clube; o do utilizador com a chance das ofertas
    //     a ele x 4), as vezes com opcao de compra. Sorteio proprio (`iaemp|...`), para nao mexer na sequencia do `rnd` das compras.
    const abriuEmp = inicioDaJanela(hoje, t.country, cfg);
    const empJanela = abriuEmp ? u.mercado.historico.filter(m => m.tipo === 'EMPRESTIMO' && m.para === t.id && m.data >= abriuEmp).length : 0;
    if (!feito && novas < cfg.ia.maxPropostasNovasPorDia && empJanela < cfg.ia.listaAtiva.emprestimosPorJanela) {
      const re = criarRng(`iaemp|${t.id}|${hoje}`);
      // Com falta no grupo (ate 5 abaixo do pior titular) ou para a ROTACAO (ate 2 abaixo do pior titular): o jogador listado para emprestimo de outro clube.
      for (const g of prioridade.filter(x => x.falta > 0 || x.piorTitular > 0)) {
        const minEmp = g.falta > 0 ? Math.max(50, g.piorTitular - 5) : g.piorTitular - 2;
        const alvo = porGrupo[g.grupo].find(a => a.origem === 'ELENCO' && a.jogador.listedForLoan && a.jogador.teamId !== t.id && a.jogador.skill >= minEmp
          && u.players.find(x => x.id === a.jogador.id)?.teamId === a.jogador.teamId);
        if (!alvo) continue;
        const p = u.players.find(x => x.id === alvo.jogador.id)!;
        if (p.teamId === donoId && re() > cfg.ia.probOfertaAoHumano * 4) continue;
        if (u.mercado.negociacoes.some(x => x.playerId === p.id && x.compradorId === t.id && (ESTADOS_ATIVOS.includes(x.estado) || (x.estado === 'RECUSADA' && diasEntre(x.atualizada, hoje) < 30)))) continue;
        const restantes = p.contract ? Math.floor(diasEntre(hoje, p.contract.end) / 31) - 1 : 12;
        const meses = Math.min(12, restantes);
        if (meses < cfg.emprestimo.mesesMin) continue;
        const opcao = re() < cfg.ia.probOpcaoCompra ? arred(precoDesejado(u, p, p.teamId, hoje, undefined, cfg) * 1.05) : undefined;
        const r = proporEmprestimo(u, t.id, p.id, taxaDeEmprestimoDesejada(p, meses, hoje, cfg), meses, opcao, hoje, donoId, cfg);
        if (r.ok) { u = r.u; eventos.push(...r.eventos); novas++; break; }
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

// ------------------------------------------------------------------ o motivo para o jogador
/*
Os motivos (`motivo`, de falhas e recusas) sao gravados em portugues, sem acentos (os testes e o historico dependem deles). Para MOSTRAR, `textoDoMotivo` passa-os a
chave em ingles e ao idioma do jogo (tx). Um motivo que nao esteja aqui (ex.: o nome do clube no SAIDA_LIVRE) sai como veio.
*/
const MOTIVO_EN: Record<string, string> = {
  "jogador nao pertence a um clube": "player does not belong to a club",
  "clube desconhecido": "unknown club",
  "o jogador nao e agente livre": "the player is not a free agent",
  "o jogador ja e do clube": "the player already belongs to the club",
  "fora da janela de transferencias": "outside the transfer window",
  "valor invalido": "invalid amount",
  "recusada pelo vendedor": "refused by the seller",
  "proposta final insuficiente": "final offer too low",
  "prazo": "deadline passed",
  "oferta muito baixa": "offer too low",
  "o jogador ja nao esta no vendedor": "the player is no longer at the selling club",
  "o elenco ficaria sem o minimo": "the squad would fall below the minimum",
  "negociacao nao esta ativa": "the negotiation is not active",
  "nao ha oferta para responder": "there is no offer to answer",
  "nao ha contraproposta para responder": "there is no counter-offer to answer",
  "limite de propostas atingido": "offer limit reached",
  "jogador transferido": "player transferred",
  "jogador indisponivel": "player unavailable",
  "jogador contratado": "player signed",
  "ha uma negociacao em curso por este jogador": "there is an ongoing negotiation for this player",
  "contraproposta recusada": "counter-offer refused",
  "contraproposta acima do que o comprador paga": "counter-offer above what the buyer will pay",
  "a contraproposta tem de ser maior que a oferta": "the counter-offer must be higher than the offer",
  "saldo insuficiente": "insufficient cash",
  "orcamento de transferencias insuficiente": "insufficient transfer budget",
  "o jogador ja nao pertence ao vendedor": "the player no longer belongs to the seller",
  "o elenco do vendedor ficaria sem o minimo": "the seller's squad would fall below the minimum",
  "o elenco do clube atual ficaria sem o minimo": "the current club's squad would fall below the minimum",
  "negociacao inexistente": "negotiation not found",
  "jogador nao encontrado": "player not found",
  "ja existe uma negociacao ativa por este jogador": "there is already an active negotiation for this player",
  "ja contabilizada": "already recorded",
  "ja concluida": "already completed",
  "elenco do comprador cheio": "the buyer's squad is full",
  "elenco cheio": "squad full",
  "contrato vencido": "contract expired",
  "contrato a acabar (menos de 6 meses): assina sem custo": "contract ending (under 6 months): he signs for free",
  "agente livre: contrate-o sem taxa": "free agent: sign him with no fee",
  "a negociacao nao foi aceita": "the negotiation was not accepted",
  "jogador emprestado": "the player is on loan",
  "o jogador nao tem clausula de rescisao": "the player has no release clause",
  "clausula de rescisao paga": "release clause paid",
  "so jogadores do elenco profissional podem ser emprestados": "only first-team players can be loaned",
  "duracao de emprestimo invalida": "invalid loan length",
  "o contrato acaba antes do fim do emprestimo": "the contract ends before the loan would",
  "o clube nao empresta titulares": "the club does not loan out starters",
  "opcao de compra abaixo do preco do jogador": "purchase option below the player's price",
  "o jogador nao esta emprestado": "the player is not on loan",
  "o emprestimo nao tem opcao de compra": "the loan has no purchase option",
  "sem clube": "no club"
};
export const textoDoMotivo = (m: string | undefined | null): string => {
  if (!m) return '';
  if (MOTIVO_EN[m]) return tx(MOTIVO_EN[m]);
  let r = m.match(/^elenco cheio \(maximo de (\d+) jogadores\)$/);
  if (r) return tx('squad full (maximum {v0} players)', { v0: r[1] });
  r = m.match(/^so jogadores do Sub-20 com (\d+) anos ou mais$/);
  if (r) return tx('only Sub-20 players aged {v0} or over', { v0: r[1] });
  return m;
};
