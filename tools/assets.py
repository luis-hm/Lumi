"""Gera os assets do app a partir da arte da equipe (pasta lumi_designs do Drive).
uso: python -I tools/assets.py <pasta_baixada_do_drive> web/public  (precisa de pillow, numpy, scipy, av)"""
import sys, pathlib
import numpy as np, av
from PIL import Image, ImageDraw
from scipy import ndimage

SRC, OUT = map(pathlib.Path, sys.argv[1:3])
(OUT / 'lumi').mkdir(parents=True, exist_ok=True)
(OUT / 'ui').mkdir(exist_ok=True)
(OUT / 'bg').mkdir(exist_ok=True)

def cut_bg(rgb, key, tol, enclosed_tol=None):
    """alpha=0 para pixels parecidos com `key` ligados à borda (e, opcional, bolsões fechados bem parecidos)."""
    a = rgb.astype(int); d = np.sqrt(((a - key) ** 2).sum(-1))
    lab, _ = ndimage.label(d < tol)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    if enclosed_tol: bg |= d < enclosed_tol
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    alpha = ndimage.binary_erosion(alpha > 0, iterations=1).astype(np.uint8) * 255  # come o halo
    return Image.fromarray(np.dstack([rgb, alpha]), 'RGBA')

def chroma(rgb, lim=120):
    """fundo verde: dominância do verde > 120 ligada à borda, ou > 150 em bolsões fechados."""
    a = rgb.astype(int); dom = a[..., 1] - np.maximum(a[..., 0], a[..., 2])
    lab, _ = ndimage.label(dom > lim)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    solid = ~(np.isin(lab, list(border)) | (dom > max(lim, 150)))
    solid = ndimage.binary_erosion(solid, iterations=1)
    edge = solid & ~ndimage.binary_erosion(solid, iterations=3)  # despill só na borda
    a[..., 1] = np.where(edge, np.minimum(a[..., 1], np.maximum(a[..., 0], a[..., 2]) + 10), a[..., 1])
    return Image.fromarray(np.dstack([a.clip(0, 255).astype(np.uint8), solid.astype(np.uint8) * 255]), 'RGBA')

def split_sprites(im, min_gap=6):
    """separa poses lado a lado por colunas totalmente transparentes."""
    al = np.array(im)[..., 3] > 8
    cols = al.any(0); out, x = [], 0
    while x < len(cols):
        if cols[x]:
            s = x
            while x < len(cols) and (cols[x:x + min_gap].any()): x += 1
            part = im.crop((s, 0, x, im.height)); out.append(part.crop(part.getbbox()))
        x += 1
    return [p for p in out if p.width > 60]

REF = (155, 192, 238)  # azul do Lumi em HSV do PIL (0-255), medido em cor-azul
ALVO = {'vermelho': (253, 219, 250), 'verde': (69, 156, 201), 'amarelo': (32, 252, 251)}  # medidos nas versões da equipe
def recolor(im, cor):
    rgb, a = im.convert('RGB'), im.getchannel('A')
    h, sat, v = [np.array(c, dtype=float) for c in rgb.convert('HSV').split()]
    th, ts, tv = ALVO[cor]
    azul = (abs(h - REF[0]) < 22) & (sat > 25) & (v > 120)
    w = np.clip((sat - 40) / 80, 0, 1) * azul  # bordas antisserrilhadas mudam aos poucos
    h = np.where(azul, th, h)
    sat = sat + w * (np.clip(sat * ts / REF[1], 0, 255) - sat)
    v = v + w * (np.clip(v * tv / REF[2], 0, 255) - v)
    out = Image.merge('HSV', [Image.fromarray(x.astype(np.uint8)) for x in (h, sat, v)]).convert('RGB')
    out.putalpha(a); return out

def fit(im, h):  # reduz para altura h; alfa quase zero (ruído do LANCZOS) vira zero, senão aparece um "vidro" na sala
    if im.height > h: im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
    if im.mode == 'RGBA': im.putalpha(im.getchannel('A').point(lambda a: 0 if a < 24 else a))
    return im

def save(im, name, h=520):
    fit(im.crop(im.getbbox()), h).save(OUT / name, 'WEBP', quality=88, alpha_quality=100, method=6); print(name)

