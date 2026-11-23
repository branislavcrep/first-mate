# Čo sa práve deje

Aktualizované: 2026-11-24 · Branislav (session v Claude Code v cloude)

## Aktívne
- Migrácia na jedno jadro podľa `docs/migracia/PLAN.md`. Fázy 0–3 hotové. **Fáza 4 (Issue #3) beží**, všetko doterajšie je v `main`.
- Fáza 4 hotové:
  - výpočtové jadro `panel/` (17 modulov `panel/usecases/<id>.js`, typy realitka a developer, finančný model, register podľa katalógu); `npm test` → `panel/golden.mjs` = golden pre oba typy,
  - rozhranie `panel/index.html`, `styles.css`, `app.js` pre typ developer; `npm run test:ui` = všetky záložky a náhľad brífingu zhodné s legacy.
- Fáza 4 zostáva (v tomto poradí):
  1. Realitka v tom istom `app.js`: typové časti (menu bez Projekty/Financie, makléri, obdobie `period`, Slack #first-mate-demo, `fm/settings`) z `legacy/panel-realitka/index.html` app skriptu (riadky ~1135–1759) ako vetvy podľa `TYP`; UI test rozšíriť o realitku (teraz 2026-11-03T17:00:00Z).
  2. Prepínač typu firmy (`prepinac: true`): vymení dáta, menu, use casy; farba badgeu z `typy.json`.
  3. Menu z nastavení (zapnutie, poradie, názvy, čísla 01, 02… samy).
  4. Klientsky režim ako nastavenia podľa `legacy/panel-klient-immocap/` (potvrdenie pred odoslaním, signály len na čítanie, záložka tipy z katalógu, e-mail šablóny Gmail/Outlook, rozvrh = plánovaná úloha, názov klienta, bez adries Books & Mirror).
  5. Päta „First Mate vX.Y.Z · zostavené RRRR-MM-DD“.
  6. Otvorené body z `legacy/README.md` zapísať ako Issues (modrá farba čísla, vypnutý signál v brífingu, zmeny, Attio v capabilities).
- Pôvodné panely bežia ďalej (slugy v `legacy/README.md`).

## Ako pracovať v panel/
- Výpočty len v `panel/usecases/`; kľúče výstupu sú zatiaľ legacy (`s1`…, `f1`…) kvôli textom.
- Generátory `docs/migracia/nastroje/rozdel_*.mjs` už nespúšťať (prepísali by ručné úpravy).
- Pred zlúčením do `main`: `npm test` aj `npm run test:ui`.
- Lokálne: `python3 -m http.server` v koreni, otvoriť `/panel/index.html`.

## Otvorené otázky
- Návrhy na neskôr: Issues #7 (čas prvej reakcie pre developera), #8 (zaujem-bez-akcie, vypredané typy).
- Plugin First Mate pre Cowork (fm.py, fin_model.py): balík First-Mate-Immocap.zip u Branislava.
- Marcelov GitHub účet zatiaľ neznámy. Farby štítkov v GitHube sivé.

## Kam ísť ďalej
- panel/index.md · tests/index.md · usecases/index.md · docs/rozhodnutia.md · docs/migracia/PLAN.md (fáza 4)
