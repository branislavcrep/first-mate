// First Mate · načítanie pôvodných výpočtových modulov z legacy panelov (len na čítanie).
//
// Vytiahne zo <script> blokov v legacy/<panel>/index.html moduly FMCSV, FM a (developer) FIN,
// definíciu CSV (spec, files, optional) a CSV.toData, a spustí ich v izolovanom vm kontexte
// s pevným časom (Date.now). Kód panela sa nemení ani nekopíruje: číta sa priamo zo súboru.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

export const KOREN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const PANELY = {
  realitka: { html: "legacy/panel-realitka/index.html", moduly: ["FMCSV", "FM"] },
  developer: { html: "legacy/panel-developer/index.html", moduly: ["FMCSV", "FM", "FIN"] },
};

function skripty(html) {
  const out = [];
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

// Vyreže príkaz začínajúci `zaciatok` až po prvý riadok, ktorý je presne `koniec` (vrátane).
function vyrez(kod, zaciatok, koniec) {
  const i = kod.indexOf(zaciatok);
  if (i < 0) return null;
  const riadok = kod.slice(i).split("\n");
  if (riadok[0].trimEnd().endsWith(";")) return riadok[0];
  const k = riadok.findIndex((r, n) => n > 0 && r.trimEnd() === koniec);
  return k < 0 ? null : riadok.slice(0, k + 1).join("\n");
}

// Date s pevným „teraz“: konštruktor bez argumentov a Date.now() vrátia nowMs.
function pevnyDate(nowMs) {
  const RealDate = Date;
  class FixedDate extends RealDate {
    constructor(...a) { if (a.length === 0) super(nowMs); else super(...a); }
    static now() { return nowMs; }
  }
  return FixedDate;
}

/**
 * Načíta moduly pôvodného panela.
 * @param {"realitka"|"developer"} typ
 * @param {number} nowMs pevný čas (epoch ms), ktorý uvidí Date.now() vo vnútri modulov
 */
export function nacitajLegacy(typ, nowMs) {
  const p = PANELY[typ];
  if (!p) throw new Error("Neznámy typ: " + typ);
  const html = fs.readFileSync(path.join(KOREN, p.html), "utf8");
  const bloky = skripty(html);
  const ctx = vm.createContext({ console, Intl, Date: pevnyDate(nowMs), module: undefined });
  for (const meno of p.moduly) {
    const blok = bloky.find((b) => new RegExp("^const " + meno + " = \\(\\(\\) => \\{", "m").test(b));
    if (!blok) throw new Error(`${p.html}: modul ${meno} sa nenašiel`);
    // každý blok ako samostatný <script> v jednom globálnom rozsahu (ako v prehliadači)
    vm.runInContext(blok + `\n;globalThis.${meno} = ${meno};`, ctx, { filename: `${p.html}#${meno}` });
  }
  const app = bloky.find((b) => b.includes("const CSV = {"));
  const csvDef = vyrez(app, "const CSV = {", "};");
  const toData = vyrez(app, "CSV.toData = raw =>", "  };");
  if (!csvDef || !toData) throw new Error(`${p.html}: definícia CSV alebo CSV.toData sa nenašla`);
  vm.runInContext(`${csvDef}\n${toData}\n;globalThis.CSV = CSV;`, ctx, { filename: `${p.html}#CSV` });
  return { FMCSV: ctx.FMCSV, FM: ctx.FM, FIN: ctx.FIN || null, CSV: ctx.CSV, ctx };
}
