# Verzie · First Mate · demo

- Artefakt: „First Mate · demo panel“ https://claude.ai/artifact/VZWUmbcEU4WihYycwT3GQK (súkromný, zdieľa sa ručne cez Share; pôvodné panely z `legacy/README.md` sa neprepisujú)
- Zverejňuje sa `dist/demo/zverejnenie/` (stránka + súbory podľa `dist/demo/build.json`), capabilities `db`, `mcp` (Slack: `slack_send_message`, `slack_read_channel`; Gmail: `send_message`), `sample`
- Nastavenia: `klienti/demo/nastavenia.json` · typy realitka a developer, prepínač
- Build: `python3 tools/build.py demo` → `dist/demo/`

| Dátum | Verzia | Commit | Čo sa stalo |
|---|---|---|---|
| 2026-11-24 | 0.5.0 | 9aa79ec | nastavenia a build pripravené (fáza 5), zatiaľ nezverejnené |
| 2026-11-24 | 0.5.0 | e6e4978 | prvé zverejnenie nového demo panela (verzia artefaktu 1795499383-4aa1), čaká na vyskúšanie |
| 2026-11-24 | 0.5.0 | e6e4978 | Branislav vyskúšal panel; odoslanie do Slacku a e-mailom z panela funguje |
| 2026-11-24 | 1.0.0 | 1792661 | znovu zverejnené (verzia artefaktu 1795517376-3b29) |
