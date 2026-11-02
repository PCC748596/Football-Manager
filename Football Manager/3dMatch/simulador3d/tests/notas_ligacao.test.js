/*
A ligacao das notas ao registo de eventos e aos ganchos: sem cena nem jogo a correr (faz-se um Match/Eventos de mentira).
Corre com: node --test tests/notas_ligacao.test.js
*/
const test = require('node:test');
const assert = require('node:assert');
const Motor = require('../js/ratings/notas_motor.js');
const Notas = require('../js/ratings/notas_ligacao.js');

function pl(id, team, pos) { return { team, pos, skills: { id, estilo: null } }; }

// Um Eventos minimo, com o mesmo contrato do real (registar / aoRegistar / fecharRemate / ultimoRemate).
function falsoEventos() {
    const E = {
        lista: [], ouvintes: [], _n: 0, ultimoRemate: null,
        aoRegistar(f) { this.ouvintes.push(f); },
        registar(tipo, d) { const ev = Object.assign({ n: ++this._n, tipo }, d); this.lista.push(ev); this.ouvintes.forEach(f => f(ev)); return ev; },
        remate(jogador, xg, equipa) { const r = this.registar('REMATE', { equipa, jogador, xg, desfecho: null }); this.ultimoRemate = r; return r; },
        fecharRemate(desfecho) { const r = this.ultimoRemate; r.desfecho = desfecho; this.ouvintes.forEach(f => f(r)); }
    };
    global.Eventos = E;
    return E;
}

function cenario() {
    global.Match = { tempoDeJogo: 600, players: [pl('1', 'TeamA', 'ST'), pl('2', 'TeamA', 'CB'), pl('3', 'TeamB', 'CM'), pl('4', 'TeamB', 'GK')] };
    const E = falsoEventos();
    Notas._ligado = false;
    Notas.iniciar();
    return E;
}
const J = (id, equipa) => ({ id, equipa });

test('iniciar regista os jogadores a 6.0', () => {
    cenario();
    assert.strictEqual(Notas.resultado()['1'].nota, 6.0);
    assert.strictEqual(Object.keys(Notas.resultado()).length, 4);
});

test('golo e assistencia chegam ao autor e ao assistente', () => {
    const E = cenario();
    E.registar('GOLO', { equipa: 'TeamA', jogador: J('1'), assistente: J('2') });
    const r = Notas.resultado();
    assert.ok(r['1'].nota > 6.4);
    assert.ok(r['2'].nota > 6.0);
});

test('remate: defesa e fora contam uma vez; golo nao conta como remate no gol', () => {
    const E = cenario();
    E.remate(J('1'), 0.1, 'TeamA'); E.fecharRemate('defesa');
    const a = Notas.resultado()['1'].nota;
    assert.ok(a >= 6.0);
    E.fecharRemate('defesa');
    assert.strictEqual(Notas.resultado()['1'].nota, a, 'segunda notificacao do mesmo remate nao conta');
    cenario();
    const E2 = global.Eventos;
    for (let i = 0; i < 6; i++) { E2.remate(J('1'), 0.1, 'TeamA'); E2.fecharRemate('fora'); }
    assert.ok(Notas.resultado()['1'].nota < 6.0);
    cenario();
    const E3 = global.Eventos;
    E3.remate(J('1'), 0.5, 'TeamA'); E3.fecharRemate('golo');
    E3.registar('GOLO', { equipa: 'TeamA', jogador: J('1') });
    const soGolo = Notas.resultado()['1'].nota;
    cenario();
    global.Eventos.registar('GOLO', { equipa: 'TeamA', jogador: J('1') });
    assert.strictEqual(soGolo, Notas.resultado()['1'].nota);
});

test('cartao vermelho congela a nota do expulso', () => {
    const E = cenario();
    E.registar('FALTA', { equipa: 'TeamA', jogador: J('2'), cartao: 'vermelho' });
    const n = Notas.resultado()['2'].nota;
    assert.ok(n < 5.5);
    global.Match.tempoDeJogo = 5400;
    assert.strictEqual(Notas.resultado()['2'].nota, n);
    assert.strictEqual(Notas.resultado()['2'].minutos, 10);
});

test('ganchos: desarme sobe a nota; perda que gera golo desce', () => {
    const E = cenario();
    const volante = global.Match.players[2];
    Notas.tackle(volante);
    assert.ok(Notas.resultado()['3'].nota > 6.0);
    const cb = global.Match.players[1];
    Notas.perda(cb);
    const antes = Notas.resultado()['2'].nota;
    global.Match.tempoDeJogo += 3;
    E.remate(J('3'), 0.5, 'TeamB'); E.fecharRemate('golo');
    assert.ok(Notas.resultado()['2'].nota < antes - 0.3);
});

test('substituicao: quem sai congela, quem entra comeca a 6.0', () => {
    cenario();
    Notas.tackle(global.Match.players[2]);
    const sai = global.Match.players[2], entra = pl('9', 'TeamB', 'CM');
    Notas.substituir(sai, entra);
    const n = Notas.resultado()['3'].nota;
    global.Match.tempoDeJogo = 5400;
    assert.strictEqual(Notas.resultado()['3'].nota, n);
    assert.strictEqual(Notas.resultado()['9'].nota, 6.0);
});

test('corDaNota segue as faixas da especificacao', () => {
    assert.strictEqual(Notas.corDaNota(9.4), '#1b8a3a');
    assert.strictEqual(Notas.corDaNota(8.0), '#37b24d');
    assert.strictEqual(Notas.corDaNota(7.9), '#82c91e');
    assert.strictEqual(Notas.corDaNota(6.0), '#fcc419');
    assert.strictEqual(Notas.corDaNota(5.9), '#fd9a14');
    assert.strictEqual(Notas.corDaNota(4.0), '#e8590c');
    assert.strictEqual(Notas.corDaNota(3.9), '#e03131');
});
