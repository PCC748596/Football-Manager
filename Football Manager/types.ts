export enum Position {
  GK = 'GK',
  LB = 'LB',
  CB = 'CB',
  RB = 'RB',
  DM = 'DM',
  LM = 'LM',
  CM = 'CM',
  RM = 'RM',
  AM = 'AM',
  LW = 'LW',
  RW = 'RW',
  SS = 'SS',
  ST = 'ST'
}

export type PlayStyle = 
  | 'None'
  | 'Defensive Goalkeeper'
  | 'Offensive Goalkeeper'
  | 'Offensive Full-back'
  | 'Full-back Finisher'
  | 'The Destroyer'
  | 'Anchor Man'
  | 'Build Up'
  | 'Box-to-Box'
  | 'Hole Player'
  | 'Prolific Winger'
  | 'Roaming Flank'
  | 'Cross Specialist'
  | 'Creative Playmaker'
  | 'Classic No. 10'
  | 'Orchestrator'
  | 'Goal Poacher'
  | 'Fox in the Box'
  | 'Target Man'
  | 'Dummy Runner'
  | 'Defensive Full-back'
  | 'Extra Frontman';

export const PLAYSTYLE_POSITIONS: Record<PlayStyle, Position[]> = {
  'None': [],
  'Defensive Goalkeeper': [Position.GK],
  'Offensive Goalkeeper': [Position.GK],
  'Offensive Full-back': [Position.LB, Position.RB],
  'Full-back Finisher': [Position.LB, Position.RB],
  'Defensive Full-back': [Position.LB, Position.RB],
  'The Destroyer': [Position.CM, Position.DM, Position.CB],
  'Anchor Man': [Position.DM],
  'Build Up': [Position.CB],
  'Extra Frontman': [Position.CB],
  'Box-to-Box': [Position.AM, Position.LM, Position.RM, Position.CM, Position.DM],
  'Hole Player': [Position.SS, Position.AM, Position.LM, Position.RM, Position.CM],
  'Prolific Winger': [Position.LW, Position.RW],
  'Roaming Flank': [Position.LW, Position.RW, Position.LM, Position.RM],
  'Cross Specialist': [Position.LW, Position.RW, Position.LM, Position.RM],
  'Creative Playmaker': [Position.SS, Position.LW, Position.RW, Position.AM, Position.LM, Position.RM],
  'Classic No. 10': [Position.SS, Position.AM, Position.CM],
  'Orchestrator': [Position.CM, Position.DM],
  'Goal Poacher': [Position.ST, Position.SS],
  'Fox in the Box': [Position.ST],
  'Target Man': [Position.ST],
  'Dummy Runner': [Position.ST, Position.SS, Position.AM]
};

// A descricao de cada PlayStyle (a mesma lista das posicoes acima: cada estilo so serve as posicoes de PLAYSTYLE_POSITIONS). Mostrada no Overview do jogador.
export const PLAYSTYLE_DESCRICAO: Record<PlayStyle, string> = {
  'None': '',
  'Goal Poacher': 'A predatory striker who plays off the shoulders of the last defender.',
  'Dummy Runner': 'A player who attracts the defence to create space for other players to exploit.',
  'Fox in the Box': 'A striker who lurks in the opposition 18 yard box just waiting for the ball.',
  'Target Man': 'A player who becomes the focal point of attack by holding the ball up in an advanced position.',
  'Creative Playmaker': 'A player who takes advantage of any opening in the defense to initiate attacks and assists in shots on the goal.',
  'Prolific Winger': 'A player who positions himself on the wing to receive passes, occasionally cutting into the center when the opportunity arises.',
  'Roaming Flank': 'A player who tends to cut inside from the wing to receive passes.',
  'Cross Specialist': 'A player who hugs the touchline, waiting for a chance to cross the ball in.',
  'Classic No. 10': 'An old-style static playmaker who makes use of deft touches and passes rather than pace or movement.',
  'Hole Player': 'A player who looks to make runs into the opposition goal area when the team is on the attack.',
  'Box-to-Box': 'A player who tirelessly covers every blade of grass for the full 90 minutes.',
  'The Destroyer': 'A tenacious battler who keeps opposition attacks at bay through hard tackling and pressing.',
  'Orchestrator': 'A player who lurks in deeper positions, ready to initiate attacks.',
  'Anchor Man': 'A deep sitting defensive midfielder protecting the backline.',
  'Build Up': 'A player who likes to drop back in order to receive the ball and trigger attacks from deep.',
  'Offensive Full-back': 'An attack-minded full back who will run upfield and join the attack when presented with a chance.',
  'Full-back Finisher': 'An attacking full-back who enjoys joining the attack in high central areas.',
  'Defensive Full-back': 'A solid full-back who prefers to stay back and stick to defensive duties.',
  'Extra Frontman': 'A defender who likes to join in the attack and lay siege on the opposition goal at every given opportunity.',
  'Offensive Goalkeeper': 'A keeper playing a sweeper type role who often comes out to cover the area behind the defence.',
  'Defensive Goalkeeper': 'A solid keeper who prefers to stay around the goal line.'
};

export interface League {
  id: string;
  name: string;
  type?: 'LEAGUE' | 'CUP';
  /** Reserva de clubes sem jogos (ex.: os clubes da Copa do Brasil fora das Series A e B): nao aparece na escolha de liga nem na aba WORLD. */
  hidden?: boolean;
  /** Liga de formato proprio (Serie C e D do Brasil): no mundo nao tem calendario de pontos corridos (ver `format`). */
  worldOnly?: boolean;
  /** ROUND_ROBIN (por omissao), SERIE_C (1.a fase de 20 + quadrangulares + meias e final) ou SERIE_D (8 grupos de 12 + mata-mata de 32). Ver textSim/competitions.ts. */
  format?: 'ROUND_ROBIN' | 'SERIE_C' | 'SERIE_D';
  cupFormat?: 'KNOCKOUT' | 'GROUPS_KNOCKOUT';
  tier: number;
  promoted?: number;
  relegated?: number;
  teamIds: number[];
  matchDates?: number[];
}

export interface Country {
  id: string;
  name: string;
  continent?: string;
  leagues: League[];
  /** Clubes sem liga nem jogos: no fim da temporada sorteiam-se daqui os que entram no lugar dos rebaixados (ligas da America Latina; o Brasil tem Serie B a serio). */
  reserveTeamIds?: number[];
  /** Brasil: os 126 clubes da Copa do Brasil (ids). */
  copaTeamIds?: number[];
  /** Classificacao final do ano anterior por liga (nomes dos clubes, do 1.o ao ultimo): decide as vagas da Libertadores/Sul-Americana. */
  classificacaoAnterior?: Record<string, string[]>;
}

export interface Contract {
  start: string;   // ISO yyyy-mm-dd: dia da assinatura
  end: string;     // ISO: dia do vencimento
  years: number;   // duracao sorteada na assinatura (pela idade nessa data)
}

