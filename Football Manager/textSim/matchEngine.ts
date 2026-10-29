import { Team, Player, Fixture, MatchEvent, Position, Tactics, Language, FORMATIONS, getEffectiveSkill } from '../types';
import { decideTeamIntent, applyIntentToTactics, TeamIntent } from './teamAI';
import { getRandomInjuryBySeverity } from './injuries';

export interface TeamRatings {
  defense: { left: number; center: number; right: number };
  midfield: { left: number; center: number; right: number };
  attack: { left: number; center: number; right: number };
  goalkeeping: number;
  aggression: number;
  tempo: number;
  pressure: number;
  synergy: number;
}

const NARRATION = {
  EN: {
    midfield_dom: [
      "controls the ball in midfield.",
      "dictates the tempo in the center.",
      "keeps possession in the midfield.",
      "distributes the play centrally.",
      "orchestrates the play from the middle."
    ],
    midfield_chaos: "Intense battle for the ball in the central zone.",
    vertical_pass: "tries a vertical pass.",
    vertical_pass_left: "pushes forward down the left flank.",
    vertical_pass_right: "pushes forward down the right flank.",
    vertical_pass_center: "threads a vertical pass through the center.",
    tackle_success: "cuts the play!",
    advance_free: "advances with total freedom!",
    advance_left: "advances freely down the left!",
    advance_right: "advances freely down the right!",
    advance_center: "advances freely through the center!",
    goal_perfect: "GOAL! Perfect finish by",
    miss_close: "UHHH! Shot by @PLAYER passes inches away!",
    corner_save: "Defense stretches out to send it for a corner.",
    red_card: "🟥 SENT OFF! Brutal tackle by",
    red_card_second_yellow: "🟥 SENT OFF! Second yellow card for",
    yellow_card: "🟨 Yellow Card shown to",
    foul_called: "Foul called against",
    offside_called: "caught in an illegal position.",
    corner_awarded: "conquers a corner!",
    penalty_awarded: "PENALTY! Foul inside the box!",
    counter_attack: "COUNTER-ATTACK! Fast break!",
    lateral_out: "ball out for a throw-in.",
    injury_happened: "is down! Medical team on the pitch.",
    sub: "Substitution:",
    realTime: "Real-time simulation...",
    momentum_surge: "The team is gaining momentum!",
    momentum_collapse: "The pressure is mounting!",
    half_time: "Half Time!",
    full_time: "Full Time!",
    tactics_change: "Tactical change:",
    corner_goal: "GOAL FROM THE CORNER! Header by",
    penalty_scored: "Converts from the spot:",
    penalty_saved: "SAVED! The keeper stops the penalty!",
    penalty_missed: "MISSED! The penalty goes wide!",
    sub_made: "comes on for",
    sub_injury: "forced change due to injury:",
    intent: { BALANCED: "back to the game plan", ATTACK: "all-out attack", COUNTER: "counter-attack", POSSESS: "keep possession", RETREAT: "sit back", PRESS: "high press" } as Record<string, string>
  },
  PT: {
    midfield_dom: [
      "domina a bola no meio.",
      "dita o ritmo de jogo no centro.",
      "mantém a posse no meio-campo.",
      "distribui o jogo na região central.",
      "cadencia o jogo no setor de meio-campo."
    ],
    midfield_chaos: "Muitas disputas de bola na zona central.",
    vertical_pass: "tenta verticalizar o jogo.",
    vertical_pass_left: "avança pela esquerda.",
    vertical_pass_right: "avança pela direita.",
    vertical_pass_center: "verticaliza pelo centro.",
    tackle_success: "corta o lance!",
    advance_free: "avança com liberdade total!",
    advance_left: "avança livremente pela esquerda!",
    advance_right: "avança livremente pela direita!",
    advance_center: "avança livremente pelo centro!",
    goal_perfect: "GOLAÇO! Finalização perfeita de",
    miss_close: "UHHH! Chute de @PLAYER passa tirando tinta!",
    corner_save: "Defesa se estica toda para mandar para escanteio.",
    red_card: "🟥 EXPULSO! Entrada criminosa de",
    red_card_second_yellow: "🟥 EXPULSO! Segundo cartão amarelo para",
    yellow_card: "🟨 Cartão Amarelo mostrado para",
    foul_called: "Falta de jogo marcada contra o",
    offside_called: "estava adiantado e a bandeira subiu.",
    corner_awarded: "conquista o escanteio!",
    penalty_awarded: "PÊNALTI! Foi derrubado na área!",
    counter_attack: "CONTRA-ATAQUE! O time sai em velocidade!",
    lateral_out: "bola saiu pela linha lateral.",
    injury_happened: "está caído! A maca entrou em campo.",
    sub: "Substituição:",
    realTime: "Simulação em tempo real...",
    momentum_surge: "O time está empolgado!",
    momentum_collapse: "A pressão está aumentando!",
    half_time: "Intervalo!",
    full_time: "Fim de Jogo!",
    tactics_change: "Mudança tática:",
    corner_goal: "GOL DE ESCANTEIO! Cabeçada de",
    penalty_scored: "Cobra e converte:",
    penalty_saved: "DEFENDEU! O goleiro pega o pênalti!",
    penalty_missed: "PERDEU! O pênalti foi para fora!",
    sub_made: "entra no lugar de",
    sub_injury: "mudança forçada por lesão:",
    intent: { BALANCED: "volta ao plano de jogo", ATTACK: "todos ao ataque", COUNTER: "contra-ataque", POSSESS: "segurar a posse", RETREAT: "recuar as linhas", PRESS: "pressão alta" } as Record<string, string>
  }
};

// =====================================================================
// CONSTANTES DE CALIBRAÇÃO
// Todos os números que definem o "sabor" estatístico da simulação ficam aqui.
// Alterou algum? Rode `npx tsx tools/simCheck.ts` para conferir o impacto.
// =====================================================================
export const SIM_CONFIG = {
  /** Multiplicador global da chance de gol. Sobe/desce a média de gols do jogo. */
  goalChanceScale: 60,
  /**
   * Expoente aplicado à razão ataque/defesa. É o que faz a qualidade do elenco
   * importar: com 1.0 uma vantagem de 15% vira 15% mais gols; com 2.6 vira ~45%.
   * A base de dados real do Brasileirão é achatada (65–73 de OVR), então sem
   * amplificação o melhor time empata com o pior.
   */
  strengthExponent: 2.8,
  /** Pisos da razão ataque/defesa. Menores = mais sensível à diferença de força. */
  attackFloor: 5,
  defenseFloor: 10,
  /** Peso do goleiro na defesa. */
  gkWeight: 0.45,
  /** Vantagem do mandante na finalização (1.0 = nenhuma). */
  homeAttackBonus: 1,
  /** Bônus de posse do mandante somado ao meio-campo na geração do baralho. */
  homePossessionBonus: 28,
  /** Divisor do momentum na chance de gol: maior = menos impacto. */
  momentumDampening: 900,
  /** Conversão de pênaltis (%). */
  penaltyConversion: 76,
  /** xG atribuído a um pênalti. */
  penaltyXG: 0.76,
  /** Chance (0–1) de um escanteio virar gol. */
  cornerGoalChance: 0.030,
  /** Chance (%) de uma falta gerar cartão amarelo, por agressividade. */
  yellowByAggression: {
    'Very Aggressive': 22.49, 'Aggressive': 17.29, 'Balanced': 13, 'Passive': 8.71, 'Very Passive': 5.2,
  } as Record<string, number>,
  /**
   * Probabilidade de um jogador já amarelado evitar a falta seguinte. Sem isso,
   * quase todos os vermelhos vinham de segundo amarelo (0.64/jogo, o triplo do real).
   */
  bookedPlayerCaution: 0.75,
  /**
   * O motor pode substituir jogadores do time do usuário por conta própria?
   * Falso de propósito: a escalação do treinador humano é decisão dele. Fica
   * como opção para quando existir um modo "delegar ao auxiliar técnico".
   */
  autoSubUserTeam: false,
  /**
   * Linha defensiva. Alta adianta o time (ganha meio-campo) mas deixa espaço
   * às costas. Antes a linha alta reforçava meio E defesa ao mesmo tempo, sem
   * custo nenhum: linha=100 era simplesmente a melhor escolha sempre.
   */
  /**
   * Quanto as chances de gol se concentram no fim do jogo. O baralho distribuía
   * os lances por igual, mas no futebol real os times se abrem, cansam e quem
   * está perdendo se lança — ~40% dos gols saem depois dos 60 minutos.
   */
  /** Queda base de preparo por minuto (mantém a economia da temporada). */
  baseFatiguePerMinute: 0.4995,
  /** Teto do multiplicador tático sobre o desgaste. */
  maxFatigueMultiplier: 1.45,
  lateGameAttackBias: 0.16,
  densityExpDef: 0.40,
  densityExpMid: 0.18,
  densityExpAtk: 0.14,
  defLineMidfieldGain: 190,   // divisor: menor = linha alta ajuda mais o meio
  defLineExposure: 900,        // divisor: menor = linha alta expõe mais a defesa
  defLineCounterExposure: 900, // idem, aplicado na hora da finalização
  /** Ganho de recuperação de bola por pressão: vira contra-ataque. */
  pressureCounterGain: 0.9,
  /** Agressividade reforça o combate defensivo (contrapartida dos cartões). */
  aggressionDefBonus: {
    'Very Aggressive': 1.10, 'Aggressive': 1.05, 'Balanced': 1.0, 'Passive': 0.96, 'Very Passive': 0.92,
  } as Record<string, number>,
  /** Chance (%) de uma falta gerar cartão vermelho direto. */
  redByAggression: {
    'Very Aggressive': 0.208, 'Aggressive': 0.128, 'Balanced': 0.08, 'Passive': 0.048, 'Very Passive': 0.032,
  } as Record<string, number>,
  /** Chance (%) de uma falta na área virar pênalti. */
  penaltyByAggression: {
    'Very Aggressive': 2.0, 'Aggressive': 1.5, 'Balanced': 1.1, 'Passive': 0.7, 'Very Passive': 0.5,
  } as Record<string, number>,
};

// Aliases de leitura, para o corpo do motor ficar legível
const PENALTY_CONVERSION = () => SIM_CONFIG.penaltyConversion;
const PENALTY_XG = () => SIM_CONFIG.penaltyXG;
const CORNER_GOAL_CHANCE = () => SIM_CONFIG.cornerGoalChance;
const YELLOW_BY_AGGRESSION = () => SIM_CONFIG.yellowByAggression;
const RED_BY_AGGRESSION = () => SIM_CONFIG.redByAggression;
const PENALTY_BY_AGGRESSION = () => SIM_CONFIG.penaltyByAggression;

// =====================================================================
// TEMPO DE JOGO — fonte única da regra de acréscimos
// A mesma expressão estava duplicada em 12 pontos entre motor, GameContext e
// componentes; qualquer ajuste na regra saía do lugar em algum deles.
// =====================================================================
/** Lances que geram acréscimo. */
const STOPPAGE_EVENTS = ['GOAL', 'INJURY', 'CARD'];

/** Minutos de acréscimo gerados até `upToMinute`. */
export const getStoppageTime = (events: MatchEvent[], upToMinute: number): number =>
  (events || []).filter(e => e.minute <= upToMinute && STOPPAGE_EVENTS.includes(e.type)).length;

/** Minuto em que o primeiro tempo acaba (45 + acréscimos). */
export const getHalfTimeMinute = (events: MatchEvent[]): number => 45 + getStoppageTime(events, 45);

/** Minuto em que a partida acaba (90 + acréscimos). */
export const getMatchEndMinute = (events: MatchEvent[]): number => 90 + getStoppageTime(events, 90);

export type Lane = 'Left' | 'Center' | 'Right';
export const ALL_LANES: Lane[] = ['Left', 'Center', 'Right'];

// =====================================================================
// DESGASTE FÍSICO — fonte única
// A fórmula estava duplicada em três lugares com três comportamentos: o
// GameContext tinha duas versões (que ignoravam o tempo tático e não tratavam
// os estilos "Very") e o motor tinha a terceira. Assistir à partida e simular
// davam desgastes diferentes para o mesmo jogo.
// =====================================================================
/** Queda de preparo físico por minuto jogado. */
export const matchFatiguePerMinute = (tactics: Tactics | undefined, position: Position | string): number => {
  const style = tactics?.style;
  const styleMod = style === 'Offensive' ? 1.15 : style === 'Very Offensive' ? 1.30
    : style === 'Defensive' ? 0.88 : style === 'Very Defensive' ? 0.80 : 1.0;
  const pressureMod = 0.75 + ((tactics?.pressure ?? 50) / 100) * 0.5;
  const tempoMod = 0.85 + ((tactics?.tempo ?? 50) / 100) * 0.3;

  // Teto no multiplicador combinado: sem ele, ofensivo com pressão e tempo no
  // máximo drenava mais que o dobro do normal e o time terminava andando.
  const combined = Math.min(SIM_CONFIG.maxFatigueMultiplier, styleMod * pressureMod * tempoMod);

  const pos = String(position);
  const posMod = pos === 'GK' ? 0.15 : (['CB', 'LB', 'RB'].includes(pos) ? 0.85 : 1.0);

  return SIM_CONFIG.baseFatiguePerMinute * combined * posMod;
};

