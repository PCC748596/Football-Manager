import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { Team, Player } from '../types';
import { urlSimulador, montarPayload } from './simulador3dCliente';
import { settleMatch, ECONOMIA_ESTADIO } from '../textSim/stadiumEconomy';

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
  competicao?: string;
  amistoso?: boolean;   // jogo amigavel: o treinador da CPU nao tem limite de substituicoes
  tabela?: { casa: { posicao: number; total: number }; fora: { posicao: number; total: number } };   // a posicao dos dois na tabela do campeonato (o treinador da CPU, 3D)         // nome da competicao: a placa fixa do 3D
  qualidade?: 'HIGH' | 'MEDIUM' | 'LOW';   // Game Settings > Graphics
  aoMensagem: (m: any) => void; // eventos do motor (evento, estado, fim, erro)
  aoPronto?: () => void;
  /** Retomar um jogo gravado a meio: o 3D comeca neste minuto, com este placar e estes expulsos (ver Ponte._retomar). */
  retomar?: { minuto: number; placar: { casa: number; fora: number }; expulsos: string[]; saida?: 'casa' | 'fora'; instantaneo?: any } | null;        // o motor carregou (para enviar a tatica)
}

/*
O simulador 3D ao vivo num iframe (modo visivel). Mover ou remover um iframe do DOM recarrega-o, e o jogo recomecava ao sair da
tela e voltar. Por isso o iframe e UNICO e vive no <body> (position: fixed); o componente so o posiciona por cima do seu espaco
e esconde-o quando sai. A partida (e o iframe) so se perdem quando a `chave` muda.
*/
// A qualidade grafica (Game Settings > Graphics): vai no URL do iframe ao criar e na mensagem `qualidade` depois.
let qualidadeGrafica: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
export const simulador3dQualidade = (q?: 'HIGH' | 'MEDIUM' | 'LOW') => {
  const nova = q || 'HIGH';
  if (nova === qualidadeGrafica) return;
  qualidadeGrafica = nova;
  sessao.iframe?.contentWindow?.postMessage({ para: 'simulador3d', tipo: 'qualidade', nivel: nova }, '*');
};

const sessao: { iframe: HTMLIFrameElement | null; chave: string; pronto: boolean; arrancou: boolean; preparadoCom: string; cb: (m: any) => void; ouvinte: boolean; terminou: boolean } =
  { iframe: null, chave: '', pronto: false, arrancou: false, cb: () => {}, ouvinte: false, preparadoCom: "", terminou: false };

export const simulador3dArrancou = (chave: string) => sessao.chave === chave && sessao.arrancou;
// Quantos RESETs desta partida ja se fizeram (a chave do iframe leva `#N`): sair para o Tactics e voltar nao pode perder a conta, senao a chave muda e o 3D e recriado.
export const simulador3dReinicios = (base: string) => (sessao.chave.startsWith(base + '#') ? Number(sessao.chave.slice(base.length + 1)) || 0 : 0);
export const simulador3dPronto = () => sessao.pronto;
// Velocidade do jogo (0.5x, 1x, 1.5x): guardada para a partida que ainda vai arrancar (o `iniciar` do motor usa-a) e enviada ao motor ja em curso.
let velocidadeDoJogo = 1;
export const simulador3dVelocidade = (v: number) => { velocidadeDoJogo = v; sessao.iframe?.contentWindow?.postMessage({ para: 'simulador3d', tipo: 'velocidade', valor: v }, '*'); };
// Mensagem solta para o motor (camara, zoom, tatica...).
export const simulador3dEnviar = (m: any) => sessao.iframe?.contentWindow?.postMessage({ para: 'simulador3d', ...m }, '*');

