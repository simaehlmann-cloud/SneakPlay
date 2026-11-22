/* SneakPlay – Ablauftest im echten Browser (läuft in beiden Workflows)
   Vorher im Repo-Ordner: python3 -m http.server 8765
   Dann:                  node smoketest.js
   Spielt jeden Modus durch (Deutsch und Englisch), prüft Aufdecken,
   geheime Abstimmung mit Gleichstand, Wertung, eigene Listen, Einstellungen,
   Zurück-Taste, Pausieren beim App-Wechsel, Layout auf kleinen Displays,
   Rechtstexte und dass eingegebene Namen keinen Code ausführen. */
"use strict";
const { chromium } = require("playwright");

const ROOT = process.env.BASE || "http://localhost:8765";
const APP = ROOT + "/www/index.html";
let fehler = 0;
const ok = (c, m) => { if (c) console.log("✓ " + m); else { fehler++; console.error("✗ " + m); } };

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const watch = page => {
    page.on("pageerror", e => errors.push(String(e)));
    page.on("console", m => { if (m.type() === "error" && !/cordova\.js|404|Failed to load resource/.test(m.text())) errors.push(m.text()); });
    page.on("dialog", d => { errors.push("Browser-Dialog: " + d.message()); d.dismiss(); });
  };
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "de-DE", hasTouch: false });
  await ctx.addInitScript(() => { window.__SNEAKPLAY_TEST__ = true; });
  const page = await ctx.newPage();
  watch(page);
  const act = (a, v) => page.click(v == null ? `[data-act="${a}"]` : `[data-act="${a}"][data-v="${v}"]`);
  const text = sel => page.textContent(sel);
  const fresh = async () => { await page.goto(APP); await page.evaluate(() => localStorage.clear()); await page.goto(APP); };
  const setPlayers = async names => { await page.evaluate(n => localStorage.setItem("sneakplay.players", JSON.stringify(n)), names); await page.goto(APP); };
  /* Alle Karten aufdecken; liefert die Texte der Karten */
  const revealAll = async n => {
    const cards = [];
    for (let i = 0; i < n; i++) {
      ok(await page.isDisabled("#nextBtn"), `Karte ${i + 1}: Weiter gesperrt, bevor sie angesehen wurde`);
      ok((await text("#secret")).trim() === "", `Karte ${i + 1}: Inhalt nicht im Dokument, solange verdeckt`);
      const box = await page.locator("#hold").boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      cards.push((await text("#secret")).replace(/\s+/g, " ").trim());
      await page.mouse.up();
      ok((await text("#secret")).trim() === "", `Karte ${i + 1}: nach dem Loslassen wieder verdeckt`);
      await page.click("#nextBtn");
    }
    return cards;
  };
  const noOverflow = async label => {
    const w = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(w <= 0, `${label}: kein waagerechtes Scrollen (${w}px)`);
  };

  /* ---------- Startseite ---------- */
  await fresh();
  ok(await page.isVisible("text=Willkommen"), "Erster Start: Willkommenshinweis");
  ok(await page.isDisabled('[data-act="start"]'), "Ohne Spieler kein Start");
  await act("quick");
  ok((await page.$$(".plist li")).length === 4, "Schnellstart legt 4 Spieler an");
  await page.fill("#nameIn", "Spieler 1");
  await page.press("#nameIn", "Enter");
  ok((await text(".plist li:last-child .pn")) === "Spieler 1 2", "Doppelter Name wird nummeriert");
  await act("prm", 4);
  await act("pup", 1);
  ok((await text(".plist li:first-child .pn")) === "Spieler 2", "Spieler nach oben verschieben");
  await act("rename", 0);
  await page.fill("#renIn", "Anna");
  await page.click(".dlg .btn.primary");
  ok((await text(".plist li:first-child .pn")) === "Anna", "Spieler umbenennen");
  await setPlayers(["Anna", "Ben", "Cleo", "Dana", "Emil", "Finn"]);
  await page.fill("#nameIn", "<img src=x onerror=window.__xss=1>");
  await page.press("#nameIn", "Enter");
  ok(await page.evaluate(() => !window.__xss) && (await page.$$(".plist img")).length === 0, "Eingegebene Namen werden nicht als HTML ausgeführt");
  await act("prm", 6);
  for (let k = 0; k < 6; k++) { await page.fill("#nameIn", "X" + k); await page.press("#nameIn", "Enter"); }
  ok((await page.$$(".plist li")).length === 12 && await page.isDisabled("#nameIn"), "Höchstens 12 Spieler");
  await setPlayers(["Anna", "Ben", "Cleo", "Dana", "Emil", "Finn"]);
  await noOverflow("Startseite");

  /* ---------- Hochstapler: gemeinsame Abstimmung, 2 Hochstapler + Ahnungsloser ---------- */
  await act("imps", 2);
  await act("clueless");
  await act("impTimer", 2);
  await act("start");
  let cards = await revealAll(6);
  const impCards = cards.filter(c => c.includes("Hochstapler") && c.includes("Deine Rolle")).length;
  const clueCards = cards.filter(c => c.includes("Ahnungslos")).length;
  const wordCards = cards.filter(c => c.includes("Euer geheimer Begriff"));
  ok(impCards === 2 && clueCards === 1 && wordCards.length === 3, `Rollen: 2 Hochstapler, 1 Ahnungsloser, 3 mit Begriff (${impCards}/${clueCards}/${wordCards.length})`);
  ok(new Set(wordCards).size === 1, "Alle mit Begriff sehen denselben Begriff");
  const roles = await page.evaluate(() => R.role.slice());
  const starter = await page.evaluate(() => R.starter);
  ok(roles[starter] === "crew", "Startspieler kennt den Begriff");
  ok(await page.isVisible("#timer"), "Diskussions-Timer sichtbar");
  await act("ttoggle");
  await page.waitForTimeout(1200);
  ok((await text("#tval")) !== "2:00", "Timer läuft");
  await page.evaluate(() => onHidden());
  const frozen = await text("#tval");
  await page.waitForTimeout(1100);
  ok((await text("#tval")) === frozen && /Weiter/.test(await text("#tbtn")), "Timer pausiert beim App-Wechsel");
  await act("tovote");
  ok(await page.isDisabled('[data-act="reveal"]'), "Aufdecken erst nach Auswahl");
  const imp = roles.indexOf("imp"), clue = roles.indexOf("clue");
  await act("accuse", imp);
  await act("reveal");
  ok(await page.isVisible("text=Erwischt"), "Hochstapler entlarvt");
  await act("showWord");
  ok(await page.isDisabled('[data-act="finish"]'), "Weiter erst, wenn alle Tipps bewertet sind");
  await act("judge", `${imp}:0`);
  await act("judge", `${clue}:1`);
  await act("finish");
  ok(await page.isVisible("text=Spürnasen-Team") && await page.isVisible("text=Schatten-Bluffer") && await page.isVisible("text=Gedankenleser"), "Auszeichnungen nach der Runde");
  const sc = await page.evaluate(() => JSON.parse(localStorage.getItem("sneakplay.scores")));
  const names = ["Anna", "Ben", "Cleo", "Dana", "Emil", "Finn"];
  const expect = roles.map((r, i) => r === "imp" ? (i === imp ? 0 : 2) : r === "clue" ? 3 : 1);
  ok(names.every((nm, i) => (sc[nm] || 0) === expect[i]), `Punkte stimmen (${JSON.stringify(sc)})`);
  await noOverflow("Auszeichnungen");

  /* Nächste Runde: anderer Begriff */
  const firstWord = await page.evaluate(() => R.word);
  await act("again");
  ok(await page.evaluate(w => R.word !== w, firstWord), "Nächste Runde zieht einen anderen Begriff");

  /* Abbrechen mit Zurück-Taste */
  await page.evaluate(() => document.dispatchEvent(new Event("backbutton")));
  ok(await page.isVisible(".dlg-box"), "Zurück-Taste in der Runde fragt nach");
  await page.click(".dlg .btn.danger");
  await page.waitForTimeout(50);
  ok(await page.isVisible(".hero"), "Runde beendet → Startseite");

  /* ---------- Hochstapler: geheime Abstimmung mit Gleichstand ---------- */
  await setPlayers(["Anna", "Ben", "Cleo", "Dana"]);
  await act("impVote", "secret");
  await act("start");
  await revealAll(4);
  await act("tovote");
  const votes = [1, 0, 0, 1];             // Gleichstand Anna/Ben
  for (let i = 0; i < 4; i++) {
    ok(await page.isVisible(`text=Ich bin ${["Anna", "Ben", "Cleo", "Dana"][i]}`), `Geheime Abstimmung: Handy an Person ${i + 1}`);
    await act("secretOpen");
    ok((await page.$$(`[data-act="secretSel"][data-v="${i}"]`)).length === 0, "Man kann nicht für sich selbst stimmen");
    await act("secretSel", votes[i]);
    await act("secretCast");
  }
  ok(await page.isVisible("text=Gleichstand"), "Gleichstand erkannt");
  ok((await page.$$('[data-act="accuse"]')).length === 2, "Stichwahl nur zwischen den Gleichplatzierten");
  await act("accuse", 0);
  await act("reveal");
  ok(await page.isVisible("text=Stimmen"), "Stimmenzahl wird gezeigt");
  if (await page.$('[data-act="showWord"]')) await act("showWord");
  for (const v of await page.$$eval('[data-act="judge"][data-v$=":0"]', bs => bs.map(b => b.dataset.v))) await act("judge", v);
  await act("finish");
  ok(await page.isVisible(".award"), "Runde nach geheimer Abstimmung gewertet");
  await act("home");

  /* ---------- Geheime Missionen ---------- */
  await act("mode", "missions");
  await act("start");
  cards = await revealAll(4);
  ok(cards.filter(c => c.includes("Keine!")).length === 1, "Genau eine Person ohne Mission");
  const missionTexts = cards.filter(c => !c.includes("Keine!")).map(c => c.split("Deine geheime Mission")[1]);
  ok(new Set(missionTexts).size === 3, "Alle Missionen verschieden");
  ok(new Set(cards.map(c => c.split("Deine")[0])).size === 1, "Alle sehen dasselbe Thema");
  await act("tovote");
  const none = await page.evaluate(() => R.none);
  await act("accuse", (none + 1) % 4);
  await act("reveal");
  ok(await page.isVisible("text=Falsch geraten") || await page.isVisible("text=Daneben"), "Falsch verdächtigt");
  for (const i of [0, 1, 2, 3].filter(i => i !== none)) { await act("mopen", i); await act("mres", `${i}:seen`); }
  await act("finish");
  ok(await page.isVisible("text=Pokerface") && await page.isVisible("text=Durchblicker"), "Missions-Auszeichnungen");
  await act("home");

  /* ---------- Wort-Bombe ---------- */
  await act("mode", "bomb");
  await act("fuse", "short");
  await page.evaluate(() => { BOMB_LEN.short = [1, 1]; });
  await act("start");
  const p1 = await text(".topic");
  await act("bombSkip");
  ok((await text(".topic")) !== p1, "Andere Aufgabe");
  await act("bombGo");
  ok(await page.isVisible(".bomb.live"), "Bombe tickt");
  await page.waitForTimeout(1500);
  ok(await page.isVisible("text=BUMM"), "Bombe geht hoch");
  await act("bombLoser", 2);
  await act("finish");
  ok(await page.isVisible("text=Bombenhalter"), "Bomben-Auszeichnung");
  await act("again");
  await page.evaluate(() => { BOMB_LEN.short = [5, 5]; });
  await act("bombGo");
  await page.evaluate(() => onHidden());
  ok(await page.isVisible('[data-act="bombResume"]'), "Bombe pausiert beim App-Wechsel");
  await page.waitForTimeout(5300);
  ok(!(await page.isVisible("text=BUMM")), "Pausierte Bombe geht nicht hoch");
  await page.evaluate(() => document.dispatchEvent(new Event("backbutton")));
  await page.click(".dlg .btn.danger");
  await page.waitForTimeout(50);

  /* ---------- Eigene Liste ---------- */
  await act("mode", "imposter");
  while (await page.$('[data-act="cat"][aria-checked="true"]')) await page.click('[data-act="cat"][aria-checked="true"]');
  ok(await page.isDisabled('[data-act="start"]'), "Ohne Kategorie kein Start");
  await act("lists");
  await act("listEdit", "");
  await page.fill("#lName", "Verein");
  await page.fill("#lWords", "Vereinsheim, Sommerfest\nTrainingslager\nvereinsheim");
  ok(/3 Begriffe/.test(await text("#lCount")), "Doppelte Begriffe werden zusammengefasst");
  await page.click('[data-act="listSave"]');
  await act("home");
  ok(await page.isVisible("text=✏️ Verein"), "Eigene Liste erscheint und ist gewählt");
  await act("impVote", "group");
  await act("start");
  ok(["Vereinsheim", "Sommerfest", "Trainingslager"].includes(await page.evaluate(() => R.word)), "Begriff stammt aus der eigenen Liste");
  await page.evaluate(() => document.dispatchEvent(new Event("backbutton")));
  await page.click(".dlg .btn.danger");

  /* ---------- Einstellungen, Sprache, Darstellung ---------- */
  await act("settings");
  await act("theme", "dark");
  ok((await page.getAttribute("html", "data-theme")) === "dark", "Dunkles Design");
  await act("theme", "light");
  ok((await page.getAttribute("html", "data-theme")) === "light", "Helles Design");
  await act("sound");
  ok(await page.evaluate(() => localStorage.getItem("sneakplay.sound")) === "false", "Töne aus");
  ok(!(await page.$("#btnRate")), "Im Browser kein Bewerten-Knopf");
  ok(/^mailto:/.test(await page.getAttribute("#btnMail", "href")), "Feedback per E-Mail");
  await act("lang", "en");
  ok(await page.isVisible("text=Settings") && (await page.getAttribute("html", "lang")) === "en", "Sprache Englisch");
  await noOverflow("Einstellungen");
  await page.click(`a[href="datenschutz-en.html"]`);
  ok(await page.isVisible("text=Privacy Policy"), "Datenschutz (EN) erreichbar");
  await page.click("a.back");
  ok(await page.isVisible(".hero"), "Zurück aus dem Rechtstext");
  ok(await page.isVisible("text=Players"), "Sprache bleibt nach Neuladen erhalten");

  /* ---------- Englische Runde ---------- */
  await act("mode", "imposter");
  await act("cat", "animals");
  await act("start");
  cards = await revealAll(4);
  ok(cards.some(c => c.includes("Your secret word")), "Englische Karten");
  const enWord = await page.evaluate(() => R.word);
  ok(await page.evaluate(w => CONTENT.en.cats.animals.words.includes(w) || CONTENT.en.cats.food.words.includes(w) || CONTENT.en.cats.everyday.words.includes(w) || lists().some(l => l.words.includes(w)), enWord), "Englischer Begriff aus englischer Liste");

  /* ---------- Kleines Display ---------- */
  await page.setViewportSize({ width: 320, height: 568 });
  await noOverflow("Spielfeld 320 px");
  await page.evaluate(() => goHome());
  await noOverflow("Startseite 320 px");
  await act("settings");
  await noOverflow("Einstellungen 320 px");
  await page.evaluate(() => goHome());
  await page.click('.link[data-act="rules"]');
  await noOverflow("Regeln 320 px");

  /* ---------- Alles löschen ---------- */
  await page.evaluate(() => goHome());
  await act("settings");
  await act("wipe");
  await page.click(".dlg .btn.danger");
  await page.waitForTimeout(50);
  ok(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith("sneakplay.")).length === 0), "Alle Daten gelöscht");

  /* ---------- Rechtstexte und Pages ---------- */
  for (const f of ["datenschutz", "datenschutz-en", "impressum", "impressum-en", "lizenzen", "lizenzen-en"]) {
    const r = await page.goto(ROOT + "/www/" + f + ".html");
    ok(r.ok() && /SneakPlay/.test(await page.title()), `www/${f}.html lädt`);
  }
  const r = await page.goto(ROOT + "/docs/index.html");
  ok(r.ok() && await page.isVisible("text=Hilfe & Kontakt"), "Pages-Infoseite lädt");

  /* ---------- Schutz gegen Doppeltippen (ohne Testschalter) ---------- */
  {
    const c2 = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "de-DE" });
    const p2 = await c2.newPage();
    watch(p2);
    await p2.goto(APP);
    await p2.evaluate(() => { localStorage.setItem("sneakplay.players", JSON.stringify(["A", "B", "C"])); });
    await p2.goto(APP);
    await p2.click('[data-act="start"]');
    await p2.waitForTimeout(450);
    const box = await p2.locator("#hold").boundingBox();
    await p2.mouse.move(box.x + 20, box.y + 20); await p2.mouse.down(); await p2.mouse.up();
    await p2.dblclick("#nextBtn");
    ok(await p2.evaluate(() => R.step) === 1, "Doppeltipp überspringt keine Karte");
    await c2.close();
  }

  ok(errors.length === 0, "Keine Fehler in der Konsole" + (errors.length ? ":\n  " + errors.join("\n  ") : ""));
  await browser.close();
  console.log(fehler ? `\n${fehler} Fehler` : "\nAlles in Ordnung");
  process.exit(fehler ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