export interface Player {
  id: string;
  name: string;
  age: number;
  position: Position;
  skill: number;
  fitness: number;
  morale: number;
  goalsScored: number;
  assists: number;
  appearances: number; 
  weeklyGrowth: number;
  value: number;
  salary: number; 
  contractExpiry: string; 
  /** Datas ISO reais do contrato (textSim/contracts.ts). `contractExpiry` ("W12 2026") e o campo antigo, sem uso. */
  contract?: Contract;
  /** Data de nascimento (ISO). Os jogadores da base a tem; `age` acompanha-a. */
  birthDate?: string;
  /** Potencial REAL (50-99), interno: nunca mostrado ao treinador. */
  potential?: number;
  /** A estimativa do olheiro (50-99, com margem de erro que encolhe com a idade): e dela que saem as estrelas. */
  potentialEstimate?: number;
  /** A venda esta aberta a ofertas (mercado de transferencias). */
  listedForSale?: boolean;
  /** Data em que entrou na lista de venda (a IA dispensa quem fica listado demais). */
  listadoEm?: string;
  /** Data em que ficou agente livre (teamId 'MARKET'). */
  livreDesde?: string;
  /** Ganhos fracionarios do desenvolvimento mensal (a parte que ainda nao completou 1 ponto de atributo). */
  devAcc?: { def: number; pas: number; drb: number; sht: number };
  teamId: string;
  shirtNumber: number;
  def: number;
  pas: number;
  drb: number;
  sht: number;
  trainingAccumulated?: {
    def: number;
    pas: number;
    drb: number;
    sht: number;
    mor: number;
  };
  lastGrowth?: {
    def: number;
    pas: number;
    drb: number;
    sht: number;
  };
  lastRating?: number;
  playStyle?: PlayStyle;
  trainingGroupId?: number; // 0, 1, or 2
  injury?: {
    type: string;
    daysOut: number;
    severity: 'LIGHT' | 'MEDIUM' | 'SEVERE';
  };
}

export interface Tactics {
  formation: '4-4-2' | '4-3-3' | '4-3-3 ATA' | '3-5-2' | '5-4-1' | '4-2-3-1' | '5-3-2';
  style: 'Very Defensive' | 'Defensive' | 'Balanced' | 'Offensive' | 'Very Offensive';
  aggression: 'Very Passive' | 'Passive' | 'Balanced' | 'Aggressive' | 'Very Aggressive';
  pressure: number; 
  defensiveLine: number; 
  tempo: number; 
  focusSectors: ('Left' | 'Center' | 'Right')[];
}

export interface Team {
  id: string;
  name: string;
  managerName: string; 
  /** Conhecimento tatico do treinador (0-100): quanto maior, mais cedo a CPU le o jogo e muda a equipa (ver textSim/treinadores.ts). */
  managerTactics?: number;
  teamAbb: string;
  country: string;
  city: string; 
  stadium: string; 
  stadiumCapacity?: number;
  foundedYear: number; 
  strength: number;
  chemistry: number; 
  chemistryTrainingCounter: number; 
  cash: number;
  /** Orcamento de transferencias: o limite que o clube pode gastar em contratacoes (o `cash` e o saldo disponivel). Ver textSim/transferencias.ts. */
  transferBudget?: number;
  initialCapital?: number;
  initialTransfer?: number;
  sponsorAmount?: number;
  fanBase?: number;
  avrAttendance?: number;
  stadiumOccupancy?: number;   // 0..1: a ocupacao-BASE do estadio (comeca em 70%, minimo 20%; ver textSim/stadiumEconomy.ts)
  drawStreak?: number;         // empates seguidos do time (zera com vitoria ou derrota)
  stadiumOwned?: boolean;      // estadio proprio (custo -30%); sem valor, decide a lista de estadios alugados
  homeGames?: number;          // jogos em casa liquidados (para o publico medio)
  gateRevenue?: number;        // renda de bilheteira acumulada (dolares do jogo)
  stadiumCosts?: number;       // custo de estadio acumulado (dolares do jogo)
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  shirtPattern?: string;
  homeKit?: { pattern: string; color1: string; color2: string; color3: string; numberColor?: string; numberOutlineColor?: string; collarColor?: string; sleeveColor?: string; shortColor?: string; shortTrimColor?: string; };
  awayKit?: { pattern: string; color1: string; color2: string; color3: string; numberColor?: string; numberOutlineColor?: string; collarColor?: string; sleeveColor?: string; shortColor?: string; shortTrimColor?: string; };
  thirdKit?: { pattern: string; color1: string; color2: string; color3: string; numberColor?: string; numberOutlineColor?: string; collarColor?: string; sleeveColor?: string; shortColor?: string; shortTrimColor?: string; };
  gkKit?: { pattern: string; color1: string; color2: string; color3: string; numberColor?: string; numberOutlineColor?: string; collarColor?: string; sleeveColor?: string; shortColor?: string; shortTrimColor?: string; };
  leagueId: string;
  /** Serie D: o grupo (A-H) em que o clube joga no jogo; so os 12 do grupo do utilizador estao na liga dele. */
  groupId?: string;
  logoUrl?: string;
  kitUrls?: [string, string, string];
  tactics: Tactics;
  lineup: string[]; 
  bench: string[];  
  synergyMap?: Record<string, number>;
  /** Os cobradores e o capitao designados na aba Match Tactics (ids de jogador). Sem valor: o motor escolhe como sempre. */
  setPieceTakers?: SetPieceTakers;
}

export type SetPieceRole = 'captain' | 'cornerL' | 'cornerR' | 'freeKickLong' | 'freeKickDirectL' | 'freeKickDirectR' | 'penalty';
export type SetPieceTakers = Partial<Record<SetPieceRole, string>>;

export interface KitDetails {
  c1: string;   // primary
  c2?: string;  // secondary (stripes/diagonal)
  c3?: string;  // tertiary
  sc?: string;  // sleeve color
  clc?: string; // collar color
  shc?: string; // short color (sem ele: a do desenho da camisa, ver kitShorts)
  shtc?: string; // cor da aba (barra da bainha) do short (sem ela: a da gola)
  nc?: string;  // number color
  noc?: string; // number outline color
  diagonal?: boolean;
  cruzMalta?: boolean; // cruz de malta na faixa (Vasco-RJ): o 3D desenha-a na faixa, à altura do coração
  diagonalWidth?: number; // 0 to 100, default around 20 for MatchDay
  multipleDiagonals?: boolean;
  horizontal?: boolean;
  dualDiagonal?: boolean;
  centerVerticalStripes?: boolean;
  gradient?: boolean;
  spfcStripes?: boolean;
  criciumaStripes?: boolean;
  meiao?: { cores: string[]; pesos: number[] }; // meião às faixas (de cima para baixo); sem ele é liso na cor c1
}

/*
O SHORT DO KIT — uma so conta, lida pelo Dashboard (ShirtIcon) e pelo 3D (uniformeDoKit em 3dMatch/simulador3dCliente.ts).
`cor`: a do kit (`shc`), ou a secundaria quando a camisa tem desenho (listras, faixas, diagonais) e a primaria quando e lisa; o do
goleiro e sempre da cor da camisa. `aba`: a barra da bainha, na cor `shtc` ou na da gola (`clc`); sem nenhuma das duas, sem aba.
*/
export const kitShorts = (k: KitDetails, camisaDeLinha = true): { cor: string; aba?: string } => {
  const listrado = !!k.c2 && !k.gradient && !k.horizontal;
  const comDesenho = !!k.c2 && ((!!k.horizontal) ||
    (listrado && !!(k.centerVerticalStripes || k.spfcStripes || k.criciumaStripes || k.diagonal || k.multipleDiagonals || k.dualDiagonal)));
  const cor = k.shc || ((camisaDeLinha && comDesenho) ? (k.c2 as string) : k.c1);
  // Short verde: a barra da bainha é branca (a do Juventude-RS vinha preta, da gola do kit); só se o kit não fixar `shtc`.
  const aba = k.shtc || ((ehVerde(cor) && (!k.clc || ehEscura(k.clc))) ? 'white' : (k.clc || undefined));
  return { cor, aba };
};

