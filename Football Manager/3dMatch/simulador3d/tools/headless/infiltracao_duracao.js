/*
A INFILTRACAO PARA CEDO? Relato: "os jogadores comecam a correr com o braco levantado e logo param".

Conta cada episodio de RUN_INTO_SPACE: quanto durou (a corrida pede ate 3.5 s) e POR QUE acabou, olhando para o estado no frame em que sai:
  tempo      o `runTimer` chegou a 0 (acabou como devia)
  chegou     chegou a menos de 1.5 m do alvo
  perdeu     a equipa perdeu a posse
  alvoAtras  o alvo ficou atras dele
  encurtada  o passe foi para outro e a intencao encurtou a corrida (Intencoes.restanteSemPasse)
  outra      qualquer outra saida de estado (carry, chute, etc.)

Uso: node tools/headless/infiltracao_duracao.js [segundos] [semente]
*/
const segundos = Number(process.argv[2] || 600);
const semente = Number(process.argv[3] || 0);

const mulberry32 = (a) => () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
Math.random = mulberry32(1000 + semente * 977);

require('./harness.js');

const dt = 1 / 60;
const scene = new THREE.Scene();
Match.init(scene);
if (typeof Officials !== 'undefined' && Officials.init) Officials.init(scene);
if (typeof Tatics !== 'undefined' && Tatics.updateSkills) Tatics.updateSkills();
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;

const causasInf = {}, durInf = {};
const causas = {}, origens = {}, durPorOrigem = {};
const duracoes = [];
const porCausa = {};
let encurtadas = 0;
const inicio = new Map();
let tempo = 0;

for (const p of [...Match.players, ...Match.opponents]) {
    const fsm = p.fsm;
    const orig = fsm.changeState.bind(fsm);
    fsm.changeState = function (novo, ...resto) {
        const velho = fsm.currentState;
        if (velho !== 'RUN_INTO_SPACE' && novo === 'RUN_INTO_SPACE') {
            inicio.set(p, tempo);
            // Quem pediu a corrida e com que runTimer ela comecou (runTimer <= 0 = morre no primeiro frame).
            const quem = ((new Error().stack || '').split(String.fromCharCode(10)).slice(2, 8).map(l => (l.match(/at (?:Object\.|Player\.)?([\w.]+)/) || [])[1]).filter(Boolean).find(n => /^act|^actI|Infiltr|Overlap|Devolu|Tabel|Espa/i.test(n))) || '?';
            const k = quem + (p.runTimer > 0 ? ' (timer ok)' : ' (timer 0)');
            origens[k] = (origens[k] || 0) + 1;
            p._origem = k;
        }
        if (velho === 'RUN_INTO_SPACE' && novo !== 'RUN_INTO_SPACE') {
            const dur = tempo - (inicio.get(p) || 0);
            let causa = 'outra';
            if (novo === 'MOVE_TO_POS') {
                const chegou = p.dynamicTarget && p.model.position.distanceTo(p.dynamicTarget) < 1.5;
                const atras = p.dynamicTarget && ((p.dynamicTarget.z - p.model.position.z) * p.dirZ) < -1.0;
                if (p.runTimer <= 0) causa = (p._encurtada ? 'encurtada' : 'tempo');
                else if (Match.possessionTeam !== p.team) causa = 'perdeu';
                else if (atras) causa = 'alvoAtras';
                else if (chegou) causa = 'chegou';
            }
            if (p._origem && p._origem.includes('actInfiltrar')) { causasInf[causa] = (causasInf[causa] || 0) + 1; (durInf[causa] = durInf[causa] || []).push(dur); }
            causas[causa] = (causas[causa] || 0) + 1;
            (porCausa[causa] = porCausa[causa] || []).push(dur);
            duracoes.push(dur);
            (durPorOrigem[p._origem] = durPorOrigem[p._origem] || []).push(dur);
        }
        return orig(novo, ...resto);
    };
}

for (let i = 0; i < Math.round(segundos / dt); i++) { Match.update(dt); tempo += dt; }

const med = (xs) => xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2) : '-';
const curtas = duracoes.filter(d => d < 1.0).length;
console.log(`semente ${semente} (${segundos}s): ${duracoes.length} corridas, duracao media ${med(duracoes)} s, ${curtas} com menos de 1 s (${duracoes.length ? (100 * curtas / duracoes.length).toFixed(0) : 0}%)`);
Object.keys(causas).sort((a, b) => causas[b] - causas[a]).forEach(c => console.log(`  ${c.padEnd(10)} ${String(causas[c]).padStart(4)}  duracao media ${med(porCausa[c])} s`));

console.log('  por origem (quem pediu a corrida):');
Object.keys(origens).sort((a, b) => origens[b] - origens[a]).forEach(k => console.log(`    ${k.padEnd(34)} ${String(origens[k]).padStart(4)}  duracao media ${med(durPorOrigem[k] || [])} s`));

console.log('  so as infiltracoes (actInfiltrar), por causa do fim:');
Object.keys(causasInf).sort((a, b) => causasInf[b] - causasInf[a]).forEach(c => console.log(`    ${c.padEnd(10)} ${String(causasInf[c]).padStart(4)}  duracao media ${med(durInf[c])} s`));

{
    const todas = [].concat(...Object.values(durInf)).sort((a, b) => a - b);
    const q = (f) => todas.length ? todas[Math.floor(todas.length * f)].toFixed(1) : '-';
    console.log(`  infiltracoes (actInfiltrar): ${todas.length} | duracao p10 ${q(0.1)}  mediana ${q(0.5)}  p90 ${q(0.9)} s | >= 4 s: ${(100 * todas.filter(d => d >= 4).length / Math.max(1, todas.length)).toFixed(0)}%`);
}
process.exit(0);
