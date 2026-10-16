import { Team, Player, Fixture, Position, MatchEvent, Tactics } from '../types';
import { simulateMatch } from './matchEngine';
import { generatePlayer } from './dataGenerator';

// Helper para criar time artificial com overall específico
const createArtificialTeam = (id: string, name: string, targetOvr: number): { team: Team, players: Player[] } => {
  const team: Team = {
    id,
    name,
    managerName: 'Test Manager',
    teamAbb: id.substring(0, 3).toUpperCase(),
    country: 'test',
    leagueId: 'test_league',
    city: 'Test City',
    stadium: 'Test Stadium',
    stadiumCapacity: 50000,
    foundedYear: 2000,
    strength: targetOvr,
    chemistry: 50,
    chemistryTrainingCounter: 0,
    cash: 10000000,
    initialCapital: 10000000,
    initialTransfer: 7000000,
    sponsorAmount: 0,
    fanBase: 10000,
    avrAttendance: 5000,
    played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0,
    primaryColor: '#000', secondaryColor: '#fff', tertiaryColor: 'transparent',
    logoUrl: '',
    kitUrls: ['', '', ''],
    tactics: {
      formation: '4-4-2',
      style: 'Balanced',
      aggression: 'Balanced',
      pressure: 50,
      defensiveLine: 50,
      tempo: 50,
      focusSectors: ['Center']
    },
    lineup: [],
    bench: [],
    synergyMap: {}
  };

  const players: Player[] = [];
  const positionsNeeded = [
    Position.GK, 
    Position.LB, Position.CB, Position.CB, Position.RB, 
    Position.LM, Position.CM, Position.CM, Position.RM, 
    Position.ST, Position.ST
  ];

  for (let i = 0; i < 11; i++) {
    // Gerar um jogador com os atributos base fixados perto do targetOvr
    const p: Player = {
      ...generatePlayer(id, positionsNeeded[i], parseInt(id) * 100 + i, i + 1),
      skill: targetOvr,
      def: targetOvr, pas: targetOvr, drb: targetOvr, sht: targetOvr,
      fitness: 100, morale: 50 // Fitness alto para isolar a força
    };
    players.push(p);
    team.lineup.push(p.id);
  }

  // Bench fillers
  for (let i = 11; i < 16; i++) {
    const p: Player = {
      ...generatePlayer(id, Position.CM, parseInt(id) * 100 + i, i + 1),
      skill: targetOvr, def: targetOvr, pas: targetOvr, drb: targetOvr, sht: targetOvr,
      fitness: 100, morale: 50
    };
    players.push(p);
    team.bench.push(p.id);
  }

  return { team, players };
};

