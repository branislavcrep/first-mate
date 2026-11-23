---
description: Vydá novú verziu First Mate (CHANGELOG, tag, päta)
---
# /release · KOSTRA (naplní sa vo fáze 7 migrácie)

Postup:
1. Zisti poslednú verziu (`git describe --tags --abbrev=0`) a navrhni ďalšiu podľa zmien (semver). Verzia = $ARGUMENTS, ak je zadaná.
2. Spusti golden testy. Ak neprejdú, zastav.
3. Zhrň zmeny od poslednej verzie (git log, denník) do `CHANGELOG.md` po slovensky.
4. Zapíš číslo verzie tam, odkiaľ ho build berie do päty („First Mate vX.Y.Z · zostavené RRRR-MM-DD“).
5. Commit, `git tag vX.Y.Z`, push aj s tagom.
6. Vypíš klientov na staršej verzii podľa `klienti/*/verzie.md`.
