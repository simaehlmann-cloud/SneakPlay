/* SneakPlay – Oberfläche: Startseite, Runden, Abstimmung, Auswertung,
   Einstellungen, eigene Listen, Spielregeln, Lebenszyklus der App.
   Bildschirme werden als HTML-Text erzeugt; alle Klicks laufen über
   data-act und die Tabelle ACT. Nutzertext immer durch esc(). */
"use strict";

const view = document.getElementById("view");
const dlgEl = document.getElementById("dlg");

/* ---------- Zustand ---------- */
let current = { name: "home", redraw: null, round: false };
let R = null;          // laufende Runde
let TIMER = null;      // Diskussions-Timer
let BOMB = null;       // Wort-Bombe: { cd, tickId }
let holdOff = null;    // Karte verdecken (bei App-Wechsel)
let shownAt = 0;       // Zeitpunkt des letzten Bildschirmwechsels
/* Schnelles Doppeltippen soll nicht auf dem nächsten Bildschirm landen –
   etwa die Stimme der nächsten Person abgeben oder eine Karte überspringen. */
const GUARD_MS = window.__SNEAKPLAY_TEST__ ? 0 : 400;
const GUARDED = ["next", "secretOpen", "secretCast", "reveal", "finish", "again", "bombGo", "showWord"];

const DEF_IMP = { cats: ["food", "everyday", "animals"], imps: 1, clueless: false, hint: true, timer: 0, vote: "group" };
const DEF_MIS = { timer: 5, vote: "group" };
const DEF_BOMB = { len: "mid" };
function opts(key, def) { return Object.assign({}, def, store.get(key, {})); }
function setOpt(key, def, patch) { store.set(key, Object.assign(opts(key, def), patch)); }
function players() {
  const p = store.get("players", []);
  return Array.isArray(p) ? p.filter(x => typeof x === "string" && x).slice(0, MAX_PLAYERS) : [];
}
function scores() { const s = store.get("scores", {}); return s && typeof s === "object" ? s : {}; }
function lists() {
  const l = store.get("lists", []);
  return Array.isArray(l) ? l.filter(x => x && x.id && Array.isArray(x.words)) : [];
}
function mode() { const m = store.get("mode", "imposter"); return MODES.includes(m) ? m : "imposter"; }

/* ---------- Navigation ---------- */
function stopRoundTimers() {
  if (TIMER) { TIMER.stop(); TIMER = null; }
  if (BOMB) { BOMB.cd.stop(); clearTimeout(BOMB.tickId); BOMB = null; }
}
function show(html, opt = {}) {
  if (!opt.keepTimers) stopRoundTimers();
  closeDialog();
  holdOff = null;
  view.innerHTML = html;
  if (!opt.keepScroll) shownAt = performance.now();
  current = { name: opt.name || "", redraw: opt.redraw || null, round: !!opt.round };
  if (!opt.keepScroll) window.scrollTo(0, 0);
  if (!opt.keepScroll) {
    const first = view.querySelector("h1, h2, .big-h, .who");
    if (first && opt.name !== "home") { first.setAttribute("tabindex", "-1"); first.focus({ preventScroll: true }); }
  }
}
function redraw() { if (current.redraw) current.redraw(true); }
function goHome() {
  stopRoundTimers();
  R = null;
  keepAwake(false);
  screenHome();
}

/* ---------- Dialog ---------- */
let dialogKey = null;
function closeDialog() {
  if (dlgEl.hidden) return;
  dlgEl.hidden = true; dlgEl.innerHTML = "";
  if (dialogKey) document.removeEventListener("keydown", dialogKey);
  dialogKey = null;
}
/* buttons: [{label, primary, danger, action}] – action() === false hält den Dialog offen */
function dialog(title, bodyHtml, buttons) {
  closeDialog();
  dlgEl.innerHTML = `<div class="dlg-box" role="dialog" aria-modal="true" aria-labelledby="dlgT"><h3 id="dlgT">${esc(title)}</h3>${bodyHtml}
    <div class="row">${buttons.map((b, i) => `<button type="button" class="btn${b.primary ? " primary" : ""}${b.danger ? " danger" : ""}" data-dlg="${i}">${esc(b.label)}</button>`).join("")}</div></div>`;
  dlgEl.hidden = false;
  dlgEl.onclick = e => {
    if (e.target === dlgEl) { closeDialog(); return; }
    const b = e.target.closest("[data-dlg]");
    if (!b) return;
    const def = buttons[+b.dataset.dlg];
    if (def.action && def.action() === false) return;
    closeDialog();
  };
  dialogKey = e => { if (e.key === "Escape") closeDialog(); };
  document.addEventListener("keydown", dialogKey);
  const inp = dlgEl.querySelector("input");
  if (inp) setTimeout(() => inp.focus(), 50);
  else { const pb = dlgEl.querySelector(".btn.primary"); if (pb) pb.focus(); }
}
function confirmDlg(text, yesLabel, onYes, danger) {
  dialog(t("confirm.title"), `<p>${esc(text)}</p>`, [{ label: t("cancel") }, { label: yesLabel, primary: !danger, danger: !!danger, action: onYes }]);
}

/* ---------- Sprache und Darstellung ---------- */
function langSwitch() {
  return `<div class="lang" role="group" aria-label="${esc(t("set.language"))}">${[["de", "🇩🇪", "Deutsch"], ["en", "🇬🇧", "English"]].map(([c, f, l]) =>
    `<button type="button" class="langbtn" data-act="lang" data-v="${c}" aria-label="${l}" aria-pressed="${LANG === c}">${f}</button>`).join("")}</div>`;
}
function applyTheme() {
  const m = store.get("theme", "auto");
  document.documentElement.setAttribute("data-theme", ["auto", "light", "dark"].includes(m) ? m : "auto");
  applyStatusBar();
}
function isDark() {
  const m = document.documentElement.getAttribute("data-theme");
  if (m === "dark") return true;
  if (m === "light") return false;
  return !(window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches);
}
function applyStatusBar() {
  try {
    if (!window.StatusBar) return;
    if (isDark()) StatusBar.styleLightContent(); else StatusBar.styleDefault();
    /* Android: Leiste in Hintergrundfarbe, sonst dunkle Symbole auf dunklem Grund */
    if (platformId() === "android" && StatusBar.backgroundColorByHexString) StatusBar.backgroundColorByHexString(isDark() ? "#17122F" : "#F6F3FF");
  } catch (e) { /* weiter */ }
}
function legalUrl(base) { return base + (LANG === "en" ? "-en" : "") + ".html"; }

/* ---------- Bausteine ---------- */
function seg(name, options, value, act, disabledFn) {
  return `<div class="seg" role="radiogroup" aria-label="${esc(name)}">${options.map(([v, label]) =>
    `<button type="button" role="radio" aria-checked="${String(v) === String(value)}" data-act="${act}" data-v="${v}"${disabledFn && disabledFn(v) ? " disabled" : ""}>${esc(label)}</button>`).join("")}</div>`;
}
function sw(label, on, act, disabled) {
  return `<button type="button" role="switch" class="switch" aria-checked="${!!on}" aria-label="${esc(label)}" data-act="${act}"${disabled ? " disabled" : ""}><span class="knob"></span></button>`;
}
function topbar(withAbort = true) {
  const m = R ? R.mode : mode();
  return `<div class="topbar"><span class="tag">${MODE_ICON[m]} ${esc(t("mode." + m))}</span>${withAbort ? `<button type="button" class="x" data-act="abort">✕ ${esc(t("round.end"))}</button>` : ""}</div>`;
}
function backbar(title, act = "home") {
  return `<div class="topbar"><button type="button" class="x" data-act="${act}">‹ ${esc(t("back"))}</button><span class="tag">${esc(title)}</span></div>`;
}
function names(idx) { return idx.map(i => esc(R.P[i])).join(", "); }

