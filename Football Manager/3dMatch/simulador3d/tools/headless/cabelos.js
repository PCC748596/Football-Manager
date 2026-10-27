/*
OS ESTILOS DE CABELO: constroi o corpo de um jogador (nivel `leve` 4, o dos titulares) com cada estilo e conta os triangulos VISIVEIS do corpo todo; a diferenca para o `curto` e o custo do estilo.
Tambem mostra como o sorteio por id reparte os estilos (aparencia clara e escura).
Uso: node tools/headless/cabelos.js
*/
require('./harness.js');
const tris = (obj) => { let n = 0; obj.traverse(o => { if (!o.isMesh || o.visible === false) return; let p = o.parent, vis = true; while (p) { if (p.visible === false) { vis = false; break; } p = p.parent; } if (!vis) return; const g = o.geometry; n += (g.index ? g.index.count : g.attributes.position.count) / 3; }); return Math.round(n); };
const estilos = ['curto', 'careca', 'militar', 'topete', 'partido', 'afro', 'cacheado', 'franja', 'mullet', 'longo', 'platinado', 'coque', 'moicano', 'dreads', 'trancas', 'picos', 'raspado', 'degrade'];
let base = null;
for (const e of estilos) {
    const ap = { tipo: 'castanhoClaro', cabelo: 0x3a2a1a, pele: 0xe8c9a8, chuteira: 'preta', corChuteira: 0x1c1c1c, estilo: e };
    const { corpo } = construirCorpo(0xcc2222, 0x111111, ap, null, 4);
    const n = tris(corpo); if (e === 'curto') base = n;
    console.log(e.padEnd(9), String(n).padStart(4), 'triangulos', e === 'curto' ? '' : '(' + (n - base >= 0 ? '+' : '') + (n - base) + ')');
}
const cont = { claro: {}, escuro: {} };
for (let id = 1; id <= 4000; id++) { for (const [k, tipo] of [['claro', 'loiro'], ['escuro', 'negro']]) { const e = estiloDeCabeloDe(id, tipo); cont[k][e] = (cont[k][e] || 0) + 1; } }
const pc = (o) => Object.entries(o).map(([k, v]) => k + ' ' + (100 * v / 4000).toFixed(0) + '%').join(', ');
console.log('sorteio (pele clara):', pc(cont.claro)); console.log('sorteio (pele escura):', pc(cont.escuro));
process.exit(0);
