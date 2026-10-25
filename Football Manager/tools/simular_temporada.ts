/*
Simula UMA temporada inteira de todas as ligas do mundo (o modelo rapido de textSim/world.ts) e escreve o relatorio em 1Season.md.
Uso: npx tsx tools/simular_temporada.ts
*/
import { writeFileSync } from 'node:fs';
import { COUNTRIES } from '../textSim/dataGenerator';
import { REAL_TEAMS_JSON } from '../textSim/realDatabase';
import { createWorld, buildTable } from '../textSim/world';
import { planearAcessosEDescensos } from '../textSim/promocoes';

const t0 = Date.now();
const mundo = createWorld(undefined, '2099-12-31');
const seg = ((Date.now() - t0) / 1000).toFixed(1);

const linhas: string[] = [];
const L = (s = '') => linhas.push(s);
const pct = (a: number, b: number) => (b ? (100 * a / b).toFixed(1) + '%' : '-');

L('# 1Season — simulação de uma temporada inteira');
L('');
L('Gerado por `tools/simular_temporada.ts` (modelo rápido do `textSim/world.ts`: golos de Poisson a partir da diferença de força; tempo de execução ' + seg + ' s).');
L('Todas as ligas do mundo jogam o calendário completo. Copas e a Série C/D (fase de grupos e mata-mata) não entram aqui: são competições à parte (`textSim/competitions.ts`).');
L('');

const resumo: any[] = [];
const porLiga: Record<string, any> = {};
for (const l of mundo) {
  if (l.oculta) continue;
  const jogos = l.fixtures.filter(f => !f.isFriendly && (f.type === undefined || f.type === 'LEAGUE'));
  const jogados = jogos.filter(f => f.played);
  const tabela = buildTable(l.teams, jogados);
  let gols = 0, casa = 0, emp = 0, fora = 0, jogosSemGol = 0;
  let maior: any = null;
  for (const f of jogados) {
    const h = f.homeScore || 0, a = f.awayScore || 0;
    gols += h + a;
    if (h > a) casa++; else if (a > h) fora++; else emp++;
    if (h + a === 0) jogosSemGol++;
    if (!maior || Math.abs(h - a) > Math.abs(maior.h - maior.a) || (Math.abs(h - a) === Math.abs(maior.h - maior.a) && h + a > maior.h + maior.a)) maior = { h, a, f };
  }
  const nome = (id: string) => l.teams.find(t => t.id === id)?.name || id;
  const melhorAtaque = [...tabela].sort((x, y) => y.gf - x.gf)[0];
  const melhorDefesa = [...tabela].sort((x, y) => x.ga - y.ga)[0];
  const rodadas = Math.max(0, ...jogos.map(f => f.week || 0));
  porLiga[l.leagueId] = { l, tabela, jogos, jogados, gols, jogosSemGol, maior, melhorAtaque, melhorDefesa, nome, rodadas };
  resumo.push({ pais: l.countryName, liga: l.leagueName, id: l.leagueId, tier: l.tier, clubes: l.teams.length, jogos: jogos.length, jogados: jogados.length, gols, mediaGols: jogados.length ? gols / jogados.length : 0, casa, emp, fora, campeao: tabela[0]?.team.name, campeaoPts: tabela[0]?.points, rebaixados: l.relegated });
}

L('## Resumo de todas as ligas');
L('');
L('| País | Liga | Div. | Clubes | Jogos (jogados/total) | Golos | Golos/jogo | Casa | Empate | Fora | Campeão (pts) | Rebaixados (config.) |');
L('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|');
for (const r of resumo) L('| ' + r.pais + ' | ' + r.liga + ' | ' + r.tier + ' | ' + r.clubes + ' | ' + r.jogados + '/' + r.jogos + ' | ' + r.gols + ' | ' + r.mediaGols.toFixed(2) + ' | ' + pct(r.casa, r.jogados) + ' | ' + pct(r.emp, r.jogados) + ' | ' + pct(r.fora, r.jogados) + ' | ' + r.campeao + ' (' + r.campeaoPts + ') | ' + r.rebaixados + ' |');
L('');
const totJogos = resumo.reduce((s, r) => s + r.jogados, 0), totGols = resumo.reduce((s, r) => s + r.gols, 0);
L('**Total:** ' + resumo.length + ' ligas, ' + totJogos + ' jogos, ' + totGols + ' golos (' + (totGols / Math.max(1, totJogos)).toFixed(2) + ' por jogo).');
L('');

