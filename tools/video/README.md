# Videos neu erzeugen (nicht Teil der App)

Im Repo-Ordner `python3 -m http.server 8765` starten, dann hier:

    node capture.js phone de && node capture.js phone en
    node capture.js ipad de && node capture.js ipad en
    python3 render.py previews     # App-Vorschauen → out/
    python3 render.py youtube      # Werbevideo + englische SRT → out/
    node thumbshot.js && python3 thumb.py   # Thumbnail → out/

Braucht Node mit Playwright, Python mit Pillow und ffmpeg.
