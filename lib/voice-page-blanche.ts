import { nombre } from "@/lib/voice";

// Les mots de la page blanche (app/page-blanche, components/page-blanche).

const pluriel = (n: number, mot: string) => (n > 1 ? `${mot}s` : mot);

export const PB = {
  matieresTitre: "Les matières, copie par copie",
  titre: "La page blanche",
  sous: "Tu récites sur ton papier, tu révèles, tu te notes. Ce que tu rates revient au tour suivant.",
  /** le lieu de la peinture, en légende de la rangée héros */
  lieu: "Le palais blanc",
  // la carte « ta suite » : une matière entamée d'abord, sinon la première pas commencée
  suiteReprendre: (matiere: string) => `Reprendre ${matiere}`,
  suiteCommencer: (matiere: string) => `Commencer par ${matiere}`,
  suiteAction: "Prendre ma copie",
  maitrisees: (a: number, b: number) => `${nombre(a)} / ${nombre(b)} maîtrisées`,
  copies: (n: number) => (n === 0 ? "Tout est maîtrisé" : `${nombre(n)} ${pluriel(n, "copie")} à rendre`),
  copie: (i: number, n: number) => `Copie ${i} sur ${n}`,
  tour: (n: number) => `Tour ${n}`,
  consigne: "Écris tout sur ta feuille, puis passe à la suite.",
  precedente: "Copie précédente",
  suivante: "Copie suivante",
  reveler: "Révéler les formules",
  corrige: "Le corrigé",
  corrigeSous: "Compare avec ta feuille et note chaque ligne.",
  notees: (a: number, b: number) => `${nombre(a)} / ${nombre(b)} notées`,
  maitrisee: "Maîtrisée",
  aRevoir: "À revoir",
  valider: "Valider le tour",
  enregistrement: "Enregistrement…",
  bilan: (ok: number, n: number) => `${nombre(ok)} sur ${nombre(n)} maîtrisées à ce tour`,
  suite: (n: number) => `Tour suivant : ${nombre(n)} à retravailler`,
  fini: "Tout est maîtrisé dans cette matière.",
  recommencer: "Tout recommencer",
  echec: "Tes notes n'ont pas pu être enregistrées. Réessaie.",
};
