# Čo sa práve deje

Aktualizované: 2026-11-24 · Branislav (koniec session, nová session nadväzuje tu)

## Kde sme skončili
- Migrácia podľa `docs/migracia/PLAN.md`: fázy 0–3 hotové, **fáza 4 (Issue #3) v polovici**. Všetko je v `main`, `npm test` aj `npm run test:ui` prechádzajú.
- Hotové vo fáze 4:
  - výpočtové jadro `panel/` (`panel/index.md`): 17 modulov `panel/usecases/<id>.js`, `panel/typy/realitka.js` a `developer.js`, `panel/financie/fin.js`, register `panel/jadro/signaly.js`. Golden zhoda pre oba typy.
  - rozhranie `panel/index.html`, `styles.css`, `app.js`, **zatiaľ len typ developer** (`TYP_ID = "developer"` natvrdo v `app.js`). UI test: všetky záložky a náhľad brífingu zhodné s legacy.

## Ďalší krok: realitka v tom istom paneli
1. **Najprv test.** V `tests/ui/porovnaj.mjs` pridaj do `PRIPADY` realitku: `legacy/panel-realitka/index.html` ↔ `panel/index.html?typ=realitka`, `teraz: "2026-11-03T17:00:00Z"`. Bude padať, to je cieľ.
2. **Výber typu v `app.js`.** Typ z `?typ=` (neskôr z nastavení klienta), predvolene developer. Podľa typu importuj `FM`/`CSV` z `panel/typy/<typ>.js`. `FIN` len pre developera. `zostavSignaly` už vie oba typy.
3. **Rozdiely aplikácií.** Realitka (`legacy/panel-realitka/index.html`, app skript riadky 1135–1759) má rovnaké mená funkcií ako `panel/app.js`, len je podmnožinou. Porovnaj po funkciách:
   `diff <(sed -n 1135,1759p legacy/panel-realitka/index.html) panel/app.js`
   Známe rozdiely:
   - nastavenia v db `fm/settings` a `fm/log` (developer `fmdev/...`),
   - `mergeSettings` so `signals.period` a s1–s4,
   - `#period` (7/14 dní),
   - makléri namiesto predajcov,
   - bez Projektov, Financií, vlastných signálov a `SRC`,
   - Slack #first-mate-demo a `/first-mate`,
   - `CSV.toData(raw, teraz)`: volaj s `Date.now()`.
   Rozdiely rieš malými vetvami alebo objektom typu (napr. `T.dbPrefix`), nie kópiou funkcií.
4. **Značky.** Porovnaj `<body>` po prvý `<script>` v legacy realitke s `panel/index.html`:
   - záložky realitky: brifing, tim, signaly, rozvrh, architektura,
   - texty Tím a Rozvrh sú iné.
   Sekcie typov označ napr. `data-typy="developer"` a skrývaj podľa typu.
5. **Hotovo, keď** UI test prejde pre oba typy a `npm test` ostane zelený. Potom commit a zlúčenie do `main`.

## Potom (zvyšok fázy 4)
1. Prepínač typu firmy (`prepinac: true`) s farbou badgeu z `typy.json`.
2. Menu z nastavení.
3. Klientsky režim podľa `legacy/panel-klient-immocap/`.
4. Päta s verziou.
5. Otvorené body z `legacy/README.md` zapísať ako Issues.

## Pravidlá pre panel/
- Výpočty len v `panel/usecases/`. Kľúče výstupu zatiaľ legacy (`s1`…, `f1`…).
- Generátory `docs/migracia/nastroje/rozdel_*.mjs` už nespúšťať: prepísali by ručné úpravy.
- Lokálne: `python3 -m http.server` v koreni, potom `/panel/index.html`.

## Otvorené
- Issues #7, #8: návrhy na neskôr, menia čísla.
- Plugin pre Cowork: First-Mate-Immocap.zip u Branislava.
- Marcelov GitHub účet zatiaľ neznámy.
