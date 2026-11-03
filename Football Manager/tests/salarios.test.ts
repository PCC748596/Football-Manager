import test from 'node:test';
import assert from 'node:assert/strict';
import { salariosDaLiga, salarioMensalBRL, salarioDoJovem, ajustarSalariosDaBase, salarioDeMercadoDaLiga, SERIES_SALARIOS, CURVA_A, SEMANAS_NO_MES } from '../textSim/salarios';
import { TAXAS } from '../textSim/cambio';

const skills = Array.from({ length: 500 }, (_, i) => 40 + (i % 50));            // 500 jogadores, overalls 40..89
const mensalBRL = (usdSemana: number) => usdSemana * SEMANAS_NO_MES * TAXAS.BRL;
const media = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;

test('curva da Serie A: minimo 50 mil, maximo 2,5 milhoes, media perto de 150 mil', () => {
  assert.equal(salarioMensalBRL('bra_serie_a', 0), 50_000);
  assert.equal(salarioMensalBRL('bra_serie_a', 1), 2_500_000);
  const m = media(salariosDaLiga('bra_serie_a', skills)!.map(mensalBRL));
  assert.ok(m > 135_000 && m < 165_000, `Serie A: ${Math.round(m)}`);
});

test('B, C e D pagam 50%, 25% e 15% da Serie A (minimo, maximo e media)', () => {
  const mediaA = media(salariosDaLiga('bra_serie_a', skills)!.map(mensalBRL));
  for (const [liga, f] of [['bra_serie_b', 0.5], ['bra_serie_c', 0.25], ['bra_serie_d', 0.15]] as const) {
    assert.equal(SERIES_SALARIOS[liga].fracao, f);
    assert.equal(salarioMensalBRL(liga, 0), Math.round(CURVA_A.min * f / 50) * 50);
    assert.equal(salarioMensalBRL(liga, 1), Math.round(CURVA_A.max * f / 50) * 50);
    const m = media(salariosDaLiga(liga, skills)!.map(mensalBRL));
    assert.ok(Math.abs(m / mediaA - f) < 0.01, `${liga}: ${m / mediaA} vs ${f}`);
  }
});

test('mais overall, mais salario; ligas sem tabela ficam como estao', () => {
  const s = salariosDaLiga('bra_serie_a', [50, 60, 70, 80, 90])!;
  for (let i = 1; i < s.length; i++) assert.ok(s[i] >= s[i - 1]);
  assert.equal(salariosDaLiga('eng_premier', [50, 60]), null);
  assert.equal(Object.keys(SERIES_SALARIOS).length, 4);
});

test('jogo gerado: a media mensal de cada divisao fica perto de 150K / 75K / 37,5K / 22,5K', async () => {
  const { generateLeagueData } = await import('../textSim/dataGenerator');
  const alvo: Record<string, number> = { bra_serie_a: 150_000, bra_serie_b: 75_000, bra_serie_c: 37_500, bra_serie_d: 22_500 };
  for (const [liga, ref] of Object.entries(alvo)) {
    const { players } = generateLeagueData('45', liga) as any;
    const m = media(players.map((p: any) => mensalBRL(p.salary)));
    assert.ok(m > ref * 0.85 && m < ref * 1.15, `${liga}: media ${Math.round(m)} (referencia ${ref})`);
  }
});

test('salario de mercado da liga: so nas ligas com tabela, e cresce com o overall', () => {
  const times = [{ id: 'a', leagueId: 'bra_serie_c' }, { id: 'b', leagueId: 'eng_premier' }] as any;
  const jogs = Array.from({ length: 20 }, (_, i) => ({ id: 'p' + i, teamId: 'a', skill: 50 + i })) as any[];
  jogs.push({ id: 'x', teamId: 'b', skill: 80 });
  assert.equal(salarioDeMercadoDaLiga(jogs[20], times, jogs), undefined);
  assert.ok(salarioDeMercadoDaLiga(jogs[19], times, jogs)! > salarioDeMercadoDaLiga(jogs[0], times, jogs)!);
});

test('Sub-20: 20% da media da serie (de 10% a 30% pelo overall)', () => {
  for (const liga of ['bra_serie_a', 'bra_serie_b', 'bra_serie_c', 'bra_serie_d']) {
    const mediaSerie = SERIES_SALARIOS[liga].fracao * CURVA_A.media;
    const meio = mensalBRL(salarioDoJovem(liga, 70)!), piso = mensalBRL(salarioDoJovem(liga, 55)!), teto = mensalBRL(salarioDoJovem(liga, 90)!);
    assert.ok(Math.abs(meio / mediaSerie - 0.2) < 0.02, `${liga}: ${meio / mediaSerie}`);
    assert.ok(Math.abs(piso / mediaSerie - 0.1) < 0.02 && Math.abs(teto / mediaSerie - 0.3) < 0.02);
  }
  assert.equal(salarioDoJovem('eng_premier', 70), undefined);
  const base: any = { jogadores: [{ id: 'j1', teamId: 'a', skill: 62, salary: 9_999 }, { id: 'j2', teamId: 'b', skill: 62, salary: 9_999 }] };
  const ts = [{ id: 'a', leagueId: 'bra_serie_d' }, { id: 'b', leagueId: 'eng_premier' }] as any;
  const b1 = ajustarSalariosDaBase(base, ts);
  assert.ok(b1.jogadores[0].salary < 9_999 && b1.jogadores[1].salary === 9_999);
  assert.equal(ajustarSalariosDaBase(b1, ts), b1, 'idempotente');
});
