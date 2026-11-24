# Čo sa práve deje

Aktualizované: 2026-11-24 · Branislav (koniec session, nová session nadväzuje tu)

## Kde sme skončili
- Migrácia podľa `docs/migracia/PLAN.md`: fázy 0–5 hotové (Issues #3, #4 uzavreté). Všetko je v `main`, `npm test` aj `npm run test:ui` prechádzajú.
- Panel `panel/` je jedno jadro pre realitku, developera aj klientsky panel. Riadia ho nastavenia klienta `klienti/<klient>/nastavenia.json`; popis polí je v `klienti/_sablona/README.md`.
- Build: `python3 tools/build.py <klient>` → `dist/<klient>/` (viac súborov + `build.json` so zoznamom súborov). Verzia `0.5.0` z `package.json`. `dist/` sa necommituje.
- Klienti:
  - `demo`: prepínač, oba typy, demo Slack kanály;
  - `immocap`: developer, klientsky režim, zhodný s legacy;
  - šablóna `_sablona`.
  Každý má `verzie.md`. Príkazy `/build` a `/novy-klient` sú funkčné.
- UI test porovnáva s legacy aj zostavené `dist/demo` a `dist/immocap`. `npm test` zostaví všetkých klientov naskúšku.

## Teraz: STOP fázy 6 · Branislav skúša demo panel
- Zverejnené: „First Mate · demo panel“ https://claude.ai/artifact/VZWUmbcEU4WihYycwT3GQK (`dist/demo/zverejnenie/`, build 0.5.0, commit e6e4978). Body 1 a 2 nižšie sú hotové.
- Čaká sa na Branislava: vyskúšať panel (oba typy, prepínač, posun dátumov, nahratie CSV, AI brífing) a povoliť testovacie odoslanie do #first-mate-demo / #first-mate-developer. Bez súhlasu nič neposielať.
- Ďalšie zverejnenie: publish toho istého súboru `dist/demo/zverejnenie/index.html` s `root` a `files` podľa `dist/demo/build.json` (bez `url` z tejto session; inak s `url` artefaktu). `.md` súbory s typom `text/markdown`.

## Fáza 6 · zverejnenie a archív (Issue #5)
1. **Zverejnenie.** `python3 tools/build.py demo` a zverejni **nový** artefakt „First Mate · demo panel“ nástrojom Artifact:
   - `index.html` + `files` podľa `dist/demo/build.json`,
   - pred zápisom načítaj skilly `artifact-design` a `artifact-capabilities`,
   - capabilities: `db`, `mcp` (Slack, Gmail; bez Attio, Issue #12), `sample`,
   - nikdy neprepisuj pôvodné artefakty z `legacy/README.md`.
   Over, či v artefakte fungujú ES moduly a `fetch` susedných súborov. Ak nie, build musí vedieť jednu stránku (všetko vložené).
2. Adresu zapíš do `klienti/demo/verzie.md` a `docs/rozhodnutia.md`.
3. **STOP.** Branislav panel vyskúša. Testovacie odoslanie do demo Slacku len po jeho súhlase.
4. Po súhlase:
   - pruh „Archív. Aktuálny panel: <odkaz>“ na oba staré panely (len táto zmena),
   - `/zverejni-demo`,
   - plánovaná úloha na nočné znovuzverejnenie,
   - návrh úpravy skillov `first-mate` a `first-mate-developer` (`docs/migracia/skilly.md`).

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
