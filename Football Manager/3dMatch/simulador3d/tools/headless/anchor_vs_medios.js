/*
O ANCHOR MAN E OS MEDIOS: com `anchor_man` atribuido a um jogador (o DM; senao o 1.o medio), mede a distancia dele a linha MEDIA dos outros medios (o z medio dos 'mid' sem ser ele), no referencial de ataque:
positivo = ele passou os medios. Mostra a fraccao de frames a frente deles, por posse (com / sem bola) e por estado da FSM.
Uso: node tools/headless/anchor_vs_medios.js [segundos] [semente]
*/
const segundos = Number(process.argv[2] || 900), semente = Number(process.argv[3] || 0);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(1000 + semente * 977);
require('./harness.js'); if (typeof Sim === 'undefined') global.Sim = {}; Sim.running = true;
Tatics.formacaoA = '4231';   // a unica formacao do motor com DM (o Anchor Man e DM); os 'medios' de comparacao sao os CM/AM, sem as alas
Match.init(new THREE.Scene());
const A = Match.players.find(p => p.pos === 'DM');
A.playingStyle = 'anchor_man';
const dif = [], porEstado = {}; let n = 0, ahead = 0, aheadCom = 0, nCom = 0;
for (let i = 0; i < segundos * 60; i++) {
    A.playingStyle = 'anchor_man';   // o motor reatribui os estilos pela habilidade: o teste mantem este
    Match.update(1 / 60);
    if (i % 6 || Match.state !== 'PLAY' || !A.model) continue;
    const outros = Match.players.filter(p => p.role === 'mid' && p !== A && p.model && !['LM', 'RM', 'LW', 'RW'].includes(p.pos));
    if (!outros.length) continue;
    const linha = outros.reduce((s, p) => s + p.model.position.z * p.dirZ, 0) / outros.length;
    const d = A.model.position.z * A.dirZ - linha;
    const com = Match.possessionTeam === A.team;
    n++; if (com) nCom++;
    if (d > 0) { ahead++; if (com) aheadCom++; const k = A.fsm.currentState + (Match.ballCarrier === A ? '/portador' : ''); porEstado[k] = (porEstado[k] || 0) + 1; }
    dif.push(d);
}
dif.sort((a, b) => a - b); const q = (f) => dif[Math.floor(dif.length * f)].toFixed(1);
console.log(`s${semente}: anchor ${A.pos} | vs linha dos medios: p10 ${q(.1)} med ${q(.5)} p90 ${q(.9)} max ${q(.999)} m | a frente dos medios: ${(100 * ahead / n).toFixed(0)}% do tempo (${(100 * aheadCom / Math.max(1, nCom)).toFixed(0)}% com bola)`);
console.log('  por estado quando esta a frente:', JSON.stringify(porEstado));
process.exit(0);
