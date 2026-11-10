/*
MODO DE DISTRIBUICAO (Steam): sem escudos reais e sem nomes reais de jogadores.

  escudosGenericos   os clubes mostram o escudo GENERICO (o desenho de TeamShield, nas cores do clube; no 3D, as tres barras nas cores) em vez da imagem real (`logoUrl`).
  nomesGenericos     os jogadores vindos da base real ganham um nome gerado (o mesmo para sempre: sai do id), do pais do clube. O nome original fica em `nomeOriginal` (so para chaves internas, como os
                     ajustes de playing style) e nunca e mostrado.

Ligado por omissao. Para trabalhar com os dados reais: `VITE_ESCUDOS_REAIS=1` e/ou `VITE_NOMES_REAIS=1` ao arrancar (ou `?reais=1` no endereco). ATENCAO: isto so muda o que o jogo MOSTRA; os ficheiros de dados reais
(textSim/realDatabase.ts, local-data/, Assets/Escudos/, 3dMatch/simulador3d/assets e data) continuam na pasta e NAO podem ir no pacote da Steam (ver a nota do chat sobre o passo de empacotamento).
*/
import { criarRng } from './contracts';
import { nomeDoClube } from './nomes';

const amb = (k: string): string | undefined => { try { return (import.meta as any).env?.[k]; } catch { return undefined; } };
const queryReais = (): boolean => { try { return typeof location !== 'undefined' && /[?&]reais=1/.test(location.search); } catch { return false; } };

export const DISTRIBUICAO = {
  escudosGenericos: amb('VITE_ESCUDOS_REAIS') !== '1' && !queryReais(),
  nomesGenericos: amb('VITE_NOMES_REAIS') !== '1' && !queryReais()
};

/** O nome gerado de um jogador real: determinista (id + pais do clube), do pais do clube. */
export const nomeGenerico = (idDoJogador: string, teamId: string): string => nomeDoClube(criarRng('nome-generico|' + idDoJogador), teamId);

/** O nome a MOSTRAR de um jogador real: o gerado (com `nomesGenericos`) ou o original. */
export const nomeDeExibicao = (idDoJogador: string, teamId: string, nomeReal: string): string =>
  DISTRIBUICAO.nomesGenericos ? nomeGenerico(idDoJogador, teamId) : nomeReal;

/** O escudo (url) a usar: nenhum (o genérico) com `escudosGenericos`. */
export const escudoUrl = (logoUrl?: string | null): string | undefined => (DISTRIBUICAO.escudosGenericos ? undefined : (logoUrl || undefined));
