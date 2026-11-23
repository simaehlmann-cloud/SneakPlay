#!/usr/bin/env python3
"""Erzeugt Datenschutz, Impressum und Lizenzen (Deutsch/Englisch) für
www/ (in der App) und docs/ (GitHub Pages) – beide Fassungen sind gleich.

    python3 tools/make-legal.py

Rechtstexte nur hier ändern, dann neu erzeugen. Bewusst ohne Namen von
Betriebssystemen oder App-Vertrieben: Beide Store-Prüfungen lehnen Texte ab,
die die jeweils andere Plattform nennen. validate.js prüft das."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
HEAD = open(os.path.join(HERE, "legal_head.txt"), encoding="utf-8").read()
STAND_DE = "Stand: November 2026"
STAND_EN = "Last updated: November 2026"

ADDR = """<address>
    Wisdompeak Apps<br>
    {owner}: Simon Mählmann<br>
    Oderstraße 13<br>
    28844 Weyhe<br>
    {country}<br>
    E-Mail: <a href="mailto:smaehlmann.appdev@gmail.com">smaehlmann.appdev@gmail.com</a>
  </address>"""
ADDR_DE = ADDR.format(owner="Inhaber", country="Deutschland")
ADDR_EN = ADDR.format(owner="Owner", country="Germany").replace("E-Mail:", "Email:")

PAGES = {
"datenschutz.html": ("de", "Datenschutz", f"""
  <h1>Datenschutzerklärung</h1>
  <p class="stand">SneakPlay · {STAND_DE}</p>

  <h2>1. Verantwortlicher</h2>
  <p>Verantwortlich im Sinne von Art. 4 Nr. 7 DSGVO ist:</p>
  {ADDR_DE}
  <p>Ein Datenschutzbeauftragter ist nicht bestellt, da die Voraussetzungen des Art. 37 DSGVO und des § 38 BDSG nicht vorliegen.</p>

  <h2>2. Grundsatz: keine Datenerhebung</h2>
  <p>SneakPlay verarbeitet keine personenbezogenen Daten auf Servern des Anbieters. Die App funktioniert vollständig offline. Es gibt keine Benutzerkonten, keine Registrierung, keine Analyse- oder Trackingdienste, keine Werbung und keine Weitergabe von Daten an Dritte.</p>

  <h2>3. Welche Daten auf dem Gerät gespeichert werden</h2>
  <p>Ausschließlich im lokalen Speicher der App auf Ihrem Gerät liegen:</p>
  <ul>
    <li>die Namen der Mitspielerinnen und Mitspieler, die Sie eingeben (beliebige Spitznamen genügen)</li>
    <li>der Punktestand des laufenden Spieleabends</li>
    <li>Teamnamen und Punktestände</li>
    <li>ob die Vollversion gekauft wurde und wie viele Testrunden genutzt sind</li>
    <li>eigene Kartensets, die Sie anlegen oder von einem anderen Gerät übernehmen</li>
    <li>zuletzt gespielte Begriffe, damit sie sich nicht zu schnell wiederholen</li>
    <li>Einstellungen zu Sprache, Darstellung, Tönen, Vibration, Bildschirm, Spielmodus und Schulmodus (einschließlich der selbst gewählten Schulmodus-PIN)</li>
  </ul>
  <p>Diese Daten werden nicht übertragen und sind für den Anbieter nicht einsehbar. Sie lassen sich in der App unter „Einstellungen → Daten auf diesem Gerät“ löschen; beim Entfernen der App wird alles gelöscht. Bitte geben Sie in eigenen Listen keine sensiblen Angaben über andere Personen ein.</p>

  <h2>4. Kamera und Austausch von Kartensets</h2>
  <p>Eigene Kartensets lassen sich ohne Server an andere Geräte weitergeben: Das sendende Gerät zeigt einen QR-Code an, das empfangende liest ihn mit der Kamera. Die Kamera wird nur geöffnet, wenn Sie „QR-Code scannen“ wählen; Ihr Gerät fragt dafür um Erlaubnis. Das Kamerabild wird ausschließlich auf dem Gerät ausgewertet und weder gespeichert noch übertragen. Dasselbe gilt für ein Foto, das Sie über „Foto aufnehmen“ wählen. Alternativ lässt sich ein Kartenset als Text über das Teilen-Menü Ihres Geräts weitergeben und auf dem anderen Gerät einfügen; wohin Sie den Text senden (etwa einen Messenger), entscheiden Sie selbst. Ein Kartenset enthält nur den Namen der Liste und die Begriffe – keine Spielernamen und keine Punkte.</p>

  <h2>5. Verbindungen ins Internet</h2>
  <p>Die App baut von sich aus keine Netzwerkverbindungen auf – mit Ausnahme der Verbindung zum App-Vertrieb, die das Betriebssystem für Kauf und Wiederherstellung der Vollversion herstellt (siehe Abschnitt 6). Sie lädt keine Schriftarten, Bibliotheken oder Inhalte von fremden Servern.</p>
  <p>In den Einstellungen gibt es Knöpfe, die nur auf Ihren Wunsch etwas öffnen: „Bewerten“ öffnet die Seite der App beim App-Vertrieb, über den Sie die App bezogen haben. „Weiterempfehlen“ öffnet das Teilen-Menü Ihres Geräts mit einem kurzen Text und dem Link zur App. „Feedback senden“ öffnet Ihr E-Mail-Programm mit einer vorbereiteten Nachricht (App-Version, Betriebssystem-Version, Sprache). Was Sie davon absenden, entscheiden Sie selbst; die App überträgt dabei nichts. Eine E-Mail an den Anbieter wird nur zur Beantwortung verwendet (Art. 6 Abs. 1 lit. f DSGVO) und danach gelöscht.</p>

  <h2>6. Bezug über einen App-Vertrieb und Kauf der Vollversion</h2>
  <p>Die Vollversion wird als einmaliger In-App-Kauf über den App-Vertrieb abgewickelt, über den die App installiert wurde. Zahlungs- und Kontodaten verarbeitet ausschließlich dessen Betreiber; der Anbieter erhält davon keine Kenntnis. Die App erfährt über die Kaufschnittstelle nur, ob der Kauf besteht, und merkt sich das im lokalen Speicher. Im Schulmodus sind alle Kaufknöpfe ausgeblendet.</p>
  <p>Beim Herunterladen der App über einen App-Vertrieb verarbeitet dessen Betreiber eigenständig Daten (etwa Konto, Gerät und Zeitpunkt des Downloads). Darauf hat der Anbieter dieser App keinen Einfluss. Es gelten die Datenschutzbestimmungen des jeweiligen Betreibers. Der Anbieter erhält von dort höchstens zusammengefasste, nicht personenbezogene Statistiken (etwa Anzahl der Downloads).</p>

  <h2>7. Diese Webseite</h2>
  <p>Diese Erklärung und die Infoseite zur App werden zusätzlich über GitHub Pages bereitgestellt, einen Dienst der GitHub Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA. Beim Abruf im Browser verarbeitet GitHub technisch notwendige Verbindungsdaten wie die IP-Adresse, um die Seite auszuliefern und den Dienst abzusichern. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; das berechtigte Interesse liegt in der zuverlässigen Bereitstellung der Seiten. GitHub ist nach dem EU-US Data Privacy Framework zertifiziert. Einzelheiten: <a href="https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement">Datenschutzerklärung von GitHub</a>. Die App selbst ruft nichts von GitHub ab.</p>

  <h2>8. Kinder, Jugendliche und Einsatz in der Schule</h2>
  <p>SneakPlay ist für alle Altersgruppen geeignet, richtet sich aber nicht speziell an Kinder. Die App erhebt von niemandem Daten. Es gibt keine Werbung, keine Konten und keine Kommunikation mit anderen Personen über das Internet. Für den Unterricht genügen Spitznamen oder Teamnamen; es müssen keine Daten von Schülerinnen und Schülern eingegeben werden. Der Schulmodus blendet Kaufknöpfe, Bewerten, Weiterempfehlen und Feedback aus.</p>

  <h2>9. Ihre Rechte</h2>
  <p>Ihnen stehen die Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch nach Art. 15 bis 21 DSGVO zu sowie ein Beschwerderecht bei einer Aufsichtsbehörde. Da beim Anbieter keine personenbezogenen Daten gespeichert werden, laufen Auskunfts- und Löschersuchen gegenüber dem Anbieter in der Regel ins Leere. Sie können alle Daten jederzeit selbst in der App löschen.</p>

  <h2>10. Änderungen dieser Erklärung</h2>
  <p>Diese Erklärung wird angepasst, sobald sich Funktionen der App ändern, die für den Datenschutz erheblich sind. Die jeweils gültige Fassung ist in der App abrufbar.</p>

  <h2>11. Kontakt</h2>
  <p>Bei Fragen zum Datenschutz wenden Sie sich bitte an <a href="mailto:smaehlmann.appdev@gmail.com">smaehlmann.appdev@gmail.com</a>.</p>
  <div class="links">
    <a class="back" href="index.html">Zurück</a>
    <a href="impressum.html">Impressum</a>
    <a href="datenschutz-en.html">English</a>
  </div>
