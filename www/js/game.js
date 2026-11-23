/* SneakPlay – Spiellogik ohne Oberfläche
   Rollen verteilen, Begriffe ohne Wiederholung ziehen, Stimmen auszählen,
   Punkte und Auszeichnungen berechnen. validate.js lädt diese Datei in einer
   Sandbox und prüft sie mit vielen Zufallsrunden. */
"use strict";

const MODES = ["imposter", "missions", "explain", "bomb"];
const MODE_ICON = { imposter: "🎭", missions: "🎯", explain: "🗣️", bomb: "💣" };
const MIN_PLAYERS = { imposter: 3, missions: 3, explain: 0, bomb: 2 };
const MIN_TWO_IMPOSTERS = 6;
const MIN_CLUELESS = 5;
const USED_MAX = 600;
const BOMB_LEN = { short: [15, 30], mid: [25, 50], long: [40, 75] };

/* Hochstapler: k Hochstapler, auf Wunsch ein Ahnungsloser, Rest Crew.
   Wer anfängt, ist immer aus der Crew – sonst müsste der Hochstapler als
   Erster ohne jeden Hinweis ein Wort nennen. */
function assignImposter(n, opt) {
  const k = opt.imps === 2 && n >= MIN_TWO_IMPOSTERS ? 2 : 1;
  const idx = shuffle(range(n));
  const role = Array(n).fill("crew");
  idx.slice(0, k).forEach(i => { role[i] = "imp"; });
  if (opt.clueless && n >= MIN_CLUELESS) role[idx[k]] = "clue";
  const crew = range(n).filter(i => role[i] === "crew");
  return { role, starter: pick(crew) };
}

/* Zieht ein Element, das zuletzt nicht dran war. used: Schlüssel, neueste
   hinten. Ist der Vorrat erschöpft, beginnt er für diesen Vorrat von vorn. */
function pickFresh(pool, keyOf, used) {
  let list = Array.isArray(used) ? used.slice() : [];
  const usedSet = new Set(list);
  let fresh = pool.filter(x => !usedSet.has(keyOf(x)));
  if (!fresh.length) {
    const poolKeys = new Set(pool.map(keyOf));
    list = list.filter(k => !poolKeys.has(k));
    fresh = pool;
  }
  const item = pick(fresh);
  list.push(keyOf(item));
  return { item, used: list.slice(-USED_MAX) };
}
function pickManyFresh(pool, keyOf, used, count) {
  const items = [];
  let list = used;
  for (let i = 0; i < count; i++) {
    const rest = pool.filter(x => !items.includes(x));
    const r = pickFresh(rest.length ? rest : pool, keyOf, list);
    items.push(r.item); list = r.used;
  }
  return { items, used: list };
}

/* Stimmen auszählen: votes[i] = Index der verdächtigten Person (oder null) */
function tally(votes, n) {
  const counts = Array(n).fill(0);
  votes.forEach(v => { if (Number.isInteger(v) && v >= 0 && v < n) counts[v]++; });
  const max = Math.max(0, ...counts);
  const top = max > 0 ? range(n).filter(i => counts[i] === max) : [];
  return { counts, top };
}

/* Wertung Hochstapler
   st: { role[], accused, judged{index: true|false}, votes[]|null }
   Hochstapler entlarvt → alle anderen +1 · Hochstapler unentdeckt → +2
   entlarvt, aber Begriff erraten → +3 für ihn, die anderen gehen leer aus
   zweiter Hochstapler unentdeckt → +2 · Ahnungsloser rät richtig → +2 */
function scoreImposter(st) {
  const n = st.role.length, d = Array(n).fill(0), aw = [];
  const a = st.accused, caught = st.role[a] === "imp";
  const imps = range(n).filter(i => st.role[i] === "imp");
  const clue = st.role.indexOf("clue");
  if (caught) {
    if (st.judged[a] === true) { d[a] += 3; aw.push({ icon: "🛟", key: "rescue", who: [a] }); }
    else { range(n).forEach(i => { if (st.role[i] !== "imp") d[i] += 1; }); aw.push({ icon: "🔍", key: "sleuths", who: null }); }
    imps.filter(i => i !== a).forEach(i => { d[i] += 2; aw.push({ icon: "🌑", key: "shadow", who: [i] }); });
  } else {
    imps.forEach(i => { d[i] += 2; });
    aw.push({ icon: "🃏", key: "bluffer", who: imps });
    aw.push({ icon: "👀", key: "suspect", who: [a] });
  }
  if (clue >= 0) {
    if (st.judged[clue] === true) { d[clue] += 2; aw.push({ icon: "🔮", key: "mindreader", who: [clue] }); }
    else aw.push({ icon: "🤷", key: "clueless", who: [clue] });
  }
  if (Array.isArray(st.votes)) {
    const sharp = range(n).filter(i => st.role[i] !== "imp" && st.role[st.votes[i]] === "imp");
    if (sharp.length) aw.push({ icon: "🎯", key: "sharp", who: sharp });
  }
  return { delta: d, awards: aw };
}

