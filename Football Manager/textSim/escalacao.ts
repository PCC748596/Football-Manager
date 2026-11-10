/*
ESCALACAO COMPLETA. O onze do utilizador so pode ir a jogo (3D, jogo rapido, simular a rodada) com os 11 slots da formacao preenchidos por jogadores do proprio time. Um slot vazio — um titular
arrastado para o banco sem ninguem no lugar, uma venda, o fim de um contrato — deixava o motor 3D falhar ("escalacao: jogador nao encontrado no slot N") e o jogo preso no campo.
*/
import { Team, Player, FORMATIONS, getEffectiveSkill } from '../types';
import { estaSuspenso } from './suspensoes';

/** O jogo do utilizador ja comecou (relogio do manager ou motor 3D em andamento): a partir dai a escalacao nao e mais conferida. */
export const jogoEmAndamento = (matchMinute: number): boolean => matchMinute > 0 || typeof (globalThis as any).motor3dMinuto === 'number';

/**
 * Os indices dos slots da formacao sem jogador valido do proprio time (lista vazia = escalacao completa).
 * `emJogo`: com o jogo em andamento nao ha "escalacao incompleta" — um expulso sai do onze e o time joga com menos um; so antes do apito inicial o onze tem de estar completo.
 */
export const slotsVazios = (team: Team | undefined, players: Player[], emJogo = false): number[] => {
  if (!team || emJogo) return [];
  const slots = FORMATIONS[team.tactics?.formation as keyof typeof FORMATIONS] || FORMATIONS['4-4-2'];
  const ids = new Set(players.filter(p => p.teamId === team.id).map(p => p.id));
  const vazios: number[] = [];
  for (let i = 0; i < slots.length; i++) {
    const id = team.lineup?.[i];
    if (!id || !ids.has(id)) vazios.push(i);
  }
  return vazios;
};


/*
A ESCALACAO DA CPU, TODO DIA. No fim de cada dia os titulares e o banco de cada time da CPU ficam completos e validos: ninguem lesionado, suspenso (na competicao do proximo jogo), de outro
clube ou ausente (venda, fim de contrato) — para a CPU escolher bem depois de expulsoes e lesoes. O time do utilizador fica de fora: ele pode ser escalado ate antes do jogo.
O lugar vago vai para o melhor disponivel da mesma posicao, senao do mesmo setor (goleiro, defesa, meio, ataque), senao o de maior nota; o banco volta a ter `tamanhoDoBanco`.
*/
const SETOR_DA_POSICAO: Record<string, string> = { GK: 'GK', CB: 'DEF', LB: 'DEF', RB: 'DEF', LWB: 'DEF', RWB: 'DEF', DM: 'MID', CM: 'MID', LM: 'MID', RM: 'MID', AM: 'MID', LW: 'ATK', RW: 'ATK', CF: 'ATK', ST: 'ATK', SS: 'ATK' };
export const TAMANHO_DO_BANCO = 10;

/**
 * Atribuicao de custo minimo (algoritmo hungaro, retangular: linhas <= colunas). `custo[i][j]`; devolve, por linha, a coluna escolhida.
 */
const atribuicaoMinima = (custo: number[][]): number[] => {
  const n = custo.length, m = custo[0]?.length || 0;
  const INF = 1e12;
  const u = new Array(n + 1).fill(0), v = new Array(m + 1).fill(0), p = new Array(m + 1).fill(0), way = new Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i; let j0 = 0;
    const minv = new Array(m + 1).fill(INF), usado = new Array(m + 1).fill(false);
    do {
      usado[j0] = true;
      const i0 = p[j0]; let delta = INF, j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (usado[j]) continue;
        const cur = custo[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= m; j++) { if (usado[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta; }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const res = new Array(n).fill(-1);
  for (let j = 1; j <= m; j++) if (p[j]) res[p[j] - 1] = j - 1;
  return res;
};

/*
O TECNICO DA CPU ESCALA PELA POSICAO: o onze sai de uma atribuicao otima dos jogadores disponiveis aos slots da formacao, maximizando a soma da habilidade EFECTIVA de cada um no slot (`getEffectiveSkill`: um
jogador fora da posicao perde pontos por distancia). Assim um AM nao fica no lugar do volante nem um CM no do meia atacante se ha troca melhor; e um zagueiro de nota alta so joga de lateral se,
mesmo penalizado, ainda for melhor que o lateral. Quem ja esta no slot ganha +1 de desempate, para o onze nao mudar todo dia sem motivo.
*/
export const completarEscalacaoCpu = (team: Team, plantel: Player[], chave: string | null): { lineup: string[]; bench: string[]; mudou: boolean } => {
  const slots = FORMATIONS[team.tactics?.formation as keyof typeof FORMATIONS] || FORMATIONS['4-4-2'];
  const doClube = plantel.filter(p => p.teamId === team.id);
  const por = new Map(doClube.map(p => [p.id, p]));
  const disponivel = (p: Player | undefined): p is Player => !!p && !p.injury && !estaSuspenso(p, chave);
  const pool = doClube.filter(disponivel);
  const lineup: string[] = new Array(slots.length).fill('');
  const usados = new Set<string>();
  if (pool.length >= slots.length) {
    const custo = slots.map((sl, i) => pool.map(p => {
      const gkSlot = sl.label === 'GK', gkP = p.position === 'GK';
      if (gkSlot !== gkP) return 1e6;   // goleiro so no gol, e jogador de linha nunca no gol
      return -(getEffectiveSkill(p, sl.label) + (team.lineup?.[i] === p.id ? 1 : 0));
    }));
    const col = atribuicaoMinima(custo);
    col.forEach((j, i) => { if (j >= 0 && custo[i][j] < 1e5) { lineup[i] = pool[j].id; usados.add(pool[j].id); } });
  }
  // Slots que a atribuicao nao preencheu (plantel curto): o melhor que sobrar.
  slots.forEach((sl, i) => {
    if (lineup[i]) return;
    const cand = pool.filter(p => !usados.has(p.id) && ((sl.label === 'GK') === (p.position === 'GK'))).sort((a, b) => getEffectiveSkill(b, sl.label) - getEffectiveSkill(a, sl.label))[0]
      || pool.filter(p => !usados.has(p.id)).sort((a, b) => b.skill - a.skill)[0];
    if (cand) { lineup[i] = cand.id; usados.add(cand.id); }
  });
  // O banco: quem ja la esta e continua valido, depois um goleiro (se faltar) e os de maior nota.
  const bench = (team.bench || []).filter(id => { const p = id ? por.get(id) : undefined; return disponivel(p) && !usados.has(id); });
  const livres = () => pool.filter(p => !usados.has(p.id) && !bench.includes(p.id));
  if (!bench.some(id => por.get(id)?.position === 'GK')) { const g = livres().filter(p => p.position === 'GK').sort((a, b) => b.skill - a.skill)[0]; if (g && bench.length < TAMANHO_DO_BANCO) bench.push(g.id); }
  for (const p of livres().sort((a, b) => b.skill - a.skill)) { if (bench.length >= TAMANHO_DO_BANCO) break; bench.push(p.id); }
  const igual = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
  return { lineup, bench, mudou: !igual(lineup, team.lineup || []) || !igual(bench, team.bench || []) };
};