"""),

"datenschutz-en.html": ("en", "Privacy", f"""
  <h1>Privacy Policy</h1>
  <p class="stand">SneakPlay · {STAND_EN}</p>

  <h2>1. Controller</h2>
  <p>The controller within the meaning of Art. 4(7) GDPR is:</p>
  {ADDR_EN}
  <p>No data protection officer has been appointed, as the requirements of Art. 37 GDPR and Section 38 of the German Federal Data Protection Act (BDSG) are not met.</p>

  <h2>2. Principle: no data collection</h2>
  <p>SneakPlay does not process any personal data on servers operated by the provider. The app works entirely offline. There are no user accounts, no registration, no analytics or tracking services, no advertising and no sharing of data with third parties.</p>

  <h2>3. Data stored on your device</h2>
  <p>The following is stored exclusively in the app’s local storage on your device:</p>
  <ul>
    <li>the player names you enter (any nicknames will do)</li>
    <li>the scores of the current game night</li>
    <li>team names and scores</li>
    <li>whether the full version has been bought and how many trial rounds have been used</li>
    <li>your own card sets, created by you or received from another device</li>
    <li>recently played words, so they don’t repeat too soon</li>
    <li>settings for language, appearance, sounds, vibration, screen, game mode and school mode (including the school mode PIN you choose)</li>
  </ul>
  <p>This data is never transmitted and cannot be seen by the provider. You can delete it in the app under “Settings → Data on this device”; removing the app deletes everything. Please do not enter sensitive information about other people in your own lists.</p>

  <h2>4. Camera and sharing card sets</h2>
  <p>Your own card sets can be passed to other devices without a server: the sending device shows a QR code and the receiving device reads it with its camera. The camera is only opened when you choose “Scan QR code”; your device asks for permission first. The camera image is analysed on the device only and is never stored or transmitted. The same applies to a photo you choose via “Take a photo”. Alternatively, a card set can be passed on as text via your device’s share menu and pasted on the other device; you decide where to send the text (for example a messenger). A card set contains only the list name and the words – no player names and no scores.</p>

  <h2>5. Internet connections</h2>
  <p>The app does not open any network connections on its own – except the connection to the app distribution service that the operating system opens to buy or restore the full version (see section 6). It does not load fonts, libraries or content from third-party servers.</p>
  <p>The settings contain buttons that only open something when you tap them: “Rate” opens the app’s page in the app distribution service you got the app from. “Recommend” opens your device’s share menu with a short text and a link to the app. “Send feedback” opens your email app with a prepared message (app version, operating system version, language). You decide what you send; the app itself transmits nothing. An email to the provider is used only to reply to you (Art. 6(1)(f) GDPR) and deleted afterwards.</p>

  <h2>6. Downloading through an app distribution service and buying the full version</h2>
  <p>The full version is a one-time in-app purchase handled by the app distribution service the app was installed from. Payment and account data are processed exclusively by its operator; the provider never sees them. Through the purchase interface the app only learns whether the purchase exists and remembers this in local storage. In school mode all purchase buttons are hidden.</p>
  <p>When you download the app through an app distribution service, its operator processes data on its own responsibility (such as your account, device and time of download). The provider of this app has no influence on this. The operator’s privacy policy applies. The provider receives at most aggregated, non-personal statistics (such as the number of downloads).</p>

  <h2>7. This website</h2>
  <p>This policy and the app’s information page are also provided via GitHub Pages, a service of GitHub Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA. When you open them in a browser, GitHub processes technically necessary connection data such as your IP address in order to deliver and secure the pages. The legal basis is Art. 6(1)(f) GDPR; the legitimate interest is the reliable provision of the pages. GitHub is certified under the EU-US Data Privacy Framework. Details: <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">GitHub Privacy Statement</a>. The app itself does not retrieve anything from GitHub.</p>

  <h2>8. Children, young people and use in schools</h2>
  <p>SneakPlay is suitable for all ages but is not specifically aimed at children. The app collects no data from anyone. There is no advertising, no accounts and no communication with other people over the internet. For lessons, nicknames or team names are enough; no pupil data needs to be entered. School mode hides purchase buttons, rating, recommending and feedback.</p>

  <h2>9. Your rights</h2>
  <p>You have the rights of access, rectification, erasure, restriction of processing, data portability and objection under Art. 15 to 21 GDPR, as well as the right to lodge a complaint with a supervisory authority. As the provider stores no personal data, requests for access or erasure addressed to the provider will generally have nothing to act on. You can delete all data yourself in the app at any time.</p>

  <h2>10. Changes to this policy</h2>
  <p>This policy will be updated whenever app features relevant to data protection change. The current version is always available in the app.</p>

  <h2>11. Contact</h2>
  <p>For any questions about data protection, please write to <a href="mailto:smaehlmann.appdev@gmail.com">smaehlmann.appdev@gmail.com</a>.</p>
  <div class="links">
    <a class="back" href="index.html">Back</a>
    <a href="impressum-en.html">Legal notice</a>
    <a href="datenschutz.html">Deutsch</a>
  </div>
