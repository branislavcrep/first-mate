# Slovník dát · First Mate demo · developer · financie

Doplnok k `data/slovnik_dat.md`. Simulované dáta vytvorené 19. 11. 2026, stav k referenčnému dátumu 2026-11-02 (rovnaký ako predaj). Formát ako ostatné súbory: UTF-8 s BOM, `;`, desatinná čiarka, dátumy `RRRR-MM-DD`, riadky CRLF.

Finančné súbory sú pre panel **voliteľné**: bez nich funguje predaj (S1–S8), sekcia Financie a finančný brífing sú prázdne. Sumy v rozpočte a cash-flow sú **bez DPH**; ceny jednotiek a krytie úveru zmluvami sú **s DPH**.

## Väzby

| Z | Na |
|---|---|
| dev_uver.projekt_id, dev_tranze.projekt_id, dev_rozpocet.projekt_id, dev_cashflow.projekt_id | dev_projekty.id |
| dev_tranze.uver_id | dev_uver.id |
| dev_podmienky_cerpania.tranza_id | dev_tranze.id |
| dev_cashflow.rozpocet_id | dev_rozpocet.id (prázdne pri príjmoch) |

## developer/dev_projekty.csv · nové stĺpce

| Stĺpec | Typ | Význam |
|---|---|---|
| `dph_pct` | číslo | Sadzba DPH pri predaji jednotiek (na prepočet príjmov bez DPH), ukážka 23 |
| `zaloha_pct` | číslo | Záloha z ceny podľa splátkového kalendára (PL 20, NZ 10); zvyšok platí kupujúci pri kolaudácii |
| `zaloha_milnik` | dátum | Splatnosť zálohy (míľnik stavby), pre nové zmluvy po míľniku záloha hneď |
| `cielove_irr_vk_pct` | číslo | Cieľové IRR vlastného kapitálu investorov (signál F5, F6) |
| `vlastny_kapital_plan_eur` | číslo | Prisľúbený vlastný kapitál na projekt |
| `vlastny_kapital_vlozeny_eur` | číslo | Doteraz vložený vlastný kapitál |

## developer/dev_uver.csv (2)

| Stĺpec | Typ | Význam |
|---|---|---|
| `id` | text | U-PL, U-NZ |
| `projekt_id` | text | väzba na projekt |
| `banka`, `typ` | text | Tatra banka / Slovenská sporiteľňa, Developerský úver |
| `limit_eur` | číslo | Limit úveru |
| `urok_pct` | číslo | Úroková sadzba p. a. |
| `splatnost` | dátum | Konečná splatnosť (zvyšok istiny vtedy doplatí vlastný kapitál) |
| `kovenant_krytie_x` | číslo | Minimálne krytie čerpaného úveru zmluvami (hodnota podpísaných zmlúv s DPH / čerpaný úver), signál F2 |
| `poznamka` | text | |

Čerpaná suma sa neukladá, panel ju počíta z tranží so stavom „Načerpaná“.

## developer/dev_tranze.csv (9)

| Stĺpec | Typ | Význam |
|---|---|---|
| `id` | text | T-PL-1 … T-NZ-4 |
| `uver_id`, `projekt_id` | text | väzby |
| `poradie` | číslo | poradie tranže |
| `suma_eur` | číslo | výška tranže |
| `planovane_cerpanie` | dátum | plánovaný dátum čerpania |
| `stav` | text | Načerpaná, Plánovaná |
| `datum_cerpania` | dátum | skutočné čerpanie (len načerpané) |
| `ucel` | text | na čo sa tranža použije |

## developer/dev_podmienky_cerpania.csv (14)

| Stĺpec | Typ | Význam |
|---|---|---|
| `id` | text | PC01 … PC14 |
| `tranza_id` | text | väzba na tranžu |
| `typ` | text | `predpredaj_pct` (% predaných bytov, počíta panel), `krytie_x` (krytie úveru zmluvami po čerpaní tejto tranže a predchádzajúcich plánovaných, počíta panel), `vlastny_kapital_eur` (vložený vlastný kapitál, z dev_projekty), `manualne` (potvrdenia TDI, dokumenty) |
| `popis` | text | podmienka slovami |
| `ciel` | číslo | cieľová hodnota (pri `manualne` prázdne) |
| `splnene` | ano/nie | len pri `manualne` |
| `zodpovedny` | text | rola, ktorá podmienku zabezpečuje |

## developer/dev_rozpocet.csv (18)

| Stĺpec | Typ | Význam |
|---|---|---|
| `id` | text | R-PL-01 … R-NZ-09 |
| `projekt_id` | text | väzba |
| `polozka` | text | Pozemok, Projekcia a inžiniering, Hrubá stavba, TZB, Fasáda a strecha, Dokončovacie práce, Vonkajšie úpravy a prípojky, Marketing a predaj, Rezerva |
| `skupina` | text | Pozemok, Príprava, Výstavba, Predaj, Rezerva (Výstavba váži dokončenie stavby, Rezerva kryje prekročenia) |
| `rozpocet_eur` | číslo | rozpočet podľa biznis plánu |
| `zazmluvnene_eur` | číslo | zazmluvnené s dodávateľmi |
| `vyfakturovane_eur` | číslo | vyfakturované (= súčet skutočnosti v cash-flow) |
| `dokoncenie_pct` | číslo | percento dokončenia položky |
| `odhad_na_dokoncenie_eur` | číslo | odhad celkových nákladov položky (EAC) |
| `dodavatel` | text | |
| `aktualizovane` | dátum | dátum poslednej aktualizácie rozpočtu |

Rezerva: minutá časť = súčet prekročení ostatných položiek (odhad − rozpočet); nevyčerpaná rezerva sa v odhade výnosnosti počíta ako náklad.

## developer/dev_cashflow.csv (205)

| Stĺpec | Typ | Význam |
|---|---|---|
| `id` | text | CF0001 … |
| `projekt_id`, `rozpocet_id` | text | väzby (pri príjmoch `rozpocet_id` prázdne) |
| `polozka` | text | názov položky alebo „Príjmy z predaja (biznis plán)“ |
| `typ` | text | Náklad, Príjem |
| `mesiac` | dátum | prvý deň mesiaca (tok sa počíta k 15. dňu) |
| `plan_eur` | číslo | plán podľa biznis plánu |
| `skutocnost_eur` | číslo | skutočnosť (náklady do 10/2026); prázdne = budúci mesiac |

Skutočné príjmy panel neberie z cash-flow, ale z jednotiek (zálohy a doplatky zo zmlúv), aby sa nepočítali dvakrát.

## Ako panel počíta výnosnosť (F5, F6)

Mesačné toky bez DPH relatívne k dnešku. Náklady: skutočnosť z cash-flow, zvyšok položky (odhad − skutočnosť) rozložený podľa plánu budúcich mesiacov. Príjmy: podpísané zmluvy (záloha podľa `zaloha_*`, doplatok mesiac po kolaudácii), rezervácie ako zmluva v tomto mesiaci, voľné jednotky za aktuálny cenník v tempe posledných 90 dní. Úver: tranže v termínoch, úrok mesačne, istina sa spláca z prebytku po kolaudácii, do splatnosti. Vlastný kapitál dopĺňa záporný zostatok a dostane prebytok po splatení úveru. IRR = mesačné IRR prepočítané na rok. Biznis plán je ten istý výpočet nad stĺpcami `plan_eur`. Referenčný výpočet v Pythone je v `tools/first_mate_financny_model.py`.
