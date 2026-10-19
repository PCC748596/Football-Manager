/*
ESTUDO DA IA DOS TREINADORES (times da CPU) — uma temporada completa (380 jogos, 20 times) pelo mesmo caminho do jogo:
  manageCPUTeam antes de cada jogo -> simulateMatch -> desgaste/lesoes depois do jogo -> recuperacao diaria de +15 (GameContext.advanceDay, times sem treino).
Mede: todas as estatisticas do motor, as mudancas tacticas durante o jogo, as substituicoes, a fadiga dos titulares escalados, a escolha de formacao e o treino.
Uso: npx tsx tools/ia_estudo.ts [semente]
*/
import { generateLeagueData, generateFixtures } from '../textSim/dataGenerator';
import { simulateMatch, manageCPUTeam, matchFatiguePerMinute } from '../textSim/matchEngine';
import { cpuPlanoDoDia, cpuAplicarTreino } from '../textSim/trainingService';

// RECUP_FATOR (ambiente): multiplica a recuperacao diaria; < 1 aperta o calendario, para ver se o treinador roda os cansados.
const FATOR_RECUP = parseFloat(process.env.RECUP_FATOR || '1');
// Semente (Math.random determinista), para o estudo repetir.
let seed = parseInt(process.argv[2] || '12345', 10) || 12345;
Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

const { teams, players } = generateLeagueData('45', 'bra_serie_a');
players.forEach(p => { p.fitness = 100; });
let fixtures = generateFixtures(teams, 'bra_serie_a');
const byId = new Map(players.map(p => [p.id, p]));
const teamOf = new Map(teams.map(t => [t.id, t]));
const ovr = (tid: string) => { const l = players.filter(p => p.teamId === tid).sort((a, b) => b.skill - a.skill).slice(0, 14); return l.reduce((s, p) => s + p.skill, 0) / l.length; };
const forca: Record<string, number> = {}; teams.forEach(t => { forca[t.id] = ovr(t.id); });

// Todos os dias do calendario entre o primeiro e o ultimo jogo: a recuperacao e DIARIA (os dias sem jogo tambem recuperam).
const datasJogo = Array.from(new Set(fixtures.map(f => f.date))).sort();
const dias: string[] = [];
for (let d = new Date(datasJogo[0] + 'T12:00:00'); d <= new Date(datasJogo[datasJogo.length - 1] + 'T12:00:00'); d.setDate(d.getDate() + 1)) dias.push(d.toISOString().split('T')[0]);
const tab: Record<string, { j: number; v: number; e: number; d: number; gf: number; ga: number; pts: number }> = {};
teams.forEach(t => { tab[t.id] = { j: 0, v: 0, e: 0, d: 0, gf: 0, ga: 0, pts: 0 }; });

// ---- acumuladores ----
const A: any = {
  jogos: 0, gols: 0, golsCasa: 0, golsFora: 0, vitCasa: 0, emp: 0, vitFora: 0,
  chutes: 0, noAlvo: 0, xg: 0, cantos: 0, faltas: 0, amarelos: 0, vermelhos: 0, lesoes: { LIGHT: 0, MEDIUM: 0, SEVERE: 0 }, penaltis: 0,
  passes: 0, passesCertos: 0, posseCasa: 0, recuperacoes: 0, pressoes: 0, ataquesPerigosos: 0, entradasArea: 0,
  subsTotal: 0, subsPorJogo: [] as number[], subsMinuto: new Array(10).fill(0), jogosSem0Sub: 0, jogosSem5Sub: 0,
  tactics: { total: 0, porIntencao: {} as Record<string, number>, perdendoTarde: 0, ganhandoTarde: 0, empatando: 0, minutoMedio: 0, jogosComMudanca: 0, vitoriaLogoApos: 0 },
  tacticaContexto: [] as any[],
  formacao: {} as Record<string, number>, trocasDeFormacao: 0, jogosComparados: 0, formacaoPorTime: {} as Record<string, Set<string>>,
  fadiga: { titulares: 0, abaixo70: 0, abaixo50: 0, abaixo30: 0, somaFit: 0, jogosComAlgumAbaixo50: 0, jogosOnzeAbaixo80: 0, melhorOpcaoPoupada: 0, banco: { skillTit: 0, skillBanco: 0, n: 0 } },
  subidosCansados: { saiuFitMedio: 0, entrouFitMedio: 0, n: 0 },
  treino: { sessoes: 0, dias: 0, skillInicial: players.reduce((s, p) => s + p.skill, 0) / players.length, attrInicial: players.reduce((s, p) => s + p.def + p.pas + p.drb + p.sht, 0) / players.length },
  golsPorMinuto: new Array(10).fill(0),
  golsDepoisDeMudanca: { atacaTarde: { jogos: 0, golsMarcados: 0, golsSofridos: 0 } },
  resultados: { viradas: 0, seguraramVantagem: 0, perderamVantagem: 0, comVantagemIntervalo: 0 },
  lesionadosEscalados: 0, escalacoesSemGK: 0, forcaVsPontos: [] as number[][],
};
const ultimaFormacao: Record<string, string> = {};
const jogosPorTime: Record<string, number> = {};
const minutosRecentes: Record<string, number[]> = {};

