/*
PREMIACAO DAS COPAS: o dinheiro que a organizacao paga ao clube do utilizador por disputar cada fase (os outros clubes usam o modelo rapido e nao tem contabilidade).

Valores reais (pagos ao clube que DISPUTA a fase; o do vice e o do campeao substituem o da final):
  Libertadores 2026 (US$)   grupos: 1 milhao (cota fixa) + 340 mil por vitoria; oitavas 1,25 mi; quartas 1,7 mi; semi 2,3 mi; vice 7 mi; campeao 25 mi.
  Sul-Americana (US$)       grupos: 300 mil + 125 mil por vitoria; oitavas 600 mil; quartas 700 mil; semi 800 mil; vice 2,5 mi; campeao 10 mi.
                            (a "previa das oitavas", 500 mil, nao existe no formato do jogo: os 2 primeiros de cada grupo vao direto as oitavas)
  Copa do Brasil (R$)       5.a fase 2 mi; oitavas 3 mi; quartas 4 mi; semi 9 mi; vice 34 mi; campeao 78 mi.
O jogo guarda o dinheiro em dolares (5 reais por dolar, como em `formatCurrency`). Uma fase paga-se quando o utilizador acaba os jogos dela (ida e volta incluidos); a cota fixa dos grupos, no
primeiro jogo de grupos que ele joga; cada vitoria, no dia do jogo. Cada pagamento tem uma chave (`premio|<copa>|<razao>`): vai nas `keys` do e-mail do inbox, que e o que impede de pagar duas vezes.
*/
import type { Competition, CompMatch } from './competitions';
import { TAXAS, paraDolares } from './cambio';

export interface Premio { key: string; usd: number; razao: string; copa: Competition['id']; data: string; }

type Tabela = { cota?: number; vitoria?: number; fases: Record<string, number>; vice: number; campeao: number; moeda: 'USD' | 'BRL' };
const TABELAS: Partial<Record<Competition['id'], Tabela>> = {
  LIB: { moeda: 'USD', cota: 1_000_000, vitoria: 340_000, fases: { R16: 1_250_000, QF: 1_700_000, SF: 2_300_000 }, vice: 7_000_000, campeao: 25_000_000 },
  SUL: { moeda: 'USD', cota: 300_000, vitoria: 125_000, fases: { R16: 600_000, QF: 700_000, SF: 800_000 }, vice: 2_500_000, campeao: 10_000_000 },
  COPA_BR: { moeda: 'BRL', fases: { P5: 2_000_000, R16: 3_000_000, QF: 4_000_000, SF: 9_000_000 }, vice: 34_000_000, campeao: 78_000_000 }
};
/*
Campeonato Brasileiro Serie A (R$, pago pela posicao final; o jogo guarda dolares a 5 por real): 1.o 48,1 mi, 2.o 45,7, 3.o 43,4, 4.o 40,9, 5.o 38,5, 6.o 36,1, 7.o 33,7, 8.o 31,3, 9.o 28,8,
10.o 26,4, 11.o 20,7, 12.o 19,2, 13.o 17,8, 14.o 17,3, 15.o 16,8, 16.o 16,3. As posicoes 17 a 20 nao tinham valor na tabela: nao recebem nada (acrescente em PREMIO_BRASILEIRAO).
Paga-se quando a liga acaba (todos os jogos jogados), uma vez (chave `premio|bra_serie_a|liga`).
*/
/*
Serie B (R$): campeao 3,5 mi; 2.o, 3.o e 4.o (os demais clubes com acesso) 1,35 mi cada. Os outros clubes nao recebem. Mesma regra: paga-se quando a liga acaba.
*/
export const PREMIO_SERIE_B: number[] = [3.5, 1.35, 1.35, 1.35].map(v => v * 1_000_000);
/*
Premier League (libras, pago pela posicao final e NAO pelo clube): 1.o 75,2 mi, 2.o 71,44, 3.o 67,68, 4.o 63,92, 5.o 60,16, 6.o 56,4, 7.o 52,64, 8.o 48,88, 9.o 45,12, 10.o 41,36, 11.o 37,6,
12.o 33,84, 13.o 30,08, 14.o 26,32, 15.o 22,56, 16.o 18,8, 17.o 15,04, 18.o 11,28, 19.o 7,52, 20.o 3,76. Convertida em dolares pela taxa GBP de textSim/cambio.ts.
*/
export const PREMIO_PREMIER: number[] = [75.2, 71.44, 67.68, 63.92, 60.16, 56.4, 52.64, 48.88, 45.12, 41.36, 37.6, 33.84, 30.08, 26.32, 22.56, 18.8, 15.04, 11.28, 7.52, 3.76].map(v => v * 1_000_000);
export const PREMIO_BRASILEIRAO: number[] = [48.1, 45.7, 43.4, 40.9, 38.5, 36.1, 33.7, 31.3, 28.8, 26.4, 20.7, 19.2, 17.8, 17.3, 16.8, 16.3].map(v => v * 1_000_000);
export const premioDaLiga = (leagueId: string, posicao: number, data: string, pagos: Set<string>): Premio | null => {
  const tabela = leagueId === 'bra_serie_a' ? PREMIO_BRASILEIRAO : leagueId === 'bra_serie_b' ? PREMIO_SERIE_B : leagueId === 'eng_prem' ? PREMIO_PREMIER : null;
  if (!tabela) return null;
  const valor = tabela[posicao - 1];
  const key = `premio|${leagueId}|liga`;
  if (!valor || pagos.has(key)) return null;
  return { key, usd: Math.round(paraDolares(valor, leagueId === 'eng_prem' ? 'GBP' : 'BRL')), razao: 'pos-' + posicao, copa: (leagueId === 'bra_serie_b' ? 'SERIE_B' : leagueId === 'eng_prem' ? 'PREMIER' : 'SERIE_A') as any, data };
};

