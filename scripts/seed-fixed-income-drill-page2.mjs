// Seed script — quiz de "drill" associé à la page 2 de la fiche PDF Fixed
// Income (Issuance, Trading & Funding Markets). Le contenu d'origine de ce
// drill avait été fourni par l'utilisateur ; il a été remis au cadre FSA /
// Equity à sa demande le 3 octobre 2026. Structure : pour chacun des 5
// concepts clés de la page, 1 question officielle
// (banque de pratique CFA, Fixed Income Readings 50, 51, 52, 53 et 63,
// corrigé vérifié contre le PDF "- Answers.pdf" correspondant) + 1 variante
// "angle différent" (même notion, mais jamais un simple changement de
// chiffres menant au même raisonnement) + 1 variante "plus difficile"
// (raisonnement à plusieurs étapes / pièges combinés). Voir memory
// regle-drill-variantes-cfa-hub. Questions en anglais, explications en
// français. Les QCM déjà imprimés sur la fiche ne sont pas repris.
// Les questions officielles sont recopiées à l'identique : syncQuizSets
// retrouve l'historique de réponses en comparant le texte exact de l'énoncé.
// Ramené à 5 concepts (15 questions) le 5 octobre 2026, à la demande de
// l'utilisateur : concepts d'origine 1, 5, 8 retirés de la fiche, leurs
// questions rangées dans « Réserve — <titre> » (syncQuizSets, rien d'effacé).
// Usage: node scripts/seed-fixed-income-drill-page2.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Fixed Income (Système)";

