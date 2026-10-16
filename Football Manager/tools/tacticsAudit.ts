/**
 * AUDITORIA TÁTICA
 * ================
 * Uso: npx tsx tools/tacticsAudit.ts [--matches=400]
 *
 * Responde duas perguntas:
 *   1. Cada instrução tática produz o efeito que promete?
 *   2. As formações se diferenciam umas das outras?
 *
 * Método: dois times MEDIANOS e equivalentes se enfrentam muitas vezes. Só uma
 * instrução do mandante muda por vez; o visitante fica sempre no padrão. Assim
 * a diferença observada só pode vir da instrução alterada.
 *
 * Cada confronto roda ida e volta (mandos invertidos) para tirar o efeito do
 * mando de campo do resultado.
 */
import { generateLeagueData, generateFixtures } from '../textSim/dataGenerator';
import { simulateMatch, buildLineupForFormation } from '../textSim/matchEngine';
import { Team, Player, Fixture, Tactics } from '../types';

const arg = (n: string, d: number) => {
  const m = process.argv.find(a => a.startsWith(`--${n}=`));
  return m ? Number(m.split('=')[1]) : d;
};
const N = arg('matches', 400);

let rng = 20260804;
Math.random = () => {
  rng |= 0; rng = (rng + 0x6D2B79F5) | 0;
  let t = Math.imul(rng ^ (rng >>> 15), 1 | rng);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const reseed = (s: number) => { rng = s >>> 0; };

const { teams, players } = generateLeagueData('45', 'bra_serie_a');
const fixtures = generateFixtures(teams, 'bra_serie_a');
const fresh = (f: Fixture): Fixture => ({
  ...f, events: [], matchDeck: undefined, homeScore: null as any, awayScore: null as any,
  possessionTimeline: [], ballZoneTimeline: [], momentumHistory: [], momentum: 0,
  redCardedHome: [], redCardedAway: [], yellowCardedHome: [], yellowCardedAway: [],
  played: false, homeLineup: undefined, awayLineup: undefined, subsUsedHome: 0, subsUsedAway: 0,
});


// ---------------------------------------------------------------------------
// PONTO DE OPERAÇÃO REALISTA
// generateLeagueData entrega o elenco em pré-temporada (preparo 45–55). No
// ciclo real da temporada o time recupera ~52 entre jogos e perde ~45 no jogo,
// então ele ENTRA EM CAMPO perto de 100. Medir com 50 calibrava o motor num
// ponto que o jogo nunca usa — e a diferença é grande (2,5 x 3,1 gols/jogo).
// ---------------------------------------------------------------------------
const KICKOFF_FITNESS = 100;
players.forEach(p => { p.fitness = KICKOFF_FITNESS; });

const ovr = (t: Team) => {
  const ps = t.lineup.map(id => players.find(p => p.id === id)).filter(Boolean) as Player[];
  return ps.reduce((a, p) => a + p.skill, 0) / (ps.length || 1);
};
const ranked = [...teams].sort((a, b) => ovr(b) - ovr(a));
const A = ranked[9], B = ranked[10];
const lineA = [...A.lineup], lineB = [...B.lineup];
const baseA: Tactics = JSON.parse(JSON.stringify(A.tactics));
const baseB: Tactics = JSON.parse(JSON.stringify(B.tactics));

type Res = { pts: number; gf: number; ga: number; poss: number; shots: number; sot: number; cards: number; fouls: number; corners: number };

/** Roda ida e volta; devolve as métricas SEMPRE do ponto de vista do time A. */
const duel = (tacA: Partial<Tactics>, tacB: Partial<Tactics>, n: number, seed: number): Res => {
  const acc: Res = { pts: 0, gf: 0, ga: 0, poss: 0, shots: 0, sot: 0, cards: 0, fouls: 0, corners: 0 };
  let games = 0;
  for (const aIsHome of [true, false]) {
    reseed(seed + (aIsHome ? 0 : 5000));
    A.tactics = { ...baseA, ...tacA };
    B.tactics = { ...baseB, ...tacB };
    // Se o teste muda a formação, a escalação é remontada para ela — senão o
    // time joga desencaixado e a formação parece pior do que é.
    const lineupFor = (t: Team, tac: Partial<Tactics>) => tac.formation
      ? buildLineupForFormation(players.filter(p => p.teamId === t.id).sort((x, y) => y.skill - x.skill), tac.formation)
      : [...t.lineup];
    A.lineup = lineupFor(A, tacA);
    B.lineup = lineupFor(B, tacB);
    const home = aIsHome ? A : B, away = aIsHome ? B : A;
    const fx = { ...fixtures[0], homeTeamId: home.id, awayTeamId: away.id, homeLineup: [...home.lineup], awayLineup: [...away.lineup] };
    for (let i = 0; i < n / 2; i++) {
      const r: any = simulateMatch(fresh(fx as Fixture), teams, players, 0, null, 'PT');
      const hs = Number(r.homeScore) || 0, as = Number(r.awayScore) || 0;
      const gf = aIsHome ? hs : as, ga = aIsHome ? as : hs;
      acc.gf += gf; acc.ga += ga;
      acc.pts += gf > ga ? 3 : (gf === ga ? 1 : 0);
      acc.poss += aIsHome ? r.homePossession : (100 - r.homePossession);
      acc.shots += aIsHome ? r.homeShots : r.awayShots;
      acc.sot += aIsHome ? r.homeShotsOnTarget : r.awayShotsOnTarget;
      acc.corners += aIsHome ? r.homeCorners : r.awayCorners;
      acc.fouls += aIsHome ? r.awayFouls : r.homeFouls; // faltas SOFRIDAS por A
      acc.cards += r.events.filter((e: any) => e.type === 'CARD' && e.teamId === A.id).length;
      games++;
    }
  }
  const k = games || 1;
  return { pts: acc.pts / k, gf: acc.gf / k, ga: acc.ga / k, poss: acc.poss / k, shots: acc.shots / k, sot: acc.sot / k, cards: acc.cards / k, fouls: acc.fouls / k, corners: acc.corners / k };
};

const row = (label: string, r: Res) =>
  `${label.padEnd(20)} ${r.pts.toFixed(2).padStart(5)} ${r.gf.toFixed(2).padStart(6)} ${r.ga.toFixed(2).padStart(6)} ${r.poss.toFixed(1).padStart(7)} ${r.shots.toFixed(1).padStart(7)} ${r.cards.toFixed(2).padStart(7)}`;
const head = (t: string) => {
  console.log(`\n\n═══ ${t} ${'═'.repeat(Math.max(0, 56 - t.length))}`);
  console.log(`${'valor'.padEnd(20)} ${'pts'.padStart(5)} ${'GP'.padStart(6)} ${'GC'.padStart(6)} ${'posse%'.padStart(7)} ${'chutes'.padStart(7)} ${'cartões'.padStart(7)}`);
};

const veredito = (nome: string, ok: boolean, detalhe: string) => {
  resultados.push({ nome, ok, detalhe });
  console.log(`   ${ok ? '✅' : '❌'} ${nome}: ${detalhe}`);
};
const resultados: { nome: string; ok: boolean; detalhe: string }[] = [];

/** Amplitude de pontos entre as opções de um slider. Alta = existe escolha ótima fixa. */
const dominancia = (rs: Res[]) => Math.max(...rs.map(r => r.pts)) - Math.min(...rs.map(r => r.pts));

console.log(`Auditoria tática — ${N} partidas por configuração (ida e volta)`);
console.log(`Times: ${A.name} (${ovr(A).toFixed(1)} OVR) x ${B.name} (${ovr(B).toFixed(1)} OVR)`);

// ---------------------------------------------------------------- ESTILO
head('ESTILO DE JOGO (style)');
const estilos: Tactics['style'][] = ['Very Defensive', 'Defensive', 'Balanced', 'Offensive', 'Very Offensive'];
const rStyle = estilos.map((s, i) => { const r = duel({ style: s }, {}, N, 100 + i); console.log(row(s, r)); return r; });
veredito('Ofensivo marca mais que defensivo', rStyle[4].gf > rStyle[0].gf + 0.15,
  `${rStyle[0].gf.toFixed(2)} → ${rStyle[4].gf.toFixed(2)} gols`);
veredito('Ofensivo sofre mais que defensivo', rStyle[4].ga > rStyle[0].ga + 0.10,
  `${rStyle[0].ga.toFixed(2)} → ${rStyle[4].ga.toFixed(2)} sofridos`);
veredito('Progressão monótona no ataque',
  rStyle.every((r, i) => i === 0 || r.gf >= rStyle[i - 1].gf - 0.08),
  rStyle.map(r => r.gf.toFixed(2)).join(' → '));

// ---------------------------------------------------------------- TEMPO
head('TEMPO (tempo)');
const tempos = [10, 30, 50, 70, 90];
const rTempo = tempos.map((v, i) => { const r = duel({ tempo: v }, {}, N, 200 + i); console.log(row(`tempo=${v}`, r)); return r; });
veredito('Tempo alto gera mais chutes', rTempo[4].shots > rTempo[0].shots + 1,
  `${rTempo[0].shots.toFixed(1)} → ${rTempo[4].shots.toFixed(1)} chutes`);
veredito('Tempo alto marca mais', rTempo[4].gf > rTempo[0].gf + 0.15,
  `${rTempo[0].gf.toFixed(2)} → ${rTempo[4].gf.toFixed(2)} gols`);
veredito('Tempo alto tem custo (sofre mais)', rTempo[4].ga > rTempo[0].ga,
  `${rTempo[0].ga.toFixed(2)} → ${rTempo[4].ga.toFixed(2)} sofridos`);
veredito('Tempo não tem valor único dominante', dominancia(rTempo) < 0.40, `amplitude ${dominancia(rTempo).toFixed(2)} pts`);

// ---------------------------------------------------------------- PRESSÃO
head('PRESSÃO (pressure)');
const pressoes = [10, 30, 50, 70, 100];
const rPress = pressoes.map((v, i) => { const r = duel({ pressure: v }, {}, N, 300 + i); console.log(row(`pressão=${v}`, r)); return r; });
veredito('Pressão aumenta a posse', rPress[4].poss > rPress[0].poss + 1.0,
  `${rPress[0].poss.toFixed(1)}% → ${rPress[4].poss.toFixed(1)}%`);
veredito('Pressão não tem valor único dominante', dominancia(rPress) < 0.40, `amplitude ${dominancia(rPress).toFixed(2)} pts`);

// ---------------------------------------------------------------- LINHA
head('LINHA DEFENSIVA (defensiveLine)');
const linhas = [10, 30, 50, 80, 100];
const rLinha = linhas.map((v, i) => { const r = duel({ defensiveLine: v }, {}, N, 400 + i); console.log(row(`linha=${v}`, r)); return r; });
veredito('Linha alta muda o resultado', Math.abs(rLinha[4].ga - rLinha[0].ga) > 0.10,
  `sofridos ${rLinha[0].ga.toFixed(2)} (baixa) vs ${rLinha[4].ga.toFixed(2)} (alta)`);
veredito('Linha não tem valor único dominante', dominancia(rLinha) < 0.40, `amplitude ${dominancia(rLinha).toFixed(2)} pts`);

// ---------------------------------------------------------------- AGRESSIVIDADE
head('AGRESSIVIDADE (aggression)');
const aggs: Tactics['aggression'][] = ['Very Passive', 'Passive', 'Balanced', 'Aggressive', 'Very Aggressive'];
const rAgg = aggs.map((v, i) => { const r = duel({ aggression: v }, {}, N, 500 + i); console.log(row(v, r)); return r; });
veredito('Agressividade gera mais cartões', rAgg[4].cards > rAgg[0].cards + 0.5,
  `${rAgg[0].cards.toFixed(2)} → ${rAgg[4].cards.toFixed(2)} cartões`);
veredito('Agressividade não tem valor único dominante', dominancia(rAgg) < 0.40, `amplitude ${dominancia(rAgg).toFixed(2)} pts`);

// ---------------------------------------------------------------- FORMAÇÃO
head('FORMAÇÃO (formation) — todos contra todos');
const forms: Tactics['formation'][] = ['5-4-1', '5-3-2', '4-4-2', '4-2-3-1', '4-3-3', '4-3-3 ATA', '3-5-2'];
const tabela: Record<string, number[]> = {};
const perfil: Record<string, { gf: number; ga: number }> = {};
forms.forEach((fa, i) => {
  tabela[fa] = []; let gf = 0, ga = 0;
  forms.forEach((fb, j) => {
    const r = duel({ formation: fa }, { formation: fb }, Math.max(120, N / 2), 600 + i * 10 + j);
    tabela[fa].push(r.pts); gf += r.gf; ga += r.ga;
  });
  perfil[fa] = { gf: gf / forms.length, ga: ga / forms.length };
});
console.log(`
${'A \ B'.padEnd(12)}${forms.map(f => f.padStart(9)).join('')}${'PTS'.padStart(8)}${'GP'.padStart(7)}${'GC'.padStart(7)}`);
const medias: number[] = [];
forms.forEach(fa => {
  const linha = tabela[fa];
  const media = linha.reduce((a, b) => a + b, 0) / linha.length;
  medias.push(media);
  console.log(`${fa.padEnd(12)}${linha.map(v => v.toFixed(2).padStart(9)).join('')}${media.toFixed(2).padStart(8)}${perfil[fa].gf.toFixed(2).padStart(7)}${perfil[fa].ga.toFixed(2).padStart(7)}`);
});

// Uma formação equilibrada DEVE render pontos parecidos. O que precisa diferir
// é o PERFIL: quem defende mais sofre menos e marca menos, e vice-versa.
const gfs = forms.map(f => perfil[f].gf), gas = forms.map(f => perfil[f].ga);
const spreadGF = Math.max(...gfs) - Math.min(...gfs);
const spreadGA = Math.max(...gas) - Math.min(...gas);
const amplitudePts = Math.max(...medias) - Math.min(...medias);
veredito('Formações têm perfis distintos (ataque)', spreadGF > 0.20, `gols feitos de ${Math.min(...gfs).toFixed(2)} a ${Math.max(...gfs).toFixed(2)}`);
// A dispersão defensiva é naturalmente menor que a ofensiva (toda formação tem
// goleiro e pelo menos 3 zagueiros). O que precisa valer é a ORDEM: quem põe
// mais gente atrás sofre menos.
const mediaGA = (fs: string[]) => fs.reduce((a, f) => a + perfil[f].ga, 0) / fs.length;
const comCinco = mediaGA(['5-4-1', '5-3-2']);
const comTres = mediaGA(['3-5-2']);
veredito('Formação com 5 defensores sofre menos que com 3', comCinco < comTres - 0.05,
  `5 atrás: ${comCinco.toFixed(2)} sofridos | 3 atrás: ${comTres.toFixed(2)}`);
veredito('Formações têm perfis distintos (defesa)', spreadGA > 0.12,
  `gols sofridos de ${Math.min(...gas).toFixed(2)} a ${Math.max(...gas).toFixed(2)}`);
veredito('Nenhuma formação domina', amplitudePts < 0.40, `amplitude de ${amplitudePts.toFixed(2)} pts entre a melhor e a pior`);

// ---------------------------------------------------------------- SETORES
head('SETORES DE FOCO (focusSectors)');
// A aba Tactics permite escolher 1 ou 2 setores — nunca os três.
const setores: [string, any][] = [
  ['Centro', ['Center']], ['Esquerda', ['Left']], ['Direita', ['Right']],
  ['Esq+Centro', ['Left', 'Center']], ['Esq+Dir', ['Left', 'Right']], ['Centro+Dir', ['Center', 'Right']],
];
const rSec = setores.map(([nome, sec], i) => { const r = duel({ focusSectors: sec }, {}, N, 700 + i); console.log(row(nome, r)); return r; });
veredito('Escolha de setor altera o jogo', Math.max(...rSec.map(r => r.gf)) - Math.min(...rSec.map(r => r.gf)) > 0.10,
  `gols de ${Math.min(...rSec.map(r => r.gf)).toFixed(2)} a ${Math.max(...rSec.map(r => r.gf)).toFixed(2)}`);

// Dominância só faz sentido contra TODOS os adversários possíveis: vencer
// atacando o lado que o adversário deixou aberto é contra-jogo, não exploit.
const secPts: number[] = [];
console.log(`
${'A \ B'.padEnd(14)}${setores.map(([n]) => n.padStart(12)).join('')}${'MÉDIA'.padStart(9)}`);
setores.forEach(([na, sa], i) => {
  const linha = setores.map(([, sb], j) => duel({ focusSectors: sa }, { focusSectors: sb }, Math.max(100, N / 3), 750 + i * 7 + j).pts);
  const m = linha.reduce((a, b) => a + b, 0) / linha.length;
  secPts.push(m);
  console.log(`${na.padEnd(14)}${linha.map(v => v.toFixed(2).padStart(12)).join('')}${m.toFixed(2).padStart(9)}`);
});
const secAmp = Math.max(...secPts) - Math.min(...secPts);
veredito('Nenhum setor domina (todos contra todos)', secAmp < 0.40, `amplitude ${secAmp.toFixed(2)} pts`);

A.tactics = baseA; B.tactics = baseB; A.lineup = lineA; B.lineup = lineB;

// ---------------------------------------------------------------- RESUMO
console.log(`\n\n═══ RESUMO ${'═'.repeat(52)}`);
const falhas = resultados.filter(r => !r.ok);
resultados.forEach(r => console.log(`${r.ok ? '✅' : '❌'} ${r.nome}`));
console.log(falhas.length === 0
  ? `\n✅ Todas as ${resultados.length} instruções surtem o efeito esperado`
  : `\n❌ ${falhas.length} de ${resultados.length} não surtem o efeito esperado`);
