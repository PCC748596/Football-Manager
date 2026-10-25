/*
PREMIACAO DAS COMPETICOES: o dinheiro que a organizacao paga ao clube do utilizador (os outros clubes usam o modelo rapido e nao tem contabilidade).

TODOS OS VALORES ESTAO EM textSim/premiacoes.json (configuravel: edite o ficheiro; o `_leia-me` la dentro explica cada campo). Este modulo so aplica as regras:
  . copas: a cota dos grupos no 1.o jogo, cada vitoria / empate, a entrada em certas fases (1.o jogo da fase), cada fase de mata-mata quando o clube acaba os jogos dela, e a final
    (vice ou campeao, no lugar do valor da final);
  . ligas: uma vez, quando a liga acaba, pela posicao final (lista `porPosicao` ou `primeiro`/`ultimo` com interpolacao linear), e a `cotaInicio` no 1.o jogo da liga.
O jogo guarda o dinheiro em dolares: os valores em BRL / EUR / GBP convertem-se pelas taxas de Settings (textSim/cambio.ts). Cada pagamento tem uma chave (`premio|<copa ou liga>|<razao>`): vai
nas `keys` do e-mail do inbox, que e o que impede de pagar duas vezes.
*/
import type { Competition, CompMatch } from './competitions';
import { paraDolares, type MoedaCambio } from './cambio';
import CONFIG from './premiacoes.json';

type Moeda = MoedaCambio | 'USD';
interface TabelaCopa { nome: string; moeda: Moeda; cota?: number; vitoria?: number; empate?: number; entrada?: Record<string, number>; fases?: Record<string, number>; vice?: number; campeao?: number }
interface TabelaLiga { nome: string; moeda: Moeda; porPosicao?: number[]; primeiro?: number; ultimo?: number; clubes?: number; cotaInicio?: number }

const COPAS = CONFIG.copas as unknown as Record<string, TabelaCopa>;
const LIGAS = CONFIG.ligas as unknown as Record<string, TabelaLiga>;

/** Premio a pagar. `copa` e o id da copa ou da liga (a chave de `NOME_DA_COPA`). */
export interface Premio { key: string; usd: number; razao: string; copa: string; data: string; }

/** Nome de cada copa / liga (do JSON), para o e-mail. */
export const NOME_DA_COPA: Record<string, string> = {};
Object.entries(COPAS).forEach(([id, t]) => { NOME_DA_COPA[id] = t.nome; });
Object.entries(LIGAS).forEach(([id, t]) => { NOME_DA_COPA[id] = t.nome; });

/** O valor da posicao `pos` (1 = campeao) de uma liga, na moeda dela; 0 se a liga nao paga por posicao. */
export const valorDaPosicao = (t: TabelaLiga, pos: number): number => {
  if (t.porPosicao) return t.porPosicao[pos - 1] || 0;
  if (t.primeiro === undefined || t.ultimo === undefined) return 0;
  const n = Math.max(2, t.clubes || 20);
  if (pos < 1 || pos > n) return 0;
  return Math.round(t.primeiro + (t.ultimo - t.primeiro) * (pos - 1) / (n - 1));
};

/** O premio de fim de liga do clube que acabou em `posicao` (null se a liga nao paga, ou se ja foi pago). */
export const premioDaLiga = (leagueId: string, posicao: number, data: string, pagos: Set<string>): Premio | null => {
  const t = LIGAS[leagueId];
  if (!t) return null;
  const valor = valorDaPosicao(t, posicao);
  const key = `premio|${leagueId}|liga`;
  if (!valor || pagos.has(key)) return null;
  return { key, usd: Math.round(paraDolares(valor, t.moeda)), razao: 'pos-' + posicao, copa: leagueId, data };
};

/** A cota da 1.a fase (Series C e D): paga quando o clube do utilizador joga o 1.o jogo da liga (que, nestas series, e a liga do jogo e nao uma copa). */
export const premioDeInicioDeLiga = (leagueId: string, data: string, pagos: Set<string>): Premio | null => {
  const t = LIGAS[leagueId], key = `premio|${leagueId}|cota`;
  if (!t || !t.cotaInicio || pagos.has(key)) return null;
  return { key, usd: Math.round(paraDolares(t.cotaInicio, t.moeda)), razao: 'cota', copa: leagueId, data };
};

/** Os premios das copas que o clube `userKey` ja ganhou e ainda nao estao em `pagos` (as chaves `premio|...` ja registadas). */
export const premiosPendentes = (comps: Competition[], userKey: string, pagos: Set<string>): Premio[] => {
  const out: Premio[] = [];
  for (const c of comps) {
    const t = COPAS[c.id];
    if (!t) continue;
    const meus: CompMatch[] = c.matches.filter(m => m.homeKey === userKey || m.awayKey === userKey);
    if (!meus.length) continue;
    const novo = (razao: string, valor: number | undefined, data: string) => {
      const key = `premio|${c.id}|${razao}`;
      if (valor && valor > 0 && !pagos.has(key)) out.push({ key, usd: Math.round(paraDolares(valor, t.moeda)), razao, copa: c.id, data });
    };
    const ultimaData = (ms: CompMatch[]) => ms.reduce((d, m) => (m.date > d ? m.date : d), '0000-00-00');
    // Grupos: a cota no primeiro jogo jogado, e cada vitoria / empate.
    const grupos = meus.filter(m => m.group && m.played).sort((a, b) => a.date.localeCompare(b.date));
    if (t.cota && grupos.length) novo('cota', t.cota, grupos[0].date);
    if (t.vitoria || t.empate) grupos.forEach(m => {
      const meu = m.homeKey === userKey ? m.homeScore || 0 : m.awayScore || 0, deles = m.homeKey === userKey ? m.awayScore || 0 : m.homeScore || 0;
      if (meu > deles) novo('vitoria-' + m.id, t.vitoria, m.date);
      else if (meu === deles) novo('empate-' + m.id, t.empate, m.date);
    });
    // Fases pagas na ENTRADA (primeiro jogo jogado da fase).
    for (const [fase, valor] of Object.entries(t.entrada || {})) {
      const js = meus.filter(m => m.stage === fase && m.played).sort((a, b) => a.date.localeCompare(b.date));
      if (js.length) novo('entrada-' + fase, valor, js[0].date);
    }
    // Fases de mata-mata: paga quando o utilizador acaba os jogos dela.
    for (const [fase, valor] of Object.entries(t.fases || {})) {
      const js = meus.filter(m => m.stage === fase);
      if (js.length && js.every(m => m.played)) novo(fase, valor, ultimaData(js));
    }
    // Final: o campeao ou o vice.
    const final = meus.filter(m => m.stage === 'F');
    if (final.length && final.every(m => m.played) && c.champion) novo(c.champion === userKey ? 'campeao' : 'vice', c.champion === userKey ? t.campeao : t.vice, ultimaData(final));
  }
  return out;
};
