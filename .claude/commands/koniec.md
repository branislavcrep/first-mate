---
description: Ručne ukončí session podľa CLAUDE.md (hot.md, denník, rozhodnutia, indexy, commit, push)
---
# /koniec · ukončenie session

Urob ukončovaciu rutinu z `CLAUDE.md`:
1. Prepíš `hot.md` (nepridávaj, prepíš; max 500 slov). Staršie veci presuň do denníka.
2. Pridaj riadok do `dennik/RRRR-MM.md`: `- RRRR-MM-DD · meno · čo sa urobilo · prečo`. Meno = Branislav alebo Marcel; ak nevieš, opýtaj sa raz.
3. Rozhodnutia zapíš do `docs/rozhodnutia.md` s dátumom. Neplatné neprepisuj, označ `NEPLATÍ od RRRR-MM-DD`.
4. Aktualizuj `index.md` priečinkov, kde pribudol alebo zmizol súbor.
5. Commitni a pushni na pracovnú vetvu. Do `main` zlúč, len ak prešli testy.
6. Na záver vypíš jednou vetou, čo je v `hot.md` ako ďalší krok.
