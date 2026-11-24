// First Mate · aplikácia panela (ES modul). Vygenerované z legacy/panel-developer (docs/migracia/nastroje/rozdel_rozhranie.mjs, 2026-11-24), odvtedy sa upravuje ručne.
// Typ firmy (realitka, developer) určuje objekt typu z panel/rozhranie/<typ>.js; rozdiely sú v ňom alebo v malých vetvách `if (DEV)`.
import FMCSV from "./jadro/csv.js";
import { zostavSignaly } from "./jadro/signaly.js";
import ROZ_REALITKA from "./rozhranie/realitka.js";
import ROZ_DEVELOPER from "./rozhranie/developer.js";

// koreň repozitára (alebo zverejneného artefaktu) s data/, usecases/ a klienti/
const meta = n => (document.querySelector(`meta[name="${n}"]`) || {}).content;
const KOREN = meta("fm-koren") ?? "../";
const ROZHRANIA = { realitka: ROZ_REALITKA, developer: ROZ_DEVELOPER };
// pôvodné značky so všetkými typmi; pri prepnutí typu sa z nich panel postaví znova (bez načítania stránky)
const SABLONA = document.body.cloneNode(true);

// nastavenia klienta (zatiaľ len typ a prepínač); bez nich jeden typ bez prepínača
const zaklad = { prepinac: false, typy: ["developer"], typ: "developer" };
let NASTAVENIA = zaklad;
async function nacitajNastavenia() {
  try {
    const r = await fetch(KOREN + (meta("fm-nastavenia") || "klienti/demo/nastavenia.json"), { cache: "no-store" });
    if (r.ok) NASTAVENIA = { ...zaklad, ...(await r.json()) };
  } catch (e) { }
  NASTAVENIA.typy = (NASTAVENIA.typy || []).filter(t => Object.hasOwn(ROZHRANIA, t));
  if (!NASTAVENIA.typy.includes(NASTAVENIA.typ)) NASTAVENIA.typ = NASTAVENIA.typy[0] || "developer";
}
// typ: z adresy (?typ=), ak ho prepínač povoľuje, inak z nastavení klienta
function zvolTyp() {
  const q = new URLSearchParams(location.search).get("typ");
  return NASTAVENIA.prepinac && NASTAVENIA.typy.includes(q) ? q : NASTAVENIA.typ;
}

let katalogP = null;
function nacitajKatalog() {
  return katalogP = katalogP || Promise.all(["usecases/usecases.json", "usecases/typy.json"].map((p) => fetch(KOREN + p, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error(`Katalóg ${p} sa nepodarilo načítať (${r.status}).`);
    return r.json();
  }))).catch(e => { katalogP = null; throw e; });
}
async function pripravTyp(T) {
  const [katalog, typy] = await nacitajKatalog();
  const TYP = typy.typy.find((t) => t.id === T.id) || { id: T.id, data_dir: `data/${T.id}/` };
  T.FM.nastavPrikaz((NASTAVENIA.slack || {}).prikaz);
  T.CSV.dir = KOREN + TYP.data_dir;
  T.FM.nastavSignaly(zostavSignaly(T.id, katalog, typy, "signaly"));
  if (T.FIN) T.FIN.nastavSignaly(zostavSignaly(T.id, katalog, typy, "financne_signaly"));
  return TYP;
}

// menu typu z usecases/typy.json, prepísané nastaveniami klienta (menu.<typ>: [{ id, nazov?, zapnute? }]):
// záložky z nastavení idú prvé v ich poradí, ostatné za nimi v poradí typu; neznáme id sa ignorujú
function zostavMenu(typMenu, klientMenu) {
  const zaklad = (typMenu || []).map(m => ({ ...m }));
  if (!Array.isArray(klientMenu)) return zaklad;
  const out = [];
  klientMenu.forEach(k => {
    const m = zaklad.find(x => x.id === (k && k.id));
    if (!m || out.includes(m)) return;
    if (typeof k.nazov === "string" && k.nazov.trim()) m.nazov = k.nazov.trim();
    if (typeof k.zapnute === "boolean") m.zapnute = k.zapnute;
    out.push(m);
  });
  return out.concat(zaklad.filter(m => !out.includes(m)));
}

// značky pre typ: prvky s data-typy bez tohto typu sa odstránia (nie len skryjú, aby nevznikli duplicitné id),
// menu podľa typu a nastavení (vypnutá záložka zmizne z menu, jej sekcia ostane v DOM, ale nikdy sa nezobrazí),
// čísla záložiek 01, 02… podľa poradia v menu, odkaz na iný typ prepína typ (ak to nastavenia dovolia)
function pripravZnacky(koren, typId, menu) {
  // data-typy podľa typu, data-rezim podľa režimu (demo/klient), data-rozvrh podľa rozvrhu (panel/planovana-uloha)
  const hodnoty = { typy: typId, rezim: NASTAVENIA.rezim || "demo", rozvrh: NASTAVENIA.rozvrh || "panel" };
  koren.querySelectorAll("[data-typy],[data-rezim],[data-rozvrh]").forEach(e => {
    if (!e.isConnected && !koren.contains(e)) return;
    const ok = Object.entries(hodnoty).every(([k, v]) => e.dataset[k] == null || e.dataset[k].split(/\s+/).includes(v));
    if (!ok) { e.remove(); return; }
    Object.keys(hodnoty).forEach(k => e.removeAttribute("data-" + k));
  });
  if (NASTAVENIA.nazov && NASTAVENIA.rezim === "klient") {
    const k = koren.querySelector("#klient"); if (k) k.firstChild.textContent = NASTAVENIA.nazov + " ";
    document.title = "First Mate · môj panel";
  }
  const prikaz = (NASTAVENIA.slack || {}).prikaz;
  if (prikaz) koren.querySelectorAll("[data-prikaz]").forEach(e => { e.textContent = prikaz; });
  if (NASTAVENIA.signaly_len_na_citanie) koren.querySelectorAll("#btnAddSig").forEach(e => e.remove());
  const nav = koren.querySelector("#nav");
  if (nav && menu && menu.length) {
    const odkazy = [...nav.querySelectorAll("a")];
    odkazy.forEach(a => a.remove());
    menu.forEach(m => {
      const a = odkazy.find(x => x.dataset.v === m.id);
      if (!a || m.zapnute === false) return;
      if (m.nazov) a.lastChild.nodeValue = m.nazov;
      nav.appendChild(a);
    });
  }
  if (nav) nav.classList.toggle("vela", nav.querySelectorAll("a").length > 7);
  koren.querySelectorAll("#nav a").forEach((a, i) => {
    const n = String(i + 1).padStart(2, "0"), k = koren.querySelector(`#v-${a.dataset.v} > .kicker b`);
    a.querySelector("span").textContent = n; if (k) k.textContent = n;
  });
  koren.querySelectorAll("[data-prepni]").forEach(a => {
    const ciel = a.dataset.prepni;
    if (!NASTAVENIA.prepinac || !NASTAVENIA.typy.includes(ciel)) { a.remove(); return; }
    a.href = "?typ=" + ciel; a.removeAttribute("target");
    a.addEventListener("click", e => { e.preventDefault(); spusti(ciel); });
  });
}

let beh = null;
async function spusti(typId) {
  if (beh) beh.abort();
  beh = new AbortController();
  let koren = document.body;
  if (koren.dataset.fmTyp) { koren = SABLONA.cloneNode(true); document.body.replaceWith(koren); window.scrollTo(0, 0); }
  koren.dataset.fmTyp = typId;
  const sig = beh.signal;
  let menu = null;
  try {
    const [, typy] = await nacitajKatalog();
    menu = zostavMenu((typy.typy.find(t => t.id === typId) || {}).menu, (NASTAVENIA.menu || {})[typId]);
    if (NASTAVENIA.zalozka_tipy) menu.forEach(m => { if (m.id === "tipy") m.zapnute = true; });
  } catch (e) { }
  if (sig.aborted) return;
  try { if (new URLSearchParams(location.search).get("typ") !== typId && NASTAVENIA.prepinac) history.replaceState(null, "", "?typ=" + typId + location.hash); } catch (e) { }
  pripravZnacky(koren, typId, menu);
  aplikacia(ROZHRANIA[typId], koren, sig);
}

// ---------- aplikácia jedného typu ----------
// T = objekt typu (panel/rozhranie/<typ>.js), koren = <body> tohto behu, signal = zrušenie pri prepnutí typu
function aplikacia(T, koren, signal) {
  const { FM, CSV, FIN } = T;
  const DEV = T.financie;
  let TYP = { id: T.id, data_dir: `data/${T.id}/` };

  // dialóg Dáta ukážky
  (function(){
    var ov=koren.querySelector('#dsOv'),op=koren.querySelector('#dsOpen'),cl=koren.querySelector('#dsClose');
    if(!ov||!op)return;
    function show(){ov.classList.remove('hidden');cl.focus();}
    function hide(){ov.classList.add('hidden');op.focus();}
    op.addEventListener('click',show);
    cl.addEventListener('click',hide);
    ov.addEventListener('click',function(e){if(e.target===ov)hide();});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!ov.classList.contains('hidden'))hide();},{signal});
  })();

