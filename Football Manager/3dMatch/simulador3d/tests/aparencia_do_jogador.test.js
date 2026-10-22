/*
A aparencia de um jogador sai do id dele: igual no 3D (utils.js) e no manager (textSim/aparencia.ts, que desenha a cara do Overview), e sempre igual
para o mesmo jogador.
Corre com: node --test --test-force-exit tests/aparencia_do_jogador.test.js
*/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const raiz = path.join(__dirname, '..');
const ler = f => fs.readFileSync(path.join(raiz, f), 'utf8').split('\r\n').join('\n');
const modelo = ler('js/config/player_behavior.js').match(/const AppearanceModel = \{[\s\S]*?\n\};/)[0];
const hash = ler('js/utils.js').match(/function hashAparencia[\s\S]*?\n\}\n/)[0];
const aparencia = ler('js/utils.js').match(/function aparenciaDoJogador[\s\S]*?\n\}\n/)[0];
// A face personalizada de teste (a mesma nos dois lados): o jogador 777001.
const FACE_TESTE = { pele: '#c68a5e', cabelo: '#1a1410', estilo: 'topete', barba: 'rala', oculos: true, largura: 1.05 };
const mod3d = new Function('FacesPersonalizadas', `${modelo}
${hash}
${aparencia}
return { aparenciaDoJogador };`)({ 777001: FACE_TESTE });

const srcTs = fs.readFileSync(path.join(raiz, '..', '..', 'textSim', 'aparencia.ts'), 'utf8');
const js = ts.transpileModule(srcTs, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const m = { exports: {} };
new Function('module', 'exports', 'require', js)(m, m.exports, () => ({ FACES: { 777001: FACE_TESTE } }));

test('o 3D e o manager dao a mesma aparencia ao mesmo jogador', () => {
    for (const id of [269249, 269235, 271948, 1, 450171, 999999, 123456789]) {
        assert.deepStrictEqual(mod3d.aparenciaDoJogador(id), m.exports.aparenciaDoJogador('p-' + id), 'id ' + id);
    }
});

test('o mesmo jogador sai sempre igual, e ha variedade entre jogadores', () => {
    assert.deepStrictEqual(m.exports.aparenciaDoJogador('p-269249'), m.exports.aparenciaDoJogador('p-269249'));
    const tipos = new Set();
    for (let i = 0; i < 300; i++) tipos.add(m.exports.aparenciaDoJogador('p-' + (269000 + i)).tipo);
    assert.ok(tipos.size >= 3, 'so ' + tipos.size + ' tipos em 300 jogadores');
});

test('a face personalizada manda sobre o sorteio, igual no 3D e no manager', () => {
    const a3 = mod3d.aparenciaDoJogador(777001), am = m.exports.aparenciaDoJogador('p-777001');
    assert.deepStrictEqual(a3, am);
    assert.strictEqual(am.tipo, 'custom');
    assert.strictEqual(am.pele, 0xc68a5e); assert.strictEqual(am.cabelo, 0x1a1410);
    assert.deepStrictEqual([am.estilo, am.barba, am.oculos, am.largura], ['topete', 'rala', true, 1.05]);
    // quem nao tem face personalizada continua a sair do sorteio pelo id
    assert.notStrictEqual(m.exports.aparenciaDoJogador('p-269249').tipo, 'custom');
});
