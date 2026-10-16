/*
A torcida na entrada dos times: comeca toda sentada, levanta-se a medida que o trio e os 22 saem do tunel
(`dados.abertura.progresso`), sem ultras a saltar; sem `abertura` volta o padrao de sempre.
Corre com: node --test tests/crowd_entrada_dos_times.test.js
*/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const THREE = require('three');

const ler = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').split('\r\n').join('\n');
const amb = { THREE, console, Lados: { dirDe: t => (t === 'TeamA' ? 1 : -1) } };
const { CrowdTrigger, CrowdModel } = new Function(...Object.keys(amb),
    `${ler('js/utils.js').match(/function mergeNonIndexedGeometries[\s\S]*?\n}\n/)[0]}
     ${ler('js/crowd.js')}
     return { CrowdTrigger, CrowdModel };`)(...Object.values(amb));

test('antes de sair alguem do tunel a bancada esta toda sentada (nem o repouso)', () => {
    const r = CrowdTrigger.avaliar({ abertura: { progresso: 0 }, estado: 'ABERTURA', dt: 0.016 });
    assert.strictEqual(r.A, 0); assert.strictEqual(r.B, 0);
    assert.strictEqual(r.semSalto, true);
});

test('levanta-se com o progresso da entrada, nas duas claques, ate fraccaoEntrada', () => {
    const f = p => CrowdTrigger.avaliar({ abertura: { progresso: p }, estado: 'ABERTURA', dt: 0.016 });
    assert.ok(f(0.25).A < f(0.5).A && f(0.5).A < f(1).A);
    assert.strictEqual(f(0.5).A, f(0.5).B);
    assert.strictEqual(f(1).A, CrowdModel.fraccaoEntrada);
    assert.strictEqual(f(7).A, CrowdModel.fraccaoEntrada, 'progresso acima de 1 nao passa do maximo');
});

test('sem abertura volta o padrao de sempre (repouso) e nao fica nada de pe por inercia', () => {
    CrowdTrigger.avaliar({ abertura: { progresso: 1 }, estado: 'ABERTURA', dt: 0.016 });
    const r = CrowdTrigger.avaliar({ estado: 'GOAL', posse: null, bolaZ: 0, dt: 0.016 });
    assert.strictEqual(r.A, CrowdModel.fraccaoRepouso);
    assert.strictEqual(r.B, CrowdModel.fraccaoRepouso);
    assert.ok(!r.semSalto);
});
