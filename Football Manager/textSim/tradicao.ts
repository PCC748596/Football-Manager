/*
TRADICAO DOS CLUBES — decide se a historia do clube sobe (+1), desce (-1) ou mantem (0) o nivel de exigencia da diretoria (ver textSim/managerExpectations.ts).

A lista do utilizador esta em textSim/tradicaoClubes.json (campo `heritage` 0-100). Os clubes que nao estao la usam a torcida (`fanBase`) e a idade (`foundedYear`), comparadas com as
dos colegas da mesma liga. O ajuste e sempre RELATIVO a liga: os ~15% de cima sobem um nivel e os ~25% de baixo descem um (empates ficam no meio).
*/
import type { Team } from '../types';
import tradicao from './tradicaoClubes.json';

export interface EntradaTradicao { clube: string; fanBase: number; fundacao: number; heritage: number; }

export const CONFIG_TRADICAO = { topo: 85, base: 25, pesoTorcida: 0.6, pesoIdade: 0.4, idadeMaxima: 130 };

/** Nomes da base que diferem do json (chave e valor ja normalizados). */
const ALIAS: Record<string, string> = { atleticopr: 'athleticopr', mancity: 'manchestercity', manutd: 'manchesterunited', newcastle: 'newcastleunited', wolves: 'wolverhampton', koln: 'fckoln', marseille: 'olympiquemarseille', monaco: 'asmonaco', lyon: 'olympiquelyonnais', athleticclub: 'athleticbilbao', celtavigo: 'celtadevigo', stuttgart: 'vfbstuttgart' };

export const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const semUf = (s: string) => s.replace(/-[A-Za-z]{2}$/, '');

const INDICE = new Map<string, EntradaTradicao>();
for (const lista of Object.values(tradicao as unknown as Record<string, EntradaTradicao[]>)) for (const e of lista) INDICE.set(normalizar(e.clube), e);

/** Procura o clube: nome exato, alias, e por fim o nome sem o sufixo de UF da base ("Flamengo-RJ" -> "Flamengo"). */
export const acharEntrada = (nome: string): EntradaTradicao | undefined => {
  const n = normalizar(nome);
  return INDICE.get(n) || INDICE.get(ALIAS[n] || '') || INDICE.get(normalizar(semUf(nome)));
};

/** Percentil 0-100 de cada valor (empates dividem a posicao: todos iguais -> 50). */
const percentis = (valores: number[]): number[] => {
  if (valores.length < 2) return valores.map(() => 50);
  return valores.map(v => {
    const abaixo = valores.filter(x => x < v).length, iguais = valores.filter(x => x === v).length;
    return ((abaixo + (iguais - 1) / 2) / (valores.length - 1)) * 100;
  });
};

/** Ajuste de tradicao (+1, 0, -1) de cada clube de UMA liga, por `team.id`. */
export const ajustesDeTradicao = (times: Team[], anoBase = 2024): Record<string, -1 | 0 | 1> => {
  const C = CONFIG_TRADICAO;
  const idade = (t: Team) => Math.max(0, Math.min(100, ((anoBase - (t.foundedYear || anoBase)) / C.idadeMaxima) * 100));
  const pTorcida = percentis(times.map(t => t.fanBase || 0));
  const pontos = times.map((t, i) => acharEntrada(t.name)?.heritage ?? C.pesoTorcida * pTorcida[i] + C.pesoIdade * idade(t));
  const p = percentis(pontos);
  const out: Record<string, -1 | 0 | 1> = {};
  times.forEach((t, i) => { out[t.id] = p[i] >= C.topo ? 1 : p[i] <= C.base ? -1 : 0; });
  return out;
};
