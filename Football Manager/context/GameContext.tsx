import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Team, Player, Fixture, GameState, CalendarActivity, ActivityType, ThemeMode, MatchEvent, Language, Currency, WageFrequency, Position, MatchDuration, MatchVisualState, MatchMode, naLigaDoUtilizador } from '../types';
import { generateLeagueData, generateFixtures, COUNTRIES } from '../textSim/dataGenerator';
import { gruposDaSerieD } from '../textSim/competitions';
import { WorldLeague, WorldResults, createWorld, simulateWorldTo, worldResults } from '../textSim/world';
import { Competition, prepararCopas, ligaIdDoClube } from '../textSim/competitions';
import { BaseState, garantirBase, processarBase, promoverJovem } from '../textSim/youth';
import { novoContrato, processarContratos, renovarContrato, estadoDoContrato } from '../textSim/contracts';
import { MensagemInbox, adicionar, chavesDe, avisosDoDia, boasVindas, avisoDeContratacao, avisoDeVenda, avisoDeRenovacao, avisoDePromocao, avisoDeLiberados, avisoDeSaidaDaBase } from '../textSim/inbox';
import { regiaoDoClube } from '../textSim/dataGenerator';
import { rotuloDaFase } from '../textSim/competitions';
import { simulateMatch, manageCPUTeam, getTeamRatings, generateMatchDeck, calculateMatchRatings, DECK_SLOTS, getStoppageTime, getHalfTimeMinute, getMatchEndMinute, matchFatiguePerMinute } from '../textSim/matchEngine';
import { ACTIVITIES, cpuPlanoDoDia, cpuAplicarTreino } from '../textSim/trainingService';
import { settleMatch, applyResult, ECONOMIA_ESTADIO, type CurrencyCode } from '../textSim/stadiumEconomy';
import { REAL_TEAMS_JSON } from '../textSim/realDatabase';
import { montarPayload, jogarOculto, aplicarResultado, eventosDoManager } from '../3dMatch/simulador3dCliente';
import { simulador3dEnviar } from '../3dMatch/Simulador3DView';

