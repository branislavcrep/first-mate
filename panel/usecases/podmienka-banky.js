// First Mate · use case podmienka-banky · Podmienka banky
// Vygenerované z legacy/ (docs/migracia/nastroje/rozdel_legacy.mjs, 2026-11-24), odvtedy sa upravuje ručne.
// Pôvodne: developer s1. Funkcia dostane kontext výpočtu (c) a zapíše výsledok do c.out[c.kluc].
// Katalóg: usecases/usecases.json → podmienka-banky.

export function developer(c) {
  const { kluc: kluc_, out, dmy, projStats, s } = c;
  // S1 podmienka banky
    {
      const items = projStats.filter(p => p.target != null && p.banka !== "splnené").map(p => ({ projekt: p.nazov, kod: p.kod, predane: p.sold, byty: p.byty, predanePct: p.soldPct, cielPct: p.bankaPct, termin: p.bankaDo, terminDm: p.bankaDo ? dmy(p.bankaDo) : "", dni: p.dniDoBanky, chyba: p.chyba, rezervovane: p.rez, predane30: p.sold30,
        riziko: p.dniDoBanky != null && p.dniDoBanky <= s[kluc_].days }));
      out[kluc_] = { on: s[kluc_].on, days: s[kluc_].days, items, count: items.filter(x => x.riziko).length, ok: projStats.filter(p => p.banka === "splnené").map(p => p.nazov) };
      out[kluc_].level = items.some(x => x.riziko && x.dni <= 60) ? "red" : (items.some(x => x.riziko) ? "yellow" : "green");
    }
  return out[kluc_];
}
