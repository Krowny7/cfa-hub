// Voix « Le Trait » pour les QCM, les flashcards, la bibliothèque et le
// partage (zone Z3c). Complète lib/voice.ts (en lecture seule) avec les
// phrases qui manquent à ces écrans ; le coordinateur les fusionnera.
//
// Module neutre (ni « use client » ni serveur). Mêmes garde-fous que
// lib/voice.ts : toujours le chiffre, jamais « raté » ni « Bravo », pas de
// point d'exclamation, le bout qui reste toujours nommé ; les libellés
// fonctionnels (boutons de carte, réglages, filtres) restent simples.

import { CONNEXION, DEVISE, SIGNATURE, nombre, pluriel } from "@/lib/voice";

export const cartes = (n: number) => pluriel(n, "carte", "cartes");

// ---------------------------------------------------------------------------
// QCM (QuizSetView)

export const QCM = {
  /** sur-titre de la copie corrigée */
  epreuve: "QCM",
  /** avant de commencer : la signature */
  avant: SIGNATURE,
  consigne: "Corrigées une à une, sans chrono.",
  consigneXp: "Chaque première bonne réponse rapporte de l'XP.",
  /** QCM sans question (sur-titre, sans point) */
  vide: "Papier blanc",
  videLigne: "Aucune question pour l'instant.",
  videProprietaire: "Ajoute-en dans « Questions », juste en dessous.",
  /** retour immédiat d'une question corrigée */
  juste: "Juste.",
  rature: "Rature.",
  laBonne: "La bonne réponse",
  dejaReussie: "Déjà réussie : pas d'XP cette fois.",
  /** compteur pendant le QCM : « 2 justes » */
  justes: (n: number) => pluriel(n, "juste", "justes"),
  /** dernier bouton : la copie corrigée */
  voirCopie: "Voir ma copie",
  recommencer: "Recommencer le QCM",
  autres: "Autres QCM",
  copieImpossible: "Impossible de copier automatiquement. Sélectionne la correction et copie-la à la main.",
} as const;

/**
 * « Copier pour l'IA » d'un QCM, variante « mes ratures » : la phrase ajoutée
 * à l'en-tête (même format que l'export des sessions, numéros d'origine).
 */
export const IA_QCM_RATURES = "Je ne t'envoie que les questions où je me suis trompé. ";

// ---------------------------------------------------------------------------
// Flashcards (FlashcardReview, FinDePasse)

/** La fin d'une passe : les cartes ne sont pas des traits, on parle de cartes sues. */
export function finPasse(sues: number, total: number, aRevoir: number): { titre: string; ligne: string } {
  if (total === 0) return { titre: "Papier blanc.", ligne: "Aucune carte cette fois. Relance quand tu veux." };
  const su = sues > 1 ? "sues" : "sue";
  if (aRevoir === 0) return { titre: "Page propre.", ligne: `${cartes(sues)} ${su}. Elles reviendront, de plus en plus espacées.` };
  return {
    titre: `${cartes(aRevoir)} à reprendre.`,
    ligne: `${nombre(sues)} sur ${nombre(total)} ${su}. Les autres reviendront en premier.`,
  };
}

export const FLASHCARDS = {
  surTitre: "Passe terminée",
  /** sous le chiffre de la passe */
  maitrisees: (n: number) => (n > 1 ? "maîtrisées" : "maîtrisée"),
  /**
   * L'anneau du jour, à côté d'une passe de cartes (elles ne le font pas
   * avancer) : tenu, le sceau du correcteur ; sinon, le bout qui reste.
   */
  anneau: (jour: number, objectif: number) =>
    jour >= objectif
      ? "Journée tenue. Le dernier bout, c'est demain."
      : `Anneau du jour ${nombre(jour)}/${nombre(objectif)}. Les cartes ne le tracent pas : les questions, si.`,
  reprendre: (n: number) => `Reprendre les ${nombre(n)}`,
  recommencer: "Recommencer",
  autres: "Autres sets",
  /** set sans carte */
  vide: "Papier blanc.",
  videLigne: "Ce set n'a encore aucune carte.",
  /** repasse ciblée */
  repasse: (n: number) => `Repasse · ${cartes(n)} à reprendre`,
  toutes: "Revenir à toutes les cartes",
  repasseFinie: "Toutes les cartes de la repasse sont sues.",
  aRevoir: (n: number) => `${nombre(n)} à revoir`,
} as const;

// ---------------------------------------------------------------------------
// Partage public (lecture seule) et bibliothèque

export const PARTAGE = {
  /** pied des pages partagées : la devise, puis ce qu'on y fait */
  qcm: `${DEVISE} Des QCM corrigés un à un, des duels, un rang.`,
  cartes: `${DEVISE} Des cartes en répétition espacée, des duels, un rang.`,
  action: CONNEXION.carteTitre,
  videQcm: "Papier blanc : ce QCM n'a pas encore de question.",
  videCartes: "Papier blanc : ce set n'a pas encore de carte.",
} as const;
