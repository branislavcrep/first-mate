// First Mate · use case obchodne-priestory · Obchodné priestory
// Vygenerované z legacy/ (docs/migracia/nastroje/rozdel_legacy.mjs, 2026-11-24), odvtedy sa upravuje ručne.
// Pôvodne: developer s8. Funkcia dostane kontext výpočtu (c) a zapíše výsledok do c.out[c.kluc].
// Katalóg: usecases/usecases.json → obchodne-priestory.

export function developer(c) {
  const { kluc: kluc_, out, daysBetween, today, shortProj, data, s } = c;
  // S8 obchodné priestory
    {
      const items = data.jednotky.filter(j => j.typ === "Obchodný priestor" && j.stav === "Voľná" && j.ponukaOd && daysBetween(j.ponukaOd, today) >= s[kluc_].days)
        .map(j => { const dd = data.dopyty.filter(d => d.jednotka === j.kod); return { jednotka: j.kod, projekt: shortProj(j.projekt), plocha: j.plocha, cena: j.cena, dniVPonuke: daysBetween(j.ponukaOd, today), predajca: j.predajca,
          dopyty: dd.length, najom: dd.filter(d => d.typZaujmu === "Nájom").length, kupa: dd.filter(d => d.typZaujmu === "Kúpa").length, spatnaVazba: dd.filter(d => d.spatna).map(d => d.spatna).slice(0, 5) }; });
      out[kluc_] = { on: s[kluc_].on, days: s[kluc_].days, items, count: items.length };
      out[kluc_].level = items.length ? "yellow" : "green";
    }
  return out[kluc_];
}
