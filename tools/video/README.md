# Videos neu erzeugen (nicht Teil der App)

Im Repo-Ordner `python3 -m http.server 8765` starten, dann hier:

    node capture.js phone de && node capture.js phone en
    node capture.js ipad de && node capture.js ipad en
    python3 render.py previews     # App-Vorschauen → out/
    python3 render.py youtube      # Werbevideo + englische SRT → out/
    node thumbshot.js && python3 thumb.py   # Thumbnail → out/
    python3 music.py 40.0 out/musik-40.wav && python3 music.py 28.4 out/musik-28.wav
    # Musik einmischen (Bild bleibt unverändert):
    ffmpeg -i out/youtube-sneakplay-de.mp4 -i out/musik-40.wav -map 0:v -map 1:a -c:v copy \
      -af loudnorm=I=-16:TP=-1.5 -c:a aac -b:a 256k -shortest -movflags +faststart youtube-mit-musik.mp4

Braucht Node mit Playwright, Python mit Pillow und ffmpeg.
