
/** Minutos de "jogar junto" que cada ponto de impacto CHE (ex.: Analysis) soma a cada par de jogadores do grupo: o Chemistry (textSim/quimica.ts) sobe com eles. */
export const MINUTOS_POR_PONTO_CHE = 60;

/*
SISTEMA DE XP DO TREINO (atributos do 3D, `Player.treino3d`: campo -> XP acumulado, nao e mais "pontos"):
- Ganho: cada atividade tem um valor por atributo (chip SKL, ex.: 1.0). XP do slot = XP_POR_PONTO (10, o Centro de Treinamento nivel 3, padrao; o jogo ainda nao tem CT) x valor x idade x estrelas x exaustao.
- Custo: subir um atributo de N para N+1 custa `custoDoNivel(N) = 300 + 0.5 x (N - 50)^2` XP (50->51: 300; 70->71: 500; 90->91: 1100). Quanto mais alto, mais caro.
- Level up: o XP acumulado compra niveis a partir do valor BASE do atributo (o que ele tem sem treino); o que sobra e o cofre do proximo nivel. Teto de +15 niveis e de 99.
- Regressao por idade: tira niveis inteiros e zera o cofre parcial (XP negativo = niveis perdidos abaixo da base, ao custo do nivel de baixo).
*/
export const XP_POR_PONTO = 10;
/** Teto de niveis ganhos so por treino num atributo. */
export const NIVEIS_MAX_TREINO = 15;
/** XP para subir um atributo de `n` para `n + 1`. */
export const custoDoNivel = (n: number): number => 300 + 0.5 * (Math.max(50, n) - 50) ** 2;
/*
O TETO DE CRESCIMENTO: o treino so leva um atributo `folga + MARGEM_ATRIBUTO` niveis acima de onde ele esta (a base, sem treino). A folga e o que falta ao jogador para o potencial (OVR): o da base tem
potencial real (`Player.potential`, folga = potencial - OVR); o profissional nao tem e leva a folga da idade (`folgaDeCrescimento`: ~+1 no auge, +4 aos 20 anos). Sem isto um time da Serie D treinaria os
jogadores de OVR 66-70 ate 80 e viraria time de Serie A, e a liga inteira subiria para 90. Medido: com XP infinito em todos os atributos a media da liga sobe so ~+4 a +6 (ver tools/auditoriaTreino.ts).
*/
export const MARGEM_ATRIBUTO = 2;
/** A folga de crescimento de um profissional, em OVR: 1 por ano abaixo de 26 anos, mais 3 (nunca zero: quem esta no auge ainda lapida). */
export const folgaDeCrescimento = (idade: number): number => Math.round(Math.max(0, 26 - idade) * 1.0) + 3;
/** Quanto o jogador ainda pode crescer em OVR: o potencial real menos o OVR (base) ou, sem potencial, a folga da idade. */
export const folgaDeTreino = (p: { skill: number; age: number; potential?: number }): number =>
  typeof p.potential === 'number' ? Math.max(0, p.potential - p.skill) : folgaDeCrescimento(p.age);
/*
O CENTRO DE TREINAMENTO (CT) LIMITA ATE ONDE O TREINO LEVA UM ATRIBUTO: nivel 2 ate 80, nivel 3 ate 85, nivel 4 ate 90, nivel 5 ate 95 (o nivel 1, sem pedido, vale 75). O jogo ainda nao tem CT: o nivel vem da
liga do clube, como o da base (`nivelDaBaseDoClube`: 4 = Serie A do Brasil e 1.a da Europa, 3 = 1.a da America do Sul, 2 = o resto), registado pelo GameContext com `definirNivelDoCt`. Um atributo que ja
esta acima do teto do CT fica onde esta (so nao cresce mais).
*/
export const TETO_POR_CT: Record<number, number> = { 1: 75, 2: 80, 3: 85, 4: 90, 5: 95 };
let nivelDoCtDe: (teamId: string) => number = () => 3;
/** O GameContext diz qual o nivel do CT de cada clube. Sem isto vale o nivel 3. */
export const definirNivelDoCt = (fn: (teamId: string) => number) => { nivelDoCtDe = fn; };
/** Ate que valor o CT do clube deixa treinar um atributo. */
export const tetoDoCt = (teamId?: string): number => TETO_POR_CT[Math.max(1, Math.min(5, Math.round(teamId === undefined ? 3 : nivelDoCtDe(teamId))))];
/** O maior valor que o treino leva um atributo de `base`: base + folga + margem, limitado pelo CT e por 99; nunca abaixo da base. */
export const tetoDoAtributo = (p: { skill: number; age: number; potential?: number; teamId?: string }, base: number): number =>
  Math.min(99, Math.max(base, Math.min(Math.round(base + folgaDeTreino(p) + MARGEM_ATRIBUTO), tetoDoCt(p.teamId))));

