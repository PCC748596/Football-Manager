/*
Multidão: 10 000 adeptos com o modelo dos jogadores, sentados, em
InstancedMesh.

Corre o `js/crowd.js` a sério com o `three` de node, sobre lugares sintéticos
com a forma de um estádio, e mede o que se pode medir sem olhar para o ecrã:

  - quatro canais de cor, um InstancedMesh cada, todos com as MESMAS matrizes
    (é isso que faz as quatro peças coincidirem no mesmo corpo);
  - a pose está sentada — o corpo é mais baixo do que largo em Z, ao contrário
    de um boneco de pé;
  - 90% da torcida e da casa e 10% do visitante, o visitante todo junto no canto direito das cameras;
  - a construção é determinística: o estádio é igual em cada arranque.
*/
const fs = require('fs');
const path = require('path');
const THREE = require('three');

const CR = String.fromCharCode(13), LF = String.fromCharCode(10);
const semCR = s => s.split(CR + LF).join(LF);
const raiz = path.join(__dirname, '..');
const ler = f => semCR(fs.readFileSync(path.join(raiz, f), 'utf8'));

const amb = { THREE, console };
const mod = new Function(...Object.keys(amb),
    `${ler('js/utils.js').match(/function mergeNonIndexedGeometries[\s\S]*?\n}\n/)[0]}
     ${ler('js/crowd.js')}
     return { Crowd, CrowdModel, mergeNonIndexedGeometries };`)(...Object.values(amb));
const { Crowd, CrowdModel } = mod;

let falhas = 0;
const erro = m => { falhas++; console.error('  X ' + m); };

/*
Lugares sintéticos com a forma das bancadas: quatro lados à volta do campo,
em degraus. Não são os do jogo — o que se testa é o Crowd, não o createField.
*/
function lugaresDeTeste() {
    const L = [];
    const CAMPO_LARG = 68, CAMPO_COMP = 106;
    for (let fila = 0; fila < 34; fila++) {
        const y = 1.0 + fila * 0.45;
        const rec = fila * 0.8;
        // Laterais (ao longo de Z).
        for (let z = -CAMPO_COMP / 2 - 4; z <= CAMPO_COMP / 2 + 4; z += 0.62) {
            L.push({ x: CAMPO_LARG / 2 + 6 + rec, y, z, rotY: -Math.PI / 2 });
            L.push({ x: -(CAMPO_LARG / 2 + 6 + rec), y, z, rotY: Math.PI / 2 });
        }
        // Topos (ao longo de X).
        for (let x = -CAMPO_LARG / 2 - 4; x <= CAMPO_LARG / 2 + 4; x += 0.62) {
            L.push({ x, y, z: CAMPO_COMP / 2 + 6 + rec, rotY: Math.PI });
            L.push({ x, y, z: -(CAMPO_COMP / 2 + 6 + rec), rotY: 0 });
        }
    }
    return L;
}

const lugares = lugaresDeTeste();
console.log(`lugares construídos: ${lugares.length} (pedidos ${CrowdModel.total} adeptos)`);
if (lugares.length < CrowdModel.total) {
    erro(`o teste só tem ${lugares.length} lugares — não chega para ${CrowdModel.total}`);
}

/*
1 — a geometria: quatro canais, e a pose é de quem está SENTADO.
*/
{
    const geos = Crowd.geometrias();
    const canais = Object.keys(geos).sort();
    console.log(`\ncanais de cor: ${canais.join(', ')}`);
    for (const esperado of ['pele', 'camisa', 'calcao', 'cabelo']) {
        if (!geos[esperado]) erro(`falta o canal '${esperado}'`);
    }

    let vertices = 0;
    for (const c of canais) vertices += geos[c].attributes.position.count;
    console.log(`vértices por adepto: ${vertices} (× ${CrowdModel.total} instâncias, ` +
        `mas a geometria é construída UMA vez)`);

    // Caixa envolvente do corpo inteiro.
    const caixa = new THREE.Box3();
    for (const c of canais) {
        geos[c].computeBoundingBox();
        caixa.union(geos[c].boundingBox);
    }
    const t = new THREE.Vector3();
    caixa.getSize(t);
    console.log(`tamanho do adepto sentado: ${t.x.toFixed(2)} × ${t.y.toFixed(2)} × ` +
        `${t.z.toFixed(2)} m (larg × alt × prof)`);

    /*
    SENTADO: um jogador de pé tem ~1.8 m de altura e ~0.3 m de profundidade.
    Sentado, a altura cai e a profundidade cresce, porque as coxas passam a
    apontar para a frente. É essa a assinatura da pose.
    */
    /*
    O limiar era 1.45 m, calibrado quando o corpo tinha mais 10% de redução de
    escala (`(1.8/5.5) * 0.9`). A escala do corpo passou a `1.8/5.5` — e o
    adepto acompanha-a de propósito, porque agora lê a mesma constante
    (`ESCALA_CORPO`, pose.js): um adepto que não cresça com os jogadores fica
    do tamanho errado ao lado deles. A assinatura da pose é a mesma, 11% maior.
    */
    if (t.y > 1.60) erro(`altura ${t.y.toFixed(2)} m — está de pé, não sentado`);
    if (t.z < 0.45) erro(`profundidade ${t.z.toFixed(2)} m — as coxas não estão à frente`);
    if (t.y < 0.8) erro(`altura ${t.y.toFixed(2)} m — está agachado de mais`);
    console.log(`  (de pé seriam ~1.80 de altura e ~0.30 de profundidade)`);
}