/** Faixa vertical do campo a que um slot da formação pertence. */
export type Band = 'GK' | 'DEF' | 'MID' | 'ATK';

/** Faixa lateral a partir da coordenada x do slot na formação (0–100). */
export const laneFromX = (x: number): Lane => (x < 34 ? 'Left' : x > 66 ? 'Right' : 'Center');

/** Faixa vertical a partir do rótulo do slot ('LB', 'CM', 'ST'…). */
export const bandOfLabel = (label: string): Band => {
  if (label === 'GK') return 'GK';
  if (['LB', 'CB', 'RB'].includes(label)) return 'DEF';
  if (['DM', 'LM', 'CM', 'RM', 'AM'].includes(label)) return 'MID';
  return 'ATK';
};

/** Faixa lateral natural de uma posição, usada quando não há slot definido. */
export const laneOfPosition = (pos: Position): Lane => {
  if ([Position.LB, Position.LM, Position.LW].includes(pos)) return 'Left';
  if ([Position.RB, Position.RM, Position.RW].includes(pos)) return 'Right';
  return 'Center';
};

/**
 * Setores de foco válidos: no mínimo 1, no máximo 2 — é exatamente o que a aba
 * Tactics permite escolher. Marcar os três não é um estado alcançável no jogo,
 * então o motor também não aceita, mesmo vindo de um save antigo.
 */
export const MAX_FOCUS_SECTORS = 2;
export const normalizeSectors = (sectors?: Lane[] | null): Lane[] => {
  const valid = (sectors || []).filter(s => ALL_LANES.includes(s));
  const unique = Array.from(new Set(valid));
  if (unique.length === 0) return ['Center'];
  return unique.slice(0, MAX_FOCUS_SECTORS);
};

/**
 * Modificador de força por setor. Soma-zero: concentrar o jogo em poucos
 * setores dá bônus grande neles e penalidade nos abandonados; espalhar em
 * todos é neutro. Total dos três = 3.0 em qualquer configuração.
 */
export const getSectorModifier = (sectors: Lane[], lane: Lane): number => {
  const k = Math.min(sectors.length, MAX_FOCUS_SECTORS);
  if (k >= 3) return 1.0; // inalcançável pela tela; fica como guarda
  const PENALTY = 0.90;                                  // setor sem foco
  const bonus = (3 - (3 - k) * PENALTY) / k;             // redistribui o restante
  return sectors.includes(lane) ? bonus : PENALTY;
};

// =====================================================================
// TEAM RATINGS — Calcula força por setor com todos os multiplicadores
// =====================================================================
export const getTeamRatings = (
  team: Team,
  allPlayers: Player[],
  isHome: boolean,
  redCarded: Set<string>,
  lineupOverride?: string[],
  fitnessOverride?: Map<string, number>
): TeamRatings => {
  // A escalação da partida (fixture.homeLineup) tem precedência sobre a do time,
  // senão trocas e substituições não afetariam a força calculada.
  const activeLineup = lineupOverride && lineupOverride.length > 0 ? lineupOverride : team.lineup;
  const fitnessOf = (p: Player) => fitnessOverride?.get(p.id) ?? p.fitness;

  const lineupPlayers = activeLineup
    .map(id => allPlayers.find(p => p.id === id))
    .filter((p): p is Player => !!p && !redCarded.has(p.id));
  
  // --- SINERGIA ---
  let synergyScore = 0;
  if (lineupPlayers.length > 1) {
    let totalSyn = 0; let counts = 0;
    for (let i = 0; i < lineupPlayers.length; i++) {
        for (let j = i + 1; j < lineupPlayers.length; j++) {
            const p1 = lineupPlayers[i].id; const p2 = lineupPlayers[j].id;
            const key = p1 < p2 ? `${p1}-${p2}` : `${p2}-${p1}`;
            totalSyn += (team.synergyMap?.[key] || 0); counts++;
        }
    }
    synergyScore = Math.min(95, Math.max(45, (totalSyn / (counts || 1)) / 25));
  } else { synergyScore = 45; }

  const synFactor = 0.3 + (synergyScore / 100) * 1.0;

  // -------------------------------------------------------------------
  // ESCALAÇÃO POR SLOT DA FORMAÇÃO
  // Antes os jogadores eram agrupados pela posição NATURAL, então a formação
  // não tinha efeito nenhum: 5-3-2 e 4-3-3 com os mesmos 11 davam ratings
  // idênticos. Agora vale o slot que o jogador ocupa em campo — quantos
  // defensores a formação põe, em que faixa, e o quanto ele está fora da sua
  // posição de origem (mesma penalidade que a tela já mostrava).
  // -------------------------------------------------------------------
  const slots = FORMATIONS[team.tactics.formation] || FORMATIONS['4-4-2'];

  type Occupant = { player: Player; label: string; lane: Lane; band: Band; fit: number };
  const occupants: Occupant[] = [];
  activeLineup.forEach((id, idx) => {
    const player = allPlayers.find(p => p.id === id);
    if (!player || redCarded.has(player.id)) return;
    // Sem slot definido (escalação maior que a formação), cai na posição natural
    const slot = slots[idx];
    const label = slot ? slot.label : String(player.position);
    const lane: Lane = slot ? laneFromX(slot.x) : laneOfPosition(player.position);
    const fit = player.skill > 0 ? getEffectiveSkill(player, label) / player.skill : 1;
    occupants.push({ player, label, lane, band: bandOfLabel(label), fit: Math.max(0.35, Math.min(1, fit)) });
  });

  /**
   * Força de um setor. Combina qualidade (média ponderada) e densidade (quantos
   * corpos a formação coloca ali) — é a densidade que diferencia um 5-3-2 de um
   * 4-3-3. Jogadores de faixas vizinhas ajudam parcialmente.
   */
  // Densidade típica por faixa. Usar o mesmo valor para todas punia demais
  // formações com um atacante só (5-4-1 marcava metade dos gols dos demais).
  const REFERENCE_DENSITY: Record<Band, number> = { GK: 1.0, DEF: 2.2, MID: 2.2, ATK: 1.5 };
  // Retorno decrescente por faixa: empilhar zagueiro rende mais que empilhar
  // atacante (o ataque satura rápido), e o expoente precisa ser suave porque
  // strengthExponent já amplifica muito qualquer diferença de rating.
  const DENSITY_EXPONENT: Record<Band, number> = { GK: 0, DEF: SIM_CONFIG.densityExpDef, MID: SIM_CONFIG.densityExpMid, ATK: SIM_CONFIG.densityExpAtk };
  const getRating = (band: Band, lane: Lane, attr: keyof Player) => {
    const inBand = occupants.filter(o => o.band === band);
    if (inBand.length === 0) return 30;

    const laneIdx = (l: Lane) => (l === 'Left' ? 0 : l === 'Center' ? 1 : 2);
    let weighted = 0, totalWeight = 0;
    for (const o of inBand) {
      const dist = Math.abs(laneIdx(o.lane) - laneIdx(lane));
      const w = dist === 0 ? 1.0 : dist === 1 ? 0.5 : 0.15;
      const val = (Number(o.player[attr]) || 0) * o.fit;
      const fitnessFactor = 0.3 + (fitnessOf(o.player) / 100) * 0.7;
      weighted += w * val * fitnessFactor;
      totalWeight += w;
    }
    if (totalWeight === 0) return 30;

    const quality = weighted / totalWeight;
    // Densidade com retorno decrescente: amontoar gente não escala linearmente.
    const density = Math.pow(totalWeight / REFERENCE_DENSITY[band], DENSITY_EXPONENT[band]);
    return quality * density * synFactor;
  };

  const { style, pressure, defensiveLine, tempo, focusSectors } = team.tactics;
  let defBase = 1.0; let attBase = 1.0; let midBase = 0.8 + (pressure / 100) * 0.4;
  if (isHome) { defBase *= 1.05; attBase *= 1.05; midBase *= 1.05; }

  // Estilo de Jogo: U-DEF / DEF / BAL / OFF / U-OFF
  if (style === 'Offensive') { attBase *= 1.20; defBase *= 0.90; }
  else if (style === 'Very Offensive') { attBase *= 1.35; defBase *= 0.75; }
  else if (style === 'Defensive') { attBase *= 0.80; defBase *= 1.15; }
  else if (style === 'Very Defensive') { attBase *= 0.65; defBase *= 1.35; }

  // Linha defensiva (contínua, com troca real): adiantar a linha ganha o
  // meio-campo e custa compactação atrás. Recuar faz o inverso.
  midBase *= 1 + (defensiveLine - 50) / SIM_CONFIG.defLineMidfieldGain;
  defBase *= 1 - (defensiveLine - 50) / SIM_CONFIG.defLineExposure;

  // Agressividade: dividir mais dividas dá vantagem no combate — é a
  // contrapartida dos cartões, que antes eram o único efeito do slider.
  defBase *= SIM_CONFIG.aggressionDefBonus[team.tactics.aggression] ?? 1.0;

  // Setor de Jogo: concentrar o jogo reforça os setores escolhidos e enfraquece
  // os demais. A soma dos três modificadores é sempre 3.0, então marcar todos os
  // setores é neutro — não existe escolha "grátis" que domine as outras.
  const sectors = normalizeSectors(focusSectors);
  const getSectorMod = (s: 'Left' | 'Center' | 'Right') => getSectorModifier(sectors, s);

  return {
    defense: {
      left: getRating('DEF', 'Left', 'def') * defBase * getSectorMod('Left'),
      center: getRating('DEF', 'Center', 'def') * defBase * getSectorMod('Center'),
      right: getRating('DEF', 'Right', 'def') * defBase * getSectorMod('Right'),
    },
    midfield: {
      left: getRating('MID', 'Left', 'pas') * midBase * getSectorMod('Left'),
      center: getRating('MID', 'Center', 'pas') * midBase * getSectorMod('Center'),
      right: getRating('MID', 'Right', 'pas') * midBase * getSectorMod('Right'),
    },
    attack: {
      left: getRating('ATK', 'Left', 'sht') * attBase * getSectorMod('Left'),
      center: getRating('ATK', 'Center', 'sht') * attBase * getSectorMod('Center'),
      right: getRating('ATK', 'Right', 'sht') * attBase * getSectorMod('Right'),
    },
    goalkeeping: getRating('GK', 'Center', 'skill'),
    aggression: (team.tactics.aggression === 'Very Aggressive' ? 90 : (team.tactics.aggression === 'Aggressive' ? 70 : (team.tactics.aggression === 'Passive' ? 30 : (team.tactics.aggression === 'Very Passive' ? 15 : 50)))),
    tempo: tempo || 50,
    pressure: pressure ?? 50,
    synergy: synergyScore
  };
};

// =====================================================================
// LANE RATING — Busca ataque/defesa por faixa específica
// =====================================================================
const getLaneRating = (ratings: TeamRatings, lane: Lane, type: 'attack' | 'defense' | 'midfield'): number => {
  if (lane === 'Left') return ratings[type].left;
  if (lane === 'Right') return ratings[type].right;
  return ratings[type].center;
};

// =====================================================================
// ATTACK LANE SELECTION — Escolhe a faixa do ataque
// Distribui a probabilidade por peso: setores com foco pesam 3x os demais.
// Funciona para 1, 2 ou 3 setores e nunca devolve undefined.
// =====================================================================
export const selectAttackLane = (sectors?: Lane[] | null): Lane => {
  const focus = normalizeSectors(sectors);
  const FOCUS_WEIGHT = 3, OTHER_WEIGHT = 1;
  const weights = ALL_LANES.map(l => (focus.includes(l) ? FOCUS_WEIGHT : OTHER_WEIGHT));
  const total = weights.reduce((a, b) => a + b, 0);

  let roll = Math.random() * total;
  for (let i = 0; i < ALL_LANES.length; i++) {
    roll -= weights[i];
    if (roll < 0) return ALL_LANES[i];
  }
  return ALL_LANES[ALL_LANES.length - 1];
};

/** Faixa defensiva que se opõe à faixa de ataque (espelhada). */
const mirrorLane = (lane: Lane): Lane => (lane === 'Left' ? 'Right' : lane === 'Right' ? 'Left' : 'Center');

/**
 * Posições do baralho. 90 minutos regulamentares + margem para os acréscimos,
 * para que cada minuto jogado tenha o seu próprio lance.
 */
export const DECK_SLOTS = 100;