/*
O INSTANTANEO DO JOGO 3D para o save (Ponte.instantaneo): pede-o ao iframe e espera a resposta (ate `ms`). null sem 3D a correr ou sem resposta.
*/
export const simulador3dInstantaneo = (ms = 1500): Promise<any | null> => new Promise(resolve => {
  if (!sessao.iframe || !sessao.arrancou) { resolve(null); return; }
  const id = Math.random().toString(36).slice(2);
  const ouvir = (e: MessageEvent) => {
    if (!sessao.iframe || e.source !== sessao.iframe.contentWindow || !e.data || e.data.fonte !== 'simulador3d' || e.data.tipo !== 'instantaneo' || e.data.id !== id) return;
    window.removeEventListener('message', ouvir); clearTimeout(t); resolve(e.data.dados || null);
  };
  const t = setTimeout(() => { window.removeEventListener('message', ouvir); resolve(null); }, ms);
  window.addEventListener('message', ouvir);
  simulador3dEnviar({ tipo: 'instantaneo', id });
});
// Tela cheia no proprio iframe; ao sair/entrar avisa o motor, que mostra os botoes de camara dele so em tela cheia.
/*
TABLET: o Safari do iPad (e alguns navegadores Android) so tem a API com prefixo (`webkitRequestFullscreen`) ou nao a deixa pedir num iframe, e o botao nao fazia nada. Tenta a API (com prefixo);
se nao existir ou for recusada, usa a TELA CHEIA SIMULADA: o iframe passa a cobrir a janela inteira (position fixed, 100% x 100%, por cima de tudo). No PWA instalado (display standalone) a janela ja e a tela toda.
*/
let telaCheiaSimulada = false;
const emTelaCheia = () => telaCheiaSimulada || (!!(document.fullscreenElement || (document as any).webkitFullscreenElement) && (document.fullscreenElement || (document as any).webkitFullscreenElement) === sessao.iframe);
const avisarTelaCheia = () => simulador3dEnviar({ tipo: 'tela_cheia', ligada: emTelaCheia() });
const ajustarSimulada = (ligar: boolean) => {
  const f = sessao.iframe;
  if (!f) return;
  telaCheiaSimulada = ligar;
  if (ligar) { f.style.left = '0px'; f.style.top = '0px'; f.style.width = '100vw'; f.style.height = '100dvh'; f.style.zIndex = '9999'; }
  else f.style.zIndex = '5';   // a posicao normal volta no proximo `pos()` (300 ms)
  avisarTelaCheia();
};
export const simulador3dSairDaTelaCheia = () => {
  if (telaCheiaSimulada) { ajustarSimulada(false); return; }
  const d: any = document;
  if (d.fullscreenElement) d.exitFullscreen?.(); else if (d.webkitFullscreenElement) d.webkitExitFullscreen?.();
};
export const simulador3dTelaCheia = () => {
  const f: any = sessao.iframe;
  if (!f) return;
  const d: any = document;
  if (telaCheiaSimulada || d.fullscreenElement || d.webkitFullscreenElement) { simulador3dSairDaTelaCheia(); return; }
  const pedir = f.requestFullscreen ? f.requestFullscreen() : f.webkitRequestFullscreen ? f.webkitRequestFullscreen() : null;
  if (pedir && typeof pedir.catch === 'function') pedir.catch(() => ajustarSimulada(true));
  else if (!pedir) ajustarSimulada(true);
};
// Tela cheia -> Tactics -> volta em tela cheia; tela normal -> Tactics -> volta em tela normal: lembra-se do estado ao sair para o Tactics e repoe-no ao voltar.
let voltarEmTelaCheia = false;
// (Sem tela cheia por omissao.) `chaveComTelaCheia` so marca a partida quando se volta do Tactics em tela cheia (ver `voltarEmTelaCheia`).
let chaveComTelaCheia = '';
export const simulador3dLembrarTelaCheia = () => { voltarEmTelaCheia = emTelaCheia(); ajustarSimulada(false); };
if (typeof document !== 'undefined') {
  document.addEventListener('fullscreenchange', () => {
    avisarTelaCheia();
  });
  document.addEventListener('webkitfullscreenchange', () => avisarTelaCheia());
}

/*
ESC NA TELA CHEIA com uma entrada em campo ou uma repeticao a correr: o navegador gasta o ESC a sair da tela cheia. O 3D avisa (`esc_travar`) e este documento — o de TOPO, que e o que esta
em tela cheia — pede o BLOQUEIO DO TECLADO para o ESC (Keyboard Lock, Chromium). O foco pode estar fora do iframe, por isso o ESC que chega aqui e REENCAMINHADO ao 3D (`esc`), que cancela
a entrada ou fecha a repeticao. Libertado quando o 3D avisa que acabou.
*/
let escTravado = false;
const definirEscTravado = (ligar: boolean) => {
  escTravado = ligar;
  try {
    const k = (navigator as any).keyboard;
    if (!k) return;
    if (ligar) { const p = k.lock?.(['Escape']); p?.catch?.(() => {}); } else k.unlock?.();
  } catch { /* sem suporte */ }
};
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (ev.key !== 'Escape' || !escTravado) return;
    ev.preventDefault(); ev.stopPropagation();
    sessao.iframe?.contentWindow?.postMessage({ para: 'simulador3d', tipo: 'esc' }, '*');
  }, true);
}

