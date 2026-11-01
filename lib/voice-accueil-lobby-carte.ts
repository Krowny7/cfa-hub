// Les textes de « La carte du jour » de l'accueil « Le lobby »
// (components/accueil/lobby/CarteDuJour*.tsx). Un fichier par lot : le lot
// d'assemblage peut le laisser ici ou le ranger sous une clé de
// lib/voice-accueil-lobby.ts, sans rien changer d'autre.
// Tutoiement, texte court et concret ; aucun formatage lié à la langue du
// navigateur (module neutre : il sert au serveur comme à l'îlot client).

/** Les trois sources possibles des cartes : le paquet entier, les marquées, les points faibles. */
export type SourceCarteVoix = "toutes" | "marquees" | "faibles";

/** Le libellé complet (puce radio) et le libellé court (sous le titre, dans la note) de chaque source. */
export const SOURCES_CARTE: Record<SourceCarteVoix, { libelle: string; court: string }> = {
  toutes: { libelle: "Toutes les flashcards", court: "toutes les flashcards" },
  marquees: { libelle: "Mes cartes marquées", court: "tes cartes marquées" },
  faibles: { libelle: "Mes points faibles", court: "tes points faibles" },
};

/** Le tutorat demandé à l'IA : le recto et le verso de la carte sont ajoutés derrière. */
export const CONSIGNE_IA =
  "Tu es mon tuteur pour le CFA niveau I. Explique-moi simplement cette carte, comme à un étudiant : l'intuition, un petit exemple chiffré, et le piège classique à l'examen.";

export const CARTE_JOUR = {
  titre: "La carte du jour",
  recto: { etiquette: "Question · en anglais", indice: "Clique la carte pour la retourner" },
  verso: { etiquette: "Réponse · en français", indice: "Reclique pour revoir la question" },
  /** annoncé aux lecteurs d'écran quand la carte se retourne */
  statut: { question: "Question affichée.", reponse: "Carte retournée : la réponse est affichée." },
  /** « Copier pour l'IA » : nom donné par l'utilisateur, on ne le change pas */
  copier: {
    libelle: "Copier pour l'IA",
    copie: "Copié",
    echec: "Copie impossible",
    apercu: "Le prompt copié",
    apercuCopie: "Copié : colle-le dans ton IA",
    apercuEchec: "Copie impossible : sélectionne ce texte",
  },
  reglages: {
    ouvrir: "Choisir mes cartes du jour",
    titre: "Choisir mes cartes du jour",
    fermer: "Fermer sans enregistrer",
    matieres: "Matières",
    sources: "Les cartes viennent de",
    enregistrer: "Enregistrer",
    enregistrement: "Enregistrement…",
    alerte: "Coche au moins une matière.",
    erreur: "Réglage impossible, réessaie dans un instant.",
    refus: "Ces réglages ne sont pas valides.",
    connexion: "Connecte-toi pour choisir tes cartes.",
    /** « 3 matières cochées · tes cartes marquées » */
    note: (n: number, source: string) => `${n} ${n > 1 ? "matières cochées" : "matière cochée"} · ${source}`,
  },
  sources: SOURCES_CARTE,
  /** la ligne sous le titre : « FSA · Fixed Income · tes cartes marquées », « 10 matières · toutes les flashcards » */
  resume: (matieres: readonly string[], source: SourceCarteVoix): string =>
    `${matieres.length <= 2 ? matieres.join(" · ") : `${matieres.length} matières`} · ${SOURCES_CARTE[source].court}`,
  /** quand la source choisie ne donne rien, la carte vient du paquet entier et la ligne le dit */
  replis: {
    marquees: "Aucune carte marquée dans ces matières : une carte au hasard.",
    faibles: "Pas de point faible avec des flashcards dans ces matières : une carte au hasard.",
    toutes: "Pas encore de flashcards dans ces matières : une carte au hasard.",
  },
  /** le prompt : la consigne, puis le recto et le verso en une seule ligne */
  prompt: (recto: string, verso: string): string => `${CONSIGNE_IA} Recto : ${recto} Verso : ${verso}`,
} as const;

/** Les étiquettes du verso structuré (même vocabulaire que la révision : lib/voice-z3c.ts). */
export const VERSO_CARTE = { retenir: "À retenir", enClair: "En clair", piege: "Piège" } as const;
