import { COURSES } from "@/lib/courses";
import { SUBJECTS } from "@/components/reviser/catalog";
import type { ShelfItem } from "@/components/reviser/ShelfPage";

// Contenu des pages d'index /fiches et /courses, dans l'ordre officiel du
// programme. Module neutre (pas de "use client").

const FICHE_INFO: Record<string, { meta: string; desc: string }> = {
  "financial-statement-analysis": {
    meta: "Vault Concept Sheet · 24 pages",
    desc: "11 pages de synthèse par lecture (bilan, flux de trésorerie, stocks, actifs long terme, impôts…), chacune suivie de son quiz corrigé.",
  },
  equity: {
    meta: "Vault Concept Sheet · 18 pages",
    desc: "8 pages de synthèse par thème (marchés, indices, efficience, valorisation…), chacune suivie de son quiz corrigé.",
  },
  "fixed-income": {
    meta: "Vault Concept Sheet · 18 pages",
    desc: "8 pages de synthèse par thème, chacune suivie de son quiz d'entraînement corrigé.",
  },
  derivatives: {
    meta: "R66 – R75 · 10 lectures",
    desc: "Forwards, futures, swaps, options, parité put-call, modèle binomial.",
  },
  "portfolio-management": {
    meta: "Vault Concept Sheet · 13 pages",
    desc: "6 pages de synthèse (risque et rendement, CAPM, construction de portefeuille, biais comportementaux, gestion du risque), chacune suivie de son quiz corrigé.",
  },
};

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
    items.push({
      href: `/courses/${c.slug}`,
      title: c.title,
      meta: `${c.chapters.length} modules · ~${c.minutes} min d'audio`,
      desc: `Le deck intégral (${c.pages} pages), module par module, avec un audio façon cours magistral.`,
    });
  }
  return { items, upcoming };
}
