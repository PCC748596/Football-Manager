/*
CONFERE A LISTA DE TRADICAO (textSim/tradicaoClubes.json) com a base: imprime os clubes da base SEM entrada na lista e as entradas da lista que nenhum clube da base usa.
Corre com:   npx tsx tools/validar_tradicao.ts      (os "sem entrada" usam a torcida e a idade; ajuste os nomes no json ou o ALIAS em textSim/tradicao.ts)
*/
import { REAL_TEAMS_JSON } from '../textSim/realDatabase';
import tradicao from '../textSim/tradicaoClubes.json';
import { acharEntrada } from '../textSim/tradicao';

const usadas = new Set<string>();
const semEntrada: string[] = [];
for (const t of REAL_TEAMS_JSON) {
  const e = acharEntrada(t.teamName);
  if (e) usadas.add(e.clube); else semEntrada.push(t.teamName);
}
const naoUsadas = Object.values(tradicao as unknown as Record<string, { clube: string }[]>).flat().map(e => e.clube).filter(c => !usadas.has(c));
console.log(`Clubes da base sem entrada (${semEntrada.length}):\n  ` + semEntrada.join('\n  '));
console.log(`\nEntradas da lista que nenhum clube da base usa (${naoUsadas.length}):\n  ` + naoUsadas.join('\n  '));