const QUIZ_SETS = [
  {
    title: "Fixed Income — Drill Fiche Page 2 (Issuance, Trading & Funding Markets)",
    difficulty: 2,
    questions: [
      // Concept 1 — Émission sur le marché primaire : private placement, debut issuer, underwritten, reopening (officielle, Reading 51)
      [
        "Ridgeland Company wishes to issue its first bond, which will only be available to high-net-worth investors. The underwriter used by Ridgeland has guaranteed the bond issue price. Which of the following best describes this bond issuance?",
        ["A public offering, underwritten offering.", "A shelf registration, best-efforts offering.", "A private placement, debut issuer."],
        2,
        "Trois indices dans l'énoncé. (1) L'émission est réservée à des investisseurs fortunés → placement privé (vendu à un groupe restreint d'investisseurs, comme le dit la fiche), pas une offre au public. (2) C'est la toute première obligation de Ridgeland → debut issuer. (3) L'underwriter garantit le prix → underwritten offering (et non best-efforts). A est faux, car une offre réservée à certains investisseurs n'est pas une offre publique. B est faux deux fois : rien n'indique une émission étalée dans le temps (shelf registration), et le prix étant garanti, ce n'est pas un best-efforts offering.",
      ],
      // Variante angle différent — le « pourquoi » d'un reopening
      [
        "Instead of issuing a new bond, a government sells additional bonds of an existing issue with the same coupon rate and maturity date as the bonds already outstanding. The main reason for using such a reopening (tap) is most likely that:",
        [
          "the new bonds are identical to the outstanding ones, which increases the size and secondary-market liquidity of the existing issue.",
          "it allows the issuer to reset the coupon rate of the whole issue to current market yields.",
          "the new bonds can be sold only to a small group of qualified investors, which avoids registration requirements.",
        ],
        0,
        "Un reopening augmente la taille d'une émission existante (définition de la fiche) : les nouveaux titres sont fongibles avec les anciens (même coupon, même échéance), ce qui crée une ligne plus grosse et plus liquide sur le marché secondaire, très utile pour les emprunts de référence des États. B est faux : le coupon reste celui de l'émission d'origine ; c'est le PRIX de vente des nouveaux titres qui s'ajuste au rendement du marché. C décrit un private placement, qui est une autre technique d'émission.",
      ],
      // Variante plus difficile — reopening + valorisation : mêmes caractéristiques, prix de marché (lien CR vs MDR de la page 1)
      [
        "A government issued a 5% annual-coupon bond several years ago; the bond now has exactly 4 years to maturity. The government reopens this issue at a time when the market yield on 4-year government bonds is 4%. The additional bonds will most likely be sold with a:",
        [
          "4% coupon and a price of 100.00 per 100 of par.",
          "5% coupon and a price of about 103.63 per 100 of par.",
          "5% coupon and a price of about 96.45 per 100 of par.",
        ],
        1,
        "Les titres ajoutés lors d'un reopening ont exactement les caractéristiques de ceux en circulation : coupon de 5 % et même échéance. Ils se vendent donc au prix de marché de la ligne existante : N = 4, I/Y = 4, PMT = 5, FV = 100 → PV ≈ 103,63. Coupon de 5 % > rendement de marché de 4 % (CR > MDR) → prime. A traite l'opération comme une nouvelle émission au pair, avec un coupon égal au rendement du marché : ce serait une ligne différente, non fongible. C inverse coupon et rendement (un coupon de 4 % actualisé à 5 % donne 96,45), ce qui conduit à tort à une décote.",
      ],

      // Concept 2 — Commercial paper, ABCP et lignes de crédit (officielle, Reading 50)
      [
        "To reduce the cost of long-term borrowing, a corporation with a below average credit rating could:",
        ["decrease credit enhancement.", "issue commercial paper.", "issue securitized bonds."],
        2,
        "Le commercial paper est réservé aux entreprises les mieux notées : B est donc hors de portée d'un émetteur mal noté (et ce serait de toute façon un financement court terme). La titrisation permet en revanche d'emprunter moins cher : les actifs sont cédés à une entité ad hoc (SPE) isolée de la faillite de l'entreprise, et les titres émis sont notés sur la qualité de ces actifs, souvent mieux que l'entreprise elle-même. C'est la même logique que l'ABCP, sa version court terme. A ferait l'inverse : réduire le rehaussement de crédit augmente le risque pour l'investisseur, donc le coût de l'emprunt.",
      ],
      // Variante angle différent — l'avantage de l'ABCP pour le vendeur des créances (recevoir du cash)
      [
        "A manufacturer sells $200 million of its trade receivables to a bank-sponsored conduit, which finances the purchase by issuing asset-backed commercial paper (ABCP). The main benefit to the manufacturer is that it:",
        [
          "obtains long-term, fixed-rate funding that never needs to be refinanced.",
          "receives cash now instead of waiting for its customers to pay, at a funding cost that reflects the quality of the receivables.",
          "becomes the issuer of the ABCP, so the funding cost is set by its own credit rating.",
        ],
        1,
        "L'avantage indiqué sur la fiche : recevoir du cash. Le fabricant transforme des créances clients, qui ne seraient encaissées que dans quelques semaines ou mois, en liquidités immédiates. C'est le conduit (une entité ad hoc sponsorisée par une banque) qui émet l'ABCP : son coût dépend de la qualité du pool de créances et du soutien de la banque, pas de la note du fabricant, donc C est faux. A est faux : l'ABCP est du papier COURT terme (moins d'un an) que le conduit doit renouveler (roll over) en permanence.",
      ],
      // Variante plus difficile — risque de rollover du commercial paper : ligne de crédit confirmée vs non confirmée, avec calcul du coût
      [
        "A company funds its working capital by continuously rolling over 90-day commercial paper. To protect itself if it cannot roll over its paper, it is choosing between a $100 million committed line of credit with a commitment fee of 0.25% per year on the undrawn amount, and an uncommitted line of credit of the same size with no fee. If the line is never drawn during the year, which statement is most accurate?",
        [
          "The committed line costs $250,000 for the year, but unlike the uncommitted line, the bank is obliged to lend even if the commercial paper market dries up.",
          "Both lines oblige the bank to lend if the commercial paper market dries up; the committed line is simply more expensive by $250,000.",
          "The uncommitted line offers better protection, because the bank ties up less capital and can therefore lend more readily in a crisis.",
        ],
        0,
        "Coût de la ligne confirmée non tirée : 0,25 % × 100 000 000 = 250 000 $ par an. Ce coût achète un engagement formel : la banque doit prêter quand l'entreprise le demande, précisément le jour où le marché du commercial paper se ferme (risque de rollover). La banque immobilise du capital pour cet engagement, d'où la commission (commitment fee). B est faux : une ligne non confirmée (uncommitted) n'engage pas la banque, qui peut refuser de prêter au pire moment. C inverse la logique : si la banque immobilise moins de capital, c'est justement parce qu'elle ne s'engage à rien.",
      ],

      // Concept 3 — Repo : repo rate, repo margin et qualité du collatéral (officielle, Reading 52)
      [
        "Which of the following statements regarding repurchase agreements is most accurate?",
        [
          "Greater demand for the underlying security results in a lower repo margin.",
          "Higher credit rating of the underlying collateral results in a higher repo rate.",
          "Lower credit rating of the underlying collateral results in a lower repo margin.",
        ],
        0,
        "Le repo margin (haircut) est l'écart, en %, entre la valeur de marché du collatéral et le montant prêté. Plus le collatéral est recherché, moins le prêteur a besoin de se protéger : la marge baisse, d'où A. Le repo rate et le repo margin évoluent à l'inverse de la qualité de crédit du collatéral : un collatéral mieux noté donne un taux PLUS BAS (B est faux) et un collatéral moins bien noté une marge PLUS ÉLEVÉE (C est faux).",
      ],
      // Variante angle différent — calcul inversé : retrouver le repo rate à partir du prix de rachat
      [
        "A dealer sells bonds for $5,000,000 and agrees to repurchase them in 45 days for $5,023,125. Using a 360-day year, the repo rate is closest to:",
        ["0.46%.", "3.70%.", "3.75%."],
        1,
        "On inverse la formule de la fiche : repurchase price = principal × [1 + (repo rate × jours/360)]. Intérêt = 5 023 125 − 5 000 000 = 23 125 $, soit 0,4625 % sur 45 jours. Repo rate = 0,4625 % × 360/45 = 3,70 %. A (0,46 %) est le taux de la période, non annualisé. C (3,75 %) annualise sur 365 jours alors que la convention du repo est ici de 360 jours.",
      ],
      // Variante plus difficile — haircut + prix de rachat + effet de la qualité du collatéral
      [
        "A dealer pledges bonds with a market value of $10,200,000 in a 30-day repurchase agreement. The lender applies a repo margin of 2% and a repo rate of 4.80% (360-day year). Which of the following correctly states the repurchase price and the likely effect if the dealer instead pledged lower-rated bonds with the same market value?",
        [
          "$10,240,800; the repo rate and repo margin would both be higher.",
          "$10,035,984; the repo rate and repo margin would both be lower.",
          "$10,035,984; the repo rate and repo margin would both be higher.",
        ],
        2,
        "Étape 1 — Montant prêté : le haircut de 2 % s'applique à la valeur du collatéral → 10 200 000 × (1 − 0,02) = 9 996 000 $. Étape 2 — Repurchase price = 9 996 000 × [1 + 0,048 × 30/360] = 9 996 000 × 1,004 = 10 035 984 $. Étape 3 — Un collatéral moins bien noté augmente le risque du prêteur : repo rate ET repo margin plus élevés. A applique le taux à la valeur de marché du collatéral en oubliant le haircut (10 200 000 × 1,004 = 10 240 800 $). B a le bon montant mais inverse l'effet de la qualité du collatéral.",
      ],

      // Concept 4 — Émission souveraine : calendrier régulier et adjudications (officielle, Reading 53)
      [
        "The cutoff yield associated with a government bond issuance is best described as the yield of the successful competitive bid with the:",
        ["lowest price.", "highest price.", "median price."],
        0,
        "Les offres compétitives sont servies du rendement le plus faible (prix le plus élevé) vers les rendements plus élevés jusqu'à épuisement du montant : la dernière offre servie, celle au prix le plus BAS (rendement le plus élevé accepté), fixe le cutoff yield. Dans une adjudication à prix unique, tous les gagnants paient le prix correspondant à ce rendement. B désigne la PREMIÈRE offre compétitive servie, pas la dernière. C ne joue aucun rôle dans le mécanisme.",
      ],
      // Variante angle différent — le « pourquoi » du calendrier d'émission régulier et prévisible
      [
        "Sovereign issuers typically issue bonds across a range of maturities on a regular and predictable schedule. The main purpose of this practice is most likely to:",
        [
          "allow the government to time each issue to coincide with the lowest interest rates.",
          "reduce refinancing (rollover) and interest rate risk while building a liquid benchmark yield curve.",
          "allow the government to set coupon rates above market yields in order to attract investors.",
        ],
        1,
        "La fiche le résume : maturités variées, régulières et prévisibles → minimiser le risque de taux et de rollover. Étaler les échéances évite de devoir refinancer une grosse masse de dette au même moment, et un calendrier connu à l'avance attire une demande stable, ce qui crée une courbe de référence liquide pour tout le marché. A décrit l'inverse d'un calendrier prévisible (une émission opportuniste), et personne ne peut prévoir le point bas des taux. C n'a pas de sens économique : le coupon est fixé près du rendement de marché, et un coupon plus élevé ne ferait que vendre les titres plus cher (au-dessus du pair).",
      ],
      // Variante plus difficile — allocation complète d'une adjudication à prix unique (non compétitifs, cutoff, taux de service)
      [
        "A government auctions $10 billion of bonds in a single-price auction. Noncompetitive bids total $2 billion. Competitive bids are: $3 billion at 2.10%, $2 billion at 2.12%, $4 billion at 2.15%, and $3 billion at 2.18%. Which statement is most accurate?",
        [
          "The cutoff yield is 2.18%, and bids at 2.18% receive one-third of the amount bid.",
          "The cutoff yield is 2.12%, and bids at 2.12% receive half of the amount bid.",
          "The cutoff yield is 2.15%, and bids at 2.15% receive 75% of the amount bid.",
        ],
        2,
        "Étape 1 — Les offres non compétitives sont servies en premier : il reste 10 − 2 = 8 milliards pour les compétitifs. Étape 2 — On sert du rendement le plus bas au plus élevé : 2,10 % (3, cumul 3), 2,12 % (2, cumul 5), 2,15 % (4 demandés mais seulement 3 restants → servis à 3/4 = 75 %). Cutoff yield = 2,15 % ; les offres à 2,18 % ne sont pas servies. Dans une adjudication à prix unique, tous les gagnants, non compétitifs compris, reçoivent ce rendement de 2,15 %. A oublie de servir d'abord les non compétitifs : avec 10 milliards pour les compétitifs, 3 + 2 + 4 = 9, puis 1 milliard sur 3 à 2,18 %. B sert les offres en commençant par les rendements les plus ÉLEVÉS (2,18 % puis 2,15 %, cumul 7, puis 1 milliard sur 2 à 2,12 %) : l'erreur classique.",
      ],

      // Concept 5 — GO bond vs revenue bond (officielle, Reading 63)
      [
        "City council of a U.S. municipality has authorized the issuance of $100 million bonds to finance the construction of a toll road. This bond would most likely be characterized as a(n):",
        ["general obligation (GO) bond.", "revenue bond.", "agency bond."],
        1,
        "Une autoroute à péage génère ses propres recettes (les péages) : les obligations qui la financent sont remboursées par ces revenus du projet → revenue bond. A : un GO bond est remboursé par les recettes générales de la collectivité, c'est-à-dire ses impôts locaux, sans être adossé à un projet précis. C : un agency bond est émis par une agence ou une entité quasi-gouvernementale, pas directement par une municipalité.",
      ],
      // Variante angle différent — le « pourquoi » de l'écart de rendement entre revenue bonds et GO bonds
      [
        "Which of the following best explains why a municipality's revenue bonds typically offer higher yields than its general obligation (GO) bonds?",
        [
          "Revenue bonds are repaid only from the cash flows of the project they finance, whereas GO bonds are backed by the municipality's general taxing power.",
          "Revenue bonds are legally subordinated to all of the municipality's other debt.",
          "GO bonds are guaranteed by the national government, while revenue bonds are not.",
        ],
        0,
        "Un revenue bond n'a qu'une source de remboursement : les revenus du projet financé (péages, redevances d'eau, recettes d'un stade...). Si le projet rapporte moins que prévu, les porteurs n'ont aucun recours sur les impôts. Un GO bond est remboursé grâce au pouvoir fiscal général de la collectivité, une source plus large et plus stable. Plus de risque → rendement plus élevé. B est faux : l'écart ne tient pas à un rang de subordination, mais à la SOURCE de remboursement. C est faux : un GO bond municipal n'est pas garanti par l'État central ; il repose sur les impôts LOCAUX.",
      ],
      // Variante plus difficile — couverture du service de la dette d'un projet en difficulté : qui supporte la perte ?
      [
        "A city has two bonds outstanding: a general obligation (GO) bond and a revenue bond issued to build a convention center. The center was expected to generate net revenues of $18 million per year against annual debt service of $15 million on the revenue bond. Attendance then falls, and net revenues come in 40% below expectations, while the city's tax base is unaffected. Which statement is most accurate?",
        [
          "Debt service coverage falls to 0.80x, but the revenue bonds remain fully protected because both GO and revenue bonds are effectively funded by taxpayers.",
          "Debt service coverage falls to 0.72x, and the city must use its tax revenues to cover the shortfall, so the credit risk of both bonds rises equally.",
          "Debt service coverage falls to 0.72x; the revenue bondholders bear the shortfall risk, while the GO bondholders' claim on the city's taxing power is unaffected.",
        ],
        2,
        "Revenus nets réels = 18 × (1 − 0,40) = 10,8 M$ ; couverture = 10,8 / 15 = 0,72x : le projet ne couvre plus son service de la dette. Un revenue bond n'étant remboursé que par les revenus du projet, ce sont ses porteurs qui supportent le manque à gagner (risque de défaut accru, spread qui s'élargit). Le GO bond reste adossé aux impôts locaux, inchangés. A se trompe de calcul (retirer 40 % du service de la dette, 18 − 6 = 12 → 0,80x, au lieu de réduire les revenus de 40 %) et de principe : seuls les GO bonds sont financés par les contribuables. B suppose que la ville doit renflouer le projet avec ses impôts : un revenue bond n'a aucun recours sur le budget général.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Fixed Income Page 2...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
