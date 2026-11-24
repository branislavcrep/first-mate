# Čo sa práve deje

Aktualizované: 2026-11-24 · Branislav

## Stav
- Migrácia na jedno jadro je **ukončená** (fázy 0–7, Issues #3–#6 uzavreté). Pracuje sa podľa GitHub Issues; `docs/migracia/` je len história.
- Vydaná verzia **1.0.0** v `main` (commit `2c26f5d`, `CHANGELOG.md`). Testy: `npm test` (golden + build všetkých klientov), `npm run test:ui` (asi 4 min, v Bash `timeout` 600000).
- Tag `v1.0.0` treba vytvoriť na GitHube: Releases → Draft a new release → tag `v1.0.0` (nový) → target `main` → text z `CHANGELOG.md` → Publish. Z cloudu proxy push tagov odmieta (403).
- Ďalšie vydanie: `/release` (pomocník `tools/release.py`).

## Panely a klienti
- Demo: https://claude.ai/artifact/VZWUmbcEU4WihYycwT3GQK, zatiaľ build 0.5.0. Nočná úloha trig_01A5m3w9929SkxEMYNGYpWLv (2:17) ho zverejní ako 1.0.0; ručne `/zverejni-demo`.
- Pôvodné demo panely developera a realitky majú pruh „Archív“ s odkazom na nový panel; ďalej sa nemenia.
- Immocap: beží pôvodný klientsky panel, pokračuje sa **bez pluginu** pre Cowork. Prechod na 1.0.0 (`/build immocap` + zverejnenie) len po dohode s klientom.
- Nový klient: `/novy-klient`.

## Marcel
- Návod: `docs/pre-marcela.md`. Čaká sa na jeho GitHub účet; Branislav pošle pozvánku do repozitára a do Slack workspace `firstmate-booksmirror`.

## Pravidlá pre panel/
- Výpočty len v `panel/usecases/`. Kľúče výstupu zatiaľ legacy (`s1`…, `f1`…). Zmena čísel len cez návrh a golden testy.
- Rozdiely typov: `panel/rozhranie/<typ>.js` alebo `if (DEV)`. Rozdiely klientov: nastavenia + značky `data-rezim`/`data-rozvrh`/`data-kanal`/`data-prikaz`.
- Generátory `docs/migracia/nastroje/rozdel_*.mjs` nespúšťať.

## Otvorené Issues
- #7, #8 návrhy, ktoré menia čísla (čakajú na rozhodnutie).
- #9–#13 body z pôvodných panelov (farba „Konať dnes“, vypnutý signál v brífingoch, kolekcia `zmeny`, Attio v capabilities, Outlook).
- #14 úprava skillov `first-mate` a `first-mate-developer` na nový panel (Branislav na claude.ai, návrh v `docs/migracia/skilly.md`).
