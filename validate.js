/* SneakPlay – statische Prüfung (läuft in beiden Workflows vor jedem Build)
   node validate.js
   Prüft Versionen, Dateien, Store-Texte, Rechtstexte, Übersetzungen,
   Inhalte und die Spiellogik mit vielen Zufallsrunden.
   Bricht mit Fehlercode ab, sobald etwas nicht passt. */
"use strict";
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const { execFileSync } = require("child_process");

const R = p => fs.readFileSync(path.join(__dirname, p), "utf8");
const exists = p => fs.existsSync(path.join(__dirname, p));
let fehler = 0, pruefungen = 0, warnungen = 0;
function ok(cond, msg) { pruefungen++; if (!cond) { fehler++; console.error("✗ " + msg); } }
function warn(msg) { warnungen++; console.warn("⚠ " + msg); }
function info(msg) { console.log("✓ " + msg); }

/* Plattform- und Store-Namen: in keinem Text, den Nutzer oder Prüfer sehen */
/* Fremde Marken und Titel: nicht in Texten, Schlüsselwörtern oder Inhalten */
const MARKEN = /\b(undercover|wer ist es|who is it|guess who|among us|spyfall|tick ?tack ?bumm|mission impossible|activity|tabu|taboo|codenames|werwolf|werewolf|james bond)\b/i;
const FREMD = /\b(android|google|apple|iphone|ipad|ios|ipados|app store|play store|google play|testflight|itunes|samsung|huawei)\b/i;

/* Sichtbarer Text einer HTML-Seite (ohne Stil, Skript und Tags) */
const visible = html => html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ");

