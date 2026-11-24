# SneakPlay nach TestFlight bringen

Stand: Version 1.0.0, iOS-Build 10000, Bundle-ID `de.sneakplay.app`.
Der Weg folgt MatheSnack. Vieles hast du dort schon, neu sind nur die Teile, die
an der Kennung `de.sneakplay.app` hängen.

| Schon vorhanden (MatheSnack/Drawmory) | Neu für SneakPlay |
|---|---|
| Apple-Developer-Konto, Team-ID `7LPBMXVK6D` | App-ID `de.sneakplay.app` |
| Apple-Distribution-Zertifikat (.p12) samt Passwort | App in App Store Connect |
| App-Store-Connect-API-Schlüssel (.p8, Key-ID, Issuer-ID) | App-Store-Profil für diese App-ID |
| Vertrag „Kostenpflichtige Apps“ | In-App-Kauf `de.sneakplay.app.vollversion` |
| | 6 Secrets im Repo SneakPlay |

Reihenfolge einhalten: Der Upload klappt nur, wenn die App in App Store Connect
schon existiert, und das Profil lässt sich erst anlegen, wenn es die App-ID gibt.

---

## Schritt 0 – Die drei Dateien zusammensuchen

GitHub zeigt gespeicherte Secrets nie wieder an. Du brauchst deshalb die
**Originaldateien** von damals:

| Datei | Wofür | Typischer Name |
|---|---|---|
| Zertifikat mit Schlüssel | Signieren | `*.p12` (dazu das Passwort) |
| API-Schlüssel | Hochladen | `AuthKey_XXXXXXXXXX.p8` |
| – | Hochladen | Key-ID (10 Zeichen) und Issuer-ID (UUID) |

Suchen (PowerShell):

```powershell
Get-ChildItem $HOME -Recurse -Include *.p12,AuthKey_*.p8 -ErrorAction SilentlyContinue | Select FullName
```

Key-ID und Issuer-ID stehen jederzeit in App Store Connect → **Benutzer und
Zugriff → Integrationen → App Store Connect API** (Issuer-ID oben, Key-ID in
der Liste).

