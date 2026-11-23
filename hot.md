# Čo sa práve deje

Aktualizované: 2026-11-23 · Branislav (session v Claude Code v cloude)

## Aktívne
- Migrácia na jedno jadro podľa `docs/migracia/PLAN.md`. Fáza 0 hotová, **fáza 1 hotová, čaká na STOP schválenie Branislavom** (zhrnutie v chate). Po schválení: zlúčiť vetvu `claude/modest-allen-y0yufw` do `main` a začať fázu 2 (golden testy, Issue #1).
- Úlohy migrácie sú v GitHub Issues #1–#6 (fázy 2–7), štítky `migracia`, `jadro`, `katalog`, `realitka`, `developer`, `stavebna-firma`, `klient`.
- Pôvodné panely bežia ďalej (slugy v `legacy/README.md`), Immocap má balík z 19.–20. 11.

## Výsledok fázy 1
- Indexy: `docs/index.md`, `data/index.md`, `tools/index.md`.
- Hooky: `.claude/settings.json` → `tools/hooks/koniec_session.py` (Stop blokuje raz pri necommitnutých/nepushnutých zmenách alebo chýbajúcom dnešnom zázname v denníku; SessionStart vypíše hot.md). Lokálne otestované; či ich cloud načíta, sa ukáže na začiatku ďalšej session (výpis hot.md).
- Kostry príkazov v `.claude/commands/`.
- Test artefaktu: https://claude.ai/artifact/HA9ygyGrhrRWdjbTyhf4NV — viac súborov funguje, db a Slack overené zo session. **Branislav má ešte kliknúť T3 AI, T4 db, T5 Slack v artefakte.** Tlačidlo „Poslať testovaciu správu“ len so súhlasom.
- Rozhodnutie: nový panel zverejňuje Claude Code (detail v `docs/rozhodnutia.md`).

## Otvorené otázky
- Výsledok T3 (AI `sample`) v prehliadači – doplní Branislav.
- Farby štítkov v GitHube (zatiaľ sivé, MCP nevie meniť štítky) – nastaviť ručne, ak treba.
- Plugin First Mate pre Cowork (fm.py, fin_model.py) zatiaľ nie je v repozitári: je v balíku First-Mate-Immocap.zip u Branislava.
- Marcelov GitHub účet zatiaľ neznámy.

## Kam ísť ďalej
- Plán migrácie: docs/migracia/PLAN.md (ďalej fáza 2)
- Rozhodnutia: docs/rozhodnutia.md
- Pôvodné panely: legacy/README.md
- Dáta: data/index.md