const enviar = (m: any) => sessao.iframe?.contentWindow?.postMessage(m, '*');

const garantirIframe = (chave: string, estadio?: string, mandante?: string, competicao?: string, capacidade?: number, cidadePequena?: boolean) => {
  if (sessao.iframe && sessao.chave === chave) return;
  if (sessao.iframe) { enviar({ para: 'simulador3d', tipo: 'parar' }); sessao.iframe.remove(); }
  const f = document.createElement('iframe');
  f.src = urlSimulador() + '?embutido=1&q=' + qualidadeGrafica + (estadio ? '&estadio=' + encodeURIComponent(estadio) : '') + (mandante ? '&mandante=' + encodeURIComponent(mandante) : '') + (competicao ? '&competicao=' + encodeURIComponent(competicao) : '') + (capacidade ? '&capacidade=' + Math.round(capacidade) : '') + (cidadePequena ? '&cidade=pequena' : '');
  f.title = 'Simulador 3D';
  f.allow = 'autoplay; fullscreen';
  f.style.cssText = 'position:fixed;border:0;background:#000;z-index:5;visibility:hidden;left:0;top:0;width:0;height:0';
  document.body.appendChild(f);
  Object.assign(sessao, { iframe: f, chave, pronto: false, arrancou: false, preparadoCom: "", terminou: false });
  if (!sessao.ouvinte) {
    sessao.ouvinte = true;
    window.addEventListener('message', (e: MessageEvent) => {
      if (!sessao.iframe || e.source !== sessao.iframe.contentWindow || !e.data || e.data.fonte !== 'simulador3d') return;
      if (e.data.tipo === 'esc_travar') { definirEscTravado(!!e.data.ligar); return; }
      if (e.data.tipo === 'fim') sessao.terminou = true;
      if (e.data.tipo === 'pronto') { sessao.pronto = true; sessao.cb({ tipo: '__pronto' }); }
      else sessao.cb(e.data);
    });
  }
};

// A ocupacao do estadio neste jogo (0..1): a base do mandante mais o bonus do jogo (classico). O 3D desenha a torcida com ela.
const ocupacaoDoJogo = (casa: Team, fora: Team): number => {
  try { return settleMatch(casa, fora, { id: '', week: 0, date: '', homeTeamId: casa.id, awayTeamId: fora.id, homeScore: 0, awayScore: 0 } as any, 'USD').occupancy; } catch { return 1; }
};

// A ocupacao do setor visitante: a base do clube visitante (60% no inicio, muda com os resultados dele).
const ocupacaoVisitanteDoJogo = (fora: Team): number => (fora as any).stadiumOccupancy ?? ECONOMIA_ESTADIO.ocupacaoInicial;

