/* SneakPlay – Kern: Version, Speicher, Zufall, Töne, Vibration, Wachhalten, Timer
   Alles läuft auf dem Gerät. Kein Server, keine Konten, keine Analyse. */
"use strict";

const APP_VERSION = "1.0.0";
const MAX_PLAYERS = 16;
const MAX_NAME = 16;

function inApp() { return !!window.cordova; }
function platformId() { return (window.cordova && window.cordova.platformId) || ""; }

/* ---------- Lokaler Speicher (nur auf diesem Gerät) ---------- */
const PREFIX = "sneakplay.";
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(PREFIX + key); return v == null ? fallback : JSON.parse(v); }
    catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  },
  remove(key) { try { localStorage.removeItem(PREFIX + key); } catch (e) { /* egal */ } },
  keys() { try { return Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).map(k => k.slice(PREFIX.length)); } catch (e) { return []; } }
};

/* ---------- Zufall ----------
   crypto.getRandomValues, wo vorhanden: Rollen sollen nicht vorhersagbar sein. */
function rnd(n) {
  if (n <= 1) return 0;
  try {
    const a = new Uint32Array(1);
    const lim = Math.floor(4294967296 / n) * n;
    do { crypto.getRandomValues(a); } while (a[0] >= lim);
    return a[0] % n;
  } catch (e) { return Math.floor(Math.random() * n); }
}
function pick(arr) { return arr[rnd(arr.length)]; }
function shuffle(arr) {
  const b = arr.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = rnd(i + 1); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
function range(n) { return Array.from({ length: n }, (_, i) => i); }
function randBetween(a, b) { return a + rnd(b - a + 1); }

/* ---------- Text ---------- */
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
/* Namen und eigene Begriffe säubern: Steuerzeichen raus, Leerraum zusammenfassen */
function cleanText(s, max) {
  return String(s == null ? "" : s).replace(/[\u0000-\u001F\u007F\u200B-\u200F\u2028\u2029]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function fmtTime(sec) {
  sec = Math.max(0, Math.ceil(sec));
  return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
}

/* ---------- Rückmeldung ---------- */
function vibrate(ms) {
  if (!store.get("vibrate", true)) return;
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* egal */ }
}

/* Töne über Web Audio, ohne Audiodateien. Abschaltbar in den Einstellungen. */
let audioCtx = null;
function audio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  } catch (e) { return null; }
}
/* Muss einmal aus einer Berührung heraus laufen, sonst bleibt iOS stumm. */
function unlockAudio() { if (store.get("sound", true)) audio(); }
function sfx(kind) {
  if (!store.get("sound", true)) return;
  const ac = audio();
  if (!ac) return;
  try {
    const now = ac.currentTime;
    if (kind === "boom") {
      const len = Math.floor(ac.sampleRate * 0.9);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
      const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      src.buffer = buf; f.type = "lowpass"; f.frequency.value = 700; g.gain.value = 0.9;
      src.connect(f).connect(g).connect(ac.destination);
      src.start(now);
      return;
    }
    const notes = {
      tap: [[660, 0, .05]],
      ok: [[880, 0, .09], [1320, .07, .12]],
      bad: [[220, 0, .2]],
      reveal: [[520, 0, .06], [780, .05, .08]],
      tick: [[1250, 0, .03]],
      tock: [[900, 0, .03]],
      warn: [[660, 0, .07]],
      gong: [[523, 0, 1.1], [659, 0, 1.1], [784, 0, 1.1]],
      fanfare: [[523, 0, .14], [659, .12, .14], [784, .24, .14], [1047, .36, .4]]
    }[kind] || [];
    notes.forEach(([fq, t0, dur]) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = kind === "bad" ? "triangle" : kind === "tick" || kind === "tock" ? "square" : "sine";
      o.frequency.value = fq;
      const vol = kind === "gong" ? .16 : kind === "tick" || kind === "tock" ? .05 : .09;
      g.gain.setValueAtTime(0.0001, now + t0);
      g.gain.exponentialRampToValueAtTime(vol, now + t0 + .01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t0 + dur);
      o.connect(g).connect(ac.destination);
      o.start(now + t0); o.stop(now + t0 + dur + .05);
    });
  } catch (e) { /* ohne Ton weiter */ }
}

/* ---------- Bildschirm wach halten (während einer Runde) ----------
   In der App über cordova-plugin-insomnia, im Browser Wake Lock. Das System
   gibt Wake Lock beim App-Wechsel frei; app.js fordert sie danach neu an. */
let wakeLock = null, wantAwake = false;
async function keepAwake(on) {
  wantAwake = !!on && store.get("awake", true) !== false;
  const ins = window.plugins && window.plugins.insomnia;
  if (ins) {
    try { if (wantAwake) ins.keepAwake(); else ins.allowSleepAgain(); } catch (e) { /* egal */ }
    return;
  }
  try {
    if (wantAwake && "wakeLock" in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    } else if (!wantAwake && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { wakeLock = null; }
}

/* ---------- Timer mit Pause ----------
   Rechnet mit der Uhrzeit statt mit gezählten Intervallen: Ein gedrosselter
   Hintergrund-Tab oder ein ruckelnder WebView verschiebt die Zeit nicht. */
class Countdown {
  constructor(totalMs, { onTick, onEnd } = {}) {
    this.total = totalMs; this.left = totalMs; this.running = false;
    this.onTick = onTick || (() => {}); this.onEnd = onEnd || (() => {});
    this.id = null; this.startedAt = 0; this.done = false;
  }
  start() {
    if (this.running || this.done) return;
    this.running = true; this.startedAt = performance.now();
    this.id = setInterval(() => this.tick(), 100);
    this.tick();
  }
  pause() {
    if (!this.running) return;
    this.left = Math.max(0, this.left - (performance.now() - this.startedAt));
    this.running = false; clearInterval(this.id); this.id = null;
    this.onTick(this.left);
  }
  remaining() { return this.running ? Math.max(0, this.left - (performance.now() - this.startedAt)) : this.left; }
  tick() {
    const r = this.remaining();
    this.onTick(r);
    if (r <= 0 && !this.done) { this.stop(); this.done = true; this.left = 0; this.onEnd(); }
  }
  stop() { if (this.id) clearInterval(this.id); this.id = null; this.running = false; }
}

/* ---------- Toast ---------- */
let toastTimer = null;
function toast(msg, ms = 2600) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}
