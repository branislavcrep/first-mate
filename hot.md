# Čo sa práve deje

Aktualizované: 2026-11-24 · Branislav (koniec session, nová session nadväzuje tu)

## Kde sme skončili
- Migrácia podľa `docs/migracia/PLAN.md`: fázy 0–5 hotové (Issues #3, #4 uzavreté), fáza 6 hotová okrem pruhu „Archív“ na starých paneloch. Všetko je v `main`, `npm test` aj `npm run test:ui` prechádzajú.
- Panel `panel/` je jedno jadro pre realitku, developera aj klientsky panel. Riadia ho nastavenia klienta `klienti/<klient>/nastavenia.json`; popis polí je v `klienti/_sablona/README.md`.
- Build: `python3 tools/build.py <klient>` → `dist/<klient>/` (viac súborov + `build.json` so zoznamom súborov). Verzia `0.5.0` z `package.json`. `dist/` sa necommituje.
- Klienti:
  - `demo`: prepínač, oba typy, demo Slack kanály;
  - `immocap`: developer, klientsky režim, zhodný s legacy;
  - šablóna `_sablona`.
  Každý má `verzie.md`. Príkazy `/build` a `/novy-klient` sú funkčné.
- UI test porovnáva s legacy aj zostavené `dist/demo` a `dist/immocap`. `npm test` zostaví všetkých klientov naskúšku.

## Fáza 6 (Issue #5): hotové
- Zverejnený nový „First Mate · demo panel“: https://claude.ai/artifact/VZWUmbcEU4WihYycwT3GQK (build 0.5.0, commit e6e4978). Branislav ho vyskúšal, funguje.
- Testovacie odoslanie do #first-mate-demo a #first-mate-developer prebehlo (so súhlasom).
- `/zverejni-demo` je funkčný.
- Nočná plánovaná úloha trig_01A5m3w9929SkxEMYNGYpWLv (2:17): zverejní len pri zmene súborov panela.
- Návrh úpravy skillov je v `docs/migracia/skilly.md`; upraví ich Branislav na claude.ai.

## Ďalší krok: dokončiť fázu 6 · pruh „Archív“ na oba staré demo panely
1. `Artifact` `action: "read"` na developera https://claude.ai/artifact/Thwr8YV58gP7RprXQHRw2Y a realitku https://claude.ai/artifact/TMqLo37PgkvMqetibH7a5P. Výsledok uloží celé HTML do súboru.
   - Developer je bajtovo zhodný s `legacy/panel-developer/index.html` (overené 24. 11.); realitku over `cmp` s `legacy/panel-realitka/index.html`.
2. Pred zmenou treba uložený súbor **celý prečítať** (pravidlo zverejňovania, 2 940 riadkov, Read po častiach). Preto na začiatku čistej session.
3. Jediná zmena: hneď za `<body>` nenápadný pruh, napr. `<div style="background:#EAE6DB;border-bottom:1px solid #0B0B0C;font-family:'Geist Mono',Menlo,monospace;font-size:12px;letter-spacing:1.2px;text-transform:uppercase;padding:10px 16px;text-align:center">Archív. Aktuálny panel: <a href="https://claude.ai/artifact/VZWUmbcEU4WihYycwT3GQK" target="_blank" rel="noopener">First Mate · demo panel →</a></div>`.
4. Publish s `url` daného artefaktu, `file_path` = uložený súbor, `edits` s touto vložkou. Bez `capabilities`, ostatné súbory ostávajú. Panel Immocap sa nemení. Súbory v `legacy/` sa nemenia (sú zmrazená kópia).
5. Zapíš do `docs/rozhodnutia.md` a `legacy/README.md` sa nedotýkaj; uzavri Issue #5 a pokračuj fázou 7 (Issue #6).

## Pravidlá pre panel/
- Výpočty len v `panel/usecases/`. Kľúče výstupu zatiaľ legacy (`s1`…, `f1`…).
- Rozdiely typov: `panel/rozhranie/<typ>.js` alebo `if (DEV)`. Rozdiely klientov: nastavenia + značky `data-rezim`/`data-rozvrh`/`data-kanal`/`data-prikaz`.
- `app.js`: `spusti(typ)` → `pripravZnacky` → `aplikacia(T, koren, signal)`.
- Generátory `docs/migracia/nastroje/rozdel_*.mjs` už nespúšťať.
- UI test trvá asi 4 minúty: v Bash nastav `timeout` 600000.

## Otvorené
- Issues #7, #8 (návrhy, menia čísla), #9–#13 (body z legacy).
- Plugin pre Cowork: First-Mate-Immocap.zip u Branislava.
- Marcelov GitHub účet zatiaľ neznámy.
