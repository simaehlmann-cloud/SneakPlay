/* SneakPlay – App-Szenen für Vorschau- und Werbevideos aufnehmen.
   Aufruf: node capture.js <phone|ipad> <de|en>
   Legt frames/<ziel>-<sprache>/<szene>/NNNNN.jpg und times.json an. */
"use strict";
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const [TARGET = "phone", LANG = "de"] = process.argv.slice(2);
const T = {
  phone: { vw: 443, vh: 830, scale: 2, screen: { width: 443, height: 830 } },
  ipad: { vw: 800, vh: 920, scale: 1.5, screen: { width: 800, height: 1066 } },
}[TARGET];
const APP = "http://localhost:8765/www/index.html";
const OUT = path.join(__dirname, "frames", `${TARGET}-${LANG}`);
const NAMES = { de: ["Anna", "Ben", "Cleo", "Dana", "Emil"], en: ["Amy", "Ben", "Chloe", "Dan", "Ella"] }[LANG];
const TEAMS = { de: ["Team Rot", "Team Blau"], en: ["Team Red", "Team Blue"] }[LANG];
const WORD = { de: ["Popcorn", "🍿", "Essen & Genuss"], en: ["Popcorn", "🍿", "Food & treats"] }[LANG];

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  const browser = await chromium.launch({ args: [`--force-device-scale-factor=${T.scale}`] });
  const ctx = await browser.newContext({ viewport: { width: T.vw, height: T.vh }, screen: T.screen, locale: LANG });
  await ctx.addInitScript(() => { window.__SNEAKPLAY_TEST__ = true; });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", e => errs.push(e.message));

  await page.goto(APP);
  await page.evaluate(([lang, names, teams]) => {
    localStorage.clear();
    const set = (k, v) => localStorage.setItem("sneakplay." + k, JSON.stringify(v));
    set("lang", lang); set("theme", "dark"); set("pro", true); set("sound", false); set("seenRules", true); set("world", "free");
    set("coach", { imposter: true, missions: true, explain: true, bomb: true });
    set("players", names); set("teams", teams); set("mode", "imposter");
    set("imp", { cats: ["food", "everyday", "animals"], imps: 1, clueless: false, hint: "cat", timer: 0, vote: "group" });
    set("exp", { decks: ["ex_food", "ex_leisure", "ex_animals"], time: 60, rounds: 2, penalty: true });
    set("bomb", { len: "mid", teams: false, src: "general" });
  }, [LANG, NAMES, TEAMS]);
  await page.goto(APP);
  // Tipp-Punkte, damit man die Berührungen sieht (außerhalb des gezoomten body)
  await page.addStyleTag({ content: `.tapdot{position:fixed;z-index:99999;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;
    background:rgba(255,255,255,.35);border:2px solid rgba(255,255,255,.85);pointer-events:none;transition:opacity .35s,transform .35s}
    .tapdot.up{opacity:0;transform:scale(1.5)} .fp{animation:none!important}` });
  await page.evaluate(() => {
    let dot = null;
    addEventListener("pointerdown", e => { dot = document.createElement("div"); dot.className = "tapdot"; dot.style.left = e.clientX + "px"; dot.style.top = e.clientY + "px"; document.documentElement.appendChild(dot); }, true);
    addEventListener("pointerup", () => { const d = dot; if (!d) return; d.classList.add("up"); setTimeout(() => d.remove(), 400); dot = null; }, true);
  });

  /* Aufnahme */
  const cdp = await ctx.newCDPSession(page);
  let frames = null;
  cdp.on("Page.screencastFrame", async f => {
    if (frames) frames.push({ t: f.metadata.timestamp, data: f.data });
    await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  async function scene(name, fn) {
    frames = [];
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: T.vw * T.scale, maxHeight: T.vh * T.scale, everyNthFrame: 1 });
    const t0 = Date.now() / 1000;
    await sleep(120);
    await fn();
    const t1 = Date.now() / 1000;
    await cdp.send("Page.stopScreencast");
    const dir = path.join(OUT, name);
    fs.mkdirSync(dir, { recursive: true });
    const list = frames.filter(f => f.t <= t1 + 0.05);
    const times = list.map((f, i) => { fs.writeFileSync(path.join(dir, String(i).padStart(5, "0") + ".jpg"), Buffer.from(f.data, "base64")); return +(f.t - list[0].t).toFixed(4); });
    fs.writeFileSync(path.join(dir, "times.json"), JSON.stringify({ times, duration: +(t1 - list[0].t).toFixed(3) }));
    console.log(`${TARGET}-${LANG} ${name}: ${list.length} Bilder, ${(t1 - list[0].t).toFixed(2)} s`);
    frames = null;
  }
  async function center(sel) {
    const el = await page.waitForSelector(sel, { state: "visible", timeout: 4000 });
    await el.scrollIntoViewIfNeeded();
    const b = await el.boundingBox();
    return [b.x + b.width / 2, b.y + b.height / 2];
  }
  async function tap(sel, pause = 140) {
    const [x, y] = await center(sel);
    await page.mouse.move(x, y); await page.mouse.down(); await sleep(pause); await page.mouse.up();
  }
  async function hold(sel, ms) {   // unten auf der Karte halten, damit der Punkt den Begriff nicht verdeckt
    const el = await page.waitForSelector(sel, { state: "visible", timeout: 4000 });
    const bb = await el.boundingBox();
    const x = bb.x + bb.width / 2, y = bb.y + bb.height * 0.84;
    await page.mouse.move(x, y); await page.mouse.down(); await sleep(ms); await page.mouse.up();
  }
  async function glide(toY, ms = 900) {
    await page.evaluate(([toY, ms]) => new Promise(res => {
      const y0 = scrollY, t0 = performance.now();
      const step = now => { const k = Math.min(1, (now - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        scrollTo(0, y0 + (toY - y0) * e); if (k < 1) requestAnimationFrame(step); else res(); };
      requestAnimationFrame(step);
    }), [toY, ms]);
  }
  const topOf = sel => page.evaluate(s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().top + scrollY : 0; }, sel);

  /* 1 Startseite → Los geht's */
  await page.evaluate(() => { goHome(); scrollTo(0, 0); });
  await sleep(400);
  await scene("s1", async () => {
    await sleep(700);
    const y = await topOf('[data-act="start"]');
    await glide(Math.max(0, y - T.vh * 0.62), 1000);
    await sleep(250);
    await tap('[data-act="start"]');
    await page.evaluate(([w, icon, cat]) => { R.word = w; R.icon = icon; R.cat = cat; R.role = R.role.map((r, i) => (i === 1 ? "imp" : "crew")); R.starter = 0; screenPass(); }, WORD);
    await sleep(700);
  });

  /* 2 Geheim aufdecken */
  await scene("s2", async () => {
    await sleep(300);
    await hold("#hold", 1600);
    await sleep(350);
    await tap("#nextBtn");
    await sleep(550);
    await hold("#hold", 1500);
    await sleep(350);
  });

  /* 3 Abstimmen und Auflösen */
  await page.evaluate(() => { R.step = R.P.length; screenPlay(); scrollTo(0, 0); });
  await sleep(300);
  await scene("s3", async () => {
    await sleep(500);
    await tap('[data-act="tovote"]');
    await sleep(600);
    await tap('[data-act="accuse"][data-v="1"]');
    await sleep(450);
    await tap('[data-act="reveal"]');
    await sleep(1100);
  });

  /* 7 Auszeichnungen (aus derselben Runde) */
  await page.evaluate(() => { R.wordShown = true; if (R.judged) Object.keys(R.judged).forEach(k => { R.judged[k] = false; }); finishRound(); scrollTo(0, 0); });
  await sleep(500);
  await scene("s7", async () => {
    await sleep(900);
    await glide(Math.min(260, await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)), 1200);
    await sleep(700);
  });

  /* 9 Geheime Missionen: Karte aufdecken, dann Auflösung */
  const MIS = { de: ["Ihr eröffnet zusammen ein Café. Wie heißt es und was gibt es?", "Beantworte die nächste Frage, die dir gestellt wird, mit einer Gegenfrage."],
    en: ["You're opening a café together. What's it called and what's on the menu?", "Answer the next question you're asked with another question."] }[LANG];
  await page.evaluate(m => { store.set("mode", "missions"); setOpt("mis", DEF_MIS, { timer: 0, vote: "group" }); goHome(); beginRound("missions");
    R.topic = m[0]; R.ms[0] = m[1]; R.none = 3; screenPass(); scrollTo(0, 0); document.activeElement && document.activeElement.blur(); }, MIS);
  await sleep(400);
  await scene("s9", async () => {
    await sleep(250);
    await hold("#hold", 1900);
    await sleep(250);
    await page.evaluate(() => { R.step = R.P.length; R.accused = R.none; screenResolve(); scrollTo(0, 0); document.activeElement && document.activeElement.blur(); });
    await sleep(450);
    await tap('[data-act="mopen"][data-v="0"]');
    await sleep(500);
    await tap('[data-act="mres"][data-v="0:ok"]');
    await sleep(700);
  });

  /* 4 Erklär's! */
  await page.evaluate(() => { store.set("mode", "explain"); goHome(); beginRound("explain"); scrollTo(0, 0); });
  await sleep(400);
  await scene("s4", async () => {
    await sleep(400);
    await tap('[data-act="exGo"]');
    await sleep(1300);
    await tap('[data-act="exRes"][data-v="ok"]');
    await sleep(1200);
    await tap('[data-act="exRes"][data-v="ok"]');
    await sleep(1100);
    await tap('[data-act="exRes"][data-v="skip"]');
    await sleep(700);
  });
  await page.evaluate(() => { if (typeof TIMER !== "undefined" && TIMER && TIMER.stop) TIMER.stop(); R = null; });

  /* 5 Wort-Bombe */
  await page.evaluate(() => { store.set("mode", "bomb"); goHome(); beginRound("bomb"); scrollTo(0, 0); });
  await sleep(400);
  await scene("s5", async () => {
    await sleep(400);
    await tap('[data-act="bombGo"]');
    await sleep(1900);
    await tap('[data-act="bombSkip"]');
    await sleep(1500);
    await page.evaluate(() => bombExplode());
    await sleep(1300);
  });

  /* 6 Freizeit & Schule */
  await page.evaluate(() => { R = null; store.set("mode", "imposter"); store.set("world", "free"); goHome(); scrollTo(0, 0); });
  await sleep(400);
  await scene("s6", async () => {
    await sleep(500);
    await tap('.worldsw [data-v="school"]');
    await sleep(700);
    const y = await page.evaluate(() => { const h = [...document.querySelectorAll("section.card h2")].find(x => x.closest("section").querySelector(".grp")); return h ? h.getBoundingClientRect().top + scrollY : 0; });
    await glide(Math.max(0, y - 20), 1100);
    await sleep(350);
    const chip = LANG === "de" ? '[data-act="cat"][data-v="e_everyday"]' : '[data-act="cat"][data-v="m_data"]';
    await tap(chip);
    await sleep(800);
  });

  /* 8 Englisch-Karten (nur Deutsch, nur Werbevideo) */
  if (LANG === "de") {
    await page.evaluate(() => { store.set("world", "school"); store.set("mode", "explain"); setOpt("exp", DEF_EXP, { decks: ["e_countries"] }); goHome(); beginRound("explain"); exStart();
      R.card = R.pool.find(c => c.w === "Statue of Liberty") || R.card; screenExplain(); scrollTo(0, 0); });
    await sleep(500);
    await scene("s8", async () => {
      await sleep(1400);
      await tap('[data-act="exRes"][data-v="ok"]');
      await sleep(1300);
    });
    await page.evaluate(() => { if (typeof TIMER !== "undefined" && TIMER && TIMER.stop) TIMER.stop(); });
  }

  if (errs.length) console.log("Seitenfehler:", errs);
  await browser.close();
})();