- **Beides gefunden?** → weiter mit Schritt 1.
- **.p12 fehlt** → [Anhang A](#anhang-a--neues-distribution-zertifikat-unter-windows).
- **.p8 fehlt** → [Anhang B](#anhang-b--neuer-api-schlüssel). Eine .p8-Datei
  lässt sich nur einmal herunterladen.

---

## Schritt 1 – App-ID anlegen

developer.apple.com → **Certificates, Identifiers & Profiles → Identifiers → +**

1. **App IDs** → **App** → Continue
2. Description `SneakPlay`, Bundle ID **Explicit** `de.sneakplay.app`
3. Capabilities: nichts zusätzlich anhaken. „In-App Purchase“ ist bei jeder
   App-ID automatisch aktiv. Associated Domains braucht SneakPlay nicht.
4. Continue → Register

## Schritt 2 – App in App Store Connect anlegen

appstoreconnect.apple.com → **Apps → + → Neue App**

| Feld | Wert |
|---|---|
| Plattform | iOS |
| Name | `SneakPlay – Partyspiel` (ist der Name vergeben: `SneakPlay: Partyspiel`) |
| Primärsprache | Deutsch |
| Bundle-ID | `de.sneakplay.app` |
| SKU | `sneakplay-ios` |
| Benutzerzugriff | Vollzugriff |

Danach unter **App-Informationen**:

- Kategorie **Spiele**, Unterkategorien **Familie** und **Wort**. **Nicht** die
  Kids-Kategorie wählen, denn die verlangt Elternschranken vor jedem Link und
  vor dem Kauf.
- **Englisch (USA)** und **Englisch (UK)** als Sprachen hinzufügen.
- Datenschutz-URL: `https://simaehlmann-cloud.github.io/SneakPlay/datenschutz.html`
  (EN: `…/datenschutz-en.html`). Prüfe einmal im Browser, dass die Seite lädt.

**App-Datenschutz:** „Daten werden nicht erfasst“. **Altersfreigabe:** überall
„Nein/Keine“ → 4+. Die Begründungen stehen in `STORE-TEXTE.md`.

Für TestFlight reicht das. Texte und Screenshots brauchst du erst beim
Einreichen.

## Schritt 3 – App-Store-Profil erstellen

developer.apple.com → **Profiles → +**

1. **Distribution → App Store Connect** → Continue
2. App ID `de.sneakplay.app` → Continue
3. Das Distribution-Zertifikat wählen, **zu dem deine .p12 gehört**. Bei
   mehreren: das mit dem passenden Ablaufdatum, oder das neue aus Anhang A.
4. Name `SneakPlay App Store` → Generate → **Download**

In base64 umwandeln (PowerShell im Ordner Downloads):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\SneakPlay_App_Store.mobileprovision")) | Set-Clipboard
```

## Schritt 4 – Secrets im Repo anlegen

GitHub → Repo **SneakPlay** → **Settings → Secrets and variables → Actions →
New repository secret**. Jeden Wert einzeln anlegen, mit genau diesem Namen:

| Name | Inhalt | So bekommst du ihn |
|---|---|---|
| `IOS_PROVISIONING_PROFILE` | Profil (base64) | aus Schritt 3, liegt in der Zwischenablage |
| `IOS_CERTIFICATE_P12_BASE64` | Zertifikat (base64) | Befehl unten |
| `IOS_CERTIFICATE_PASSWORD` | Passwort der .p12 | von damals bzw. aus Anhang A |
| `ASC_KEY_ID` | Key-ID, z. B. `AB12CD34EF` | App Store Connect → Integrationen |
| `ASC_ISSUER_ID` | Issuer-ID, z. B. `69a6de7…` | ebenda, oben auf der Seite |
| `ASC_KEY_P8` | **gesamter** Text der .p8 | .p8 mit dem Editor öffnen, alles kopieren, inkl. `-----BEGIN PRIVATE KEY-----` und `-----END PRIVATE KEY-----` |

Zertifikat in base64 (PowerShell im Ordner der .p12, Dateinamen anpassen):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\distribution.p12")) | Set-Clipboard
```

Optional kannst du noch zwei weitere Secrets anlegen. Fehlen sie, nimmt der
Workflow die Werte selbst:

- `IOS_TEAM_ID` (`7LPBMXVK6D`): sonst aus dem Profil gelesen
- `IOS_SIGNING_IDENTITY`: sonst die allgemeine Identität `Apple Distribution`

Achte beim Einfügen auf zwei Dinge. Es darf kein Leerzeichen vor oder nach dem
Wert stehen; Zeilenumbrüche im base64 entfernt der Workflow selbst. Und lege
jeden Wert als **Repository secret** an, nicht als Environment- oder
Variables-Eintrag.

## Schritt 5 – In-App-Kauf anlegen

App Store Connect → SneakPlay → **Monetarisierung → In-App-Käufe → +**

| Feld | Wert |
|---|---|
| Typ | **Nicht-Verbrauchsartikel** |
| Referenzname | `Vollversion` |
| Produkt-ID | **`de.sneakplay.app.vollversion`** (exakt so, steht fest in der App) |
| Preis | 3,99 € (Preisplan → Deutschland → 3,99 €, andere Länder automatisch) |
| Familienfreigabe | **an** (lässt sich später nicht mehr ausschalten) |
| Lokalisierung Deutsch | Anzeigename `Vollversion`, Beschreibung `Alle vier Spiele ohne Grenzen` |
| Lokalisierung Englisch (USA, UK) | `Full version`, `All four games without limits` |
| Prüfungsinformationen | Screenshot `store-assets/review-paywall-phone69-de.png`, Notiz: Text aus `STORE-TEXTE.md` → Prüfungsanmerkungen |

Apple begrenzt Anzeigename und Beschreibung auf wenige Zeichen. Die Kurzform
passt sicher; die längere Beschreibung aus `STORE-TEXTE.md` ist für die
Play Console.

Ziel ist der Status **„Bereit zur Einreichung“**. Steht dort „Fehlende
Metadaten“, zeigt TestFlight beim Kaufknopf dauerhaft „Preis wird geladen …“.

Prüfe außerdem unter **Geschäftliches → Vereinbarungen**, dass der Vertrag
„Kostenpflichtige Apps“ **aktiv** ist. Bei MatheSnack hast du das schon
erledigt; er gilt für das ganze Konto.

## Schritt 6 – Build starten

GitHub → Repo SneakPlay → **Actions → Build SneakPlay (iOS) → Run workflow**
(Branch `main`) → **Run workflow**.

Nur der **manuelle** Start lädt hoch. Ein normaler Push baut und prüft nur und
verbraucht keine Build-Nummer. Der Lauf dauert etwa 15–25 Minuten. Im Protokoll
siehst du:

- **„Erzeugtes Projekt bestätigen“**: Bundle-ID `de.sneakplay.app`, Version
  1.0.0 / Build 10000, Kamera- und Foto-Texte gesetzt, „nur Handy“, alle
  Plugins installiert, StoreKit eingebunden, Privacy-Manifest vorhanden
- **„Signierschlüssel einrichten“**: „Profil gilt für: 7LPBMXVK6D.de.sneakplay.app“
- **„In App Store Connect hochladen“**: „Hochgeladen.“

Nach 5–30 Minuten Verarbeitung erscheint der Build in App Store Connect unter
**TestFlight**. Apple schickt zusätzlich eine E-Mail.

## Schritt 7 – Auf dem iPhone installieren

1. App Store Connect → SneakPlay → **TestFlight → Interne Tests → +** → Gruppe
   `Ich` → dich selbst als Tester hinzufügen → Build 10000 der Gruppe zuweisen.
2. Die Frage nach der Exportverschlüsselung erscheint nicht, das ist in der
   App bereits beantwortet.
3. Auf dem iPhone die App **TestFlight** aus dem App Store laden → SneakPlay →
   **Installieren**.

## Schritt 8 – Testen

Was ich hier nicht simulieren kann, steht oben:

1. **Kauf:** ⚙️ → „Vollversion ansehen“ → Kaufen. TestFlight kauft in Apples
   Testumgebung, **es wird nichts abgebucht**, auch wenn ein Preis erscheint.
   Danach sind alle Spiele ohne „2 Tests“-Hinweis spielbar.
2. **Wiederherstellen:** App löschen, neu installieren → ⚙️ → „Vollversion
   ansehen“ → „Käufe wiederherstellen“.
3. **QR-Scanner:** Auf einem zweiten Gerät (oder im Browser über die Vorschau)
   ein Kartenset als QR-Code zeigen → in SneakPlay „Eigene Listen → Karten
   empfangen → QR-Code scannen“. Beim ersten Mal fragt iOS nach der Kamera.
4. **Teilen:** Eigene Liste → „Als Text weitergeben“ → Teilen-Menü öffnet sich.
5. **Halten-Karte:** Beim Weitergeben die Karte gedrückt halten. Erscheint
   dabei kein Lupen- oder Markierungsmenü, ist alles in Ordnung.
6. **Bildschirm bleibt an** während einer Runde (⚙️ → „Bildschirm anlassen“).
7. **Ton und Vibration** bei der Wortbombe. Bei manchen iPhones vibriert es im
   Web-Modus nicht, das ist kein Fehler.
8. **Fortsetzen:** Mitten in einer Runde die App wischend schließen und neu
   öffnen → Frage „Runde fortsetzen?“
9. **Schulmodus:** ⚙️ → einschalten mit PIN → keine Kaufknöpfe mehr sichtbar.
10. **Schriftgröße** und **Farbschema** (Hell/Dunkel) in ⚙️ durchschalten.

Schick mir bei Auffälligkeiten einen Screenshot.

---

## Wenn etwas schiefgeht

| Meldung im Protokoll | Ursache und Lösung |
|---|---|
| „Kein Zertifikat hinterlegt – signierter Build wird übersprungen“ | `IOS_CERTIFICATE_P12_BASE64` oder `IOS_PROVISIONING_PROFILE` fehlt oder hat einen Tippfehler im Namen |
| „Das Zertifikat ließ sich nicht dekodieren“ | base64 unvollständig kopiert, den PowerShell-Befehl erneut ausführen |
| `MAC verification failed` / `security: SecKeychainItemImport` | falsches Passwort, oder die .p12 wurde mit neuem OpenSSL ohne `-legacy` erzeugt (Anhang A) |
| „Das Profil gehört zu '…mathesnack…'“ | versehentlich das MatheSnack-Profil eingefügt, Schritt 3 wiederholen |
| `No signing certificate "iOS Distribution" found` / `doesn't include signing certificate` | Profil und .p12 passen nicht zusammen: Profil mit genau diesem Zertifikat neu erzeugen (Schritt 3, **Edit**) |
| `Authentication failed` / `401` beim Hochladen | `ASC_KEY_ID`, `ASC_ISSUER_ID` oder `ASC_KEY_P8` falsch; beim .p8 die BEGIN/END-Zeilen mitkopieren |
| `No suitable application records were found` | Schritt 2 fehlt, oder die Bundle-ID dort ist nicht `de.sneakplay.app` |
| `The bundle version must be higher than the previously uploaded version` | Build-Nummer schon benutzt: `ios-CFBundleVersion` in `config.xml` erhöhen (10000 → 10001) |
| Kaufknopf zeigt „Preis wird geladen …“ | In-App-Kauf nicht „Bereit zur Einreichung“ oder Vertrag nicht aktiv (Schritt 5); nach der Änderung bis zu 1 Stunde warten |

---

## Anhang A – Neues Distribution-Zertifikat unter Windows

Nur nötig, wenn die alte .p12 nicht mehr auffindbar ist. Das alte Zertifikat
bleibt gültig, MatheSnack und Drawmory laufen also unverändert weiter. Apple
erlaubt mehrere gleichzeitig.

Du brauchst OpenSSL. Es ist in **Git für Windows** enthalten: das Startmenü
→ „Git Bash“ öffnen. In einem neuen Ordner:

```bash
mkdir ~/apple-signing && cd ~/apple-signing
openssl genrsa -out sneakplay_dist.key 2048
openssl req -new -key sneakplay_dist.key -out sneakplay_dist.csr \
  -subj "/emailAddress=smaehlmann.appdev@gmail.com/CN=Simon Maehlmann/C=DE"
```

developer.apple.com → **Certificates → +** → **Apple Distribution** →
`sneakplay_dist.csr` hochladen → `distribution.cer` herunterladen und in
denselben Ordner legen. Dann:

```bash
openssl x509 -in distribution.cer -inform DER -out distribution.pem -outform PEM
openssl pkcs12 -export -legacy -inkey sneakplay_dist.key -in distribution.pem \
  -out distribution.p12 -passout pass:HIER_EIN_PASSWORT
```

Meldet OpenSSL bei `-legacy` einen Fehler (ältere Version), den Befehl ohne
`-legacy` wiederholen. Das Passwort ist dein `IOS_CERTIFICATE_PASSWORD`.

**Bewahre `distribution.p12`, das Passwort und `sneakplay_dist.key` gut auf**,
zum Beispiel in einem Passwort-Manager. Mit derselben .p12 kannst du alle deinen
Apps signieren. Danach bei Schritt 3 dieses neue Zertifikat wählen.

## Anhang B – Neuer API-Schlüssel

App Store Connect → **Benutzer und Zugriff → Integrationen → App Store
Connect API → Team-Schlüssel → +** → Name `GitHub Actions`, Zugriff
**App Manager** → Generieren → **API-Schlüssel herunterladen** (nur einmal
möglich!). Key-ID steht in der Liste, Issuer-ID oben. Der Schlüssel gilt für
das ganze Konto. Wenn du willst, kannst du ihn auch in den Repos von
MatheSnack und Drawmory eintragen.

---

## Nächste Builds

Vor jedem weiteren manuellen Start `ios-CFBundleVersion` in der `config.xml`
erhöhen (10000 → 10001 …), denn jede Nummer ist bei Apple dauerhaft belegt. Bei
einer neuen Version auch `version`, `android-versionCode` in der `config.xml` und
`APP_VERSION` in `www/js/core.js`. `validate.js` meldet Abweichungen.
