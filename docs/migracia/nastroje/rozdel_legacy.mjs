// First Mate · migrácia fáza 4 · JEDNORAZOVÝ generátor výpočtového jadra z pôvodných panelov.
//
//   node docs/migracia/nastroje/rozdel_legacy.mjs
//
// Vyrobí panel/jadro/csv.js, panel/typy/{realitka,developer}.js, panel/financie/fin.js a
// panel/usecases/<id>.js: bloky signálov z FM.compute a FIN.compute sa presunú do modulov
// use casov (podľa usecases/usecases.json → legacy), zvyšok modulov sa prenesie bez zmeny.
// Po vygenerovaní sú súbory v panel/ zdrojom pravdy a upravujú sa ručne. Znovu spustiť len
// zámerne (prepíše ich). Overenie: npm test (panel/golden.mjs ↔ golden).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KOREN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const rd = (p) => fs.readFileSync(path.join(KOREN, p), "utf8");
const wr = (p, t) => { fs.mkdirSync(path.dirname(path.join(KOREN, p)), { recursive: true }); fs.writeFileSync(path.join(KOREN, p), t); console.log("  " + p); };
const katalog = JSON.parse(rd("usecases/usecases.json"));
const idPodlaLegacy = (typ, kluc) => {
  const u = katalog.usecases.find((x) => x.druh === "signal" && x.legacy && x.legacy[typ] === kluc);
  if (!u) throw new Error(`v katalógu chýba signál ${typ} ${kluc}`);
  return u;
};

