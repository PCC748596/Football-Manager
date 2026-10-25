"""Extrai as 2 cores principais de cada escudo (Assets/Escudos/<clube>.png) dos clubes EUROPEUS (country >= 65) e grava tools/cores_escudos_europa.json
({clube: {c1, c2}}); depois  node tools/cores_uniformes_escudos.cjs tools/cores_escudos_europa.json --ids 650001-899999 --manter-padrao  aplica-as aos uniformes.
c1 = a cor cromatica (saturada) mais presente; c2 = a cor mais presente que se distingue de c1 (pode ser branco ou preto, que num escudo costumam ser a 2.a cor do clube)."""
import json, re, sys, os
import numpy as np
from PIL import Image
raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
txt = open(os.path.join(raiz, 'textSim', 'realDatabase.ts'), encoding='utf8').read()
i = txt.index('export const REAL_TEAMS_JSON'); a = txt.index('= [', i) + 2; b = txt.index('\n];', a) + 2
teams = json.loads(txt[a:b])
def hexo(c): return '#%02x%02x%02x' % tuple(int(x) for x in c)
def dist(x, y): return max(abs(int(p) - int(q)) for p, q in zip(x, y))
saida = {}
for t in teams:
    if int(t.get('country') or 0) < 65: continue
    f = os.path.join(raiz, 'Assets', 'Escudos', t['teamName'] + '.png')
    if not os.path.exists(f): continue
    try: im = Image.open(f).convert('RGBA')
    except Exception: continue
    im.thumbnail((96, 96))
    px = np.array(im).reshape(-1, 4)
    px = px[px[:, 3] > 200][:, :3]
    if len(px) < 30: continue
    q = (px // 32) * 32 + 16                      # 8 niveis por canal
    cores, n = np.unique(q, axis=0, return_counts=True)
    ordem = np.argsort(-n)
    mx, mn = cores.max(1), cores.min(1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    cromatica = [k for k in ordem if sat[k] > 0.35 and mx[k] > 60]
    c1 = cores[cromatica[0]] if cromatica else cores[ordem[0]]
    c2 = next((cores[k] for k in ordem if dist(cores[k], c1) > 90 and n[k] > len(px) * 0.04), None)
    if c2 is None: c2 = np.array([255, 255, 255]) if c1.mean() < 150 else np.array([17, 17, 17])
    saida[t['teamName']] = {'c1': hexo(c1), 'c2': hexo(c2)}
json.dump(saida, open(os.path.join(raiz, 'tools', 'cores_escudos_europa.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(len(saida), 'clubes')
