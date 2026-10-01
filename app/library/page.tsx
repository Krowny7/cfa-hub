import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Bibliothèque n'est plus une liste de liens PDF gérée par les utilisateurs —
// c'est un point d'entrée vers les fonds de contenu Système : Fiches de
// révision, Flashcards, et Cours complets. Le contenu communautaire
// (documents, liens) est retiré ; la table `documents` et son historique
// restent en base, non supprimés, au cas où cette fonctionnalité reviendrait
// sous une autre forme.
export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const sections = [
    {
      href: "/fiches",
      code: "PLANCHE 01",
      label: "Fiches de révision",
      desc: "Synthèses par thème, formules clés, rappels de cours illustrés.",
    },
    {
      href: "/flashcards",
      code: "PLANCHE 02",
      label: "Flashcards",
      desc: "Répétition espacée sur le deck officiel, par module CFA.",
    },
    {
      href: "/courses",
      code: "PLANCHE 03",
      label: "Cours complets",
      desc: "Le cours intégral par matière, à lire ou à écouter en audio.",
    },
  ] as const;

  return (
    <div className="grid gap-6">
      <div className="pb-5 border-b border-white/[0.07]">
        <div className="kicker mb-2">Bibliothèque</div>
        <h1 className="font-display text-2xl font-medium tracking-tight mb-1">Bibliothèque</h1>
        <p className="text-sm text-white/50">Trois fonds de révision, un seul point d&apos;entrée.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="card plate card-hover p-8 grid gap-3 group">
            <div className="kicker">{s.code}</div>
            <div className="font-display text-xl font-medium">{s.label}</div>
            <p className="text-[13px] text-white/50 leading-relaxed">{s.desc}</p>
            <span className="text-white/30 group-hover:text-white/60 transition-colors text-sm mt-2">
              Consulter →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
