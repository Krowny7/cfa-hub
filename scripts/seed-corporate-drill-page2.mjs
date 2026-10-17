// Seed script — quiz de "drill" associé à la page 2 de la fiche PDF Corporate
// Issuers (Corporate Governance · Working Capital & Liquidity, Readings 22 et
// 23 de la fiche = Readings 24 et 25 de la banque de pratique). Structure :
// pour chacun des 5 concepts clés de la page, 1 question officielle (banque
// de pratique Practise Exams/Corporate Issuers, Readings 24 et 25, bonne
// réponse vérifiée sur le corrigé officiel) + 1 variante "angle différent"
// (même notion, mais jamais un simple changement de chiffres menant au même
// raisonnement) + 1 variante "plus difficile" (raisonnement à plusieurs
// étapes / pièges combinés / notion connexe de la page). Voir memory
// regle-drill-variantes-cfa-hub. Questions en anglais, explications en
// français.
// Les 5 questions officielles ne sont PAS celles imprimées dans le PDF
// (R24 Q3 et Q4, R25 Q6, Q7 et Q8) : l'utilisateur les a déjà sur papier.
// La politique de working capital (conservative / aggressive / moderate) est
// marquée « non testé » sur la fiche : elle n'est pas retenue comme concept.
// Usage: node scripts/seed-corporate-drill-page2.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Corporate Issuers (Système)";

