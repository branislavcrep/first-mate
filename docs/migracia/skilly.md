# Úprava skillov first-mate a first-mate-developer na nový panel

Stav k 24. 11. 2026 (fáza 6). Skilly sú na claude.ai (synchronizované do Claude Code ako `first-mate`, `first-mate-developer`). Upravuje ich Branislav v nastaveniach skillov; Claude Code ich meniť nevie (nástroj na návrh úprav skillov tu nie je dostupný). Nižšie sú presné zmeny.

## Prečo
Oba skilly čítajú CSV a zapisujú zmeny (`zmeny/…`) v **starých** artefaktoch:
- `first-mate`: „First Mate · ovládací panel“ realitky, slug `d576459c-fb81-491e-96bf-8b9c56cf6492`, súbory `data/nehnutelnosti.csv`, `data/dopyty.csv`, `data/obhliadky.csv`, `data/manifest.md`,
- `first-mate-developer`: „First Mate · ovládací panel developera“, slug `d845281b-5b82-4aff-b8f7-3e43d5551111`, súbory `data/dev_*.csv`, `data/manifest.md`.

Nový demo panel „First Mate · demo panel“ (https://claude.ai/artifact/VZWUmbcEU4WihYycwT3GQK) má dáta oboch typov v podpriečinkoch a vlastnú databázu. Staré panely dostanú pruh „Archív“ a ďalej sa neaktualizujú.

## Zmeny v `first-mate` (realitka)
1. Riadok „Dáta (od 19. 11. 2026 bez Attio): CSV súbory v artifacte panela …“ nahradiť:
   > Dáta: CSV súbory v artifacte „First Mate · demo panel“ (https://claude.ai/artifact/VZWUmbcEU4WihYycwT3GQK, slug «doplniť: ID z hlavičky odpovede pri čítaní artefaktu»), čítaj ich nástrojom `read_file` (claude-artifacts):
2. Cesty súborov: `data/nehnutelnosti.csv` → `data/realitka/nehnutelnosti.csv`, `data/dopyty.csv` → `data/realitka/dopyty.csv`, `data/obhliadky.csv` → `data/realitka/obhliadky.csv`, `data/manifest.md` → `data/realitka/manifest.md`.
3. „Zápisy: databáza panela (`db_write`, slug panela)“: slug nového panela. Kolekcia `zmeny` a tvar dokumentu ostávajú. Pridať vetu: „Staré panely (slugy d576459c…, d845281b…) sú archív, nečítaj z nich a nezapisuj do nich.“
4. Bod 6 postupu: veta „Ak panel zmeny z databázy ešte nezobrazuje, povedz to jednou vetou.“ ostáva (Issue #11).
5. Kanál, makléri, formát a pravidlá sa nemenia.

## Zmeny v `first-mate-developer`
1. Riadok „Dáta … v artifacte „First Mate · ovládací panel developera“ (slug d845281b…)“ nahradiť novým panelom (rovnako ako vyššie) a cesty `data/dev_*.csv` → `data/developer/dev_*.csv`, `data/manifest.md` → `data/developer/manifest.md`.
2. Doplniť finančné súbory (skill ich dnes nepozná): `data/developer/dev_uver.csv`, `dev_tranze.csv`, `dev_podmienky_cerpania.csv`, `dev_rozpocet.csv`, `dev_cashflow.csv`; popis stĺpcov v `data/slovnik_dat_financie.md` v repozitári. Finančné čísla (F1–F6: tranže, krytie, tempo, rozpočet, IRR, stres test) počítaj podľa `tools/first_mate_financny_model.py`, nie odhadom.
3. Do kroku 5 postupu pridať typ požiadavky: „financie: podmienky najbližšej tranže, krytie úveru, rozpočet a rezerva, IRR oproti plánu; čísla z finančného modelu“.
4. Zápisy: slug nového panela, rovnaká kolekcia `zmeny`, veta o archíve starých panelov.
5. Kanál, predajcovia, slovník a pravidlá sa nemenia.

## Overenie po úprave
- V Claude `/first-mate` nad posledným brífingom v #first-mate-demo a `/first-mate-developer` nad #first-mate-developer: skill načíta CSV z nového panela (správne cesty), čísla sedia s brífingom.
- Zápis jednej skúšobnej zmeny (po potvrdení) sa objaví v `zmeny/…` nového panela, nie v starom.
