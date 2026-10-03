// Seed script — quiz de "drill" associé à la page 8 de la fiche PDF Equity
// (Equity Valuation — Multiples & Asset-Based). Structure : 5 concepts ×
// (1 question officielle + 1 variante "angle différent" + 1 variante "plus
// difficile"). Voir memory regle-drill-variantes-cfa-hub. Questions en
// anglais, explications en français. Questions officielles : banque de
// pratique Reading 48 (corrigés vérifiés contre le PDF "- Answers.pdf").
// Usage: node scripts/seed-equity-drill-page8.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Equity (Système)";

const QUIZ_SETS = [
  {
    title: "Equity — Drill Fiche Page 8 (Equity Valuation: Multiples & Asset-Based)",
    difficulty: 3,
    questions: [
      // Concept 1 — Calcul des 4 multiples de prix : P/E, P/S, P/B, P/CF (officielle)
      [
        "Gourmet and Company has the following information: Current market value = $250 million. Current book value = $225 million. Sales = $750 million. Earnings = $75 million. Cash flow = $125 million. Stock price = $7.50. Which of the following statements regarding Gourmet and Company is most accurate?",
        ["The price/book ratio is 0.90.", "The price/sales ratio is 0.33.", "The price/earnings ratio is 33.3."],
        1,
        "P/S = 250M/750M = 0,33, ce qui rend B correcte. Vérification : P/B = 250M/225M = 1,11 (et non 0,90) et P/E = 250M/75M = 3,33 (et non 33,3 — erreur classique d'un facteur 10).",
      ],
      // Variante angle différent — calcul inversé : retrouver un fondamental (ROE) à partir de deux multiples
      [
        "A stock trades at $48 per share. Its trailing price-to-earnings (P/E) ratio is 16 and its price-to-book (P/B) ratio is 2.4. Based on trailing earnings and current book value, the company's return on equity (ROE) is closest to:",
        ["6.25%.", "41.7%.", "15.0%."],
        2,
        "On inverse les multiples pour retrouver les données par action : BPA = 48/16 = 3,00 $ et valeur comptable par action = 48/2,4 = 20,00 $. ROE = BPA / valeur comptable par action = 3,00/20,00 = 15,0 %. Raccourci utile : ROE = (P/B)/(P/E) = 2,4/16 = 0,15. 6,25 % (= 1/16) est le rendement bénéficiaire E/P : il rapporte le bénéfice au PRIX, pas aux capitaux propres comptables. 41,7 % (= 1/2,4) est le ratio B/P (book-to-market), qui ne contient aucun bénéfice.",
      ],
      // Variante plus difficile — données en totaux, trailing vs leading, piège actif total vs capitaux propres
      [
        "An analyst gathers the following data for Harlow Corp.: share price $36; shares outstanding 50 million; net income for the last fiscal year $90 million; consensus forecast of net income for next year $108 million; depreciation and amortization for the last fiscal year $30 million; sales for the last fiscal year $600 million; book value of total assets $1,200 million; book value of shareholders' equity $450 million. Cash flow is defined as net income plus depreciation and amortization. Which of the following statements is most accurate?",
        [
          "The trailing price-to-cash-flow ratio is 15.0.",
          "The price-to-book ratio is 1.5.",
          "The trailing P/E is 16.7 and the leading P/E is 20.0.",
        ],
        0,
        "Tout se calcule sur la capitalisation : 36 $ × 50 M = 1 800 M$. P/CF = 1 800/(90 + 30) = 1 800/120 = 15,0 : c'est l'affirmation exacte. P/B = 1 800/450 = 4,0 : le 1,5 s'obtient en divisant à tort par le total de l'ACTIF (1 800/1 200), alors que le P/B rapporte le prix aux seuls CAPITAUX PROPRES. Le trailing P/E utilise le bénéfice PASSÉ (1 800/90 = 20,0) et le leading (forward) P/E le bénéfice ATTENDU (1 800/108 = 16,7) : la troisième affirmation les inverse. Le chiffre d'affaires (P/S = 1 800/600 = 3,0) ne sert à aucune des trois affirmations.",
      ],

      // Concept 2 — Choix du multiple : avantages et limites (P/S pour cycliques et firmes en difficulté) (officielle)
      [
        "Which of the following is least likely an advantage of using price/sales (P/S) multiple to value an equity security, as compared to using price/earnings (P/E) multiples?",
        [
          "P/S multiples are more reliable than P/E multiples because sales data cannot be distorted by management.",
          "P/S multiples are not as volatile as P/E multiples and hence may be more reliable in valuation analysis.",
          "P/S multiples provide a meaningful framework for evaluating distressed firms when negative earnings prevent the use of P/E multiples.",
        ],
        0,
        "Les ventes PEUVENT être manipulées (comptabilisation agressive du chiffre d'affaires, par exemple reconnaître des ventes trop tôt) : l'affirmation A est fausse, ce n'est donc pas un avantage du P/S — c'est la réponse. B est un vrai avantage : les ventes sont moins volatiles que les bénéfices, d'où la préférence pour le P/S sur les firmes cycliques. C aussi : les ventes restent positives quand le bénéfice est négatif (firme en difficulté), cas où le P/E n'a plus de sens.",
      ],
      // Variante angle différent — le "pourquoi" appliqué à un cas : firme cyclique au sommet du cycle, trailing vs forward
      [
        "A chemical producer with highly cyclical earnings is near the peak of the business cycle, and its trailing P/E is well below its own 10-year average. Which of the following is the most appropriate interpretation?",
        [
          "The stock is clearly undervalued, because a low P/E relative to its history always signals a bargain.",
          "The low P/E may simply reflect temporarily inflated peak earnings in the denominator, so a price-to-sales multiple may give a more reliable comparison.",
          "The analyst should prefer the trailing P/E to a forward P/E, because trailing earnings are observed rather than forecast.",
        ],
        1,
        "Au sommet du cycle, le bénéfice (dénominateur du P/E) est temporairement gonflé : le P/E paraît bas sans que l'action soit pour autant bon marché — c'est précisément pourquoi on privilégie le P/S pour les firmes cycliques, les ventes étant bien moins volatiles que les résultats (B). A ignore cet effet de cycle : un P/E bas peut refléter un pic de bénéfice appelé à retomber. C se trompe de logique : c'est justement le bénéfice PASSÉ (trailing) qui est gonflé au sommet ; un P/E forward, fondé sur un bénéfice attendu en baisse, serait plus élevé et refléterait mieux la retombée attendue — le fait que le bénéfice trailing soit « observé » ne le rend pas représentatif.",
      ],
      // Variante plus difficile — signal des multiples : cohérent vs mélangé, sur trois titres, avec lecture croisée des multiples
      [
        "An analyst compares three stocks with their industry averages. Industry: P/E 18.0, P/B 2.5, P/S 1.6. Stock X: P/E 14.0, P/B 1.9, P/S 1.2. Stock Y: P/E 24.0, P/B 3.1, P/S 2.2. Stock Z: P/E 12.0, P/B 3.4, P/S 2.0. Which of the following statements is most accurate?",
        [
          "Stock Z appears the most undervalued, because it has the lowest P/E of the three stocks.",
          "Stock Y sends the most contradictory signal, because all of its multiples differ from the industry averages.",
          "Stock X sends a consistent signal of relative undervaluation, whereas Stock Z sends the most contradictory signal and warrants further investigation.",
        ],
        2,
        "X : ses trois multiples sont SOUS la moyenne sectorielle → signal cohérent de sous-évaluation relative. Y : ses trois multiples sont AU-DESSUS → signal tout aussi cohérent (de surévaluation relative) : B confond « tous différents de la moyenne » et « contradictoires ». Z : P/E sous la moyenne mais P/B et P/S au-dessus → multiples mélangés = signal le plus contradictoire, qui exige une investigation. A tombe dans le piège du multiple isolé. En croisant les multiples de Z : marge nette implicite = (P/S)/(P/E) = 2,0/12 = 16,7 % contre 1,6/18 = 8,9 % pour le secteur, et ROE implicite = (P/B)/(P/E) = 3,4/12 = 28,3 % contre 2,5/18 = 13,9 % — un bénéfice anormalement élevé (peut-être non récurrent) gonfle le dénominateur du P/E et explique son P/E bas. À noter : ces signaux sont RELATIFS ; si tout le secteur est surévalué, X peut l'être aussi.",
      ],

      // Concept 3 — P/E justifié (fondamental) : payout / (r − g) (officielle)
      [
        "A stock has a required rate of return of 15%, a constant growth rate of 10%, and a dividend payout ratio of 45%. The stock's justified price-earnings ratio is closest to:",
        ["4.5 times.", "9.0 times.", "3.0 times."],
        1,
        "P0/E1 = (D1/E1)/(k−g) = 0,45/(0,15−0,10) = 0,45/0,05 = 9,0 fois.",
      ],
      // Variante angle différent — calcul inversé : retrouver le taux de croissance implicite dans le P/E de marché
      [
        "A stock trades at a leading P/E (P0/E1) of 12.5. The company pays out 50% of its earnings as dividends, and investors require an 11% return on the stock. Assuming the stock is fairly priced, the constant growth rate implied by its P/E is closest to:",
        ["7.0%.", "4.0%.", "15.0%."],
        0,
        "On inverse la formule du P/E justifié : P0/E1 = payout/(r − g), donc r − g = payout/(P0/E1) = 0,50/12,5 = 0,04, et g = 11 % − 4 % = 7,0 %. Vérification : 0,50/(0,11 − 0,07) = 0,50/0,04 = 12,5. 4,0 % n'est que l'écart r − g (c'est d'ailleurs le rendement du dividende attendu D1/P0 = 0,50/12,5) : il faut encore le retrancher de r. 15,0 % revient à ajouter cet écart à r au lieu de le soustraire.",
      ],
      // Variante plus difficile — dividend displacement : une hausse du payout réduit g (g = rétention × ROE), effet net à calculer
      [
        "A company has a return on equity (ROE) of 15%, and investors require a 12% return on its shares. It currently pays out 40% of its earnings and plans to raise its payout ratio to 60%. Assuming the sustainable growth rate (retention ratio × ROE) applies indefinitely and ROE is unaffected by the change, the company's justified leading P/E will most likely:",
        [
          "rise from about 13.3 to about 20.0, because a higher payout ratio raises the numerator of the justified P/E.",
          "remain unchanged, because the higher payout ratio is exactly offset by the lower growth rate.",
          "fall from about 13.3 to about 10.0, because the lower growth rate more than offsets the higher payout ratio.",
        ],
        2,
        "Il faut recalculer g pour chaque politique, car g = taux de rétention × ROE. Aujourd'hui : rétention 60 %, g = 0,60 × 15 % = 9 %, P/E = 0,40/(0,12 − 0,09) = 0,40/0,03 = 13,3. Après : rétention 40 %, g = 0,40 × 15 % = 6 %, P/E = 0,60/(0,12 − 0,06) = 0,60/0,06 = 10,0. Le P/E BAISSE : comme le ROE (15 %) dépasse le rendement exigé (12 %), chaque dollar réinvesti crée de la valeur, et le distribuer coûte plus en croissance qu'il ne rapporte en dividende (dividend displacement). A garde g à 9 % alors que la hausse du payout le réduit mécaniquement (0,60/0,03 = 20,0). B ne vaut que dans le cas limite ROE = r : le P/E vaut alors 1/r quel que soit le payout, ce qui n'est pas le cas ici.",
      ],

      // Concept 4 — EV/EBITDA : de la valeur d'entreprise à la valeur des capitaux propres (officielle)
      [
        "An analyst studying Albion Industries determines that the average EV/EBITDA ratio for Albion's industry is 10. The analyst obtains the following information from Albion's financial statements: EBITDA = £11,000,000. Market value of debt = £30,000,000. Cash = £1,000,000. Based on the industry's average enterprise value multiple, what is the equity value of Albion Industries?",
        ["£110,000,000.", "£80,000,000.", "£81,000,000."],
        2,
        "EV estimée = 10×11 000 000 = 110 000 000£. Or EV = Valeur des capitaux propres + dette − trésorerie, donc Valeur des capitaux propres = 110 000 000−30 000 000+1 000 000 = 81 000 000£.",
      ],
      // Variante angle différent — le "pourquoi" : EV/EBITDA neutralise les différences de structure financière
      [
        "Two companies have identical operating assets and identical EBITDA. Company A is financed entirely with equity, whereas Company B is financed with a substantial amount of debt. To compare the valuations of the two companies, an analyst would most appropriately use:",
        [
          "the P/E ratio, because net income already reflects the cost of each company's financing choices, making the ratios directly comparable.",
          "the EV/EBITDA multiple, because enterprise value and EBITDA are both measured before the claims of debt holders, so the multiple is largely independent of capital structure.",
          "the P/B ratio, because the book value of equity is unaffected by the amount of debt a company uses to finance its assets.",
        ],
        1,
        "L'EBITDA est mesuré AVANT les intérêts, et l'EV intègre la dette à côté des capitaux propres : numérateur et dénominateur concernent tous les apporteurs de capitaux, d'où un multiple peu sensible à la structure financière (B) — et qui reste utilisable si le résultat net est négatif. A est faux : les intérêts de B réduisent son résultat net et la valeur de ses capitaux propres est plus faible, si bien que les deux P/E ne sont pas comparables — le levier fausse la comparaison au lieu de la neutraliser. C est faux : à actifs identiques, la société endettée a des capitaux propres comptables plus faibles (actif = dette + capitaux propres), son P/B dépend donc lui aussi de l'endettement.",
      ],
      // Variante plus difficile — par action, avec actions de préférence, valeur de marché vs comptable de la dette et donnée-piège
      [
        "An analyst values Corvin Ltd. using an industry average EV/EBITDA multiple of 8.0. Data for Corvin: EBITDA $25 million; net income $9 million; book value of debt $90 million; market value of debt $80 million; market value of preferred stock $15 million; cash and short-term investments $12 million; common shares outstanding 10 million. Based on the industry multiple, Corvin's estimated equity value per common share is closest to:",
        ["$11.70.", "$10.70.", "$13.20."],
        0,
        "EV estimée = 8,0 × 25 M = 200 M$. Valeur des capitaux propres ordinaires = EV − valeur de MARCHÉ de la dette − actions de préférence + trésorerie = 200 − 80 − 15 + 12 = 117 M$, soit 117/10 = 11,70 $ par action. 10,70 $ utilise à tort la valeur COMPTABLE de la dette (200 − 90 − 15 + 12 = 107 M$). 13,20 $ oublie de retrancher les actions de préférence, dont la créance passe avant celle des actionnaires ordinaires (200 − 80 + 12 = 132 M$). Le résultat net (9 M$) est une donnée-piège : il n'intervient pas dans une valorisation par EV/EBITDA.",
      ],

      // Concept 5 — Modèles fondés sur les actifs : MV actifs − MV passifs (officielle)
      [
        "Gwangwa Gold, a South African gold producer, has as its primary asset a mine which is shown on the balance sheet with a value of R100 million. An analyst estimates the market value of this mine to be 90% of book value. The company's balance sheet shows other assets of R20 million and liabilities of R40 million, and the analyst feels that the book value of these items reflects their market values. Using the asset-based valuation approach, what should the analyst estimate the value of the company to be?",
        ["R110 million.", "R70 million.", "R80 million."],
        1,
        "Valeur de marché des actifs = 0,90×100M (mine)+20M (autres actifs) = 110M. Passif = 40M. Valeur nette de la société = 110M−40M = 70M de rands. A est en réalité la valeur totale des actifs seule, sans retrancher le passif.",
      ],
      // Variante angle différent — domaine de validité : dans quel cas le modèle N'EST PAS fiable
      [
        "An asset-based valuation model would most likely produce the least reliable estimate of equity value for:",
        [
          "a timber company whose main assets are forest land with observable market prices.",
          "a privately held distributor that is being liquidated.",
          "a software company whose value derives mainly from internally developed technology and brand names.",
        ],
        2,
        "Le modèle fondé sur les actifs valorise les capitaux propres comme la valeur de marché des actifs moins celle des passifs : il est fiable quand les actifs sont surtout corporels avec une valeur de marché observable, et peu fiable quand la valeur repose sur des actifs intangibles (technologie développée en interne, marques), souvent absents du bilan et difficiles à évaluer — d'où C. L'exploitant forestier (A) est le cas d'école de la société de ressources naturelles, aux actifs corporels négociés sur un marché ; la société en liquidation (B) est justement un cas où l'on raisonne en valeur de revente des actifs. Dans ces deux cas, l'approche est bien adaptée.",
      ],
      // Variante plus difficile — plusieurs ajustements en valeur de marché, goodwill sans valeur, actions de préférence, par action
      [
        "An analyst applies an asset-based approach to Norgate Mining, a privately held company. Book values: mining properties $200 million; other tangible assets $60 million; goodwill $30 million; total liabilities $150 million; preferred stock $20 million. The analyst estimates that the mining properties are worth 120% of book value, that the other tangible assets and the preferred stock are carried at market value, that the goodwill has no realizable value, and that the market value of the liabilities is $140 million. Norgate has 5 million common shares outstanding. The estimated value per common share is closest to:",
        ["$28.00.", "$26.00.", "$34.00."],
        0,
        "Valeur de marché des actifs = gisements 1,20 × 200 = 240 M$ + autres actifs corporels 60 M$ + goodwill 0 = 300 M$. On retranche la valeur de MARCHÉ des passifs (140 M$) et les actions de préférence (20 M$) : 300 − 140 − 20 = 140 M$, soit 140/5 = 28,00 $ par action. 26,00 $ retranche la valeur COMPTABLE des passifs (300 − 150 − 20 = 130 M$). 34,00 $ conserve le goodwill à sa valeur comptable (330 − 140 − 20 = 170 M$) alors que l'analyste lui attribue une valeur nulle — c'est précisément la faiblesse du modèle face aux intangibles. Pour une société aux actifs surtout corporels comme Norgate, cette valeur sert souvent de plancher.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Equity Page 8...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