const QUIZ_SETS = [
  {
    title: "Corporate Issuers — Drill Fiche Page 2 (Corporate Governance · Working Capital & Liquidity)",
    difficulty: 1,
    questions: [
      // Concept 1 — Gouvernance faible vs efficace, conflits d'agence et entre groupes (officielle — R24 Q2)
      [
        "Risks that may arise from ineffective corporate governance least likely include:",
        ["reduced default risk.", "less effective decision making.", "weaker financial performance."],
        0,
        "Une gouvernance inefficace laisse les conflits d'agence sans contrôle : fraude, transactions avec des parties liées, projets mal choisis, risque juridique et de réputation. Tout cela AUGMENTE le risque de défaut (et donc le coût de la dette) : une baisse du risque de défaut (A) est l'effet le moins probable, c'est même l'effet d'une gouvernance EFFICACE. B est un vrai risque : sans contre-pouvoir, les décisions servent les managers ou un groupe particulier plutôt que l'entreprise. C est aussi un vrai risque : des décisions moins bonnes et des coûts d'agence plus élevés dégradent la performance financière et la valeur.",
      ],
      // Variante angle différent — le « pourquoi » : par quel mécanisme une bonne gouvernance réduit le coût de la dette
      [
        "Which of the following best explains why effective corporate governance tends to lower a company's cost of debt?",
        [
          "Once managers act in shareholders' best interests, shareholders and creditors have identical interests, so lenders no longer need any protection.",
          "Effective governance eliminates agency costs entirely, so the company no longer needs to accept bond covenants.",
          "Stronger oversight reduces the risk of fraud, value-destroying projects, and actions that shift risk onto creditors, so lenders require a smaller risk premium.",
        ],
        2,
        "Le coût de la dette reflète le risque perçu par les prêteurs. Une bonne gouvernance (board indépendant, comités, contrôles, transparence) limite la fraude, les projets qui détruisent de la valeur et les décisions qui transfèrent du risque vers les créanciers : le risque de défaut baisse, donc la prime exigée aussi (C). A est faux : même des managers parfaitement alignés sur les actionnaires laissent subsister le conflit actionnaires / créanciers, car l'equity profite d'un risque plus élevé (gains illimités, pertes limitées) alors que le créancier n'en supporte que le coût. B est faux : la gouvernance réduit les coûts d'agence, elle ne les supprime jamais, et les covenants restent l'outil de protection propre aux créanciers.",
      ],
      // Variante plus difficile — dual-class, défenses anti-OPA et dividende financé par dette (pièges combinés)
      [
        "A company has two share classes. The founding family's Class B shares carry 10 votes each, giving the family 60% of the votes but only 15% of the economic interest. The board, a majority of whose members are inside directors, has adopted a staggered board and a poison pill. The company now plans to issue new debt to pay a large special dividend. Which statement is most accurate?",
        [
          "The dual-class structure creates a conflict between controlling and minority shareholders; the takeover defenses make it easier for an activist to replace the board through a proxy contest; the dividend transfers value from existing long-term bondholders to shareholders.",
          "The dual-class structure creates a conflict between controlling and minority shareholders; the takeover defenses tend to entrench the board and management; the dividend transfers value from existing long-term bondholders to shareholders.",
          "The dual-class structure creates a conflict between controlling and minority shareholders; the takeover defenses tend to entrench the board and management; the dividend mainly harms short-term lenders, because long-term bondholders have more time for the company to recover.",
        ],
        1,
        "Trois points à vérifier. (1) Dual-class : la famille contrôle 60 % des votes avec 15 % des droits économiques ; elle supporte peu des conséquences financières de ses décisions mais les impose : conflit contrôlants / minoritaires (exact dans les trois choix). (2) Staggered board et poison pill sont des défenses anti-OPA : elles rendent plus difficile le remplacement du board ou une prise de contrôle hostile, donc protègent les dirigeants en place (entrenchment), d'autant plus avec un board majoritairement composé d'inside directors, qui peuvent favoriser les managers. A dit l'inverse : ces défenses gênent les activistes (proxy contest, tender offer), elles ne les aident pas. (3) Un dividende financé par une nouvelle dette fait sortir du cash vers les actionnaires et augmente le levier et le risque supporté par les créanciers existants : transfert de valeur des créanciers vers les actionnaires, et ce conflit est plus fort pour la dette LONG TERME, exposée plus longtemps au risque accru. C inverse ce point : un prêteur à court terme est remboursé bientôt, c'est le porteur d'obligations longues qui subit le plus la hausse du risque. B est donc le seul choix exact sur les trois points.",
      ],

      // Concept 2 — Comités du board et mécanismes de contrôle des managers (officielle — R24 Q1)
      [
        "Smith Company's board of directors assigns responsibilities to several committees. The committee that is most likely to be responsible for establishing the chief executive officer's compensation package is Smith's:",
        ["remuneration committee.", "risk committee.", "governance committee."],
        0,
        "La rémunération des dirigeants (dont le CEO) relève du remuneration (ou compensation) committee, composé d'administrateurs indépendants (A). B est faux : le risk committee, surtout présent dans les institutions financières, fixe l'appétit pour le risque et supervise la gestion des risques. C est faux : le governance (nominating) committee s'occupe du code de gouvernance, de la sélection des candidats au board et des conflits d'intérêts, pas de la paie des dirigeants.",
      ],
      // Variante angle différent — partir d'un problème d'agence et remonter au comité qui en traite la cause
      [
        "A CEO's annual bonus is based mainly on the growth of the company's total assets. Over three years, she has led several acquisitions that earned less than their cost of capital. Which board committee is best placed to address the root cause of this behavior, and which agency problem does the behavior illustrate?",
        [
          "The audit committee; entrenchment.",
          "The nominating committee; insufficient effort.",
          "The compensation committee; empire building.",
        ],
        2,
        "On part du symptôme pour remonter à la cause. Des acquisitions qui rapportent moins que leur coût du capital détruisent de la valeur, mais elles font grossir l'entreprise, donc le bonus du CEO (indexé sur la taille du bilan) : c'est l'empire building, conflit d'agence où la paie liée à la taille pousse aux acquisitions. La cause est la structure de la rémunération, que fixe le compensation committee : il doit relier le bonus à la création de valeur (rendement du capital, cours de l'action) plutôt qu'à la taille (C). A est faux : l'audit committee surveille le reporting financier, les contrôles et l'auditeur externe, pas les incitations ; et l'entrenchment désigne un dirigeant qui se rend indispensable pour garder son poste (projets qui exigent son savoir-faire, résistance aux OPA). B est faux : le nominating committee recrute les administrateurs, et l'insufficient effort (manque d'effort, mauvaise évaluation des projets) ne décrit pas un CEO qui multiplie les acquisitions.",
      ],
      // Variante plus difficile — repérer la faiblesse dans une composition de board (comité sectoriel normal, piège de l'expertise)
      [
        "An insurance company's board has the following committees: (1) an audit committee of four independent directors, one of whom is a former CFO of another company with accounting expertise; (2) an investment committee that oversees the company's investment portfolio; (3) a nominating committee that maintains the governance code and screens board candidates for conflicts of interest; (4) a compensation committee of three directors, two of whom are current executives of the company. Which of the following is most likely a weakness in the company's governance?",
        [
          "The audit committee, because it should include the company's own CFO, who knows the financial statements best.",
          "The compensation committee, because executives sitting on it can influence their own pay, whereas this committee should consist of independent directors.",
          "The investment committee, because board committees should be limited to audit, nominating, and compensation.",
        ],
        1,
        "On contrôle chaque comité contre la bonne pratique. (1) Audit : 100 % indépendants et au moins un expert comptable : c'est exactement le cas ici, aucune faiblesse. A est le piège : y mettre le CFO de la société reviendrait à faire contrôler le reporting par celui qui le produit, ce qui supprime l'indépendance. (3) Nominating / governance : code de gouvernance, candidats, conflits d'intérêts : rôle normal. (2) Investment committee : dans l'assurance, le portefeuille de placements est central, un comité dédié est normal (de même qu'un risk committee dans une banque) ; C est faux, la liste des comités dépend du secteur. (4) Compensation : deux membres sur trois sont des dirigeants en poste (inside directors), ils participent donc à fixer leur propre rémunération, conflit d'intérêts direct ; ce comité doit être indépendant (B).",
      ],

      // Concept 3 — Cash conversion cycle : formule et lecture (officielle — R25 Q12)
      [
        "Which of the following most accurately represents the cash conversion cycle?",
        [
          "Average days of receivables + average days of inventory + average days of payables.",
          "Average days of payables + average days of inventory − average days of receivables.",
          "Average days of receivables + average days of inventory − average days of payables.",
        ],
        2,
        "CCC = DOH + DSO − DPO : le nombre de jours de stock plus le délai d'encaissement des clients donne le cycle d'exploitation, dont on retire le délai de paiement des fournisseurs, puisque pendant ce temps ce sont eux qui financent l'entreprise. Le CCC mesure donc le temps pendant lequel le cash est immobilisé entre le paiement des fournisseurs et l'encaissement des ventes (C). A additionne les jours fournisseurs : or un crédit fournisseur plus long RACCOURCIT le cycle, il doit être soustrait. B inverse créances et dettes : ce sont les jours de créances clients qui allongent le cycle, et les jours fournisseurs qui le réduisent.",
      ],
      // Variante angle différent — calcul inversé : quel DPO faut-il pour atteindre un CCC cible (piège proportionnel)
      [
        "A company has days of inventory on hand of 48 days, days sales outstanding of 32 days, and days payable outstanding of 30 days. Management wants to cut the cash conversion cycle to 35 days only by negotiating longer payment terms with suppliers. The days payable outstanding required is closest to:",
        ["45 days.", "15 days.", "39 days."],
        0,
        "CCC actuel = 48 + 32 − 30 = 50 jours. Avec DOH et DSO inchangés, la cible impose 48 + 32 − DPO = 35, soit DPO = 80 − 35 = 45 jours : il faut 15 jours de crédit fournisseur en plus, et chaque jour de DPO gagné retire un jour au CCC (A). B se trompe de sens : réduire le DPO de 15 jours (30 − 15 = 15) ALLONGERAIT le CCC à 65 jours. C applique un raisonnement proportionnel : le CCC baisse de 30 % (50 à 35), donc on augmente le DPO de 30 % (30 x 1,3 = 39) ; or la relation est additive, pas proportionnelle : avec 39 jours, CCC = 80 − 39 = 41 jours, au-dessus de la cible.",
      ],
      // Variante plus difficile — CCC calculé à partir des états financiers (bons dénominateurs) puis comparé aux pairs, donnée-piège
      [
        "A company reports the following for the year ($ millions): revenue 912.5; cost of goods sold 547.5; purchases 584.0; average accounts receivable 100.0; average inventory 90.0; average accounts payable 48.0; cash 35.0. Days payable are based on purchases. The industry average cash conversion cycle is 55 days. The company's cash conversion cycle and the most appropriate interpretation are:",
        [
          "56.8 days; roughly in line with peers, so its investment in working capital appears appropriate.",
          "70.0 days; about 15 days longer than peers, suggesting excessive investment in working capital.",
          "130.0 days; far longer than peers, suggesting excessive investment in working capital.",
        ],
        1,
        "Chaque délai a son propre dénominateur. DSO = créances / (CA / 365) = 100 / (912,5 / 365) = 100 / 2,5 = 40 jours. DOH = stocks / (COGS / 365) = 90 / (547,5 / 365) = 90 / 1,5 = 60 jours. DPO = fournisseurs / (achats / 365) = 48 / (584 / 365) = 48 / 1,6 = 30 jours. CCC = 60 + 40 − 30 = 70 jours, soit 15 jours de plus que la moyenne du secteur (55) : l'entreprise immobilise plus de capital dans son cycle d'exploitation que ses pairs, signe d'un investissement excessif en working capital (B). A divise tout par le chiffre d'affaires : DOH = 90 / 2,5 = 36 et DPO = 48 / 2,5 = 19,2, d'où 36 + 40 − 19,2 = 56,8 jours, ce qui masque l'écart avec les pairs. C ajoute le DPO au lieu de le retrancher : 60 + 40 + 30 = 130. Le cash (35) est la donnée-piège : il n'entre pas dans le CCC.",
      ],

      // Concept 4 — Ce qui fait bouger le CCC, CCC négatif et coût du crédit fournisseur (officielle — R25 Q4)
      [
        "If the days of inventory on hand, days sales outstanding, and days payable outstanding all doubled, a positive cash conversion cycle (CCC) would:",
        ["increase by a factor of less than 2.", "double.", "remain unchanged."],
        1,
        "CCC = DOH + DSO − DPO est une combinaison linéaire de ses trois composantes : si chacune est multipliée par 2, le résultat l'est aussi, 2 x DOH + 2 x DSO − 2 x DPO = 2 x CCC (B). Exemple : 40 + 30 − 20 = 50 jours devient 80 + 60 − 40 = 100 jours. A croit que la hausse du DPO amortit l'effet, mais elle est elle-même doublée, exactement comme le reste. C croit que le DPO compense la hausse des deux autres : ce n'est vrai que si le CCC vaut 0 au départ. Le doublement vaut d'ailleurs pour tout CCC non nul, même négatif.",
      ],
      // Variante angle différent — cas limite : CCC négatif (paiement à la commande), lecture du signe
      [
        "An online retailer collects payment from customers when they place their orders, holds inventory for an average of 20 days, and pays its suppliers after 45 days. Which of the following statements is most accurate?",
        [
          "Its cash conversion cycle is 65 days, so it must finance a long operating cycle with short-term borrowing.",
          "Its cash conversion cycle is 25 days, because the 45 days of supplier credit more than offset the 20 days of inventory.",
          "Its cash conversion cycle is −25 days, meaning its suppliers effectively finance its inventory and its working capital releases cash as sales grow.",
        ],
        2,
        "Les clients paient à la commande : DSO = 0. CCC = DOH + DSO − DPO = 20 + 0 − 45 = −25 jours. Un CCC négatif est possible dès que DPO > DOH + DSO : l'entreprise encaisse ses ventes 25 jours avant de payer les fournisseurs des marchandises vendues, ce sont donc eux qui financent son stock, et chaque hausse des ventes fait entrer plus de cash qu'elle n'en immobilise (C). A additionne le DPO (20 + 45) au lieu de le retrancher. B fait la bonne soustraction mais se trompe de signe : quand le crédit fournisseur dépasse le cycle d'exploitation, le CCC est négatif, pas positif ; un CCC de +25 jours voudrait dire que le cash reste immobilisé 25 jours. À comparer avec des entreprises du même secteur : ce profil est typique de la distribution en ligne, pas d'un industriel.",
      ],
      // Variante plus difficile — coût de renoncer à l'escompte (formule de la fiche) puis effet sur le CCC, donnée-piège
      [
        "A company buys $500,000 of materials per month on terms of 2/10 net 40 and currently pays on day 40. It could instead pay on day 10, taking the discount and financing the earlier payment with a bank loan at 12% a year. Which statement is most accurate?",
        [
          "Taking the discount is cheaper, because forgoing it costs about 27.9% a year versus 12% for the bank loan, even though the cash conversion cycle lengthens by 30 days.",
          "Keeping the current policy is cheaper, because the 2% discount is smaller than the 12% bank rate, and paying on day 40 keeps the cash conversion cycle 30 days shorter.",
          "Taking the discount is cheaper, because forgoing it costs about 27.9% a year versus 12% for the bank loan, and the cash conversion cycle also shortens by 30 days.",
        ],
        0,
        "Étape 1, coût de renoncer à l'escompte a/b net c avec a = 2 %, b = 10, c = 40 : (1 + a / (1 − a))^(365 / (c − b)) − 1 = (1 + 0,02 / 0,98)^(365 / 30) − 1 = 1,020408^12,167 − 1 ≈ 27,9 %. Payer au jour 40 revient à emprunter au fournisseur pendant 30 jours à 27,9 % par an ; la banque prête à 12 % : prendre l'escompte et s'endetter auprès de la banque est moins cher. Étape 2, effet sur le cycle : payer au jour 10 au lieu du jour 40 réduit le DPO de 30 jours, donc le CCC AUGMENTE de 30 jours (on immobilise plus de cash), mais ce cash supplémentaire est financé moins cher (A). B compare un taux sur 30 jours (2 %) à un taux annuel (12 %) : il faut annualiser avant de comparer. C se trompe sur le sens : un DPO plus court allonge le CCC. Les 500 000 $ par mois ne changent pas la décision, qui se joue sur les taux (ils donnent seulement l'ampleur de l'économie : 2 % x 500 000 = 10 000 $ d'escompte par mois).",
      ],

      // Concept 5 — Liquidité : drag et pull, sources primaires et secondaires, ratios (officielle — R25 Q9)
      [
        "A company's cash conversion cycle (CCC) has been gradually increasing over the last three years. Which of the following factors would best explain this change?",
        [
          "The company is turning over inventory faster.",
          "The company's trade creditors have tightened their credit conditions.",
          "The company is collecting its accounts receivable faster.",
        ],
        1,
        "Un CCC qui augmente traduit une utilisation moins efficace du working capital : stocks qui tournent moins vite (DOH en hausse), clients qui paient plus lentement (DSO en hausse) ou fournisseurs qui exigent d'être payés plus tôt (DPO en baisse). Des fournisseurs qui durcissent leurs conditions réduisent le DPO, donc allongent le CCC (B) : c'est un « pull » sur la liquidité, les décaissements arrivent plus tôt. A est faux : une rotation des stocks plus rapide réduit le DOH, donc le CCC. C est faux : encaisser plus vite réduit le DSO, donc le CCC.",
      ],
      // Variante angle différent — ce qui N'EST PAS vrai : sources primaires vs secondaires, drag vs pull
      [
        "Which of the following statements about a company's liquidity is least accurate?",
        [
          "Selling a division to raise cash is a primary source of liquidity, because it does not affect the company's normal operations.",
          "Customers taking longer to pay is a drag on liquidity, whereas suppliers shortening their credit terms is a pull on liquidity.",
          "Unused committed bank lines of credit are a primary source of liquidity.",
        ],
        0,
        "Les sources PRIMAIRES sont peu coûteuses et n'affectent pas l'activité : cash et titres de placement, lignes de crédit, trade credit, cash généré par l'exploitation (C est exact). Les sources SECONDAIRES sont coûteuses, modifient la structure ou l'activité de l'entreprise et envoient un signal négatif : couper le dividende, vendre des actifs, émettre des actions, renégocier la dette. Vendre une division est donc une source secondaire, qui change justement l'activité : A est l'énoncé le moins exact. B est exact : le drag ralentit les ENCAISSEMENTS (clients qui paient plus lentement, stocks en excès, mauvaises créances), le pull accélère les DÉCAISSEMENTS (fournisseurs qui réduisent leur crédit, paiement anticipé) ; clients = drag, fournisseurs = pull.",
      ],
      // Variante plus difficile — quick et cash ratios : part de l'emprunt à moins d'un an, stocks exclus, ligne de crédit à écarter
      [
        "A company reports the following ($ millions): cash 40; short-term marketable securities 20; accounts receivable 60; inventory 80; accounts payable 70; accrued expenses 20; bank loan 150, of which 30 is due within the next 12 months. The company also has an unused committed line of credit of 50. Its quick ratio and cash ratio are closest to:",
        ["1.00 and 0.50.", "1.33 and 0.67.", "1.42 and 0.92."],
        0,
        "Étape 1, passifs courants : seule la part de l'emprunt exigible dans l'année y figure, soit 70 + 20 + 30 = 120 (les 120 restants sont non courants). Étape 2, quick ratio = (cash + titres + créances) / passifs courants = (40 + 20 + 60) / 120 = 1,00 : les stocks (80) sont exclus, car ils ne sont pas forcément liquides. Étape 3, cash ratio = (cash + titres) / passifs courants = 60 / 120 = 0,50 (A). B oublie la part à moins d'un an de l'emprunt : 120 / 90 = 1,33 et 60 / 90 = 0,67. C ajoute la ligne de crédit non utilisée aux actifs liquides : (120 + 50) / 120 = 1,42 et (60 + 50) / 120 = 0,92 ; c'est bien une source primaire de liquidité, mais pas un actif du bilan, elle n'entre pas dans les ratios.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Corporate Issuers Page 2...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
