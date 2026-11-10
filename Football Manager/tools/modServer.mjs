/*
O SERVIDOR DO MOD: serve os ficheiros de uma pasta do disco escolhida pelo jogador (Settings > Mod; por omissao C:\Footmanager3D\mod) em
    GET api/mod/<ficheiro-relativo>?pasta=<caminho absoluto>

Usado pelo plugin do vite.config.ts (desenvolvimento e `vite preview`) e deve ser usado tambem pelo servidor do jogo empacotado (.exe): `servirMod(req, res)` e uma funcao Node pura (http.IncomingMessage ->
http.ServerResponse); responde 404 a tudo o que nao existir ou nao for permitido. So le ficheiros DENTRO da pasta, de tipos conhecidos (json, js, imagens), nunca sobe com `..`.
*/
import fs from 'fs';
import path from 'path';

const TIPOS = { '.json': 'application/json; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' };

/** `url` e o que vem depois de `/api/mod`: `/clubes.json?pasta=C%3A%5C...`. Devolve true se tratou o pedido. */
export function servirMod(req, res, url = req.url) {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; res.end(); return true; }
    const u = new URL(String(url || '/'), 'http://local');
    const pasta = u.searchParams.get('pasta') || '';
    const rel = decodeURIComponent(u.pathname.replace(/^\/+/, ''));
    if (!pasta || !path.isAbsolute(pasta) || !rel || rel.includes('\0')) { res.statusCode = 404; res.end(); return true; }
    const raiz = path.resolve(pasta);
    const alvo = path.resolve(raiz, rel);
    const tipo = TIPOS[path.extname(alvo).toLowerCase()];
    if (!tipo || (alvo !== raiz && !alvo.startsWith(raiz + path.sep)) || !fs.existsSync(alvo) || !fs.statSync(alvo).isFile()) { res.statusCode = 404; res.end(); return true; }
    res.setHeader('Content-Type', tipo);
    res.setHeader('Cache-Control', 'no-store');
    res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(alvo));
    return true;
  } catch {
    res.statusCode = 404; res.end(); return true;
  }
}
