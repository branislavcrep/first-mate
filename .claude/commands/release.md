---
description: Vydá novú verziu First Mate (CHANGELOG, tag, päta)
---
# /release

Vydá novú verziu First Mate. Verzia = $ARGUMENTS (napr. `1.1.0`), inak ju navrhni a nechaj potvrdiť. Nič nezverejňuj klientom a nič neposielaj do Slacku ani e-mailom; release len pripraví verziu.

1. `python3 tools/release.py`: verzia v `package.json`, posledný tag, klienti na staršej verzii.
2. Ak verzia nie je zadaná, navrhni ju podľa semver z `git log <posledný tag>..HEAD` a denníka: oprava = PATCH, nový use case, záložka alebo nastavenie = MINOR, zmena čísel signálov alebo formátu CSV či nastavení, ktorá si vyžaduje zásah u klienta = MAJOR. Počkaj na potvrdenie.
3. Do `package.json` zapíš `version`. Odtiaľ ju berie build do päty („First Mate vX.Y.Z · zostavené D. M. RRRR“) a UI test kontroluje, že sa zhoduje.
4. `npm test` a `npm run test:ui` (v Bash `timeout` 600000). Ak niečo neprejde, zastav, vráť verziu späť a ukáž rozdiely.
5. Do `CHANGELOG.md` pridaj navrch sekciu `## X.Y.Z · RRRR-MM-DD` po slovensky, pre čitateľa, nie pre programátora: **Nové**, **Zmenené**, **Opravené**, **Pre klientov** (čo treba u klienta urobiť, alebo „nič“). Zdroj: `git log <posledný tag>..HEAD`, denník, `docs/rozhodnutia.md`, uzavreté Issues. Zmeny čísel signálov vždy výslovne uveď.
6. Commit („Vydanie vX.Y.Z“) na pracovnej vetve, zlúč do `main`, na commit v `main` daj anotovaný tag `git tag -a vX.Y.Z -m "First Mate vX.Y.Z"` a pushni `main`, vetvu aj tag (`git push origin vX.Y.Z`). V Claude Code v cloude proxy push tagov odmieta (403, overené 24. 11. 2026): neskúšaj to obísť, napíš Branislavovi postup na GitHube: Releases → Draft a new release → Choose a tag: `vX.Y.Z` (Create new tag) → Target: `main` (commit z vydania) → názov „First Mate vX.Y.Z“, text zo sekcie v `CHANGELOG.md` → Publish release.
7. `python3 tools/release.py --klienti` a vypíš klientov na staršej verzii. Každému navrhni ďalší krok (demo: `/zverejni-demo` alebo nočná úloha; klient: `/build <klient>` a zverejnenie so súhlasom), ale sám nič nezverejňuj.
8. Denník, `hot.md` a commit podľa `CLAUDE.md`.