// Verde (qualquer tom): o canal G domina claramente. Aceita #rgb/#rrggbb; nomes de cor CSS não verdes ficam de fora.
export const ehVerde = (c?: string): boolean => {
  if (!c) return false;
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return /^(green|darkgreen|limegreen|seagreen|forestgreen)$/i.test(c.trim());
  const h = m[1].length === 3 ? m[1].split('').map(x => x + x).join('') : m[1];
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return g > r * 1.25 && g > b * 1.25 && g > 60;
};
const ehEscura = (c: string): boolean => {
  if (/^black$/i.test(c.trim())) return true;
  const m = /^#([0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return false;
  const r = parseInt(m[1].slice(0, 2), 16), g = parseInt(m[1].slice(2, 4), 16), b = parseInt(m[1].slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) < 70;
};

export const getKitDetails = (team: Team, kitIdx: 0 | 1 | 2): KitDetails => {
    // Default logic
    let c1 = team.primaryColor;
    let c2 = team.secondaryColor;
    let c3 = team.tertiaryColor;
    let sc: string | undefined = undefined; // sleeveColor
    let nc: string | undefined = undefined;
    let clc: string | undefined = undefined; // collar color
    let noc: string | undefined = undefined; // number outline color
    let shcK: string | undefined = undefined;   // short color (so os kits que o fixam)
    let shtcK: string | undefined = undefined;  // aba (barra) do short
    let multipleDiagonals = false;
    let horizontal = false;
    let dualDiagonal = false;

    // Casa listrada (2 cores distintas): a fora e LISA, nao as listras invertidas. Casa de cor principal escura -> fora BRANCA com gola e numero na cor principal do clube;
    // casa de cor principal clara -> fora na cor escura do clube, com gola e numero brancos.
    const casaListrada = !!team.secondaryColor && team.secondaryColor !== 'transparent' && team.secondaryColor !== team.primaryColor;
    if (kitIdx === 1 && casaListrada) { // Away
        if (!isColorLight(team.primaryColor)) { c1 = 'white'; clc = team.primaryColor; nc = team.primaryColor; }
        else { c1 = !isColorLight(team.secondaryColor) ? team.secondaryColor : '#1e293b'; clc = 'white'; nc = 'white'; }
        c2 = undefined;
        c3 = undefined;
    } else if (kitIdx === 1) { // Away
        c1 = team.secondaryColor;
        c2 = team.primaryColor;
        c3 = undefined;
    } else if (kitIdx === 2) { // Third
        c1 = team.tertiaryColor && team.tertiaryColor !== 'transparent' ? team.tertiaryColor : team.primaryColor;
        c2 = undefined;
        c3 = undefined;
    }

    // Special Cases: Tricolor or Striped Pattern Clubs
    const isFluminense = team.name === 'Fluminense-RJ';
    const isGremio = team.name === 'Grêmio-RS';
    const isSampaio = team.name === 'Sampaio Corrêa-MA';   // o desenho do Grêmio (listras largas separadas por um filete) nas cores dele: amarelo e vermelho do escudo, filete verde
    const isJuventude = team.name === 'Juventude-RS';
    const isPalmeiras = team.name === 'Palmeiras-SP';
    const isInter = team.name === 'Internacional-RS';
    const isCorinthians = team.name === 'Corinthians-SP';
    const isVasco = team.name === 'Vasco-RJ';
    const isCuiaba = team.name === 'Cuiabá-MT';
    const isBotafogoRJ = team.name === 'Botafogo-RJ';
    const isFortalezaCE = team.name === 'Fortaleza-CE';
    const isAtleticoPR = team.name === 'Atlético-PR';
    const isAtleticoGO = team.name === 'Atlético-GO';
    const isVitoriaBA = team.name === 'Vitória-BA';
    const isBahiaBA = team.name === 'Bahia-BA';
    const isColoColo = team.name === 'Colo-Colo';   // 1: igual ao do Bahia-BA (azul escuro e vermelho com filete branco); 2: branco/branco; 3: vermelha com faixa preta
    const isCruzeiroMG = team.name === 'Cruzeiro-MG';
    const isBragantinoSP = team.name === 'Bragantino-SP';
    const isSaoPauloSP = team.name === 'São Paulo-SP';
    const isAtleticoMG = team.name === 'Atlético-MG';
    const isFlamengoRJ = team.name === 'Flamengo-RJ';
    const isCriciumaSC = team.name === 'Criciúma-SC';

    let diagonal = false;
    let centerVerticalStripes = false;
    let gradient = false;
    let spfcStripes = false;
    let criciumaStripes = false;

    if (isFluminense || isGremio || isSampaio || isColoColo || isJuventude || isPalmeiras || isInter || isCorinthians || isVasco || isCuiaba || isBotafogoRJ || isFortalezaCE || isAtleticoPR || isVitoriaBA || isAtleticoGO || isBahiaBA || isCruzeiroMG || isBragantinoSP || isSaoPauloSP || isAtleticoMG || isFlamengoRJ || isCriciumaSC) {
        const darkerGreen = '#004c27';
        const palmeirasGreen = '#054432';
        const interRed = '#c1121f';
        const phosGreen = '#dfff00';
        const juveGreen = '#15803d';
        const gremioBlue = '#0d80bf';
        const vascoRed = '#ff0000';

        if (isVasco) {
            if (kitIdx === 0) { // Home: Preta, lista branca diagonal, gola preta, num vermelho borda branca
                c1 = 'black'; c2 = 'white'; diagonal = true; nc = vascoRed; noc = 'white'; clc = 'black';
            } else if (kitIdx === 1) { // Away: Invertida (Branca, lista preta diagonal)
                c1 = 'white'; c2 = 'black'; diagonal = true; nc = vascoRed; noc = 'white'; clc = 'white';
            } else if (kitIdx === 2) { // Third: Branca, mangas douradas, gola branca, num vermelho
                c1 = 'white'; sc = '#FFD700'; nc = vascoRed; clc = 'white';
            }
        } else if (isJuventude) {
            if (kitIdx === 0) { // Home: Verde e Branco listrado
                c1 = juveGreen; c2 = 'white'; c3 = undefined; nc = darkerGreen; noc = 'white'; clc = darkerGreen;
            } else if (kitIdx === 1) { // Away: Toda branca, gola verde
                c1 = 'white'; c2 = undefined; c3 = undefined; nc = juveGreen; clc = juveGreen;
            } else if (kitIdx === 2) { // Third: Verde Escuro e Verde Claro listrado, número branco
                c1 = darkerGreen; c2 = juveGreen; c3 = undefined; nc = 'white'; clc = 'black';
            }
        } else if (isPalmeiras) {
            if (kitIdx === 0) { // Home: Verde Escuro, gola e número branco
                c1 = palmeirasGreen; c2 = undefined; c3 = undefined; nc = 'white'; clc = 'white';
            } else if (kitIdx === 1) { // Away: Branco, gola e número verde
                c1 = 'white'; c2 = undefined; c3 = undefined; nc = palmeirasGreen; clc = palmeirasGreen;
            } else if (kitIdx === 2) { // Third: Amarelo, gola e número verde
                c1 = '#eab308'; c2 = undefined; c3 = undefined; nc = palmeirasGreen; clc = palmeirasGreen;
            }
        } else if (isInter) {
            if (kitIdx === 0) { // Home: Vermelho, gola e número branco
                c1 = interRed; c2 = undefined; c3 = undefined; nc = 'white'; clc = 'white';
            } else if (kitIdx === 1) { // Away: Branco, gola e número vermelho
                c1 = 'white'; c2 = undefined; c3 = undefined; nc = interRed; clc = interRed;
            } else if (kitIdx === 2) { // Third: Cinza 70%, gola e número verde fosforescente
                c1 = '#4d4d4d'; c2 = undefined; c3 = undefined; nc = phosGreen; clc = phosGreen;
            }
        } else if (isCorinthians) {
            if (kitIdx === 0) { // Home: Branco, gola e número preto
                c1 = 'white'; c2 = undefined; c3 = undefined; nc = 'black'; clc = 'black';
            } else if (kitIdx === 1) { // Away: Preto, mangas, gola e números brancos
                c1 = 'black'; c2 = undefined; c3 = undefined; sc = 'white'; nc = 'white'; clc = 'white';
            } else if (kitIdx === 2) { // Third: Preto, gola e número laranja
                c1 = 'black'; c2 = undefined; c3 = undefined; nc = '#f97316'; clc = '#f97316';
            }
        } else if (isCuiaba) {
            if (kitIdx === 0) { // Home: Verde e Amarelo (garantindo que não fique laranja)
                c1 = '#fde047'; c2 = '#16a34a'; c3 = undefined; nc = 'black'; clc = '#16a34a'; noc = 'white';
            } else if (kitIdx === 1) { // Away: Toda verde, gola amarela, numero amarelo
                c1 = '#16a34a'; c2 = undefined; c3 = undefined; clc = '#fde047'; nc = '#fde047'; noc = 'black';
            } else if (kitIdx === 2) { // Third: Toda amarela, golas e numeros verdes
                c1 = '#fde047'; c2 = undefined; c3 = undefined; clc = '#16a34a'; nc = '#16a34a'; noc = 'white';
            }
        } else if (isBotafogoRJ) {
            if (kitIdx === 0) {
                nc = 'black'; noc = 'white';
            } else if (kitIdx === 1) { // Away: Branca, golas e numeros pretos
                c1 = 'white'; c2 = undefined; c3 = undefined; nc = 'black'; clc = 'black';
            } else if (kitIdx === 2) { // Third: Preta, golas e numeros brancos
                c1 = 'black'; c2 = undefined; c3 = undefined; nc = 'white'; clc = 'white';
            }
        } else if (isFortalezaCE) {
            if (kitIdx === 1) { // Away: Toda azul, golas brancas (com mangas vermelhas para dar o efeito), num vermelho com linha branca
                c1 = '#1d4ed8'; c2 = undefined; c3 = undefined; clc = 'white'; sc = '#ef4444'; nc = '#ef4444'; noc = 'white';
            } else if (kitIdx === 2) { // Third: Toda vermelha, golas brancas, numero azul com linha branca
                c1 = '#ef4444'; c2 = undefined; c3 = undefined; clc = 'white'; nc = '#1d4ed8'; noc = 'white';
            }
        } else if (isAtleticoPR) {
            if (kitIdx === 0) { // Home: Preta e Vermelha listrado diagonal (várias), Manga preta, numero branco
                c1 = 'black'; c2 = '#ef4444'; c3 = undefined; multipleDiagonals = true; sc = 'black'; nc = 'white'; noc = 'transparent';
            } else if (kitIdx === 1) { // Away: Branca com golas pretas e numero vermelho
                c1 = 'white'; c2 = undefined; c3 = undefined; clc = 'black'; nc = '#ef4444'; noc = 'white';
            } else if (kitIdx === 2) { // Third: Igual a 2 atual (Preta com listras vermelhas verticais)
                c1 = 'black'; c2 = '#ef4444'; c3 = undefined; nc = 'white'; clc = 'white';
            }
        } else if (isVitoriaBA) {
            if (kitIdx === 0) { // Home: Igual a 2 atual (Preta com listras vermelhas verticais)
                c1 = 'black'; c2 = '#ef4444'; c3 = undefined; nc = 'white';
            } else if (kitIdx === 1) { // Away: Branca com golas pretas e numero preto
                c1 = 'white'; c2 = undefined; c3 = undefined; clc = 'black'; nc = 'black';
            } else if (kitIdx === 2) { // Third: Igual a 2 com faixas horizontais
                c1 = 'black'; c2 = '#ef4444'; c3 = undefined; horizontal = true; sc = 'black'; nc = 'white';
            }
        } else if (isAtleticoGO) {
            if (kitIdx === 0) { // Home: Igual a do Atlético-PR 3
                c1 = 'black'; c2 = '#ef4444'; c3 = undefined; nc = 'white'; clc = 'white';
            } else if (kitIdx === 1) { // Away: Branca com lista diagonal preta e vermelha.
                c1 = 'white'; c2 = 'black'; c3 = '#ef4444'; diagonal = true; dualDiagonal = true; nc = 'white';
            } else if (kitIdx === 2) { // Third: Preta com lista diagonal vermelha. Igual a Vasco, num branco sem linha.
                c1 = 'black'; c2 = '#ef4444'; c3 = undefined; diagonal = true; nc = 'white'; noc = 'transparent';
            }
        } else if (isColoColo) {
            if (kitIdx === 0) { // Home: igual ao do Bahia-BA: azul escuro e vermelho com filete branco fino; short branco; numero azul com linha branca.
                c1 = '#0b2a6b'; c2 = 'white'; c3 = '#d71920'; clc = 'white'; nc = '#0b2a6b'; noc = 'white'; shcK = 'white';
            } else if (kitIdx === 1) { // Away: branco / branco (camisa e short), gola e numero pretos.
                c1 = 'white'; c2 = undefined; c3 = undefined; clc = '#151515'; nc = '#151515'; noc = undefined; shcK = 'white';
            } else if (kitIdx === 2) { // Third: vermelha com faixa preta (as laterais, aproximado pelas listas centrais), gola preta; short vermelho com barra preta.
                c1 = '#e30613'; c2 = '#151515'; c3 = '#151515'; centerVerticalStripes = true; clc = '#151515'; nc = 'white'; noc = '#000000'; shcK = '#e30613'; shtcK = '#151515';
            }
        } else if (isBahiaBA) {
            if (kitIdx === 1) { // Away: Branca com 2 listas vermelha e azul verticais no centro. Golas azuis. Numero branco sem linha.
                c1 = 'white'; c2 = '#ef4444'; c3 = '#1d4ed8'; centerVerticalStripes = true; clc = '#1d4ed8'; nc = 'white'; noc = 'transparent';
            } else if (kitIdx === 2) { // Third: azul clara, golas azuis, numero vermelho com linha branca.
                c1 = '#bae6fd'; c2 = undefined; c3 = undefined; clc = '#1d4ed8'; nc = '#ef4444'; noc = 'white';
            }
        } else if (isCruzeiroMG) {
            if (kitIdx === 0) { // Home: Azul com golas e numero brancos.
                c1 = '#1d4ed8'; c2 = undefined; c3 = undefined; clc = 'white'; nc = 'white'; noc = undefined;
            } else if (kitIdx === 1) { // Away: Branca golas e numero azul.
                c1 = 'white'; c2 = undefined; c3 = undefined; clc = '#1d4ed8'; nc = '#1d4ed8'; noc = undefined;
            } else if (kitIdx === 2) { // Third: Verde gola e numero branco
                c1 = '#15803d'; c2 = undefined; c3 = undefined; clc = 'white'; nc = 'white'; noc = undefined;
            }
        } else if (isBragantinoSP) {
            if (kitIdx === 0) { // Home: Preta e vermelha degrade, golas vermelhas, numero branco.
                c1 = 'black'; c2 = '#ef4444'; c3 = undefined; gradient = true; clc = '#ef4444'; nc = 'white'; noc = undefined;
            } else if (kitIdx === 1) { // Away: Branca, golas e numeros vermelho.
                c1 = 'white'; c2 = undefined; c3 = undefined; clc = '#ef4444'; nc = '#ef4444'; noc = undefined;
            } else if (kitIdx === 2) { // Third: Azul com golas vermelhas. Numero vermelho com linha branca.
                c1 = '#1d4ed8'; c2 = undefined; c3 = undefined; clc = '#ef4444'; nc = '#ef4444'; noc = 'white';
            }
        } else if (isSaoPauloSP) {
            if (kitIdx === 0) { // Home: o desenho da casa do Gremio (vermelho com listras finas branca e preta), nas cores do Sao Paulo. Numero e gola brancos.
                c1 = '#ef4444'; c2 = 'white'; c3 = 'black'; nc = 'white'; clc = 'white';
            } else if (kitIdx === 1) { // Away: Vermelha lisa, gola preta. Numero branco com linha preta.
                c1 = '#ef4444'; c2 = undefined; c3 = undefined; nc = 'white'; noc = 'black'; clc = 'black';
            } else if (kitIdx === 2) { // Third: Igual a 2 só que preta. Numero branco
                c1 = 'black'; c2 = '#ef4444'; c3 = 'white'; spfcStripes = true; nc = 'white'; noc = 'black'; clc = 'black';
            }
        } else if (isAtleticoMG) {
            if (kitIdx === 0) { // Home: Manga preto e golas brancas. Numero branco com linha preta
                c1 = 'white'; c2 = 'black'; c3 = undefined; sc = 'black'; clc = 'white'; nc = 'white'; noc = 'black';
            } else if (kitIdx === 1) { // Away: Preta com golas e numeros dourados
                c1 = 'black'; c2 = undefined; c3 = undefined; clc = '#d4af37'; nc = '#d4af37'; noc = undefined;
            } else if (kitIdx === 2) { // Third: Branca com golas e numero preto
                c1 = 'white'; c2 = undefined; c3 = undefined; clc = 'black'; nc = 'black'; noc = undefined;
            }
        } else if (isFlamengoRJ) {
            if (kitIdx === 0) { // Home: listada horizontal preto e vermelho, numero branco.
                c1 = 'black'; c2 = '#ef4444'; c3 = undefined; sc = 'black'; horizontal = true; clc = 'black'; nc = 'white'; noc = undefined;
            } else if (kitIdx === 1) { // Away: Branca com manga vermelha. Numero preto.
                c1 = 'white'; c2 = undefined; c3 = undefined; sc = '#ef4444'; clc = 'white'; nc = 'black'; noc = undefined;
            } else if (kitIdx === 2) { // Third: Preta com golas vermelhas e numero branco
                c1 = 'black'; c2 = undefined; c3 = undefined; clc = '#ef4444'; nc = 'white'; noc = undefined;
            }
        } else if (isCriciumaSC) {
            if (kitIdx === 0) { // Home: 3 faixas horizontais: Amarelo, preto e branco.
                c1 = '#facc15'; c2 = 'black'; c3 = 'white'; criciumaStripes = true; sc = '#facc15'; clc = 'black'; nc = 'white'; noc = 'black';
            } else if (kitIdx === 1) { // Away: Preta com golas amarelas e numero amarelo
                c1 = 'black'; c2 = undefined; c3 = undefined; clc = '#facc15'; nc = '#facc15'; noc = undefined;
            } else if (kitIdx === 2) { // Third: Branca com golas pretas e numero preto
                c1 = 'white'; c2 = undefined; c3 = undefined; clc = 'black'; nc = 'black'; noc = undefined;
            }
        } else if (isSampaio) {
            if (kitIdx === 0) { c1 = '#f6eb17'; c2 = '#16a34a'; c3 = '#e93034'; nc = 'black'; clc = 'black'; }
        } else if (isFluminense || isGremio) {
            const fluRed = '#831d1c';
            if (kitIdx === 0) {
                c1 = isFluminense ? fluRed : gremioBlue;
                c2 = 'white';
                c3 = isFluminense ? darkerGreen : 'black';
                nc = 'white';
                clc = 'white';
            } else if (isFluminense && kitIdx === 1) { // Fluminense Away
                c1 = 'white'; c2 = undefined; c3 = undefined; nc = fluRed; clc = darkerGreen;
            } else if (isFluminense && kitIdx === 2) { // Fluminense Third
                c1 = fluRed; c2 = undefined; c3 = undefined; nc = '#D4AF37'; clc = '#D4AF37';
            } else if (isGremio && kitIdx === 1) { // Grêmio Away
                c1 = gremioBlue; c2 = undefined; c3 = undefined; nc = 'black'; noc = 'white'; clc = 'black';
            } else if (isGremio && kitIdx === 2) { // Grêmio Third
                c1 = '#4b0082'; c2 = undefined; c3 = undefined; nc = '#D4AF37'; clc = 'black';
            }
        }
    }

    const cruzMalta = isVasco && diagonal;
    // O meião com desenho (faixas horizontais de cima para baixo; sem isto o meião é liso na cor da camisa).
    let meiao: KitDetails['meiao'];
    if (isFluminense && kitIdx <= 1) {
        // Branco com uma lista grená e outra verde, separadas por uma branca.
        meiao = { cores: ['#f2f2f2', '#831d1c', '#f2f2f2', '#004c27', '#f2f2f2'], pesos: [1, 1.1, 0.8, 1.1, 6] };
    } else if (isVasco && kitIdx === 0) {
        // Preto com a aba branca no alto.
        meiao = { cores: ['#f2f2f2', '#000000'], pesos: [1.3, 8.7] };
    }
    return { c1, c2, c3, sc, nc, clc, noc, diagonal, horizontal, multipleDiagonals, dualDiagonal, centerVerticalStripes, gradient, spfcStripes, criciumaStripes, cruzMalta, meiao, shc: shcK, shtc: shtcK };
};

