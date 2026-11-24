# Čo sa práve deje

Aktualizované: 2026-11-24 · Branislav (koniec session, nová session nadväzuje tu)

## Kde sme skončili
- Migrácia podľa `docs/migracia/PLAN.md`: fázy 0–4 hotové (Issue #3 uzavreté). Všetko je v `main`, `npm test` aj `npm run test:ui` prechádzajú.
- Panel `panel/` (`panel/index.md`) je jedno jadro pre realitku, developera aj klientsky panel. Všetko riadia nastavenia klienta `klienti/<klient>/nastavenia.json` (meta `fm-nastavenia`):
  - typ a prepínač,
  - menu,
  - klientsky režim (`rezim`, potvrdenie, signály len na čítanie, tipy, rozvrh, `slack.prikaz`, e-mailové šablóny, `predvolene`).
  Popis polí: `docs/rozhodnutia.md` (24. 11.).
- Klienti: `klienti/demo/` (prepínač, oba typy) a `klienti/immocap/` (developer, klientsky režim, zhodný s legacy Immocap). Index `klienti/index.md`.
- UI test: porovnanie s legacy (developer, realitka, prepnutia, Immocap) + nastavenia cez `page.route` (menu, klientsky režim realitky, nahratie CSV, mock konektory).
- Otvorené body z legacy sú Issues #9–#13.

## Ďalší krok: fáza 5 · build a klienti (Issue #4)
1. **Šablóna nastavení.** Doplň `klienti/demo/nastavenia.json`:
   - názov, demo Slack kanály, Gmail,
   - `rezim: "demo"`.
   Zváž `klienti/_sablona/nastavenia.json` pre `/novy-klient`.
2. **`tools/build.py <klient>` → `dist/<klient>/`.**
   - Fáza 1 rozhodla: artefakt môže mať viac súborov, jedna stránka nie je nutná.
   - Build skopíruje `panel/`, potrebné `data/<typ>/`, `usecases/` a nastavenia klienta.
   - Nastaví meta `fm-koren` a `fm-nastavenia` na cesty v `dist/`, `fm-verzia` (zatiaľ napr. `0.5.0`, v1.0.0 až vo fáze 7) a `fm-zostavene`.
   - `dist/` do `.gitignore`.
3. **Test buildu.** `dist/immocap/` musí dať v UI teste to isté ako `legacy/panel-klient-immocap/`. Pridaj prípad, ktorý otvorí zostavenú stránku. Pozor: legacy Immocap čerpá dáta z `data/developer/`, server v teste to mapuje.
4. **`/novy-klient`** (`.claude/commands/novy-klient.md`):
   - otázky (názov, typ, prepínač, e-mail Gmail/Outlook, Slack kanály, tím),
   - vytvorí `klienti/<klient>/`, zapíše ho do `klienti/index.md` a spustí build,
   - založí Issue „Inštalácia <klient>“ a `verzie.md`.
5. Commit, denník, hot.md. Fáza 5 nemá STOP. Ďalší STOP je vo fáze 6 (Branislav skúša zverejnený demo panel).

## Pravidlá pre panel/
- Výpočty len v `panel/usecases/`. Kľúče výstupu zatiaľ legacy (`s1`…, `f1`…).
- Rozdiely typov patria do `panel/rozhranie/<typ>.js` alebo do vetiev `if (DEV)`. Rozdiely klientov patria do nastavení a značiek `data-rezim`/`data-rozvrh`, nie do kópií.
- `app.js`: `spusti(typ)` → `pripravZnacky` → `aplikacia(T, koren, signal)`. `$` hľadá v `koren`, globálne poslucháče majú `{ signal }`.
- Generátory `docs/migracia/nastroje/rozdel_*.mjs` už nespúšťať.
- UI test trvá asi 3 minúty: v Bash nastav `timeout` 600000.
- Lokálne: `python3 -m http.server` v koreni, potom `/panel/index.html` (`?typ=realitka`).

## Otvorené
- Issues #7, #8 (návrhy, menia čísla), #9–#13 (body z legacy).
- Plugin pre Cowork: First-Mate-Immocap.zip u Branislava.
- Marcelov GitHub účet zatiaľ neznámy.
