// Le Codex : la trame et les chaînes GÉNÉRIQUES (V3 §1.3), pour un programme
// qui n'a pas d'histoire propre (histoire, géographie, un programme d'essai).
// Cinq actes, du premier pas au chef-d'œuvre, écrits sur les mesures que
// tout programme a (réponses, branches, maîtrise) ; des chaînes au long
// cours qu'un programme retient par leur id. Les ids sont locaux ici ;
// genererArbre (lib/codex/programmes.ts) les préfixe du slug du programme.
// Module neutre et pur : il ne dépend que des types et des ids, jamais du
// catalogue de CFA I (lequel l'importe pour les phases).

import { de } from "@/lib/codex/elision";
import { slugDe } from "@/lib/codex/programmes/ids";
import type { ContenuMatiere } from "@/lib/codex/catalogue";
import type { DefinitionProgramme } from "@/lib/codex/programmes";
import type { Acte, Chaine, CosmetiqueCodex, FiltreMesure, Objectif, ObjectifMesure, Outil, Prerequis, Quete, TypeMesure } from "@/lib/codex/types";

/** Ce dont la trame générique a besoin d'un programme. */
type Def = Pick<DefinitionProgramme, "cle" | "court" | "matieres">;

const mesure = (m: TypeMesure, seuil: number, filtre?: FiltreMesure): ObjectifMesure => ({ k: "mesure", mesure: m, seuil, ...(filtre ? { filtre } : {}) });
/** n réponses dans les matières du programme (une réponse d'un autre programme ne compte pas). */
const reponses = (n: number, matieres: string[]): Objectif => ({ k: "compteur", evenement: "question_repondue", filtre: { matiere: matieres }, seuil: n });

/** L'id d'un acte générique : « essai/g2 » (sa ligne de progression : « acte:essai/g2 »). */
export const idActeGenerique = (def: Pick<DefinitionProgramme, "cle">, n: number) => `${slugDe(def.cle)}/g${n}`;

/** Le titre gagné au chef-d'œuvre d'un programme : « Maître de {court} ». */
export const titreMaitreProgramme = (def: Pick<DefinitionProgramme, "cle" | "court" | "nom">): CosmetiqueCodex => ({
  cle: `titre:maitre-programme:${slugDe(def.cle)}`,
  type: "titre",
  nom: `Maître ${de(def.court)}`,
  description: `A signé le chef-d'œuvre du programme ${def.nom}.`,
});

/** Les cinq actes de la trame générique (n = 0 à 4). */
export function actesGeneriques(def: Pick<DefinitionProgramme, "cle" | "court" | "nom">): Acte[] {
  const a = (n: number, titre: string, sousTitre: string, but: string, ouverture: string, cloture: string, xp: number, titre_?: string): Acte => ({
    id: idActeGenerique(def, n),
    numero: n,
    titre,
    sousTitre,
    but,
    ouverture: { texte: ouverture, pose: "base" },
    cloture: { texte: cloture, pose: "fier" },
    recompense: { xp, ...(titre_ ? { titre: titre_ } : {}) },
  });
  return [
    a(0, "Le seuil", "On pousse la porte de l'atelier.", "Répondre à tes premières questions.", "Entre, assieds-toi : dix questions, et on fait connaissance.", "Te voilà dans la place. On commence vraiment.", 50),
    a(1, "Les pigments", "Une goutte de chaque couleur.", "Faire un premier pas dans chaque matière.", "Chaque matière a sa couleur. Goûte-les toutes, une fois.", "Toute la palette est sortie. Maintenant, on peint.", 150),
    a(2, "Les carnets", "On note, on reprend, on retient.", "Voir la moitié des notions et tenir une matière à 60 %.", "Un carnet rempli à moitié vaut mieux qu'un carnet parfait à la première page.", "La moitié du chemin, et une matière qui tient debout.", 200),
    a(3, "L'ouvrage", "La fresque prend forme.", "Voir 80 % des notions et monter la plupart des matières à 60 %.", "On ne bouche plus les trous : on construit.", "L'ouvrage tient. Il reste à le signer.", 300),
    a(4, "Le chef-d'œuvre", "La signature au bas du tableau.", "Tenir tout le programme à 65 % au moins.", "Le chef-d'œuvre ne pardonne pas les coins oubliés. Toutes les matières, donc.", "Signé. Ce programme est à toi.", 400, titreMaitreProgramme(def).cle),
  ];
}

/**
 * Les quêtes de la trame générique, ids locaux « trame:g<n>:<cle> ». Les
 * notions « tenues » (A3b) et la préparation (A4b) n'existent pas encore : les
 * actes 2 à 4 s'écrivent en attendant sur les notions vues et la maîtrise du
 * programme, des mesures que tout programme a déjà.
 */
