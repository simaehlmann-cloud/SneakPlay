# SneakPlay

**Bluffen, geheime Missionen, Erklären & Wort-Bombe – das Pass-&-Play-Spiel
für ein Handy, für Spieleabende und den Unterricht.** Namen eintragen, Modus wählen, Handy reihum weiterreichen. Jede
Person hält den Finger auf die Karte und sieht ihre geheime Rolle; beim
Loslassen ist sie sofort wieder verdeckt.

Reine App (Cordova) für beide Handy-Plattformen, Deutsch und Englisch –
offline, ohne Server, ohne Konto, ohne Werbung, ohne Tracking. Aufbau und
Workflows folgen MatheSnack.

Version 1.0.0 · versionCode 10000 · iOS-Build 10000 · Kennung `de.sneakplay.app`

**Gratis und Vollversion:** Hochstapler ist dauerhaft gratis (alle
Kategorien, auch Schule/Mathe), ebenso eigene Karten, QR-Austausch, Teams
und Schulmodus. Missionen, Erklär’s! und Wort-Bombe: je 2 Testrunden, dann
**Vollversion** als einmaliger In-App-Kauf (3,99 €, Produkt-ID
`de.sneakplay.app.vollversion`, `www/js/shop.js`, Plugin
cordova-plugin-purchase wie bei MatheSnack). Im Schulmodus keine
Kaufknöpfe; „Alles löschen“ behält Kauf und verbrauchte Testrunden.

## Spielmodi

| Modus | Spieler | Ablauf |
|---|---|---|
| 🎭 Hochstapler | 3–16 | Alle kennen den Begriff, bis auf den Hochstapler. Er bekommt je nach Einstellung die Kategorie, einen **ähnlichen Begriff** (weiß dann selbst nicht, dass er Hochstapler ist) oder nichts. Wortrunde, Abstimmung, Rettungs-Chance. Optional 2 Hochstapler (ab 6) und ein Ahnungsloser (ab 5). |
| 🎯 Geheime Missionen | 3–16 | Gesprächsthema + geheime Mission für alle außer einer Person. Im Schulmodus eigene Schul-Themen und -Missionen. |
| 🗣️ Erklär’s! | 2–4 Teams | Begriff erklären, ohne vier verbotene Wörter zu sagen. 60/90/120 s je Durchgang, ✓ / 🚫 / ⏭, Korrektur nach jedem Durchgang, Minuspunkt abschaltbar. |
| 💣 Wort-Bombe | 2–16 oder Teams | Aufgabe („Ein Tier“, „Eine Primzahl“), Begriff nennen, weitergeben. Verdeckte Zündschnur, Ticken wird schneller. Aufgaben allgemein, Mathe oder gemischt. |

Abstimmung **gemeinsam** (ein Tipp) oder **geheim** (Handy geht reihum,
Gleichstand → Stichwahl). Nach jeder Runde Auszeichnungen und ein
Punktestand für den Abend. Begriffe wiederholen sich erst, wenn der Vorrat
erschöpft ist. **Eigene Listen** (z. B. Vereins-Insider) für den
Hochstapler-Modus.

Inhalte je Sprache: 9 Kategorien mit 188 Begriffen; 10 Erklär-Decks mit
gut 180 Karten (je 4 verbotene Wörter), davon 5 Mathe-Decks nach den
Leitideen des Kerncurriculums (Zahlen & Operationen, Größen & Messen,
Raum & Form, Funktionen & Algebra, Daten & Zufall) mit **Niveau** nach
Klassenstufe (5–6 / bis 8 / bis 10) und ähnlichem Begriff; 25 + 15 Schul-Themen,
40 + 24 Schul-Missionen, 61 + 30 Mathe-Bomben-Aufgaben – ohne Alkohol,
Rauchen, Glücksspiel oder Gewalt (`validate.js` prüft das). Mathe-Decks und
„Schule“ stehen auch im Hochstapler-Modus zur Wahl.

**Zahlen-Hochstapler** (Kategorien „Gleicher Wert“ und „Gleiche Terme“): Die
Crew bekommt denselben Wert in verschiedenen Darstellungen (½ / 0,5 / 50 %),
der Hochstapler einen ähnlichen, nicht gleichwertigen. `validate.js` rechnet
die Zahlgruppen nach.

**Zum Nachlernen:** Nach jeder Erklär-Partie stehen übersprungene und
„verbotene“ Karten als Liste bereit, ein Tipp speichert sie als eigenes Set.
**Klassen-Werkstatt:** Beim Empfangen lassen sich Karten an eine
bestehende Liste anhängen (ohne Doppelte).