const TRANSLATIONS: Record<string, any> = {
  EN: {
    // Nav
    nav_home: "Home", nav_inbox: "Inbox", nav_squad: "Squad", nav_tactics: "Tactics", nav_training: "Training",
    nav_fixtures: "Fixtures", nav_standings: "Standings", nav_finance: "Finance", nav_statistics: "Statistics", nav_settings: "Settings", nav_world: "World",
    nav_match_day: "Match Day", nav_sim_round: "Simulate Round", nav_save_game: "Save Game",
    // Start Menu
    start_new: "START NEW CAREER", start_continue: "CONTINUE CAREER", start_editor: "EDITOR", start_settings: "SETTINGS",
    // Profile Creation
    prof_title: "Manager Profile", prof_name_label: "Full Name", prof_placeholder: "ENTER MANAGER NAME...",
    prof_cancel: "Cancel", prof_continue: "Continue to Selection",
    // Team Selection
    sel_title: "Select Your Club", sel_back: "Profile", sel_step1: "1. National Associations",
    sel_step2: "2. Competitions", sel_step3: "3. Affiliated Clubs", sel_join: "JOIN",
    // Dashboard
    dash_manager_home: "Manager Home", dash_simulate: "Simulate Round", dash_advance: "Advance Day",
    dash_match_day: "Match Day", dash_next_match: "Next Match", dash_view_tactics: "View Tactics",
    dash_squad_snap: "Squad Snapshot", dash_avg_ovr: "Avg OVR", dash_players: "Players",
    dash_top_5: "Top 5 Players", dash_treasury: "Club Treasury", dash_avail_balance: "Available Balance",
    dash_standings: "League Standings", dash_event: "EVENT",
    // Finance
    fin_center: "Financial Center", fin_subtitle: "Treasury Management & Transfer Negotiations",
    fin_treasury: "Treasury", fin_market: "Transfer Market",
    fin_weekly_sal: "Weekly Salaries", fin_match_rev: "Match Revenue", fin_sponsor: "Annual Sponsor", fin_fanbase: "Fan Base",
    fin_squad_payroll: "Squad Payroll", fin_search: "Search player...", fin_sign: "Sign Contract",
    fin_sell: "Sell Player", fin_market_closed: "Market Closed", fin_market_closed_msg: "The transfer window is currently closed. Come back in Jan or Jul.",
    fin_no_players: "No players found matching criteria.", fin_summary: "Financial Summary",
    fin_season_budget: "Season Budget", fin_transfer_budget: "Transfer Budget", fin_avg_att: "Avg. Attendance",
    // Squad
    sq_management: "Squad Management", sq_subtitle: "Drag n drop shirt numbers to swap between players • Click on rows for details",
    sq_gk: "Goalkeepers", sq_def: "Defenders", sq_mid: "Midfielders", sq_fwd: "Forwards",
    // Tactics
    tac_match: "Match", tac_tactics: "Tactics", tac_formation: "Formation",
    tac_instr: "Tactical Instructions", tac_style: "Play Style", tac_aggression: "Aggression",
    tac_sector: "Match Sector", tac_pressure: "Pressure", tac_def_line: "Defensive Line", tac_tempo: "Tempo",
    tac_squad_pool: "Squad Pool", tac_note: "MATCH TACTICS positions are from selected FORMATION. Bench/Pool positions are player's natural role.",
    // Training
    train_center: "Training Center", train_subtitle: "Schedule your team's weekly development",
    train_schedule: "Weekly Schedule", train_clear: "Clear Calendar", train_highlights: "Training Highlights",
    train_top_growth: "Top 5 Growth", train_prog: "Prog.",
    // Fixtures
    fix_season: "Season", fix_schedule: "Schedule", fix_list: "Fixture List for",
    // Match
    match_sim: "Simulation", match_live: "Live Center", match_kickoff: "Kick Off",
    match_resume: "Resume", match_pause: "Pause", match_instant: "Instant Result",
    match_confirm: "Confirm Round Results", match_all_fix: "All Fixtures", match_games_today: "Games Today",
    match_stats: "Match Stats", match_events: "Match Events", match_scores: "Latest Scores",
    match_commentary: "Live Commentary",
    // Match Labels
    ml_kickoff: "KICKOFF", ml_long: "LONG BALL", ml_pass: "PASS", ml_shot: "SHOT!", ml_goal: "GOAL!", ml_save: "SAVE!",
    // Settings
    set_game: "Game", set_settings: "Settings", set_subtitle: "Customize your management experience",
    set_gen: "General", set_lang: "Language", set_theme: "Theme",
    set_fin: "Financials", set_curr: "Currency", set_wage: "Wage Frequency",
    set_note: "Note: Currency changes are visual. Game logic uses USD base.",
    set_back_menu: "Back to Menu",
    // Activities
    act_modal_title: "Schedule Activity", act_back: "Back",
    act_friendly: "Friendly Match", act_camp: "Training Camp", act_party: "Team Party",
    act_select_opp: "Select Opponent:", act_select_dur: "Select Duration:",
    act_select_type: "Select Event Type:", act_days: "Days", act_cost: "Cost", act_bonus: "Bonus",
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    days_short: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
  },
  PT: {
    // Nav
    nav_home: "Início", nav_inbox: "Caixa de Entrada", nav_squad: "Elenco", nav_tactics: "Tática", nav_training: "Treino",
    nav_fixtures: "Jogos", nav_standings: "Tabela", nav_finance: "Finanças", nav_statistics: "Estatísticas", nav_settings: "Config.", nav_world: "Mundo",
    nav_match_day: "Dia de Jogo", nav_sim_round: "Simular Rodada", nav_save_game: "Salvar Jogo",
    // Start Menu
    start_new: "INICIAR NOVA CARREIRA", start_continue: "CONTINUAR CARREIRA", start_editor: "EDITOR", start_settings: "CONFIGURAÇÕES",
    // Profile Creation
    prof_title: "Perfil do Treinador", prof_name_label: "Nome Completo", prof_placeholder: "DIGITE O NOME DO TREINADOR...",
    prof_cancel: "Cancelar", prof_continue: "Continuar para Seleção",
    // Team Selection
    sel_title: "Selecione seu Clube", sel_back: "Perfil", sel_step1: "1. Federações Nacionais",
    sel_step2: "2. Competições", sel_step3: "3. Clubes Filiados", sel_join: "ENTRAR",
    // Dashboard
    dash_manager_home: "Painel do Treinador", dash_simulate: "Simular Rodada", dash_advance: "Avançar Dia",
    dash_match_day: "Ir para o Jogo", dash_next_match: "Próximo Jogo", dash_view_tactics: "Ver Tática",
    dash_squad_snap: "Resumo do Elenco", dash_avg_ovr: "Média OVR", dash_players: "Jogadores",
    dash_top_5: "Top 5 Jogadores", dash_treasury: "Tesouraria do Clube", dash_avail_balance: "Saldo Disponível",
    dash_standings: "Classificação", dash_event: "EVENTO",
    // Finance
    fin_center: "Centro Financeiro", fin_subtitle: "Gestão de Tesouraria e Negociações",
    fin_treasury: "Tesouraria", fin_market: "Mercado",
    fin_weekly_sal: "Salários Semanais", fin_match_rev: "Receita de Jogo", fin_sponsor: "Patrocínio Anual", fin_fanbase: "Torcedores",
    fin_squad_payroll: "Folha Salarial", fin_search: "Buscar jogador...", fin_sign: "Contratar",
    fin_sell: "Vender Jogador", fin_market_closed: "Mercado Fechado", fin_market_closed_msg: "A janela de transferências está fechada. Volte em Jan ou Jul.",
    fin_no_players: "Nenhum jogador encontrado.", fin_summary: "Resumo Financeiro",
    fin_season_budget: "Orçamento Temporada", fin_transfer_budget: "Orçamento Transf.", fin_avg_att: "Público Médio",
    // Squad
    sq_management: "Gestão do Elenco", sq_subtitle: "Arraste os números para trocar camisas • Clique nas linhas para detalhes",
    sq_gk: "Goleiros", sq_def: "Defensores", sq_mid: "Meio-campistas", sq_fwd: "Atacantes",
    // Tactics
    tac_match: "Partida", tac_tactics: "Tática", tac_formation: "Esquema",
    tac_instr: "Instruções Táticas", tac_style: "Estilo", tac_aggression: "Agressividade",
    tac_sector: "Setor de Jogo", tac_pressure: "Pressão", tac_def_line: "Linha Defensiva", tac_tempo: "Tempo",
    tac_squad_pool: "Reserva Geral", tac_note: "As posições TÁTICAS são baseadas no ESQUEMA. Banco e Reservas mostram a posição natural.",
    // Training
    train_center: "Centro de Treinamento", train_subtitle: "Planeje o desenvolvimento semanal",
    train_schedule: "Cronograma Semanal", train_clear: "Limpar Calendário", train_highlights: "Destaques do Treino",
    train_top_growth: "Top 5 Evolução", train_prog: "Prog.",
    // Fixtures
    fix_season: "Temporada", fix_schedule: "Calendário", fix_list: "Lista de Jogos para",
    // Match
    match_sim: "Simulação", match_live: "Placar ao Vivo", match_kickoff: "Início",
    match_resume: "Continuar", match_pause: "Pausar", match_instant: "Resultado Instantâneo",
    match_confirm: "Confirmar Resultados", match_all_fix: "Todos os Jogos", match_games_today: "Jogos de Hoje",
    match_stats: "Estatísticas", match_events: "Eventos", match_scores: "Últimos Placares",
    match_commentary: "Comentários ao Vivo",
    // Match Labels
    ml_kickoff: "SAÍDA", ml_long: "LANÇAMENTO", ml_pass: "PASSE", ml_shot: "CHUTE!", ml_goal: "GOL!", ml_save: "DEFESA!",
    // Settings
    set_game: "Jogo", set_settings: "Configurações", set_subtitle: "Personalize sua experiência",
    set_gen: "Geral", set_lang: "Idioma", set_theme: "Tema",
    set_fin: "Financeiro", set_curr: "Moeda", set_wage: "Freq. Salarial",
    set_note: "Nota: Mudanças de moeda são visuais. A lógica usa base USD.",
    set_back_menu: "Voltar ao Menu",
    // Activities
    act_modal_title: "Agendar Atividade", act_back: "Voltar",
    act_friendly: "Amistoso", act_camp: "Campo de Treino", act_party: "Festa do Time",
    act_select_opp: "Selecionar Oponente:", act_select_dur: "Selecionar Duração:",
    act_select_type: "Selecionar Tipo:", act_days: "Dias", act_cost: "Custo", act_bonus: "Bônus",
    months: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
    days_short: ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"]
  }
};

