// Le Codex : deux programmes SYNTHÉTIQUES, pour les tests (V3 §1.7). Jamais
// visibles dans le site (public: false). PROGRAMME_ESSAI n'a ni date
// d'examen, ni séance ciblée, ni fiche, ni drill, ni cours : il montre ce que
// devient l'arbre d'un programme d'histoire. PROGRAMME_ESSAI_BIS reprend des
// noms de matière du CFA I (fsa, equity) : ses clés doivent rester distinctes.

import { cleMatiere } from "@/lib/codex/programmes/ids";
import type { ContenuMatiere } from "@/lib/codex/catalogue";
import type { DefinitionProgramme } from "@/lib/codex/programmes";
import type { Outil } from "@/lib/codex/types";

/** Une matière sans fiche, ni drill, ni cours, ni flashcards. */
const matiere = (programme: string, locale: string, nom: string, poids: number, notions: number): ContenuMatiere => ({
  key: cleMatiere(programme, locale),
  nom,
  court: nom,
  poids,
  fiche: null,
  drill: false,
  cours: null,
  flashcards: false,
  notions,
  outils: [],
});

const OUTILS_ESSAI: ReadonlySet<Outil> = new Set<Outil>(["cinq", "eclair", "revoir"]);

export const PROGRAMME_ESSAI: DefinitionProgramme = {
  cle: "histoire/essai",
  domaine: "histoire",
  nom: "Programme d'essai",
  court: "Essai",
  examen: null,
  matieres: () => [
    matiere("histoire/essai", "renaissance", "Renaissance", 50, 6),
    matiere("histoire/essai", "cartographie", "Cartographie", 30, 4),
    matiere("histoire/essai", "mecanique", "Mécanique", 20, 3),
  ],
  outils: OUTILS_ESSAI,
  trame: "generique",
  chaines: ["memoire", "encre", "main-juste"],
  seuils: { acteV: 2 },
  suivant: null,
  public: false,
};

export const PROGRAMME_ESSAI_BIS: DefinitionProgramme = {
  ...PROGRAMME_ESSAI,
  cle: "histoire/essai-bis",
  nom: "Programme d'essai bis",
  court: "Essai bis",
  matieres: () => [
    matiere("histoire/essai-bis", "fsa", "Financial Statement Analysis", 60, 5),
    matiere("histoire/essai-bis", "equity", "Equity Investments", 40, 4),
  ],
};
