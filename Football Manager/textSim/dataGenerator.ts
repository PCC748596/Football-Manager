
import { assetUrl } from './assetUrl';
import { Team, Player, Fixture, Position, Tactics } from '../types';
import { salarioSemanalDoMercado, registrarLigas } from './economia';
import { valorDeMercado } from './valuation';
import { folhaAnual } from './orcamento';
import { ECONOMIA_ESTADIO } from './stadiumEconomy';
import { calcularSkill } from './overall';
import { nomeDoClube } from './nomes';
import { DISTRIBUICAO, nomeGenerico } from './distribuicao';
import { criarRng } from './contracts';
import { gerarMedico } from './medico';
import { TREINADORES, sortearConhecimento } from './treinadores';
import { REAL_TEAMS_JSON, REAL_PLAYERS_JSON, REAL_COUNTRIES_JSON } from './realDatabase';
import { jogadoresLocaisDoClube } from './dadosLocais';
import { sortearPlayStyle } from './youth';
import { PLAYSTYLE_DA_BASE } from './playStylesDatabase';

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

/** Nivel minimo (OVR e atributos) de qualquer jogador do jogo. */
export const NIVEL_MINIMO = 50;

/*
A TABELA DE OVR DOS JOGADORES GERADOS (nao da base): em 100 jogadores 45 sao de 1 estrela (OVR 50-59), 35 de 2 (60-69), 15 de 3 (70-79), 4 de 4 (80-89) e 1 de 5 (90-100).
Adaptada a LIGA e a IDADE:
- Liga: a posicao do jogador na tabela (0 = OVR 50, 1 = OVR 100) e reescalada para o intervalo [piso, teto] da liga, que sai da faixa de OVR dos clubes dela
  ([mais forte, mais fraco]): piso = mais fraco - 8, teto = mais forte + 12. Sem liga (mercado sem clube), vale a tabela crua (50-100).
- Idade: abaixo de 22 anos desconta 1.8 OVR por ano que falta; acima de 31 desconta 1.5 por ano (o auge fica entre 22 e 31).
*/
export const TABELA_OVR_GERADOS: { ate: number; peso: number }[] = [
  { ate: 59, peso: 45 }, { ate: 69, peso: 35 }, { ate: 79, peso: 15 }, { ate: 89, peso: 4 }, { ate: 100, peso: 1 }
];
export const PISO_ABAIXO_DO_MAIS_FRACO = 8;
export const TETO_ACIMA_DO_MAIS_FORTE = 12;

/** Um OVR de 50 a 100 pela tabela (a faixa e sorteada pelo peso, o valor e uniforme dentro dela). */
export const sortearOvrDaTabela = (rnd: () => number = Math.random): number => {
  let r = rnd() * 100, de = 50;
  for (const f of TABELA_OVR_GERADOS) {
    if (r < f.peso) return de + rnd() * (f.ate - de + (f.ate === 100 ? 0 : 1));
    r -= f.peso; de = f.ate + 1;
  }
  return 50;
};

/** Ajuste de OVR pela idade: negativo antes dos 22 e depois dos 31. */
export const ajusteDeIdade = (age: number): number => (age < 22 ? -(22 - age) * 1.8 : age > 31 ? -(age - 31) * 1.5 : 0);

/** O OVR de um jogador gerado: tabela -> escala da liga (se houver) -> idade. */
export const ovrGerado = (age: number, faixa?: [number, number] | null, rnd: () => number = Math.random): number => {
  const bruto = sortearOvrDaTabela(rnd);
  let ovr = bruto;
  if (faixa) {
    const piso = faixa[1] - PISO_ABAIXO_DO_MAIS_FRACO, teto = faixa[0] + TETO_ACIMA_DO_MAIS_FORTE;
    ovr = piso + ((bruto - 50) / 50) * (teto - piso);
  }
  return Math.min(99, Math.max(NIVEL_MINIMO, Math.round(ovr + ajusteDeIdade(age))));
};