/* =====================================================================
   Startseite
   ===================================================================== */
function whyNot(m, n) {
  if (n < MIN_PLAYERS[m]) return t("why.players", { n: MIN_PLAYERS[m] });
  if (m === "imposter" && imposterPool().length < 1) return t("why.cats");
  return "";
}
function catChips(o) {
  const L = lists();
  const builtIn = CAT_ORDER.map(id => {
    const c = CONTENT[LANG].cats[id];
    return `<button type="button" class="chip" role="checkbox" aria-checked="${o.cats.includes(id)}" data-act="cat" data-v="${id}">${CAT_ICON[id]} ${esc(c.name)}</button>`;
  });
  const custom = L.map(l => {
    const id = "u:" + l.id;
    return `<button type="button" class="chip" role="checkbox" aria-checked="${o.cats.includes(id)}" data-act="cat" data-v="${esc(id)}">✏️ ${esc(l.name)} <span class="muted">(${l.words.length})</span></button>`;
  });
  return builtIn.concat(custom).join("") + `<button type="button" class="chip new" data-act="lists">＋ ${esc(t("lists.manage"))}</button>`;
}
function modeOptions(m, n) {
  if (m === "imposter") {
    const o = opts("imp", DEF_IMP);
    return `<section class="card"><h2>${esc(t("cats.title"))}</h2><div class="chips">${catChips(o)}</div></section>
    <section class="card"><h2>${esc(t("opts.title"))}</h2>
      <div class="opt"><div class="lbl"><b>${esc(t("opt.imps"))}</b><small>${esc(t("opt.imps.hint", { n: MIN_TWO_IMPOSTERS }))}</small></div>
        ${seg(t("opt.imps"), [[1, "1"], [2, "2"]], n < MIN_TWO_IMPOSTERS ? 1 : o.imps, "imps", v => v === 2 && n < MIN_TWO_IMPOSTERS)}</div>
      <div class="opt"><div class="lbl"><b>${esc(t("opt.clueless"))}</b><small>${esc(t("opt.clueless.hint", { n: MIN_CLUELESS }))}</small></div>
        ${sw(t("opt.clueless"), o.clueless && n >= MIN_CLUELESS, "clueless", n < MIN_CLUELESS)}</div>
      <div class="opt"><div class="lbl"><b>${esc(t("opt.hint"))}</b><small>${esc(t("opt.hint.hint"))}</small></div>
        ${sw(t("opt.hint"), o.hint, "hint")}</div>
      <div class="opt col"><div class="lbl"><b>${esc(t("opt.timer"))}</b></div>
        ${seg(t("opt.timer"), [[0, t("opt.off")], [2, "2 min"], [3, "3 min"], [5, "5 min"]], o.timer, "impTimer")}</div>
      <div class="opt col"><div class="lbl"><b>${esc(t("opt.vote"))}</b><small>${esc(t("opt.vote.hint"))}</small></div>
        ${seg(t("opt.vote"), [["group", t("opt.vote.group")], ["secret", t("opt.vote.secret")]], o.vote, "impVote")}</div>
    </section>`;
  }
  if (m === "missions") {
    const o = opts("mis", DEF_MIS);
    return `<section class="card"><h2>${esc(t("opts.title"))}</h2>
      <div class="opt col"><div class="lbl"><b>${esc(t("opt.talk"))}</b><small>${esc(t("opt.talk.hint"))}</small></div>
        ${seg(t("opt.talk"), [[3, "3 min"], [5, "5 min"], [8, "8 min"]], o.timer, "misTimer")}</div>
      <div class="opt col"><div class="lbl"><b>${esc(t("opt.vote"))}</b><small>${esc(t("opt.vote.hint"))}</small></div>
        ${seg(t("opt.vote"), [["group", t("opt.vote.group")], ["secret", t("opt.vote.secret")]], o.vote, "misVote")}</div>
    </section>`;
  }
  const o = opts("bomb", DEF_BOMB);
  return `<section class="card"><h2>${esc(t("opts.title"))}</h2>
    <div class="opt col"><div class="lbl"><b>${esc(t("opt.fuse"))}</b><small>${esc(t("opt.fuse.hint"))}</small></div>
      ${seg(t("opt.fuse"), [["short", t("opt.fuse.short")], ["mid", t("opt.fuse.mid")], ["long", t("opt.fuse.long")]], o.len, "fuse")}</div>
  </section>`;
}
function scoreCard() {
  const P = players(), S = scores();
  if (!P.some(p => (S[p] || 0) > 0)) return "";
  const rows = P.map(p => [p, S[p] || 0]).sort((a, b) => b[1] - a[1]);
  return `<section class="card"><h2>${esc(t("score.title"))}</h2><table class="score">${rows.map(([p, s], k) =>
    `<tr><td>${k === 0 && s > 0 ? "👑 " : ""}${esc(p)}</td><td class="r">${s}</td></tr>`).join("")}</table>
    <button type="button" class="link" data-act="resetScores">${esc(t("score.reset"))}</button></section>`;
}
function screenHome(keep) {
  const P = players(), n = P.length, m = mode();
  const why = whyNot(m, n);
  const first = !store.get("seenRules", false);
  show(`<div class="homebar">${langSwitch()}<button type="button" class="iconbtn" data-act="settings" aria-label="${esc(t("set.title"))}">⚙️</button></div>
  <section class="hero"><img src="icon-192.png" alt="" width="76" height="76"><h1>SneakPlay</h1><p>${esc(t("home.tagline"))}</p></section>
  ${first ? `<section class="card"><p style="margin-top:0">${esc(t("home.welcome"))}</p><button type="button" class="btn wide" data-act="rules">📖 ${esc(t("home.howto"))}</button></section>` : ""}
  <section class="card"><h2>${esc(t("players.title"))} <span class="pill">${n}/${MAX_PLAYERS}</span></h2>
    <form id="addForm" class="row nowrap" autocomplete="off">
      <input type="text" id="nameIn" maxlength="${MAX_NAME}" placeholder="${esc(t("players.add"))}" aria-label="${esc(t("players.add"))}" autocapitalize="words" autocorrect="off" spellcheck="false" enterkeyhint="done"${n >= MAX_PLAYERS ? " disabled" : ""}>
      <button class="btn add" aria-label="${esc(t("players.addBtn"))}"${n >= MAX_PLAYERS ? " disabled" : ""}>＋</button>
    </form>
    ${n ? `<ol class="plist">${P.map((p, i) => `<li><span class="seat" aria-hidden="true">${i + 1}</span>
      <button type="button" class="pn" data-act="rename" data-v="${i}" aria-label="${esc(t("players.rename", { name: p }))}">${esc(p)}</button>
      <button type="button" class="mini" data-act="pup" data-v="${i}" aria-label="${esc(t("players.up", { name: p }))}"${i === 0 ? " disabled" : ""}>↑</button>
      <button type="button" class="mini" data-act="prm" data-v="${i}" aria-label="${esc(t("players.remove", { name: p }))}">✕</button></li>`).join("")}</ol>
      <p class="muted small" style="margin-bottom:0">${esc(t("players.seatHint"))}</p>`
      : `<button type="button" class="link" data-act="quick">${esc(t("players.quick"))}</button>`}
  </section>
  <section class="card"><h2>${esc(t("mode.title"))}</h2><div class="modes" role="radiogroup" aria-label="${esc(t("mode.title"))}">
    ${MODES.map(k => `<button type="button" class="mode" role="radio" aria-checked="${k === m}" data-act="mode" data-v="${k}"><span class="mi" aria-hidden="true">${MODE_ICON[k]}</span><span><b>${esc(t("mode." + k))}</b><small>${esc(t("mode." + k + ".sub"))}</small></span></button>`).join("")}
  </div></section>
  ${modeOptions(m, n)}
  <p class="err" id="why">${esc(why)}</p>
  <button type="button" class="btn primary big" data-act="start"${why ? " disabled" : ""}>${esc(t("home.start"))}</button>
  <button type="button" class="link" data-act="rules">${esc(t("home.rules"))}</button>
  ${scoreCard()}
  <footer class="foot"><p>${esc(t("home.privacy"))}</p><p><a href="${legalUrl("datenschutz")}">${esc(t("legal.privacy"))}</a> · <a href="${legalUrl("impressum")}">${esc(t("legal.imprint"))}</a></p></footer>`,
  { name: "home", redraw: screenHome, keepScroll: keep });
  document.getElementById("addForm").addEventListener("submit", e => {
    e.preventDefault();
    const inp = document.getElementById("nameIn");
    if (addPlayer(inp.value)) { screenHome(true); const ni = document.getElementById("nameIn"); if (ni && !ni.disabled) ni.focus(); }
  });
}
function addPlayer(raw) {
  const P = players();
  const name = cleanText(raw, MAX_NAME);
  if (!name) return false;
  if (P.length >= MAX_PLAYERS) { toast(t("players.full", { n: MAX_PLAYERS })); return false; }
  P.push(uniqueName(name, P));
  store.set("players", P);
  return true;
}
function renamePlayer(i) {
  const P = players();
  if (!P[i]) return;
  dialog(t("players.renameTitle"), `<input type="text" id="renIn" maxlength="${MAX_NAME}" value="${esc(P[i])}" aria-label="${esc(t("players.renameTitle"))}" autocomplete="off" autocapitalize="words">`, [
    { label: t("cancel") },
    { label: t("save"), primary: true, action: () => {
      const v = cleanText(document.getElementById("renIn").value, MAX_NAME);
      if (!v) return false;
      const old = P[i];
      if (v === old) return;
      const nv = uniqueName(v, P.filter((_, k) => k !== i));
      P[i] = nv;
      const S = scores();
      if (S[old] != null) { S[nv] = (S[nv] || 0) + S[old]; delete S[old]; store.set("scores", S); }
      store.set("players", P);
      screenHome(true);
    } }
  ]);
  const inp = document.getElementById("renIn");
  inp.addEventListener("keydown", e => { if (e.key === "Enter") dlgEl.querySelector(".btn.primary").click(); });
}

