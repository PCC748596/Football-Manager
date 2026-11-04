import test from 'node:test';
import assert from 'node:assert/strict';
import { salarioDoJovem, ajustarSalariosDaBase, salarioDeMercadoDaLiga } from '../textSim/salarios';
import { salarioMensalEUR } from '../textSim/economia';

test('Premier: 60 = 15 mil, 70 = 120 mil, 75 = 450 mil, 85 = 2,2 M por mes (a idade ideal)', () => {
  const v = (o: number) => salarioMensalEUR(o, 26, 'eng_prem');
  assert.ok(Math.abs(v(60) / 15_000 - 1) < 0.05 && Math.abs(v(70) / 120_000 - 1) < 0.05);
  assert.equal(v(75), 450_000);
  assert.ok(Math.abs(v(85) / 2_200_000 - 1) < 0.05);
});

test('Brasil: Serie A 75 = 110 mil, 70 = 45 mil, 60 = 8 mil; B, C e D pelas ancoras da tabela', () => {
  assert.equal(salarioMensalEUR(75, 26, 'bra_serie_a'), 110_000);
  assert.ok(Math.abs(salarioMensalEUR(70, 26, 'bra_serie_a') / 45_000 - 1) < 0.05);
  assert.ok(Math.abs(salarioMensalEUR(60, 26, 'bra_serie_a') / 8_000 - 1) < 0.05);
  assert.equal(salarioMensalEUR(75, 26, 'bra_serie_b'), 35_000);
  assert.equal(salarioMensalEUR(75, 26, 'bra_serie_c'), 12_000);
  assert.equal(salarioMensalEUR(75, 26, 'bra_serie_d'), 5_000);
});

test('mais overall, mais salario; salario de mercado da liga do clube; jovem ganha menos', () => {
  const times = [{ id: 'a', leagueId: 'bra_serie_c' }, { id: 'b', leagueId: 'eng_prem' }] as any;
  const fraco = salarioDeMercadoDaLiga({ teamId: 'a', skill: 55, age: 26 } as any, times)!, forte = salarioDeMercadoDaLiga({ teamId: 'a', skill: 75, age: 26 } as any, times)!;
  assert.ok(forte > fraco);
  assert.ok(salarioDeMercadoDaLiga({ teamId: 'b', skill: 75, age: 26 } as any, times)! > forte * 10);
  assert.ok(salarioDoJovem('bra_serie_a', 70)! < salarioDeMercadoDaLiga({ teamId: 'a', skill: 70, age: 26 } as any, [{ id: 'a', leagueId: 'bra_serie_a' }] as any)!);
});

test('Sub-20: ajusta a base e e idempotente', () => {
  const base: any = { jogadores: [{ id: 'j1', teamId: 'a', skill: 62, salary: 9_999_999 }, { id: 'j2', teamId: 'b', skill: 62, salary: 9_999_999 }] };
  const ts = [{ id: 'a', leagueId: 'bra_serie_d' }, { id: 'b', leagueId: 'eng_prem' }] as any;
  const b1 = ajustarSalariosDaBase(base, ts);
  assert.ok(b1.jogadores[0].salary < 9_999_999 && b1.jogadores[1].salary < 9_999_999);
  assert.ok(b1.jogadores[1].salary > b1.jogadores[0].salary);
  assert.equal(ajustarSalariosDaBase(b1, ts), b1, 'idempotente');
});
