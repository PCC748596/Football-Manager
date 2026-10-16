const fs = require('fs');

let dbContent = fs.readFileSync('textSim/realDatabase.ts', 'utf-8');
let teams = JSON.parse(fs.readFileSync('teams.json', 'utf-8'));

const englishTeamsData = [
  { name: 'Arsenal', c1: 'Red', c2: 'White' },
  { name: 'Aston Villa', c1: 'Maroon', c2: 'LightBlue' },
  { name: 'Bournemouth', c1: 'Red', c2: 'Black' },
  { name: 'Brentford', c1: 'Red', c2: 'White' },
  { name: 'Brighton', c1: 'Blue', c2: 'White' },
  { name: 'Chelsea', c1: 'Blue', c2: 'Blue' },
  { name: 'Crystal Palace', c1: 'Red', c2: 'Blue' },
  { name: 'Everton', c1: 'Blue', c2: 'White' },
  { name: 'Fulham', c1: 'White', c2: 'Black' },
  { name: 'Ipswich', c1: 'Blue', c2: 'White' },
  { name: 'Leicester', c1: 'Blue', c2: 'White' },
  { name: 'Liverpool', c1: 'Red', c2: 'Red' },
  { name: 'Man City', c1: 'LightBlue', c2: 'White' },
  { name: 'Man United', c1: 'Red', c2: 'White' },
  { name: 'Newcastle', c1: 'Black', c2: 'White' },
  { name: 'Nottm Forest', c1: 'Red', c2: 'Red' },
  { name: 'Southampton', c1: 'Red', c2: 'White' },
  { name: 'Tottenham', c1: 'White', c2: 'Navy' },
  { name: 'West Ham', c1: 'Maroon', c2: 'LightBlue' },
  { name: 'Wolves', c1: 'Orange', c2: 'Black' }
];

let englishTeamIds = [];

englishTeamsData.forEach((tData, index) => {
    const newId = 650001 + index;
    englishTeamIds.push(newId);
    const newTeam = {
      teamID: newId,
      teamName: tData.name,
      teamAbb: tData.name.substring(0, 3).toUpperCase(),
      color: tData.c1,
      color2: tData.c2,
      color3: '',
      teamCityName: tData.name,
      teamStadiumName: tData.name + ' Stadium',
      yearOfFoundation: 1900,
      initialCapital: 10000000,
      country: '65',
      homeKit: {
        pattern: 'solid',
        color1: tData.c1,
        color2: tData.c2,
        color3: '',
        numberColor: 'white',
        numberOutlineColor: '',
        collarColor: '',
        sleeveColor: tData.c2
      },
      awayKit: {
        pattern: 'solid',
        color1: 'White',
        color2: tData.c1,
        color3: '',
        numberColor: 'black',
        numberOutlineColor: '',
        collarColor: '',
        sleeveColor: 'White'
      },
      thirdKit: {
        pattern: 'solid',
        color1: 'Black',
        color2: tData.c1,
        color3: '',
        numberColor: 'white',
        numberOutlineColor: '',
        collarColor: '',
        sleeveColor: 'Black'
      },
      gkKit: {
        pattern: 'solid',
        color1: 'Green',
        color2: '',
        color3: '',
        numberColor: 'white',
        numberOutlineColor: '',
        collarColor: '',
        sleeveColor: 'Green'
      }
    };
    teams.push(newTeam);
});

fs.writeFileSync('teams.json', JSON.stringify(teams, null, 2), 'utf-8');

// Update textSim/realDatabase.ts
// Update countries JSON
const regexCountries = /export const REAL_COUNTRIES_JSON = (\[[\s\S]*?\]);/;
const matchC = dbContent.match(regexCountries);
if (matchC) {
    let countries = eval(matchC[1]);
    
    let en = countries.find(c => c.name === 'England' || c.id === '65');
    if (en && en.leagues && en.leagues[0]) {
        en.leagues[0].teamIds = englishTeamIds;
    }
    
    const newCountriesStr = JSON.stringify(countries, null, 2);
    dbContent = dbContent.replace(regexCountries, `export const REAL_COUNTRIES_JSON = ${newCountriesStr};`);
}

// Update REAL_TEAMS_JSON
const regexTeams = /export const REAL_TEAMS_JSON = (\[[\s\S]*?\]);/;
const matchT = dbContent.match(regexTeams);
if (matchT) {
    let realTeams = eval(matchT[1]);
    
    // Add new english teams
    englishTeamIds.forEach(id => {
        const t = teams.find(t => t.teamID === id);
        if (t) realTeams.push(t);
    });
    
    // Sort
    realTeams.sort((a, b) => a.teamName.localeCompare(b.teamName));
    
    const newTeamsStr = JSON.stringify(realTeams, null, 2);
    dbContent = dbContent.replace(regexTeams, `export const REAL_TEAMS_JSON = ${newTeamsStr};`);
}

fs.writeFileSync('textSim/realDatabase.ts', dbContent, 'utf-8');

console.log('Successfully added 20 English teams to England league!');
