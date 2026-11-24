---
description: Zostaví a znovu zverejní demo panel First Mate
---
# /zverejni-demo

Znovu zverejní demo panel „First Mate · demo panel“ na **tú istú adresu** (zapísaná v `klienti/demo/verzie.md`). Nikdy nezverejňuj na pôvodné artefakty zo zoznamu v `legacy/README.md` a nevytváraj nový artefakt. Nič neposielaj do Slacku ani e-mailom.

1. Adresu artefaktu vezmi z `klienti/demo/verzie.md` (riadok „Artefakt“). Ak tam nie je, skonči: demo panel ešte nebol zverejnený (fáza 6).
2. `npm test`. Ak neprejde, zastav a ukáž rozdiely; nič nezverejňuj.
3. `python3 tools/build.py demo`. Ak commit vo výstupe končí `+necommitnuté`, zastav a najprv commitni (zverejňuje sa len commitnutý stav).
4. Zverejni nástrojom Artifact (`action: "publish"`):
   - `url` = adresa z kroku 1, `file_path` = `dist/demo/zverejnenie/index.html`, `root` = `dist/demo/zverejnenie`,
   - `files` = zoznam `zverejnenie.subory` z `dist/demo/build.json` (súbory `.md` s `contentType: "text/markdown"` presne, bez charset),
   - `capabilities` vynechaj (ostanú `db`, `mcp` Slack + Gmail, `sample`); meniť ich len pri zmene panela, ktorá potrebuje iné konektory,
   - `icon` vynechaj.
   Ak publish odmietne, lebo artefakt táto session nečítala, odmietnutie odovzdá živú verziu: považuj ju za prečítanú a zopakuj publish s rovnakými parametrami (obsah je vždy z buildu, nie zo živej verzie).
5. Do tabuľky v `klienti/demo/verzie.md` pridaj riadok: dátum (Europe/Bratislava) · verzia z `package.json` · commit z `build.json` · „znovu zverejnené (verzia artefaktu <id z výsledku publish>)“.
6. Denník (`dennik/RRRR-MM.md`), commit a push podľa `CLAUDE.md`.

Nočná plánovaná úloha robí to isté, len ak sa `main` zmenil od posledného commitu v `klienti/demo/verzie.md` (popis v `docs/rozhodnutia.md`, fáza 6).
