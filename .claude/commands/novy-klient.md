---
description: Založí nového klienta First Mate (nastavenia, build, Issue)
---
# /novy-klient · KOSTRA (naplní sa vo fáze 5 migrácie)

Ak `klienti/_sablona/` a `tools/build.py` ešte neexistujú, povedz, že príkaz bude funkčný po fáze 5 (`docs/migracia/PLAN.md`), a skonči.

Postup:
1. Opýtaj sa (jednou otázkou, po bodoch): názov klienta a slug, typ firmy (`realitka` / `developer` / `stavebna-firma`), prepínač typov (áno/nie), e-mail (Gmail / Outlook), Slack kanály, tím (mená a roly).
2. Vytvor `klienti/<slug>/nastavenia.json` zo šablóny a `klienti/<slug>/verzie.md`. Žiadne skutočné dáta klienta, žiadne kľúče ani tokeny.
3. Zapíš klienta do `klienti/index.md`.
4. Spusti `python3 tools/build.py <slug>` a over, že `dist/<slug>/index.html` vznikol.
5. Založ GitHub Issue „Inštalácia <klient>“ so štítkom `klient`.
6. Zapíš do denníka a commitni.

Argumenty: $ARGUMENTS (voliteľne slug klienta)
