// First Mate · adaptér nového jadra pre golden testy (tests/golden/run.mjs).
//
// nacitaj(typ, nowMs) → {FMCSV, FM, FIN, CSV} v tvare pôvodných modulov, ale výpočet signálov ide
// cez katalóg: usecases/typy.json (poradie) → usecases/usecases.json (legacy kľúč) → panel/usecases/<id>.js.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import FMCSV from "./jadro/csv.js";
import { zostavSignaly } from "./jadro/signaly.js";
import FM_REALITKA, { CSV as CSV_REALITKA } from "./typy/realitka.js";
import FM_DEVELOPER, { CSV as CSV_DEVELOPER } from "./typy/developer.js";
import FIN from "./financie/fin.js";

const KOREN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const json = (p) => JSON.parse(fs.readFileSync(path.join(KOREN, p), "utf8"));
const KATALOG = json("usecases/usecases.json");
const TYPY = json("usecases/typy.json");

const TYP = {
  realitka: { FM: FM_REALITKA, CSV: CSV_REALITKA, FIN: null },
  developer: { FM: FM_DEVELOPER, CSV: CSV_DEVELOPER, FIN },
};

export function nacitaj(typ, nowMs) {
  const t = TYP[typ];
  if (!t) throw new Error("Neznámy typ: " + typ);
  t.FM.nastavSignaly(zostavSignaly(typ, KATALOG, TYPY, "signaly"));
  if (t.FIN) t.FIN.nastavSignaly(zostavSignaly(typ, KATALOG, TYPY, "financne_signaly"));
  // CSV.toData realitky filtruje „posledných 30 dní“ od teraz: v testoch pevný čas
  const CSV = { ...t.CSV, toData: (raw) => t.CSV.toData(raw, nowMs) };
  return { FMCSV, FM: t.FM, FIN: t.FIN, CSV };
}
