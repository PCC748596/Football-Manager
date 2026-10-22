/*
Regrava no banco de faces (3dMatch/simulador3d/data/faces.json e derivados) os jogadores de teste, lendo as fotos em tests/fixtures (RGBA cru) com o mesmo leitor do Editor de Faces.
Uso: npx tsx tools/regravar_faces_teste.ts
*/
import fs from 'node:fs';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { lerFaceDaFoto, rostoPixelado, cabeloPixelado, RESOLUCAO_ROSTO, RESOLUCAO_CABELO } from '../textSim/faceFromPhoto';

const require = createRequire(import.meta.url);
const { gravar } = require('./gerar_faces.cjs');

const crc = (buf: Buffer) => { let c, t = crc.t || (crc.t = Array.from({ length: 256 }, (_, n) => { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; })); let r = 0xffffffff; for (const b of buf) r = t[(r ^ b) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
crc.t = undefined as any;
const chunk = (tipo: string, dados: Buffer) => { const t = Buffer.from(tipo), len = Buffer.alloc(4); len.writeUInt32BE(dados.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([t, dados]))); return Buffer.concat([len, t, dados, c]); };
const png = (rgba: Uint8ClampedArray | Uint8Array, w: number, h: number) => {
  const linhas = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { linhas[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(linhas, y * (w * 4 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return 'data:image/png;base64,' + Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(linhas)), chunk('IEND', Buffer.alloc(0))]).toString('base64');
};

for (const [id, nome] of [[269253, 'martinelli'], [269245, 'fabio']] as const) {
  const meta = JSON.parse(fs.readFileSync(`tests/fixtures/${nome}.json`, 'utf8'));
  const img = { data: fs.readFileSync(`tests/fixtures/${nome}.rgba`), width: meta.width, height: meta.height };
  const r = lerFaceDaFoto(img);
  const rosto = png(rostoPixelado(img, r.detalhe), RESOLUCAO_ROSTO.w, RESOLUCAO_ROSTO.h);
  const cab = cabeloPixelado(img, r.detalhe);
  gravar(process.cwd(), id, { ...r.face, rosto, ...(cab ? { cabeloTextura: png(cab, RESOLUCAO_CABELO.w, RESOLUCAO_CABELO.h) } : {}) });
  console.log(nome, id, r.face.estilo, r.face.barba, 'rosto', rosto.length);
}
