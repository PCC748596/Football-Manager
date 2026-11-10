/*
PORQUE E QUE O PASSE FALHA: repartição dos desfechos (certo / cortado pelo adversario / dominio falhado / ninguem tocou) por faixa de distancia, com o erro de pontaria do passe (PassErrorModel) em
varias escalas: ERRO=1 (padrao), 0.4 (o valor dos sliders), 0 (sem erro nenhum). Uso: ERRO=0.4 node tools/headless/falhas_de_passe.js [segundos] [semente]
*/
const segundos = Number(process.argv[2] || 900), semente = Number(process.argv[3] || 0), erro = Number(process.env.ERRO ?? 1);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
for (const k of ['sigmaMax', 'sigmaMin', 'sigmaTecto']) if (typeof PassErrorModel[k] === 'number') PassErrorModel[k] *= erro;
if (process.env.SEMPRESSAO) PassErrorModel.pressaoMult = 1;
if (process.env.FATOR) PassInterceptModel.fatorMeiasEAtacantes = Number(process.env.FATOR);
Match.init(new THREE.Scene());
for (let i = 0; i < segundos * 60; i++) Match.update(1 / 60);
const r = MatchStats.resumoPasses();
const tot = { n: 0, certo: 0, corte: 0, falhou: 0, ninguem: 0 };
for (const l of r) { tot.n += l.n; tot.certo += l.pctCerto * l.n / 100; tot.corte += l.pctCortado * l.n / 100; tot.falhou += l.pctDominioFalhado * l.n / 100; tot.ninguem += l.pctNinguemTocou * l.n / 100; }
const p = (x) => (100 * x / Math.max(1, tot.n)).toFixed(0) + '%';
console.log(`ERRO x${erro} semente ${semente}: amostras ${tot.n} | certo ${p(tot.certo)} | cortado ${p(tot.corte)} | dominio falhado ${p(tot.falhou)} | ninguem ${p(tot.ninguem)} || ` + r.map(l => `${l.faixa}: n=${l.n} certo ${l.pctCerto}% cortado ${l.pctCortado}% falhou ${l.pctDominioFalhado}% vChegada ${l.vChegadaMediana}`).join(' ; '));
process.exit(0);
