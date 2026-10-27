/*
O ESTADIO PELA CAPACIDADE (Estadios.paraCapacidade, config/estadios.js): para cada capacidade mostra o formato escolhido (so rectas ou com curvas, aneis, filas) e os lugares que o createField constroi.
O harness nao carrega os estadios: carregam-se aqui (so a configuracao, sem desenhar nada).
Uso: node tools/headless/estadio_lugares.js [capacidade ...]   (sem argumentos: as dos clubes do jogo)
*/
require('./harness.js');
const fs = require('fs'), path = require('path');
const ler = (f) => fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8');
const win = {};
const CidadeConfig = new Function('window', ler('js/config/cidade.js') + '; return CidadeConfig;')(win);
const Estadios = new Function('window', 'BancadaAneis', 'CidadeConfig', 'EstadioOval', 'TunelJogadores', 'CorredoresBancada', 'CAMPO_LARG', 'CAMPO_COMP', ler('js/config/estadios.js') + '; return Estadios;')(win, BancadaAneis, CidadeConfig, undefined, typeof TunelJogadores !== 'undefined' ? TunelJogadores : undefined, CorredoresBancada, CAMPO_LARG, CAMPO_COMP);
const saida = (...a) => fs.writeSync(1, a.join(' ') + String.fromCharCode(10));   // directo no stdout: o harness mexe no console e um pipe perdia a linha
const caps = process.argv.length > 2 ? process.argv.slice(2).map(Number) : [5000, 15781, 16700, 19500, 20000, 21059, 22000, 29165, 42585, 52083, 73183, 78838];
for (const cap of caps) {
    const p = Estadios.paraCapacidade(cap), b = p.bacia, a = p.bancadaAneis;
    saida('cap', String(cap).padStart(6), '| ' + (b.semCurvas ? 'rectas, sem cantos' : 'com curvas       '), '| aneis', a.aneis, '| filas', String(a.degrausPorAnel).padStart(2), '| lugares', p.lugaresEstimados, '(+' + (100 * (p.lugaresEstimados - cap) / cap).toFixed(1) + '%)');
}
setTimeout(() => process.exit(0), 100);
