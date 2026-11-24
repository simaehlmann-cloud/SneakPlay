#!/usr/bin/env python3
"""SneakPlay – App-Vorschauen (App Store) und Werbevideo (YouTube) rendern.

    python3 render.py previews     # 4 App-Vorschauen (iPhone/iPad × DE/EN)
    python3 render.py youtube      # Werbevideo 1920 × 1080 (DE) + SRT (EN)
    python3 render.py stills       # nur Probebilder der vollsten Momente
"""
import json, os, subprocess, sys, shutil
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
FR = os.path.join(HERE, "frames")
TMP = os.path.join(HERE, "tmp")
OUT = os.path.join(HERE, "out")
ICON = os.path.join(HERE, "..", "..", "res", "ios", "icon-1024.png")
F_BOLD = "/usr/share/fonts/opentype/inter/InterDisplay-ExtraBold.otf"
F_SEMI = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"
TOP, BOT = (58, 36, 117), (23, 18, 47)
GOLD, WHITE = (255, 210, 93), (244, 241, 255)
FPS = 30

CAP = {
    "de": {
        "s1": ("Ein Handy. Vier Spiele.", "Für Partys, Spieleabend und Unterricht"),
        "s2": ("Geheim aufdecken", "Finger drauf – loslassen – weg"),
        "s3": ("Wer blufft?", "Hochstapler entlarven"),
        "s9": ("Geheime Missionen", "Wer hat gar keine?"),
        "s4": ("Erklär’s!", "Ohne die verbotenen Wörter"),
        "s5": ("Die Wort-Bombe tickt", "Begriff nennen – und weiter!"),
        "s6": ("Party oder Schule?", "Mit einem Tipp umschalten"),
        "s7": ("Punkte & Auszeichnungen", "Für den ganzen Abend"),
    },
    "en": {
        "s1": ("One phone. Four games.", "For parties, game nights and lessons"),
        "s2": ("Reveal in secret", "Finger on – let go – hidden"),
        "s3": ("Who’s bluffing?", "Expose the imposter"),
        "s9": ("Secret missions", "Who has none at all?"),
        "s4": ("Explain it!", "Without the forbidden words"),
        "s5": ("The word bomb is ticking", "Say a word – and pass it on!"),
        "s6": ("Party or school?", "Switch with one tap"),
        "s7": ("Scores & awards", "For the whole evening"),
    },
}
IPAD_S1 = {"de": "Ein Gerät. Vier Spiele.", "en": "One device. Four games."}
# Länge je Szene in der App-Vorschau (Summe ≤ 30 s)
PREVIEW = [("s1", 3.0), ("s2", 4.4), ("s3", 3.3), ("s9", 4.6), ("s4", 4.5), ("s5", 4.9), ("s6", 3.7)]

YT = [  # (Szene, Länge, Titel DE, Unterzeile DE, Titel EN, Unterzeile EN)
    ("intro", 3.2, "SneakPlay", "Das Partyspiel für Freizeit und Schule", "SneakPlay", "The party game for free time and school"),
    ("areas", 4.2, "", "", "Free time: parties, game nights, family and friends", "School: lessons, cover lessons, class trips"),
    ("s1", 3.0, "Ein Handy. Vier Spiele.", "Namen eintragen, Spiel wählen – los geht’s", "One phone. Four games.", "Enter names, pick a game – let’s go"),
    ("s2", 5.0, "Geheim aufdecken", "Finger drauf – loslassen – sofort wieder verdeckt", "Reveal in secret", "Finger on – let go – hidden again at once"),
    ("s3", 3.3, "Wer ist der Hochstapler?", "Diskutieren, abstimmen, entlarven", "Who is the imposter?", "Discuss, vote, expose"),
    ("s9", 4.6, "Geheime Missionen", "Heimliche Aufgaben im Gespräch – einer hat gar keine", "Secret missions", "Hidden tasks in conversation – one player has none"),
    ("s4", 5.6, "Erklär’s!", "Begriffe erklären – ohne die verbotenen Wörter", "Explain it!", "Explain words – without the forbidden ones"),
    ("s5", 5.6, "Die Wort-Bombe tickt", "Begriff nennen, Handy weiter – bevor es knallt", "The word bomb is ticking", "Say a word, pass the phone – before it goes bang"),
    ("s6", 3.9, "Party oder Schule?", "Party-Begriffe – oder Mathe, Deutsch und Englisch nach Klassenstufe", "Party or school?", "Party words – or maths, German and English by school year"),
    ("s8", 3.0, "Englisch? Auf Englisch!", "Englisch-Karten werden auf Englisch erklärt", "English? In English!", "English cards are explained in English"),
    ("s7", 2.9, "Punkte & Auszeichnungen", "Für die Party – oder die ganze Klasse", "Scores & awards", "For the party – or the whole class"),
    ("outro", 4.5, "Jetzt kostenlos laden", "Für Partys und Unterricht · iPhone, iPad und Android · ohne Konto, ohne Werbung", "Download now for free", "For parties and lessons · iPhone, iPad and Android · no account, no ads"),
]


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-2500:]); sys.exit(1)


