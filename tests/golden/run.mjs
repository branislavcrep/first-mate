// First Mate · golden testy (`npm test`).
//
// 1. Pôvodné panely (legacy/) stále dávajú presne golden výstup → golden súbory a nástroj sedia.
// 2. F1–F6 z golden výstupu = referenčný model v Pythone (tools/first_mate_financny_model.py).
// 3. Overené čísla z legacy/README.md (IRR VK PL 23,9 %, NZ 15,0 % …).
// 4. Katalóg use casov: schéma (tools/export_usecases.py --kontrola) a aktuálny CSV export.
// 5. Nové jadro: ak existuje panel/golden.mjs, musí dať pre oba typy rovnaký výstup ako golden.
//    Kontrakt: `export function nacitaj(typ, nowMs)` vráti {FMCSV, FM, FIN, CSV} v tvare legacy modulov
//    (FM.compute, FM.fallbackTexts, FM.DEFAULTS, FM.KEYS, FM.localParts; FIN.compute, FIN.normalize, …).
//
// Prepínače: FM_JADRO=legacy (bez bodu 5) · FM_JADRO=panel (bez bodu 1).
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { KOREN } from "./legacy.mjs";
import { vypocitaj } from "./vypocet.mjs";
import { rozdiely, vypisRozdiely } from "./porovnaj.mjs";
import { pythonSignaly, porovnajSPythonom, porovnajSReadme } from "./financie_python.mjs";

const TYPY = ["realitka", "developer"];
const rezim = process.env.FM_JADRO || "vsetko";
let zlyhania = 0;
const ok = (t) => console.log("  ✓ " + t);
const zle = (t, detail) => { zlyhania++; console.log("  ✗ " + t + (detail ? "\n" + detail : "")); };

const golden = Object.fromEntries(TYPY.map((t) => {
  const p = path.join(KOREN, "tests", "golden", `${t}.json`);
  if (!fs.existsSync(p)) { console.error(`Chýba ${path.relative(KOREN, p)}. Spusti: npm run golden`); process.exit(2); }
  return [t, JSON.parse(fs.readFileSync(p, "utf8"))];
}));

// rovnaké vstupné dáta ako pri vzniku golden súborov (inak golden neplatí)
function overData(typ, vystup) {
  const r = rozdiely(golden[typ].meta.data, vystup.meta.data);
  if (r.length) zle(`${typ}: CSV v data/${typ}/ sa zmenili oproti golden súboru`, vypisRozdiely(r));
  return r.length === 0;
}

function porovnajSGolden(meno, typ, vystup) {
  const g = golden[typ];
  for (const cast of ["suhrn", "vystup", "texty"]) {
    const r = rozdiely(g[cast], vystup[cast]);
    r.length ? zle(`${meno} · ${typ} · ${cast}: ${r.length} rozdielov`, vypisRozdiely(r)) : ok(`${meno} · ${typ} · ${cast}`);
  }
  if (g.financie) {
    for (const cast of ["suhrn", "vystup", "texty"]) {
      const r = rozdiely(g.financie[cast], vystup.financie && vystup.financie[cast]);
      r.length ? zle(`${meno} · ${typ} · financie.${cast}: ${r.length} rozdielov`, vypisRozdiely(r)) : ok(`${meno} · ${typ} · financie.${cast}`);
    }
  }
}

if (rezim !== "panel") {
  console.log("Pôvodné panely (legacy/) ↔ golden");
  for (const t of TYPY) { const v = vypocitaj(t); if (overData(t, v)) porovnajSGolden("legacy", t, v); }
}

console.log("Financie F1–F6 ↔ Python model a legacy/README.md");
{
  const fin = golden.developer.financie.vystup;
  try {
    const py = pythonSignaly(path.join(KOREN, "data", "developer"), fin.today);
    const a = porovnajSPythonom(fin, py);
    a.chyby.length ? zle(`Python: ${a.chyby.length} nezhôd z ${a.pocet}`, a.chyby.map((c) => "  " + c).join("\n")) : ok(`Python: ${a.pocet} hodnôt sa zhoduje`);
  } catch (e) { zle("Python model sa nepodarilo spustiť (python3)", "  " + String(e.message).split("\n")[0]); }
  const b = porovnajSReadme(fin);
  b.chyby.length ? zle(`README: ${b.chyby.length} nezhôd z ${b.pocet}`, b.chyby.map((c) => "  " + c).join("\n")) : ok(`README: ${b.pocet} overených čísel sedí`);
}

console.log("Katalóg use casov (usecases/)");
{
  const r = spawnSync("python3", ["-I", path.join(KOREN, "tools", "export_usecases.py"), "--kontrola"], { encoding: "utf8" });
  process.stdout.write(r.stdout || "");
  if (r.status !== 0) { zlyhania++; if (r.stderr) console.log(r.stderr); }
}

const jadro = path.join(KOREN, "panel", "golden.mjs");
if (rezim !== "legacy") {
  console.log("Nové jadro (panel/) ↔ golden");
  if (fs.existsSync(jadro)) {
    const { nacitaj } = await import(pathToFileURL(jadro).href);
    for (const t of TYPY) { const v = vypocitaj(t, nacitaj); if (overData(t, v)) porovnajSGolden("panel", t, v); }
  } else if (rezim === "panel") {
    zle("panel/golden.mjs neexistuje");
  } else {
    console.log("  – panel/golden.mjs zatiaľ neexistuje (vznikne vo fáze 4), preskočené");
  }
}

console.log(zlyhania ? `\nZLYHALO: ${zlyhania}` : "\nVšetky golden testy prešli.");
process.exit(zlyhania ? 1 : 0);
