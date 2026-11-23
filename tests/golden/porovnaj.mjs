// First Mate · porovnanie výstupov pre golden testy.
//
// rozdiely(ocakavane, skutocne) → zoznam rozdielov {cesta, ocakavane, skutocne}.
// Čísla sa porovnávajú s relatívnou toleranciou 1e-9 (iné poradie sčítania v novom jadre),
// všetko ostatné presne. Chýbajúci kľúč a kľúč s hodnotou undefined sú to isté (JSON ho vynechá).
export const TOLERANCIA = 1e-9;

const rovnakeCislo = (a, b) => a === b || Math.abs(a - b) <= TOLERANCIA * Math.max(1, Math.abs(a), Math.abs(b));

export function rozdiely(o, s, cesta = "", out = []) {
  if (typeof o === "number" && typeof s === "number") {
    if (!rovnakeCislo(o, s)) out.push({ cesta, ocakavane: o, skutocne: s });
    return out;
  }
  if (o === null || s === null || typeof o !== "object" || typeof s !== "object") {
    if (o !== s) out.push({ cesta, ocakavane: o, skutocne: s });
    return out;
  }
  if (Array.isArray(o) !== Array.isArray(s)) { out.push({ cesta, ocakavane: o, skutocne: s }); return out; }
  if (Array.isArray(o)) {
    if (o.length !== s.length) out.push({ cesta: cesta + ".length", ocakavane: o.length, skutocne: s.length });
    for (let i = 0; i < Math.min(o.length, s.length); i++) rozdiely(o[i], s[i], `${cesta}[${i}]`, out);
    return out;
  }
  const kluce = new Set([...Object.keys(o), ...Object.keys(s)]);
  for (const k of kluce) {
    if (o[k] === undefined && s[k] === undefined) continue;
    rozdiely(o[k], s[k], cesta ? `${cesta}.${k}` : k, out);
  }
  return out;
}

const kratko = (v) => { const t = JSON.stringify(v); return t === undefined ? "undefined" : t.length > 120 ? t.slice(0, 117) + "…" : t; };
export function vypisRozdiely(r, max = 25) {
  return r.slice(0, max).map((d) => `  ${d.cesta || "(koreň)"}: čakané ${kratko(d.ocakavane)}, je ${kratko(d.skutocne)}`).join("\n") +
    (r.length > max ? `\n  … a ďalších ${r.length - max}` : "");
}