/* ---------- Dateien und Syntax ---------- */
const index = R("www/index.html"), config = R("config.xml");
const scripts = [...index.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]).filter(s => s !== "cordova.js");
const ORDER = ["core", "i18n", "content", "decks", "game", "qr", "jsqr", "app"];
const OWN = ORDER.filter(f => f !== "jsqr");
ok(JSON.stringify(scripts) === JSON.stringify(ORDER.map(f => `js/${f}.js`)), "index.html bindet die Skripte in falscher Reihenfolge ein: " + scripts.join(", "));
ok(index.indexOf('<script src="cordova.js"></script>') > index.indexOf("js/app.js"), "cordova.js muss nach den App-Skripten stehen");
for (const s of scripts) {
  ok(exists("www/" + s), `Skript fehlt: www/${s}`);
  try { execFileSync(process.execPath, ["--check", path.join(__dirname, "www", s)], { stdio: "pipe" }); }
  catch (e) { ok(false, `Syntaxfehler in www/${s}:\n${e.stderr}`); }
}
ok(!/(src|href)="https?:\/\//.test(index), "index.html lädt nichts von fremden Servern");
ok(/Content-Security-Policy/.test(index) && /connect-src 'self'/.test(index) && /mediastream:/.test(index), "CSP fehlt, erlaubt fremde Verbindungen oder nicht den Kamera-Stream");
ok(!/color-mix\(/.test(index), "color-mix() gibt es erst ab iOS 16.2 – deployment-target ist 15.0");
for (const f of ["icon-192.png", "js/jsqr-LICENSE.txt", "datenschutz.html", "datenschutz-en.html", "impressum.html", "impressum-en.html", "lizenzen.html", "lizenzen-en.html"]) ok(exists("www/" + f), `www/${f} fehlt`);
ok(!exists("www/sw.js") && !exists("www/manifest.json"), "Webfassung-Reste gehören nicht in die App");
/* Unsichtbare Sonderzeichen (z. B. U+2028) zerbrechen Regex und Strings */
for (const f of OWN) ok(!/[\u2028\u2029\u200B\uFEFF]/.test(R(`www/js/${f}.js`)), `www/js/${f}.js enthält unsichtbare Sonderzeichen`);
info(`${scripts.length} Skripte vorhanden, syntaktisch korrekt, richtige Reihenfolge`);

/* ---------- Rechtstexte, Pages ---------- */
const LEGAL = ["datenschutz.html", "datenschutz-en.html", "impressum.html", "impressum-en.html", "lizenzen.html", "lizenzen-en.html"];
for (const f of ["index.html", ".nojekyll", "icon-192.png"]) ok(exists("docs/" + f), `docs/${f} fehlt`);
for (const f of LEGAL) {
  ok(exists("docs/" + f) && R("docs/" + f) === R("www/" + f), `docs/${f} weicht von www/${f} ab – neu erzeugen: python3 tools/make-legal.py`);
  const txt = visible(R("www/" + f));
  const m = txt.match(FREMD);
  ok(!m, `www/${f} nennt „${m && m[0]}“ – Rechtstexte bleiben neutral`);
  ok(/href="index\.html"/.test(R("www/" + f)), `www/${f}: Zurück-Link fehlt`);
}
for (const f of LEGAL.filter(f => !f.startsWith("lizenzen"))) {
  const s = R("www/" + f);
  ok(/Simon Mählmann/.test(s) && /28844 Weyhe/.test(s) && /smaehlmann\.appdev@gmail\.com/.test(s), `www/${f}: Anbieterangaben unvollständig`);
}
const docsIdx = visible(R("docs/index.html"));
ok(!FREMD.test(docsIdx), "docs/index.html (Support-Seite) nennt eine Plattform oder einen Store");
info("Rechtstexte DE/EN vollständig, in App und Pages gleich, ohne Plattform-Namen");

/* ---------- Versionen und Kennung ---------- */
const core = R("www/js/core.js");
const version = (core.match(/const APP_VERSION = "([^"]+)"/) || [])[1];
const cfgVersion = (config.match(/<widget[^>]* version="([^"]+)"/) || [])[1];
const vCode = Number((config.match(/android-versionCode="(\d+)"/) || [])[1]);
const iosBuild = Number((config.match(/ios-CFBundleVersion="(\d+)"/) || [])[1]);
ok(version && version === cfgVersion, `APP_VERSION (${version}) = config.xml version (${cfgVersion})`);
const [ma, mi, pa] = (version || "0.0.0").split(".").map(Number);
ok(vCode === ma * 10000 + mi * 100 + pa, `android-versionCode ${vCode} passt zu ${version} (erwartet ${ma * 10000 + mi * 100 + pa})`);
ok(iosBuild >= vCode, `ios-CFBundleVersion ${iosBuild} ist mindestens versionCode ${vCode}`);
const appId = (config.match(/<widget id="([^"]+)"/) || [])[1];
const app = R("www/js/app.js");
ok((app.match(/const PLAY_ID = "([^"]+)"/) || [])[1] === appId, "PLAY_ID in app.js passt nicht zur Kennung in config.xml");
const storeId = (app.match(/const APP_STORE_ID = "([^"]*)"/) || [])[1];
ok(/^\d*$/.test(storeId || ""), "APP_STORE_ID darf nur Ziffern enthalten");
if (!storeId) warn("APP_STORE_ID ist noch leer – „Bewerten“/„Weiterempfehlen“ fehlen in der iOS-Fassung, bis die ID eingetragen ist (VEROEFFENTLICHEN.md).");
for (const wf of [".github/workflows/android.yml", ".github/workflows/ios.yml"]) {
  const y = R(wf);
  ok(y.includes(`APP_ID: ${appId}`), `${wf}: APP_ID ist nicht ${appId}`);
  ok(y.includes("cp -r www/. build/www/"), `${wf} kopiert www/ nicht in die App`);
  ok(/mkdir -p platforms\n\s*cordova platform add/.test(y), `${wf}: vor „cordova platform add“ fehlt „mkdir -p platforms“`);
  ok(y.includes("node validate.js") && y.includes("node smoketest.js"), `${wf}: Prüfungen fehlen`);
}
ok(/name="target-device" value="handset"/.test(config), "config.xml: target-device=handset fehlt (sonst iPad-Pflichten)");
ok(/name="Orientation" value="portrait"/.test(config), "config.xml: Hochformat fehlt");
ok(/NSPhotoLibraryAddUsageDescription[\s\S]{0,200}<string>[^<]{30,}<\/string>/.test(config), "config.xml: Foto-Zweckangabe für das Teilen-Plugin fehlt");
ok(/android\.permission\.VIBRATE/.test(config), "config.xml: VIBRATE fehlt");
ok(!/android\.permission\.(RECORD_AUDIO|ACCESS_FINE_LOCATION|ACCESS_COARSE_LOCATION|READ_CONTACTS)/.test(config), "config.xml fordert unnötige Berechtigungen an");
ok(/android\.permission\.CAMERA/.test(config) && /android\.hardware\.camera" android:required="false"/.test(config), "config.xml: Kamera für den QR-Scanner (optional) fehlt");
ok(/NSCameraUsageDescription[\s\S]{0,200}<string>[^<]{30,}<\/string>/.test(config), "config.xml: Kamera-Zweckangabe fehlt – iOS beendet die App beim ersten Scan");
ok(/cordova-plugin-android-permissions/.test(config), "config.xml: Kamera-Erlaubnis unter Android (Plugin) fehlt");
ok(/AllowInlineMediaPlayback" value="true"/.test(config), "config.xml: AllowInlineMediaPlayback fehlt – Kamerabild sonst im Vollbild-Player");
ok(!/<access origin="\*"/.test(config.replace(/<!--[\s\S]*?-->/g, "")), "config.xml: <access origin=\"*\"> nicht erlaubt");
const pm = R("res/ios/PrivacyInfo.xcprivacy");
ok(/NSPrivacyTracking<\/key>\s*<false\/>/.test(pm) && /CA92\.1/.test(pm), "PrivacyInfo.xcprivacy unvollständig");
ok((config.match(/<description>([^<]*)<\/description>/) || [, ""])[1].search(FREMD) < 0, "config.xml-Beschreibung nennt eine Plattform");
info(`Version ${version}, Android ${vCode}, iOS-Build ${iosBuild}, Kennung ${appId}`);

/* ---------- Store-Texte ---------- */
const st = R("STORE-TEXTE.md");
function block(section, label) {
  const sec = st.split(/^## /m).find(s => s.startsWith(section));
  if (!sec) return null;
  const i = sec.indexOf("**" + label);
  if (i < 0) return null;
  const m = sec.slice(i).match(/```\n([\s\S]*?)\n```/);
  return m ? m[1] : null;
}
const bytes = s => Buffer.byteLength(s, "utf8");
const LIMITS = [["Name", 30], ["Untertitel", 30, "Subtitle"], ["Kurzbeschreibung", 80, "Short description"], ["Werbetext", 170, "Promotional text"], ["Schlüsselwörter", 100, "Keywords", true], ["Beschreibung", 4000, "Description"]];
for (const [sec, isDe] of [["Deutsch", true], ["English", false]]) {
  for (const [de, max, en, isBytes] of LIMITS) {
    const label = isDe ? de : (en || "Name");
    const txt = block(sec, label);
    ok(txt != null, `STORE-TEXTE.md: ${sec} → ${label} fehlt`);
    if (txt == null) continue;
    const len = isBytes ? bytes(txt) : [...txt].length;
    ok(len <= max, `STORE-TEXTE.md: ${sec} → ${label} ist ${len} lang (höchstens ${max})`);
    const m = txt.match(FREMD);
    ok(!m, `STORE-TEXTE.md: ${sec} → ${label} nennt „${m && m[0]}“`);
    const mk = txt.match(MARKEN);
    ok(!mk, `STORE-TEXTE.md: ${sec} → ${label} nennt die fremde Marke „${mk && mk[0]}“`);
    if (isBytes) ok(!/, /.test(txt) && !/\s$/.test(txt), `STORE-TEXTE.md: ${sec} → Schlüsselwörter ohne Leerzeichen nach Kommas`);
  }
}
const review = (st.match(/### Prüfungsanmerkungen[\s\S]*?```\n([\s\S]*?)\n```/) || [])[1] || "";
ok(review && !FREMD.test(review), "Prüfungsanmerkungen fehlen oder nennen eine Plattform");
info("Store-Texte DE/EN innerhalb der Grenzen und ohne Plattform-Namen");

/* ---------- App-Code in einer Sandbox laden ---------- */
const memory = {};
const sandbox = {
  console, Math, JSON, Date, Array, Object, String, Number, Set, Map, Uint32Array, Buffer, performance: { now: () => Date.now() },
  setInterval: () => 0, clearInterval: () => {}, setTimeout: () => 0, clearTimeout: () => {},
  localStorage: { getItem: k => (k in memory ? memory[k] : null), setItem: (k, v) => { memory[k] = String(v); }, removeItem: k => { delete memory[k]; } },
  navigator: { language: "de-DE", languages: ["de-DE"], userAgent: "node" },
  TextEncoder,
  crypto: { getRandomValues: a => { for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 4294967296); return a; } },
  document: { documentElement: { lang: "" }, getElementById: () => null }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ["core", "i18n", "content", "decks", "game", "qr"]) vm.runInContext(R(`www/js/${f}.js`) + "\n;globalThis.__x = 1;", sandbox, { filename: f + ".js" });
const G = vm.runInContext("({ DECKS, DECK_GENERAL, DECK_MATH, DECK_ICON, SCHOOL_TOPICS, SCHOOL_MISSIONS, BOMB_MATH, MAX_PLAYERS, similarFor, explainPoints, parseCards, cardsToText, encodeSet, decodeSet, qrParts, parseQrPart, partCollector, QR, utf8Len, levelOk, I18N, CONTENT, CAT_ORDER, CAT_ICON, MODES, MIN_PLAYERS, assignImposter, pickFresh, pickManyFresh, tally, scoreImposter, scoreMissions, scoreBomb, bombPrompts, tickInterval, bombDuration, uniqueName, parseWords, cleanText, esc, BOMB_LEN })", sandbox);

/* ---------- Übersetzungen ---------- */
const LANGS = Object.keys(G.I18N);
ok(LANGS.join() === "de,en", "Sprachen sind de und en");
const deKeys = Object.keys(G.I18N.de), enKeys = Object.keys(G.I18N.en);
for (const k of deKeys) ok(k in G.I18N.en, `Übersetzung fehlt (en): ${k}`);
for (const k of enKeys) ok(k in G.I18N.de, `Übersetzung fehlt (de): ${k}`);
for (const k of deKeys) {
  const vars = s => [...(typeof s === "object" ? s.one + s.other : String(s)).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join();
  ok(vars(G.I18N.de[k]) === vars(G.I18N.en[k]), `Platzhalter weichen ab bei ${k}`);
}
/* Benutzte Schlüssel: wörtliche t("…") und zusammengesetzte Familien */
const used = new Set([...app.matchAll(/\bt\("([a-z][\w.]*)"/g)].map(m => m[1]).filter(k => !k.endsWith(".")));
for (const m of app.matchAll(/t\([^()]*\?\s*"([\w.]+)"\s*:\s*"([\w.]+)"/g)) { used.add(m[1]); used.add(m[2]); }
["cat", "similar", "none"].forEach(h => { used.add("opt.hint." + h); used.add("opt.hint." + h + ".s"); });
[0, 1, 2, 3].forEach(i => used.add("team.default." + i));
G.MODES.forEach(m => { used.add("mode." + m); used.add("mode." + m + ".sub"); used.add("rules." + m); used.add("rules." + m + ".score"); });
used.add("timer.startTalk");
const awardKeys = [...R("www/js/game.js").matchAll(/key: "(\w+)"/g)].map(m => m[1]);
awardKeys.forEach(k => { used.add("aw." + k); used.add("aw." + k + ".text"); });
for (const k of used) ok(k in G.I18N.de, `Benutzter Schlüssel fehlt in i18n.js: ${k}`);
for (const k of deKeys) ok(used.has(k), `Unbenutzte Übersetzung: ${k}`);
for (const l of LANGS) for (const [k, v0] of Object.entries(G.I18N[l])) {
  const v = typeof v0 === "object" ? v0.one + " " + v0.other : v0;
  if (typeof v0 === "object") ok(typeof v0.one === "string" && typeof v0.other === "string", `${l}/${k}: Einzahl und Mehrzahl`);
  const m = String(v).match(FREMD);
  ok(!m, `Oberflächentext ${l}/${k} nennt „${m && m[0]}“`);
  const mk = String(v).match(MARKEN);
  ok(!mk, `Oberflächentext ${l}/${k} nennt die fremde Marke „${mk && mk[0]}“`);
}
info(`${deKeys.length} Texte in beiden Sprachen, alle benutzt, gleiche Platzhalter, keine Plattform-Namen`);

/* ---------- Inhalte ---------- */
const BLOCK = /\b(bier|beer|wein|wine|schnaps|alkohol|alcohol|vodka|wodka|tequila|whisky|whiskey|rum|gin|sekt|cocktail|aperol|spritz|kater|hangover|prost|cheers|betrunken|drunk|saufen|shot|kurzer|zigarette|cigarette|rauchen|smoking|kiffen|casino|wette|betting|waffe|weapon|pistole|gun|blut|blood)\b/i;
for (const l of LANGS) {
  const C = G.CONTENT[l];
  ok(JSON.stringify(Object.keys(C.cats)) === JSON.stringify(G.CAT_ORDER), `${l}: Kategorien weichen von CAT_ORDER ab`);
  let total = 0;
  for (const id of G.CAT_ORDER) {
    const c = C.cats[id];
    ok(c && c.name && G.CAT_ICON[id], `${l}: Kategorie ${id} unvollständig`);
    ok(c.words.length >= 20, `${l}/${id}: nur ${c.words.length} Begriffe (mindestens 20)`);
    ok(new Set(c.words.map(w => w.toLowerCase())).size === c.words.length, `${l}/${id}: doppelte Begriffe`);
    c.words.forEach(w => ok(w.length <= 30 && w === w.trim(), `${l}/${id}: Begriff „${w}“ zu lang oder mit Leerraum`));
    total += c.words.length;
  }
  ok(total > 180, `${l}: nur ${total} Begriffe – Store-Text verspricht über 180`);
  ok(C.topics.length >= 25 && new Set(C.topics).size === C.topics.length, `${l}: zu wenige oder doppelte Gesprächsthemen`);
  ok(C.missions.length >= 40 && new Set(C.missions).size === C.missions.length, `${l}: zu wenige oder doppelte Missionen`);
  ok(C.missions.length >= 13, `${l}: Missionen reichen nicht für ${12} Spieler`);
  const bp = G.bombPrompts(l);
  ok(bp.length > 60 && new Set(bp).size === bp.length, `${l}: ${bp.length} Bomben-Aufgaben – Store-Text verspricht über 60, ohne Doppelte`);
  const all = [...G.CAT_ORDER.flatMap(id => C.cats[id].words), ...G.CAT_ORDER.map(id => C.cats[id].name), ...C.topics, ...C.missions, ...bp];
  all.forEach(s => { const m = String(s).match(BLOCK); ok(!m, `${l}: Inhalt „${s}“ berührt ein Tabu-Thema („${m && m[0]}“)`); });
  all.forEach(s => { const m = String(s).match(FREMD); ok(!m, `${l}: Inhalt „${s}“ nennt eine Plattform`); });
  all.forEach(s => { const m = String(s).match(MARKEN); ok(!m, `${l}: Inhalt „${s}“ nennt eine fremde Marke`); });
}
ok(G.CONTENT.de.topics.length === G.CONTENT.en.topics.length && G.CONTENT.de.missions.length === G.CONTENT.en.missions.length, "Themen und Missionen in beiden Sprachen gleich viele");
info("Inhalte: genug Begriffe, Themen, Missionen und Bomben-Aufgaben, keine Doppelten, keine Tabu-Themen");

/* ---------- Spiellogik ---------- */
for (let n = 3; n <= 12; n++) {
  for (const opt of [{ imps: 1, clueless: false }, { imps: 2, clueless: false }, { imps: 1, clueless: true }, { imps: 2, clueless: true }]) {
    for (let k = 0; k < 300; k++) {
      const { role, starter } = G.assignImposter(n, opt);
      const imps = role.filter(r => r === "imp").length, clue = role.filter(r => r === "clue").length, crew = role.filter(r => r === "crew").length;
      const wantImps = opt.imps === 2 && n >= 6 ? 2 : 1, wantClue = opt.clueless && n >= 5 ? 1 : 0;
      if (role.length !== n || imps !== wantImps || clue !== wantClue || crew < 2 || role[starter] !== "crew") {
        ok(false, `assignImposter(${n}, ${JSON.stringify(opt)}) liefert ${JSON.stringify(role)}, Start ${starter}`); k = 1e9; break;
      }
    }
  }
}
/* Gleichverteilung: jeder Platz wird etwa gleich oft Hochstapler */
{
  const n = 6, cnt = Array(n).fill(0), N = 30000;
  for (let k = 0; k < N; k++) cnt[G.assignImposter(n, { imps: 1 }).role.indexOf("imp")]++;
  ok(cnt.every(c => Math.abs(c - N / n) < N / n * 0.1), `Hochstapler nicht gleich verteilt: ${cnt}`);
}
/* Ohne Wiederholung, bis der Vorrat erschöpft ist */
{
  const pool = Array.from({ length: 20 }, (_, i) => "w" + i);
  let usedList = [], seen = new Set();
  for (let k = 0; k < 20; k++) { const r = G.pickFresh(pool, x => x, usedList); usedList = r.used; seen.add(r.item); }
  ok(seen.size === 20, `pickFresh wiederholt vor Erschöpfung (${seen.size}/20)`);
  const r = G.pickFresh(pool, x => x, usedList);
  ok(pool.includes(r.item) && r.used.length <= 21, "pickFresh beginnt nach Erschöpfung neu");
  const many = G.pickManyFresh(pool, x => x, [], 12);
  ok(new Set(many.items).size === 12, "pickManyFresh liefert doppelte Missionen");
  const big = G.pickManyFresh(pool, x => x, pool.slice(0, 15), 12);
  ok(new Set(big.items).size === 12, "pickManyFresh nach Teil-Erschöpfung doppelt");
}
/* Stimmen */
{
  const t1 = G.tally([1, 0, 1, 1], 4); ok(t1.top.join() === "1" && t1.counts[1] === 3, "tally: klare Mehrheit");
  const t2 = G.tally([1, 0, 0, 1], 4); ok(t2.top.join() === "0,1", "tally: Gleichstand");
  const t3 = G.tally([null, 9, -1], 3); ok(t3.top.length === 0, "tally: ungültige Stimmen ignoriert");
}
/* Wertung Hochstapler: alle Fälle */
{
  const role = ["crew", "imp", "crew", "crew", "clue"];
  let r = G.scoreImposter({ role, accused: 1, judged: { 1: false, 4: true }, votes: null });
  ok(r.delta.join() === "1,0,1,1,3", "Hochstapler entlarvt, Ahnungsloser richtig: " + r.delta);
  r = G.scoreImposter({ role, accused: 1, judged: { 1: true, 4: false }, votes: null });
  ok(r.delta.join() === "0,3,0,0,0", "Sieg geklaut: " + r.delta);
  r = G.scoreImposter({ role, accused: 2, judged: { 4: false }, votes: [1, 2, 1, 2, 2] });
  ok(r.delta.join() === "0,2,0,0,0", "Hochstapler unentdeckt: " + r.delta);
  ok(r.awards.some(a => a.key === "sharp" && a.who.join() === "0,2"), "Scharfer Blick bei geheimer Abstimmung");
  const two = ["imp", "crew", "imp", "crew", "crew", "crew"];
  r = G.scoreImposter({ role: two, accused: 0, judged: { 0: false }, votes: null });
  ok(r.delta.join() === "0,1,2,1,1,1", "Zwei Hochstapler, einer entlarvt: " + r.delta);
}
/* Wertung Missionen */
{
  let r = G.scoreMissions({ n: 4, none: 2, accused: 2, res: { 0: "ok", 1: "seen", 3: "fail" }, votes: null });
  ok(r.delta.join() === "3,2,1,1", "Missionsloser enttarnt: " + r.delta);
  r = G.scoreMissions({ n: 4, none: 2, accused: 0, res: { 0: "seen", 1: "seen", 3: "seen" }, votes: [2, 2, 0, 0] });
  ok(r.delta.join() === "1,1,5,1", "Missionsloser nicht enttarnt: " + r.delta);
  ok(r.awards.some(a => a.key === "observer" && a.n === 3), "Durchblicker ab zwei erratenen Missionen");
}
/* Wort-Bombe */
{
  const r = G.scoreBomb(4, 2); ok(r.delta.join() === "1,1,0,1", "Wort-Bombe: " + r.delta);
  ok(G.tickInterval(0) === 900 && G.tickInterval(1) === 150 && G.tickInterval(0.5) < 900, "Ticks werden schneller");
  for (const len of Object.keys(G.BOMB_LEN)) for (let k = 0; k < 200; k++) {
    const d = G.bombDuration(len), [a, b] = G.BOMB_LEN[len];
    if (d < a * 1000 || d > b * 1000) { ok(false, `bombDuration(${len}) = ${d}`); break; }
  }
}
/* Texte säubern */
ok(G.uniqueName("Anna", ["Anna", "Anna 2"]) === "Anna 3", "uniqueName zählt hoch");
ok(G.uniqueName("A".repeat(16), ["A".repeat(16)]).length <= 16, "uniqueName bleibt in der Längengrenze");
ok(G.parseWords("a, b\nB;  c ,,\n").join("|") === "a|b|c", "parseWords: trennen, säubern, doppelte raus");
ok(G.cleanText("  x\u0000\u2028y  ", 10) === "x y", "cleanText entfernt Steuerzeichen");
ok(G.esc(`<img src=x onerror="a">'`) === "&lt;img src=x onerror=&quot;a&quot;&gt;&#39;", "esc maskiert HTML");
info("Spiellogik: Rollen, Zufall, Wiederholungen, Abstimmung und Wertung geprüft");

/* ---------- Kartendecks, Schule, Mathe ---------- */
for (const l of LANGS) {
  const D = G.DECKS[l];
  ok(JSON.stringify(Object.keys(D).sort()) === JSON.stringify(G.DECK_GENERAL.concat(G.DECK_MATH).sort()), `${l}: Decks weichen von DECK_GENERAL/DECK_MATH ab`);
  let total = 0;
  for (const id of Object.keys(D)) {
    const d = D[id];
    ok(d.name && G.DECK_ICON[id], `${l}/${id}: Name oder Symbol fehlt`);
    ok(d.cards.length >= 16, `${l}/${id}: nur ${d.cards.length} Karten`);
    ok(new Set(d.cards.map(c => c.w.toLowerCase())).size === d.cards.length, `${l}/${id}: doppelte Begriffe`);
    if (G.DECK_MATH.includes(id)) ok(d.cards.filter(c => c.lv === 1).length >= 6, `${l}/${id}: zu wenige Karten für Klasse 5–6`);
    for (const c of d.cards) {
      const w = c.w.toLowerCase();
      ok(c.f.length === 4 && new Set(c.f.map(x => x.toLowerCase())).size === 4, `${l}/${id}/${c.w}: genau 4 verschiedene verbotene Wörter (${c.f.join(", ")})`);
      /* Teile des Begriffs dürfen verboten sein (Regenschirm → Regen), der Begriff selbst nicht */
      ok(c.f.every(x => x && x.trim() === x && x.toLowerCase() !== w), `${l}/${id}/${c.w}: Begriff selbst steht in den verbotenen Wörtern`);
      ok([1, 2, 3].includes(c.lv), `${l}/${id}/${c.w}: Niveau ${c.lv}`);
      ok(!c.s || c.s.toLowerCase() !== w, `${l}/${id}/${c.w}: ähnlicher Begriff gleich dem Begriff`);
      if (id === "ex_school" || G.DECK_MATH.includes(id)) ok(!!c.s, `${l}/${id}/${c.w}: ähnlicher Begriff fehlt`);
      const all = [c.w, ...c.f, c.s].join(" ");
      const m = all.match(BLOCK) || all.match(FREMD) || all.match(MARKEN);
      ok(!m, `${l}/${id}/${c.w}: unzulässiger Inhalt „${m && m[0]}“`);
    }
    total += d.cards.length;
  }
  ok(total >= 170, `${l}: nur ${total} Erklär-Karten`);
  ok(G.SCHOOL_TOPICS[l].length >= 15 && new Set(G.SCHOOL_TOPICS[l]).size === G.SCHOOL_TOPICS[l].length, `${l}: Schul-Themen`);
  ok(G.SCHOOL_MISSIONS[l].length >= G.MAX_PLAYERS && new Set(G.SCHOOL_MISSIONS[l]).size === G.SCHOOL_MISSIONS[l].length, `${l}: Schul-Missionen reichen nicht für ${G.MAX_PLAYERS} Spieler`);
  ok(G.CONTENT[l].missions.length >= G.MAX_PLAYERS, `${l}: Missionen reichen nicht für ${G.MAX_PLAYERS} Spieler`);
  ok(G.BOMB_MATH[l].length >= 30 && G.BOMB_MATH[l].filter(([, v]) => v === 1).length >= 15, `${l}: Mathe-Bomben-Aufgaben`);
  [...G.SCHOOL_TOPICS[l], ...G.SCHOOL_MISSIONS[l], ...G.BOMB_MATH[l].map(x => x[0])].forEach(x => { const m = x.match(BLOCK) || x.match(FREMD) || x.match(MARKEN); ok(!m, `${l}: unzulässiger Inhalt „${x}“`); });
}
info("Erklär- und Mathe-Decks: je 4 verbotene Wörter, Niveaus, ähnliche Begriffe, Schul-Inhalte vollständig");

/* ---------- Eigene Karten und Austausch ---------- */
{
  const c = G.parseCards("Parallelogramm: Viereck, parallel, Seiten, schief, Parallelogramm\nPrimzahl: Teiler;teilbar\nA, B, a\n\n  C  ");
  ok(c.length === 5 && c[0].f.length === 4 && c[1].f.join() === "Teiler,teilbar" && c.map(x => x.w).join() === "Parallelogramm,Primzahl,A,B,C", "parseCards: Begriffe, verbotene Wörter, Doppelte: " + JSON.stringify(c));
  ok(G.parseCards(G.cardsToText(c)).length === 5, "cardsToText ↔ parseCards");
  const set = { name: "Ünïcödé | Test", cards: Array.from({ length: 120 }, (_, i) => ({ w: "Begriff Nr. " + i + " äöüß😀", f: ["eins", "zwei|drei", "vier"] })) };
  const enc = G.encodeSet(set);
  const dec = G.decodeSet("Hier ist ein Set:\n" + enc + "\n");
  ok(dec && dec.cards.length === 120 && dec.cards[5].f.length === 3 && dec.name === "Ünïcödé / Test", "encodeSet/decodeSet mit Sonderzeichen und Text drumherum");
  ok(G.decodeSet("SneakPlay-Karten v1\nX\nA") === null, "decodeSet lehnt zu kleine Sets ab");
  const parts = G.qrParts(enc);
  ok(parts.length > 1 && parts.every(p => G.utf8Len(p) <= 600), `qrParts zerlegt in lesbare Teile (${parts.length})`);
  const col = G.partCollector();
  let full = null;
  for (const p of parts.slice().reverse().concat(parts[0])) { const r = col.add(G.parseQrPart(p)); if (r) full = r; }
  ok(full === enc, "Teile in beliebiger Reihenfolge ergeben wieder das Set");
  ok(G.parseQrPart("SPQ|ab|1|2|x") === null && G.parseQrPart("http://x") === null, "fremde QR-Codes werden erkannt");
  for (const p of parts) { const q = G.QR.encode(p); if (q.version > 27) { ok(false, `QR-Teil braucht Version ${q.version} – zu dicht für Beamer`); break; } }
  ok(G.QR.encode(parts[0]).size > 21, "QR-Codierung funktioniert");
}
/* Ähnlicher Begriff und Erklär-Wertung */
{
  const pool = [{ cat: "a", word: "X", s: "Y" }, { cat: "a", word: "Z", s: "" }, { cat: "b", word: "Q", s: "" }];
  ok(G.similarFor(pool[0], pool) === "Y", "similarFor nimmt den hinterlegten Begriff");
  ok(G.similarFor(pool[1], pool) === "X", "similarFor nimmt sonst einen aus derselben Kategorie");
  ok(G.similarFor(pool[2], pool) === "", "similarFor ohne Partner liefert nichts");
  const log = [{ res: "ok" }, { res: "ok" }, { res: "taboo" }, { res: "skip" }];
  ok(G.explainPoints(log, true) === 1 && G.explainPoints(log, false) === 2, "Erklär-Punkte mit und ohne Abzug");
  ok(G.scoreBomb(3, 1).delta.join() === "1,0,1", "Wort-Bombe mit Teams");
  ok(G.levelOk(1, 1) && !G.levelOk(3, 2) && G.levelOk(undefined, 1), "Niveau-Filter");
}
info("Eigene Karten, Text- und QR-Austausch, ähnlicher Begriff, Erklär-Wertung geprüft");

/* ---------- Nutzertext nur über esc() ---------- */
{
  /* Grobe Prüfung: ${…} in HTML-Vorlagen muss esc(), names(), eine Zahl,
     ein Symbol oder ein bekannter Baustein sein. */
  const SAFE = /^(esc\(|x\.res|sample\b|set\.cards\.length|mathOn|school\(\)|T\.|teamMode|extraHtml|max\b|TEAM_COLORS|on\b|deckIcon|general\.map|withSchoolMath|customChips|chip\(|dot\(|levelSeg|playersCard|teamsCard|exScoreboard|awardRows|scoreTable|c\.icon|c\.f|pts|tm\b|sch\b|!!on|disabled|withAbort|MODES\.|fmtTime|b\.|l\b|String\(|act\b|disabledFn|options\.|buttons\.|\[\[|names\(|t\("|i \+ 1|n\b|k \* 90|MODE_ICON|CAT_ICON|R\.icon|a\.icon|i\b|g\b|k\b|s\b|d\b|MAX_|MIN_|LANG|legalUrl|topbar|backbar|langSwitch|seg\(|sw\(|timerCard|modeOptions|catChips|scoreCard|countsLine|head|body|sec|first|why|rate|share|l\.words\.length|R\.counts|c\b|v\b|f\b|id\b|o\.|dark|light|i === |k === |R\.|guessers|holders|n \?|st ===|parts|rows|r\.awards|order|L\.length|P\.map|builtIn|a\.who|imps|clue|topic|ready|\(|"|')/;
  const bad = [];
  for (const m of app.matchAll(/\$\{([^}]{0,60})/g)) if (!SAFE.test(m[1].trim())) bad.push(m[1].trim());
  ok(bad.length === 0, "Vorlagen ohne esc(): " + bad.slice(0, 8).join(" | "));
}

console.log(`\n${pruefungen} Prüfungen, ${fehler} Fehler, ${warnungen} Hinweise`);
process.exit(fehler ? 1 : 0);