export const isColorLight = (hex: string) => {
    if (!hex || hex === 'transparent' || hex === 'none' || hex === 'white') return true;
    if (!hex.startsWith('#') && /^[a-z]+$/i.test(hex)) return ['yellow', 'lime', 'cyan', 'pink', 'silver', 'gold', 'beige', 'ivory'].includes(hex.toLowerCase());   // cor com nome (Red, Black...): so estas sao claras
    const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
    const r = parseInt(cleanHex.length === 3 ? cleanHex[0] + cleanHex[0] : cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.length === 3 ? cleanHex[1] + cleanHex[1] : cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.length === 3 ? cleanHex[2] + cleanHex[2] : cleanHex.slice(4, 6), 16);
    const lumen = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lumen > 0.6; 
};

export const getGKKitDetails = (team: Team, fieldKitIdx: 0 | 1 | 2 = 0, gkKitIdx: 0 | 1 = 0, opponentTeam?: Team): KitDetails => {
    // Fluminense-RJ com o uniforme 3 (o de linha é o terceiro): goleiro todo amarelo (camisa e short; o short sai da cor da camisa lisa).
    if (team.name === 'Fluminense-RJ' && fieldKitIdx === 2) {
        return { c1: '#facc15', c2: undefined, c3: undefined, nc: 'black', noc: undefined as string | undefined, clc: '#facc15', shc: '#facc15', diagonal: false };
    }
    if (team.name === 'Vasco-RJ') {
        return { c1: '#ff8c00', c2: undefined, c3: undefined, nc: 'black', noc: 'white', clc: 'black', diagonal: false };
    }
    if (team.name === 'Cuiabá-MT') {
        return { c1: 'black', c2: undefined, c3: undefined, nc: '#fde047', noc: undefined as string | undefined, clc: 'black', diagonal: false };
    }
    if (team.name === 'Flamengo-RJ') {
        return { c1: '#5c6b73', c2: undefined, c3: undefined, nc: 'black', noc: undefined as string | undefined, clc: 'black', diagonal: false }; // Cinza naval
    }
    if (team.name === 'Botafogo-RJ') {
        return { c1: '#a855f7', c2: undefined, c3: undefined, nc: 'black', noc: 'white', clc: '#a855f7', diagonal: false }; // Purple with black numbers
    }
    if (team.name === 'Grêmio-RS') {
        return { c1: 'black', c2: undefined, c3: undefined, nc: '#38bdf8', noc: undefined as string | undefined, clc: 'black', diagonal: false }; // Black with light blue numbers
    }
    if (team.name === 'Fortaleza-CE') {
        return { c1: '#fef08a', c2: undefined, c3: undefined, nc: 'black', noc: undefined as string | undefined, clc: '#fef08a', diagonal: false }; // Light yellow with black numbers
    }
    if (team.name === 'Atlético-PR') {
        return { c1: '#ca8a04', c2: undefined, c3: undefined, nc: 'black', noc: undefined as string | undefined, clc: '#ca8a04', diagonal: false }; // Gold
    }
    if (team.name === 'Vitória-BA') {
        return { c1: '#fef08a', c2: undefined, c3: undefined, nc: 'black', noc: undefined as string | undefined, clc: 'black', diagonal: false }; // Light yellow
    }
    const fieldKit = getKitDetails(team, fieldKitIdx);
    const fieldIsLight = isColorLight(fieldKit.c1);

    const LIGHT_GK = [
        '#bef264', // Lime Green
        '#fef08a', // Yellow (Light)
        '#a5f3fc', // Cyan (Light)
        '#fbcfe8', // Pink (Light)
        '#ffffff', // White
    ];
    const DARK_GK = [
        '#ea580c', // Orange
        '#e11d48', // Rose
        '#8b5cf6', // Purple
        '#0d9488', // Teal
        '#1e293b', // Slate/Navy
    ];

    const pool = fieldIsLight ? LIGHT_GK : DARK_GK;
    
    const teamColors = [team.primaryColor, team.secondaryColor, team.tertiaryColor, fieldKit.c1, fieldKit.c2].filter(Boolean);
    if (opponentTeam) {
        teamColors.push(opponentTeam.primaryColor, opponentTeam.secondaryColor, opponentTeam.tertiaryColor);
    }
    
    // Club Specific GK kits (preserving previous logic but matching luminosity if possible)
    if (team.name === 'Juventude-RS') {
        const darkerGreen = '#004c27';
        return { c1: '#eab308', c2: undefined, c3: undefined, nc: darkerGreen, noc: undefined as string | undefined, clc: darkerGreen, diagonal: false };
    }
    if (team.name === 'Palmeiras-SP') {
        const palmeirasGreen = '#054432';
        return { c1: '#808080', c2: undefined, c3: undefined, nc: palmeirasGreen, noc: undefined as string | undefined, clc: palmeirasGreen, diagonal: false };
    }
    if (team.name === 'Internacional-RS') {
        return { c1: '#ffcc00', c2: undefined, c3: undefined, nc: 'black', noc: undefined as string | undefined, clc: 'black' };
    }
    if (team.name === 'Fluminense-RJ') {
        return { c1: '#ea580c', c2: undefined, c3: undefined, nc: 'black', noc: undefined as string | undefined, clc: 'black' };
    }
    if (team.name === 'Corinthians-SP') {
        return { c1: '#a5f3fc', c2: undefined, c3: undefined, nc: 'black', noc: undefined as string | undefined, clc: 'black' };
    }
    if (team.name === 'Atlético-GO') {
        return { c1: '#facc15', c2: undefined, c3: undefined, nc: 'black', noc: undefined as string | undefined, clc: 'black' };
    }
    if (team.name === 'Bahia-BA') {
        return { c1: '#86efac', c2: undefined, c3: undefined, nc: 'black', noc: undefined as string | undefined, clc: 'black' };
    }
    if (team.name === 'Cruzeiro-MG') {
        return { c1: '#c084fc', c2: undefined, c3: undefined, nc: 'white', noc: undefined as string | undefined, clc: 'white', diagonal: false };
    }
    if (team.name === 'Bragantino-SP') {
        return { c1: '#c084fc', c2: undefined, c3: undefined, nc: 'white', noc: undefined as string | undefined, clc: 'white', diagonal: false };
    }
    if (team.name === 'São Paulo-SP') {
        return { c1: '#1e40af', c2: undefined, c3: undefined, nc: 'white', noc: undefined as string | undefined, clc: 'white', diagonal: false };
    }
    if (team.name === 'Atlético-MG') {
        return { c1: '#d4af37', c2: undefined, c3: undefined, nc: 'black', noc: undefined as string | undefined, clc: 'black', diagonal: false };
    }
    if (team.name === 'Flamengo-RJ') {
        return { c1: '#475569', c2: undefined, c3: undefined, nc: 'black', noc: undefined as string | undefined, clc: 'black', diagonal: false };
    }
    if (team.name === 'Criciúma-SC') {
        return { c1: '#7dd3fc', c2: undefined, c3: undefined, nc: 'black', noc: undefined as string | undefined, clc: 'black', diagonal: false };
    }
    
    const available = pool.filter(c => !teamColors.includes(c));
    const chosen = available[gkKitIdx % available.length] || pool[gkKitIdx % pool.length];
    
    // Choose detail color based on GK luminosity
    const gkIsLight = isColorLight(chosen);
    const detailColor = gkIsLight ? 'black' : 'white';
    
    return {
        c1: chosen,
        c2: undefined,
        c3: undefined,
        nc: detailColor,
        noc: undefined as string | undefined,
        clc: detailColor,
        diagonal: false
    };
};

