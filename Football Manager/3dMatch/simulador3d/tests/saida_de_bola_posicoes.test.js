/*
AS POSICOES DA SAIDA DE BOLA: so o batedor e o apoio (2 jogadores) ficam no circulo central — os outros vinte, das duas
equipas, ficam fora dele — e a linha de defesa fica nas intermediarias (a meio caminho entre a grande area e a linha
central), seja qual for o ajuste "Linha Defensiva" do painel.
Corre com: node --test --test-force-exit tests/saida_de_bola_posicoes.test.js
*/
const test = require('node:test');
const assert = require('node:assert');
require('../tools/headless/harness.js');

const scene = new THREE.Scene();
Match.init(scene);
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = true;

const R = 9.15;
const posicoes = (equipaDaSaida) => {
    Match.saidaPlano = null;
    const plano = Match.planoDeSaida(equipaDaSaida);
    const todos = [];
    for (const [lista, team] of [[Match.players, 'TeamA'], [Match.opponents, 'TeamB']]) {
        const dir = Lados.dirDe(team);
        for (const p of lista) {
            if (p.role === 'gk') continue;
            let alvo;
            if (p === plano.taker) alvo = plano.takerPos;
            else if (p === plano.apoio) alvo = plano.apoioPos;
            else alvo = Match.posicaoDeSaida(p, dir);
            todos.push({ p, dir, alvo, d: Math.hypot(alvo.x, alvo.z) });
        }
    }
    return { plano, todos };
};

for (const equipa of ['TeamA', 'TeamB']) {
    test(`saida do ${equipa}: so 2 jogadores dentro do circulo central`, () => {
        const { todos } = posicoes(equipa);
        assert.strictEqual(todos.filter(q => q.d < R).length, 2, todos.map(q => q.d.toFixed(1)).join(' '));
    });
}

test('a linha de defesa fica nas intermediarias, qualquer que seja a Linha Defensiva', () => {
    for (const linha of ['low', 'medium', 'high']) {
        Tatics.linhaDefensiva = linha;
        const { todos } = posicoes('TeamA');
        for (const q of todos.filter(q => q.p.role === 'def')) {
            const zAtaque = q.alvo.z * q.dir;
            assert.ok(zAtaque <= -R && zAtaque >= -30, `${linha}: defesa a ${zAtaque.toFixed(1)} m (referencial de ataque)`);
            assert.ok(Math.abs(zAtaque - (-18.25)) < 9, `${linha}: defesa a ${zAtaque.toFixed(1)} m, longe das intermediarias`);
        }
    }
});
