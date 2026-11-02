const test = require('node:test');
const assert = require('node:assert');
const M = require('../js/ratings/notas_motor.js');

const bom = (fase) => ({ fase, dEsperada: 3, bolaPerto: false, ofereceLinha: true, fechaLinha: true, pressiona: false });
const mau = (fase) => ({ fase, dEsperada: 30, bolaPerto: false, ofereceLinha: false, fechaLinha: false, pressiona: false });
// `neutro` = jogo tipico medido em lote: q ~ 0.64 (dEsperada ~6.5 m, sem bonus) — ver qNeutro em notas_config.js.
const neutro = (fase) => ({ fase, dEsperada: 6.5, bolaPerto: false, ofereceLinha: false, fechaLinha: false, pressiona: false });
function jog(id, pos, estilo) { M.entrar(id, { equipa: 'TeamA', pos, estilo, minuto: 0 }); }
function amostras(id, n, f) { for (let i = 0; i < n; i++) M.amostrar(id, f(i % 2 ? 'defesa' : 'ataque')); }
function ev(id, tipo, n) { for (let i = 0; i < n; i++) M.evento(id, tipo, { evId: tipo + i }); }
const faixa = (n, lo, hi, msg) => assert.ok(n >= lo && n <= hi, `${msg}: ${n} fora de ${lo}-${hi}`);

test('1. atacante com 2 golos e pouco mais', () => {
    M.reset(); jog('a', 'ST'); ev('a', 'GOLO', 2); ev('a', 'REMATE_FORA', 3); amostras('a', 120, neutro);
    faixa(M.nota('a', 90), 7.0, 8.5, 'ST 2 golos');
});
test('2. volante dominante sem golos', () => {
    M.reset(); jog('a', 'DM'); ev('a', 'DESARME', 6); ev('a', 'INTERCEPTACAO', 6); ev('a', 'PASSE_PROGRESSIVO', 8); amostras('a', 200, bom);
    faixa(M.nota('a', 90), 7.2, 8.9, 'DM dominante');
});
test('3. zagueiro perfeito', () => {
    M.reset(); jog('a', 'CB'); ev('a', 'DESARME', 4); ev('a', 'INTERCEPTACAO', 5); ev('a', 'CORTE', 8); ev('a', 'DUELO_AEREO', 6); amostras('a', 200, bom);
    faixa(M.nota('a', 90), 7.0, 8.9, 'CB perfeito');
});
test('4. goleiro com varias defesas dificeis', () => {
    M.reset(); jog('a', 'GK'); ev('a', 'DEFESA', 3); ev('a', 'DEFESA_DIFICIL', 4); amostras('a', 200, bom);
    faixa(M.nota('a', 90), 7.2, 9.0, 'GK defesas dificeis');
});
test('5. meio-campista que organiza a construcao', () => {
    M.reset(); jog('a', 'CM'); ev('a', 'PASSE_PROGRESSIVO', 12); ev('a', 'PASSE_DECISIVO', 3); amostras('a', 200, bom);
    faixa(M.nota('a', 90), 7.0, 8.6, 'CM organizador');
});
test('6. ponta que cria muito sem marcar', () => {
    M.reset(); jog('a', 'LW'); ev('a', 'DRIBLE', 6); ev('a', 'CRUZAMENTO_CERTO', 4); ev('a', 'PASSE_DECISIVO', 4); amostras('a', 150, neutro);
    faixa(M.nota('a', 90), 6.8, 8.2, 'W criador');
});
test('7. erro grave que gera golo adversario', () => {
    M.reset(); jog('a', 'CB'); M.perda('a', 'TeamA', 100, 'p1'); M.remateAdversario('TeamB', 104, true); amostras('a', 200, neutro);
    faixa(M.nota('a', 90), 4.2, 5.6, 'erro gera golo');
});
test('8. cumpre a funcao com poucas estatisticas', () => {
    M.reset(); jog('a', 'CM'); amostras('a', 200, bom);
    faixa(M.nota('a', 90), 6.4, 7.5, 'funcao cumprida');
});
test('jogador que ignora a funcao fica abaixo do neutro', () => {
    M.reset(); jog('a', 'DM'); amostras('a', 200, mau);
    assert.ok(M.nota('a', 90) < 6.0);
});
test('Man of the Match: volante pode ganhar do atacante com golo; minimo de minutos', () => {
    M.reset(); jog('dm', 'DM'); jog('st', 'ST'); jog('sub', 'ST');
    M.jogadores.sub.entrou = 85;
    ev('dm', 'DESARME', 8); ev('dm', 'INTERCEPTACAO', 8); ev('dm', 'PASSE_PROGRESSIVO', 10); amostras('dm', 200, bom);
    ev('st', 'GOLO', 1); amostras('st', 200, neutro);
    ev('sub', 'GOLO', 3);
    assert.strictEqual(M.melhor('TeamA', 90), 'dm');
    assert.strictEqual(M.melhor('TeamB', 90), null);
});
