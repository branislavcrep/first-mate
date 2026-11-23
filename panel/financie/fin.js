// First Mate · finančný model developera (úver, tranže, rozpočet, cash-flow, IRR, stres test)
// Vygenerované z legacy/ (docs/migracia/nastroje/rozdel_legacy.mjs, 2026-11-24), odvtedy sa upravuje ručne.
import FM from "../typy/developer.js";

const FIN = (() => {
  const KEYS = ["f1", "f2", "f3", "f4", "f5", "f6"];
  const DEFAULTS = { f1: { on: true, days: 60 }, f2: { on: true, buffer: 10 }, f3: { on: true, pct: 30 }, f4: { on: true, tol: 5, rezPp: 10 }, f5: { on: true, pp: 2 }, f6: { on: true, cena: 5, naklady: 5, mesiace: 3, urok: 1 } };
  const SOLD = ["Zmluva o budúcej", "Kúpna zmluva", "Odovzdaná"];
  const BIN = 365.25 / 12, DMS = 864e5;
  const A = e => (e && (e.attributes || e.values)) || e || {};
  const n = v => (v == null || v === "" ? null : (typeof v === "number" ? v : (isNaN(Number(String(v).replace(",", "."))) ? null : Number(String(v).replace(",", ".")))));
  const s = v => (v == null ? "" : String(v));
  const ds = v => { const m = s(v).match(/\d{4}-\d{2}-\d{2}/); return m ? m[0] : null; };
  const days = (a, b) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / DMS);
  const addD = (a, k) => new Date(Date.parse(a + "T12:00:00Z") + k * DMS).toISOString().slice(0, 10);
  const binOf = (date, today) => Math.floor(days(today, date) / BIN);
  const add = (fl, b, v) => { fl[b] = (fl[b] || 0) + v; };

  // ---------- načítanie ----------
  function normalize(raw) {
    const rows = k => (raw[k] || []).map(A);
    const proj = {};
    rows("projekty").forEach(a => { const kod = s(a.kod || a.id); if (!kod) return; proj[kod] = {
      kod, nazov: s(a.nazov), dph: n(a.dph_pct), zalohaPct: n(a.zaloha_pct), zalohaMilnik: ds(a.zaloha_milnik), cielIrr: n(a.cielove_irr_vk_pct),
      vkPlan: n(a.vlastny_kapital_plan_eur), vkVlozeny: n(a.vlastny_kapital_vlozeny_eur) }; });
    const uver = rows("uver").map(a => ({ id: s(a.id), projekt: s(a.projekt_id), banka: s(a.banka), typ: s(a.typ), limit: n(a.limit_eur), urok: n(a.urok_pct), splatnost: ds(a.splatnost), kovenant: n(a.kovenant_krytie_x) })).filter(u => u.id);
    const tranze = rows("tranze").map(a => ({ id: s(a.id), uver: s(a.uver_id), projekt: s(a.projekt_id), poradie: n(a.poradie) || 0, suma: n(a.suma_eur) || 0, plan: ds(a.planovane_cerpanie), stav: s(a.stav), datum: ds(a.datum_cerpania), ucel: s(a.ucel) })).filter(t => t.id).sort((x, y) => x.poradie - y.poradie);
    const podmienky = rows("podmienky").map(a => ({ id: s(a.id), tranza: s(a.tranza_id), typ: s(a.typ), popis: s(a.popis), ciel: n(a.ciel), splnene: s(a.splnene).toLowerCase(), zodpovedny: s(a.zodpovedny) })).filter(c => c.id);
    const rozpocet = rows("rozpocet").map(a => ({ id: s(a.id), projekt: s(a.projekt_id), polozka: s(a.polozka), skupina: s(a.skupina), rozpocet: n(a.rozpocet_eur) || 0, zazmluvnene: n(a.zazmluvnene_eur), vyfakturovane: n(a.vyfakturovane_eur), dokoncenie: n(a.dokoncenie_pct), odhad: n(a.odhad_na_dokoncenie_eur), dodavatel: s(a.dodavatel), aktualizovane: ds(a.aktualizovane) })).filter(r => r.id);
    const cashflow = rows("cashflow").map(a => ({ id: s(a.id), projekt: s(a.projekt_id), rozpocet: s(a.rozpocet_id), polozka: s(a.polozka), typ: s(a.typ), mesiac: ds(a.mesiac), plan: n(a.plan_eur) || 0, skut: n(a.skutocnost_eur) })).filter(c => c.id && c.mesiac);
    const available = uver.length > 0 || rozpocet.length > 0;
    return { proj, uver, tranze, podmienky, rozpocet, cashflow, available, counts: { uver: uver.length, tranze: tranze.length, podmienky: podmienky.length, rozpocet: rozpocet.length, cashflow: cashflow.length } };
  }

  // ---------- IRR ----------
  function irr(fl) {
    const ks = Object.keys(fl).map(Number); if (!ks.length) return null;
    const b0 = Math.min(...ks), b1 = Math.max(...ks);
    const arr = []; for (let b = b0; b <= b1; b++) arr.push(fl[b] || 0);
    if (!(arr.some(x => x < 0) && arr.some(x => x > 0))) return null;
    const npv = r => arr.reduce((acc, x, i) => acc + x / Math.pow(1 + r, i), 0);
    let lo = -0.99, hi = 1.0, flo = npv(lo), fhi = npv(hi);
    if (flo * fhi > 0) return null;
    for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2, fm = npv(mid); if (flo * fm <= 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; } }
    return Math.pow(1 + (lo + hi) / 2, 12) - 1;
  }

  // ---------- model projektu (rovnaké pravidlá ako referenčný Python) ----------
  function model(ctx, today, sc, tranzeOverride) {
    sc = sc || {};
    const { P, F, J } = ctx;
    const dph = (F.dph || 0) / 100;
    const kol = addD(P.kolaudacia, Math.trunc((sc.delay_m || 0) * BIN));
    const kolBin = binOf(addD(kol, 30), today);
    const zalPct = (F.zalohaPct || 10) / 100;
    const milnik = F.zalohaMilnik || today;
    const milBin = binOf(milnik, today);
    const byty = J.filter(j => j.typ === "Byt");
    const sold90 = byty.filter(j => SOLD.includes(j.stav) && j.zmena && days(j.zmena, today) >= 0 && days(j.zmena, today) <= 90).length;
    const tempo = sold90 ? sold90 / 3 : 0.5;
    const R = ctx.R, CF = ctx.CF;
    const cfBin = c => binOf(addD(c.mesiac, 14), today);
    const costBp = {}, revBp = {};
    CF.forEach(c => { if (c.typ === "Náklad") add(costBp, cfBin(c), c.plan || 0); else add(revBp, cfBin(c), c.plan || 0); });
    const costOd = {};
    const nonres = R.filter(r => r.skupina !== "Rezerva");
    const overrun = nonres.reduce((acc, r) => acc + ((r.odhad != null ? r.odhad : r.rozpocet) - r.rozpocet), 0);
    R.forEach(r => {
      const rows = CF.filter(c => c.rozpocet === r.id);
      const act = rows.filter(c => c.skut != null), fut = rows.filter(c => c.skut == null);
      act.forEach(c => add(costOd, cfBin(c), c.skut));
      const spent = act.reduce((acc, c) => acc + c.skut, 0);
      let remaining = r.skupina === "Rezerva" ? Math.max(0, r.rozpocet - Math.max(0, overrun)) : Math.max(0, (r.odhad != null ? r.odhad : r.rozpocet) - spent);
      remaining *= 1 + (sc.cost_pct || 0) / 100;
      const ws = fut.reduce((acc, c) => acc + (c.plan || 0), 0);
      if (remaining <= 0) return;
      if (ws > 0) fut.forEach(c => add(costOd, Math.max(0, cfBin(c)), remaining * (c.plan || 0) / ws));
      else add(costOd, 0, remaining);
    });
    const revOd = {};
    const net = x => x / (1 + dph);
    let zmluvy = 0;
    J.forEach(j => {
      const cena = j.cena || 0;
      if (!SOLD.includes(j.stav)) return;
      zmluvy += cena;
      let zal = j.zaloha, zb;
      if (zal == null) { zal = zalPct * cena; zb = Math.max(0, milBin); }
      else { const spl = j.zalohaSplatna || milnik; zb = j.zalohaUhradena === "Áno" ? binOf(spl, today) : Math.max(0, binOf(spl, today)); }
      add(revOd, zb, net(zal));
      add(revOd, Math.max(kolBin, 0), net(cena - zal));
    });
    const priceK = 1 + (sc.price_pct || 0) / 100;
    const sale = (t, value) => { if (t >= kolBin) add(revOd, t, net(value)); else { add(revOd, Math.max(t, milBin), net(zalPct * value)); add(revOd, kolBin, net((1 - zalPct) * value)); } };
    J.filter(j => j.stav === "Rezervovaná").forEach(j => sale(0, (j.cena || 0) * priceK));
    const free = J.filter(j => j.stav === "Voľná");
    const freeByty = free.filter(j => j.typ === "Byt").length;
    const freeVal = free.reduce((acc, j) => acc + (j.cena || 0), 0) * priceK;
    const months = freeByty ? freeByty / tempo : (freeVal ? 1 : 0);
    if (freeVal) { const cnt = Math.ceil(months - 1e-9); for (let t = 0; t < cnt; t++) sale(t, Math.min(1, months - t) / months * freeVal); }
    // úver
    const U = ctx.U, T = tranzeOverride || ctx.T;
    const rate = ((U ? U.urok || 0 : 0) + (sc.rate_pp || 0)) / 100;
    const matBin = U && U.splatnost ? binOf(U.splatnost, today) : null;
    const draws = mode => { const o = {}; T.forEach(t => { if (t.stav === "Načerpaná") add(o, binOf(t.datum || t.plan, today), t.suma); else { let b = binOf(t.plan, today); if (mode === "odhad") b = Math.max(0, b); add(o, b, t.suma); } }); return o; };
    function waterfall(cost, rev, dr, kb) {
      const bins = [...Object.keys(cost), ...Object.keys(rev), ...Object.keys(dr)].map(Number).concat([kb]);
      if (matBin != null) bins.push(matBin);
      const b0 = Math.min(...bins), b1 = Math.max(...bins);
      let cash = 0, bal = 0, interest = 0; const eq = {}, unlev = {};
      for (let b = b0; b <= b1; b++) {
        const u = (rev[b] || 0) - (cost[b] || 0); unlev[b] = u;
        const i = bal * rate / 12; interest += i;
        bal += dr[b] || 0;
        cash += u + (dr[b] || 0) - i;
        if (b >= kb && bal > 0 && cash > 0) { const rp = Math.min(bal, cash); bal -= rp; cash -= rp; }
        if (matBin != null && b >= matBin && bal > 0) { cash -= bal; bal = 0; }
        if (cash < 0) { eq[b] = cash; cash = 0; }
        else if (bal <= 1e-6 && b >= kb && cash > 0) { eq[b] = cash; cash = 0; }
      }
      if (cash) add(eq, b1, cash);
      const sum = o => Object.values(o).reduce((x, y) => x + y, 0);
      const negSum = (o, f) => -Object.entries(o).filter(([b, v]) => v < 0 && (!f || f(+b))).reduce((x, [, v]) => x + v, 0);
      return { irrP: irr(unlev), irrVk: irr(eq), interest, zisk: sum(rev) - sum(cost) - interest, vkDoDnes: negSum(eq, b => b < 0), vkSpolu: negSum(eq), revSum: sum(rev), costSum: sum(cost) };
    }
    const kbBp = binOf(addD(P.kolaudacia, 30), today);
    return { bp: waterfall(costBp, revBp, draws("bp"), kbBp), odhad: waterfall(costOd, revOd, draws("odhad"), kolBin), mix: waterfall(costBp, revOd, draws("odhad"), kolBin), tempo, sold90, zmluvy };
  }

  // ---------- výpočet signálov ----------
  const r1 = x => x == null ? null : Math.round(x * 1000) / 10;
  function compute(data, sig, today) {
    const fd = data.fin;
    const out = { available: !!(fd && fd.available), today, projekty: [] };
    sig = { ...DEFAULTS, ...(sig || {}) };
    KEYS.forEach(k => { out[k] = { on: !!(sig[k] && sig[k].on), items: [], count: 0, level: "green" }; });
    if (!out.available) return out;
    data.projekty.forEach(P => {
      const F = fd.proj[P.kod] || {};
      const J = data.jednotky.filter(j => j.projekt === P.nazov);
      const U = fd.uver.find(u => u.projekt === P.kod) || null;
      const T = fd.tranze.filter(t => U && t.uver === U.id);
      const ctx = { P, F, J, U, T, R: fd.rozpocet.filter(r => r.projekt === P.kod), CF: fd.cashflow.filter(c => c.projekt === P.kod) };
      const byty = J.filter(j => j.typ === "Byt");
      const sold = byty.filter(j => SOLD.includes(j.stav)).length;
      const soldPct = byty.length ? Math.round(sold / byty.length * 1000) / 10 : 0;
      const zmluvy = J.filter(j => SOLD.includes(j.stav)).reduce((acc, j) => acc + (j.cena || 0), 0);
      const unsold = byty.filter(j => j.stav === "Voľná" || j.stav === "Rezervovaná").map(j => j.cena || 0);
      const pavg = unsold.length ? unsold.reduce((x, y) => x + y, 0) / unsold.length : null;
      const base = model(ctx, today);
      const tempoReal = base.sold90 / 3, tempo = base.tempo;
      const cerp = T.filter(t => t.stav === "Načerpaná").reduce((acc, t) => acc + t.suma, 0);
      const vkVl = F.vkVlozeny || 0;
      const pr = { kod: P.kod, nazov: P.nazov, kolaudacia: P.kolaudacia, faza: P.faza, byty: byty.length, sold, soldPct, zmluvy, cerpane: cerp, tempo: Math.round(tempoReal * 100) / 100, sold90: base.sold90, uver: U, pavg, vkPlan: F.vkPlan, vkVlozeny: vkVl, ciel: F.cielIrr };
      // F1 tranže
      pr.tranze = T.map(t => {
        if (t.stav === "Načerpaná") return { id: t.id, poradie: t.poradie, suma: t.suma, stav: t.stav, datum: t.datum, plan: t.plan, ucel: t.ucel, cerpana: true, podmienky: [] };
        const dni = days(today, t.plan);
        const po = cerp + T.filter(x => x.stav !== "Načerpaná" && x.poradie <= t.poradie).reduce((acc, x) => acc + x.suma, 0);
        let units = 0;
        const conds = fd.podmienky.filter(c => c.tranza === t.id).map(c => {
          const o = { id: c.id, typ: c.typ, popis: c.popis, ciel: c.ciel, zodpovedny: c.zodpovedny };
          if (c.typ === "predpredaj_pct") { const ch = Math.max(0, Math.ceil(c.ciel / 100 * byty.length - 1e-9) - sold); Object.assign(o, { ok: soldPct >= c.ciel, hodnota: soldPct, chybaZmluv: ch }); units = Math.max(units, ch); }
          else if (c.typ === "krytie_x") { const v = zmluvy / po, che = Math.max(0, c.ciel * po - zmluvy), ch = che > 0 && pavg ? Math.ceil(che / pavg - 1e-9) : 0; Object.assign(o, { ok: v >= c.ciel - 1e-9, hodnota: Math.round(v * 100) / 100, chybaEur: Math.round(che), chybaZmluv: ch, cerpanePo: po }); units = Math.max(units, ch); }
          else if (c.typ === "vlastny_kapital_eur") Object.assign(o, { ok: vkVl >= c.ciel, hodnota: vkVl, chybaEur: Math.max(0, c.ciel - vkVl) });
          else o.ok = c.splnene === "ano";
          return o;
        });
        const unmet = conds.filter(c => !c.ok);
        const proj = units ? addD(today, Math.ceil(units / tempo * BIN)) : null;
        const delay = proj ? Math.max(0, days(t.plan, proj)) : 0;
        let dopad = 0;
        if (delay) { const T2 = T.map(x => x.id === t.id ? { ...x, plan: addD(x.plan, delay) } : x); dopad = Math.round(model(ctx, today, null, T2).odhad.vkSpolu - base.odhad.vkSpolu); }
        return { id: t.id, poradie: t.poradie, suma: t.suma, stav: t.stav, plan: t.plan, ucel: t.ucel, cerpana: false, dni, vOkne: dni <= sig.f1.days, podmienky: conds, nesplnene: unmet.length, projekcia: proj, oneskorenie: delay, dopadVk: dopad, cerpanePo: po };
      });
      // F2 krytie
      const nxt = T.find(t => t.stav !== "Načerpaná") || null;
      const kov = U ? U.kovenant : null;
      pr.krytie = { krytie: cerp ? Math.round(zmluvy / cerp * 100) / 100 : null, kovenant: kov, limit: U ? U.limit : null, krytieLimitu: U && U.limit ? Math.round(zmluvy / U.limit * 100) / 100 : null,
        dalsia: nxt ? nxt.id : null, dalsiaSuma: nxt ? nxt.suma : null, dalsiaPlan: nxt ? nxt.plan : null, poDalsej: nxt ? Math.round(zmluvy / (cerp + nxt.suma) * 100) / 100 : null,
        chybaPo: nxt && kov != null ? Math.round(Math.max(0, kov * (cerp + nxt.suma) - zmluvy)) : 0 };
      // F3 tempo
      const tg = [];
      if (P.bankaPct != null && P.bankaDo && P.bankaDo >= today) { const ch = Math.max(0, Math.ceil(P.bankaPct / 100 * byty.length - 1e-9) - sold); if (ch) tg.push({ typ: "banka", nazov: `podmienka banky ${P.bankaPct} %`, termin: P.bankaDo, chyba: ch }); }
      T.forEach(t => { if (t.stav === "Načerpaná" || t.plan < today) return; fd.podmienky.filter(c => c.tranza === t.id && c.typ === "predpredaj_pct").forEach(c => { const ch = Math.max(0, Math.ceil(c.ciel / 100 * byty.length - 1e-9) - sold); if (ch) tg.push({ typ: "tranza", nazov: `${c.ciel} % predaných bytov pre ${t.poradie}. tranžu`, tranza: t.id, termin: t.plan, chyba: ch }); }); });
      const left = byty.filter(j => j.stav === "Voľná" || j.stav === "Rezervovaná").length;
      if (left && P.kolaudacia && P.kolaudacia > today) tg.push({ typ: "vypredanie", nazov: "vypredanie do kolaudácie", termin: P.kolaudacia, chyba: left });
      pr.tempoCiele = tg.map(x => { const dd = days(today, x.termin), need = x.chyba / (dd / BIN); return { ...x, dni: dd, potrebne: Math.round(need * 100) / 100, pomer: tempoReal ? need / tempoReal : null, hit: need > tempoReal * (1 + sig.f3.pct / 100), projekcia: tempoReal ? addD(today, Math.ceil(x.chyba / tempoReal * BIN)) : null }; });
      // F4 rozpočet
      const R = ctx.R, nonres = R.filter(r => r.skupina !== "Rezerva");
      const rez = R.filter(r => r.skupina === "Rezerva").reduce((acc, r) => acc + r.rozpocet, 0);
      const eac = r => r.odhad != null ? r.odhad : r.rozpocet;
      const pouz = Math.max(0, nonres.reduce((acc, r) => acc + eac(r) - r.rozpocet, 0));
      const vys = R.filter(r => r.skupina === "Výstavba"), vysSum = vys.reduce((acc, r) => acc + r.rozpocet, 0);
      const dok = vysSum ? vys.reduce((acc, r) => acc + (r.dokoncenie || 0) * r.rozpocet, 0) / vysSum : 0;
      const ndd = nonres.reduce((acc, r) => acc + Math.max(0, eac(r) - (r.vyfakturovane || 0)), 0) + Math.max(0, rez - pouz);
      pr.rozpocet = { polozky: R.map(r => ({ ...r, eac: r.skupina === "Rezerva" ? null : eac(r), odchylka: r.skupina === "Rezerva" || !r.rozpocet ? null : Math.round((eac(r) / r.rozpocet - 1) * 1000) / 10 })),
        spolu: R.reduce((acc, r) => acc + r.rozpocet, 0), eacSpolu: nonres.reduce((acc, r) => acc + eac(r), 0) + Math.max(0, rez - pouz),
        rezerva: rez, pouzita: Math.round(pouz), pouzitaPct: rez ? Math.round(pouz / rez * 1000) / 10 : null, dokoncenie: Math.round(dok * 10) / 10,
        nakladyDoDokoncenia: Math.round(ndd), vkTreba: Math.round(base.odhad.vkSpolu - base.odhad.vkDoDnes), vkZostava: Math.round((F.vkPlan || 0) - vkVl) };
      pr.rozpocet.nadTol = pr.rozpocet.polozky.filter(x => x.odchylka != null && x.odchylka > sig.f4.tol);
      // F5 IRR
      pr.irr = { pBp: r1(base.bp.irrP), p: r1(base.odhad.irrP), vkBp: r1(base.bp.irrVk), vk: r1(base.odhad.irrVk), pMix: r1(base.mix.irrP), ziskBp: Math.round(base.bp.zisk), zisk: Math.round(base.odhad.zisk),
        naklady: Math.round(base.odhad.costSum), prijmy: Math.round(base.odhad.revSum), urokyOdhad: Math.round(base.odhad.interest), ciel: F.cielIrr };
      pr.irr.marza = pr.irr.naklady ? Math.round(pr.irr.zisk / pr.irr.naklady * 1000) / 10 : null;
      pr.irr.marzaBp = base.bp.costSum ? Math.round(base.bp.zisk / base.bp.costSum * 1000) / 10 : null;
      pr.irr.vplyvPredaja = pr.irr.pMix != null && pr.irr.pBp != null ? Math.round((pr.irr.pMix - pr.irr.pBp) * 10) / 10 : null;
      pr.irr.vplyvNakladov = pr.irr.p != null && pr.irr.pMix != null ? Math.round((pr.irr.p - pr.irr.pMix) * 10) / 10 : null;
      // F6 stres test
      const f6 = sig.f6;
      const SC = [["ceny", `Ceny voľných jednotiek −${f6.cena} %`, { price_pct: -f6.cena }], ["naklady", `Zostávajúce náklady +${f6.naklady} %`, { cost_pct: f6.naklady }], ["oneskorenie", `Kolaudácia o ${f6.mesiace} ${f6.mesiace === 1 ? "mesiac" : (f6.mesiace < 5 ? "mesiace" : "mesiacov")} neskôr`, { delay_m: f6.mesiace }], ["urok", `Úrok +${f6.urok} p. b.`, { rate_pp: f6.urok }], ["spolu", "Všetko naraz", { price_pct: -f6.cena, cost_pct: f6.naklady, delay_m: f6.mesiace, rate_pp: f6.urok }]];
      pr.stres = [{ k: "zaklad", nazov: "Aktuálny odhad", irrP: pr.irr.p, irrVk: pr.irr.vk, zisk: pr.irr.zisk }].concat(SC.map(([k, nazov, x]) => { const m = model(ctx, today, x).odhad; return { k, nazov, irrP: r1(m.irrP), irrVk: r1(m.irrVk), zisk: Math.round(m.zisk) }; }));
      out.projekty.push(pr);
    });
    // ---------- úrovne a položky signálov ----------
    const P = out.projekty;
    // finančné signály z katalógu (panel/usecases/<id>.js), poradie podľa usecases/typy.json
    const ctx = { out, days, P, sig };
    for (const [kluc, fn] of SIGNALY) fn({ ...ctx, kluc });
    return out;
  }
  const activeKeys = f => KEYS.filter(k => f[k] && f[k].on);

  // ---------- formátovanie ----------
  const pctS = x => x == null ? "–" : (Math.round(x * 10) / 10).toFixed(1).replace(".", ",") + " %";
  const xS = x => x == null ? "–" : x.toFixed(2).replace(".", ",") + "×";
  const eurM = v => v == null ? "–" : (Math.abs(v) >= 1e6 ? (Math.round(v / 1e4) / 100).toFixed(2).replace(".", ",") + " mil. €" : FM.eur(Math.round(v / 100) * 100));
  const num2 = x => x == null ? "–" : (Math.round(x * 100) / 100).toFixed(2).replace(".", ",").replace(/,?0+$/, "").replace(/,$/, "") || "0";
  const t1 = x => x == null ? "–" : String(Math.round(x * 10) / 10).replace(".", ",");
  const sgn = x => x == null ? "–" : (x > 0 ? "+" : (x < 0 ? "−" : "")) + String(Math.abs(Math.round(x * 10) / 10)).replace(".", ",");
  const zml = k => `${k} ${FM.pl(k, "zmluva", "zmluvy", "zmlúv")}`;
  function unmetText(c) {
    if (c.typ === "predpredaj_pct") return `predaných ${FM.fmtPct(c.hodnota)} bytov z požadovaných ${c.ciel} % (chýba ${zml(c.chybaZmluv)})`;
    if (c.typ === "krytie_x") return `krytie po čerpaní ${xS(c.hodnota)} z požadovaných ${xS(c.ciel)} (chýbajú zmluvy za ${FM.eur(c.chybaEur)}, zhruba ${c.chybaZmluv} ${FM.pl(c.chybaZmluv, "byt", "byty", "bytov")})`;
    if (c.typ === "vlastny_kapital_eur") return `vložený vlastný kapitál ${FM.eur(c.hodnota)} z ${FM.eur(c.ciel)}`;
    return `${c.popis.charAt(0).toLowerCase() + c.popis.slice(1)}${c.zodpovedny ? ` (${c.zodpovedny.toLowerCase()})` : ""}`;
  }
  function condShort(c) {
    if (c.typ === "predpredaj_pct") return `predaj ${FM.fmtPct(c.hodnota)} z ${c.ciel}\u00a0%`;
    if (c.typ === "krytie_x") return `krytie ${xS(c.hodnota)} z ${xS(c.ciel)}`;
    if (c.typ === "vlastny_kapital_eur") return `vlastný kapitál ${eurM(c.hodnota)} z ${eurM(c.ciel)}`;
    return c.popis;
  }
  function condState(c) {
    if (c.typ === "predpredaj_pct") return `${FM.fmtPct(c.hodnota)} z ${c.ciel} %`;
    if (c.typ === "krytie_x") return `${xS(c.hodnota)} z ${xS(c.ciel)}`;
    if (c.typ === "vlastny_kapital_eur") return `${eurM(c.hodnota)} z ${eurM(c.ciel)}`;
    return c.ok ? "splnené" : "nesplnené";
  }
  const FLAGTXT = (r, f) => f.typ === "rezerva" ? `rezerva ${FM.eur(r.rezerva)} je minutá na ${pctS(r.pouzitaPct)} (prekročenia položiek spolu ${FM.eur(r.pouzita)}) pri ${pctS(r.dokoncenie)} dokončenia stavby`
    : f.typ === "financovanie" ? `na dokončenie treba ešte ${FM.eur(r.vkTreba)} vlastných zdrojov, prisľúbených ostáva ${FM.eur(r.vkZostava)}`
    : `nad rozpočtom ${r.nadTol.map(x => `${x.polozka} ${sgn(x.odchylka)} %`).join(", ")}`;

  function headline(f, k) { return headline0(f, k).replace(/\.\.$/, "."); }
  function headline0(f, k) {
    const c = f[k];
    switch (k) {
      case "f1": return c.count ? `Tranže s nesplnenými podmienkami: ${c.items.map(t => `${t.id} ${FM.dm(t.plan)}`).join(", ")}.` : `Tranže do ${c.days} dní: podmienky splnené.`;
      case "f2": return `Krytie úveru zmluvami: ${c.all.map(x => `${x.projekt} ${xS(x.krytie)} (kovenant ${xS(x.kovenant)})`).join(", ")}.`;
      case "f3": return `Potrebné tempo predaja nad skutočným: ${c.count}.`;
      case "f4": return `Rozpočet a rezerva: ${c.count ? c.items.map(x => x.projekt).join(", ") : "v poriadku"}.`;
      case "f5": return `IRR vlastného kapitálu: ${c.all.map(x => `${x.projekt} ${pctS(x.vk)} (cieľ ${x.ciel} %)`).join(", ")}.`;
      case "f6": return `Stres test: ${c.count ? c.items.map(x => `${x.projekt} pod cieľom v ${x.podCielom.length} z ${x.scenare.length - 1} scenárov`).join(", ") : "všetky scenáre nad cieľom"}.`;
    }
    return "";
  }
  function fallbackTexts(f) {
    const t = {};
    const P = f.projekty;
    const f1r = f.f1.on && f.f1.items[0], f5r = f.f5.on && f.f5.items.find(x => x.level === "red"), f4r = f.f4.on && f.f4.items.find(x => x.level === "red");
    if (f1r && f.f1.level === "red") { t.nadpis = "Čerpanie tranže"; t.podnadpis = `${f1r.id}: ${f1r.nesplnene} ${FM.pl(f1r.nesplnene, "podmienka", "podmienky", "podmienok")} nesplnené`; }
    else if (f5r) { t.nadpis = "Výnosnosť pod cieľom"; t.podnadpis = `${f5r.projekt}: IRR ${pctS(f5r.vk)}`; }
    else if (f4r) { t.nadpis = "Rozpočet a rezerva"; t.podnadpis = `${f4r.projekt}: ${pctS(f4r.pouzitaPct)} rezervy`; }
    else if (f1r) { t.nadpis = "Čerpanie tranže"; t.podnadpis = `${f1r.id} o ${f1r.dni} dní`; }
    else { t.nadpis = "Financie v poriadku"; t.podnadpis = "bez naliehavých signálov"; }
    t.zhrnutie = P.map(p => `${p.kod}: čerpané ${eurM(p.cerpane)}${p.uver ? ` z ${eurM(p.uver.limit)}` : ""}, krytie zmluvami ${xS(p.krytie.krytie)}, IRR vlastného kapitálu ${pctS(p.irr.vk)} pri cieli ${p.irr.ciel} %.`).join(" ");
    t.f1 = f.f1.count ? f.f1.items.map(x => `${x.id} (${eurM(x.suma)}, ${FM.dmy(x.plan)}), nesplnené: ${x.podmienky.filter(c => !c.ok).map(unmetText).join("; ")}.` + (x.oneskorenie ? ` Pri dnešnom tempe predaja splníte podmienky predaja až ${FM.dmy(x.projekcia)}; posun čerpania o ${x.oneskorenie} dní by vyžadoval ďalších ${FM.eur(x.dopadVk)} vlastných zdrojov.` : "")).join(" ") : "Najbližšie tranže majú podmienky splnené.";
    t.f2 = f.f2.all.map(x => `${x.projekt}: zmluvy kryjú čerpaný úver ${xS(x.krytie)}, kovenant ${xS(x.kovenant)}.` + (x.poDalsej != null && x.poDalsej < x.kovenant ? ` Po čerpaní ${x.dalsia} by krytie kleslo na ${xS(x.poDalsej)}, chýbajú zmluvy za ${FM.eur(x.chybaPo)}.` : "")).join(" ");
    t.f3 = f.f3.count ? f.f3.items.map(x => `${x.projekt}, ${x.nazov} do ${FM.dmy(x.termin)}: treba ${zml(x.chyba)}, teda ${num2(x.potrebne)} mesačne; posledných 90 dní ${num2(x.tempo)} mesačne${x.projekcia ? `, pri tomto tempe až ${FM.dmy(x.projekcia)}` : ""}.`).join(" ") : "Tempo predaja stačí na podmienky banky aj na vypredanie do kolaudácie.";
    t.f4 = f.f4.count ? f.f4.items.map(x => `${x.projekt}: ${x.flags.map(fl => FLAGTXT(x, fl)).join("; ")}.`).join(" ") : "Položky rozpočtu sú v tolerancii a rezerva stačí.";
    t.f5 = f.f5.all.map(x => `${x.projekt}: IRR projektu ${pctS(x.p)} (plán ${pctS(x.pBp)}), vlastného kapitálu ${pctS(x.vk)} (plán ${pctS(x.vkBp)}); zmena oproti plánu z predaja ${sgn(x.vplyvPredaja)} p. b., z nákladov ${sgn(x.vplyvNakladov)} p. b.`).join(" ");
    t.f6 = f.f6.all.map(x => `${x.projekt}: najhorší scenár „${x.najhorsi.nazov}“ s IRR vlastného kapitálu ${pctS(x.najhorsi.irrVk)} a ziskom ${eurM(x.najhorsi.zisk)}.`).join(" ");
    const k = [];
    if (f.f1.on) f.f1.items.forEach(x => { const man = x.podmienky.filter(c => !c.ok && c.typ === "manualne"); const pred = x.podmienky.filter(c => !c.ok && (c.typ === "predpredaj_pct" || c.typ === "krytie_x"));
      if (pred.length) k.push(`${x.id}: do ${FM.dm(x.plan)} podpísať ${zml(Math.max(...pred.map(c => c.chybaZmluv || 0)))} o budúcej zmluve, prednostne z rezervácií.`);
      if (man.length) k.push(`${x.id}: zabezpečiť ${man.map(c => c.popis.charAt(0).toLowerCase() + c.popis.slice(1)).join(" a ")} do ${FM.dm(x.plan)}.`); });
    if (f.f4.on) f.f4.items.filter(x => x.level === "red").forEach(x => k.push(`${x.projekt}: preveriť prekročené položky rozpočtu s technickým dozorom a rozhodnúť, z čoho sa pokryje prekročenie rezervy.`));
    if (f.f5.on) f.f5.items.filter(x => x.level === "red").forEach(x => k.push(`${x.projekt}: pripraviť opatrenia na zrýchlenie predaja a prepočítať výnosnosť pre investorov.`));
    t.kroky = k.slice(0, 3);
    if (!t.kroky.length) t.kroky = ["Pokračovať podľa finančného plánu."];
    const z = f1r ? `${f1r.id} sa má čerpať ${FM.dmy(f1r.plan)}, nesplnené sú tieto podmienky: ${f1r.podmienky.filter(c => !c.ok).map(unmetText).join("; ")}.` : (f5r ? `${f5r.projekt} má odhad IRR vlastného kapitálu ${pctS(f5r.vk)}, cieľ je ${f5r.ciel} %.` : "Žiadny finančný signál dnes nevyžaduje okamžitú akciu.");
    t.zistenie = z;
    return t;
  }
  function facts(f, dayLong) {
    const o = { dnes: dayLong, metodika: "Čísla bez DPH (okrem krytia úveru a cien jednotiek, tie sú s DPH). IRR z mesačných peňažných tokov: skutočné náklady, plán zvyšku podľa odhadu na dokončenie, príjmy z podpísaných zmlúv a predaja zvyšku v tempe posledných 90 dní; úver čerpaný podľa tranží, splácaný z doplatkov po kolaudácii.",
      projekty: f.projekty.map(p => ({ projekt: p.nazov, kod: p.kod, faza: p.faza, kolaudacia: p.kolaudacia, banka: p.uver && p.uver.banka, limit_uveru_eur: p.uver && p.uver.limit, cerpane_eur: p.cerpane, zmluvy_s_dph_eur: p.zmluvy, predane_byty_pct: p.soldPct, tempo_predaja_bytov_mesacne: p.tempo,
        irr_projektu_pct: p.irr.p, irr_projektu_plan_pct: p.irr.pBp, irr_vk_pct: p.irr.vk, irr_vk_plan_pct: p.irr.vkBp, cielove_irr_vk_pct: p.irr.ciel, zisk_eur: p.irr.zisk, zisk_plan_eur: p.irr.ziskBp, marza_na_naklady_pct: p.irr.marza,
        zmena_irr_z_predaja_pb: p.irr.vplyvPredaja, zmena_irr_z_nakladov_pb: p.irr.vplyvNakladov })) };
    if (f.f1.on) o.f1_tranze = { upozornit_dni_pred: f.f1.days, tranze: f.f1.items.map(x => ({ tranza: x.id, projekt: x.projekt, suma_eur: x.suma, termin: x.plan, dni: x.dni, ucel: x.ucel, nesplnene: x.podmienky.filter(c => !c.ok).map(c => ({ popis: c.popis, stav: condState(c), chyba_zmluv: c.chybaZmluv, chyba_eur: c.chybaEur, zodpovedny: c.zodpovedny })), splnene: x.podmienky.filter(c => c.ok).map(c => c.popis), splnenie_pri_dnesnom_tempe: x.projekcia, oneskorenie_dni: x.oneskorenie, dalsi_vlastny_kapital_pri_oneskoreni_eur: x.dopadVk })) };
    if (f.f2.on) o.f2_krytie_uveru = f.f2.all.map(x => ({ projekt: x.projekt, krytie: x.krytie, kovenant: x.kovenant, dalsia_tranza: x.dalsia, krytie_po_dalsej_tranzi: x.poDalsej, chybajuce_zmluvy_po_dalsej_eur: x.chybaPo, uroven: x.level }));
    if (f.f3.on) o.f3_tempo_predaja = { hranica_pct: f.f3.pct, ciele: f.projekty.flatMap(p => p.tempoCiele.map(c => ({ projekt: p.kod, ciel: c.nazov, termin: c.termin, chyba_zmluv: c.chyba, potrebne_mesacne: c.potrebne, skutocne_mesacne: p.tempo, pri_dnesnom_tempe: c.projekcia, nestaci: c.hit }))) };
    if (f.f4.on) o.f4_rozpocet = f.projekty.map(p => ({ projekt: p.kod, rozpocet_eur: p.rozpocet.spolu, odhad_eur: Math.round(p.rozpocet.eacSpolu), nad_toleranciou: p.rozpocet.nadTol.map(x => ({ polozka: x.polozka, rozpocet_eur: x.rozpocet, odhad_eur: x.eac, odchylka_pct: x.odchylka, dodavatel: x.dodavatel })), rezerva_eur: p.rozpocet.rezerva, rezerva_pouzita_eur: p.rozpocet.pouzita, rezerva_pouzita_pct: p.rozpocet.pouzitaPct, dokoncenie_stavby_pct: p.rozpocet.dokoncenie, naklady_do_dokoncenia_eur: p.rozpocet.nakladyDoDokoncenia, vlastny_kapital_treba_eur: p.rozpocet.vkTreba, vlastny_kapital_prislubeny_zostava_eur: p.rozpocet.vkZostava }));
    if (f.f6.on) o.f6_stres_test = f.projekty.map(p => ({ projekt: p.kod, cielove_irr_vk_pct: p.ciel, scenare: p.stres.map(x => ({ scenar: x.nazov, irr_projektu_pct: x.irrP, irr_vk_pct: x.irrVk, zisk_eur: x.zisk })) }));
    return o;
  }
  function aiPrompt(f, dayLong) {
    const keys = activeKeys(f);
    return `Si First Mate, AI analytik developera rezidenčných projektov. Z faktov nižšie napíš texty ranného finančného brífingu pre majiteľa a finančného riaditeľa.

Pravidlá:
- Po slovensky, krátke vecné vety, tón skúseného finančného kolegu.
- Témy: úver a čerpanie tranží, podmienky banky, krytie úveru zmluvami, rozpočet a rezerva, výnosnosť (IRR, zisk), stres test. Predajcov spomínaj len vtedy, keď od nich závisí splnenie podmienky.
- Používaj IBA čísla, kódy a dátumy z faktov. Nič nevymýšľaj, nič neprepočítavaj inak než vo faktoch.
- Desatinná čiarka (19,8 %). Krytie úveru píš ako 1,39×. Sumy v eurách, veľké sumy môžeš v mil. € s dvoma desatinnými miestami.
- Nepoužívaj dlhé pomlčky ani pomlčky ako interpunkciu (znaky — a –) okrem názvov lokalít.
- Kroky musia byť konkrétne: čo, pri ktorej tranži alebo projekte, dokedy a kto (rola). Poradie podľa dopadu na peniaze: tranže a banka, rozpočet, výnosnosť.

Vráť IBA JSON objekt s kľúčmi:
- "nadpis": 2 až 3 slová, hlavná finančná téma dňa
- "podnadpis": krátky údaj k nadpisu, napr. „T-PL-4: chýbajú 2 podmienky“
- "zhrnutie": 2 až 3 vety o stave financovania a výnosnosti projektov
- "zistenie": 1 až 2 vety, najdôležitejšie zistenie dňa a prečo na ňom záleží
${keys.map(k => `- "${k}": 1 až 2 vety, čo signál ${k} znamená (koho sa týka, prečo je dôležitý); nezačínaj opakovaním čísla z nadpisu signálu`).join("\n")}
- "kroky": pole presne 3 krokov na dnes (každý jedna veta)

Fakty (JSON):
${JSON.stringify(facts(f, dayLong))}`;
  }
  function mergeTexts(ai, fb) {
    const t = { ...fb };
    if (ai && typeof ai === "object") {
      for (const k of ["nadpis", "podnadpis", "zhrnutie", "zistenie", ...KEYS]) if (typeof ai[k] === "string" && ai[k].trim()) t[k] = ai[k].trim();
      if (Array.isArray(ai.kroky) && ai.kroky.filter(x => typeof x === "string" && x.trim()).length >= 2) t.kroky = ai.kroky.filter(x => typeof x === "string" && x.trim()).slice(0, 3).map(x => x.trim());
      t.ai = true;
    }
    const clean = x => x.replace(/\s—\s/g, ", ").replace(/(?<!Bratislava)\s–\s/g, ", ").replace(/—/g, ",").replace(/\.\.(?=\s|$)/g, ".");
    for (const k of Object.keys(t)) if (typeof t[k] === "string") t[k] = clean(t[k]);
    t.kroky = t.kroky.map(clean);
    return t;
  }
  // ---------- e-mail ----------
  const FOOT = "Čísla vypočítal kód z CSV exportov (CRM, úver, rozpočet, cash-flow) v čase odoslania, interpretáciu napísala AI. IRR je odhad z modelu peňažných tokov, nie účtovný údaj. Ide o ukážkového developera, všetky údaje sú fiktívne.";
  function inner(f, t, day) {
    const X = FM.TPL, esc = FM.esc;
    let nn = 0; const N = () => "0" + (++nn);
    let h = X.header(`Finančný brífing &middot; ${esc(day.label)}&nbsp;${f.today.slice(0, 4)}`, "Dobré ráno", `Úver &middot; rozpočet &middot; výnosnosť &middot; ${f.projekty.length} ${FM.pl(f.projekty.length, "projekt", "projekty", "projektov")}`);
    const cells = [];
    f.projekty.forEach(p => { cells.push({ v: pctS(p.irr.vk), l: `${p.kod} IRR vlastného kapitálu · cieľ ${p.irr.ciel} %`, blue: p.irr.ciel != null && (p.irr.vk == null || p.irr.vk < p.irr.ciel) }); cells.push({ v: xS(p.krytie.krytie), l: `${p.kod} krytie úveru · kovenant ${xS(p.krytie.kovenant)}`, blue: (f.f2.items.find(x => x.projekt === p.kod) || {}).level === "red" }); });
    h += X.sec(X.secLabel(N(), "Peniaze a banka") + X.secHead(t.nadpis, t.podnadpis) + X.para(esc(X.nb(t.zhrnutie))) + X.bigNumbers(cells) +
      `<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0"><tr><td style="background:${X.C.sand};border-left:4px solid ${X.C.blue};padding:16px 18px;">${X.lbl("Najdôležitejšie zistenie", X.C.blue).replace("margin-bottom:4px", "margin-bottom:6px")}<div style="font-family:${X.F.sans};font-size:15px;line-height:23px;color:${X.C.ink};">${esc(X.nb(t.zistenie))}</div></td></tr></table>`);
    const items = activeKeys(f).map(k => [f[k].level, headline(f, k), t[k] || ""]);
    if (items.length) h += X.sec(X.secLabel(N(), "Finančné signály") + `<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0" style="border-top:2px solid ${X.C.ink};">` + items.map(([lv, hd, tx]) =>
      `<tr><td style="padding:14px 0 0 0;">${X.levelLabel(lv)}<div style="font-family:${X.F.sans};font-size:15px;line-height:23px;color:${X.C.ink};"><b>${esc(hd)}</b> ${esc(X.nb(tx))}</div></td></tr>`).join("") + `</table>`);
    const rows = [];
    const nw = v => `<span style="white-space:nowrap">${v}</span>`;
    f.projekty.forEach(p => p.tranze.filter(x => !x.cerpana && x.vOkne).forEach(x => rows.push(`<tr>${X.td(nw(esc(x.id)))}${X.td(nw(FM.dmy(x.plan)))}${X.td(esc(x.nesplnene ? x.podmienky.filter(c => !c.ok).map(condShort).join("; ") : "všetko splnené"))}${X.td(eurM(x.suma), { right: true, blue: x.nesplnene > 0 })}</tr>`)));
    if (rows.length) h += X.sec(X.secLabel(N(), "Najbližšie tranže") + X.table([["Tranža"], ["Termín"], ["Nesplnené"], ["Suma", true]], rows));
    const sr = [];
    f.projekty.forEach(p => p.stres.filter(x => ["zaklad", "spolu"].includes(x.k) || x === p.stres.slice(1).sort((a, b) => (a.irrVk ?? -99) - (b.irrVk ?? -99))[0]).forEach(x => sr.push(`<tr>${X.td(esc(p.kod))}${X.td(esc(x.nazov))}${X.td(pctS(x.irrP), { right: true })}${X.td(pctS(x.irrVk), { right: true, blue: p.ciel != null && (x.irrVk == null || x.irrVk < p.ciel) })}${X.td(eurM(x.zisk), { right: true })}</tr>`)));
    if (sr.length && f.f6.on) h += X.sec(X.secLabel(N(), "Výnosnosť a stres test") + X.table([["Projekt"], ["Scenár"], ["IRR projektu", true], ["IRR VK", true], ["Zisk", true]], sr));
    h += X.sec(X.secLabel(N(), "Čo urobiť dnes") + X.secHead(t.kroky.length === 1 ? "Jeden krok" : (t.kroky.length === 2 ? "Dva kroky" : "Tri kroky"), day.label) + X.stepsTable(t.kroky.map(X.nb)) +
      X.para(`Otázky k číslam? Otvorte Claude a napíšte <span style="font-family:${X.F.mono};font-size:14px;color:${X.C.blue};white-space:nowrap;">${FM.CMD}</span>.`, "margin:24px 0 0 0;"), true);
    return h;
  }
  const emailSubject = (f, t, day) => `First Mate · finančný brífing · ${day.label}: ${t.podnadpis}`;
  const emailHtml = (f, t, day) => FM.TPL.shell(`First Mate · finančný brífing · ${day.label}`, t.zistenie, inner(f, t, day), FOOT);
  const emailPreview = (f, t, day) => FM.TPL.card(t.zistenie, inner(f, t, day), FOOT);
  function emailText(f, t, day) {
    const L = [`FIRST MATE · FINANČNÝ BRÍFING · ${day.label}`, "", `${t.nadpis} / ${t.podnadpis}`, t.zhrnutie, "", `Najdôležitejšie zistenie: ${t.zistenie}`, "", "FINANČNÉ SIGNÁLY"];
    activeKeys(f).forEach(k => L.push(`- ${headline(f, k)} ${t[k] || ""}`));
    L.push("", "ČO UROBIŤ DNES", ...t.kroky.map((k, i) => `${i + 1}. ${k}`), "", FOOT);
    return L.join("\n").replace(/ /g, " ");
  }

  let SIGNALY = [];
  function nastavSignaly(z) { SIGNALY = z; }

  return { nastavSignaly, KEYS, DEFAULTS, SOLD, normalize, compute, model, irr, activeKeys, days, addD, BIN, headline, fallbackTexts, aiPrompt, mergeTexts, emailSubject, emailHtml, emailPreview, emailText, pctS, xS, eurM, num2, t1, sgn, condState, unmetText, FLAGTXT, FOOT };
})();

export default FIN;