/* =====================================================================
   Runde starten
   ===================================================================== */
function imposterPool() {
  const o = opts("imp", DEF_IMP), L = lists(), pool = [];
  o.cats.forEach(id => {
    if (id.startsWith("u:")) {
      const l = L.find(x => "u:" + x.id === id);
      if (l) l.words.forEach(w => pool.push({ cat: id, name: l.name, icon: "✏️", word: w }));
    } else if (CONTENT[LANG].cats[id]) {
      const c = CONTENT[LANG].cats[id];
      c.words.forEach(w => pool.push({ cat: id, name: c.name, icon: CAT_ICON[id], word: w }));
    }
  });
  return pool;
}
function startRound() {
  const m = mode(), P = players(), n = P.length;
  if (whyNot(m, n)) { screenHome(true); return; }
  unlockAudio();
  keepAwake(true);
  store.set("seenRules", true);
  if (m === "imposter") {
    const o = opts("imp", DEF_IMP);
    const r = pickFresh(imposterPool(), x => LANG + "|" + x.cat + "|" + x.word, store.get("used.imp", []));
    store.set("used.imp", r.used);
    const roles = assignImposter(n, o);
    R = { mode: m, P, lang: LANG, cat: r.item.name, icon: r.item.icon, word: r.item.word, role: roles.role, starter: roles.starter,
      hint: o.hint, timer: o.timer, vote: o.vote, step: 0, accused: null, votes: null, judged: {}, wordShown: false };
  } else if (m === "missions") {
    const o = opts("mis", DEF_MIS), C = CONTENT[LANG];
    const tp = pickFresh(C.topics, x => LANG + "|" + x, store.get("used.topics", []));
    const ms = pickManyFresh(C.missions, x => LANG + "|" + x, store.get("used.missions", []), n);
    store.set("used.topics", tp.used); store.set("used.missions", ms.used);
    R = { mode: m, P, lang: LANG, topic: tp.item, ms: ms.items, none: rnd(n), timer: o.timer, vote: o.vote,
      step: 0, accused: null, votes: null, open: {}, res: {} };
  } else {
    const o = opts("bomb", DEF_BOMB);
    R = { mode: m, P, lang: LANG, len: o.len, prompt: nextBombPrompt(), state: "ready", loser: null };
    screenBomb();
    return;
  }
  screenPass();
}

/* =====================================================================
   Karten weiterreichen (Hold-to-Reveal)
   ===================================================================== */
function secretHTML(i) {
  if (R.mode === "imposter") {
    const r = R.role[i];
    const imps = R.role.filter(x => x === "imp").length;
    if (r === "imp") return `<div class="k">${esc(t("card.role"))}</div><div class="w imp">${esc(t("card.imposter"))}</div>
      ${R.hint ? `<div class="k">${esc(t("card.category"))}</div><div class="m">${R.icon} ${esc(R.cat)}</div>` : ""}
      <small class="muted">${esc(t(R.hint ? "card.imposter.text" : "card.imposter.textNoHint"))}${imps > 1 ? "<br>" + esc(t("card.imposter.two")) : ""}</small>`;
    if (r === "clue") return `<div class="k">${esc(t("card.role"))}</div><div class="w clue">${esc(t("card.clueless"))}</div>
      <small class="muted">${esc(t("card.clueless.text"))}</small>`;
    return `<div class="k">${esc(t("card.word"))}</div><div class="w">${esc(R.word)}</div><small class="muted">${R.icon} ${esc(R.cat)}</small>`;
  }
  const topic = `<div class="k">${esc(t("card.topic"))}</div><div class="m">${esc(R.topic)}</div>`;
  if (i === R.none) return topic + `<div class="k" style="margin-top:14px">${esc(t("card.mission"))}</div><div class="w imp">${esc(t("card.none"))}</div><small class="muted">${esc(t("card.none.text"))}</small>`;
  return topic + `<div class="k" style="margin-top:14px">${esc(t("card.secretMission"))}</div><div class="m gold">${esc(R.ms[i])}</div>`;
}
function screenPass() {
  const i = R.step, n = R.P.length, last = i === n - 1;
  show(`${topbar()}
  <div class="center pop"><div class="step">${esc(t("pass.card", { i: i + 1, n }))}</div><div class="passto">${esc(t("pass.give"))}</div><div class="who">${esc(R.P[i])}</div></div>
  <div class="hold" id="hold" role="button" tabindex="0" aria-label="${esc(t("pass.holdAria"))}">
    <div class="cover"><div class="fp" aria-hidden="true">👆</div><p>${esc(t("pass.hold"))}</p><small class="muted" style="margin-top:6px">${esc(t("pass.release"))}</small></div>
    <div class="secret" id="secret" aria-live="polite"></div>
  </div>
  <button type="button" class="btn primary big" id="nextBtn" data-act="next" disabled>${esc(last ? t("pass.allDone") : t("pass.next", { name: R.P[i + 1] }))}</button>
  <p class="muted small center">${esc(t("pass.nextHint"))}</p>`, { name: "pass", redraw: screenPass, round: true });
  const hold = document.getElementById("hold"), sec = document.getElementById("secret"), nb = document.getElementById("nextBtn");
  let showing = false;
  const on = e => {
    if (e) e.preventDefault();
    if (showing) return;
    showing = true;
    sec.innerHTML = secretHTML(i);
    hold.classList.add("show");
    if (nb.disabled) { nb.disabled = false; vibrate(15); sfx("reveal"); }
  };
  const off = () => { if (!showing) return; showing = false; hold.classList.remove("show"); sec.innerHTML = ""; };
  holdOff = off;
  hold.addEventListener("pointerdown", e => { if (e.button > 0) return; try { hold.setPointerCapture(e.pointerId); } catch (x) { /* egal */ } on(e); });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(ev => hold.addEventListener(ev, off));
  hold.addEventListener("contextmenu", e => e.preventDefault());
  hold.addEventListener("keydown", e => { if ((e.key === " " || e.key === "Enter") && !e.repeat) on(e); });
  hold.addEventListener("keyup", e => { if (e.key === " " || e.key === "Enter") off(); });
  hold.addEventListener("blur", off);
}

