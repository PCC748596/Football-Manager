/*
FALTAS DE LONGE: quantas sao cruzadas para a area. Conta, a cada falta montada (Match.state entra em FREE_KICK),
a decisao montada (remate / cruzamento / passe) e, para as que NAO sao remate, a fraccao de cruzamentos.
Uso: node tools/headless/faltas_cruzadas.js [segundos] [semente] [cruzamentoDeLongeProb]
*/
const segundos = Number(process.argv[2] || 1800);
const semente = Number(process.argv[3] || 0);
const prob = process.argv[4] !== undefined ? Number(process.argv[4]) : null;
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
if (prob !== null) FreeKickModel.cruzamentoDeLongeProb = prob;
const dt = 1 / 60;
const cont = { remate: 0, cruzamento: 0, passe: 0 };
let anterior = Match.state;
const detalhe = {};
for (let i = 0; i < Math.round(segundos / dt); i++) {
    Match.update(dt);
    if (Match.state === 'FREE_KICK' && anterior !== 'FREE_KICK') {
        // a decisao e montada no setup, que corre no mesmo frame da mudanca de estado ou logo a seguir
        Match._lerDecisao = i;
    }
    if (Match._lerDecisao !== undefined && i - Match._lerDecisao >= 2) {
        const d = Match.decisaoFaltaMontada;
        if (d && cont[d] !== undefined) cont[d]++;
        const t = Match.setPieceTaker;
        if (d && t && Match.ball) {
            const dz = t.dirZ, dFundo = Math.abs(dz * (CAMPO_COMP / 2) - Match.ball.position.z);
            const faixa = dFundo <= 26 ? '<=26' : dFundo <= 52 ? '26-52' : '>52';
            // Um cruzamento sem solucao (null) cai no passe na cobranca.
            let nulo = false;
            if (d === 'cruzamento') { let alg = 0; for (let k = 0; k < 20; k++) { const meus = (t.team === 'TeamA') ? Match.players : Match.opponents; if (!cruzamentoDeFalta(Match.ball.position, dz, meus.filter(p => p !== t && p.role !== 'gk'), Math.random)) alg++; } nulo = alg > 10; }
            const k = d + ' ' + faixa + (nulo ? ' (sem solucao)' : '');
            detalhe[k] = (detalhe[k] || 0) + 1;
        }
        Match._lerDecisao = undefined;
    }
    anterior = Match.state;
}
const naoRemate = cont.cruzamento + cont.passe;
console.log(JSON.stringify(detalhe, null, 1));
console.log(`semente ${semente} prob ${FreeKickModel.cruzamentoDeLongeProb}: remate ${cont.remate}, cruzamento ${cont.cruzamento}, passe ${cont.passe}; cruzado entre as que nao sao remate: ${(100 * cont.cruzamento / Math.max(1, naoRemate)).toFixed(0)}%`);
