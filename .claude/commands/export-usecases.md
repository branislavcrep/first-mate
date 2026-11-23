---
description: Exportuje katalóg use casov do CSV
---
# /export-usecases · KOSTRA (naplní sa vo fáze 3 migrácie)

Ak `tools/export_usecases.py` ešte neexistuje, povedz, že príkaz bude funkčný po fáze 3, a skonči.

Postup:
1. Over, že `usecases/usecases.json` je platný JSON a každý záznam má povinné polia podľa `usecases/schema.md`.
2. Spusti `python3 tools/export_usecases.py` → `usecases/export/usecases.csv` (UTF-8 s BOM, `;`; stĺpce id, nazov, druh, typy, kategoria, stav, vypocet, zdroje_dat, popis).
3. Ukáž počty podľa druhu a typu firmy. Commitni export.
