/* SneakPlay – iOS: Ausrichtungen nach jedem „cordova prepare“ festlegen.
   iPhone: nur Hochformat (das Handy wird weitergereicht).
   iPad:   alle vier Ausrichtungen – Pflicht für Split View und Slide Over,
           sonst lehnt App Store Connect den Upload ab.
   Cordova kennt nur eine gemeinsame Einstellung für beide Geräte und
   überschreibt edit-config-Einträge dafür beim Vorbereiten, deshalb dieser
   Hook. Er läuft nur auf dem Mac-Runner (plutil). */
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const IPHONE = ["UIInterfaceOrientationPortrait"];
const IPAD = ["UIInterfaceOrientationPortrait", "UIInterfaceOrientationPortraitUpsideDown",
  "UIInterfaceOrientationLandscapeLeft", "UIInterfaceOrientationLandscapeRight"];

function findPlists(dir, depth = 0, out = []) {
  if (depth > 3 || !fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && !/^(Pods|CordovaLib|build|www|Plugins)$/.test(e.name)) findPlists(p, depth + 1, out);
    else if (e.isFile() && /-Info\.plist$/.test(e.name)) out.push(p);
  }
  return out;
}

module.exports = function (ctx) {
  if (!(ctx.opts.platforms || []).some(p => /^ios/.test(p))) return;
  const plists = findPlists(path.join(ctx.opts.projectRoot, "platforms", "ios"));
  if (!plists.length) throw new Error("ios-orientation: keine Info.plist gefunden");
  for (const plist of plists) {
    execFileSync("plutil", ["-replace", "UISupportedInterfaceOrientations", "-json", JSON.stringify(IPHONE), plist]);
    execFileSync("plutil", ["-replace", "UISupportedInterfaceOrientations~ipad", "-json", JSON.stringify(IPAD), plist]);
    try { execFileSync("plutil", ["-remove", "UIRequiresFullScreen", plist], { stdio: "ignore" }); } catch (e) { /* nicht vorhanden */ }
    console.log("ios-orientation: iPhone Hochformat, iPad alle Ausrichtungen – " + path.basename(plist));
  }
};
