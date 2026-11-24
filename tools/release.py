#!/usr/bin/env python3
"""Pomocník pre /release: verzia, posledný tag a klienti na staršej verzii.

Použitie:
  python3 tools/release.py            # prehľad: verzia v package.json, posledný tag, klienti
  python3 tools/release.py --klienti  # len klienti, ktorých nasadená verzia je staršia ako package.json

Nasadená verzia klienta = verzia z posledného riadku tabuľky v `klienti/<klient>/verzie.md`,
ktorý hovorí o zverejnení alebo nasadení („zverejn…“, „nasaden…“, nie „nezverejn…“).
"""
import json
import re
import subprocess
import sys
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
NASADENIE = re.compile(r"zverejn|nasaden", re.I)
NIE = re.compile(r"nezverejn", re.I)


def verzia_balika():
    return json.loads((KOREN / "package.json").read_text(encoding="utf-8"))["version"]


def posledny_tag():
    r = subprocess.run(["git", "describe", "--tags", "--abbrev=0"], cwd=KOREN, capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 else None


def semver(v):
    m = re.fullmatch(r"v?(\d+)\.(\d+)\.(\d+)", v or "")
    return tuple(int(x) for x in m.groups()) if m else None


def nasadena_verzia(subor):
    riadky = [r for r in subor.read_text(encoding="utf-8").splitlines() if r.startswith("|") and not r.startswith("|---")]
    nasadene = None
    for r in riadky[1:]:  # bez hlavičky
        bunky = [b.strip() for b in r.strip("|").split("|")]
        if len(bunky) < 4:
            continue
        datum, ver, commit, co = bunky[:4]
        if NASADENIE.search(co) and not NIE.search(co):
            nasadene = {"datum": datum, "verzia": ver, "commit": commit, "co": co}
    return nasadene


def klienti():
    out = []
    for d in sorted((KOREN / "klienti").iterdir()):
        if not d.is_dir() or d.name.startswith("_"):
            continue
        f = d / "verzie.md"
        out.append({"klient": d.name, "nasadene": nasadena_verzia(f) if f.exists() else None})
    return out


def main():
    ver = verzia_balika()
    aktualna = semver(ver)
    starsi = []
    for k in klienti():
        n = k["nasadene"]
        v = n["verzia"] if n else None
        if semver(v) is None or semver(v) < aktualna:
            starsi.append((k["klient"], n))
    if "--klienti" not in sys.argv:
        print(f"Verzia v package.json: {ver}")
        print(f"Posledný tag: {posledny_tag() or '(žiadny)'}")
    if not starsi:
        print(f"Všetci klienti sú na {ver}.")
        return
    print(f"Klienti na staršej verzii ako {ver}:")
    for klient, n in starsi:
        if n:
            print(f"- {klient}: {n['verzia']} ({n['datum']}, {n['co']})")
        else:
            print(f"- {klient}: zatiaľ nič nezverejnené")


if __name__ == "__main__":
    main()
