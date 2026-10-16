
import { Player, PlayStyle, Position } from '../types';

// Field Dimensions matching MatchDay.tsx (Updated)
const FIELD_WIDTH = 26;
const FIELD_HEIGHT = 19;
const CENTER_X = 13;
const CENTER_Y = 9.5;

interface FSMContext {
    player: Player;
    currentPos: { x: number, y: number };
    basePos: { x: number, y: number }; // The tactical formation base position
    ballPos: { x: number, y: number };
    hasBall: boolean;
    teamHasBall: boolean;
    side: 'home' | 'away';
    offsideLineX: number;
    attackingDir: number; // 1 for home (right), -1 for away (left)
    teammates: any[];
    opponents: any[];
}

interface FSMOutput {
    target: { x: number, y: number };
    state: string; // To update the visual debug state
    speedModifier?: number; // 1.0 is standard, >1 is sprint
}

// --- HELPER MATH ---
const distance = (p1: {x:number, y:number}, p2: {x:number, y:number}) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

// --- GENERIC BEHAVIORS ---

const standardDefense = (ctx: FSMContext, aggression: number = 0.5): FSMOutput => {
    const { currentPos, basePos, ballPos, opponents, side } = ctx;
    
    // 1. Zonal Positioning (Return to base but shift towards ball)
    let target = { 
        x: basePos.x + (ballPos.x - basePos.x) * 0.35, // Shift towards ball
        y: basePos.y + (ballPos.y - basePos.y) * 0.25
    };

    // 2. Proximity Press (If ball is close)
    const distToBall = distance(currentPos, ballPos);
    const pressRange = 5.0 * (1 + aggression); // More aggressive = wider press range
    
    if (distToBall < pressRange) {
        return { target: ballPos, state: 'PRESS', speedModifier: 1.1 };
    }

    return { target, state: 'DEF_SHAPE' };
};

const standardSupport = (ctx: FSMContext): FSMOutput => {
    const { basePos, ballPos } = ctx;
    // Basic support: float near base position but angle towards ball
    return {
        target: { 
            x: basePos.x + (ballPos.x - basePos.x) * 0.3, 
            y: basePos.y + (ballPos.y - basePos.y) * 0.3 
        },
        state: 'SUPPORT'
    };
};

// --- SPECIFIC ROLE FSMs ---

const GoalPoacherFSM = (ctx: FSMContext): FSMOutput => {
    const { hasBall, teamHasBall, ballPos, offsideLineX, currentPos, side } = ctx;

    if (hasBall) {
        const goalX = side === 'home' ? FIELD_WIDTH : 0;
        return { 
            target: { x: goalX, y: CENTER_Y }, 
            state: 'DRIVE_GOAL', 
            speedModifier: 1.1 
        };
    } 
    else if (teamHasBall) {
        const distToBall = distance(currentPos, ballPos);
        const inShootingZone = (side === 'home' && currentPos.x > FIELD_WIDTH - 8) || (side === 'away' && currentPos.x < 8);
        
        // Try to stay onside but push line
        if (distToBall < 15 || inShootingZone) {
             const lineX = side === 'home' ? Math.min(offsideLineX - 0.5, FIELD_WIDTH - 1) : Math.max(offsideLineX + 0.5, 1);
             return {
                 target: { x: lineX, y: currentPos.y + (ballPos.y - currentPos.y) * 0.4 }, 
                 state: 'POACH_RUN',
                 speedModifier: 1.2
             };
        }
        
        return {
            target: { 
                x: side === 'home' ? offsideLineX - 3 : offsideLineX + 3, 
                y: CENTER_Y + (Math.sin(Date.now() / 1000) * 4) 
            },
            state: 'PROWL'
        };
    } 
    else {
        const distToBall = distance(currentPos, ballPos);
        if (distToBall < 3.0) return { target: ballPos, state: 'PRESS_LAZY' };
        
        const counterX = side === 'home' ? offsideLineX - 6 : offsideLineX + 6;
        return { 
            target: { x: counterX, y: CENTER_Y }, 
            state: 'WAIT',
            speedModifier: 0.8
        };
    }
};

