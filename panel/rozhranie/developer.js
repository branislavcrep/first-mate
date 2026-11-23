// First Mate · rozhranie typu developer: čo sa v paneli líši od iných typov (signály, tím, texty).
// Výpočty sú v panel/typy/developer.js a panel/usecases/, tu len popisy a texty pre rozhranie.
import FM, { CSV } from "../typy/developer.js";
import FIN from "../financie/fin.js";

export const SIG = [
  { k: "s1", t: "Podmienka banky", d: "Banka pustí úver až pri určitom podiele predaných bytov. Signál stráži, koľko zmlúv chýba a koľko dní zostáva do termínu.", p: [["days", "Upozorniť dní pred termínom", 7, 365]] },
  { k: "s2", t: "Zálohy po splatnosti", d: "Zálohy kupujúcich podľa splátkového kalendára, ktoré nie sú uhradené. Bez nich sa zdrží čerpanie úveru a cash-flow stavby.", p: [["graceDays", "Tolerancia (dni po splatnosti)", 0, 60]] },
  { k: "s3", t: "Končiace rezervácie", d: "Rezervácie, ktoré čoskoro vypršia bez zmluvy o budúcej zmluve, aj tie, ktoré už vypršali a jednotka stále nie je voľná.", p: [["days", "Končí do (dni)", 1, 30]] },
  { k: "s4", t: "Dopyty bez reakcie", d: "Záujemca, ktorému sa nikto neozval dlhšie ako hranica. Ukáže aj vyťaženosť a rýchlosť jednotlivých predajcov.", p: [["hours", "Hranica (hodiny)", 1, 240]] },
  { k: "s5", t: "Obhliadky bez ďalšieho kroku", d: "Záujemca bol na obhliadke vzorového bytu alebo na predajnom mieste, ale nemá dohodnutý ďalší krok. Tu sa strácajú rezervácie.", p: [["days", "Od obhliadky aspoň (dni)", 1, 30]] },
  { k: "s6", t: "Klientske zmeny", d: "Blíži sa uzávierka zmien štandardu a niektorí kupujúci sa ešte nevyjadrili. Po uzávierke sa zmeny robiť nedajú alebo sú drahé.", p: [["days", "Uzávierka do (dni)", 1, 90]] },
  { k: "s7", t: "Ležiaky", d: "Voľné byty, ktoré si ľudia pozerajú, ale nikto o ne neprejavil záujem. Zároveň ukáže typy, ktoré sa už vypredali, ako podklad pre cenník a ďalšiu etapu.", p: [["minViews", "Min. zobrazení za 30 dní", 10, 5000], ["minDays", "V predaji aspoň (dni)", 0, 365]] },
  { k: "s8", t: "Obchodné priestory", d: "Obchodné priestory, ktoré sa dlho nepredali. Signál porovná, či záujemcovia chcú kúpu alebo nájom.", p: [["days", "V ponuke dlhšie ako (dni)", 30, 720]] }
];
export const FSIG = [
  { k: "f1", t: "Podmienky čerpania tranží", d: "Stráži všetky podmienky najbližších tranží naraz: predpredaj, krytie úveru po čerpaní, vlastný kapitál a potvrdenia technického dozoru. Ukáže, čo chýba, a koľko vlastných zdrojov by stálo neskoršie čerpanie.", p: [["days", "Upozorniť dní pred čerpaním", 7, 365]] },
  { k: "f2", t: "Krytie úveru zmluvami", d: "Hodnota podpísaných zmlúv (s DPH) voči čerpanému úveru a kovenantu banky. Ukáže aj, ako krytie klesne po najbližšej tranži.", p: [["buffer", "Rezerva nad kovenantom (%)", 0, 100]] },
  { k: "f3", t: "Potrebné tempo predaja", d: "Koľko zmlúv mesačne treba na podmienku banky, podmienky tranží a vypredanie do kolaudácie, oproti tempu posledných 90 dní. Odhadne, kedy sa cieľ pri dnešnom tempe naozaj splní.", p: [["pct", "Potrebné tempo vyššie o (%)", 0, 300]] },
  { k: "f4", t: "Rozpočet a rezerva", d: "Položky rozpočtu nad toleranciou, čerpanie rezervy oproti postupu stavby a či na dokončenie stačia prisľúbené vlastné zdroje.", p: [["tol", "Tolerancia položky (%)", 0, 50], ["rezPp", "Rezerva minutá rýchlejšie ako stavba o (p. b.)", 0, 100]] },
  { k: "f5", t: "IRR projektu a vlastného kapitálu", d: "Odhad výnosnosti z aktuálnych dát oproti biznis plánu a cieľu investorov. Rozloží zmenu IRR na vplyv predaja (tempo a ceny) a nákladov.", p: [["pp", "Pokles IRR projektu oproti plánu (p. b.)", 0, 20]] },
  { k: "f6", t: "Stres test", d: "Ako sa zmení IRR a zisk pri nižších cenách voľných jednotiek, vyšších nákladoch, neskoršej kolaudácii a vyššom úroku, aj všetko naraz. Upozorní, keď scenár padne pod cieľ alebo do straty.", p: [["cena", "Pokles cien (%)", 0, 50], ["naklady", "Rast nákladov (%)", 0, 50], ["mesiace", "Oneskorenie kolaudácie (mes.)", 0, 24], ["urok", "Rast úroku (p. b.)", 0, 10]] }
];


