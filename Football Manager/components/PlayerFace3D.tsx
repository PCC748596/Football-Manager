import React, { useEffect, useState } from 'react';
import { PlayerFace } from './PlayerFace';
import { getKitDetails, getGKKitDetails } from '../types';
import type { Team } from '../types';
import { uniformeDoKit } from '../3dMatch/simulador3dCliente';

interface Props {
  playerId: string;
  camisa?: string;
  /** Giro da cabeca em graus (positivo: olha para a direita da imagem; negativo: para a esquerda). */
  graus?: number;
  /** O uniforme do clube no formato do simulador (`uniformeDoKit`, 3dMatch/simulador3dCliente.ts): a camisa com as listras e o desenho do kit. Sem ele, camisa lisa da cor `camisa`. */
  uniforme?: any;
  /** Identifica o uniforme na cache (ex.: `${teamId}-0`). */
  chaveUniforme?: string;
  /** O clube do jogador: a camisa e o uniforme 1 saem dele (substitui `camisa`, `uniforme` e `chaveUniforme`). */
  team?: Team;
  /** Goleiro: usa o uniforme de goleiro do clube. */
  gk?: boolean;
  /** Qual uniforme do clube (0 = 1.o, 1 = 2.o, 2 = 3.o). */
  kitIdx?: 0 | 1 | 2;
  className?: string;
}

/*
A FOTO EM 3D DO JOGADOR — a cabeca e os ombros do modelo REAL do jogo (cabecapreview.html, `construirCorpo` de js/pose.js), viradas uns graus, desenhados uma vez e guardados como imagem.
O penteado, a barba e os oculos sao exatamente os do 3D. Um unico iframe escondido atende todos os pedidos (em fila); enquanto a imagem nao chega (ou se o 3D falhar) aparece a cara desenhada de sempre.
*/
const cache = new Map<string, string>();
const fila: { chave: string; msg: Record<string, any>; fim: (url: string) => void }[] = [];
let iframe: HTMLIFrameElement | null = null;
let pronto = false, ocupado = false, contador = 0;
let atualReq = -1, atualItem: (typeof fila)[number] | null = null;

const proximo = () => {
  if (!pronto || ocupado || !fila.length || !iframe?.contentWindow) return;
  const item = fila.shift()!;
  if (cache.has(item.chave)) { item.fim(cache.get(item.chave)!); proximo(); return; }
  ocupado = true; atualReq = ++contador; atualItem = item;
  iframe.contentWindow.postMessage({ ...item.msg, req: atualReq }, '*');
};

const garantirIframe = () => {
  if (iframe) return;
  window.addEventListener('message', (e: MessageEvent) => {
    if (!iframe || e.source !== iframe.contentWindow) return;
    if (e.data?.tipo === 'cabecaPronto') { pronto = true; proximo(); }
    else if (e.data?.tipo === 'cabecaPronta' && e.data.req === atualReq && atualItem) {
      const item = atualItem; atualItem = null; ocupado = false;
      if (e.data.url) cache.set(item.chave, e.data.url);
      item.fim(e.data.url || '');
      proximo();
    }
  });
  iframe = document.createElement('iframe');
  iframe.src = new URL('simulador3d/cabecapreview.html', document.baseURI).href;
  iframe.title = 'Player head renderer';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:256px;height:256px;border:0;pointer-events:none;';
  document.body.appendChild(iframe);
};

/** Pede uma imagem ao renderizador 3D (em fila, com cache pela `chave`). `msg` e a mensagem da pagina (`tipo` 'cabeca' ou 'corpo'). Devolve a funcao que cancela. */
export const pedirImagem3D = (chave: string, msg: Record<string, any>, fim: (url: string) => void): (() => void) => {
  if (cache.has(chave)) { fim(cache.get(chave)!); return () => {}; }
  let vivo = true;
  garantirIframe();
  fila.push({ chave, msg, fim: u => { if (vivo) fim(u); } });
  proximo();
  return () => { vivo = false; };
};
export const imagem3DEmCache = (chave: string) => cache.get(chave) || '';

export const PlayerFace3D: React.FC<Props> = ({ playerId, camisa = '#475569', graus = 20, uniforme: uniformeProp, chaveUniforme: chaveProp = '', team, gk = false, kitIdx = 0, className = '' }) => {
  // Com o clube, o kit 1 (ou o de goleiro) dele; a camisa e o uniforme vao para o 3D.
  const kit = team ? (gk ? getGKKitDetails(team, kitIdx, 0) : getKitDetails(team, kitIdx)) : null;
  if (kit) camisa = kit.c1;
  const uniforme = kit ? uniformeDoKit(kit, !gk) : uniformeProp;
  const chaveUniforme = team ? team.id + (gk ? '-gk' : '-') + kitIdx + '|' + kit!.c1 + (kit!.c2 || '') + (kit!.c3 || '') : chaveProp;
  const chave = `${playerId}|${camisa}|${graus}|${chaveUniforme}`;
  const [url, setUrl] = useState<string>(cache.get(chave) || '');
  useEffect(() => {
    if (cache.has(chave)) { setUrl(cache.get(chave)!); return; }
    setUrl('');
    return pedirImagem3D(chave, { tipo: 'cabeca', id: playerId, camisa, graus, uniforme }, setUrl);
  }, [chave]);
  if (!url) return <PlayerFace playerId={playerId} camisa={camisa} className={className} />;
  return <img src={url} alt="" className={className} style={{ objectFit: 'contain', transform: 'translateY(10px)' }} />;
};

export default PlayerFace3D;
