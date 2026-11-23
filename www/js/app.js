/* SneakPlay – Oberfläche: Startseite, Runden, Abstimmung, Auswertung,
   Erklär-Modus mit Teams, eigene Karten mit QR-Austausch, Schulmodus,
   Einstellungen, Spielregeln, Lebenszyklus der App.
   Bildschirme werden als HTML-Text erzeugt; alle Klicks laufen über
   data-act und die Tabelle ACT. Nutzertext immer durch esc(). */
"use strict";

const view = document.getElementById("view");
const dlgEl = document.getElementById("dlg");

/* ---------- Zustand ---------- */
let current = { name: "home", redraw: null, round: false };
let R = null;          // laufende Runde
let TIMER = null;      // Diskussions-Timer bzw. Erklär-Uhr
let BOMB = null;       // Wort-Bombe: { cd, tickId }
let holdOff = null;    // Karte verdecken (bei App-Wechsel)
let leaveFns = [];     // Aufräumen beim Bildschirmwechsel (Kamera, QR-Wechsel)
let shownAt = 0;       // Zeitpunkt des letzten Bildschirmwechsels
/* Schnelles Doppeltippen soll nicht auf dem nächsten Bildschirm landen –
   etwa die Stimme der nächsten Person abgeben oder eine Karte überspringen. */
const GUARD_MS = window.__SNEAKPLAY_TEST__ ? 0 : 400;
const GUARDED = ["next", "secretOpen", "secretCast", "reveal", "finish", "again", "bombGo", "showWord", "exGo", "exNext", "exEndTurn"];

const DEF_IMP = { cats: ["food", "everyday", "animals"], imps: 1, clueless: false, hint: "cat", timer: 0, vote: "group" };
const DEF_MIS = { timer: 5, vote: "group" };
const DEF_EXP = { decks: ["ex_everyday", "ex_animals", "ex_food"], time: 60, rounds: 3, penalty: true };
const DEF_BOMB = { len: "mid", src: "general", teams: false };
function opts(key, def) {
  const o = Object.assign({}, def, store.get(key, {}));
  if (key === "imp" && typeof o.hint === "boolean") o.hint = o.hint ? "cat" : "none";   // ältere Fassung
  return o;
}
function setOpt(key, def, patch) { store.set(key, Object.assign(opts(key, def), patch)); }
function players() {
  const p = store.get("players", []);
  return Array.isArray(p) ? p.filter(x => typeof x === "string" && x).slice(0, MAX_PLAYERS) : [];
}
function teams() {
  let tm = store.get("teams", null);
  if (!Array.isArray(tm) || tm.length < MIN_TEAMS) tm = range(MIN_TEAMS).map(i => t("team.default." + i));
  return tm.filter(x => typeof x === "string" && x).slice(0, MAX_TEAMS);
}
function scores(key = "scores") { const s = store.get(key, {}); return s && typeof s === "object" ? s : {}; }
function level() { const l = store.get("level", 3); return [1, 2, 3].includes(l) ? l : 3; }
function school() { return store.get("school", false) === true; }
/* Eigene Kartensets; ältere Fassung speicherte nur Wörter */
function lists() {
  const l = store.get("lists", []);
  if (!Array.isArray(l)) return [];
  return l.filter(x => x && x.id && (Array.isArray(x.cards) || Array.isArray(x.words))).map(x => ({
    id: String(x.id), name: String(x.name || "?"),
    cards: Array.isArray(x.cards) ? x.cards.filter(c => c && c.w).map(c => ({ w: String(c.w), f: Array.isArray(c.f) ? c.f.map(String) : [] }))
      : x.words.map(w => ({ w: String(w), f: [] }))
  }));
}
function mode() { const m = store.get("mode", "imposter"); return MODES.includes(m) ? m : "imposter"; }
function usesTeams(m) { return m === "explain" || (m === "bomb" && opts("bomb", DEF_BOMB).teams); }

/* ---------- Navigation ---------- */
function stopRoundTimers() {
  if (TIMER) { TIMER.stop(); TIMER = null; }
  if (BOMB) { BOMB.cd.stop(); clearTimeout(BOMB.tickId); BOMB = null; }
}
function runLeave() { const f = leaveFns; leaveFns = []; f.forEach(fn => { try { fn(); } catch (e) { /* weiter */ } }); }
function show(html, opt = {}) {
  if (!opt.keepTimers) stopRoundTimers();
  runLeave();
  closeDialog();
  holdOff = null;
  view.innerHTML = html;
  if (!opt.keepScroll) shownAt = performance.now();
  current = { name: opt.name || "", redraw: opt.redraw || null, round: !!opt.round, back: opt.back || null };
  if (current.round && R) saveRound();
  if (!opt.keepScroll) {
    window.scrollTo(0, 0);
    const first = view.querySelector("h1, h2, .big-h, .who");
    if (first && opt.name !== "home") { first.setAttribute("tabindex", "-1"); first.focus({ preventScroll: true }); }
  }
}
function redraw() { if (current.redraw) current.redraw(true); }
function goHome() {
  stopRoundTimers();
  R = null;
  store.remove("resume");
  keepAwake(false);
  screenHome();
}

/* ---------- Runde nach Neustart fortsetzen ----------
   Android beendet Apps im Hintergrund manchmal (z. B. beim Wechsel zur
   Kamera). Der Rundenstand wird bei jedem Bildschirmwechsel gespeichert und
   beim nächsten Start angeboten. */
const RESUME_MAX_MS = 12 * 3600 * 1000;
function saveRound() {
  try {
    const plain = JSON.parse(JSON.stringify(R, (k, v) => (v instanceof Set ? { __set: [...v] } : v)));
    store.set("resume", { at: Date.now(), scr: current.name, R: plain });
  } catch (e) { /* ohne Fortsetzen weiter */ }
}
function reviveRound(o) {
  return JSON.parse(JSON.stringify(o), (k, v) => (v && typeof v === "object" && Array.isArray(v.__set) ? new Set(v.__set) : v));
}
function offerResume() {
  const sv = store.get("resume", null);
  if (!sv || !sv.R || !MODES.includes(sv.R.mode) || !(Date.now() - sv.at < RESUME_MAX_MS)) { store.remove("resume"); return; }
  dialog(t("resume.title"), `<p>${esc(t("resume.text", { mode: t("mode." + sv.R.mode), who: (sv.R.P || []).join(", ") }))}</p>`, [
    { label: t("resume.discard"), action: () => { store.remove("resume"); } },
    { label: t("resume.go"), primary: true, action: () => { resumeRound(sv); } }
  ]);
}
function resumeRound(sv) {
  try { R = reviveRound(sv.R); } catch (e) { store.remove("resume"); return; }
  keepAwake(true);
  const scr = sv.scr;
  if (R.mode === "explain") {
    if (R.state === "running" || R.state === "paused") R.state = R.log && R.log.length ? "review" : "ready";
    screenExplain(); return;
  }
  if (R.mode === "bomb") {
    if (R.state === "running" || R.state === "paused") R.state = "ready";
    screenBomb(); return;
  }
  if (scr === "pass") screenPass();
  else if (scr === "vote") screenVote();
  else if (scr === "secretPass" || scr === "secretPick") { R.sel = null; screenSecretPass(); }
  else if (scr === "tie") screenTie();
  else if (scr === "resolve") screenResolve();
  else screenPlay();
}

/* ---------- Geführte erste Runde ----------
   Bis zur ersten fertigen Runde eines Modus erklärt ein Hinweis jeden Schritt. */
function coachOn(m) { const c = store.get("coach", {}); return !(c && c[m]); }
function coachDone(m) { const c = store.get("coach", {}) || {}; c[m] = true; store.set("coach", c); }
function coach(key) { return R && coachOn(R.mode) ? `<div class="coach" role="note">💡 ${esc(t("coach." + key))}</div>` : ""; }

