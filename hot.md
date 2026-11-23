# Čo sa práve deje

Aktualizované: 2026-11-24 · Branislav (session v Claude Code v cloude)

## Aktívne
- Migrácia na jedno jadro podľa `docs/migracia/PLAN.md`. Fázy 0–3 hotové a v `main`. **Ďalej fáza 4: jedno jadro panela** (Issue #3): `panel/` z legacy developera, katalóg, prepínač typov, realitka ako typ, klientsky režim ako nastavenia, `panel/golden.mjs` musí prejsť `npm test`.
- Úlohy migrácie: GitHub Issues #3–#6 (fázy 4–7); #1, #2 uzavreté. Návrhy na neskôr: #7 (čas prvej reakcie pre developera), #8 (zaujem-bez-akcie, vypredané typy).
- Pôvodné panely bežia ďalej (slugy v `legacy/README.md`), Immocap má balík z 19.–20. 11.

## Stav základne
- `npm test` = golden testy (`tests/index.md`): legacy ↔ golden, F1–F6 ↔ Python model (187 hodnôt), 20 čísel z `legacy/README.md`, kontrola katalógu a CSV exportu; od fázy 4 aj `panel/golden.mjs` ↔ golden. Pred zlúčením do `main` musí prejsť.
- Katalóg: `usecases/index.md`. Zlúčený len `dopyty-bez-reakcie` (realitka s1 + developer s4). Schválené 24. 11.
- Golden „teraz“ = referenčný dátum 18:00 Europe/Bratislava, bez posunu, predvolené hranice. Golden prepísať len po schválenej zmene výpočtu.
- Hooky v cloude fungujú (SessionStart vypíše hot.md). Príkazy z `.claude/commands/` sú dostupné ako /build, /koniec atď.
- Testovací artefakt fázy 1: https://claude.ai/artifact/HA9ygyGrhrRWdjbTyhf4NV (T1–T6 overené aj Branislavom, testovacia správa prišla do #first-mate-developer).
- Nový panel bude zverejňovať Claude Code, môže byť viacsúborový (`docs/rozhodnutia.md`).

## Otvorené otázky
- Farby štítkov v GitHube (zatiaľ sivé) – nastaviť ručne, ak treba.
- Plugin First Mate pre Cowork (fm.py, fin_model.py) zatiaľ nie je v repozitári: je v balíku First-Mate-Immocap.zip u Branislava.
- Marcelov GitHub účet zatiaľ neznámy.

## Kam ísť ďalej
- Plán: docs/migracia/PLAN.md, fáza 4
- Testy: tests/index.md · Rozhodnutia: docs/rozhodnutia.md · Dáta: data/index.md
