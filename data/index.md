# data/

Ukážkové CSV podľa typu firmy. Fiktívne dáta. Formát: UTF-8 s BOM, `;`, desatinná čiarka, dátumy `RRRR-MM-DD`.

- slovnik_dat.md — slovník stĺpcov a väzieb (realitka + predaj developera)
- slovnik_dat_financie.md — slovník finančných súborov developera (rozpočet, cash-flow, úver, tranže, podmienky čerpania)

## realitka/ (referenčný dátum 2026-11-03)
- realitka/manifest.md — čas exportu, referenčný dátum, počty záznamov
- realitka/nehnutelnosti.csv — ponuky (40)
- realitka/dopyty.csv — dopyty na ponuky (447)
- realitka/obhliadky.csv — obhliadky (171)

## developer/ (referenčný dátum 2026-11-02)
- developer/manifest.md — čas exportu, referenčný dátum, počty záznamov
- developer/dev_projekty.csv — projekty (2) + finančné parametre
- developer/dev_jednotky.csv — jednotky (63)
- developer/dev_dopyty.csv — dopyty a obhliadky (41)
- developer/dev_rozpocet.csv — rozpočet projektu, bez DPH (voliteľný)
- developer/dev_cashflow.csv — mesačný plán a skutočnosť cash-flow, bez DPH (voliteľný)
- developer/dev_uver.csv — úverová zmluva (voliteľný)
- developer/dev_tranze.csv — tranže úveru (voliteľný)
- developer/dev_podmienky_cerpania.csv — podmienky čerpania tranží (voliteľný)
