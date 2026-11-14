import React, { createContext, useContext, useState, useRef, useEffect, useMemo } from 'react';
import { assetUrl } from '../textSim/assetUrl';
import { Team, Player, Contract, Fixture, GameState, CalendarActivity, ActivityType, ThemeMode, MatchEvent, Language, Currency, WageFrequency, Position, MatchDuration, MatchVisualState, MatchMode, naLigaDoUtilizador, PontoFinanceiro, REEMBOLSO_ATIVIDADE } from '../types';
import { generateLeagueData, generateFixtures, COUNTRIES, faixaDoClube, nivelDaBaseDoClube, ehLigaEuropeia } from '../textSim/dataGenerator';
import { gruposDaSerieD, arquivarCampeoes, HistoricoDeCopas } from '../textSim/competitions';
import { espacarCalendario, comDatasDeCopa } from '../textSim/calendario';
import { WorldLeague, WorldResults, createWorld, simulateWorldTo, worldResults, buildTable } from '../textSim/world';
import { Competition, DisputaPendente, DecisaoDoJogo, decisaoDoConfronto, disputaPendente, prepararCopas, ligaIdDoClube, teamKey, ehDoPaulista, noAno, ANO_BASE } from '../textSim/competitions';
import { calcularVirada, aplicarDivisoes, divisoesAtuais, paisDaLiga, Divisoes } from '../textSim/virada';
import { BaseState, garantirBase, processarBase, definirNivelDaBase, promoverJovem, dispensarJovem as dispensarJovemDaBase } from '../textSim/youth';
import { novoContrato, processarContratos, renovarContrato, estadoDoContrato, garantirClausulas } from '../textSim/contracts';
import { PerfilDeCredito, receitaAnualEstimada, dividaTotal, contratarEmprestimo, processarParcelas, quitarEmprestimo, type MotivoCredito } from '../textSim/emprestimoBancario';
import { fimDoClube, fimDaLiga } from '../textSim/contratoRegiao';
import { MensagemInbox, adicionar, chavesDe, avisoDePremiacao, avisosDoDia, boasVindas, avisoDeContratacao, avisoDeVenda, avisoDeRenovacao, avisoDePromocao, avisoDeLiberados, avisoDeSaidaDaBase, avisoDeNegociacaoIniciada, avisoDeRespostaRenovacao, avisoDeTransferencia, avisoDeDemissao, avisoDeOferta, avisoDeFaixa, avisoDeParcelaPatrocinio, avisoDeFimPatrocinio, avisoDeBonusPatrocinio, avisoDeEvolucao, avisoDeEmprestimoBancario } from '../textSim/inbox';
import { salarioDeMercadoDaLiga, ajustarSalariosDaBase } from '../textSim/salarios';
import { aplicarDivisao, aplicarDificuldade, dificuldadeEscolhida, folhaAnual, PADRAO_COMPRAS } from '../textSim/orcamento';
import { PATROCINADORES, criarContrato, avaliarProposta, pagarParcelas, reputacaoDoClube, bonusDeCompeticao, diasParaFim, JANELA_RENOVACAO_DIAS, type MotivoRecusa } from '../textSim/patrocinadores';
import { ManagerState, semearTreinadores, atualizarTreinadores, aplicarTreinadores, registrosDosEventos, registrarNoDiario, declinarOferta } from '../textSim/managerExpectations';
import { montarLigas } from '../textSim/managerLigas';
import { regiaoDoClube } from '../textSim/dataGenerator';
import { MercadoState, Universo, Evento, mercadoVazio, prepararOrcamentos, proporCompra as mercadoPropor, responderComoVendedor, responderComoComprador, retirar as mercadoRetirar, concluir as mercadoConcluir,
  contratarAgenteLivre as mercadoContratarLivre, listarParaVenda as mercadoListar, listarParaEmprestimo as mercadoListarEmprestimo, dispensarJogador as mercadoDispensar, tickDoDia as mercadoTick, recalcularValoresDoMes, janelaAberta, proximaAberturaJanela,
  proporEmprestimo as mercadoProporEmprestimo, pagarClausula as mercadoPagarClausula, exercerOpcao as mercadoExercerOpcao, registrarJogosDosBonus, type BonusJogos } from '../textSim/transferencias';
import { recalcularValores } from '../textSim/valuation';
import { registrarLigas, escalaDaLiga } from '../textSim/economia';
import { Negociacao, Oferta, abrirNegociacao, assinar, chanceDeAceitar, propostaDoJogador, resolverNegociacoes } from '../textSim/negociacao';
import { rotuloDaFase } from '../textSim/competitions';
import { slotsVazios, jogoEmAndamento, completarEscalacaoCpu } from '../textSim/escalacao';
import { DISTRIBUICAO, nomeGenerico, escudoUrl } from '../textSim/distribuicao';
import { REAL_PLAYERS_JSON } from '../textSim/realDatabase';
import { jogadorLocalPorId } from '../textSim/dadosLocais';
import { boletimSemanal, severidadeDaLesao, variacaoDiariaDeFis, garantirMedico, gerarMedico } from '../textSim/medico';
import { aplicarSuspensoes, chaveCompeticao, corrigirEscalacao, estaSuspenso } from '../textSim/suspensoes';
import { simulateMatch, manageCPUTeam, getTeamRatings, generateMatchDeck, calculateMatchRatings, DECK_SLOTS, getStoppageTime, getHalfTimeMinute, getMatchEndMinute, matchFatiguePerMinute } from '../textSim/matchEngine';
import { ACTIVITIES, cpuPlanoDoJogador, SLOTS_CPU_LEVE, cpuAplicarTreino, MINUTOS_POR_PONTO_CHE, XP_POR_PONTO, ENERGY_COST_BASE, ENERGIA_POR_PERIODO_LIVRE, ENERGIA_SLOT_VAZIO, drainMultiplier, recoveryMultiplier, energiaPosLesao, energiaInicial, definirNivelDoCt, tetoDoLegacy, garantirBaseLegacy, SLOTS_CPU_POR_DIA, rolouLesaoTreino, grupoPorEnergia, sessaoRolaLesao, exaustaoMultiplier, STAR_MULTIPLIERS, starsFromPotential, tacBonusDaNota } from '../textSim/trainingService';
import { campo3d, atributos3d, NOME_DO_CAMPO, regredirPorIdade, migrarTreinoParaXp, atributosIndividuais, alternarIndividual, treinoDoMes } from '../textSim/atributos3d';
import { GRUPOS } from '../textSim/geradorAtributos';
import { TAXAS, definirTaxas, restaurarTaxas, EVENTO_CAMBIO, type MoedaCambio } from '../textSim/cambio';
import { premiosPendentes, premioDaLiga, premioDeInicioDeLiga, NOME_DA_COPA } from '../textSim/premiacao';
import { settleMatch, applyResult, ECONOMIA_ESTADIO, type CurrencyCode } from '../textSim/stadiumEconomy';
import { REAL_TEAMS_JSON } from '../textSim/realDatabase';
import { montarPayload, jogarOculto, aplicarResultado, eventosDoManager, notasDoMotor, ordemDaPosicao } from '../3dMatch/simulador3dCliente';
import { simulador3dEnviar, simulador3dInstantaneo, simulador3dDescartar } from '../3dMatch/Simulador3DView';
import { avisoDoGoleiro, aplicarTrocaDo3d } from '../3dMatch/avisoGoleiro';
import { traduzir, idiomaValido, definirIdiomaAtual, tx, localeDoIdioma } from '../textSim/idiomas';


interface GameContextType {
  managerState: ManagerState | null;
  /** O utilizador recusa uma oferta de emprego pendente (aba Manager). */
  recusarOferta: (id: string) => void;
  teams: Team[];
  players: Player[];
  fixtures: Fixture[];
  gameState: GameState;
  startGame: (teamId: string, managerName: string, countryId: string, leagueId?: string, continuacao?: { teams: Team[]; players: Player[]; ano: number }, managerLook?: any) => void;
  advanceDay: () => void;
  /** NEXT GAME: passa os dias (5 s por dia) ate ao proximo jogo do utilizador; para num e-mail de resposta de negociacao. */
  proximoJogo: { date: string; adversario: string; dias: number } | null;
  /** O jogo do utilizador por jogar hoje (no dia do jogo nao se avanca o dia). */
  jogoHoje: boolean;
  autoAvancoAtivo: boolean;
  autoAvancoMotivo: string;
  iniciarProximoJogo: () => void;
  pararProximoJogo: (motivo?: string) => void;
  advanceWeek: () => void;
  playMatchDay: (modo?: any) => void; // 'VISUAL' = 3D ao vivo (MatchDay); qualquer outra coisa = narrado (MatchRoundView)
  pauseMatch: () => void;
  resetMatchDay: () => void; // RESET do MatchDay: volta ao minuto 0, sem eventos, para os times entrarem em campo outra vez
  finishMatchDayInstant: () => void;
  motor3dMensagem: (m: any) => void; // mensagens do iframe 3D visivel (modo 3D)
  avisoGoleiroMensagem: (m: any) => void; // liga/desliga o aviso a partir de uma mensagem do 3D (chamar antes de abrir o Tactics)
  avisoLesao: string[]; // nomes dos jogadores do utilizador que estao 'sentindo uma lesao' no jogo (aviso no card de estatisticas do MatchDay, ate abrir o Tactics)
  limparAvisoLesao: () => void;
  avisoGoleiro: boolean; // o goleiro do utilizador foi expulso e o time ainda esta sem goleiro (aviso no TacticsView)
  motor3dProgresso: number | null; // minutos ja simulados pelo motor 3D (null = parado)
  updateTactics: (teamId: string, tactics: Partial<Team['tactics']>, lineup?: string[], bench?: string[]) => void;
  updateSetPieceTakers: (teamId: string, takers: Team['setPieceTakers']) => void;
  updateTeamLogo: (teamId: string, logoUrl: string) => void;
  hirePlayer: (player: Player) => void;
  /** Sub-20 de todos os clubes (null ate o motor gerar). */
  base: BaseState | null;
  inbox: MensagemInbox[];
  markInboxRead: (ids: string[]) => void;
  markAllInboxRead: () => void;
  deleteInbox: (ids: string[]) => void;
  promoteYouth: (playerId: string) => boolean;
  dispensarJovem: (playerId: string) => boolean;
  /** Negociacoes de renovacao em andamento. */
  negociacoes: Negociacao[];
  /** Faz a oferta de renovacao: aceitar a proposta do jogador assina na hora; mudar o salario ou os anos abre uma negociacao de 2-3 dias. */
  proporRenovacao: (playerId: string, oferta: Oferta) => 'ASSINADO' | 'EM_ANALISE' | 'BLOQUEADO';
  /** Proposta de patrocinio principal (Finance > Sponsors): aceita pela reputacao do clube; na janela dos 60 dias finais vira renovacao (comeca no fim do contrato atual). */
  proporPatrocinio: (sponsorId: string, anos: number) => { ok: true; renovacao: boolean } | { ok: false; motivo: MotivoRecusa };
  /** Reputacao 0-100 do clube do utilizador (fanBase, tradicao e forca). */
  reputacaoClube: number;
  /** Divide o orcamento da temporada entre compras e salarios: `compras` de 0 a 1 em passos de 10% (padrao 0.8). */
  definirDivisaoOrcamento: (compras: number) => void;
  /** O mercado de transferencias: estado (negociacoes, transacoes, historico) e as acoes do treinador. Cada acao devolve { ok, motivo }. */
  mercado: MercadoState;
  /** Proposta de compra; `bonus`: os bonus ao vendedor aos 10/15/20 jogos pelo clube do utilizador (opcional). */
  proporCompraMercado: (playerId: string, valor: number, bonus?: BonusJogos[]) => { ok: boolean; motivo?: string };
  /** Pedido de emprestimo: taxa (pode ser 0), meses e, se quiser, o preco da opcao de compra no fim. */
  proporEmprestimoMercado: (playerId: string, taxa: number, meses: number, opcaoCompra?: number) => { ok: boolean; motivo?: string };
  /** Paga a clausula de rescisao do jogador (o clube dele nao pode recusar). */
  pagarClausulaMercado: (playerId: string) => { ok: boolean; motivo?: string };
  /** Exerce a opcao de compra de um jogador emprestado ao clube do utilizador. */
  exercerOpcaoCompra: (playerId: string) => { ok: boolean; motivo?: string };
  /** O perfil de credito do clube do utilizador (reputacao, liga, receita estimada, divida, caixa) para a aba Finance > Bank; null sem clube. */
  perfilDeCredito: PerfilDeCredito | null;
  /** Contrata um emprestimo bancario: o dinheiro entra no caixa hoje; parcelas mensais. */
  contratarEmprestimoBancario: (valor: number, meses: number) => { ok: true } | { ok: false; motivo: MotivoCredito | 'SEM_CLUBE' };
  /** Quita antecipadamente um emprestimo (saldo + 1% de tarifa). */
  quitarEmprestimoBancario: (id: string) => { ok: true; valor: number } | { ok: false; motivo: 'INEXISTENTE' | 'SEM_CAIXA' | 'SEM_CLUBE' };
  responderNegociacao: (negId: string, acao: 'ACEITAR' | 'RECUSAR' | 'CONTRA' | 'NOVA_OFERTA', valor?: number) => { ok: boolean; motivo?: string };
  retirarProposta: (negId: string) => { ok: boolean; motivo?: string };
  tentarConcluir: (negId: string) => { ok: boolean; motivo?: string };
  contratarLivre: (playerId: string) => { ok: boolean; motivo?: string };
  listarParaVenda: (playerId: string, listar: boolean) => { ok: boolean; motivo?: string };
  listarParaEmprestimo: (playerId: string, listar: boolean) => { ok: boolean; motivo?: string };
  dispensarJogador: (playerId: string) => { ok: boolean; motivo?: string };
  sellPlayer: (playerId: string) => void;
  swapShirtNumbers: (playerId1: string, playerId2: string) => void;
  /** O confronto de copa do utilizador que espera a disputa de penaltis (ver PenaltyShootoutModal), ou null. */
  disputaDePenaltis: DisputaPendente | null;
  /** Grava o resultado da disputa (penaltis marcados pela casa e pelo fora) no jogo que decide o confronto. */
  registrarPenaltis: (compId: string, matchId: string, pens: [number, number]) => void;
  /** O que o 3D precisa saber do jogo de hoje do utilizador: se fecha um confronto de copa e o agregado anterior (ver decisaoDoConfronto). */
  decisaoDoJogoDeHoje: () => DecisaoDoJogo | null;
  /** O 3D acabou a disputa de penaltis do jogo de hoje: guarda `pens` para gravar quando o confronto aparecer nas copas. */
  guardarPenaltis3d: (fixtureId: string, pens: [number, number]) => void;
  /** Guarda a ordem dos batedores de penalti de um time (ver PenaltyOrderView). */
  definirOrdemPenaltis: (teamId: string, ordem: string[]) => void;
  scheduleActivity: (date: string, type: ActivityType, details: any) => void;
  setTrainingSchedules: (schedules: (string | null)[][][]) => void;
  /** Marca/desmarca um atributo do treino individual do jogador (ver alternarIndividual, atributos3d.ts). */
  alternarTreinoIndividual: (playerId: string, campo: string) => void;
  unlockTrainingGroup: () => void;
  updatePlayerTrainingGroup: (playerId: string, groupId: number) => void;
  /** Grupos de treino automaticos pela ENR (GameState.trainingAutoGrupos): grava a configuracao e reagrupa o elenco ja. */
  setTrainingAutoGrupos: (cfg: { ativo: boolean; limiares: number[] }) => void;
  saveGame: () => Promise<void>;
  importGameData: (jsonString: string) => boolean;
  /** Sobe a cada save carregado: serve de `key` para remontar as telas com estado proprio (MatchDay). */
  loadId: number;
  currentFixtures: Fixture[];
  userTeam: Team | undefined;
  /** As outras ligas (aba WORLD); null ate a aba se abrir pela primeira vez. A liga do utilizador nao esta aqui: vive em `teams`/`fixtures`. */
  world: WorldLeague[] | null;
  /** Libertadores, Sul-Americana e Copa do Brasil (aba WORLD COMPETITIONS); null ate a aba abrir. */
  comps: Competition[] | null;
  /** Campeoes e vice-campeoes de cada copa, temporada a temporada (guardado no save). */
  historicoCopas: HistoricoDeCopas;
  openWorld: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  updateSettings: (settings: Partial<Pick<GameState, 'language' | 'currency' | 'wageFrequency' | 'themeMode' | 'matchDuration' | 'simulationSpeed' | 'graphicsQuality' | 'cameraTvMin' | 'cameraTvMax'>>) => void;
  isTransferWindowOpen: () => boolean;
  /** As taxas de cambio (unidades por dolar) e como as mudar/restaurar (Settings). */
  taxasDeCambio: Record<MoedaCambio, number>;
  atualizarTaxas: (novas: Partial<Record<MoedaCambio, number>> | 'padrao') => void;
  formatCurrency: (value: number) => string;
  formatCurrencyShort: (value: number) => string;
  formatWage: (weeklyValue: number) => string;
  reportLiveGoal: (fixtureId: string, side: 'home' | 'away', scorerId?: string) => void;
  reportMatchEvent: (fixtureId: string, event: Partial<MatchEvent>) => void;
  t: (key: string, vars?: Record<string, string | number>) => any;
  updateMatchVisualState: (visual: Partial<MatchVisualState>) => void;
  registrarFinanceiro: (teamId: string, ponto: PontoFinanceiro) => void;
}

