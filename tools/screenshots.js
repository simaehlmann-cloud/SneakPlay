/* SneakPlay – Store-Bildschirmfotos erzeugen (nicht Teil der App)
   Vorher im Repo-Ordner: python3 -m http.server 8765
   Dann:                  node tools/screenshots.js
   Legt store-assets/screens/ an: phone69-* (1320 × 2868, iPhone 6,9″)
   und play-* (1080 × 1920) je Sprache, dunkles Design. */
"use strict";
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = process.env.BASE || "http://localhost:8765";
const OUT = path.join(__dirname, "..", "store-assets", "screens");
const TARGETS = { phone69: { width: 440, height: 956 }, play: { width: 360, height: 640 } };
const NAMES = { de: ["Anna", "Ben", "Cleo", "Dana", "Emil", "Finn"], en: ["Amy", "Ben", "Chloe", "Dan", "Ella", "Finn"] };

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const [target, vp] of Object.entries(TARGETS)) {
    for (const lang of ["de", "en"]) {
      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 3, locale: lang });
      await ctx.addInitScript(() => { window.__SNEAKPLAY_TEST__ = true; });
      const page = await ctx.newPage();
      const shot = async n => { await page.waitForTimeout(500); await page.screenshot({ path: path.join(OUT, `${target}-${lang}-${n}.png`) }); };
      const act = (a, v) => page.click(v == null ? `[data-act="${a}"]` : `[data-act="${a}"][data-v="${v}"]`);
      await page.goto(ROOT + "/www/index.html");
      await page.evaluate(([lang, names]) => {
        localStorage.clear();
        const set = (k, v) => localStorage.setItem("sneakplay." + k, JSON.stringify(v));
        set("lang", lang); set("theme", "dark"); set("pro", true); set("players", names); set("seenRules", true); set("sound", false);
        set("imp", { cats: ["food", "everyday", "animals", "music"], imps: 1, clueless: false, hint: true, timer: 3, vote: "secret" });
      }, [lang, NAMES[lang]]);
      await page.goto(ROOT + "/www/index.html");
      await page.addStyleTag({ content: ".fp,.bomb.live{animation:none!important}" });
      await page.evaluate(() => window.scrollTo(0, 230));
      await shot(1);                                             // Startseite

      /* Karte mit Begriff aufgedeckt */
      await act("start");
      await page.evaluate(() => { R.role = R.role.map((r, i) => (i === 1 ? "imp" : "crew")); R.starter = 0; });
      const hold = async () => { const b = await page.locator("#hold").boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); };
      await hold(); await shot(2); await page.mouse.up(); await page.click("#nextBtn");

      /* Zahlen-Hochstapler: gleichwertige Darstellung */
      await page.evaluate(() => goHome());
      await page.evaluate(() => { localStorage.setItem("sneakplay.imp", JSON.stringify({ cats: ["m_equiv_num"], imps: 1, clueless: false, hint: "similar", timer: 3, vote: "secret" })); localStorage.setItem("sneakplay.level", "1"); });
      await act("start");
      await page.evaluate(() => { const g = EQUIV[LANG].m_equiv_num.groups[2]; R.reps = g.reps; R.role = R.role.map((r, i) => (i === 3 ? "imp" : "crew")); R.val = R.role.map((r, i) => (r === "crew" ? g.reps[(i + 1) % g.reps.length] : "")); R.alt = g.near[0]; R.word = g.reps[0]; });
      await hold(); await shot(3); await page.mouse.up();

      /* Erklär’s! mit Mathe-Karte */
      await page.evaluate(() => goHome());
      await page.evaluate(() => { localStorage.setItem("sneakplay.exp", JSON.stringify({ decks: ["m_space"], time: 60, rounds: 3, penalty: true })); localStorage.setItem("sneakplay.level", "2"); });
      await act("mode", "explain");
      await act("start");
      await act("exGo");
      await page.evaluate(() => { R.card = R.pool.find(c => /Parallelogra/.test(c.w)) || R.card; R.log = [{ w: "x", res: "ok" }, { w: "y", res: "ok" }]; screenExplain(); TIMER.pause(); TIMER.left = 37000; TIMER.onTick(37000); });
      await shot("3b");

      /* Missionen */
      await page.evaluate(() => goHome());
      await act("mode", "missions");
      await act("start");
      await page.evaluate(() => { R.none = 3; });
      await hold(); await shot(4); await page.mouse.up();

      /* Wort-Bombe mit Mathe-Aufgaben */
      await page.evaluate(() => goHome());
      await act("mode", "bomb");
      await act("bombSrc", "math");
      await act("start");
      await page.evaluate(() => { BOMB_LEN.mid = [60, 60]; });
      await act("bombGo");
      await shot(5);

      /* Auszeichnungen */
      await page.evaluate(() => goHome());
      await act("mode", "imposter");
      await act("start");
      await page.evaluate(() => {
        R.role = R.role.map((r, i) => (i === 2 ? "imp" : "crew")); R.accused = 4; R.judged = {}; R.votes = [2, 4, 4, 2, 2, 4];
        localStorage.setItem("sneakplay.scores", JSON.stringify({}));
        finishRound();
      });
      await shot(6);

      /* Eigene Karten per QR-Code teilen */
      await page.evaluate(lang => {
        const cards = lang === "de"
          ? "Bruchrechnung: Zähler, Nenner, kürzen, erweitern\nKehrwert: umdrehen, Bruch, Zähler, Nenner\nDreisatz: drei, Schritte, Zuordnung, eins"
          : "Fraction: numerator, denominator, simplify, part\nReciprocal: flip, fraction, numerator, denominator\nRatio: compare, parts, colon, share";
        const l = storeList(null, lang === "de" ? "Mathe 7b" : "Maths 7B", parseCards(cards));
        screenShare(l.id);
      }, lang);
      await shot(7);

      /* Vollversion – nur für die Prüfung des In-App-Kaufs, nicht für den Store-Eintrag */
      await page.evaluate(([target, lang]) => {
        localStorage.removeItem("sneakplay.pro");
        window.cordova = { platformId: target === "play" ? "android" : "ios" };   // wie in der App
        shop.ready = true; shop.price = lang === "de" ? "3,99 €" : "€3.99";
        screenPaywall(null);
      }, [target, lang]);
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(OUT, "..", `review-paywall-${target}-${lang}.png`) });
      await ctx.close();
    }
  }
  await browser.close();
  console.log("Bildschirmfotos in " + OUT);
})().catch(e => { console.error(e); process.exit(1); });
