import { COURSES } from "@/lib/courses";
import { SUBJECTS, onePagerFile } from "@/components/reviser/catalog";
import { weightLabel } from "@/components/reviser/rail";
import type { ShelfItem } from "@/components/reviser/ShelfPage";

// Contenu des pages d'index /fiches et /courses, dans l'ordre officiel du
// programme. Module neutre (pas de "use client").

/** Phrase d'en-tête des deux index (une seule, courte). */
export const FICHE_DESC = "Une synthèse par thème, puis son quiz corrigé. Tes erreurs restent de côté jusqu'à ce que tu les réussisses.";
export const COURSE_DESC = "Le cours intégral par matière, à lire ou à écouter : environ une heure, découpée par module.";

const FICHE_INFO: Record<string, { meta: string; desc: string }> = {
  ethics: {
    meta: "5 synthèses · 12 pages",
    desc: "Éthique et confiance, Code et Standards I à VII, GIPS, cas d'application.",
  },
  "quantitative-methods": {
    meta: "6 synthèses · 14 pages",
    desc: "Rendements, valeur temps, statistiques, probabilités, inférence, tests, régression, big data.",
  },
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
    meta: "5 synthèses · 12 pages",
    desc: "Marchés et instruments, payoffs, arbitrage et cost of carry, forwards, futures, swaps, options, parité put-call, binomial.",
  },
  "portfolio-management": {
    meta: "6 synthèses · 13 pages",
    desc: "Risque et rendement, CAPM, construction, biais, gestion du risque.",
  },
  economics: {
    meta: "5 synthèses · 12 pages",
    desc: "Structures de marché, cycles, politiques budgétaire et monétaire, commerce, change.",
  },
  "corporate-issuers": {
    meta: "4 synthèses · 10 pages",
    desc: "Formes juridiques, gouvernance, BFR et liquidité, investissements, structure du capital, business models.",
  },
  "alternative-investments": {
    meta: "4 synthèses · 10 pages",
    desc: "Frais et structures, private capital, immobilier et infrastructures, ressources naturelles, hedge funds, actifs numériques.",
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

/** Un one-pager : la matière sur une page A4 (PDF du bucket privé « fiches », vignette dans public/one-pagers). */
export type OnePagerItem = {
  key: string;
  /** rang dans le programme, 1 à 10 */
  index: number;
  code: string;
  name: string;
  /** chemin du PDF dans le bucket « fiches » */
  file: string;
  /** vignette ~600 px de large (grille) */
  thumb: string;
  /** vignette ~144 px de large (accès depuis /fiches) */
  mini: string;
  /** « 17,5 % de l'examen », null si inconnu */
  weight: string | null;
};

/** Les one-pagers, dans l'ordre officiel du programme. */
export function onePagerItems(): OnePagerItem[] {
  return SUBJECTS.flatMap((s, i) =>
    s.onePager
      ? [
          {
            key: s.key,
            index: i + 1,
            code: s.code,
            name: s.name,
            file: onePagerFile(s.onePager),
            thumb: `/one-pagers/${s.onePager}.webp`,
            mini: `/one-pagers/${s.onePager}-mini.webp`,
            weight: weightLabel(s.key),
          },
        ]
      : [],
  );
}
