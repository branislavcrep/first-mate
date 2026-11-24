---
description: Zostaví panel pre klienta do dist/<klient>/
---
# /build

Zostaví panel First Mate pre klienta. Klient = $ARGUMENTS (predvolene `demo`; viac klientov oddeľ medzerou).

1. Over, že existuje `klienti/<klient>/nastavenia.json`. Ak nie, ponúkni `/novy-klient` a skonči.
2. Spusti `npm test` (golden testy + build všetkých klientov naskúšku). Ak neprejde, zastav a ukáž rozdiely; nebuduj.
3. Spusti `python3 tools/build.py <klient>`. Výstup:
   - `dist/<klient>/` = `index.html`, kód panela, katalóg `usecases/*.json`, `data/<typ>/` len pre typy klienta, `nastavenia.json`,
   - `dist/<klient>/build.json` = verzia, dátum, commit, zoznam súborov (podklad pre zverejnenie).
4. Ukáž riadok z výstupu buildu (verzia, dátum, počet súborov, veľkosť, commit). Ak commit končí `+necommitnuté`, upozorni, že zostava obsahuje necommitnuté zmeny.
5. Ak chce používateľ panel vidieť: `python3 -m http.server` v `dist/<klient>/` a otvoriť `/index.html`, alebo `npm run test:ui` (porovná zostavené `demo` a `immocap` s pôvodnými panelmi).
6. `dist/` sa necommituje (je v `.gitignore`). Zverejnenie je samostatný krok (`/zverejni-demo`, fáza 6), nič sa neposiela do Slacku ani e-mailom.

Verzia v päte je z `package.json` (`version`), mení ju `/release`. Popis polí nastavení: `klienti/_sablona/README.md`.
