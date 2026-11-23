"""First Mate · referenčný finančný model (Python) pre overenie výpočtov panela.

Nezávislá implementácia rovnakých pravidiel ako JS v index.html (FIN.compute).
Vstup: CSV súbory z priečinka data/, dátum "dnes" (stav k referenčnému dátumu).
"""
import csv, math, datetime as dt, os, json, sys

SOLD = {"Zmluva o budúcej", "Kúpna zmluva", "Odovzdaná"}
BIN = 365.25 / 12


def rd(path):
    with open(path, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f, delimiter=";"))


def num(s):
    if s is None:
        return None
    s = str(s).strip().replace(" ", "").replace("\u00a0", "")
    if s == "":
        return None
    return float(s.replace(",", "."))


def d(s):
    return dt.date.fromisoformat(s[:10]) if s else None


def load(dirp):
    g = lambda n: rd(os.path.join(dirp, n)) if os.path.exists(os.path.join(dirp, n)) else []
    F = {"podmienky": "dev_podmienky_cerpania.csv"}
    return {k: g(F.get(k, f"dev_{k}.csv")) for k in ["projekty", "jednotky", "dopyty", "uver", "tranze", "podmienky", "rozpocet", "cashflow"]}


def days(a, b):
    return (b - a).days


def bin_of(date, today):
    return math.floor(days(today, date) / BIN)


def irr_monthly(flows):
    """flows: dict bin->amount. Vráti ročné IRR (desatinné) alebo None."""
    if not flows:
        return None
    b0, b1 = min(flows), max(flows)
    arr = [flows.get(b, 0.0) for b in range(b0, b1 + 1)]
    if not (any(x < 0 for x in arr) and any(x > 0 for x in arr)):
        return None
    npv = lambda r: sum(x / (1 + r) ** i for i, x in enumerate(arr))
    lo, hi = -0.99, 1.0
    flo, fhi = npv(lo), npv(hi)
    if flo * fhi > 0:
        return None
    for _ in range(200):
        mid = (lo + hi) / 2
        fm = npv(mid)
        if flo * fm <= 0:
            hi, fhi = mid, fm
        else:
            lo, flo = mid, fm
    r = (lo + hi) / 2
    return (1 + r) ** 12 - 1


def add(fl, b, v):
    fl[b] = fl.get(b, 0.0) + v