type AtrLegacy = 'def' | 'pas' | 'drb' | 'sht';
/** Tira a foto dos quatro atributos antes do primeiro ganho de treino (o teto de crescimento conta a partir dela). */
export const garantirBaseLegacy = (p: Player): void => {
  if (!p.legacyBase) p.legacyBase = { def: p.def, pas: p.pas, drb: p.drb, sht: p.sht };
};
/** O teto de um dos quatro atributos (def, pas, drb, sht): o menor entre o do CT e `base + folga + margem` (o mesmo teto de crescimento dos 31 atributos). */
export const tetoDoLegacy = (p: Player, attr: AtrLegacy, soCt = false): number => {
  if (soCt) return tetoDoCt(p.teamId);   // jovem da CPU: so o CT limita
  const base = p.legacyBase ? p.legacyBase[attr] : p[attr];
  return Math.min(tetoDoCt(p.teamId), Math.round(base + folgaDeTreino(p) + MARGEM_ATRIBUTO));
};

/** Niveis (inteiros, negativos se perdeu) que um XP acumulado vale a partir do valor base do atributo, ate o `teto` (99 por omissao). */
export const niveisDeXp = (base: number, xp: number, teto = 99): number => {
  let n = 0;
  if (xp >= 0) {
    let r = xp;
    while (n < NIVEIS_MAX_TREINO && base + n < teto && r >= custoDoNivel(base + n)) { r -= custoDoNivel(base + n); n++; }
    return n;
  }
  let r = -xp;
  while (r > 0 && n > -60) { n--; r -= custoDoNivel(base + n); }   // uma parte de nivel perdida ja conta como nivel perdido
  return n;
};
/** O XP exato de `n` niveis a partir da base (cofre zerado): o contrario de `niveisDeXp`. */
export const xpDeNiveis = (base: number, n: number): number => {
  let x = 0;
  if (n >= 0) for (let i = 0; i < n; i++) x += custoDoNivel(base + i);
  else for (let i = 1; i <= -n; i++) x -= custoDoNivel(base - i);
  return x;
};

/** Stars (1-5) → XP multiplier. Derived from Player.potential or .potentialEstimate. */
export const STAR_MULTIPLIERS = {
  1: 0.6,   // ⭐
  2: 0.8,   // ⭐⭐
  3: 1.0,   // ⭐⭐⭐
  4: 1.2,   // ⭐⭐⭐⭐
  5: 1.4    // ⭐⭐⭐⭐⭐
};

/** Stars from potential (50-99). Same cuts as the Sub-20 display (`estrelasDePotencial`, youth.ts): 50-54 = 1, 55-64 = 2, 65-74 = 3, 75-84 = 4, 85+ = 5. */
export const starsFromPotential = (potential?: number): number => {
  if (!potential) return 3;
  if (potential >= 85) return 5;
  if (potential >= 75) return 4;
  if (potential >= 65) return 3;
  if (potential >= 55) return 2;
  return 1;
};

/** XP penalty for low energy. Energia > 75%: 1.0x, 50-74%: 0.8x, 25-49%: 0.5x, < 25%: 0.1x. */
export const exaustaoMultiplier = (energia: number): number => {
  if (energia >= 75) return 1.0;
  if (energia >= 50) return 0.8;
  if (energia >= 25) return 0.5;
  return 0.1;
};

/** Multiplicador de RECUPERACAO de energia pela stamina: Stamina 50 recupera metade do que um atleta com 100. Formula: stamina / 100. */
export const recoveryMultiplier = (stamina: number): number => {
  return Math.max(50, Math.min(100, stamina)) / 100;
};

/** Energia no comeco do jogo e na volta das ferias (inicio de temporada): sorteada entre 45 e 55. Nao ha mais Match Form: a Energia (0-100) so se limita a si mesma. */
export const energiaInicial = (rnd: () => number = Math.random): number => 45 + Math.round(rnd() * 10);
/** Energia na alta medica, como fracao do FIS: grave 1/2, media 1/3, leve 1/4 (a Energia nunca sobe por isto, so cai ate la). */
export const energiaPosLesao = (fisMedio: number, severity?: string): number =>
  fisMedio * (lesaoMuitoSeria(severity) ? 1 / 2 : (severity === 'MEDIUM' || severity === 'MÉDIA') ? 1 / 3 : 1 / 4);
/** Lesao muito seria: so a gravidade maxima (SEVERE / GRAVE). */
export const lesaoMuitoSeria = (severity?: string): boolean => severity === 'SEVERE' || severity === 'GRAVE';

