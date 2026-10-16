import { Team, Player, Fixture, Position } from '../types';

export enum BehaviorStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  RUNNING = 'RUNNING'
}

export type TeamTendency = 
  | 'ATTACK_LEFT' 
  | 'ATTACK_RIGHT' 
  | 'DEFEND_CENTER' 
  | 'COUNTER_ATTACK' 
  | 'PRESS_HIGH' 
  | 'PASS_WASTE_TIME'
  | 'STANDARD';

export type TeamState = 'ATTACK' | 'OFFENSIVE_TRANSITION' | 'DEFENSE' | 'DEFENSIVE_TRANSITION';

export interface TacticalRoleData {
  supportRole?: 'support1' | 'support2' | 'thirdMan' | 'amplitude' | 'CB_squeeze' | 'none';
  pressRole?: 'presser' | 'coverShadow' | 'interceptor' | 'none';
  markingTarget?: string; // e.g. 'away-9'
  desiredPosition: { x: number; y: number };
}

export interface BTContext {
  tacticalRoles: Record<string, TacticalRoleData>;
  gameState: any;
  match: Fixture;
  homeTeam: Team;
  awayTeam: Team;
  players: Player[];
  playerPositions: Record<string, { x: number; y: number }>;
  possession: 'home' | 'away';
  carrierIdx: number;
  ballGrid: { x: number; y: number };
  offsideLines: { homeDefense: number; awayDefense: number };
  t: (key: string) => string;
  
  // Input/Output coletivos
  teamTendencies: Record<'home' | 'away', TeamTendency>;
  teamStates: Record<'home' | 'away', TeamState>;
  teamMetrics: Record<'home' | 'away', {
    teamDepth: number;
    teamWidth: number;
    pressingLine: number;
    compactness: number;
  }>;
  stateTimers: Record<'home' | 'away', number>;
  homePossessionCount: number;
  awayPossessionCount: number;
  
  // Cooldowns
  shotCooldown: number;
  tackleCooldown: number;
  gkHoldCooldown: number;
  
  // Variáveis auxiliares de tick individual
  activePlayerKey?: string; // e.g., 'home-4'
  
  // Decisões tomadas na rodada (Saída da BT)
  playerTargets: Record<string, { x: number; y: number; speed: number }>;
  proposedAction?: {
    type: 'PASS' | 'SHOOT' | 'SAVE' | 'GK_HOLD' | 'TACKLE';
    playerId?: string;
    target?: { x: number; y: number };
    targetIdx?: number;
    duration?: number;
    label?: string;
  };
}

export abstract class BTNode {
  abstract tick(context: BTContext): BehaviorStatus;
}

// === COMPOSITE NODES ===

export class Selector extends BTNode {
  constructor(public children: BTNode[]) {
    super();
  }
  tick(context: BTContext): BehaviorStatus {
    for (const child of this.children) {
      const status = child.tick(context);
      if (status !== BehaviorStatus.FAILURE) {
        return status;
      }
    }
    return BehaviorStatus.FAILURE;
  }
}

export class Sequence extends BTNode {
  constructor(public children: BTNode[]) {
    super();
  }
  tick(context: BTContext): BehaviorStatus {
    for (const child of this.children) {
      const status = child.tick(context);
      if (status !== BehaviorStatus.SUCCESS) {
        return status;
      }
    }
    return BehaviorStatus.SUCCESS;
  }
}

// === CONDITIONAL NODES ===

export class ConditionNode extends BTNode {
  constructor(private predicate: (context: BTContext) => boolean) {
    super();
  }
  tick(context: BTContext): BehaviorStatus {
    return this.predicate(context) ? BehaviorStatus.SUCCESS : BehaviorStatus.FAILURE;
  }
}

// === ACTION NODES ===

export class ActionNode extends BTNode {
  constructor(private action: (context: BTContext) => BehaviorStatus) {
    super();
  }
  tick(context: BTContext): BehaviorStatus {
    return this.action(context);
  }
}

// === FOOTBALL HELPERS ===

export const getDistance = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
};

export const getRoleForFormation = (formation: string, index: number): string => {
  if (index === 0) return 'GK';
  const maps: Record<string, string[]> = {
    '4-4-2':     ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'],
    '4-3-3':     ['GK', 'LB', 'CB', 'CB', 'RB', 'DM', 'CM', 'CM', 'LW', 'ST', 'RW'],
    '4-3-3 ATA': ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'AM', 'LW', 'ST', 'RW'],
    '3-5-2':     ['GK', 'CB', 'CB', 'CB', 'LM', 'DM', 'DM', 'RM', 'AM', 'ST', 'ST'],
    '5-4-1':     ['GK', 'LB', 'CB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST'],
    '4-2-3-1':   ['GK', 'LB', 'CB', 'CB', 'RB', 'DM', 'DM', 'LW', 'AM', 'RW', 'ST'],
    '5-3-2':     ['GK', 'LB', 'CB', 'CB', 'CB', 'RB', 'DM', 'CM', 'CM', 'ST', 'ST'],
  };
  const map = maps[formation] || maps['4-4-2'];
  return map[index] || 'CM';
};

