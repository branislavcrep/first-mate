# panel/

Jedno jadro panela First Mate (fáza 4 migrácie, hotová 24. 11. 2026): výpočtové jadro a rozhranie pre typy developer a realitka aj klientsky panel Immocap, všetko zhodné s legacy (`npm run test:ui`). Typ a prepínač určujú nastavenia klienta (`klienti/<klient>/nastavenia.json`, meta `fm-nastavenia`): pri `prepinac: true` odkaz v hlavičke prepne typ bez načítania stránky a `?typ=realitka` otvorí rovno realitku; bez prepínača je panel zamknutý na typ z nastavení. Z nastavení ďalej: menu (`menu.<typ>`: zapnutie, poradie, názvy; `zalozka_tipy`), klientsky režim (`rezim: "klient"`, `nazov`, `potvrdenie_pred_odoslanim`, `signaly_len_na_citanie`, `rozvrh: "planovana-uloha"`, `slack.prikaz`, `slack.kanaly`, `email` so šablónami, `predvolene` vrátane `tim`). Popis polí: `klienti/_sablona/README.md`. Päta ukazuje verziu z meta `fm-verzia` a `fm-zostavene` (doplní build vo fáze 5).

Lokálne: `python3 -m http.server` v koreni repozitára a otvoriť `/panel/index.html` (dáta a katalóg číta z `../`, meta `fm-koren`).

- index.html — značky panela (záložky Brífing … Architektúra), načíta styles.css a app.js; prvky len pre niektorý typ alebo režim majú `data-typy`, `data-rezim`, `data-rozvrh`; `data-prikaz` = príkaz v Claude; čísla záložiek dopĺňa app.js; záložka Čo vyskúšať (`#v-tipy`) a potvrdzovacie okno (`#cfOv`)
- styles.css — dizajn Books & Mirror (papier #F9F9F5, atrament #0B0B0C, modrá #1B2CC1, Geist)
- app.js — aplikácia (ES modul), jedna pre všetky typy: načíta nastavenia klienta, vyberie objekt typu, `spusti(typ)` postaví značky zo šablóny (pri prepnutí znova, staré poslucháče zruší), odstráni značky iných typov, načíta katalóg, nastaví signály podľa typy.json, dáta z data/<typ>/, db, mcp (Slack, Gmail), sample; rozdiely typov v objekte typu alebo vo vetvách `if (DEV)`
- rozhranie/realitka.js — objekt typu realitka pre rozhranie: popisy signálov S1–S4, texty „Dnes“, tím (makléri, roly), db `fm/…`, súhrn priebehu
- rozhranie/developer.js — objekt typu developer: signály S1–S8 a F1–F6, zdroje dát, texty „Dnes“, tím (predajcovia, roly vrátane financií), db `fmdev/…`
- jadro/csv.js — CSV loader FMCSV (BOM, `;`, desatinná čiarka, dátumy v čase Europe/Bratislava), spoločný pre všetky typy
- jadro/signaly.js — register modulov use casov a `zostavSignaly(typ, katalog, typy, pole)`: poradie z `usecases/typy.json`, kľúč výstupu z `legacy` v katalógu
- typy/realitka.js — typ realitka: normalizácia dát, kontext signálov, texty brífingu, šablóny e-mailu a Slacku, definícia CSV a `toData(raw, teraz)`
- typy/developer.js — typ developer: to isté + štatistiky projektov a vlastné signály (pravidlá)
- financie/fin.js — finančný model developera (úver, tranže, rozpočet, cash-flow, IRR, stres test) a finančný brífing
- usecases/<id>.js — výpočet jedného use casu (17 súborov), funkcia pre každý typ firmy (`realitka(c)`, `developer(c)`); `dopyty-bez-reakcie.js` má obe
- golden.mjs — adaptér pre `npm test`: nové jadro musí dať rovnaký výstup ako golden súbory

Vzniklo generátorom `docs/migracia/nastroje/rozdel_legacy.mjs` (24. 11. 2026); odvtedy sa upravuje ručne. Pravidlá: výpočty len v `usecases/`, každá zmena musí prejsť `npm test`.
