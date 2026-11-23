// First Mate · use case zalohy-po-splatnosti · Zálohy po splatnosti
// Vygenerované z legacy/ (docs/migracia/nastroje/rozdel_legacy.mjs, 2026-11-24), odvtedy sa upravuje ručne.
// Pôvodne: developer s2. Funkcia dostane kontext výpočtu (c) a zapíše výsledok do c.out[c.kluc].
// Katalóg: usecases/usecases.json → zalohy-po-splatnosti.

export function developer(c) {
  const { kluc: kluc_, out, addDays, daysBetween, dm, today, shortProj, data, s } = c;
  // S2 zálohy po splatnosti
    {
      const lim = addDays(today, -s[kluc_].graceDays);
      const items = data.jednotky.filter(j => j.zalohaUhradena === "Nie" && j.zalohaSplatna && j.zalohaSplatna < lim).sort((a, b) => a.zalohaSplatna < b.zalohaSplatna ? -1 : 1)
        .map(j => ({ jednotka: j.kod, projekt: shortProj(j.projekt), predajca: j.predajca, suma: j.zaloha || 0, splatna: dm(j.zalohaSplatna), dniPo: daysBetween(j.zalohaSplatna, today) }));
      out[kluc_] = { on: s[kluc_].on, graceDays: s[kluc_].graceDays, items, count: items.length, suma: items.reduce((x, y) => x + y.suma, 0) };
      out[kluc_].level = items.length ? "red" : "green";
    }
  return out[kluc_];
}