def font(path, size):
    return ImageFont.truetype(path, size)


def fit(draw, text, path, size, max_w):
    while size > 16:
        f = font(path, size)
        if draw.textlength(text, font=f) <= max_w:
            return f
        size -= 2
    return font(path, size)


def gradient(w, h):
    g = Image.new("RGB", (1, 256))
    for y in range(256):
        k = y / 255
        g.putpixel((0, y), tuple(round(TOP[i] * (1 - k) + BOT[i] * k) for i in range(3)))
    return g.resize((w, h), Image.BICUBIC)


def band(w, h, title, sub):
    """Kopfband mit Überschrift für die App-Vorschau."""
    im = gradient(w, h)
    d = ImageDraw.Draw(im)
    pad = int(w * 0.06)
    ft = fit(d, title, F_BOLD, int(w * 0.082), w - 2 * pad)
    fs = fit(d, sub, F_SEMI, int(w * 0.046), w - 2 * pad)
    total = ft.size * 1.15 + fs.size * 1.2
    y = (h - total) / 2 + 6
    d.text((w / 2, y), title, font=ft, fill=WHITE, anchor="ma")
    d.text((w / 2, y + ft.size * 1.2), sub, font=fs, fill=GOLD, anchor="ma")
    return im


def frames_list(scene_dir, dur, path):
    """concat-Liste: jedes Bild bleibt bis zum nächsten stehen."""
    meta = json.load(open(os.path.join(scene_dir, "times.json")))
    t = meta["times"]
    lines = ["ffconcat version 1.0"]
    last = None
    for i, ti in enumerate(t):
        if ti >= dur:
            break
        nxt = t[i + 1] if i + 1 < len(t) else dur
        d = min(nxt, dur) - ti
        f = os.path.join(scene_dir, f"{i:05d}.jpg")
        lines += [f"file '{f}'", f"duration {d:.4f}"]
        last = f
    lines.append(f"file '{last}'")  # letzte Dauer zählt sonst nicht
    open(path, "w").write("\n".join(lines) + "\n")


ENC = ["-c:v", "libx264", "-preset", "veryfast", "-profile:v", "high", "-level", "4.0", "-pix_fmt", "yuv420p", "-r", str(FPS)]


def encode_scene(bg_png, scene_dir, dur, ox, oy, out, app_w=None, app_h=None, fade_out=False, extra_png=None, bitrate=True):
    lst = out + ".txt"
    frames_list(scene_dir, dur, lst)
    scale = f",scale={app_w}:{app_h}:flags=lanczos" if app_w else ""
    chain = f"[1:v]fps={FPS}{scale},format=rgb24[a];[0:v][a]overlay={ox}:{oy}:shortest=1"
    inputs = ["-framerate", str(FPS), "-i", bg_png, "-f", "concat", "-safe", "0", "-i", lst]
    if extra_png:
        inputs += ["-framerate", str(FPS), "-i", extra_png]
        chain += "[b];[b][2:v]overlay=0:0"
    chain += ",loop=0" if False else ""
    vf_end = f",trim=duration={dur},format=yuv420p"
    if fade_out:
        vf_end += f",fade=t=out:st={dur - 0.45:.2f}:d=0.45"
    rate = ["-b:v", "11M", "-maxrate", "12M", "-bufsize", "24M"] if bitrate else ["-crf", "18"]
    tmp = out[:-4] + ".part.mp4"
    run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", *inputs[0:2], *inputs[2:4]] if False else
        ["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", *inputs, "-filter_complex", chain + vf_end, "-t", f"{dur}", *ENC, *rate, "-an", tmp])
    os.replace(tmp, out)