/** Chance (%) de lesao por evento (jogo ou sessao de treino com custo de energia): 3% com Energia < 25%, senao 1%. */
export const chanceLesao = (energia: number): number => (energia < 25 ? 3 : 1);
/** Rola o dado de lesao (1 a 100): lesiona se o rolo <= chance. `rolo` e injetavel para os testes. */
export const rolouLesao = (energia: number, rolo: number = 1 + Math.floor(Math.random() * 100)): boolean => rolo <= chanceLesao(energia);
/** Grupo de treino (0-based) pela ENR: o primeiro grupo cujo limiar a Energia alcanca; sem nenhum, o ultimo grupo desbloqueado. `limiares` em ordem decrescente (G1 >= limiares[0], G2 >= limiares[1]...). */
export const grupoPorEnergia = (energia: number, limiares: number[], nGrupos: number): number => {
  for (let i = 0; i < nGrupos - 1; i++) if (energia >= (limiares[i] ?? 0)) return i;
  return Math.max(0, nGrupos - 1);
};

/**
 * Chance (%) de lesao por SESSAO DE TREINO (so o treino; o jogo usa `chanceLesao`): 0.2% com Energia >= 25%, 0.6% abaixo. Com 1%/3% por sessao (4 sessoes/dia, ~25 jogadores, mais os clubes da CPU)
 * saia uma lesao muscular por dia em cada elenco. Agora: ~0.8%/dia por jogador no maximo, ~uma por elenco a cada 5 dias de treino pesado.
 */
export const chanceLesaoTreino = (energia: number): number => (energia < 25 ? 0.6 : 0.2);
/** Rola o dado de lesao do treino (decimal 0-100). `rolo` e injetavel para os testes. */
export const rolouLesaoTreino = (energia: number, rolo: number = Math.random() * 100): boolean => rolo < chanceLesaoTreino(energia);
/** Sessoes que nao disparam o rolo de lesao: Recovery e as que so mexem em Chemistry/Moral (Analysis, Team Dinner). */
export const sessaoRolaLesao = (actId: string): boolean => {
  if (actId === 'recovery') return false;
  const act = ACTIVITIES.find(a => a.id === actId);
  if (!act || act.impacts.some(i => i.label === 'CHE')) return false;
  return (ENERGY_COST_BASE[actId] ?? 0) > 0;
};

/** Regressao por idade no fim da temporada (idade INTEIRA): niveis perdidos por categoria. TEC/TAC/MEN/FIS aplicam-se a cada atributo do grupo (FIS sem a stamina); a stamina e a parte. */
export const regressaoPorIdade = (idade: number): { FIS: number; STAMINA: number; TEC: number; TAC: number; MEN: number } => {
  if (idade >= 35) return { FIS: 5, STAMINA: 4, TEC: 2, TAC: 1, MEN: 1 };
  if (idade >= 32) return { FIS: 3, STAMINA: 2, TEC: 1, TAC: 0, MEN: 0 };
  if (idade >= 30) return { FIS: 1, STAMINA: 1, TEC: 0, TAC: 0, MEN: 0 };
  return { FIS: 0, STAMINA: 0, TEC: 0, TAC: 0, MEN: 0 };
};


/** Drain multiplier based on player stamina. Higher stamina = lower drain. Formula: 100 / stamina. */
export const drainMultiplier = (stamina: number): number => {
  return 100 / Math.max(50, Math.min(100, stamina));
};

/** Custo base de energia (0-100%) por sessao de treino, antes do multiplicador de stamina. Tabela canonica = plano 2026-01-07-energy-matchform-system.md (Task 4).
 *  'recovery' e negativo: devolve -recovery (= +8) por periodo (4 periodos = +32/dia), fixo, sem multiplicador. Periodo vazio devolve o mesmo (ENERGIA_POR_PERIODO_LIVRE). */
export const ENERGY_COST_BASE: Record<string, number> = {
  passing: 2, longpass: 2, control: 2, wingplay: 3, crossing: 2, shooting: 2, longshots: 3, finishing: 3, volleys: 3, aerial: 3, setpieces: 2, penalties: 2,
  tackling: 3, sliding: 4, marking: 3, def_pos: 2, positioning: 2, vision: 3, pressing: 4, playmaking: 3, transition: 3,
  cardio: 4, sprints: 4, acceleration: 4, agility: 3, jumping: 3, strength: 4, balance: 3,
  recovery: -8,
  aggression: 2, reactions: 2, composure: 2, consistency: 2, video: 2, teambuilding: 2, shadow: 2, focus: 2,
  individual: 3
};

/** Energia devolvida por um periodo vazio ou uma sessao 'recovery' (por periodo, 4 periodos/dia). */
export const ENERGIA_POR_PERIODO_LIVRE = -ENERGY_COST_BASE.recovery;
/** Energia devolvida por um slot SEM treino (por periodo): metade da de uma sessao 'recovery' (ENERGIA_POR_PERIODO_LIVRE). */
export const ENERGIA_SLOT_VAZIO = 4;

