# klienti/

Nastavenia klientov First Mate, jeden priečinok na klienta. Panel ich číta podľa meta `fm-nastavenia` v `panel/index.html` (lokálne `klienti/demo/nastavenia.json`). Nového klienta zakladá `/novy-klient`, panel zostaví `/build` (`python3 tools/build.py <klient>` → `dist/<klient>/`).

- demo/nastavenia.json — demo panel Books & Mirror: prepínač typu zapnutý, typy realitka a developer, predvolený developer, demo Slack kanály
- immocap/nastavenia.json — Immocap, a.s.: developer, klientsky režim (`rezim: "klient"`, potvrdenie pred odoslaním, signály len na čítanie, záložka Čo vyskúšať, rozvrh ako plánovaná úloha, `/first-mate`, e-mail cez šablóny Gmail, bez adries Books & Mirror); zhoda s `legacy/panel-klient-immocap/` overená UI testom
- _sablona/nastavenia.json — šablóna nastavení pre `/novy-klient` (miesta «…» treba nahradiť; build ich odmietne)
- _sablona/README.md — popis všetkých polí nastavení
- <klient>/verzie.md — história verzií a zverejnení klienta (tabuľka Dátum · Verzia · Commit · Čo sa stalo), číta ju `/release`
