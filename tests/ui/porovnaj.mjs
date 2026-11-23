// First Mate · UI test (`npm run test:ui`): pôvodný panel ↔ nový panel v prehliadači (Playwright, Chromium).
//
// Spustí lokálny server nad koreňom repozitára, otvorí oba panely s pevným časom (referenčný dátum 18:00
// Europe/Bratislava, bez AI, db a konektorov), porovná viditeľný text každej záložky (po prepnutí na ňu)
// hlavičku, menu, pätu, dialóg „Dáta ukážky“, prepnutie na pôvodné dátumy a späť
// a po „Prepočítať“ priebeh a náhľad brífingu vo všetkých kartách (E-mail, Slack, pri developerovi Financie).
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
  { typ: "realitka", legacy: "legacy/panel-realitka/index.html", panel: "panel/index.html?typ=realitka", teraz: "2026-11-03T17:00:00Z" },
  // prepínač typu bez načítania stránky (nastavenia demo: prepinac true): developer → realitka, developer → realitka → developer
  { typ: "prepínač → realitka", legacy: "legacy/panel-realitka/index.html", panel: "panel/index.html", prepni: ["realitka"], teraz: "2026-11-03T17:00:00Z" },
  { typ: "prepínač → realitka → developer", legacy: "legacy/panel-developer/index.html", panel: "panel/index.html", prepni: ["realitka", "developer"], teraz: "2026-11-02T17:00:00Z" },
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

async function snimok(browser, url, teraz, prepni = []) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "Europe/Bratislava" });
  const p = await ctx.newPage();
  await p.clock.setFixedTime(new Date(teraz));
  const chyby = [];
  p.on("pageerror", (e) => chyby.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") chyby.push(m.text()); });
  await p.goto(BASE + url);
  await p.waitForFunction(() => /projekt|nehnuteľnost|ponuk/i.test(document.body.innerText), null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(1500);
  for (const typ of prepni) {
    await p.evaluate(() => { location.hash = "signaly"; });
    await p.click(`[data-prepni="${typ}"]`);
    await p.waitForFunction((t) => document.body.dataset.fmTyp === t, typ);
    await p.waitForTimeout(2000);
  }
  await p.evaluate(() => { location.hash = "brifing"; }); await p.waitForTimeout(100);
  const zalozky = {};
  for (const id of await p.$$eval(".view", (vs) => vs.map((v) => v.id))) {
    await p.evaluate((h) => { location.hash = h; }, id.replace(/^v-/, ""));
    await p.waitForTimeout(150);
    zalozky[id] = await p.$eval("#" + id, (v) => v.innerText);
  }
  // okolie záložiek: hlavička, menu, päta a dialóg „Dáta ukážky“ (skrytý, preto textContent bez medzier navyše)
  const okolie = await p.evaluate(() => ({
    hlavicka: document.querySelector(".hero").innerText, menu: document.querySelector("#nav").innerText,
    pata: document.querySelector("footer").innerText, dialog_data: document.querySelector("#dsOv").textContent.replace(/\s+/g, " ").trim()
  }));
  // posun dátumov: pôvodné dátumy a späť (záložka Signály s číslami „Dnes“)
  await p.evaluate(() => { location.hash = "signaly"; });
  await p.click('#dataBar [data-shift="0"]'); await p.waitForTimeout(400);
  okolie.povodne_datumy = await p.$eval("#v-signaly", (v) => v.innerText) + "\n" + await p.$eval("#dataBar", (v) => v.innerText);
  await p.click('#dataBar [data-shift="1"]'); await p.waitForTimeout(400);
  okolie.posunute_datumy = await p.$eval("#v-signaly", (v) => v.innerText);
  await p.evaluate(() => { location.hash = "brifing"; });
  await p.click("#btnRecalc");
  await p.waitForTimeout(2500);
  const brif = { priebeh: await p.$eval("#run", (v) => v.innerText), info: await p.$eval("#pvInfo", (v) => v.innerText) };
  for (const pv of await p.$$eval(".tabs2 button", (bs) => bs.map((b) => b.dataset.pv))) {
    await p.click(`.tabs2 button[data-pv="${pv}"]`);
    await p.waitForTimeout(150);
    brif["nahlad_" + pv] = await p.$eval("#pv", (v) => v.innerHTML);
  }
  await ctx.close();
  return { chyby, zalozky: { ...zalozky, ...okolie }, brif };
}

let zlyhania = 0;
const browser = await chromium.launch();
try {
  for (const c of PRIPADY) {
    console.log(`UI ${c.typ}: ${c.legacy} ↔ ${c.panel}`);
    const [a, b] = [await snimok(browser, c.legacy, c.teraz), await snimok(browser, c.panel, c.teraz, c.prepni)];
    if (b.chyby.length) { zlyhania++; console.log("  ✗ chyby v konzole nového panela:\n    " + b.chyby.join("\n    ")); }
    for (const id of Object.keys(a.zalozky)) {
      if (a.zalozky[id] === b.zalozky[id]) { console.log(`  ✓ ${id}`); continue; }
      zlyhania++;
      const la = a.zalozky[id].split("\n"), lb = (b.zalozky[id] || "").split("\n");
      const i = la.findIndex((r, n) => r !== lb[n]);
      console.log(`  ✗ ${id}: prvý rozdiel na riadku ${i}: „${(la[i] || "").slice(0, 80)}“ ≠ „${(lb[i] || "").slice(0, 80)}“`);
    }
    for (const k of Object.keys(a.brif)) {
      if (a.brif[k] === b.brif[k]) { console.log(`  ✓ po Prepočítať: ${k}`); continue; }
      zlyhania++;
      const x = a.brif[k], y = b.brif[k] || "", i = [...x].findIndex((ch, n) => ch !== y[n]);
      console.log(`  ✗ po Prepočítať: ${k} sa líši od znaku ${i}: „${x.slice(Math.max(0, i - 40), i + 60)}“ ≠ „${y.slice(Math.max(0, i - 40), i + 60)}“`);
    }
  }
} finally {
  await browser.close();
  server.close();
}
console.log(zlyhania ? `\nZLYHALO: ${zlyhania}` : "\nUI test prešiel.");
process.exit(zlyhania ? 1 : 0);
