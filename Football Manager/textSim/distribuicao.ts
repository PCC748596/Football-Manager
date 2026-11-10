/*
SEGUNDA CAMADA, DESLIGADA POR OMISSAO. A base que o jogo traz ja e generica (textSim/realDatabase.ts, gerada por tools/gerar_dados_genericos.ts); os nomes e escudos reais vem do mod `public/dados_reais`
(textSim/modDados.ts). Estas duas chaves so servem para, COM o mod ligado, voltar a esconder os nomes reais ou os escudos reais (ex.: gravar um video): `VITE_NOMES_GENERICOS=1`, `VITE_ESCUDOS_GENERICOS=1`
ou `?genericos=1` no endereco.

  escudosGenericos   os clubes mostram o escudo GENERICO (o desenho de TeamShield) em vez da imagem (`logoUrl`).
  nomesGenericos     os jogadores ganham um nome gerado do id (o mesmo para sempre); o original fica em `nomeOriginal` e nunca e mostrado.
*/
import { criarRng } from './contracts';
import { nomeDoClube } from './nomes';

const amb = (k: string): string | undefined => { try { return (import.meta as any).env?.[k]; } catch { return undefined; } };
const queryGenericos = (): boolean => { try { return typeof location !== 'undefined' && /[?&]genericos=1/.test(location.search); } catch { return false; } };

export const DISTRIBUICAO = {
  escudosGenericos: amb('VITE_ESCUDOS_GENERICOS') === '1' || queryGenericos(),
  nomesGenericos: amb('VITE_NOMES_GENERICOS') === '1' || queryGenericos()
};

/** O nome gerado de um jogador real: determinista (id + pais do clube), do pais do clube. */
export const nomeGenerico = (idDoJogador: string, teamId: string): string => nomeDoClube(criarRng('nome-generico|' + idDoJogador), teamId);

/** O nome a MOSTRAR de um jogador real: o gerado (com `nomesGenericos`) ou o original. */
export const nomeDeExibicao = (idDoJogador: string, teamId: string, nomeReal: string): string =>
  DISTRIBUICAO.nomesGenericos ? nomeGenerico(idDoJogador, teamId) : nomeReal;

/** O escudo (url) a usar: nenhum (o genérico) com `escudosGenericos`. */
export const escudoUrl = (logoUrl?: string | null): string | undefined => (DISTRIBUICAO.escudosGenericos ? undefined : (logoUrl || undefined));
