// Tolérance des réponses de calcul : npx tsx --tsconfig tsconfig.json scripts/calc/test-tolerance.ts
import { checkCalcInput, isCorrectValue } from "../../lib/calc/engine";

let ko = 0;
const vu = (nom: string, obtenu: boolean, attendu: boolean) => {
  if (obtenu !== attendu) ko++;
  console.log(`${obtenu === attendu ? "ok  " : "KO  "} ${nom} → ${obtenu ? "juste" : "faux"}`);
};
const q = (answer: number, decimals: number, strict = false) => ({ answer, decimals, strict });

vu("0,52 pour 0,523 (une décimale de moins)", isCorrectValue(0.52, q(0.523, 3)), true);
vu("0,523 pour 0,523", isCorrectValue(0.523, q(0.523, 3)), true);
vu("0,53 pour 0,523", isCorrectValue(0.53, q(0.523, 3)), false);
vu("0,5 pour 0,523 (deux décimales de moins)", isCorrectValue(0.5, q(0.523, 3)), false);
vu("0,1 pour 0,05 (arrondi qui double)", isCorrectValue(0.1, q(0.05, 2)), false);
vu("3,7 pour 3,74 (arrondi à 1,07 %)", isCorrectValue(3.7, q(3.74, 2)), false);
vu("8,5 pour 8,54", isCorrectValue(8.5, q(8.54, 2)), true);
vu("9 pour 8,5 (décimales = 1)", isCorrectValue(9, q(8.5, 1)), false);
vu("0,52 pour 0,523 en question stricte", isCorrectValue(0.52, q(0.523, 3, true)), false);
vu("saisie « 0,52 » pour 0,523", checkCalcInput({ ...q(0.523, 3), unit: "" }, "0,52")?.status === "juste", true);
vu("−6,21 pour −6,214", isCorrectValue(-6.21, q(-6.214, 3)), true);
// une décimale de moins, tronquée plutôt qu'arrondie (fi-fwd-f4 : 3y1y = 2,7283 %)
vu("2,72 pour 2,7283 (tronqué)", isCorrectValue(2.72, q(2.7283, 3)), true);
vu("2,73 pour 2,7283 (arrondi)", isCorrectValue(2.73, q(2.7283, 3)), true);
vu("2,71 pour 2,7283 (deux crans)", isCorrectValue(2.71, q(2.7283, 3)), false);
vu("2,8 pour 2,7283", isCorrectValue(2.8, q(2.7283, 3)), false);
vu("152,3 pour 152,38 (tronqué)", isCorrectValue(152.3, q(152.38, 2)), true);
vu("−6,22 pour −6,214 (tronqué vers le bas)", isCorrectValue(-6.22, q(-6.214, 3)), true);
vu("2,72 pour 2,7283 en question stricte", isCorrectValue(2.72, q(2.7283, 3, true)), false);
vu("saisie « 2,72 » pour 2,7283", checkCalcInput({ ...q(2.7283, 3), unit: "%" }, "2,72")?.status === "juste", true);

console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
process.exit(ko ? 1 : 0);
