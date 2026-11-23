# tests/

Golden testy: čísla signálov z pôvodných panelov sú zdroj pravdy. Spustenie: `npm test` (Node ≥ 20, python3). Nové golden súbory: `npm run golden` (len po schválenej zmene výpočtu).

- golden/realitka.json — golden výstup realitky: S1–S4 (`suhrn`, celý `vystup` z FM.compute, pravidlové `texty`), stav 2026-11-03 18:00
- golden/developer.json — golden výstup developera: S1–S8 + `financie` F1–F6 (FIN.compute), stav 2026-11-02 18:00
- golden/legacy.mjs — vytiahne moduly FMCSV, FM, FIN a definíciu CSV zo `<script>` v `legacy/*/index.html` a spustí ich s pevným časom
- golden/vypocet.mjs — postup ako `buildData` v paneli (CSV → typed bez posunu → toData), predvolené hranice, `vypocitaj(typ, implementacia)`
- golden/porovnaj.mjs — hĺbkové porovnanie s toleranciou 1e-9 a výpis rozdielov
- golden/financie_python.mjs — krížová kontrola F1–F6 s `tools/first_mate_financny_model.py` (187 hodnôt) a 20 overenými číslami z `legacy/README.md`
- golden/extract.mjs — vytvorí golden súbory (`npm run golden`)
- golden/run.mjs — `npm test`: legacy ↔ golden, Python, README, katalóg use casov a nové jadro `panel/golden.mjs` ↔ golden (prechádza od 24. 11. 2026)

Kontrakt pre nové jadro: `panel/golden.mjs` exportuje `nacitaj(typ, nowMs)` → `{FMCSV, FM, FIN, CSV}` v tvare legacy modulov. `FM_JADRO=legacy` alebo `FM_JADRO=panel` spustí len jednu časť.

## UI test
- ui/porovnaj.mjs — `npm run test:ui`: pôvodný a nový panel v Chromiu (Playwright) s pevným časom, bez AI a konektorov; porovná text všetkých záložiek a náhľad brífingu po „Prepočítať“. Zatiaľ developer; realitka pribudne s prepínačom typov.