const Simulador3DView: React.FC<Props> = ({ casa, fora, players, userTeamId, chave, iniciar, pausado, kitCasa, kitFora, competicao, tabela, amistoso, qualidade, aoMensagem, aoPronto, retomar }) => {
  simulador3dQualidade(qualidade);   // antes de o iframe ser criado (useLayoutEffect) para entrar no URL
  const caixa = useRef<HTMLDivElement>(null);
  const dados = useRef<any>({});
  dados.current = { casa, fora, players, userTeamId, kits: { casa: kitCasa, fora: kitFora }, tabela, amistoso, retomar };
  const iniciarRef = useRef(iniciar);
  iniciarRef.current = iniciar;

  const arrancar = () => {
    if (!sessao.pronto || sessao.arrancou) return;
    const d = dados.current;
    if (iniciarRef.current) {
      sessao.arrancou = true;
      enviar({ ...montarPayload(d.casa, d.fora, d.players, d.userTeamId, { modo: 'visivel', velocidade: velocidadeDoJogo, fimEmMinutos: 90, ocupacao: ocupacaoDoJogo(d.casa, d.fora), ocupacaoVisitante: ocupacaoVisitanteDoJogo(d.fora), tabela: d.tabela, amistoso: d.amistoso }, d.kits), ...(d.retomar ? { retomar: d.retomar } : {}) });
    } else {
      // A entrada dos times so comeca depois de os uniformes escolhidos (o modal de kits ainda aberto = kits indefinidos).
      if (d.kits.casa === undefined || d.kits.fora === undefined) return;
      // So prepara (e faz a entrada dos times) uma vez por combinacao de kits: voltar a esta tela nao a reinicia.
      const chaveKits = JSON.stringify(d.kits);
      if (sessao.preparadoCom === chaveKits) return;
      sessao.preparadoCom = chaveKits;
      enviar({ ...montarPayload(d.casa, d.fora, d.players, d.userTeamId, { ocupacao: ocupacaoDoJogo(d.casa, d.fora), ocupacaoVisitante: ocupacaoVisitanteDoJogo(d.fora), tabela: d.tabela, amistoso: d.amistoso }, d.kits), tipo: 'preparar' });
    }
  };

  useLayoutEffect(() => {
    // O estadio sai da capacidade real do mandante (`?capacidade=`; ate 20 000 lugares so arquibancadas rectas, acima as curvas e mais aneis): ver Estadios.paraCapacidade em config/estadios.js.
    garantirIframe(chave, casa.stadium, casa.name, competicao, casa.stadiumCapacity, casa.leagueId === 'bra_serie_c' || casa.leagueId === 'bra_serie_d');
    sessao.cb = (m) => { if (m.tipo === '__pronto') { arrancar(); aoPronto?.(); } else if (m.tipo === 'erro') { console.error('[3D erro]', m.mensagem); aoMensagem(m); } else if (m.tipo === 'perf') console.log('[3D desempenho]', m.fps + ' fps', 'Match.update ' + m.msJogo + ' ms', m.passosPorQuadro + ' passos/quadro'); else aoMensagem(m); };
    const f = sessao.iframe!;
    const pos = () => {
      if (telaCheiaSimulada) return;
      const r = caixa.current?.getBoundingClientRect();
      if (!r) return;
      f.style.left = r.left + 'px'; f.style.top = r.top + 'px'; f.style.width = r.width + 'px'; f.style.height = r.height + 'px';
    };
    pos();
    f.style.visibility = 'visible';
    if (voltarEmTelaCheia) { voltarEmTelaCheia = false; chaveComTelaCheia = chave; simulador3dTelaCheia(); }
    const ro = new ResizeObserver(pos);
    if (caixa.current) ro.observe(caixa.current);
    window.addEventListener('resize', pos);
    const t = setInterval(pos, 300); // o layout em volta pode mudar sem avisar
    arrancar();
    return () => {
      clearInterval(t); ro.disconnect(); window.removeEventListener('resize', pos);
      f.style.visibility = 'hidden';
      sessao.cb = () => {};
      /*
      Jogo ACABADO e a sair da tela (HOME): o iframe e destruido. O `pausar` nao faz nada num jogo terminado, e o animate() do
      3D continua a desenhar o WebGL a 60 fps escondido (visibility:hidden nao o trava) por cima do resto do manager — era o jogo a travar na HOME.
      */
      if (sessao.terminou) {
        enviar({ para: 'simulador3d', tipo: 'parar' });
        f.remove();
        Object.assign(sessao, { iframe: null, chave: '', pronto: false, arrancou: false, preparadoCom: "", terminou: false });
        return;
      }
      if (sessao.arrancou) enviar({ para: 'simulador3d', tipo: 'pausar' }); // sair da tela pausa o jogo
    };
  }, [chave]);

  useEffect(() => { sessao.cb = (m) => { if (m.tipo === '__pronto') { arrancar(); aoPronto?.(); } else if (m.tipo === 'erro') { console.error('[3D erro]', m.mensagem); aoMensagem(m); } else if (m.tipo === 'perf') console.log('[3D desempenho]', m.fps + ' fps', 'Match.update ' + m.msJogo + ' ms', m.passosPorQuadro + ' passos/quadro'); else aoMensagem(m); }; });
  useEffect(() => { if (iniciar) arrancar(); }, [iniciar]);
  // (A tela cheia automatica depois de escolher os uniformes foi retirada a pedido: entra-se em tela cheia pelo botao. Voltar do Tactics continua a respeitar o estado que estava.)
  // Escolher outro kit antes da saida refaz a preparacao (o motor so veste as equipas ao prepara-las).
  useEffect(() => { if (sessao.pronto && !sessao.arrancou) arrancar(); }, [kitCasa, kitFora]);
  useEffect(() => {
    if (!sessao.arrancou) return;
    enviar({ para: 'simulador3d', tipo: pausado ? 'pausar' : 'continuar' });
  }, [pausado]);

  return <div ref={caixa} className="w-full h-full" />;
};

export default Simulador3DView;
