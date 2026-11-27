# Čo sa práve deje

Aktualizované: 2026-11-27 · Marcel

## Stav
- Migrácia na jedno jadro je **ukončená** (fázy 0–7, Issues #3–#6 uzavreté). Pracuje sa podľa GitHub Issues; `docs/migracia/` je len história.
- Vydaná verzia **1.0.0** v `main` (commit `2c26f5d`, `CHANGELOG.md`). Testy: `npm test` (golden + build všetkých klientov), `npm run test:ui` (asi 4 min, v Bash `timeout` 600000).
- Tag a release `v1.0.0` sú na GitHube (https://github.com/branislavcrep/first-mate/releases/tag/v1.0.0), tag na commite `7316602` (od `2c26f5d` sa líšia len dokumenty, kód panela je rovnaký). Z cloudu proxy push tagov odmieta (403), tagy robí Branislav cez Releases.
- Ďalšie vydanie: `/release` (pomocník `tools/release.py`).

## Panely a klienti
- Demo: https://claude.ai/artifact/VZWUmbcEU4WihYycwT3GQK, build 1.0.0 (commit `1792661`, verzia artefaktu 1795517376-3b29). Nočná úloha trig_01A5m3w9929SkxEMYNGYpWLv (2:17) ho znovu zverejní len pri zmene súborov panela; ručne `/zverejni-demo`.
- Pôvodné demo panely developera a realitky majú pruh „Archív“ s odkazom na nový panel; ďalej sa nemenia.
- Immocap: beží pôvodný klientsky panel, pokračuje sa **bez pluginu** pre Cowork. Prechod na 1.0.0 (`/build immocap` + zverejnenie) len po dohode s klientom.
- Nový klient: `/novy-klient`.

## Marcel
- Návod: `docs/pre-marcela.md`. GitHub účet: `MarcelK777`, pozvánka do repozitára odoslaná 24. 11., čaká na prijatie (osobný repozitár: spolupracovník má vždy zápis, rola sa nevyberá). Prvá session 27. 11.: vlastná kópia demo panela https://claude.ai/artifact/T6aXN6RU6E6i8KymGXYbsN (súkromná, v Marcelovom účte; Slack a Gmail z nej ešte nevyskúšané, predvolený príjemca e-mailov v paneli je Branislavov Gmail). Ďalší krok: Marcel zadá demo pre developera len so záložkou Brífing (vlastné `klienti/<nazov>/nastavenia.json`: `typ: developer`, `prepinac: false`, v `menu.developer` zapnutý len `brifing`; cvičné dáta podľa zadania), zverejniť ako jeho súkromný artefakt. Slack workspace `firstmate-booksmirror`: pozvánku pošle Branislav (kanály #first-mate-demo, #first-mate-developer).

## Pravidlá pre panel/
- Výpočty len v `panel/usecases/`. Kľúče výstupu zatiaľ legacy (`s1`…, `f1`…). Zmena čísel len cez návrh a golden testy.
- Rozdiely typov: `panel/rozhranie/<typ>.js` alebo `if (DEV)`. Rozdiely klientov: nastavenia + značky `data-rezim`/`data-rozvrh`/`data-kanal`/`data-prikaz`.
- Generátory `docs/migracia/nastroje/rozdel_*.mjs` nespúšťať.

## Otvorené Issues
- #7, #8 návrhy, ktoré menia čísla (čakajú na rozhodnutie).
- #9–#13 body z pôvodných panelov (farba „Konať dnes“, vypnutý signál v brífingoch, kolekcia `zmeny`, Attio v capabilities, Outlook).
- #14 úprava skillov `first-mate` a `first-mate-developer` na nový panel (Branislav na claude.ai, návrh v `docs/migracia/skilly.md`).
