// Seed script — quiz de "drill" associé à la page 1 de la fiche PDF Derivatives
// (Derivative Features & Markets · Forwards, Futures & Swaps, Readings 66 et 67
// de la fiche, soit les Readings 68 et 69 de la banque de pratique : décalage
// de +2). Structure : pour chacun des 5 concepts clés de la page, 1 question
// officielle (banque de pratique Derivatives, corrigé vérifié contre
// "- Answers.pdf") + 1 variante "angle différent" (même notion, mais jamais
// un simple changement de chiffres menant au même raisonnement) + 1 variante
// "plus difficile" (raisonnement à plusieurs étapes / pièges combinés / notion
// connexe de la page). Voir memory regle-drill-variantes-cfa-hub. Questions en
// anglais, explications en français.
// Les 5 questions officielles ne sont PAS celles imprimées dans le PDF
// (R68 Q6, Q7 et Q9, R69 Q3 et Q19) : l'utilisateur les a déjà sur papier.
// Usage: node scripts/seed-derivatives-drill-page1.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Derivatives (Système)";

const QUIZ_SETS = [
  {
    title: "Derivatives — Drill Fiche Page 1 (Derivative Features & Markets · Forwards, Futures & Swaps)",
    difficulty: 1,
    questions: [
      // Concept 1 — Features d'un dérivé : prix fixé pour une valeur nulle à l'initiation (officielle — R68 Q4)
      [
        "Party A takes a position in a forward contract to purchase 200 shares of Squealer Inc. (Squealer) for $40 per share three months from now. Party B takes the opposite position to sell 200 shares of Squealer for $40 per share three months from now. The relevant discount rate is 5%. The value of the forward contract to Party A at the initiation of the contract is closest to:",
        ["$7,900.", "$0.", "$8,000."],
        1,
        "Le prix forward (40 $) est fixé pour que le contrat ait une valeur nulle pour les deux parties à l'initiation : personne ne paie au départ. B est donc correct. C est faux : 8 000 $ (200 x 40) est le montant qui sera payé à l'échéance, pas la valeur du contrat aujourd'hui. A est faux : environ 7 900 $ est la valeur actuelle de ce montant au taux de 5 % sur trois mois, ce qui n'est pas non plus la valeur du forward.",
      ],
      // Variante angle différent — ce qui ne fait PAS partie des termes d'un forward (pas de premium, puisque la valeur initiale est nulle)
      [
        "Which of the following is least likely to be specified in the terms of a forward contract at initiation?",
        [
          "The forward price and the settlement date.",
          "The contract size and whether the contract is deliverable or cash-settled.",
          "A premium paid by the long party to the short party.",
        ],
        2,
        "Un forward précise l'underlying, le prix du contrat (forward price), la taille du contrat, la date d'échéance et le mode de règlement (livraison ou cash settlement). Le forward price est justement fixé pour que la valeur du contrat soit nulle à l'initiation : aucune des deux parties ne paie l'autre au départ, il n'y a donc pas de premium. C est la réponse. A est faux : le prix et la date d'échéance sont au cœur du contrat. B est faux : la taille et le mode de règlement (deliverable ou cash-settled, économiquement équivalents) font partie des termes. À l'inverse, une option, qui a une valeur positive dès l'initiation, se paie par une premium versée par l'acheteur au writer.",
      ],
      // Variante plus difficile — couverture complète par un forward cash-settled vendu (sens du paiement, montant, donnée-piège du taux)
      [
        "An investor owns 200 shares of a stock and hedges them by taking the short side of a three-month, cash-settled forward contract on 200 shares at a forward price of $40 per share. The relevant discount rate is 5%. At settlement, the share price is $36. The combined value of the shares and the forward settlement payment at that date is closest to:",
        ["$8,000.", "$7,200.", "$6,400."],
        0,
        "Le short forward gagne quand le cours baisse. À l'échéance, cash settlement = 200 × (40 − 36) = 800 $, versés par le long à l'investisseur ; aucune action n'est livrée, seul le gain net est payé. Les actions valent 200 × 36 = 7 200 $. Total : 7 200 + 800 = 8 000 $, soit exactement 200 × 40 : la couverture complète (full hedge) a figé le prix de vente à 40 $, comme l'aurait fait un contrat deliverable. A est donc correct. B est faux : 7 200 $ oublie le paiement du forward, comme si la position n'était pas couverte. C est faux : 6 400 $ = 7 200 − 800 suppose que l'investisseur paie le gain, alors que c'est le short qui gagne quand le cours baisse. Le taux de 5 % est une donnée-piège : tout se passe à l'échéance, il n'y a rien à actualiser (et à l'initiation, le forward valait zéro).",
      ],

      // Concept 2 — Underlyings : forward sur taux vs forward sur obligation (officielle — R68 Q3)
      [
        "Josh Amie purchases a one-year interest rate forward contract based on the market reference rate (MRR). At settlement, the MRR has risen and Amie will have:",
        [
          "a loss on the forward contract.",
          "a gain on the forward contract.",
          "neither a loss nor a gain on the forward contract.",
        ],
        1,
        "Le long d'un forward sur taux d'intérêt gagne quand le taux de référence monte au-dessus du taux du contrat. B est donc correct. A est faux : c'est le résultat d'un long forward sur obligation, car une hausse des taux fait baisser le prix de l'obligation (piège à ne pas confondre). C est faux : la hausse du MRR crée bien un gain pour l'acheteur du forward de taux.",
      ],
      // Variante angle différent — le « pourquoi » : quelle position couvre un futur emprunteur à taux variable
      [
        "A company will borrow at a floating rate in six months and is concerned that interest rates will rise before then. Which forward position would best hedge this risk, and why?",
        [
          "A long interest rate forward, because it gains when the reference rate rises, offsetting the higher interest cost.",
          "A long forward on a Treasury bond, because it gains when interest rates rise.",
          "A short interest rate forward, because the short position gains when the reference rate rises.",
        ],
        0,
        "L'entreprise perd si les taux montent, puisqu'elle empruntera plus cher. Il lui faut une position qui gagne quand les taux montent : le long d'un forward de taux (sur le MRR) touche la différence entre le taux de référence constaté et le taux du contrat. A est donc correct. B est faux : une hausse des taux fait baisser le prix d'une obligation, donc le long d'un forward sur obligation perd ; c'est le piège taux vs prix de l'obligation (il faudrait au contraire vendre le forward sur obligation). C est faux : le short d'un forward de taux gagne quand le taux baisse, ce qui ajouterait au risque de l'entreprise au lieu de le couvrir.",
      ],
      // Variante plus difficile — quelle couverture est inadaptée, sur plusieurs underlyings (indice, taux, soft commodity)
      [
        "Which of the following hedges is least appropriate?",
        [
          "A manager of a portfolio of U.S. large-cap stocks sells S&P 500 index forwards to reduce market risk.",
          "A bond portfolio manager concerned about rising interest rates takes a long position in an interest rate forward.",
          "A coffee roaster that must buy coffee beans in three months sells coffee futures to protect against a price increase.",
        ],
        2,
        "Règle de la fiche : « do in the futures market what you must do in the future ». Le torréfacteur devra acheter du café (une soft commodity) : il doit acheter des futures, qui gagnent si le prix monte. En vendant des futures, il perdrait deux fois en cas de hausse (café plus cher et perte sur les futures) : C est la couverture la moins appropriée. A est approprié : vendre des forwards sur S&P 500 réduit le risque de marché d'un portefeuille large caps US. B est approprié, et c'est le piège : quand les taux montent, les obligations perdent de la valeur mais le long d'un forward de taux gagne ; à ne pas confondre avec un long forward sur obligation, qui perdrait lui aussi.",
      ],

      // Concept 3 — Exchange-traded vs OTC : liquidité, standardisation et clearinghouse (officielle — R68 Q1)
      [
        "Which of the following statements regarding exchange-traded derivatives is least accurate? Exchange-traded derivatives:",
        ["are backed by a central clearinghouse.", "are illiquid.", "often trade in a physical location."],
        1,
        "Les dérivés cotés sont standardisés, ce qui les rend en général plus liquides que les dérivés OTC faits sur mesure. Dire qu'ils sont illiquides est donc l'affirmation la moins exacte : B. A est exact : une clearinghouse centrale se porte contrepartie et garantit les contrats. C est exact : ils se négocient souvent sur un exchange, lieu physique ou plateforme organisée.",
      ],
      // Variante angle différent — le « pourquoi » du choix de l'OTC (sur mesure) face à ses inconvénients
      [
        "Which of the following is the most likely reason for a company to use an OTC forward contract rather than an exchange-traded futures contract?",
        [
          "The terms can be tailored to match the exact amount and date of the company's exposure.",
          "The clearinghouse guarantee removes counterparty risk.",
          "Trades are more transparent and more closely regulated.",
        ],
        0,
        "Les contrats OTC sont négociés avec un dealer et faits sur mesure : taille, date d'échéance et modalités de livraison peuvent coller exactement à l'exposition à couvrir, alors qu'un futures est standardisé. A est donc correct. B est faux : c'est l'avantage des dérivés cotés ; un forward OTC sans compensation centrale expose au risque de contrepartie, sans collatéral imposé. C est faux : c'est aussi une caractéristique des dérivés cotés (trades connus de l'exchange et des régulateurs) ; l'OTC est peu transparent et largement non régulé. Le prix de la personnalisation : moins de liquidité et des coûts plus élevés.",
      ],
      // Variante plus difficile — central clearing mandate post-2008 : novation, CCP, transparence, risque concentré, contrats toujours sur mesure
      [
        "After the 2008 financial crisis, regulators required many OTC swaps to be cleared through a central counterparty (CCP). Which of the following statements about this central clearing mandate is least accurate?",
        [
          "Through novation, the CCP becomes the counterparty to each side of the swap, which reduces the counterparty risk each dealer faces.",
          "Cleared swaps must be reported, which increases transparency, but risk becomes concentrated in the CCP.",
          "Cleared swaps become standardized exchange-traded contracts, so their terms can no longer be customized.",
        ],
        2,
        "Le central clearing mandate ne transforme pas les swaps en contrats cotés : ils restent des contrats sur mesure (montant, dates, taux), mais leur compensation passe par une CCP et ils doivent être déclarés. C est donc l'affirmation la moins exacte. A est exact : par la novation, la CCP prend la position inverse de chaque côté et garantit les paiements, avec des appels de marge, ce qui réduit le risque de contrepartie entre dealers. B est exact : la déclaration accroît la transparence pour les régulateurs, mais le risque se concentre sur la CCP, dont la défaillance serait systémique.",
      ],

      // Concept 4 — Forward commitments vs contingent claims (officielle — R69 Q8)
      [
        "A financial instrument with a payoff that depends on a specified event occurring is most accurately described as:",
        ["a default swap.", "a contingent claim.", "an option."],
        1,
        "Un contingent claim est un contrat dont le payoff dépend de la survenance d'un événement donné. B est donc correct. A et C sont faux, non parce qu'ils ne sont pas des contingent claims (le CDS et l'option en sont), mais parce que ce sont des exemples : aucun des deux termes ne décrit l'ensemble des contingent claims. À l'inverse, forwards, futures et la plupart des swaps sont des forward commitments, obligatoires pour les deux parties.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai : un futures n'est pas un contingent claim
      [
        "Which of the following statements about forward commitments and contingent claims is least accurate?",
        [
          "The buyer of a contingent claim pays a premium at initiation, whereas a forward commitment typically has zero value at initiation.",
          "A futures contract is a contingent claim, because the long position gains only if the price rises above the futures price.",
          "A plain vanilla interest rate swap is a forward commitment, while a credit default swap is a contingent claim.",
        ],
        1,
        "Un futures est un forward commitment : les deux parties sont obligées d'exécuter, quel que soit le prix ; le long gagne si le prix monte et perd s'il baisse, sans aucun droit de renoncer. Qu'il y ait un gain ou une perte selon le prix n'en fait pas un contingent claim, dont le payoff n'existe que si un événement survient (exercice d'une option, credit event d'un CDS). B est donc l'affirmation la moins exacte. A est exact : le contingent claim a une valeur positive dès le départ, payée par une premium, alors que le forward commitment est fixé pour valoir zéro. C est exact : un swap de taux est une série de forwards (obligation ferme des deux côtés), alors que le CDS ne paie que si un credit event se produit, comme une option.",
      ],
      // Variante plus difficile — swap = forward commitment : paiement netté obligatoire, MRR fixé en début de période, fréquence trimestrielle
      [
        "A company enters a plain vanilla interest rate swap with a notional principal of $10 million, paying a fixed rate of 2% and receiving 90-day SOFR, with quarterly payments (assume each quarter is one-fourth of a year). SOFR is set at the beginning of each period and paid at the end. SOFR is 1.6% at the beginning of the first quarter and 2.4% at the end of it. For the payment at the end of the first quarter, the company will:",
        ["pay a net $10,000.", "receive a net $10,000.", "pay a net $40,000."],
        0,
        "Le MRR est fixé en début de période et payé en fin : le premier paiement dépend donc du SOFR de 1,6 %, connu dès l'initiation. Jambe fixe : 10 M × 2 % / 4 = 50 000 $ ; jambe flottante : 10 M × 1,6 % / 4 = 40 000 $. Les paiements sont nettés : le payeur fixe verse seulement 10 000 $. A est donc correct. B est faux : il utilise le SOFR de fin de trimestre (2,4 %, soit 60 000 $), qui ne servira qu'au paiement suivant. C est faux : 40 000 $ = 10 M × 0,4 % oublie de diviser par 4 pour un paiement trimestriel. Le swap est un forward commitment : la société doit payer ce différentiel même s'il lui est défavorable, et le notional de 10 M$ n'est jamais échangé.",
      ],

      // Concept 5 — Futures : settlement price, marge et mark-to-market (officielle — R69 Q6)
      [
        "The settlement price for a futures contract is:",
        [
          "the price of the last trade of a futures contract at the end of the trading day.",
          "the price of the asset in the future for all trades made in the same day.",
          "an average of the trade prices over a period at the end of a trading session.",
        ],
        2,
        "Le settlement price est la moyenne des prix des transactions sur une courte période de clôture fixée par l'exchange, en fin de séance ; c'est sur ce prix que les gains et pertes du jour sont crédités ou débités sur les comptes de marge (mark-to-market). C est donc correct. A est faux : ce n'est pas le prix du dernier trade de la journée. B est faux : le settlement price est un prix de fin de séance du contrat, pas un prix futur de l'actif.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai : la marge des futures n'est pas un prêt
      [
        "Which of the following statements about margin in futures markets is least accurate?",
        [
          "Futures margin is a loan from the broker, on which the trader pays interest, as in a stock margin account.",
          "Both the buyer and the seller of a futures contract must post margin.",
          "Daily gains and losses are credited to or debited from margin accounts based on the settlement price.",
        ],
        0,
        "La marge des futures n'est pas un prêt : c'est un collatéral (dépôt de garantie) versé par les deux parties, sans emprunt ni intérêts à payer. A est donc l'affirmation la moins exacte : elle confond avec un compte actions sur marge, où l'investisseur emprunte une partie du prix d'achat. B est exact : acheteur et vendeur déposent l'initial margin, car chacun peut perdre. C est exact : c'est le mark-to-market quotidien, calculé au settlement price (moyenne des prix des trades de fin de séance) ; c'est lui qui limite le risque de contrepartie supporté par la clearinghouse.",
      ],
      // Variante plus difficile — margin call d'un short sur deux contrats et deux jours (sens du gain, seuil de maintenance, retour à l'initial margin)
      [
        "A trader sells two gold futures contracts, each for 100 ounces, at $1,950 per ounce. The initial margin is $5,000 per contract and the maintenance margin is $4,700 per contract. The settlement prices at the end of the next two days are $1,952.00 and $1,954.50. The total deposit the trader must make at the end of Day 2 is closest to:",
        ["$0.", "$300.", "$900."],
        2,
        "Le trader est short : il perd quand le prix monte. Par contrat : jour 1, perte (1 952 − 1 950) × 100 = 200 $, solde 4 800 $, au-dessus de la maintenance margin (4 700 $) : pas d'appel. Jour 2, perte (1 954,50 − 1 952) × 100 = 250 $, solde 4 550 $ < 4 700 $ : margin call. Il faut revenir à l'initial margin : 5 000 − 4 550 = 450 $ par contrat, soit 900 $ pour deux contrats. C est donc correct. B est faux : 300 $ = 2 × (4 700 − 4 550) ne remonte le compte qu'à la maintenance margin, règle d'un compte actions sur marge et non des futures. A est faux : il suppose que le short gagne quand le prix monte, alors que c'est le long qui gagnerait. Autre piège : 450 $ ne compte qu'un seul contrat.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Derivatives Page 1...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