/** TAC XP multiplier based on match rating. Rating 8.0 = 1.2x, rating 4.0 = 0.5x, neutral 6.0 = 1.0x. */
export const ratingToTacMultiplier = (rating: number): number => {
  if (rating <= 4) return 0.3 + (rating / 4) * 0.2;
  if (rating <= 6) return 0.5 + ((rating - 4) / 2) * 0.5;
  if (rating <= 8) return 1.0 + ((rating - 6) / 2) * 0.2;
  return 1.2 + ((rating - 8) / 2) * 0.1;
};

/** Pontos (x XP_POR_PONTO = XP) de treino base em tacticalAwa (Player.treino3d) ganhos por partida, escalados por ratingToTacMultiplier(nota). Nota 8.0 = +6, nota 4.0 = +2.5. */
export const BASE_TAC_XP = 5;

/** Bonus TAC pos-jogo (pontos de treino em tacticalAwa) para uma nota 0-10. */
export const tacBonusDaNota = (nota: number): number => BASE_TAC_XP * ratingToTacMultiplier(nota);

export interface Impact {
  label: string;
  value: number;
  /** Nome do atributo do 3D (ou Morale/Chemistry) que o treino mexe; e o que o cartao mostra no lugar do grupo. */
  skill?: string;
  /** Atributo do 3D (id do campo, ex.: 'headAccurancy') que ganha `value` pontos (label 'SKL'); PONTOS_POR_ATRIBUTO pontos = +1 no atributo. */
  campo?: string;
}

export interface TrainingActivity {
  id: string;
  name: string;
  category: 'TECHNIQUE' | 'TACTICS' | 'PHYSICAL' | 'MENTAL';
  icon: string;
  impacts: Impact[];
}