export const POSITION_MAP: Record<Position, { lvl: number, sector: number, lane: number }> = {
  [Position.GK]: { lvl: 0, sector: 0, lane: 1 },
  [Position.LB]: { lvl: 1, sector: 1, lane: 0 },
  [Position.CB]: { lvl: 1, sector: 1, lane: 1 },
  [Position.RB]: { lvl: 1, sector: 1, lane: 2 },
  [Position.DM]: { lvl: 2, sector: 2, lane: 1 },
  [Position.LM]: { lvl: 3, sector: 2, lane: 0 },
  [Position.CM]: { lvl: 3, sector: 2, lane: 1 },
  [Position.RM]: { lvl: 3, sector: 2, lane: 2 },
  [Position.AM]: { lvl: 4, sector: 2, lane: 1 },
  [Position.LW]: { lvl: 5, sector: 3, lane: 0 },
  [Position.RW]: { lvl: 5, sector: 3, lane: 2 },
  [Position.SS]: { lvl: 5, sector: 3, lane: 1 },
  [Position.ST]: { lvl: 5, sector: 3, lane: 1 },
};

/*
OS COBRADORES E O CAPITAO de um time: os designados na aba Match Tactics que ainda valem (no onze e sem lesao) e, para o resto, os MELHORES do onze — capitao o de maior nota; corners
(esquerda a melhor, direita a segunda) e falta longa o de melhor passe; falta direta e penalti o de melhor chute. O goleiro nao cobra. Usado pela aba Tactics (preenche) e na partida
(o time da CPU, ou o do utilizador que nunca abriu a aba, tambem leva os melhores).
*/
export const resolveSetPieceTakers = (team: Team, players: Player[]): SetPieceTakers => {
  const onze = team.lineup.map(id => players.find(p => p.id === id)).filter((p): p is Player => !!p && p.position !== Position.GK && !p.injury);
  const por = (f: (p: Player) => number) => [...onze].sort((a, b) => f(b) - f(a));
  const pas = por(p => p.pas), sht = por(p => p.sht), ovr = por(p => p.skill);
  const sugestao: SetPieceTakers = {
    captain: ovr[0]?.id, cornerL: pas[0]?.id, cornerR: (pas[1] || pas[0])?.id, freeKickLong: pas[0]?.id,
    freeKickDirectL: sht[0]?.id, freeKickDirectR: sht[0]?.id, penalty: sht[0]?.id
  };
  const noOnze = new Set(team.lineup);
  const atual = team.setPieceTakers || {};
  const out: SetPieceTakers = {};
  (Object.keys(sugestao) as SetPieceRole[]).forEach(role => {
    const escolhido = atual[role];
    const vale = !!escolhido && noOnze.has(escolhido) && !players.find(p => p.id === escolhido)?.injury;
    const id = vale ? escolhido : sugestao[role];
    if (id) out[role] = id;
  });
  return out;
};