export const getSectorForRole = (role: string): 'GK' | 'DEF' | 'MID' | 'ATK' => {
  if (role === 'GK') return 'GK';
  if (['LB', 'CB', 'RB'].includes(role)) return 'DEF';
  if (['LW', 'RW', 'SS', 'ST'].includes(role)) return 'ATK';
  return 'MID';
};

export const FORMATION_GRIDS: Record<string, { x: number, y: number }[]> = {
  '4-4-2': [{x:0.5,y:5}, {x:3,y:1.5}, {x:3,y:4}, {x:3,y:6}, {x:3,y:8.5}, {x:6,y:1.5}, {x:6,y:4}, {x:6,y:6}, {x:6,y:8.5}, {x:9,y:3.5}, {x:9,y:6.5}],
  '4-3-3': [{x:0.5,y:5}, {x:3,y:1.5}, {x:3,y:4}, {x:3,y:6}, {x:3,y:8.5}, {x:5,y:5}, {x:7,y:3}, {x:7,y:7}, {x:9,y:1.5}, {x:9,y:5}, {x:9,y:8.5}],
  '4-3-3 ATA': [{x:0.5,y:5}, {x:3,y:1.5}, {x:3,y:4}, {x:3,y:6}, {x:3,y:8.5}, {x:6,y:3}, {x:6,y:7}, {x:7.5,y:5}, {x:9,y:1.5}, {x:9,y:5}, {x:9,y:8.5}],
  '3-5-2': [{x:0.5,y:5}, {x:3,y:3}, {x:3,y:5}, {x:3,y:7}, {x:5,y:1.5}, {x:5,y:4}, {x:5,y:6}, {x:5,y:8.5}, {x:7,y:5}, {x:9,y:4}, {x:9,y:6}],
  '5-4-1': [{x:0.5,y:5}, {x:3,y:1}, {x:3,y:3}, {x:3,y:5}, {x:3,y:7}, {x:3,y:9}, {x:6,y:2}, {x:6,y:4}, {x:6,y:6}, {x:6,y:8}, {x:9,y:5}],
  '4-2-3-1': [{x:0.5,y:5}, {x:3,y:1.5}, {x:3,y:4}, {x:3,y:6}, {x:3,y:8.5}, {x:5,y:4}, {x:5,y:6}, {x:8,y:2}, {x:8,y:5}, {x:8,y:8}, {x:9,y:5}],
  '5-3-2': [{x:0.5,y:5}, {x:3,y:1.5}, {x:3,y:3.5}, {x:3,y:5}, {x:3,y:6.5}, {x:3,y:8.5}, {x:6,y:3}, {x:5,y:5}, {x:6,y:7}, {x:9,y:4}, {x:9,y:6}],
};

const SCALE_X = (26 / 19) * 0.85; 
const SCALE_Y = 18 / 10;
const FIELD_WIDTH = 26;

export const getBaseFormationPos = (team: Team, idx: number, side: 'home' | 'away') => {
  const grid = FORMATION_GRIDS[team.tactics.formation] || FORMATION_GRIDS['4-4-2'];
  const p = grid[idx] || { x: 5, y: 5 };
  const cx = p.x * SCALE_X;
  const cy = p.y * SCALE_Y;
  const finalX = side === 'home' ? cx : FIELD_WIDTH - cx;
  return { x: finalX, y: cy };
};

const isLineOfSightFree = (from: { x: number; y: number }, to: { x: number; y: number }, currentPositions: Record<string, { x: number; y: number }>, side: string) => {
  const opponents = Object.entries(currentPositions)
    .filter(([k]) => !k.startsWith(side))
    .map(([_, v]) => v);
    
  for (const opp of opponents) {
    const dx = to.x - from.x, dy = to.y - from.y;
    const lineLenSq = dx * dx + dy * dy;
    if (lineLenSq < 0.01) continue;
    const distToLine = Math.abs(dy * opp.x - dx * opp.y + to.x * from.y - to.y * from.x) / Math.sqrt(lineLenSq);
    const isBetween = Math.min(from.x, to.x) <= opp.x && opp.x <= Math.max(from.x, to.x) &&
                      Math.min(from.y, to.y) <= opp.y && opp.y <= Math.max(from.y, to.y);
    if (distToLine < 0.65 && isBetween) return false;
  }
  return true;
};

export const getAggressionModifiers = (aggression: string): number => {
  switch (aggression) {
    case 'Very Passive': return 0.2;
    case 'Passive': return 0.4;
    case 'Aggressive': return 0.7;
    case 'Very Aggressive': return 0.9;
    case 'Balanced':
    default: return 0.5;
  }
};

// === BUILD TEAM BT ===

