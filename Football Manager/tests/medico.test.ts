import test from 'node:test';
import assert from 'node:assert/strict';
import { gerarMedico, pesoDaFaixa, garantirMedico, boletimSemanal, severidadeDaLesao, variacaoDiariaDeFis, Lesao } from '../textSim/medico';

const complexa: Lesao = { type: 'LCA', daysOut: 100, severity: 'SEVERE', tipoLesao: 'Complexa', quedaFisPorDia: 1.5 };

test('medico do clube: estavel, entre 50 e 100, com nome', () => {
    const a = gerarMedico('team-1', [77, 70]), b = gerarMedico('team-1', [77, 70]);
    assert.deepEqual(a, b);
    assert.ok(a.nome.includes(' '));
    for (const v of [a.precisao, a.tempo, a.eficacia]) assert.ok(v >= 50 && v <= 100);
});

test('medico segue o nivel da divisao (faixa de OVR)', () => {
    const media = (faixa: [number, number]) => { let s = 0; for (let i = 0; i < 300; i++) { const m = gerarMedico('t' + i, faixa); s += m.precisao + m.tempo + m.eficacia; } return s / 900; };
    const alta = media([80, 75]), baixa = media([65, 65]);
    assert.ok(alta - baixa > 8, `Europa A ${alta.toFixed(1)} vs D ${baixa.toFixed(1)}`);
    assert.equal(pesoDaFaixa(null), 65);
    assert.equal(pesoDaFaixa([77, 70]), 73.5);
});

test('garantirMedico: saves antigos recebem, quem ja tem mantem', () => {
    const sem: any = { id: 'x' };
    const com = garantirMedico(sem, [74, 67]);
    assert.ok(com.medico && com.medico.precisao >= 50);
    assert.equal(garantirMedico(com), com);
});

test('boletim: evolucao reduz 15%, recaida soma 20%, meio fica igual', () => {
    const m = { nome: 'x', precisao: 70, tempo: 70, eficacia: 80 };   // evolucao < 32, recaida > 94
    assert.equal(boletimSemanal(complexa, m, 10).lesao.daysOut, 85);
    assert.equal(boletimSemanal(complexa, m, 99).lesao.daysOut, 120);
    assert.equal(boletimSemanal(complexa, m, 60).lesao.daysOut, 100);
});

test('lesao simples nao oscila', () => {
    const s: Lesao = { type: 'Pancada', daysOut: 4, severity: 'LIGHT', tipoLesao: 'Simples' };
    assert.equal(boletimSemanal(s, { nome: 'x', precisao: 50, tempo: 50, eficacia: 50 }, 1).lesao.daysOut, 4);
});

test('evolucao nunca zera o prazo e gravidade segue dias e tipo', () => {
    assert.ok(boletimSemanal({ ...complexa, daysOut: 1 }, { nome: 'x', precisao: 70, tempo: 70, eficacia: 100 }, 0).lesao.daysOut >= 1);
    assert.equal(severidadeDaLesao('Simples', 3), 'LIGHT');
    assert.equal(severidadeDaLesao('Simples', 14), 'MEDIUM');
    assert.equal(severidadeDaLesao('Complexa', 30), 'MEDIUM');
    assert.equal(severidadeDaLesao('Complexa', 180), 'SEVERE');
});

test('FIS diario: lesao nova cai, antiga devolve null', () => {
    assert.equal(variacaoDiariaDeFis(complexa), -1.5);
    assert.equal(variacaoDiariaDeFis({ type: 'x', daysOut: 3, severity: 'LIGHT' }), null);
});
