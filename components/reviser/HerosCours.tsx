"use client";

import { useEffect, useState } from "react";
import { lireEcoute, type EcouteCours } from "@/lib/course-ecoute";
import { ETAGERE, LECTURE_COURS } from "@/lib/voice-reviser-b";
import type { Course } from "@/lib/courses";

// L'état d'écoute d'UN cours, pour la porte de /courses/<slug> (direction « le lieu, puis l'objet ») :
// le chiffre-héros « 46 MIN RESTANTES » (ou « ÉCOUTÉ EN ENTIER ») et la ligne d'état (« Repris au
// module 3 sur 12 »). Lu sur l'appareil après le montage (lib/course-ecoute) ; invisible, sa place
// gardée, tant qu'il n'est pas lu : jamais un faux chiffre. `apercu` : une écoute d'exemple (essai).

function useEcouteCours(slug: string, apercu?: EcouteCours | null): EcouteCours | null {
  const [e, setE] = useState<EcouteCours | null>(apercu ?? null);
  useEffect(() => {
    if (apercu === undefined) setE(lireEcoute([slug]));
  }, [slug, apercu]);
  return e;
}

function etat(course: Course, e: EcouteCours) {
  const total = course.minutes * 60;
  const pos = Math.min(e.positions[course.slug] ?? 0, total);
  const fini = e.finis.includes(course.slug) && pos <= 5;
  const module = pos > 5 ? course.chapters.filter((c) => c.start <= pos).length || 1 : null;
  return { fini, module, restantes: fini ? 0 : (total - pos) / 60 };
}

const voile = (lu: boolean) => ({ fontStyle: "normal" as const, opacity: lu ? 1 : 0, transition: "opacity 0.25s ease" });

/** Le chiffre-héros : les minutes qu'il reste à écouter, ou « Écouté ». */
export function HerosCoursValeur({ course, apercu }: { course: Course; apercu?: EcouteCours | null }) {
  const e = useEcouteCours(course.slug, apercu);
  const x = etat(course, e ?? { dernier: null, positions: {}, finis: [] });
  // un <i> : la légende de la porte stylise ses span
  return <i style={voile(!!e)}>{x.fini ? LECTURE_COURS.herosFini : ETAGERE.heures(x.restantes)}</i>;
}

/** Sa légende : « restantes », ou « en entier ». */
export function HerosCoursLegende({ course, apercu }: { course: Course; apercu?: EcouteCours | null }) {
  const e = useEcouteCours(course.slug, apercu);
  const x = etat(course, e ?? { dernier: null, positions: {}, finis: [] });
  return <i style={voile(!!e)}>{x.fini ? LECTURE_COURS.herosLegendeFini : LECTURE_COURS.herosLegende}</i>;
}

/** La ligne d'état de la porte. */
export function LigneEcouteCours({ course, apercu }: { course: Course; apercu?: EcouteCours | null }) {
  const e = useEcouteCours(course.slug, apercu);
  const x = etat(course, e ?? { dernier: null, positions: {}, finis: [] });
  return <i style={voile(!!e)}>{LECTURE_COURS.ligneEtat(x.module, course.chapters.length, x.fini)}</i>;
}