/* =====================================================================
   Gesprächsphase
   ===================================================================== */
function timerCard(min, labelKey) {
  return `<div class="card timer" id="timer"><div class="tval" id="tval">${fmtTime(min * 60)}</div><div class="tbar"><i id="tbar"></i></div>
    <button type="button" class="btn wide" data-act="ttoggle" id="tbtn">▶ ${esc(t(labelKey))}</button></div>`;
}
function initTimer(min) {
  let lastSec = null;
  TIMER = new Countdown(min * 60000, {
    onTick: left => {
      const tv = document.getElementById("tval"), tb = document.getElementById("tbar");
      if (!tv) return;
      tv.textContent = fmtTime(left / 1000);
      tb.style.width = (left / (min * 60000) * 100) + "%";
      const s = Math.ceil(left / 1000);
      if (TIMER && TIMER.running && s <= 10 && s > 0 && s !== lastSec) sfx("warn");
      lastSec = s;
    },
    onEnd: () => {
      const box = document.getElementById("timer");
      if (!box) return;
      box.classList.add("done");
      document.getElementById("tval").textContent = t("timer.up");
      document.getElementById("tbtn").textContent = t("timer.toVote");
      document.getElementById("tbtn").dataset.act = "tovote";
      sfx("gong"); vibrate(400);
    }
  });
}
function toggleTimer() {
  if (!TIMER || TIMER.done) return;
  unlockAudio();
  const b = document.getElementById("tbtn");
  if (TIMER.running) { TIMER.pause(); b.textContent = "▶ " + t("timer.resume"); }
  else { TIMER.start(); b.textContent = "⏸ " + t("timer.pause"); }
}
function screenPlay(keep) {
  if (R.mode === "imposter") {
    const n = R.P.length, s = R.starter, order = range(n).map(k => R.P[(s + k) % n]);
    show(`${topbar()}<div class="card center pop"><div class="step">${esc(t("play.imp.step"))}</div><div class="big-h">${esc(t("play.imp.starts", { name: R.P[s] }))}</div>
      <p>${esc(t("play.imp.text"))}</p><div class="order">${order.map(p => `<span>${esc(p)}</span>`).join("")}</div></div>
      ${R.timer ? timerCard(R.timer, "timer.startTalk") : ""}
      <div class="card"><p class="muted" style="margin:0">💡 ${esc(t("play.imp.tip"))}</p></div>
      <button type="button" class="btn primary big" data-act="tovote">${esc(t("play.toVote"))}</button>`, { name: "play", redraw: screenPlay, round: true, keepTimers: keep });
    if (R.timer && !(keep && TIMER)) initTimer(R.timer);
  } else {
    show(`${topbar()}<div class="card center pop"><div class="step">${esc(t("card.topic"))}</div><div class="topic">${esc(R.topic)}</div>
      <p>${esc(t("play.mis.text"))}</p><p class="muted" style="margin-bottom:0">${esc(t("play.mis.note"))}</p></div>
      ${timerCard(R.timer, "timer.startTalk")}
      <button type="button" class="btn primary big" data-act="tovote">${esc(t("play.toVote"))}</button>`, { name: "play", redraw: screenPlay, round: true, keepTimers: keep });
    if (!(keep && TIMER)) initTimer(R.timer);
  }
  if (keep && TIMER) {          // nach Sprachwechsel: Anzeige wiederherstellen
    TIMER.onTick(TIMER.remaining());
    const b = document.getElementById("tbtn");
    if (TIMER.done) TIMER.onEnd();
    else if (TIMER.running) b.textContent = "⏸ " + t("timer.pause");
    else if (TIMER.remaining() < TIMER.total) b.textContent = "▶ " + t("timer.resume");
  }
}

/* =====================================================================
   Abstimmung
   ===================================================================== */
function voteQuestion() {
  if (R.mode === "missions") return t("vote.q.mis");
  return R.role.filter(x => x === "imp").length > 1 ? t("vote.q.imp2") : t("vote.q.imp");
}
function screenVote(keep) {
  if (R.vote === "secret") { R.votes = Array(R.P.length).fill(null); R.vi = 0; R.sel = null; screenSecretPass(); return; }
  show(`${topbar()}<div class="center pop"><div class="step">${esc(t("vote.step"))}</div><div class="big-h">${esc(voteQuestion())}</div><p class="muted">${esc(t("vote.group.text"))}</p></div>
    <div class="grid" role="radiogroup" aria-label="${esc(voteQuestion())}">${R.P.map((p, i) => `<button type="button" class="pbtn" role="radio" aria-checked="${R.accused === i}" data-act="accuse" data-v="${i}">${esc(p)}</button>`).join("")}</div>
    <button type="button" class="btn primary big" data-act="reveal"${R.accused == null ? " disabled" : ""}>${esc(t("vote.reveal"))}</button>`,
  { name: "vote", redraw: screenVote, round: true, keepScroll: keep });
}
function screenSecretPass() {
  const i = R.vi;
  show(`${topbar()}<div class="center pop"><div class="step">${esc(t("vote.secret.step", { i: i + 1, n: R.P.length }))}</div>
    <div class="passto">${esc(t("pass.give"))}</div><div class="who">${esc(R.P[i])}</div><p class="muted">${esc(t("vote.secret.text"))}</p></div>
    <button type="button" class="btn primary big" data-act="secretOpen">${esc(t("vote.secret.iam", { name: R.P[i] }))}</button>`,
  { name: "secretPass", redraw: screenSecretPass, round: true });
}
function screenSecretPick(keep) {
  const i = R.vi;
  show(`${topbar()}<div class="center"><div class="step">${esc(R.P[i])}</div><div class="big-h">${esc(voteQuestion())}</div><p class="muted">${esc(t("vote.secret.pick"))}</p></div>
    <div class="grid" role="radiogroup" aria-label="${esc(voteQuestion())}">${R.P.map((p, k) => k === i ? "" : `<button type="button" class="pbtn" role="radio" aria-checked="${R.sel === k}" data-act="secretSel" data-v="${k}">${esc(p)}</button>`).join("")}</div>
    <button type="button" class="btn primary big" data-act="secretCast"${R.sel == null ? " disabled" : ""}>${esc(t("vote.secret.cast"))}</button>`,
  { name: "secretPick", redraw: screenSecretPick, round: true, keepScroll: keep });
}
function castSecret() {
  if (R.sel == null) return;
  R.votes[R.vi] = R.sel; R.sel = null; R.vi++;
  vibrate(20); sfx("tap");
  if (R.vi < R.P.length) { screenSecretPass(); return; }
  const tl = tally(R.votes, R.P.length);
  R.counts = tl.counts;
  if (tl.top.length === 1) { R.accused = tl.top[0]; screenResolve(); }
  else { R.tied = tl.top; R.accused = null; screenTie(); }
}
function screenTie(keep) {
  show(`${topbar()}<div class="center pop"><div class="e-big">⚖️</div><div class="big-h">${esc(t("vote.tie"))}</div>
    <p>${esc(t("vote.tie.text", { names: R.tied.map(i => R.P[i]).join(", "), n: R.counts[R.tied[0]] }))}</p></div>
    <div class="grid">${R.tied.map(i => `<button type="button" class="pbtn" role="radio" aria-checked="${R.accused === i}" data-act="accuse" data-v="${i}">${esc(R.P[i])}</button>`).join("")}</div>
    <button type="button" class="btn primary big" data-act="reveal"${R.accused == null ? " disabled" : ""}>${esc(t("vote.reveal"))}</button>`,
  { name: "tie", redraw: screenTie, round: true, keepScroll: keep });
}
function countsLine() {
  if (!R.counts) return "";
  const parts = range(R.P.length).filter(i => R.counts[i] > 0).sort((a, b) => R.counts[b] - R.counts[a]).map(i => `${esc(R.P[i])} ${R.counts[i]}`);
  return `<p class="muted small">${esc(t("vote.counts"))}: ${parts.join(" · ")}</p>`;
}

