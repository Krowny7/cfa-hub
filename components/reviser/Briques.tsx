import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { MasteryLine, TwoColumnRows } from "@/components/reviser/SubjectRows";
import { pad2 } from "@/components/reviser/rail";
import { SUBJECTS, type SubjectAvailability } from "@/components/reviser/catalog";
import { ficheInfo } from "@/components/reviser/shelves";
import { AvanceFlashcards } from "@/components/reviser/AvanceFlashcards";
import type { AvancesProgramme } from "@/lib/flashcards/avancement";
import { COURSES } from "@/lib/courses";
import { RV, type KindListe } from "@/lib/voice-reviser";

// Briques de mise en page des listes de Réviser (/fiches, /courses,
// /flashcards) : les lignes du programme et leur index. L'en-tête et la
// rangée héros sont ceux des sous-pages (ListeReviser, Heros).
// Sans état ni requête : tout vient des props.

export const subjectIndex = (key: string) => SUBJECTS.findIndex((s) => s.key === key) + 1;
export const courseOf = (s: SubjectAvailability) => (s.course ? (COURSES.find((c) => c.slug === s.course) ?? null) : null);

// ——— Les listes ———

export type ShelfRow = { key: string; index: number; name: string; pct: number | null; href: string | null; meta: string };

/** Les 10 matières dans l'ordre du programme, avec ce que le format propose pour chacune. */
export function shelfRows(kind: KindListe, subjects: SubjectAvailability[]): ShelfRow[] {
  return subjects.map((s) => {
    const base = { key: s.key, index: subjectIndex(s.key), name: s.name, pct: s.pct };
    if (kind === "fiche") {
      return { ...base, href: s.fiche ? `/fiches/${s.fiche}` : null, meta: s.fiche ? ficheInfo(s.fiche).meta : "" };
    }
    if (kind === "cours") {
      const c = courseOf(s);
      return { ...base, href: c ? `/courses/${c.slug}` : null, meta: c ? `${c.chapters.length} modules · ${c.minutes} min` : "" };
    }
    return {
      ...base,
      href: s.flashcards ? `${s.flashcards}#paquets` : null,
      meta: s.flashcardSets ? `${s.flashcardSets} paquet${s.flashcardSets > 1 ? "s" : ""} · ${s.flashcardSets * 15} cartes` : "",
    };
  });
}

/**
 * Index du programme : les 10 matières numérotées ; celles sans contenu en filigrane, sans lien (repliées en une ligne au-delà de 4, en bas de l'index).
 * `avances` (flashcards, quand le compte est lisible) : sous le nom, les cartes déjà vues et une pastille par paquet remplacent « 4 paquets · 60 cartes ».
 */
export function IndexProgramme({ rows, avances }: { rows: ShelfRow[]; avances?: AvancesProgramme }) {
  const later = rows.filter((r) => !r.href);
  const fold = later.length > 4;
  const shown = fold ? rows.filter((r) => r.href) : rows;
  return (
    <div className="card px-3 py-2 md:px-4">
      <TwoColumnRows
        items={shown}
        keyOf={(it) => it.key}
        render={(it) => {
          const suivi = it.href ? avances?.matieres[it.key] : undefined;
          const inner = (
            <>
              <span className={"w-7 shrink-0 font-mono text-[13px] font-semibold " + (it.href ? "" : "text-faint")}>{pad2(it.index)}</span>
              <span className="min-w-0 flex-1">
                <span className={"block truncate text-[16px] font-bold leading-tight tracking-[-0.01em] " + (it.href ? "" : "text-faint")}>{it.name}</span>
                {suivi && avances ? (
                  <AvanceFlashcards suivi={suivi} joueur={avances.joueur} />
                ) : (
                  <span className="t-micro mt-1 block truncate">{it.href ? it.meta : RV.aVenirUne}</span>
                )}
              </span>
              {it.href && (
                <>
                  <span className="hidden w-14 shrink-0 sm:block">
                    <MasteryLine pct={it.pct} label={it.name} />
                  </span>
                  <span className="t-micro w-8 shrink-0 text-right font-mono font-semibold">{it.pct === null ? "–" : `${it.pct} %`}</span>
                  <ChevronRight size={16} aria-hidden className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </>
          );
          return it.href ? (
            <Link href={it.href} className="rl-row group -mx-1 flex min-h-[64px] items-center gap-3 rounded-[14px] px-3 py-3 sm:gap-4">
              {inner}
            </Link>
          ) : (
            <div className="-mx-1 flex min-h-[64px] items-center gap-3 px-3 py-3 sm:gap-4" aria-disabled>
              {inner}
            </div>
          );
        }}
      />
      {fold && (
        <details className="group border-t border-line px-3 py-3">
          <summary className="t-small cursor-pointer list-none font-semibold [&::-webkit-details-marker]:hidden">
            {RV.aVenir(later.length)} <span className="text-muted group-open:hidden">· {RV.voir}</span>
          </summary>
          <p className="t-micro m-0 mt-2">{later.map((r) => `${pad2(r.index)} ${r.name}`).join(" · ")}</p>
        </details>
      )}
    </div>
  );
}
