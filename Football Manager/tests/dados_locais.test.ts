import test from 'node:test';
import assert from 'node:assert/strict';
import { carregarDadosLocais, dadosLocaisAtivos, jogadoresLocaisDoClube } from '../textSim/dadosLocais';
import { generateLeagueData } from '../textSim/dataGenerator';
import { atributos3d, paisDoJogador } from '../textSim/atributos3d';

// Ficheiro sintetico (nomes inventados): o teste nunca depende dos dados reais, que ficam fora do repositorio.
const SKILLS_BASE: Record<string, number> = {
  ball_control: 70, dribbling: 70, finishing: 70, shot_power: 70, long_shots: 70, volleys: 70, crossing: 70, passing: 70, long_passing: 70, heading: 70, tackle_standing: 70, tackle_sliding: 70, man_marking: 70,
  acceleration: 70, speed: 70, agility: 70, jumping: 70, strength: 70, stamina: 70, balance: 70, positioning_off: 70, positioning_def: 70, vision: 70, aggression: 70, reactions: 70, composure: 70,
  consistency: 70, tactical_awareness: 70, free_kicks: 70, corner_kicks: 70, penalties: 70, gk_diving: 20, gk_handling: 20, gk_positioning: 20, gk_one_on_ones: 20, gk_reflexes: 20, gk_kicking: 20
};
const jogador = (n: number, position: string, squad: string) => ({
  firstName: 'Teste', lastName: `Jogador${n}`, shortName: `Jog${n}`, birthDate: '1999-07-23', nationality: 54, nationality2: 0, fifaId: null, position, squad,
  height: 180, weight: 75, shirtFirstTeam: squad === 'first_team' ? n : 0, shirtReserve: 0, contractStart: '2024-07-01', contractEnd: '2027-06-30',
  skills: { ...SKILLS_BASE, ...(position === 'GK' ? { gk_diving: 80, gk_handling: 80, gk_positioning: 80, gk_one_on_ones: 80, gk_reflexes: 80, gk_kicking: 60 } : {}) }
});
const ficheiro = { country: 54, clubs: [{ id: 2, name: 'Clube Teste', tier: 1, gameTeamId: 450171, players: [jogador(1, 'GK', 'first_team'), ...Array.from({ length: 12 }, (_, i) => jogador(i + 2, 'CM', 'first_team')), jogador(40, 'ST', 'youth')], staff: [] }] };

const fetchReal = globalThis.fetch;
test.after(() => { globalThis.fetch = fetchReal; });

test('sem ficheiro (404) nada muda: usa a base de sempre', async () => {
  globalThis.fetch = (async () => ({ ok: false })) as any;
  assert.equal(await carregarDadosLocais(), false);
  assert.equal(dadosLocaisAtivos(), false);
  const { players } = generateLeagueData('45', 'bra_serie_a');
  assert.ok(!players.some(p => p.name.startsWith('Jog')));
});

test('com ficheiro, a partida nova usa os jogadores dele no clube casado e completa o plantel', async () => {
  globalThis.fetch = (async (url: string) => String(url).endsWith('/54') ? { ok: true, json: async () => ficheiro } : { ok: false }) as any;
  assert.equal(await carregarDadosLocais(), true);
  assert.equal(jogadoresLocaisDoClube(450171)!.length, 13);   // a base (youth) fica de fora
  const { teams, players } = generateLeagueData('45', 'bra_serie_a');
  const t = teams.find(x => x.id === '450171')!;
  const doClube = players.filter(p => p.teamId === t.id);
  assert.ok(doClube.length >= 28);
  const gk = doClube.find(p => p.name === 'Jog1')!;
  assert.equal(gk.position, 'GK');
  assert.ok(gk.birthDate === '1999-07-23' && gk.age === 26);
  assert.ok(!doClube.some(p => p.name === 'Jog40'));
  // os outros clubes ficam como estavam
  assert.ok(!players.filter(p => p.teamId !== t.id).some(p => p.name.startsWith('Jog')));
});

test('os atributos do 3D do jogador local vem do ficheiro (50 a 99) e a nacionalidade tambem', async () => {
  const { players } = generateLeagueData('45', 'bra_serie_a');
  const cm = players.find(p => p.name === 'Jog2')!;
  const a = atributos3d(cm);
  assert.equal(a.real, true);
  // o ajuste da faixa de OVR da liga mexe no DEF/PAS/DRB/SHT e o 3D soma esse desvio (mecanismo do treino): uns pontos de folga
  assert.ok(Math.abs(a.tec - 70) <= 4 && Math.abs(a.fis - 70) <= 1);
  const gk = atributos3d(players.find(p => p.name === 'Jog1')!);
  assert.equal(gk.gk, 77);   // media de diving, handling, reflexes, posGK, onos, kicking = (80*5+60)/6
  assert.equal(paisDoJogador(cm, 45), '45');   // 54 (Brasil no jogo de origem) -> 45
});

test('Inglaterra (pais 14): as ligas novas existem, e o overlay usa os jogadores no clube casado; bandeira 14 -> 65', async () => {
  const ing = { country: 14, clubs: [{ id: 25, name: 'Clube Ingles', tier: 2, gameTeamId: 650025, players: [{ ...jogador(1, 'GK', 'first_team'), nationality: 14 }, { ...jogador(2, 'CM', 'first_team'), nationality: 50 }], staff: [] }] };
  globalThis.fetch = (async (url: string) => String(url).endsWith('/14') ? { ok: true, json: async () => ing } : { ok: false }) as any;
  assert.equal(await carregarDadosLocais(), true);
  const champ = generateLeagueData('65', 'eng_champ');
  assert.equal(champ.teams.length, 24);
  assert.ok(champ.players.some(p => p.name === 'Jog1' && p.teamId === '650025'));
  assert.equal(generateLeagueData('65', 'eng_l1').teams.length, 24);
  assert.equal(generateLeagueData('65', 'eng_l2').teams.length, 24);
  assert.equal(generateLeagueData('65', 'eng_prem').teams.length, 20);
  const gk = champ.players.find(p => p.name === 'Jog1')!, outro = champ.players.find(p => p.name === 'Jog2')!;
  assert.equal(paisDoJogador(gk, 65), '65');
  assert.equal(paisDoJogador(outro, 65), null);   // codigo 50 sem bandeira conhecida: nada de bandeira errada
});