(function () {
  "use strict";
  const $ = s => koren.querySelector(s);
  const $$ = s => [...koren.querySelectorAll(s)];
  const esc = FM.esc;
  const clone = o => JSON.parse(JSON.stringify(o));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const hm = ms => FM.localParts(ms).hm;
  // nastavenia klienta: režim, potvrdenie pred odoslaním, signály len na čítanie, e-mail podľa šablón
  const KLIENT = NASTAVENIA.rezim === "klient";
  const POTVRDIT = !!NASTAVENIA.potvrdenie_pred_odoslanim;
  const LEN_CITAT = !!NASTAVENIA.signaly_len_na_citanie;
  const sablona = { to: "{{prijemcovia}}", subject: "{{predmet}}", body: "{{text}}", htmlBody: "{{html}}" };
  const EMAIL = { sluzba: "Gmail", server: "Gmail", odoslat: { nastroj: "send_message", argumenty: sablona }, ...(NASTAVENIA.email || {}) };
  const SERVERS = ["Slack", EMAIL.server];
  function fillTpl(tpl, vars) {
    if (Array.isArray(tpl)) return tpl.map(x => fillTpl(x, vars));
    if (tpl && typeof tpl === "object") { const o = {}; for (const k in tpl) o[k] = fillTpl(tpl[k], vars); return o; }
    if (typeof tpl === "string") { const m = tpl.match(/^\{\{(\w+)\}\}$/); if (m) return vars[m[1]]; return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => typeof vars[k] === "string" ? vars[k] : JSON.stringify(vars[k])); }
    return tpl;
  }
  function mailVars(to, subject, text, html) { return { prijemcovia: to, prijemcovia_text: to.join(", "), prijemcovia_graph: to.map(a => ({ emailAddress: { address: a } })), predmet: subject, text, html }; }
  async function sendMail(to, subject, text, html) {
    st.lastMail = { to, subject, text, html };
    if (!EMAIL.odoslat) throw { code: "tool_error", message: "E-mail nie je v tomto paneli nastavený. Report môžete skopírovať." };
    return call(EMAIL.server, EMAIL.odoslat.nastroj, fillTpl(EMAIL.odoslat.argumenty, mailVars(to, subject, text, html)), { write: true });
  }
  const DOC_SETTINGS = T.db + "/settings", DOC_LOG = T.db + "/log";

  let S = mergeSettings({});
  let db = null, mcp = null, sample = null;
  const st = { data: null, dataAt: 0, brief: null, texts: null, briefAt: 0, briefSig: "", running: false, log: [], conn: {}, lastOk: {}, pv: "email", capsReady: false, fin: null, finTexts: null, finAt: 0, finSig: "", finDay: null, finWhy: null };

  // ---------- routing ----------
  const VIEWS = $$("#nav a").map(a => a.dataset.v);
  function route() {
    const h = (location.hash || "").slice(1);
    const v = VIEWS.includes(h) ? h : VIEWS[0];
    $$(".view").forEach(e => e.classList.toggle("on", e.id === "v-" + v));
    $$("#nav a").forEach(a => a.classList.toggle("on", a.dataset.v === v));
  }
  window.addEventListener("hashchange", route, { signal });

  // ---------- nastavenia (db) ----------
  // predvolené nastavenia typu, u klienta bez adries Books & Mirror (nastavenia: predvolene)
  function predvolene() {
    const P = NASTAVENIA.predvolene; if (!P) return FM.DEFAULTS;
    const D = clone(FM.DEFAULTS);
    if (P.email != null) D.email = P.email;
    if (P.finEmail != null && "finEmail" in D) D.finEmail = P.finEmail;
    if (P.prvy_clen && D.team[0]) Object.assign(D.team[0], P.prvy_clen);
    return D;
  }
  function mergeSettings(d) {
    const D = predvolene(), g = d.signals || {};
    return {
      ...clone(D), ...d, signals: T.signaly(D, g),
      schedule: { ...D.schedule, ...(d.schedule || {}) },
      automation: { ...D.automation, ...(d.automation || {}) },
      team: Array.isArray(d.team) && d.team.length ? d.team : clone(D.team),
      email: d.email || D.email,
      ...(DEV ? { finEmail: d.finEmail || D.finEmail } : {})
    };
  }
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej({ code: "timeout" }), ms))]);
  async function loadSettings() {
    try {
      const snap = await withTimeout(db.doc(DOC_SETTINGS).get(), 10000);
      if (snap.exists) S = mergeSettings(snap.data() || {});
      const lg = await withTimeout(db.doc(DOC_LOG).get(), 10000);
      if (lg.exists) st.log = (lg.data().items || []).slice(0, 20);
      markSaved("Nastavenia načítané");
    } catch (e) { markSaved("Nastavenia sa nepodarilo načítať"); }
  }
  let saveTimer = null, saving = false, again = false;
  function save() { markSaved("Ukladám…"); clearTimeout(saveTimer); saveTimer = setTimeout(doSave, 700); }
  async function doSave() {
    if (!db) { markSaved("Neuložené: úložisko nie je dostupné"); return; }
    if (saving) { again = true; return; }
    saving = true;
    try { await db.doc(DOC_SETTINGS).set(clone(S)); markSaved("Uložené " + hm(Date.now())); }
    catch (e) { markSaved("Neuložené" + (e && e.code ? " (" + e.code + ")" : "")); }
    saving = false;
    if (again) { again = false; doSave(); }
  }
  function markSaved(t) { ["#teamSaved", "#sigSaved", "#schSaved"].forEach(id => { const e = $(id); if (e) e.textContent = t; }); }
  async function addLog(kanal, sprava) {
    st.log.unshift({ at: Date.now(), kanal, sprava });
    st.log = st.log.slice(0, 20);
    renderLog();
    if (db) { try { await db.doc(DOC_LOG).set({ items: st.log }); } catch (e) { } }
  }

  // CSV definícia a toData sú v panel/typy/<typ>.js; dáta sa čítajú z koreňa repozitára (meta fm-koren)
  CSV.dir = KOREN + TYP.data_dir;
  // ---------- dáta z CSV (spoločné pre oba panely) ----------
  // st.src = { kind: "demo"|"vlastne", texts: {súbor: text}, manifest: {exportAt, ref}, names: [...] }
  st.src = null; st.shift = true;
  function fmtDmy(ds) { if (!ds) return ""; const [y, m, d] = ds.slice(0, 10).split("-"); return `${+d}. ${+m}. ${y}`; }
  function shiftDays() {
    if (!st.shift || !st.src || !st.src.manifest || !st.src.manifest.ref) return 0;
    return FMCSV.daysBetween(st.src.manifest.ref, FMCSV.localDate(Date.now()));
  }
  async function fetchText(path) {
    const r = await fetch(path, { cache: "no-store" });
    if (!r.ok) throw { code: "csv_missing", message: `Súbor ${path} sa nepodarilo načítať (${r.status}).` };
    return await r.text();
  }
  async function loadDemoCsv(onStep) {
    const texts = {};
    let manifest = { exportAt: null, ref: null };
    try { manifest = FMCSV.readManifest(await fetchText(CSV.dir + "manifest.md")); } catch (e) { }
    for (const [key, file] of Object.entries(CSV.files)) { onStep && onStep(CSV.labels[key]); texts[file] = await fetchText(CSV.dir + file); }
    for (const [key, file] of Object.entries(CSV.optional || {})) { onStep && onStep(CSV.labels[key]); try { texts[file] = await fetchText(CSV.dir + file); } catch (e) { } }
    st.src = { kind: "demo", texts, manifest };
  }
  function buildData() {
    const n = shiftDays(), raw = {}, errs = [];
    const opt = CSV.optional || {}, missing = [];
    for (const [key, file] of Object.entries({ ...CSV.files, ...opt })) {
      if (opt[key] && !st.src.texts[file]) { raw[key] = []; missing.push(file); continue; }
      const p = FMCSV.parse(st.src.texts[file]);
      const spec = CSV.spec[file];
      FMCSV.validate(file, p, spec).forEach(e => errs.push(e));
      raw[key] = p.rows.map(r => ({ attributes: FMCSV.typed(r, spec.schema, n) }));
    }
    const data = CSV.toData(raw, Date.now());
    if (DEV) data.fin = FIN.normalize(raw);
    data.finMissing = missing;
    data.warn = errs;
    return data;
  }
  function dataLabel() {
    if (!st.src) return "Dáta: CSV · nenačítané";
    if (st.src.kind === "vlastne") return `Dáta: ${KLIENT ? "z priečinka First Mate" : "vlastné CSV"} · ${st.src.names.length} ${st.src.names.length === 1 ? "súbor" : (st.src.names.length < 5 ? "súbory" : "súborov")}`;
    const ex = st.src.manifest && st.src.manifest.exportAt;
    return `Dáta: CSV · export ${ex ? fmtDmy(ex) : "?"}`;
  }
  function shiftLabel() {
    const n = shiftDays();
    if (!st.src || !st.src.manifest || !st.src.manifest.ref) return "Pôvodné dátumy (súbor nemá manifest s dátumom exportu).";
    if (!st.shift) return `Pôvodné dátumy, stav k ${fmtDmy(st.src.manifest.ref)}.`;
    return n === 0 ? `Dátumy sú aktuálne, stav k ${fmtDmy(st.src.manifest.ref)}.` : `Všetky dátumy posunuté o ${n > 0 ? "+" : ""}${n} ${Math.abs(n) === 1 ? "deň" : (Math.abs(n) < 5 && Math.abs(n) > 1 ? "dni" : "dní")}, stav k ${fmtDmy(st.src.manifest.ref)} vyzerá ako dnešok.`;
  }
  function renderDataBar() {
    const bar = $("#dataBar"); if (!bar) return;
    const canShift = !!(st.src && st.src.manifest && st.src.manifest.ref);
    bar.querySelector("#dbLabel").textContent = dataLabel();
    bar.querySelectorAll("[data-shift]").forEach(b => { b.classList.toggle("on", (b.dataset.shift === "1") === (st.shift && canShift)); b.disabled = !canShift; });
    bar.querySelector("#dbShift").textContent = shiftLabel();
    bar.querySelector("#dbReset").classList.toggle("hidden", !st.src || st.src.kind !== "vlastne");
  }
  function dbMsg(html, warn) { const m = $("#dbMsg"); if (m) m.innerHTML = html ? `<div class="msg ${warn ? "warn" : ""}">${html}</div>` : ""; }
  async function readUpload(fileList) {
    const files = [...fileList];
    const want = Object.values(CSV.files), optional = Object.values(CSV.optional || {});
    const texts = {}, names = [], errs = [];
    let manifest = { exportAt: null, ref: null };
    for (const f of files) {
      const name = f.name.toLowerCase();
      let t = await f.text();
      if (/\.md$|\.txt$/.test(name) && /manifest/.test(name)) { manifest = FMCSV.readManifest(t); continue; }
      const all = want.concat(optional);
      const target = all.find(w => w === name) || all.find(w => name.endsWith(w));
      if (!target) { errs.push(`Súbor „${esc(f.name)}“ nepoznám. Panel čaká ${want.map(w => "„" + w + "“").join(", ")}${optional.length ? `, voliteľne finančné ${optional.map(w => "„" + w + "“").join(", ")}` : ""}.`); continue; }
      if (t.includes(String.fromCharCode(0xFFFD))) errs.push(`${esc(f.name)}: niektoré znaky sa nedajú prečítať. Uložte súbor v kódovaní UTF-8 (v Exceli „CSV UTF-8“).`);
      texts[target] = t; names.push(target);
    }
    const miss = want.filter(w => !texts[w]);
    if (miss.length) errs.unshift(`${miss.length === 1 ? "Chýba súbor" : "Chýbajú súbory"} ${miss.map(w => "„" + w + "“").join(", ")}. Vyberte naraz všetky ${want.length} súbory${optional.length ? ` predaja (a voliteľne ${optional.length} finančných)` : ""}.`);
    for (const w of want.concat(optional)) if (texts[w]) {
      const p = FMCSV.parse(texts[w]);
      FMCSV.validate(w, p, CSV.spec[w]).forEach(e => { if (!/oddeľovač/.test(e)) errs.push(esc(e)); });
      if (!p.rows.length) errs.push(`${w}: súbor nemá žiadne záznamy.`);
    }
    return { texts, names, manifest, errs };
  }
  function bindDataBar() {
    const bar = $("#dataBar"); if (!bar) return;
    bar.addEventListener("click", async e => {
      const b = e.target.closest("[data-shift]");
      if (b && !b.disabled) { st.shift = b.dataset.shift === "1"; await reloadFromSrc(); }
    });
    $("#dbUpload").addEventListener("click", () => $("#dbFile").click());
    $("#dbFile").addEventListener("change", async e => {
      const fl = e.target.files; if (!fl || !fl.length) return;
      const u = await readUpload(fl); e.target.value = "";
      if (u.errs.length) { dbMsg("<b>Súbory som nenačítal.</b><br>" + u.errs.join("<br>"), true); return; }
      const prev = st.src; st.src = { kind: "vlastne", texts: u.texts, names: u.names, manifest: u.manifest };
      st.shift = !!u.manifest.ref && st.shift;
      try { await reloadFromSrc(); const fm = st.data.finMissing || []; dbMsg((KLIENT ? `Načítané dáta z priečinka First Mate: ${u.names.join(", ")}. Sú len v pamäti tohto okna, nikam sa neukladajú; po obnovení stránky sa vrátia východiskové dáta z balíka.` : `Načítané vlastné dáta: ${u.names.join(", ")}. Sú len v pamäti tohto okna, nikam sa neukladajú; po obnovení stránky sa vráti ukážka.`) + (fm.length ? ` Finančné súbory chýbajú (${fm.join(", ")}), sekcia Financie a finančný brífing budú ${fm.length === optional_count() ? "prázdne" : "neúplné"}.` : "")); }
      catch (err) { st.src = prev; dbMsg("Súbory sa nepodarilo spracovať: " + esc(err.message || err), true); await reloadFromSrc(); }
    });
    $("#dbReset").addEventListener("click", async () => { st.src = null; st.shift = true; dbMsg(""); await loadData(null); updateSignalNow(); });
  }
  const optional_count = () => Object.keys(CSV.optional || {}).length;
  async function reloadFromSrc() {
    st.data = buildData(); st.dataAt = Date.now(); st.brief = null; st.texts = null; st.briefAt = 0; st.fin = null; st.finTexts = null; st.finAt = 0;
    renderDataBar(); afterData();
  }
  function afterData() { if (DEV) renderProjects(); updateSignalNow(); if (DEV) renderFinance(); const pv = $("#pvInfo"); if (pv && !st.brief) pv.textContent = "Dáta sa zmenili. Kliknite na „Prepočítať bez odoslania“."; }

  // ---------- MCP ----------
  async function call(server, tool, input, opt) {
    const write = opt && opt.write;
    if (!mcp) throw { code: "not_granted", server, message: "Prepojenia nie sú v tomto zobrazení dostupné." };
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await mcp.callTool(server, tool, input, { cache: false });
        st.lastOk[server] = Date.now(); st.conn[server] = "connected"; renderConn();
        let p = r ? r.payload : null;
        if (p == null && r && Array.isArray(r.content)) { const tb = r.content.find(c => c.type === "text"); p = tb && tb.text; }
        if (typeof p === "string") { const parsed = parseToon(p); return parsed && typeof parsed === "object" ? parsed : p; }
        return p;
      } catch (e) {
        const msg = String((e && e.message) || "");
        const rate = /rate limit/i.test(msg);
        if (!write && (rate || (e && e.retryable)) && attempt < 2) {
          let wait = (e && e.retryAfterMs) || (1500 + Math.random() * 1000);
          const m = msg.match(/after (\d{4}-\d{2}-\d{2}T[\d:.]+Z)/);
          if (m) wait = Math.max(600, Date.parse(m[1]) - Date.now() + 400);
          await sleep(Math.min(wait, 20000));
          continue;
        }
        if (e && (e.code === "needs_reauth" || e.code === "server_not_connected")) { st.conn[server] = e.code === "needs_reauth" ? "bad" : "missing"; renderConn(); }
        if (e && typeof e === "object" && !e.server) e.server = server;
        throw e;
      }
    }
  }
  function errText(e, server, write) {
    if (!e) return "Neznáma chyba.";
    server = e.server || server || "Služba";
    const msg = String(e.message || "");
    switch (e.code) {
      case "needs_reauth": return `${server}: prihlásenie vypršalo. Znova pripojte ${server} v claude.ai → Nastavenia → Konektory.`;
      case "server_not_connected": case "server_not_found": return `${server} nie je pripojený. Pridajte ho v claude.ai → Nastavenia → Konektory.`;
      case "selection_required": return `Vyberte, ktorý konektor ${server} sa má použiť. Claude.ai sa na to spýta.`;
      case "not_in_manifest": case "approval_required": case "consent_required": return `Panel zatiaľ nemá povolenie použiť ${server}. Kliknite znova a v okne claude.ai ho povoľte.`;
      case "blocked_by_policy": return `Použitie ${server} blokujú pravidlá organizácie.`;
      case "server_unavailable": case "upstream_error": case "cancelled": return `${server} práve neodpovedá.` + (write ? " Pred ďalším pokusom skontrolujte, či správa už neodišla." : " Skúste to o chvíľu.");
      case "csv_missing": return msg;
      case "tool_error": return `${server} vrátil chybu: ${msg.slice(0, 200)}`;
      case "not_granted": case "capability_disabled": case "capability_removed": return "Prepojenia na konektory nie sú v tomto zobrazení dostupné. Otvorte panel v claude.ai.";
      default: return msg || "Neznáma chyba.";
    }
  }
  async function refreshConn() {
    if (!mcp) { SERVERS.forEach(s => st.conn[s] = "na"); renderConn(); return; }
    try {
      const r = await mcp.listTools();
      SERVERS.forEach(name => {
        const f = (r.servers || []).find(x => x.server === name);
        st.conn[name] = !f ? "missing" : (f.authStatus === "needs_reauth" ? "bad" : (f.authStatus === "connected" ? "connected" : "unknown"));
      });
    } catch (e) { SERVERS.forEach(s => st.conn[s] = st.conn[s] || "unknown"); }
    renderConn();
  }
  const CONN_LBL = { connected: "Pripojené", unknown: "Pripravené", missing: "Nepripojené", bad: "Znova prihlásiť", na: "Nedostupné", ai: "Pripravené" };
  function renderConn() {
    const items = SERVERS.map(s => [s, st.conn[s] || "unknown"]).concat([["Claude AI", sample ? "connected" : (st.capsReady ? "na" : "unknown")]]);
    renderDataBar();
    $("#conn").innerHTML = items.map(([n, s]) => `<span class="chip"><i class="dot ${s === "connected" ? "ok" : (s === "bad" || s === "missing" ? "bad" : "")}"></i>${esc(n)} · ${CONN_LBL[s] || s}</span>`).join("");
    renderConnTable();
  }

  // ---------- AI ----------
  // ---------- AI s diagnostikou ----------
  // aiTry vráti { v, why }: v = objekt z JSON odpovede, why = prečo sa odpoveď nedala použiť
  async function aiTry(prompt) {
    if (!sample) return { v: null, why: "AI nie je v tomto zobrazení dostupná" };
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 90000);
    let v;
    try {
      v = typeof sample.json === "function" ? await sample.json(prompt, { signal: ctrl.signal }) : (await sample(prompt, { signal: ctrl.signal })).text;
    } catch (e) {
      if (ctrl.signal.aborted) return { v: null, why: "AI neodpovedala do 90 s" };
      const c = e && (e.code || e.name), m = String((e && e.message) || "").replace(/\s+/g, " ").slice(0, 120);
      return { v: null, why: "chyba volania AI" + (c ? " (" + c + ")" : "") + (m && m !== c ? ": " + m : "") };
    } finally { clearTimeout(to); }
    if (v && typeof v === "object" && typeof v.text === "string" && !v.nadpis) v = v.text;
    if (typeof v === "string") {
      const m = v.match(/\{[\s\S]*\}/);
      if (!m) return { v: null, why: v.includes("{") ? "odpoveď AI bola useknutá (JSON nie je uzavretý)" : "odpoveď AI neobsahovala JSON" };
      try { v = JSON.parse(m[0]); } catch (e) { return { v: null, why: "odpoveď AI nebola platný JSON (pravdepodobne useknutá)" }; }
    }
    if (!v || typeof v !== "object") return { v: null, why: "odpoveď AI bola prázdna" };
    return { v, why: null };
  }
  async function aiJson(prompt) { return (await aiTry(prompt)).v; }
  // Brífing: odpoveď musí mať nadpis alebo kroky; pri neúspechu ešte jeden pokus
  async function aiBrief(prompt, R, idx) {
    const once = async () => { const r = await aiTry(prompt); return (r.v && !(typeof r.v.nadpis === "string" || Array.isArray(r.v.kroky))) ? { v: null, why: "odpoveď AI nemala očakávané polia (nadpis, kroky)" } : r; };
    const r1 = await once();
    if (r1.v || !sample) { if (!r1.v) console.warn("First Mate · AI text sa nepoužil:", r1.why); return r1; }
    R && R.set(idx == null ? 2 : idx, "active", `Prvý pokus zlyhal (${r1.why}), skúšam znova…`);
    await sleep(1500);
    const r2 = await once();
    if (r2.v) return { ...r2, retried: true, first: r1.why };
    console.warn("First Mate · AI text sa nepoužil. 1. pokus:", r1.why, "· 2. pokus:", r2.why);
    return { v: null, why: r2.why, first: r1.why };
  }

  // ---------- priebeh ----------
  function makeRun(box, list, titleEl, title, steps) {
    box.classList.remove("hidden");
    if (titleEl) titleEl.textContent = title;
    const t0 = Date.now();
    const timeEl = box.querySelector(".saved");
    list.innerHTML = steps.map((s, i) => `<li data-i="${i}"><span class="n">${String(i + 1).padStart(2, "0")}</span><span class="t">${esc(s)}<span class="d"></span></span><span class="s">čaká</span></li>`).join("");
    const msgEl = box.querySelector("[id$=Msg]");
    if (msgEl) msgEl.innerHTML = "";
    let active = -1;
    const LBL = { wait: "čaká", active: "beží", done: "hotovo", err: "chyba", skip: "použité", warn: "náhradný text", cancel: "zrušené" };
    const R = {
      set(i, status, detail) {
        const li = list.children[i]; if (!li) return;
        li.className = status === "skip" || status === "warn" ? "done" : status;
        li.querySelector(".s").textContent = LBL[status] || status;
        if (detail != null) li.querySelector(".d").textContent = detail;
        if (status === "active") active = i;
        if (timeEl) timeEl.textContent = ((Date.now() - t0) / 1000).toFixed(1).replace(".", ",") + " s";
      },
      fail(text) { if (active >= 0) R.set(active, "err", text); R.msg(text, true); },
      msg(html, warn) { if (msgEl) msgEl.innerHTML = html ? `<div class="msg ${warn ? "warn" : ""}">${html}</div>` : ""; },
      get active() { return active; }
    };
    return R;
  }
  const BRIEF_STEPS = ["Načítať dáta", "Vypočítať signály v kóde", "AI napíše interpretáciu a kroky"];
  const summaryLine = T.summaryLine;
  async function loadData(R, i) {
    R && R.set(i, "active", "Načítavam CSV…");
    if (!st.src) await loadDemoCsv(step => R && R.set(i, "active", step + "…"));
    st.data = buildData();
    st.dataAt = Date.now();
    renderDataBar();
    R && R.set(i, "done", T.loadedLine(st.data));
    if (DEV) { renderProjects(); renderFinance(); }
  }
  async function ensureBrief(force, R) {
    const sig = T.briefSig(S);
    const age = Date.now() - st.briefAt;
    if (!force && st.brief && age < 15 * 60e3 && st.briefSig === sig && (st.texts.ai || !sample)) {
      const min = Math.max(1, Math.round(age / 60e3));
      R.set(0, "skip", `Dáta načítané o ${hm(st.dataAt)} (pred ${min} min)`);
      R.set(1, "skip", summaryLine(st.brief));
      R.set(2, "skip", st.texts.ai ? `Text od AI: „${st.texts.nadpis}“` : "Pravidlový text");
      return;
    }
    if (force || !st.data || Date.now() - st.dataAt > 15 * 60e3) await loadData(R, 0);
    else R.set(0, "skip", `Dáta načítané o ${hm(st.dataAt)}`);
    R.set(1, "active");
    const b = FM.compute(st.data, S.signals, Date.now());
    R.set(1, "done", summaryLine(b));
    R.set(2, "active", sample ? "Claude píše vysvetlenie a návrh krokov…" : "AI nie je dostupná");
    let r = { v: null, why: "neznáma chyba" };
    try { r = await aiBrief(FM.aiPrompt(b), R); } catch (e) { r = { v: null, why: "chyba v paneli: " + String((e && e.message) || e).slice(0, 120) }; }
    const ai = r.v;
    const t = FM.mergeTexts(ai, FM.fallbackTexts(b), b);
    st.aiWhy = ai ? null : r.why;
    R.set(2, ai ? "done" : "warn", ai ? `„${t.nadpis}“ · ${t.kroky.length} ${t.kroky.length === 1 ? "krok" : "kroky"}` + (r.retried ? ` · na 2. pokus (1. pokus: ${r.first})` : "")
      : `AI text sa nepoužil: ${r.why}` + (r.first && r.first !== r.why ? ` (1. pokus: ${r.first})` : (r.first ? " (oba pokusy)" : "")) + ". Použitý pravidlový text.");
    st.brief = b; st.texts = t; st.briefAt = Date.now(); st.briefSig = sig;
    renderPreview(); updateSignalNow();
  }
  function lock(on) { st.running = on; ["#btnSlack", "#btnEmail", "#btnTeam", "#btnRecalc", "#btnLoad", "#btnLoadProj", "#btnFin", "#btnLoadFin"].forEach(id => { const e = $(id); if (e) { e.disabled = on; e.classList.toggle("is-locked", on); } }); }
  function findUrl(res) { const m = JSON.stringify(res || "").match(/https:\/\/[^\s"'\\]*slack\.com[^\s"'\\]*/); return m ? m[0] : null; }

  async function sendSlack() {
    if (st.running) return; lock(true);
    const R = makeRun($("#run"), $("#steps"), $("#runTitle"), "Brífing → Slack", [...BRIEF_STEPS, "Odoslať do Slacku"]);
    try {
      await ensureBrief(false, R);
      if (POTVRDIT && !await confirmSend("Odoslať brífing do Slacku?", [["Kanál", FM.SLACK_NAME], ["Obsah", `${st.texts.nadpis} / ${st.texts.podnadpis}`], ["Text", st.texts.ai ? "napísala AI" : "pravidlový text"], ["Dáta", dataLabel()]])) { R.set(3, "cancel", "Zrušené, nič neodišlo"); R.msg("Nič neodišlo. Náhľad je nižšie."); return; }
      R.set(3, "active", FM.SLACK_NAME);
      const res = await call("Slack", "slack_send_message", { channel_id: FM.SLACK_CHANNEL, message: FM.slackText(st.brief, st.texts) }, { write: true });
      R.set(3, "done", `Odoslané do ${FM.SLACK_NAME} o ${hm(Date.now())}`);
      const url = findUrl(res);
      const tm = JSON.stringify(res || "").match(/team(?:_id)?\\?"?\s*[:=]\s*\\?"?(T[A-Z0-9]{6,})/);
      const appUrl = tm ? `https://slack.com/app_redirect?team=${tm[1]}&channel=${FM.SLACK_CHANNEL}` : `https://firstmate-booksmirror.slack.com/app_redirect?channel=${FM.SLACK_CHANNEL}`;
      R.msg(`Brífing je v Slacku · <a href="${esc(appUrl)}" target="_blank" rel="noopener">otvoriť v aplikácii Slack</a>${url ? ` · <a href="${esc(url)}" target="_blank" rel="noopener">na webe</a>` : ""}.`);
      addLog("Slack · " + FM.SLACK_NAME, st.texts.podnadpis);
    } catch (e) { R.fail(errText(e, R.active === 3 ? "Slack" : "Dáta", R.active === 3)); }
    finally { lock(false); }
  }
  async function sendEmail() {
    if (st.running) return;
    const inp = $("#emailTo"); const to = inp.value.trim(); const bad = FM.validEmail(to);
    const errBox = $("#emailErr");
    if (bad) { inp.classList.add("err"); errBox.textContent = bad; errBox.classList.remove("hidden"); return; }
    inp.classList.remove("err"); errBox.classList.add("hidden");
    if (S.email !== to) { S.email = to; save(); renderSchedule(); }
    lock(true);
    const R = makeRun($("#run"), $("#steps"), $("#runTitle"), "Brífing → e-mail", [...BRIEF_STEPS, "Odoslať e-mail"]);
    try {
      await ensureBrief(false, R);
      if (POTVRDIT && !await confirmSend("Odoslať brífing e-mailom?", [["Komu", to], ["Cez", EMAIL.sluzba], ["Predmet", FM.emailSubject(st.brief, st.texts)], ["Text", st.texts.ai ? "napísala AI" : "pravidlový text"], ["Dáta", dataLabel()]])) { R.set(3, "cancel", "Zrušené, nič neodišlo"); R.msg("Nič neodišlo. Náhľad je nižšie."); return; }
      R.set(3, "active", to);
      const b = st.brief, t = st.texts;
      await sendMail([to], FM.emailSubject(b, t), FM.emailText(b, t), FM.emailHtml(b, t));
      R.set(3, "done", `Odoslané na ${to} o ${hm(Date.now())}`);
      R.msg(`E-mail odišiel na <b>${esc(to)}</b>. Predmet: ${esc(FM.emailSubject(b, t))}`);
      addLog("E-mail · " + to, t.podnadpis);
    } catch (e) { R.fail(errText(e, R.active === 3 ? EMAIL.sluzba : "Dáta", R.active === 3)); if (R.active === 3) offerDraft(); }
    finally { lock(false); }
  }
  async function recalc() {
    if (st.running) return; lock(true);
    const R = makeRun($("#run"), $("#steps"), $("#runTitle"), "Prepočet bez odoslania", DEV ? [...BRIEF_STEPS, "AI napíše finančný brífing"] : BRIEF_STEPS);
    try {
      await ensureBrief(true, R);
      if (!DEV) { R.msg("Hotovo. Náhľad nižšie ukazuje, čo by odišlo."); return; }
      try { await ensureFin(true, R, { load: null, comp: null, ai: 3 }); }
      catch (e) { R.set(3, "warn", errText(e, "Dáta")); }
      R.msg("Hotovo. Náhľad nižšie ukazuje, čo by odišlo (záložky E-mail, Slack a Financie).");
    }
    catch (e) { R.fail(errText(e, "Dáta")); }
    finally { lock(false); }
  }

  // ---------- finančný brífing ----------
  const NOR = { set() { }, msg() { }, fail() { }, get active() { return -1; } };
  function dayInfo(now) { const lp = FM.localParts(now); return { label: `${FM.WD[lp.wd] || ""} ${FM.dm(lp.date)}`, long: `${FM.WDL[lp.wd] || ""} ${FM.dmy(lp.date)}`, date: lp.date }; }
  function finCompute() { return FIN.compute(st.data, S.signals, FM.localParts(Date.now()).date); }
  function finSummary(f) {
    const n = FIN.KEYS.filter(k => f[k].on && f[k].count).length;
    return f.projekty.map(p => `${p.kod} IRR VK ${FIN.pctS(p.irr.vk)}`).join(" · ") + ` · ${n} ${FM.pl(n, "signál", "signály", "signálov")} na riešenie`;
  }
  const FIN_STEPS = ["Načítať dáta", "Vypočítať finančné signály v kóde", "AI napíše finančný brífing"];
  async function ensureFin(force, R, ix) {
    R = R || NOR; ix = ix || { load: 0, comp: 1, ai: 2 };
    const sig = JSON.stringify(FIN.KEYS.map(k => S.signals[k]));
    const age = Date.now() - st.finAt;
    if (!force && st.fin && age < 15 * 60e3 && st.finSig === sig && (st.finTexts.ai || !sample)) {
      if (ix.load != null) R.set(ix.load, "skip", `Dáta načítané o ${hm(st.dataAt)}`);
      if (ix.comp != null) R.set(ix.comp, "skip", finSummary(st.fin));
      R.set(ix.ai, "skip", st.finTexts.ai ? `Text od AI: „${st.finTexts.nadpis}“` : "Pravidlový text");
      return;
    }
    if (ix.load != null) { if (force || !st.data || Date.now() - st.dataAt > 15 * 60e3) await loadData(R, ix.load); else R.set(ix.load, "skip", `Dáta načítané o ${hm(st.dataAt)}`); }
    else if (!st.data) await loadData(null);
    if (ix.comp != null) R.set(ix.comp, "active");
    const f = finCompute();
    if (!f.available) throw { code: "csv_missing", message: "V dátach chýbajú finančné súbory (dev_uver.csv, dev_tranze.csv, dev_podmienky_cerpania.csv, dev_rozpocet.csv, dev_cashflow.csv), finančný brífing sa nedá zostaviť." };
    if (ix.comp != null) R.set(ix.comp, "done", finSummary(f));
    const day = dayInfo(Date.now());
    R.set(ix.ai, "active", sample ? "Claude píše finančný brífing…" : "AI nie je dostupná");
    let r = { v: null, why: "neznáma chyba" };
    try { r = await aiBrief(FIN.aiPrompt(f, day.long), R, ix.ai); } catch (e) { r = { v: null, why: "chyba v paneli: " + String((e && e.message) || e).slice(0, 120) }; }
    const t = FIN.mergeTexts(r.v, FIN.fallbackTexts(f));
    st.finWhy = r.v ? null : r.why;
    R.set(ix.ai, r.v ? "done" : "warn", r.v ? `„${t.nadpis}“ · ${t.kroky.length} ${t.kroky.length === 1 ? "krok" : "kroky"}` + (r.retried ? ` · na 2. pokus (1. pokus: ${r.first})` : "") : `AI text sa nepoužil: ${r.why}. Použitý pravidlový text.`);
    st.fin = f; st.finTexts = t; st.finAt = Date.now(); st.finSig = sig; st.finDay = day;
    renderPreview();
  }
  async function sendFin() {
    if (st.running) return;
    const inp = $("#finTo"); const to = inp.value.trim(); const bad = FM.validEmail(to);
    const errBox = $("#finErr");
    if (bad) { inp.classList.add("err"); errBox.textContent = bad; errBox.classList.remove("hidden"); return; }
    inp.classList.remove("err"); errBox.classList.add("hidden");
    if (S.finEmail !== to) { S.finEmail = to; save(); renderSchedule(); }
    lock(true);
    const R = makeRun($("#run"), $("#steps"), $("#runTitle"), "Finančný brífing → e-mail", [...FIN_STEPS, "Odoslať e-mail"]);
    try {
      await ensureFin(false, R);
      if (POTVRDIT) {
        st.pv = "fin"; $$(".tabs2 button").forEach(x => x.classList.toggle("on", x.dataset.pv === "fin")); renderPreview();
        if (!await confirmSend("Odoslať finančný brífing?", [["Komu", to], ["Cez", EMAIL.sluzba], ["Predmet", FIN.emailSubject(st.fin, st.finTexts, st.finDay)], ["Text", st.finTexts.ai ? "napísala AI" : "pravidlový text"], ["Dáta", dataLabel()]])) { R.set(3, "cancel", "Zrušené, nič neodišlo"); R.msg("Nič neodišlo. Náhľad je nižšie."); return; }
      }
      R.set(3, "active", to);
      const f = st.fin, t = st.finTexts, day = st.finDay;
      await sendMail([to], FIN.emailSubject(f, t, day), FIN.emailText(f, t, day), FIN.emailHtml(f, t, day));
      R.set(3, "done", `Odoslané na ${to} o ${hm(Date.now())}`);
      R.msg(`Finančný brífing odišiel na <b>${esc(to)}</b>. Predmet: ${esc(FIN.emailSubject(f, t, day))}`);
      st.pv = "fin"; $$(".tabs2 button").forEach(x => x.classList.toggle("on", x.dataset.pv === "fin")); renderPreview();
      addLog("Financie · " + to, t.podnadpis);
    } catch (e) { R.fail(errText(e, R.active === 3 ? EMAIL.sluzba : "Dáta", R.active === 3)); if (R.active === 3) offerDraft(); }
    finally { lock(false); }
  }

  // ---------- financie: prehľad ----------
  function renderFinance(f) {
    const box = $("#fin"); if (!box || !st.data) return;
    f = f || finCompute();
    const X = FIN, eur = FM.eur, I = FM.fmtInt;
    if (!f.available) {
      $("#finInfo").textContent = `${dataLabel()} · finančné súbory chýbajú`;
      box.innerHTML = `<div class="pv"><div class="empty">V dátach chýbajú finančné súbory: ${esc(Object.values(CSV.optional).join(", "))}. Nahrajte ich spolu so súbormi predaja.</div></div>`;
      return;
    }
    $("#finInfo").textContent = `${dataLabel()} · načítané ${hm(st.dataAt)} · sumy bez DPH, krytie úveru a ceny jednotiek s DPH`;
    const lvl = (k, kod) => ((f[k].all || f[k].items).find(x => x.projekt === kod) || {}).level;
    box.innerHTML = f.projekty.map(p => {
      const i = p.irr, k = p.krytie, r = p.rozpocet, u = p.uver;
      const tile = (v, l, hl, sm) => `<div class="tile"><div class="v ${sm ? "sm" : ""} ${hl ? "blue" : ""}">${v}</div><div class="k">${esc(l)}</div></div>`;
      const tiles = [
        tile(X.pctS(i.vk), `IRR vlastného kapitálu · cieľ ${i.ciel != null ? i.ciel + " %" : "–"} · plán ${X.pctS(i.vkBp)}`, lvl("f5", p.kod) === "red"),
        tile(X.pctS(i.p), `IRR projektu · plán ${X.pctS(i.pBp)}`, lvl("f5", p.kod) === "yellow"),
        tile(X.eurM(i.zisk), `Zisk · marža ${X.pctS(i.marza)} · plán ${X.eurM(i.ziskBp)}`, false, true),
        tile(X.xS(k.krytie), `Krytie úveru · kovenant ${X.xS(k.kovenant)}`, ["red", "yellow"].includes(lvl("f2", p.kod))),
        tile(X.eurM(p.cerpane), `Čerpaný úver · limit ${u ? X.eurM(u.limit) : "–"}`, false, true),
        tile(r.pouzitaPct != null ? X.pctS(r.pouzitaPct) : "–", `Rezerva minutá · stavba hotová na ${X.pctS(r.dokoncenie)}`, r.rezerva && (r.pouzita > r.rezerva || r.pouzitaPct - r.dokoncenie > S.signals.f4.rezPp))
      ].join("");
      const tr = p.tranze.map(t => t.cerpana
        ? `<tr class="o"><td>${esc(t.id)}</td><td class="sm">${esc(t.ucel)}</td><td class="r">${X.eurM(t.suma)}</td><td class="sm" style="padding-left:16px">načerpaná ${t.datum ? FM.dmy(t.datum) : ""}</td><td class="sm">–</td></tr>`
        : `<tr><td>${esc(t.id)}${t.nesplnene && t.vOkne ? ` <span class="tag">${t.nesplnene} ${FM.pl(t.nesplnene, "chýba", "chýbajú", "chýba")}</span>` : ""}</td><td class="sm">${esc(t.ucel)}</td><td class="r">${X.eurM(t.suma)}</td><td class="sm" style="padding-left:16px;white-space:nowrap">${FM.dmy(t.plan)}<br><span class="note" style="margin:0">${t.dni >= 0 ? `o ${t.dni} ${FM.pl(t.dni, "deň", "dni", "dní")}` : `${-t.dni} dní po termíne`}</span></td><td>${t.podmienky.map(c => `<div class="cond ${c.ok ? "ok" : "no"}"><i>${c.ok ? "✓" : "✗"}</i>${esc(c.popis)} · ${esc(X.condState(c))}${!c.ok && c.chybaZmluv ? ` · chýba ${c.chybaZmluv} ${FM.pl(c.chybaZmluv, "zmluva", "zmluvy", "zmlúv")}` : ""}${!c.ok && c.typ === "manualne" && c.zodpovedny ? ` · ${esc(c.zodpovedny)}` : ""}</div>`).join("") || `<span class="note" style="margin:0">bez podmienok</span>`}${t.oneskorenie ? `<div class="note" style="margin:6px 0 0">Pri dnešnom tempe predaja splnené až ${FM.dmy(t.projekcia)}, o ${t.oneskorenie} dní neskôr; posun čerpania znamená ďalších ${eur(t.dopadVk)} vlastných zdrojov.</div>` : ""}</td></tr>`).join("");
      const tg = p.tempoCiele.map(c => `<tr><td>${esc(c.nazov)}${c.hit ? ` <span class="tag">nestačí</span>` : ""}</td><td>${FM.dmy(c.termin)}</td><td class="r">${c.chyba}</td><td class="r ${c.hit ? "hl" : ""}">${X.num2(c.potrebne)}</td><td>${c.projekcia ? FM.dmy(c.projekcia) : "–"}</td></tr>`).join("");
      const rz = r.polozky.map(x => x.skupina === "Rezerva"
        ? `<tr><td>${esc(x.polozka)}</td><td class="r">${I(x.rozpocet)}</td><td class="r" colspan="4">minutá na prekročenia ${I(r.pouzita)} (${X.pctS(r.pouzitaPct)})</td><td class="r ${r.pouzita > r.rezerva ? "hl" : ""}">${r.pouzita > r.rezerva ? "vyčerpaná" : "zostáva " + I(r.rezerva - r.pouzita)}</td></tr>`
        : `<tr><td>${esc(x.polozka)}${x.dodavatel ? `<br><span class="note" style="margin:0">${esc(x.dodavatel)}</span>` : ""}</td><td class="r">${I(x.rozpocet)}</td><td class="r">${x.zazmluvnene != null ? I(x.zazmluvnene) : "–"}</td><td class="r">${x.vyfakturovane != null ? I(x.vyfakturovane) : "–"}</td><td class="r">${x.dokoncenie != null ? x.dokoncenie + " %" : "–"}</td><td class="r">${I(x.eac)}</td><td class="r ${x.odchylka > S.signals.f4.tol ? "hl" : ""}">${x.odchylka ? X.sgn(x.odchylka) + " %" : "0 %"}</td></tr>`).join("") +
        `<tr class="sum"><td>Spolu</td><td class="r">${I(r.spolu)}</td><td colspan="3"></td><td class="r">${I(r.eacSpolu)}</td><td class="r">${X.sgn(Math.round((r.eacSpolu / r.spolu - 1) * 1000) / 10)} %</td></tr>`;
      const sr = p.stres.map(x => { const below = p.ciel != null && (x.irrVk == null || x.irrVk < p.ciel); return `<tr class="${x.k === "zaklad" ? "" : ""}"><td>${x.k === "zaklad" ? "<b>" + esc(x.nazov) + "</b>" : esc(x.nazov)}</td><td class="r">${X.pctS(x.irrP)}</td><td class="r ${below ? "hl" : ""}">${X.pctS(x.irrVk)}</td><td class="r ${x.zisk < 0 ? "hl" : ""}">${X.eurM(x.zisk)}</td></tr>`; }).join("");
      return `<div class="pcard">
        <div class="phead"><div><div class="lbl"><span class="blue">${esc(p.kod)}</span> · ${esc(u ? `${u.banka} · ${u.typ}` : "bez úveru")} · ${esc(p.faza || "")}</div><h3>${esc(p.nazov)}</h3></div>
          <div class="lbl" style="text-align:right">Kolaudácia<br><span style="color:var(--ink);font-size:13px">${p.kolaudacia ? FM.dmy(p.kolaudacia) : "–"}</span></div></div>
        <div class="tiles ptiles">${tiles}</div>
        <div class="fline">Oproti biznis plánu sa IRR projektu zmenilo o <b>${X.sgn(i.p - i.pBp)} p. b.</b>: predaj (tempo a ceny) ${X.sgn(i.vplyvPredaja)} p. b., náklady ${X.sgn(i.vplyvNakladov)} p. b. Príjmy ${X.eurM(i.prijmy)}, náklady ${X.eurM(i.naklady)}, úroky ${X.eurM(i.urokyOdhad)}.</div>
        <div class="lbl fin-h">Tranže a podmienky čerpania${u ? ` · úrok ${String(u.urok).replace(".", ",")} % · splatnosť ${FM.dmy(u.splatnost)}` : ""}</div>
        <table class="ptable"><thead><tr><th>Tranža</th><th>Účel</th><th class="r">Suma</th><th style="padding-left:16px">Termín</th><th>Podmienky</th></tr></thead><tbody>${tr}</tbody></table>
        <div class="fline">Krytie úveru: zmluvy za <b>${X.eurM(p.zmluvy)}</b> (s DPH) / čerpané <b>${X.eurM(p.cerpane)}</b> = <b>${X.xS(k.krytie)}</b>, kovenant ${X.xS(k.kovenant)}${k.dalsia ? `; po čerpaní ${esc(k.dalsia)} ${X.xS(k.poDalsej)}${k.chybaPo ? `, chýbajú zmluvy za ${eur(k.chybaPo)}` : ""}` : ""}. Krytie celého limitu ${X.xS(k.krytieLimitu)}.</div>
        <div class="lbl fin-h">Potrebné tempo predaja · posledných 90 dní ${p.sold90} ${FM.pl(p.sold90, "zmluva", "zmluvy", "zmlúv")} na byty, priemerne ${X.num2(p.tempo)} mesačne</div>
        ${tg ? `<table class="ptable"><thead><tr><th>Cieľ</th><th>Termín</th><th class="r">Chýba zmlúv</th><th class="r">Treba mesačne</th><th>Pri dnešnom tempe</th></tr></thead><tbody>${tg}</tbody></table>` : `<div class="fline">Všetky predajné ciele sú splnené.</div>`}
        <div class="lbl fin-h">Rozpočet bez DPH · aktualizované ${r.polozky[0] && r.polozky[0].aktualizovane ? FM.dmy(r.polozky[0].aktualizovane) : "–"}</div>
        <table class="ptable"><thead><tr><th>Položka</th><th class="r">Rozpočet €</th><th class="r">Zazmluvnené €</th><th class="r">Vyfakturované €</th><th class="r">Hotové</th><th class="r">Odhad €</th><th class="r">Odchýlka</th></tr></thead><tbody>${rz}</tbody></table>
        <div class="fline">Náklady do dokončenia <b>${eur(r.nakladyDoDokoncenia)}</b>. ${r.vkTreba > 0 ? `Na dokončenie treba ešte <b>${eur(r.vkTreba)}</b> vlastných zdrojov, prisľúbených ostáva ${eur(r.vkZostava)}.` : `Pri pláne tranží a príjmoch zo zmlúv netreba ďalší vlastný kapitál (prisľúbených ostáva ${eur(r.vkZostava)}).`}</div>
        <div class="lbl fin-h">Stres test · cieľové IRR vlastného kapitálu ${p.ciel != null ? p.ciel + " %" : "–"}</div>
        <table class="ptable"><thead><tr><th>Scenár</th><th class="r">IRR projektu</th><th class="r">IRR vlastného kapitálu</th><th class="r">Zisk</th></tr></thead><tbody>${sr}</tbody></table>
      </div>`;
    }).join("");
  }
  function bindFinance() {
    $("#btnLoadFin").addEventListener("click", async () => {
      if (st.running) return; lock(true); const btn = $("#btnLoadFin"); btn.textContent = "Načítavam…";
      try { await loadData(null); updateSignalNow(); btn.textContent = `Načítané ${hm(st.dataAt)} · obnoviť`; }
      catch (e) { btn.textContent = "Načítať dáta"; $("#finInfo").textContent = errText(e, "Dáta"); }
      finally { lock(false); }
    });
    $("#btnFin").addEventListener("click", sendFin);
    $("#finTo").addEventListener("input", e => { e.target.classList.remove("err"); $("#finErr").classList.add("hidden"); });
  }

  // ---------- projekty ----------
  function renderProjects() {
    const box = $("#proj"); if (!box) return;
    if (!st.data) return;
    const P = FM.projectStats(st.data, Date.now());
    $("#projInfo").textContent = `${dataLabel()} · načítané ${hm(st.dataAt)} · ${st.data.counts.jednotky} jednotiek · predané = zmluva o budúcej, kúpna zmluva alebo odovzdaná`;
    box.innerHTML = P.map(p => {
      const bankaTxt = p.bankaPct == null ? "bez podmienky banky" : (p.banka === "splnené" ? `splnené (${p.bankaPct} %)` : `${p.bankaPct} % do ${FM.dmy(p.bankaDo)} · chýba ${p.chyba} ${FM.pl(p.chyba, "zmluva", "zmluvy", "zmlúv")}`);
      const bankaHl = p.banka !== "splnené" && p.bankaPct != null;
      const bar = (cls, n) => n ? `<i class="${cls}" style="width:${(n / p.byty * 100).toFixed(2)}%"></i>` : "";
      const markPlan = p.planPct != null ? `<span class="pmark" style="left:${p.planPct}%" title="plán ${p.planPct} %"><b>plán</b></span>` : "";
      const markBank = p.bankaPct != null ? `<span class="pmark bank" style="left:${p.bankaPct}%" title="banka ${p.bankaPct} %"><b>banka</b></span>` : "";
      const diff = p.volneM2 && p.konkurenciaM2 ? Math.round((p.volneM2 / p.konkurenciaM2 - 1) * 1000) / 10 : null;
      return `<div class="pcard">
        <div class="phead"><div><div class="lbl"><span class="blue">${esc(p.kod)}</span> · ${esc(p.lokalita)} · ${esc(p.faza || "")}</div><h3>${esc(p.nazov)}</h3></div>
          <div class="lbl" style="text-align:right">Kolaudácia<br><span style="color:var(--ink);font-size:13px">${p.kolaudacia ? FM.dmy(p.kolaudacia) : "–"}</span></div></div>
        <div class="tiles ptiles">
          <div class="tile"><div class="v ${p.planPct != null && p.soldPct < p.planPct ? "blue" : ""}">${FM.fmtPct(p.soldPct)}</div><div class="k">Predané byty · ${p.sold} z ${p.byty}</div></div>
          <div class="tile"><div class="v">${p.planPct != null ? p.planPct + "\u00a0%" : "–"}</div><div class="k">Plán k dnešku</div></div>
          <div class="tile"><div class="v ${bankaHl ? "blue" : ""}">${p.bankaPct != null ? (p.banka === "splnené" ? "OK" : p.chyba) : "–"}</div><div class="k">Banka · ${esc(p.banka === "splnené" ? "podmienka splnená" : "chýba zmlúv")}</div></div>
          <div class="tile"><div class="v">${p.sold30}</div><div class="k">Predané za 30 dní</div></div>
          <div class="tile"><div class="v">${p.rez}</div><div class="k">Rezervované</div></div>
          <div class="tile"><div class="v">${p.free}</div><div class="k">Voľné byty</div></div>
        </div>
        <div class="pbar-wrap"><div class="stack pbar">${bar("c1", p.sold)}${bar("c2", p.rez)}${bar("c3", p.free)}</div>${markPlan}${markBank}</div>
        <div class="keys"><span><i class="sw c1"></i>Predané <b>${p.sold}</b></span><span><i class="sw c2"></i>Rezervované <b>${p.rez}</b></span><span><i class="sw c3"></i>Voľné <b>${p.free}</b></span><span>Banka: <b>${esc(bankaTxt)}</b></span>${p.lastSale ? `<span>Posledný predaj: <b>${FM.dmy(p.lastSale)}</b></span>` : ""}</div>
        <table class="ptable"><thead><tr><th>Typ bytu</th><th class="r">Spolu</th><th class="r">Predané</th><th class="r">Rezerv.</th><th class="r">Voľné</th><th class="r">Cena voľných €/m²</th></tr></thead><tbody>
          ${p.mix.map(m => `<tr><td>${esc(m.typ)}${m.vypredane ? ` <span class="tag">voľné už nie sú</span>` : ""}${m.vzor ? ` <span class="note" style="margin:0">+ vzorový byt</span>` : ""}</td><td class="r">${m.spolu}</td><td class="r">${m.predane}</td><td class="r">${m.rez}</td><td class="r">${m.volne}</td><td class="r">${m.volneM2 ? FM.fmtInt(m.volneM2) : "–"}</td></tr>`).join("")}
          ${p.ostatne.map(o => `<tr class="o"><td>${esc(o.typ)}</td><td class="r">${o.spolu}</td><td class="r">${o.predane}</td><td class="r">–</td><td class="r">${o.volne}</td><td class="r"></td></tr>`).join("")}
        </tbody></table>
        <div class="note">Priemerná cena voľných bytov ${p.volneM2 ? FM.fmtInt(p.volneM2) + " €/m²" : "–"}${p.konkurenciaM2 ? `, konkurenčné projekty v lokalite ${FM.fmtInt(p.konkurenciaM2)} €/m²` : ""}${diff != null ? ` (${diff > 0 ? "+" : ""}${String(diff).replace(".", ",")} %)` : ""}.${p.uzavierka ? ` Uzávierka klientskych zmien ${FM.dmy(p.uzavierka)}.` : ""}</div>
      </div>`;
    }).join("");
  }
  function bindProjects() {
    $("#btnLoadProj").addEventListener("click", async () => {
      if (st.running) return; lock(true); const btn = $("#btnLoadProj"); btn.textContent = "Načítavam…";
      try { await loadData(null); updateSignalNow(); btn.textContent = `Načítané ${hm(st.dataAt)} · obnoviť`; }
      catch (e) { btn.textContent = "Načítať dáta"; $("#projInfo").textContent = errText(e, "Dáta"); }
      finally { lock(false); }
    });
  }

  // ---------- tím ----------
  function recipients() {
    return S.team.filter(m => m.aktivny && String(m.email || "").trim()).map(m => {
      const scope = DEV && m.rozsah === "financie" ? "financie" : (m.rozsah === "svoje" && m[T.osoba] ? "svoje" : "cely");
      return { ...m, scope, err: FM.validEmail(m.email) };
    });
  }
  async function sendTeam() {
    if (st.running) return;
    const rc = recipients();
    const ok = rc.filter(r => !r.err);
    if (!ok.length) { $("#teamInfo").textContent = rc.length ? "Žiadna platná adresa. Opravte e-maily označené modrou." : "Nikto nemá zadaný e-mail a zapnuté posielanie."; return; }
    lock(true);
    const R = makeRun($("#teamRun"), $("#teamSteps"), null, "", [...BRIEF_STEPS, ...ok.map(r => `${r.meno} · ${r.scope === "cely" ? "celý brífing" : (r.scope === "financie" ? "finančný brífing" : "osobný brífing")}`)]);
    try {
      await ensureBrief(false, R);
      const b = st.brief, t = st.texts;
      const mk = ok.filter(r => r.scope === "svoje");
      let personal = {};
      if (mk.length) {
        R.set(2, "active", `AI píše osobné brífingy ${T.osobyGen}…`);
        try { personal = (await aiJson(FM.personalPrompt(b, mk))) || {}; } catch (e) { personal = {}; }
        R.set(2, "done", `Celý brífing + ${mk.length} ${mk.length === 1 ? "osobný" : "osobné"}`);
      }
      const fr = ok.filter(r => r.scope === "financie");
      let finErr = null;
      if (fr.length) {
        R.set(2, "active", "AI píše finančný brífing…");
        try { await ensureFin(false, NOR); } catch (e) { finErr = e; }
        R.set(2, "done", `Brífingy pripravené${finErr ? " (finančný sa nedá zostaviť)" : ""}`);
      }
      const SC = { cely: "celý brífing", financie: "finančný brífing", svoje: "osobný brífing" };
      if (POTVRDIT && !await confirmSend(`Odoslať ${ok.length} ${FM.pl ? FM.pl(ok.length, "e-mail", "e-maily", "e-mailov") : "e-mailov"} tímu?`, ok.map(r => [r.meno || "Bez mena", `${r.email} · ${SC[r.scope]}`]).concat([["Cez", EMAIL.sluzba], ["Dáta", dataLabel()]]))) { ok.forEach((r, i) => R.set(BRIEF_STEPS.length + i, "cancel", "Zrušené")); R.msg("Nič neodišlo."); return; }
      let sent = 0;
      for (let i = 0; i < ok.length; i++) {
        const r = ok[i], idx = BRIEF_STEPS.length + i;
        R.set(idx, "active", r.email);
        try {
          if (r.scope === "cely") {
            await sendMail([r.email], FM.emailSubject(b, t), FM.emailText(b, t), FM.emailHtml(b, t));
          } else if (r.scope === "financie") {
            if (finErr) throw finErr;
            const f = st.fin, ft = st.finTexts, day = st.finDay;
            await sendMail([r.email], FIN.emailSubject(f, ft, day), FIN.emailText(f, ft, day), FIN.emailHtml(f, ft, day));
          } else {
            const p0 = personal[r[T.osoba]];
            const fb = FM.personalFallback(b, r[T.osoba]);
            const p = (p0 && typeof p0.veta === "string" && Array.isArray(p0.kroky) && p0.kroky.length) ? { veta: p0.veta, kroky: p0.kroky.slice(0, 3).map(String) } : fb;
            const pe = FM.personalEmail(b, r, p);
            await sendMail([r.email], pe.subject, pe.text, pe.html);
          }
          sent++; R.set(idx, "done", `${r.email} · ${hm(Date.now())}`);
        } catch (e) { R.set(idx, "err", errText(e, EMAIL.sluzba, true)); }
      }
      R.msg(`Odoslané ${sent} z ${ok.length} e-mailov.` + (rc.length > ok.length ? ` ${rc.length - ok.length} adries som preskočil (neplatné alebo fiktívne).` : ""), sent < ok.length);
      if (sent) addLog(`Tím · ${sent} ${sent === 1 ? "e-mail" : (sent < 5 ? "e-maily" : "e-mailov")}`, t.podnadpis);
    } catch (e) { R.fail(errText(e, "Dáta")); }
    finally { lock(false); }
  }
  function renderTeam() {
    const opt = (v, cur, label) => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(label || v)}</option>`;
    $("#team").innerHTML = `<div class="trow head"><span class="lbl">Meno</span><span class="lbl">Rola</span><span class="lbl">${T.osobaLbl} v dátach</span><span class="lbl">E-mail</span><span class="lbl">Dostáva</span><span class="lbl">Posielať</span><span></span></div>` +
      S.team.map((m, i) => `<div class="trow" data-i="${i}">
        <input type="text" data-k="meno" value="${esc(m.meno)}" placeholder="Meno" aria-label="Meno">
        <select data-k="rola" aria-label="Rola">${T.roly.map(([v, l]) => opt(v, m.rola, l)).join("")}</select>
        <select data-k="${T.osoba}" aria-label="${T.osobaLbl} v dátach">${opt("", m[T.osoba], "—")}${T.osoby().map(x => opt(x, m[T.osoba])).join("")}</select>
        <input type="email" data-k="email" value="${esc(m.email)}" placeholder="e-mail" aria-label="E-mail" class="${m.email && FM.validEmail(m.email) ? "err" : ""}" title="${esc(m.email ? (FM.validEmail(m.email) || "") : "")}">
        <select data-k="rozsah" aria-label="Dostáva">${T.rozsahy.map(([v, l]) => opt(v, m.rozsah, l)).join("")}</select>
        <label class="toggle" title="Posielať"><input type="checkbox" data-k="aktivny"${m.aktivny ? " checked" : ""}><span class="box"></span></label>
        <button class="x" data-del="${i}" aria-label="Odstrániť">×</button></div>`).join("");
    teamInfo();
  }
  function teamInfo() {
    const rc = recipients(), ok = rc.filter(r => !r.err);
    const c = ok.filter(r => r.scope === "cely").length, fz = ok.filter(r => r.scope === "financie").length, p = ok.length - c - fz;
    $("#teamInfo").textContent = ok.length ? `Odíde ${ok.length} ${ok.length === 1 ? "e-mail" : (ok.length < 5 ? "e-maily" : "e-mailov")}: ${c} ${c === 1 ? "celý brífing" : "celé brífingy"}, ${p} ${p === 1 ? "osobný" : "osobné"}${fz ? `, ${fz} ${fz === 1 ? "finančný" : "finančné"}` : ""}.` + (rc.length > ok.length ? ` ${rc.length - ok.length} adresu preskočím.` : "") : "Zapnite posielanie aspoň jednému členovi s e-mailom.";
  }
  function bindTeam() {
    $("#team").addEventListener("input", e => {
      const row = e.target.closest(".trow"); const k = e.target.dataset.k; if (!row || !k) return;
      const m = S.team[+row.dataset.i]; if (!m) return;
      m[k] = e.target.type === "checkbox" ? e.target.checked : e.target.value;
      if (k === "email") { const bad = m.email && FM.validEmail(m.email); e.target.classList.toggle("err", !!bad); e.target.title = bad || ""; }
      if (k === "rola" && m.rola !== T.osoba) { m.rozsah = T.rolaRozsah[m.rola] || "cely"; renderTeam(); }
      if (k === T.osoba && m[T.osoba] && m.rola === T.osoba && !m.meno) { m.meno = m[T.osoba]; renderTeam(); }
      teamInfo(); save();
    });
    $("#team").addEventListener("change", e => { if (e.target.tagName === "SELECT" || e.target.type === "checkbox") e.target.dispatchEvent(new Event("input", { bubbles: true })); });
    $("#team").addEventListener("click", e => { const d = e.target.dataset.del; if (d == null) return; S.team.splice(+d, 1); renderTeam(); save(); });
    $("#addMember").addEventListener("click", () => { S.team.push({ id: "m" + Date.now(), meno: "", rola: T.osoba, [T.osoba]: "", email: "", rozsah: "svoje", aktivny: true }); renderTeam(); save(); });
    $("#btnTeam").addEventListener("click", sendTeam);
  }

  // ---------- signály ----------
  // popisy signálov a zdroje dát sú v panel/rozhranie/<typ>.js
  const { SIG, FSIG, SRC, SRC_CUSTOM } = T;
  const srcOpen = new Set();
  const SRC_ICON = `<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><ellipse cx="6" cy="2.5" rx="4.5" ry="1.8" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M1.5 2.5v7c0 1 2 1.8 4.5 1.8s4.5-.8 4.5-1.8v-7M1.5 6c0 1 2 1.8 4.5 1.8S10.5 7 10.5 6" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`;
  const srcBtn = k => !SRC ? "" : `<button class="srcbtn${srcOpen.has(k) ? " on" : ""}" type="button" data-src="${esc(k)}" aria-expanded="${srcOpen.has(k)}" title="Odkiaľ pochádzajú dáta">${SRC_ICON}Zdroje</button>`;
  const srcBox = (k, d) => SRC && d ? `<div class="srcbox${srcOpen.has(k) ? "" : " hidden"}" id="src-${esc(k)}"><div class="lbl">Odkiaľ budú dáta</div><ul>${d.z.map(([a, b]) => `<li><b>${esc(a)}</b>: ${esc(b)}</li>`).join("")}</ul><div class="note" style="margin:6px 0 0">V ukážke: ${esc(d.f)}</div></div>` : "";
  function bindSources() {
    ["#sig", "#fsig"].forEach(id => $(id).addEventListener("click", e => {
      const b = e.target.closest("[data-src]"); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      const k = b.dataset.src, box = koren.querySelector(`[id="src-${CSS.escape(k)}"]`);
      if (srcOpen.has(k)) srcOpen.delete(k); else srcOpen.add(k);
      if (box) box.classList.toggle("hidden", !srcOpen.has(k));
      b.classList.toggle("on", srcOpen.has(k)); b.setAttribute("aria-expanded", srcOpen.has(k));
    }));
  }
  function renderSignals() {
    const per = $("#period"); if (per) per.value = String(S.signals.period);
    if (DEV) $("#fsig").innerHTML = FSIG.map((g, i) => `<div class="sg ${S.signals[g.k].on ? "" : "off"}" data-k="${g.k}">
      <div class="sg-top"><span class="lbl"><span class="blue">F${i + 1}</span> · finančný signál${srcBtn(g.k)}</span><label class="toggle"><span>${S.signals[g.k].on ? "zapnutý" : "vypnutý"}</span><input type="checkbox" data-on="${g.k}"${S.signals[g.k].on ? " checked" : ""}><span class="box"></span></label></div>
      <div class="sg-body"><h3>${esc(g.t)}</h3><p>${esc(g.d)}</p>${srcBox(g.k, SRC && SRC[g.k])}
      <div class="params">${g.p.map(([f, l, mn, mx]) => `<label><span class="lbl">${esc(l)}</span><input type="number" min="${mn}" max="${mx}" data-s="${g.k}" data-f="${f}" value="${S.signals[g.k][f]}"></label>`).join("")}</div>
      <div class="now"><span class="lbl">Dnes</span><span class="v" id="now-${g.k}">–</span><span class="note" id="nowd-${g.k}" style="margin:0"></span></div></div></div>`).join("");
    $("#sig").innerHTML = SIG.map((g, i) => `<div class="sg ${S.signals[g.k].on ? "" : "off"}" data-k="${g.k}">
      <div class="sg-top"><span class="lbl"><span class="blue">S${i + 1}</span> · signál${srcBtn(g.k)}</span><label class="toggle"><span>${S.signals[g.k].on ? "zapnutý" : "vypnutý"}</span><input type="checkbox" data-on="${g.k}"${S.signals[g.k].on ? " checked" : ""}><span class="box"></span></label></div>
      <div class="sg-body"><h3>${esc(g.t)}</h3><p>${esc(g.d)}</p>${srcBox(g.k, SRC && SRC[g.k])}
      <div class="params">${g.p.map(([f, l, mn, mx]) => `<label><span class="lbl">${esc(l)}</span><input type="number" min="${mn}" max="${mx}" data-s="${g.k}" data-f="${f}" value="${S.signals[g.k][f]}"></label>`).join("")}</div>
      <div class="now"><span class="lbl">Dnes</span><span class="v" id="now-${g.k}">–</span><span class="note" id="nowd-${g.k}" style="margin:0"></span></div></div></div>`).join("") + (!DEV ? "" :
      customList().map((r, i) => `<div class="sg ${r.on !== false ? "" : "off"}" data-cid="${esc(r.id)}">
      <div class="sg-top"><span class="lbl"><span class="blue">V${i + 1}</span> · vlastný signál<span class="tagc">${esc(FM.SOURCES[r.objekt] || "")}</span>${srcBtn("c_" + r.id)}</span><label class="toggle"><span>${r.on !== false ? "zapnutý" : "vypnutý"}</span><input type="checkbox" data-con="${esc(r.id)}"${r.on !== false ? " checked" : ""}><span class="box"></span></label></div>
      <div class="sg-body"><h3>${esc(r.nazov)}</h3>${r.popis ? `<p>${esc(r.popis)}</p>` : ""}${srcBox("c_" + r.id, SRC_CUSTOM[r.objekt])}
      <div class="rule">${esc(FM.describeRule(r))}</div>
      <div class="sg-acts"><button class="link" data-edit="${esc(r.id)}" type="button">Upraviť</button><button class="link" data-del="${esc(r.id)}" type="button">Odstrániť</button><span class="note" style="margin:0">${r.uroven === "red" ? "Konať dnes" : "Sledovať"}</span></div>
      <div class="now"><span class="lbl">Dnes</span><span class="v" id="now-c_${esc(r.id)}">–</span><span class="note" id="nowd-c_${esc(r.id)}" style="margin:0"></span></div></div></div>`).join("") +
      `<button class="sg sg-add" id="sgAdd" type="button"><span class="plus">+</span><b>Pridať signál</b><span class="note">Vlastné pravidlo nad jednotkami, dopytmi alebo projektmi. Opíšte ho slovami a AI navrhne podmienky.</span></button>`);
    if (LEN_CITAT) lockSignals();
    updateSignalNow();
  }
  // signály len na čítanie (nastavenie signaly_len_na_citanie): hranice a zapnutie sa v paneli nemenia
  function lockSignals() {
    $$("#sig input, #fsig input, #period").forEach(i => { i.disabled = true; });
    $$("#sig .toggle, #fsig .toggle").forEach(t => t.classList.add("ro"));
    $$("#sgAdd, #sig [data-edit], #sig [data-del]").forEach(x => x.remove());
  }
  function updateSignalNow() {
    if (!$("#now-s1")) return;
    if (!st.data) { [...SIG.map(g => g.k), ...FSIG.map(g => g.k), ...(DEV ? customList().map(r => "c_" + r.id) : [])].forEach(k => { const e = $("#now-" + k); if (e) { e.textContent = "–"; $("#nowd-" + k).textContent = "načítajte dáta"; } }); return; }
    const b = FM.compute(st.data, S.signals, Date.now());
    const set = (k, v, d, hl) => { const e = $("#now-" + k); e.textContent = v; e.classList.toggle("hl", !!hl); $("#nowd-" + k).textContent = d; };
    T.signalNow(b, set, st.data);
    if (DEV) updateFinSignalNow(b, set);
    $("#sigSaved").title = `${dataLabel()} · načítané ${hm(st.dataAt)}`;
  }
  function updateFinSignalNow(b, set) {
    const f = finCompute();
    if (!f.available) FSIG.forEach(g => set(g.k, "–", "finančné súbory chýbajú", false));
    else {
      const X = FIN;
      const PN = kod => (f.projekty.find(p => p.kod === kod) || {}).nazov || kod;
      const zo = n => /^(4|7|1[47]|[47]\d)$/.test(String(n)) ? "zo" : "z";
      const condTxt = c => c.typ === "predpredaj_pct" ? `predané byty ${FM.fmtPct(c.hodnota)} z požadovaných ${c.ciel} %`
        : c.typ === "krytie_x" ? `krytie úveru zmluvami ${X.xS(c.hodnota)} z požadovaných ${X.xS(c.ciel)}`
        : c.typ === "vlastny_kapital_eur" ? `vložený vlastný kapitál ${FM.eur(c.hodnota)} z požadovaných ${FM.eur(c.ciel)}`
        : c.popis.charAt(0).toLowerCase() + c.popis.slice(1);
      set("f1", String(f.f1.count), f.f1.count ? f.f1.items.map(t => `${t.poradie}. tranža úveru projektu ${PN(t.projekt)} (${X.eurM(t.suma)}), čerpanie ${FM.dmy(t.plan)}, o ${t.dni} ${FM.pl(t.dni, "deň", "dni", "dní")}: banka stanovila ${t.podmienky.length} ${FM.pl(t.podmienky.length, "podmienku", "podmienky", "podmienok")}, nesplnené ${FM.pl(t.nesplnene, "je", "sú", "je")} ${t.nesplnene}: ${t.podmienky.filter(c => !c.ok).map(condTxt).join("; ")}`).join(" · ") : `žiadna tranža v najbližších ${f.f1.days} dňoch nemá nesplnenú podmienku`, f.f1.level === "red");
      set("f2", String(f.f2.count), f.f2.all.map(x => { const p = f.projekty.find(q => q.kod === x.projekt); const t = p && p.tranze.find(q => q.id === x.dalsia); return `${PN(x.projekt)}: zmluvy kryjú čerpaný úver ${X.xS(x.krytie)}, banka požaduje aspoň ${X.xS(x.kovenant)}` + (t ? `; po čerpaní ${t.poradie}. tranže ${X.xS(x.poDalsej)}` : ""); }).join(" · "), f.f2.level === "red");
      set("f3", String(f.f3.count), f.f3.count ? f.f3.items.map(x => `${PN(x.projekt)}: na ${x.typ === "banka" ? `podmienku banky (${x.nazov.replace(/^podmienka banky /, "")} predaných bytov)` : x.nazov} do ${FM.dmy(x.termin)} treba ${X.num2(x.potrebne)} zmluvy mesačne, za posledné 3 mesiace sa predávalo ${X.num2(x.tempo)} mesačne`).join(" · ") : "dnešné tempo predaja stačí na všetky ciele", f.f3.level === "red");
      set("f4", String(f.f4.count), f.f4.count ? f.f4.items.map(x => `${PN(x.projekt)}: ${x.flags.map(fl => fl.typ === "rezerva" ? `rezerva na nepredvídané náklady je minutá na ${X.pctS(x.pouzitaPct)}, stavba je hotová na ${X.pctS(x.dokoncenie)}` : (fl.typ === "financovanie" ? `na dokončenie chýba ${FM.eur(x.vkTreba - x.vkZostava)} vlastných zdrojov` : `nad rozpočtom ${x.nadTol.map(r => `${r.polozka.replace(" (TZB)", "")} ${X.sgn(r.odchylka)} %`).join(", ")}`)).join("; ")}`).join(" · ") : "všetky položky rozpočtu sú v tolerancii a rezerva stačí", f.f4.level === "red");
      set("f5", String(f.f5.count), f.f5.all.map(x => `${PN(x.projekt)}: výnosnosť vlastného kapitálu (IRR) ${X.pctS(x.vk)}, cieľ investorov ${x.ciel} %, biznis plán ${X.pctS(x.vkBp)}`).join(" · "), f.f5.level === "red");
      set("f6", String(f.f6.count), f.f6.all.map(x => `${PN(x.projekt)}: pod cieľom v ${x.podCielom.length} ${zo(x.scenare.length - 1)} ${x.scenare.length - 1} scenárov, najhorší (${x.najhorsi.nazov.toLowerCase()}) dáva výnosnosť vlastného kapitálu ${X.pctS(x.najhorsi.irrVk)}`).join(" · "), f.f6.level === "red");
    }
    renderFinance(f);
    (b.customKeys || []).forEach(k => { const c = b[k]; if ($("#now-" + k)) set(k, String(c.count), c.count ? c.items.slice(0, 6).map(x => x.label).join(", ") + (c.count > 6 ? ` a ďalších ${c.count - 6}` : "") : "nič nespĺňa pravidlo", c.count > 0 && c.level === "red"); });
  }
  function bindSignals() {
    $("#sig").addEventListener("click", e => {
      const t = e.target.closest("[data-edit],[data-del],#sgAdd"); if (!t) return;
      if (t.id === "sgAdd") { openCustom(null); return; }
      if (t.dataset.edit) { openCustom(customList().find(r => r.id === t.dataset.edit)); return; }
      if (t.dataset.del) {
        if (t.dataset.confirm !== "1") { t.dataset.confirm = "1"; t.textContent = "Naozaj odstrániť?"; setTimeout(() => { if (t.isConnected) { t.dataset.confirm = ""; t.textContent = "Odstrániť"; } }, 4000); return; }
        S.signals.custom = customList().filter(r => r.id !== t.dataset.del); renderSignals(); save();
      }
    });
    const per = $("#period");
    if (per) per.addEventListener("change", e => { S.signals.period = +e.target.value; updateSignalNow(); save(); });
    if (DEV && $("#btnAddSig")) $("#btnAddSig").addEventListener("click", () => openCustom(null));
    if (DEV) $("#sigFilter").addEventListener("click", e => {
      const b = e.target.closest("[data-sf]"); if (!b) return;
      const v = b.dataset.sf;
      $$("#sigFilter button").forEach(x => x.classList.toggle("on", x === b));
      $("#salesWrap").classList.toggle("hidden", v === "fin");
      $("#finWrap").classList.toggle("hidden", v === "sales");
      $("#finWrap > .kicker").style.marginTop = v === "fin" ? "0" : "48px";
    });
    $("#sig").addEventListener("input", e => {
      const con = e.target.dataset.con;
      if (con) { const r = customList().find(x => x.id === con); if (r) { r.on = e.target.checked; renderSignals(); save(); } return; }
      const k = e.target.dataset.s, f = e.target.dataset.f, on = e.target.dataset.on;
      if (on) { S.signals[on].on = e.target.checked; renderSignals(); save(); return; }
      if (!k || !f) return;
      const v = parseInt(e.target.value, 10); if (!(v >= T.minParam)) return;
      S.signals[k][f] = v; updateSignalNow(); save();
    });
    $("#sig").addEventListener("change", e => { if (e.target.type === "checkbox") e.target.dispatchEvent(new Event("input", { bubbles: true })); });
    if (DEV) $("#fsig").addEventListener("input", e => {
      const k = e.target.dataset.s, fld = e.target.dataset.f, on = e.target.dataset.on;
      if (on) { S.signals[on].on = e.target.checked; renderSignals(); save(); return; }
      if (!k || !fld) return;
      const v = parseInt(e.target.value, 10); if (!(v >= 0)) return;
      S.signals[k][fld] = v; updateSignalNow(); save();
    });
    if (DEV) $("#fsig").addEventListener("change", e => { if (e.target.type === "checkbox") e.target.dispatchEvent(new Event("input", { bubbles: true })); });
    $("#btnLoad").addEventListener("click", async () => {
      if (st.running) return; lock(true); const btn = $("#btnLoad"); btn.textContent = "Načítavam…";
      try { await loadData(null); updateSignalNow(); btn.textContent = `Načítané ${hm(st.dataAt)} · obnoviť`; }
      catch (e) { btn.textContent = "Načítať dáta"; $("#sigSaved").textContent = errText(e, "Dáta"); }
      finally { lock(false); }
    });
  }

  // ---------- vlastné signály: formulár ----------
  function customList() { if (!Array.isArray(S.signals.custom)) S.signals.custom = []; return S.signals.custom; }
  let draft = null, draftEditId = null;
  function openCustom(rule) {
    draftEditId = rule ? rule.id : null;
    draft = rule ? clone(rule) : { id: "v" + Date.now().toString(36), on: true, nazov: "", popis: "", objekt: "dopyty", uroven: "yellow", podmienky: [{ pole: "stav", op: "eq", hodnota: "" }] };
    $("#csTitle").textContent = rule ? "Upraviť signál" : "Pridať signál";
    $("#csObj").innerHTML = Object.entries(FM.SOURCES).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("");
    $("#csAsk").value = rule ? (rule.opis || "") : ""; aiState.applied = rule ? (rule.opis || "") : null; aiState.seq++; clearTimeout(aiState.timer);
    aiStatus(sample ? "" : "AI je dostupná po otvorení panela v claude.ai. Políčka vyplňte ručne.");
    $("#csAi").classList.add("hidden");
    const rb = $("#csRule"); rb.classList.toggle("hidden", !(rule && rule.formulacia)); rb.textContent = rule && rule.formulacia ? rule.formulacia : "";
    $("#csDel").classList.toggle("hidden", !rule);
    $("#csErr").classList.add("hidden");
    fillDraft();
    $("#csOv").classList.remove("hidden");
    setTimeout(() => (rule ? $("#csName") : $("#csAsk")).focus(), 30);
  }
  function closeCustom() { $("#csOv").classList.add("hidden"); draft = null; }
  function fillDraft() {
    $("#csName").value = draft.nazov || ""; $("#csDesc").value = draft.popis || ""; $("#csObj").value = draft.objekt; $("#csLevel").value = draft.uroven === "red" ? "red" : "yellow";
    renderConds(); previewDraft();
  }
  function renderConds() {
    const fields = FM.FIELDS[draft.objekt];
    const vals = FM.distinctValues(st.data)[draft.objekt] || {};
    $("#csConds").innerHTML = draft.podmienky.map((c, i) => {
      const f = FM.fieldDef(draft.objekt, c.pole) || fields[0];
      const ops = FM.OPS[f[2]];
      const noval = FM.NOVAL.includes(c.op);
      const dl = vals[f[0]] ? `<datalist id="dl-${i}">${vals[f[0]].map(v => `<option value="${esc(v)}">`).join("")}</datalist>` : "";
      return `<div class="crow" data-i="${i}">
        <select data-c="pole" aria-label="Pole">${fields.map(x => `<option value="${x[0]}"${x[0] === f[0] ? " selected" : ""}>${esc(x[1])}</option>`).join("")}</select>
        <select data-c="op" aria-label="Podmienka">${ops.map(o => `<option value="${o[0]}"${o[0] === c.op ? " selected" : ""}>${esc(o[1])}</option>`).join("")}</select>
        <input type="${f[2] === "text" ? "text" : "number"}" data-c="hodnota" aria-label="Hodnota" value="${esc(c.hodnota ?? "")}" ${noval ? "disabled placeholder=\"–\"" : `placeholder="${f[2] === "date" ? "počet dní" : (f[2] === "num" ? "číslo" : "hodnota")}"`} ${dl ? `list="dl-${i}"` : ""}>${dl}
        <button class="x" data-rm="${i}" type="button" aria-label="Odstrániť podmienku">×</button></div>`;
    }).join("");
  }
  function readDraft() {
    draft.nazov = $("#csName").value.trim(); draft.popis = $("#csDesc").value.trim(); draft.uroven = $("#csLevel").value;
  }
  function previewDraft() {
    const now = $("#csNow"), d = $("#csNowd");
    if (!st.data) { now.textContent = "–"; d.textContent = "načítajte dáta a uvidíte, čo signál nájde"; return; }
    const test = { ...draft, nazov: draft.nazov || "náhľad" };
    if (FM.validRule(test)) { now.textContent = "–"; d.textContent = "doplňte podmienky"; return; }
    const b = FM.compute(st.data, { ...S.signals, custom: [{ ...test, on: true }] }, Date.now());
    const c = b["c_" + test.id];
    now.textContent = String(c.count); now.classList.toggle("hl", c.count > 0);
    d.textContent = c.count ? c.items.slice(0, 8).map(x => x.label).join(", ") + (c.count > 8 ? ` a ďalších ${c.count - 8}` : "") : "teraz nič nespĺňa pravidlo";
  }
  const aiState = { applied: null, busy: null, timer: null, seq: 0 };
  function aiStatus(text, cls) { const e = $("#csAiInfo"); e.textContent = text; e.className = "aistat" + (cls ? " " + cls : ""); }
  async function suggest(ask) {
    if (!sample || !draft) return false;
    const my = ++aiState.seq;
    aiStatus("Claude formuluje pravidlo a vypĺňa políčka…", "busy");
    $("#csAi").classList.add("hidden");
    const run = (async () => {
      if (!st.data && mcp) { try { await loadData(null); } catch (e) { } }
      let r = null;
      try { r = await aiJson(FM.rulePrompt(ask, FM.distinctValues(st.data))); } catch (e) { r = null; }
      if (my !== aiState.seq || !draft) return false;
      $("#csAi").classList.remove("hidden");
      if (!r) { aiStatus("AI teraz neodpovedala. Skúste „Sformulovať znova“ alebo vyplňte políčka ručne."); return false; }
      if (r.chyba) { aiStatus(String(r.chyba)); aiState.applied = ask; return false; }
      const cand = { ...draft, nazov: String(r.nazov || ask).slice(0, 60), popis: String(r.popis || ""), formulacia: String(r.formulacia || ""), objekt: FM.SOURCES[r.objekt] ? r.objekt : draft.objekt, uroven: r.uroven === "red" ? "red" : "yellow",
        podmienky: (Array.isArray(r.podmienky) ? r.podmienky : []).slice(0, 6).map(c => ({ pole: String(c.pole || ""), op: String(c.op || ""), hodnota: c.hodnota == null ? "" : String(c.hodnota) })) };
      cand.podmienky = cand.podmienky.filter(c => { const f = FM.fieldDef(cand.objekt, c.pole); return f && FM.OPS[f[2]].some(o => o[0] === c.op); });
      if (!cand.podmienky.length) cand.podmienky = [{ pole: FM.FIELDS[cand.objekt][0][0], op: "eq", hodnota: "" }];
      draft = cand; aiState.applied = ask; fillDraft();
      const rb = $("#csRule"); rb.textContent = cand.formulacia || FM.describeRule(cand); rb.classList.remove("hidden");
      const ff = ["#csName", "#csObj", "#csLevel", "#csDesc"];
      $$(".crow").forEach(e => e.classList.add("fresh")); ff.forEach(id => $(id).classList.add("fresh-f"));
      setTimeout(() => { $$(".crow").forEach(e => e.classList.remove("fresh")); ff.forEach(id => $(id).classList.remove("fresh-f")); }, 1600);
      const bad = FM.validRule(cand);
      aiStatus(bad ? "Políčka sú vyplnené, ale niečo treba doplniť: " + bad : "Políčka sú vyplnené. Skontrolujte ich a kliknite na „Uložiť signál“.", bad ? "" : "ok");
      return !bad;
    })();
    aiState.busy = run;
    try { return await run; } finally { if (aiState.busy === run) aiState.busy = null; }
  }
  function bindCustom() {
    $("#csClose").addEventListener("click", closeCustom);
    $("#csCancel").addEventListener("click", closeCustom);
    $("#csOv").addEventListener("click", e => { if (e.target.id === "csOv") closeCustom(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#csOv").classList.contains("hidden")) closeCustom(); }, { signal });
    $("#csObj").addEventListener("change", e => { draft.objekt = e.target.value; draft.podmienky = [{ pole: FM.FIELDS[draft.objekt][0][0], op: "eq", hodnota: "" }]; renderConds(); previewDraft(); });
    ["#csName", "#csDesc", "#csLevel"].forEach(id => $(id).addEventListener("input", () => { readDraft(); }));
    $("#csConds").addEventListener("input", e => {
      const row = e.target.closest(".crow"); if (!row) return; const c = draft.podmienky[+row.dataset.i]; const k = e.target.dataset.c;
      if (k === "pole") { c.pole = e.target.value; const f = FM.fieldDef(draft.objekt, c.pole); c.op = FM.OPS[f[2]][0][0]; c.hodnota = ""; renderConds(); }
      else if (k === "op") { c.op = e.target.value; if (FM.NOVAL.includes(c.op)) c.hodnota = ""; renderConds(); }
      else if (k === "hodnota") c.hodnota = e.target.value;
      previewDraft();
    });
    $("#csConds").addEventListener("change", e => { if (e.target.tagName === "SELECT") e.target.dispatchEvent(new Event("input", { bubbles: true })); });
    $("#csConds").addEventListener("click", e => { const i = e.target.dataset.rm; if (i == null) return; draft.podmienky.splice(+i, 1); renderConds(); previewDraft(); });
    $("#csAddCond").addEventListener("click", () => { if (draft.podmienky.length >= 6) return; draft.podmienky.push({ pole: FM.FIELDS[draft.objekt][0][0], op: "eq", hodnota: "" }); renderConds(); });
    $("#csSave").addEventListener("click", async () => {
      const btn = $("#csSave"); if (btn.disabled) return;
      $("#csErr").classList.add("hidden");
      const ask = $("#csAsk").value.trim();
      btn.disabled = true;
      try {
        if (ask && ask !== aiState.applied && sample) { clearTimeout(aiState.timer); await suggest(ask); }
        else if (aiState.busy) await aiState.busy;
        if (!draft) return;
        readDraft();
        if (!draft.nazov && ask) draft.nazov = ask.slice(0, 50);
        const bad = FM.validRule(draft);
        if (bad) { $("#csErr").textContent = bad + (ask && !sample ? " AI tu nie je dostupná, doplňte políčka ručne." : ""); $("#csErr").classList.remove("hidden"); return; }
        draft.opis = ask;
        const list = customList(); const i = list.findIndex(r => r.id === draftEditId);
        if (i >= 0) list[i] = clone(draft); else list.push(clone(draft));
        const name = draft.nazov;
        closeCustom(); renderSignals(); save();
        setTimeout(() => { const e = $("#sigSaved"); if (e) e.textContent = `Signál „${name}“ vytvorený`; }, 900);
      } finally { btn.disabled = false; }
    });
    $("#csDel").addEventListener("click", () => {
      const b = $("#csDel");
      if (b.dataset.confirm !== "1") { b.dataset.confirm = "1"; b.textContent = "Naozaj odstrániť?"; return; }
      b.dataset.confirm = ""; b.textContent = "Odstrániť signál";
      S.signals.custom = customList().filter(r => r.id !== draftEditId); closeCustom(); renderSignals(); save();
    });
    $("#csAi").addEventListener("click", () => { const ask = $("#csAsk").value.trim(); if (ask) suggest(ask); });
    $("#csAsk").addEventListener("input", () => {
      clearTimeout(aiState.timer);
      const ask = $("#csAsk").value.trim();
      if (!sample) return;
      if (ask.length < 8) { aiStatus(ask ? "Píšte ďalej…" : ""); return; }
      if (ask === aiState.applied) return;
      aiStatus("Po dopísaní AI vyplní políčka…");
      aiState.timer = setTimeout(() => suggest(ask), 1300);
    });
    $("#csAsk").addEventListener("blur", () => { const ask = $("#csAsk").value.trim(); if (sample && ask.length >= 8 && ask !== aiState.applied && !aiState.busy) { clearTimeout(aiState.timer); suggest(ask); } });
  }

  // ---------- rozvrh a prepojenia ----------
  const DAYS = [[1, "Po"], [2, "Ut"], [3, "St"], [4, "Št"], [5, "Pi"], [6, "So"], [0, "Ne"]];
  const WDN = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  function nextRun() {
    const now = Date.now(); const time = S.schedule.time || "07:30";
    for (let i = 0; i < 8; i++) {
      const lp = FM.localParts(now + i * 864e5);
      if (!S.schedule.days.includes(WDN[lp.wd])) continue;
      if (i === 0 && lp.hm >= time) continue;
      return `${FM.WDL[lp.wd]} ${FM.dm(lp.date)} o ${time}`;
    }
    return null;
  }
  function renderSchedule() {
    if (!$("#days")) return;
    $("#days").innerHTML = DAYS.map(([n, l]) => `<button type="button" data-d="${n}" class="${S.schedule.days.includes(n) ? "on" : ""}">${l}</button>`).join("");
    $("#time").value = S.schedule.time;
    $("#chSlack").checked = !!S.schedule.slack; $("#chEmail").checked = !!S.schedule.email; $("#chTeam").checked = !!S.schedule.team;
    $("#chEmailAddr").textContent = S.email;
    if (DEV) { $("#chFin").checked = !!S.schedule.fin; $("#chFinAddr").textContent = S.finEmail; }
    const nx = nextRun();
    const ch = [S.schedule.slack && "Slack", S.schedule.email && "e-mail", S.schedule.team && "osobné brífingy tímu", DEV && S.schedule.fin && "finančný brífing"].filter(Boolean);
    $("#autoText").innerHTML = (S.automation.active
      ? `<b>Zapnuté.</b> Naplánovaná úloha v Claude si pred každým odoslaním prečíta toto nastavenie.`
      : `<b>Zatiaľ nezapnuté.</b> Nastavenie sa ukladá. Ranné odosielanie podľa neho spustí naplánovaná úloha v Claude, keď sa zapne.`) +
      `<div class="note">${nx && ch.length ? `Najbližší termín podľa nastavenia: <b>${esc(nx)}</b> · ${esc(ch.join(", "))}` : "Vyberte aspoň jeden deň a kanál."}</div>`;
  }
  function bindSchedule() {
    if (!$("#days")) return;
    $("#days").addEventListener("click", e => { const d = e.target.dataset.d; if (d == null) return; const n = +d; const a = S.schedule.days; const i = a.indexOf(n); i >= 0 ? a.splice(i, 1) : a.push(n); renderSchedule(); save(); });
    $("#time").addEventListener("change", e => { if (/^\d\d:\d\d$/.test(e.target.value)) { S.schedule.time = e.target.value; renderSchedule(); save(); } });
    [["#chSlack", "slack"], ["#chEmail", "email"], ["#chTeam", "team"], ...(DEV ? [["#chFin", "fin"]] : [])].forEach(([id, k]) => $(id).addEventListener("change", e => { S.schedule[k] = e.target.checked; renderSchedule(); save(); }));
  }
  const CONN_ROWS = [
    { s: "Slack", use: "Doručenie do " + FM.SLACK_NAME, check: () => call("Slack", "slack_read_channel", { channel_id: FM.SLACK_CHANNEL, limit: 1 }) },
    { s: EMAIL.server, use: NASTAVENIA.email ? `Doručenie e-mailov (${EMAIL.sluzba})` : "Doručenie e-mailov", check: null },
    { s: "Claude AI", use: "Interpretácia a návrh krokov", check: null }
  ];
  function renderConnTable() {
    const body = $("#connBody"); if (!body) return;
    body.innerHTML = CONN_ROWS.map((r, i) => {
      const s = r.s === "Claude AI" ? (sample ? "connected" : (st.capsReady ? "na" : "unknown")) : (st.conn[r.s] || "unknown");
      return `<tr><td><b>${esc(r.s)}</b></td><td class="note" style="margin:0">${esc(r.use)}</td><td><span class="chip"><i class="dot ${s === "connected" ? "ok" : (s === "bad" || s === "missing" ? "bad" : "")}"></i>${CONN_LBL[s] || s}</span></td><td class="mono" style="font-size:13px">${st.lastOk[r.s] ? hm(st.lastOk[r.s]) : "–"}</td><td style="text-align:right">${r.check ? `<button class="btn small ghost" data-chk="${i}">Overiť</button>` : ""}<div class="note" id="chk-${i}" style="margin:6px 0 0"></div></td></tr>`;
    }).join("");
  }
  function bindConn() {
    $("#connBody").addEventListener("click", async e => {
      const i = e.target.dataset.chk; if (i == null) return;
      const r = CONN_ROWS[+i]; e.target.disabled = true;
      try { await r.check(); renderConnTable(); const n = $("#chk-" + i); if (n) n.textContent = "Funguje · " + hm(Date.now()); }
      catch (err) { renderConnTable(); const n = $("#chk-" + i); if (n) n.textContent = errText(err, r.s); }
    });
  }

  // ---------- náhľad a história ----------
  const EMO = { ":sunny:": "☀️", ":red_circle:": "🔴", ":large_yellow_circle:": "🟡", ":large_green_circle:": "🟢" };
  function slackHtml(txt) {
    return esc(txt).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|\n)_(.+?)_(?=\n|$)/g, "$1<i>$2</i>").replace(/:[a-z_]+:/g, m => EMO[m] || m);
  }
  function renderPreview() {
    const pv = $("#pv");
    if (st.pv === "fin") {
      if (!st.fin) { pv.innerHTML = `<div class="empty">Finančný brífing zatiaľ nie je vypočítaný. Kliknite na „Prepočítať bez odoslania“ alebo ho pošlite.</div>`; return; }
      $("#pvInfo").textContent = `${dataLabel()} · ${hm(st.finAt)} · finančný brífing · ${st.finTexts.ai ? "text napísala AI" : "pravidlový text (" + (st.finWhy || "AI neodpovedala") + ")"} · ${st.finDay.label}`;
      pv.innerHTML = FIN.emailPreview(st.fin, st.finTexts, st.finDay);
      return;
    }
    if (!st.brief) { if (st.pv !== "fin" && pv.querySelector(".empty")) pv.innerHTML = `<div class="empty">Kliknite na „Prepočítať bez odoslania“ alebo pošlite brífing.</div>`; return; }
    $("#pvInfo").textContent = `${dataLabel()} · ${hm(st.dataAt)} · ${st.texts.ai ? "text napísala AI" : "pravidlový text (" + (st.aiWhy || "AI neodpovedala") + ")"} · ${st.brief.dayLabel}`;
    if (st.pv === "email") pv.innerHTML = FM.emailPreview(st.brief, st.texts);
    else pv.innerHTML = `<div class="slackpv"><div class="who"><div class="av">FM</div><div><span class="nm">First Mate</span><span class="app">APP</span> <span class="note">${hm(st.briefAt)}</span></div></div>${slackHtml(FM.slackText(st.brief, st.texts))}</div>`;
  }
  function renderLog() {
    const b = $("#logBody");
    if (!st.log.length) { b.innerHTML = `<tr><td colspan="3" class="note">Zatiaľ nič neodišlo.</td></tr>`; return; }
    b.innerHTML = st.log.map(l => { const lp = FM.localParts(l.at); return `<tr><td class="mono" style="font-size:13px">${FM.dm(lp.date)} ${lp.hm}</td><td>${esc(l.kanal)}</td><td>${esc(l.sprava)}</td></tr>`; }).join("");
  }

  // ---------- potvrdenie, koncept, kopírovanie ----------
  function confirmSend(title, rows) {
    return new Promise(res => {
      const ov = $("#cfOv"); $("#cfTitle").textContent = title;
      $("#cfList").innerHTML = rows.map(([k, v]) => `<li><span class="lbl">${esc(k)}</span><span>${esc(v)}</span></li>`).join("");
      const warn = st.src && st.src.kind !== "vlastne" ? "Posielate východiskové dáta z balíka. Zmeny, ktoré First Mate zapísal do priečinka, v nich nie sú. Ak chcete aktuálny stav, zrušte a nahrajte dáta z priečinka First Mate." : "";
      $("#cfWarn").innerHTML = warn ? `<div class="msg warn">${esc(warn)}</div>` : "";
      ov.classList.remove("hidden"); $("#cfYes").focus();
      const done = v => { ov.classList.add("hidden"); $("#cfYes").onclick = $("#cfNo").onclick = ov.onclick = null; document.removeEventListener("keydown", key); res(v); };
      const key = e => { if (e.key === "Escape") done(false); };
      $("#cfYes").onclick = () => done(true); $("#cfNo").onclick = () => done(false);
      ov.onclick = e => { if (e.target === ov) done(false); };
      document.addEventListener("keydown", key, { signal });
    });
  }
  async function copyText(text, btn) {
    const old = btn.textContent;
    try { await navigator.clipboard.writeText(text); btn.textContent = "Skopírované"; }
    catch (e) { const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand("copy"); } catch (e2) { } document.body.removeChild(ta); btn.textContent = ok ? "Skopírované" : "Označte a Ctrl+C"; }
    setTimeout(() => { btn.textContent = old; }, 1800);
  }
  function offerDraft() {
    const m = st.lastMail; if (!m || !NASTAVENIA.email) return;
    const em = EMAIL, canDraft = !!(em && em.koncept && em.koncept.nastroj);
    const box = document.createElement("div");
    box.innerHTML = `<div class="msg warn"><b>E-mail neodišiel.</b> ${canDraft ? "Môžete uložiť koncept do svojej pošty a odoslať ho sami, alebo " : "Môžete "}skopírovať text a vložiť ho do nového e-mailu (adresy: ${esc(m.to.join(", "))}).
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">${canDraft ? `<button class="btn small" data-a="draft" type="button">Uložiť ako koncept</button>` : ""}<button class="btn small ghost" data-a="text" type="button">Kopírovať text</button><button class="btn small ghost" data-a="subj" type="button">Kopírovať predmet</button></div><div data-a="msg"></div></div>`;
    const host = $("#runMsg"); if (host) host.appendChild(box);
    box.addEventListener("click", async e => {
      const a = e.target.dataset && e.target.dataset.a; if (!a) return;
      if (a === "text") return copyText(m.text, e.target);
      if (a === "subj") return copyText(m.subject, e.target);
      if (a === "draft") {
        e.target.disabled = true; const out = box.querySelector('[data-a="msg"]');
        try { await call(em.server, em.koncept.nastroj, fillTpl(em.koncept.argumenty, mailVars(m.to, m.subject, m.text, m.html)), { write: true }); out.innerHTML = `<div class="msg">Koncept je uložený vo vašej pošte. Odošlite ho odtiaľ.</div>`; addLog("Koncept e-mailu · " + m.to.join(", "), m.subject); }
        catch (err) { out.innerHTML = `<div class="msg warn">${esc(errText(err, em.sluzba, true))}</div>`; e.target.disabled = false; }
      }
    });
  }

  // ---------- 08 čo vyskúšať (tipy a checklist) ----------
  const TP = { tips: null, check: {}, store: "local" };
  const TLS = "first-mate-panel:checklist" + (T.id === "developer" ? "" : ":" + T.id), DOC_TIPS = T.db + "/checklist";
  const tlsGet = () => { try { const v = localStorage.getItem(TLS); return v ? JSON.parse(v) : null; } catch (e) { return null; } };
  const tlsSet = v => { try { localStorage.setItem(TLS, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const lvlName = id => (TP.tips.urovne.find(u => u.id === id) || {}).nazov || id;
  const temaName = id => (TP.tips.temy.find(u => u.id === id) || {}).nazov || id;
  const isDone = id => !!(TP.check[id] && TP.check[id].done);
  function tipCard(t, i) {
    const c = TP.check[t.id] || {};
    return `<article class="t-tip ${c.done ? "done" : ""}">
      <div class="t-top"><h4>${esc(t.nazov)}</h4><span class="lbl">${String(i + 1).padStart(2, "0")}</span></div>
      <div class="t-tags"><span class="t-tag">${esc(temaName(t.tema))}</span>${t.meni_data ? `<span class="t-tag write">Mení dáta · vyžaduje potvrdenie</span>` : ""}</div>
      <div class="t-q"><code>${esc(t.otazka)}</code><button type="button" data-copy="${esc(t.id)}">Kopírovať</button></div>
      <div class="t-where"><b>Kde</b>${esc(TP.tips.miesta[t.kde] || t.kde)}</div>
      <p class="t-what">${esc(t.co_urobi)}</p>
      <div class="t-foot"><label class="t-chk" for="ck-${esc(t.id)}"><input type="checkbox" id="ck-${esc(t.id)}" data-done="${esc(t.id)}" ${c.done ? "checked" : ""}> Vyskúšané</label><span class="saved">${c.done && c.at ? esc(FM.dm(FM.localParts(c.at).date)) : ""}</span></div>
      <label class="lbl" for="nt-${esc(t.id)}">Poznámka (nepovinná)</label>
      <textarea id="nt-${esc(t.id)}" data-note="${esc(t.id)}" rows="2" placeholder="Čo vám First Mate odpovedal, čo chcete vyskúšať inak…">${esc(c.note || "")}</textarea>
    </article>`;
  }
  function renderTips() {
    if (!TP.tips) return;
    const TT = TP.tips.tipy, n = TT.length, done = TT.filter(t => isDone(t.id)).length;
    $("#tipCount").textContent = `${n} tipov`;
    $("#progV").innerHTML = `${done} <small>z ${n}</small>`;
    $("#progBar").style.width = (n ? done / n * 100 : 0) + "%";
    $("#progLvls").innerHTML = TP.tips.urovne.map(u => { const all = TT.filter(t => t.uroven === u.id); return `<span>${esc(u.nazov)} <b>${all.filter(t => isDone(t.id)).length}/${all.length}</b></span>`; }).join("");
    const pool = TT.filter(t => !isDone(t.id)), day = Math.floor(Date.now() / 864e5), tod = pool.length ? pool[day % pool.length] : null;
    $("#tod").innerHTML = tod ? `<div class="kicker"><b>Tip dňa</b>&nbsp;&nbsp;${esc(lvlName(tod.uroven))} · ${esc(temaName(tod.tema))}</div><h3>${esc(tod.nazov)}</h3>
      <div class="t-q"><code>${esc(tod.otazka)}</code><button type="button" data-copy="${esc(tod.id)}">Kopírovať</button></div>
      <p class="t-what" style="margin-top:10px"><b class="lbl" style="margin-right:6px">Kde</b>${esc(TP.tips.miesta[tod.kde] || tod.kde)} · ${esc(tod.co_urobi)}</p>`
      : `<div class="kicker"><b>Hotovo</b></div><h3>Vyskúšali ste všetky tipy.</h3><p class="t-what">Nové tipy pribudnú s ďalšou verziou First Mate.</p>`;
    const fs = $("#fStav").value, fu = $("#fUroven").value, ft = $("#fTema").value;
    const vis = TT.filter(t => (fs === "vsetky" || (fs === "ano") === isDone(t.id)) && (!fu || t.uroven === fu) && (!ft || t.tema === ft));
    $("#fInfo").textContent = vis.length === n ? "" : `Zobrazených ${vis.length} z ${n}.`;
    let html = "";
    TP.tips.urovne.forEach(u => {
      const list = vis.filter(t => t.uroven === u.id); if (!list.length) return;
      const all = TT.filter(t => t.uroven === u.id);
      html += `<div class="t-lvlh"><h3>${esc(u.nazov)}</h3><span class="lbl">${all.filter(t => isDone(t.id)).length} z ${all.length} vyskúšaných</span></div><div class="t-tips">${list.map(t => tipCard(t, TT.indexOf(t))).join("")}</div>`;
    });
    $("#tipList").innerHTML = html || `<p class="note">Filtru nevyhovuje žiadny tip.</p>`;
  }
  let tipTimer = null;
  function saveTips() {
    clearTimeout(tipTimer);
    tipTimer = setTimeout(async () => {
      tlsSet({ items: TP.check });
      if (db) { try { await db.doc(DOC_TIPS).set(clone({ items: TP.check })); } catch (e) { $("#storeInfo").textContent = "Stav sa nepodarilo uložiť do panela, ostáva len v tomto prehliadači."; } }
    }, 600);
  }
  function tipStoreSentence() {
    $("#storeInfo").textContent = TP.store === "db"
      ? "Odškrtnuté tipy a poznámky sa ukladajú v tomto paneli vo vašom účte Claude, uvidíte ich aj na inom počítači."
      : "Odškrtnuté tipy a poznámky sa ukladajú len v tomto prehliadači na tomto počítači. Na inom zariadení ich neuvidíte.";
  }
  async function initTips() {
    if (!$("#v-tipy") || !$('#nav a[data-v="tipy"]')) return;
    // tipy z katalógu use casov (druh tip) pre tento typ, v pôvodnom poradí
    try {
      const [katalog] = await nacitajKatalog();
      const tipy = katalog.usecases.filter(u => u.druh === "tip" && (u.typy || []).includes(T.id));
      TP.tips = { urovne: katalog.urovne, temy: katalog.temy, miesta: katalog.miesta, tipy };
    } catch (e) { $("#tipList").innerHTML = `<div class="msg warn">Tipy sa nepodarilo načítať (katalóg use casov).</div>`; return; }
    $("#fUroven").innerHTML += TP.tips.urovne.map(u => `<option value="${esc(u.id)}">${esc(u.nazov)}</option>`).join("");
    $("#fTema").innerHTML += TP.tips.temy.map(u => `<option value="${esc(u.id)}">${esc(u.nazov)}</option>`).join("");
    TP.check = (tlsGet() || {}).items || {}; renderTips(); tipStoreSentence();
    const onCopy = e => { const b = e.target.closest("[data-copy]"); if (!b) return; const t = TP.tips.tipy.find(x => x.id === b.dataset.copy); if (t) copyText(t.otazka, b); };
    $("#tipList").addEventListener("click", onCopy); $("#tod").addEventListener("click", onCopy);
    $("#tipList").addEventListener("change", e => { const id = e.target.dataset.done; if (!id) return; TP.check[id] = { ...(TP.check[id] || {}), done: e.target.checked, at: e.target.checked ? Date.now() : null }; saveTips(); renderTips(); });
    $("#tipList").addEventListener("input", e => { const id = e.target.dataset.note; if (!id) return; TP.check[id] = { ...(TP.check[id] || {}), note: e.target.value.slice(0, 2000) }; saveTips(); });
    ["#fStav", "#fUroven", "#fTema"].forEach(s => $(s).addEventListener("change", renderTips));
  }
  async function loadTipsState() {
    if (!TP.tips) return;
    if (!db) { tipStoreSentence(); return; }
    TP.store = "db";
    try { const s = await withTimeout(db.doc(DOC_TIPS).get(), 10000); if (s.exists) { TP.check = { ...TP.check, ...((s.data() || {}).items || {}) }; renderTips(); } }
    catch (e) { TP.store = "local"; }
    tipStoreSentence();
  }
  // ---------- štart ----------
  function renderAll() {
    const lp = FM.localParts(Date.now());
    $("#today").textContent = `${FM.WDL[lp.wd]} ${FM.dm(lp.date)} ${lp.date.slice(0, 4)}`;
    $("#emailTo").value = S.email; $("#finTo").value = S.finEmail;
    renderTeam(); renderSignals(); renderSchedule(); renderConn(); renderLog(); renderProjects();
  }
  function bind() {
    $("#btnSlack").addEventListener("click", sendSlack);
    $("#btnEmail").addEventListener("click", sendEmail);
    $("#emailTo").addEventListener("input", e => { e.target.classList.remove("err"); $("#emailErr").classList.add("hidden"); });
    $("#btnRecalc").addEventListener("click", recalc);
    $$(".tabs2 button").forEach(b => b.addEventListener("click", () => { st.pv = b.dataset.pv; $$(".tabs2 button").forEach(x => x.classList.toggle("on", x === b)); renderPreview(); }));
    bindDataBar(); bindProjects(); bindFinance(); bindTeam(); bindSignals(); bindSources(); bindCustom(); bindSchedule(); bindConn();
  }

  // ---------- štart ----------
  function renderAll() {
    const lp = FM.localParts(Date.now());
    $("#today").textContent = `${FM.WDL[lp.wd]} ${FM.dm(lp.date)} ${lp.date.slice(0, 4)}`;
    $("#emailTo").value = S.email; if (DEV) $("#finTo").value = S.finEmail;
    renderTeam(); renderSignals(); renderSchedule(); renderConn(); renderLog(); if (DEV) renderProjects();
  }
  function bind() {
    $("#btnSlack").addEventListener("click", sendSlack);
    $("#btnEmail").addEventListener("click", sendEmail);
    $("#emailTo").addEventListener("input", e => { e.target.classList.remove("err"); $("#emailErr").classList.add("hidden"); });
    $("#btnRecalc").addEventListener("click", recalc);
    $$(".tabs2 button").forEach(b => b.addEventListener("click", () => { st.pv = b.dataset.pv; $$(".tabs2 button").forEach(x => x.classList.toggle("on", x === b)); renderPreview(); }));
    bindDataBar(); if (DEV) { bindProjects(); bindFinance(); } bindTeam(); bindSignals(); if (DEV) { bindSources(); bindCustom(); } bindSchedule(); bindConn();
  }
  async function boot() {
    TYP = await pripravTyp(T);
    if (TYP.farba) koren.style.setProperty("--typ", TYP.farba);
    route(); bind(); renderAll(); initTips();
    try { lock(true); await loadData(null); updateSignalNow(); $(DEV ? "#btnLoadProj" : "#btnLoad").textContent = `Načítané ${hm(st.dataAt)} · obnoviť`; }
    catch (e) { $(DEV ? "#projInfo" : "#sigSaved").textContent = errText(e, "Dáta"); }
    finally { lock(false); }
    const C = window.claude;
    if (!C || typeof C.use !== "function") { st.capsReady = true; SERVERS.forEach(s => st.conn[s] = "na"); renderConn(); return; }
    const [d, m, s] = await Promise.all([C.use("db"), C.use("mcp"), C.use("sample")].map(p => Promise.resolve(p).catch(() => null)));
    db = d; mcp = m; sample = s; st.capsReady = true;
    if (db) await loadSettings();
    renderAll(); await loadTipsState();
    await refreshConn();
    if (st.data) { if (DEV) renderProjects(); updateSignalNow(); }
  }
  boot();
})();
}

await nacitajNastavenia();
spusti(zvolTyp());