def still_scene(png, dur, out, fade_in=False, fade_out=False, bitrate=False):
    vf = f"format=yuv420p,loop=-1:1,trim=duration={dur}"
    if fade_in:
        vf += ",fade=t=in:st=0:d=0.5"
    if fade_out:
        vf += f",fade=t=out:st={dur - 0.6:.2f}:d=0.6"
    rate = ["-b:v", "11M", "-maxrate", "12M", "-bufsize", "24M"] if bitrate else ["-crf", "18"]
    tmp = out[:-4] + ".part.mp4"
    run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", png, "-vf", vf, *ENC, *rate, "-an", tmp])
    os.replace(tmp, out)


def join(parts, out, silent_audio=True):
    lst = out + ".txt"
    open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
    joined = out[:-4] + ".v.mp4"
    run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", joined])
    tmp = out[:-4] + ".part.mp4"
    # Stille Stereospur: App Store Connect verlangt eine Tonspur
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", joined, "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
         "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", tmp])
    os.replace(tmp, out)
    os.remove(joined)


def previews():
    os.makedirs(OUT, exist_ok=True)
    for target, W, H, bh in (("phone", 886, 1920, 260), ("ipad", 1200, 1600, 220)):
        for lang in ("de", "en"):
            key = f"{target}-{lang}"
            work = os.path.join(TMP, key); os.makedirs(work, exist_ok=True)
            parts = []
            for i, (s, dur) in enumerate(PREVIEW):
                title, sub = CAP[lang][s]
                if target == "ipad" and s == "s1":
                    title = IPAD_S1[lang]
                bg = Image.new("RGB", (W, H), BOT)
                bg.paste(band(W, bh, title, sub), (0, 0))
                png = os.path.join(work, f"{s}.png"); bg.save(png)
                out = os.path.join(work, f"{i:02d}-{s}.mp4")
                encode_scene(png, os.path.join(FR, key, s), dur, 0, bh, out, fade_out=(i == len(PREVIEW) - 1))
                parts.append(out)
            name = {"phone": "app-vorschau-iphone", "ipad": "app-vorschau-ipad"}[target]
            final = os.path.join(OUT, f"{name}-{lang}.mp4")
            join(parts, final)
            print("fertig:", final)


# ---------- YouTube ----------
YW, YH = 1920, 1080
PH_H = 930                      # Bildschirmhöhe im Handy
PH_W = round(PH_H * 886 / 1660)  # 497
BEZ = 16


def yt_background():
    im = gradient(YW, YH)
    glow = Image.new("L", (YW, YH), 0)
    ImageDraw.Draw(glow).ellipse([1050, 80, 1750, 1000], fill=110)
    glow = glow.filter(ImageFilter.GaussianBlur(160))
    im.paste(Image.new("RGB", (YW, YH), (120, 70, 220)), (0, 0), glow)
    return im


def phone_geom():
    sx = 1260 - PH_W // 2 + 60
    sy = (YH - PH_H) // 2
    return sx, sy


def yt_frame_png(title, sub, path, with_phone=True, header=True):
    im = yt_background()
    d = ImageDraw.Draw(im)
    x0, maxw = 140, 840
    ft = fit(d, title, F_BOLD, 96, maxw)
    fs = fit(d, sub, F_SEMI, 44, maxw)
    # Unterzeile ggf. zweizeilig
    words, lines, cur = sub.split(), [], ""
    fs = font(F_SEMI, 42)
    for w in words:
        test = (cur + " " + w).strip()
        if d.textlength(test, font=fs) <= maxw:
            cur = test
        else:
            lines.append(cur); cur = w
    lines.append(cur)
    icon = Image.open(ICON).convert("RGBA").resize((110, 110), Image.LANCZOS)
    m = Image.new("L", icon.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, 109, 109], radius=26, fill=255)
    block_h = (150 if header else 0) + ft.size * 1.2 + len(lines) * fs.size * 1.3
    y = (YH - block_h) / 2
    if header:
        im.paste(icon, (x0, int(y)), m)
        d.text((x0 + 132, y + 55), "SneakPlay", font=font(F_BOLD, 46), fill=WHITE, anchor="lm")
        y += 150
    d.text((x0, y), title, font=ft, fill=WHITE)
    y += ft.size * 1.25
    for ln in lines:
        d.text((x0, y), ln, font=fs, fill=GOLD); y += fs.size * 1.3
    if with_phone:
        sx, sy = phone_geom()
        shadow = Image.new("L", (YW, YH), 0)
        ImageDraw.Draw(shadow).rounded_rectangle([sx - BEZ, sy - BEZ + 24, sx + PH_W + BEZ, sy + PH_H + BEZ + 24], radius=70, fill=180)
        shadow = shadow.filter(ImageFilter.GaussianBlur(40))
        im.paste(Image.new("RGB", (YW, YH), (5, 2, 15)), (0, 0), shadow)
    im.save(path)


