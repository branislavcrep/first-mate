# Čo sa práve deje

Aktualizované: 2026-11-24 · Branislav (STOP vo fáze 7, čaká sa na Branislava)

## Kde sme
- Migrácia podľa `docs/migracia/PLAN.md`: fázy 0–6 hotové (Issues #3, #4, #5 uzavreté), fáza 7 rozpracovaná (Issue #6).
- Vydaná verzia **1.0.0**: `package.json`, `CHANGELOG.md`, commit `2c26f5d` v `main`. `npm test` aj `npm run test:ui` prechádzajú.
- Tag `v1.0.0` existuje len lokálne: proxy v cloude odmieta push tagov (403). Branislav ho vytvorí na GitHube: Releases → Draft a new release → tag `v1.0.0` (nový) → target `main` → text z `CHANGELOG.md` → Publish.
- `/release` je funkčný (`tools/release.py` ukáže verziu, tag a klientov na staršej verzii).
- `docs/pre-marcela.md` je napísaný (prístupy, prvá session, vlastná kópia demo panela, `/novy-klient`). Marcelov GitHub účet zatiaľ neznámy.

## Panely
- Nový demo panel: https://claude.ai/artifact/VZWUmbcEU4WihYycwT3GQK, zatiaľ build 0.5.0. Nočná úloha trig_01A5m3w9929SkxEMYNGYpWLv (2:17) ho znovu zverejní ako 1.0.0, lebo sa zmenil `package.json`; ručne `/zverejni-demo`.
- Pôvodné demo panely developera (Thwr8YV58gP7RprXQHRw2Y) a realitky (TMqLo37PgkvMqetibH7a5P) majú pruh „Archív“ s odkazom na nový panel. Realitka je súkromná, developer zdieľaný odkazom.
- Immocap beží na pôvodnom klientskom paneli; prechod na 1.0.0 len po dohode s klientom.

## Ďalší krok (STOP)
1. Plugin pre Cowork (fáza 7, bod 3): čaká na `First-Mate-Immocap.zip` od Branislava. Po dodaní: presun do `plugin/`, `fm.py` a `fin_model.py` do testov (rovnaké čísla ako jadro), návrh čítania katalógu.
2. Ukončenie migrácie (bod 4) až po rozhodnutí o plugine: buď po dodaní zipu, alebo plugin presunúť do samostatného Issue a migráciu ukončiť hneď. V `hot.md` prepnúť na bežnú prácu, v `CLAUDE.md` odstrániť odkaz na plán ako aktívny, uzavrieť Issue #6.

## Pravidlá pre panel/
- Výpočty len v `panel/usecases/`. Kľúče výstupu zatiaľ legacy (`s1`…, `f1`…).
- Rozdiely typov: `panel/rozhranie/<typ>.js` alebo `if (DEV)`. Rozdiely klientov: nastavenia + značky `data-rezim`/`data-rozvrh`/`data-kanal`/`data-prikaz`.
- Generátory `docs/migracia/nastroje/rozdel_*.mjs` už nespúšťať.
- UI test trvá asi 4 minúty: v Bash nastav `timeout` 600000.

## Otvorené
- Issues #6 (fáza 7), #7, #8 (návrhy, menia čísla), #9–#13 (body z legacy), #14 (skilly, Branislav).
