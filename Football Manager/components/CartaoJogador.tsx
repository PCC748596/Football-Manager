import React from 'react';
import { Player } from '../types';
import EnergyBar, { energiaDe } from './EnergyBar';
import { IconePlayStyleSvg } from '../textSim/PlayStyleSvg';

/*
O CARTAO DO JOGADOR NO CAMPO (Match Tactics, aba Geral). Modelo: o cartao de jogador de videojogo — overall grande, rosto, nome, seis medidas — com o fundo num azul mais claro que o
do app (sem bronze, prata ou ouro).

    topo       esquerda: overall (a habilidade na posicao do slot); o rosto fica na camada do fundo
    nome       o apelido, e a MOR (moral) do lado direito
    energia    a barra de energia, entre o nome e as medidas
    medidas    duas colunas de tres (PAC SHO PAS | DRI DEF PHY; no goleiro DIV HAN KIC | REF SPD POS); a esquerda delas, na mesma altura, a POS natural do jogador,
               o icone do playing style e a nota media
*/

export const CARTAO_LARGURA = 118;
export const CARTAO_ALTURA = 159;
/** O corte diagonal do canto inferior direito (px de cada lado). */
const CORTE_DIAGONAL = 25;

interface Props {
  player: Player;
  slotPos: string;             // a posicao do slot em que joga
  overall: number;             // a habilidade dele nessa posicao (0 se expulso)
  rosto: React.ReactNode;      // o rosto 3D (ou o que o chamador quiser)
  estilo?: string | null;      // o playing style (null = escondido)
  nota?: string | null;        // a nota media ja formatada (null = escondida)
  notaValor?: number;          // para a cor da nota
  selecionado?: boolean;
  semMoral?: boolean;          // esconde a seta da moral (o adversario no preview)
  foraDePosicao?: boolean;     // joga fora da sua posicao: o overall fica vermelho
  etiquetas?: React.ReactNode; // cartoes, lesao
}

// A MOR e so a seta (a mesma do resto do app): ouro e a subir >= 90, verde 70-89, cinza 40-69, laranja 20-39, rosa e a descer < 20.
const setaDaMoral = (m: number) => (m >= 90 ? { cor: '#fbbf24', graus: -90 } : m >= 70 ? { cor: '#34d399', graus: -45 } : m >= 40 ? { cor: '#cbd5e1', graus: 0 } : m >= 20 ? { cor: '#fb923c', graus: 45 } : { cor: '#fb7185', graus: 90 });

// O nome sai INTEIRO: a letra encolhe com o comprimento (de 15 px ate 8 px) para caber na largura util do cartao (maiusculas a negrito: ~0.72 em por letra).
const tamanhoDoNome = (nome: string) => Math.max(8, Math.min(15, Math.floor((CARTAO_LARGURA - 10) / (Math.max(1, nome.length) * 0.72))));

