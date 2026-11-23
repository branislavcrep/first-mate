#!/usr/bin/env python3
"""First Mate · kontrola a export katalógu use casov.

  python3 tools/export_usecases.py            → kontrola + usecases/export/usecases.csv
  python3 tools/export_usecases.py --kontrola → kontrola schémy (usecases/schema.md) a aktuálnosti exportu, bez zápisu

CSV: UTF-8 s BOM, oddeľovač ";", riadky CRLF, viac hodnôt v poli oddelených "|".
Stĺpce: id, nazov, druh, typy, kategoria, stav, vypocet, zdroje_dat, popis.
"""
import csv
import io
import json
import os
import re
import sys

KOREN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DRUHY = {"signal", "tip", "demo", "navrh"}
STAVY = {"hotovy", "navrh"}
STLPCE = ["id", "nazov", "druh", "typy", "kategoria", "stav", "vypocet", "zdroje_dat", "popis"]


def nacitaj():
    with open(os.path.join(KOREN, "usecases", "usecases.json"), encoding="utf-8") as f:
        k = json.load(f)
    with open(os.path.join(KOREN, "usecases", "typy.json"), encoding="utf-8") as f:
        t = json.load(f)
    return k, t


def podla_typu(v, typy, ok):
    """Hodnota je buď spoločná, alebo objekt presne s kľúčmi typov use casu."""
    if isinstance(v, dict) and set(v) and set(v) <= set(typy) and not ok(v):
        return set(v) == set(typy)
    return ok(v)


def je_zdroj(v):
    return isinstance(v, dict) and isinstance(v.get("systemy"), list) and isinstance(v.get("csv"), list) and \
        all(isinstance(s, dict) and s.get("system") and s.get("co") for s in v["systemy"])


def kontrola(k, t):
    chyby = []
    typy = {x["id"]: x for x in t["typy"]}
    kat = {x["id"] for x in k["kategorie"]}
    urovne = {x["id"] for x in k["urovne"]}
    temy = {x["id"] for x in k["temy"]}
    miesta = set(k["miesta"])
    ids = [u.get("id") for u in k["usecases"]]
    for d in sorted({i for i in ids if ids.count(i) > 1}):
        chyby.append(f"duplicitné id {d}")
    vsetky = set(ids)
    for u in k["usecases"]:
        i = u.get("id") or "?"
        def e(m):
            chyby.append(f"{i}: {m}")
        if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", i):
            e("id musí byť malými písmenami s pomlčkami")
        for p in ["nazov", "druh", "typy", "kategoria", "popis", "stav"]:
            if p not in u:
                e(f"chýba pole {p}")
        if u.get("druh") not in DRUHY:
            e(f"neznámy druh {u.get('druh')}")
        if u.get("stav") not in STAVY:
            e(f"neznámy stav {u.get('stav')}")
        ut = u.get("typy") or []
        if not ut or any(x not in typy for x in ut):
            e(f"neznáme alebo prázdne typy {ut}")
        if u.get("kategoria") not in kat:
            e(f"neznáma kategória {u.get('kategoria')}")
        if not podla_typu(u.get("popis"), ut, lambda v: isinstance(v, str) and v.strip()):
            e("popis musí byť text alebo objekt podľa typov")
        for s in u.get("suvisi", []):
            if s not in vsetky:
                e(f"suvisi odkazuje na neexistujúce id {s}")
        druh = u.get("druh")
        if druh == "signal":
            for p in ["parametre", "zdroje_dat", "vypocet", "uroven"]:
                if p not in u:
                    e(f"signál bez poľa {p}")
            for p in u.get("parametre", []):
                if not all(x in p for x in ["kluc", "nazov", "min", "max", "predvolene"]):
                    e(f"parameter {p.get('kluc')} bez kluc/nazov/min/max/predvolene")
                elif not podla_typu(p["predvolene"], ut, lambda v: isinstance(v, (int, float))):
                    e(f"parameter {p['kluc']}: predvolene musí byť číslo alebo objekt podľa typov")
            v = u.get("vypocet", {})
            if not (isinstance(v.get("modul"), str) or isinstance(v.get("pravidlo"), dict)):
                e("vypocet musí mať modul alebo pravidlo")
            if u.get("stav") == "hotovy":
                leg = u.get("legacy") or {}
                if set(leg) != set(ut):
                    e("hotový signál musí mať legacy kľúč pre každý typ")
        if druh in ("signal", "demo") and not podla_typu(u.get("zdroje_dat"), ut, je_zdroj):
            e("zdroje_dat musí byť {systemy, csv} alebo objekt podľa typov")
        if druh == "tip":
            for p in ["otazka", "kde", "co_urobi", "meni_data", "uroven", "tema"]:
                if p not in u:
                    e(f"tip bez poľa {p}")
            if u.get("kde") not in miesta:
                e(f"neznáme miesto {u.get('kde')}")
            if u.get("uroven") not in urovne:
                e(f"neznáma úroveň {u.get('uroven')}")
            if u.get("tema") not in temy:
                e(f"neznáma téma {u.get('tema')}")
        if druh == "demo" and not u.get("kroky"):
            e("demo bez krokov")
        if druh == "navrh" and u.get("stav") != "navrh":
            e("návrh musí mať stav navrh")
    # typy.json: poradie signálov odkazuje na existujúce signály toho typu, v poradí legacy kľúčov
    po_id = {u["id"]: u for u in k["usecases"] if "id" in u}
    for tid, typ in typy.items():
        for pole, pref in [("signaly", "s"), ("financne_signaly", "f")]:
            zoznam = typ.get(pole, [])
            for n, sid in enumerate(zoznam, 1):
                u = po_id.get(sid)
                if not u or u.get("druh") != "signal" or tid not in u.get("typy", []):
                    chyby.append(f"typy.json {tid}.{pole}: {sid} nie je signál typu {tid}")
                elif u.get("stav") == "hotovy" and (u.get("legacy") or {}).get(tid) != f"{pref}{n}":
                    chyby.append(f"typy.json {tid}.{pole}: {sid} je na pozícii {n}, ale legacy kľúč je {(u.get('legacy') or {}).get(tid)}")
        for c in typ["csv"]["potrebne"] + typ["csv"]["volitelne"]:
            if not os.path.exists(os.path.join(KOREN, typ["data_dir"], c)):
                chyby.append(f"typy.json {tid}: súbor {typ['data_dir']}{c} neexistuje")
    return chyby


