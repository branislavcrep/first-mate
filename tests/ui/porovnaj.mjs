// First Mate · UI test (`npm run test:ui`): pôvodný panel ↔ nový panel v prehliadači (Playwright, Chromium).
//
// Spustí lokálny server nad koreňom repozitára, otvorí oba panely s pevným časom (referenčný dátum 18:00
// Europe/Bratislava, bez AI, db a konektorov), porovná viditeľný text každej záložky (po prepnutí na ňu)
// hlavičku, menu, pätu, dialóg „Dáta ukážky“, prepnutie na pôvodné dátumy a späť
// a po „Prepočítať“ priebeh a náhľad brífingu vo všetkých kartách (E-mail, Slack, pri developerovi Financie).
// Okrem porovnania s legacy overí správanie podľa nastavení klienta (NASTAVENIA, podstrčené cez page.route).
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
  // klientsky režim: pôvodný panel Immocap ↔ nový panel s nastaveniami klienti/immocap (vrátane potvrdenia pred odoslaním)
  { typ: "klient Immocap", legacy: "legacy/panel-klient-immocap/index.html", panel: "panel/index.html", nastavenia: "klienti/immocap/nastavenia.json", potvrdenie: true, teraz: "2026-11-02T17:00:00Z" },
  { typ: "prepínač → realitka → developer", legacy: "legacy/panel-developer/index.html", panel: "panel/index.html", prepni: ["realitka", "developer"], teraz: "2026-11-02T17:00:00Z" },
];
const TYPY = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".csv": "text/csv; charset=utf-8", ".md": "text/markdown; charset=utf-8" };
const server = http.createServer((req, res) => {
  // pôvodný panel Immocap mal rovnaké dáta ako developer, v legacy/ nie sú skopírované
  const cesta = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/legacy\/panel-klient-immocap\/data\//, "/data/developer/");
  const p = path.join(KOREN, cesta);
  if (!p.startsWith(KOREN) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPY[path.extname(p)] || "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

async function snimok(browser, url, teraz, prepni = [], c = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "Europe/Bratislava" });
  const p = await ctx.newPage();
  await p.clock.setFixedTime(new Date(teraz));
  const chyby = [];
  p.on("pageerror", (e) => chyby.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") chyby.push(m.text()); });
  if (c.nastavenia) await p.route("**/klienti/demo/nastavenia.json", (r) => r.fulfill({ path: path.join(KOREN, c.nastavenia) }));
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
  if (c.potvrdenie) {
    // odoslanie do Slacku: potvrdzovacie okno, „Späť“ a výsledok (nič neodíde)
    await p.click('.tabs2 button[data-pv="email"]');
    await p.click("#btnSlack");
    await p.waitForSelector("#cfOv:not(.hidden)", { timeout: 10000 }).catch(() => {});
    brif.potvrdenie_okno = await p.$eval("#cfOv", (v) => v.innerText).catch(() => "chýba #cfOv");
    await p.click("#cfNo").catch(() => {});
    await p.waitForTimeout(300);
    brif.potvrdenie_zrusene = await p.$eval("#run", (v) => v.innerText);
  }
  await ctx.close();
  return { chyby, zalozky: { ...zalozky, ...okolie }, brif };
}

// Nastavenia klienta (bez porovnania s legacy): panel s inými nastaveniami podstrčenými cez page.route.
// Každý prípad: nastavenia, kroky v prehliadači a očakávania { meno: [skutočnosť, očakávanie] }.
const NASTAVENIA = [
  {
    meno: "menu z nastavení (developer, potom prepnutie na realitku)",
    nastavenia: {
      prepinac: true, typy: ["realitka", "developer"], typ: "developer",
      menu: { developer: [{ id: "signaly", nazov: "Pravidlá" }, { id: "brifing" }, { id: "financie", zapnute: false }, { id: "neznama" }], realitka: [{ id: "tim", nazov: "Makléri" }, { id: "architektura", zapnute: false }] }
    },
    async over(p) {
      const menu = () => p.$$eval("#nav a", (as) => as.map((a) => a.querySelector("span").textContent + " " + a.lastChild.nodeValue.trim()).join(" | "));
      const viditelna = () => p.$$eval(".view", (vs) => vs.filter((v) => getComputedStyle(v).display !== "none").map((v) => v.id).join(","));
      const kicker = (id) => p.$eval(`#${id} > .kicker b`, (b) => b.textContent).catch(() => "–");
      const o = {};
      o["developer: menu"] = [await menu(), "01 Pravidlá | 02 Brífing | 03 Projekty | 04 Tím | 05 Rozvrh | 06 Architektúra"];
      o["developer: úvodná záložka je prvá v menu"] = [await viditelna(), "v-signaly"];
      o["developer: číslo v nadpise Signálov"] = [await kicker("v-signaly"), "01"];
      o["developer: číslo v nadpise Tímu"] = [await kicker("v-tim"), "04"];
      await p.evaluate(() => { location.hash = "financie"; }); await p.waitForTimeout(150);
      o["developer: vypnuté Financie sa neotvoria"] = [await viditelna(), "v-signaly"];
      await p.evaluate(() => { location.hash = "tim"; }); await p.waitForTimeout(150);
      o["developer: Tím sa otvorí"] = [await viditelna(), "v-tim"];
      await p.click('[data-prepni="realitka"]');
      await p.waitForFunction(() => document.body.dataset.fmTyp === "realitka"); await p.waitForTimeout(1500);
      o["realitka: menu"] = [await menu(), "01 Makléri | 02 Brífing | 03 Signály | 04 Rozvrh"];
      o["realitka: Tím ostal otvorený"] = [await viditelna(), "v-tim"];
      o["realitka: číslo v nadpise Tímu"] = [await kicker("v-tim"), "01"];
      return o;
    }
  },
  {
    meno: "klientsky režim realitky (bez legacy predlohy)",
    nastavenia: {
      nazov: "Realitka Test, s.r.o.", rezim: "klient", prepinac: false, typy: ["realitka"], typ: "realitka",
      potvrdenie_pred_odoslanim: true, signaly_len_na_citanie: true, zalozka_tipy: true, rozvrh: "planovana-uloha",
      predvolene: { email: "", prvy_clen: { meno: "Manažér", email: "", aktivny: false } }, slack: { prikaz: "/first-mate-test" }
    },
    async over(p) {
      const o = {};
      o["horný pruh s názvom klienta"] = [await p.$eval("#klient", (e) => e.firstChild.textContent.trim()), "Realitka Test, s.r.o."];
      o["hlavička"] = [await p.$eval(".hero .kicker", (e) => e.innerText), "MÔJ PANEL · FIRST MATE PRE REALITNÚ KANCELÁRIU"];
      o["bez prepínača typu"] = [await p.$$eval("[data-prepni]", (x) => x.length), 0];
      o["menu"] = [await p.$$eval("#nav a", (as) => as.map((a) => a.innerText.replace(/\s+/g, " ")).join(" | ")), "01BRÍFING | 02TÍM | 03SIGNÁLY | 04ROZVRH | 05ARCHITEKTÚRA | 06ČO VYSKÚŠAŤ"];
      o["príkaz v Slack karte"] = [await p.$eval("#v-brifing [data-prikaz]", (e) => e.textContent), "/first-mate-test"];
      o["signály len na čítanie"] = [await p.$$eval("#sig input, #period", (x) => x.every((i) => i.disabled) && x.length > 0), true];
      o["bez pridania signálu"] = [await p.$$eval("#btnAddSig, #sgAdd", (x) => x.length), 0];
      o["rozvrh ako plánovaná úloha"] = [await p.$$eval("#days", (x) => x.length) + " · " + (await p.$eval("#v-rozvrh", (v) => v.textContent)).includes("#first-mate-demo"), "0 · true"];
      o["bez predvolených adries"] = [await p.$eval("#emailTo", (e) => e.value), ""];
      o["tipy z katalógu"] = [await p.$eval("#tipCount", (e) => e.textContent), await p.evaluate(async () => { const k = await (await fetch("../usecases/usecases.json")).json(); return k.usecases.filter((u) => u.druh === "tip" && u.typy.includes("realitka")).length + " tipov"; })];
      await p.click("#btnSlack");
      await p.waitForSelector("#cfOv:not(.hidden)", { timeout: 10000 }).catch(() => {});
      o["potvrdenie pred odoslaním do Slacku"] = [await p.$eval("#cfTitle", (e) => e.textContent).catch(() => "chýba"), "Odoslať brífing do Slacku?"];
      await p.click("#cfNo");
      return o;
    }
  }
];

async function overNastavenia(browser, c) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "Europe/Bratislava" });
  const p = await ctx.newPage();
  const chyby = [];
  p.on("pageerror", (e) => chyby.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") chyby.push(m.text()); });
  await p.route("**/klienti/demo/nastavenia.json", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify(c.nastavenia) }));
  await p.goto(BASE + "panel/index.html");
  await p.waitForFunction(() => document.body.dataset.fmTyp, null, { timeout: 15000 });
  await p.waitForTimeout(2000);
  const o = await c.over(p);
  await ctx.close();
  if (chyby.length) o["bez chýb v konzole"] = [chyby.join(" · "), ""];
  return o;
}

let zlyhania = 0;
const browser = await chromium.launch();
try {
  for (const c of PRIPADY) {
    console.log(`UI ${c.typ}: ${c.legacy} ↔ ${c.panel}`);
    const [a, b] = [await snimok(browser, c.legacy, c.teraz, [], { potvrdenie: c.potvrdenie }), await snimok(browser, c.panel, c.teraz, c.prepni, c)];
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
  for (const c of NASTAVENIA) {
    console.log(`UI nastavenia: ${c.meno}`);
    for (const [k, [je, ma]] of Object.entries(await overNastavenia(browser, c))) {
      if (je === ma) console.log(`  ✓ ${k}`);
      else { zlyhania++; console.log(`  ✗ ${k}: „${je}“, očakávané „${ma}“`); }
    }
  }
} finally {
  await browser.close();
  server.close();
}
console.log(zlyhania ? `\nZLYHALO: ${zlyhania}` : "\nUI test prešiel.");
process.exit(zlyhania ? 1 : 0);
