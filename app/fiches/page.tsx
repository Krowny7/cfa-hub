import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function FichesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const topics = [
    {
      href: "/fiches/fixed-income",
      label: "Fixed Income",
      readings: "Vault Concept Sheet · 18 pages",
      desc: "8 pages de synthèse par thème, chacune suivie d'une page de QCM d'entraînement (corrigé inclus).",
      color: "blue",
    },
    {
      href: "/fiches/derivatives",
      label: "Derivatives",
      readings: "R66 – R75 · 10 lectures",
      desc: "Forwards, futures, swaps, options, parité put-call, modèle binomial.",
      color: "emerald",
    },
    {
      href: "/fiches/equity",
      label: "Equity",
      readings: "Vault Concept Sheet · 18 pages",
      desc: "8 pages de synthèse par thème (marchés, indices, efficience, valorisation...), chacune suivie d'une page de QCM d'entraînement (corrigé inclus).",
      color: "amber",
    },
  ] as const;

  return (
    <div className="grid gap-6">
      <div className="pb-5 border-b border-white/[0.07]">
        <div className="kicker mb-2">CFA Level I — Révision</div>
        <h1 className="font-display text-2xl font-medium tracking-tight mb-1">Fiches de Révision</h1>
        <p className="text-sm text-white/50">
          Concepts clés, formules, règles mnémotechniques et quiz flash interactifs.
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
            <p className="text-[13px] text-white/50 leading-relaxed">{t.desc}</p>
          </Link>
        ))}
      </div>

      <div className="card p-4">
        <div className="kicker mb-2">À venir</div>
        <div className="grid gap-2 text-[13px] text-muted">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
            Quantitative Methods (R1–R11)
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
            Economics (R12–R18)
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
            Corporate Issuers (R19–R38)
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
            Portfolio Management &amp; Ethics (R76–R96)
          </div>
        </div>
      </div>
    </div>
  );
}
