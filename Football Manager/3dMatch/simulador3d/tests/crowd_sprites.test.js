/*
Torcida em sprite (CrowdModel.sprites): com `?torcida=sprite` o build faz UM quad (2 triangulos) por adepto em vez dos 4 canais 3D,
o material leva o patch dos shaders (GLSL ASCII) e `recolorir` troca a cor da camisa por claque. Sem `?torcida` e sem toque, continua 3D.
*/
const fs = require('fs');
const path = require('path');
const THREE = require('three');
const CR = String.fromCharCode(13), LF = String.fromCharCode(10);
const ler = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').split(CR + LF).join(LF);

const win = { TORCIDA_ATLAS: 'data:image/png;base64,AAAA', location: { search: '?torcida=sprite' } };
const amb = { THREE, console, window: win, Image: function () {}, URLSearchParams };
const { Crowd, CrowdModel } = new Function(...Object.keys(amb),
    `${ler('js/utils.js').match(/function mergeNonIndexedGeometries[\s\S]*?\n}\n/)[0]}
     ${ler('js/crowd.js')}
     return { Crowd, CrowdModel };`)(...Object.values(amb));

let falhas = 0;
const erro = m => { falhas++; console.error('  X ' + m); };
const L = [];
for (let f = 0; f < 30; f++) for (let x = -40; x < 40; x += 0.62) L.push({ x, y: 1 + f * 0.45, z: -60 - f * 0.8, rotY: 0 });
for (let f = 0; f < 30; f++) for (let x = -40; x < 40; x += 0.62) L.push({ x, y: 1 + f * 0.45, z: 60 + f * 0.8, rotY: Math.PI });

const scene = new THREE.Scene();
Crowd.build(scene, L);
const grupos = Crowd._grupos;
let n = 0, n3d = 0;
const triEsperados = CrowdModel.sprites.cruzado ? 4 : 2;   // o quad cruzado (profundidade): 2 quads a 90 graus
for (const g of grupos) {
    const chaves = Object.keys(g);
    if (chaves.includes('sprite')) {
        if (chaves.join() !== 'sprite') erro('fatia de sprite com canais a mais: ' + chaves.join());
        n += g.sprite.count;
        const tri = g.sprite.geometry.index ? g.sprite.geometry.index.count / 3 : g.sprite.geometry.attributes.position.count / 3;
        if (tri !== triEsperados) erro('o sprite deve ter ' + triEsperados + ' triangulos, tem ' + tri);
        // o 2.o quad leva position.z = 1 (o shader roda-o 90 graus)
        if (CrowdModel.sprites.cruzado) { const pz = g.sprite.geometry.attributes.position; let z1 = 0; for (let k = 0; k < pz.count; k++) if (pz.getZ(k) === 1) z1++; if (z1 !== 4) erro('o quad cruzado deve ter 4 vertices com z = 1, tem ' + z1); }
        if (g.sprite.material.side !== THREE.DoubleSide) erro('o material do sprite deve ser DoubleSide');
    } else { n3d += g.camisa ? g.camisa.count : 0; }   // fatia 3D completa (a fracao da frente)
}
const frac3d = n3d / (n + n3d);
console.log(`3D completo: ${n3d} adeptos (${(100 * frac3d).toFixed(1)}%)`);
if (CrowdModel.sprites.fracao3d > 0 && Math.abs(frac3d - CrowdModel.sprites.fracao3d) > 0.02) erro('a fracao em 3D devia ser ~' + CrowdModel.sprites.fracao3d + ', e ' + frac3d.toFixed(3));
console.log(`sprites: ${n} adeptos em ${grupos.length} fatias`);
if (n < 1000) erro('poucos adeptos: ' + n);
if (n + n3d < 7000) erro('adeptos a menos no total: ' + (n + n3d));

// o shader compila na string: corre o onBeforeCompile com um shader falso
const mat = grupos[0].sprite.material;
const sh = { uniforms: {}, vertexShader: '#include <begin_vertex>', fragmentShader: '#include <map_fragment>' };
mat.onBeforeCompile(sh);
if (sh.vertexShader.indexOf('vUvS = vec2') < 0) erro('vertex shader nao foi patchado');
if (sh.fragmentShader.indexOf('uAtlas, vUvS') < 0) erro('fragment shader nao foi patchado');
if (/[^\x00-\x7f]/.test(sh.vertexShader + sh.fragmentShader)) erro('GLSL com bytes fora de ASCII');
const attrs = Object.keys(grupos[0].sprite.geometry.attributes).length + 4;   // + instanceMatrix (mat4 = 4 slots)
if (attrs > 16) erro('mais de 16 attributes: ' + attrs);

// variantes e cores
const aVar = grupos[0].sprite.geometry.attributes.aVar.array;
const celulas = new Set(); for (let i = 0; i < grupos[0].sprite.count; i++) { celulas.add(aVar[i * 4]); celulas.add(aVar[i * 4 + 1]); }
console.log('celulas usadas (de pe / festejo): ' + [...celulas].sort((a, b) => a - b).join(','));
if (celulas.size < 5) erro('pouca variedade de poses');

Crowd.recolorir({ A: { principal: '#00ff00', cor1: '#00ff00', cor2: '#00ff00', calcao: '#fff' }, B: { principal: '#0000ff', cor1: '#0000ff', cor2: '#0000ff', calcao: '#fff' } });
const aCor = grupos[0].sprite.geometry.attributes.aCor.array, aA = grupos[0].sprite.geometry.attributes.aAdepto.array;
let verde = 0, azul = 0;
for (let i = 0; i < grupos[0].sprite.count; i++) { if (aCor[i * 3 + 1] === 1) verde++; if (aCor[i * 3 + 2] === 1) azul++; }
console.log(`recolorir: ${verde} verdes (A), ${azul} azuis (B)`);
if (verde + azul !== grupos[0].sprite.count) erro('recolorir nao tocou em todos');

Crowd.setFraccao('A', 0.5, false); Crowd.update(0.016);

// sem o parametro e sem toque: 3D
win.location.search = '';
Crowd.reconstruir(); 
const g0 = Crowd._grupos[0];
if (g0.sprite) erro('sem ?torcida e sem toque devia ser 3D'); else console.log('sem ?torcida: 3D (' + Object.keys(g0).length + ' canais)');

if (falhas) { console.error('\nFALHOU: ' + falhas); process.exit(1); }
console.log('\nOK: torcida em sprite — um quad por adepto, shaders patchados, cores por claque.');
