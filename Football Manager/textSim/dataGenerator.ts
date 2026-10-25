
import { Team, Player, Fixture, Position, Tactics } from '../types';
import { ECONOMIA_ESTADIO } from './stadiumEconomy';
import { calcularSkill } from './overall';
import { nomeDoClube } from './nomes';
import { criarRng } from './contracts';
import { REAL_TEAMS_JSON, REAL_PLAYERS_JSON, REAL_COUNTRIES_JSON } from './realDatabase';

const DEFAULT_TACTICS: Tactics = {
  formation: '4-4-2',
  style: 'Balanced',
  aggression: 'Balanced',
  pressure: 50,
  defensiveLine: 50,
  tempo: 50,
  focusSectors: ['Center']
};

const MANAGER_NAMES = [
  "Abel Ferreira", "Tite", "Fernando Diniz", "Renato Gaúcho", "Rogério Ceni", "Juan Pablo Vojvoda",
  "Dorival Júnior", "Mano Menezes", "Felipão", "Cuca", "Jorge Sampaoli", "Vanderlei Luxemburgo",
  "Odair Hellmann", "Guto Ferreira", "Vagner Mancini", "Enderson Moreira", "Lisca", "Jair Ventura",
  "Eduardo Coudet", "António Oliveira", "Pepa", "Luís Castro", "Vítor Pereira", "Paulo Sousa",
  "Domènec Torrent", "Sylvinho", "Tiago Nunes", "Maurício Barbieri", "Roger Machado", "Umberto Louzer"
];

export const COUNTRIES = REAL_COUNTRIES_JSON;

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const generatePlayer = (teamId: string, position: Position, idCounter: number, shirtNumber: number): Player => {
  const age = randomInt(17, 36);

  // Atributos base
  const def = randomInt(50, 100);
  const pas = randomInt(50, 100);
  const drb = randomInt(50, 100);
  const sht = randomInt(50, 100);

  // Cálculo de Skill (OVR) baseado na posição (textSim/overall.ts)
  let skill = calcularSkill(position, def, pas, drb, sht);

  // Bônus de "Auge" (24-30 anos)
  if (age > 24 && age < 30) {
    skill = Math.min(99, skill + randomInt(2, 5));
  }

  const finalSkill = Math.min(99, Math.max(1, skill));

  // NOVO CÁLCULO DE VALOR DE MERCADO E SALÁRIO
  // Base Value: ~100k for very low skill, escalating to ~20M+ for 80+
  // Formula: Base * (GrowthFactor ^ (Skill - Offset))
  const baseValue = 150000;
  // Grows approx 10% per skill point over 50
  const skillFactor = Math.pow(1.10, Math.max(0, finalSkill - 50));

  // Age Factor: Peak value at 22-26, decline after 30
  let ageFactor = 1.0;
  if (age < 22) ageFactor = 1.2; // Young potential
  else if (age > 30) ageFactor = Math.max(0.2, 1.0 - ((age - 30) * 0.1)); // 10% decay per year after 30

  const calculatedValue = Math.round(baseValue * skillFactor * ageFactor);

  // Salary: 0.2% of Value per week (approx 10% of value per year)
  // Keeps economy sustainable with initialCapital ~10M
  const salary = Math.max(500, Math.round(calculatedValue * 0.002));

  const expiryYear = 2024 + randomInt(1, 4);
  const expiryWeek = randomInt(1, 38);

  return {
    id: `p-${idCounter}`,
    name: nomeDoClube(criarRng(`nome|${idCounter}`), teamId),
    age,
    position,
    skill: finalSkill,
    fitness: randomInt(45, 55),
    morale: randomInt(40, 60),
    goalsScored: 0,
    assists: 0,
    appearances: 0,
    value: calculatedValue,
    salary: salary,
    contractExpiry: `W${expiryWeek} ${expiryYear}`,
    teamId,
    shirtNumber,
    def,
    pas,
    drb,
    sht,
    trainingAccumulated: { def: 0, pas: 0, drb: 0, sht: 0, mor: 0 },
    lastGrowth: { def: 0, pas: 0, drb: 0, sht: 0 },
    weeklyGrowth: 0
  };
};

const getColorHex = (colorName: string | undefined, defaultColor: string = "#94a3b8"): string => {
  if (!colorName) return defaultColor;
  if (colorName.startsWith('#')) return colorName;
  const map: Record<string, string> = {
    "green": "#166534", "red": "#b91c1c", "blue": "#1e40af", "white": "#f8fafc", "black": "#0f172a",
    "yellow": "#ca8a04", "gold": "#d97706", "orange": "#ea580c", "stripes": "#334155", "lightgray": "#cbd5e1"
  };
  return map[colorName.toLowerCase()] || defaultColor;
};

