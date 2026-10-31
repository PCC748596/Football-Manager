/*
NA DISPUTA DE PENALTIS NINGUEM FLUTUA (relato com fotos: "o goleiro esta flutuando", os de linha "um pouco no ar"). O goleiro que mergulhou ficava com `gkEstado = 'mergulho'` e a
altura do mergulho, e o `assentarNoChao` nao assenta um goleiro em mergulho: caminhava e esperava as cobrancas seguintes 20 a 75 cm acima do relvado. Mede-se a sola (a bota mais
baixa, no mundo) de goleiros e de linha em todas as fases de varias cobrancas com a app falsa. Corre com: node tests/disputa_assento.test.js
*/
require('../tools/headless/harness.js');

// Sorteio fixo: as mesmas cobrancas (e os mesmos mergulhos) em todas as corridas.
let semente = 12345;
Math.random = () => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente / 2147483648; };

let falhas = 0;
const ok = m => console.log('  . ' + m);
const erro = m => { console.log('  X ' + m); falhas++; };
const verifica = (cond, bom, mau) => { if (cond) ok(bom); else erro(mau); };

if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = false;
const cena = new THREE.Scene();
Match.init(cena); Officials.init(cena);
Match.resetPlay('TeamA');
const dt = 1 / 60;
for (let i = 0; i < 120; i++) Match.update(dt);

const v = new THREE.Vector3();
const sola = (p) => {
    let min = Infinity;
    for (const b of [p.rig && p.rig.lBota, p.rig && p.rig.rBota]) {
        if (!b) continue;
        const g = b.geometry; if (!g.boundingBox) g.computeBoundingBox();
        b.updateWorldMatrix(true, false);
        const bb = g.boundingBox;
        for (let i = 0; i < 8; i++) { v.set(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z).applyMatrix4(b.matrixWorld); if (v.y < min) min = v.y; }
    }
    return min;
};

const msgs = [];
Ponte.modo = 'visivel';
Ponte.enviar = (tipo, dados) => msgs.push({ tipo, dados });
DisputaPenaltis.iniciar();
// Por fase: a pior sola de cada grupo (fases de caminhar e esperar: ninguem tem razao para sair do chao).
const pior = {};
const notar = (fase) => {
    for (const p of Match.players.concat(Match.opponents)) {
        const k = fase + (p.role === 'gk' ? ' GK' : ' linha');
        const s = sola(p); if (!isFinite(s)) continue;
        if (!(k in pior) || s > pior[k]) pior[k] = s;
    }
};
let mergulhos = 0, n = 0;
while (DisputaPenaltis.activa && n < 60 * 300) {
    Match.update(dt); n++;
    const D = DisputaPenaltis;
    if (D.fase === 'PREPARO' || D.fase === 'ORDEM' || D.fase === 'REUNIAO') notar(D.fase);
    if (Match.players.concat(Match.opponents).some(p => p.gkEstado === 'mergulho')) mergulhos++;
    const r = msgs.find(m => m.tipo === 'disputa_reuniao' && !m.lido);
    if (r && D.fase === 'ORDEM') { r.lido = true; D.receberOrdens(r.dados.casa.map(j => j.id), r.dados.fora.map(j => j.id), { lado: r.dados.primeiro, jogadorId: r.dados[r.dados.primeiro][0].id }); }
    const c = msgs.find(m => m.tipo === 'disputa_cobranca' && !m.lido);
    if (c && D.fase === 'AGUARDA') {
        c.lido = true;
        const feitas = msgs.filter(m => m.tipo === 'disputa_cobranca').length, r0 = msgs.find(m => m.tipo === 'disputa_reuniao');
        if (feitas >= 6) D.receberProxima({ fim: true, vencedor: 'casa', pens: [1, 0] });
        else { const lado = c.dados.lado === 'casa' ? 'fora' : 'casa'; D.receberProxima({ lado, jogadorId: r0.dados[lado][1 + (feitas >> 1)].id }); }
    }
}
const feitas = msgs.filter(m => m.tipo === 'disputa_cobranca').length;
console.log('1 — ' + feitas + ' cobrancas, ' + (mergulhos > 0 ? 'com' : 'sem') + ' mergulhos do goleiro');
verifica(feitas === 6 && mergulhos > 0, 'houve cobrancas e mergulhos (o caso do relato)', `cobrancas ${feitas}, frames com mergulho ${mergulhos}`);
console.log('2 — a pior sola (m) em cada fase de caminhar / esperar: no maximo 7 cm (a passada levanta o pe; o mergulho deixava 20-75 cm)');
for (const k of Object.keys(pior).sort()) verifica(pior[k] <= 0.07, `${k}: ${pior[k].toFixed(3)}`, `${k}: ${pior[k].toFixed(3)} (no ar)`);
verifica(Object.keys(pior).some(k => k.startsWith('PREPARO GK')), 'mediu o goleiro no PREPARO', 'nao mediu o goleiro no PREPARO');

if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\ntudo certo');
process.exit(0);
