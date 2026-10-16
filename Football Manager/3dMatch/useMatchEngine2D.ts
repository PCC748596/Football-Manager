import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Team, Player, Fixture } from '../types';
import { buildTeamBT, buildPlayerBT, BTContext, TeamTendency, TeamState, calculateDesiredPosition, updateTacticalLayer } from './behaviorTree';

// --- PHYSICS CONSTANTS ---
export const MIN_SEPARATION = 1.0; 
export const MAX_SPEED_WITH_BALL = 0.04; 
export const MAX_SPEED_WITHOUT_BALL = 0.045; 
export const BALL_DRIBBLE_OFFSET = 0.14; 
export const DISPUTE_DISTANCE = 1.1; 
export const TEAMMATE_SPACING = 7.0; 
export const SPACING_FORCE = 0.05; 

export const FIELD_WIDTH = 26;
export const FIELD_HEIGHT = 18;
export const SCALE_X = (26 / 19) * 0.85; 
export const SCALE_Y = 18 / 10;
export const RECT_WIDTH_PCT = 0.75; 
export const RECT_HEIGHT_PCT = 0.85; 

export const PREFERRED_ZONES: Record<string, { minX: number, maxX: number, minY: number, maxY: number }> = {
    'GK': { minX: 0, maxX: 4, minY: 4, maxY: 14 },
    'LB': { minX: 0, maxX: 20, minY: 0, maxY: 18 }, 
    'CB': { minX: 0, maxX: 13, minY: 0, maxY: 18 }, 
    'RB': { minX: 0, maxX: 20, minY: 0, maxY: 18 }, 
    'DM': { minX: 4, maxX: 18, minY: 3, maxY: 15 },
    'CM': { minX: 6, maxX: 21, minY: 3, maxY: 15 },
    'LM': { minX: 6, maxX: 22, minY: 0, maxY: 5 }, 
    'RM': { minX: 6, maxX: 22, minY: 13, maxY: 18 }, 
    'AM': { minX: 10, maxX: 20, minY: 5, maxY: 13 },
    'LW': { minX: 9, maxX: 26, minY: 0, maxY: 5 }, 
    'RW': { minX: 9, maxX: 26, minY: 13, maxY: 18 }, 
    'ST': { minX: 10, maxX: 26, minY: 4, maxY: 14 },
    'SS': { minX: 9, maxX: 19, minY: 3, maxY: 7 }, 
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

export type VisualState = 'PRE_MATCH' | 'KICKOFF_SET' | 'KICKOFF_PASS' | 'PLAYING' | 'GOAL' | 'RESET' | 'OFFSIDE';

export interface UseMatchEngine2DProps {
  match: Fixture;
  isProcessing: boolean;
  matchMinute: number;
  homeTeam: Team;
  awayTeam: Team;
  players: Player[];
  gameStateMatchVisual: any;
  t: (key: string) => string;
  startMatchClock: () => void;
  pauseMatchClock: () => void;
  onGoalScored: (side: 'home' | 'away', playerId?: string) => void;
  setParentVisualState: (state: VisualState) => void;
  updateMatchVisualState: (state: any) => void;
}

export const useMatchEngine2D = ({
  match,
  isProcessing,
  matchMinute,
  homeTeam,
  awayTeam,
  players,
  gameStateMatchVisual,
  t,
  startMatchClock,
  pauseMatchClock,
  onGoalScored,
  setParentVisualState,
  updateMatchVisualState
}: UseMatchEngine2DProps) => {

  const teamHomeBT = useMemo(() => buildTeamBT('home'), []);
  const teamAwayBT = useMemo(() => buildTeamBT('away'), []);
  const playerBT = useMemo(() => buildPlayerBT(), []);

  const [teamTendencies, setTeamTendencies] = useState<Record<'home' | 'away', TeamTendency>>({
    home: 'STANDARD',
    away: 'STANDARD'
  });

  const [visualState, setVisualState] = useState<VisualState>(gameStateMatchVisual?.visualStatus || 'PRE_MATCH');
  const [playerPositions, setPlayerPositions] = useState<Record<string, { x: number, y: number }>>(gameStateMatchVisual?.playerPositions || {});
  const [possession, setPossession] = useState<'home' | 'away'>(gameStateMatchVisual?.possession || 'home');
  const [homePossessionCount, setHomePossessionCount] = useState(gameStateMatchVisual?.homePossessionCount || 0);
  const [awayPossessionCount, setAwayPossessionCount] = useState(gameStateMatchVisual?.awayPossessionCount || 0);
  const [kickoffOwner, setKickoffOwner] = useState<'home' | 'away'>(gameStateMatchVisual?.kickoffOwner || 'home');
  const [carrierIdx, setCarrierIdx] = useState(gameStateMatchVisual?.carrierIdx ?? 10);
  const [ballGrid, setBallGrid] = useState(gameStateMatchVisual?.ballGrid || { x: 13, y: 9 }); 
  const [ballDuration, setBallDuration] = useState(25);
  const [showOffsideLines, setShowOffsideLines] = useState(false);
  
  const [actionLabel, setActionLabel] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [shotCooldown, setShotCooldown] = useState(0); 
  const [tackleCooldown, setTackleCooldown] = useState(0);
  const [gkHoldCooldown, setGkHoldCooldown] = useState(0);

  // Expose the visual state ref for stable rendering without react re-renders
  const visualStateRef = useRef({
    playerPositions: (gameStateMatchVisual?.playerPositions || {}) as Record<string, { x: number, y: number }>,
    ballGrid: (gameStateMatchVisual?.ballGrid || { x: 13, y: 9 }) as { x: number, y: number },
    possession: (gameStateMatchVisual?.possession || 'home') as 'home' | 'away',
    carrierIdx: gameStateMatchVisual?.carrierIdx ?? 10,
    visualState: (gameStateMatchVisual?.visualStatus || 'PRE_MATCH') as VisualState,
    actionLabel: '',
    showOffsideLines: false,
    offsideLines: { homeDefense: 0.5, awayDefense: 25.5 },
    ballAnimation: { startX: 13, startY: 9, targetX: 13, targetY: 9, startTime: 0, duration: 0 }
  });

  const engineStateRef = useRef({
    visualState: (gameStateMatchVisual?.visualStatus || 'PRE_MATCH') as VisualState,
    playerPositions: (gameStateMatchVisual?.playerPositions || {}) as Record<string, { x: number, y: number }>,
    possession: (gameStateMatchVisual?.possession || 'home') as 'home' | 'away',
    homePossessionCount: gameStateMatchVisual?.homePossessionCount || 0,
    awayPossessionCount: gameStateMatchVisual?.awayPossessionCount || 0,
    kickoffOwner: (gameStateMatchVisual?.kickoffOwner || 'home') as 'home' | 'away',
    carrierIdx: gameStateMatchVisual?.carrierIdx ?? 10,
    ballGrid: (gameStateMatchVisual?.ballGrid || { x: 13, y: 9 }) as { x: number, y: number },
    ballDuration: 25,
    actionLabel: '',
    isAnimating: false,
    shotCooldown: 0,
    tackleCooldown: 0,
    gkHoldCooldown: 0,
    teamTendencies: { home: 'STANDARD', away: 'STANDARD' } as Record<'home' | 'away', TeamTendency>,
    teamStates: { home: 'ATTACK', away: 'DEFENSE' } as Record<'home' | 'away', TeamState>,
    teamMetrics: {
      home: { teamDepth: 50, teamWidth: 50, pressingLine: 50, compactness: 50 },
      away: { teamDepth: 50, teamWidth: 50, pressingLine: 50, compactness: 50 }
    },
    stateTimers: { home: 0, away: 0 } as Record<'home' | 'away', number>,
    prevPossession: (gameStateMatchVisual?.possession || 'home') as 'home' | 'away'
  });

  const syncVisualStateRef = useCallback((newBallDuration?: number) => {
    const state = engineStateRef.current;
    const prevBall = visualStateRef.current.ballGrid;
    const dur = newBallDuration !== undefined ? newBallDuration : state.ballDuration;
    
    const isNewAnimation = (state.ballGrid.x !== prevBall.x || state.ballGrid.y !== prevBall.y) && dur > 50;
    
    if (isNewAnimation) {
      visualStateRef.current.ballAnimation = {
        startX: prevBall.x,
        startY: prevBall.y,
        targetX: state.ballGrid.x,
        targetY: state.ballGrid.y,
        startTime: Date.now(),
        duration: dur
      };
    } else if (dur <= 50) {
      visualStateRef.current.ballAnimation.duration = 0;
    }

    const homeX = Object.entries(state.playerPositions)
        .filter(([k]) => k.startsWith('home-'))
        .map(([_, pos]) => (pos as { x: number }).x)
        .sort((a, b) => a - b);
    const awayX = Object.entries(state.playerPositions)
        .filter(([k]) => k.startsWith('away-'))
        .map(([_, pos]) => (pos as { x: number }).x)
        .sort((a, b) => b - a);
    const lineForAwayAttack = homeX.length >= 2 ? homeX[1] : 0.5;
    const lineForHomeAttack = awayX.length >= 2 ? awayX[1] : 25.5;

    // The offside line cannot go past the midfield line (13.0) into the attacking team's half
    const cappedHomeDefense = Math.min(13.0, lineForAwayAttack);
    const cappedAwayDefense = Math.max(13.0, lineForHomeAttack);

    visualStateRef.current.playerPositions = { ...state.playerPositions };
    visualStateRef.current.ballGrid = { ...state.ballGrid };
    visualStateRef.current.possession = state.possession;
    visualStateRef.current.carrierIdx = state.carrierIdx;
    visualStateRef.current.visualState = state.visualState;
    visualStateRef.current.actionLabel = state.actionLabel;
    visualStateRef.current.showOffsideLines = showOffsideLines;
    visualStateRef.current.offsideLines = { homeDefense: cappedHomeDefense, awayDefense: cappedAwayDefense };
  }, [showOffsideLines]);

  // Listener for 'O' key to toggle offside lines
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'o') {
        setShowOffsideLines(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    updateMatchVisualState({ 
      visualStatus: visualState,
      possession,
      kickoffOwner,
      carrierIdx
    });
  }, [visualState, possession, kickoffOwner, carrierIdx]);

  const applyFormation = useCallback((kickSide: 'home' | 'away' | null) => {
    const newPos: Record<string, { x: number, y: number }> = {};
    ['home', 'away'].forEach(side => {
        const team = side === 'home' ? homeTeam : awayTeam;
        const grid = FORMATION_GRIDS[team.tactics.formation] || FORMATION_GRIDS['4-4-2'];
        for (let i = 0; i < 11; i++) {
            let cx = grid[i].x * SCALE_X;
            let cy = grid[i].y * SCALE_Y;
            let finalX = side === 'home' ? cx : FIELD_WIDTH - cx;
            if (kickSide) {
                if (side === kickSide && i === (team.tactics.formation.includes('1') ? 10 : 9)) { finalX = side === 'home' ? 12.6 : 13.4; cy = 9; }
                else if (side !== kickSide) {
                    const dx = (finalX - 13) * 5.25; const dy = (cy - 9) * 6.18;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < 9.15) {
                        const safeDistX = Math.sqrt(9.15 * 9.15 - dy * dy) / 5.25;
                        finalX = side === 'home' ? (13 - safeDistX - 0.5) : (13 + safeDistX + 0.5);
                    }
                }
            }
            newPos[`${side}-${i}`] = { x: finalX, y: cy };
        }
    });
    
    engineStateRef.current.playerPositions = newPos;
    syncVisualStateRef();
    setPlayerPositions(newPos);
  }, [homeTeam, awayTeam, syncVisualStateRef]);

  useEffect(() => { if (Object.keys(playerPositions).length === 0) applyFormation(null); }, [homeTeam.id, awayTeam.id, playerPositions, applyFormation]);

  const startKickoffSequence = useCallback(() => {
    const state = engineStateRef.current;
    let side: 'home' | 'away' = state.visualState === 'GOAL' || state.visualState === 'OFFSIDE' 
      ? (state.possession === 'home' ? 'away' : 'home') 
      : (matchMinute === 0 ? (Math.random() > 0.5 ? 'home' : 'away') : (state.kickoffOwner === 'home' ? 'away' : 'home'));
      
    if (state.visualState === 'OFFSIDE') {
        const nextPossession = state.possession === 'home' ? 'away' : 'home';
        state.possession = nextPossession; 
        state.carrierIdx = 0;
        const gkPos = state.playerPositions[`${nextPossession}-0`] || { x: nextPossession === 'home' ? 0.5 : 25.5, y: 9.0 };
        state.ballGrid = { ...gkPos };
        state.visualState = 'PLAYING';
        
        syncVisualStateRef();
        
        setPossession(nextPossession);
        setCarrierIdx(0);
        setBallGrid({ ...gkPos });
        setVisualState('PLAYING');
    } else {
        state.kickoffOwner = side; 
        state.possession = side; 
        const cIdx = (side === 'home' ? homeTeam : awayTeam).tactics.formation.includes('1') ? 10 : 9;
        state.carrierIdx = cIdx; 
        state.ballGrid = { x: 13, y: 9 }; 
        state.ballDuration = 0; 
        state.visualState = 'KICKOFF_SET';
        
        applyFormation(side);
        syncVisualStateRef(0);
        
        setKickoffOwner(side);
        setPossession(side);
        setCarrierIdx(cIdx);
        setBallGrid({ x: 13, y: 9 });
        setBallDuration(0);
        setVisualState('KICKOFF_SET');
    }
  }, [matchMinute, homeTeam, awayTeam, applyFormation, syncVisualStateRef]);

  const resetPositions = useCallback(() => {
    const state = engineStateRef.current;
    state.visualState = 'PRE_MATCH';
    state.ballGrid = { x: 13, y: 9 };
    state.ballDuration = 0;
    state.carrierIdx = 10;
    state.isAnimating = false;
    state.actionLabel = '';
    state.shotCooldown = 0;
    state.tackleCooldown = 0;
    state.gkHoldCooldown = 0;
    
    applyFormation(null);
    syncVisualStateRef(0);
    
    setVisualState('PRE_MATCH');
    setBallGrid({ x: 13, y: 9 });
    setBallDuration(0);
    setCarrierIdx(10);
    setIsAnimating(false);
    setActionLabel('');
    setShotCooldown(0);
    setTackleCooldown(0);
    setGkHoldCooldown(0);
  }, [applyFormation, syncVisualStateRef]);

  useEffect(() => { setParentVisualState(visualState); }, [visualState, setParentVisualState]);

  useEffect(() => {
    if (visualState === 'KICKOFF_SET') {
        const timer = setTimeout(() => {
          engineStateRef.current.visualState = 'KICKOFF_PASS';
          syncVisualStateRef();
          setVisualState('KICKOFF_PASS');
        }, 2000);
        return () => clearTimeout(timer);
    }
    if (visualState === 'KICKOFF_PASS') {
        const state = engineStateRef.current;
        const targetIdx = 6; 
        const targetPos = state.playerPositions[`${state.kickoffOwner}-${targetIdx}`];
        if (targetPos) {
            state.isAnimating = true; 
            state.actionLabel = t('ml_kickoff'); 
            state.ballGrid = { ...targetPos };
            state.ballDuration = 400;
            
            syncVisualStateRef(400);
            
            setIsAnimating(true); 
            setActionLabel(t('ml_kickoff')); 
            setBallGrid({ ...targetPos });
            setBallDuration(400);
            
            const timer = setTimeout(() => {
                state.carrierIdx = targetIdx; 
                state.visualState = 'PLAYING';
                state.isAnimating = false; 
                state.actionLabel = '';
                
                syncVisualStateRef();
                
                setCarrierIdx(targetIdx); 
                setVisualState('PLAYING');
                setIsAnimating(false); 
                setActionLabel(''); 
                startMatchClock();
            }, 400);
            return () => clearTimeout(timer);
        }
    }
  }, [visualState, t, startMatchClock, syncVisualStateRef]);

  const isLineOfSightFree = (from: {x:number, y:number}, to: {x:number, y:number}, currentPositions: Record<string, {x:number, y:number}>, side: string) => {
    const opponents = Object.entries(currentPositions).filter(([k]) => !k.startsWith(side)).map(([_, v]) => v as {x: number, y: number});
    for (const opp of opponents) {
      const dx = to.x - from.x, dy = to.y - from.y;
      const distToLine = Math.abs(dy * opp.x - dx * opp.y + to.x * from.y - to.y * from.x) / Math.sqrt(dx*dx + dy*dy);
      const isBetween = Math.min(from.x, to.x) <= opp.x && opp.x <= Math.max(from.x, to.x) && Math.min(from.y, to.y) <= opp.y && opp.y <= Math.max(from.y, to.y);
      if (distToLine < 0.65 && isBetween) return false;
    }
    return true;
  };

  const calculatePhysicsMove = (current: {x:number, y:number}, target: {x:number, y:number}, allPositions: Record<string, {x:number, y:number}>, myKey: string, speedLimit: number) => {
    const [side, sIdx] = myKey.split('-'); const idx = parseInt(sIdx); const isGK = idx === 0;
    let dx = target.x - current.x, dy = target.y - current.y;
    const distToTarget = Math.sqrt(dx*dx + dy*dy);
    if (distToTarget > 0.1) { const scale = Math.min(speedLimit, distToTarget) / distToTarget; dx *= scale; dy *= scale; } else { dx = 0; dy = 0; }
    let sepX = 0, sepY = 0;
    Object.entries(allPositions).forEach(([k, pos]) => {
        if (k === myKey) return;
        if (k.split('-')[0] === side) {
            const distSq = Math.pow(pos.x - current.x, 2) + Math.pow(pos.y - current.y, 2);
            if (distSq < TEAMMATE_SPACING * TEAMMATE_SPACING && distSq > 0.0001) {
                const dist = Math.sqrt(distSq); const pushX = (current.x - pos.x) / dist; const pushY = (current.y - pos.y) / dist;
                const factor = (TEAMMATE_SPACING - dist) / TEAMMATE_SPACING;
                sepX += pushX * factor * SPACING_FORCE; sepY += pushY * factor * SPACING_FORCE;
            }
        }
    });
    let minX = 0, maxX = FIELD_WIDTH;
    if (isGK) { if (side === 'home') { minX = 0.1; maxX = 4.0; } else { minX = FIELD_WIDTH - 4.1; maxX = FIELD_WIDTH - 0.1; } }
    return { x: Math.max(minX, Math.min(maxX, current.x + dx + sepX)), y: Math.max(0, Math.min(FIELD_HEIGHT, current.y + dy + sepY)), dx, dy };
  };

  const resolveCollisions = (positions: Record<string, {x:number, y:number}>) => {
    const keys = Object.keys(positions);
    for(let iter=0; iter<3; iter++) {
        for(let i=0; i<keys.length; i++) {
            for(let j=i+1; j<keys.length; j++) {
                const k1 = keys[i], k2 = keys[j], p1 = positions[k1], p2 = positions[k2];
                const dx = p1.x - p2.x, dy = p1.y - p2.y, distSq = dx*dx + dy*dy;
                if (distSq < MIN_SEPARATION * MIN_SEPARATION && distSq > 0.0001) {
                    const dist = Math.sqrt(distSq); const overlap = MIN_SEPARATION - dist;
                    const moveX = (dx / dist) * overlap * 0.5, moveY = (dy / dist) * overlap * 0.5;
                    p1.x += moveX; p1.y += moveY; p2.x -= moveX; p2.y -= moveY;
                }
            }
        }
    }
    keys.forEach(key => {
        const [side, sIdx] = key.split('-');
        if (parseInt(sIdx) === 0) { if (side === 'home') positions[key].x = Math.max(0.1, Math.min(4.0, positions[key].x)); else positions[key].x = Math.max(FIELD_WIDTH - 4.1, Math.min(FIELD_WIDTH - 0.1, positions[key].x)); }
        else { positions[key].x = Math.max(0.1, Math.min(FIELD_WIDTH - 0.1, positions[key].x)); }
        positions[key].y = Math.max(0.1, Math.min(FIELD_HEIGHT - 0.1, positions[key].y));
    });
  };

  const processTurn = useCallback(() => {
    const state = engineStateRef.current;
    if (state.visualState !== 'PLAYING') return;

    if (state.possession === 'home') state.homePossessionCount++;
    else state.awayPossessionCount++;

    if (state.shotCooldown > 0) state.shotCooldown--;
    if (state.tackleCooldown > 0) state.tackleCooldown--;
    if (state.gkHoldCooldown > 0) state.gkHoldCooldown--;

    if (state.possession !== state.prevPossession) {
      state.teamStates[state.possession] = 'OFFENSIVE_TRANSITION';
      state.teamStates[state.prevPossession] = 'DEFENSIVE_TRANSITION';
      state.stateTimers = { home: 0, away: 0 };
      state.prevPossession = state.possession;
    } else {
      state.stateTimers.home++;
      state.stateTimers.away++;
      // Transição de estado após ~3.5 segundos (60 ticks dependendo do frame rate, vamos usar 60)
      if (state.stateTimers.home > 60) {
        if (state.teamStates.home === 'OFFENSIVE_TRANSITION') state.teamStates.home = 'ATTACK';
        if (state.teamStates.home === 'DEFENSIVE_TRANSITION') state.teamStates.home = 'DEFENSE';
      }
      if (state.stateTimers.away > 60) {
        if (state.teamStates.away === 'OFFENSIVE_TRANSITION') state.teamStates.away = 'ATTACK';
        if (state.teamStates.away === 'DEFENSIVE_TRANSITION') state.teamStates.away = 'DEFENSE';
      }
    }

    const prevPositions = state.playerPositions;
    const nextPositions = { ...prevPositions }; 

    const currentCarrierKey = `${state.possession}-${state.carrierIdx}`;
    let carrierPos = nextPositions[currentCarrierKey]; 
    if (!carrierPos) return;

    const opponentSide = state.possession === 'home' ? 'away' : 'home';
    const opponentTeam = state.possession === 'home' ? awayTeam : homeTeam;

    const homeX = Object.entries(prevPositions)
        .filter(([k]) => k.startsWith('home-'))
        .map(([_, pos]) => (pos as { x: number }).x)
        .sort((a, b) => a - b);
    const awayX = Object.entries(prevPositions)
        .filter(([k]) => k.startsWith('away-'))
        .map(([_, pos]) => (pos as { x: number }).x)
        .sort((a, b) => b - a);
    const lineForAwayAttack = homeX.length >= 2 ? homeX[1] : 0.5;
    const lineForHomeAttack = awayX.length >= 2 ? awayX[1] : 25.5;

    // The offside line cannot go past the midfield line (13.0) into the attacking team's half
    const cappedHomeDefense = Math.min(13.0, lineForAwayAttack);
    const cappedAwayDefense = Math.max(13.0, lineForHomeAttack);
    const currentOffsideLines = { homeDefense: cappedHomeDefense, awayDefense: cappedAwayDefense };

    // 1. Build Behavior Tree Context
    const context: BTContext = {
      tacticalRoles: {},
      gameState: { ...gameStateMatchVisual, matchMinute },
      match,
      homeTeam,
      awayTeam,
      players,
      playerPositions: prevPositions,
      possession: state.possession,
      carrierIdx: state.carrierIdx,
      ballGrid: state.ballGrid,
      offsideLines: currentOffsideLines,
      t,
      teamTendencies: { ...state.teamTendencies },
      homePossessionCount: state.homePossessionCount,
      awayPossessionCount: state.awayPossessionCount,
      shotCooldown: state.shotCooldown,
      tackleCooldown: state.tackleCooldown,
      gkHoldCooldown: state.gkHoldCooldown,
      teamStates: state.teamStates,
      teamMetrics: state.teamMetrics,
      stateTimers: state.stateTimers,
      playerTargets: {}
    };

    // 2. Tick Team BTs to determine tendencies
    teamHomeBT.tick(context);
    teamAwayBT.tick(context);
    state.teamTendencies = context.teamTendencies;
    setTeamTendencies(state.teamTendencies);

    // Update the Tactical Layer (Team Shape, Support, Pressing, Marking, Space Occupation)
    updateTacticalLayer(context);

    // 3. Tick Non-carriers first to check for tackles
    for (let i = 0; i < 11; i++) {
      if (i === state.carrierIdx && state.possession === 'home') continue;
      context.activePlayerKey = `home-${i}`;
      playerBT.tick(context);
    }
    for (let i = 0; i < 11; i++) {
      if (i === state.carrierIdx && state.possession === 'away') continue;
      context.activePlayerKey = `away-${i}`;
      playerBT.tick(context);
    }

    const tackleAction = context.proposedAction?.type === 'TACKLE' ? context.proposedAction : null;

    // 4. If no tackle is proposed, tick the carrier for actions
    if (!tackleAction && !state.isAnimating) {
      context.activePlayerKey = `${state.possession}-${state.carrierIdx}`;
      playerBT.tick(context);
    } else if (tackleAction) {
      context.proposedAction = tackleAction;
    }

    if (state.isAnimating) {
      context.proposedAction = undefined;
    }

    let finalBallGrid = { ...state.ballGrid };
    let finalBallDuration = 25;

    // 5. Execute Proposed Actions (if any)
    if (!state.isAnimating && context.proposedAction) {
      const action = context.proposedAction;

      // A) TACKLE
      if (action.type === 'TACKLE') {
        state.possession = opponentSide;
        state.carrierIdx = action.targetIdx!;
        state.tackleCooldown = 15;
        state.actionLabel = 'ROUBADA!';
        state.isAnimating = true;
        
        const nextIdx = action.targetIdx!;
        finalBallGrid = nextPositions[`${opponentSide}-${nextIdx}`] || state.ballGrid;
        state.ballGrid = { ...finalBallGrid };
        state.ballDuration = action.duration || 450;
        
        syncVisualStateRef(action.duration || 450);
        
        setPossession(opponentSide);
        setCarrierIdx(action.targetIdx!);
        setActionLabel('ROUBADA!');
        setIsAnimating(true);
        setBallGrid({ ...finalBallGrid });
        setBallDuration(action.duration || 450);
        
        setTimeout(() => {
          const innerState = engineStateRef.current;
          innerState.isAnimating = false;
          innerState.actionLabel = '';
          syncVisualStateRef();
          setIsAnimating(false);
          setActionLabel('');
        }, action.duration || 450);
        
        state.playerPositions = nextPositions;
        setPlayerPositions(nextPositions);
        return;
      }

      // B) SHOOT
      if (action.type === 'SHOOT') {
        finalBallGrid = action.target || state.ballGrid;
        finalBallDuration = action.duration || 600;
        
        state.ballGrid = { ...finalBallGrid };
        state.ballDuration = finalBallDuration;
        state.isAnimating = true;
        state.actionLabel = t('ml_shot');
        const isGoal = action.label === t('ml_goal');
        
        syncVisualStateRef(finalBallDuration);
        
        setBallGrid({ ...finalBallGrid });
        setBallDuration(finalBallDuration);
        setIsAnimating(true);
        setActionLabel(t('ml_shot'));
        
        setTimeout(() => {
          const innerState = engineStateRef.current;
          if (isGoal) {
            innerState.visualState = 'GOAL';
            innerState.actionLabel = t('ml_goal');
            syncVisualStateRef();
            setVisualState('GOAL');
            setActionLabel(t('ml_goal'));
            onGoalScored(innerState.possession, action.playerId);
            
            setTimeout(() => {
              const innerState2 = engineStateRef.current;
              innerState2.visualState = 'RESET';
              syncVisualStateRef();
              setVisualState('RESET');
              
              setTimeout(() => {
                const innerState3 = engineStateRef.current;
                const sideToStart = innerState3.possession === 'home' ? 'away' : 'home';
                innerState3.kickoffOwner = sideToStart;
                innerState3.possession = sideToStart;
                const cIdx = (sideToStart === 'home' ? homeTeam : awayTeam).tactics.formation.includes('1') ? 10 : 9;
                innerState3.carrierIdx = cIdx;
                innerState3.ballGrid = { x: 13, y: 9 };
                innerState3.ballDuration = 0;
                innerState3.visualState = 'KICKOFF_SET';
                
                applyFormation(sideToStart);
                syncVisualStateRef(0);
                
                setKickoffOwner(sideToStart);
                setPossession(sideToStart);
                setCarrierIdx(cIdx);
                setBallGrid({ x: 13, y: 9 });
                setBallDuration(0);
                setVisualState('KICKOFF_SET');
              }, 1000);
            }, 2500);
          } else {
            innerState.actionLabel = t('ml_save');
            innerState.possession = opponentSide;
            innerState.carrierIdx = 0;
            innerState.gkHoldCooldown = Math.floor(Math.random() * (320 - 160 + 1) + 160);
            
            const gkPos = nextPositions[`${opponentSide}-0`];
            if (gkPos) {
              innerState.ballGrid = { ...gkPos };
            }
            innerState.shotCooldown = 25;
            innerState.isAnimating = false;
            
            syncVisualStateRef();
            
            setActionLabel(t('ml_save'));
            setPossession(opponentSide);
            setCarrierIdx(0);
            if (gkPos) setBallGrid({ ...gkPos });
            setShotCooldown(25);
            setIsAnimating(false);
          }
        }, action.duration || 600);
        
        state.playerPositions = nextPositions;
        setPlayerPositions(nextPositions);
        return;
      }

      // C) PASS
      if (action.type === 'PASS') {
        const targetIdx = action.targetIdx!;
        const tPos = nextPositions[`${state.possession}-${targetIdx}`];
        if (tPos) {
          const dir = state.possession === 'home' ? 1 : -1;
          const distToTarget = Math.sqrt(Math.pow(tPos.x - carrierPos.x, 2) + Math.pow(tPos.y - carrierPos.y, 2));
          const durationMs = action.duration || Math.max(250, distToTarget * 120);
          
          const ticksToArrive = distToTarget / 0.22;
          const leadDist = Math.min(1.8, ticksToArrive * MAX_SPEED_WITHOUT_BALL * 0.6);
          const projectedX = Math.max(0.5, Math.min(FIELD_WIDTH - 0.5, tPos.x + (leadDist * dir)));
          const offsideThreshold = state.possession === 'home' ? currentOffsideLines.awayDefense : currentOffsideLines.homeDefense;
          let isOffside = false;
          if (state.possession === 'home') {
            isOffside = tPos.x > offsideThreshold && tPos.x > carrierPos.x;
          } else {
            isOffside = tPos.x < offsideThreshold && tPos.x < carrierPos.x;
          }

          finalBallGrid = { x: projectedX, y: tPos.y };
          finalBallDuration = durationMs;
          
          state.ballGrid = { ...finalBallGrid };
          state.ballDuration = finalBallDuration;
          state.isAnimating = true;
          state.actionLabel = action.label || t('ml_pass');
          
          syncVisualStateRef(finalBallDuration);
          
          setBallGrid({ ...finalBallGrid });
          setBallDuration(finalBallDuration);
          setIsAnimating(true);
          setActionLabel(action.label || t('ml_pass'));

          setTimeout(() => {
            const innerState = engineStateRef.current;
            if (isOffside) {
              innerState.visualState = 'OFFSIDE';
              innerState.actionLabel = 'IMPEDIMENTO!';
              syncVisualStateRef();
              setVisualState('OFFSIDE');
              setActionLabel('IMPEDIMENTO!');
              
              setTimeout(() => {
                const innerState2 = engineStateRef.current;
                const restartSide = innerState2.possession === 'home' ? 'away' : 'home';
                innerState2.possession = restartSide;
                innerState2.carrierIdx = 0;
                innerState2.actionLabel = '';
                
                const gkPos = innerState2.playerPositions[`${restartSide}-0`];
                if (gkPos) innerState2.ballGrid = { ...gkPos };
                innerState2.ballDuration = 0;
                innerState2.isAnimating = false;
                innerState2.visualState = 'PLAYING';
                
                syncVisualStateRef(0);
                
                setPossession(restartSide);
                setCarrierIdx(0);
                setActionLabel('');
                if (gkPos) setBallGrid({ ...gkPos });
                setBallDuration(0);
                setIsAnimating(false);
                setVisualState('PLAYING');
              }, 2000);
            } else {
              innerState.carrierIdx = targetIdx;
              innerState.isAnimating = false;
              innerState.actionLabel = '';
              syncVisualStateRef();
              setCarrierIdx(targetIdx);
              setIsAnimating(false);
              setActionLabel('');
            }
          }, durationMs);
          
          state.playerPositions = nextPositions;
          setPlayerPositions(nextPositions);
          return;
        }
      }
    }

    // 6. Dribbling Logic (if carrier didn't execute an action and we aren't animating)
    if (!state.isAnimating && (!context.proposedAction || context.proposedAction.type === 'GK_HOLD')) {
      const target = context.playerTargets[currentCarrierKey];
      if (target) {
        const speedLimit = target.speed;
        const moveResult = calculatePhysicsMove(carrierPos, { x: target.x, y: target.y }, nextPositions, currentCarrierKey, speedLimit);
        carrierPos = { x: moveResult.x, y: moveResult.y };
        nextPositions[currentCarrierKey] = carrierPos;

        const angle = Math.atan2(moveResult.dy || 0, moveResult.dx || (state.possession === 'home' ? 1 : -1));
        finalBallGrid = {
          x: carrierPos.x + Math.cos(angle) * BALL_DRIBBLE_OFFSET,
          y: carrierPos.y + Math.sin(angle) * BALL_DRIBBLE_OFFSET
        };
        finalBallDuration = 25;
        
        state.ballGrid = { ...finalBallGrid };
        state.ballDuration = finalBallDuration;
      }
    }

    // 7. Move All Other Players using BT Targets or Spatial Gravity Model
    Object.keys(nextPositions).forEach(key => {
      if (key === currentCarrierKey && (state.isAnimating || (state.carrierIdx === 0 && state.gkHoldCooldown > 0))) return;
      
      let target = context.playerTargets[key];
      
      if (!target && key !== currentCarrierKey && !key.endsWith('-0')) {
         const dp = context.tacticalRoles[key]?.desiredPosition || calculateDesiredPosition(context, key);
         target = { x: dp.x, y: dp.y, speed: MAX_SPEED_WITHOUT_BALL };
      }

      if (target) {
        const currentPos = nextPositions[key];
        const [side, sIdx] = key.split('-');
        const idx = parseInt(sIdx);
        const team = side === 'home' ? homeTeam : awayTeam;
        const role = getRoleForFormation(team.tactics.formation, idx);
        const zone = PREFERRED_ZONES[role] || PREFERRED_ZONES['CM'];

        // Clamp coordinates to player preferred zones (preserving physical bounding constraints)
        const clampedX = Math.max(side === 'home' ? zone.minX : FIELD_WIDTH - zone.maxX, Math.min(side === 'home' ? zone.maxX : FIELD_WIDTH - zone.minX, target.x));
        const clampedY = Math.max(side === 'home' ? zone.minY : FIELD_HEIGHT - zone.maxY, Math.min(side === 'home' ? zone.maxY : FIELD_HEIGHT - zone.minY, target.y));

        const moveRes = calculatePhysicsMove(currentPos, { x: clampedX, y: clampedY }, nextPositions, key, target.speed);
        nextPositions[key] = { x: moveRes.x, y: moveRes.y };
      }
    });

    resolveCollisions(nextPositions); 

    state.playerPositions = nextPositions;
    setPlayerPositions(nextPositions);
    
    if (!state.isAnimating) {
      state.ballGrid = { ...finalBallGrid };
      state.ballDuration = finalBallDuration;
      
      setBallGrid({ ...finalBallGrid });
      setBallDuration(finalBallDuration);
    }
    
    syncVisualStateRef();
  }, [homeTeam, awayTeam, players, t, onGoalScored, applyFormation, teamHomeBT, teamAwayBT, playerBT, gameStateMatchVisual, match, syncVisualStateRef]);

  const savedCallback = useRef<() => void>();
  useEffect(() => { savedCallback.current = processTurn; });
  useEffect(() => { let timer: any; if (isProcessing) timer = setInterval(() => savedCallback.current?.(), 60); return () => clearInterval(timer); }, [isProcessing]);

  useEffect(() => { 
    if (visualState === 'PLAYING') {
      const state = engineStateRef.current;
      if (!state.isAnimating) {
        const p = state.playerPositions[`${state.possession}-${state.carrierIdx}`];
        if (p) {
            if (state.carrierIdx === 0) {
                state.ballDuration = 25;
                state.ballGrid = { ...p };
                syncVisualStateRef(25);
                setBallGrid({ ...p });
                setBallDuration(25);
            }
        }
      }
    }
  }, [visualState, syncVisualStateRef]);

  useEffect(() => {
    syncVisualStateRef();
  }, [showOffsideLines, syncVisualStateRef]);

  return {
    visualStateRef,
    visualState,
    possession,
    kickoffOwner,
    carrierIdx,
    homePossessionCount,
    awayPossessionCount,
    startKickoffSequence,
    resetPositions,
  };
};
