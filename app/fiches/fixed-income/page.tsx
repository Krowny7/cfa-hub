"use client";

import Link from "next/link";
import { FCard, Rule, Formula, Sec, Reading, FTable } from "@/components/fiche";

const NAV = [
  { id: "r47", label: "R47" }, { id: "r48", label: "R48" }, { id: "r49", label: "R49" },
  { id: "r50", label: "R50" }, { id: "r51", label: "R51" }, { id: "r52", label: "R52" },
  { id: "r53", label: "R53" }, { id: "r54", label: "R54" }, { id: "r55", label: "R55" },
  { id: "r56", label: "R56" }, { id: "r57", label: "R57" }, { id: "r58", label: "R58" },
  { id: "r59", label: "R59" }, { id: "r60", label: "R60" }, { id: "r61", label: "R61" },
  { id: "r62", label: "R62" }, { id: "r63", label: "R63" }, { id: "r64", label: "R64" },
  { id: "r65", label: "R65" },
];

export default function FixedIncomeFiche() {
  return (
    <>
      {/* Sticky sub-nav */}
      <div className="sticky top-12 z-40 -mx-4 md:-mx-8 px-4 md:px-8 bg-neutral-950/95 backdrop-blur border-b border-white/[0.07] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center gap-0.5 h-11 min-w-max">
          <Link href="/fiches" className="text-[11px] font-semibold uppercase tracking-wider text-white/25 hover:text-white/50 transition-colors shrink-0 mr-3">
            ← Fiches
          </Link>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/25 shrink-0 mr-2">FI ·</span>
          {NAV.map(({ id, label }) => (
            <a key={id} href={`#${id}`}
              className="text-[12px] font-medium text-muted hover:text-white/80 whitespace-nowrap px-2 py-1 rounded-full hover:bg-white/5 transition-colors">
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* Hero */}
      <div className="mt-8 mb-10 pb-8 border-b border-white/[0.07]">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-blue-300 mb-2">CFA Level I – Book 3</div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Fixed Income</h1>
        <p className="text-sm text-white/50 mb-4">Readings 47–65 · Concepts clés et formules.</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            ["#r47","R47 – Instrument Features"],["#r48","R48 – Cash Flows & Types"],
            ["#r49","R49 – Issuance & Trading"],["#r50","R50 – Corporate Markets"],
            ["#r51","R51 – Gov. Markets"],["#r52","R52 – Bond Valuation"],
            ["#r53","R53 – Yield Measures FRB"],["#r54","R54 – Yield Measures FRN"],
            ["#r55","R55 – Term Structure"],["#r56","R56 – Interest Rate Risk"],
            ["#r57","R57 – Duration"],["#r58","R58 – Convexity"],
            ["#r59","R59 – Curve-Based Risk"],["#r60","R60 – Credit Risk"],
            ["#r61","R61 – Credit Gov."],["#r62","R62 – Credit Corp."],
            ["#r63","R63 – Securitisation"],["#r64","R64 – ABS"],["#r65","R65 – MBS"],
          ].map(([href, label]) => (
            <a key={href} href={href}
              className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.10] text-white/50 hover:text-blue-300 hover:border-blue-400/30 hover:bg-blue-400/8 transition-colors">
              {label}
            </a>
          ))}
        </div>
      </div>

<Reading id="r47" number="Reading 47" title="Fixed-Income Instrument Features">

  <Sec los="LOS 47.a" label="Caractéristiques fondamentales">
    <FCard title="Éléments d'une obligation" en="Basic bond features">
      <ul className="list-disc pl-5 space-y-1 text-sm">
        <li><strong>Par value (face value)</strong> : montant remboursé à l&apos;échéance, typiquement 1 000 $.</li>
        <li><strong>Coupon rate</strong> : taux annuel en % du par. Coupon annuel = coupon rate × par. Semestriel = coupon rate / 2 × par. Ex : bond 6% semi sur 1 000 $ → 30 $ par période (bond = 6% annual coupon bond).</li>
        <li><strong>FRN</strong> : coupon = MRR + marge (en bps). Ex : MRR 2,3% + 75 bps, trimestriel → (2,3% + 0,75%) / 4 = 0,7625% du par.</li>
        <li><strong>Maturité d&apos;origine</strong> : money market = maturité d&apos;origine ≤ 1 an. Capital market {'>'} 1 an. Perpétuelle = sans échéance.</li>
        <li><strong>Zero-coupon</strong> : aucun coupon, émis à discount. Ne peut jamais se vendre à prime si les taux {'>'} 0.</li>
      </ul>
      <Rule c="red"><strong>Piège exam</strong> : money market = maturité <em>d&apos;origine</em> ≤ 1 an. Une obligation émise il y a 18 mois avec 6 mois restants N&apos;est PAS un money market instrument (maturité d&apos;origine = 2 ans).</Rule>
    </FCard>

    <FCard title="Émetteurs et sources de remboursement" en="Issuer types and repayment sources">
      <FTable
        headers={["Émetteur", "Source de remboursement"]}
        rows={[
          ["Souverain (État)", "Revenus fiscaux (impôts)"],
          ["Local gov (villes, régions)", "Impôts locaux ou revenus d'infrastructure"],
          ["Corporate secured", "Cash flows opérationnels + collatéral (lien sur actifs)"],
          ["Corporate unsecured (debenture US)", "Cash flows opérationnels uniquement"],
          ["SPE / ABS", "Cash flows du pool d'actifs sous-jacents"],
        ]}
      />
    </FCard>

    <FCard title="Prix et rendement — notions de base" en="Price, yield and seniority">
      <ul className="list-disc pl-5 space-y-1 text-sm">
        <li><strong>Premium</strong> : prix {'>'} par → YTM {'<'} coupon rate</li>
        <li><strong>Discount</strong> : prix {'<'} par → YTM {'>'} coupon rate</li>
        <li><strong>Au pair</strong> : prix = par → YTM = coupon rate</li>
        <li>Seniority : senior secured {'>'} senior unsecured {'>'} junior / subordonné</li>
      </ul>
      <Rule c="amber">Courbe normale = pente positive (taux longs {'>'} taux courts). Courbe inversée = taux courts {'>'} taux longs.</Rule>
    </FCard>
  </Sec>

  <Sec los="LOS 47.b" label="Indenture et Covenants">
    <FCard title="Indenture" en="Bond indenture">
      L&apos;<strong>indenture</strong> est le contrat légal complet qui régit l&apos;obligation. Il contient les features du bond, les covenants, les sources de remboursement et les droits des porteurs. L&apos;indenture <em>ne précise pas</em> l&apos;identité du prêteur (les porteurs sont anonymes et changeants). L&apos;indenture ne précise pas non plus le <strong>rating</strong> du bond (celui-ci est attribué par des agences externes, pas par contrat).
    </FCard>

    <FCard title="Affirmative vs Negative covenants" en="Affirmative vs negative covenants">
      <FTable
        headers={["Type", "Définition", "Exemples testés à l'exam"]}
        rows={[
          ["Affirmative", "Actions que l'émetteur DOIT faire", "Maintenir l'assurance sur actifs en collatéral · Payer impôts · Fournir états financiers · Cross-default · Pari passu"],
          ["Negative", "Actions que l'émetteur NE DOIT PAS faire", "Pas de dette supplémentaire · Pas de vente d'actifs · Negative pledge clause · Restriction dividendes"],
        ]}
      />
      <Rule c="red"><strong>Mnémo</strong> : Affirmative = AGIR (obligation d&apos;agir). Negative = INTERDIRE (restriction). &quot;Maintenir l&apos;assurance&quot; = affirmative. &quot;Pas de nouvelle dette&quot; = negative. &quot;No additional debt&quot; = negative covenant.</Rule>
    </FCard>
  </Sec>

</Reading>

<Reading id="r48" number="Reading 48" title="Fixed-Income Cash Flows and Types">

  <Sec los="LOS 48.a" label="Structures de remboursement et coupon">
    <FCard title="Bullet, amortizing, sinking fund" en="Principal repayment structures">
      <FTable
        headers={["Structure", "Description", "Calcul / Exemple"]}
        rows={[
          ["Bullet", "Principal intégral à l'échéance, coupons périodiques", "PMT = coupon seulement"],
          ["Fully amortizing", "Paiements égaux = coupon + principal à chaque période", "N=5, I/Y=5, PV=1000, FV=0 → PMT = 230,97 $"],
          ["Partially amortizing", "Paiements partiels + balloon payment à maturité", "N=5, I/Y=5, PV=1000, FV=-200 → PMT = 194,78 $"],
          ["Sinking fund", "Émetteur doit rembourser une fraction chaque année (via rachat ou remboursement au pair)", "Redemption risk : si prix > pair, investisseur préfère ne PAS être remboursé"],
        ]}
      />
    </FCard>

    <FCard title="Structures de coupon particulières" en="Special coupon structures">
      <ul className="list-disc pl-5 space-y-1 text-sm">
        <li><strong>FRN</strong> : coupon = MRR + marge. <strong>Cap</strong> = plafond (avantage émetteur, désavantage investisseur). <strong>Floor</strong> = plancher (avantage investisseur, désavantage émetteur). FRN semi-annuel : coupon = (MRR + marge) / 2 × par. Collar = cap + floor.</li>
        <li><strong>Step-up coupon</strong> : coupon augmente selon un <em>calendrier prédéfini</em> (pas selon un taux de marché).</li>
        <li><strong>Credit-linked note</strong> : coupon augmente si la qualité crédit de l&apos;émetteur se dégrade.</li>
        <li><strong>PIK (Payment-In-Kind)</strong> : intérêts payés en nouvelles obligations, pas de cash.</li>
        <li><strong>TIPS (capital-indexed)</strong> : coupon rate <em>fixe</em>, principal ajusté à l&apos;inflation. À la déflation, remboursement ≥ principal nominal d&apos;émission.</li>
        <li><strong>Deferred coupon</strong> : pas de coupons pendant une période initiale, puis paiements réguliers. Premier versement = intérêts accumulés.</li>
        <li><strong>Zero-coupon</strong> : un seul paiement à maturité. Élimine le risque de réinvestissement. Ne peut jamais dépasser le pair si taux {'>'} 0.</li>
      </ul>
      <Formula>
        TIPS — Exemple : par 100 000 $, coupon 4% semestriel, inflation annuelle 2,5%{"\n"}
        Ajustement 6 mois = 2,5% / 2 = 1,25%{"\n"}
        Principal ajusté = 100 000 × 1,0125 = 101 250 ${"\n"}
        Coupon = 101 250 × 4% / 2 = 2 025 $
      </Formula>
    </FCard>

    <FCard title="Options embarquées" en="Embedded options">
      <FTable
        headers={["Option", "Bénéficiaire", "Impact vs straight bond", "YTM"]}
        rows={[
          ["Call (callable)", "Émetteur", "Prix INFÉRIEUR — plafond au call price", "Plus ÉLEVÉ (compensation risque rachat)"],
          ["Put (putable)", "Investisseur", "Prix SUPÉRIEUR", "Plus FAIBLE (investisseur paie l'option)"],
          ["Conversion (convertible)", "Investisseur", "Prix SUPÉRIEUR", "Plus FAIBLE"],
        ]}
      />
      <Rule c="red">Hausse de volatilité des taux : <strong>put option</strong> plus valuable → putable bond vaut plus. <strong>Call option</strong> plus valuable pour l&apos;émetteur → callable bond vaut <em>moins</em> pour l&apos;investisseur. Les deux options gagnent en valeur, mais l&apos;impact sur le prix du bond est <em>opposé</em>.</Rule>
      <Rule c="blue">Styles d&apos;exercice : <strong>European</strong> = date unique. <strong>American</strong> = tout moment après first call date. <strong>Bermuda</strong> = premier business day de chaque mois après first call date.</Rule>
    </FCard>

    <FCard title="Convertibles — formules" en="Convertible bond formulas">
      <Formula>
        Conversion ratio = Par value / Prix de conversion{"\n"}
        Ex : par 1 000 $, prix conversion 40 $ → ratio = 25 actions{"\n\n"}
        Conversion value = Ratio × Cours de l&apos;action{"\n"}
        Ex : 25 actions × 50 $ = 1 250 $
      </Formula>
    </FCard>
  </Sec>

  <Sec los="LOS 48.b" label="Réglementation, marchés et fiscalité">
    <FCard title="Domestic, Foreign, Eurobond, Global" en="Bond markets by jurisdiction">
      <FTable
        headers={["Type", "Émetteur", "Marché d'émission", "Devise"]}
        rows={[
          ["Domestic bond", "Pays X", "Pays X", "Devise de X"],
          ["Foreign bond", "Étranger", "Pays X (Yankee=USD, Samurai=JPY, Bulldog=GBP)", "Devise de X"],
          ["Eurobond", "N'importe quel pays", "Hors toute juridiction nationale", "N'importe quelle devise"],
          ["Global bond", "Gros émetteurs", "Eurobond + ≥ 1 marché domestique", "Variable"],
        ]}
      />
      <Rule c="blue">Euros émis EN Allemagne = domestic bond. USD émis à Londres par firme brésilienne = Eurobond. Eurobond ≠ bond en euros ≠ bond européen. Le nom vient du marché d&apos;émission, pas de la devise.</Rule>
    </FCard>

    <FCard title="Fiscalité des obligations" en="Bond income taxation">
      <ul className="list-disc pl-5 space-y-1 text-sm">
        <li>Revenus de coupon → imposés comme <strong>revenu ordinaire</strong> (taux marginal).</li>
        <li>Plus-values (vente avant maturité) → taux des <strong>plus-values</strong> (généralement inférieur).</li>
        <li>Municipal bonds US : exonérés d&apos;impôt fédéral et souvent d&apos;impôt d&apos;État local.</li>
        <li><strong>OID bonds</strong> (zero-coupon émis à discount) : l&apos;appréciation vers le pair = <strong>revenu d&apos;intérêts</strong> taxé annuellement, même sans flux cash reçu.</li>
      </ul>
    </FCard>
  </Sec>

</Reading>

<Reading id="r49" number="Reading 49" title="Fixed-Income Issuance and Trading">

  <Sec los="LOS 49.a" label="Segments du marché et investisseurs">
    <FCard title="Segmentation du marché obligataire" en="Bond market segmentation">
      <FTable
        headers={["Critère", "Catégories"]}
        rows={[
          ["Type d'émetteur", "Souverains, corporates, SPE / ABS"],
          ["Qualité crédit", "Investment grade (S&P ≥ BBB- / Moody's ≥ Baa3) vs High yield (S&P ≤ BB+ / Moody's ≤ Ba1)"],
          ["Maturité d'origine", "Short-term < 1 an (money market) · Intermédiaire 1–10 ans · Long terme > 10 ans"],
        ]}
      />
      <Rule c="amber"><strong>Fallen angels</strong> : obligations anciennement IG dégradées en HY. Les fonds IG mandatés doivent les vendre → pression baissière sur les prix.</Rule>
    </FCard>

    <FCard title="Positionnement des investisseurs" en="Investor positioning in credit/maturity spectrum">
      <FTable
        headers={["Investisseur", "Positionnement", "Raison"]}
        rows={[
          ["Pension funds, Assurances", "Long terme, Investment Grade", "Matching des engagements (pensions / sinistres). Souvent interdits d'acheter du HY."],
          ["Banques centrales", "Intermédiaire, Treasuries", "Politique monétaire (gestion réserves bancaires)"],
          ["Corporates", "Court terme, IG (CP, repos, ABCP)", "Gestion trésorerie excédentaire"],
          ["Bond funds / ETFs", "Intermédiaire IG (hors Treasuries)", "Mandate"],
          ["Asset managers, Hedge funds", "High yield intermédiaire", "Recherche de rendement"],
          ["Distressed debt funds", "Très bas rating, near default", "Arbitrage crédit / restructuring"],
        ]}
      />
    </FCard>
  </Sec>

  <Sec los="LOS 49.b" label="Indices obligataires">
    <FCard title="FI Index vs Equity Index" en="Fixed-income vs equity indexes">
      <FTable
        headers={["Caractéristique", "FI Index", "Equity Index"]}
        rows={[
          ["Nb de constituants", "Très élevé (un émetteur = des dizaines de bonds)", "Plus faible"],
          ["Turnover", "Élevé (bonds maturent et sont remplacés fréquemment)", "Plus faible"],
          ["Poids sectoriel", "Large poids souverain (État = plus gros emprunteur)", "Poids corporate uniquement"],
          ["Réplication par les tracker funds", "Sampling (trop complexe à tout acheter)", "Réplication complète possible"],
        ]}
      />
      <Rule c="blue"><strong>Aggregate index</strong> (ex : Bloomberg Barclays Agg) = large spectre, IG uniquement (exclut HY et non-notés), présent dans 28+ devises. Benchmark doit correspondre à l&apos;exposition du fonds en secteur, crédit et maturité.</Rule>
    </FCard>
  </Sec>

  <Sec los="LOS 49.c" label="Marchés primaires et secondaires">
    <FCard title="Marché primaire — mécanismes d'émission" en="Primary market mechanisms">
      <FTable
        headers={["Mécanisme", "Description", "Qui ?"]}
        rows={[
          ["Underwritten offering", "Banque garantit le prix d'émission (prend le risque sur son bilan)", "IG, souverains"],
          ["Best-efforts", "Banque vend en commission, pas de garantie de prix", "HY, petits émetteurs"],
          ["Private placement", "Vente à un seul investisseur ou groupe limité, sans enregistrement public", "Tout émetteur"],
          ["Shelf registration", "Enregistrement global en avance, émissions par tranches sur plusieurs années", "Grands émetteurs répétés"],
          ["Auction", "Soumissions compétitives : single-price (Dutch) ou multiple-price", "Souverains uniquement"],
        ]}
      />
      <Rule c="amber"><strong>Debut issuer</strong> (première émission) → roadshows obligatoires (semaines). <strong>Repeat issuer</strong> avec shelf registration → émission en quelques heures. Best-efforts = commission basis (pas de garantie de prix).</Rule>
    </FCard>

    <FCard title="Marché secondaire — OTC dealer market" en="Secondary market">
      <ul className="list-disc pl-5 space-y-1 text-sm">
        <li>Majorité des transactions <strong>OTC (over-the-counter)</strong>, pas sur exchanges.</li>
        <li>Dealers cotent <strong>bid</strong> (prix d&apos;achat) et <strong>ask/offer</strong> (prix de vente). Spread bid-ask = coût de transaction.</li>
        <li><strong>On-the-run</strong> : émission la plus récente dans une maturité donnée → spreads très étroits.</li>
        <li><strong>Seasoned / off-the-run</strong> : émissions plus anciennes, moins liquides → spreads 10–20+ bps.</li>
        <li><strong>Distressed debt</strong> : bonds d&apos;émetteurs en faillite imminente, achetés par fonds spécialisés.</li>
      </ul>
      <Rule c="blue">Spread bid-ask large → bond <strong>illiquide</strong>. Ex : 96,25 bid / 96,75 ask = spread 50 cts = relativement illiquide. Large spread peut refléter illiquidité ET risque crédit.</Rule>
    </FCard>
  </Sec>

</Reading>

<Reading id="r50" number="Reading 50" title="Fixed-Income Markets for Corporate Issuers">

  <Sec los="LOS 50.a" label="Financement court terme — corporates et banques">
    <FCard title="Lignes de crédit et financement corporate" en="Corporate short-term funding">
      <FTable
        headers={["Type", "Fiabilité", "Coût", "Particularité"]}
        rows={[
          ["Uncommitted line", "Aucune garantie", "Le + bas", "Banque peut refuser à tout moment"],
          ["Committed line", "Garantie pour la durée", "Moyen (commitment fee)", "Frais sur partie non tirée"],
          ["Revolving (operating) line", "Le + fiable", "Le + élevé", "Long terme, covenants restrictifs placés par la banque"],
        ]}
      />
      <ul className="list-disc pl-5 text-sm mt-2 space-y-1">
        <li><strong>Secured (asset-backed) loans</strong> : collatéral = actifs fixes, créances, stocks. Pour émetteurs à rating faible.</li>
        <li><strong>Factoring</strong> : transfert des créances à un &quot;factor&quot; à escompte ; taux dépend de la qualité des clients.</li>
        <li><strong>Commercial Paper (CP)</strong> : dette non sécurisée, maturité typique {'<'} 3 mois, émis à discount. Rollover risk → mitigation par <strong>backup lines of credit</strong>. <em>Bridge financing</em> = CP temporaire avant émission long terme.</li>
        <li><strong>Eurocommercial paper (ECP)</strong> : marché international, moins liquide que le CP américain.</li>
      </ul>
      <Rule c="red">Rollover risk : si le marché se ferme lors du renouvellement du CP, l&apos;émetteur entre en crise de liquidité. Les backup lines permettent de rembourser le CP à maturité si besoin.</Rule>
    </FCard>

    <FCard title="Financement court terme des banques" en="Financial institution short-term funding">
      <ul className="list-disc pl-5 text-sm space-y-1">
        <li><strong>Dépôts</strong> : checking (demand deposits, sans intérêt), operational deposits (cash mgmt/custody), savings deposits (terme + taux fixé).</li>
        <li><strong>CD (Certificate of Deposit)</strong> : savings deposit portant intérêt.
          <ul className="list-disc pl-8">
            <li><em>Nonnegotiable CD</em> : non cessible avant maturité → pénalité de retrait anticipé.</li>
            <li><em>Negotiable CD</em> : cessible sur le marché secondaire (domestic bond + Eurobond) → source de financement wholesale importante.</li>
          </ul>
        </li>
        <li><strong>Interbank funds</strong> : prêts entre banques, 1 jour à 1 an, sécurisés (repo) ou non sécurisés, au MRR (ex : SOFR).</li>
        <li><strong>Central bank funds market</strong> : banques à excès de réserves prêtent aux banques déficitaires au <em>central bank funds rate</em>. Lender of last resort = discount window (taux plus élevé, scrutin accru).</li>
        <li><strong>ABCP (Asset-Backed CP)</strong> : banque transfère collatéral à un SPE off-balance-sheet → SPE émet du CP adossé + backup credit liquidity line fournie par la banque.</li>
      </ul>
    </FCard>
  </Sec>

  <Sec los="LOS 50.b" label="Repurchase agreements (repos)">
    <FCard title="Mécanisme et formules repo" en="Repo mechanism and formulas">
      Un <strong>repo</strong> = vente d&apos;un titre avec engagement de rachat à date et prix futurs prédéfinis. Économiquement = emprunt collatéralisé.
      <Formula>
        Prix d&apos;achat (loan amount) = Valeur marché collatéral / Initial margin{"\n"}
        Ex : MV = 1 000 000 $, initial margin = 103%{"\n"}
        Prix d&apos;achat = 1 000 000 / 1,03 = 970 874 ${"\n\n"}
        Prix de rachat = Prix d&apos;achat × [1 + (repo rate × T/360)]{"\n"}
        Ex : repo rate 2%, T = 90 jours{"\n"}
        Prix de rachat = 970 874 × [1 + (0,02 × 90/360)] = 975 728 ${"\n\n"}
        Haircut = 1 − 1/initial margin{"\n"}
        Ex : haircut = 1 − 1/1,03 = 2,91%{"\n\n"}
        Variation margin : si MV collatéral baisse sous (initial margin × adjusted purchase price){"\n"}
        → l&apos;emprunteur doit poster du collatéral supplémentaire
      </Formula>
      <Rule c="blue">Overnight repo = 1 jour. Term repo = durée fixée. Reverse repo = côté prêteur de cash / emprunteur de titres. Tri-party repo = custodian bank intermédiaire (réduit settlement/margining risk, pas le default risk).</Rule>
    </FCard>

    <FCard title="Facteurs du repo rate et usages" en="Repo rate factors and uses">
      <FTable
        headers={["Facteur", "Effet sur le repo rate"]}
        rows={[
          ["Durée plus longue (term vs overnight)", "Plus élevé"],
          ["Qualité collatéral plus faible", "Plus élevé"],
          ["Collatéral en forte demande / rare", "Plus bas (parfois négatif)"],
          ["Sous-collatéralisé ou non livré", "Plus élevé"],
        ]}
      />
      <ul className="list-disc pl-5 text-sm mt-2 space-y-1">
        <li><strong>Usages</strong> : financer des positions en titres (emprunteur) ; placer de la liquidité (prêteur) ; banques centrales pour politique monétaire (achat = expansionniste) ; short sellers (reverse repo pour emprunter des titres).</li>
        <li><strong>Risques</strong> : default, collateral, margining, légal, netting/settlement.</li>
      </ul>
    </FCard>
  </Sec>

  <Sec los="LOS 50.c" label="IG vs High-Yield — financement long terme">
    <FCard title="Comparaison IG vs HY" en="Investment grade vs high yield">
      <FTable
        headers={["Caractéristique", "Investment Grade (≥ BBB-)", "High Yield (≤ BB+)"]}
        rows={[
          ["Risque principal investisseur", "Downgrade (pas défaut imminent)", "Défaut et loss given default"],
          ["Part spread dans le yield", "Faible (yield ≈ taux benchmark)", "Élevée (spread = part majeure)"],
          ["Covenants", "Peu restrictifs", "Nombreux (ratios dette, dividendes, dette additionnelle)"],
          ["Maturité", "Toutes maturités, standardisé", "Souvent ≤ 10 ans, moins standardisé"],
          ["Call/prepayment", "Moins fréquent", "Souvent callable ou leveraged loans"],
          ["Rendement vs actions", "Peu corrélé", "Equity-like en période de stress"],
        ]}
      />
      <Rule c="red">Piège exam : IG issuers ont une maturité PLUS LONGUE que HY (HY ≤ 10 ans). Le spread IG est une petite fraction du yield (dominé par le taux benchmark). Le spread HY est la majeure partie du yield.</Rule>
    </FCard>
  </Sec>

</Reading>

<Reading id="r51" number="Reading 51" title="Fixed-Income Markets for Government Issuers">

  <Sec los="LOS 51.a" label="Émetteurs souverains et non-souverains">
    <FCard title="Dette souveraine — développés vs émergents" en="Sovereign debt">
      <ul className="list-disc pl-5 space-y-1 text-sm">
        <li><strong>Souverain</strong> = financement par le pouvoir fiscal (impôts) → rating le plus élevé sur le marché domestique, plus grand émetteur.</li>
        <li><strong>Developed market</strong> : économie stable et diversifiée, politique fiscale transparente, dette en <em>reserve currency</em> (USD, EUR, CNY, etc.).</li>
        <li><strong>Emerging market</strong> : économie plus concentrée, revenus fiscaux moins stables, debt peut être <em>domestic</em> (devise locale, détenu par résidents) ou <em>external</em> (créanciers étrangers, souvent en devise étrangère).</li>
        <li><strong>Dette externe en devise étrangère</strong> : évite le risque de change direct pour l&apos;investisseur étranger, mais crée un <em>risque de change indirect</em> (le souverain doit générer des devises pour rembourser).</li>
        <li><strong>Avantages d&apos;une gamme large de maturités souveraines</strong> : courbe des taux de référence, collatéral repo, outil de politique monétaire pour la banque centrale.</li>
      </ul>
      <Rule c="blue">Mnémo : Investisseurs à objectifs &quot;non-économiques&quot; = banques centrales (politique monétaire), gouvernements étrangers (réserves), institutions financières (réglementation). Ces acheteurs captifs → yields souverains {'<'} autres émetteurs de même qualité.</Rule>
    </FCard>

    <FCard title="Obligations non-souveraines, quasi-gov et supranationales" en="Nonsovereign, agency and supranational bonds">
      <FTable
        headers={["Type", "Émetteur", "Source remboursement", "Exemple"]}
        rows={[
          ["Nonsovereign gov bonds", "États, provinces, municipalités", "Pouvoir fiscal local ou revenus d'infrastructure", "Bonds de l'État de Californie"],
          ["Agency / quasi-gov bonds", "Entités créées par un État pour mission spécifique", "Fees métier + soutien implicite de l'État", "Ginnie Mae (USA) — securitise des prêts hypothécaires"],
          ["GO bonds (General Obligation)", "Collectivités locales", "Pouvoir fiscal général (capacité à lever des impôts)", "Bonds municipaux adossés aux impôts locaux"],
          ["Revenue bonds", "Collectivités locales", "Revenus d'un projet spécifique (péages, hôpital)", "Bonds pour financer un aéroport"],
          ["Supranational bonds", "FMI, Banque Mondiale, Banque Asiatique de Développement", "Contributions des États membres", "Bonds FMI = supranationaux (pas quasi-gov)"],
        ]}
      />
      <Rule c="amber">Piège exam : Bonds FMI / Banque Mondiale = <strong>supranationaux</strong>, PAS quasi-gouvernementaux. Quasi-gov = entité créée par UN État. Supranational = créée par PLUSIEURS États souverains. Revenue bonds sont plus risqués que GO bonds car limités aux flux du projet.</Rule>
    </FCard>
  </Sec>

  <Sec los="LOS 51.b" label="Adjudications souveraines et marché secondaire">
    <FCard title="Mécanique des adjudications" en="Government bond auction mechanics">
      <ul className="list-disc pl-5 text-sm space-y-1">
        <li><strong>Étape 1 — Allocation aux non-competitive bidders d&apos;abord</strong> : garanti d&apos;être servi au prix déterminé par les offres compétitives.</li>
        <li><strong>Étape 2 — Classement des competitive bids</strong> : du prix le plus élevé (rendement le plus bas) au plus bas, jusqu&apos;à concurrence du montant offert.</li>
        <li><strong>Cut-off yield</strong> = rendement de la dernière offre compétitive acceptée (prix le plus bas = rendement le plus élevé accepté).</li>
        <li><strong>Single-price auction</strong> : TOUS les adjudicataires (y compris compétitifs) paient le prix associé au cut-off yield. Préféré pour réduire la volatilité et distribuer largement.</li>
        <li><strong>Multiple-price auction</strong> : chaque compétitif paie son propre prix soumis (winner&apos;s curse possible → bids groupés et élevés).</li>
      </ul>
      <Rule c="red">Ordre d&apos;allocation : non-compétitifs EN PREMIER (garantis), puis compétitifs du meilleur prix au cut-off. Seuls les non-compétitifs ont une allocation garantie dans les DEUX types d&apos;enchères.</Rule>
    </FCard>

    <FCard title="Primary dealers et marché secondaire" en="Primary dealers and secondary market">
      <ul className="list-disc pl-5 text-sm space-y-1">
        <li><strong>Primary dealers</strong> = institutions financières désignées par le souverain, qui ont l&apos;obligation de : (1) soumettre des offres compétitives aux adjudications, (2) soumettre des offres pour le compte de tiers, (3) agir comme contrepartie de la banque centrale dans les opérations de politique monétaire.</li>
        <li><strong>Marché secondaire</strong> : OTC dealer market, similaire aux obligations corporate. Les obligations les plus récemment émises pour une maturité donnée = <strong>on-the-run bonds</strong> (les plus actives, spread le plus étroit).</li>
        <li><strong>On-the-run yields</strong> = référence de taux sans risque pour la construction des courbes de taux.</li>
      </ul>
    </FCard>
  </Sec>

</Reading>

<Reading id="r52" number="Reading 52" title="Fixed-Income Bond Valuation: Prices and Yields">

  <Sec los="LOS 52.a" label="Calcul du prix d&apos;une obligation">
    <FCard title="Formule et calculatrice — obligations annuelles et semi-annuelles" en="Bond pricing formula and calculator">
      <Formula>
        Obligation annuelle — 5 ans, coupon 10%, YTM = 8%{"\n"}
        N = 5 ; PMT = 10 ; FV = 100 ; I/Y = 8 → PV = −107,99 (prime : coupon {'>'} YTM){"\n\n"}
        Obligation annuelle — 5 ans, coupon 10%, YTM = 12%{"\n"}
        N = 5 ; PMT = 10 ; FV = 100 ; I/Y = 12 → PV = −92,79 (discount : coupon {'<'} YTM){"\n\n"}
        Obligation semi-annuelle — 5 ans, coupon 10%, YTM = 8%{"\n"}
        N = 10 ; PMT = 5 ; FV = 100 ; I/Y = 4 → PV = −108,11{"\n"}
        YTM annoncé = 4% × 2 = 8% (stated annualized YTM = taux période × nb périodes/an){"\n\n"}
        Calcul du YTM depuis le prix — semi-annuel, prix = 105{"\n"}
        N = 10 ; PMT = 5 ; FV = 100 ; PV = −105 → I/Y = 4,37% → YTM = 4,37% × 2 = 8,74%{"\n"}
        (PV doit être négatif — signe opposé à PMT et FV)
      </Formula>
      <Rule c="green">YTM {'<'} coupon → prime (P {'>'} par). YTM {'>'} coupon → discount (P {'<'} par). YTM = coupon → au pair. Pour gagner le YTM : détenir jusqu&apos;à maturité + réinvestir coupons au YTM + pas de défaut.</Rule>
    </FCard>

    <FCard title="Prix plein, prix pied de coupon et coupon couru" en="Full price, flat price, accrued interest">
      <Formula>
        Coupon couru (AI) = Coupon période × (jours depuis dernier coupon / jours dans la période){"\n\n"}
        Prix plein (dirty / invoice price) = Prix pied de coupon (flat / clean) + AI{"\n"}
        Prix coté = flat price. Transaction réglée au full price.{"\n\n"}
        Day count : actual/actual pour obligations souveraines{"\n"}
        {'             '}30/360 pour obligations corporate (convention d&apos;exam){"\n\n"}
        Calcul du full price entre deux coupons :{"\n"}
        Étape 1 : PV sur la dernière date de coupon{"\n"}
        Étape 2 : full price = PV_last_coupon × (1 + YTM/périodes)^(t/T){"\n"}
        où t = jours depuis dernier coupon, T = jours dans la période{"\n\n"}
        Exemple : obligation 5%, coupons 15 juin / 15 déc., YTM = 4%, règlement 21 août, 4 coupons restants{"\n"}
        Étape 1 : N=4, PMT=2,5, FV=100, I/Y=2 → PV = 101,904{"\n"}
        Étape 2 : jours 15 juin→15 déc = 183j ; jours 15 juin→21 août = 67j{"\n"}
        Full price = 101,904 × (1,02)^(67/183) = 102,645{"\n"}
        AI = 2,5 × (67/183) = 0,915{"\n"}
        Flat price = 102,645 − 0,915 = 101,73
      </Formula>
      <Rule c="blue">Flat price ≠ PV sur la date du dernier coupon. On calcule TOUJOURS le full price en premier, puis on déduit l&apos;AI pour obtenir le flat price — jamais l&apos;inverse.</Rule>
    </FCard>
  </Sec>

  <Sec los="LOS 52.b" label="Relations prix, coupon, maturité, YTM">
    <FCard title="Quatre relations fondamentales" en="Price-yield relationships">
      <FTable
        headers={["Relation", "Règle", "Intuition"]}
        rows={[
          ["Prix vs YTM", "Relation inverse : YTM↑ → prix↓", "Actualisation à taux plus élevé = PV plus bas"],
          ["Coupon bas vs coupon élevé", "Coupon bas = plus sensible aux variations de YTM", "Plus de valeur dans le flux terminal (FV), actualisé sur plus longtemps"],
          ["Maturité longue vs courte", "Maturité longue = plus sensible aux variations de YTM", "Les flux lointains sont plus impactés par le taux d'actualisation"],
          ["Convexité", "Baisse de prix (YTM↑) < hausse de prix (YTM↓) pour Δ identique", "Relation prix-rendement = courbe convexe (pas linéaire)"],
        ]}
      />
      <Rule c="amber">Piège exam Q4 : &quot;option-free bond, YTM increases → price decreases at a DECREASING rate&quot; (= convexité). Pas à taux constant, pas à taux croissant. La courbe prix-rendement est convexe vers le bas.</Rule>
    </FCard>

    <FCard title="Pull to par et matrix pricing" en="Pull to par and matrix pricing">
      <ul className="list-disc pl-5 text-sm space-y-1">
        <li><strong>Pull to par (constant-yield price trajectory)</strong> : à YTM constant, le prix converge vers le pair à l&apos;approche de la maturité. Obligation à prime : prix baisse progressivement. Obligation à discount : prix monte progressivement.</li>
        <li><strong>Matrix pricing</strong> : pour les obligations peu liquides ou non cotées, on estime le YTM par interpolation linéaire à partir d&apos;obligations comparables (même rating, maturités encadrantes).</li>
      </ul>
      <Formula>
        Matrix pricing — interpolation linéaire :{"\n"}
        YTM_cible = YTM_A + (T_cible − T_A) / (T_B − T_A) × (YTM_B − YTM_A){"\n\n"}
        Exemple : obligation 4 ans, rating A ; comparables : 3 ans @ 3,2% et 6 ans @ 5,0%{"\n"}
        YTM_4ans = 3,2% + (4−3)/(6−3) × (5,0%−3,2%) = 3,2% + 0,6% = 3,8%
      </Formula>
      <Rule c="blue">Matrix pricing uses YTMs of comparable bonds (même credit rating, maturités proches). Utilisé pour les obligations illiquides ou non échangées sur le marché secondaire.</Rule>
    </FCard>
  </Sec>

</Reading>

<Reading id="r53" number="Reading 53" title="Yield and Yield Spread Measures for Fixed-Rate Bonds">

  <Sec los="LOS 53.a" label="Mesures de rendement — obligations taux fixe">
    <FCard title="Périodicité, EAY, BEY, Street convention" en="Periodicity, EAY, BEY">
      <Formula>
        EAY (Effective Annual Yield) = (1 + r_periode)^m − 1{"\n"}
        BEY (Bond Equivalent Yield) = taux semestriel × 2{"\n\n"}
        BEY → EAY : EAY = (1 + BEY/2)² − 1{"\n"}
        EAY → BEY : BEY = 2 × [(1 + EAY)^(1/2) − 1]{"\n"}
        Exemple : BEY=6% → EAY=(1.03)²−1=6.09%{"\n\n"}
        Périodicité m ↑ → stated YTM ↓ (pour même EAY){"\n"}
        Ex: EAY=5%; m=2: BEY=4.94%; m=4: BEY=4.91%
      </Formula>
      <Rule c="blue">Street convention = dates coupon nominales. True yield = dates réelles (légèrement inférieur). Current yield = coupon annuel / prix. Simple yield = current yield ± amortissement linéaire prime/discount.</Rule>
    </FCard>
    <FCard title="YTC, YTP, YTW" en="Yield to call/put/worst">
      <Formula>
        YTC : N=périodes jusqu&apos;au call × m; FV=call price; PMT=coupon/m{"\n"}
        YTW = min(YTM, YTC₁, YTC₂, ...) pour obligations callables{"\n\n"}
        Exemple : 15yr 10% semi, prix=1150, callable 5yr à 1100{"\n"}
        YTM: N=30,PMT=50,FV=1000,PV=-1150 → I/Y=4.18% → ×2=8.35%{"\n"}
        YTC: N=10,PMT=50,FV=1100,PV=-1150 → I/Y=4.17% → ×2=8.34%{"\n"}
        YTW = min(8.35%,8.34%) = 8.34%
      </Formula>
      <Rule c="red">Obligation à prime (prix {'>'} par) : YTC {'<'} YTM → utiliser YTC (worst). Obligation à discount : YTC {'>'} YTM. Pour décision achat : toujours utiliser YTW.</Rule>
    </FCard>
  </Sec>

  <Sec los="LOS 53.b" label="Spreads de rendement">
    <FCard title="G-spread, I-spread, Z-spread, OAS" en="Yield spread measures">
      <FTable
        headers={["Spread","Benchmark","Calcul","Limite"]}
        rows={[
          ["G-spread","Taux souverain interpolé","YTM bond − YTM gov interpolé","Correct si courbe plate seulement"],
          ["I-spread","Taux swap interpolé","YTM bond − swap rate interpolé","Correct si courbe plate seulement"],
          ["Z-spread","Chaque taux spot","Spread constant ajouté à chaque spot pour PV=Prix (itération)","Ignore options"],
          ["OAS","Courbe spot + modèle option","Z-spread − valeur option = spread crédit pur","Dépend du modèle"],
        ]}
      />
      <Rule c="amber">Callable: OAS {'<'} Z-spread. Putable: OAS {'>'} Z-spread. G-spread et I-spread corrects SEULEMENT si courbe des taux plate (piège Q10 exam: disadvantage = only correct if yield curve is FLAT).</Rule>
    </FCard>
    <FCard title="Z-spread et OAS — exemples numériques" en="Z-spread and OAS examples">
      <Formula>
        Z-spread : 3yr 9% corporate, prix=89.464{"\n"}
        Spot Trésor : z₁=4%, z₂=8.167%, z₃=12.377%; YTM Trésor 3yr=12%{"\n"}
        G-spread = 13.50% − 12.00% = 1.50%{"\n"}
        Z-spread ZS : 89.464 = 9/(1.04+ZS) + 9/(1.08167+ZS)² + 109/(1.12377+ZS)³{"\n"}
        → ZS = 1.67% (167 bps) par essais successifs{"\n\n"}
        OAS : callable bond, Z-spread=180bp, valeur call=60bp{"\n"}
        OAS = Z-spread − option value = 180 − 60 = 120 bp
      </Formula>
    </FCard>
  </Sec>

</Reading>

<Reading id="r54" number="Reading 54" title="Yield and Yield Spread Measures for Floating-Rate Instruments">

  <Sec los="LOS 54.a" label="Mesures de rendement FRN">
    <FCard title="Quoted Margin vs Discount Margin" en="QM vs DM">
      <FTable
        headers={["Mesure","Définition","Lien avec prix"]}
        rows={[
          ["QM (Quoted Margin)","Spread fixé à l'émission sur MRR. Contractuel et constant","Par à l'émission (QM=DM)"],
          ["DM (Discount Margin)","Spread pour que PV(flux au MRR+QM) = Prix marché (calculé à chaque reset date)","Variable selon crédit"],
        ]}
      />
      <ul className="list-disc pl-5 text-sm mt-2">
        <li>Prix = par → DM = QM</li>
        <li>Prix {'<'} par (discount) → DM {'>'} QM (crédit dégradé depuis émission)</li>
        <li>Prix {'>'} par (prime) → DM {'<'} QM (crédit amélioré)</li>
      </ul>
      <Rule c="red">Piège : DM {'>'} QM → FRN à DISCOUNT. DM {'<'} QM → FRN à PRIME. Q3 exam : si DM {'<'} QM → credit quality improved → trade at premium.</Rule>
    </FCard>
    <FCard title="Valorisation d&apos;un FRN" en="FRN valuation">
      <Formula>
        Prix = Σ[(MRR+QM)/m × FV / (1+(MRR+DM)/m)^t] + FV/(1+(MRR+DM)/m)^n{"\n\n"}
        Exemple Schweser : FRN $100k semi-annual, 5yr, MRR=3.0%, QM=120bps, DM=150bps{"\n"}
        Coupon annualisé = 3.0%+1.2% = 4.2% → PMT semestriel = 2.1% × 100 = 2.1{"\n"}
        I/Y per period = (3.0%+1.5%)/2 = 2.25%{"\n"}
        N=10, PMT=2.1, I/Y=2.25, FV=100 → PV = −98.67{"\n"}
        → FRN vaut 98.67% du pair (DM {'>'} QM → discount confirmé)
      </Formula>
    </FCard>
  </Sec>

  <Sec los="LOS 54.b" label="Taux du marché monétaire">
    <FCard title="DR, AOR, BEY — conventions" en="Money market rate conventions">
      <FTable
        headers={["Convention","Formule","Base","Usage"]}
        rows={[
          ["DR (Discount Rate)","(FV−Prix)/FV × 360/T","360j","T-bills US, commercial paper"],
          ["AOR (Add-On Rate)","(FV−Prix)/Prix × 360/T","360j","CDs, repos, MRR"],
          ["BEY (Bond Equiv. Yield)","(FV−Prix)/Prix × 365/T","365j","Comparaison avec obligations"],
          ["HPY (Holding Period Yield)","(FV−Prix)/Prix","N/A","Rendement non annualisé"],
        ]}
      />
      <Formula>
        Exemple T-bill : FV=1000, Prix=980, T=90j{"\n"}
        DR = (20/1000) × (360/90) = 8.000%{"\n"}
        AOR = (20/980) × (360/90) = 8.163%{"\n"}
        BEY = (20/980) × (365/90) = 8.282%{"\n\n"}
        Conversion AOR 360j → BEY 365j : BEY = AOR × 365/360{"\n"}
        Ex: AOR=1.5%/360 → BEY = 1.5% × 365/360 = 1.5208%
      </Formula>
      <Rule c="blue">Ordre : DR {'<'} AOR {'<'} BEY. BEY = add-on yield basé 365j (définition). CDs et repos quotés AOR/360. T-bills et CP quotés DR/360. Q9 exam : BEY = add-on yield 365j.</Rule>
    </FCard>
  </Sec>

</Reading>

<Reading id="r55" number="Reading 55" title="The Term Structure of Interest Rates: Spot, Par, and Forward Curves">

  <Sec los="LOS 55.a" label="Taux spot et valorisation sans arbitrage">
    <FCard title="Taux spot — définition et prix d&apos;une obligation" en="Spot rates and bond pricing">
      <Formula>
        Prix no-arbitrage = C₁/(1+S₁) + C₂/(1+S₂)² + ... + (C_n+FV)/(1+S_n)^n{"\n\n"}
        Exemple : 3yr coupon 5%, FV=100; S₁=3%, S₂=4%, S₃=5%{"\n"}
        = 5/1.03 + 5/1.04² + 105/1.05³ = 4.854 + 4.623 + 90.703 = 100.180{"\n"}
        → YTM = 4.93% (N=3,PMT=5,FV=100,PV=-100.180 → I/Y=4.93%)
      </Formula>
      <Rule c="blue">Spot rate = YTM d&apos;un zéro coupon de même maturité. Le prix no-arbitrage calculé par taux spot est le seul prix cohérent. Si prix marché diffère → opportunité d&apos;arbitrage.</Rule>
    </FCard>
  </Sec>

  <Sec los="LOS 55.b" label="Taux par et taux forward">
    <FCard title="Taux forward — notation CFA et formules" en="Forward rates">
      <Formula>
        Notation CFA : AyBy = taux B-ans démarrant dans A ans{"\n"}
        Ex: 1y1y = 1yr dans 1yr; 2y1y = 1yr dans 2yr; 2y2y = 2yr dans 2yr{"\n\n"}
        (1+S₂)² = (1+S₁)(1+1y1y) → 1y1y = (1+S₂)²/(1+S₁) − 1{"\n"}
        Ex: S₁=4%, S₂=8% → 1y1y = (1.08)²/1.04 − 1 = 12.154%{"\n\n"}
        (1+S₃)³ = (1+S₂)²(1+2y1y) → 2y1y = (1+S₃)³/(1+S₂)² − 1{"\n"}
        Ex: S₁=4%, S₂=8%, S₃=12% → 2y1y = (1.12)³/(1.08)² − 1 = 20.45%{"\n\n"}
        Spot depuis forwards : S_n = [(1+S₁)(1+1y1y)...(1+(n-1)y1y)]^(1/n) − 1{"\n"}
        Ex: S₁=2%, 1y1y=3%, 2y1y=4% → S₃=[(1.02)(1.03)(1.04)]^(1/3)−1 = 2.997%{"\n\n"}
        Multi-période : 2y2y = [(1+S₄)⁴/(1+S₂)²]^(1/2) − 1{"\n"}
        Ex: S₂=6%, S₄=8% → 2y2y = [(1.08)⁴/(1.06)²]^(1/2) − 1 = 10.04%
      </Formula>
      <Rule c="amber">Approximation : AyBy ≈ [(A+B)×S_{"{A+B}"} − A×S_A] / B. Ex: 2y1y ≈ 3(12%)−2(8%) = 20% (vs exact 20.45%). Utile pour vérifier la cohérence sur l&apos;examen.</Rule>
    </FCard>
    <FCard title="Taux par (par yield)" en="Par yield">
      <Formula>
        Par yield = taux coupon pour lequel une obligation est valorisée exactement au pair{"\n\n"}
        PMT/(1+S₁) + PMT/(1+S₂)² + (PMT+100)/(1+S₃)³ = 100{"\n\n"}
        Avec S₁=1%, S₂=2%, S₃=3% → PMT = 2.96 → par yield 3yr = 2.96%{"\n\n"}
        Valorisation avec forwards : S₁=4%, 1y1y=5%, 2y1y=6%, coupon 5%, FV=1000{"\n"}
        = 50/1.04 + 50/(1.04×1.05) + 1050/(1.04×1.05×1.06) = $1,000.98
      </Formula>
    </FCard>
  </Sec>

  <Sec los="LOS 55.c" label="Comparaison des 3 courbes">
    <FCard title="Spot, par et forward — relations selon la forme" en="Three curves comparison">
      <FTable
        headers={["Forme courbe","Forward vs Spot","Spot vs Par","Intuition"]}
        rows={[
          ["Normale (croissante)","Forward > Spot (plus pentue)","Spot > Par (légèrement)","Forwards élevés → spot = moyenne géom. → par légèrement sous spot"],
          ["Inversée (décroissante)","Forward < Spot","Spot < Par","Forwards bas → par au-dessus de la spot"],
          ["Plate","Forward = Spot","Spot = Par","Tous taux identiques à toute maturité"],
        ]}
      />
      <Rule c="red">Ordre clé (courbe normale) : Forward {'>'} Spot {'>'} Par. Q6 exam : S₁=1%, 1y1y=3% → S₂ ≈ 2% {'>'} par yield 2yr. Courbe forward est la PLUS pentue des trois.</Rule>
    </FCard>
  </Sec>

</Reading>

<Reading id="r56" number="Reading 56" title="Interest Rate Risk and Return">

  <Sec los="LOS 56.a" label="Sources de rendement et horizon return">
    <FCard title="3 sources de rendement" en="3 return sources">
      <ol className="list-decimal pl-5 space-y-1 text-sm">
        <li><strong>Coupons reçus</strong> : flux contractuels versés périodiquement.</li>
        <li><strong>Intérêts sur réinvestissement des coupons</strong> : dépend du taux de réinvestissement futur.</li>
        <li><strong>Gain/perte en capital</strong> : prix vente vs carrying value (constant-yield price trajectory).</li>
      </ol>
      <Rule c="blue">YTM réalisé seulement si réinvestissement au YTM ET détention jusqu&apos;à maturité. Capital gain/loss mesuré vs carrying value, pas le prix d&apos;achat original. Zero-coupon held to maturity → pas de gain/perte en capital.</Rule>
    </FCard>
    <FCard title="Horizon return — exemples clés Schweser" en="Horizon return examples">
      <Formula>
        Bond 3yr 6% annuel, YTM achat=7%, prix=97.376{"\n\n"}
        YTM stable, held to maturity :{"\n"}
        FV coupons = N=3,I/Y=7,PV=0,PMT=6 → FV=19.289{"\n"}
        Return = (119.289/97.376)^(1/3) − 1 = 7.00% ✓{"\n\n"}
        YTM ↑ 8% avant 1er coupon, vendu après 1yr (horizon court):{"\n"}
        Prix vente: N=2,I/Y=8,PMT=6,FV=100 → PV=96.433{"\n"}
        Return = (6+96.433)/97.376 − 1 = 5.19% {'<'} YTM (price risk dominant){"\n\n"}
        YTM ↓ 6% avant 1er coupon, vendu après 1yr:{"\n"}
        Prix vente: N=2,I/Y=6,PMT=6,FV=100 → PV=100.00{"\n"}
        Return = (6+100)/97.376 − 1 = 8.86% {'>'} YTM (price gain dominant){"\n\n"}
        YTM ↑ 8% held to maturity (horizon long) :{"\n"}
        FV coupons = 6(1.08)²+6(1.08)+6 = 19.478{"\n"}
        Return = (119.478/97.376)^(1/3)−1 = 7.06% {'>'} YTM (reinvestment dominant)
      </Formula>
    </FCard>
  </Sec>

  <Sec los="LOS 56.b" label="Price risk vs reinvestment risk — duration gap">
    <FCard title="Domination des risques selon l&apos;horizon" en="Price vs reinvestment risk">
      <FTable
        headers={["Horizon vs MacDur","Risque dominant","YTM ↑ → Return","YTM ↓ → Return"]}
        rows={[
          ["Horizon < MacDur (court)","Price risk","< YTM (prix baisse)",">> YTM (prix monte)"],
          ["Horizon > MacDur (long)","Reinvestment risk","> YTM (réinvest. meilleur)","< YTM (réinvest. moindre)"],
          ["Horizon = MacDur","Risques équilibrés","≈ YTM","≈ YTM"],
        ]}
      />
      <Formula>
        Duration gap = MacDur − Investment horizon{"\n"}
        Gap {'>'} 0 → price risk dominant{"\n"}
        Gap {'<'} 0 → reinvestment risk dominant{"\n"}
        Gap = 0 → immunisation (risques s&apos;annulent exactement)
      </Formula>
      <Rule c="red">Q14: price risk dominates when duration gap POSITIVE. Q1: MacDur=5.3, horizon=3yr, YTM ↓ → gap positif → price risk dominant → prix ↑ {'>'} réinvest. ↓ → realized yield {'>'} YTM at purchase. Q13: investor concerned about price risk → MacDur ≈ horizon = 5.25yr.</Rule>
    </FCard>
  </Sec>

  <Sec los="LOS 56.c" label="Duration de Macaulay">
    <FCard title="MacDur — calcul et interprétation" en="Macaulay duration">
      <Formula>
        MacDur = Σ t × (PV_t / Prix) = moyenne pondérée du temps jusqu&apos;à chaque flux{"\n\n"}
        Exemple : 5yr 11% annuel, YTM=15%, prix=86.59{"\n"}
        t=1: PV=9.565, W=0.1105 → 0.1105×1=0.1105{"\n"}
        t=2: PV=8.318, W=0.0961 → 0.0961×2=0.1922{"\n"}
        t=3: PV=7.233, W=0.0835 → 0.0835×3=0.2505{"\n"}
        t=4: PV=6.289, W=0.0726 → 0.0726×4=0.2904{"\n"}
        t=5: PV=55.187, W=0.6373 → 0.6373×5=3.1865{"\n"}
        MacDur = 4.03 years{"\n\n"}
        Semi-annual : MacDur en périodes semiannuelles ÷ 2{"\n"}
        Ex Q6 Schweser: 2yr semi 7% YTM=5%: MacDur=3.806 périodes → 1.90 ans
      </Formula>
      <Rule c="amber">MacDur = horizon où price/reinvestment risk s&apos;annulent. MacDur ≠ %ΔPrix (c&apos;est ModDur). Q12: &quot;%ΔPrix pour 1% ΔYTM&quot; = LEAST accurate pour MacDur. Q21: MacDur = average time to receipt of cash flows.</Rule>
    </FCard>
  </Sec>

</Reading>

<Reading id="r57" number="Reading 57" title="Yield-Based Bond Duration Measures and Properties">

  <Sec los="LOS 57.a" label="Modified Duration, Money Duration, PVBP">
    <FCard title="ModDur — formule et exemples Schweser" en="Modified Duration">
      <Formula>
        ModDur = MacDur / (1 + YTM/m){"\n"}
        Ex: MacDur=4.03, YTM=15%, m=1 → ModDur=4.03/1.15=3.50{"\n\n"}
        %ΔPrix ≈ −ModDur × ΔYTM{"\n"}
        Ex: ΔYTM=+0.5% → ΔPrix ≈ −3.50×0.005 = −1.75%{"\n"}
        Prix estimé = 86.59×(1−0.0175) = 85.075 (exact=85.092){"\n\n"}
        Approximate ModDur = (V− − V+) / (2×V₀×ΔYTM){"\n"}
        Ex: V₀=86.59, V+=85.092, V−=88.127, ΔYTM=0.005{"\n"}
        ApproxMod = (88.127−85.092) / (2×86.59×0.005) = 3.505{"\n\n"}
        Q13: 25yr 7.5% semi YTM=9.25% (ΔYTM=50bp):{"\n"}
        V+ (YTM=9.75%): PV=79.859; V− (YTM=8.75%): PV=90.856{"\n"}
        ApproxMod = (90.856−79.859)/(2×85.134×0.005) = 12.93
      </Formula>
      <Rule c="blue">ModDur toujours {'<'} MacDur. Duration donne approximation LINÉAIRE → convexity corrige. Q4: si YTM ↑ 100bp, ModDur=7.5 → %ΔP ≈ −7.5%. Q8: duration alone underestimates price GAIN (YTM↓).</Rule>
    </FCard>
    <FCard title="Money Duration et PVBP" en="Money Duration and PVBP">
      <Formula>
        Money Duration = annual ModDur × full price position{"\n"}
        Ex Q10: ModDur=8.0, position=$12M → MoneyDur=$96M{"\n"}
        Ex Schweser: ModDur=7.42, pos $2,030,000 → $15,063,000{"\n\n"}
        PVBP = (V− − V+) / 2{"\n"}
        = MoneyDur × 0.0001{"\n\n"}
        Ex Q17: 6yr 4.2% semi à 958.97 (YTM=4.95%){"\n"}
        V+ (YTM+1bp): 958.47; V− (YTM−1bp): 959.47{"\n"}
        PVBP = (959.47−958.47)/2 = 0.500 per $100 par
      </Formula>
      <Rule c="red">Money duration = UNITÉS MONÉTAIRES (€/$), pas en %. Q3: money duration = €25 million. Q21: money duration per $100 par = ModDur × full price per $100 (not par). PVBP = $ changement pour exactement 1 bp.</Rule>
    </FCard>
  </Sec>

  <Sec los="LOS 57.b" label="Propriétés de la duration">
    <FCard title="Facteurs affectant la duration" en="Duration properties">
      <FTable
        headers={["Facteur","Effet sur Duration","Logique"]}
        rows={[
          ["Maturité ↑","Duration ↑ (généralement)","Flux plus lointains, centre de gravité s'éloigne"],
          ["Coupon ↑","Duration ↓","Plus de flux tôt → centre de gravité avance"],
          ["YTM ↑","Duration ↓","Actualisation forte réduit poids des flux lointains"],
          ["Zero-coupon","MacDur = maturité","Un seul flux terminal"],
          ["Perpétuelle","MacDur = (1+YTM)/YTM","Formule spéciale"],
          ["FRN","MacDur ≈ temps au prochain reset","Réinitialise au pair à chaque reset"],
          ["Callable bond","Duration RÉDUITE","Call plafonne prix → moindre sensibilité"],
        ]}
      />
      <Rule c="amber">Q16: maturity ↑ → risk ↑ VRAI. Analyste dit coupon ↓ → risk ↓ → INCORRECT (coupon ↓ → duration ↑ → risk ↑). Q22: coupon ↑ → duration ↓ VRAI, maturity ↑ → duration ↑ VRAI. Q23: call feature RÉDUIT duration = least likely to increase price risk. Q9: YTM ↓ → duration ↑ → price risk ↑.</Rule>
    </FCard>
  </Sec>

</Reading>

<Reading id="r58" number="Reading 58" title="Yield-Based Bond Convexity and Portfolio Properties">

  <Sec los="LOS 58.a" label="Convexité — calcul et interprétation">
    <FCard title="Convexité — formule et calcul Schweser" en="Bond convexity calculation">
      <Formula>
        Convexité flux en période t = t×(t+1) / (1+r)²   (r = YTM/m){"\n\n"}
        Exemple : 5yr 11% annuel, YTM=15%, prix=86.59{"\n"}
        t=1: conv=1×2/1.15²=1.512, W=0.1105 → 0.167{"\n"}
        t=2: conv=2×3/1.15²=4.537, W=0.0961 → 0.436{"\n"}
        t=3: conv=3×4/1.15²=9.074, W=0.0835 → 0.757{"\n"}
        t=4: conv=4×5/1.15²=15.123, W=0.0726 → 1.098{"\n"}
        t=5: conv=5×6/1.15²=22.684, W=0.6373 → 14.457{"\n"}
        Convexité = 16.915{"\n\n"}
        Approximate convexity = (V+ + V− − 2×V₀) / ((ΔYTM)² × V₀){"\n"}
        Ex: V₀=86.591, V+=85.092, V−=88.127, ΔYTM=0.005{"\n"}
        ≈ (85.092+88.127−2×86.591)/(0.005²×86.591) = 16.916
      </Formula>
      <Rule c="green">Convexité toujours positive pour obligation standard → TOUJOURS avantageuse : gain {'>'} estimation duration (YTM↓), perte {'<'} estimation duration (YTM↑). Plus la convexité est élevée, mieux l&apos;obligation performe sous tout mouvement de taux.</Rule>
    </FCard>
    <FCard title="Effective Convexity — obligations avec options" en="Effective convexity">
      <Formula>
        EffConv = (V+ + V− − 2×V₀) / ((ΔY)² × V₀){"\n"}
        (même formule que approximate convexity)
      </Formula>
      <Rule c="amber">Callable bond: quand call proche → prix plafonné → EffConv NÉGATIVE (désavantage investisseur). Putable bond: EffConv {'>'} 0 (= avantage). MBS: convexité négative à faible taux (prepayment risk).</Rule>
    </FCard>
  </Sec>

  <Sec los="LOS 58.b" label="Estimation du ΔPrix avec duration + convexité">
    <FCard title="Formule combinée — duration + convexity adjustment" en="Price change with convexity">
      <Formula>
        %ΔPrix ≈ −ModDur×ΔYTM + (1/2)×Convexité×(ΔYTM)²{"\n\n"}
        Exemple : ModDur=3.50, Convexité=16.9, ΔYTM=−0.5%{"\n"}
        Duration effect = −3.50×(−0.005) = +1.750%{"\n"}
        Convexity adjustment = 0.5×16.9×(0.005)² = +0.021%{"\n"}
        %ΔPrix total = +1.771%{"\n"}
        Prix estimé = 86.591×1.01771 = 88.124 (exact=88.127 ✓){"\n\n"}
        ΔYTM=+0.5% :{"\n"}
        Duration = −1.750%; Convexity = +0.021%{"\n"}
        %ΔPrix = −1.729% → 86.591×(1−0.01729) = 85.094 (exact=85.092 ✓){"\n\n"}
        Money convexity = Convexité × full price{"\n"}
        ΔValeur = −MoneyDur×ΔYTM + (1/2)×MoneyConv×(ΔYTM)²
      </Formula>
      <Rule c="blue">Terme convexité TOUJOURS POSITIF (ΔYTM)² {'>'} 0. Q5: duration underestimates gain → convexity makes return HIGHER than duration estimate. Q7: convexity adjustment = ½ × Conv × (ΔYTM)².</Rule>
    </FCard>
  </Sec>

  <Sec los="LOS 58.c" label="Duration et convexité portefeuille — limites">
    <FCard title="Portefeuille — calcul et limites" en="Portfolio duration and convexity">
      <Formula>
        Duration port = Σ(Wᵢ × ModDurᵢ){"\n"}
        Convexité port = Σ(Wᵢ × Convᵢ){"\n\n"}
        Exemple : 40% bond A (ModDur=3, Conv=80) + 60% bond B (ModDur=7, Conv=120){"\n"}
        Duration port = 0.4×3 + 0.6×7 = 5.4{"\n"}
        Convexité port = 0.4×80 + 0.6×120 = 104
      </Formula>
      <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
        <li><strong>Limite 1</strong> : suppose un déplacement PARALLÈLE de la courbe des taux (même ΔYTM toutes maturités).</li>
        <li><strong>Limite 2</strong> : duration et convexité changent continuellement → rééquilibrage constant nécessaire.</li>
        <li><strong>Bond ladder vs bullet</strong> : même duration → ladder a plus de convexité (flux dispersés) → avantage.</li>
      </ul>
      <Rule c="amber">Q12: portfolio convexity = weighted average convexity VRAI. Q13: limitation = assume parallel shift VRAI. Q3: two bonds même ModDur → celui avec flux plus dispersés (ladder) a convexité plus élevée.</Rule>
    </FCard>
  </Sec>

</Reading>

<Reading id="r59" number="Reading 59" title="Curve-Based and Empirical Fixed-Income Risk Measures">

  <Sec los="LOS 59.a" label="Effective Duration et convexité — obligations avec options">
    <FCard title="Pourquoi l'Effective Duration ?" en="Why Effective Duration?">
      Bonds avec options (callable, putable, MBS) : flux futurs incertains → pas de YTM unique → ModDur/convexité classiques inapplicables. On utilise un choc de la <strong>courbe benchmark</strong> (ΔCurve) plutôt que ΔYTM.
      <Formula>
        EffDur = (V− − V+) / (2 × V₀ × ΔCurve){"\n"}
        EffConv = (V− + V+ − 2×V₀) / ((ΔCurve)² × V₀)
      </Formula>
      <Rule c="red">EffDur sépare l&apos;effet des taux benchmark de celui du spread crédit/liquidité (contrairement à ModDur). Q27: mesure appropriée pour bond avec embedded option = EFFECTIVE duration (pas Macaulay ni modified).</Rule>
    </FCard>
    <FCard title="Convexité négative — callable bonds" en="Negative convexity">
      <ul className="list-disc pl-5 text-sm space-y-1">
        <li>Callable bond à YIELDS BAS : call devient probable → prix plafonné → <strong>convexité négative</strong> (duration réduite vs option-free).</li>
        <li>Putable bond : convexité TOUJOURS positive (jamais négative), duration réduite à yields ÉLEVÉS.</li>
        <li>Bond option-free : ModDur ≈ EffDur seulement si courbe plate (sinon léger écart car choc du par curve → choc non-parallèle du spot curve).</li>
      </ul>
      <Rule c="amber">Q3: negative convexity la plus probable = callable bond en environnement LOW-YIELD. Q1: callable bond, EffDur=5, ModDur=6, ΔY=+1% → utiliser EffDur (pertinente) → ΔPrix≈−5%×$1000=−$50.</Rule>
    </FCard>
  </Sec>

  <Sec los="LOS 59.b" label="Estimation du ΔPrix avec EffDur et EffConv">
    <FCard title="Formule et exemples Schweser/questions" en="Price change with EffDur/EffConv">
      <Formula>
        %ΔPrix ≈ −EffDur×ΔCurve + ½×EffConv×(ΔCurve)²{"\n\n"}
        Q5: EffDur=10.5, EffConv=97.3, ΔCurve=−2%{"\n"}
        = [−10.5×(−0.02) + 0.5×97.3×(0.02)²]×100 = 21.0%+1.95% = 22.95%{"\n\n"}
        Q9: ModDur=10.27, Conv=143, ΔY=+1.25%{"\n"}
        = −10.27×0.0125 + 0.5×143×0.0125² = −0.1284+0.0112 = −11.72%{"\n\n"}
        Q22: ModDur=7, Conv=100, ΔY=−1% → +7%+0.5%=+7.5%
      </Formula>
      <Rule c="blue">Terme convexité TOUJOURS positif. Duration seule surestime la perte (taux ↑) et sous-estime le gain (taux ↓) — la convexité corrige toujours dans le sens favorable à l&apos;investisseur pour un bond à convexité positive.</Rule>
    </FCard>
  </Sec>

  <Sec los="LOS 59.c" label="Key Rate Duration">
    <FCard title="Key Rate Duration (Partial Duration)" en="Key Rate Duration">
      La <strong>key rate duration</strong> mesure la sensibilité du prix à un déplacement d&apos;un <em>seul point</em> de la courbe (autres taux constants), utile pour le <strong>shaping risk</strong> (torsions non-parallèles).
      <Formula>
        Key rate duration (flux) = ModDur du flux × poids dans le portefeuille{"\n\n"}
        Ex Schweser: 50% zero 5yr yield 5% + 50% bond 10yr yield 6%{"\n"}
        KRD(5yr) = [5/1.05]×0.5 = 2.381; KRD(10yr) = [10/1.06]×0.5 = 4.717{"\n"}
        Δ5yr=+50bp → −2.381×0.005=−1.19%; Δ10yr=−25bp → −4.717×(−0.0025)=+1.18%{"\n"}
        Impact total ≈ −0.01% (quasi neutre malgré chocs non-parallèles)
      </Formula>
      <Rule c="blue">Σ(Key Rate Durations) = Effective Duration totale. Q2/Q4/Q21: KRD = sensibilité à un ΔYTM à UNE SEULE maturité (spécifique), la mesure appropriée si non-parallel shift attendu — PAS effective/modified duration.</Rule>
    </FCard>
    <FCard title="Barbell vs Bullet" en="Barbell vs bullet portfolio">
      <ul className="list-disc pl-5 space-y-1 text-sm">
        <li><strong>Zero-coupon bond</strong> : KRD concentrée à sa seule maturité (nulle ailleurs).</li>
        <li><strong>Barbell</strong> (courts + longs) : KRD aux deux extrémités → exposé aux twists de courbe.</li>
        <li><strong>Bullet</strong> (obligation intermédiaire) : KRD concentrée au milieu → moins exposé aux twists.</li>
      </ul>
    </FCard>
  </Sec>

  <Sec los="LOS 59.d" label="Empirical Duration vs Analytical Duration">
    <FCard title="Empirical vs Analytical Duration" en="Empirical vs analytical duration">
      <ul className="list-disc pl-5 space-y-1 text-sm">
        <li><strong>Analytical duration</strong> (MacDur/ModDur/EffDur) : dérivée mathématiquement, suppose spread constant quand les taux benchmark bougent.</li>
        <li><strong>Empirical duration</strong> : estimée par régression historique ΔPrix vs Δtaux benchmark observés.</li>
        <li><strong>Flight to quality</strong> : taux gov ↓ MAIS spreads crédit ↑ simultanément → prix corporate bouge MOINS que prédit par l&apos;analytical duration → empirical duration {'<'} analytical.</li>
      </ul>
      <Rule c="amber">Q29: portefeuille Treasuries courts → empirical ≈ analytical (spreads gov non pertinents). Pour HY/corporate en crise : empirical diverge fortement de l&apos;analytical.</Rule>
    </FCard>
  </Sec>

</Reading>

<Reading id="r60" number="Reading 60" title="Credit Risk">

  <Sec los="LOS 60.a" label="Composantes du risque de crédit">
    <FCard title="Les Cs du crédit (bottom-up et top-down)" en="Credit analysis Cs">
      <FTable headers={["Bottom-up","Description","Top-down","Description"]} rows={[
        ["Capacity","Capacité à payer à temps","Conditions","Environnement macro"],
        ["Capital","Autres ressources dispo","Country","Système légal/politique"],
        ["Collateral","Valeur actifs gagés","Currency","Risque de change"],
        ["Covenants","Termes légaux","",""],
        ["Character","Intégrité emprunteur","",""],
      ]}/>
      <Formula>
        Expected Loss = Probability of Default (PD) × Loss Given Default (LGD%){"\n"}
        LGD% = Expected exposure × (1 − Recovery rate) = Loss severity × exposure{"\n\n"}
        Ex Q12: composantes credit risk = bond rating + recovery rate + yield volatility{"\n\n"}
        Credit spread ≈ PD × LGD% (compensation équitable pour risque de crédit){"\n"}
        Ex: 4% coupon bond au pair, PD=3%, recovery=75%, gov yield=2.5%{"\n"}
        Spread réel = 4%−2.5% = 1.5%; Spread estimé = 0.03×0.25 = 0.75%{"\n"}
        → Investisseur SUR-compensé (1.5% {'>'} 0.75%)
      </Formula>
      <Rule c="blue">Q8: loss severity = % de la valeur du bond PERDUE si défaut = 1−recovery rate (pas le montant, ni la probabilité). Q2: recovery rate ↑ → expected loss ↓.</Rule>
    </FCard>
  </Sec>

  <Sec los="LOS 60.b" label="Notations et leurs limites">
    <FCard title="Agences et limites" en="Rating agencies and limitations">
      Big Three : <strong>S&amp;P, Moody&apos;s, Fitch</strong>. IG = BBB−/Baa3 et au-dessus. HY (non-investment grade/junk) = BB+/Ba1 et en dessous.
      <ol className="list-decimal pl-5 space-y-1 text-sm mt-2">
        <li><strong>Ratings lag market pricing</strong> : les marchés réagissent plus vite que les agences.</li>
        <li><strong>Risques difficiles à évaluer</strong> : litiges, catastrophes naturelles, LBO — cause de <strong>split ratings</strong> entre agences.</li>
        <li><strong>Erreurs</strong> : subprime MBS 2008, fraudes corporate soudaines.</li>
      </ol>
      <Rule c="amber">Usages légitimes : comparaison crédit inter-industries, évaluation du credit migration risk, exigences réglementaires. Ne jamais s&apos;y fier exclusivement — due diligence indépendante requise.</Rule>
    </FCard>
  </Sec>

  <Sec los="LOS 60.c" label="Facteurs macro, marché et émetteur">
    <FCard title="Macro, marché et facteurs spécifiques" en="Factors affecting yield spreads">
      <FTable
        headers={["Contexte", "Effet sur les spreads"]}
        rows={[
          ["Expansion économique, credit cycle ↑","Spreads se resserrent (narrow)"],
          ["Récession, conditions économiques ↓","Spreads s'élargissent (widen)"],
          ["Broker-dealers + de capital dispo","Spreads se resserrent"],
          ["Forte émission de dette, demande faible","Spreads s'élargissent"],
          ["Equity faible / stress marché","Spreads s'élargissent — flight to quality"],
        ]}
      />
      <Formula>
        Décomposition yield spread: liquidity spread ≈ Yield(bid) − Yield(offer){"\n"}
        Ex: 10yr 5% coupon, bid/offer=99.5/100.5, benchmark=3%{"\n"}
        Yield spread total = 5%−3% = 2.0%{"\n"}
        Yield(bid)=5.065%, Yield(offer)=4.935% → liquidity=0.13%{"\n"}
        Credit spread = 2.0%−0.13% = 1.87%{"\n\n"}
        ΔPrix avec spread: %ΔP ≈ −ModDur×ΔSpread + ½×Conv×(ΔSpread)²
      </Formula>
      <Rule c="red">HY spreads plus volatils que IG. Longer-duration bonds = plus d&apos;incertitude créditworthiness (Q7). Credit curves s&apos;inversent en récession pour HY (near-term default risk domine).</Rule>
    </FCard>
  </Sec>

</Reading>

<Reading id="r61" number="Reading 61" title="Credit Analysis for Government Issuers">

  <Sec los="LOS 61.a" label="Souverains et non-souverains — facteurs spéciaux">
    <FCard title="Dette souveraine — 5 facteurs qualitatifs + 3 quantitatifs" en="Sovereign debt factors">
      <FTable headers={["Qualitatifs","Description"]} rows={[
        ["Institutions & policy","Stabilité politique, état de droit, willingness to pay (sovereign immunity = pas de recours légal)"],
        ["Fiscal flexibility","Capacité à ↑ impôts / ↓ dépenses"],
        ["Monetary effectiveness","Banque centrale indépendante → évite inflation par impression monétaire"],
        ["Economic flexibility","Croissance, PIB/tête, diversification"],
        ["External status","Devise de réserve = avantage; risques géopolitiques"],
      ]}/>
      <FTable headers={["Quantitatifs","Mesure"]} rows={[
        ["Fiscal strength","Dette/PIB, dette/revenus bas; intérêt/PIB bas (affordability)"],
        ["Economic growth & stability","PIB réel élevé, faible volatilité croissance"],
        ["External stability","Réserves FX/PIB élevées, réserves/dette externe CT élevées"],
      ]}/>
      <Rule c="red">Q6: risque sans recours légal en cas de refus de payer → évaluer INSTITUTIONS AND POLICY factors (sovereign immunity). Q3: interest/GDP élevé + faible volatilité croissance → fiscal strength FAIBLE + economic stability FORTE.</Rule>
    </FCard>
    <FCard title="Non-souverains — agences, banques, supranationaux, régionaux" en="Non-sovereign issuers">
      <ul className="list-disc pl-5 space-y-1 text-sm">
        <li><strong>Agencies</strong> (quasi-gov, ex: Fannie Mae) : rôle spécifique, soutien implicite → rating proche du souverain.</li>
        <li><strong>Government sector banks</strong> : mission spécifique (ex: green bonds climat), soutien implicite.</li>
        <li><strong>Supranationaux</strong> (World Bank, BEI) : soutenus par plusieurs gouvernements, missions développement.</li>
        <li><strong>Régionaux/municipaux</strong> : <strong>GO bonds</strong> = foi et crédit pleins, pouvoir fiscal, dépendent de l&apos;économie locale. <strong>Revenue bonds</strong> = remboursés par un projet spécifique (péages, aéroports), risque de crédit PLUS ÉLEVÉ que GO, analysés comme corporate (DSCR).</li>
      </ul>
      <Rule c="blue">Q1: GO munis moins risqués que corporate même rating car défaut historiquement plus rare (PAS parce que gov peut imprimer — ça c&apos;est le souverain). Q2: toll road financé par bond dédié = REVENUE bond. Q5: revenue bonds ont yields PLUS ÉLEVÉS que GO (pas plus bas). Régionaux ne peuvent PAS utiliser la politique monétaire (contrairement aux souverains).</Rule>
    </FCard>
  </Sec>

</Reading>

<Reading id="r62" number="Reading 62" title="Credit Analysis for Corporate Issuers">

  <Sec los="LOS 62.a" label="Facteurs qualitatifs et quantitatifs">
    <FCard title="Facteurs qualitatifs" en="Qualitative factors">
      <ul className="list-disc pl-5 text-sm space-y-1">
        <li><strong>Business model</strong> : stabilité et prévisibilité des cash flows; changements nécessaires pour rester compétitif.</li>
        <li><strong>Industry competition</strong> : moins de compétition = favorable.</li>
        <li><strong>Business risk</strong> : faible risque de déviation des revenus/marges attendus.</li>
        <li><strong>Corporate governance</strong> : covenants + accounting policies (fraude, off-balance-sheet financing, capitalisation excessive, changements fréquents d&apos;auditeur = signaux d&apos;alerte).</li>
      </ul>
    </FCard>
    <FCard title="Facteurs quantitatifs — top-down/bottom-up/hybrid" en="Quantitative analysis approach">
      <ul className="list-disc pl-5 text-sm space-y-1">
        <li><strong>Top-down</strong> : cycle macro, taille de l&apos;industrie/part de marché potentielle, event risk (chocs externes).</li>
        <li><strong>Bottom-up</strong> : facteurs spécifiques à l&apos;émetteur — revenus, coûts, actifs/passifs du bilan, cash flows futurs.</li>
        <li><strong>Hybrid</strong> : combine les deux.</li>
      </ul>
      <Rule c="blue">Q17: analyse combinant actifs/passifs + cash flows futurs (bottom-up) + part de marché + event risk (top-down) = approche HYBRID.</Rule>
    </FCard>
  </Sec>

  <Sec los="LOS 62.b" label="Ratios financiers de crédit">
    <FCard title="Ratios clés" en="Credit ratios">
      <FTable
        headers={["Type", "Ratio", "Formule", "Indication qualité ↑"]}
        rows={[
          ["Profitability", "EBIT margin", "EBIT / Revenue", "Ratio plus élevé"],
          ["Coverage", "EBIT/Intérêts", "EBIT / Intérêts", "Ratio plus élevé"],
          ["Leverage", "Debt/EBITDA", "Dette / EBITDA", "Ratio plus bas"],
          ["Leverage", "RCF/Net debt", "RCF / (Dette−Cash)", "Ratio plus élevé"],
        ]}
      />
      <Formula>
        FFO = Net income + D&amp;A + impôts différés + non-cash items (EXCLUT ΔBFR, contrairement au CFO){"\n"}
        RCF = CFO − Dividendes{"\n\n"}
        Q1: NI=503, D&amp;A=256, CapEx=140, CFO=361, Div=72{"\n"}
        FFO = 503+256 = 759 (CapEx et CFO non utilisés dans FFO){"\n\n"}
        Q3: Debt/EBITDA moyen 3 ans (opérant income+D&amp;A)/dette{"\n"}
        Y1: 2590/(262+201)=5.6×; Y2: 2717/(361+212)=4.7×; Y3: 2650/(503+256)=3.5× → moyenne≈4.6×
      </Formula>
      <Rule c="red">Q16: net income ↑ → EBITDA ↑ → debt/EBITDA DIMINUE (seul ratio qui baisse mécaniquement — FFO/debt et operating margin ne sont pas affectés directement par le net income seul).</Rule>
    </FCard>
  </Sec>

  <Sec los="LOS 62.c" label="Seniority, notching, subordination structurelle">
    <FCard title="Waterfall de priorité de remboursement" en="Priority waterfall">
      <ol className="list-decimal pl-5 space-y-1 text-sm">
        <li>First lien / mortgage</li>
        <li>Senior secured (second lien)</li>
        <li>Junior secured</li>
        <li>Senior unsecured</li>
        <li>Senior subordinated</li>
        <li>Subordinated</li>
        <li>Junior subordinated</li>
      </ol>
      <Rule c="red">Tout le même rang = <strong>pari passu</strong>. Q9: dette de priorité INFÉRIEURE à l&apos;unsecured = subordinated. Q6: pour maximiser le yield → choisir la dette la MOINS senior (senior subordinated {'>'} senior unsecured en yield). Q5: priorité de claims PAS toujours respectée en pratique (négociations) → manager a tort sur bankruptcy proceedings (Q5 réponse: correcte seulement sur priority of claims).</Rule>
    </FCard>
    <FCard title="Notching et Structural Subordination" en="Notching and structural subordination">
      <ul className="list-disc pl-5 space-y-1 text-sm">
        <li><strong>CFR (Corporate Family Rating)</strong> = note globale, généralement basée sur la dette senior unsecured.</li>
        <li><strong>CCR (Corporate Credit Rating)</strong> = note spécifique à une émission (peut différer du CFR via notching).</li>
        <li><strong>Notching</strong> plus fréquent pour émetteurs à rating BAS (différences de recovery plus significatives).</li>
        <li><strong>Structural subordination</strong> : si les covenants d&apos;une filiale empêchent la remontée de cash vers la maison mère AVANT service de sa propre dette, la dette de la MAISON MÈRE est structurellement subordonnée à celle de la filiale (même si même seniority nominale).</li>
      </ul>
      <Rule c="amber">Q4: bonds secured notés A+ → CFR (basé sur senior unsecured, moins bien protégé) sera PLUS BAS que A+. Q10: BluTech (filiale) restreint cash vers Miko (parent) → bonds de MIKO structurellement subordonnés à ceux de BluTech. Q12: CFR A3/A−, bonds secured avec covenants forts → notché VERS LE HAUT (A2/A).</Rule>
    </FCard>
  </Sec>

</Reading>

<Reading id="r63" number="Reading 63" title="Fixed-Income Securitization">

  <Sec los="LOS 63.a" label="Bénéfices de la titrisation">
    <FCard title="Bénéfices par partie prenante" en="Benefits by stakeholder">
      <FTable
        headers={["Partie", "Bénéfices"]}
        rows={[
          ["Originateur (issuer)", "↑ activité (relend), profitabilité (fees), ↓ réserves capital réglementaire, ↑ liquidité"],
          ["Investisseurs ABS", "Risque/rendement sur mesure, accès au collatéral sans expertise origination, liquidité (ABS {'>'} collatéral sous-jacent)"],
          ["Économies/marchés", "↓ risque de liquidité, ↑ efficience des marchés (prix d'équilibre), ↓ coût financement et levier des originateurs"],
        ]}
      />
      <Rule c="red">Q2: bénéfice économique le MOINS probable = "réduire le prêt excessif des banques" (au contraire, la titrisation AUGMENTE la capacité de prêt). Q4: retirer des liabilities du bilan n&apos;est PAS un bénéfice cité — les ABS retirent des ASSETS (collatéral), pas des liabilities.</Rule>
    </FCard>
    <FCard title="Risques pour les investisseurs ABS" en="Risks to ABS investors">
      <ul className="list-disc pl-5 text-sm space-y-1">
        <li>Cash flows incertains (timing/montant) — ex: prépaiements imprévus.</li>
        <li>Credit risk du collatéral transféré aux investisseurs (accumulation systémique → crise 2007-2009).</li>
      </ul>
      <Rule c="blue">Q1: cash flows totaux aux investisseurs {'<'} flux totaux du pool (frais de servicing prélevés) — vrai même avec une seule classe d&apos;ABS.</Rule>
    </FCard>
  </Sec>

  <Sec los="LOS 63.b" label="Parties et structure de la titrisation">
    <FCard title="Les 3 parties clés" en="Parties to a securitization">
      <ul className="list-disc pl-5 text-sm space-y-1">
        <li><strong>Seller / depositor</strong> : origine les actifs, les vend au SPE.</li>
        <li><strong>SPE (issuer/trust)</strong> : entité INDÉPENDANTE du seller, achète le collatéral et émet les ABS. <strong>Bankruptcy remote</strong> — les investisseurs n&apos;ont de recours QUE sur le collatéral.</li>
        <li><strong>Servicer</strong> : collecte les paiements, gère les impayés (souvent = seller, mais pas obligatoire).</li>
        <li><strong>Trustee</strong> (disinterested) : supervise le collatéral et les flux, informe les porteurs d&apos;ABS.</li>
      </ul>
      <Rule c="green">Q5: le SPE doit être un entité INDÉPENDANTE du seller (pas une filiale). Q2/Q3: l&apos;issuer des ABS = le SPE (pas le seller ni le servicer). Q6: ABS peuvent avoir un rating {'>'} celui du seller car le SPE est bankruptcy remote (isolé des risques du seller).</Rule>
    </FCard>
  </Sec>

</Reading>

<Reading id="r64" number="Reading 64" title="Asset-Backed Security (ABS) Instrument and Market Features">

  <Sec los="LOS 64.a" label="Covered Bonds">
    <FCard title="Covered bonds — double recours" en="Covered bond characteristics">
      Dette senior d&apos;institutions financières adossée à un <strong>cover pool</strong> qui reste AU BILAN de l&apos;émetteur (pas de SPE, pas de true sale) — contrairement aux ABS.
      <ul className="list-disc pl-5 text-sm mt-1">
        <li><strong>Dual recourse</strong> : cover pool + actifs non nantis (unencumbered) de l&apos;émetteur.</li>
        <li>Overcollateralization + limites LTV sur le cover pool → yields généralement PLUS BAS que ABS équivalent.</li>
        <li>Émetteur doit remplacer les actifs non performants (pool dynamique, pas figé comme un ABS).</li>
      </ul>
      <FTable headers={["Type","Conséquence si paiement manqué"]} rows={[
        ["Hard-bullet","Défaut IMMÉDIAT si paiement manqué à échéance"],
        ["Soft-bullet","Report de maturité jusqu'à 1 an (retarde le défaut)"],
        ["Conditional pass-through","Convertit en pass-through bond à maturité si paiements dus restants"],
      ]}/>
      <Rule c="blue">Q11: covered bonds offrent RECOURS À L&apos;ÉMETTEUR (contrairement aux ABS classiques). Q3: covered bond en défaut immédiat sur paiement manqué = hard-bullet.</Rule>
    </FCard>
  </Sec>

  <Sec los="LOS 64.b" label="Credit Enhancement">
    <FCard title="Overcollateralization, Excess Spread, Tranching" en="Internal credit enhancement">
      <ul className="list-disc pl-5 text-sm space-y-1">
        <li><strong>Overcollateralization (OC)</strong> : valeur collatéral {'>'} valeur ABS. Ex: collatéral $600M, ABS $500M → OC=$100M → pool peut perdre jusqu&apos;à 16.7% avant pertes investisseurs.</li>
        <li><strong>Excess spread</strong> : rendement collatéral − coupon ABS = buffer qui absorbe pertes de crédit.</li>
        <li><strong>Credit tranching (subordination/waterfall)</strong> : tranches junior absorbent pertes en premier.</li>
      </ul>
      <Formula>
        Ex Schweser: Tranche A=$300M (MRR+0.5%), B=$80M (MRR+1.5%), C=$30M (equity){"\n"}
        Pertes ≤$30M → absorbées par C seule. Pertes $30-110M → B absorbe l'excédent.{"\n"}
        Ex Q13 (ABS $150M: A=120,B=20,C=10 equity): valeur tranche équity = 150−120−20 = $10M{"\n\n"}
        Excess spread: collatéral MRR+0.75% sur $150M vs coupons pondérés A+B{"\n"}
        Coût moyen = (120×0.25%+20×1.25%)/150 = 0.367% {'<'} 0.75% → excess spread POSITIF → risque crédit PAS totalement éliminé mais partiellement mitigé
      </Formula>
      <Rule c="amber">Q1: niveau de collatéral plus élevé → génère PLUS d&apos;excess spread (collatéral porte plus d&apos;intérêts que versé aux tranches). Q7/Q10: réserves accumulées pour absorber pertes = OVERCOLLATERALIZATION (pas excess spread, qui est un flux, pas un stock).</Rule>
    </FCard>
  </Sec>

  <Sec los="LOS 64.c" label="ABS non-hypothécaires">
    <FCard title="Credit Card ABS et Solar ABS" en="Credit card and solar ABS">
      <FTable headers={["Type","Collatéral","Amortissement","Particularité"]} rows={[
        ["Credit card ABS","Créances revolving","NONAMORTIZING","Lockout/revolving period: seuls intérêts+fees versés; principal réinvesti en nouvelles créances"],
        ["Solar ABS","Prêts installation solaire","Amortizing","ESG-friendly; pre-funding period; garanti par équipement solaire ou junior mortgage"],
      ]}/>
      <Rule c="red">Q5: la classe d&apos;ABS avec lockout period typique = CREDIT CARD ABS (pas auto, pas non-agency RMBS). Pendant le lockout: PAS de prépaiement risk pour investisseurs (principal réinvesti). Early amortization trigger si excess spread tombe sous seuil → fin anticipée du revolving period.</Rule>
    </FCard>
  </Sec>

  <Sec los="LOS 64.d" label="Collateralized Debt Obligations (CDO)">
    <FCard title="CDO, CBO, CLO — structure et types" en="CDO structure and types">
      <ul className="list-disc pl-5 text-sm space-y-1">
        <li><strong>CDO</strong> = SPE dont le collatéral est un pool de dette, GÉRÉ ACTIVEMENT par un <strong>collateral manager</strong> (différence clé vs ABS classique = pool statique).</li>
        <li><strong>CBO</strong> : collatéral = dette corporate/emerging market.</li>
        <li><strong>CLO</strong> : collatéral = leveraged loans (forme la + commune post-crise).</li>
      </ul>
      <FTable headers={["Type de CLO","Mécanisme"]} rows={[
        ["Cash flow CLO","Paiements générés par cash flows du collatéral"],
        ["Market value CLO","Paiements générés par trading de la valeur de marché du collatéral"],
        ["Synthetic CLO","Exposition via credit derivatives, pas de détention physique du collatéral"],
      ]}/>
      <Rule c="blue">Q9: CDO se distingue des ABS classiques par l&apos;emploi d&apos;un COLLATERAL MANAGER (gestion active). Q12: synthetic CDO = adossé à des CREDIT DEFAULT SWAPS. Q2: dette souveraine EM diversifiée = CBO (pas CLO ni CMO).</Rule>
    </FCard>
  </Sec>

</Reading>

<Reading id="r65" number="Reading 65" title="Mortgage-Backed Security (MBS) Instrument and Market Features">

  <Sec los="LOS 65.a" label="Prepayment risk et time tranching">
    <FCard title="Extension vs Contraction risk" en="Prepayment risk types">
      <ul className="list-disc pl-5 text-sm space-y-1">
        <li><strong>Extension risk</strong> : prépaiements PLUS LENTS qu&apos;attendu → flux plus tardifs. Survient quand les taux MONTENT (moins de refinancement).</li>
        <li><strong>Contraction risk</strong> : prépaiements PLUS RAPIDES qu&apos;attendu → flux plus précoces, reinvestment à taux plus bas. Survient quand les taux BAISSENT.</li>
        <li>MBS = comme un callable bond → <strong>convexité négative</strong> à taux bas (prix monte moins vite que taux baisse).</li>
      </ul>
      <Rule c="red">Q8: extension résulte de PRÉPAIEMENTS PLUS LENTS (pas de l&apos;épuisement d&apos;une support tranche, ni de taux en baisse — l&apos;inverse).</Rule>
    </FCard>
    <FCard title="Time tranching — objectif" en="Time tranching purpose">
      Redistribue (sans éliminer) le prepayment risk entre classes de maturités différentes.
      <ul className="list-disc pl-5 text-sm mt-1">
        <li>Tranches à maturité COURTE : protection contre l&apos;extension risk.</li>
        <li>Tranches à maturité LONGUE : protection relative contre le contraction risk.</li>
      </ul>
    </FCard>
  </Sec>

  <Sec los="LOS 65.b" label="Caractéristiques des prêts hypothécaires résidentiels">
    <FCard title="Recours, LTV, DTI" en="Recourse, LTV, DTI">
      <Formula>
        LTV = Montant prêt / Valeur du bien{"\n"}
        DTI = Paiement mensuel dette / Revenu brut mensuel{"\n\n"}
        Ex: prêt $300k sur bien $400k → LTV=75%{"\n"}
        Prêt 6% annuel, 25 ans mensuel, revenu annuel $80k{"\n"}
        PMT = N=300,I/Y=0.5,PV=300000,FV=0 → PMT=$1,932.90{"\n"}
        DTI = 1932.90/(80000/12) = 29%
      </Formula>
      <ul className="list-disc pl-5 text-sm space-y-1">
        <li><strong>Recourse loan</strong> : prêteur peut saisir d&apos;autres actifs de l&apos;emprunteur au-delà du bien. <strong>Non-recourse</strong> (majorité USA) : collatéral = SEUL recours.</li>
        <li><strong>Strategic default</strong> plus probable si NON-RECOURSE + negative equity (jingle mail).</li>
        <li><strong>Prime</strong> : bon crédit, LTV bas, DTI bas. <strong>Subprime</strong> : crédit faible, LTV/DTI élevés.</li>
        <li><strong>Prepayment penalty</strong> : rare aux USA, courant en Europe — réduit le prepayment risk pour le prêteur.</li>
      </ul>
      <Rule c="blue">Q5: strategic default le plus probable si prêt NON-RECOURSE (Q7: prêt le plus attractif pour un prêteur = celui AVEC prepayment penalty, pas non-recourse).</Rule>
    </FCard>
    <FCard title="Agency vs Non-agency RMBS" en="Agency vs non-agency RMBS">
      <ul className="list-disc pl-5 text-sm space-y-1">
        <li><strong>Agency RMBS</strong> : garantie gouvernementale (Ginnie Mae, explicite) ou GSE (Fannie/Freddie, implicite). Doit respecter des normes d&apos;underwriting minimales.</li>
        <li><strong>Non-agency RMBS</strong> : émis par entités privées, pas de garantie → credit enhancement externe (assurance, LC, tranching). Catalyseur de la crise 2007-09 (subprime).</li>
      </ul>
    </FCard>
  </Sec>

  <Sec los="LOS 65.c" label="Pass-through securities et CMO">
    <FCard title="Mortgage Pass-Through — WAM et WAC" en="Pass-through, WAM, WAC">
      <Formula>
        Pass-through rate (net coupon) {'<'} WAC (frais de servicing/garantie prélevés){"\n\n"}
        Ex Schweser (pondéré par current balance):{"\n"}
        A: taux 2.6%, solde 90k, terme restant 210m{"\n"}
        B: taux 1.0%, solde 72k, terme restant 100m{"\n"}
        C: taux 5.4%, solde 247k, terme restant 280m{"\n"}
        WAM = 210×(90/409)+100×(72/409)+280×(247/409) = 233 mois{"\n"}
        WAC = 2.6%×(90/409)+1.0%×(72/409)+5.4%×(247/409) = 4.0%
      </Formula>
    </FCard>
    <FCard title="Types de tranches CMO" en="CMO tranche types">
      <FTable headers={["Tranche","Mécanisme","Risque"]} rows={[
        ["Sequential pay","Tranche courte reçoit TOUS les prépaiements en premier","Tranche courte: + contraction risk, − extension risk. Tranche longue: inverse"],
        ["Z-tranche (accrual)","Aucun paiement pendant période d'accrual; intérêts capitalisés en principal","Rang le plus junior typiquement"],
        ["PO (Principal-Only)","Acheté à escompte, reçoit uniquement principal","Profite de prépaiements RAPIDES (taux ↓ = gain)"],
        ["IO (Interest-Only)","Reçoit uniquement intérêts sur principal restant","Duration négative: prépaiements rapides = PERTE"],
        ["Floating-rate / Inverse floater","Coupon lié à un taux référence (cap/floor); inverse = varie à l'opposé",""],
        ["PAC + Support","PAC = paiements prévisibles dans une bande PSA; Support absorbe l'excès/déficit","Support = risque de crédit ÉLEVÉ (absorbe toute la variabilité)"],
        ["Residual","Rang le plus junior, réclamation résiduelle","Équivalent de l'equity tranche ABS"],
      ]}/>
      <Rule c="red">Q9: Tranche S (courte, reçoit principal en premier) vs Tranche R: S a PLUS de contraction risk et MOINS d&apos;extension risk. Q14: support tranche attire par PROTECTION CONTRE prepayment (pour le PAC) mais expose l&apos;investisseur du support à un risque de crédit/prépaiement élevé. Q4: support tranche = risque de crédit ÉLEVÉ = affirmation FAUSSE (le risque du support est le PRÉPAIEMENT, pas le crédit — agency RMBS a peu de credit risk). Q6: PSA 50% → WAL {'<'} WAM (prépaiements accélèrent le remboursement).</Rule>
    </FCard>
  </Sec>

  <Sec los="LOS 65.d" label="Commercial MBS (CMBS)">
    <FCard title="CMBS — analyse et call protection" en="CMBS analysis and call protection">
      <Formula>
        DSCR = NOI / Service de la dette (plus élevé = meilleure qualité){"\n"}
        LTV = Montant prêt / Valeur actuelle du bien (plus bas = meilleure qualité){"\n"}
        WAMP = Weighted Average proceeds (équivalent WAC pour CMBS)
      </Formula>
      <ul className="list-disc pl-5 text-sm space-y-1">
        <li>Prêts <strong>non-recourse</strong> uniquement — remboursés par les revenus locatifs, pas par l&apos;emprunteur.</li>
        <li>Moins de diversification que RMBS (parfois un seul prêt/bien) → analyse focalisée sur le CRÉDIT DE LA PROPRIÉTÉ, pas de l&apos;emprunteur.</li>
      </ul>
      <FTable headers={["Protection","Mécanisme"]} rows={[
        ["Prepayment lockout","Interdiction totale de remboursement anticipé pendant X années"],
        ["Yield maintenance charge","Pénalité = PV de la différence de flux, compense l'investisseur"],
        ["Defeasance","Emprunteur remplace le collatéral par des T-bonds générant les mêmes flux"],
        ["Balloon risk","Refinancement du principal résiduel requis à l'échéance (5-10 ans)"],
      ]}/>
      <Rule c="amber">Q2: meilleure qualité de crédit = DSCR PLUS ÉLEVÉ + LTV PLUS BAS. Q3: exemple de call protection AU NIVEAU CMBS (vs prêt individuel) = yield maintenance charges (lockout et defeasance sont au niveau du PRÊT). Q10: type de MBS avec la MEILLEURE call protection = CMBS (RMBS agency = aucune, refinancement libre).</Rule>
    </FCard>
  </Sec>

</Reading>

    </>
  );
}
