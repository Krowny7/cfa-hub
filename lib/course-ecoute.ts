// La mémoire d'écoute des cours complets, sur l'appareil (localStorage) :
//   rl_course_pos:<slug>   la position (secondes) de chaque cours, écrite par
//                          le lecteur (components/CourseAudioPlayer) ; effacée
//                          en fin de cours (la prochaine écoute repart du début)
//   rl_course_last         le dernier cours écouté (son slug) : noté quand la
//                          lecture démarre, pas à la simple ouverture de la
//                          page (on l'ouvre aussi pour lire les diapositives)
//   rl_course_fini:<slug>  « 1 » : le cours a été écouté jusqu'au bout
// Lue par la carte « Cours complets » de Réviser après le montage, jamais par
// le serveur. Toutes les lectures et écritures sont dans des try/catch :
// stockage bloqué (navigation privée…), la page fait comme sans historique.
// Module neutre (pas de "use client").

export const POS_PREFIX = "rl_course_pos:";
export const CLE_DERNIER_COURS = "rl_course_last";
export const FINI_PREFIX = "rl_course_fini:";

/** Ce que l'appareil sait des écoutes : le dernier cours écouté, la position de chaque cours entamé, les cours finis. */
export type EcouteCours = { dernier: string | null; positions: Record<string, number>; finis: string[] };

export const SANS_ECOUTE: EcouteCours = { dernier: null, positions: {}, finis: [] };

/** Le dernier cours écouté sur cet appareil (appelé par le lecteur quand la lecture démarre). */
export function noterDernierCours(slug: string) {
  try {
    localStorage.setItem(CLE_DERNIER_COURS, slug);
  } catch {
    // stockage indisponible : la carte proposera le premier cours
  }
}

/** Un cours écouté jusqu'au bout (sa position vient d'être effacée). */
export function noterCoursFini(slug: string) {
  try {
    localStorage.setItem(FINI_PREFIX + slug, "1");
  } catch {
    // stockage indisponible
  }
}

/** Les écoutes gardées sur l'appareil, pour les cours donnés ; rien de lisible : SANS_ECOUTE. */
export function lireEcoute(slugs: readonly string[]): EcouteCours {
  try {
    const dernier = localStorage.getItem(CLE_DERNIER_COURS);
    const positions: Record<string, number> = {};
    const finis: string[] = [];
    for (const slug of slugs) {
      const p = Number(localStorage.getItem(POS_PREFIX + slug));
      if (Number.isFinite(p) && p > 5) positions[slug] = p;
      if (localStorage.getItem(FINI_PREFIX + slug) === "1") finis.push(slug);
    }
    return { dernier: dernier && slugs.includes(dernier) ? dernier : null, positions, finis };
  } catch {
    return SANS_ECOUTE;
  }
}
