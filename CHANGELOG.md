# Zmeny · First Mate

Verzie podľa [semver](https://semver.org/lang/cs/): oprava = PATCH, nový use case, záložka alebo nastavenie = MINOR, zmena čísel signálov alebo formátu dát, ktorá si vyžaduje zásah u klienta = MAJOR. Novú verziu vydáva príkaz `/release`.

## 1.0.0 · 2026-11-24

Prvá verzia na jednom jadre. Tri pôvodné panely (realitka, developer, klientsky panel Immocap) nahradil jeden panel, ktorý riadia nastavenia klienta.

**Nové**
- Jeden panel `panel/` pre realitku aj developera, s prepínačom typu firmy v demo paneli. Klient je zamknutý na svoj typ.
- Katalóg use casov `usecases/` (17 signálov, 30 tipov, 3 demá, 5 návrhov) mimo kódu, s exportom do CSV (`/export-usecases`).
- Nastavenia klienta `klienti/<klient>/nastavenia.json`: menu, klientsky režim, Slack kanály, tím, šablóny e-mailov. Šablóna nového klienta `klienti/_sablona/` a príkaz `/novy-klient`.
- Build `python3 tools/build.py <klient>` (`/build`) a variant na zverejnenie ako artefakt. Päta panela ukazuje verziu a dátum zostavenia.
- Nový artefakt „First Mate · demo panel“ (https://claude.ai/artifact/VZWUmbcEU4WihYycwT3GQK), príkaz `/zverejni-demo` a nočná plánovaná úloha, ktorá ho po zmene znovu zverejní.
- Golden testy (`npm test`) strážia čísla všetkých signálov oproti pôvodným panelom a referenčnému finančnému modelu; UI test (`npm run test:ui`) porovnáva panel s pôvodnými.
- Príkaz `/release` a `CHANGELOG.md`.

**Zmenené**
- Pôvodné demo panely developera a realitky majú pruh „Archív“ s odkazom na nový demo panel. Inak sa nezmenili.
- Čísla signálov sa nezmenili: nové jadro dáva rovnaké výsledky ako pôvodné panely (golden testy).

**Opravené**
- Nič. Body, ktoré sa v pôvodných paneloch našli, sú zapísané ako Issues #9 až #13 a čakajú na rozhodnutie.

**Pre klientov**
- Demo panel: zverejniť verziu 1.0.0 (`/zverejni-demo` alebo nočná úloha).
- Immocap: beží pôvodný klientsky panel. Prechod na 1.0.0 (`/build immocap` a zverejnenie) len po dohode s klientom; nová verzia je s pôvodnou zhodná, mení sa len päta s verziou.
