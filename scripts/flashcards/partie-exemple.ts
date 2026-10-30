import { titreCarte, type CarteJeu, type Partie } from "@/lib/flashcards/partie";

// Une partie factice pour l'aperçu de la partie de cartes (et le test de
// rendu) : 3 mains de 3 cartes sur Fixed Income, FSA et Economics, au vrai
// format des flashcards officielles (recto court ; verso « À retenir avec
// ==passage surligné== », « En clair : », « Piège : » facultatif).

type Brut = { matiere: string; nom: string; abrege: string; theme: string; front: string; back: string };

const BRUTES: Brut[] = [
  {
    matiere: "fixed_income",
    nom: "Fixed Income",
    abrege: "FI",
    theme: "Instruments, émission & marchés",
    front: "Affirmative covenant vs negative covenant dans l'indenture d'une bond : quelle différence ?",
    back: "Affirmative = ==obligation de faire== · negative = ==interdiction de faire==\nEn clair : affirmative : payer les coupons, publier ses comptes. Negative : interdire une nouvelle dette plus senior ou la vente du collateral.",
  },
  {
    matiere: "fsa",
    nom: "FSA",
    abrege: "FSA",
    theme: "Cadre d'analyse, résultat & bilan",
    front: "Que signifie chacun des 4 types d'audit opinion ?",
    back: "Unqualified · Qualified · Adverse · Disclaimer = ==fidèles · fidèles sauf exception · pas fidèles · pas d'avis==\nEn clair : unqualified = clean opinion. Disclaimer : l'auditeur n'a pas pu tout vérifier (scope limitation).\nPiège : un audit donne une reasonable assurance, pas une garantie absolue.",
  },
  {
    matiere: "economics",
    nom: "Economics",
    abrege: "ECO",
    theme: "Firmes et structures de marché",
    front: "Quelle règle de production maximise le profit d'une firme, quelle que soit la market structure ?",
    back: "Profit maximal quand ==marginal revenue = marginal cost== (MR = MC)\nEn clair : la règle vaut dans les 4 market structures. En perfect competition, P = MR, donc P = MC. Ailleurs, P > MR = MC.\nPiège : « P = MR » n'est vrai qu'en perfect competition (firme price taker).",
  },
  {
    matiere: "fixed_income",
    nom: "Fixed Income",
    abrege: "FI",
    theme: "Instruments, émission & marchés",
    front: "Callable bond et putable bond : quelle valeur, à partir de la straight bond (option-free) identique ?",
    back: "Callable = ==Straight − Call== · putable = ==Straight + Put==\nEn clair : le call appartient à l'issuer : la callable vaut moins et offre un yield plus haut. Le put appartient au bondholder : la putable vaut plus.",
  },
  {
    matiere: "fsa",
    nom: "FSA",
    abrege: "FSA",
    theme: "Flux de trésorerie & stocks",
    front: "Sous US GAAP, où classe-t-on interest paid, dividends paid, interest received et dividends received ?",
    back: "Tout en CFO, ==sauf dividends paid en CFF==\nEn clair : IFRS laisse le choix : paid en CFO ou CFF, received en CFO ou CFI.\nPiège : taxes paid : toujours en CFO sous US GAAP.",
  },
  {
    matiere: "economics",
    nom: "Economics",
    abrege: "ECO",
    theme: "Firmes et structures de marché",
    front: "Breakeven, short-run shutdown, long-run exit : quelles conditions sur P, l'AVC et l'ATC ?",
    back: "Breakeven : ==P = ATC== · short-run shutdown : ==P < AVC== · long-run exit : ==P < ATC==\nEn clair : si AVC ≤ P < ATC, la firme produit à court terme : elle couvre une partie des fixed costs. À long terme, tout est évitable : elle sort.\nPiège : fermer à court terme se juge sur l'AVC, pas sur l'ATC.",
  },
  {
    matiere: "fixed_income",
    nom: "Fixed Income",
    abrege: "FI",
    theme: "Instruments, émission & marchés",
    front: "Bullet, amortizing, sinking fund : comment le principal d'une bond est-il remboursé ?",
    back: "Bullet : ==tout à maturity== · amortizing : à chaque paiement · sinking fund : rachat périodique\nEn clair : une fully amortizing bond est soldée au dernier paiement ; une partially amortizing garde un balloon payment.\nPiège : le sinking fund réduit le credit risk mais crée un reinvestment risk si les taux baissent.",
  },
  {
    matiere: "fsa",
    nom: "FSA",
    abrege: "FSA",
    theme: "Cadre d'analyse, résultat & bilan",
    front: "Quelles sont les 5 étapes du modèle de revenue recognition commun à IFRS et US GAAP ?",
    back: "Contract · performance obligations · transaction price · allocation · ==recognize when satisfied==\nEn clair : le revenue est reconnu quand le control passe au client, pas à l'encaissement.\nPiège : un agent ne reconnaît que sa commission (net) ; un principal, le montant brut.",
  },
  {
    matiere: "economics",
    nom: "Economics",
    abrege: "ECO",
    theme: "Firmes et structures de marché",
    front: "Quelles sont les caractéristiques de la perfect competition ?",
    back: "Firmes très nombreuses · produit homogène · ==aucun pricing power==\nEn clair : chaque firme est price taker : sa demande est horizontale. À long terme, son economic profit est nul.",
  },
];

/** `n` cartes par main (3 par défaut), `mains` mains au plus. */
export function partieExemple(mains = 3, parMain = 3): Partie {
  const cartes: CarteJeu[] = BRUTES.slice(0, mains * parMain).map((b, i) => ({
    id: `ex-${i + 1}`,
    setId: `${b.matiere}-1`,
    matiere: b.matiere,
    matiereNom: b.nom,
    abrege: b.abrege,
    theme: b.theme,
    lieu: `${b.nom} · ${b.theme}`,
    rang: i + 1,
    front: b.front,
    back: b.back,
    titre: titreCarte(b.front),
  }));
  const out: CarteJeu[][] = [];
  for (let i = 0; i < cartes.length; i += parMain) out.push(cartes.slice(i, i + parMain));
  return { mains: out, parMain, jetons: cartes.length };
}
