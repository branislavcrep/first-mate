# Migrácia First Mate na jedno jadro · plán pre Claude Code

Pracuješ v repozitári First Mate v Claude Code v cloude. Tento súbor je zadanie celej migrácie. Ide sa po fázach; každá fáza končí commitom, zápisom do `dennik/`, prepisom `hot.md` a pushom. Kde je **STOP**, ukáž výsledok a počkaj na súhlas. Fázy môžu ísť cez viac sessions: keď sa kontext zaplní, ukonči session podľa `CLAUDE.md` a v ďalšej pokračuj podľa `hot.md`.

Cieľový stav je opísaný v `docs/rozhodnutia.md` (záznam 2026-11-23) a nakreslený v `docs/architektura.html`. Pôvodný stav je v `legacy/README.md`.

## Pravidlá migrácie
- Odpovedaj po slovensky, tykaj. Používaj task list.
- `legacy/` je len na čítanie. Pôvodné artefakty (slugy v `legacy/README.md`) neprepisuj bez súhlasu.
- Výsledky výpočtov sa nesmú zmeniť: každý signál musí v novom jadre dať rovnaké čísla ako pôvodný panel (golden testy z fázy 2). Ak niečo zmeniť chceš (chyba, zjednotenie), napíš to ako návrh a čakaj na súhlas.
- Nič neposielaj do Slacku ani e-mailom bez súhlasu. Test len do #first-mate-demo / #first-mate-developer vo workspace firstmate-booksmirror.
- Dáta sú fiktívne. Žiadne kľúče ani tokeny v repozitári.
- Ak nevieš, či niečo dokážeš (zverejnenie artefaktu, Issues, plánovaná úloha), najprv to over malým testom, až potom stavaj.

## Fáza 0 · import pôvodného stavu (HOTOVÉ 23. 11. 2026)
`legacy/` (3 panely), `data/developer/`, `data/realitka/`, slovníky, `tools/first_mate_financny_model.py`, `docs/`, `CLAUDE.md`, `hot.md`.

## Fáza 1 · základ práce a overenie možností
1. Doplň `index.md` do `docs/`, `data/`, `tools/` (riadok na súbor). `legacy/README.md` slúži ako index legacy.
2. Hooky v `.claude/settings.json` + skript `tools/hooks/koniec_session.sh` (alebo .py):
   - hook `Stop`: ak sú necommitnuté zmeny alebo v `dennik/RRRR-MM.md` chýba dnešný záznam, vráť blokovanie s dôvodom „zapíš denník, prepíš hot.md, commitni a pushni“; inak nechaj session skončiť. Ošetri, aby hook nezablokoval donekonečna (napr. pri `stop_hook_active`).
   - voliteľne `SessionStart`: vypíše prvých 40 riadkov `hot.md`.
   Over, že hook funguje v cloudovej session.
3. Príkazy v `.claude/commands/` (zatiaľ kostry s presným popisom, naplnia sa v ďalších fázach): `novy-klient.md`, `build.md`, `release.md`, `export-usecases.md`, `zverejni-demo.md`, `koniec.md` (ručné ukončenie session podľa CLAUDE.md).
4. GitHub Issues: over, či vieš v tomto prostredí čítať a zakladať Issues. Ak áno, založ štítky `jadro`, `katalog`, `realitka`, `developer`, `stavebna-firma`, `klient`, `migracia` a Issue pre fázy 2–7 tohto plánu. Ak nie, napíš to a zoznam úloh daj do `docs/migracia/ulohy.md` (dočasne).
5. **Test zverejnenia artefaktu** (kľúčové): zverejni malú testovaciu stránku „First Mate · test schopností“, ktorá:
   - načíta dáta vložené v HTML (nie cez `fetch` susedného súboru),
   - zavolá AI (capability `sample` alebo ekvivalent),
   - zapíše a prečíta hodnotu z databázy artefaktu (`db`),
   - má tlačidlo, ktoré cez konektor Slack pošle testovaciu správu (neposielaj, len over, že konektor je dostupný a deklarovaný).
   Zisti a zapíš do `docs/rozhodnutia.md`: či Claude Code vie zverejniť artefakt z viacerých súborov alebo len jednu stránku, a ktoré capabilities sú dostupné. Podľa toho sa rozhodne, či nový panel zverejňuje Claude Code (cieľ), alebo chat na claude.ai (záloha).
6. **STOP**: zhrnutie (čo funguje, čo nie, odporúčanie pre fázu 6).

