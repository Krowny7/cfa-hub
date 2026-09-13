// Seed script — quiz de "drill" pour la page 6 de la fiche PDF Fixed
// Income (Corporate Credit Analysis). 5 concepts x 3 variantes.
// Usage: node scripts/seed-fixed-income-drill-page6.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Fixed Income (Système)";

const QUIZ_SETS = [
  {
    title: "Fixed Income — Drill Fiche Page 6 (Corporate Credit Analysis)",
    difficulty: 2,
    questions: [
      // Concept 1 — Affirmative vs negative covenants
      [
        "A bond covenant requiring the issuer to maintain adequate insurance on its property and pay all taxes when due is best classified as a(n):",
        [
          "negative covenant, since it restricts the issuer's actions.",
          "affirmative covenant, since it specifies actions the issuer must take.",
          "cross-default provision.",
        ],
        1,
        "Les covenants affirmatifs (positifs) précisent des actions que l'émetteur s'engage à réaliser (payer les impôts, maintenir une assurance, fournir des états financiers) — contrairement aux covenants négatifs, qui restreignent/interdisent certaines actions.",
      ],
      [
        "A bond covenant prohibiting the issuer from incurring additional secured debt without meeting a specified financial test is best classified as a(n):",
        ["affirmative covenant.", "negative covenant.", "cross-default provision."],
        1,
        "C'est un covenant négatif (restrictif) — il limite/interdit une action (contracter de la dette sécurisée additionnelle) plutôt que d'exiger une action positive.",
      ],
      [
        "An investment-grade unsecured bond issue is, in general, most likely to rely more heavily on:",
        [
          "negative covenants, since investment-grade issuers require heavy restrictions on their operations.",
          "affirmative covenants, with fewer restrictive negative covenants than a high-yield secured issue would typically have.",
          "no covenants at all, since investment-grade issuers are risk-free.",
        ],
        1,
        "Les émetteurs investment-grade non sécurisés ont typiquement un package de covenants plus léger, dominé par des covenants affirmatifs (engagements routiniers comme payer les impôts, fournir des rapports), tandis que les émissions high-yield plus risquées (souvent sécurisées) portent généralement plus de covenants négatifs restrictifs.",
      ],
      // Concept 2 — Issuer vs issue rating / notching
      [
        "A company's issuer credit rating is most accurately described as reflecting the credit quality of its:",
        [
          "most subordinated debt instrument.",
          "senior unsecured debt, used as the reference point (\"anchor\") for the overall rating.",
          "secured bank loans only.",
        ],
        1,
        "Le rating émetteur représente la qualité de crédit globale de l'entreprise, généralement ancrée sur sa dette senior unsecured — les émissions individuelles sont ensuite notées relativement à cette ancre via un « notching » vers le haut (instruments plus seniors/sécurisés) ou vers le bas (instruments subordonnés).",
      ],
      [
        "Compared to a company's issuer credit rating, the rating on one of its subordinated bond issues will most likely be:",
        [
          "notched up (higher) relative to the issuer rating.",
          "notched down (lower) relative to the issuer rating.",
          "always identical to the issuer rating, regardless of the issue's seniority.",
        ],
        1,
        "Une émission subordonnée est classée en dessous de la dette senior unsecured dans l'ordre de priorité — les agences de notation « notchent » typiquement sa note vers le bas par rapport au rating émetteur (senior unsecured) pour refléter son recovery attendu plus faible en cas de défaut.",
      ],
      [
        "All else equal, the notching gap between a company's issuer rating and the rating on its subordinated debt tends to be wider when the issuer's overall credit rating is:",
        [
          "very high (e.g., AAA), since strong companies have simpler capital structures.",
          "very low (e.g., in speculative-grade territory), since lower-rated issuers face greater uncertainty about recovery across the capital structure.",
          "unrelated to the width of notching gaps.",
        ],
        1,
        "L'écart de notching tend à s'élargir quand la qualité de crédit globale de l'émetteur diminue — pour les émetteurs plus faiblement notés, les différences de perspectives de recovery entre le haut et le bas de la structure du capital deviennent plus marquées, donc les agences appliquent un notching plus large pour les émetteurs mal notés que pour les émetteurs de haute qualité.",
      ],
      // Concept 3 — Structural subordination
      [
        "A parent (holding company) has issued bonds directly, while its operating subsidiary has also issued its own bonds. Absent guarantees, the parent company's bondholders are most accurately described as being:",
        [
          "structurally senior to the subsidiary's bondholders, since holding company debt is always senior.",
          "structurally subordinated to the subsidiary's bondholders, since subsidiary cash flows must first satisfy the subsidiary's own creditors before any cash moves up to the parent.",
          "exactly equal in priority (pari passu) to the subsidiary's bondholders.",
        ],
        1,
        "L'argent généré au niveau de la subsidiary doit d'abord payer les créanciers de la subsidiary elle-même avant que tout cash résiduel puisse remonter vers la holding — ce qui rend les créanciers de la holding structurellement subordonnés aux créanciers de la subsidiary, même sans clause contractuelle de subordination explicite.",
      ],
      [
        "Structural subordination arises primarily because:",
        [
          "subordinated bonds are contractually ranked below senior bonds within the same legal entity.",
          "cash flows generated by a subsidiary must satisfy the subsidiary's own obligations before any residual amount can be distributed up to the parent (holding) company.",
          "rating agencies always rate holding company debt one notch above subsidiary debt.",
        ],
        1,
        "La subordination structurelle résulte de l'organisation de l'entreprise (structure holding vs subsidiary opérationnelle), pas d'une clause contractuelle de subordination — elle vient du fait que les créanciers de la subsidiary ont une créance prioritaire sur les cash flows/actifs de la subsidiary avant que la holding puisse recevoir quoi que ce soit.",
      ],
      [
        "A lender wants to avoid structural subordination when lending to a corporate group. This lender would most likely prefer to lend directly to the:",
        [
          "holding company, since it controls the group.",
          "operating subsidiary that generates the group's cash flows and holds its operating assets.",
          "it makes no difference which entity the lender lends to.",
        ],
        1,
        "Prêter directement à la subsidiary opérationnelle (plutôt qu'à la holding) évite la subordination structurelle, car le prêteur a alors une créance directe sur les cash flows et actifs de la subsidiary, avant la holding (qui ne recevrait que les montants résiduels après paiement des créanciers de la subsidiary, y compris ce prêteur).",
      ],
      // Concept 4 — Subordinated debt / pari passu
      [
        "Subordinated debt, relative to senior unsecured debt of the same issuer, ranks:",
        [
          "higher in priority of claims.",
          "lower in priority of claims.",
          "the same, since both are unsecured.",
        ],
        1,
        "La dette subordonnée est explicitement classée en dessous de la dette senior unsecured dans l'ordre de priorité — les créanciers subordonnés ne sont payés qu'après que les créanciers senior unsecured aient été intégralement satisfaits en cas de défaut/faillite.",
      ],
      [
        "Two bond issues from the same company are described as 'pari passu' with each other. This means the two issues:",
        [
          "have identical maturities.",
          "rank equally in priority of claims, sharing pro rata in any recovery.",
          "are secured by exactly the same collateral pool.",
        ],
        1,
        "Pari passu signifie que les deux obligations sont de rang égal (même niveau de séniorité) dans l'ordre de priorité — en cas de défaut, elles partagent proportionnellement (pro rata) tout recovery disponible à ce niveau, indépendamment de leur maturité ou de leurs spécificités de collatéral.",
      ],
      [
        "Which of the following instruments would most likely have the lowest priority of claims in a corporate default (excluding common equity)?",
        [
          "First lien secured debt.",
          "Senior unsecured debt.",
          "Subordinated debt.",
        ],
        2,
        "Parmi les instruments de dette listés, la dette subordonnée a le rang de priorité le plus bas (après la dette sécurisée first lien et la dette senior unsecured) — seule l'equity commune se classe en dessous d'elle dans la hiérarchie standard de priorité des créances.",
      ],
      // Concept 5 — Priority of claims
      [
        "In the standard priority-of-claims hierarchy for a corporate bankruptcy, which of the following is ranked immediately above subordinated debt?",
        [
          "Common equity.",
          "Senior unsecured debt.",
          "Second lien secured debt.",
        ],
        1,
        "L'ordre standard est : (1) first lien secured debt, (2) second lien secured debt, (3) senior unsecured debt, (4) subordinated debt, (5) common equity — la dette senior unsecured se situe juste au-dessus de la dette subordonnée.",
      ],
      [
        "All secured debt claims (first lien and second lien), relative to all unsecured debt claims (senior and subordinated), are most accurately described as ranking:",
        [
          "below every unsecured claim.",
          "above every unsecured claim.",
          "pari passu with senior unsecured debt only.",
        ],
        1,
        "Toute dette sécurisée (first lien ou second lien) se classe avant toute dette non sécurisée (senior unsecured ou subordonnée) dans l'ordre de priorité, car les créanciers sécurisés ont une créance spécifique sur le collatéral en plus de la créance générale sur les actifs de l'émetteur.",
      ],
      [
        "A cross-default provision, once triggered, most directly causes:",
        [
          "a change in the priority ranking of the defaulted instrument relative to other debt.",
          "an automatic and simultaneous default across multiple (or all) of the issuer's debt instruments, without altering their relative priority of claims.",
          "an automatic upgrade of the issuer's credit rating.",
        ],
        1,
        "Une clause de cross-default déclenche un défaut sur d'autres instruments couverts simultanément dès qu'un défaut survient sur l'un d'eux — mais elle ne change pas le classement de priorité sous-jacent entre ces instruments ; la dette sécurisée reste payée avant la dette non sécurisée, etc.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Fixed Income Page 6...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
