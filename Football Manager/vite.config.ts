import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import fs from 'fs';
import { createRequire } from 'module';
const require_ = createRequire(import.meta.url);

function databaseSaverPlugin() {
  return {
    name: 'database-saver',
    configureServer(server) {
      server.middlewares.use('/api/save-database', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const { countries, teams, players } = data;
              const content = `\n// Paste your full JSON content here in the respective arrays.\n\nexport const REAL_COUNTRIES_JSON: any[] = ${JSON.stringify(countries, null, 2)};\n\nexport const REAL_TEAMS_JSON: any[] = ${JSON.stringify(teams, null, 2)};\n\nexport const REAL_PLAYERS_JSON: any[] = ${JSON.stringify(players, null, 2)};\n`;
              fs.writeFileSync(path.resolve(__dirname, 'textSim/realDatabase.ts'), content, 'utf8');
              
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true }));
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: e.message || e.toString() }));
            }
          });
        } else {
          res.statusCode = 404;
          res.end();
        }
      });
    }
  };
}

// O botao de gravar do manager (GameContext.saveGame) descarrega o save no browser E manda uma copia para aqui: fica na pasta `saves/` do projeto (um nivel acima desta), no disco local. So existe no servidor de desenvolvimento.
function saveGameLocalPlugin() {
  return {
    name: 'save-game-local',
    configureServer(server) {
      server.middlewares.use('/api/save-game', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 404; res.end(); return; }
        const nome = String(req.headers['x-save-name'] || '');
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            if (!/^[A-Za-z0-9_-]{1,80}\.json$/.test(nome)) throw new Error('nome invalido');
            JSON.parse(body);   // so grava JSON valido
            const pasta = path.resolve(__dirname, '../saves');
            fs.mkdirSync(pasta, { recursive: true });
            fs.writeFileSync(path.join(pasta, nome), body, 'utf8');
            res.setHeader('Content-Type', 'application/json'); res.statusCode = 200; res.end(JSON.stringify({ success: true, ficheiro: path.join(pasta, nome) }));
          } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message || String(e) })); }
        });
      });
    }
  };
}

// Serve o simulador 3D (3dMatch/simulador3d) em /simulador3d/ no dev e copia para dist/ no build.
// A pagina corre dentro de um iframe do manager (ver 3dMatch/simulador3dCliente.ts).
// O Editor de Faces (components/FaceEditor.tsx) grava a face de um jogador por aqui: atualiza data/faces.json e regenera data/faces.js (3D) e textSim/facesDatabase.ts (manager).
function facesSaverPlugin() {
  return {
    name: 'faces-saver',
    configureServer(server) {
      server.middlewares.use('/api/save-face', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 404; res.end(); return; }
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const { id, face } = JSON.parse(body);
            if (!/^\d+$/.test(String(id))) throw new Error('id invalido');
            if (face) {
              const ok = /^#[0-9a-f]{6}$/i;
              if (!ok.test(face.pele) || !ok.test(face.cabelo)) throw new Error('cor invalida');
              if (!['curto', 'degrade', 'raspado', 'longo', 'topete', 'careca'].includes(face.estilo)) throw new Error('estilo invalido');
              if (!['nenhuma', 'rala', 'cheia', 'bigode', 'cavanhaque'].includes(face.barba)) throw new Error('barba invalida');
              for (const campo of ['rosto', 'cabeloTextura']) if (face[campo] && !(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(face[campo]) && face[campo].length < 20000)) throw new Error(campo + ' invalido');
            }
            const total = require_(path.resolve(__dirname, 'tools/gerar_faces.cjs')).gravar(__dirname, id, face ? { pele: face.pele, cabelo: face.cabelo, estilo: face.estilo, barba: face.barba, oculos: !!face.oculos, largura: Math.max(0.9, Math.min(1.1, Number(face.largura) || 1)), ...(face.rosto ? { rosto: face.rosto } : {}), ...(face.cabeloTextura ? { cabeloTextura: face.cabeloTextura } : {}) } : null);
            res.setHeader('Content-Type', 'application/json'); res.statusCode = 200; res.end(JSON.stringify({ success: true, total }));
          } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message || String(e) })); }
        });
      });
    }
  };
}