/* =====================================================================
   Auflösung
   ===================================================================== */
function screenResolve(keep) { if (R.mode === "imposter") resolveImp(keep); else resolveMis(keep); }
function resolveImp(keep) {
  const a = R.accused, caught = R.role[a] === "imp", clue = R.role.indexOf("clue");
  const imps = range(R.P.length).filter(i => R.role[i] === "imp");
  const guessers = []; if (caught) guessers.push(a); if (clue >= 0) guessers.push(clue);
  const head = caught
    ? `<div class="e-big">🎯</div><div class="big-h">${esc(t("res.caught"))}</div><p>${esc(t(imps.length > 1 ? "res.caught.one" : "res.caught.text", { name: R.P[a] }))}</p>`
    : `<div class="e-big">😬</div><div class="big-h">${esc(t("res.miss"))}</div><p>${esc(t(R.role[a] === "clue" ? "res.miss.clue" : "res.miss.text", { name: R.P[a] }))}</p>`;
  let body;
  if (guessers.length && !R.wordShown) {
    body = `<div class="card"><h2>🛟 ${esc(t("res.lastChance"))}</h2>${guessers.map(g => `<p><b>${esc(R.P[g])}</b> – ${esc(t(R.role[g] === "imp" ? "res.lastChance.imp" : "res.lastChance.clue"))}</p>`).join("")}
      <p class="muted" style="margin-bottom:0">${esc(t("res.lastChance.say"))}</p></div>
      <button type="button" class="btn primary big" data-act="showWord">${esc(t("res.showWord"))}</button>`;
  } else {
    const ready = guessers.every(g => R.judged[g] != null);
    body = `<div class="card center pop"><div class="step">${esc(t("res.wordWas"))}</div><div class="reveal-word">${esc(R.word)}</div><p class="muted" style="margin-top:0">${R.icon} ${esc(R.cat)}</p>
      <p style="margin-bottom:0">${esc(t(imps.length > 1 ? "res.imposters" : "res.imposter"))}: <b>${names(imps)}</b>${clue >= 0 ? `<br>${esc(t("card.clueless"))}: <b>${esc(R.P[clue])}</b>` : ""}</p></div>
      ${guessers.length ? `<div class="card"><h2>${esc(t("res.judge"))}</h2>${guessers.map(g => `<div class="judge"><span class="nm">${esc(R.P[g])}</span><div class="jb" role="radiogroup" aria-label="${esc(R.P[g])}">
        <button type="button" role="radio" class="ok" aria-checked="${R.judged[g] === true}" data-act="judge" data-v="${g}:1">✓ ${esc(t("res.right"))}</button>
        <button type="button" role="radio" class="bad" aria-checked="${R.judged[g] === false}" data-act="judge" data-v="${g}:0">✗ ${esc(t("res.wrong"))}</button></div></div>`).join("")}</div>` : ""}
      <button type="button" class="btn primary big" data-act="finish"${ready ? "" : " disabled"}>${esc(t("res.toAwards"))}</button>`;
  }
  show(`${topbar()}<div class="card center pop">${head}${countsLine()}</div>${body}`, { name: "resolve", redraw: screenResolve, round: true, keepScroll: keep });
}
function resolveMis(keep) {
  const a = R.accused, found = a === R.none, none = R.P[R.none];
  const head = found
    ? `<div class="e-big">🎯</div><div class="big-h">${esc(t("res.found"))}</div><p>${esc(t("res.found.text", { name: none }))}</p>`
    : `<div class="e-big">😐</div><div class="big-h">${esc(t("res.miss"))}</div><p>${esc(t("res.notFound.text", { name: R.P[a], none }))}</p>`;
  const holders = range(R.P.length).filter(i => i !== R.none);
  const ready = holders.every(i => R.res[i]);
  show(`${topbar()}<div class="card center pop">${head}${countsLine()}</div>
    <div class="card"><h2>🕵️ ${esc(t("res.missions"))}</h2><p class="muted" style="margin-top:0">${esc(t("res.missions.text", { name: none }))}</p>
    ${holders.map(i => `<div class="mcard"><div class="judge" style="border:0;padding:0"><span class="nm">${esc(R.P[i])}</span>${R.open[i] ? "" : `<button type="button" class="btn" data-act="mopen" data-v="${i}">${esc(t("res.open"))}</button>`}</div>
      ${R.open[i] ? `<div class="mt">${esc(R.ms[i])}</div><div class="jb" role="radiogroup" aria-label="${esc(R.P[i])}">
        <button type="button" role="radio" class="ok" aria-checked="${R.res[i] === "ok"}" data-act="mres" data-v="${i}:ok">✓ ${esc(t("res.m.ok"))}</button>
        <button type="button" role="radio" class="mid" aria-checked="${R.res[i] === "seen"}" data-act="mres" data-v="${i}:seen">🔍 ${esc(t("res.m.seen"))}</button>
        <button type="button" role="radio" class="bad" aria-checked="${R.res[i] === "fail"}" data-act="mres" data-v="${i}:fail">✗ ${esc(t("res.m.fail"))}</button></div>` : ""}</div>`).join("")}
    </div>
    <p class="muted small center">${esc(t("res.m.legend"))}</p>
    <button type="button" class="btn primary big" data-act="finish"${ready ? "" : " disabled"}>${esc(t("res.toAwards"))}</button>`,
  { name: "resolve", redraw: screenResolve, round: true, keepScroll: keep });
}
function finishRound() {
  if (R.result) { screenAwards(); return; }
  let r;
  if (R.mode === "imposter") r = scoreImposter({ role: R.role, accused: R.accused, judged: R.judged, votes: R.votes });
  else if (R.mode === "missions") r = scoreMissions({ n: R.P.length, none: R.none, accused: R.accused, res: R.res, votes: R.votes });
  else r = scoreBomb(R.P.length, R.loser);
  const S = scores();
  R.P.forEach((p, i) => { if (r.delta[i]) S[p] = (S[p] || 0) + r.delta[i]; });
  store.set("scores", S);
  R.result = r;
  sfx("fanfare");
  screenAwards();
}
function screenAwards(keep) {
  const r = R.result, S = scores();
  const rows = R.P.map((p, i) => [p, S[p] || 0, r.delta[i] || 0]).sort((x, y) => y[1] - x[1]);
  show(`<div class="center pop"><div class="e-big">🏆</div><div class="big-h">${esc(t("aw.title"))}</div></div>
    ${r.awards.map((a, k) => `<div class="award" style="animation-delay:${k * 90}ms"><div class="e" aria-hidden="true">${a.icon}</div><div><b>${esc(t("aw." + a.key))}</b>
      <span class="n">${a.who ? names(a.who) : esc(t("aw.everyone"))}</span><small>${esc(t("aw." + a.key + ".text", { n: a.n || 0 }))}</small></div></div>`).join("")}
    <div class="card" style="margin-top:16px"><h2>${esc(t("score.title"))}</h2><table class="score">${rows.map(([p, s, d], k) =>
      `<tr><td>${k === 0 && s > 0 ? "👑 " : ""}${esc(p)}${d ? `<span class="d">+${d}</span>` : ""}</td><td class="r">${s}</td></tr>`).join("")}</table></div>
    <button type="button" class="btn primary big" data-act="again">${esc(t("aw.again"))}</button>
    <button type="button" class="btn wide" data-act="home">${esc(t("aw.home"))}</button>`,
  { name: "awards", redraw: screenAwards, round: false, keepScroll: keep });
}

