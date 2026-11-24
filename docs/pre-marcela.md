# Pre Marcela · ako začať s First Mate

Ahoj Marcel. First Mate je AI analytik pre real estate od Books & Mirror: zo CSV dát spočíta signály, AI ich vysvetlí a brífing pošle do Slacku a e-mailom. Celý projekt je v repozitári `branislavcrep/first-mate` na GitHube a pracuje sa v ňom cez Claude Code v cloude (claude.ai/code). Nič si neinštaluješ na počítač.

## 1. Čo potrebuješ (raz)

| Čo | Kto to urobí | Ako |
|---|---|---|
| GitHub účet | ty | github.com → Sign up. Pošli Branislavovi svoje používateľské meno. |
| Pozvánka do repozitára | Branislav | GitHub → `branislavcrep/first-mate` → Settings → Collaborators → Add people (v osobnom repozitári má spolupracovník vždy právo zápisu, rola sa nevyberá). Ty pozvánku prijmeš v e-maile alebo na github.com/notifications. |
| Claude Pro (alebo Max) | ty | claude.ai → Settings → Billing. Claude Code v cloude bez platenej verzie nejde. |
| GitHub v claude.ai/code | ty | claude.ai/code → pri prvom spustení „Connect GitHub“ a povoľ prístup k `branislavcrep/first-mate`. Claude GitHub App je na repozitári už nainštalovaná. |
| Slack demo workspace | Branislav pozve, ty prijmeš | workspace `firstmate-booksmirror`, kanály `#first-mate-demo` (realitka) a `#first-mate-developer` (developer). Testy idú len sem. |
| Konektory v claude.ai | ty | claude.ai → Settings → Connectors: pripoj **Slack** (workspace `firstmate-booksmirror`) a **Gmail**. Bez nich tvoja kópia demo panela nič neodošle. |

## 2. Prvá session krok za krokom

1. Otvor claude.ai/code, vyber repozitár `branislavcrep/first-mate` a spusti novú session.
2. Prvá správa môže byť napríklad:
   > Ahoj, som Marcel, toto je moja prvá session. Postupuj podľa CLAUDE.md: prečítaj hot.md a vysvetli mi, čo sa práve deje a ako je repozitár usporiadaný. Nič nemeň.
3. Claude si sám prečíta `hot.md` (čo sa deje teraz) a podľa úlohy príslušný `index.md`. Celé priečinky ani `legacy/` naraz nečíta, aby nezahltil kontext.
4. Skús bezpečné príkazy, ktoré nič nemenia mimo repozitára:
   - `/build demo` · zostaví demo panel do `dist/demo/` a spustí testy,
   - `npm test` · golden testy (čísla signálov musia sedieť s pôvodnými panelmi),
   - `npm run test:ui` · porovná panel s pôvodnými (trvá asi 4 minúty).
5. Na konci session napíš `/koniec` (alebo len „ukonči session“). Claude prepíše `hot.md`, pridá riadok do `dennik/RRRR-MM.md` s tvojím menom, commitne a pushne. Ak na to zabudneš, hook ťa raz zastaví a pripomenie to: čo nie je v GitHube, po session zmizne.

Ako sa pracuje:
- Claude Code v cloude robí každú session na vlastnej vetve `claude/…`. Po úspešných testoch zlúči zmeny do `main` sám, bez čakania na schválenie (dohoda z 23. 11. 2026).
- Úlohy sú v GitHub Issues tohto repozitára, nie v markdowne. Pýtaj sa Claude napr. „aké Issues sú otvorené?“.
- Rozhodnutia sa zapisujú do `docs/rozhodnutia.md` s dátumom, história do denníka. Branislavovi aj tebe Claude tyká, klientovi vo všetkých výstupoch vyká.

## 3. Pravidlá, ktoré platia vždy
- V repozitári sú len fiktívne dáta. Skutočné dáta klientov sem nikdy nedávaj, ani na skúšku.
- Žiadne tokeny, heslá ani kľúče v súboroch.
- Nič neodchádza do Slacku ani e-mailom bez výslovného súhlasu v chate. Testy len do `#first-mate-demo` a `#first-mate-developer`.
- Pôvodné panely a artefakty (zoznam v `legacy/README.md`) sa neprepisujú. Oficiálny demo panel https://claude.ai/artifact/VZWUmbcEU4WihYycwT3GQK patrí Branislavovi; prepisuje ho `/zverejni-demo` a nočná plánovaná úloha v jeho účte.

## 4. Vlastná kópia demo panela
Artefakty na claude.ai patria účtu, ktorý ich zverejnil. Ak chceš demo panel skúšať a meniť u seba, zverejni si vlastnú kópiu. V session napíš:

> Zostav demo panel a zverejni ho ako môj **nový** artefakt „First Mate · demo panel (Marcel)“. Nie na adresu z klienti/demo/verzie.md.

Claude urobí:
1. `npm test` a `python3 tools/build.py demo`,
2. Artifact publish **bez** `url`: `file_path` = `dist/demo/zverejnenie/index.html`, `root` = `dist/demo/zverejnenie`, `files` podľa `dist/demo/build.json` (`zverejnenie.subory`, súbory `.md` s typom `text/markdown`), capabilities `db`, `mcp` (Slack: `slack_send_message`, `slack_read_channel`; Gmail: `send_message`) a `sample`,
3. adresu tvojej kópie zapíše do denníka, nie do `klienti/demo/verzie.md` (tá patrí oficiálnemu panelu).

Tvoja kópia je súkromná; zdieľať ju môžeš cez Share v artefakte. Odoslanie do Slacku a e-mailom z nej pôjde cez tvoje konektory (bod 1).

## 5. Nový klient: `/novy-klient`
1. Napíš `/novy-klient` (prípadne s menom, napr. `/novy-klient Realitka Sever`).
2. Claude sa jednou otázkou spýta na všetko potrebné: názov a slug, typ firmy (realitka alebo developer), prepínač typov, režim (klient alebo demo), e-mail (Gmail alebo Outlook), Slack kanál a príkaz v Claude, tím a roly.
3. Zo šablóny `klienti/_sablona/` vytvorí `klienti/<slug>/nastavenia.json` (popis polí v `klienti/_sablona/README.md`), spustí testy a build, založí `klienti/<slug>/verzie.md`, riadok v `klienti/index.md` a GitHub Issue „Inštalácia <klient>“ so zoznamom toho, čo ostáva (zverejnenie, konektory u klienta, plánovaná úloha).
4. Zverejnenie panela klientovi je samostatný krok a robí sa až po dohode s Branislavom.

Do nastavení patria len názvy, ID kanálov a adresy príjemcov, ktoré klient dal. Dáta klienta ostávajú u klienta.

## 6. Kde čo je (skrátene)
- `hot.md` · čo sa práve deje · `dennik/` · čo sa kedy urobilo · `docs/rozhodnutia.md` · prečo
- `panel/` · jadro panela · `usecases/` · katalóg signálov a tipov · `klienti/` · nastavenia a verzie klientov
- `data/<typ>/` · ukážkové CSV (UTF-8 s BOM, `;`, desatinná čiarka; `data/slovnik_dat.md`)
- `tests/` · golden a UI testy · `tools/` · build, release, export · `.claude/commands/` · príkazy `/build`, `/novy-klient`, `/release`, `/zverejni-demo`, `/export-usecases`, `/koniec`
- `CHANGELOG.md` · čo prinieslo ktoré vydanie
