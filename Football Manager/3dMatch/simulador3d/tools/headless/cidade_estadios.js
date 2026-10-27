/*
A CIDADE COM CADA ESTADIO: para cada capacidade pedida aplica o estadio (Estadios.paraCapacidade), constroi a cidade (com as pessoas, que precisam dos portoes da fachada) e actualiza-a 120 quadros. Mostra `construir ok` e
`update ok`, ou o erro. Foi um estadio sem fachada activa que fez a cidade falhar (`_irAoPortao`) e o jogo travar nas cameras Orbita, Grua e Cinema.
Uso: node tools/headless/cidade_estadios.js [capacidade ...]
*/
require('./harness.js');
const fs = require('fs'), path = require('path');
const ler = (f) => fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8');
const win = global.window || {};
const CidadeConfig = new Function('window', ler('js/config/cidade.js') + '; return CidadeConfig;')(win);
const Estadios = new Function('window', 'BancadaAneis', 'CidadeConfig', 'EstadioOval', 'TunelJogadores', 'CorredoresBancada', 'CAMPO_LARG', 'CAMPO_COMP', ler('js/config/estadios.js') + '; return Estadios;')(win, BancadaAneis, CidadeConfig, undefined, undefined, CorredoresBancada, CAMPO_LARG, CAMPO_COMP);
const CAP = Number(process.argv[2]), PEQUENA = process.argv[3] === 'pequena';
if (CAP) Estadios.aplicar(Estadios.paraCapacidade(CAP));
if (PEQUENA) Estadios.cidadePequena();   // Series C e D: menos predios e sem metro
Match.init(new THREE.Scene());
let Crowd, CrowdModel;
try {
    const r = new Function('window', 'THREE', 'Estadios', 'Match', 'CAMPO_LARG', 'CAMPO_COMP', ler('js/crowd.js') + '; return { Crowd: typeof Crowd !== "undefined" ? Crowd : undefined, CrowdModel: typeof CrowdModel !== "undefined" ? CrowdModel : undefined };')(win, THREE, Estadios, Match, CAMPO_LARG, CAMPO_COMP);
    Crowd = r.Crowd; CrowdModel = r.CrowdModel; console.log('crowd.js carregado:', !!Crowd);
} catch (e) { console.log('crowd.js ERRO', e.message.split('\n')[0]); }
const g = { window: win, THREE, CidadeConfig, Estadios, CAMPO_LARG, CAMPO_COMP, Weather: undefined, Match, Crowd, CrowdModel };
const nomes = Object.keys(g);
let CidadeGente;
try { CidadeGente = new Function(...nomes, ler('js/cidade_gente.js') + '; return CidadeGente;')(...nomes.map(n => g[n])); } catch (e) { console.log('gente ERRO', e.message.split('\n')[0]); }
g.CidadeGente = CidadeGente;
const Cidade = new Function(...Object.keys(g), ler('js/cidade.js') + '; return Cidade;')(...Object.values(g));
const cena = new THREE.Scene();
try { Cidade.construir(cena); { const I = Cidade.inventario || {}; console.log('cap', CAP || 'padrao', '| construir ok | gente', !!Cidade.gente, '| predios', I.predios, 'casas', I.casas, 'trens', I.metro && I.metro.trens, 'estacoes', I.metro && I.metro.estacoes); } } catch (e) { console.log('cap', CAP || 'padrao', '| construir ERRO', e.stack.split('\n').slice(0, 4).join(' | ')); }
try { for (let i = 0; i < 120; i++) Cidade.update(1 / 60); console.log('cap', CAP || 'padrao', '| update ok'); } catch (e) { console.log('cap', CAP || 'padrao', '| update ERRO', e.stack.split('\n').slice(0, 4).join(' | ')); }
setTimeout(() => process.exit(0), 100);
