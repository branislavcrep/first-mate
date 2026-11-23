// First Mate · typ firmy developer: normalizácia dát, kontext signálov, texty brífingu a šablóny
// Vygenerované z legacy/ (docs/migracia/nastroje/rozdel_legacy.mjs, 2026-11-24), odvtedy sa upravuje ručne.
// Výpočty signálov sú v panel/usecases/<id>.js. Kľúče výstupu (b.s1 …) sú zatiaľ pôvodné kvôli textom.
const FM = (() => {
  const OBJ = { projekty: "dev_projekty", jednotky: "dev_jednotky", dopyty: "dev_dopyty" };
  const SLACK_CHANNEL = "C0CDY6XG8MR";
  const SLACK_NAME = "#first-mate-developer";
  const CMD = "/first-mate-dev";
  const PREDAJCOVIA = ["Martina Vargová", "Michal Hrnčiar", "Zuzana Polakovičová"];
  const SOLD = ["Zmluva o budúcej", "Kúpna zmluva", "Odovzdaná"];
  const OPEN = ["Nový – bez reakcie", "Kontaktovaný", "Obhliadka dohodnutá", "Obhliadka prebehla"];
  const H = 3600e3, D = 24 * H;
  const TZ = "Europe/Bratislava";
  const KEYS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"];

  // ---------- vlastné signály: katalóg polí a pravidlá ----------
  const SOURCES = { jednotky: "Jednotky", dopyty: "Dopyty", projekty: "Projekty" };
  const FIELDS = {
    jednotky: [["kod", "Kód jednotky", "text"], ["projekt", "Projekt", "text"], ["typ", "Typ", "text"], ["izby", "Počet izieb", "num"], ["podlazie", "Podlažie", "num"], ["orientacia", "Orientácia", "text"], ["plocha", "Plocha m²", "num"], ["exterier", "Exteriér", "text"], ["cena", "Cena s DPH €", "num"], ["cenaM2", "Cena za m² €", "num"], ["stav", "Stav", "text"], ["predajca", "Predajca", "text"], ["zmena", "Dátum zmeny stavu", "date"], ["rezDo", "Rezervácia do", "date"], ["zalohaSplatna", "Záloha splatná", "date"], ["zaloha", "Záloha €", "num"], ["zalohaUhradena", "Záloha uhradená", "text"], ["klientske", "Klientske zmeny", "text"], ["views30", "Zobrazenia za 30 dní", "num"], ["dopyty30", "Dopyty za 30 dní", "num"], ["ponukaOd", "V ponuke od", "date"], ["poznamka", "Poznámka", "text"]],
    dopyty: [["kod", "Kód dopytu", "text"], ["meno", "Meno", "text"], ["projekt", "Projekt", "text"], ["jednotka", "Jednotka", "text"], ["typZaujmu", "Typ záujmu", "text"], ["prijaty", "Prijatý", "date"], ["hodiny", "Reakcia (hodiny)", "num"], ["stav", "Stav", "text"], ["predajca", "Predajca", "text"], ["zdroj", "Zdroj", "text"], ["rk", "Partnerská RK", "text"], ["obhliadka", "Dátum obhliadky", "date"], ["miesto", "Miesto obhliadky", "text"], ["vysledok", "Výsledok obhliadky", "text"], ["followUp", "Follow-up", "text"], ["spatna", "Spätná väzba", "text"]],
    projekty: [["kod", "Kód", "text"], ["nazov", "Názov", "text"], ["lokalita", "Lokalita", "text"], ["soldPct", "Predané byty %", "num"], ["planPct", "Plán %", "num"], ["zaostavaPct", "Zaostáva za plánom (p. b.)", "num"], ["bankaPct", "Banka %", "num"], ["chyba", "Chýba zmlúv pre banku", "num"], ["dniDoBanky", "Dní do termínu banky", "num"], ["sold30", "Predané za 30 dní", "num"], ["rez", "Rezervované", "num"], ["free", "Voľné byty", "num"], ["volneM2", "Cena voľných €/m²", "num"], ["konkurenciaM2", "Konkurencia €/m²", "num"], ["kolaudacia", "Kolaudácia", "date"], ["uzavierka", "Uzávierka klientskych zmien", "date"]]
  };
  const OPS = {
    text: [["eq", "je"], ["neq", "nie je"], ["contains", "obsahuje"], ["empty", "je prázdne"], ["notempty", "je vyplnené"]],
    num: [["gt", "väčšie ako"], ["gte", "aspoň"], ["lt", "menšie ako"], ["lte", "najviac"], ["eq", "rovná sa"], ["neq", "nerovná sa"], ["empty", "je prázdne"]],
    date: [["older", "pred viac ako (dní)"], ["within", "v najbližších (dňoch)"], ["recent", "za posledných (dní)"], ["past", "už uplynul"], ["empty", "je prázdne"], ["notempty", "je vyplnené"]]
  };
  const NOVAL = ["empty", "notempty", "past"];
  const fieldDef = (src, key) => (FIELDS[src] || []).find(f => f[0] === key);
  const opLabel = (type, op) => ((OPS[type] || []).find(o => o[0] === op) || [op, op])[1];
  function describeRule(r) {
    const DATEOP = { older: n => `pred viac ako ${n} ${pl(+n, "dňom", "dňami", "dňami")}`, within: n => `v najbližších ${n} ${pl(+n, "dni", "dňoch", "dňoch")}`, recent: n => `za posledných ${n} ${pl(+n, "deň", "dni", "dní")}` };
    return (r.podmienky || []).map(c => { const f = fieldDef(r.objekt, c.pole); if (!f) return "?"; if (f[2] === "date" && DATEOP[c.op]) return `${f[1]} ${DATEOP[c.op](c.hodnota)}`; return `${f[1]} ${opLabel(f[2], c.op)}${NOVAL.includes(c.op) ? "" : " " + c.hodnota}`; }).join(" a ");
  }
  function validRule(r) {
    if (!r || !SOURCES[r.objekt] || !String(r.nazov || "").trim()) return "Zadajte názov a čo signál sleduje.";
    if (!Array.isArray(r.podmienky) || !r.podmienky.length) return "Pridajte aspoň jednu podmienku.";
    for (const c of r.podmienky) {
      const f = fieldDef(r.objekt, c.pole); if (!f) return "Neznáme pole v podmienke.";
      if (!(OPS[f[2]] || []).some(o => o[0] === c.op)) return `Pri poli „${f[1]}“ sa nedá použiť táto podmienka.`;
      if (!NOVAL.includes(c.op) && String(c.hodnota ?? "").trim() === "") return `Doplňte hodnotu pri poli „${f[1]}“.`;
      if (!NOVAL.includes(c.op) && (f[2] === "num" || f[2] === "date") && isNaN(Number(String(c.hodnota).replace(",", ".")))) return `Pri poli „${f[1]}“ zadajte číslo.`;
    }
    return null;
  }
  function testCond(rec, c, type, now, today) {
    const v = rec[c.pole];
    const empty = v == null || v === "";
    if (c.op === "empty") return empty;
    if (c.op === "notempty") return !empty;
    if (empty) return false;
    if (type === "text") { const a = String(v).trim().toLowerCase(), b = String(c.hodnota).trim().toLowerCase(); return c.op === "eq" ? a === b : c.op === "neq" ? a !== b : c.op === "contains" ? a.includes(b) : false; }
    if (type === "num") { const a = Number(v), b = Number(String(c.hodnota).replace(",", ".")); return { gt: a > b, gte: a >= b, lt: a < b, lte: a <= b, eq: a === b, neq: a !== b }[c.op] || false; }
    if (type === "date") {
      const ms = typeof v === "number" ? v : Date.parse(String(v).slice(0, 10) + "T12:00:00Z");
      const t0 = Date.parse(today + "T12:00:00Z"), n = Number(String(c.hodnota).replace(",", ".")) || 0;
      if (c.op === "past") return ms < t0 - D / 2;
      if (c.op === "older") return ms < t0 - n * D;
      if (c.op === "within") return ms >= t0 - D / 2 && ms <= t0 + n * D;
      if (c.op === "recent") return ms >= t0 - n * D && ms <= now;
    }
    return false;
  }

  const DEFAULTS = {
    email: "branislav.crep@gmail.com",
    team: [
      { id: "m0", meno: "Branislav Črep", rola: "riaditel", predajca: "", email: "branislav.crep@gmail.com", rozsah: "cely", aktivny: true },
      ...PREDAJCOVIA.map((m, i) => ({ id: "m" + (i + 1), meno: m, rola: "predajca", predajca: m, email: "", rozsah: "svoje", aktivny: false }))
    ],
    signals: {
      s1: { on: true, days: 90 },
      s2: { on: true, graceDays: 0 },
      s3: { on: true, days: 5 },
      s4: { on: true, hours: 24 },
      s5: { on: true, days: 3 },
      s6: { on: true, days: 21 },
      s7: { on: true, minViews: 150, minDays: 60 },
      s8: { on: true, days: 180 }
    },
    finEmail: "branislav.crep@gmail.com",
    schedule: { days: [1, 2, 3, 4, 5], time: "07:30", slack: true, email: false, team: false, fin: false },
    automation: { active: false }
  };

  // ---------- pomocné ----------
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const val = v => (v && typeof v === "object" && !Array.isArray(v) && "value" in v) ? v.value : (Array.isArray(v) && v.length === 1 && typeof v[0] !== "object" ? v[0] : v);
  function ts(s) {
    s = val(s);
    if (s == null || s === "") return null;
    if (typeof s === "number") return s;
    const str = String(s);
    if (/Z$|[+-]\d\d:\d\d$/.test(str) && !isNaN(Date.parse(str))) return Date.parse(str);
    const m = str.match(/(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?/);
    if (m) return Date.parse(m[1] + "T" + m[2] + (m[3] || ":00") + "Z");
    const d = str.match(/\d{4}-\d{2}-\d{2}/);
    return d ? Date.parse(d[0] + "T00:00:00Z") : null;
  }
  function dateStr(s) { s = val(s); if (!s) return null; const d = String(s).match(/\d{4}-\d{2}-\d{2}/); return d ? d[0] : null; }
  const num = x => { x = val(x); if (typeof x === "number") return x; if (x == null || x === "") return null; const n = Number(String(x).replace(/[^\d.,-]/g, "").replace(",", ".")); return isNaN(n) ? null : n; };
  const str = x => { x = val(x); return x == null ? "" : String(x); };
  function localParts(ms) {
    const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(ms));
    const g = t => (p.find(x => x.type === t) || {}).value;
    return { date: `${g("year")}-${g("month")}-${g("day")}`, wd: g("weekday"), hm: `${g("hour")}:${g("minute")}`.replace(/^24/, "00") };
  }
  function addDays(dstr, n) { const t = Date.parse(dstr + "T12:00:00Z") + n * D; return new Date(t).toISOString().slice(0, 10); }
  const daysBetween = (a, b) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / D);
  const WD = { Sun: "ne", Mon: "po", Tue: "ut", Wed: "st", Thu: "št", Fri: "pi", Sat: "so" };
  const WDL = { Sun: "nedeľa", Mon: "pondelok", Tue: "utorok", Wed: "streda", Thu: "štvrtok", Fri: "piatok", Sat: "sobota" };
  const dm = dstr => { const [y, m, d] = dstr.split("-"); return `${+d}. ${+m}.`; };
  const dmy = dstr => { const [y, m, d] = dstr.split("-"); return `${+d}. ${+m}. ${y}`; };
  const fmt1 = n => (Math.round(n * 10) / 10).toFixed(1).replace(".", ",");
  const fmtInt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  const eur = n => fmtInt(n) + "\u00a0€";
  function pl(n, a, b, c) { return n === 1 ? a : (n >= 2 && n <= 4 ? b : c); }
  const short = name => { if (!name) return ""; const p = name.split(" "); return p.length > 1 ? p[0][0] + ". " + p.slice(1).join(" ") : name; };
  function joinSk(arr) { if (arr.length <= 1) return arr.join(""); return arr.slice(0, -1).join(", ") + " a " + arr[arr.length - 1]; }
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const pct = (a, b) => b ? Math.round(a / b * 1000) / 10 : 0;
  const fmtPct = p => String(p).replace(".", ",") + "\u00a0%";
  const endS = x => /\.$/.test(x) ? x : x + ".";
  const ORI = { S: "na sever", J: "na juh", V: "na východ", Z: "na západ", "J/Z": "na juhozápad", "J/V": "na juhovýchod", "S/Z": "na severozápad", "S/V": "na severovýchod" };
  const perPred = arr => arr.length === 1 ? `všetky má ${arr[0].predajca}` : arr.map(x => `${short(x.predajca)} ${x.n}`).join(", ");

  // ---------- načítanie dát: CSV súbory (pôvodne konektor Attio) ----------
  function normalize(raw) {
    const A = e => e.attributes || e.values || e;
    const projekty = raw.projekty.map(r => { const a = A(r); return {
      kod: str(a.kod), nazov: str(a.nazov), lokalita: str(a.lokalita), faza: str(a.faza_vystavby),
      zaciatok: dateStr(a.zaciatok_predaja), kolaudacia: dateStr(a.termin_kolaudacie),
      bankaPct: num(a.banka_predpredaj_pct), bankaDo: dateStr(a.banka_predpredaj_do), planPct: num(a.plan_predaja_pct_k_dnesku),
      uzavierka: dateStr(a.uzavierka_klientskych_zmien), konkurenciaM2: num(a.priemer_konkurencie_za_m2_eur) }; })
      .filter(p => p.nazov).sort((x, y) => (x.zaciatok || "") < (y.zaciatok || "") ? -1 : 1);
    const jednotky = raw.jednotky.map(r => { const a = A(r); return {
      kod: str(a.kod), projekt: str(a.projekt), typ: str(a.typ), izby: num(a.izby), podlazie: num(a.podlazie), orientacia: str(a.orientacia),
      plocha: num(a.plocha_m2), exterier: str(a.exterier), cena: num(a.cena_s_dph_eur), cenaM2: num(a.cena_za_m2_eur), stav: str(a.stav), predajca: str(a.predajca),
      zmena: dateStr(a.datum_zmeny_stavu), rezDo: dateStr(a.rezervacia_do), zalohaSplatna: dateStr(a.zaloha_splatna), zaloha: num(a.zaloha_eur), zalohaUhradena: str(a.zaloha_uhradena),
      klientske: str(a.klientske_zmeny), views30: num(a.zobrazenia_30_dni) || 0, ponukaOd: dateStr(a.ponuka_od), poznamka: str(a.poznamka) }; })
      .filter(j => j.kod).sort((x, y) => x.kod < y.kod ? -1 : 1);
    const dopyty = raw.dopyty.map(r => { const a = A(r); return {
      kod: str(a.kod_dopytu), meno: str(a.meno), projekt: str(a.projekt), jednotka: str(a.jednotka), typZaujmu: str(a.typ_zaujmu),
      prijaty: ts(a.prijaty), reakcia: ts(a.prva_reakcia), hodiny: num(a.reakcia_hodiny), stav: str(a.stav), predajca: str(a.predajca),
      zdroj: str(a.zdroj), rk: str(a.partnerska_rk), obhliadka: dateStr(a.datum_obhliadky), miesto: str(a.miesto_obhliadky),
      vysledok: str(a.vysledok_obhliadky), followUp: str(a.follow_up), spatna: str(a.spatna_vazba) }; })
      .filter(d => d.kod);
    return { projekty, jednotky, dopyty, counts: { projekty: projekty.length, jednotky: jednotky.length, dopyty: dopyty.length } };
  }

  // ---------- výpočet (deterministicky, v kóde) ----------
  const isVzor = j => /vzorov/i.test(j.poznamka || "");
  const isSold = j => SOLD.includes(j.stav);

  function projectStats(data, now) {
    const today = localParts(now).date;
    return data.projekty.map(p => {
      const J = data.jednotky.filter(j => j.projekt === p.nazov);
      const byty = J.filter(j => j.typ === "Byt");
      const sold = byty.filter(isSold).length, rez = byty.filter(j => j.stav === "Rezervovaná").length, free = byty.filter(j => j.stav === "Voľná").length;
      const soldPct = pct(sold, byty.length);
      const target = p.bankaPct != null ? Math.ceil(p.bankaPct / 100 * byty.length - 1e-9) : null;
      const chyba = target != null ? Math.max(0, target - sold) : null;
      const dniDoBanky = p.bankaDo ? daysBetween(today, p.bankaDo) : null;
      const sold30 = byty.filter(j => isSold(j) && j.zmena && daysBetween(j.zmena, today) <= 30).length;
      const lastSale = byty.filter(j => isSold(j) && j.zmena).map(j => j.zmena).sort().pop() || null;
      const volneM2 = mean(byty.filter(j => j.stav === "Voľná" && !isVzor(j) && j.cenaM2).map(j => j.cenaM2));
      const mix = {};
      byty.forEach(j => { const k = j.izby ? j.izby + "-izbové" : "iné"; const m = mix[k] = mix[k] || { typ: k, spolu: 0, predane: 0, rez: 0, volne: 0, vzor: 0, m2: [] };
        m.spolu++; if (isSold(j)) m.predane++; else if (j.stav === "Rezervovaná") m.rez++; else if (j.stav === "Voľná") { if (isVzor(j)) m.vzor++; else { m.volne++; if (j.cenaM2) m.m2.push(j.cenaM2); } } });
      const mixArr = Object.values(mix).sort((a, b) => a.typ < b.typ ? -1 : 1).map(m => ({ ...m, volneM2: mean(m.m2), vypredane: m.volne === 0 }));
      const ostatne = J.filter(j => j.typ !== "Byt");
      const ost = {};
      ostatne.forEach(j => { const o = ost[j.typ] = ost[j.typ] || { typ: j.typ, spolu: 0, predane: 0, volne: 0 }; o.spolu++; if (isSold(j)) o.predane++; if (j.stav === "Voľná") o.volne++; });
      let banka = "bez podmienky";
      if (target != null) banka = sold >= target ? "splnené" : (dniDoBanky < 0 ? "po termíne" : "chýba");
      return { kod: p.kod, nazov: p.nazov, lokalita: p.lokalita, faza: p.faza, kolaudacia: p.kolaudacia, zaciatok: p.zaciatok,
        byty: byty.length, sold, rez, free, soldPct, planPct: p.planPct, bankaPct: p.bankaPct, bankaDo: p.bankaDo, target, chyba, dniDoBanky, banka,
        sold30, lastSale, volneM2, konkurenciaM2: p.konkurenciaM2, mix: mixArr, ostatne: Object.values(ost), uzavierka: p.uzavierka };
    });
  }

  function compute(data, s, now) {
    const lp = localParts(now);
    const today = lp.date;
    const out = { now, today, dayLabel: `${WD[lp.wd] || ""} ${dm(today)}`, dayLong: `${WDL[lp.wd] || ""} ${dmy(today)}`, settings: s };
    const projStats = projectStats(data, now);
    out.projekty = projStats;
    const shortProj = name => (data.projekty.find(p => p.nazov === name) || {}).kod || name;
    const dop30 = kod => data.dopyty.filter(d => d.jednotka === kod && d.prijaty && d.prijaty >= now - 30 * D && d.prijaty <= now).length;

    // signály z katalógu use casov (panel/usecases/<id>.js), poradie podľa usecases/typy.json
    const ctx = { out, dmy, projStats, s, addDays, daysBetween, dm, today, shortProj, data, PREDAJCOVIA, OPEN, H, mean, now, ORI, isVzor, dop30 };
    for (const [kluc, fn] of SIGNALY) fn({ ...ctx, kluc });
    // vlastné signály
    out.customKeys = [];
    (s.custom || []).forEach(r => {
      if (validRule(r)) return;
      const k = "c_" + r.id;
      let recs;
      if (r.objekt === "jednotky") recs = data.jednotky.map(j => ({ ...j, dopyty30: dop30(j.kod) }));
      else if (r.objekt === "dopyty") recs = data.dopyty;
      else recs = projStats.map(p => ({ ...p, zaostavaPct: p.planPct != null ? Math.round((p.planPct - p.soldPct) * 10) / 10 : null }));
      const hits = recs.filter(x => r.podmienky.every(c => testCond(x, c, fieldDef(r.objekt, c.pole)[2], now, today)));
      const items = hits.map(x => r.objekt === "jednotky" ? { label: x.kod, jednotka: x.kod, projekt: shortProj(x.projekt), stav: x.stav, predajca: x.predajca, cena: x.cena }
        : r.objekt === "dopyty" ? { label: `${x.kod} ${x.meno}`, dopyt: x.kod, meno: x.meno, jednotka: x.jednotka, stav: x.stav, predajca: x.predajca }
        : { label: x.nazov, projekt: x.nazov, predane_pct: x.soldPct, plan_pct: x.planPct });
      out[k] = { on: r.on !== false, custom: true, id: r.id, nazov: r.nazov, popis: r.popis || "", objekt: r.objekt, pravidlo: describeRule(r), count: items.length, items, level: items.length ? (r.uroven === "red" ? "red" : "yellow") : "green" };
      out.customKeys.push(k);
    });
    out.dataInfo = data.counts;
    return out;
  }
  const activeKeys = b => KEYS.filter(k => b[k] && b[k].on).concat((b.customKeys || []).filter(k => b[k].on));

  // ---------- texty: záložné (bez AI) ----------
  function fallbackTexts(b) {
    const t = {};
    const bank = b.s1.items.find(x => x.riziko);
    if (b.s1.on && bank && b.s1.level === "red") { t.nadpis = "Podmienka banky"; t.podnadpis = `${bank.kod}: chýbajú ${bank.chyba} ${pl(bank.chyba, "zmluva", "zmluvy", "zmlúv")}`; }
    else if (b.s2.on && b.s2.count) { t.nadpis = "Zálohy po splatnosti"; t.podnadpis = `${b.s2.count} ${pl(b.s2.count, "jednotka", "jednotky", "jednotiek")}, ${eur(b.s2.suma)}`; }
    else if (b.s3.on && b.s3.count) { t.nadpis = "Rezervácie končia"; t.podnadpis = `${b.s3.count} do ${b.s3.days} dní`; }
    else if (b.s4.on && b.s4.count) { t.nadpis = "Záujemcovia čakajú"; t.podnadpis = `${b.s4.count} bez reakcie nad ${b.s4.hours} h`; }
    else { t.nadpis = "Pokojné ráno"; t.podnadpis = "bez naliehavých signálov"; }
    t.s1 = !b.s1.items.length ? "Podmienky bánk sú splnené." : b.s1.items.map(x => `${x.projekt}: predaných ${x.predane} z ${x.byty} bytov (${fmtPct(x.predanePct)}), banka chce ${x.cielPct} % do ${x.terminDm}. Chýbajú ${x.chyba} ${pl(x.chyba, "zmluva", "zmluvy", "zmlúv")}, ${x.dni} dní do termínu, za posledných 30 dní pribudli ${x.predane30}.`).join(" ");
    t.s2 = b.s2.count ? `${endS(`Neuhradené ${joinSk(b.s2.items.map(x => `${x.jednotka} ${eur(x.suma)}`))}, splatné ${b.s2.items[0].splatna}`)} Bez záloh sa zdrží ďalšie čerpanie úveru.` : "Všetky splatné zálohy sú uhradené.";
    t.s3 = b.s3.count ? endS(b.s3.items.map(x => `${x.jednotka} (${short(x.predajca)}) ${x.vyprsala ? "vypršala " + x.do + " a stav nie je aktualizovaný" : "končí " + x.do}`).join("; ")) : `Žiadna rezervácia nekončí do ${b.s3.days} dní.`;
    const slow = b.s4.predajcovia.slice().sort((a, c) => (c.priemerHodin || 0) - (a.priemerHodin || 0))[0];
    t.s4 = b.s4.count ? `${b.s4.byPredajca.length === 1 ? perPred(b.s4.byPredajca).replace(/^v/, "V") : "Podľa predajcu: " + perPred(b.s4.byPredajca)}.` + (slow ? ` ${slow.predajca} má ${slow.otvorene} otvorených dopytov a reaguje v priemere za ${fmt1(slow.priemerHodin)} h.` : "") : "Na všetkých záujemcov niekto zareagoval.";
    t.s5 = b.s5.count ? `Záujemcovia po obhliadke bez dohodnutého ďalšieho kroku, ${perPred(b.s5.byPredajca).replace("všetky", "všetkých")}. Najdlhšie čaká ${b.s5.items[0].meno} (${b.s5.items[0].jednotka}), ${b.s5.items[0].dniOdObhliadky} dní.` : "Po každej obhliadke je naplánovaný ďalší krok.";
    t.s6 = b.s6.count ? b.s6.items.map(x => `${x.projekt}: uzávierka ${x.uzavierka}, nevyjadrili sa ${x.jednotky.length} ${pl(x.jednotky.length, "kupujúci", "kupujúci", "kupujúcich")} (${x.jednotky.map(j => j.jednotka).join(", ")}).`).join(" ") : "Žiadna uzávierka klientskych zmien sa neblíži.";
    t.s7 = b.s7.count ? `${joinSk(b.s7.items.map(x => x.jednotka))}: veľa zobrazení, za 30 dní ani jeden dopyt.` + (b.s7.spolocne[0] && b.s7.spolocne[0].n > 1 ? ` ${b.s7.spolocne[0].n === b.s7.count ? "Všetky sú" : "Najčastejšie"} ${b.s7.spolocne[0].typ}.` : "") + (b.s7.vypredane.length ? ` Voľné už nie sú ${joinSk([...new Set(b.s7.vypredane.map(x => x.projekt))].map(pr => `${joinSk(b.s7.vypredane.filter(x => x.projekt === pr).map(x => x.typ))} byty v ${pr}`))}.` : "") : "Žiadny voľný byt nestojí bez záujmu.";
    t.s8 = b.s8.count ? b.s8.items.map(x => `${x.jednotka} je v ponuke ${x.dniVPonuke} dní, ${x.dopyty} ${pl(x.dopyty, "záujemca", "záujemcovia", "záujemcov")}, z toho ${x.najom} chce nájom.`).join(" ") : "Obchodné priestory sa predávajú bez problémov.";
    (b.customKeys || []).forEach(ck => { const c = b[ck]; t[ck] = c.count ? `Týka sa: ${c.items.slice(0, 6).map(x => x.label).join(", ")}${c.count > 6 ? ` a ďalších ${c.count - 6}` : ""}.` : `Nič nespĺňa pravidlo: ${c.pravidlo}.`; });
    const k = [];
    if (b.s1.on && bank) k.push(`${bank.kod}: do ${bank.terminDm} treba ešte ${bank.chyba} ${pl(bank.chyba, "zmluvu", "zmluvy", "zmlúv")} o budúcej zmluve; tento týždeň obvolať záujemcov po obhliadke.`);
    if (b.s2.on && b.s2.count) k.push(`Poslať upomienky na zálohy ${b.s2.items.map(x => x.jednotka).join(", ")} (spolu ${eur(b.s2.suma)}).`);
    if (b.s3.on && b.s3.count) k.push(`Rezervácie ${b.s3.items.map(x => x.jednotka).join(", ")}: dohodnúť podpis zmluvy o budúcej alebo uvoľniť jednotku.`);
    if (b.s4.on && b.s4.count) k.push(`Prerozdeliť ${b.s4.count} ${pl(b.s4.count, "dopyt", "dopyty", "dopytov")} bez reakcie a ozvať sa do 12:00.`);
    t.kroky = k.slice(0, 3);
    if (!t.kroky.length) t.kroky = ["Pokračovať podľa plánu predaja."];
    t.zhrnutie = b.projekty.map(p => `${p.nazov} má predaných ${p.sold} z ${p.byty} bytov (${fmtPct(p.soldPct)}${p.planPct != null ? `, plán ${p.planPct} %` : ""}).`).join(" ");
    t.zistenie = bank ? `${bank.projekt} potrebuje do ${bank.terminDm} ešte ${bank.chyba} ${pl(bank.chyba, "zmluvu", "zmluvy", "zmlúv")}, inak banka nepustí úver.` : (b.s2.count ? `Po splatnosti je ${eur(b.s2.suma)} na zálohách.` : "Žiadny signál dnes nevyžaduje okamžitú akciu.");
    return t;
  }

  // ---------- AI interpretácia ----------
  function facts(b) {
    const s = b.settings;
    const f = { dnes: b.dayLong, projekty: b.projekty.map(p => ({ projekt: p.nazov, kod: p.kod, faza: p.faza, kolaudacia: p.kolaudacia, bytov: p.byty, predane: p.sold, predane_pct: p.soldPct, plan_pct: p.planPct, rezervovane: p.rez, volne: p.free, predane_za_30_dni: p.sold30, posledny_predaj: p.lastSale, cena_volnych_m2: p.volneM2 && Math.round(p.volneM2), konkurencia_m2: p.konkurenciaM2, banka_ciel_pct: p.bankaPct, banka_termin: p.bankaDo, banka_stav: p.banka })) };
    if (b.s1.on) f.s1_podmienka_banky = { upozornit_dni_pred: s.s1.days, projekty: b.s1.items };
    if (b.s2.on) f.s2_zalohy_po_splatnosti = { pocet: b.s2.count, suma_eur: b.s2.suma, zalohy: b.s2.items };
    if (b.s3.on) f.s3_rezervacie = { do_dni: b.s3.days, rezervacie: b.s3.items };
    if (b.s4.on) f.s4_dopyty_bez_reakcie = { hranica_hodin: b.s4.hours, pocet: b.s4.count, dopyty: b.s4.items, predajcovia: b.s4.predajcovia.map(x => ({ predajca: x.predajca, otvorene_dopyty: x.otvorene, bez_reakcie: x.bezReakcie, priemer_reakcie_hodin: x.priemerHodin && +x.priemerHodin.toFixed(1) })) };
    if (b.s5.on) f.s5_obhliadky_bez_dalsieho_kroku = { starsie_ako_dni: b.s5.days, pocet: b.s5.count, zaujemcovia: b.s5.items };
    if (b.s6.on) f.s6_klientske_zmeny = { do_uzavierky_dni: b.s6.days, projekty: b.s6.items };
    if (b.s7.on) f.s7_leziaky = { min_zobrazeni_30_dni: b.s7.minViews, byty: b.s7.items, spolocne_znaky: b.s7.spolocne, vypredane_typy: b.s7.vypredane, hodnota_leziakov_eur: b.s7.hodnota };
    if (b.s8.on) f.s8_obchodne_priestory = { v_ponuke_dlhsie_ako_dni: b.s8.days, priestory: b.s8.items };
    (b.customKeys || []).filter(k => b[k].on).forEach(k => { const c = b[k]; f[k + "_vlastny_signal"] = { nazov: c.nazov, popis: c.popis, pravidlo: c.pravidlo, pocet: c.count, polozky: c.items.slice(0, 15) }; });
    return f;
  }
  function aiPrompt(b) {
    const keys = activeKeys(b);
    return `Si First Mate, AI analytik developera rezidenčných projektov. Z faktov nižšie napíš texty ranného brífingu pre riaditeľa predaja.

Pravidlá:
- Po slovensky, krátke vecné vety, tón kolegu, nie robota.
- Developer predáva vlastné jednotky: hovor o projektoch, jednotkách, predajcoch, rezerváciách a zmluvách o budúcej zmluve. Nepíš o exkluzivite ani o makléroch (partnerská realitka je len zdroj dopytu).
- Používaj IBA čísla, mená a kódy z faktov. Nič nevymýšľaj, nezaokrúhľuj inak než vo faktoch.
- Desatinná čiarka (34,7 h). Mená predajcov celé alebo v tvare „M. Hrnčiar“.
- Nepoužívaj dlhé pomlčky ani pomlčky ako interpunkciu (znaky — a –) okrem názvov lokalít.
- Kroky musia byť konkrétne: kto, čo, pri ktorej jednotke alebo projekte, dokedy. Poradie podľa dopadu na peniaze a termíny (banka, zálohy, rezervácie, záujemcovia, cenník).

Vráť IBA JSON objekt s kľúčmi:
- "nadpis": 2 až 3 slová, hlavná téma dňa
- "podnadpis": krátky údaj k nadpisu, napr. „NZ: chýbajú 3 zmluvy“
- "zhrnutie": 2 až 3 vety o tom, ako sa projekty predávajú oproti plánu
- "zistenie": 1 až 2 vety, najdôležitejšie zistenie dňa a prečo na ňom záleží
${keys.map(k => `- "${k}": 1 až 2 vety, čo signál ${b[k].custom ? `${k} („${b[k].nazov}“)` : k} znamená (koho sa týka, prečo je dôležitý); nezačínaj opakovaním čísla z nadpisu signálu`).join("\n")}
- "kroky": pole presne 3 krokov na dnes (každý jedna veta)

Fakty (JSON):
${JSON.stringify(facts(b))}`;
  }
  function mergeTexts(ai, fb, b) {
    const t = { ...fb };
    if (ai && typeof ai === "object") {
      for (const k of ["nadpis", "podnadpis", "zhrnutie", "zistenie", ...KEYS, ...(b.customKeys || [])]) if (typeof ai[k] === "string" && ai[k].trim()) t[k] = ai[k].trim();
      if (Array.isArray(ai.kroky) && ai.kroky.filter(x => typeof x === "string" && x.trim()).length >= 2) t.kroky = ai.kroky.filter(x => typeof x === "string" && x.trim()).slice(0, 3).map(x => x.trim());
      t.ai = true;
    }
    const clean = x => x.replace(/\s—\s/g, ", ").replace(/(?<!Bratislava)\s–\s(?!bez reakcie)/g, ", ").replace(/—/g, ",");
    for (const k of Object.keys(t)) if (typeof t[k] === "string") t[k] = clean(t[k]);
    t.kroky = t.kroky.map(clean);
    return t;
  }
  function personalFacts(b, predajca) {
    const pr = b.s4.predajcovia.find(x => x.predajca === predajca) || {};
    return {
      predajca,
      dopyty_bez_reakcie_nad_hodin: b.s4.hours,
      dopyty_bez_reakcie: b.s4.items.filter(x => x.predajca === predajca),
      otvorene_dopyty: pr.otvorene || 0,
      priemer_reakcie_hodin: pr.priemerHodin != null ? +pr.priemerHodin.toFixed(1) : null,
      priemer_timu_hodin: b.s4.priemerTimu != null ? +b.s4.priemerTimu.toFixed(1) : null,
      obhliadky_bez_dalsieho_kroku: b.s5.items.filter(x => x.predajca === predajca),
      rezervacie: b.s3.items.filter(x => x.predajca === predajca),
      zalohy_po_splatnosti: b.s2.items.filter(x => x.predajca === predajca),
      klientske_zmeny: b.s6.items.flatMap(x => x.jednotky.filter(j => j.predajca === predajca).map(j => ({ ...j, projekt: x.kod, uzavierka: x.uzavierka }))),
      leziaky: b.s7.items.filter(x => x.predajca === predajca),
      vlastne_signaly: (b.customKeys || []).filter(k => b[k].on).map(k => ({ nazov: b[k].nazov, polozky: b[k].items.filter(x => x.predajca === predajca) })).filter(x => x.polozky.length)
    };
  }
  function personalPrompt(b, members) {
    const per = members.map(m => personalFacts(b, m.predajca));
    return `Si First Mate, AI analytik developera. Pre každého predajcu napíš krátky osobný ranný brífing z jeho faktov.
Pravidlá: po slovensky, oslovuj ho priamo (vykanie), krátko a vecne, IBA čísla a kódy z faktov, bez pomlčiek — a –. Poradie krokov: zálohy a rezervácie, potom záujemcovia, potom ostatné. Ak nemá žiadny problém, pochváľ ho jednou vetou.
Vráť IBA JSON objekt: kľúč = meno predajcu, hodnota = {"veta": 1 až 2 vety zhrnutia, "kroky": pole 1 až 3 konkrétnych krokov na dnes}.
Fakty (JSON):
${JSON.stringify(per)}`;
  }
  function personalFallback(b, predajca) {
    const f = personalFacts(b, predajca);
    const k = [];
    if (f.zalohy_po_splatnosti.length) k.push(`Ozvať sa kupujúcim kvôli zálohám po splatnosti: ${f.zalohy_po_splatnosti.map(x => `${x.jednotka} ${eur(x.suma)}`).join(", ")}.`);
    if (f.rezervacie.length) k.push(`Rezervácie ${f.rezervacie.map(x => `${x.jednotka} (${x.vyprsala ? "vypršala" : "do " + x.do})`).join(", ")}: dohodnúť podpis zmluvy o budúcej alebo uvoľniť.`);
    if (f.dopyty_bez_reakcie.length) k.push(`Ozvať sa dnes do 12:00 na ${f.dopyty_bez_reakcie.length} ${pl(f.dopyty_bez_reakcie.length, "dopyt", "dopyty", "dopytov")} (${f.dopyty_bez_reakcie.map(x => x.dopyt).join(", ")}).`);
    if (f.obhliadky_bez_dalsieho_kroku.length) k.push(`Dohodnúť ďalší krok so záujemcami po obhliadke: ${f.obhliadky_bez_dalsieho_kroku.map(x => x.meno).join(", ")}.`);
    if (f.klientske_zmeny.length) k.push(`Pripomenúť klientske zmeny pri ${f.klientske_zmeny.map(x => x.jednotka).join(", ")}.`);
    const pr = f.priemer_reakcie_hodin;
    const problemov = f.dopyty_bez_reakcie.length + f.rezervacie.length + f.zalohy_po_splatnosti.length + f.obhliadky_bez_dalsieho_kroku.length;
    const veta = problemov ? `Máte ${f.otvorene_dopyty} ${pl(f.otvorene_dopyty, "otvorený dopyt", "otvorené dopyty", "otvorených dopytov")}` + (pr != null ? ` a reagujete v priemere za ${fmt1(pr)} h (tím ${f.priemer_timu_hodin != null ? fmt1(f.priemer_timu_hodin) : "–"} h).` : ".") : (pr != null ? `Na záujemcov reagujete v priemere za ${fmt1(pr)} h a nič nečaká. Výborne.` : "Dnes nemáte žiadne naliehavé signály.");
    return { veta, kroky: k.length ? k.slice(0, 3) : ["Pokračovať v bežnej agende."] };
  }

  // ---------- AI: návrh vlastného signálu z popisu ----------
  function rulePrompt(popis, values) {
    const cat = Object.entries(FIELDS).map(([src, fs]) => `${src}: ` + fs.map(f => `${f[0]} (${f[1]}, ${f[2]})`).join("; ")).join("\n");
    return `Si First Mate, AI analytik developera. Z popisu signálu od používateľa zostav pravidlo, ktoré sa dá vyhodnotiť v kóde.

Zdroje a polia (kľúč, popis, typ):
${cat}

Operátory podľa typu:
text: eq (je), neq (nie je), contains (obsahuje), empty, notempty
num: gt, gte, lt, lte, eq, neq, empty
date: older (dátum je starší ako N dní), within (dátum je v najbližších N dňoch), recent (dátum je za posledných N dní), past (dátum už uplynul), empty, notempty

Skutočné hodnoty textových polí v dátach (používaj presne tieto tvary):
${JSON.stringify(values)}

Pravidlá: všetky podmienky musia platiť naraz (AND), najviac 4 podmienky. Hodnota pri num a date je číslo. Ak sa popis nedá vyjadriť týmito poliami, vráť {"chyba": "krátke vysvetlenie po slovensky"}.

Vráť IBA JSON: {"formulacia": "pravidlo jednou vetou po slovensky, presne podľa podmienok, napr. Dopyty zo zdroja Partnerská RK, ktoré ešte nemali obhliadku.", "nazov": "2 až 4 slová", "popis": "1 veta, prečo na tom záleží", "objekt": "jednotky|dopyty|projekty", "podmienky": [{"pole": "...", "op": "...", "hodnota": "..."}], "uroven": "red|yellow"}

Popis od používateľa: ${popis}`;
  }
  function distinctValues(data) {
    const out = {};
    const add = (src, recs) => { out[src] = {}; FIELDS[src].filter(f => f[2] === "text").forEach(f => { const v = [...new Set(recs.map(r => r[f[0]]).filter(x => x != null && x !== ""))]; if (v.length && v.length <= 12) out[src][f[0]] = v; }); };
    if (!data) return out;
    add("jednotky", data.jednotky); add("dopyty", data.dopyty); add("projekty", data.projekty.map(p => ({ kod: p.kod, nazov: p.nazov, lokalita: p.lokalita })));
    return out;
  }

  // ---------- šablóny ----------
  const C = { ink: "#0B0B0C", muted: "#55524A", blue: "#1B2CC1", sand: "#EAE6DB", paper: "#F9F9F5", tint: "#D8DCF6", foot: "#D6D3C9", footMono: "#A9B1F5" };
  const F = { sans: "Arial,Helvetica,sans-serif", mono: "Menlo,Consolas,monospace" };
  const lbl = (txt, color) => `<div style="font-family:${F.mono};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${color || C.muted};margin-bottom:4px;">${txt}</div>`;
  const secLabel = (n, txt) => `<div style="font-family:${F.mono};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};margin:0 0 14px 0;"><span style="color:${C.blue};">${n}</span>&nbsp;&nbsp;${txt}</div>`;
  const secHead = (bold, mono) => `<div style="font-family:${F.sans};font-size:24px;line-height:30px;font-weight:bold;color:${C.ink};margin:0 0 14px 0;">${esc(bold)} <span style="font-family:${F.mono};font-weight:normal;font-size:16px;color:${C.muted};">/ ${esc(mono)}</span></div>`;
  const para = (txt, extra) => `<p style="font-family:${F.sans};font-size:15px;line-height:23px;color:${C.ink};margin:0 0 12px 0;${extra || ""}">${txt}</p>`;
  const th = (t, right) => `<th align="${right ? "right" : "left"}" style="font-family:${F.mono};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${C.muted};font-weight:normal;padding:0 0 8px 0;border-bottom:2px solid ${C.ink};text-align:${right ? "right" : "left"};">${t}</th>`;
  const td = (t, o = {}) => `<td align="${o.right ? "right" : "left"}" style="font-family:${F.sans};font-size:15px;color:${o.blue ? C.blue : C.ink};${o.blue ? "font-weight:600;" : ""}${o.bold ? "font-weight:bold;" : ""}padding:10px ${o.right ? "0" : "8px"} 10px 0;text-align:${o.right ? "right" : "left"};">${t}</td>`;
  const sec = (inner, last) => `<tr><td class="px" style="padding:36px 32px ${last ? "36px" : "0"} 32px;">${inner}</td></tr>`;
  const levelLabel = l => l === "red" ? lbl("Konať dnes", C.blue) : (l === "yellow" ? lbl("Sledovať") : lbl("V poriadku"));
  const nb = s => String(s).replace(/ (h|%|€)/g, "\u00a0$1");
  const table = (heads, rows) => `<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;"><tr>${heads.map(h => th(h[0], h[1])).join("")}</tr>${rows.join("")}</table>`;

  function bigNumbers(cells) {
    const rows = [];
    for (let i = 0; i < cells.length; i += 2) rows.push(cells.slice(i, i + 2));
    return `<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${C.ink};border-collapse:separate;margin:8px 0 18px 0;">` +
      rows.map((r, ri) => `<tr>${r.map(c => `<td width="50%" style="padding:${ri === 0 ? "18px" : "9px"} 16px ${ri === rows.length - 1 ? "18px" : "9px"} 16px;vertical-align:top;"><div style="font-family:${F.sans};font-size:26px;font-weight:bold;color:${c.blue ? C.blue : C.ink};">${esc(c.v)}</div><div style="font-family:${F.mono};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${C.muted};margin-top:6px;">${esc(nb(c.l))}</div></td>`).join("")}${r.length === 1 ? "<td width=\"50%\"></td>" : ""}</tr>`).join("") + `</table>`;
  }
  function stepsTable(kroky) {
    return `<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0" style="border-top:2px solid ${C.ink};">` + kroky.map((k, i) =>
      `<tr><td width="56" valign="top" style="font-family:${F.mono};font-size:24px;color:${C.blue};padding:14px 12px 0 0;vertical-align:top;">0${i + 1}</td><td valign="top" style="font-family:${F.sans};font-size:15px;line-height:23px;color:${C.ink};padding:16px 0 0 0;vertical-align:top;">${esc(k)}</td></tr>`).join("") + `</table>`;
  }
  function shell(title, preheader, inner, footer) {
    return `<!DOCTYPE html><html lang="sk"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(title)}</title><style>@media (max-width:520px){.px{padding-left:18px!important;padding-right:18px!important}}</style></head><body style="margin:0;padding:0;background:${C.paper};">` + card(preheader, inner, footer) + `</body></html>`;
  }
  function card(preheader, inner, footer) {
    return `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${C.paper};">${esc(preheader)}</div><table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0" style="background:${C.paper};"><tr><td align="center" style="padding:24px 8px;"><table role="presentation" border="0" width="640" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;background:#FFFFFF;">${inner}<tr><td class="px" style="background:${C.ink};padding:24px 32px;"><div style="font-family:${F.sans};font-size:13px;line-height:20px;color:${C.foot};">${esc(footer)}</div><div style="font-family:${F.mono};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${C.footMono};margin-top:12px;">First Mate &middot; Books &amp; Mirror &middot; CRM</div></td></tr></table></td></tr></table>`;
  }
  function header(kicker, title, sub) {
    return `<tr><td class="px" style="padding:32px 32px 0 32px;"><div style="font-family:${F.sans};font-size:18px;font-weight:bold;color:${C.ink};">First Mate</div><div style="font-family:${F.mono};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${C.blue};margin:22px 0 10px 0;">${kicker}</div><div style="font-family:${F.sans};font-size:38px;line-height:44px;font-weight:bold;color:${C.ink};">${esc(title)}<span style="color:${C.blue};">.</span></div><div style="font-family:${F.mono};font-size:12px;color:${C.muted};margin-top:10px;">${sub}</div></td></tr>`;
  }
  const FOOT = "Čísla sú vypočítané z dát CRM v čase odoslania, interpretáciu napísala AI. Ide o ukážkového developera, všetky osoby, projekty a jednotky sú fiktívne.";

  function headline(b, k) {
    switch (k) {
      case "s1": return b.s1.items.length ? `Podmienka banky: ${joinSk(b.s1.items.map(x => `${x.kod} ${fmtPct(x.predanePct)} z ${x.cielPct}\u00a0% do ${x.terminDm}`))}.` : "Podmienka banky: splnená.";
      case "s2": return `Zálohy po splatnosti: ${b.s2.count}` + (b.s2.count ? `, spolu ${eur(b.s2.suma)}.` : ".");
      case "s3": return `Rezervácie končiace do ${b.s3.days} dní: ${b.s3.count}` + (b.s3.vyprsane ? `, z toho ${b.s3.vyprsane} už ${pl(b.s3.vyprsane, "vypršala", "vypršali", "vypršalo")}.` : ".");
      case "s4": return `Dopyty bez reakcie viac ako ${b.s4.hours}\u00a0h: ${b.s4.count}.`;
      case "s5": return `Obhliadky bez ďalšieho kroku: ${b.s5.count}.`;
      case "s6": return `Klientske zmeny pred uzávierkou: ${b.s6.count} ${pl(b.s6.count, "kupujúci", "kupujúci", "kupujúcich")} bez rozhodnutia.`;
      case "s7": return `Ležiaky (${b.s7.minViews}+ zobrazení, 0 dopytov za 30 dní): ${b.s7.count}.`;
      case "s8": return `Obchodné priestory v ponuke dlhšie ako ${b.s8.days} dní: ${b.s8.count}.`;
      default: return b[k] && b[k].custom ? `${b[k].nazov}: ${b[k].count}.` : "";
    }
  }
  function briefInner(b, t) {
    let n = 0; const N = () => "0" + (++n);
    let h = header(`Ranný brífing &middot; ${esc(b.dayLabel)}&nbsp;${b.today.slice(0, 4)}`, "Dobré ráno", `CRM &middot; ${b.projekty.length} ${pl(b.projekty.length, "projekt", "projekty", "projektov")} &middot; stav k dnešnému ránu`);
    const cells = [];
    b.projekty.forEach(p => cells.push({ v: fmtPct(p.soldPct), l: `${p.kod} predané byty · plán ${p.planPct != null ? p.planPct + " %" : "–"}${p.bankaPct != null ? ` · banka ${p.bankaPct} %` : ""}`, blue: p.banka === "chýba" && p.dniDoBanky != null && p.dniDoBanky <= b.settings.s1.days }));
    if (b.s2.on) cells.push({ v: b.s2.count ? eur(b.s2.suma) : "0", l: `Zálohy po splatnosti · ${b.s2.count} ${pl(b.s2.count, "jednotka", "jednotky", "jednotiek")}`, blue: b.s2.count > 0 });
    if (b.s4.on) cells.push({ v: String(b.s4.count), l: `Dopyty bez reakcie nad ${b.s4.hours} h`, blue: b.s4.count > 0 });
    h += sec(secLabel(N(), "Ako sa predáva") + secHead(t.nadpis, t.podnadpis) + para(esc(nb(t.zhrnutie))) + bigNumbers(cells) +
      `<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0"><tr><td style="background:${C.sand};border-left:4px solid ${C.blue};padding:16px 18px;">${lbl("Najdôležitejšie zistenie", C.blue).replace("margin-bottom:4px", "margin-bottom:6px")}<div style="font-family:${F.sans};font-size:15px;line-height:23px;color:${C.ink};">${esc(nb(t.zistenie))}</div></td></tr></table>`);
    const items = activeKeys(b).map(k => [b[k].level, headline(b, k), t[k] || ""]);
    if (items.length) h += sec(secLabel(N(), "Signály") + `<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0" style="border-top:2px solid ${C.ink};">` + items.map(([lv, head, txt]) =>
      `<tr><td style="padding:14px 0 0 0;">${levelLabel(lv)}<div style="font-family:${F.sans};font-size:15px;line-height:23px;color:${C.ink};"><b>${esc(head)}</b> ${esc(nb(txt))}</div></td></tr>`).join("") + `</table>`);
    const money = [];
    if (b.s2.on) b.s2.items.forEach(x => money.push(`<tr>${td(esc(x.jednotka))}${td("Záloha po splatnosti")}${td(esc(short(x.predajca)))}${td(eur(x.suma), { right: true, blue: true })}</tr>`));
    if (b.s3.on) b.s3.items.forEach(x => money.push(`<tr>${td(esc(x.jednotka))}${td(x.vyprsala ? "Rezervácia vypršala " + esc(x.do) : "Rezervácia do " + esc(x.do))}${td(esc(short(x.predajca)))}${td(x.cena ? eur(x.cena) : "", { right: true, blue: x.vyprsala })}</tr>`));
    if (money.length) h += sec(secLabel(N(), "Zálohy a rezervácie") + table([["Jednotka"], ["Čo"], ["Predajca"], ["Suma", true]], money));
    if (b.s4.on && b.s4.predajcovia.length) h += sec(secLabel(N(), "Záujemcovia podľa predajcu") + table([["Predajca"], ["Otvorené", true], ["Bez reakcie", true], ["Priemer reakcie", true]],
      b.s4.predajcovia.map(x => `<tr>${td(esc(x.predajca))}${td(x.otvorene, { right: true })}${td(x.bezReakcie, { right: true, blue: x.bezReakcie > 0 })}${td(x.priemerHodin == null ? "–" : fmt1(x.priemerHodin) + "&nbsp;h", { right: true, blue: x.priemerHodin > 24 })}</tr>`)));
    h += sec(secLabel(N(), "Čo urobiť dnes") + secHead(t.kroky.length === 1 ? "Jeden krok" : (t.kroky.length === 2 ? "Dva kroky" : "Tri kroky"), b.dayLabel) + stepsTable(t.kroky.map(nb)) +
      para(`Chcete vedieť viac alebo niečo rovno vykonať? Otvorte Claude a napíšte <span style="font-family:${F.mono};font-size:14px;color:${C.blue};white-space:nowrap;">${CMD}</span>.`, "margin:24px 0 0 0;"), true);
    return h;
  }
  function emailHtml(b, t) { return shell(`First Mate · ranný brífing · ${b.dayLabel}`, t.zistenie, briefInner(b, t), FOOT); }
  function emailPreview(b, t) { return card(t.zistenie, briefInner(b, t), FOOT); }
  function emailSubject(b, t) { return `First Mate · ranný brífing developera · ${b.dayLabel}: ${t.podnadpis}`; }
  function emailText(b, t) {
    const L = [`FIRST MATE · RANNÝ BRÍFING · ${b.dayLabel}`, "", `${t.nadpis} / ${t.podnadpis}`, t.zhrnutie, "", `Najdôležitejšie zistenie: ${t.zistenie}`, "", "SIGNÁLY"];
    activeKeys(b).forEach(k => L.push(`- ${headline(b, k)} ${t[k] || ""}`));
    L.push("", "ČO UROBIŤ DNES", ...t.kroky.map((k, i) => `${i + 1}. ${k}`), "", `Otázky a pokyny: otvorte Claude a napíšte ${CMD}.`, "", FOOT);
    return L.join("\n").replace(/\u00a0/g, " ");
  }
  function slackText(b, t) {
    const em = l => l === "red" ? ":red_circle:" : (l === "yellow" ? ":large_yellow_circle:" : ":large_green_circle:");
    const L = [`:sunny: **First Mate · ranný brífing developera · ${b.dayLabel}**`, `_${b.projekty.map(p => `${p.kod} ${fmtPct(p.soldPct)} predaných${p.planPct != null ? ` (plán ${p.planPct} %)` : ""}`).join(" · ")}_`, ""];
    let i = 0;
    activeKeys(b).forEach(k => L.push(`**${++i}. ${headline(b, k)}** ${em(b[k].level)}`, `→ ${t[k] || ""}`, ""));
    L.push("**Čo urobiť dnes**", ...t.kroky.map((k, j) => `${j + 1}. ${k}`), `_Napíšte do vlákna, čo treba urobiť, a pokračujte v Claude príkazom ${CMD}._`);
    return L.join("\n").replace(/\u00a0/g, " ");
  }
  function personalEmail(b, member, p) {
    const f = personalFacts(b, member.predajca);
    const pr = f.priemer_reakcie_hodin;
    const cells = [
      { v: String(f.dopyty_bez_reakcie.length), l: `Dopyty bez reakcie nad ${b.s4.hours} h`, blue: f.dopyty_bez_reakcie.length > 0 },
      { v: pr == null ? "–" : nb(fmt1(pr) + " h"), l: `Váš priemer reakcie · tím ${f.priemer_timu_hodin == null ? "–" : fmt1(f.priemer_timu_hodin) + " h"}` },
      { v: String(f.rezervacie.length + f.zalohy_po_splatnosti.length), l: "Rezervácie a zálohy na riešenie", blue: f.rezervacie.length + f.zalohy_po_splatnosti.length > 0 },
      { v: String(f.obhliadky_bez_dalsieho_kroku.length), l: "Obhliadky bez ďalšieho kroku" }
    ];
    let inner = header(`Osobný brífing &middot; ${esc(b.dayLabel)}&nbsp;${b.today.slice(0, 4)}`, `Dobré ráno, ${member.meno.split(" ")[0]}`, `CRM &middot; ${esc(member.predajca)}`);
    inner += sec(secLabel("01", "Vaše čísla") + para(esc(nb(p.veta))) + bigNumbers(cells));
    const rows = [];
    f.zalohy_po_splatnosti.forEach(x => rows.push(`<tr>${td(esc(x.jednotka))}${td("Záloha po splatnosti od " + esc(x.splatna))}${td(eur(x.suma), { right: true, blue: true })}</tr>`));
    f.rezervacie.forEach(x => rows.push(`<tr>${td(esc(x.jednotka))}${td(x.vyprsala ? "Rezervácia vypršala " + esc(x.do) : "Rezervácia do " + esc(x.do))}${td(esc(x.zaujemca || ""), { right: true })}</tr>`));
    f.dopyty_bez_reakcie.forEach(x => rows.push(`<tr>${td(esc(x.dopyt))}${td(esc(x.meno + " · " + x.jednotka))}${td(x.hodinBezReakcie + "&nbsp;h", { right: true, blue: true })}</tr>`));
    f.obhliadky_bez_dalsieho_kroku.forEach(x => rows.push(`<tr>${td(esc(x.dopyt))}${td(esc(x.meno + " · obhliadka " + x.obhliadka))}${td("bez kroku", { right: true })}</tr>`));
    let nn = 1;
    if (rows.length) inner += sec(secLabel("0" + (++nn), "Čo na vás čaká") + table([["Kód"], ["Čo"], ["", true]], rows));
    inner += sec(secLabel("0" + (++nn), "Čo urobiť dnes") + stepsTable(p.kroky.map(nb)), true);
    return { subject: `First Mate · Váš brífing · ${b.dayLabel}`, html: shell(`First Mate · osobný brífing`, p.veta, inner, FOOT), text: [`FIRST MATE · OSOBNÝ BRÍFING · ${b.dayLabel}`, "", p.veta, "", "ČO UROBIŤ DNES", ...p.kroky.map((k, i) => `${i + 1}. ${k}`), "", FOOT].join("\n").replace(/\u00a0/g, " "), previewInner: card(p.veta, inner, FOOT) };
  }

  const TPL = { header, sec, secLabel, secHead, para, table, td, bigNumbers, stepsTable, shell, card, lbl, levelLabel, nb, C, F };
  function validEmail(e) {
    e = String(e || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return "Neplatná e-mailová adresa.";
    if (/@(.+\.)?(example\.(com|org|net)|test|invalid|localhost)$/i.test(e) || /\.(test|invalid|example|localhost)$/i.test(e)) return "Na fiktívne adresy z ukážkových dát (example.com) First Mate neposiela.";
    return null;
  }

  // [[legacy kľúč, funkcia]] z panel/jadro/signaly.js; nastaví app alebo panel/golden.mjs
  let SIGNALY = [];
  function nastavSignaly(z) { SIGNALY = z; }

  return { nastavSignaly, TPL, joinSk, daysBetween, WD, WDL, dm, dmy, KEYS, SLACK_CHANNEL, SLACK_NAME, CMD, PREDAJCOVIA, DEFAULTS, normalize, compute, projectStats, fallbackTexts, aiPrompt, mergeTexts, personalPrompt, personalFallback, personalFacts, emailHtml, emailPreview, emailSubject, emailText, slackText, personalEmail, validEmail, esc, fmt1, fmtInt, fmtPct, eur, localParts, short, pl, SOURCES, FIELDS, OPS, NOVAL, fieldDef, describeRule, validRule, rulePrompt, distinctValues };
})();