export const buildTeamBT = (side: 'home' | 'away'): BTNode => {
  return new Sequence([
    // A) Determine State and Metrics
    new ActionNode(ctx => {
      const team = side === 'home' ? ctx.homeTeam : ctx.awayTeam;
      
      // Determine state based on possession
      let state: TeamState = 'DEFENSE';
      if (ctx.possession === side) {
        state = (ctx.stateTimers[side] < 60) ? 'OFFENSIVE_TRANSITION' : 'ATTACK';
      } else {
        state = (ctx.stateTimers[side] < 60) ? 'DEFENSIVE_TRANSITION' : 'DEFENSE';
      }
      ctx.teamStates[side] = state;

      // Map tactics style
      let styleDepth = 60;
      let stylePressure = 50;
      let styleWidth = 60;
      let styleCompactness = 65;

      switch (team.tactics.style) {
        case 'Very Defensive':
          styleDepth = 35; stylePressure = 20; styleWidth = 35; styleCompactness = 85;
          break;
        case 'Defensive':
          styleDepth = 45; stylePressure = 35; styleWidth = 45; styleCompactness = 75;
          break;
        case 'Balanced':
          styleDepth = 60; stylePressure = 50; styleWidth = 60; styleCompactness = 65;
          break;
        case 'Offensive':
          styleDepth = 75; stylePressure = 70; styleWidth = 70; styleCompactness = 60;
          break;
        case 'Very Offensive':
          styleDepth = 90; stylePressure = 90; styleWidth = 80; styleCompactness = 50;
          break;
      }

      // Blend tactics sliders (defensiveLine and pressure)
      const baseDepth = 0.4 * styleDepth + 0.6 * (team.tactics.defensiveLine ?? 50);
      const basePressure = 0.4 * stylePressure + 0.6 * (team.tactics.pressure ?? 50);
      const baseWidth = styleWidth;
      const baseCompactness = styleCompactness;

      // Adjust based on State
      let depth = baseDepth;
      let width = baseWidth;
      let compactness = baseCompactness;
      let pressingLine = basePressure;

      if (state === 'ATTACK') {
        depth = Math.min(100, baseDepth + 10);
        width = Math.min(100, baseWidth + 10);
        compactness = Math.max(30, baseCompactness - 10);
      } else if (state === 'OFFENSIVE_TRANSITION') {
        depth = Math.min(100, baseDepth + 5);
        width = Math.min(100, baseWidth + 5);
        compactness = Math.max(30, baseCompactness - 5);
      } else if (state === 'DEFENSE') {
        depth = Math.max(30, baseDepth - 10);
        width = Math.max(30, baseWidth - 10);
        compactness = Math.min(100, baseCompactness + 10);
        pressingLine = Math.max(20, basePressure - 5);
      } else if (state === 'DEFENSIVE_TRANSITION') {
        depth = Math.max(30, baseDepth - 5);
        width = Math.max(30, baseWidth - 5);
        compactness = Math.min(100, baseCompactness + 5);
        pressingLine = Math.min(100, basePressure + 10);
      }

      ctx.teamMetrics[side] = { teamDepth: depth, teamWidth: width, pressingLine, compactness };
      return BehaviorStatus.SUCCESS;
    }),
    // B) Determine Tendencies
    new Selector([
      // 1. Gastar tempo no final do jogo se estiver vencendo
      new Sequence([
        new ConditionNode(ctx => {
          const isHome = side === 'home';
          const scoreDiff = isHome 
            ? (ctx.match.homeScore || 0) - (ctx.match.awayScore || 0) 
            : (ctx.match.awayScore || 0) - (ctx.match.homeScore || 0);
          return scoreDiff > 0 && ctx.gameState.matchMinute >= 75;
        }),
        new ActionNode(ctx => {
          ctx.teamTendencies[side] = 'PASS_WASTE_TIME';
          return BehaviorStatus.SUCCESS;
        })
      ]),
      
      // 2. Pressão alta se estiver perdendo no final do jogo
      new Sequence([
        new ConditionNode(ctx => {
          const isHome = side === 'home';
          const scoreDiff = isHome 
            ? (ctx.match.homeScore || 0) - (ctx.match.awayScore || 0) 
            : (ctx.match.awayScore || 0) - (ctx.match.homeScore || 0);
          return scoreDiff < 0 && ctx.gameState.matchMinute >= 70;
        }),
        new ActionNode(ctx => {
          ctx.teamTendencies[side] = 'PRESS_HIGH';
          return BehaviorStatus.SUCCESS;
        })
      ]),
      
      // 3. Contra-ataque se acabou de recuperar a posse e o adversário está vulnerável
      new Sequence([
        new ConditionNode(ctx => {
          const currentPossessionCount = side === 'home' ? ctx.homePossessionCount : ctx.awayPossessionCount;
          const opponentPossessionCount = side === 'home' ? ctx.awayPossessionCount : ctx.homePossessionCount;
          return ctx.possession === side && currentPossessionCount < 8 && opponentPossessionCount > 12;
        }),
        new ActionNode(ctx => {
          ctx.teamTendencies[side] = 'COUNTER_ATTACK';
          return BehaviorStatus.SUCCESS;
        })
      ]),
      
      // 4. Tendências por foco tático (Ataque pelas laterais)
      new Sequence([
        new ConditionNode(ctx => {
          const team = side === 'home' ? ctx.homeTeam : ctx.awayTeam;
          return team.tactics.focusSectors?.length === 1 && team.tactics.focusSectors[0] === 'Left';
        }),
        new ActionNode(ctx => {
          ctx.teamTendencies[side] = 'ATTACK_LEFT';
          return BehaviorStatus.SUCCESS;
        })
      ]),
      
      new Sequence([
        new ConditionNode(ctx => {
          const team = side === 'home' ? ctx.homeTeam : ctx.awayTeam;
          return team.tactics.focusSectors?.length === 1 && team.tactics.focusSectors[0] === 'Right';
        }),
        new ActionNode(ctx => {
          ctx.teamTendencies[side] = 'ATTACK_RIGHT';
          return BehaviorStatus.SUCCESS;
        })
      ]),
      
      // 5. Defender pelo Centro (se o estilo for retranca)
      new Sequence([
        new ConditionNode(ctx => {
          const team = side === 'home' ? ctx.homeTeam : ctx.awayTeam;
          return team.tactics.style === 'Defensive' || team.tactics.style === 'Very Defensive';
        }),
        new ActionNode(ctx => {
          ctx.teamTendencies[side] = 'DEFEND_CENTER';
          return BehaviorStatus.SUCCESS;
        })
      ]),
      
      // 6. Tendência Padrão
      new ActionNode(ctx => {
        ctx.teamTendencies[side] = 'STANDARD';
        return BehaviorStatus.SUCCESS;
      })
    ])
  ]);
};

