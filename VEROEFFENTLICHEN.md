# SneakPlay veröffentlichen

Stand: Version 1.0.0, Build 10000. Der Weg folgt MatheSnack – Zertifikat,
API-Schlüssel, Verträge und Entwicklerkonten hast du schon.

| Schon vorhanden (MatheSnack/Drawmory) | Neu für SneakPlay |
|---|---|
| Apple-Distribution-Zertifikat (.p12) samt Passwort | App-ID `de.sneakplay.app` |
| Team-ID, Signier-Identität | App-Store-Profil für diese App-ID |
| App-Store-Connect-API-Schlüssel (.p8, Key-ID, Issuer-ID) | App in App Store Connect |
| Play-Console-Entwicklerkonto | App in der Play Console + **eigener** Keystore |

SneakPlay braucht keine Associated Domains. Neu gegenüber einer reinen
Gratis-App: **ein In-App-Kauf „Vollversion“** (wie das Lehrkraft-Paket von
MatheSnack, gleiches Plugin). Die Kamera dient nur dem QR-Scanner für Kartensets
(Zweckangabe in der `config.xml`, Android-Erlaubnis zur Laufzeit, Kamera
optional) – wie bei MatheSnack.

---

## 1. Repo und GitHub Pages

1. Neues Repo **`SneakPlay`** unter `simaehlmann-cloud` anlegen, diesen Ordner
   hochladen (Branch `main`).
2. **Settings → Pages** → Branch `main`, Ordner **`/docs`** → **Save**.
3. Nach 1–2 Minuten prüfen:
   - `https://simaehlmann-cloud.github.io/SneakPlay/` (Support-URL)
   - `https://simaehlmann-cloud.github.io/SneakPlay/datenschutz.html` (Datenschutz-URL)

Heißt das Repo anders, die URLs in `STORE-TEXTE.md` anpassen.

## 2. iOS → TestFlight

1. developer.apple.com → **Identifiers** → **+** → App IDs → Explicit
   `de.sneakplay.app`, Beschreibung `SneakPlay`. Keine Capabilities anhaken.
2. **Profiles** → **+** → „App Store Connect“ → App-ID `de.sneakplay.app` →
   vorhandenes Distribution-Zertifikat → Name `SneakPlay App Store` →
   herunterladen.
3. In base64 umwandeln (PowerShell, im Ordner Downloads):
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\SneakPlay_App_Store.mobileprovision")) | Set-Clipboard
   ```
4. Repo SneakPlay → **Settings → Secrets and variables → Actions** – dieselben
   Werte wie bei MatheSnack, nur das Profil ist neu:
   `IOS_CERTIFICATE_P12_BASE64`, `IOS_CERTIFICATE_PASSWORD`, `IOS_TEAM_ID`,
   `IOS_SIGNING_IDENTITY`, `IOS_PROVISIONING_PROFILE` (**neu**), `ASC_KEY_ID`,
   `ASC_ISSUER_ID`, `ASC_KEY_P8`.
5. **App Store Connect → Apps → +**: Name `SneakPlay – Partyspiel`,
   Primärsprache Deutsch, Bundle-ID `de.sneakplay.app`, SKU `sneakplay-ios`.
   Sprache Englisch (UK und USA) hinzufügen.
6. **Actions → Build SneakPlay (iOS) → Run workflow**. Im Schritt „Erzeugtes
   Projekt bestätigen“ stehen Kennung, Version, Build, Foto-Zweckangaben,
   „nur Handy“, Plugins und Privacy-Manifest. Nach 5–30 Minuten erscheint
   der Build in TestFlight.
7. **APP_STORE_ID eintragen:** App Store Connect → App-Informationen →
   „Apple-ID“ (nur Ziffern) → in `www/js/app.js` bei `const APP_STORE_ID = ""`
   einsetzen. Erst dann zeigt die iOS-Fassung „Bewerten“ und
   „Weiterempfehlen“ (vorher bewusst ausgeblendet). `ios-CFBundleVersion`
   in der `config.xml` anheben und neu bauen.

## 2a. In-App-Kauf in App Store Connect

1. **Verträge, Steuern und Bankverbindung:** Der Vertrag für kostenpflichtige
   Apps muss aktiv sein (bei MatheSnack schon erledigt).
2. App SneakPlay → **Monetarisierung → In-App-Käufe → +** →
   **Nicht-Verbrauchsartikel**, Referenzname `Vollversion`, Produkt-ID
   `de.sneakplay.app.vollversion` (exakt so, sie steht in `www/js/shop.js`).
3. Preis 3,99 €, Familienfreigabe **an**, Lokalisierungen DE/EN und
   Prüfungs-Screenshot aus `STORE-TEXTE.md`/`store-assets/`.
4. Den Kauf beim **ersten** Einreichen der App-Version mit auswählen
   („In-App-Käufe und Abonnements“ auf der Versionsseite) – sonst wird er
   nicht mitgeprüft und bleibt in der Live-App unsichtbar.
5. Testen in TestFlight: Kauf mit Sandbox-Konto, „Käufe wiederherstellen“
   nach Neuinstallation.

## 3. Android → Play Console

1. **Eigenen Keystore** erzeugen (nie den von MatheSnack – Schlüssel und
   Kennung sind dauerhaft verknüpft):
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore sneakplay.keystore \
     -alias sneakplay -keyalg RSA -keysize 2048 -validity 10000
   ```
   Keystore und Passwort sicher aufbewahren (Passwort-Manager + Backup).
