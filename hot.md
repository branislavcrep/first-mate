# Čo sa práve deje

Aktualizované: 2026-11-24 · Branislav (koniec session, nová session nadväzuje tu)

## Kde sme skončili
- Migrácia podľa `docs/migracia/PLAN.md`: fázy 0–3 hotové, **fáza 4 (Issue #3) asi v dvoch tretinách**. Všetko je v `main`, `npm test` aj `npm run test:ui` prechádzajú.
- Hotové vo fáze 4 (`panel/index.md`):
  - výpočtové jadro: `panel/usecases/`, `panel/typy/`, `panel/financie/fin.js`, `panel/jadro/`;
  - jedno rozhranie pre realitku aj developera: `app.js` + objekty typov `panel/rozhranie/<typ>.js`. Značky typov majú `data-typy`, čísla záložiek dopĺňa `app.js`;
  - prepínač typu bez načítania stránky (odkaz „verzia pre …“ v hlavičke), badge vo farbe z `typy.json`;
  - nastavenia klienta `klienti/demo/nastavenia.json` (zatiaľ len `prepinac`, `typy`, `typ`), cesta v meta `fm-nastavenia`.
- UI test (`tests/ui/porovnaj.mjs`) má 4 prípady: developer, realitka (`?typ=realitka`), prepnutie na realitku, prepnutie tam a späť. Porovnáva viditeľný text záložiek, hlavičku, menu, pätu, dialóg dát, posun dátumov a náhľad brífingu so všetkými kartami.

## Ďalší krok: menu z nastavení
1. **Najprv test.** Do `tests/ui/porovnaj.mjs` pridaj prípad s inými nastaveniami (napr. meta `fm-nastavenia` cez dočasný súbor alebo `page.route` na `klienti/demo/nastavenia.json`): vypnutá záložka zmizne, premenovaná má nový názov, poradie a čísla 01, 02… sedia.
2. Menu: `typy.json` → `typy[].menu` (`id`, `nazov`, `zapnute`), klient môže prepísať v `nastavenia.json` (návrh: `menu: { "<typ>": [{ id, nazov?, zapnute? }] }`, poradie podľa poľa).
3. `pripravZnacky` beží pred načítaním katalógu. Menu potrebuje `typy.json`, preto katalóg načítaj pred `pripravZnacky` (je v pamäti `katalogP`). Záložky, ktoré typ nemá v menu, odstráň vrátane sekcie `#v-<id>`. Záložka `tipy` zatiaľ nemá sekciu, príde s klientskym režimom.
4. Hotovo, keď UI test so štandardnými nastaveniami ostane zhodný s legacy a nový prípad prejde.

## Potom (zvyšok fázy 4)
1. Klientsky režim podľa `legacy/panel-klient-immocap/` ako nastavenia: `potvrdenie_pred_odoslanim`, `signaly_len_na_citanie`, `zalozka_tipy`, `email` (Gmail/Outlook), `rozvrh: "planovana-uloha"`, názov klienta, bez adries Books & Mirror.
2. Päta „First Mate vX.Y.Z · zostavené RRRR-MM-DD“: zatiaľ z meta, build vo fáze 5 ju prepíše.
3. Otvorené body z `legacy/README.md` zapísať ako Issues.
4. Potom fáza 5 (build, klienti) podľa plánu.

## Pravidlá pre panel/
- Výpočty len v `panel/usecases/`. Kľúče výstupu zatiaľ legacy (`s1`…, `f1`…).
- Rozdiely typov patria do `panel/rozhranie/<typ>.js` alebo do malých vetiev `if (DEV)`, nie do kópií funkcií.
- `app.js`: všetko v `aplikacia(T, koren, signal)`. `$` hľadá v `koren` (body daného behu), globálne poslucháče majú `{ signal }`. Vnútorná IIFE nie je preodsadená (zámerne, malý diff).
- Generátory `docs/migracia/nastroje/rozdel_*.mjs` už nespúšťať: prepísali by ručné úpravy.
- Lokálne: `python3 -m http.server` v koreni, potom `/panel/index.html` (realitka `?typ=realitka`).

## Otvorené
- Issues #7, #8: návrhy na neskôr, menia čísla.
- Plugin pre Cowork: First-Mate-Immocap.zip u Branislava.
- Marcelov GitHub účet zatiaľ neznámy.
