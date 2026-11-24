// First Mate · typ firmy realitka: normalizácia dát, kontext signálov, texty brífingu a šablóny
// Vygenerované z legacy/ (docs/migracia/nastroje/rozdel_legacy.mjs, 2026-11-24), odvtedy sa upravuje ručne.
// Výpočty signálov sú v panel/usecases/<id>.js. Kľúče výstupu (b.s1 …) sú zatiaľ pôvodné kvôli textom.
const FM = (() => {
  const DOPYTY = "596fe6c5-b616-4cec-bbe0-77b029f99b71";
  const OBHLIADKY = "d037b930-16c2-4304-9f51-70b89bbd1070";
  const SLACK_CHANNEL = "C0CDGG5MY0Y";
  const SLACK_NAME = "#first-mate-demo";
  // príkaz v Claude pre otázky k brífingu; klient ho môže mať iný (nastavenia: slack.prikaz)
  let CMD = "/first-mate";
  const nastavPrikaz = c => { CMD = c || "/first-mate"; };
  const MAKLERI = ["Katarína Bartošová", "Tomáš Kováč", "Lucia Hudáková", "Peter Molnár", "Simona Lukáčová", "Juraj Šimko"];
  const H = 3600e3, D = 24 * H;
  const TZ = "Europe/Bratislava";

  const DEFAULTS = {
    email: "branislav.crep@gmail.com",
    team: [
      { id: "m0", meno: "Branislav Črep", rola: "manazer", makler: "", email: "branislav.crep@gmail.com", rozsah: "cely", aktivny: true },
      ...MAKLERI.map((m, i) => ({ id: "m" + (i + 1), meno: m, rola: "makler", makler: m, email: "", rozsah: "svoje", aktivny: false }))
    ],
    signals: {
      period: 7,
      s1: { on: true, hours: 48 },
      s2: { on: true, fastHours: 4 },
      s3: { on: true, minViews: 200, days: 14 },
      s4: { on: true, days: 14 }
    },
    schedule: { days: [1, 2, 3, 4, 5], time: "07:30", slack: true, email: false, team: false },
    automation: { active: false }
  };

  // ---------- pomocné ----------
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const val = v => (v && typeof v === "object" && !Array.isArray(v) && "value" in v) ? v.value : v;
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
  function localParts(ms) {
    const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(ms));
    const g = t => (p.find(x => x.type === t) || {}).value;
    return { date: `${g("year")}-${g("month")}-${g("day")}`, wd: g("weekday"), hm: `${g("hour")}:${g("minute")}` };
  }
  function addDays(dstr, n) { const t = Date.parse(dstr + "T12:00:00Z") + n * D; return new Date(t).toISOString().slice(0, 10); }
  const WD = { Sun: "ne", Mon: "po", Tue: "ut", Wed: "st", Thu: "št", Fri: "pi", Sat: "so" };
  const WDL = { Sun: "nedeľa", Mon: "pondelok", Tue: "utorok", Wed: "streda", Thu: "štvrtok", Fri: "piatok", Sat: "sobota" };
  const dm = dstr => { const [y, m, d] = dstr.split("-"); return `${+d}. ${+m}.`; };
  const dmy = dstr => { const [y, m, d] = dstr.split("-"); return `${+d}. ${+m}. ${y}`; };
  const fmt1 = n => (Math.round(n * 10) / 10).toFixed(1).replace(".", ",");
  const fmtInt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  function pl(n, a, b, c) { return n === 1 ? a : (n >= 2 && n <= 4 ? b : c); }
  const short = name => { if (!name) return ""; const p = name.split(" "); return p.length > 1 ? p[0][0] + ". " + p.slice(1).join(" ") : name; };
  const lok = l => (l || "").replace(/^Bratislava – /, "");
  function joinSk(arr) { if (arr.length <= 1) return arr.join(""); return arr.slice(0, -1).join(", ") + " a " + arr[arr.length - 1]; }
  const endS = x => /\.$/.test(x) ? x : x + ".";
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;

  // ---------- načítanie dát ----------
  // ---------- načítanie dát: CSV súbory (pôvodne konektor Attio) ----------
  function refId(v) { v = val(v); if (!v) return null; if (Array.isArray(v)) v = v[0]; if (typeof v === "string") return v; return v.record_id || v.target_record_id || null; }
  function normalize(raw) {
    const A = e => e.attributes || e.values || e;
    const dop = e => { const a = A(e); return { id: e.entry_id || (e.id && e.id.entry_id), kod: val(a.kod_dopytu), prijaty: ts(a.prijaty), reakcia: ts(a.prva_reakcia), hodiny: typeof val(a.reakcia_hodiny) === "number" ? val(a.reakcia_hodiny) : null, stav: val(a.stav_dopytu), makler: val(a.makler), dealId: refId(a.nehnutelnost) }; };
    const map = new Map();
    raw.recent.map(dop).forEach(d => map.set(d.id, d));
    raw.unanswered.map(dop).forEach(d => map.set(d.id, d));
    const dopyty = [...map.values()].filter(d => d.prijaty);
    const obhliadky = raw.viewings.map(e => { const a = A(e); return { id: e.entry_id, datum: ts(a.datum_obhliadky), makler: val(a.makler), dealId: refId(a.nehnutelnost), vysledok: val(a.vysledok) }; }).filter(o => o.datum);
    const deals = raw.deals.map(r => { const a = A(r); const num = x => { x = val(x); return typeof x === "number" ? x : (x == null ? null : Number(String(x).replace(/[^\d.]/g, "")) || null); };
      return { id: r.record_id || (r.id && r.id.record_id), kod: val(a.kod), nazov: val(a.name), lokalita: val(a.lokalita), makler: val(a.makler), stage: val(a.stage), views7: num(a.zobrazenia_za_7_dni) || 0, viewsTotal: num(a.zobrazenia_spolu) || 0, cenaM2: num(a.cena_za_m2_eur), priemerM2: num(a.priemer_lokality_za_m2_eur), exkl: val(a.exkluzivita) === true || val(a.exkluzivita) === "true", exklDo: dateStr(a.exkluzivita_do), nasadenie: dateStr(a.datum_nasadenia), zmenaCeny: dateStr(a.posledna_zmena_ceny) }; });
    return { dopyty, obhliadky, deals, counts: { unanswered: raw.unanswered.length, recent: raw.recent.length, viewings: raw.viewings.length, deals: raw.deals.length } };
  }

  // ---------- výpočet signálov (deterministicky, v kóde) ----------
  function compute(data, s, now) {
    const P = s.period * D;
    const lp = localParts(now);
    const today = lp.date;
    const dealById = new Map(data.deals.map(d => [d.id, d]));
    const active = d => d.stage !== "Predané" && d.stage !== "Stiahnutá";
    const byMakler = arr => { const m = {}; arr.forEach(x => { const k = x.makler || "neurčený"; m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([makler, n]) => ({ makler, n })); };
    const days14 = 14 * D;
    const dop14 = id => data.dopyty.filter(d => d.dealId === id && d.prijaty >= now - days14 && d.prijaty <= now).length;
    const obh14 = id => data.obhliadky.filter(o => o.dealId === id && o.datum >= now - days14 && o.datum <= now).length;
    const out = { now, today, dayLabel: `${WD[lp.wd] || ""} ${dm(today)}`, dayLong: `${WDL[lp.wd] || ""} ${dmy(today)}`, settings: s };

    // signály z katalógu use casov (panel/usecases/<id>.js), poradie podľa usecases/typy.json
    const ctx = { out, H, lok, P, dealById, byMakler, data, s, now, mean, D, dop14, addDays, dm, today, active, obh14 };
    for (const [kluc, fn] of SIGNALY) fn({ ...ctx, kluc });
    // Horúce ponuky: veľa dopytov, žiadna obhliadka (pre návrh krokov)
    out.hot = data.deals.filter(d => d.stage === "Aktívna ponuka").map(d => ({ kod: d.kod, lokalita: lok(d.lokalita), makler: d.makler, dopyty14: dop14(d.id), obhliadky14: obh14(d.id) }))
      .filter(x => x.dopyty14 >= 3 && x.obhliadky14 === 0).sort((a, b) => b.dopyty14 - a.dopyty14).slice(0, 3);
    out.dataInfo = data.counts;
    return out;
  }

  // ---------- texty: záložné (bez AI) ----------
  function fallbackTexts(b) {
    const t = {};
    if (b.s1.count > 0) {
      t.nadpis = "Dopyty čakajú"; t.podnadpis = `${b.s1.count} bez reakcie nad ${b.s1.hours} h`;
    } else if (b.s4.items.some(x => x.rizikova)) {
      t.nadpis = "Pozor na exkluzivity"; t.podnadpis = `${b.s4.count} končí do ${b.s4.days} dní`;
    } else { t.nadpis = "Pokojné ráno"; t.podnadpis = "bez naliehavých signálov"; }
    t.s1 = `Na všetky dopyty niekto zareagoval do ${b.s1.hours} h.`;
    if (b.s1.count > 0) t.s1 = `${b.s1.byMakler[0].n} z nich má ${b.s1.byMakler[0].makler}` + (b.s1.byMakler.length > 1 ? ", " + joinSk(b.s1.byMakler.slice(1).map(x => `${x.n} ${x.makler}`)) : "") + ". Pri každom ďalšom dni rastie riziko, že kupujúci odíde ku konkurencii.";
    t.s2 = b.s2.mean == null ? "Za posledné obdobie nie sú dáta o reakciách." : `${b.s2.fast} ${pl(b.s2.fast, "maklér reaguje", "makléri reagujú", "maklérov reaguje")} do ${b.s2.fastHours} h.` + (b.s2.slowest && b.s2.slowest.hodiny > b.s2.fastHours ? ` Najdlhšie reaguje ${b.s2.slowest.makler} s ${fmt1(b.s2.slowest.hodiny)} h.` : "");
    t.s3 = b.s3.top ? `Najvýraznejšia je ${b.s3.top.kod} ${b.s3.top.lokalita} (${short(b.s3.top.makler)}): ${fmtInt(b.s3.top.views7)} zobrazení za týždeň a 0 obhliadok.` + (b.s3.top.nadPriemerPct != null && b.s3.top.nadPriemerPct > 0 ? ` Cena ${fmtInt(b.s3.top.cenaM2)} €/m² je o ${b.s3.top.nadPriemerPct} % nad priemerom lokality.` : "") : "Žiadna ponuka s veľkým záujmom nezostala bez obhliadky.";
    const r = b.s4.items.find(x => x.rizikova);
    const others = b.s4.items.filter(x => x !== r);
    t.s4 = b.s4.count === 0 ? `Žiadna exkluzivita nekončí v najbližších ${b.s4.days} dňoch.` : (r ? `${r.kod} ${r.lokalita} (${short(r.makler)}) končí ${r.koniec} a za 14 dní nemala obhliadku ani dopyt.` : "") + (others.length ? " " + endS(`${r ? "Ďalej" : "Končia"} ${joinSk(others.map(x => `${x.kod} ${x.lokalita} (${short(x.makler)}) ${x.koniec}`))}`) : "");
    t.s4 = t.s4.trim();
    const k = [];
    if (b.s1.count > 0) k.push(`Prerozdeliť ${b.s1.byMakler[0].n} ${pl(b.s1.byMakler[0].n, "nevybavený dopyt", "nevybavené dopyty", "nevybavených dopytov")} (maklér ${short(b.s1.byMakler[0].makler)}) a ozvať sa klientom do 12:00.` + (b.hot[0] ? ` Prednosť má ${b.hot[0].kod} ${b.hot[0].lokalita}: ${b.hot[0].dopyty14} ${pl(b.hot[0].dopyty14, "dopyt", "dopyty", "dopytov")} za 2 týždne, 0 obhliadok.` : ""));
    if (b.s3.top) k.push(`${short(b.s3.top.makler)}: prebrať s majiteľom ${b.s3.top.kod} cenu, podklad sú zobrazenia a priemer lokality.`);
    if (r) k.push(`${short(r.makler)}: ešte tento týždeň dohodnúť s predávajúcim ${r.kod} stretnutie o predĺžení exkluzivity.`);
    if (k.length < 3 && b.hot[0] && b.s1.count === 0) k.push(`${short(b.hot[0].makler)}: dohodnúť obhliadky pre ${b.hot[0].kod}, má ${b.hot[0].dopyty14} dopyty za 2 týždne a žiadnu obhliadku.`);
    t.kroky = k.slice(0, 3);
    t.zhrnutie = [b.s1.on && b.s1.count > 0 ? `Na ${b.s1.count} ${pl(b.s1.count, "dopyt", "dopyty", "dopytov")} nikto nereagoval viac ako ${b.s1.hours} hodín, pred týždňom ${b.s1.prev === 0 ? "nebol takýto ani jeden" : "ich bolo " + b.s1.prev}.` : "",
      b.s2.on && b.s2.mean != null ? `Priemerný čas prvej reakcie je ${fmt1(b.s2.mean)} h${b.s2.prev != null ? ` (predtým ${fmt1(b.s2.prev)} h)` : ""}.` : "",
      b.s4.on && b.s4.count > 0 ? `Blíži sa koniec ${b.s4.count} ${pl(b.s4.count, "exkluzivity", "exkluzivít", "exkluzivít")}.` : ""].filter(Boolean).join(" ");
    const top = b.s1.byMakler[0];
    t.zistenie = top ? `${top.n} z ${b.s1.count} nevybavených dopytov má ${top.makler}` + ((b.s2.perMakler.find(x => x.makler === top.makler) || {}).hodiny ? `, ktorý reaguje v priemere za ${fmt1(b.s2.perMakler.find(x => x.makler === top.makler).hodiny)} h.` : ".") : (b.s3.top ? `${b.s3.top.kod} má ${fmtInt(b.s3.top.views7)} zobrazení za týždeň a žiadnu obhliadku.` : "Žiadny signál dnes nevyžaduje okamžitú akciu.");
    return t;
  }

  // ---------- AI interpretácia ----------
  function facts(b) {
    const f = { dnes: b.dayLong, obdobie_dni: b.settings.period };
    if (b.s1.on) f.s1_dopyty_bez_reakcie = { hranica_hodin: b.s1.hours, pocet: b.s1.count, pred_tyzdnom: b.s1.prev, podla_maklera: b.s1.byMakler, dopyty: b.s1.items.slice(0, 12) };
    if (b.s2.on) f.s2_cas_prvej_reakcie = { priemer_hodin: b.s2.mean && +b.s2.mean.toFixed(1), predtym_hodin: b.s2.prev && +b.s2.prev.toFixed(1), rychla_reakcia_do_hodin: b.s2.fastHours, pocet_maklerov_do_hranice: b.s2.fast, podla_maklera: b.s2.perMakler.map(x => ({ makler: x.makler, hodin: +x.hodiny.toFixed(1), dopytov: x.n })) };
    if (b.s3.on) f.s3_zaujem_bez_obhliadky = { min_zobrazeni_za_7_dni: b.s3.minViews, bez_obhliadky_dni: b.s3.days, pocet: b.s3.count, ponuky: b.s3.items.slice(0, 5) };
    if (b.s4.on) f.s4_konciace_exkluzivity = { do_dni: b.s4.days, pocet: b.s4.count, pred_tyzdnom: b.s4.prev, ponuky: b.s4.items };
    f.ponuky_vela_dopytov_bez_obhliadky_14_dni = b.hot;
    return f;
  }
  function aiPrompt(b) {
    const keys = ["s1", "s2", "s3", "s4"].filter(k => b[k].on);
    return `Si First Mate, AI analytik realitnej kancelárie. Z faktov nižšie napíš texty ranného brífingu pre manažéra kancelárie.

Pravidlá:
- Po slovensky, krátke vecné vety, tón kolegu, nie robota.
- Používaj IBA čísla, mená a kódy z faktov. Nič nevymýšľaj, nič nezaokrúhľuj inak než vo faktoch.
- Desatinná čiarka (8,8 h). Mená maklérov celé alebo v tvare „T. Kováč“.
- Nepoužívaj dlhé pomlčky ani pomlčky ako interpunkciu (znaky — a –) okrem názvov lokalít.
- Kroky musia byť konkrétne: kto, čo, pri ktorej nehnuteľnosti, dokedy.

Vráť IBA JSON objekt s kľúčmi:
- "nadpis": 2 až 3 slová, hlavná téma dňa
- "podnadpis": krátky údaj k nadpisu, napr. „9 bez reakcie nad 48 h“
- "zhrnutie": 2 až 3 vety o tom, ako je na tom kancelária
- "zistenie": 1 až 2 vety, najdôležitejšie zistenie dňa a prečo na ňom záleží
${keys.map(k => `- "${k}": 1 až 2 vety, čo signál ${k} znamená (koho sa týka, prečo je dôležitý); nezačínaj opakovaním čísla z nadpisu signálu`).join("\n")}
- "kroky": pole presne 3 krokov na dnes (každý jedna veta)

Fakty (JSON):
${JSON.stringify(facts(b))}`;
  }
  function mergeTexts(ai, fb, b) {
    const t = { ...fb };
    if (ai && typeof ai === "object") {
      for (const k of ["nadpis", "podnadpis", "zhrnutie", "zistenie", "s1", "s2", "s3", "s4"]) if (typeof ai[k] === "string" && ai[k].trim()) t[k] = ai[k].trim();
      if (Array.isArray(ai.kroky) && ai.kroky.filter(x => typeof x === "string" && x.trim()).length >= 2) t.kroky = ai.kroky.filter(x => typeof x === "string" && x.trim()).slice(0, 3).map(x => x.trim());
      t.ai = true;
    }
    const clean = x => x.replace(/\s—\s/g, ", ").replace(/(?<!Bratislava)\s–\s/g, ", ").replace(/—/g, ",");
    for (const k of Object.keys(t)) if (typeof t[k] === "string") t[k] = clean(t[k]);
    t.kroky = t.kroky.map(clean);
    return t;
  }
  function personalPrompt(b, members) {
    const per = members.map(m => personalFacts(b, m.makler));
    return `Si First Mate, AI analytik realitnej kancelárie. Pre každého makléra napíš krátky osobný ranný brífing z jeho faktov.
Pravidlá: po slovensky, oslovuj ho priamo (vykanie), krátko a vecne, IBA čísla a kódy z faktov, bez pomlčiek — a –. Ak nemá žiadny problém, pochváľ ho jednou vetou.
Vráť IBA JSON objekt: kľúč = meno makléra, hodnota = {"veta": 1 až 2 vety zhrnutia, "kroky": pole 1 až 3 konkrétnych krokov na dnes}.
Fakty (JSON):
${JSON.stringify(per)}`;
  }
  function personalFacts(b, makler) {
    return {
      makler,
      dopyty_bez_reakcie_nad_hodin: b.s1.hours,
      dopyty_bez_reakcie: b.s1.items.filter(x => x.makler === makler),
      priemer_reakcie_hodin: (b.s2.perMakler.find(x => x.makler === makler) || {}).hodiny ?? null,
      priemer_timu_hodin: b.s2.mean,
      ponuky_zaujem_bez_obhliadky: b.s3.items.filter(x => x.makler === makler),
      konciace_exkluzivity: b.s4.items.filter(x => x.makler === makler),
      ponuky_vela_dopytov_bez_obhliadky: b.hot.filter(x => x.makler === makler)
    };
  }
  function personalFallback(b, makler) {
    const f = personalFacts(b, makler);
    const k = [];
    if (f.dopyty_bez_reakcie.length) k.push(`Ozvať sa dnes do 12:00 na ${f.dopyty_bez_reakcie.length} ${pl(f.dopyty_bez_reakcie.length, "dopyt", "dopyty", "dopytov")} bez reakcie (${f.dopyty_bez_reakcie.map(x => x.kod).join(", ")}).`);
    f.ponuky_zaujem_bez_obhliadky.slice(0, 1).forEach(x => k.push(`Prebrať s majiteľom ${x.kod} cenu: ${fmtInt(x.views7)} zobrazení za týždeň a 0 obhliadok.`));
    f.konciace_exkluzivity.slice(0, 1).forEach(x => k.push(`Dohodnúť s predávajúcim ${x.kod} predĺženie exkluzivity, končí ${x.koniec}`));
    const pr = f.priemer_reakcie_hodin;
    const veta = f.dopyty_bez_reakcie.length ? `Máte ${f.dopyty_bez_reakcie.length} ${pl(f.dopyty_bez_reakcie.length, "dopyt", "dopyty", "dopytov")} bez reakcie dlhšie ako ${b.s1.hours} h.` + (pr != null ? ` Váš priemerný čas reakcie je ${fmt1(pr)} h.` : "") : (pr != null ? `Na dopyty reagujete v priemere za ${fmt1(pr)} h, bez nevybavených dopytov. Výborne.` : "Dnes nemáte žiadne naliehavé signály.");
    return { veta, kroky: k.length ? k.slice(0, 3) : ["Pokračovať v bežnej agende."] };
  }

  // ---------- šablóny ----------
  const C = { ink: "#0B0B0C", muted: "#55524A", blue: "#1B2CC1", sand: "#EAE6DB", paper: "#F9F9F5", tint: "#D8DCF6", foot: "#D6D3C9", footMono: "#A9B1F5" };
  const F = { sans: "Arial,Helvetica,sans-serif", mono: "Menlo,Consolas,monospace" };
  const lbl = (txt, color) => `<div style="font-family:${F.mono};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${color || C.muted};margin-bottom:4px;">${txt}</div>`;
  const secLabel = (n, txt) => `<div style="font-family:${F.mono};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};margin:0 0 14px 0;"><span style="color:${C.blue};">${n}</span>&nbsp;&nbsp;${txt}</div>`;
  const secHead = (bold, mono) => `<div style="font-family:${F.sans};font-size:24px;line-height:30px;font-weight:bold;color:${C.ink};margin:0 0 14px 0;">${esc(bold)} <span style="font-family:${F.mono};font-weight:normal;font-size:16px;color:${C.muted};">/ ${esc(mono)}</span></div>`;
  const para = (txt, extra) => `<p style="font-family:${F.sans};font-size:15px;line-height:23px;color:${C.ink};margin:0 0 12px 0;${extra || ""}">${txt}</p>`;
  const th = (t, right) => `<th align="${right ? "right" : "left"}" style="font-family:${F.mono};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${C.muted};font-weight:normal;padding:0 0 8px 0;border-bottom:2px solid ${C.ink};text-align:${right ? "right" : "left"};">${t}</th>`;
  const td = (t, o = {}) => `<td align="${o.right ? "right" : "left"}" style="font-family:${F.sans};font-size:15px;color:${o.blue ? C.blue : C.ink};${o.blue ? "font-weight:600;" : ""}${o.bold ? "font-weight:bold;" : ""}padding:10px 0;text-align:${o.right ? "right" : "left"};">${t}</td>`;
  const sec = (inner, last) => `<tr><td class="px" style="padding:36px 32px ${last ? "36px" : "0"} 32px;">${inner}</td></tr>`;
  const levelLabel = l => l === "red" ? lbl("Konať dnes", C.blue) : (l === "yellow" ? lbl("Sledovať") : lbl("V poriadku"));
  const nb = s => String(s).replace(/ (h|%|€)/g, "\u00a0$1");

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
  const FOOT = "Čísla sú vypočítané z dát CRM v čase odoslania, interpretáciu napísala AI. Ide o ukážkovú realitnú kanceláriu, všetky osoby a nehnuteľnosti sú fiktívne.";

  function briefInner(b, t) {
    const s = b.settings; let n = 0; const N = () => "0" + (++n);
    let h = header(`Ranný brífing &middot; ${esc(b.dayLabel)}&nbsp;${b.today.slice(0, 4)}`, "Dobré ráno", `CRM &middot; posledných ${s.period} dní oproti predchádzajúcim ${s.period} dňom`);
    const cells = [];
    if (b.s1.on) cells.push({ v: String(b.s1.count), l: `Dopyty bez reakcie nad ${b.s1.hours} h · pred týždňom ${b.s1.prev}`, blue: b.s1.level === "red" });
    if (b.s2.on) cells.push({ v: b.s2.mean == null ? "–" : nb(fmt1(b.s2.mean) + " h"), l: `Priemerná prvá reakcia` + (b.s2.prev != null ? ` · predtým ${fmt1(b.s2.prev)} h` : ""), blue: b.s2.level === "red" });
    if (b.s3.on) cells.push({ v: String(b.s3.count), l: `Ponuky ${b.s3.minViews}+ zobrazení bez obhliadky` });
    if (b.s4.on) cells.push({ v: String(b.s4.count), l: `Exkluzivity končiace do ${b.s4.days} dní · pred týždňom ${b.s4.prev}` });
    h += sec(secLabel(N(), "Ako je na tom kancelária") + secHead(t.nadpis, t.podnadpis) + para(esc(nb(t.zhrnutie))) + (cells.length ? bigNumbers(cells) : "") +
      `<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0"><tr><td style="background:${C.sand};border-left:4px solid ${C.blue};padding:16px 18px;">${lbl("Najdôležitejšie zistenie", C.blue).replace("margin-bottom:4px", "margin-bottom:6px")}<div style="font-family:${F.sans};font-size:15px;line-height:23px;color:${C.ink};">${esc(nb(t.zistenie))}</div></td></tr></table>`);
    const items = [];
    if (b.s1.on) items.push([b.s1.level, `Dopyty bez reakcie viac ako ${b.s1.hours}\u00a0h: ${b.s1.count}`, `(pred týždňom ${b.s1.prev}). `, t.s1]);
    if (b.s2.on) items.push([b.s2.level, `Priemerný čas prvej reakcie: ${b.s2.mean == null ? "bez dát" : fmt1(b.s2.mean) + "\u00a0h"}`, b.s2.prev != null ? `(predtým ${fmt1(b.s2.prev)}\u00a0h). ` : "", t.s2]);
    if (b.s3.on) items.push([b.s3.level, `Ponuky s ${b.s3.minViews}+ zobrazeniami a bez obhliadky za ${b.s3.days} dní: ${b.s3.count}.`, " ", t.s3]);
    if (b.s4.on) items.push([b.s4.level, `Exkluzivity končiace do ${b.s4.days} dní: ${b.s4.count}`, `(pred týždňom ${b.s4.prev}). `, t.s4]);
    if (items.length) h += sec(secLabel(N(), "Signály") + `<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0" style="border-top:2px solid ${C.ink};">` + items.map(([lv, head, mid, txt]) =>
      `<tr><td style="padding:14px 0 0 0;">${levelLabel(lv)}<div style="font-family:${F.sans};font-size:15px;line-height:23px;color:${C.ink};"><b>${esc(head)}</b> ${esc(mid)}${esc(nb(txt))}</div></td></tr>`).join("") + `</table>`);
    if (b.s1.on && b.s1.count > 0) h += sec(secLabel(N(), "Dopyty bez reakcie podľa makléra") + `<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;"><tr>${th("Maklér")}${th(`Bez reakcie nad ${b.s1.hours}&nbsp;h`, true)}</tr>` +
      b.s1.byMakler.map((x, i) => `<tr>${td(esc(x.makler))}${td(x.n, { right: true, blue: i === 0 })}</tr>`).join("") + `<tr>${td("Spolu", { bold: true })}${td(b.s1.count, { right: true, bold: true })}</tr></table>`);
    if (b.s4.on && b.s4.count > 0) h += sec(secLabel(N(), `Exkluzivity končiace do ${b.s4.days} dní`) + `<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;"><tr>${th("Nehnuteľnosť")}${th("Maklér")}${th("Koniec", true)}</tr>` +
      b.s4.items.map(x => `<tr>${td(esc(x.kod + " " + x.lokalita))}${td(esc(short(x.makler)))}${td(esc(x.koniec).replace(" ", "&nbsp;"), { right: true, blue: x.rizikova })}</tr>`).join("") + `</table>` +
      (b.s4.items.some(x => x.rizikova) ? `<p style="font-family:${F.sans};font-size:13px;line-height:20px;color:${C.muted};margin:12px 0 0 0;">Modrou: za posledných 14 dní bez obhliadky aj bez dopytu.</p>` : ""));
    h += sec(secLabel(N(), "Čo urobiť dnes") + secHead(t.kroky.length === 1 ? "Jeden krok" : (t.kroky.length === 2 ? "Dva kroky" : "Tri kroky"), b.dayLabel) + stepsTable(t.kroky.map(nb)) +
      para(`Chcete vedieť viac alebo niečo rovno vykonať? Otvorte Claude a napíšte <span style="font-family:${F.mono};font-size:14px;color:${C.blue};white-space:nowrap;">${CMD}</span>.`, "margin:24px 0 0 0;"), true);
    return h;
  }
  function emailHtml(b, t) { return shell(`First Mate · ranný brífing · ${b.dayLabel}`, t.zistenie, briefInner(b, t), FOOT); }
  function emailPreview(b, t) { return card(t.zistenie, briefInner(b, t), FOOT); }
  function emailSubject(b, t) { return `First Mate · ranný brífing · ${b.dayLabel}: ${t.podnadpis}`; }
  function emailText(b, t) {
    const L = [`FIRST MATE · RANNÝ BRÍFING · ${b.dayLabel}`, "", `${t.nadpis} / ${t.podnadpis}`, t.zhrnutie, "", `Najdôležitejšie zistenie: ${t.zistenie}`, "", "SIGNÁLY"];
    if (b.s1.on) L.push(`- Dopyty bez reakcie viac ako ${b.s1.hours} h: ${b.s1.count} (pred týždňom ${b.s1.prev}). ${t.s1}`);
    if (b.s2.on) L.push(`- Priemerný čas prvej reakcie: ${b.s2.mean == null ? "bez dát" : fmt1(b.s2.mean) + " h"}${b.s2.prev != null ? ` (predtým ${fmt1(b.s2.prev)} h)` : ""}. ${t.s2}`);
    if (b.s3.on) L.push(`- Ponuky s ${b.s3.minViews}+ zobrazeniami a bez obhliadky za ${b.s3.days} dní: ${b.s3.count}. ${t.s3}`);
    if (b.s4.on) L.push(`- Exkluzivity končiace do ${b.s4.days} dní: ${b.s4.count} (pred týždňom ${b.s4.prev}). ${t.s4}`);
    L.push("", "ČO UROBIŤ DNES", ...t.kroky.map((k, i) => `${i + 1}. ${k}`), "", `Otázky a pokyny: otvorte Claude a napíšte ${CMD}.`, "", FOOT);
    return L.join("\n");
  }
  function slackText(b, t) {
    const em = l => l === "red" ? ":red_circle:" : (l === "yellow" ? ":large_yellow_circle:" : ":large_green_circle:");
    const L = [`:sunny: **First Mate · ranný brífing · ${b.dayLabel}**`, `_Posledných ${b.settings.period} dní oproti predchádzajúcim ${b.settings.period} dňom_`, ""];
    let i = 0;
    if (b.s1.on) L.push(`**${++i}. Dopyty bez reakcie viac ako ${b.s1.hours} h: ${b.s1.count}** (pred týždňom ${b.s1.prev}) ${em(b.s1.level)}`, `→ ${t.s1}`, "");
    if (b.s2.on) L.push(`**${++i}. Priemerný čas prvej reakcie: ${b.s2.mean == null ? "bez dát" : fmt1(b.s2.mean) + " h"}**${b.s2.prev != null ? ` (predtým ${fmt1(b.s2.prev)} h)` : ""} ${em(b.s2.level)}`, `→ ${t.s2}`, "");
    if (b.s3.on) L.push(`**${++i}. Ponuky s ${b.s3.minViews}+ zobrazeniami a bez obhliadky za ${b.s3.days} dní: ${b.s3.count}** ${em(b.s3.level)}`, `→ ${t.s3}`, "");
    if (b.s4.on) L.push(`**${++i}. Exkluzivity končiace do ${b.s4.days} dní: ${b.s4.count}** (pred týždňom ${b.s4.prev}) ${em(b.s4.level)}`, `→ ${t.s4}`, "");
    L.push("**Čo urobiť dnes**", ...t.kroky.map((k, j) => `${j + 1}. ${k}`), `_Napíšte do vlákna, čo treba urobiť, a pokračujte v Claude príkazom ${CMD}._`);
    return L.join("\n");
  }
  function personalEmail(b, member, p) {
    const f = personalFacts(b, member.makler);
    const pr = f.priemer_reakcie_hodin;
    const cells = [
      { v: String(f.dopyty_bez_reakcie.length), l: `Vaše dopyty bez reakcie nad ${b.s1.hours} h`, blue: f.dopyty_bez_reakcie.length > 0 },
      { v: pr == null ? "–" : nb(fmt1(pr) + " h"), l: `Váš priemer reakcie · tím ${b.s2.mean == null ? "–" : fmt1(b.s2.mean) + " h"}` },
      { v: String(f.ponuky_zaujem_bez_obhliadky.length), l: `Vaše ponuky bez obhliadky` },
      { v: String(f.konciace_exkluzivity.length), l: `Vaše končiace exkluzivity` }
    ];
    let inner = header(`Osobný brífing &middot; ${esc(b.dayLabel)}&nbsp;${b.today.slice(0, 4)}`, `Dobré ráno, ${member.meno.split(" ")[0]}`, `CRM &middot; ${esc(member.makler)} &middot; posledných ${b.settings.period} dní`);
    inner += sec(secLabel("01", "Vaše čísla") + para(esc(nb(p.veta))) + bigNumbers(cells));
    if (f.dopyty_bez_reakcie.length) inner += sec(secLabel("02", "Dopyty, ktoré čakajú") + `<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;"><tr>${th("Dopyt")}${th("Nehnuteľnosť")}${th("Čaká", true)}</tr>` +
      f.dopyty_bez_reakcie.map(x => `<tr>${td(esc(x.kod))}${td(esc(x.nehnutelnost + " " + x.lokalita))}${td(x.hodinBezReakcie + "&nbsp;h", { right: true, blue: true })}</tr>`).join("") + `</table>`);
    inner += sec(secLabel(f.dopyty_bez_reakcie.length ? "03" : "02", "Čo urobiť dnes") + stepsTable(p.kroky.map(nb)), true);
    return { subject: `First Mate · Váš brífing · ${b.dayLabel}`, html: shell(`First Mate · osobný brífing`, p.veta, inner, FOOT), text: [`FIRST MATE · OSOBNÝ BRÍFING · ${b.dayLabel}`, "", p.veta, "", "ČO UROBIŤ DNES", ...p.kroky.map((k, i) => `${i + 1}. ${k}`), "", FOOT].join("\n"), previewInner: card(p.veta, inner, FOOT) };
  }

  function validEmail(e) {
    e = String(e || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return "Neplatná e-mailová adresa.";
    if (/@(.+\.)?(example\.(com|org|net)|test|invalid|localhost)$/i.test(e) || /\.(test|invalid|example|localhost)$/i.test(e)) return "Na fiktívne adresy z ukážkových dát (example.com) First Mate neposiela.";
    return null;
  }

  // [[legacy kľúč, funkcia]] z panel/jadro/signaly.js; nastaví app alebo panel/golden.mjs
  let SIGNALY = [];
  function nastavSignaly(z) { SIGNALY = z; }

  return { nastavSignaly, nastavPrikaz, get CMD() { return CMD; }, WD, WDL, dm, DOPYTY, OBHLIADKY, SLACK_CHANNEL, SLACK_NAME, MAKLERI, DEFAULTS, normalize, compute, fallbackTexts, aiPrompt, mergeTexts, personalPrompt, personalFallback, personalFacts, emailHtml, emailPreview, emailSubject, emailText, slackText, personalEmail, validEmail, esc, fmt1, localParts, short };
})();

// definícia CSV súborov (spec, povinné a voliteľné súbory) a prevod na dáta pre FM
export const CSV = {"dir": "data/", "files": {"nehnutelnosti": "nehnutelnosti.csv", "dopyty": "dopyty.csv", "obhliadky": "obhliadky.csv"}, "labels": {"nehnutelnosti": "Nehnuteľnosti", "dopyty": "Dopyty", "obhliadky": "Obhliadky"}, "spec": {"nehnutelnosti.csv": {"schema": {"id": "text", "kod": "text", "name": "text", "stage": "text", "typ": "text", "lokalita": "text", "izby": "num", "plocha_m2": "num", "stav_nehnutelnosti": "text", "value": "num", "povodna_cena_eur": "num", "cena_za_m2_eur": "num", "priemer_lokality_za_m2_eur": "num", "provizia": "num", "makler": "text", "exkluzivita": "bool", "exkluzivita_do": "date", "datum_nasadenia": "date", "posledna_zmena_ceny": "date", "zobrazenia_spolu": "num", "zobrazenia_za_7_dni": "num", "associated_people": "multi", "owner": "text", "created_at": "text", "attio_id": "text"}, "required": ["id", "kod", "name", "lokalita", "makler", "stage", "zobrazenia_za_7_dni", "zobrazenia_spolu", "cena_za_m2_eur", "priemer_lokality_za_m2_eur", "exkluzivita", "exkluzivita_do", "datum_nasadenia", "posledna_zmena_ceny"]}, "dopyty.csv": {"schema": {"id": "text", "kod_dopytu": "text", "kontakt": "text", "nehnutelnost": "text", "prijaty": "datetime", "zdroj_dopytu": "text", "makler": "text", "prva_reakcia": "datetime", "reakcia_hodiny": "num", "stav_dopytu": "text", "created_at": "text", "attio_id": "text"}, "required": ["id", "kod_dopytu", "nehnutelnost", "prijaty", "prva_reakcia", "reakcia_hodiny", "stav_dopytu", "makler"]}, "obhliadky.csv": {"schema": {"id": "text", "kod_obhliadky": "text", "kontakt": "text", "nehnutelnost": "text", "datum_obhliadky": "datetime", "makler": "text", "vysledok": "text", "spatna_vazba": "text", "created_at": "text", "attio_id": "text"}, "required": ["id", "kod_obhliadky", "nehnutelnost", "datum_obhliadky", "makler", "vysledok"]}}};
CSV.toData = (raw, teraz = Date.now()) => {
  const since = teraz - 30 * 864e5, t = v => v ? Date.parse(v) : NaN;
  const ent = r => ({ entry_id: r.attributes.id, attributes: r.attributes });
  const dop = raw.dopyty.map(ent), obh = raw.obhliadky.map(ent);
  const d = FM.normalize({
    unanswered: dop.filter(e => e.attributes.stav_dopytu === "nový – bez reakcie"),
    recent: dop.filter(e => t(e.attributes.prijaty) >= since).sort((a, b) => t(b.attributes.prijaty) - t(a.attributes.prijaty)),
    viewings: obh.filter(e => t(e.attributes.datum_obhliadky) >= since).sort((a, b) => t(b.attributes.datum_obhliadky) - t(a.attributes.datum_obhliadky)),
    deals: raw.nehnutelnosti.map(r => ({ record_id: r.attributes.id, attributes: r.attributes }))
  });
  return d;
};

export default FM;
