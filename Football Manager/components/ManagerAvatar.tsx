import React, { useEffect, useRef } from 'react';

export type ManagerOutfit = 'SUIT' | 'TRACKSUIT' | 'CASUAL';
export type ManagerBody = 'SLIM' | 'ATHLETIC' | 'AVERAGE';
export type ManagerHairStyle = 'SHORT' | 'BUZZ' | 'LONG' | 'BALD';

export interface ManagerLook {
  gender: 'MALE' | 'FEMALE';
  body: ManagerBody;
  skin: string;
  hairStyle: ManagerHairStyle;
  hair: string;
  outfit: ManagerOutfit;
  outfitColor: string;
  /** So no Casual: a calca (a camisa e o `outfitColor`). */
  pantsColor: string;
  /** So no Suit: a gravata. */
  tieColor: string;
}

interface Props {
  look: ManagerLook;
  /** Sobe a cada clique em Rotate: o preview gira meia volta. */
  rodar?: number;
  className?: string;
}

/*
O TREINADOR — o corpo REAL do jogo (`construirCorpo`, 3dMatch/simulador3d/js/pose.js) desenhado em 3D numa pagina propria (managerpreview.html),
vestido como o treinador do banco (fato, camisa branca, gravata). O aspeto vai por postMessage; da para arrastar para rodar.
*/
export const ManagerAvatar: React.FC<Props> = ({ look, rodar = 0, className = '' }) => {
  const ref = useRef<HTMLIFrameElement>(null);
  const pronto = useRef(false);
  const lookAtual = useRef(look);
  lookAtual.current = look;

  const enviar = (msg: any) => ref.current?.contentWindow?.postMessage(msg, '*');

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow || e.data?.tipo !== 'managerPreviewPronto') return;
      pronto.current = true;
      enviar({ tipo: 'look', look: lookAtual.current });
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  useEffect(() => { if (pronto.current) enviar({ tipo: 'look', look }); }, [look]);
  useEffect(() => { if (rodar && pronto.current) enviar({ tipo: 'rodar' }); }, [rodar]);

  return <iframe ref={ref} src={new URL('simulador3d/managerpreview.html', document.baseURI).href} title="Treinador" className={className} style={{ border: 0, background: 'transparent' }} />;
};

export default ManagerAvatar;
