import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Grille de matières — même style que /fiches. Chaque matière a son propre
// deck (PDF "cours complet" + audio explicatif), stockés dans le bucket
// privé "courses". Seule FSA est disponible pour l'instant ; les autres
// apparaissent en "à venir", comme sur /fiches.
export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const topics = [
    {
      href: "/courses/financial-statement-analysis",
      label: "Financial Statement Analysis",
      readings: "Deck complet · 12 Learning Modules",
      desc: "Cours intégral par module, avec audio explicatif façon cours magistral (~1h).",
      color: "violet",
    },
  ] as const;

  const upcoming = ["Fixed Income", "Equity", "Derivatives", "Portfolio Management"];

  return (
    <div className="grid gap-6">
      <div className="pb-5 border-b border-white/[0.07]">
        <Link href="/library" className="text-xs text-white/50 hover:text-white/80">
          ← Bibliothèque
        </Link>
        <div className="kicker mb-2 mt-2">CFA Level I — Cours complets</div>
        <h1 className="font-display text-2xl font-medium tracking-tight mb-1">Cours complets</h1>
        <p className="text-sm text-white/50">
          Le cours intégral par matière, à lire ou à écouter — un vrai cours magistral, pas juste des fiches.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {topics.map((t) => (
          <Link key={t.href} href={t.href} className="card plate card-hover p-5 grid gap-3 group">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="kicker mb-1">{t.readings}</div>
                <div className="font-display text-lg font-medium tracking-tight">{t.label}</div>
              </div>
              <span className="text-white/20 group-hover:text-white/50 transition-colors text-lg mt-0.5">→</span>
            </div>
            <p className="text-[13px] text-white/50 leading-relaxed">{t.desc}</p>
          </Link>
        ))}
      </div>

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
    </div>
  );
}