// definícia CSV súborov (spec, povinné a voliteľné súbory) a prevod na dáta pre FM
export const CSV = {"dir": "data/", "files": {"projekty": "dev_projekty.csv", "jednotky": "dev_jednotky.csv", "dopyty": "dev_dopyty.csv"}, "labels": {"projekty": "Projekty", "jednotky": "Jednotky", "dopyty": "Dopyty", "uver": "Úver", "tranze": "Tranže", "podmienky": "Podmienky čerpania", "rozpocet": "Rozpočet", "cashflow": "Cash-flow"}, "spec": {"dev_projekty.csv": {"schema": {"id": "text", "kod": "text", "nazov": "text", "lokalita": "text", "etapa": "text", "faza_vystavby": "text", "predajne_miesto": "text", "zaciatok_predaja": "date", "termin_kolaudacie": "date", "uzavierka_klientskych_zmien": "date", "banka_predpredaj_pct": "num", "banka_predpredaj_do": "date", "plan_predaja_pct_k_dnesku": "num", "priemer_konkurencie_za_m2_eur": "num", "created_at": "text", "attio_id": "text", "dph_pct": "num", "zaloha_pct": "num", "zaloha_milnik": "date", "cielove_irr_vk_pct": "num", "vlastny_kapital_plan_eur": "num", "vlastny_kapital_vlozeny_eur": "num"}, "required": ["id", "kod", "nazov", "lokalita", "faza_vystavby", "zaciatok_predaja", "termin_kolaudacie", "banka_predpredaj_pct", "banka_predpredaj_do", "plan_predaja_pct_k_dnesku", "uzavierka_klientskych_zmien", "priemer_konkurencie_za_m2_eur"]}, "dev_jednotky.csv": {"schema": {"id": "text", "kod": "text", "projekt": "text", "projekt_id": "text", "typ": "text", "blok": "text", "izby": "num", "podlazie": "num", "orientacia": "text", "plocha_m2": "num", "exterier": "text", "exterier_m2": "num", "cena_s_dph_eur": "num", "cena_za_m2_eur": "num", "stav": "text", "predajca": "text", "datum_zmeny_stavu": "date", "rezervacia_do": "date", "zaloha_eur": "num", "zaloha_splatna": "date", "zaloha_uhradena": "text", "klientske_zmeny": "text", "zobrazenia_30_dni": "num", "dopyty_30_dni": "num", "ponuka_od": "date", "poznamka": "text", "created_at": "text", "attio_id": "text"}, "required": ["id", "kod", "projekt", "typ", "izby", "podlazie", "orientacia", "plocha_m2", "exterier", "cena_s_dph_eur", "cena_za_m2_eur", "stav", "predajca", "datum_zmeny_stavu", "rezervacia_do", "zaloha_splatna", "zaloha_eur", "zaloha_uhradena", "klientske_zmeny", "zobrazenia_30_dni", "ponuka_od", "poznamka"]}, "dev_dopyty.csv": {"schema": {"id": "text", "kod_dopytu": "text", "meno": "text", "email": "text", "projekt": "text", "projekt_id": "text", "jednotka": "text", "typ_zaujmu": "text", "prijaty": "datetime", "prva_reakcia": "datetime", "reakcia_hodiny": "num", "stav": "text", "predajca": "text", "zdroj": "text", "partnerska_rk": "text", "datum_obhliadky": "date", "miesto_obhliadky": "text", "vysledok_obhliadky": "text", "follow_up": "text", "spatna_vazba": "text", "gdpr_marketing": "text", "created_at": "text", "attio_id": "text"}, "required": ["id", "kod_dopytu", "meno", "projekt", "jednotka", "typ_zaujmu", "prijaty", "prva_reakcia", "reakcia_hodiny", "stav", "predajca", "zdroj", "partnerska_rk", "datum_obhliadky", "miesto_obhliadky", "vysledok_obhliadky", "follow_up", "spatna_vazba"]}, "dev_uver.csv": {"schema": {"id": "text", "projekt_id": "text", "banka": "text", "typ": "text", "limit_eur": "num", "urok_pct": "num", "splatnost": "date", "kovenant_krytie_x": "num", "poznamka": "text", "created_at": "text"}, "required": ["id", "projekt_id", "banka", "limit_eur", "urok_pct", "splatnost", "kovenant_krytie_x"]}, "dev_tranze.csv": {"schema": {"id": "text", "uver_id": "text", "projekt_id": "text", "poradie": "num", "suma_eur": "num", "planovane_cerpanie": "date", "stav": "text", "datum_cerpania": "date", "ucel": "text", "created_at": "text"}, "required": ["id", "uver_id", "projekt_id", "poradie", "suma_eur", "planovane_cerpanie", "stav", "datum_cerpania"]}, "dev_podmienky_cerpania.csv": {"schema": {"id": "text", "tranza_id": "text", "typ": "text", "popis": "text", "ciel": "num", "splnene": "text", "zodpovedny": "text", "created_at": "text"}, "required": ["id", "tranza_id", "typ", "popis", "ciel", "splnene"]}, "dev_rozpocet.csv": {"schema": {"id": "text", "projekt_id": "text", "polozka": "text", "skupina": "text", "rozpocet_eur": "num", "zazmluvnene_eur": "num", "vyfakturovane_eur": "num", "dokoncenie_pct": "num", "odhad_na_dokoncenie_eur": "num", "dodavatel": "text", "aktualizovane": "date", "created_at": "text"}, "required": ["id", "projekt_id", "polozka", "skupina", "rozpocet_eur", "zazmluvnene_eur", "vyfakturovane_eur", "dokoncenie_pct", "odhad_na_dokoncenie_eur"]}, "dev_cashflow.csv": {"schema": {"id": "text", "projekt_id": "text", "rozpocet_id": "text", "polozka": "text", "typ": "text", "mesiac": "date", "plan_eur": "num", "skutocnost_eur": "num", "created_at": "text"}, "required": ["id", "projekt_id", "rozpocet_id", "typ", "mesiac", "plan_eur", "skutocnost_eur"]}}, "optional": {"uver": "dev_uver.csv", "tranze": "dev_tranze.csv", "podmienky": "dev_podmienky_cerpania.csv", "rozpocet": "dev_rozpocet.csv", "cashflow": "dev_cashflow.csv"}};
CSV.toData = raw => FM.normalize(raw);

export default FM;
