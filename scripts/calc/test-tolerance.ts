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

console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
process.exit(ko ? 1 : 0);