// === BUILD PLAYER BT ===

export const buildPlayerBT = (): BTNode => {
  return new Selector([
    // === RAMO 1: SE O JOGADOR TEM A BOLA ===
    new Sequence([
      new ConditionNode(ctx => {
        if (!ctx.activePlayerKey) return false;
        const [side, sIdx] = ctx.activePlayerKey.split('-');
        const idx = parseInt(sIdx);
        return ctx.possession === side && ctx.carrierIdx === idx;
      }),
      new Selector([
        // 1.1 CHUTE AO GOL
        new Sequence([
          new ConditionNode(ctx => {
            const [side, sIdx] = ctx.activePlayerKey!.split('-');
            const idx = parseInt(sIdx);
            if (idx === 0) return false; // Goleiro não chuta
            if (ctx.shotCooldown > 0) return false;
            
            const team = side === 'home' ? ctx.homeTeam : ctx.awayTeam;
            const tempoVal = team.tactics.tempo ?? 50; // Objetividade/Directness afeta a distância de chute
            
            const pos = ctx.playerPositions[ctx.activePlayerKey!];
            const goalX = side === 'home' ? 26.5 : -0.5;
            
            const shootDistanceThreshold = 5.5 + ((tempoVal - 50) / 100) * 3.0; 
            return Math.abs(goalX - pos.x) <= shootDistanceThreshold;
          }),
          new ActionNode(ctx => {
            const [side, sIdx] = ctx.activePlayerKey!.split('-');
            const idx = parseInt(sIdx);
            const team = side === 'home' ? ctx.homeTeam : ctx.awayTeam;
            const player = ctx.players.find(p => p.id === team.lineup[idx]);
            const opponentSide = side === 'home' ? 'away' : 'home';
            const opponentTeam = side === 'home' ? ctx.awayTeam : ctx.homeTeam;
            const opponentGK = ctx.players.find(p => p.id === opponentTeam.lineup[0]);

            const isGoal = (Math.random() * (player ? (player.skill + player.sht) / 2 : 50)) > (opponentGK?.skill || 50) * 0.65 + 10;
            const targetX = isGoal ? (side === 'home' ? 26.15 : -0.15) : (ctx.playerPositions[`${opponentSide}-0`]?.x || (opponentSide === 'home' ? 0.5 : 25.5));
            const targetY = isGoal ? 9 + (Math.random() - 0.5) : (ctx.playerPositions[`${opponentSide}-0`]?.y || 9.0);

            ctx.proposedAction = {
              type: 'SHOOT',
              playerId: player?.id,
              target: { x: targetX, y: targetY },
              label: isGoal ? ctx.t('ml_goal') : ctx.t('ml_save'),
              duration: 600
            };
            return BehaviorStatus.SUCCESS;
          })
        ]),

        // 1.2 PASSE
        new Sequence([
          new ConditionNode(ctx => {
            const [side, sIdx] = ctx.activePlayerKey!.split('-');
            const idx = parseInt(sIdx);
            if (idx === 0) return true; // Goleiro sempre tenta passar se tiver a bola
            
            const team = side === 'home' ? ctx.homeTeam : ctx.awayTeam;
            const tempoVal = team.tactics.tempo || 50; // Objetividade

            // Maior objetividade = menos tempo segurando a bola (passes mais rápidos)
            let passChance = (0.01 + (tempoVal / 100) * 0.15);
            return Math.random() < passChance;
          }),
          new ActionNode(ctx => {
            const [side, sIdx] = ctx.activePlayerKey!.split('-');
            const idx = parseInt(sIdx);
            const team = side === 'home' ? ctx.homeTeam : ctx.awayTeam;
            const carrierPos = ctx.playerPositions[ctx.activePlayerKey!];
            const dir = side === 'home' ? 1 : -1;
            const tendency = ctx.teamTendencies[side as 'home' | 'away'];
            const isGK = idx === 0;

            let bestTeammate = -1;
            let bestScore = -100;

            for (let i = 0; i < 11; i++) {
              if (i === idx) continue;
              const tPos = ctx.playerPositions[`${side}-${i}`];
              if (!tPos) continue;
              const dist = getDistance(carrierPos, tPos);
              const maxDist = isGK ? 25 : 16;
              const minDist = isGK ? 1.0 : 1.5;
              if (dist > minDist && dist < maxDist) {
                let score = 0;
                const isForward = (tPos.x - carrierPos.x) * dir > 0;
                
                if (isForward) {
                  score += (tPos.x - carrierPos.x) * dir * 1.5;
                } else {
                  score += ((tPos.x - carrierPos.x) * dir * 1.0);
                }
                score -= (dist * 2.5) + (Math.random() * 8);

                const role = getRoleForFormation(team.tactics.formation, i);
                if (isGK) {
                  if (['CB', 'LB', 'RB', 'DM'].includes(role)) score += 15.0;
                }

                // Objetividade (Directness)
                const directness = team.tactics.tempo ?? 50;
                if (directness > 60 && isForward) score += (directness - 50) * 0.3;
                if (directness < 40 && !isForward) score += (50 - directness) * 0.3;

                // Focus Sectors
                const focusSectors = team.tactics.focusSectors || [];
                let sideWeight = 1.0;
                if (focusSectors.includes('Left') && tPos.y < 6.0) sideWeight = 1.5;
                if (focusSectors.includes('Right') && tPos.y > 12.0) sideWeight = 1.5;
                if (focusSectors.includes('Center') && tPos.y >= 6.0 && tPos.y <= 12.0) sideWeight = 1.5;
                
                score *= sideWeight;

                if (score > bestScore && isLineOfSightFree(carrierPos, tPos, ctx.playerPositions, side)) {
                  bestScore = score;
                  bestTeammate = i;
                }
              }
            }

            if (bestTeammate !== -1) {
              const tPos = ctx.playerPositions[`${side}-${bestTeammate}`];
              const distToTarget = getDistance(carrierPos, tPos);
              const durationMs = isGK ? Math.max(800, distToTarget * 100) : Math.max(250, distToTarget * 120);
              
              ctx.proposedAction = {
                type: 'PASS',
                playerId: team.lineup[idx],
                target: { x: tPos.x, y: tPos.y },
                targetIdx: bestTeammate,
                duration: durationMs,
                label: isGK ? ctx.t('ml_long') : ctx.t('ml_pass')
              };
              return BehaviorStatus.SUCCESS;
            }
            return BehaviorStatus.FAILURE;
          })
        ]),

        // 1.3 DRIBLE / CONDUÇÃO PADRÃO
        new ActionNode(ctx => {
          const [side, sIdx] = ctx.activePlayerKey!.split('-');
          const idx = parseInt(sIdx);
          const carrierPos = ctx.playerPositions[ctx.activePlayerKey!];
          const goalX = side === 'home' ? 26.5 : -0.5;

          if (idx === 0) {
            // Goleiro não dribla, apenas mantem posição no gol
            const tx = side === 'home' ? 0.7 : 25.3;
            ctx.playerTargets[ctx.activePlayerKey!] = { x: tx, y: carrierPos.y, speed: 0 };
            return BehaviorStatus.SUCCESS;
          }

          const team = side === 'home' ? ctx.homeTeam : ctx.awayTeam;
          const focusSectors = team.tactics.focusSectors || ['Center'];
          const tempoVal = team.tactics.tempo || 50;
          const tendency = ctx.teamTendencies[side as 'home' | 'away'];

          // Define a altura ideal do drible baseada na tendência do time
          let targetY = 9.0;
          if (tendency === 'ATTACK_LEFT') targetY = 2.5;
          else if (tendency === 'ATTACK_RIGHT') targetY = 15.5;
          else if (focusSectors.length > 0) {
            const sumY = focusSectors.reduce((acc, s) => acc + (s === 'Left' ? 2.5 : s === 'Right' ? 15.5 : 9.0), 0);
            targetY = sumY / focusSectors.length;
          }

          // Drible mais rápido e direto (takeRisk) se objetividade for alta
          let speed = 0.03 + (tempoVal / 100) * 0.03; 
          if (tendency === 'PASS_WASTE_TIME') {
            speed *= 0.65;
            targetY = carrierPos.y + (Math.random() - 0.5) * 2; // Zigue-zague para reter bola
          }

          ctx.playerTargets[ctx.activePlayerKey!] = { x: goalX, y: targetY, speed };
          return BehaviorStatus.SUCCESS;
        })
      ])
    ]),

    // === RAMO 2: SE O JOGADOR NÃO TEM A BOLA ===
    new Selector([
      // 2.1 GOLEIRO
      new Sequence([
        new ConditionNode(ctx => {
          const [, sIdx] = ctx.activePlayerKey!.split('-');
          return parseInt(sIdx) === 0;
        }),
        new ActionNode(ctx => {
          const [side] = ctx.activePlayerKey!.split('-');
          const carrierPos = ctx.playerPositions[`${ctx.possession}-${ctx.carrierIdx}`];
          const tx = side === 'home' ? 0.7 : 25.3;
          const ty = carrierPos ? 9 + (carrierPos.y - 9) * 0.2 : 9.0;

          // Se a bola está sob controle do goleiro (ex: segurando no peito)
          if (ctx.gkHoldCooldown > 0 && ctx.possession === side && ctx.carrierIdx === 0) {
            ctx.playerTargets[ctx.activePlayerKey!] = { x: tx, y: ty, speed: 0 };
            return BehaviorStatus.SUCCESS;
          }

          ctx.playerTargets[ctx.activePlayerKey!] = { x: tx, y: ty, speed: 0.045 };
          return BehaviorStatus.SUCCESS;
        })
      ]),

      // 2.2 DEFESA (QUANDO O OPONENTE ESTÁ COM A BOLA)
      new Sequence([
        new ConditionNode(ctx => {
          const [side] = ctx.activePlayerKey!.split('-');
          return ctx.possession !== side;
        }),
        new Selector([
          // TACKLE / ROUBADA
          new Sequence([
            new ConditionNode(ctx => {
              if (ctx.tackleCooldown > 0) return false;
              const pos = ctx.playerPositions[ctx.activePlayerKey!];
              const carrierPos = ctx.playerPositions[`${ctx.possession}-${ctx.carrierIdx}`];
              if (!carrierPos) return false;
              
              const [side] = ctx.activePlayerKey!.split('-');
              const team = side === 'home' ? ctx.homeTeam : ctx.awayTeam;
              const aggressionLevel = getAggressionModifiers(team.tactics.aggression);

              return getDistance(pos, carrierPos) < 1.1 + (aggressionLevel * 0.5); 
            }),
            new ActionNode(ctx => {
              const [side, sIdx] = ctx.activePlayerKey!.split('-');
              const idx = parseInt(sIdx);
              const team = side === 'home' ? ctx.homeTeam : ctx.awayTeam;
              const oppTeam = side === 'home' ? ctx.awayTeam : ctx.homeTeam;
              const oppIdx = ctx.carrierIdx;
              const aggressionLevel = getAggressionModifiers(team.tactics.aggression);

              const defender = ctx.players.find(p => p.id === team.lineup[idx]);
              const attacker = ctx.players.find(p => p.id === oppTeam.lineup[oppIdx]);

              if (defender && attacker) {
                const defScore = defender.def * (0.6 + Math.random() * 0.4) + (aggressionLevel * 15);
                const atkScore = attacker.drb * (0.6 + Math.random() * 0.4) * 1.15;
                if (defScore > atkScore) {
                  ctx.proposedAction = {
                    type: 'TACKLE',
                    playerId: defender.id,
                    targetIdx: idx,
                    label: 'ROUBADA!',
                    duration: 450
                  };
                  return BehaviorStatus.SUCCESS;
                }
              }
              return BehaviorStatus.FAILURE;
            })
          ])
        ])
      ])
    ])
  ]);
};