// =====================================================================
// DECK GENERATION — Sem gols pré-definidos (Fase 4)
// O deck agora é puro gerador de oportunidades.
// Posse controlada pelo meio-campo (Fase 3).
// =====================================================================
export const generateMatchDeck = (hR: TeamRatings, aR: TeamRatings, length: number = DECK_SLOTS, isDerby: boolean = false): string[] => {
    const deck: string[] = [];
    const timeFactor = length / DECK_SLOTS;

    // === FASE 3: Meio-campo controla posse (Suavizado) ===
    // O mando de campo NÃO entra aqui: getTeamRatings já multiplica o meio-campo
    // do mandante por 1.05. O bônus fixo de +50 que existia aqui aplicava a
    // vantagem duas vezes e levava a posse do mandante a ~58%.
    const hMid = hR.midfield.left + hR.midfield.center + hR.midfield.right + SIM_CONFIG.homePossessionBonus;
    const aMid = aR.midfield.left + aR.midfield.center + aR.midfield.right;
    const homeShareRaw = (hMid + 50) / (hMid + aMid + 100);
    
    // Limita a dominância baseada na diferença de força (Forte vs Fraco max 85%, Forte vs Médio max 70%)
    const diff = Math.abs(hMid - aMid);
    let maxShare = 0.60;
    if (diff > 150) maxShare = 0.85;
    else if (diff > 50) maxShare = 0.70;
    
    // === FASE 3: Tempo tático afeta volume de eventos ===
    const avgTempo = ((hR.tempo + aR.tempo) / 2) / 100; // 0.0 a 1.0
    let tempoModNeutral = 1.5 - avgTempo;    // Tempo alto = menos neutros
    let tempoModAction = 0.7 + avgTempo * 0.6; // Tempo alto = mais finalizações

    // === CLÁSSICOS: Jogo mais amarrado, menos dominância e menos chances ===
    if (isDerby) {
        maxShare = Math.min(maxShare, 0.55);
        tempoModAction *= 0.8;
        tempoModNeutral *= 1.2;
    }

    const homeShare = Math.max(1 - maxShare, Math.min(maxShare, homeShareRaw));

    // === FASE 3: Pressão afeta roubadas e faltas ===
    const totalAgg = (hR.aggression + aR.aggression) / 100;

    const counts = {
        NEUTRAL: Math.round(27.0 * timeFactor * tempoModNeutral),
        COUNTER: Math.round(2.8 * timeFactor),
        FINALIZACAO: Math.round(18.2 * timeFactor * tempoModAction),
        FOUL: Math.round(27.0 * timeFactor * (0.7 + totalAgg * 0.3)), // Aumentado para ~27 faltas/jogo
        CORNER: Math.round(6.5 * timeFactor),
        OFFSIDE: Math.round(2.6 * timeFactor), // Reduzido para focar em ~3/jogo
        YELLOW_DIRECT: Math.round(1.2 * timeFactor),
        RED_DIRECT: 0, // Direct reds handled dynamically
        INJURY: Math.round(0.9 * timeFactor),
        SUB: Math.round(11.0 * timeFactor),
        LATERAL: Math.round(3.6 * timeFactor),
    };

    // === FASE 4: SEM HOME:GOAL / AWAY:GOAL ===
    // Gols são resolvidos dinamicamente no Tick 3 de cada FINALIZACAO/COUNTER.
    // O deck só contém tipos de lance + quem ataca.

    // === FASE 3: Distribuir proporcionalmente à posse ===
    const fillProportional = (type: string, qty: number) => {
        const homeQty = Math.round(qty * homeShare);
        const awayQty = qty - homeQty;
        for (let i = 0; i < homeQty; i++) deck.push(`HOME:${type}`);
        for (let i = 0; i < awayQty; i++) deck.push(`AWAY:${type}`);
    };

    // Finalizações proporcionais à posse
    fillProportional('FINALIZACAO', counts.FINALIZACAO);

    // Contra-ataques: quem pressiona mais rouba mais bola em posição de sair em
    // velocidade. Sem isso a pressão só custava preparo físico e não dava nada.
    const hPress = 1 + ((hR.pressure - 50) / 100) * SIM_CONFIG.pressureCounterGain;
    const aPress = 1 + ((aR.pressure - 50) / 100) * SIM_CONFIG.pressureCounterGain;
    const pressShare = hPress / (hPress + aPress || 1);
    const homeCounters = Math.round(counts.COUNTER * pressShare);
    for (let i = 0; i < homeCounters; i++) deck.push('HOME:COUNTER');
    for (let i = 0; i < counts.COUNTER - homeCounters; i++) deck.push('AWAY:COUNTER');
    
    // Outros eventos distribuídos normalmente
    const fillRandom = (type: string, qty: number) => {
        for (let i = 0; i < qty; i++) {
            const side = Math.random() < homeShare ? 'HOME' : 'AWAY';
            deck.push(`${side}:${type}`);
        }
    };

    fillRandom('NOTHING', counts.NEUTRAL);
    fillRandom('FOUL', counts.FOUL);
    fillRandom('CORNER', counts.CORNER);
    fillRandom('OFFSIDE', counts.OFFSIDE);
    fillRandom('YELLOW', counts.YELLOW_DIRECT);
    fillRandom('RED', counts.RED_DIRECT);
    fillRandom('INJURY', counts.INJURY);
    fillRandom('SUB', counts.SUB);
    fillRandom('LATERAL', counts.LATERAL);

    // Completa até o tamanho pedido com lances neutros
    while (deck.length < length) {
        const side = Math.random() < homeShare ? 'HOME' : 'AWAY';
        deck.push(`${side}:NOTHING`);
    }

    // Embaralha primeiro de forma uniforme (Fisher-Yates)
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // Depois aplica o viés de fim de jogo APENAS dentro do tempo efetivamente
    // jogado. Enviesar o baralho inteiro empurrava os ataques para os slots de
    // acréscimo que a partida nunca alcança, e o volume de chutes despencava.
    const bias = SIM_CONFIG.lateGameAttackBias;
    const playable = Math.min(deck.length, 90);
    const head = deck.slice(0, playable)
        .map(entry => {
            const isAttack = entry.endsWith(':FINALIZACAO') || entry.endsWith(':COUNTER');
            return { entry, key: Math.random() + (isAttack ? bias : 0) };
        })
        .sort((a, b) => a.key - b.key)
        .map(x => x.entry);
    for (let i = 0; i < playable; i++) deck[i] = head[i];

    // O baralho precisa ter exatamente `length` posições: uma por minuto.
    // Antes a soma dos counts passava de 90 e o excedente ficava em índices que
    // o loop nunca lia, descartando lances de forma silenciosa.
    return deck.slice(0, length);
};

// =====================================================================
// PLAYER SELECTION — Jogadores por setor/posição
// =====================================================================
const getRandomPlayerObj = (allPlayers: Player[], lineupIds: string[], positions: Position[], excludeIds?: Set<string>): Player | null => {
  const validCandidates = lineupIds.map(id => allPlayers.find(p => p.id === id)).filter((p): p is Player => !!p && positions.includes(p.position) && (!excludeIds || !excludeIds.has(p.id)));
  if (validCandidates.length === 0) {
    const anyInLineup = lineupIds.map(id => allPlayers.find(p => p.id === id)).filter((p): p is Player => !!p && (!excludeIds || !excludeIds.has(p.id)));
    return anyInLineup[Math.floor(Math.random() * anyInLineup.length)] || null;
  }
  return validCandidates[Math.floor(Math.random() * validCandidates.length)];
};

const getAttackPositions = (lane: 'Left' | 'Center' | 'Right'): Position[] => {
  if (lane === 'Left') return [Position.LW, Position.LM, Position.ST];
  if (lane === 'Right') return [Position.RW, Position.RM, Position.ST];
  return [Position.ST, Position.SS, Position.AM];
};

const getDefensePositions = (lane: 'Left' | 'Center' | 'Right'): Position[] => {
  if (lane === 'Left') return [Position.LB, Position.CB, Position.DM];
  if (lane === 'Right') return [Position.RB, Position.CB, Position.DM];
  return [Position.CB, Position.DM, Position.RB, Position.LB];
};

const getMidfieldPositions = (lane: 'Left' | 'Center' | 'Right'): Position[] => {
  if (lane === 'Left') return [Position.LM, Position.CM, Position.LW, Position.AM];
  if (lane === 'Right') return [Position.RM, Position.CM, Position.RW, Position.AM];
  return [Position.CM, Position.DM, Position.AM];
};


const OUTFIELD: Position[] = [
  Position.LB, Position.CB, Position.RB, Position.DM, Position.CM, Position.LM,
  Position.RM, Position.AM, Position.LW, Position.RW, Position.SS, Position.ST,
];

/**
 * Sorteia quem cometeu a falta. Antes o sorteio saía de um grupo de 3 posições
 * (a defesa do setor), então o mesmo jogador levava amarelo várias vezes e o
 * segundo amarelo virava vermelho com frequência irreal. Agora o setor tem peso,
 * mas qualquer jogador de linha pode cometer a falta.
 */
const pickFouler = (
  allPlayers: Player[],
  lineupIds: string[],
  lane: Lane,
  excludeIds?: Set<string>,
  booked?: Set<string>
): Player | null => {
  const nearby = getDefensePositions(lane);
  const draw = () => {
    const pool = Math.random() < 0.55 ? nearby : OUTFIELD;
    return getRandomPlayerObj(allPlayers, lineupIds, pool, excludeIds);
  };
  const first = draw();
  // Quem já tem amarelo joga com cautela: sorteia outro na maioria das vezes.
  if (first && booked?.has(first.id) && Math.random() < SIM_CONFIG.bookedPlayerCaution) {
    return draw() || first;
  }
  return first;
};


/**
 * Sorteia o autor do gol ponderando pela finalização. O sorteio anterior era
 * uniforme dentro de 3 posições de ataque, e como o time não roda o elenco um
 * único centroavante terminava a temporada com 40+ gols (quase tudo do time).
 * Meio-campistas marcam ~30% dos gols no futebol real.
 */
const pickScorer = (allPlayers: Player[], lineupIds: string[], lane: Lane, excludeIds?: Set<string>): Player | null => {
  const pool = Math.random() < 0.68 ? getAttackPositions(lane) : getMidfieldPositions(lane);
  const candidates = lineupIds
    .map(id => allPlayers.find(p => p.id === id))
    .filter((p): p is Player => !!p && pool.includes(p.position) && (!excludeIds || !excludeIds.has(p.id)));
  if (candidates.length === 0) return getRandomPlayerObj(allPlayers, lineupIds, pool, excludeIds);

  // Ponderado pelo atributo de finalização
  const weights = candidates.map(p => Math.max(1, Number(p.sht) || 1));
  let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll < 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
};

// =====================================================================
// MOMENTUM HELPERS
// =====================================================================
const clampMomentum = (m: number): number => Math.max(-100, Math.min(100, m));

const getMomentumGainForGoal = (style: Tactics['style']): number => {
  if (style === 'Very Offensive' || style === 'Offensive') return 15;
  return 10;
};

const getMomentumLossForGoal = (style: Tactics['style']): number => {
  if (style === 'Very Defensive' || style === 'Defensive') return -5;
  return -10;
};

