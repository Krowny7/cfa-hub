// Seed script — quiz de "drill" associé à la page 6 de la fiche PDF Fixed
// Income (Corporate Credit Analysis). Le contenu d'origine de ce drill avait
// été fourni par l'utilisateur ; il a été remis au cadre FSA / Equity à sa
// demande le 3 octobre 2026. Structure : 5 concepts × (1 question officielle
// + 1 variante "angle différent" + 1 variante "plus difficile"). Voir memory
// regle-drill-variantes-cfa-hub. Questions en anglais, explications en
// français. Questions officielles recopiées à l'identique (historique de
// réponses conservé par syncQuizSets), corrigés vérifiés contre les PDF
// "- Answers.pdf" (Readings 62 et 64 de la banque practice exams).
// Ramené à 5 concepts (15 questions) le 5 octobre 2026, à la demande de
// l'utilisateur : concepts d'origine 4, 7 retirés de la fiche, leurs
// questions rangées dans « Réserve — <titre> » (syncQuizSets, rien d'effacé).
// Usage: node scripts/seed-fixed-income-drill-page6.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Fixed Income (Système)";

const QUIZ_SETS = [
  {
    title: "Fixed Income — Drill Fiche Page 6 (Corporate Credit Analysis)",
    difficulty: 2,
    questions: [
      // Concept 1 — Structure de capital et ratios de levier (officielle, Reading 64)
      [
        "Becque Ltd. is a European Union company with the following selected financial information (€ billions, Year 1 / Year 2 / Year 3): operating income 262 / 361 / 503; depreciation & amortization 201 / 212 / 256; capital expenditures 78 / 97 / 140; cash flow from operations 303 / 466 / 361; total debt 2,590 / 2,717 / 2,650; dividends 70 / 70 / 72. Becque's three-year average debt-to-EBITDA ratio is closest to:",
        ["3.6x.", "4.6x.", "7.6x."],
        1,
        "EBITDA = résultat opérationnel + dotations aux amortissements : 262 + 201 = 463 ; 361 + 212 = 573 ; 503 + 256 = 759 Md€. Dette/EBITDA : 2 590 / 463 = 5,6x ; 2 717 / 573 = 4,7x ; 2 650 / 759 = 3,5x. Moyenne sur trois ans = (5,6 + 4,7 + 3,5) / 3 ≈ 4,6x. 7,6x correspond à la dette divisée par le résultat opérationnel seul (9,9x ; 7,5x ; 5,3x), en oubliant d'ajouter les amortissements. 3,6x est proche du ratio de la seule année 3 (3,5x) : ce n'est pas la moyenne demandée. Capex, cash flow from operations et dividendes sont des données inutiles ici.",
      ],
      // Variante angle différent — inverser le ratio Debt/Capital : capacité d'endettement restante sous un covenant
      [
        "A company has debt of $360 million and shareholders' equity of $300 million. A covenant limits its debt-to-capital ratio, defined as debt / (debt + equity), to 60%. Assuming equity stays unchanged and the proceeds of any new borrowing are held as cash, the maximum amount of additional debt the company can issue without breaching the covenant is closest to:",
        ["$90 million.", "$36 million.", "$450 million."],
        0,
        "Ratio actuel : 360 / (360 + 300) = 54,5 %, sous le plafond. Dette maximale D telle que D / (D + 300) = 60 % : D = 0,6D + 180, soit 0,4D = 180, D = 450 M$. Dette additionnelle possible = 450 − 360 = 90 M$. Contrôle : 450 / 750 = 60 %. 36 M$ (= 60 % × 660 − 360) traite le capital comme fixe, alors que chaque dollar de dette nouvelle augmente aussi le dénominateur (dette + equity). 450 M$ est la dette TOTALE maximale, pas le montant additionnel.",
      ],
      // Variante plus difficile — test de covenant sur la current year, pièges de la moyenne et du ratio Debt/Equity
      [
        "A loan agreement requires the borrower to keep debt/EBITDA at or below 4.0x and debt-to-capital at or below 65%, both tested on the most recent fiscal year. Selected data ($ millions) for Years 1, 2, and 3 (the most recent year): EBITDA 500 / 480 / 400; total debt 1,500 / 1,700 / 1,720; shareholders' equity 1,000 / 1,050 / 1,000. The borrower is most likely:",
        [
          "in compliance with both covenants, since its three-year average debt/EBITDA is about 3.6x and its debt-to-capital ratio is about 63%.",
          "in breach of both covenants, since its debt/EBITDA is about 4.3x and its debt-to-capital ratio is about 172%.",
          "in breach of the debt/EBITDA covenant (about 4.3x) but in compliance with the debt-to-capital covenant (about 63%).",
        ],
        2,
        "Un covenant se teste sur l'année courante (ici l'année 3), pas sur une moyenne. Dette/EBITDA de l'année 3 = 1 720 / 400 = 4,3x, au-dessus de 4,0x : violation. Debt/Capital de l'année 3 = 1 720 / (1 720 + 1 000) = 1 720 / 2 720 = 63,2 %, sous 65 % : respecté. La réponse A utilise la moyenne sur trois ans ((3,0 + 3,54 + 4,3) / 3 ≈ 3,6x), qui masque la dégradation récente : c'est exactement le piège de la question officielle, retourné. La réponse B calcule dette/equity (1 720 / 1 000 = 172 %) au lieu de dette/(dette + equity).",
      ],

      // Concept 2 — Covenants affirmatifs vs négatifs (officielle, Reading 64)
      [
        "A bond agreement between a lender and the issuer of secured high-yield bonds would most likely include which of the following covenants types?",
        [
          "The issuer must pay all taxes on time.",
          "The issuer must maintain compliance with certain financial ratios.",
          "The issuer must not enter into transactions with certain affiliates.",
        ],
        2,
        "Les covenants des obligations high-yield sécurisées disent surtout ce que l'émetteur ne peut PAS faire (covenants négatifs) : pas de nouvelle dette, pas de dividendes, pas de transactions avec certaines sociétés affiliées. Les réponses A et B sont des covenants affirmatifs (ce que l'émetteur DOIT faire : payer ses impôts, respecter certains ratios), typiques des obligations investment grade non sécurisées.",
      ],
      // Variante angle différent — le pourquoi : pourquoi plus de covenants négatifs en high yield
      [
        "Why do the indentures of secured high-yield bonds typically contain far more negative covenants than those of unsecured investment-grade bonds?",
        [
          "Because high-yield issuers have a higher probability of default, so bondholders need to stop actions (more debt, dividends, asset sales, affiliate transactions) that would shift value away from them before a default.",
          "Because investment-grade bondholders are mainly concerned with loss given default, which affirmative covenants reduce more effectively.",
          "Because negative covenants mainly protect shareholders, whose claims rank below those of high-yield bondholders.",
        ],
        0,
        "Plus le défaut est probable, plus les créanciers doivent empêcher l'émetteur de transférer de la valeur ailleurs avant ce défaut : endettement supplémentaire, dividendes ou rachats d'actions, cessions d'actifs, transactions avec des affiliés. D'où un paquet de covenants négatifs restrictifs en high yield. Pour un émetteur investment grade, le défaut est peu probable : quelques engagements affirmatifs suffisent et préservent sa flexibilité. La réponse B inverse les préoccupations : l'investisseur investment grade non sécurisé surveille surtout la POD, et les covenants affirmatifs ne réduisent pas spécialement la LGD. La réponse C est fausse : les covenants protègent les créanciers, pas les actionnaires.",
      ],
      // Variante plus difficile — rachat d'actions financé par dette : test d'incurrence chiffré + covenant de restricted payments
      [
        "A high-yield issuer has total debt of $900 million and EBITDA of $250 million. It plans to issue $200 million of new bonds to fund a share buyback. Its existing indenture includes an affirmative covenant to pay all taxes on time, a debt incurrence test that permits new debt only if pro forma debt/EBITDA stays at or below 4.5x, and a restricted payments covenant limiting dividends and share repurchases. Which statement is most accurate?",
        [
          "The new debt breaches the incurrence test, because pro forma debt/EBITDA of 4.4x is above the current 3.6x.",
          "The new debt passes the incurrence test (pro forma debt/EBITDA of 4.4x), but the buyback can still be blocked by the restricted payments covenant, a negative covenant that protects bondholders against value transfers to shareholders.",
          "Since the only covenant that could apply is the affirmative covenant on taxes, bondholders have no contractual protection against the transaction.",
        ],
        1,
        "Étape 1 : ratio actuel = 900 / 250 = 3,6x ; pro forma = (900 + 200) / 250 = 4,4x, sous le seuil de 4,5x : le test d'incurrence est respecté. Étape 2 : le restricted payments covenant (covenant négatif) limite les dividendes et rachats d'actions ; il peut donc bloquer le buyback même si la dette nouvelle est autorisée. Étape 3 : l'opération est crédit-négative (plus de levier au profit des actionnaires), exactement ce que ces covenants visent à empêcher. La réponse A compare le ratio pro forma au ratio actuel au lieu du seuil contractuel. La réponse C oublie les deux covenants négatifs ; l'engagement de payer ses impôts n'a rien à voir avec l'opération.",
      ],

      // Concept 3 — Ordre de priorité des créances (officielle, Reading 64)
      [
        "Colleen Hock is a buy-side investor. She is looking to add a new bond to a bond portfolio to enhance yield. Which of the following corporate bonds would offer her the highest yield?",
        ["Junior secured.", "Senior subordinated.", "Senior unsecured."],
        1,
        "Le rendement exigé augmente quand la priorité baisse. Classement : junior secured (dette sécurisée, donc avant toute dette non sécurisée) > senior unsecured > senior subordinated. La dette senior subordinated a le rang le plus bas des trois, donc le recouvrement attendu le plus faible et le risque de crédit le plus élevé : c'est elle qui offre le rendement le plus élevé. La réponse A se laisse piéger par le mot « junior » : une dette junior secured reste sécurisée. La réponse C se laisse piéger par le mot « senior » : elle passe avant la dette subordonnée, donc rapporte moins.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai sur la hiérarchie (pièges de vocabulaire)
      [
        "Which of the following statements about the priority of claims is least accurate?",
        [
          "All secured debt, including second lien debt, ranks ahead of any unsecured debt of the same issuer.",
          "Senior subordinated notes rank ahead of the same issuer's senior unsecured notes, because their name includes the word 'senior'.",
          "Debt issues that rank pari passu share any recovery at their level pro rata to their claims.",
        ],
        1,
        "Ordre standard : first lien secured, second lien secured, senior unsecured, subordinated, common equity. Une dette senior subordinated n'est « senior » qu'au sein des dettes subordonnées : elle passe toujours après la senior unsecured, donc B est fausse. A est vraie : toute dette sécurisée, même de second rang, passe avant toute dette non sécurisée grâce à sa créance sur le collatéral. C est vraie : des émissions pari passu ont le même rang et se partagent le recouvrement au prorata de leurs créances.",
      ],
      // Variante plus difficile — cascade de recouvrement en priorité absolue, avec pièges de vocabulaire
      [
        "In a liquidation under absolute priority, an issuer's assets are worth $480 million. Its claims are: a first lien term loan of $250 million, junior secured (second lien) notes of $150 million, senior unsecured notes of $200 million, and senior subordinated notes of $100 million. The recovery rate on the senior unsecured notes is closest to:",
        ["27%.", "100%.", "40%."],
        2,
        "On paie chaque rang intégralement avant de passer au suivant. First lien : 250, il reste 480 − 250 = 230. Junior secured (second lien) : 150, il reste 80. Senior unsecured : 80 pour 200 de créances, soit 40 %. Senior subordinated : 0 %. 27 % (= 80 / 300) met à tort la senior subordinated au même rang que la senior unsecured à cause du mot « senior ». 100 % fait passer la senior unsecured avant la junior secured (230 couvriraient alors ses 200) : or toute dette sécurisée, même « junior », passe avant la dette non sécurisée.",
      ],

      // Concept 4 — Holding / subsidiary : subordination structurelle (officielle, Reading 64)
      [
        "Miko Corp. (Miko) is an electronics manufacturer which frequently issues senior unsecured bonds. Miko's largest subsidiary, BluTech Inc. (BluTech), also issues senior unsecured bonds. BluTech's debt covenants prohibit transferring cash to the parent before BluTech's debt obligations are satisfied. Based on this scenario:",
        [
          "Miko's and BluTech's bonds would rank pari passu given that the two entities are related, regardless of the restriction.",
          "Miko's bonds are structurally subordinated to BluTech's bonds.",
          "BluTech's bonds are structurally subordinated to Miko's bonds.",
        ],
        1,
        "Les cash flows de BluTech servent d'abord à payer les créanciers de BluTech ; seul le reliquat peut remonter vers la maison mère Miko (upstream). Les obligations de Miko sont donc structurellement subordonnées à celles de BluTech sur les cash flows de BluTech, même si les deux sont « senior unsecured ». La réponse A est fausse : le lien capitalistique ne crée pas de rang égal, et le covenant de BluTech renforce au contraire la subordination. La réponse C inverse le sens : l'argent « descend » d'abord vers les créanciers de la filiale.",
      ],
      // Variante angle différent — ce qui réduit la subordination structurelle (et ce qui ne la réduit pas)
      [
        "Which of the following would most likely reduce the structural subordination of a holding company's bondholders relative to the creditors of its operating subsidiary?",
        [
          "A cross-default clause in the holding company's bonds.",
          "Issuing the holding company's bonds as senior unsecured rather than subordinated debt.",
          "A guarantee of the holding company's bonds by the operating subsidiary.",
        ],
        2,
        "Si la filiale opérationnelle garantit la dette de la holding (upstream guarantee), les créanciers de la holding obtiennent une créance directe sur la filiale, à côté de ses propres créanciers : ils ne dépendent plus seulement du reliquat qui remonte. La réponse A ne change rien au rang : un cross-default synchronise les défauts, il ne modifie pas la priorité. La réponse B joue sur la priorité AU SEIN de la holding : même senior unsecured, la dette de la holding reste derrière tous les créanciers de la filiale sur les cash flows de la filiale.",
      ],
      // Variante plus difficile — cascade holding / filiale avec dettes fournisseurs de la filiale et donnée-piège
      [
        "HoldCo's only asset is 100% of the shares of OpCo. HoldCo has $300 million of bonds outstanding; OpCo has $500 million of bonds and $50 million of trade payables, and has not guaranteed HoldCo's debt. Both companies default, and OpCo's assets are sold for $650 million. HoldCo's bonds carry a 7% coupon. The recovery rate on HoldCo's bonds is closest to:",
        ["50%.", "76%.", "33%."],
        2,
        "L'argent « descend » d'abord vers TOUS les créanciers d'OpCo, obligataires et fournisseurs : 650 − 500 − 50 = 100 M$. Seul ce reliquat remonte à HoldCo, en tant qu'actionnaire d'OpCo : recouvrement des obligataires de HoldCo = 100 / 300 ≈ 33 %. 50 % (= 150 / 300) oublie les dettes fournisseurs d'OpCo, qui sont aussi des créanciers de la filiale. 76 % (= 650 / 850) met toutes les créances au même rang, ce qui nie la subordination structurelle. Le coupon de 7 % est une donnée-piège : il ne change rien au partage en cas de défaut.",
      ],

      // Concept 5 — Issuer credit rating et notching (officielle, Reading 64)
      [
        "Derek Steele is a corporate credit analyst at a credit rating agency. He currently rates the 2043 maturity senior secured bonds of BBD Enterprises at A+. BBD has now requested a corporate family rating as well. The most likely rating that Steele would recommend in a rating committee for the corporate family rating is:",
        ["lower than A+.", "higher than A+.", "A+."],
        0,
        "Le corporate family rating (issuer rating) est la note globale de l'émetteur, ancrée sur sa dette senior unsecured. Les obligations senior secured passent avant la senior unsecured : elles ont été notchées vers le haut par rapport à cette référence. La note de l'émetteur est donc logiquement inférieure à A+. La réponse C oublie le notching (elle suppose que l'émission sécurisée est la référence). La réponse B inverse le sens : une dette mieux garantie que la moyenne n'est pas notée en dessous de l'émetteur.",
      ],
      // Variante angle différent — le pourquoi du notching plus large pour les émetteurs mal notés
      [
        "Rating agencies typically notch issue ratings further away from the issuer rating for speculative-grade issuers than for investment-grade issuers. The best explanation is that:",
        [
          "a speculative-grade issuer's credit rating is based on its secured debt rather than its senior unsecured debt.",
          "when default is more likely, differences in expected recovery across the capital structure have a larger effect on each issue's expected loss.",
          "notching reflects only the probability of default, which rises faster for lower-rated issues.",
        ],
        1,
        "Toutes les émissions d'un même émetteur partagent à peu près la même probabilité de défaut (les clauses de cross-default les font tomber ensemble) : ce qui les distingue, c'est la perte en cas de défaut, selon leur rang. Quand la POD est faible, ces écarts de recouvrement pèsent peu dans la perte attendue ; quand elle est élevée, ils pèsent beaucoup : d'où un notching plus large pour les émetteurs mal notés. La réponse A est fausse : la note de référence reste celle de la dette senior unsecured, quel que soit le niveau de rating. La réponse C est fausse : le notching reflète justement les différences de LGD entre émissions, pas la POD, commune à toutes.",
      ],
      // Variante plus difficile — appliquer ancre + sens + largeur du notching à deux émetteurs, conversion d'échelles
      [
        "Issuer X has a corporate family rating of A3/A− and Issuer Y a corporate family rating of B1/B+. Each issues subordinated notes with no special covenants. Under standard notching practice, the subordinated notes are most likely rated:",
        [
          "Baa1/BBB+ for X and B3/B− for Y.",
          "Baa2/BBB for X and B2/B for Y.",
          "A3/A− for X and B1/B+ for Y.",
        ],
        0,
        "Trois étapes. Ancre : la note de l'émetteur correspond à sa dette senior unsecured. Sens : une dette subordonnée passe après la senior unsecured, elle est notchée vers le BAS. Largeur : environ un cran en investment grade, deux crans en speculative grade, car le recouvrement compte davantage quand le défaut est plus probable. X (A3/A−) perd un cran : Baa1/BBB+. Y (B1/B+) perd deux crans : B2/B puis B3/B−. La réponse B applique les largeurs à l'envers (deux crans pour X, un pour Y). La réponse C n'applique aucun notching, comme si seule la POD comptait.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Fixed Income Page 6...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
