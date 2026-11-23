// First Mate · aplikácia panela (ES modul). Vygenerované z legacy/panel-developer (docs/migracia/nastroje/rozdel_rozhranie.mjs, 2026-11-24), odvtedy sa upravuje ručne.
import FMCSV from "./jadro/csv.js";
import { zostavSignaly } from "./jadro/signaly.js";
import FM, { CSV } from "./typy/developer.js";
import FIN from "./financie/fin.js";

// koreň repozitára (alebo zverejneného artefaktu) s data/ a usecases/
const KOREN = (document.querySelector('meta[name="fm-koren"]') || {}).content ?? "../";
const TYP_ID = "developer";
let TYP = { id: TYP_ID, data_dir: "data/developer/" };
async function nacitajKatalog() {
  const [katalog, typy] = await Promise.all(["usecases/usecases.json", "usecases/typy.json"].map((p) => fetch(KOREN + p, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error(`Katalóg ${p} sa nepodarilo načítať (${r.status}).`);
    return r.json();
  })));
  TYP = typy.typy.find((t) => t.id === TYP_ID) || TYP;
  CSV.dir = KOREN + TYP.data_dir;
  FM.nastavSignaly(zostavSignaly(TYP_ID, katalog, typy, "signaly"));
  FIN.nastavSignaly(zostavSignaly(TYP_ID, katalog, typy, "financne_signaly"));
}

// dialóg Architektúra
(function(){
  var ov=document.getElementById('dsOv'),op=document.getElementById('dsOpen'),cl=document.getElementById('dsClose');
  if(!ov||!op)return;
  function show(){ov.classList.remove('hidden');cl.focus();}
  function hide(){ov.classList.add('hidden');op.focus();}
  op.addEventListener('click',show);
  cl.addEventListener('click',hide);
  ov.addEventListener('click',function(e){if(e.target===ov)hide();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!ov.classList.contains('hidden'))hide();});
})();

