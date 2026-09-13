// Seed script — quiz de "drill" pour la page 8 de la fiche PDF Fixed
// Income (ABS Types · MBS & CMO). 5 concepts x 3 variantes.
// Usage: node scripts/seed-fixed-income-drill-page8.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Fixed Income (Système)";

const QUIZ_SETS = [
  {
    title: "Fixed Income — Drill Fiche Page 8 (ABS Types · MBS & CMO)",
    difficulty: 2,
    questions: [
      // Concept 1 — Synthetic CDO collateral (CDS pool)
      [
        "Unlike a cash CDO, which holds an actual portfolio of bonds or loans, a synthetic CDO obtains its credit exposure primarily through:",
        [
          "direct ownership of the underlying loans.",
          "a portfolio of credit default swaps (CDS) referencing the credit risk of the underlying names, without owning the actual assets.",
          "equity investments in the underlying borrowers.",
        ],
        1,
        "Un synthetic CDO obtient une exposition au risque de crédit d'un portefeuille de référence en vendant de la protection de crédit via des CDS (ou instruments dérivés similaires) plutôt qu'en achetant les obligations ou prêts réels — répliquant l'exposition de crédit sans détenir les actifs sous-jacents.",
      ],
      [
        "In a synthetic CDO, if a credit event (e.g., default) occurs on one of the reference entities in the CDS pool, the most direct consequence is that:",
        [
          "the CDO's collateral manager must physically sell the defaulted bond.",
          "the CDO (as protection seller) must make a payment under the relevant CDS contract, which reduces the returns available to the CDO's tranches.",
          "nothing happens, since synthetic CDOs have no exposure to actual defaults.",
        ],
        1,
        "Comme le synthetic CDO a vendu de la protection de crédit (via CDS) sur les entités de référence, un événement de crédit déclenche une obligation de paiement au titre du CDS, réduisant le cash disponible pour (ou augmentant les pertes allouées aux) tranches du CDO — le risque de crédit est bien réel même si aucune obligation physique n'est détenue.",
      ],
      [
        "Relative to a cash CDO, a synthetic CDO's collateral most likely consists primarily of:",
        [
          "physical bonds and loans purchased directly from the issuers.",
          "credit derivatives (such as CDS) and typically high-quality collateral (e.g., government securities) posted to support those derivative positions, rather than the referenced loans/bonds themselves.",
          "common equity of the reference entities.",
        ],
        1,
        "Le « collatéral » réel d'un synthetic CDO est largement constitué des contrats dérivés (CDS) fournissant l'exposition de crédit, souvent adossés à des titres de haute qualité détenus séparément (ex : obligations d'État) utilisés comme collatéral des positions de swap — pas les prêts/obligations référencés par les CDS eux-mêmes, ce qui le distingue d'un cash CDO.",
      ],
      // Concept 2 — Pass-through rate vs mortgage pool rate
      [
        "A mortgage pool backing a pass-through security has a weighted average mortgage rate of 6.25%. Servicing and other fees total 0.50%. The pass-through rate paid to investors is closest to:",
        ["5.75%.", "6.25%.", "6.75%."],
        0,
        "Pass-through rate = taux moyen pondéré du pool − frais de servicing/garantie = 6,25% − 0,50% = 5,75%. Le pass-through rate est toujours inférieur au taux du pool sous-jacent, puisque des frais sont déduits avant que les paiements n'atteignent les investisseurs.",
      ],
      [
        "A pass-through security's coupon rate is 4.80%, and the servicing fee on the underlying pool is 0.35%. The weighted average coupon rate on the underlying mortgage pool is closest to:",
        ["4.45%.", "4.80%.", "5.15%."],
        2,
        "Comme pass-through rate = taux moyen pondéré du pool − frais, le taux du pool = pass-through rate + frais = 4,80% + 0,35% = 5,15%.",
      ],
      [
        "The pass-through rate on a mortgage-backed pass-through security is best described as:",
        [
          "higher than the weighted average coupon rate of the underlying mortgages, since investors demand compensation for prepayment risk.",
          "equal to the weighted average coupon rate of the underlying mortgages.",
          "lower than the weighted average coupon rate of the underlying mortgages, reflecting servicing and other fees deducted along the way.",
        ],
        2,
        "Le pass-through rate versé aux investisseurs est toujours inférieur au taux moyen pondéré du pool, puisque des frais de servicing et autres coûts sont déduits des cash flows avant d'être transmis aux détenteurs du titre.",
      ],
      // Concept 3 — CMBS credit ratios (DSCR/LTV)
      [
        "A commercial property generates net operating income of $1,200,000 per year, and the annual debt service on the mortgage loan is $960,000. The debt service coverage ratio (DSCR) is closest to:",
        ["0.80.", "1.25.", "1.60."],
        1,
        "DSCR = revenu net d'exploitation / service de la dette = $1 200 000 / $960 000 = 1,25. Un DSCR supérieur à 1,0 indique que la propriété génère assez de revenus pour couvrir ses paiements de dette, un ratio plus élevé indiquant une marge de sécurité plus grande.",
      ],
      [
        "A commercial property is valued at $10,000,000, and the mortgage loan against it is $6,500,000. The loan-to-value (LTV) ratio is closest to:",
        ["35%.", "65%.", "154%."],
        1,
        "LTV = montant du prêt / valeur de la propriété = $6 500 000 / $10 000 000 = 65%. Un LTV plus faible indique généralement une marge de fonds propres plus grande protégeant le prêteur, ce qui est favorable pour la qualité de crédit d'un CMBS.",
      ],
      [
        "All else equal, a commercial mortgage-backed security (CMBS) loan with a higher debt service coverage ratio (DSCR) and a lower loan-to-value (LTV) ratio, relative to another loan, is most likely viewed as:",
        [
          "higher credit risk, since more equity is at stake.",
          "lower credit risk, since the property generates more income relative to its debt payments, and there is a larger equity cushion.",
          "unrelated to credit risk; DSCR and LTV apply only to residential mortgages.",
        ],
        1,
        "Un DSCR plus élevé (plus de marge de revenu par rapport au service de la dette) et un LTV plus faible (marge de fonds propres plus grande) indiquent tous deux un prêt financièrement plus solide, avec un risque de défaut et de perte plus faible — les deux ratios sont des mesures de crédit CMBS standard, pas réservées au résidentiel.",
      ],
      // Concept 4 — Agency RMBS extension risk
      [
        "If mortgage interest rates rise sharply after an agency RMBS pass-through security is issued, homeowners in the underlying pool will most likely prepay their mortgages:",
        [
          "faster than expected, shortening the security's average life (contraction risk).",
          "slower than expected, lengthening the security's average life (extension risk).",
          "at a rate completely unaffected by interest rates.",
        ],
        1,
        "Quand les taux montent, les propriétaires ont moins d'intérêt à refinancer (et peuvent être moins en mesure de vendre/déménager avec un financement alternatif plus cher), donc les remboursements anticipés ralentissent — allongeant la durée de vie moyenne attendue du titre. C'est le « extension risk », l'opposé du « contraction risk » (qui survient quand les taux baissent et que les remboursements accélèrent).",
      ],
      [
        "An investor in an agency RMBS pass-through security is most exposed to extension risk when interest rates:",
        [
          "rise, causing prepayments to slow and the bond's duration to lengthen at the worst possible time (when rates are up and the bond is already worth less).",
          "fall, causing prepayments to slow.",
          "remain perfectly flat over the life of the security.",
        ],
        0,
        "Le extension risk est le plus pénalisant quand les taux montent : les remboursements ralentissent (allongeant la durée de vie du bond) précisément au moment où l'investisseur aurait préféré réinvestir le principal remboursé aux nouveaux taux, plus élevés — combinant la perte liée aux taux plus élevés avec une duration effective plus longue.",
      ],
      [
        "A balloon payment risk on a mortgage loan is best described as a specific form of:",
        [
          "contraction risk, since it causes early repayment.",
          "extension risk, since a borrower unable to refinance or make the large final payment on schedule may effectively delay full repayment.",
          "credit tranching risk.",
        ],
        1,
        "Le balloon payment risk (le risque qu'un emprunteur ne puisse pas effectuer ou refinancer le gros paiement final « balloon » à échéance) est classé comme une forme de extension risk — le remboursement attendu est retardé par rapport au calendrier prévu, plutôt qu'accéléré.",
      ],
      // Concept 5 — PAC CMO support-tranche compensation
      [
        "In a CMO structure with a planned amortization class (PAC) tranche and a support tranche, the support tranche's primary role is to:",
        [
          "receive priority principal payments before the PAC tranche.",
          "absorb the prepayment variability (faster or slower than expected) that would otherwise disrupt the PAC tranche's predictable schedule.",
          "eliminate all prepayment risk from the entire CMO structure.",
        ],
        1,
        "La tranche support (ou « companion ») absorbe le risque de remboursement anticipé supplémentaire (extension et contraction) généré par le pool hypothécaire sous-jacent, permettant à la tranche PAC de recevoir le principal selon un calendrier beaucoup plus stable et prévisible dans une fourchette de vitesses de remboursement définie.",
      ],
      [
        "Relative to a PAC tranche in the same CMO structure, a support tranche most likely has:",
        [
          "more stable cash flows and lower prepayment risk.",
          "less stable cash flows and higher prepayment risk, since it absorbs the variability the PAC tranche is protected from.",
          "identical prepayment risk, since both tranches share the pool equally.",
        ],
        1,
        "Comme la tranche support existe spécifiquement pour protéger la tranche PAC de la variabilité des remboursements anticipés, elle porte elle-même une plus grande part du risque de remboursement anticipé du pool — ses cash flows sont moins prévisibles (plus exposés à l'extension et à la contraction) que ceux de la tranche PAC.",
      ],
      [
        "Investors in a support tranche of a CMO are compensated for absorbing extra prepayment risk primarily through:",
        [
          "a subordinated claim on the collateral pool's principal only.",
          "a higher yield relative to the PAC tranche, reflecting the additional prepayment risk they bear.",
          "a guarantee from the PAC tranche investors against any losses.",
        ],
        1,
        "Comme la tranche support absorbe davantage de risque de remboursement anticipé (extension/contraction) pour protéger la tranche PAC, elle offre typiquement un yield plus élevé en compensation de cette incertitude supplémentaire — un arbitrage risque/rendement standard au sein de la structure CMO.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Fixed Income Page 8...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
