import { Fixture } from '../types';
import type { Competition } from './competitions';

/*
O ESPACO ENTRE OS JOGOS DE CADA CLUBE. Pedido: nenhum time joga com menos de 2 DIAS LIVRES entre dois jogos (jogo no dia 24 e outro no 26 era bug). Isto e, a diferenca entre as datas
de dois jogos seguidos do mesmo clube tem de ser de pelo menos `ESPACO_MINIMO_DIAS` (3). Quando nao e, adianta-se ou atrasa-se UM dos dois jogos o minimo de dias que resolve (so jogos
ainda por jogar e depois de hoje); copa e amistoso mexem antes da liga. Corre sobre o calendario inteiro, ao criar o jogo e sempre que o calendario muda — tambem depois de carregar um save.
*/
export const ESPACO_MINIMO_DIAS = 3;
const MAX_DESLOCAMENTO = 7;

const diaN = (d: string): number => Math.round(new Date(d + 'T00:00:00Z').getTime() / 86400000);
const somarDias = (d: string, n: number): string => new Date((diaN(d) + n) * 86400000).toISOString().slice(0, 10);

export interface MudancaDeData { id: string; de: string; para: string }

/**
 * Devolve o calendario com o espacamento corrigido. Se nao ha nada a corrigir devolve O MESMO array (a referencia nao muda, o que evita ciclos de atualizacao).
 * `hoje`: os jogos de hoje ou do passado nao se mexem.
 */
export const espacarCalendario = (fixtures: Fixture[], hoje: string, minimo: number = ESPACO_MINIMO_DIAS): { fixtures: Fixture[]; mudancas: MudancaDeData[] } => {
  const datas = fixtures.map(f => f.date);
  const porClube = new Map<string, number[]>();
  fixtures.forEach((f, i) => { [f.homeTeamId, f.awayTeamId].forEach(id => { if (!porClube.has(id)) porClube.set(id, []); porClube.get(id)!.push(i); }); });
  const movel = (i: number) => !fixtures[i].played && datas[i] > hoje;
  // Copa e amistoso mexem antes da liga: a liga e a espinha do calendario.
  const rigidez = (i: number) => (fixtures[i].type === 'LEAGUE' || (!fixtures[i].type && !fixtures[i].isFriendly) ? 1 : 0);

  const cabe = (i: number, nova: string): boolean => {
    const n = diaN(nova);
    for (const id of [fixtures[i].homeTeamId, fixtures[i].awayTeamId]) {
      for (const j of porClube.get(id) || []) { if (j !== i && Math.abs(diaN(datas[j]) - n) < minimo) return false; }
    }
    return true;
  };
  const mover = (i: number): boolean => {
    for (let k = 1; k <= MAX_DESLOCAMENTO; k++) {
      for (const s of [k, -k]) {
        const nova = somarDias(datas[i], s);
        if (nova <= hoje) continue;
        if (cabe(i, nova)) { datas[i] = nova; return true; }
      }
    }
    return false;
  };

  for (let volta = 0; volta < 40; volta++) {
    let mexeu = false;
    for (const idx of porClube.values()) {
      const l = idx.slice().sort((a, b) => datas[a].localeCompare(datas[b]));
      for (let k = 1; k < l.length; k++) {
        const a = l[k - 1], b = l[k];
        if (diaN(datas[b]) - diaN(datas[a]) >= minimo) continue;
        // Quem mexe: o mais flexivel (copa/amistoso); entre iguais, o que vem depois.
        const ordem = [a, b].filter(movel).sort((x, y) => rigidez(x) - rigidez(y) || (x === b ? -1 : 1));
        for (const i of ordem) { if (mover(i)) { mexeu = true; break; } }
        if (mexeu) break;
      }
      if (mexeu) break;
    }
    if (!mexeu) break;
  }

  const mudancas: MudancaDeData[] = [];
  datas.forEach((d, i) => { if (d !== fixtures[i].date) mudancas.push({ id: fixtures[i].id, de: fixtures[i].date, para: d }); });
  if (!mudancas.length) return { fixtures, mudancas };
  return { fixtures: fixtures.map((f, i) => (datas[i] !== f.date ? { ...f, date: datas[i] } : f)), mudancas };
};

/** As datas novas dos jogos de copa do utilizador passam tambem para a competicao (`fix-cup-<id do jogo>`), para as duas contas nao divergirem. Sem mudancas devolve o mesmo array. */
export const comDatasDeCopa = (comps: Competition[] | null, mudancas: MudancaDeData[]): Competition[] | null => {
  if (!comps || !mudancas.length) return comps;
  const mapa = new Map(mudancas.map(m => [m.id, m.para]));
  let mudou = false;
  const novas = comps.map(c => {
    let cm = false;
    const matches = c.matches.map(m => { const d = mapa.get('fix-cup-' + m.id); if (d && d !== m.date) { cm = true; return { ...m, date: d }; } return m; });
    if (cm) { mudou = true; return { ...c, matches }; }
    return c;
  });
  return mudou ? novas : comps;
};
