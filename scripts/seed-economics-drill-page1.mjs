// Seed script — quiz de "drill" associé à la page 1 de la fiche PDF Economics
// (Firms & Market Structures, Reading 12). Structure : pour chacun des 5
// concepts clés de la page, 1 question officielle (banque de pratique CFA,
// Practise Exams/Economics, Reading 12, corrigé vérifié contre "- Answers.pdf",
// jamais l'une des 5 questions déjà imprimées dans le PDF) + 1 variante "angle
// différent" (même notion, mais jamais un simple changement de chiffres menant
// au même raisonnement) + 1 variante "plus difficile" (raisonnement à plusieurs
// étapes / pièges combinés / notion connexe de la page). Voir memory
// regle-drill-variantes-cfa-hub. Questions en anglais, explications en français.
// Usage: node scripts/seed-economics-drill-page1.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Economics (Système)";

const QUIZ_SETS = [
  {
    title: "Economics — Drill Fiche Page 1 (Firms & Market Structures)",
    difficulty: 1,
    questions: [
      // Concept 1 — Économies d'échelle (LRATC) et échelle minimale efficiente (officielle — R12 Q1)
      [
        "A firm that is experiencing diseconomies of scale should:",
        ["decrease its plant size.", "decrease output in the short run.", "shut down in the long run."],
        0,
        "Des déséconomies d'échelle signifient que la LRATC remonte : la firme a dépassé la taille d'usine qui minimise le coût unitaire de long terme (l'échelle efficiente). Il faut donc ramener la taille de l'usine vers cette échelle, ce qui n'est possible qu'à long terme (à court terme la taille de l'usine est fixe). B est faux : produire moins à court terme ne corrige pas un problème de taille, qui est structurel. C est faux : un coût unitaire trop élevé ne justifie pas à lui seul de quitter le marché, la firme peut simplement se redimensionner.",
      ],
      // Variante angle différent — le "pourquoi" des déséconomies (cause, pas conséquence)
      [
        "Which of the following best explains why long-run average total cost eventually rises when a firm expands beyond its minimum efficient scale?",
        [
          "The benefit of spreading fixed costs over more output reverses beyond that scale.",
          "Coordination, communication, and management problems grow faster than the benefits of larger scale.",
          "Diminishing returns set in because the firm's plant size is fixed.",
        ],
        1,
        "Au-delà de l'échelle minimale efficiente, la bureaucratie, la coordination et la communication coûtent de plus en plus cher à mesure que la firme grossit : c'est la cause des déséconomies d'échelle (B). A est faux : étaler les coûts fixes sur plus d'unités fait toujours baisser le coût fixe unitaire, c'est même l'une des sources des économies d'échelle (avec la spécialisation et les achats en volume) ; et à long terme il n'y a plus de coût fixe. C confond long terme et court terme : la loi des rendements décroissants suppose un facteur fixe (l'usine), alors que la LRATC laisse tous les facteurs varier.",
      ],
      // Variante plus difficile — calcul de la LRATC, minimum, lien avec l'équilibre LT en concurrence parfaite, donnée-piège (coûts fixes)
      [
        "A firm in a perfectly competitive industry can build any plant size. The lowest long-run total cost of producing 100, 200, 300, and 400 units is $1,500, $2,600, $3,600, and $5,200, respectively. The firm's current plant carries $800 of fixed costs. If the industry is in long-run equilibrium and all firms have these costs, each firm will most likely produce, and the market price will most likely be:",
        ["200 units at $13.00.", "400 units at $13.00.", "300 units at $12.00."],
        2,
        "LRATC = coût total / quantité : 1 500/100 = 15,00 ; 2 600/200 = 13,00 ; 3 600/300 = 12,00 ; 5 200/400 = 13,00. Le minimum est à 300 unités (12,00 $) : c'est l'échelle minimale efficiente. En concurrence parfaite, à l'équilibre de long terme, la firme produit au minimum de la LRATC et le prix est égal à ce coût minimum (profit économique nul) : 300 unités à 12,00 $. Les 800 $ de coûts fixes sont la donnée-piège : à long terme tous les coûts sont variables, et les coûts fournis sont déjà les plus bas possibles pour chaque niveau de production. A est faux : à 200 unités le coût unitaire (13,00) est encore au-dessus du minimum, les économies d'échelle ne sont pas épuisées. B est faux : à 400 unités la firme est déjà en déséconomies d'échelle (la LRATC remonte de 12,00 à 13,00).",
      ],

      // Concept 2 — Concurrence parfaite : price taker, MR = MC, arrêt de production (officielle — R12 Q5)
      [
        "A firm operating as a price taker will produce the quantity at which:",
        ["revenue is maximized.", "it earns long-run economic profit.", "marginal revenue equals marginal cost."],
        2,
        "Un price taker (P = AR = MR) maximise son profit, pas son chiffre d'affaires, en produisant la quantité où MR = MC. A est faux : maximiser le revenu total ignorerait les coûts. B est faux : en concurrence parfaite, l'entrée de nouvelles firmes ramène le profit économique à zéro à long terme ; le profit économique ne subsiste qu'à court terme.",
      ],
      // Variante angle différent — le "pourquoi" de la fonction d'offre (seule la concurrence parfaite en a une)
      [
        "In which market structure can a firm's supply function be read directly from its marginal cost curve, and why?",
        [
          "Perfect competition, because price equals marginal revenue, so the quantity supplied at each price is where marginal cost equals that price.",
          "Monopoly, because the firm sets output where marginal revenue equals marginal cost, so each quantity corresponds to exactly one price along the marginal cost curve.",
          "Monopolistic competition, because price equals marginal cost in the long run, so each quantity corresponds to a single price.",
        ],
        0,
        "Pour un price taker, P = MR : à chaque prix de marché, la quantité offerte est lue sur la courbe de MC (au-dessus de l'AVC), donc la courbe de MC EST sa fonction d'offre. B est faux : le monopole fixe MR = MC, mais son prix se lit sur la courbe de demande (P > MR) ; le même niveau de MC peut correspondre à des prix différents selon la demande, il n'y a pas de lien prix-quantité unique, donc pas de fonction d'offre. C est faux : en concurrence monopolistique P > MC, même à long terme (P = ATC > MC), donc la courbe de MC ne donne pas le prix.",
      ],
      // Variante plus difficile — arrêt de court terme avec P < AVC, calcul des deux pertes, coût irrécupérable à écarter
      [
        "A perfectly competitive firm produces 10,000 units, the quantity at which marginal revenue equals marginal cost. The market price is $24.00 per unit, average variable cost is $25.50, and average fixed cost is $9.00. The firm also paid $500,000 last year for a non-refundable operating licence. In the short run, what should the firm do, and what loss will it incur by doing so?",
        ["Continue to operate; loss of $105,000.", "Shut down; loss of $90,000.", "Shut down; loss of $590,000."],
        1,
        "Revenu total = 24 x 10 000 = 240 000 $ ; coûts variables = 25,50 x 10 000 = 255 000 $ ; coûts fixes = 9 x 10 000 = 90 000 $. Comme P (24,00) < AVC (25,50), le revenu ne couvre même pas les coûts variables : en produisant, la perte est (25,50 + 9,00 - 24,00) x 10 000 = 105 000 $ ; en arrêtant, la perte se limite aux coûts fixes, 90 000 $. L'arrêt de court terme est donc le meilleur choix (économie de 15 000 $ = 1,50 x 10 000). A applique le mauvais critère (P > AFC) alors que le test est P vs AVC. C ajoute la licence de 500 000 $ : c'est un coût irrécupérable (sunk cost), payé l'an dernier, identique dans les deux scénarios, et à ignorer pour décider.",
      ],

      // Concept 3 — Concurrence monopolistique : différenciation, profit, comparaison avec la concurrence parfaite (officielle — R12 Q38)
      [
        "Which of the following is least accurate regarding product development and marketing for firms under monopolistic competition?",
        [
          "Brand names can provide consumers with information regarding the quality of firm’s products.",
          "Firms that bring new and innovative products to the market face relatively more elastic demand curves than their competitors.",
          "Relative to other types of competition, product innovation is critical to the pursuit of economic profits.",
        ],
        1,
        "La différenciation (produit nouveau, innovation, publicité, marque) est le levier de profit propre à la concurrence monopolistique : un produit innovant a moins de substituts proches, donc une demande MOINS élastique, ce qui permet de relever le prix et de dégager un profit économique, jusqu'à ce que les imitations érodent l'avantage. B est donc l'énoncé le moins exact, car il affirme l'inverse (demande plus élastique). A est exact : une marque renseigne sur la qualité. C est exact : plus que dans les autres structures, l'innovation est essentielle pour obtenir un profit économique.",
      ],
      // Variante angle différent — comparaison de deux structures à l'équilibre de long terme (même profit nul, résultat différent)
      [
        "Relative to a perfectly competitive firm in long-run equilibrium, a monopolistically competitive firm in long-run equilibrium most likely has:",
        [
          "a lower price and a larger quantity, because product differentiation reduces average cost.",
          "the same price and quantity, because both structures earn zero economic profit in the long run.",
          "a higher price and a smaller quantity, with excess capacity, even though economic profit is zero.",
        ],
        2,
        "Les deux structures ont un profit économique nul à long terme, mais ce n'est pas la même situation. Le concurrent monopolistique fait face à une demande décroissante : P > MR = MC, donc il fait payer plus que son coût marginal, et il produit moins que l'échelle minimale efficiente (surcapacité) ; la firme parfaitement concurrentielle produit au minimum de l'ATC avec P = MC. C est donc correct : prix plus élevé, quantité plus faible, surcapacité. B est le piège classique : un même profit nul n'implique pas le même prix ni la même quantité. A est faux : la différenciation (publicité, marque) ajoute des coûts, elle ne les réduit pas.",
      ],
      // Variante plus difficile — profit max à calculer sur un tableau (MR = MC / TR - TC), piège du revenu maximal, puis ajustement de long terme
      [
        "A monopolistically competitive firm faces the following demand and total cost schedule, shown as (quantity, price, total cost): (1, $110, $60), (2, $100, $100), (3, $90, $150), (4, $80, $210), (5, $70, $290), (6, $60, $390). Which of the following correctly gives the firm's short-run profit-maximizing output and price and the long-run adjustment that should follow?",
        [
          "3 units at $90; entry by new competitors will shift the firm's demand curve to the left until price equals average total cost.",
          "6 units at $60, where total revenue is highest; entry by new competitors will shift the firm's demand curve to the left until price equals average total cost.",
          "3 units at $90; entry will not occur because product differentiation protects the firm, so the economic profit persists.",
        ],
        0,
        "Calcul : TR = 110, 200, 270, 320, 350, 360 ; MR = 110, 90, 70, 50, 30, 10 ; MC (du 2e au 6e) = 40, 50, 60, 80, 100 ; profit = TR - TC = 50, 100, 120, 110, 60, -30. Le profit est maximal à 3 unités (120 $), prix 90 $, et MR = MC est bien respecté : à la 3e unité MR = 70 > MC = 50, à la 4e MR = 50 < MC = 60. B est le piège du revenu maximal (360 $ à 6 unités) : à 6 unités le profit est négatif (-30 $). Avec la règle P = MC, on produirait environ 4 à 5 unités, mais un concurrent monopolistique a P > MR, c'est MR = MC qui s'applique. Long terme : les barrières à l'entrée sont faibles, donc le profit de 120 $ attire de nouveaux concurrents qui déplacent la demande de la firme vers la gauche jusqu'à P = ATC (profit économique nul). C est faux : la différenciation ne bloque pas l'entrée de produits substituts proches.",
      ],

      // Concept 4 — Oligopole : modèle de Cournot, équilibre de Nash et collusion (officielle — R12 Q37)
      [
        "Firm X and Firm Y are two firms in a Cournot duopoly model with identical marginal cost curves. In the long run, equilibrium will occur with both firms selling:",
        [
          "different quantities with different market shares at an equilibrium price above the price in a monopoly market structure.",
          "the same quantity with differing market shares at an equilibrium price equivalent to the price in a monopoly market structure.",
          "the same quantity with an equivalent market share at an equilibrium price above the price in a perfectly competitive market.",
        ],
        2,
        "Dans le modèle de Cournot (choix simultanés, chaque firme suppose que l'autre ne change pas sa production), deux firmes aux coûts marginaux identiques sont symétriques : même quantité, même part de marché. Le prix d'équilibre se situe entre le prix de concurrence parfaite et le prix de monopole : au-dessus du premier, en dessous du second. C est donc correct. A est faux : des coûts identiques donnent des quantités identiques, et le prix est inférieur (pas supérieur) au prix de monopole. B est faux : seul un cartel qui coopère atteindrait le prix de monopole.",
      ],
      // Variante angle différent — le "pourquoi" : Cournot produit plus que le cartel (lien avec Nash et collusion)
      [
        "In a Cournot duopoly with identical firms, each firm's equilibrium output is larger than its share of the joint profit-maximizing (monopoly) output. The best explanation is that each firm:",
        [
          "expects its rival to follow any price cut but not any price increase, so it avoids changing its price.",
          "treats its rival's output as fixed, so part of the price decline caused by its extra output falls on its rival rather than on itself.",
          "moves first and commits to a larger output, forcing its rival to produce less.",
        ],
        1,
        "Dans le modèle de Cournot, chaque firme prend la production de l'autre comme donnée : quand elle augmente sa production, la baisse de prix qui en résulte pèse en partie sur son rival, et non sur elle seule. Elle a donc intérêt à produire plus que sa part de la production de monopole (c'est aussi l'incitation à tricher qui rend la collusion instable). Le total dépasse la production de monopole, d'où un prix plus bas. A décrit la demande coudée (kinked demand), un autre modèle, centré sur la rigidité des prix. C décrit Stackelberg (décisions séquentielles, avec un leader), pas Cournot (décisions simultanées de firmes symétriques).",
      ],
      // Variante plus difficile — matrice de gains : équilibre de Nash, collusion, tricherie (raisonnement à plusieurs étapes)
      [
        "Two firms in an oligopoly can either comply with a cartel output quota or cheat by producing more. Profits in $ millions are shown as (Firm X, Firm Y): both comply (10, 10); X cheats while Y complies (14, 4); X complies while Y cheats (4, 14); both cheat (7, 7). Which of the following is most accurate?",
        [
          "The Nash equilibrium is for both firms to cheat, earning $7 million each; the cartel outcome gives each $10 million but is unstable because a firm that cheats against a compliant rival raises its profit to $14 million.",
          "The Nash equilibrium is for both firms to comply, earning $10 million each, because it maximizes joint profit and neither firm can improve its payoff by acting alone.",
          "The Nash equilibrium is for both firms to cheat, earning $7 million each, and the cartel would nonetheless be stable because a cheater's $4 million gain is smaller than the $6 million its compliant rival loses.",
        ],
        0,
        "Nash = aucune firme ne gagne à changer SEULE de stratégie. Si Y respecte, X gagne 14 en trichant contre 10 en respectant ; si Y triche, X gagne 7 en trichant contre 4 en respectant : tricher est la meilleure réponse dans les deux cas (stratégie dominante), et il en va de même pour Y. L'équilibre de Nash unique est donc (triche, triche) = (7, 7). Le cartel (10, 10) rapporte un profit conjoint de 20 contre 14 au Nash, mais il est instable : chaque firme gagne 4 (14 - 10) en trichant seule. B est faux : (10, 10) n'est pas un équilibre de Nash, car chaque firme peut passer à 14 en changeant seule. C identifie bien le Nash mais conclut à tort à la stabilité : la perte de 6 subie par le rival n'entre pas dans le calcul de la firme qui triche, seul son propre gain (+4) compte.",
      ],

      // Concept 5 — Mesures de concentration : CRN et HHI (officielle — R12 Q39)
      [
        "Concentration measures are most likely to be used to:",
        [
          "analyze barriers to entry into an industry.",
          "identify the market structure of an industry.",
          "measure elasticity of demand facing an industry.",
        ],
        1,
        "Les mesures de concentration (CRN et HHI) servent à identifier la structure de marché d'une industrie (concurrence parfaite, monopolistique, oligopole ou monopole). Elles ne mesurent ni les barrières à l'entrée (A) ni l'élasticité de la demande (C) : deux industries aussi concentrées l'une que l'autre peuvent avoir des barrières à l'entrée très différentes.",
      ],
      // Variante angle différent — comparer deux industries : même CR4, HHI différent
      [
        "Industry X and Industry Y each have eight firms. In Industry X, the four largest firms each have a 20% market share and the other four firms each have 5%. In Industry Y, the largest firm has 50%, the next three have 10% each, and the other four have 5% each. Which of the following statements about concentration is most accurate?",
        [
          "The four-firm concentration ratio is the same for both industries, but the HHI is higher for Industry Y.",
          "The four-firm concentration ratio is higher for Industry Y because it has the largest single firm, and the HHI is also higher.",
          "Both the four-firm concentration ratio and the HHI are the same, because both industries have eight firms.",
        ],
        0,
        "CR4 = somme des parts des 4 plus grandes firmes : X = 4 x 20 % = 80 % ; Y = 50 % + 3 x 10 % = 80 %. Identique. HHI = somme des parts au carré : X = 4 x 0,20² + 4 x 0,05² = 0,16 + 0,01 = 0,17 ; Y = 0,50² + 3 x 0,10² + 4 x 0,05² = 0,25 + 0,03 + 0,01 = 0,29. Le HHI est plus élevé pour Y, car l'élévation au carré pondère davantage les grandes parts. B est faux : le CR4 ignore la répartition entre les firmes du groupe, il ne peut donc pas distinguer les deux industries. C est faux : le nombre de firmes ne suffit pas, ce sont les parts qui comptent.",
      ],
      // Variante plus difficile — fusion : reclasser avant de recalculer CR3, puis HHI avant/après (piège : ne pas retirer les anciennes parts)
      [
        "An industry has six firms with market shares of 30%, 25%, 15%, 10%, 10%, and 10%. Two of the 10% firms merge. Which of the following is most accurate regarding the three-firm concentration ratio (CR3) and the HHI after the merger?",
        [
          "CR3 is unchanged at 70% because neither merging firm was among the three largest, and the HHI rises from 0.205 to 0.225.",
          "CR3 rises to 75%, and the HHI rises from 0.205 to 0.245.",
          "CR3 rises to 75%, and the HHI rises from 0.205 to 0.225.",
        ],
        2,
        "Avant fusion : CR3 = 30 + 25 + 15 = 70 % ; HHI = 0,30² + 0,25² + 0,15² + 3 x 0,10² = 0,09 + 0,0625 + 0,0225 + 0,03 = 0,205. Après fusion, les deux firmes de 10 % forment une firme de 20 %, qui dépasse celle de 15 % : il faut reclasser avant de recalculer. Nouvelles parts : 30, 25, 20, 15, 10, d'où CR3 = 30 + 25 + 20 = 75 %, et HHI = 0,09 + 0,0625 + 0,04 + 0,0225 + 0,01 = 0,225 (hausse de 2 x 0,10 x 0,10 = 0,02). A oublie que la firme fusionnée de 20 % entre dans les trois premières, même si aucune des deux firmes d'origine n'y figurait : le CR3 monte. B ajoute le carré de la firme fusionnée (0,04) sans retirer les carrés des deux firmes d'origine (2 x 0,01) : 0,205 + 0,04 = 0,245.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Economics Page 1...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