export const calculateFixturesStats = (fixtures: Fixture[]) => {
  const stats = {
    matches: 0,
    goalsHome: 0,
    goalsAway: 0,
    totalGoals: 0,
    shotsHome: 0,
    shotsAway: 0,
    cornersHome: 0,
    cornersAway: 0,
    foulsHome: 0,
    foulsAway: 0,
    yellowHome: 0,
    yellowAway: 0,
    redHome: 0,
    redAway: 0,
    offsidesHome: 0,
    offsidesAway: 0,
    penaltiesHome: 0,
    penaltiesAway: 0,
    injuriesHome: 0,
    injuriesAway: 0,
    possessionHome: 0,
    possessionAway: 0,
    homeWins: 0,
    awayWins: 0,
    draws: 0,
    goalDistribution: { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5+': 0 } as Record<string, number>,
    resultCount: {} as Record<string, number>,
    momentumStats: {
      totalGamesWithFirstGoal: 0,
      firstGoalScorerWon: 0,
      firstGoalScorerLost: 0,
      firstGoalScorerDrew: 0
    },
    // FM2D details
    shotsOnTargetHome: 0,
    shotsOnTargetAway: 0,
    xgHome: 0,
    xgAway: 0,
    dangerousAttacksHome: 0,
    dangerousAttacksAway: 0,
    boxEntriesHome: 0,
    boxEntriesAway: 0,
    accuratePassesHome: 0,
    accuratePassesAway: 0,
    totalPassesHome: 0,
    totalPassesAway: 0,
    recoveriesHome: 0,
    recoveriesAway: 0,
    successfulPressuresHome: 0,
    successfulPressuresAway: 0,
    fatigueHome: 0,
    fatigueAway: 0,
    heatmapHome: { defense: 0, midfield: 0, attack: 0 },
    heatmapAway: { defense: 0, midfield: 0, attack: 0 }
  };

  for (const fix of fixtures) {
    if (!fix.played) continue;

    stats.matches++;
    stats.goalsHome += fix.homeScore || 0;
    stats.goalsAway += fix.awayScore || 0;
    const matchGoals = (fix.homeScore || 0) + (fix.awayScore || 0);
    stats.totalGoals += matchGoals;
    
    const resultKey = `${fix.homeScore || 0}-${fix.awayScore || 0}`;
    stats.resultCount[resultKey] = (stats.resultCount[resultKey] || 0) + 1;

    if ((fix.homeScore || 0) > (fix.awayScore || 0)) stats.homeWins++;
    else if ((fix.awayScore || 0) > (fix.homeScore || 0)) stats.awayWins++;
    else stats.draws++;

    if (matchGoals >= 5) stats.goalDistribution['5+']++;
    else stats.goalDistribution[matchGoals.toString()]++;

    stats.possessionHome += fix.homePossession || 50;
    stats.possessionAway += fix.awayPossession || 50;

    let firstGoalTeam: string | null = null;

    (fix.events || []).forEach(e => {
      const isHomeEvent = e.teamId === fix.homeTeamId;
      
      if (e.type === 'GOAL') {
        if (!firstGoalTeam) firstGoalTeam = isHomeEvent ? 'HOME' : 'AWAY';
      }
      else if (e.type === 'MISS') {
        if (isHomeEvent) stats.shotsHome++; else stats.shotsAway++;
      }
      else if (e.type === 'CORNER') {
        if (isHomeEvent) stats.cornersHome++; else stats.cornersAway++;
      }
      else if (e.type === 'FOUL') {
        if (isHomeEvent) stats.foulsHome++; else stats.foulsAway++;
      }
      else if (e.type === 'CARD') {
        if (e.description.includes('🟥')) {
          if (isHomeEvent) stats.redHome++; else stats.redAway++;
        } else {
          if (isHomeEvent) stats.yellowHome++; else stats.yellowAway++;
        }
      }
      else if (e.type === 'OFFSIDE') {
        if (isHomeEvent) stats.offsidesHome++; else stats.offsidesAway++;
      }
      else if (e.type === 'INJURY') {
        if (isHomeEvent) stats.injuriesHome++; else stats.injuriesAway++;
      }
      else if (e.type === 'COMMENT' && e.description.includes('PENALTY')) {
        if (isHomeEvent) stats.penaltiesHome++; else stats.penaltiesAway++;
      }
    });

    stats.shotsHome += fix.homeScore || 0;
    stats.shotsAway += fix.awayScore || 0;

    if (firstGoalTeam) {
      stats.momentumStats.totalGamesWithFirstGoal++;
      const homeWon = (fix.homeScore || 0) > (fix.awayScore || 0);
      const awayWon = (fix.awayScore || 0) > (fix.homeScore || 0);
      const drew = (fix.homeScore || 0) === (fix.awayScore || 0);

      if ((firstGoalTeam === 'HOME' && homeWon) || (firstGoalTeam === 'AWAY' && awayWon)) {
        stats.momentumStats.firstGoalScorerWon++;
      } else if (drew) {
        stats.momentumStats.firstGoalScorerDrew++;
      } else {
        stats.momentumStats.firstGoalScorerLost++;
      }
    }

    stats.shotsOnTargetHome += fix.homeShotsOnTarget || 0;
    stats.shotsOnTargetAway += fix.awayShotsOnTarget || 0;
    stats.xgHome += fix.homeXG || 0;
    stats.xgAway += fix.awayXG || 0;
    stats.dangerousAttacksHome += fix.homeDangerousAttacks || 0;
    stats.dangerousAttacksAway += fix.awayDangerousAttacks || 0;
    stats.boxEntriesHome += fix.homeBoxEntries || 0;
    stats.boxEntriesAway += fix.awayBoxEntries || 0;
    stats.accuratePassesHome += fix.homeAccuratePasses || 0;
    stats.accuratePassesAway += fix.awayAccuratePasses || 0;
    stats.totalPassesHome += fix.homeTotalPasses || 0;
    stats.totalPassesAway += fix.awayTotalPasses || 0;
    stats.recoveriesHome += fix.homeRecoveries || 0;
    stats.recoveriesAway += fix.awayRecoveries || 0;
    stats.successfulPressuresHome += fix.homeSuccessfulPressures || 0;
    stats.successfulPressuresAway += fix.awaySuccessfulPressures || 0;
    stats.fatigueHome += fix.homeAvgFatigue || 0;
    stats.fatigueAway += fix.awayAvgFatigue || 0;

    if (fix.homeHeatmap) {
      stats.heatmapHome.defense += fix.homeHeatmap.defense || 0;
      stats.heatmapHome.midfield += fix.homeHeatmap.midfield || 0;
      stats.heatmapHome.attack += fix.homeHeatmap.attack || 0;
    }
    if (fix.awayHeatmap) {
      stats.heatmapAway.defense += fix.awayHeatmap.defense || 0;
      stats.heatmapAway.midfield += fix.awayHeatmap.midfield || 0;
      stats.heatmapAway.attack += fix.awayHeatmap.attack || 0;
    }
  }

  const m = stats.matches || 1;
  const report = {
    matches: stats.matches,
    goals: {
      total: stats.totalGoals,
      avgPerGame: (stats.totalGoals / m).toFixed(2),
      homeAvg: (stats.goalsHome / m).toFixed(2),
      awayAvg: (stats.goalsAway / m).toFixed(2)
    },
    lessThan3Goals: Object.entries(stats.resultCount).filter(([k, v]) => {
      const [h, a] = k.split('-').map(Number);
      return h + a < 3;
    }).reduce((sum, [, cnt]) => sum + cnt, 0),
    moreThan3Goals: Object.entries(stats.resultCount).filter(([k, v]) => {
      const [h, a] = k.split('-').map(Number);
      return h + a > 3;
    }).reduce((sum, [, cnt]) => sum + cnt, 0),
    exactly3Goals: Object.entries(stats.resultCount).filter(([k, v]) => {
      const [h, a] = k.split('-').map(Number);
      return h + a === 3;
    }).reduce((sum, [, cnt]) => sum + cnt, 0),
    mostCommonResult: (() => {
      let best = '';
      let bestCount = 0;
      for (const [res, cnt] of Object.entries(stats.resultCount)) {
        if (cnt > bestCount) {
          best = res;
          bestCount = cnt;
        }
      }
      return best;
    })(),
    shots: {
      avgPerGame: ((stats.shotsHome + stats.shotsAway) / m).toFixed(2)
    },
    events: {
      cornersAvg: ((stats.cornersHome + stats.cornersAway) / m).toFixed(2),
      foulsAvg: ((stats.foulsHome + stats.foulsAway) / m).toFixed(2),
      yellowCardsAvg: ((stats.yellowHome + stats.yellowAway) / m).toFixed(2),
      redCardsAvg: ((stats.redHome + stats.redAway) / m).toFixed(2),
      offsidesAvg: ((stats.offsidesHome + stats.offsidesAway) / m).toFixed(2),
      penaltiesAvg: ((stats.penaltiesHome + stats.penaltiesAway) / m).toFixed(2),
      injuriesAvg: ((stats.injuriesHome + stats.injuriesAway) / m).toFixed(2)
    },
    results: {
      homeWinPct: ((stats.homeWins / m) * 100).toFixed(1) + '%',
      awayWinPct: ((stats.awayWins / m) * 100).toFixed(1) + '%',
      drawPct: ((stats.draws / m) * 100).toFixed(1) + '%'
    },
    goalDistribution: {
      '0': ((stats.goalDistribution['0'] / m) * 100).toFixed(1) + '%',
      '1': ((stats.goalDistribution['1'] / m) * 100).toFixed(1) + '%',
      '2': ((stats.goalDistribution['2'] / m) * 100).toFixed(1) + '%',
      '3': ((stats.goalDistribution['3'] / m) * 100).toFixed(1) + '%',
      '4': ((stats.goalDistribution['4'] / m) * 100).toFixed(1) + '%',
      '5+': ((stats.goalDistribution['5+'] / m) * 100).toFixed(1) + '%'
    },
    momentum: {
      winRateWhenScoringFirst: ((stats.momentumStats.firstGoalScorerWon / Math.max(1, stats.momentumStats.totalGamesWithFirstGoal)) * 100).toFixed(1) + '%',
      drawRateWhenScoringFirst: ((stats.momentumStats.firstGoalScorerDrew / Math.max(1, stats.momentumStats.totalGamesWithFirstGoal)) * 100).toFixed(1) + '%'
    },
    fm2d: {
      possession: {
        homeAvg: (stats.possessionHome / m).toFixed(1) + '%',
        awayAvg: (stats.possessionAway / m).toFixed(1) + '%'
      },
      shots: {
        homeAvg: (stats.shotsHome / m).toFixed(1),
        awayAvg: (stats.shotsAway / m).toFixed(1)
      },
      shotsOnTarget: {
        homeAvg: (stats.shotsOnTargetHome / m).toFixed(1),
        awayAvg: (stats.shotsOnTargetAway / m).toFixed(1)
      },
      xg: {
        homeAvg: (stats.xgHome / m).toFixed(2),
        awayAvg: (stats.xgAway / m).toFixed(2)
      },
      corners: {
        homeAvg: (stats.cornersHome / m).toFixed(1),
        awayAvg: (stats.cornersAway / m).toFixed(1)
      },
      fouls: {
        homeAvg: (stats.foulsHome / m).toFixed(1),
        awayAvg: (stats.foulsAway / m).toFixed(1)
      },
      dangerousAttacks: {
        homeAvg: (stats.dangerousAttacksHome / m).toFixed(1),
        awayAvg: (stats.dangerousAttacksAway / m).toFixed(1)
      },
      boxEntries: {
        homeAvg: (stats.boxEntriesHome / m).toFixed(1),
        awayAvg: (stats.boxEntriesAway / m).toFixed(1)
      },
      passAccuracy: {
        homeAvg: stats.totalPassesHome ? ((stats.accuratePassesHome / stats.totalPassesHome) * 100).toFixed(1) + '%' : '0%',
        awayAvg: stats.totalPassesAway ? ((stats.accuratePassesAway / stats.totalPassesAway) * 100).toFixed(1) + '%' : '0%',
        homeAccurate: (stats.accuratePassesHome / m).toFixed(1),
        awayAccurate: (stats.accuratePassesAway / m).toFixed(1),
        homeTotal: (stats.totalPassesHome / m).toFixed(1),
        awayTotal: (stats.totalPassesAway / m).toFixed(1)
      },
      recoveries: {
        homeAvg: (stats.recoveriesHome / m).toFixed(1),
        awayAvg: (stats.recoveriesAway / m).toFixed(1)
      },
      successfulPressures: {
        homeAvg: (stats.successfulPressuresHome / m).toFixed(1),
        awayAvg: (stats.successfulPressuresAway / m).toFixed(1)
      },
      fatigue: {
        homeAvg: (stats.fatigueHome / m).toFixed(1) + '%',
        awayAvg: (stats.fatigueAway / m).toFixed(1) + '%'
      },
      heatmap: {
        home: {
          defense: stats.heatmapHome.defense ? Math.round((stats.heatmapHome.defense / (stats.heatmapHome.defense + stats.heatmapHome.midfield + stats.heatmapHome.attack)) * 100) + '%' : '33%',
          midfield: stats.heatmapHome.midfield ? Math.round((stats.heatmapHome.midfield / (stats.heatmapHome.defense + stats.heatmapHome.midfield + stats.heatmapHome.attack)) * 100) + '%' : '34%',
          attack: stats.heatmapHome.attack ? Math.round((stats.heatmapHome.attack / (stats.heatmapHome.defense + stats.heatmapHome.midfield + stats.heatmapHome.attack)) * 100) + '%' : '33%'
        },
        away: {
          defense: stats.heatmapAway.defense ? Math.round((stats.heatmapAway.defense / (stats.heatmapAway.defense + stats.heatmapAway.midfield + stats.heatmapAway.attack)) * 100) + '%' : '33%',
          midfield: stats.heatmapAway.midfield ? Math.round((stats.heatmapAway.midfield / (stats.heatmapAway.defense + stats.heatmapAway.midfield + stats.heatmapAway.attack)) * 100) + '%' : '34%',
          attack: stats.heatmapAway.attack ? Math.round((stats.heatmapAway.attack / (stats.heatmapAway.defense + stats.heatmapAway.midfield + stats.heatmapAway.attack)) * 100) + '%' : '33%'
        }
      }
    }
  };

  return { raw: stats, report };
};

export const runSeasonValidation = (seasons: number, teams: Team[], players: Player[]) => {
  let simulatedFixtures: Fixture[] = [];
  const relativeStrength = {
    strongVsWeak: { strongWins: 0, weakWins: 0, draws: 0 },
    strongVsMedium: { strongWins: 0, mediumWins: 0, draws: 0 },
    mediumVsWeak: { mediumWins: 0, weakWins: 0, draws: 0 }
  };

  // ==========================================
  // PARTE 1: VALIDAÇÃO DE TEMPORADAS NORMAIS
  // ==========================================
  
  if (teams.length >= 2) {
    console.log(`Simulando ${seasons} temporadas para estatísticas base...`);
    
    // Simplificação para teste rápido: rodar (seasons * 10) jogos entre os dois primeiros times
    // (Para uma temporada real, seria iterar sobre o calendário, mas isso já valida a engine)
    const t1 = teams[0];
    const t2 = teams[1];
    const totalMatchesToSimulate = seasons * 380; // Aproximação (20 times = 380 jogos/season)

    for (let i = 0; i < totalMatchesToSimulate; i++) {
      const isHomeT1 = i % 2 === 0;
      const homeTeam = isHomeT1 ? t1 : t2;
      const awayTeam = isHomeT1 ? t2 : t1;

      let fix: Fixture = {
        id: `test-${i}`,
        week: 1, date: '2024-01-01',
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeScore: 0, awayScore: 0,
        played: false, isFriendly: true, type: 'LEAGUE',
        events: []
      };

      fix = simulateMatch(fix, teams, players, 1, null, 'EN');

      simulatedFixtures.push(fix);
    }
  }

  // Calculate base stats
  const baseStats = calculateFixturesStats(simulatedFixtures);
  const stats = { ...baseStats.raw, relativeStrength };

  // ==========================================
  // PARTE 2: TESTE DE FORÇA RELATIVA (1000 jogos cada)
  // ==========================================
  console.log("Executando testes de Força Relativa...");
  
  const tForte = createArtificialTeam('9001', 'Forte', 90);
  const tMedio = createArtificialTeam('9002', 'Medio', 70);
  const tFraco = createArtificialTeam('9003', 'Fraco', 50);

  const testTeams = [tForte.team, tMedio.team, tFraco.team];
  const testPlayers = [...tForte.players, ...tMedio.players, ...tFraco.players];

  const simulateMatchup = (teamA: Team, teamB: Team) => {
    let fix: Fixture = {
      id: `test-rel`, week: 1, date: '2024-01-01',
      homeTeamId: teamA.id, awayTeamId: teamB.id,
      homeScore: 0, awayScore: 0,
      played: false, isFriendly: true, type: 'LEAGUE', events: []
    };
    return simulateMatch(fix, testTeams, testPlayers, 1, null, 'EN');
  };

  for (let i = 0; i < 1000; i++) {
    // Forte vs Fraco
    const f1 = simulateMatchup(tForte.team, tFraco.team);
    if ((f1.homeScore || 0) > (f1.awayScore || 0)) stats.relativeStrength.strongVsWeak.strongWins++;
    else if ((f1.awayScore || 0) > (f1.homeScore || 0)) stats.relativeStrength.strongVsWeak.weakWins++;
    else stats.relativeStrength.strongVsWeak.draws++;

    // Forte vs Médio
    const f2 = simulateMatchup(tForte.team, tMedio.team);
    if ((f2.homeScore || 0) > (f2.awayScore || 0)) stats.relativeStrength.strongVsMedium.strongWins++;
    else if ((f2.awayScore || 0) > (f2.homeScore || 0)) stats.relativeStrength.strongVsMedium.mediumWins++;
    else stats.relativeStrength.strongVsMedium.draws++;

    // Médio vs Fraco
    const f3 = simulateMatchup(tMedio.team, tFraco.team);
    if ((f3.homeScore || 0) > (f3.awayScore || 0)) stats.relativeStrength.mediumVsWeak.mediumWins++;
    else if ((f3.awayScore || 0) > (f3.homeScore || 0)) stats.relativeStrength.mediumVsWeak.weakWins++;
    else stats.relativeStrength.mediumVsWeak.draws++;
  }

  const finalReport = { ...baseStats.report, relativeStrength: {
      strongVsWeak: {
        strongWinRate: (relativeStrength.strongVsWeak.strongWins / 10).toFixed(1) + '%',
        weakWinRate: (relativeStrength.strongVsWeak.weakWins / 10).toFixed(1) + '%'
      },
      strongVsMedium: {
        strongWinRate: (relativeStrength.strongVsMedium.strongWins / 10).toFixed(1) + '%',
        mediumWinRate: (relativeStrength.strongVsMedium.mediumWins / 10).toFixed(1) + '%'
      },
      mediumVsWeak: {
        mediumWinRate: (relativeStrength.mediumVsWeak.mediumWins / 10).toFixed(1) + '%',
        weakWinRate: (relativeStrength.mediumVsWeak.weakWins / 10).toFixed(1) + '%'
      }
    }
  };

  return { raw: stats, report: finalReport };
};