L('## Detalhe por liga');
for (const r of resumo) {
  const d = porLiga[r.id];
  L('');
  L('### ' + r.pais + ' — ' + r.liga + ' (divisão ' + r.tier + ')');
  L('');
  L('- Clubes: ' + r.clubes + ' · jogos: ' + r.jogados + '/' + r.jogos + ' · rodadas: ' + d.rodadas + ' · golos: ' + r.gols + ' (' + r.mediaGols.toFixed(2) + ' por jogo) · jogos sem golos: ' + d.jogosSemGol + ' (' + pct(d.jogosSemGol, r.jogados) + ')');
  L('- Resultados: casa ' + pct(r.casa, r.jogados) + ' · empate ' + pct(r.emp, r.jogados) + ' · fora ' + pct(r.fora, r.jogados));
  if (d.maior) L('- Maior goleada: ' + d.nome(d.maior.f.homeTeamId) + ' ' + d.maior.h + ' x ' + d.maior.a + ' ' + d.nome(d.maior.f.awayTeamId));
  L('- Melhor ataque: ' + d.melhorAtaque.team.name + ' (' + d.melhorAtaque.gf + ') · melhor defesa: ' + d.melhorDefesa.team.name + ' (' + d.melhorDefesa.ga + ')');
  L('- Campeão: **' + d.tabela[0].team.name + '** (' + d.tabela[0].points + ' pts) · vice: ' + (d.tabela[1] ? d.tabela[1].team.name + ' (' + d.tabela[1].points + ' pts)' : '-'));
  const rz = r.rebaixados;
  const lanternas = d.tabela.slice(-Math.max(rz, 1)).map((x: any) => x.team.name).join(', ');
  L('- ' + (rz > 0 ? 'Zona de rebaixamento configurada (' + rz + ' últimos): ' + lanternas : 'Sem rebaixamento configurado. Lanterna: ' + lanternas));
  const porForca = [...d.l.teams].sort((a: any, b: any) => b.strength - a.strength);
  const posDe = (id: string) => d.tabela.findIndex((x: any) => x.team.id === id) + 1;
  const fortissimo = porForca[0], fraquissimo = porForca[porForca.length - 1];
  L('- Clube de maior OVR: ' + fortissimo.name + ' (OVR ' + fortissimo.strength + ') acabou em ' + posDe(fortissimo.id) + '.º · de menor OVR: ' + fraquissimo.name + ' (OVR ' + fraquissimo.strength + ') acabou em ' + posDe(fraquissimo.id) + '.º');
  L('');
  L('| # | Clube | OVR | J | V | E | D | GP | GC | SG | Pts |');
  L('|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  d.tabela.forEach((x: any, i: number) => {
    const marca = (rz > 0 && i >= d.tabela.length - rz) ? ' ⬇' : (i === 0 ? ' 🏆' : '');
    L('| ' + (i + 1) + ' | ' + x.team.name + marca + ' | ' + x.team.strength + ' | ' + x.played + ' | ' + x.won + ' | ' + x.drawn + ' | ' + x.lost + ' | ' + x.gf + ' | ' + x.ga + ' | ' + x.gd + ' | ' + x.points + ' |');
  });
}