export const updateTeamShape = (ctx: BTContext) => {
  const carrierPos = ctx.playerPositions[`${ctx.possession}-${ctx.carrierIdx}`];
  if (!carrierPos) return;

  ['home', 'away'].forEach(side => {
    const team = side === 'home' ? ctx.homeTeam : ctx.awayTeam;
    const metrics = ctx.teamMetrics ? ctx.teamMetrics[side as 'home' | 'away'] : { teamDepth: 50, teamWidth: 50, pressingLine: 50, compactness: 50 };
    const isPossession = ctx.possession === side;

    let teamAnchorX = carrierPos.x;
    if (side === 'home') {
      if (isPossession) {
        teamAnchorX = Math.max(8.0, Math.min(20.0, carrierPos.x - 2.0));
      } else {
        teamAnchorX = Math.max(4.0, Math.min(14.0, carrierPos.x - 2.0));
      }
    } else {
      if (isPossession) {
        teamAnchorX = Math.min(18.0, Math.max(6.0, carrierPos.x + 2.0));
      } else {
        teamAnchorX = Math.min(22.0, Math.max(12.0, carrierPos.x + 2.0));
      }
    }

    const baseMidpointX = side === 'home' ? 8.0 : 18.0;
    const targetOffsetScale = (metrics.teamDepth / 50.0);
    const teamOffsetX = (teamAnchorX - baseMidpointX) * 0.7 * targetOffsetScale;
    const teamOffsetY = (carrierPos.y - 9.0) * 0.35 * (metrics.teamWidth / 50.0);

    for (let i = 0; i < 11; i++) {
      const key = `${side}-${i}`;
      const basePos = getBaseFormationPos(team, i, side as 'home' | 'away');

      ctx.tacticalRoles[key] = {
        desiredPosition: {
          x: basePos.x + teamOffsetX,
          y: basePos.y + teamOffsetY
        },
        supportRole: 'none',
        pressRole: 'none',
        markingTarget: undefined
      };
    }
  });
};

