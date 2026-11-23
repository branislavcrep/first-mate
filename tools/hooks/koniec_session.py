#!/usr/bin/env python3
"""First Mate · hooky Claude Code.

Použitie (z .claude/settings.json):
  python3 tools/hooks/koniec_session.py stop    -> hook Stop
  python3 tools/hooks/koniec_session.py start   -> hook SessionStart

Stop: ak sú necommitnuté zmeny, nepushnuté commity alebo v dennik/RRRR-MM.md
chýba dnešný záznam, zablokuje ukončenie s dôvodom. Ak už raz blokoval
(stop_hook_active = true), nechá session skončiť, aby neblokoval donekonečna.

SessionStart: vypíše prvých 40 riadkov hot.md (dostane sa do kontextu).
"""
import datetime as dt
import json
import os
import subprocess
import sys

KOREN = os.environ.get("CLAUDE_PROJECT_DIR") or os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)


def dnes():
    try:
        from zoneinfo import ZoneInfo

        return dt.datetime.now(ZoneInfo("Europe/Bratislava")).date()
    except Exception:
        return dt.date.today()


def git(*args):
    try:
        r = subprocess.run(
            ["git", *args], cwd=KOREN, capture_output=True, text=True, timeout=15
        )
        return r.returncode, r.stdout.strip()
    except Exception:
        return 1, ""


def chyby():
    out = []
    kod, stav = git("status", "--porcelain")
    if kod == 0 and stav:
        out.append("necommitnuté zmeny (súbory: %d)" % len(stav.splitlines()))
    _, vetva = git("rev-parse", "--abbrev-ref", "HEAD")
    kod, ciel = git("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}")
    if kod != 0 and vetva and vetva != "HEAD":
        ciel = "origin/" + vetva
        if git("rev-parse", "--verify", "--quiet", ciel)[0] != 0:
            out.append("vetva %s ešte nie je na GitHube" % vetva)
            ciel = ""
    if ciel:
        kod, pocet = git("rev-list", "--count", ciel + "..HEAD")
        if kod == 0 and pocet not in ("", "0"):
            out.append("nepushnuté commity: %s (oproti %s)" % (pocet, ciel))
    d = dnes()
    dennik = os.path.join(KOREN, "dennik", d.strftime("%Y-%m") + ".md")
    zaznam = "- " + d.isoformat()
    try:
        with open(dennik, encoding="utf-8") as f:
            ma = any(r.startswith(zaznam) for r in f)
    except FileNotFoundError:
        ma = False
    if not ma:
        out.append("v dennik/%s.md chýba záznam z %s" % (d.strftime("%Y-%m"), d.isoformat()))
    return out


def stop(vstup):
    if vstup.get("stop_hook_active"):
        return 0  # už raz blokoval, nechaj skončiť
    c = chyby()
    if not c:
        return 0
    dovod = (
        "Zapíš denník, prepíš hot.md, commitni a pushni (CLAUDE.md, koniec session). "
        "Chýba: " + "; ".join(c) + ". "
        "Ak práve čakáš na odpoveď používateľa (STOP bod) a session nekončí, povedz to jednou vetou a skonči."
    )
    print(json.dumps({"decision": "block", "reason": dovod}, ensure_ascii=False))
    return 0


def start(_vstup):
    try:
        with open(os.path.join(KOREN, "hot.md"), encoding="utf-8") as f:
            riadky = f.readlines()[:40]
    except FileNotFoundError:
        return 0
    print("== hot.md (prvých 40 riadkov) ==")
    print("".join(riadky).rstrip())
    return 0


def main():
    rezim = sys.argv[1] if len(sys.argv) > 1 else "stop"
    try:
        vstup = json.load(sys.stdin) if not sys.stdin.isatty() else {}
    except Exception:
        vstup = {}
    return {"stop": stop, "start": start}.get(rezim, stop)(vstup)


if __name__ == "__main__":
    sys.exit(main())
