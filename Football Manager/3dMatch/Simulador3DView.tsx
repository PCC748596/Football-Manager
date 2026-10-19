import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { Team, Player } from '../types';
import { urlSimulador, montarPayload } from './simulador3dCliente';

interface Props {
  casa: Team;
  fora: Team;
  players: Player[];
  userTeamId: string;
  chave: string;               // identifica a partida (data + times): outra chave = iframe novo
  iniciar: boolean;            // vira true quando o utilizador da a saida
  pausado: boolean;
  kitCasa?: number;            // kit escolhido (0 casa, 1 fora, 2 terceiro)
  kitFora?: number;
  aoMensagem: (m: any) => void; // eventos do motor (evento, estado, fim, erro)
  aoPronto?: () => void;        // o motor carregou (para enviar a tatica)
}

/*
O simulador 3D ao vivo num iframe (modo visivel). Mover ou remover um iframe do DOM recarrega-o, e o jogo recomecava ao sair da
tela e voltar. Por isso o iframe e UNICO e vive no <body> (position: fixed); o componente so o posiciona por cima do seu espaco
e esconde-o quando sai. A partida (e o iframe) so se perdem quando a `chave` muda.
*/
const sessao: { iframe: HTMLIFrameElement | null; chave: string; pronto: boolean; arrancou: boolean; preparadoCom: string; cb: (m: any) => void; ouvinte: boolean } =
  { iframe: null, chave: '', pronto: false, arrancou: false, cb: () => {}, ouvinte: false, preparadoCom: "" };

export const simulador3dArrancou = (chave: string) => sessao.chave === chave && sessao.arrancou;
export const simulador3dPronto = () => sessao.pronto;
// Velocidade do jogo (0.5x, 1x, 1.5x): guardada para a partida que ainda vai arrancar (o `iniciar` do motor usa-a) e enviada ao motor ja em curso.
let velocidadeDoJogo = 1;
export const simulador3dVelocidade = (v: number) => { velocidadeDoJogo = v; sessao.iframe?.contentWindow?.postMessage({ para: 'simulador3d', tipo: 'velocidade', valor: v }, '*'); };
// Mensagem solta para o motor (camara, zoom, tatica...).
export const simulador3dEnviar = (m: any) => sessao.iframe?.contentWindow?.postMessage({ para: 'simulador3d', ...m }, '*');
// Tela cheia no proprio iframe; ao sair/entrar avisa o motor, que mostra os botoes de camara dele so em tela cheia.
export const simulador3dTelaCheia = () => {
  const f = sessao.iframe;
  if (!f) return;
  if (document.fullscreenElement) { document.exitFullscreen(); return; }
  f.requestFullscreen?.().catch(() => {});
};
// Tela cheia -> Tactics -> volta em tela cheia; tela normal -> Tactics -> volta em tela normal: lembra-se do estado ao sair para o Tactics e repoe-no ao voltar.
let voltarEmTelaCheia = false;
export const simulador3dLembrarTelaCheia = () => { voltarEmTelaCheia = !!document.fullscreenElement && document.fullscreenElement === sessao.iframe; };
if (typeof document !== 'undefined') {
  document.addEventListener('fullscreenchange', () => {
    simulador3dEnviar({ tipo: 'tela_cheia', ligada: !!document.fullscreenElement && document.fullscreenElement === sessao.iframe });
  });
}

const enviar = (m: any) => sessao.iframe?.contentWindow?.postMessage(m, '*');

const garantirIframe = (chave: string) => {
  if (sessao.iframe && sessao.chave === chave) return;
  if (sessao.iframe) { enviar({ para: 'simulador3d', tipo: 'parar' }); sessao.iframe.remove(); }
  const f = document.createElement('iframe');
  f.src = urlSimulador() + '?embutido=1';
  f.title = 'Simulador 3D';
  f.allow = 'autoplay; fullscreen';
  f.style.cssText = 'position:fixed;border:0;background:#000;z-index:5;visibility:hidden;left:0;top:0;width:0;height:0';
  document.body.appendChild(f);
  Object.assign(sessao, { iframe: f, chave, pronto: false, arrancou: false, preparadoCom: "" });
  if (!sessao.ouvinte) {
    sessao.ouvinte = true;
    window.addEventListener('message', (e: MessageEvent) => {
      if (!sessao.iframe || e.source !== sessao.iframe.contentWindow || !e.data || e.data.fonte !== 'simulador3d') return;
      if (e.data.tipo === 'pronto') { sessao.pronto = true; sessao.cb({ tipo: '__pronto' }); }
      else sessao.cb(e.data);
    });
  }
};