L('');
L('## Acessos e descensos');
L('');
L('Configuração das divisões (`COUNTRIES`, em `textSim/realDatabase.ts`) e o que a simulação fez com ela.');
L('');
L('| País | Divisão | Liga | Clubes | Rebaixados (config.) | Promovidos (config.) |');
L('|---|---:|---|---:|---:|---:|');
const problemas: string[] = [];
for (const c of COUNTRIES as any[]) {
  const ligas = [...c.leagues].sort((a: any, b: any) => a.tier - b.tier);
  ligas.forEach((lg: any, i: number) => {
    const n = (lg.teamIds || []).length;
    L('| ' + c.name + ' | ' + lg.tier + ' | ' + lg.name + (lg.hidden ? ' (oculta)' : '') + (lg.worldOnly ? ' (só mundo)' : '') + ' | ' + n + ' | ' + (lg.relegated ?? '-') + ' | ' + (lg.promoted ?? '-') + ' |');
    const prox = ligas[i + 1];
    if (prox && !lg.hidden && !prox.hidden && !prox.worldOnly && prox.promoted !== undefined && (lg.relegated || 0) !== prox.promoted) {
      problemas.push(c.name + ': a ' + lg.name + ' rebaixa ' + (lg.relegated ?? 0) + ' mas a ' + prox.name + ' promove ' + prox.promoted + '.');
    }
    if (!prox && (lg.relegated || 0) > 0 && !lg.hidden) problemas.push(c.name + ': a ' + lg.name + ' é a última divisão e tem ' + lg.relegated + ' rebaixados (sem divisão abaixo para recebê-los).');
  });
}
L('');
L('### Quem subiria e quem desceria, pelas tabelas simuladas');
L('');
for (const c of COUNTRIES as any[]) {
  const ligas = [...c.leagues].filter((lg: any) => !lg.hidden && porLiga[lg.id]).sort((a: any, b: any) => a.tier - b.tier);
  for (const lg of ligas) {
    const d = porLiga[lg.id];
    const rz = lg.relegated || 0;
    const sobem = lg.promoted || 0;
    const cima = sobem ? d.tabela.slice(0, sobem).map((x: any) => x.team.name).join(', ') : '—';
    const baixo = rz ? d.tabela.slice(-rz).map((x: any) => x.team.name).join(', ') : '—';
    L('- **' + c.name + ' — ' + lg.name + '**: ' + (sobem ? 'sobem (' + sobem + '): ' + cima : 'sem acesso configurado') + ' · ' + (rz ? 'desce (' + rz + '): ' + baixo : 'sem descenso configurado'));
  }
}
// ---- o plano de acessos e descensos (textSim/promocoes.ts) aplicado as classificacoes desta temporada
const classificacao: Record<string, string[]> = {};
const sinteticas: string[] = [];
for (const l of mundo) {
  if (porLiga[l.leagueId]) { classificacao[l.leagueId] = porLiga[l.leagueId].tabela.map((x: any) => x.team.id); continue; }
  if (l.oculta && !l.teams.length) continue;
  // Series C e D (so-mundo): sao competicoes de formato proprio, que esta simulacao nao joga. Ordem SINTETICA: por forca (OVR) com ruido. (Ocultas "(clubes)" ficam de fora.)
  const lg = (COUNTRIES as any[]).find(c => c.id === l.countryId).leagues.find((x: any) => x.id === l.leagueId);
  if (lg && lg.worldOnly) {
    classificacao[l.leagueId] = [...l.teams].map(t => ({ id: t.id, v: t.strength + (Math.random() - 0.5) * 10 })).sort((x, y) => y.v - x.v).map(x => x.id);
    sinteticas.push(l.leagueName);
  }
}
const plano = planearAcessosEDescensos(COUNTRIES as any, classificacao);
const nomePorId = new Map<string, string>();
(REAL_TEAMS_JSON as any[]).forEach(t => nomePorId.set(String(t.teamID), t.teamName));
mundo.forEach(l => l.teams.forEach(t => nomePorId.set(t.id, t.name)));
const nm = (ids: string[]) => ids.length ? ids.map(id => nomePorId.get(id) || ('#' + id)).join(', ') : '—';

