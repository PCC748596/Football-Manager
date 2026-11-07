/*
Auditoria do treino: confere a cobertura dos atributos do 3D e simula uma temporada de treino (38 semanas) com varios calendarios.
Uso: npx tsx tools/auditoriaTreino.ts
Reproduz as contas do GameContext.advanceDay (recuperacao diaria: +4 por periodo vazio, FIT + STM por sessao; pontos por atributo x fator de idade; PONTOS_POR_ATRIBUTO = +1)
e os limites do TrainingView (2 usos por sessao e o teto por aba). Se mudar uma dessas contas la, mude aqui.
*/
import { ACTIVITIES, TETO_PONTOS_TREINO, STAR_MULTIPLIERS, starsFromPotential, ENERGY_COST_BASE, drainMultiplier, ENERGIA_POR_PERIODO_LIVRE } from '../textSim/trainingService';
import { atributos3d, NOME_DO_CAMPO, campo3d } from '../textSim/atributos3d';
import { GRUPOS } from '../textSim/geradorAtributos';
import { generateLeagueData } from '../textSim/dataGenerator';

const LIMITE_ABA: Record<string, number> = { TECHNIQUE: 12, TACTICS: 10, PHYSICAL: 8, MENTAL: 8 };
const USOS_POR_SESSAO = 2;
const SEMANAS = 38;
const CUSTO_DO_JOGO = 45; // fitness perdido num jogo (ver tools/simTune.ts)

const L = (s = '') => console.log(s);
const val = (id: string, label: string) => ACTIVITIES.find(a => a.id === id)?.impacts.find(i => i.label === label)?.value || 0;

// ---------------------------------------------------------------- 1. COBERTURA
L('=== 1. COBERTURA DOS ATRIBUTOS DO 3D ===');
const todos: string[] = [...GRUPOS.TEC, ...GRUPOS.TAC, ...GRUPOS.MEN, ...GRUPOS.FIS];
const cobertura = new Map<string, { sessao: string; pts: number }[]>();
for (const a of ACTIVITIES) for (const i of a.impacts) if (i.label === 'SKL' && i.campo) {
  if (!cobertura.has(i.campo)) cobertura.set(i.campo, []);
  cobertura.get(i.campo)!.push({ sessao: a.id, pts: i.value });
}
let problemas = 0;
for (const c of todos) {
  const l = cobertura.get(c) || [];
  const dif = l.some(x => x.pts !== 1);
  if (!l.length || dif) problemas++;
  L(`${(NOME_DO_CAMPO[c] || c).padEnd(24)} ${l.length ? l.map(x => `${x.sessao} +${x.pts}`).join(', ') : '*** SEM TREINO ***'}${dif ? '  *** PONTOS DIFERENTES DE 1.0 ***' : ''}`);
}
const invalidos = [...cobertura.keys()].filter(c => !todos.includes(c));
if (invalidos.length) { problemas++; L('Campos que nao existem no 3D: ' + invalidos.join(', ')); }
L(`-> ${todos.length} atributos, ${problemas} problema(s).`);
L();

// ---------------------------------------------------------------- 2. CUSTO DE CADA SESSAO
L('=== 2. SESSOES: efeito no fitness por periodo (FIT + STM; um periodo vazio vale +4) ===');
for (const cat of Object.keys(LIMITE_ABA)) {
  const lista = ACTIVITIES.filter(a => a.category === cat);
  L(`${cat} (${lista.length} sessoes, teto ${LIMITE_ABA[cat]} periodos/semana)`);
  L('  ' + lista.map(a => `${a.id}:${(val(a.id, 'ENR')).toFixed(0)}`).join('  '));
}
L();

// ---------------------------------------------------------------- 3. CALENDARIOS
// Semana: seg-sex treino (4 periodos/dia), sabado jogo (periodos vazios), domingo livre.
type Plano = (string | null)[][];
const novoPlano = (): Plano => Array.from({ length: 7 }, () => Array(4).fill(null));
const DIA_DO_JOGO = 5;

const montar = (ordem: string[], maxPeriodos = 99): Plano => {
  const plano = novoPlano();
  const usos: Record<string, number> = {}, aba: Record<string, number> = {};
  let i = 0, vazias = 0, feitos = 0;
  for (let d = 0; d < 7; d++) for (let s = 0; s < 4; s++) {
    if (d === DIA_DO_JOGO || d === 6 || feitos >= maxPeriodos) continue;
    let ok = false;
    for (let t = 0; t < ordem.length && !ok; t++) {
      const id = ordem[(i + t) % ordem.length];
      const a = ACTIVITIES.find(x => x.id === id)!;
      if ((usos[id] || 0) >= USOS_POR_SESSAO || (aba[a.category] || 0) >= LIMITE_ABA[a.category]) continue;
      plano[d][s] = id; usos[id] = (usos[id] || 0) + 1; aba[a.category] = (aba[a.category] || 0) + 1; i += t + 1; ok = true; feitos++;
    }
    if (!ok) vazias++;
  }
  return plano;
};
const porAba = (cat: string) => ACTIVITIES.filter(a => a.category === cat).map(a => a.id);
// Intercala as abas para o plano misturar tudo.
const misto = (() => { const l = ['TECHNIQUE', 'TACTICS', 'PHYSICAL', 'MENTAL'].map(porAba); const o: string[] = []; for (let i = 0; i < 12; i++) for (const x of l) if (x[i]) o.push(x[i]); return o; })();
const CALENDARIOS: Record<string, Plano> = {
  'Misto (todas as abas)': montar(misto),
  'Misto leve (12 periodos)': montar(misto, 12),
  'Misto medio (16 periodos)': montar(misto, 16),
  'So tecnica': montar(porAba('TECHNIQUE')),
  'So fisico': montar(porAba('PHYSICAL')),
  'Pesado (Pressing, Sprints, Sliding...)': montar(['pressing', 'sprints', 'sliding', 'longshots', 'aggression', 'aerial', 'marking', 'finishing']),
};

