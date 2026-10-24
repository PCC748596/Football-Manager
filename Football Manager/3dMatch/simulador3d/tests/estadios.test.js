/*
O estádio oval do Maracanã (config/estadios.js + js/estadio_oval.js).

Corre a construção da bacia com o `three` de node e mede o que o pedido diz:
  - 78 838 lugares, a capacidade do Maracanã no manager (tolerância de 1%);
  - nenhum lugar dentro das linhas do campo, e o canto do campo longe da primeira fila;
  - sem rectas: a distância à elipse varia, e o raio de curvatura nunca é infinito
    (os pontos da fila seguem a elipse e não um rectângulo);
  - a mesma construção duas vezes dá o mesmo.
Corre com: node tests/estadios.test.js
*/
const fs = require('fs');
const path = require('path');
const THREE = require('three');
const CR = String.fromCharCode(13), LF = String.fromCharCode(10);
const ler = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').split(CR + LF).join(LF);
const CAMPO_LARG = 68, CAMPO_COMP = 106;
const mod = new Function('THREE', 'CAMPO_LARG', 'CAMPO_COMP', 'window', `
    const BancadaAneis = { aneis: 2, degrausPorAnel: 20, alturaParede: 3, espessuraParede: 0.6, cobertura: true, coberturaAvanco: 16, coberturaEspessura: 0.45, recuoSobreCobertura: 3 };
    const CidadeConfig = { estadio: {}, esplanada: {}, fachada: { perfil: [], vao: 5.5 }, rampas: [] };
    ${ler('js/config/estadios.js')}
    ${ler('js/estadio_oval.js')}
    return { Estadios, EstadioOval, BancadaAneis, CidadeConfig };`)(THREE, CAMPO_LARG, CAMPO_COMP, { location: { search: '' } });
const { Estadios, EstadioOval, BancadaAneis } = mod;

let falhas = 0;
const erro = m => { falhas++; console.error('  X ' + m); };
const ok = (c, m) => { if (!c) erro(m); };

Estadios.aplicar(Estadios.perfis.maracana);
const B = Estadios.bacia();
ok(B.forma === 'oval', 'o Maracanã tem de ser oval');
const rows = BancadaAneis.degrausPorAnel;
const a0 = CAMPO_LARG / 2 + B.recuoLateral, b0 = CAMPO_COMP / 2 + B.recuoFundo;

const construir = () => {
    const seats = [];
    const grupo = new THREE.Group();
    const med = EstadioOval.construir({
        THREE, grupo, a0, b0, rows, TJ: null,
        addStepBox() {}, addSeatInstance: (x, y, z) => seats.push([x, y, z]),
        merge: gs => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3)); return g; },
        cfg: B.oval
    });
    return { seats, med };
};
const A = construir();
console.log('lugares:', A.seats.length, ' topo:', A.med.topoY.toFixed(1), 'm');
ok(Math.abs(A.seats.length - 78838) / 78838 < 0.01, 'lugares fora dos 78 838 (a capacidade do manager) +-1%: ' + A.seats.length);

// nenhum lugar dentro do campo; o canto do campo está dentro da primeira fila com folga
const meiaX = CAMPO_LARG / 2, meiaZ = CAMPO_COMP / 2;
ok(!A.seats.some(([x, , z]) => Math.abs(x) < meiaX + 3 && Math.abs(z) < meiaZ + 3), 'há lugares em cima do campo');
const raioCanto = Math.hypot(meiaX / a0, meiaZ / b0);
ok(raioCanto < 0.9, 'o canto do campo está perto da bancada: ' + raioCanto.toFixed(2));

// sem rectas: a curvatura da primeira fila nunca se anula (uma recta teria troços de curvatura 0)
const curvas = [];
const c0 = EstadioOval.amostrar(a0, b0, 0, 720).pts;
for (let i = 1; i < c0.length - 1; i++) {
    const p = c0[i - 1], q = c0[i], r = c0[i + 1];
    const cross = Math.abs((q.x - p.x) * (r.z - q.z) - (q.z - p.z) * (r.x - q.x));
    curvas.push(cross);
}
ok(Math.min(...curvas) > 1e-4, 'a fila tem um troço recto');

const B2 = construir();
ok(B2.seats.length === A.seats.length && B2.seats[1234].join() === A.seats[1234].join(), 'a construção não é determinista');

// a fila do fundo (r = rows-1) está a dEnd da primeira, medido no eixo x
const xs = A.seats.map(s => Math.abs(s[0])).sort((m, n) => n - m);
ok(Math.abs(xs[0] - (a0 + (rows - 1) * 1.2)) < 1.5, 'a última fila não está onde devia: ' + xs[0].toFixed(1));

if (falhas) { console.error('FALHOU ' + falhas); process.exit(1); }
console.log('OK estadios');
