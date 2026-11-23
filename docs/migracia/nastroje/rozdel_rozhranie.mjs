// First Mate · migrácia fáza 4 · JEDNORAZOVÝ generátor rozhrania panela z legacy/panel-developer.
//
//   node docs/migracia/nastroje/rozdel_rozhranie.mjs
//
// Rozdelí legacy/panel-developer/index.html na panel/index.html (značky), panel/styles.css a
// panel/app.js (ES modul, importuje jadro z panel/jadro, panel/typy, panel/financie).
// Dáta a katalóg číta z koreňa repozitára (meta fm-koren, predvolene "../").
// Po vygenerovaní sa súbory upravujú ručne (prepínač typov, realitka, klientsky režim).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KOREN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const L = fs.readFileSync(path.join(KOREN, "legacy/panel-developer/index.html"), "utf8").split("\n");
const wr = (p, t) => { fs.writeFileSync(path.join(KOREN, p), t); console.log("  " + p); };
const najdi = (re, od = 0) => { const i = L.findIndex((r, n) => n >= od && re.test(r)); if (i < 0) throw new Error(String(re)); return i; };

const styleA = najdi(/^<style>$/), styleB = najdi(/^<\/style>$/);
const bodyA = najdi(/^<body>$/);
const skripty = [];
for (let i = bodyA; i < L.length; i++) if (L[i] === "<script>") skripty.push([i, najdi(/^<\/script>$/, i)]);
// 1. skript = dialóg „Architektúra“ (dsOv), posledný = aplikácia
const [dlgA, dlgB] = skripty[0];
const [appA, appB] = skripty[skripty.length - 1];
const telo = L.slice(bodyA + 1, skripty[0][0]);

const HL = "Vygenerované z legacy/panel-developer (docs/migracia/nastroje/rozdel_rozhranie.mjs, 2026-11-24), odvtedy sa upravuje ručne.";
wr("panel/styles.css", `/* First Mate · štýly panela (dizajn Books & Mirror). ${HL} */\n` + L.slice(styleA + 1, styleB).join("\n") + "\n");

const hlavicka = L.slice(0, styleA).map((r) => r.replace("<title>First Mate · ovládací panel developera</title>", "<title>First Mate · panel</title>"));
wr("panel/index.html", [
  ...hlavicka,
  `<!-- First Mate · panel. ${HL} -->`,
  `<meta name="fm-koren" content="../">`,
  `<link rel="stylesheet" href="styles.css">`,
  "</head>",
  "<body>",
  ...telo,
  `<script type="module" src="app.js"></script>`,
  "</body>",
  "</html>",
  "",
].join("\n"));

let app = L.slice(appA + 1, appB);
// CSV definícia je v panel/typy/developer.js
const csvI = app.findIndex((r) => r.startsWith("  const CSV = {"));
const tdI = app.findIndex((r) => r.startsWith("  CSV.toData = raw =>"));
if (csvI < 0 || tdI !== csvI + 1) throw new Error("CSV definícia v app");
app.splice(csvI, 2,
  "  // CSV definícia a toData sú v panel/typy/<typ>.js; dáta sa čítajú z koreňa repozitára (meta fm-koren)",
  "  CSV.dir = KOREN + TYP.data_dir;");
// pred načítaním dát: katalóg a poradie signálov
const bootI = app.findIndex((r) => r.startsWith("  async function boot() {"));
app.splice(bootI + 1, 0, "    await nacitajKatalog();");
const dlg = L.slice(dlgA + 1, dlgB);
wr("panel/app.js", `// First Mate · aplikácia panela (ES modul). ${HL}
import FMCSV from "./jadro/csv.js";
import { zostavSignaly } from "./jadro/signaly.js";
import FM, { CSV } from "./typy/developer.js";
import FIN from "./financie/fin.js";

// koreň repozitára (alebo zverejneného artefaktu) s data/ a usecases/
const KOREN = (document.querySelector('meta[name="fm-koren"]') || {}).content ?? "../";
const TYP_ID = "developer";
let TYP = { id: TYP_ID, data_dir: "data/developer/" };
async function nacitajKatalog() {
  const [katalog, typy] = await Promise.all(["usecases/usecases.json", "usecases/typy.json"].map((p) => fetch(KOREN + p, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error(\`Katalóg \${p} sa nepodarilo načítať (\${r.status}).\`);
    return r.json();
  })));
  TYP = typy.typy.find((t) => t.id === TYP_ID) || TYP;
  CSV.dir = KOREN + TYP.data_dir;
  FM.nastavSignaly(zostavSignaly(TYP_ID, katalog, typy, "signaly"));
  FIN.nastavSignaly(zostavSignaly(TYP_ID, katalog, typy, "financne_signaly"));
}

// dialóg Architektúra
${dlg.join("\n")}

${app.join("\n")}
`);