/* =====================================================================
   Wort-Bombe
   ===================================================================== */
function nextBombPrompt() {
  const r = pickFresh(bombPrompts(LANG), x => LANG + "|" + x, store.get("used.bomb", []));
  store.set("used.bomb", r.used);
  return r.item;
}
function screenBomb(keep) {
  const st = R.state;
  let body;
  if (st === "ready") {
    body = `<div class="card center pop"><div class="step">${esc(t("bomb.task"))}</div><div class="topic">${esc(R.prompt)}</div>
      <p>${esc(t("bomb.text"))}</p><button type="button" class="link" data-act="bombSkip">${esc(t("bomb.other"))}</button></div>
      <button type="button" class="btn primary big" data-act="bombGo">💣 ${esc(t("bomb.go"))}</button>`;
  } else if (st === "running" || st === "paused") {
    body = `<div class="center"><div class="bomb${st === "running" ? " live" : ""}" aria-hidden="true">💣</div>
      <div class="topic" aria-live="polite">${esc(R.prompt)}</div>
      ${st === "paused" ? `<p class="muted">${esc(t("bomb.paused"))}</p>` : `<p class="muted">${esc(t("bomb.pass"))}</p>`}</div>
      ${st === "paused" ? `<button type="button" class="btn primary big" data-act="bombResume">▶ ${esc(t("timer.resume"))}</button>`
        : `<button type="button" class="btn wide" data-act="bombPause">⏸ ${esc(t("timer.pause"))}</button>`}
      <button type="button" class="link" data-act="bombSkip">${esc(t("bomb.other"))}</button>`;
  } else {
    body = `<div class="center"><div class="bomb boom" aria-hidden="true">💥</div><div class="big-h">${esc(t("bomb.boom"))}</div><p>${esc(t("bomb.who"))}</p></div>
      <div class="grid" role="radiogroup" aria-label="${esc(t("bomb.who"))}">${R.P.map((p, i) => `<button type="button" class="pbtn" role="radio" aria-checked="${R.loser === i}" data-act="bombLoser" data-v="${i}">${esc(p)}</button>`).join("")}</div>
      <button type="button" class="btn primary big" data-act="finish"${R.loser == null ? " disabled" : ""}>${esc(t("res.toAwards"))}</button>`;
  }
  show(topbar() + body, { name: "bomb", redraw: screenBomb, round: true, keepTimers: true, keepScroll: keep });
}
function bombStart() {
  unlockAudio();
  const total = bombDuration(R.len);
  const cd = new Countdown(total, { onEnd: bombExplode });
  BOMB = { cd, tickId: null, total, flip: false };
  R.state = "running";
  screenBomb();
  cd.start();
  scheduleTick();
}
function scheduleTick() {
  if (!BOMB || !BOMB.cd.running) return;
  const frac = 1 - BOMB.cd.remaining() / BOMB.total;
  BOMB.flip = !BOMB.flip;
  sfx(BOMB.flip ? "tick" : "tock");
  BOMB.tickId = setTimeout(scheduleTick, tickInterval(frac));
}
function bombPause() {
  if (!BOMB || !BOMB.cd.running) return;
  BOMB.cd.pause(); clearTimeout(BOMB.tickId);
  R.state = "paused";
  screenBomb();
}
function bombResume() {
  if (!BOMB) return;
  R.state = "running";
  screenBomb();
  BOMB.cd.start();
  scheduleTick();
}
function bombExplode() {
  if (BOMB) clearTimeout(BOMB.tickId);
  BOMB = null;
  R.state = "boom";
  sfx("boom");
  vibrate([350, 120, 350]);
  screenBomb();
  view.classList.add("flash");
  setTimeout(() => view.classList.remove("flash"), 650);
}

/* =====================================================================
   Spielregeln
   ===================================================================== */
function screenRules() {
  store.set("seenRules", true);
  const sec = k => `<section class="card rules"><h2>${MODE_ICON[k]} ${esc(t("mode." + k))}</h2><ol>${t("rules." + k).split("\n").map(x => `<li>${esc(x)}</li>`).join("")}</ol>
    <p class="score-note">${esc(t("rules." + k + ".score"))}</p></section>`;
  show(`${backbar(t("home.rules"))}${MODES.map(sec).join("")}
    <section class="card rules"><h2>👆 ${esc(t("rules.hold.title"))}</h2><p style="margin:0">${esc(t("rules.hold"))}</p></section>
    <button type="button" class="btn primary big" data-act="home">${esc(t("back"))}</button>`, { name: "rules", redraw: screenRules });
}

/* =====================================================================
   Eigene Listen
   ===================================================================== */