/* ---------- Schriftgröße ---------- */
const FONT_SCALES = [1, 1.12, 1.25];
function applyFontScale() {
  const f = Number(store.get("fontScale", 1));
  document.body.style.zoom = FONT_SCALES.includes(f) && f !== 1 ? String(f) : "";
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
  if (inp) {
    setTimeout(() => inp.focus(), 50);
    inp.addEventListener("keydown", e => { if (e.key === "Enter") { const pb = dlgEl.querySelector(".btn.primary"); if (pb) pb.click(); } });
  } else { const pb = dlgEl.querySelector(".btn.primary"); if (pb) pb.focus(); }
}
function confirmDlg(text, yesLabel, onYes, danger) {
  dialog(t("confirm.title"), `<p>${esc(text)}</p>`, [{ label: t("cancel") }, { label: yesLabel, primary: !danger, danger: !!danger, action: onYes }]);
}
function inputDlg(title, value, max, onSave, extraHtml = "") {
  dialog(title, `${extraHtml}<input type="text" id="dlgIn" maxlength="${max}" value="${esc(value)}" aria-label="${esc(title)}" autocomplete="off" autocapitalize="words">`, [
    { label: t("cancel") },
    { label: t("save"), primary: true, action: () => onSave(cleanText(document.getElementById("dlgIn").value, max)) }
  ]);
}
function pinDlg(title, text, onPin) {
  dialog(title, `<p>${esc(text)}</p><input type="text" id="dlgIn" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" aria-label="PIN" style="-webkit-text-security:disc;text-security:disc;letter-spacing:6px;text-align:center;font-size:22px">`, [
    { label: t("cancel") },
    { label: t("ok"), primary: true, action: () => onPin(document.getElementById("dlgIn").value.trim()) }
  ]);
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
function dot(i) { return `<span class="tdot" style="background:${TEAM_COLORS[i % TEAM_COLORS.length]}" aria-hidden="true"></span>`; }
function levelSeg() {
  return `<div class="opt col"><div class="lbl"><b>${esc(t("opt.level"))}</b><small>${esc(t("opt.level.hint"))}</small></div>
    ${seg(t("opt.level"), [[1, t("opt.level.1")], [2, t("opt.level.2")], [3, t("opt.level.3")]], level(), "level")}</div>`;
}

/* =====================================================================
   Inhalte für die Runde
   ===================================================================== */
function deckName(id) {
  if (id.startsWith("u:")) { const l = lists().find(x => "u:" + x.id === id); return l ? l.name : ""; }
  if (DECKS[LANG][id]) return DECKS[LANG][id].name;
  if (EQUIV[LANG][id]) return EQUIV[LANG][id].name;
  return CONTENT[LANG].cats[id] ? CONTENT[LANG].cats[id].name : "";
}
function deckIcon(id) { return id.startsWith("u:") ? "✏️" : (DECK_ICON[id] || CAT_ICON[id] || "•"); }
/* Hochstapler: Wortkategorien, Schule/Mathe (nach Niveau), eigene Karten */
function imposterPool(cats) {
  const o = cats || opts("imp", DEF_IMP).cats, L = lists(), pool = [], lv = level();
  o.forEach(id => {
    if (id.startsWith("u:")) {
      const l = L.find(x => "u:" + x.id === id);
      if (l) l.cards.forEach(c => pool.push({ cat: id, name: l.name, icon: "✏️", word: c.w, s: "" }));
    } else if (EQUIV[LANG][id]) {
      const d = EQUIV[LANG][id];
      d.groups.filter(g => levelOk(g.lv, lv)).forEach(g => pool.push({ cat: id, name: d.name, icon: DECK_ICON[id], word: g.reps[0], reps: g.reps, near: g.near, equiv: true }));
    } else if (DECKS[LANG][id]) {
      const d = DECKS[LANG][id];
      d.cards.filter(c => levelOk(c.lv, lv)).forEach(c => pool.push({ cat: id, name: d.name, icon: DECK_ICON[id], word: c.w, s: c.s }));
    } else if (CONTENT[LANG].cats[id]) {
      const c = CONTENT[LANG].cats[id];
      c.words.forEach(w => pool.push({ cat: id, name: c.name, icon: CAT_ICON[id], word: w, s: "" }));
    }
  });
  return pool;
}
/* Erklär-Modus: Karten mit verbotenen Wörtern */
function explainPool(decks) {
  const o = decks || opts("exp", DEF_EXP).decks, L = lists(), pool = [], lv = level();
  o.forEach(id => {
    if (id.startsWith("u:")) {
      const l = L.find(x => "u:" + x.id === id);
      if (l) l.cards.forEach(c => pool.push({ deck: id, icon: "✏️", w: c.w, f: c.f }));
    } else if (DECKS[LANG][id]) {
      DECKS[LANG][id].cards.filter(c => levelOk(c.lv, lv)).forEach(c => pool.push({ deck: id, icon: DECK_ICON[id], w: c.w, f: c.f }));
    }
  });
  return pool;
}
function bombPool() {
  const src = opts("bomb", DEF_BOMB).src, lv = level();
  const gen = bombPrompts(LANG), math = BOMB_MATH[LANG].filter(([, l]) => levelOk(l, lv)).map(([p]) => p);
  return src === "math" ? math : src === "mix" ? gen.concat(math) : gen;
}
function missionContent() {
  return school() ? { topics: SCHOOL_TOPICS[LANG], missions: SCHOOL_MISSIONS[LANG], key: "s" } : { topics: CONTENT[LANG].topics, missions: CONTENT[LANG].missions, key: "g" };
}

/* =====================================================================
   Startseite
   ===================================================================== */
function whyNot(m) {
  if (usesTeams(m)) { if (teams().length < MIN_TEAMS) return t("why.teams"); }
  else if (players().length < MIN_PLAYERS[m]) return t("why.players", { n: MIN_PLAYERS[m] });
  if (m === "imposter" && imposterPool().length < 2) return t(opts("imp", DEF_IMP).cats.length ? "why.level" : "why.cats");
  if (m === "explain" && explainPool().length < 5) return t("why.decks");
  if (m === "bomb" && bombPool().length < 1) return t("why.cats");
  return "";
}
function chip(id, on, act, label) {
  return `<button type="button" class="chip" role="checkbox" aria-checked="${on}" data-act="${act}" data-v="${esc(id)}">${deckIcon(id)} ${esc(label)}</button>`;
}
function customChips(sel, act, needForbidden) {
  return lists().map(l => {
    const n = needForbidden ? l.cards.length : l.cards.length;
    return chip("u:" + l.id, sel.includes("u:" + l.id), act, l.name + " (" + n + ")");
  }).join("") + `<button type="button" class="chip new" data-act="lists">＋ ${esc(t("lists.manage"))}</button>`;
}
function catSections(sel, act, general, withSchoolMath) {
  const mathOn = sel.some(id => DECK_MATH.includes(id) || EQUIV_DECKS.includes(id));
  return `<section class="card"><h2>${esc(t("cats.title"))}</h2>
    <div class="grp">${esc(t("cats.general"))}</div><div class="chips">${general.map(id => chip(id, sel.includes(id), act, deckName(id))).join("")}</div>
    ${withSchoolMath ? `<div class="grp">${esc(t("cats.math"))}</div><div class="chips">${(withSchoolMath === true ? DECK_MATH : withSchoolMath).map(id => chip(id, sel.includes(id), act, deckName(id))).join("")}</div>` : ""}
    <div class="grp">${esc(t("cats.own"))}</div><div class="chips">${customChips(sel, act)}</div>
    ${mathOn || act === "deck" ? levelSeg() : ""}
  </section>`;
}
function modeOptions(m, n) {
  if (m === "imposter") {
    const o = opts("imp", DEF_IMP);
    return catSections(o.cats, "cat", CAT_ORDER.concat("ex_school"), DECK_MATH.concat(EQUIV_DECKS)) + `
    <section class="card"><h2>${esc(t("opts.title"))}</h2>
      <div class="opt col"><div class="lbl"><b>${esc(t("opt.hint"))}</b><small>${esc(t("opt.hint." + o.hint))}</small></div>
        ${seg(t("opt.hint"), [["cat", t("opt.hint.cat.s")], ["similar", t("opt.hint.similar.s")], ["none", t("opt.hint.none.s")]], o.hint, "hint")}</div>
      <div class="opt"><div class="lbl"><b>${esc(t("opt.imps"))}</b><small>${esc(t("opt.imps.hint", { n: MIN_TWO_IMPOSTERS }))}</small></div>
        ${seg(t("opt.imps"), [[1, "1"], [2, "2"]], n < MIN_TWO_IMPOSTERS ? 1 : o.imps, "imps", v => v === 2 && n < MIN_TWO_IMPOSTERS)}</div>
      <div class="opt"><div class="lbl"><b>${esc(t("opt.clueless"))}</b><small>${esc(t("opt.clueless.hint", { n: MIN_CLUELESS }))}</small></div>
        ${sw(t("opt.clueless"), o.clueless && n >= MIN_CLUELESS, "clueless", n < MIN_CLUELESS)}</div>
      <div class="opt col"><div class="lbl"><b>${esc(t("opt.timer"))}</b></div>
        ${seg(t("opt.timer"), [[0, t("opt.off")], [2, "2 min"], [3, "3 min"], [5, "5 min"]], o.timer, "impTimer")}</div>
      <div class="opt col"><div class="lbl"><b>${esc(t("opt.vote"))}</b><small>${esc(t("opt.vote.hint"))}</small></div>
        ${seg(t("opt.vote"), [["group", t("opt.vote.group")], ["secret", t("opt.vote.secret")]], o.vote, "impVote")}</div>
    </section>`;
  }
  if (m === "missions") {
    const o = opts("mis", DEF_MIS);
    return `<section class="card"><h2>${esc(t("opts.title"))}</h2>
      ${school() ? `<p class="muted small" style="margin-top:0">🏫 ${esc(t("school.missions"))}</p>` : ""}
      <div class="opt col"><div class="lbl"><b>${esc(t("opt.talk"))}</b><small>${esc(t("opt.talk.hint"))}</small></div>
        ${seg(t("opt.talk"), [[3, "3 min"], [5, "5 min"], [8, "8 min"]], o.timer, "misTimer")}</div>
      <div class="opt col"><div class="lbl"><b>${esc(t("opt.vote"))}</b><small>${esc(t("opt.vote.hint"))}</small></div>
        ${seg(t("opt.vote"), [["group", t("opt.vote.group")], ["secret", t("opt.vote.secret")]], o.vote, "misVote")}</div>
    </section>`;
  }
  if (m === "explain") {
    const o = opts("exp", DEF_EXP);
    return catSections(o.decks, "deck", DECK_GENERAL, true) + `
    <section class="card"><h2>${esc(t("opts.title"))}</h2>
      <div class="opt col"><div class="lbl"><b>${esc(t("opt.exTime"))}</b></div>
        ${seg(t("opt.exTime"), [[60, "60 s"], [90, "90 s"], [120, "120 s"]], o.time, "exTime")}</div>
      <div class="opt col"><div class="lbl"><b>${esc(t("opt.exRounds"))}</b><small>${esc(t("opt.exRounds.hint"))}</small></div>
        ${seg(t("opt.exRounds"), [[1, "1"], [2, "2"], [3, "3"], [5, "5"]], o.rounds, "exRounds")}</div>
      <div class="opt"><div class="lbl"><b>${esc(t("opt.penalty"))}</b><small>${esc(t("opt.penalty.hint"))}</small></div>
        ${sw(t("opt.penalty"), o.penalty, "penalty")}</div>
    </section>`;
  }
  const o = opts("bomb", DEF_BOMB);
  return `<section class="card"><h2>${esc(t("opts.title"))}</h2>
    <div class="opt col"><div class="lbl"><b>${esc(t("opt.bombSrc"))}</b></div>
      ${seg(t("opt.bombSrc"), [["general", t("opt.bombSrc.general")], ["math", t("opt.bombSrc.math")], ["mix", t("opt.bombSrc.mix")]], o.src, "bombSrc")}</div>
    ${o.src !== "general" ? levelSeg() : ""}
    <div class="opt"><div class="lbl"><b>${esc(t("opt.bombTeams"))}</b><small>${esc(t("opt.bombTeams.hint"))}</small></div>
      ${sw(t("opt.bombTeams"), o.teams, "bombTeams")}</div>
    <div class="opt col"><div class="lbl"><b>${esc(t("opt.fuse"))}</b><small>${esc(t("opt.fuse.hint"))}</small></div>
      ${seg(t("opt.fuse"), [["short", t("opt.fuse.short")], ["mid", t("opt.fuse.mid")], ["long", t("opt.fuse.long")]], o.len, "fuse")}</div>
  </section>`;
}
function scoreCard(teamMode) {
  const P = teamMode ? teams() : players(), S = scores(teamMode ? "teamScores" : "scores");
  if (!P.some(p => (S[p] || 0) !== 0)) return "";
  const rows = P.map(p => [p, S[p] || 0]).sort((a, b) => b[1] - a[1]);
  return `<section class="card"><h2>${esc(t(teamMode ? "score.teams" : "score.title"))}</h2><table class="score">${rows.map(([p, s], k) =>
    `<tr><td>${k === 0 && s > 0 ? "👑 " : ""}${esc(p)}</td><td class="r">${s}</td></tr>`).join("")}</table>
    <button type="button" class="link" data-act="resetScores">${esc(t("score.reset"))}</button></section>`;
}
function playersCard() {
  const P = players(), n = P.length;
  return `<section class="card"><h2>${esc(t("players.title"))} <span class="pill">${n}/${MAX_PLAYERS}</span></h2>
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
  </section>`;
}
function teamsCard() {
  const T = teams();
  return `<section class="card"><h2>${esc(t("teams.title"))} <span class="pill">${T.length}/${MAX_TEAMS}</span></h2>
    <ol class="plist">${T.map((p, i) => `<li>${dot(i)}
      <button type="button" class="pn" data-act="trename" data-v="${i}" aria-label="${esc(t("players.rename", { name: p }))}">${esc(p)}</button>
      <button type="button" class="mini" data-act="trm" data-v="${i}" aria-label="${esc(t("players.remove", { name: p }))}"${T.length <= MIN_TEAMS ? " disabled" : ""}>✕</button></li>`).join("")}</ol>
    ${T.length < MAX_TEAMS ? `<button type="button" class="btn wide" style="margin-top:8px" data-act="tadd">＋ ${esc(t("teams.add"))}</button>` : ""}
    <p class="muted small" style="margin-bottom:0">${esc(t("teams.hint"))}</p>
  </section>`;
}
function screenHome(keep) {
  const m = mode(), teamMode = usesTeams(m), n = players().length;
  const why = whyNot(m);
  const first = !store.get("seenRules", false);
  show(`<div class="homebar">${langSwitch()}<button type="button" class="iconbtn" data-act="settings" aria-label="${esc(t("set.title"))}">⚙️</button></div>
  <section class="hero"><img src="icon-192.png" alt="" width="76" height="76"><h1>SneakPlay</h1><p>${esc(t("home.tagline"))}</p>
    ${school() ? `<p class="badge">🏫 ${esc(t("school.active"))}</p>` : ""}</section>
  ${first ? `<section class="card"><p style="margin-top:0">${esc(t("home.welcome"))}</p>
    <button type="button" class="btn primary wide" data-act="demo">▶ ${esc(t("home.demo"))}</button>
    <button type="button" class="btn wide" style="margin-top:8px" data-act="rules">📖 ${esc(t("home.howto"))}</button></section>` : ""}
  <section class="card"><h2>${esc(t("mode.title"))}</h2><div class="modes" role="radiogroup" aria-label="${esc(t("mode.title"))}">
    ${MODES.map(k => `<div class="moderow"><button type="button" class="mode" role="radio" aria-checked="${k === m}" data-act="mode" data-v="${k}"><span class="mi" aria-hidden="true">${MODE_ICON[k]}</span><span><b>${esc(t("mode." + k))} ${modeBadge(k)}</b><small>${esc(t("mode." + k + ".sub"))}</small></span></button><button type="button" class="qbtn" data-act="rulesFor" data-v="${k}" aria-label="${esc(t("mode.help", { mode: t("mode." + k) }))}">?</button></div>`).join("")}
  </div></section>
  ${teamMode ? teamsCard() : playersCard()}
  ${modeOptions(m, n)}
  <p class="err" id="why">${esc(why)}</p>
  <button type="button" class="btn primary big" data-act="start"${why ? " disabled" : ""}>${esc(t("home.start"))}</button>
  <div class="linkrow"><button type="button" class="link" data-act="rules">📖 ${esc(t("home.rules"))}</button><button type="button" class="link" data-act="demo">▶ ${esc(t("home.demoShort"))}</button></div>
  ${scoreCard(teamMode)}
  <footer class="foot"><p>${esc(t("home.privacy"))}</p><p><a href="${legalUrl("datenschutz")}">${esc(t("legal.privacy"))}</a> · <a href="${legalUrl("impressum")}">${esc(t("legal.imprint"))}</a></p></footer>`,
  { name: "home", redraw: screenHome, keepScroll: keep });
  const form = document.getElementById("addForm");
  if (form) form.addEventListener("submit", e => {
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
function renameIn(key, list, i, scoreKey) {
  if (!list[i]) return;
  inputDlg(t("players.renameTitle"), list[i], MAX_NAME, v => {
    if (!v) return false;
    const old = list[i];
    if (v === old) return;
    const nv = uniqueName(v, list.filter((_, k) => k !== i));
    list[i] = nv;
    const S = scores(scoreKey);
    if (S[old] != null) { S[nv] = (S[nv] || 0) + S[old]; delete S[old]; store.set(scoreKey, S); }
    store.set(key, list);
    screenHome(true);
  });
}

/* =====================================================================
   Runde starten
   ===================================================================== */
function startRound() {
  const m = mode();
  if (whyNot(m)) { screenHome(true); return; }
  requirePro(m, () => beginRound(m));
}
function beginRound(m) {
  unlockAudio();
  keepAwake(true);
  store.set("seenRules", true);
  const P = players(), n = P.length;
  if (m === "imposter") {
    const o = opts("imp", DEF_IMP), pool = imposterPool();
    const r = pickFresh(pool, x => LANG + "|" + x.cat + "|" + x.word, store.get("used.imp", []));
    store.set("used.imp", r.used);
    const roles = assignImposter(n, o);
    const alt = o.hint === "similar" ? similarFor(r.item, pool) : "";
    R = { mode: m, P, lang: LANG, cat: r.item.name, icon: r.item.icon, word: r.item.word, alt, role: roles.role, starter: roles.starter,
      hint: o.hint === "similar" && !alt ? "cat" : o.hint, timer: o.timer, vote: o.vote, step: 0, accused: null, votes: null, judged: {}, wordShown: false };
    /* Zahlen-Hochstapler: jede Person der Crew bekommt eine andere, gleichwertige Darstellung */
    if (r.item.equiv) {
      const reps = shuffle(r.item.reps);
      let k = 0;
      R.equiv = true; R.reps = r.item.reps;
      R.val = R.role.map(x => (x === "crew" ? reps[k++ % reps.length] : ""));
    }
  } else if (m === "missions") {
    const o = opts("mis", DEF_MIS), C = missionContent();
    const tp = pickFresh(C.topics, x => LANG + C.key + "|" + x, store.get("used.topics", []));
    const ms = pickManyFresh(C.missions, x => LANG + C.key + "|" + x, store.get("used.missions", []), n);
    store.set("used.topics", tp.used); store.set("used.missions", ms.used);
    R = { mode: m, P, lang: LANG, topic: tp.item, ms: ms.items, none: rnd(n), timer: o.timer, vote: o.vote,
      step: 0, accused: null, votes: null, open: {}, res: {} };
  } else if (m === "explain") {
    const o = opts("exp", DEF_EXP), T = teams();
    R = { mode: m, P: T, teamMode: true, lang: LANG, time: o.time, rounds: o.rounds, penalty: o.penalty, pool: explainPool(),
      pts: T.map(() => 0), turn: 0, state: "ready", log: [], card: null, seenGame: new Set(), best: { pts: -99, team: -1 }, learn: [] };
    screenExplain();
    return;
  } else {
    const o = opts("bomb", DEF_BOMB), teamMode = o.teams;
    R = { mode: m, P: teamMode ? teams() : P, teamMode, lang: LANG, len: o.len, pool: bombPool(), prompt: "", state: "ready", loser: null };
    R.prompt = nextBombPrompt();
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
    const wordCard = w => R.equiv
      ? `<div class="k">${esc(t("card.value"))}</div><div class="w num">${esc(w)}</div><small class="muted">${esc(t("card.value.hint"))}</small>`
      : `<div class="k">${esc(t("card.word"))}</div><div class="w">${esc(w)}</div><small class="muted">${R.icon} ${esc(R.cat)}</small>`;
    /* Variante „Ähnlicher Begriff“: Die Karte sieht aus wie bei allen anderen */
    if (r === "imp" && R.hint === "similar") return wordCard(R.alt);
    if (r === "imp") return `<div class="k">${esc(t("card.role"))}</div><div class="w imp">${esc(t("card.imposter"))}</div>
      ${R.hint === "cat" ? `<div class="k">${esc(t("card.category"))}</div><div class="m">${R.icon} ${esc(R.cat)}</div>` : ""}
      <small class="muted">${esc(t(R.hint === "cat" ? "card.imposter.text" : "card.imposter.textNoHint"))}${imps > 1 ? "<br>" + esc(t("card.imposter.two")) : ""}</small>`;
    if (r === "clue") return `<div class="k">${esc(t("card.role"))}</div><div class="w clue">${esc(t("card.clueless"))}</div>
      <small class="muted">${esc(t("card.clueless.text"))}</small>`;
    return wordCard(R.equiv ? R.val[i] : R.word);
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
  <p class="muted small center">${esc(t("pass.nextHint"))}</p>
  ${i === 0 ? coach("pass") : ""}`, { name: "pass", redraw: screenPass, round: true });
  const hold = document.getElementById("hold"), sec = document.getElementById("secret"), nb = document.getElementById("nextBtn");
  fitHold(hold, nb);
  let showing = false;
  const on = e => {
    if (e) e.preventDefault();
    if (showing) return;
    showing = true;
    sec.innerHTML = `<div class="fitwrap">${secretHTML(i)}</div>`;
    hold.classList.add("show");
    /* Sehr lange Texte bei großer Schrift: Inhalt verkleinern statt scrollen
       (auf der Karte ist Wischen gesperrt) */
    const fw = sec.firstChild;
    if (sec.scrollHeight > sec.clientHeight + 1) fw.style.zoom = String(Math.max(0.65, (sec.clientHeight - 24) / sec.scrollHeight));
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

/* Karte und Weiter-Knopf müssen ohne Scrollen sichtbar sein: Auf der Karte
   selbst ist Wischen gesperrt (sonst verrutscht sie beim Halten). Die Karte
   wird so weit verkleinert, dass der Knopf auf den Bildschirm passt. */
function fitHold(hold, btn) {
  try {
    hold.style.height = ""; hold.classList.remove("compact");
    const over = btn.getBoundingClientRect().bottom + 12 - window.innerHeight;
    if (over <= 0) return;
    const r = hold.getBoundingClientRect(), css = hold.offsetHeight, scale = r.height / css || 1;
    const nh = Math.max(170, Math.floor(css - over / scale));
    hold.style.height = nh + "px";
    hold.classList.toggle("compact", nh < 250);
  } catch (e) { /* Standardhöhe bleibt */ }
}
window.addEventListener("resize", () => { const h = document.getElementById("hold"), b = document.getElementById("nextBtn"); if (h && b) fitHold(h, b); });

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
      const b = document.getElementById("tbtn");
      b.textContent = t("timer.toVote"); b.dataset.act = "tovote";
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
function screenPlay() {
  if (R.mode === "imposter") {
    const n = R.P.length, s = R.starter, order = range(n).map(k => R.P[(s + k) % n]);
    show(`${topbar()}${coach(R.equiv ? "playEquiv" : "playImp")}<div class="card center pop"><div class="step">${esc(t("play.imp.step"))}</div><div class="big-h">${esc(t("play.imp.starts", { name: R.P[s] }))}</div>
      <p>${esc(t(R.equiv ? "play.imp.textEquiv" : "play.imp.text"))}</p><div class="order">${order.map(p => `<span>${esc(p)}</span>`).join("")}</div></div>
      ${R.timer ? timerCard(R.timer, "timer.startTalk") : ""}
      <div class="card"><p class="muted" style="margin:0">💡 ${esc(t(R.hint === "similar" ? "play.imp.tipSimilar" : "play.imp.tip"))}</p></div>
      <button type="button" class="btn primary big" data-act="tovote">${esc(t("play.toVote"))}</button>`, { name: "play", round: true });
    if (R.timer) initTimer(R.timer);
  } else {
    show(`${topbar()}${coach("playMis")}<div class="card center pop"><div class="step">${esc(t("card.topic"))}</div><div class="topic">${esc(R.topic)}</div>
      <p>${esc(t("play.mis.text"))}</p><p class="muted" style="margin-bottom:0">${esc(t("play.mis.note"))}</p></div>
      ${timerCard(R.timer, "timer.startTalk")}
      <button type="button" class="btn primary big" data-act="tovote">${esc(t("play.toVote"))}</button>`, { name: "play", round: true });
    initTimer(R.timer);
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
  show(`${topbar()}${coach("vote")}<div class="center pop"><div class="step">${esc(t("vote.step"))}</div><div class="big-h">${esc(voteQuestion())}</div><p class="muted">${esc(t("vote.group.text"))}</p></div>
    <div class="grid" role="radiogroup" aria-label="${esc(voteQuestion())}">${R.P.map((p, i) => `<button type="button" class="pbtn" role="radio" aria-checked="${R.accused === i}" data-act="accuse" data-v="${i}">${esc(p)}</button>`).join("")}</div>
    <button type="button" class="btn primary big" data-act="reveal"${R.accused == null ? " disabled" : ""}>${esc(t("vote.reveal"))}</button>`,
  { name: "vote", round: true, keepScroll: keep });
}
function startVote() {
  R.accused = null; R.counts = null; R.votes = null;
  if (R.vote === "secret") { R.votes = Array(R.P.length).fill(null); R.vi = 0; R.sel = null; screenSecretPass(); }
  else screenVote();
}
function screenSecretPass() {
  const i = R.vi;
  show(`${topbar()}${i === 0 ? coach("secret") : ""}<div class="center pop"><div class="step">${esc(t("vote.secret.step", { i: i + 1, n: R.P.length }))}</div>
    <div class="passto">${esc(t("pass.give"))}</div><div class="who">${esc(R.P[i])}</div><p class="muted">${esc(t("vote.secret.text"))}</p></div>
    <button type="button" class="btn primary big" data-act="secretOpen">${esc(t("vote.secret.iam", { name: R.P[i] }))}</button>`,
  { name: "secretPass", round: true });
}
function screenSecretPick(keep) {
  const i = R.vi;
  show(`${topbar()}<div class="center"><div class="step">${esc(R.P[i])}</div><div class="big-h">${esc(voteQuestion())}</div><p class="muted">${esc(t("vote.secret.pick"))}</p></div>
    <div class="grid" role="radiogroup" aria-label="${esc(voteQuestion())}">${R.P.map((p, k) => k === i ? "" : `<button type="button" class="pbtn" role="radio" aria-checked="${R.sel === k}" data-act="secretSel" data-v="${k}">${esc(p)}</button>`).join("")}</div>
    <button type="button" class="btn primary big" data-act="secretCast"${R.sel == null ? " disabled" : ""}>${esc(t("vote.secret.cast"))}</button>`,
  { name: "secretPick", round: true, keepScroll: keep });
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
  { name: "tie", round: true, keepScroll: keep });
}
function countsLine() {
  if (!R.counts) return "";
  const parts = range(R.P.length).filter(i => R.counts[i] > 0).sort((a, b) => R.counts[b] - R.counts[a]).map(i => `${esc(R.P[i])} ${R.counts[i]}`);
  return `<p class="muted small">${esc(t("vote.counts"))}: ${parts.join(" · ")}</p>`;
}

/* =====================================================================
   Auflösung und Wertung
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
    body = `<div class="card center pop"><div class="step">${esc(t(R.equiv ? "res.valueWas" : "res.wordWas"))}</div><div class="reveal-word">${esc(R.equiv ? R.reps.join(" = ") : R.word)}</div><p class="muted" style="margin-top:0">${R.icon} ${esc(R.cat)}</p>
      ${R.hint === "similar" ? `<p class="muted">${esc(t("res.altWas", { word: R.alt }))}</p>` : ""}
      <p style="margin-bottom:0">${esc(t(imps.length > 1 ? "res.imposters" : "res.imposter"))}: <b>${names(imps)}</b>${clue >= 0 ? `<br>${esc(t("card.clueless"))}: <b>${esc(R.P[clue])}</b>` : ""}</p></div>
      ${guessers.length ? `<div class="card"><h2>${esc(t("res.judge"))}</h2>${guessers.map(g => `<div class="judge"><span class="nm">${esc(R.P[g])}</span><div class="jb" role="radiogroup" aria-label="${esc(R.P[g])}">
        <button type="button" role="radio" class="ok" aria-checked="${R.judged[g] === true}" data-act="judge" data-v="${g}:1">✓ ${esc(t("res.right"))}</button>
        <button type="button" role="radio" class="bad" aria-checked="${R.judged[g] === false}" data-act="judge" data-v="${g}:0">✗ ${esc(t("res.wrong"))}</button></div></div>`).join("")}</div>` : ""}
      <button type="button" class="btn primary big" data-act="finish"${ready ? "" : " disabled"}>${esc(t("res.toAwards"))}</button>`;
  }
  show(`${topbar()}${coach("resolveImp")}<div class="card center pop">${head}${countsLine()}</div>${body}`, { name: "resolve", round: true, keepScroll: keep });
}
function resolveMis(keep) {
  const a = R.accused, found = a === R.none, none = R.P[R.none];
  const head = found
    ? `<div class="e-big">🎯</div><div class="big-h">${esc(t("res.found"))}</div><p>${esc(t("res.found.text", { name: none }))}</p>`
    : `<div class="e-big">😐</div><div class="big-h">${esc(t("res.miss"))}</div><p>${esc(t("res.notFound.text", { name: R.P[a], none }))}</p>`;
  const holders = range(R.P.length).filter(i => i !== R.none);
  const ready = holders.every(i => R.res[i]);
  show(`${topbar()}${coach("resolveMis")}<div class="card center pop">${head}${countsLine()}</div>
    <div class="card"><h2>🕵️ ${esc(t("res.missions"))}</h2><p class="muted" style="margin-top:0">${esc(t("res.missions.text", { name: none }))}</p>
    ${holders.map(i => `<div class="mcard"><div class="judge" style="border:0;padding:0"><span class="nm">${esc(R.P[i])}</span>${R.open[i] ? "" : `<button type="button" class="btn" data-act="mopen" data-v="${i}">${esc(t("res.open"))}</button>`}</div>
      ${R.open[i] ? `<div class="mt">${esc(R.ms[i])}</div><div class="jb" role="radiogroup" aria-label="${esc(R.P[i])}">
        <button type="button" role="radio" class="ok" aria-checked="${R.res[i] === "ok"}" data-act="mres" data-v="${i}:ok">✓ ${esc(t("res.m.ok"))}</button>
        <button type="button" role="radio" class="mid" aria-checked="${R.res[i] === "seen"}" data-act="mres" data-v="${i}:seen">🔍 ${esc(t("res.m.seen"))}</button>
        <button type="button" role="radio" class="bad" aria-checked="${R.res[i] === "fail"}" data-act="mres" data-v="${i}:fail">✗ ${esc(t("res.m.fail"))}</button></div>` : ""}</div>`).join("")}
    </div>
    <p class="muted small center">${esc(t("res.m.legend"))}</p>
    <button type="button" class="btn primary big" data-act="finish"${ready ? "" : " disabled"}>${esc(t("res.toAwards"))}</button>`,
  { name: "resolve", round: true, keepScroll: keep });
}
function finishRound() {
  if (R.result) { screenAwards(); return; }
  let r;
  if (R.mode === "imposter") r = scoreImposter({ role: R.role, accused: R.accused, judged: R.judged, votes: R.votes });
  else if (R.mode === "missions") r = scoreMissions({ n: R.P.length, none: R.none, accused: R.accused, res: R.res, votes: R.votes });
  else r = scoreBomb(R.P.length, R.loser);
  const key = R.teamMode ? "teamScores" : "scores", S = scores(key);
  R.P.forEach((p, i) => { if (r.delta[i]) S[p] = (S[p] || 0) + r.delta[i]; });
  store.set(key, S);
  R.result = r;
  store.remove("resume");
  sfx("fanfare");
  screenAwards();
  coachDone(R.mode);
}
function awardRows(r) {
  return r.awards.map((a, k) => `<div class="award" style="animation-delay:${k * 90}ms"><div class="e" aria-hidden="true">${a.icon}</div><div><b>${esc(t("aw." + a.key))}</b>
      <span class="n">${a.who ? names(a.who) : esc(t("aw.everyone"))}</span><small>${esc(t("aw." + a.key + ".text", { n: a.n || 0 }))}</small></div></div>`).join("");
}
function scoreTable(rows) {
  return `<table class="score">${rows.map(([p, s, d], k) =>
    `<tr><td>${k === 0 && s > 0 ? "👑 " : ""}${esc(p)}${d ? `<span class="d">${d > 0 ? "+" : ""}${d}</span>` : ""}</td><td class="r">${s}</td></tr>`).join("")}</table>`;
}
function screenAwards(keep) {
  const r = R.result, S = scores(R.teamMode ? "teamScores" : "scores");
  const rows = R.P.map((p, i) => [p, S[p] || 0, r.delta[i] || 0]).sort((x, y) => y[1] - x[1]);
  show(`<div class="center pop"><div class="e-big">🏆</div><div class="big-h">${esc(t("aw.title"))}</div></div>
    ${coach("awards")}
    ${awardRows(r)}
    <div class="card" style="margin-top:16px"><h2>${esc(t(R.teamMode ? "score.teams" : "score.title"))}</h2>${scoreTable(rows)}</div>
    <button type="button" class="btn primary big" data-act="again">${esc(t("aw.again"))}</button>
    <button type="button" class="btn wide" data-act="home">${esc(t("aw.home"))}</button>`,
  { name: "awards", keepScroll: keep });
}

/* =====================================================================
   Erklär-Modus (Teams)
   ===================================================================== */
function exTeam() { return R.turn % R.P.length; }
function exRoundNo() { return Math.floor(R.turn / R.P.length) + 1; }
function exNextCard() {
  let pool = R.pool.filter(c => !R.seenGame.has(c.deck + "|" + c.w));
  if (!pool.length) { R.seenGame.clear(); pool = R.pool; }
  const r = pickFresh(pool, c => LANG + "|" + c.deck + "|" + c.w, store.get("used.explain", []));
  store.set("used.explain", r.used);
  R.seenGame.add(r.item.deck + "|" + r.item.w);
  R.card = r.item;
}
function exScoreboard() {
  return `<div class="tscore">${R.P.map((p, i) => `<span class="${i === exTeam() && R.state !== "done" ? "cur" : ""}">${dot(i)}${esc(p)} <b>${R.pts[i]}</b></span>`).join("")}</div>`;
}
function screenExplain(keep) {
  const st = R.state, tm = exTeam();
  if (st === "ready") {
    show(`${topbar()}${coach("exReady")}<div class="center pop"><div class="step">${esc(t("ex.round", { i: exRoundNo(), n: R.rounds }))}</div>
      <div class="big-h">${dot(tm)} ${esc(t("ex.turn", { team: R.P[tm] }))}</div></div>
      ${exScoreboard()}
      <div class="card"><ol class="steps">${t("ex.howto").split("\n").map(x => `<li>${esc(x)}</li>`).join("")}</ol></div>
      <button type="button" class="btn primary big" data-act="exGo">▶ ${esc(t("ex.go", { s: R.time }))}</button>`,
    { name: "explain", redraw: screenExplain, round: true, keepTimers: true, keepScroll: keep });
    return;
  }
  if (st === "running" || st === "paused") {
    const c = R.card, pts = explainPoints(R.log, R.penalty);
    show(`<div class="topbar"><span class="tag">${dot(tm)} ${esc(R.P[tm])} · ${esc(t("ex.pts", { n: pts }))}</span>
        <button type="button" class="x" data-act="${st === "running" ? "exPause" : "exResume"}">${st === "running" ? "⏸ " + esc(t("timer.pause")) : "▶ " + esc(t("timer.resume"))}</button></div>
      <div class="tbar big"><i id="exbar"></i></div><div class="center muted small" id="exleft"></div>
      ${st === "paused" ? `<div class="card center"><div class="e-big">⏸</div><p>${esc(t("ex.paused"))}</p>
          <button type="button" class="btn primary wide" data-act="exResume">▶ ${esc(t("timer.resume"))}</button>
          <button type="button" class="btn danger wide" style="margin-top:8px" data-act="abort">✕ ${esc(t("round.end"))}</button></div>`
        : `<div class="excard pop"><div class="k">${c.icon} ${esc(t("ex.explain"))}</div><div class="w">${esc(c.w)}</div>
          ${c.f.length ? `<div class="k" style="margin-top:6px">${esc(t("ex.forbidden"))}</div><ul class="forbid">${c.f.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="muted small">${esc(t("ex.noForbidden"))}</p>`}</div>
        <div class="exbtns">
          <button type="button" class="btn exok" data-act="exRes" data-v="ok">✓ ${esc(t("ex.ok"))}</button>
          <button type="button" class="btn extaboo" data-act="exRes" data-v="taboo">🚫 ${esc(t("ex.taboo"))}</button>
          <button type="button" class="btn exskip" data-act="exRes" data-v="skip">⏭ ${esc(t("ex.skip"))}</button>
        </div>`}`,
    { name: "explain", redraw: screenExplain, round: true, keepTimers: true, keepScroll: keep });
    if (TIMER) TIMER.onTick(TIMER.remaining());
    return;
  }
  if (st === "review") {
    const pts = explainPoints(R.log, R.penalty);
    show(`${topbar()}${coach("exReview")}<div class="center pop"><div class="e-big">⏰</div><div class="big-h">${esc(t("timer.up"))}</div>
      <p>${dot(tm)} <b>${esc(R.P[tm])}</b>: ${esc(t("ex.turnPts", { n: pts }))}</p></div>
      <div class="card"><h2>${esc(t("ex.review"))}</h2><p class="muted small" style="margin-top:0">${esc(t("ex.review.hint"))}</p>
      ${R.log.length ? R.log.map((x, i) => `<div class="judge"><span class="nm">${esc(x.w)}</span><div class="jb" role="radiogroup" aria-label="${esc(x.w)}">
        <button type="button" role="radio" class="ok" aria-checked="${x.res === "ok"}" data-act="exFix" data-v="${i}:ok" aria-label="${esc(t("ex.ok"))}">✓</button>
        <button type="button" role="radio" class="bad" aria-checked="${x.res === "taboo"}" data-act="exFix" data-v="${i}:taboo" aria-label="${esc(t("ex.taboo"))}">🚫</button>
        <button type="button" role="radio" class="mid" aria-checked="${x.res === "skip"}" data-act="exFix" data-v="${i}:skip" aria-label="${esc(t("ex.skip"))}">⏭</button></div></div>`).join("") : `<p class="muted">${esc(t("ex.none"))}</p>`}
      </div>
      <button type="button" class="btn primary big" data-act="exNext">${esc(t("ex.confirm"))}</button>`,
    { name: "explain", redraw: screenExplain, round: true, keepScroll: keep });
    return;
  }
  /* Ende des Spiels */
  const max = Math.max(...R.pts), winners = range(R.P.length).filter(i => R.pts[i] === max);
  const rows = R.P.map((p, i) => [p, R.pts[i], 0]).sort((a, b) => b[1] - a[1]);
  show(`<div class="center pop"><div class="e-big">🏆</div><div class="big-h">${esc(t(winners.length > 1 ? "ex.tie" : "ex.winner", { team: winners.map(i => R.P[i]).join(" & ") }))}</div></div>
    ${R.best.pts > 0 ? `<div class="award"><div class="e" aria-hidden="true">🔥</div><div><b>${esc(t("aw.exBest"))}</b><span class="n">${esc(R.P[R.best.team])}</span><small>${esc(t("aw.exBest.text", { n: R.best.pts }))}</small></div></div>` : ""}
    <div class="card" style="margin-top:16px"><h2>${esc(t("score.match"))}</h2>${scoreTable(rows)}</div>
    ${R.learn.length ? `<div class="card"><h2>📚 ${esc(t("learn.title"))} <span class="pill">${R.learn.length}</span></h2>
      <p class="muted small" style="margin-top:0">${esc(t("learn.hint"))}</p>
      <div class="chips">${R.learn.map(c => `<span class="chip static">${esc(c.w)}</span>`).join("")}</div>
      ${R.learnSaved ? `<p class="small" style="margin-bottom:0">✓ ${esc(t("learn.saved", { name: R.learnSaved }))}</p>`
        : `<button type="button" class="btn wide" style="margin-top:12px" data-act="learnSave">💾 ${esc(t("learn.save"))}</button>`}</div>` : ""}
    <button type="button" class="btn primary big" data-act="again">${esc(t("ex.newGame"))}</button>
    <button type="button" class="btn wide" data-act="home">${esc(t("aw.home"))}</button>`,
  { name: "explainEnd" });
}
function exStart() {
  unlockAudio();
  R.log = []; R.state = "running";
  exNextCard();
  const total = R.time * 1000;
  let lastSec = null;
  TIMER = new Countdown(total, {
    onTick: left => {
      const b = document.getElementById("exbar"), l = document.getElementById("exleft");
      if (b) b.style.width = (left / total * 100) + "%";
      if (l) l.textContent = fmtTime(left / 1000);
      const s = Math.ceil(left / 1000);
      if (TIMER && TIMER.running && s <= 5 && s > 0 && s !== lastSec) sfx("warn");
      lastSec = s;
    },
    onEnd: () => { TIMER = null; R.state = "review"; sfx("gong"); vibrate(400); screenExplain(); }
  });
  screenExplain();
  TIMER.start();
}
function exResult(res) {
  if (R.state !== "running" || !R.card) return;
  /* Doppeltipp nicht als zweite Karte werten */
  const now = performance.now();
  if (now - (R.lastRes || 0) < Math.min(GUARD_MS, 300)) return;
  R.lastRes = now;
  R.log.push({ w: R.card.w, f: R.card.f, res });
  sfx(res === "ok" ? "ok" : res === "taboo" ? "bad" : "tap");
  if (res !== "ok") vibrate(res === "taboo" ? 60 : 15);
  exNextCard();
  screenExplain();
}
function exConfirm() {
  const tm = exTeam(), pts = explainPoints(R.log, R.penalty);
  R.pts[tm] += pts;
  if (pts > R.best.pts) R.best = { pts, team: tm };
  /* Nachlernen: übersprungene und „verbotene“ Karten (nach der Korrektur) */
  R.log.filter(x => x.res !== "ok").forEach(x => { if (!R.learn.some(y => y.w.toLowerCase() === x.w.toLowerCase())) R.learn.push({ w: x.w, f: (x.f || []).slice() }); });
  R.turn++;
  if (R.turn >= R.P.length * R.rounds) {
    R.state = "done";
    store.remove("resume");
    coachDone("explain");
    const S = scores("teamScores");
    R.P.forEach((p, i) => { S[p] = (S[p] || 0) + R.pts[i]; });
    store.set("teamScores", S);
    sfx("fanfare");
  } else R.state = "ready";
  screenExplain();
}

/* =====================================================================
   Wort-Bombe
   ===================================================================== */
function nextBombPrompt() {
  const r = pickFresh(R.pool, x => LANG + "|" + x, store.get("used.bomb", []));
  store.set("used.bomb", r.used);
  return r.item;
}
function screenBomb(keep) {
  const st = R.state;
  let body;
  if (st === "ready") {
    body = `${coach("bomb")}<div class="card center pop"><div class="step">${esc(t("bomb.task"))}</div><div class="topic">${esc(R.prompt)}</div>
      <p>${esc(t(R.teamMode ? "bomb.textTeams" : "bomb.text"))}</p><button type="button" class="link" data-act="bombSkip">${esc(t("bomb.other"))}</button></div>
      <button type="button" class="btn primary big" data-act="bombGo">💣 ${esc(t("bomb.go"))}</button>`;
  } else if (st === "running" || st === "paused") {
    body = `<div class="center"><div class="bomb${st === "running" ? " live" : ""}" aria-hidden="true">💣</div>
      <div class="topic" aria-live="polite">${esc(R.prompt)}</div>
      ${st === "paused" ? `<p class="muted">${esc(t("bomb.paused"))}</p>` : `<p class="muted">${esc(t("bomb.pass"))}</p>`}</div>
      ${st === "paused" ? `<button type="button" class="btn primary big" data-act="bombResume">▶ ${esc(t("timer.resume"))}</button>`
        : `<button type="button" class="btn wide" data-act="bombPause">⏸ ${esc(t("timer.pause"))}</button>`}
      <button type="button" class="link" data-act="bombSkip">${esc(t("bomb.other"))}</button>`;
  } else {
    body = `<div class="center"><div class="bomb boom" aria-hidden="true">💥</div><div class="big-h">${esc(t("bomb.boom"))}</div><p>${esc(t(R.teamMode ? "bomb.whoTeam" : "bomb.who"))}</p></div>
      <div class="grid" role="radiogroup" aria-label="${esc(t("bomb.who"))}">${R.P.map((p, i) => `<button type="button" class="pbtn" role="radio" aria-checked="${R.loser === i}" data-act="bombLoser" data-v="${i}">${R.teamMode ? dot(i) : ""}${esc(p)}</button>`).join("")}</div>
      <button type="button" class="btn primary big" data-act="finish"${R.loser == null ? " disabled" : ""}>${esc(t("res.toAwards"))}</button>`;
  }
  show(topbar() + body, { name: "bomb", round: true, keepTimers: true, keepScroll: keep });
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
function screenRules(only) {
  store.set("seenRules", true);
  const one = MODES.includes(only) ? only : null;
  const sec = k => `<section class="card rules"><h2>${MODE_ICON[k]} ${esc(t("mode." + k))}</h2><ol>${t("rules." + k).split("\n").map(x => `<li>${esc(x)}</li>`).join("")}</ol>
    <p class="score-note">${esc(t("rules." + k + ".score"))}</p></section>`;
  const hold = `<section class="card rules"><h2>👆 ${esc(t("rules.hold.title"))}</h2><p style="margin:0">${esc(t("rules.hold"))}</p></section>`;
  if (one) {
    show(`${backbar(t("mode." + one))}${sec(one)}${hold}
    ${one === "imposter" ? `<button type="button" class="btn wide" data-act="demo">▶ ${esc(t("home.demo"))}</button>` : ""}
    <button type="button" class="link" data-act="rules">📖 ${esc(t("rules.all"))}</button>
    <button type="button" class="btn primary big" data-act="home">${esc(t("back"))}</button>`, { name: "rules", redraw: () => screenRules(one) });
    return;
  }
  show(`${backbar(t("home.rules"))}${MODES.map(sec).join("")}${hold}
    <section class="card rules"><h2>🏫 ${esc(t("rules.school.title"))}</h2><p style="margin:0">${esc(t("rules.school"))}</p></section>
    <button type="button" class="btn wide" data-act="demo">▶ ${esc(t("home.demo"))}</button>
    <button type="button" class="btn primary big" data-act="home">${esc(t("back"))}</button>`, { name: "rules", redraw: () => screenRules() });
}

/* =====================================================================
   Eigene Karten: Liste, Editor, Teilen, Empfangen
   ===================================================================== */
function screenLists() {
  const L = lists();
  show(`${backbar(t("lists.title"))}
    <section class="card"><p style="margin-top:0">${esc(t("lists.text"))}</p>
    ${L.length ? L.map(l => `<div class="judge"><span class="nm">✏️ ${esc(l.name)} <span class="muted">(${l.cards.length})</span></span>
      <div class="jb"><button type="button" class="btn" data-act="listShare" data-v="${esc(l.id)}">${esc(t("lists.share"))}</button>
      <button type="button" class="btn" data-act="listEdit" data-v="${esc(l.id)}">${esc(t("lists.edit"))}</button></div></div>`).join("") : `<p class="muted">${esc(t("lists.empty"))}</p>`}
    </section>
    <button type="button" class="btn primary big" data-act="listEdit" data-v="">＋ ${esc(t("lists.new"))}</button>
    <section class="card"><h2>🏫 ${esc(t("workshop.title"))}</h2><ol class="steps">${t("workshop.steps").split("\n").map(x => `<li>${esc(x)}</li>`).join("")}</ol></section>
    <section class="card"><h2>📥 ${esc(t("lists.receive"))}</h2><p class="muted small" style="margin-top:0">${esc(t("lists.receive.hint"))}</p>
      <div class="row"><button type="button" class="btn" data-act="scan">📷 ${esc(t("scan.title"))}</button>
      <button type="button" class="btn" data-act="paste">📋 ${esc(t("paste.title"))}</button></div></section>`,
  { name: "lists", redraw: screenLists });
}
function screenListEdit(id) {
  const l = lists().find(x => x.id === id);
  show(`${backbar(l ? l.name : t("lists.new"), "lists")}
    <section class="card">
      <label class="lbl" for="lName"><b>${esc(t("lists.name"))}</b></label>
      <input type="text" id="lName" maxlength="24" value="${esc(l ? l.name : "")}" placeholder="${esc(t("lists.name.ph"))}" style="margin:8px 0 14px">
      <label class="lbl" for="lWords"><b>${esc(t("lists.words"))}</b><small>${esc(t("lists.words.hint"))}</small></label>
      <textarea id="lWords" style="margin-top:8px;min-height:220px" placeholder="${esc(t("lists.words.ph"))}">${esc(l ? cardsToText(l.cards) : "")}</textarea>
      <p class="muted small" id="lCount"></p>
    </section>
    <button type="button" class="btn primary big" data-act="listSave" data-v="${esc(id || "")}">${esc(t("save"))}</button>
    ${l ? `<button type="button" class="btn danger wide" data-act="listDel" data-v="${esc(l.id)}">${esc(t("lists.delete"))}</button>` : ""}`,
  { name: "listEdit", back: "lists" });
  const ta = document.getElementById("lWords"), cnt = document.getElementById("lCount");
  const upd = () => {
    const c = parseCards(ta.value), withF = c.filter(x => x.f.length >= 3).length;
    cnt.textContent = t("lists.count", { n: c.length, f: withF });
  };
  ta.addEventListener("input", upd); upd();
}
function saveList(id) {
  const name = cleanText(document.getElementById("lName").value, 24);
  const cards = parseCards(document.getElementById("lWords").value);
  if (!name) { toast(t("lists.needName")); document.getElementById("lName").focus(); return; }
  if (cards.length < 3) { toast(t("lists.needWords", { n: 3 })); document.getElementById("lWords").focus(); return; }
  storeList(id, name, cards);
  toast(t("lists.saved"));
  screenLists();
}
/* Speichert ein Set; neue Sets werden in Hochstapler und Erklär-Modus vorgewählt */
function storeList(id, name, cards) {
  const L = lists();
  let l = L.find(x => x.id === id);
  if (l) { l.name = name; l.cards = cards; }
  else {
    l = { id: Date.now().toString(36) + rnd(1296).toString(36), name: uniqueName(name, L.map(x => x.name)), cards };
    L.push(l);
    setOpt("imp", DEF_IMP, { cats: opts("imp", DEF_IMP).cats.concat("u:" + l.id) });
    setOpt("exp", DEF_EXP, { decks: opts("exp", DEF_EXP).decks.concat("u:" + l.id) });
  }
  if (!store.set("lists", L)) { toast(t("lists.saveFail")); return null; }
  return l;
}
function deleteList(id) {
  confirmDlg(t("lists.delete.confirm"), t("lists.delete"), () => {
    store.set("lists", lists().filter(x => x.id !== id));
    setOpt("imp", DEF_IMP, { cats: opts("imp", DEF_IMP).cats.filter(c => c !== "u:" + id) });
    setOpt("exp", DEF_EXP, { decks: opts("exp", DEF_EXP).decks.filter(c => c !== "u:" + id) });
    screenLists();
  }, true);
}
/* QR-Codes eines Sets zeigen; mehrere Teile wechseln automatisch */
function screenShare(id) {
  const l = lists().find(x => x.id === id);
  if (!l) { screenLists(); return; }
  const text = encodeSet(l), parts = qrParts(text);
  let idx = 0, auto = parts.length > 1, timer = null;
  show(`${backbar(l.name, "lists")}
    <div class="center"><p class="muted small" style="margin-top:0">${esc(t("share.scanHint"))}</p>
      <div class="qrbox" id="qrbox"></div>
      <p class="big-h" id="qrpart" style="font-size:20px"></p>
      ${parts.length > 1 ? `<div class="row" style="justify-content:center"><button type="button" class="btn" id="qrPrev" aria-label="${esc(t("share.prev"))}">‹</button>
        <button type="button" class="btn" id="qrAuto"></button><button type="button" class="btn" id="qrNext" aria-label="${esc(t("share.next"))}">›</button></div>` : ""}
    </div>
    <section class="card" style="margin-top:14px"><h2>${esc(t("share.text.title"))}</h2><p class="muted small" style="margin-top:0">${esc(t("share.text.hint"))}</p>
      <button type="button" class="btn wide" data-act="shareText" data-v="${esc(l.id)}">📤 ${esc(t("share.text.btn"))}</button></section>`,
  { name: "share", back: "lists" });
  const box = document.getElementById("qrbox"), lbl = document.getElementById("qrpart");
  const draw = () => {
    box.innerHTML = "";
    box.appendChild(qrCanvas(parts[idx], Math.min(560, innerWidth - 40) * (window.devicePixelRatio > 1 ? 2 : 1)));
    lbl.textContent = parts.length > 1 ? t("share.part", { i: idx + 1, n: parts.length }) : t("share.single", { n: l.cards.length });
    const a = document.getElementById("qrAuto"); if (a) a.textContent = auto ? "⏸ " + t("share.auto") : "▶ " + t("share.auto");
  };
  const step = d => { idx = (idx + d + parts.length) % parts.length; draw(); };
  const setAuto = on => { auto = on; clearInterval(timer); if (auto) timer = setInterval(() => step(1), 2200); draw(); };
  if (parts.length > 1) {
    document.getElementById("qrPrev").onclick = () => { setAuto(false); step(-1); };
    document.getElementById("qrNext").onclick = () => { setAuto(false); step(1); };
    document.getElementById("qrAuto").onclick = () => setAuto(!auto);
  }
  setAuto(auto);
  keepAwake(true);
  leaveFns.push(() => { clearInterval(timer); if (!R) keepAwake(false); });
}
function shareText(id) {
  const l = lists().find(x => x.id === id);
  if (!l) return;
  const text = t("share.text.intro") + "\n\n" + encodeSet(l);
  const sp = window.plugins && window.plugins.socialsharing;
  if (sp) { sp.shareWithOptions({ message: text, subject: l.name }, () => {}, () => copyText(text)); return; }
  copyText(text);
}
/* Empfangen: Vorschau, dann speichern */
/* Karten an ein Set anhängen; gleiche Begriffe werden nicht doppelt aufgenommen */
function mergeCards(into, add) {
  const have = new Set(into.map(c => c.w.toLowerCase()));
  let n = 0;
  add.forEach(c => { if (!have.has(c.w.toLowerCase()) && into.length < CARD_MAX) { have.add(c.w.toLowerCase()); into.push(c); n++; } });
  return n;
}
function offerImport(set) {
  const sample = set.cards.slice(0, 4).map(c => esc(c.w)).join(", ");
  const withF = set.cards.filter(c => c.f.length >= 3).length;
  const L = lists();
  /* Klassen-Werkstatt: Karten mehrerer Gruppen in einer Liste sammeln */
  const target = L.length ? `<label class="lbl" for="impTarget"><b>${esc(t("import.target"))}</b></label>
    <select id="impTarget" class="sel"><option value="">${esc(t("import.asNew"))}</option>${L.map(l => `<option value="${esc(l.id)}">${esc(t("import.addTo", { name: l.name }))}</option>`).join("")}</select>` : "";
  dialog(t("import.title"), `<p><b>${esc(set.name)}</b> · ${esc(t("lists.count", { n: set.cards.length, f: withF }))}</p><p class="muted small">${sample}${set.cards.length > 4 ? " …" : ""}</p>${target}`, [
    { label: t("cancel") },
    { label: t("import.save"), primary: true, action: () => {
      const sel = document.getElementById("impTarget"), id = sel ? sel.value : "";
      if (id) {
        const all = lists(), l = all.find(x => x.id === id);
        if (!l) return false;
        const n = mergeCards(l.cards, set.cards);
        if (!store.set("lists", all)) { toast(t("lists.saveFail")); return false; }
        toast(t("import.merged", { n, name: l.name }));
      } else {
        if (!storeList(null, set.name, set.cards)) return false;
        toast(t("lists.saved"));
      }
      SCAN = partCollector();
      screenLists();
    } }
  ]);
}
function screenPaste() {
  show(`${backbar(t("paste.title"), "lists")}
    <section class="card"><p style="margin-top:0">${esc(t("paste.text"))}</p>
      <textarea id="pasteIn" style="min-height:200px" placeholder="${esc(SHARE_HEAD)}"></textarea>
      <p class="err" id="pasteErr"></p></section>
    <button type="button" class="btn primary big" data-act="pasteGo">${esc(t("paste.go"))}</button>`, { name: "paste", back: "lists" });
}
function pasteImport() {
  const set = decodeSet(document.getElementById("pasteIn").value);
  if (!set) { document.getElementById("pasteErr").textContent = t("paste.bad"); return; }
  offerImport(set);
}

/* ---------- Kamera-Scanner ----------
   Kamerabild im WebView, Erkennung mit jsQR auf dem Gerät (wie MatheSnack).
   Kein Bild verlässt das Gerät. Fallback: Foto aufnehmen oder Text einfügen. */
async function androidCameraPermission() {
  const p = window.cordova && window.cordova.plugins && window.cordova.plugins.permissions;
  if (platformId() !== "android" || !p) return true;
  return new Promise(resolve => {
    p.checkPermission(p.CAMERA, st => {
      if (st.hasPermission) { resolve(true); return; }
      p.requestPermission(p.CAMERA, r2 => resolve(!!r2.hasPermission), () => resolve(false));
    }, () => resolve(false));
  });
}
let SCAN = null;   // Sammler der aktuellen Scan-Sitzung
function handleScanned(text, status) {
  const p = parseQrPart(text);
  if (!p) { if (status) status.textContent = t("scan.notOurs"); return false; }
  const full = SCAN.add(p);
  const pr = SCAN.progress();
  if (status) status.textContent = pr.n > 1 ? t("scan.progress", { have: pr.have, n: pr.n }) : "";
  if (full == null) { vibrate(20); return false; }
  const set = decodeSet(full);
  if (!set) { if (status) status.textContent = t("scan.notOurs"); return false; }
  vibrate(40); sfx("ok");
  offerImport(set);
  return true;
}
function screenScan() {
  SCAN = partCollector();
  show(`${backbar(t("scan.title"), "lists")}
    <div class="scanner"><div class="scanframe" id="scanFrame"><video id="scanVideo" playsinline muted autoplay class="scanvideo"></video><div class="scanbox" aria-hidden="true"></div></div>
      <p class="msg" id="scanStatus" role="status">${esc(t("scan.starting"))}</p>
      <div class="row" style="justify-content:center"><label class="btn" for="scanFile">📸 ${esc(t("scan.photo"))}</label>
        <input type="file" id="scanFile" accept="image/*" capture="environment" class="vh">
        <button type="button" class="btn" data-act="paste">📋 ${esc(t("paste.title"))}</button></div>
      <p class="muted small center">${esc(t("scan.tip"))}</p></div>`, { name: "scan", back: "lists" });
  const video = document.getElementById("scanVideo"), status = document.getElementById("scanStatus"), frame = document.getElementById("scanFrame"), fileIn = document.getElementById("scanFile");
  let stream = null, raf = 0, stopped = false;
  const cv = document.createElement("canvas");
  const cx = cv.getContext("2d", { willReadFrequently: true });
  const stop = () => { stopped = true; cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach(tr => tr.stop()); stream = null; };
  leaveFns.push(stop);
  let last = "";
  const scanFrame = () => {
    if (stopped) return;
    if (video.readyState >= 2 && video.videoWidth) {
      const sc = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
      cv.width = Math.round(video.videoWidth * sc); cv.height = Math.round(video.videoHeight * sc);
      cx.drawImage(video, 0, 0, cv.width, cv.height);
      const img = cx.getImageData(0, 0, cv.width, cv.height);
      const res = window.jsQR ? jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" }) : null;
      if (res && res.data && res.data !== last) {
        last = res.data;
        if (handleScanned(res.data, status)) { stop(); return; }
      }
    }
    raf = requestAnimationFrame(scanFrame);
  };
  (async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { status.textContent = t("scan.noLive"); frame.hidden = true; return; }
    if (!(await androidCameraPermission())) { status.textContent = t("scan.denied"); frame.hidden = true; return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false });
      if (stopped) { stop(); return; }
      video.srcObject = stream;
      await video.play().catch(() => {});
      status.textContent = t("scan.hold");
      raf = requestAnimationFrame(scanFrame);
    } catch (e) { status.textContent = t("scan.failed"); frame.hidden = true; }
  })();
  fileIn.addEventListener("change", () => {
    const f = fileIn.files && fileIn.files[0];
    if (!f) return;
    const img = new Image(), url = URL.createObjectURL(f);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let found = null;
      for (const max of [1000, 1600, 700]) {
        const sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        cv.width = Math.round(img.naturalWidth * sc); cv.height = Math.round(img.naturalHeight * sc);
        cx.drawImage(img, 0, 0, cv.width, cv.height);
        const d = cx.getImageData(0, 0, cv.width, cv.height);
        const res = window.jsQR ? jsQR(d.data, d.width, d.height) : null;
        if (res && res.data) { found = res.data; break; }
      }
      fileIn.value = "";
      if (found) { if (handleScanned(found, status)) stop(); }
      else status.textContent = t("scan.noneInPhoto");
    };
    img.onerror = () => { status.textContent = t("scan.noneInPhoto"); };
    img.src = url;
  });
}

/* =====================================================================
   Einstellungen
   ===================================================================== */
const APP_STORE_ID = "";                 // nach dem Anlegen in App Store Connect eintragen (nur Ziffern)
const PLAY_ID = "de.sneakplay.app";
const FEEDBACK_MAIL = "smaehlmann.appdev@gmail.com";
/* Bewerten/Weiterempfehlen: jede Fassung verweist nur auf ihren eigenen
   Store, im Browser gibt es keinen Store-Knopf. Keine eigene
   Bewertungs-Abfrage – nur Knöpfe in den Einstellungen. Im Schulmodus aus. */
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
    sp.shareWithOptions({ message: t("share.app"), subject: "SneakPlay", url }, () => {}, () => copyText(url));
    return;
  }
  copyText(url);
}
function copyText(text) {
  try { navigator.clipboard.writeText(text).then(() => toast(t("share.copied")), () => toast(t("share.copyFail"), 4000)); }
  catch (e) { toast(t("share.copyFail"), 4000); }
}
function screenSettings(keep) {
  const theme = store.get("theme", "auto"), sch = school();
  const rate = rateHref(), share = storeUrl();
  show(`${backbar(t("set.title"))}
    <section class="card"><h2>${esc(t("set.language"))}</h2>${langSwitch()}</section>
    <section class="card"><h2>${esc(t("set.look"))}</h2>
      <div class="opt col"><div class="lbl"><b>${esc(t("set.theme"))}</b></div>${seg(t("set.theme"), [["auto", t("set.theme.auto")], ["light", t("set.theme.light")], ["dark", t("set.theme.dark")]], theme, "theme")}</div>
      <div class="opt col"><div class="lbl"><b>${esc(t("set.font"))}</b><small>${esc(t("set.font.hint"))}</small></div>${seg(t("set.font"), [[1, t("set.font.1")], [1.12, t("set.font.2")], [1.25, t("set.font.3")]], Number(store.get("fontScale", 1)), "fontScale")}</div>
      <div class="opt"><div class="lbl"><b>${esc(t("coach.reset"))}</b><small>${esc(t("coach.reset.hint"))}</small></div><button type="button" class="btn" data-act="coachReset">↺</button></div>
    </section>
    <section class="card"><h2>${esc(t("set.feedback"))}</h2>
      <div class="opt"><div class="lbl"><b>${esc(t("set.sound"))}</b></div>${sw(t("set.sound"), store.get("sound", true), "sound")}</div>
      <div class="opt"><div class="lbl"><b>${esc(t("set.vibrate"))}</b><small>${esc(t("set.vibrate.hint"))}</small></div>${sw(t("set.vibrate"), store.get("vibrate", true), "vibrate")}</div>
      <div class="opt"><div class="lbl"><b>${esc(t("set.awake"))}</b><small>${esc(t("set.awake.hint"))}</small></div>${sw(t("set.awake"), store.get("awake", true), "awake")}</div>
    </section>
    <section class="card"><h2>⭐ ${esc(t("pro.title"))}</h2>
      ${isPro() ? `<p style="margin:0">✓ ${esc(t("pro.active"))}</p>`
        : `<p class="muted small" style="margin-top:0">${esc(t("pro.settingsHint", { m: TRIALS }))}</p><button type="button" class="btn primary wide" data-act="paywall">${esc(t("pro.show"))}</button>`}
      ${isPro() ? "" : `<button type="button" class="link" data-act="restore">${esc(t("pro.restore"))}</button>`}
    </section>
    <section class="card"><h2>🏫 ${esc(t("school.title"))}</h2><p class="muted small" style="margin-top:0">${esc(t("school.hint"))}</p>
      <button type="button" class="btn${sch ? " primary" : ""} wide" data-act="${sch ? "schoolOff" : "schoolOn"}">${esc(t(sch ? "school.off" : "school.on"))}</button></section>
    <section class="card"><h2>${esc(t("set.data"))}</h2><p class="muted small" style="margin-top:0">${esc(t("set.data.hint"))}</p>
      <div class="row"><button type="button" class="btn" data-act="resetScores">${esc(t("score.reset"))}</button>
      <button type="button" class="btn" data-act="resetUsed">${esc(t("set.resetUsed"))}</button>
      ${sch ? "" : `<button type="button" class="btn danger" data-act="wipe">${esc(t("set.wipe"))}</button>`}</div>
    </section>
    ${sch ? "" : `<section class="card"><h2>${esc(t("set.support"))}</h2><p class="muted small" style="margin-top:0">${esc(t("set.support.hint"))}</p>
      <div class="row">${rate ? `<a class="btn primary" id="btnRate" href="${esc(rate)}">⭐ ${esc(t("set.rate"))}</a>` : ""}
      ${share ? `<button type="button" class="btn" data-act="recommend">${esc(t("set.recommend"))}</button>` : ""}
      <a class="btn" id="btnMail" href="${esc(feedbackHref())}">✉️ ${esc(t("set.mail"))}</a></div>
      <p class="muted small">${esc(t("set.mail.addr", { mail: FEEDBACK_MAIL }))}</p>
    </section>`}
    <section class="card"><h2>${esc(t("set.about"))}</h2><p class="small" style="margin-top:0">${esc(t("set.about.text"))}</p>
      <p class="small"><a href="${legalUrl("datenschutz")}">${esc(t("legal.privacy"))}</a> · <a href="${legalUrl("impressum")}">${esc(t("legal.imprint"))}</a> · <a href="${legalUrl("lizenzen")}">${esc(t("legal.licenses"))}</a></p>
      <p class="muted small" style="margin-bottom:0">${esc(t("set.version", { v: APP_VERSION }))}</p>
    </section>`, { name: "settings", redraw: screenSettings, keepScroll: keep });
}
function schoolOn() {
  pinDlg(t("school.on"), t("school.setPin"), pin => {
    if (!/^\d{4,6}$/.test(pin)) { toast(t("school.pinRule")); return false; }
    store.set("schoolPin", pin); store.set("school", true);
    toast(t("school.activeToast"));
    screenSettings(true);
  });
}
function schoolOff() {
  pinDlg(t("school.off"), t("school.askPin"), pin => {
    if (pin !== String(store.get("schoolPin", ""))) { toast(t("school.wrongPin")); vibrate(80); return false; }
    store.set("school", false);
    screenSettings(true);
  });
}
function wipeAll() {
  if (school()) return;
  confirmDlg(t("set.wipe.confirm"), t("set.wipe"), () => {
    /* Kauf und verbrauchte Testrunden bleiben erhalten */
    store.keys().filter(k => !/^(pro|trial\.)/.test(k)).forEach(k => store.remove(k));
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
function toggleIn(list, v) { return list.includes(v) ? list.filter(c => c !== v) : list.concat(v); }
function abortRound() {
  confirmDlg(t("round.end.confirm"), t("round.end"), () => { goHome(); }, true);
}
const ROUND_ACTS = ["next", "ttoggle", "tovote", "accuse", "reveal", "secretOpen", "secretSel", "secretCast", "showWord", "judge", "mopen", "mres", "finish",
  "bombGo", "bombPause", "bombResume", "bombSkip", "bombLoser", "abort", "exGo", "exRes", "exPause", "exResume", "exFix", "exNext"];
const ACT = {
  lang: v => { if (v === LANG) return; setLang(v); store.set("lang", v); redraw(); },
  settings: () => screenSettings(),
  rules: () => screenRules(),
  rulesFor: v => screenRules(v),
  home: () => goHome(),
  quick: () => { store.set("players", range(4).map(i => t("players.default", { n: i + 1 }))); screenHome(true); },
  rename: v => renameIn("players", players(), +v, "scores"),
  pup: v => { const P = players(), i = +v; if (i > 0 && P[i]) { [P[i - 1], P[i]] = [P[i], P[i - 1]]; store.set("players", P); screenHome(true); } },
  prm: v => { const P = players(); P.splice(+v, 1); store.set("players", P); screenHome(true); },
  trename: v => renameIn("teams", teams(), +v, "teamScores"),
  trm: v => { const T = teams(); if (T.length > MIN_TEAMS) { T.splice(+v, 1); store.set("teams", T); } screenHome(true); },
  tadd: () => { const T = teams(); if (T.length < MAX_TEAMS) { T.push(uniqueName(t("team.default." + T.length), T)); store.set("teams", T); } screenHome(true); },
  mode: v => { if (MODES.includes(v)) { store.set("mode", v); screenHome(true); } },
  cat: v => { setOpt("imp", DEF_IMP, { cats: toggleIn(opts("imp", DEF_IMP).cats, v) }); screenHome(true); },
  deck: v => { setOpt("exp", DEF_EXP, { decks: toggleIn(opts("exp", DEF_EXP).decks, v) }); screenHome(true); },
  level: v => { store.set("level", +v); screenHome(true); },
  imps: v => { setOpt("imp", DEF_IMP, { imps: +v }); screenHome(true); },
  clueless: () => { setOpt("imp", DEF_IMP, { clueless: !opts("imp", DEF_IMP).clueless }); screenHome(true); },
  hint: v => { if (["cat", "similar", "none"].includes(v)) setOpt("imp", DEF_IMP, { hint: v }); screenHome(true); },
  impTimer: v => { setOpt("imp", DEF_IMP, { timer: +v }); screenHome(true); },
  impVote: v => { setOpt("imp", DEF_IMP, { vote: v }); screenHome(true); },
  misTimer: v => { setOpt("mis", DEF_MIS, { timer: +v }); screenHome(true); },
  misVote: v => { setOpt("mis", DEF_MIS, { vote: v }); screenHome(true); },
  exTime: v => { setOpt("exp", DEF_EXP, { time: +v }); screenHome(true); },
  exRounds: v => { setOpt("exp", DEF_EXP, { rounds: +v }); screenHome(true); },
  penalty: () => { setOpt("exp", DEF_EXP, { penalty: !opts("exp", DEF_EXP).penalty }); screenHome(true); },
  fuse: v => { setOpt("bomb", DEF_BOMB, { len: v }); screenHome(true); },
  bombSrc: v => { setOpt("bomb", DEF_BOMB, { src: v }); screenHome(true); },
  bombTeams: () => { setOpt("bomb", DEF_BOMB, { teams: !opts("bomb", DEF_BOMB).teams }); screenHome(true); },
  start: () => startRound(),
  resetScores: () => confirmDlg(t("score.reset.confirm"), t("score.reset"), () => { store.set("scores", {}); store.set("teamScores", {}); toast(t("score.reset.done")); redraw(); }),
  resetUsed: () => { ["used.imp", "used.topics", "used.missions", "used.bomb", "used.explain"].forEach(k => store.remove(k)); toast(t("set.resetUsed.done")); },
  wipe: () => wipeAll(),
  theme: v => { store.set("theme", v); applyTheme(); screenSettings(true); },
  sound: () => { if (toggleStore("sound", true)) { unlockAudio(); sfx("ok"); } screenSettings(true); },
  vibrate: () => { if (toggleStore("vibrate", true)) vibrate(40); screenSettings(true); },
  awake: () => { toggleStore("awake", true); screenSettings(true); },
  schoolOn: () => schoolOn(),
  demo: () => {
    if (players().length < 3) store.set("players", range(4).map(i => t("players.default", { n: i + 1 })));
    store.set("mode", "imposter");
    const c = store.get("coach", {}) || {}; delete c.imposter; store.set("coach", c);
    startRound();
  },
  coachReset: () => { store.remove("coach"); toast(t("coach.reset.done")); },
  fontScale: v => { store.set("fontScale", +v); applyFontScale(); screenSettings(true); },
  paywall: () => screenPaywall(null),
  restore: () => restorePro(),
  schoolOff: () => schoolOff(),
  recommend: () => recommendApp(),
  lists: () => screenLists(),
  listEdit: v => screenListEdit(v || null),
  listSave: v => saveList(v || null),
  listDel: v => deleteList(v),
  listShare: v => screenShare(v),
  shareText: v => shareText(v),
  scan: () => screenScan(),
  paste: () => screenPaste(),
  pasteGo: () => pasteImport(),
  /* Runde */
  abort: () => abortRound(),
  next: () => { R.step++; if (R.step < R.P.length) screenPass(); else screenPlay(); },
  ttoggle: () => toggleTimer(),
  tovote: () => startVote(),
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
  bombLoser: v => { R.loser = +v; screenBomb(true); },
  exGo: () => exStart(),
  exRes: v => exResult(v),
  exPause: () => { if (TIMER && TIMER.running) { TIMER.pause(); R.state = "paused"; screenExplain(); } },
  exResume: () => { if (TIMER) { R.state = "running"; screenExplain(); TIMER.start(); } },
  exFix: v => { const [i, x] = v.split(":"); if (R.log[+i] && ["ok", "taboo", "skip"].includes(x)) R.log[+i].res = x; screenExplain(true); },
  exNext: () => exConfirm(),
  learnSave: () => {
    if (!R || !R.learn || !R.learn.length || R.learnSaved) return;
    const d = new Date(), name = t("learn.listName", { date: d.getDate() + "." + (d.getMonth() + 1) + "." });
    const l = storeList(null, name, R.learn);
    if (l) { R.learnSaved = l.name; toast(t("lists.saved")); screenExplain(true); }
  },
};
view.addEventListener("click", e => {
  const b = e.target.closest("[data-act]");
  if (!b || b.disabled || !view.contains(b)) return;
  const f = ACT[b.dataset.act];
  if (!f) return;
  /* Runden-Aktionen ohne Runde (z. B. doppelter Tipp nach dem Ende) ignorieren */
  if (!R && ROUND_ACTS.includes(b.dataset.act)) return;
  e.preventDefault();
  if (GUARDED.includes(b.dataset.act) && performance.now() - shownAt < GUARD_MS) return;
  f(b.dataset.v, b);
});

/* =====================================================================
   Lebenszyklus
   ===================================================================== */
function onHidden() {
  if (holdOff) holdOff();
  if (R && current.round) saveRound();
  if (R && R.mode === "explain" && TIMER && TIMER.running) { TIMER.pause(); R.state = "paused"; screenExplain(); }
  else if (TIMER && TIMER.running) { TIMER.pause(); const b = document.getElementById("tbtn"); if (b) b.textContent = "▶ " + t("timer.resume"); }
  if (BOMB && BOMB.cd.running) bombPause();
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") onHidden();
  else if (wantAwake) keepAwake(true);
});
document.addEventListener("pause", onHidden, false);         // Cordova: App geht in den Hintergrund
window.addEventListener("blur", () => { if (holdOff) holdOff(); });
/* Zurück-Taste (Android): erst zurück zur Startseite, dort nur nach
   zweitem Druck innerhalb von 2 Sekunden beenden – ein versehentlicher
   Druck schließt die App nicht. */
let backArmed = 0;
function onBackButton(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!dlgEl.hidden) { closeDialog(); return; }
  if (current.round) { abortRound(); return; }
  if (current.back === "lists") { screenLists(); return; }
  if (current.name !== "home") { goHome(); return; }
  const now = Date.now();
  if (now - backArmed < 2000) {
    if (navigator.app && navigator.app.exitApp) navigator.app.exitApp();
    return;
  }
  backArmed = now;
  toast(t("back.again"), 2000);
}
document.addEventListener("backbutton", onBackButton, false);
document.addEventListener("deviceready", () => { document.addEventListener("backbutton", onBackButton, false); applyStatusBar(); initShop(); }, false);
if (window.matchMedia) {
  try { matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => { applyStatusBar(); if (current.name === "settings") screenSettings(true); }); } catch (e) { /* alt */ }
}

/* ---------- Start ---------- */
setLang(store.get("lang", null) || detectLang());
applyTheme();
applyFontScale();
screenHome();
offerResume();
