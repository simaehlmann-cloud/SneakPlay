#!/usr/bin/env python3
"""Store-Grafiken, die nicht in die App gehören:
store-assets/icon-512.png (512 × 512) und store-assets/feature-graphic.png
(1024 × 500, Vorstellungsgrafik). Motiv wie make-icons.py.

    python3 tools/make-store-assets.py"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
import importlib.util
spec = importlib.util.spec_from_file_location("mi", os.path.join(ROOT, "make-icons.py"))
OUT = os.path.join(ROOT, "store-assets")
os.makedirs(OUT, exist_ok=True)

# make-icons.py legt beim Import alle Icons neu an – das ist gewollt und harmlos.
mi = importlib.util.module_from_spec(spec); spec.loader.exec_module(mi)

mi.art(512, 0.06).convert("RGB").save(os.path.join(OUT, "icon-512.png"), optimize=True)

W, H = 1024, 500
fg = mi.gradient(W).resize((W, H)).convert("RGBA")
motif = mi.art(360, 0.0, transparent=True)
fg.paste(motif, (60, (H - 360) // 2 + 10), motif)
d = ImageDraw.Draw(fg)

def font(size, bold=True):
    for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
              "/System/Library/Fonts/Supplemental/Arial Bold.ttf", "C:/Windows/Fonts/arialbd.ttf"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

d.text((470, 160), "SneakPlay", font=font(84), fill=(244, 241, 255))
d.text((474, 268), "Bluffen · Missionen · Wort-Bombe", font=font(30, False), fill=(255, 210, 93))
d.text((474, 314), "Das Partyspiel für ein Handy", font=font(30, False), fill=(171, 164, 216))
fg.convert("RGB").save(os.path.join(OUT, "feature-graphic.png"), optimize=True)
print("Store-Grafiken in store-assets/")
