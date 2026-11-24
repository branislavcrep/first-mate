# tools/

- first_mate_financny_model.py — referenčný finančný model v Pythone (nezávislá implementácia `FIN.compute`, funkcie `summary`, `signals`) na overenie čísel F1–F6
- hooks/koniec_session.py — hooky Claude Code: `stop` blokuje koniec session pri necommitnutých/nepushnutých zmenách alebo chýbajúcom dnešnom zázname v denníku (raz, potom pustí); `start` vypíše prvých 40 riadkov `hot.md`
- export_usecases.py — kontrola katalógu podľa `usecases/schema.md` a export `usecases/export/usecases.csv`; `--kontrola` len overí (súčasť `npm test`)
- build.py — build panela pre klienta: `python3 tools/build.py <klient> [--vystup dist]` → `dist/<klient>/` (kód panela, katalóg, dáta typov klienta, nastavenia, meta verzie a dátumu, `build.json` so zoznamom súborov); odmietne nevyplnenú šablónu a polia s tajomstvami; verzia z `package.json`