function screenLists() {
  const L = lists();
  show(`${backbar(t("lists.title"))}
    <section class="card"><p style="margin-top:0">${esc(t("lists.text"))}</p>
    ${L.length ? L.map(l => `<div class="judge"><span class="nm">✏️ ${esc(l.name)} <span class="muted">(${l.words.length})</span></span><button type="button" class="btn" data-act="listEdit" data-v="${esc(l.id)}">${esc(t("lists.edit"))}</button></div>`).join("") : `<p class="muted">${esc(t("lists.empty"))}</p>`}
    </section>
    <button type="button" class="btn primary big" data-act="listEdit" data-v="">＋ ${esc(t("lists.new"))}</button>`, { name: "lists", redraw: screenLists });
}
function screenListEdit(id) {
  const L = lists(), l = L.find(x => x.id === id);
  show(`${backbar(l ? l.name : t("lists.new"), "lists")}
    <section class="card">
      <label class="lbl" for="lName"><b>${esc(t("lists.name"))}</b></label>
      <input type="text" id="lName" maxlength="24" value="${esc(l ? l.name : "")}" placeholder="${esc(t("lists.name.ph"))}" style="margin:8px 0 14px">
      <label class="lbl" for="lWords"><b>${esc(t("lists.words"))}</b><small>${esc(t("lists.words.hint"))}</small></label>
      <textarea id="lWords" style="margin-top:8px" placeholder="${esc(t("lists.words.ph"))}">${esc(l ? l.words.join("\n") : "")}</textarea>
      <p class="muted small" id="lCount"></p>
    </section>
    <button type="button" class="btn primary big" data-act="listSave" data-v="${esc(id || "")}">${esc(t("save"))}</button>
    ${l ? `<button type="button" class="btn danger wide" data-act="listDel" data-v="${esc(l.id)}">${esc(t("lists.delete"))}</button>` : ""}`,
  { name: "listEdit", redraw: () => {} });
  const ta = document.getElementById("lWords"), cnt = document.getElementById("lCount");
  const upd = () => { const n = parseWords(ta.value).length; cnt.textContent = t("lists.count", { n }); };
  ta.addEventListener("input", upd); upd();
}
function saveList(id) {
  const name = cleanText(document.getElementById("lName").value, 24);
  const words = parseWords(document.getElementById("lWords").value);
  if (!name) { toast(t("lists.needName")); document.getElementById("lName").focus(); return; }
  if (words.length < 3) { toast(t("lists.needWords", { n: 3 })); document.getElementById("lWords").focus(); return; }
  const L = lists();
  let l = L.find(x => x.id === id);
  if (l) { l.name = name; l.words = words; }
  else {
    l = { id: Date.now().toString(36) + rnd(1296).toString(36), name, words };
    L.push(l);
    setOpt("imp", DEF_IMP, { cats: opts("imp", DEF_IMP).cats.concat("u:" + l.id) });
  }
  if (!store.set("lists", L)) { toast(t("lists.saveFail")); return; }
  toast(t("lists.saved"));
  screenLists();
}
function deleteList(id) {
  confirmDlg(t("lists.delete.confirm"), t("lists.delete"), () => {
    store.set("lists", lists().filter(x => x.id !== id));
    setOpt("imp", DEF_IMP, { cats: opts("imp", DEF_IMP).cats.filter(c => c !== "u:" + id) });
    screenLists();
  }, true);
}

/* =====================================================================
   Einstellungen
   ===================================================================== */
const APP_STORE_ID = "";                 // nach dem Anlegen in App Store Connect eintragen (nur Ziffern)
const PLAY_ID = "de.sneakplay.app";
const FEEDBACK_MAIL = "smaehlmann.appdev@gmail.com";
/* Bewerten/Weiterempfehlen: jede Fassung verweist nur auf ihren eigenen
   Store, im Browser gibt es keinen Store-Knopf. Keine eigene
   Bewertungs-Abfrage – nur Knöpfe in den Einstellungen. */
function rateHref() {
  const p = platformId();
  if (p === "ios" && APP_STORE_ID) return "itms-apps://itunes.apple.com/app/id" + APP_STORE_ID + "?action=write-review";
  if (p === "android") return "market://details?id=" + PLAY_ID;
  return "";
}
function storeUrl() {
  const p = platformId();
  if (p === "ios" && APP_STORE_ID) return "https://apps.apple.com/app/id" + APP_STORE_ID;
  if (p === "android") return "https://play.google.com/store/apps/details?id=" + PLAY_ID;
  return "";
}
function feedbackHref() {
  const ua = navigator.userAgent;
  const os = (ua.match(/Android [\d.]+|(?:iPhone|CPU) OS [\d_]+/) || [""])[0].replace(/_/g, ".");
  const info = "SneakPlay " + APP_VERSION + " · " + (platformId() || "web") + (os ? " · " + os : "") + " · " + LANG;
  return "mailto:" + FEEDBACK_MAIL + "?subject=" + encodeURIComponent(t("mail.subject")) + "&body=" + encodeURIComponent(t("mail.body", { info }));
}
function recommendApp() {
  const url = storeUrl();
  if (!url) return;
  const sp = window.plugins && window.plugins.socialsharing;
  if (sp) {
    if (sp.setIPadPopupCoordinates) sp.setIPadPopupCoordinates(Math.round(innerWidth / 2) + "," + Math.round(innerHeight / 2) + ",1,1");
    sp.shareWithOptions({ message: t("share.text"), subject: "SneakPlay", url }, () => {}, () => copyText(url));
    return;
  }
  copyText(url);
}
function copyText(text) {
  try { navigator.clipboard.writeText(text).then(() => toast(t("share.copied")), () => toast(text, 5000)); }
  catch (e) { toast(text, 5000); }
}
function screenSettings(keep) {
  const theme = store.get("theme", "auto");
  const rate = rateHref(), share = storeUrl();
  show(`${backbar(t("set.title"))}
    <section class="card"><h2>${esc(t("set.language"))}</h2>${langSwitch()}</section>
    <section class="card"><h2>${esc(t("set.look"))}</h2>
      <div class="opt col"><div class="lbl"><b>${esc(t("set.theme"))}</b></div>${seg(t("set.theme"), [["auto", t("set.theme.auto")], ["light", t("set.theme.light")], ["dark", t("set.theme.dark")]], theme, "theme")}</div>
    </section>
    <section class="card"><h2>${esc(t("set.feedback"))}</h2>
      <div class="opt"><div class="lbl"><b>${esc(t("set.sound"))}</b></div>${sw(t("set.sound"), store.get("sound", true), "sound")}</div>
      <div class="opt"><div class="lbl"><b>${esc(t("set.vibrate"))}</b><small>${esc(t("set.vibrate.hint"))}</small></div>${sw(t("set.vibrate"), store.get("vibrate", true), "vibrate")}</div>
      <div class="opt"><div class="lbl"><b>${esc(t("set.awake"))}</b><small>${esc(t("set.awake.hint"))}</small></div>${sw(t("set.awake"), store.get("awake", true), "awake")}</div>
    </section>
    <section class="card"><h2>${esc(t("set.data"))}</h2><p class="muted small" style="margin-top:0">${esc(t("set.data.hint"))}</p>
      <div class="row"><button type="button" class="btn" data-act="resetScores">${esc(t("score.reset"))}</button>
      <button type="button" class="btn" data-act="resetUsed">${esc(t("set.resetUsed"))}</button>
      <button type="button" class="btn danger" data-act="wipe">${esc(t("set.wipe"))}</button></div>
    </section>
    <section class="card"><h2>${esc(t("set.support"))}</h2><p class="muted small" style="margin-top:0">${esc(t("set.support.hint"))}</p>
      <div class="row">${rate ? `<a class="btn primary" id="btnRate" href="${esc(rate)}">⭐ ${esc(t("set.rate"))}</a>` : ""}
      ${share ? `<button type="button" class="btn" data-act="recommend">${esc(t("set.recommend"))}</button>` : ""}
      <a class="btn" id="btnMail" href="${esc(feedbackHref())}">✉️ ${esc(t("set.mail"))}</a></div>
      <p class="muted small">${esc(t("set.mail.addr", { mail: FEEDBACK_MAIL }))}</p>
    </section>
    <section class="card"><h2>${esc(t("set.about"))}</h2><p class="small" style="margin-top:0">${esc(t("set.about.text"))}</p>
      <p class="small"><a href="${legalUrl("datenschutz")}">${esc(t("legal.privacy"))}</a> · <a href="${legalUrl("impressum")}">${esc(t("legal.imprint"))}</a> · <a href="${legalUrl("lizenzen")}">${esc(t("legal.licenses"))}</a></p>
      <p class="muted small" style="margin-bottom:0">${esc(t("set.version", { v: APP_VERSION }))}</p>
    </section>`, { name: "settings", redraw: screenSettings, keepScroll: keep });
}
function wipeAll() {
  confirmDlg(t("set.wipe.confirm"), t("set.wipe"), () => {
    store.keys().forEach(k => store.remove(k));
    setLang(detectLang());
    applyTheme();
    toast(t("set.wipe.done"));
    screenHome();
  }, true);
}

