// First Mate · use case podmienky-cerpania-tranzi · Podmienky čerpania tranží
// Vygenerované z legacy/ (docs/migracia/nastroje/rozdel_legacy.mjs, 2026-11-24), odvtedy sa upravuje ručne.
// Pôvodne: developer f1. Funkcia dostane kontext výpočtu (c) a zapíše výsledok do c.out[c.kluc].
// Katalóg: usecases/usecases.json → podmienky-cerpania-tranzi.

export function developer(c) {
  const { kluc: kluc_, out, days, P, sig } = c;
    { const items = []; P.forEach(p => p.tranze.forEach(t => { if (!t.cerpana && t.vOkne && t.nesplnene) items.push({ projekt: p.kod, ...t }); }));
      Object.assign(out[kluc_], { days: sig[kluc_].days, items, count: items.length, level: items.some(t => t.dni <= 30) ? "red" : (items.length ? "yellow" : "green") }); }
  return out[kluc_];
}
