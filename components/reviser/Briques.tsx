import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Illustration } from "@/components/ui/Illustration";
import { MasteryLine, TwoColumnRows } from "@/components/reviser/SubjectRows";
import { pad2, weightLabel } from "@/components/reviser/rail";
import { SUBJECTS, type SubjectAvailability } from "@/components/reviser/catalog";
import { ficheInfo } from "@/components/reviser/shelves";
import { COURSES } from "@/lib/courses";
import { LIEUX, RV, type KindListe } from "@/lib/voice-reviser";

// Briques de mise en page de Réviser : outils de choix (la matière la plus
// fragile…), liste classée du héros, et celles du gabarit des listes
// (/fiches, /courses, /flashcards) : en-tête, carte horizontale du lieu,
// index du programme. Sans état ni requête : tout vient des props.

export const subjectIndex = (key: string) => SUBJECTS.findIndex((s) => s.key === key) + 1;
export const subjectCode = (key: string) => SUBJECTS.find((s) => s.key === key)?.code ?? "";
export const courseOf = (s: SubjectAvailability) => (s.course ? (COURSES.find((c) => c.slug === s.course) ?? null) : null);
export const totalMinutes = (subjects?: SubjectAvailability[]) =>
  COURSES.filter((c) => !subjects || subjects.some((s) => s.course === c.slug)).reduce((a, c) => a + c.minutes, 0);

/** « Matière 08 · DER · 7,5 % de l'examen » */
export const repere = (s: SubjectAvailability) => [`Matière ${pad2(subjectIndex(s.key))}`, subjectCode(s.key), weightLabel(s.key)].filter(Boolean).join(" · ");

/** Les matières mesurées les plus fragiles, parmi celles qui ont le format demandé. */
export function weakest(subjects: SubjectAvailability[], has: (s: SubjectAvailability) => boolean, n = 3) {
  return subjects
    .filter((s) => has(s) && s.pct !== null)
    .sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0))
    .slice(0, n);
}

/** Courte liste classée (rang, nom, mini-barre) : le « Ensuite, à revoir » du héros. */
export function ListeClassee({ title, rows }: { title: string; rows: { key: string; href: string; label: string; pct: number | null; note?: string }[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 md:gap-2">
      <p className="t-eyebrow px-2">{title}</p>
      <ol className="m-0 flex list-none flex-col p-0">
        {rows.map((r, i) => (
          <li key={r.key} className={i > 0 ? "border-t border-line" : ""}>
            <Link href={r.href} className={"rl-row group flex min-h-[48px] items-center gap-3 rounded-[12px] px-2.5 py-2.5 " + (i === 0 ? "bg-surface-2" : "")}>
              <span className={"w-4 shrink-0 font-mono text-[13px] font-semibold " + (i === 0 ? "text-pen" : "text-muted")}>{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold leading-tight">{r.label}</span>
                {r.note && <span className="t-micro mt-0.5 block truncate">{r.note}</span>}
              </span>
              <span className="w-12 shrink-0">
                <MasteryLine pct={r.pct} label={r.label} />
              </span>
              <span className="t-micro min-w-[4ch] shrink-0 whitespace-nowrap text-right font-mono font-semibold">{r.pct === null ? "–" : `${r.pct} %`}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

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

/** En-tête compact d'une liste : retour à Réviser, grand titre, une phrase. */
export function ListeEntete({ title, desc }: { title: string; desc: string }) {
  return (
    <header className="flex flex-col gap-3">
      <Link href="/reviser" className="t-small inline-flex w-fit items-center gap-1.5 font-semibold hover:text-white">
        <ArrowLeft size={14} aria-hidden /> {RV.retour}
      </Link>
      <h1 className="t-hero rl-in m-0">{title}</h1>
      <p className="t-body m-0 max-w-[560px] text-muted">{desc}</p>
    </header>
  );
}

/** La carte horizontale du lieu (« Les carnets », « Le pupitre », « Le casier ») : image à gauche (300×169 sur ordinateur, 112×84 sur téléphone), nom, une ligne, « n matières sur 10 ». */
export function LieuHorizontal({ kind, n }: { kind: KindListe; n: number }) {
  const l = LIEUX[kind];
  return (
    <figure className="card rl-in m-0 grid min-w-0 grid-cols-[112px_minmax(0,1fr)] items-center gap-4 overflow-hidden py-3 pr-5 pl-3 md:grid-cols-[300px_minmax(0,1fr)] md:gap-7 md:py-0 md:pr-7 md:pl-0">
      <div className="h-[84px] w-[112px] overflow-hidden rounded-[12px] md:h-[169px] md:w-[300px] md:rounded-none">
        <Illustration nom={l.illustration} position={l.position} />
      </div>
      <figcaption className="flex min-w-0 flex-col gap-1.5">
        <span className="font-brand text-[24px] leading-none md:text-[32px]">{l.nom}</span>
        <span className="t-small">{l.ligne}</span>
        <span className="t-micro font-semibold">{RV.surDix(n)}</span>
      </figcaption>
    </figure>
  );
}

/** Index du programme : les 10 matières numérotées ; celles sans contenu en filigrane, sans lien (repliées en une ligne au-delà de 4, en bas de l'index). */
export function IndexProgramme({ rows }: { rows: ShelfRow[] }) {
  const later = rows.filter((r) => !r.href);
  const fold = later.length > 4;
  const shown = fold ? rows.filter((r) => r.href) : rows;
  return (
    <div className="card px-3 py-2 md:px-4">
      <TwoColumnRows
        items={shown}
        keyOf={(it) => it.key}
        render={(it) => {
          const inner = (
            <>
              <span className={"w-7 shrink-0 font-mono text-[13px] font-semibold " + (it.href ? "" : "text-faint")}>{pad2(it.index)}</span>
              <span className="min-w-0 flex-1">
                <span className={"block truncate text-[16px] font-bold leading-tight tracking-[-0.01em] " + (it.href ? "" : "text-faint")}>{it.name}</span>
                <span className="t-micro mt-1 block truncate">{it.href ? it.meta : RV.aVenirUne}</span>
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