export const updateSupportPlayers = (ctx: BTContext) => {
  const carrierPos = ctx.playerPositions[`${ctx.possession}-${ctx.carrierIdx}`];
  if (!carrierPos) return;

  const side = ctx.possession;
  const team = side === 'home' ? ctx.homeTeam : ctx.awayTeam;
  const metrics = ctx.teamMetrics ? ctx.teamMetrics[side] : { teamDepth: 50, teamWidth: 50, pressingLine: 50, compactness: 50 };

  const teammates: { idx: number; key: string; dist: number }[] = [];
  for (let i = 1; i < 11; i++) {
    if (i === ctx.carrierIdx) continue;
    const key = `${side}-${i}`;
    const pos = ctx.playerPositions[key];
    if (pos) {
      teammates.push({ idx: i, key, dist: getDistance(pos, carrierPos) });
    }
  }
  teammates.sort((a, b) => a.dist - b.dist);

  if (teammates.length >= 3) {
    const s1 = teammates[0];
    const s2 = teammates[1];
    const s3 = teammates[2];

    const s1Role = ctx.tacticalRoles[s1.key];
    if (s1Role) {
      s1Role.supportRole = 'support1';
      s1Role.desiredPosition.x = carrierPos.x + (side === 'home' ? -1.25 : 1.25);
      s1Role.desiredPosition.y = carrierPos.y + (carrierPos.y > 9.0 ? -0.75 : 0.75);
    }

    const s2Role = ctx.tacticalRoles[s2.key];
    if (s2Role) {
      s2Role.supportRole = 'support2';
      s2Role.desiredPosition.x = carrierPos.x + (side === 'home' ? -2.0 : 2.0);
      s2Role.desiredPosition.y = 18.0 - carrierPos.y;
    }

    const s3Role = ctx.tacticalRoles[s3.key];
    if (s3Role) {
      s3Role.supportRole = 'thirdMan';
      s3Role.desiredPosition.x = carrierPos.x + (side === 'home' ? 2.5 : -2.5);
      s3Role.desiredPosition.y = carrierPos.y + (carrierPos.y > 9.0 ? -1.25 : 1.25);
    }
  }

  for (let i = 1; i < 11; i++) {
    if (i === ctx.carrierIdx) continue;
    const key = `${side}-${i}`;
    const roleData = ctx.tacticalRoles[key];
    if (!roleData || roleData.supportRole !== 'none') continue;

    const playerRole = getRoleForFormation(team.tactics.formation, i);
    if (['LB', 'RB', 'LM', 'RM', 'LW', 'RW'].includes(playerRole)) {
      roleData.supportRole = 'amplitude';
      const basePos = getBaseFormationPos(team, i, side);
      const flankTargetY = basePos.y < 9.0 ? 1.0 : 17.0;
      const widthScale = metrics.teamWidth / 100.0;
      roleData.desiredPosition.y = basePos.y + (flankTargetY - basePos.y) * 0.45 * widthScale;
    } else if (playerRole === 'CB') {
      roleData.supportRole = 'CB_squeeze';
      roleData.desiredPosition.x += side === 'home' ? 1.5 : -1.5;
    }
  }
};

