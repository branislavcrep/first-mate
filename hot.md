# Čo sa práve deje

Aktualizované: 2026-11-23 · Branislav (session v Claude Code v cloude)

## Aktívne
- Migrácia na jedno jadro podľa `docs/migracia/PLAN.md`. Fázy 0, 1 a 2 hotové a zlúčené do `main`. **Ďalej fáza 3: katalóg use casov** (Issue #2), končí STOP bodom so schválením tabuľky use casov a zlúčení.
- Úlohy migrácie: GitHub Issues #2–#6 (fázy 3–7). Issue #1 (fáza 2) uzavreté.
- Pôvodné panely bežia ďalej (slugy v `legacy/README.md`), Immocap má balík z 19.–20. 11.

## Stav základne
- `npm test` = golden testy (`tests/index.md`): legacy ↔ golden, F1–F6 ↔ Python model (187 hodnôt), 20 čísel z `legacy/README.md`; od fázy 4 aj `panel/golden.mjs` ↔ golden. Pred zlúčením do `main` musí prejsť.
- Golden „teraz“ = referenčný dátum 18:00 Europe/Bratislava, bez posunu, predvolené hranice. Golden prepísať len po schválenej zmene výpočtu.
- Hooky v cloude fungujú (SessionStart vypíše hot.md). Príkazy z `.claude/commands/` sú dostupné ako /build, /koniec atď.
- Testovací artefakt fázy 1: https://claude.ai/artifact/HA9ygyGrhrRWdjbTyhf4NV (T1–T6 overené aj Branislavom, testovacia správa prišla do #first-mate-developer).
- Nový panel bude zverejňovať Claude Code, môže byť viacsúborový (`docs/rozhodnutia.md`).

## Otvorené otázky
- Farby štítkov v GitHube (zatiaľ sivé) – nastaviť ručne, ak treba.
- Plugin First Mate pre Cowork (fm.py, fin_model.py) zatiaľ nie je v repozitári: je v balíku First-Mate-Immocap.zip u Branislava.
- Marcelov GitHub účet zatiaľ neznámy.

## Kam ísť ďalej
- Plán: docs/migracia/PLAN.md, fáza 3
- Zdroje pre katalóg: `SIG`, `FSIG`, `SRC` v legacy/panel-developer/index.html (riadky ~2536–2560), `SIG` v legacy/panel-realitka/index.html (~1614), legacy/panel-klient-immocap/tipy.json
- Testy: tests/index.md · Rozhodnutia: docs/rozhodnutia.md · Dáta: data/index.md