const placarAte = (events: any[], min: number, homeId: string) => { let h = 0, a = 0; for (const e of events) { if (e.type === 'GOAL' && e.minute <= min) { if (e.teamId === homeId) h++; else a++; } } return [h, a]; };

for (const dia of dias) {
  const jogosDoDia = fixtures.filter(f => f.date === dia);
  for (const f of jogosDoDia) {
    const home = teamOf.get(f.homeTeamId)!, away = teamOf.get(f.awayTeamId)!;
    manageCPUTeam(home, away, players);
    manageCPUTeam(away, home, players);
    // formacao escolhida
    for (const t of [home, away]) {
      const form = t.tactics.formation;
      A.formacao[form] = (A.formacao[form] || 0) + 1;
      if (ultimaFormacao[t.id]) { A.jogosComparados++; if (ultimaFormacao[t.id] !== form) A.trocasDeFormacao++; }
      ultimaFormacao[t.id] = form;
      (A.formacaoPorTime[t.id] = A.formacaoPorTime[t.id] || new Set()).add(form);
    }
    // fadiga dos escalados (antes do jogo)
    const iniLineups: Record<string, string[]> = { [home.id]: [...home.lineup], [away.id]: [...away.lineup] };
    for (const t of [home, away]) {
      const lu = t.lineup.map(id => byId.get(id)!).filter(Boolean);
      const elenco = players.filter(p => p.teamId === t.id && !p.injury);
      let algum50 = false, todos80 = true;
      for (const p of lu) {
        A.fadiga.titulares++; A.fadiga.somaFit += p.fitness;
        if (p.fitness < 70) A.fadiga.abaixo70++;
        if (p.fitness < 50) { A.fadiga.abaixo50++; algum50 = true; }
        if (p.fitness < 30) A.fadiga.abaixo30++;
        if (p.fitness < 80) todos80 = false;
        if (p.injury) A.lesionadosEscalados++;
        // havia alternativa descansada da mesma posicao no banco?
        if (p.fitness < 60) {
          const alt = elenco.find(q => !t.lineup.includes(q.id) && q.position === p.position && q.fitness >= 85 && q.skill >= p.skill - 6);
          if (alt) A.fadiga.melhorOpcaoPoupada++;
        }
      }
      if (algum50) A.fadiga.jogosComAlgumAbaixo50++;
      if (todos80) A.fadiga.jogosOnzeAbaixo80++;
      A.fadiga.banco.skillTit += lu.reduce((s, p) => s + p.skill, 0) / (lu.length || 1);
      const bn = (t.bench || []).map(id => byId.get(id)!).filter(Boolean);
      A.fadiga.banco.skillBanco += bn.reduce((s, p) => s + p.skill, 0) / (bn.length || 1);
      A.fadiga.banco.n++;
      if (!lu.some(p => p.position === 'GK')) A.escalacoesSemGK++;
    }

    const r: any = simulateMatch(f, teams, players, 0, null, 'EN');
    A.jogos++;
    A.gols += r.homeScore + r.awayScore; A.golsCasa += r.homeScore; A.golsFora += r.awayScore;
    if (r.homeScore > r.awayScore) A.vitCasa++; else if (r.homeScore < r.awayScore) A.vitFora++; else A.emp++;
    A.chutes += r.homeShots + r.awayShots; A.noAlvo += r.homeShotsOnTarget + r.awayShotsOnTarget; A.xg += r.homeXG + r.awayXG;
    A.cantos += r.homeCorners + r.awayCorners; A.faltas += r.homeFouls + r.awayFouls;
    A.passes += r.homeTotalPasses + r.awayTotalPasses; A.passesCertos += r.homeAccuratePasses + r.awayAccuratePasses;
    A.posseCasa += r.homePossession; A.recuperacoes += r.homeRecoveries + r.awayRecoveries; A.pressoes += r.homeSuccessfulPressures + r.awaySuccessfulPressures;
    A.ataquesPerigosos += r.homeDangerousAttacks + r.awayDangerousAttacks; A.entradasArea += r.homeBoxEntries + r.awayBoxEntries;

    // tabela
    const H = tab[home.id], Aw = tab[away.id];
    H.j++; Aw.j++; H.gf += r.homeScore; H.ga += r.awayScore; Aw.gf += r.awayScore; Aw.ga += r.homeScore;
    if (r.homeScore > r.awayScore) { H.v++; H.pts += 3; Aw.d++; } else if (r.homeScore < r.awayScore) { Aw.v++; Aw.pts += 3; H.d++; } else { H.e++; Aw.e++; H.pts++; Aw.pts++; }

    // eventos
    const ev: any[] = r.events || [];
    let subsH = 0, subsA = 0, jogoComTactics = false;
    const minutoSaiu: Record<string, number> = {};
    for (const e of ev) {
      if (e.type === 'CARD') { if (e.description?.includes('🟥')) A.vermelhos++; else A.amarelos++; }
      if (e.type === 'INJURY') { A.lesoes[e.injurySeverity || 'LIGHT']++; }
      if (e.type === 'COMMENT' && (e.description || '').includes('⭕')) A.penaltis++;
      if (e.type === 'GOAL') A.golsPorMinuto[Math.min(9, Math.floor((e.minute - 1) / 10))]++;
      if (e.type === 'SUB') {
        A.subsTotal++; A.subsMinuto[Math.min(9, Math.floor((e.minute - 1) / 10))]++;
        if (e.teamId === home.id) subsH++; else subsA++;
      }
      if (e.type === 'TACTICS') {
        jogoComTactics = true;
        const quemId = e.teamId as string; const ehCasa = quemId === home.id;
        const [h, a] = placarAte(ev, e.minute, home.id); const diff = ehCasa ? h - a : a - h;
        const d = (e.description || '').toLowerCase();
        const intencao = d.includes('all-out') ? 'ATTACK' : d.includes('counter') ? 'COUNTER' : d.includes('keep possession') ? 'POSSESS' : d.includes('sit back') ? 'RETREAT' : d.includes('high press') ? 'PRESS' : (d.includes('game plan') || d.includes('plano de jogo')) ? 'BALANCED' : '?';
        A.tactics.total++; A.tactics.porIntencao[intencao] = (A.tactics.porIntencao[intencao] || 0) + 1;
        A.tactics.minutoMedio += e.minute;
        if (diff < 0 && e.minute > 60) A.tactics.perdendoTarde++;
        else if (diff > 0 && e.minute > 60) A.tactics.ganhandoTarde++;
        else if (diff === 0) A.tactics.empatando++;
        if (A.tacticaContexto.length < 25) A.tacticaContexto.push({ min: e.minute, diff, desc: e.description });
      }
    }
    if (jogoComTactics) A.tactics.jogosComMudanca++;
    A.subsPorJogo.push(subsH, subsA);
    for (const s of [subsH, subsA]) { if (s === 0) A.jogosSem0Sub++; if (s >= 5) A.jogosSem5Sub++; }

    // quem saiu/entrou (titulares vs lineup final)
    for (const [tid, final] of [[home.id, r.homeLineup as string[]], [away.id, r.awayLineup as string[]]] as [string, string[]][]) {
      const ini = iniLineups[tid];
      const saiu = ini.filter(id => !final.includes(id)), entrou = final.filter(id => !ini.includes(id));
      const mediaIni = ini.reduce((s, id) => s + (byId.get(id)?.fitness ?? 0), 0) / ini.length;
      saiu.forEach(id => { A.subidosCansados.saiuFitMedio += (byId.get(id)?.fitness ?? 0) - mediaIni; A.subidosCansados.n++; });
      entrou.forEach(id => { A.subidosCansados.entrouFitMedio += (byId.get(id)?.fitness ?? 0) - mediaIni; });
    }

    // resultado: virada / vantagem ao intervalo
    for (const [tid, ehCasa] of [[home.id, true], [away.id, false]] as [string, boolean][]) {
      const [hi, ai] = placarAte(ev, 45, home.id); const vantInt = ehCasa ? hi - ai : ai - hi;
      const vantFim = ehCasa ? r.homeScore - r.awayScore : r.awayScore - r.homeScore;
      if (vantInt > 0) { A.resultados.comVantagemIntervalo++; if (vantFim > 0) A.resultados.seguraramVantagem++; else A.resultados.perderamVantagem++; }
      if (vantInt < 0 && vantFim > 0) A.resultados.viradas++;
    }

    // ---- desgaste e lesoes (como o GameContext) ----
    const minutosOut: Record<string, number> = {};
    for (const [tid, final] of [[home.id, r.homeLineup as string[]], [away.id, r.awayLineup as string[]]] as [string, string[]][]) {
      const t = teamOf.get(tid)!;
      const ini = iniLineups[tid];
      const subEv = ev.filter(e => e.type === 'SUB' && e.teamId === tid);
      const entrouMin: Record<string, number> = {}; subEv.forEach(e => { if (e.playerId) entrouMin[e.playerId] = e.minute; });
      const saidas = subEv.map(e => e.minute).sort((a, b) => a - b);
      ini.forEach(id => { if (final.includes(id)) minutosOut[id] = 90; });
      const saiu = ini.filter(id => !final.includes(id));
      saiu.forEach((id, i) => { minutosOut[id] = saidas[i] ?? 70; });
      final.forEach(id => { if (!ini.includes(id)) minutosOut[id] = 90 - (entrouMin[id] ?? 60); });
      for (const id of Object.keys(minutosOut)) {
        if (!(id in minutosOut)) continue;
      }
    }
    for (const [id, mins] of Object.entries(minutosOut)) {
      const p = byId.get(id); if (!p) continue;
      const t = teamOf.get(p.teamId)!;
      p.fitness = Math.max(0, p.fitness - matchFatiguePerMinute(t.tactics, p.position) * mins + 3);
    }
    for (const e of ev) if (e.type === 'INJURY' && e.playerId) {
      const p = byId.get(e.playerId); if (!p) continue;
      const drop = e.injurySeverity === 'SEVERE' ? 80 : e.injurySeverity === 'MEDIUM' ? 50 : 25;
      p.fitness = Math.max(0, p.fitness - drop);
      (p as any).injury = { daysOut: e.injuryDaysOut || 5, name: e.injuryName };
    }
  }
  // recuperacao diaria (times sem treino: +15; lesionado +15 e conta os dias)
  // recuperacao e treino do dia: o plano do treinador da CPU (descansa na vespera do jogo ou com o grupo cansado; senao treina)
  const planos = new Map<string, { recuperacao: number; treina: boolean }>();
  for (const t of teams) {
    const prox = fixtures.filter(f => f.date > dia && (f.homeTeamId === t.id || f.awayTeamId === t.id)).map(f => f.date).sort()[0];
    const dd = prox ? Math.round((new Date(prox + 'T12:00:00').getTime() - new Date(dia + 'T12:00:00').getTime()) / 86400000) : 7;
    const plano = cpuPlanoDoDia(players.filter(p => p.teamId === t.id), dd);
    planos.set(t.id, plano); A.treino.dias = (A.treino.dias || 0) + 1; if (plano.treina) A.treino.sessoes++;
  }
  players.forEach(p => {
    const plano = planos.get(p.teamId)!;
    p.fitness = Math.min(100, p.fitness + (p.injury ? 15 : plano.recuperacao) * FATOR_RECUP);
    if (plano.treina) cpuAplicarTreino(p);
    const inj = (p as any).injury; if (inj) { if (inj.daysOut > 1) inj.daysOut--; else (p as any).injury = undefined; }
  });
}

