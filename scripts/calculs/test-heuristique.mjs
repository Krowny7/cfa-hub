// Tests de l'estimation automatique « demande un calcul » (scripts/lib/calcul-heuristique.mjs)
// et du classement gardé par énoncé (scripts/calculs/classement.mjs) :
//   node scripts/calculs/test-heuristique.mjs
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { choixNumerique, estCalcul } from "../lib/calcul-heuristique.mjs";
import { calculDe, chargerClassement, ecrireClassement, empreinteEnonce, FICHIER_CLASSEMENT, fusionner } from "./classement.mjs";

let ko = 0;
const check = (label, cond, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};

// choix numériques
for (const c of ["95.67", "4.25%", "USD 1.2 million", "$1,250", "€ 3.4 bn", "2.5x", "3×", "25 bps", "1.5 years", "−0.35", "(1.20)", "4.5% and 3.2%", "1.2m", "40k", "12.0%."]) check(`numérique : « ${c} »`, choixNumerique(c));
for (const c of ["backwardation.", "Both I and II", "Increase by 2%", "Year-end 2024 only", "the higher of the two", "", null, "Option 3 is correct"]) check(`pas numérique : « ${c} »`, !choixNumerique(c));

// questions
const vrai = [
  ["A 5-year annual-pay bond with a 4% coupon is priced to yield 5%. Its price per 100 of par is closest to:", ["95.67", "100.00", "104.45"]],
  ["A firm's EBIT is $500,000 and its interest expense is $100,000. Its degree of financial leverage is:", ["1.25", "5.00", "0.80"]],
  ["Given a mean of 8% and a standard deviation of 12%, the coefficient of variation is closest to:", ["1.50", "0.67", "cannot be determined"]],
  ["Using the data in the table, calculate the cash conversion cycle for Year 2.\tYear 1\tYear 2", ["45 days", "52 days", "38 days"]],
  ["A stock is bought at USD 40 and sold at USD 46 after a USD 1 dividend. The holding period return is closest to:", ["17.5%", "15.0%", "the dividend yield"]],
];
const faux = [
  ["A stock's abnormal rate of return is defined as the:", ["actual rate of return less the expected risk-adjusted rate of return.", "rate of return during abnormal price movements.", "expected risk-adjusted rate of return minus the market rate of return."]],
  ["Standard III(B) Fair Dealing requires members to:", ["treat all clients fairly.", "give all clients the same service.", "disclose all trades."]],
  ["Under IFRS 16, a lessee most likely reports:", ["a right-of-use asset.", "an operating expense only.", "no liability."]],
  ["Which of the following is closest to the definition of duration?", ["the price sensitivity to yields.", "the time to maturity.", "the coupon rate."]],
  ["A bond's duration is 7 and its convexity is positive. If yields fall, its price will most likely:", ["rise more than duration alone predicts.", "rise less than duration alone predicts.", "fall."]],
];
for (const [p, c] of vrai) check(`calcul : ${p.slice(0, 60)}…`, estCalcul(p, c) === true);
for (const [p, c] of faux) check(`pas de calcul : ${p.slice(0, 60)}…`, estCalcul(p, c) === false);
check("énoncé sans chiffre ni tournure de calcul : pas de calcul, même avec des choix chiffrés", estCalcul("The number of Standards in Section I is:", ["4", "5", "6"]) === false);
check("énoncé sans chiffre (données dans un exhibit) + « closest to » + choix chiffrés : calcul", estCalcul("Based on the exhibit, the company's current ratio is closest to:", ["1.25", "1.50", "2.00"]) === true);
check("énoncé sans chiffre + « calculate » + choix chiffrés : calcul", estCalcul("Using the information in the table, calculate the firm's ROE.", ["12.5%", "14.0%", "15.2%"]) === true);
check("énoncé sans chiffre + « closest to » + un seul choix chiffré : pas de calcul", estCalcul("The analyst's estimate is closest to:", ["the market value.", "1.25", "the book value."]) === false);
check("pas de choix : pas de calcul", estCalcul("What is 2 + 2?", []) === false && estCalcul("What is 2 + 2?", null) === false);
check("toujours un booléen", typeof estCalcul(null, null) === "boolean");

// le classement gardé par énoncé (il survit à seedQuizSets, qui change les id)
const BOND = vrai[0];
const DEF = faux[0];
const classement = new Map([
  [empreinteEnonce(BOND[0]), false], // classé à la main : contredit l'estimation
  [empreinteEnonce(DEF[0]), true],
]);
check("classement connu : préféré à l'estimation (dans les deux sens)", calculDe(BOND[0], BOND[1], classement) === false && calculDe(DEF[0], DEF[1], classement) === true);
check("énoncé inconnu du classement : l'estimation", calculDe(vrai[1][0], vrai[1][1], classement) === true && calculDe(faux[1][0], faux[1][1], classement) === false);
check("sans classement : l'estimation", calculDe(BOND[0], BOND[1], null) === true && calculDe(BOND[0], BOND[1], new Map()) === true);
check("empreinte : 16 hexadécimaux, comme left(md5(prompt), 16)", empreinteEnonce("abc") === "900150983cd24fb0" && empreinteEnonce(null) === empreinteEnonce(""));
{
  const c = new Map([
    [empreinteEnonce("A"), true],
    [empreinteEnonce("B"), false],
  ]);
  const r = fusionner(c, [
    { prompt: "A", calcul: false }, // changée
    { prompt: "C", calcul: true }, //  ajoutée
    { prompt: "C", calcul: true }, //  même énoncé, même valeur : une seule
    { prompt: "B", calcul: true }, //  classée des deux façons dans le lot : retirée
    { prompt: "B", calcul: false },
    { prompt: "D", calcul: null }, //  pas un booléen : ignorée
  ]);
  check(
    "fusion : 1 ajoutée, 1 changée, 1 conflit retiré, non-booléen ignoré",
    r.ajoutees === 1 && r.changees === 1 && r.conflits === 1 && c.get(empreinteEnonce("A")) === false && c.get(empreinteEnonce("C")) === true && !c.has(empreinteEnonce("B")) && !c.has(empreinteEnonce("D")) && c.size === 2,
    JSON.stringify(r),
  );
}
{
  const dir = mkdtempSync(join(tmpdir(), "classement-"));
  try {
    const f = join(dir, "classement.json");
    check("fichier absent : classement vide", chargerClassement(f).size === 0);
    ecrireClassement(
      new Map([
        [empreinteEnonce("Z"), true],
        [empreinteEnonce("A"), false],
      ]),
      f,
    );
    const relu = chargerClassement(f);
    check("écrit puis relu : identique", relu.size === 2 && relu.get(empreinteEnonce("Z")) === true && relu.get(empreinteEnonce("A")) === false);
    writeFileSync(f, JSON.stringify({ [empreinteEnonce("A")]: true, "pas-une-empreinte": true, [empreinteEnonce("B")]: "oui" }));
    check("entrées invalides ignorées", chargerClassement(f).size === 1);
    writeFileSync(f, "[1, 2]");
    let leve = false;
    try {
      chargerClassement(f);
    } catch {
      leve = true;
    }
    check("fichier mal formé : erreur (le seed s'arrête avant d'écrire)", leve);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
check("le classement du dépôt se lit", chargerClassement(FICHIER_CLASSEMENT) instanceof Map);

console.log(ko ? `\n${ko} KO` : "\ntout est vert");
process.exit(ko ? 1 : 0);
