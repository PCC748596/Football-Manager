/*
A CIDADE CONSTROI-SE E ACTUALIZA-SE COM O ESTADIO DE CADA CAPACIDADE (a regressao do estadio recto sem portoes: a cidade lançava erro e o jogo travava nas cameras Orbita, Grua e Cinema).
Corre com: node tests/cidade_estadios.test.js
*/
const { execFileSync } = require('child_process');
const path = require('path');
let falhas = 0;
const erro = (m) => { falhas++; console.error('  X ' + m); };
for (const cap of [5000, 15781, 19500, 20000, 21059, 22000, 29165, 42585, 73183]) {
    const s = execFileSync(process.execPath, [path.join(__dirname, '..', 'tools', 'headless', 'cidade_estadios.js'), String(cap)], { encoding: 'utf8' });
    if (!new RegExp('cap ' + cap + ' \| construir ok').test(s)) erro(cap + ': a cidade nao se construiu: ' + (s.match(/ERRO.*/) || [''])[0].slice(0, 120));
    if (!new RegExp('cap ' + cap + ' \| update ok').test(s)) erro(cap + ': a cidade nao se actualizou: ' + (s.match(/update ERRO.*/) || [''])[0].slice(0, 120));
}
console.log(falhas ? falhas + ' falha(s)' : 'OK cidade_estadios');
process.exit(falhas ? 1 : 0);