const FORMATION_ROLES: Record<string, Position[]> = {
  '4-4-2': [Position.GK, Position.LB, Position.CB, Position.CB, Position.RB, Position.LM, Position.CM, Position.CM, Position.RM, Position.ST, Position.ST],
  '4-3-3': [Position.GK, Position.LB, Position.CB, Position.CB, Position.RB, Position.DM, Position.CM, Position.CM, Position.LW, Position.RW, Position.ST],
  '4-3-3 ATA': [Position.GK, Position.LB, Position.CB, Position.CB, Position.RB, Position.CM, Position.CM, Position.AM, Position.LW, Position.RW, Position.ST],
  '3-5-2': [Position.GK, Position.CB, Position.CB, Position.CB, Position.LM, Position.DM, Position.DM, Position.RM, Position.AM, Position.ST, Position.ST],
  '5-4-1': [Position.GK, Position.LB, Position.CB, Position.CB, Position.CB, Position.RB, Position.LM, Position.CM, Position.CM, Position.RM, Position.ST],
  '5-3-2': [Position.GK, Position.LB, Position.CB, Position.CB, Position.CB, Position.RB, Position.DM, Position.CM, Position.CM, Position.ST, Position.ST],
  '4-2-3-1': [Position.GK, Position.LB, Position.CB, Position.CB, Position.RB, Position.DM, Position.DM, Position.LW, Position.AM, Position.RW, Position.ST],
};

const getLineupForFormation = (formation: string, squad: Player[]): { lineup: string[], bench: string[], score: number } => {
  const rolesNeeded = FORMATION_ROLES[formation] || FORMATION_ROLES['4-4-2'];
  const lineup: string[] = [];
  const pool = [...squad].sort((a, b) => b.skill - a.skill);
  let score = 0;

  rolesNeeded.forEach(role => {
    let bestIdx = pool.findIndex(p => p.position === role);
    if (bestIdx === -1) {
      if ([Position.LB, Position.CB, Position.RB].includes(role)) {
        bestIdx = pool.findIndex(p => [Position.LB, Position.CB, Position.RB].includes(p.position));
      } else if ([Position.DM, Position.LM, Position.CM, Position.RM, Position.AM].includes(role)) {
        bestIdx = pool.findIndex(p => [Position.DM, Position.LM, Position.CM, Position.RM, Position.AM].includes(p.position));
      } else if ([Position.LW, Position.RW, Position.SS, Position.ST].includes(role)) {
        bestIdx = pool.findIndex(p => [Position.LW, Position.RW, Position.SS, Position.ST].includes(p.position));
      }
    }
    if (bestIdx === -1) bestIdx = 0;

    if (bestIdx !== -1 && pool[bestIdx]) {
      const player = pool[bestIdx];
      lineup.push(player.id);

      let effectiveSkill = player.skill;
      if (player.position !== role) effectiveSkill *= 0.9;
      score += effectiveSkill;

      pool.splice(bestIdx, 1);
    }
  });

  // Assign Bench (10 players: 1 GK, 3 DEF, 3 MID, 3 ATT)
  const bench: string[] = [];
  const benchRequirements = [
    [Position.GK],
    [Position.LB, Position.CB, Position.RB],
    [Position.LB, Position.CB, Position.RB],
    [Position.LB, Position.CB, Position.RB],
    [Position.DM, Position.LM, Position.CM, Position.RM, Position.AM],
    [Position.DM, Position.LM, Position.CM, Position.RM, Position.AM],
    [Position.DM, Position.LM, Position.CM, Position.RM, Position.AM],
    [Position.LW, Position.RW, Position.SS, Position.ST],
    [Position.LW, Position.RW, Position.SS, Position.ST],
    [Position.LW, Position.RW, Position.SS, Position.ST]
  ];

  benchRequirements.forEach(req => {
    const candidates = pool.filter(p => req.includes(p.position));
    if (candidates.length > 0) {
      const best = candidates[0];
      bench.push(best.id);
      pool.splice(pool.indexOf(best), 1);
    } else {
      const best = pool[0];
      if (best) {
        bench.push(best.id);
        pool.splice(pool.indexOf(best), 1);
      }
    }
  });

  return { lineup, bench, score };
};

