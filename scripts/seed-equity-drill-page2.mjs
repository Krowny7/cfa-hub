// Seed script — quiz de "drill" associé à la page 2 de la fiche PDF Equity
// (Security Market Indexes). Structure : pour chacun des 5 concepts clés de
// la page, 1 question officielle (banque de pratique Reading 42, corrigé
// vérifié contre le PDF "- Answers.pdf", recopiée à l'identique pour
// conserver l'historique) + 1 variante "angle différent" (même notion, mais
// jamais un simple changement de chiffres menant au même raisonnement) +
// 1 variante "plus difficile" (raisonnement à plusieurs étapes / pièges
// combinés). Voir memory regle-drill-variantes-cfa-hub. Questions en
// anglais, explications en français.
// Les questions officielles sont recopiées à l'identique : syncQuizSets
// retrouve l'historique de réponses en comparant le texte exact de l'énoncé.
// Usage: node scripts/seed-equity-drill-page2.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Equity (Système)";

const QUIZ_SETS = [
  {
    title: "Equity — Drill Fiche Page 2 (Security Market Indexes)",
    difficulty: 1,
    questions: [
      // Concept 1 — Construire puis gérer un indice : reconstitution vs rebalancing (officielle)
      [
        "The providers of the Smith 30 Stock Index remove Jones Company from the index because it has been acquired by another firm, and replace it with Johnson Company. This change in the index is best described as an example of:",
        ["rebalancing.", "reconstitution.", "redefinition."],
        1,
        "La reconstitution désigne le changement des TITRES qui composent un indice — nécessaire quand un constituant disparaît (ici, absorption par acquisition). Le distracteur A (rebalancing) est un piège fréquent : le rééquilibrage consiste à ajuster les POIDS des titres déjà présents, pas à changer la composition.",
      ],
      // Variante angle différent — le « pourquoi » d'une reconstitution, pas son nom
      [
        "A mid-cap equity index provider removes constituents whose market capitalization has grown above the index's mid-cap range and replaces them with stocks whose market capitalization now falls within that range. The main purpose of this change is to:",
        [
          "restore the target weights of the existing constituents after price movements.",
          "keep the index representative of its target market.",
          "reduce turnover and trading costs for funds that track the index.",
        ],
        1,
        "L'opération change QUELS titres composent l'indice (des titres devenus trop gros sortent, d'autres entrent) : c'est une reconstitution, dont le but est de réduire le risque que l'indice ne représente plus son marché cible — un indice mid-cap qui garderait des constituants devenus large caps mesurerait autre chose que le segment mid-cap. A décrit le rebalancing (ajuster les poids des titres déjà présents après les variations de prix), pas un changement de composition. C est faux : une reconstitution génère au contraire des transactions pour les fonds indiciels (vendre les sortants, acheter les entrants), ce qui tend d'ailleurs à faire monter le prix des titres ajoutés.",
      ],
      // Variante plus difficile — ordre des décisions de construction + élément non requis + décision de gestion
      [
        "An index provider documents the following decisions for a new bond index: (I) the index will measure the performance of euro-denominated investment-grade corporate bonds; (II) bonds will be weighted by the market value of each issue outstanding; (III) eligible bonds must be rated BBB- or higher and have at least one year remaining to maturity; (IV) the index will always contain exactly 400 bonds; (V) at each month-end, bonds with less than one year to maturity will be removed and newly issued eligible bonds will be added. Which statement is most accurate?",
        [
          "The construction decisions, in logical order, are I, III, and II; IV is not a required element of an index's definition; and V is a reconstitution, an index-management decision.",
          "The construction decisions, in logical order, are I, III, and II; IV is not a required element of an index's definition; and V is a rebalancing, an index-management decision.",
          "The construction decisions, in logical order, are I, IV, III, and II, because the number of constituents must be fixed before securities are selected; and V is a reconstitution.",
        ],
        0,
        "Les 3 décisions de construction, dans l'ordre : (I) le marché cible, qui définit l'univers d'investissement ; (III) la sélection des titres dans cet univers (critères de notation et de maturité) ; (II) la méthode de pondération. (IV) n'est pas requis : un indice n'a pas besoin d'un nombre fixe de constituants — pour un indice obligataire, dont l'univers change sans cesse (échéances, rappels, nouvelles émissions), imposer exactement 400 titres serait même contre-productif. (V) retire les obligations devenues inéligibles et ajoute les nouvelles : cela change QUELS titres composent l'indice, donc c'est une reconstitution, décision de gestion prise une fois l'indice lancé. B qualifie (V) de rebalancing : faux, le rebalancing ajuste les POIDS des titres déjà présents sans changer la composition. C fait du nombre de constituants une étape obligatoire placée avant la sélection, ce qui ne fait pas partie de la définition d'un indice.",
      ],

      // Concept 2 — Méthodes de pondération : ce que chacune additionne / suppose détenir (officielle)
      [
        "Which of the following statements best describes the investment assumption used to calculate an equal weighted price indicator series?",
        ["A proportionate market value investment is made for each stock in the index.", "An equal dollar investment is made in each stock in the index.", "An equal number of shares of each stock are used in the index."],
        1,
        "Une série pondérée de façon égale suppose qu'un montant en dollars identique est investi dans chaque titre de l'indice. Le distracteur A décrit en réalité un indice pondéré par la capitalisation boursière, et C décrirait un indice pondéré par les prix.",
      ],
      // Variante angle différent — pourquoi un split oblige à ajuster le diviseur (somme des prix vs somme des capitalisations)
      [
        "Which of the following best explains why a price-weighted index must adjust its divisor when a constituent stock splits, whereas a market-cap-weighted index does not?",
        [
          "A price-weighted index sums share prices, which fall after a split even though the firm's value is unchanged; a market-cap-weighted index sums price times shares outstanding, which a split leaves unchanged.",
          "A market-cap-weighted index uses free-float-adjusted shares, which already exclude the new shares created by the split.",
          "A price-weighted index assumes an equal dollar investment in each stock, so the split stock's weight must be restored to its initial level.",
        ],
        0,
        "Un indice price-weighted additionne les PRIX (cela revient à détenir une action de chaque titre) : un split 2-pour-1 divise le prix par deux sans rien changer à la valeur de l'entreprise, ce qui ferait chuter l'indice artificiellement — on recalcule donc le diviseur pour que l'indice ait la même valeur juste avant et juste après le split. Un indice market-cap additionne prix × nombre d'actions : le prix est divisé par deux mais le nombre d'actions est doublé, la capitalisation est inchangée, donc aucun ajustement n'est nécessaire. B confond avec l'ajustement free float, qui exclut les actions non disponibles à la négociation (blocs détenus par l'État, les fondateurs…) et n'a rien à voir avec les splits. C attribue au price-weighted l'hypothèse de l'equal-weighted (même montant investi dans chaque titre) : c'est justement l'erreur que la question officielle fait éviter.",
      ],
      // Variante plus difficile — mêmes données, 3 méthodes, 3 résultats + dividende-piège à écarter
      [
        "An analyst gathers the following one-year data for three stocks: Stock P, price $50 at the start and $45 at the end, 2,000 shares outstanding; Stock Q, price $10 at the start and $13 at the end, 10,000 shares outstanding; Stock R, price $25 at the start and $30 at the end, 1,000 shares outstanding. Stock R also paid a dividend of $1.00 per share during the year, and no stock splits occurred. The one-year price returns of a price-weighted, an equal-weighted, and a market-cap-weighted index of these three stocks are closest to:",
        [
          "Price-weighted 4.7%; equal-weighted 14.7%; market-cap-weighted 11.6%.",
          "Price-weighted 13.3%; equal-weighted 3.5%; market-cap-weighted 11.1%.",
          "Price-weighted 3.5%; equal-weighted 13.3%; market-cap-weighted 11.1%.",
        ],
        2,
        "On demande des rendements de PRIX : le dividende de R est une donnée-piège à écarter. Price-weighted (somme des prix, les nombres d'actions ne servent pas) : (45 + 13 + 30) / (50 + 10 + 25) − 1 = 88 / 85 − 1 ≈ 3,5 %. Equal-weighted (moyenne des rendements en %) : P −10 %, Q +30 %, R +20 % → (−10 + 30 + 20) / 3 ≈ 13,3 %. Market-cap (somme des prix × actions) : début 100 000 + 100 000 + 25 000 = 225 000 $ ; fin 90 000 + 130 000 + 30 000 = 250 000 $ → 250 000 / 225 000 − 1 ≈ 11,1 %. Le price-weighted est le plus faible car P, l'action la plus chère, y pèse 50/85 ≈ 59 % alors qu'elle baisse. A intègre le dividende (R à +24 %, sommes majorées de 1 $ ou de 1 000 $) : c'est un calcul de total return, pas de price return. B intervertit les résultats du price-weighted et de l'equal-weighted.",
      ],

      // Concept 3 — Biais des pondérations : momentum (capitalisation) vs contrariant/value (fondamentale) (officielle)
      [
        "The type of index weighting that produces a portfolio similar to that of a momentum strategy is an index with weights that are:",
        ["equal.", "based on market capitalization.", "based on fundamentals."],
        1,
        "Un indice pondéré par la capitalisation boursière donne progressivement plus de poids aux titres dont la valeur a le plus augmenté, reproduisant ainsi le comportement d'une stratégie momentum. Les pondérations égales ou fondées sur les fondamentaux (A et C) ne créent pas ce biais momentum.",
      ],
      // Variante angle différent — le « pourquoi » du biais, en comparant capitalisation et pondération fondamentale
      [
        "Which of the following best explains why a market-cap-weighted index behaves like a momentum strategy, whereas a fundamental-weighted index tends to have a contrarian effect when it is rebalanced?",
        [
          "In a market-cap-weighted index, a stock's weight rises automatically as its price rises; a fundamental-weighted index resets weights to measures such as earnings or sales, so stocks whose prices have outpaced their fundamentals are trimmed.",
          "A market-cap-weighted index is rebalanced at each review date toward the stocks with the best recent returns, whereas a fundamental-weighted index is never rebalanced.",
          "A market-cap-weighted index overweights small, fast-growing companies, whereas a fundamental-weighted index overweights companies with high price-to-earnings ratios.",
        ],
        0,
        "Dans un indice pondéré par la capitalisation, le poids d'un titre = sa capi / capi totale : quand son cours monte, son poids monte tout seul, sans aucune transaction — l'indice laisse courir les gagnants, comme une stratégie momentum. Un indice fondamental fixe ses poids sur des grandeurs comme les bénéfices, les ventes ou les fonds propres : entre deux rebalancements, un titre dont le cours s'envole voit son poids dériver au-dessus de son poids fondamental, et le rebalancement le ramène à ce poids en vendant une partie du titre — effet contrariant. B est faux : l'indice cap n'a besoin d'aucun rebalancement pour suivre les prix, et c'est précisément le rebalancement de l'indice fondamental qui crée l'effet contrariant. C inverse les biais : la pondération fondamentale surpondère les titres à P/E BAS (biais value), et l'indice cap surpondère les grandes capitalisations, pas les petites.",
      ],
      // Variante plus difficile — calcul des poids, dérive entre deux rebalancements, sens des transactions
      [
        "An index contains two stocks. Stock X has a market capitalization of $600 million and earnings of $30 million; Stock Y has a market capitalization of $400 million and earnings of $40 million. The two stocks are used both in a market-cap-weighted index and in a fundamental index weighted by earnings, each rebalanced once a year. Over the following year, X's share price rises 50%, Y's share price is unchanged, and both firms' earnings are unchanged. Just before the annual rebalancing, which statement is most accurate?",
        [
          "The earnings-weighted index holds about 64.3% in X and will sell X back to about 42.9%; the market-cap-weighted index will also sell X to restore its initial 60% weight.",
          "The earnings-weighted index holds about 52.9% in X and will buy more X to follow its price momentum; the market-cap-weighted index holds about 69.2% in X and needs no trade.",
          "The earnings-weighted index holds about 52.9% in X and will sell X back to about 42.9%; the market-cap-weighted index holds about 69.2% in X and needs no trade.",
        ],
        2,
        "Poids initiaux de l'indice fondamental = part des bénéfices : X = 30/70 ≈ 42,9 %, Y = 40/70 ≈ 57,1 % (contre 60 % / 40 % en capitalisation) — l'indice surpondère Y, le titre au P/E le plus bas (400/40 = 10 contre 600/30 = 20 pour X) : c'est le biais value. Entre deux rebalancements, les poids dérivent avec les prix : X vaut 42,9 × 1,5 ≈ 64,3, Y reste à 57,1, total ≈ 121,4 → poids de X ≈ 64,3 / 121,4 ≈ 52,9 %. Les bénéfices étant inchangés, le rebalancement ramène X à 42,9 % : l'indice VEND environ 10 points de X (le titre qui a monté) pour racheter Y — effet contrariant. L'indice cap a mécaniquement X = 900 / (900 + 400) ≈ 69,2 % et n'a rien à vendre : le poids suit le prix, c'est le comportement momentum. A oublie de renormaliser (64,3 + 57,1 dépasse 100 %) et croit à tort que l'indice cap revient à ses poids initiaux. B inverse le sens du rebalancement de l'indice fondamental : c'est l'indice cap qui suit les gagnants.",
      ],

      // Concept 4 — Price return vs total return (officielle)
      [
        "An index provider maintains a price index and a total return index for the same 40 stocks. Assuming both indexes begin the year with the same value, the total return index at the end of the year will least likely be:",
        ["equal to the price index if the constituent stocks do not pay dividends.", "greater than the price index.", "less than the price index if the price index increases and greater than the price index if the price index decreases."],
        2,
        "Un indice total return inclut les flux de trésorerie (dividendes, intérêts) en plus des variations de prix, et ne peut donc jamais être INFÉRIEUR à l'indice de prix équivalent — l'affirmation C est fausse et constitue la bonne réponse à cette question \"least likely\".",
      ],
      // Variante angle différent — inverser la formule du total return pour retrouver le revenu
      [
        "A price return index and a total return index on the same constituents both stood at 1,250 at the start of the year. At the end of the year, the price return index stands at 1,300, and the total return index has returned 6.0% for the year. The income (dividends) generated by the constituents during the year, expressed in index points, is closest to:",
        ["50 points.", "75 points.", "25 points."],
        2,
        "On inverse la formule TR = (VPRI fin − VPRI début + revenus) / VPRI début. Gain total = 6,0 % × 1 250 = 75 points ; variation de prix = 1 300 − 1 250 = 50 points ; revenus = 75 − 50 = 25 points (soit un rendement en revenu de 25 / 1 250 = 2 % et un rendement prix de 4 %). A (50) est la variation de prix seule et B (75) le gain total : aucun des deux n'isole la composante revenu. Comme le revenu est positif, l'indice total return finit au-dessus de l'indice de prix (1 325 contre 1 300).",
      ],
      // Variante plus difficile — plusieurs périodes, chaînage géométrique, piège « plus de revenu = indices égaux »
      [
        "A price return index and a total return index on the same constituents were both launched at 500 three years ago. In Year 1, the index's price return was +6% and its income return was 5%. In Years 2 and 3, the constituents paid no income, and the price returns were -20% and +10%, respectively. At the end of Year 3, the values of the price return index and the total return index are closest to:",
        [
          "Price return index 466.4; total return index 488.4.",
          "Price return index 466.4; total return index 466.4.",
          "Price return index 466.4; total return index 491.4.",
        ],
        0,
        "Les rendements se chaînent géométriquement. Indice de prix : 500 × 1,06 × 0,80 × 1,10 = 466,4. Indice total return : rendement total de l'année 1 = 6 % + 5 % = 11 %, puis −20 % et +10 % sans revenu → 500 × 1,11 × 0,80 × 1,10 = 488,4. B est le piège central : les deux indices ne sont égaux qu'à l'inception, ou si AUCUN revenu n'a été distribué sur toute la période depuis le lancement ; le revenu de l'année 1 crée un écart qui ne se referme jamais. C (491,4) ajoute simplement les 25 points de dividendes de l'année 1 (5 % × 500) à l'indice de prix, comme s'ils n'étaient pas réinvestis ; or un indice total return réinvestit les revenus, qui subissent ensuite la baisse de 20 % puis la hausse de 10 % : 25 × 0,80 × 1,10 = 22 points d'écart, d'où 466,4 + 22 = 488,4. Malgré la baisse du marché, l'indice total return reste au-dessus de l'indice de prix.",
      ],

      // Concept 5 — Types d'indices : biais des indices de hedge funds (officielle)
      [
        "Voluntary reporting of performance by hedge fund managers leads to:",
        ["an upward bias in hedge fund index returns.", "a downward bias in hedge fund index returns.", "no appreciable bias in hedge fund index returns."],
        0,
        "Les gérants de hedge funds ayant le choix de déclarer ou non leurs performances, seuls les fonds affichant de bons résultats ont tendance à le faire, ce qui crée un biais à la HAUSSE des indices de hedge funds.",
      ],
      // Variante angle différent — inverser : quelle méthode RÉDUIRAIT le biais (mécanisme du biais du survivant)
      [
        "Which of the following changes in an index provider's methodology would most likely reduce the upward bias in its hedge fund index returns?",
        [
          "Accepting performance data only from managers who choose to submit it, to whichever index providers they select.",
          "Adding newly reporting funds together with their past returns, back-filled from before they began reporting.",
          "Keeping in the index the full return history of funds that stop reporting or close, instead of removing it.",
        ],
        2,
        "Le biais à la hausse vient de deux mécanismes : la déclaration volontaire (les fonds performants choisissent de reporter, les autres non) et le biais du survivant (les fonds qui échouent cessent de reporter ou ferment, et disparaissent de l'indice avec leur historique). Conserver l'historique des fonds sortis réintègre leurs mauvaises performances et réduit donc le biais du survivant. A décrit exactement la cause du biais de déclaration volontaire : l'appliquer le maintient. B l'accentue : un fonds ne commence en général à reporter qu'après un bon historique, et intégrer rétroactivement cet historique (backfill) gonfle les rendements passés de l'indice.",
      ],
      // Variante plus difficile — plusieurs types d'indices combinés (commodities, hedge funds, obligations)
      [
        "Consider the following statements about specialized indexes. Statement 1: Commodity indexes are generally built from futures contract prices, so their returns can differ from the percentage change in the spot prices of the underlying commodities. Statement 2: Because of survivorship bias, a hedge fund index's reported historical returns would most likely fall if the funds that stopped reporting were added back into the index. Statement 3: Because the bond universe is narrower and more stable than the stock universe, bond indexes have lower turnover and are easier for portfolio managers to replicate than equity indexes. Which of the statements is (are) correct?",
        ["Statement 1 only.", "Statements 1 and 2 only.", "Statements 1, 2, and 3."],
        1,
        "Énoncé 1 vrai : les indices de matières premières sont construits sur des contrats futures, jamais sur les prix spot ; leur rendement dépend aussi du roll yield et du taux sans risque, d'où un écart possible avec la variation des prix spot. Énoncé 2 vrai : le biais du survivant fait disparaître de l'indice les fonds qui ont échoué ; les réintégrer ferait baisser les rendements historiques — c'est bien la preuve que l'indice est biaisé à la hausse. Énoncé 3 faux sur toute la ligne : l'univers obligataire est plus LARGE que l'univers actions (un même émetteur a souvent de nombreuses émissions) et moins STABLE (échéances, rappels, nouvelles émissions), d'où une rotation plus élevée ; s'ajoutent l'illiquidité et l'absence de prix de transaction continus sur un marché de gré à gré : un indice obligataire est plus difficile et plus coûteux à répliquer. A vient d'une lecture inversée du biais du survivant ; C accepte l'énoncé 3.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Equity Page 2...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
