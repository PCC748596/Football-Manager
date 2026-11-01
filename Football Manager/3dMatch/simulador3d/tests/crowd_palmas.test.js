/*
PALMAS DA TORCIDA (js/crowd.js `Crowd.update`): pedido "palmas so na entrada dos times, depois de uma finalizacao perigosa ou durante as mudancas de cada time".
Em jogo parado/corrido normal ninguem bate palmas (mesmo com a bola no terco ofensivo); depois de um lance perigoso (`Match.palmasPerigo`) so a claque desse time bate palmas
por `duracaoPerigo` s; durante uma substituicao so a claque do time que troca; na entrada dos times, a fracao de sempre. Corre com: node tests/crowd_palmas.test.js
*/
const fs = require('fs');
const path = require('path');
const THREE = require('three');
const CR = String.fromCharCode(13), LF = String.fromCharCode(10);
const ler = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').split(CR + LF).join(LF);

const Match = { state: 'PLAY', ball: { position: { x: 0, y: 0, z: 40 } }, possessionTeam: 'TeamA', subsPendentes: [], subsEmCurso: null, palmasPerigo: null };
const amb = { THREE, console, Match, window: { cameraMode: 'orbit' }, Abertura: { activa: false, partes: [] } };
const mod = new Function(...Object.keys(amb),
    `const Lados = { trocados: false, dirDe(t) { return t === 'TeamA' ? 1 : -1; }, donoDaBaliza(z) { return z < 0 ? 'TeamA' : 'TeamB'; } };
     ${ler('js/utils.js').match(/function mergeNonIndexedGeometries[\s\S]*?\n}\n/)[0]}
     ${ler('js/crowd.js')}
     return { Crowd, CrowdModel };`)(...Object.values(amb));
const { Crowd, CrowdModel } = mod;
const AP = CrowdModel.aplauso;

let falhas = 0;
const erro = m => { falhas++; console.error('  X ' + m); };
const ok = m => console.log('  . ' + m);
const verifica = (c, b, m) => { if (c) ok(b); else erro(m); };

Crowd._uniforms = { uTempo: { value: 0 }, uFracPalmas: { value: new THREE.Vector2() }, uPalmasFirme: { value: 0 }, uAplauso: { value: 0 }, uFesta: { value: [0, 0] } };
Crowd.setFraccao = () => {};
Crowd._atualizarCaminhantes = () => {};
const palmas = () => [Crowd._uniforms.uFracPalmas.value.x, Crowd._uniforms.uFracPalmas.value.y];
const passo = (seg) => { for (let i = 0; i < Math.round(seg * 60); i++) Crowd.update(1 / 60); };

passo(5);
verifica(palmas()[0] === 0 && palmas()[1] === 0, 'jogo normal, mesmo com a bola no terco ofensivo de TeamA: ninguem bate palmas', 'palmas em jogo normal: ' + palmas());

Match.palmasPerigo = { team: 'TeamB' };
passo(0.1);
verifica(palmas()[1] === AP.perigo && palmas()[0] === 0, 'finalizacao perigosa de TeamB: so a claque B bate palmas', 'palmas depois do lance perigoso: ' + palmas());
passo(AP.duracaoPerigo + 1);
verifica(palmas()[0] === 0 && palmas()[1] === 0, `passados ${AP.duracaoPerigo} s as palmas acabam`, 'as palmas nao acabaram: ' + palmas());

Match.subsPendentes = [{ feita: false, lado: 'casa', estado: 'placa' }];
passo(0.1);
verifica(palmas()[0] === AP.perigo && palmas()[1] === 0, 'substituicao de TeamA em curso: so a claque A bate palmas', 'palmas na troca: ' + palmas());
Match.subsPendentes = [{ feita: false, lado: 'fora', estado: 'aquecer' }];
passo(0.1);
verifica(palmas()[0] === 0 && palmas()[1] === 0, 'a aquecer (ainda nao a trocar): sem palmas', 'palmas no aquecimento: ' + palmas());
Match.subsPendentes = [];

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
