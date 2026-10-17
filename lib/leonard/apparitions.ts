// Léonard : décider s'il apparaît (V3 §11.2). Module sans dépendance et sans
// effet, testé par scripts/leonard/test-repliques.ts ; l'hôte
// (components/leonard/LeonardHote) lit et écrit le compteur sur l'appareil.
// - Au plus 5 apparitions par jour de Paris. Les événements prioritaires
//   (progression, montée de rang, sceau gagné, sans-faute…) passent sans
//   attendre ni hasard, mais comptent dans les 5. Seule la visite guidée
//   (accueil, nouveautés) est hors compte.
// - Le jour J, rien : pas même la visite (elle attend le lendemain).
// - En mode sobre (user_metadata.rl_sobre, V3 §11.5), plus d'apparitions ;
//   la visite reste.
// - Entre deux apparitions ordinaires, 4 minutes au moins, et un peu de
//   hasard selon l'événement.

import type { EvenementLeonard } from "./signal";

export const MAX_JOUR = 5;
export const ECART_MIN = 4 * 60_000;

/** La chance qu'une réaction ordinaire se montre (absent : toujours). */
export const PROBA: Partial<Record<EvenementLeonard, number>> = {
  "session-ratee": 0.55,
  "session-moyenne": 0.3,
  "session-reussie": 0.45,
  "erreurs-serie": 0.75,
  "serie-bonnes": 0.8,
  "duel-gagne": 0.8,
  "duel-perdu": 0.65,
  "duel-ecrase": 0.85,
  "duel-nul": 0.5,
  "defi-reussi": 0.55,
  "defi-rate": 0.55,
  "atelier-progres": 0.9,
  "atelier-rayees": 0.75,
  "atelier-dur": 0.6,
  "atelier-fini": 0.5,
  tard: 0.6,
  "quete-faite": 0.55,
};

/** Ce qui passe sans délai ni hasard (mais compte dans les 5, sauf la visite). */
export const PRIORITAIRES = new Set<EvenementLeonard>(["tuto", "nouveautes", "progression", "rang-monte", "serie-sept", "sceau-gagne", "session-parfaite", "retour", "acte-nouveau", "devoile", "carnet"]);

export const estVisite = (evt: EvenementLeonard) => evt === "tuto" || evt === "nouveautes";

const JOUR_PARIS = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });
/** Le jour de Paris, « 2026-10-17 ». */
export const jourParis = (d: Date | number = new Date()) => JOUR_PARIS.format(typeof d === "number" ? new Date(d) : d);

/** Le compteur du jour, tel qu'il est gardé sur l'appareil. */
export type Compteur = { j: string; n: number };

export type Contexte = {
  /** le compteur lu sur l'appareil (un autre jour vaut zéro) */
  compteur: Compteur;
  /** l'heure de la dernière apparition (ms) */
  dernier: number;
  maintenant: number;
  jourJ: boolean;
  sobre: boolean;
  /** un tirage dans [0, 1[ */
  hasard: number;
};

export type Refus = "jour-j" | "sobre" | "plafond" | "ecart" | "hasard";
export type Decision = { ok: true; compteur: Compteur } | { ok: false; refus: Refus };

/** Léonard apparaît-il pour cet événement ? Si oui, le compteur à garder. */
export function decider(evt: EvenementLeonard, c: Contexte): Decision {
  if (c.jourJ) return { ok: false, refus: "jour-j" };
  const j = jourParis(c.maintenant);
  const n = c.compteur.j === j ? c.compteur.n : 0;
  if (estVisite(evt)) return { ok: true, compteur: { j, n } };
  if (c.sobre) return { ok: false, refus: "sobre" };
  if (n >= MAX_JOUR) return { ok: false, refus: "plafond" };
  if (!PRIORITAIRES.has(evt)) {
    if (c.maintenant - c.dernier < ECART_MIN) return { ok: false, refus: "ecart" };
    if (c.hasard > (PROBA[evt] ?? 1)) return { ok: false, refus: "hasard" };
  }
  return { ok: true, compteur: { j, n: n + 1 } };
}
