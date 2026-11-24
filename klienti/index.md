# klienti/

Nastavenia klientov First Mate, jeden priečinok na klienta. Panel ich číta podľa meta `fm-nastavenia` v `panel/index.html` (lokálne `klienti/demo/nastavenia.json`). Šablónu a ďalšie polia doplní fáza 5 migrácie (`/novy-klient`, `tools/build.py`).

- demo/nastavenia.json — demo panel Books & Mirror: prepínač typu zapnutý, typy realitka a developer, predvolený developer
- immocap/nastavenia.json — Immocap, a.s.: developer, klientsky režim (`rezim: "klient"`, potvrdenie pred odoslaním, signály len na čítanie, záložka Čo vyskúšať, rozvrh ako plánovaná úloha, `/first-mate`, e-mail cez šablóny Gmail, bez adries Books & Mirror); zhoda s `legacy/panel-klient-immocap/` overená UI testom
