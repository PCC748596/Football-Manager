/*
Bancos de reservas e áreas técnicas (js/bancos.js, BancosDeReservas em config/physics.js): dois bancos no lado das câmaras com 10 reservas cada, um vão
de placa de publicidade em frente a cada um, e o treinador (fato e gravata) a passear devagar dentro da área técnica.
Corre com: node --test --test-force-exit tests/bancos_e_area_tecnica.test.js
*/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('vm');
const { RAIZ } = require('../tools/headless/harness.js');

for (const f of ['js/crowd.js', 'js/staff.js', 'js/bancos.js']) vm.runInThisContext(fs.readFileSync(RAIZ + '/' + f, 'utf8'), { filename: f });
for (const k of ['Crowd', 'Staff', 'Bancos']) if (!(k in global) && global.window && global.window[k]) global[k] = global.window[k];

const cena = new THREE.Scene();
Match.init(cena);
Officials.init(cena);
const B = BancosDeReservas;

test('dois bancos do lado das câmaras, um em cada metade, com 10 reservas e um treinador', () => {
    assert.strictEqual(Bancos.bancos.length, 2);
    const zs = Bancos.bancos.map(b => b.zc).sort((a, b) => a - b);
    assert.ok(zs[0] < 0 && zs[1] > 0, 'um banco em cada metade');
    for (const b of Bancos.bancos) {
        assert.strictEqual(b.reservas.length, 10, 'dez reservas (modelos de jogador)');
        assert.ok(b.reservas.every(r => r.rig && r.model.position.x > 0), 'no lado +X');
        assert.ok(b.treinador, 'treinador criado');
        assert.ok(b.treinador.model.position.x > 0, 'no lado +X');
    }
});

test('um painel de publicidade retirado em frente a cada banco (e nenhuma placa a tapar o vão)', () => {
    const vaos = Bancos.vaosDasPlacas();
    assert.strictEqual(vaos.length, 2);
    for (const [z0, z1] of vaos) assert.ok(Math.abs((z1 - z0) - B.larguraVao) < 1e-9);
    // Nenhuma malha de placa (caixa a x = +placa) cobre o centro dos vãos.
    const xPlaca = 34 + PlacasPublicidade.recuo;
    const placas = [];
    cena.traverse(o => { if (o.isMesh && o.geometry && o.geometry.type === 'BoxGeometry' && Math.abs(o.position.x - xPlaca) < 0.01 && Math.abs(o.rotation.y - Math.PI / 2) < 1e-6) placas.push(o); });
    assert.ok(placas.length >= 3, 'placas do lado dos bancos: ' + placas.length);
    for (const [z0, z1] of vaos) {
        const zc = (z0 + z1) / 2;
        for (const p of placas) {
            const meio = p.geometry.parameters.width / 2;
            assert.ok(!(zc > p.position.z - meio + 0.01 && zc < p.position.z + meio - 0.01), 'placa a tapar o vão em z=' + zc);
        }
    }
});

test('os reservas são os substitutos do manager (Tactics) e ficam sentados nos lugares do banco', () => {
    const info = { nome: 'Teste FC', banco: [1, 2, 3, 4, 5, 6, 7].map(i => ({ id: 269000 + i, nome: 'S' + i, numero: i })) };
    Bancos.preencher(info, null, null, null);
    const a = Bancos.bancos.find(b => b.equipa === 'A');
    assert.strictEqual(a.reservas.length, 7, 'tantos reservas quantos substitutos');
    const zs = a.reservas.map(r => r.model.position.z);
    assert.ok(Math.max(...zs) - Math.min(...zs) <= BancosDeReservas.larguraVao, 'cabem no vão da placa');
    // Sentados: a bacia desceu (pose do público) e a anca está dobrada.
    assert.ok(a.reservas.every(r => r.rig.lLeg.rotation.x < -1 && r.rig.pelvis.position.y < 2.0), 'pose sentada');
    Bancos.preencher(null, null, null, null);   // volta ao banco genérico de 10
    assert.strictEqual(Bancos.bancos[0].reservas.length, 10);
});

