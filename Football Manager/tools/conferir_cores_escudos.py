"""Compara as cores do uniforme da casa (color/color2) de cada clube europeu com a paleta do escudo (as cores que ocupam mais de 3% do escudo). Mostra os que tem uma cor do
uniforme que NAO existe no escudo (com a cor mais parecida do escudo). Uso: python tools/conferir_cores_escudos.py [--aplicar]"""
import json, os, sys, colorsys
import numpy as np
from PIL import Image
raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
txt = open(os.path.join(raiz, 'textSim', 'realDatabase.ts'), encoding='utf8').read()
i = txt.index('export const REAL_TEAMS_JSON'); a = txt.index('= [', i) + 2; b = txt.index('\n];', a) + 2
teams = json.loads(txt[a:b])
NOMES = {'red': '#c8102e', 'white': '#ffffff', 'black': '#111111', 'blue': '#1d4ed8', 'lightblue': '#6cb4ee', 'navy': '#1e3a8a', 'yellow': '#facc15', 'green': '#15803d', 'orange': '#ea580c',
         'maroon': '#7f1d1d', 'violet': '#6d28d9', 'purple': '#6d28d9', 'pink': '#f472b6', 'gray': '#9ca3af', 'grey': '#9ca3af', 'skyblue': '#87ceeb', 'gold': '#d97706'}
def rgb(h):
    h = (h or '').strip().lower()
    h = NOMES.get(h, h)
    if not h.startswith('#') or len(h) != 7: return None
    return np.array([int(h[k:k + 2], 16) for k in (1, 3, 5)])
def hexo(c): return '#%02x%02x%02x' % tuple(int(x) for x in c)
def paleta(f):
    im = Image.open(f).convert('RGBA'); im.thumbnail((96, 96))
    px = np.array(im).reshape(-1, 4); px = px[px[:, 3] > 200][:, :3]
    if len(px) < 30: return []
    q = (px // 32) * 32 + 16
    cores, n = np.unique(q, axis=0, return_counts=True)
    return [(cores[k], n[k] / len(px)) for k in np.argsort(-n) if n[k] / len(px) > 0.03]
def parecida(c, pal): return min(pal, key=lambda p: np.abs(p[0] - c).max())
ruins = []
for t in teams:
    if int(t.get('country') or 0) < 65: continue
    f = os.path.join(raiz, 'Assets', 'Escudos', t['teamName'] + '.png')
    if not os.path.exists(f): continue
    try: pal = paleta(f)
    except Exception: continue
    if not pal: continue
    kit = t.get('homeKit') or {}
    for campo in ('color1', 'color2'):
        c = rgb(kit.get(campo) or (t.get('color') if campo == 'color1' else t.get('color2')))
        if c is None: continue
        p = parecida(c, pal)
        if np.abs(p[0] - c).max() > 110:
            ruins.append((t['teamName'], campo, hexo(c), hexo(p[0]), t))
print(len(ruins), 'cores do uniforme sem correspondente no escudo')
for n, campo, c, p, _ in ruins: print(f'  {n:28s} {campo}: uniforme {c}  ->  escudo {p}')
