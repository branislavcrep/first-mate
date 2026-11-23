# panel/

Jedno jadro panela First Mate (fáza 4 migrácie). Zatiaľ hotové výpočtové jadro; rozhranie (index.html, styles.css, app.js) pribudne.

- jadro/csv.js — CSV loader FMCSV (BOM, `;`, desatinná čiarka, dátumy v čase Europe/Bratislava), spoločný pre všetky typy
- jadro/signaly.js — register modulov use casov a `zostavSignaly(typ, katalog, typy, pole)`: poradie z `usecases/typy.json`, kľúč výstupu z `legacy` v katalógu
- typy/realitka.js — typ realitka: normalizácia dát, kontext signálov, texty brífingu, šablóny e-mailu a Slacku, definícia CSV a `toData(raw, teraz)`
- typy/developer.js — typ developer: to isté + štatistiky projektov a vlastné signály (pravidlá)
- financie/fin.js — finančný model developera (úver, tranže, rozpočet, cash-flow, IRR, stres test) a finančný brífing
- usecases/<id>.js — výpočet jedného use casu (17 súborov), funkcia pre každý typ firmy (`realitka(c)`, `developer(c)`); `dopyty-bez-reakcie.js` má obe
- golden.mjs — adaptér pre `npm test`: nové jadro musí dať rovnaký výstup ako golden súbory

Vzniklo generátorom `docs/migracia/nastroje/rozdel_legacy.mjs` (24. 11. 2026); odvtedy sa upravuje ručne. Pravidlá: výpočty len v `usecases/`, každá zmena musí prejsť `npm test`.