export const updatePressing = (ctx: BTContext) => {
  const carrierPos = ctx.playerPositions[`${ctx.possession}-${ctx.carrierIdx}`];
  if (!carrierPos) return;

  const side = ctx.possession === 'home' ? 'away' : 'home';
  const metrics = ctx.teamMetrics ? ctx.teamMetrics[side] : { teamDepth: 50, teamWidth: 50, pressingLine: 50, compactness: 50 };

  const defenders: { idx: number; key: string; dist: number }[] = [];
  for (let i = 1; i < 11; i++) {
    const key = `${side}-${i}`;
    const pos = ctx.playerPositions[key];
    if (pos) {
      defenders.push({ idx: i, key, dist: getDistance(pos, carrierPos) });
    }
  }
  defenders.sort((a, b) => a.dist - b.dist);

  if (defenders.length >= 3) {
    const d1 = defenders[0];
    const d2 = defenders[1];
    const d3 = defenders[2];

    const d1Role = ctx.tacticalRoles[d1.key];
    if (d1Role) {
      d1Role.pressRole = 'presser';
      const pressFactor = Math.min(1.0, 0.4 + (metrics.pressingLine / 100.0) * 0.6);
      d1Role.desiredPosition.x = d1Role.desiredPosition.x * (1 - pressFactor) + carrierPos.x * pressFactor;
      d1Role.desiredPosition.y = d1Role.desiredPosition.y * (1 - pressFactor) + carrierPos.y * pressFactor;
    }

    const d2Role = ctx.tacticalRoles[d2.key];
    if (d2Role) {
      d2Role.pressRole = 'coverShadow';
      d2Role.desiredPosition.x += side === 'home' ? -1.0 : 1.0;
      d2Role.desiredPosition.y = d2Role.desiredPosition.y * 0.85 + carrierPos.y * 0.15;
    }

    const d3Role = ctx.tacticalRoles[d3.key];
    if (d3Role) {
      d3Role.pressRole = 'interceptor';
      d3Role.desiredPosition.x = d3Role.desiredPosition.x * 0.7 + carrierPos.x * 0.3;
      d3Role.desiredPosition.y = d3Role.desiredPosition.y * 0.7 + carrierPos.y * 0.3;
    }
  }
};

