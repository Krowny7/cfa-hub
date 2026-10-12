// Seed script — quiz de "drill" associé à la page 4 de la fiche PDF Economics
// (International Trade & FX Market, Readings 17 et 18). Structure : pour chacun
// des 5 concepts clés de la page, 1 question officielle (banque de pratique CFA,
// Readings 17 et 18, corrigé vérifié contre les PDF "- Answers", recopiée à
// l'identique) + 1 variante "angle différent" (même notion, mais jamais un
// simple changement de chiffres menant au même raisonnement) + 1 variante
// "plus difficile" (raisonnement à plusieurs étapes / pièges combinés /
// notion connexe de la page). Voir memory regle-drill-variantes-cfa-hub.
// Les 5 questions déjà imprimées dans le PDF (R17 Q1, Q20 ; R18 Q22, Q11, Q16)
// ne sont pas reprises. Concepts : (1) restrictions au commerce (tariff / quota /
// VER), (2) trading blocs, (3) cotation price/base et variations en %,
// (4) taux de change nominal vs réel, (5) régimes de change. Non couverts par
// ce set : gains/coûts du commerce et capital flows & participants.
// Questions en anglais, explications en français.
// Les questions officielles sont recopiées à l'identique : syncQuizSets
// retrouve l'historique de réponses en comparant le texte exact de l'énoncé.
// Usage: node scripts/seed-economics-drill-page4.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Economics (Système)";

