# Rozhodnutia

Datované. Neplatné sa nemažú, označia sa `NEPLATÍ od RRRR-MM-DD`.

## 2026-11-23 · cieľový stav (Branislav)
- Jedno riešenie: realitka aj developer v jednom paneli, hore jeden prepínač typu firmy. Každý typ má vlastné CSV v `data/<typ>/`. Neskôr pribudne typ Stavebná firma.
- Katalóg use casov je jeden, mimo kódu, exportovateľný (CSV, Sheets, neskôr vlastné CRM). Každý záznam má badge typov firiem; panel zobrazí use casy podľa zvoleného typu.
- Katalóg obsahuje signály, tipy „Čo vyskúšať“, demo scenáre a návrhy; pole `druh` = `signal` / `tip` / `demo` / `navrh`. Neskôr sa môže rozšíriť o odhad hodín pre nacenenie.
- Prepínač typu firmy má demo panel. Klientska verzia je zamknutá na typ z nastavení; nastavenie `prepinac: true/false`.
- Konfigurácia klienta v `klienti/<klient>/nastavenia.json`: názov klienta, typ firmy, menu (zapnutie, poradie, názvy záložiek), use casy a hranice, Slack, e-mail, tím. Klientska verzia vzniká príkazom s parametrami.
- Denník vzniká automaticky: git, `dennik/RRRR-MM.md`, `CHANGELOG.md`, verzia v päte panela, `klienti/<klient>/verzie.md`.
- Úlohy: GitHub Issues v tomto repozitári.
- Prístup: Branislav aj Marcel, oba účty Claude Pro, práca v Claude Code v cloude, zdroj v súkromnom repozitári `branislavcrep/first-mate`. Marcel môže meniť zdroj rovnako ako Branislav; zmeny do `main` zlúči Claude po teste bez schvaľovania.
- Hlavný demo panel je artefakt v účte Branislava (Marcel ho nezverejňuje priamo). Nočná plánovaná úloha ho znovu zverejní, ak sa `main` zmenil. Marcel si zverejňuje vlastnú kópiu. Na Team plán (min. 2 miesta) prejsť, až keď bude treba jednu spoločnú adresu pre oboch.
- Staré dva panely ostanú ako zmrazený archív s odkazom na nový.
- Postup práce podľa „Tenký kontext“ (`docs/zdroje/tenky-kontext.pdf`): CLAUDE.md, hot.md (max 500 slov), index.md v priečinkoch, denník, hooky.
- Vizualizácia cieľového stavu: https://claude.ai/artifact/EvgMLQK1uhuD7T9Z6igLtb (kópia `docs/architektura.html`).

