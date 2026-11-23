# Manifest · First Mate demo · realitka

- export_at: 2026-11-19T12:53
- referencny_datum: 2026-11-03
- zdroj: Attio, workspace books-mirror (len čítanie)
- casova_zona: Europe/Bratislava

`export_at` je čas exportu (miestny čas). `referencny_datum` je deň, ku ktorému dáta opisujú stav (deň posledného dopytu). Panel pri zapnutom posune posunie všetky dátumy o rozdiel medzi dneškom a referenčným dátumom, aby demo neostarlo. Stĺpce `created_at` sa neposúvajú.

| Súbor | Záznamy | Attio | Overené v Attio |
|---|---|---|---|
| nehnutelnosti.csv | 40 | objekt deals | 40 (run-basic-report / list-tasks) |
| dopyty.csv | 447 | zoznam dopyty | 447 (run-basic-report / list-tasks) |
| obhliadky.csv | 171 | zoznam obhliadky | 171 (run-basic-report / list-tasks) |
| kontakty.csv | 237 | objekt people | 237 (run-basic-report / list-tasks) |
| firmy.csv | 11 | objekt companies | 11 (run-basic-report / list-tasks) |
| ulohy.csv | 5 | úlohy (tasks) | 5 (run-basic-report / list-tasks) |

Kontrola väzieb: všetky kódy vo väzbách existujú v cieľovom súbore (0 chýbajúcich).