const QUIZ_SETS = [
  {
    title: "Economics — Drill Fiche Page 4 (International Trade & FX Market)",
    difficulty: 2,
    questions: [
      // Concept 1 — Restrictions au commerce : tariff, quota, VER — qui gagne, qui perd (officielle, R17 Q18)
      [
        "Prior to the beginning of summer, the government of Japan places a 150 percent tariff on imported chain saws. Assume for this example that this tariff has a significant impact on the supply of chain saws. The government's action:",
        [
          "benefits the Japanese government and domestic producers.",
          "will protect the jobs and high wages of Japanese chain saw industry workers.",
          "is more harmful than if the government had limited the amount of chain saws imported.",
        ],
        0,
        "Un tariff est une taxe sur les imports : l'État en encaisse le produit, et les producteurs nationaux profitent de la baisse des imports, qui fait monter le prix intérieur (A correcte) ; ce sont les consommateurs nationaux qui paient la hausse de prix. B est fausse : à long terme, les restrictions ne protègent pas le nombre net d'emplois, car les emplois « sauvés » sont compensés par ceux perdus dans l'import/export (entreprises qui ne peuvent plus importer des produits moins chers ni vendre à l'étranger). C est fausse : un tariff est jugé MOINS nuisible qu'un quota, car avec un quota l'État ne perçoit rien (la rente va aux producteurs étrangers détenteurs des licences).",
      ],
      // Variante angle différent — le "qui encaisse l'écart de prix" : tariff contre VER à effet de prix identique
      [
        "A country wants to reduce its imports of steel and is choosing between an import tariff and a voluntary export restraint (VER) that would raise the domestic price by the same amount. Compared with the tariff, the VER is most likely to leave the importing country:",
        [
          "better off, because the foreign exporters bear the entire cost of the restriction.",
          "worse off, because the gap between the domestic price and the world price goes to foreign exporters rather than to the importing government.",
          "equally well off, because domestic consumers pay the same higher price under both policies.",
        ],
        1,
        "Dans les deux cas le prix intérieur monte du même montant et les consommateurs paient autant (c'est ce que dit C, mais cela ne suffit pas pour conclure à une situation équivalente). La différence porte sur QUI encaisse l'écart entre prix intérieur et prix mondial : avec un tariff, c'est l'État importateur (recette fiscale) ; avec un VER, les exportateurs étrangers limitent eux-mêmes leurs ventes et vendent moins d'unités, mais plus cher : ils captent cette rente et le pays perd la recette (B). A est faux : les exportateurs étrangers ne supportent pas le coût, ils en encaissent une partie sous forme de marges plus élevées. Même logique pour un import quota dont les licences vont aux exportateurs étrangers (fiche : « État (licences) ou étranger ») ; si l'État vend les licences aux enchères, il récupère la rente comme avec un tariff.",
      ],
      // Variante plus difficile — recette et perte sèche d'un tariff (piège : imports d'avant le tariff, deux triangles)
      [
        "Country H is a small country that imports a good at the world price of 40 per unit. Under free trade, domestic consumption is 120 units and domestic production is 50 units. Country H then imposes a 25% tariff on the good. The domestic price rises to 50, consumption falls to 100 units, and domestic production rises to 70 units. The tariff revenue collected by the government and the deadweight loss for the country are:",
        [
          "tariff revenue of 700 and deadweight loss of 200.",
          "tariff revenue of 300 and deadweight loss of 100.",
          "tariff revenue of 300 and deadweight loss of 200.",
        ],
        2,
        "Pays petit : le prix mondial reste à 40. Droit par unité = 25 % × 40 = 10 (cohérent avec le passage de 40 à 50). Imports avant tariff = 120 - 50 = 70 ; après tariff = 100 - 70 = 30. Recette = 10 × 30 = 300 : elle porte sur les imports restants, pas sur les 70 d'avant (A calcule 10 × 70 = 700). Perte sèche (deadweight loss) = deux triangles : distorsion de production = 1/2 × 10 × (70 - 50) = 100 (production nationale plus coûteuse substituée aux imports) + distorsion de consommation = 1/2 × 10 × (120 - 100) = 100 (consommation évitée) = 200 ; B oublie l'un des deux triangles. Contrôle : perte de consumer surplus = 10 × 100 + 100 = 1 100 ; gain de producer surplus = 10 × 50 + 100 = 600 ; recette = 300 ; solde = 600 + 300 - 1 100 = -200. Un petit pays ne peut pas améliorer ses terms of trade : le tariff est une perte nette, égale à la perte sèche (courbes supposées linéaires).",
      ],

      // Concept 2 — Trading blocs : degrés d'intégration (officielle, R17 Q13)
      [
        "Which form of regional trading agreement is least likely to allow free movement of labor?",
        ["Common market.", "Customs union.", "Economic union."],
        1,
        "Un common market et une economic union suppriment toutes les barrières à la circulation du travail et du capital entre leurs membres. Une customs union (libre-échange entre membres + politique commerciale commune vis-à-vis des tiers) n'a pas cette libre circulation des facteurs de production : c'est elle qui est la moins susceptible de l'autoriser (B). Échelle d'intégration de la fiche : FTA, puis customs union, puis common market (+ libre circulation travail/capital), puis economic union (+ politique économique commune), puis monetary union (+ monnaie unique).",
      ],
      // Variante angle différent — le "pourquoi" : liberté de négocier avec des tiers dans un FTA
      [
        "Country A and Country B form a free trade area (FTA). Which of the following is most likely true about Country A's ability to sign a separate trade agreement with non-member Country C?",
        [
          "It cannot, because members of an FTA must adopt a common external tariff.",
          "It cannot, because an FTA requires free movement of labor and capital among members.",
          "It can, because an FTA removes trade barriers among members but does not require a common trade policy toward non-members.",
        ],
        2,
        "Un FTA supprime les barrières entre ses membres mais n'impose aucune politique commerciale commune vis-à-vis des non-membres : chaque pays garde ses propres tarifs et peut signer des accords avec des tiers (C). A décrit une customs union (tarif extérieur commun, niveau 2 de l'échelle). B décrit un common market (libre circulation du travail et du capital, niveau 3) : ce n'est pas une exigence d'un FTA, et ce n'est de toute façon pas ce qui détermine la liberté de négocier avec des tiers. C'est aussi pourquoi le FTA est la forme la moins susceptible de réduire les imports bon marché venant de non-membres.",
      ],
      // Variante plus difficile — customs union : tarif extérieur commun et trade diversion (piège : le bon point de comparaison est le prix d'avant l'union)
      [
        "Country M imports bicycles from non-member Country N at 100 per unit, with no tariff. Country M then joins a customs union with Country P. The union imposes a common external tariff of 20% on bicycles, and Country P can supply the same bicycles to Country M at 112 per unit, duty-free. Which of the following statements is most accurate?",
        [
          "Country M continues to buy from Country N, because N's price of 100 is lower than P's price of 112.",
          "Country M switches to Country P, and this is trade diversion: imports move from a lower-cost non-member to a higher-cost member, and M's consumers now pay 112 instead of 100.",
          "Country M switches to Country P, and this is trade creation: M's consumers now pay 112 instead of the 120 they would pay for imports from Country N.",
        ],
        1,
        "Avant l'union, M achète à N à 100. Après l'adhésion, le tarif extérieur commun de 20 % porte le prix des imports venant de N à 100 × 1,20 = 120, supérieur au prix de P (112, sans droits à l'intérieur de l'union) : M se tourne vers P (A ignore le tarif). C'est du trade diversion : les imports passent d'un producteur non-membre moins cher (100) à un membre plus cher (112), et les consommateurs de M paient 112 au lieu de 100 : le coût en ressources par unité augmente, au détriment de l'efficacité. C compare 112 à 120, un prix que les consommateurs de M n'ont jamais payé avant l'union, et confond avec le trade creation (où des imports moins chers d'un partenaire remplacent une production nationale plus coûteuse). Le prix de 120 sert seulement à comprendre pourquoi M change de fournisseur.",
      ],

      // Concept 3 — Cotation price/base et variation en % (officielle, R18 Q19)
      [
        "The exchange rate for Chinese yuan (CNY) per euro (EUR) changed from CNY/EUR 8.1588 to CNY/EUR 8.3378 over a 3-month period. It is most accurate to state that the:",
        [
          "CNY has depreciated 2.19% relative to the EUR.",
          "EUR has appreciated 2.15% relative to the CNY.",
          "EUR has appreciated 2.19% relative to the CNY.",
        ],
        2,
        "Dans la cotation CNY/EUR, l'EUR est la monnaie de base : sa variation est simplement taux final / taux initial - 1 = 8,3378 / 8,1588 - 1 = +2,19 % : l'EUR s'est apprécié de 2,19 % face au CNY (C). Le CNY, monnaie de cotation (price), varie de l'inverse : (1 / 8,3378) / (1 / 8,1588) - 1 = 8,1588 / 8,3378 - 1 = -2,15 %, soit une dépréciation de 2,15 % et non de 2,19 % (A est fausse). B confond les deux : l'appréciation de l'EUR est de 2,19 %, pas de 2,15 %. Les deux variations ne sont pas symétriques.",
      ],
      // Variante angle différent — calcul inversé : retrouver la nouvelle cotation à partir de la variation de la monnaie de cotation
      [
        "The USD/EUR exchange rate (USD per 1 EUR) is 1.1000. The USD then depreciates by 20.0% against the EUR. The new USD/EUR rate is closest to:",
        ["1.3750.", "1.3200.", "0.8800."],
        0,
        "Le USD est la monnaie de cotation (price) dans USD/EUR : sa valeur en EUR est l'inverse du taux. Valeur initiale du USD = 1 / 1,1000 = 0,9091 EUR ; après une dépréciation de 20 % : 0,9091 × 0,80 = 0,7273 EUR ; nouveau taux USD/EUR = 1 / 0,7273 = 1,3750 (A). Formule équivalente : 1,1000 / (1 - 0,20) = 1,3750. B (1,1000 × 1,20 = 1,3200) traite les 20 % comme une variation de la cotation, ce qui n'est vrai que pour la monnaie de base. C (1,1000 × 0,80 = 0,8800) va dans le mauvais sens : une dépréciation du USD fait MONTER le nombre de USD par EUR. Contrôle : l'EUR s'est apprécié de 1,3750 / 1,1000 - 1 = +25 %, et non de 20 %.",
      ],
      // Variante plus difficile — trois dates (donnée-piège : le taux de mi-année) et variations asymétriques base / price
      [
        "The CHF/EUR exchange rate (CHF per 1 EUR) was 1.0400 at the start of the year, 1.1440 at mid-year, and 1.0920 at the end of the year. Over the full year, which of the following statements is most accurate?",
        [
          "The EUR appreciated 5.0% against the CHF, and the CHF depreciated 5.0% against the EUR.",
          "The EUR appreciated 5.0% against the CHF, and the CHF depreciated 4.8% against the EUR.",
          "The EUR depreciated 4.5% against the CHF, and the CHF appreciated 4.8% against the EUR.",
        ],
        1,
        "Seuls le taux de début d'année (1,0400) et celui de fin d'année (1,0920) comptent pour la variation sur l'année ; le taux de mi-année (1,1440) est une donnée-piège. EUR (base) : 1,0920 / 1,0400 - 1 = +5,0 %. CHF (price) : on inverse, 1,0400 / 1,0920 - 1 = -4,76 %, soit environ -4,8 % (B). A suppose une variation symétrique : faux, car l'appréciation de la base (+5,0 %) n'est pas l'opposé de la variation de la monnaie de cotation (-4,8 %). C ne retient que le second semestre (1,0920 / 1,1440 - 1 = -4,5 % pour l'EUR ; 1,1440 / 1,0920 - 1 = +4,8 % pour le CHF) : il décrit le mouvement depuis le point haut de mi-année, pas la variation sur l'année.",
      ],

      // Concept 4 — Taux de change nominal vs réel (officielle, R18 Q26)
      [
        "Other things equal, a real exchange rate (stated as units of domestic currency per unit of foreign currency) will decrease as a result of an increase in the:",
        ["domestic price level.", "foreign price level.", "nominal exchange rate (domestic/foreign)."],
        0,
        "Real exchange rate (price/base) = taux nominal × CPI de la base / CPI de la price. Ici la monnaie domestique est la price et l'étrangère la base : taux réel (dom/étr) = nominal (dom/étr) × CPI étranger / CPI domestique. Une hausse du niveau de prix domestique augmente le dénominateur et fait donc BAISSER le taux réel (A). Une hausse du CPI étranger (B) ou du taux nominal dom/étr (C) augmente le taux réel, toutes choses égales par ailleurs.",
      ],
      // Variante angle différent — raisonnement inverse : déduire l'écart d'inflation à partir du nominal et du réel
      [
        "Over one year, the nominal exchange rate of the DOM per FOR rises by 5.0% (the FOR appreciates against the DOM), while the real exchange rate (DOM/FOR) is unchanged. Which of the following is most consistent with these facts?",
        [
          "Foreign inflation was about 5% higher than domestic inflation.",
          "Neither country experienced any inflation.",
          "Domestic inflation was about 5% higher than foreign inflation.",
        ],
        2,
        "Taux réel (DOM/FOR) = nominal × CPI étranger / CPI domestique. Si le nominal est multiplié par 1,05 et que le taux réel ne bouge pas, le ratio CPI étranger / CPI domestique doit être divisé par 1,05 : le niveau de prix domestique a augmenté d'environ 5 % de plus que celui de l'étranger (C). La dépréciation nominale de la monnaie domestique compense exactement l'écart d'inflation, d'où un taux réel inchangé. A est l'inverse : le taux réel serait alors multiplié par 1,05 × 1,05, soit environ +10 %. B est faux : sans variation des prix, la variation du taux nominal serait égale à celle du taux réel (+5 %), ce qui contredit l'énoncé.",
      ],
      // Variante plus difficile — de l'inflation au CPI, rapport des CPI dans le bon sens, taux d'intérêt = donnée-piège
      [
        "One year ago, the CPIs of the United States and the Eurozone were both 100 and the nominal exchange rate was 1.2000 USD/EUR. Over the year, US inflation was 2.0% and Eurozone inflation was 5.0%; US short-term interest rates averaged 4.0% and Eurozone rates 3.0%. The nominal exchange rate is now 1.1500 USD/EUR. Which of the following correctly states the current real exchange rate (USD/EUR) and its change over the year?",
        [
          "1.1838 USD/EUR, a real depreciation of the EUR of about 1.3%.",
          "1.1500 USD/EUR, a real depreciation of the EUR of about 4.2%.",
          "1.1171 USD/EUR, a real depreciation of the EUR of about 6.9%.",
        ],
        0,
        "Taux réel (USD/EUR) = nominal × CPI de la base (EUR) / CPI de la price (USD). CPI actuels : États-Unis 100 × 1,02 = 102 ; zone euro 100 × 1,05 = 105. Taux réel = 1,1500 × 105 / 102 = 1,1838 USD/EUR (A). Taux réel initial = 1,2000 × 100 / 100 = 1,2000 ; variation = 1,1838 / 1,2000 - 1 = -1,3 % : dépréciation réelle de l'EUR d'environ 1,3 % (la dépréciation nominale de 4,2 % est en grande partie compensée par l'inflation plus forte de la zone euro). B donne le taux nominal (1,1500 ; 1,1500 / 1,2000 - 1 = -4,2 %), qui ignore les prix. C inverse le rapport des CPI (1,1500 × 102 / 105 = 1,1171 ; -6,9 %). Les taux d'intérêt (4 % et 3 %) sont une donnée-piège : ils n'entrent pas dans le calcul du taux de change réel.",
      ],

      // Concept 5 — Régimes de change : de la dollarization au floating (officielle, R18 Q18)
      [
        "A country's central bank announces a monetary policy goal of a stable exchange rate with the euro, which it defines as deviations of no more than 3% from its current exchange rate of 2.5000. The country's exchange rate regime is best described as a:",
        ["crawling band.", "fixed peg.", "target zone."],
        2,
        "Un target zone est un système de taux pégés à l'intérieur de bandes horizontales autour d'un taux central : il tolère des fluctuations plus larges (±2 % sur la fiche ; ±3 % ici) que le conventional fixed peg, limité à environ ±1 %. Un crawling band (ou crawling peg) se distingue par une marge, ou un taux central, qui évolue dans le temps : ce n'est pas décrit ici (A). Avec ±3 %, la marge dépasse largement celle d'un fixed peg classique (B). C est donc la bonne réponse.",
      ],
      // Variante angle différent — le "pourquoi" : currency board et perte d'autonomie monétaire
      [
        "Which of the following best explains why a country operating a currency board cannot conduct an independent monetary policy?",
        [
          "The country has no currency of its own and uses another country's money.",
          "The domestic monetary base must be fully backed by foreign currency reserves, so the money supply can expand only when reserves increase.",
          "The exchange rate is set daily by the market, so the central bank has no influence on the domestic money supply.",
        ],
        1,
        "Dans un currency board, le pays garde sa monnaie mais s'engage à la convertir à taux fixe en une devise d'ancrage, avec des réserves couvrant 100 % de la base monétaire. La banque centrale ne peut donc pas créer de monnaie à volonté (acheter des titres, prêter aux banques) : la masse monétaire n'augmente que si les réserves augmentent, et les taux domestiques suivent ceux de la devise d'ancrage (B). A décrit la dollarization (ou une monetary union) : le pays n'a plus de monnaie propre, ce qui n'est pas le cas d'un currency board. C décrit l'independent floating, régime où le marché fixe le taux et où la banque centrale conserve au contraire son autonomie monétaire.",
      ],
      // Variante plus difficile — bandes ±1 % (fixed peg) contre ±2 % (target zone), sens de l'intervention (piège : KRO/USD qui monte = KRO qui se déprécie)
      [
        "Country K pegs its currency, the KRO, to the USD at a central rate of 4.0000 KRO/USD. The market rate moves to 4.0500 KRO/USD. Compare two possible regimes: (1) a conventional fixed peg with a band of 1% on either side of the central rate, and (2) a target zone with a band of 2% on either side. Which of the following statements is most accurate?",
        [
          "Under the fixed peg the rate is outside the band and the central bank would have to sell USD and buy KRO; under the target zone no intervention is needed.",
          "Under the fixed peg the rate is outside the band and the central bank would have to buy USD and sell KRO; under the target zone no intervention is needed.",
          "Under both regimes the rate is outside the band, and the central bank would have to sell USD and buy KRO.",
        ],
        0,
        "Fixed peg à 1 % : bande = 4,0000 × (1 ± 0,01) = 3,9600 à 4,0400. Le taux de 4,0500 dépasse la borne haute : il est hors bande. Target zone à 2 % : bande = 3,9200 à 4,0800 ; 4,0500 est à l'intérieur, aucune intervention n'est requise. Sens de l'intervention : un taux KRO/USD qui monte signifie qu'il faut plus de KRO pour un USD, donc que le KRO se déprécie. Pour ramener le taux à 4,0400 ou moins, la banque centrale doit soutenir le KRO : elle vend des USD (réserves) et achète des KRO (A). B inverse le sens (acheter des USD ferait monter encore le taux et affaiblirait le KRO). C applique à tort la bande de 1 % aux deux régimes : la target zone de 2 % tolère 4,0500.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Economics Page 4...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions ajoutées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