export const ACTIVITIES: TrainingActivity[] = [
  { id: 'passing', name: 'Passing', category: 'TECHNIQUE', icon: '🔄', impacts: [{ label: 'PAS', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'passing' }, { label: 'ENR', value: -ENERGY_COST_BASE.passing }] },
  { id: 'longpass', name: 'Long Passing', category: 'TECHNIQUE', icon: '📡', impacts: [{ label: 'PAS', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'longPassing' }, { label: 'ENR', value: -ENERGY_COST_BASE.longpass }] },
  { id: 'control', name: 'Ball Control', category: 'TECHNIQUE', icon: '⚽', impacts: [{ label: 'DRB', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'ballControl' }, { label: 'ENR', value: -ENERGY_COST_BASE.control }] },
  { id: 'wingplay', name: 'Dribbling', category: 'TECHNIQUE', icon: '🏃', impacts: [{ label: 'DRB', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'dribbling' }, { label: 'ENR', value: -ENERGY_COST_BASE.wingplay }] },
  { id: 'crossing', name: 'Crossing', category: 'TECHNIQUE', icon: '⤴️', impacts: [{ label: 'PAS', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'crossing' }, { label: 'ENR', value: -ENERGY_COST_BASE.crossing }] },
  { id: 'shooting', name: 'Shot Power', category: 'TECHNIQUE', icon: '🎯', impacts: [{ label: 'SHT', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'shotPower' }, { label: 'ENR', value: -ENERGY_COST_BASE.shooting }] },
  { id: 'longshots', name: 'Long Shots', category: 'TECHNIQUE', icon: '🌠', impacts: [{ label: 'SHT', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'longShots' }, { label: 'ENR', value: -ENERGY_COST_BASE.longshots }] },
  { id: 'finishing', name: '1v1 Finish', category: 'TECHNIQUE', icon: '🥅', impacts: [{ label: 'SHT', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'finishing' }, { label: 'ENR', value: -ENERGY_COST_BASE.finishing }] },
  { id: 'volleys', name: 'Volleys', category: 'TECHNIQUE', icon: '🦵', impacts: [{ label: 'SHT', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'volleys' }, { label: 'ENR', value: -ENERGY_COST_BASE.volleys }] },
  { id: 'aerial', name: 'Aerial Duels', category: 'TECHNIQUE', icon: '✈️', impacts: [{ label: 'SHT', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'headAccurancy' }, { label: 'ENR', value: -ENERGY_COST_BASE.aerial }] },
  { id: 'setpieces', name: 'Set Pieces', category: 'TECHNIQUE', icon: '🚩', impacts: [{ label: 'SHT', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'freekicks' }, { label: 'SKL', value: 1.0, campo: 'cornerKicks' }, { label: 'ENR', value: -ENERGY_COST_BASE.setpieces }] },
  { id: 'penalties', name: 'Penalties', category: 'TECHNIQUE', icon: '⚪', impacts: [{ label: 'SHT', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'penalties' }, { label: 'ENR', value: -ENERGY_COST_BASE.penalties }] },
  { id: 'tackling', name: 'Tackling', category: 'TACTICS', icon: '👟', impacts: [{ label: 'DEF', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'tackleStanding' }, { label: 'ENR', value: -ENERGY_COST_BASE.tackling }] },
  { id: 'sliding', name: 'Sliding Tackle', category: 'TACTICS', icon: '🛷', impacts: [{ label: 'DEF', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'tackleSliding' }, { label: 'ENR', value: -ENERGY_COST_BASE.sliding }] },
  { id: 'marking', name: 'Man Marking', category: 'TACTICS', icon: '🛡️', impacts: [{ label: 'DEF', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'manMarking' }, { label: 'ENR', value: -ENERGY_COST_BASE.marking }] },
  { id: 'def_pos', name: 'Def. Shape', category: 'TACTICS', icon: '🧱', impacts: [{ label: 'DEF', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'posDefense' }, { label: 'MOR', value: 5, skill: 'Morale' }, { label: 'ENR', value: -ENERGY_COST_BASE.def_pos }] },
  { id: 'positioning', name: 'Att. Positioning', category: 'TACTICS', icon: '📍', impacts: [{ label: 'DEF', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'posOffense' }, { label: 'ENR', value: -ENERGY_COST_BASE.positioning }] },
  { id: 'vision', name: 'Vision', category: 'TACTICS', icon: '👁️', impacts: [{ label: 'DEF', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'vision' }, { label: 'ENR', value: -ENERGY_COST_BASE.vision }] },
  { id: 'pressing', name: 'Pressing', category: 'TACTICS', icon: '😤', impacts: [{ label: 'DEF', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'tacticalAwa' }, { label: 'ENR', value: -ENERGY_COST_BASE.pressing }] },
  { id: 'playmaking', name: 'Playmaking', category: 'TACTICS', icon: '🧠', impacts: [{ label: 'DEF', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'tacticalAwa' }, { label: 'ENR', value: -ENERGY_COST_BASE.playmaking }] },
  // TREINO INDIVIDUAL: cada jogador treina os atributos que escolheu no overview dele (ver `atributosIndividuais`, atributos3d.ts): +1 em cada um, -3 ENR. Nao tem `campo`: o ganho e por jogador (GameContext.advanceDay).
  { id: 'individual', name: 'Individual', category: 'TACTICS', icon: '🎯', impacts: [{ label: 'IND', value: 1.0, skill: 'Selected' }, { label: 'ENR', value: -ENERGY_COST_BASE.individual }] },
  { id: 'transition', name: 'Transitions', category: 'TACTICS', icon: '🔀', impacts: [{ label: 'DEF', value: 1.0 }, { label: 'SKL', value: 1.0, campo: 'tacticalAwa' }, { label: 'ENR', value: -ENERGY_COST_BASE.transition }] },
  { id: 'cardio', name: 'Cardio', category: 'PHYSICAL', icon: '🫁', impacts: [{ label: 'SKL', value: 2.0, campo: 'stamina' }, { label: 'ENR', value: -ENERGY_COST_BASE.cardio }] },
  { id: 'sprints', name: 'Sprints', category: 'PHYSICAL', icon: '⚡', impacts: [{ label: 'SKL', value: 1.0, campo: 'speed' }, { label: 'ENR', value: -ENERGY_COST_BASE.sprints }] },
  { id: 'acceleration', name: 'Acceleration', category: 'PHYSICAL', icon: '🚀', impacts: [{ label: 'SKL', value: 1.0, campo: 'acceleration' }, { label: 'ENR', value: -ENERGY_COST_BASE.acceleration }] },
  { id: 'agility', name: 'Agility', category: 'PHYSICAL', icon: '🤸', impacts: [{ label: 'SKL', value: 1.0, campo: 'agility' }, { label: 'ENR', value: -ENERGY_COST_BASE.agility }] },
  { id: 'jumping', name: 'Jumping', category: 'PHYSICAL', icon: '🦘', impacts: [{ label: 'SKL', value: 1.0, campo: 'jumping' }, { label: 'ENR', value: -ENERGY_COST_BASE.jumping }] },
  { id: 'strength', name: 'Gym Work', category: 'PHYSICAL', icon: '🏋️', impacts: [{ label: 'SKL', value: 1.5, campo: 'strength' }, { label: 'ENR', value: -ENERGY_COST_BASE.strength }] },
  { id: 'balance', name: 'Balance', category: 'PHYSICAL', icon: '⚖️', impacts: [{ label: 'SKL', value: 1.5, campo: 'balance' }, { label: 'ENR', value: -ENERGY_COST_BASE.balance }] },
  { id: 'recovery', name: 'Recovery', category: 'PHYSICAL', icon: '🩹', impacts: [{ label: 'ENR', value: ENERGIA_POR_PERIODO_LIVRE }, { label: 'MOR', value: 1.0, skill: 'Morale' }] },
  { id: 'aggression', name: 'Aggression', category: 'MENTAL', icon: '💢', impacts: [{ label: 'SKL', value: 1.0, campo: 'aggression' }, { label: 'ENR', value: -ENERGY_COST_BASE.aggression }] },
  { id: 'reactions', name: 'Reactions', category: 'MENTAL', icon: '⏱️', impacts: [{ label: 'SKL', value: 1.0, campo: 'reactions' }, { label: 'ENR', value: -ENERGY_COST_BASE.reactions }] },
  { id: 'composure', name: 'Composure', category: 'MENTAL', icon: '😌', impacts: [{ label: 'SKL', value: 1.0, campo: 'composure' }, { label: 'ENR', value: -ENERGY_COST_BASE.composure }] },
  { id: 'consistency', name: 'Consistency', category: 'MENTAL', icon: '📈', impacts: [{ label: 'SKL', value: 1.0, campo: 'consistency' }, { label: 'ENR', value: -ENERGY_COST_BASE.consistency }] },
  { id: 'video', name: 'Analysis', category: 'MENTAL', icon: '📺', impacts: [{ label: 'CHE', value: 0.5, skill: 'Chemistry' }, { label: 'ENR', value: -ENERGY_COST_BASE.video }] },
  { id: 'teambuilding', name: 'Team Dinner', category: 'MENTAL', icon: '🍽️', impacts: [{ label: 'CHE', value: 0.5, skill: 'Chemistry' }, { label: 'MOR', value: 2.0, skill: 'Morale' }, { label: 'ENR', value: -ENERGY_COST_BASE.teambuilding }] },
  { id: 'shadow', name: 'Shadow Play', category: 'MENTAL', icon: '👥', impacts: [{ label: 'MOR', value: 1.0, skill: 'Morale' }, { label: 'ENR', value: -ENERGY_COST_BASE.shadow }] },
  { id: 'focus', name: 'Mental Focus', category: 'MENTAL', icon: '🧘', impacts: [{ label: 'MOR', value: 2.0, skill: 'Morale' }, { label: 'ENR', value: -ENERGY_COST_BASE.focus }] },
];

