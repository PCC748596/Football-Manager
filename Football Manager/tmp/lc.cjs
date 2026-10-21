const fs=require('fs');const s=fs.readFileSync('textSim/realDatabase.ts','utf8');
const m=s.match(/export const REAL_COUNTRIES_JSON = (\[[\s\S]*?\n\]);/);const c=eval(m[1]);
c.forEach(x=>console.log(x.id,x.name,x.continent,JSON.stringify(Object.keys(x)),x.leagues.map(l=>l.id+':'+l.tier+':'+l.teamIds.length+':'+l.promoted+'/'+l.relegated+':md'+(l.matchDates||[]).length).join(' | ')));
const t=s.match(/export const REAL_TEAMS_JSON = (\[[\s\S]*?\n\]);/);console.log('teams',eval(t[1]).length);
const p=s.match(/export const REAL_PLAYERS_JSON = (\[[\s\S]*?\n\]);/);console.log('players',p?eval(p[1]).length:'?');