export function quetesTrameGenerique(def: Def & Pick<DefinitionProgramme, "nom">): Quete[] {
  const actes = actesGeneriques(def);
  const cles = def.matieres().map((m: ContenuMatiere) => m.key);
  const q = (n: number, cle: string, ordre: number, titre: string, consigne: string, objectif: Objectif, xp: number, duree?: number): Quete => ({
    id: `trame:g${n}:${cle}`,
    famille: "trame",
    programme: def.cle,
    acte: actes[n].id,
    ordre,
    titre,
    consigne,
    objectif,
    prerequis: n === 0 ? [] : [{ k: "acte", id: actes[n - 1].id } satisfies Prerequis],
    recompense: { xp },
    repetition: "unique",
    visibilite: "visible",
    ...(duree ? { duree } : {}),
  });
  return [
    q(0, "premiere", 1, "La première question", "Réponds à une question du programme.", reponses(1, cles), 10, 2),
    q(0, "dix", 2, "Dix questions", "Réponds à 10 questions du programme.", reponses(10, cles), 30, 10),
    q(1, "pigments", 11, "Toute la palette", "Fais le premier pas de chaque matière.", mesure("branches_etape_pct", 100, { etape: "entree" }), 80),
    q(2, "notions", 21, "La moitié des notions", "Vois la moitié des notions du programme (5 réponses au moins dans chacune).", mesure("notions_vues_pct", 50), 100),
    q(2, "matiere", 22, "Une matière qui tient", "Monte une matière à 60 % de maîtrise.", mesure("matieres_au_dessus", 1, { pct: 60 }), 100),
    q(3, "notions", 31, "Les notions, presque toutes", "Vois 80 % des notions du programme.", mesure("notions_vues_pct", 80), 150),
    q(3, "preparation", 32, "Bien préparé", "Atteins 60 % de maîtrise sur tout le programme.", mesure("maitrise_programme", 60), 150),
    q(3, "branches", 33, "Le pigment tient partout", "Passe le cap des 60 % dans la plupart des matières.", mesure("branches_etape_pct", 60, { etape: "maitrise60" }), 150),
    q(4, "preparation", 41, "Prêt", "Atteins 75 % de maîtrise sur tout le programme.", mesure("maitrise_programme", 75), 200),
    q(4, "matieres", 42, "Aucun coin oublié", "Monte chaque matière à 65 % de maîtrise.", mesure("matieres_au_dessus", cles.length, { pct: 65 }), 200),
  ];
}

// ── Les chaînes génériques ─────────────────────────────────────────────

type Palier = { titre: string; consigne: string; objectif: Objectif; xp: number };
export type ChaineGenerique = Chaine & { paliers: Palier[] };

/** Les chaînes qu'un programme peut retenir (DefinitionProgramme.chaines). « main-juste » arrive avec A3b. */
export const CHAINES_GENERIQUES: ChaineGenerique[] = [
  {
    id: "memoire",
    titre: "La mémoire longue",
    axe: "memoire",
    pourquoi: "Réussir une question revue une semaine plus tard : c'est ça, savoir.",
    paliers: [25, 100, 250, 500].map((n, i) => ({ titre: ["Le souvenir", "La mémoire tient", "La mémoire longue", "La mémoire d'éléphant"][i], consigne: `Réussis ${n} questions revues au moins 7 jours après la précédente.`, objectif: mesure("rappels_espaces", n, { n: 7 }), xp: [60, 120, 200, 300][i] })),
  },
  {
    id: "encre",
    titre: "L'encre fidèle",
    axe: "regularite",
    pourquoi: "Quatre jours par semaine pendant des mois valent mieux que sept jours d'affilée une seule fois.",
    paliers: [2, 4, 8, 16].map((n, i) => ({ titre: ["Deux semaines", "Un mois d'encre", "Deux mois d'encre", "Une saison d'encre"][i], consigne: `Tiens ${n} semaines à 4 jours d'encre ou plus.`, objectif: mesure("semaines_actives", n, { n: 4 }), xp: [60, 120, 200, 300][i] })),
  },
];

/** Les quêtes des chaînes retenues par un programme, ids locaux « longcours:<chaîne>:<palier> » ; ouvertes à la clôture de l'acte 0. */
export function quetesChainesGeneriques(def: Pick<DefinitionProgramme, "cle" | "chaines" | "outils">): Quete[] {
  const ouverture: Prerequis = { k: "acte", id: idActeGenerique(def, 0) };
  return CHAINES_GENERIQUES.filter((c) => def.chaines.includes(c.id) && (c.requiert ?? []).every((o: Outil) => def.outils.has(o))).flatMap((c) =>
    c.paliers.map((p, i): Quete => ({
      id: `longcours:${c.id}:${i + 1}`,
      famille: "longcours",
      programme: def.cle,
      chaine: c.id,
      palier: i + 1,
      ordre: i + 1,
      titre: p.titre,
      consigne: p.consigne,
      objectif: p.objectif,
      prerequis: i === 0 ? [ouverture] : [{ k: "quete", id: `longcours:${c.id}:${i}` }],
      recompense: { xp: p.xp },
      repetition: "unique",
      visibilite: "visible",
    })),
  );
}
