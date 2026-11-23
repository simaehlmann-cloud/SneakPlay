/* SneakPlay – Vollversion (In-App-Kauf) und Testrunden
   Dauerhaft gratis: der Hochstapler-Modus mit allen Kategorien, eigene
   Karten, QR-Austausch, Teams und Schulmodus. Die Vollversion schaltet
   Geheime Missionen, Erklär’s! und die Wort-Bombe unbegrenzt frei. Ohne
   Vollversion gibt es je Modus TRIALS Testrunden (mit allen Kategorien,
   auch Schule und Mathe), gezählt auf dem Gerät.

   Plugin: cordova-plugin-purchase (CdvPurchase, v13) wie bei MatheSnack und
   Drawmory – Kauf über die Kaufschnittstelle des jeweiligen Stores. Ohne
   Server gilt ein Kauf als bestätigt, sobald der Store ihn meldet. Im
   Browser (Entwicklung, Vorschau) gibt es keinen Kauf. */
"use strict";

const PRODUCT_ID = "de.sneakplay.app.vollversion";
const TRIALS = 2;
const FREE_MODES = ["imposter"];
const shop = { ready: false, price: "", busy: false, error: "", onChange: null };

function shopPlatform(C) { return platformId() === "android" ? C.Platform.GOOGLE_PLAY : C.Platform.APPLE_APPSTORE; }
function isPro() { return store.get("pro", false) === true; }
function isFreeMode(m) { return FREE_MODES.includes(m); }
function unlocked(m) { return isPro() || isFreeMode(m); }
function trialsLeft(m) { return Math.max(0, TRIALS - (Number(store.get("trial." + m, 0)) || 0)); }
function useTrial(m) { store.set("trial." + m, TRIALS - trialsLeft(m) + 1); }

function shopChanged() {
  if (shop.onChange) { try { shop.onChange(); } catch (e) { /* weiter */ } return; }
  if (shop.error) { toast(shop.error); shop.error = ""; }
  if (typeof current === "undefined" || shop.busy) return;
  if (current.name === "settings") screenSettings(true);
  else if (current.name === "home") screenHome(true);
}
function setPro() {
  if (isPro()) return;
  store.set("pro", true);
  shop.busy = false;
  toast(t("pro.unlocked"));
  shopChanged();
}

function initShop() {
  const C = window.CdvPurchase;
  if (!C || !C.store) return;
  const st = C.store, plat = shopPlatform(C);
  st.register([{ id: PRODUCT_ID, type: C.ProductType.NON_CONSUMABLE, platform: plat }]);
  st.when()
    .productUpdated(p => {
      if (!p || p.id !== PRODUCT_ID) return;
      shop.price = (p.pricing && p.pricing.price) || shop.price;
      if (p.owned) setPro();
      shopChanged();
    })
    .approved(tr => tr.verify())
    .verified(rc => rc.finish())
    .finished(tr => {
      if (tr && tr.products && tr.products.some(x => x.id === PRODUCT_ID)) setPro();
      shop.busy = false; shopChanged();
    });
  if (st.error) st.error(err => { shop.busy = false; shop.error = (err && err.message) || t("pro.failed"); shopChanged(); });
  Promise.resolve(st.initialize([plat])).then(() => {
    shop.ready = true;
    if (st.owned && st.owned(PRODUCT_ID)) setPro();
    shopChanged();
  }).catch(() => { shop.error = t("pro.unavailable"); shopChanged(); });
}

function buyPro() {
  if (school()) return;
  const C = window.CdvPurchase;
  const p = C && C.store && C.store.get(PRODUCT_ID, shopPlatform(C));
  const offer = p && p.getOffer && p.getOffer();
  if (!offer) { shop.error = t("pro.unavailable"); shopChanged(); return; }
  shop.busy = true; shop.error = ""; shopChanged();
  Promise.resolve(offer.order()).then(err => {
    if (!err) return;                     // Erfolg meldet .finished()
    shop.busy = false;
    const cancelled = C.ErrorCode && err.code === C.ErrorCode.PAYMENT_CANCELLED;
    if (!cancelled) shop.error = err.message || t("pro.failed");
    shopChanged();
  }).catch(() => { shop.busy = false; shop.error = t("pro.failed"); shopChanged(); });
}

