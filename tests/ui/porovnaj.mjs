// First Mate · UI test (`npm run test:ui`): pôvodný panel ↔ nový panel v prehliadači (Playwright, Chromium).
//
// Spustí lokálny server nad koreňom repozitára, otvorí oba panely s pevným časom (referenčný dátum 18:00
// Europe/Bratislava, bez AI, db a konektorov), porovná text všetkých záložiek a náhľad brífingu po „Prepočítať“.
// Rozdiel = zlyhanie. Úmyselné zmeny rozhrania sa sem doplnia ako výnimky so zápisom v docs/rozhodnutia.md.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { KOREN } from "../golden/legacy.mjs";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { console.log("Playwright nie je dostupný, UI test preskočený."); process.exit(0); }

const PRIPADY = [
  { typ: "developer", legacy: "legacy/panel-developer/index.html", panel: "panel/index.html", teraz: "2026-11-02T17:00:00Z" },
];
const TYPY = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".csv": "text/csv; charset=utf-8", ".md": "text/markdown; charset=utf-8" };
const server = http.createServer((req, res) => {
  const p = path.join(KOREN, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!p.startsWith(KOREN) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPY[path.extname(p)] || "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

async function snimok(browser, url, teraz) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "Europe/Bratislava" });
  const p = await ctx.newPage();
  await p.clock.setFixedTime(new Date(teraz));
  const chyby = [];
  p.on("pageerror", (e) => chyby.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") chyby.push(m.text()); });
  await p.goto(BASE + url);
  await p.waitForFunction(() => /projekt|nehnuteľnost|ponuk/i.test(document.body.innerText), null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(1500);
  const zalozky = Object.fromEntries(await p.$$eval(".view", (vs) => vs.map((v) => [v.id, v.innerText])));
  await p.click("#btnRecalc");
  await p.waitForTimeout(2500);
  const brif = await p.$eval("#v-brifing", (v) => v.innerHTML);
  await ctx.close();
  return { chyby, zalozky, brif };
}

let zlyhania = 0;
const browser = await chromium.launch();
try {
  for (const c of PRIPADY) {
    console.log(`UI ${c.typ}: ${c.legacy} ↔ ${c.panel}`);
    const [a, b] = [await snimok(browser, c.legacy, c.teraz), await snimok(browser, c.panel, c.teraz)];
    if (b.chyby.length) { zlyhania++; console.log("  ✗ chyby v konzole nového panela:\n    " + b.chyby.join("\n    ")); }
    for (const id of Object.keys(a.zalozky)) {
      if (a.zalozky[id] === b.zalozky[id]) { console.log(`  ✓ ${id}`); continue; }
      zlyhania++;
      const la = a.zalozky[id].split("\n"), lb = (b.zalozky[id] || "").split("\n");
      const i = la.findIndex((r, n) => r !== lb[n]);
      console.log(`  ✗ ${id}: prvý rozdiel na riadku ${i}: „${(la[i] || "").slice(0, 80)}“ ≠ „${(lb[i] || "").slice(0, 80)}“`);
    }
    if (a.brif === b.brif) console.log("  ✓ náhľad brífingu po Prepočítať");
    else { zlyhania++; console.log("  ✗ náhľad brífingu sa líši"); }
  }
} finally {
  await browser.close();
  server.close();
}
console.log(zlyhania ? `\nZLYHALO: ${zlyhania}` : "\nUI test prešiel.");
process.exit(zlyhania ? 1 : 0);
