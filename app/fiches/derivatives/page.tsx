"use client";

import Link from "next/link";
import { FCard, Rule, Formula, Sec, Reading, FTable } from "@/components/fiche";

const NAV = [
  { id: "r66", label: "R66" }, { id: "r67", label: "R67" }, { id: "r68", label: "R68" },
  { id: "r69", label: "R69" }, { id: "r70", label: "R70" }, { id: "r71", label: "R71" },
  { id: "r72", label: "R72" }, { id: "r73", label: "R73" }, { id: "r74", label: "R74" },
  { id: "r75", label: "R75" },
];

export default function DerivativesFiche() {
  return (
    <>
      {/* ── Sticky sub-nav ── */}
      <div className="sticky top-12 z-40 -mx-4 md:-mx-8 px-4 md:px-8 bg-neutral-950/95 backdrop-blur border-b border-white/[0.07] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center gap-0.5 h-11 min-w-max">
          <Link href="/fiches" className="text-[11px] font-semibold uppercase tracking-wider text-white/25 hover:text-white/50 transition-colors shrink-0 mr-3">
            ← Fiches
          </Link>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/25 shrink-0 mr-2">DRV ·</span>
          {NAV.map(({ id, label }) => (
            <a key={id} href={`#${id}`}
              className="text-[12px] font-medium text-muted hover:text-white/80 whitespace-nowrap px-2 py-1 rounded-full hover:bg-white/5 transition-colors">
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="mt-8 mb-10 pb-8 border-b border-white/[0.07]">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300 mb-2">CFA Level I — Book 3</div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Derivatives</h1>
        <p className="text-sm text-white/50 mb-4">Readings 66–75 · Marchés, instruments, valorisation, réplication, parité put-call, modèle binomial.</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            ["#r66","R66 — Instrument & Market Features"],
            ["#r67","R67 — Forward Commitments & Contingent Claims"],
            ["#r68","R68 — Benefits, Risks & Uses"],
            ["#r69","R69 — Arbitrage, Réplication & Cost of Carry"],
            ["#r70","R70 — Valorisation des Forwards"],
            ["#r71","R71 — Valorisation des Futures"],
            ["#r72","R72 — Valorisation des Swaps"],
            ["#r73","R73 — Valorisation des Options"],
            ["#r74","R74 — Parité Put-Call"],
            ["#r75","R75 — Modèle Binomial"],
          ].map(([href, label]) => (
            <a key={href} href={href}
              className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.10] text-white/50 hover:text-emerald-300 hover:border-emerald-400/30 transition-colors">
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* ══════════ R66 ══════════ */}
      <Reading id="r66" number="Reading 66" title="Derivative Instrument and Derivative Market Features">

        <Sec los="LOS 66.a" label="Définition & types de dérivés">
          <FCard title="Qu'est-ce qu'un dérivé ?">
            Un dérivé est un instrument financier dont la <strong>valeur dépend</strong> (dérive) d'un sous-jacent. Le sous-jacent lui-même n'est généralement pas transféré — seule la variation de valeur est échangée (ou l'obligation de livraison à terme).
            <br /><br />
            <strong>Sous-jacents possibles :</strong> actions, obligations, taux d'intérêt, devises, commodities dures/molles (pétrole, or, blé, coton), indices boursiers, volatilité (VIX), crédit (probabilité de défaut), événements météorologiques, <strong>cryptomonnaies</strong>, et <strong>longévité</strong> (utilisé par les assureurs-vie et rentiers pour couvrir le risque de vivre plus longtemps que prévu).
          </FCard>

          <FCard title="Hedging, spéculation et transaction cash">
            Si une partie a un risque existant sur le sous-jacent et utilise le dérivé pour le réduire/éliminer, elle <strong>hedge</strong> (couverture totale ou partielle). Si elle n'a pas de risque préexistant et prend une position pour parier sur le prix futur, elle <strong>spécule</strong>.
            <br /><br />
            Alternative au dérivé : une <strong>transaction cash</strong> (vendre l'actif directement au comptant) élimine aussi le risque, mais les dérivés offrent des avantages : accès à une exposition à faible coût (levier), coûts de transaction souvent plus bas, et impact de marché réduit par rapport à une transaction équivalente sur le sous-jacent.
          </FCard>

          <FCard title="Les 5 grandes catégories de dérivés">
            <strong>1. Forwards</strong> — Engagement ferme bilatéral à acheter/vendre un actif à une date future à un prix convenu (F₀). Pas de flux initial (valeur initiale = 0). Marché OTC, sur mesure, risque de contrepartie.
            <br /><br />
            <strong>2. Futures</strong> — Même logique que le forward, mais standardisé, négocié sur une bourse, avec une chambre de compensation (clearing house) qui élimine le risque de contrepartie. Mark-to-market quotidien (MTM) : les gains/pertes sont réglés chaque soir.
            <br /><br />
            <strong>3. Swaps</strong> — Échange de flux périodiques sur un notionnel (lui-même non échangé, sauf dans les currency swaps). Le plain vanilla IRS échange un taux fixe contre un taux variable. Un swap peut être décomposé en une série de forwards.
            <br /><br />
            <strong>4. Options</strong> — Droit (pas obligation) d'acheter (call) ou de vendre (put) le sous-jacent à un prix d'exercice X. L'acheteur paie une prime à l'initiation pour obtenir ce droit. Asymétrie fondamentale : l'acheteur a des droits, le vendeur des obligations.
            <br /><br />
            <strong>5. Credit Derivatives (CDS)</strong> — Transfert du risque de crédit d'une entité de référence. L'acheteur de protection paie une prime périodique ; en cas de défaut, il reçoit la valeur nominale. Peut être vu comme une option sur l'événement de crédit.
          </FCard>
        </Sec>

        <Sec los="LOS 66.b" label="Marchés OTC vs Marchés Organisés">
          <FTable
            headers={["Critère", "OTC (de gré à gré)", "Marché organisé (bourse)"]}
            rows={[
              ["Standardisation", "Sur mesure (notionnel, maturité, sous-jacent)", "Contrats standardisés (taille, échéances fixes)"],
              ["Contrepartie", "Directe entre deux parties", "Chambre de compensation (clearing house)"],
              ["Risque de contrepartie", "Élevé (atténué par ISDA/CSA)", "Quasi nul (mutualisé par la chambre)"],
              ["Marge / garantie", "Appels de marge négociés (CSA)", "Initial margin + variation margin quotidienne"],
              ["Transparence des prix", "Faible (bilatéral)", "Élevée (prix publics en temps réel)"],
              ["Liquidité", "Variable, parfois faible", "Généralement élevée"],
              ["Exemples", "IRS, CDS, forwards FX, forwards actions", "Futures sur indices, taux, commodities, options listées"],
            ]}
          />
          <FCard title="Rôle de la Clearing House">
            La chambre de compensation s'interpose entre acheteur et vendeur (mécanisme appelé <strong>novation</strong>) : elle devient la contrepartie de chacun et garantit l'exécution. Elle exige des dépôts (marges) des deux parties à l'initiation, et des dépôts supplémentaires pour les comptes dont la valeur décline.
            <br /><br />
            <strong>Clearing</strong> = exécution du trade, enregistrement des participants, traitement des paiements requis. <strong>Settlement</strong> = échange effectif du sous-jacent ou des paiements finaux à maturité. Pour les swaps soumis au clearing mandate, un <strong>central counterparty (CCP)</strong> reprend le risque de contrepartie via une <strong>swap execution facility (SEF)</strong> qui enregistre les trades des dealers et les remplace par deux trades face au CCP.
          </FCard>
          <FCard title="Régulation post-2008 : Dodd-Frank & EMIR">
            La crise de 2008 a révélé les risques systémiques des dérivés OTC (notamment les CDS sur subprimes d'AIG). La réponse réglementaire (Dodd-Frank aux USA, EMIR en Europe) impose : (1) la compensation centralisée des CDS et IRS standardisés, (2) le reporting obligatoire des transactions à des référentiels centraux, (3) des exigences de capital accrues pour les contrats OTC non compensés. L'ISDA (International Swaps and Derivatives Association) publie les Master Agreements qui régissent les relations OTC bilatérales.
          </FCard>
        </Sec>

      </Reading>

      {/* ══════════ R67 ══════════ */}
      <Reading id="r67" number="Reading 67" title="Forward Commitment and Contingent Claim Features">

        <Sec los="LOS 67.a" label="Définir et comparer forwards, futures, swaps, options, CDS">
          <FCard title="Forwards, Futures et Swaps — Obligation bilatérale">
            Les deux parties sont <strong>obligées</strong> d'exécuter à l'échéance. Pas de prime à l'initiation car il n'y a pas d'asymétrie — le contrat est équitable (valeur initiale = 0 pour les deux parties).
            <br /><br />
            <strong>Forwards :</strong> livraison physique ou cash settlement à une date T. Prix F₀ fixé aujourd'hui. Valeur initiale = 0 mais change ensuite selon l'évolution du sous-jacent.
            <br /><br />
            <strong>Futures :</strong> même logique mais MTM quotidien. Les P&L sont réalisés chaque jour via la variation margin, ce qui modifie le timing des flux par rapport au forward équivalent.
            <br /><br />
            <strong>Swaps :</strong> échange de flux périodiques sur toute la durée du contrat. Peut être vu comme un portefeuille de forwards, un par date de paiement. Le notionnel n'est pas échangé (sauf currency swaps).
          </FCard>
          <FCard title="Options et CDS — Droit asymétrique">
            L'<strong>acheteur</strong> a le droit (mais pas l'obligation) d'exercer. Le <strong>vendeur</strong> a une obligation si l'acheteur exerce. Cette asymétrie au profit de l'acheteur doit être compensée par une prime versée à l'initiation.
            <br /><br />
            <strong>Call :</strong> droit d'acheter le sous-jacent au prix X. Exercé si ST {'>'} X.
            <br /><br />
            <strong>Put :</strong> droit de vendre le sous-jacent au prix X. Exercé si ST {'<'} X.
            <br /><br />
            <strong>Warrants :</strong> options émises par la société sur ses propres actions. L'exercice entraîne une émission d'actions nouvelles (dilution), contrairement aux options classiques qui portent sur des actions existantes.
            <br /><br />
            <strong>Swaptions :</strong> option d'entrer dans un swap à des conditions prédéfinies à une date future. Swaption payeur = droit de payer fixe dans un IRS. Swaption receveur = droit de recevoir fixe.
            <br /><br />
            <strong>CDS :</strong> l'acheteur de protection paie une prime périodique (yield premium = compensation pour PD × perte attendue en cas de défaut) ; le vendeur paie seulement en cas d'événement de crédit (défaut, restructuration). Vu comme un contingent claim — PAS un forward commitment (piège d'examen).
            <br /><br />
            <strong>À distinguer du CDS :</strong> le <strong>total return swap</strong> échange le rendement TOTAL d'une obligation contre un taux fixe/variable (le vendeur du TRS assume le risque de prix ET de crédit, contrairement au CDS qui isole le risque de crédit). Le <strong>credit-linked note</strong> est un titre dont les flux proviennent d'une obligation sous-jacente (combine dette + position CDS vendue).
          </FCard>
          <FCard title="Mécanique des marges — Futures">
            <strong>Initial margin</strong> : dépôt requis avant d'ouvrir une position (≈ variation de prix maximale attendue en une journée). <strong>Maintenance margin</strong> : solde minimum à maintenir. Si le solde tombe SOUS la maintenance margin (via le MTM quotidien), l'investisseur doit déposer des fonds pour ramener le compte à l'<strong>INITIAL margin</strong> (pas à la maintenance margin — piège classique).
            <Formula>
              Ex: contrat 100 oz d'or, initial margin=$5,000, maintenance=$4,700{"\n"}
              Jour 0: trade @$1,950, dépôt initial $5,000 des deux côtés{"\n"}
              Jour 1: settlement=$1,947.50 → vendeur +$250 (solde $5,250), acheteur −$250 (solde $4,750){"\n"}
              $4,750 {'>'} $4,700 (maintenance) → PAS d'appel de marge{"\n"}
              Jour 2: settlement=$1,945 → acheteur −$250 de plus (solde $4,500){"\n"}
              $4,500 {'<'} $4,700 → dépôt requis = $5,000−$4,500 = $500 (retour à L'INITIAL margin)
            </Formula>
          </FCard>
          <FCard title="Price limits et circuit breakers">
            <strong>Price limits</strong> : limites imposées par l'exchange sur la variation du settlement price d'un jour à l'autre — aucun trade ne peut avoir lieu au-delà. <strong>Circuit breakers</strong> : suspension temporaire du trading quand le prix atteint une limite.
          </FCard>
        </Sec>

        <Sec los="LOS 67.b" label="Payoffs à l'échéance — Toutes positions">
          <FCard title="Forward — Payoffs long et short">
            <strong>Long forward :</strong> Payoff = S_T − F₀. Profite si S_T {'>'} F₀ (actif vaut plus que ce qu'on avait convenu de payer). Perte illimitée si S_T s'effondre.
            <br /><br />
            <strong>Short forward :</strong> Payoff = F₀ − S_T. Profite si S_T {'<'} F₀ (on vend à un prix supérieur au marché). Perte illimitée si S_T monte fortement.
            <br /><br />
            Profil symétrique : le gain du long est exactement la perte du short. Jeu à somme nulle entre les deux parties.
          </FCard>
          <FCard title="Options — Payoffs et profits">
            <strong>Long call :</strong> Payoff = max(0, S_T − X). Profit = max(0, S_T − X) − c₀. Perte maximale = −c₀ (prime payée). Gain illimité si S_T monte. Breakeven : S_T = X + c₀.
            <br /><br />
            <strong>Short call :</strong> Payoff = −max(0, S_T − X). Profit = c₀ − max(0, S_T − X). Gain max = +c₀. Perte illimitée si S_T monte. Breakeven : S_T = X + c₀.
            <br /><br />
            <strong>Long put :</strong> Payoff = max(0, X − S_T). Profit = max(0, X − S_T) − p₀. Perte max = −p₀. Gain max = X − p₀ (si S_T = 0). Breakeven : S_T = X − p₀.
            <br /><br />
            <strong>Short put :</strong> Profit = p₀ − max(0, X − S_T). Gain max = +p₀. Perte max = −(X − p₀) si S_T = 0. Breakeven : S_T = X − p₀.
          </FCard>
          <FTable
            headers={["Position", "Profit max", "Perte max", "Breakeven"]}
            rows={[
              ["Long call", "Illimité", "−c₀", "X + c₀"],
              ["Short call", "+c₀", "Illimité", "X + c₀"],
              ["Long put", "X − p₀", "−p₀", "X − p₀"],
              ["Short put", "+p₀", "−(X − p₀)", "X − p₀"],
              ["Long forward", "Illimité", "−F₀", "F₀"],
              ["Short forward", "F₀", "Illimité", "F₀"],
            ]}
          />
          <FCard title="Exemple numérique — Call">
            S₀ = 50, X = 52, prime c₀ = 4, T = 1 an.
            <br /><br />
            <strong>Scénario 1 : S_T = 58.</strong> Exercice : oui (58 {'>'} 52). Payoff = 58 − 52 = 6. Profit = 6 − 4 = <strong>+2</strong>.
            <br /><br />
            <strong>Scénario 2 : S_T = 48.</strong> Exercice : non (48 {'<'} 52). Payoff = 0. Profit = 0 − 4 = <strong>−4</strong> (perte totale de la prime).
            <br /><br />
            Breakeven = X + c₀ = 52 + 4 = 56. Pour tout S_T entre 52 et 56, on exerce mais on perd une partie de la prime. Au-delà de 56 : profit net positif.
          </FCard>
        </Sec>

        <Sec los="LOS 67.c" label="Forward Commitments vs Contingent Claims — Comparaison">
          <FTable
            headers={["Critère", "Forward Commitment", "Contingent Claim (Option)"]}
            rows={[
              ["Paiement initial", "Aucun (valeur = 0)", "Prime versée par l'acheteur"],
              ["Obligation acheteur", "Obligé d'exécuter", "Droit d'exercer ou non"],
              ["Obligation vendeur", "Obligé d'exécuter", "Obligé si l'acheteur exerce"],
              ["Profil de payoff", "Symétrique (linéaire)", "Asymétrique (non-linéaire)"],
              ["Valorisation", "No-arbitrage simple (coût de portage)", "Modèle (Black-Scholes, binomial)"],
              ["Hedging", "Élimine tout le risque (upside ET downside)", "Élimine seulement le downside"],
            ]}
          />
          <FCard title="Pourquoi les options requièrent une prime ?">
            L'asymétrie des payoffs favorise structurellement l'acheteur : il bénéficie des mouvements favorables mais n'est pas pénalisé par les mouvements défavorables (il n'exerce pas). Cette asymétrie a une valeur économique réelle → l'acheteur doit payer une prime pour l'obtenir.
            <br /><br />
            <strong>Hedging avec forward vs put :</strong> Un producteur qui vend un forward FX fixe exactement son prix de vente — il ne bénéficiera pas si la devise s'apprécie (il renonce à l'upside). Avec un put FX, il est protégé si la devise se déprécie MAIS conserve l'upside si elle s'apprécie. La flexibilité a un coût = la prime du put.
          </FCard>
        </Sec>

      </Reading>

      {/* ══════════ R68 ══════════ */}
      <Reading id="r68" number="Reading 68" title="Derivative Benefits, Risks, and Issuer/Investor Uses">

        <Sec los="LOS 68.a" label="Bénéfices des dérivés">
          <FCard title="Gestion du risque (Hedging)">
            Les dérivés permettent de transférer les risques non désirés vers des contreparties prêtes à les assumer (spéculateurs, autres hedgers). Sans dérivés, la seule alternative pour éliminer un risque serait de vendre l'actif sous-jacent — coûteux, inefficace et parfois impossible.
          </FCard>
          <FCard title="Price Discovery">
            Les prix des contrats futures reflètent les anticipations agrégées du marché sur les prix futurs. Un agriculteur peut observer le prix futures du blé à 6 mois pour décider combien planter. Les marchés de futures pour le pétrole ou les matières premières fournissent des signaux de prix essentiels pour les décisions d'investissement.
          </FCard>
          <FCard title="Efficience, Arbitrage et Réduction des Coûts">
            Les arbitrageurs utilisent les dérivés pour maintenir la cohérence des prix entre marchés → amélioration de l'efficience informationnelle.
            <br /><br />
            Modifier l'exposition via des futures coûte moins cher qu'acheter/vendre le sous-jacent (frais de transaction réduits, pas d'impact marché, spread plus faible).
          </FCard>
          <FCard title="Accès à des Expositions Inaccessibles & Levier">
            <strong>Expositions inaccessibles :</strong> exposition à la volatilité (via options), à la courbe de taux (IRS), au risque de crédit (CDS), à des matières premières sans infrastructure de stockage.
            <br /><br />
            <strong>Levier :</strong> contrôler une large position notionnelle avec un capital limité. Un futures sur l'indice CAC 40 d'une valeur de 200 000€ ne nécessite qu'une marge initiale de 5-10%. Le levier amplifie les rendements — mais aussi les pertes.
          </FCard>
        </Sec>

        <Sec los="LOS 68.a" label="Risques des dérivés">
          <FCard title="Risque de Levier (le plus important)">
            <strong>Exemple :</strong> Futures avec levier 10×. Si le sous-jacent baisse de 5%, la perte sur la marge est de 50%. Scenario de margin call : l'investisseur doit déposer des fonds supplémentaires immédiatement ou voir sa position liquidée de force. Nick Leeson (Barings Bank, 1995) a perdu 1,3 Md$ en accumulant des positions futures non autorisées.
          </FCard>
          <FCard title="Risque de Contrepartie, Liquidité et Basis Risk">
            <strong>Risque de contrepartie (OTC) :</strong> si la contrepartie fait défaut avant l'échéance, le contrat n'est pas honoré. Atténué par les CSAs (Credit Support Annexes) qui imposent des appels de marge bilatéraux, et par la compensation centralisée des dérivés standardisés.
            <br /><br />
            <strong>Risque de liquidité :</strong> incapacité à dénouer une position OTC sur mesure avant l'échéance. L'acheteur est "coincé" jusqu'à T sauf à trouver une contrepartie pour un contrat de sens inverse.
            <br /><br />
            <strong>Rollover risk :</strong> en maintenant une exposition via des contrats courts (ex: futures mensuels), le renouvellement peut se faire à des prix défavorables (backwardation ou contango défavorable).
            <br /><br />
            <strong>Basis risk :</strong> le dérivé ne couvre pas parfaitement le risque réel. Ex : une compagnie aérienne couvre le kérosène avec des futures sur crude oil → la base (kérosène − crude) peut varier → couverture imparfaite.
          </FCard>
        </Sec>

        <Sec los="LOS 68.b" label="Utilisations par les émetteurs et les investisseurs">
          <FTable
            headers={["Utilisateur", "Risque exposé", "Dérivé utilisé", "Position", "Résultat"]}
            rows={[
              ["Émetteur (dette variable)", "Hausse des taux d'intérêt", "IRS plain vanilla", "Payeur fixe / receveur variable", "Convertit la dette variable en taux fixe synthétique"],
              ["Émetteur (export FX)", "Baisse de la devise étrangère", "Forward FX", "Vente à terme de la devise", "Fixe le taux de change sur les recettes export"],
              ["Émetteur (matières premières)", "Hausse du coût des inputs", "Long futures commodity", "Achat de futures", "Fixe le prix d'achat de la matière première"],
              ["Investisseur (protection actions)", "Baisse du marché", "Put sur indice", "Long put", "Floor sur la valeur du portefeuille (assurance)"],
              ["Investisseur (exposition sans spot)", "Opportunité haussière", "Long futures indice", "Long futures", "Exposition sans capital immobilisé en totalité"],
              ["Investisseur (revenu)", "Portefeuille actions stagnant", "Covered call", "Vente de call sur position longue", "Génère un revenu de la prime (caps l'upside)"],
              ["Spéculateur (vue directionnelle)", "Aucun risque à couvrir", "Call ou put ou futures", "Long call si haussier, long put si baissier", "Levier pour amplifier les rendements (et pertes)"],
            ]}
          />
          <FCard title="Hedge accounting — 3 catégories (émetteurs)">
            <FTable headers={["Type", "Objectif", "Exemple"]} rows={[
              ["Cash flow hedge", "Réduire la volatilité de FLUX FUTURS", "Forward FX sur des ventes export prévues ; swap qui convertit une dette VARIABLE en fixe"],
              ["Fair value hedge", "Réduire la volatilité de la VALEUR au bilan", "Swap sur une dette à taux FIXE (comptabilisée en fair value) ; forward sur un inventaire de commodity"],
              ["Net investment hedge", "Réduire la volatilité de la valeur d'une FILIALE ÉTRANGÈRE", "Forward/futures devises pour couvrir l'investissement net dans une filiale à l'étranger"],
            ]}/>
            <Rule c="blue">Piège classique : dette à taux FIXE → fair value hedge (le passif lui-même varie en valeur). Dette à taux VARIABLE convertie en fixe → cash flow hedge (ce sont les flux futurs incertains qui sont fixés).</Rule>
          </FCard>
        </Sec>

      </Reading>

      {/* ══════════ R69 ══════════ */}
      <Reading id="r69" number="Reading 69" title="Arbitrage, Replication, and Cost of Carry">

        <Sec los="LOS 69.a" label="Arbitrage et Loi du Prix Unique">
          <FCard title="Law of One Price">
            Deux actifs (ou portefeuilles) qui produisent des <strong>cash flows identiques dans tous les états futurs possibles</strong> doivent avoir le même prix aujourd'hui. Si ce n'est pas le cas, il existe un arbitrage sans risque.
          </FCard>
          <FCard title="Arbitrage — Définition et mécanisme">
            L'arbitrage est une stratégie qui génère un profit certain, sans investissement initial net et sans risque. Mécanisme : acheter le sous-évalué + vendre simultanément le sur-évalué → recevoir la différence de prix immédiatement.
            <br /><br />
            En pratique, l'arbitrage est <strong>auto-correctif</strong> : les arbitrageurs font monter le prix du sous-évalué et baisser celui du sur-évalué jusqu'à ce que l'opportunité disparaisse.
            <br /><br />
            <strong>Limits to arbitrage :</strong> en pratique, les coûts de transaction, les contraintes de short-selling et le capital limité peuvent empêcher l'arbitrage immédiat. Des déviations temporaires de la loi du prix unique sont donc possibles à court terme.
          </FCard>
          <FCard title="Réplication — Principe général">
            La réplication consiste à construire avec d'autres instruments un portefeuille qui reproduit exactement les flux d'un dérivé cible. Par la loi du prix unique, le dérivé et son réplicant doivent avoir le même prix.
            <br /><br />
            <strong>Réplication d'un forward long (statique) :</strong> acheter le sous-jacent spot (S₀) + emprunter PV(F₀) = S₀ → à T, on a l'actif et on rembourse F₀. Flux identiques au forward long → même prix → F₀ = S₀ × (1+r)^T.
            <br /><br />
            <strong>Statique vs dynamique :</strong> un forward se réplique statiquement (une seule transaction initiale). Une option nécessite une réplication dynamique (ajustement continu du ratio de couverture, car le delta de l'option change avec le prix du sous-jacent).
          </FCard>
          <FCard title="Exemple — Arbitrage si F₀ est mal fixé">
            Supposons S₀ = 100, r = 5%, T = 1 an. Le prix forward théorique est F₀ = 105.
            <br /><br />
            Si le forward cotait 108 (trop cher) : acheter spot à 100 (financer par emprunt à 5%), vendre le forward à 108. À T : livrer l'actif, recevoir 108, rembourser 105. Profit sans risque = <strong>3</strong>.
            <br /><br />
            Les arbitrageurs vendant le forward feraient baisser son prix vers 105.
          </FCard>
        </Sec>

        <Sec los="LOS 69.b" label="Cost of Carry">
          <FCard title="Définition et formule générale">
            Le cost of carry est le coût NET de posséder (porter) le sous-jacent de t=0 à t=T. Il détermine le prix forward.
          </FCard>
          <Formula>F₀(T) = S₀ × e^((r + γ − θ − δ)×T)</Formula>
          <FCard title="Composantes du cost of carry">
            <strong>r (taux sans risque) :</strong> coût d'opportunité du capital immobilisé pour acheter l'actif spot. Augmente F₀.
            <br /><br />
            <strong>γ (coûts de stockage) :</strong> applicable aux commodities physiques (pétrole, or, blé) — frais d'entrepôt, assurance, transport. Augmente F₀ (s'ajoute au coût de portage).
            <br /><br />
            <strong>θ (convenience yield) :</strong> valeur de détenir physiquement l'actif — pouvoir l'utiliser immédiatement en cas de pénurie (ex: pétrole pendant une crise). Réduit F₀ (avantage du détenteur spot).
            <br /><br />
            <strong>δ (revenus : dividendes, coupons) :</strong> bénéfice du détenteur de l'actif spot que l'acheteur forward ne reçoit pas. Réduit F₀.
          </FCard>
          <FCard title="Contango vs Backwardation">
            <strong>Contango :</strong> F₀ {'>'} S₀ → situation normale quand les coûts de stockage dominent. La courbe des futures est en pente montante. Détenteurs spot perdent sur le portage → exigent un prix forward supérieur.
            <br /><br />
            <strong>Backwardation :</strong> F₀ {'<'} S₀ → quand le convenience yield est très élevé (forte demande spot, pénurie physique). Les acheteurs du spot paient une prime pour la disponibilité immédiate. La courbe des futures est en pente décroissante.
            <br /><br />
            <strong>Convergence à l'échéance :</strong> à T, F_T = S_T (obligatoirement, sinon arbitrage trivial de livraison/réception immédiate).
          </FCard>
          <FCard title="Exemple numérique — Gold futures">
            Or spot S₀ = 1 900$, r = 3% par an, frais de stockage γ = 1% par an, T = 1 an, pas de convenience yield.
            <br /><br />
            F₀ = 1 900 × e^((0,03 + 0,01) × 1) = 1 900 × e^0,04 ≈ 1 900 × 1,0408 = <strong>1 977,5$</strong>
            <br /><br />
            Si le futures cotait 1 950$ : acheter or spot (1 900$), vendre futures à 1 950$, payer storage (19$/an). Profit = 1 950 − 1 900 × 1,04 = 1 950 − 1 977,5 = −27,5$ → ce serait une perte, pas un arbitrage. Donc le forward "juste" est bien 1 977,5$.
          </FCard>
          <FCard title="Forward sur devises — Parité des taux d'intérêt">
            Cas particulier du cost of carry où r = taux domestique et le "bénéfice" = taux de la devise étrangère (elle-même porte intérêt).
            <Formula>
              Forward (prix/base) = Spot × (1+r_price)/(1+r_base){"\n\n"}
              Ex: EUR/USD spot=1.10 (1€=1.10$), r_USD=2%, r_EUR=3%{"\n"}
              Forward = 1.10 × 1.02/1.03 = 1.0893{"\n\n"}
              Vérif no-arbitrage: emprunter 100$ à 2%, convertir en €(90.91€), placer à 3% → 93.64€{"\n"}
              93.64€ × 1.0893 = 102.02$ ≈ 100$×1.02 ✓
            </Formula>
            <Rule c="amber">La devise à taux d&apos;intérêt PLUS ÉLEVÉ se traite à un taux FORWARD PLUS FAIBLE que le spot (et inversement) — c&apos;est la parité des taux d&apos;intérêt (interest rate parity).</Rule>
          </FCard>
        </Sec>

      </Reading>

      {/* ══════════ R70 ══════════ */}
      <Reading id="r70" number="Reading 70" title="Pricing and Valuation of Forward Contracts">

        <Sec los="LOS 70.a" label="Prix vs Valeur — Distinction fondamentale">
          <FCard title="Deux concepts à ne pas confondre">
            <strong>F₀(T) — Prix forward :</strong> prix de livraison fixé à l'initiation du contrat. Il reste <em>constant</em> pendant toute la vie du contrat. C'est le prix auquel les deux parties s'engagent à transiger à T.
            <br /><br />
            <strong>V_t(long) — Valeur du contrat :</strong> gain ou perte non réalisé(e) de la position longue à l'instant t. Elle <em>évolue</em> chaque jour en fonction du prix spot du sous-jacent.
            <br /><br />
            À l'initiation : V₀ = 0 (pas de transfert de valeur).
            <br /><br />
            Pendant la vie (t {'<'} T) : V_t(long) = S_t − PV_t[F₀] = S_t − F₀ / (1+r)^(T−t)
            <br /><br />
            À l'échéance (t = T) : V_T(long) = S_T − F₀
          </FCard>

          <FCard title="Formules par type de sous-jacent">
            <strong>1. Actif sans revenu :</strong> F₀ = S₀ × (1+r)^T
            <br /><em>Ex : S₀ = 100, r = 5%, T = 1 → F₀ = 105</em>
            <br /><br />
            <strong>2. Actif avec dividendes connus :</strong> F₀ = (S₀ − PV(D)) × (1+r)^T
            <br /><em>Ex : S₀ = 100, PV(D) = 3, r = 5%, T = 1 → F₀ = (100 − 3) × 1,05 = 101,85</em>
            <br /><br />
            <strong>3. Currency forward (parité des taux d'intérêt couverte) :</strong>
            <br /> F₀(USD/EUR) = S₀ × (1+r_USD)^T / (1+r_EUR)^T
            <br /><em>Ex : S₀ = 1,10 $/€, r_USD = 5%, r_EUR = 2%, T = 1 → F₀ = 1,10 × 1,05/1,02 = 1,1324</em>
            <br /><br />
            <strong>4. Forward sur obligation (avec coupons = PV(C)) :</strong>
            <br /> F₀ = (S₀ − PV(C)) × (1+r)^T
            <br /><em>Identique aux dividendes : les coupons reçus par le détenteur spot réduisent le prix forward.</em>
          </FCard>
        </Sec>

        <Sec los="LOS 70.b" label="FRA — Forward Rate Agreement">
          <FCard title="Définition et notation">
            Un FRA est un contrat forward sur un taux d'intérêt. Il permet de fixer aujourd'hui un taux d'emprunt ou de prêt pour une période future.
            <br /><br />
            <strong>Notation j × k :</strong> le contrat démarre dans j mois et porte sur un taux de (k−j) mois.
            <br /><em>Ex : FRA 3×6 = taux 3 mois démarrant dans 3 mois.</em>
            <br /><br />
            <strong>Long FRA :</strong> reçoit le taux variable, paie le taux FRA fixe. Se couvre contre une hausse des taux (emprunteur futur).
            <br /><br />
            <strong>Short FRA :</strong> paie le taux variable, reçoit le taux fixe. Se couvre contre une baisse des taux (prêteur futur).
          </FCard>
          <FCard title="Calcul du taux FRA implicite">
            Le taux FRA est le taux forward implicite entre deux taux spot.
            <br /><br />
            <strong>Formule (taux nominaux) :</strong>
          </FCard>
          <Formula>
            FRA(j,k) = [(1 + r_k × k/360) / (1 + r_j × j/360) − 1] × [360/(k−j)]
          </Formula>
          <FCard title="Exemple numérique — FRA 3×6">
            Taux 3M (90 jours) = 4,00%. Taux 6M (180 jours) = 4,50%.
            <br /><br />
            FRA(3×6) = [(1 + 0,045 × 180/360) / (1 + 0,04 × 90/360) − 1] × [360/90]
            <br />= [(1,0225) / (1,01) − 1] × 4
            <br />= [1,01238 − 1] × 4 = 0,01238 × 4 = <strong>4,95%</strong>
            <br /><br />
            Si le LIBOR réalisé dans 3 mois = 5,50% : payoff pour le long FRA (sur notionnel 1M$) :
            <br />= (5,50% − 4,95%) × (90/360) × 1 000 000 / (1 + 5,50% × 90/360)
            <br />= 0,0055 × 0,25 × 1 000 000 / 1,01375
            <br />= 1 375 / 1,01375 ≈ <strong>1 356$</strong> (reçu par le long, actualisé au début de la période — TOUJOURS au taux RÉALISÉ, pas au taux forward)
            <br /><br />
            Notation moderne (MRR) : même logique avec la notation A×B (A=début en mois, B=fin en mois) sur le market reference rate.
          </FCard>
          <FCard title="Taux forward implicites (implied forward rates)">
            Un taux forward est implicite dans deux taux spot de maturités différentes.
            <Formula>
              (1+Z_n)^n = (1+Z_m)^m × (1+F_m,n−m)^(n−m){"\n\n"}
              Notation: F_2,1 = taux forward 1 an dans 2 ans (&quot;2y1y&quot;){"\n\n"}
              Ex: Z₂=2%, Z₃=3%{"\n"}
              F_2,1 = (1.03³/1.02²) − 1 = 1.0927/1.0404 − 1 = 5.03%
            </Formula>
            <Rule c="amber">Notation &quot;AyBy&quot; = taux B-ans démarrant dans A ans (ex: &quot;2y3y&quot; = taux forward 3 ans dans 2 ans, PAS un taux se terminant dans 2 ans — piège classique).</Rule>
          </FCard>
        </Sec>

      </Reading>

      {/* ══════════ R71 ══════════ */}
      <Reading id="r71" number="Reading 71" title="Pricing and Valuation of Futures Contracts">

        <Sec los="LOS 71.a" label="Valeur et prix — Forward vs Futures">
          <FCard title="Différence fondamentale : PRIX et VALEUR">
            <strong>Forward (sans MTM)</strong> : le prix F₀ reste CONSTANT toute la vie du contrat ; seule la VALEUR fluctue (V_t = S_t − PV(F₀)), et n'est réalisée qu'à l'échéance.
            <br /><br />
            <strong>Futures (avec MTM quotidien)</strong> : le PRIX ET LA VALEUR changent chaque jour. Le règlement quotidien (variation margin) ramène la valeur à ZÉRO après chaque MTM — le nouveau prix devient le prix de référence du jour suivant.
          </FCard>
          <FCard title="Exemple — Or, 100 oz, prix initial $1,870">
            <Formula>
              Jour 0: prix=1,870, valeur MTM=0{"\n"}
              Jour 1: settlement=1,875 → MTM=+$500 (crédité), NOUVEAU prix=1,875, valeur repasse à 0{"\n"}
              Jour 2: settlement=1,855 → MTM=−$2,000 (débité), NOUVEAU prix=1,855, valeur repasse à 0
            </Formula>
            <Rule c="blue">Contraste avec un forward équivalent: le prix serait resté à $1,870 tout du long, et la valeur (non réglée) aurait dérivé sans être remise à zéro chaque jour.</Rule>
          </FCard>
        </Sec>

        <Sec los="LOS 71.b" label="Pourquoi forward et futures prices diffèrent">
          <FCard title="Corrélation taux-prix du sous-jacent">
            Si les taux sont non-stochastiques (constants), Futures price = Forward price (le MTM ne crée aucune différence de valeur attendue).
            <br /><br />
            <strong>Corrélation positive</strong> (ex: actions) : gains MTM réinvestis à des taux plus élevés quand les taux montent (et le sous-jacent aussi) → avantage à la position longue futures → <strong>Futures {'>'} Forward</strong>.
            <br /><br />
            <strong>Corrélation négative</strong> (ex: obligations) : pertes MTM surviennent quand les taux sont élevés (coût de financement du call plus cher) → <strong>Futures {'<'} Forward</strong>.
          </FCard>
          <FCard title="Futures de taux d'intérêt — Prix et BPV">
            <Formula>
              Futures price = 100 − (100 × MRR_A,B−A){"\n\n"}
              BPV = Notionnel × Période × 0,01%{"\n"}
              Ex: notionnel 1M€, période 6m → BPV = 1,000,000 × (0.0001/2) = 50€
            </Formula>
          </FCard>
          <FCard title="Convexity bias — Futures de taux vs FRA équivalent">
            Le futures a un profil de gain/perte SYMÉTRIQUE (BPV constant, ex: ±$50 pour ±1bp), alors que le FRA équivalent est ASYMÉTRIQUE car actualisé au taux réalisé.
            <Formula>
              FRA équivalent, notionnel implicite BPV=$50/bp{"\n"}
              Si MRR=2.51% (+1bp): long reçoit 50/(1.0251/2) = 49.3803$ {'<'} 50$ (moins que le futures){"\n"}
              Si MRR=2.49% (−1bp): long paie 50/(1.0249/2) = 49.3852$ {'<'} 50$ (moins que le futures){"\n\n"}
              → La baisse de taux génère un gain PLUS ÉLEVÉ en valeur absolue que la perte symétrique{"\n"}
              → &quot;Convexity bias&quot; favorable au FRA vs futures
            </Formula>
            <Rule c="red">Piège Schweser: le futures de taux, PAS le FRA, a un BPV parfaitement symétrique — le FRA a un léger avantage de convexité (paiements plus favorables au détenteur long) à cause de l&apos;actualisation au taux réalisé.</Rule>
          </FCard>
        </Sec>

      </Reading>

      {/* ══════════ R72 ══════════ */}
      <Reading id="r72" number="Reading 72" title="Pricing and Valuation of Interest Rate and Other Swaps">

        <Sec los="LOS 72.a" label="Swap = série de FRAs">
          <FCard title="Décomposition d'un IRS en FRAs">
            Un IRS plain vanilla à N périodes peut être décomposé en N FRAs, un par date de paiement. La valeur du swap = somme des valeurs des N FRAs implicites.
            <br /><br />
            <strong>À l'initiation :</strong> le SFR (Swap Fixed Rate) est choisi pour que la SOMME des N FRAs implicites soit nulle — PAS que chaque FRA individuel ait une valeur nulle. En réalité, le swap est le plus souvent composé de certains FRAs à valeur positive et d'autres à valeur négative, dont le total s'annule exactement à l'initiation.
            <br /><br />
            <strong>Pendant la vie du swap :</strong> si les taux d'intérêt évoluent, la somme des FRAs implicites n'est plus nulle. La valeur nette du swap ≠ 0.
            <br /><br />
            <Rule c="red">Piège Schweser: &quot;chaque FRA a une valeur nulle à l&apos;initiation&quot; est FAUX. Seule la SOMME des valeurs des FRAs est nulle.</Rule>
          </FCard>
          <FCard title="Types de swaps au programme CFA Level I">
            <strong>IRS plain vanilla :</strong> échange taux fixe ↔ taux variable (SOFR/EURIBOR) sur un notionnel non échangé. Le plus courant.
            <br /><br />
            <strong>Currency swap :</strong> échange de flux dans deux devises différentes, avec échange du principal à l'initiation ET à l'échéance. Utilisation : financement en devise étrangère à taux préférentiel.
            <br /><br />
            <strong>Equity swap :</strong> échange rendement d'un indice actions ↔ taux fixe ou variable. Permet une exposition aux actions sans les détenir directement.
            <br /><br />
            <strong>Commodity swap :</strong> échange prix fixe ↔ prix spot d'une matière première sur des dates futures.
          </FCard>
        </Sec>

        <Sec los="LOS 72.b" label="Calcul du Swap Fixed Rate (SFR) et valeur">
          <FCard title="Formule du SFR">
            Le SFR est le par yield du swap : le taux fixe qui rend la valeur initiale nulle. En utilisant les facteurs d'actualisation (discount factors) Z_t pour chaque période t :
          </FCard>
          <Formula>SFR = (1 − Z_N) / (Z_1 + Z_2 + ... + Z_N)</Formula>
          <FCard title="Exemple numérique — IRS 3 ans">
            Facteurs d'actualisation : Z_1 = 0,9709 (r_1 = 3%), Z_2 = 0,9426 (r_2 = 3,1%), Z_3 = 0,9151 (r_3 = 3,0%).
            <br /><br />
            Somme = 0,9709 + 0,9426 + 0,9151 = 2,8286
            <br /><br />
            SFR = (1 − 0,9151) / 2,8286 = 0,0849 / 2,8286 = <strong>3,00%</strong> par période
            <br /><br />
            Sur notionnel de 1M€ : paiement fixe annuel = 30 000€.
          </FCard>
          <FCard title="Valeur du swap pendant la vie">
            Pour le <strong>payeur fixe</strong> : valeur = PV(flux variables attendus) − PV(flux fixes)
            <br /><br />
            Équivalence bond : IRS payeur fixe = position SHORT sur un bond à taux fixe + position LONG sur un bond à taux variable (valeur ≈ pair à chaque date de coupon).
            <br /><br />
            <strong>Vues de marché :</strong>
            <br />— Payeur fixe : profite d'une hausse des taux (les flux variables reçus augmentent, les fixes payés restent constants).
            <br />— Receveur fixe : profite d'une baisse des taux.
          </FCard>
          <FCard title="Exemple — Valeur du swap après changement de taux">
            IRS 2 ans, notionnel 1M$, SFR = 4% (payé), SOFR reçu. Après 1 an, la courbe se déplace : taux 1 an passe à 5%.
            <br /><br />
            Valeur pour le payeur fixe = PV(SOFR attendu) − PV(fixe)
            <br />= PV(flux variable dans 1 an attendu à 5%) − PV(40 000$)
            <br />= 50 000/1,05 − 40 000/1,05 = 47 619 − 38 095 = <strong>+9 524$</strong>
            <br /><br />
            La hausse des taux bénéficie au payeur fixe (receveur du variable).
          </FCard>
        </Sec>

      </Reading>

      {/* ══════════ R73 ══════════ */}
      <Reading id="r73" number="Reading 73" title="Pricing and Valuation of Options">

        <Sec los="LOS 73.a" label="Valeur intrinsèque, valeur temps et moneyness">
          <FCard title="Décomposition du prix d'une option">
            <strong>Valeur intrinsèque (exercise value) :</strong>
            <br />Call : max(0, S − X). Put : max(0, X − S).
            <br />C'est ce qu'on obtiendrait en exerçant l'option immédiatement.
            <br /><br />
            <strong>Valeur temps :</strong> Prix option − Valeur intrinsèque ≥ 0 toujours.
            <br />Elle représente la probabilité que l'option devienne plus profitable avant l'expiration. Elle est maximale ATM et nulle à l'expiration.
          </FCard>
          <FCard title="Moneyness">
            <strong>ITM (In the money) :</strong> valeur intrinsèque {'>'} 0. Call ITM si S {'>'} X. Put ITM si S {'<'} X.
            <br /><br />
            <strong>ATM (At the money) :</strong> S ≈ X. La valeur intrinsèque est nulle ou quasi-nulle. La valeur temps est maximale.
            <br /><br />
            <strong>OTM (Out of the money) :</strong> valeur intrinsèque = 0. Call OTM si S {'<'} X. Put OTM si S {'>'} X.
          </FCard>
          <FCard title="Exemple numérique — Call X = 50">
            <strong>Cas 1 : S = 55, prix option = 8</strong>
            <br />VI = max(0, 55 − 50) = 5. VT = 8 − 5 = 3. Option ITM.
            <br /><br />
            <strong>Cas 2 : S = 48, prix option = 2</strong>
            <br />VI = max(0, 48 − 50) = 0. VT = 2 − 0 = 2. Option OTM, la valeur est entièrement de la valeur temps.
            <br /><br />
            <strong>Pourquoi VI {'<'} prix option ?</strong> La valeur temps est ≥ 0 mais peut tendre vers 0 pour les options deep ITM — surtout les puts américains, ce qui explique pourquoi leur exercice anticipé peut devenir optimal (cf. LOS 73.c).
          </FCard>
        </Sec>

        <Sec los="LOS 73.b" label="Arbitrage/réplication — Forward commitments vs Contingent claims">
          <FCard title="Pourquoi l'approche de pricing diffère">
            <strong>Forward commitments</strong> : valeur initiale nulle pour les deux parties, gains/pertes SYMÉTRIQUES et illimités des deux côtés → pricing par no-arbitrage simple (réplication statique par un seul portefeuille).
            <br /><br />
            <strong>Contingent claims (options)</strong> : valeur initiale POSITIVE (prime versée par l'acheteur), payoffs ASYMÉTRIQUES (perte limitée à la prime pour l'acheteur, gain limité à la prime pour le vendeur) → nécessite réplication + no-arbitrage combinés (delta hedging dynamique, cf. modèle binomial R75).
          </FCard>
          <FCard title="Bornes d'arbitrage pour les options européennes">
            <strong>Call :</strong>
            <br />c₀ ≥ 0 (droit, jamais négatif)
            <br />c₀ ≥ max[0, S₀ − X(1+Rf)^-T] (borne inférieure)
            <br />c_t ≤ S_t (borne supérieure : ne peut valoir plus que l'actif lui-même)
            <br /><br />
            <strong>Put :</strong>
            <br />p₀ ≥ max[0, X(1+Rf)^-T − S₀] (borne inférieure)
            <br />p_t ≤ X(1+Rf)^-(T-t) (borne supérieure : ne peut valoir plus que la valeur actualisée du strike)
          </FCard>
        </Sec>

        <Sec los="LOS 73.c" label="Les facteurs déterminant le prix d'une option">
          <FTable
            headers={["Facteur", "Effet sur Call", "Effet sur Put", "Intuition"]}
            rows={[
              ["S ↑ (prix sous-jacent)", "↑", "↓", "Call plus ITM, Put moins ITM"],
              ["X ↑ (strike)", "↓", "↑", "Exercer plus cher désavantage le call, avantage le put"],
              ["T ↑ (maturité)", "↑", "↑ (américain) / ambigu (européen)", "Plus de temps = plus de valeur temps (américain toujours ≥)"],
              ["σ ↑ (volatilité)", "↑", "↑", "TOUJOURS les deux. L'asymétrie protège l'acheteur des extremes défavorables"],
              ["r ↑ (taux sans risque)", "↑", "↓", "PV(X) diminue → strike moins coûteux pour call, moins protecteur pour put"],
              ["Coûts de détention ↑ (storage)", "↑", "↓", "Comme le sous-jacent coûte plus cher à détenir, l'acheteur du call en bénéficie davantage"],
              ["Bénéfices de détention ↑ (dividendes)", "↓", "↑", "Ex-div : S baisse → call perd de la valeur, put en gagne"],
            ]}
          />
          <FCard title="Cas spécial : la volatilité">
            La volatilité est le seul facteur qui augmente <em>toujours</em> la valeur des deux types d'options. L'acheteur bénéficie de l'asymétrie : les grands mouvements favorables sont captés (exercice), les grands mouvements défavorables sont ignorés (non-exercice). Plus la volatilité est élevée, plus cette asymétrie a de valeur.
          </FCard>
          <FCard title="Option américaine vs européenne">
            Une option américaine peut être exercée à tout moment avant T → elle vaut au moins autant qu'une option européenne de mêmes caractéristiques : C_américain ≥ C_européen.
            <br /><br />
            <strong>Exercice anticipé d'un call :</strong> jamais optimal sur un actif sans dividendes (car exercer renonce à la valeur temps sans gain). Peut être optimal pour capturer un dividende imminent.
            <br /><br />
            <strong>Exercice anticipé d'un put :</strong> peut être optimal pour un put deep ITM (les intérêts sur le strike X reçus maintenant {">"} la valeur temps résiduelle).
          </FCard>
        </Sec>

      </Reading>

      {/* ══════════ R74 ══════════ */}
      <Reading id="r74" number="Reading 74" title="Option Replication Using Put-Call Parity">

        <Sec los="LOS 74.a" label="Parité put-call — Démonstration et formule">
          <FCard title="Démonstration par deux portefeuilles">
            <strong>Portefeuille A — &quot;Fiduciary call&quot; :</strong> Long call (strike X, maturité T) + Investissement de PV(X) au taux sans risque (= bond sans risque payant X à T).
            <br /><br />
            <strong>Portefeuille B — &quot;Protective put&quot; :</strong> Long put (même X, même T) + Long action (S₀).
            <br /><br />
            <strong>À l'échéance :</strong>
            <br />Si S_T {'>'} X : Portfolio A = (S_T − X) + X = S_T. Portfolio B = 0 + S_T = S_T. ✓ Identiques.
            <br />Si S_T {'<'} X : Portfolio A = 0 + X = X. Portfolio B = (X − S_T) + S_T = X. ✓ Identiques.
            <br /><br />
            Mêmes payoffs dans tous les états → même prix aujourd'hui.
            <Rule c="blue">Terminologie officielle Schweser : &quot;fiduciary call&quot; = call + bond sans risque ; &quot;protective put&quot; = put + actif sous-jacent. Ces deux portefeuilles ont le même payoff futur — c&apos;est la formulation canonique de la parité put-call.</Rule>
          </FCard>
          <Formula>c + X(1+Rf)^-T = p + S₀</Formula>
          <FCard title="Exemple numérique">
            c = 9, S₀ = 100, X = 95, r = 4%, T = 0,5 an.
            <br /><br />
            X(1+Rf)^-T = 95 / (1,04)^0,5 = 95 / 1,0198 = 93,16
            <br /><br />
            p = c + X(1+Rf)^-T − S₀ = 9 + 93,16 − 100 = <strong>2,16</strong>
            <br /><br />
            Vérification : si p cotait 3 (trop cher), l'arbitrage serait : acheter call (−9), placer X(1+Rf)^-T (−93,16), vendre put (+3), vendre action (+100). Flux net = 0,84 {'>'} 0. ✓
          </FCard>
          <FCard title="Les 4 positions synthétiques">
            <strong>1. Long call synthétique :</strong> c = p + S − X(1+Rf)^-T → Long put + Long action + Emprunt X(1+Rf)^-T
            <br /><br />
            <strong>2. Long put synthétique :</strong> p = c − S + X(1+Rf)^-T → Long call + Short action + Prêt X(1+Rf)^-T
            <br /><br />
            <strong>3. Long action synthétique :</strong> S = c − p + X(1+Rf)^-T → Long call + Short put + Prêt X(1+Rf)^-T
            <br /><br />
            <strong>4. Long bond synthétique :</strong> X(1+Rf)^-T = p − c + S → Long put + Short call + Long action
          </FCard>
          <FCard title="Application — Options theory et finance d'entreprise">
            L'equity d'une société endettée (dette zéro-coupon D à maturité T) se comporte comme un <strong>call sur la valeur des actifs V_T</strong>, strike = D : Equity = Max(0, V_T − D).
            <br /><br />
            La dette risquée équivaut à Min(V_T, D) = un bond sans risque payant D <strong>moins</strong> un put vendu sur V_T (strike D). Les actionnaires détiennent implicitement une option, les créanciers ont vendu cette option (moins un put).
          </FCard>
        </Sec>

        <Sec los="LOS 74.b" label="Put-Call Forward Parity">
          <FCard title="Formule et dérivation">
            Quand S₀ n'est pas directement observable (commodities, taux), on utilise le prix forward F₀ :
          </FCard>
          <Formula>c₀ + X(1+Rf)^-T = F₀(T)(1+Rf)^-T + p₀     ↔     c − p = [F₀(T) − X](1+Rf)^-T</Formula>
          <FCard title="Dérivation">
            On substitue S₀ = F₀(T)(1+Rf)^-T dans la parité standard :
            <br />c + X(1+Rf)^-T = p + F₀(T)(1+Rf)^-T
            <br />c − p = [F₀(T) − X](1+Rf)^-T
            <br /><br />
            <strong>Cas particulier :</strong> Si F₀ = X (options ATM forward) → c = p. Un call et un put ATM forward de même maturité ont le même prix.
          </FCard>
          <FCard title="Exemple numérique & forward synthétique">
            F₀ = 105, X = 100, r = 5%, T = 1 an.
            <br /><br />
            c − p = (105 − 100) / (1,05) = 5 / 1,05 = <strong>4,76</strong>
            <br /><br />
            <strong>Forward synthétique :</strong> Long call + Short put de même X et T = Long forward synthétique. Le payoff à T = max(S_T − X, 0) − max(X − S_T, 0) = S_T − X, identique à un long forward.
          </FCard>
        </Sec>

      </Reading>

      {/* ══════════ R75 ══════════ */}
      <Reading id="r75" number="Reading 75" title="Valuing a Derivative Using a One-Period Binomial Model">

        <Sec los="LOS 75.a" label="Construction du modèle binomial">
          <FCard title="Setup et condition de no-arbitrage">
            Le modèle suppose que le sous-jacent peut prendre seulement deux valeurs à T :
            <br /><br />
            <strong>S_u = S₀ × u</strong> (état haussier, facteur u {'>'} 1)
            <br /><strong>S_d = S₀ × d</strong> (état baissier, facteur d {'<'} 1)
            <br /><br />
            <strong>Condition de no-arbitrage :</strong> u {'>'} (1+r) {'>'} d
            <br />— Si u ≤ (1+r) : le sous-jacent ne bat jamais le taux sans risque → personne ne l'achèterait.
            <br />— Si d ≥ (1+r) : emprunter pour acheter l'actif est toujours gagnant → arbitrage infini.
          </FCard>
          <FCard title="Payoffs de l'option dans chaque état">
            Call : c_u = max(0, S_u − X) ; c_d = max(0, S_d − X)
            <br />Put : p_u = max(0, X − S_u) ; p_d = max(0, X − S_d)
          </FCard>
          <FCard title="Méthode 1 — Portefeuille sans risque (hedge ratio)">
            On construit un portefeuille P = h × S − 1 call qui a la même valeur dans les deux états (sans risque).
            <br /><br />
            <strong>Condition :</strong> h × S_u − c_u = h × S_d − c_d
          </FCard>
          <Formula>h (delta) = (c_u − c_d) / (S_u − S_d)</Formula>
          <FCard title="Suite méthode 1">
            La valeur certaine du portefeuille à T = h × S_u − c_u (identique dans les deux états).
            <br /><br />
            Sa valeur aujourd'hui = (h × S_u − c_u) / (1+r) [actualisation au taux sans risque car le flux est certain].
            <br /><br />
            Prix de l'option : c₀ = h × S₀ − (h × S_u − c_u) / (1+r)
          </FCard>
          <FCard title="Méthode 2 — Probabilités risque-neutres">
            Les probabilités risque-neutres π permettent de calculer l'espérance sous la mesure risque-neutre :
          </FCard>
          <Formula>π = ((1+r) − d) / (u − d)</Formula>
          <FCard title="Suite méthode 2">
            1 − π = probabilité risque-neutre de baisse = (u − (1+r)) / (u − d)
            <br /><br />
            c₀ = [π × c_u + (1−π) × c_d] / (1+r)
            <br /><br />
            Les deux méthodes donnent <em>exactement</em> le même résultat.
          </FCard>
          <FCard title="Exemple numérique COMPLET — Call">
            S₀ = 50, u = 1,25, d = 0,80, r = 5%, X = 52.
            <br /><br />
            <strong>États finaux :</strong>
            <br />S_u = 50 × 1,25 = 62,5. c_u = max(0, 62,5 − 52) = <strong>10,5</strong>
            <br />S_d = 50 × 0,80 = 40. c_d = max(0, 40 − 52) = <strong>0</strong>
            <br /><br />
            <strong>Méthode 1 — Delta hedge :</strong>
            <br />h = (10,5 − 0) / (62,5 − 40) = 10,5 / 22,5 = <strong>0,4667</strong>
            <br />Valeur portefeuille à T = 0,4667 × 62,5 − 10,5 = 29,1667 − 10,5 = 18,6667 (état haut)
            <br />Vérification état bas : 0,4667 × 40 − 0 = 18,6667 ✓
            <br />PV = 18,6667 / 1,05 = 17,7778
            <br />c₀ = h × S₀ − PV = 0,4667 × 50 − 17,7778 = 23,3333 − 17,7778 = <strong>5,56$</strong>
            <br /><br />
            <strong>Méthode 2 — Probabilités risque-neutres :</strong>
            <br />π = (1,05 − 0,80) / (1,25 − 0,80) = 0,25 / 0,45 = <strong>0,5556</strong>
            <br />1 − π = 0,4444
            <br />c₀ = (0,5556 × 10,5 + 0,4444 × 0) / 1,05 = 5,8333 / 1,05 = <strong>5,56$</strong>
            <br /><br />
            Les deux méthodes donnent EXACTEMENT le même résultat (5,56$) — c'est le point pédagogique central : sans arrondi intermédiaire agressif, les deux approches convergent parfaitement.
          </FCard>
          <FCard title="Portefeuille sans risque pour un PUT">
            Pour un put, le portefeuille sans risque est <strong>long h actions + LONG le put</strong> (pas short, contrairement au call où l'on est short le call).
            <Formula>h_put = (p_d − p_u) / (S_u − S_d)  (en valeur absolue, mêmes principes)</Formula>
          </FCard>
        </Sec>

        <Sec los="LOS 75.b" label="Risk-neutrality">
          <FCard title="Concept de risk-neutrality">
            Le monde risque-neutre est un cadre de calcul (pas une description du réel) où on suppose que tous les agents sont indifférents au risque → tout actif rapporte le taux sans risque en espérance.
            <br /><br />
            Sous cette hypothèse, π est la probabilité implicite de hausse qui fait que E^Q[S_T] = S₀ × (1+r). Ces probabilités risque-neutres ≠ probabilités réelles du marché (qui intègrent les préférences pour le risque et les primes de risque).
            <br /><br />
            <strong>Clé :</strong> le prix de no-arbitrage est identique peu importe les préférences des investisseurs pour le risque — le pricing risk-neutral s'applique à tout modèle utilisant des mouvements futurs du sous-jacent. On peut donc calculer dans le cadre le plus simple (risque-neutre) et obtenir le bon prix.
          </FCard>
          <FCard title="Exemple numérique — Put européen (mêmes paramètres)">
            S₀ = 50, u = 1,25, d = 0,80, r = 5%, X = 52.
            <br /><br />
            S_u = 62,5 : p_u = max(0, 52 − 62,5) = 0
            <br />S_d = 40 : p_d = max(0, 52 − 40) = 12
            <br /><br />
            π = 0,5556, 1−π = 0,4444.
            <br />p₀ = (0,5556 × 0 + 0,4444 × 12) / 1,05 = 5,3333 / 1,05 = <strong>5,08$</strong>
            <br /><br />
            Vérification via parité put-call : c − p = S₀ − X(1+Rf)^-T → 5,56 − 5,08 = 0,48. X(1+Rf)^-T = 52/1,05 = 49,52. S₀ − 49,52 = 0,48. ✓
          </FCard>
          <FCard title="Pour aller plus loin (hors LOS strict niveau I)">
            La construction d&apos;un arbre multi-périodes (backward induction, arbre recombiné u×d=d×u) et la décision d&apos;exercice anticipé pour options américaines (max entre valeur d&apos;exercice immédiat et valeur de continuation actualisée) ne sont pas couvertes explicitement par LOS 75.a/75.b — la reading se limite au modèle à UNE période. Le curriculum précise même que le calcul des probabilités risque-neutres n&apos;est pas requis pour l&apos;examen Niveau I ; seule la COMPRÉHENSION du concept l&apos;est.
          </FCard>
        </Sec>

      </Reading>
    </>
  );
}