// ---------------- relatorio ----------------
const n = A.jogos, f1 = (x: number) => x.toFixed(2);
const linhas: string[] = [];
const L = (s = '') => linhas.push(s);
L(`ESTUDO DA IA — temporada de ${n} jogos, ${teams.length} times, semente ${process.argv[2] || 12345}`);
L('');
L('== ESTATISTICAS DO MOTOR (por jogo) ==');
L(`Golos ${f1(A.gols / n)} (casa ${f1(A.golsCasa / n)} / fora ${f1(A.golsFora / n)}) | vitorias casa ${(100 * A.vitCasa / n).toFixed(1)}% empates ${(100 * A.emp / n).toFixed(1)}% fora ${(100 * A.vitFora / n).toFixed(1)}%`);
L(`Remates ${f1(A.chutes / n)} (no alvo ${f1(A.noAlvo / n)} = ${(100 * A.noAlvo / A.chutes).toFixed(1)}%) | xG ${f1(A.xg / n)} | golos/remate ${(100 * A.gols / A.chutes).toFixed(1)}%`);
L(`Cantos ${f1(A.cantos / n)} | faltas ${f1(A.faltas / n)} | amarelos ${f1(A.amarelos / n)} | vermelhos ${f1(A.vermelhos / n)} | penaltis ${f1(A.penaltis / n)}`);
L(`Passes ${f1(A.passes / n)} (certos ${(100 * A.passesCertos / A.passes).toFixed(1)}%) | posse casa ${f1(A.posseCasa / n)}% | recuperacoes ${f1(A.recuperacoes / n)} | pressoes ${f1(A.pressoes / n)} | ataques perigosos ${f1(A.ataquesPerigosos / n)} | entradas na area ${f1(A.entradasArea / n)}`);
L(`Lesoes por jogo: leve ${f1(A.lesoes.LIGHT / n)} media ${f1(A.lesoes.MEDIUM / n)} grave ${f1(A.lesoes.SEVERE / n)}`);
L(`Golos por faixa de 10 min: ${A.golsPorMinuto.map((g: number) => f1(g / n)).join(' | ')}`);
L(`Resultado: viradas ${A.resultados.viradas} | com vantagem no intervalo ${A.resultados.comVantagemIntervalo} (seguraram ${A.resultados.seguraramVantagem}, perderam ${A.resultados.perderamVantagem})`);
L('');
L('== TABELA FINAL ==');
const classif = Object.entries(tab).sort((a, b) => b[1].pts - a[1].pts || (b[1].gf - b[1].ga) - (a[1].gf - a[1].ga));
classif.forEach(([id, t], i) => L(`${String(i + 1).padStart(2)}. ${teamOf.get(id)!.name.padEnd(22)} forca ${forca[id].toFixed(1)}  J${t.j} V${t.v} E${t.e} D${t.d}  ${t.gf}:${t.ga}  ${t.pts} pts`));
const xs = classif.map(([id]) => forca[id]), ys = classif.map(([, t]) => t.pts);
const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
const corr = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0) * ys.reduce((s, y) => s + (y - my) ** 2, 0));
L(`Correlacao forca do elenco x pontos: ${corr.toFixed(2)} | campeao ${ys[0]} pts, lanterna ${ys[ys.length - 1]} pts`);
L('');
L('== IA: MUDANCAS TACTICAS DURANTE O JOGO ==');
L(`Mudancas totais ${A.tactics.total} em ${A.tactics.jogosComMudanca} de ${n} jogos (${(100 * A.tactics.jogosComMudanca / n).toFixed(1)}%); minuto medio ${A.tactics.total ? (A.tactics.minutoMedio / A.tactics.total).toFixed(0) : '-'}`);
L(`Por intencao: ${JSON.stringify(A.tactics.porIntencao)}`);
L(`Contexto: perdendo apos o min 60: ${A.tactics.perdendoTarde} | ganhando apos o min 60: ${A.tactics.ganhandoTarde} | empatando: ${A.tactics.empatando}`);
L(`Exemplos: ${A.tacticaContexto.slice(0, 8).map((x: any) => `${x.min}' (${x.diff >= 0 ? '+' : ''}${x.diff}) ${x.desc}`).join(' || ')}`);
L('');
L('== IA: SUBSTITUICOES ==');
L(`Subs por jogo (as duas equipas somadas) ${f1(A.subsTotal / n)} | por equipa ${f1(A.subsTotal / (2 * n))} | equipas sem nenhuma troca: ${A.jogosSem0Sub} de ${2 * n} | com 5 trocas: ${A.jogosSem5Sub}`);
L(`Subs por faixa de 10 min: ${A.subsMinuto.map((g: number) => f1(g / n)).join(' | ')}`);
L(`Quem sai: fitness medio ${f1(A.subidosCansados.saiuFitMedio / Math.max(1, A.subidosCansados.n))} em relacao a media do onze inicial; quem entra: ${f1(A.subidosCansados.entrouFitMedio / Math.max(1, A.subidosCansados.n))}`);
L('');
L('== IA: ESCALACAO E FADIGA ==');
const F = A.fadiga;
L(`Titulares escalados: ${F.titulares} | fitness medio ${f1(F.somaFit / F.titulares)} | < 70: ${(100 * F.abaixo70 / F.titulares).toFixed(1)}% | < 50: ${(100 * F.abaixo50 / F.titulares).toFixed(1)}% | < 30: ${(100 * F.abaixo30 / F.titulares).toFixed(2)}%`);
L(`Equipas que escalaram ao menos um titular < 50: ${F.jogosComAlgumAbaixo50} de ${2 * n} | com alternativa descansada da mesma posicao no banco (titular < 60): ${F.melhorOpcaoPoupada} casos`);
L(`Skill medio titulares ${f1(F.banco.skillTit / F.banco.n)} x banco ${f1(F.banco.skillBanco / F.banco.n)} | lesionados escalados: ${A.lesionadosEscalados} | escalacoes sem GK: ${A.escalacoesSemGK}`);
L('');
L('== IA: FORMACAO ==');
L(`Formacoes usadas: ${JSON.stringify(A.formacao)}`);
L(`Trocas de formacao entre jogos consecutivos do mesmo time: ${A.trocasDeFormacao} de ${A.jogosComparados} (${(100 * A.trocasDeFormacao / A.jogosComparados).toFixed(0)}%) | formacoes distintas por time: ${Object.values(A.formacaoPorTime).map((s: any) => s.size).join(',')}`);
L('');
L('== IA: TREINO ==');
const skillFinal = players.reduce((s, p) => s + p.skill, 0) / players.length;
const attrFinal = players.reduce((s, p) => s + p.def + p.pas + p.drb + p.sht, 0) / players.length;
L(`Dias de treino: ${A.treino.sessoes} de ${A.treino.dias} dias-equipa (${(100 * A.treino.sessoes / A.treino.dias).toFixed(0)}%) | soma media dos 4 atributos por jogador: inicio ${A.treino.attrInicial.toFixed(2)} fim ${attrFinal.toFixed(2)} (+${(attrFinal - A.treino.attrInicial).toFixed(2)}) | skill medio ${A.treino.skillInicial.toFixed(3)} -> ${skillFinal.toFixed(3)}`);
console.log(linhas.join('\n'));
