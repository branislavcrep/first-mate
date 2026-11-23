# legacy/ · pôvodné panely First Mate (zmrazené 23. 11. 2026)

Presné kópie súborov artefaktov k 23. 11. 2026. Slúžia na čítanie, porovnanie a golden testy. Needitovať.

| Priečinok | Artefakt | Odkaz | Slug | Verzia |
|---|---|---|---|---|
| `panel-developer/` | First Mate · ovládací panel developera | https://claude.ai/artifact/Thwr8YV58gP7RprXQHRw2Y | d845281b-5b82-4aff-b8f7-3e43d5551111 | 1795113884-acb1 |
| `panel-realitka/` | First Mate · ovládací panel realitky | https://claude.ai/artifact/TMqLo37PgkvMqetibH7a5P | d576459c-fb81-491e-96bf-8b9c56cf6492 | 1795093556-5637 |
| `panel-klient-immocap/` | First Mate · môj panel (klientska verzia developera pre Immocap, a.s.) | https://claude.ai/artifact/3A7693simWj3U4Ljnt8nAa | 1177b936-2cc1-48af-8ece-931ef44926e7 | 1795164301-677f |

Dáta klientskeho panela sú bajtovo rovnaké ako `panel-developer/data/`, preto nie sú skopírované znova.

## Ako panely fungujú

