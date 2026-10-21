/*
VALIDA TODAS AS LIGAS (Brasil, Inglaterra e as da America Latina): gera a liga, cria o calendario, simula a temporada inteira com o mesmo `simulateMatch` do jogo e confere que a
tabela fecha. Corre com:   npx tsx tools/validar_ligas.ts [temporadas]      (por omissao 1; ex.: 3 para ver se a forca do clube manda na classificacao)

Por liga imprime: clubes, jogos, jogos por clube (tem de ser 2x(N-1)), golos por jogo, o campeao e o fim da tabela, a correlacao entre a forca do clube e os pontos
e, no fim, as FALHAS (vazio = tudo certo). O jogo ao vivo simula do mesmo jeito todos os jogos do dia da liga do utilizador (context/GameContext.tsx, `todays`).
*/
import { COUNTRIES, generateLeagueData, generateFixtures } from '../textSim/dataGenerator';
import { simulateMatch } from '../textSim/matchEngine';

const TEMPORADAS = Number(process.argv[2] || 1);
const falhas: string[] = [];
const corr = (x: number[], y: number[]) => { const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; } return sxy / Math.sqrt(sxx * syy); };

for (const c of COUNTRIES as any[]) {
  for (const lg of c.leagues) {
    const { teams, players } = generateLeagueData(c.id, lg.id);
    players.forEach(p => { p.fitness = 100; });
    const N = teams.length;
    for (let s = 1; s <= TEMPORADAS; s++) {
      const fixtures = generateFixtures(teams, lg.id);
      const tab: Record<string, { pts: number; gf: number; ga: number; j: number }> = {};
      teams.forEach(t => { tab[t.id] = { pts: 0, gf: 0, ga: 0, j: 0 }; });
      let golos = 0;
      for (const f of fixtures) {
        const r = simulateMatch(f, teams, players, 0, null, 'PT');
        const h = tab[f.homeTeamId], a = tab[f.awayTeamId];
        if (!h || !a) { falhas.push(`${lg.id}: jogo com clube desconhecido ${f.homeTeamId}/${f.awayTeamId}`); continue; }
        h.j++; a.j++; h.gf += r.homeScore; h.ga += r.awayScore; a.gf += r.awayScore; a.ga += r.homeScore; golos += r.homeScore + r.awayScore;
        if (r.homeScore > r.awayScore) h.pts += 3; else if (r.awayScore > r.homeScore) a.pts += 3; else { h.pts++; a.pts++; }
      }
      const esperado = 2 * (N - 1);
      if (fixtures.length !== N * (N - 1)) falhas.push(`${lg.id}: ${fixtures.length} jogos, esperava ${N * (N - 1)}`);
      for (const t of teams) if (tab[t.id].j !== esperado) falhas.push(`${lg.id}: ${t.name} fez ${tab[t.id].j} jogos, esperava ${esperado}`);
      const gfT = Object.values(tab).reduce((x, y) => x + y.gf, 0), gaT = Object.values(tab).reduce((x, y) => x + y.ga, 0);
      if (gfT !== gaT) falhas.push(`${lg.id}: golos marcados ${gfT} != sofridos ${gaT}`);
      const ordem = [...teams].sort((a, b) => tab[b.id].pts - tab[a.id].pts || (tab[b.id].gf - tab[b.id].ga) - (tab[a.id].gf - tab[a.id].ga));
      const r = corr(teams.map(t => t.strength), teams.map(t => tab[t.id].pts));
      const nome = (t: any) => `${t.name} ${tab[t.id].pts}pts`;
      console.log(`${c.name} / ${lg.name} [${lg.id}] T${s}: ${N} clubes, ${fixtures.length} jogos, ${(golos / fixtures.length).toFixed(2)} golos/jogo, corr(forca,pontos)=${r.toFixed(2)}`);
      console.log(`   campeao: ${nome(ordem[0])} | 2o: ${nome(ordem[1])} | 3o: ${nome(ordem[2])} | lanterna: ${nome(ordem[N - 1])}`);
    }
  }
}
console.log('\nFALHAS:' + (falhas.length ? '\n  ' + falhas.slice(0, 30).join('\n  ') : ' nenhuma'));