L('');
L('### Plano de acessos e descensos aplicado a esta temporada (`textSim/promocoes.ts`)');
L('');
L('Série C e D não são jogadas nesta simulação (competições de formato próprio): a ordem delas aqui é **sintética** (por OVR com ruído) só para exercitar o plano: ' + sinteticas.join(', ') + '.');
L('');
for (const m of plano.movimentos) {
  if (!m.rebaixados.length && !m.promovidos.length && !m.chegamDeCima.length && !m.chegamDeBaixo.length && !m.ficaram.length) continue;
  L('- **' + m.paisNome + ' — ' + m.ligaNome + '**');
  if (m.promovidos.length) L('  - promovidos (' + m.promovidos.length + ', saem para a divisão de cima): ' + nm(m.promovidos));
  if (m.rebaixados.length) L('  - rebaixados (' + m.rebaixados.length + '): ' + nm(m.rebaixados) + (m.paraStandby.length ? ' → standby (sem liga)' : ''));
  if (m.chegamDeCima.length) L('  - chegam rebaixados de cima (' + m.chegamDeCima.length + '): ' + nm(m.chegamDeCima));
  if (m.chegamDeBaixo.length) L('  - chegam promovidos de baixo (' + m.chegamDeBaixo.length + '): ' + nm(m.chegamDeBaixo));
  if (m.doStandby.length) L('  - entram do standby (' + m.doStandby.length + '): ' + nm(m.doStandby));
  if (m.ficaram.length) L('  - ficam por falta de substituto no standby (' + m.ficaram.length + '): ' + nm(m.ficaram));
}
L('');
L('### Standby (clubes sem liga) por país, antes e depois');
L('');
L('| País | Antes | Depois | Clubes no standby depois |');
L('|---|---:|---:|---|');
for (const c of COUNTRIES as any[]) {
  if (!plano.standby[c.id] || c.leagues.every((l: any) => l.hidden)) continue;
  L('| ' + c.name + ' | ' + plano.standbyAntes[c.id].length + ' | ' + plano.standby[c.id].length + ' | ' + nm(plano.standby[c.id]) + ' |');
}
L('');
// validacoes do plano
const checks: string[] = [];
for (const c of COUNTRIES as any[]) {
  for (const lg of c.leagues) {
    if (lg.hidden || !plano.novosTeamIds[lg.id]) continue;
    const antes = classificacao[lg.id] ? classificacao[lg.id].length : lg.teamIds.length;
    const depois = plano.novosTeamIds[lg.id];
    if (depois.length !== antes) checks.push(c.name + ' ' + lg.name + ': tamanho ' + antes + ' → ' + depois.length);
    if (new Set(depois).size !== depois.length) checks.push(c.name + ' ' + lg.name + ': clube duplicado');
  }
  const todos: string[] = [];
  c.leagues.forEach((lg: any) => { if (!lg.hidden && plano.novosTeamIds[lg.id]) todos.push(...plano.novosTeamIds[lg.id]); });
  todos.push(...(plano.standby[c.id] || []));
  if (new Set(todos).size !== todos.length) checks.push(c.name + ': um clube aparece em duas listas depois do plano');
}
L('**Verificação do plano:** ' + (checks.length ? 'FALHOU — ' + checks.join('; ') : 'todas as ligas mantêm o tamanho e nenhum clube aparece duas vezes (liga + standby).'));
L('');
L('### O jogo aplica acessos e descensos na temporada seguinte?');
L('');
L('**Ainda não.** O jogo não tem virada de temporada (o calendário acaba e nada recomeça), e `relegated` só pinta a zona de descenso na aba WORLD. O que passou a existir é o PLANO (`textSim/promocoes.ts`): dada a classificação final, diz quem desce, quem sobe e quem vai ao standby, sem tocar nos dados. Falta ligá-lo a uma virada de temporada que escreva `novosTeamIds` nas ligas e o standby no país (`reserveTeamIds`).');
L('');
L('Configuração (ajustada): Brasil A→B 4/4, B→C 4/4, C→D 4/4 (Série C rebaixa 4, Série D promove 4: a Série D deixou de ter playoff de acesso e sobem só os 4 semifinalistas). Países sem divisão inferior: os rebaixados vão ao standby e entram clubes de lá. Inglaterra, Espanha, Alemanha, Itália e França não têm clubes no standby: os rebaixados ficam na liga.');
L('');
if (problemas.length) { L('**Observações sobre a configuração (só rebaixa sem divisão abaixo):**'); problemas.forEach(p => L('- ' + p)); }

writeFileSync('1Season.md', linhas.join('\n') + '\n', 'utf8');
console.log('1Season.md escrito;', resumo.length, 'ligas;', totJogos, 'jogos;', seg, 's');