// =====================================================================
// TREINO DA CPU — antes os times da CPU nao treinavam: recuperavam +15 de energia por dia, sempre, e o elenco nunca evoluia.
// Agora o treinador da CPU gere a semana: descansa na vespera do jogo e quando o grupo esta cansado (media < 82), e nos outros dias treina (recupera menos e
// acumula pontos nos atributos da posicao, mais depressa nos jovens e nada nos veteranos), como o treino do utilizador.
// =====================================================================
import type { Player } from '../types';

export const cpuPlanoDoDia = (elenco: Player[], diasParaOJogo: number): { recuperacao: number; treina: boolean } => {
  const aptos = elenco.filter(p => !p.injury);
  const media = aptos.length ? aptos.reduce((s, p) => s + (p.energia ?? 100), 0) / aptos.length : 100;
  const mediaEnergia = aptos.length ? aptos.reduce((s, p) => s + (p.energia ?? 100), 0) / aptos.length : 100;
  // Folga do time na vespera do jogo (e no proprio dia) ou com o grupo cansado. A folga do dia seguinte e so de quem jogou (ver GameContext.advanceDay).
  const descansa = diasParaOJogo <= 1 || media < 82 || mediaEnergia < 30;
  // Escala nova (Task 4): descanso = 4 periodos livres (+32/dia); dia de treino = +10 liquido (o utilizador com 2 sessoes + 2 livres fica ~+20).
  return { recuperacao: descansa ? 4 * ENERGIA_POR_PERIODO_LIVRE : 10, treina: !descansa };
};