"""),

"impressum.html": ("de", "Impressum", f"""
  <h1>Impressum</h1>
  <p class="stand">SneakPlay · {STAND_DE}</p>

  <h2>Angaben gemäß § 5 DDG</h2>
  {ADDR_DE.replace('<br>\n    E-Mail: <a href="mailto:smaehlmann.appdev@gmail.com">smaehlmann.appdev@gmail.com</a>', '')}

  <h2>Kontakt</h2>
  <p>E-Mail: <a href="mailto:smaehlmann.appdev@gmail.com">smaehlmann.appdev@gmail.com</a></p>

  <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
  <p>Simon Mählmann, Anschrift wie oben.</p>

  <h2>Umsatzsteuer</h2>
  <p>Umsatzsteuer-Identifikationsnummer gemäß § 27 a UStG: DE430437820</p>
  <p>Kleinunternehmer gemäß § 19 UStG. Es wird keine Umsatzsteuer ausgewiesen und kein Vorsteuerabzug geltend gemacht.</p>

  <h2>Verbraucherstreitbeilegung</h2>
  <p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>

  <h2>Haftung für Inhalte</h2>
  <p>Die Inhalte dieser App wurden mit Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte kann jedoch keine Gewähr übernommen werden. Für Inhalte, die Nutzerinnen und Nutzer selbst in eigenen Listen eingeben, sind diese selbst verantwortlich.</p>

  <h2>Haftung für Links</h2>
  <p>Die App und die Datenschutzerklärung enthalten vereinzelt Verweise auf externe Websites Dritter, auf deren Inhalte kein Einfluss besteht. Für diese Inhalte ist stets der jeweilige Anbieter verantwortlich. Zum Zeitpunkt der Verlinkung waren keine Rechtsverstöße erkennbar. Bei Bekanntwerden von Rechtsverletzungen werden entsprechende Links umgehend entfernt.</p>

  <h2>Urheberrecht und Lizenzen</h2>
  <p>Die durch den Anbieter erstellten Inhalte, Texte und Spielideen dieser App unterliegen dem deutschen Urheberrecht. Für die technische Grundlage nutzt die App quelloffene Bausteine; ihre Lizenzen stehen unter <a href="lizenzen.html">Lizenzen</a>.</p>
  <div class="links">
    <a class="back" href="index.html">Zurück</a>
    <a href="datenschutz.html">Datenschutz</a>
    <a href="impressum-en.html">English</a>
  </div>