/* Wertung Geheime Missionen
   st: { n, none, accused, res{index: "ok"|"seen"|"fail"}, votes[]|null }
   Missionsloser enttarnt → alle anderen +1 · nicht enttarnt → +2 für ihn
   Mission unbemerkt → +2 · Mission erraten → je +1 für beide */
function scoreMissions(st) {
  const n = st.n, d = Array(n).fill(0), aw = [];
  const holders = range(n).filter(i => i !== st.none);
  const found = st.accused === st.none;
  if (found) { holders.forEach(i => { d[i] += 1; }); aw.push({ icon: "🔍", key: "sleuthsM", who: null }); }
  else {
    d[st.none] += 2;
    aw.push({ icon: "😐", key: "pokerface", who: [st.none] });
    aw.push({ icon: "👀", key: "suspectM", who: [st.accused] });
  }
  const ok = holders.filter(i => st.res[i] === "ok");
  const seen = holders.filter(i => st.res[i] === "seen");
  const fail = holders.filter(i => st.res[i] === "fail");
  ok.forEach(i => { d[i] += 2; });
  seen.forEach(i => { d[i] += 1; d[st.none] += 1; });
  if (ok.length) aw.push({ icon: "🕶️", key: "agent", who: ok });
  if (seen.length >= 2) aw.push({ icon: "🧠", key: "observer", who: [st.none], n: seen.length });
  if (fail.length) aw.push({ icon: "🙈", key: "impossible", who: fail });
  if (Array.isArray(st.votes)) {
    const sharp = holders.filter(i => st.votes[i] === st.none);
    if (sharp.length) aw.push({ icon: "🎯", key: "sharpM", who: sharp });
  }
  return { delta: d, awards: aw };
}

/* Wertung Wort-Bombe: alle außer der Person mit der Bombe +1 */
function scoreBomb(n, loser) {  // n Spieler oder Teams
  const d = range(n).map(i => (i === loser ? 0 : 1));
  return { delta: d, awards: [{ icon: "💥", key: "boom", who: [loser] }, { icon: "😎", key: "survivors", who: range(n).filter(i => i !== loser) }] };
}

/* Wort-Bombe: Dauer in ms (verdeckt) und Abstand der Ticks (wird schneller) */
function bombDuration(len) {
  const [a, b] = BOMB_LEN[len] || BOMB_LEN.mid;
  return randBetween(a, b) * 1000;
}
function tickInterval(frac) {
  const f = Math.min(1, Math.max(0, frac));
  return Math.max(150, Math.round(900 - 750 * Math.pow(f, 1.4)));
}

/* Namen eindeutig machen: „Anna“, „Anna 2“, … */
function uniqueName(name, taken) {
  let v = name, k = 2;
  while (taken.includes(v)) v = name.slice(0, MAX_NAME - 3) + " " + k++;
  return v;
}

/* Eigene Begriffe: Komma, Semikolon oder Zeilenumbruch trennen; doppelte raus */
function parseWords(text) {
  const seen = new Set(), out = [];
  String(text || "").split(/[\n,;]+/).forEach(w => {
    const c = cleanText(w, 40);
    const k = c.toLowerCase();
    if (c && !seen.has(k)) { seen.add(k); out.push(c); }
  });
  return out.slice(0, 300);
}

/* =====================================================================
   Teams, Niveau, ähnlicher Begriff
   ===================================================================== */
const TEAM_COLORS = ["#FF5D8F", "#6EA8FF", "#3DDC97", "#FFD25D"];
const MIN_TEAMS = 2, MAX_TEAMS = 4;
function levelOk(lv, max) { return (lv || 1) <= (max || 3); }

/* Begriff für den Hochstapler in der Variante „Ähnlicher Begriff“:
   der hinterlegte verwandte Begriff, sonst ein anderer aus derselben Kategorie */
function similarFor(item, pool) {
  if (item.near && item.near.length) return pick(item.near);      // Zahlen-Hochstapler
  if (item.s && item.s.toLowerCase() !== item.word.toLowerCase()) return item.s;
  const same = pool.filter(x => x.cat === item.cat && x.word.toLowerCase() !== item.word.toLowerCase());
  return same.length ? pick(same).word : "";
}

/* Erklär-Modus: Punkte eines Durchgangs. res: "ok" | "taboo" | "skip" */
function explainPoints(log, penalty) {
  return log.reduce((s, x) => s + (x.res === "ok" ? 1 : x.res === "taboo" && penalty ? -1 : 0), 0);
}

