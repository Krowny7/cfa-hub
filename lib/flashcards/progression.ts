import { appareilPrime, boucleDuJoueur, horodatage, phase, reparer, valider, type EtatBoucle } from "@/lib/flashcards/boucle";
import { ETAT_PAQUET } from "@/lib/voice-z3c";

// La progression des flashcards sur le compte (migration_flashcard_progress.sql) :
// une ligne par joueur et par boucle, « set:<id du paquet> » ou
// « matiere:<clé> », avec l'état de lib/flashcards/boucle.ts. Module neutre
// (serveur et navigateur) : les clés, la validation d'un état reçu, ce qu'un
// onglet sait du compte (SuiviCompte : ne jamais écraser une progression
// faite ailleurs), le petit état affiché (« Tour 2 · 4 à revoir »,
// « Tour 1 · 8 restantes », « Maîtrisé · 12 oct. »). La lecture et
// l'écriture en base : progression-serveur.ts.

export const cleSet = (id: string) => `set:${id}`;
export const cleMatiere = (cle: string) => `matiere:${cle}`;
/** La clé de la même boucle sur l'appareil (localStorage) : l'id du paquet, ou « matiere:<clé> » telle quelle. */
export const cleLocale = (cle: string) => (cle.startsWith("set:") ? cle.slice(4) : cle);

/** Les clés permises (même règle que le CHECK de la table). */
export const CLE_PROGRESSION = /^(set:[0-9a-f-]{36}|matiere:[a-z0-9_]{1,40})$/;

/** Au-delà, un état n'est ni envoyé ni écrit (une boucle de 60 cartes pèse ~8 Ko ; la table refuse au-delà de 64 Ko). */
export const TAILLE_MAX = 48_000;

/** Une ligne lue en base : l'état tel quel (à valider) et son updated_at (ms). */
export type LigneProgression = { etat: unknown; maj: number };

/**
 * Ce que la page passe à la révision : la clé de la boucle sur le compte, la
 * ligne lue (null si jamais écrite) et l'heure de la lecture (une page
 * resservie par le cache du navigateur relit le compte). Absent : pas de
 * synchronisation (table pas encore créée, base injoignable) — la boucle
 * reste sur l'appareil.
 */
export type CompteBoucle = { cle: string; ligne: LigneProgression | null; lueA: number };

/** Un état relu du compte, d'accord avec les cartes actuelles (null : illisible ou plus rien à réviser). */
export function lireLigne(ligne: LigneProgression | null | undefined, ids: readonly string[]): { etat: EtatBoucle; maj: number } | null {
  if (!ligne) return null;
  const e = valider(ligne.etat);
  const r = e ? reparer(e, ids) : null;
  return r ? { etat: r, maj: ligne.maj } : null;
}

/** La version d'une ligne du compte : le `maj` de son état (sinon updated_at) ; null si illisible. */
export function majLigne(ligne: LigneProgression | null | undefined): number | null {
  const e = ligne ? valider(ligne.etat) : null;
  return e ? (e.maj ?? ligne!.maj) : null;
}

/**
 * Un état reçu du navigateur, prêt à écrire : bonne forme, taille bornée,
 * champs connus seulement (l'auteur local `u` n'est jamais écrit). `maj` est
 * gardé tel quel : il identifie la version (SuiviCompte), et la base
 * l'ordonne (déclencheur de migration_flashcard_progress.sql). null sinon.
 */
export function etatAEcrire(x: unknown): EtatBoucle | null {
  const e = valider(x);
  if (!e) return null;
  if (e.file.length > 600 || e.parcours.length > 200 || e.tour > 10_000) return null;
  const propre: EtatBoucle = {
    v: 1,
    tour: e.tour,
    file: e.file,
    pos: e.pos,
    marques: e.marques,
    premier: e.premier,
    parcours: e.parcours,
    derniere: e.derniere,
    vues: e.vues,
    debut: e.debut,
    dernier: e.dernier,
    actif: e.actif,
    fin: e.fin,
    maj: e.maj ?? e.dernier,
  };
  if (e.base !== undefined) propre.base = e.base;
  if (JSON.stringify(propre).length > TAILLE_MAX) return null;
  return propre;
}

