// Seed script — quiz de "drill" associé à la page 2 de la fiche PDF Economics
// (Business Cycles & Fiscal Policy, Readings 13 et 14). Structure : pour
// chacun des 5 concepts clés de la page, 1 question officielle (banque de
// pratique Readings 13 et 14, corrigé vérifié contre le PDF "- Answers.pdf",
// recopiée à l'identique pour conserver l'historique) + 1 variante "angle
// différent" (même notion, mais jamais un simple changement de chiffres
// menant au même raisonnement) + 1 variante "plus difficile" (raisonnement
// à plusieurs étapes / pièges combinés). Voir memory regle-drill-variantes-
// cfa-hub. Questions en anglais, explications en français.
// Les 5 questions officielles ne sont PAS celles imprimées dans le PDF
// (R13 Q8 et Q10, R14 Q5, Q14 et Q30) : l'utilisateur les a déjà sur papier.
// Les questions officielles sont recopiées à l'identique : syncQuizSets
// retrouve l'historique de réponses en comparant le texte exact de l'énoncé.
// Usage: node scripts/seed-economics-drill-page2.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Economics (Système)";

const QUIZ_SETS = [
  {
    title: "Economics — Drill Fiche Page 2 (Business Cycles & Fiscal Policy)",
    difficulty: 1,
    questions: [
      // Concept 1 — Phases du cycle et comportement des firmes (stocks, I/S) (officielle, R13 Q6)
      [
        "As an economic expansion approaches its peak, the economy is most likely to show:",
        [
          "a decrease in inventory levels.",
          "accelerating sales growth.",
          "an increase in the inventory-to-sales ratio.",
        ],
        2,
        "Quand l'expansion approche de son pic, la croissance des ventes commence à ralentir alors que la production reflète encore les anticipations de forte croissance de la phase précédente : les invendus s'accumulent et le ratio stocks/ventes (I/S) augmente, jusqu'à ce que les firmes réduisent la production (d'abord les heures, puis les effectifs). A est faux : une BAISSE non voulue des stocks signale au contraire une demande qui accélère (début d'expansion). B est faux : près du pic ce sont les ventes qui ralentissent, elles n'accélèrent pas.",
      ],
      // Variante angle différent — une autre phase (le creux) et ce qui N'EST PAS vrai
      [
        "Which of the following statements about the trough of a business cycle is least accurate?",
        [
          "Real GDP stops declining and begins to increase.",
          "Inflationary pressure is typically at its highest level of the cycle.",
          "The unemployment rate is typically still high, because employment recovers after output does.",
        ],
        1,
        "Au creux (trough), le PIB réel cesse de baisser et repart à la hausse, mais le chômage reste élevé car l'emploi se redresse avec retard sur la production : A et C sont exactes. B est la seule inexacte : les pressions inflationnistes se construisent pendant l'expansion et sont les plus fortes vers le pic ; elles refluent ensuite (avec retard) pendant la contraction, donc l'inflation est plutôt basse au creux. À retenir : l'emploi et l'inflation réagissent avec retard sur le PIB, leurs extrêmes ne coïncident pas avec ceux de la production.",
      ],
      // Variante plus difficile — cycle classique (niveau) vs cycle de taux de croissance, à partir de données
      [
        "Quarterly real GDP growth rates (% change from the previous quarter) for an economy were: Q1 +0.6%, Q2 +0.9%, Q3 +1.1%, Q4 +0.5%, Q5 +0.2%, Q6 -0.3%, Q7 -0.8%, Q8 -0.2%, Q9 +0.4%. Based on these data, which of the following statements is most accurate?",
        [
          "The growth rate cycle peaks in Q3, before the classical cycle peaks in Q5.",
          "The classical cycle peaks in Q3, when growth is highest, and the growth rate cycle peaks in Q5.",
          "The growth rate cycle peaks in Q3, and the classical cycle peaks in Q6, the first quarter of negative growth.",
        ],
        0,
        "Le cycle classique suit le NIVEAU du PIB réel : il monte tant que la croissance est positive, même faible. Son sommet est donc au dernier trimestre de croissance positive, Q5 (+0.2%), puis le niveau baisse dès Q6 (-0.3%). Le cycle de taux de croissance suit le TAUX de croissance : son pic est au trimestre où la croissance est la plus forte, Q3 (+1.1%), soit deux trimestres plus tôt. D'où la règle : les pics du cycle de taux de croissance précèdent ceux du cycle classique. B inverse les deux notions. C confond le sommet du niveau avec le premier trimestre de croissance négative : en Q6 le PIB baisse déjà, le niveau maximal a été atteint à la fin de Q5.",
      ],

      // Concept 2 — Indicateurs avancés / coïncidents / retardés (officielle, R13 Q13)
      [
        "Average weekly initial claims for unemployment insurance are classified as a:",
        ["lagging indicator.", "leading indicator.", "coincident indicator."],
        1,
        "Les inscriptions hebdomadaires initiales à l'assurance chômage (initial claims) sont un indicateur AVANCÉ : les demandes montent quand les licenciements s'accélèrent, avant que la contraction n'apparaisse dans le PIB, et reculent avant la reprise. Pour mémoire, les indicateurs coïncidents sont l'emploi non agricole, le revenu personnel réel, la production industrielle et les ventes ; les retardés sont la durée du chômage, le ratio I/S, le coût unitaire du travail ou le prime rate. A et C attribuent la mauvaise catégorie.",
      ],
      // Variante angle différent — le « pourquoi » : à quoi servent les indicateurs retardés
      [
        "A forecaster notes that several leading economic indicators have turned up after a long decline. Which of the following best explains why she will still monitor lagging indicators such as the average duration of unemployment?",
        [
          "They have better predictive power for the next turning point than leading indicators.",
          "They measure current economic activity more precisely than coincident indicators.",
          "They help confirm that a turning point signaled by the leading indicators has actually occurred.",
        ],
        2,
        "Les indicateurs retardés évoluent APRÈS l'économie : ils ne prévoient rien, mais servent à CONFIRMER qu'un point de retournement annoncé par les indicateurs avancés a bien eu lieu (C). A est faux : par définition ils n'ont aucun pouvoir prédictif, c'est le rôle des avancés. B est faux : mesurer l'activité courante (nowcasting) est le rôle des indicateurs coïncidents, et les retardés réagissent justement avec retard.",
      ],
      // Variante plus difficile — lecture croisée de plusieurs indicateurs, avec piège sur l'indicateur retardé
      [
        "Over the past three months, an economy's building permits and equity index have risen and average weekly initial jobless claims have fallen, while industrial production and real personal income are still edging down and the average duration of unemployment has increased. Which of the following interpretations is most appropriate?",
        [
          "The economy is still in a contraction with no sign of recovery, because the duration of unemployment is increasing.",
          "The economy is probably near a trough: leading indicators signal a coming recovery, coincident indicators have not yet turned, and the lagging indicator can keep worsening after the turning point.",
          "The economy is already in the middle of an expansion, because the leading indicators are rising.",
        ],
        1,
        "Lire les trois familles dans l'ordre. Avancés (permis de construire, bourse, demandes d'allocations en baisse) : ils repartent, signal de reprise à venir. Coïncidents (production industrielle, revenu réel) : encore en léger recul, donc l'économie n'est pas déjà en expansion (C est faux : un signal avancé annonce, il ne décrit pas l'état présent). Retardé (durée du chômage en hausse) : cohérent avec un creux, car le chômage peut même continuer à monter au début de la reprise. A est le piège : se fier à l'indicateur retardé pour exclure une reprise que les avancés annoncent.",
      ],

      // Concept 3 — Stabilisateurs automatiques, orientation budgétaire et délais (officielle, R14 Q11)
      [
        "When an economy dips into a recession, automatic stabilizers will tend to alter government spending and taxation so as to:",
        [
          "enlarge the budget deficit (or reduce the surplus).",
          "reduce the budget deficit (or increase the surplus).",
          "reduce interest rates, thus stimulating aggregate demand.",
        ],
        0,
        "Les stabilisateurs automatiques jouent sans nouvelle loi : en récession, les recettes fiscales (impôt sur le revenu, impôt sur les sociétés) baissent avec les revenus et les dépenses de transfert (allocations chômage) augmentent. Le déficit se creuse donc (ou l'excédent diminue), ce qui soutient la demande agrégée. B décrit l'inverse (le comportement en expansion). C est faux : les stabilisateurs agissent sur le budget, pas sur les taux d'intérêt, qui relèvent de la politique monétaire.",
      ],
      // Variante angle différent — séparer effet automatique et choix discrétionnaire (déficit structurel)
      [
        "A country's budget deficit was 2.0% of GDP in Year 1, of which 0.5% of GDP was cyclical. In Year 2, during a recession, the deficit was 3.5% of GDP, of which 3.0% of GDP was cyclical. The change in the government's fiscal policy stance between Year 1 and Year 2 is best described as:",
        [
          "expansionary, because the actual deficit increased.",
          "contractionary, because the structural deficit decreased.",
          "neutral, because the increase in the deficit is explained by automatic stabilizers.",
        ],
        1,
        "L'orientation de la politique budgétaire se juge sur le déficit structurel (ajusté du cycle), pas sur le déficit effectif : structurel = effectif - composante cyclique. Année 1 : 2.0 - 0.5 = 1.5% du PIB ; année 2 : 3.5 - 3.0 = 0.5% du PIB. Le déficit structurel baisse de 1.0 point : la politique discrétionnaire est restrictive (contractionary) malgré un déficit effectif plus élevé. A confond déficit effectif et orientation : la hausse du déficit effectif (+1.5 point) vient des stabilisateurs automatiques en récession (+2.5 points de composante cyclique). C est faux : si le cyclique explique la hausse, le structurel a bien bougé (-1.0 point), donc la politique n'est pas neutre.",
      ],
      // Variante plus difficile — trois délais mesurés entre jalons + stabilisateurs sans délai
      [
        "A recession begins in month 0. Policymakers conclude in month 5 that fiscal stimulus is needed, a stimulus law is passed and implemented in month 9, and the spending first lifts aggregate demand in month 15. Automatic stabilizers have been operating since incomes began to fall. Which of the following statements is most accurate?",
        [
          "Recognition lag is 5 months, action lag is 4 months and impact lag is 6 months; automatic stabilizers are not subject to the recognition and action lags.",
          "Recognition lag is 5 months, action lag is 9 months and impact lag is 15 months, all measured from the start of the recession; automatic stabilizers are not subject to the recognition and action lags.",
          "Recognition lag is 5 months, action lag is 4 months and impact lag is 6 months; automatic stabilizers face the same lags as discretionary policy because they also require new legislation.",
        ],
        0,
        "Chaque délai se mesure entre deux jalons successifs : recognition lag = 5 - 0 = 5 mois (voir le besoin) ; action lag = 9 - 5 = 4 mois (discuter, voter et mettre en oeuvre) ; impact lag = 15 - 9 = 6 mois (la mesure agit sur la demande). Les stabilisateurs automatiques n'ont ni délai de reconnaissance ni délai d'action : ils réagissent dès que les revenus baissent, sans décision ni législation. B additionne les jalons cumulés (9 et 15) au lieu de mesurer chaque délai séparément. C se trompe sur les stabilisateurs : ils sont par définition indépendants de toute nouvelle loi.",
      ],

      // Concept 4 — Multiplicateur budgétaire et budget équilibré (officielle, R14 Q16)
      [
        "Assuming the federal government maintains a balanced budget, the most likely effects of a tax increase on government expenditures and real GDP are:",
        [
          "Government expenditures decrease and real GDP decreases.",
          "Government expenditures increase and real GDP decreases.",
          "Government expenditures increase and real GDP increases.",
        ],
        2,
        "Budget équilibré : la hausse d'impôts finance un programme de dépenses du même montant, donc les dépenses publiques AUGMENTENT. Le PIB réel augmente aussi : le multiplicateur de la dépense publique est plus fort que celui de l'impôt, car toute la dépense entre dans l'économie, alors que l'impôt ne réduit la demande que de la part qui aurait été consommée (propension marginale à consommer), le reste venant de l'épargne. Le multiplicateur du budget équilibré est donc positif. A suppose que les dépenses baissent ; B suppose un effet net négatif sur le PIB : les deux ignorent cette asymétrie.",
      ],
      // Variante angle différent — calcul inversé : retrouver la propension marginale à consommer
      [
        "In an economy with an income tax rate of 20%, a permanent increase in government spending of 50 raises real GDP by 125. Using the fiscal multiplier 1 / [1 - c(1 - t)], the marginal propensity to consume (c) is closest to:",
        ["0.50", "0.60", "0.75"],
        2,
        "On part du résultat : multiplicateur = 125 / 50 = 2.5. Puis 1 / [1 - c(1 - 0.20)] = 2.5 donne 1 - 0.8c = 0.4, soit 0.8c = 0.6 et c = 0.6 / 0.8 = 0.75. Vérification : 0.75 x 0.80 = 0.60 ; 1 - 0.60 = 0.40 ; 1 / 0.40 = 2.5. Piège 0.60 : c'est la valeur de c(1 - t), on oublie de diviser par (1 - t) (ou on ignore l'impôt). Piège 0.50 : erreur de signe, 1 - c(1 + t) = 0.4 donne c = 0.5.",
      ],
      // Variante plus difficile — multiplicateur + effet retour sur les recettes fiscales : coût net pour le budget
      [
        "An economy has a marginal propensity to consume of 0.80 and a proportional income tax rate of 25% of GDP. The government raises spending by 100 without changing tax rates. All else equal, and ignoring any crowding out or monetary policy response, by how much does the government's budget deficit increase?",
        ["37.5", "62.5", "100.0"],
        0,
        "Quatre étapes. (1) Multiplicateur = 1 / [1 - 0.80 x (1 - 0.25)] = 1 / (1 - 0.60) = 2.5. (2) Variation du PIB = 100 x 2.5 = 250. (3) Recettes fiscales supplémentaires = 25% x 250 = 62.5. (4) Hausse du déficit = 100 - 62.5 = 37.5. Piège 100.0 : on suppose que le déficit augmente de la totalité de la dépense, en oubliant que la hausse du PIB génère automatiquement des recettes. 62.5 est la hausse des recettes seule : la hausse du déficit est la différence entre les deux.",
      ],

      // Concept 5 — Dette publique : crowding out et équivalence ricardienne (officielle, R14 Q28)
      [
        "The crowding-out model implies that a:",
        [
          "budget deficit will increase the real interest rate and thereby retard private investment.",
          "budget surplus will retard aggregate demand and trigger an economic downturn.",
          "budget deficit will stimulate aggregate demand and trigger a multiplier effect which will lead to inflation.",
        ],
        0,
        "Le crowding out (effet d'éviction) : un déficit financé par l'emprunt accroît la demande de fonds prêtables, ce qui fait monter les taux d'intérêt réels et réduit l'investissement privé, atténuant ainsi l'effet de la politique budgétaire sur la demande agrégée. B est faux : le modèle ne dit pas qu'un excédent déclenche une récession. C décrit l'effet multiplicateur de la dépense, pas le crowding out, qui est justement une force qui s'oppose à cet effet.",
      ],
      // Variante angle différent — cas limite : quand l'éviction est-elle la plus faible ?
      [
        "Government borrowing to finance a deficit is least likely to crowd out private investment when:",
        [
          "the economy is operating at full employment and private loan demand is strong.",
          "the government borrows in a domestic loanable funds market where available funds are limited.",
          "the economy has substantial unused capacity and private loan demand is weak.",
        ],
        2,
        "L'éviction passe par la concurrence entre l'État et les entreprises pour les fonds prêtables, qui fait monter les taux. Elle est faible quand la demande de crédit privé est faible : avec des capacités inutilisées, l'emprunt public ne chasse pas d'investissement qui aurait eu lieu, et la dépense soutient PIB et emploi (c'est l'argument contre l'inquiétude sur le déficit lorsque la production est sous le potentiel). A est le cas où l'éviction est maximale (plein emploi, forte demande de crédit). B décrit au contraire les conditions d'une forte hausse des taux.",
      ],
      // Variante plus difficile — comparer trois scénarios (éviction forte vs équivalence ricardienne partielle vs aucun effet)
      [
        "A government cuts taxes by 100 and finances the cut entirely by issuing bonds. Before any multiplier effect, which of the following scenarios produces the smallest net increase in aggregate demand?",
        [
          "Households spend 80 of the tax cut and interest rates are unchanged.",
          "Households spend 80 of the tax cut, but the higher interest rates caused by the bond issue reduce private investment by 60.",
          "Households, anticipating higher future taxes, save 75 of the tax cut and spend 25; interest rates are unchanged.",
        ],
        1,
        "On calcule l'effet net sur la demande dans chaque scénario. A : consommation +80, investissement inchangé, soit +80. B : consommation +80 mais éviction de l'investissement -60, soit 80 - 60 = +20. C : équivalence ricardienne partielle, les ménages ne dépensent que 25, soit +25. Le plus faible est B (+20). Piège : l'équivalence ricardienne paraît la force la plus puissante, mais ici elle n'est que partielle (25 de dépense restent) et l'éviction annule la plus grande part de l'effet de la baisse d'impôts.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Economics Page 2...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
