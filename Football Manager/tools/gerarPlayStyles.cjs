/*
Gera textSim/playStylesDatabase.ts a partir da base do 3D (3dMatch/simulador3d/data/squads.js, campo `estilo` de cada jogador): o PlayStyle que o
Overview do jogador mostra tem de ser o da base, e nao um calculado a partir dos numeros. Correr de novo sempre que o squads.js for regenerado:
    node tools/gerarPlayStyles.cjs
*/
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
const D = new Function(fs.readFileSync(path.join(raiz, '3dMatch/simulador3d/data/squads.js'), 'utf8') + ';return SquadsData')();
const NOME = {
  fox_in_the_box: 'Fox in the Box', cross_specialist: 'Cross Specialist', fullback_finisher: 'Full-back Finisher', build_up: 'Build Up',
  offensive_fullback: 'Offensive Full-back', roaming_flank: 'Roaming Flank', orchestrator: 'Orchestrator', hole_player: 'Hole Player',
  the_destroyer: 'The Destroyer', prolific_winger: 'Prolific Winger', extra_frontman: 'Extra Frontman', box_to_box: 'Box-to-Box',
  anchor_man: 'Anchor Man', dummy_runner: 'Dummy Runner', defensive_gk: 'Defensive Goalkeeper', offensive_gk: 'Offensive Goalkeeper',
  creative_playmaker: 'Creative Playmaker', goal_poacher: 'Goal Poacher', target_man: 'Target Man', defensive_fullback: 'Defensive Full-back',
  classic_no10: 'Classic No. 10'
};
const linhas = [];
const vistos = new Set();   // ids repetidos: vale o primeiro
let n = 0, semNome = new Set();
for (const e of D.equipas) for (const p of e.plantel) {
  if (!p.estilo) continue;
  const nome = NOME[p.estilo];
  if (!nome) { semNome.add(p.estilo); continue; }
  const chave = 'p-' + p.id;   // o id do jogador no manager (dataGenerator: `p-${idPlayer}`) e o mesmo do squads.js
  if (vistos.has(chave)) continue;
  vistos.add(chave);
  linhas.push('  ' + JSON.stringify(chave) + ': ' + JSON.stringify(nome) + ',');
  n++;
}
const out = `// GERADO por tools/gerarPlayStyles.cjs a partir de 3dMatch/simulador3d/data/squads.js — nao editar a mao.
import { PlayStyle } from '../types';

// Chave: o id do jogador no manager ("p-<idPlayer>").
export const PLAYSTYLE_DA_BASE: Record<string, PlayStyle> = {
${linhas.join('\n')}
};
`;
fs.writeFileSync(path.join(raiz, 'textSim/playStylesDatabase.ts'), out, 'utf8');
console.log('jogadores com estilo:', n, semNome.size ? '| estilos sem nome: ' + [...semNome].join(',') : '');
