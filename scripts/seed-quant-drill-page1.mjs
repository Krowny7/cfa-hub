// Seed script — quiz de "drill" associé à la page 1 de la fiche PDF Quantitative
// Methods (Rates and Returns, Reading 1 de la fiche, même numéro dans la banque
// de pratique : pas de décalage). Structure : pour chacun des 5 concepts clés de
// la page, 1 question officielle (banque de pratique Quantitative Methods,
// corrigé vérifié contre "- Answers.pdf") + 1 variante "angle différent" (même
// notion, mais jamais un simple changement de chiffres menant au même
// raisonnement) + 1 variante "plus difficile" (raisonnement à plusieurs
// étapes / pièges combinés / notion connexe de la page). Voir memory
// regle-drill-variantes-cfa-hub. Questions en anglais, explications en
// français.
// Les 5 questions officielles ne sont PAS celles imprimées dans le PDF
// (R1 Q4, Q9, Q10, Q21 et Q40) : l'utilisateur les a déjà sur papier.
// Usage: node scripts/seed-quant-drill-page1.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Quantitative Methods (Système)";

const QUIZ_SETS = [
  {
    title: "Quantitative Methods — Drill Fiche Page 1 (Rates and Returns)",
    difficulty: 1,
    questions: [
      // Concept 1 — Interest rates : real risk-free rate et composantes du taux (officielle — R1 Q32)
      [
        "Which of the following return measures is best described as purely representing time preference?",
        [
          "Real risk-free interest rate.",
          "Total rate of return.",
          "Nominal risk-free interest rate.",
        ],
        0,
        "Le real risk-free rate ne rémunère que la préférence temporelle : le fait de préférer consommer aujourd'hui plutôt que demain une même quantité de biens. A est donc correct. B est faux : le rendement total intègre aussi l'inflation anticipée et des primes de risque (défaut, liquidité, maturité). C est faux : le nominal risk-free rate ajoute au taux réel une prime d'inflation anticipée (nominal ≈ réel + inflation anticipée). Fiche : r = nominal rf + default + liquidity + maturity premiums.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai : le T-bill comme estimation du taux réel (piège de la fiche)
      [
        "Which of the following statements about the components of an interest rate is least accurate?",
        [
          "The nominal risk-free rate contains a premium for expected inflation in addition to the real risk-free rate.",
          "A bond that trades infrequently should offer a higher yield than an otherwise identical bond that trades actively.",
          "A short-term Treasury bill yield is a good estimate of the real risk-free rate, because Treasury bills carry essentially no default risk.",
        ],
        2,
        "On cherche l'affirmation fausse. C est fausse, donc c'est la réponse : un T-bill n'a presque pas de risque de défaut ni de prime de maturité, mais son rendement est un taux NOMINAL sans risque ; il contient la prime d'inflation anticipée. Pour obtenir le taux réel, il faut retirer l'inflation : (1 + nominal) / (1 + inflation) - 1. A est vraie : (1 + nominal rf) = (1 + real rf) x (1 + inflation anticipée), donc le nominal ajoute bien une prime d'inflation au taux réel. B est vraie : une obligation peu échangée expose au liquidity risk (vendre vite oblige à céder sous la juste valeur), et l'investisseur exige une prime de liquidité, donc un rendement plus élevé.",
      ],
      // Variante plus difficile — décomposer des rendements observés en primes (taux réel exact, maturité, défaut + liquidité)
      [
        "A 3-month Treasury bill yields 4.6% and expected inflation is 2.5%. A 10-year Treasury bond yields 5.4%, and a 10-year corporate bond that trades infrequently yields 7.3%. Assume Treasury securities carry no default or liquidity premium. Using the exact (multiplicative) relationship between nominal and real rates, which statement is most accurate?",
        [
          "The real risk-free rate is about 2.05%, and the corporate bond's default and liquidity premiums together are about 1.9%.",
          "The real risk-free rate is about 4.6%, and the corporate bond's default and liquidity premiums together are about 2.7%.",
          "The real risk-free rate is about 2.05%, and the corporate bond's default and liquidity premiums together are about 2.7%.",
        ],
        0,
        "Étape 1, le taux réel : le T-bill (court terme, sans défaut) donne le taux nominal sans risque, qui contient l'inflation. Taux réel = 1,046 / 1,025 - 1 = 2,05 %. Étape 2, la prime de maturité : le Treasury à 10 ans ne diffère du T-bill que par la maturité, donc prime de maturité = 5,4 - 4,6 = 0,8 point. Étape 3, défaut + liquidité : l'obligation corporate à 10 ans a la même maturité que le Treasury à 10 ans ; l'écart restant, 7,3 - 5,4 = 1,9 point, rémunère le défaut et l'illiquidité. A est donc correct. B est faux deux fois : 4,6 % est un taux nominal (piège de la fiche : le T-bill contient la prime d'inflation), et 7,3 - 4,6 = 2,7 points compte aussi la prime de maturité. C est faux : le taux réel est juste, mais 2,7 points mélangent encore la prime de maturité (0,8) avec les primes de défaut et de liquidité ; il faut comparer à un Treasury de même maturité.",
      ],

      // Concept 2 — Moyennes de rendement : arithmétique, géométrique, harmonique (officielle — R1 Q28)
      [
        "Based on the advice of his financial advisor regarding dollar cost averaging, a client invests $2,000 each month into a blue-chip stock. The stock price on the date of purchase each month over a four-month stretch was $12, $14, $11, and $9. Using the harmonic mean, the average cost per share of the stock is closest to:",
        ["$11.50.", "$11.75.", "$11.20."],
        2,
        "Avec un montant fixe investi chaque mois (cost averaging), le coût moyen par action est la moyenne harmonique des prix : 4 / (1/12 + 1/14 + 1/11 + 1/9) = 4 / 0,3568 = 11,21 $. C est donc correct. A est faux : 11,50 $ est la moyenne arithmétique des prix (46 / 4) ; elle surestime le coût moyen, car un montant fixe achète plus d'actions quand le prix est bas. B est faux : la moyenne harmonique est toujours inférieure à la moyenne arithmétique quand les valeurs ne sont pas toutes égales ; 11,75 $ est donc impossible.",
      ],
      // Variante angle différent — cas limite : un NOMBRE fixe d'actions (et non un montant fixe) change la moyenne pertinente
      [
        "An investor buys exactly 100 shares of a stock at the start of each month for four months, at prices of $12, $14, $11, and $9. The average cost per share she paid is best measured by the:",
        [
          "harmonic mean of the prices, about $11.21.",
          "arithmetic mean of the prices, $11.50.",
          "geometric mean of the prices, about $11.36.",
        ],
        1,
        "Ici, c'est le nombre d'actions qui est fixe, pas le montant investi. Coût total = 100 x (12 + 14 + 11 + 9) = 4 600 $ pour 400 actions, soit 11,50 $ par action : c'est exactement la moyenne arithmétique des prix, puisque chaque prix pèse le même nombre d'actions. B est donc correct. A est faux : la moyenne harmonique (11,21 $) ne convient que si l'on investit un MONTANT fixe à chaque date ; on achète alors plus d'actions quand le prix est bas, ce qui fait baisser le coût moyen. C est faux : la moyenne géométrique sert à composer des taux de rendement sur plusieurs périodes ; elle ne correspond à aucun coût moyen réellement payé. Règle : montant fixe ⇒ harmonique ; quantité fixe ⇒ arithmétique.",
      ],
      // Variante plus difficile — rendements semestriels : moyenne géométrique annualisée (racine 2, pas racine 4) et biais de l'arithmétique
      [
        "A fund reports the following four consecutive semiannual returns: +8%, -5%, +12%, and +3%. The fund's compound annual (annualized geometric mean) return over the two years is closest to:",
        ["4.30%.", "9.00%.", "8.79%."],
        2,
        "Avec un rendement négatif, on compose les (1 + R) : 1,08 x 0,95 x 1,12 x 1,03 = 1,18359, soit +18,36 % sur deux ans. Le taux annuel composé prend la racine du nombre d'ANNÉES (2) : 1,18359^(1/2) - 1 = 8,79 %. C est donc correct. A est faux : 1,18359^(1/4) - 1 = 4,30 % est le taux composé par SEMESTRE (racine 4 = nombre de périodes), pas le taux annuel ; c'est le piège de la fiche. On retrouve d'ailleurs 1,0430² - 1 = 8,79 %. B est faux : 9,00 % double la moyenne arithmétique semestrielle ((8 - 5 + 12 + 3) / 4 = 4,5 %) ; la moyenne arithmétique est toujours supérieure à la géométrique quand les rendements varient, et elle ne décrit pas la croissance réellement composée.",
      ],

      // Concept 3 — Money-weighted vs time-weighted return (officielle — R1 Q12)
      [
        "Which of the following is most accurate with respect to the relationship of the money-weighted return to the time-weighted return? If funds are contributed to a portfolio just prior to a period of favorable performance, the:",
        [
          "money-weighted rate of return will tend to be depressed.",
          "money-weighted rate of return will tend to be elevated.",
          "time-weighted rate of return will tend to be elevated.",
        ],
        1,
        "Le MWR (IRR des flux de l'investisseur) pondère chaque période par le capital investi : un apport juste avant une bonne période fait travailler plus de capital pendant cette période et tire le MWR vers le haut. B est donc correct. A est faux : le MWR serait déprimé si l'apport précédait une mauvaise période (ou si un retrait précédait une bonne période). C est faux : le TWR chaîne les rendements des sous-périodes et n'est pas affecté par le calendrier des apports et des retraits ; c'est pour cela qu'on l'utilise pour juger un gérant qui ne contrôle pas ces flux.",
      ],
      // Variante angle différent — le « pourquoi » : quelle mesure pour juger un gérant qui ne contrôle pas les flux
      [
        "A pension plan sponsor decides when to contribute money to, and withdraw money from, the account run by its external equity manager. To evaluate the manager's skill, the sponsor should most appropriately use the:",
        [
          "money-weighted return, because it reflects the amount of capital actually invested in each period.",
          "time-weighted return, because it is not affected by the timing and size of cash flows the manager does not control.",
          "money-weighted return, because as an internal rate of return it is the industry standard for reporting manager performance.",
        ],
        1,
        "Le gérant ne choisit ni le moment ni le montant des apports et des retraits : c'est le sponsor qui les décide. Il faut donc une mesure qui neutralise ces flux. Le TWR coupe la période à chaque flux, calcule le rendement de chaque sous-période puis les chaîne (moyenne géométrique au-delà d'un an) : il ne mesure que ce que le gérant a fait de chaque dollar confié. B est donc correct. A est faux : c'est précisément parce que le MWR pondère par le capital investi qu'il récompense ou pénalise le gérant pour un calendrier de flux qui ne dépend pas de lui ; le MWR convient au contraire quand le gérant contrôle les flux (par exemple un fonds de private equity qui appelle le capital). C est faux : le standard de l'industrie pour mesurer la performance d'un gérant est le TWR, pas le MWR.",
      ],
      // Variante plus difficile — calcul complet TWR / MWR avec dividendes et achat en cours de période, puis interprétation de l'écart
      [
        "An investor buys one share of a stock for $50 at t = 0. At t = 1, the share pays a $2 dividend, the price is $60, and the investor buys two more shares at that price. At t = 2, each share pays a $2 dividend and the investor sells all three shares for $54 each. The annualized time-weighted and money-weighted returns are closest to:",
        ["7.58% and 0.00%.", "8.67% and 0.00%.", "7.58% and -2.77%."],
        0,
        "TWR : année 1, (60 + 2 - 50) / 50 = +24,0 % ; année 2, (54 + 2 - 60) / 60 = -6,67 % (le rendement par action ne dépend pas du nombre d'actions détenues). TWR annualisé = (1,24 x 0,9333)^(1/2) - 1 = 1,15733^(1/2) - 1 = 7,58 %. MWR : flux de l'investisseur CF0 = -50, CF1 = +2 (dividende) - 120 (achat de 2 actions) = -118, CF2 = 3 x (54 + 2) = +168. On cherche r tel que 50(1 + r)² + 118(1 + r) = 168 : r = 0 convient exactement (50 + 118 = 168), donc MWR = 0,00 %. A est donc correct. Le MWR est bien inférieur au TWR : l'investisseur a triplé sa position juste avant la mauvaise année. B est faux : 8,67 % est la moyenne arithmétique (24 - 6,67) / 2, alors qu'il faut une moyenne géométrique sur plusieurs périodes. C est faux : -2,77 % oublie les dividendes reçus en t = 2 (CF2 = 162 au lieu de 168).",
      ],

      // Concept 4 — Annualisation & rendement continu : EAR en capitalisation continue (officielle — R1 Q23)
      [
        "A stated interest rate of 9% compounded continuously results in an effective annual rate closest to:",
        ["9.42%.", "9.20%.", "9.67%."],
        0,
        "Avec une capitalisation continue, EAR = e^r - 1 = e^0,09 - 1 = 9,42 %. A est donc correct. B est faux : 9,20 % correspond à une capitalisation semestrielle (1,045² - 1), qui donne un taux effectif plus faible que la capitalisation continue. C est faux : il dépasse l'EAR continu, qui est le maximum atteignable pour un taux annoncé de 9 %.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai : fréquence de capitalisation, EAR et valeur actuelle
      [
        "For a stated annual interest rate of 6%, which of the following statements is least accurate?",
        [
          "Monthly compounding produces a higher effective annual rate than quarterly compounding.",
          "Continuous compounding produces the highest effective annual rate, about 6.18%.",
          "More frequent compounding increases the present value of a given future cash flow.",
        ],
        2,
        "On cherche l'affirmation fausse. C est fausse, donc c'est la réponse : une capitalisation plus fréquente augmente l'EAR, donc le taux d'actualisation effectif ; la valeur future d'un placement augmente, mais la valeur ACTUELLE d'un flux futur donné diminue (on divise par un facteur plus grand). A est vraie : mensuel, (1 + 0,06/12)^12 - 1 = 6,17 %, contre trimestriel (1 + 0,06/4)^4 - 1 = 6,14 %. B est vraie : la capitalisation continue est la limite, e^0,06 - 1 = 6,18 %, aucune fréquence ne fait mieux pour un taux annoncé de 6 %. Fiche : compounding plus fréquent ⇒ EAR ↑ ⇒ FV ↑ et PV ↓.",
      ],
      // Variante plus difficile — annualiser un HPR sur plus d'un an (exposant 365/jours < 1) et le convertir en taux continu
      [
        "A position's value rose from $80 to $92 over 500 days, with no interim cash flows. Assuming a 365-day year, the annualized holding period return and the annualized continuously compounded return are closest to:",
        ["10.95% and 13.98%.", "10.74% and 10.20%.", "21.10% and 19.15%."],
        1,
        "HPR = 92 / 80 - 1 = 15 % sur 500 jours. Annualisation composée : (1,15)^(365/500) - 1 = 1,15^0,73 - 1 = 10,74 % ; l'exposant est inférieur à 1 car la période dépasse un an. Taux continu annualisé : ln(1,15) = 13,98 % sur 500 jours, soit 13,98 % x 365/500 = 10,20 % par an (les rendements continus s'additionnent, donc s'annualisent par simple proportion ; on vérifie que ln(1,1074) = 10,20 %). B est donc correct. A est faux deux fois : 15 % x 365/500 = 10,95 % est une annualisation simple qui ignore la composition, et 13,98 % est le taux continu de toute la période, non annualisé. C est faux : il inverse l'exposant (1,15^(500/365) - 1 = 21,10 %) comme si la période durait moins d'un an, puis prend ln(1,2110) = 19,15 %.",
      ],

      // Concept 5 — Autres mesures de rendement : gross, net, after-tax, real, leveraged (officielle — R1 Q24)
      [
        "A security portfolio earns a gross return of 7.0% and a net return of 6.5%. The difference of 0.5% most likely results from:",
        ["inflation.", "fees.", "taxes."],
        1,
        "Le rendement net est le rendement brut (gross return) diminué des frais de gestion et d'administration : l'écart de 0,5 % vient des frais. B est donc correct. A est faux : un rendement corrigé de l'inflation s'appelle un rendement réel (real return), pas un rendement net. C est faux : un rendement corrigé des impôts s'appelle un after-tax return.",
      ],
      // Variante angle différent — ce que le gross return a DÉJÀ déduit (coûts de trading) et ce qu'il ne déduit pas
      [
        "Which of the following costs has most likely already been deducted in computing a portfolio's gross return?",
        ["Management fees.", "Custodial and administrative fees.", "Trading commissions."],
        2,
        "Le gross return est mesuré avant les frais de gestion et d'administration, mais APRÈS les commissions et autres coûts de trading : ces coûts font partie du prix payé ou reçu pour les titres, ils sont donc déjà dans la performance des investissements. C est donc correct. A est faux : les frais de gestion sont précisément ce qui sépare le gross return du net return. B est faux : les frais de conservation et d'administration sont, eux aussi, déduits seulement pour passer au net return. Le gross return reflète donc la compétence du gérant à choisir et négocier les titres, avant le coût de la gestion elle-même.",
      ],
      // Variante plus difficile — combiner levier, frais et inflation : rendement réel sur la mise propre
      [
        "An investor commits $200,000 of her own capital and borrows $100,000 at 6% to invest $300,000 in a portfolio. Over the year, the portfolio earns 10% before management fees, which amount to 1% of the $300,000 invested. Inflation is 2%. The investor's real leveraged return on her own capital is closest to:",
        ["8.33%.", "9.80%.", "4.90%."],
        0,
        "Gain brut sur les 300 000 $ investis : 10 % x 300 000 = 30 000 $. Frais de gestion : 1 % x 300 000 = 3 000 $. Intérêts : 6 % x 100 000 = 6 000 $. Gain net pour l'investisseuse : 30 000 - 3 000 - 6 000 = 21 000 $, rapporté à sa mise propre de 200 000 $ : rendement nominal avec levier = 10,5 % (formule de la fiche : r + (VB/V0)(r - rB) = 9 % + 0,5 x (9 % - 6 %) = 10,5 % avec r net de frais = 9 %). Rendement réel : 1,105 / 1,02 - 1 = 8,33 %. A est donc correct. B est faux : 9,80 % = 1,12 / 1,02 - 1 oublie les frais de gestion (rendement avec levier de 12 %). C est faux : 4,90 % = 1,07 / 1,02 - 1 rapporte le gain net (21 000 $) à l'actif total de 300 000 $ au lieu de la mise propre, ce qui efface l'effet de levier.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Quantitative Methods Page 1...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