const Simulador3DView: React.FC<Props> = ({ casa, fora, players, userTeamId, chave, iniciar, pausado, kitCasa, kitFora, aoMensagem, aoPronto }) => {
  const caixa = useRef<HTMLDivElement>(null);
  const dados = useRef<any>({});
  dados.current = { casa, fora, players, userTeamId, kits: { casa: kitCasa, fora: kitFora } };
  const iniciarRef = useRef(iniciar);
  iniciarRef.current = iniciar;

  const arrancar = () => {
    if (!sessao.pronto || sessao.arrancou) return;
    const d = dados.current;
    if (iniciarRef.current) {
      sessao.arrancou = true;
      enviar(montarPayload(d.casa, d.fora, d.players, d.userTeamId, { modo: 'visivel', velocidade: velocidadeDoJogo, fimEmMinutos: 90 }, d.kits));
    } else {
      // A entrada dos times so comeca depois de os uniformes escolhidos (o modal de kits ainda aberto = kits indefinidos).
      if (d.kits.casa === undefined || d.kits.fora === undefined) return;
      // So prepara (e faz a entrada dos times) uma vez por combinacao de kits: voltar a esta tela nao a reinicia.
      const chaveKits = JSON.stringify(d.kits);
      if (sessao.preparadoCom === chaveKits) return;
      sessao.preparadoCom = chaveKits;
      enviar({ ...montarPayload(d.casa, d.fora, d.players, d.userTeamId, {}, d.kits), tipo: 'preparar' });
    }
  };

  useLayoutEffect(() => {
    garantirIframe(chave);
    sessao.cb = (m) => { if (m.tipo === '__pronto') { arrancar(); aoPronto?.(); } else if (m.tipo === 'erro') { console.error('[3D erro]', m.mensagem); aoMensagem(m); } else if (m.tipo === 'perf') console.log('[3D desempenho]', m.fps + ' fps', 'Match.update ' + m.msJogo + ' ms', m.passosPorQuadro + ' passos/quadro'); else aoMensagem(m); };
    const f = sessao.iframe!;
    const pos = () => {
      const r = caixa.current?.getBoundingClientRect();
      if (!r) return;
      f.style.left = r.left + 'px'; f.style.top = r.top + 'px'; f.style.width = r.width + 'px'; f.style.height = r.height + 'px';
    };
    pos();
    f.style.visibility = 'visible';
    if (voltarEmTelaCheia) { voltarEmTelaCheia = false; f.requestFullscreen?.().catch(() => {}); }
    const ro = new ResizeObserver(pos);
    if (caixa.current) ro.observe(caixa.current);
    window.addEventListener('resize', pos);
    const t = setInterval(pos, 300); // o layout em volta pode mudar sem avisar
    arrancar();
    return () => {
      clearInterval(t); ro.disconnect(); window.removeEventListener('resize', pos);
      f.style.visibility = 'hidden';
      if (sessao.arrancou) enviar({ para: 'simulador3d', tipo: 'pausar' }); // sair da tela pausa o jogo
      sessao.cb = () => {};
    };
  }, [chave]);

  useEffect(() => { sessao.cb = (m) => { if (m.tipo === '__pronto') { arrancar(); aoPronto?.(); } else if (m.tipo === 'erro') { console.error('[3D erro]', m.mensagem); aoMensagem(m); } else if (m.tipo === 'perf') console.log('[3D desempenho]', m.fps + ' fps', 'Match.update ' + m.msJogo + ' ms', m.passosPorQuadro + ' passos/quadro'); else aoMensagem(m); }; });
  useEffect(() => { if (iniciar) arrancar(); }, [iniciar]);
  // Escolher outro kit antes da saida refaz a preparacao (o motor so veste as equipas ao prepara-las).
  useEffect(() => { if (sessao.pronto && !sessao.arrancou) arrancar(); }, [kitCasa, kitFora]);
  useEffect(() => {
    if (!sessao.arrancou) return;
    enviar({ para: 'simulador3d', tipo: pausado ? 'pausar' : 'continuar' });
  }, [pausado]);

  return <div ref={caixa} className="w-full h-full" />;
};

export default Simulador3DView;
