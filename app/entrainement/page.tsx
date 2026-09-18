import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Point d'entrée unique pour les quatre façons de s'entraîner — chacune
// garde sa propre page et ses propres routes ([id], création de session,
// etc.), seule la navigation change : plus besoin de connaître la
// différence entre QCM / Mocks officiels / Entraînement ciblé / Examens
// blancs pour trouver où cliquer.
export default async function EntrainementPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const modules = [
    {
      href: "/qcm",
      code: "QCM—01",
      label: "QCM par thème",
      desc: "Toutes les banques de questions, classées par sujet du programme.",
    },
    {
      href: "/official-exams",
      code: "MOCK—02",
      label: "Mocks officiels",
      desc: "Sessions réelles du CFA rejouées, question par question.",
    },
    {
      href: "/practice",
      code: "PRAC—03",
      label: "Entraînement ciblé",
      desc: "Pondéré selon le poids réel de l'examen, pour cibler les lacunes.",
    },
    {
      href: "/mock-exams",
      code: "EXAM—04",
      label: "Examens blancs",
      desc: "Sessions programmées, chronométrées, classement partagé.",
    },
  ] as const;

  return (
    <div className="grid gap-6">
      <div className="pb-5 border-b border-white/[0.07]">
        <div className="kicker mb-2">Entraînement</div>
        <h1 className="font-display text-2xl font-medium tracking-tight mb-1">Entraînement</h1>
        <p className="text-sm text-white/50">
          QCM, mocks officiels, entraînement ciblé et examens blancs, au même endroit.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {modules.map((m) => (
          <Link key={m.href} href={m.href} className="card plate card-hover p-6 grid gap-2 group">
            <div className="flex items-center justify-between">
              <div className="kicker">{m.code}</div>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400/70" />
            </div>
            <div className="font-display text-lg font-medium">{m.label}</div>
            <p className="text-[13px] text-white/50 leading-relaxed">{m.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
