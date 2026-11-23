# Katalóg use casov · schéma

Katalóg je jeden pre všetky typy firiem a žije mimo kódu panela:

- `usecases/typy.json` · typy firiem (názov, farba badgeu, menu, potrebné CSV, poradie signálov),
- `usecases/usecases.json` · use casy (signály, tipy, demá, návrhy),
- `usecases/export/usecases.csv` · export pre Sheets alebo CRM (`/export-usecases`, `tools/export_usecases.py`).

Kontrolu schémy robí `python3 tools/export_usecases.py --kontrola` (spúšťa ju aj `npm test`).

## usecases.json · hlavička

| Pole | Popis |
|---|---|
| `verzia` | dátum poslednej zmeny katalógu `RRRR-MM-DD` |
| `kategorie` | povolené kategórie `[{id, nazov}]` |
| `urovne` | úrovne tipov `[{id, nazov}]` (z `tipy.json` Immocap) |
| `temy` | témy tipov `[{id, nazov}]` |
| `miesta` | kde sa tip skúša, kľúč → popis (`cowork`, `brifing`, `reset`, `slack`, `panel`) |
| `usecases` | pole záznamov, poradie nie je záväzné (poradie signálov určuje `typy.json`) |

## Záznam use casu · spoločné polia

| Pole | Povinné | Popis |
|---|---|---|
| `id` | áno | trvalé ID podľa obsahu, malé písmená a pomlčky, napr. `dopyty-bez-reakcie`. Nikdy sa nemení (viažu sa naň nastavenia klientov a stav „Vyskúšané“). |
| `nazov` | áno | krátky názov pre klienta |
| `druh` | áno | `signal` (počíta sa z dát, má úroveň), `tip` (čo vyskúšať v Claude), `demo` (scenár ukážky), `navrh` (nápad, zatiaľ nepostavený) |
| `typy` | áno | pole typov firiem z `typy.json`, napr. `["realitka", "developer"]` (badge v paneli) |
| `kategoria` | áno | id z `kategorie`: `predaj`, `financie`, `tim`, `vseobecne`, `stavba` |
| `popis` | áno | 1–2 vety pre klienta (vykať). Ak sa líši podľa typu: objekt `{ "realitka": "…", "developer": "…" }`. |
| `stav` | áno | `hotovy` (funguje v paneli alebo v Claude) alebo `navrh` |
| `suvisi` | nie | ID súvisiacich use casov (napr. tip → signál) |
| `poznamka` | nie | interná poznámka pre Branislava a Marcela (klientovi sa neukazuje) |
| `priklad` | nie | `true` pri ilustračných návrhoch (stavebná firma); v paneli sa označí „Príklad“ |

## Signál (`druh: "signal"`)

| Pole | Povinné | Popis |
|---|---|---|
| `parametre` | áno | pole `{kluc, nazov, min, max, predvolene, jednotka?}`. `kluc` = názov poľa v nastaveniach signálu (napr. `hours`). `predvolene` je číslo, alebo objekt podľa typu `{ "realitka": 48, "developer": 24 }`. Prázdne pole = signál bez parametrov. |
| `zdroje_dat` | áno | odkiaľ sú dáta: `{ "systemy": [{system, co}], "csv": ["súbor.csv"] }`. Ak sa líšia podľa typu: objekt `{ "realitka": {…}, "developer": {…} }`. |
| `vypocet` | áno | `{ "modul": "panel/usecases/<id>.js" }` (výpočet v kóde jadra), alebo `{ "pravidlo": {…} }` (jednoduché pravidlo ako vlastné signály: objekt, podmienky). Kým nie je jadro, všetky signály sú moduly. |
| `uroven` | áno | ako sa určí farba: text, napr. „červená, ak je aspoň jeden dopyt; inak zelená“ |
| `legacy` | áno pri `hotovy` | kľúč v pôvodnom paneli podľa typu, napr. `{ "realitka": "s1", "developer": "s4" }`. Podľa neho golden testy (`tests/golden/`) porovnajú nové jadro. |

## Tip (`druh: "tip"`)

| Pole | Povinné | Popis |
|---|---|---|
| `otazka` | áno | čo klient napíše alebo urobí (presný text) |
| `kde` | áno | kľúč z `miesta` |
| `co_urobi` | áno | čo First Mate urobí |
| `meni_data` | áno | `true`, ak tip zapisuje do dát (v klientskom paneli sa označí) |
| `uroven` | áno | id z `urovne` |
| `tema` | áno | id z `temy` |
| `overenie` | nie | interný záznam, čo dáta na otázku odpovedajú (klientovi sa neukazuje) |
| `legacy` | nie | pôvodné ID tipu, napr. `{ "immocap": "t01" }` (viaže sa naň stav „Vyskúšané“ v `fmdev/checklist`) |

## Demo (`druh: "demo"`)

| Pole | Povinné | Popis |
|---|---|---|
| `kroky` | áno | pole krokov scenára v poradí (čo sa ukáže a čo urobí First Mate) |
| `zdroje_dat` | áno | ako pri signáli; môže uviesť aj konektory (Slack, Gmail, Attio) |
| `konektory` | nie | potrebné konektory, napr. `["Slack", "Gmail"]` |

## Návrh (`druh: "navrh"`)

Ako signál, ale `parametre`, `zdroje_dat`, `vypocet` a `uroven` sú nepovinné a `stav` je vždy `navrh`. Ilustračné návrhy majú `priklad: true`.

## Pravidlá
- ID sa nemení ani pri premenovaní. Zrušený use case sa nemaže, dostane `"stav": "navrh"` a poznámku, alebo sa označí v `docs/rozhodnutia.md`.
- Zlúčenie use casov rovnakého významu z dvoch typov do jedného záznamu len vtedy, keď je logika výpočtu rovnaká (overené v kóde); rozdiel v hraniciach rieši `predvolene` podľa typu.
- Texty pre klienta vykajú.