"""),

"impressum-en.html": ("en", "Legal notice", f"""
  <h1>Legal Notice</h1>
  <p class="stand">SneakPlay · {STAND_EN}</p>

  <h2>Information pursuant to Section 5 DDG (German Digital Services Act)</h2>
  {ADDR_EN.replace('<br>\n    Email: <a href="mailto:smaehlmann.appdev@gmail.com">smaehlmann.appdev@gmail.com</a>', '')}

  <h2>Contact</h2>
  <p>Email: <a href="mailto:smaehlmann.appdev@gmail.com">smaehlmann.appdev@gmail.com</a></p>

  <h2>Responsible for content pursuant to Section 18(2) MStV</h2>
  <p>Simon Mählmann, address as above.</p>

  <h2>VAT</h2>
  <p>VAT identification number pursuant to Section 27a of the German VAT Act: DE430437820</p>
  <p>Small business pursuant to Section 19 of the German VAT Act. No VAT is charged and no input tax is deducted.</p>

  <h2>Consumer dispute resolution</h2>
  <p>We are neither willing nor obliged to take part in dispute resolution proceedings before a consumer arbitration board.</p>

  <h2>Liability for content</h2>
  <p>The content of this app has been created with care. However, no guarantee can be given for its accuracy, completeness or timeliness. Users are responsible for any content they enter in their own lists.</p>

  <h2>Liability for links</h2>
  <p>The app and the privacy policy contain a few links to external third-party websites whose content we cannot influence. The respective provider is always responsible for that content. No legal violations were apparent at the time of linking. Should we become aware of any infringements, such links will be removed immediately.</p>

  <h2>Copyright and licences</h2>
  <p>The content, texts and game ideas created by the provider are subject to German copyright law. The app is built on open-source components; their licences are listed under <a href="lizenzen-en.html">Licences</a>.</p>
  <div class="links">
    <a class="back" href="index.html">Back</a>
    <a href="datenschutz-en.html">Privacy</a>
    <a href="impressum.html">Deutsch</a>
  </div>
