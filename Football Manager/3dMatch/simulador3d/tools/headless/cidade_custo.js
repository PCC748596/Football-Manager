/*
O CUSTO DA CIDADE POR QUADRO (so ela e actualizada nas cameras Orbita, Cinema e Grua): constroi a cidade (com o estadio do perfil / capacidade dado) e mede quanto leva o `Cidade.update` (CPU, ms por chamada) e
quantas malhas / instancias ela tem. Sem GPU: a parte do desenho nao se mede aqui.
Uso: node tools/headless/cidade_custo.js [capacidade]
*/
require('./harness.js');
const fs = require('fs'), path = require('path');
const ler = (f) => fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8');
const win = {};
const CidadeConfig = new Function('window', ler('js/config/cidade.js') + '; return CidadeConfig;')(win);
const Estadios = new Function('window', 'BancadaAneis', 'CidadeConfig', 'EstadioOval', 'TunelJogadores', 'CorredoresBancada', 'CAMPO_LARG', 'CAMPO_COMP', ler('js/config/estadios.js') + '; return Estadios;')(win, BancadaAneis, CidadeConfig, undefined, undefined, CorredoresBancada, CAMPO_LARG, CAMPO_COMP);
if (process.argv[2]) Estadios.aplicar(Estadios.paraCapacidade(Number(process.argv[2])));
const GenteSrc = ler('js/cidade_gente.js');
const globais = { window: win, THREE, CidadeConfig, Estadios, CAMPO_LARG, CAMPO_COMP, Weather: undefined, Match: undefined };
const nomes = Object.keys(globais);
const CidadeGente = new Function(...nomes, GenteSrc + '; return typeof CidadeGente !== "undefined" ? CidadeGente : undefined;')(...nomes.map(n => globais[n]));
globais.CidadeGente = CidadeGente;
const Cidade = new Function(...Object.keys(globais), ler('js/cidade.js') + '; return Cidade;')(...Object.values(globais));
const cena = new THREE.Scene();
const t0 = Date.now(); Cidade.construir(cena); const tb = Date.now() - t0;
let malhas = 0, inst = 0; cena.traverse(o => { if (o.isMesh) { malhas++; if (o.isInstancedMesh) inst += o.count; } });
const N = 300, t1 = process.hrtime.bigint();
for (let i = 0; i < N; i++) Cidade.update(1 / 60);
const ms = Number(process.hrtime.bigint() - t1) / 1e6 / N;
fs.writeSync(1, `grupo criado: ${!!Cidade.grupo} | cidade: construir ${tb} ms | malhas ${malhas}, instancias ${inst} | update ${ms.toFixed(2)} ms por quadro (CPU)` + String.fromCharCode(10));
setTimeout(() => process.exit(0), 100);
