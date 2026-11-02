const test = require('node:test');
const assert = require('node:assert');
const M = require('../js/ratings/notas_motor.js');

function novo(pos = 'CM', estilo = null) {
    M.reset();
    M.entrar('a', { equipa: 'TeamA', pos, estilo, minuto: 0 });
    return M;
}

test('sem eventos a nota e a neutra 6.0', () => {
    novo();
    assert.strictEqual(M.nota('a', 90), 6.0);
});

test('golo sobe a nota, vermelho desce, sempre entre 1 e 10', () => {
    novo('ST');
    M.evento('a', 'GOLO', { evId: 'g1', minuto: 10 });
    const n1 = M.nota('a', 90);
    assert.ok(n1 > 6.5 && n1 < 8, `golo: ${n1}`);
    novo('CB');
    M.evento('a', 'VERMELHO', { evId: 'v1', minuto: 10 });
    const n2 = M.nota('a', 90);
    assert.ok(n2 < 5.5 && n2 >= 1, `vermelho: ${n2}`);
});

test('muitos golos saturam: nunca passa de 10', () => {
    novo('ST');
    for (let i = 0; i < 40; i++) M.evento('a', 'GOLO', { evId: 'g' + i, minuto: 10 });
    assert.ok(M.nota('a', 90) <= 10);
});

test('mesmo evId nao conta duas vezes', () => {
    novo('ST');
    M.evento('a', 'GOLO', { evId: 'g1', minuto: 10 });
    const n1 = M.nota('a', 90);
    M.evento('a', 'GOLO', { evId: 'g1', minuto: 10 });
    assert.strictEqual(M.nota('a', 90), n1);
});

test('mesmo evId com outro tipo substitui o efeito anterior', () => {
    novo('CM');
    M.evento('a', 'PASSE_ERRADO', { evId: 'p1', minuto: 20 });
    M.evento('a', 'ERRO_GOLO', { evId: 'p1', minuto: 20 });
    const n = M.nota('a', 90);
    novo('CM');
    M.evento('a', 'ERRO_GOLO', { evId: 'x', minuto: 20 });
    assert.strictEqual(n, M.nota('a', 90));
});

test('detalhes tem os 4 componentes', () => {
    novo('ST');
    M.evento('a', 'GOLO', { evId: 'g1', minuto: 10 });
    const d = M.detalhes('a', 90);
    for (const k of ['nota', 'tatico', 'tecnico', 'participacao', 'disciplina', 'minutos']) assert.ok(k in d, k);
    assert.ok(d.tecnico > d.disciplina);
});

test('desarme vale mais para volante que para atacante', () => {
    M.reset();
    M.entrar('dm', { equipa: 'TeamA', pos: 'DM', minuto: 0 });
    M.entrar('st', { equipa: 'TeamA', pos: 'ST', minuto: 0 });
    for (let i = 0; i < 6; i++) { M.evento('dm', 'DESARME', { evId: 'd' + i }); M.evento('st', 'DESARME', { evId: 'd' + i }); }
    assert.ok(M.nota('dm', 90) > M.nota('st', 90));
});

test('playing style so conta em posicao compativel', () => {
    M.reset();
    M.entrar('a', { equipa: 'TeamA', pos: 'CB', estilo: 'Anchor Man', minuto: 0 });
    M.entrar('b', { equipa: 'TeamA', pos: 'CB', minuto: 0 });
    for (let i = 0; i < 5; i++) { M.evento('a', 'INTERCEPTACAO', { evId: 'i' + i }); M.evento('b', 'INTERCEPTACAO', { evId: 'i' + i }); }
    assert.strictEqual(M.nota('a', 90), M.nota('b', 90));
    M.entrar('c', { equipa: 'TeamA', pos: 'DM', estilo: 'Anchor Man', minuto: 0 });
    M.entrar('d', { equipa: 'TeamA', pos: 'DM', minuto: 0 });
    for (let i = 0; i < 5; i++) { M.evento('c', 'INTERCEPTACAO', { evId: 'i' + i }); M.evento('d', 'INTERCEPTACAO', { evId: 'i' + i }); }
    assert.ok(M.nota('c', 90) > M.nota('d', 90));
});

