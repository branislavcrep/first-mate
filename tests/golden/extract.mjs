// First Mate · vytvorí golden súbory z pôvodných panelov (legacy/).
//
//   node tests/golden/extract.mjs            → tests/golden/realitka.json, tests/golden/developer.json
//   node tests/golden/extract.mjs developer  → len jeden typ
//
// Golden súbory sú zdroj pravdy pre čísla signálov. Prepisovať ich len vtedy, keď sa zmena
// výpočtu schváli (zápis v docs/rozhodnutia.md), nikdy kvôli tomu, aby prešiel test.
import fs from "node:fs";
import path from "node:path";
import { KOREN } from "./legacy.mjs";
import { vypocitaj } from "./vypocet.mjs";

const typy = process.argv.slice(2).length ? process.argv.slice(2) : ["realitka", "developer"];
for (const typ of typy) {
  const out = vypocitaj(typ);
  const ciel = path.join(KOREN, "tests", "golden", `${typ}.json`);
  fs.writeFileSync(ciel, JSON.stringify(out, null, 1) + "\n");
  const sig = Object.entries(out.suhrn).map(([k, v]) => `${k} ${v.level}/${v.count ?? "-"}`).join(", ");
  const fin = out.financie ? " · " + Object.entries(out.financie.suhrn).map(([k, v]) => `${k} ${v.level}/${v.count}`).join(", ") : "";
  console.log(`${typ}: ${path.relative(KOREN, ciel)} · teraz ${out.meta.teraz_miestne} · ${sig}${fin}`);
}