## 2026-11-23 · fáza 1: čo vie Claude Code v cloude (Branislav, overil Claude Code)
- **Zverejnenie z Claude Code funguje aj z viacerých súborov.** Testovací artefakt „First Mate · test schopností“ (https://claude.ai/artifact/HA9ygyGrhrRWdjbTyhf4NV, zdroj `docs/migracia/test-schopnosti/`) bol zverejnený ako `index.html` + `data/nehnutelnosti_ukazka.csv`; server drží oba súbory. Stránka môže načítať súbor vedľa seba relatívnym `fetch` (rovnako ako pôvodné panely `data/*.csv`).
- **Capabilities dostupné pre účet Branislava:** `artifact`, `assets`, `comments`, `db`, `dictation`, `downloads`, `files`, `mcp`, `room`, `sample`, `tts`, `user` (+ vstavané `permissions`). Runtime kontrakt 0.2.98. Test deklaruje `db`, `user`, `sample`, `mcp` (Slack: `slack_search_channels`, `slack_send_message`).
- Overené zo session: databáza artefaktu (zápis, čítanie, zmazanie cez ArtifactData), konektor Slack (vyhľadanie kanálov #first-mate-demo C0CDGG5MY0Y a #first-mate-developer C0CDY6XG8MR), GitHub Issues (čítanie, zakladanie; štítky vznikajú automaticky pri priradení, v sivej farbe). AI (`sample`) a volania z prehliadača overí Branislav kliknutím v artefakte.
- Claude Code vie vytvárať plánované úlohy (scheduled tasks) – podklad pre nočné znovuzverejnenie demo panela vo fáze 6.
- **Rozhodnutie:** nový panel zverejňuje Claude Code (cieľ z plánu), nie chat na claude.ai. Chat ostáva len zálohou. Build vo fáze 5 môže ostať viacsúborový (`index.html` + `data/`), jedna samostatná stránka nie je nutná.
- Artefakty z Claude Code sú súkromné (len vlastník). Zdieľanie s Marcelom alebo klientom sa robí ručne cez Share v artefakte.

## 2026-11-23 · fáza 2: golden testy (Branislav, pripravil Claude Code)
- Golden výstup sa počíta priamo z kódu pôvodných panelov (`legacy/*/index.html`, moduly FMCSV, FM, FIN sa čítajú zo súboru, nekopírujú sa) nad `data/<typ>/`, bez posunu dátumov, s predvolenými hranicami (`mergeSettings({})`).
- „Teraz“ = `referencny_datum` z manifestu o **18:00 Europe/Bratislava** (realitka 3. 11., developer 2. 11.). 18:00 je po poslednom zázname v dátach, takže žiadny záznam nie je v budúcnosti. Výsledok nezávisí od časového pásma stroja.
- Golden pokrýva celý výstup `FM.compute` a `FIN.compute` (nielen level a count) a aj pravidlové texty (`fallbackTexts`). Nové jadro musí dať rovnaký výstup cez `panel/golden.mjs`; tolerancia čísel 1e-9 relatívne.
- Golden súbory sa prepisujú (`npm run golden`) len po schválenej zmene výpočtu so zápisom sem.
- Overené: F1–F6 z JS sa zhodujú s `tools/first_mate_financny_model.py` (187 hodnôt) aj s 20 číslami z `legacy/README.md`.

## 2026-11-24 · fáza 3: katalóg use casov (Branislav, schválené)
- Katalóg `usecases/` (typy.json, usecases.json, schema.md, export CSV) schválený: 17 signálov, 30 tipov, 3 demá, 5 ilustračných návrhov pre stavebnú firmu.
- Zlúčený jediný use case: `dopyty-bez-reakcie` (realitka s1 + developer s4), predvolená hranica podľa typu 48 h / 24 h. Ostatné ostávajú samostatné.
- `cas-prvej-reakcie` len realitka; návrh rozšíriť na developera je Issue #7. Spoločný `zaujem-bez-akcie` (ležiaky + záujem bez obhliadky) a samostatné vypredané typy sú Issue #8. Oboje mení čísla, robí sa až po ďalšom súhlase.
- Kategórie a typy tipov ostávajú podľa návrhu (napr. `podmienka-banky`, `zalohy-po-splatnosti` vo financiách).

## 2026-11-24 · fáza 4: výpočtové jadro (Claude Code, v rámci schváleného plánu)
- Výpočty signálov sú v `panel/usecases/<id>.js`, jeden súbor na use case z katalógu, funkcia pre každý typ firmy. Panel ich volá v poradí z `usecases/typy.json`. Zlúčený `dopyty-bez-reakcie` má zatiaľ dve funkcie (realitka, developer), lebo doplnky výstupu sa líšia; spoločné jadro pravidla sa zjednotí neskôr bez zmeny čísel.
- Kľúče výstupu ostávajú zatiaľ pôvodné (`s1`…, `f1`…), lebo na ne sú viazané texty brífingu, AI prompty a šablóny. Prechod na ID z katalógu je samostatný krok.
- Moduly sú ES moduly (fungujú v prehliadači aj v Node pre testy). Fáza 1 ukázala, že artefakt môže mať viac súborov.
- `CSV.toData` realitky dostáva čas ako parameter (`teraz`) namiesto `Date.now()`; správanie v paneli je rovnaké.

## 2026-11-24 · fáza 4: realitka v tom istom paneli (Claude Code, v rámci schváleného plánu)
- Jeden `panel/app.js` pre všetky typy. Čo sa medzi typmi líši (popisy signálov, texty „Dnes“, tím a roly, dokumenty v db, súhrn priebehu), je v objekte typu `panel/rozhranie/<typ>.js`. Väčšie celky len pre developera (Projekty, Financie, finančné a vlastné signály, zdroje dát) sú vo vetvách `if (DEV)`.
- Typ sa zatiaľ volí v adrese (`?typ=realitka`), predvolený je developer. Neskôr ho určia nastavenia klienta a prepínač.
- Značky: prvky len pre niektorý typ majú `data-typy="…"` a `app.js` ich pri štarte z DOM odstráni (nie len skryje), aby nevznikli duplicitné `id`. Čísla záložiek (01, 02…) dopĺňa `app.js` podľa poradia v menu.
- Nastavenia v db ostávajú podľa pôvodných panelov: realitka `fm/settings`, `fm/log`, developer `fmdev/settings`, `fmdev/log`. Uložené nastavenia z pôvodných artefaktov sa tak dajú prevziať.
- UI test porovnáva viditeľný text (záložka po prepnutí na ňu) a samotný náhľad brífingu vo všetkých kartách, nie celé `innerHTML` záložky. Rozdiely v medzerách a skrytých značkách tak nespôsobia zlyhanie, rozdiely vo viditeľnom texte áno.
- Prepínač typu firmy: odkaz „verzia pre …“ v hlavičke prepne typ priamo v paneli (značky sa postavia znova zo šablóny, bez načítania stránky, lebo zmena adresy v artefakte nemusí byť dovolená). Zobrazí sa len pri `prepinac: true` v nastaveniach klienta, inak zmizne a panel je zamknutý na `typ` z nastavení. `?typ=` platí len pri zapnutom prepínači.
- Nastavenia klienta číta panel už teraz z `klienti/<klient>/nastavenia.json` (meta `fm-nastavenia`). `klienti/demo/nastavenia.json` má zatiaľ len `prepinac`, `typy`, `typ`; ostatné polia doplní fáza 5.
- Badge typu: text „verzia pre …“ v hlavičke vo farbe typu z `usecases/typy.json` (realitka #0B7A5C, developer #1B2CC1).

## 2026-11-24 · fáza 4 dokončená: menu, klientsky režim, päta (Claude Code, v rámci schváleného plánu)
- Menu: základ je `typy[].menu` v `usecases/typy.json`, klient ho prepíše v `nastavenia.json` (`menu.<typ>: [{ id, nazov?, zapnute? }]`). Uvedené záložky idú prvé v ich poradí, ostatné za nimi v poradí typu, neznáme id sa ignorujú. Vypnutá záložka zmizne z menu, jej sekcia ostane v DOM, ale nedá sa otvoriť. Úvodná záložka je prvá v menu.
- Klientsky režim je súbor nastavení, nie samostatný panel: `rezim: "klient"` (texty pre klienta cez `data-rezim`), `nazov`, `potvrdenie_pred_odoslanim`, `signaly_len_na_citanie`, `zalozka_tipy`, `rozvrh: "planovana-uloha"` (cez `data-rozvrh`), `slack.prikaz`, `email` (šablóny odoslania a konceptu s `{{…}}`), `predvolene` (prázdne adresy namiesto Books & Mirror). `klienti/immocap/nastavenia.json` dáva panel zhodný s `legacy/panel-klient-immocap/` (UI test).
- Tipy pre záložku Čo vyskúšať berie panel z katalógu use casov (`druh: "tip"`, `urovne`, `temy`, `miesta`), nie z `tipy.json`. Checklist: db `<typ db>/checklist` + localStorage ako v pôvodnom paneli.
- Ponuka konceptu alebo kopírovania pri neúspešnom e-maile sa zobrazí len klientovi s nastaveným `email`; demo panel sa pri chybe správa ako predtým.
- Príkaz v Claude (`/first-mate-dev`, `/first-mate`) je v moduloch typov nastaviteľný (`FM.nastavPrikaz`), predvolené hodnoty a golden texty sa nemenia.
- Päta: „First Mate vX.Y.Z · zostavené D. M. RRRR“ z meta `fm-verzia` a `fm-zostavene`, bez nich „vývojová verzia, nezostavené“. Je to jediná vedomá výnimka v UI teste oproti legacy.
- Otvorené body z `legacy/README.md` sú zapísané ako Issues #9 až #13 (farba čísla „Konať dnes“, vypnutý signál v osobných a finančných brífingoch, kolekcia `zmeny`, Attio v capabilities, Outlook). Nič z toho sa potichu neopravilo.

## 2026-11-24 · fáza 5: build a klienti (Claude Code, v rámci schváleného plánu)
- Build je viacsúborový (fáza 1 overila zverejnenie z viacerých súborov): `tools/build.py <klient>` → `dist/<klient>/` s kódom panela, katalógom, dátami len pre typy klienta a `nastavenia.json`; meta `fm-koren=./`, `fm-nastavenia=nastavenia.json`, `fm-verzia`, `fm-zostavene`. `dist/build.json` (verzia, dátum, commit, zoznam súborov) je podklad pre zverejnenie. `dist/` sa necommituje.
- Verzia má jeden zdroj: `version` v `package.json`. Počas migrácie `0.5.0`, `1.0.0` vydá `/release` vo fáze 7.
- Build odmietne nastavenia s nevyplnenými miestami «…» zo šablóny a s poľami, ktoré vyzerajú ako kľúče alebo heslá. `npm test` zostaví naskúšku všetkých klientov.
- Slack kanál, workspace a tím sú v nastaveniach klienta (`slack.kanaly: [{ typ?, id, nazov }]`, `slack.workspace`, `predvolene.tim`). Bez nich platia pôvodné demo hodnoty, takže demo aj Immocap sú zhodné s legacy.
- Šablóna nového klienta `klienti/_sablona/` (nastavenia + README s popisom polí), miesta na doplnenie sú «…», aby sa nepliedli so šablónami e-mailu `{{…}}`. Outlook sa v šablóne nevymýšľa, overí sa pri prvom klientovi (Issue #13).
- `klienti/<klient>/verzie.md`: hlavička (artefakt, nastavenia, build) a tabuľka Dátum · Verzia · Commit · Čo sa stalo; z nej `/release` zistí klientov na staršej verzii.

## 2026-11-24 · fáza 6: zverejnenie demo panela (Claude Code, v rámci schváleného plánu)
- Nový artefakt „First Mate · demo panel“: https://claude.ai/artifact/VZWUmbcEU4WihYycwT3GQK (verzia 1795499383-4aa1, build 0.5.0 z commitu e6e4978). Pôvodné artefakty sa nemenili.
- Artefakt povoľuje len vložené skripty a štýly (alebo z CDN), súbory vedľa stránky číta cez `fetch`. Preto build vyrába aj `dist/<klient>/zverejnenie/`: stránka bez kostry dokumentu s vloženým CSS a jedným skriptom (vlastný spájač ES modulov v `tools/build.py`, bez balíkov z npm), dáta, katalóg a nastavenia ako súbory. UI test ju obalí kostrou ako platforma a porovná s pôvodnými panelmi.
- Capabilities: `db` (nastavenia a história ako doteraz), `mcp` len Slack (`slack_send_message`, `slack_read_channel`) a Gmail (`send_message`), bez Attio (Issue #12), `sample`. Názvy argumentov overené proti schémam konektorov; skutočné odoslanie z artefaktu sa robí až so súhlasom (STOP fázy 6).
- Súbory `.md` sa zverejňujú s typom presne `text/markdown` (bez `charset`).
- Testovacie odoslanie (so súhlasom Branislava, 24. 11.): brífing zostavený jadrom nového panela (dáta posunuté k dnešku, pravidlový text) odišiel cez konektor Slack do #first-mate-demo (realitka) a #first-mate-developer (developer), označený ako test. Branislav predtým v zverejnenom paneli overil prepínač typov, posun dátumov, nahratie CSV, AI brífing a záložky Tím, Signály, Financie.
- Nočné zverejnenie: plánovaná úloha „First Mate · nočné zverejnenie demo panela“ (trig_01A5m3w9929SkxEMYNGYpWLv), každú noc 2:17 Europe/Bratislava, nová session. Zverejní len, ak sa od commitu posledného zverejnenia v `klienti/demo/verzie.md` zmenili súbory panela (`panel`, `usecases`, `data`, `klienti/demo/nastavenia.json`, `tools/build.py`, `package.json`); postup = `/zverejni-demo`. Úloha nemá konektory (netreba ich), nič neposiela. Vypnúť alebo zmeniť sa dá v claude.ai v plánovaných úlohách.
- Skilly `first-mate` a `first-mate-developer` čítajú dáta zo starých panelov. Návrh presných zmien je v `docs/migracia/skilly.md`; upraví ich Branislav na claude.ai (Claude Code skilly meniť nevie).
- 24. 11.: Branislav v zverejnenom demo paneli fyzicky stlačil „Poslať do Slacku“ aj „Poslať e-mailom“; Slack aj e-mail prišli. Odoslanie z artefaktu cez konektory je tým overené naostro.
- 24. 11. (so súhlasom Branislava): na oba pôvodné demo panely, developer https://claude.ai/artifact/Thwr8YV58gP7RprXQHRw2Y (verzia 1795514495-1db0) a realitku https://claude.ai/artifact/TMqLo37PgkvMqetibH7a5P (verzia 1795514496-b51f), pribudol hneď za `<body>` pruh „Archív. Aktuálny panel: First Mate · demo panel →“ s odkazom na nový panel. Pred zmenou boli oba bajtovo zhodné s `legacy/`, iná zmena nie je, capabilities ostali. Panel Immocap ani súbory v `legacy/` sa nemenili (`legacy/` je zmrazená kópia bez pruhu). Fáza 6 je tým hotová.