test('o treinador anda ao ritmo do jogo: acompanha a bola, devagar e dentro da área técnica', () => {
    const t = Bancos.bancos[0].treinador;
    const dt = 1 / 60;
    const alvoBola = (z) => { Match.ball.position.set(0, 0.2, z); for (let i = 0; i < 60 * 40; i++) Bancos.update(dt); return t.model.position.z; };
    let maxVel = 0, ult = t.model.position.clone();
    const medir = (z) => {
        Match.ball.position.set(0, 0.2, z);
        for (let i = 0; i < 60 * 40; i++) {
            Bancos.update(dt);
            const p = t.model.position;
            maxVel = Math.max(maxVel, Math.hypot(p.x - ult.x, p.z - ult.z) / dt);
            ult.copy(p);
        }
        return t.model.position.z;
    };
    const perto = medir(t.zc), longeMais = medir(t.zc + 40), longeMenos = medir(t.zc - 40);
    assert.ok(Math.abs(perto - t.zc) < 1.6, 'com a bola ao nível do banco fica ao centro: ' + perto.toFixed(2));
    assert.ok(longeMais - perto > 2.5, 'bola para um lado: vai para esse lado: ' + longeMais.toFixed(2));
    assert.ok(longeMenos - perto < -2.5, 'bola para o outro: vai para o outro: ' + longeMenos.toFixed(2));
    for (const z of [perto, longeMais, longeMenos]) assert.ok(Math.abs(z - t.zc) <= BancosDeReservas.area.meiaLargura, 'dentro da área técnica');
    assert.ok(maxVel <= BancosDeReservas.treinador.velocidade + 0.05, 'devagar: ' + maxVel.toFixed(2) + ' m/s');
});

test('o fato do treinador é um dos quatro pedidos (preto, azul-marinho, castanho, bege)', () => {
    for (const b of Bancos.bancos) assert.ok(['preto', 'azul-marinho', 'castanho', 'bege'].includes(b.treinador.fato), b.treinador.fato);
});

test('o treinador observa o jogo: de cara para a bola, parado e a andar', () => {
    const t = Bancos.bancos[0].treinador;
    const dt = 1 / 60;
    const erroDeOlhar = () => {
        const b = Match.ball.position, p = t.model.position;
        const alvo = Math.atan2(b.x - p.x, b.z - p.z);
        return Math.abs(Math.atan2(Math.sin(alvo - t.model.rotation.y), Math.cos(alvo - t.model.rotation.y)));
    };
    const erros = [];
    for (const z of [t.zc + 30, t.zc - 30, t.zc]) {
        Match.ball.position.set(5, 0.2, z);
        for (let i = 0; i < 60 * 30; i++) { Bancos.update(dt); if (i > 60 * 8 && i % 30 === 0) erros.push(erroDeOlhar()); }
    }
    erros.sort((a, b) => a - b);
    const mediana = erros[Math.floor(erros.length / 2)];
    assert.ok(mediana < 0.35, 'olha para a bola (erro mediano ' + (mediana * 180 / Math.PI).toFixed(0) + '°)');
    assert.ok(erros[Math.floor(erros.length * 0.95)] < 0.8, 'nunca de costas para o jogo');
});

test('o médico e o massagista: 2 lugares no fim do banco, sentados, de manga e calça compridas numa cor do clube diferente da camisa dos jogadores', () => {
    const uni = { camisa: { padrao: 'solido', cores: ['#d71920'] }, calcao: '#f2f2f2' };
    const info = { nome: 'Teste FC', escudo: { cores: ['#d71920', '#0b2a6b', '#f2f2f2'] }, banco: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => ({ id: 269000 + i, nome: 'S' + i, numero: i })) };
    Bancos.preencher(info, info, uni, uni);
    assert.strictEqual(B.lugares, B.reservas + B.staff.length, 'os lugares = reservas + staff');
    for (const b of Bancos.bancos) {
        assert.strictEqual(b.staff.length, 2, 'médico e massagista');
        assert.deepStrictEqual(b.staff.map(s => s.funcao), ['medico', 'massagista']);
        const zs = b.reservas.concat(b.staff).map(r => r.model.position.z);
        assert.ok(Math.max(...zs) - Math.min(...zs) <= B.larguraVao, 'os 12 cabem no vão da placa');
        const zMaxRes = Math.max(...b.reservas.map(r => r.model.position.z));
        assert.ok(b.staff.every(s => s.model.position.z > zMaxRes), 'o staff senta-se depois dos reservas');
        assert.ok(b.staff.every(s => s.rig.lLeg.rotation.x < -1), 'sentados');
        for (const s of b.staff) {
            assert.ok(Bancos._deltaCor(s.cor, (typeof corDoUniforme === 'function') ? corDoUniforme(uni, B.coresPorOmissao.A) : B.coresPorOmissao.A) >= 35, 'cor diferente da camisa dos jogadores: ' + s.cor);
            // manga e calça compridas: nenhum material de pele no braço/perna (fora a mão) sobra da cor da pele.
            const pele = s.jogador.aparencia.pele;
            let sobra = 0;
            for (const osso of [s.rig.lArm, s.rig.rArm, s.rig.lLeg, s.rig.rLeg]) osso.traverse(o => {
                if (!o.isMesh || !o.material || o.material.map) return;
                let q = o, daMao = false; for (; q; q = q.parent) if (q === s.rig.lHand || q === s.rig.rHand) daMao = true;
                if (!daMao && o.material.color && o.material.color.getHex() === pele) sobra++;
            });
            assert.strictEqual(sobra, 0, 'sem pele à vista nos braços e pernas');
        }
    }
    Bancos.preencher(null, null, null, null);
});