export const getEffectiveSkill = (player: any, assignedPos: string): number => {
  if (!player) return 0;
  const pA = POSITION_MAP[player.position as Position];
  const pB = POSITION_MAP[assignedPos as Position];
  if (!pA || !pB) return player.skill;
  
  const verticalDist = Math.abs(pA.lvl - pB.lvl);
  const sectorDist = Math.abs(pA.sector - pB.sector);
  const horizontalDist = Math.abs(pA.lane - pB.lane);
  
  const penalty = (verticalDist * 2) + (sectorDist * 2) + (horizontalDist * 2);
  // O GOLEIRO e uma posicao a parte: um jogador de linha nao joga no gol (a penalizacao normal de 8 pontos deixava um volante de 78 ficar com a vaga do goleiro de 68), nem um goleiro joga na linha.
  const gkA = player.position === Position.GK, gkB = assignedPos === Position.GK;
  if (gkA !== gkB) return Math.max(1, player.skill - penalty - 60);
  return Math.max(1, player.skill - penalty);
};

export interface MatchEvent {
  minute: number;
  type: 'GOAL' | 'MISS' | 'CARD' | 'INJURY' | 'HALF_TIME' | 'FULL_TIME' | 'MISS_PENALTY' | 'SUB' | 'COMMENT' | 'FOUL' | 'CORNER' | 'OFFSIDE' | 'PASS' | 'TACKLE' | 'TACTICS' | 'SAVE';
  description: string;
  teamId?: string;
  playerId?: string;
  assistPlayerId?: string;
  injurySeverity?: 'LIGHT' | 'MEDIUM' | 'SEVERE' | 'LEVE' | 'MÉDIA' | 'GRAVE';
  injuryName?: string;
  shooterId?: string;
  injuryDaysOut?: number;
}

