// First Mate · rozhranie typu realitka: čo sa v paneli líši od iných typov (signály, tím, texty).
// Výpočty sú v panel/typy/realitka.js a panel/usecases/, tu len popisy a texty pre rozhranie.
import FM, { CSV } from "../typy/realitka.js";

export const SIG = [
  { k: "s1", t: "Dopyty bez reakcie", d: "Dopyt, na ktorý nikto nereagoval dlhšie ako hranica. Každá hodina zvyšuje riziko, že kupujúci odíde ku konkurencii.", p: [["hours", "Hranica (hodiny)", 1, 240]] },
  { k: "s2", t: "Čas prvej reakcie", d: "Priemerný čas od dopytu po prvú reakciu makléra. Ukáže, kto tím brzdí a kto je vzorom.", p: [["fastHours", "Rýchla reakcia do (h)", 1, 72]] },
  { k: "s3", t: "Záujem bez obhliadky", d: "Ponuka, ktorú si ľudia pozerajú, ale nikto nejde na obhliadku. Najčastejšie je problém v cene alebo v inzeráte.", p: [["minViews", "Min. zobrazení za 7 dní", 10, 5000], ["days", "Bez obhliadky (dni)", 1, 60]] },
  { k: "s4", t: "Končiace exkluzivity", d: "Exkluzívne zmluvy, ktoré čoskoro končia. Upozorní včas, aby maklér stihol dohodnúť predĺženie.", p: [["days", "Končí do (dni)", 1, 90]] }
];

export default {
  id: "realitka",
  FM, CSV, FIN: null,
  db: "fm",                    // dokumenty nastavení v db artefaktu: fm/settings, fm/log
  financie: false,             // bez Projektov, Financií, finančných a vlastných signálov a zdrojov dát
  osoba: "makler", osobaLbl: "Maklér", osobyGen: "maklérov",
  osoby: () => FM.MAKLERI,
  roly: [["manazer", "Manažér"], ["makler", "Maklér"]],
  rolaRozsah: { manazer: "cely" },
  rozsahy: [["cely", "Celý brífing"], ["svoje", "Len svoje"]],
  minParam: 1,
  SIG, FSIG: [], SRC: null, SRC_CUSTOM: null,
  signaly(D, g) {
    return { period: g.period || D.signals.period, s1: { ...D.signals.s1, ...(g.s1 || {}) }, s2: { ...D.signals.s2, ...(g.s2 || {}) }, s3: { ...D.signals.s3, ...(g.s3 || {}) }, s4: { ...D.signals.s4, ...(g.s4 || {}) } };
  },
  briefSig: S => JSON.stringify(S.signals),
  summaryLine(b) {
    const p = [];
    if (b.s1.on) p.push(`${b.s1.count} bez reakcie`);
    if (b.s2.on) p.push(b.s2.mean == null ? "reakcia bez dát" : `reakcia ${FM.fmt1(b.s2.mean)} h`);
    if (b.s3.on) p.push(`${b.s3.count} bez obhliadky`);
    if (b.s4.on) p.push(`${b.s4.count} exkluzivity`);
    return p.join(" · ");
  },
  loadedLine(data) {
    const c = data.counts;
    return `${c.recent} dopytov za 30 dní, ${c.unanswered} bez reakcie, ${c.viewings} obhliadok, ${c.deals} nehnuteľností`;
  },
  // texty „Dnes“ pri signáloch S1–S4
  signalNow(b, set) {
    set("s1", String(b.s1.count), `obdobie predtým ${b.s1.prev}` + (b.s1.byMakler[0] ? ` · najviac ${FM.short(b.s1.byMakler[0].makler)} (${b.s1.byMakler[0].n})` : ""), b.s1.count > 0);
    set("s2", b.s2.mean == null ? "–" : FM.fmt1(b.s2.mean) + " h", (b.s2.prev != null ? `predtým ${FM.fmt1(b.s2.prev)} h` : "") + ` · ${b.s2.fast} makl. do ${b.s2.fastHours} h`);
    set("s3", String(b.s3.count), b.s3.top ? `najviac ${b.s3.top.kod} ${b.s3.top.lokalita} · ${b.s3.top.views7} zobrazení` : "žiadna ponuka", false);
    set("s4", String(b.s4.count), b.s4.items.length ? b.s4.items.map(x => `${x.kod} ${x.koniec}`).join(", ") : "žiadna", false);
  }
};
