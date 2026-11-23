// First Mate · use case leziaky · Ležiaky a vypredané typy
// Vygenerované z legacy/ (docs/migracia/nastroje/rozdel_legacy.mjs, 2026-11-24), odvtedy sa upravuje ručne.
// Pôvodne: developer s7. Funkcia dostane kontext výpočtu (c) a zapíše výsledok do c.out[c.kluc].
// Katalóg: usecases/usecases.json → leziaky.

export function developer(c) {
  const { kluc: kluc_, out, daysBetween, ORI, isVzor, today, projStats, shortProj, dop30, data, s } = c;
  // S7 ležiaky a vypredané typy
    {
      const items = data.jednotky.filter(j => j.typ === "Byt" && j.stav === "Voľná" && !isVzor(j) && j.views30 >= s[kluc_].minViews && j.ponukaOd && daysBetween(j.ponukaOd, today) >= s[kluc_].minDays)
        .map(j => ({ jednotka: j.kod, projekt: shortProj(j.projekt), izby: j.izby, podlazie: j.podlazie, orientacia: j.orientacia, exterier: j.exterier, plocha: j.plocha, cena: j.cena, cenaM2: j.cenaM2, zobrazenia30: j.views30, dopyty30: dop30(j.kod), predajca: j.predajca,
          dovody: data.dopyty.filter(d => d.jednotka === j.kod && d.spatna).map(d => d.spatna).slice(0, 3) }))
        .filter(x => x.dopyty30 === 0).sort((a, b) => b.zobrazenia30 - a.zobrazenia30);
      const vypredane = [];
      projStats.forEach(p => p.mix.forEach(m => { if (m.vypredane && m.spolu >= 3) vypredane.push({ projekt: p.kod, typ: m.typ, spolu: m.spolu, predane: m.predane, rezervovane: m.rez }); }));
      const vzor = {}; items.forEach(x => { const k = `${x.izby}-izbové ${ORI[x.orientacia] || x.orientacia}`; vzor[k] = (vzor[k] || 0) + 1; });
      out[kluc_] = { on: s[kluc_].on, minViews: s[kluc_].minViews, minDays: s[kluc_].minDays, items, count: items.length, vypredane, spolocne: Object.entries(vzor).sort((a, b) => b[1] - a[1]).map(([typ, n]) => ({ typ, n })), hodnota: items.reduce((x, y) => x + (y.cena || 0), 0) };
      out[kluc_].level = items.length ? "yellow" : "green";
    }
  return out[kluc_];
}
