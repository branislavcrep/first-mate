// First Mate · use case irr-projektu · IRR projektu a vlastného kapitálu
// Vygenerované z legacy/ (docs/migracia/nastroje/rozdel_legacy.mjs, 2026-11-24), odvtedy sa upravuje ručne.
// Pôvodne: developer f5. Funkcia dostane kontext výpočtu (c) a zapíše výsledok do c.out[c.kluc].
// Katalóg: usecases/usecases.json → irr-projektu.

export function developer(c) {
  const { kluc: kluc_, out, P, sig } = c;
    { const items = P.map(p => { const i = p.irr; const lv = (i.ciel != null && (i.vk == null || i.vk < i.ciel)) ? "red" : (i.p != null && i.pBp != null && i.p - i.pBp < -sig[kluc_].pp ? "yellow" : "green"); return { projekt: p.kod, ...i, level: lv }; });
      const hit = items.filter(x => x.level !== "green");
      Object.assign(out[kluc_], { pp: sig[kluc_].pp, items: hit, all: items, count: hit.length, level: hit.some(x => x.level === "red") ? "red" : (hit.length ? "yellow" : "green") }); }
  return out[kluc_];
}
