const fs = require('fs');

console.log('Loading JSON files...');
let teams = JSON.parse(fs.readFileSync('teams.json', 'utf-8'));
let players = JSON.parse(fs.readFileSync('players.json', 'utf-8'));
let dbContent = fs.readFileSync('textSim/realDatabase.ts', 'utf-8');

// 1. Sort teams alphabetically
teams.sort((a, b) => a.teamName.localeCompare(b.teamName));

// 2. Reassign IDs and map
const oldToNew = {};
teams.forEach((t, index) => {
    const oldId = t.teamID;
    // Prefix 45 for Brazil, format 45XXXX
    // Starting at 450001
    const newId = 450001 + index;
    oldToNew[oldId] = newId;
    
    t.teamID = newId;
    t.country = "45"; // Tag country to the team for future reference
});

console.log(`Generated mapping for ${Object.keys(oldToNew).length} teams.`);

// 3. Update players.json
let playersUpdated = 0;
players.forEach(p => {
    if (oldToNew[p.teamID]) {
        p.teamID = oldToNew[p.teamID];
        // Ensure player teamName perfectly matches the new sorted teams
        const newTeam = teams.find(t => t.teamID === p.teamID);
        if (newTeam) {
            p.teamName = newTeam.teamName;
        }
        playersUpdated++;
    }
});
console.log(`Updated IDs for ${playersUpdated} players.`);

// 4. Write back JSONs
fs.writeFileSync('teams.json', JSON.stringify(teams, null, 2), 'utf-8');
fs.writeFileSync('players.json', JSON.stringify(players, null, 2), 'utf-8');

// 5. Update textSim/realDatabase.ts
// Update countries JSON
const regexCountries = /export const REAL_COUNTRIES_JSON = (\[[\s\S]*?\]);/;
const matchC = dbContent.match(regexCountries);
if (matchC) {
    let countries = eval(matchC[1]);
    
    // Assign IDs to countries
    let br = countries.find(c => c.name === 'Brazil' || c.id === 'brazil');
    if (br) br.id = "45";
    
    let en = countries.find(c => c.name === 'England' || c.id === 'england');
    if (en) en.id = "65";
    
    // Update league teamIds
    countries.forEach(c => {
        if (c.leagues) {
            c.leagues.forEach(l => {
                if (l.teamIds) {
                    l.teamIds = l.teamIds.map(id => oldToNew[id] || id);
                }
            });
        }
    });
    
    const newCountriesStr = JSON.stringify(countries, null, 2);
    dbContent = dbContent.replace(regexCountries, `export const REAL_COUNTRIES_JSON = ${newCountriesStr};`);
}

// Update REAL_TEAMS_JSON
const regexTeams = /export const REAL_TEAMS_JSON = (\[[\s\S]*?\]);/;
const matchT = dbContent.match(regexTeams);
if (matchT) {
    let realTeams = eval(matchT[1]);
    
    // Update IDs
    realTeams.forEach(t => {
        if (oldToNew[t.teamID]) {
            t.teamID = oldToNew[t.teamID];
        }
    });
    
    // Sort realTeams alphabetically to match teams.json
    realTeams.sort((a, b) => a.teamName.localeCompare(b.teamName));
    
    const newTeamsStr = JSON.stringify(realTeams, null, 2);
    dbContent = dbContent.replace(regexTeams, `export const REAL_TEAMS_JSON = ${newTeamsStr};`);
}

fs.writeFileSync('textSim/realDatabase.ts', dbContent, 'utf-8');

console.log('Successfully updated teams.json, players.json, and realDatabase.ts');
