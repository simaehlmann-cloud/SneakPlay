const { chromium } = require("playwright");
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 443, height: 830 }, deviceScaleFactor: 2 }); await ctx.addInitScript(() => { window.__SNEAKPLAY_TEST__ = true; });
  const p = await ctx.newPage(); await p.goto("http://localhost:8765/www/index.html");
  await p.evaluate(() => { localStorage.clear(); const s=(k,v)=>localStorage.setItem("sneakplay."+k,JSON.stringify(v)); s("lang","de"); s("theme","dark"); s("pro",true); s("world","free"); s("seenRules",true); s("coach",{imposter:true}); s("players",["Anna","Ben","Cleo","Dana","Emil"]); s("imp",{cats:["food"],imps:1,clueless:false,hint:"cat",timer:0,vote:"group"}); });
  await p.goto("http://localhost:8765/www/index.html");
  await p.evaluate(() => { beginRound("imposter"); R.cat="Essen & Genuss"; R.icon="🍿"; R.role=R.role.map((r,i)=>i===1?"imp":"crew"); R.step=1; screenPass(); document.activeElement && document.activeElement.blur(); });
  const bb = await (await p.$("#hold")).boundingBox(); await p.mouse.move(bb.x+bb.width/2, bb.y+bb.height*0.9); await p.mouse.down(); await p.waitForTimeout(500);
  await p.screenshot({ path: "ben.png" }); await p.mouse.up(); await b.close(); })();
