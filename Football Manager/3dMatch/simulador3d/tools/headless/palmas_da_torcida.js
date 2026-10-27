/*
AS PALMAS DA TORCIDA SE TOCAM? Monta as geometrias das poses `palmasS` / `palmasP` do Crowd e mede, para o canal da pele (maos e antebracos) e o das mangas, a distancia em X entre as duas maos
(os vertices mais a frente do braco, por lado) com os bracos em repouso e no ponto de fecho do bater de palmas (o shader tira `bracos * amplitude` de |x| em cada lado).
Uso: node tools/headless/palmas_da_torcida.js
*/
const fs = require('fs'), path = require('path');
const THREE = require('three');
const CR = String.fromCharCode(13), LF = String.fromCharCode(10);
const ler = f => fs.readFileSync(path.join(__dirname, '..', '..', f), 'utf8').split(CR + LF).join(LF);
const mod = new Function('THREE', 'console', `${ler('js/utils.js').match(/function mergeNonIndexedGeometries[\s\S]*?\n}\n/)[0]}
     ${ler('js/crowd.js')}
     return { Crowd, CrowdModel };`)(THREE, console);
const { Crowd, CrowdModel } = mod;
for (const nome of ['palmasS', 'palmasP']) {
    const g = Crowd._geometriasDaPose(CrowdModel.poses[nome]);
    for (const canal of Object.keys(g)) {
        const pos = g[canal].attributes.position;
        let maxZ = -9, n = 0;
        for (let i = 0; i < pos.count; i++) maxZ = Math.max(maxZ, pos.getZ(i));
        // Os vertices das maos: os mais a frente (z perto do maximo) por lado.
        let dir = 9, esq = -9;
        for (let i = 0; i < pos.count; i++) {
            if (pos.getZ(i) < maxZ - 0.08) continue;
            const x = pos.getX(i);
            if (x > 0) dir = Math.min(dir, x); else esq = Math.max(esq, x);
        }
        if (dir < 9 && esq > -9) console.log(nome.padEnd(8), canal.padEnd(10), 'zmax', maxZ.toFixed(3), '| borda interna das maos: x=' + esq.toFixed(3) + ' e x=' + dir.toFixed(3) + ' -> vao ' + (dir - esq).toFixed(3));
    }
}
console.log('--- maos (pele com z > 0.3), por lado ---');
for (const nome of ['palmasS', 'palmasP']) {
    const g = Crowd._geometriasDaPose(CrowdModel.poses[nome]).pele, pos = g.attributes.position;
    for (const lado of [1, -1]) {
        let mn = 9, mx = -9, y0 = 9, y1 = -9, z0 = 9, z1 = -9, n = 0;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i) * lado; if (x <= 0 || pos.getZ(i) < 0.3) continue;
            n++; mn = Math.min(mn, x); mx = Math.max(mx, x); y0 = Math.min(y0, pos.getY(i)); y1 = Math.max(y1, pos.getY(i)); z0 = Math.min(z0, pos.getZ(i)); z1 = Math.max(z1, pos.getZ(i));
        }
        console.log(nome, lado > 0 ? 'x+' : 'x-', 'n', n, '| |x|', mn.toFixed(3), '..', mx.toFixed(3), '| y', y0.toFixed(2), '..', y1.toFixed(2), '| z', z0.toFixed(2), '..', z1.toFixed(2));
    }
}
console.log('--- maos sentado (pele, y > 0.75, z > 0.3) ---');
{
    const g = Crowd._geometriasDaPose(CrowdModel.poses.palmasS).pele, pos = g.attributes.position;
    let mn = 9, mx = -9, y0 = 9, y1 = -9, z0 = 9, z1 = -9, n = 0;
    for (let i = 0; i < pos.count; i++) {
        const x = Math.abs(pos.getX(i)); if (pos.getZ(i) < 0.3 || pos.getY(i) < 0.75) continue;
        n++; mn = Math.min(mn, x); mx = Math.max(mx, x); y0 = Math.min(y0, pos.getY(i)); y1 = Math.max(y1, pos.getY(i)); z0 = Math.min(z0, pos.getZ(i)); z1 = Math.max(z1, pos.getZ(i));
    }
    console.log('n', n, '| |x|', mn.toFixed(3), '..', mx.toFixed(3), '| y', y0.toFixed(2), '..', y1.toFixed(2), '| z', z0.toFixed(2), '..', z1.toFixed(2));
}
console.log('--- tudo (todos os canais) com z > 0.26 e |x| > 0.1: y maximo fora das maos, sentado ---');
{
    const gs = Crowd._geometriasDaPose(CrowdModel.poses.palmasS);
    for (const c of Object.keys(gs)) { const pos = gs[c].attributes.position; let ymax = -9, ymin = 9, n = 0; for (let i = 0; i < pos.count; i++) { if (pos.getZ(i) > 0.26 && Math.abs(pos.getX(i)) > 0.1) { n++; ymax = Math.max(ymax, pos.getY(i)); ymin = Math.min(ymin, pos.getY(i)); } } if (n) console.log(c.padEnd(9), 'n', n, 'y', ymin.toFixed(2), '..', ymax.toFixed(2)); }
}