/*
2 — os InstancedMesh: um por canal, todos com as MESMAS matrizes.

Se as matrizes divergissem, a camisa de um adepto apareceria no corpo de
outro — é esta partilha que faz o truque dos quatro meshes funcionar.
*/
let meshes;
{
    const cena = new THREE.Object3D();
    const t0 = Date.now();
    CrowdModel.tamanhoDaFatia = 0;   // o teste le uma malha so (sem fatias por angulo)
    meshes = Crowd.build(cena, lugares);
    const ms = Date.now() - t0;

    const canais = Object.keys(meshes);
    console.log(`\n${canais.length} InstancedMesh criados em ${ms} ms ` +
        `(${meshes.pele.count} instâncias cada)`);

    if (meshes.pele.count !== CrowdModel.total) {
        erro(`${meshes.pele.count} instâncias em vez de ${CrowdModel.total}`);
    }
    if (cena.children.length !== canais.length) {
        erro(`${cena.children.length} filhos na cena, esperados ${canais.length}`);
    }

    const a = new THREE.Matrix4(), b = new THREE.Matrix4();
    let divergentes = 0;
    for (let i = 0; i < meshes.pele.count; i += 97) {
        meshes.pele.getMatrixAt(i, a);
        for (const c of canais) {
            if (c === 'pele' || c === 'bone' || c === 'listraV' || c === 'listraH') continue;   // o bone tem matriz zero para quem nao o usa
            meshes[c].getMatrixAt(i, b);
            for (let k = 0; k < 16; k++) {
                if (Math.abs(a.elements[k] - b.elements[k]) > 1e-9) { divergentes++; k = 16; }
            }
        }
    }
    if (divergentes > 0) erro(`${divergentes} instâncias com matrizes diferentes entre canais`);
    else console.log('matrizes idênticas entre os quatro canais');

    if (!meshes.camisa.instanceColor) erro('o mesh das camisas não tem cores por instância');
}

/*
3 — as duas claques: 90% da casa e 10% do visitante, o visitante TODO JUNTO NO CANTO do lado direito das cameras (as cameras ficam em +X; a direita do ecra e o -Z).
*/
{
    const cor = new THREE.Color();
    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    let zMin = Infinity, zMax = -Infinity, xMin = Infinity, xMax = -Infinity;
    for (const l of lugares) { zMin = Math.min(zMin, l.z); zMax = Math.max(zMax, l.z); xMin = Math.min(xMin, l.x); xMax = Math.max(xMax, l.x); }
    const azul = new THREE.Color(CrowdModel.equipas.A.camisa);
    const vermelho = new THREE.Color(CrowdModel.equipas.B.camisa);

    let casa = 0, visitante = 0, foraDoCanto = 0, somaT = 0, somaU = 0;
    for (let i = 0; i < meshes.camisa.count; i++) {
        meshes.camisa.getMatrixAt(i, m);
        pos.setFromMatrixPosition(m);
        meshes.camisa.getColorAt(i, cor);
        // A cor leva variação por adepto; classifica-se pela mais próxima.
        const dA = Math.abs(cor.r - azul.r) + Math.abs(cor.g - azul.g) + Math.abs(cor.b - azul.b);
        const dB = Math.abs(cor.r - vermelho.r) + Math.abs(cor.g - vermelho.g) + Math.abs(cor.b - vermelho.b);
        if (dA <= dB) { casa++; continue; }
        visitante++;
        const t = (pos.z - zMin) / (zMax - zMin), u = (pos.x - xMin) / (xMax - xMin);
        somaT += t; somaU += u;
        if (t > CrowdModel.visitanteT + CrowdModel.visitanteMescla + 0.02 || u < CrowdModel.visitanteU - CrowdModel.visitanteMescla - 0.02) foraDoCanto++;
    }
    const pctCasa = 100 * casa / Math.max(1, casa + visitante);
    console.log(`
torcida da casa: ${pctCasa.toFixed(1)}% | visitante: ${(100 - pctCasa).toFixed(1)}% | visitante: posicao media t=${(somaT / Math.max(1, visitante)).toFixed(2)} (0 = fundo -Z), u=${(somaU / Math.max(1, visitante)).toFixed(2)} (1 = lado das cameras)`);
    if (pctCasa < 86 || pctCasa > 94) erro(`a casa devia ter ~90% da torcida, tem ${pctCasa.toFixed(1)}%`);
    if (foraDoCanto > 0) erro(`${foraDoCanto} adepto(s) visitante(s) fora do canto: a torcida visitante tem de ficar toda junta`);
    if (somaT / visitante > 0.3 || somaU / visitante < 0.6) erro('o visitante devia estar no canto do fundo -Z com o lado das cameras (+X)');
}

/*
4 — determinismo: o estádio tem de ser igual em cada arranque. Com Math.random
mudava de cores a cada refresh e nenhuma comparação visual seria possível.
*/
{
    const c1 = new THREE.Color(), c2 = new THREE.Color();
    const m2 = Crowd.build(new THREE.Object3D(), lugares);
    let difs = 0;
    for (let i = 0; i < 500; i++) {
        const j = i * 29;
        meshes.camisa.getColorAt(j, c1);
        m2.camisa.getColorAt(j, c2);
        if (Math.abs(c1.r - c2.r) > 1e-9 || Math.abs(c1.g - c2.g) > 1e-9 ||
            Math.abs(c1.b - c2.b) > 1e-9) difs++;
    }
    if (difs > 0) erro(`${difs} adeptos mudaram de cor entre duas construções`);
    else console.log('\nconstrução determinística: mesmo estádio em cada arranque');
}

if (falhas > 0) {
    console.error(`\nFALHOU: ${falhas} casos.`);
    process.exit(1);
}
console.log('\nOK: 10 000 adeptos sentados, em 4 InstancedMesh, com as duas claques no sítio.');
