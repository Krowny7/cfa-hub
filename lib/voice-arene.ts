// La voix de la mise en scène des parties : l'écran VS, la fin de partie et les
// réglages de Personnaliser. Le tutoiement, des phrases courtes.

const questions = (n: number) => `${n} ${n > 1 ? "questions" : "question"}`;

export const ARENE = {
  /** l'écran VS */
  vs: "VS",
  vsAria: (noms: string[]) => noms.join(" contre "),
  hudDuel: (n: number) => `Duel classé · ${questions(n)}`,
  hudSalle: (n: number) => `Salle · ${n} joueurs`,
  nbJoueurs: (n: number) => `${n} joueurs`,
  elo: (n: number) => `${n.toLocaleString("fr-FR")} ELO`,

  /** la fin de partie */
  finTitre: "Partie terminée",
  finSous: "Les copies sont rendues. Le score reste caché.",
  voirResultat: "Voir le résultat",
  kickerDuel: (n: number) => `Duel · ${questions(n)}`,
  kickerSalle: (n: number) => `Salle · ${questions(n)}`,
  kickerExamen: (n: number) => `Examen blanc · ${questions(n)}`,
  score: (bonnes: number, total: number) => `${bonnes} / ${total}`,
  scoreAdverse: (nom: string, bonnes: number, total: number) => `${nom} ${bonnes} / ${total}`,
  pct: (p: number) => `${p} %`,
  videoAria: (nom: string) => `La vidéo de victoire de ${nom}`,
  joueur: "Un joueur",

  /** Personnaliser */
  reglages: {
    titre: "Tes parties",
    banniere: "Ta bannière de VS",
    fond: "Fond",
    tonImage: "Ton image",
    trait: "Couleur du trait",
    fonds: { desert: "Désert", glace: "Mer de glace", colisee: "Colisée", forteresse: "Forteresse", vallee: "Vallée" },
    traits: { peinture: "Peinture", encre: "Encre", bronze: "Bronze", vermillon: "Vermillon" },
    video: "Ta vidéo de victoire",
    envoyer: "Envoyer un fichier",
    remplacer: "Remplacer",
    retirer: "Retirer",
    envoiEnCours: "Envoi…",
    compressionEnCours: (pct: number) => `Compression… ${pct} %`,
    aucune: "Sans vidéo, ta bannière et ton score s'affichent à ta place.",
    fichier: (duree: number | null, poids: string | null) => [duree !== null ? `${Math.round(duree)} s` : null, poids].filter(Boolean).join(" · "),
    limites: (secondes: number) => [`${secondes} s au plus`, "Compressée à l'envoi", "MP4, MOV ou WebM", "Recadrable en 16:9, carré ou 9:16"],
    format: "Format",
    formats: { paysage: "16:9", carre: "Carré", vertical: "9:16" },
    glisser: "Fais glisser la vidéo pour la recadrer.",
    zoom: "Zoom",
    recentrer: "Recentrer",
    apercu: "Aperçu de la fin",
    apercuKicker: "Aperçu · Duel · 30 questions",
    apercuScore: "27 / 30",
    apercuLigne: "ton adversaire 21 / 30",
    fermerApercu: "Fermer l'aperçu",
    enregistre: "Enregistré.",
    basePasPrete: "Ces réglages arrivent bientôt : la base n'est pas encore prête.",
    enregistrementRate: "Enregistrement impossible, réessaie dans un instant.",
    connecte: "Connecte-toi pour enregistrer.",
    envoiRate: "L'envoi n'a pas abouti. Réessaie dans un instant.",
    refusType: "Vidéo MP4, MOV ou WebM seulement.",
    refusLourde: (poids: string) => `Vidéo trop lourde : ${poids} au plus.`,
    refusLongue: (secondes: number) => `Vidéo trop longue : ${secondes} secondes au plus.`,
    refusQuota: "Trop de fichiers en attente : réessaie dans un instant.",
    refusImage: "Choisis une image JPEG, PNG ou WebP.",
  },
} as const;