export const updateMarking = (ctx: BTContext) => {
  const defSide = ctx.possession === 'home' ? 'away' : 'home';
  const attSide = ctx.possession;

  const defenders = [];
  const attackers = [];

  for (let i = 1; i < 11; i++) {
    const defKey = `${defSide}-${i}`;
    const attKey = `${attSide}-${i}`;
    if (ctx.playerPositions[defKey]) defenders.push({ idx: i, key: defKey });
    if (ctx.playerPositions[attKey]) attackers.push({ idx: i, key: attKey });
  }

  const assigned = new Set<string>();
  defenders.forEach(def => {
    const defPos = ctx.playerPositions[def.key];
    const defRole = ctx.tacticalRoles[def.key];
    if (!defPos || !defRole) return;

    let closestAttKey = '';
    let minDist = 999;

    attackers.forEach(att => {
      if (assigned.has(att.key)) return;
      const attPos = ctx.playerPositions[att.key];
      if (attPos) {
        const dist = getDistance(defPos, attPos);
        if (dist < minDist) {
          minDist = dist;
          closestAttKey = att.key;
        }
      }
    });

    if (closestAttKey) {
      assigned.add(closestAttKey);
      defRole.markingTarget = closestAttKey;

      const attPos = ctx.playerPositions[closestAttKey];
      if (attPos) {
        defRole.desiredPosition.x = defRole.desiredPosition.x * 0.8 + attPos.x * 0.2;
        defRole.desiredPosition.y = defRole.desiredPosition.y * 0.8 + attPos.y * 0.2;
      }
    }
  });
};

export const updateSpaceOccupation = (ctx: BTContext) => {
  const keys = Object.keys(ctx.tacticalRoles);
  const FIELD_WIDTH = 26;
  const FIELD_HEIGHT = 18;

  for (let iter = 0; iter < 3; iter++) {
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const k1 = keys[i];
        const k2 = keys[j];
        if (k1.split('-')[0] !== k2.split('-')[0]) continue;

        const r1 = ctx.tacticalRoles[k1];
        const r2 = ctx.tacticalRoles[k2];
        if (!r1 || !r2) continue;

        const dx = r1.desiredPosition.x - r2.desiredPosition.x;
        const dy = r1.desiredPosition.y - r2.desiredPosition.y;
        const distSq = dx * dx + dy * dy;
        const minSep = 1.5;
        if (distSq < minSep * minSep && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const overlap = minSep - dist;
          const shiftX = (dx / dist) * overlap * 0.5;
          const shiftY = (dy / dist) * overlap * 0.5;

          r1.desiredPosition.x += shiftX;
          r1.desiredPosition.y += shiftY;
          r2.desiredPosition.x -= shiftX;
          r2.desiredPosition.y -= shiftY;
        }
      }
    }
  }

  keys.forEach(key => {
    const roleData = ctx.tacticalRoles[key];
    if (!roleData) return;

    const [side, sIdx] = key.split('-');
    const idx = parseInt(sIdx);
    const team = side === 'home' ? ctx.homeTeam : ctx.awayTeam;
    const playerRole = getRoleForFormation(team.tactics.formation, idx);

    if (playerRole === 'GK') {
      const minX = side === 'home' ? 0.2 : FIELD_WIDTH - 4.0;
      const maxX = side === 'home' ? 4.0 : FIELD_WIDTH - 0.2;
      roleData.desiredPosition.x = Math.max(minX, Math.min(maxX, roleData.desiredPosition.x));
      roleData.desiredPosition.y = Math.max(4.0, Math.min(14.0, roleData.desiredPosition.y));
    } else {
      const minX = 0.5;
      const maxX = FIELD_WIDTH - 0.5;
      roleData.desiredPosition.x = Math.max(minX, Math.min(maxX, roleData.desiredPosition.x));
      roleData.desiredPosition.y = Math.max(0.5, Math.min(FIELD_HEIGHT - 0.5, roleData.desiredPosition.y));

      if (playerRole === 'CB') {
        const cbMinY = 3.0;
        const cbMaxY = 15.0;
        roleData.desiredPosition.y = Math.max(cbMinY, Math.min(cbMaxY, roleData.desiredPosition.y));
      }
    }
  });
};

export const updateTacticalLayer = (ctx: BTContext) => {
  ctx.tacticalRoles = {};
  updateTeamShape(ctx);
  updateSupportPlayers(ctx);
  updatePressing(ctx);
  updateMarking(ctx);
  updateSpaceOccupation(ctx);
};

export const calculateDesiredPosition = (ctx: BTContext, myKey: string) => {
  if (!ctx.tacticalRoles || !ctx.tacticalRoles[myKey]) {
    updateTacticalLayer(ctx);
  }
  return ctx.tacticalRoles[myKey]?.desiredPosition || getBaseFormationPos(myKey.startsWith('home') ? ctx.homeTeam : ctx.awayTeam, parseInt(myKey.split('-')[1]), myKey.split('-')[0] as 'home' | 'away');
};