/*
O TREINO DA CPU USA AS MESMAS ATIVIDADES DO UTILIZADOR (`ACTIVITIES`), nas mesmas regras: cada posicao tem 10 atributos do 3D que o treinador da CPU trabalha (`FOCO_CPU_POR_POSICAO`) e as atividades que
treinam algum deles sao as dela (`atividadesDaPosicao`). Num dia de treino a CPU faz `SLOTS_CPU_POR_DIA` sessoes e cada uma sorteia UMA atividade dessa lista. Cada sessao:
- da XP a TODOS os atributos que a atividade treina (chip SKL): `XP_POR_PONTO x valor x idade x estrelas x exaustao` (a exaustao e a da Energia do inicio do dia, como a do utilizador);
- soma os chips DEF/PAS/DRB/SHT ao cofre dos quatro atributos agregados (com o teto do CT e de crescimento);
- gasta Energia: custo base x (100 / Stamina), e rola o risco de lesao (so sessoes pesadas, com a Energia no inicio da sessao) — quem chama aplica as duas coisas com o que `cpuAplicarTreino` devolve.
O custo do nivel, o teto de crescimento (folga) e o teto do CT sao os de sempre: a CPU nao treina mais barato.
*/
export const SLOTS_CPU_POR_DIA = 3;
/*
O TREINADOR DA CPU DECIDE JOGADOR A JOGADOR, pela Energia de cada um (`cpuPlanoDoJogador`): com `LIMIAR_TREINO_CPU` (70) ou mais treina de verdade (`SLOTS_CPU_POR_DIA` sessoes); de `LIMIAR_LEVE_CPU` (45) a
69 faz so um treino leve (`SLOTS_CPU_LEVE` sessao, de atividade barata); abaixo de 45 descansa. Na vespera e no dia do jogo todos descansam, e quem jogou ontem folga hoje. Assim, no mesmo dia, um grupo do
elenco (os descansados) treina e o outro (os cansados) fica de descanso ou treino leve.
*/
export const LIMIAR_TREINO_CPU = 70;
export const LIMIAR_LEVE_CPU = 45;
export const SLOTS_CPU_LEVE = 1;
export type PlanoCpu = 'treino' | 'leve' | 'descanso';
export const cpuPlanoDoJogador = (energia: number, diasParaOJogo: number, jogouOntem: boolean): PlanoCpu => {
  if (diasParaOJogo <= 1 || jogouOntem) return 'descanso';
  if (energia >= LIMIAR_TREINO_CPU) return 'treino';
  if (energia >= LIMIAR_LEVE_CPU) return 'leve';
  return 'descanso';
};
export const FOCO_CPU_POR_POSICAO: Record<string, string[]> = {
  GK: ['reactions', 'composure', 'consistency', 'posDefense', 'jumping', 'agility', 'tacticalAwa', 'balance', 'strength', 'speed'],
  CB: ['tackleStanding', 'tackleSliding', 'manMarking', 'posDefense', 'headAccurancy', 'strength', 'jumping', 'aggression', 'tacticalAwa', 'balance'],
  LB: ['tackleStanding', 'manMarking', 'posDefense', 'crossing', 'speed', 'acceleration', 'stamina', 'passing', 'ballControl', 'agility'],
  RB: ['tackleStanding', 'manMarking', 'posDefense', 'crossing', 'speed', 'acceleration', 'stamina', 'passing', 'ballControl', 'agility'],
  DM: ['tackleStanding', 'manMarking', 'posDefense', 'passing', 'longPassing', 'vision', 'tacticalAwa', 'stamina', 'strength', 'aggression'],
  CM: ['passing', 'longPassing', 'ballControl', 'vision', 'tacticalAwa', 'stamina', 'longShots', 'posOffense', 'composure', 'dribbling'],
  LM: ['crossing', 'dribbling', 'ballControl', 'speed', 'acceleration', 'passing', 'agility', 'stamina', 'finishing', 'vision'],
  RM: ['crossing', 'dribbling', 'ballControl', 'speed', 'acceleration', 'passing', 'agility', 'stamina', 'finishing', 'vision'],
  LW: ['crossing', 'dribbling', 'ballControl', 'speed', 'acceleration', 'agility', 'finishing', 'passing', 'vision', 'posOffense'],
  RW: ['crossing', 'dribbling', 'ballControl', 'speed', 'acceleration', 'agility', 'finishing', 'passing', 'vision', 'posOffense'],
  AM: ['passing', 'vision', 'dribbling', 'ballControl', 'longShots', 'finishing', 'posOffense', 'composure', 'longPassing', 'reactions'],
  SS: ['finishing', 'shotPower', 'dribbling', 'posOffense', 'ballControl', 'composure', 'acceleration', 'volleys', 'passing', 'agility'],
  ST: ['finishing', 'shotPower', 'headAccurancy', 'posOffense', 'volleys', 'ballControl', 'composure', 'strength', 'acceleration', 'jumping']
};
const FOCO_CPU_PADRAO = ['passing', 'ballControl', 'stamina', 'reactions', 'vision', 'composure', 'strength', 'speed', 'tacticalAwa', 'dribbling'];
const atividadesPorPosicao = new Map<string, TrainingActivity[]>();
/** As atividades que treinam algum dos 10 atributos da posicao. */
export const atividadesDaPosicao = (pos: string): TrainingActivity[] => {
  let r = atividadesPorPosicao.get(pos);
  if (!r) {
    const foco = new Set(FOCO_CPU_POR_POSICAO[pos] || FOCO_CPU_PADRAO);
    r = ACTIVITIES.filter(a => a.impacts.some(i => i.label === 'SKL' && !!i.campo && foco.has(i.campo)) && sessaoRolaLesao(a.id));
    atividadesPorPosicao.set(pos, r);
  }
  return r;
};

const atividadesLevesPorPosicao = new Map<string, TrainingActivity[]>();
/** As atividades baratas da posicao (custo base ate 2); se nenhuma, a mais barata. */
export const atividadesLevesDaPosicao = (pos: string): TrainingActivity[] => {
  let r = atividadesLevesPorPosicao.get(pos);
  if (!r) {
    const todas = atividadesDaPosicao(pos);
    r = todas.filter(a => (ENERGY_COST_BASE[a.id] ?? 0) <= 2);
    if (!r.length && todas.length) { const min = Math.min(...todas.map(a => ENERGY_COST_BASE[a.id] ?? 0)); r = todas.filter(a => (ENERGY_COST_BASE[a.id] ?? 0) === min); }
    atividadesLevesPorPosicao.set(pos, r);
  }
  return r;
};