- Jedna stránka `index.html` (CSS aj JS vnútri, dizajn Books & Mirror: papier #F9F9F5, atrament #0B0B0C, modrá #1B2CC1, písmo Geist). Dáta sa načítajú `fetch` relatívnou cestou `data/*.csv`.
- CSV loader `FMCSV`: BOM, `;`, úvodzovky, desatinná čiarka, `ano`/`nie`, `|`; typy podľa `CSV.spec` (finančné súbory v `CSV.optional`); `RRRR-MM-DDTHH:MM` je miestny čas Europe/Bratislava.
- Posun dátumov: prepínač „Posunuté k dnešku / Pôvodné dátumy“. Posun = dnes − `referencny_datum` z `data/manifest.md` (developer 2026-11-02, realitka 2026-11-03). Posúvajú sa všetky dátumové stĺpce okrem `created_at` (aj `mesiac` v cash-flow).
- Výpočet signálov: modul `FM` (`FM.compute(data, S.signals, now)`), financie modul `FIN` (samostatný `<script>` za `FM`, `FIN.compute`). Texty signálov v poliach `SIG` a `FSIG`, zdroje dát v `SRC`, vlastné signály používateľa (`custom`, „Pridať signál“) s pravidlom `describeRule`.
- AI interpretácia cez `sample` (druhý pokus po 1,5 s, pri zlyhaní pravidlový text), náhľad, odoslanie do Slacku a Gmailu cez konektory (`mcp`), nastavenia v databáze artefaktu (`db`). Deklarované capabilities: db, mcp (Attio – už nepoužívané, Slack, Gmail), sample.
- „Nahrať vlastné CSV“: iba v pamäti prehliadača, kontrola stĺpcov, „Späť na ukážku“.

## Rozdiely medzi panelmi

| | Realitka | Developer |
|---|---|---|
| Pre koho | realitná kancelária, predáva cudzie nehnuteľnosti | developer, predáva vlastné jednotky v projektoch |
| Dáta | 40 nehnuteľností, 447 dopytov, 171 obhliadok, 6 maklérov | 2 projekty (PL Rezidencia Pod Lesom, NZ Nové Záhrady Senec), 63 jednotiek, 41 dopytov, 3 predajcovia + simulované financie |
| Signály predaja | S1 Dopyty bez reakcie, S2 Čas prvej reakcie, S3 Záujem bez obhliadky, S4 Končiace exkluzivity | S1 Podmienka banky, S2 Zálohy po splatnosti, S3 Končiace rezervácie, S4 Dopyty bez reakcie, S5 Obhliadky bez ďalšieho kroku, S6 Klientske zmeny, S7 Ležiaky a vypredané typy, S8 Obchodné priestory |
| Finančné signály | – | F1 Podmienky čerpania tranží, F2 Krytie úveru zmluvami, F3 Potrebné tempo predaja, F4 Rozpočet a rezerva, F5 IRR projektu a vlastného kapitálu, F6 Stres test |
| Menu | 01 Brífing, 02 Tím, 03 Signály, 04 Rozvrh, 05 Architektúra | 01 Brífing, 02 Projekty, 03 Financie, 04 Tím, 05 Signály, 06 Rozvrh, 07 Architektúra |
| Osobný brífing | makléri | predajcovia; majiteľ/financie dostáva finančný brífing (len e-mail) |
| Slack | #first-mate-demo (C0CDGG5MY0Y), `/first-mate` | #first-mate-developer (C0CDY6XG8MR), `/first-mate-dev` |
| Skill | `first-mate` | `first-mate-developer` (finančné súbory nepozná) |

Kľúče `s1`…`s4` znamenajú v každom paneli niečo iné. V katalógu dostanú use casy trvalé ID podľa obsahu.

## Overené čísla (golden príbeh, stav k 2. 11. 2026, bez posunu dátumov)

- PL: tranža T-PL-4 (1,2 mil. €, 25. 11.) má 2 nesplnené podmienky (krytie po čerpaní 1,39× z 1,45×, chýbajú zmluvy za 319 500 €; potvrdený rozpočet TDI); rezerva minutá na 106,7 % pri 53,9 % dokončenia stavby; IRR VK 23,9 % (plán 22,4 %, cieľ 18 %), stres „všetko naraz“ 14,6 %.
- NZ: T-NZ-2 o 49 dní neskôr pri dnešnom tempe (+33 800 € vlastných zdrojov); po čerpaní T-NZ-2 krytie 0,78× pod kovenantom 1,2×; IRR VK 15,0 % (plán 21,4 %, cieľ 18 %).
- `tools/first_mate_financny_model.py` (funkcie `summary`, `signals`) tieto čísla reprodukuje; JS `FIN.compute` dáva rovnaké výsledky (overené 19. 11.).

## Klientsky panel Immocap (`panel-klient-immocap/`)

Vyrobený skriptom `make_client_panel.py` (presné textové náhrady nad panelom developera; skript je v projekte First Mate na claude.ai). Zmeny oproti panelu developera, ktoré má jadro podporovať ako nastavenie, nie ako záplatu:
- pred každým odoslaním (Slack, e-mail, finančný brífing, tím) potvrdzovacie okno s príjemcami a predmetom; pri východiskových dátach upozornenie,
- e-mail cez `nastavenia.json` (šablóny Gmail/Outlook s `{{prijemcovia}}`, `{{predmet}}`, `{{text}}`, `{{html}}`), pri chybe ponuka konceptu alebo kopírovania,
- Signály len na čítanie (hranice z pluginu), bez vlastných signálov; Rozvrh = info o plánovanej úlohe v Claude,
- hlavička s názvom klienta, „Nahrať dáta z priečinka First Mate“, žiadne predvolené adresy Books & Mirror, `/first-mate-dev` → `/first-mate`,
- záložka 08 Čo vyskúšať: 30 tipov z `tipy.json` (úrovne, témy, checklist v `db` `fmdev/checklist` + localStorage).
- Plugin pre Cowork (skilly first-mate, first-mate-brifing, first-mate-panel, first-mate-reset, skript `fm.py` s presným portom FMCSV + FM.compute a `financie` cez `fin_model.py`) je v balíku `First-Mate-Immocap.zip`, zatiaľ nie v repozitári.

## Známe otvorené body z pôvodného stavu
- Panely nezobrazujú zmeny z kolekcie `zmeny`.
- Attio treba odobrať z capabilities.
- Zjednotiť modrú farbu čísla na karte s úrovňou „Konať dnes“ (S1, S3, S6 sa líšia); vypnutý signál vynechať aj z osobných brífingov a z veľkých čísel finančného brífingu.
- Outlook v klientskom paneli zatiaľ nebol testovaný naostro (Microsoft 365 konektor vie odoslať len so zapnutými zápisovými akciami a súhlasom správcu; osobný outlook.com nie).
