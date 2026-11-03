import test from 'node:test';
import assert from 'node:assert/strict';
import { salariosDaLiga, salarioMensalBRL, SERIES_SALARIOS, SEMANAS_NO_MES } from '../textSim/salarios';
import { TAXAS } from '../textSim/cambio';

const skills = Array.from({ length: 500 }, (_, i) => 40 + (i % 50));            // 500 jogadores, overalls 40..89
const mensalBRL = (usdSemana: number) => usdSemana * SEMANAS_NO_MES * TAXAS.BRL;
const media = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;

test('Serie C e D: media mensal perto de R$ 8 000 e R$ 3 500', () => {
  const c = media(salariosDaLiga('bra_serie_c', skills)!.map(mensalBRL)), d = media(salariosDaLiga('bra_serie_d', skills)!.map(mensalBRL));
  assert.ok(c > 7000 && c < 9000, `Serie C: ${Math.round(c)}`);
  assert.ok(d > 3000 && d < 4000, `Serie D: ${Math.round(d)}`);
});

test('Serie A e B: media mensal perto de R$ 140 000 e R$ 30 000', () => {
  const a = media(salariosDaLiga('bra_serie_a', skills)!.map(mensalBRL)), b = media(salariosDaLiga('bra_serie_b', skills)!.map(mensalBRL));
  assert.ok(a > 130_000 && a < 150_000, `Serie A: ${Math.round(a)}`);
  assert.ok(b > 27_000 && b < 33_000, `Serie B: ${Math.round(b)}`);
});

test('os extremos de cada serie ficam nas faixas da tabela', () => {
  assert.ok(salarioMensalBRL('bra_serie_c', 0)! >= 2000 && salarioMensalBRL('bra_serie_c', 0)! <= 2600);
  assert.ok(salarioMensalBRL('bra_serie_c', 1)! >= 40000 && salarioMensalBRL('bra_serie_c', 1)! <= 50000);
  assert.ok(salarioMensalBRL('bra_serie_d', 0)! >= 800 && salarioMensalBRL('bra_serie_d', 0)! <= 1200);
  assert.equal(salarioMensalBRL('bra_serie_a', 0), 10000);
  assert.equal(salarioMensalBRL('bra_serie_a', 1), 1_500_000);
});

test('mais overall, mais salario; ligas sem tabela ficam como estao', () => {
  const s = salariosDaLiga('bra_serie_a', [50, 60, 70, 80, 90])!;
  for (let i = 1; i < s.length; i++) assert.ok(s[i] >= s[i - 1]);
  assert.equal(salariosDaLiga('eng_premier', [50, 60]), null);
  assert.equal(Object.keys(SERIES_SALARIOS).length, 4);
});

test('jogo gerado: a media mensal de cada divisao fica perto da referencia', async () => {
  const { generateLeagueData } = await import('../textSim/dataGenerator');
  const alvo: Record<string, number> = { bra_serie_a: 140_000, bra_serie_b: 30_000, bra_serie_c: 8_000, bra_serie_d: 3_500 };
  for (const [liga, ref] of Object.entries(alvo)) {
    const { players } = generateLeagueData('45', liga) as any;
    const m = media(players.map((p: any) => mensalBRL(p.salary)));
    assert.ok(m > ref * 0.85 && m < ref * 1.15, `${liga}: media ${Math.round(m)} (referencia ${ref})`);
  }
});
