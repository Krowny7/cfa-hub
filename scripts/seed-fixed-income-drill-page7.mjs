// Seed script — quiz de "drill" pour la page 7 de la fiche PDF Fixed
// Income (Securitization Fundamentals). 5 concepts x 3 variantes.
// Usage: node scripts/seed-fixed-income-drill-page7.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Fixed Income (Système)";

const QUIZ_SETS = [
  {
    title: "Fixed Income — Drill Fiche Page 7 (Securitization Fundamentals)",
    difficulty: 2,
    questions: [
      // Concept 1 — Securitization benefits to the financial system
      [
        "From the perspective of the broader financial system, securitization primarily provides a benefit by:",
        [
          "eliminating credit risk entirely from the financial system.",
          "matching the risk/return preferences of different investors to specific tranches, while giving originators an additional funding source.",
          "guaranteeing that all securitized assets are risk-free.",
        ],
        1,
        "La titrisation profite aux investisseurs en leur permettant de choisir des tranches correspondant à leur profil risque/rendement souhaité (senior vs junior), et profite aux émetteurs/originateurs en leur fournissant une source de financement alternative (monétiser des créances) au-delà des obligations ou actions classiques — elle redistribue le risque, elle ne l'élimine pas.",
      ],
      [
        "An insurance company wants exposure only to the safest, most senior portion of a pool of auto loans, with minimal risk of loss. Securitization most directly allows this investor to:",
        [
          "buy the entire loan pool directly from the originator.",
          "purchase a senior tranche of asset-backed securities backed by the pool, which absorbs losses only after junior tranches are exhausted.",
          "avoid any exposure to interest rate risk.",
        ],
        1,
        "La titrisation découpe les cash flows/pertes du pool sous-jacent en tranches, permettant à un investisseur de choisir une tranche senior protégée par les tranches junior en dessous — cela permet de « tailorer » (ajuster) l'exposition au risque sans acheter le pool entier directement.",
      ],
      [
        "For the originator of a pool of loans, securitization provides funding benefits primarily by:",
        [
          "requiring the originator to hold more capital against the loans.",
          "converting a pool of relatively illiquid loans into cash, providing a funding source that may be cheaper or more accessible than issuing unsecured corporate debt.",
          "eliminating the originator's need for any third-party servicer.",
        ],
        1,
        "La titrisation permet à un originateur de monétiser (convertir en cash) un pool de prêts/créances qui resterait sinon illiquide à son bilan, fournissant une source de financement alternative — parfois moins chère — que l'émission d'obligations corporate non sécurisées classiques.",
      ],
      // Concept 2 — SPE independence
      [
        "The special purpose entity (SPE) used in a securitization must be legally independent of the seller/originator primarily so that:",
        [
          "the SPE can pay higher fees to the originator.",
          "the securitized assets are protected from claims by the seller's own creditors if the seller becomes insolvent.",
          "the SPE can issue equity to the originator's shareholders.",
        ],
        1,
        "L'indépendance juridique de la SPE (bankruptcy remoteness) garantit que si le vendeur/originateur devient insolvable, ses créanciers ne peuvent pas revendiquer les actifs déjà vendus à la SPE — protégeant la créance des investisseurs de l'ABS sur ces actifs.",
      ],
      [
        "If a securitization's SPE were not legally independent of its sponsor, the most likely consequence would be that:",
        [
          "the ABS would automatically receive a higher credit rating than the sponsor.",
          "the securitized assets could be pulled back into the sponsor's bankruptcy estate, exposing ABS investors to the sponsor's own credit risk.",
          "the servicer would no longer be needed.",
        ],
        1,
        "Sans véritable indépendance juridique (bankruptcy remoteness), les actifs transférés à la SPE pourraient être considérés comme appartenant toujours au sponsor lors d'une procédure de faillite, exposant les investisseurs de l'ABS au risque de crédit du sponsor — annulant l'objectif principal de la titrisation.",
      ],
      [
        "Which of the following is most essential to establishing that an SPE is legally independent (bankruptcy remote) from its sponsor?",
        [
          "The SPE shares the same board of directors and offices as the sponsor.",
          "The transfer of assets from the sponsor to the SPE qualifies as a true sale, not merely a secured loan.",
          "The SPE is fully guaranteed by the sponsor's own balance sheet.",
        ],
        1,
        "Pour que le bankruptcy remoteness tienne, le transfert des actifs à la SPE doit être structuré et traité comme une véritable vente (« true sale ») — s'il était requalifié en prêt sécurisé, les actifs pourraient être réintégrés dans la masse de faillite du sponsor, annulant l'indépendance de la SPE.",
      ],
      // Concept 3 — Bankruptcy remoteness / ABS rating vs seller
      [
        "An asset-backed security can potentially receive a higher credit rating than the credit rating of the company that originated (sold) the underlying assets. This is most directly explained by:",
        [
          "rating agencies always rating ABS higher than corporate bonds.",
          "bankruptcy remoteness, which isolates the securitized assets from the originator's own credit risk.",
          "the servicer's guarantee of all payments.",
        ],
        1,
        "Comme le bankruptcy remoteness isole juridiquement les actifs titrisés de l'originateur, la qualité de crédit de l'ABS dépend surtout de la performance du pool sous-jacent (et de sa structure/rehaussement de crédit) plutôt que de la solvabilité propre de l'originateur — ce qui permet à l'ABS d'être noté au-dessus de l'originateur lui-même.",
      ],
      [
        "A retailer with a below-investment-grade corporate credit rating securitizes a pool of its high-quality credit card receivables. The resulting senior ABS tranche can most plausibly receive an investment-grade rating primarily because:",
        [
          "the retailer guarantees the ABS with its own corporate credit.",
          "the securitized receivables and the SPE holding them are legally isolated from the retailer's own credit risk, so the ABS is rated on the pool's own credit quality (plus structural protections).",
          "all ABS are required by regulation to be rated investment-grade.",
        ],
        1,
        "Comme les créances ont été vendues à une SPE bankruptcy remote, le rating de l'ABS reflète la qualité de crédit des créances sous-jacentes et tout rehaussement de crédit structurel, pas le rating corporate (plus faible) de l'originateur — permettant à l'ABS d'obtenir un rating supérieur à celui du vendeur.",
      ],
      [
        "If a securitization's SPE were determined by a court to NOT be bankruptcy remote from its originator, the ABS's credit rating would most likely:",
        [
          "remain unaffected, since ratings never depend on the originator.",
          "converge toward (or be capped by) the originator's own credit rating, since the assets would no longer be isolated from the originator's risk.",
          "automatically improve, since court involvement typically strengthens investor protections.",
        ],
        1,
        "Si le bankruptcy remoteness échoue, les actifs ne sont plus isolés du risque de crédit de l'originateur, donc le rating de l'ABS devrait refléter (et être probablement plafonné par) la solvabilité de l'originateur — annulant l'avantage clé qui permettait à l'ABS d'être noté au-dessus du vendeur.",
      ],
      // Concept 4 — Credit tranching
      [
        "In a securitization with senior, mezzanine, and junior (equity) tranches, if the underlying asset pool experiences losses, which tranche absorbs losses first?",
        [
          "The senior tranche.",
          "The mezzanine tranche.",
          "The junior (equity) tranche.",
        ],
        2,
        "Le credit tranching alloue les pertes du bas vers le haut : la tranche junior (equity) absorbe les pertes en premier, suivie des tranches mezzanine, la tranche senior étant protégée tant que les pertes ne dépassent pas la taille cumulée des tranches en dessous d'elle.",
      ],
      [
        "Relative to a senior tranche, a junior (subordinated) tranche of the same securitization will most likely offer investors:",
        [
          "a lower yield, to compensate for its lower risk.",
          "a higher yield, to compensate for absorbing losses first.",
          "an identical yield, since credit tranching does not affect pricing.",
        ],
        1,
        "Comme les tranches junior absorbent les pertes en premier (risque de crédit plus élevé), les investisseurs exigent un yield plus élevé pour compenser ce risque supplémentaire par rapport à la tranche senior, plus protégée et moins rémunérée.",
      ],
      [
        "The primary purpose of credit tranching in a securitization is to:",
        [
          "eliminate the total credit risk of the underlying asset pool.",
          "redistribute the pool's total credit risk unevenly across different classes of securities, rather than reducing the total amount of risk.",
          "guarantee that every tranche receives an identical credit rating.",
        ],
        1,
        "Le tranching ne réduit pas le risque total du pool sous-jacent — il redistribue ce risque de façon inégale, en le concentrant dans les tranches junior (qui absorbent les pertes en premier) tout en protégeant les tranches senior, permettant à différents investisseurs de choisir la tranche correspondant à leur profil risque/rendement préféré.",
      ],
      // Concept 5 — Covered bonds dual recourse
      [
        "Covered bond investors, compared to typical ABS investors, benefit from 'dual recourse,' meaning they have a claim on:",
        [
          "only the segregated cover pool of assets, with no further recourse.",
          "the segregated cover pool of assets first, and the issuer's other (unencumbered) assets second if the cover pool is insufficient.",
          "only the issuer's general unsecured assets, with no dedicated collateral pool.",
        ],
        1,
        "Le dual recourse signifie que les porteurs de covered bonds ont DEUX niveaux de protection : d'abord une créance sur le cover pool ringfencé, et — si celui-ci est insuffisant — un recours sur les actifs restants (non grevés) de l'émetteur en second lieu, contrairement aux investisseurs ABS typiques dont le recours se limite généralement au seul pool titrisé.",
      ],
      [
        "Relative to a comparable asset-backed security (ABS), a covered bond backed by a similar-quality asset pool will most likely trade at a:",
        [
          "higher yield, reflecting its riskier structure.",
          "lower yield, reflecting the additional protection of dual recourse and stricter cover pool requirements.",
          "identical yield, since both instruments have the same underlying collateral quality.",
        ],
        1,
        "Les covered bonds tendent à porter un risque plus faible (et donc un yield plus bas) qu'un ABS comparable, grâce à des protections structurelles comme le dual recourse, des critères d'éligibilité stricts pour le cover pool, un cover pool maintenu dynamiquement (renouvelé), et des régimes de remboursement définis en cas de défaut du sponsor — des protections absentes ou plus faibles dans un ABS classique.",
      ],
      [
        "Unlike in a 'true' securitization, in a covered bond structure the assets backing the bond (the cover pool):",
        [
          "are legally sold and removed from the issuing bank's balance sheet into an SPE.",
          "remain on the issuing bank's balance sheet, merely ring-fenced (segregated) as dedicated collateral.",
          "are always converted into equity of the issuing bank.",
        ],
        1,
        "Différence structurelle clé : dans une vraie titrisation, les actifs sont vendus hors bilan à une SPE ; dans un covered bond, les actifs restent AU bilan de l'émetteur, simplement mis de côté (« ringfencés ») comme cover pool dédié garantissant le bond, l'émetteur conservant la propriété et maintenant dynamiquement la qualité du pool.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Fixed Income Page 7...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
