/*
Corrige os 20 clubes ingleses originais (650001-650020): estadio real, fanBase e avrAttendance, a partir de local-data/CountryData14.json (gameTeamId).
    node tools/corrigir_estadios_ingleses.cjs          so mostra o diff
    node tools/corrigir_estadios_ingleses.cjs --apply  grava em textSim/realDatabase.ts
Mesma formula do gerar_ligas_inglaterra.cjs: avrAttendance = fanBase * 0.32. Nomes dos clubes nao mudam.
*/
const fs = require('fs'), path = require('path');
const raiz = path.resolve(__dirname, '..');
const dbPath = path.join(raiz, 'textSim', 'realDatabase.ts');
const apply = process.argv.includes('--apply');
const dados = JSON.parse(fs.readFileSync(path.join(raiz, 'local-data', 'CountryData14.json'), 'utf8'));
let txt = fs.readFileSync(dbPath, 'utf8');
for (let id = 650001; id <= 650020; id++) {
    const c = dados.clubs.find(x => x.gameTeamId === id);
    if (!c) { console.log(id, 'SEM DADOS'); continue; }
    const i = txt.indexOf('"teamID": ' + id + ',');
    const fim = txt.indexOf('"homeKit"', i);
    let bloco = txt.slice(i, fim);
    const nome = /"teamName": "([^"]*)"/.exec(bloco)[1];
    const est = /"teamStadiumName": "([^"]*)"/.exec(bloco)[1];
    const fan = c.fanBase || 10000, att = Math.round(fan * 0.32);
    console.log(id + ' | ' + nome + ' | ' + est + ' -> ' + c.stadium + ' | fanBase ' + fan + ' | avrAttendance ' + att);
    bloco = bloco.replace(/"teamStadiumName": "[^"]*"/, '"teamStadiumName": ' + JSON.stringify(c.stadium));
    if (!/"fanBase"/.test(bloco)) bloco = bloco.replace(/("initialCapital": \d+,\n)/, `$1    "fanBase": ${fan},\n    "avrAttendance": ${att},\n`);
    txt = txt.slice(0, i) + bloco + txt.slice(fim);
}
if (apply) { fs.writeFileSync(dbPath, txt, 'utf8'); console.log('Gravado.'); } else console.log('(dry-run)');