## Fáza 2 · golden testy (pred akoukoľvek zmenou výpočtov)
1. Postav testovací nástroj v Node (napr. `tests/golden/extract.mjs` s jsdom alebo vytiahnutím modulov `FMCSV`, `FM`, `FIN` zo `<script>` v `legacy/*/index.html`), ktorý pre každý typ spustí pôvodný výpočet nad `data/<typ>/` pri pevnom „dnes“ = `referencny_datum` z manifestu, bez posunu dátumov, s predvolenými hranicami (`DEFAULTS.signals`).
2. Výstup ulož ako `tests/golden/realitka.json` a `tests/golden/developer.json`: pre každý signál `level`, `count`, zoznam položiek (ID + hlavné čísla), a pre F1–F6 aj čísla z `FIN.compute`. Pre developera porovnaj F1–F6 s `tools/first_mate_financny_model.py` (funkcia `signals`) a over čísla z `legacy/README.md` (napr. IRR VK PL 23,9 %, NZ 15,0 %).
3. Príkaz `npm test` (alebo `python tools/test_golden.py`), ktorý neskôr spustí nové jadro nad rovnakými dátami a porovná s golden súbormi.
4. Commit, denník, hot.md.

## Fáza 3 · katalóg use casov
1. `usecases/typy.json`: typy `realitka`, `developer`, `stavebna-firma` (stav `pripravuje-sa`) s názvom, farbou badgeu (realitka #0B7A5C, developer #1B2CC1, stavebná firma #B45A0A), predvoleným menu (záložky, poradie, názvy; realitka bez Projekty a Financie) a zoznamom potrebných a voliteľných CSV.
2. `usecases/schema.md`: popis polí záznamu. Minimálne `id` (trvalé, podľa obsahu, napr. `dopyty-bez-reakcie`), `nazov`, `druh` (`signal`/`tip`/`demo`/`navrh`), `typy` (pole), `kategoria` (`predaj`/`financie`/…), `popis`, `parametre` (s predvolenými hodnotami, pri `oboje` aj podľa typu), `zdroje_dat` (systémy + CSV z `SRC`), `vypocet` (`pravidlo` v katalógu alebo `modul` `panel/usecases/<id>.js`), `stav` (`hotovy`/`navrh`), pri tipoch `otazka`, `kde`, `co_urobi`, `meni_data`, `uroven`, `tema`; pri demách `kroky`.
3. `usecases/usecases.json`: naplň zo zdrojov:
   - signály: `SIG`, `FSIG`, `SRC` z `legacy/panel-developer/index.html`, `SIG` z `legacy/panel-realitka/index.html` (S1–S4),
   - tipy: 30 tipov z `legacy/panel-klient-immocap/tipy.json` (zachovaj úroveň a tému; typ podľa obsahu),
   - demá: aspoň „Nová ponuka N015 → kupujúci s GDPR súhlasom → Gmail koncept v BCC → záznam v CRM“ (realitka), „Ranný brífing a otázka vo vlákne Slacku“ (oboje), „Finančný brífing pre majiteľa“ (developer),
   - návrhy pre stavebnú firmu len ako jasne označené príklady.
   Zlúč rovnaké use casy oboch panelov do jedného záznamu s typmi `["realitka","developer"]`: kandidáti `dopyty-bez-reakcie` (realitka S1 48 h, developer S4 24 h) a `cas-prvej-reakcie` (realitka S2; developer S4 ukazuje rýchlosť predajcov). Over v kóde, či je logika naozaj rovnaká; ak nie, nechaj dva záznamy a napíš prečo. „Ležiaky“ (developer S7) a „Záujem bez obhliadky“ (realitka S3) porovnaj a navrhni.
4. `tools/export_usecases.py` → `usecases/export/usecases.csv` (UTF-8 s BOM, `;`), stĺpce: id, nazov, druh, typy, kategoria, stav, vypocet, zdroje_dat, popis.
5. **STOP**: ukáž zoznam use casov (tabuľka) a zlúčenia na schválenie.

## Fáza 4 · jedno jadro panela
1. `panel/` vychádza z `legacy/panel-developer/index.html` (je nadmnožinou). Rozdeľ na `panel/index.html`, `panel/styles.css`, `panel/app.js` a `panel/usecases/<id>.js` (výpočty, ktoré nie sú jednoduchým pravidlom). Dizajn Books & Mirror ostáva.
2. Pridaj:
   - načítanie `usecases/typy.json`, `usecases/usecases.json` a nastavení klienta,
   - prepínač typu firmy (zobrazí sa, ak `prepinac: true`), ktorý vymení dáta (`data/<typ>/`), menu a zoznam use casov,
   - menu z nastavení (zapnutie, poradie, názvy; čísla 01, 02… sa doplnia samy),
   - realitku (dáta, signály, texty, Slack kanál) z `legacy/panel-realitka/` ako typ v tom istom jadre,
   - klientsky režim z `legacy/panel-klient-immocap/` ako nastavenia, nie záplaty: `potvrdenie_pred_odoslanim`, `signaly_len_na_citanie`, `zalozka_tipy`, `email` (šablóny Gmail/Outlook), `rozvrh: "planovana-uloha"`, názov klienta, bez predvolených adries Books & Mirror,
   - pätu „First Mate vX.Y.Z · zostavené RRRR-MM-DD“.
3. Golden testy pre oba typy musia prejsť bez rozdielu. Over aj prepínanie typov, posun dátumov, „Nahrať vlastné CSV“ a náhľad brífingu (headless, s mock konektormi).
4. Ak narazíš na otvorené body z `legacy/README.md` (modrá farba čísla, vypnutý signál v brífingu), zapíš ich ako Issues, neopravuj potichu.
5. Commit, denník, hot.md.

## Fáza 5 · build a klienti
1. `klienti/demo/nastavenia.json` (prepínač zapnutý, oba typy, demo Slack kanály, Gmail) a `klienti/immocap/nastavenia.json` (developer, bez prepínača, klientsky režim, hodnoty z `legacy/panel-klient-immocap/nastavenia.json`).
2. `tools/build.py <klient>` → `dist/<klient>/index.html`: **jedna samostatná stránka** (CSS, JS, katalóg, nastavenia aj CSV vložené dnu), ak fáza 1 ukázala, že Claude Code zverejňuje len jednu stránku. Inak môže ostať viac súborov. Build zapíše verziu a dátum do päty. `dist/` necommituj (pridaj do `.gitignore`), okrem prípadu, že to bude treba na zverejnenie.
3. Over, že `dist/immocap/` sa správa ako `legacy/panel-klient-immocap/` (rovnaké čísla, potvrdenia, tipy, Outlook/Gmail šablóny).
4. Príkaz `/novy-klient`: opýta sa na názov, typ, prepínač, e-mail (Gmail/Outlook), Slack kanály, tím; vytvorí `klienti/<klient>/` zo šablóny, zapíše klienta do `klienti/index.md`, spustí build, založí Issue „Inštalácia <klient>“ a zapíše `klienti/<klient>/verzie.md`.
5. Commit, denník, hot.md.

## Fáza 6 · zverejnenie a archív
1. Zverejni nový demo panel ako **nový** artefakt „First Mate · demo panel“ (nie prepísaním starých). Adresu a slug zapíš do `klienti/demo/verzie.md` a `docs/rozhodnutia.md`.
2. **STOP**: Branislav panel vyskúša. Testovacie odoslanie do demo Slacku len po jeho súhlase.
3. Po súhlase: na oba staré panely pridaj nenápadný pruh „Archív. Aktuálny panel: <odkaz>“ (len táto zmena, so súhlasom).
4. Príkaz `/zverejni-demo` a návrh plánovanej úlohy „každú noc: ak sa `main` zmenil od poslednej verzie v `klienti/demo/verzie.md`, zostav a znovu zverejni demo panel“. Plánovanú úlohu vytvor, ak to prostredie dovolí; inak napíš Branislavovi presný postup.
5. Skilly `first-mate` a `first-mate-developer` na claude.ai čítajú dáta zo starých panelov: navrhni ich úpravu na nový panel (cez propose_skills, ak je dostupné; inak text úpravy do `docs/migracia/skilly.md`).

## Fáza 7 · vydanie a Marcel
1. `/release`: zhrnie zmeny od poslednej verzie do `CHANGELOG.md`, git tag, číslo v päte; vypíše klientov na staršej verzii podľa `klienti/*/verzie.md`. Vydaj `v1.0.0`.
2. `docs/pre-marcela.md`: čo potrebuje (GitHub účet, pozvánka do repozitára, Claude Pro, pripojenie GitHubu v claude.ai/code, Slack demo workspace), prvá session krok za krokom, ako si zverejní vlastnú kópiu demo panela, ako robí `/novy-klient`.
3. Plugin pre Cowork: keď Branislav dodá `First-Mate-Immocap.zip`, presuň plugin do `plugin/`, zaraď `fm.py` a `fin_model.py` do testov (rovnaké čísla ako jadro) a navrhni, ako bude plugin čítať katalóg.
4. Ukonči migráciu: v `hot.md` prepni z „migrácia“ na bežnú prácu, v `CLAUDE.md` odstráň odkaz na tento plán ako aktívny.