// ---------------------------------------------------------------- 4. SIMULACAO
const { players } = generateLeagueData('45', 'bra_serie_a');
const jogador = (idade: number) => ({ ...players.find(p => p.position !== 'GK' && p.age >= idade - 1 && p.age <= idade + 1) || players[0] });
const FATOR_IDADE = (idade: number) => (idade < 22 ? 1.5 : idade > 32 ? 0.5 : 1.0);

const simular = (plano: Plano, idade: number) => {
  const p: any = jogador(idade);
  const antes = atributos3d(p);
  const ant: Record<string, number> = {};
  for (const g of ['TEC', 'TAC', 'MEN', 'FIS'] as const) for (const x of antes.detalhe![g]) ant[x.campo] = x.valor;
  p.treino3d = {};
  let fit = 100, minFit = 100, energia = 100, minEnergia = 100, somaKick = 0, jogos = 0, vazios = 0, usados = 0, abaixo70 = 0, abaixo70Energy = 0;
  const pts: Record<string, number> = {};
  for (let w = 0; w < SEMANAS; w++) for (let d = 0; d < 7; d++) {
    if (d === DIA_DO_JOGO) { somaKick += fit; jogos++; if (fit < 70) abaixo70++; fit = Math.max(0, fit - CUSTO_DO_JOGO); if (energia < 70) abaixo70Energy++; energia = Math.max(0, energia - CUSTO_DO_JOGO); minEnergia = Math.min(minEnergia, energia); }
    let rec = 0;
    for (let s = 0; s < 4; s++) {
      const id = plano[d][s];
      if (!id || id === 'recovery') { rec += 4; vazios++; energia = Math.min(100, energia + ENERGIA_POR_PERIODO_LIVRE); }
      if (id && id !== 'recovery') {
        usados++;
        rec += val(id, 'ENR');
        // Apply energy drain using drainMultiplier based on stamina
        const stamina = campo3d(p, ['stamina']);
        const drainMult = drainMultiplier(stamina);
        const realEnergyCost = (ENERGY_COST_BASE[id] ?? 0) * drainMult;
        energia = Math.max(0, energia - realEnergyCost);
        minEnergia = Math.min(minEnergia, energia);
        // Apply stars multiplier to XP
        const starsMult = STAR_MULTIPLIERS[starsFromPotential(p.potential)];
        for (const i of ACTIVITIES.find(a => a.id === id)!.impacts) if (i.label === 'SKL' && i.campo) {
          const xpFinal = i.value * FATOR_IDADE(p.age) * starsMult;
          p.treino3d[i.campo] = Math.min(TETO_PONTOS_TREINO, (p.treino3d[i.campo] || 0) + xpFinal);
          pts[i.campo] = (pts[i.campo] || 0) + i.value;
        }
      }
    }
    fit = Math.min(100, Math.max(0, fit + rec));
    minFit = Math.min(minFit, fit);
  }
  const depois = atributos3d(p);
  const ganhos: { campo: string; antes: number; depois: number }[] = [];
  for (const g of ['TEC', 'TAC', 'MEN', 'FIS'] as const) for (const x of depois.detalhe![g]) if (x.valor !== ant[x.campo]) ganhos.push({ campo: x.campo, antes: ant[x.campo], depois: x.valor });
  return { p, antes, depois, ganhos, kick: somaKick / jogos, minFit, minEnergia, abaixo70, abaixo70Energy, jogos, vazios, usados };
};

L('=== 3. UMA TEMPORADA DE TREINO (38 semanas, jogo no sabado, sem treino no domingo) ===');
for (const [nome, plano] of Object.entries(CALENDARIOS)) {
  L(`--- ${nome}: ${plano.flat().filter(Boolean).length} periodos de treino por semana`);
  for (const idade of [19, 26, 34]) {
    const r = simular(plano, idade);
    const g = (k: 'tec' | 'tac' | 'men' | 'fis') => `${r.antes[k]}->${r.depois[k]}`;
    L(`  idade ${r.p.age}: TEC ${g('tec')}  TAC ${g('tac')}  MEN ${g('men')}  FIS ${g('fis')} | fitness no jogo ${r.kick.toFixed(0)} (min ${r.minFit.toFixed(0)}, ${r.abaixo70}/${r.jogos} jogos abaixo de 70) | energia (min ${r.minEnergia.toFixed(0)}, ${r.abaixo70Energy}/${r.jogos} jogos abaixo de 70) | atributos que subiram: ${r.ganhos.length}`);
  }
}
L();
L('=== 4. DETALHE: calendario Misto, jogador de 19 anos ===');
{
  const r = simular(CALENDARIOS['Misto (todas as abas)'], 19);
  for (const x of r.ganhos.sort((a, b) => (b.depois - b.antes) - (a.depois - a.antes))) L(`  ${(NOME_DO_CAMPO[x.campo] || x.campo).padEnd(24)} ${x.antes} -> ${x.depois}  (+${x.depois - x.antes})`);
  const sem = todos.filter(c => !r.ganhos.some(x => x.campo === c));
  L('  Sem ganho na temporada: ' + (sem.map(c => NOME_DO_CAMPO[c] || c).join(', ') || '-'));
}