export const generatePlayer = (teamId: string, position: Position, idCounter: number, shirtNumber: number, faixaLiga?: [number, number] | null): Player => {
  const age = randomInt(17, 36);

  // O OVR vem da tabela adaptada (liga e idade); os 4 atributos giram em torno dele e sao acertados para o OVR da posicao bater (textSim/overall.ts).
  const alvo = ovrGerado(age, faixaLiga);
  const clampAtr = (v: number) => Math.min(99, Math.max(NIVEL_MINIMO, Math.round(v)));
  let def = clampAtr(alvo + randomInt(-8, 8)), pas = clampAtr(alvo + randomInt(-8, 8));
  let drb = clampAtr(alvo + randomInt(-8, 8)), sht = clampAtr(alvo + randomInt(-8, 8));
  for (let k = 0; k < 4; k++) {
    const d = alvo - calcularSkill(position, def, pas, drb, sht);
    if (d === 0) break;
    def = clampAtr(def + d); pas = clampAtr(pas + d); drb = clampAtr(drb + d); sht = clampAtr(sht + d);
  }
  const skill = calcularSkill(position, def, pas, drb, sht);

  const finalSkill = Math.min(99, Math.max(NIVEL_MINIMO, skill));

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

  const expiryYear = 2026 + randomInt(1, 4);
  const expiryWeek = randomInt(1, 38);

  return {
    id: `p-${idCounter}`,
    name: nomeDoClube(criarRng(`nome|${idCounter}`), teamId),
    age,
    position,
    skill: finalSkill,
    ...(() => { const e = randomInt(45, 55); return { energia: e, fitness: e }; })(),   // Energia inicial entre 45 e 55
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
    // O PLAYING STYLE e sorteado entre os da posicao, com a mesma chance para cada um: sem isto todo jogador gerado caia no 1.o estilo que serve a posicao (todo goleiro defensivo, todo lateral ofensivo...).
    playStyle: sortearPlayStyle(position, criarRng(`estilo|p-${idCounter}`)),
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
    "yellow": "#ca8a04", "gold": "#d97706", "orange": "#ea580c", "stripes": "#334155", "lightgray": "#cbd5e1",
    "maroon": "#7f1d1d", "lightblue": "#6cb4ee", "navy": "#1e3a8a"
  };
  return map[colorName.toLowerCase()] || defaultColor;
};