test('substituido mantem a nota; reserva entra a 6.0', () => {
    M.reset();
    M.entrar('a', { equipa: 'TeamA', pos: 'ST', minuto: 0 });
    M.evento('a', 'GOLO', { evId: 'g1', minuto: 30 });
    M.sair('a', 60);
    const n = M.nota('a', 60);
    assert.strictEqual(M.nota('a', 90), n);
    M.entrar('r', { equipa: 'TeamA', pos: 'ST', minuto: 60 });
    assert.strictEqual(M.nota('r', 61), 6.0);
    assert.strictEqual(M.detalhes('r', 75).minutos, 15);
});

test('qualidadeTatica: no posto > longe do posto; contexto justifica o desvio', () => {
    M.reset();
    M.entrar('a', { equipa: 'TeamA', pos: 'CM', minuto: 0 });
    const noPosto = M.qualidadeTatica('a', { fase: 'defesa', dEsperada: 2, bolaPerto: false, ofereceLinha: false, fechaLinha: true, pressiona: false });
    const longe = M.qualidadeTatica('a', { fase: 'defesa', dEsperada: 25, bolaPerto: false, ofereceLinha: false, fechaLinha: false, pressiona: false });
    const longeJustificado = M.qualidadeTatica('a', { fase: 'defesa', dEsperada: 25, bolaPerto: true, ofereceLinha: false, fechaLinha: true, pressiona: true });
    assert.ok(noPosto > longe);
    assert.ok(longeJustificado > longe);
    assert.ok(noPosto <= 1 && longe >= -1);
});

test('jogador que cumpre a funcao (so amostras boas) passa de 6.0 sem estatisticas', () => {
    M.reset();
    M.entrar('a', { equipa: 'TeamA', pos: 'DM', minuto: 0 });
    for (let i = 0; i < 200; i++) M.amostrar('a', { fase: i % 2 ? 'defesa' : 'ataque', dEsperada: 3, bolaPerto: false, ofereceLinha: true, fechaLinha: true, pressiona: false });
    const n = M.nota('a', 90);
    assert.ok(n > 6.3 && n < 7.6, 'nota ' + n);
});

test('poucas amostras (pouco tempo em campo) nao penalizam', () => {
    M.reset();
    M.entrar('a', { equipa: 'TeamA', pos: 'CM', minuto: 80 });
    for (let i = 0; i < 6; i++) M.amostrar('a', { fase: 'defesa', dEsperada: 30, bolaPerto: false, ofereceLinha: false, fechaLinha: false, pressiona: false });
    assert.ok(M.nota('a', 85) >= 5.8);
});

test('perda de bola que gera golo vira ERRO_GOLO, sem contar duas vezes', () => {
    M.reset();
    M.entrar('a', { equipa: 'TeamA', pos: 'CM', minuto: 0 });
    M.perda('a', 'TeamA', 100, 'p1');
    const antes = M.nota('a', 90);
    M.remateAdversario('TeamB', 104, true);
    const depois = M.nota('a', 90);
    assert.ok(depois < antes - 0.5, `${antes} -> ${depois}`);
    M.remateAdversario('TeamB', 105, true);
    assert.strictEqual(M.nota('a', 90), depois);
});

test('perda fora da janela nao e promovida', () => {
    M.reset();
    M.entrar('a', { equipa: 'TeamA', pos: 'CM', minuto: 0 });
    M.perda('a', 'TeamA', 100, 'p1');
    const antes = M.nota('a', 90);
    M.remateAdversario('TeamB', 140, true);
    assert.strictEqual(M.nota('a', 90), antes);
});

test('erro que gera remate e depois golo equivale a ERRO_GOLO direto', () => {
    M.reset();
    M.entrar('a', { equipa: 'TeamA', pos: 'CM', minuto: 0 });
    M.perda('a', 'TeamA', 100, 'p1');
    M.remateAdversario('TeamB', 103, false);
    M.remateAdversario('TeamB', 104, true);
    const n = M.nota('a', 90);
    M.reset();
    M.entrar('a', { equipa: 'TeamA', pos: 'CM', minuto: 0 });
    M.evento('a', 'ERRO_GOLO', { evId: 'x' });
    assert.strictEqual(n, M.nota('a', 90));
});
