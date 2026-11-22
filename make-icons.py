#!/usr/bin/env python3
"""Erzeugt alle App-Icons und den Startbildschirm für SneakPlay.

    python3 make-icons.py

Motiv: pinkfarbene Augenmaske (geheime Rolle) auf violettem Grund, darüber
ein gelber Funke. iOS-Icons ohne Alphakanal (Transparenz wird beim Upload
abgelehnt). Android: klassische Icons je Dichte und adaptive Icons
(Vordergrund transparent, Hintergrundfarbe aus res/android/colors.xml).
Beide Workflows rufen dieses Skript vor dem Build auf. Aufbau wie bei
MatheSnack."""
import os
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
BG_TOP = (58, 36, 117)
BG_BOT = (23, 18, 47)
MASK = (255, 93, 143)
MASK_DARK = (214, 58, 110)
SPARK = (255, 210, 93)
BG_HEX = "#2A1D5C"


def gradient(W):
    g = Image.new("RGB", (1, 256))
    for y in range(256):
        f = y / 255
        g.putpixel((0, y), tuple(round(BG_TOP[i] * (1 - f) + BG_BOT[i] * f) for i in range(3)))
    return g.resize((W, W), Image.BICUBIC)


def art(size, pad=0.0, transparent=False):
    S = 4
    W = size * S
    im = Image.new("RGBA", (W, W), (0, 0, 0, 0)) if transparent else gradient(W).convert("RGBA")
    inner = W * (1 - 2 * pad)
    off = W * pad

    def P(x, y):                       # Koordinaten im Raum 0..100
        return (off + x / 100 * inner, off + y / 100 * inner)

    def box(cx, cy, rx, ry):
        return [*P(cx - rx, cy - ry), *P(cx + rx, cy + ry)]

    # Maske als Graustufen-Form: zwei Ellipsen + Steg, Augenlöcher ausgespart
    m = Image.new("L", (W, W), 0)
    d = ImageDraw.Draw(m)
    d.ellipse(box(29, 55, 26, 19), fill=255)
    d.ellipse(box(71, 55, 26, 19), fill=255)
    d.rectangle([*P(29, 44), *P(71, 64)], fill=255)
    # Nasenkerbe
    d.ellipse(box(50, 73, 10, 9), fill=0)
    holes = Image.new("L", (W, W), 0)
    hd = ImageDraw.Draw(holes)
    hd.ellipse(box(30, 53, 12, 7.5), fill=255)
    hd.ellipse(box(70, 53, 12, 7.5), fill=255)
    holes = holes.filter(ImageFilter.GaussianBlur(W / 400))
    shape = Image.composite(Image.new("L", (W, W), 0), m, holes)

    # Schatten
    if not transparent:
        sh = shape.filter(ImageFilter.GaussianBlur(W / 60))
        im.paste(Image.new("RGBA", (W, W), (8, 4, 24, 150)), (0, round(W * 0.025)), sh)
    # Rand dunkler, Fläche heller
    im.paste(Image.new("RGBA", (W, W), MASK_DARK + (255,)), (0, 0), shape)
    inner_shape = shape.filter(ImageFilter.MinFilter(max(3, (W // 90) | 1)))
    im.paste(Image.new("RGBA", (W, W), MASK + (255,)), (0, 0), inner_shape)
    # Bänder
    dd = ImageDraw.Draw(im)
    lw = round(inner * 0.035)
    
    # Funke oben rechts
    cx, cy, r = 80, 20, 10
    pts = []
    import math
    for k in range(8):
        a = math.pi / 4 * k - math.pi / 2
        rr = r if k % 2 == 0 else r * 0.32
        pts.append(P(cx + rr * math.cos(a), cy + rr * math.sin(a)))
    dd.polygon(pts, fill=SPARK)
    return im.resize((size, size), Image.LANCZOS)


def save(im, *parts):
    path = os.path.join(HERE, *parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if parts[0] == "res" and parts[1] == "ios":  # iOS: ohne Alphakanal
        im = im.convert("RGB")
    im.save(path, optimize=True)


# App (Startseite) und Pages-Seiten
save(art(192, 0.06), "www", "icon-192.png")
save(art(192, 0.06), "docs", "icon-192.png")
for s in (20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024):
    save(art(s, 0.06), "res", "ios", f"icon-{s}.png")

splash = Image.new("RGB", (2732, 2732), BG_BOT)
motif = art(640, 0.0, transparent=True)
splash.paste(motif, ((2732 - 640) // 2, (2732 - 640) // 2), motif)
save(splash, "res", "ios", "Default@2x~universal~anyany.png")

DICHTEN = {"ldpi": 0.75, "mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
for name, f in DICHTEN.items():
    save(art(round(48 * f), 0.06), "res", "android", f"icon_{name}.png")
    save(art(round(108 * f), 0.2, transparent=True), "res", "android", f"icon_fg_{name}.png")
with open(os.path.join(HERE, "res", "android", "colors.xml"), "w", encoding="utf-8") as fh:
    fh.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
             f'    <color name="sneakplay_icon_background">{BG_HEX}</color>\n</resources>\n')
print("Icons erzeugt")
