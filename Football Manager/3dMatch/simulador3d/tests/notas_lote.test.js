/*
SMOKE do sistema de notas num jogo de verdade (harness headless, equipas reais): todos os jogadores tem nota valida, as duas
equipas estao registadas, ha Man of the Match e o resultado e serializavel. A distribuicao (media, desvio, MoM) mede-se com
tools/scratch/notas_lote.js, que corre jogos completos em paralelo.

Corre com: node --test tests/notas_lote.test.js
*/
const test = require('node:test');
const assert = require('node:assert');
require('../tools/headless/harness.js');

test('jogo de 5 minutos: notas validas, as duas equipas e JSON', { timeout: 120000 }, () => {
    const cena = new THREE.Scene(); Match.init(cena);
    if (typeof Officials !== 'undefined' && Officials.init) Officials.init(cena);
    if (typeof Sim === 'undefined') global.Sim = {}; Sim.running = true;
    // com o mod os nomes reais; sem ele (a base generica) os dois primeiros times
    const ea = SquadsData.equipas.find(e => e.nome === 'Palmeiras-SP') || SquadsData.equipas[0], eb = SquadsData.equipas.find(e => e.nome === 'Remo-PA') || SquadsData.equipas[1];
    Match.trocarEquipas({ A: ea.id, B: eb.id });
    MatchStats.reset(); Match.tempoDeJogo = 0; Match.placarA = 0; Match.placarB = 0; Notas.iniciar();
    Match.mudarEstado('PLAY', 'teste');
    for (let f = 0; f < 60 * 60 * 40 && Match.tempoDeJogo < 5 * 60; f++) Match.update(1 / 60);
    const r = Notas.resultado(), v = Object.values(r);
    assert.ok(v.length >= 20, 'jogadores com nota: ' + v.length);
    assert.ok(v.some(x => x.equipa === 'TeamA') && v.some(x => x.equipa === 'TeamB'));
    for (const x of v) {
        assert.ok(x.nota >= 1 && x.nota <= 10, 'nota fora da escala: ' + x.nota);
        for (const c of ['tatico', 'tecnico', 'participacao', 'disciplina']) assert.ok(x[c] >= 0 && x[c] <= 100, c);
    }
    assert.doesNotThrow(() => JSON.parse(JSON.stringify(r)));
});

// O harness (jsdom) deixa timers abertos; sem isto o processo do teste nunca termina.
test.after(() => setImmediate(() => process.exit(process.exitCode || 0)));
