/*
O ESTADIO PELA CAPACIDADE (Estadios.paraCapacidade): ate 6 000 lugares so arquibancadas rectas de um anel e cantos abertos; acima, as curvas: um anel ate 21 500 lugares, depois dois aneis (tres nos maiores); os lugares construidos ficam
entre 100% e 108% da capacidade (as filas sao inteiras; 108% dos casos em que o minimo de 10 filas passa). A conta e a de tools/headless/estadio_lugares.js.
Corre com: node tests/estadios_capacidade.test.js
*/
const { execFileSync } = require('child_process');
const path = require('path');
let falhas = 0;
const erro = (m) => { falhas++; console.error('  X ' + m); };
const CAPS = [4000, 6000, 6001, 15781, 19500, 21500, 21501, 29165, 42585, 52083, 73183, 78838];
const saida = execFileSync(process.execPath, [path.join(__dirname, '..', 'tools', 'headless', 'estadio_lugares.js'), ...CAPS.map(String)], { encoding: 'utf8' });
for (const cap of CAPS) {
    const m = new RegExp(String.raw`cap\s+${cap} \| (rectas, sem cantos|com curvas)\s+\| aneis (\d) \| filas\s+(\d+) \| lugares (\d+)`).exec(saida);
    if (!m) { erro(cap + ': sem resultado'); continue; }
    const [, forma, aneis, filas, lugares] = m, n = Number(lugares);
    if (n < cap || n > cap * 1.08) erro(cap + ': ' + n + ' lugares (100% a 108%)');
    if (cap <= 6000 && (forma !== 'rectas, sem cantos' || aneis !== '1')) erro(cap + ': ate 6 000 tem de ser recto e de um anel');
    if (cap > 6000 && forma !== 'com curvas') erro(cap + ': acima de 6 000 leva curvas');
    if (cap > 6000 && cap <= 21500 && aneis !== '1') erro(cap + ': ate 21 500 basta um anel');
    if (cap > 21500 && Number(aneis) < 2) erro(cap + ': acima de 21 500 leva dois aneis ou mais');
    if (cap > 6000 && cap <= 21500 && Number(filas) > 37) erro(cap + ': ' + filas + ' filas (alto de mais para um anel)');
}
console.log(falhas ? falhas + ' falha(s)' : 'OK estadios_capacidade');
process.exit(falhas ? 1 : 0);
