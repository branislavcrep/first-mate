---
description: Založí nového klienta First Mate (nastavenia, build, Issue)
---
# /novy-klient

Založí klienta v `klienti/<slug>/` zo šablóny `klienti/_sablona/`. Argumenty: $ARGUMENTS (voliteľne slug).

Pravidlá: klientovi vo výstupoch vykaj. Do repozitára nikdy nedávaj skutočné dáta klienta, kľúče, tokeny ani heslá (len názvy a ID kanálov, adresy príjemcov, ak ich klient dá). Nič neposielaj do Slacku ani e-mailom.

1. **Opýtaj sa jednou otázkou, po bodoch** (čo už je v argumentoch, neopakuj):
   - názov klienta a slug (malé písmená, pomlčky; nesmie začínať `_` a nesmie už existovať v `klienti/`),
   - typ firmy: `realitka` alebo `developer` (`stavebna-firma` sa pripravuje, zatiaľ nie),
   - prepínač typov áno/nie (klient spravidla nie; áno len pre dema),
   - režim: `klient` (môj panel, potvrdenie pred odoslaním, signály len na čítanie, tipy, plánovaná úloha) alebo `demo`,
   - e-mail: Gmail alebo Outlook,
   - Slack: workspace, kanál (názov a ID), príkaz v Claude (predvolene `/first-mate`),
   - tím: mená, roly (realitka `manazer`/`makler`, developer `riaditel`/`vedenie`/`predajca`), pri predajcovi/maklérovi meno v dátach, e-maily ak ich klient chce mať predvyplnené.
2. **Nastavenia.** Skopíruj `klienti/_sablona/nastavenia.json` do `klienti/<slug>/nastavenia.json` a nahraď všetky miesta «…». Nepotrebné polia vynechaj, `poznamka` prepíš jednou vetou o klientovi. Pri Outlooku: šablónu `email` nevymýšľaj; nájdi nástroje konektora (ToolSearch „outlook“ / „microsoft 365“), a ak ich nevieš overiť, nechaj Gmail ako zálohu a do Issue napíš, že Outlook treba overiť (Issue #13). Popis polí: `klienti/_sablona/README.md`.
3. **Build.** `npm test` (musí prejsť, kontroluje aj build všetkých klientov) a `python3 tools/build.py <slug>`. Ak build odmietne nastavenia (nevyplnené «…», polia s tajomstvami, neznámy typ), oprav ich a zopakuj.
4. **Záznamy.**
   - `klienti/<slug>/verzie.md` podľa vzoru `klienti/immocap/verzie.md`: artefakt (zatiaľ nezverejnený), nastavenia, build, tabuľka s riadkom dnešný dátum · verzia z `package.json` · commit · „nastavenia a build pripravené“,
   - riadok do `klienti/index.md` (slug, typ, režim, kanál, e-mail).
5. **Issue.** Založ GitHub Issue „Inštalácia <názov klienta>“ so štítkom `klient` (a typom firmy ako štítkom). Obsah: čo je pripravené, čo ostáva (zverejnenie artefaktu, pripojenie konektorov Slack a e-mail u klienta, plugin a plánovaná úloha pri režime klient, overenie Outlooku), odkaz na `klienti/<slug>/`.
6. Denník (`dennik/RRRR-MM.md`), commit a push podľa `CLAUDE.md`. Ukáž súhrn: cesta, výstup buildu, odkaz na Issue.