def yt_bezel_png(path):
    """Handyrahmen mit transparentem Bildschirm (abgerundet)."""
    sx, sy = phone_geom()
    im = Image.new("RGBA", (YW, YH), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([sx - BEZ, sy - BEZ, sx + PH_W + BEZ, sy + PH_H + BEZ], radius=70, fill=(18, 14, 34, 255), outline=(110, 90, 190, 255), width=4)
    hole = Image.new("L", (YW, YH), 0)
    ImageDraw.Draw(hole).rounded_rectangle([sx, sy, sx + PH_W, sy + PH_H], radius=54, fill=255)
    a = im.split()[3]
    a = Image.composite(Image.new("L", (YW, YH), 0), a, hole)
    im.putalpha(a)
    im.save(path)


def yt_areas_png(path):
    """Zwei Bereiche: Freizeit und Schule."""
    im = yt_background()
    d = ImageDraw.Draw(im)
    icon = Image.open(ICON).convert("RGBA").resize((84, 84), Image.LANCZOS)
    m = Image.new("L", icon.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, 83, 83], radius=20, fill=255)
    im.paste(icon, (YW // 2 - 190, 104), m)
    d.text((YW // 2 - 86, 146), "SneakPlay", font=font(F_BOLD, 46), fill=WHITE, anchor="lm")
    d.text((YW // 2, 250), "Ein Spiel – zwei Welten", font=font(F_BOLD, 84), fill=WHITE, anchor="ma")
    panels = [("FREIZEIT", (255, 107, 157), ["Partys", "Spieleabende", "Familie & Freunde"]),
              ("SCHULE", (255, 210, 93), ["Unterricht", "Vertretungsstunden", "Klassenfahrten"])]
    pw, ph, gap = 700, 520, 80
    x = (YW - 2 * pw - gap) // 2
    for title, col, items in panels:
        y = 420
        d.rounded_rectangle([x, y, x + pw, y + ph], radius=44, fill=(34, 25, 74), outline=col, width=5)
        d.text((x + pw // 2, y + 60), title, font=font(F_BOLD, 64), fill=col, anchor="ma")
        for k, it in enumerate(items):
            d.text((x + pw // 2, y + 200 + k * 92), it, font=font(F_SEMI, 52), fill=WHITE, anchor="ma")
        x += pw + gap
    im.save(path)


def srt_time(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def youtube():
    os.makedirs(OUT, exist_ok=True)
    work = os.path.join(TMP, "yt"); os.makedirs(work, exist_ok=True)
    bez = os.path.join(work, "bezel.png"); yt_bezel_png(bez)
    sx, sy = phone_geom()
    parts, t, srt = [], 0.0, []
    for i, (s, dur, td, sd, te, se) in enumerate(YT):
        png = os.path.join(work, f"{s}.png")
        out = os.path.join(work, f"{i:02d}-{s}.mp4")
        if s == "areas":
            yt_areas_png(png)
            still_scene(png, dur, out)
        elif s in ("intro", "outro"):
            yt_frame_png(td, sd, png, with_phone=False, header=(s != "intro"))
            if s == "intro":  # Symbol groß rechts
                im = Image.open(png); icon = Image.open(ICON).convert("RGBA").resize((420, 420), Image.LANCZOS)
                m = Image.new("L", icon.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, 419, 419], radius=96, fill=255)
                im.paste(icon, (1160, 330), m); im.save(png)
            else:
                im = Image.open(png); icon = Image.open(ICON).convert("RGBA").resize((360, 360), Image.LANCZOS)
                m = Image.new("L", icon.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, 359, 359], radius=82, fill=255)
                im.paste(icon, (1200, 360), m); im.save(png)
            still_scene(png, dur, out, fade_in=(s == "intro"), fade_out=(s == "outro"))
        else:
            yt_frame_png(td, sd, png)
            enc_yt(png, os.path.join(FR, "phone-de", s), dur, sx, sy, out, bez)
        parts.append(out)
        srt.append((t + 0.15, t + dur - 0.15, te, se))
        t += dur
    final = os.path.join(OUT, "youtube-sneakplay-de.mp4")
    join(parts, final)
    with open(os.path.join(OUT, "youtube-sneakplay-en.srt"), "w", encoding="utf-8") as f:
        for k, (a, b, ti, su) in enumerate(srt, 1):
            f.write(f"{k}\n{srt_time(a)} --> {srt_time(b)}\n{ti}\n{su}\n\n")
    print("fertig:", final, f"{t:.1f} s")


def enc_yt(bg_png, scene_dir, dur, ox, oy, out, bezel):
    lst = out + ".txt"
    frames_list(scene_dir, dur, lst)
    chain = (f"[1:v]fps={FPS},scale={PH_W}:{PH_H}:flags=lanczos,format=rgb24[a];[0:v][a]overlay={ox}:{oy}:shortest=1[b];"
             f"[b][2:v]overlay=0:0,trim=duration={dur},format=yuv420p")
    tmp = out[:-4] + ".part.mp4"
    run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-framerate", str(FPS), "-i", bg_png, "-f", "concat", "-safe", "0", "-i", lst,
         "-loop", "1", "-framerate", str(FPS), "-i", bezel, "-filter_complex", chain, "-t", f"{dur}", *ENC, "-crf", "18", "-an", tmp])
    os.replace(tmp, out)


def stills():
    """Probebilder: vollste Momente in Endgröße."""
    os.makedirs(os.path.join(TMP, "stills"), exist_ok=True)
    # App-Vorschau iPhone DE, Szene 4
    W, H, bh = 886, 1920, 260
    bg = Image.new("RGB", (W, H), BOT); bg.paste(band(W, bh, *CAP["de"]["s4"]), (0, 0))
    d = os.path.join(FR, "phone-de", "s4"); fr = sorted(f for f in os.listdir(d) if f.endswith(".jpg"))
    bg.paste(Image.open(os.path.join(d, fr[len(fr) // 2])), (0, bh)); bg.save(os.path.join(TMP, "stills", "preview-phone.png"))
    W, H, bh = 1200, 1600, 220
    bg = Image.new("RGB", (W, H), BOT); bg.paste(band(W, bh, IPAD_S1["en"], CAP["en"]["s1"][1]), (0, 0))
    d = os.path.join(FR, "ipad-en", "s1"); fr = sorted(f for f in os.listdir(d) if f.endswith(".jpg"))
    bg.paste(Image.open(os.path.join(d, fr[0])), (0, bh)); bg.save(os.path.join(TMP, "stills", "preview-ipad.png"))
    work = os.path.join(TMP, "yt"); os.makedirs(work, exist_ok=True)
    bez = os.path.join(work, "bezel.png"); yt_bezel_png(bez)
    png = os.path.join(TMP, "stills", "yt.png"); yt_frame_png(*YT[5][2:4], png)
    im = Image.open(png).convert("RGBA"); sx, sy = phone_geom()
    d = os.path.join(FR, "phone-de", "s5"); fr = sorted(f for f in os.listdir(d) if f.endswith(".jpg"))
    im.paste(Image.open(os.path.join(d, fr[len(fr) // 2])).resize((PH_W, PH_H), Image.LANCZOS), (sx, sy))
    im.alpha_composite(Image.open(bez)); im.convert("RGB").save(png)
    print("Probebilder in", os.path.join(TMP, "stills"))


if __name__ == "__main__":
    {"previews": previews, "youtube": youtube, "stills": stills}[sys.argv[1]]()
