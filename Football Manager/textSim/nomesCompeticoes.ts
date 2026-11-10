/*
OS NOMES E OS LOGOS DAS COMPETICOES. O jogo traz nomes GENERICOS (copas, divisoes e prefixos das fases); os nomes reais e os logos vem do mod `public/dados_reais/competicoes.json` (textSim/modDados.ts), que
substitui os genericos ao arrancar. Sem o mod (o pacote da Steam) ficam os genericos e as copas sem logo (o jogo mostra o quadrado em branco do WorldView).

    dados_reais/competicoes.json   [{ id, nome, nomeCurto, prefixo, logo }]    id = o id da copa (LIB, SUL, COPA_BR, CARABAO, PAULISTA, UCL, UEL, UECL, SERIE_C, SERIE_D) ou da liga (bra_serie_a, eng_prem...)
    dados_reais/competicoes/<ficheiro> os logos  (`logo` = o nome do ficheiro)

`nome` e o nome completo; `nomeCurto` o das listas e etiquetas ("Champions League" em vez de "UEFA Champions League"); `prefixo` o das fases ("EFL-R1", "CUP - 1"). Campos em falta ficam como nos genericos.
*/

export interface InfoCompeticao { nome?: string; nomeCurto?: string; prefixo?: string; logo?: string }

const GENERICOS: Record<string, { nome: string; curto: string; prefixo: string }> = {
  LIB: { nome: 'Copa dos Campeões do Sul', curto: 'Copa dos Campeões do Sul', prefixo: 'CCS' },
  SUL: { nome: 'Copa Desafio do Sul', curto: 'Copa Desafio do Sul', prefixo: 'CDS' },
  COPA_BR: { nome: 'Copa Nacional', curto: 'Copa Nacional', prefixo: 'CUP' },
  CARABAO: { nome: 'Copa da Liga', curto: 'Copa da Liga', prefixo: 'LC' },
  PAULISTA: { nome: 'Campeonato Estadual', curto: 'Campeonato Estadual', prefixo: 'EST' },
  UCL: { nome: 'Liga dos Campeões Europeus', curto: 'Liga dos Campeões', prefixo: 'LCE' },
  UEL: { nome: 'Liga Continental Europeia', curto: 'Liga Continental', prefixo: 'LCO' },
  UECL: { nome: 'Copa Conferência Europeia', curto: 'Copa Conferência', prefixo: 'CCE' },
  SERIE_C: { nome: 'Terceira Divisão', curto: 'Terceira Divisão', prefixo: 'C' },
  SERIE_D: { nome: 'Quarta Divisão', curto: 'Quarta Divisão', prefixo: 'D' }
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

/** O caminho do logo (relativo a pagina), ou '' sem o mod. */
export const logoComp = (id: string): string => (mod[id]?.logo ? `dados_reais/competicoes/${mod[id].logo}` : '');

/** O nome de uma LIGA (so o do mod; sem ele quem chama usa o da base). */
export const nomeDeLigaDoMod = (id: string): string | undefined => mod[id]?.nome;