def project_model(D, P, today, sc=None):
    """Vráti model projektu: bp a odhad (+ scenár sc)."""
    sc = sc or {}
    pid = P["id"]
    dph = (num(P.get("dph_pct")) or 0) / 100
    kol = d(P["termin_kolaudacie"]) + dt.timedelta(days=int(sc.get("delay_m", 0) * BIN))
    kol_bin = bin_of(kol + dt.timedelta(days=30), today)
    zal_pct = (num(P.get("zaloha_pct")) or 10) / 100
    milnik = d(P.get("zaloha_milnik")) or today
    mil_bin = bin_of(milnik, today)

    J = [j for j in D["jednotky"] if j["projekt_id"] == pid]
    byty = [j for j in J if j["typ"] == "Byt"]
    # tempo: byty predané za posledných 90 dní
    sold90 = sum(1 for j in byty if j["stav"] in SOLD and j["datum_zmeny_stavu"] and 0 <= days(d(j["datum_zmeny_stavu"]), today) <= 90)
    tempo = sold90 / 3 if sold90 else 0.5

    R = [r for r in D["rozpocet"] if r["projekt_id"] == pid]
    CF = [c for c in D["cashflow"] if c["projekt_id"] == pid]
    cf_bin = lambda c: bin_of(d(c["mesiac"]) + dt.timedelta(days=14), today)

    # ---- náklady BP
    cost_bp = {}
    rev_bp = {}
    for c in CF:
        v = num(c["plan_eur"]) or 0
        if c["typ"] == "Náklad":
            add(cost_bp, cf_bin(c), v)
        else:
            add(rev_bp, cf_bin(c), v)
    # ---- náklady odhad
    cost_od = {}
    nonres = [r for r in R if r["skupina"] != "Rezerva"]
    overrun = sum((num(r["odhad_na_dokoncenie_eur"]) or num(r["rozpocet_eur"])) - num(r["rozpocet_eur"]) for r in nonres)
    for r in R:
        rows = [c for c in CF if c["rozpocet_id"] == r["id"]]
        act = [c for c in rows if (c["skutocnost_eur"] or "").strip() != ""]
        fut = [c for c in rows if (c["skutocnost_eur"] or "").strip() == ""]
        for c in act:
            add(cost_od, cf_bin(c), num(c["skutocnost_eur"]))
        spent = sum(num(c["skutocnost_eur"]) for c in act)
        if r["skupina"] == "Rezerva":
            remaining = max(0.0, num(r["rozpocet_eur"]) - max(0.0, overrun))
        else:
            eac = num(r["odhad_na_dokoncenie_eur"]) or num(r["rozpocet_eur"])
            remaining = max(0.0, eac - spent)
        remaining *= 1 + sc.get("cost_pct", 0) / 100
        ws = sum(num(c["plan_eur"]) or 0 for c in fut)
        if remaining <= 0:
            continue
        if ws > 0:
            for c in fut:
                b = max(0, cf_bin(c))
                add(cost_od, b, remaining * (num(c["plan_eur"]) or 0) / ws)
        else:
            add(cost_od, 0, remaining)

    # ---- príjmy odhad z jednotiek
    rev_od = {}
    net = lambda x: x / (1 + dph)
    zmluvy = 0.0
    for j in J:
        cena = num(j["cena_s_dph_eur"]) or 0
        if j["stav"] in SOLD:
            zmluvy += cena
            zal = num(j["zaloha_eur"])
            if zal is None:
                zal = zal_pct * cena
                zb = max(0, mil_bin)
            else:
                spl = d(j["zaloha_splatna"]) or milnik
                if j["zaloha_uhradena"] == "Áno":
                    zb = bin_of(spl, today)
                else:
                    zb = max(0, bin_of(spl, today))
            add(rev_od, zb, net(zal))
            add(rev_od, max(kol_bin, 0), net(cena - zal))
    rez = [j for j in J if j["stav"] == "Rezervovaná"]
    free = [j for j in J if j["stav"] == "Voľná"]
    price_k = 1 + sc.get("price_pct", 0) / 100

    def sale(t, value):
        if t >= kol_bin:
            add(rev_od, t, net(value))
        else:
            add(rev_od, max(t, mil_bin), net(zal_pct * value))
            add(rev_od, kol_bin, net((1 - zal_pct) * value))

    for j in rez:
        sale(0, (num(j["cena_s_dph_eur"]) or 0) * price_k)
    free_byty = sum(1 for j in free if j["typ"] == "Byt")
    free_val = sum((num(j["cena_s_dph_eur"]) or 0) for j in free) * price_k
    months = free_byty / tempo if free_byty else (1 if free_val else 0)
    if free_val:
        n = math.ceil(months - 1e-9)
        left = free_val
        for t in range(n):
            part = min(1.0, months - t) / months * free_val
            sale(t, part)
            left -= part

    # ---- úver
    U = next((u for u in D["uver"] if u["projekt_id"] == pid), None)
    T = sorted([t for t in D["tranze"] if U and t["uver_id"] == U["id"]], key=lambda t: int(t["poradie"]))
    rate = ((num(U["urok_pct"]) if U else 0) + sc.get("rate_pp", 0)) / 100
    mat_bin = bin_of(d(U["splatnost"]), today) if U else None

    def draws(mode):
        out = {}
        for t in T:
            amt = num(t["suma_eur"])
            if t["stav"] == "Načerpaná":
                add(out, bin_of(d(t["datum_cerpania"]), today), amt)
            else:
                b = bin_of(d(t["planovane_cerpanie"]), today)
                if mode == "odhad":
                    b = max(0, b)
                add(out, b, amt)
        return out

    def waterfall(cost, rev, dr, kb):
        bins = list(cost) + list(rev) + list(dr) + [kb]
        if mat_bin is not None:
            bins.append(mat_bin)
        b0, b1 = min(bins), max(bins)
        cash = bal = 0.0
        eq = {}
        interest = 0.0
        unlev = {}
        for b in range(b0, b1 + 1):
            u = rev.get(b, 0) - cost.get(b, 0)
            unlev[b] = u
            i = bal * rate / 12
            interest += i
            bal += dr.get(b, 0)
            cash += u + dr.get(b, 0) - i
            if b >= kb and bal > 0 and cash > 0:
                rp = min(bal, cash)
                bal -= rp
                cash -= rp
            if mat_bin is not None and b >= mat_bin and bal > 0:
                cash -= bal
                bal = 0
            if cash < 0:
                eq[b] = cash
                cash = 0
            elif bal <= 1e-6 and b >= kb and cash > 0:
                eq[b] = cash
                cash = 0
        if cash:
            add(eq, b1, cash)
        return {"unlev": unlev, "eq": eq, "interest": interest,
                "irr_p": irr_monthly(unlev), "irr_vk": irr_monthly(eq),
                "zisk": sum(rev.values()) - sum(cost.values()) - interest,
                "vk_vlozeny_k_dnesku": -sum(v for b, v in eq.items() if b < 0 and v < 0),
                "vk_spolu": -sum(v for v in eq.values() if v < 0)}

    # BP: kolaudácia podľa plánu (bez scenára)
    kb_bp = bin_of(d(P["termin_kolaudacie"]) + dt.timedelta(days=30), today)
    bp = waterfall(cost_bp, rev_bp, draws("bp"), kb_bp)
    od = waterfall(cost_od, rev_od, draws("odhad"), kol_bin)
    mix = waterfall(cost_bp, rev_od, draws("odhad"), kol_bin)  # príjmy odhad, náklady BP
    return {"bp": bp, "odhad": od, "mix": mix, "tempo": tempo, "sold90": sold90, "zmluvy": zmluvy,
            "cost_od_sum": sum(cost_od.values()), "rev_od_sum": sum(rev_od.values()),
            "cost_bp_sum": sum(cost_bp.values()), "rev_bp_sum": sum(rev_bp.values())}