function simulador3dPlugin() {
  const raiz = path.resolve(__dirname, '3dMatch/simulador3d');
  const tipos: Record<string, string> = {
    '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml', '.obj': 'text/plain', '.hdr': 'application/octet-stream'
  };
  const copiar = (de: string, para: string) => {
    fs.mkdirSync(para, { recursive: true });
    for (const e of fs.readdirSync(de, { withFileTypes: true })) {
      // Testes, ferramentas e documentacao do 3D ficam na pasta do codigo mas nao vao para o build.
      if (de === raiz && ['tests', 'tools', 'docs', 'node_modules'].includes(e.name)) continue;
      if (/^(.*\.md|animEditor\.html|teamBtView\.html|bump_version\.js|package\.json)$/.test(e.name)) continue;
      const a = path.join(de, e.name), b = path.join(para, e.name);
      if (e.isDirectory()) copiar(a, b); else fs.copyFileSync(a, b);
    }
  };
  return {
    name: 'simulador3d',
    configureServer(server: any) {
      server.middlewares.use('/simulador3d', (req: any, res: any, next: any) => {
        const url = decodeURIComponent((req.url || '/').split('?')[0]);
        const rel = url === '/' ? '/index.html' : url;
        const ficheiro = path.normalize(path.join(raiz, rel));
        if (!ficheiro.startsWith(raiz) || !fs.existsSync(ficheiro) || fs.statSync(ficheiro).isDirectory()) return next();
        res.setHeader('Content-Type', tipos[path.extname(ficheiro).toLowerCase()] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-cache');
        fs.createReadStream(ficheiro).pipe(res);
      });
    },
    closeBundle() {
      if (fs.existsSync(raiz)) copiar(raiz, path.resolve(__dirname, 'dist/simulador3d'));
    }
  };
}


/*
PWA OFFLINE (pedido: jogar no PC ou tablet sem internet). No fim do build:
  1. copia para o dist o que o jogo le pela raiz e o Vite nao copia: a pasta Assets (escudos, faces, bandeiras, camisas, sons), o manifest e os icones;
  2. escreve o `sw.js` com a lista de TODOS os ficheiros do dist (o manager, o simulador 3D e os Assets) e uma versao (a data do build): o service worker guarda-os todos na
     instalacao e serve-os da cache, com ou sem internet. Um build novo muda a versao e o service worker troca a cache.
Fica de fora o que so faz sentido no PC de desenvolvimento (as APIs de gravar a base, as faces e o save no disco).
*/
function pwaOfflinePlugin() {
  const copiarPasta = (de: string, para: string) => {
    if (!fs.existsSync(de)) return;
    fs.mkdirSync(para, { recursive: true });
    for (const e of fs.readdirSync(de, { withFileTypes: true })) {
      const a = path.join(de, e.name), b = path.join(para, e.name);
      if (e.isDirectory()) copiarPasta(a, b); else fs.copyFileSync(a, b);
    }
  };
  const listar = (raiz: string, rel = ''): string[] => {
    const out: string[] = [];
    for (const e of fs.readdirSync(path.join(raiz, rel), { withFileTypes: true })) {
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) out.push(...listar(raiz, r)); else out.push(r);
    }
    return out;
  };
  return {
    name: 'pwa-offline',
    apply: 'build' as const,
    enforce: 'post' as const,
    closeBundle: {
      sequential: true,
      order: 'post' as const,
      handler() {
        const dist = path.resolve(__dirname, 'dist');
        copiarPasta(path.resolve(__dirname, 'Assets'), path.join(dist, 'Assets'));
        for (const f of ['manifest.webmanifest', 'icon-192.png', 'FootManagerLogo512.png', 'favicon.ico']) {
          const a = path.resolve(__dirname, f);
          if (fs.existsSync(a)) fs.copyFileSync(a, path.join(dist, f));
        }
        const ficheiros = listar(dist).filter(f => f !== 'sw.js' && !/\.map$/.test(f)).map(f => './' + f.split(path.sep).join('/'));
        const versao = 'fm-' + new Date().toISOString().replace(/[-:.TZ]/g, '');
        const sw = `// GERADO no build (vite.config.ts, pwaOfflinePlugin): nao editar.
const CACHE = ${JSON.stringify(versao)};
const FICHEIROS = ${JSON.stringify(['./', ...ficheiros])};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(async (c) => {
    // Um a um: um ficheiro que falhe nao deita a instalacao inteira abaixo.
    for (const f of FICHEIROS) { try { await c.add(new Request(f, { cache: 'reload' })); } catch (err) { console.warn('[sw] nao guardou', f); } }
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // Da cache primeiro (sem internet funciona); o que nao estiver la vai a rede e fica guardado. A query (?oculto=1&...) nao conta para a cache.
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try { const r = await fetch(req); if (r && r.ok) c.put(req, r.clone()); return r; }
    catch (err) { return (await c.match('./index.html')) || Response.error(); }
  }));
});
`;
        fs.writeFileSync(path.join(dist, 'sw.js'), sw, 'utf8');
        let total = 0; for (const f of ficheiros) { try { total += fs.statSync(path.join(dist, f)).size; } catch { /* */ } }
        console.log(`[pwa] sw.js: ${ficheiros.length} ficheiros, ${(total / 1048576).toFixed(1)} MB, cache ${versao}`);
      }
    }
  };
}

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      // O build servido (npm run preview) tambem na rede de casa: sem isto o Vite so escuta no proprio PC.
      preview: {
        port: 4173,
        host: '0.0.0.0',
      },
      plugins: [react(), databaseSaverPlugin(), facesSaverPlugin(), saveGameLocalPlugin(), simulador3dPlugin(), pwaOfflinePlugin()],
      // Caminhos relativos no build: o jogo instalado (PWA) abre de qualquer pasta / sub-caminho.
      base: './',
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});