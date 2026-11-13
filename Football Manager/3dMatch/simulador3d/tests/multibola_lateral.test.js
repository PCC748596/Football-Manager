/*
MULTIBOLA — LATERAL. Spec: docs/superpowers/specs/2026-11-12-multibola-design.md.

Pedido: *"uns cones com as bolas serao colocados ao redor do campo... Quando a bola sair o jogador cobrador do lateral vai ate o cone com a bola mais proxima, se abaixa,
pega a bola, vai ate o local da cobranca e prossegue com a cobranca normalmente"*. E: *"a bola sai, mas pode bater na placa ou na arquibancada, pra depois sumir. Se a
bola bater e voltar pro campo, ela mesma pode ser usada para o lateral"*.

Corre com: node tests/multibola_lateral.test.js
*/
require('../tools/headless/harness.js');
let falhas = 0;
const verifica = (c, b, m) => { if (c) console.log('  . ' + b); else { console.log('  X ' + m); falhas++; } };
if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = false;

console.log('1 — os cones');
{
    const cs = MultiBola.posicoesDosCones();
    verifica(cs.length === 15, '15 cones', 'cones: ' + cs.length);
    const fora = cs.every(c => Math.abs(c.x) > CAMPO_LARG / 2 || Math.abs(c.z) > CAMPO_COMP / 2);
    verifica(fora, 'todos fora do campo', 'ha cone dentro do campo');
    const dentroBarreira = cs.every(c => Math.abs(c.x) < BarreiraCampo.x && Math.abs(c.z) < BarreiraCampo.z);
    verifica(dentroBarreira, 'todos antes da barreira/placa', 'ha cone para la da barreira');
    const lado = (typeof TunelJogadores !== 'undefined' && TunelJogadores.lado) || -1;
    verifica(cs.filter(c => Math.sign(c.x) === Math.sign(lado) && Math.abs(c.z) < CAMPO_COMP / 2).length === 6, '6 cones na lateral dos bancos', 'cones do lado dos bancos errados');
    verifica(cs.filter(c => Math.sign(c.x) === -Math.sign(lado) && Math.abs(c.z) < CAMPO_COMP / 2).length === 5, '5 cones na lateral oposta', 'cones da lateral oposta errados');
    verifica(cs.filter(c => Math.abs(c.z) > CAMPO_COMP / 2).length === 4, '2 atras de cada baliza', 'cones atras das balizas errados');
    const i = MultiBola.coneMaisProximo(-lado * CAMPO_LARG / 2, 20);
    verifica(Math.abs(cs[i].z - 22) < 1 && Math.sign(cs[i].x) === -Math.sign(lado), 'o cone mais proximo de um ponto da lateral e o de z=22 desse lado', 'cone escolhido: ' + JSON.stringify(cs[i]));
}

console.log(falhas ? 'FALHOU: ' + falhas : 'OK: multibola do lateral.');
process.exit(falhas ? 1 : 0);
