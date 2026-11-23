# Slovník dát · First Mate demo

Export z Attio (workspace books-mirror) 19. 11. 2026 o 12:53. Fiktívne dáta.

> Poznámka k repozitáru (23. 11. 2026): sekcie pre `realitka/kontakty.csv`, `firmy.csv` a `ulohy.csv` sú vynechané, lebo tieto súbory panel nepoužíva a v repozitári zatiaľ nie sú (ležia v projekte First Mate na claude.ai). Väzby na ne sú ponechané kvôli úplnosti.

## Formát všetkých súborov

- kódovanie UTF-8 s BOM, oddeľovač `;`, úvodzovky podľa RFC 4180 (pole s `;`, `"` alebo zalomením je v úvodzovkách, `"` sa zdvojuje), riadky CRLF
- dátum `RRRR-MM-DD`; dátum a čas `RRRR-MM-DDTHH:MM` v miestnom čase Europe/Bratislava (Attio ukladá UTC, pri exporte prepočítané)
- číslo s desatinnou čiarkou, bez oddeľovača tisícov (`48,8`, `213900`)
- áno/nie (checkbox v Attio) ako `ano` / `nie`; výbery s možnosťami „Áno/Nie“ zostávajú ako hodnota výberu
- chýbajúca hodnota = prázdne pole; viac hodnôt v jednom poli oddelených `|`
- prvý stĺpec `id` je stabilný kód (PL, PL-A-101, DD001, N015, D0001, O0001, K0001, F01, U01); väzby medzi súbormi idú cez tieto kódy; posledný stĺpec `attio_id` je pôvodné ID v Attio
- názvy ostatných stĺpcov sú slugy atribútov z Attio (rovnaké ako v kóde panelov a v skilloch); navyše `projekt_id` (väzba cez kód)

## Väzby

| Z | Na | Poznámka |
|---|---|---|
| dev_jednotky.projekt_id | dev_projekty.id | aj dev_jednotky.projekt = dev_projekty.nazov |
| dev_dopyty.projekt_id | dev_projekty.id | |
| dev_dopyty.jednotka | dev_jednotky.id | |
| dopyty.nehnutelnost, obhliadky.nehnutelnost | nehnutelnosti.id | |
| dopyty.kontakt, obhliadky.kontakt | kontakty.id | |
| nehnutelnosti.associated_people | kontakty.id | viac hodnôt oddelených zvislou čiarou |
| kontakty.associated_deals | nehnutelnosti.id | viac hodnôt oddelených zvislou čiarou |
| kontakty.company | firmy.id | |
| ulohy.linked_records | nehnutelnosti.id | |

## developer/dev_projekty.csv

Objekt Attio `dev_projekty`. Záznamov: **2**. Finančné stĺpce sú v `slovnik_dat_financie.md`.

| Stĺpec | Typ | Povolené hodnoty | Význam |
|---|---|---|---|
| `id` | text |  | Stabilný kód záznamu, primárny kľúč pre import (vyplnené 2/2) |
| `kod` | text |  | Kód projektu (vyplnené 2/2) |
| `nazov` | text |  | Názov projektu (vyplnené 2/2) |
| `lokalita` | text | Bratislava – Lamač, Senec | Lokalita (vyplnené 2/2) |
| `etapa` | text | 1. etapa, 1. etapa (bloky A, B) | Etapa výstavby (vyplnené 2/2) |
| `faza_vystavby` | text | Hrubá stavba dokončená, Základy | Aktuálna fáza stavby (vyplnené 2/2) |
| `predajne_miesto` | text |  | Kde sa predáva (vyplnené 2/2) |
| `zaciatok_predaja` | dátum |  | Začiatok predaja (vyplnené 2/2) |
| `termin_kolaudacie` | dátum |  | Plánovaná kolaudácia (vyplnené 2/2) |
| `uzavierka_klientskych_zmien` | dátum |  | Termín uzávierky klientskych zmien (signál S6) (vyplnené 2/2) |
| `banka_predpredaj_pct` | číslo |  | Podmienka banky: % predaných bytov (signál S1) (vyplnené 2/2) |
| `banka_predpredaj_do` | dátum |  | Termín splnenia podmienky banky (vyplnené 2/2) |
| `plan_predaja_pct_k_dnesku` | číslo |  | Plán predaja k dnešku v % (vyplnené 2/2) |
| `priemer_konkurencie_za_m2_eur` | číslo |  | Priemerná cena konkurencie €/m² (vyplnené 2/2) |
| `created_at` | dátum a čas (neposúva sa) |  | Kedy bol záznam vytvorený v Attio (metadáta, panel ho neposúva) (vyplnené 2/2) |
| `attio_id` | text |  | Pôvodné ID záznamu v Attio, len pre spätné dohľadanie (vyplnené 2/2) |