// =====================================================================
// SIMULATE MATCH — Motor principal refatorado
// =====================================================================
export const simulateMatch = (fixture: Fixture, allTeams: Team[], allPlayers: Player[], startMinute: number, userTeamId: string | null, lang: Language = 'EN', finalMinute?: number, tick?: number, globalHTDuration?: number) => {
  const homeTeam = allTeams.find(t => t.id === fixture.homeTeamId);
  const awayTeam = allTeams.find(t => t.id === fixture.awayTeamId);
  if (!homeTeam || !awayTeam) return fixture;

  const getTeamState = (name: string) => name.split('-').pop()?.trim() || '';
  const homeState = getTeamState(homeTeam.name);
  const awayState = getTeamState(awayTeam.name);
  const isDerby = homeState === awayState && homeState.length > 0;

  const t = NARRATION[lang];
  const targetEndMinute = finalMinute !== undefined ? finalMinute : 90;
  let events = [...(fixture.events || [])];
  // As fixtures nascem com homeScore/awayScore = null; `!== undefined` deixava o
  // placar em null e um 0x0 era devolvido como null-null. num() normaliza.
  const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
  let homeScore = num(fixture.homeScore);
  let awayScore = num(fixture.awayScore);
  let possessionTimeline = [...(fixture.possessionTimeline || [])];
  let ballZoneTimeline = [...(fixture.ballZoneTimeline || [])];
  const redCardedHome = new Set<string>(fixture.redCardedHome || []);
  const redCardedAway = new Set<string>(fixture.redCardedAway || []);
  const yellowCardedHome = new Set<string>(fixture.yellowCardedHome || []);
  const yellowCardedAway = new Set<string>(fixture.yellowCardedAway || []);

  // === FASE 1: MOMENTUM ===
  let momentum = fixture.momentum || 0;
  let momentumHistory = [...(fixture.momentumHistory || [])];

  // Deep clone das táticas para não alterar o banco de dados principal
  let homeTactics: Tactics = JSON.parse(JSON.stringify(homeTeam.tactics));
  let awayTactics: Tactics = JSON.parse(JSON.stringify(awayTeam.tactics));
  // A tactica de partida: a intencao BALANCED volta a ela, e as outras partem dela (nao da anterior), para as mudancas nao se acumularem.
  const homeBase: Tactics = JSON.parse(JSON.stringify(homeTeam.tactics));
  const awayBase: Tactics = JSON.parse(JSON.stringify(awayTeam.tactics));

  // Estados da IA
  let homeIntent: TeamIntent | null = null;
  let awayIntent: TeamIntent | null = null;

  // Escalações da partida — cópias locais e mutáveis (substituições alteram estas,
  // nunca o team.lineup global, que precisa sobreviver intacto ao fim do jogo).
  const myHomeLineup: string[] = [...(fixture.homeLineup || homeTeam.lineup)];
  const myAwayLineup: string[] = [...(fixture.awayLineup || awayTeam.lineup)];
  const homeBench: string[] = [...(homeTeam.bench || [])].filter(id => !myHomeLineup.includes(id));
  const awayBench: string[] = [...(awayTeam.bench || [])].filter(id => !myAwayLineup.includes(id));
  let subsUsedHome = num(fixture.subsUsedHome);
  let subsUsedAway = num(fixture.subsUsedAway);
  const MAX_SUBS = 5;

  // Fadiga interna da partida. Em modo ao vivo (tick definido) quem desgasta os
  // jogadores é o GameContext; em modo lote o motor precisa fazer isso sozinho,
  // senão os 90 minutos não cansam ninguém.
  const isLiveTick = tick !== undefined;
  const matchFitness = new Map<string, number>();
  [...myHomeLineup, ...myAwayLineup, ...homeBench, ...awayBench].forEach(id => {
    const p = allPlayers.find(pl => pl.id === id);
    if (p) matchFitness.set(id, p.fitness);
  });

  const rateHome = () => getTeamRatings({ ...homeTeam, tactics: homeTactics }, allPlayers, true, redCardedHome, myHomeLineup, matchFitness);
  const rateAway = () => getTeamRatings({ ...awayTeam, tactics: awayTactics }, allPlayers, false, redCardedAway, myAwayLineup, matchFitness);

  let home = rateHome();
  let away = rateAway();
  let matchDeck = (fixture.matchDeck && fixture.matchDeck.length > 0) ? fixture.matchDeck : generateMatchDeck(home, away, DECK_SLOTS, isDerby);

  let currentBallTier = 2; let isAtGoal: 'home' | 'away' | null = null;
  let currentBallLane = 2;

  // Track consecutive attacks for momentum
  let consecutiveAttacks = { home: 0, away: 0 };

  // Match stats counters
  let homeShots = num(fixture.homeShots);
  let awayShots = num(fixture.awayShots);
  let homeShotsOnTarget = num(fixture.homeShotsOnTarget);
  let awayShotsOnTarget = num(fixture.awayShotsOnTarget);
  let homeXG = num(fixture.homeXG);
  let awayXG = num(fixture.awayXG);
  let homeCorners = num(fixture.homeCorners);
  let awayCorners = num(fixture.awayCorners);
  let homeFouls = num(fixture.homeFouls);
  let awayFouls = num(fixture.awayFouls);
  let homeDangerousAttacks = num(fixture.homeDangerousAttacks);
  let awayDangerousAttacks = num(fixture.awayDangerousAttacks);
  let homeBoxEntries = num(fixture.homeBoxEntries);
  let awayBoxEntries = num(fixture.awayBoxEntries);
  let homeTotalPasses = num(fixture.homeTotalPasses);
  let awayTotalPasses = num(fixture.awayTotalPasses);
  let homeAccuratePasses = num(fixture.homeAccuratePasses);
  let awayAccuratePasses = num(fixture.awayAccuratePasses);
  let homeRecoveries = num(fixture.homeRecoveries);
  let awayRecoveries = num(fixture.awayRecoveries);
  let homeSuccessfulPressures = num(fixture.homeSuccessfulPressures);
  let awaySuccessfulPressures = num(fixture.awaySuccessfulPressures);

  const homeHeatmap = fixture.homeHeatmap ? { defense: fixture.homeHeatmap.defense, midfield: fixture.homeHeatmap.midfield, attack: fixture.homeHeatmap.attack } : { defense: 0, midfield: 0, attack: 0 };
  const awayHeatmap = fixture.awayHeatmap ? { defense: fixture.awayHeatmap.defense, midfield: fixture.awayHeatmap.midfield, attack: fixture.awayHeatmap.attack } : { defense: 0, midfield: 0, attack: 0 };

  // Helper: calcula fitness média real dos titulares (usando a fadiga da partida)
  const calcAvgFitness = (lineupIds: string[], redSet: Set<string>): number => {
    const active = lineupIds.map(id => allPlayers.find(p => p.id === id)).filter((p): p is Player => !!p && !redSet.has(p.id));
    if (active.length === 0) return 50;
    return active.reduce((sum, p) => sum + (matchFitness.get(p.id) ?? p.fitness), 0) / active.length;
  };

  // =====================================================================
  // SUBSTITUIÇÕES — antes o lance 'SUB' só imprimia um comentário e o banco
  // nunca era usado. Agora troca jogador de verdade, com limite de 5 por time.
  // =====================================================================
  const positionGroup = (pos: Position): Position[] => {
    if (pos === Position.GK) return [Position.GK];
    if ([Position.LB, Position.CB, Position.RB].includes(pos)) return [Position.LB, Position.CB, Position.RB];
    if ([Position.DM, Position.CM, Position.LM, Position.RM, Position.AM].includes(pos)) return [Position.DM, Position.CM, Position.LM, Position.RM, Position.AM];
    return [Position.LW, Position.RW, Position.SS, Position.ST];
  };

  /** O time é o do treinador humano? Ele decide as próprias trocas. */
  const isUserSide = (isHomeSide: boolean) =>
    userTeamId !== null && (isHomeSide ? fixture.homeTeamId : fixture.awayTeamId) === userTeamId;

  /** Faz uma troca. Devolve true se a substituição aconteceu. */
  const makeSub = (isHomeSide: boolean, minute: number, playerOut: Player | null, forced: boolean, modo: 'ATTACK' | 'DEFEND' | null = null): boolean => {
    // O motor NÃO mexe na escalação do usuário. Quem decide quem entra e quem
    // sai do time do treinador é o próprio treinador.
    if (isUserSide(isHomeSide) && !SIM_CONFIG.autoSubUserTeam) return false;
    const lineup = isHomeSide ? myHomeLineup : myAwayLineup;
    const bench = isHomeSide ? homeBench : awayBench;
    const reds = isHomeSide ? redCardedHome : redCardedAway;
    const used = isHomeSide ? subsUsedHome : subsUsedAway;
    const teamObj = isHomeSide ? homeTeam : awayTeam;
    if (used >= MAX_SUBS || bench.length === 0) return false;

    // Quem sai: o indicado (lesionado) ou o titular mais desgastado
    let out = playerOut;
    if (!out || !lineup.includes(out.id)) {
      const candidates = lineup
        .map(id => allPlayers.find(p => p.id === id))
        .filter((p): p is Player => !!p && !reds.has(p.id) && p.position !== Position.GK);
      if (candidates.length === 0) return false;
      const maisCansado = (lista: Player[]) => lista.reduce((worst, p) =>
        (matchFitness.get(p.id) ?? p.fitness) < (matchFitness.get(worst.id) ?? worst.fitness) ? p : worst);
      // TROCA TACTICA: a perder, sai um jogador de defesa/meio defensivo e entra um atacante; a ganhar, sai um atacante e entra um defensor.
      const defensivos = candidates.filter(p => [Position.CB, Position.LB, Position.RB, Position.DM].includes(p.position));
      const atacantes = candidates.filter(p => [Position.ST, Position.SS, Position.LW, Position.RW, Position.AM].includes(p.position));
      if (modo === 'ATTACK' && defensivos.length > 2) out = maisCansado(defensivos);
      else if (modo === 'DEFEND' && atacantes.length > 1) out = maisCansado(atacantes);
      else out = maisCansado(candidates);
    }

    const group = positionGroup(out.position);
    const benchPlayers = bench.map(id => allPlayers.find(p => p.id === id)).filter((p): p is Player => !!p);
    let pool: Player[] = [];
    if (modo === 'ATTACK') pool = benchPlayers.filter(p => [Position.ST, Position.SS, Position.LW, Position.RW, Position.AM].includes(p.position));
    else if (modo === 'DEFEND') pool = benchPlayers.filter(p => [Position.CB, Position.DM, Position.LB, Position.RB, Position.CM].includes(p.position));
    if (pool.length === 0) {
      const sameGroup = benchPlayers.filter(p => group.includes(p.position));
      pool = sameGroup.length > 0 ? sameGroup : benchPlayers.filter(p => p.position !== Position.GK);
    }
    if (pool.length === 0) return false;
    // O substituto: o melhor, mas descansado (um reserva exausto nao entra).
    const incoming = pool.reduce((best, p) => {
      const sp = p.skill - Math.max(0, 85 - (matchFitness.get(p.id) ?? p.fitness)) * 0.3;
      const sb = best.skill - Math.max(0, 85 - (matchFitness.get(best.id) ?? best.fitness)) * 0.3;
      return sp > sb ? p : best;
    });

    const idx = lineup.indexOf(out.id);
    if (idx === -1) return false;
    lineup[idx] = incoming.id;
    bench.splice(bench.indexOf(incoming.id), 1);
    matchFitness.set(incoming.id, allPlayers.find(p => p.id === incoming.id)?.fitness ?? 100);

    if (isHomeSide) subsUsedHome++; else subsUsedAway++;
    events.push({
      minute,
      type: 'SUB',
      description: `${t.sub} ${incoming.name} ${t.sub_made} ${out.name}${forced ? ` (${t.sub_injury})` : ''}`,
      teamId: teamObj.id,
      playerId: incoming.id,
    });

    home = rateHome();
    away = rateAway();
    return true;
  };

  /**
   * Resolve uma cobrança de pênalti. Estava duplicado em dois ramos do tick 3
   * (FINALIZACAO e FOUL), ~60 linhas idênticas. Devolve true se saiu gol.
   */
  const resolvePenalty = (minute: number, isHomeSide: boolean, teamObj: Team, lineup: string[], reds: Set<string>): boolean => {
    events.push({ minute, type: 'COMMENT', description: `⭕ ${t.penalty_awarded}`, teamId: teamObj.id });
    if (isHomeSide) { homeShots++; homeXG += PENALTY_XG(); } else { awayShots++; awayXG += PENALTY_XG(); }

    const taker = getRandomPlayerObj(allPlayers, lineup, [Position.ST, Position.SS, Position.AM, Position.CM], reds);
    if (Math.random() * 100 < PENALTY_CONVERSION()) {
      if (isHomeSide) { homeScore++; homeShotsOnTarget++; } else { awayScore++; awayShotsOnTarget++; }
      events.push({ minute, type: 'GOAL', description: `🎯 ${t.penalty_scored} ${taker?.name || 'ST'}!`, teamId: teamObj.id, playerId: taker?.id });
      momentum = clampMomentum(momentum + (isHomeSide ? 25 : -25));
      return true;
    }

    // Perdeu: defendido (vai no gol) ou para fora
    if (Math.random() * 100 < 85) {
      events.push({ minute, type: 'MISS_PENALTY', description: `🧤 ${t.penalty_saved}`, teamId: teamObj.id, playerId: taker?.id });
      if (isHomeSide) { homeShotsOnTarget++; awayRecoveries++; awaySuccessfulPressures++; }
      else { awayShotsOnTarget++; homeRecoveries++; homeSuccessfulPressures++; }
    } else {
      events.push({ minute, type: 'MISS_PENALTY', description: `❌ ${t.penalty_missed}`, teamId: teamObj.id, playerId: taker?.id });
    }
    momentum = clampMomentum(momentum + (isHomeSide ? -12 : 12));
    return false;
  };

  /** Após expulsão da CPU, reorganiza a equipe usando apenas a escalação local. */
  const handleRedCardCrisis = (minute: number, isHomeSide: boolean) => {
    const teamObj = isHomeSide ? homeTeam : awayTeam;
    const teamId = isHomeSide ? fixture.homeTeamId : fixture.awayTeamId;
    if (teamId === userTeamId) return;
    // A reorganização de emergência gasta uma substituição como qualquer outra.
    if ((isHomeSide ? subsUsedHome : subsUsedAway) >= MAX_SUBS) return;
    const swap = manageCPURedCardCrisis(
      teamObj, allPlayers,
      Array.from(isHomeSide ? redCardedHome : redCardedAway),
      isHomeSide ? myHomeLineup : myAwayLineup,
      isHomeSide ? homeBench : awayBench
    );
    if (swap) {
      if (isHomeSide) subsUsedHome++; else subsUsedAway++;
      matchFitness.set(swap.in.id, swap.in.fitness);
      events.push({
        minute, type: 'SUB',
        description: `${t.sub} ${swap.in.name} ${t.sub_made} ${swap.out.name}`,
        teamId: teamObj.id, playerId: swap.in.id,
      });
      home = rateHome();
      away = rateAway();
    }
  };

  /** Desgaste dentro da partida (só em modo lote — ao vivo o GameContext cuida). */
  const applyMatchFatigue = (isFirstHalfStart: boolean) => {
    if (isLiveTick) return;
    const wear = (lineup: string[], tactics: Tactics) => {
      lineup.forEach(id => {
        const p = allPlayers.find(pl => pl.id === id);
        if (!p) return;
        const cur = matchFitness.get(id) ?? p.fitness;
        matchFitness.set(id, Math.max(0, cur - matchFatiguePerMinute(tactics, p.position)));
      });
    };
    wear(myHomeLineup, homeTactics);
    wear(myAwayLineup, awayTactics);
    if (isFirstHalfStart) {
      // Descanso do intervalo
      matchFitness.forEach((v, k) => matchFitness.set(k, Math.min(100, v + 3)));
    }
  };

  // Helper: recalcula ratings e aplica mudança tática da IA
  const tryAITacticChange = (minute: number) => {
      const scoreDiff = homeScore - awayScore;
      const homeFit = calcAvgFitness(myHomeLineup, redCardedHome);
      const awayFit = calcAvgFitness(myAwayLineup, redCardedAway);
      const newHomeIntent = decideTeamIntent(homeTactics, momentum, minute, scoreDiff, homeFit, homeTeam?.managerTactics);
      const newAwayIntent = decideTeamIntent(awayTactics, -momentum, minute, -scoreDiff, awayFit, awayTeam?.managerTactics);
      let changed = false;

      // ATTACK deixou de ser excluído: era justamente a intenção devolvida por
      // decideTeamIntent para "perdendo no fim do jogo", o comportamento mais
      // importante da IA, que nunca chegava a ser aplicado.
      if (newHomeIntent !== homeIntent && homeIntent !== null) {
          homeTactics = applyIntentToTactics(homeBase, newHomeIntent);
          events.push({ minute, type: 'TACTICS', description: `${t.tactics_change} ${homeTeam.name} → ${t.intent[newHomeIntent]}`, teamId: homeTeam.id });
          changed = true;
      }
      homeIntent = newHomeIntent;

      if (newAwayIntent !== awayIntent && awayIntent !== null) {
          awayTactics = applyIntentToTactics(awayBase, newAwayIntent);
          events.push({ minute, type: 'TACTICS', description: `${t.tactics_change} ${awayTeam.name} → ${t.intent[newAwayIntent]}`, teamId: awayTeam.id });
          changed = true;
      }
      awayIntent = newAwayIntent;

      if (changed) {
          home = rateHome();
          away = rateAway();
          // O deck é indexado por (minuto - 1); regenerar a partir de `minute`
          // sobrescrevia um minuto a mais e podia alterar o tamanho do baralho.
          const from = Math.max(0, minute);
          const remaining = matchDeck.length - from;
          if (remaining > 0) {
              const newDeck = generateMatchDeck(home, away, remaining, isDerby);
              matchDeck.splice(from, remaining, ...newDeck.slice(0, remaining));
          }
      }
  };

  // Uma partida não tem minuto 0; começar em 0 fazia o índice do deck virar -1.
  const loopStart = Math.max(1, startMinute);
  for (let minute = loopStart; minute <= (finalMinute !== undefined ? finalMinute : 130); minute++) {

    const matchEndMinute = getMatchEndMinute(events);

    if (minute > matchEndMinute) break;

    // === FASE 5: Team AI (Intervenção Tática Dinâmica) ===
    if (minute === 45 || minute === 60 || minute === 75) {
      tryAITacticChange(minute);
    }

    // Cada minuto tem seu próprio lance. Antes, tudo acima dos 90 reaproveitava
    // a entrada 89, repetindo o mesmo lance em todos os acréscimos.
    const deckEntry = matchDeck[Math.min(matchDeck.length - 1, minute - 1)] || 'HOME:NOTHING';
    const [side, outcome] = deckEntry.split(':');
    const isHomeActive = side === 'HOME';

    const currentHalfTimeMinute = getHalfTimeMinute(events);
    const isWaitingHT = globalHTDuration !== undefined && globalHTDuration > currentHalfTimeMinute && minute > currentHalfTimeMinute && minute <= globalHTDuration;

    if (isWaitingHT) {
      possessionTimeline.push(isHomeActive ? 'home' : 'away');
      ballZoneTimeline.push(13);
      momentumHistory.push(Math.round(momentum));
      continue;
    }
    possessionTimeline.push(isHomeActive ? 'home' : 'away');
    const curTeam = isHomeActive ? { ...homeTeam, tactics: homeTactics } : { ...awayTeam, tactics: awayTactics };
    const oppTeam = isHomeActive ? { ...awayTeam, tactics: awayTactics } : { ...homeTeam, tactics: homeTactics };
    const myL = isHomeActive ? myHomeLineup : myAwayLineup;
    const oppL = isHomeActive ? myAwayLineup : myHomeLineup;
    const myR = isHomeActive ? redCardedHome : redCardedAway;
    const oppR = isHomeActive ? redCardedAway : redCardedHome;
    const ticksToRun = tick !== undefined ? [tick] : [0, 1, 2, 3];

    // Increment dangerous attacks and simulate passes once per minute
    if (tick === undefined || tick === 0) {
      if (outcome === 'FINALIZACAO' || outcome === 'COUNTER' || outcome === 'CORNER') {
        if (isHomeActive) homeDangerousAttacks++; else awayDangerousAttacks++;
      }

      const passRolls = Math.floor(Math.random() * 4) + 5; // 5 to 8 passes attempted
      const myMid = isHomeActive ? home.midfield.center : away.midfield.center;
      const oppMid = isHomeActive ? away.midfield.center : home.midfield.center;
      const passAccuracy = Math.max(0.60, Math.min(0.92, 0.78 + (myMid - oppMid) / 300));
      const accurateCount = Math.round(passRolls * passAccuracy);
      if (isHomeActive) {
        homeTotalPasses += passRolls;
        homeAccuratePasses += accurateCount;
      } else {
        awayTotalPasses += passRolls;
        awayAccuratePasses += accurateCount;
      }
    }


    // === FASE 2: Selecionar lane de ataque baseado nos setores ===
    const sectors = normalizeSectors(curTeam.tactics.focusSectors);
    const attackLane = selectAttackLane(sectors);
    const oppLane: Lane = mirrorLane(attackLane);

    // Track consecutive attacks
    if (outcome === 'FINALIZACAO' || outcome === 'COUNTER') {
      if (isHomeActive) { consecutiveAttacks.home++; consecutiveAttacks.away = 0; }
      else { consecutiveAttacks.away++; consecutiveAttacks.home = 0; }
      // Momentum boost for 3+ consecutive attacks
      if (consecutiveAttacks.home >= 3) momentum = clampMomentum(momentum + 5);
      if (consecutiveAttacks.away >= 3) momentum = clampMomentum(momentum - 5);
    } else {
      // Non-attack events don't reset streak immediately
      if (outcome !== 'NOTHING') {
        consecutiveAttacks.home = Math.max(0, consecutiveAttacks.home - 1);
        consecutiveAttacks.away = Math.max(0, consecutiveAttacks.away - 1);
      }
    }

    let targetLane = 2;
    if (attackLane === 'Left') targetLane = 1;
    else if (attackLane === 'Right') targetLane = 3;

    for (const tickIdx of ticksToRun) {
        if (Math.random() < 0.4) {
           if (currentBallLane < targetLane) currentBallLane++;
           else if (currentBallLane > targetLane) currentBallLane--;
        }

        let ballIdx = isAtGoal === 'home' ? 26 : (isAtGoal === 'away' ? 0 : (currentBallLane * 5 + currentBallTier + 1));
        
        if (tickIdx === 0) {
            // Tick 0: Disputa de meio-campo
            const midPositions = getMidfieldPositions(attackLane);
            const p = getRandomPlayerObj(allPlayers, myL, midPositions, myR);
            const domPhrases = Array.isArray(t.midfield_dom) ? t.midfield_dom : [t.midfield_dom];
            const randomPhrase = domPhrases[Math.floor(Math.random() * domPhrases.length)];
            events.push({ minute, type: 'COMMENT', description: `${p?.name || curTeam.name} ${randomPhrase}`, teamId: curTeam.id, playerId: p?.id });
            currentBallTier = 2;
        } else if (tickIdx === 1) {
            // Tick 1: Passe/construção COM SETOR
            const midPositions = getMidfieldPositions(attackLane);
            const p = getRandomPlayerObj(allPlayers, myL, midPositions, myR);
            const laneNarr = attackLane === 'Left' ? t.vertical_pass_left : (attackLane === 'Right' ? t.vertical_pass_right : t.vertical_pass_center);
            events.push({ minute, type: 'PASS', description: `${p?.name || curTeam.name} ${laneNarr}`, teamId: curTeam.id, playerId: p?.id });
            currentBallTier = isHomeActive ? 3 : 1;
        } else if (tickIdx === 2) {
            // Tick 2: Avanço ou interceptação
            if (outcome === 'NOTHING' || outcome === 'FOUL' || outcome === 'RED' || outcome === 'YELLOW') {
                const defPositions = getDefensePositions(oppLane);
                const d = getRandomPlayerObj(allPlayers, oppL, defPositions, oppR);
                events.push({ minute, type: 'TACKLE', description: `${d?.name || oppTeam.name} ${t.tackle_success}`, teamId: oppTeam.id, playerId: d?.id });
                currentBallTier = 2;

                // Track recoveries and successful pressures for defending team (oppTeam)
                if (isHomeActive) {
                    awayRecoveries++;
                    awaySuccessfulPressures++;
                } else {
                    homeRecoveries++;
                    homeSuccessfulPressures++;
                }
            } else {
                const advText = attackLane === 'Left' ? t.advance_left : (attackLane === 'Right' ? t.advance_right : t.advance_center);
                events.push({ minute, type: 'COMMENT', description: `${curTeam.name} ${advText}`, teamId: curTeam.id });
                currentBallTier = isHomeActive ? 4 : 0;
            }
        } else if (tickIdx === 3) {
            // =====================================================
            // TICK 3 — RESOLUÇÃO DINÂMICA (Fases 1, 2, 4 unificadas)
            // =====================================================
            const roll = Math.random() * 100;

            if (outcome === 'FINALIZACAO' || outcome === 'COUNTER') {
                // === FASE 2: Confronto por setor ===
                const myRatings = isHomeActive ? home : away;
                const oppRatings = isHomeActive ? away : home;
                const attRating = getLaneRating(isHomeActive ? home : away, attackLane, 'attack') * (1 + (curTeam.tactics.tempo - 50) / 350);
                // Linha alta = defesa mais exposta. O sinal aqui estava invertido: adiantar a
                // linha AUMENTAVA a força defensiva, o que somado ao ganho de meio-campo
                // fazia de linha=100 a escolha ótima em qualquer situação.
                const defRating = getLaneRating(!isHomeActive ? home : away, oppLane, 'defense') * (1 - (oppTeam.tactics.defensiveLine - 50) / SIM_CONFIG.defLineCounterExposure);
                const gkRating = !isHomeActive ? home.goalkeeping : away.goalkeeping;
                
                // === FASE 1: Momentum factor ===
                // Os antigos "hacks de placar" foram removidos daqui: bônus de 25%
                // para quem estava perdendo e multiplicadores por total de gols
                // (x1.35 no 3º, x0.35 no 4º, x0.15 do 5º em diante). Eles forçavam
                // a distribuição de gols na marra, quebravam a causalidade (a chance
                // passava a depender do placar e não da qualidade do time) e eram a
                // principal razão de times fortes não conseguirem golear.
                const momDirection = isHomeActive ? 1 : -1;
                const momFactor = 1 + (momentum * momDirection) / SIM_CONFIG.momentumDampening;

                // Synergy factor
                const synFactor = 0.6 + (myRatings.synergy / 100) * 0.4;
                
                // Fitness factor (média dos atacantes do setor)
                const attackPositions = getAttackPositions(attackLane);
                const attackerFitness = myL.map(id => allPlayers.find(p => p.id === id))
                  .filter((p): p is Player => !!p && attackPositions.includes(p.position) && !myR.has(p.id))
                  .reduce((sum, p, _, arr) => sum + (matchFitness.get(p.id) ?? p.fitness) / (arr.length || 1), 0) || 70;
                const fitFactor = 0.5 + (attackerFitness / 100) * 0.5;

                // Counter bonus (suavizado: 1.15 base, /200 em vez de /100)
                const oppDefLine = oppTeam.tactics.defensiveLine;
                const counterBonus = outcome === 'COUNTER'
                  ? 1.15 + (oppDefLine - 50) / 200
                  : 1.0;

                // === FASE 4: Cálculo dinâmico de chance de gol ===
                // Razão de forças elevada a um expoente: amplifica diferenças de
                // elenco que a fórmula linear anterior praticamente anulava.
                const ratio = (attRating + SIM_CONFIG.attackFloor) /
                              (defRating + gkRating * SIM_CONFIG.gkWeight + SIM_CONFIG.defenseFloor);
                const homeBonus = isHomeActive ? SIM_CONFIG.homeAttackBonus : 1.0;
                let goalChance = SIM_CONFIG.goalChanceScale * Math.pow(ratio, SIM_CONFIG.strengthExponent)
                                 * momFactor * synFactor * fitFactor * counterBonus * homeBonus;

                // Clássico: jogo mais amarrado
                if (isDerby) goalChance *= 0.85;
                
                // Agressividade do defensor afeta chance de falta derivada
                const defAgg = oppTeam.tactics.aggression;
                const foulChance = defAgg === 'Very Aggressive' ? 15 : (defAgg === 'Aggressive' ? 10 : (defAgg === 'Passive' ? 3 : (defAgg === 'Very Passive' ? 2 : 5)));

                // Count shot and xG
                if (isHomeActive) {
                    homeShots++;
                    homeXG += Math.min(0.95, goalChance / 100);
                } else {
                    awayShots++;
                    awayXG += Math.min(0.95, goalChance / 100);
                }

                if (roll < goalChance) {
                    // === GOL — Resolvido dinamicamente! ===
                    if (isHomeActive) {
                        homeScore++;
                        homeShotsOnTarget++;
                    } else {
                        awayScore++;
                        awayShotsOnTarget++;
                    }
                    const sc = pickScorer(allPlayers, myL, attackLane, myR);
                    const asstPositions = [...getMidfieldPositions(attackLane), ...attackPositions];
                    const asst = getRandomPlayerObj(allPlayers, myL, asstPositions, myR);
                    const assistId = (asst && sc && asst.id !== sc.id) ? asst.id : undefined;
                    events.push({ minute, type: 'GOAL', description: `${t.goal_perfect} ${sc?.name || 'Attack'}!`, teamId: curTeam.id, playerId: sc?.id, assistPlayerId: assistId });
                    ballIdx = isHomeActive ? 26 : 0; isAtGoal = isHomeActive ? 'home' : 'away';
                    
                    // Momentum: gol marcado
                    const momGain = getMomentumGainForGoal(curTeam.tactics.style);
                    const momLoss = getMomentumLossForGoal(oppTeam.tactics.style);
                    momentum = clampMomentum(momentum + (isHomeActive ? momGain : momLoss * -1));

                    // IA reage imediatamente após gol
                    tryAITacticChange(minute);
                    
                } else if (roll < goalChance + foulChance) {
                    // === FALTA (possível pênalti) ===
                    if (isHomeActive) {
                        awayFouls++;
                    } else {
                        homeFouls++;
                    }

                    const penaltyRoll = Math.random() * 100;
                    const fl = pickFouler(allPlayers, oppL, oppLane, oppR, isHomeActive ? yellowCardedAway : yellowCardedHome);

                    if (penaltyRoll < (PENALTY_BY_AGGRESSION()[defAgg] ?? 1.1)) {
                        if (resolvePenalty(minute, isHomeActive, curTeam, myL, myR)) {
                            ballIdx = isHomeActive ? 26 : 0;
                            tryAITacticChange(minute);
                        }
                    } else {
                        // Falta normal com chance de cartão
                        const cardRoll = Math.random() * 100;
                        const oppYellows = isHomeActive ? yellowCardedAway : yellowCardedHome;
                        const oppReds = isHomeActive ? redCardedAway : redCardedHome;
                        
                        const redChance = RED_BY_AGGRESSION()[defAgg] ?? 0.10;
                        const yellowChance = YELLOW_BY_AGGRESSION()[defAgg] ?? 12;
                        if (cardRoll < redChance) {
                            // Vermelho direto
                            events.push({ minute, type: 'CARD', description: `${t.red_card} ${fl?.name || 'Defense'}.`, teamId: oppTeam.id, playerId: fl?.id });
                            if (fl) oppReds.add(fl.id);
                            handleRedCardCrisis(minute, false);
                            handleRedCardCrisis(minute, true);
                            momentum = clampMomentum(momentum + (isHomeActive ? 20 : -20));
                        } else if (cardRoll < redChance + yellowChance) {
                            // Amarelo (ou segundo amarelo → vermelho)
                            if (fl && oppYellows.has(fl.id)) {
                                events.push({ minute, type: 'CARD', description: `${t.red_card_second_yellow} ${fl.name}.`, teamId: oppTeam.id, playerId: fl.id });
                                oppReds.add(fl.id); oppYellows.delete(fl.id);
                                handleRedCardCrisis(minute, false);
                                handleRedCardCrisis(minute, true);
                                momentum = clampMomentum(momentum + (isHomeActive ? 20 : -20));
                            } else {
                                events.push({ minute, type: 'CARD', description: `${t.yellow_card} ${fl?.name || 'Defense'}.`, teamId: oppTeam.id, playerId: fl?.id });
                                if (fl) oppYellows.add(fl.id);
                            }
                        } else {
                            events.push({ minute, type: 'FOUL', description: `${t.foul_called} ${oppTeam.name}.`, teamId: oppTeam.id, playerId: fl?.id });
                        }
                    }
                    isAtGoal = null;
                    
                } else if (roll < goalChance + foulChance + 25) {
                    // === DEFESA DO GOLEIRO ===
                    if (isHomeActive) {
                        homeShotsOnTarget++;
                        awayRecoveries++;
                        awaySuccessfulPressures++;
                    } else {
                        awayShotsOnTarget++;
                        homeRecoveries++;
                        homeSuccessfulPressures++;
                    }
                    const gk = getRandomPlayerObj(allPlayers, oppL, [Position.GK], oppR);
                    const sh = getRandomPlayerObj(allPlayers, myL, attackPositions, myR);
                    events.push({ minute, type: 'SAVE', description: `${gk?.name || 'Keeper'} ${t.corner_save}`, teamId: oppTeam.id, playerId: gk?.id, shooterId: sh?.id });
                    ballIdx = isHomeActive ? 25 : 1; isAtGoal = null;
                    
                    // Grande defesa = momentum para o defensor (modificado por agressividade)
                    const aggBonus = (oppTeam.tactics.aggression === 'Very Aggressive' || oppTeam.tactics.aggression === 'Aggressive') ? 12 : 8;
                    momentum = clampMomentum(momentum + (isHomeActive ? -aggBonus : aggBonus));
                    
                } else if (roll < goalChance + foulChance + 25 + 10) {
                    // === ESCANTEIO DERIVADO ===
                    if (isHomeActive) {
                        homeCorners++;
                    } else {
                        awayCorners++;
                    }
                    events.push({ minute, type: 'CORNER', description: `${curTeam.name} ${t.corner_awarded}`, teamId: curTeam.id });
                    ballIdx = isHomeActive ? 26 : 0; isAtGoal = isHomeActive ? 'home' : 'away';
                } else {
                    // === CHUTE PARA FORA / BLOQUEIO ===
                    const sh = getRandomPlayerObj(allPlayers, myL, attackPositions, myR);
                    events.push({ minute, type: 'MISS', description: t.miss_close.replace('@PLAYER', sh?.name || 'Attack'), teamId: curTeam.id, playerId: sh?.id });
                    ballIdx = isHomeActive ? 27 : -1; isAtGoal = null;
                }

            } else if (outcome === 'FOUL') {
                if (isHomeActive) {
                    awayFouls++;
                } else {
                    homeFouls++;
                }

                const foulRoll = Math.random() * 100;
                const fl = pickFouler(allPlayers, oppL, oppLane, oppR, isHomeActive ? yellowCardedAway : yellowCardedHome);
                const defAgg = oppTeam.tactics.aggression;
                
                // Agressividade influencia probabilidade de falta grave
                const penaltyThreshold = PENALTY_BY_AGGRESSION()[defAgg] ?? 1.1;
                const redThreshold = RED_BY_AGGRESSION()[defAgg] ?? 0.10;
                const yellowThreshold = YELLOW_BY_AGGRESSION()[defAgg] ?? 12;
                
                if (foulRoll < penaltyThreshold) {
                    if (resolvePenalty(minute, isHomeActive, curTeam, myL, myR)) {
                        ballIdx = isHomeActive ? 26 : 0;
                        tryAITacticChange(minute);
                    }
                } else if (foulRoll < penaltyThreshold + redThreshold) {
                    events.push({ minute, type: 'CARD', description: `${t.red_card} ${fl?.name || 'Defense'}.`, teamId: oppTeam.id, playerId: fl?.id });
                    if (fl) { if (isHomeActive) redCardedAway.add(fl.id); else redCardedHome.add(fl.id); }
                    handleRedCardCrisis(minute, false);
                    handleRedCardCrisis(minute, true);
                    momentum = clampMomentum(momentum + (isHomeActive ? 20 : -20));
                } else if (foulRoll < penaltyThreshold + redThreshold + yellowThreshold) {
                    const oppYellows = isHomeActive ? yellowCardedAway : yellowCardedHome;
                    const oppReds = isHomeActive ? redCardedAway : redCardedHome;
                    if (fl && oppYellows.has(fl.id)) {
                        events.push({ minute, type: 'CARD', description: `${t.red_card_second_yellow} ${fl.name}.`, teamId: oppTeam.id, playerId: fl.id });
                        oppReds.add(fl.id); oppYellows.delete(fl.id);
                        handleRedCardCrisis(minute, false);
                        handleRedCardCrisis(minute, true);
                        momentum = clampMomentum(momentum + (isHomeActive ? 20 : -20));
                    } else {
                        events.push({ minute, type: 'CARD', description: `${t.yellow_card} ${fl?.name || 'Defense'}.`, teamId: oppTeam.id, playerId: fl?.id });
                        if (fl) oppYellows.add(fl.id);
                    }
                } else {
                    events.push({ minute, type: 'FOUL', description: `${t.foul_called} ${oppTeam.name}.`, teamId: oppTeam.id, playerId: fl?.id });
                }
                isAtGoal = null;
            } else if (outcome === 'OFFSIDE') {
                const off = getRandomPlayerObj(allPlayers, myL, getAttackPositions(attackLane), myR);
                events.push({ minute, type: 'OFFSIDE', description: `${off?.name || 'Player'} ${t.offside_called}`, teamId: curTeam.id, playerId: off?.id });
                currentBallTier = 2; isAtGoal = null;
            } else if (outcome === 'CORNER') {
                if (isHomeActive) {
                    homeCorners++;
                } else {
                    awayCorners++;
                }
                events.push({ minute, type: 'CORNER', description: `${curTeam.name} ${t.corner_awarded}`, teamId: curTeam.id });
                currentBallTier = isHomeActive ? 4 : 0; isAtGoal = isHomeActive ? 'home' : 'away';
                if (Math.random() < CORNER_GOAL_CHANCE()) {
                    if (isHomeActive) {
                        homeScore++;
                        homeShots++;
                        homeShotsOnTarget++;
                        homeXG += 0.15;
                    } else {
                        awayScore++;
                        awayShots++;
                        awayShotsOnTarget++;
                        awayXG += 0.15;
                    }
                    const header = getRandomPlayerObj(allPlayers, myL, [Position.CB, Position.ST, Position.SS], myR);
                    const crosser = getRandomPlayerObj(allPlayers, myL, getMidfieldPositions(attackLane), myR);
                    const aId = (crosser && header && crosser.id !== header.id) ? crosser.id : undefined;
                    events.push({ minute, type: 'GOAL', description: `⚽ ${t.corner_goal} ${header?.name || 'Player'}!`, teamId: curTeam.id, playerId: header?.id, assistPlayerId: aId });
                    ballIdx = isHomeActive ? 26 : 0;
                    momentum = clampMomentum(momentum + (isHomeActive ? 25 : -25));
                    tryAITacticChange(minute);
                }
            } else if (outcome === 'INJURY') {
                // 50/50: lesão pode ser no time atacante ou defensor
                const injTeamIsAttacker = Math.random() < 0.5;
                const injLineup = injTeamIsAttacker ? myL : oppL;
                const injRedSet = injTeamIsAttacker ? myR : oppR;
                const injTeamObj = injTeamIsAttacker ? curTeam : oppTeam;
                const inj = getRandomPlayerObj(allPlayers, injLineup, [Position.ST, Position.CM, Position.CB, Position.GK], injRedSet);
                const rand = Math.random();
                let sev: 'LIGHT' | 'MEDIUM' | 'SEVERE' = 'LIGHT';
                if (rand > 0.95) { sev = 'SEVERE'; }
                else if (rand > 0.70) { sev = 'MEDIUM'; }
                
                const injuryDetails = getRandomInjuryBySeverity(sev);

                events.push({ 
                    minute, 
                    type: 'INJURY', 
                    description: `${inj?.name || 'Player'} ${t.injury_happened} (${injuryDetails.name})`, 
                    teamId: injTeamObj.id, 
                    playerId: inj?.id, 
                    injurySeverity: sev,
                    injuryName: injuryDetails.name,
                    injuryDaysOut: injuryDetails.daysOut
                });
                currentBallTier = 2; isAtGoal = null;
                // Lesão = momentum negativo para o time lesionado
                const injMomShift = injTeamIsAttacker ? (isHomeActive ? -10 : 10) : (isHomeActive ? 10 : -10);
                momentum = clampMomentum(momentum + injMomShift);

                // Lesão média ou grave tira o jogador de campo. Se não houver banco
                // ou substituições disponíveis, ele segue em campo mas debilitado.
                if (inj && (sev === 'MEDIUM' || sev === 'SEVERE')) {
                    const injIsHomeSide = injTeamIsAttacker ? isHomeActive : !isHomeActive;
                    const replaced = makeSub(injIsHomeSide, minute, inj, true);
                    if (!replaced) {
                        const cur = matchFitness.get(inj.id) ?? inj.fitness;
                        matchFitness.set(inj.id, Math.max(0, cur * (sev === 'SEVERE' ? 0.4 : 0.7)));
                        home = rateHome();
                        away = rateAway();
                    }
                }
            } else if (outcome === 'LATERAL') {
                events.push({ minute, type: 'COMMENT', description: `${curTeam.name} ${t.lateral_out}`, teamId: curTeam.id });
                currentBallTier = isHomeActive ? 3 : 1; isAtGoal = null;
            } else if (outcome === 'YELLOW' || outcome === 'RED') {
                if (isHomeActive) {
                    awayFouls++;
                } else {
                    homeFouls++;
                }
                const fl = pickFouler(allPlayers, oppL, oppLane, oppR, isHomeActive ? yellowCardedAway : yellowCardedHome);
                const oppYellows = isHomeActive ? yellowCardedAway : yellowCardedHome;
                const oppReds = isHomeActive ? redCardedAway : redCardedHome;
                if (outcome === 'RED') {
                   events.push({ minute, type: 'CARD', description: `${t.red_card} ${fl?.name || 'Defense'}.`, teamId: oppTeam.id, playerId: fl?.id });
                   if (fl) oppReds.add(fl.id);
                   momentum = clampMomentum(momentum + (isHomeActive ? 20 : -20));
                } else {
                   // Verifica segundo amarelo → vermelho
                   if (fl && oppYellows.has(fl.id)) {
                       events.push({ minute, type: 'CARD', description: `${t.red_card_second_yellow} ${fl.name}.`, teamId: oppTeam.id, playerId: fl.id });
                       oppReds.add(fl.id); oppYellows.delete(fl.id);
                       handleRedCardCrisis(minute, false);
                       handleRedCardCrisis(minute, true);
                       momentum = clampMomentum(momentum + (isHomeActive ? 20 : -20));
                   } else {
                       events.push({ minute, type: 'CARD', description: `${t.yellow_card} ${fl?.name || 'Defense'}.`, teamId: oppTeam.id, playerId: fl?.id });
                       if (fl) oppYellows.add(fl.id);
                   }
                }
                isAtGoal = null;
            } else if (outcome === 'SUB') {
                 // Trocas táticas só a partir do segundo tempo, como no futebol real.
                 if (minute >= 46) {
                    // Troca tactica conforme o placar do time que faz a troca.
                    const diffLado = isHomeActive ? homeScore - awayScore : awayScore - homeScore;
                    const modoSub = (diffLado < 0 && minute >= 55) ? 'ATTACK' : (diffLado > 0 && minute >= 70) ? 'DEFEND' : null;
                    makeSub(isHomeActive, minute, null, false, modoSub);
                 }
                 isAtGoal = null;
            } else {
                 events.push({ minute, type: 'COMMENT', description: t.midfield_chaos, teamId: curTeam.id });
                 currentBallTier = 2; isAtGoal = null;
            }
        }

        // Track box entries: when ball tier is 4 (home) or 0 (away)
        if (currentBallTier === 4) {
          homeBoxEntries++;
        } else if (currentBallTier === 0) {
          awayBoxEntries++;
        }

        // Update heatmap based on current ball tier
        if (currentBallTier === 0 || currentBallTier === 1) {
          homeHeatmap.defense++;
          awayHeatmap.attack++;
        } else if (currentBallTier === 2) {
          homeHeatmap.midfield++;
          awayHeatmap.midfield++;
        } else if (currentBallTier === 3 || currentBallTier === 4) {
          homeHeatmap.attack++;
          awayHeatmap.defense++;
        }

        ballZoneTimeline.push(ballIdx);
    }

    // Desgaste físico do minuto (modo lote)
    applyMatchFatigue(minute === 45);
    if (!isLiveTick && minute % 15 === 0) { home = rateHome(); away = rateAway(); }

    // === FASE 1: Decaimento natural do momentum ===
    // Modificado pelo Tempo tático: tempo alto = decaimento mais lento
    const avgTempo = ((homeTeam.tactics.tempo || 50) + (awayTeam.tactics.tempo || 50)) / 2;
    const decayRate = avgTempo > 70 ? 0.95 : (avgTempo < 30 ? 0.88 : 0.92);
    momentum = clampMomentum(momentum * decayRate);
    
    // Pressão alta acelera acumulação de momentum
    const homePressure = homeTeam.tactics.pressure || 50;
    const awayPressure = awayTeam.tactics.pressure || 50;
    if (homePressure > 70 && consecutiveAttacks.home >= 2) momentum = clampMomentum(momentum + 2);
    if (awayPressure > 70 && consecutiveAttacks.away >= 2) momentum = clampMomentum(momentum - 2);
    
    momentumHistory.push(Math.round(momentum));
    
    // Dispara HALF_TIME e FULL_TIME no final do tick
    const halfTimeMinute = getHalfTimeMinute(events);

    if (minute === halfTimeMinute && !events.some(e => e.minute === halfTimeMinute && e.type === 'HALF_TIME')) {
        events.push({ minute: halfTimeMinute, type: 'HALF_TIME', description: t.half_time || 'Intervalo!', teamId: fixture.homeTeamId });
    }
    
    const finalMatchEndMinute = getMatchEndMinute(events);

    if (minute === finalMatchEndMinute && !events.some(e => e.minute === finalMatchEndMinute && e.type === 'FULL_TIME')) {
        events.push({ minute: finalMatchEndMinute, type: 'FULL_TIME', description: t.full_time || 'Fim de Jogo!', teamId: fixture.homeTeamId });
    }
  }

  const matchEndMinuteFinal = getMatchEndMinute(events);

  const totalT = possessionTimeline.length || 1;
  const hPos = Math.round((possessionTimeline.filter(p => p === 'home').length / totalT) * 100);

  const effectiveEnd = finalMinute !== undefined ? finalMinute : matchEndMinuteFinal;

  // A partida acaba em 90+acréscimos; comparar com um finalMinute de 90 fazia as
  // notas nunca serem calculadas em simulações em lote. Basta o FULL_TIME.
  const isFinished = events.some(e => e.type === 'FULL_TIME') || effectiveEnd >= matchEndMinuteFinal;
  let playerRatings: Record<string, number> = {};
  if (isFinished) {
    playerRatings = calculateMatchRatings(events, homeTeam, awayTeam, homeScore, awayScore, myHomeLineup, myAwayLineup, allPlayers);
  }

  const normalizedHomeHeatmap = {
    defense: homeHeatmap.defense ? Math.round((homeHeatmap.defense / (homeHeatmap.defense + homeHeatmap.midfield + homeHeatmap.attack)) * 100) : 33,
    midfield: homeHeatmap.midfield ? Math.round((homeHeatmap.midfield / (homeHeatmap.defense + homeHeatmap.midfield + homeHeatmap.attack)) * 100) : 34,
    attack: homeHeatmap.attack ? Math.round((homeHeatmap.attack / (homeHeatmap.defense + homeHeatmap.midfield + homeHeatmap.attack)) * 100) : 33
  };

  const normalizedAwayHeatmap = {
    defense: awayHeatmap.defense ? Math.round((awayHeatmap.defense / (awayHeatmap.defense + awayHeatmap.midfield + awayHeatmap.attack)) * 100) : 33,
    midfield: awayHeatmap.midfield ? Math.round((awayHeatmap.midfield / (awayHeatmap.defense + awayHeatmap.midfield + awayHeatmap.attack)) * 100) : 34,
    attack: awayHeatmap.attack ? Math.round((awayHeatmap.attack / (awayHeatmap.defense + awayHeatmap.midfield + awayHeatmap.attack)) * 100) : 33
  };

  const hSum = normalizedHomeHeatmap.defense + normalizedHomeHeatmap.midfield + normalizedHomeHeatmap.attack;
  if (hSum !== 100 && normalizedHomeHeatmap.midfield) {
    normalizedHomeHeatmap.midfield += (100 - hSum);
  }
  const aSum = normalizedAwayHeatmap.defense + normalizedAwayHeatmap.midfield + normalizedAwayHeatmap.attack;
  if (aSum !== 100 && normalizedAwayHeatmap.midfield) {
    normalizedAwayHeatmap.midfield += (100 - aSum);
  }

  const hFatigue = Math.round(100 - calcAvgFitness(myHomeLineup, redCardedHome));
  const aFatigue = Math.round(100 - calcAvgFitness(myAwayLineup, redCardedAway));

  return { 
    ...fixture, 
    homeScore, awayScore, 
    homePossession: hPos, awayPossession: 100 - hPos, 
    currentPossession: possessionTimeline[possessionTimeline.length - 1] || 'home', 
    possessionTimeline, ballZoneTimeline, 
    ballZone: ballZoneTimeline[ballZoneTimeline.length - 1] || 13, 
    played: isFinished, 
    events, 
    matchDeck, 
    redCardedHome: Array.from(redCardedHome), 
    redCardedAway: Array.from(redCardedAway), 
    yellowCardedHome: Array.from(yellowCardedHome), 
    yellowCardedAway: Array.from(yellowCardedAway),
    momentum,
    momentumHistory,
    playerRatings,
    homeShots,
    awayShots,
    homeShotsOnTarget,
    awayShotsOnTarget,
    homeXG: parseFloat(homeXG.toFixed(2)),
    awayXG: parseFloat(awayXG.toFixed(2)),
    homeCorners,
    awayCorners,
    homeFouls,
    awayFouls,
    homeDangerousAttacks,
    awayDangerousAttacks,
    homeBoxEntries,
    awayBoxEntries,
    homeAccuratePasses,
    awayAccuratePasses,
    homeTotalPasses,
    awayTotalPasses,
    homeRecoveries,
    awayRecoveries,
    homeSuccessfulPressures,
    awaySuccessfulPressures,
    homeAvgFatigue: hFatigue,
    awayAvgFatigue: aFatigue,
    homeLineup: myHomeLineup,
    awayLineup: myAwayLineup,
    subsUsedHome,
    subsUsedAway,
    homeHeatmap: normalizedHomeHeatmap,
    awayHeatmap: normalizedAwayHeatmap
  };
};