const initialLineupAssignment = (team: Team, squad: Player[]) => {
  let bestFormation = '4-4-2';
  let bestScore = -1;
  let bestLineup: string[] = [];
  let bestBench: string[] = [];

  // O Internacional joga em 4-4-2 (pedido), seja qual for a formacao que desse a melhor escalacao.
  const formacoes = team.name === 'Internacional-RS' ? ['4-4-2'] : Object.keys(FORMATION_ROLES);
  formacoes.forEach(form => {
    const res = getLineupForFormation(form, squad);
    if (res.score > bestScore) {
      bestScore = res.score;
      bestFormation = form;
      bestLineup = res.lineup;
      bestBench = res.bench;
    }
  });

  team.tactics.formation = bestFormation as Tactics['formation'];
  team.lineup = bestLineup;
  team.bench = bestBench;
};

const assignSquadShirtNumbers = (squad: Player[]) => {
  // Priority positions and their traditional numbers based on user preference
  const pattern: Record<string, number[]> = {
    [Position.GK]: [1, 12, 22],
    [Position.RB]: [2],
    [Position.CB]: [3, 4],
    [Position.LB]: [6],
    [Position.DM]: [5, 8],
    [Position.CM]: [10],
    [Position.AM]: [10], // AM also usually takes the 10
    [Position.ST]: [9],
    [Position.RM]: [7], [Position.RW]: [7],
    [Position.LM]: [11], [Position.LW]: [11],
  };

  const assignedIds = new Set<string>();
  const usedNumbers = new Set<number>();

  // Sort squad by skill so best players get "top" numbers
  const pool = [...squad].sort((a, b) => b.skill - a.skill);

  // 1. Assign traditional numbers based on position priority
  pool.forEach(player => {
    const potentialNumbers = pattern[player.position] || [];
    for (const num of potentialNumbers) {
      if (!usedNumbers.has(num)) {
        player.shirtNumber = num;
        usedNumbers.add(num);
        assignedIds.add(player.id);
        break;
      }
    }
  });

  // 2. Assign remaining players (skipping traditional ones already reserved)
  let nextAvailable = 13;
  const reserved = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 22];

  pool.forEach(player => {
    if (!assignedIds.has(player.id)) {
      while (usedNumbers.has(nextAvailable) || (reserved.includes(nextAvailable) && nextAvailable > 12 && nextAvailable !== 22)) {
        nextAvailable++;
      }
      // Double check if nextAvailable is used or in reserved list (except the ones we explicitly want to fill later)
      while (usedNumbers.has(nextAvailable)) {
        nextAvailable++;
      }

      player.shirtNumber = nextAvailable;
      usedNumbers.add(nextAvailable);
      assignedIds.add(player.id);
      nextAvailable++;
    }
  });
};

const mapPosString = (posStr: string | number): Position => {
  const s = String(posStr);
  switch (s) {
    case '1': return Position.GK;
    case '2': return Position.RB;
    case '3': return Position.LB;
    case '4': return Position.CB;
    case '5': return Position.DM;
    case '6': return Position.LM;
    case '7': return Position.RM;
    case '8': return Position.CM;
    case '9': return Position.ST;
    case '10': return Position.AM;
    case '11': return Position.RW;
    case '12': return Position.LW;
    case '13': return Position.ST;
    default: return Position.ST;
  }
};

const ENGLISH_NAMES = ["Man City", "Arsenal", "Liverpool", "Aston Villa", "Tottenham", "Chelsea", "Newcastle", "Man Utd", "West Ham", "Brighton", "Bournemouth", "Wolves", "Fulham", "Everton", "Brentford", "Nottingham Forest", "Luton Town", "Burnley", "Sheffield Utd", "Crystal Palace"];

/*
OS CLASSICOS NO MEIO DE CADA TURNO. O calendario e um todos-contra-todos pelo metodo do circulo: a ordem inicial dos clubes decide em que rodada cada par se
encontra (e o returno repete o turno na mesma ordem). Procura-se, por subida de colina com sorteio fixo (o mesmo calendario sempre), a ordem que poe os jogos entre
clubes da MESMA REGIAO — o estado nos clubes brasileiros (o sufixo do nome: Atletico-MG, Cruzeiro-MG), a cidade nos outros paises — o mais perto possivel do meio do turno.
*/
export const regiaoDoClube = (t: Team): string => {
  const m = /-([A-Z]{2})$/.exec(t.name);
  return m ? m[1] : (t.city || '').trim();
};