## developer/dev_jednotky.csv

Objekt Attio `dev_jednotky`. Byty, obchodné priestory, parkovanie. Záznamov: **63**.

| Stĺpec | Typ | Povolené hodnoty | Význam |
|---|---|---|---|
| `id` | text |  | Stabilný kód záznamu, primárny kľúč pre import (vyplnené 63/63) |
| `kod` | text |  | Kód jednotky (projekt-blok-číslo) (vyplnené 63/63) |
| `projekt` | text | Nové Záhrady Senec, Rezidencia Pod Lesom | Názov projektu (hodnota z Attio, panel páruje podľa názvu) (vyplnené 63/63) |
| `projekt_id` | text |  | Kód projektu, väzba na dev_projekty.id (vyplnené 63/63) |
| `typ` | text | Byt, Obchodný priestor, Parkovacie státie | Typ jednotky (vyplnené 63/63) |
| `blok` | text | A, B | Blok (vyplnené 34/63) |
| `izby` | číslo |  | Počet izieb (vyplnené 52/63) |
| `podlazie` | číslo |  | Podlažie (vyplnené 63/63) |
| `orientacia` | text | J, J/V, J/Z, S, V | Orientácia (vyplnené 55/63) |
| `plocha_m2` | číslo |  | Plocha v m² (vyplnené 63/63) |
| `exterier` | text | Balkón, Predzáhradka, Terasa | Typ exteriéru (vyplnené 52/63) |
| `exterier_m2` | číslo |  | Plocha exteriéru v m² (vyplnené 52/63) |
| `cena_s_dph_eur` | číslo |  | Cena s DPH € (vyplnené 63/63) |
| `cena_za_m2_eur` | číslo |  | Cena za m² € (vyplnené 55/63) |
| `stav` | text | Voľná, Rezervovaná, Zmluva o budúcej (panel počíta ako predané aj Kúpna zmluva, Odovzdaná) | Stav predaja (vyplnené 63/63) |
| `predajca` | text | Martina Vargová, Michal Hrnčiar, Zuzana Polakovičová | Priradený predajca (vyplnené 63/63) |
| `datum_zmeny_stavu` | dátum |  | Dátum poslednej zmeny stavu (vyplnené 35/63) |
| `rezervacia_do` | dátum |  | Rezervácia platí do (signál S3) (vyplnené 4/63) |
| `zaloha_eur` | číslo |  | Výška zálohy € (vyplnené 31/63) |
| `zaloha_splatna` | dátum |  | Splatnosť zálohy (signál S2) (vyplnené 31/63) |
| `zaloha_uhradena` | text | Áno, Nie (hodnota výberu z Attio, nie ano/nie) | Či je záloha uhradená (vyplnené 31/63) |
| `klientske_zmeny` | text | Nevyjadril sa, V riešení, Uzavreté, Bez zmien | Stav klientskych zmien (signál S6) (vyplnené 26/63) |
| `zobrazenia_30_dni` | číslo |  | Zobrazenia inzerátu za 30 dní (signál S7) (vyplnené 63/63) |
| `dopyty_30_dni` | číslo |  | Dopyty za 30 dní (údaj z Attio; panel počíta vlastné z dev_dopyty) (vyplnené 63/63) |
| `ponuka_od` | dátum |  | V ponuke od (vyplnené 63/63) |
| `poznamka` | text |  | Poznámka (napr. vzorový byt) (vyplnené 6/63) |
| `created_at` | dátum a čas (neposúva sa) |  | Kedy bol záznam vytvorený v Attio (vyplnené 63/63) |
| `attio_id` | text |  | Pôvodné ID záznamu v Attio (vyplnené 63/63) |

## developer/dev_dopyty.csv

Objekt Attio `dev_dopyty`. Záujemcovia vrátane obhliadok. Záznamov: **41**.