function iife(html, meno) {
  const l = html.split("\n");
  const a = l.findIndex((r) => r.startsWith(`const ${meno} = (() => {`));
  const b = l.findIndex((r, i) => i > a && r === "})();");
  if (a < 0 || b < 0) throw new Error("modul " + meno);
  return l.slice(a, b + 1);
}
// riadok `function compute(...)` v IIFE a jeho koniec (prvé "  }" za ním)
function rozsahCompute(lines) {
  const a = lines.findIndex((r) => /^  function compute\(/.test(r));
  const b = lines.findIndex((r, i) => i > a && r === "  }");
  return [a, b];
}
// mená definované na najvyššej úrovni IIFE a v úvode compute (kandidáti do kontextu bloku)
function mena(lines, odsadenie) {
  const out = new Set();
  const re = new RegExp(`^${odsadenie}(?:const|let|function)\\s+(\\w+)`);
  for (const r of lines) {
    const m = r.match(re); if (!m) continue;
    out.add(m[1]);
    if (/^\s*(const|let) /.test(r)) {
      // čiarkové deklarácie len na najvyššej úrovni riadku (bez obsahu zátvoriek, reťazcov a šablón)
      let v = r.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""'), p;
      do { p = v; v = v.replace(/\([^()]*\)|\[[^\[\]]*\]|\{[^{}]*\}/g, ""); } while (v !== p);
      for (const x of v.matchAll(/,\s*(\w+)\s*=(?!=)/g)) out.add(x[1]);
    }
  }
  return out;
}
const pouzite = (text, kandidati) => [...kandidati].filter((n) => new RegExp(`(?<![\\w.$])${n}\\b`).test(text));

function blokNaFunkciu(typ, kluc, telo, kandidati, extra) {
  let t = telo.join("\n");
  const krizove = [...t.matchAll(/\bout\.([sf]\d)\b/g)].map((m) => m[1]).filter((x) => x !== kluc);
  if (krizove.length) throw new Error(`${typ} ${kluc}: blok číta iný signál ${krizove}`);
  // kľúč výstupu je v premennej kluc_ (pôvodné bloky používajú vlastné krátke mená, napr. k)
  t = t.replace(new RegExp(`\\bout\\.${kluc}\\b`, "g"), "out[kluc_]")
       .replace(new RegExp(`(?<![\\w.$])(s|sig)\\.${kluc}\\b`, "g"), "$1[kluc_]");
  const men = [...new Set([...extra, ...pouzite(t, kandidati)])].filter((n) => n !== "kluc_");
  return { kod: `export function ${typ}(c) {\n  const { kluc: kluc_, ${men.join(", ")} } = c;\n${t}\n  return out[kluc_];\n}\n`, mena: men };
}

// ---------- FM (realitka, developer) ----------
const signalyModuly = {}; // id -> {typ: kod}
const kontextFM = {};
function spracujFM(typ, html, koniecZnacka) {
  const L = iife(html, "FM");
  const [ca, cb] = rozsahCompute(L);
  const C = L.slice(ca, cb + 1);
  const prvy = C.findIndex((r) => /^    \/\/ S1\b/.test(r));
  const posl = C.findIndex((r) => r.startsWith(koniecZnacka));
  if (prvy < 0 || posl < 0) throw new Error(typ + ": značky blokov");
  const kandidati = new Set([...mena(L, "  "), ...mena(C.slice(0, prvy), "    "), "data", "s", "now"]);
  const pouziteVsetky = new Set();
  let i = prvy;
  while (i < posl) {
    const m = C[i].match(/^    \/\/ (S(\d+))\b/);
    let j = i + 1; while (j < posl && !/^    \/\/ S\d+\b/.test(C[j])) j++;
    const kluc = "s" + m[2];
    const u = idPodlaLegacy(typ, kluc);
    const { kod, mena: men } = blokNaFunkciu(typ, kluc, [`  // ${C[i].trim().slice(3)}`, ...C.slice(i + 1, j)], kandidati, ["out"]);
    men.forEach((n) => pouziteVsetky.add(n));
    (signalyModuly[u.id] = signalyModuly[u.id] || {})[typ] = { kod, kluc, nazov: u.nazov };
    i = j;
  }
  const ctx = [...pouziteVsetky].filter((n) => n !== "out");
  kontextFM[typ] = ctx;
  const volanie = [
    `    // signály z katalógu use casov (panel/usecases/<id>.js), poradie podľa usecases/typy.json`,
    `    const ctx = { out, ${ctx.join(", ")} };`,
    `    for (const [kluc, fn] of SIGNALY) fn({ ...ctx, kluc });`,
  ];
  const novyC = [...C.slice(0, prvy), ...volanie, ...C.slice(posl)];
  let N = [...L.slice(0, ca), ...novyC, ...L.slice(cb + 1)];
  // registrácia signálov
  const ret = N.findIndex((r) => /^  return \{ /.test(r));
  N.splice(ret, 0, "  // [[legacy kľúč, funkcia]] z panel/jadro/signaly.js; nastaví app alebo panel/golden.mjs", "  let SIGNALY = [];", "  function nastavSignaly(z) { SIGNALY = z; }", "");
  const ret2 = N.findIndex((r) => /^  return \{ /.test(r));
  N[ret2] = N[ret2].replace("return { ", "return { nastavSignaly, ");
  return N;
}

function csvDefinicia(html) {
  const l = html.split("\n");
  const a = l.findIndex((r) => r.startsWith("  const CSV = {"));
  const t = l.findIndex((r) => r.startsWith("  CSV.toData = raw =>"));
  let b = t; if (!l[t].trimEnd().endsWith(";")) b = l.findIndex((r, i) => i > t && r === "  };");
  return { csv: l[a].trim(), toData: l.slice(t, b + 1).map((r) => r.replace(/^  /, "")).join("\n") };
}

const HLAVICKA = (popis) => `// First Mate · ${popis}\n// Vygenerované z legacy/ (docs/migracia/nastroje/rozdel_legacy.mjs, 2026-11-24), odvtedy sa upravuje ručne.\n`;

const htmlD = rd("legacy/panel-developer/index.html");
const htmlR = rd("legacy/panel-realitka/index.html");
console.log("Generujem panel/:");

// csv.js
wr("panel/jadro/csv.js", HLAVICKA("CSV loader (spoločný pre všetky typy firiem)") + iife(htmlD, "FMCSV").join("\n") + "\nexport default FMCSV;\n");

// typy
for (const [typ, html, znacka] of [["realitka", htmlR, "    // Horúce ponuky"], ["developer", htmlD, "    // vlastné signály"]]) {
  const N = spracujFM(typ, html, znacka);
  const { csv, toData } = csvDefinicia(html);
  let td = toData;
  if (typ === "realitka") {
    td = td.replace("CSV.toData = raw => {", "CSV.toData = (raw, teraz = Date.now()) => {").replace("const since = Date.now() - 30 * 864e5", "const since = teraz - 30 * 864e5");
    if (!td.includes("teraz - 30")) throw new Error("realitka toData: Date.now sa nenahradil");
  }
  wr(`panel/typy/${typ}.js`, HLAVICKA(`typ firmy ${typ}: normalizácia dát, kontext signálov, texty brífingu a šablóny`) +
    "// Výpočty signálov sú v panel/usecases/<id>.js. Kľúče výstupu (b.s1 …) sú zatiaľ pôvodné kvôli textom.\n" +
    N.join("\n") + `\n\n// definícia CSV súborov (spec, povinné a voliteľné súbory) a prevod na dáta pre FM\nexport ${csv}\n${td}\n\nexport default FM;\n`);
}

// financie (developer)
{
  const L = iife(htmlD, "FIN");
  const [ca, cb] = rozsahCompute(L);
  const C = L.slice(ca, cb + 1);
  const prvy = C.findIndex((r) => /^    \/\/ ---------- úrovne a položky signálov/.test(r)) + 2; // za "const P = out.projekty;"
  const posl = C.findIndex((r) => r === "    return out;");
  const kandidati = new Set([...mena(L, "  "), ...mena(C.slice(0, prvy), "    "), "data", "sig", "today"]);
  const starty = []; for (let i = prvy; i < posl; i++) if (C[i].startsWith("    { const items")) starty.push(i);
  if (starty.length !== 6) throw new Error("FIN: čakal som 6 blokov, je " + starty.length);
  const pouzVs = new Set();
  starty.forEach((a, n) => {
    const b = n < 5 ? starty[n + 1] : posl;
    const kluc = "f" + (n + 1);
    if (!C.slice(a, b).join("\n").includes(`out.${kluc}`)) throw new Error("FIN blok " + kluc);
    const u = idPodlaLegacy("developer", kluc);
    const { kod, mena: men } = blokNaFunkciu("developer", kluc, C.slice(a, b), kandidati, ["out"]);
    men.forEach((x) => pouzVs.add(x));
    signalyModuly[u.id] = { developer: { kod, kluc, nazov: u.nazov } };
  });
  const ctx = [...pouzVs].filter((n) => n !== "out");
  const novyC = [...C.slice(0, prvy), "    // finančné signály z katalógu (panel/usecases/<id>.js), poradie podľa usecases/typy.json", `    const ctx = { out, ${ctx.join(", ")} };`, "    for (const [kluc, fn] of SIGNALY) fn({ ...ctx, kluc });", ...C.slice(posl)];
  let N = [...L.slice(0, ca), ...novyC, ...L.slice(cb + 1)];
  const ret = N.findIndex((r) => /^  return \{ /.test(r));
  N.splice(ret, 0, "  let SIGNALY = [];", "  function nastavSignaly(z) { SIGNALY = z; }", "");
  const r2 = N.findIndex((r) => /^  return \{ /.test(r));
  N[r2] = N[r2].replace("return { ", "return { nastavSignaly, ");
  wr("panel/financie/fin.js", HLAVICKA("finančný model developera (úver, tranže, rozpočet, cash-flow, IRR, stres test)") +
    'import FM from "../typy/developer.js";\n\n' + N.join("\n") + "\n\nexport default FIN;\n");
}

// use casy
for (const [id, typy] of Object.entries(signalyModuly)) {
  const u = katalog.usecases.find((x) => x.id === id);
  const zdroj = Object.entries(typy).map(([t, v]) => `${t} ${v.kluc}`).join(", ");
  let t = HLAVICKA(`use case ${id} · ${u.nazov}`) +
    `// Pôvodne: ${zdroj}. Funkcia dostane kontext výpočtu (c) a zapíše výsledok do c.out[c.kluc].\n` +
    `// Katalóg: usecases/usecases.json → ${id}.\n\n`;
  t += Object.values(typy).map((v) => v.kod).join("\n");
  wr(`panel/usecases/${id}.js`, t);
}

// register
const ids = Object.keys(signalyModuly);
const imp = ids.map((id, i) => `import * as m${i} from "../usecases/${id}.js";`).join("\n");
wr("panel/jadro/signaly.js", HLAVICKA("register use casov a zostavenie signálov pre typ firmy") + imp + `

export const MODULY = {
${ids.map((id, i) => `  "${id}": m${i},`).join("\n")}
};

/**
 * Zoznam [[kľúč výstupu, funkcia]] pre typ firmy v poradí z usecases/typy.json.
 * Kľúč výstupu je zatiaľ pôvodný (s1…, f1…), lebo naň sú viazané texty brífingu.
 * @param {string} typ  id typu firmy
 * @param {object} katalog  obsah usecases/usecases.json
 * @param {object} typy  obsah usecases/typy.json
 * @param {"signaly"|"financne_signaly"} pole
 */
export function zostavSignaly(typ, katalog, typy, pole = "signaly") {
  const t = typy.typy.find((x) => x.id === typ);
  if (!t) throw new Error("neznámy typ firmy " + typ);
  return (t[pole] || []).map((id) => {
    const u = katalog.usecases.find((x) => x.id === id);
    const m = MODULY[id];
    if (!u || !m || typeof m[typ] !== "function") throw new Error(\`use case \${id} nemá výpočet pre typ \${typ}\`);
    return [u.legacy[typ], m[typ]];
  });
}
`);
console.log("Hotovo. Kontext FM:", JSON.stringify(kontextFM));
