#!/usr/bin/env python3
"""First Mate · build panela pre klienta.

    python3 tools/build.py <klient> [<klient> …] [--vystup dist]

Z `panel/`, katalógu `usecases/`, dát `data/<typ>/` (len typy klienta) a `klienti/<klient>/nastavenia.json`
zostaví `dist/<klient>/`: samostatný priečinok, ktorý sa dá otvoriť cez lokálny server alebo zverejniť
ako artefakt z viacerých súborov (fáza 1: zverejnenie z Claude Code zvláda viac súborov).

V `index.html` nastaví meta `fm-koren` (./), `fm-nastavenia` (nastavenia.json), `fm-verzia` (z package.json)
a `fm-zostavene` (dnešný dátum v Europe/Bratislava), titulok stránky. Vedľa zapíše `build.json`
(klient, verzia, dátum, commit, zoznam súborov) ako podklad pre zverejnenie.

Build odmietne nastavenia s nevyplnenými miestami «…» zo šablóny a s poľami, ktoré vyzerajú ako kľúče
alebo heslá. Výpočty nemení; pred buildom majú prejsť golden testy (`npm test`).
"""
import datetime as dt
import html
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
PANEL = KOREN / "panel"
# súbory panela, ktoré do zostavy nepatria (testovací adaptér, index priečinka)
BEZ = {"golden.mjs", "index.md"}
TAJNE = re.compile(r"(token|secret|heslo|password|api[_-]?key|apikey|client[_-]?secret)", re.I)
LIMIT_SUBOROV = 255  # max. súborov v jednom zverejnení artefaktu


class Chyba(Exception):
    pass


def dnes():
    try:
        from zoneinfo import ZoneInfo
        return dt.datetime.now(ZoneInfo("Europe/Bratislava")).date()
    except Exception:
        return dt.date.today()


def verzia():
    v = json.loads((KOREN / "package.json").read_text(encoding="utf-8")).get("version")
    if not v or not re.fullmatch(r"\d+\.\d+\.\d+", v):
        raise Chyba("package.json nemá platnú verziu (version: X.Y.Z).")
    return v


def commit():
    try:
        h = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=KOREN, capture_output=True, text=True, check=True).stdout.strip()
        zmeny = subprocess.run(["git", "status", "--porcelain"], cwd=KOREN, capture_output=True, text=True, check=True).stdout.strip()
        return h + ("+necommitnuté" if zmeny else "")
    except Exception:
        return "neznámy"


def skontroluj_nastavenia(n, cesta):
    """Odmietne nevyplnenú šablónu a polia s tajomstvami; overí typy proti katalógu."""
    chyby = []

    def prejdi(x, kde):
        if isinstance(x, dict):
            for k, v in x.items():
                if TAJNE.search(k):
                    chyby.append(f"{kde}.{k}: pole vyzerá ako kľúč alebo heslo, do repozitára nepatrí")
                prejdi(v, f"{kde}.{k}")
        elif isinstance(x, list):
            for i, v in enumerate(x):
                prejdi(v, f"{kde}[{i}]")
        elif isinstance(x, str) and "«" in x:
            chyby.append(f"{kde}: nevyplnené miesto zo šablóny ({x})")

    prejdi(n, "nastavenia")
    typy = json.loads((KOREN / "usecases" / "typy.json").read_text(encoding="utf-8"))["typy"]
    hotove = {t["id"]: t for t in typy if t.get("stav") == "hotovy"}
    zoznam = n.get("typy") or [n.get("typ") or "developer"]
    for t in zoznam:
        if t not in hotove:
            chyby.append(f"typ „{t}“ nie je v usecases/typy.json hotový (hotové: {', '.join(hotove)})")
    if n.get("typ") and n["typ"] not in zoznam:
        chyby.append(f"typ „{n['typ']}“ nie je v zozname typy {zoznam}")
    if chyby:
        raise Chyba(f"{cesta.relative_to(KOREN)}:\n  - " + "\n  - ".join(chyby))
    return [hotove[t] for t in zoznam if t in hotove]