(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = FM.esc;
  const clone = o => JSON.parse(JSON.stringify(o));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const hm = ms => FM.localParts(ms).hm;
  const SERVERS = ["Slack", "Gmail"];
  const DOC_SETTINGS = "fmdev/settings", DOC_LOG = "fmdev/log";

  let S = mergeSettings({});
  let db = null, mcp = null, sample = null;
  const st = { data: null, dataAt: 0, brief: null, texts: null, briefAt: 0, briefSig: "", running: false, log: [], conn: {}, lastOk: {}, pv: "email", capsReady: false, fin: null, finTexts: null, finAt: 0, finSig: "", finDay: null, finWhy: null };

  // ---------- routing ----------
  const VIEWS = ["brifing", "projekty", "financie", "tim", "signaly", "rozvrh", "architektura"];
  function route() {
    const h = (location.hash || "").slice(1);
    const v = VIEWS.includes(h) ? h : "brifing";
    $$(".view").forEach(e => e.classList.toggle("on", e.id === "v-" + v));
    $$("#nav a").forEach(a => a.classList.toggle("on", a.dataset.v === v));
  }
  window.addEventListener("hashchange", route);

  // ---------- nastavenia (db) ----------
  function mergeSettings(d) {
    const D = FM.DEFAULTS, g = d.signals || {};
    const sig = {}; FM.KEYS.forEach(k => sig[k] = { ...D.signals[k], ...(g[k] || {}) });
    FIN.KEYS.forEach(k => sig[k] = { ...FIN.DEFAULTS[k], ...(g[k] || {}) });
    sig.custom = Array.isArray(g.custom) ? g.custom : [];
    return {
      ...clone(D), ...d, signals: sig,
      schedule: { ...D.schedule, ...(d.schedule || {}) },
      automation: { ...D.automation, ...(d.automation || {}) },
      team: Array.isArray(d.team) && d.team.length ? d.team : clone(D.team),
      email: d.email || D.email,
      finEmail: d.finEmail || D.finEmail
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
    const data = CSV.toData(raw);
    data.fin = FIN.normalize(raw);
    data.finMissing = missing;
    data.warn = errs;
    return data;
  }
  function dataLabel() {
    if (!st.src) return "Dáta: CSV · nenačítané";
    if (st.src.kind === "vlastne") return `Dáta: vlastné CSV · ${st.src.names.length} ${st.src.names.length === 1 ? "súbor" : (st.src.names.length < 5 ? "súbory" : "súborov")}`;
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
      if (!target) { errs.push(`Súbor „${esc(f.name)}“ nepoznám. Panel čaká ${want.map(w => "„" + w + "“").join(", ")}, voliteľne finančné ${optional.map(w => "„" + w + "“").join(", ")}.`); continue; }
      if (t.includes(String.fromCharCode(0xFFFD))) errs.push(`${esc(f.name)}: niektoré znaky sa nedajú prečítať. Uložte súbor v kódovaní UTF-8 (v Exceli „CSV UTF-8“).`);
      texts[target] = t; names.push(target);
    }
    const miss = want.filter(w => !texts[w]);
    if (miss.length) errs.unshift(`${miss.length === 1 ? "Chýba súbor" : "Chýbajú súbory"} ${miss.map(w => "„" + w + "“").join(", ")}. Vyberte naraz všetky ${want.length} súbory predaja (a voliteľne ${optional.length} finančných).`);
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
      try { await reloadFromSrc(); const fm = st.data.finMissing || []; dbMsg(`Načítané vlastné dáta: ${u.names.join(", ")}. Sú len v pamäti tohto okna, nikam sa neukladajú; po obnovení stránky sa vráti ukážka.` + (fm.length ? ` Finančné súbory chýbajú (${fm.join(", ")}), sekcia Financie a finančný brífing budú ${fm.length === optional_count() ? "prázdne" : "neúplné"}.` : "")); }
      catch (err) { st.src = prev; dbMsg("Súbory sa nepodarilo spracovať: " + esc(err.message || err), true); await reloadFromSrc(); }
    });
    $("#dbReset").addEventListener("click", async () => { st.src = null; st.shift = true; dbMsg(""); await loadData(null); updateSignalNow(); });
  }
  const optional_count = () => Object.keys(CSV.optional || {}).length;
  async function reloadFromSrc() {
    st.data = buildData(); st.dataAt = Date.now(); st.brief = null; st.texts = null; st.briefAt = 0; st.fin = null; st.finTexts = null; st.finAt = 0;
    renderDataBar(); afterData();
  }
  function afterData() { renderProjects(); updateSignalNow(); renderFinance(); const pv = $("#pvInfo"); if (pv && !st.brief) pv.textContent = "Dáta sa zmenili. Kliknite na „Prepočítať bez odoslania“."; }

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
    const LBL = { wait: "čaká", active: "beží", done: "hotovo", err: "chyba", skip: "použité", warn: "náhradný text" };
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
  function summaryLine(b) {
    const p = [];
    b.projekty.forEach(x => p.push(`${x.kod} ${FM.fmtPct(x.soldPct)}`));
    if (b.s2.on && b.s2.count) p.push(`zálohy ${FM.eur(b.s2.suma)}`);
    if (b.s3.on) p.push(`${b.s3.count} rezerv.`);
    if (b.s4.on) p.push(`${b.s4.count} bez reakcie`);
    if (b.s7.on) p.push(`${b.s7.count} ležiaky`);
    return p.join(" · ");
  }
  async function loadData(R, i) {
    R && R.set(i, "active", "Načítavam CSV…");
    if (!st.src) await loadDemoCsv(step => R && R.set(i, "active", step + "…"));
    st.data = buildData();
    st.dataAt = Date.now();
    renderDataBar();
    const c = st.data.counts;
    const fc = st.data.fin && st.data.fin.available ? st.data.fin.counts : null;
    R && R.set(i, "done", `${c.projekty} projekty, ${c.jednotky} jednotiek, ${c.dopyty} dopytov` + (fc ? `, ${fc.tranze} tranží, ${fc.rozpocet} položiek rozpočtu` : ""));
    renderProjects(); renderFinance();
  }
  async function ensureBrief(force, R) {
    const sig = JSON.stringify([...FM.KEYS.map(k => S.signals[k]), S.signals.custom]);
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
      R.set(3, "active", to);
      const b = st.brief, t = st.texts;
      await call("Gmail", "send_message", { to: [to], subject: FM.emailSubject(b, t), body: FM.emailText(b, t), htmlBody: FM.emailHtml(b, t) }, { write: true });
      R.set(3, "done", `Odoslané na ${to} o ${hm(Date.now())}`);
      R.msg(`E-mail odišiel na <b>${esc(to)}</b>. Predmet: ${esc(FM.emailSubject(b, t))}`);
      addLog("E-mail · " + to, t.podnadpis);
    } catch (e) { R.fail(errText(e, R.active === 3 ? "Gmail" : "Dáta", R.active === 3)); }
    finally { lock(false); }
  }
  async function recalc() {
    if (st.running) return; lock(true);
    const R = makeRun($("#run"), $("#steps"), $("#runTitle"), "Prepočet bez odoslania", [...BRIEF_STEPS, "AI napíše finančný brífing"]);
    try {
      await ensureBrief(true, R);
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
      R.set(3, "active", to);
      const f = st.fin, t = st.finTexts, day = st.finDay;
      await call("Gmail", "send_message", { to: [to], subject: FIN.emailSubject(f, t, day), body: FIN.emailText(f, t, day), htmlBody: FIN.emailHtml(f, t, day) }, { write: true });
      R.set(3, "done", `Odoslané na ${to} o ${hm(Date.now())}`);
      R.msg(`Finančný brífing odišiel na <b>${esc(to)}</b>. Predmet: ${esc(FIN.emailSubject(f, t, day))}`);
      st.pv = "fin"; $$(".tabs2 button").forEach(x => x.classList.toggle("on", x.dataset.pv === "fin")); renderPreview();
      addLog("Financie · " + to, t.podnadpis);
    } catch (e) { R.fail(errText(e, R.active === 3 ? "Gmail" : "Dáta", R.active === 3)); }
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
      const scope = m.rozsah === "financie" ? "financie" : (m.rozsah === "svoje" && m.predajca ? "svoje" : "cely");
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
        R.set(2, "active", "AI píše osobné brífingy predajcov…");
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
      let sent = 0;
      for (let i = 0; i < ok.length; i++) {
        const r = ok[i], idx = BRIEF_STEPS.length + i;
        R.set(idx, "active", r.email);
        try {
          if (r.scope === "cely") {
            await call("Gmail", "send_message", { to: [r.email], subject: FM.emailSubject(b, t), body: FM.emailText(b, t), htmlBody: FM.emailHtml(b, t) }, { write: true });
          } else if (r.scope === "financie") {
            if (finErr) throw finErr;
            const f = st.fin, ft = st.finTexts, day = st.finDay;
            await call("Gmail", "send_message", { to: [r.email], subject: FIN.emailSubject(f, ft, day), body: FIN.emailText(f, ft, day), htmlBody: FIN.emailHtml(f, ft, day) }, { write: true });
          } else {
            const p0 = personal[r.predajca];
            const fb = FM.personalFallback(b, r.predajca);
            const p = (p0 && typeof p0.veta === "string" && Array.isArray(p0.kroky) && p0.kroky.length) ? { veta: p0.veta, kroky: p0.kroky.slice(0, 3).map(String) } : fb;
            const pe = FM.personalEmail(b, r, p);
            await call("Gmail", "send_message", { to: [r.email], subject: pe.subject, body: pe.text, htmlBody: pe.html }, { write: true });
          }
          sent++; R.set(idx, "done", `${r.email} · ${hm(Date.now())}`);
        } catch (e) { R.set(idx, "err", errText(e, "Gmail", true)); }
      }
      R.msg(`Odoslané ${sent} z ${ok.length} e-mailov.` + (rc.length > ok.length ? ` ${rc.length - ok.length} adries som preskočil (neplatné alebo fiktívne).` : ""), sent < ok.length);
      if (sent) addLog(`Tím · ${sent} ${sent === 1 ? "e-mail" : (sent < 5 ? "e-maily" : "e-mailov")}`, t.podnadpis);
    } catch (e) { R.fail(errText(e, "Dáta")); }
    finally { lock(false); }
  }
  function renderTeam() {
    const opt = (v, cur, label) => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(label || v)}</option>`;
    $("#team").innerHTML = `<div class="trow head"><span class="lbl">Meno</span><span class="lbl">Rola</span><span class="lbl">Predajca v dátach</span><span class="lbl">E-mail</span><span class="lbl">Dostáva</span><span class="lbl">Posielať</span><span></span></div>` +
      S.team.map((m, i) => `<div class="trow" data-i="${i}">
        <input type="text" data-k="meno" value="${esc(m.meno)}" placeholder="Meno" aria-label="Meno">
        <select data-k="rola" aria-label="Rola">${opt("riaditel", m.rola, "Riaditeľ predaja")}${opt("vedenie", m.rola, "Majiteľ / financie")}${opt("predajca", m.rola, "Predajca")}</select>
        <select data-k="predajca" aria-label="Predajca v dátach">${opt("", m.predajca, "—")}${FM.PREDAJCOVIA.map(x => opt(x, m.predajca)).join("")}</select>
        <input type="email" data-k="email" value="${esc(m.email)}" placeholder="e-mail" aria-label="E-mail" class="${m.email && FM.validEmail(m.email) ? "err" : ""}" title="${esc(m.email ? (FM.validEmail(m.email) || "") : "")}">
        <select data-k="rozsah" aria-label="Dostáva">${opt("cely", m.rozsah, "Celý brífing")}${opt("svoje", m.rozsah, "Len svoje")}${opt("financie", m.rozsah, "Finančný brífing")}</select>
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
      if (k === "rola" && m.rola !== "predajca") { m.rozsah = m.rola === "vedenie" ? "financie" : "cely"; renderTeam(); }
      if (k === "predajca" && m.predajca && m.rola === "predajca" && !m.meno) { m.meno = m.predajca; renderTeam(); }
      teamInfo(); save();
    });
    $("#team").addEventListener("change", e => { if (e.target.tagName === "SELECT" || e.target.type === "checkbox") e.target.dispatchEvent(new Event("input", { bubbles: true })); });
    $("#team").addEventListener("click", e => { const d = e.target.dataset.del; if (d == null) return; S.team.splice(+d, 1); renderTeam(); save(); });
    $("#addMember").addEventListener("click", () => { S.team.push({ id: "m" + Date.now(), meno: "", rola: "predajca", predajca: "", email: "", rozsah: "svoje", aktivny: true }); renderTeam(); save(); });
    $("#btnTeam").addEventListener("click", sendTeam);
  }

  // ---------- signály ----------
  const SIG = [
    { k: "s1", t: "Podmienka banky", d: "Banka pustí úver až pri určitom podiele predaných bytov. Signál stráži, koľko zmlúv chýba a koľko dní zostáva do termínu.", p: [["days", "Upozorniť dní pred termínom", 7, 365]] },
    { k: "s2", t: "Zálohy po splatnosti", d: "Zálohy kupujúcich podľa splátkového kalendára, ktoré nie sú uhradené. Bez nich sa zdrží čerpanie úveru a cash-flow stavby.", p: [["graceDays", "Tolerancia (dni po splatnosti)", 0, 60]] },
    { k: "s3", t: "Končiace rezervácie", d: "Rezervácie, ktoré čoskoro vypršia bez zmluvy o budúcej zmluve, aj tie, ktoré už vypršali a jednotka stále nie je voľná.", p: [["days", "Končí do (dni)", 1, 30]] },
    { k: "s4", t: "Dopyty bez reakcie", d: "Záujemca, ktorému sa nikto neozval dlhšie ako hranica. Ukáže aj vyťaženosť a rýchlosť jednotlivých predajcov.", p: [["hours", "Hranica (hodiny)", 1, 240]] },
    { k: "s5", t: "Obhliadky bez ďalšieho kroku", d: "Záujemca bol na obhliadke vzorového bytu alebo na predajnom mieste, ale nemá dohodnutý ďalší krok. Tu sa strácajú rezervácie.", p: [["days", "Od obhliadky aspoň (dni)", 1, 30]] },
    { k: "s6", t: "Klientske zmeny", d: "Blíži sa uzávierka zmien štandardu a niektorí kupujúci sa ešte nevyjadrili. Po uzávierke sa zmeny robiť nedajú alebo sú drahé.", p: [["days", "Uzávierka do (dni)", 1, 90]] },
    { k: "s7", t: "Ležiaky", d: "Voľné byty, ktoré si ľudia pozerajú, ale nikto o ne neprejavil záujem. Zároveň ukáže typy, ktoré sa už vypredali, ako podklad pre cenník a ďalšiu etapu.", p: [["minViews", "Min. zobrazení za 30 dní", 10, 5000], ["minDays", "V predaji aspoň (dni)", 0, 365]] },
    { k: "s8", t: "Obchodné priestory", d: "Obchodné priestory, ktoré sa dlho nepredali. Signál porovná, či záujemcovia chcú kúpu alebo nájom.", p: [["days", "V ponuke dlhšie ako (dni)", 30, 720]] }
  ];
  const FSIG = [
    { k: "f1", t: "Podmienky čerpania tranží", d: "Stráži všetky podmienky najbližších tranží naraz: predpredaj, krytie úveru po čerpaní, vlastný kapitál a potvrdenia technického dozoru. Ukáže, čo chýba, a koľko vlastných zdrojov by stálo neskoršie čerpanie.", p: [["days", "Upozorniť dní pred čerpaním", 7, 365]] },
    { k: "f2", t: "Krytie úveru zmluvami", d: "Hodnota podpísaných zmlúv (s DPH) voči čerpanému úveru a kovenantu banky. Ukáže aj, ako krytie klesne po najbližšej tranži.", p: [["buffer", "Rezerva nad kovenantom (%)", 0, 100]] },
    { k: "f3", t: "Potrebné tempo predaja", d: "Koľko zmlúv mesačne treba na podmienku banky, podmienky tranží a vypredanie do kolaudácie, oproti tempu posledných 90 dní. Odhadne, kedy sa cieľ pri dnešnom tempe naozaj splní.", p: [["pct", "Potrebné tempo vyššie o (%)", 0, 300]] },
    { k: "f4", t: "Rozpočet a rezerva", d: "Položky rozpočtu nad toleranciou, čerpanie rezervy oproti postupu stavby a či na dokončenie stačia prisľúbené vlastné zdroje.", p: [["tol", "Tolerancia položky (%)", 0, 50], ["rezPp", "Rezerva minutá rýchlejšie ako stavba o (p. b.)", 0, 100]] },
    { k: "f5", t: "IRR projektu a vlastného kapitálu", d: "Odhad výnosnosti z aktuálnych dát oproti biznis plánu a cieľu investorov. Rozloží zmenu IRR na vplyv predaja (tempo a ceny) a nákladov.", p: [["pp", "Pokles IRR projektu oproti plánu (p. b.)", 0, 20]] },
    { k: "f6", t: "Stres test", d: "Ako sa zmení IRR a zisk pri nižších cenách voľných jednotiek, vyšších nákladoch, neskoršej kolaudácii a vyššom úroku, aj všetko naraz. Upozorní, keď scenár padne pod cieľ alebo do straty.", p: [["cena", "Pokles cien (%)", 0, 50], ["naklady", "Rast nákladov (%)", 0, 50], ["mesiace", "Oneskorenie kolaudácie (mes.)", 0, 24], ["urok", "Rast úroku (p. b.)", 0, 10]] }
  ];

  // ---------- zdroje dát pre signály ----------
  const SRC = {
    s1: { z: [["CRM alebo cenník", "stav každej jednotky (voľná, rezervovaná, zmluva o budúcej zmluve, kúpna zmluva) a dátum zmeny"], ["Úverová zmluva", "požadovaný podiel predaných bytov a termín jeho splnenia"]], f: "dev_projekty.csv, dev_jednotky.csv" },
    s2: { z: [["Zmluvy s kupujúcimi alebo CRM", "splátkový kalendár: výška a splatnosť každej zálohy"], ["Účtovníctvo alebo výpis z banky", "úhrady záloh, ideálne z viazaného účtu na zálohy"]], f: "dev_jednotky.csv" },
    s3: { z: [["CRM", "rezervácie s dátumom platnosti, záujemca a predajca"], ["Rezervačné zmluvy", "ak sa neevidujú v CRM, aspoň dátum platnosti"]], f: "dev_jednotky.csv, dev_dopyty.csv" },
    s4: { z: [["CRM", "dopyty záujemcov s časom prijatia, časom prvej reakcie a predajcom"], ["Web projektu a realitné portály", "kontaktné formuláre, ak neprichádzajú priamo do CRM"], ["Spoločná e-mailová schránka", "ak sa dopyty vybavujú e-mailom mimo CRM"]], f: "dev_dopyty.csv" },
    s5: { z: [["CRM", "obhliadky, ich výsledok a dohodnutý ďalší krok"], ["Kalendár predajcov", "naplánované obhliadky a stretnutia (voliteľné)"]], f: "dev_dopyty.csv" },
    s6: { z: [["Harmonogram stavby alebo zmluva s dodávateľom", "termín uzávierky klientskych zmien"], ["Evidencia klientskych zmien alebo CRM", "stav pri každom kupujúcom (nevyjadril sa, v riešení, uzavreté)"]], f: "dev_projekty.csv, dev_jednotky.csv" },
    s7: { z: [["Cenník (CRM alebo Excel)", "voľné byty, ceny a dátum zaradenia do ponuky"], ["Realitné portály a analytika webu", "zobrazenia inzerátu za posledných 30 dní"], ["CRM", "dopyty a spätná väzba záujemcov"]], f: "dev_jednotky.csv, dev_dopyty.csv" },
    s8: { z: [["Cenník (CRM alebo Excel)", "obchodné priestory, ceny a dátum zaradenia do ponuky"], ["CRM", "dopyty s typom záujmu (kúpa alebo nájom) a spätnou väzbou"]], f: "dev_jednotky.csv, dev_dopyty.csv" },
    f1: { z: [["Úverová zmluva", "tranže, ich výška, plánované termíny a podmienky čerpania"], ["Výpis z úverového účtu", "ktoré tranže sú načerpané a kedy"], ["CRM alebo cenník", "predané byty a hodnota podpísaných zmlúv"], ["Účtovníctvo alebo výpis z banky", "doteraz vložený vlastný kapitál"], ["Technický dozor investora", "potvrdenia o postupe stavby a o rozpočte"]], f: "dev_uver.csv, dev_tranze.csv, dev_podmienky_cerpania.csv, dev_jednotky.csv, dev_projekty.csv" },
    f2: { z: [["Úverová zmluva", "kovenant: minimálne krytie úveru zmluvami"], ["Výpis z úverového účtu", "čerpaná suma úveru"], ["CRM alebo zmluvy s kupujúcimi", "hodnota podpísaných zmlúv o budúcej zmluve a kúpnych zmlúv"]], f: "dev_uver.csv, dev_tranze.csv, dev_jednotky.csv" },
    f3: { z: [["CRM", "dátumy podpisu zmlúv za posledné 3 mesiace a zostávajúce voľné byty"], ["Úverová zmluva", "požadovaný predpredaj pre banku a pre jednotlivé tranže s termínmi"], ["Harmonogram stavby", "termín kolaudácie"]], f: "dev_jednotky.csv, dev_projekty.csv, dev_tranze.csv, dev_podmienky_cerpania.csv" },
    f4: { z: [["Rozpočet projektu (controlling alebo štúdia uskutočniteľnosti)", "rozpočet po položkách vrátane rezervy"], ["Zmluvy s dodávateľmi", "zazmluvnené sumy"], ["Účtovníctvo", "vyfakturované náklady po položkách"], ["Stavbyvedúci alebo technický dozor investora", "percento dokončenia a odhad nákladov na dokončenie"], ["Dohoda so spoločníkmi alebo investormi", "prisľúbený a vložený vlastný kapitál"]], f: "dev_rozpocet.csv, dev_cashflow.csv, dev_projekty.csv" },
    f5: { z: [["Štúdia uskutočniteľnosti alebo biznis plán", "plánované peňažné toky po mesiacoch a cieľová výnosnosť investorov"], ["Účtovníctvo", "skutočné náklady po mesiacoch"], ["Rozpočet s odhadom na dokončenie", "koľko ešte stavba bude stáť"], ["CRM a cenník", "podpísané zmluvy, zálohy a ceny voľných jednotiek"], ["Zmluvy s kupujúcimi", "splátkový kalendár: záloha a doplatok pri kolaudácii"], ["Úverová zmluva", "úroková sadzba, tranže a splatnosť úveru"]], f: "dev_cashflow.csv, dev_rozpocet.csv, dev_uver.csv, dev_tranze.csv, dev_jednotky.csv, dev_projekty.csv" },
    f6: { z: [["Rovnaké zdroje ako výnosnosť (F5)", "štúdia uskutočniteľnosti, účtovníctvo, rozpočet, CRM, úverová zmluva"], ["Vedenie alebo investori", "aké zhoršenie cien, nákladov, termínov a úrokov sa má testovať"]], f: "rovnaké ako F5" }
  };
  const SRC_CUSTOM = { jednotky: { z: [["CRM alebo cenník", "údaje o jednotkách: stav, cena, predajca, zálohy, rezervácie"]], f: "dev_jednotky.csv" }, dopyty: { z: [["CRM", "dopyty záujemcov, obhliadky a ich výsledok"]], f: "dev_dopyty.csv" }, projekty: { z: [["CRM a úverová zmluva", "stav predaja projektu, plán a podmienka banky"]], f: "dev_projekty.csv, dev_jednotky.csv" } };
  const srcOpen = new Set();
  const SRC_ICON = `<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><ellipse cx="6" cy="2.5" rx="4.5" ry="1.8" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M1.5 2.5v7c0 1 2 1.8 4.5 1.8s4.5-.8 4.5-1.8v-7M1.5 6c0 1 2 1.8 4.5 1.8S10.5 7 10.5 6" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`;
  const srcBtn = k => `<button class="srcbtn${srcOpen.has(k) ? " on" : ""}" type="button" data-src="${esc(k)}" aria-expanded="${srcOpen.has(k)}" title="Odkiaľ pochádzajú dáta">${SRC_ICON}Zdroje</button>`;
  const srcBox = (k, d) => d ? `<div class="srcbox${srcOpen.has(k) ? "" : " hidden"}" id="src-${esc(k)}"><div class="lbl">Odkiaľ budú dáta</div><ul>${d.z.map(([a, b]) => `<li><b>${esc(a)}</b>: ${esc(b)}</li>`).join("")}</ul><div class="note" style="margin:6px 0 0">V ukážke: ${esc(d.f)}</div></div>` : "";
  function bindSources() {
    ["#sig", "#fsig"].forEach(id => $(id).addEventListener("click", e => {
      const b = e.target.closest("[data-src]"); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      const k = b.dataset.src, box = document.getElementById("src-" + k);
      if (srcOpen.has(k)) srcOpen.delete(k); else srcOpen.add(k);
      if (box) box.classList.toggle("hidden", !srcOpen.has(k));
      b.classList.toggle("on", srcOpen.has(k)); b.setAttribute("aria-expanded", srcOpen.has(k));
    }));
  }
  function renderSignals() {
    $("#fsig").innerHTML = FSIG.map((g, i) => `<div class="sg ${S.signals[g.k].on ? "" : "off"}" data-k="${g.k}">
      <div class="sg-top"><span class="lbl"><span class="blue">F${i + 1}</span> · finančný signál${srcBtn(g.k)}</span><label class="toggle"><span>${S.signals[g.k].on ? "zapnutý" : "vypnutý"}</span><input type="checkbox" data-on="${g.k}"${S.signals[g.k].on ? " checked" : ""}><span class="box"></span></label></div>
      <div class="sg-body"><h3>${esc(g.t)}</h3><p>${esc(g.d)}</p>${srcBox(g.k, SRC[g.k])}
      <div class="params">${g.p.map(([f, l, mn, mx]) => `<label><span class="lbl">${esc(l)}</span><input type="number" min="${mn}" max="${mx}" data-s="${g.k}" data-f="${f}" value="${S.signals[g.k][f]}"></label>`).join("")}</div>
      <div class="now"><span class="lbl">Dnes</span><span class="v" id="now-${g.k}">–</span><span class="note" id="nowd-${g.k}" style="margin:0"></span></div></div></div>`).join("");
    $("#sig").innerHTML = SIG.map((g, i) => `<div class="sg ${S.signals[g.k].on ? "" : "off"}" data-k="${g.k}">
      <div class="sg-top"><span class="lbl"><span class="blue">S${i + 1}</span> · signál${srcBtn(g.k)}</span><label class="toggle"><span>${S.signals[g.k].on ? "zapnutý" : "vypnutý"}</span><input type="checkbox" data-on="${g.k}"${S.signals[g.k].on ? " checked" : ""}><span class="box"></span></label></div>
      <div class="sg-body"><h3>${esc(g.t)}</h3><p>${esc(g.d)}</p>${srcBox(g.k, SRC[g.k])}
      <div class="params">${g.p.map(([f, l, mn, mx]) => `<label><span class="lbl">${esc(l)}</span><input type="number" min="${mn}" max="${mx}" data-s="${g.k}" data-f="${f}" value="${S.signals[g.k][f]}"></label>`).join("")}</div>
      <div class="now"><span class="lbl">Dnes</span><span class="v" id="now-${g.k}">–</span><span class="note" id="nowd-${g.k}" style="margin:0"></span></div></div></div>`).join("") +
      customList().map((r, i) => `<div class="sg ${r.on !== false ? "" : "off"}" data-cid="${esc(r.id)}">
      <div class="sg-top"><span class="lbl"><span class="blue">V${i + 1}</span> · vlastný signál<span class="tagc">${esc(FM.SOURCES[r.objekt] || "")}</span>${srcBtn("c_" + r.id)}</span><label class="toggle"><span>${r.on !== false ? "zapnutý" : "vypnutý"}</span><input type="checkbox" data-con="${esc(r.id)}"${r.on !== false ? " checked" : ""}><span class="box"></span></label></div>
      <div class="sg-body"><h3>${esc(r.nazov)}</h3>${r.popis ? `<p>${esc(r.popis)}</p>` : ""}${srcBox("c_" + r.id, SRC_CUSTOM[r.objekt])}
      <div class="rule">${esc(FM.describeRule(r))}</div>
      <div class="sg-acts"><button class="link" data-edit="${esc(r.id)}" type="button">Upraviť</button><button class="link" data-del="${esc(r.id)}" type="button">Odstrániť</button><span class="note" style="margin:0">${r.uroven === "red" ? "Konať dnes" : "Sledovať"}</span></div>
      <div class="now"><span class="lbl">Dnes</span><span class="v" id="now-c_${esc(r.id)}">–</span><span class="note" id="nowd-c_${esc(r.id)}" style="margin:0"></span></div></div></div>`).join("") +
      `<button class="sg sg-add" id="sgAdd" type="button"><span class="plus">+</span><b>Pridať signál</b><span class="note">Vlastné pravidlo nad jednotkami, dopytmi alebo projektmi. Opíšte ho slovami a AI navrhne podmienky.</span></button>`;
    updateSignalNow();
  }
  function updateSignalNow() {
    if (!$("#now-s1")) return;
    if (!st.data) { [...SIG.map(g => g.k), ...FSIG.map(g => g.k), ...customList().map(r => "c_" + r.id)].forEach(k => { const e = $("#now-" + k); if (e) { e.textContent = "–"; $("#nowd-" + k).textContent = "načítajte dáta"; } }); return; }
    const b = FM.compute(st.data, S.signals, Date.now());
    const set = (k, v, d, hl) => { const e = $("#now-" + k); e.textContent = v; e.classList.toggle("hl", !!hl); $("#nowd-" + k).textContent = d; };
    const r1 = b.s1.items.find(x => x.riziko);
    const PNAME = k => (st.data.projekty.find(p => p.kod === k || p.nazov === k) || {}).nazov || k;
    const TYP = { "Byt": "byt", "Obchodný priestor": "obchodný priestor", "Parkovacie státie": "parkovacie státie" };
    const UNIT = kod => { const j = st.data.jednotky.find(x => x.kod === kod); return `${TYP[j && j.typ] || "jednotka"} ${String(kod).replace(/^[A-Z]+-/, "").replace(/^(OP|PS)0*/, "č. ")}`; };
    const byProj = (items, fn) => { const g = {}; items.forEach(x => { const p = PNAME(x.projekt); (g[p] = g[p] || []).push(fn(x)); }); return Object.entries(g).map(([p, a]) => `${p}: ${a.join(", ")}`).join(" · "); };
    const people = arr => arr.map(x => `${x.predajca} ${x.n}`).join(", ");
    set("s1", String(b.s1.count), r1 ? `${r1.projekt}: predaných ${FM.fmtPct(r1.predanePct)} bytov, banka požaduje ${r1.cielPct} % do ${r1.terminDm}; ${FM.pl(r1.chyba, "chýba", "chýbajú", "chýba")} ${r1.chyba} ${FM.pl(r1.chyba, "zmluva", "zmluvy", "zmlúv")}, do termínu ${r1.dni} ${FM.pl(r1.dni, "deň", "dni", "dní")}` : (b.s1.items.length ? "podmienka banky ešte nie je splnená, ale do termínu je dosť času" : "podmienky bánk sú splnené"), b.s1.count > 0);
    set("s2", String(b.s2.count), b.s2.count ? `spolu ${FM.eur(b.s2.suma)}; ` + byProj(b.s2.items, x => `${UNIT(x.jednotka)} ${FM.eur(x.suma)} (splatná ${x.splatna}, predajca ${x.predajca})`) : "všetky splatné zálohy sú uhradené", b.s2.count > 0);
    set("s3", String(b.s3.count), b.s3.count ? byProj(b.s3.items, x => `${UNIT(x.jednotka)} (${x.vyprsala ? "rezervácia vypršala " + x.do : "rezervácia končí " + x.do})`) : "žiadna rezervácia čoskoro nekončí", b.s3.vyprsane > 0);
    set("s4", String(b.s4.count), b.s4.byPredajca.length ? `počet záujemcov bez reakcie podľa predajcu: ${people(b.s4.byPredajca)}` : "na všetkých záujemcov niekto zareagoval", b.s4.count > 0);
    set("s5", String(b.s5.count), b.s5.byPredajca.length ? `záujemcovia po obhliadke bez dohodnutého ďalšieho kroku podľa predajcu: ${people(b.s5.byPredajca)}` : "po každej obhliadke je dohodnutý ďalší krok", false);
    set("s6", String(b.s6.count), b.s6.items.length ? b.s6.items.map(x => `${x.projekt}: uzávierka klientskych zmien ${x.uzavierka}, nevyjadrili sa kupujúci ${x.jednotky.length} ${FM.pl(x.jednotky.length, "jednotky", "jednotiek", "jednotiek")}`).join(" · ") : "žiadna uzávierka klientskych zmien sa neblíži", false);
    set("s7", String(b.s7.count), b.s7.count ? byProj(b.s7.items, x => `${UNIT(x.jednotka)} (${x.zobrazenia30} zobrazení za 30 dní, žiadny dopyt)`) : "žiadny voľný byt nestojí bez záujmu", false);
    set("s8", String(b.s8.count), b.s8.count ? byProj(b.s8.items, x => `${UNIT(x.jednotka)} v ponuke ${x.dniVPonuke} dní, ${x.najom} ${FM.pl(x.najom, "záujemca", "záujemcovia", "záujemcov")} o nájom, ${x.kupa} o kúpu`) : "žiadny obchodný priestor nie je v ponuke príliš dlho", false);
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
    $("#sigSaved").title = `${dataLabel()} · načítané ${hm(st.dataAt)}`;
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
    $("#btnAddSig").addEventListener("click", () => openCustom(null));
    $("#sigFilter").addEventListener("click", e => {
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
      const v = parseInt(e.target.value, 10); if (!(v >= 0)) return;
      S.signals[k][f] = v; updateSignalNow(); save();
    });
    $("#sig").addEventListener("change", e => { if (e.target.type === "checkbox") e.target.dispatchEvent(new Event("input", { bubbles: true })); });
    $("#fsig").addEventListener("input", e => {
      const k = e.target.dataset.s, fld = e.target.dataset.f, on = e.target.dataset.on;
      if (on) { S.signals[on].on = e.target.checked; renderSignals(); save(); return; }
      if (!k || !fld) return;
      const v = parseInt(e.target.value, 10); if (!(v >= 0)) return;
      S.signals[k][fld] = v; updateSignalNow(); save();
    });
    $("#fsig").addEventListener("change", e => { if (e.target.type === "checkbox") e.target.dispatchEvent(new Event("input", { bubbles: true })); });
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
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#csOv").classList.contains("hidden")) closeCustom(); });
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
    $("#days").innerHTML = DAYS.map(([n, l]) => `<button type="button" data-d="${n}" class="${S.schedule.days.includes(n) ? "on" : ""}">${l}</button>`).join("");
    $("#time").value = S.schedule.time;
    $("#chSlack").checked = !!S.schedule.slack; $("#chEmail").checked = !!S.schedule.email; $("#chTeam").checked = !!S.schedule.team; $("#chFin").checked = !!S.schedule.fin;
    $("#chEmailAddr").textContent = S.email; $("#chFinAddr").textContent = S.finEmail;
    const nx = nextRun();
    const ch = [S.schedule.slack && "Slack", S.schedule.email && "e-mail", S.schedule.team && "osobné brífingy tímu", S.schedule.fin && "finančný brífing"].filter(Boolean);
    $("#autoText").innerHTML = (S.automation.active
      ? `<b>Zapnuté.</b> Naplánovaná úloha v Claude si pred každým odoslaním prečíta toto nastavenie.`
      : `<b>Zatiaľ nezapnuté.</b> Nastavenie sa ukladá. Ranné odosielanie podľa neho spustí naplánovaná úloha v Claude, keď sa zapne.`) +
      `<div class="note">${nx && ch.length ? `Najbližší termín podľa nastavenia: <b>${esc(nx)}</b> · ${esc(ch.join(", "))}` : "Vyberte aspoň jeden deň a kanál."}</div>`;
  }
  function bindSchedule() {
    $("#days").addEventListener("click", e => { const d = e.target.dataset.d; if (d == null) return; const n = +d; const a = S.schedule.days; const i = a.indexOf(n); i >= 0 ? a.splice(i, 1) : a.push(n); renderSchedule(); save(); });
    $("#time").addEventListener("change", e => { if (/^\d\d:\d\d$/.test(e.target.value)) { S.schedule.time = e.target.value; renderSchedule(); save(); } });
    [["#chSlack", "slack"], ["#chEmail", "email"], ["#chTeam", "team"], ["#chFin", "fin"]].forEach(([id, k]) => $(id).addEventListener("change", e => { S.schedule[k] = e.target.checked; renderSchedule(); save(); }));
  }
  const CONN_ROWS = [
    { s: "Slack", use: "Doručenie do #first-mate-developer", check: () => call("Slack", "slack_read_channel", { channel_id: FM.SLACK_CHANNEL, limit: 1 }) },
    { s: "Gmail", use: "Doručenie e-mailov", check: null },
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
  async function boot() {
    await nacitajKatalog();
    route(); bind(); renderAll();
    try { lock(true); await loadData(null); updateSignalNow(); $("#btnLoadProj").textContent = `Načítané ${hm(st.dataAt)} · obnoviť`; }
    catch (e) { $("#projInfo").textContent = errText(e, "Dáta"); }
    finally { lock(false); }
    const C = window.claude;
    if (!C || typeof C.use !== "function") { st.capsReady = true; SERVERS.forEach(s => st.conn[s] = "na"); renderConn(); return; }
    const [d, m, s] = await Promise.all([C.use("db"), C.use("mcp"), C.use("sample")].map(p => Promise.resolve(p).catch(() => null)));
    db = d; mcp = m; sample = s; st.capsReady = true;
    if (db) await loadSettings();
    renderAll();
    await refreshConn();
    if (st.data) { renderProjects(); updateSignalNow(); }
  }
  boot();
})();