export interface Fixture {
  id: string;
  week: number;
  date: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  homePossession?: number; // percentage 0-100
  awayPossession?: number; // percentage 0-100
  currentPossession?: 'home' | 'away'; // currently attacking team
  possessionTimeline?: ('home' | 'away')[];
  subsUsedHome?: number;
  subsUsedAway?: number;
  played: boolean;
  events: MatchEvent[];
  ballZone?: number; // Current zone for UI
  ballZoneTimeline?: number[]; // History for every minute (0-10)
  isFriendly?: boolean;
  isFinal?: boolean;
  isDecisive?: boolean;        // jogo decisivo: +10% de ocupacao nesse jogo (alem das ultimas jornadas de liga)           // final: custo do estadio x1,4
  financeSettled?: boolean;    // renda e custo do jogo ja liquidados
  attendance?: number;         // publico do jogo
  gateRevenue?: number;        // renda do jogo (dolares do jogo), do mandante
  stadiumCost?: number;        // custo do estadio no jogo (dolares do jogo), do mandante
  type?: 'LEAGUE' | 'FRIENDLY' | 'CUP';
  processedInStandings?: boolean;
  homeLineup?: string[];
  awayLineup?: string[];
  matchDeck?: string[];
  redCardedHome?: string[];
  redCardedAway?: string[];
  yellowCardedHome?: string[];
  yellowCardedAway?: string[];
  momentum?: number;         // -100 (away dominando) a +100 (home dominando)
  momentumHistory?: number[]; // timeline para visualização
  playerRatings?: Record<string, number>; // playerId -> match rating (0.0 to 10.0)
  
  // FM2D-style simulation statistics
  homeShots?: number;
  awayShots?: number;
  homeShotsOnTarget?: number;
  awayShotsOnTarget?: number;
  homeXG?: number;
  awayXG?: number;
  homeCorners?: number;
  awayCorners?: number;
  homeFouls?: number;
  awayFouls?: number;
  homeDangerousAttacks?: number;
  awayDangerousAttacks?: number;
  homeBoxEntries?: number;
  awayBoxEntries?: number;
  homeAccuratePasses?: number;
  awayAccuratePasses?: number;
  homeTotalPasses?: number;
  awayTotalPasses?: number;
  homeRecoveries?: number;
  awayRecoveries?: number;
  homeSuccessfulPressures?: number;
  awaySuccessfulPressures?: number;
  homeAvgFatigue?: number;
  awayAvgFatigue?: number;
  homeHeatmap?: { defense: number; midfield: number; attack: number };
  awayHeatmap?: { defense: number; midfield: number; attack: number };
}

export type ActivityType = 'FRIENDLY' | 'TRAINING_CAMP' | 'TEAM_PARTY' | 'REMOVE';

export interface CalendarActivity {
  id: string;
  date: string;
  type: ActivityType;
  label: string;
}

export type ThemeMode = 'LIGHT' | 'DARK' | 'AUTO';
export type Language = 'EN' | 'PT';
export type Currency = 'USD' | 'EUR' | 'BRL';
export type WageFrequency = 'WEEKLY' | 'MONTHLY';
export type MatchDuration = 10 | 15 | 20; 
export type MatchMode = 'NONE' | 'SIMULATION' | 'VISUAL';

export interface MatchVisualState {
  playerPositions: Record<string, { x: number, y: number }>;
  possession: 'home' | 'away';
  carrierIdx: number;
  ballGrid: { x: number, y: number };
  kickoffOwner: 'home' | 'away';
  visualStatus: 'PRE_MATCH' | 'KICKOFF_SET' | 'KICKOFF_PASS' | 'PLAYING' | 'GOAL' | 'RESET' | 'OFFSIDE';
  homePossessionCount?: number;
  awayPossessionCount?: number;
  kitHomeIdx?: number;
  kitAwayIdx?: number;
  ballZone?: number;
}