def nastav_meta(text, meno, hodnota):
    vzor = re.compile(r'(<meta name="%s" content=")[^"]*(">)' % re.escape(meno))
    if not vzor.search(text):
        raise Chyba(f"panel/index.html nemá <meta name=\"{meno}\">")
    return vzor.sub(lambda m: m.group(1) + html.escape(hodnota, quote=True) + m.group(2), text, count=1)


def zostav(klient, vystup):
    cesta = KOREN / "klienti" / klient / "nastavenia.json"
    if not cesta.exists():
        raise Chyba(f"Klient „{klient}“ nemá {cesta.relative_to(KOREN)}.")
    n = json.loads(cesta.read_text(encoding="utf-8"))
    typy = skontroluj_nastavenia(n, cesta)
    ver, datum = verzia(), dnes().isoformat()

    ciel = vystup / klient
    if ciel.exists():
        shutil.rmtree(ciel)
    ciel.mkdir(parents=True)

    # kód panela
    for f in sorted(PANEL.rglob("*")):
        rel = f.relative_to(PANEL)
        if f.is_dir() or rel.name in BEZ or any(p.startswith(".") for p in rel.parts):
            continue
        (ciel / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(f, ciel / rel)
    # katalóg (vedľa modulov use casov v usecases/, mená sa nekryjú: .json vs .js)
    for f in ("usecases.json", "typy.json"):
        if (ciel / "usecases" / f).exists():
            raise Chyba(f"usecases/{f} by prepísal súbor panela")
        shutil.copy2(KOREN / "usecases" / f, ciel / "usecases" / f)
    # dáta typov klienta (CSV a manifest, bez slovníkov)
    for t in typy:
        zdroj = KOREN / t["data_dir"]
        for f in sorted(zdroj.iterdir()):
            if f.suffix == ".csv" or f.name == "manifest.md":
                (ciel / t["data_dir"]).mkdir(parents=True, exist_ok=True)
                shutil.copy2(f, ciel / t["data_dir"] / f.name)
    shutil.copy2(cesta, ciel / "nastavenia.json")

    # index.html: cesty, verzia, dátum, titulok
    ix = (ciel / "index.html").read_text(encoding="utf-8")
    ix = nastav_meta(ix, "fm-koren", "./")
    ix = nastav_meta(ix, "fm-nastavenia", "nastavenia.json")
    ix = nastav_meta(ix, "fm-verzia", ver)
    ix = nastav_meta(ix, "fm-zostavene", datum)
    titulok = n.get("titulok") or ("First Mate · môj panel" if n.get("rezim") == "klient" else "First Mate · demo panel")
    ix = re.sub(r"<title>[^<]*</title>", "<title>" + html.escape(titulok) + "</title>", ix, count=1)
    (ciel / "index.html").write_text(ix, encoding="utf-8")

    subory = sorted(str(f.relative_to(ciel)) for f in ciel.rglob("*") if f.is_file())
    if len(subory) + 1 > LIMIT_SUBOROV:
        raise Chyba(f"{len(subory)} súborov je nad limit zverejnenia ({LIMIT_SUBOROV}).")
    velkost = sum((ciel / s).stat().st_size for s in subory)
    info = {"klient": klient, "nazov": n.get("nazov", klient), "titulok": titulok, "verzia": ver, "zostavene": datum,
            "commit": commit(), "typy": [t["id"] for t in typy], "subory": subory, "velkost_bajtov": velkost}
    (ciel / "build.json").write_text(json.dumps(info, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return info


def main(argv):
    args, vystup = [], KOREN / "dist"
    it = iter(argv)
    for a in it:
        if a == "--vystup":
            vystup = Path(next(it)).resolve()
        elif a.startswith("-"):
            print(__doc__); return 2
        else:
            args.append(a)
    if not args:
        print(__doc__); return 2
    zlyhania = 0
    for k in args:
        try:
            i = zostav(k, vystup)
            print(f"✓ {k}: {vystup.name}/{k}/ · First Mate v{i['verzia']} · zostavené {i['zostavene']} · "
                  f"{', '.join(i['typy'])} · {len(i['subory'])} súborov, {i['velkost_bajtov'] / 1024:.0f} kB · commit {i['commit']}")
        except Chyba as e:
            zlyhania += 1
            print(f"✗ {k}: {e}")
    return 1 if zlyhania else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
