// First Mate · use case dopyty-bez-reakcie · Dopyty bez reakcie
// Vygenerované z legacy/ (docs/migracia/nastroje/rozdel_legacy.mjs, 2026-11-24), odvtedy sa upravuje ručne.
// Pôvodne: realitka s1, developer s4. Funkcia dostane kontext výpočtu (c) a zapíše výsledok do c.out[c.kluc].
// Katalóg: usecases/usecases.json → dopyty-bez-reakcie.

export function realitka(c) {
  const { kluc: kluc_, out, H, lok, P, dealById, byMakler, data, s, now } = c;
  // S1
    {
      const lim = s[kluc_].hours * H;
      const cur = data.dopyty.filter(d => d.stav === "nový – bez reakcie" && d.prijaty < now - lim);
      const prev = data.dopyty.filter(d => d.prijaty < now - P - lim && (d.reakcia == null || d.reakcia > now - P));
      out[kluc_] = { on: s[kluc_].on, hours: s[kluc_].hours, count: cur.length, prev: prev.length, byMakler: byMakler(cur),
        items: cur.sort((a, b) => a.prijaty - b.prijaty).map(d => ({ kod: d.kod, makler: d.makler, nehnutelnost: (dealById.get(d.dealId) || {}).kod || "", lokalita: lok((dealById.get(d.dealId) || {}).lokalita), hodinBezReakcie: Math.round((now - d.prijaty) / H) })) };
      out[kluc_].level = cur.length > 0 ? "red" : "green";
    }
  return out[kluc_];
}

export function developer(c) {
  const { kluc: kluc_, out, PREDAJCOVIA, OPEN, H, mean, shortProj, data, s, now } = c;
  // S4 dopyty bez reakcie + vyťaženosť predajcov
    {
      const lim = s[kluc_].hours * H;
      const cur = data.dopyty.filter(d => d.stav === "Nový – bez reakcie" && d.prijaty && d.prijaty < now - lim).sort((a, b) => a.prijaty - b.prijaty);
      const by = {}; cur.forEach(d => { by[d.predajca] = (by[d.predajca] || 0) + 1; });
      const predajcovia = PREDAJCOVIA.concat(Object.keys(by).filter(x => !PREDAJCOVIA.includes(x))).map(p => {
        const mine = data.dopyty.filter(d => d.predajca === p);
        const h = mine.filter(d => d.hodiny != null).map(d => d.hodiny);
        return { predajca: p, otvorene: mine.filter(d => OPEN.includes(d.stav)).length, bezReakcie: by[p] || 0, priemerHodin: mean(h), dopytov: mine.length };
      }).filter(x => x.dopytov > 0);
      out[kluc_] = { on: s[kluc_].on, hours: s[kluc_].hours, count: cur.length, byPredajca: Object.entries(by).sort((a, b) => b[1] - a[1]).map(([predajca, n]) => ({ predajca, n })), predajcovia,
        items: cur.map(d => ({ dopyt: d.kod, meno: d.meno, jednotka: d.jednotka, projekt: shortProj(d.projekt), predajca: d.predajca, typZaujmu: d.typZaujmu, zdroj: d.zdroj, hodinBezReakcie: Math.round((now - d.prijaty) / H) })),
        priemerTimu: mean(data.dopyty.filter(d => d.hodiny != null).map(d => d.hodiny)) };
      out[kluc_].level = cur.length ? "red" : "green";
    }
  return out[kluc_];
}
