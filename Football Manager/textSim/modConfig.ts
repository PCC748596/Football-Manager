/*
A CONFIGURACAO DO MOD (Settings > Mod): ON/OFF e a pasta onde ele esta. Fica no `localStorage` (e nao no estado do jogo) porque e lida ANTES de o jogo abrir: o mod troca os nomes e os escudos da base
(textSim/modDados.ts). Por omissao esta ON e a pasta e `C:\Footmanager3D\mod`: quem criar a pasta ali ganha o mod; sem pasta o jogo corre com os nomes genericos.

O jogo le a pasta pelo endereco `api/mod/<ficheiro>?pasta=<caminho>`: o servidor local do jogo (tools/modServer.mjs; no desenvolvimento, o plugin do vite.config.ts; no jogo empacotado, o servidor do .exe)
serve os ficheiros da pasta escolhida. Um navegador sozinho nao le pastas do disco.
*/

export const CAMINHO_PADRAO_DO_MOD = 'C:\\Footmanager3D\\mod';

export interface ConfigMod { ativo: boolean; caminho: string }

const CHAVE_ATIVO = 'fm_mod_ativo', CHAVE_CAMINHO = 'fm_mod_caminho';

export const lerConfigMod = (): ConfigMod => {
  let ativo = true, caminho = CAMINHO_PADRAO_DO_MOD;
  try {
    const a = localStorage.getItem(CHAVE_ATIVO);
    if (a !== null) ativo = a === '1';
    const c = localStorage.getItem(CHAVE_CAMINHO);
    if (c && c.trim()) caminho = c.trim();
  } catch { /* sem localStorage: os valores por omissao */ }
  return { ativo, caminho };
};

export const gravarConfigMod = (c: Partial<ConfigMod>): void => {
  try {
    if (c.ativo !== undefined) localStorage.setItem(CHAVE_ATIVO, c.ativo ? '1' : '0');
    if (c.caminho !== undefined) localStorage.setItem(CHAVE_CAMINHO, c.caminho.trim() || CAMINHO_PADRAO_DO_MOD);
  } catch { /* sem localStorage */ }
};

/** O endereco de um ficheiro da pasta do mod, servido pelo servidor local. */
export const urlDaPastaDoMod = (arquivo: string, caminho: string): string =>
  new URL('api/mod/' + arquivo, document.baseURI).href + '?pasta=' + encodeURIComponent(caminho);

/** O parametro que o 3D (iframe, outra origem, sem acesso ao localStorage) recebe no endereco: a pasta do mod, ou nada (sem mod). */
export const parametroDoModNo3D = (origem: 'pasta' | null, caminho: string): string =>
  origem === 'pasta' ? '&mod=' + encodeURIComponent(caminho) : '';