/* =====================================================================
   Aktionen
   ===================================================================== */
function toggleStore(key, def) { const v = !(store.get(key, def) === true); store.set(key, v); return v; }
function abortRound() {
  confirmDlg(t("round.end.confirm"), t("round.end"), () => { goHome(); }, true);
}
const ACT = {
  lang: v => { if (v === LANG) return; setLang(v); store.set("lang", v); redraw(); },
  settings: () => screenSettings(),
  rules: () => screenRules(),
  home: () => goHome(),
  quick: () => { store.set("players", range(4).map(i => t("players.default", { n: i + 1 }))); screenHome(true); },
  rename: v => renamePlayer(+v),
  pup: v => { const P = players(), i = +v; if (i > 0 && P[i]) { [P[i - 1], P[i]] = [P[i], P[i - 1]]; store.set("players", P); screenHome(true); } },
  prm: v => { const P = players(); P.splice(+v, 1); store.set("players", P); screenHome(true); },
  mode: v => { if (MODES.includes(v)) { store.set("mode", v); screenHome(true); } },
  cat: v => { const o = opts("imp", DEF_IMP); setOpt("imp", DEF_IMP, { cats: o.cats.includes(v) ? o.cats.filter(c => c !== v) : o.cats.concat(v) }); screenHome(true); },
  imps: v => { setOpt("imp", DEF_IMP, { imps: +v }); screenHome(true); },
  clueless: () => { setOpt("imp", DEF_IMP, { clueless: !opts("imp", DEF_IMP).clueless }); screenHome(true); },
  hint: () => { setOpt("imp", DEF_IMP, { hint: !opts("imp", DEF_IMP).hint }); screenHome(true); },
  impTimer: v => { setOpt("imp", DEF_IMP, { timer: +v }); screenHome(true); },
  impVote: v => { setOpt("imp", DEF_IMP, { vote: v }); screenHome(true); },
  misTimer: v => { setOpt("mis", DEF_MIS, { timer: +v }); screenHome(true); },
  misVote: v => { setOpt("mis", DEF_MIS, { vote: v }); screenHome(true); },
  fuse: v => { setOpt("bomb", DEF_BOMB, { len: v }); screenHome(true); },
  start: () => startRound(),
  resetScores: () => confirmDlg(t("score.reset.confirm"), t("score.reset"), () => { store.set("scores", {}); toast(t("score.reset.done")); redraw(); }),
  resetUsed: () => { ["used.imp", "used.topics", "used.missions", "used.bomb"].forEach(k => store.remove(k)); toast(t("set.resetUsed.done")); },
  wipe: () => wipeAll(),
  theme: v => { store.set("theme", v); applyTheme(); screenSettings(true); },
  sound: () => { if (toggleStore("sound", true)) { unlockAudio(); sfx("ok"); } screenSettings(true); },
  vibrate: () => { if (toggleStore("vibrate", true)) vibrate(40); screenSettings(true); },
  awake: () => { toggleStore("awake", true); screenSettings(true); },
  recommend: () => recommendApp(),
  lists: () => screenLists(),
  listEdit: v => screenListEdit(v || null),
  listSave: v => saveList(v || null),
  listDel: v => deleteList(v),
  /* Runde */
  abort: () => abortRound(),
  next: () => { R.step++; if (R.step < R.P.length) screenPass(); else screenPlay(); },
  ttoggle: () => toggleTimer(),
  tovote: () => { R.accused = null; R.counts = null; R.votes = null; screenVote(); },
  accuse: v => { R.accused = +v; if (current.name === "tie") screenTie(true); else screenVote(true); },
  reveal: () => { if (R.accused != null) screenResolve(); },
  secretOpen: () => { R.sel = null; screenSecretPick(); },
  secretSel: v => { R.sel = +v; screenSecretPick(true); },
  secretCast: () => castSecret(),
  showWord: () => { R.wordShown = true; resolveImp(true); },
  judge: v => { const [g, x] = v.split(":"); R.judged[+g] = x === "1"; resolveImp(true); },
  mopen: v => { R.open[+v] = true; resolveMis(true); },
  mres: v => { const [i, x] = v.split(":"); R.res[+i] = x; resolveMis(true); },
  finish: () => finishRound(),
  again: () => startRound(),
  bombGo: () => bombStart(),
  bombPause: () => bombPause(),
  bombResume: () => bombResume(),
  bombSkip: () => { R.prompt = nextBombPrompt(); screenBomb(true); },
  bombLoser: v => { R.loser = +v; screenBomb(true); }
};
view.addEventListener("click", e => {
  const b = e.target.closest("[data-act]");
  if (!b || b.disabled || !view.contains(b)) return;
  const f = ACT[b.dataset.act];
  if (!f) return;
  /* Runden-Aktionen ohne Runde (z. B. doppelter Tipp nach dem Ende) ignorieren */
  if (!R && ["next", "ttoggle", "tovote", "accuse", "reveal", "secretOpen", "secretSel", "secretCast", "showWord", "judge", "mopen", "mres", "finish", "bombGo", "bombPause", "bombResume", "bombSkip", "bombLoser", "abort"].includes(b.dataset.act)) return;
  e.preventDefault();
  if (GUARDED.includes(b.dataset.act) && performance.now() - shownAt < GUARD_MS) return;
  f(b.dataset.v, b);
});

/* =====================================================================
   Lebenszyklus
   ===================================================================== */
function onHidden() {
  if (holdOff) holdOff();
  if (TIMER && TIMER.running) { TIMER.pause(); const b = document.getElementById("tbtn"); if (b) b.textContent = "▶ " + t("timer.resume"); }
  if (BOMB && BOMB.cd.running) bombPause();
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") onHidden();
  else if (wantAwake) keepAwake(true);
});
document.addEventListener("pause", onHidden, false);         // Cordova: App geht in den Hintergrund
window.addEventListener("blur", () => { if (holdOff) holdOff(); });
document.addEventListener("backbutton", e => {
  e.preventDefault();
  if (!dlgEl.hidden) { closeDialog(); return; }
  if (current.round) { abortRound(); return; }
  if (current.name === "listEdit") { screenLists(); return; }
  if (current.name !== "home") { goHome(); return; }
  if (navigator.app && navigator.app.exitApp) navigator.app.exitApp();
}, false);
document.addEventListener("deviceready", () => { applyStatusBar(); }, false);
if (window.matchMedia) {
  try { matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => { applyStatusBar(); if (current.name === "settings") screenSettings(true); }); } catch (e) { /* alt */ }
}

/* ---------- Start ---------- */
setLang(store.get("lang", null) || detectLang());
applyTheme();
screenHome();