"""),
}

LIB = """
  <ul>
    <li><b>Apache Cordova</b> – Apache License 2.0 – <a href="https://cordova.apache.org">cordova.apache.org</a></li>
    <li><b>cordova-plugin-statusbar</b> (Apache Software Foundation) – Apache License 2.0</li>
    <li><b>cordova-plugin-x-socialsharing</b> (Eddy Verbruggen) – MIT License</li>
    <li><b>cordova-plugin-insomnia</b> (Eddy Verbruggen) – MIT License</li>
    <li><b>cordova-plugin-purchase</b> (Jean-Christophe Hoelt) – In-App-Kauf / in-app purchase – MIT License</li>
    <li><b>Permissions-Plugin für Cordova</b> (NeoLSN) – Kamera-Erlaubnis / camera permission – Apache License 2.0</li>
    <li><b>jsQR</b> (Cosmo Wolfe) – QR-Erkennung / QR recognition – Apache License 2.0</li>
    <li><b>QR Code generator library</b> (Project Nayuki) – Grundlage der QR-Erzeugung / basis of QR generation – MIT License</li>
  </ul>
"""
MIT = """MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE."""
APACHE = """Licensed under the Apache License, Version 2.0 (the "License"); you may not use these files except in compliance with the License. You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License."""

PAGES["lizenzen.html"] = ("de", "Lizenzen", f"""
  <h1>Lizenzen</h1>
  <p class="stand">SneakPlay</p>
  <p>Spiel, Texte, Begriffe und Gestaltung von SneakPlay stammen vom Anbieter. Als technische Grundlage nutzt die App diese quelloffenen Bausteine:</p>
  {LIB}
  <h2>MIT License</h2>
  <pre>{MIT}</pre>
  <h2>Apache License 2.0</h2>
  <pre>{APACHE}</pre>
  <div class="links">
    <a class="back" href="index.html">Zurück</a>
    <a href="impressum.html">Impressum</a>
    <a href="lizenzen-en.html">English</a>
  </div>
""")
PAGES["lizenzen-en.html"] = ("en", "Licences", f"""
  <h1>Licences</h1>
  <p class="stand">SneakPlay</p>
  <p>The game, texts, words and design of SneakPlay were created by the provider. The app is built on these open-source components:</p>
  {LIB}
  <h2>MIT License</h2>
  <pre>{MIT}</pre>
  <h2>Apache License 2.0</h2>
  <pre>{APACHE}</pre>
  <div class="links">
    <a class="back" href="index.html">Back</a>
    <a href="impressum-en.html">Legal notice</a>
    <a href="lizenzen.html">Deutsch</a>
  </div>
""")

for name, (lang, title, body) in PAGES.items():
    html = HEAD.replace("{LANG}", lang).replace("{TITLE}", title) + body.strip("\n") + "\n</main>\n</body>\n</html>\n"
    for folder in ("www", "docs"):
        os.makedirs(os.path.join(ROOT, folder), exist_ok=True)
        with open(os.path.join(ROOT, folder, name), "w", encoding="utf-8") as fh:
            fh.write(html)
print(f"{len(PAGES)} Rechtstexte in www/ und docs/ erzeugt")
