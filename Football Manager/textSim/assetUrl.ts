/*
O CAMINHO DE UM FICHEIRO DE Assets (escudos, camisas, bandeiras, logos das copas). Era escrito como '/Assets/...', a partir da RAIZ do dominio: no GitHub Pages o jogo vive em /Football-Manager/
e esse caminho apontava para fora dele (os escudos nao apareciam). Aqui passa a ser relativo a pagina (`document.baseURI`, o `base: './'` do Vite). Num servidor na raiz da o mesmo '/Assets/...'.
Os saves guardam o `logoUrl`/`kitUrls` ja com o caminho antigo: ao carregar, o mesmo caminho e corrigido por esta funcao.
*/
export const assetUrl = <T extends string | undefined | null>(u: T): T => {
  if (typeof u !== 'string' || typeof document === 'undefined') return u;
  // Tambem /sponsors/ e /flags/ (a pasta public/ do Vite): em absoluto ('/sponsors/x.png') apontavam para a raiz do dominio e, no jogo instalado ou num sub-caminho (tablet), davam 404.
  const p = u.replace(/^(?:https?:\/\/[^/]+)?\/?(?=(?:Assets|sponsors|flags|dados_reais)\/)/, '');   // '/Assets/x' (ou o mesmo com o dominio de um save antigo) -> 'Assets/x'
  if (!/^(?:Assets|sponsors|flags|dados_reais)\//.test(p)) return u;
  return new URL(p, document.baseURI).pathname as T;
};
