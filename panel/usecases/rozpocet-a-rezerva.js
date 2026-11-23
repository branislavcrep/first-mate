// First Mate · use case rozpocet-a-rezerva · Rozpočet a rezerva
// Vygenerované z legacy/ (docs/migracia/nastroje/rozdel_legacy.mjs, 2026-11-24), odvtedy sa upravuje ručne.
// Pôvodne: developer f4. Funkcia dostane kontext výpočtu (c) a zapíše výsledok do c.out[c.kluc].
// Katalóg: usecases/usecases.json → rozpocet-a-rezerva.

export function developer(c) {
  const { kluc: kluc_, out, P, sig } = c;
    { const items = []; P.forEach(p => { const r = p.rozpocet; const flags = [];
        if (r.rezerva && r.pouzita > r.rezerva) flags.push({ typ: "rezerva", level: "red" });
        else if (r.pouzitaPct != null && r.pouzitaPct - r.dokoncenie > sig[kluc_].rezPp) flags.push({ typ: "rezerva", level: "yellow" });
        if (r.vkTreba > r.vkZostava) flags.push({ typ: "financovanie", level: "red" });
        if (r.nadTol.length) flags.push({ typ: "polozky", level: "yellow" });
        if (flags.length) items.push({ projekt: p.kod, flags, level: flags.some(f => f.level === "red") ? "red" : "yellow", ...r }); });
      Object.assign(out[kluc_], { tol: sig[kluc_].tol, rezPp: sig[kluc_].rezPp, items, count: items.length, level: items.some(x => x.level === "red") ? "red" : (items.length ? "yellow" : "green") }); }
  return out[kluc_];
}
