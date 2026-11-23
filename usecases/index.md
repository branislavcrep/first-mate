# usecases/

Katalóg use casov First Mate, jeden pre všetky typy firiem. Mení sa tu, nie v kóde panela.

- schema.md — popis polí (spoločné, signál, tip, demo, návrh) a pravidlá (trvalé ID, zlúčenie)
- typy.json — typy firiem: realitka #0B7A5C, developer #1B2CC1, stavebná firma #B45A0A (pripravuje sa); menu, CSV, poradie signálov
- usecases.json — 55 use casov: 17 signálov, 30 tipov (Immocap), 3 demá, 5 návrhov pre stavebnú firmu (príklady)
- export/usecases.csv — export pre Sheets alebo CRM (UTF-8 s BOM, `;`), vzniká `python3 tools/export_usecases.py` alebo `/export-usecases`
