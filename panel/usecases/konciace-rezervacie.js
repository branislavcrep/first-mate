// First Mate · use case konciace-rezervacie · Končiace rezervácie
// Vygenerované z legacy/ (docs/migracia/nastroje/rozdel_legacy.mjs, 2026-11-24), odvtedy sa upravuje ručne.
// Pôvodne: developer s3. Funkcia dostane kontext výpočtu (c) a zapíše výsledok do c.out[c.kluc].
// Katalóg: usecases/usecases.json → konciace-rezervacie.

export function developer(c) {
  const { kluc: kluc_, out, addDays, daysBetween, dm, today, shortProj, data, s } = c;
  // S3 rezervácie končia alebo vypršali
    {
      const to = addDays(today, s[kluc_].days);
      const items = data.jednotky.filter(j => j.stav === "Rezervovaná" && j.rezDo && j.rezDo <= to).sort((a, b) => a.rezDo < b.rezDo ? -1 : 1)
        .map(j => { const zaujemca = data.dopyty.find(d => d.jednotka === j.kod && d.stav === "Rezervácia"); return { jednotka: j.kod, projekt: shortProj(j.projekt), predajca: j.predajca, do: dm(j.rezDo), dni: daysBetween(today, j.rezDo), vyprsala: j.rezDo < today, cena: j.cena, zaujemca: zaujemca ? zaujemca.meno : "", followUp: zaujemca ? zaujemca.followUp : "" }; });
      out[kluc_] = { on: s[kluc_].on, days: s[kluc_].days, items, count: items.length, vyprsane: items.filter(x => x.vyprsala).length };
      out[kluc_].level = items.some(x => x.vyprsala || x.dni <= 2) ? "red" : (items.length ? "yellow" : "green");
    }
  return out[kluc_];
}