def summary(dirp, today):
    D = load(dirp)
    out = {}
    for P in D["projekty"]:
        m = project_model(D, P, today)
        r = lambda x: None if x is None else round(x * 100, 1)
        res = {"irr_p_bp": r(m["bp"]["irr_p"]), "irr_vk_bp": r(m["bp"]["irr_vk"]), "irr_p": r(m["odhad"]["irr_p"]), "irr_vk": r(m["odhad"]["irr_vk"]),
               "irr_p_mix": r(m["mix"]["irr_p"]), "zisk_bp": round(m["bp"]["zisk"]), "zisk": round(m["odhad"]["zisk"]), "tempo": round(m["tempo"], 2),
               "vk_vlozeny": round(m["odhad"]["vk_vlozeny_k_dnesku"]), "vk_spolu_bp": round(m["bp"]["vk_spolu"]), "vk_spolu": round(m["odhad"]["vk_spolu"]),
               "zmluvy": m["zmluvy"], "cost_od": round(m["cost_od_sum"]), "rev_od": round(m["rev_od_sum"]), "cost_bp": round(m["cost_bp_sum"]), "rev_bp": round(m["rev_bp_sum"])}
        sc = {}
        for k, s in {"ceny": {"price_pct": -5}, "naklady": {"cost_pct": 5}, "oneskorenie": {"delay_m": 3}, "urok": {"rate_pp": 1}, "spolu": {"price_pct": -5, "cost_pct": 5, "delay_m": 3, "rate_pp": 1}}.items():
            mm = project_model(D, P, today, s)
            sc[k] = {"irr_p": r(mm["odhad"]["irr_p"]), "irr_vk": r(mm["odhad"]["irr_vk"]), "zisk": round(mm["odhad"]["zisk"])}
        res["stres"] = sc
        out[P["id"]] = res
    return out


if __name__ == "__main__":
    dirp = sys.argv[1] if len(sys.argv) > 1 else "data"
    today = dt.date.fromisoformat(sys.argv[2]) if len(sys.argv) > 2 else dt.date(2026, 11, 2)
    print(json.dumps(summary(dirp, today), ensure_ascii=False, indent=1))