const FORMATION_ROLES: Record<string, Position[]> = {
  '4-4-2': [Position.GK, Position.LB, Position.CB, Position.CB, Position.RB, Position.LM, Position.CM, Position.CM, Position.RM, Position.ST, Position.ST],
  '4-4-2 D': [Position.GK, Position.LB, Position.CB, Position.CB, Position.RB, Position.DM, Position.CM, Position.CM, Position.AM, Position.ST, Position.ST],
  '4-4-2 ATA': [Position.GK, Position.LB, Position.CB, Position.CB, Position.RB, Position.LW, Position.CM, Position.CM, Position.RW, Position.ST, Position.ST],
  '4-3-3': [Position.GK, Position.LB, Position.CB, Position.CB, Position.RB, Position.DM, Position.CM, Position.CM, Position.LW, Position.RW, Position.ST],
  '4-3-3 ATA': [Position.GK, Position.LB, Position.CB, Position.CB, Position.RB, Position.CM, Position.CM, Position.AM, Position.LW, Position.RW, Position.ST],
  '3-5-2': [Position.GK, Position.CB, Position.CB, Position.CB, Position.LM, Position.DM, Position.DM, Position.RM, Position.AM, Position.ST, Position.ST],
  '3-5-2 ATA': [Position.GK, Position.CB, Position.CB, Position.CB, Position.DM, Position.CM, Position.CM, Position.LW, Position.RW, Position.ST, Position.ST],
  '5-4-1': [Position.GK, Position.LB, Position.CB, Position.CB, Position.CB, Position.RB, Position.LM, Position.CM, Position.CM, Position.RM, Position.ST],
  '5-3-2': [Position.GK, Position.LB, Position.CB, Position.CB, Position.CB, Position.RB, Position.DM, Position.DM, Position.CM, Position.ST, Position.ST],
  '4-2-3-1': [Position.GK, Position.LB, Position.CB, Position.CB, Position.RB, Position.DM, Position.DM, Position.LW, Position.AM, Position.RW, Position.ST],
  '4-4-2 LKU': [Position.GK, Position.LB, Position.CB, Position.CB, Position.RB, Position.LM, Position.CM, Position.CM, Position.RM, Position.SS, Position.ST],
  '4-3-3 F9': [Position.GK, Position.LB, Position.CB, Position.CB, Position.RB, Position.DM, Position.CM, Position.CM, Position.LW, Position.SS, Position.RW],
  '3-5-2 LKU': [Position.GK, Position.CB, Position.CB, Position.CB, Position.LM, Position.DM, Position.CM, Position.DM, Position.RM, Position.SS, Position.ST],
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

export const mapPosString = (posStr: string | number): Position => {
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

/** `ano`: o ano da temporada. As datas nominais sao de 2026; noutro ano desloca-se um multiplo de 52 semanas (364 dias), que preserva o dia da semana de cada rodada. */
/*
A TEMPORADA EUROPEIA (jogos de 1/7 a maio): os paises da Europa com liga completa jogam a temporada atravessando o ano (a temporada vira a 1/6). `ehLigaEuropeia(leagueId)` diz se a liga e europeia (os ids de pais 65 a 70 e 80 a 89, os mesmos das vagas
da Champions); `datasDaTemporadaEuropeia(rodadas, anoInicio)` da as datas das rodadas — a 1.a a 1/7 de `anoInicio` e as outras ao ritmo que cabe ate 23/5 do ano seguinte (sabados e tercas). `generateFixtures` so as usa quando recebe `temporadaEuropa` (o ano em que a temporada comeca); sem ele fica o calendario de sempre.
*/
export const ehLigaEuropeia = (leagueId: string): boolean => {
  const pais: any = (COUNTRIES as any[]).find(c => c.leagues.some((l: any) => l.id === leagueId));
  if (!pais) return false;
  const n = Number(pais.id);
  return (n >= 65 && n <= 70) || (n >= 80 && n <= 89);
};
export const datasDaTemporadaEuropeia = (rodadas: number, anoInicio: number): string[] => {
  // A temporada europeia do jogo vira em 1/6 e os JOGOS comecam em 1/7 (a 1.a rodada e o proprio 1/7) e vao ate 23/5 do ano seguinte; depois, rodadas a cada ~1 semana (sabado ou terca).
  const ini = new Date(`${anoInicio}-07-01T12:00:00Z`).getTime();
  const fim = new Date(`${anoInicio + 1}-05-23T12:00:00Z`).getTime();
  const passo = (fim - ini) / Math.max(1, rodadas - 1);
  const datas: string[] = [];
  let anterior = ini - 4 * 86400000;
  for (let r = 0; r < rodadas; r++) {
    const t0 = Math.max(anterior + 3 * 86400000, ini + r * passo);
    const c = new Date(t0);
    if (r > 0) while (c.getUTCDay() !== 6 && c.getUTCDay() !== 2) c.setUTCDate(c.getUTCDate() + 1);   // sabado ou terca
    datas.push(c.toISOString().slice(0, 10));
    anterior = c.getTime();
  }
  return datas;
};

export const generateFixtures = (teams: Team[], leagueId: string, ano: number = 2026, temporadaEuropa?: number): Fixture[] => {
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

    let cursor = new Date('2026-04-12T12:00:00'); // Start on a Sunday (Serie A) or Friday (Serie B)
    if (leagueId.includes('serie_b')) {
      cursor = new Date('2026-04-10T12:00:00'); // Friday April 12th
    }

    cursor.setDate(cursor.getDate() + 364 * (ano - 2026));

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
  const matchDates = (temporadaEuropa !== undefined && ehLigaEuropeia(leagueId)) ? datasDaTemporadaEuropeia(totalRounds, temporadaEuropa) : generateMatchDates(totalRounds, leagueId);

  // Create round robin schedule
  let roundTeams = [...teamIds];

  // First half of season
  for (let round = 0; round < numRounds; round++) {
    const week = round + 1;
    const dateStr = matchDates[round] || `${ano}-04-04`;

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
    const dateStr = matchDates[week - 1] || `${ano}-09-29`;

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

/*
A FAIXA DE OVR POR DIVISAO ([clube mais forte, clube mais fraco], em OVR medio do elenco). Antes a media de cada divisao saia dos jogadores reais da base e de jogadores sorteados
(50-100), e as divisoes quase nao se distinguiam (Serie B mais forte que a A, o pior da A abaixo do pior da D). Agora, depois de gerar a liga, os clubes sao reescalados para caber na faixa,
mantendo a ORDEM e a proporcao entre eles (ver `ajustarLigaParaFaixa`).
- Brasil: A 77-70, B 74-67, C 71-64, D 68-61.
- Demais paises da America do Sul: A 74-67, B 71-64.
- Europa (ligas completas): A 80-75, B 75-70, C 70-65, D 65.
- Ligas ocultas (os 'clubes' dos paises sem liga completa, que so compoem as competicoes): 75-70.
- Mexico: A 75-69, B 69-63. EUA: A 74-68, B 68-62. Japao: J1 73-67, J2 69-63, J3 65-60 (`FAIXA_OVR_POR_PAIS`).
Sem faixa definida (divisao que o jogo ainda nao tem), a liga fica como foi gerada.
*/
export const FAIXA_OVR_BRASIL: Record<number, [number, number]> = { 1: [77, 70], 2: [74, 67], 3: [71, 64], 4: [68, 61] };
export const FAIXA_OVR_AMERICA_DO_SUL: Record<number, [number, number]> = { 1: [74, 67], 2: [71, 64] };
export const FAIXA_OVR_EUROPA: Record<number, [number, number]> = { 1: [80, 75], 2: [75, 70], 3: [70, 65], 4: [65, 65] };
export const FAIXA_OVR_LIGA_OCULTA: [number, number] = [75, 70];
/** Paises com faixa propria (manda sobre a do continente): Mexico (90), EUA (91), Japao (92) e os de Africa e Asia (93 a 108). */
export const FAIXA_OVR_POR_PAIS: Record<string, Record<number, [number, number]>> = {
  '90': { 1: [75, 69], 2: [69, 63] },
  '91': { 1: [74, 68], 2: [68, 62] },
  '92': { 1: [73, 67], 2: [69, 63], 3: [65, 60] },
  // Africa e Asia (so a 1.a divisao): proporcional ao nivel dos jogadores reais de cada liga, na mesma regua do Mexico.
  '93': { 1: [67, 61] }, '94': { 1: [69, 63] }, '95': { 1: [70, 64] }, '96': { 1: [68, 62] }, '97': { 1: [70, 64] }, '98': { 1: [64, 58] }, '99': { 1: [62, 56] },
  '100': { 1: [63, 57] }, '101': { 1: [63, 57] }, '102': { 1: [68, 62] }, '103': { 1: [66, 60] },
  '104': { 1: [72, 66] }, '105': { 1: [73, 67] }, '106': { 1: [69, 63] }, '107': { 1: [71, 65] }, '108': { 1: [68, 62] },
  // Europa (grupo europa2): a regua da Inglaterra (nivel real 65.5 = topo 80), abaixo das cinco grandes ligas. Gales e semiprofissional. A Australia vai na regua da Asia.
  '70': { 1: [74, 68] }, '80': { 1: [76, 70] }, '82': { 1: [75, 69] }, '85': { 1: [77, 71] }, '87': { 1: [72, 66] }, '89': { 1: [68, 62] },
  '109': { 1: [75, 69] }, '110': { 1: [68, 62] }, '111': { 1: [71, 65] }, '112': { 1: [73, 67] }, '113': { 1: [74, 68] }, '114': { 1: [74, 68] },
  '115': { 1: [74, 68] }, '116': { 1: [58, 53] }, '117': { 1: [69, 63] }
};

/**
 * O NIVEL da base (centro de treinamento, 1 a 5) de um clube, enquanto o jogo nao tem o centro: 4 = Serie A do Brasil e a 1.a divisao da Europa;
 * 3 = 1.a divisao da America do Sul; 2 = o resto (divisoes inferiores, ligas ocultas, demais paises). Ver a tabela em youth.ts.
 */
export const nivelDaBaseDoClube = (team: { country: string; leagueId?: string }): number => {
  const pais: any = COUNTRIES.find((c: any) => c.id === team.country);
  const liga = pais?.leagues?.find((l: any) => l.id === team.leagueId);
  if (!liga || liga.hidden || liga.tier !== 1) return 2;
  if (team.country === '45' || pais?.continent === 'Europe') return 4;
  if (pais?.continent === 'South America') return 3;
  return 2;
};

/** A faixa de OVR da divisao de um clube ja criado (para o medico de saves antigos): procura a liga dele nos paises do jogo. */
export const faixaDoClube = (team: { country: string; leagueId?: string }): [number, number] | null => {
  const pais: any = COUNTRIES.find((c: any) => c.id === team.country);
  const liga = pais?.leagues?.find((l: any) => l.id === team.leagueId);
  return faixaDeOvr(team.country, liga);
};

export const faixaDeOvr = (countryId: string, league: any): [number, number] | null => {
  if (!league) return null;
  // Os clubes gerados da liga oculta do Brasil (ex.: Capivariano, do Paulistao) saem no nivel da Serie C.
  if ((league.hidden || league.tier >= 9) && countryId === '45') return FAIXA_OVR_BRASIL[3];
  if (league.hidden || league.tier >= 9) return FAIXA_OVR_LIGA_OCULTA;
  if (countryId === '45') return FAIXA_OVR_BRASIL[league.tier] || null;
  if (FAIXA_OVR_POR_PAIS[countryId]) return FAIXA_OVR_POR_PAIS[countryId][league.tier] || null;
  const pais: any = COUNTRIES.find((c: any) => c.id === countryId);
  const continente = pais?.continent;
  if (continente === 'South America') return FAIXA_OVR_AMERICA_DO_SUL[league.tier] || null;
  if (continente === 'Europe') return FAIXA_OVR_EUROPA[league.tier] || null;
  return null;
};

/*
Reescala os clubes de UMA liga para a faixa [alto, baixo]: o mais forte vai ao `alto`, o mais fraco ao `baixo` e os outros ficam na mesma proporcao entre os dois (ordem preservada).
Cada clube anda somando o mesmo numero ao OVR e aos 4 atributos de todos os seus jogadores (o OVR e a media pesada dos atributos), com o piso NIVEL_MINIMO e o teto 99; como o piso/teto
podem travar alguns, repete ate a media bater (+-0.5). Valor de mercado e salario NAO mudam (a economia do jogo foi calibrada com eles).
*/
export const ajustarLigaParaFaixa = (teams: Team[], players: Player[], faixa: [number, number]) => {
  if (!teams.length) return;
  const [alto, baixo] = faixa;
  const fortes = teams.map(t => t.strength);
  const max = Math.max(...fortes), min = Math.min(...fortes);
  const limita = (v: number) => Math.min(99, Math.max(NIVEL_MINIMO, v));
  for (const t of teams) {
    const alvo = max === min ? (alto + baixo) / 2 : baixo + ((t.strength - min) / (max - min)) * (alto - baixo);
    const elenco = players.filter(p => p.teamId === t.id);
    if (!elenco.length) continue;
    const mover = (p: Player, d: number) => {
      p.skill = limita(p.skill + d);
      p.def = limita(p.def + d); p.pas = limita(p.pas + d); p.drb = limita(p.drb + d); p.sht = limita(p.sht + d);
    };
    // 0) comprime a dispersao do elenco (jogadores sorteados de 50 a 100 davam 99 num clube pequeno): metade do desvio em torno da media do clube.
    const media0 = elenco.reduce((s, p) => s + p.skill, 0) / elenco.length;
    for (const p of elenco) mover(p, Math.round((p.skill - media0) * -0.5));
    // 1) passos inteiros ate a media ficar a menos de 1 do alvo (o piso/teto pode travar alguns jogadores, por isso repete).
    for (let i = 0; i < 8; i++) {
      const d = Math.round(alvo - elenco.reduce((s, p) => s + p.skill, 0) / elenco.length);
      if (d === 0) break;
      for (const p of elenco) mover(p, d);
    }
    // 2) ajuste fino: +-1 em alguns jogadores ate a media bater no alvo (com folga de meio ponto de uma unidade por jogador).
    for (let i = 0; i < 4; i++) {
      const falta = (alvo - elenco.reduce((s, p) => s + p.skill, 0) / elenco.length) * elenco.length;
      let k = Math.round(falta);
      if (k === 0) break;
      const sinal = k > 0 ? 1 : -1;
      for (const p of elenco) {
        if (k === 0) break;
        if (limita(p.skill + sinal) === p.skill) continue;
        mover(p, sinal); k -= sinal;
      }
    }
    // 3) teto individual: ninguem passa `alto` + TETO_ACIMA_DA_FAIXA (um jogador de 90 nao joga numa serie D); a media cai so uma fracao de ponto.
    for (const p of elenco) if (p.skill > alto + TETO_ACIMA_DA_FAIXA) mover(p, alto + TETO_ACIMA_DA_FAIXA - p.skill);
    t.strength = Math.round(elenco.reduce((s, p) => s + p.skill, 0) / elenco.length);
  }
};
/** Quantos pontos acima do clube mais forte da divisao um jogador gerado pode chegar. */
const TETO_ACIMA_DA_FAIXA = 5;

const DATA_BASE_VALOR = '2026-01-01';
export const generateLeagueData = (countryId: string, leagueId: string = '') => {
  const teams: Team[] = [];
  const players: Player[] = [];
  // Clubes com jogadores reais (json / dados locais): ja vem ajustados, a faixa de OVR nao lhes mexe.
  const comJogadoresReais = new Set<string>();

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
    // O treinador da lista (textSim/treinadores.ts); sem entrada, um nome sorteado e o conhecimento tatico pelo perfil (semente do clube: o mesmo clube da sempre o mesmo).
    const doClube = TREINADORES[t.teamName];
    const rngTreinador = criarRng('treinador|' + t.teamID);
    const manager = doClube ? doClube.nome : (shuffledManagers[idx % shuffledManagers.length] || "Unknown Manager");
    const managerTactics = doClube ? doClube.tatico : sortearConhecimento(rngTreinador).tatico;

    // Ensure initialCapital is a number
    const seasonBudget = t.initialCapital ? Number(t.initialCapital) : 10000000;

    // RULE: Transfer Budget is 80% of Season Budget (the manager can move it in 10% steps, see textSim/orcamento.ts)
    const transferBudget = Math.round(seasonBudget * 0.80);

    // PUBLICO MEDIO INICIAL: 60% da lotacao do estadio, no maximo um teto entre 30 000 e 32 000 (fixo por clube, derivado do id). O Maracana mantem os 22 000 de sempre.
    const maracana = t.teamStadiumName === 'Maracanã' || t.teamStadiumName === 'Estádio do Maracanã';
    const lotacao = maracana ? 78838 : (Math.floor((t.fanBase || 10000) * 0.45) + 15000);
    const tetoPublico = 30000 + (Number(t.teamID) * 7919) % 2001;
    const publicoInicial = maracana ? 22000 : Math.min(Math.round(lotacao * ECONOMIA_ESTADIO.ocupacaoInicial), tetoPublico);

    const team: Team = {
      id: t.teamID.toString(),
      name: t.teamName,
      managerName: manager,
      managerTactics,
      teamAbb: t.teamAbb || t.teamName.substring(0, 3).toUpperCase(),
      country: countryId,
      leagueId,
      city: t.teamCityName || 'Unknown City',
      stadium: t.teamStadiumName || 'Generic Stadium',
      stadiumCapacity: t.stadiumCapacity || ((t.teamStadiumName === 'Maracanã' || t.teamStadiumName === 'Estádio do Maracanã') ? 78838 : (Math.floor((t.fanBase || 10000) * 0.45) + 15000)),
      foundedYear: t.yearOfFoundation || 1900,
      strength: 0,
      // O departamento medico: o nivel da divisao do clube (mesma faixa de OVR dos clubes, `faixaDeOvr`).
      medico: gerarMedico(t.teamID.toString(), faixaDeOvr(countryId, league)),
      chemistry: randomInt(10, 25),
      chemistryTrainingCounter: 0,
      cash: seasonBudget, // Current available funds starts as Season Budget
      initialCapital: seasonBudget,
      initialTransfer: transferBudget, // Applied rule
      sponsorAmount: t.sponsorAmount,
      fanBase: t.fanBase || 10000,
      avrAttendance: publicoInicial,
      // No inicio do campeonato os estadios estao a 70%; o Maracana (78 838 lugares) comeca com 22 000 torcedores.
      stadiumOccupancy: (t.teamStadiumName === 'Maracanã' || t.teamStadiumName === 'Estádio do Maracanã') ? 22000 / 78838 : ECONOMIA_ESTADIO.ocupacaoInicial,
      played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0,
      primaryColor: getColorHex(t.color1 || t.color || '#333'),
      secondaryColor: getColorHex(t.color2 || '#fff'),
      tertiaryColor: getColorHex(t.color3, 'transparent'),
      // '-' = sem escudo (a base generica): o TeamShield desenha o escudo generico nas cores do clube. O mod dos dados reais (public/dados_reais) poe o caminho do escudo real.
      logoUrl: t.teamBadgeLocation === '-' ? '' : assetUrl(t.teamBadgeLocation || `/Assets/Escudos/${t.teamName.replace('Man United', 'Man Utd').replace('Nottm Forest', 'Nottingham Forest')}.png`),
      kitUrls: [
        assetUrl(`/Assets/Camisas/${t.teamName}_1.png`),
        assetUrl(`/Assets/Camisas/${t.teamName}_2.png`),
        assetUrl(`/Assets/Camisas/${t.teamName}_3.png`),
      ] as [string, string, string],
      tactics: { ...DEFAULT_TACTICS },
      lineup: [],
      bench: [],
      synergyMap: {}
    };

    const squad: Player[] = [];

    // Check for real players first
    // Dados locais (CountryData<N>.json, textSim/dadosLocais.ts) mandam sobre a base quando existem para o clube.
    const realPlayers: any[] = jogadoresLocaisDoClube(Number(t.teamID)) || REAL_PLAYERS_JSON.filter((p: any) => p.team === t.teamName);

    if (realPlayers.length > 0) {
      // So os dados locais (CountryData) e a 1.a divisao (fora do Brasil) ficam como vem; nas divisoes de baixo a base tem jogadores de 88-96 em clubes pequenos, que a faixa de OVR reescala.
      if (jogadoresLocaisDoClube(Number(t.teamID)) || (league?.tier === 1 && countryId !== '45')) comJogadoresReais.add(team.id);
      realPlayers.forEach((p: any, index) => {
        const expiryYear = 2026 + randomInt(1, 4);
        const expiryWeek = randomInt(1, 38);

        // Calculated Salary for Real Players: 0.2% of Value to match game economy
        const calculatedSalary = Math.round(p.valPlayer * 0.002);

        squad.push({
          id: p.idPlayer ? `p-${p.idPlayer}` : `p-${playerIdCounter++}`,
          ...(DISTRIBUICAO.nomesGenericos
            ? { name: nomeGenerico(p.idPlayer ? `p-${p.idPlayer}` : `p-${playerIdCounter}`, String(t.teamID)), nomeOriginal: p.namePlayer }
            : { name: p.namePlayer }),
          age: p.agePlayer,
          position: mapPosString(p.posPlayer),
          ...(p.birthDate ? { birthDate: p.birthDate } : {}),
          skill: Math.max(NIVEL_MINIMO, p.ovrPlayer),
          ...(() => { const e = randomInt(45, 55); return { energia: e, fitness: e }; })(),   // Energia inicial entre 45 e 55
          morale: randomInt(40, 60), // Everyone starts at 4-6 morale in preseason
          goalsScored: 0,
          assists: 0,
          appearances: 0,
          value: p.valPlayer,
          salary: Math.max(500, calculatedSalary),
          contractExpiry: `W${expiryWeek} ${expiryYear}`,
          teamId: team.id,
          shirtNumber: index + 1, // Simple sequential numbers for now if shirt number not in DB
          def: Math.max(NIVEL_MINIMO, p.defPlayer),
          pas: Math.max(NIVEL_MINIMO, p.pasPlayer),
          drb: Math.max(NIVEL_MINIMO, p.drbplayer),
          sht: Math.max(NIVEL_MINIMO, p.shtPlayer),
          // Quem nao tem estilo na base do 3D (PLAYSTYLE_DA_BASE) recebe um pelos atributos; quem tem, mantem o da base.
          ...(p.idPlayer && PLAYSTYLE_DA_BASE[`p-${p.idPlayer}`] ? {} : { playStyle: sortearPlayStyle(mapPosString(p.posPlayer), criarRng(`estilo|real|${p.idPlayer}|${index}`)) }),
          trainingAccumulated: { def: 0, pas: 0, drb: 0, sht: 0, mor: 0 },
          lastGrowth: { def: 0, pas: 0, drb: 0, sht: 0 },
          weeklyGrowth: 0
        });
      });
    }

    // Dados locais muito abaixo da divisao (media do plantel real menor que o clube mais fraco da faixa de OVR): sobe os reais ate o piso da faixa ANTES de gerar os tapa-buracos,
    // que saem no nivel deles. So o OVR e os 4 grupos do manager sobem; os 37 atributos do 3D ficam como no arquivo.
    const faixaLocal = jogadoresLocaisDoClube(Number(t.teamID)) ? faixaDeOvr(countryId, league) : null;
    if (faixaLocal && squad.length) {
      const d = Math.round(faixaLocal[1] - squad.reduce((a, p) => a + p.skill, 0) / squad.length);
      if (d > 0) for (const p of squad) {
        const sobe = (v: number) => Math.min(99, v + d);
        p.skill = sobe(p.skill); p.def = sobe(p.def); p.pas = sobe(p.pas); p.drb = sobe(p.drb); p.sht = sobe(p.sht);
      }
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
        const f = generatePlayer(team.id, pos, playerIdCounter++, currentMaxShirt + 1 + i, faixaDeOvr(countryId, league));
        // Clube com dados locais: o tapa-buracos sai no nivel do plantel real (sorteado de 50 a 100 daria 95 num clube da Serie D).
        if (squad.length && jogadoresLocaisDoClube(Number(t.teamID))) {
          const media = squad.slice(0, squad.length - i).reduce((a, p) => a + p.skill, 0) / Math.max(1, squad.length - i);
          const nivel = (v: number) => Math.min(99, Math.max(NIVEL_MINIMO, Math.round(media - 3 + (v - 75) * 0.2)));
          f.def = nivel(f.def); f.pas = nivel(f.pas); f.drb = nivel(f.drb); f.sht = nivel(f.sht);
          f.skill = Math.min(99, Math.max(NIVEL_MINIMO, calcularSkill(pos, f.def, f.pas, f.drb, f.sht)));
        }
        squad.push(f);
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

  // A faixa de OVR da divisao (ver FAIXA_OVR_*): reescala so os clubes de jogadores gerados.
  const faixa = faixaDeOvr(countryId, league);
  if (faixa) ajustarLigaParaFaixa(teams.filter(t => !comJogadoresReais.has(t.id)), players, faixa);

  registrarLigas(teams);
  // Salario e valor da economia da liga (textSim/economia.ts) e caixa do clube = 3 x folha anual.
  {
    players.forEach(p => {
      p.salary = salarioSemanalDoMercado(p.skill, p.age, leagueId, String(p.id));
      const fim = Number(String(p.contractExpiry).split(' ')[1]) || 2026;
      p.value = valorDeMercado({ ...p, contract: { start: DATA_BASE_VALOR, end: `${fim}-06-30`, years: 3 } } as Player, DATA_BASE_VALOR);
    });
    teams.forEach(t => {
      const capital = Math.round(folhaAnual(players.filter(p => p.teamId === t.id).map(p => p.salary)) * 3);
      const compras = Math.round(capital * 0.8);
      t.cash = capital; t.initialCapital = capital; t.initialTransfer = compras; t.transferBudget = compras;
    });
  }
  return { teams, players };
};