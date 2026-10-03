import { COURSES } from "@/lib/courses";
import { SUBJECTS } from "@/components/reviser/catalog";
import type { ShelfItem } from "@/components/reviser/ShelfPage";

// Contenu des pages d'index /fiches et /courses, dans l'ordre officiel du
// programme. Module neutre (pas de "use client").

/** Phrase d'en-tête des deux index (une seule, courte). */
export const FICHE_DESC = "Une synthèse par thème, puis son quiz corrigé. Tes erreurs restent de côté jusqu'à ce que tu les réussisses.";
export const COURSE_DESC = "Le cours intégral par matière, à lire ou à écouter : environ une heure, découpée par module.";

const FICHE_INFO: Record<string, { meta: string; desc: string }> = {
  "financial-statement-analysis": {
    meta: "11 synthèses · 24 pages",
    desc: "Bilan, flux de trésorerie, stocks, actifs long terme, impôts.",
  },
  equity: {
    meta: "8 synthèses · 18 pages",
    desc: "Marchés, indices, efficience, valorisation.",
  },
  "fixed-income": {
    meta: "8 synthèses · 18 pages",
    desc: "Un grand thème par page, suivi de son QCM corrigé.",
  },
  derivatives: {
    meta: "R66 – R75 · 10 lectures",
    desc: "Forwards, futures, swaps, options, parité put-call, binomial.",
  },
  "portfolio-management": {
    meta: "6 synthèses · 13 pages",
    desc: "Risque et rendement, CAPM, construction, biais, gestion du risque.",
  },
};

/** Contenu d'une fiche (nombre de synthèses et de pages, thèmes). */
export function ficheInfo(slug: string): { meta: string; desc: string } {
  return FICHE_INFO[slug] ?? { meta: "Fiche de révision", desc: "Synthèse et quiz corrigé." };
}

export function ficheShelf(): { items: ShelfItem[]; upcoming: string[] } {
  const items: ShelfItem[] = [];
  const upcoming: string[] = [];
  for (const s of SUBJECTS) {
    if (!s.fiche) {
      upcoming.push(s.name);
      continue;
    }
    const info = FICHE_INFO[s.fiche] ?? { meta: "Fiche de révision", desc: "Synthèse et quiz corrigé." };
    items.push({ href: `/fiches/${s.fiche}`, title: s.name, meta: info.meta, desc: info.desc });
  }
  return { items, upcoming };
}

export function courseShelf(): { items: ShelfItem[]; upcoming: string[] } {
  const items: ShelfItem[] = [];
  const upcoming: string[] = [];
  for (const s of SUBJECTS) {
    const c = s.course ? COURSES.find((x) => x.slug === s.course) : null;
    if (!c) {
      upcoming.push(s.name);
      continue;
    }
    // Les premiers modules donnent le contenu en un coup d'œil.
    const first = c.chapters.slice(0, 2).map((ch) => ch.title);
    items.push({
      href: `/courses/${c.slug}`,
      title: c.title,
      meta: `${c.chapters.length} modules · ${c.pages} pages · ${c.minutes} min d'audio`,
      desc: first.length ? `${first.join(", ")}${c.chapters.length > first.length ? "…" : ""}` : "Le deck intégral et son audio.",
    });
  }
  return { items, upcoming };
}
