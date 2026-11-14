/*
OS NOMES E OS LOGOS DAS COMPETICOES. O jogo traz nomes GENERICOS (copas, divisoes e prefixos das fases); os nomes reais e os logos vem do mod `public/dados_reais/competicoes.json` (textSim/modDados.ts), que
substitui os genericos ao arrancar. Sem o mod (o pacote da Steam) ficam os nomes genericos e os logos genericos (uma taca em SVG com a sigla).

    dados_reais/competicoes.json   [{ id, nome, nomeCurto, prefixo, logo }]    id = o id da copa (LIB, SUL, COPA_BR, CARABAO, FA_CUP, PAULISTA, CARIOCA, MINEIRO, GAUCHO, CATARINENSE, PARANAENSE, UCL, UEL, UECL, SERIE_C, SERIE_D) ou da liga (bra_serie_a, eng_prem...)
    dados_reais/competicoes/<ficheiro> os logos  (`logo` = o nome do ficheiro)

`nome` e o nome completo; `nomeCurto` o das listas e etiquetas ("Champions League" em vez de "UEFA Champions League"); `prefixo` o das fases ("EFL-R1", "CUP - 1"). Campos em falta ficam como nos genericos.
*/

export interface InfoCompeticao { nome?: string; nomeCurto?: string; prefixo?: string; logo?: string }

const GENERICOS: Record<string, { nome: string; curto: string; prefixo: string }> = {
  LIB: { nome: 'Southern Champions Cup', curto: 'Southern Champions Cup', prefixo: 'SCC' },
  SUL: { nome: 'Southern Challenge Cup', curto: 'Southern Challenge Cup', prefixo: 'SCH' },
  COPA_BR: { nome: 'National Cup', curto: 'National Cup', prefixo: 'CUP' },
  CARABAO: { nome: 'League Cup', curto: 'League Cup', prefixo: 'LC' },
  FA_CUP: { nome: 'Association Cup', curto: 'Association Cup', prefixo: 'AC' },
  PAULISTA: { nome: 'State Championship', curto: 'State Championship', prefixo: 'STA' },
  CARIOCA: { nome: 'State Championship (RJ)', curto: 'State Championship RJ', prefixo: 'RJ' },
  MINEIRO: { nome: 'State Championship (MG)', curto: 'State Championship MG', prefixo: 'MG' },
  GAUCHO: { nome: 'State Championship (RS)', curto: 'State Championship RS', prefixo: 'RS' },
  CATARINENSE: { nome: 'State Championship (SC)', curto: 'State Championship SC', prefixo: 'SC' },
  PARANAENSE: { nome: 'State Championship (PR)', curto: 'State Championship PR', prefixo: 'PR' },
  UCL: { nome: 'European Champions League', curto: 'Champions League', prefixo: 'ECL' },
  UEL: { nome: 'European Continental League', curto: 'Continental League', prefixo: 'CTL' },
  UECL: { nome: 'European Conference Cup', curto: 'Conference Cup', prefixo: 'ECC' },
  SERIE_C: { nome: 'Third Division', curto: 'Third Division', prefixo: 'C' },
  SERIE_D: { nome: 'Fourth Division', curto: 'Fourth Division', prefixo: 'D' }
};

const mod: Record<string, InfoCompeticao> = {};

/** Regista os dados do mod (substitui os campos que vierem preenchidos). */
export const registarCompeticoes = (lista: Array<InfoCompeticao & { id: string }>): number => {
  let n = 0;
  for (const c of lista || []) { if (!c || !c.id) continue; mod[String(c.id)] = { ...mod[String(c.id)], ...c }; n++; }
  return n;
};

/** O nome da competicao: o do mod, ou o generico. `curto` pede o nome das listas. */
export const nomeComp = (id: string, curto = false): string => {
  const m = mod[id];
  if (m) { const v = curto ? (m.nomeCurto || m.nome) : m.nome; if (v) return v; }
  const g = GENERICOS[id];
  return g ? (curto ? g.curto : g.nome) : id;
};

/** O prefixo das fases ("CUP" em "CUP - 1"). */
export const prefixoComp = (id: string): string => mod[id]?.prefixo || GENERICOS[id]?.prefixo || id;

// De onde vem os logos: a pasta escolhida (api/mod/..?pasta=) ou a pasta `dados_reais` junto do jogo; ver textSim/modDados.ts.
let baseDosLogos = { base: 'dados_reais/', sufixo: '' };
export const definirBaseDosLogos = (base: string, sufixo = ''): void => { baseDosLogos = { base, sufixo }; };

// Os logos GENERICOS (sem o mod): uma taca desenhada em SVG, com a cor e a sigla (o prefixo) de cada copa. Nao ha marca de ninguem nestes desenhos.
const COR_GENERICA: Record<string, string> = { LIB: '#b8860b', SUL: '#2f7d4f', COPA_BR: '#1f6fb2', CARABAO: '#c2410c', FA_CUP: '#b91c1c', CARIOCA: '#0369a1', MINEIRO: '#334155', GAUCHO: '#15803d', CATARINENSE: '#166534', PARANAENSE: '#1e40af', PAULISTA: '#7c3aed', UCL: '#1e3a8a', UEL: '#ea580c', UECL: '#0f766e', SERIE_C: '#475569', SERIE_D: '#64748b' };
const logoGenerico = (id: string): string => {
  const cor = COR_GENERICA[id];
  if (!cor) return '';
  const sigla = (GENERICOS[id]?.prefixo || id).slice(0, 4);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M28 14h44v26c0 16-10 26-22 26S28 56 28 40z" fill="${cor}"/><path d="M28 22H14c0 14 6 24 17 27M72 22h14c0 14-6 24-17 27" fill="none" stroke="${cor}" stroke-width="6" stroke-linecap="round"/><rect x="44" y="64" width="12" height="12" fill="${cor}"/><rect x="32" y="76" width="36" height="9" rx="2" fill="${cor}"/><text x="50" y="45" font-family="Arial,Helvetica,sans-serif" font-size="${sigla.length > 3 ? 13 : 16}" font-weight="900" text-anchor="middle" fill="#fff">${sigla}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
};

/** O endereco do logo (relativo a pagina, ou absoluto): o do mod, ou o logo generico (uma taca em SVG). */
export const logoComp = (id: string): string => (mod[id]?.logo ? `${baseDosLogos.base}competicoes/${mod[id].logo}${baseDosLogos.sufixo}` : logoGenerico(id));

/** O nome de uma LIGA (so o do mod; sem ele quem chama usa o da base). */
export const nomeDeLigaDoMod = (id: string): string | undefined => mod[id]?.nome;
