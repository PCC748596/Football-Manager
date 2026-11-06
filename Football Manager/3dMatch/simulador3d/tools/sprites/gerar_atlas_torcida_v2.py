"""Atlas dos adeptos a partir do spritesheet de FUNDO BRANCO (JPG) em maior resolucao.
Uso: python gerar_atlas_torcida_v2.py <spritesheet.jpg> <saida_dir> [altura_de_pe_px=420]
Saida (nao toca no atlas em producao): torcida_atlas_v2.png, preview_v2_verde.png e assets/torcida_atlas_v2.js
(window.TORCIDA_ATLAS_V2 = { src, celulaW, celulaH, pxPorMetro, caixas }). Mesma grade 5x4 do atlas atual."""
import sys, base64, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

src, out = sys.argv[1], sys.argv[2]
ALTURA_DE_PE = float(sys.argv[3]) if len(sys.argv) > 3 else 420.0
a = np.array(Image.open(src).convert('RGB')).astype(int)
H, W, _ = a.shape
sat = a.max(2) - a.min(2)
v = a.mean(2)
# fundo branco: quase branco e neutro, ligado a borda (ou um buraco grande entre braco e corpo)
cand = (v > 226) & (sat < 30)
lab, n = ndi.label(cand)
borda = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
fundo = np.isin(lab, list(borda))
tam = ndi.sum(cand, lab, range(1, n + 1))
for i, t in enumerate(tam, 1):
    if t > 600: fundo |= (lab == i)
# franja de anti-alias do JPG: claro e neutro colado ao fundo
for _ in range(2):
    viz = ndi.binary_dilation(fundo, iterations=1)
    fundo |= viz & (sat < 45) & (v > 185)
alpha = ndi.binary_opening(~fundo, iterations=1)
rgba = np.dstack([a.astype(np.uint8), (alpha * 255).astype(np.uint8)])

# Cada boneco = uma componente conexa do desenho (a folha NAO tem grade regular: a 1.a linha tem 6 bonecos, as outras 5). Pedacos soltos (mao, boina) juntam-se ao boneco mais proximo.
dil = ndi.binary_dilation(alpha, iterations=2)
lab, n = ndi.label(dil)
areas = ndi.sum(alpha, lab, range(1, n + 1))
grandes = [i + 1 for i, t in enumerate(areas) if t > 20000]
objs = ndi.find_objects(lab)
caixas = {i: objs[i - 1] for i in grandes}
pecas_m = {i: (lab == i) & alpha for i in grandes}
for i, t in enumerate(areas, 1):
    if i in pecas_m or t < 30: continue
    ys, xs = np.where((lab == i) & alpha)
    cx, cy = xs.mean(), ys.mean()
    melhor = min(grandes, key=lambda g: np.hypot((caixas[g][1].start + caixas[g][1].stop) / 2 - cx, (caixas[g][0].start + caixas[g][0].stop) / 2 - cy))
    pecas_m[melhor] |= (lab == i) & alpha
figs = []
for i, m in pecas_m.items():
    ys, xs = np.where(m)
    figs.append(((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1), m, (ys.min() + ys.max()) / 2))
figs.sort(key=lambda f: f[2])
# linhas: separa onde o centro vertical salta mais de 250 px
linhas, atual = [], [figs[0]]
for f in figs[1:]:
    if f[2] - atual[-1][2] > 250: linhas.append(atual); atual = []
    atual.append(f)
linhas.append(atual)
pecas = []
for ln in linhas:
    for f in sorted(ln, key=lambda f: f[0][0]):
        box, m, _ = f
        pecas.append((box, m[box[1]:box[3], box[0]:box[2]]))
LINHAS = [len(l) for l in linhas]
ROWS, COLS = len(LINHAS), max(LINHAS)
print('bonecos por linha:', LINHAS)
# escala: o boneco de pe da celula 0 (linha 0, col 0) fica com ALTURA_DE_PE px
ref = pecas[0][0]
s = ALTURA_DE_PE / (ref[3] - ref[1])
# a cor dos opacos sangra para os transparentes ANTES de reduzir (sem franja branca no filtro)
def reduzir(box, m):
    p = rgba[box[1]:box[3], box[0]:box[2]].copy()
    p[..., 3] = np.where(m, 255, 0)
    op = p[..., 3] > 0
    idx = ndi.distance_transform_edt(~op, return_distances=False, return_indices=True)
    p[..., :3] = p[idx[0], idx[1], :3]
    w, h = max(1, round(p.shape[1] * s)), max(1, round(p.shape[0] * s))
    im = Image.fromarray(p).resize((w, h), Image.LANCZOS)
    arr = np.array(im)
    arr[..., 3] = np.where(arr[..., 3] > 127, 255, 0)   # alphaTest do jogo = corte seco
    return arr
red = [reduzir(*p) if p else None for p in pecas]
MARGEM = 8
cellW = max(p.shape[1] for p in red if p is not None) + MARGEM
cellH = max(p.shape[0] for p in red if p is not None) + MARGEM
atlas = np.zeros((ROWS * cellH, COLS * cellW, 4), np.uint8)
info = []
pos = [(r, c) for r, n_ in enumerate(LINHAS) for c in range(n_)]
for i, p in enumerate(red):
    r, c = pos[i]
    if p is None: info.append(None); continue
    h, w = p.shape[:2]
    px, py = c * cellW + (cellW - w) // 2, r * cellH + cellH - MARGEM // 2 - h   # centrado, pes no fundo da celula
    atlas[py:py + h, px:px + w] = p
    info.append({'i': i, 'r': r, 'c': c, 'w': int(w), 'h': int(h)})
op = atlas[..., 3] > 0
idx = ndi.distance_transform_edt(~op, return_distances=False, return_indices=True)
atlas[..., :3] = atlas[idx[0], idx[1], :3]
Image.fromarray(atlas).save(out + '/torcida_atlas_v2.png', optimize=True)
bg = Image.new('RGBA', (atlas.shape[1], atlas.shape[0]), (60, 160, 60, 255)); bg.alpha_composite(Image.fromarray(atlas)); bg.convert('RGB').save(out + '/preview_v2_verde.png')
png = open(out + '/torcida_atlas_v2.png', 'rb').read()
meta = {'colunas': COLS, 'linhas': ROWS, 'celulaW': int(cellW), 'celulaH': int(cellH), 'pxPorMetro': round(120 * ALTURA_DE_PE / 210, 1), 'caixas': info}
js = '// Atlas dos adeptos v2 (gerado por tools/sprites/gerar_atlas_torcida_v2.py). 5x4 celulas.\nwindow.TORCIDA_ATLAS_V2 = Object.assign(' + json.dumps(meta) + ', { src: "data:image/png;base64,' + base64.b64encode(png).decode() + '" });\n'
open(out + '/../../assets/torcida_atlas_v2.js', 'w').write(js)
print('celula', cellW, 'x', cellH, 'atlas', atlas.shape[1], 'x', atlas.shape[0], 'png', len(png) // 1024, 'KB; escala', round(s, 3), 'pxPorMetro', meta['pxPorMetro'])