2. Secrets im Repo: `ANDROID_KEYSTORE_BASE64` (Datei in base64),
   `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`sneakplay`),
   `ANDROID_KEY_PASSWORD`.
3. Nächster Push → **Actions → Build SneakPlay (Android)** → Artefakt
   `SneakPlay-release-aab`.
4. Play Console → **App erstellen**: Name `SneakPlay – Partyspiel`,
   Standardsprache Deutsch, **Spiel**, **kostenlos**.
5. **App-Inhalte** ausfüllen (Werte in `STORE-TEXTE.md`): Datenschutz-URL,
   App-Zugriff „keine Einschränkungen“, Werbung „nein“, Einstufung (IARC),
   Zielgruppe 13+, Datensicherheit „keine Daten erhoben/geteilt“,
   Werbe-ID „nein“, Behörden-/Finanz-/Gesundheits-Apps „nein“.
6. **In-App-Kauf:** Monetarisieren → Produkte → **Einmalkäufe** → Produkt
   `de.sneakplay.app.vollversion`, Preis 3,99 €, Namen/Beschreibung aus
   `STORE-TEXTE.md`, aktivieren. Erst nach dem ersten Upload eines AAB
   (interner Test) lässt sich das Produkt anlegen. Lizenztester eintragen,
   dann kostet der Testkauf nichts.
7. **Store-Eintrag**: Texte aus `STORE-TEXTE.md`, Grafiken aus
   `store-assets/` (Symbol 512, Vorstellungsgrafik, `play-*.png`).
8. **Test → Interner Test** → AAB hochladen → dich selbst als Tester. Bei
   neuen Privatkonten verlangt die Play Console vor der Produktion einen
   **geschlossenen Test mit mindestens 12 Testern über 14 Tage** – früh
   starten (z. B. Familie, Kollegium, Seminar).

## 4. Vor jeder Einreichung testen

1. Debug-APK (Android) bzw. TestFlight (iOS) installieren.
2. Alle drei Modi einmal ganz durchspielen, je einmal auf Deutsch und Englisch.
3. **Aufdecken:** Finger auf die Karte – Inhalt sichtbar; loslassen – sofort weg.
   Mit dem Finger von der Karte wischen – Karte bleibt verdeckt, sobald du loslässt.
4. **App-Wechsel:** während der Wort-Bombe kurz zum Startbildschirm und
   zurück → Bombe ist pausiert, „Weiter“ setzt fort.
5. **Töne:** am iPhone den Lautlos-Schalter beachten – im Lautlos-Modus bleibt
   die App stumm (Systemverhalten).
6. **Vibration:** nur Android (die iPhone-Webansicht kennt kein Vibrieren).
7. **Zurück-Taste (Android):** in der Runde fragt sie nach, auf der
   Startseite schließt sie die App.
8. **Erklär’s!** mit zwei Teams: Karte erraten/verboten/überspringen, Zeit
   ablaufen lassen, im Rückblick eine Karte korrigieren.
9. **QR-Austausch:** auf Gerät A eine eigene Liste mit 40 Karten → Teilen;
   auf Gerät B Eigene Listen → Karten empfangen → QR-Code scannen. Beim
   ersten Mal fragt das Gerät nach der Kamera. Alle Teile werden gelesen,
   dann „Übernehmen“. Einmal „Kamera verweigern“ testen → Hinweis + Foto/Text.
10. **Schulmodus:** mit PIN einschalten, Startseite zeigt „Schulmodus aktiv“,
    Missionen sind Schul-Missionen; mit falscher PIN bleibt er an.
11. Dunkel-/Hellmodus, Bildschirm anlassen, „Alles löschen“ (Kauf bleibt).
12. **Vollversion:** Hochstapler startet ohne Nachfrage; Erklär’s! bietet
    zwei Testrunden, danach den Kaufbildschirm mit Preis. Kauf (Sandbox bzw.
    Lizenztester), App neu installieren, „Käufe wiederherstellen“.
13. **Zahlen-Hochstapler:** Kategorie „Gleicher Wert“ – Karten zeigen
    verschiedene Schreibweisen desselben Werts.

## 5. Einreichen

- **App Store Connect:** Version 1.0.0, Build wählen, Texte und Bilder aus
  `STORE-TEXTE.md`/`store-assets/screens/phone69-*`, App-Datenschutz „Daten
  werden nicht erfasst“, Altersfreigabe-Fragebogen (→ 4+), Prüfungsanmerkungen
  einfügen, „Zur Prüfung einreichen“.
- **Play Console:** Produktion → neues Release mit demselben AAB →
  Länder auswählen → zur Prüfung senden.

### Bekanntes Prüfungsrisiko

Imposter-/Undercover-Spiele gibt es viele. Apple kann solche Apps nach
Richtlinie **4.3 (Spam)** als „zu ähnlich“ ablehnen. Gegenargumente, falls
nötig, in der Antwort an die Prüfung: eigener Modus „Geheime Missionen“,
Wort-Bombe, geheime Pass-&-Play-Abstimmung, eigene Listen, komplett offline
und ohne Datensammlung, zweisprachig. Die Prüfungsanmerkungen nennen das
schon knapp.

## Nächste Builds

Vor jedem Upload `ios-CFBundleVersion` anheben (jede Nummer ist dauerhaft
belegt). Bei einer neuen Version auch `APP_VERSION` in `www/js/core.js` und
`version`/`android-versionCode` in der `config.xml` – `validate.js` meldet
Abweichungen.
