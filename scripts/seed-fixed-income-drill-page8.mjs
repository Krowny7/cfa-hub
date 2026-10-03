// Seed script — quiz de "drill" associé à la page 8 de la fiche PDF Fixed
// Income (ABS Types · MBS & CMO). Contenu d'origine fourni par l'utilisateur,
// remis au cadre à sa demande le 3 octobre 2026. Page dense : 7 concepts clés,
// chacun décliné en 1 question officielle (banque de pratique CFA, Readings 66
// et 67, corrigé vérifié contre le PDF "- Answers.pdf" correspondant) + 1
// variante "angle différent" (même notion, mais jamais un simple changement de
// chiffres menant au même raisonnement) + 1 variante "plus difficile"
// (raisonnement à plusieurs étapes / pièges combinés / notion connexe de la
// page). Voir memory regle-drill-variantes-cfa-hub. Questions en anglais,
// explications en français.
// Aucune question de l'ancien script n'était une question officielle de la
// banque : les officielles ci-dessous sont nouvelles, recopiées telles quelles
// de la banque (en évitant les QCM déjà imprimés dans la fiche). syncQuizSets
// retrouve l'historique de réponses en comparant le texte exact de l'énoncé.
// Usage: node scripts/seed-fixed-income-drill-page8.mjs
import { getOwnerId, ensureFolder, syncQuizSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Fixed Income (Système)";

const QUIZ_SETS = [
  {
    title: "Fixed Income — Drill Fiche Page 8 (ABS Types · MBS & CMO)",
    difficulty: 2,
    questions: [
      // Concept 1 — Credit card ABS : revolving (lockout) period, amortization, rapid amortization (officielle, Reading 66 Q5)
      [
        "Which of the following classes of asset-backed securities typically includes a lockout period?",
        ["Auto loan ABS.", "Credit card ABS.", "Non-agency residential MBS."],
        1,
        "Les créances de cartes de crédit ne s'amortissent pas selon un échéancier : les porteurs de cartes remboursent et réempruntent en permanence. Pendant la période de blocage (lockout ou revolving period), le principal remboursé par les porteurs de cartes sert à acheter de nouvelles créances au lieu d'être reversé aux investisseurs, qui ne reçoivent que les intérêts et frais (finance charges) : le pool reste stable. Le principal n'est versé qu'ensuite, pendant la période d'amortissement. A : les prêts auto sont amortissables, leur principal (prévu et anticipé) est reversé chaque mois. C : même chose pour les RMBS non-agency, adossés à des prêts hypothécaires amortissables.",
      ],
      // Variante angle différent — le POURQUOI de la revolving period (comparaison avec un ABS auto)
      [
        "Why do credit card receivable ABS include a revolving period, whereas auto loan ABS typically do not?",
        [
          "Credit card receivables are non-amortizing and are repaid quickly, so principal collections are used to buy new receivables and keep the size of the pool stable.",
          "Credit card receivables carry little credit risk during the first years of the deal, so principal does not need to be returned to investors.",
          "The revolving period lets the SPE reinvest the finance charges collected from cardholders in new receivables, which increases the coupon paid to investors.",
        ],
        0,
        "Une créance de carte de crédit est un prêt renouvelable (revolving), non amortissable et souvent remboursé en quelques mois : sans réinvestissement, le pool fondrait très vite. Pendant la revolving period, le principal remboursé est donc réinvesti dans de nouvelles créances, ce qui garde la taille du pool stable et donne aux investisseurs un flux d'intérêts régulier, sans principal (et donc sans risque de remboursement anticipé pendant cette période). Un prêt auto, lui, a un échéancier d'amortissement fixe : son principal est naturellement reversé chaque mois. B est faux : le risque de crédit (pertes sur cartes) existe dès le départ ; la revolving period n'a rien à voir avec une absence de risque. C est faux : ce sont les remboursements de PRINCIPAL qui sont réinvestis, pas les finance charges, qui servent à payer les coupons des investisseurs et les frais.",
      ],
      // Variante plus difficile — déclenchement de la rapid amortization provision : effet sur les flux (donnée-piège : durée restante)
      [
        "A credit card receivable ABS has a five-year revolving period followed by an amortization period. In Year 2, with three years of the revolving period remaining, a sharp rise in cardholder defaults triggers the deal's rapid amortization provision. In the following month, cardholders repay $30 million of principal and pay $8 million of finance charges. Ignoring fees and losses, the amount paid to the ABS investors that month is closest to:",
        ["$8 million.", "$30 million.", "$38 million."],
        2,
        "La rapid amortization provision est déclenchée par certains événements, typiquement une dégradation de la performance du pool (hausse des défauts, baisse de l'excess spread). Elle met fin IMMÉDIATEMENT à la revolving period, même s'il en restait 3 ans (donnée-piège) : le principal encaissé n'est plus réinvesti mais versé aux investisseurs, pour les protéger d'une dégradation supplémentaire du pool. Le mois suivant : 30 M$ de principal + 8 M$ de finance charges = 38 M$ (hors frais et pertes), et la durée de vie des titres raccourcit. A (8 M$) suppose que la revolving period continue jusqu'à son terme prévu, ce que la clause empêche justement. B (30 M$) invente un blocage des finance charges : ces intérêts continuent de servir les coupons des investisseurs.",
      ],

      // Concept 2 — CDO / CLO : collateral manager actif, 4 phases, tranche equity (officielle, Reading 66 Q9)
      [
        "In contrast with most asset-backed securities (ABS), a collateralized debt obligation (CDO):",
        ["employs a collateral manager.", "has senior and subordinate tranches.", "is issued through a special purpose vehicle."],
        0,
        "Ce qui distingue un CDO (et un CLO, adossé à des prêts bancaires à effet de levier) d'un ABS classique, c'est le collateral manager : il achète et vend activement des titres ou des prêts dans le portefeuille de collatéral pour générer les flux nécessaires au service des tranches. Le pool d'un ABS classique est, lui, essentiellement figé. B et C ne sont pas distinctifs : les ABS ont aussi des tranches senior et subordonnées (credit tranching) et sont eux aussi émis par une SPE/SPV.",
      ],
      // Variante angle différent — QUAND le manager agit : les 4 phases d'un CLO
      [
        "During which phase of a collateralized loan obligation (CLO) does the collateral manager use the principal repaid on loans already in the portfolio to purchase new loans?",
        ["Ramp-up period.", "Reinvestment period.", "Maturity (amortization) period."],
        1,
        "Le cycle de vie d'un CLO compte 4 phases : 1) ramp-up — le manager constitue le portefeuille initial de prêts avec les fonds levés ; 2) closing — l'opération est finalisée et les titres émis ; 3) reinvestment period — le principal remboursé sur les prêts est RÉINVESTI dans de nouveaux prêts par le manager (c'est la gestion active qui distingue le CLO d'un ABS figé) ; 4) maturity / amortization — les remboursements servent à rembourser les tranches, des plus senior aux plus juniors. A est le piège : pendant le ramp-up, le manager achète bien des prêts, mais avec le produit du financement initial, pas avec du principal remboursé. C : en phase d'amortissement, le principal remboursé n'est plus réinvesti, il est reversé aux porteurs.",
      ],
      // Variante plus difficile — rendement de la tranche equity d'un CLO (levier, commission du manager) puis effet d'une perte
      [
        "A CLO holds $500 million of leveraged loans yielding SOFR + 3.50%. It has issued $450 million of debt tranches with an average cost of SOFR + 1.80% and $50 million of equity. The collateral manager's fee is 0.50% per year of the collateral, and SOFR is 4.00%. Which statement about the equity tranche is most accurate?",
        [
          "Its annual return is about 17.8% if there are no defaults; a $10 million credit loss on the loans would make its return negative, because the equity tranche absorbs losses first.",
          "Its annual return is about 22.8% if there are no defaults; a $10 million credit loss on the loans would be shared pro rata by all tranches, so its return would remain positive.",
          "Its annual return is about 1.8% if there are no defaults; it earns only the residual spread, but the debt tranches absorb credit losses before it.",
        ],
        0,
        "Revenus du collatéral = 500 × (4,00 % + 3,50 %) = 37,5 M$. Coût des tranches de dette = 450 × (4,00 % + 1,80 %) = 26,1 M$. Commission du manager = 0,50 % × 500 = 2,5 M$. Résiduel pour l'equity = 37,5 − 26,1 − 2,5 = 8,9 M$, soit 8,9 / 50 = 17,8 % par an. Ce rendement élevé rémunère le fait que l'equity est la tranche la plus risquée : elle absorbe les pertes en premier, avec un fort effet de levier. Avec 10 M$ de pertes, le résiduel devient 8,9 − 10 = −1,1 M$, soit environ −2,2 %. B oublie la commission du manager ((37,5 − 26,1) / 50 = 22,8 %) et suppose à tort un partage des pertes au prorata. C divise le résiduel par la taille totale du collatéral (8,9 / 500 = 1,78 %) au lieu de la mise de l'equity, et inverse la subordination : ce sont les tranches de dette qui sont protégées par l'equity, pas l'inverse.",
      ],

      // Concept 3 — Credit enhancement : overcollateralization, subordination, excess spread (officielle, Reading 66 Q7)
      [
        "A company originating an asset-backed security (ABS) has built up significant reserves within the ABS structure in order to absorb credit losses in collateral. This credit enhancement type is best described as:",
        ["excess spread.", "credit tranching.", "overcollateralization."],
        0,
        "L'excess spread est la différence entre les intérêts perçus sur le collatéral et ce qui est dû aux porteurs des ABS (coupons) plus les frais ; ce surplus est mis de côté dans la structure (compte de réserve) pour absorber les pertes futures. C'est l'un des trois rehaussements de crédit internes classiques. C : le surdimensionnement (overcollateralization) signifie que la valeur du collatéral dépasse la valeur faciale des titres émis — ce n'est pas une accumulation de réserves à partir des revenus. B : le credit tranching (subordination) répartit les pertes entre classes de titres selon leur rang de priorité.",
      ],
      // Variante angle différent — repérer les trois mécanismes dans une structure chiffrée
      [
        "An SPE holds $520 million of auto loans with an average interest rate of 7.0%. It issues $400 million of senior notes with a 4.5% coupon and $100 million of subordinated notes with a 6.0% coupon. Ignoring fees, which forms of internal credit enhancement does this structure include?",
        [
          "Overcollateralization and excess spread only.",
          "Subordination and overcollateralization only.",
          "Subordination, overcollateralization, and excess spread.",
        ],
        2,
        "Il faut repérer les trois mécanismes dans les chiffres. Subordination : les 100 M$ de notes subordonnées absorbent les pertes avant les 400 M$ de notes senior. Surdimensionnement : collatéral 520 M$ > titres émis 400 + 100 = 500 M$ → 20 M$ d'overcollateralization. Excess spread : intérêts perçus 520 × 7,0 % = 36,4 M$ ; coupons dus 400 × 4,5 % + 100 × 6,0 % = 18 + 6 = 24 M$ → excess spread de 12,4 M$ par an (avant frais). Les trois sont présents. A oublie que la tranche subordonnée est elle-même un rehaussement de crédit pour la tranche senior (subordination = credit tranching). B oublie l'excess spread, qui ne se lit pas dans les montants mais dans l'écart entre les taux.",
      ],
      // Variante plus difficile — ordre d'absorption des pertes : excess spread, puis surdimensionnement, puis mezzanine (piège des frais)
      [
        "An ABS structure holds $300 million of loans yielding 8.0%. It has issued $240 million of senior notes at 5.0% and $45 million of mezzanine notes at 7.0%; the remaining $15 million of collateral is overcollateralization. Servicing fees are 0.5% of the collateral per year. In Year 1, credit losses on the loans total $35 million. If losses are absorbed first by the year's excess spread, then by the overcollateralization, and then by the mezzanine notes, the principal loss on the mezzanine notes is closest to:",
        ["$11.15 million.", "$12.65 million.", "$20.00 million."],
        1,
        "1) Excess spread de l'année : intérêts 300 × 8,0 % = 24,0 M$ ; coupons 240 × 5,0 % + 45 × 7,0 % = 12,0 + 3,15 = 15,15 M$ ; frais 0,5 % × 300 = 1,5 M$ → excess spread = 24,0 − 15,15 − 1,5 = 7,35 M$. 2) Pertes restantes après l'excess spread : 35 − 7,35 = 27,65 M$. 3) Le surdimensionnement de 15 M$ (300 − 240 − 45) en absorbe 15 → il reste 12,65 M$, absorbés par la mezzanine ; la tranche senior n'est pas touchée. A (11,15 M$) oublie de déduire les frais de servicing de l'excess spread (24,0 − 15,15 = 8,85 ; 35 − 8,85 − 15 = 11,15). C (20 M$) oublie complètement l'excess spread (35 − 15 = 20).",
      ],

      // Concept 4 — Pass-through : agency vs non-agency RMBS, taux pass-through, principal reversé (officielle, Reading 67 Q6)
      [
        "An agency RMBS pool with a prepayment speed of 50 PSA will have a weighted average life that is:",
        ["equal to its weighted average maturity.", "greater than its weighted average maturity.", "less than its weighted average maturity."],
        2,
        "Dans un pass-through, tout le principal collecté — amortissement prévu ET remboursements anticipés — est reversé chaque mois aux investisseurs. Le principal est donc reçu, en moyenne, bien avant l'échéance des prêts : la durée de vie moyenne pondérée (WAL) est inférieure à la maturité moyenne pondérée (WAM) dès qu'il y a des remboursements anticipés. « 50 PSA » signifie une vitesse de remboursement égale à 50 % du benchmark de la PSA : plus lente que le benchmark, mais pas nulle. A supposerait qu'aucun principal ne soit reçu avant l'échéance des prêts. B est impossible : les remboursements anticipés ne peuvent que raccourcir la durée de vie, jamais la rendre plus longue que la maturité des prêts.",
      ],
      // Variante angle différent — agency vs non-agency : d'où vient la protection contre le risque de crédit
      [
        "Compared with an agency RMBS, a non-agency RMBS most likely:",
        [
          "has no prepayment risk, because its underlying mortgages do not have to meet agency underwriting standards.",
          "is backed by mortgages that must meet the agencies' underwriting standards (conforming loans).",
          "requires credit enhancement, because its payments are not guaranteed by a government agency or a GSE.",
        ],
        2,
        "RMBS d'agence : émis ou garantis par Ginnie Mae (garantie « full faith and credit » du gouvernement américain) ou par les GSE (Fannie Mae, Freddie Mac) ; les prêts doivent respecter leurs critères de souscription (prêts « conformes ») et le risque de crédit pour l'investisseur est minime. RMBS non-agency : émis par des banques ou institutions privées, sans garantie publique → les investisseurs portent le risque de crédit, d'où le recours au rehaussement de crédit (subordination, surdimensionnement, excess spread…). A est faux : le risque de remboursement anticipé existe pour tous les prêts hypothécaires remboursables par anticipation, conformes ou non. B inverse les rôles : ce sont les RMBS d'AGENCE qui exigent des prêts conformes.",
      ],
      // Variante plus difficile — flux mensuel d'un pass-through : taux pass-through + principal prévu + remboursements anticipés
      [
        "An agency pass-through security is backed by a mortgage pool with a beginning-of-month balance of $200 million and a weighted average mortgage rate of 6.00%. Servicing and guarantee fees total 0.50% per year. This month, borrowers pay $250,000 of scheduled principal and $1,500,000 of prepayments. The total cash flow passed through to investors this month is closest to:",
        ["$1.17 million.", "$2.67 million.", "$2.75 million."],
        1,
        "Taux pass-through = taux hypothécaire − frais = 6,00 % − 0,50 % = 5,50 %. Intérêts versés aux investisseurs = 200 M$ × 5,50 % / 12 = 0,9167 M$. Principal versé = principal prévu + remboursements anticipés = 0,25 + 1,50 = 1,75 M$ (dans un pass-through, tout le principal est reversé). Total ≈ 0,9167 + 1,75 = 2,67 M$. C (2,75 M$) calcule les intérêts au taux hypothécaire de 6,00 % (1,0 M$) en oubliant que les frais de servicing et de garantie sont prélevés avant d'arriver aux investisseurs. A (1,17 M$) oublie les remboursements anticipés, qui sont pourtant intégralement reversés.",
      ],

      // Concept 5 — Extension vs contraction risk (officielle, Reading 67 Q9)
      [
        "A sequential-pay CMO has two tranches. Principal is paid to Tranche S until it is paid off, after which principal is paid to Tranche R. Compared to Tranche R, Tranche S has:",
        [
          "less contraction risk and more extension risk.",
          "more contraction risk and less extension risk.",
          "more contraction risk and more extension risk.",
        ],
        1,
        "Dans un CMO séquentiel, la tranche courte S reçoit TOUT le principal (prévu et anticipé) jusqu'à son remboursement complet. Si les taux baissent et que les remboursements anticipés s'accélèrent, S est remboursée encore plus tôt : elle porte le risque de contraction. Si les remboursements ralentissent, c'est surtout la tranche R, payée en dernier, dont la durée de vie s'allonge : R porte le risque d'extension. A inverse les deux risques. C est faux : le tranching séquentiel RÉPARTIT le risque de remboursement anticipé entre les tranches ; S ne peut pas porter davantage des deux risques à la fois.",
      ],
      // Variante angle différent — le POURQUOI : sens des taux → vitesse des remboursements → coût pour l'investisseur
      [
        "Why is contraction risk unfavorable for an investor in a mortgage pass-through security?",
        [
          "Prepayments accelerate when interest rates fall, so principal is returned early and must be reinvested at lower rates, while the security's price appreciation is limited.",
          "Prepayments accelerate when interest rates rise, so principal is returned early just as the value of the security is falling.",
          "Prepayments slow down when interest rates fall, so the investor's capital remains invested at a below-market coupon for longer than expected.",
        ],
        0,
        "Contraction : les taux baissent → les emprunteurs refinancent → les remboursements anticipés s'accélèrent → le principal revient plus tôt que prévu. L'investisseur doit alors le réinvestir à des taux plus bas, et le prix du titre monte peu malgré la baisse des taux (le principal remboursé au pair plafonne la hausse). Extension, à l'inverse : les taux montent → remboursements plus lents → le capital reste placé au coupon ancien, devenu inférieur au marché. B se trompe de sens : quand les taux montent, les remboursements ralentissent (extension). C se trompe aussi de sens : quand les taux baissent, les remboursements s'accélèrent, et un coupon « inférieur au marché » correspond à une hausse des taux, c'est-à-dire au risque d'extension.",
      ],
      // Variante plus difficile — classer trois situations, dont le balloon risk (CMBS) comme forme de risque d'extension
      [
        "Consider three situations affecting mortgage-backed securities: (1) market mortgage rates fall by 2 percentage points and homeowners refinance massively; (2) a commercial property loan reaches maturity with a large balloon payment, but the borrower cannot refinance it on time because lending conditions have tightened; (3) market rates rise sharply and homeowners stop moving and refinancing. Which of these situations expose the investor to extension risk?",
        ["1 only.", "1 and 3 only.", "2 and 3 only."],
        2,
        "Risque d'extension = principal remboursé plus LENTEMENT que prévu. (1) Les taux baissent, les propriétaires refinancent massivement → remboursements plus rapides → risque de CONTRACTION, pas d'extension. (2) L'emprunteur ne peut ni payer ni refinancer le balloon à l'échéance → le principal est remboursé plus tard que prévu (prolongation, restructuration du prêt) : le balloon risk est une forme de risque d'extension. (3) Les taux montent, les propriétaires ne déménagent plus et ne refinancent plus → remboursements plus lents → extension. Réponse : 2 et 3. A (1 seulement) ne retient que la contraction. B (1 et 3) associe deux situations qui vont en sens opposés et oublie le balloon.",
      ],

      // Concept 6 — CMO : tranche PAC (« tranquille ») vs tranche support (« éponge ») (officielle, Reading 67 Q4)
      [
        "Which of the following statements concerning the support tranche in a planned amortization class (PAC) CMO backed by agency RMBS is least accurate?",
        [
          "The support tranches are exposed to high levels of credit risk.",
          "The purpose of a support tranche is to provide prepayment protection for one or more PAC tranches.",
          "If prepayments are too low to maintain the scheduled PAC payments, the shortfall is provided by the support tranche.",
        ],
        0,
        "Énoncé le MOINS exact : A. Les tranches support d'un CMO adossé à des RMBS d'agence sont exposées à un fort risque de REMBOURSEMENT ANTICIPÉ, pas à un risque de crédit élevé : le risque de crédit des RMBS d'agence est minime (garantie de l'agence ou de la GSE), et le tranching PAC/support redistribue le risque de remboursement, pas le risque de défaut. B est exact : la tranche support existe pour protéger la PAC contre les variations des remboursements. C est exact : si les remboursements sont trop lents, le principal qui irait à la support est d'abord affecté à la PAC pour tenir son échéancier — la support absorbe l'extension.",
      ],
      // Variante angle différent — appliquer : qui absorbe quoi quand les remboursements s'accélèrent (dans la bande)
      [
        "Interest rates fall sharply, and prepayments on the collateral backing a PAC CMO rise well above the expected speed, while remaining within the PAC band. Which outcome is most likely?",
        [
          "The PAC tranche receives its principal faster than scheduled, while the support tranche keeps receiving principal according to its original schedule.",
          "The excess prepayments are shared between the PAC and support tranches in proportion to their outstanding balances.",
          "The PAC tranche continues to receive principal according to its schedule, while the support tranche receives the excess prepayments and its average life shortens.",
        ],
        2,
        "Tant que la vitesse de remboursement reste dans la bande de la PAC, la PAC reçoit son principal selon son échéancier prévu (tranche « tranquille ») : c'est la tranche support (« éponge ») qui reçoit l'excédent de remboursements anticipés, et sa durée de vie raccourcit — elle subit la contraction à la place de la PAC. A inverse les rôles : c'est précisément ce que la structure veut éviter pour la PAC. B décrit une répartition au prorata, comme dans un simple pass-through : il n'y aurait alors aucune protection pour la PAC.",
      ],
      // Variante plus difficile — support épuisée (busted PAC) : le tranching redistribue le risque, il ne le supprime pas
      [
        "A PAC CMO backed by agency RMBS was structured with a PAC band of 100 PSA to 300 PSA. After an extended period of very fast prepayments (around 450 PSA), the support tranche has been fully paid off. Which statement about the PAC tranche is most accurate?",
        [
          "It now receives all principal payments and prepayments, so it is exposed to both contraction and extension risk, because the prepayment risk had only been redistributed, not eliminated.",
          "It remains fully protected as long as future prepayment speeds stay between 100 PSA and 300 PSA, because the PAC band is fixed at issuance.",
          "It now bears a high level of credit risk, because the support tranche no longer absorbs default losses on the mortgages.",
        ],
        0,
        "La tranche support est le « coussin » qui absorbe les variations de remboursements. Une fois qu'elle est entièrement remboursée (après une longue période de remboursements très rapides, au-delà de la bande), plus rien ne protège la PAC : elle reçoit désormais tout le principal, comme un pass-through ou une tranche séquentielle — on parle de « busted PAC » — et devient exposée à la contraction ET à l'extension. C'est le principe de la fiche : le tranching ne réduit pas le risque total du pool, il le répartit ; quand la tranche qui portait ce risque disparaît, il retombe sur la PAC. B est faux : la bande 100–300 PSA ne protège que tant qu'il reste de la tranche support ; ce n'est pas une garantie fixe. C confond risque de remboursement anticipé et risque de crédit : dans un CMO adossé à des RMBS d'agence, la support ne sert pas à absorber des pertes de défaut.",
      ],

      // Concept 7 — Qualité de crédit des prêts hypothécaires : recours, LTV, DTI, DSCR (officielle, Reading 67 Q5)
      [
        "Strategic default by a mortgage borrower is most likely if the loan is:",
        ["non-amortizing.", "non-conforming.", "non-recourse."],
        2,
        "Sur un prêt sans recours (non-recourse), le prêteur ne peut saisir que le bien financé, pas les autres actifs de l'emprunteur. Si la valeur du bien tombe nettement sous le principal restant dû (LTV > 100 %), l'emprunteur a intérêt à faire un « défaut stratégique » : il cède le bien plutôt que de continuer à payer, même s'il en a les moyens. A : un prêt non amortissable (interest-only) ne réduit pas le principal, ce qui aggrave la situation si les prix baissent, mais ce n'est pas lui qui crée l'incitation — avec recours, le prêteur pourrait poursuivre l'emprunteur sur ses autres actifs. B : un prêt non conforme ne respecte pas les critères des agences (montant, LTV, DTI…) ; il est plus risqué, mais cela ne concerne pas l'incitation au défaut stratégique.",
      ],
      // Variante angle différent — inverser le calcul : prêt maximal compatible avec les limites de LTV et de DTI
      [
        "A lender limits residential mortgages to a maximum loan-to-value (LTV) ratio of 80% and a maximum debt-to-income (DTI) ratio of 36%, where DTI is the monthly mortgage payment divided by gross monthly income. A borrower with a gross monthly income of $9,000 wants to buy a $500,000 house. At current rates, the monthly payment is $9.00 per $1,000 borrowed. The maximum loan the lender will grant is closest to:",
        ["$288,000.", "$360,000.", "$400,000."],
        1,
        "Il faut respecter les DEUX limites et retenir la plus contraignante. Limite LTV : prêt ≤ 80 % × 500 000 = 400 000 $. Limite DTI : mensualité ≤ 36 % × 9 000 = 3 240 $ → prêt ≤ 3 240 / 9,00 × 1 000 = 360 000 $. Le prêt maximal est donc 360 000 $ (contrainte DTI), soit un LTV effectif de 72 %. Rappel : LTV = montant du prêt / valeur du bien ; DTI = mensualités de dette / revenu brut ; plus ils sont BAS, meilleure est la qualité de crédit. C (400 000 $) n'applique que la limite LTV : la mensualité serait alors de 3 600 $, soit un DTI de 40 % > 36 %. A (288 000 $) applique les deux ratios l'un sur l'autre (80 % × 360 000) au lieu de retenir la plus basse des deux limites.",
      ],
      // Variante plus difficile — refinancer un balloon de CMBS : tests DSCR et LTV combinés, puis nature du risque
      [
        "A CMBS loan has a $20 million balloon payment due at maturity, which the borrower plans to refinance. At that date, the property's net operating income (NOI) is $1.8 million and its appraised value is $25 million. New lenders require a debt service coverage ratio (DSCR) of at least 1.25 and a loan-to-value (LTV) ratio of no more than 75%, and annual debt service on a new loan would equal 9% of the loan amount. Which statement is most accurate?",
        [
          "The borrower can refinance up to $18.75 million; the $1.25 million shortfall creates balloon risk, which is a form of contraction risk.",
          "The borrower can refinance only up to $16.0 million; the $4.0 million shortfall creates balloon risk, which is a form of extension risk.",
          "The borrower can refinance the full $20 million, because the property's NOI of $1.8 million exactly covers the $1.8 million of annual debt service on a new $20 million loan.",
        ],
        1,
        "Le nouveau prêt doit passer les deux tests. LTV : prêt ≤ 75 % × 25 M$ = 18,75 M$. DSCR (NOI / service de la dette, plus il est élevé, mieux c'est) : service de la dette ≤ 1,8 / 1,25 = 1,44 M$ → prêt ≤ 1,44 / 9 % = 16,0 M$. Le plafond est le plus bas des deux : 16,0 M$, d'où un manque de 20 − 16 = 4,0 M$ pour rembourser le balloon. L'emprunteur ne peut pas refinancer à temps : c'est le balloon risk, une forme de risque d'EXTENSION (le principal est remboursé plus tard que prévu, souvent via une prolongation du prêt). A n'applique que le test LTV et se trompe de risque (la contraction, c'est un remboursement plus rapide que prévu). C prend un DSCR de 1,0 pour acceptable : sur 20 M$, le service de la dette serait 1,8 M$ = NOI, soit un DSCR de 1,0 < 1,25, avec en plus un LTV de 80 % > 75 %.",
      ],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "quizzes");
  console.log("Drill QCM — Fiche Fixed Income Page 8...");
  const total = await syncQuizSets({ ownerId, folderId, sets: QUIZ_SETS });
  console.log(`\n✅ Terminé. ${total} questions synchronisées.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
