// Seed script — quiz de "drill" pour la page 2 de la fiche PDF Fixed
// Income (Issuance, Trading & Funding Markets). 5 concepts x 3 variantes,
// rédigés pour tester les mêmes notions que le QCM déjà présent sur cette
// page (private placement, ABCP, repo overnight/term, allocation des
// enchères souveraines, obligations supranationales).
// Usage: node scripts/seed-fixed-income-drill-page2.mjs
import { getOwnerId, ensureFolder, seedQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Fixed Income (Système)";

const QUIZ_SETS = [
  {
    title: "Fixed Income — Drill Fiche Page 2 (Issuance, Trading & Funding Markets)",
    difficulty: 2,
    questions: [
      // Concept 1 — Private placement
      [
        "A private placement is best described as a bond issue that is:",
        [
          "offered to the general public via an underwriter and freely tradable afterward.",
          "sold directly to a small group of qualified investors, typically with more restrictive terms and less liquidity than a public issue.",
          "reopened to increase the size of an already outstanding public bond issue.",
        ],
        1,
        "Private placement = vendu à un groupe restreint d'investisseurs (souvent institutionnels), généralement peu ou pas souscrit par un syndicat bancaire, moins liquide, avec des covenants sur mesure. A décrit une émission publique. C décrit un reopening/tap.",
      ],
      [
        "Compared to a public bond offering, a private placement is most likely to feature:",
        [
          "greater liquidity in the secondary market.",
          "a broader base of retail investors.",
          "more flexible, negotiated terms tailored to a small number of investors.",
        ],
        2,
        "Les private placements sont négociés directement avec un petit groupe d'investisseurs (assureurs, fonds de pension...), permettant des covenants sur mesure ; ils sont moins liquides et ne sont pas destinés aux investisseurs particuliers.",
      ],
      [
        "Which of the following is most likely a defining characteristic of a private placement bond issue?",
        [
          "It is sold to a small number of investors, often with terms negotiated directly between issuer and buyers.",
          "It must be registered with securities regulators before trading in the secondary market.",
          "It is always reopened later to increase the total amount outstanding.",
        ],
        0,
        "Le trait déterminant d'un private placement est la vente à un nombre restreint d'investisseurs avec des termes négociés. B est faux (les private placements évitent généralement l'enregistrement réglementaire complet). C est faux (le reopening est un mécanisme distinct et non systématique).",
      ],
      // Concept 2 — ABCP
      [
        "Asset-backed commercial paper (ABCP) is most accurately described as commercial paper that is:",
        [
          "unsecured, backed only by the general credit of the issuing corporation.",
          "collateralized by a pool of financial assets, such as trade receivables, and typically has a maturity under one year.",
          "always convertible into equity of the sponsoring bank at the holder's option.",
        ],
        1,
        "L'ABCP est un papier court terme (généralement < 270 jours) adossé à un pool de créances (trade receivables, etc.), émis par un conduit sponsorisé par une banque — contrairement au commercial paper classique (non sécurisé, A). C est sans rapport (les convertibles sont une caractéristique distincte liée aux actions).",
      ],
      [
        "A key benefit that asset-backed commercial paper (ABCP) provides to the issuing conduit is:",
        [
          "permanent, long-term funding at a fixed rate with no rollover risk.",
          "a source of short-term cash by monetizing a pool of receivables before their maturity.",
          "elimination of all credit risk for the investor.",
        ],
        1,
        "L'ABCP permet au sponsor de lever du cash immédiatement contre un pool de créances (ex: trade ou credit card receivables) plutôt que d'attendre leur encaissement ; c'est du court terme et nécessite un rollover régulier (contrairement à A), et l'investisseur garde un risque de crédit/liquidité (contrairement à C).",
      ],
      [
        "Compared to conventional (unsecured) commercial paper, asset-backed commercial paper (ABCP) is most likely to be:",
        [
          "collateralized, which can allow issuance even by entities with weaker standalone credit.",
          "issued with maturities of 10 years or more.",
          "free of any need for periodic rollover, since the underlying receivables mature at a fixed date.",
        ],
        0,
        "Grâce à sa collatéralisation, l'ABCP permet à des conduits avec un crédit standalone plus faible de lever des fonds (parfois avec rehaussement de crédit additionnel). L'ABCP a des maturités courtes (bien inférieures à 10 ans, contrairement à B), et nécessite un rollover régulier puisque le papier arrive à échéance bien avant l'encaissement complet du pool de créances (contrairement à C).",
      ],
      // Concept 3 — Overnight vs term repo
      [
        "An investor enters into a repurchase agreement, lending $2,000,000 against bond collateral for 30 days at a repo rate of 4.5%. Assuming a 360-day year, the repurchase price at the end of the term is closest to:",
        ["$2,004,500.", "$2,007,500.", "$2,090,000."],
        1,
        "Repurchase price = Principal × [1 + (repo rate × jours/360)] = $2 000 000 × [1 + (0,045 × 30/360)] = $2 000 000 × 1,00375 = $2 007 500. A sous-estime les intérêts (mauvais calcul de la fraction de jours). C applique à tort le taux annuel complet sans ajuster par jours/360 (2 000 000 × 1,045).",
      ],
      [
        "A dealer borrows $500,000 overnight (1 day) under a repurchase agreement at a repo rate of 5.4%. Using a 360-day year, the repurchase price the next day is closest to:",
        ["$500,075.", "$527,000.", "$500,150."],
        0,
        "Repurchase price = $500 000 × [1 + (0,054 × 1/360)] = $500 000 × 1,00015 = $500 075. B applique à tort le taux annuel complet (500 000 × 1,054). C double le montant d'intérêt correct.",
      ],
      [
        "All else equal, compared to an overnight repo, a term repo (e.g., 30 or 90 days) most likely carries:",
        [
          "a lower repo rate and a lower repo margin, since the lender is compensated by a longer commitment.",
          "a higher repo rate and a higher repo margin, reflecting the greater risk of collateral value changes over a longer period.",
          "the same repo rate and margin, since both are fully collateralized transactions.",
        ],
        1,
        "Le repo rate et le repo margin (haircut) tendent à être plus élevés pour des termes plus longs, car la valeur du collatéral peut évoluer davantage sur une période plus longue — un term repo a donc typiquement un taux et une marge plus élevés qu'un overnight repo.",
      ],
      // Concept 4 — Sovereign auction allocation
      [
        "In a single-price (uniform-price) sovereign bond auction, noncompetitive bids are most accurately described as being:",
        [
          "rejected entirely, since only competitive bids can be filled at auction.",
          "filled first, in full, at the price/yield determined by the competitive bidding process.",
          "filled last, only after all competitive bids have been satisfied.",
        ],
        1,
        "Les enchérisseurs non-compétitifs indiquent seulement une quantité (pas de prix/yield) et sont garantis d'être servis intégralement, au prix/yield déterminé par les enchères compétitives — ET ils sont servis EN PREMIER, avant l'allocation aux enchérisseurs compétitifs.",
      ],
      [
        "In a sovereign bond auction, after noncompetitive bids are filled, the remaining bonds are allocated to competitive bidders:",
        [
          "at random, regardless of the price or yield they bid.",
          "starting with the bidders offering the highest price (i.e., lowest yield), continuing until the issue is fully allocated.",
          "starting with the bidders offering the lowest price (i.e., highest yield).",
        ],
        1,
        "Les enchérisseurs compétitifs sont classés par prix/yield ; ceux offrant le prix le plus élevé (acceptant le yield le plus bas) sont servis en premier, et l'allocation continue vers des prix décroissants jusqu'à épuisement du montant émis.",
      ],
      [
        "A pension fund submits a noncompetitive bid at a sovereign bond auction, while a dealer submits a competitive bid. Relative to the dealer's bid, the pension fund's noncompetitive bid:",
        [
          "specifies a price or yield the fund is willing to accept.",
          "is guaranteed to be filled in full, whereas the dealer's competitive bid may be only partially filled or not filled at all.",
          "is filled only after all competitive bids have already been allocated.",
        ],
        1,
        "Les enchères non-compétitives n'indiquent qu'une quantité (pas de prix/yield, contrairement à A) et sont garanties d'être servies intégralement, allouées AVANT les enchères compétitives (contrairement à C) — précisément parce que le montant réservé aux non-compétitifs est mis de côté en premier.",
      ],
      // Concept 5 — Supranational bond classification
      [
        "A bond issued by the World Bank is most accurately classified as a:",
        ["sovereign bond.", "supranational bond.", "quasi-government (agency) bond."],
        1,
        "La Banque mondiale est une organisation multilatérale/supranationale (détenue par plusieurs gouvernements nationaux) — ses obligations sont des supranational bonds, distinctes des sovereign bonds (un seul gouvernement national) et des quasi-government bonds (une entité créée par un seul gouvernement).",
      ],
      [
        "Which of the following issuers would most accurately be described as supranational?",
        [
          "A U.S. federal agency created to support the housing market.",
          "The government of France.",
          "The International Monetary Fund (IMF), owned jointly by member countries.",
        ],
        2,
        "Le FMI est une institution multilatérale détenue par de nombreux pays membres — un émetteur supranational classique. A est un émetteur quasi-government (agence) d'un seul pays. B est un émetteur souverain.",
      ],
      [
        "Relative to a quasi-government (agency) bond issued within a single country, a supranational bond is most accurately distinguished by being issued by an entity that is:",
        [
          "owned and supported by multiple national governments, rather than a single government.",
          "always secured by a pool of mortgage collateral.",
          "exempt from all credit risk, since supranational issuers cannot default.",
        ],
        0,
        "Le trait distinctif d'un émetteur supranational est d'être détenu/soutenu conjointement par plusieurs gouvernements nationaux (Banque mondiale, FMI, banques de développement régionales), contrairement à une agence quasi-gouvernementale liée à un seul gouvernement. B décrit un instrument titrisé, sans rapport. C est faux — les émetteurs supranationaux, bien que de qualité généralement élevée, ne sont pas sans risque.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Fixed Income Page 2...");
  const total = await seedQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
