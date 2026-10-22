import test from 'node:test';
import assert from 'node:assert/strict';
import { propostaDoJogador, chanceDeAceitar, humorDaOferta, abrirNegociacao, resolverNegociacoes, assinar, MORAL_AO_ACEITAR, MORAL_AO_RECUSAR } from '../textSim/negociacao';
import { faixaDeContrato, somarAnos } from '../textSim/contracts';

const jog = (id: string, extra: any = {}) => ({ id, name: 'J' + id, position: 'CM', skill: 70, age: 27, value: 5_000_000, salary: 8_000, morale: 50, teamId: 'U', contract: { start: '2021-07-01', end: '2024-07-01', years: 3 }, ...extra }) as any;
const HOJE = '2024-04-01';

test('proposta do jogador: salario nunca abaixo do atual, anos dentro da faixa da idade, estavel no mes', () => {
  for (let i = 0; i < 300; i++) {
    const p = jog('p' + i, { age: 17 + (i % 22), value: 200_000 + i * 90_000, salary: 1_000 + i * 40 });
    const a = propostaDoJogador(p, HOJE), b = propostaDoJogador(p, '2024-04-20');
    assert.ok(a.salario >= p.salary, 'pede pelo menos o que ganha');
    const [min, max] = faixaDeContrato(p.age);
    assert.ok(a.anos >= min && a.anos <= max);
    assert.deepEqual(a, b, 'a mesma proposta durante o mes');
  }
});

test('chance de aceitar: igual ao pedido = 1; abaixo de 80% = quase recusa; mais salario sobe a chance', () => {
  const p = jog('a'), pedido = { salario: 10_000, anos: 3 };
  assert.equal(chanceDeAceitar(p, pedido, pedido), 1);
  assert.equal(chanceDeAceitar(p, { salario: 12_000, anos: 3 }, pedido), 1, 'pagar mais com os mesmos anos tambem');
  assert.ok(chanceDeAceitar(p, { salario: 7_900, anos: 3 }, pedido) <= 0.05);
  const c90 = chanceDeAceitar(p, { salario: 9_000, anos: 3 }, pedido), c95 = chanceDeAceitar(p, { salario: 9_500, anos: 3 }, pedido);
  assert.ok(c95 > c90 && c90 > 0.1 && c90 < 0.9, `${c90} < ${c95}`);
  // anos: o veterano nao quer mais anos que o pedido, o jovem nao quer menos
  const vet = jog('v', { age: 35 }), jovem = jog('j', { age: 22 });
  const ped = { salario: 10_000, anos: 2 };
  assert.ok(chanceDeAceitar(vet, { salario: 10_000, anos: 4 }, ped) < chanceDeAceitar(vet, { salario: 10_000, anos: 1 }, ped), 'veterano prefere menos anos');
  const pedJ = { salario: 10_000, anos: 4 };
  assert.ok(chanceDeAceitar(jovem, { salario: 10_000, anos: 2 }, pedJ) < chanceDeAceitar(jovem, { salario: 10_000, anos: 5 }, pedJ), 'jovem prefere mais anos');
  // moral
  const feliz = jog('f', { morale: 95 }), triste = jog('t', { morale: 5 });
  const oferta = { salario: 9_000, anos: 3 };
  assert.ok(chanceDeAceitar(feliz, oferta, pedido) > chanceDeAceitar(triste, oferta, pedido));
  assert.equal(humorDaOferta(0.9), 'MUITO_PROVAVEL'); assert.equal(humorDaOferta(0.6), 'PROVAVEL'); assert.equal(humorDaOferta(0.3), 'INCERTO'); assert.equal(humorDaOferta(0.1), 'IMPROVAVEL');
});

