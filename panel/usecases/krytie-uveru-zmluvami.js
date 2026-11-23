// First Mate · use case krytie-uveru-zmluvami · Krytie úveru zmluvami
// Vygenerované z legacy/ (docs/migracia/nastroje/rozdel_legacy.mjs, 2026-11-24), odvtedy sa upravuje ručne.
// Pôvodne: developer f2. Funkcia dostane kontext výpočtu (c) a zapíše výsledok do c.out[c.kluc].
// Katalóg: usecases/usecases.json → krytie-uveru-zmluvami.

export function developer(c) {
  const { kluc: kluc_, out, P, sig } = c;
    { const items = P.filter(p => p.uver && p.krytie.krytie != null).map(p => { const k = p.krytie; const lv = k.krytie < k.kovenant ? "red" : (k.krytie < k.kovenant * (1 + sig[kluc_].buffer / 100) || (k.poDalsej != null && k.poDalsej < k.kovenant) ? "yellow" : "green"); return { projekt: p.kod, ...k, level: lv }; });
      const hit = items.filter(x => x.level !== "green");
      Object.assign(out[kluc_], { buffer: sig[kluc_].buffer, items: hit, all: items, count: hit.length, level: hit.some(x => x.level === "red") ? "red" : (hit.length ? "yellow" : "green") }); }
  return out[kluc_];
}
