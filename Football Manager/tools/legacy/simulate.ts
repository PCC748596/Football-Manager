import { generateLeagueData, generateFixtures } from './textSim/dataGenerator';
import { simulateMatch } from './textSim/matchEngine';

console.log('Initializing league data...');
const { teams, players } = generateLeagueData('45', 'bra_serie_a');
const fixtures = generateFixtures(teams, 'bra_serie_a');

// O elenco nasce em pré-temporada (preparo 45–55) e este script não simula a
// recuperação diária que o jogo faz entre as partidas. Sem isso a liga inteira
// jogaria exausta e os números não representariam o jogo real, onde o time
// entra em campo perto de 100.
players.forEach(p => { p.fitness = 100; });


const match = fixtures[0];
const homeTeam = teams.find(t => t.id === match.homeTeamId);
const awayTeam = teams.find(t => t.id === match.awayTeamId);

if (!homeTeam || !awayTeam) {
    console.error('Could not find teams for the fixture.');
    process.exit(1);
}

console.log(`\nSimulating: ${homeTeam.name} vs ${awayTeam.name}`);
console.log('--------------------------------------------------');

const result = simulateMatch(match, teams, players, 0, null, 'PT');

console.log(`\nFinal Score: ${homeTeam.name} ${result.homeScore} - ${result.awayScore} ${awayTeam.name}`);
console.log('\nMatch Events:');
result.events
    .filter(e => ['GOAL', 'CARD', 'INJURY'].includes(e.type))
    .forEach(e => {
        const min = Math.floor(e.minute);
        const p = players.find(p => p.id === e.playerId)?.name || 'Unknown';
        const tAbb = e.teamId === homeTeam.id ? (homeTeam as any).teamAbb || homeTeam.name.substring(0,3).toUpperCase() : (awayTeam as any).teamAbb || awayTeam.name.substring(0,3).toUpperCase();
        
        if (e.type === 'GOAL') {
            console.log(`⚽ [${min}'] GOAL! ${p} (${tAbb})`);
            if (e.assistPlayerId) {
                const assistP = players.find(p => p.id === e.assistPlayerId)?.name;
                console.log(`   Assist: ${assistP}`);
            }
        } else if (e.type === 'CARD') {
            const isRed = e.description?.includes('Vermelho') || e.description?.includes('red');
            const icon = isRed ? '🟥' : '🟨';
            console.log(`${icon} [${min}'] ${isRed ? 'RED CARD' : 'YELLOW CARD'} - ${p} (${tAbb})`);
        } else if (e.type === 'INJURY') {
            console.log(`✚  [${min}'] INJURY - ${p} (${tAbb})`);
        }
    });

console.log('\nMatch Stats:');
const homePasses = result.events.filter(e => e.type === 'PASS' && e.teamId === homeTeam.id).length;
const awayPasses = result.events.filter(e => e.type === 'PASS' && e.teamId === awayTeam.id).length;
const totalPasses = homePasses + awayPasses || 1;
const homePossession = Math.round((homePasses / totalPasses) * 100);
const awayPossession = 100 - homePossession;

const homeShots = result.events.filter(e => ['SHOT', 'GOAL', 'SAVE', 'MISS'].includes(e.type) && e.teamId === homeTeam.id).length;
const awayShots = result.events.filter(e => ['SHOT', 'GOAL', 'SAVE', 'MISS'].includes(e.type) && e.teamId === awayTeam.id).length;

const homeShotsOnTarget = result.events.filter(e => ['GOAL', 'SAVE'].includes(e.type) && e.teamId === homeTeam.id).length;
const awayShotsOnTarget = result.events.filter(e => ['GOAL', 'SAVE'].includes(e.type) && e.teamId === awayTeam.id).length;

const homeFouls = result.events.filter(e => e.type === 'FOUL' && e.teamId === homeTeam.id).length;
const awayFouls = result.events.filter(e => e.type === 'FOUL' && e.teamId === awayTeam.id).length;

console.log(`Possession: ${homePossession}% - ${awayPossession}%`);
console.log(`Passes: ${homePasses} - ${awayPasses}`);
console.log(`Shots: ${homeShots} - ${awayShots}`);
console.log(`On Target: ${homeShotsOnTarget} - ${awayShotsOnTarget}`);
console.log(`Fouls: ${homeFouls} - ${awayFouls}`);