test('a analise leva 2 ou 3 dias, sempre o mesmo para o mesmo jogador e dia', () => {
  const dias = new Set<number>();
  for (let i = 0; i < 400; i++) {
    const p = jog('d' + i), n = abrirNegociacao(p, { salario: 9_000, anos: 3 }, { salario: 10_000, anos: 3 }, HOJE);
    const d = Math.round((Date.parse(n.decide) - Date.parse(HOJE)) / 86400000);
    assert.ok(d === 2 || d === 3, 'dias ' + d); dias.add(d);
    assert.equal(abrirNegociacao(p, { salario: 9_000, anos: 3 }, { salario: 10_000, anos: 3 }, HOJE).decide, n.decide);
  }
  assert.equal(dias.size, 2, 'saem os dois valores');
});

test('assinar na hora: contrato novo a partir de hoje, salario novo, moral sobe (limite 100)', () => {
  const p = jog('s', { morale: 97 });
  const q = assinar(p, { salario: 11_000, anos: 4 }, HOJE);
  assert.deepEqual(q.contract, { start: HOJE, end: somarAnos(HOJE, 4), years: 4 });
  assert.equal(q.salary, 11_000); assert.equal(q.morale, 100);
  assert.equal(assinar(jog('s2', { morale: 50 }), { salario: 1, anos: 1 }, HOJE).morale, 50 + MORAL_AO_ACEITAR);
  assert.equal(p.salary, 8_000, 'o original nao muda');
});

test('resolver: so no dia; aceita (contrato, salario e moral sobem) ou recusa (moral cai, contrato igual); cancela se o jogador saiu', () => {
  const pedido = { salario: 10_000, anos: 3 };
  const jogadores = Array.from({ length: 200 }, (_, i) => jog('r' + i));
  const ofertas = jogadores.map(p => abrirNegociacao(p, { salario: 9_000, anos: 3 }, pedido, HOJE));
  const antes = resolverNegociacoes(ofertas, jogadores, HOJE, 'U');
  assert.equal(antes.negociacoes, ofertas, 'nada antes do dia');
  assert.equal(antes.jogadores, jogadores);
  let aceitas = 0, recusas = 0, resolvidas = 0;
  let restantes = ofertas, lista = jogadores;
  for (let d = 1; d <= 4; d++) {
    const hoje = new Date(Date.UTC(2024, 3, 1 + d, 12)).toISOString().slice(0, 10);
    const r = resolverNegociacoes(restantes, lista, hoje, 'U');
    r.respostas.forEach(x => {
      resolvidas++;
      const orig = jogadores.find(p => p.id === x.jogador.id)!;
      if (x.aceitou) { aceitas++; assert.equal(x.jogador.salary, 9_000); assert.equal(x.jogador.contract.start, hoje); assert.equal(x.jogador.morale, 50 + MORAL_AO_ACEITAR); }
      else { recusas++; assert.equal(x.jogador.salary, orig.salary); assert.deepEqual(x.jogador.contract, orig.contract); assert.equal(x.jogador.morale, 50 + MORAL_AO_RECUSAR); }
    });
    restantes = r.negociacoes; lista = r.jogadores;
  }
  assert.equal(resolvidas, 200); assert.equal(restantes.length, 0, 'todas respondidas em 2-3 dias');
  assert.ok(aceitas > 20 && recusas > 20, `variedade: ${aceitas} aceitas / ${recusas} recusas`);
  console.log('oferta a 90% do pedido:', aceitas, 'aceitas de 200 | chance teorica', chanceDeAceitar(jogadores[0], { salario: 9_000, anos: 3 }, pedido).toFixed(2));
  // a resposta e a mesma se o jogo for recarregado
  const dia = ofertas[0].decide;
  const a = resolverNegociacoes([ofertas[0]], [jogadores[0]], dia, 'U').respostas[0].aceitou;
  const b = resolverNegociacoes([ofertas[0]], [jogadores[0]], dia, 'U').respostas[0].aceitou;
  assert.equal(a, b);
  // vendido/livre antes de responder: cancela, sem resposta
  const vendido = resolverNegociacoes([ofertas[0]], [{ ...jogadores[0], teamId: 'MARKET' }], dia, 'U');
  assert.equal(vendido.respostas.length, 0); assert.equal(vendido.negociacoes.length, 0);
});
