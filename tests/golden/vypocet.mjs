// First Mate · výpočet signálov pre golden testy.
//
// Postup kopíruje pôvodný panel (funkcia buildData v legacy/*/index.html):
// CSV → FMCSV.parse → FMCSV.validate → FMCSV.typed(schema, posun 0) → CSV.toData → (developer) FIN.normalize,
// potom FM.compute(data, signals, now), FM.fallbackTexts, a pre developera FIN.compute(data, signals, dnes).
// Hranice signálov = predvolené (mergeSettings({}) v paneli). Dátumy sa neposúvajú.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { KOREN, PANELY, nacitajLegacy } from "./legacy.mjs";

// „Teraz“ pre golden testy: referenčný dátum z manifestu, 18:00 miestneho času (Europe/Bratislava).
// 18:00 je po poslednom zázname v dátach (realitka 3. 11. 13:45, developer 2. 11. 08:40).
export const CAS_DNA = "18:00";

const sha = (b) => crypto.createHash("sha256").update(b).digest("hex").slice(0, 16);
const klon = (x) => JSON.parse(JSON.stringify(x));

export function dataDir(typ) { return path.join(KOREN, "data", typ); }

export function manifest(typ, FMCSV) {
  return FMCSV.readManifest(fs.readFileSync(path.join(dataDir(typ), "manifest.md"), "utf8"));
}

function nacitajTexty(typ, CSV) {
  const texts = {};
  for (const file of Object.values(CSV.files)) texts[file] = fs.readFileSync(path.join(dataDir(typ), file), "utf8");
  for (const file of Object.values(CSV.optional || {})) {
    const p = path.join(dataDir(typ), file);
    if (fs.existsSync(p)) texts[file] = fs.readFileSync(p, "utf8");
  }
  return texts;
}

function buildData(M, texts) {
  const { FMCSV, CSV, FIN } = M;
  const raw = {}, errs = [], missing = [];
  const opt = CSV.optional || {};
  for (const [key, file] of Object.entries({ ...CSV.files, ...opt })) {
    if (opt[key] && !texts[file]) { raw[key] = []; missing.push(file); continue; }
    const p = FMCSV.parse(texts[file]);
    const spec = CSV.spec[file];
    FMCSV.validate(file, p, spec).forEach((e) => errs.push(e));
    raw[key] = p.rows.map((r) => ({ attributes: FMCSV.typed(r, spec.schema, 0) }));
  }
  const data = CSV.toData(raw);
  if (FIN) { data.fin = FIN.normalize(raw); data.finMissing = missing; }
  data.warn = errs;
  return data;
}

function predvoleneSignaly(typ, M) {
  const { FM, FIN } = M;
  if (typ === "developer") {
    const sig = {};
    FM.KEYS.forEach((k) => (sig[k] = { ...FM.DEFAULTS.signals[k] }));
    FIN.KEYS.forEach((k) => (sig[k] = { ...FIN.DEFAULTS[k] }));
    sig.custom = [];
    return sig;
  }
  return klon(FM.DEFAULTS.signals);
}

// Položka v súhrne: ID + jej číselné polia (hlavné čísla). Celý výstup je v `vystup`.
const ID_POLIA = ["dopyt", "jednotka", "kod", "id", "tranza", "projekt", "makler", "predajca", "nazov"];
function polozka(x) {
  if (x == null || typeof x !== "object") return { id: x };
  const k = ID_POLIA.find((p) => x[p] != null && typeof x[p] !== "object");
  let id = k ? String(x[k]) : null;
  if (k === "projekt" && typeof x.typ === "string") id += " · " + x.typ;
  const o = { id };
  for (const [p, v] of Object.entries(x)) if (typeof v === "number" || typeof v === "boolean") o[p] = v;
  return o;
}
function suhrn(vystup, kluce) {
  const o = {};
  for (const k of kluce) {
    const s = vystup[k];
    if (!s) continue;
    o[k] = { on: s.on, level: s.level, count: s.count, polozky: (s.items || []).map(polozka) };
  }
  return o;
}

/**
 * Spustí výpočet pre typ firmy. `implementacia` = funkcia (typ, nowMs) → moduly v tvare legacy
 * ({FMCSV, FM, FIN, CSV}); predvolene pôvodný panel. Nové jadro (fáza 4) dodá vlastnú.
 */
export function vypocitaj(typ, implementacia = nacitajLegacy) {
  // najprv zistiť referenčný dátum (FMCSV nezávisí od času)
  const M0 = implementacia(typ, 0);
  const man = manifest(typ, M0.FMCSV);
  const nowMs = M0.FMCSV.localToMs(`${man.ref}T${CAS_DNA}`);
  const M = implementacia(typ, nowMs);
  const texts = nacitajTexty(typ, M.CSV);
  const data = buildData(M, texts);
  const signals = predvoleneSignaly(typ, M);
  const b = M.FM.compute(data, signals, nowMs);
  const out = {
    meta: {
      typ,
      referencny_datum: man.ref,
      teraz: new Date(nowMs).toISOString(),
      teraz_miestne: `${man.ref} ${CAS_DNA} Europe/Bratislava`,
      posun_dni: 0,
      zdroj_vypoctu: PANELY[typ].html,
      data: Object.fromEntries(Object.entries(texts).map(([f, t]) => [f, sha(t)])),
      upozornenia_csv: data.warn,
    },
    signaly_nastavenia: signals,
    suhrn: suhrn(b, Object.keys(b).filter((k) => /^s\d+$/.test(k))),
    vystup: klon({ ...b, settings: undefined }),
    texty: klon(M.FM.fallbackTexts(b)),
  };
  if (M.FIN) {
    const f = M.FIN.compute(data, signals, M.FM.localParts(nowMs).date);
    out.financie = { suhrn: suhrn(f, M.FIN.KEYS), vystup: klon(f), texty: klon(M.FIN.fallbackTexts(f)) };
  }
  return out;
}