// =====================================================================
// CALCULA AS NOTAS DOS JOGADORES AO FINAL DA PARTIDA
// =====================================================================
export const calculateMatchRatings = (
  events: MatchEvent[],
  home: Team,
  away: Team,
  homeScore: number,
  awayScore: number,
  homeLineup?: string[],
  awayLineup?: string[],
  allPlayers?: Player[]
): Record<string, number> => {
  const ratings: Record<string, number> = {};
  // A escalação efetiva da partida tem precedência sobre a do time.
  const hL = homeLineup && homeLineup.length > 0 ? homeLineup : home.lineup;
  const aL = awayLineup && awayLineup.length > 0 ? awayLineup : away.lineup;

  // Sem a lista de jogadores não dá para saber quem é goleiro ou zagueiro; nesse
  // caso o bônus/ônus por gols sofridos simplesmente não se aplica.
  const gkIds = new Set<string>();
  const defIds = new Set<string>();
  (allPlayers || []).forEach(p => {
    if (p.position === Position.GK) gkIds.add(p.id);
    else if ([Position.LB, Position.CB, Position.RB].includes(p.position)) defIds.add(p.id);
  });

  // Inicia todos os starters com 6.0
  [...hL, ...aL].forEach(id => ratings[id] = 6.0);

  // Inicia também quem entrou no jogo
  events.forEach(e => {
      if (e.type === 'SUB' && e.playerId) {
          if (ratings[e.playerId] === undefined) {
              ratings[e.playerId] = 6.0;
          }
      }
  });

  // Vitória/Derrota (+0.5 / -0.5)
  const homeResBonus = homeScore > awayScore ? 0.5 : (homeScore < awayScore ? -0.5 : 0);
  const awayResBonus = awayScore > homeScore ? 0.5 : (awayScore < homeScore ? -0.5 : 0);

  // Aplica bônus a todos que ganharam nota do time da casa e fora
  Object.keys(ratings).forEach(id => {
      const isHome = hL.includes(id) || events.some(e => e.type === 'SUB' && e.teamId === home.id && e.playerId === id);
      const isAway = aL.includes(id) || events.some(e => e.type === 'SUB' && e.teamId === away.id && e.playerId === id);
      if (isHome) ratings[id] += homeResBonus;
      if (isAway) ratings[id] += awayResBonus;
  });

  // ---------------------------------------------------------------------
  // Eventos individuais.
  // O motor gera ~53 desarmes e ~97 passes por jogo, todos com playerId, e a
  // versão anterior ignorava os dois: 57% dos jogadores terminavam a partida
  // com nota 6.0 ± o resultado, e zagueiro não tinha como se destacar.
  // ---------------------------------------------------------------------
  const tackles: Record<string, number> = {};
  const passes: Record<string, number> = {};

  events.forEach(e => {
    if (e.playerId && ratings[e.playerId] !== undefined) {
      switch (e.type) {
        case 'GOAL':
          ratings[e.playerId] += 1.5;
          break;
        case 'CARD':
          if (e.description.includes('🟥')) ratings[e.playerId] -= 1.5;
          else if (e.description.includes('🟨')) ratings[e.playerId] -= 0.5;
          break;
        case 'MISS_PENALTY':
          ratings[e.playerId] -= 1.5;
          break;
        case 'MISS':
          ratings[e.playerId] += 0.1; // finalizou: criou perigo
          break;
        case 'OFFSIDE':
          ratings[e.playerId] -= 0.1;
          break;
        case 'TACKLE':
          tackles[e.playerId] = (tackles[e.playerId] || 0) + 1;
          break;
        case 'PASS':
          passes[e.playerId] = (passes[e.playerId] || 0) + 1;
          break;
        case 'SAVE':
          ratings[e.playerId] += 0.25;
          if (e.shooterId && ratings[e.shooterId] !== undefined) {
            ratings[e.shooterId] += 0.15; // obrigou o goleiro a trabalhar
          }
          break;
      }
    }
    if (e.assistPlayerId && ratings[e.assistPlayerId] !== undefined) {
      ratings[e.assistPlayerId] += 0.8;
    }
  });

  // Trabalho defensivo e de construção, com retorno decrescente para que
  // volume bruto não vire nota alta sozinho.
  const diminishing = (n: number, per: number, cap: number) => Math.min(cap, Math.sqrt(n) * per);
  Object.keys(tackles).forEach(id => { ratings[id] += diminishing(tackles[id], 0.30, 1.2); });
  Object.keys(passes).forEach(id => { ratings[id] += diminishing(passes[id], 0.12, 0.8); });

  // ---------------------------------------------------------------------
  // Contexto do time: quem defendeu bem ganha, quem levou gol perde.
  // Isso também corrige o incentivo perverso do goleiro, que antes só somava
  // por defesa — quanto pior o time à frente dele, maior era a nota.
  // ---------------------------------------------------------------------
  const applyTeamContext = (lineup: string[], teamId: string, conceded: number) => {
    const ids = new Set<string>(lineup);
    events.forEach(e => { if (e.type === 'SUB' && e.teamId === teamId && e.playerId) ids.add(e.playerId); });
    ids.forEach(id => {
      if (ratings[id] === undefined) return;
      const isGK = gkIds.has(id);
      const isDef = defIds.has(id);
      if (!isGK && !isDef) return;
      if (conceded === 0) ratings[id] += isGK ? 0.8 : 0.6;   // jogo sem sofrer gol
      else ratings[id] -= conceded * (isGK ? 0.35 : 0.25);
    });
  };
  applyTeamContext(hL, home.id, awayScore);
  applyTeamContext(aL, away.id, homeScore);

  // Limita nota entre 0 e 10
  Object.keys(ratings).forEach(id => {
    ratings[id] = Math.max(0, Math.min(10, Number(ratings[id].toFixed(1))));
  });

  return ratings;
};

