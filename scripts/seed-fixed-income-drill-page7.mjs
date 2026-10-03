// Seed script — quiz de "drill" associé à la page 7 de la fiche PDF Fixed
// Income (Securitization Fundamentals). Contenu d'origine fourni par
// l'utilisateur, remis au cadre à sa demande le 3 octobre 2026. Structure :
// pour chacun des 5 concepts clés de la page, 1 question officielle (banque de
// pratique CFA, Readings 50, 65 et 66, corrigé vérifié contre le PDF
// "- Answers.pdf" correspondant) + 1 variante "angle différent" (même notion,
// mais jamais un simple changement de chiffres menant au même raisonnement) +
// 1 variante "plus difficile" (raisonnement à plusieurs étapes / pièges
// combinés / notion connexe de la page). Voir memory
// regle-drill-variantes-cfa-hub. Questions en anglais, explications en français.
// Aucune question de l'ancien script n'était une question officielle de la
// banque : les officielles ci-dessous sont nouvelles, recopiées telles quelles
// de la banque (en évitant les QCM déjà imprimés dans la fiche). syncQuizSets
// retrouve l'historique de réponses en comparant le texte exact de l'énoncé.
// Usage: node scripts/seed-fixed-income-drill-page7.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Fixed Income (Système)";

const QUIZ_SETS = [
  {
    title: "Fixed Income — Drill Fiche Page 7 (Securitization Fundamentals)",
    difficulty: 2,
    questions: [
      // Concept 1 — Bénéfices de la titrisation pour l'investisseur et l'émetteur (officielle, Reading 65 Q3)
      [
        "One of the primary benefits of securitization is that it:",
        [
          "improves the collectability of the loans that are securitized.",
          "improves the legal claims of the security holders to the loans that are securitized.",
          "removes problem assets from the issuing firm's balance sheet.",
        ],
        1,
        "Un des principaux bénéfices de la titrisation est de réduire le coût de financement des actifs. Les prêts sont transférés à une SPE : les porteurs des titres ont alors une créance juridique claire et directe sur ces prêts, ce qu'ils n'auraient pas en achetant simplement les obligations de la banque (ils seraient exposés à tout son bilan, en concurrence avec ses autres créanciers). A est faux : la titrisation ne rend pas les prêts plus faciles à recouvrer — ce sont les mêmes emprunteurs, et un servicer continue de collecter les paiements. C est faux : des prêts douteux sont de mauvais candidats à la titrisation, car les investisseurs institutionnels exigent une qualité de crédit minimale ; même des prêts sains nécessitent souvent un rehaussement de crédit (interne ou externe).",
      ],
      // Variante angle différent — le POURQUOI côté banque / système : comment la titrisation augmente la capacité de prêt
      [
        "Securitization is often said to increase the amount that banks are able to lend. Which of the following best explains this effect?",
        [
          "Banks can transfer their deposits and other liabilities to the SPE, which frees up borrowing capacity on their balance sheets.",
          "Securitization allows banks to postpone recognizing losses on their loans, which preserves the capital they need to keep lending.",
          "Banks sell loans they would otherwise hold to maturity and receive cash, which they can use to originate new loans.",
        ],
        2,
        "La titrisation porte sur des ACTIFS : la banque vend à la SPE des prêts qu'elle aurait sinon gardés jusqu'à l'échéance, et reçoit du cash qu'elle peut reprêter. Elle transforme ainsi des actifs illiquides en liquidités, ce qui augmente sa capacité de prêt et la liquidité du marché du crédit. A est le piège classique : on ne titrise pas des passifs ; les dépôts restent au bilan de la banque. B est faux : la titrisation ne sert pas à reporter des pertes — les prêts cédés doivent être de bonne qualité et, une fois vendus (true sale), leur risque de crédit est porté par les investisseurs, pas « caché » par la banque.",
      ],
      // Variante plus difficile — chiffrer l'avantage de financement pour l'émetteur, avec moyenne pondérée et donnée-piège
      [
        "A bank rated BBB can issue five-year senior unsecured bonds at a yield of 5.80%. It holds $1 billion of high-quality auto loans with an average interest rate of 7.00%. Instead of issuing unsecured bonds, it can sell the loans to an SPE, which would issue $900 million of AAA-rated senior ABS at 4.60% and $100 million of subordinated ABS at 8.00%. Ignoring fees, the average funding cost of the securitization and its comparison with unsecured funding are closest to:",
        [
          "4.94%, which is lower than the cost of unsecured funding.",
          "6.30%, which is higher than the cost of unsecured funding.",
          "7.00%, which is higher than the cost of unsecured funding.",
        ],
        0,
        "Coût moyen pondéré de la titrisation = (900 / 1 000) × 4,60 % + (100 / 1 000) × 8,00 % = 4,14 % + 0,80 % = 4,94 %, soit 0,86 point de moins que les 5,80 % de la dette non garantie. Pourquoi c'est moins cher : les investisseurs des ABS ont une créance sur un pool de prêts de grande qualité isolé dans la SPE ; ils exigent un rendement qui reflète ce pool, pas la note BBB de la banque — et 90 % du financement est noté AAA. B fait la moyenne simple (4,60 + 8,00) / 2 = 6,30 % au lieu de pondérer par la taille des tranches : la tranche subordonnée, chère, ne représente que 10 % du financement. C est la donnée-piège : 7,00 % est le taux des prêts, c'est-à-dire le RENDEMENT de l'actif, pas un coût de financement (l'écart entre ce rendement et le coût des ABS forme l'excess spread de la structure).",
      ],

      // Concept 2 — Parties prenantes : seller/originator, SPE, servicer, tiers (officielle, Reading 50 Q13)
      [
        "Securitized bonds are most likely to be issued by:",
        ["banking institutions.", "special purpose entities.", "supranational entities."],
        1,
        "Dans une titrisation, l'émetteur des titres n'est pas la banque elle-même mais une SPE (special purpose entity, aussi appelée SPV ou SPC), créée spécialement pour acheter les actifs au seller/originator et émettre les titres dont les intérêts et le principal sont payés par les flux de ces actifs. A est le piège : la banque est en général l'originator (elle crée les prêts et les vend à la SPE), et souvent le servicer, mais pas l'émetteur des titres titrisés. C : les supranationaux (Banque mondiale, etc.) émettent leurs propres obligations, garanties par leurs États membres, pas des titres adossés à un pool d'actifs.",
      ],
      // Variante angle différent — appliquer les rôles à un cas réel où une même entité cumule deux rôles
      [
        "Northfield Bank originates $300 million of auto loans and sells them to Northfield Auto Trust, a legally separate entity that issues asset-backed securities to investors. Northfield Bank continues to collect the monthly payments from the borrowers and to pursue delinquent accounts, in exchange for a fee. In this transaction, Northfield Bank acts as the:",
        [
          "seller (originator) and servicer, while the trust is the SPE that issues the securities.",
          "SPE and servicer, while the trust acts as the trustee.",
          "seller and trustee, while the trust acts as the servicer.",
        ],
        0,
        "Les rôles se lisent dans les faits. Northfield Bank CRÉE les prêts et les VEND → seller/originator ; elle continue de COLLECTER les paiements et de relancer les impayés contre une commission → servicer (un cumul très fréquent en pratique). Le trust, juridiquement distinct, ACHÈTE les prêts et ÉMET les ABS → c'est la SPE. B est faux : la banque ne peut pas être la SPE, puisque tout l'intérêt de la structure est que l'émetteur soit juridiquement séparé du vendeur (bankruptcy remoteness). C est faux : le trustee est un tiers indépendant chargé de protéger les intérêts des investisseurs (garde des actifs, contrôle des paiements) ; ce n'est pas le rôle de la banque cédante, et le trust ne collecte pas lui-même les paiements des emprunteurs.",
      ],
      // Variante plus difficile — suivre le cash des emprunteurs jusqu'aux investisseurs (rôle du servicer et des tiers, piège annuel/mensuel)
      [
        "An SPE holds a $600 million pool of loans. In a given month, borrowers pay $4.5 million of interest and $6.0 million of principal. The servicer receives an annual fee of 0.40% of the pool balance, paid monthly, and trustee and other administrative fees total $50,000 per month. Assuming no defaults, the cash available for distribution to the ABS investors that month is closest to:",
        ["$8.05 million.", "$10.25 million.", "$10.50 million."],
        1,
        "Encaissements du mois = 4,5 + 6,0 = 10,5 M$. Commission de servicing mensuelle = 600 M$ × 0,40 % / 12 = 2,4 M$ / 12 = 0,20 M$. Frais du trustee et administratifs = 0,05 M$. Flux distribuables aux investisseurs = 10,5 − 0,20 − 0,05 = 10,25 M$. C'est la logique de la banque officielle : les investisseurs reçoivent MOINS que ce que paient les emprunteurs, car le servicer et les autres intervenants (trustee, etc.) sont rémunérés sur ces flux. A (8,05 M$) déduit la commission ANNUELLE de servicing (2,4 M$) sur un seul mois. C (10,50 M$) suppose que tout ce que paient les emprunteurs revient aux investisseurs, en oubliant les frais.",
      ],

      // Concept 3 — Bankruptcy remoteness : pourquoi l'ABS peut être mieux noté que le vendeur (officielle, Reading 50 Q22)
      [
        "Which of the following entities play a critical role in the ability to create a securitized bond with a higher credit rating than the corporation?",
        ["Rating agencies.", "Special purpose entities.", "Investment banks."],
        1,
        "La SPE achète les actifs à l'entreprise et les sépare juridiquement de celle-ci : c'est le bankruptcy remoteness. Si l'entreprise fait faillite, ses créanciers n'ont aucun droit sur les actifs détenus par la SPE. La note des titres dépend alors de la qualité du pool (et du rehaussement de crédit), pas de la solvabilité de l'entreprise : elle peut donc être supérieure à la note de l'entreprise. A : les agences de notation ne font que mesurer ce risque ; elles ne créent pas la séparation juridique qui le réduit. C : les banques d'investissement (underwriters) structurent et placent les titres, sans effet sur le risque de crédit qu'ils portent.",
      ],
      // Variante angle différent — ce contre quoi le bankruptcy remoteness protège… et ce contre quoi il ne protège pas
      [
        "The bankruptcy remoteness of the SPE in a securitization most directly protects the ABS investors against:",
        [
          "losses caused by defaults of the borrowers in the underlying loan pool.",
          "the risk that borrowers repay their loans earlier than expected.",
          "claims by the seller's creditors on the securitized assets if the seller becomes insolvent.",
        ],
        2,
        "Le bankruptcy remoteness isole juridiquement les actifs de la SPE du risque de crédit du VENDEUR : si celui-ci fait faillite, ses créanciers ne peuvent pas saisir les actifs cédés, qui continuent de servir les ABS. Il ne protège ni contre A, le risque de crédit du pool lui-même (si les emprunteurs font défaut, les investisseurs subissent des pertes ; ce risque est traité par le rehaussement de crédit : subordination, surdimensionnement, excess spread), ni contre B, le risque de remboursement anticipé, lié aux taux d'intérêt et redistribué, le cas échéant, par le time tranching (CMO).",
      ],
      // Variante plus difficile — la faillite du vendeur pas à pas, combinée au credit tranching (données-pièges : notes, dette du vendeur)
      [
        "Carlton Stores, a retailer rated BB, sold $500 million of its credit card receivables to a bankruptcy-remote SPE, which issued $400 million of AAA-rated senior notes and $100 million of subordinated notes. Carlton also has $200 million of unsecured bonds outstanding. Carlton later files for bankruptcy, while the receivables continue to perform roughly as expected. Which statement is most accurate?",
        [
          "The noteholders continue to be paid from the receivables, which Carlton's creditors cannot claim; the senior notes remain exposed to the credit risk of the receivables, with the subordinated notes absorbing losses first.",
          "The AAA rating of the senior notes will be cut to Carlton's BB rating, because an ABS cannot be rated above its originator once the originator has defaulted.",
          "The SPE noteholders become unsecured creditors of Carlton and share its remaining assets pari passu with Carlton's bondholders.",
        ],
        0,
        "Les créances ont été vendues à une SPE bankruptcy remote : la faillite de Carlton ne touche pas les actifs de la SPE, que ses créanciers (dont les porteurs des 200 M$ d'obligations) ne peuvent pas réclamer. Les porteurs des notes continuent d'être payés par les flux des créances. Mais le bankruptcy remoteness ne supprime pas le risque de crédit du pool : si les pertes sur les créances augmentent, les 100 M$ de notes subordonnées les absorbent en premier, puis la tranche senior. B est le piège : la note de l'ABS repose sur la qualité du pool et sur le rehaussement de crédit, pas sur la solvabilité du vendeur — c'est précisément pourquoi elle peut être AAA quand Carlton est BB, et la faillite de Carlton ne la ramène pas mécaniquement à BB. C décrit la situation SANS SPE : les investisseurs seraient alors de simples créanciers non garantis de Carlton, en concurrence avec ses obligataires.",
      ],

      // Concept 4 — Covered bonds : double recours, cover pool, redemption regimes (officielle, Reading 66 Q4)
      [
        "A covered bond that may postpone the originally scheduled maturity date by as much as a year to delay default is:",
        ["a soft-bullet covered bond.", "a conditional pass-through covered bond.", "a hard-bullet covered bond."],
        0,
        "Les redemption regimes fixent ce qui se passe si l'émetteur (sponsor) ne paie pas à l'échéance ; ils font partie des raisons pour lesquelles un covered bond est moins risqué qu'un ABS. Soft-bullet : l'échéance initiale peut être repoussée (jusqu'à environ un an) avant que le défaut ne soit déclaré. C, hard-bullet : le covered bond est en défaut dès qu'un paiement prévu n'est pas effectué. B, conditional pass-through : si des paiements restent dus à l'échéance, l'obligation se transforme en titre pass-through, qui reverse les flux du cover pool au fil de leur encaissement.",
      ],
      // Variante angle différent — ce qui N'EXPLIQUE PAS le moindre risque d'un covered bond (et la différence avec une vraie titrisation)
      [
        "Covered bonds typically have lower credit risk and lower yields than otherwise comparable asset-backed securities. Which of the following is least likely a reason for this difference?",
        [
          "Mortgages in the cover pool that become non-performing or no longer meet the eligibility criteria must be replaced by the issuer.",
          "If the cover pool proves insufficient, covered bondholders have a claim on the issuer's other assets.",
          "The cover pool is sold to a bankruptcy-remote special purpose entity and removed from the issuer's balance sheet.",
        ],
        2,
        "C décrit une VRAIE titrisation (ABS) : actifs vendus à une SPE et sortis du bilan. Dans un covered bond au contraire, le cover pool RESTE au bilan de l'émetteur, simplement ringfencé (réservé aux porteurs). Ce n'est donc pas une raison du moindre risque — c'est même la différence structurelle avec l'ABS. A et B sont de vraies raisons : A = cover pool dynamique + critères d'éligibilité (l'émetteur doit remplacer les prêts non performants ou non conformes, ce qui maintient la qualité du pool, alors que le pool d'un ABS est en général figé) ; B = double recours (cover pool d'abord, puis actifs non grevés de l'émetteur), absent d'un ABS, dont l'investisseur n'a de recours que sur le pool. S'y ajoutent les redemption regimes (soft-bullet, conditional pass-through), qui évitent une vente forcée du cover pool en cas de défaut.",
      ],
      // Variante plus difficile — défaut de l'émetteur : double recours chiffré + régime soft-bullet
      [
        "Bergbank issued €500 million of soft-bullet covered bonds backed by a cover pool of residential mortgages. When Bergbank defaults, the cover pool is worth €460 million. Which statement best describes the position of the covered bondholders?",
        [
          "Their recovery is limited to the €460 million cover pool, as it would be for ABS investors, but the soft-bullet regime converts the bonds into a pass-through security at maturity.",
          "Because the cover pool remains on Bergbank's balance sheet, they rank pari passu with Bergbank's senior unsecured creditors for the full €500 million, and missing the scheduled maturity payment triggers an immediate default.",
          "They have a first claim on the €460 million cover pool and a claim on Bergbank's other assets for the €40 million shortfall, and payment at the scheduled maturity can be postponed by up to about a year before a default is declared.",
        ],
        2,
        "Double recours : 1) les porteurs ont un droit prioritaire sur le cover pool ringfencé (460 M€), qui leur est réservé ; 2) pour le manque de 500 − 460 = 40 M€, ils ont un recours sur les autres actifs (non grevés) de Bergbank, comme créanciers non garantis. Régime soft-bullet : si le paiement n'est pas fait à l'échéance prévue, celle-ci peut être repoussée (jusqu'à environ un an) avant que le défaut ne soit déclaré, ce qui laisse le temps d'encaisser les flux du cover pool ou de le vendre de façon ordonnée. A applique la logique d'un ABS (recours limité au pool) et confond soft-bullet et conditional pass-through (c'est ce dernier qui se transforme en pass-through). B oublie le ringfencing — le cover pool n'est pas partagé avec les créanciers non garantis — et décrit le régime hard-bullet (défaut immédiat).",
      ],

      // Concept 5 — Credit tranching : les tranches juniors absorbent les pertes en premier (officielle, Reading 66 Q10)
      [
        "Based on the table below illustrating an asset-backed security (ABS) structure, what is the value of the equity tranche (in $ millions)? Tranche A senior notes: face value $120, interest rate SOFR + 0.25%. Tranche B subordinated notes: face value $20, interest rate SOFR + 1.25%. Tranche C equity tranche: face value $10, interest rate variable. Total: $150.",
        ["30.", "0.", "10."],
        2,
        "La tranche equity est la tranche la plus subordonnée (la moins senior) de la structure : sa valeur faciale est de 10 M$, et c'est aussi le montant des premières pertes qu'elle absorbe. Toutes les pertes jusqu'à 10 M$ sont absorbées par cette tranche ; au-delà, la tranche B (20 M$), puis seulement la tranche A senior. A (30) additionne les tranches B et C : c'est le coussin total qui protège la tranche A, pas la valeur de l'equity. B (0) confond l'absence de coupon fixe (taux « variable », c'est-à-dire résiduel) avec une absence de valeur.",
      ],
      // Variante angle différent — ce que le tranching NE fait PAS (redistribuer n'est pas réduire)
      [
        "Which of the following statements about credit tranching in a securitization is least accurate?",
        [
          "Credit tranching reduces the total credit risk of the underlying asset pool.",
          "The subordinated tranches act as a form of credit enhancement for the senior tranche.",
          "Junior tranches offer higher yields than senior tranches because they absorb losses first.",
        ],
        0,
        "Le credit tranching ne réduit PAS le risque total : les prêts, les emprunteurs et donc les pertes attendues du pool restent les mêmes ; il RÉPARTIT ce risque de façon inégale entre les classes de titres, pour que chaque investisseur choisisse son exposition. B est exact : la subordination est une forme de rehaussement de crédit interne — les tranches juniors protègent la senior, qui peut ainsi être mieux notée que la qualité moyenne des prêts. C est exact : les tranches juniors encaissent les pertes en premier et exigent donc un rendement plus élevé.",
      ],
      // Variante plus difficile — cascade des pertes sur trois tranches, avec données-pièges (coupons)
      [
        "A $400 million pool of loans backs three classes of securities: a $320 million senior tranche, a $50 million mezzanine tranche, and a $30 million equity tranche. The senior tranche pays a coupon of 4% and the mezzanine tranche a coupon of 7%. If cumulative losses on the pool reach $45 million, the percentage of its principal lost by the mezzanine tranche is closest to:",
        ["11.25%.", "30%.", "90%."],
        1,
        "Les pertes remontent du bas vers le haut. 1) La tranche equity (30 M$) absorbe les 30 premiers millions et disparaît. 2) Il reste 45 − 30 = 15 M$ de pertes pour la mezzanine : 15 / 50 = 30 % de son principal. 3) La tranche senior (320 M$) n'est pas touchée. Les coupons (4 % et 7 %) sont des données-pièges sans effet sur la répartition des pertes. A (11,25 %) répartit les pertes au prorata (45 / 400), ce qui nie le principe même de la subordination. C (90 %) impute toutes les pertes à la mezzanine (45 / 50) en oubliant la tranche equity, qui est en dessous d'elle.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Fixed Income Page 7...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
