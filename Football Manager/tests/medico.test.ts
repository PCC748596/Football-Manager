import test from 'node:test';
import assert from 'node:assert/strict';
import { medicoDoTime, boletimSemanal, severidadeDaLesao, variacaoDiariaDeFis, Lesao } from '../textSim/medico';

const complexa: Lesao = { type: 'LCA', daysOut: 100, severity: 'SEVERE', tipoLesao: 'Complexa', quedaFisPorDia: 1.5 };

test('medico do clube e estavel e fica entre 50 e 100', () => {
    const a = medicoDoTime('team-1'), b = medicoDoTime('team-1');
    assert.deepEqual(a, b);
    for (const v of Object.values(a)) assert.ok(v >= 50 && v <= 100);
});

test('boletim: evolucao reduz 15%, recaida soma 20%, meio fica igual', () => {
    const m = { precisao: 70, tempo: 70, eficacia: 80 };   // evolucao < 32, recaida > 94
    assert.equal(boletimSemanal(complexa, m, 10).lesao.daysOut, 85);
    assert.equal(boletimSemanal(complexa, m, 99).lesao.daysOut, 120);
    assert.equal(boletimSemanal(complexa, m, 60).lesao.daysOut, 100);
});

test('lesao simples nao oscila', () => {
    const s: Lesao = { type: 'Pancada', daysOut: 4, severity: 'LIGHT', tipoLesao: 'Simples' };
    assert.equal(boletimSemanal(s, { precisao: 50, tempo: 50, eficacia: 50 }, 1).lesao.daysOut, 4);
});

test('evolucao nunca zera o prazo e gravidade segue dias e tipo', () => {
    assert.ok(boletimSemanal({ ...complexa, daysOut: 1 }, { precisao: 70, tempo: 70, eficacia: 100 }, 0).lesao.daysOut >= 1);
    assert.equal(severidadeDaLesao('Simples', 3), 'LIGHT');
    assert.equal(severidadeDaLesao('Simples', 14), 'MEDIUM');
    assert.equal(severidadeDaLesao('Complexa', 30), 'MEDIUM');
    assert.equal(severidadeDaLesao('Complexa', 180), 'SEVERE');
});

test('FIS diario: lesao nova cai, antiga devolve null', () => {
    assert.equal(variacaoDiariaDeFis(complexa), -1.5);
    assert.equal(variacaoDiariaDeFis({ type: 'x', daysOut: 3, severity: 'LIGHT' }), null);
});
