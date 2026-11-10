import { generateLeagueData, generateFixtures } from './textSim/dataGenerator';
import { simulateMatch } from './textSim/matchEngine';

console.log('Inicializando dados da liga...');
const { teams, players } = generateLeagueData('45', 'bra_serie_a');


// O elenco nasce em pré-temporada (preparo 45–55) e este script não simula a
// recuperação diária que o jogo faz entre as partidas. Sem isso a liga inteira
// jogaria exausta e os números não representariam o jogo real, onde o time
// entra em campo perto de 100.
players.forEach(p => { p.fitness = 100; });

const SEASONS = 20;

for (let season = 1; season <= SEASONS; season++) {
    // Reset table stats for the new season
    const table: Record<string, { pts: number, gf: number, ga: number, gd: number }> = {};
    teams.forEach(t => {
        table[t.id] = { pts: 0, gf: 0, ga: 0, gd: 0 };
    });

    // Generate fixtures for the season
    const fixtures = generateFixtures(teams, 'bra_serie_a');

    // Generais
    let totalGoals = 0;
    let totalFouls = 0;
    let totalYellows = 0;
    let totalReds = 0;
    let totalInjuries = 0;
    const scorers: Record<string, number> = {};

    // Simulate all matches
    for (const match of fixtures) {
        // Fast simulation: only process 90 minutes without logging
        const result = simulateMatch(match, teams, players, 0, null, 'PT');
        
        const hId = match.homeTeamId;
        const aId = match.awayTeamId;
        
        table[hId].gf += result.homeScore;
        table[hId].ga += result.awayScore;
        table[aId].gf += result.awayScore;
        table[aId].ga += result.homeScore;
        
        table[hId].gd = table[hId].gf - table[hId].ga;
        table[aId].gd = table[aId].gf - table[aId].ga;

        if (result.homeScore > result.awayScore) {
            table[hId].pts += 3;
        } else if (result.awayScore > result.homeScore) {
            table[aId].pts += 3;
        } else {
            table[hId].pts += 1;
            table[aId].pts += 1;
        }

        totalGoals += result.homeScore + result.awayScore;
        result.events.forEach(e => {
            if (e.type === 'GOAL' && e.playerId) {
                scorers[e.playerId] = (scorers[e.playerId] || 0) + 1;
            } else if (e.type === 'FOUL') {
                totalFouls++;
            } else if (e.type === 'CARD') {
                if (e.description?.includes('🟥')) {
                    totalReds++;
                } else {
                    totalYellows++;
                }
            } else if (e.type === 'INJURY') {
                totalInjuries++;
            }
        });
    }

    // Top scorer
    let topScorerId = '';
    let topScorerGoals = 0;
    Object.entries(scorers).forEach(([id, goals]) => {
        if (goals > topScorerGoals) {
            topScorerGoals = goals;
            topScorerId = id;
        }
    });
    const topScorerName = players.find(p => p.id === topScorerId)?.name || 'N/A';
    const tsTeamObj = teams.find(t => t.id === players.find(p => p.id === topScorerId)?.teamId);
    const topScorerTeam = tsTeamObj ? ((tsTeamObj as any).teamAbb || tsTeamObj.name.substring(0, 3).toUpperCase()) : '';

    // Determine Champion
    const standings = Object.entries(table).sort((a, b) => {
        if (b[1].pts !== a[1].pts) return b[1].pts - a[1].pts;
        if (b[1].gd !== a[1].gd) return b[1].gd - a[1].gd;
        return b[1].gf - a[1].gf;
    });

    const championId = standings[0][0];
    const championStats = standings[0][1];
    const championName = teams.find(t => t.id === championId)?.name;

    const relegatedId = standings[standings.length - 1][0];
    const relegatedStats = standings[standings.length - 1][1];
    const relegatedName = teams.find(t => t.id === relegatedId)?.name;

    console.log(`Temporada ${season.toString().padStart(2, '0')}: 🏆 CAMPEÃO: ${championName?.padEnd(16)} | Pts: ${championStats.pts} (SG: ${championStats.gd})  ---  🔻 LANTERNA: ${relegatedName} (${relegatedStats.pts} Pts)`);
    console.log(`    📊 Gols: ${totalGoals} (${(totalGoals/380).toFixed(2)}/jogo) | ⚽ Artilheiro: ${topScorerName} (${topScorerTeam}) - ${topScorerGoals} gols | Faltas: ${totalFouls} | CA: ${totalYellows} | CV: ${totalReds} | Lesões: ${totalInjuries}`);
    console.log('---');
}

console.log('\nSimulação de 20 temporadas concluída!');