/* =====================================================================
   Eigene Karten: Eingabe, Text- und QR-Austausch (ohne Server)
   ===================================================================== */
const CARD_MAX = 300, FORBID_MAX = 6;
function cleanField(s, max) { return cleanText(String(s == null ? "" : s).replace(/[|]/g, "/"), max); }

/* Pro Zeile „Begriff“ oder „Begriff: verboten, verboten, …“.
   Zeilen ohne Doppelpunkt dürfen mehrere Begriffe mit Komma enthalten. */
function parseCards(text) {
  const seen = new Set(), out = [];
  const add = (w, f) => {
    const c = cleanField(w, 40), k = c.toLowerCase();
    if (!c || seen.has(k) || out.length >= CARD_MAX) return;
    seen.add(k);
    const fs = [], fk = new Set([k]);
    (f || []).forEach(x => { const v = cleanField(x, 30), vk = v.toLowerCase(); if (v && !fk.has(vk) && fs.length < FORBID_MAX) { fk.add(vk); fs.push(v); } });
    out.push({ w: c, f: fs });
  };
  String(text || "").split(/\r?\n/).forEach(line => {
    const i = line.indexOf(":");
    if (i > 0) add(line.slice(0, i), line.slice(i + 1).split(/[,;]/));
    else line.split(/[,;]/).forEach(w => add(w));
  });
  return out;
}
function cardsToText(cards) { return cards.map(c => c.f.length ? c.w + ": " + c.f.join(", ") : c.w).join("\n"); }

const SHARE_HEAD = "SneakPlay-Karten v1";
function encodeSet(set) {
  return [SHARE_HEAD, cleanField(set.name, 24)].concat(set.cards.map(c => [c.w].concat(c.f).map(x => cleanField(x, 40)).join("|"))).join("\n");
}
/* Liefert {name, cards} oder null. Toleriert Text drumherum (z. B. aus einem Messenger). */
function decodeSet(text) {
  const s = String(text || "").replace(/\r/g, "");
  const i = s.indexOf(SHARE_HEAD);
  if (i < 0) return null;
  const lines = s.slice(i).split("\n");
  const name = cleanField(lines[1] || "", 24);
  const seen = new Set(), cards = [];
  for (const ln of lines.slice(2)) {
    const parts = ln.split("|").map(x => cleanField(x, 40));
    const w = parts[0], k = (w || "").toLowerCase();
    if (!w || seen.has(k)) continue;
    seen.add(k);
    cards.push({ w, f: parts.slice(1).map(x => x.slice(0, 30)).filter(x => x && x.toLowerCase() !== k).slice(0, FORBID_MAX) });
    if (cards.length >= CARD_MAX) break;
  }
  return name && cards.length >= 3 ? { name, cards } : null;
}

/* Große Sets passen nicht in einen gut lesbaren QR-Code: in Teile zerlegen.
   Jeder Teil: SPQ|kennung|nr|anzahl|daten */
const QR_PART_BYTES = 560;
function utf8Len(s) { return new TextEncoder().encode(s).length; }
function qrParts(text) {
  const chunks = [];
  let cur = "", curLen = 0;
  for (const ch of text) {
    const l = utf8Len(ch);
    if (curLen + l > QR_PART_BYTES) { chunks.push(cur); cur = ""; curLen = 0; }
    cur += ch; curLen += l;
  }
  if (cur || !chunks.length) chunks.push(cur);
  const id = range(4).map(() => "0123456789abcdefghijklmnopqrstuvwxyz"[rnd(36)]).join("");
  return chunks.map((c, i) => `SPQ|${id}|${i + 1}|${chunks.length}|${c}`);
}
function parseQrPart(s) {
  const m = /^SPQ\|([0-9a-z]{4})\|(\d{1,2})\|(\d{1,2})\|([\s\S]*)$/.exec(String(s || ""));
  if (!m) return null;
  const i = +m[2], n = +m[3];
  return i >= 1 && n >= 1 && i <= n && n <= 40 ? { id: m[1], i, n, data: m[4] } : null;
}
/* Sammler für gescannte Teile; liefert den Gesamttext, sobald alle da sind */
function partCollector() {
  let id = null, n = 0, got = {};
  return {
    add(p) {
      if (p.id !== id) { id = p.id; n = p.n; got = {}; }
      got[p.i] = p.data;
      return this.done() ? range(n).map(k => got[k + 1]).join("") : null;
    },
    done() { return n > 0 && range(n).every(k => got[k + 1] != null); },
    progress() { return { have: Object.keys(got).length, n }; }
  };
}
