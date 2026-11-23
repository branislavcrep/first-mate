# First Mate · pracovné pravidlá

First Mate je AI analytik pre real estate od Books & Mirror: zo CSV dát počíta signály (use casy), AI ich vysvetlí a pošle brífing do Slacku a e-mailom. Repozitár je jediný zdroj pravdy. Pracujú v ňom Branislav (vlastník) a Marcel, obaja cez Claude Code v cloude.

Jazyk: slovenčina. Branislavovi a Marcelovi tykaj, klientovi vo všetkých výstupoch vykaj.

## Štart každej session
1. Prečítaj `hot.md`. Nič iné zatiaľ nečítaj.
2. Podľa úlohy prečítaj `index.md` príslušného priečinka a z neho len súbory, ktoré potrebuješ. Nikdy nečítaj celý priečinok ani celý `legacy/` naraz.
3. Kým beží migrácia (pozri `hot.md`), riaď sa `docs/migracia/PLAN.md`.

## Koniec každej session (vždy, aj keď sa nepýtam)
1. Prepíš `hot.md`: NEPRIDÁVAJ, PREPÍŠ. Max 500 slov. Staršie veci presuň do denníka.
2. Pridaj riadok do `dennik/RRRR-MM.md`: `- RRRR-MM-DD · meno · čo sa urobilo · prečo` (meno = Branislav alebo Marcel podľa toho, kto zadáva; ak nevieš, opýtaj sa raz).
3. Rozhodnutia zapíš do `docs/rozhodnutia.md` s dátumom. Neplatné neprepisuj, označ `NEPLATÍ od RRRR-MM-DD`.
4. Aktualizuj `index.md` priečinka, kde pribudol alebo zmizol súbor.
5. Commitni a pushni. Čo nie je v GitHube, po session zmizne. Do `main` zlučuj po úspešných testoch, bez čakania na schválenie (dohoda z 23. 11. 2026).

## Kde čo je
- `hot.md` · čo sa práve deje (teplá pamäť)
- `docs/` · rozhodnutia, architektúra, migrácia, zdroje (index: `docs/index.md`)
- `legacy/` · zmrazené pôvodné panely, len na čítanie a porovnanie (index: `legacy/README.md`)
- `data/<typ>/` · ukážkové CSV podľa typu firmy + `slovnik_dat*.md`
- `usecases/` · katalóg use casov a typov firiem (vznikne v migrácii)
- `panel/` · jadro panela (vznikne v migrácii)
- `klienti/<klient>/` · `nastavenia.json`, `verzie.md` (vznikne v migrácii)
- `tools/` · skripty (build, export, testy, referenčný finančný model)
- `.claude/` · hooky (`settings.json` → `tools/hooks/koniec_session.py`) a príkazy (`commands/`: /novy-klient, /build, /release, /export-usecases, /zverejni-demo, /koniec)
- `dennik/`, `CHANGELOG.md` · denník a verzie
- Úlohy: GitHub Issues v tomto repozitári (nie v markdowne)

## Pravidlá
- Dáta v repozitári sú len fiktívne. Skutočné dáta klientov sem nikdy nedávaj.
- Žiadne tokeny, heslá ani kľúče v súboroch.
- Nič neposielaj do Slacku ani e-mailom bez výslovného súhlasu v chate. Test len do demo kanálov First Mate.
- Pôvodné artefakty (slugy v `legacy/README.md`) neprepisuj. Zmenu na nich rob len so súhlasom.
- Výpočty signálov musia prejsť golden testami (`tests/`) pred zlúčením do `main`.
- Formát CSV zachovaj: UTF-8 s BOM, `;`, desatinná čiarka (pozri `data/slovnik_dat.md`).
- Krátke súbory a indexy pred dlhými výťahmi. História patrí do denníka a gitu, nie do `hot.md`.
