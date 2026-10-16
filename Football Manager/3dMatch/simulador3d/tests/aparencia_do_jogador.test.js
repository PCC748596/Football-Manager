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
const mod3d = new Function(`${modelo}\n${hash}\n${aparencia}\nreturn { aparenciaDoJogador };`)();

const srcTs = fs.readFileSync(path.join(raiz, '..', '..', 'textSim', 'aparencia.ts'), 'utf8');
const js = ts.transpileModule(srcTs, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const m = { exports: {} };
new Function('module', 'exports', js)(m, m.exports);

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