const BoxToBoxFSM = (ctx: FSMContext): FSMOutput => {
    const { hasBall, teamHasBall, ballPos, basePos, currentPos, attackingDir } = ctx;

    if (hasBall) {
        return { 
            target: { x: currentPos.x + (attackingDir * 5), y: currentPos.y }, 
            state: 'DRIVE_MID' 
        };
    }
    else if (teamHasBall) {
        const distToGoal = Math.abs((attackingDir === 1 ? FIELD_WIDTH : 0) - currentPos.x);
        if (distToGoal < 12) {
            return { target: { x: currentPos.x + (attackingDir * 3), y: ballPos.y }, state: 'BOX_RUN', speedModifier: 1.1 };
        } else {
            return { target: { x: ballPos.x - (attackingDir * 2), y: ballPos.y }, state: 'SUPPORT' };
        }
    }
    else {
        const distToBall = distance(currentPos, ballPos);
        if (distToBall < 8.0) {
            return { target: ballPos, state: 'PRESS_HARD', speedModifier: 1.15 };
        }
        return { target: { x: basePos.x, y: basePos.y }, state: 'RECOVER' };
    }
};

const ProlificWingerFSM = (ctx: FSMContext): FSMOutput => {
    const { hasBall, teamHasBall, ballPos, basePos, currentPos, attackingDir, side } = ctx;
    
    const isTopWing = basePos.y < CENTER_Y; 
    const cutInsideY = isTopWing ? basePos.y + 5 : basePos.y - 5; 

    if (hasBall) {
        const finalThird = (side === 'home' && currentPos.x > 18) || (side === 'away' && currentPos.x < 8);
        if (finalThird) {
            return { target: { x: currentPos.x + attackingDir, y: cutInsideY }, state: 'CUT_IN' };
        }
        return { target: { x: currentPos.x + (attackingDir * 3), y: currentPos.y }, state: 'WING_RUN' };
    }
    else if (teamHasBall) {
        const distToGoal = Math.abs((side === 'home' ? FIELD_WIDTH : 0) - currentPos.x);
        if (distToGoal < 12) {
             return { target: { x: currentPos.x + attackingDir, y: cutInsideY }, state: 'DIAG_RUN', speedModifier: 1.1 };
        }
        return { target: { x: currentPos.x + attackingDir, y: basePos.y }, state: 'WIDE' };
    }
    else {
        return { target: { x: basePos.x, y: basePos.y }, state: 'TRACK' };
    }
};

const TheDestroyerFSM = (ctx: FSMContext): FSMOutput => {
    const { hasBall, teamHasBall, ballPos, basePos, currentPos } = ctx;

    if (hasBall) {
        return { target: { x: currentPos.x, y: currentPos.y }, state: 'HOLD' };
    }
    else if (teamHasBall) {
        return { target: { x: basePos.x, y: CENTER_Y }, state: 'COVER' };
    }
    else {
        const distToBall = distance(currentPos, ballPos);
        if (distToBall < 9.0) {
            return { target: ballPos, state: 'DESTROY', speedModifier: 1.2 }; 
        }
        return { target: { x: basePos.x, y: ballPos.y * 0.3 + basePos.y * 0.7 }, state: 'SCREEN' };
    }
};

const OffensiveFullbackFSM = (ctx: FSMContext): FSMOutput => {
    const { hasBall, teamHasBall, ballPos, basePos, currentPos, attackingDir } = ctx;

    if (hasBall) {
        return { target: { x: currentPos.x + (attackingDir * 3), y: currentPos.y }, state: 'OVERLAP' };
    }
    else if (teamHasBall) {
        const sameSide = (basePos.y < CENTER_Y && ballPos.y < CENTER_Y) || (basePos.y > CENTER_Y && ballPos.y > CENTER_Y);
        if (sameSide && Math.abs(ballPos.x - currentPos.x) < 10) {
             return { target: { x: ballPos.x, y: basePos.y }, state: 'OVERLAP', speedModifier: 1.1 };
        }
        return standardSupport(ctx);
    }
    else {
        return standardDefense(ctx, 0.3);
    }
};

const CreativePlaymakerFSM = (ctx: FSMContext): FSMOutput => {
    const { hasBall, teamHasBall, ballPos, basePos, currentPos } = ctx;
    if (hasBall) {
        return { target: currentPos, state: 'SCAN' };
    } else if (teamHasBall) {
        // Find pockets of space between lines
        return { target: { x: (ballPos.x + basePos.x)/2, y: (ballPos.y + basePos.y)/2 + Math.sin(Date.now()/500) }, state: 'ROAM' };
    } else {
        return standardDefense(ctx, 0.2);
    }
};