export interface GameState {
  currentWeek: number;
  totalWeeks: number;
  currentDate: string; 
  userTeamId: string | null;
  managerName: string;
  isProcessing: boolean;
  matchMinute: number;
  matchDuration: MatchDuration;
  matchMode: MatchMode;
  simulationSpeed?: 1 | 2 | 3;
  graphicsQuality?: 'HIGH' | 'MEDIUM' | 'LOW';   // Game Settings > Graphics; sem valor vale LOW
  view: 'DASHBOARD' | 'SQUAD' | 'LEAGUE' | 'MATCH' | 'FINANCES' | 'STATISTICS' | 'TACTICS' | 'FIXTURES' | 'TRAINING' | 'TRAINING_VIEW' | 'SETTINGS' | 'WORLD' | 'INBOX' | 'TRANSFERS';
  activities: CalendarActivity[];
  themeMode: ThemeMode;
  language: Language;
  currency: Currency;
  wageFrequency: WageFrequency;
  trainingSchedule: (string | null)[][]; // Legacy/Group 1
  trainingSchedules?: (string | null)[][][]; // Array of schedules for up to 3 groups
  unlockedTrainingGroups?: number; // default 1
  matchVisual?: MatchVisualState;
}

export const FORMATIONS: Record<Tactics['formation'], { id: number, x: number, y: number, label: string }[]> = {
  '4-4-2': [
    { id: 0, x: 50, y: 88, label: 'GK' },
    { id: 1, x: 15, y: 72, label: 'LB' }, { id: 2, x: 38, y: 75, label: 'CB' }, { id: 3, x: 62, y: 75, label: 'CB' }, { id: 4, x: 85, y: 72, label: 'RB' },
    { id: 5, x: 15, y: 45, label: 'LM' }, { id: 6, x: 38, y: 50, label: 'CM' }, { id: 7, x: 62, y: 50, label: 'CM' }, { id: 8, x: 85, y: 45, label: 'RM' },
    { id: 9, x: 35, y: 18, label: 'ST' }, { id: 10, x: 65, y: 18, label: 'ST' },
  ],
  '4-3-3': [
    { id: 0, x: 50, y: 88, label: 'GK' },
    { id: 1, x: 15, y: 72, label: 'LB' }, { id: 2, x: 38, y: 75, label: 'CB' }, { id: 3, x: 62, y: 75, label: 'CB' }, { id: 4, x: 85, y: 72, label: 'RB' },
    { id: 5, x: 50, y: 53, label: 'DM' }, { id: 6, x: 32, y: 48, label: 'CM' }, { id: 7, x: 68, y: 48, label: 'CM' },
    { id: 8, x: 20, y: 22, label: 'LW' }, { id: 9, x: 50, y: 15, label: 'ST' }, { id: 10, x: 80, y: 22, label: 'RW' },
  ],
  '4-3-3 ATA': [
    { id: 0, x: 50, y: 88, label: 'GK' },
    { id: 1, x: 15, y: 72, label: 'LB' }, { id: 2, x: 38, y: 75, label: 'CB' }, { id: 3, x: 62, y: 75, label: 'CB' }, { id: 4, x: 85, y: 72, label: 'RB' },
    { id: 5, x: 35, y: 55, label: 'CM' }, { id: 6, x: 65, y: 55, label: 'CM' }, { id: 7, x: 50, y: 38, label: 'AM' },
    { id: 8, x: 20, y: 22, label: 'LW' }, { id: 9, x: 50, y: 15, label: 'ST' }, { id: 10, x: 80, y: 22, label: 'RW' },
  ],
  '3-5-2': [
    { id: 0, x: 50, y: 88, label: 'GK' },
    { id: 1, x: 25, y: 75, label: 'CB' }, { id: 2, x: 50, y: 78, label: 'CB' }, { id: 3, x: 75, y: 75, label: 'CB' },
    { id: 4, x: 10, y: 45, label: 'LM' }, { id: 5, x: 30, y: 47, label: 'DM' }, { id: 6, x: 50, y: 55, label: 'CM' }, { id: 7, x: 70, y: 47, label: 'DM' }, { id: 8, x: 90, y: 45, label: 'RM' },
    { id: 9, x: 40, y: 18, label: 'SS' }, { id: 10, x: 60, y: 18, label: 'ST' },
  ],
  '5-4-1': [
    { id: 0, x: 50, y: 88, label: 'GK' },
    { id: 1, x: 15, y: 72, label: 'LB' }, { id: 2, x: 32, y: 75, label: 'CB' }, { id: 3, x: 50, y: 78, label: 'CB' }, { id: 4, x: 68, y: 75, label: 'CB' }, { id: 5, x: 85, y: 72, label: 'RB' },
    { id: 6, x: 20, y: 48, label: 'LM' }, { id: 7, x: 40, y: 52, label: 'CM' }, { id: 8, x: 60, y: 52, label: 'CM' }, { id: 9, x: 80, y: 48, label: 'RM' },
    { id: 10, x: 50, y: 18, label: 'ST' },
  ],
  '4-2-3-1': [
    { id: 0, x: 50, y: 88, label: 'GK' },
    { id: 1, x: 15, y: 72, label: 'LB' }, { id: 2, x: 38, y: 75, label: 'CB' }, { id: 3, x: 62, y: 75, label: 'CB' }, { id: 4, x: 85, y: 72, label: 'RB' },
    { id: 5, x: 35, y: 55, label: 'DM' }, { id: 6, x: 65, y: 55, label: 'DM' },
    { id: 7, x: 20, y: 35, label: 'LW' }, { id: 8, x: 50, y: 38, label: 'AM' }, { id: 9, x: 80, y: 35, label: 'RW' },
    { id: 10, x: 50, y: 15, label: 'ST' },
  ],
  '5-3-2': [
    { id: 0, x: 50, y: 88, label: 'GK' },
    { id: 1, x: 15, y: 72, label: 'LB' }, { id: 2, x: 32, y: 75, label: 'CB' }, { id: 3, x: 50, y: 78, label: 'CB' }, { id: 4, x: 68, y: 75, label: 'CB' }, { id: 5, x: 85, y: 72, label: 'RB' },
    { id: 6, x: 30, y: 52, label: 'CM' }, { id: 7, x: 50, y: 50, label: 'DM' }, { id: 8, x: 70, y: 52, label: 'CM' },
    { id: 9, x: 40, y: 18, label: 'SS' }, { id: 10, x: 60, y: 18, label: 'ST' },
  ],
};

export const POSITION_ORDER: Record<Position, number> = {
  [Position.GK]: 1,
  [Position.LB]: 2, [Position.CB]: 3, [Position.RB]: 4,
  [Position.DM]: 5, [Position.LM]: 6, [Position.CM]: 7, [Position.RM]: 8, [Position.AM]: 9,
  [Position.LW]: 10, [Position.RW]: 11, [Position.SS]: 12, [Position.ST]: 13
};
/** O clube `t` joga na liga (e no grupo) do clube do utilizador? Os adversarios de copa tambem estao em `teams`: as vistas de liga filtram com isto. */
export const naLigaDoUtilizador = (t: Team, user?: Team): boolean => !user || (t.leagueId === user.leagueId && (t.groupId || '') === (user.groupId || ''));
