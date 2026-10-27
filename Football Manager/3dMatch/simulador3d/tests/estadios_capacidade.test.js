/*
O ESTADIO PELA CAPACIDADE (Estadios.paraCapacidade): ate 20 000 lugares so arquibancadas rectas de um anel e cantos abertos; acima, as curvas e dois aneis (tres nos maiores); os lugares construidos ficam
entre 100% e 108% da capacidade (as filas sao inteiras; 108% dos casos em que o minimo de 10 filas passa). A conta e a de tools/headless/estadio_lugares.js.
Corre com: node tests/estadios_capacidade.test.js
*/
const { execFileSync } = require('child_process');
const path = require('path');
let falhas = 0;
const erro = (m) => { falhas++; console.error('  X ' + m); };
const CAPS = [8000, 15781, 19500, 20000, 20001, 21059, 29165, 42585, 52083, 73183, 78838];
const saida = execFileSync(process.execPath, [path.join(__dirname, '..', 'tools', 'headless', 'estadio_lugares.js'), ...CAPS.map(String)], { encoding: 'utf8' });
for (const cap of CAPS) {
    const m = new RegExp(String.raw`cap\s+${cap} \| (rectas, sem cantos|com curvas)\s+\| aneis (\d) \| filas\s+(\d+) \| lugares (\d+)`).exec(saida);
    if (!m) { erro(cap + ': sem resultado'); continue; }
    const [, forma, aneis, filas, lugares] = m, n = Number(lugares);
    if (n < cap || n > cap * 1.08) erro(cap + ': ' + n + ' lugares (100% a 108%)');
    if (cap <= 20000 && (forma !== 'rectas, sem cantos' || aneis !== '1')) erro(cap + ': ate 20 000 tem de ser recto e de um anel');
    if (cap > 20000 && (forma !== 'com curvas' || Number(aneis) < 2)) erro(cap + ': acima de 20 000 leva curvas e dois aneis ou mais');
}
console.log(falhas ? falhas + ' falha(s)' : 'OK estadios_capacidade');
process.exit(falhas ? 1 : 0);
