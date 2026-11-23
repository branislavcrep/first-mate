# panel/

Jedno jadro panela First Mate (fáza 4 migrácie). Hotové: výpočtové jadro a rozhranie pre typy developer a realitka (oba zhodné s legacy, `npm run test:ui`). Typ sa zatiaľ volí v adrese: `index.html` = developer, `index.html?typ=realitka`. Pribudne: prepínač typov, menu a klientsky režim z nastavení, päta s verziou.

Lokálne: `python3 -m http.server` v koreni repozitára a otvoriť `/panel/index.html` (dáta a katalóg číta z `../`, meta `fm-koren`).

- index.html — značky panela (záložky Brífing … Architektúra), načíta styles.css a app.js; prvky len pre niektorý typ majú `data-typy="…"`, čísla záložiek dopĺňa app.js
- styles.css — dizajn Books & Mirror (papier #F9F9F5, atrament #0B0B0C, modrá #1B2CC1, Geist)
- app.js — aplikácia (ES modul), jedna pre všetky typy: vyberie objekt typu (`?typ=`), odstráni značky iných typov, načíta katalóg, nastaví signály podľa typy.json, dáta z data/<typ>/, db, mcp (Slack, Gmail), sample; rozdiely typov v objekte typu alebo vo vetvách `if (DEV)`
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
