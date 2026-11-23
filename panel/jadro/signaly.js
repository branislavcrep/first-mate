// First Mate · register use casov a zostavenie signálov pre typ firmy
// Vygenerované z legacy/ (docs/migracia/nastroje/rozdel_legacy.mjs, 2026-11-24), odvtedy sa upravuje ručne.
import * as m0 from "../usecases/dopyty-bez-reakcie.js";
import * as m1 from "../usecases/cas-prvej-reakcie.js";
import * as m2 from "../usecases/zaujem-bez-obhliadky.js";
import * as m3 from "../usecases/konciace-exkluzivity.js";
import * as m4 from "../usecases/podmienka-banky.js";
import * as m5 from "../usecases/zalohy-po-splatnosti.js";
import * as m6 from "../usecases/konciace-rezervacie.js";
import * as m7 from "../usecases/obhliadky-bez-dalsieho-kroku.js";
import * as m8 from "../usecases/klientske-zmeny.js";
import * as m9 from "../usecases/leziaky.js";
import * as m10 from "../usecases/obchodne-priestory.js";
import * as m11 from "../usecases/podmienky-cerpania-tranzi.js";
import * as m12 from "../usecases/krytie-uveru-zmluvami.js";
import * as m13 from "../usecases/potrebne-tempo-predaja.js";
import * as m14 from "../usecases/rozpocet-a-rezerva.js";
import * as m15 from "../usecases/irr-projektu.js";
import * as m16 from "../usecases/stres-test.js";

export const MODULY = {
  "dopyty-bez-reakcie": m0,
  "cas-prvej-reakcie": m1,
  "zaujem-bez-obhliadky": m2,
  "konciace-exkluzivity": m3,
  "podmienka-banky": m4,
  "zalohy-po-splatnosti": m5,
  "konciace-rezervacie": m6,
  "obhliadky-bez-dalsieho-kroku": m7,
  "klientske-zmeny": m8,
  "leziaky": m9,
  "obchodne-priestory": m10,
  "podmienky-cerpania-tranzi": m11,
  "krytie-uveru-zmluvami": m12,
  "potrebne-tempo-predaja": m13,
  "rozpocet-a-rezerva": m14,
  "irr-projektu": m15,
  "stres-test": m16,
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
    if (!u || !m || typeof m[typ] !== "function") throw new Error(`use case ${id} nemá výpočet pre typ ${typ}`);
    return [u.legacy[typ], m[typ]];
  });
}
