import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, simulateWorldTo } from '../textSim/world';
import { snapDeLiga } from '../textSim/managerLigas';
import { semearTreinadores, atualizarTreinadores } from '../textSim/managerExpectations';

// Calibragem com a base real: um ano com todas as ligas do mundo, a cada 3 dias. Protege contra demissoes em massa (o primeiro desenho dava 125% dos clubes).
test('mercado de treinadores na base real: demissoes moderadas e nenhum clube sem treinador', () => {
  let w = createWorld(undefined, '2026-03-01');
  const ligas = () => w.map(l => snapDeLiga(l.leagueId, l.teams, l.fixtures));
  let estado = semearTreinadores(ligas());
  let demissoes = 0;
  const d0 = new Date('2026-03-01T12:00:00').getTime();
  for (let dia = 0; dia < 400; dia += 3) {
    const d = new Date(d0 + dia * 86400000).toISOString().slice(0, 10);
    w = simulateWorldTo(w, d);
    const r = atualizarTreinadores(estado, ligas(), d);
    estado = r.estado;
    demissoes += r.eventos.filter(e => e.tipo === 'DEMISSAO').length;
  }
  const comCalendario = w.filter(l => l.fixtures.length);
  const clubes = comCalendario.reduce((n, l) => n + l.teams.length, 0);
  const taxa = demissoes / clubes;
  assert.ok(taxa > 0.05 && taxa < 0.45, `taxa de demissao ${(taxa * 100).toFixed(1)}% fora de 5-45%`);
  assert.equal(estado.fechadas.length, comCalendario.length, 'todas as ligas com calendario fecham');
  for (const l of w) for (const t of l.teams) {
    const n = Object.values(estado.managers).filter(m => m.clubKey === l.leagueId + '|' + t.id).length;
    assert.equal(n, 1, `${l.leagueId}|${t.name} tem ${n} treinadores`);
  }
});
