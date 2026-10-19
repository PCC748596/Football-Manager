/*
AJUSTE DOS INTERVALOS ENTRE LINHAS DAS TABELAS POR ZONA (data/formacoes_zonas.js) — para as formacoes terem a MESMA coerencia (pedido: manter coerencia nos esquemas).

Para cada formacao, fase (com/sem bola) e zona da bola: agrupa os postos em linhas pelo desenho (o mesmo criterio do motor, BlockShape.linhasJuntaAte) e move cada
linha para que o intervalo entre a media de uma linha e a da anterior seja o ALVO da fase; a linha de tras fica onde esta. Cada jogador mantem o seu desvio
relativo a media da linha (o 6 recuado do triangulo continua recuado). O limite do campo corta (normalizado z em [-0.98, 0.98]); a posicao em x nao muda.

NAO sobrescreve nada: escreve saves-style `data/formacoes_zonas.ajustada.js` (e um resumo) para o utilizador abrir no tacticsEditor.html (Importar) e comparar.

Uso:  node tools/headless/ajustar_linhas_zonas.js [alvoComBola 12] [alvoSemBola 10.5]
*/
const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..', '..');
const vm = require('vm');
const alvoCom = Number(process.argv[2] || 12), alvoSem = Number(process.argv[3] || 10.5);
const META_Z = 53, JUNTA = 10.0;
// So estas formacoes/intervalos (m NOMINAIS na tabela; o jogo comprime ~20%): null = manter o intervalo que ja la esta, zona a zona.
const ALVOS = {
    '4-2-3-1':   { com: [13, 13, 13], sem: [13, 13, 13] },
    '4-3-3 ATA': { com: [null, 13, null], sem: [null, 13, 10.5] },
    '5-3-2':     { com: [null, 12] },
    '5-4-1':     { com: [null, 12] }
};

const src = fs.readFileSync(path.join(RAIZ, 'data', process.env.BASE || 'formacoes_zonas.js'), 'utf8');
const T = vm.runInNewContext(src.replace(/^const FormacoesZonas =/m, 'FZ =') + ';FZ;', {});

// As linhas de cada formacao: pelo desenho (z dos postos em metros) -> indice da linha de cada slot.
const linhasDe = (F) => {
    const campo = F.slots.map((s, i) => ({ i, s })).filter(o => o.s.role !== 'gk' && o.s.pos !== 'GK');
    const zs = campo.map(o => o.s.z !== undefined ? o.s.z : null);
    return { campo, zs };
};

const tsTypes = fs.readFileSync(path.join(RAIZ, '..', '..', 'types.ts'), 'utf8');
const _i = tsTypes.indexOf('export const FORMATIONS'), _j = tsTypes.indexOf('\n};', _i);
const MGR = new Function(tsTypes.slice(_i, _j + 3).replace(/export const FORMATIONS[^=]*=/, 'const F =') + ';return F;')();
const saida = JSON.parse(JSON.stringify(T));
const resumo = [];
for (const [nome, F] of Object.entries(T.formacoes)) {
    if (/^\d+$/.test(nome) || !ALVOS[nome]) continue;
    // desenho: usa a media das tabelas 'sem' (o desenho base) para agrupar
    const n = F.slots.length;
    const idxCampo = [];
    for (let i = 0; i < n; i++) if (!(F.slots[i].role === 'gk' || F.slots[i].pos === 'GK' || i === 0)) idxCampo.push(i);
    // z de DESENHO de cada slot (types.ts FORMATIONS, o mesmo que o motor usa para agrupar as linhas): z = (-0.95 + (88 - y) / 73 * 1.55) * 53.
    const mgrSlots = MGR[nome];
    const zMedia = idxCampo.map(i => (-0.95 + ((88 - mgrSlots[i].y) / 73) * 1.55) * META_Z);
    const ord = idxCampo.map((i, q) => ({ i, z: zMedia[q] })).sort((a, b) => a.z - b.z);
    const grupos = [];
    for (const o of ord) { const g = grupos[grupos.length - 1]; if (g && (o.z - g[g.length - 1].z) < JUNTA) g.push(o); else grupos.push([o]); }
    const linhaDe = {}; grupos.forEach((g, k) => g.forEach(o => { linhaDe[o.i] = k; }));
    const K = grupos.length;
    if (!ALVOS[nome]) continue;
    for (const fase of ['com', 'sem']) {
        const alvos = ALVOS[nome][fase];
        if (!alvos) continue;
        for (let zona = 0; zona < 9; zona++) {
            const tab = saida.formacoes[nome][fase][zona];
            const media = grupos.map(g => g.reduce((s, o) => s + tab[o.i].z * META_Z, 0) / g.length);
            const novo = [media[0]];
            for (let k = 1; k < K; k++) novo.push(novo[k - 1] + ((alvos[k - 1] === null || alvos[k - 1] === undefined) ? (media[k] - media[k - 1]) : alvos[k - 1]));
            const tecto = 0.97 * META_Z;
            const frente = Math.max(...grupos[K - 1].map(o => tab[o.i].z * META_Z - media[K - 1] + novo[K - 1]));
            if (frente > tecto && K > 1) {
                const f = (tecto - novo[0] - (frente - novo[K - 1])) / (novo[K - 1] - novo[0]);
                for (let k = 1; k < K; k++) novo[k] = novo[0] + (novo[k] - novo[0]) * Math.max(0.5, Math.min(1, f));
            }
            grupos.forEach((g, k) => g.forEach(o => {
                const z = (tab[o.i].z * META_Z - media[k] + novo[k]) / META_Z;
                tab[o.i].z = Math.max(-0.98, Math.min(0.98, Math.round(z * 1000) / 1000));
            }));
        }
        const mTab = (tabela) => grupos.map(g => g.reduce((s, o) => s + tabela[o.i].z * META_Z, 0) / g.length);
        const antes = mTab(T.formacoes[nome][fase][4]), depois = mTab(saida.formacoes[nome][fase][4]);
        const gap = (m) => m.slice(1).map((z, k) => (z - m[k]).toFixed(1)).join(' / ');
        resumo.push(`${nome.padEnd(10)} ${fase}  zona do meio: intervalos ${gap(antes).padEnd(18)} -> ${gap(depois)}   (${K} linhas)`);
    }
}
const cab = (src.match(/^\/\*[\s\S]*?\*\//) || [''])[0];
fs.writeFileSync(path.join(RAIZ, 'data', process.env.SAIDA || 'formacoes_zonas.ajustada.js'), (cab ? cab + '\n' : '') + 'const FormacoesZonas = ' + JSON.stringify(saida) + ';\nif (typeof window !== "undefined") window.FormacoesZonas = FormacoesZonas;\nif (typeof module !== "undefined") module.exports = FormacoesZonas;\n');
console.log(resumo.join('\n'));
console.log('escrito: data/formacoes_zonas.ajustada.js (alvos: com bola ' + alvoCom + ' m, sem bola ' + alvoSem + ' m)');