export const NOME_DA_COPA: Record<string, string> = { SERIE_A: 'Campeonato Brasileiro Série A', SERIE_B: 'Campeonato Brasileiro Série B', PREMIER: 'Premier League', LIB: 'Copa Libertadores', SUL: 'Copa Sul-Americana', COPA_BR: 'Copa do Brasil' };

const emDolares = (t: Tabela, v: number) => Math.round(paraDolares(v, t.moeda));

/** Os premios que o clube `userKey` ja ganhou e ainda nao estao em `pagos` (as chaves de `premio|...` ja registadas). */
export const premiosPendentes = (comps: Competition[], userKey: string, pagos: Set<string>): Premio[] => {
  const out: Premio[] = [];
  for (const c of comps) {
    const t = TABELAS[c.id];
    if (!t) continue;
    const meus: CompMatch[] = c.matches.filter(m => m.homeKey === userKey || m.awayKey === userKey);
    if (!meus.length) continue;
    const novo = (razao: string, valor: number, data: string) => {
      const key = `premio|${c.id}|${razao}`;
      if (!pagos.has(key) && valor > 0) out.push({ key, usd: emDolares(t, valor), razao, copa: c.id, data });
    };
    const ultimaData = (ms: CompMatch[]) => ms.reduce((d, m) => (m.date > d ? m.date : d), '0000-00-00');
    // Grupos: a cota no primeiro jogo jogado, e cada vitoria.
    const grupos = meus.filter(m => m.group && m.played).sort((a, b) => a.date.localeCompare(b.date));
    if (t.cota && grupos.length) novo('cota', t.cota, grupos[0].date);
    if (t.vitoria) grupos.forEach(m => {
      const meu = m.homeKey === userKey ? m.homeScore || 0 : m.awayScore || 0, deles = m.homeKey === userKey ? m.awayScore || 0 : m.homeScore || 0;
      if (meu > deles) novo('vitoria-' + m.id, t.vitoria!, m.date);
    });
    // Fases de mata-mata: paga quando o utilizador acaba os jogos dela.
    for (const [fase, valor] of Object.entries(t.fases)) {
      const js = meus.filter(m => m.stage === fase);
      if (js.length && js.every(m => m.played)) novo(fase, valor, ultimaData(js));
    }
    // Final: o campeao ou o vice.
    const final = meus.filter(m => m.stage === 'F');
    if (final.length && final.every(m => m.played) && c.champion) novo(c.champion === userKey ? 'campeao' : 'vice', c.champion === userKey ? t.campeao : t.vice, ultimaData(final));
  }
  return out;
};