def text_podla_typu(v):
    if isinstance(v, dict) and not je_zdroj(v):
        return " | ".join(f"{t}: {x}" for t, x in v.items())
    return v


def zdroj_text(z):
    if z is None:
        return ""
    if je_zdroj(z):
        s = "; ".join(f"{x['system']}: {x['co']}" for x in z["systemy"])
        return s + (f" (CSV: {', '.join(z['csv'])})" if z["csv"] else "")
    return " | ".join(f"{t}: {zdroj_text(x)}" for t, x in z.items())


def vypocet_text(u):
    v = u.get("vypocet")
    if not v:
        return ""
    return "modul " + v["modul"] if "modul" in v else "pravidlo"


CIEL = os.path.join(KOREN, "usecases", "export", "usecases.csv")


def csv_text(k):
    buf = io.StringIO()
    w = csv.writer(buf, delimiter=";", lineterminator="\r\n", quoting=csv.QUOTE_MINIMAL)
    w.writerow(STLPCE)
    for u in k["usecases"]:
        w.writerow([u["id"], u["nazov"], u["druh"], "|".join(u["typy"]), u["kategoria"], u["stav"], vypocet_text(u),
                    zdroj_text(u.get("zdroje_dat")), text_podla_typu(u["popis"])])
    return buf.getvalue()


def export(k):
    os.makedirs(os.path.dirname(CIEL), exist_ok=True)
    with open(CIEL, "w", encoding="utf-8-sig", newline="") as f:
        f.write(csv_text(k))
    return CIEL


def export_aktualny(k):
    try:
        with open(CIEL, encoding="utf-8-sig", newline="") as f:
            return f.read() == csv_text(k)
    except FileNotFoundError:
        return False


def main():
    k, t = nacitaj()
    chyby = kontrola(k, t)
    if chyby:
        print("Katalóg use casov má chyby:")
        for c in chyby:
            print("  ✗ " + c)
        return 1
    from collections import Counter
    druh = Counter(u["druh"] for u in k["usecases"])
    typ = Counter(x for u in k["usecases"] for x in u["typy"])
    print(f"  ✓ katalóg: {len(k['usecases'])} use casov · " + ", ".join(f"{d} {n}" for d, n in druh.items()) +
          " · " + ", ".join(f"{d} {n}" for d, n in typ.items()))
    if "--kontrola" in sys.argv:
        if not export_aktualny(k):
            print("  ✗ usecases/export/usecases.csv nezodpovedá katalógu, spusti: python3 tools/export_usecases.py")
            return 1
        print("  ✓ export usecases/export/usecases.csv je aktuálny")
        return 0
    ciel = export(k)
    print(f"  ✓ export: {os.path.relpath(ciel, KOREN)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