| Stĺpec | Typ | Povolené hodnoty | Význam |
|---|---|---|---|
| `id` | text |  | Stabilný kód záznamu (vyplnené 41/41) |
| `kod_dopytu` | text |  | Kód dopytu (vyplnené 41/41) |
| `meno` | text |  | Meno záujemcu (vyplnené 41/41) |
| `email` | text |  | E-mail (fiktívny, @example.com) (vyplnené 41/41) |
| `projekt` | text | Nové Záhrady Senec, Rezidencia Pod Lesom | Názov projektu (vyplnené 41/41) |
| `projekt_id` | text |  | Kód projektu, väzba na dev_projekty.id (vyplnené 41/41) |
| `jednotka` | text |  | Kód jednotky, väzba na dev_jednotky.id (vyplnené 41/41) |
| `typ_zaujmu` | text | Kúpa, Nájom | Kúpa alebo nájom (vyplnené 41/41) |
| `prijaty` | dátum a čas |  | Kedy dopyt prišiel (vyplnené 41/41) |
| `prva_reakcia` | dátum a čas |  | Prvá reakcia predajcu (vyplnené 35/41) |
| `reakcia_hodiny` | číslo |  | Čas do prvej reakcie v hodinách (vyplnené 35/41) |
| `stav` | text | Nový – bez reakcie, Kontaktovaný, Obhliadka dohodnutá, Obhliadka prebehla, Rezervácia, Nemá záujem | Stav dopytu (vyplnené 41/41) |
| `predajca` | text | Martina Vargová, Michal Hrnčiar, Zuzana Polakovičová | Priradený predajca (vyplnené 41/41) |
| `zdroj` | text | Web projektu, Nehnutelnosti.sk, Reality.sk, Facebook/Instagram, Partnerská RK, Billboard na stavenisku, Odporúčanie | Odkiaľ dopyt prišiel (vyplnené 41/41) |
| `partnerska_rk` | text | Nordik Reality, RK Domov Plus | Partnerská realitná kancelária (vyplnené 5/41) |
| `datum_obhliadky` | dátum |  | Dátum obhliadky (vyplnené 20/41) |
| `miesto_obhliadky` | text | Vzorový byt, Predajné miesto | Miesto obhliadky (vyplnené 20/41) |
| `vysledok_obhliadky` | text | Záujem o rezerváciu, Zvažuje, Nemá záujem | Výsledok obhliadky (vyplnené 15/41) |
| `follow_up` | text | Naplánovaný, Chýba, Netreba | Ďalší krok po obhliadke (signál S5) (vyplnené 15/41) |
| `spatna_vazba` | text |  | Spätná väzba záujemcu (vyplnené 16/41) |
| `gdpr_marketing` | text | Áno, Nie (hodnota výberu z Attio) | Súhlas s marketingom (vyplnené 41/41) |
| `created_at` | dátum a čas (neposúva sa) |  | Kedy bol záznam vytvorený v Attio (vyplnené 41/41) |
| `attio_id` | text |  | Pôvodné ID záznamu v Attio (vyplnené 41/41) |

## realitka/nehnutelnosti.csv

Objekt Attio `deals` (Nehnuteľnosti). Záznamov: **40**.

| Stĺpec | Typ | Povolené hodnoty | Význam |
|---|---|---|---|
| `id` | text |  | Stabilný kód záznamu (vyplnené 40/40) |
| `kod` | text |  | Kód nehnuteľnosti (vyplnené 40/40) |
| `name` | text |  | Názov inzerátu (vyplnené 40/40) |
| `stage` | text | Aktívna ponuka, Rezervácia, Predané, Stiahnutá | Fáza obchodu (vyplnené 40/40) |
| `typ` | text | byt, dom | Typ (vyplnené 40/40) |
| `lokalita` | text | Bratislava – Petržalka, Bratislava – Rača, Bratislava – Ružinov, Bratislava – Nové Mesto, Ivanka pri Dunaji, Pezinok, Senec, Trnava | Lokalita (vyplnené 40/40) |
| `izby` | číslo |  | Počet izieb (vyplnené 40/40) |
| `plocha_m2` | číslo |  | Plocha m² (vyplnené 40/40) |
| `stav_nehnutelnosti` | text | novostavba, kompletná rekonštrukcia, čiastočná rekonštrukcia, pôvodný stav | Stav nehnuteľnosti (vyplnené 40/40) |
| `value` | číslo |  | Hodnota obchodu € (Attio Deal value) (vyplnené 40/40) |
| `povodna_cena_eur` | číslo |  | Pôvodná cena € (vyplnené 40/40) |
| `cena_za_m2_eur` | číslo |  | Cena za m² € (vyplnené 40/40) |
| `priemer_lokality_za_m2_eur` | číslo |  | Priemer lokality €/m² (vyplnené 40/40) |
| `provizia` | číslo |  | Provízia % (vyplnené 40/40) |
| `makler` | text | Lucia Hudáková, Juraj Šimko, Tomáš Kováč, Simona Lukáčová, Katarína Bartošová, Peter Molnár | Maklér (vyplnené 40/40) |
| `exkluzivita` | ano/nie |  | Exkluzívna zmluva (vyplnené 40/40) |
| `exkluzivita_do` | dátum |  | Exkluzivita platí do (vyplnené 23/40) |
| `datum_nasadenia` | dátum |  | Dátum nasadenia inzerátu (vyplnené 40/40) |
| `posledna_zmena_ceny` | dátum |  | Posledná zmena ceny (vyplnené 3/40) |
| `zobrazenia_spolu` | číslo |  | Zobrazenia spolu (vyplnené 40/40) |
| `zobrazenia_za_7_dni` | číslo |  | Zobrazenia za 7 dní (vyplnené 40/40) |
| `associated_people` | zoznam (\|) |  | Kontakty (predávajúci), väzba na kontakty.id (vyplnené 40/40) |
| `owner` | text | First Mate | Vlastník záznamu v Attio (vyplnené 40/40) |
| `created_at` | dátum a čas (neposúva sa) |  | Kedy bol záznam vytvorený v Attio (vyplnené 40/40) |
| `attio_id` | text |  | Pôvodné ID záznamu v Attio (vyplnené 40/40) |