# ================= signály F1–F6 (referenčný výpočet) =================
def signals(dirp, today, s=None):
    s = s or {"f1": {"days": 60}, "f2": {"buffer": 10}, "f3": {"pct": 30}, "f4": {"tol": 5, "rezPp": 10},
              "f5": {"pp": 2}, "f6": {"cena": 5, "naklady": 5, "mesiace": 3, "urok": 1}}
    D = load(dirp)
    out = {}
    for P in D["projekty"]:
        pid = P["id"]
        J = [j for j in D["jednotky"] if j["projekt_id"] == pid]
        byty = [j for j in J if j["typ"] == "Byt"]
        sold = sum(1 for j in byty if j["stav"] in SOLD)
        soldPct = round(sold / len(byty) * 1000) / 10 if byty else 0
        zmluvy = sum(num(j["cena_s_dph_eur"]) for j in J if j["stav"] in SOLD)
        unsold = [num(j["cena_s_dph_eur"]) for j in byty if j["stav"] in ("Voľná", "Rezervovaná")]
        pavg = sum(unsold) / len(unsold) if unsold else None
        base = project_model(D, P, today)
        tempo_real = base["sold90"] / 3
        tempo = base["tempo"]
        U = next((u for u in D["uver"] if u["projekt_id"] == pid), None)
        T = sorted([t for t in D["tranze"] if U and t["uver_id"] == U["id"]], key=lambda t: int(t["poradie"]))
        cerp = sum(num(t["suma_eur"]) for t in T if t["stav"] == "Načerpaná")
        vk_vl = num(P.get("vlastny_kapital_vlozeny_eur")) or 0
        res = {"sold": sold, "byty": len(byty), "soldPct": soldPct, "zmluvy": zmluvy, "cerpane": cerp, "tempo": round(tempo_real, 2)}
        # F1
        f1 = []
        for t in T:
            if t["stav"] == "Načerpaná":
                continue
            dni = days(today, d(t["planovane_cerpanie"]))
            po = cerp + sum(num(x["suma_eur"]) for x in T if x["stav"] != "Načerpaná" and int(x["poradie"]) <= int(t["poradie"]))
            conds = []
            units = 0
            for c in [c for c in D["podmienky"] if c["tranza_id"] == t["id"]]:
                ciel = num(c["ciel"])
                if c["typ"] == "predpredaj_pct":
                    ch = max(0, math.ceil(ciel / 100 * len(byty) - 1e-9) - sold)
                    conds.append({"id": c["id"], "ok": soldPct >= ciel, "hodnota": soldPct, "chyba_zmluv": ch}); units = max(units, ch)
                elif c["typ"] == "krytie_x":
                    v = zmluvy / po
                    ch_e = max(0.0, ciel * po - zmluvy)
                    ch = math.ceil(ch_e / pavg - 1e-9) if ch_e > 0 and pavg else 0
                    conds.append({"id": c["id"], "ok": v >= ciel - 1e-9, "hodnota": round(v, 2), "chyba_eur": round(ch_e), "chyba_zmluv": ch}); units = max(units, ch)
                elif c["typ"] == "vlastny_kapital_eur":
                    conds.append({"id": c["id"], "ok": vk_vl >= ciel, "hodnota": vk_vl, "chyba_eur": max(0, ciel - vk_vl)})
                else:
                    conds.append({"id": c["id"], "ok": (c["splnene"] or "").lower() == "ano"})
            unmet = [c for c in conds if not c["ok"]]
            proj = today + dt.timedelta(days=math.ceil(units / tempo * BIN)) if units else None
            delay = max(0, days(d(t["planovane_cerpanie"]), proj)) if proj else 0
            dopad = 0
            if delay:
                D2 = dict(D)
                D2["tranze"] = [dict(x, planovane_cerpanie=(d(x["planovane_cerpanie"]) + dt.timedelta(days=delay)).isoformat()) if x["id"] == t["id"] else x for x in D["tranze"]]
                v2 = project_model(D2, P, today)
                dopad = round(v2["odhad"]["vk_spolu"] - base["odhad"]["vk_spolu"])
            f1.append({"tranza": t["id"], "dni": dni, "v_okne": dni <= s["f1"]["days"], "nesplnene": len(unmet), "podmienky": conds,
                       "projekcia": proj.isoformat() if proj else None, "oneskorenie_dni": delay, "dopad_vk": dopad})
        res["f1"] = f1
        # F2
        nxt = next((t for t in T if t["stav"] != "Načerpaná"), None)
        kov = num(U["kovenant_krytie_x"])
        res["f2"] = {"krytie": round(zmluvy / cerp, 2) if cerp else None, "kovenant": kov,
                     "po_dalsej": round(zmluvy / (cerp + num(nxt["suma_eur"])), 2) if nxt else None,
                     "chyba_po": round(max(0, kov * (cerp + num(nxt["suma_eur"])) - zmluvy)) if nxt else 0}
        # F3
        tg = []
        bp, bdo = num(P["banka_predpredaj_pct"]), d(P["banka_predpredaj_do"])
        if bp is not None and bdo and bdo >= today:
            ch = max(0, math.ceil(bp / 100 * len(byty) - 1e-9) - sold)
            if ch:
                tg.append(("banka", ch, days(today, bdo)))
        for t in T:
            if t["stav"] == "Načerpaná" or d(t["planovane_cerpanie"]) < today:
                continue
            for c in [c for c in D["podmienky"] if c["tranza_id"] == t["id"] and c["typ"] == "predpredaj_pct"]:
                ch = max(0, math.ceil(num(c["ciel"]) / 100 * len(byty) - 1e-9) - sold)
                if ch:
                    tg.append(("tranza " + t["id"], ch, days(today, d(t["planovane_cerpanie"]))))
        kol = d(P["termin_kolaudacie"])
        left = sum(1 for j in byty if j["stav"] in ("Voľná", "Rezervovaná"))
        if left and kol > today:
            tg.append(("vypredanie", left, days(today, kol)))
        res["f3"] = [{"ciel": n, "chyba": ch, "dni": dd, "potrebne": round(ch / (dd / BIN), 2), "hit": ch / (dd / BIN) > tempo_real * (1 + s["f3"]["pct"] / 100),
                      "projekcia": (today + dt.timedelta(days=math.ceil(ch / tempo_real * BIN))).isoformat() if tempo_real else None} for n, ch, dd in tg]
        # F4
        R = [r for r in D["rozpocet"] if r["projekt_id"] == pid]
        nonres = [r for r in R if r["skupina"] != "Rezerva"]
        rez = sum(num(r["rozpocet_eur"]) for r in R if r["skupina"] == "Rezerva")
        over = [(r["id"], round(((num(r["odhad_na_dokoncenie_eur"]) or num(r["rozpocet_eur"])) / num(r["rozpocet_eur"]) - 1) * 1000) / 10) for r in nonres]
        pouz = max(0.0, sum((num(r["odhad_na_dokoncenie_eur"]) or num(r["rozpocet_eur"])) - num(r["rozpocet_eur"]) for r in nonres))
        vys = [r for r in R if r["skupina"] == "Výstavba"]
        dok = sum((num(r["dokoncenie_pct"]) or 0) * num(r["rozpocet_eur"]) for r in vys) / sum(num(r["rozpocet_eur"]) for r in vys)
        ndd = sum(max(0, (num(r["odhad_na_dokoncenie_eur"]) or num(r["rozpocet_eur"])) - (num(r["vyfakturovane_eur"]) or 0)) for r in nonres) + max(0, rez - pouz)
        vk_future = base["odhad"]["vk_spolu"] - base["odhad"]["vk_vlozeny_k_dnesku"]
        zost = (num(P.get("vlastny_kapital_plan_eur")) or 0) - vk_vl
        res["f4"] = {"nad_tol": [x for x in over if x[1] > s["f4"]["tol"]], "rezerva": rez, "pouzita": round(pouz), "pouzita_pct": round(pouz / rez * 1000) / 10 if rez else None,
                     "dokoncenie_stavby": round(dok * 10) / 10, "naklady_do_dokoncenia": round(ndd), "vk_treba": round(vk_future), "vk_zostava": round(zost)}
        # F5, F6
        r1 = lambda x: None if x is None else round(x * 1000) / 10
        res["f5"] = {"irr_p_bp": r1(base["bp"]["irr_p"]), "irr_p": r1(base["odhad"]["irr_p"]), "irr_vk_bp": r1(base["bp"]["irr_vk"]), "irr_vk": r1(base["odhad"]["irr_vk"]),
                     "irr_p_mix": r1(base["mix"]["irr_p"]), "zisk_bp": round(base["bp"]["zisk"]), "zisk": round(base["odhad"]["zisk"]), "ciel": num(P.get("cielove_irr_vk_pct"))}
        f6 = s["f6"]
        SC = {"ceny": {"price_pct": -f6["cena"]}, "naklady": {"cost_pct": f6["naklady"]}, "oneskorenie": {"delay_m": f6["mesiace"]}, "urok": {"rate_pp": f6["urok"]},
              "spolu": {"price_pct": -f6["cena"], "cost_pct": f6["naklady"], "delay_m": f6["mesiace"], "rate_pp": f6["urok"]}}
        res["f6"] = {k: (lambda m: {"irr_p": r1(m["odhad"]["irr_p"]), "irr_vk": r1(m["odhad"]["irr_vk"]), "zisk": round(m["odhad"]["zisk"])})(project_model(D, P, today, v)) for k, v in SC.items()}
        out[pid] = res
    return out