# 1) vídeos chroma key -> WebP animado com transparência, recortado no Lumi
for v in ['acenando', 'brincando', 'comemorando', 'respirando', 'triste_pensativo', 'triste_sentando']:
    c = av.open(str(SRC / 'v' / f'{v}.mp4')); frames = []
    for i, f in enumerate(c.decode(video=0)):
        if i % 3: continue  # 8 fps: as animações são lentas e o arquivo fica 1/3 menor
        frames.append(chroma(f.to_ndarray(format='rgb24'), 60 if v == 'comemorando' else 120))
    box = frames[0].getbbox()
    for fr in frames[1:]:
        b = fr.getbbox(); box = (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
    frames = [fit(fr.crop(box), 480) for fr in frames]
    for cor in [None, *ALVO]:
        fs = [recolor(f, cor) for f in frames] if cor else frames
        fs[0].save(OUT / 'lumi' / f'{v}{"-" + cor if cor else ""}.webp', 'WEBP', save_all=True, append_images=fs[1:],
                   duration=125, loop=0, quality=75, alpha_quality=100, method=4)
    print('video', v, len(frames), frames[0].size)

# 2) sprites PNG (fundo transparente)
def png(n): return Image.open(SRC / n).convert('RGBA')
def tercos(nome):  # sprites colados demais para separar por coluna vazia
    im = png(nome); im = im.crop(im.getbbox()); w = im.width / 3
    return [im.crop((round(i * w), 0, round((i + 1) * w), im.height)) for i in range(3)]
for p, n in zip(tercos('0_cores.png'), ['vermelho', 'verde', 'amarelo']): save(p, f'lumi/cor-{n}.webp')
save(tercos('6_pensando_confuso.png')[1], 'lumi/pensando.webp')
for name, parts in [('8_comemorando.png', ['comemorando-pose']),
                    ('5_pensando_triste.png', ['pensando-triste']),
                    ('r_triste.png', ['triste-sentado'])]:
    for p, n in zip(split_sprites(png(name)), parts):
        if n: save(p, f'lumi/{n}.webp')

# 3) JPGs de fundo branco -> recorte
def white(n): return cut_bg(np.array(Image.open(SRC / n).convert('RGB')), np.array([255, 255, 255]), 40)
save(split_sprites(white('r_standard.jpg'))[0], 'lumi/cor-azul.webp')
save(split_sprites(white('r_apontando_feliz.jpg'))[1], 'lumi/apontando.webp')

# 4) cartões e carinhas
for p, n in zip(split_sprites(png('2_cenarios.png')), ['guardar', 'esperar', 'dormir']): save(p, f'ui/cena-{n}.webp', 360)
for p, n in zip(split_sprites(png('c_opcoes.png')), ['respirar', 'contar', 'tchau']): save(p, f'ui/estrategia-{n}.webp', 360)
for p, n in zip(split_sprites(white('5_emocao_gemini.jpg')), ['feliz', 'triste', 'preocupado', 'bravo', 'calmo']):
    save(p, f'ui/emocao-{n}.webp', 240)

# 5) logo da tela inicial da equipe
home = np.array(Image.open(SRC / '1_inicio_gemini.jpg').convert('RGB'))
crop = home[90:500, 110:1030]
save(cut_bg(crop, crop[5, 5].astype(int), 28), 'ui/logo.webp', 300)

# 6) fundos: sala azul sem os blocos pintados no tapete (viram interativos), sala amarela
sala = Image.open(SRC / 'fundo_sala_azul.jpg').convert('RGB'); d = ImageDraw.Draw(sala)
band, light, cx = (122, 184, 245), (166, 214, 254), 1264
def ell(cy, a, b, c): d.ellipse((cx - a, cy - b, cx + a, cy + b), fill=c)
ell(1409.5, 1073 - 10, 235.5 - 10, band)
ell(1396.5, 871, 176.5, light)
ell(1393.5, 770, 148.5, band)
sala.resize((1920, round(1920 * sala.height / sala.width)), Image.LANCZOS).save(OUT / 'bg/sala-azul.jpg', quality=85)
am = Image.open(SRC / 'c_sala_amarela.jpg').convert('RGB')
am.resize((1920, round(1920 * am.height / am.width)), Image.LANCZOS).save(OUT / 'bg/sala-amarela.jpg', quality=85)
for pose in ['pensando', 'apontando']:
    base = Image.open(OUT / 'lumi' / f'{pose}.webp')
    for cor in ALVO: recolor(base, cor).save(OUT / 'lumi' / f'{pose}-{cor}.webp', 'WEBP', quality=88, alpha_quality=100)
print('ok')
