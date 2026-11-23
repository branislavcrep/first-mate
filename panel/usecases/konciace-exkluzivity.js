// First Mate · use case konciace-exkluzivity · Končiace exkluzivity
// Vygenerované z legacy/ (docs/migracia/nastroje/rozdel_legacy.mjs, 2026-11-24), odvtedy sa upravuje ručne.
// Pôvodne: realitka s4. Funkcia dostane kontext výpočtu (c) a zapíše výsledok do c.out[c.kluc].
// Katalóg: usecases/usecases.json → konciace-exkluzivity.

export function realitka(c) {
  const { kluc: kluc_, out, D, addDays, dm, lok, today, active, dop14, obh14, data, s } = c;
  // S4
    {
      const to = addDays(today, s[kluc_].days);
      const cur = data.deals.filter(d => active(d) && d.exkl && d.exklDo && d.exklDo >= today && d.exklDo <= to).sort((a, b) => a.exklDo < b.exklDo ? -1 : 1)
        .map(d => { const o = obh14(d.id), q = dop14(d.id); return { kod: d.kod, lokalita: lok(d.lokalita), makler: d.makler, exklDo: d.exklDo, koniec: dm(d.exklDo), obhliadky14: o, dopyty14: q, rizikova: o === 0 && q === 0, dniDoKonca: Math.round((Date.parse(d.exklDo + "T12:00:00Z") - Date.parse(today + "T12:00:00Z")) / D) }; });
      const pFrom = addDays(today, -s.period), pTo = addDays(to, -s.period);
      const prev = data.deals.filter(d => active(d) && d.exkl && d.exklDo && d.exklDo >= pFrom && d.exklDo <= pTo).length;
      out[kluc_] = { on: s[kluc_].on, days: s[kluc_].days, count: cur.length, prev, items: cur };
      out[kluc_].level = cur.length > 0 ? "yellow" : "green";
    }
  return out[kluc_];
}
