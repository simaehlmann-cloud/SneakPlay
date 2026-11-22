# SneakPlay

**Bluffen, geheime Missionen & Wort-Bombe – das Pass-&-Play-Partyspiel für
ein Handy.** Namen eintragen, Modus wählen, Handy reihum weiterreichen. Jede
Person hält den Finger auf die Karte und sieht ihre geheime Rolle; beim
Loslassen ist sie sofort wieder verdeckt.

Reine App (Cordova) für beide Handy-Plattformen, Deutsch und Englisch –
offline, ohne Server, ohne Konto, ohne Werbung, ohne Tracking. Aufbau und
Workflows folgen MatheSnack.

Version 1.0.0 · versionCode 10000 · iOS-Build 10000 · Kennung `de.sneakplay.app`

## Spielmodi

| Modus | Spieler | Ablauf |
|---|---|---|
| 🎭 Hochstapler | 3–12 | Alle kennen den Begriff, bis auf den Hochstapler (sieht auf Wunsch die Kategorie). Wortrunde, Abstimmung, Rettungs-Chance. Optional 2 Hochstapler (ab 6) und ein Ahnungsloser (ab 5). |
| 🎯 Geheime Missionen | 3–12 | Gesprächsthema + geheime Mission für alle außer einer Person. Gesprächs-Timer, Abstimmung, Missionen aufdecken und bewerten. |
| 💣 Wort-Bombe | 2–12 | Aufgabe („Ein Tier“), Begriff nennen, weitergeben. Verdeckte Zündschnur (kurz/mittel/lang), Ticken wird schneller. |

Abstimmung **gemeinsam** (ein Tipp) oder **geheim** (Handy geht reihum,
Gleichstand → Stichwahl). Nach jeder Runde Auszeichnungen und ein
Punktestand für den Abend. Begriffe wiederholen sich erst, wenn der Vorrat
erschöpft ist. **Eigene Listen** (z. B. Vereins-Insider) für den
Hochstapler-Modus.

Inhalte je Sprache: 9 Kategorien mit 188 Begriffen, 25 Themen, 40 Missionen,
61 Bomben-Aufgaben – ohne Alkohol, Rauchen, Glücksspiel oder Gewalt
(`validate.js` prüft das).

## Einstellungen (⚙️)

Sprache (auch per Flaggen auf der Startseite) · Farbschema System/Hell/Dunkel ·
Töne · Vibration · Bildschirm anlassen · Punkte zurücksetzen · Begriffe neu
mischen · Alles löschen · Bewerten, Weiterempfehlen (jede Fassung nur ihr
eigener Store), Feedback per E-Mail · Datenschutz, Impressum, Lizenzen.

## Ordner

```
www/                    die App (wird in die Cordova-Hülle kopiert)
  index.html            Oberfläche und Gestaltung (hell/dunkel)
  js/core.js            Version, Speicher, Zufall, Töne, Vibration, Timer
  js/i18n.js            Oberflächentexte Deutsch/Englisch
  js/content.js         Kategorien, Themen, Missionen, Bomben-Aufgaben
  js/game.js            Spiellogik ohne Oberfläche (Rollen, Wertung, …)
  js/app.js             Bildschirme, Aktionen, Lebenszyklus
  datenschutz(-en).html, impressum(-en).html, lizenzen(-en).html
docs/                   GitHub Pages: Support-Seite und Rechtstexte
tools/make-legal.py     erzeugt alle Rechtstexte in www/ und docs/
tools/make-store-assets.py, tools/screenshots.js   Store-Grafiken
store-assets/           Symbol 512, Vorstellungsgrafik, Bildschirmfotos
config.xml              Cordova-Konfiguration
make-icons.py           erzeugt alle Icons (läuft auch in den Workflows)
res/                    Icons, Startbild, Privacy-Manifest
validate.js             statische Prüfung (~3 500 Prüfungen)
smoketest.js            Ablauftest im Browser (~130 Prüfungen)
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
- **Mission/Thema/Bomben-Aufgabe:** in `content.js`, beide Sprachen.
- **Texte:** nur in `i18n.js`; `validate.js` meldet fehlende oder unbenutzte.
- **Wertung:** `www/js/game.js` (Tests in `validate.js` anpassen).
