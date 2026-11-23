// First Mate · use case stres-test · Stres test
// Vygenerované z legacy/ (docs/migracia/nastroje/rozdel_legacy.mjs, 2026-11-24), odvtedy sa upravuje ručne.
// Pôvodne: developer f6. Funkcia dostane kontext výpočtu (c) a zapíše výsledok do c.out[c.kluc].
// Katalóg: usecases/usecases.json → stres-test.

export function developer(c) {
  const { kluc: kluc_, out, P, sig } = c;
    { const items = P.map(p => { const sc = p.stres.slice(1); const pod = sc.filter(x => p.ciel != null && (x.irrVk == null || x.irrVk < p.ciel)); const strata = sc.filter(x => x.zisk < 0); return { projekt: p.kod, ciel: p.ciel, scenare: p.stres, podCielom: pod.map(x => x.nazov), strata: strata.map(x => x.nazov), najhorsi: sc.slice().sort((a, b) => (a.irrVk ?? -99) - (b.irrVk ?? -99))[0], level: strata.length ? "red" : (pod.length ? "yellow" : "green") }; });
      const hit = items.filter(x => x.level !== "green");
      Object.assign(out[kluc_], { params: sig[kluc_], items: hit, all: items, count: hit.length, level: hit.some(x => x.level === "red") ? "red" : (hit.length ? "yellow" : "green") }); }
  return out[kluc_];
}
