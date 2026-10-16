// Le Codex : les programmes du CFA (V3 §1.3). CFA I est le programme
// historique : sa trame (les actes de la bottega), ses chaînes et ses
// contrats de la semaine gardent leurs ids publiés, sans préfixe. CFA II et
// CFA III sont déclarés pour la route de Milan (« Ouvrir CFA II »), pas encore
// publics : leurs matières sont vides tant que lib/domains.ts ne les dit pas prêts.
// Le catalogue (lib/codex/catalogue.ts) importe contenuDuProgramme d'ici, et ce
// fichier lit la trame du catalogue : les accès au catalogue se font donc à
// l'appel (accesseurs), jamais au chargement du module.

import { SUBJECTS } from "@/components/reviser/catalog";
import { TOPICS } from "@/lib/practiceTopics";
import { notionsDeMatiere } from "@/lib/notions";
import { ACTES, CHAINES, QUETES_CONTRATS_HEBDO, QUETES_LONG_COURS, QUETES_TRAME, type ContenuMatiere } from "@/lib/codex/catalogue";
import type { DefinitionProgramme } from "@/lib/codex/programmes";
import type { Outil } from "@/lib/codex/types";

/** Le contenu du programme CFA I, lu dans les catalogues du site (clés de matière nues). */
export function contenuDuProgramme(): ContenuMatiere[] {
  return SUBJECTS.map((s) => {
    const t = TOPICS.find((x) => x.key === s.key);
    const drill = !!s.fiche && !!s.drillPrefix;
    const flashcards = s.flashcardFolders.length > 0;
    const outils: Outil[] = [...(s.fiche ? (["fiche"] as const) : []), ...(drill ? (["drill"] as const) : []), ...(s.course ? (["cours"] as const) : []), ...(flashcards ? (["flashcards"] as const) : [])];
    return {
      key: s.key,
      nom: t?.label ?? s.name,
      court: s.short,
      poids: t?.weight ?? 0,
      fiche: s.fiche,
      drill,
      cours: s.course,
      flashcards,
      notions: notionsDeMatiere(s.key).length,
      outils,
    };
  });
}

/** Tout ce que le site sait faire pour le CFA I. */
const OUTILS_CFA: ReadonlySet<Outil> = new Set<Outil>(["ciblee", "fiche", "drill", "cours", "flashcards", "atelier", "calculs", "blancs", "trente", "cinq", "eclair", "duels", "revoir"]);

export const CFA_L1: DefinitionProgramme = {
  cle: "finance/cfa-l1",
  domaine: "finance",
  nom: "CFA Niveau I",
  court: "CFA I",
  examen: { date: "joueur" },
  matieres: contenuDuProgramme,
  outils: OUTILS_CFA,
  get trame() {
    return { actes: ACTES, quetes: QUETES_TRAME };
  },
  chaines: [],
  // ses chaînes au long cours (filtrées par leurs outils) et ses contrats de la semaine, ids historiques
  quetesPropres: () => {
    const sans = new Set(CHAINES.filter((c) => (c.requiert ?? []).some((o) => !OUTILS_CFA.has(o))).map((c) => c.id));
    return [...QUETES_LONG_COURS.filter((q) => !q.chaine || !sans.has(q.chaine)), ...QUETES_CONTRATS_HEBDO];
  },
  seuils: { acteV: 8 },
  suivant: "finance/cfa-l2",
  public: true,
};

/** Les niveaux suivants : déclarés, sans matières, invisibles tant que leur contenu n'existe pas. */
const niveau = (n: 2 | 3, suivant: string | null): DefinitionProgramme => ({
  cle: `finance/cfa-l${n}`,
  domaine: "finance",
  nom: `CFA Niveau ${n === 2 ? "II" : "III"}`,
  court: `CFA ${n === 2 ? "II" : "III"}`,
  examen: { date: "joueur" },
  matieres: () => [],
  outils: OUTILS_CFA,
  trame: "generique",
  chaines: ["memoire", "encre"],
  seuils: { acteV: 8 },
  suivant,
  public: false,
});

export const CFA_L2 = niveau(2, "finance/cfa-l3");
export const CFA_L3 = niveau(3, null);
