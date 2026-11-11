import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { carregarDadosLocais } from './textSim/dadosLocais';
import { atualizarCambioAoAbrir } from './textSim/cambio';
import { carregarMod } from './textSim/modDados';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

/*
MODO TABLET (Configuracoes): no computador o jogo corre dentro de um quadro do TAMANHO REAL do tablet (iPad em paisagem, 1180 x 820 px CSS). As consultas de largura/altura do CSS
(breakpoints do Tailwind e `max-height`) olham para a JANELA, e uma simples caixa 4:3 nao as mudava: so um quadro com o tamanho do tablet reproduz o que o tablet mostra. A janela fica com um
cenario preto, e o quadro encolhe (nunca cresce) para caber nela. `fm_tablet_w` / `fm_tablet_h` (localStorage) mudam o tamanho (ex.: 1024 x 768, 1366 x 1024).
*/
let modoTablet = false;
try { modoTablet = localStorage.getItem('fm_tablet') === '1' && window.self === window.top; } catch { /* sem localStorage */ }

if (modoTablet) {
  const L = Number(localStorage.getItem('fm_tablet_w')) || 1180, A = Number(localStorage.getItem('fm_tablet_h')) || 820;
  document.body.style.cssText = 'margin:0;background:#000;overflow:hidden;';
  rootElement.style.cssText = 'position:fixed;inset:0;background:#000;';
  const quadro = document.createElement('iframe');
  quadro.src = window.location.href;
  quadro.allow = 'autoplay; fullscreen';
  quadro.style.cssText = `position:absolute;left:50%;top:50%;width:${L}px;height:${A}px;border:0;background:#0f172a;transform-origin:center center;`;
  const ajustar = () => {
    const k = Math.min(1, window.innerWidth / L, window.innerHeight / A);
    quadro.style.transform = `translate(-50%, -50%) scale(${k})`;
  };
  ajustar();
  window.addEventListener('resize', ajustar);
  rootElement.appendChild(quadro);
} else {
  // Dados locais (CountryData<N>.json, so no servidor de desenvolvimento): carregam-se ANTES de arrancar, para a primeira partida nova ja os usar. Sem ficheiro, segue de imediato.
  // O mod dos dados reais (public/dados_reais: nomes e escudos reais) vem primeiro e nunca falha; depois os dados locais.
  // O cambio do dia vem em paralelo e NAO atrasa a abertura: quando chegar, a interface redesenha (EVENTO_CAMBIO).
  atualizarCambioAoAbrir();
  carregarMod().then(() => carregarDadosLocais()).finally(() => {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });
}
