/* SneakPlay – Spiellogik ohne Oberfläche
   Rollen verteilen, Begriffe ohne Wiederholung ziehen, Stimmen auszählen,
   Punkte und Auszeichnungen berechnen. validate.js lädt diese Datei in einer
   Sandbox und prüft sie mit vielen Zufallsrunden. */
"use strict";

const MODES = ["imposter", "missions", "bomb"];
const MODE_ICON = { imposter: "🎭", missions: "🎯", bomb: "💣" };
const MIN_PLAYERS = { imposter: 3, missions: 3, bomb: 2 };
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
function scoreBomb(n, loser) {
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