// Os ids dos jogadores da base real (`p-<idPlayer>`): so estes tem o nome trocado ao carregar um save.
let _idsReais: Set<string> | null = null;
const idsDeJogadoresReais = (): Set<string> => {
  if (!_idsReais) _idsReais = new Set((REAL_PLAYERS_JSON as any[]).filter(p => p.idPlayer).map(p => `p-${p.idPlayer}`));
  return _idsReais;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

/**
 * Uma partida conta para a tabela e para as estatísticas da temporada?
 * Amistosos e jogos de copa não somam pontos nem entram na artilharia do
 * campeonato. Lesões e desgaste continuam valendo — esses acontecem de verdade.
 */
/** As divisoes de antes de qualquer virada: um jogo novo comeca sempre daqui. */
const DIVISOES_ORIGINAIS: Divisoes = divisoesAtuais();

export const countsForLeague = (f: Fixture): boolean =>
  !f.isFriendly && (f.type === undefined || f.type === 'LEAGUE');

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  // O goleiro do utilizador foi expulso (mensagem `expulsao` com `goleiro`): o aviso vive aqui e nao no MatchDay, que desmonta quando o Tactics abre.
  const [avisoGoleiro, setAvisoGoleiro] = useState(false);
  const [avisoLesao, setAvisoLesao] = useState<string[]>([]);
  const limparAvisoLesao = () => setAvisoLesao(prev => (prev.length ? [] : prev));
  const [players, setPlayers] = useState<Player[]>([]);
  const [world, setWorld] = useState<WorldLeague[] | null>(null);
  const [anoTemporada, setAnoTemporada] = useState(ANO_BASE);   // o ano em que a temporada de agora comecou (a virada acontece em 1 de janeiro do seguinte)
  // MERCADO DE TREINADORES (textSim/managerExpectations.ts): null ate o mundo existir (um save antigo, sem `managers`, e semeado no primeiro efeito).
  const [managerState, setManagerState] = useState<ManagerState | null>(null);
  const recusarOferta = (id: string) => setManagerState(prev => (prev ? declinarOferta(prev, id) : prev));
  const [comps, setComps] = useState<Competition[] | null>(null);
  const [historicoCopas, setHistoricoCopas] = useState<HistoricoDeCopas>({});
  // As categorias de base (Sub-20) de todos os clubes: lista a parte (mesmo tipo `Player`), para nao entrar nas contas do elenco, da folha e do motor de partidas.
  const [base, setBase] = useState<BaseState | null>(null);
  // A caixa de entrada (Inbox): e-mails de boas-vindas e avisos de todos os setores (textSim/inbox.ts). Vai no save.
  const [inbox, setInbox] = useState<MensagemInbox[]>([]);
  // Sobe a cada save carregado (tela inicial OU LOAD GAME): os efeitos que dependem so de ids e datas (tabela, orcamentos, valores, base, contratos, avisos do dia, mercado) voltam a correr,
  // senao carregar um save por cima de um jogo aberto deixava-os com o estado do jogo anterior.
  const [loadId, setLoadId] = useState(0);
  /*
  AS CHAVES DE E-MAIL JA EMITIDAS (vao no save). O inbox so guardava as mensagens: apagar uma (ou a limpeza das lidas mais antigas) tirava a chave dela e o motor, que so cria o que ainda nao existe,
  voltava a cria-la — nao lida — a cada carregamento (as boas-vindas, os avisos de contrato...). Agora uma chave emitida nunca volta a gerar mensagem.
  */
  const [inboxVistas, setInboxVistas] = useState<string[]>([]);
  const vistasRef = useRef<Set<string>>(new Set());
  // Negociacoes de renovacao em andamento (o jogador responde em 2 ou 3 dias; textSim/negociacao.ts). Vai no save.
  const [negociacoes, setNegociacoes] = useState<Negociacao[]>([]);
  // O MERCADO DE TRANSFERENCIAS (textSim/transferencias.ts): negociacoes entre clubes, registro financeiro e historico. Vai no save.
  const [mercado, setMercado] = useState<MercadoState>(() => mercadoVazio(''));
  const [diaMercado, setDiaMercado] = useState('');
  const compsSaved = useRef<Competition[] | null>(null);
  const worldSaved = useRef<WorldResults | null>(null);   // resultados vindos de um save, para repor ao criar o mundo
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [gameState, setGameState] = useState<GameState>(() => {
    const lido = localStorage.getItem('fm_lang');
    const savedLang: Language | null = idiomaValido(lido) ? lido : null;
    // A qualidade grafica e do computador, nao do save (como o idioma): a ultima escolhida em Settings; sem nenhuma, MEDIUM.
    const qLida = localStorage.getItem('fm_graphics');
    const savedQualidade: 'HIGH' | 'MEDIUM' | 'LOW' = (qLida === 'HIGH' || qLida === 'MEDIUM' || qLida === 'LOW') ? qLida : 'MEDIUM';
    return {
      currentWeek: 1,
      totalWeeks: 0,
      currentDate: '2026-01-01',
      userTeamId: null,
      managerName: '',
      isProcessing: false,
      matchMinute: 0,
      matchDuration: 10,
      graphicsQuality: savedQualidade,
      view: 'DASHBOARD',
      activities: [],
      themeMode: 'DARK',
      language: savedLang || 'EN',
      currency: 'USD',
      wageFrequency: 'WEEKLY',
      matchMode: 'NONE',
      trainingSchedule: Array(7).fill(null).map(() => Array(4).fill(null)),
      trainingSchedules: [
        Array(7).fill(null).map(() => Array(4).fill(null)),
        Array(7).fill(null).map(() => Array(4).fill(null)),
        Array(7).fill(null).map(() => Array(4).fill(null))
      ],
      unlockedTrainingGroups: 1
    };
  });

  const matchResultsCache = useRef<Fixture[]>([]);
  // O jogo do utilizador e decidido pelo motor 3D (3dMatch/simulador3d): fixtureId -> fixture completo, que os ticks vao revelando.
  const motor3dRes = useRef<Record<string, Fixture>>({});
  const liquidadosRef = useRef<Set<string>>(new Set());   // jogos com renda/custo de estadio ja liquidados (nao conta duas vezes, nem com o React em modo dev)
  const [motor3dProgresso, setMotor3dProgresso] = useState<number | null>(null);
  const matchTimerRef = useRef<any>(null);
  const simulationSpeedRef = useRef<number>(1);
  const maxDurationRef = useRef<number>(90);
  const maxHTDurationRef = useRef<number>(45);

  useEffect(() => {
    simulationSpeedRef.current = gameState.simulationSpeed || 1;
  }, [gameState.simulationSpeed]);

  // Declarative Standings Calculator
  // Tabulates points any time fixtures are updated, guaranteeing mathematical accuracy
  useEffect(() => {
    setTeams(prevTeams => {
      if (prevTeams.length === 0) return prevTeams;

      const teamsMap = new Map<string, Team>(prevTeams.map(t => [
        t.id,
        { ...t, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }
      ]));

      // Só partidas oficiais de liga entram na tabela. Amistosos (e copas)
      // estavam somando pontos, vitórias e saldo de gols no Brasileirão.
      fixtures.filter(fn => fn.played && countsForLeague(fn)).forEach(fn => {
        const h = teamsMap.get(fn.homeTeamId);
        const a = teamsMap.get(fn.awayTeamId);
        if (!h || !a) return;

        const hs = fn.homeScore || 0;
        const as = fn.awayScore || 0;

        h.played++; a.played++;
        h.goalsFor += hs; h.goalsAgainst += as;
        a.goalsFor += as; a.goalsAgainst += hs;

        if (hs > as) { h.won++; h.points += 3; a.lost++; }
        else if (as > hs) { a.won++; a.points += 3; h.lost++; }
        else { h.drawn++; a.drawn++; h.points += 1; a.points += 1; }
      });

      const newTeams = Array.from(teamsMap.values());

      // Check if anything actually changed to avoid infinite render loops
      let changed = false;
      for (let i = 0; i < prevTeams.length; i++) {
        const pt = prevTeams[i];
        const nt = teamsMap.get(pt.id);
        if (!nt) continue;
        if (pt.played !== nt.played || pt.points !== nt.points || pt.goalsFor !== nt.goalsFor) {
          changed = true;
          break;
        }
      }

      return changed ? newTeams : prevTeams;
    });
  }, [fixtures, loadId]);

  const userTeam = teams.find(t => t.id === gameState.userTeamId);

  // O MUNDO (aba WORLD COMPETITIONS): as outras ligas e as copas. Cria-se no arranque do jogo (ou ao carregar um save) e avanca com a data (textSim/world.ts, textSim/competitions.ts).
  // Os jogos de copa do utilizador entram nas `fixtures` (tipo CUP) sem coincidir com outros jogos dos clubes, e os adversarios entram em `teams`/`players`.
  const openWorld = () => {
    if (world || !userTeam) return;   // normalmente ja existe (startGame / importGameData)
    const w = createWorld(ligaIdDoClube(userTeam), gameState.currentDate, worldSaved.current, anoTemporada, ehLigaEuropeia(ligaIdDoClube(userTeam)) ? anoTemporada : anoTemporada - 1);
    const r = prepararCopas({ world: w, userTeamId: userTeam.id, teams, players, fixtures, date: gameState.currentDate, comps: compsSaved.current });
    worldSaved.current = null; compsSaved.current = null;
    setWorld(w);
    if (r) {
      setComps(r.comps);
      if (r.fixtures.length) setFixtures(prev => [...prev, ...r.fixtures].sort((a, b) => a.date.localeCompare(b.date)));
      if (r.teams.length) setTeams(prev => [...prev, ...r.teams]);
      if (r.players.length) setPlayers(prev => [...prev, ...r.players]);
    }
  };
  // O ESPACO ENTRE OS JOGOS (textSim/calendario.ts): nenhum clube joga com menos de 2 dias livres entre dois jogos. Corre sempre que o calendario muda (novo jogo, copas que entram) e depois de
  // carregar um save (`loadId`): adianta ou atrasa o jogo mais flexivel (copa, amistoso) e leva a data nova tambem a competicao.
  useEffect(() => {
    if (!fixtures.length || !gameState.userTeamId) return;
    const r = espacarCalendario(fixtures, gameState.currentDate);
    if (!r.mudancas.length) return;
    setFixtures(r.fixtures);
    setComps(prev => comDatasDeCopa(prev, r.mudancas));
  }, [fixtures, loadId, gameState.currentDate, gameState.userTeamId]);
  // O HISTORICO DE CAMPEOES: cada copa que acaba (campeao e vice) fica arquivada antes de a temporada seguinte as substituir.
  useEffect(() => {
    if (!comps || !world) return;
    const nomeDe = (k: string) => { const [lid, id] = k.split('|'); return world.find(l => l.leagueId === lid)?.teams.find(t => t.id === id)?.name || teams.find(t => t.id === id)?.name || id; };
    setHistoricoCopas(h => arquivarCampeoes(h, comps, nomeDe));
  }, [comps]);
  const cupSig = fixtures.reduce((n, f) => n + (f.type === 'CUP' && f.played ? 1 : 0), 0);   // muda quando um jogo de copa do utilizador acaba
  useEffect(() => {
    if (!world) return;
    setWorld(prev => (prev ? simulateWorldTo(prev, gameState.currentDate) : prev));
    if (!comps || !userTeam) return;
    const r = prepararCopas({ world, userTeamId: userTeam.id, teams, players, fixtures, date: gameState.currentDate, comps });
    if (!r) return;
    if (r.mudouComps) setComps(r.comps);
    if (r.fixtures.length) setFixtures(prev => [...prev, ...r.fixtures].sort((a, b) => a.date.localeCompare(b.date)));
    if (r.teams.length) setTeams(prev => [...prev, ...r.teams]);
    if (r.players.length) setPlayers(prev => [...prev, ...r.players]);
  }, [gameState.currentDate, cupSig, world, comps, userTeam?.id]);

  // PREMIACAO DAS COPAS (textSim/premiacao.ts): o dinheiro vai para o caixa do clube do utilizador quando ganha cada fase; o e-mail do inbox leva a chave do pagamento (nao paga duas vezes).
  const premiosPagos = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!comps || !userTeam) return;
    const uk = teamKey(ligaIdDoClube(userTeam), userTeam.id);
    const ja = new Set<string>([...chavesDe(inbox), ...vistasRef.current, ...premiosPagos.current]);
    const pend = premiosPendentes(comps, uk, ja);
    if (!pend.length) return;
    pend.forEach(p => premiosPagos.current.add(p.key));
    const total = pend.reduce((s, p) => s + p.usd, 0);
    setTeams(prev => prev.map(t => t.id === userTeam.id ? { ...t, cash: t.cash + total } : t));
    setInbox(prev => adicionar(prev, pend.map(p => avisoDePremiacao(p.data, gameState.language, p.key, NOME_DA_COPA[p.copa] || p.copa, p.razao, formatCurrency(p.usd)))));
    pagarBonusPatrocinio(pend);
  }, [comps]);

  // PATROCINIO PRINCIPAL (textSim/patrocinadores.ts): reputacao do clube, proposta, parcelas mensais no caixa e fim do contrato (tudo por data).
  const reputacaoClube = useMemo(() => (userTeam ? reputacaoDoClube(userTeam, teams) : 0), [userTeam?.id, userTeam?.fanBase, userTeam?.strength, teams.length]);
  const proporPatrocinio = (sponsorId: string, anos: number): { ok: true; renovacao: boolean } | { ok: false; motivo: MotivoRecusa } => {
    const p = PATROCINADORES.find(x => x.id === sponsorId);
    if (!userTeam || !p) return { ok: false, motivo: 'REPUTACAO' };
    const hoje = gameState.currentDate;
    const r = avaliarProposta(reputacaoClube, p, userTeam.sponsorContract, userTeam.sponsorNext, anos, hoje);
    if (!r.ok) return r;
    const novo = criarContrato(p, anos, r.renovacao ? userTeam.sponsorContract!.fim : hoje, escalaDaLiga(userTeam.leagueId));
    setTeams(prev => prev.map(t => t.id === userTeam.id ? (r.renovacao ? { ...t, sponsorNext: novo } : aplicarDivisao({ ...t, sponsorContract: novo }, t.transferPct ?? PADRAO_COMPRAS, folhaDoClube(t.id))) : t));
    return r;
  };
  const folhaDoClube = (teamId: string) => folhaAnual(players.filter(p => p.teamId === teamId).map(p => p.salary));

  /*
  EMPRESTIMO BANCARIO (textSim/emprestimoBancario.ts; pedido: "implementar o emprestimo bancario, coloca la no financial"). O perfil de credito sai do clube: reputacao (a mesma
  dos patrocinadores), porte da liga, receita anual estimada (patrocinio + bilheteria liquida de uma temporada de jogos em casa; piso de metade da folha), divida e caixa.
  As parcelas vencem uma vez por mes (cada mes novo do calendario), como as do patrocinio, e cada uma gera um e-mail do Finance Director.
  */
  const perfilDeCredito = useMemo((): PerfilDeCredito | null => {
    if (!userTeam) return null;
    const eco = settleMatch(userTeam, userTeam, { id: '', week: 0, date: '', homeTeamId: userTeam.id, awayTeamId: '', homeScore: 0, awayScore: 0 } as any, gameState.currency as CurrencyCode);
    const jogosEmCasa = fixtures.filter(f => f.homeTeamId === userTeam.id && !f.isFriendly).length || 19;
    const receitaAnual = receitaAnualEstimada({ patrocinioAnual: userTeam.sponsorContract?.valorAnualUSD || 0, rendaPorJogo: Math.max(0, eco.revenueUSD - eco.costUSD), jogosEmCasa, folhaAnual: folhaDoClube(userTeam.id) });
    return { reputacao: reputacaoClube, escalaLiga: escalaDaLiga(userTeam.leagueId), receitaAnual, dividaAtual: dividaTotal(userTeam), caixa: userTeam.cash };
  }, [userTeam, reputacaoClube, fixtures.length, players.length, gameState.currency]);
  const contratarEmprestimoBancario = (valor: number, meses: number): { ok: true } | { ok: false; motivo: MotivoCredito | 'SEM_CLUBE' } => {
    if (!userTeam || !perfilDeCredito) return { ok: false, motivo: 'SEM_CLUBE' };
    const hoje = gameState.currentDate;
    const r = contratarEmprestimo(userTeam, perfilDeCredito, valor, meses, hoje);
    if (!r.ok) return r;
    setTeams(prev => prev.map(t => (t.id === userTeam.id ? r.team : t)));
    empurrarInbox([avisoDeEmprestimoBancario(hoje, gameState.language, 'CONTRATADO', `bank-new|${r.emprestimo.id}`, formatCurrency(r.emprestimo.principal),
      { taxa: `${(r.emprestimo.taxaAnual * 100).toFixed(2)}%`, meses: r.emprestimo.meses, parcela: formatCurrency(r.emprestimo.parcela) })]);
    return { ok: true };
  };
  const quitarEmprestimoBancario = (id: string): { ok: true; valor: number } | { ok: false; motivo: 'INEXISTENTE' | 'SEM_CAIXA' | 'SEM_CLUBE' } => {
    if (!userTeam) return { ok: false, motivo: 'SEM_CLUBE' };
    const hoje = gameState.currentDate;
    const r = quitarEmprestimo(userTeam, id, hoje);
    if (!r.ok) return r;
    setTeams(prev => prev.map(t => (t.id === userTeam.id ? r.team : t)));
    empurrarInbox([avisoDeEmprestimoBancario(hoje, gameState.language, 'QUITADO', `bank-end|${id}`, formatCurrency(r.valor))]);
    return { ok: true, valor: r.valor };
  };
  // as parcelas vencidas de cada mes novo (o mesmo dia nunca paga duas vezes: o emprestimo guarda o ultimo mes processado)
  useEffect(() => {
    if (!userTeam || !(userTeam.emprestimos || []).length) return;
    const hoje = gameState.currentDate;
    const r = processarParcelas(userTeam, hoje);
    if (!r.pagamentos.length) return;
    setTeams(prev => prev.map(t => (t.id === userTeam.id ? processarParcelas(t, hoje).team : t)));
    empurrarInbox(r.pagamentos.map(p => p.quitou
      ? avisoDeEmprestimoBancario(hoje, gameState.language, 'QUITADO', `bank-end|${p.emprestimoId}`, formatCurrency(p.valor))
      : avisoDeEmprestimoBancario(hoje, gameState.language, 'PARCELA', `bank-pay|${p.emprestimoId}|${hoje.slice(0, 7)}`, formatCurrency(p.valor), { juros: formatCurrency(p.juros), parcelas: p.parcelas })));
  }, [gameState.currentDate, userTeam?.id, loadId]);
  const definirDivisaoOrcamento = (compras: number) => { if (userTeam) setTeams(prev => prev.map(t => t.id === userTeam.id ? aplicarDivisao(t, compras, folhaDoClube(t.id)) : t)); };
  /** Bonus do patrocinador por competicao: um percentual (5% a 15%, pela marca) de cada premio pago ao clube, so enquanto o contrato esta vigente. */
  const pagarBonusPatrocinio = (premios: { key: string; usd: number; data: string }[]) => {
    if (!userTeam?.sponsorContract) return;
    const c = userTeam.sponsorContract;
    const total = premios.reduce((s, p) => s + bonusDeCompeticao(c, p.usd, p.data), 0);
    if (total <= 0) return;
    const nome = PATROCINADORES.find(x => x.id === c.sponsorId)?.nome || '';
    setTeams(prev => prev.map(t => t.id === userTeam.id ? { ...t, cash: t.cash + total } : t));
    setInbox(prev => adicionar(prev, [avisoDeBonusPatrocinio(premios[0].data, gameState.language, nome, formatCurrency(total), premios.map(p => p.key))]));
  };
  useEffect(() => {
    if (!userTeam) return;
    const hoje = gameState.currentDate;
    const c0 = userTeam.sponsorContract, n0 = userTeam.sponsorNext;
    if (!c0 && !n0) return;
    let c = c0, n = n0;
    const avisos: MensagemInbox[] = [];
    let usd = 0;
    // 1) fim do contrato: entra o proximo (se houver) ou o clube fica sem patrocinador
    if (c && c.fim <= hoje) { c = n; n = undefined; }
    // 2) parcelas vencidas
    if (c && c.inicio <= hoje) {
      const r = pagarParcelas(c, hoje);
      c = r.contrato;
      if (r.parcelas > 0) {
        usd = r.usd;
        const nome = PATROCINADORES.find(x => x.id === c!.sponsorId)?.nome || '';
        avisos.push(avisoDeParcelaPatrocinio(hoje, gameState.language, nome, r.parcelas, formatCurrency(usd), `spons-pay|${c.sponsorId}|${hoje.slice(0, 7)}`));
      }
    }
    // 3) aviso dos 60 dias finais (so sem renovacao acordada)
    if (c && !n && diasParaFim(c, hoje) <= JANELA_RENOVACAO_DIAS) {
      const nome = PATROCINADORES.find(x => x.id === c!.sponsorId)?.nome || '';
      avisos.push(avisoDeFimPatrocinio(hoje, gameState.language, nome, c.fim, `spons-end|${c.sponsorId}|${c.fim}`));
    }
    if (c !== c0 || n !== n0 || usd) setTeams(prev => prev.map(t => t.id === userTeam.id ? { ...t, sponsorContract: c, sponsorNext: n, cash: t.cash + usd } : t));
    if (avisos.length) setInbox(prev => adicionar(prev, avisos));
  }, [gameState.currentDate, userTeam?.id, userTeam?.sponsorContract, userTeam?.sponsorNext]);

  // O E-MAIL SEMANAL DE EVOLUCAO: toda segunda-feira compara os atributos do elenco com os da segunda anterior e manda o relatorio (textSim/inbox.ts, avisoDeEvolucao); o primeiro dia so grava a referencia.
  useEffect(() => {
    if (!userTeam) return;
    if (((new Date(gameState.currentDate + 'T12:00:00').getDay() + 6) % 7) !== 0) return;
    const referencia = new Map<string, Record<string, number>>();
    const evolucoes: { nome: string; posicao: string; mudancas: { nome: string; de: number; para: number }[] }[] = [];
    for (const p of players) {
      if (p.teamId !== userTeam.id) continue;
      const a = atributos3d(p);
      const atuais: Record<string, number> = {};
      for (const g of ['TEC', 'TAC', 'MEN', 'FIS', 'GK'] as const) for (const x of ((a.detalhe as any)?.[g] || []) as { campo: string; nome: string; valor: number }[]) atuais[x.campo] = x.valor;
      referencia.set(p.id, atuais);
      if (!p.treinoRelatorio) continue;
      const mudancas: { nome: string; de: number; para: number }[] = [];
      for (const campo of Object.keys(atuais)) {
        const antes = p.treinoRelatorio[campo];
        if (typeof antes === 'number' && antes !== atuais[campo]) mudancas.push({ nome: NOME_DO_CAMPO[campo] || campo, de: antes, para: atuais[campo] });
      }
      if (mudancas.length) evolucoes.push({ nome: p.name, posicao: String(p.position), mudancas });
    }
    if (!referencia.size) return;
    setPlayers(prev => prev.map(p => referencia.has(p.id) ? { ...p, treinoRelatorio: referencia.get(p.id) } : p));
    if (evolucoes.length) setInbox(prev => adicionar(prev, [avisoDeEvolucao(gameState.currentDate, gameState.language, evolucoes)]));
  }, [gameState.currentDate, userTeam?.id]);

  // COTA DE PARTICIPACAO das Series C e D (a 1.a fase e a liga do jogo): paga no primeiro jogo da liga.
  useEffect(() => {
    if (!userTeam) return;
    const primeiro = fixtures.filter(f => f.played && !f.isFriendly && (f.type === undefined || f.type === 'LEAGUE')).sort((a, b) => a.date.localeCompare(b.date))[0];
    if (!primeiro) return;
    const p = premioDeInicioDeLiga(userTeam.leagueId, primeiro.date, new Set<string>([...chavesDe(inbox), ...vistasRef.current, ...premiosPagos.current]));
    if (!p) return;
    premiosPagos.current.add(p.key);
    setTeams(prev => prev.map(t => t.id === userTeam.id ? { ...t, cash: t.cash + p.usd } : t));
    setInbox(prev => adicionar(prev, [avisoDePremiacao(p.data, gameState.language, p.key, NOME_DA_COPA[p.copa as string], p.razao, formatCurrency(p.usd))]));
    pagarBonusPatrocinio([p]);
  }, [fixtures]);

  // PREMIACAO DO CAMPEONATO (textSim/premiacoes.json, `ligas`): paga pela posicao final quando todos os jogos da liga do utilizador acabam.
  useEffect(() => {
    if (!userTeam) return;
    const jogos = fixtures.filter(f => !f.isFriendly && (f.type === undefined || f.type === 'LEAGUE'));
    if (!jogos.length || !jogos.every(f => f.played)) return;
    const tab = buildTable(teams.filter(t => naLigaDoUtilizador(t, userTeam)), jogos);
    const pos = tab.findIndex(r => r.team.id === userTeam.id) + 1;
    const p = pos > 0 ? premioDaLiga(userTeam.leagueId, pos, gameState.currentDate, new Set<string>([...chavesDe(inbox), ...vistasRef.current, ...premiosPagos.current])) : null;
    if (!p) return;
    premiosPagos.current.add(p.key);
    setTeams(prev => prev.map(t => t.id === userTeam.id ? { ...t, cash: t.cash + p.usd } : t));
    setInbox(prev => adicionar(prev, [avisoDePremiacao(p.data, gameState.language, p.key, NOME_DA_COPA[p.copa as string], p.razao, formatCurrency(p.usd))]));
    pagarBonusPatrocinio([p]);
  }, [fixtures]);

  // MERCADO DE TREINADORES: a cada jogo novo (do utilizador ou do mundo) atualiza confianca, demissoes e, no fim das ligas, reputacao e ofertas. Idempotente (ver `atualizarTreinadores`).
  useEffect(() => {
    if (!userTeam || !world) return;
    const ligas = montarLigas({ userTeam, teams: teams.filter(t => naLigaDoUtilizador(t, userTeam)), fixtures, world });
    const lang = gameState.language, hoje = gameState.currentDate;
    const atual = managerState ?? registrarNoDiario(semearTreinadores(ligas, { clubKey: teamKey(userTeam.leagueId, userTeam.id), nome: gameState.managerName }), [{ data: hoje, tipo: 'CONTRATADO', clube: userTeam.name }]);
    const { estado: calculado, eventos, mudou } = atualizarTreinadores(atual, ligas, hoje);
    const estado = registrarNoDiario(calculado, registrosDosEventos(eventos, hoje));   // o diario da aba Manager
    if (mudou || !managerState || estado !== calculado) setManagerState(estado);
    const avisos = eventos.filter(e => e.usuario).flatMap(e => {
      const chave = (t: string) => `board|${t}|${e.clubKey}|${e.faixa ?? ''}|${hoje}`;
      if (e.tipo === 'DEMISSAO') return [avisoDeDemissao(hoje, lang, chave('demissao'), e.clube)];
      if (e.tipo === 'OFERTA') return [avisoDeOferta(hoje, lang, chave('oferta'), e.clube)];
      if (e.tipo === 'FAIXA') return [avisoDeFaixa(hoje, lang, chave('faixa'), e.clube, e.faixa!)];
      return [];
    });
    if (avisos.length) empurrarInbox(avisos);
    // Os clubes mostram o treinador atual (o motor das partidas le `managerTactics`).
    const novosTeams = aplicarTreinadores(teams, estado);
    if (novosTeams !== teams) setTeams(novosTeams);
    const novoMundo = world.map(l => { const ts = aplicarTreinadores(l.teams, estado, l.leagueId); return ts === l.teams ? l : { ...l, teams: ts }; });
    if (novoMundo.some((l, i) => l !== world[i])) setWorld(novoMundo);
  }, [world, fixtures]);

  // INBOX — o motor escreve; a tela so le. Cada razao gera uma mensagem so (as `keys` evitam repeticao ao recarregar ou reprocessar um dia).
  const empurrarInbox = (novas: MensagemInbox[]) => {
    // Mensagens cujas razoes todas ja foram emitidas (mesmo que a mensagem tenha sido apagada) nao voltam.
    const frescas = novas.filter(m => !(m.keys.length && m.keys.every(k => vistasRef.current.has(k))));
    if (!frescas.length) return;
    frescas.forEach(m => m.keys.forEach(k => vistasRef.current.add(k)));
    setInboxVistas(Array.from(vistasRef.current));
    setInbox(prev => adicionar(prev, frescas));
  };
  const markInboxRead = (ids: string[]) => setInbox(prev => (prev.some(m => !m.lida && ids.includes(m.id)) ? prev.map(m => (ids.includes(m.id) ? { ...m, lida: true } : m)) : prev));
  const markAllInboxRead = () => setInbox(prev => (prev.some(m => !m.lida) ? prev.map(m => ({ ...m, lida: true })) : prev));
  const deleteInbox = (ids: string[]) => setInbox(prev => prev.filter(m => !ids.includes(m.id)));

  // E-mails de boas-vindas ao clube (uma vez por clube do utilizador).
  useEffect(() => {
    if (!userTeam || !teams.length) return;
    if (inbox.some(m => m.keys.includes('welcome|board')) || vistasRef.current.has('welcome|board')) return;
    const liga = ligaIdDoClube(userTeam);
    const doCampeonato = teams.filter(t => { try { return ligaIdDoClube(t) === liga; } catch { return false; } }).sort((a, b) => b.strength - a.strength);
    const nomeLiga = (COUNTRIES as any[]).flatMap(c => c.leagues).find((l: any) => l.id === liga)?.name || liga;
    const meus = players.filter(p => p.teamId === userTeam.id);
    empurrarInbox(boasVindas({
      hoje: gameState.currentDate, lang: gameState.language, treinador: gameState.managerName, clube: userTeam.name, estadio: userTeam.stadium, cidade: userTeam.city, liga: nomeLiga,
      forca: userTeam.strength, posicaoNaForca: Math.max(1, doCampeonato.findIndex(t => t.id === userTeam.id) + 1), clubesNaLiga: Math.max(doCampeonato.length, 1),
      caixa: formatCurrency(userTeam.cash), tamanhoDoElenco: meus.length,
      contratosEmAtencao: meus.filter(p => ['ATENCAO', 'CRITICO'].includes(estadoDoContrato(p.contract, gameState.currentDate))).length
    }));
  }, [userTeam?.id, teams.length, players.length > 0, loadId]);

  // Avisos automaticos de cada dia: contratos, jogos importantes, lesoes e fisico, olheiros (base), financas e janela de transferencias.
  const jogosDoUtilizadorSig = fixtures.reduce((n, f) => n + ((f.homeTeamId === gameState.userTeamId || f.awayTeamId === gameState.userTeamId) && f.played ? 1 : 0), 0);
  useEffect(() => {
    if (!userTeam) return;
    const hoje = gameState.currentDate;
    const rotulos = new Map<string, string>();
    (comps || []).forEach(c => c.matches.forEach(j => rotulos.set('fix-cup-' + j.id, rotuloDaFase(c.id, j.stage))));
    const regiaoMeu = regiaoDoClube(userTeam);
    const jogos = fixtures.filter(f => f.homeTeamId === userTeam.id || f.awayTeamId === userTeam.id).map(f => {
      const casa = f.homeTeamId === userTeam.id, adv = teams.find(t => t.id === (casa ? f.awayTeamId : f.homeTeamId));
      return {
        id: f.id, date: f.date, adversario: adv?.name || '?', casa, jogado: !!f.played, golsPro: (casa ? f.homeScore : f.awayScore) || 0, golsContra: (casa ? f.awayScore : f.homeScore) || 0,
        derbi: !!adv && !!regiaoMeu && regiaoDoClube(adv) === regiaoMeu, copa: f.type === 'CUP' ? rotulos.get(f.id) : undefined, amistoso: !!f.isFriendly
      };
    });
    const meus = players.filter(p => p.teamId === userTeam.id);
    const jovens = (base?.jogadores || []).filter(p => p.teamId === userTeam.id).map(p => ({ p, r: base!.relatorios[p.id]?.slice(-1)[0] })).filter(x => x.r && x.r.mes === base!.mesProcessado)
      .map(x => ({ nome: x.p.name, posicao: x.p.position, delta: x.r!.delta, estrelas: x.r!.estrelas, ovr: x.p.skill, mudou: x.r!.mudancas.length > 0 }));
    empurrarInbox(avisosDoDia({
      hoje, lang: gameState.language, elenco: meus, jogos, jovens, mesDoRelatorio: base?.mesProcessado || '',
      caixa: userTeam.cash, folhaSemanal: meus.reduce((a, p) => a + p.salary, 0), formatar: formatCurrency, janelaAberta: isTransferWindowOpen(), proximaAbertura: proximaAberturaJanela(hoje, userTeam.country)
    }, new Set<string>([...chavesDe(inbox), ...vistasRef.current])));
  }, [gameState.currentDate, jogosDoUtilizadorSig, base?.mesProcessado, userTeam?.id, loadId]);

  // O MERCADO — o motor escreve; a tela so mostra. Tudo passa por funcoes puras (textSim/transferencias.ts) que devolvem o universo novo; aqui so se guarda.
  const aplicarUniverso = (u: Universo) => {
    if (u.players !== players) setPlayers(u.players);
    if (u.teams !== teams) setTeams(u.teams);
    if (u.base !== base) setBase(u.base);
    if (u.mercado !== mercado) setMercado(u.mercado);
  };
  const universoAtual = (): Universo => ({ players, base, teams, mercado });
  const eventosParaInbox = (eventos: Evento[]) => {
    if (!userTeam || !eventos.length) return;
    // so o que envolve o clube do utilizador chega a caixa de entrada (os eventos "de um lado" — clausula, emprestimo, opcao, bonus — so o do lado do utilizador)
    empurrarInbox(eventos.filter(e => e.lado ? e.clubeId === userTeam.id : (e.clubeId === userTeam.id || e.tipo === 'OFERTA_RECEBIDA' || e.tipo === 'CONTRAPROPOSTA' || e.tipo === 'ACEITA' || e.tipo === 'RECUSADA' || e.tipo === 'BLOQUEADA' || e.tipo === 'EXPIRADA' || e.tipo.startsWith('CONCLUIDA')))
      .filter(e => (e.tipo === 'CONCLUIDA_COMPRA' ? e.clubeId === userTeam.id : e.tipo === 'CONCLUIDA_VENDA' ? e.clubeId === userTeam.id : true))
      .map(e => avisoDeTransferencia(gameState.currentDate, gameState.language, e, formatCurrency(e.valor))));
  };
  const comResultado = (r: { u: Universo; ok: boolean; motivo?: string; eventos: Evento[] }) => { if (r.ok) { aplicarUniverso(r.u); eventosParaInbox(r.eventos); } return { ok: r.ok, motivo: r.motivo }; };
  const proporCompraMercado = (playerId: string, valor: number, bonus?: BonusJogos[]) => userTeam ? comResultado(mercadoPropor(universoAtual(), userTeam.id, playerId, valor, gameState.currentDate, userTeam.id, undefined, bonus)) : { ok: false, motivo: 'sem clube' };
  const proporEmprestimoMercado = (playerId: string, taxa: number, meses: number, opcaoCompra?: number) => userTeam ? comResultado(mercadoProporEmprestimo(universoAtual(), userTeam.id, playerId, taxa, meses, opcaoCompra, gameState.currentDate, userTeam.id)) : { ok: false, motivo: 'sem clube' };
  const pagarClausulaMercado = (playerId: string) => userTeam ? comResultado(mercadoPagarClausula(universoAtual(), userTeam.id, playerId, gameState.currentDate, userTeam.id)) : { ok: false, motivo: 'sem clube' };
  const exercerOpcaoCompra = (playerId: string) => {
    if (!userTeam) return { ok: false, motivo: 'sem clube' };
    const p = players.find(x => x.id === playerId);
    if (!p || p.teamId !== userTeam.id) return { ok: false, motivo: 'o jogador nao esta emprestado' };
    return comResultado(mercadoExercerOpcao(universoAtual(), playerId, gameState.currentDate));
  };
  const responderNegociacao = (negId: string, acao: 'ACEITAR' | 'RECUSAR' | 'CONTRA' | 'NOVA_OFERTA', valor?: number) => {
    if (!userTeam) return { ok: false, motivo: 'sem clube' };
    const neg = mercado.negociacoes.find(n => n.id === negId);
    if (!neg) return { ok: false, motivo: 'negociacao inexistente' };
    const hoje = gameState.currentDate;
    if (neg.vendedorId === userTeam.id) return comResultado(responderComoVendedor(universoAtual(), negId, acao === 'NOVA_OFERTA' ? 'CONTRA' : acao as any, valor, hoje, userTeam.id));
    return comResultado(responderComoComprador(universoAtual(), negId, acao === 'CONTRA' ? 'NOVA_OFERTA' : acao as any, valor, hoje, userTeam.id));
  };
  const retirarProposta = (negId: string) => comResultado(mercadoRetirar(universoAtual(), negId, gameState.currentDate));
  const tentarConcluir = (negId: string) => comResultado(mercadoConcluir(universoAtual(), negId, gameState.currentDate));
  const contratarLivre = (playerId: string) => userTeam ? comResultado(mercadoContratarLivre(universoAtual(), userTeam.id, playerId, gameState.currentDate)) : { ok: false, motivo: 'sem clube' };
  const listarParaVenda = (playerId: string, listar: boolean) => comResultado(mercadoListar(universoAtual(), playerId, listar));
  const listarParaEmprestimo = (playerId: string, listar: boolean) => comResultado(mercadoListarEmprestimo(universoAtual(), playerId, listar));
  const dispensarJogador = (playerId: string) => comResultado(mercadoDispensar(universoAtual(), playerId, gameState.currentDate));

  // Orcamento de transferencias em todos os clubes (so preenche o que falta) e valores de mercado recalculados uma vez por mes (so a formula: textSim/valuation.ts).
  useEffect(() => {
    const t2 = prepararOrcamentos(teams);
    if (t2 !== teams) setTeams(t2);
  }, [teams.length, userTeam?.id, loadId]);
  useEffect(() => {
    if (!userTeam || !players.length) return;
    registrarLigas(teams);   // o valor depende da liga atual do clube (promocoes/descensos)
    const u = universoAtual();
    const u2 = recalcularValoresDoMes(u, gameState.currentDate, recalcularValores);
    if (u2 !== u) { setPlayers(u2.players); setBase(u2.base); setMercado(u2.mercado); }
  }, [gameState.currentDate.slice(0, 7), userTeam?.id, players.length > 0, !!base, loadId]);

  // O dia do mercado corre DEPOIS dos outros efeitos do dia (contratos, base): um render a seguir, com o estado ja atualizado.
  useEffect(() => {
    const id = setTimeout(() => setDiaMercado(gameState.currentDate), 0);
    return () => clearTimeout(id);
  }, [gameState.currentDate]);
  useEffect(() => {
    if (!userTeam || !diaMercado || diaMercado !== gameState.currentDate || !players.length) return;
    const r = mercadoTick(universoAtual(), { donoId: userTeam.id, hoje: diaMercado });
    if (r.u !== universoAtual() && (r.u.mercado !== mercado || r.u.players !== players || r.u.teams !== teams || r.u.base !== base)) { aplicarUniverso(r.u); eventosParaInbox(r.eventos); }
  }, [diaMercado, userTeam?.id, loadId]);

  // CATEGORIAS DE BASE E CONTRATOS — corre no motor (a cada mudanca de data), nao na tela: a aba Sub-20 so mostra o resultado.
  //  . todo clube tem exatamente 20 jovens de 15 a 20 anos (clubes que entram depois, como os das copas, ganham a base aqui);
  //  . a idade acompanha o nascimento; quem faz 21 anos sai da base (o do utilizador vira jogador livre no MARKET; os da CPU deixam o jogo) e a vaga e reposta;
  //  . cada mes novo e processado uma vez (o marcador `mesProcessado` vai no save, entao recarregar nao repete).
  useEffect(() => {
    if (!teams.length || !gameState.userTeamId) return;
    const hoje = gameState.currentDate;
    { const niveis = new Map(teams.map(t => [t.id, nivelDaBaseDoClube(t)] as const)); definirNivelDaBase(id => niveis.get(id) ?? 2); }   // o nivel da base de cada clube, pela liga
    const r = processarBase(garantirBase(base, teams.map(t => t.id), hoje), hoje);
    const baseSal = ajustarSalariosDaBase(r.base, teams);   // Sub-20 das series A-D com o salario da faixa de base da liga (textSim/salarios.ts)
    // Os jovens do utilizador sobem nos atributos durante o mes (XP diario do ganho ja sorteado, textSim/atributos3d.ts `treinoDoMes`).
    const baseFinal = { ...baseSal, jogadores: baseSal.jogadores.map(j => (j.teamId === gameState.userTeamId ? { ...j, treino3d: treinoDoMes(j, hoje) } : j)) };
    if (baseFinal !== base) setBase(baseFinal);
    const doUtilizador = r.saidas.filter(j => j.teamId === gameState.userTeamId).map(j => ({ ...j, teamId: 'MARKET' }));
    if (doUtilizador.length) { setPlayers(prev => [...prev, ...doUtilizador.filter(j => !prev.some(p => p.id === j.id))]); empurrarInbox(avisoDeSaidaDaBase(hoje, gameState.language, doUtilizador)); }
  }, [gameState.currentDate, teams.length, gameState.userTeamId, loadId]);

  // Contratos dos profissionais: quem ainda nao tem contrato recebe um coerente com as faixas; a idade acompanha o nascimento (quem veio da base);
  // no dia do vencimento o jogador do utilizador fica livre (MARKET, fora da escalacao) e os da CPU renovam (contrato novo a partir de hoje, sem alterar o passado).
  useEffect(() => {
    if (!players.length || !gameState.userTeamId) return;
    const hoje = gameState.currentDate, dono = gameState.userTeamId;
    const expirados = new Set(processarContratos(players, hoje, dono, fimDoClube(teams)).liberados);
    if (expirados.size) empurrarInbox(avisoDeLiberados(hoje, gameState.language, players.filter(p => expirados.has(p.id))));
    // CLAUSULAS DE RESCISAO: os contratos sem clausula definida (saves antigos, contratos novos da CPU) ganham uma aqui (ou nenhuma, 1 em 4; textSim/contracts.ts `garantirClausulas`)
    setPlayers(prev => garantirClausulas(processarContratos(prev, hoje, dono, fimDoClube(teams)).jogadores));
    if (expirados.size) setTeams(prev => prev.map(t => t.id === dono
      ? { ...t, lineup: t.lineup.map(id => (expirados.has(id) ? '' : id)), bench: (t.bench || []).map(id => (expirados.has(id) ? '' : id)) } : t));
  }, [gameState.currentDate, players.length, gameState.userTeamId, loadId]);

  // RENOVAR: o jogador pede um salario e uma duracao (`propostaDoJogador`). Aceitar a proposta dele assina na hora (moral em alta); mudar o salario ou os anos abre uma
  // negociacao: ele analisa 2 ou 3 dias e depois aceita (contrato e salario novos, moral em alta) ou recusa (contrato como estava, moral em baixa).
  const proporRenovacao = (playerId: string, oferta: Oferta): 'ASSINADO' | 'EM_ANALISE' | 'BLOQUEADO' => {
    if (!userTeam) return 'BLOQUEADO';
    const alvo = players.find(p => p.id === playerId && p.teamId === userTeam.id);
    if (!alvo || alvo.emprestimo || negociacoes.some(n => n.playerId === playerId)) return 'BLOQUEADO';   // o emprestado renova com o dono, nao com o utilizador
    const hoje = gameState.currentDate, pedido = propostaDoJogador(alvo, hoje, salarioDeMercadoDaLiga(alvo, teams, players));
    if (chanceDeAceitar(alvo, oferta, pedido) === 1) {
      const novo = assinar(alvo, oferta, hoje, fimDaLiga(userTeam.leagueId));
      setPlayers(prev => prev.map(p => (p.id === playerId ? novo : p)));
      empurrarInbox([avisoDeRenovacao(hoje, gameState.language, novo)]);
      return 'ASSINADO';
    }
    const neg = abrirNegociacao(alvo, oferta, pedido, hoje);
    setNegociacoes(prev => [...prev, neg]);
    empurrarInbox([avisoDeNegociacaoIniciada(hoje, gameState.language, alvo, neg.decide, formatCurrency(oferta.salario), oferta.anos)]);
    return 'EM_ANALISE';
  };

  // O dia da resposta chegou: os jogadores respondem (decisao com semente: recarregar o jogo nao muda o resultado).
  useEffect(() => {
    if (!userTeam || !negociacoes.length) return;
    const hoje = gameState.currentDate;
    const r = resolverNegociacoes(negociacoes, players, hoje, userTeam.id, fimDaLiga(userTeam.leagueId));
    if (r.negociacoes === negociacoes) return;
    setNegociacoes(r.negociacoes);
    setPlayers(prev => resolverNegociacoes(negociacoes, prev, hoje, userTeam.id, fimDaLiga(userTeam.leagueId)).jogadores);
    empurrarInbox(r.respostas.map(x => avisoDeRespostaRenovacao(hoje, gameState.language, x.jogador, x.aceitou, formatCurrency(x.negociacao.oferta.salario), x.negociacao.oferta.anos)));
  }, [gameState.currentDate]);

  // Promover um jovem da base ao time principal: decisao manual do treinador. O jogador passa inteiro (id, atributos, potencial, contrato); a vaga e reposta.
  const dispensarJovem = (playerId: string): boolean => {
    if (!base || !userTeam) return false;
    const alvo = base.jogadores.find(p => p.id === playerId);
    if (!alvo || alvo.teamId !== userTeam.id) return false;
    const r = dispensarJovemDaBase(base, playerId, gameState.currentDate);
    if (!r) return false;
    setBase(r.base);
    return true;
  };

  const promoteYouth = (playerId: string): boolean => {
    if (!base || !userTeam) return false;
    const r = promoverJovem(base, playerId, gameState.currentDate);
    if (players.filter(p => p.teamId === userTeam.id).length >= 34) return false;   // maximo de 34 jogadores por time
    if (!r || r.jogador.teamId !== userTeam.id) return false;
    const usados = new Set(players.filter(p => p.teamId === userTeam.id).map(p => p.shirtNumber));
    let numero = r.jogador.shirtNumber; if (usados.has(numero)) { numero = 1; while (usados.has(numero) && numero < 99) numero++; }
    const profissional: Player = { ...r.jogador, shirtNumber: numero };
    setBase(r.base);
    setPlayers(prev => (prev.some(p => p.id === profissional.id) ? prev : [...prev, profissional]));
    empurrarInbox([avisoDePromocao(gameState.currentDate, gameState.language, profissional)]);
    return true;
  };

  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = () => {
      let isDark = false;
      if (gameState.themeMode === 'DARK') isDark = true;
      else if (gameState.themeMode === 'LIGHT') isDark = false;
      else isDark = new Date().getHours() >= 19 || new Date().getHours() < 7;
      if (isDark) root.classList.add('dark'); else root.classList.remove('dark');
    };
    applyTheme();
  }, [gameState.themeMode]);

  const setThemeMode = (mode: ThemeMode) => setGameState(prev => ({ ...prev, themeMode: mode }));

  const updateSettings = (settings: Partial<Pick<GameState, 'language' | 'currency' | 'wageFrequency' | 'themeMode' | 'matchDuration' | 'simulationSpeed' | 'graphicsQuality' | 'cameraTvMin' | 'cameraTvMax'>>) => {
    if (settings.language) localStorage.setItem('fm_lang', settings.language);
    if (settings.graphicsQuality) { try { localStorage.setItem('fm_graphics', settings.graphicsQuality); } catch { /* sem localStorage: vale so nesta sessao */ } }
    setGameState(prev => ({ ...prev, ...settings }));
  };

  // Guarda (ou actualiza) o ponto do mes no historico financeiro do clube: so os ultimos 12 meses, e so mexe no estado se algum valor mudou.
  const registrarFinanceiro = (teamId: string, ponto: PontoFinanceiro) => {
    setGameState(prev => {
      const lista = (prev.financeHistory && prev.financeHistory[teamId]) || [];
      const i = lista.findIndex(x => x.m === ponto.m);
      if (i >= 0 && lista[i].cash === ponto.cash && lista[i].sal === ponto.sal && lista[i].rec === ponto.rec && lista[i].spo === ponto.spo) return prev;
      const nova = i >= 0 ? lista.map((x, k) => (k === i ? ponto : x)) : [...lista, ponto].sort((a, b) => (a.m < b.m ? -1 : 1)).slice(-12);
      return { ...prev, financeHistory: { ...(prev.financeHistory || {}), [teamId]: nova } };
    });
  };

  const updateMatchVisualState = (visual: Partial<MatchVisualState>) => {
    setGameState(prev => ({
      ...prev,
      matchVisual: prev.matchVisual ? { ...prev.matchVisual, ...visual } : (visual as MatchVisualState)
    }));
  };

  // Os textos de textSim/idiomas/<codigo>.json; o que faltar no idioma sai em ingles.
  definirIdiomaAtual(gameState.language);   // o `tx` das telas (textSim/idiomas.ts) segue o idioma escolhido
  const t = (key: string, vars?: Record<string, string | number>) => traduzir(gameState.language, key, vars);

  // Mudar as taxas refaz o provider (o `formatCurrency` de todas as telas passa a usar as novas).
  const [, setVersaoCambio] = useState(0);
  const atualizarTaxas = (novas: Partial<Record<MoedaCambio, number>> | 'padrao') => { if (novas === 'padrao') restaurarTaxas(); else definirTaxas(novas); };
  // Qualquer mudanca das taxas (Settings ou a atualizacao automatica, que pode chegar com o jogo ja aberto) redesenha.
  useEffect(() => { const f = () => setVersaoCambio(v => v + 1); window.addEventListener(EVENTO_CAMBIO, f); return () => window.removeEventListener(EVENTO_CAMBIO, f); }, []);

  const formatCurrency = (value: number) => {
    let amount = value;
    if (gameState.currency === 'EUR') amount *= TAXAS.EUR;
    else if (gameState.currency === 'BRL') amount *= TAXAS.BRL;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: gameState.currency, maximumFractionDigits: 0 }).format(amount);
  };

  const formatCurrencyShort = (value: number) => {
    let amount = value;
    if (gameState.currency === 'EUR') amount *= TAXAS.EUR;
    else if (gameState.currency === 'BRL') amount *= TAXAS.BRL;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
    return amount.toString();
  };

  const formatWage = (weeklyValue: number) => {
    let amount = gameState.wageFrequency === 'MONTHLY' ? weeklyValue * 4.33 : weeklyValue;
    return formatCurrency(amount);
  };

  /** `continuacao`: a VIRADA de temporada. Os clubes e jogadores que ja estao no jogo ficam (com as tabelas a zero) e so entram os que chegam (promovidos/rebaixados); o resto
   (calendario, mundo e copas do ano `ano`) refaz-se como num jogo novo, mas inbox, base, mercado e negociacoes continuam. */
  const startGame = (teamId: string, managerName: string, countryId: string, leagueId: string = 'bra_serie_a', continuacao?: { teams: Team[]; players: Player[]; ano: number }, managerLook?: any) => {
    if (!continuacao) { aplicarDivisoes(DIVISOES_ORIGINAIS); setHistoricoCopas({}); }   // um jogo novo parte das divisoes originais e sem historico de copas
    const ano = continuacao ? continuacao.ano : ANO_BASE;
    let { teams: initTeams, players: initPlayers } = generateLeagueData(countryId, leagueId);
    if (continuacao) {
      const guardados = new Map(continuacao.teams.map(t => [t.id, t]));
      const ficam = new Set(initTeams.filter(t => guardados.has(t.id)).map(t => t.id));
      initTeams = initTeams.map(t => (guardados.has(t.id) ? { ...(guardados.get(t.id) as Team), leagueId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 } : t));
      initPlayers = [...initPlayers.filter(p => !ficam.has(p.teamId)), ...continuacao.players.filter(p => ficam.has(p.teamId) || p.teamId === 'MARKET')];
    }
    // Series C e D do Brasil (formato proprio): na C a liga do jogo e a 1.a fase (todos contra todos, 19 rodadas); na D e o GRUPO do clube (12 clubes, ida e volta). O resto
    // (grupos, mata-mata) vem da competicao (textSim/competitions.ts); os outros 7 grupos da D jogam-se la.
    const formato: string | undefined = ((COUNTRIES as any[]).find(c => c.id === countryId)?.leagues.find((l: any) => l.id === leagueId) || {}).format;
    if (formato === 'SERIE_D') {
      const ordem = ((COUNTRIES as any[]).find(c => c.id === countryId).leagues.find((l: any) => l.id === leagueId).teamIds as number[]).map(String);
      const grupos = gruposDaSerieD(ordem);
      const nomeGrupo = Object.keys(grupos).find(g => grupos[g].includes(teamId)) || 'A';
      const doGrupo = new Set(grupos[nomeGrupo]);
      initTeams = initTeams.filter(t => doGrupo.has(t.id)).map(t => ({ ...t, groupId: nomeGrupo }));
      initPlayers = initPlayers.filter(p => doGrupo.has(p.teamId));
    }
    // DIFICULDADE FINANCEIRA escolhida na tela de inicio (textSim/orcamento.ts): o clube do utilizador comeca com N x a folha anual.
    const dificuldade = dificuldadeEscolhida();
    if (dificuldade && !continuacao) initTeams = initTeams.map(t => t.id === teamId ? aplicarDificuldade(t, folhaAnual(initPlayers.filter(p => p.teamId === t.id).map(p => p.salary)), dificuldade) : t);
    /*
    A DATA DE ARRANQUE E A TEMPORADA EUROPEIA (pedido): o jogo comeca a 1/1 com os clubes de fora da Europa — as ligas europeias, que jogam de 1/7 a maio, ja vem a meio (julho a dezembro simulados ate 1/1) —
    e a 1/6 com um clube europeu (a temporada vira a 1/6 e os jogos comecam a 1/7): a pre-temporada vai de 1/6 a 23/6, a liga dele comeca em 1/7 e as outras ligas (as brasileiras, de abril a setembro) recuperam de 1/1 ate 1/6. O mundo simula as rodadas que ficam para tras (modelo rapido).
    */
    const europeu = ehLigaEuropeia(leagueId);
    const dataInicial = (!continuacao && europeu) ? `${ano}-06-01` : `${ano}-01-01`;   // clube europeu: a temporada comeca em 1/6 (pre-temporada) e os jogos em 1/7
    const dataDoMundo = continuacao ? gameState.currentDate : dataInicial;
    const temporadaEuropa = europeu ? ano : ano - 1;   // o ano em que comeca a temporada europeia do mundo (a do utilizador, se for europeu, comeca em `ano`)
    let initFixtures = generateFixtures(initTeams, leagueId, ano, europeu ? ano : undefined);
    if (formato === 'SERIE_C') initFixtures = initFixtures.filter(f => f.week <= initTeams.length - 1);   // so o 1.o turno

    // --- CPU FRIENDLY SCHEDULING (PRE-SEASON) ---
    // Europa: a pre-temporada e entre 1/6 e 23/6 (a temporada vira a 1/6); o jogo novo de clube europeu tambem comeca a 1/6.
    // Os clubes do Paulistao comecam em janeiro (a bola rola na 3.a semana); os outros, a 1 de janeiro nao tem jogos ate abril: a pre-temporada deles fica perto do inicio da liga.
    const preseasonPaulista = ["2026-01-04", "2026-01-07", "2026-01-11"].map(d => noAno(d, ano)), preseasonOutros = (europeu ? ["2026-06-06", "2026-06-13", "2026-06-20"] : ["2026-04-02", "2026-04-05", "2026-04-09"]).map(d => noAno(d, ano));
    const cpuFriendlies: Fixture[] = [];

    initTeams.forEach(team => {
      if (team.id === teamId) return; // Player schedules their own via UI

      (ehDoPaulista(team.id) ? preseasonPaulista : preseasonOutros).forEach(date => {
        const hasMatch = [...initFixtures, ...cpuFriendlies].some(f => f.date === date && (f.homeTeamId === team.id || f.awayTeamId === team.id));
        if (hasMatch) return;

        if (Math.random() < 0.5) { // 50% chance per date
          const potentialOpponents = initTeams.filter(opp =>
            opp.id !== team.id &&
            opp.id !== teamId &&
            ![...initFixtures, ...cpuFriendlies].some(f => f.date === date && (f.homeTeamId === opp.id || f.awayTeamId === opp.id))
          );

          if (potentialOpponents.length > 0) {
            const opponent = potentialOpponents[Math.floor(Math.random() * potentialOpponents.length)];
            cpuFriendlies.push({
              id: `fix-friendly-cpu-${date}-${team.id}-${opponent.id}`,
              week: 0,
              date: date,
              homeTeamId: team.id,
              awayTeamId: opponent.id,
              homeScore: null,
              awayScore: null,
              played: false,
              isFriendly: true,
              type: 'FRIENDLY',
              events: []
            });
          }
        }
      });
    });

    initFixtures = [...initFixtures, ...cpuFriendlies].sort((a, b) => a.date.localeCompare(b.date));
    // O numero de jornadas e o da liga (os jogos de copa, semana 0, vem depois e podem acabar mais tarde).
    const jornadasDaLiga = initFixtures.reduce((m, f) => Math.max(m, f.week || 0), 0) || 38;

    // O MUNDO e as COPAS: criam-se agora, para os jogos de copa do utilizador entrarem no calendario desde o primeiro dia.
    const mundo = createWorld(leagueId, dataDoMundo, null, ano, temporadaEuropa);
    const copas = prepararCopas({ world: mundo, userTeamId: teamId, teams: initTeams, players: initPlayers, fixtures: initFixtures, date: dataDoMundo, comps: null, historico: continuacao ? historicoCopas : undefined });
    worldSaved.current = null; compsSaved.current = null;
    setWorld(mundo);
    if (copas) {
      setComps(copas.comps);
      initFixtures = [...initFixtures, ...copas.fixtures].sort((a, b) => a.date.localeCompare(b.date));
    } else setComps(null);

    setTeams(copas ? [...initTeams, ...copas.teams] : initTeams);
    setPlayers((copas ? [...initPlayers, ...copas.players] : initPlayers).map(p => ({ ...p, treino3dSeasonStart: undefined })));   // o snapshot de inicio de temporada (tec/tac/men/fis) e gravado pelo efeito abaixo
    if (!continuacao) {
      setBase(null);   // a base nasce no motor (efeito acima), com a data do jogo
      vistasRef.current = new Set<string>(); setInboxVistas([]);
      setInbox([]);    // as boas-vindas nascem no motor, com o clube escolhido
      setNegociacoes([]);
      setMercado(mercadoVazio(''));
    }
    setAnoTemporada(ano);
    setFixtures(initFixtures);
    if (continuacao) { setGameState(prev => ({ ...prev, currentWeek: 1, totalWeeks: jornadasDaLiga })); return; }   // a virada: a data, o clube e a vista continuam
    setGameState(prev => ({
      ...prev,
      currentWeek: 1,
      totalWeeks: jornadasDaLiga,
      currentDate: dataInicial,
      userTeamId: teamId,
      managerName,
      managerLook,
      view: 'DASHBOARD',
      matchMode: 'NONE',
      matchVisual: undefined
    }));
  };

  // O NIVEL DO CT de cada clube (pela liga, como o da base) limita ate onde o treino leva um atributo; registado durante o render para os atributos ja lerem o teto certo.
  useMemo(() => { const niveis = new Map(teams.map(t => [t.id, nivelDaBaseDoClube(t)] as const)); definirNivelDoCt(id => niveis.get(id) ?? 2); }, [teams]);

  // O TREINO EM XP: um save antigo guardava pontos (25 por nivel); converte-se uma vez sem perder os niveis ganhos. Jogadores novos so recebem a marca.
  useEffect(() => {
    if (!players.some(p => !p.treinoEmXp)) return;
    setPlayers(prev => prev.map(p => {
      if (p.treinoEmXp) return p;
      const novo = migrarTreinoParaXp(p);
      return novo ? { ...p, treino3d: novo, treinoEmXp: true } : { ...p, treinoEmXp: true };
    }));
  }, [players]);

  // O SNAPSHOT DE INICIO DE TEMPORADA (TEC/TAC/MEN/FIS do Squad e da ficha mostram o ganho do treino desde aqui, e cada atributo da ficha leva o seu `+N`: chaves `attr:<campo>`, marca `attr:_v`):
  // grava-se para quem ainda nao o tem (inicio, virada, contratacoes); um snapshot antigo, so com as medias, recebe os atributos de agora (o ganho por atributo conta daqui para a frente).
  const snapshotCompleto = (p: Player) => !!p.treino3dSeasonStart && p.treino3dSeasonStart['attr:_v'] === 1;
  useEffect(() => {
    if (!userTeam) return;
    if (!players.some(p => p.teamId === userTeam.id && !snapshotCompleto(p))) return;
    setPlayers(prev => prev.map(p => {
      if (p.teamId !== userTeam.id || snapshotCompleto(p)) return p;
      const a = atributos3d(p);
      const porAtributo: Record<string, number> = { 'attr:_v': 1 };
      for (const g of ['TEC', 'TAC', 'MEN', 'FIS', 'GK'] as const) for (const x of ((a.detalhe as any)?.[g] || []) as { campo: string; valor: number }[]) porAtributo['attr:' + x.campo] = x.valor;
      const medias = p.treino3dSeasonStart && typeof p.treino3dSeasonStart.tec === 'number' ? { tec: p.treino3dSeasonStart.tec, tac: p.treino3dSeasonStart.tac, men: p.treino3dSeasonStart.men, fis: p.treino3dSeasonStart.fis } : { tec: a.tec, tac: a.tac, men: a.men, fis: a.fis };
      return { ...p, treino3dSeasonStart: { ...medias, ...porAtributo } };
    }));
  }, [players, userTeam?.id]);

  // A VIRADA DE TEMPORADA (textSim/virada.ts): no 1.o de janeiro do ano seguinte aplicam-se os acessos e descensos e comeca a temporada nova (idade, contratos e base ja andam com a data).
  useEffect(() => {
    if (!userTeam || !world) return;
    // A virada e no fim da temporada do utilizador: 1/1 do ano seguinte (ligas de abril a setembro) ou 1/6 do ano seguinte (temporada europeia, jogos de 1/7 a maio).
    // (So se o calendario da liga dele atravessa o ano: um save antigo de clube europeu, com o calendario de abril a setembro, continua a virar a 1/1.)
    const fimDaLiga = fixtures.filter(f => !f.isFriendly && (f.type === undefined || f.type === 'LEAGUE') && (f.homeTeamId === userTeam.id || f.awayTeamId === userTeam.id)).reduce((m, f) => (f.date > m ? f.date : m), '');
    const viraEmJunho = ehLigaEuropeia(ligaIdDoClube(userTeam)) && fimDaLiga > `${anoTemporada}-12-31`;
    if (gameState.currentDate < `${anoTemporada + 1}-${viraEmJunho ? '06' : '01'}-01`) return;
    const ligaId = ligaIdDoClube(userTeam);
    const doClube = teams.filter(t => t.leagueId === ligaId);
    const r = calcularVirada({ teams: doClube, fixtures, userLeagueId: ligaId, userTeamId: userTeam.id, world, comps });
    aplicarDivisoes(r.divisoes);
    startGame(userTeam.id, gameState.managerName, paisDaLiga(r.ligaDoUtilizador) || userTeam.country, r.ligaDoUtilizador, { teams: doClube, players, ano: Number(gameState.currentDate.slice(0, 4)) });
    // Virada (OnSeasonEnd): 1) regressao por idade (niveis inteiros, idade inteira); 2) a Energia de todo o plantel volta das ferias entre 45 e 55 (sorteada por jogador).
    setPlayers(prev => prev.map(p => {
      const treino3d = regredirPorIdade(p);
      const q = treino3d ? { ...p, treino3d } : p;
      const en = energiaInicial();
      return { ...q, energia: en, fitness: en };
    }));
  }, [gameState.currentDate]);

  const advanceDay = () => {
    /*
    NO DIA DO JOGO NAO SE PASSA O DIA: com o jogo do utilizador por jogar hoje so ha o NEXT GAME / a partida (o MatchDay conclui o dia com o advanceWeek). Relato: *"selecionei ADVANCE DAY no dia
    do jogo e o sistema passou para o outro dia"* (o botao do Training Center aparecia sempre). A trava fica aqui para nenhum botao nem avanco automatico saltar o jogo.
    */
    if (gameState.userTeamId && fixtures.some(f => !f.played && f.date === gameState.currentDate && (f.homeTeamId === gameState.userTeamId || f.awayTeamId === gameState.userTeamId))) return;
    const isTrainingCamp = gameState.activities.some(a => a.date === gameState.currentDate && a.type === 'TRAINING_CAMP');

    setGameState(prev => {
      const d = new Date(prev.currentDate + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      return { ...prev, currentDate: d.toISOString().split('T')[0] };
    });

    // Daily energy recovery based on training schedule
    setPlayers(prevPlayers => {
      const d = new Date(gameState.currentDate + 'T12:00:00');
      const dayIdx = (d.getDay() + 6) % 7; // Monday = 0, Sunday = 6

      // O treino da CPU: cada jogador decide pela propria Energia (treino, treino leve ou descanso); o time todo descansa na vespera e no dia do jogo (textSim/trainingService.ts, cpuPlanoDoJogador).
      const diasParaJogoCpu = new Map<string, number>();
      {
        const clubes = new Set<string>();
        prevPlayers.forEach(pl => { if (pl.teamId !== gameState.userTeamId) clubes.add(pl.teamId); });
        clubes.forEach(tid => {
          const prox = fixtures.filter(f => !f.played && f.date >= gameState.currentDate && (f.homeTeamId === tid || f.awayTeamId === tid)).map(f => f.date).sort()[0];
          diasParaJogoCpu.set(tid, prox ? Math.round((new Date(prox + 'T12:00:00').getTime() - new Date(gameState.currentDate + 'T12:00:00').getTime()) / 86400000) : 7);
        });
      }

      // Quem jogou ontem (titulares e quem entrou do banco) folga hoje; quem nao jogou treina.
      const jogouOntem = new Set<string>();
      {
        const ontem = new Date(gameState.currentDate + 'T12:00:00'); ontem.setDate(ontem.getDate() - 1);
        const dataOntem = ontem.toISOString().split('T')[0];
        fixtures.filter(f => f.date === dataOntem && f.played).forEach(f => {
          [...(f.homeLineup || []), ...(f.awayLineup || [])].forEach(id => jogouOntem.add(id));
          (f.events || []).forEach(e => { if (e.type === 'SUB' && e.playerId) jogouOntem.add(e.playerId); });
        });
      }

      // Grupos automaticos pela ENR (do inicio do dia): quem tem Energia alta treina no G1, quem esta cansado passa para o seguinte.
      const nGruposAuto = gameState.unlockedTrainingGroups || 1;
      const autoG = gameState.trainingAutoGrupos;
      const grupoAuto = (pl: Player): number | null => (autoG?.ativo && nGruposAuto > 1 && pl.teamId === gameState.userTeamId && !pl.injury)
        ? grupoPorEnergia(pl.energia ?? pl.fitness ?? 100, autoG.limiares, nGruposAuto) : null;

      return prevPlayers.map(p => {
        const gAuto = grupoAuto(p);
        if (gAuto !== null && (p.trainingGroupId || 0) !== gAuto) p = { ...p, trainingGroupId: gAuto };
        let dailyRecovery = 0;
        let moraleBoost = 0;
        // Lesao nova do dia (rolo de lesao dos slots de treino; as dos jogos vem do motor da partida).
        let novaLesao: Player['injury'] | undefined;
        const rolarLesaoTreino = (energiaNoEvento: number) => {
          if (novaLesao || !rolouLesaoTreino(energiaNoEvento)) return;
          novaLesao = { type: 'Lesao muscular (treino)', daysOut: 3 + Math.floor(Math.random() * 8), severity: 'LIGHT' };
        };

        if (p.injury) {
          // Lesao do 3D: o FIS cai `quedaFisPorDia`; as antigas recuperam 15/dia como sempre.
          dailyRecovery = variacaoDiariaDeFis(p.injury) ?? 15;
        } else if (p.teamId === gameState.userTeamId) {
          // User team follows training schedule (respecting group)
          const gIdx = p.trainingGroupId || 0;
          const userSchedules = gameState.trainingSchedules || [gameState.trainingSchedule, [], []];
          const groupSchedule = userSchedules[gIdx] || gameState.trainingSchedule;
          let energiaNoSlot = p.energia ?? p.fitness ?? 100;

          for (let slot = 0; slot < 4; slot++) {
            const actId = groupSchedule[dayIdx] ? groupSchedule[dayIdx][slot] : null;
            // Rolo de lesao: so sessoes que gastam energia (nao Recovery/Analysis), com a Energia do inicio do evento.
            if (actId && sessaoRolaLesao(actId)) rolarLesaoTreino(energiaNoSlot);
            // Slot vazio: +4. Sessao Recovery: +8. Os dois x Stamina/100.
            const ganhoLivre = actId === 'recovery' ? ENERGIA_POR_PERIODO_LIVRE : ENERGIA_SLOT_VAZIO;
            if (!actId || actId === 'recovery') {
              dailyRecovery += ganhoLivre * recoveryMultiplier(campo3d(p, ['stamina']));
            }
            if (actId && actId !== 'recovery') {
              const act = ACTIVITIES.find(a => a.id === actId);
              const fitBonus = act?.impacts.find(imp => imp.label === 'FIS')?.value || 0;
              // Dreno real = custo base x (100/stamina); o chip ENR do cartao mostra o custo base.
              const realCost = (ENERGY_COST_BASE[actId] ?? 0) * drainMultiplier(campo3d(p, ['stamina']));
              dailyRecovery += fitBonus - realCost;
              energiaNoSlot = Math.max(0, energiaNoSlot + fitBonus - realCost);
            } else {
              energiaNoSlot = energiaNoSlot + ganhoLivre * recoveryMultiplier(campo3d(p, ['stamina']));
            }
          }
          if (isTrainingCamp) {
            dailyRecovery += 1;
            moraleBoost += 1;
          }
        } else {
          // Outros times: o plano do treinador da CPU (descanso ou treino do dia)
          const plano = cpuPlanoDoJogador(p.energia ?? p.fitness ?? 100, diasParaJogoCpu.get(p.teamId) ?? 7, jogouOntem.has(p.id));   // 1 dia de folga depois do jogo, so para quem jogou
          dailyRecovery = 4 * ENERGIA_POR_PERIODO_LIVRE;   // descanso
          if (plano !== 'descanso') {
            // A CPU treina pelas atividades do utilizador: gasta Energia (custo x 100/Stamina), rola a lesao por sessao pesada e os periodos que sobram recuperam como slots vazios.
            p = { ...p, trainingAccumulated: p.trainingAccumulated ? { ...p.trainingAccumulated } : undefined, treino3d: p.treino3d ? { ...p.treino3d } : undefined } as Player;
            const stamina = campo3d(p, ['stamina']);
            const leve = plano === 'leve';
            const dia = cpuAplicarTreino(p, { stamina, leve, individualDe: () => atributosIndividuais(p).campos });
            dia.riscos.forEach(rolarLesaoTreino);
            dailyRecovery = ENERGIA_SLOT_VAZIO * recoveryMultiplier(stamina) * Math.max(0, 4 - (leve ? SLOTS_CPU_LEVE : SLOTS_CPU_POR_DIA)) - dia.custoEnergia;
          }
        }

        // Segunda-feira: boletim medico das lesoes complexas (evolucao excelente ou recaida mexem no prazo real).
        let lesao = p.injury ?? novaLesao;
        if (lesao && dayIdx === 0 && lesao.tipoLesao === 'Complexa') {
          const b = boletimSemanal(lesao, teams.find(t => t.id === p.teamId)?.medico || gerarMedico(p.teamId));
          lesao = { ...b.lesao, boletim: b.boletim };
        }
        // Alta medica: a Energia cai a 1/2 do FIS (lesao grave), 1/3 (media) ou 1/4 (leve).
        const teveAlta = !!lesao && lesao.daysOut <= 1;
        const energiaSoma = (p.energia ?? p.fitness ?? 100) + dailyRecovery;
        const energiaBase = teveAlta ? Math.min(energiaSoma, energiaPosLesao(atributos3d(p).fis, lesao?.severity)) : energiaSoma;
        const energiaFinal = Math.min(100, Math.max(0, energiaBase));
        // Volta de lesao (jogador do utilizador): vai para o grupo da sua ENR de agora (baixa pela alta medica), se houver mais de um grupo desbloqueado.
        const nGruposAlta = gameState.unlockedTrainingGroups || 1;
        const grupoAlta = (teveAlta && p.teamId === gameState.userTeamId && nGruposAlta > 1)
          ? grupoPorEnergia(energiaFinal, gameState.trainingAutoGrupos?.limiares || [80, 50], nGruposAlta) : undefined;
        // AUTO ENR no FIM DO DIA: com a Energia ja atualizada, quem nao esta lesionado e e do utilizador vai para o grupo da ENR de agora (G1 alta, G2/G3 cansado).
        const lesaoFinal = lesao ? (lesao.daysOut > 1 ? lesao : undefined) : undefined;
        const grupoFimDoDia = (gameState.trainingAutoGrupos?.ativo && nGruposAlta > 1 && p.teamId === gameState.userTeamId && !lesaoFinal)
          ? grupoPorEnergia(energiaFinal, gameState.trainingAutoGrupos.limiares, nGruposAlta) : undefined;
        return {
          ...p,
          ...(grupoFimDoDia !== undefined ? { trainingGroupId: grupoFimDoDia } : grupoAlta !== undefined ? { trainingGroupId: grupoAlta } : {}),
          energia: energiaFinal,
          fitness: energiaFinal, // espelho legado ate a Task 8
          morale: Math.min(100, Math.max(0, (p.morale || 50) + moraleBoost)),
          injury: lesao ? (lesao.daysOut > 1 ? { ...lesao, daysOut: lesao.daysOut - 1 } : undefined) : undefined
        };
      });
    });

    if (isTrainingCamp) {
      setTeams(prevTeams => prevTeams.map(t => {
        if (t.id !== gameState.userTeamId) return t;

        const newSynergy = { ...(t.synergyMap || {}) };
        const squad = [...(t.lineup || []), ...(t.bench || [])].filter(id => id);

        for (let i = 0; i < squad.length; i++) {
          for (let j = i + 1; j < squad.length; j++) {
            const p1 = squad[i];
            const p2 = squad[j];
            const key = p1 < p2 ? `${p1}-${p2}` : `${p2}-${p1}`;
            newSynergy[key] = (newSynergy[key] || 0) + 15; // 15 minutes of synergy per day
          }
        }
        return { ...t, synergyMap: newSynergy };
      }));
    }

    // Sessoes com impacto CHE (ex.: Analysis): cada uma soma minutos de "jogar junto" a cada par de jogadores do grupo que a faz (o Chemistry sobe; ver textSim/quimica.ts).
    {
      const diaDaSemana = (new Date(gameState.currentDate + 'T12:00:00').getDay() + 6) % 7;   // segunda = 0
      const agendas = gameState.trainingSchedules || [gameState.trainingSchedule, [], []];
      const porGrupo = new Map<number, string[]>();
      players.filter(p => p.teamId === gameState.userTeamId && !p.injury).forEach(p => { const gA = (gameState.trainingAutoGrupos?.ativo && (gameState.unlockedTrainingGroups || 1) > 1) ? grupoPorEnergia(p.energia ?? p.fitness ?? 100, gameState.trainingAutoGrupos.limiares, gameState.unlockedTrainingGroups || 1) : null; const g = gA ?? (p.trainingGroupId || 0); porGrupo.set(g, [...(porGrupo.get(g) || []), p.id]); });
      const ganhos: [string[], number][] = [];
      porGrupo.forEach((ids, g) => {
        const agenda = agendas[g] || gameState.trainingSchedule;
        let che = 0;
        for (let slot = 0; slot < 4; slot++) {
          const actId = agenda[diaDaSemana] ? agenda[diaDaSemana][slot] : null;
          const act = actId ? ACTIVITIES.find(a => a.id === actId) : undefined;
          che += act?.impacts.find(imp => imp.label === 'CHE')?.value || 0;
        }
        if (che > 0) ganhos.push([ids, che * MINUTOS_POR_PONTO_CHE]);
      });
      if (ganhos.length) setTeams(prevTeams => prevTeams.map(t => {
        if (t.id !== gameState.userTeamId) return t;
        const sinergia = { ...(t.synergyMap || {}) };
        ganhos.forEach(([ids, minutos]) => {
          for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
            const chave = ids[i] < ids[j] ? `${ids[i]}-${ids[j]}` : `${ids[j]}-${ids[i]}`;
            sinergia[chave] = (sinergia[chave] || 0) + minutos;
          }
        });
        return { ...t, synergyMap: sinergia };
      }));
    }
  };

  /*
  NEXT GAME: passa os dias ate ao proximo jogo do utilizador, 5 segundos por dia (o primeiro dia sai logo). Para: no dia do jogo, quando chega um e-mail de RESPOSTA de negociacao
  (transferencia ou renovacao — as mensagens CONTRACT/TRANSFER sem chave de aviso automatico) ou quando o treinador carrega em STOP. O estado vive aqui, e nao no botao, para o
  avanco continuar se o treinador mudar de aba.
  */
  const [autoAvanco, setAutoAvanco] = useState<null | { alvo: string; inicio: string; inboxIds: string[] }>(null);
  const [autoAvancoMotivo, setAutoAvancoMotivo] = useState('');
  const proximoJogo = (() => {
    if (!gameState.userTeamId) return null;
    const j = fixtures.filter(f => !f.played && f.date > gameState.currentDate && (f.homeTeamId === gameState.userTeamId || f.awayTeamId === gameState.userTeamId)).sort((a, b) => a.date.localeCompare(b.date))[0];
    if (!j) return null;
    const adv = teams.find(t => t.id === (j.homeTeamId === gameState.userTeamId ? j.awayTeamId : j.homeTeamId));
    const dias = Math.round((new Date(j.date + 'T12:00:00').getTime() - new Date(gameState.currentDate + 'T12:00:00').getTime()) / 86400000);
    return { date: j.date, adversario: adv?.name || '', dias };
  })();
  // O jogo do utilizador por jogar HOJE: no dia do jogo nao se avanca (ver advanceDay); o NEXT GAME nao arranca e o avanco automatico para.
  const jogoHoje = !!gameState.userTeamId && fixtures.some(f => !f.played && f.date === gameState.currentDate && (f.homeTeamId === gameState.userTeamId || f.awayTeamId === gameState.userTeamId));
  const iniciarProximoJogo = () => {
    if (!proximoJogo || jogoHoje) return;
    setAutoAvancoMotivo('');
    setAutoAvanco({ alvo: proximoJogo.date, inicio: gameState.currentDate, inboxIds: inbox.map(m => m.id) });
  };
  const pararProximoJogo = (motivo?: string) => { setAutoAvanco(null); setAutoAvancoMotivo(motivo ?? ''); };
  useEffect(() => {
    if (!autoAvanco) return;
    const resposta = inbox.find(m => !autoAvanco.inboxIds.includes(m.id) && (m.categoria === 'TRANSFER' || m.categoria === 'CONTRACT') && m.keys.length === 0);
    if (resposta) { pararProximoJogo('Negotiation reply: ' + resposta.assunto); return; }
    if (gameState.currentDate >= autoAvanco.alvo || jogoHoje) { pararProximoJogo('Match day'); return; }
    if (gameState.isProcessing) { pararProximoJogo(''); return; }
    const t = setTimeout(() => advanceDay(), gameState.currentDate === autoAvanco.inicio ? 0 : 5000);
    return () => clearTimeout(t);
  }, [autoAvanco, gameState.currentDate, inbox]);

  const advanceWeek = () => {
    motor3dRes.current = {};
    if (matchTimerRef.current) clearInterval(matchTimerRef.current);

    // RENDA E CUSTO DO ESTADIO (textSim/stadiumEconomy.ts): cada jogo do dia, uma vez. O mandante recebe a bilheteira (publico = capacidade x ocupacao, x preco medio)
    // e paga o custo do estadio; a ocupacao de AMBOS os times muda com o resultado (+3% vitoria, -2% empate, -3% derrota, minimo 50%).
    const jornadas = fixtures.filter(f => !f.isFriendly).reduce((m, f) => Math.max(m, f.week || 0), 0);
    const liquidacoes = fixtures
      .filter(f => f.date === gameState.currentDate && !f.financeSettled && !liquidadosRef.current.has(f.id))
      .map(f => {
        const h = teams.find(x => x.id === f.homeTeamId), a = teams.find(x => x.id === f.awayTeamId);
        const decisivo = !!f.isDecisive || (!f.isFriendly && jornadas > 0 && (f.week || 0) > jornadas - ECONOMIA_ESTADIO.ultimasJornadasDecisivas);
        return (h && a) ? { f, h, a, s: settleMatch(h, a, f, gameState.currency as CurrencyCode, decisivo) } : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
    liquidacoes.forEach(x => liquidadosRef.current.add(x.f.id));
    if (liquidacoes.length) {
      setTeams(prev => prev.map(t => {
        let nt = t;
        for (const x of liquidacoes) {
          const hs = x.f.homeScore || 0, as = x.f.awayScore || 0;
          if (t.id === x.h.id) {
            const jogos = nt.homeGames || 0;
            nt = {
              ...nt,
              cash: nt.cash + x.s.revenueUSD - x.s.costUSD,
              gateRevenue: (nt.gateRevenue || 0) + x.s.revenueUSD,
              stadiumCosts: (nt.stadiumCosts || 0) + x.s.costUSD,
              homeGames: jogos + 1,
              avrAttendance: Math.round(((jogos ? (nt.avrAttendance || 0) : 0) * jogos + x.s.attendance) / (jogos + 1)),
              ...(() => { const r = applyResult(nt.stadiumOccupancy ?? ECONOMIA_ESTADIO.ocupacaoInicial, nt.drawStreak || 0, hs > as ? 'W' : hs < as ? 'L' : 'D'); return { stadiumOccupancy: r.base, drawStreak: r.drawStreak }; })(),
            };
          } else if (t.id === x.a.id) {
            const r = applyResult(nt.stadiumOccupancy ?? ECONOMIA_ESTADIO.ocupacaoInicial, nt.drawStreak || 0, as > hs ? 'W' : as < hs ? 'L' : 'D');
            nt = { ...nt, stadiumOccupancy: r.base, drawStreak: r.drawStreak };
          }
        }
        return nt;
      }));
    }

    setFixtures(prevFixtures => prevFixtures.map(f => {
      const liq = liquidacoes.find(x => x.f.id === f.id);
      if (liq) f = { ...f, attendance: liq.s.attendance, gateRevenue: liq.s.revenueUSD, stadiumCost: liq.s.costUSD, financeSettled: true };
      if (f.date === gameState.currentDate) {
        let ratings = f.playerRatings;
        if (!ratings) {
          const homeT = teams.find(t => t.id === f.homeTeamId);
          const awayT = teams.find(t => t.id === f.awayTeamId);
          if (homeT && awayT) {
            ratings = calculateMatchRatings(f.events, homeT, awayT, f.homeScore || 0, f.awayScore || 0, f.homeLineup, f.awayLineup, players);
          }
        }
        return { ...f, played: true, playerRatings: ratings };
      }
      return f;
    }));


    // BONUS POR JOGOS (textSim/transferencias.ts): os jogos oficiais de hoje contam para os bonus pendentes das vendas (a mesma escalacao das `appearances`, abaixo).
    {
      const jogaram = new Set<string>();
      fixtures.filter(f => f.date === gameState.currentDate && !f.isFriendly).forEach(f => {
        const h = teams.find(t => t.id === f.homeTeamId), a = teams.find(t => t.id === f.awayTeamId);
        [...(f.homeLineup || h?.lineup || []), ...(f.awayLineup || a?.lineup || [])].forEach(id => { if (id) jogaram.add(id); });
        f.events.forEach(e => { if (e.type === 'SUB' && e.playerId) jogaram.add(e.playerId); });
      });
      if (jogaram.size) setMercado(prev => registrarJogosDosBonus(prev, players, jogaram));
    }

    setPlayers(prevPlayers => {
      let updated = false;
      const newPlayers = prevPlayers.map(p => ({
        ...p,
        trainingSessionsThisWeek: 0 // RESET SESSIONS FOR THE NEW WEEK
      }));
      const todaysFixtures = fixtures.filter(f => f.date === gameState.currentDate);

      todaysFixtures.forEach(f => {
        const homeTeam = teams.find(t => t.id === f.homeTeamId);
        const awayTeam = teams.find(t => t.id === f.awayTeamId);
        // Amistoso não conta jogo, gol nem assistência para a temporada.
        // Copas contam para as estatisticas da temporada (jogos, golos, assistencias); so o amistoso fica de fora.
        const official = !f.isFriendly;

        if (official) {
          // Usa a escalação da partida (inclui quem entrou pelo banco),
          // não a escalação atual do time.
          const played = new Set<string>([
            ...(f.homeLineup || homeTeam?.lineup || []),
            ...(f.awayLineup || awayTeam?.lineup || []),
          ]);
          f.events.forEach(e => { if (e.type === 'SUB' && e.playerId) played.add(e.playerId); });
          played.forEach(playerId => {
            const p = newPlayers.find(pl => pl.id === playerId);
            if (p) { p.appearances = (p.appearances || 0) + 1; updated = true; }
          });
        }

        // Cartoes: 3 amarelos (ou um vermelho) suspendem do proximo jogo da competicao; quem estava suspenso cumpre este jogo.
        if (aplicarSuspensoes(f, chaveCompeticao(f, comps), newPlayers)) updated = true;

        f.events.forEach(e => {
          if (official && e.type === 'GOAL' && e.playerId) {
            const p = newPlayers.find(pl => pl.id === e.playerId);
            if (p) { p.goalsScored = (p.goalsScored || 0) + 1; updated = true; }
          }
          if (official && e.type === 'GOAL' && e.assistPlayerId) {
            const p = newPlayers.find(pl => pl.id === e.assistPlayerId);
            if (p) { p.assists = (p.assists || 0) + 1; updated = true; }
          }
          if (e.type === 'INJURY' && e.playerId && e.injuryName && e.injuryDaysOut && e.injurySeverity) {
            const p = newPlayers.find(pl => pl.id === e.playerId);
            if (p) {
              p.injury = { type: e.injuryName, daysOut: e.injuryDaysOut, severity: e.injurySeverity,
                ...(e.injuryTipo ? { tipoLesao: e.injuryTipo, estimativa: e.injuryEstimate, quedaFisPorDia: e.injuryFisDrop, idLesao: e.injuryId } : {}) };
              if (e.injuryTipo) {
                // Lesao do 3D: o FIS cai por dia (variacaoDiariaDeFis), sem o tombo de uma vez do motor de texto.
              } else if (e.injurySeverity === 'LIGHT' || e.injurySeverity === 'LEVE') {
                p.energia = Math.max(0, (p.energia ?? 100) - 15);
                p.fitness = p.energia;
              } else {
                p.energia = Math.max(0, 80 - (e.injuryDaysOut * 15));
                p.fitness = p.energia;
              }
              updated = true;
            }
          }
        });

        let matchRatings = f.playerRatings;
        if (!matchRatings) {
          if (homeTeam && awayTeam) {
            matchRatings = calculateMatchRatings(f.events, homeTeam, awayTeam, f.homeScore || 0, f.awayScore || 0, f.homeLineup, f.awayLineup, players);
          }
        }

        if (matchRatings) {
          Object.entries(matchRatings as Record<string, number>).forEach(([pid, rating]) => {
            const p = newPlayers.find(pl => pl.id === pid);
            if (p) {
              p.lastRating = rating;
              // Historico por partida (so jogos com detalhes, ou seja, 3D): sem duplicar o mesmo jogo.
              const det = (f.ratingDetalhes || {})[pid];
              if (det && !(p.ratingHistory || []).some(h => h.fixtureId === f.id)) {
                p.ratingHistory = [...(p.ratingHistory || []), { fixtureId: f.id, nota: rating, minutos: det.minutos, motm: f.motm === pid }];
              }
              // Bonus TAC pos-jogo: pontos de treino em tacticalAwa escalados pela nota (BASE_TAC_XP * ratingToTacMultiplier) e pela exaustão.
              const t3 = { ...(p.treino3d || {}) };
              t3.tacticalAwa = (t3.tacticalAwa || 0) + tacBonusDaNota(rating) * exaustaoMultiplier(p.energia ?? 100) * XP_POR_PONTO;
              p.treino3d = t3;
              // Ajusta moral baseado na nota
              if (rating >= 8.5) p.morale = Math.min(100, p.morale + 10);
              else if (rating >= 7.5) p.morale = Math.min(100, p.morale + 5);
              else if (rating > 7.0) p.morale = Math.min(100, p.morale + 2);   // acima de 7,0 ja ganha moral
              else if (rating <= 4.0) p.morale = Math.max(0, p.morale - 10);
              else if (rating <= 5.5) p.morale = Math.max(0, p.morale - 5);
              updated = true;
            }
          });
        }
      });

      // --- ATTRIBUTE UPDATES & SYNERGY ---
      // 1. Calculate training impacts from the schedule (for User Team)
      const schedules = gameState.trainingSchedules || [gameState.trainingSchedule, Array(7).fill(null).map(() => Array(4).fill(null)), Array(7).fill(null).map(() => Array(4).fill(null))];
      const unlockedGroups = gameState.unlockedTrainingGroups || 1;

      const groupGains = [0, 1, 2].map(grpId => {
        const gains = { def: 0, pas: 0, drb: 0, sht: 0, mor: 0, skl: {} as Record<string, number> };
        if (grpId < unlockedGroups) {
          schedules[grpId].forEach(day => {
            day.forEach(actId => {
              if (actId) {
                const act = ACTIVITIES.find(a => a.id === actId);
                if (act) {
                  act.impacts.forEach(imp => {
                    if (imp.label === 'DEF') gains.def += imp.value;
                    if (imp.label === 'PAS') gains.pas += imp.value;
                    if (imp.label === 'DRB') gains.drb += imp.value;
                    if (imp.label === 'SHT') gains.sht += imp.value;
                    if (imp.label === 'MOR') gains.mor += imp.value;
                    if (imp.label === 'SKL' && imp.campo) gains.skl[imp.campo] = (gains.skl[imp.campo] || 0) + imp.value;
                  });
                }
              }
            });
          });
        }
        return gains;
      });

      newPlayers.forEach(p => {
        const isUserPlayer = p.teamId === gameState.userTeamId;

        // Initialize training accumulated if not present
        if (!p.trainingAccumulated) {
          p.trainingAccumulated = { def: 0, pas: 0, drb: 0, sht: 0, mor: 0 };
        }
        if (p.energia === undefined) p.energia = 100;

        const pGroup = p.trainingGroupId || 0;
        // A CPU nao ganha mais aqui: o treino dela e o `cpuAplicarTreino` (so em dias de treino, com teto). So o ruido de moral fica.
        const gains = isUserPlayer ? groupGains[pGroup] : {
          def: 0,
          pas: 0,
          drb: 0,
          sht: 0,
          mor: (Math.random() - 0.5) * 4,
          skl: {} as Record<string, number>
        };

        // Reset weekly level-up indicator (Prog. column OVR growth) only on Mondays 
        const d = new Date(gameState.currentDate + 'T12:00:00');
        if (d.getDay() === 1) { // 1 = Monday
          p.weeklyGrowth = 0;
          p.trainingSessionsThisWeek = 0; // RESET SESSIONS ON MONDAY MORNING
        }

        // Calculate arrows based on training focus (points) for this simulation block
        p.lastGrowth = { def: 0, pas: 0, drb: 0, sht: 0, men: 0, fis: 0 };

        // Ensure robust initialization of tracking objects
        if (!p.trainingAccumulated) p.trainingAccumulated = { def: 0, pas: 0, drb: 0, sht: 0, mor: 0 };

        // Age factor: Young players grow faster, old players might decline
        const ageFactor = p.age < 22 ? 1.5 : (p.age > 32 ? 0.5 : 1.0);

        // Treino por atributo do 3D: os pontos de cada atributo treinado (PONTOS_POR_ATRIBUTO = +1, ver textSim/atributos3d.ts); a idade pesa como no treino de DEF/PAS/DRB/SHT.
        if (isUserPlayer && Object.keys(gains.skl).length) {
          const t3 = { ...(p.treino3d || {}) };
          // Idade x Estrelas x Exaustao (energia do inicio do dia), como nos outros atributos.
          const multSkl = ageFactor * STAR_MULTIPLIERS[starsFromPotential(p.potential)] * exaustaoMultiplier(p.energia ?? 100);
          for (const campo of Object.keys(gains.skl)) t3[campo] = (t3[campo] || 0) + gains.skl[campo] * multSkl * XP_POR_PONTO;   // XP (10 por ponto de valor da atividade)
          p.treino3d = t3;
          // Setas dos 4 grupos (TEC/TAC/MEN/PHY) pelo ganho real nos atributos: 1 seta por 1.5 pontos de foco nos atributos do grupo.
          const pontosGrupo = (campos: string[]) => campos.reduce((sum, c) => sum + (gains.skl[c] || 0) * multSkl, 0);
          const setas = (pts: number) => (pts > 0 ? Math.min(3, Math.max(1, Math.floor(pts / 1.5))) : 0);
          p.lastGrowth = { ...p.lastGrowth!, tec: setas(pontosGrupo(GRUPOS.TEC)), tac: setas(pontosGrupo(GRUPOS.TAC)), men: setas(pontosGrupo(GRUPOS.MEN)), fis: setas(pontosGrupo(GRUPOS.FIS)) };
          updated = true;
        }

        // TREINO INDIVIDUAL: cada slot `individual` de HOJE (no grupo do jogador) da +1 (x10 XP) em cada atributo que ele escolheu no overview (ou nos mais fracos de uma area), com os mesmos multiplicadores.
        if (isUserPlayer && !p.injury) {
          const diaSem = (new Date(gameState.currentDate + 'T12:00:00').getDay() + 6) % 7;
          const nInd = ((schedules[pGroup] && schedules[pGroup][diaSem]) || []).filter(a => a === 'individual').length;
          if (nInd > 0 && pGroup < unlockedGroups) {
            const t3i = { ...(p.treino3d || {}) };
            const multInd = ageFactor * STAR_MULTIPLIERS[starsFromPotential(p.potential)] * exaustaoMultiplier(p.energia ?? 100);
            for (const campo of atributosIndividuais(p).campos) t3i[campo] = (t3i[campo] || 0) + nInd * XP_POR_PONTO * multInd;
            p.treino3d = t3i;
            updated = true;
          }
        }

        ['def', 'pas', 'drb', 'sht'].forEach(attr => {
          const key = attr as 'def' | 'pas' | 'drb' | 'sht';
          const attrKey = attr as 'def' | 'pas' | 'drb' | 'sht';

          // Add points to accumulation buffer (100 points = +1 attribute)
          // Exaustao penalty applies only to the user's players (CPU training untouched)
          const exaustaoMult = isUserPlayer ? exaustaoMultiplier(p.energia ?? 100) : 1;
          const starsMultiplier = STAR_MULTIPLIERS[starsFromPotential(p.potential)];
          const points = (gains[key] || 0) * ageFactor * starsMultiplier * exaustaoMult;
          p.trainingAccumulated![key] += points;

          // Visual arrows: 1 arrow per 1.5 points of intensity in this block
          if (points > 0) p.lastGrowth![attrKey] = Math.min(3, Math.max(1, Math.floor(points / 1.5)));
          else if (points < 0) p.lastGrowth![attrKey] = Math.max(-3, Math.min(-1, Math.ceil(points / 1.5)));

          if (points !== 0) updated = true;

          // O teto (CT e crescimento por idade/potencial) limita o treino: no teto o atributo para e o cofre nao enche (so a subida; a queda continua).
          if (points > 0) garantirBaseLegacy(p);
          const tetoAtr = tetoDoLegacy(p, attrKey);
          if (p[attrKey] >= tetoAtr && p.trainingAccumulated![key] > 99) p.trainingAccumulated![key] = 99;
          while (p.trainingAccumulated![key] >= 100 && p[attrKey] < tetoAtr) {
            p[attrKey] = Math.min(99, p[attrKey] + 1);
            p.trainingAccumulated![key] -= 100;
            p.weeklyGrowth = (p.weeklyGrowth || 0) + 1;
            updated = true;
          }
          while (p.trainingAccumulated![key] <= -100) {
            p[attrKey] = Math.max(50, p[attrKey] - 1);
            p.trainingAccumulated![key] += 100;
            p.weeklyGrowth = (p.weeklyGrowth || 0) - 1;
            updated = true;
          }
        });

        // Update morale and energy
        const oldMorale = p.morale;
        p.morale = Math.min(100, Math.max(0, p.morale + gains.mor));
        if (p.morale !== oldMorale) updated = true;
      });

      // Update Synergy for all teams that played today
      setTeams(prevTeams => prevTeams.map(t => {
        let updatedT = { ...t };

        // Maintenance fee for extra training groups on Mondays
        if (t.id === gameState.userTeamId) {
          const d = new Date(gameState.currentDate + 'T12:00:00');
          if (d.getDay() === 1) { // 1 = Monday
            const extraGroups = (gameState.unlockedTrainingGroups || 1) - 1;
            if (extraGroups > 0) {
              updatedT.cash -= (extraGroups * 10000);
            }
          }
        }

        const match = todaysFixtures.find(f => f.homeTeamId === t.id || f.awayTeamId === t.id);
        if (!match) return updatedT;

        const newSynergy = { ...(updatedT.synergyMap || {}) };
        const starters = updatedT.lineup.filter(id => id); // Only existing IDs

        for (let i = 0; i < starters.length; i++) {
          for (let j = i + 1; j < starters.length; j++) {
            const p1 = starters[i];
            const p2 = starters[j];
            const key = p1 < p2 ? `${p1}-${p2}` : `${p2}-${p1}`;
            newSynergy[key] = (newSynergy[key] || 0) + 90; // Add 90 minutes for playing together
          }
        }

        return { ...updatedT, synergyMap: newSynergy };
      }));

      return updated ? newPlayers : prevPlayers;
    });

    setGameState(prev => {
      const d = new Date(prev.currentDate + 'T12:00:00');
      d.setDate(d.getDate() + 1); // Avança apenas 1 dia, o CONTINUAR faz o resto
      return {
        ...prev,
        currentWeek: prev.currentWeek < prev.totalWeeks ? prev.currentWeek + 1 : prev.currentWeek,
        currentDate: d.toISOString().split('T')[0],
        matchMinute: 0,
        isProcessing: false,
        matchVisual: undefined,
        // trainingSchedule is now persistent, do NOT reset here
      };
    });
  };

  const reportLiveGoal = (fixtureId: string, side: 'home' | 'away', scorerId?: string) => {
    setFixtures(prev => prev.map(f => {
      if (f.id !== fixtureId) return f;
      const scorer = players.find(p => p.id === scorerId);
      const newEvents: MatchEvent[] = [...(f.events || []), {
        minute: gameState.matchMinute,
        type: 'GOAL',
        description: scorer?.name || 'Goal',
        teamId: side === 'home' ? f.homeTeamId : f.awayTeamId,
        playerId: scorerId
      }];
      return {
        ...f,
        homeScore: side === 'home' ? (f.homeScore || 0) + 1 : f.homeScore,
        awayScore: side === 'away' ? (f.awayScore || 0) + 1 : f.awayScore,
        events: newEvents
      };
    }));

    // O gol NÃO é somado aqui: advanceWeek agrega a artilharia a partir dos
    // eventos da partida. Incrementar nos dois lugares contava o gol duas vezes
    // sempre que o usuário jogava no modo visual.
  };

  const reportMatchEvent = (fixtureId: string, event: Partial<MatchEvent>) => {
    setFixtures(prev => prev.map(f => {
      if (f.id !== fixtureId) return f;
      const newEvent: MatchEvent = {
        minute: event.minute || gameState.matchMinute,
        type: event.type || 'COMMENT',
        description: event.description || '',
        teamId: event.teamId || '',
        playerId: event.playerId,
        injurySeverity: event.injurySeverity,
        injuryName: event.injuryName,
        injuryDaysOut: event.injuryDaysOut
      };
      return { ...f, events: [...(f.events || []), newEvent] };
    }));

    if (event.type === 'INJURY' && event.playerId && event.injuryName && event.injuryDaysOut && event.injurySeverity) {
      setPlayers(prev => prev.map(p => {
        if (p.id === event.playerId) {
          const isLight = event.injurySeverity === 'LIGHT';
          const newFit = isLight ? (p.energia ?? 100) : Math.max(0, 80 - (event.injuryDaysOut! * 15));
          return {
            ...p,
            energia: newFit,
            fitness: newFit,
            injury: { type: event.injuryName!, daysOut: event.injuryDaysOut!, severity: event.injurySeverity! }
          };
        }
        return p;
      }));
    }
  };

  const pauseMatch = () => {
    if (matchTimerRef.current) clearTimeout(matchTimerRef.current);
    setGameState(prev => ({ ...prev, isProcessing: false }));
  };

  // RESET do dia de jogo (MatchDay): zera o relogio, o placar e os eventos dos jogos de hoje que ainda nao acabaram, e esquece o
  // resultado/minuto do motor 3D. O 3D e recriado pelo MatchDay (a entrada dos times corre de novo). Jogo ja concluido nao se reinicia.
  const resetMatchDay = () => {
    setAvisoGoleiro(false);
    setAvisoLesao([]);
    if (matchTimerRef.current) clearTimeout(matchTimerRef.current);
    const hoje = gameState.currentDate;
    if (gameState.matchMinute >= maxDurationRef.current) return;
    fixtures.filter(f => f.date === hoje && !f.played).forEach(f => { delete motor3dRes.current[f.id]; });
    (window as any).motor3dMinuto = undefined;
    setFixtures(prev => prev.map(f => (f.date === hoje && !f.played)
      ? { ...f, homeScore: 0, awayScore: 0, events: [], possessionTimeline: [], ballZoneTimeline: [] } : f));
    setGameState(prev => ({ ...prev, isProcessing: false, matchMinute: 0, matchMode: 'NONE' }));
  };

  // Corre o jogo do utilizador no motor 3D (oculto, ritmo maximo) e guarda o resultado. Se falhar, o textSim assume como antes.
  const prepararMotor3D = async () => {
    const uf = fixtures.find(f => f.date === gameState.currentDate && !f.played && (f.homeTeamId === gameState.userTeamId || f.awayTeamId === gameState.userTeamId));
    if (!uf || motor3dRes.current[uf.id]) return;
    const casa = teams.find(t => t.id === uf.homeTeamId), fora = teams.find(t => t.id === uf.awayTeamId);
    if (!casa || !fora) return;
    setMotor3dProgresso(0);
    try {
      const r = await jogarOculto(montarPayload(casa, fora, players, gameState.userTeamId), m => setMotor3dProgresso(m));
      const res = aplicarResultado(uf, r, casa, fora, players);
      motor3dRes.current[uf.id] = res;
      // Evita que o jogo de hoje precise de ser decidido outra vez pelo textSim.
      matchResultsCache.current = [];
    } catch (e) {
      console.warn('Simulador 3D indisponivel, a usar o simulador de texto:', e);
    } finally {
      setMotor3dProgresso(null);
    }
  };

  // Do resultado do motor so aparece o que ja aconteceu ate ao minuto `min`.
  const revelarMotor3D = (f: Fixture, min: number): Fixture => {
    const res = motor3dRes.current[f.id];
    if (!res) return f;
    const events = res.events.filter(e => e.minute <= min);
    let h = 0, a = 0;
    events.forEach(e => { if (e.type === 'GOAL') { if (e.teamId === f.homeTeamId) h++; else a++; } });
    return { ...res, events, homeScore: h, awayScore: a, played: false };
  };

  // A classificacao do campeonato para o modal do intervalo no 3D: so jogos de liga ja jogados mais o resultado provisorio do jogo em curso. Por equipa: pontos,
  // vitorias e os ultimos 5 resultados (V/E/D, do mais antigo para o mais recente).
  const classificacaoDoIntervalo = (uf: Fixture) => {
    type Linha = { t: Team; pts: number; v: number; gf: number; ga: number; forma: ('V' | 'E' | 'D')[] };
    const tab = new Map<string, Linha>(teams.filter(t => naLigaDoUtilizador(t, userTeam)).map(t => [t.id, { t, pts: 0, v: 0, gf: 0, ga: 0, forma: [] }]));
    const jogos = fixtures.filter(f => f.played && countsForLeague(f)).map(f => ({ f, hs: f.homeScore || 0, as: f.awayScore || 0 }));
    // Os jogos de HOJE ainda a decorrer (o do utilizador e os outros da jornada, que o manager simula minuto a minuto) entram com o resultado parcial.
    // O placar parcial: o do jogo, ou (se ainda nao estiver escrito) os golos contados nos eventos ate agora.
    const golosDe = (f: Fixture, casa: boolean) => {
      const doEstado = casa ? (f.homeScore || 0) : (f.awayScore || 0);
      const dosEventos = (f.events || []).filter(e => e.type === 'GOAL' && e.teamId === (casa ? f.homeTeamId : f.awayTeamId)).length;
      return Math.max(doEstado, dosEventos);
    };
    // (inclui o jogo mesmo que seja um amistoso: e a tabela "como ficaria" com os resultados de agora)
    fixtures.filter(f => !f.played && f.date === uf.date).forEach(f => jogos.push({ f, hs: golosDe(f, true), as: golosDe(f, false) }));
    if (uf && !uf.played && !jogos.some(j => j.f.id === uf.id)) jogos.push({ f: uf, hs: uf.homeScore || 0, as: uf.awayScore || 0 });
    jogos.sort((a, b) => (a.f.date < b.f.date ? -1 : a.f.date > b.f.date ? 1 : 0));
    jogos.forEach(({ f, hs, as }) => {
      const h = tab.get(f.homeTeamId), a = tab.get(f.awayTeamId);
      if (!h || !a) return;
      h.gf += hs; h.ga += as; a.gf += as; a.ga += hs;
      if (hs > as) { h.pts += 3; h.v++; h.forma.push('V'); a.forma.push('D'); }
      else if (as > hs) { a.pts += 3; a.v++; a.forma.push('V'); h.forma.push('D'); }
      else { h.pts++; a.pts++; h.forma.push('E'); a.forma.push('E'); }
    });
    const emCurso = jogos.filter(j => !j.f.played).map(j => `${tab.get(j.f.homeTeamId)?.t.name} ${j.hs}-${j.as} ${tab.get(j.f.awayTeamId)?.t.name}`);
    console.log('[classificacao do intervalo] jogos em curso incluidos:', emCurso.length, emCurso);
    (classificacaoDoIntervalo as any).ultimoEmCurso = emCurso.length;
    const vivo = new Map<string, string>();
    jogos.filter(j => !j.f.played).forEach(j => { vivo.set(j.f.homeTeamId, `${j.hs}-${j.as}`); vivo.set(j.f.awayTeamId, `${j.as}-${j.hs}`); });
    const ordem = Array.from(tab.values()).sort((a, b) => (b.pts - a.pts) || ((b.gf - b.ga) - (a.gf - a.ga)) || (b.gf - a.gf));
    return ordem.map((l, i) => ({
      pos: i + 1, nome: l.t.name, logo: escudoUrl((l.t as any).logoUrl) || null, cores: [l.t.primaryColor, l.t.secondaryColor, l.t.tertiaryColor],
      pts: l.pts, v: l.v, forma: l.forma.slice(-5), vivo: vivo.get(l.t.id) || null, destaque: !!uf && (l.t.id === uf.homeTeamId || l.t.id === uf.awayTeamId)
    }));
  };

  // O aviso do goleiro expulso (ver 3dMatch/avisoGoleiro.ts): o MatchDay chama-o no TOPO do `aoMensagem`, antes de a expulsao abrir o Tactics (que desmonta o MatchDay).
  const avisoGoleiroMensagem = (m: any) => {
    const uf = fixtures.find(f => f.date === gameState.currentDate && (f.homeTeamId === gameState.userTeamId || f.awayTeamId === gameState.userTeamId));
    const r = avisoDoGoleiro(m, uf?.homeTeamId, gameState.userTeamId);
    if (r !== null) setAvisoGoleiro(r);
  };
  // Outro dia / outro jogo: o aviso de um jogo que acabou sem `fim` (ex.: a simulacao instantanea) nao fica preso.
  useEffect(() => { setAvisoGoleiro(false); setAvisoLesao([]); }, [gameState.currentDate]);
  // O departamento medico e do clube e vai no save: saves antigos (sem `medico`) o recebem aqui, uma vez, no nivel da divisao do clube.
  useEffect(() => { if (teams.some(t => !t.medico)) setTeams(prev => prev.map(t => garantirMedico(t, faixaDoClube(t)))); }, [teams]);

  // Modo 3D: o motor corre ao vivo no iframe; aqui chegam os eventos dele. O relogio do manager espera por window.motor3dMinuto.
  const motor3dMensagem = (m: any) => {
    const uf = fixtures.find(f => f.date === gameState.currentDate && (f.homeTeamId === gameState.userTeamId || f.awayTeamId === gameState.userTeamId));
    if (!uf) return;
    const casa = teams.find(t => t.id === uf.homeTeamId)!, fora = teams.find(t => t.id === uf.awayTeamId)!;
    const w = window as any;
    if (m.tipo === 'estado') {
      w.motor3dMinuto = m.minuto;
    } else if (m.tipo === 'evento') {
      w.motor3dMinuto = Math.max(w.motor3dMinuto || 0, m.evento.minuto);
      const novos = eventosDoManager({ eventos: [{ ...m.evento, texto: m.linha ? m.linha.texto : null }] } as any, casa, fora, players);
      if (novos.length === 0) return;
      setFixtures(prev => prev.map(f => {
        if (f.id !== uf.id) return f;
        let h = f.homeScore || 0, a = f.awayScore || 0;
        novos.forEach(e => { if (e.type === 'GOAL') { if (e.teamId === f.homeTeamId) h++; else a++; } });
        return { ...f, events: [...(f.events || []), ...novos], homeScore: h, awayScore: a };
      }));
    } else if (m.tipo === 'energia') {
      /*
      A stamina do 3D (o deposito de cada jogador, de minuto a minuto e no fim) passa a ser a `energia` do manager: o cartao do 3D, as barras do Tactics e o resto leem o mesmo numero. O jogo comeca
      com o deposito = energia do manager (AdaptadorManager.jogador -> energiaInicial). `mapa`: id real do motor (digitos de 'p-269063') -> %.
      */
      const mapa: Record<string, number> = m.mapa || {};
      setPlayers(prev => prev.map(p => {
        const d = (/(\d+)$/.exec(String(p.id)) || [])[1];
        const e = d !== undefined ? mapa[d] : undefined;
        if (typeof e !== 'number') return p;
        const en = Math.max(0, Math.min(100, e));
        return en !== p.energia ? { ...p, energia: en, fitness: en } : p;
      }));
    } else if (m.tipo === 'lesao') {
      /*
      Lesao sofrida no 3D (js/injuries/injury_match.js), de qualquer dos dois times: vira um evento INJURY do jogo, e o fecho do dia (o bloco dos eventos INJURY) a grava no jogador. `dias` e o
      prazo REAL (ja com o tratamento do medico do clube), `estimativa` o que o medico diz ao manager. Mesmo jogador, uma segunda lesao (agravamento) substitui a primeira.
      */
      const time = m.lado === 'casa' ? casa : fora;
      const real = Number(m.jogador);
      const jog = players.find(p => p.teamId === time.id && (/(\d+)$/.exec(String(p.id)) || [])[1] === String(real));
      if (!jog) return;
      // Jogador do utilizador com lesao: o card de estatisticas avisa ate o Tactics ser aberto (limparAvisoLesao).
      if (time.id === gameState.userTeamId) { const nome = jog.name.split(' ').pop() || jog.name; setAvisoLesao(prev => (prev.includes(nome) ? prev : [...prev, nome])); }
      const minuto = typeof m.minuto === 'number' ? m.minuto : (w.motor3dMinuto || 0);
      const gravidade = severidadeDaLesao(m.tipoLesao === 'Complexa' ? 'Complexa' : 'Simples', m.dias);
      const ev: MatchEvent = {
        minute: minuto, type: 'INJURY', teamId: time.id, playerId: jog.id,
        description: `✚ ${jog.name.split(' ').pop()}: ${m.nome}${m.estado !== 'Hurt' && time.id === gameState.userTeamId ? ' — precisa ser substituído' : ''}`,
        injurySeverity: gravidade, injuryName: m.nome, injuryDaysOut: m.dias, injuryTipo: m.tipoLesao === 'Complexa' ? 'Complexa' : 'Simples',
        injuryEstimate: m.estimativa, injuryFisDrop: m.quedaFisPorDia || 0, injuryId: m.idLesao
      };
      setFixtures(prev => prev.map(f => (f.id !== uf.id ? f : { ...f, events: [...(f.events || []).filter(e => !(e.type === 'INJURY' && e.playerId === jog.id)), ev] })));
    } else if (m.tipo === 'substituicao_feita') {
      /*
      Uma troca que o 3D fez sozinho no time do UTILIZADOR (goleiro expulso: o reserva depois da espera, ou o pedido do manager com o goleiro expulso a sair, que o 3D corrigiu):
      a escalacao, o banco, o evento SUB e o contador de trocas acompanham o 3D (sem isto a troca seguinte do utilizador caia, o reserva podia entrar duas vezes e o limite de
      5 deixava de valer). Nao passa pelo `updateTactics`: esse reenviaria a troca ao 3D. As trocas do adversario no 3D nao sao seguidas no manager (como as do treinador da CPU).
      */
      const meuLado = uf.homeTeamId === gameState.userTeamId ? 'casa' : 'fora';
      if (m.lado !== meuLado) return;
      const meu = meuLado === 'casa' ? casa : fora;
      const r = aplicarTrocaDo3d(meu.lineup || [], meu.bench || [], m, players.filter(p => p.teamId === meu.id).map(p => p.id));
      // Sem correspondencia (o reserva veio do plantel com o banco do manager vazio, ou ids desconhecidos): nao se mexe na escalacao (nada de buracos ou repetidos).
      if (!r) { console.warn('[3D] substituicao_feita sem correspondencia na escalacao do manager (escalacao inalterada)', m); return; }
      setTeams(prev => prev.map(t => (t.id === meu.id ? { ...t, lineup: r.lineup, bench: r.bench } : t)));
      setFixtures(prev => prev.map(f => {
        if (f.id !== uf.id) return f;
        const nf: Fixture = { ...f };
        if (meuLado === 'casa') nf.homeLineup = [...r.lineup]; else nf.awayLineup = [...r.lineup];
        if (r.conta) {
          if (meuLado === 'casa') nf.subsUsedHome = (f.subsUsedHome || 0) + 1; else nf.subsUsedAway = (f.subsUsedAway || 0) + 1;
          const nome = (id: string | null) => (id ? players.find(p => p.id === id)?.name.split(' ').pop() || '' : '');
          const minuto = typeof w.motor3dMinuto === 'number' && w.motor3dMinuto !== 999 ? w.motor3dMinuto : gameState.matchMinute;
          nf.events = [...(f.events || []), { minute: minuto, type: 'SUB', description: `🔻 ${nome(r.sai)}   🔼 ${nome(r.entra)}`, teamId: meu.id, playerId: r.entra || undefined, subbedOutId: r.sai || undefined }];
        }
        return nf;
      }));
    } else if (m.tipo === 'disputa_fim') {
      // A disputa de penaltis em 3D acabou: guarda o resultado para gravar quando o confronto aparecer empatado nas copas (e o modal de texto nao abrir).
      guardarPenaltis3d(uf.id, m.pens);
    } else if (m.tipo === 'placar_ajustado') {
      // O clique na sigla de um clube no placar do 3D somou +1 (sem evento de golo): o resultado do jogo acompanha o do motor.
      setFixtures(prev => prev.map(f => (f.id === uf.id ? { ...f, homeScore: m.placar.casa, awayScore: m.placar.fora } : f)));
    } else if (m.tipo === 'intervalo_iniciado') {
      // As estatisticas abriram no 3D: manda a classificacao ate este momento (com o resultado provisorio do jogo em curso).
      // So jogos de campeonato: no intervalo de uma copa a tabela da liga nao se mostra.
      // As estatisticas do 3D (as mesmas do modal do intervalo) ficam no jogo: a tela MATCH STATISTICS do manager mostra-as em vez de as recontar pelos eventos.
      if (Array.isArray(m.estatLinhas)) setFixtures(prev => prev.map(f => (f.id === uf.id ? { ...f, estat3d: m.estatLinhas } : f)));
      // Copas e AMISTOSOS nao levam a tabela do campeonato ao lado das estatisticas e das notas (intervalo, fim e botao Statistics).
      const linhas = (uf.type !== 'CUP' && !uf.isFriendly && !String(uf.id).startsWith('fix-friendly-')) ? classificacaoDoIntervalo(uf) : [];
      if (linhas.length) simulador3dEnviar({ tipo: 'classificacao', linhas, emCurso: (classificacaoDoIntervalo as any).ultimoEmCurso || 0 });
      // As notas dos jogadores ate este momento, no mesmo ecra das estatisticas (nome curto e nota, de cada equipa, pela nota).
      try {
        // As notas do proprio 3D (js/ratings) quando vieram; senao o calculo antigo, por eventos.
        const dm = m.notas && Object.keys(m.notas).length ? notasDoMotor(m.notas, casa, fora, players) : null;
        const doMotor = dm ? dm.playerRatings : null;
        // As MESMAS notas do 3D passam para o jogo: a tela MATCH STATISTICS do manager (fora da tela cheia) mostrava as do calculo por eventos, com valores e ordem diferentes.
        if (dm) setFixtures(prev => prev.map(f => (f.id === uf.id ? { ...f, playerRatings: dm.playerRatings, ratingDetalhes: dm.ratingDetalhes, ...(dm.motm ? { motm: dm.motm } : {}) } : f)));
        const notas = doMotor || calculateMatchRatings(uf.events || [], casa, fora, uf.homeScore || 0, uf.awayScore || 0, uf.homeLineup, uf.awayLineup, players);
        const lado = (t: Team) => Object.entries(notas)
          .map(([id, nota]) => ({ p: players.find(x => x.id === id), nota: nota as number }))
          .filter(x => x.p && x.p.teamId === t.id)
          .sort((a, b) => ordemDaPosicao(a.p!) - ordemDaPosicao(b.p!) || b.nota - a.nota)
          .map(x => {
            const d = dm ? dm.ratingDetalhes[x.p!.id] : undefined;   // com as notas do 3D a tabela leva o detalhe (posicao, minutos, gols, componentes)
            return { nome: String(x.p!.name).split(' ').pop(), nota: Math.round(x.nota * 10) / 10, ...(d ? { pos: d.pos === 'CF' ? 'ST' : d.pos, minutos: d.minutos, golos: d.golos || 0, assistencias: d.assistencias || 0, moc: !!d.moc, def: d.def || 0, tatico: d.tatico, tecnico: d.tecnico, participacao: d.participacao, disciplina: d.disciplina } : {}) };
          });
        simulador3dEnviar({ tipo: 'notas', casa: { nome: casa.name, jogadores: lado(casa) }, fora: { nome: fora.name, jogadores: lado(fora) } });
      } catch (e) { console.warn('[notas do intervalo]', e); }
    } else if (m.tipo === 'intervalo_pronto') {
      // O campo ficou vazio e o 3D mostra as estatisticas: o relogio do manager para no intervalo (o botao passa a CONTINUAR) e o treinador decide quando sai o 2.o tempo.
      if (matchTimerRef.current) clearTimeout(matchTimerRef.current);
      setGameState(prev => ({ ...prev, isProcessing: false, matchMode: 'NONE', matchMinute: Math.max(prev.matchMinute, maxHTDurationRef.current) }));
    } else if (m.tipo === 'fim') {
      motor3dRes.current[uf.id] = aplicarResultado(uf, m.resultado, casa, fora, players);
      w.motor3dMinuto = 999;
    }
  };

  // O modo vem do chamador: gameState.view nunca chega a 'MATCH' (a tela e estado local do App), por isso nao serve para decidir.
  // Escalacao incompleta com jogo hoje: nem o 3D nem o jogo rapido nem a simulacao da rodada comecam (o App tambem leva o treinador ao MATCH TACTICS).
  const escalacaoBloqueiaJogo = () => {
    const ut = teams.find(x => x.id === gameState.userTeamId);
    if (!ut) return false;
    const temJogo = fixtures.some(f => f.date === gameState.currentDate && !f.played && (f.homeTeamId === ut.id || f.awayTeamId === ut.id));
    return temJogo && slotsVazios(ut, players, jogoEmAndamento(gameState.matchMinute)).length > 0;
  };

  const playMatchDay = (modo?: any) => {
    if (gameState.isProcessing || motor3dProgresso !== null) return;
    if (escalacaoBloqueiaJogo()) return;
    if (modo !== 'VISUAL') {
      prepararMotor3D().then(() => playMatchDayCore('SIMULATION'));
    } else {
      playMatchDayCore('VISUAL');
    }
  };

  const playMatchDayCore = (modo: MatchMode) => {
    if (gameState.isProcessing) return;
    // No acrescimo (relogio do manager nos 90, 3D ainda a jogar) retomar depois de pausar tem de ser possivel.
    const m3dEmCurso = typeof (window as any).motor3dMinuto === 'number' && (window as any).motor3dMinuto !== 999;
    if (gameState.matchMinute >= maxDurationRef.current && !(modo === 'VISUAL' && m3dEmCurso)) return;

    // Determine mode based on current view
    const mode: MatchMode = modo;
    // Continuar depois do intervalo: o 3D espera o treinador (campo vazio, estatisticas); o 2.o tempo so sai quando ele manda continuar.
    if (mode === 'VISUAL' && (window as any).motor3dMinuto !== undefined && gameState.matchMinute >= maxHTDurationRef.current) simulador3dEnviar({ tipo: 'segundo_tempo' });
    setGameState(prev => ({ ...prev, isProcessing: true, matchMode: mode }));

    const todays = fixtures.filter(f => f.date === gameState.currentDate);

    // Track total simulation steps (4 steps = 1 minute)
    let totalTicks = gameState.matchMinute * 4;

    const runTick = () => {
      const min = Math.floor(totalTicks / 4);
      const tick = totalTicks % 4;

      const w3d = (window as any).motor3dMinuto;
      if (mode === 'VISUAL' && w3d !== undefined) {
        const uf3 = todays.find(f => f.homeTeamId === gameState.userTeamId || f.awayTeamId === gameState.userTeamId);
        if (uf3 && !motor3dRes.current[uf3.id] && (min >= maxDurationRef.current || min > w3d)) {
          matchTimerRef.current = setTimeout(runTick, 200);
          return;
        }
      }
      if (min >= maxDurationRef.current) {
        if (mode === 'VISUAL') (window as any).motor3dMinuto = undefined;
        setGameState(currentGS => ({ ...currentGS, isProcessing: false, matchMinute: maxDurationRef.current, matchMode: 'NONE' }));
        setFixtures(prevFixtures => {
          return prevFixtures.map(f => {
            if (f.date === gameState.currentDate && !f.played) {
              if (motor3dRes.current[f.id]) return { ...motor3dRes.current[f.id], played: true };
              return simulateMatch(f, teams, players, Math.max(1, f.events && f.events.length > 0 ? f.events[f.events.length - 1].minute + 1 : 1), gameState.userTeamId, gameState.language);
            }
            return f;
          });
        });
        return;
      }

      setGameState(currentGS => {
        if (!currentGS.isProcessing) {
          return { ...currentGS, matchMode: 'NONE' };
        }
        return { ...currentGS, matchMinute: min };
      });

      // --- 1. SIMULATE MATCHES (One sub-tick) ---
      setFixtures(prevFixtures => {
        const userFixture = todays.find(f => f.homeTeamId === gameState.userTeamId || f.awayTeamId === gameState.userTeamId);

        let currentMaxDuration = 90;
        let currentMaxHTDuration = 45;

        const nextFixtures = prevFixtures.map(f => {
          if (f.date === gameState.currentDate && !f.played) {
            let updatedF = f;
            // If in VISUAL mode, DO NOT simulate the user match, let the component handle it
            if (mode === 'VISUAL' && f.id === userFixture?.id) {
              updatedF = f;
            } else if (motor3dRes.current[f.id]) {
              updatedF = revelarMotor3D(f, min);
            } else {
              updatedF = simulateMatch(f, teams, players, min, gameState.userTeamId, gameState.language, min, tick, maxHTDurationRef.current);
            }

            const htDuration = getHalfTimeMinute(updatedF.events);
            if (htDuration > currentMaxHTDuration) currentMaxHTDuration = htDuration;

            const duration = getMatchEndMinute(updatedF.events);
            if (duration > currentMaxDuration) currentMaxDuration = duration;
            return updatedF;
          }

          if (f.date === gameState.currentDate && f.played) {
            const htDuration = getHalfTimeMinute(f.events);
            if (htDuration > currentMaxHTDuration) currentMaxHTDuration = htDuration;

            const duration = getMatchEndMinute(f.events);
            if (duration > currentMaxDuration) currentMaxDuration = duration;
          }
          return f;
        });
        maxDurationRef.current = currentMaxDuration;
        maxHTDurationRef.current = currentMaxHTDuration;
        return nextFixtures;
      });

      // --- 2. FITNESS DEPLETION (Only once per minute, on tick 0) ---
      if (tick === 0) {
        setPlayers(prevPlayers => {
          const starters = new Set<string>();
          todays.forEach(f => {
            const hT = teams.find(t => t.id === f.homeTeamId);
            const aT = teams.find(t => t.id === f.awayTeamId);
            if (hT) hT.lineup.forEach(id => { if (id) starters.add(id); });
            if (aT) aT.lineup.forEach(id => { if (id) starters.add(id); });
          });

          // Jogo em 3D ao vivo: a stamina vem do deposito do 3D (mensagem `energia`), nao da formula por minuto.
          const ufId = fixtures.find(f => f.date === gameState.currentDate && (f.homeTeamId === gameState.userTeamId || f.awayTeamId === gameState.userTeamId))?.id;
          const em3d = typeof (window as any).motor3dMinuto === 'number' && (window as any).motor3dMinuto !== 999 ? todays.find(f => f.id === ufId) : undefined;
          return prevPlayers.map(p => {
            if (!starters.has(p.id)) return p;
            if (em3d && (p.teamId === em3d.homeTeamId || p.teamId === em3d.awayTeamId)) return p;
            const team = teams.find(t => t.id === p.teamId);
            const tactics = team?.tactics;
            // Mesma fórmula usada pelo motor: assistir e simular a partida
            // precisam desgastar o elenco exatamente igual.
            const perMinute = matchFatiguePerMinute(tactics, p.position, campo3d(p, ['stamina']));
            let injuryMultiplier = 1;
            const f = todays.find(f => f.homeTeamId === p.teamId || f.awayTeamId === p.teamId);
            if (f && f.events) {
              const pEvents = f.events.filter(e => e.playerId === p.id && e.type === 'INJURY');
              if (pEvents.length > 0) {
                const severities = pEvents.map(e => e.injurySeverity);
                if (severities.includes('SEVERE')) injuryMultiplier = 20;
                else if (severities.includes('MEDIUM')) injuryMultiplier = 10;
                else if (severities.includes('LIGHT')) injuryMultiplier = 4;
              }
            }

            let newFit = (p.energia ?? 100) - (perMinute * injuryMultiplier);
            if (min === 45) newFit = Math.min(100, newFit + 3);
            return { ...p, energia: Math.max(0, newFit), fitness: Math.max(0, newFit) };
          });
        });
      }

      // HALFTIME STOP: Stop when we hit the dynamic halftime limit, but only if we didn't start the simulation AFTER it.
      // We use the 'gameState.matchMinute' captured at the moment playMatchDay was called.
      // Com o 3D ao vivo quem manda no intervalo e ele (a mensagem `intervalo_pronto`, que para o relogio): parar aos 45' fazia o jogo pausar no meio do 1.o tempo
      // do 3D, que corre ate 45' mais o acrescimo.
      const intervaloDoMotor3D = mode === 'VISUAL' && typeof (window as any).motor3dMinuto === 'number';
      if (!intervaloDoMotor3D && min === maxHTDurationRef.current && tick === 0 && totalTicks > 0 && gameState.matchMinute < maxHTDurationRef.current) {
        setGameState(prev => ({ ...prev, isProcessing: false }));
        return;
      }

      totalTicks++;
      const currentSpeed = simulationSpeedRef.current || 1;
      let delay = currentSpeed === 3 ? 333 : currentSpeed === 2 ? 500 : 1000;

      // O relógio do manager acompanha o do 3D: com o 3D à frente (o jogo dele corre ao ritmo próprio), recupera depressa, minuto a minuto,
      // em vez de ficar a mostrar 6' enquanto o placar do 3D diz 30:03.
      const w3dAtras = (window as any).motor3dMinuto;
      const atrasadoDoMotor = mode === 'VISUAL' && typeof w3dAtras === 'number' && w3dAtras < 900 && (w3dAtras - Math.floor(totalTicks / 4)) > 1;
      if (atrasadoDoMotor) delay = 30;

      const scheduleNext = () => {
        if ((window as any).isNarrationPlaying && !atrasadoDoMotor) {
          matchTimerRef.current = setTimeout(scheduleNext, 150);
        } else {
          runTick();
        }
      };

      matchTimerRef.current = setTimeout(scheduleNext, delay);
    };

    runTick();
  };

  const finishMatchDayInstant = async () => {
    if (escalacaoBloqueiaJogo()) return;
    pauseMatch();
    if (motor3dProgresso !== null) return;
    await prepararMotor3D();
    const todays = fixtures.filter(f => f.date === gameState.currentDate);

    // Always resimulate for Instant Result to guarantee fresh tactics, or use cache if it's there
    let results = matchResultsCache.current;
    if (results.length === 0 || results[0].date !== gameState.currentDate) {
      // Auto-manage CPU teams BEFORE simulation
      todays.forEach(f => {
        const homeT = teams.find(t => t.id === f.homeTeamId);
        const awayT = teams.find(t => t.id === f.awayTeamId);
        const chaveJogo = chaveCompeticao(f, comps);
        const susp = (p: Player) => estaSuspenso(p, chaveJogo);
        if (homeT && homeT.id !== gameState.userTeamId && awayT) manageCPUTeam(homeT, awayT, players, susp);
        if (awayT && awayT.id !== gameState.userTeamId && homeT) manageCPUTeam(awayT, homeT, players, susp);
      });
      results = todays.map(f => motor3dRes.current[f.id] ? motor3dRes.current[f.id] : simulateMatch(f, teams, players, gameState.matchMinute + 1, gameState.userTeamId, gameState.language));
      matchResultsCache.current = results;
    }

    const isFirstHalf = gameState.matchMinute < maxHTDurationRef.current;

    // Scan for user's red card between matchMinute+1 and end to dynamically pause
    const userMatch = results.find(r => r.homeTeamId === gameState.userTeamId || r.awayTeamId === gameState.userTeamId);
    let redCardMinute = 999;
    if (userMatch) {
      const redCards = userMatch.events.filter(e =>
        e.minute > gameState.matchMinute &&
        e.type === 'CARD' && e.description.includes('RED CARD') &&
        e.teamId === gameState.userTeamId
      );
      if (redCards.length > 0) {
        redCards.sort((a, b) => a.minute - b.minute);
        redCardMinute = redCards[0].minute;
      }
    }

    let globalTargetMinute = isFirstHalf ? maxHTDurationRef.current : 90;

    setFixtures(prev => prev.map(f => {
      const res = results.find(r => r.id === f.id);
      if (!res) return f;

      const htAddedTime = getStoppageTime(res.events, 45);
      const addedTime = getStoppageTime(res.events, 90);
      let fTargetMinute = isFirstHalf ? (45 + htAddedTime) : (90 + addedTime);
      if (redCardMinute < fTargetMinute) fTargetMinute = redCardMinute;

      if (!isFirstHalf && (90 + addedTime) > globalTargetMinute) {
        globalTargetMinute = 90 + addedTime;
      }

      const appliedEvents = res.events.filter(e => e.minute <= fTargetMinute);
      let h = 0, a = 0;
      appliedEvents.forEach(e => {
        if (e.type === 'GOAL') {
          if (e.teamId === f.homeTeamId) h++; else a++;
        }
      });

      const isPlayed = fTargetMinute >= (90 + addedTime);
      const appliedPossession = res.possessionTimeline ? res.possessionTimeline.slice(0, fTargetMinute) : f.possessionTimeline;
      const appliedBallZone = res.ballZoneTimeline ? res.ballZoneTimeline.slice(0, fTargetMinute) : f.ballZoneTimeline;

      return {
        ...f,
        ...res,
        homeScore: h,
        awayScore: a,
        events: appliedEvents,
        played: isPlayed,
        possessionTimeline: appliedPossession,
        ballZoneTimeline: appliedBallZone,
      };
    }));

    if (redCardMinute < globalTargetMinute && redCardMinute !== 999) {
      globalTargetMinute = redCardMinute;
    }

    setGameState(prev => ({ ...prev, isProcessing: false, matchMinute: globalTargetMinute, matchMode: 'NONE' }));

    // --- FITNESS DEPLETION (INSTANT RESULT JUMP) ---
    const minutesPlayed = globalTargetMinute - gameState.matchMinute;
    if (minutesPlayed > 0) {
      setPlayers(prevPlayers => {
        const playersToUpdate = new Set<string>();
        todays.forEach(f => {
          const hTeam = teams.find(t => t.id === f.homeTeamId);
          const aTeam = teams.find(t => t.id === f.awayTeamId);
          if (hTeam) hTeam.lineup.forEach(id => { if (id) playersToUpdate.add(id); });
          if (aTeam) aTeam.lineup.forEach(id => { if (id) playersToUpdate.add(id); });
        });

        return prevPlayers.map(p => {
          if (!playersToUpdate.has(p.id)) return p;

          const teamId = p.teamId;
          const team = teams.find(t => t.id === teamId);
          const tactics = team?.tactics;

          const perMinute = matchFatiguePerMinute(tactics, p.position, campo3d(p, ['stamina']));

          let injuryDrop = 0;
          const f = todays.find(f => f.homeTeamId === p.teamId || f.awayTeamId === p.teamId);
          if (f && f.events) {
            const pEvents = f.events.filter(e => e.playerId === p.id && e.type === 'INJURY' && e.minute >= gameState.matchMinute && e.minute < globalTargetMinute);
            if (pEvents.length > 0) {
              const severities = pEvents.map(e => e.injurySeverity);
              if (severities.includes('SEVERE')) injuryDrop += 80;
              else if (severities.includes('MEDIUM')) injuryDrop += 50;
              else if (severities.includes('LIGHT')) injuryDrop += 25;
            }
          }

          let newFitness = (p.energia ?? 100) - (perMinute * minutesPlayed) - injuryDrop;
          // Halftime bonus if we cross the HT mark during this jump
          if (gameState.matchMinute < maxHTDurationRef.current && globalTargetMinute >= maxHTDurationRef.current) {
            newFitness += 3;
          }

          const finalEn = Math.min(100, Math.max(0, newFitness));
          return { ...p, energia: finalEn, fitness: finalEn };
        });
      });
    }
  };

  // Os cobradores e o capitao do time (aba Match Tactics): guarda-se no time e vai ao motor 3D com a partida.
  const updateSetPieceTakers = (teamId: string, takers: Team['setPieceTakers']) => {
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, setPieceTakers: takers } : t));
  };

  /*
  FIM DE CADA DIA: os titulares e o banco de todos os times da CPU ficam escalados com jogadores validos (sem lesionados, suspensos na competicao do proximo jogo, vendidos ou ausentes), para a CPU
  escolher bem depois de expulsoes e lesoes. O time do utilizador fica de fora: ele pode ser escalado ate antes do jogo (ver o efeito abaixo, que o corrige no dia do jogo).
  */
  useEffect(() => {
    if (!gameState.userTeamId || !teams.length || !players.length) return;
    const hoje = gameState.currentDate;
    const alteracoes = new Map<string, { lineup: string[]; bench: string[] }>();
    for (const t of teams) {
      if (t.id === gameState.userTeamId) continue;
      const proximo = fixtures.filter(f => !f.played && f.date >= hoje && (f.homeTeamId === t.id || f.awayTeamId === t.id)).sort((a, b) => a.date.localeCompare(b.date))[0];
      const r = completarEscalacaoCpu(t, players, chaveCompeticao(proximo, comps));
      if (r.mudou) alteracoes.set(t.id, { lineup: r.lineup, bench: r.bench });
    }
    if (alteracoes.size) setTeams(prev => prev.map(t => { const a = alteracoes.get(t.id); return a ? { ...t, lineup: a.lineup, bench: a.bench } : t; }));
  }, [gameState.currentDate, loadId, players.length, teams.length]);

  /*
  LESIONADO SAI NA HORA (Nov/2026; relato: um zagueiro com lesao de treino de 6 dias continuava no banco, "disponivel para o jogo", em vez de no squad pool):
  em QUALQUER dia, sem jogo em andamento, quem do utilizador esta lesionado sai do banco e do onze (o posto fica vazio, com o aviso de escalacao incompleta).
  Os suspensos continuam a sair so no dia do jogo (efeito de baixo): a suspensao depende da competicao do jogo.
  */
  useEffect(() => {
    const t = teams.find(x => x.id === gameState.userTeamId);
    if (!t || jogoEmAndamento(gameState.matchMinute)) return;
    const lesionado = new Set(players.filter(p => p.teamId === t.id && p.injury).map(p => p.id));
    if (!lesionado.size) return;
    const naEscalacao = (t.lineup || []).some(id => lesionado.has(id)) || (t.bench || []).some(id => lesionado.has(id));
    if (!naEscalacao) return;
    updateTactics(t.id, {}, (t.lineup || []).map(id => (lesionado.has(id) ? '' : id)), (t.bench || []).filter(id => !lesionado.has(id)));
  }, [players, teams, gameState.userTeamId, gameState.matchMinute]);

  // No dia do jogo do utilizador: suspensos (cartoes) e lesionados saem da escalacao e do banco antes de o jogo abrir.
  useEffect(() => {
    const t = teams.find(x => x.id === gameState.userTeamId);
    const jogo = fixtures.find(f => f.date === gameState.currentDate && !f.played && (f.homeTeamId === gameState.userTeamId || f.awayTeamId === gameState.userTeamId));
    if (!t || !jogo || gameState.matchMinute > 0 || !t.lineup?.length) return;
    const r = corrigirEscalacao(t.lineup, t.bench || [], players.filter(p => p.teamId === t.id), chaveCompeticao(jogo, comps));
    if (r.mudou) updateTactics(t.id, {}, r.lineup, r.bench);
  }, [gameState.currentDate, gameState.userTeamId, fixtures, players, teams]);

  const updateTactics = (teamId: string, tactics: any, lineup?: string[], bench?: string[]) => {
    setTeams(prev => prev.map(t => {
      if (t.id !== teamId) return t;

      // --- LIVE SUBSTITUTION TRACKING & DYNAMIC RE-SCRIPTING ---
      if (gameState.matchMinute > 0 && gameState.matchMinute < 90 && (lineup || tactics)) {
        const oldLineup = t.lineup;
        const newcomers = lineup ? lineup.filter(id => id && !oldLineup.includes(id)) : [];
        const outgoing = lineup ? oldLineup.filter(id => id && !lineup.includes(id)) : [];

        // 3D ao vivo: cada substituto novo (a mesma posicao da escalacao com outro jogador, vindo do banco) vai ao motor, que o aquece e troca na proxima parada.
        if (lineup && typeof (window as any).motor3dMinuto === 'number') {
          const fx = fixtures.find(f => f.date === gameState.currentDate && !f.played && (f.homeTeamId === teamId || f.awayTeamId === teamId));
          if (fx) {
            lineup.forEach((id, i) => {
              const velho = oldLineup[i];
              if (!id || !velho || id === velho || oldLineup.includes(id)) return;
              const jog = players.find(p => p.id === id);
              if (jog && String(jog.position) === 'GK') setAvisoGoleiro(false);   // o manager ja pediu o goleiro: o aviso cumpriu-se
              if (jog) simulador3dEnviar({ tipo: 'substituicao', lado: fx.homeTeamId === teamId ? 'casa' : 'fora', sai: velho, entra: id, jogador: JSON.parse(JSON.stringify(jog)) });
            });
          }
        }

        // Run after state commit to avoid React double-run issues
        setTimeout(() => {
          setFixtures(prevFix => prevFix.map(f => {
            if (f.date !== gameState.currentDate) return f;
            const isHome = f.homeTeamId === teamId;
            const isAway = f.awayTeamId === teamId;
            if (!isHome && !isAway) return f;

            let updatedFixture = { ...f };

            // 0. A escalação da partida é a fonte de verdade do motor durante
            //    o jogo (fixture.homeLineup tem precedência sobre team.lineup).
            //    Sem gravar aqui, a troca feita na aba Tactics era ignorada:
            //    quem entrava não tocava na bola e quem saía seguia jogando.
            if (lineup) {
              if (isHome) updatedFixture.homeLineup = [...lineup];
              else updatedFixture.awayLineup = [...lineup];
            }

            // 1. Handle Substitutions (Events & Counter)
            if (newcomers.length > 0) {
              const actualNewcomers = newcomers.filter(pid =>
                !f.events.some(e => e.minute === gameState.matchMinute && e.type === 'SUB' && e.playerId === pid)
              );

              if (actualNewcomers.length > 0) {
                const updatedEvents = [...f.events];
                actualNewcomers.forEach((pid, index) => {
                  const outPid = outgoing[index];
                  const inName = players.find(p => p.id === pid)?.name.split(' ').pop();
                  const outName = outPid ? players.find(p => p.id === outPid)?.name.split(' ').pop() : '';

                  updatedEvents.push({
                    minute: gameState.matchMinute,
                    type: 'SUB',
                    description: outName ? `🔻 ${outName}   🔼 ${inName}` : `🔼 ${inName}`,
                    teamId: teamId,
                    playerId: pid,
                    subbedOutId: outPid || undefined
                  });
                });
                updatedFixture.events = updatedEvents;
                if (isHome) updatedFixture.subsUsedHome = (f.subsUsedHome || 0) + actualNewcomers.length;
                else updatedFixture.subsUsedAway = (f.subsUsedAway || 0) + actualNewcomers.length;
              }
            }

            // 2. Dynamic Re-Scripting (Impact of the change on the rest of the match)
            if (f.matchDeck) {
              const hTeam = isHome ? { ...t, lineup: lineup || t.lineup, tactics: { ...t.tactics, ...tactics } } : teams.find(x => x.id === f.homeTeamId)!;
              const aTeam = isAway ? { ...t, lineup: lineup || t.lineup, tactics: { ...t.tactics, ...tactics } } : teams.find(x => x.id === f.awayTeamId)!;

              const redH = new Set<string>(f.redCardedHome || []);
              const redA = new Set<string>(f.redCardedAway || []);

              const hR = getTeamRatings(hTeam, players, true, redH);
              const aR = getTeamRatings(aTeam, players, false, redA);

              // Preserva o tamanho do baralho. Fixar em 90 aqui cortava as
              // posições de acréscimo (o baralho tem DECK_SLOTS entradas),
              // e os minutos após os 90 ficavam sem lance próprio.
              const total = Math.max(f.matchDeck.length, DECK_SLOTS);
              const elapsed = f.matchDeck.slice(0, gameState.matchMinute);
              const remainingCount = total - elapsed.length;
              const newRes = generateMatchDeck(hR, aR, remainingCount);

              updatedFixture.matchDeck = [...elapsed, ...newRes];
            }

            return updatedFixture;
          }));
        }, 0);
      }

      return { ...t, tactics: { ...t.tactics, ...tactics }, lineup: lineup || t.lineup, bench: bench || t.bench };
    }));

    // Invalidate simulation cache so tactical changes take effect immediately
    if (teamId === gameState.userTeamId) {
      matchResultsCache.current = [];
    }
  };

  const updateTeamLogo = (teamId: string, logoUrl: string) => {
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, logoUrl } : t));
  };

  const hirePlayer = (player: Player) => {
    if (!userTeam || userTeam.cash < player.value) return;
    if (players.filter(p => p.teamId === userTeam.id).length >= 34) return;   // maximo de 34 jogadores por time

    setTeams(prev => prev.map(t => t.id === userTeam.id ? { ...t, cash: t.cash - player.value } : t));
    const contratado: Player = { ...player, teamId: userTeam.id, shirtNumber: 25 + Math.floor(Math.random() * 50), contract: novoContrato(player.age, gameState.currentDate, Math.random, fimDaLiga(userTeam.leagueId)) };
    setPlayers(prev => prev.map(p => p.id === player.id ? contratado : p));
    empurrarInbox([avisoDeContratacao(gameState.currentDate, gameState.language, contratado, formatCurrency(player.value))]);
  };

  const sellPlayer = (playerId: string) => {
    if (!userTeam) return;
    const player = players.find(p => p.id === playerId);
    if (!player || player.emprestimo) return;   // o emprestado e do dono: nao se vende

    const sellPrice = Math.round(player.value * 0.8);
    setTeams(prev => prev.map(t => t.id === userTeam.id ? { ...t, cash: t.cash + sellPrice } : t));
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, teamId: 'MARKET' } : p));
    empurrarInbox([avisoDeVenda(gameState.currentDate, gameState.language, player, formatCurrency(sellPrice))]);
  };

  // Os penaltis que o 3D ja decidiu, por id do confronto (o do jogo da copa, sem o prefixo 'fix-cup-'), a espera de o confronto aparecer empatado nas copas.
  const pens3d = useRef<Record<string, [number, number]>>({});
  const decisaoDoJogoDeHoje = (): DecisaoDoJogo | null => {
    const uf = fixtures.find(f => f.date === gameState.currentDate && (f.homeTeamId === gameState.userTeamId || f.awayTeamId === gameState.userTeamId));
    return uf ? decisaoDoConfronto(comps, uf.id) : null;
  };
  const guardarPenaltis3d = (fixtureId: string, pens: [number, number]) => { pens3d.current[fixtureId.replace('fix-cup-', '')] = pens; };
  // Sem disputa pendente para o modal de texto quando o 3D ja resolveu o confronto.
  const disputaDePenaltis = useMemo(() => {
    const d = userTeam ? disputaPendente(comps, userTeam.id) : null;
    return d && !pens3d.current[d.matchId] ? d : null;
  }, [comps, userTeam?.id]);
  const registrarPenaltis = (compId: string, matchId: string, pens: [number, number]) =>
    setComps(prev => (prev ? prev.map(c => (c.id === compId ? { ...c, matches: c.matches.map(m => (m.id === matchId ? { ...m, pens } : m)) } : c)) : prev));
  // O 3D ja decidiu: grava os penaltis assim que o confronto aparece empatado nas copas.
  useEffect(() => {
    const d = userTeam ? disputaPendente(comps, userTeam.id) : null;
    if (d && pens3d.current[d.matchId]) { registrarPenaltis(d.compId, d.matchId, pens3d.current[d.matchId]); delete pens3d.current[d.matchId]; }
  }, [comps]);
  const definirOrdemPenaltis = (teamId: string, ordem: string[]) => setTeams(prev => prev.map(t => (t.id === teamId ? { ...t, penaltyOrder: ordem } : t)));

  const swapShirtNumbers = (p1: string, p2: string) => {
    setPlayers(prev => {
      const player1 = prev.find(p => p.id === p1);
      const player2 = prev.find(p => p.id === p2);
      if (!player1 || !player2) return prev;

      const n1 = player1.shirtNumber;
      const n2 = player2.shirtNumber;

      return prev.map(p => {
        if (p.id === p1) return { ...p, shirtNumber: n2 };
        if (p.id === p2) return { ...p, shirtNumber: n1 };
        return p;
      });
    });
  };

  const scheduleActivity = (date: string, type: ActivityType, details: any) => {
    // Handle REMOVE: just clear activities on this date
    if (type === 'REMOVE') {
      // Cancelar um treinamento ou festa devolve REEMBOLSO_ATIVIDADE (0.8x) do que foi pago por esse dia.
      const devolvido = gameState.activities.filter(a => a.date === date).reduce((s, a) => s + (a.custo || 0) * REEMBOLSO_ATIVIDADE, 0);
      if (devolvido > 0 && userTeam) setTeams(prev => prev.map(t => t.id === userTeam.id ? { ...t, cash: t.cash + devolvido } : t));
      setGameState(prev => ({
        ...prev,
        activities: prev.activities.filter(a => a.date !== date)
      }));
      // REMOVE FRIENDLY FIXTURES TOO
      setFixtures(prev => prev.filter(f => !(f.date === date && f.id.startsWith('fix-friendly-'))));
      return;
    }

    const id = `act-${date}-${type}-${Math.random().toString(36).substr(2, 5)}`;
    const label = (details.partyName || details.label || type) as string;

    // Para Training Camp, calcula todos os dias afetados
    const affectedDates: string[] = [date];
    if (type === 'TRAINING_CAMP' && details.days) {
      for (let i = 1; i < details.days; i++) {
        const d = new Date(date + 'T12:00:00');
        d.setDate(d.getDate() + i);
        affectedDates.push(d.toISOString().split('T')[0]);
      }
    }

    // Verificar conflitos com jogos nos dias afetados
    const matchConflict = affectedDates.find(d =>
      fixtures.some(f => f.date === d && !f.played && (f.homeTeamId === userTeam?.id || f.awayTeamId === userTeam?.id))
    );
    if (matchConflict) {
      alert(tx('Conflict! A match is scheduled for {v0}. Pick another date or duration.', { v0: new Date(matchConflict + 'T12:00:00').toLocaleDateString(localeDoIdioma(gameState.language)) }));
      return;
    }

    // CREATE FIXTURE FOR FRIENDLY
    if (type === 'FRIENDLY' && details.opponentId && userTeam) {
      const newFixture: Fixture = {
        id: `fix-friendly-${date}-${userTeam.id}-${details.opponentId}`,
        week: 0, // 0 indicates it's non-league or special
        date: date,
        homeTeamId: userTeam.id,
        awayTeamId: details.opponentId,
        homeScore: null,
        awayScore: null,
        played: false,
        isFriendly: true,
        type: 'FRIENDLY',
        events: []
      };
      setFixtures(prev => {
        // Avoid duplicates
        if (prev.some(f => f.id === newFixture.id)) return prev;
        return [...prev, newFixture];
      });
    }

    // Substituir uma atividade ja paga nesses dias tambem devolve 0.8x do que ela custou.
    const substituidas = gameState.activities.filter(a => affectedDates.includes(a.date)).reduce((s, a) => s + (a.custo || 0) * REEMBOLSO_ATIVIDADE, 0);
    if (substituidas > 0 && userTeam) setTeams(prev => prev.map(t => t.id === userTeam.id ? { ...t, cash: t.cash + substituidas } : t));
    const custoPorDia = (details.cost && (type === 'TRAINING_CAMP' || type === 'TEAM_PARTY')) ? details.cost / affectedDates.length : 0;

    setGameState(prev => {
      // Remove atividades existentes em todos os dias afetados
      const cleanActivities = prev.activities.filter(a => !affectedDates.includes(a.date));

      // Adiciona as novas atividades em todos os dias afetados
      const newActivities = affectedDates.map((d, i) => ({
        id: `${id}-d${i}`,
        date: d,
        type,
        ...(custoPorDia > 0 ? { custo: custoPorDia } : {}),
        label: i === 0 ? (type === 'FRIENDLY' ? (teams.find(t => t.id === details.opponentId)?.name || 'Friendly') : label) : `${label} (${tx('Day')} ${i + 1})`
      }));

      return {
        ...prev,
        activities: [...cleanActivities, ...newActivities]
      };
    });

    if (details.cost && userTeam) {
      setTeams(prev => prev.map(t => t.id === userTeam.id ? { ...t, cash: t.cash - details.cost } : t));
    }
  };

  const setTrainingSchedules = (schedules: (string | null)[][][]) => {
    setGameState(prev => ({ ...prev, trainingSchedules: schedules, trainingSchedule: schedules[0] }));
  };

  const alternarTreinoIndividual = (playerId: string, campo: string) => {
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, treinoIndividual: alternarIndividual(p.treinoIndividual, campo) } : p));
  };

  const unlockTrainingGroup = () => {
    if (!userTeam) return;
    if ((gameState.unlockedTrainingGroups || 1) >= 3) return;
    if (userTeam.cash < 100000) return;

    setTeams(prev => prev.map(t => t.id === userTeam.id ? { ...t, cash: t.cash - 100000 } : t));
    setGameState(prev => ({ ...prev, unlockedTrainingGroups: (prev.unlockedTrainingGroups || 1) + 1 }));
  };

  const updatePlayerTrainingGroup = (playerId: string, groupId: number) => {
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, trainingGroupId: groupId } : p));
  };

  const setTrainingAutoGrupos = (cfg: { ativo: boolean; limiares: number[] }) => {
    setGameState(prev => ({ ...prev, trainingAutoGrupos: cfg }));
    // Reagrupa o elenco ja, pela ENR de agora (os lesionados ficam no MED e nao mudam).
    if (cfg.ativo) {
      const n = gameState.unlockedTrainingGroups || 1;
      if (n > 1) setPlayers(prev => prev.map(p => (p.teamId === gameState.userTeamId && !p.injury)
        ? { ...p, trainingGroupId: grupoPorEnergia(p.energia ?? p.fitness ?? 100, cfg.limiares, n) } : p));
    }
  };

  const saveGame = async () => {
    // A partida 3D a meio: o instantaneo do motor (posicoes, bola, posse, estatisticas) vai no save, para o load continuar exactamente dali (ver Ponte.instantaneo).
    let motor3d: any = null;
    if (gameState.matchMinute > 0 && typeof (window as any).motor3dMinuto === 'number' && (window as any).motor3dMinuto !== 999) {   // inclui os descontos (>= 90); o 3D devolve null se o jogo ja acabou
      try { motor3d = await simulador3dInstantaneo(); } catch { motor3d = null; }
    }
    const saveData = {
      teams,
      players,
      fixtures,
      gameState,
      worldResults: worldResults(world),
      temporada: { ano: anoTemporada, divisoes: divisoesAtuais() },   // as divisoes depois dos acessos/descensos e o ano da temporada
      comps,
      historicoCopas,
      base,
      inbox,
      inboxVistas: Array.from(vistasRef.current),
      negociacoes,
      mercado,
      managers: managerState,
      motor3d,
      saveDate: new Date().toISOString()
    };
    const texto = JSON.stringify(saveData, null, 2);
    // Nome do save: NomeDoTime_Week<semana> (sem acentos nem espacos: o servidor so aceita A-Z, a-z, 0-9, _ e -).
    const clubeSave = (userTeam?.name || 'FootManager').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9-]+/g, '') || 'FootManager';
    // Gravar outra vez na MESMA semana nao repete o nome (o browser descarregava "Nome (1).json" e o servidor sobrescrevia o primeiro: carregava-se o save antigo e o que se fez depois nao aparecia).
    // O primeiro da semana e `Nome_WeekN`; os seguintes `Nome_WeekN_2`, `_3`... (o contador vive no localStorage, por clube e semana).
    const baseNome = `${clubeSave}_Week${gameState.currentWeek}`;
    let vez = 1;
    try { vez = (Number(localStorage.getItem('fm_save_' + baseNome)) || 0) + 1; localStorage.setItem('fm_save_' + baseNome, String(vez)); } catch { /* sem localStorage: fica o nome simples */ }
    const nomeSave = `${baseNome}${vez > 1 ? '_' + vez : ''}.json`;
    // Copia local: o servidor de desenvolvimento grava-a na pasta `saves/` do projeto (ver vite.config.ts). Sem servidor (build) fica so o descarregamento.
    try {
      const r = await fetch('/api/save-game', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-save-name': nomeSave }, body: texto });
      if (r.ok) { const j = await r.json(); console.log('[save] gravado em', j.ficheiro); }
      else console.warn('[save] a copia local falhou:', r.status);
    } catch (e) { console.warn('[save] sem servidor local, so o descarregamento:', e); }
    const blob = new Blob([texto], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeSave;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importGameData = (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      if (data.teams && data.players && data.gameState) {
        // O instantaneo da partida 3D gravada a meio (saveGame): o MatchDay leva-o ao 3D para continuar exactamente dali.
        (window as any).__instantaneo3d = data.motor3d || null;
        simulador3dDescartar();   // o 3D do save anterior sai: o MatchDay (remontado por loadId) cria o do save carregado
        pauseMatch();
        (window as any).motor3dMinuto = undefined;
        // MODO DE DISTRIBUICAO (textSim/distribuicao.ts): um save com nomes reais passa a mostrar nomes gerados (so os jogadores da base real; os gerados pelo jogo ja o sao).
        if (DISTRIBUICAO.nomesGenericos) {
          const idsReais = idsDeJogadoresReais();
          data.players = data.players.map((p: any) => (p.nomeOriginal || (!idsReais.has(String(p.id)) && !jogadorLocalPorId(String(p.id))) ? p : { ...p, nomeOriginal: p.name, name: nomeGenerico(String(p.id), String(p.teamId)) }));
        }
        // Saves antigos so tem `fitness` (a barra le `energia ?? fitness`): sem isto o fecho do dia lia `energia ?? 100` e todos iam de 50% a 100% no primeiro dia.
        data.players = data.players.map((p: any) => (p.energia === undefined && typeof p.fitness === 'number' ? { ...p, energia: p.fitness } : p));
        // Saves antigos: ninguem fica abaixo do nivel minimo (50).
        data.players = data.players.map((p: any) => (p.skill < 50 || p.def < 50 || p.pas < 50 || p.drb < 50 || p.sht < 50
          ? { ...p, skill: Math.max(50, p.skill), def: Math.max(50, p.def), pas: Math.max(50, p.pas), drb: Math.max(50, p.drb), sht: Math.max(50, p.sht) } : p));
        /*
        SAVE ANTIGO (pais "brazil" em minusculas, sem `leagueId`, ids de clube 450001...): passa para o formato actual. Os clubes mudam para os ids da base ATUAL (pelo nome), ganham o pais "45"
        e a liga `bra_serie_a`, e os jogadores, os jogos e o dono do jogo seguem os novos ids. Sem isto a liga do jogo ficava a parte, duplicada, na aba WORLD, e as copas nao achavam os clubes.
        */
        if (data.teams.every((t: any) => String(t.country).toLowerCase() === 'brazil')) {
          const idsDaBase = new Map<string, string>(REAL_TEAMS_JSON.map((t: any) => [t.teamName, String(t.teamID)]));
          const novoId = new Map<string, string>();
          data.teams.forEach((t: any) => { const n = idsDaBase.get(t.name); if (n) novoId.set(t.id, n); });
          const m = (id: string) => novoId.get(id) || id;
          data.teams = data.teams.map((t: any) => ({ ...t, id: m(t.id), country: '45', leagueId: t.leagueId || 'bra_serie_a' }));
          data.players = data.players.map((p: any) => ({ ...p, teamId: m(p.teamId) }));
          data.fixtures = (data.fixtures || []).map((f: any) => ({ ...f, homeTeamId: m(f.homeTeamId), awayTeamId: m(f.awayTeamId) }));
          data.gameState = { ...data.gameState, userTeamId: m(data.gameState.userTeamId) };
        }
        // Restore logoUrls from REAL_TEAMS_JSON if missing or apply automated path
        const patchedTeams = data.teams.map((t: Team) => {
          const dbTeam = REAL_TEAMS_JSON.find((dt: any) => dt.teamID.toString() === t.id);
          const stadiumName = t.stadium || dbTeam?.teamStadiumName || 'Generic Stadium';
          return {
            ...t,
            stadium: stadiumName,
            stadiumCapacity: t.stadiumCapacity || ((stadiumName === 'Maracanã' || stadiumName === 'Estádio do Maracanã') ? 78838 : (Math.floor((t.fanBase || 10000) * 0.45) + 15000)),
            // O escudo vem da base ATUAL (generica, ou a do mod dos dados reais), nao do save: sem o mod, um save antigo nao volta a mostrar o escudo real.
            logoUrl: dbTeam ? (dbTeam.teamBadgeLocation === '-' ? '' : assetUrl(dbTeam.teamBadgeLocation || `/Assets/Escudos/${t.name}.png`)) : assetUrl(t.logoUrl || `/Assets/Escudos/${t.name}.png`),
            kitUrls: (t.kitUrls || [
              `/Assets/Camisas/${t.name}_1.png`,
              `/Assets/Camisas/${t.name}_2.png`,
              `/Assets/Camisas/${t.name}_3.png`,
            ]).map((u: string) => assetUrl(u)) as [string, string, string],
          };
        });

        // O mundo refaz-se (repondo os resultados do save) e as copas voltam do save; um save antigo, sem copas, ganha-as agora (com os jogos do utilizador no calendario).
        // As divisoes e o ano do save (acessos/descensos ja aplicados); um save antigo, sem elas, parte das originais.
        const ano: number = data.temporada?.ano ?? (Number(String(data.gameState.currentDate).slice(0, 4)) || ANO_BASE);
        aplicarDivisoes(data.temporada?.divisoes || DIVISOES_ORIGINAIS); setAnoTemporada(ano);
        let tm: Team[] = patchedTeams, pl: Player[] = data.players, fx: Fixture[] = data.fixtures;
        const donoId = data.gameState.userTeamId, dono = patchedTeams.find((t: Team) => t.id === donoId);
        if (dono) {
          const mundo = createWorld(ligaIdDoClube(dono), data.gameState.currentDate, data.worldResults || null, ano, ehLigaEuropeia(ligaIdDoClube(dono)) ? ano : ano - 1);
          const copas = prepararCopas({ world: mundo, userTeamId: donoId, teams: patchedTeams, players: data.players, fixtures: data.fixtures, date: data.gameState.currentDate, comps: data.comps || null, historico: data.historicoCopas || {} });
          setHistoricoCopas(data.historicoCopas || {});
          worldSaved.current = null; compsSaved.current = null;
          setWorld(mundo);
          if (copas) {
            setComps(copas.comps);
            fx = [...fx, ...copas.fixtures].sort((a, b) => a.date.localeCompare(b.date)); tm = [...tm, ...copas.teams]; pl = [...pl, ...copas.players];
          } else setComps(null);
        } else { setWorld(null); setComps(null); }
        setTeams(tm);
        // AUTO ENR: com o save carregado, se estava ON, o elenco do utilizador volta a ser agrupado pela ENR de agora (os lesionados ficam no MED e nao mudam).
        const autoSave = data.gameState.trainingAutoGrupos, nGruposSave = data.gameState.unlockedTrainingGroups || 1;
        if (autoSave?.ativo && nGruposSave > 1) {
          pl = pl.map((p: Player) => (p.teamId === data.gameState.userTeamId && !p.injury)
            ? { ...p, trainingGroupId: grupoPorEnergia(p.energia ?? p.fitness ?? 100, autoSave.limiares || [80, 50], nGruposSave) } : p);
        }
        setPlayers(pl);
        setManagerState(data.managers ? { historico: [], ...data.managers } : null);   // save antigo, sem treinadores: o efeito semeia a partir da base
        setBase(data.base || null);   // save antigo, sem base: o motor gera as bases
        // As chaves ja emitidas: as do save (inboxVistas) mais as das mensagens que ainda la estao (saves antigos).
        vistasRef.current = new Set<string>([...(data.inboxVistas || []), ...(data.inbox || []).flatMap((m: any) => (m.keys || []) as string[])] as string[]);
        setInboxVistas(Array.from(vistasRef.current));
        setInbox(data.inbox || []);
        setNegociacoes(data.negociacoes || []);
        setMercado(data.mercado || mercadoVazio(''));
        setFixtures(fx);
        // O idioma e a qualidade grafica sao preferencias do jogador (Settings, guardadas no navegador), nao do save: carregar um save antigo nao as muda.
        setGameState({ ...data.gameState, language: gameState.language, graphicsQuality: gameState.graphicsQuality });
        setLoadId(n => n + 1);
        return true;
      }
    } catch (e) {
      console.error("Save file inválido", e);
    }
    return false;
  };

  const isTransferWindowOpen = () => janelaAberta(gameState.currentDate, userTeam?.country);   // as janelas vem de CONFIG_MERCADO (textSim/transferencias.ts)

  const currentFixtures = fixtures.filter(f => f.week === gameState.currentWeek || f.date === gameState.currentDate);

  return (
    <GameContext.Provider value={{
      historicoCopas, managerState, recusarOferta, teams, players, fixtures, gameState, startGame, advanceDay, proximoJogo, jogoHoje, autoAvancoAtivo: !!autoAvanco, autoAvancoMotivo, iniciarProximoJogo, pararProximoJogo, advanceWeek, playMatchDay, pauseMatch, resetMatchDay, updateTactics, updateSetPieceTakers, updateTeamLogo,
      hirePlayer, sellPlayer, listarParaEmprestimo, dispensarJogador, base, inbox, markInboxRead, markAllInboxRead, deleteInbox, promoteYouth, dispensarJovem, negociacoes, proporRenovacao, proporPatrocinio, reputacaoClube, definirDivisaoOrcamento, mercado, proporCompraMercado,
      proporEmprestimoMercado, pagarClausulaMercado, exercerOpcaoCompra, perfilDeCredito, contratarEmprestimoBancario, quitarEmprestimoBancario, responderNegociacao, retirarProposta, tentarConcluir, contratarLivre, listarParaVenda, swapShirtNumbers, definirOrdemPenaltis, disputaDePenaltis, registrarPenaltis, decisaoDoJogoDeHoje, guardarPenaltis3d, scheduleActivity, saveGame, importGameData, loadId, currentFixtures, userTeam, setThemeMode, world, comps, openWorld,
      isTransferWindowOpen, finishMatchDayInstant, motor3dProgresso, motor3dMensagem, avisoGoleiro, avisoLesao, limparAvisoLesao, avisoGoleiroMensagem, updateSettings, taxasDeCambio: { ...TAXAS }, atualizarTaxas, formatCurrency, formatCurrencyShort, formatWage,
      reportLiveGoal, reportMatchEvent,
      t,
      updateMatchVisualState,
      registrarFinanceiro,
      setTrainingSchedules,
      alternarTreinoIndividual,
      unlockTrainingGroup,
      updatePlayerTrainingGroup, setTrainingAutoGrupos
    }}
    >{children}</GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within a GameProvider");
  return context;
};
