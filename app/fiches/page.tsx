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
      readings: "R47 – R65 · 19 lectures",
      desc: "Instruments, valorisation, duration, convexité, crédit, titrisation, MBS/ABS.",
      color: "blue",
    },
    {
      href: "/fiches/derivatives",
      label: "Derivatives",
      readings: "R66 – R75 · 10 lectures",
      desc: "Forwards, futures, swaps, options, parité put-call, modèle binomial.",
      color: "emerald",
    },
  ] as const;

  return (
    <div className="grid gap-6">
      <div className="pb-5 border-b border-white/[0.07]">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-blue-300 mb-2">
          CFA Level I — Révision
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Fiches de Révision</h1>
        <p className="text-sm text-white/50">
          Concepts clés, formules, règles mnémotechniques et quiz flash interactifs.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {topics.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="card card-hover p-5 grid gap-3 group"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-1">
                  {t.readings}
                </div>
                <div className="text-lg font-semibold tracking-tight">
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
        <div className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-2">
          À venir
        </div>
        <div className="grid gap-2 text-[13px] text-white/40">
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
            Corporate Issuers &amp; Equity (R19–R46)
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