// =====================================================================
// CPU CRISIS MANAGEMENT — Reorganização após vermelho
// =====================================================================
/**
 * Reorganiza a equipe da CPU após uma expulsão. Opera sobre a escalação LOCAL da
 * partida (array mutável passado por referência) — antes escrevia direto em
 * `team.lineup`, e a reorganização de emergência sobrevivia ao apito final.
 * Devolve a troca feita, se houver, para que o chamador possa narrá-la.
 */
const manageCPURedCardCrisis = (
    team: Team,
    allPlayers: Player[],
    redIds: string[],
    lineup: string[],
    bench: string[]
): { out: Player; in: Player } | null => {
    if (redIds.length === 0) return null;
    const teamPlayers = allPlayers.filter(p => p.teamId === team.id);
    const activeLineupIds = lineup.filter(id => !redIds.includes(id));
    const activePlayers = activeLineupIds.map(id => teamPlayers.find(p => p.id === id));
    const hasGK = activePlayers.some(p => p?.position === Position.GK);
    const cbCount = activePlayers.filter(p => p?.position === Position.CB).length;
    if (hasGK && cbCount >= 2) return null;

    const available = bench.map(id => teamPlayers.find(p => p.id === id)).filter((p): p is Player => !!p);
    if (available.length === 0) return null;

    const swap = (reserve: Player | undefined, sacrificialRoles: string[]) => {
        const sacrificial = activePlayers.find(p => sacrificialRoles.includes(p?.position || ''));
        if (!reserve || !sacrificial) return null;
        const idx = lineup.indexOf(sacrificial.id);
        if (idx === -1) return null;
        lineup[idx] = reserve.id;
        const bIdx = bench.indexOf(reserve.id);
        if (bIdx !== -1) bench.splice(bIdx, 1);
        return { out: sacrificial, in: reserve };
    };

    if (!hasGK) return swap(available.find(p => p.position === Position.GK), ['ST', 'LW', 'RW']);
    return swap(available.find(p => p.position === Position.CB), ['AM', 'RW', 'LW', 'ST']);
};