// zdroje dát pre signály (tlačidlo Zdroje)
export const SRC = {
  s1: { z: [["CRM alebo cenník", "stav každej jednotky (voľná, rezervovaná, zmluva o budúcej zmluve, kúpna zmluva) a dátum zmeny"], ["Úverová zmluva", "požadovaný podiel predaných bytov a termín jeho splnenia"]], f: "dev_projekty.csv, dev_jednotky.csv" },
  s2: { z: [["Zmluvy s kupujúcimi alebo CRM", "splátkový kalendár: výška a splatnosť každej zálohy"], ["Účtovníctvo alebo výpis z banky", "úhrady záloh, ideálne z viazaného účtu na zálohy"]], f: "dev_jednotky.csv" },
  s3: { z: [["CRM", "rezervácie s dátumom platnosti, záujemca a predajca"], ["Rezervačné zmluvy", "ak sa neevidujú v CRM, aspoň dátum platnosti"]], f: "dev_jednotky.csv, dev_dopyty.csv" },
  s4: { z: [["CRM", "dopyty záujemcov s časom prijatia, časom prvej reakcie a predajcom"], ["Web projektu a realitné portály", "kontaktné formuláre, ak neprichádzajú priamo do CRM"], ["Spoločná e-mailová schránka", "ak sa dopyty vybavujú e-mailom mimo CRM"]], f: "dev_dopyty.csv" },
  s5: { z: [["CRM", "obhliadky, ich výsledok a dohodnutý ďalší krok"], ["Kalendár predajcov", "naplánované obhliadky a stretnutia (voliteľné)"]], f: "dev_dopyty.csv" },
  s6: { z: [["Harmonogram stavby alebo zmluva s dodávateľom", "termín uzávierky klientskych zmien"], ["Evidencia klientskych zmien alebo CRM", "stav pri každom kupujúcom (nevyjadril sa, v riešení, uzavreté)"]], f: "dev_projekty.csv, dev_jednotky.csv" },
  s7: { z: [["Cenník (CRM alebo Excel)", "voľné byty, ceny a dátum zaradenia do ponuky"], ["Realitné portály a analytika webu", "zobrazenia inzerátu za posledných 30 dní"], ["CRM", "dopyty a spätná väzba záujemcov"]], f: "dev_jednotky.csv, dev_dopyty.csv" },
  s8: { z: [["Cenník (CRM alebo Excel)", "obchodné priestory, ceny a dátum zaradenia do ponuky"], ["CRM", "dopyty s typom záujmu (kúpa alebo nájom) a spätnou väzbou"]], f: "dev_jednotky.csv, dev_dopyty.csv" },
  f1: { z: [["Úverová zmluva", "tranže, ich výška, plánované termíny a podmienky čerpania"], ["Výpis z úverového účtu", "ktoré tranže sú načerpané a kedy"], ["CRM alebo cenník", "predané byty a hodnota podpísaných zmlúv"], ["Účtovníctvo alebo výpis z banky", "doteraz vložený vlastný kapitál"], ["Technický dozor investora", "potvrdenia o postupe stavby a o rozpočte"]], f: "dev_uver.csv, dev_tranze.csv, dev_podmienky_cerpania.csv, dev_jednotky.csv, dev_projekty.csv" },
  f2: { z: [["Úverová zmluva", "kovenant: minimálne krytie úveru zmluvami"], ["Výpis z úverového účtu", "čerpaná suma úveru"], ["CRM alebo zmluvy s kupujúcimi", "hodnota podpísaných zmlúv o budúcej zmluve a kúpnych zmlúv"]], f: "dev_uver.csv, dev_tranze.csv, dev_jednotky.csv" },
  f3: { z: [["CRM", "dátumy podpisu zmlúv za posledné 3 mesiace a zostávajúce voľné byty"], ["Úverová zmluva", "požadovaný predpredaj pre banku a pre jednotlivé tranže s termínmi"], ["Harmonogram stavby", "termín kolaudácie"]], f: "dev_jednotky.csv, dev_projekty.csv, dev_tranze.csv, dev_podmienky_cerpania.csv" },
  f4: { z: [["Rozpočet projektu (controlling alebo štúdia uskutočniteľnosti)", "rozpočet po položkách vrátane rezervy"], ["Zmluvy s dodávateľmi", "zazmluvnené sumy"], ["Účtovníctvo", "vyfakturované náklady po položkách"], ["Stavbyvedúci alebo technický dozor investora", "percento dokončenia a odhad nákladov na dokončenie"], ["Dohoda so spoločníkmi alebo investormi", "prisľúbený a vložený vlastný kapitál"]], f: "dev_rozpocet.csv, dev_cashflow.csv, dev_projekty.csv" },
  f5: { z: [["Štúdia uskutočniteľnosti alebo biznis plán", "plánované peňažné toky po mesiacoch a cieľová výnosnosť investorov"], ["Účtovníctvo", "skutočné náklady po mesiacoch"], ["Rozpočet s odhadom na dokončenie", "koľko ešte stavba bude stáť"], ["CRM a cenník", "podpísané zmluvy, zálohy a ceny voľných jednotiek"], ["Zmluvy s kupujúcimi", "splátkový kalendár: záloha a doplatok pri kolaudácii"], ["Úverová zmluva", "úroková sadzba, tranže a splatnosť úveru"]], f: "dev_cashflow.csv, dev_rozpocet.csv, dev_uver.csv, dev_tranze.csv, dev_jednotky.csv, dev_projekty.csv" },
  f6: { z: [["Rovnaké zdroje ako výnosnosť (F5)", "štúdia uskutočniteľnosti, účtovníctvo, rozpočet, CRM, úverová zmluva"], ["Vedenie alebo investori", "aké zhoršenie cien, nákladov, termínov a úrokov sa má testovať"]], f: "rovnaké ako F5" }
};
export const SRC_CUSTOM = { jednotky: { z: [["CRM alebo cenník", "údaje o jednotkách: stav, cena, predajca, zálohy, rezervácie"]], f: "dev_jednotky.csv" }, dopyty: { z: [["CRM", "dopyty záujemcov, obhliadky a ich výsledok"]], f: "dev_dopyty.csv" }, projekty: { z: [["CRM a úverová zmluva", "stav predaja projektu, plán a podmienka banky"]], f: "dev_projekty.csv, dev_jednotky.csv" } };

