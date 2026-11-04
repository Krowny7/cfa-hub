// Ta constance, mois après mois : npx tsx --tsconfig ./tsconfig.json scripts/moi/test-constance.ts
import { constanceVue, ecartType, reussiteParSemaine } from "@/components/moi/synthese/constance";

let ko = 0;
const check = (nom: string, ok: boolean) => {
  if (!ok) ko++;
  console.log(`${ok ? "ok  " : "KO  "} ${nom}`);
};
const now = Date.parse("2026-11-04T12:00:00Z");
const s = (jours: number, n: number, ok: number) => ({ n, ok, at: new Date(now - jours * 864e5).toISOString(), source: "daily" });
/** une séance par semaine, de la semaine `depuis` (la plus récente) à la suivante, aux réussites données */
const semaines = (depuis: number, oks: number[]) => oks.map((ok, i) => s((depuis + i) * 7 + 1, 10, ok));

check("l'écart type d'échantillon, null sous 3 valeurs", ecartType([70, 80, 90]) === 10 && ecartType([70, 80]) === null);
check("une semaine compte à partir de 5 réponses, hors fenêtre ignoré", JSON.stringify(reussiteParSemaine([s(1, 10, 7), s(2, 10, 9), s(9, 4, 4), s(15, 10, 5), s(200, 10, 10)], now).slice(0, 3)) === "[80,null,50]");

// une matière qui se calme : très variable il y a 3 mois, régulière ce mois-ci
const calme = { key: "fsa", seances: [...semaines(0, [7, 7, 8, 7]), ...semaines(12, [2, 9, 3, 10])] };
const agitee = { key: "ethics", seances: [...semaines(0, [2, 9, 3, 10]), ...semaines(12, [7, 7, 8, 7])] };
const v = constanceVue([calme, agitee, { key: "quant", seances: [] }], now);
const fsa = v.lignes.find((l) => l.cle === "fsa")!;
const eth = v.lignes.find((l) => l.cle === "ethics")!;
check("les colonnes vont de la plus ancienne à la plus récente", fsa.periodes[0]! > fsa.periodes[3]! && fsa.periodes[1] === null);
check("la tendance : plus stable quand l'écart baisse, moins stable quand il monte", fsa.tendance === "mieux" && eth.tendance === "moins");
check("une matière sans mesure n'a pas de ligne", v.lignes.length === 2);
check("la moyenne suit les matières, à partir de deux mesures", v.moyenne.periodes[0] !== null && v.moyenne.periodes[1] === null);
check("rien de mesuré : aucune ligne, pas de tendance", constanceVue([], now).lignes.length === 0 && constanceVue([], now).moyenne.tendance === null);

console.log(ko ? `${ko} vérification(s) en échec` : "Tout est vert.");
process.exit(ko ? 1 : 0);