interface GameContextType {
  teams: Team[];
  players: Player[];
  fixtures: Fixture[];
  gameState: GameState;
  startGame: (teamId: string, managerName: string, countryId: string, leagueId?: string) => void;
  advanceDay: () => void;
  advanceWeek: () => void;
  playMatchDay: (modo?: any) => void; // 'VISUAL' = 3D ao vivo (MatchDay); qualquer outra coisa = narrado (MatchRoundView)
  pauseMatch: () => void;
  resetMatchDay: () => void; // RESET do MatchDay: volta ao minuto 0, sem eventos, para os times entrarem em campo outra vez
  finishMatchDayInstant: () => void;
  motor3dMensagem: (m: any) => void; // mensagens do iframe 3D visivel (modo 3D)
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
  renewPlayer: (playerId: string) => void;
  sellPlayer: (playerId: string) => void;
  swapShirtNumbers: (playerId1: string, playerId2: string) => void;
  scheduleActivity: (date: string, type: ActivityType, details: any) => void;
  setTrainingSchedules: (schedules: (string | null)[][][]) => void;
  unlockTrainingGroup: () => void;
  updatePlayerTrainingGroup: (playerId: string, groupId: number) => void;
  saveGame: () => Promise<void>;
  importGameData: (jsonString: string) => boolean;
  currentFixtures: Fixture[];
  userTeam: Team | undefined;
  /** As outras ligas (aba WORLD); null ate a aba se abrir pela primeira vez. A liga do utilizador nao esta aqui: vive em `teams`/`fixtures`. */
  world: WorldLeague[] | null;
  /** Libertadores, Sul-Americana e Copa do Brasil (aba WORLD COMPETITIONS); null ate a aba abrir. */
  comps: Competition[] | null;
  openWorld: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  updateSettings: (settings: Partial<Pick<GameState, 'language' | 'currency' | 'wageFrequency' | 'themeMode' | 'matchDuration' | 'simulationSpeed' | 'graphicsQuality'>>) => void;
  isTransferWindowOpen: () => boolean;
  formatCurrency: (value: number) => string;
  formatCurrencyShort: (value: number) => string;
  formatWage: (weeklyValue: number) => string;
  reportLiveGoal: (fixtureId: string, side: 'home' | 'away', scorerId?: string) => void;
  reportMatchEvent: (fixtureId: string, event: Partial<MatchEvent>) => void;
  t: (key: string) => any;
  updateMatchVisualState: (visual: Partial<MatchVisualState>) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

/**
 * Uma partida conta para a tabela e para as estatísticas da temporada?
 * Amistosos e jogos de copa não somam pontos nem entram na artilharia do
 * campeonato. Lesões e desgaste continuam valendo — esses acontecem de verdade.
 */
export const countsForLeague = (f: Fixture): boolean =>
  !f.isFriendly && (f.type === undefined || f.type === 'LEAGUE');

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [world, setWorld] = useState<WorldLeague[] | null>(null);
  const [comps, setComps] = useState<Competition[] | null>(null);
  // As categorias de base (Sub-20) de todos os clubes: lista a parte (mesmo tipo `Player`), para nao entrar nas contas do elenco, da folha e do motor de partidas.
  const [base, setBase] = useState<BaseState | null>(null);
  // A caixa de entrada (Inbox): e-mails de boas-vindas e avisos de todos os setores (textSim/inbox.ts). Vai no save.
  const [inbox, setInbox] = useState<MensagemInbox[]>([]);
  const compsSaved = useRef<Competition[] | null>(null);
  const worldSaved = useRef<WorldResults | null>(null);   // resultados vindos de um save, para repor ao criar o mundo
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [gameState, setGameState] = useState<GameState>(() => {
    const savedLang = localStorage.getItem('fm_lang') as Language;
    return {
      currentWeek: 1,
      totalWeeks: 0,
      currentDate: '2024-04-01',
      userTeamId: null,
      managerName: '',
      isProcessing: false,
      matchMinute: 0,
      matchDuration: 10,
      graphicsQuality: 'HIGH',
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
  }, [fixtures]);

  const userTeam = teams.find(t => t.id === gameState.userTeamId);

  // O MUNDO (aba WORLD COMPETITIONS): as outras ligas e as copas. Cria-se no arranque do jogo (ou ao carregar um save) e avanca com a data (textSim/world.ts, textSim/competitions.ts).
  // Os jogos de copa do utilizador entram nas `fixtures` (tipo CUP) sem coincidir com outros jogos dos clubes, e os adversarios entram em `teams`/`players`.
  const openWorld = () => {
    if (world || !userTeam) return;   // normalmente ja existe (startGame / importGameData)
    const w = createWorld(ligaIdDoClube(userTeam), gameState.currentDate, worldSaved.current);
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

  // INBOX — o motor escreve; a tela so le. Cada razao gera uma mensagem so (as `keys` evitam repeticao ao recarregar ou reprocessar um dia).
  const empurrarInbox = (novas: MensagemInbox[]) => { if (novas.length) setInbox(prev => adicionar(prev, novas)); };
  const markInboxRead = (ids: string[]) => setInbox(prev => (prev.some(m => !m.lida && ids.includes(m.id)) ? prev.map(m => (ids.includes(m.id) ? { ...m, lida: true } : m)) : prev));
  const markAllInboxRead = () => setInbox(prev => (prev.some(m => !m.lida) ? prev.map(m => ({ ...m, lida: true })) : prev));
  const deleteInbox = (ids: string[]) => setInbox(prev => prev.filter(m => !ids.includes(m.id)));

  // E-mails de boas-vindas ao clube (uma vez por clube do utilizador).
  useEffect(() => {
    if (!userTeam || !teams.length) return;
    if (inbox.some(m => m.keys.includes('welcome|board'))) return;
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
  }, [userTeam?.id, teams.length, players.length > 0]);

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
      caixa: userTeam.cash, folhaSemanal: meus.reduce((a, p) => a + p.salary, 0), formatar: formatCurrency, janelaAberta: isTransferWindowOpen()
    }, chavesDe(inbox)));
  }, [gameState.currentDate, jogosDoUtilizadorSig, base?.mesProcessado, userTeam?.id]);

  // CATEGORIAS DE BASE E CONTRATOS — corre no motor (a cada mudanca de data), nao na tela: a aba Sub-20 so mostra o resultado.
  //  . todo clube tem exatamente 20 jovens de 15 a 20 anos (clubes que entram depois, como os das copas, ganham a base aqui);
  //  . a idade acompanha o nascimento; quem faz 21 anos sai da base (o do utilizador vira jogador livre no MARKET; os da CPU deixam o jogo) e a vaga e reposta;
  //  . cada mes novo e processado uma vez (o marcador `mesProcessado` vai no save, entao recarregar nao repete).
  useEffect(() => {
    if (!teams.length || !gameState.userTeamId) return;
    const hoje = gameState.currentDate;
    const r = processarBase(garantirBase(base, teams.map(t => t.id), hoje), hoje);
    if (r.base !== base) setBase(r.base);
    const doUtilizador = r.saidas.filter(j => j.teamId === gameState.userTeamId).map(j => ({ ...j, teamId: 'MARKET' }));
    if (doUtilizador.length) { setPlayers(prev => [...prev, ...doUtilizador.filter(j => !prev.some(p => p.id === j.id))]); empurrarInbox(avisoDeSaidaDaBase(hoje, gameState.language, doUtilizador)); }
  }, [gameState.currentDate, teams.length, gameState.userTeamId]);

  // Contratos dos profissionais: quem ainda nao tem contrato recebe um coerente com as faixas; a idade acompanha o nascimento (quem veio da base);
  // no dia do vencimento o jogador do utilizador fica livre (MARKET, fora da escalacao) e os da CPU renovam (contrato novo a partir de hoje, sem alterar o passado).
  useEffect(() => {
    if (!players.length || !gameState.userTeamId) return;
    const hoje = gameState.currentDate, dono = gameState.userTeamId;
    const expirados = new Set(processarContratos(players, hoje, dono).liberados);
    if (expirados.size) empurrarInbox(avisoDeLiberados(hoje, gameState.language, players.filter(p => expirados.has(p.id))));
    setPlayers(prev => processarContratos(prev, hoje, dono).jogadores);
    if (expirados.size) setTeams(prev => prev.map(t => t.id === dono
      ? { ...t, lineup: t.lineup.map(id => (expirados.has(id) ? '' : id)), bench: (t.bench || []).map(id => (expirados.has(id) ? '' : id)) } : t));
  }, [gameState.currentDate, players.length, gameState.userTeamId]);

  // Renovar: um contrato novo a partir de hoje, com a duracao sorteada pela idade de hoje (o antigo e substituido, nunca editado).
  const renewPlayer = (playerId: string) => {
    if (!userTeam) return;
    const alvo = players.find(p => p.id === playerId && p.teamId === userTeam.id);
    if (!alvo) return;
    const renovado: Player = { ...alvo, contract: renovarContrato(alvo.age, gameState.currentDate) };
    setPlayers(prev => prev.map(p => (p.id === playerId ? renovado : p)));
    empurrarInbox([avisoDeRenovacao(gameState.currentDate, gameState.language, renovado)]);
  };

  // Promover um jovem da base ao time principal: decisao manual do treinador. O jogador passa inteiro (id, atributos, potencial, contrato); a vaga e reposta.
  const promoteYouth = (playerId: string): boolean => {
    if (!base || !userTeam) return false;
    const r = promoverJovem(base, playerId, gameState.currentDate);
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

  const updateSettings = (settings: Partial<Pick<GameState, 'language' | 'currency' | 'wageFrequency' | 'themeMode' | 'matchDuration' | 'simulationSpeed' | 'graphicsQuality'>>) => {
    if (settings.language) localStorage.setItem('fm_lang', settings.language);
    setGameState(prev => ({ ...prev, ...settings }));
  };

  const updateMatchVisualState = (visual: Partial<MatchVisualState>) => {
    setGameState(prev => ({
      ...prev,
      matchVisual: prev.matchVisual ? { ...prev.matchVisual, ...visual } : (visual as MatchVisualState)
    }));
  };

  const t = (key: string) => {
    const dict = TRANSLATIONS[gameState.language] || TRANSLATIONS['EN'];
    return dict[key] || key;
  };

  const formatCurrency = (value: number) => {
    let amount = value;
    if (gameState.currency === 'EUR') amount *= 0.92;
    else if (gameState.currency === 'BRL') amount *= 5.0;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: gameState.currency, maximumFractionDigits: 0 }).format(amount);
  };

  const formatCurrencyShort = (value: number) => {
    let amount = value;
    if (gameState.currency === 'EUR') amount *= 0.92;
    else if (gameState.currency === 'BRL') amount *= 5.0;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
    return amount.toString();
  };

  const formatWage = (weeklyValue: number) => {
    let amount = gameState.wageFrequency === 'MONTHLY' ? weeklyValue * 4.33 : weeklyValue;
    return formatCurrency(amount);
  };

  const startGame = (teamId: string, managerName: string, countryId: string, leagueId: string = 'bra_serie_a') => {
    let { teams: initTeams, players: initPlayers } = generateLeagueData(countryId, leagueId);
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
    let initFixtures = generateFixtures(initTeams, leagueId);
    if (formato === 'SERIE_C') initFixtures = initFixtures.filter(f => f.week <= initTeams.length - 1);   // so o 1.o turno

    // --- CPU FRIENDLY SCHEDULING (PRE-SEASON) ---
    const preseasonDates = ["2024-04-04", "2024-04-07", "2024-04-11"];
    const cpuFriendlies: Fixture[] = [];

    initTeams.forEach(team => {
      if (team.id === teamId) return; // Player schedules their own via UI

      preseasonDates.forEach(date => {
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
    const mundo = createWorld(leagueId, '2024-04-01', null);
    const copas = prepararCopas({ world: mundo, userTeamId: teamId, teams: initTeams, players: initPlayers, fixtures: initFixtures, date: '2024-04-01', comps: null });
    worldSaved.current = null; compsSaved.current = null;
    setWorld(mundo);
    if (copas) {
      setComps(copas.comps);
      initFixtures = [...initFixtures, ...copas.fixtures].sort((a, b) => a.date.localeCompare(b.date));
    } else setComps(null);

    setTeams(copas ? [...initTeams, ...copas.teams] : initTeams);
    setPlayers(copas ? [...initPlayers, ...copas.players] : initPlayers);
    setBase(null);   // a base nasce no motor (efeito acima), com a data do jogo
    setInbox([]);    // as boas-vindas nascem no motor, com o clube escolhido
    setFixtures(initFixtures);
    setGameState(prev => ({
      ...prev,
      currentWeek: 1,
      totalWeeks: jornadasDaLiga,
      currentDate: '2024-04-01',
      userTeamId: teamId,
      managerName,
      view: 'DASHBOARD',
      matchMode: 'NONE',
      matchVisual: undefined
    }));
  };

  const advanceDay = () => {
    const isTrainingCamp = gameState.activities.some(a => a.date === gameState.currentDate && a.type === 'TRAINING_CAMP');

    setGameState(prev => {
      const d = new Date(prev.currentDate + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      return { ...prev, currentDate: d.toISOString().split('T')[0] };
    });

    // Daily fitness recovery based on training schedule
    setPlayers(prevPlayers => {
      const d = new Date(gameState.currentDate + 'T12:00:00');
      const dayIdx = (d.getDay() + 6) % 7; // Monday = 0, Sunday = 6

      // O treino da CPU: por time, descansa na vespera do jogo ou com o grupo cansado, e treina nos outros dias (textSim/trainingService.ts).
      const planosCpu = new Map<string, { recuperacao: number; treina: boolean }>();
      {
        const porTime = new Map<string, Player[]>();
        prevPlayers.forEach(pl => { if (pl.teamId !== gameState.userTeamId) { if (!porTime.has(pl.teamId)) porTime.set(pl.teamId, []); porTime.get(pl.teamId)!.push(pl); } });
        porTime.forEach((elenco, tid) => {
          const prox = fixtures.filter(f => !f.played && f.date >= gameState.currentDate && (f.homeTeamId === tid || f.awayTeamId === tid)).map(f => f.date).sort()[0];
          const dias = prox ? Math.round((new Date(prox + 'T12:00:00').getTime() - new Date(gameState.currentDate + 'T12:00:00').getTime()) / 86400000) : 7;
          planosCpu.set(tid, cpuPlanoDoDia(elenco, dias));
        });
      }

      return prevPlayers.map(p => {
        let dailyRecovery = 0;
        let moraleBoost = 0;

        if (p.injury) {
          dailyRecovery = 15;
        } else if (p.teamId === gameState.userTeamId) {
          // User team follows training schedule (respecting group)
          const gIdx = p.trainingGroupId || 0;
          const userSchedules = gameState.trainingSchedules || [gameState.trainingSchedule, [], []];
          const groupSchedule = userSchedules[gIdx] || gameState.trainingSchedule;

          for (let slot = 0; slot < 4; slot++) {
            const actId = groupSchedule[dayIdx] ? groupSchedule[dayIdx][slot] : null;
            if (!actId || actId === 'recovery') {
              dailyRecovery += 4; // 4 points per empty period or recovery session
            }
            if (actId && actId !== 'recovery') {
              const act = ACTIVITIES.find(a => a.id === actId);
              const fitBonus = act?.impacts.find(imp => imp.label === 'FIT')?.value || 0;
              const stmCost = act?.impacts.find(imp => imp.label === 'STM')?.value || 0;
              dailyRecovery += (fitBonus + stmCost); // Sum bonus and cost
            }
          }
          if (isTrainingCamp) {
            dailyRecovery += 1;
            moraleBoost += 1;
          }
        } else {
          // Outros times: o plano do treinador da CPU (descanso ou treino do dia)
          const plano = planosCpu.get(p.teamId) || { recuperacao: 15, treina: false };
          dailyRecovery = plano.recuperacao;
          if (plano.treina) { p = { ...p, trainingAccumulated: p.trainingAccumulated ? { ...p.trainingAccumulated } : undefined } as Player; cpuAplicarTreino(p); }
        }

        return {
          ...p,
          fitness: Math.min(100, Math.max(0, p.fitness + dailyRecovery)),
          morale: Math.min(100, Math.max(0, (p.morale || 50) + moraleBoost)),
          injury: p.injury ? (p.injury.daysOut > 1 ? { ...p.injury, daysOut: p.injury.daysOut - 1 } : undefined) : undefined
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
  };

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
        const official = countsForLeague(f);

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
              p.injury = { type: e.injuryName, daysOut: e.injuryDaysOut, severity: e.injurySeverity };
              if (e.injurySeverity === 'LIGHT') {
                p.fitness = Math.max(0, (p.fitness || 100) - 15);
              } else {
                p.fitness = 80 - (e.injuryDaysOut * 15);
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
              // Ajusta moral baseado na nota
              if (rating >= 8.5) p.morale = Math.min(100, p.morale + 10);
              else if (rating >= 7.5) p.morale = Math.min(100, p.morale + 5);
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
        const gains = { def: 0, pas: 0, drb: 0, sht: 0, mor: 0 };
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

        const pGroup = p.trainingGroupId || 0;
        const gains = isUserPlayer ? groupGains[pGroup] : {
          def: Math.random() * 8,
          pas: Math.random() * 8,
          drb: Math.random() * 8,
          sht: Math.random() * 8,
          mor: (Math.random() - 0.5) * 4
        };

        // Reset weekly level-up indicator (Prog. column OVR growth) only on Mondays 
        const d = new Date(gameState.currentDate + 'T12:00:00');
        if (d.getDay() === 1) { // 1 = Monday
          p.weeklyGrowth = 0;
          p.trainingSessionsThisWeek = 0; // RESET SESSIONS ON MONDAY MORNING
        }

        // Calculate arrows based on training focus (points) for this simulation block
        p.lastGrowth = { def: 0, pas: 0, drb: 0, sht: 0 };

        // Ensure robust initialization of tracking objects
        if (!p.trainingAccumulated) p.trainingAccumulated = { def: 0, pas: 0, drb: 0, sht: 0 };

        // Age factor: Young players grow faster, old players might decline
        const ageFactor = p.age < 22 ? 1.5 : (p.age > 32 ? 0.5 : 1.0);

        ['def', 'pas', 'drb', 'sht'].forEach(attr => {
          const key = attr as keyof typeof groupGains[0];
          const attrKey = attr as 'def' | 'pas' | 'drb' | 'sht';

          // Add points to accumulation buffer (100 points = +1 attribute)
          const points = (gains[key] || 0) * ageFactor;
          p.trainingAccumulated![key] += points;

          // Visual arrows: 1 arrow per 1.5 points of intensity in this block
          if (points > 0) p.lastGrowth![attrKey] = Math.min(3, Math.max(1, Math.floor(points / 1.5)));
          else if (points < 0) p.lastGrowth![attrKey] = Math.max(-3, Math.min(-1, Math.ceil(points / 1.5)));

          if (points !== 0) updated = true;

          while (p.trainingAccumulated![key] >= 100) {
            p[attrKey] = Math.min(99, p[attrKey] + 1);
            p.trainingAccumulated![key] -= 100;
            p.weeklyGrowth = (p.weeklyGrowth || 0) + 1;
            updated = true;
          }
          while (p.trainingAccumulated![key] <= -100) {
            p[attrKey] = Math.max(1, p[attrKey] - 1);
            p.trainingAccumulated![key] += 100;
            p.weeklyGrowth = (p.weeklyGrowth || 0) - 1;
            updated = true;
          }
        });

        // Update morale and fitness
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
          const newFit = isLight ? p.fitness : (80 - (event.injuryDaysOut! * 15));
          return {
            ...p,
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
      pos: i + 1, nome: l.t.name, logo: (l.t as any).logoUrl || null, cores: [l.t.primaryColor, l.t.secondaryColor, l.t.tertiaryColor],
      pts: l.pts, v: l.v, forma: l.forma.slice(-5), vivo: vivo.get(l.t.id) || null, destaque: !!uf && (l.t.id === uf.homeTeamId || l.t.id === uf.awayTeamId)
    }));
  };

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
    } else if (m.tipo === 'intervalo_iniciado') {
      // As estatisticas abriram no 3D: manda a classificacao ate este momento (com o resultado provisorio do jogo em curso).
      const linhas = classificacaoDoIntervalo(uf);
      if (linhas.length) simulador3dEnviar({ tipo: 'classificacao', linhas, emCurso: (classificacaoDoIntervalo as any).ultimoEmCurso || 0 });
      // As notas dos jogadores ate este momento, no mesmo ecra das estatisticas (nome curto e nota, de cada equipa, pela nota).
      try {
        const notas = calculateMatchRatings(uf.events || [], casa, fora, uf.homeScore || 0, uf.awayScore || 0, uf.homeLineup, uf.awayLineup, players);
        const lado = (t: Team) => Object.entries(notas)
          .map(([id, nota]) => ({ p: players.find(x => x.id === id), nota: nota as number }))
          .filter(x => x.p && x.p.teamId === t.id)
          .sort((a, b) => b.nota - a.nota)
          .map(x => ({ nome: String(x.p!.name).split(' ').pop(), nota: Math.round(x.nota * 10) / 10 }));
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
  const playMatchDay = (modo?: any) => {
    if (gameState.isProcessing || motor3dProgresso !== null) return;
    if (modo !== 'VISUAL') {
      prepararMotor3D().then(() => playMatchDayCore('SIMULATION'));
    } else {
      playMatchDayCore('VISUAL');
    }
  };

  const playMatchDayCore = (modo: MatchMode) => {
    if (gameState.isProcessing) return;
    if (gameState.matchMinute >= maxDurationRef.current) return;

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

          return prevPlayers.map(p => {
            if (!starters.has(p.id)) return p;
            const team = teams.find(t => t.id === p.teamId);
            const tactics = team?.tactics;
            // Mesma fórmula usada pelo motor: assistir e simular a partida
            // precisam desgastar o elenco exatamente igual.
            const perMinute = matchFatiguePerMinute(tactics, p.position);
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

            let newFit = p.fitness - (perMinute * injuryMultiplier);
            if (min === 45) newFit = Math.min(100, newFit + 3);
            return { ...p, fitness: Math.max(0, newFit) };
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
        if (homeT && homeT.id !== gameState.userTeamId && awayT) manageCPUTeam(homeT, awayT, players);
        if (awayT && awayT.id !== gameState.userTeamId && homeT) manageCPUTeam(awayT, homeT, players);
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

          const perMinute = matchFatiguePerMinute(tactics, p.position);

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

          let newFitness = p.fitness - (perMinute * minutesPlayed) - injuryDrop;
          // Halftime bonus if we cross the HT mark during this jump
          if (gameState.matchMinute < maxHTDurationRef.current && globalTargetMinute >= maxHTDurationRef.current) {
            newFitness += 3;
          }

          return { ...p, fitness: Math.min(100, Math.max(0, newFitness)) };
        });
      });
    }
  };

  // Os cobradores e o capitao do time (aba Match Tactics): guarda-se no time e vai ao motor 3D com a partida.
  const updateSetPieceTakers = (teamId: string, takers: Team['setPieceTakers']) => {
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, setPieceTakers: takers } : t));
  };

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
                    playerId: pid
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

    setTeams(prev => prev.map(t => t.id === userTeam.id ? { ...t, cash: t.cash - player.value } : t));
    const contratado: Player = { ...player, teamId: userTeam.id, shirtNumber: 25 + Math.floor(Math.random() * 50), contract: novoContrato(player.age, gameState.currentDate) };
    setPlayers(prev => prev.map(p => p.id === player.id ? contratado : p));
    empurrarInbox([avisoDeContratacao(gameState.currentDate, gameState.language, contratado, formatCurrency(player.value))]);
  };

  const sellPlayer = (playerId: string) => {
    if (!userTeam) return;
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const sellPrice = Math.round(player.value * 0.8);
    setTeams(prev => prev.map(t => t.id === userTeam.id ? { ...t, cash: t.cash + sellPrice } : t));
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, teamId: 'MARKET' } : p));
    empurrarInbox([avisoDeVenda(gameState.currentDate, gameState.language, player, formatCurrency(sellPrice))]);
  };

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
      alert(`Conflito! Há um jogo agendado para ${new Date(matchConflict + 'T12:00:00').toLocaleDateString('pt-BR')}. Escolha outra data ou duração.`);
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

    setGameState(prev => {
      // Remove atividades existentes em todos os dias afetados
      const cleanActivities = prev.activities.filter(a => !affectedDates.includes(a.date));

      // Adiciona as novas atividades em todos os dias afetados
      const newActivities = affectedDates.map((d, i) => ({
        id: `${id}-d${i}`,
        date: d,
        type,
        label: i === 0 ? (type === 'FRIENDLY' ? (teams.find(t => t.id === details.opponentId)?.name || 'Amistoso') : label) : `${label} (Dia ${i + 1})`
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

  const saveGame = async () => {
    const saveData = {
      teams,
      players,
      fixtures,
      gameState,
      worldResults: worldResults(world),
      comps,
      base,
      inbox,
      saveDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FootManager_Week${gameState.currentWeek}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importGameData = (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      if (data.teams && data.players && data.gameState) {
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
            logoUrl: t.logoUrl || dbTeam?.teamBadgeLocation || `/Assets/Escudos/${t.name}.png`,
            kitUrls: t.kitUrls || [
              `/Assets/Camisas/${t.name}_1.png`,
              `/Assets/Camisas/${t.name}_2.png`,
              `/Assets/Camisas/${t.name}_3.png`,
            ] as [string, string, string],
          };
        });

        // O mundo refaz-se (repondo os resultados do save) e as copas voltam do save; um save antigo, sem copas, ganha-as agora (com os jogos do utilizador no calendario).
        let tm: Team[] = patchedTeams, pl: Player[] = data.players, fx: Fixture[] = data.fixtures;
        const donoId = data.gameState.userTeamId, dono = patchedTeams.find((t: Team) => t.id === donoId);
        if (dono) {
          const mundo = createWorld(ligaIdDoClube(dono), data.gameState.currentDate, data.worldResults || null);
          const copas = prepararCopas({ world: mundo, userTeamId: donoId, teams: patchedTeams, players: data.players, fixtures: data.fixtures, date: data.gameState.currentDate, comps: data.comps || null });
          worldSaved.current = null; compsSaved.current = null;
          setWorld(mundo);
          if (copas) {
            setComps(copas.comps);
            fx = [...fx, ...copas.fixtures].sort((a, b) => a.date.localeCompare(b.date)); tm = [...tm, ...copas.teams]; pl = [...pl, ...copas.players];
          } else setComps(null);
        } else { setWorld(null); setComps(null); }
        setTeams(tm);
        setPlayers(pl);
        setBase(data.base || null);   // save antigo, sem base: o motor gera as bases
        setInbox(data.inbox || []);
        setFixtures(fx);
        setGameState(data.gameState);
        return true;
      }
    } catch (e) {
      console.error("Save file inválido", e);
    }
    return false;
  };

  const isTransferWindowOpen = () => {
    const d = new Date(gameState.currentDate + 'T12:00:00');
    const month = d.getMonth();
    return [0, 1, 6, 7].includes(month);
  };

  const currentFixtures = fixtures.filter(f => f.week === gameState.currentWeek || f.date === gameState.currentDate);

  return (
    <GameContext.Provider value={{
      teams, players, fixtures, gameState, startGame, advanceDay, advanceWeek, playMatchDay, pauseMatch, resetMatchDay, updateTactics, updateSetPieceTakers, updateTeamLogo,
      hirePlayer, sellPlayer, base, inbox, markInboxRead, markAllInboxRead, deleteInbox, promoteYouth, renewPlayer, swapShirtNumbers, scheduleActivity, saveGame, importGameData, currentFixtures, userTeam, setThemeMode, world, comps, openWorld,
      isTransferWindowOpen, finishMatchDayInstant, motor3dProgresso, motor3dMensagem, updateSettings, formatCurrency, formatCurrencyShort, formatWage,
      reportLiveGoal,
      t,
      updateMatchVisualState,
      setTrainingSchedules,
      unlockTrainingGroup,
      updatePlayerTrainingGroup
    }}
    >{children}</GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within a GameProvider");
  return context;
};
