// First Mate · use case obhliadky-bez-dalsieho-kroku · Obhliadky bez ďalšieho kroku
// Vygenerované z legacy/ (docs/migracia/nastroje/rozdel_legacy.mjs, 2026-11-24), odvtedy sa upravuje ručne.
// Pôvodne: developer s5. Funkcia dostane kontext výpočtu (c) a zapíše výsledok do c.out[c.kluc].
// Katalóg: usecases/usecases.json → obhliadky-bez-dalsieho-kroku.

export function developer(c) {
  const { kluc: kluc_, out, addDays, daysBetween, dm, today, shortProj, data, s } = c;
  // S5 obhliadky bez ďalšieho kroku
    {
      const lim = addDays(today, -s[kluc_].days);
      const items = data.dopyty.filter(d => d.followUp === "Chýba" && d.obhliadka && d.obhliadka <= lim).sort((a, b) => a.obhliadka < b.obhliadka ? -1 : 1)
        .map(d => ({ dopyt: d.kod, meno: d.meno, jednotka: d.jednotka, projekt: shortProj(d.projekt), predajca: d.predajca, obhliadka: dm(d.obhliadka), dniOdObhliadky: daysBetween(d.obhliadka, today), vysledok: d.vysledok, spatnaVazba: d.spatna, stav: d.stav }));
      const by = {}; items.forEach(x => { by[x.predajca] = (by[x.predajca] || 0) + 1; });
      out[kluc_] = { on: s[kluc_].on, days: s[kluc_].days, items, count: items.length, byPredajca: Object.entries(by).sort((a, b) => b[1] - a[1]).map(([predajca, n]) => ({ predajca, n })) };
      out[kluc_].level = items.length ? "yellow" : "green";
    }
  return out[kluc_];
}
