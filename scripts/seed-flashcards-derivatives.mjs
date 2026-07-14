// Seed script — Flashcards Système Instruments Dérivés (CFA Level I,
// R68-R77 dans la numérotation de la banque de questions — voir mémoire
// schweser-books.md / workflow-creation-fiches-cfa.md pour l'offset avec la
// fiche de révision, qui utilise R66-R75). Contenu vérifié depuis Book 3 -
// Fixed Income - Derivatives.pdf (Schweser) et croisé avec les QCM
// vérifiées. Même format que Fixed Income : front = question seule, back =
// réponse concise, 3 sets par sous-thème.
// Usage: node scripts/seed-flashcards-derivatives.mjs
import { getOwnerId, ensureFolder, seedFlashcardSets } from "./lib/seed-core.mjs";

const FOLDER_NAME = "Instruments Dérivés (Système)";

const SETS = [
  {
    title: "Derivative Features, Instruments & Uses (R68–R70)",
    cards: [
      ["Qu'est-ce qu'un dérivé ?", "Un instrument financier dont la valeur dépend (dérive) de la valeur d'un autre actif ou d'une variable (le sous-jacent), à une date future spécifique."],
      ["Quels sont les sous-jacents possibles d'un dérivé ?", "Actions, obligations, taux d'intérêt, devises, commodities (dures/molles), indices, volatilité, crédit, météo, cryptomonnaies, longévité."],
      ["Hedging vs spéculation ?", "Hedging : réduire un risque existant. Spéculation : prendre une position sans risque préexistant, pariant sur le prix futur."],
      ["3 avantages des dérivés par rapport à une transaction cash ?", "Exposition à faible coût (levier), coûts de transaction plus bas, impact de marché réduit."],
      ["Quelles sont les 5 grandes catégories de dérivés ?", "Forwards, futures, swaps (forward commitments) ; options, credit derivatives / CDS (contingent claims)."],
      ["Forward vs futures — différence principale ?", "Futures = standardisé, négocié en bourse, chambre de compensation, mark-to-market quotidien. Forward = OTC, sur mesure, risque de contrepartie direct."],
      ["Rôle de la chambre de compensation (clearinghouse) ?", "Devient la contrepartie de chaque côté du trade (novation), garantit l'exécution, exige des dépôts de marge des deux parties."],
      ["Clearing vs settlement ?", "Clearing = exécution du trade, enregistrement des participants, traitement des paiements. Settlement = échange effectif du sous-jacent ou paiement final à maturité."],
      ["Initial margin vs maintenance margin ?", "Initial margin : dépôt requis à l'ouverture. Maintenance margin : solde minimum ; si le compte tombe en dessous, dépôt requis pour REVENIR à l'initial margin (pas à la maintenance margin)."],
      ["Mark-to-market (MTM) ?", "Ajustement quotidien du solde de marge selon le settlement price du jour — gains/pertes réglés chaque soir sur un futures."],
      ["Qu'est-ce qu'un swap plain vanilla ?", "Échange de paiements périodiques sur un notionnel non échangé : un côté paie taux fixe, l'autre taux variable (MRR)."],
      ["Qu'est-ce qu'un CDS (credit default swap) ?", "L'acheteur de protection paie une prime périodique ; le vendeur paie seulement si un événement de crédit (défaut) survient sur l'entité de référence."],
      ["Forward commitment vs contingent claim ?", "Forward commitment (forwards, futures, swaps) : obligation bilatérale symétrique. Contingent claim (options, CDS) : payoff qui dépend d'un événement, asymétrique."],
      ["Pourquoi le CDS est-il un contingent claim et pas un forward commitment ?", "Le paiement du vendeur de protection dépend d'un événement futur (le défaut) — ce n'est pas une obligation ferme comme un forward."],
      ["Breakeven d'un long call ?", "X + c₀ (exercice price + prime payée)."],
      ["Breakeven d'un long put ?", "X − p₀ (exercice price − prime payée)."],
      ["Perte maximale pour l'acheteur d'une option (call ou put) ?", "La prime payée (c₀ ou p₀) — jamais plus."],
      ["Perte maximale pour le vendeur (writer) d'un call ?", "Illimitée (le sous-jacent peut monter indéfiniment)."],
      ["Warrant vs option classique ?", "Warrant : émis par la société sur ses propres actions, l'exercice entraîne une émission d'actions nouvelles (dilution). Option classique : porte sur des actions déjà existantes."],
      ["Swaption payeur vs swaption receveur ?", "Payeur : droit d'entrer dans un IRS en payant le taux fixe. Receveur : droit d'entrer en recevant le taux fixe."],
      ["CDS vs total return swap (TRS) ?", "CDS : isole le risque de crédit uniquement. TRS : échange le rendement TOTAL (prix + crédit) d'une obligation contre un taux fixe/variable."],
      ["Qu'est-ce qu'un credit-linked note (CLN) ?", "Titre dont les flux proviennent d'une obligation sous-jacente — combine une dette + une position CDS vendue."],
      ["Avantages des dérivés (4 grandes catégories) ?", "Gestion/transfert du risque, information discovery (volatilité implicite, taux futurs anticipés), avantages opérationnels (short selling, coûts, levier, liquidité), amélioration de l'efficience de marché."],
      ["Qu'est-ce que l'\"Information Discovery\" (pas \"Price Discovery\") ?", "Les prix d'options révèlent la volatilité implicite anticipée ; les futures de taux révèlent les taux futurs attendus et les décisions de banque centrale anticipées."],
      ["5 risques des dérivés ?", "Levier implicite, basis risk, liquidity risk, counterparty credit risk, systemic risk."],
      ["Qu'est-ce que le basis risk ?", "Le sous-jacent du dérivé ne correspond pas exactement à la position couverte (ex : futures pétrole brut pour couvrir du kérosène)."],
      ["Qui a un risque de contrepartie sur une option — l'acheteur ou le vendeur ?", "Seul l'acheteur : le vendeur a déjà reçu la prime, il ne peut rien devoir de plus."],
      ["Cash flow hedge — définition et exemple ?", "Réduit la volatilité de FLUX FUTURS. Ex : forward FX sur des ventes export prévues ; swap convertissant une dette VARIABLE en fixe."],
      ["Fair value hedge — définition et exemple ?", "Réduit la volatilité de la VALEUR au bilan. Ex : swap sur une dette à taux FIXE ; forward sur un inventaire de commodity."],
      ["Net investment hedge — définition et exemple ?", "Réduit la volatilité de la valeur d'une FILIALE ÉTRANGÈRE — forward/futures devises."],
      ["Piège classique : dette à taux fixe vs variable et type de hedge ?", "Dette FIXE → fair value hedge (la valeur du passif varie). Dette VARIABLE convertie en fixe → cash flow hedge (les flux futurs sont fixés)."],
      ["Comment un investisseur protège-t-il le downside d'une action tout en gardant l'upside ?", "En achetant un PUT (protective put) — vendre un call (covered call) plafonne l'upside au lieu de le garder."],
    ],
  },
  {
    title: "Arbitrage, Forward, Futures & Swap Pricing (R71–R74)",
    cards: [
      ["Law of one price ?", "Deux actifs produisant des cash flows identiques dans tous les états futurs doivent avoir le même prix aujourd'hui, sinon il existe un arbitrage."],
      ["Qu'est-ce que l'arbitrage ?", "Acheter un actif sous-évalué et vendre simultanément un actif équivalent sur-évalué, réalisant un profit sans risque ni mise de fonds nette."],
      ["Réplication statique vs dynamique ?", "Forward : réplication statique (une seule transaction initiale). Option : réplication dynamique (ajustement continu du hedge ratio, car le delta change)."],
      ["Formule du prix forward sans coûts/bénéfices ?", "F₀(T) = S₀ × (1+Rf)^T"],
      ["Un bénéfice de détention (dividende, convenience yield) a quel effet sur F₀ ?", "Diminue le prix forward de non-arbitrage."],
      ["Un coût de détention (storage) a quel effet sur F₀ ?", "Augmente le prix forward de non-arbitrage."],
      ["Piège : un convenience yield plus FAIBLE a quel effet sur F₀ ?", "Augmente F₀ (moins de bénéfice = comme un coût qui augmente)."],
      ["Contango vs backwardation ?", "Contango : F₀ > S₀ (coûts de stockage dominent). Backwardation : F₀ < S₀ (convenience yield élevé, pénurie physique)."],
      ["Formule cost of carry (composition continue) ?", "F₀(T) = S₀ × e^((r+γ−θ−δ)×T) — r=taux, γ=stockage, θ=convenience yield, δ=revenus (dividendes/coupons)."],
      ["Prix vs valeur d'un forward — différence clé ?", "Le PRIX (F₀) reste constant toute la vie du contrat. La VALEUR (V_t) fluctue selon le sous-jacent."],
      ["Valeur d'un long forward en cours de vie (t<T) ?", "V_t(T) = S_t − F₀(T)(1+Rf)^-(T-t)"],
      ["Valeur d'un forward à l'initiation ?", "Zéro (le prix est fixé pour que la valeur initiale soit nulle aux deux parties)."],
      ["Notation FRA \"j×k\" ?", "Le contrat démarre dans j mois et porte sur un taux de (k−j) mois. Ex : FRA 3×6 = taux 3 mois démarrant dans 3 mois."],
      ["Long FRA — qui reçoit quoi ?", "Le long (fixed-rate payer) reçoit le taux variable réalisé, paie le taux FRA fixe — se couvre contre une hausse des taux."],
      ["Le payoff d'un FRA est actualisé à quel taux ?", "Toujours au taux RÉALISÉ à l'échéance, pas au taux forward initial."],
      ["Notation \"AyBy\" pour un taux forward ?", "Taux B-ans démarrant dans A ans. Ex : 2y3y = taux forward 3 ans dans 2 ans (PAS un taux se terminant dans 2 ans)."],
      ["Formule générale du taux forward implicite ?", "(1+Z_n)^n = (1+Z_m)^m × (1+F_m,n-m)^(n-m)"],
      ["FRA — quel type de dérivé (forward commitment ou contingent claim) ?", "Forward commitment — utilisé pour verrouiller un taux d'emprunt/prêt futur sur UNE période. Un swap fait la même chose sur plusieurs périodes."],
      ["Différence clé forward vs futures pour la valeur/prix ?", "Forward : prix constant, valeur fluctue. Futures : prix ET valeur changent chaque jour (MTM ramène la valeur à zéro quotidiennement)."],
      ["Quand futures > forward (même sous-jacent) ?", "Quand taux d'intérêt et prix du sous-jacent sont POSITIVEMENT corrélés (ex : actions)."],
      ["Quand futures < forward (même sous-jacent) ?", "Quand taux d'intérêt et prix du sous-jacent sont NÉGATIVEMENT corrélés (ex : obligations) — ce n'est pas une opportunité d'arbitrage."],
      ["Formule du prix d'un futures de taux d'intérêt ?", "Futures price = 100 − (100 × MRR_A,B-A)"],
      ["Formule du BPV (basis point value) d'un futures de taux ?", "BPV = notionnel × période × 0,01%"],
      ["Comparé à un futures de taux équivalent, un FRA a quelle propriété ?", "Le FRA \"exhibits greater convexity\" — le futures a un payoff linéaire (BPV parfaitement symétrique), le FRA est convexe (actualisation au taux réalisé)."],
      ["Un swap peut être décomposé en quoi ?", "Une série de FRAs, un par date de paiement — chacun avec un taux forward = le swap fixed rate (SFR)."],
      ["Piège : chaque FRA équivalent à un swap a-t-il une valeur nulle à l'initiation ?", "NON — seule la SOMME des valeurs des FRAs est nulle à l'initiation. Certains FRAs individuels ont une valeur positive, d'autres négative."],
      ["Formule du swap fixed rate (SFR) ?", "SFR = (1 − Z_N) / (Z_1 + Z_2 + ... + Z_N), où Z sont les facteurs d'actualisation."],
      ["Valeur du swap pour le payeur fixe, formule générale ?", "PV(flux variables attendus) − PV(flux fixes)."],
      ["Qui profite d'une hausse des taux attendue dans un IRS ?", "Le payeur fixe (receveur variable) — les flux variables reçus augmentent, les fixes payés restent constants."],
      ["Comment répliquer la position du floating-rate payer dans un swap ?", "Emprunter à taux VARIABLE et acheter un bond à taux FIXE avec le produit — l'inverse exact du fixed-rate payer."],
      ["Currency swap — particularité par rapport à un IRS classique ?", "Échange de flux dans DEUX devises différentes, avec échange du principal à l'initiation ET à l'échéance."],
    ],
  },
  {
    title: "Option Pricing, Parity & Binomial Model (R75–R77)",
    cards: [
      ["Moneyness — définition ITM/ATM/OTM pour un call ?", "ITM si S > X, ATM si S = X, OTM si S < X."],
      ["Moneyness — définition ITM/ATM/OTM pour un put ?", "ITM si X > S, ATM si S = X, OTM si X < S."],
      ["Formule de la valeur d'exercice (intrinsic value) ?", "Call : Max(0, S−X). Put : Max(0, X−S)."],
      ["Formule décomposant le prix d'une option ?", "Prix (prime) = valeur d'exercice + valeur temps."],
      ["Valeur temps à l'expiration ?", "Toujours zéro."],
      ["Piège : valeur d'exercice = valeur temps à l'expiration pour quel type d'option ?", "Seulement une option OUT-OF-THE-MONEY (les deux valent zéro). Pour une option ITM, valeur temps = 0 mais valeur d'exercice ≠ 0."],
      ["Borne supérieure d'un call européen ?", "c_t ≤ S_t (jamais plus que l'actif lui-même)."],
      ["Borne supérieure d'un put européen ?", "p_t ≤ X(1+Rf)^-(T-t) — la valeur actualisée du strike (le put ne peut être exercé avant l'échéance)."],
      ["Borne inférieure d'un call européen ?", "c₀ ≥ Max[0, S₀ − X(1+Rf)^-T]"],
      ["Borne inférieure d'un put européen ?", "p₀ ≥ Max[0, X(1+Rf)^-T − S₀]"],
      ["Piège : qui a des bornes de non-arbitrage — forwards ou options ?", "Seules les options (contingent claims). Les forward commitments n'en ont pas (sauf une borne triviale à zéro si le sous-jacent ne peut être négatif)."],
      ["6 facteurs déterminant le prix d'une option ?", "Prix du sous-jacent, exercise price, taux sans risque, volatilité, temps à expiration, coûts/bénéfices de détention."],
      ["Effet d'une hausse de volatilité sur call ET put ?", "Augmente TOUJOURS les deux — c'est le seul facteur qui affecte systématiquement call et put dans le même sens."],
      ["Effet d'une hausse du taux sans risque sur call vs put ?", "Augmente la valeur du call, diminue la valeur du put."],
      ["Effet d'un dividende/intérêt du sous-jacent sur un call ?", "Diminue sa valeur (le call n'en bénéficie pas, contrairement au détenteur du sous-jacent)."],
      ["Piège : le temps à expiration augmente-t-il toujours la valeur d'un put européen ?", "Pas toujours — pour un put deep ITM, une durée plus longue peut DIMINUER sa valeur (paiement différé)."],
      ["Fiduciary call — composition ?", "Long call + bond sans risque payant X à l'échéance."],
      ["Protective put — composition ?", "Long put + long position dans le sous-jacent."],
      ["Formule de la parité put-call ?", "c₀ + X(1+Rf)^-T = p₀ + S₀"],
      ["Comment créer un long call synthétique ?", "Long put + long action + emprunt de X(1+Rf)^-T."],
      ["Comment créer un long put synthétique ?", "Long call + short action + prêt de X(1+Rf)^-T."],
      ["Formule de la parité put-call-forward ?", "c₀ + X(1+Rf)^-T = F₀(T)(1+Rf)^-T + p₀"],
      ["Recette d'arbitrage si un put est SUR-évalué vs parité ?", "Acheter call, prêter PV(X), vendre put, vendre l'action."],
      ["Recette d'arbitrage si un put est SOUS-évalué vs parité ?", "Acheter put, vendre call, emprunter PV(X), acheter l'action (l'inverse exact)."],
      ["Application de la parité put-call à la finance d'entreprise — equity d'une société endettée ?", "L'equity se comporte comme un call sur la valeur des actifs V_T, strike = valeur de la dette D : Equity = Max(0, V_T − D)."],
      ["Et la dette risquée dans ce cadre ?", "Équivaut à un bond sans risque payant D, MOINS un put vendu sur V_T (strike D)."],
      ["Conditions requises pour un modèle binomial à une période ?", "Valeur du sous-jacent, exercise price, facteurs u (hausse) et d (baisse), taux sans risque."],
      ["Condition de non-arbitrage sur u et d ?", "u > (1+r) > d"],
      ["Formule du hedge ratio (delta) pour un call ?", "h = (c_u − c_d) / (S_u − S_d)"],
      ["Formule des probabilités risque-neutres ?", "π = [(1+r) − d] / (u − d)"],
      ["Formule de la valeur d'une option via probabilités risque-neutres ?", "c₀ = [π × c_u + (1−π) × c_d] / (1+r)"],
      ["Piège : la valeur d'une option dépend de quelles probabilités ?", "UNIQUEMENT les probabilités risque-neutres (attendues) — jamais les probabilités réelles/actuelles du marché."],
      ["Le pricing risk-neutral nécessite quelle variable — volatilité ou rendement attendu ?", "La volatilité attendue, PAS le rendement attendu — c'est pour ça que la méthode fonctionne peu importe l'aversion au risque du marché."],
      ["Portefeuille sans risque pour un put dans le modèle binomial ?", "Long h actions + LONG le put (pas short, contrairement au call où l'on est short le call)."],
      ["Les deux méthodes de valorisation binomiale (hedge portfolio vs risque-neutre) donnent-elles le même résultat ?", "Oui, exactement le même résultat — ce sont deux façons équivalentes de faire le même calcul de non-arbitrage."],
      ["Le calcul des probabilités risque-neutres est-il exigé à l'examen CFA Niveau I ?", "Non — seule la COMPRÉHENSION du concept est requise, pas le calcul détaillé, d'après le curriculum."],
    ],
  },
];

async function main() {
  const ownerId = await getOwnerId();
  const folderId = await ensureFolder(ownerId, FOLDER_NAME, "flashcards");

  console.log("Flashcards Instruments Dérivés...");
  const total = await seedFlashcardSets({ ownerId, folderId, sets: SETS });

  console.log(`\n✅ Terminé. ${total} cartes créées sur ${SETS.length} sets.`);
}

main().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});
