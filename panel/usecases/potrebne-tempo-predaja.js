// First Mate · use case potrebne-tempo-predaja · Potrebné tempo predaja
// Vygenerované z legacy/ (docs/migracia/nastroje/rozdel_legacy.mjs, 2026-11-24), odvtedy sa upravuje ručne.
// Pôvodne: developer f3. Funkcia dostane kontext výpočtu (c) a zapíše výsledok do c.out[c.kluc].
// Katalóg: usecases/usecases.json → potrebne-tempo-predaja.

export function developer(c) {
  const { kluc: kluc_, out, P, sig } = c;
    { const items = []; P.forEach(p => p.tempoCiele.forEach(c => { if (c.hit) items.push({ projekt: p.kod, tempo: p.tempo, ...c }); }));
      Object.assign(out[kluc_], { pct: sig[kluc_].pct, items, count: items.length, level: items.some(x => x.typ !== "vypredanie") ? "red" : (items.length ? "yellow" : "green") }); }
  return out[kluc_];
}
