// Les textes du choix par notion (components/notions/ChoixNotions.tsx), dans l'entraînement ciblé et les Salles.

const s = (n: number) => (n > 1 ? "s" : "");

export const NOTIONS_CHOIX = {
  parNotion: "Par notion",
  recherche: "Chercher une notion, un concept, un mot…",
  chargement: "Les notions arrivent…",
  erreur: "Les notions n'ont pas pu être lues. Réessaie dans un instant.",
  rien: "Aucune notion ne correspond à ta recherche.",
  prochesTitre: "Proches de ta recherche",
  prochesAide: "Ces mots reviennent dans leurs questions.",
  prochesCherche: "Recherche dans les questions…",
  aTravailler: "À travailler",
  aTravaillerTitre: "Tes notions à travailler",
  aTravaillerSalleTitre: "À travailler dans la salle",
  enCommunTitre: "À travailler ensemble",
  enCommunAide: "Celles où plusieurs joueurs présents coincent.",
  unSeulJoueur: "Pour un seul joueur",
  aTravaillerSalle: (n: number) => `À travailler · ${n} joueur${s(n)}`,
  aide: "Moins de 65 % de réussite sur tes 90 derniers jours.",
  aideSalle: "D'après les joueurs présents dans la salle.",
  questions: (n: number) => `${n} question${s(n)}`,
  concepts: (n: number) => `${n} concept${s(n)}`,
  voirConcepts: (nom: string) => `Voir les concepts de ${nom}`,
  resume: (notions: number, concepts: number) =>
    [notions > 0 ? `${notions} notion${s(notions)}` : null, concepts > 0 ? `${concepts} concept${s(concepts)}` : null].filter(Boolean).join(" et "),
  rienChoisi: "Coche les notions à travailler.",
  effacer: "Tout décocher",
  taille: "Nombre de questions",
  bouton: "Choisir par notions",
  retour: "Revenir aux matières",
  lecture: "Notions",
  dispo: (n: number) => `${n} question${s(n)} disponible${s(n)}`,
  peu: (voulu: number, n: number) => `Il n'y a que ${n} question${s(n)} sur ce choix, pas ${voulu}.`,
};

/** Se retester sur ses ratures, depuis une copie. */
export const RETEST = {
  titre: (n: number) => (n > 1 ? `${n} ratures : c'est compris, maintenant ?` : "Une rature : c'est compris, maintenant ?"),
  texte: "Des questions voisines, du même concept dès que possible, pour voir ce qui a changé.",
  bouton: "Me retester",
  epreuve: "Retest de tes ratures",
  pret: "Retest de tes ratures · session prête",
  regle: "Des questions voisines de tes ratures, du même concept dès que possible, et de préférence jamais vues.",
  annuler: "Revenir à l'entraînement",
  erreur: "Pas de question voisine disponible pour ces ratures.",
  bilanTitre: "Alors, c'est compris ?",
  bilanResume: (compris: number, total: number) => `${compris} concept${s(compris)} compris sur ${total}`,
  compris: "Compris",
  en_progres: "En progrès",
  fragile: "Encore fragile",
};
