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
  /* Die meisten Abläufe mit Vollversion; Testrunden und Kaufbildschirm prüft ein eigener Abschnitt */
  const fresh = async () => { await page.goto(APP); await page.evaluate(() => { localStorage.clear(); localStorage.setItem("sneakplay.pro", "true"); }); await page.goto(APP); };
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
    const who = w > 0 ? await page.evaluate(() => [...document.querySelectorAll("#view *")].filter(e => e.getBoundingClientRect().right > innerWidth + 0.5).slice(-3).map(e => e.tagName + "." + e.className + ": " + (e.textContent || "").trim().slice(0, 40)).join(" | ")) : "";
    ok(w <= 0, `${label}: kein waagerechtes Scrollen (${w}px) ${who}`);
  };

  /* ---------- Startseite ---------- */
  await fresh();
  ok(await page.isVisible(".worldpick") && !(await page.isVisible("text=Willkommen")), "Erster Start: Frage „Wo spielt ihr?“");
  ok(await page.evaluate(() => !document.querySelector('[data-act="cat"][data-v="m_space"]')), "Ohne Wahl: keine Mathe-Kategorien");
  await page.click('.worldpick [data-v="free"]');
  ok(await page.isVisible(".worldsw") && !(await page.isVisible(".worldpick")) && await page.evaluate(() => world() === "free"), "Bereich Freizeit gewählt, Umschalter sichtbar");
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
  await page.fill("#dlgIn", "Anna");
  await page.click(".dlg .btn.primary");
  ok((await text(".plist li:first-child .pn")) === "Anna", "Spieler umbenennen");
  await setPlayers(["Anna", "Ben", "Cleo", "Dana", "Emil", "Finn"]);
  await page.fill("#nameIn", "<img src=x onerror=window.__xss=1>");
  await page.press("#nameIn", "Enter");
  ok(await page.evaluate(() => !window.__xss) && (await page.$$(".plist img")).length === 0, "Eingegebene Namen werden nicht als HTML ausgeführt");
  await act("prm", 6);
  const maxP = await page.evaluate(() => MAX_PLAYERS);
  for (let k = 6; k < maxP; k++) { await page.fill("#nameIn", "X" + k); await page.press("#nameIn", "Enter"); }
  ok((await page.$$(".plist li")).length === maxP && await page.isDisabled("#nameIn"), `Höchstens ${maxP} Spieler`);
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
  ok(/^3 Karten/.test(await text("#lCount")), "Doppelte Begriffe werden zusammengefasst");
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
  await Promise.all([page.waitForNavigation(), page.click(`a[href="datenschutz-en.html"]`)]);
  ok(await page.isVisible("text=Privacy Policy"), "Datenschutz (EN) erreichbar");
  await Promise.all([page.waitForNavigation(), page.click("a.back")]);
  await page.waitForSelector(".hero");
  ok(await page.isVisible(".hero"), "Zurück aus dem Rechtstext");
  ok(await page.isVisible("text=Players"), "Sprache bleibt nach Neuladen erhalten");

  /* ---------- Englische Runde ---------- */
  await act("mode", "imposter");
  await act("cat", "animals");
  await act("start");
  cards = await revealAll(4);
  ok(cards.some(c => c.includes("Your secret word")), "Englische Karten");
  const enWord = await page.evaluate(() => R.word);
  ok(await page.evaluate(w => CONTENT.en.cats.animals.words.includes(w) || CONTENT.en.cats.food.words.includes(w) || CONTENT.en.cats.everyday.words.includes(w) || lists().some(l => l.cards.some(c => c.w === w)), enWord), "Englischer Begriff aus englischer Liste");


  /* ---------- Hochstapler: ähnlicher Begriff, Mathe-Kategorie mit Niveau ---------- */
  await page.evaluate(() => goHome());
  await act("lang", "de");
  await act("mode", "imposter");
  await act("world", "school");
  ok(await page.evaluate(() => isSchool() && !!document.querySelector('[data-act="cat"][data-v="m_space"]') && !!document.querySelector('[data-act="level"]')), "Bereich Schule: Mathe-Kategorien und Niveau");
  ok(await page.evaluate(() => { const s = opts("imp", DEF_IMP).cats.join(); store.set("world", "free"); const f = opts("imp", DEF_IMP).cats.join(); store.set("world", "school"); return s !== f && /m_/.test(s) && !/m_/.test(f); }), "Bereiche haben getrennte Auswahl");
  ok(await page.evaluate(() => { store.set("world", "free"); const r = { mis: missionContent().key, bomb: bombPool().every(p => !BOMB_MATH.de.some(([q]) => q === p)), exp: !explainPool(["m_numbers", "ex_food"]).some(c => c.deck === "m_numbers") };
    mode(); store.set("mode", "explain"); goHome(); r.noMath = !document.querySelector('[data-act="deck"][data-v="m_numbers"]');
    store.set("mode", "bomb"); goHome(); r.noSrc = !document.querySelector('[data-act="bombSrc"]');
    store.set("world", "school"); r.misS = missionContent().key; goHome(); r.src = !!document.querySelector('[data-act="bombSrc"]');
    store.set("mode", "imposter"); goHome(); return JSON.stringify(r); }) === JSON.stringify({ mis: "g", bomb: true, exp: true, noMath: true, noSrc: true, misS: "s", src: true }), "Freizeit ohne Mathe, Schule mit Mathe-Aufgaben und Schulthemen");
  ok(await page.evaluate(() => { store.set("school", true); store.set("world", "free"); goHome(); const r = isSchool() && document.querySelector('.worldsw [data-v="free"]').disabled; store.set("school", false); store.set("world", "school"); goHome(); return r; }), "Schulmodus (PIN) sperrt auf Schule");
  while (await page.$('[data-act="cat"][aria-checked="true"]')) await page.click('[data-act="cat"][aria-checked="true"]');
  await act("cat", "m_space");
  ok(await page.isVisible('[data-act="level"]'), "Niveau-Auswahl erscheint bei Mathe-Kategorien");
  await act("level", 1);
  await act("hint", "similar");
  await act("start");
  const simR = await page.evaluate(() => ({ word: R.word, alt: R.alt, role: R.role, lv: DECKS.de.m_space.cards.find(c => c.w === R.word).lv }));
  ok(simR.lv === 1, `Niveau Kl. 5–6: nur leichte Begriffe (${simR.word})`);
  ok(simR.alt && simR.alt !== simR.word, `Ähnlicher Begriff für den Hochstapler (${simR.word} → ${simR.alt})`);
  cards = await revealAll(4);
  const impIdx = simR.role.indexOf("imp");
  ok(cards[impIdx].includes(simR.alt) && cards[impIdx].includes("Euer geheimer Begriff") && !cards[impIdx].includes("Hochstapler"), "Hochstapler-Karte sieht aus wie die der anderen");
  await act("tovote"); await act("accuse", (impIdx + 1) % 4); await act("reveal");
  ok(await page.isVisible(`text=Der Hochstapler hatte: ${simR.alt}`), "Auflösung nennt den ähnlichen Begriff");
  await page.evaluate(() => goHome());
  await act("hint", "cat");

  /* ---------- Erklär’s! mit Teams ---------- */
  await act("mode", "explain");
  ok(await page.isVisible("text=Team Rot") && await page.isVisible("text=Team Blau"), "Zwei Standard-Teams");
  await act("tadd");
  ok(await page.isVisible("text=Team Grün"), "Team hinzufügen");
  await act("trm", 2);
  await act("trename", 0);
  await page.fill("#dlgIn", "Füchse");
  await page.click(".dlg .btn.primary");
  ok(await page.isVisible("text=Füchse"), "Team umbenennen");
  while (await page.$('[data-act="deck"][aria-checked="true"]')) await page.click('[data-act="deck"][aria-checked="true"]');
  ok(await page.isDisabled('[data-act="start"]'), "Ohne Kartenset kein Start");
  await act("deck", "m_numbers");
  await act("level", 1);
  await act("exRounds", 1);
  await act("start");
  ok(await page.evaluate(() => R.pool.length > 5 && R.pool.every(c => DECKS.de.m_numbers.cards.find(x => x.w === c.w).lv === 1)), "Erklär-Karten nach Niveau gefiltert");
  ok(await page.isVisible("text=Füchse ist dran"), "Erstes Team ist dran");
  await act("exGo");
  ok((await page.$$(".forbid li")).length === 4, "Karte zeigt 4 verbotene Wörter");
  const w1 = await text(".excard .w");
  await act("exRes", "ok");
  ok((await text(".excard .w")) !== w1, "Nächste Karte nach „Erraten“");
  await act("exRes", "taboo");
  await act("exRes", "ok");
  await page.evaluate(() => onHidden());
  ok(await page.isVisible('[data-act="exResume"]'), "Erklär-Uhr pausiert beim App-Wechsel");
  await act("exResume");
  await page.evaluate(() => { TIMER.left = 50; TIMER.startedAt = performance.now(); });
  await page.waitForTimeout(400);
  ok(await page.isVisible("text=Ergebnisse prüfen"), "Zeit um → Ergebnisse prüfen");
  ok(/1 Punkt in/.test(await text(".big-h + p")), "2 erraten, 1 verboten = 1 Punkt");
  await act("exFix", "1:skip");
  ok(/2 Punkte/.test(await text(".big-h + p")), "Korrektur ändert die Punkte");
  await act("exNext");
  ok(await page.isVisible("text=Team Blau ist dran"), "Dann das nächste Team");
  await act("exGo");
  await act("exRes", "skip");
  await page.evaluate(() => { TIMER.left = 50; TIMER.startedAt = performance.now(); });
  await page.waitForTimeout(400);
  await act("exNext");
  ok(await page.isVisible("text=Füchse gewinnt"), "Sieger nach dem letzten Durchgang");
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem("sneakplay.teamScores")).Füchse === 2), "Team-Punkte gespeichert");
  await act("home");

  /* ---------- Wort-Bombe: Mathe-Aufgaben in Teams ---------- */
  await act("mode", "bomb");
  await act("bombSrc", "math");
  await act("bombTeams");
  await act("fuse", "short");
  await page.evaluate(() => { BOMB_LEN.short = [1, 1]; });
  await act("start");
  ok(await page.evaluate(() => BOMB_MATH.de.some(([p]) => p === R.prompt)), "Mathe-Aufgabe für die Bombe");
  await act("bombGo");
  await page.waitForTimeout(1500);
  ok((await page.$$('[data-act="bombLoser"]')).length === 2, "Bombe fragt nach dem Team");
  await act("bombLoser", 1);
  await act("finish");
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem("sneakplay.teamScores")).Füchse === 3), "Bomben-Punkte gehen an die Teams");
  await act("home");
  await act("bombTeams");
  await act("bombSrc", "general");

  /* ---------- Eigene Karten mit verbotenen Wörtern teilen (QR und Text) ---------- */
  await act("settings"); await act("home");
  await page.evaluate(() => screenLists());
  await act("listEdit", "");
  await page.fill("#lName", "Mathe 7b");
  const big = Array.from({ length: 40 }, (_, i) => `Begriff ${i}: verboten ${i}a, verboten ${i}b, verboten ${i}c, äöü`).join("\n");
  await page.fill("#lWords", big);
  ok(/40 Karten, davon 40/.test(await text("#lCount")), "Editor zählt Karten mit verbotenen Wörtern");
  await page.click('[data-act="listSave"]');
  const sid = await page.evaluate(() => lists().find(l => l.name === "Mathe 7b").id);
  await act("listShare", sid);
  ok(await page.isVisible(".qrbox canvas") && /Teil 1 von/.test(await text("#qrpart")), "Mehrteiliger QR-Code wird angezeigt");
  /* QR-Codes vom Bildschirm lesen wie ein zweites Gerät */
  const scanned = await page.evaluate(async () => {
    const got = new Set(); const out = [];
    for (let k = 0; k < 30 && (out.length === 0 || got.size < out[0].n); k++) {
      const cv = document.querySelector(".qrbox canvas");
      const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height);
      const r = jsQR(d.data, d.width, d.height);
      if (r && !got.has(r.data)) { got.add(r.data); out.push(Object.assign(parseQrPart(r.data), { raw: r.data })); }
      document.getElementById("qrNext").click();
    }
    return out.map(p => p.raw);
  });
  ok(scanned.length >= 2, `Alle QR-Teile lesbar (${scanned.length})`);
  await page.evaluate(() => screenScan());
  for (const raw of scanned) await page.evaluate(r => handleScanned(r, document.getElementById("scanStatus")), raw);
  ok(await page.isVisible("text=Kartenset übernehmen?") && await page.isVisible("text=40 Karten"), "Gescanntes Set wird zur Übernahme angeboten");
  await page.click(".dlg .btn.primary");
  ok(await page.evaluate(() => lists().filter(l => l.name.startsWith("Mathe 7b")).length === 2), "Gescanntes Set gespeichert (Name eindeutig)");
  const txt = await page.evaluate(id => "Schau mal:\n" + encodeSet(lists().find(l => l.id === id)), sid);
  await act("paste");
  await page.fill("#pasteIn", "Unsinn");
  await act("pasteGo");
  ok(await page.isVisible("text=Kein gültiges Kartenset"), "Ungültiger Text wird abgelehnt");
  await page.fill("#pasteIn", txt);
  await act("pasteGo");
  await page.click(".dlg .btn.primary");
  ok(await page.evaluate(() => lists().filter(l => l.name.startsWith("Mathe 7b")).length === 3), "Eingefügter Text wird übernommen");
  /* eigene Karten im Erklär-Modus */
  await page.evaluate(() => goHome());
  await act("mode", "explain");
  while (await page.$('[data-act="deck"][aria-checked="true"]')) await page.click('[data-act="deck"][aria-checked="true"]');
  await act("deck", "u:" + sid);
  await act("start");
  await act("exGo");
  ok(/verboten \d+a/.test(await text(".forbid")), "Eigene verbotene Wörter im Erklär-Modus");
  await page.setViewportSize({ width: 320, height: 568 });
  await noOverflow("Erklär-Karte 320 px");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => goHome());

  /* ---------- Schulmodus ---------- */
  await act("settings");
  await act("schoolOn");
  await page.fill("#dlgIn", "12");
  await page.click(".dlg .btn.primary");
  ok(await page.isVisible(".dlg-box"), "Zu kurze PIN wird abgelehnt");
  await page.fill("#dlgIn", "1234");
  await page.click(".dlg .btn.primary");
  ok(!(await page.$('[data-act="wipe"]')) && !(await page.$("#btnMail")), "Schulmodus blendet Löschen und Feedback aus");
  await act("home");
  ok(await page.isVisible("text=Schulmodus aktiv"), "Schulmodus auf der Startseite sichtbar");
  await act("mode", "missions");
  await act("start");
  ok(await page.evaluate(() => SCHOOL_TOPICS.de.includes(R.topic) && R.ms.every(m => SCHOOL_MISSIONS.de.includes(m))), "Schulmodus: Schul-Themen und -Missionen");
  await page.evaluate(() => goHome());
  await act("settings");
  await act("schoolOff");
  await page.fill("#dlgIn", "9999");
  await page.click(".dlg .btn.primary");
  ok(await page.evaluate(() => school()), "Falsche PIN lässt den Schulmodus an");
  await page.fill("#dlgIn", "1234");
  await page.click(".dlg .btn.primary");
  ok(await page.evaluate(() => !school()) && await page.$('[data-act="wipe"]'), "Richtige PIN schaltet aus");
  await page.evaluate(() => goHome());
  await act("mode", "imposter");


  /* ---------- Zahlen-Hochstapler ---------- */
  await page.evaluate(() => goHome());
  await act("lang", "de");
  await act("mode", "imposter");
  while (await page.$('[data-act="cat"][aria-checked="true"]')) await page.click('[data-act="cat"][aria-checked="true"]');
  await act("cat", "m_equiv_num");
  await act("level", 1);
  await act("hint", "similar");
  await setPlayers(["Anna", "Ben", "Cleo", "Dana", "Emil"]);
  await act("start");
  const eq = await page.evaluate(() => ({ role: R.role, val: R.val, alt: R.alt, reps: R.reps }));
  ok(eq.reps && eq.val.filter((v, i) => eq.role[i] === "crew").every(v => eq.reps.includes(v)), "Crew bekommt gleichwertige Darstellungen");
  ok(new Set(eq.val.filter(Boolean)).size > 1, "Crew-Mitglieder sehen verschiedene Schreibweisen");
  ok(eq.alt && !eq.reps.includes(eq.alt), `Hochstapler hat einen nicht gleichwertigen Wert (${eq.alt})`);
  cards = await revealAll(5);
  ok(cards.every((c, i) => eq.role[i] === "clue" || c.includes("Dein Wert")), "Alle Karten sehen gleich aus");
  ok(await page.isVisible("text=Eigenschaft seines Werts"), "Spielanleitung für Werte statt Wörter");
  await act("tovote"); await act("accuse", eq.role.indexOf("imp")); await act("reveal"); await act("showWord");
  ok(await page.isVisible(`text=${eq.reps.join(" = ")}`), "Auflösung zeigt alle gleichwertigen Darstellungen");
  await page.evaluate(() => goHome());
  await act("hint", "cat");

  /* ---------- Nachlernen nach Erklär’s! ---------- */
  await act("mode", "explain");
  while (await page.$('[data-act="deck"][aria-checked="true"]')) await page.click('[data-act="deck"][aria-checked="true"]');
  await act("deck", "m_data");
  await act("exRounds", 1);
  await act("start");
  await act("exGo");
  const skipped = await text(".excard .w");
  await act("exRes", "skip");
  await act("exRes", "ok");
  await page.evaluate(() => { TIMER.left = 50; TIMER.startedAt = performance.now(); });
  await page.waitForTimeout(400);
  await act("exNext");
  await act("exGo");
  await act("exRes", "taboo");
  await page.evaluate(() => { TIMER.left = 50; TIMER.startedAt = performance.now(); });
  await page.waitForTimeout(400);
  await act("exNext");
  ok(await page.isVisible("text=Zum Nachlernen") && await page.isVisible(`.chip.static >> text=${skipped}`), "Übersprungene Begriffe stehen zum Nachlernen bereit");
  await act("learnSave");
  ok(await page.evaluate(() => lists().some(l => l.name.startsWith("Nachlernen") && l.cards.length === 2 && l.cards.every(c => c.f.length === 4))), "Nachlernen-Liste mit verbotenen Wörtern gespeichert");
  ok(await page.isVisible("text=Gespeichert als"), "Speichern wird bestätigt");

  /* ---------- Klassen-Werkstatt: Karten in bestehende Liste ---------- */
  const target = await page.evaluate(() => lists().find(l => l.name.startsWith("Nachlernen")).id);
  await page.evaluate(() => screenLists());
  ok(await page.isVisible("text=Klassen-Werkstatt"), "Werkstatt-Anleitung bei den eigenen Listen");
  await page.evaluate(() => { SCAN = partCollector(); offerImport(decodeSet("SneakPlay-Karten v1\nGruppe 2\nMedian|Mitte|ordnen|Reihe|Wert\nModus|häufig|oft|Wert|meist\nQuartil|Viertel|Box|Median|Daten")); });
  await page.selectOption("#impTarget", target);
  await page.click(".dlg .btn.primary");
  const merged = await page.evaluate(id => lists().find(l => l.id === id).cards.map(c => c.w), target);
  ok(merged.includes("Modus") && merged.length === new Set(merged.map(w => w.toLowerCase())).size, `Karten zusammengeführt ohne Doppelte (${merged.length})`);
  ok(await page.isVisible("text=neue Karten in"), "Zusammenführen wird bestätigt");
  await page.evaluate(() => goHome());
  await act("mode", "imposter");

  /* ---------- Kleines Display ---------- */
  await page.setViewportSize({ width: 320, height: 568 });
  await noOverflow("Spielfeld 320 px");
  await page.evaluate(() => goHome());
  await noOverflow("Startseite 320 px");
  await act("settings");
  await noOverflow("Einstellungen 320 px");
  await page.evaluate(() => goHome());
  await page.evaluate(() => screenRules());
  await noOverflow("Regeln 320 px");
  await page.evaluate(() => goHome());
  for (const k of ["imposter", "missions", "explain", "bomb"]) {
    await page.click(`.qbtn[data-v="${k}"]`);
    ok(await page.evaluate(k => document.querySelectorAll("section.rules").length === 3 && !!document.querySelector(`[data-act="practice"][data-v="${k}"]`), k), `„?“ zeigt Regeln, Einstellungen und Proberunde von ${k}`);
    await noOverflow(`Regeln ${k} 320 px`);
    await page.evaluate(() => goHome());
  }
  ok(await page.isVisible('.linkrow [data-act="practice"]') && await page.isVisible('.homebar [data-act="help"]'), "Proberunde und Hilfe immer auf der Startseite");
  await page.click('.homebar [data-act="help"]');
  ok(await page.evaluate(() => current.name === "help" && document.querySelectorAll('[data-act="practice"]').length === 4 && document.querySelectorAll('[data-act="helpRules"]').length === 4), "Hilfe: alle 4 Spiele mit Regeln und Proberunde");
  await noOverflow("Hilfe 320 px");
  await page.click('[data-act="helpRules"][data-v="bomb"]');
  await page.evaluate(() => onBackButton());
  ok(await page.evaluate(() => current.name === "help"), "Zurück aus den Regeln führt in die Hilfe");
  for (const k of ["imposter", "missions", "explain", "bomb"]) {
    await page.evaluate(() => screenHelp());
    await page.click(`[data-act="practice"][data-v="${k}"]`);
    ok(await page.evaluate(k => R && R.practice && R.mode === k && !!document.querySelector(".coach") && /Proberunde/.test(document.querySelector(".topbar .tag").textContent), k), `Proberunde ${k} startet mit Tipps`);
    await noOverflow(`Proberunde ${k} 320 px`);
    await page.evaluate(() => abortRound());
    await page.waitForTimeout(30);
    if (await page.isVisible(".dlg .btn.danger")) await page.click(".dlg .btn.danger");
    await page.evaluate(() => goHome());
  }

  /* ---------- Alles löschen ---------- */
  await page.evaluate(() => goHome());
  await act("settings");
  await act("wipe");
  await page.click(".dlg .btn.danger");
  await page.waitForTimeout(50);
  ok(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith("sneakplay.") && !/^sneakplay\.(pro|trial\.)/.test(k)).length === 0), "Alle Daten gelöscht");
  ok(await page.evaluate(() => localStorage.getItem("sneakplay.pro") === "true"), "Kauf bleibt nach „Alles löschen“ erhalten");

  /* ---------- Rechtstexte und Pages ---------- */
  for (const f of ["datenschutz", "datenschutz-en", "impressum", "impressum-en", "lizenzen", "lizenzen-en"]) {
    const r = await page.goto(ROOT + "/www/" + f + ".html");
    ok(r.ok() && /SneakPlay/.test(await page.title()), `www/${f}.html lädt`);
  }
  const r = await page.goto(ROOT + "/docs/index.html");
  ok(r.ok() && await page.isVisible("text=Hilfe & Kontakt"), "Pages-Infoseite lädt");


  /* ---------- Probe-Runde, Tipps, Fortsetzen, Schriftgröße ---------- */
  {
    await page.goto(APP);
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem("sneakplay.pro", "true"); localStorage.setItem("sneakplay.lang", JSON.stringify("de")); });
    await page.goto(APP);
    await act("practice", "imposter");
    ok(await page.isVisible(".coach") && (await page.evaluate(() => R.P.length)) === 4, "Probe-Runde startet mit Tipps und 4 Spielern");
    ok(await page.evaluate(() => players().length === 0), "Probe-Runde legt keine Spieler an");
    await revealAll(2);
    /* App wird beendet und neu gestartet */
    await page.goto(APP);
    ok(await page.isVisible("text=Runde fortsetzen?"), "Nach Neustart wird Fortsetzen angeboten");
    await page.click(".dlg .btn.primary");
    ok(await page.evaluate(() => R && R.step === 2) && await page.isVisible("text=Karte 3 von 4"), "Runde läuft bei Karte 3 weiter");
    await revealAll(2);
    await act("tovote");
    const ix = await page.evaluate(() => R.role.indexOf("imp"));
    await act("accuse", ix); await act("reveal"); await act("showWord");
    await act("judge", `${ix}:0`);
    await act("finish");
    ok(await page.isVisible("text=Proberunde geschafft") && await page.isVisible('[data-act="practice"][data-v="imposter"]'), "Ende der Probe-Runde mit Wiederholen");
    ok(await page.evaluate(() => Object.keys(scores()).length === 0), "Probe-Runde zählt nicht für den Punktestand");
    await act("playReal", "imposter");
    ok(await page.evaluate(() => current.name === "home"), "Ohne Spieler führt „Richtig spielen“ zur Startseite");
    await act("quick"); await act("start");
    ok(!(await page.$(".coach")), "Echte Runde nach der Probe ohne Tipps");
    await page.evaluate(() => abortRound()); await page.waitForTimeout(30);
    if (await page.isVisible(".dlg .btn.danger")) await page.click(".dlg .btn.danger");
    await page.evaluate(() => goHome());
    ok(!(await page.evaluate(() => localStorage.getItem("sneakplay.resume"))), "Nach dem Beenden nichts mehr zum Fortsetzen");
    /* Erklär-Modus: unterbrochener Durchgang → Ergebnisse prüfen */
    await act("mode", "explain");
    await act("start");
    await act("exGo");
    await act("exRes", "ok");
    await page.goto(APP);
    await page.click(".dlg .btn.primary");
    ok(await page.isVisible("text=Ergebnisse prüfen") && (await page.$$('[data-act="exFix"]')).length === 3, "Erklär-Durchgang: nach Neustart die bisherigen Karten werten");
    await page.evaluate(() => goHome());
    /* Verwerfen */
    await act("mode", "bomb"); await act("start");
    await page.goto(APP);
    await page.click(".dlg .btn:not(.primary)");
    ok(!(await page.evaluate(() => localStorage.getItem("sneakplay.resume"))) && await page.isVisible(".hero"), "Verwerfen löscht die gespeicherte Runde");
    /* Schriftgröße */
    await page.setViewportSize({ width: 360, height: 740 });
    await act("settings");
    await act("fontScale", 1.25);
    ok(await page.evaluate(() => document.body.style.zoom === "1.25"), "Sehr große Schrift aktiv");
    await noOverflow("Einstellungen, sehr große Schrift");
    await page.evaluate(() => goHome());
    await noOverflow("Startseite, sehr große Schrift");
    await act("mode", "explain"); await act("start"); await act("exGo");
    await noOverflow("Erklär-Karte, sehr große Schrift");
    await page.evaluate(() => screenPaywall("bomb"));
    await noOverflow("Vollversion, sehr große Schrift");
    await page.evaluate(() => { goHome(); localStorage.setItem("sneakplay.fontScale", "1"); applyFontScale(); });
    await page.setViewportSize({ width: 390, height: 844 });
  }

  /* ---------- Zurück-Taste auf der Startseite ---------- */
  {
    await page.goto(APP);
    await page.evaluate(() => { goHome(); window.__exits = 0; navigator.app = { exitApp: () => { window.__exits++; } }; });
    await page.evaluate(() => document.dispatchEvent(new Event("backbutton")));
    ok(await page.evaluate(() => window.__exits === 0) && await page.isVisible("#toast"), "Erster Druck auf Zurück beendet nicht, zeigt Hinweis");
    await page.evaluate(() => document.dispatchEvent(new Event("backbutton")));
    ok(await page.evaluate(() => window.__exits === 1), "Zweiter Druck kurz danach beendet");
    await page.evaluate(() => { backArmed = 0; screenSettings(); document.dispatchEvent(new Event("backbutton")); });
    ok(await page.isVisible(".hero") && await page.evaluate(() => window.__exits === 1), "Zurück aus den Einstellungen führt zur Startseite");
  }

  /* ---------- Gratis-Modus, Testrunden und Vollversion ---------- */
  {
    await page.goto(APP);
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem("sneakplay.players", JSON.stringify(["A", "B", "C", "D"])); localStorage.setItem("sneakplay.lang", JSON.stringify("de")); });
    await page.goto(APP);
    ok(await page.isVisible('.mode[data-v="imposter"] .mbadge.free'), "Hochstapler als gratis gekennzeichnet");
    ok(/2 Tests/.test(await text('.mode[data-v="explain"] .mbadge')), "Andere Modi zeigen 2 Testrunden");
    await act("start");
    ok(await page.isVisible("#hold") && !(await page.isVisible(".dlg-box")), "Hochstapler startet ohne Nachfrage");
    await page.evaluate(() => goHome());
    await act("mode", "explain");
    for (let k = 2; k >= 1; k--) {
      await act("start");
      ok(await page.isVisible(`text=noch ${k} von 2 Testrunden`), `Testrunde ${3 - k} wird angeboten`);
      await page.click(".dlg .btn.primary");
      ok(await page.isVisible('[data-act="exGo"]'), "Testrunde startet");
      await page.evaluate(() => goHome());
    }
    ok(/Vollversion/.test(await text('.mode[data-v="explain"] .mbadge')), "Nach 2 Runden: Vollversion nötig");
    await act("start");
    ok(await page.isVisible("text=Die 2 Testrunden für Erklär’s! sind aufgebraucht") && await page.isVisible("#buyBtn"), "Kaufbildschirm nach den Testrunden");
    ok(await page.isDisabled("#buyBtn") && await page.isVisible("text=Kaufen geht nur in der installierten App"), "Im Browser kein Kauf");
    await page.evaluate(() => goHome());
    await act("mode", "bomb");
    ok(/2 Tests/.test(await text('.mode[data-v="bomb"] .mbadge')), "Testrunden je Modus getrennt");
    await page.evaluate(() => startPractice("bomb"));
    ok(await page.evaluate(() => R && R.practice && current.name === "bomb"), "Proberunde ohne Vollversion startet direkt");
    await page.evaluate(() => goHome());
    ok(/2 Tests/.test(await text('.mode[data-v="bomb"] .mbadge')), "Proberunde verbraucht keine Testrunde");
    /* Schulmodus: keine Kaufknöpfe */
    await page.evaluate(() => { localStorage.setItem("sneakplay.school", "true"); localStorage.setItem("sneakplay.schoolPin", JSON.stringify("1234")); });
    await act("mode", "explain");
    await act("start");
    ok(!(await page.$("#buyBtn")) && await page.isVisible("text=Im Schulmodus gibt es keine Kaufknöpfe"), "Schulmodus zeigt keine Kaufknöpfe");
    await page.evaluate(() => goHome());
    await act("mode", "bomb");
    await act("start");
    ok(!(await page.isVisible('.dlg-box >> text=Vollversion ansehen')), "Schulmodus: Testrunden-Dialog ohne Kaufverweis");
    await page.click(".dlg .btn:not(.primary)");
    /* Vollversion freigeschaltet (Kauf gemeldet) */
    await page.evaluate(() => { localStorage.setItem("sneakplay.school", "false"); setPro(); });
    await page.waitForTimeout(50);
    ok(!(await page.$(".mbadge")), "Mit Vollversion keine Hinweise mehr");
    await act("mode", "explain");
    await act("start");
    ok(await page.isVisible('[data-act="exGo"]'), "Mit Vollversion startet jeder Modus sofort");
    await page.evaluate(() => goHome());
    await act("settings");
    ok(await page.isVisible("text=Vollversion freigeschaltet"), "Einstellungen zeigen den Kauf");
    await page.evaluate(() => goHome());
  }

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
