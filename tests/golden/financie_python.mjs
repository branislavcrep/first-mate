// First Mate · krížová kontrola F1–F6: JS FIN.compute (z golden výstupu) ↔ referenčný model
// v Pythone (tools/first_mate_financny_model.py, funkcia signals) ↔ overené čísla z legacy/README.md.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { KOREN } from "./legacy.mjs";

// Python zaokrúhľuje niektoré sumy a pomery; JS hodnotu zaokrúhlime na rovnaký počet desatinných miest.
function rovnake(py, js) {
  if (py === null || py === undefined) return js === null || js === undefined;
  if (typeof py === "number" && typeof js === "number") {
    const des = (String(py).split(".")[1] || "").length;
    const f = 10 ** des;
    return Math.abs(Math.round(js * f) / f - py) < 1e-9 || Math.abs(js - py) < 1e-9;
  }
  return py === js;
}

export function pythonSignaly(dataDir, dnes) {
  const kod = `import sys,json,datetime as dt;sys.path.insert(0,${JSON.stringify(path.join(KOREN, "tools"))});` +
    `import first_mate_financny_model as m;print(json.dumps(m.signals(${JSON.stringify(dataDir)},dt.date.fromisoformat(${JSON.stringify(dnes)}))))`;
  return JSON.parse(execFileSync("python3", ["-I", "-c", kod], { encoding: "utf8" }));
}

/** Vráti zoznam nezhôd medzi Pythonom a JS (prázdny = zhoda) a počet porovnaných hodnôt. */
export function porovnajSPythonom(fin, py) {
  const chyby = [];
  let pocet = 0;
  const cmp = (kde, p, j) => { pocet++; if (!rovnake(p, j)) chyby.push(`${kde}: Python ${JSON.stringify(p)}, JS ${JSON.stringify(j)}`); };
  for (const P of fin.projekty) {
    const r = py[P.kod];
    if (!r) { chyby.push(`${P.kod}: projekt chýba v Python výstupe`); continue; }
    for (const k of ["sold", "byty", "soldPct", "zmluvy", "cerpane"]) cmp(`${P.kod}.${k}`, r[k], P[k]);
    cmp(`${P.kod}.tempo (predané za 90 dní / 3)`, r.tempo, P.sold90 / 3);
    // F1 · tranže a podmienky čerpania
    for (const t of r.f1) {
      const j = P.tranze.find((x) => x.id === t.tranza);
      if (!j) { chyby.push(`${P.kod}.f1 ${t.tranza}: chýba v JS`); continue; }
      cmp(`${t.tranza}.dni`, t.dni, j.dni); cmp(`${t.tranza}.v_okne`, t.v_okne, j.vOkne); cmp(`${t.tranza}.nesplnene`, t.nesplnene, j.nesplnene);
      cmp(`${t.tranza}.projekcia`, t.projekcia, j.projekcia); cmp(`${t.tranza}.oneskorenie_dni`, t.oneskorenie_dni, j.oneskorenie); cmp(`${t.tranza}.dopad_vk`, t.dopad_vk, j.dopadVk);
      for (const c of t.podmienky) {
        const jc = (j.podmienky || []).find((x) => x.id === c.id);
        if (!jc) { chyby.push(`${t.tranza}.${c.id}: chýba v JS`); continue; }
        cmp(`${c.id}.ok`, c.ok, jc.ok);
        if ("hodnota" in c) cmp(`${c.id}.hodnota`, c.hodnota, jc.hodnota);
        if ("chyba_zmluv" in c) cmp(`${c.id}.chyba_zmluv`, c.chyba_zmluv, jc.chybaZmluv);
        if ("chyba_eur" in c) cmp(`${c.id}.chyba_eur`, c.chyba_eur, jc.chybaEur);
      }
    }
    // F2 · krytie úveru zmluvami
    cmp(`${P.kod}.f2.krytie`, r.f2.krytie, P.krytie.krytie); cmp(`${P.kod}.f2.kovenant`, r.f2.kovenant, P.krytie.kovenant);
    cmp(`${P.kod}.f2.po_dalsej`, r.f2.po_dalsej, P.krytie.poDalsej); cmp(`${P.kod}.f2.chyba_po`, r.f2.chyba_po, P.krytie.chybaPo);
    // F3 · potrebné tempo predaja
    cmp(`${P.kod}.f3.pocet_cielov`, r.f3.length, P.tempoCiele.length);
    for (const c of r.f3) {
      const j = P.tempoCiele.find((x) => (c.ciel === "banka" && x.typ === "banka") || (c.ciel === "vypredanie" && x.typ === "vypredanie") || (x.typ === "tranza" && c.ciel === "tranza " + x.tranza));
      if (!j) { chyby.push(`${P.kod}.f3 ${c.ciel}: chýba v JS`); continue; }
      for (const k of ["chyba", "dni", "potrebne", "hit", "projekcia"]) cmp(`${P.kod}.f3 ${c.ciel}.${k}`, c[k], j[k]);
    }
    // F4 · rozpočet a rezerva
    const R = P.rozpocet;
    const map4 = { rezerva: "rezerva", pouzita: "pouzita", pouzita_pct: "pouzitaPct", dokoncenie_stavby: "dokoncenie", naklady_do_dokoncenia: "nakladyDoDokoncenia", vk_treba: "vkTreba", vk_zostava: "vkZostava" };
    for (const [p, j] of Object.entries(map4)) cmp(`${P.kod}.f4.${p}`, r.f4[p], R[j]);
    cmp(`${P.kod}.f4.nad_tol`, JSON.stringify(r.f4.nad_tol), JSON.stringify(R.nadTol.map((x) => [x.id, x.odchylka])));
    // F5 · IRR
    const map5 = { irr_p_bp: "pBp", irr_p: "p", irr_vk_bp: "vkBp", irr_vk: "vk", irr_p_mix: "pMix", zisk_bp: "ziskBp", zisk: "zisk", ciel: "ciel" };
    for (const [p, j] of Object.entries(map5)) cmp(`${P.kod}.f5.${p}`, r.f5[p], P.irr[j]);
    // F6 · stres test
    for (const [k, v] of Object.entries(r.f6)) {
      const s = P.stres.find((x) => x.k === k);
      if (!s) { chyby.push(`${P.kod}.f6 ${k}: chýba v JS`); continue; }
      cmp(`${P.kod}.f6.${k}.irr_p`, v.irr_p, s.irrP); cmp(`${P.kod}.f6.${k}.irr_vk`, v.irr_vk, s.irrVk); cmp(`${P.kod}.f6.${k}.zisk`, v.zisk, s.zisk);
    }
  }
  return { chyby, pocet };
}

