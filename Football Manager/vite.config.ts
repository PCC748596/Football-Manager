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
              if (face.rosto && !(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(face.rosto) && face.rosto.length < 20000)) throw new Error('rosto invalido');
            }
            const total = require_(path.resolve(__dirname, 'tools/gerar_faces.cjs')).gravar(__dirname, id, face ? { pele: face.pele, cabelo: face.cabelo, estilo: face.estilo, barba: face.barba, oculos: !!face.oculos, largura: Math.max(0.9, Math.min(1.1, Number(face.largura) || 1)), ...(face.rosto ? { rosto: face.rosto } : {}) } : null);
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

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), databaseSaverPlugin(), facesSaverPlugin(), simulador3dPlugin()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});