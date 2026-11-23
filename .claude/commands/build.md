---
description: Zostaví panel pre klienta do dist/<klient>/
---
# /build · KOSTRA (naplní sa vo fáze 5 migrácie)

Ak `tools/build.py` ešte neexistuje, povedz, že príkaz bude funkčný po fáze 5, a skonči.

Postup:
1. Klient = $ARGUMENTS (predvolene `demo`). Over, že existuje `klienti/<klient>/nastavenia.json`.
2. Spusti golden testy (`npm test` alebo `python3 tools/test_golden.py`). Ak neprejdú, zastav a ukáž rozdiely.
3. Spusti `python3 tools/build.py <klient>`. Výstup: `dist/<klient>/index.html` (jedna samostatná stránka s vloženým CSS, JS, katalógom, nastaveniami a CSV, ak fáza 1 nerozhodla inak).
4. Ukáž verziu a dátum z päty a veľkosť súboru. `dist/` sa necommituje.
