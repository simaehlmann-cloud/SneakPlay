#!/usr/bin/env python3
"""Store-Bilder mit Überschrift aus den Bildschirmfotos (nicht Teil der App).

    node tools/screenshots.js        # zuerst die nackten Bildschirmfotos
    python3 tools/make-listing.py    # dann die gestalteten Store-Bilder

Ergebnis: store-assets/listing/<format>-<sprache>-<nr>.png
  phone69 = 1320 × 2868 (App Store Connect, iPhone 6,9″)
  phone63 = 1206 × 2622 (App Store Connect, iPhone 6,3″ – mittleres Display)
  ipad13  = 2064 × 2752 (App Store Connect, iPad 13″)
  play    = 1080 × 1920 (Play Console, Smartphone)
Überschriften ohne Marken- oder Plattformnamen."""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "store-assets", "screens")
OUT = os.path.join(ROOT, "store-assets", "listing")
TOP, BOT = (58, 36, 117), (23, 18, 47)
GOLD, WHITE = (255, 210, 93), (244, 241, 255)

SHOTS = ["1", "2", "3", "3b", "4", "5", "6", "7"]
CAPTIONS = {
    "de": {
        "1": ("Ein Handy. Vier Spiele.", "Für Partys, Spieleabend und Unterricht"),
        "2": ("Geheim aufdecken", "Finger drauf – loslassen – weg"),
        "3": ("Zahlen-Hochstapler", "½, 0,5 oder 50 % – wer passt nicht?"),
        "3b": ("Erklären ohne verbotene Wörter", "Mathe-Begriffe nach Klassenstufe"),
        "4": ("Geheime Missionen", "Wer hat gar keine?"),
        "5": ("Die Wort-Bombe tickt", "Begriff nennen – und weiter!"),
        "6": ("Auszeichnungen & Punkte", "Für den ganzen Abend"),
        "7": ("Eigene Karten teilen", "Per QR-Code – ohne Konto, ohne Server"),
    },
    "en": {
        "1": ("One phone. Four games.", "For parties, game nights and lessons"),
        "2": ("Reveal in secret", "Finger on – let go – hidden"),
        "3": ("Number imposter", "½, 0.5 or 50% – who doesn’t fit?"),
        "3b": ("Explain without forbidden words", "Maths terms by school year"),
        "4": ("Secret missions", "Who has none at all?"),
        "5": ("The word bomb is ticking", "Say a word – and pass it on!"),
        "6": ("Awards & scores", "For the whole evening"),
        "7": ("Share your own cards", "By QR code – no account, no server"),
    },
}


def font(size, bold=True):
    for p in (["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"] if bold else ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]) + [
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf", "C:/Windows/Fonts/arialbd.ttf"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def gradient(w, h):
    g = Image.new("RGB", (1, 256))
    for y in range(256):
        f = y / 255
        g.putpixel((0, y), tuple(round(TOP[i] * (1 - f) + BOT[i] * f) for i in range(3)))
    return g.resize((w, h), Image.BICUBIC)


def fit_text(draw, text, max_w, size, bold=True):
    while size > 20:
        f = font(size, bold)
        if draw.textlength(text, font=f) <= max_w:
            return f
        size -= 2
    return font(size, bold)


def compose(src, title, sub):
    shot = Image.open(src).convert("RGB")
    W, H = shot.size
    canvas = gradient(W, H)
    d = ImageDraw.Draw(canvas)
    pad = int(W * 0.07)
    ft = fit_text(d, title, W - 2 * pad, int(W * 0.075))
    fs = fit_text(d, sub, W - 2 * pad, int(W * 0.042), bold=False)
    y = int(H * 0.055)
    d.text((W / 2, y), title, font=ft, fill=WHITE, anchor="ma")
    y += int(ft.size * 1.25)
    d.text((W / 2, y), sub, font=fs, fill=GOLD, anchor="ma")
    top = int(H * 0.2)
    sw = int(W * 0.82)
    sh = int(shot.height * sw / shot.width)
    small = shot.resize((sw, sh), Image.LANCZOS)
    r = int(sw * 0.06)
    mask = Image.new("L", (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, sw - 1, sh + r], radius=r, fill=255)
    x = (W - sw) // 2
    shadow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(shadow).rounded_rectangle([x, top + 18, x + sw, top + sh + 18], radius=r, fill=170)
    shadow = shadow.filter(ImageFilter.GaussianBlur(W / 40))
    canvas.paste(Image.new("RGB", (W, H), (6, 3, 18)), (0, 0), shadow)
    border = Image.new("RGB", (sw + 8, sh + 8), (90, 70, 170))
    bmask = Image.new("L", (sw + 8, sh + 8), 0)
    ImageDraw.Draw(bmask).rounded_rectangle([0, 0, sw + 7, sh + 7 + r], radius=r + 4, fill=255)
    canvas.paste(border, (x - 4, top - 4), bmask)
    canvas.paste(small, (x, top), mask)
    return canvas


def main():
    os.makedirs(OUT, exist_ok=True)
    n = 0
    for fmt in ("phone69", "phone63", "ipad13", "play"):
        for lang in ("de", "en"):
            for i, key in enumerate(SHOTS, start=1):
                src = os.path.join(SRC, f"{fmt}-{lang}-{key}.png")
                if not os.path.exists(src):
                    continue
                title, sub = CAPTIONS[lang][key]
                if fmt == "ipad13":  # auf dem Tablet nicht vom Handy sprechen
                    title = title.replace("Ein Handy.", "Ein Gerät.").replace("One phone.", "One device.")
                compose(src, title, sub).save(os.path.join(OUT, f"{fmt}-{lang}-{i}.png"), optimize=True)
                n += 1
    print(f"{n} Store-Bilder in {OUT}")


if __name__ == "__main__":
    main()
