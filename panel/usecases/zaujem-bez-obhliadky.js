// First Mate · use case zaujem-bez-obhliadky · Záujem bez obhliadky
// Vygenerované z legacy/ (docs/migracia/nastroje/rozdel_legacy.mjs, 2026-11-24), odvtedy sa upravuje ručne.
// Pôvodne: realitka s3. Funkcia dostane kontext výpočtu (c) a zapíše výsledok do c.out[c.kluc].
// Katalóg: usecases/usecases.json → zaujem-bez-obhliadky.

export function realitka(c) {
  const { kluc: kluc_, out, D, lok, dop14, data, s, now } = c;
  // S3
    {
      const since = now - s[kluc_].days * D;
      const withViewing = new Set(data.obhliadky.filter(o => o.datum >= since && o.datum <= now).map(o => o.dealId));
      const c = data.deals.filter(d => d.stage === "Aktívna ponuka" && d.views7 >= s[kluc_].minViews && !withViewing.has(d.id)).sort((a, b) => b.views7 - a.views7)
        .map(d => ({ kod: d.kod, nazov: d.nazov, lokalita: lok(d.lokalita), makler: d.makler, views7: d.views7, cenaM2: d.cenaM2, priemerM2: d.priemerM2, nadPriemerPct: (d.cenaM2 && d.priemerM2) ? Math.round((d.cenaM2 / d.priemerM2 - 1) * 100) : null, dopyty14: dop14(d.id) }));
      out[kluc_] = { on: s[kluc_].on, minViews: s[kluc_].minViews, days: s[kluc_].days, count: c.length, items: c, top: c[0] || null };
      out[kluc_].level = c.length > 0 ? "yellow" : "green";
    }
  return out[kluc_];
}
