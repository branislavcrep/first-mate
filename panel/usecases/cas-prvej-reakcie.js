// First Mate · use case cas-prvej-reakcie · Čas prvej reakcie
// Vygenerované z legacy/ (docs/migracia/nastroje/rozdel_legacy.mjs, 2026-11-24), odvtedy sa upravuje ručne.
// Pôvodne: realitka s2. Funkcia dostane kontext výpočtu (c) a zapíše výsledok do c.out[c.kluc].
// Katalóg: usecases/usecases.json → cas-prvej-reakcie.

export function realitka(c) {
  const { kluc: kluc_, out, mean, P, data, s, now } = c;
  // S2
    {
      const cur = data.dopyty.filter(d => d.prijaty >= now - P && d.prijaty < now && d.hodiny != null);
      const prev = data.dopyty.filter(d => d.prijaty >= now - 2 * P && d.prijaty < now - P && d.hodiny != null);
      const per = {}; cur.forEach(d => { (per[d.makler] = per[d.makler] || []).push(d.hodiny); });
      const perM = Object.entries(per).map(([makler, a]) => ({ makler, hodiny: mean(a), n: a.length })).sort((a, b) => b.hodiny - a.hodiny);
      const m = mean(cur.map(d => d.hodiny)), pm = mean(prev.map(d => d.hodiny));
      out[kluc_] = { on: s[kluc_].on, fastHours: s[kluc_].fastHours, mean: m, prev: pm, perMakler: perM, fast: perM.filter(x => x.hodiny <= s[kluc_].fastHours).length, slowest: perM[0] || null };
      out[kluc_].level = m == null ? "green" : (m <= s[kluc_].fastHours ? "green" : (pm != null && m > pm * 1.25 ? "red" : "yellow"));
    }
  return out[kluc_];
}