function restorePro() {
  const C = window.CdvPurchase;
  if (!C || !C.store) { shop.error = t("pro.appOnly"); shopChanged(); return; }
  shop.busy = true; shop.error = ""; shopChanged();
  Promise.resolve(C.store.restorePurchases()).then(() => {
    shop.busy = false;
    if (C.store.owned(PRODUCT_ID)) setPro(); else shop.error = t("pro.restoreNone");
    shopChanged();
  }).catch(() => { shop.busy = false; shop.error = t("pro.failed"); shopChanged(); });
}

/* Vor jedem Rundenstart. Gratis-Modus oder Vollversion: sofort weiter.
   Sonst Testrunde anbieten oder – wenn aufgebraucht – die Vollversion zeigen. */
function requirePro(m, go) {
  if (unlocked(m)) { go(); return; }
  const left = trialsLeft(m);
  if (left <= 0) { screenPaywall(m); return; }
  const buttons = [{ label: t("cancel") }];
  if (!school()) buttons.push({ label: t("pro.trial.more"), action: () => { screenPaywall(m); } });
  buttons.push({ label: t("pro.trial.use"), primary: true, action: () => { useTrial(m); go(); } });
  dialog(t("pro.trial.title"), `<p>${esc(t("pro.trial.text", { mode: t("mode." + m), n: left, m: TRIALS }))}</p>`, buttons);
}

/* Bildschirm „Vollversion“ */
function screenPaywall(reasonMode) {
  const paint = () => {
    const pro = isPro(), sch = school(), app = inApp();
    const paid = MODES.filter(m => !isFreeMode(m));
    const buyLabel = !app ? t("pro.buyFor", { price: t("pro.price") }) : shop.price ? t("pro.buyFor", { price: shop.price }) : t("pro.loading");
    const canAct = app && shop.ready && !shop.busy;
    show(`${backbar(t("pro.title"))}
      <div class="center pop"><div class="e-big">⭐</div><div class="big-h">${esc(t("pro.title"))}</div><p class="muted">${esc(t("pro.subtitle"))}</p></div>
      ${pro ? `<p class="badge center-block">✓ ${esc(t("pro.active"))}</p>` : reasonMode ? `<p class="notice">${esc(t("pro.reason", { mode: t("mode." + reasonMode), m: TRIALS }))}</p>` : ""}
      <section class="card"><h2>${esc(t("pro.includes"))}</h2><ul class="prolist">${paid.map(m => `<li><span aria-hidden="true">${MODE_ICON[m]}</span> <b>${esc(t("mode." + m))}</b> – ${esc(t("pro.what." + m))}</li>`).join("")}</ul></section>
      <ul class="facts">
        <li>✓ ${esc(t("pro.fact.once"))}</li>
        <li>✓ ${esc(t("pro.fact.free"))}</li>
        <li>✓ ${esc(t("pro.fact.school"))}</li>
        ${platformId() === "android" ? "" : `<li>✓ ${esc(t("pro.fact.family"))}</li>`}
      </ul>
      ${pro ? "" : sch ? `<p class="notice">${esc(t("pro.schoolHint"))}</p>` : `
        <button type="button" class="btn primary big" id="buyBtn"${canAct ? "" : " disabled"}>${esc(buyLabel)}</button>
        <button type="button" class="btn wide" id="restoreBtn"${canAct ? "" : " disabled"}>${esc(t("pro.restore"))}</button>`}
      <p class="msg" role="status" style="margin-top:10px">${esc(shop.error || (!app && !pro ? t("pro.appOnly") : ""))}</p>
      <p class="muted small center">${esc(t("pro.fine"))}</p>`, { name: "paywall", keepScroll: true });
    const b = document.getElementById("buyBtn"), r = document.getElementById("restoreBtn");
    if (b) b.onclick = buyPro;
    if (r) r.onclick = restorePro;
    shop.onChange = paint;
    leaveFns.push(() => { if (shop.onChange === paint) shop.onChange = null; });
  };
  window.scrollTo(0, 0);
  paint();
}

/* Kurzer Hinweis auf der Modus-Karte der Startseite */
function modeBadge(m) {
  if (isPro()) return "";
  if (isFreeMode(m)) return `<em class="mbadge free">${esc(t("pro.badge.free"))}</em>`;
  const left = trialsLeft(m);
  return `<em class="mbadge">${esc(left > 0 ? t("pro.badge.trials", { n: left }) : t("pro.badge.locked"))}</em>`;
}
