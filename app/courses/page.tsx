import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { COURSES, COURSE_TOPICS } from "@/lib/courses";

// Grille de matières — même style que /fiches. Chaque matière a son propre
// deck (PDF "cours complet" + audio explicatif), stockés dans le bucket
// privé "courses" et décrits dans lib/courses.ts ; celles qui n'y sont pas
// encore apparaissent en "à venir".
export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const ready = new Set(COURSES.map((c) => c.title));
  const topics = COURSE_TOPICS.flatMap((title) => {
    const c = COURSES.find((x) => x.title === title);
    return c
      ? [
          {
            href: `/courses/${c.slug}`,
            label: c.title,
            readings: `Deck complet · ${c.chapters.length} Learning Modules`,
            desc: `Cours intégral par module, avec audio explicatif façon cours magistral (~${c.minutes} min).`,
          },
        ]
      : [];
  });
  const upcoming = COURSE_TOPICS.filter((t) => !ready.has(t));

  return (
    <div className="grid gap-6">
      <div className="pb-5 border-b border-white/[0.07]">
        <Link
          href="/library"
          className="text-xs text-white/50 hover:text-white/80"
        >
          ← Bibliothèque
        </Link>
        <div className="kicker mb-2 mt-2">CFA Level I — Cours complets</div>
        <h1 className="font-display text-2xl font-medium tracking-tight mb-1">
          Cours complets
        </h1>
        <p className="text-sm text-white/50">
          Le cours intégral par matière, à lire ou à écouter — un vrai cours
          magistral, pas juste des fiches.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {topics.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="card plate card-hover p-5 grid gap-3 group"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="kicker mb-1">{t.readings}</div>
                <div className="font-display text-lg font-medium tracking-tight">
                  {t.label}
                </div>
              </div>
              <span className="text-white/20 group-hover:text-white/50 transition-colors text-lg mt-0.5">
                →
              </span>
            </div>
            <p className="text-[13px] text-white/50 leading-relaxed">
              {t.desc}
            </p>
          </Link>
        ))}
      </div>

      {upcoming.length > 0 && (
        <div className="card p-4">
          <div className="kicker mb-2">À venir</div>
          <div className="grid gap-2 text-[13px] text-muted">
            {upcoming.map((label) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                {label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