/** O que um dia de treino da CPU custou: a Energia gasta e a Energia no inicio de cada sessao que rola risco de lesao. */
export interface TreinoCpuDia { custoEnergia: number; riscos: number[]; }

/**
 * Um dia de treino de um jogador da CPU, pelas atividades do utilizador (ver acima). Muda o proprio objecto (treino3d e cofres dos quatro atributos). `stamina` (do 3D) da o custo real de Energia;
 * sem ela vale 70. `leve`: so uma sessao, de atividade barata. Devolve a Energia gasta e as Energias de risco para quem chama gastar e rolar a lesao.
 */
export const cpuAplicarTreino = (p: Player, opts: { stamina?: number; rnd?: () => number; leve?: boolean; individualDe?: () => string[] } = {}): TreinoCpuDia => {
  const r: TreinoCpuDia = { custoEnergia: 0, riscos: [] };
  if (p.injury) return r;
  // O mesmo fator de idade do utilizador (GameContext.advanceDay): < 22 anos 1.5, 22-32 1.0, acima de 32 0.5.
  const fator = p.age < 22 ? 1.5 : (p.age > 32 ? 0.5 : 1.0);
  const rnd = opts.rnd || Math.random;
  const pos = String(p.position);
  const starsMult = STAR_MULTIPLIERS[starsFromPotential(p.potential)];
  const energiaInicio = p.energia ?? 100;
  const exaust = exaustaoMultiplier(energiaInicio);
  const drain = drainMultiplier(opts.stamina ?? 70);
  const lista = opts.leve ? atividadesLevesDaPosicao(pos) : atividadesDaPosicao(pos);
  if (!lista.length) return r;
  const t3 = p.treino3d || (p.treino3d = {});
  p.treinoEmXp = true;
  const acc = p.trainingAccumulated || (p.trainingAccumulated = { def: 0, pas: 0, drb: 0, sht: 0 } as any);
  garantirBaseLegacy(p);
  const soCt = p.age < 22;   // jovem da CPU: so o CT limita os quatro atributos agregados; a partir dos 22 volta o `base + folga + margem`
  let energia = energiaInicio;
  let sessoes = opts.leve ? SLOTS_CPU_LEVE : SLOTS_CPU_POR_DIA;
  // TREINO INDIVIDUAL da CPU (a atividade `individual` do utilizador): num dia de treino de verdade, metade das vezes (~2 por semana, o limite do utilizador) uma das sessoes e individual.
  // O GOLEIRO faz o individual todos os dias de treino: e a unica sessao que treina os atributos de baliza (nao ha atividade deles).
  const individual = (!opts.leve && opts.individualDe && (pos === 'GK' || rnd() < 0.5)) ? opts.individualDe() : null;
  if (individual && individual.length) sessoes -= 1;
  for (let i = 0; i < sessoes; i++) {
    const act = lista[Math.min(lista.length - 1, Math.floor(rnd() * lista.length))];
    const custo = (ENERGY_COST_BASE[act.id] ?? 0) * drain;
    r.riscos.push(energia);
    energia = Math.max(0, energia - custo);
    r.custoEnergia += custo;
    for (const imp of act.impacts) {
      if (imp.label === 'SKL' && imp.campo) t3[imp.campo] = (t3[imp.campo] || 0) + XP_POR_PONTO * imp.value * fator * starsMult * exaust;
      const k = imp.label === 'DEF' ? 'def' : imp.label === 'PAS' ? 'pas' : imp.label === 'DRB' ? 'drb' : imp.label === 'SHT' ? 'sht' : null;
      if (!k) continue;
      if ((p as any)[k] >= tetoDoLegacy(p, k, soCt)) { (acc as any)[k] = Math.min((acc as any)[k], 99); continue; }
      (acc as any)[k] += imp.value * fator * starsMult * exaust;
      while ((acc as any)[k] >= 100) {
        (acc as any)[k] -= 100; (p as any)[k] = Math.min(99, (p as any)[k] + 1);
        if ((p as any)[k] >= tetoDoLegacy(p, k, soCt)) { (acc as any)[k] = 0; break; }
      }
    }
  }
  if (individual && individual.length) {
    // +1 (x10 XP) em cada atributo escolhido (os mais importantes da posicao), -3 ENR x 100/Stamina, com o risco de lesao da sessao pesada.
    r.riscos.push(energia);
    r.custoEnergia += (ENERGY_COST_BASE.individual ?? 0) * drain;
    for (const campo of individual) t3[campo] = (t3[campo] || 0) + XP_POR_PONTO * 1.0 * fator * starsMult * exaust;
  }
  return r;
};