const CartaoJogador: React.FC<Props> = ({ player, slotPos, overall, rosto, estilo, nota, notaValor, selecionado, foraDePosicao, semMoral, etiquetas }) => {
  const fundoNota = notaValor === undefined ? '#64748b' : notaValor >= 7 ? '#059669' : notaValor <= 6 ? '#dc2626' : '#64748b';
  const morale = Math.round(player.morale ?? 50);
  const seta = setaDaMoral(morale);
  const nome = player.name.split(' ').pop() || '';

  return (
    <div className="relative" style={{ width: CARTAO_LARGURA, height: CARTAO_ALTURA }}>
    <div
      className={`relative flex flex-col select-none bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-white ${selecionado ? 'ring-2 ring-blue-400' : ''}`}
      style={{ width: CARTAO_LARGURA, height: CARTAO_ALTURA, borderRadius: 0, padding: '2px', clipPath: `polygon(0 0, 100% 0, 100% calc(100% - ${CORTE_DIAGONAL}px), calc(100% - ${CORTE_DIAGONAL}px) 100%, 0 100%)` }}
    >
      {/* O ROSTO na camada do fundo: grande, esfumacado e mais para baixo (so o rosto; o resto do cartao fica por cima). */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div style={{ position: 'absolute', right: 0, top: -9, width: 88, height: 88, opacity: 1,
          WebkitMaskImage: 'linear-gradient(to bottom, #000 58%, transparent 100%)', maskImage: 'linear-gradient(to bottom, #000 58%, transparent 100%)' }}>{rosto}</div>
      </div>
      <div className="relative flex flex-col flex-1" style={{ zIndex: 1 }}>
      {/* topo: overall + bandeira */}
      <div className="flex items-start justify-between" style={{ height: 66 }}>
        <div className="flex flex-col items-start leading-none" style={{ width: 46 }}>
          <span className={`font-black inline-block ${foraDePosicao ? 'text-rose-500' : ''}`} style={{ fontSize: 36, letterSpacing: -3, transform: 'scale(0.82, 2.1)', transformOrigin: 'left top', marginTop: -15 }}>{overall}</span>
        </div>
      </div>

      {/* nome + MOR */}
      <div className="flex items-baseline justify-center gap-2 mt-1.5 leading-none">
        <span className="font-black uppercase whitespace-nowrap" style={{ fontSize: tamanhoDoNome(nome) }}>{nome}</span>
      </div>

      {/* energia */}
      <div className="mt-2 mx-auto flex items-center gap-1.5" style={{ width: '94%' }}>
        <div className="flex-1 min-w-0"><EnergyBar energy={energiaDe(player)} className="h-[10px]" /></div>
        {!semMoral && <span className="font-black shrink-0 inline-block leading-none" style={{ fontSize: 17, color: seta.cor, transform: `rotate(${seta.graus}deg)`, textShadow: '0 1px 2px rgba(0,0,0,0.4)' }} title={`Morale ${morale}`}>➤</span>}
      </div>

      {/* POS natural, playing style e nota media */}
      <div className="flex items-center justify-start gap-1 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
        <span className="font-black leading-none text-slate-500 dark:text-slate-300" style={{ fontSize: 15 }} title="Natural position">{player.position}</span>
        {estilo ? <IconePlayStyleSvg estilo={estilo} tam={24} /> : <span style={{ width: 24 }} />}
        <span className="flex items-center gap-1">
          <span className="font-black leading-none rounded-full px-2 py-[3px] text-white" style={{ fontSize: 14, background: fundoNota, minWidth: 34, textAlign: 'center' }} title="Average rating">{nota ?? '-'}</span>
        </span>
      </div>

      </div>
    </div>
      {etiquetas && <div className="absolute flex flex-col gap-1 items-center" style={{ top: 6, right: -10, zIndex: 2 }}>{etiquetas}</div>}
    </div>
  );
};

export default CartaoJogador;

/** O deslocamento vertical (px) do cartao no campo, so de visualizacao: o goleiro desce, do DM para a frente sobe; ajustes por formacao (ver TacticsView). */
export const deslocamentoDoCartao = (formacao: string, label: string, x: number): number => {
  let d = label === 'GK' ? 30 : ['DM', 'CDM', 'CM', 'LM', 'RM', 'AM', 'CAM', 'LW', 'RW', 'CF', 'ST', 'SS'].includes(label) ? -20 : 0;
  if (formacao === '5-4-1' && ['LB', 'CB', 'RB', 'LWB', 'RWB', 'DM', 'CDM', 'CM', 'LM', 'RM', 'AM', 'CAM'].includes(label)) d -= 20;
  if (formacao === '3-5-2' && label === 'CB' && x === 50) d -= 20;
  if (['3-5-2 ATA', '5-3-2'].includes(formacao) && label === 'GK') d += 10;
  return d;
};

/*
PLAYER CARDS e PLAYER FACES sao EXCLUSIVOS: so um dos dois pode estar ON (o Match Tactics liga um e desliga o outro). Estas tres leituras valem para o Tactics e para o Match Preview.
  cartoesLigados   o campo mostra os cartoes (por omissao, ligado);
  rostosLigados    o campo mostra o rosto sobre a camisa (so sem cartoes);
  rostosNasListas  o banco e o squad pool mostram o rosto (com cartoes ou com Faces ligado).
*/
type FlagsDeVista = { playerCardsOn?: boolean; playerFacesOn?: boolean };
export const cartoesLigados = (t?: FlagsDeVista | null): boolean => !t || (t.playerCardsOn !== false && t.playerFacesOn !== true);
export const rostosLigados = (t?: FlagsDeVista | null): boolean => !!t && t.playerFacesOn !== false && !cartoesLigados(t);
export const rostosNasListas = (t?: FlagsDeVista | null): boolean => !t || t.playerFacesOn !== false || cartoesLigados(t);