export default {
  id: "developer",
  FM, CSV, FIN,
  db: "fmdev",                 // dokumenty nastavení v db artefaktu: fmdev/settings, fmdev/log
  financie: true,              // Projekty, Financie, finančné signály, vlastné signály, zdroje dát
  osoba: "predajca", osobaLbl: "Predajca", osobyGen: "predajcov",
  osoby: () => FM.PREDAJCOVIA,
  roly: [["riaditel", "Riaditeľ predaja"], ["vedenie", "Majiteľ / financie"], ["predajca", "Predajca"]],
  rolaRozsah: { riaditel: "cely", vedenie: "financie" },
  rozsahy: [["cely", "Celý brífing"], ["svoje", "Len svoje"], ["financie", "Finančný brífing"]],
  minParam: 0,
  SIG, FSIG, SRC, SRC_CUSTOM,
  signaly(D, g) {
    const sig = {}; FM.KEYS.forEach(k => sig[k] = { ...D.signals[k], ...(g[k] || {}) });
    FIN.KEYS.forEach(k => sig[k] = { ...FIN.DEFAULTS[k], ...(g[k] || {}) });
    sig.custom = Array.isArray(g.custom) ? g.custom : [];
    return sig;
  },
  briefSig: S => JSON.stringify([...FM.KEYS.map(k => S.signals[k]), S.signals.custom]),
  summaryLine(b) {
    const p = [];
    b.projekty.forEach(x => p.push(`${x.kod} ${FM.fmtPct(x.soldPct)}`));
    if (b.s2.on && b.s2.count) p.push(`zálohy ${FM.eur(b.s2.suma)}`);
    if (b.s3.on) p.push(`${b.s3.count} rezerv.`);
    if (b.s4.on) p.push(`${b.s4.count} bez reakcie`);
    if (b.s7.on) p.push(`${b.s7.count} ležiaky`);
    return p.join(" · ");
  },
  loadedLine(data) {
    const c = data.counts;
    const fc = data.fin && data.fin.available ? data.fin.counts : null;
    return `${c.projekty} projekty, ${c.jednotky} jednotiek, ${c.dopyty} dopytov` + (fc ? `, ${fc.tranze} tranží, ${fc.rozpocet} položiek rozpočtu` : "");
  },
  // texty „Dnes“ pri signáloch S1–S8
  signalNow(b, set, data) {
    const r1 = b.s1.items.find(x => x.riziko);
    const PNAME = k => (data.projekty.find(p => p.kod === k || p.nazov === k) || {}).nazov || k;
    const TYP = { "Byt": "byt", "Obchodný priestor": "obchodný priestor", "Parkovacie státie": "parkovacie státie" };
    const UNIT = kod => { const j = data.jednotky.find(x => x.kod === kod); return `${TYP[j && j.typ] || "jednotka"} ${String(kod).replace(/^[A-Z]+-/, "").replace(/^(OP|PS)0*/, "č. ")}`; };
    const byProj = (items, fn) => { const g = {}; items.forEach(x => { const p = PNAME(x.projekt); (g[p] = g[p] || []).push(fn(x)); }); return Object.entries(g).map(([p, a]) => `${p}: ${a.join(", ")}`).join(" · "); };
    const people = arr => arr.map(x => `${x.predajca} ${x.n}`).join(", ");
    set("s1", String(b.s1.count), r1 ? `${r1.projekt}: predaných ${FM.fmtPct(r1.predanePct)} bytov, banka požaduje ${r1.cielPct} % do ${r1.terminDm}; ${FM.pl(r1.chyba, "chýba", "chýbajú", "chýba")} ${r1.chyba} ${FM.pl(r1.chyba, "zmluva", "zmluvy", "zmlúv")}, do termínu ${r1.dni} ${FM.pl(r1.dni, "deň", "dni", "dní")}` : (b.s1.items.length ? "podmienka banky ešte nie je splnená, ale do termínu je dosť času" : "podmienky bánk sú splnené"), b.s1.count > 0);
    set("s2", String(b.s2.count), b.s2.count ? `spolu ${FM.eur(b.s2.suma)}; ` + byProj(b.s2.items, x => `${UNIT(x.jednotka)} ${FM.eur(x.suma)} (splatná ${x.splatna}, predajca ${x.predajca})`) : "všetky splatné zálohy sú uhradené", b.s2.count > 0);
    set("s3", String(b.s3.count), b.s3.count ? byProj(b.s3.items, x => `${UNIT(x.jednotka)} (${x.vyprsala ? "rezervácia vypršala " + x.do : "rezervácia končí " + x.do})`) : "žiadna rezervácia čoskoro nekončí", b.s3.vyprsane > 0);
    set("s4", String(b.s4.count), b.s4.byPredajca.length ? `počet záujemcov bez reakcie podľa predajcu: ${people(b.s4.byPredajca)}` : "na všetkých záujemcov niekto zareagoval", b.s4.count > 0);
    set("s5", String(b.s5.count), b.s5.byPredajca.length ? `záujemcovia po obhliadke bez dohodnutého ďalšieho kroku podľa predajcu: ${people(b.s5.byPredajca)}` : "po každej obhliadke je dohodnutý ďalší krok", false);
    set("s6", String(b.s6.count), b.s6.items.length ? b.s6.items.map(x => `${x.projekt}: uzávierka klientskych zmien ${x.uzavierka}, nevyjadrili sa kupujúci ${x.jednotky.length} ${FM.pl(x.jednotky.length, "jednotky", "jednotiek", "jednotiek")}`).join(" · ") : "žiadna uzávierka klientskych zmien sa neblíži", false);
    set("s7", String(b.s7.count), b.s7.count ? byProj(b.s7.items, x => `${UNIT(x.jednotka)} (${x.zobrazenia30} zobrazení za 30 dní, žiadny dopyt)`) : "žiadny voľný byt nestojí bez záujmu", false);
    set("s8", String(b.s8.count), b.s8.count ? byProj(b.s8.items, x => `${UNIT(x.jednotka)} v ponuke ${x.dniVPonuke} dní, ${x.najom} ${FM.pl(x.najom, "záujemca", "záujemcovia", "záujemcov")} o nájom, ${x.kupa} o kúpu`) : "žiadny obchodný priestor nie je v ponuke príliš dlho", false);
  }
};
