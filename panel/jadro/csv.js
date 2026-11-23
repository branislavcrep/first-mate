// First Mate · CSV loader (spoločný pre všetky typy firiem)
// Vygenerované z legacy/ (docs/migracia/nastroje/rozdel_legacy.mjs, 2026-11-24), odvtedy sa upravuje ručne.
const FMCSV = (() => {
  const D = 864e5, TZ = "Europe/Bratislava";

  function parse(text) {
    if (text == null) return { header: [], rows: [] };
    text = String(text);
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const firstLine = text.slice(0, (text.indexOf("\n") + 1 || text.length + 1) - 1);
    const delim = firstLine.includes(";") ? ";" : (firstLine.includes("\t") ? "\t" : ",");
    const out = []; let row = [], f = "", q = false, i = 0;
    while (i < text.length) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { f += '"'; i += 2; continue; } q = false; i++; continue; }
        f += c; i++; continue;
      }
      if (c === '"' && f === "") { q = true; i++; continue; }
      if (c === delim) { row.push(f); f = ""; i++; continue; }
      if (c === "\r") { i++; continue; }
      if (c === "\n") { row.push(f); out.push(row); row = []; f = ""; i++; continue; }
      f += c; i++;
    }
    if (f !== "" || row.length) { row.push(f); out.push(row); }
    const rows = out.filter(r => r.some(v => v.trim() !== ""));
    const header = (rows.shift() || []).map(h => h.trim());
    return { header, delim, rows: rows.map(r => { const o = {}; header.forEach((h, k) => o[h] = r[k] == null ? "" : r[k]); return o; }) };
  }

  const toNum = s => { if (s == null) return null; s = String(s).replace(/[\s\u00a0]/g, ""); if (s === "") return null; const n = Number(s.replace(",", ".")); return isNaN(n) ? null : n; };
  const toBool = s => { s = String(s || "").trim().toLowerCase(); return s === "ano" || s === "áno" || s === "true" || s === "1" ? true : (s === "nie" || s === "false" || s === "0" ? false : null); };

  // miestny čas Bratislava -> epoch ms
  function tzOffset(ms) {
    const p = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(ms));
    const g = t => +(p.find(x => x.type === t) || {}).value;
    return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"), g("second")) - Math.floor(ms / 1000) * 1000;
  }
  function localToMs(s) {
    const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) return null;
    const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
    // pri zmene času môže miestny čas existovať dvakrát (alebo vôbec): berieme skorší výskyt, ako Python fold=0
    const cands = [...new Set([tzOffset(guess - 432e5), tzOffset(guess + 432e5)])].map(o => guess - o).filter(ms => ms + tzOffset(ms) === guess);
    return cands.length ? Math.min(...cands) : guess - tzOffset(guess - 432e5);
  }
  const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s);
  const isDateTime = s => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(s);
  const addDays = (ds, n) => new Date(Date.parse(ds + "T12:00:00Z") + n * D).toISOString().slice(0, 10);
  function shiftValue(s, n) {
    if (!n || !s) return s;
    if (isDate(s)) return addDays(s, n);
    if (isDateTime(s)) return addDays(s.slice(0, 10), n) + s.slice(10);
    return s;
  }
  const localDate = ms => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
  const daysBetween = (a, b) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / D);

  // manifest.md: hľadá riadky "export_at: RRRR-MM-DDTHH:MM" a "referencny_datum: RRRR-MM-DD"
  function readManifest(text) {
    text = String(text || "").replace(/^\uFEFF/, "");
    const g = k => { const m = text.match(new RegExp("^\\s*[-*]?\\s*`?" + k + "`?\\s*[:=]\\s*`?([0-9T:\\-]+)`?", "mi")); return m ? m[1] : null; };
    const exportAt = g("export_at");
    const ref = g("referencny_datum") || (exportAt ? exportAt.slice(0, 10) : null);
    return { exportAt, ref };
  }

  // Prevod riadku podľa schémy: {stlpec: "text"|"num"|"bool"|"date"|"datetime"|"multi"}
  function typed(row, schema, shiftDays) {
    const o = {};
    for (const k in row) {
      const t = schema[k] || "text"; let v = row[k];
      if (v === "" || v == null) { o[k] = null; continue; }
      if (t === "num") o[k] = toNum(v);
      else if (t === "bool") o[k] = toBool(v);
      else if (t === "date") o[k] = shiftValue(v.trim(), shiftDays);
      else if (t === "datetime") { const s = shiftValue(v.trim(), shiftDays); const ms = isDateTime(s) ? localToMs(s) : (isDate(s) ? localToMs(s + "T00:00") : null); o[k] = ms == null ? s : new Date(ms).toISOString(); }
      else if (t === "multi") o[k] = v.split("|").map(x => x.trim()).filter(Boolean);
      else o[k] = v;
    }
    return o;
  }

  // Kontrola súboru podľa slovníka: povinné stĺpce, typy hodnôt
  function validate(name, parsed, spec) {
    const errs = [];
    if (!parsed.header.length) { errs.push(`${name}: súbor je prázdny.`); return errs; }
    if (parsed.delim !== ";") errs.push(`${name}: oddeľovač by mal byť bodkočiarka (;), súbor používa „${parsed.delim === "\t" ? "tabulátor" : parsed.delim}“. Načítam ho aj tak.`);
    const miss = spec.required.filter(c => !parsed.header.includes(c));
    if (miss.length) errs.push(`${name}: chýbajú stĺpce ${miss.map(c => "„" + c + "“").join(", ")}.`);
    let bad = 0, ex = "";
    parsed.rows.forEach((r, i) => {
      for (const c of spec.required) {
        const t = spec.schema[c], v = (r[c] || "").trim(); if (!v) continue;
        const ok = t === "num" ? toNum(v) != null : t === "date" ? isDate(v) : t === "datetime" ? (isDateTime(v) || isDate(v)) : t === "bool" ? toBool(v) != null : true;
        if (!ok) { bad++; if (!ex) ex = `riadok ${i + 2}, stĺpec „${c}“: „${v.slice(0, 40)}“ (čaká sa ${({ num: "číslo s desatinnou čiarkou", date: "dátum RRRR-MM-DD", datetime: "dátum a čas RRRR-MM-DDTHH:MM", bool: "ano alebo nie" })[t]})`; }
      }
    });
    if (bad) errs.push(`${name}: ${bad} ${bad === 1 ? "hodnota má" : "hodnôt má"} nesprávny formát, napr. ${ex}.`);
    return errs;
  }

  return { parse, typed, validate, readManifest, shiftValue, localDate, daysBetween, toNum, toBool, localToMs };
})();
export default FMCSV;