// =====================================================================
// CPU TEAM MANAGEMENT — Monta lineup e tática aleatória
// =====================================================================
/**
 * Monta a escalação seguindo os slots da formação, escolhendo para cada posição
 * o melhor jogador disponível já considerando a penalidade por jogar fora do
 * lugar. O índice do array corresponde ao slot — é assim que o motor sabe quem
 * ocupa cada posição em campo.
 *
 * Antes a escalação era sempre um 1-4-4-2 fixo e a formação era sorteada DEPOIS,
 * então todo time da CPU jogava desencaixado da própria formação.
 */
export const buildLineupForFormation = (
    candidates: Player[],
    formation: Tactics['formation']
): string[] => {
    const slots = FORMATIONS[formation] || FORMATIONS['4-4-2'];
    const used = new Set<string>();
    const lineup: string[] = [];

    // O goleiro primeiro (é a posição menos substituível), depois os demais.
    const order = slots.map((s, i) => ({ s, i })).sort((a, b) =>
        (a.s.label === 'GK' ? -1 : 0) - (b.s.label === 'GK' ? -1 : 0));

    for (const { s, i } of order) {
        let best: Player | null = null, bestScore = -Infinity;
        for (const p of candidates) {
            if (used.has(p.id)) continue;
            const score = getEffectiveSkill(p, s.label);
            if (score > bestScore) { bestScore = score; best = p; }
        }
        if (best) { lineup[i] = best.id; used.add(best.id); }
    }
    return lineup.filter(Boolean);
};