**Unterricht:** Teams für ganze Klassen · **eigene Karten** mit verbotenen
Wörtern (Format `Begriff: verboten, verboten, …`) · Weitergabe per
**QR-Code** (mehrteilig, wechselt automatisch – zum Abscannen vom Beamer)
oder als Text über das Teilen-Menü, Empfang per Kamera, Foto oder Einfügen –
ohne Server · **Schulmodus** mit PIN (Schul-Themen/-Missionen, keine
Store-/Feedback-Knöpfe, kein „Alles löschen“).

## Einstellungen (⚙️)

Sprache (auch per Flaggen auf der Startseite) · Farbschema System/Hell/Dunkel ·
Töne · Vibration · Bildschirm anlassen · Schulmodus · Punkte zurücksetzen · Begriffe neu
mischen · Alles löschen · Bewerten, Weiterempfehlen (jede Fassung nur ihr
eigener Store), Feedback per E-Mail · Datenschutz, Impressum, Lizenzen.

## Ordner

```
www/                    die App (wird in die Cordova-Hülle kopiert)
  index.html            Oberfläche und Gestaltung (hell/dunkel)
  js/core.js            Version, Speicher, Zufall, Töne, Vibration, Timer
  js/i18n.js            Oberflächentexte Deutsch/Englisch
  js/content.js         Kategorien, Themen, Missionen, Bomben-Aufgaben
  js/decks.js           Erklär- und Mathe-Decks, Schul-Themen/-Missionen
  js/game.js            Spiellogik ohne Oberfläche (Rollen, Wertung, Austausch)
  js/qr.js, js/jsqr.js  QR erzeugen (aus MatheSnack) und lesen (jsQR, Apache 2.0)
  js/shop.js            Vollversion (In-App-Kauf) und Testrunden
  js/app.js             Bildschirme, Aktionen, Lebenszyklus
  datenschutz(-en).html, impressum(-en).html, lizenzen(-en).html
docs/                   GitHub Pages: Support-Seite und Rechtstexte
tools/make-legal.py     erzeugt alle Rechtstexte in www/ und docs/
tools/make-store-assets.py, tools/screenshots.js   Store-Grafiken
store-assets/           Symbol 512, Vorstellungsgrafik, Bildschirmfotos
config.xml              Cordova-Konfiguration
make-icons.py           erzeugt alle Icons (läuft auch in den Workflows)
res/                    Icons, Startbild, Privacy-Manifest
validate.js             statische Prüfung (~8 700 Prüfungen)
smoketest.js            Ablauftest im Browser (~225 Prüfungen)
.github/workflows/      Android (APK/AAB) und iOS (TestFlight)
STORE-TEXTE.md          Texte, Datenschutz- und Altersangaben für beide Stores
VEROEFFENTLICHEN.md     Schritt für Schritt bis in beide Stores
```

**Rechtstexte nur in `tools/make-legal.py` ändern**, dann
`python3 tools/make-legal.py` – das schreibt `www/` und `docs/` gleich.
Keine Plattform- oder Store-Namen in Rechtstexten, Oberfläche und
Store-Texten: `validate.js` bricht sonst ab.

## Testen

```bash
python3 -m http.server 8765        # dann http://localhost:8765/www/index.html
npm install                        # nur die Prüfwerkzeuge
npx playwright install chromium
node validate.js
node smoketest.js                  # Server muss laufen
node tools/screenshots.js          # Store-Bildschirmfotos neu erzeugen
```

**Android:** Actions → *Build SneakPlay (Android)* → Artefakt
`SneakPlay-debug-apk` → auf dem Handy installieren.
**iOS:** siehe [VEROEFFENTLICHEN.md](VEROEFFENTLICHEN.md).

## Neue Version

1. `APP_VERSION` in `www/js/core.js`
2. `version`, `android-versionCode`, `ios-CFBundleVersion` in `config.xml`
   (versionCode = Major·10000 + Minor·100 + Patch)

## Erweitern

- **Begriffe/Kategorie:** in `www/js/content.js` für **beide** Sprachen;
  neue Kategorie auch in `CAT_ORDER` und `CAT_ICON`.
- **Erklär-/Mathe-Karte:** in `www/js/decks.js`, Format
  `"Begriff|verboten1,verboten2,verboten3,verboten4|Niveau|ähnlicher Begriff"`.
- **Mission/Thema/Bomben-Aufgabe:** in `content.js`, beide Sprachen.
- **Texte:** nur in `i18n.js`; `validate.js` meldet fehlende oder unbenutzte.
- **Wertung:** `www/js/game.js` (Tests in `validate.js` anpassen).