## realitka/dopyty.csv

Zoznam Attio `dopyty` (rodičovský záznam je kontakt). Záznamov: **447**.

| Stĺpec | Typ | Povolené hodnoty | Význam |
|---|---|---|---|
| `id` | text |  | Stabilný kód záznamu (vyplnené 447/447) |
| `kod_dopytu` | text |  | Kód dopytu (vyplnené 447/447) |
| `kontakt` | text |  | Záujemca, väzba na kontakty.id (vyplnené 447/447) |
| `nehnutelnost` | text |  | Nehnuteľnosť, väzba na nehnutelnosti.id (vyplnené 447/447) |
| `prijaty` | dátum a čas |  | Kedy dopyt prišiel (vyplnené 447/447) |
| `zdroj_dopytu` | text | web kancelárie, nehnutelnosti.sk, topreality.sk, reality.sk | Zdroj (vyplnené 447/447) |
| `makler` | text | ako v nehnutelnosti.csv | Maklér (vyplnené 447/447) |
| `prva_reakcia` | dátum a čas |  | Prvá reakcia makléra (vyplnené 436/447) |
| `reakcia_hodiny` | číslo |  | Čas do prvej reakcie v hodinách (vyplnené 436/447) |
| `stav_dopytu` | text | nový – bez reakcie, kontaktovaný, obhliadka dohodnutá, nemá záujem | Stav dopytu (vyplnené 447/447) |
| `created_at` | dátum a čas (neposúva sa) |  | Kedy bol záznam vytvorený v Attio (vyplnené 447/447) |
| `attio_id` | text |  | Pôvodné ID záznamu v Attio (vyplnené 447/447) |

## realitka/obhliadky.csv

Zoznam Attio `obhliadky` (rodičovský záznam je kontakt). Záznamov: **171**.

| Stĺpec | Typ | Povolené hodnoty | Význam |
|---|---|---|---|
| `id` | text |  | Stabilný kód záznamu (vyplnené 171/171) |
| `kod_obhliadky` | text |  | Kód obhliadky (vyplnené 171/171) |
| `kontakt` | text |  | Záujemca, väzba na kontakty.id (vyplnené 171/171) |
| `nehnutelnost` | text |  | Nehnuteľnosť, väzba na nehnutelnosti.id (vyplnené 171/171) |
| `datum_obhliadky` | dátum a čas |  | Dátum a čas obhliadky (vyplnené 171/171) |
| `makler` | text | ako v nehnutelnosti.csv | Maklér (vyplnené 171/171) |
| `vysledok` | text | záujem, zvažuje, nemá záujem, rezervácia | Výsledok (vyplnené 171/171) |
| `spatna_vazba` | text |  | Spätná väzba (vyplnené 171/171) |
| `created_at` | dátum a čas (neposúva sa) |  | Kedy bol záznam vytvorený v Attio (vyplnené 171/171) |
| `attio_id` | text |  | Pôvodné ID záznamu v Attio (vyplnené 171/171) |

## Čo export neobsahuje

- Poznámky: vo workspace nie sú žiadne (0).
- E-maily, hovory a stretnutia: workspace nemá pripojenú poštu ani kalendár.
- Nastavenia pohľadov (views) a používateľov workspace (jediný člen: First Mate).
