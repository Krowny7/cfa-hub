import type { CalcLevel } from "@/lib/calc/types";
import type { LevelState } from "@/lib/calc/engine";
import { nombre } from "@/lib/voice";

// Les mots des écrans de calcul, dans la voix « Le Trait » (lib/voice.ts) :
// un niveau se « tient » (4 justes sur 5), une erreur est une « rature », et
// le bout qui manque est toujours nommé. Module neutre.

export const NIVEAU: Record<CalcLevel, { label: string; court: string; desc: string }> = {
  facile: { label: "Facile", court: "F", desc: "Une formule, une étape." },
  moyen: { label: "Moyen", court: "M", desc: "Deux ou trois étapes, une conversion." },
  difficile: { label: "Difficile", court: "D", desc: "Un enchaînement, une donnée piège." },
};

export const ETAT_NIVEAU: Record<LevelState, string> = { vierge: "à tracer", entame: "entamé", tenu: "tenu" };

export const CALC = {
  hubKicker: "S'entraîner · calcul pur",
  hubTitre: "Calculs",
  hubLigne: "Un énoncé bref, les données utiles, ton résultat. Cinq questions par round.",
  ouvertes: "Matières",
  bientot: "Bientôt",
  reprendre: "Reprendre",
  prochain: "Ton prochain calcul",
  lancer: "Lancer · 5 questions",
  essentiels: "Essentiels",
  essentielsSous: "à savoir sans hésiter",
  annexes: "Annexes",
  annexesSous: "moins fréquents, au programme",
  rappel: "Rappel",
  pieges: "Pièges",
  choisirNiveau: "Choisis ton niveau",
  juste: "Juste.",
  rature: "Rature.",
  taReponse: "Ta réponse",
  bonneReponse: "Bonne réponse",
  correction: "Correction",
  voirCorrection: "Voir la correction",
  valider: "Valider",
  suivante: "Question suivante",
  voirCopie: "Voir ma copie",
  refaire: "Refaire ce niveau",
  niveauSuivant: "Niveau suivant",
  calculSuivant: "Calcul suivant",
  retour: "Changer de calcul",
  arreter: "Arrêter le round",
  saisie: "Virgule ou point. Entrée pour valider.",
  pasUnNombre: "Écris un nombre : 8,5 ou 8.5.",
  envoiRate: "La correction n'est pas arrivée. Réessaie.",
  tirageRate: "Le round ne s'est pas tiré. Réessaie.",
  toutTenu: "Tout est tenu. Le trait continue au Difficile.",
  copieTitre: "La copie, question par question",
  aEntamer: "à entamer",
  surTitre: "Calculs",
  local: "Suivi gardé sur cet appareil pour l'instant.",
} as const;

/** « 5 questions », « 1 question » au niveau vide : « bientôt » */
export const nbQuestions = (n: number) => (n > 0 ? `${nombre(n)} ${n > 1 ? "questions" : "question"}` : "bientôt");

/** « 12 types · 8 essentiels » */
export const ligneTypes = (types: number, essentiels: number) =>
  `${nombre(types)} ${types > 1 ? "types" : "type"} · ${nombre(essentiels)} ${essentiels > 1 ? "essentiels" : "essentiel"}`;

/** « 7 niveaux tenus sur 54 » */
export const niveauxTenus = (n: number, total: number) => `${nombre(n)} ${n > 1 ? "niveaux tenus" : "niveau tenu"} sur ${nombre(total)}`;

/** La ligne sous la copie : le niveau tenu, ou ce qui manque pour le tenir (règle 2 : le bout qui manque est nommé). */
export function ligneNiveau(level: CalcLevel, justes: number, total: number): { tenu: boolean; texte: string } {
  const label = NIVEAU[level].label;
  if (total >= 5 && justes >= 4) return { tenu: true, texte: `${label} tenu` };
  const manque = Math.max(1, 4 - justes);
  return { tenu: false, texte: `encore ${manque} ${manque > 1 ? "justes" : "juste"} pour tenir ${label}` };
}
