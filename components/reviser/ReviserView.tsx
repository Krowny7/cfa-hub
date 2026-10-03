import Link from "next/link";
import { ArrowRight, Check, Copy, FileText, Headphones, Library, Plus } from "lucide-react";
import { DomainSpace } from "@/components/reviser/DomainSpace";
import { CURRENT_DOMAIN } from "@/lib/domains";
import type { SubjectAvailability } from "@/components/reviser/catalog";

// Espace « Réviser » : onglets de domaines, programmes, les formats de
// révision (fiches, cours complets, flashcards, bibliothèque) et la grille
// des 10 matières avec la disponibilité réelle de chaque format. Sans
// requête : app/reviser charge les données, l'aperçu en fournit d'exemple.

const plural = (n: number, one: string, many = one + "s") => `${n} ${n > 1 ? many : one}`;

/** Programmes du domaine : le programme ouvert coché, les autres « bientôt ». */
export function ProgramChips() {
  return (
    <div className="flex flex-wrap items-center gap-2.5" aria-label="Programmes">
      {CURRENT_DOMAIN.programs.map((p) =>
        p.ready ? (
          <span key={p.key} className="inline-flex h-[30px] items-center gap-1.5 rounded-[10px] border border-line bg-surface px-[11px] text-[13px] font-semibold">
            <Check size={14} strokeWidth={2.4} /> {p.name}
          </span>
        ) : (
          <span key={p.key} className="inline-flex h-[30px] items-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-line-2 px-[11px] text-[13px] text-muted">
            <Plus size={14} /> {p.name} — bientôt
          </span>
        ),
      )}
    </div>
  );
}

/** Grande carte de format (fiches, cours…). `ink` : la carte sombre mise en avant. */
export function FormatCard({
  href,
  icon,
  title,
  desc,
  meta,
  ink = false,
  delay = 0,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  meta?: string | null;
  ink?: boolean;
  delay?: number;
}) {
  return (
    <Link
      href={href}
      className={(ink ? "card-ink" : "card") + " rl-lift rl-in flex flex-col gap-3.5 p-6"}
      style={{ animationDelay: `${delay}s` }}
    >
      <span className="flex items-center justify-between gap-3">
        <span className={"grid h-[46px] w-[46px] place-items-center rounded-[13px] " + (ink ? "bg-[rgba(255,255,255,.12)]" : "bg-surface-2")}>{icon}</span>
        {meta && <span className="text-[13px] font-semibold opacity-70">{meta}</span>}
      </span>
      <span className="text-[24px] font-extrabold tracking-[-0.025em]">{title}</span>
      <span className="text-[15px] leading-[1.5] opacity-75">{desc}</span>
      <span className="mt-auto inline-flex items-center gap-1.5 text-[14px] font-[650]">
        Ouvrir <ArrowRight size={15} />
      </span>
    </Link>
  );
}

const CHIP = "inline-flex h-[26px] items-center gap-1 rounded-lg px-2 text-[12px] font-semibold";

function FormatChip({ href, icon, label }: { href: string | null; icon: React.ReactNode; label: string }) {
  if (!href) {
    return (
      <span title={`${label} · à venir`} className={CHIP + " border border-dashed border-line-2 text-muted"}>
        {icon}
        {label}
      </span>
    );
  }
  return (
    <Link href={href} className={CHIP + " rl-press bg-white text-black"}>
      {icon}
      {label}
    </Link>
  );
}

export function SubjectGrid({ subjects }: { subjects: SubjectAvailability[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(220px,100%),1fr))] gap-3">
      {subjects.map((s, i) => (
        <article key={s.key} className="card rl-lift rl-in flex flex-col gap-3 rounded-2xl p-4" style={{ animationDelay: `${i * 0.03}s` }}>
          <div className="flex justify-between gap-2">
            <h3 className="text-[15px] font-bold leading-tight">{s.name}</h3>
            <span className="font-mono text-[12px] text-muted tabular-nums">{s.pct === null ? "—" : `${s.pct}%`}</span>
          </div>
          {s.pct === null ? (
            <span className="text-[12px] text-muted">pas commencé</span>
          ) : (
            <span className="ink-bar block h-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.pct} aria-label={`Maîtrise ${s.name}`}>
              <span className="rl-grow" style={{ width: `${s.pct}%`, animationDelay: `${0.4 + i * 0.04}s` }} />
            </span>
          )}
          <div className="mt-auto flex flex-wrap gap-1.5">
            <FormatChip href={s.fiche ? `/fiches/${s.fiche}` : null} icon={<FileText size={13} />} label="Fiche" />
            <FormatChip href={s.course ? `/courses/${s.course}` : null} icon={<Headphones size={13} />} label="Cours" />
            <FormatChip href={s.flashcards} icon={<Copy size={13} />} label="Cartes" />
          </div>
        </article>
      ))}
    </div>
  );
}

export function ReviserView({ subjects }: { subjects: SubjectAvailability[] }) {
  const fiches = subjects.filter((s) => s.fiche).length;
  const courses = subjects.filter((s) => s.course).length;
  const cards = subjects.filter((s) => s.flashcards).length;

  return (
    <div className="rl-wide flex flex-col gap-8 md:gap-10">
      <DomainSpace kicker="Réviser" title="Apprendre, à ton rythme">
        <div className="-mt-2 flex flex-col gap-8 md:-mt-4 md:gap-10">
          <ProgramChips />

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-[18px]">
            <FormatCard
              ink
              href="/fiches"
              icon={<FileText size={20} />}
              title="Fiches de révision"
              desc="Une page de synthèse par thème, puis son quiz : 5 concepts × 3 variantes."
              meta={fiches ? plural(fiches, "matière") : "bientôt"}
            />
            <FormatCard
              href="/courses"
              icon={<Headphones size={20} />}
              title="Cours complets"
              desc="Le deck intégral en PDF et son audio façon cours magistral, environ une heure."
              meta={courses ? plural(courses, "matière") : "bientôt"}
              delay={0.08}
            />
            <FormatCard
              href="/flashcards"
              icon={<Copy size={20} />}
              title="Flashcards"
              desc="Répétition espacée : termes anglais, formules, pièges."
              meta={cards ? plural(cards, "matière") : "bientôt"}
              delay={0.16}
            />
          </div>

          <Link href="/library" className="card rl-lift rl-in flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4" style={{ animationDelay: ".22s" }}>
            <span className="grid h-10 w-10 flex-none place-items-center rounded-[12px] bg-surface-2">
              <Library size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold">Bibliothèque</span>
              <span className="block text-[13.5px] text-muted">Tous les fonds de révision au même endroit : fiches, flashcards et cours.</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-[14px] font-[650]">
              Ouvrir <ArrowRight size={15} />
            </span>
          </Link>

          <section className="rl-rv flex flex-col gap-4" aria-label="Les 10 matières">
            <div className="flex flex-wrap items-baseline justify-between gap-2.5">
              <h2 className="m-0 text-[24px] font-bold leading-tight tracking-[-0.02em]">Les 10 matières du CFA Niveau I</h2>
              <span className="text-[13px] text-muted">en noir : disponible · en pointillé : à venir</span>
            </div>
            <SubjectGrid subjects={subjects} />
          </section>
        </div>
      </DomainSpace>
    </div>
  );
}