/*
O TREINADOR DA CPU (antes: formacao SORTEADA a cada jogo — 76% de trocas entre jogos seguidos —, escalacao so por skill e nenhuma leitura do adversario).
Agora, antes de cada jogo:
  1. O ELENCO DISPONIVEL: sem lesionados; o skill de cada um desconta a fadiga (um titular a 50% de preparo vale ~10 pontos menos) e quem esta abaixo de 40 so joga
     se faltar gente. E assim que a CPU roda os jogadores quando o calendario aperta.
  2. A FORMACAO: monta-se o onze de cada formacao possivel e fica a que melhor encaixa neste elenco, com um bonus a que ja usava (nao muda por capricho) e outro
     conforme o adversario: contra um time claramente mais forte, o 5-3-2; contra um claramente mais fraco, o 4-3-3.
  3. A TACTICA: azarao joga fechado (Defensive), favorito joga a atacar (Offensive), equilibrado fica Balanced.
  4. O BANCO: cobre todas as zonas (1 goleiro, 3 defesas, 3 meios, 2 atacantes) com os mais fortes e descansados e completa com os melhores restantes.
*/
export const manageCPUTeam = (team: Team, opponent: Team, allPlayers: Player[], suspenso?: (p: Player) => boolean) => {
    let teamPlayers = allPlayers.filter(p => p.teamId === team.id && !p.injury && !(suspenso && suspenso(p)));
    if (teamPlayers.length === 0) return;
    // Sem nenhum goleiro apto, entra o melhor goleiro lesionado (melhor que um jogador de linha no gol).
    if (!teamPlayers.some(p => p.position === Position.GK)) {
        const gk = allPlayers.filter(p => p.teamId === team.id && p.position === Position.GK).sort((a, b) => b.skill - a.skill)[0];
        if (gk) teamPlayers = [...teamPlayers, gk];
    }
    const penalidade = (p: Player) => Math.max(0, 90 - p.fitness) * 0.25;
    const pool = teamPlayers.filter(p => p.fitness >= 40);
    const candidatos = (pool.length >= 14 && pool.some(p => p.position === Position.GK) ? pool : teamPlayers)
        .map(p => ({ ...p, skill: Math.max(1, p.skill - penalidade(p)) }) as Player);

    const forcaMedia = (id: string) => {
        const l = allPlayers.filter(p => p.teamId === id).sort((a, b) => b.skill - a.skill).slice(0, 14);
        return l.length ? l.reduce((s, p) => s + p.skill, 0) / l.length : 0;
    };
    const minha = forcaMedia(team.id), deles = forcaMedia(opponent.id);
    const formacoes: Tactics['formation'][] = ['4-4-2', '4-3-3', '4-2-3-1', '5-3-2'];
    let melhorForm = formacoes[0], melhorNota = -Infinity, melhorLineup: string[] = [];
    for (const f of formacoes) {
        const slots = FORMATIONS[f];
        const lu = buildLineupForFormation(candidatos, f);
        let nota = lu.reduce((s, id, i) => s + getEffectiveSkill(candidatos.find(p => p.id === id), slots[i]?.label || ''), 0) / Math.max(1, lu.length);
        if (f === team.tactics.formation) nota += 0.6;
        if (deles - minha >= 3 && f === '5-3-2') nota += 1.2;
        if (minha - deles >= 3 && f === '4-3-3') nota += 1.2;
        if (nota > melhorNota) { melhorNota = nota; melhorForm = f; melhorLineup = lu; }
    }
    team.tactics.formation = melhorForm;
    const lineup = melhorLineup.slice();
    const used = new Set(lineup);
    [...candidatos].sort((a, b) => b.skill - a.skill).forEach(p => { if (!used.has(p.id) && lineup.length < 11) { lineup.push(p.id); used.add(p.id); } });
    team.lineup = lineup;

    // Tactica pelo confronto.
    if (deles - minha >= 3) { team.tactics.style = 'Defensive'; team.tactics.pressure = Math.min(team.tactics.pressure, 50); }
    else if (minha - deles >= 3) { team.tactics.style = 'Offensive'; team.tactics.pressure = Math.max(team.tactics.pressure, 60); }
    else team.tactics.style = 'Balanced';

    // Banco que cobre as zonas.
    const restantes = [...candidatos].filter(p => !used.has(p.id)).sort((a, b) => b.skill - a.skill);
    const bench: string[] = [];
    const tomar = (pred: (p: Player) => boolean, n: number) => {
        for (const p of restantes) { if (n <= 0) break; if (!bench.includes(p.id) && pred(p)) { bench.push(p.id); n--; } }
    };
    tomar(p => p.position === Position.GK, 1);
    tomar(p => [Position.CB, Position.LB, Position.RB].includes(p.position), 3);
    tomar(p => [Position.DM, Position.CM, Position.LM, Position.RM, Position.AM].includes(p.position), 3);
    tomar(p => [Position.ST, Position.SS, Position.LW, Position.RW].includes(p.position), 2);
    for (const p of restantes) { if (bench.length >= 9) break; if (!bench.includes(p.id)) bench.push(p.id); }
    team.bench = bench;
    };
