---
description: Exportuje katalóg use casov do CSV
---
# /export-usecases

1. Spusti `python3 tools/export_usecases.py`. Skontroluje `usecases/usecases.json` a `usecases/typy.json` podľa `usecases/schema.md` a zapíše `usecases/export/usecases.csv` (UTF-8 s BOM, `;`; stĺpce id, nazov, druh, typy, kategoria, stav, vypocet, zdroje_dat, popis).
2. Ak kontrola nájde chyby, ukáž ich a nič neexportuj. Oprav katalóg, nie kontrolu.
3. Ukáž počty podľa druhu a typu firmy (vypíše ich skript).
4. Spusti `npm test`, commitni katalóg aj export spolu.
