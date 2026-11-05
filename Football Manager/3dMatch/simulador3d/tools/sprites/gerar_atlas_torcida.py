"""Tira o fundo xadrez do spritesheet dos torcedores e gera o atlas com alpha.
Uso: python gerar_atlas_torcida.py <spritesheet.png> <saida_dir>
Saida: torcida_atlas.png e assets/torcida_atlas.js (data URI)."""
import sys, base64, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

src, out = sys.argv[1], sys.argv[2]
a = np.array(Image.open(src).convert('RGB')).astype(int)
H, W, _ = a.shape
sat = a.max(2) - a.min(2)
v = a.mean(2)
fundo_cand = (sat < 16) & (v < 118)          # o xadrez: cinzas escuros
lab, n = ndi.label(fundo_cand)
borda = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
fundo = np.isin(lab, list(borda))
# o xadrez tambem aparece dentro de buracos (entre braco e corpo): componentes grandes de cinza escuro
tam = ndi.sum(fundo_cand, lab, range(1, n + 1))
for i, t in enumerate(tam, 1):
    if t > 400: fundo |= (lab == i)
# franja anti-alias: pixel quase neutro escuro colado ao fundo
for _ in range(2):
    viz = ndi.binary_dilation(fundo, iterations=1)
    fundo |= viz & (sat < 30) & (v < 140)
alpha = np.where(fundo, 0, 255).astype(np.uint8)
alpha = ndi.binary_opening(alpha > 0, iterations=1).astype(np.uint8) * 255   # tira pontos soltos
rgba = np.dstack([a.astype(np.uint8), alpha])
Image.fromarray(rgba).save(out + '/sheet_alpha.png')

COLS, ROWS = 5, 4
# cada boneco = componente conexa maior dentro da sua celula
cw, ch = W / COLS, H / ROWS
caixas = []
for r in range(ROWS):
    for c in range(COLS):
        x0, x1 = int(c * cw), int((c + 1) * cw)
        y0, y1 = int(r * ch), int((r + 1) * ch)
        sub = alpha[y0:y1, x0:x1] > 0
        l2, k = ndi.label(ndi.binary_dilation(sub, iterations=3))
        if k == 0: caixas.append(None); continue
        sizes = ndi.sum(sub, l2, range(1, k + 1))
        keep = l2 == (1 + int(np.argmax(sizes)))
        ys, xs = np.where(keep & sub)
        caixas.append((x0 + xs.min(), y0 + ys.min(), x0 + xs.max() + 1, y0 + ys.max() + 1, x0, y0, keep & sub))
cellW = max(b[2] - b[0] for b in caixas) + 8
cellH = max(b[3] - b[1] for b in caixas) + 8
atlas = np.zeros((ROWS * cellH, COLS * cellW, 4), np.uint8)
info = []
for i, b in enumerate(caixas):
    r, c = divmod(i, COLS)
    x0, y0, x1, y1, ox, oy, m = b
    piece = rgba[y0:y1, x0:x1].copy()
    piece[..., 3] = np.where(m[y0 - oy:y1 - oy, x0 - ox:x1 - ox], piece[..., 3], 0)
    w, h = x1 - x0, y1 - y0
    px = c * cellW + (cellW - w) // 2          # centrado; pes (base) no fundo da celula
    py = r * cellH + cellH - 4 - h
    atlas[py:py + h, px:px + w] = piece
    info.append({'i': i, 'w': int(w), 'h': int(h)})
# sangra a cor dos pixels opacos para os transparentes (sem franja escura nos mipmaps / filtro linear)
op = atlas[..., 3] > 0
idx = ndi.distance_transform_edt(~op, return_distances=False, return_indices=True)
atlas[..., :3] = atlas[idx[0], idx[1], :3]
Image.fromarray(atlas).save(out + '/torcida_atlas.png')
bg = Image.new('RGBA', (atlas.shape[1], atlas.shape[0]), (60, 160, 60, 255)); bg.alpha_composite(Image.fromarray(atlas)); bg.convert('RGB').save(out + '/preview_verde.png')
png = open(out + '/torcida_atlas.png', 'rb').read()
js = '// Atlas dos adeptos (gerado por tools/sprites/gerar_atlas_torcida.py). 5x4 celulas.' + chr(10) + 'window.TORCIDA_ATLAS = "data:image/png;base64,' + base64.b64encode(png).decode() + '";' + chr(10)
open(out + '/../../assets/torcida_atlas.js', 'w').write(js)