const rodadasDoCirculo = (ordem: number[]): Map<string, number> => {
  const n = ordem.length, rodadas = new Map<string, number>();
  const arr = [...ordem];
  for (let r = 0; r < n - 1; r++) {
    for (let m = 0; m < n / 2; m++) {
      const a = arr[m], b = arr[n - 1 - m];
      rodadas.set(a < b ? a + '-' + b : b + '-' + a, r);
    }
    arr.splice(1, 0, arr.pop()!);
  }
  return rodadas;
};

export const ordemComClassicosNoMeio = (teams: Team[], leagueId: string): string[] => {
  const n = teams.length;
  const ids = teams.map(t => t.id);
  if (n < 4 || n % 2) return ids;
  const regioes = new Map<string, number[]>();
  teams.forEach((t, i) => { const r = regiaoDoClube(t); if (r) regioes.set(r, [...(regioes.get(r) || []), i]); });
  const classicos: [number, number][] = [];
  regioes.forEach(is => { for (let a = 0; a < is.length; a++) for (let b = a + 1; b < is.length; b++) classicos.push([is[a], is[b]]); });
  if (!classicos.length) return ids;

  const meio = (n - 2) / 2;   // rodadas 0..n-2: o meio do turno
  const custo = (ordem: number[]) => {
    const rodadas = rodadasDoCirculo(ordem);
    let c = 0;
    for (const [a, b] of classicos) c += Math.abs((rodadas.get(a < b ? a + '-' + b : b + '-' + a) as number) - meio);
    return c;
  };

  // Sorteio fixo (mulberry32) a partir da liga e dos clubes: o calendario nao muda entre aberturas do jogo.
  let h = 1779033703;
  for (const ch of leagueId + ids.join(',')) h = Math.imul(h ^ ch.charCodeAt(0), 3432918353) >>> 0;
  const rnd = () => { h = (h + 0x6D2B79F5) >>> 0; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  let ordem = teams.map((_, i) => i), melhor = custo(ordem);
  for (let it = 0; it < 6000; it++) {
    const i = Math.floor(rnd() * n), j = Math.floor(rnd() * n);
    if (i === j) continue;
    [ordem[i], ordem[j]] = [ordem[j], ordem[i]];
    const c = custo(ordem);
    if (c <= melhor) melhor = c; else [ordem[i], ordem[j]] = [ordem[j], ordem[i]];
  }
  return ordem.map(i => ids[i]);
};

export const generateFixtures = (teams: Team[], leagueId: string): Fixture[] => {
  const fixtures: Fixture[] = [];
  const teamIds = ordemComClassicosNoMeio(teams, leagueId);
  const totalTeams = teamIds.length;

  if (totalTeams < 2) return [];

  const numRounds = totalTeams - 1;
  const matchesPerRound = totalTeams / 2;

  // --- Helper: generate realistic match dates ---
  // Brazilian league matches happen on specific days depending on league
  const generateMatchDates = (totalRounds: number, leagueId: string): string[] => {
    const dates: string[] = [];

    // Série A: Sat(6), Sun(0), Wed(3), Thu(4)
    // Série B: Fri(5), Sat(6), Tue(2), Wed(3)
    const allowedDays = leagueId.includes('serie_b') ? [2, 3, 5, 6] : [0, 3, 4, 6];

    let cursor = new Date('2024-04-14T12:00:00'); // Start on a Sunday (Serie A) or Friday (Serie B)
    if (leagueId.includes('serie_b')) {
      cursor = new Date('2024-04-12T12:00:00'); // Friday April 12th
    }

    const minGapDays = 3;

    for (let round = 0; round < totalRounds; round++) {
      if (round > 0) {
        // Find next valid date with at least minGapDays gap (requires jump of minGapDays + 1)
        cursor.setDate(cursor.getDate() + minGapDays + 1);
        while (!allowedDays.includes(cursor.getDay())) {
          cursor.setDate(cursor.getDate() + 1);
        }
      }
      dates.push(cursor.toISOString().split('T')[0]);
    }
    return dates;
  };

  const totalRounds = numRounds * 2; // turno + returno
  const matchDates = generateMatchDates(totalRounds, leagueId);

  // Create round robin schedule
  let roundTeams = [...teamIds];

  // First half of season
  for (let round = 0; round < numRounds; round++) {
    const week = round + 1;
    const dateStr = matchDates[round] || '2024-04-06';

    for (let match = 0; match < matchesPerRound; match++) {
      const home = roundTeams[match];
      const away = roundTeams[totalTeams - 1 - match];

      let finalHome = home;
      let finalAway = away;

      if (round % 2 === 1) {
        finalHome = away;
        finalAway = home;
      }

      if (match === 0) {
        if (round % 2 === 0) {
          finalHome = home;
          finalAway = away;
        } else {
          finalHome = away;
          finalAway = home;
        }
      }

      fixtures.push({
        id: `fix-${leagueId}-w${week}-${match}-${finalHome}-${finalAway}`,
        week,
        date: dateStr,
        homeTeamId: finalHome,
        awayTeamId: finalAway,
        homeScore: null,
        awayScore: null,
        played: false,
        isFriendly: false,
        type: 'LEAGUE',
        events: []
      });
    }

    // Rotate array: keep first element, rotate rest
    roundTeams.splice(1, 0, roundTeams.pop()!);
  }

  // Second half (Return legs)
  const firstHalf = [...fixtures];
  firstHalf.forEach(f => {
    const week = f.week + numRounds;
    const dateStr = matchDates[week - 1] || '2024-10-01';

    fixtures.push({
      id: `fix-${leagueId}-w${week}-${f.homeTeamId}-${f.awayTeamId}`,
      week,
      date: dateStr,
      homeTeamId: f.awayTeamId,
      awayTeamId: f.homeTeamId,
      homeScore: null,
      awayScore: null,
      played: false,
      isFriendly: false,
      type: 'LEAGUE',
      events: []
    });
  });

  return fixtures.sort((a, b) => a.week - b.week);
};

export const generateLeagueData = (countryId: string, leagueId: string = '') => {
  const teams: Team[] = [];
  const players: Player[] = [];

  const country = COUNTRIES.find(c => c.id === countryId);
  const league = country?.leagues.find(l => l.id === leagueId);
  const targetIds = league ? league.teamIds : [];

  let selectedTeams = REAL_TEAMS_JSON.filter((t: any) => targetIds.includes(t.teamID));

  if (countryId === 'england') {
    selectedTeams = REAL_TEAMS_JSON.filter((t: any) => targetIds.includes(t.teamID)).map((t: any, i: number) => ({
      ...t,
      teamName: ENGLISH_NAMES[i] || t.teamName,
      teamAbb: (ENGLISH_NAMES[i] || t.teamName).substring(0, 3).toUpperCase(),
      teamID: 550000 + i
    }));
  }

  let playerIdCounter = 1000 + (countryId === 'england' ? 5000 : (leagueId === 'bra_serie_b' ? 10000 : 0));

  // Shuffle managers to random teams
  const shuffledManagers = [...MANAGER_NAMES].sort(() => 0.5 - Math.random());

  selectedTeams.forEach((t: any, idx: number) => {
    const manager = shuffledManagers[idx % shuffledManagers.length] || "Unknown Manager";

    // Ensure initialCapital is a number
    const seasonBudget = t.initialCapital ? Number(t.initialCapital) : 10000000;

    // RULE: Transfer Budget is 70% of Season Budget
    const transferBudget = Math.round(seasonBudget * 0.70);

    const team: Team = {
      id: t.teamID.toString(),
      name: t.teamName,
      managerName: manager,
      teamAbb: t.teamAbb || t.teamName.substring(0, 3).toUpperCase(),
      country: countryId,
      leagueId,
      city: t.teamCityName || 'Unknown City',
      stadium: t.teamStadiumName || 'Generic Stadium',
      stadiumCapacity: (t.teamStadiumName === 'Maracanã' || t.teamStadiumName === 'Estádio do Maracanã') ? 78838 : (Math.floor((t.fanBase || 10000) * 0.45) + 15000),
      foundedYear: t.yearOfFoundation || 1900,
      strength: 0,
      chemistry: randomInt(10, 25),
      chemistryTrainingCounter: 0,
      cash: seasonBudget, // Current available funds starts as Season Budget
      initialCapital: seasonBudget,
      initialTransfer: transferBudget, // Applied rule
      sponsorAmount: t.sponsorAmount,
      fanBase: t.fanBase || 10000,
      avrAttendance: t.avrAttendance || 5000,
      // No inicio do campeonato os estadios estao a 70%; o Maracana (78 838 lugares) comeca com 22 000 torcedores.
      stadiumOccupancy: (t.teamStadiumName === 'Maracanã' || t.teamStadiumName === 'Estádio do Maracanã') ? 22000 / 78838 : ECONOMIA_ESTADIO.ocupacaoInicial,
      played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0,
      primaryColor: getColorHex(t.color1 || t.color || '#333'),
      secondaryColor: getColorHex(t.color2 || '#fff'),
      tertiaryColor: getColorHex(t.color3, 'transparent'),
      logoUrl: t.teamBadgeLocation || `/Assets/Escudos/${t.teamName.replace('Man United', 'Man Utd').replace('Nottm Forest', 'Nottingham Forest')}.png`,
      kitUrls: [
        `/Assets/Camisas/${t.teamName}_1.png`,
        `/Assets/Camisas/${t.teamName}_2.png`,
        `/Assets/Camisas/${t.teamName}_3.png`,
      ] as [string, string, string],
      tactics: { ...DEFAULT_TACTICS },
      lineup: [],
      bench: [],
      synergyMap: {}
    };

    const squad: Player[] = [];

    // Check for real players first
    const realPlayers = REAL_PLAYERS_JSON.filter((p: any) => p.team === t.teamName);

    if (realPlayers.length > 0) {
      realPlayers.forEach((p: any, index) => {
        const expiryYear = 2024 + randomInt(1, 4);
        const expiryWeek = randomInt(1, 38);

        // Calculated Salary for Real Players: 0.2% of Value to match game economy
        const calculatedSalary = Math.round(p.valPlayer * 0.002);

        squad.push({
          id: p.idPlayer ? `p-${p.idPlayer}` : `p-${playerIdCounter++}`,
          name: p.namePlayer,
          age: p.agePlayer,
          position: mapPosString(p.posPlayer),
          skill: p.ovrPlayer,
          fitness: randomInt(45, 55), // Everyone starts at 45-55% in preseason
          morale: randomInt(40, 60), // Everyone starts at 4-6 morale in preseason
          goalsScored: 0,
          assists: 0,
          appearances: 0,
          value: p.valPlayer,
          salary: Math.max(500, calculatedSalary),
          contractExpiry: `W${expiryWeek} ${expiryYear}`,
          teamId: team.id,
          shirtNumber: index + 1, // Simple sequential numbers for now if shirt number not in DB
          def: p.defPlayer,
          pas: p.pasPlayer,
          drb: p.drbplayer,
          sht: p.shtPlayer,
          trainingAccumulated: { def: 0, pas: 0, drb: 0, sht: 0, mor: 0 },
          lastGrowth: { def: 0, pas: 0, drb: 0, sht: 0 },
          weeklyGrowth: 0
        });
      });
    }

    // Fill remaining spots with generated players if needed (minimum 28 players per user request to avoid fillers)
    if (squad.length < 28) {
      const positionsNeeded = [
        Position.GK, Position.GK, Position.GK,
        Position.LB, Position.LB, Position.RB, Position.RB, Position.CB, Position.CB, Position.CB, Position.CB,
        Position.DM, Position.DM, Position.CM, Position.CM, Position.CM, Position.CM, Position.LM, Position.RM, Position.AM,
        Position.LW, Position.RW, Position.ST, Position.ST, Position.ST, Position.ST, Position.SS
      ];

      // Only fill what's missing roughly, or just add generic fillers
      const fillerCount = 28 - squad.length;
      const currentMaxShirt = squad.length > 0 ? Math.max(...squad.map(p => p.shirtNumber)) : 0;

      for (let i = 0; i < fillerCount; i++) {
        const pos = positionsNeeded[i % positionsNeeded.length];
        squad.push(generatePlayer(team.id, pos, playerIdCounter++, currentMaxShirt + 1 + i));
      }
    }

    players.push(...squad);
    team.strength = Math.round(squad.reduce((sum, p) => sum + p.skill, 0) / squad.length);
    assignSquadShirtNumbers(squad); 
    initialLineupAssignment(team, squad);
    
    // --- INITIAL SYNERGY GENERATION (Testing: 60-65% starting point) ---
    const targetSyn = 60 + Math.random() * 5; 
    const baseMin = targetSyn * 25; 
    const lineup = team.lineup;
    for (let i = 0; i < lineup.length; i++) {
        for (let j = i + 1; j < lineup.length; j++) {
            const p1 = lineup[i]; const p2 = lineup[j];
            if (!p1 || !p2) continue;
            const key = p1 < p2 ? `${p1}-${p2}` : `${p2}-${p1}`;
            team.synergyMap![key] = Math.round(baseMin * (0.8 + Math.random() * 0.4));
        }
    }

    teams.push(team);
  });

  return { teams, players };
};