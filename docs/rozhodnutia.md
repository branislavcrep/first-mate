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
