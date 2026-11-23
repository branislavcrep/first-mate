// First Mate · use case klientske-zmeny · Klientske zmeny
// Vygenerované z legacy/ (docs/migracia/nastroje/rozdel_legacy.mjs, 2026-11-24), odvtedy sa upravuje ručne.
// Pôvodne: developer s6. Funkcia dostane kontext výpočtu (c) a zapíše výsledok do c.out[c.kluc].
// Katalóg: usecases/usecases.json → klientske-zmeny.

export function developer(c) {
  const { kluc: kluc_, out, daysBetween, dm, today, data, s } = c;
  // S6 klientske zmeny pred uzávierkou
    {
      const items = [];
      data.projekty.forEach(p => {
        if (!p.uzavierka) return; const dni = daysBetween(today, p.uzavierka);
        if (dni < 0 || dni > s[kluc_].days) return;
        const j = data.jednotky.filter(x => x.projekt === p.nazov && x.klientske === "Nevyjadril sa");
        if (j.length) items.push({ projekt: p.nazov, kod: p.kod, uzavierka: dm(p.uzavierka), dni, jednotky: j.map(x => ({ jednotka: x.kod, predajca: x.predajca })) });
      });
      out[kluc_] = { on: s[kluc_].on, days: s[kluc_].days, items, count: items.reduce((x, y) => x + y.jednotky.length, 0) };
      out[kluc_].level = items.some(x => x.dni <= 7) ? "red" : (items.length ? "yellow" : "green");
    }
  return out[kluc_];
}
