/*
O FIM DA PARTIDA EM ZONA SEGURA (MatchDuration.fimSeguro): joga ate ao apito final (o 2.o tempo, com o acrescimo) e diz onde estava a bola. SEM=1 desliga a regra. Uso: node tools/headless/fim_seguro.js [semente]
*/
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + Number(process.argv[2] || 1) * 977);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
const SEM = process.env.SEM === '1'; if (SEM) MatchDuration.fimSeguro.activo = false;
Match.init(new THREE.Scene());
let fim = null;
Match.encerrarJogo = function () { fim = { x: this.ball.position.x, z: this.ball.position.z, t: this.tempoDeJogo }; this.mudarEstado('FIM_DE_JOGO', 'teste'); };
let i = 0;
while (!fim && i < 60 * 1500) {
  Match.update(1 / 60); i++;
  if (Match.state === 'PLAY' && Match.primeiroTempoAcabou && Match.tempoDeJogo > 5300) { Sim.running = false; try { Match.verificarFimDeTempo(); } finally { Sim.running = true; } }
}
console.log(SEM ? 'SEM ' : 'COM ', 'semente', process.argv[2], fim ? `fim em x=${fim.x.toFixed(1)} z=${fim.z.toFixed(1)} a ${(fim.t / 60).toFixed(1)} min (acrescimo ${(Match.acrescimo2 / 60) | 0} min) | zona segura: ${Math.abs(fim.x) < 11.33 && Math.abs(fim.z) < 18.25}` : 'nao terminou', '| sim s', (i / 60) | 0);
process.exit(0);
