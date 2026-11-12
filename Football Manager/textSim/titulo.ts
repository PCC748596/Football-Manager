/*
O JOGO QUE DA O TITULO — pedido: *"Crie a comemoracao de campeao. Todos os jogadores juntos no centro do campo, pulando e levantando a taca."*

O 3D faz a festa de campeao depois do apito final quando o `iniciar` diz quem e campeao com este jogo (campo opcional `campeao`, ver
3dMatch/simulador3d/js/narracao/ponte.js e js/comemoracao_campeao.js). Aqui decide-se esse campo, antes do jogo:

  . COPA: o jogo que fecha a final (decisaoDoConfronto marca `titulo` no ultimo jogo da fase 'F') -> quem ganhar e campeao (o 3D conta o
    agregado e a disputa de penaltis);
  . LIGA (pontos corridos): o clube que, ganhando (ou empatando) hoje, ja nao pode ser alcancado por ninguem — mesmo que todos os outros
    ganhem todos os jogos que lhes faltam (os de hoje incluidos). Empate em pontos nao conta (o desempate nao se sabe antes). Quem ja era
    campeao antes do jogo nao festeja outra vez. As ligas com fase final (Serie C e Serie D: o campeao sai do mata-mata, que e uma copa)
    ficam de fora.
*/
import type { Team, Fixture } from '../types';
import { buildTable } from './world';
import type { DecisaoDoJogo } from './competitions';

export interface CampeaoDoJogo { seVencer?: 'casa' | 'fora' | 'qualquer'; seEmpatar?: 'casa' | 'fora' }

/** Ligas cujo campeao nao e o lider da tabela (sai de uma fase final). */
export const LIGAS_COM_FASE_FINAL = new Set(['bra_serie_c', 'bra_serie_d']);

const deLiga = (f: Fixture) => !f.isFriendly && (f.type === undefined || f.type === 'LEAGUE');

/** Na liga: quem fica campeao com este jogo, ou null. `teams`/`fixtures`: os do estado do jogo (a liga do utilizador). */
export const tituloDaLigaEmJogo = (teams: Team[], fixtures: Fixture[], jogo: Fixture): CampeaoDoJogo | null => {
  if (!jogo || jogo.played || !deLiga(jogo)) return null;
  const casa = teams.find(t => t.id === jogo.homeTeamId), fora = teams.find(t => t.id === jogo.awayTeamId);
  if (!casa || !fora || casa.leagueId !== fora.leagueId || LIGAS_COM_FASE_FINAL.has(casa.leagueId)) return null;
  const liga = teams.filter(t => t.leagueId === casa.leagueId && (t.groupId || '') === (casa.groupId || ''));
  if (liga.length < 2) return null;
  const ids = new Set(liga.map(t => t.id));
  const jogos = fixtures.filter(f => deLiga(f) && ids.has(f.homeTeamId) && ids.has(f.awayTeamId));
  const pts = new Map(buildTable(liga, jogos).map(r => [r.team.id, r.points] as [string, number]));
  const faltam = new Map<string, number>();
  for (const f of jogos) if (!f.played) { faltam.set(f.homeTeamId, (faltam.get(f.homeTeamId) || 0) + 1); faltam.set(f.awayTeamId, (faltam.get(f.awayTeamId) || 0) + 1); }
  const p = (id: string) => pts.get(id) || 0;
  // O maximo que `id` ainda pode fazer: os pontos de agora mais 3 por jogo que lhe falta.
  const teto = (id: string) => p(id) + 3 * (faltam.get(id) || 0);
  // `x` fica campeao se fizer `ganha` pontos hoje (3 ou 1) contra `o` (que faz 0 ou 1 hoje e ganha os outros todos)?
  const campeaoSe = (x: string, o: string, ganha: 3 | 1): boolean => {
    const outros = liga.filter(t => t.id !== x).map(t => t.id);
    if (outros.every(y => p(x) > teto(y))) return false;   // ja era campeao antes deste jogo
    return outros.every(y => p(x) + ganha > (y === o ? teto(o) - 3 + (ganha === 1 ? 1 : 0) : teto(y)));
  };
  const vC = campeaoSe(casa.id, fora.id, 3), vF = campeaoSe(fora.id, casa.id, 3);
  if (!vC && !vF) return null;
  const out: CampeaoDoJogo = { seVencer: vC && vF ? 'qualquer' : vC ? 'casa' : 'fora' };
  if (vC && campeaoSe(casa.id, fora.id, 1)) out.seEmpatar = 'casa';
  else if (vF && campeaoSe(fora.id, casa.id, 1)) out.seEmpatar = 'fora';
  return out;
};

/** O campo `campeao` do `iniciar` do 3D para este jogo (copa: a final; liga: o jogo que pode fechar o titulo), ou null. */
export const campeaoDoJogo = (decisao: DecisaoDoJogo | null | undefined, teams: Team[], fixtures: Fixture[], jogo: Fixture | undefined): CampeaoDoJogo | null => {
  if (decisao && decisao.titulo) return { seVencer: 'qualquer' };
  if (!jogo) return null;
  try { return tituloDaLigaEmJogo(teams, fixtures, jogo); } catch { return null; }
};