// ---------------------------------------------------------------------------
// Ce qu'un onglet sait du compte

/**
 * Pour ne jamais écraser une progression faite ailleurs (autre appareil,
 * autre onglet). Chaque version écrite sur le compte est identifiée par son
 * `maj`. L'onglet retient celles qu'il a vues : lue par la page, relue, ou
 * envoyée par lui ; `connu`, la plus récente, est la base de ses gestes (la
 * base refuse un geste bâti sur une version dépassée). Une version relue, ou
 * rendue par un refus, que l'onglet n'a jamais vue a été écrite ailleurs :
 * elle l'emporte sur ce qu'il affiche.
 */
export class SuiviCompte {
  connu = 0;
  private vues: number[] = [];

  private voir(m: number) {
    this.connu = Math.max(this.connu, m);
    this.vues = [...this.vues.filter((x) => x !== m).slice(-63), m];
  }

  /** La ligne lue par la page au chargement (rien : jamais écrite). */
  lue(ligne: LigneProgression | null | undefined): void {
    const m = majLigne(ligne);
    if (m !== null) this.voir(m);
  }

  /** Un état parti vers le compte (action serveur ou balise) : sa version est connue. */
  envoye(e: EtatBoucle): void {
    if (e.maj !== undefined) this.voir(e.maj);
  }

  /** Une ligne relue du compte, ou rendue par un refus : true si elle a été écrite ailleurs. Elle devient connue. */
  recue(ligne: LigneProgression | null | undefined): boolean {
    const m = majLigne(ligne);
    if (m === null) return false;
    const ailleurs = !this.vues.includes(m);
    this.voir(m);
    return ailleurs;
  }

  /**
   * Horodate un geste : `maj` strictement croissant, au-delà de l'état d'avant
   * (`avant`) et, avec synchronisation, de toute version connue du compte,
   * même si l'horloge de l'appareil retarde ; `base` : la version connue
   * (avec synchronisation seulement).
   */
  horodater(suite: EtatBoucle, o: { synchro: boolean; avant?: number; maintenant?: number }): EtatBoucle {
    const plancher = Math.max(o.avant ?? 0, suite.maj ?? 0, o.synchro ? this.connu : 0);
    const e: EtatBoucle = { ...suite, maj: Math.max(o.maintenant ?? Date.now(), plancher + 1) };
    if (o.synchro) e.base = this.connu;
    else delete e.base;
    return e;
  }
}

// ---------------------------------------------------------------------------
// Où j'en suis : le résumé d'une boucle pour les listes

export type ResumeBoucle =
  | { genre: "tour1"; marquees: number; total: number }
  | { genre: "tours"; tour: number; aRevoir: number }
  | { genre: "fini"; fin: number }
  | { genre: "nouvelles"; fin: number; n: number };

/**
 * null : jamais commencée (ou recommencée sans geste depuis) — rien à
 * afficher. `total` : le nombre de cartes aujourd'hui ; une boucle bouclée
 * sur moins de cartes (cartes ajoutées depuis) n'est plus « Maîtrisé ».
 */
export function resumer(e: EtatBoucle, total?: number): ResumeBoucle | null {
  const p = phase(e);
  if (p === "fin") {
    if (e.fin === null || e.file.length === 0) return null;
    const bouclees = e.parcours[0] ?? e.file.length;
    return total !== undefined && total > bouclees ? { genre: "nouvelles", fin: e.fin, n: total - bouclees } : { genre: "fini", fin: e.fin };
  }
  const marquees = e.file.filter((id) => Object.prototype.hasOwnProperty.call(e.marques, id)).length;
  if (e.tour === 1 && p === "carte") return marquees > 0 ? { genre: "tour1", marquees, total: e.file.length } : null;
  // tour 2 et suivants, ou fin du tour 1 avec des cartes à revoir : ce qui n'est pas encore maîtrisé
  const maitrisees = e.file.filter((id) => e.marques[id] === true).length;
  return { genre: "tours", tour: e.tour, aRevoir: e.file.length - maitrisees };
}

