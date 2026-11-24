# Nastavenia klienta · popis polí

Súbor `klienti/<klient>/nastavenia.json` číta panel pri štarte (meta `fm-nastavenia`, build ho skopíruje do `dist/<klient>/nastavenia.json`). Chýbajúce pole = správanie demo panela.

| Pole | Význam |
|---|---|
| `klient`, `nazov` | slug a názov; v klientskom režime sa názov zobrazí v hornom pruhu |
| `rezim` | `demo` (texty ukážky) alebo `klient` (texty „môj panel“, dáta z priečinka First Mate) |
| `prepinac`, `typy`, `typ` | povolené typy firmy, predvolený typ; prepínač len pri `prepinac: true` |
| `menu.<typ>` | `[{ id, nazov?, zapnute? }]`: poradie, názvy a vypnutie záložiek (základ v `usecases/typy.json`) |
| `zalozka_tipy` | zapne záložku Čo vyskúšať (tipy z katalógu use casov) |
| `potvrdenie_pred_odoslanim` | pred každým odoslaním okno s príjemcami a predmetom |
| `signaly_len_na_citanie` | hranice signálov sa v paneli nemenia, bez vlastných signálov |
| `rozvrh` | `panel` (dni, čas, kanály v paneli) alebo `planovana-uloha` (len informácia o plánovanej úlohe v Claude) |
| `predvolene` | `email`, `finEmail`, `prvy_clen` alebo celý `tim` `[{ meno, rola, osoba?, email?, rozsah?, aktivny? }]`; u klienta bez adries Books & Mirror |
| `slack` | `workspace`, `kanaly: [{ typ?, id, nazov }]`, `prikaz` (príkaz v Claude, napr. `/first-mate`) |
| `email` | `sluzba`, `server` (konektor), `odoslat` a `koncept`: `{ nastroj, argumenty }` so šablónami `{{prijemcovia}}`, `{{prijemcovia_text}}`, `{{prijemcovia_graph}}`, `{{predmet}}`, `{{text}}`, `{{html}}` |

Roly tímu: realitka `manazer`, `makler`; developer `riaditel`, `vedenie` (finančný brífing), `predajca`.

Outlook (Microsoft 365) zatiaľ nie je overený naostro (Issue #13): názvy nástrojov a tvar argumentov over pri inštalácii v konektore klienta, šablónu nevymýšľaj.