// Overené čísla z legacy/README.md (golden príbeh k 2. 11. 2026, bez posunu dátumov).
export function porovnajSReadme(fin) {
  const P = (k) => fin.projekty.find((p) => p.kod === k);
  const T = (k, id) => P(k).tranze.find((t) => t.id === id);
  const C = (k, t, id) => T(k, t).podmienky.find((c) => c.id === id);
  const KONTROLY = [
    ["PL: T-PL-4 suma 1 200 000 €", () => T("PL", "T-PL-4").suma, 1200000],
    ["PL: T-PL-4 plánované čerpanie 25. 11.", () => T("PL", "T-PL-4").plan, "2026-11-25"],
    ["PL: T-PL-4 má 2 nesplnené podmienky", () => T("PL", "T-PL-4").nesplnene, 2],
    ["PL: krytie po čerpaní 1,39×", () => C("PL", "T-PL-4", "PC02").hodnota, 1.39],
    ["PL: požadované krytie 1,45×", () => C("PL", "T-PL-4", "PC02").ciel, 1.45],
    ["PL: chýbajú zmluvy za 319 500 €", () => C("PL", "T-PL-4", "PC02").chybaEur, 319500],
    ["PL: potvrdený rozpočet TDI nesplnený", () => C("PL", "T-PL-4", "PC04").ok, false],
    ["PL: rezerva minutá na 106,7 %", () => P("PL").rozpocet.pouzitaPct, 106.7],
    ["PL: dokončenie stavby 53,9 %", () => P("PL").rozpocet.dokoncenie, 53.9],
    ["PL: IRR VK 23,9 %", () => P("PL").irr.vk, 23.9],
    ["PL: IRR VK plán 22,4 %", () => P("PL").irr.vkBp, 22.4],
    ["PL: cieľ IRR VK 18 %", () => P("PL").irr.ciel, 18],
    ["PL: stres „všetko naraz“ IRR VK 14,6 %", () => P("PL").stres.find((s) => s.k === "spolu").irrVk, 14.6],
    ["NZ: T-NZ-2 o 49 dní neskôr", () => T("NZ", "T-NZ-2").oneskorenie, 49],
    ["NZ: T-NZ-2 +33 800 € vlastných zdrojov", () => T("NZ", "T-NZ-2").dopadVk, 33800],
    ["NZ: krytie po čerpaní T-NZ-2 0,78×", () => P("NZ").krytie.poDalsej, 0.78],
    ["NZ: kovenant 1,2×", () => P("NZ").krytie.kovenant, 1.2],
    ["NZ: IRR VK 15,0 %", () => P("NZ").irr.vk, 15],
    ["NZ: IRR VK plán 21,4 %", () => P("NZ").irr.vkBp, 21.4],
    ["NZ: cieľ IRR VK 18 %", () => P("NZ").irr.ciel, 18],
  ];
  const chyby = [];
  for (const [nazov, f, ciel] of KONTROLY) {
    let v; try { v = f(); } catch (e) { v = "chyba: " + e.message; }
    if (v !== ciel) chyby.push(`${nazov}: čakané ${JSON.stringify(ciel)}, je ${JSON.stringify(v)}`);
  }
  return { chyby, pocet: KONTROLY.length };
}
