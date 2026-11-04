// Ta constance par matière : npx tsx --tsconfig ./tsconfig.json scripts/moi/test-constance.ts
import { constanceMatieres, ecartType, reussiteParSemaine } from "@/components/moi/synthese/constance";

let ko = 0;
const check = (nom: string, ok: boolean) => {
  if (!ok) ko++;
  console.log(`${ok ? "ok  " : "KO  "} ${nom}`);
};
const now = Date.parse("2026-11-04T12:00:00Z");
const s = (jours: number, n: number, ok: number) => ({ n, ok, at: new Date(now - jours * 864e5).toISOString(), source: "daily" });

check("l'écart type d'échantillon, null sous 3 valeurs", ecartType([70, 80, 90]) === 10 && ecartType([70, 80]) === null);
check("une semaine compte à partir de 5 réponses, hors fenêtre ignoré", JSON.stringify(reussiteParSemaine([s(1, 10, 7), s(2, 10, 9), s(9, 4, 4), s(15, 10, 5), s(100, 10, 10)], now).slice(0, 3)) === "[80,null,50]");
const l = constanceMatieres(
  [
    { key: "fsa", seances: [s(1, 10, 7), s(8, 10, 8), s(15, 10, 9), s(50, 10, 3), s(57, 10, 9), s(64, 10, 5)] },
    { key: "ethics", seances: [s(1, 10, 7), s(8, 10, 7), s(15, 10, 8)] },
  ],
  now,
);
check("dix matières, la plus régulière d'abord, les non mesurées à la fin", l.length === 10 && l[0].cle === "ethics" && l[1].cle === "fsa" && l[2].ecart === null);
check("l'évolution compare les 6 dernières semaines aux 6 d'avant", l[1].evolution !== null && l[1].evolution < 0 && l[0].evolution === null);

console.log(ko ? `${ko} vérification(s) en échec` : "Tout est vert.");
process.exit(ko ? 1 : 0);
