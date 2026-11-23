# tools/

- first_mate_financny_model.py — referenčný finančný model v Pythone (nezávislá implementácia `FIN.compute`, funkcie `summary`, `signals`) na overenie čísel F1–F6
- hooks/koniec_session.py — hooky Claude Code: `stop` blokuje koniec session pri necommitnutých/nepushnutých zmenách alebo chýbajúcom dnešnom zázname v denníku (raz, potom pustí); `start` vypíše prvých 40 riadkov `hot.md`
