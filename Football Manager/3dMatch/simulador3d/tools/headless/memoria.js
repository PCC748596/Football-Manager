/*
O LIXO E LIMPO? Corre um jogo longo e, de `intervalo` em `intervalo` minutos de jogo, forca o garbage collector e mede o heap usado (MB). Se o heap sobe sempre apos a limpeza ha uma fuga.
Tambem conta o tamanho das listas que podiam crescer sem fim (eventos, historico do replay, log do treinador, ...).
Uso: node --expose-gc tools/headless/memoria.js [minutos] [intervalo]
*/
if (typeof gc !== 'function') { console.error('corre com: node --expose-gc'); process.exit(1); }
const minutos = Number(process.argv[2] || 60), intervalo = Number(process.argv[3] || 10);
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry32(4242);
require('./harness.js');
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;
Match.init(new THREE.Scene());
const dt = 1 / 60;
const mb = () => { gc(); gc(); return process.memoryUsage().heapUsed / 1048576; };
const tam = (o) => { try { if (Array.isArray(o)) return o.length; if (o instanceof Map || o instanceof Set) return o.size; if (o && typeof o === 'object') return Object.keys(o).length; } catch (e) {} return -1; };
const listas = () => {
    const r = {};
    const add = (nome, v) => { const n = tam(v); if (n >= 0) r[nome] = n; };
    if (typeof Eventos !== 'undefined') add('Eventos.lista', Eventos.lista);
    if (typeof TreinadorCPU !== 'undefined') add('TreinadorCPU._log', TreinadorCPU._log);
    if (typeof MatchReplay !== 'undefined') { add('Replay.frames', MatchReplay.frames || MatchReplay.buffer || MatchReplay.historico); }
    if (typeof Narrador !== 'undefined') add('Narrador.linhas', Narrador.linhas);
    if (typeof MatchStats !== 'undefined') add('MatchStats.passes.log', MatchStats.passesLog);
    if (typeof Officials !== 'undefined') add('Officials._arrefecimento', Officials._arrefecimento);
    return r;
};
const base = mb();
console.log(`inicio: ${base.toFixed(1)} MB`);
const amostras = [];
const passos = Math.round(minutos / intervalo);
for (let k = 1; k <= passos; k++) {
    for (let i = 0; i < Math.round(intervalo * 60 / dt); i++) Match.update(dt);
    const m = mb(); amostras.push(m);
    console.log(`min ${String(k * intervalo).padStart(3)}: ${m.toFixed(1)} MB (${(m - base >= 0 ? '+' : '') + (m - base).toFixed(1)}) ${JSON.stringify(listas())}`);
}
const subida = amostras.length > 1 ? (amostras[amostras.length - 1] - amostras[0]) / (amostras.length - 1) : 0;
console.log(`tendencia apos a limpeza: ${subida >= 0 ? '+' : ''}${subida.toFixed(2)} MB por ${intervalo} min de jogo`);
process.exit(0);
