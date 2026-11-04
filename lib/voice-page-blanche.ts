import { nombre } from "@/lib/voice";

// Les mots de la page blanche (app/page-blanche, components/page-blanche).

const pluriel = (n: number, mot: string) => (n > 1 ? `${mot}s` : mot);

export const PB = {
  titre: "La page blanche",
  kicker: "Réviser",
  sous: "Tu récites sur ton papier, tu révèles, tu te notes. Ce que tu rates revient au tour suivant.",
  total: (n: number) => `${nombre(n)} formules et notions à savoir`,
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
  retour: "Toutes les matières",
  recommencer: "Tout recommencer",
  echec: "Tes notes n'ont pas pu être enregistrées. Réessaie.",
};
