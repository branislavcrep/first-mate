---
description: Zostaví a znovu zverejní demo panel First Mate
---
# /zverejni-demo · KOSTRA (naplní sa vo fáze 6 migrácie)

Ak `klienti/demo/verzie.md` neobsahuje adresu demo artefaktu, povedz, že príkaz bude funkčný po fáze 6, a skonči.

Postup:
1. Spusti `/build demo` (vrátane golden testov).
2. Zverejni `dist/demo/index.html` nástrojom Artifact na **existujúcu** adresu demo panela z `klienti/demo/verzie.md` (nikdy nie na pôvodné artefakty zo zoznamu v `legacy/README.md`).
3. Do `klienti/demo/verzie.md` pridaj riadok: dátum, verzia, commit.
4. Nič neposielaj do Slacku ani e-mailom.
5. Denník a commit.
