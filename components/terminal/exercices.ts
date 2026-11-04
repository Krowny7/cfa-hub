import { TERMINAL } from "@/lib/voice-terminal";
import { VALEURS, bpa, dec, ebitda, levier, margeEbit, per, valeurDe, veEbitda } from "./donnees";

// Les exercices guidés du Terminal. Une étape « commande » avance dès que le joueur ouvre le bon
// écran ; une question se répond dans le panneau. Les réponses sont calculées sur les données.

export type EtapeQuestion =
  | { t: "nombre"; consigne: string; reponse: number; tolerance: number; unite: string; corrige: string }
  | { t: "valeur"; consigne: string; reponse: string; corrige: string };

export type EtapeExercice = { t: "commande"; consigne: string; attendu: string } | EtapeQuestion;

export type Exercice = { id: string; titre: string; sous: string; etapes: EtapeExercice[] };

const orvane = valeurDe("ORVX");
const derniere = orvane.comptes[orvane.comptes.length - 1];
const moinsChere = VALEURS.reduce((m, v) => (veEbitda(v) < veEbitda(m) ? v : m));

const FICHE = TERMINAL.exoFiche;
const CHERE = TERMINAL.exoMoinsChere;

export const EXERCICES: Exercice[] = [
  {
    id: "fiche",
    titre: FICHE.titre,
    sous: FICHE.sous,
    etapes: [
      { t: "commande", consigne: FICHE.marches, attendu: "MARCHES" },
      { t: "commande", consigne: FICHE.ouvrir, attendu: `FICHE ${orvane.code}` },
      { t: "nombre", consigne: FICHE.per, reponse: per(orvane), tolerance: 0.1, unite: "x", corrige: FICHE.perCorrige(dec(orvane.cours), dec(bpa(orvane)), dec(per(orvane), 1)) },
      { t: "commande", consigne: FICHE.etats, attendu: `ETATS ${orvane.code}` },
      { t: "nombre", consigne: FICHE.marge, reponse: margeEbit(orvane), tolerance: 0.1, unite: "%", corrige: FICHE.margeCorrige(dec(derniere.ebit, 0), dec(derniere.ca, 0), dec(margeEbit(orvane), 1)) },
    ],
  },
  {
    id: "moins-chere",
    titre: CHERE.titre,
    sous: CHERE.sous,
    etapes: [
      { t: "commande", consigne: CHERE.comparer, attendu: "COMPARER" },
      { t: "valeur", consigne: CHERE.choix, reponse: moinsChere.code, corrige: CHERE.choixCorrige(moinsChere.code, dec(veEbitda(moinsChere), 1)) },
      { t: "commande", consigne: CHERE.ouvrir, attendu: `FICHE ${moinsChere.code}` },
      { t: "nombre", consigne: CHERE.levier, reponse: levier(moinsChere), tolerance: 0.02, unite: "x", corrige: CHERE.levierCorrige(dec(moinsChere.detteNette, 0), dec(ebitda(moinsChere), 0), dec(levier(moinsChere))) },
    ],
  },
];
