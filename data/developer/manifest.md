# Manifest · First Mate demo · developer

- export_at: 2026-11-19T12:53
- referencny_datum: 2026-11-02
- zdroj: Attio, workspace books-mirror (len čítanie); finančné súbory simulované 19. 11. 2026
- casova_zona: Europe/Bratislava

`export_at` je čas exportu (miestny čas). `referencny_datum` je deň, ku ktorému dáta opisujú stav (deň posledného dopytu). Panel pri zapnutom posune posunie všetky dátumy o rozdiel medzi dneškom a referenčným dátumom, aby demo neostarlo. Stĺpce `created_at` sa neposúvajú.

| Súbor | Záznamy | Zdroj | Poznámka |
|---|---|---|---|
| dev_projekty.csv | 2 | objekt dev_projekty v Attio | + 6 finančných stĺpcov (DPH, záloha, cieľové IRR, vlastný kapitál), simulované |
| dev_jednotky.csv | 63 | objekt dev_jednotky v Attio | |
| dev_dopyty.csv | 41 | objekt dev_dopyty v Attio | |
| dev_uver.csv | 2 | simulované (úverová zmluva) | voliteľný |
| dev_tranze.csv | 9 | simulované (úverová zmluva, výpis z banky) | voliteľný |
| dev_podmienky_cerpania.csv | 14 | simulované (úverová zmluva) | voliteľný |
| dev_rozpocet.csv | 18 | simulované (controlling) | voliteľný, sumy bez DPH |
| dev_cashflow.csv | 205 | simulované (controlling, účtovníctvo) | voliteľný, sumy bez DPH, skutočnosť do 10/2026 |

Kontrola väzieb: všetky kódy vo väzbách existujú v cieľovom súbore (0 chýbajúcich).