// --- MAIN REGISTRY ---

export const calculatePlayerTarget = (
    player: Player,
    playStyle: PlayStyle,
    currentPos: { x: number, y: number },
    basePos: { x: number, y: number },
    ballGrid: { x: number, y: number },
    possession: 'home' | 'away',
    playerSide: 'home' | 'away',
    teammates: any[],
    opponents: any[],
    offsideLineX: number,
    carrierIdx: number,
    playerIdx: number 
): { x: number, y: number, state: string, speed?: number } => {

    const teamHasBall = possession === playerSide;
    const actuallyHasBall = teamHasBall && (playerIdx === carrierIdx);
    const attackingDir = playerSide === 'home' ? 1 : -1;

    const ctx: FSMContext = {
        player, currentPos, basePos, ballPos: ballGrid,
        hasBall: actuallyHasBall, teamHasBall, side: playerSide,
        teammates, opponents, offsideLineX, attackingDir
    };

    let result: FSMOutput;

    // Default assignment if none
    let effectiveStyle = playStyle;
    if (!effectiveStyle || effectiveStyle === 'None') {
        switch (player.position) {
            case Position.GK: effectiveStyle = 'Defensive Goalkeeper'; break;
            case Position.LB: case Position.RB: effectiveStyle = 'Offensive Full-back'; break;
            case Position.CB: effectiveStyle = 'The Destroyer'; break;
            case Position.DM: effectiveStyle = 'Anchor Man'; break;
            case Position.CM: effectiveStyle = 'Box-to-Box'; break;
            case Position.LM: case Position.RM: effectiveStyle = 'Prolific Winger'; break;
            case Position.AM: effectiveStyle = 'Creative Playmaker'; break;
            case Position.LW: case Position.RW: effectiveStyle = 'Prolific Winger'; break;
            case Position.ST: case Position.SS: effectiveStyle = 'Goal Poacher'; break;
            default: effectiveStyle = 'Box-to-Box';
        }
    }

    switch (effectiveStyle) {
        case 'Goal Poacher':
        case 'Fox in the Box':
        case 'Target Man':
            result = GoalPoacherFSM(ctx);
            break;
        case 'Box-to-Box':
        case 'Hole Player':
            result = BoxToBoxFSM(ctx);
            break;
        case 'Prolific Winger':
        case 'Roaming Flank': 
        case 'Cross Specialist':
            result = ProlificWingerFSM(ctx);
            break;
        case 'The Destroyer':
        case 'Anchor Man':
        case 'Build Up':
            result = TheDestroyerFSM(ctx);
            break;
        case 'Offensive Full-back':
        case 'Full-back Finisher':
            result = OffensiveFullbackFSM(ctx);
            break;
        case 'Creative Playmaker':
        case 'Classic No. 10':
        case 'Orchestrator':
            result = CreativePlaymakerFSM(ctx);
            break;
        default:
            if (actuallyHasBall) result = { target: { x: currentPos.x + (attackingDir * 3), y: currentPos.y }, state: 'CARRY' };
            else if (teamHasBall) result = standardSupport(ctx);
            else result = standardDefense(ctx);
            break;
    }

    // GK Override logic
    if (player.position === Position.GK) {
        const goalX = playerSide === 'home' ? 0.5 : 25.5;
        // Sweeper Keeper logic
        if (teamHasBall) {
             result = { target: { x: playerSide === 'home' ? 3 : 23, y: CENTER_Y }, state: 'SWEEPER' };
        } else {
             // Stay on line mostly but shift with ball
             const yShift = (ballGrid.y - CENTER_Y) * 0.3;
             result = { target: { x: goalX, y: CENTER_Y + yShift }, state: 'GUARD' };
        }
    }

    // Safety Clamp
    result.target.x = clamp(result.target.x, 0.5, FIELD_WIDTH - 0.5);
    result.target.y = clamp(result.target.y, 0.5, FIELD_HEIGHT - 0.5);

    return { x: result.target.x, y: result.target.y, state: result.state, speed: result.speedModifier };
};