/** Le petit état affiché (sérialisable : calculé par le serveur, rendu tel quel). */
export type EtatAffiche = { genre: ResumeBoucle["genre"]; texte: string; aide: string; fini: boolean };

const jourLong = (ms: number) => new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
const jourCourt = (ms: number) => new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });

export function afficher(r: ResumeBoucle | null): EtatAffiche | null {
  if (!r) return null;
  if (r.genre === "fini") return { genre: r.genre, texte: ETAT_PAQUET.fini(jourCourt(r.fin)), aide: ETAT_PAQUET.finiAide(jourLong(r.fin)), fini: true };
  if (r.genre === "nouvelles") return { genre: r.genre, texte: ETAT_PAQUET.nouvelles(r.n), aide: ETAT_PAQUET.nouvellesAide(r.n, jourLong(r.fin)), fini: false };
  if (r.genre === "tour1") return { genre: r.genre, texte: ETAT_PAQUET.tour1(r.marquees, r.total), aide: ETAT_PAQUET.tour1Aide(r.marquees, r.total), fini: false };
  return { genre: r.genre, texte: ETAT_PAQUET.tours(r.tour, r.aRevoir), aide: ETAT_PAQUET.toursAide(r.tour, r.aRevoir), fini: false };
}

/**
 * Le petit état d'une ligne lue en base. `cartes` : les ids actuels (la
 * boucle est réparée comme dans la révision : cartes retirées ôtées, cartes
 * ajoutées comptées) ou seulement leur nombre (listes : cartes ajoutées).
 */
export function etatAffiche(ligne: LigneProgression | null | undefined, cartes?: readonly string[] | number): EtatAffiche | null {
  const e = ligne ? valider(ligne.etat) : null;
  if (!e) return null;
  if (cartes === undefined || typeof cartes === "number") return afficher(resumer(e, cartes));
  const r = reparer(e, cartes);
  return r ? afficher(resumer(r, cartes.length)) : null;
}

/**
 * Où en est une boucle, pour une ligne de liste : l'état calculé par le
 * serveur (`affiche`), la version du compte (`maj`, null sans ligne), et de
 * quoi relire l'appareil après le montage (useEtatListe : une page resservie
 * par le retour arrière, ou un envoi pas encore arrivé) — la clé locale de
 * la boucle, le nombre de cartes, le joueur.
 */
export type EtatListe = { local: string; affiche: EtatAffiche | null; maj: number | null; total?: number; joueur: string };

export function etatListe(cle: string, ligne: LigneProgression | null | undefined, cartes: readonly string[] | number | undefined, joueur: string): EtatListe {
  return {
    local: cleLocale(cle),
    affiche: etatAffiche(ligne, cartes),
    maj: majLigne(ligne),
    total: cartes === undefined || typeof cartes === "number" ? cartes : cartes.length,
    joueur,
  };
}

/**
 * L'état de la boucle de l'appareil à montrer à la place de celui du serveur,
 * s'il est à ce joueur et l'emporte sur la version du compte (même règle que
 * la révision : appareilPrime) — null s'il n'y a rien à afficher (boucle
 * recommencée, pas encore arrivée sur le compte) ; undefined : garder celui
 * du serveur.
 */
export function etatLocalAffiche(local: EtatBoucle | null, e: EtatListe): EtatAffiche | null | undefined {
  const mien = boucleDuJoueur(local, e.joueur);
  if (!mien || horodatage(mien) === e.maj || !appareilPrime(mien, e.maj)) return undefined;
  return afficher(resumer(mien, e.total));
}

// ---------------------------------------------------------------------------
// L'état affiché en tête de page suit la révision en direct : la révision
// (FlashcardReview) annonce chaque changement de sa boucle sur window, la
// pastille de l'en-tête (EtatPaquetVivant) l'écoute.

export const EVENEMENT_BOUCLE = "rl:boucle-flashcards";
export type DetailBoucle = { cle: string; etat: EtatBoucle };

export function annoncerBoucle(cle: string, etat: EtatBoucle): void {
  try {
    window.dispatchEvent(new CustomEvent<DetailBoucle>(EVENEMENT_BOUCLE, { detail: { cle, etat } }));
  } catch {
    // pas de fenêtre : rien à annoncer
  }
}
